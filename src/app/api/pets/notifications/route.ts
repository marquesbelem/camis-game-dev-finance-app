import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/pets/notifications - Get all active pet alerts (vaccine boosters & daycare today)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Determine target local "today" string (America/Sao_Paulo, UTC-3)
    const todaySP = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    const todayStr = todaySP.toISOString().slice(0, 10);

    const pets = await prisma.pet.findMany({
      where: { userId },
      include: {
        vaccines: {
          where: {
            boosterDate: { not: null },
            boosterDone: false,
          },
        },
        appointments: true,
      },
    });

    const vaccineAlerts = [];
    const appointmentAlerts = [];

    const now = new Date();
    // 15 days window ahead
    const fifteenDaysAhead = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    for (const pet of pets) {
      // Check vaccines
      for (const vaccine of pet.vaccines) {
        if (!vaccine.boosterDate || vaccine.boosterDone) continue;
        const boosterDate = new Date(vaccine.boosterDate);
        const boosterStr = boosterDate.toISOString().slice(0, 10);

        const diffTime = boosterDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (boosterStr < todayStr) {
          // Overdue
          vaccineAlerts.push({
            id: `vac-overdue-${vaccine.id}`,
            type: "VACCINE_OVERDUE",
            petId: pet.id,
            petName: pet.name,
            vaccineName: vaccine.name,
            vaccineType: vaccine.type,
            date: vaccine.boosterDate,
            diffDays,
            severity: "critical",
            title: `Reforço Atrasado! 💉`,
            message: `O reforço da vacina ${vaccine.name} de ${pet.name} venceu em ${boosterDate.toLocaleDateString("pt-BR")}.`,
          });
        } else if (boosterDate <= fifteenDaysAhead) {
          // Coming up soon
          vaccineAlerts.push({
            id: `vac-upcoming-${vaccine.id}`,
            type: "VACCINE_UPCOMING",
            petId: pet.id,
            petName: pet.name,
            vaccineName: vaccine.name,
            vaccineType: vaccine.type,
            date: vaccine.boosterDate,
            diffDays,
            severity: diffDays <= 3 ? "high" : "medium",
            title: diffDays === 0 ? "Reforço Hoje! 💉" : `Reforço em ${diffDays} dia${diffDays > 1 ? "s" : ""} 💉`,
            message: `O reforço de ${vaccine.name} para ${pet.name} está previsto para ${boosterDate.toLocaleDateString("pt-BR")}.`,
          });
        }
      }

      // Check appointments (Creche / Vet)
      for (const app of pet.appointments) {
        const appDate = new Date(app.date);
        const appDateStr = appDate.toISOString().slice(0, 10);

        if (appDateStr === todayStr) {
          appointmentAlerts.push({
            id: `app-today-${app.id}`,
            type: "APPOINTMENT_TODAY",
            petId: pet.id,
            petName: pet.name,
            appointmentId: app.id,
            appointmentTitle: app.title,
            appointmentType: app.type,
            time: app.time,
            status: app.status,
            date: app.date,
            severity: "info",
            title: app.type === "CRECHE" ? "Dia de Creche! 🐾" : "Compromisso Hoje! 📅",
            message: `${pet.name} tem ${app.title}${app.time ? ` às ${app.time}` : ""} agendado(a) para hoje. Status: ${app.status === "COMPARECEU" ? "Compareceu ✅" : app.status === "FALTOU" ? "Não compareceu ❌" : "Pendente ⏳"}`,
          });
        }
      }
    }

    return NextResponse.json({
      vaccineAlerts,
      appointmentAlerts,
      totalCount: vaccineAlerts.length + appointmentAlerts.length,
    });
  } catch (error) {
    console.error("[GET /api/pets/notifications]", error);
    return NextResponse.json({ error: "Erro ao buscar notificações de pets" }, { status: 500 });
  }
}
