import { prisma } from "@/lib/prisma";

export const DEFAULT_ACHIEVEMENTS = [
  // Trilha 1: CARD_THRESHOLD (Redução de uso de cartão)
  {
    title: "Cartão sob Controle",
    description: "Mantenha o gasto no cartão de crédito abaixo de 40% do limite mensal.",
    type: "CARD_THRESHOLD",
    conditionValue: 40.0,
    level: 1,
  },
  {
    title: "Uso Consciente",
    description: "Mantenha o gasto no cartão de crédito abaixo de 20% do limite mensal.",
    type: "CARD_THRESHOLD",
    conditionValue: 20.0,
    level: 2,
  },
  {
    title: "Cartão Zero",
    description: "Evite totalmente o uso do cartão de crédito no mês (0% do limite).",
    type: "CARD_THRESHOLD",
    conditionValue: 0.0,
    level: 3,
  },
  // Trilha 2: STREAK (Consistência Diária)
  {
    title: "Foco Inicial",
    description: "Mantenha uma chama de consistência por 3 dias seguidos.",
    type: "STREAK",
    conditionValue: 3.0,
    level: 1,
  },
  {
    title: "Hábito Saudável",
    description: "Mantenha uma chama de consistência por 7 dias seguidos.",
    type: "STREAK",
    conditionValue: 7.0,
    level: 2,
  },
  {
    title: "Mestre do Débito",
    description: "Mantenha uma chama de consistência por 30 dias seguidos.",
    type: "STREAK",
    conditionValue: 30.0,
    level: 3,
  },
  // Trilha 3: SAVINGS (Margem de lucro)
  {
    title: "Pé de Meia",
    description: "Guarde pelo menos 10% da sua receita mensal.",
    type: "SAVINGS",
    conditionValue: 10.0,
    level: 1,
  },
  {
    title: "Investidor Iniciante",
    description: "Guarde pelo menos 50% da sua receita mensal.",
    type: "SAVINGS",
    conditionValue: 50.0,
    level: 2,
  },
  {
    title: "Independência Financeira",
    description: "Guarde pelo menos 70% da sua receita mensal.",
    type: "SAVINGS",
    conditionValue: 70.0,
    level: 3,
  },
  // Trilha 4: MONSTER_HUNTER (Caçador de Monstros Financeiros)
  {
    title: "Primeiro Abate ⚔️",
    description: "Derrote seu 1º Monstro Financeiro ao quitar uma despesa.",
    type: "MONSTER_HUNTER",
    conditionValue: 1.0,
    level: 1,
  },
  {
    title: "Exterminador de Juros 👹",
    description: "Derrote 5 Monstros dos Juros ou Recorrência quitando antes do prazo.",
    type: "MONSTER_HUNTER",
    conditionValue: 5.0,
    level: 2,
  },
  {
    title: "Domador de Fantasma 🐲",
    description: "Derrote 10 Monstros de faturas e despesas.",
    type: "MONSTER_HUNTER",
    conditionValue: 10.0,
    level: 3,
  },
  // Trilha 5: APARTMENT_PROGRESS (Conquista do Apê Voxel 3D)
  {
    title: "Chave na Mão 🔑",
    description: "Alcance 15% do progresso total do seu Apê Voxel 3D.",
    type: "APARTMENT_PROGRESS",
    conditionValue: 15.0,
    level: 1,
  },
  {
    title: "Lar Doce Lar 🛋️",
    description: "Alcance 40% do Apê com sala e piso montados.",
    type: "APARTMENT_PROGRESS",
    conditionValue: 40.0,
    level: 2,
  },
  {
    title: "Apê dos Sonhos 🥩",
    description: "Alcance 90%+ do progresso e coloque a Capivara de Férias na Varanda!",
    type: "APARTMENT_PROGRESS",
    conditionValue: 90.0,
    level: 3,
  },
  // Trilha 6: CAPY_SCORE (Saúde Financeira CapyScore)
  {
    title: "Score Bronze 📊",
    description: "Alcance um CapyScore igual ou superior a 60 pontos.",
    type: "CAPY_SCORE",
    conditionValue: 60.0,
    level: 1,
  },
  {
    title: "Score Ouro 🏆",
    description: "Alcance um CapyScore igual ou superior a 80 pontos.",
    type: "CAPY_SCORE",
    conditionValue: 80.0,
    level: 2,
  },
  {
    title: "Lenda Financeira 💎",
    description: "Alcance o CapyScore perfeito de 100 pontos!",
    type: "CAPY_SCORE",
    conditionValue: 100.0,
    level: 3,
  },
];

