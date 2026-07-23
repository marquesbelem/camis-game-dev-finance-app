import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const STREAK_MILESTONES = [
  { days: 3, xp: 30, coins: 10, title: "Foco Inicial 🔥" },
  { days: 7, xp: 70, coins: 25, title: "Hábito de Ouro ⭐" },
  { days: 14, xp: 150, coins: 50, title: "Mestre da Margem 🚀" },
  { days: 30, xp: 300, coins: 100, title: "Capivara Lendária 👑" },
];

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let stats = await prisma.userStats.findUnique({ where: { id: userId } });
    if (!stats) {
      stats = await prisma.userStats.create({
        data: { id: userId },
      });
    }

    const currentStreak = stats.registrationStreak || 0;
    const highestStreak = Math.max(stats.highestStreak || 0, currentStreak);
    const shields = stats.streakShields ?? 1;

    // Find next milestone
    const nextMilestone = STREAK_MILESTONES.find((m) => m.days > currentStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];

    return NextResponse.json({
      currentStreak,
      highestStreak,
      shields,
      nextMilestone,
      milestones: STREAK_MILESTONES,
    });
  } catch (error) {
    console.error("[GET /api/user/streak]", error);
    return NextResponse.json({ error: "Erro ao buscar dados de streak" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const stats = await prisma.userStats.findUnique({ where: { id: userId } });
    if (!stats) {
      return NextResponse.json({ error: "Estatísticas não encontradas" }, { status: 404 });
    }

    if (action === "useShield") {
      if ((stats.streakShields ?? 0) <= 0) {
        return NextResponse.json({ error: "Você não possui escudos disponíveis este mês" }, { status: 400 });
      }

      const updated = await prisma.userStats.update({
        where: { id: userId },
        data: {
          streakShields: (stats.streakShields ?? 1) - 1,
          registrationStreak: (stats.registrationStreak || 0) + 1,
        },
      });

      return NextResponse.json({
        message: "Escudo ativado com sucesso! Sua sequência de streak foi protegida 🛡️",
        currentStreak: updated.registrationStreak,
        shields: updated.streakShields,
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/user/streak]", error);
    return NextResponse.json({ error: "Erro ao atualizar streak" }, { status: 500 });
  }
}
