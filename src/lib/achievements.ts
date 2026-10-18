import { prisma } from "@/lib/prisma";

export const DEFAULT_ACHIEVEMENTS = [
  // Trilha 1: BUDGET_CONTROL (Controle de Orçamento)
  {
    title: "Orçamento sob Controle",
    description: "Mantenha as despesas do mês abaixo de 90% do orçamento.",
    type: "BUDGET_CONTROL",
    conditionValue: 90.0,
    level: 1,
  },
  {
    title: "Muralha Financeira",
    description: "Mantenha as despesas do mês abaixo de 75% do orçamento.",
    type: "BUDGET_CONTROL",
    conditionValue: 75.0,
    level: 2,
  },
  {
    title: "Cofre Inviolável",
    description: "Mantenha as despesas do mês abaixo de 50% do orçamento.",
    type: "BUDGET_CONTROL",
    conditionValue: 50.0,
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
  // Mechanics disabled by user request
  return;
}

export async function awardXp(
  userId: string,
  xpAmount: number
): Promise<any> {
  // Mechanics disabled by user request
  return null;
}

export async function handleExpenseRegistrationXp(
  userId: string
): Promise<any> {
  // Mechanics disabled by user request
  return null;
}
