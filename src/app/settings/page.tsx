"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  DollarSign,
  HeartHandshake,
  Percent,
  Tag,
  Save,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eraser,
  X,
} from "lucide-react";
import { playSound } from "@/lib/sounds";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import type { CategoryWithCount } from "@/lib/types";
import styles from "./settings.module.css";

// ── Month helpers ──────────────────────────────────────────────────────────────
function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(ym: string, delta: number): string {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const { toasts, addToast, dismissToast } = useToasts();

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // General Stats / Budget parameters
  const [scheduledSalaryAmount, setScheduledSalaryAmount] = useState<string>("3000");
  const [leisureBudget, setLeisureBudget] = useState<string>("300");
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState<string>("50");

  // Category percentage limits
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [statsRes, catRes] = await Promise.all([
          fetch(`/api/stats?month=${selectedMonth}`),
          fetch(`/api/categories?month=${selectedMonth}`),
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setScheduledSalaryAmount(String(stats.scheduledSalaryAmount ?? 3000));
          setLeisureBudget(String(stats.leisureBudget ?? 300));
          setMonthlyBudgetLimit(String(stats.monthlyBudgetLimit ?? 50));
        }

        if (catRes.ok) {
          const catData: CategoryWithCount[] = await catRes.json();
          setCategories(catData);

          const initialLimits: Record<string, string> = {};
          catData.forEach((cat) => {
            initialLimits[cat.id] =
              cat.budgetLimit !== null && cat.budgetLimit !== undefined && cat.budgetLimit > 0
                ? String(cat.budgetLimit)
                : "";
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
  }, [selectedMonth]);

  const salaryNum = useMemo(() => {
    const clean = scheduledSalaryAmount.replace(",", ".");
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [scheduledSalaryAmount]);

  // Total allocated percentage and R$ amount across categories
  const { totalPercentage, totalAllocatedAmount } = useMemo(() => {
    let pctSum = 0;
    Object.values(categoryLimits).forEach((val) => {
      const clean = String(val).replace(",", ".");
      const num = parseFloat(clean);
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

  function handleClearCategoryLimits() {
    const cleared: Record<string, string> = {};
    categories.forEach((cat) => {
      cleared[cat.id] = "";
    });
    setCategoryLimits(cleared);
    playSound("toast_info");
    addToast({
      title: "Limites zerados! 🧹",
      message: "Todos os limites foram limpos na tela. Clique em Salvar para persistir.",
      type: "info",
    });
  }

  async function handleConfirmResetAll() {
    setResetting(true);
    try {
      const defaultSalary = 3000;
      const defaultMonthly = 50;
      const defaultLeisure = 0;

      // 1. Reset general stats
      const statsPayload = {
        scheduledSalaryAmount: defaultSalary,
        leisureBudget: defaultLeisure,
        monthlyBudgetLimit: defaultMonthly,
      };

      const statsRes = await fetch(`/api/stats?month=${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statsPayload),
      });

      if (!statsRes.ok) throw new Error("Erro ao redefinir parâmetros gerais.");

      // 2. Clear all category limits in DB
      const categoryLimitsPayload = categories.map((cat) => ({
        id: cat.id,
        budgetLimit: null,
      }));

      const catRes = await fetch(`/api/categories?month=${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryLimits: categoryLimitsPayload }),
      });

      if (!catRes.ok) throw new Error("Erro ao limpar limites das categorias.");

      // Update local state
      setScheduledSalaryAmount("3000");
      setLeisureBudget("0");
      setMonthlyBudgetLimit("50");

      const clearedLimits: Record<string, string> = {};
      categories.forEach((cat) => {
        clearedLimits[cat.id] = "";
      });
      setCategoryLimits(clearedLimits);
      setCategories((prev) => prev.map((cat) => ({ ...cat, budgetLimit: null })));

      setIsResetModalOpen(false);
      playSound("toast_info");
      addToast({
        title: "Parâmetros Redefinidos! 🧹",
        message: "Todos os parâmetros e limites de categoria foram limpos e salvos com sucesso.",
        type: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Erro ao resetar",
        message: err.message || "Não foi possível resetar os parâmetros.",
        type: "danger",
      });
    } finally {
      setResetting(false);
    }
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Save general stats & leisure budget (using PUT or PATCH)
      const pSalary = parseFloat(scheduledSalaryAmount.replace(",", "."));
      const pLeisure = parseFloat(leisureBudget.replace(",", "."));
      const pMonthly = parseFloat(monthlyBudgetLimit.replace(",", "."));

      const statsPayload = {
        scheduledSalaryAmount: isNaN(pSalary) ? 3000 : pSalary,
        leisureBudget: isNaN(pLeisure) ? 0 : pLeisure,
        monthlyBudgetLimit: isNaN(pMonthly) ? 50 : pMonthly,
      };

      const statsRes = await fetch(`/api/stats?month=${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(statsPayload),
      });

      if (!statsRes.ok) throw new Error("Erro ao salvar parâmetros gerais.");

      // 2. Save category percentage limits (handles all categories, proper comma parsing)
      const categoryLimitsPayload = categories.map((cat) => {
        const raw = categoryLimits[cat.id];
        if (!raw || String(raw).trim() === "") {
          return { id: cat.id, budgetLimit: null };
        }
        const clean = String(raw).replace(",", ".");
        const parsed = parseFloat(clean);
        return {
          id: cat.id,
          budgetLimit: !isNaN(parsed) && parsed > 0 ? parsed : null,
        };
      });

      const catRes = await fetch(`/api/categories?month=${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryLimits: categoryLimitsPayload }),
      });

      if (!catRes.ok) throw new Error("Erro ao salvar limites das categorias.");

      // Synchronize category state locally
      setCategories((prev) =>
        prev.map((cat) => {
          const matching = categoryLimitsPayload.find((p) => p.id === cat.id);
          return matching ? { ...cat, budgetLimit: matching.budgetLimit } : cat;
        })
      );

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

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setIsResetModalOpen(true)}
            title="Limpar e redefinir todos os parâmetros"
            aria-label="Limpar e redefinir todos os parâmetros"
          >
            <RotateCcw size={16} />
            <span>Limpar Parâmetros</span>
          </button>
        </div>
      </header>

      <div className={styles.monthNav} role="group" aria-label="Seletor de mês">
        <button
          type="button"
          className={styles.monthBtn}
          onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</span>
        <button
          type="button"
          className={styles.monthBtn}
          onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <form onSubmit={handleSaveAll} className={styles.formContent}>
        {/* Section 1: Orçamento e Parâmetros Gerais */}
        <section className={styles.cardSection}>
          <h2 className={styles.sectionTitle}>
            <DollarSign size={20} className="text-emerald-400" />
            <span>Orçamento Geral & Cartões</span>
          </h2>

          <div className={styles.grid2}>
            {/* Salário Agendado */}
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
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

            {/* Teto HP */}
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                <Percent size={15} /> Teto de Orçamento (% Limite Geral de Gastos)
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
                Percentual do seu salário que define o teto máximo de despesas do mês.
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
            <button
              type="button"
              className={styles.clearCatBtn}
              onClick={handleClearCategoryLimits}
              title="Limpar todos os campos de limite de categorias"
              aria-label="Limpar todos os limites de categorias"
            >
              <Eraser size={14} />
              <span>Zerar Limites</span>
            </button>
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
            aria-label="Salvar Todos os Parâmetros"
            title="Salvar Todos os Parâmetros"
          >
            {saving ? <div className={styles.spinnerSmall} /> : <Save size={24} />}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Resetting Parameters */}
      {isResetModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          onClick={() => {
            if (!resetting) setIsResetModalOpen(false);
          }}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalBadgeWarn}>
                <RotateCcw size={22} />
              </div>
              <div className={styles.modalHeaderInfo}>
                <h3 id="reset-modal-title" className={styles.modalTitle}>
                  Limpar e Redefinir Parâmetros?
                </h3>
                <p className={styles.modalSubtitle}>
                  Esta ação redefinirá os parâmetros do mês ({formatMonthLabel(selectedMonth)}).
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>Os seguintes valores padrão serão aplicados:</p>
              <ul className={styles.resetList}>
                <li>
                  <span className={styles.bullet}>•</span> Salário Agendado: <strong>R$ 3.000,00</strong>
                </li>
                <li>
                  <span className={styles.bullet}>•</span> Limite do Cartão: <strong>R$ 1.000,00</strong>
                </li>
                <li>
                  <span className={styles.bullet}>•</span> Teto de Orçamento: <strong>50%</strong>
                </li>
                <li>
                  <span className={styles.bullet}>•</span> Orçamento Lazer: <strong>R$ 0,00</strong>
                </li>
                <li>
                  <span className={styles.bullet}>•</span> Limites de Categorias: <strong className={styles.clearedHighlight}>Todos removidos (Livre)</strong>
                </li>
              </ul>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.modalConfirmBtn}
                onClick={handleConfirmResetAll}
                disabled={resetting}
              >
                {resetting ? (
                  <>
                    <div className={styles.spinnerSmall} />
                    <span>Limpando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={16} />
                    <span>Confirmar e Limpar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
