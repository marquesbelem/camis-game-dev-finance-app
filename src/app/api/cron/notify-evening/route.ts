import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMessaging, isFirebaseAdminInitialized } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/cron/notify-evening
export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization signature
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Initialize Firebase Admin check
    if (!isFirebaseAdminInitialized) {
      return NextResponse.json({ message: "Firebase Admin não configurado. Notificações ignoradas." });
    }

    // Determine target local "today" string (America/Sao_Paulo, UTC-3)
    const todaySP = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    const todayStr = todaySP.toISOString().slice(0, 10); // "YYYY-MM-DD"

    const users = await prisma.user.findMany({
      include: {
        deviceTokens: true,
        apartmentProject: {
          include: {
            expenses: true,
            installments: true,
          },
        },
      },
    });

    let sentCount = 0;
    let failedTokensCount = 0;

    for (const user of users) {
      const tokens = user.deviceTokens.map((dt) => dt.token);
      if (tokens.length === 0) continue;

      // 1. Slips due
      const pendingSlips = await prisma.paymentSlip.findMany({
        where: { userId: user.id, status: "PENDENTE" },
      });

      // Filter out any recurring slips that the user deleted/skipped
      const skips = await prisma.recurringSkip.findMany({
        where: { userId: user.id },
      });
      const skipSet = new Set(
        skips.map(
          (s) => `${s.title.trim().toLowerCase()}-${s.categoryId}-${s.year}-${s.month}`
        )
      );

      const activePendingSlips = pendingSlips.filter((s) => {
        const d = new Date(s.dueDate);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${s.title.trim().toLowerCase()}-${s.categoryId}-${y}-${m}`;
        return !skipSet.has(key);
      });

      // 2. Apartment items due
      const pendingAptExpenses = (user.apartmentProject?.expenses || []).filter(exp => exp.status === "PENDENTE");
      const pendingAptInstallments = (user.apartmentProject?.installments || []).filter(inst => inst.status === "PENDENTE");

      const allPending = [
        ...activePendingSlips.map(s => ({ id: s.id, name: s.title, amount: s.amount, date: s.dueDate })),
        ...pendingAptExpenses.map(e => ({ id: `apt-exp-${e.id}`, name: `[Apê] ${e.description}`, amount: e.amount, date: e.date })),
        ...pendingAptInstallments.map(i => ({ id: `apt-inst-${i.id}`, name: `[Apê] Parcela #${i.installmentNumber}`, amount: i.amount, date: i.dueDate }))
      ];

      const tomorrowSP = new Date(todaySP.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrowSP.toISOString().slice(0, 10);

      const overdueItems = allPending.filter(i => i.date.toISOString().slice(0, 10) < todayStr);
      const todayItems = allPending.filter(i => i.date.toISOString().slice(0, 10) === todayStr);
      const tomorrowItems = allPending.filter(i => i.date.toISOString().slice(0, 10) === tomorrowStr);

      const totalItemsCount = overdueItems.length + todayItems.length + tomorrowItems.length;
      if (totalItemsCount === 0) continue;

      const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const formatDateBR = (d: Date) => {
        const [year, month, day] = d.toISOString().slice(0, 10).split('-');
        return `${day}/${month}/${year}`;
      };

      let title = "Resumo Financeiro da Noite 🌙";
      let body = "";

      if (totalItemsCount === 1) {
        if (overdueItems.length === 1) {
          title = "Ainda Atrasada! 🚨";
          body = `A despesa "${overdueItems[0].name}" de ${formatCurrency(overdueItems[0].amount)} venceu em ${formatDateBR(overdueItems[0].date)} e ainda não foi paga!`;
        } else if (todayItems.length === 1) {
          title = "Acaba Hoje! ⚠️";
          body = `A despesa "${todayItems[0].name}" de ${formatCurrency(todayItems[0].amount)} vence hoje e ainda está pendente!`;
        } else {
          title = "Lembrete de Amanhã 📅";
          body = `A despesa "${tomorrowItems[0].name}" de ${formatCurrency(tomorrowItems[0].amount)} vence amanhã. Prepare-se!`;
        }
      } else {
        const parts = [];
        if (overdueItems.length > 0) parts.push(`${overdueItems.length} atrasada(s)`);
        if (todayItems.length > 0) parts.push(`${todayItems.length} vencendo hoje`);
        if (tomorrowItems.length > 0) parts.push(`${tomorrowItems.length} para amanhã`);

        if (overdueItems.length > 0) title = "Atenção: Contas Pendentes! 🚨";
        else if (todayItems.length > 0) title = "Não esqueça as contas de hoje! ⚠️";
        else title = "Contas para amanhã 📅";

        body = `Fim do dia chegando e você tem: ${parts.join(', ')}. Não esqueça de pagá-las!`;
      }

      // Dispatch multicast message
      const singleItem = totalItemsCount === 1 ? (overdueItems[0] || todayItems[0] || tomorrowItems[0]) : null;
      const message = {
        notification: { title, body },
        data: {
          tag: singleItem ? `expense-${singleItem.id}` : "expenses-reminder",
          ...(singleItem ? { slipId: singleItem.id } : {}),
        },
        tokens,
      };

      const response = await getMessaging().sendEachForMulticast(message);
      sentCount++;

      // Clean up dead/unregistered tokens
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        failedTokensCount += tokensToRemove.length;
        await prisma.deviceToken.deleteMany({
          where: { token: { in: tokensToRemove } },
        });
      }
    }

    return NextResponse.json({
      message: "Processamento de lembretes vespertinos finalizado.",
      usersNotified: sentCount,
      removedTokens: failedTokensCount,
    });
  } catch (error) {
    console.error("[GET /api/cron/notify-evening]", error);
    return NextResponse.json({ error: "Erro interno ao enviar lembretes" }, { status: 500 });
  }
}
