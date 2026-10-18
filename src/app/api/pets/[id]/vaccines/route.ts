import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";
import { getOrCreatePetCategory } from "@/lib/pets";
import { handleExpenseRegistrationXp, recomputeAchievements } from "@/lib/achievements";

// GET /api/pets/[id]/vaccines - List vaccines and vermifuges for a pet
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId } = await params;
    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const vaccines = await prisma.petVaccine.findMany({
      where: { petId, userId },
      include: {
        slip: {
          include: { category: true },
        },
      },
      orderBy: { applicationDate: "desc" },
    });

    return NextResponse.json(vaccines);
  } catch (error) {
    console.error("[GET /api/pets/[id]/vaccines]", error);
    return NextResponse.json({ error: "Erro ao buscar vacinas" }, { status: 500 });
  }
}

// POST /api/pets/[id]/vaccines - Create a vaccine or vermifuge entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId } = await params;
    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      type = "VACINA",
      applicationDate,
      boosterDate,
      boosterDone = false,
      notes,
      isExpense = false,
      amount,
      isCreditCardPayment = false,
    } = body;

    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: "O nome da vacina/vermífugo é obrigatório" }, { status: 400 });
    }

    if (!applicationDate) {
      return NextResponse.json({ error: "A data de aplicação é obrigatória" }, { status: 400 });
    }

    const appDate = new Date(applicationDate);
    const bDate = boosterDate ? new Date(boosterDate) : null;
    const parsedAmount = amount !== undefined && amount !== null && amount !== "" ? parseFloat(amount) : null;

    let createdSlipId: string | null = null;

    // If marked as expense and has valid positive amount, integrate with PaymentSlip
    if (isExpense && parsedAmount && parsedAmount > 0) {
      // 1. Get or create the "Pet" category
      const petCategory = await getOrCreatePetCategory(userId);

      // 2. Create the PaymentSlip in the user's financial registry
      const slip = await prisma.paymentSlip.create({
        data: {
          title: `[${pet.name}] ${sanitizedName}`,
          amount: parsedAmount,
          dueDate: appDate,
          status: "PAGO",
          isCreditCardPayment: false,
          isRecurring: false,
          categoryId: petCategory.id,
          userId,
        },
      });

      createdSlipId = slip.id;
    }

    const vaccine = await prisma.petVaccine.create({
      data: {
        name: sanitizedName,
        type: type === "VERMIFUGO" ? "VERMIFUGO" : type === "OUTRO" ? "OUTRO" : "VACINA",
        applicationDate: appDate,
        boosterDate: bDate,
        boosterDone: Boolean(boosterDone),
        notes: notes ? sanitizeInput(notes) : null,
        isExpense: Boolean(isExpense),
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : null,
        isCreditCardPayment: false,
        slipId: createdSlipId,
        petId,
        userId,
      },
      include: {
        slip: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json(vaccine, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pets/[id]/vaccines]", error);
    return NextResponse.json({ error: "Erro ao cadastrar vacina" }, { status: 500 });
  }
}
