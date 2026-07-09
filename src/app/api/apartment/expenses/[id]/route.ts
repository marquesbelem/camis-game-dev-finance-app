import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// PUT /api/apartment/expenses/[id] - Update expense details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:expenses:put:${userId}:${ip}`, { windowMs: 60000, max: 40 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Verify ownership
    const expense = await prisma.apartmentExpense.findUnique({
      where: { id: expenseId },
      include: { project: true },
    });

    if (!expense || expense.project.userId !== userId) {
      return NextResponse.json({ error: "Despesa não encontrada ou não autorizada" }, { status: 404 });
    }

    const body = await request.json();
    const { description, amount, status, type, date, stageId } = body;

    const data: {
      description?: string;
      amount?: number;
      status?: string;
      type?: string;
      date?: Date;
      stageId?: string | null;
    } = {};
    if (description !== undefined) {
      const sanitized = sanitizeInput(description);
      if (!sanitized) {
        return NextResponse.json({ error: "Descrição não pode ser vazia" }, { status: 400 });
      }
      data.description = sanitized;
    }
    if (amount !== undefined) {
      data.amount = parseFloat(amount);
    }
    if (status !== undefined) {
      if (!["PENDENTE", "PAGO"].includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      data.status = status;
    }
    if (type !== undefined) {
      data.type = type;
    }
    if (date !== undefined) {
      data.date = new Date(date);
    }
    if (stageId !== undefined) {
      if (stageId === null) {
        data.stageId = null;
      } else {
        // Verify stage belongs to user project
        const stage = await prisma.apartmentStage.findUnique({
          where: { id: stageId },
        });
        if (!stage || stage.projectId !== expense.projectId) {
          return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
        }
        data.stageId = stageId;
      }
    }

    const updated = await prisma.apartmentExpense.update({
      where: { id: expenseId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/apartment/expenses/[id]]", error);
    return NextResponse.json({ error: "Falha ao atualizar despesa" }, { status: 500 });
  }
}

// DELETE /api/apartment/expenses/[id] - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:expenses:delete:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Verify ownership
    const expense = await prisma.apartmentExpense.findUnique({
      where: { id: expenseId },
      include: { project: true },
    });

    if (!expense || expense.project.userId !== userId) {
      return NextResponse.json({ error: "Despesa não encontrada ou não autorizada" }, { status: 404 });
    }

    await prisma.apartmentExpense.delete({
      where: { id: expenseId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/apartment/expenses/[id]]", error);
    return NextResponse.json({ error: "Falha ao excluir despesa" }, { status: 500 });
  }
}
