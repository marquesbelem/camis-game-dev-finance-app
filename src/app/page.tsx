"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, LayoutDashboard, ChevronLeft, ChevronRight, DollarSign, ShoppingBag, Settings, Trash2, X } from "lucide-react";
import { playSound } from "@/lib/sounds";
import AdicionarDespesa from "@/components/AdicionarDespesa/AdicionarDespesa";
import SettingsModal from "@/components/SettingsModal/SettingsModal";
import SpeedDialFab from "@/components/SpeedDialFab/SpeedDialFab";
import SlipItem, { Slip } from "@/components/SlipList/SlipItem";
import DashboardCharts from "@/components/DashboardCharts/DashboardCharts";
import SummaryCards from "@/components/DashboardCharts/SummaryCards";
import RecentExpensesWidget from "@/components/RecentExpensesWidget/RecentExpensesWidget";
import ExtraIncomesWidget from "@/components/ExtraIncomesWidget/ExtraIncomesWidget";
import CategoryBudgetWidget, { CategoryBudgetInfo } from "@/components/CategoryBudgetWidget/CategoryBudgetWidget";
import CategoryBudgetsSection from "@/components/CategoryBudgetWidget/CategoryBudgetsSection";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import FullScreenFeedback, { FeedbackType } from "@/components/FullScreenFeedback/FullScreenFeedback";
import type { CategoryWithCount } from "@/lib/types";
import styles from "./page.module.css";

// ── Month helpers ──────────────────────────────────────────────────────────────
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

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

interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [extraIncomes, setExtraIncomes] = useState<any[]>([]);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraIncomeAmount, setExtraIncomeAmount] = useState("");
  const [extraIncomeDesc, setExtraIncomeDesc] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("DUE_DATE");
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [salaryToCelebrate, setSalaryToCelebrate] = useState<{ amount: number; month: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);

  const { toasts, dismissToast, addToast, showXpToast, showLevelUpToast } = useToasts();

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadSlips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [slipsRes, statsRes, extraRes] = await Promise.all([
        fetch(`/api/slips?month=${selectedMonth}`),
        fetch(`/api/stats?month=${selectedMonth}`),
        fetch(`/api/extra-income?month=${selectedMonth}`),
      ]);
      const [slipsData, statsData, extraData] = await Promise.all([
        slipsRes.ok ? slipsRes.json().catch(() => []) : [],
        statsRes.ok ? statsRes.json().catch(() => ({})) : {},
        extraRes.ok ? extraRes.json().catch(() => []) : [],
      ]) as [any, any, any];
      setSlips(Array.isArray(slipsData) ? slipsData : []);
      setExtraIncomes(Array.isArray(extraData) ? extraData : []);
      setUserStats(statsData);
      const salary = statsData.scheduledSalaryAmount > 0 ? statsData.scheduledSalaryAmount : 3000.0;
      const budgetPct = statsData.monthlyBudgetLimit ?? 50.0;
      const calculatedBudget = salary * (budgetPct / 100);
      const totalExtra = Array.isArray(extraData) ? extraData.reduce((sum: number, inc: any) => sum + inc.amount, 0) : 0;
      setBudgetLimit(calculatedBudget + totalExtra);

      // Trigger retroactive salary received celebration if validated AND tutorial is completed
      if (statsData.celebrateSalary) {
        const isTutorialDone = typeof window !== "undefined" && localStorage.getItem("cami_tutorial_completed") === "true";
        if (isTutorialDone) {
          setSalaryToCelebrate({
            amount: statsData.scheduledSalaryAmount,
            month: formatMonthLabel(selectedMonth),
          });
        }
      }
    } catch {
      addToast({ title: "Erro", message: "Falha ao carregar despesas.", type: "danger" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth, addToast]);

  useEffect(() => {
    loadSlips();
  }, [loadSlips]);

  // ── Configured Category Budgets calculation for selected month ───────────
  const categoryBudgets: CategoryBudgetInfo[] = useMemo(() => {
    const salaryNum = userStats?.scheduledSalaryAmount > 0 ? userStats.scheduledSalaryAmount : 3000;

    return (categories as any[])
      .filter((cat) => cat.budgetLimit && Number(cat.budgetLimit) > 0)
      .map((cat) => {
        const budgetPct = Number(cat.budgetLimit);
        const budgetAmount = (salaryNum * budgetPct) / 100;

        const spentAmount = slips
          .filter((s) => s.categoryId === cat.id)
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const remainingAmount = budgetAmount - spentAmount;

        return {
          id: cat.id,
          name: cat.name,
          colorCode: cat.colorCode,
          iconRef: cat.iconRef,
          budgetLimitPct: budgetPct,
          budgetAmount,
          spentAmount,
          remainingAmount,
        };
      });
  }, [categories, slips, userStats]);

  // Re-check slips & salary celebration when tutorial completes
  useEffect(() => {
    function handleTutorialDone() {
      loadSlips(true);
    }
    window.addEventListener("tutorialCompleted", handleTutorialDone);
    return () => window.removeEventListener("tutorialCompleted", handleTutorialDone);
  }, [loadSlips]);

  // ── Native notifications verification for ALL slips & apartment expenses ──
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function checkUpcomingNotifications() {
      try {
        const res = await fetch("/api/slips");
        if (!res.ok) return;
        const allSlips: Slip[] = await res.json().catch(() => []);
        if (!Array.isArray(allSlips)) return;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        const tomorrowStr = `${yyyy}-${mm}-${dd}`;

        const upcoming = allSlips.filter((s) => {
          if (s.status !== "PENDENTE") return false;
          const dateStr = s.dueDate.slice(0, 10);
          return dateStr === tomorrowStr;
        });

        if (upcoming.length > 0) {
          const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
          const storageKey = `notified_expenses_${todayStr}`;
          const notifiedIdsRaw = localStorage.getItem(storageKey);
          const notifiedIds = notifiedIdsRaw ? JSON.parse(notifiedIdsRaw) : [];

          const toNotify = upcoming.filter((s) => !notifiedIds.includes(s.id));

          if (toNotify.length > 0) {
            const triggerNotifications = () => {
              if (toNotify.length === 1) {
                const slip = toNotify[0];
                const formattedAmount = slip.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                });
                new Notification("⚠️ Despesa Vencendo Amanhã!", {
                  body: `A despesa "${slip.title}" (${formattedAmount}) vence amanhã. Não se esqueça de pagar!`,
                  icon: "/favicon.ico",
                });
              } else {
                new Notification("⚠️ Despesas Vencendo Amanhã!", {
                  body: `Você tem ${toNotify.length} despesas vencendo amanhã. Toque para verificar seu painel!`,
                  icon: "/favicon.ico",
                });
              }

              const newNotifiedIds = [...notifiedIds, ...toNotify.map((s) => s.id)];
              localStorage.setItem(storageKey, JSON.stringify(newNotifiedIds));
            };

            if (Notification.permission === "default") {
              const permission = await Notification.requestPermission();
              if (permission === "granted") {
                triggerNotifications();
              }
            } else if (Notification.permission === "granted") {
              triggerNotifications();
            }
          }
        }
      } catch (err) {
        console.error("Erro ao verificar notificações:", err);
      }
    }

    checkUpcomingNotifications();
  }, [slips]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSave(saved: Slip) {
    setSlips((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    addToast({
      title: editingSlip ? "Despesa atualizada" : "Despesa adicionada",
      message: saved.title,
      type: "success",
    });

    // Award XP and show toasts if metadata exists
    const xpDetails = (saved as any).xpDetails;
    if (xpDetails) {
      showXpToast(
        xpDetails.xpGained,
        xpDetails.bonusAwarded
          ? `Bônus de consistência diária! Combo: ${xpDetails.streak} dias 🔥`
          : "Despesa registrada!"
      );
      if (xpDetails.leveledUp) {
        setTimeout(() => {
          showLevelUpToast(xpDetails.newLevel);
        }, 1200);
      }
    }
  }

  async function handleDelete(id: string, deleteAll?: boolean) {
    try {
      const deleted = slips.find((s) => s.id === id);
      if (deleteAll && deleted?.isRecurring) {
        try {
          await fetch(`/api/slips/recurring?id=${id}`, { method: "DELETE" });
        } catch (rErr) {
          console.error("Erro ao cancelar recorrência:", rErr);
        }
      }
      const url = `/api/slips/${id}${deleteAll ? "?deleteAll=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        let errMsg = "Não foi possível excluir a despesa.";
        try {
          const data = await res.json();
          if (data && data.error) errMsg = data.error;
        } catch {}
        addToast({ title: "Erro", message: errMsg, type: "danger" });
        return;
      }
      
      if (deleteAll && deleted?.isInstallment && deleted?.installmentGroupId) {
        setSlips((prev) =>
          prev.filter(
            (s) =>
              !(
                s.installmentGroupId === deleted.installmentGroupId &&
                (s.installmentNumber ?? 1) >= (deleted.installmentNumber ?? 1)
              )
          )
        );
      } else {
        setSlips((prev) => prev.filter((s) => s.id !== id));
      }

      if (deleted) {
        const msg = deleteAll ? `${deleted.title} (e parcelas futuras)` : deleted.title;
        addToast({ title: "Despesa excluída", message: msg, type: "info" });
      }
    } catch (err) {
      console.error("Erro ao excluir despesa:", err);
      addToast({ title: "Erro", message: "Erro de conexão ao excluir despesa.", type: "danger" });
    }
  }

  async function handleStatusToggle(slip: Slip) {
    if (toggling[slip.id]) return; // debounce

    const newStatus = slip.status === "PAGO" ? "PENDENTE" : "PAGO";
    const previous = slips;

    // 1. Optimistic update
    setToggling((t) => ({ ...t, [slip.id]: true }));
    setSlips((prev) =>
      prev.map((s) => (s.id === slip.id ? { ...s, status: newStatus } : s))
    );

    if (newStatus === "PAGO") {
      setFeedbackType("paid");
    }

    try {
      // 2. Server confirm
      const form = new FormData();
      form.append("status", newStatus);
      const res = await fetch(`/api/slips/${slip.id}`, { method: "PUT", body: form });
      if (!res.ok) throw new Error("toggle failed");
      const updated: Slip = await res.json();

      // 3. Replace optimistic slip with server response
      setSlips((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

      // Check XP metadata for debit/PIX payment
      const xpDetails = (updated as any).xpDetails;
      if (xpDetails) {
        showXpToast(xpDetails.xpGained, "Despesa paga no Débito ou PIX!");
        if (xpDetails.leveledUp) {
          setTimeout(() => {
            showLevelUpToast(xpDetails.newLevel);
          }, 1200);
        }
      }
    } catch {
      // 4. Rollback on error
      setSlips(previous);
      addToast({
        title: "Erro",
        message: "Não foi possível atualizar o status.",
        type: "danger",
      });
    } finally {
      setToggling((t) => {
        const copy = { ...t };
        delete copy[slip.id];
        return copy;
      });
    }
  }

  function openEdit(slip: Slip) {
    setEditingSlip(slip);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingSlip(null);
  }

  async function handleAddExtraIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!extraIncomeAmount || parseFloat(extraIncomeAmount) <= 0) return;

    try {
      const res = await fetch("/api/extra-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(extraIncomeAmount),
          description: extraIncomeDesc.trim() || "Receita Extra",
          month: selectedMonth,
        }),
      });

      const newIncome = await res.json();
      setExtraIncomes((prev) => [newIncome, ...prev]);
      setIsExtraModalOpen(false);
      setExtraIncomeAmount("");
      setExtraIncomeDesc("");
      setFeedbackType("income");

      addToast({
        title: "Bônus Adicionado! 💖",
        message: `Renda extra de ${parseFloat(extraIncomeAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionada ao orçamento!`,
        type: "success",
      });

      playSound("add_expense");
      loadSlips(true);
    } catch (err: any) {
      addToast({
        title: "Erro",
        message: err.message || "Não foi possível registrar a receita extra.",
        type: "danger",
      });
    }
  }

  async function handleDeleteExtraIncome(id: string) {
    try {
      const res = await fetch(`/api/extra-income/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao remover receita extra.");
      }

      addToast({
        title: "Receita Removida 🗑️",
        message: "A receita extra foi excluída.",
        type: "info",
      });

      playSound("toast_danger");
      loadSlips();
    } catch (err: any) {
      addToast({
        title: "Erro",
        message: err.message || "Não foi possível remover a receita extra.",
        type: "danger",
      });
    }
  }

  // Filter and sort slips based on user settings

  const filteredAndSorted = useMemo(() => {
    let result = [...slips];

    // 1. Filter by category
    if (filterCategoryId !== "ALL") {
      result = result.filter((slip) => slip.categoryId === filterCategoryId);
    }

    // 2. Filter by status
    if (filterStatus !== "ALL") {
      result = result.filter((slip) => slip.status === filterStatus);
    }

    // 3. Sort
    const now = new Date();
    if (sortBy === "STATUS") {
      result.sort((a, b) => {
        // PENDENTE first, then PAGO
        if (a.status === "PENDENTE" && b.status === "PAGO") return -1;
        if (a.status === "PAGO" && b.status === "PENDENTE") return 1;
        
        // If same status, sort by due date asc
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else {
      // Default: Group overdue first, then sort by due date asc
      result.sort((a, b) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const aOverdue = a.status !== "PAGO" && a.dueDate.slice(0, 10) < todayStr;
        const bOverdue = b.status !== "PAGO" && b.dueDate.slice(0, 10) < todayStr;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return a.dueDate.slice(0, 10).localeCompare(b.dueDate.slice(0, 10));
      });
    }

    return result;
  }, [slips, filterCategoryId, filterStatus, sortBy]);

  return (
    <>
      <div className={styles.container}>
        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className={styles.main} id="main-content">
          {/* Header */}
          <header className={styles.header}>
            {/* Month selector */}
            <div className={styles.monthNav} role="group" aria-label="Seletor de mês">
              <button
                id="prev-month-btn"
                className={styles.monthBtn}
                onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <span className={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</span>
              <button
                id="next-month-btn"
                className={styles.monthBtn}
                onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className={styles.headerRightActions}>
              <button
                id="add-slip-btn"
                className={styles.addBtn}
                onClick={() => { setEditingSlip(null); setIsFormOpen(true); }}
                aria-label="Adicionar despesa"
              >
                <Plus size={18} />
                <span>Adicionar Despesa</span>
              </button>
            </div>
          </header>

          {/* ① Summary Cards – most important */}
          <section id="summary-cards-section" aria-label="Resumo financeiro do mês">
            <SummaryCards slips={slips} budgetLimit={budgetLimit} loading={loading} />
          </section>

          {/* ② Mapa de Dano – gamified category breakdown */}
          <section aria-label="Gastos por categoria">
            <DashboardCharts slips={slips} />
          </section>

          {/* ③ Orçamentos por Categoria (Sessão minimizável como o Mapa de Dano) */}
          <CategoryBudgetsSection categoryBudgets={categoryBudgets} />

          {/* ④ Recent Expenses */}
          <RecentExpensesWidget
            slips={slips}
            onStatusToggle={handleStatusToggle}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* ⑤ Extra Incomes Widget (Directly below Recent Expenses) */}
          <ExtraIncomesWidget
            incomes={extraIncomes}
            onDelete={handleDeleteExtraIncome}
            onAddIncome={() => setIsExtraModalOpen(true)}
          />

        </main>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <AdicionarDespesa
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={(saved) => {
          if (saved.isInstallment || editingSlip?.isInstallment) {
            loadSlips();
            addToast({
              title: editingSlip ? "Parcelamento atualizado" : "Parcelamento adicionado",
              message: saved.title,
              type: "success",
            });
          } else {
            handleSave(saved);
          }
        }}
        editingSlip={editingSlip}
        targetMonth={selectedMonth}
      />

      {/* ── Collapsible Speed Dial FAB ───────────────────────────────── */}
      <SpeedDialFab
        onAddExpense={() => { setEditingSlip(null); setIsFormOpen(true); }}
        onAddIncome={() => setIsExtraModalOpen(true)}
      />

      {/* ── Extra Income Modal ────────────────────────────────────────── */}
      {isExtraModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsExtraModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>✨ Adicionar Receita Extra</h3>

            <form onSubmit={handleAddExtraIncome}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Descrição (opcional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={extraIncomeDesc}
                  onChange={(e) => setExtraIncomeDesc(e.target.value)}
                  placeholder="Ex: Freela, Bônus, Venda de item"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Valor da Receita (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={extraIncomeAmount}
                  onChange={(e) => setExtraIncomeAmount(e.target.value)}
                  placeholder="Ex: 500,00"
                  required
                  autoFocus
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setIsExtraModalOpen(false);
                    setExtraIncomeAmount("");
                    setExtraIncomeDesc("");
                  }}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn}>
                  + Adicionar Bônus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast notifications & Salary Modal ────────────────────────────── */}
      <Celebration
        toasts={toasts}
        onDismiss={dismissToast}
        salaryToCelebrate={salaryToCelebrate}
        onDismissSalary={() => setSalaryToCelebrate(null)}
      />

      {/* ── Full Screen Visual Feedback Overlay ────────────────────────────── */}
      <FullScreenFeedback
        type={feedbackType}
        onComplete={() => setFeedbackType(null)}
      />
    </>
  );
}
