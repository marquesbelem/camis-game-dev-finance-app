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

      // 1. Slips due today that are still PENDENTE
      const slips = await prisma.paymentSlip.findMany({
        where: {
          userId: user.id,
          status: "PENDENTE",
        },
      });
      const pendingSlips = slips.filter(
        (s) => s.dueDate.toISOString().slice(0, 10) === todayStr
      );

      // 2. Apartment items due today that are still PENDENTE
      const pendingAptExpenses = (user.apartmentProject?.expenses || []).filter(
        (exp) => exp.status === "PENDENTE" && exp.date.toISOString().slice(0, 10) === todayStr
      );
      const pendingAptInstallments = (user.apartmentProject?.installments || []).filter(
        (inst) => inst.status === "PENDENTE" && inst.dueDate.toISOString().slice(0, 10) === todayStr
      );

      const totalItemsCount = pendingSlips.length + pendingAptExpenses.length + pendingAptInstallments.length;
      if (totalItemsCount === 0) continue;

      const totalAmount =
        pendingSlips.reduce((sum, s) => sum + s.amount, 0) +
        pendingAptExpenses.reduce((sum, s) => sum + s.amount, 0) +
        pendingAptInstallments.reduce((sum, s) => sum + s.amount, 0);

      // Construct dynamic message body
      let title = "Alerta de Contas Pendentes ⏳";
      let body = "";

      if (totalItemsCount === 1) {
        let name = "";
        if (pendingSlips.length > 0) name = pendingSlips[0].title;
        else if (pendingAptExpenses.length > 0) name = `[Apê] ${pendingAptExpenses[0].description}`;
        else name = `[Apê] Parcela #${pendingAptInstallments[0].installmentNumber}`;

        body = `A despesa "${name}" de ${totalAmount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} vence hoje e ainda não foi paga! Evite multas.`;
      } else {
        body = `Atenção: Você tem ${totalItemsCount} contas vencendo hoje que ainda não foram marcadas como pagas (total de ${totalAmount.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        )}). Lembre-se de pagá-las!`;
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
      message: "Processamento de lembretes vespertinos finalizado.",
      usersNotified: sentCount,
      removedTokens: failedTokensCount,
    });
  } catch (error) {
    console.error("[GET /api/cron/notify-evening]", error);
    return NextResponse.json({ error: "Erro interno ao enviar lembretes" }, { status: 500 });
  }
}
