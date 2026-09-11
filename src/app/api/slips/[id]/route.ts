import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/upload";
import { recomputeAchievements, awardXp } from "@/lib/achievements";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// PUT /api/slips/[id]  (multipart/form-data — all fields optional)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:id:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const formData = await request.formData();

    if (id.startsWith("apt-exp-")) {
      const expId = id.slice(8);
      const expense = await prisma.apartmentExpense.findUnique({
        where: { id: expId },
        include: { project: true },
      });
      if (!expense || expense.project.userId !== userId) {
        return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
      }

      const status = formData.get("status") as string || expense.status;
      const updated = await prisma.apartmentExpense.update({
        where: { id: expId },
        data: { status },
      });

      return NextResponse.json({
        id: `apt-exp-${updated.id}`,
        title: `[Apê] ${updated.description}`,
        amount: updated.amount,
        dueDate: updated.date.toISOString(),
        status: updated.status,
        isCreditCardPayment: false,
        isRecurring: false,
        categoryId: "virtual-apartment-expense",
        category: {
          id: "virtual-apartment-expense",
          name: "Apartamento",
          colorCode: "var(--color-brand)",
          iconRef: "Home",
        },
      });
    }

    if (id.startsWith("apt-inst-")) {
      const instId = id.slice(9);
      const installment = await prisma.apartmentInstallment.findUnique({
        where: { id: instId },
        include: { project: true },
      });
      if (!installment || installment.project.userId !== userId) {
        return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
      }

      const status = formData.get("status") as string || installment.status;
      const updated = await prisma.apartmentInstallment.update({
        where: { id: instId },
        data: { status },
      });

      return NextResponse.json({
        id: `apt-inst-${updated.id}`,
        title: `[Apê] Parcela #${updated.installmentNumber}`,
        amount: updated.amount,
        dueDate: updated.dueDate.toISOString(),
        status: updated.status,
        isCreditCardPayment: false,
        isRecurring: false,
        categoryId: "virtual-apartment-installment",
        category: {
          id: "virtual-apartment-installment",
          name: "Financiamento",
          colorCode: "var(--color-info)",
          iconRef: "Landmark",
        },
      });
    }

    const existing = await prisma.paymentSlip.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
    }

    const title = formData.get("title") !== null 
      ? sanitizeInput(formData.get("title") as string) 
      : existing.title;
    const rawAmount = formData.get("amount");
    const amount = rawAmount ? parseFloat(rawAmount as string) : existing.amount;
    const rawDueDate = formData.get("dueDate");
    const dueDate = rawDueDate
      ? new Date(rawDueDate as string)
      : existing.dueDate;
    const status = (formData.get("status") as any) || existing.status;
    const rawCredit = formData.get("isCreditCardPayment");
    const isCreditCardPayment =
      rawCredit !== null ? rawCredit === "true" : existing.isCreditCardPayment;
    const rawDebt = formData.get("isDebt");
    const isDebt =
      rawDebt !== null ? rawDebt === "true" : (existing as any).isDebt;
    const rawRecurring = formData.get("isRecurring");
    const isRecurring =
      rawRecurring !== null ? rawRecurring === "true" : existing.isRecurring;
    const categoryId =
      (formData.get("categoryId") as string) || existing.categoryId;
    const file = formData.get("document") as File | null;

    const removeDocument = formData.get("removeDocument") === "true";
    let documentPath = existing.documentPath;

    if (removeDocument && documentPath) {
      // Deletar o arquivo do storage antigo se estiver sendo removido (fogo e esquece pra não travar a requisição)
      deleteUploadedFile(documentPath).catch(console.error);
      documentPath = null;
    } else if (file && file.size > 0) {
      const newPath = await saveUploadedFile(file);
      if (documentPath && documentPath !== newPath) {
        deleteUploadedFile(documentPath).catch(console.error);
      }
      documentPath = newPath;
    }

    const rawInstallmentsCount = formData.get("installmentsCount");
    let targetInstallmentTotal = existing.installmentTotal;

    if (rawInstallmentsCount && existing.isInstallment && existing.installmentGroupId) {
      const newTotal = parseInt(rawInstallmentsCount as string, 10);
      const currentTotal = existing.installmentTotal ?? 1;

      if (!isNaN(newTotal) && newTotal >= (existing.installmentNumber ?? 1) && newTotal <= 100 && newTotal !== currentTotal) {
        targetInstallmentTotal = newTotal;

        const groupSlips = await prisma.paymentSlip.findMany({
          where: { installmentGroupId: existing.installmentGroupId, userId },
          orderBy: { installmentNumber: "asc" },
        });

        if (newTotal > currentTotal) {
          const firstSlip = groupSlips.find(s => s.installmentNumber === 1) || groupSlips[0] || existing;
          const baseDate = new Date(firstSlip.dueDate);

          for (let i = currentTotal + 1; i <= newTotal; i++) {
            const d = new Date(baseDate);
            const day = d.getDate();
            d.setMonth(d.getMonth() + (i - 1));
            if (d.getDate() !== day) {
              d.setDate(0);
            }

            await prisma.paymentSlip.create({
              data: {
                title,
                amount,
                dueDate: d,
                status: "PENDENTE",
                isCreditCardPayment,
                isDebt,
                isRecurring: false,
                isInstallment: true,
                installmentNumber: i,
                installmentTotal: newTotal,
                installmentGroupId: existing.installmentGroupId,
                categoryId,
                documentPath: null,
                userId,
              },
            });
          }
        } else if (newTotal < currentTotal) {
          await prisma.paymentSlip.deleteMany({
            where: {
              installmentGroupId: existing.installmentGroupId,
              userId,
              installmentNumber: { gt: newTotal },
            },
          });
        }

        await prisma.paymentSlip.updateMany({
          where: {
            installmentGroupId: existing.installmentGroupId,
            userId,
            installmentNumber: { lte: newTotal },
          },
          data: {
            installmentTotal: newTotal,
          },
        });
      }
    }

    const updated = await prisma.paymentSlip.update({
      where: { id },
      data: {
        title,
        amount,
        dueDate,
        status,
        isCreditCardPayment,
        isDebt,
        isRecurring,
        recurringDay: isRecurring ? dueDate.getUTCDate() : null,
        categoryId,
        documentPath,
        installmentTotal: targetInstallmentTotal,
      },
      include: { category: true },
    });

    // Award XP if changing status to PAGO and payment method is PIX/débito
    const isPayingNow = status === "PAGO" && existing.status !== "PAGO";
    const isDebitOrPix = !isCreditCardPayment;
    let xpDetails = null;

    if (isPayingNow && isDebitOrPix) {
      xpDetails = await awardXp(userId, 25).catch((err) => {
        console.error("XP Error:", err);
        return null;
      });
    }

    // Recompute achievements asynchronously after mutation
    recomputeAchievements(userId).catch(console.error);

    return NextResponse.json({
      ...updated,
      xpDetails,
    });
  } catch (error) {
    console.error("[PUT /api/slips/:id]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar a despesa" },
      { status: 500 }
    );
  }
}

