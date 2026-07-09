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
      },
    });

    let sentCount = 0;
    let failedTokensCount = 0;

    for (const user of users) {
      const tokens = user.deviceTokens.map((dt) => dt.token);
      if (tokens.length === 0) continue;

      // 1. Slips due today
      const slips = await prisma.paymentSlip.findMany({
        where: {
          userId: user.id,
          status: "PENDENTE",
        },
      });
      const dueSlips = slips.filter(
        (s) => s.dueDate.toISOString().slice(0, 10) === todayStr
      );

      // 2. Apartment items due today
      const dueAptExpenses = (user.apartmentProject?.expenses || []).filter(
        (exp) => exp.status === "PENDENTE" && exp.date.toISOString().slice(0, 10) === todayStr
      );
      const dueAptInstallments = (user.apartmentProject?.installments || []).filter(
        (inst) => inst.status === "PENDENTE" && inst.dueDate.toISOString().slice(0, 10) === todayStr
      );

      const totalItemsCount = dueSlips.length + dueAptExpenses.length + dueAptInstallments.length;
      if (totalItemsCount === 0) continue;

      const totalAmount =
        dueSlips.reduce((sum, s) => sum + s.amount, 0) +
        dueAptExpenses.reduce((sum, s) => sum + s.amount, 0) +
        dueAptInstallments.reduce((sum, s) => sum + s.amount, 0);

      // Construct dynamic message body
      let title = "Contas Vencendo Hoje ⚠️";
      let body = "";

      if (totalItemsCount === 1) {
        let name = "";
        if (dueSlips.length > 0) name = dueSlips[0].title;
        else if (dueAptExpenses.length > 0) name = `[Apê] ${dueAptExpenses[0].description}`;
        else name = `[Apê] Parcela #${dueAptInstallments[0].installmentNumber}`;

        title = "Aviso de Vencimento ⚠️";
        body = `A despesa "${name}" de ${totalAmount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })} vence hoje. Lembre-se de pagar!`;
      } else {
        body = `Você tem ${totalItemsCount} despesas vencendo hoje no total de ${totalAmount.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        )}. Abra o app para conferir!`;
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
