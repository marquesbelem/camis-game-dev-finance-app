import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// GET /api/stats
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`stats:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-07"

    let stats = await prisma.userStats.findUnique({
      where: { id: userId },
    });

    if (!stats) {
      // Auto-create if missing
      stats = await prisma.userStats.create({
        data: {
          id: userId,
          monthlyBudgetLimit: 50.0,
          totalCreditLimit: 1000.0,
          currentStreakDays: 0,
          level: 1,
          xp: 0,
          scheduledSalaryAmount: 3000.0,
          salaryPaymentDay: 5,
        },
      });
    }

    let monthlyBudget = null;
    if (month) {
      monthlyBudget = await prisma.monthlyBudget.findUnique({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
      });
    }

    // Salary validation logic (hybrid approach: projected from day 1, celebrated on payment day)
    let celebrateSalary = false;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const currentDay = now.getDate();

    const effectiveSalary = monthlyBudget ? monthlyBudget.scheduledSalaryAmount : stats.scheduledSalaryAmount;

    if (
      effectiveSalary > 0 &&
      currentDay >= stats.salaryPaymentDay &&
      stats.lastSalaryValidationMonth !== currentMonthStr
    ) {
      // Validate the salary and save to database
      stats = await prisma.userStats.update({
        where: { id: userId },
        data: { lastSalaryValidationMonth: currentMonthStr },
      });
      celebrateSalary = true;
    }

    return NextResponse.json({
      ...stats,
      monthlyBudgetLimit: monthlyBudget ? monthlyBudget.monthlyBudgetLimit : stats.monthlyBudgetLimit,
      scheduledSalaryAmount: monthlyBudget ? monthlyBudget.scheduledSalaryAmount : stats.scheduledSalaryAmount,
      leisureBudget: monthlyBudget ? monthlyBudget.leisureBudget : stats.leisureBudget,
      celebrateSalary,
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json(
      { error: "Falha ao carregar as estatísticas" },
      { status: 500 }
    );
  }
}

// PUT /api/stats
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`stats:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const body = await request.json();
    const {
      monthlyBudgetLimit,
      totalCreditLimit,
      currentStreakDays,
      scheduledSalaryAmount,
      salaryPaymentDay,
      leisureBudget,
    } = body;

    if (month && (monthlyBudgetLimit !== undefined || scheduledSalaryAmount !== undefined || leisureBudget !== undefined)) {
      const currentStats = await prisma.userStats.findUnique({ where: { id: userId } });
      const defaultLimit = currentStats?.monthlyBudgetLimit ?? 50.0;
      const defaultSalary = currentStats?.scheduledSalaryAmount ?? 3000.0;
      const defaultLeisure = currentStats?.leisureBudget ?? 0.0;

      await prisma.monthlyBudget.upsert({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
        update: {
          ...(monthlyBudgetLimit !== undefined && { monthlyBudgetLimit }),
          ...(scheduledSalaryAmount !== undefined && { scheduledSalaryAmount }),
          ...(leisureBudget !== undefined && { leisureBudget }),
        },
        create: {
          userId,
          month,
          monthlyBudgetLimit: monthlyBudgetLimit ?? defaultLimit,
          scheduledSalaryAmount: scheduledSalaryAmount ?? defaultSalary,
          leisureBudget: leisureBudget ?? defaultLeisure,
        },
      });
    }

    const updateStatsData: any = {};
    if (totalCreditLimit !== undefined) updateStatsData.totalCreditLimit = totalCreditLimit;
    if (currentStreakDays !== undefined) updateStatsData.currentStreakDays = currentStreakDays;
    if (salaryPaymentDay !== undefined) updateStatsData.salaryPaymentDay = salaryPaymentDay;

    if (!month) {
      if (monthlyBudgetLimit !== undefined) updateStatsData.monthlyBudgetLimit = monthlyBudgetLimit;
      if (scheduledSalaryAmount !== undefined) updateStatsData.scheduledSalaryAmount = scheduledSalaryAmount;
      if (leisureBudget !== undefined) updateStatsData.leisureBudget = leisureBudget;
    }

    const updated = await prisma.userStats.upsert({
      where: { id: userId },
      update: updateStatsData,
      create: {
        id: userId,
        monthlyBudgetLimit: monthlyBudgetLimit ?? 50.0,
        totalCreditLimit: totalCreditLimit ?? 1000,
        currentStreakDays: currentStreakDays ?? 0,
        scheduledSalaryAmount: scheduledSalaryAmount ?? 3000,
        salaryPaymentDay: salaryPaymentDay ?? 5,
        leisureBudget: leisureBudget ?? 0,
      },
    });

    if (month) {
      const monthlyBudget = await prisma.monthlyBudget.findUnique({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
      });
      if (monthlyBudget) {
        updated.monthlyBudgetLimit = monthlyBudget.monthlyBudgetLimit;
        updated.scheduledSalaryAmount = monthlyBudget.scheduledSalaryAmount;
        updated.leisureBudget = monthlyBudget.leisureBudget;
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT/PATCH /api/stats]", error);
    return NextResponse.json(
      { error: "Falha ao atualizar as estatísticas" },
      { status: 500 }
    );
  }
}

export { PUT as PATCH };
