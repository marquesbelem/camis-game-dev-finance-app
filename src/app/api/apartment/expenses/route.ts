import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// POST /api/apartment/expenses - Create a new apartment expense
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:expenses:post:${userId}:${ip}`, { windowMs: 60000, max: 40 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const project = await prisma.apartmentProject.findUnique({
      where: { userId },
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto de apartamento não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { description, amount, status = "PENDENTE", type = "OBRA", date, stageId } = body;

    const sanitizedDesc = sanitizeInput(description);
    if (!sanitizedDesc) {
      return NextResponse.json({ error: "Descrição da despesa é obrigatória" }, { status: 400 });
    }

    if (amount === undefined || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: "Valor da despesa inválido" }, { status: 400 });
    }

    // Verify stage ownership if stageId is provided
    if (stageId) {
      const stage = await prisma.apartmentStage.findUnique({
        where: { id: stageId },
      });
      if (!stage || stage.projectId !== project.id) {
        return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
      }
    }

    const expense = await prisma.apartmentExpense.create({
      data: {
        description: sanitizedDesc,
        amount: parseFloat(amount),
        status,
        type,
        date: date ? new Date(date) : new Date(),
        projectId: project.id,
        stageId: stageId || null,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("[POST /api/apartment/expenses]", error);
    return NextResponse.json({ error: "Falha ao registrar despesa" }, { status: 500 });
  }
}
