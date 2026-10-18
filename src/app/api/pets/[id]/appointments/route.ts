import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";
import { AppointmentStatus } from "@prisma/client";

// GET /api/pets/[id]/appointments
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

    const appointments = await prisma.petAppointment.findMany({
      where: { petId, userId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("[GET /api/pets/[id]/appointments]", error);
    return NextResponse.json({ error: "Erro ao buscar compromissos" }, { status: 500 });
  }
}

// POST /api/pets/[id]/appointments
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
      title = "Creche",
      type = "CRECHE",
      date,
      time,
      status = "PENDENTE",
      notes,
    } = body;

    const sanitizedTitle = sanitizeInput(title) || "Creche";
    if (!date) {
      return NextResponse.json({ error: "A data do compromisso é obrigatória" }, { status: 400 });
    }

    const parsedDate = new Date(date);
    const validStatus = Object.values(AppointmentStatus).includes(status)
      ? (status as AppointmentStatus)
      : AppointmentStatus.PENDENTE;

    const appointment = await prisma.petAppointment.create({
      data: {
        title: sanitizedTitle,
        type: type ? sanitizeInput(type) : "CRECHE",
        date: parsedDate,
        time: time ? sanitizeInput(time) : null,
        status: validStatus,
        notes: notes ? sanitizeInput(notes) : null,
        petId,
        userId,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/pets/[id]/appointments]", error);
    return NextResponse.json({ error: "Erro ao cadastrar compromisso" }, { status: 500 });
  }
}
