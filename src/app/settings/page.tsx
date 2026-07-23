"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  DollarSign,
  Calendar,
  CreditCard,
  HeartHandshake,
  Percent,
  Tag,
  Save,
  CheckCircle2,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { playSound } from "@/lib/sounds";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import type { CategoryWithCount } from "@/lib/types";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { toasts, addToast, dismissToast } = useToasts();

  // General Stats / Budget parameters
  const [scheduledSalaryAmount, setScheduledSalaryAmount] = useState<string>("3000");
  const [salaryPaymentDay, setSalaryPaymentDay] = useState<string>("5");
  const [totalCreditLimit, setTotalCreditLimit] = useState<string>("1000");
  const [leisureBudget, setLeisureBudget] = useState<string>("300");
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<string>("50");

  // Category percentage limits
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [statsRes, catRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/categories"),
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setScheduledSalaryAmount(String(stats.scheduledSalaryAmount ?? 3000));
          setSalaryPaymentDay(String(stats.salaryPaymentDay ?? 5));
          setTotalCreditLimit(String(stats.totalCreditLimit ?? 1000));
          setLeisureBudget(String(stats.leisureBudget ?? 300));
          setMonthlyBudgetLimit(String(stats.monthlyBudgetLimit ?? 50));
        }

        if (catRes.ok) {
          const catData: CategoryWithCount[] = await catRes.json();
          setCategories(catData);

          const initialLimits: Record<string, string> = {};
          catData.forEach((cat) => {
            initialLimits[cat.id] = cat.budgetLimit ? String(cat.budgetLimit) : "";
          });
          setCategoryLimits(initialLimits);
        }
      } catch (err) {
        console.error("Erro ao carregar parâmetros:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const salaryNum = useMemo(() => {
    const parsed = parseFloat(scheduledSalaryAmount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [scheduledSalaryAmount]);

  // Total allocated percentage and R$ amount across categories
  const { totalPercentage, totalAllocatedAmount } = useMemo(() => {
    let pctSum = 0;
    Object.values(categoryLimits).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        pctSum += num;
      }
    });
    const amountSum = (salaryNum * pctSum) / 100;
    return { totalPercentage: pctSum, totalAllocatedAmount: amountSum };
  }, [categoryLimits, salaryNum]);

  function handleLimitChange(catId: string, value: string) {
    setCategoryLimits((prev) => ({ ...prev, [catId]: value }));
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Save general stats & leisure budget (using PUT or PATCH)
      const statsPayload = {
        scheduledSalaryAmount: parseFloat(scheduledSalaryAmount) || 3000,
        salaryPaymentDay: parseInt(salaryPaymentDay, 10) || 5,
        totalCreditLimit: parseFloat(totalCreditLimit) || 1000,
        leisureBudget: parseFloat(leisureBudget) || 300,
        monthlyBudgetLimit: parseFloat(monthlyBudgetLimit) || 50,
      };

      const statsRes = await fetch("/api/stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statsPayload),
      });

      if (!statsRes.ok) throw new Error("Erro ao salvar parâmetros gerais.");

      // Also sync leisure budget API route
      await fetch("/api/leisure-budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leisureBudget: parseFloat(leisureBudget) || 300 }),
      }).catch(() => {});

      // 2. Save category percentage limits
      const categoryLimitsPayload = Object.entries(categoryLimits).map(([id, val]) => ({
        id,
        budgetLimit: val && !isNaN(parseFloat(val)) && parseFloat(val) > 0 ? parseFloat(val) : null,
      }));

      const catRes = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryLimits: categoryLimitsPayload }),
      });

      if (!catRes.ok) throw new Error("Erro ao salvar limites das categorias.");

      playSound("add_expense");
      addToast({
        title: "Parâmetros Atualizados! ⚙️",
        message: "Todas as suas configurações e limites foram salvos com sucesso.",
        type: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Erro ao salvar",
        message: err.message || "Ocorreu um erro ao salvar suas alterações.",
        type: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Carregando seus parâmetros...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Celebration toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.titleWrapper}>
          <div className={styles.iconBadge}>
            <Sliders size={26} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Parâmetros do Sistema</h1>
            <p className={styles.pageSubtitle}>
              Configure orçamentos, salário agendado, cartões e porcentagem limite por categoria.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className={styles.topSaveBtn}
        >
          <Save size={18} />
          <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
        </button>
      </header>

      <form onSubmit={handleSaveAll} className={styles.formContent}>
        {/* Section 1: Orçamento e Parâmetros Gerais */}
        <section className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <DollarSign size={20} className="text-emerald-400" />
            <span>Orçamento Geral & Cartões</span>
          </h2>
          <p className={styles.sectionDesc}>
            Estes valores são usados para calcular o CapyScore, HP da capivara e orçamentos do mês.
          </p>

          <div className={styles.grid2}>
            {/* Salário Agendado */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <DollarSign size={15} /> Salário Agendado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                className={styles.input}
                value={scheduledSalaryAmount}
                onChange={(e) => setScheduledSalaryAmount(e.target.value)}
                placeholder="Ex: 3000.00"
                required
              />
              <span className={styles.fieldHint}>Renda mensal base configurada.</span>
            </div>

            {/* Dia do Pagamento */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Calendar size={15} /> Dia do Pagamento
              </label>
              <input
                type="number"
                min="1"
                max="31"
                className={styles.input}
                value={salaryPaymentDay}
                onChange={(e) => setSalaryPaymentDay(e.target.value)}
                placeholder="Ex: 5"
                required
              />
              <span className={styles.fieldHint}>Dia do mês em que você recebe o salário.</span>
            </div>

            {/* Limite do Cartão */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <CreditCard size={15} /> Limite do Cartão de Crédito (R$)
              </label>
              <input
                type="number"
                step="0.01"
                className={styles.input}
                value={totalCreditLimit}
                onChange={(e) => setTotalCreditLimit(e.target.value)}
                placeholder="Ex: 1000.00"
                required
              />
              <span className={styles.fieldHint}>Limite total somado de todos os seus cartões.</span>
            </div>

            {/* Teto HP Capivara */}
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                <Percent size={15} /> Teto HP Capivara (% Limite Geral de Gastos)
              </label>
              <div className={styles.rangeGroup}>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  className={styles.rangeInput}
                  value={monthlyBudgetLimit}
                  onChange={(e) => setMonthlyBudgetLimit(e.target.value)}
                />
                <span className={styles.rangeBadge}>{monthlyBudgetLimit}%</span>
              </div>
              <span className={styles.fieldHint}>
                Percentual do seu salário que define o teto máximo de despesas do mês antes da Capivara perder HP.
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Limites por Categoria (Porcentagem %) */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeaderFlex}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Tag size={20} className="text-purple-400" />
                <span>Limites por Categoria (%)</span>
              </h2>
              <p className={styles.sectionDesc}>
                Defina a porcentagem (%) do seu salário base (R$ {salaryNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) que será reservada para cada categoria.
              </p>
            </div>
          </div>

          {/* Allocation Summary Card */}
          <div className={styles.allocationSummaryCard}>
            <div className={styles.allocationHeader}>
              <div className={styles.allocationTitleGroup}>
                <PieChart size={18} className="text-purple-400" />
                <strong>Resumo da Alocação de Orçamento</strong>
              </div>
              <span
                className={`${styles.allocationBadge} ${
                  totalPercentage > 100 ? styles.allocationBadgeWarn : ""
                }`}
              >
                {totalPercentage.toFixed(1)}% do Salário Total
              </span>
            </div>

            <div className={styles.allocationProgressBarBg}>
              <div
                className={`${styles.allocationProgressBarFill} ${
                  totalPercentage > 100 ? styles.allocationBarFillWarn : ""
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>

            <div className={styles.allocationMetaRow}>
              <span>
                Total reservado:{" "}
                <strong className={styles.allocatedAmountText}>
                  {totalAllocatedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </span>
              <span>
                Salário Base:{" "}
                <strong>
                  {salaryNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </span>
            </div>

            {totalPercentage > 100 && (
              <div className={styles.warnBox}>
                <AlertTriangle size={15} />
                <span>Atenção: A soma dos limites das categorias ({totalPercentage.toFixed(1)}%) ultrapassa 100% do seu salário!</span>
              </div>
            )}
          </div>

          {/* Category Cards Grid */}
          <div className={styles.categoryGrid}>
            {categories.map((cat) => {
              const currentLimitStr = categoryLimits[cat.id] || "";
              const currentLimitPct = parseFloat(currentLimitStr);
              const hasLimit = !isNaN(currentLimitPct) && currentLimitPct > 0;
              const calculatedAmount = hasLimit ? (salaryNum * currentLimitPct) / 100 : 0;

              return (
                <div key={cat.id} className={styles.categoryCard}>
                  <div className={styles.categoryHeader}>
                    <div className={styles.categoryTitleRow}>
                      <span
                        className={styles.colorTag}
                        style={{ backgroundColor: cat.colorCode }}
                      />
                      <strong className={styles.categoryName}>{cat.name}</strong>
                    </div>
                    {hasLimit ? (
                      <span className={styles.limitBadgeActive}>
                        <CheckCircle2 size={12} /> {currentLimitPct}%
                      </span>
                    ) : (
                      <span className={styles.limitBadgeNone}>Livre</span>
                    )}
                  </div>

                  <div className={styles.categoryField}>
                    <label className={styles.catInputLabel}>Porcentagem (%):</label>
                    <div className={styles.pctInputWrap}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className={styles.categoryInput}
                        value={currentLimitStr}
                        onChange={(e) => handleLimitChange(cat.id, e.target.value)}
                        placeholder="Ex: 15"
                      />
                      <span className={styles.pctSymbol}>%</span>
                    </div>
                  </div>

                  {/* Calculated Amount Display */}
                  <div className={styles.calculatedBox}>
                    <span className={styles.calculatedLabel}>Orçamento Destinado:</span>
                    <strong className={hasLimit ? styles.calculatedValueActive : styles.calculatedValueNone}>
                      {hasLimit
                        ? calculatedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                        : "Sem limite"}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className={styles.bottomBar}>
          <button
            type="submit"
            disabled={saving}
            className={styles.mainSaveBtn}
          >
            <Save size={20} />
            <span>{saving ? "Salvando Parâmetros..." : "Salvar Todos os Parâmetros"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
