import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    // Strict rate limit: 10 auth attempts per minute per IP
    if (isRateLimited(`auth:${ip}`, { windowMs: 60000, max: 10 })) {
      return NextResponse.json(
        { error: "Muitas tentativas de login/registro. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { action, username, password } = await request.json();
    const cleanUsername = sanitizeInput(username);

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Nome de usuário é obrigatório." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (action === "register") {
      // 1. Search for existing user (exact match)
      const existingUser = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Este nome de usuário já está em uso." },
          { status: 400 }
        );
      }

      // 2. Hash password and create user
      const hashedPassword = hashPassword(password);

      const user = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            username: cleanUsername,
            passwordHash: hashedPassword,
          },
        });

        // Initialize UserStats scoped to the new user ID
        await tx.userStats.create({
          data: {
            id: newUser.id,
            monthlyBudgetLimit: 50.0,
            totalCreditLimit: 1000.0,
            currentStreakDays: 0,
            level: 1,
            xp: 0,
            lastRegistrationDate: null,
            registrationStreak: 0,
            scheduledSalaryAmount: 3000.0,
            salaryPaymentDay: 5,
            lastSalaryValidationMonth: null,
          },
        });

        // Clone/Seed default achievements for the new user (9 chained achievements)
        const defaultAchievements = [
          // CARD_THRESHOLD
          {
            title: "Cartão sob Controle",
            description: "Mantenha o gasto no cartão de crédito abaixo de 40% do limite mensal.",
            type: "CARD_THRESHOLD",
            conditionValue: 40.0,
            level: 1,
            userId: newUser.id,
          },
          {
            title: "Uso Consciente",
            description: "Mantenha o gasto no cartão de crédito abaixo de 20% do limite mensal.",
            type: "CARD_THRESHOLD",
            conditionValue: 20.0,
            level: 2,
            userId: newUser.id,
          },
          {
            title: "Cartão Zero",
            description: "Evite totalmente o uso do cartão de crédito no mês (0% do limite).",
            type: "CARD_THRESHOLD",
            conditionValue: 0.0,
            level: 3,
            userId: newUser.id,
          },
          // STREAK
          {
            title: "Foco Inicial",
            description: "Fique 3 dias seguidos sem usar o cartão de crédito.",
            type: "STREAK",
            conditionValue: 3.0,
            level: 1,
            userId: newUser.id,
          },
          {
            title: "Hábito Saudável",
            description: "Fique 7 dias seguidos sem usar o cartão de crédito.",
            type: "STREAK",
            conditionValue: 7.0,
            level: 2,
            userId: newUser.id,
          },
          {
            title: "Mestre do Débito",
            description: "Fique 30 dias seguidos sem usar o cartão de crédito.",
            type: "STREAK",
            conditionValue: 30.0,
            level: 3,
            userId: newUser.id,
          },
          // SAVINGS
          {
            title: "Pé de Meia",
            description: "Guarde pelo menos 10% da sua receita mensal.",
            type: "SAVINGS",
            conditionValue: 10.0,
            level: 1,
            userId: newUser.id,
          },
          {
            title: "Investidor Iniciante",
            description: "Guarde pelo menos 50% da sua receita mensal.",
            type: "SAVINGS",
            conditionValue: 50.0,
            level: 2,
            userId: newUser.id,
          },
          {
            title: "Independência Financeira",
            description: "Guarde pelo menos 70% da sua receita mensal.",
            type: "SAVINGS",
            conditionValue: 70.0,
            level: 3,
            userId: newUser.id,
          },
        ];

        await tx.achievement.createMany({
          data: defaultAchievements,
        });

        return newUser;
      });

      return NextResponse.json({
        id: user.id,
        username: user.username,
      });

    } else if (action === "login") {
      // 1. Search for existing user
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 401 }
        );
      }

      // 2. Verify password
      const isPasswordValid = verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Senha incorreta." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        id: user.id,
        username: user.username,
      });

    } else {
      return NextResponse.json(
        { error: "Ação de autenticação inválida." },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("[POST /api/auth]", error);
    return NextResponse.json(
      { error: "Falha ao processar autenticação." },
      { status: 500 }
    );
  }
}
