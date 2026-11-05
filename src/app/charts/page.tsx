"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  Receipt,
  ExternalLink,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import styles from "./page.module.css";

// ── Types ────────────────────────────────────────────────────────────────────
interface MonthCategory {
  name: string;
  color: string;
  total: number;
}

interface MonthSlip {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
  category: {
    name: string;
    color: string;
  };
}

interface MonthExtraIncome {
  id: string;
  description: string;
  amount: number;
}

interface MonthlyData {
  month: string;
  monthIndex: number;
  monthName: string;
  shortName: string;
  salary: number;
  extraIncome: number;
  income: number;
  expenses: number;
  paidExpenses: number;
  pendingExpenses: number;
  reservedExpenses: number;
  netBalance: number;
  savingsRate: number;
  slipsCount: number;
  categories: MonthCategory[];
  slips?: MonthSlip[];
  extraIncomesList?: MonthExtraIncome[];
}

interface MultiYearData {
  year: number;
  income: number;
  expenses: number;
  paidExpenses: number;
  netBalance: number;
  savingsRate: number;
  slipsCount: number;
}

interface CategoryDistItem {
  name: string;
  color: string;
  total: number;
  count: number;
  percentage: number;
  slips?: MonthSlip[];
}

interface AnalyticsData {
  selectedYear: number;
  availableYears: number[];
  yearlyTotals: {
    totalIncome: number;
    totalExpenses: number;
    totalPaid: number;
    totalPending: number;
    totalSavings: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
    overallSavingsRate: number;
    bestMonth: { name: string; month: string; savings: number };
    highestExpenseMonth: { name: string; month: string; expenses: number };
  };
  monthlyData: MonthlyData[];
  multiYearData: MultiYearData[];
  categoryDistribution: CategoryDistItem[];
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function ChartsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth(); // 0-11

  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [viewMode, setViewMode] = useState<"MONTHLY" | "YEARLY" | "ACCUMULATED">("MONTHLY");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(currentMonthIdx);
  const [catScope, setCatScope] = useState<"MONTH" | "YEAR">("MONTH");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Client hydration flag
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async (year: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?year=${year}`);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear, loadData]);

  // Accumulated balance series
  const accumulatedData = useMemo(() => {
    if (!data?.monthlyData) return [];
    let acc = 0;
    return data.monthlyData.map(m => {
      acc += m.netBalance;
      return {
        ...m,
        accumulatedBalance: acc,
      };
    });
  }, [data]);

  // Active month data for drilldown
  const activeMonthData = useMemo(() => {
    if (!data?.monthlyData) return null;
    return data.monthlyData[selectedMonthIdx] || data.monthlyData[0];
  }, [data, selectedMonthIdx]);

  // Active category distribution based on scope toggle ("MONTH" vs "YEAR")
  const activeCategoryDist = useMemo(() => {
    if (catScope === "YEAR") {
      return (data?.categoryDistribution ?? []).map(cat => ({
        ...cat,
        slips: [] as MonthSlip[],
      }));
    }
    // Scope is MONTH
    if (!activeMonthData?.categories) return [];
    const totalExp = activeMonthData.expenses;
    return activeMonthData.categories.map(c => {
      const catSlips = activeMonthData.slips?.filter(s => s.category?.name === c.name) || [];
      return {
        name: c.name,
        color: c.color,
        total: c.total,
        count: catSlips.length,
        percentage: totalExp > 0 ? Math.round((c.total / totalExp) * 100) : 0,
        slips: catSlips,
      };
    });
  }, [catScope, data, activeMonthData]);

  // Capivara insight message generator
  const capyInsight = useMemo(() => {
    if (!activeMonthData) return { title: "Dados carregando...", text: "", emoji: "🦫" };
    const { netBalance, savingsRate, expenses, income } = activeMonthData;

    if (expenses === 0 && income === 0) {
      return {
        title: "Mês sem movimentações",
        text: "Nenhuma receita ou despesa registrada para este mês ainda.",
        emoji: "💤",
      };
    }
    if (netBalance > 0 && savingsRate >= 30) {
      return {
        title: "Capivara Campeã da Poupança! 🏆",
        text: `Você economizou ${savingsRate}% da sua renda (${formatCurrency(netBalance)}). Parabéns pela excelente disciplina financeira!`,
        emoji: "🦫✨",
      };
    }
    if (netBalance > 0) {
      return {
        title: "Saldo Positivo! 📈",
        text: `Você encerrou o mês com ${formatCurrency(netBalance)} de economia (${savingsRate}% das receitas). Bom trabalho!`,
        emoji: "🌿",
      };
    }
    if (netBalance === 0) {
      return {
        title: "Equilíbrio Total ⚖️",
        text: "Suas receitas e despesas foram exatamente iguais neste mês. Tente criar uma margem de reserva.",
        emoji: "⚖️",
      };
    }
    return {
      title: "Alerta de Gastos Superiores ⚠️",
      text: `Neste mês as despesas superaram as receitas em ${formatCurrency(Math.abs(netBalance))}. Verifique as categorias com maior peso para ajustar o orçamento.`,
      emoji: "🚨",
    };
  }, [activeMonthData]);

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipTitle}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className={styles.tooltipRow}>
              <span>
                <span className={styles.tooltipDot} style={{ background: entry.color }} />
                {entry.name}:
              </span>
              <span className={styles.tooltipValue}>
                {formatCurrency(Number(entry.value))}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const displayYear = data?.selectedYear ?? selectedYear;

  return (
    <main className={styles.container}>
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backBtn} aria-label="Voltar para a página inicial">
            <ArrowLeft size={18} />
          </Link>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>📊</span>
              <h1 className={styles.title}>Análise & Gráficos</h1>
            </div>
            <p className={styles.subtitle}>
              Acompanhe a relação entre suas receitas e despesas ao longo do tempo
            </p>
          </div>
        </div>

        {/* Year Navigator (Exact Dashboard monthNav pattern) */}
        <div className={styles.headerControls}>
          <div className={styles.yearNav} role="group" aria-label="Seletor de ano">
            <button
              id="prev-year-btn"
              type="button"
              className={styles.yearBtn}
              onClick={() => setSelectedYear(y => y - 1)}
              aria-label="Ano anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className={styles.yearLabel}>{displayYear}</span>
            <button
              id="next-year-btn"
              type="button"
              className={styles.yearBtn}
              onClick={() => setSelectedYear(y => y + 1)}
              aria-label="Próximo ano"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Loading State ───────────────────────────────────────────────────── */}
      {loading && !data ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>Calculando balanço e despesas...</p>
        </div>
      ) : (
        <>
          {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
          {data && (
            <section className={styles.kpiGrid} aria-label="Métricas Principais">
              {/* Receitas Totais */}
              <div
                className={styles.kpiCard}
                style={{ "--kpi-accent": "#22c55e", "--kpi-bg": "rgba(34, 197, 94, 0.12)" } as any}
              >
                <div className={styles.kpiCardTop}>
                  <span className={styles.kpiLabel}>Receitas ({displayYear})</span>
                  <div className={styles.kpiIconWrapper}>
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {formatCurrency(data.yearlyTotals.totalIncome)}
                </div>
                <div className={styles.kpiSubtext}>
                  <span>Média:</span>
                  <span className={styles.kpiBadgeSuccess}>
                    {formatCurrency(data.yearlyTotals.avgMonthlyIncome)}/mês
                  </span>
                </div>
              </div>

              {/* Despesas Totais */}
              <div
                className={styles.kpiCard}
                style={{ "--kpi-accent": "#ef4444", "--kpi-bg": "rgba(239, 68, 68, 0.12)" } as any}
              >
                <div className={styles.kpiCardTop}>
                  <span className={styles.kpiLabel}>Despesas ({displayYear})</span>
                  <div className={styles.kpiIconWrapper}>
                    <TrendingDown size={16} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {formatCurrency(data.yearlyTotals.totalExpenses)}
                </div>
                <div className={styles.kpiSubtext}>
                  <span>Média:</span>
                  <span className={styles.kpiBadgeDanger}>
                    {formatCurrency(data.yearlyTotals.avgMonthlyExpense)}/mês
                  </span>
                </div>
              </div>

              {/* Saldo Líquido Anual */}
              <div
                className={styles.kpiCard}
                style={{
                  "--kpi-accent": data.yearlyTotals.totalSavings >= 0 ? "#7A4BE8" : "#f59e0b",
                  "--kpi-bg":
                    data.yearlyTotals.totalSavings >= 0
                      ? "rgba(122, 75, 232, 0.15)"
                      : "rgba(245, 158, 11, 0.15)",
                } as any}
              >
                <div className={styles.kpiCardTop}>
                  <span className={styles.kpiLabel}>Saldo Acumulado</span>
                  <div className={styles.kpiIconWrapper}>
                    <Wallet size={16} />
                  </div>
                </div>
                <div
                  className={styles.kpiValue}
                  style={{
                    color:
                      data.yearlyTotals.totalSavings >= 0
                        ? "var(--color-text-primary)"
                        : "var(--color-danger)",
                  }}
                >
                  {formatCurrency(data.yearlyTotals.totalSavings)}
                </div>
                <div className={styles.kpiSubtext}>
                  {data.yearlyTotals.totalSavings >= 0 ? (
                    <span className={styles.kpiBadgeSuccess}>Superávit anual</span>
                  ) : (
                    <span className={styles.kpiBadgeDanger}>Déficit acumulado</span>
                  )}
                </div>
              </div>

              {/* Taxa de Poupança */}
              <div
                className={styles.kpiCard}
                style={{ "--kpi-accent": "#22d3ee", "--kpi-bg": "rgba(34, 211, 238, 0.12)" } as any}
              >
                <div className={styles.kpiCardTop}>
                  <span className={styles.kpiLabel}>Taxa de Poupança</span>
                  <div className={styles.kpiIconWrapper}>
                    <PiggyBank size={16} />
                  </div>
                </div>
                <div className={styles.kpiValue}>
                  {data.yearlyTotals.overallSavingsRate}%
                </div>
                <div className={styles.kpiSubtext}>
                  <span>Melhor mês:</span>
                  <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    {data.yearlyTotals.bestMonth.name}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ── View Switcher Controls (Responsive) ───────────────────────────── */}
          <section className={styles.viewControlsRow}>
            <div className={styles.tabPills} role="tablist" aria-label="Modo de visualização">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "MONTHLY"}
                className={`${styles.tabBtn} ${viewMode === "MONTHLY" ? styles.tabBtnActive : ""}`}
                onClick={() => setViewMode("MONTHLY")}
              >
                <span className={styles.tabLabelFull}>Visão Anual (Mês a Mês)</span>
                <span className={styles.tabLabelShort}>Mês a Mês</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "ACCUMULATED"}
                className={`${styles.tabBtn} ${viewMode === "ACCUMULATED" ? styles.tabBtnActive : ""}`}
                onClick={() => setViewMode("ACCUMULATED")}
              >
                <span className={styles.tabLabelFull}>Evolução do Saldo</span>
                <span className={styles.tabLabelShort}>Evolução</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "YEARLY"}
                className={`${styles.tabBtn} ${viewMode === "YEARLY" ? styles.tabBtnActive : ""}`}
                onClick={() => setViewMode("YEARLY")}
              >
                <span className={styles.tabLabelFull}>Comparativo Entre Anos</span>
                <span className={styles.tabLabelShort}>Entre Anos</span>
              </button>
            </div>

            <div className={styles.legendBar}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#22c55e" }} />
                <span>Receitas</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                <span>Despesas</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: "#8F6BF0" }} />
                <span>Saldo</span>
              </div>
            </div>
          </section>

          {/* ── Main Dynamic Visual Chart ────────────────────────────────────── */}
          <section className={styles.chartCard}>
            <div className={styles.chartCardHeader}>
              <div>
                <h2 className={styles.chartTitle}>
                  {viewMode === "MONTHLY" && `Balanço Mensal de ${displayYear}`}
                  {viewMode === "ACCUMULATED" && `Evolução do Patrimônio Acumulado em ${displayYear}`}
                  {viewMode === "YEARLY" && "Comparativo Histórico Anual"}
                </h2>
                <p className={styles.chartSubtitle}>
                  {viewMode === "MONTHLY" && "Barras comparativas de entradas, saídas e linha de saldo líquido por mês"}
                  {viewMode === "ACCUMULATED" && "Curva de crescimento e saldo líquido acumulado ao longo dos 12 meses"}
                  {viewMode === "YEARLY" && "Totais consolidados de receitas versus despesas de cada ano"}
                </p>
              </div>
            </div>

            <div className={styles.chartContainer}>
              {mounted && data && (
                <ResponsiveContainer width="100%" height="100%">
                  {viewMode === "MONTHLY" ? (
                    <ComposedChart
                      data={data.monthlyData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="shortName"
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--color-text-tertiary)"
                        fontSize={11}
                        tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="income"
                        name="Receitas"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Despesas"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Line
                        type="monotone"
                        dataKey="netBalance"
                        name="Saldo Líquido"
                        stroke="#8F6BF0"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#8F6BF0" }}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  ) : viewMode === "ACCUMULATED" ? (
                    <AreaChart
                      data={accumulatedData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7A4BE8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7A4BE8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="shortName"
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--color-text-tertiary)"
                        fontSize={11}
                        tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="accumulatedBalance"
                        name="Saldo Acumulado"
                        stroke="#7A4BE8"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#balanceGlow)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={data.multiYearData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="year"
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="var(--color-text-tertiary)"
                        fontSize={11}
                        tickFormatter={(v: number) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="income"
                        name="Receitas"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Despesas"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* ── Month Carousel / Selector Pills ───────────────────────────────── */}
          <div className={styles.monthSelectorScroll} role="tablist" aria-label="Seletor de meses">
            {data?.monthlyData.map((m, idx) => {
              const isActive = selectedMonthIdx === idx;
              const isPositive = m.netBalance >= 0;
              return (
                <button
                  key={m.month}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.monthPill} ${isActive ? styles.monthPillActive : ""}`}
                  onClick={() => setSelectedMonthIdx(idx)}
                >
                  <span>{m.shortName}</span>
                  <span
                    className={styles.pillDot}
                    style={{ background: isPositive ? "#22c55e" : "#ef4444" }}
                    title={isPositive ? "Saldo positivo" : "Despesas superiores"}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Secondary Cards: Details & Category Breakdown ───────────────── */}
          <div className={styles.bottomGrid}>
            {/* Detailed Monthly Focus */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h3 className={styles.sideCardTitle}>
                  <Calendar size={18} color="var(--color-brand)" />
                  Detalhamento: {activeMonthData?.monthName} de {displayYear}
                </h3>
              </div>

              {activeMonthData && (
                <div className={styles.drilldownContent}>
                  <div className={styles.drilldownHeader}>
                    <div>
                      <span className={styles.kpiLabel}>Balanço do Mês</span>
                      <h4 className={styles.drilldownMonthName}>
                        {formatCurrency(activeMonthData.netBalance)}
                      </h4>
                    </div>
                    <span
                      className={`${styles.drilldownBadge} ${
                        activeMonthData.netBalance >= 0 ? styles.badgeSurplus : styles.badgeDeficit
                      }`}
                    >
                      {activeMonthData.netBalance >= 0
                        ? `Poupança: ${activeMonthData.savingsRate}%`
                        : "Déficit no Mês"}
                    </span>
                  </div>

                  {/* Metric Rows */}
                  <div className={styles.metricRows}>
                    {/* Receitas */}
                    <div className={styles.metricRowItem}>
                      <div className={styles.metricRowLeft}>
                        <span className={styles.metricRowTitle}>Receitas Totais</span>
                        <span className={styles.metricRowSub}>
                          Salário: {formatCurrency(activeMonthData.salary)}
                          {activeMonthData.extraIncome > 0 &&
                            ` + Renda Extra: ${formatCurrency(activeMonthData.extraIncome)}`}
                        </span>
                      </div>
                      <span className={styles.metricRowValue} style={{ color: "#22c55e" }}>
                        +{formatCurrency(activeMonthData.income)}
                      </span>
                    </div>

                    {/* Despesas */}
                    <div className={styles.metricRowItem}>
                      <div className={styles.metricRowLeft}>
                        <span className={styles.metricRowTitle}>Despesas Totais</span>
                        <span className={styles.metricRowSub}>
                          {activeMonthData.slipsCount} despesas registradas
                        </span>
                      </div>
                      <span className={styles.metricRowValue} style={{ color: "#ef4444" }}>
                        -{formatCurrency(activeMonthData.expenses)}
                      </span>
                    </div>

                    {/* Status das Contas */}
                    <div className={styles.metricRowItem}>
                      <div className={styles.metricRowLeft}>
                        <span className={styles.metricRowTitle}>Status das Contas</span>
                        <span className={styles.metricRowSub}>
                          Pagas: {formatCurrency(activeMonthData.paidExpenses)}
                          {activeMonthData.reservedExpenses > 0 && (
                            <> · Reservadas: {formatCurrency(activeMonthData.reservedExpenses)}</>
                          )}
                          {" · Pendentes: "}{formatCurrency(activeMonthData.pendingExpenses)}
                        </span>
                      </div>
                      <span className={styles.metricRowValue} style={{ color: "var(--color-text-secondary)" }}>
                        {activeMonthData.pendingExpenses === 0 && activeMonthData.reservedExpenses === 0 && activeMonthData.expenses > 0
                          ? "Tudo Pago! ✅"
                          : `${Math.round(
                              activeMonthData.expenses > 0
                                ? (activeMonthData.paidExpenses / activeMonthData.expenses) * 100
                                : 100
                            )}% quitado`}
                      </span>
                    </div>
                  </div>

                  {/* Gamified Capivara Insight */}
                  <div className={styles.capyInsightBox}>
                    <span className={styles.capyEmoji}>{capyInsight.emoji}</span>
                    <div>
                      <p className={styles.capyInsightTitle}>{capyInsight.title}</p>
                      <p className={styles.capyInsightText}>{capyInsight.text}</p>
                    </div>
                  </div>

                  {/* Rendas Extras if any */}
                  {activeMonthData.extraIncomesList && activeMonthData.extraIncomesList.length > 0 && (
                    <div className={styles.slipsBreakdownSection}>
                      <div className={styles.slipsBreakdownHeader}>
                        <span className={styles.slipsBreakdownTitle}>
                          Rendas Extras ({activeMonthData.extraIncomesList.length})
                        </span>
                      </div>
                      <ul className={styles.slipsList}>
                        {activeMonthData.extraIncomesList.map(extra => (
                          <li key={extra.id} className={styles.slipItem}>
                            <div className={styles.slipLeft}>
                              <span
                                className={styles.slipCategoryPill}
                                style={{ background: "#22c55e" }}
                              />
                              <span className={styles.slipTitle}>{extra.description}</span>
                            </div>
                            <span className={styles.slipAmount} style={{ color: "#22c55e" }}>
                              +{formatCurrency(extra.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category Expense Distribution */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h3 className={styles.sideCardTitle}>
                  <PieIcon size={18} color="var(--color-brand)" />
                  Distribuição por Categorias
                </h3>
                <div className={styles.subPills}>
                  <button
                    type="button"
                    className={`${styles.subPillBtn} ${catScope === "MONTH" ? styles.subPillBtnActive : ""}`}
                    onClick={() => {
                      setCatScope("MONTH");
                      setExpandedCategory(null);
                    }}
                  >
                    Este Mês
                  </button>
                  <button
                    type="button"
                    className={`${styles.subPillBtn} ${catScope === "YEAR" ? styles.subPillBtnActive : ""}`}
                    onClick={() => {
                      setCatScope("YEAR");
                      setExpandedCategory(null);
                    }}
                  >
                    Ano {displayYear}
                  </button>
                </div>
              </div>

              {activeCategoryDist.length > 0 ? (
                <>
                  <div className={styles.donutWrapper}>
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activeCategoryDist}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {activeCategoryDist.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <ul className={styles.categoryList}>
                    {activeCategoryDist.map(cat => (
                      <li key={cat.name} className={styles.categoryItemWrapper}>
                        <div className={styles.categoryItemBtn} style={{ cursor: "default" }}>
                          <div className={styles.catLeft}>
                            <span className={styles.catIndicator} style={{ background: cat.color }} />
                            <span className={styles.catName}>{cat.name}</span>
                            {cat.count > 0 && (
                              <span className={styles.catCountBadge}>
                                {cat.count} {cat.count === 1 ? "despesa" : "despesas"}
                              </span>
                            )}
                          </div>
                          <div className={styles.catRight}>
                            <span className={styles.catPct}>{cat.percentage}%</span>
                            <span className={styles.catVal}>{formatCurrency(cat.total)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-tertiary)" }}>
                  <p>
                    Nenhuma despesa categorizada encontrada em{" "}
                    {catScope === "MONTH" ? activeMonthData?.monthName : displayYear}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
