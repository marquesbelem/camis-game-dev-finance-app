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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    const regDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const regMonthStr = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`;
    const isBeforeRegistration = Boolean(month && month < regMonthStr);

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
        },
      });
    }

    let monthlyBudget = null;
    if (month && !isBeforeRegistration) {
      monthlyBudget = await prisma.monthlyBudget.findUnique({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
      });
    }

    return NextResponse.json({
      ...stats,
      monthlyBudgetLimit: monthlyBudget ? monthlyBudget.monthlyBudgetLimit : stats.monthlyBudgetLimit,
      scheduledSalaryAmount: isBeforeRegistration ? 0 : (monthlyBudget ? monthlyBudget.scheduledSalaryAmount : stats.scheduledSalaryAmount),
      leisureBudget: isBeforeRegistration ? 0 : (monthlyBudget ? monthlyBudget.leisureBudget : stats.leisureBudget),
      totalCreditLimit: monthlyBudget ? monthlyBudget.totalCreditLimit : stats.totalCreditLimit,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    const regDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const regMonthStr = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`;
    const isBeforeRegistration = Boolean(month && month < regMonthStr);

    const body = await request.json();
    const {
      monthlyBudgetLimit,
      totalCreditLimit,
      currentStreakDays,
      scheduledSalaryAmount,
      leisureBudget,
    } = body;

    if (month && !isBeforeRegistration && (monthlyBudgetLimit !== undefined || scheduledSalaryAmount !== undefined || leisureBudget !== undefined || totalCreditLimit !== undefined)) {
      const currentStats = await prisma.userStats.findUnique({ where: { id: userId } });
      const defaultLimit = currentStats?.monthlyBudgetLimit ?? 50.0;
      const defaultSalary = currentStats?.scheduledSalaryAmount ?? 3000.0;
      const defaultLeisure = currentStats?.leisureBudget ?? 0.0;
      const defaultCredit = currentStats?.totalCreditLimit ?? 1000.0;

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
          ...(totalCreditLimit !== undefined && { totalCreditLimit }),
        },
        create: {
          userId,
          month,
          monthlyBudgetLimit: monthlyBudgetLimit ?? defaultLimit,
          scheduledSalaryAmount: scheduledSalaryAmount ?? defaultSalary,
          leisureBudget: leisureBudget ?? defaultLeisure,
          totalCreditLimit: totalCreditLimit ?? defaultCredit,
        },
      });
    }

    const updateStatsData: any = {};
    if (currentStreakDays !== undefined) updateStatsData.currentStreakDays = currentStreakDays;
    if (!isBeforeRegistration) {
      if (monthlyBudgetLimit !== undefined) updateStatsData.monthlyBudgetLimit = monthlyBudgetLimit;
      if (scheduledSalaryAmount !== undefined) updateStatsData.scheduledSalaryAmount = scheduledSalaryAmount;
      if (leisureBudget !== undefined) updateStatsData.leisureBudget = leisureBudget;
      if (totalCreditLimit !== undefined) updateStatsData.totalCreditLimit = totalCreditLimit;
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
        updated.totalCreditLimit = monthlyBudget.totalCreditLimit;
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
