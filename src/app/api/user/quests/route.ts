import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/achievements";

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

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Reset completedQuests if date changed
    let completedQuests: string[] = [];
    try {
      completedQuests = JSON.parse(stats.completedQuests || "[]");
    } catch {
      completedQuests = [];
    }

    const isZeroSpendClaimed = stats.lastZeroSpendClaim === todayStr;

    // Check if user has overdue slips
    const monthStart = new Date(yyyy + "-" + mm + "-01");
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const slips = await prisma.paymentSlip.findMany({
      where: { userId, dueDate: { gte: monthStart, lt: monthEnd } },
    });

    const overdueCount = slips.filter(
      (s) => s.status === "PENDENTE" && s.dueDate.toISOString().slice(0, 10) < todayStr
    ).length;

    const quests = [
      {
        id: "ZERO_SPEND",
        title: "Dia Gasto Zero 🌿",
        description: "Passe o dia sem gastos não essenciais extras.",
        xpReward: 30,
        coinReward: 15,
        isCompleted: isZeroSpendClaimed,
        canClaim: !isZeroSpendClaimed,
      },
      {
        id: "CHECK_DESPESAS",
        title: "Conferência Diária 📱",
        description: "Inspecione suas despesas e mantenha seu orçamento em dia.",
        xpReward: 10,
        coinReward: 5,
        isCompleted: completedQuests.includes("CHECK_DESPESAS"),
        canClaim: !completedQuests.includes("CHECK_DESPESAS"),
      },
      {
        id: "NO_OVERDUE",
        title: "Sem Atrasos 🛡️",
        description: "Mantenha zero contas atrasadas hoje.",
        xpReward: 25,
        coinReward: 10,
        isCompleted: completedQuests.includes("NO_OVERDUE"),
        canClaim: !completedQuests.includes("NO_OVERDUE") && overdueCount === 0,
      },
    ];

    return NextResponse.json({
      todayStr,
      isZeroSpendClaimed,
      capyCoins: stats.capyCoins,
      quests,
    });
  } catch (error) {
    console.error("[GET /api/user/quests]", error);
    return NextResponse.json({ error: "Erro ao carregar missões" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { questId } = body;

    const stats = await prisma.userStats.findUnique({ where: { id: userId } });
    if (!stats) {
      return NextResponse.json({ error: "Estatísticas não encontradas" }, { status: 404 });
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let completedQuests: string[] = [];
    try {
      completedQuests = JSON.parse(stats.completedQuests || "[]");
    } catch {
      completedQuests = [];
    }

    let xpReward = 0;
    let coinReward = 0;

    if (questId === "ZERO_SPEND") {
      if (stats.lastZeroSpendClaim === todayStr) {
        return NextResponse.json({ error: "Dia Gasto Zero já resgatado hoje!" }, { status: 400 });
      }
      xpReward = 30;
      coinReward = 15;

      await prisma.userStats.update({
        where: { id: userId },
        data: {
          lastZeroSpendClaim: todayStr,
          capyCoins: { increment: coinReward },
        },
      });
    } else {
      if (completedQuests.includes(questId)) {
        return NextResponse.json({ error: "Missão já resgatada hoje!" }, { status: 400 });
      }

      if (questId === "CHECK_DESPESAS") {
        xpReward = 10;
        coinReward = 5;
      } else if (questId === "NO_OVERDUE") {
        xpReward = 25;
        coinReward = 10;
      } else {
        return NextResponse.json({ error: "Missão inválida" }, { status: 400 });
      }

      completedQuests.push(questId);
      await prisma.userStats.update({
        where: { id: userId },
        data: {
          completedQuests: JSON.stringify(completedQuests),
          capyCoins: { increment: coinReward },
        },
      });
    }

    const xpResult = await awardXp(userId, xpReward);

    return NextResponse.json({
      message: `Recompensa resgatada! +${xpReward} XP, +${coinReward} 🪙`,
      xpGained: xpReward,
      coinReward,
      xpResult,
    });
  } catch (error) {
    console.error("[POST /api/user/quests]", error);
    return NextResponse.json({ error: "Erro ao resgatar missão" }, { status: 500 });
  }
}
