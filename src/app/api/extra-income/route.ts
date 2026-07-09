import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// GET /api/extra-income?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`extra-income:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const incomes = await prisma.extraIncome.findMany({
      where: {
        userId,
        ...(month ? { month } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(incomes);
  } catch (error) {
    console.error("[GET /api/extra-income]", error);
    return NextResponse.json(
      { error: "Falha ao carregar rendas extras" },
      { status: 500 }
    );
  }
}

// POST /api/extra-income
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`extra-income:post:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { amount, description, month } = body;

    const sanitizedDescription = sanitizeInput(description);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valor deve ser maior que zero" },
        { status: 400 }
      );
    }
    if (!sanitizedDescription) {
      return NextResponse.json(
        { error: "Descrição é obrigatória" },
        { status: 400 }
      );
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Mês inválido (formato esperado: YYYY-MM)" },
        { status: 400 }
      );
    }

    const income = await prisma.extraIncome.create({
      data: {
        amount: parseFloat(amount),
        description: sanitizedDescription,
        month,
        userId,
      },
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    console.error("[POST /api/extra-income]", error);
    return NextResponse.json(
      { error: "Falha ao registrar renda extra" },
      { status: 500 }
    );
  }
}
