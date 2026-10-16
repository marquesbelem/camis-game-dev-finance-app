import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// GET /api/apartment - Get project details
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const project = await prisma.apartmentProject.findUnique({
      where: { userId },
      include: {
        stages: {
          include: {
            expenses: {
              include: { options: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        expenses: {
          include: { options: true },
          orderBy: { date: "desc" },
        },
        installments: {
          orderBy: { installmentNumber: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ hasProject: false });
    }

    const generalSlips = await prisma.paymentSlip.findMany({
      where: {
        userId,
        category: {
          name: { equals: "Apartamento", mode: "insensitive" },
        },
      },
      include: { category: true },
      orderBy: { dueDate: "desc" },
    });

    return NextResponse.json({ hasProject: true, ...project, generalSlips });
  } catch (error) {
    console.error("[GET /api/apartment]", error);
    return NextResponse.json({ error: "Falha ao carregar dados do apartamento" }, { status: 500 });
  }
}

// POST /api/apartment - Create project
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:post:${userId}:${ip}`, { windowMs: 60000, max: 20 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      propertyValue = 0,
      downPayment = 0,
      financedAmount = 0,
      interestRate = 0,
      loanTermMonths = 0,
      amortizationType = "SAC",
      installmentsPaid = 0,
      installmentsTotal = 0,
      obraBudget = 0,
    } = body;

    const existing = await prisma.apartmentProject.findUnique({
      where: { userId },
    });

    if (existing) {
      return NextResponse.json({ error: "Projeto já existe para este usuário" }, { status: 400 });
    }

    const project = await prisma.apartmentProject.create({
      data: {
        userId,
        propertyValue: parseFloat(propertyValue),
        downPayment: parseFloat(downPayment),
        financedAmount: parseFloat(financedAmount),
        interestRate: parseFloat(interestRate),
        loanTermMonths: parseInt(loanTermMonths),
        amortizationType,
        installmentsPaid: parseInt(installmentsPaid),
        installmentsTotal: parseInt(installmentsTotal),
        obraBudget: parseFloat(obraBudget),
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[POST /api/apartment]", error);
    return NextResponse.json({ error: "Falha ao inicializar projeto" }, { status: 500 });
  }
}

// PUT /api/apartment - Update project
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`apartment:put:${userId}:${ip}`, { windowMs: 60000, max: 20 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      propertyValue,
      downPayment,
      financedAmount,
      interestRate,
      loanTermMonths,
      amortizationType,
      installmentsPaid,
      installmentsTotal,
      obraBudget,
    } = body;

    const updated = await prisma.apartmentProject.update({
      where: { userId },
      data: {
        propertyValue: propertyValue !== undefined ? parseFloat(propertyValue) : undefined,
        downPayment: downPayment !== undefined ? parseFloat(downPayment) : undefined,
        financedAmount: financedAmount !== undefined ? parseFloat(financedAmount) : undefined,
        interestRate: interestRate !== undefined ? parseFloat(interestRate) : undefined,
        loanTermMonths: loanTermMonths !== undefined ? parseInt(loanTermMonths) : undefined,
        amortizationType: amortizationType !== undefined ? amortizationType : undefined,
        installmentsPaid: installmentsPaid !== undefined ? parseInt(installmentsPaid) : undefined,
        installmentsTotal: installmentsTotal !== undefined ? parseInt(installmentsTotal) : undefined,
        obraBudget: obraBudget !== undefined ? parseFloat(obraBudget) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/apartment]", error);
    return NextResponse.json({ error: "Falha ao atualizar projeto" }, { status: 500 });
  }
}
