import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// POST /api/apartment/stages - Create a new stage
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:stages:post:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
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
    const { name, budget = 0 } = body;

    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: "Nome da etapa é obrigatório" }, { status: 400 });
    }

    const stage = await prisma.apartmentStage.create({
      data: {
        name: sanitizedName,
        budget: parseFloat(budget),
        projectId: project.id,
        status: "PENDENTE",
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("[POST /api/apartment/stages]", error);
    return NextResponse.json({ error: "Falha ao criar etapa" }, { status: 500 });
  }
}