// DELETE /api/slips/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`slips:id:delete:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (id.startsWith("apt-exp-")) {
      const expId = id.slice(8);
      const expense = await prisma.apartmentExpense.findUnique({
        where: { id: expId },
        include: { project: true },
      });
      if (!expense || expense.project.userId !== userId) {
        return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
      }
      await prisma.apartmentExpense.delete({ where: { id: expId } });
      recomputeAchievements(userId).catch(console.error);
      return new NextResponse(null, { status: 204 });
    }

    if (id.startsWith("apt-inst-")) {
      const instId = id.slice(9);
      const installment = await prisma.apartmentInstallment.findUnique({
        where: { id: instId },
        include: { project: true },
      });
      if (!installment || installment.project.userId !== userId) {
        return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
      }
      await prisma.apartmentInstallment.delete({ where: { id: instId } });
      recomputeAchievements(userId).catch(console.error);
      return new NextResponse(null, { status: 204 });
    }

    const existing = await prisma.paymentSlip.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Despesa não encontrada" }, { status: 404 });
    }

    if (existing.isRecurring) {
      const dueDate = new Date(existing.dueDate);
      const year = dueDate.getFullYear();
      const month = dueDate.getMonth() + 1; // 1-indexed
      
      const db = prisma as any;
      const alreadySkipped = await db.recurringSkip.findFirst({
        where: {
          title: existing.title,
          categoryId: existing.categoryId,
          userId,
          year,
          month,
        },
      });

      if (!alreadySkipped) {
        await db.recurringSkip.create({
          data: {
            title: existing.title,
            categoryId: existing.categoryId,
            userId,
            year,
            month,
          },
        }).catch(console.error);
      }
    }

    if (deleteAll && existing.isInstallment && existing.installmentGroupId) {
      await prisma.paymentSlip.deleteMany({
        where: {
          userId,
          installmentGroupId: existing.installmentGroupId,
          installmentNumber: {
            gte: existing.installmentNumber ?? 1,
          },
        },
      });
    } else {
      await prisma.paymentSlip.delete({ where: { id } });
    }

    // Recompute achievements asynchronously after mutation
    recomputeAchievements(userId).catch(console.error);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/slips/:id]", error);
    return NextResponse.json(
      { error: "Falha ao excluir a despesa" },
      { status: 500 }
    );
  }
}
