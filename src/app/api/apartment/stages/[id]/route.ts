import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// PUT /api/apartment/stages/[id] - Update stage details or status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: stageId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:stages:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Verify stage ownership
    const stage = await prisma.apartmentStage.findUnique({
      where: { id: stageId },
      include: { project: true },
    });

    if (!stage || stage.project.userId !== userId) {
      return NextResponse.json({ error: "Etapa não encontrada ou não autorizada" }, { status: 404 });
    }

    const body = await request.json();
    const { name, budget, status } = body;

    const data: {
      name?: string;
      budget?: number;
      status?: string;
    } = {};
    if (name !== undefined) {
      const sanitized = sanitizeInput(name);
      if (!sanitized) {
        return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
      }
      data.name = sanitized;
    }
    if (budget !== undefined) {
      data.budget = parseFloat(budget);
    }
    if (status !== undefined) {
      if (!["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO"].includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      }
      data.status = status;
    }

    const updated = await prisma.apartmentStage.update({
      where: { id: stageId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/apartment/stages/[id]]", error);
    return NextResponse.json({ error: "Falha ao atualizar etapa" }, { status: 500 });
  }
}

// DELETE /api/apartment/stages/[id] - Delete stage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: stageId } = await params;

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:stages:delete:${userId}:${ip}`, { windowMs: 60000, max: 20 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Verify stage ownership
    const stage = await prisma.apartmentStage.findUnique({
      where: { id: stageId },
      include: { project: true },
    });

    if (!stage || stage.project.userId !== userId) {
      return NextResponse.json({ error: "Etapa não encontrada ou não autorizada" }, { status: 404 });
    }

    await prisma.apartmentStage.delete({
      where: { id: stageId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/apartment/stages/[id]]", error);
    return NextResponse.json({ error: "Falha ao excluir etapa" }, { status: 500 });
  }
}
