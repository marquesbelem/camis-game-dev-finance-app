import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// POST /api/apartment/installments - Create a manual financing installment
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:installments:post:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
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
    const { installmentNumber, dueDate, amount, status = "PENDENTE" } = body;

    if (installmentNumber === undefined || isNaN(parseInt(installmentNumber))) {
      return NextResponse.json({ error: "Número da parcela inválido" }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ error: "Data de vencimento é obrigatória" }, { status: 400 });
    }

    if (amount === undefined || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: "Valor da parcela inválido" }, { status: 400 });
    }

    const installment = await prisma.apartmentInstallment.create({
      data: {
        installmentNumber: parseInt(installmentNumber),
        dueDate: new Date(dueDate),
        amount: parseFloat(amount),
        status,
        projectId: project.id,
      },
    });

    return NextResponse.json(installment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/apartment/installments]", error);
    return NextResponse.json({ error: "Falha ao criar parcela manual" }, { status: 500 });
  }
}
