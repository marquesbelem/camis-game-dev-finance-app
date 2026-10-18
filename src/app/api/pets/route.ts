import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";

// GET /api/pets - List all pets for active user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const pets = await prisma.pet.findMany({
      where: { userId },
      include: {
        vaccines: {
          orderBy: { applicationDate: "desc" },
          include: { slip: true },
        },
        appointments: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(pets);
  } catch (error) {
    console.error("[GET /api/pets]", error);
    return NextResponse.json({ error: "Erro ao buscar pets" }, { status: 500 });
  }
}

// POST /api/pets - Create a new pet
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, species, breed, birthDate, weight, rga, photoUrl, notes } = body;

    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) {
      return NextResponse.json({ error: "O nome do pet é obrigatório" }, { status: 400 });
    }

    const parsedWeight = weight !== undefined && weight !== null && weight !== "" ? parseFloat(weight) : null;
    const parsedBirthDate = birthDate ? new Date(birthDate) : null;

    const pet = await prisma.pet.create({
      data: {
        name: sanitizedName,
        species: species ? sanitizeInput(species) : "Cachorro",
        breed: breed ? sanitizeInput(breed) : null,
        birthDate: parsedBirthDate,
        weight: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : null,
        rga: rga ? sanitizeInput(rga) : null,
        photoUrl: photoUrl || null,
        notes: notes ? sanitizeInput(notes) : null,
        userId,
      },
      include: {
        vaccines: true,
        appointments: true,
      },
    });

    return NextResponse.json(pet, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pets]", error);
    return NextResponse.json({ error: "Erro ao cadastrar pet" }, { status: 500 });
  }
}
