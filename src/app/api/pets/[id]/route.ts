import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";

// GET /api/pets/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const pet = await prisma.pet.findFirst({
      where: { id, userId },
      include: {
        vaccines: {
          orderBy: { applicationDate: "desc" },
          include: { slip: true },
        },
        appointments: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!pet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    return NextResponse.json(pet);
  } catch (error) {
    console.error("[GET /api/pets/[id]]", error);
    return NextResponse.json({ error: "Erro ao buscar pet" }, { status: 500 });
  }
}

// PUT /api/pets/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, species, breed, birthDate, weight, rga, photoUrl, notes } = body;

    const existingPet = await prisma.pet.findFirst({
      where: { id, userId },
    });

    if (!existingPet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    const sanitizedName = name ? sanitizeInput(name) : existingPet.name;
    const parsedWeight = weight !== undefined && weight !== null && weight !== "" ? parseFloat(weight) : null;
    const parsedBirthDate = birthDate ? new Date(birthDate) : null;

    const updated = await prisma.pet.update({
      where: { id },
      data: {
        name: sanitizedName,
        species: species ? sanitizeInput(species) : existingPet.species,
        breed: breed !== undefined ? (breed ? sanitizeInput(breed) : null) : existingPet.breed,
        birthDate: birthDate !== undefined ? parsedBirthDate : existingPet.birthDate,
        weight: weight !== undefined ? (parsedWeight && !isNaN(parsedWeight) ? parsedWeight : null) : existingPet.weight,
        rga: rga !== undefined ? (rga ? sanitizeInput(rga) : null) : existingPet.rga,
        photoUrl: photoUrl !== undefined ? photoUrl : existingPet.photoUrl,
        notes: notes !== undefined ? (notes ? sanitizeInput(notes) : null) : existingPet.notes,
      },
      include: {
        vaccines: {
          orderBy: { applicationDate: "desc" },
          include: { slip: true },
        },
        appointments: {
          orderBy: { date: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/pets/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar pet" }, { status: 500 });
  }
}

// DELETE /api/pets/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existingPet = await prisma.pet.findFirst({
      where: { id, userId },
      include: {
        vaccines: true,
      },
    });

    if (!existingPet) {
      return NextResponse.json({ error: "Pet não encontrado" }, { status: 404 });
    }

    // Collect linked slipIds to clean up from payment slips
    const slipIdsToDelete = existingPet.vaccines
      .map((v) => v.slipId)
      .filter((sId): sId is string => Boolean(sId));

    // Delete pet (cascades to vaccines and appointments)
    await prisma.pet.delete({
      where: { id },
    });

    // Clean up linked expense slips
    if (slipIdsToDelete.length > 0) {
      await prisma.paymentSlip.deleteMany({
        where: { id: { in: slipIdsToDelete }, userId },
      });
    }

    return NextResponse.json({ message: "Pet excluído com sucesso" });
  } catch (error) {
    console.error("[DELETE /api/pets/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir pet" }, { status: 500 });
  }
}
