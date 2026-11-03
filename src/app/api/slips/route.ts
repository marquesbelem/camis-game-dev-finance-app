import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { recomputeAchievements, handleExpenseRegistrationXp } from "@/lib/achievements";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";
import { SlipStatus } from "@prisma/client";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/slips?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-06"

    // Auto-generate recurring slips for this month if needed
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      // Get recurring slips for this user to auto-generate for the month if missing
      const allSlips = await prisma.paymentSlip.findMany({
        where: { userId, isRecurring: true },
        orderBy: { dueDate: "desc" },
        distinct: ['title', 'categoryId'],
      });

      const latestSlipsMap = new Map<string, typeof allSlips[0]>();
      for (const slip of allSlips) {
        const key = `${slip.title.trim().toLowerCase()}-${slip.categoryId}`;
        if (!latestSlipsMap.has(key)) {
          latestSlipsMap.set(key, slip);
        }
      }

      const recurringSlips = Array.from(latestSlipsMap.values()).filter(
        (slip) => slip.isRecurring
      );

      const skips = await prisma.recurringSkip.findMany({
        where: {
          userId,
          year,
          month: mon,
        },
      });
      const skippedKeys = new Set(skips.map((s) => `${s.title.trim().toLowerCase()}-${s.categoryId}`));

      // Use local timezone bounds effectively by filtering in JS if needed, but DB handles it mostly
      // We will expand the bounds slightly to catch any timezone-shifted dates on the 1st
      const start = new Date(year, mon - 1, 1);
      start.setUTCHours(0, 0, 0, 0); // UTC midnight of 1st
      
      let nextMon = mon;
      let nextYear = year;
      if (nextMon > 11) {
        nextMon = 0;
        nextYear++;
      }
      const end = new Date(nextYear, nextMon, 1);
      end.setUTCHours(23, 59, 59, 999); // Allow up to end of month in UTC

      const existingSlips = await prisma.paymentSlip.findMany({
        where: {
          userId,
          dueDate: { gte: start, lte: end },
        },
      });

      // Normalize titles carefully
      const existingKeys = new Set(existingSlips.map((s) => `${s.title.trim().toLowerCase()}-${s.categoryId}`));


      const slipsToCreate = [];
      for (const rs of recurringSlips) {
        const key = `${rs.title.trim().toLowerCase()}-${rs.categoryId}`;
        if (skippedKeys.has(key) || existingKeys.has(key)) {
          continue;
        }

        const day = rs.recurringDay ?? rs.dueDate.getUTCDate();
        const maxDay = new Date(year, mon, 0).getDate();
        const clampedDay = Math.min(day, maxDay);

        slipsToCreate.push({
          title: rs.title,
          amount: rs.amount,
          dueDate: new Date(year, mon - 1, clampedDay),
          status: "PENDENTE" as const,
          isCreditCardPayment: false,
          isRecurring: true,
          recurringDay: rs.recurringDay,
          categoryId: rs.categoryId,
          userId,
        });
      }

      if (slipsToCreate.length > 0) {
        await prisma.paymentSlip.createMany({
          data: slipsToCreate,
        });
      }
    }

    const whereClause: { userId: string; dueDate?: { gte: Date; lt: Date } } = { userId };
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      whereClause.dueDate = { gte: start, lt: end };
    }

    const slips = await prisma.paymentSlip.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { dueDate: "asc" },
    });



    // ── Merge virtual apartment events ─────────────────────────────────────
    const project = await prisma.apartmentProject.findUnique({
      where: { userId },
    });

    let virtualSlips: Array<{
      id: string;
      title: string;
      amount: number;
      dueDate: string;
      status: string;
      isCreditCardPayment: boolean;
      isRecurring: boolean;
      categoryId: string;
      category: {
        id: string;
        name: string;
        colorCode: string;
        iconRef: string;
      };
    }> = [];
    if (project) {
      const [year, mon] = month ? month.split("-").map(Number) : [null, null];
      const start = year && mon ? new Date(year, mon - 1, 1) : null;
      const end = year && mon ? new Date(year, mon, 1) : null;

      // 1. Apartment Expenses -> Slips
      const aptExpenses = await prisma.apartmentExpense.findMany({
        where: {
          projectId: project.id,
          ...(start && end ? { date: { gte: start, lt: end } } : {}),
        },
      });

      const mappedExpenses = aptExpenses.map((exp) => ({
        id: `apt-exp-${exp.id}`,
        title: `[Apê] ${exp.description}`,
        amount: exp.amount,
        dueDate: exp.date.toISOString(),
        status: exp.status,
        isCreditCardPayment: false,
        isRecurring: false,
        categoryId: "virtual-apartment-expense",
        category: {
          id: "virtual-apartment-expense",
          name: "Apartamento",
          colorCode: "var(--color-brand)",
          iconRef: "Home",
        },
      }));

      // 2. Apartment Installments -> Slips
      const aptInstallments = await prisma.apartmentInstallment.findMany({
        where: {
          projectId: project.id,
          ...(start && end ? { dueDate: { gte: start, lt: end } } : {}),
        },
      });

      const mappedInstallments = aptInstallments.map((inst) => ({
        id: `apt-inst-${inst.id}`,
        title: `[Apê] Parcela #${inst.installmentNumber}`,
        amount: inst.amount,
        dueDate: inst.dueDate.toISOString(),
        status: inst.status,
        isCreditCardPayment: false,
        isRecurring: false,
        categoryId: "virtual-apartment-installment",
        category: {
          id: "virtual-apartment-installment",
          name: "Financiamento",
          colorCode: "var(--color-info)",
          iconRef: "Landmark",
        },
      }));

      virtualSlips = [...mappedExpenses, ...mappedInstallments];
    }

    const mergedSlips = [...slips, ...virtualSlips];
    // Sort all merged slips by due date asc
    mergedSlips.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json(mergedSlips);
  } catch (error) {
    console.error("[GET /api/slips]", error);
    return NextResponse.json(
      { error: "Falha ao carregar despesas" },
      { status: 500 }
    );
  }
}

