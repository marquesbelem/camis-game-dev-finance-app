import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// POST /api/auth/push-tokens
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`push-tokens:post:${userId}:${ip}`, { windowMs: 60000, max: 20 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token é obrigatório" }, { status: 400 });
    }

    // Upsert the device token linked to this user
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId },
      create: { token, userId },
    });

    return NextResponse.json(deviceToken, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/push-tokens]", error);
    return NextResponse.json({ error: "Falha ao registrar token" }, { status: 500 });
  }
}

// DELETE /api/auth/push-tokens
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token é obrigatório" }, { status: 400 });
    }

    // Delete the device token if it exists
    await prisma.deviceToken.deleteMany({
      where: { token, userId },
    });

    return NextResponse.json({ message: "Token removido com sucesso" });
  } catch (error) {
    console.error("[DELETE /api/auth/push-tokens]", error);
    return NextResponse.json({ error: "Falha ao remover token" }, { status: 500 });
  }
}
