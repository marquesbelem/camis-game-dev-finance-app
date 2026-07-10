import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";
import { recomputeAchievements, handleExpenseRegistrationXp } from "@/lib/achievements";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

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
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);

      // Get the latest slip for each unique title + categoryId combination to determine recurrence status
      const allSlips = await prisma.paymentSlip.findMany({
        where: { userId },
        orderBy: { dueDate: "desc" },
      });

      const latestSlipsMap = new Map<string, typeof allSlips[0]>();
      for (const slip of allSlips) {
        const key = `${slip.title}-${slip.categoryId}`;
        if (!latestSlipsMap.has(key)) {
          latestSlipsMap.set(key, slip);
        }
      }

      const recurringSlips = Array.from(latestSlipsMap.values()).filter(
        (slip) => slip.isRecurring
      );

      for (const rs of recurringSlips) {
        // Check if the user has skipped this recurring slip for this month
        const db = prisma as any;
        const isSkipped = await db.recurringSkip.findFirst({
          where: {
            title: rs.title,
            categoryId: rs.categoryId,
            userId,
            year,
            month: mon,
          },
        });

        if (isSkipped) {
          continue; // Do not auto-recreate this month!
        }

        // Check if a slip with same title+category already exists in this month
        const exists = await prisma.paymentSlip.findFirst({
          where: {
            userId,
            title: rs.title,
            categoryId: rs.categoryId,
            dueDate: { gte: start, lt: end },
          },
        });

        if (!exists) {
          const day = rs.recurringDay ?? rs.dueDate.getDate();
          // Clamp day to max days in target month
          const maxDay = new Date(year, mon, 0).getDate();
          const clampedDay = Math.min(day, maxDay);

          await prisma.paymentSlip.create({
            data: {
              title: rs.title,
              amount: rs.amount,
              dueDate: new Date(year, mon - 1, clampedDay),
              status: "PENDENTE",
              isCreditCardPayment: rs.isCreditCardPayment,
              isRecurring: true,
              recurringDay: rs.recurringDay,
              categoryId: rs.categoryId,
              userId,
            },
          });
        }
      }
    }

    let whereClause: any = { userId };
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

    let virtualSlips: any[] = [];
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

    if (monthlyCount >= 150) {
      return NextResponse.json(
        { error: "Você atingiu o limite máximo de 150 despesas para este mês." },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    const title = sanitizeInput(formData.get("title") as string);
    const amount = parseFloat(formData.get("amount") as string);
    const dueDate = new Date(formData.get("dueDate") as string);
    const status = formData.get("status") as any; // SlipStatus enum
    const isCreditCardPayment =
      formData.get("isCreditCardPayment") === "true";
    const isRecurring = formData.get("isRecurring") === "true";
    const categoryId = formData.get("categoryId") as string;
    const file = formData.get("document") as File | null;

    // Validation
    if (!title || isNaN(amount) || amount <= 0 || !categoryId || !status) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes ou inválidos" },
        { status: 400 }
      );
    }

    let documentPath: string | null = null;
    if (file && file.size > 0) {
      documentPath = await saveUploadedFile(file);
    }

    const slip = await prisma.paymentSlip.create({
      data: {
        title,
        amount,
        dueDate,
        status,
        isCreditCardPayment,
        isRecurring,
        recurringDay: isRecurring ? dueDate.getDate() : null,
        categoryId,
        documentPath,
        userId,
      },
      include: { category: true },
    });

    // Award XP for daily registration consistency
    const xpDetails = await handleExpenseRegistrationXp(userId).catch((err) => {
      console.error("XP Error:", err);
      return null;
    });

    // Recompute achievements asynchronously after mutation
    recomputeAchievements(userId).catch(console.error);

    return NextResponse.json({
      ...slip,
      xpDetails,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/slips]", error);
    return NextResponse.json(
      { error: "Falha ao criar despesa" },
      { status: 500 }
    );
  }
}