// POST /api/slips  (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:post:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições para criar despesa. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    const title = sanitizeInput(formData.get("title") as string);
    const amount = parseFloat(formData.get("amount") as string);
    const dueDate = new Date(formData.get("dueDate") as string);
    const status = formData.get("status") as SlipStatus; // SlipStatus enum
    const isCreditCardPayment = false;
    const isRecurring = formData.get("isRecurring") === "true";
    const isInstallment = formData.get("isInstallment") === "true";
    const installmentsCount = parseInt(formData.get("installmentsCount") as string || "1", 10);
    const categoryId = formData.get("categoryId") as string;
    const file = formData.get("document") as File | null;

    // Validation
    if (!title || isNaN(amount) || amount <= 0 || !categoryId || !status) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes ou inválidos" },
        { status: 400 }
      );
    }

    if (isInstallment && (isNaN(installmentsCount) || installmentsCount < 1)) {
      return NextResponse.json(
        { error: "Quantidade de parcelas inválida." },
        { status: 400 }
      );
    }

    // Monthly slips threshold validation (Max 150)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthlyCount = await prisma.paymentSlip.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    const totalToCreate = isInstallment ? installmentsCount : 1;
    if (monthlyCount + totalToCreate > 150) {
      return NextResponse.json(
        { error: `Você atingiu o limite de despesas. Não é possível criar mais ${totalToCreate} despesas este mês.` },
        { status: 429 }
      );
    }

    let documentPath: string | null = null;
    if (file && file.size > 0) {
      documentPath = await saveUploadedFile(file);
    }

    let resultSlip;

    if (isInstallment && installmentsCount > 1) {
      const installmentGroupId = randomUUID();
      for (let i = 1; i <= installmentsCount; i++) {
        const d = new Date(dueDate);
        const day = d.getDate();
        d.setMonth(d.getMonth() + (i - 1));
        if (d.getDate() !== day) {
          d.setDate(0); // Clamp to last day of month
        }

        const slip = await prisma.paymentSlip.create({
          data: {
            title,
            amount,
            dueDate: d,
            status: i === 1 ? status : "PENDENTE",
            isCreditCardPayment,
            isRecurring: false,
            isInstallment: true,
            installmentNumber: i,
            installmentTotal: installmentsCount,
            installmentGroupId,
            categoryId,
            documentPath: i === 1 ? documentPath : null,
            userId,
          },
          include: { category: true },
        });

        if (i === 1) {
          resultSlip = slip;
        }
      }
    } else {
      resultSlip = await prisma.paymentSlip.create({
        data: {
          title,
          amount,
          dueDate,
          status,
          isCreditCardPayment,
          isRecurring,
          recurringDay: isRecurring ? dueDate.getUTCDate() : null,
          isInstallment: false,
          categoryId,
          documentPath,
          userId,
        },
        include: { category: true },
      });
    }

    return NextResponse.json(resultSlip, { status: 201 });
  } catch (error) {
    console.error("[POST /api/slips]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar despesa" },
      { status: 500 }
    );
  }
}
