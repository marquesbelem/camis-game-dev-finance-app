import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// PUT /api/apartment/installments/[id] - Update manual installment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: installmentId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:installments:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const installment = await prisma.apartmentInstallment.findUnique({
      where: { id: installmentId },
      include: { project: true },
    });

    if (!installment || installment.project.userId !== userId) {
      return NextResponse.json({ error: "Parcela não encontrada ou não autorizada" }, { status: 404 });
    }

    const body = await request.json();
    const { installmentNumber, dueDate, amount, status } = body;

    const data: {
      installmentNumber?: number;
      dueDate?: Date;
      amount?: number;
      status?: string;
    } = {};

    if (installmentNumber !== undefined) {
      data.installmentNumber = parseInt(installmentNumber);
    }
    if (dueDate !== undefined) {
      data.dueDate = new Date(dueDate);
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

    const updated = await prisma.apartmentInstallment.update({
      where: { id: installmentId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/apartment/installments/[id]]", error);
    return NextResponse.json({ error: "Falha ao atualizar parcela" }, { status: 500 });
  }
}

// DELETE /api/apartment/installments/[id] - Delete manual installment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: installmentId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:installments:delete:${userId}:${ip}`, { windowMs: 60000, max: 20 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const installment = await prisma.apartmentInstallment.findUnique({
      where: { id: installmentId },
      include: { project: true },
    });

    if (!installment || installment.project.userId !== userId) {
      return NextResponse.json({ error: "Parcela não encontrada ou não autorizada" }, { status: 404 });
    }

    await prisma.apartmentInstallment.delete({
      where: { id: installmentId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/apartment/installments/[id]]", error);
    return NextResponse.json({ error: "Falha ao excluir parcela" }, { status: 500 });
  }
}
