import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// DELETE /api/extra-income/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`extra-income:id:delete:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { id } = await params;

    const { count } = await prisma.extraIncome.deleteMany({
      where: { id, userId },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Receita extra não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: "Receita extra removida com sucesso" });
  } catch (error) {
    console.error("[DELETE /api/extra-income/:id]", error);
    return NextResponse.json(
      { error: "Falha ao remover receita extra" },
      { status: 500 }
    );
  }
}
