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
            scheduledSalaryAmount: 3000.0,
          },
        });

        // Clone/Seed default achievements for the new user (9 chained achievements)
        const defaultAchievements = [
          // BUDGET_CONTROL
          {
            title: "Orçamento sob Controle",
            description: "Mantenha as despesas do mês abaixo de 90% do orçamento.",
            type: "BUDGET_CONTROL",
            conditionValue: 90.0,
            level: 1,
            userId: newUser.id,
          },
          {
            title: "Muralha Financeira",
            description: "Mantenha as despesas do mês abaixo de 75% do orçamento.",
            type: "BUDGET_CONTROL",
            conditionValue: 75.0,
            level: 2,
            userId: newUser.id,
          },
          {
            title: "Cofre Inviolável",
            description: "Mantenha as despesas do mês abaixo de 50% do orçamento.",
            type: "BUDGET_CONTROL",
            conditionValue: 50.0,
            level: 3,
            userId: newUser.id,
          },
          // STREAK
          {
            title: "Foco Inicial",
            description: "Mantenha uma chama de consistência por 3 dias seguidos.",
            type: "STREAK",
            conditionValue: 3.0,
            level: 1,
            userId: newUser.id,
          },
          {
            title: "Hábito Saudável",
            description: "Mantenha uma chama de consistência por 7 dias seguidos.",
            type: "STREAK",
            conditionValue: 7.0,
            level: 2,
            userId: newUser.id,
          },
          {
            title: "Mestre do Débito",
            description: "Mantenha uma chama de consistência por 30 dias seguidos.",
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
        tutorialCompleted: false,
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
        tutorialCompleted: user.tutorialCompleted,
      });

    } else if (action === "reset-password") {
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      const hashedPassword = hashPassword(password);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      return NextResponse.json({
        id: updatedUser.id,
        username: updatedUser.username,
        message: "Senha atualizada com sucesso."
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

// DELETE /api/auth — Excluir Conta do Usuário e todos os dados associados
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`auth:delete:${userId}:${ip}`, { windowMs: 60000, max: 5 })) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Security check: verify password before deleting account
    if (!password || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Senha incorreta. Confirmação de segurança falhou." },
        { status: 400 }
      );
    }

    // Delete user (Prisma onDelete: Cascade deletes all linked data automatically)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Conta e todos os dados foram excluídos com sucesso.",
    });
  } catch (error) {
    console.error("[DELETE /api/auth]", error);
    return NextResponse.json(
      { error: "Falha ao excluir a conta." },
      { status: 500 }
    );
  }
}