/**
 * Recomputes progress for all achievements based on current stats and month's slips.
 */
export async function recomputeAchievements(userId: string): Promise<void> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 1. Ensure user has all 18 achievements across 6 trails
  const existing = await prisma.achievement.findMany({
    where: { userId },
  });

  if (existing.length !== DEFAULT_ACHIEVEMENTS.length || !existing.some((a) => a.title === "Primeiro Abate ⚔️")) {
    await prisma.achievement.deleteMany({ where: { userId } });
    await prisma.achievement.createMany({
      data: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, userId })),
    });
  }

  // 2. Fetch updated data
  const slips = await prisma.paymentSlip.findMany({
    where: {
      userId,
      dueDate: { gte: monthStart, lt: monthEnd },
    },
    include: { category: true },
  });

  const stats = await prisma.userStats.findUnique({
    where: { id: userId },
  });

  if (!stats) return;

  // Calculate metrics
  const totalSpent = slips.reduce((sum, s) => sum + s.amount, 0);
  const creditSpent = slips.filter((s) => s.isCreditCardPayment).reduce((sum, s) => sum + s.amount, 0);
  const paidSlipsCount = slips.filter((s) => s.status === "PAGO").length;

  const cardLimit = stats.totalCreditLimit > 0 ? stats.totalCreditLimit : 1000.0;
  const creditPct = (creditSpent / cardLimit) * 100;

  const registrationStreak = stats.registrationStreak || 0;

  const revenue = stats.scheduledSalaryAmount > 0 ? stats.scheduledSalaryAmount : 3000.0;
  const savings = revenue - totalSpent;
  const marginPct = revenue > 0 ? (savings / revenue) * 100 : 0;

  // Compute CapyScore dynamically (0-100)
  const onTimeScore = paidSlipsCount > 0 ? Math.min(40, (paidSlipsCount / Math.max(1, slips.length)) * 40) : 40;
  const creditScore = creditPct <= 30 ? 30 : creditPct <= 60 ? 15 : 0;
  const leisureSpent = slips.filter((s) => s.category?.name === "Lazer").reduce((sum, s) => sum + s.amount, 0);
  const leisureScore = stats.leisureBudget > 0 ? (leisureSpent <= stats.leisureBudget ? 30 : 10) : 30;
  const capyScoreValue = Math.round(onTimeScore + creditScore + leisureScore);

  // Fetch apartment project progress if exists
  const apartmentProject = await prisma.apartmentProject.findUnique({
    where: { userId },
    include: { installments: true },
  });
  let apartmentPct = 0;
  if (apartmentProject && apartmentProject.installments.length > 0) {
    const paidInst = apartmentProject.installments.filter((i) => i.status === "PAGO").length;
    apartmentPct = (paidInst / apartmentProject.installments.length) * 100;
  }

  // 3. Process achievements
  const userAchievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { level: "asc" },
  });

  const chainUnlocked: Record<string, boolean> = {
    CARD_THRESHOLD: true,
    STREAK: true,
    SAVINGS: true,
    MONSTER_HUNTER: true,
    APARTMENT_PROGRESS: true,
    CAPY_SCORE: true,
  };

  for (const ach of userAchievements) {
    let progress = 0;
    let unlocked = false;
    const isPrevUnlocked = chainUnlocked[ach.type] ?? true;

    if (isPrevUnlocked) {
      switch (ach.type) {
        case "CARD_THRESHOLD": {
          if (creditPct <= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            const excess = creditPct - ach.conditionValue;
            progress = Math.max(0, 100 - excess);
            unlocked = false;
          }
          break;
        }
        case "STREAK": {
          if (registrationStreak >= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            progress = (registrationStreak / ach.conditionValue) * 100;
            unlocked = false;
          }
          break;
        }
        case "SAVINGS": {
          if (marginPct >= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            progress = Math.max(0, (marginPct / ach.conditionValue) * 100);
            unlocked = false;
          }
          break;
        }
        case "MONSTER_HUNTER": {
          if (paidSlipsCount >= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            progress = (paidSlipsCount / ach.conditionValue) * 100;
            unlocked = false;
          }
          break;
        }
        case "APARTMENT_PROGRESS": {
          if (apartmentPct >= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            progress = (apartmentPct / ach.conditionValue) * 100;
            unlocked = false;
          }
          break;
        }
        case "CAPY_SCORE": {
          if (capyScoreValue >= ach.conditionValue) {
            progress = 100;
            unlocked = true;
          } else {
            progress = (capyScoreValue / ach.conditionValue) * 100;
            unlocked = false;
          }
          break;
        }
      }
    } else {
      progress = 0;
      unlocked = false;
    }

    chainUnlocked[ach.type] = unlocked;

    const newlyUnlocked = unlocked && !ach.isUnlocked;

    await prisma.achievement.update({
      where: { id: ach.id },
      data: {
        progressPercentage: Math.round(progress * 10) / 10,
        isUnlocked: unlocked,
        unlockedAt: newlyUnlocked ? now : ach.unlockedAt,
      },
    });

    // Reward CapyCoins + XP if newly unlocked!
    if (newlyUnlocked) {
      const rewardCoins = ach.level * 25;
      const rewardXp = ach.level * 40;
      await awardXp(userId, rewardXp);
      await prisma.userStats.update({
        where: { id: userId },
        data: { capyCoins: { increment: rewardCoins } },
      });
    }
  }
}

