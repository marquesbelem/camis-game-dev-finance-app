import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/auth/tutorial  — marks tutorial as completed for the authenticated user
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { tutorialCompleted: true },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar tutorial." }, { status: 500 });
  }
}

// DELETE /api/auth/tutorial — resets tutorial so user can redo it
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { tutorialCompleted: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao reiniciar tutorial." }, { status: 500 });
  }
}
