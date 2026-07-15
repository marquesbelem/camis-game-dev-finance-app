import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// GET /api/slips/recurring -> List active recurring transactions
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:recurring:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Get all slips to determine active recurrences based on the latest slip of each sequence
    const allSlips = await prisma.paymentSlip.findMany({
      where: { userId },
      include: { category: true },
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

    // Sort by title alphabetically
    recurringSlips.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json(recurringSlips);
  } catch (error) {
    console.error("[GET /api/slips/recurring]", error);
    return NextResponse.json(
      { error: "Falha ao buscar despesas recorrentes" },
      { status: 500 }
    );
  }
}

// PUT /api/slips/recurring -> Edit a recurring transaction configuration starting next month
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:recurring:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "ID da despesa de referência é obrigatório" }, { status: 400 });
    }

    // 1. Fetch existing reference slip
    const existing = await prisma.paymentSlip.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
    }

    // 2. Read new inputs
    const newTitle = body.title !== undefined ? sanitizeInput(body.title) : existing.title;
    const newAmount = body.amount !== undefined ? parseFloat(body.amount) : existing.amount;
    const newCategoryId = body.categoryId !== undefined ? body.categoryId : existing.categoryId;
    const newIsCreditCardPayment = body.isCreditCardPayment !== undefined ? !!body.isCreditCardPayment : existing.isCreditCardPayment;
    const newRecurringDay = body.recurringDay !== undefined ? parseInt(body.recurringDay, 10) : (existing.recurringDay ?? existing.dueDate.getDate());

    if (!newTitle || isNaN(newAmount) || newAmount <= 0 || !newCategoryId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // 3. Compute target dates for next month
    const now = new Date();
    const nextMonthYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextMonth = (now.getMonth() + 1) % 12; // 0-11

    const nextMonthStart = new Date(nextMonthYear, nextMonth, 1);
    const nextMonthEnd = new Date(nextMonthYear, nextMonth + 1, 1);

    const maxDayInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const clampedDay = Math.min(newRecurringDay, maxDayInNextMonth);
    const targetDueDate = new Date(nextMonthYear, nextMonth, clampedDay);

    const keyChanged = newTitle !== existing.title || newCategoryId !== existing.categoryId;

    if (keyChanged) {
      // Key changed: stop old recurrence, start new one in next month
      // Stop old recurrence:
      // Past/present slips: set isRecurring = false
      await prisma.paymentSlip.updateMany({
        where: {
          userId,
          title: existing.title,
          categoryId: existing.categoryId,
          dueDate: { lt: nextMonthStart },
        },
        data: {
          isRecurring: false,
        },
      });

      // Future slips of old key: delete if PENDENTE, set isRecurring = false if PAGO
      await prisma.paymentSlip.deleteMany({
        where: {
          userId,
          title: existing.title,
          categoryId: existing.categoryId,
          dueDate: { gte: nextMonthStart },
          status: "PENDENTE",
        },
      });

      await prisma.paymentSlip.updateMany({
        where: {
          userId,
          title: existing.title,
          categoryId: existing.categoryId,
          dueDate: { gte: nextMonthStart },
          status: "PAGO",
        },
        data: {
          isRecurring: false,
        },
      });

      // Create new sequence starting next month
      const newSlip = await prisma.paymentSlip.create({
        data: {
          title: newTitle,
          amount: newAmount,
          dueDate: targetDueDate,
          status: "PENDENTE",
          isCreditCardPayment: newIsCreditCardPayment,
          isRecurring: true,
          recurringDay: newRecurringDay,
          categoryId: newCategoryId,
          userId,
        },
        include: { category: true },
      });

      return NextResponse.json({ success: true, message: "Recorrência atualizada com novos valores a partir do próximo mês.", slip: newSlip });
    } else {
      // Key didn't change: update existing slips in next month or create a new one if not exists
      // Update any future slips (next month and onwards) to match the new values
      await prisma.paymentSlip.updateMany({
        where: {
          userId,
          title: existing.title,
          categoryId: existing.categoryId,
          dueDate: { gte: nextMonthStart },
        },
        data: {
          amount: newAmount,
          isCreditCardPayment: newIsCreditCardPayment,
          recurringDay: newRecurringDay,
          isRecurring: true,
        },
      });

      // Check if one actually exists in next month specifically
      const nextMonthSlip = await prisma.paymentSlip.findFirst({
        where: {
          userId,
          title: existing.title,
          categoryId: existing.categoryId,
          dueDate: { gte: nextMonthStart, lt: nextMonthEnd },
        },
      });

      if (nextMonthSlip) {
        // Just adjust its due date if the day changed
        const slipDate = new Date(nextMonthSlip.dueDate);
        if (slipDate.getDate() !== clampedDay) {
          const updatedDate = new Date(slipDate.getFullYear(), slipDate.getMonth(), clampedDay);
          await prisma.paymentSlip.update({
            where: { id: nextMonthSlip.id },
            data: { dueDate: updatedDate },
          });
        }
      } else {
        // Doesn't exist in next month yet, create it
        await prisma.paymentSlip.create({
          data: {
            title: newTitle,
            amount: newAmount,
            dueDate: targetDueDate,
            status: "PENDENTE",
            isCreditCardPayment: newIsCreditCardPayment,
            isRecurring: true,
            recurringDay: newRecurringDay,
            categoryId: newCategoryId,
            userId,
          },
        });
      }

      return NextResponse.json({ success: true, message: "Recorrência atualizada a partir do próximo mês." });
    }
  } catch (error) {
    console.error("[PUT /api/slips/recurring]", error);
    return NextResponse.json(
      { error: "Falha ao editar despesa recorrente" },
      { status: 500 }
    );
  }
}

// DELETE /api/slips/recurring -> Delete a recurring transaction starting next month
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:recurring:delete:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID da despesa de referência é obrigatório" }, { status: 400 });
    }

    // 1. Fetch existing reference slip
    const existing = await prisma.paymentSlip.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
    }

    // 2. Compute target date (start of next month)
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 3. Stop recurrence:
    // Past/present slips: set isRecurring = false
    await prisma.paymentSlip.updateMany({
      where: {
        userId,
        title: existing.title,
        categoryId: existing.categoryId,
        dueDate: { lt: nextMonthStart },
      },
      data: {
        isRecurring: false,
      },
    });

    // Future slips: delete pending, set isRecurring = false on paid
    await prisma.paymentSlip.deleteMany({
      where: {
        userId,
        title: existing.title,
        categoryId: existing.categoryId,
        dueDate: { gte: nextMonthStart },
        status: "PENDENTE",
      },
    });

    await prisma.paymentSlip.updateMany({
      where: {
        userId,
        title: existing.title,
        categoryId: existing.categoryId,
        dueDate: { gte: nextMonthStart },
        status: "PAGO",
      },
      data: {
        isRecurring: false,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/slips/recurring]", error);
    return NextResponse.json(
      { error: "Falha ao excluir despesa recorrente" },
      { status: 500 }
    );
  }
}
