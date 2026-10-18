import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput } from "@/lib/security";
import { AppointmentStatus } from "@prisma/client";

// PATCH /api/pets/[id]/appointments/[appointmentId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appointmentId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId, appointmentId } = await params;
    const existing = await prisma.petAppointment.findFirst({
      where: { id: appointmentId, petId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Compromisso não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { status, title, type, date, time, notes } = body;

    const dataToUpdate: any = {};
    if (status !== undefined) {
      if (Object.values(AppointmentStatus).includes(status)) {
        dataToUpdate.status = status;
      }
    }
    if (title !== undefined) dataToUpdate.title = sanitizeInput(title);
    if (type !== undefined) dataToUpdate.type = sanitizeInput(type);
    if (date !== undefined) dataToUpdate.date = new Date(date);
    if (time !== undefined) dataToUpdate.time = time ? sanitizeInput(time) : null;
    if (notes !== undefined) dataToUpdate.notes = notes ? sanitizeInput(notes) : null;

    const updated = await prisma.petAppointment.update({
      where: { id: appointmentId },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/pets/[id]/appointments/[appointmentId]]", error);
    return NextResponse.json({ error: "Erro ao atualizar compromisso" }, { status: 500 });
  }
}

// DELETE /api/pets/[id]/appointments/[appointmentId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; appointmentId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: petId, appointmentId } = await params;
    const existing = await prisma.petAppointment.findFirst({
      where: { id: appointmentId, petId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Compromisso não encontrado" }, { status: 404 });
    }

    await prisma.petAppointment.delete({
      where: { id: appointmentId },
    });

    return NextResponse.json({ message: "Compromisso excluído com sucesso" });
  } catch (error) {
    console.error("[DELETE /api/pets/[id]/appointments/[appointmentId]]", error);
    return NextResponse.json({ error: "Erro ao excluir compromisso" }, { status: 500 });
  }
}
