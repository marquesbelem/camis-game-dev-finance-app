"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Receipt, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AdicionarDespesa from "@/components/AdicionarDespesa/AdicionarDespesa";
import SlipItem, { Slip } from "@/components/SlipList/SlipItem";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import styles from "./page.module.css";

interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  const monthName = date.toLocaleDateString("pt-BR", { month: "long" });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${y}`;
}

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [slips, setSlips] = useState<Slip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sorting state
  const [filterCategoryId, setFilterCategoryId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("DUE_DATE");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<Slip | null>(null);

  const { toasts, dismissToast, celebrateAchievement, addToast } = useToasts();

  const loadSlips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/slips?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data);
      }
    } catch (err) {
      console.error("Erro ao carregar despesas:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedMonth]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadSlips();
  }, [loadSlips]);

  async function handleStatusToggle(slip: Slip) {
    const nextStatus = slip.status === "PAGO" ? "PENDENTE" : "PAGO";
    setSlips((prev) =>
      prev.map((s) => (s.id === slip.id ? { ...s, status: nextStatus } : s))
    );

    try {
      const form = new FormData();
      form.append("status", nextStatus);
      const res = await fetch(`/api/slips/${slip.id}`, {
        method: "PUT",
        body: form,
      });

      if (res.ok) {
        if (nextStatus === "PAGO") {
          addToast({
            title: "Despesa Quitada! ⚔️",
            message: `Você marcou "${slip.title}" como pago.`,
            type: "success",
          });
        }
        await loadSlips(true);
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  async function handleDelete(id: string, deleteFutureInstallments = false) {
    try {
      const slipToDelete = slips.find((s) => s.id === id);
      if (deleteFutureInstallments && slipToDelete?.isRecurring) {
        try {
          await fetch(`/api/slips/recurring?id=${id}`, { method: "DELETE" });
        } catch (rErr) {
          console.error("Erro ao excluir recorrência futura:", rErr);
        }
      }

      const url = deleteFutureInstallments
        ? `/api/slips/${id}?deleteFuture=true`
        : `/api/slips/${id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setSlips((prev) => prev.filter((s) => s.id !== id));
        addToast({
          title: "Despesa excluída",
          message: deleteFutureInstallments ? "Despesa e recorrências/parcelas futuras removidas." : "A despesa foi removida com sucesso.",
          type: "info",
        });
        await loadSlips(true);
      }
    } catch (err) {
      console.error("Erro ao excluir despesa:", err);
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

  const filteredAndSorted = useMemo(() => {
    let result = [...slips];

    if (filterCategoryId !== "ALL") {
      result = result.filter((s) => s.categoryId === filterCategoryId);
    }

    if (filterStatus !== "ALL") {
      if (filterStatus === "RECURRING") {
        result = result.filter((s) => s.isRecurring);
      } else {
        result = result.filter((s) => s.status === filterStatus);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    if (sortBy === "DUE_DATE") {
      result.sort((a, b) => a.dueDate.slice(0, 10).localeCompare(b.dueDate.slice(0, 10)));
    } else if (sortBy === "STATUS") {
      result.sort((a, b) => {
        const aOverdue = a.status !== "PAGO" && a.dueDate.slice(0, 10) < todayStr;
        const bOverdue = b.status !== "PAGO" && b.dueDate.slice(0, 10) < todayStr;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return a.dueDate.slice(0, 10).localeCompare(b.dueDate.slice(0, 10));
      });
    }

    return result;
  }, [slips, filterCategoryId, filterStatus, sortBy]);

  const totalAmount = useMemo(() => {
    return filteredAndSorted.reduce((sum, slip) => sum + slip.amount, 0);
  }, [filteredAndSorted]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>

          <h1 className={styles.title}>
            <Receipt size={28} className="text-blue-400" />
            Todas as Despesas 💸
          </h1>
          <div className={styles.totalBadge}>
            Total (Filtro Atual): {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.monthSelector}>
            <button
              className={styles.monthBtn}
              onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className={styles.monthLabel}>{formatMonthLabel(selectedMonth)}</span>
            <button
              className={styles.monthBtn}
              onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter and Sorting Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Categoria:</label>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className={styles.controlSelect}
          >
            <option value="ALL">Todas ({slips.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.controlSelect}
          >
            <option value="ALL">Todos</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="PAGO">Pagas</option>
            <option value="RECURRING">Somente Recorrentes</option>
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.controlSelect}
          >
            <option value="DUE_DATE">Data de Vencimento</option>
            <option value="STATUS">Vencidas / Pendentes Primeiro</option>
          </select>
        </div>
      </div>

      {/* Slips List */}
      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonItem} />
            ))}
          </div>
        ) : slips.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💸</span>
            <p className={styles.emptyTitle}>Nenhuma despesa registrada em {formatMonthLabel(selectedMonth)}</p>
            <p className={styles.emptyHint}>Clique no botão de adicionar para cadastrar sua primeira conta.</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔍</span>
            <p className={styles.emptyTitle}>Nenhuma despesa encontrada com os filtros selecionados</p>
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
      </main>

      {/* Floating Action Button */}
      <button
        className={styles.fab}
        onClick={() => { setEditingSlip(null); setIsFormOpen(true); }}
        aria-label="Adicionar Despesa"
        title="Adicionar Despesa"
      >
        <Plus size={24} />
      </button>

      {/* Forms & Celebrations */}
      <AdicionarDespesa
        isOpen={isFormOpen}
        onClose={closeForm}
        onSave={(saved) => {
          loadSlips(true);
          addToast({
            title: editingSlip ? "Despesa atualizada" : "Despesa adicionada",
            message: saved.title,
            type: "success",
          });
        }}
        editingSlip={editingSlip}
        targetMonth={selectedMonth}
      />

      <Celebration toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
