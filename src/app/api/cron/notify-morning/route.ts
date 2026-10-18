import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMessaging, isFirebaseAdminInitialized } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

// GET /api/cron/notify-morning
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
        pets: {
          include: {
            vaccines: true,
            appointments: true,
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

      // 2. Apartment items due
      const pendingAptExpenses = (user.apartmentProject?.expenses || []).filter(exp => exp.status === "PENDENTE");
      const pendingAptInstallments = (user.apartmentProject?.installments || []).filter(inst => inst.status === "PENDENTE");

      const allPending = [
        ...pendingSlips.map(s => ({ name: s.title, amount: s.amount, date: s.dueDate })),
        ...pendingAptExpenses.map(e => ({ name: `[Apê] ${e.description}`, amount: e.amount, date: e.date })),
        ...pendingAptInstallments.map(i => ({ name: `[Apê] Parcela #${i.installmentNumber}`, amount: i.amount, date: i.dueDate }))
      ];

      const tomorrowSP = new Date(todaySP.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrowSP.toISOString().slice(0, 10);
      const currentMonthPrefix = todayStr.slice(0, 7);

      const overdueItems = allPending.filter(i => {
        const itemDateStr = i.date.toISOString().slice(0, 10);
        return itemDateStr < todayStr && itemDateStr.startsWith(currentMonthPrefix);
      });
      const todayItems = allPending.filter(i => i.date.toISOString().slice(0, 10) === todayStr);
      const tomorrowItems = allPending.filter(i => i.date.toISOString().slice(0, 10) === tomorrowStr);

      // 3. Pet alerts (vaccine booster near/today & daycare today)
      const petAlerts: string[] = [];
      for (const pet of (user.pets || [])) {
        for (const vac of (pet.vaccines || [])) {
          if (!vac.boosterDate) continue;
          const bStr = vac.boosterDate.toISOString().slice(0, 10);
          if (bStr === todayStr) {
            petAlerts.push(`💉 Reforço de ${vac.name} de ${pet.name} hoje`);
          } else if (bStr === tomorrowStr) {
            petAlerts.push(`💉 Reforço de ${vac.name} de ${pet.name} amanhã`);
          }
        }
        for (const app of (pet.appointments || [])) {
          const aStr = app.date.toISOString().slice(0, 10);
          if (aStr === todayStr && app.status === "PENDENTE") {
            petAlerts.push(`🐾 Hoje é dia de ${app.title} de ${pet.name}`);
          }
        }
      }

      const totalItemsCount = overdueItems.length + todayItems.length + tomorrowItems.length;
      if (totalItemsCount === 0 && petAlerts.length === 0) continue;

      const formatCurrency = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const formatDateBR = (d: Date) => {
        const [year, month, day] = d.toISOString().slice(0, 10).split('-');
        return `${day}/${month}/${year}`;
      };

      let title = "Lembrete Financeiro 📊";
      let body = "";

      if (totalItemsCount === 0 && petAlerts.length > 0) {
        title = "Lembrete do Pet 🐾";
        body = petAlerts.join(". ") + "!";
      } else if (totalItemsCount === 1) {
        if (overdueItems.length === 1) {
          title = "Conta Atrasada! 🚨";
          body = `A despesa "${overdueItems[0].name}" de ${formatCurrency(overdueItems[0].amount)} venceu em ${formatDateBR(overdueItems[0].date)}. Pague para evitar juros!`;
        } else if (todayItems.length === 1) {
          title = "Vencimento Hoje ⚠️";
          body = `A despesa "${todayItems[0].name}" de ${formatCurrency(todayItems[0].amount)} vence hoje. Não esqueça de pagar!`;
        } else {
          title = "Vencimento Amanhã 📅";
          body = `A despesa "${tomorrowItems[0].name}" de ${formatCurrency(tomorrowItems[0].amount)} vence amanhã.`;
        }
        if (petAlerts.length > 0) {
          body += ` • ${petAlerts.join(". ")}!`;
        }
      } else {
        const parts = [];
        if (overdueItems.length > 0) parts.push(`${overdueItems.length} atrasada(s)`);
        if (todayItems.length > 0) parts.push(`${todayItems.length} vencendo hoje`);
        if (tomorrowItems.length > 0) parts.push(`${tomorrowItems.length} para amanhã`);

        if (overdueItems.length > 0) title = "Aviso de Contas Atrasadas! 🚨";
        else if (todayItems.length > 0) title = "Contas Vencendo Hoje ⚠️";
        else title = "Contas Vencendo Amanhã 📅";

        const allItems = [...overdueItems, ...todayItems, ...tomorrowItems];
        const itemNames = allItems.slice(0, 3).map(i => i.name).join(', ');
        const hasMore = allItems.length > 3 ? ` e mais ${allItems.length - 3}` : '';

        body = `Você tem pendências (${parts.join(', ')}): ${itemNames}${hasMore}. Abra o app para organizar suas finanças!`;
        if (petAlerts.length > 0) {
          body += ` • ${petAlerts.join(". ")}!`;
        }
      }

      // Dispatch multicast message
      const message = {
        notification: { title, body },
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
      message: "Processamento de notificações matinais finalizado.",
      usersNotified: sentCount,
      removedTokens: failedTokensCount,
    });
  } catch (error) {
    console.error("[GET /api/cron/notify-morning]", error);
    return NextResponse.json({ error: "Erro interno ao enviar notificações" }, { status: 500 });
  }
}
