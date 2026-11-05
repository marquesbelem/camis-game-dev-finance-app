import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

// Helper: month names in Portuguese
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_SHORT_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`analytics:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const currentYear = new Date().getFullYear();
    const queryYear = parseInt(searchParams.get("year") || String(currentYear), 10);
    const targetYear = isNaN(queryYear) ? currentYear : queryYear;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    const regDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const regMonthStr = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, "0")}`;

    // 1. Fetch user stats (fallback scheduled salary)
    let stats = await prisma.userStats.findUnique({
      where: { id: userId },
    });
    if (!stats) {
      stats = await prisma.userStats.create({
        data: {
          id: userId,
          monthlyBudgetLimit: 50.0,
          totalCreditLimit: 1000.0,
          currentStreakDays: 0,
          level: 1,
          xp: 0,
          scheduledSalaryAmount: 3000.0,
        },
      });
    }

    const defaultSalary = typeof stats.scheduledSalaryAmount === "number" ? stats.scheduledSalaryAmount : 3000.0;

    // 2. Auto-generate recurring slips for this year if any (only from registration/creation month onwards)
    const allRecurringSlips = await prisma.paymentSlip.findMany({
      where: { userId, isRecurring: true },
      orderBy: { dueDate: "desc" },
    });

    const latestRecurringMap = new Map<string, typeof allRecurringSlips[0]>();
    const earliestRecurringMonthMap = new Map<string, string>();
    for (const slip of allRecurringSlips) {
      const key = `${slip.title.trim().toLowerCase()}-${slip.categoryId}`;
      if (!latestRecurringMap.has(key)) {
        latestRecurringMap.set(key, slip);
      }
      const createdD = new Date(slip.createdAt);
      const createdMonthStr = `${createdD.getFullYear()}-${String(createdD.getMonth() + 1).padStart(2, "0")}`;
      const prevEarliest = earliestRecurringMonthMap.get(key);
      if (!prevEarliest || createdMonthStr < prevEarliest) {
        earliestRecurringMonthMap.set(key, createdMonthStr);
      }
    }
    const recurringSlips = Array.from(latestRecurringMap.values());

    if (recurringSlips.length > 0) {
      const yearStart = new Date(targetYear, 0, 1);
      const yearEnd = new Date(targetYear + 1, 0, 1);

      const existingSlips = await prisma.paymentSlip.findMany({
        where: {
          userId,
          dueDate: { gte: yearStart, lt: yearEnd },
        },
        select: { title: true, categoryId: true, dueDate: true },
      });

      const skips = await prisma.recurringSkip.findMany({
        where: { userId, year: targetYear },
      });
      const skipSet = new Set(skips.map(s => `${s.month}:${s.title.trim().toLowerCase()}-${s.categoryId}`));

      const existingMap = new Set(
        existingSlips.map(s => {
          const m = s.dueDate.getMonth() + 1;
          return `${m}:${s.title.trim().toLowerCase()}-${s.categoryId}`;
        })
      );

      const slipsToCreate = [];
      for (let mon = 1; mon <= 12; mon++) {
        const monthStr = `${targetYear}-${String(mon).padStart(2, "0")}`;
        if (monthStr < regMonthStr) continue;

        for (const rs of recurringSlips) {
          const seriesKey = `${rs.title.trim().toLowerCase()}-${rs.categoryId}`;
          const originMonth = earliestRecurringMonthMap.get(seriesKey) ?? regMonthStr;
          const minValidMonth = originMonth > regMonthStr ? originMonth : regMonthStr;
          if (monthStr < minValidMonth) continue;

          const key = `${mon}:${seriesKey}`;
          if (skipSet.has(key) || existingMap.has(key)) continue;

          const day = rs.recurringDay ?? rs.dueDate.getUTCDate();
          const maxDay = new Date(targetYear, mon, 0).getDate();
          const clampedDay = Math.min(day, maxDay);

          slipsToCreate.push({
            title: rs.title,
            amount: rs.amount,
            dueDate: new Date(targetYear, mon - 1, clampedDay),
            status: "PENDENTE" as const,
            isCreditCardPayment: false,
            isRecurring: true,
            recurringDay: rs.recurringDay,
            categoryId: rs.categoryId,
            userId,
          });
        }
      }

      if (slipsToCreate.length > 0) {
        await prisma.paymentSlip.createMany({
          data: slipsToCreate,
        });
      }
    }

    // 3. Fetch all slips for the target year (UTC bounds to avoid timezone shift)
    const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(targetYear + 1, 0, 1, 0, 0, 0));

    const slips = await prisma.paymentSlip.findMany({
      where: {
        userId,
        dueDate: { gte: yearStart, lt: yearEnd },
      },
      include: {
        category: {
          select: { id: true, name: true, colorCode: true, iconRef: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // 4. Fetch all extra incomes for target year
    const extraIncomes = await prisma.extraIncome.findMany({
      where: {
        userId,
        month: { startsWith: `${targetYear}-` },
      },
      orderBy: { createdAt: "asc" },
    });

    // 5. Fetch all monthly budgets for target year
    const monthlyBudgets = await prisma.monthlyBudget.findMany({
      where: {
        userId,
        month: { startsWith: `${targetYear}-` },
      },
    });
    const budgetMap = new Map(monthlyBudgets.map(b => [b.month, b]));

    // 6. Aggregate monthly data (12 months)
    const monthlyData = [];
    const yearlyCategoryMap: Record<string, { name: string; color: string; total: number; count: number }> = {};

    let totalYearlyIncome = 0;
    let totalYearlyExpenses = 0;
    let totalYearlyPaid = 0;
    let totalYearlyPending = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${targetYear}-${String(m).padStart(2, "0")}`;
      const isBeforeRegistration = monthStr < regMonthStr;
      const mBudget = budgetMap.get(monthStr);
      const effectiveSalary = isBeforeRegistration ? 0 : (mBudget?.scheduledSalaryAmount ?? defaultSalary);

      // Extra incomes for month
      const monthExtras = extraIncomes.filter(ei => ei.month === monthStr);
      const extraTotal = monthExtras.reduce((sum, item) => sum + item.amount, 0);
      const totalIncome = effectiveSalary + extraTotal;

      // Expenses for month (using UTC to match stored date exactly)
      const monthSlips = slips.filter(slip => {
        if (isBeforeRegistration && slip.isRecurring) return false;
        const d = new Date(slip.dueDate);
        return d.getUTCFullYear() === targetYear && d.getUTCMonth() + 1 === m;
      });

      let monthExpenses = 0;
      let monthPaid = 0;
      let monthPending = 0;
      let monthReserved = 0;

      const monthCategoryMap: Record<string, { name: string; color: string; total: number }> = {};

      for (const slip of monthSlips) {
        monthExpenses += slip.amount;
        if (slip.status === "PAGO") monthPaid += slip.amount;
        else if (slip.status === "RESERVADO") monthReserved += slip.amount;
        else monthPending += slip.amount;

        const catName = slip.category?.name || "Outros";
        const catColor = slip.category?.colorCode || "#7A4BE8";

        if (!monthCategoryMap[catName]) {
          monthCategoryMap[catName] = { name: catName, color: catColor, total: 0 };
        }
        monthCategoryMap[catName].total += slip.amount;

        // Yearly map
        if (!yearlyCategoryMap[catName]) {
          yearlyCategoryMap[catName] = { name: catName, color: catColor, total: 0, count: 0 };
        }
        yearlyCategoryMap[catName].total += slip.amount;
        yearlyCategoryMap[catName].count += 1;
      }

      const netBalance = totalIncome - monthExpenses;
      const savingsRate = totalIncome > 0 ? Math.round(((netBalance) / totalIncome) * 100) : 0;

      totalYearlyIncome += totalIncome;
      totalYearlyExpenses += monthExpenses;
      totalYearlyPaid += monthPaid;
      totalYearlyPending += (monthPending + monthReserved);

      monthlyData.push({
        month: monthStr,
        monthIndex: m,
        monthName: MONTH_NAMES[m - 1],
        shortName: MONTH_SHORT_NAMES[m - 1],
        salary: effectiveSalary,
        extraIncome: extraTotal,
        income: totalIncome,
        expenses: monthExpenses,
        paidExpenses: monthPaid,
        pendingExpenses: monthPending,
        reservedExpenses: monthReserved,
        unpaidExpenses: monthPending + monthReserved,
        netBalance,
        savingsRate,
        slipsCount: monthSlips.length,
        categories: Object.values(monthCategoryMap).sort((a, b) => b.total - a.total),
        slips: monthSlips.map(s => ({
          id: s.id,
          title: s.title,
          amount: s.amount,
          dueDate: s.dueDate,
          status: s.status,
          category: {
            name: s.category?.name || "Outros",
            color: s.category?.colorCode || "#7A4BE8",
          },
        })),
        extraIncomesList: monthExtras.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
        })),
      });
    }

    // 7. Multi-year overview to compare between years
    // Gather all distinct years from PaymentSlip & ExtraIncome
    const allSlipsDates = await prisma.paymentSlip.findMany({
      where: { userId },
      select: { dueDate: true, amount: true, status: true, isRecurring: true },
    });

    const allExtras = await prisma.extraIncome.findMany({
      where: { userId },
      select: { month: true, amount: true },
    });

    const allBudgets = await prisma.monthlyBudget.findMany({
      where: { userId },
      select: { month: true, scheduledSalaryAmount: true },
    });
    const allBudgetSalaryMap = new Map(allBudgets.map(b => [b.month, b.scheduledSalaryAmount]));

    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);
    yearsSet.add(targetYear);

    for (const s of allSlipsDates) {
      const d = new Date(s.dueDate);
      const mStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (mStr < regMonthStr && s.isRecurring) continue;
      yearsSet.add(d.getUTCFullYear());
    }
    for (const e of allExtras) {
      const y = parseInt(e.month.split("-")[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    }

    const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);

    const multiYearData = sortedYears.map(yr => {
      // Slips in yr (ignore recurring slips before registration month)
      const yrSlips = allSlipsDates.filter(s => {
        const d = new Date(s.dueDate);
        if (d.getUTCFullYear() !== yr) return false;
        const mStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (mStr < regMonthStr && s.isRecurring) return false;
        return true;
      });
      const yrExpenses = yrSlips.reduce((sum, s) => sum + s.amount, 0);
      const yrPaid = yrSlips.filter(s => s.status === "PAGO").reduce((sum, s) => sum + s.amount, 0);

      // Income in yr (12 months salary + extras, only from registration month onwards)
      let yrIncome = 0;
      for (let m = 1; m <= 12; m++) {
        const mKey = `${yr}-${String(m).padStart(2, "0")}`;
        if (mKey < regMonthStr) continue;
        const sAmount = allBudgetSalaryMap.get(mKey) ?? defaultSalary;
        yrIncome += sAmount;
      }
      const yrExtras = allExtras.filter(e => e.month.startsWith(`${yr}-`));
      const yrExtrasTotal = yrExtras.reduce((sum, e) => sum + e.amount, 0);
      yrIncome += yrExtrasTotal;

      const yrBalance = yrIncome - yrExpenses;
      const yrSavingsRate = yrIncome > 0 ? Math.round((yrBalance / yrIncome) * 100) : 0;

      return {
        year: yr,
        income: yrIncome,
        expenses: yrExpenses,
        paidExpenses: yrPaid,
        netBalance: yrBalance,
        savingsRate: yrSavingsRate,
        slipsCount: yrSlips.length,
      };
    });

    // 8. Find best and worst months for the selected year
    let bestSavingsMonth = monthlyData[0];
    let highestExpenseMonth = monthlyData[0];

    for (const md of monthlyData) {
      if (md.netBalance > bestSavingsMonth.netBalance) {
        bestSavingsMonth = md;
      }
      if (md.expenses > highestExpenseMonth.expenses) {
        highestExpenseMonth = md;
      }
    }

    const totalNetSavings = totalYearlyIncome - totalYearlyExpenses;
    const overallSavingsRate =
      totalYearlyIncome > 0 ? Math.round((totalNetSavings / totalYearlyIncome) * 100) : 0;

    const categoryDistribution = Object.values(yearlyCategoryMap)
      .map(cat => ({
        ...cat,
        percentage: totalYearlyExpenses > 0 ? Math.round((cat.total / totalYearlyExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      selectedYear: targetYear,
      availableYears: sortedYears,
      yearlyTotals: {
        totalIncome: totalYearlyIncome,
        totalExpenses: totalYearlyExpenses,
        totalPaid: totalYearlyPaid,
        totalPending: totalYearlyPending,
        totalSavings: totalNetSavings,
        avgMonthlyIncome: Math.round(totalYearlyIncome / 12),
        avgMonthlyExpense: Math.round(totalYearlyExpenses / 12),
        overallSavingsRate,
        bestMonth: {
          name: bestSavingsMonth.monthName,
          month: bestSavingsMonth.month,
          savings: bestSavingsMonth.netBalance,
        },
        highestExpenseMonth: {
          name: highestExpenseMonth.monthName,
          month: highestExpenseMonth.month,
          expenses: highestExpenseMonth.expenses,
        },
      },
      monthlyData,
      multiYearData,
      categoryDistribution,
    });
  } catch (error) {
    console.error("[GET /api/analytics]", error);
    return NextResponse.json(
      { error: "Falha ao gerar dados de análise financeira" },
      { status: 500 }
    );
  }
}
