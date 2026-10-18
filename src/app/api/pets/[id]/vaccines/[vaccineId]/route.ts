import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";
import { getOrCreatePetCategory } from "@/lib/pets";
import { handleExpenseRegistrationXp, recomputeAchievements } from "@/lib/achievements";

// PUT /api/pets/[id]/vaccines/[vaccineId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vaccineId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId, vaccineId } = await params;
    const pet = await prisma.pet.findFirst({
      where: { id: petId, userId },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const existingVaccine = await prisma.petVaccine.findFirst({
      where: { id: vaccineId, petId, userId },
    });

    if (!existingVaccine) {
      return NextResponse.json({ error: "Vacina não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      type,
      applicationDate,
      boosterDate,
      boosterDone,
      notes,
      isExpense,
      amount,
      isCreditCardPayment,
    } = body;

    const sanitizedName = name ? sanitizeInput(name) : existingVaccine.name;
    const appDate = applicationDate ? new Date(applicationDate) : existingVaccine.applicationDate;
    const bDate = boosterDate !== undefined ? (boosterDate ? new Date(boosterDate) : null) : existingVaccine.boosterDate;
    const isBoosterDone = boosterDone !== undefined ? Boolean(boosterDone) : existingVaccine.boosterDone;
    const parsedAmount = amount !== undefined && amount !== null && amount !== "" ? parseFloat(amount) : null;
    const shouldBeExpense = isExpense !== undefined ? Boolean(isExpense) : existingVaccine.isExpense;
    const isCC = false;

    let updatedSlipId: string | null = existingVaccine.slipId;

    if (shouldBeExpense && parsedAmount && parsedAmount > 0) {
      const petCategory = await getOrCreatePetCategory(userId);
      const slipTitle = `[${pet.name}] ${sanitizedName}`;

      if (existingVaccine.slipId) {
        // Update existing slip
        await prisma.paymentSlip.update({
          where: { id: existingVaccine.slipId },
          data: {
            title: slipTitle,
            amount: parsedAmount,
            dueDate: appDate,
            isCreditCardPayment: false,
            categoryId: petCategory.id,
          },
        });
      } else {
        // Create new slip
        const newSlip = await prisma.paymentSlip.create({
          data: {
            title: slipTitle,
            amount: parsedAmount,
            dueDate: appDate,
            status: "PAGO",
            isCreditCardPayment: false,
            isRecurring: false,
            categoryId: petCategory.id,
            userId,
          },
        });
        updatedSlipId = newSlip.id;
        handleExpenseRegistrationXp(userId).catch(console.error);
        recomputeAchievements(userId).catch(console.error);
      }
    } else if (!shouldBeExpense && existingVaccine.slipId) {
      // User unchecked expense -> delete the associated slip
      await prisma.paymentSlip.delete({
        where: { id: existingVaccine.slipId },
      });
      updatedSlipId = null;
    }

    const updated = await prisma.petVaccine.update({
      where: { id: vaccineId },
      data: {
        name: sanitizedName,
        type: type !== undefined ? type : existingVaccine.type,
        applicationDate: appDate,
        boosterDate: bDate,
        boosterDone: isBoosterDone,
        notes: notes !== undefined ? (notes ? sanitizeInput(notes) : null) : existingVaccine.notes,
        isExpense: shouldBeExpense,
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : null,
        isCreditCardPayment: false,
        slipId: updatedSlipId,
      },
      include: {
        slip: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/pets/[id]/vaccines/[vaccineId]]", error);
    return NextResponse.json({ error: "Erro ao atualizar vacina" }, { status: 500 });
  }
}

// PATCH /api/pets/[id]/vaccines/[vaccineId] - Quick update (e.g. toggle boosterDone)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vaccineId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId, vaccineId } = await params;
    const existing = await prisma.petVaccine.findFirst({
      where: { id: vaccineId, petId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vacina não encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const dataToUpdate: any = {};

    if (body.boosterDone !== undefined) {
      dataToUpdate.boosterDone = Boolean(body.boosterDone);
    }
    if (body.notes !== undefined) {
      dataToUpdate.notes = body.notes ? sanitizeInput(body.notes) : null;
    }
    if (body.boosterDate !== undefined) {
      dataToUpdate.boosterDate = body.boosterDate ? new Date(body.boosterDate) : null;
    }

    const updated = await prisma.petVaccine.update({
      where: { id: vaccineId },
      data: dataToUpdate,
      include: {
        slip: {
          include: { category: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/pets/[id]/vaccines/[vaccineId]]", error);
    return NextResponse.json({ error: "Erro ao atualizar vacina" }, { status: 500 });
  }
}

// DELETE /api/pets/[id]/vaccines/[vaccineId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vaccineId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId, vaccineId } = await params;
    const existing = await prisma.petVaccine.findFirst({
      where: { id: vaccineId, petId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vacina não encontrada" }, { status: 404 });
    }

    // Delete vaccine
    await prisma.petVaccine.delete({
      where: { id: vaccineId },
    });

    // Delete associated payment slip if existed
    if (existing.slipId) {
      await prisma.paymentSlip.deleteMany({
        where: { id: existing.slipId, userId },
      });
    }

    return NextResponse.json({ message: "Vacina excluída com sucesso" });
  } catch (error) {
    console.error("[DELETE /api/pets/[id]/vaccines/[vaccineId]]", error);
    return NextResponse.json({ error: "Erro ao excluir vacina" }, { status: 500 });
  }
}