export async function awardXp(
  userId: string,
  xpAmount: number
): Promise<{
  xpGained: number;
  oldXp: number;
  newXp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}> {
  const stats = await prisma.userStats.findUnique({
    where: { id: userId },
  });

  if (!stats) {
    throw new Error("User stats not found");
  }

  const oldXp = stats.xp;
  const oldLevel = stats.level;
  let newXp = oldXp + xpAmount;
  let newLevel = oldLevel;
  let coinsGained = 0;

  while (newXp >= newLevel * 100) {
    newXp -= newLevel * 100;
    newLevel += 1;
    coinsGained += 50;
  }

  await prisma.userStats.update({
    where: { id: stats.id },
    data: {
      xp: newXp,
      level: newLevel,
      capyCoins: { increment: coinsGained },
    },
  });

  return {
    xpGained: xpAmount,
    oldXp,
    newXp,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

export async function handleExpenseRegistrationXp(
  userId: string
): Promise<{
  xpGained: number;
  streak: number;
  bonusAwarded: boolean;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}> {
  const stats = await prisma.userStats.findUnique({
    where: { id: userId },
  });

  if (!stats) {
    throw new Error("User stats not found");
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newStreak = stats.registrationStreak;
  let bonusAwarded = false;
  let xpGained = 10;

  if (stats.lastRegistrationDate === yesterdayStr) {
    newStreak += 1;
    xpGained += 20;
    bonusAwarded = true;
  } else if (stats.lastRegistrationDate === todayStr) {
    // Keeps streak
  } else {
    newStreak = 1;
  }

  await prisma.userStats.update({
    where: { id: userId },
    data: {
      lastRegistrationDate: todayStr,
      registrationStreak: newStreak,
    },
  });

  const xpResult = await awardXp(userId, xpGained);

  return {
    xpGained,
    streak: newStreak,
    bonusAwarded,
    oldLevel: xpResult.oldLevel,
    newLevel: xpResult.newLevel,
    leveledUp: xpResult.leveledUp,
  };
}
