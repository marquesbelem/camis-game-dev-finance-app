"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, LayoutDashboard, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import AdicionarDespesa from "@/components/AdicionarDespesa/AdicionarDespesa";
import SlipItem, { Slip } from "@/components/SlipList/SlipItem";
import DashboardCharts from "@/components/DashboardCharts/DashboardCharts";
import SummaryCards from "@/components/DashboardCharts/SummaryCards";
import AchievementsPanel from "@/components/Achievements/AchievementsPanel";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import LeisureBudgetCard from "@/components/LeisureBudgetCard/LeisureBudgetCard";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("DUE_DATE");
  const [budgetLimit, setBudgetLimit] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [salaryToCelebrate, setSalaryToCelebrate] = useState<{ amount: number; month: string } | null>(null);
  const [leisureData, setLeisureData] = useState<any>(null);
  const [leisureLoading, setLeisureLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, dismissToast, celebrateAchievement, addToast, showXpToast, showLevelUpToast } = useToasts();

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadSlips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [slipsRes, statsRes, extraRes] = await Promise.all([
        fetch(`/api/slips?month=${selectedMonth}`),
        fetch("/api/stats"),
        fetch(`/api/extra-income?month=${selectedMonth}`),
      ]);
      const [slipsData, statsData, extraData] = await Promise.all([
        slipsRes.json(),
        statsRes.json(),
        extraRes.json(),
      ]);
      setSlips(slipsData);
      setExtraIncomes(extraData);
      const salary = statsData.scheduledSalaryAmount > 0 ? statsData.scheduledSalaryAmount : 3000.0;
      const budgetPct = statsData.monthlyBudgetLimit ?? 50.0;
      const calculatedBudget = salary * (budgetPct / 100);
      const totalExtra = extraData.reduce((sum: number, inc: any) => sum + inc.amount, 0);
      setBudgetLimit(calculatedBudget + totalExtra);

      // Trigger retroactive salary received celebration if validated
      if (statsData.celebrateSalary) {
        setSalaryToCelebrate({
          amount: statsData.scheduledSalaryAmount,
          month: formatMonthLabel(selectedMonth),
        });
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

  // ── Native notifications verification for ALL slips & apartment expenses ──
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function checkUpcomingNotifications() {
      try {
        const res = await fetch("/api/slips");
        if (!res.ok) return;
        const allSlips: Slip[] = await res.json();

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

  // ── Leisure budget loading ───────────────────────────────────────────────
  const loadLeisureBudget = useCallback(async () => {
    setLeisureLoading(true);
    try {
      const res = await fetch(`/api/leisure-budget?month=${selectedMonth}`);
      const data = await res.json();
      setLeisureData(data);
    } catch {
      setLeisureData(null);
    } finally {
      setLeisureLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadLeisureBudget();
  }, [loadLeisureBudget]);

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

    // Refresh leisure budget in case this slip is in Lazer category
    loadLeisureBudget();

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

  async function handleDelete(id: string) {
    try {
      const deleted = slips.find((s) => s.id === id);
      const res = await fetch(`/api/slips/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let errMsg = "Não foi possível excluir a despesa.";
        try {
          const data = await res.json();
          if (data && data.error) errMsg = data.error;
        } catch {}
        addToast({ title: "Erro", message: errMsg, type: "danger" });
        return;
      }
      setSlips((prev) => prev.filter((s) => s.id !== id));
      if (deleted) {
        addToast({ title: "Despesa excluída", message: deleted.title, type: "info" });
      }
      // Refresh leisure budget in case deleted slip was Lazer
      loadLeisureBudget();
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
          description: "Receita Extra",
          month: selectedMonth,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao adicionar receita");
      }

      addToast({
        title: "Bônus Adicionado! 💖",
        message: `Renda extra de ${parseFloat(extraIncomeAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} adicionada ao HP!`,
        type: "success",
      });
      
      setIsExtraModalOpen(false);
      setExtraIncomeAmount("");
      loadSlips();
    } catch (err: any) {
      addToast({
        title: "Erro",
        message: err.message || "Não foi possível registrar a receita extra.",
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
        const aOverdue = a.status !== "PAGO" && new Date(a.dueDate) < now;
        const bOverdue = b.status !== "PAGO" && new Date(b.dueDate) < now;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }

    return result;
  }, [slips, filterCategoryId, filterStatus, sortBy]);

  return (
    <>
      <div className={styles.layout}>
        {/* ── Sidebar: Achievements ─────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <AchievementsPanel
            onAchievementUnlocked={celebrateAchievement}
            onSettingsSaved={() => { loadSlips(true); loadLeisureBudget(); }}
          />
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className={styles.main} id="main-content">
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <LayoutDashboard size={24} className={styles.headerIcon} />
              <div>
                <h1 className={styles.appTitle}>Capivara Poupadora</h1>
                <p className={styles.appSubtitle}>Gerenciador Financeiro Gamificado 🌾</p>
              </div>
            </div>

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

            <button
              id="add-slip-btn"
              className={styles.addBtn}
              onClick={() => { setEditingSlip(null); setIsFormOpen(true); }}
              aria-label="Adicionar despesa"
            >
              <Plus size={18} />
              <span>Adicionar Despesa</span>
            </button>
          </header>

          {/* Summary Cards */}
          <section aria-label="Resumo financeiro do mês">
            <SummaryCards slips={slips} budgetLimit={budgetLimit} loading={loading} />
          </section>

          {/* Charts & Leisure Budget Section */}
          <div className={styles.chartsRow}>
            <section aria-label="Orçamento de lazer" className={styles.leisureCol}>
              <LeisureBudgetCard data={leisureData} loading={leisureLoading} />
            </section>
            <section aria-label="Gráficos de gastos" className={styles.chartCol}>
              <DashboardCharts slips={slips} />
            </section>
          </div>

          {/* Slip list */}
          <section aria-label="Lista de despesas">
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>
                Despesas
                {slips.length > 0 && (
                  <span className={styles.listCount}>{slips.length}</span>
                )}
              </h2>

              {/* Filtering and sorting controls */}
              <div className={styles.listControls}>
                <div className={styles.controlGroup}>
                  <label htmlFor="filter-category" className={styles.controlLabel}>Categoria:</label>
                  <select
                    id="filter-category"
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className={styles.controlSelect}
                  >
                    <option value="ALL">Todas</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.controlGroup}>
                  <label htmlFor="filter-status" className={styles.controlLabel}>Status:</label>
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={styles.controlSelect}
                  >
                    <option value="ALL">Todos</option>
                    <option value="PENDENTE">Pendentes</option>
                    <option value="PAGO">Pagas</option>
                  </select>
                </div>


                <div className={styles.controlGroup}>
                  <label htmlFor="sort-by" className={styles.controlLabel}>Ordenar:</label>
                  <select
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={styles.controlSelect}
                  >
                    <option value="DUE_DATE">Vencimento</option>
                    <option value="STATUS">Status (Pendentes primeiro)</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.skeletonList}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonItem} />
                ))}
              </div>
            ) : slips.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>💸</span>
                <p className={styles.emptyTitle}>Nenhuma despesa em {formatMonthLabel(selectedMonth)}</p>
                <p className={styles.emptyHint}>Clique no botão de adicionar para começar.</p>
              </div>
            ) : filteredAndSorted.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔍</span>
                <p className={styles.emptyTitle}>Nenhuma despesa encontrada com os filtros</p>
                <p className={styles.emptyHint}>Tente mudar a categoria selecionada.</p>
              </div>
            ) : (
              <ul className={styles.slipList} role="list">
                {filteredAndSorted.map((slip) => (
                  <li key={slip.id}>
                    <SlipItem
                      slip={slip}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onStatusToggle={handleStatusToggle}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
      <AdicionarDespesa
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={handleSave}
        editingSlip={editingSlip}
      />

      {/* ── FAB (mobile only) ────────────────────────────────────────── */}
      <button
        id="fab-add-extra"
        className={styles.fabExtra}
        onClick={() => setIsExtraModalOpen(true)}
        title="Adicionar Receita Extra"
        aria-label="Adicionar receita extra"
      >
        <DollarSign size={20} />
      </button>

      <button
        id="fab-add-slip"
        className={styles.fab}
        onClick={() => { setEditingSlip(null); setIsFormOpen(true); }}
        title="Adicionar Despesa"
        aria-label="Adicionar despesa"
      >
        <Plus size={20} />
      </button>

      {/* ── Extra Income Modal ────────────────────────────────────────── */}
      {isExtraModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Adicionar Receita Extra</h3>
            <form onSubmit={handleAddExtraIncome}>
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
                  }}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Adicionar Bônus
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
    </>
  );
}
