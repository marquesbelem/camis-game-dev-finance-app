"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Slip } from "@/components/SlipList/SlipItem";
import styles from "./RecentExpensesWidget.module.css";

interface RecentExpensesWidgetProps {
  slips: Slip[];
  onStatusToggle: (slip: Slip) => void;
  onEdit: (slip: Slip) => void;
  onDelete: (id: string, deleteFuture?: boolean) => void;
  selectedMonth?: string;
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

export default function RecentExpensesWidget({
  slips,
  onStatusToggle,
  onEdit,
  selectedMonth,
}: RecentExpensesWidgetProps) {
  // Sort pending / due soon slips first and take top 4 for a compact list
  const pendingSlips = slips.filter((s) => s.status !== "PAGO");
  const recentSlips = [...slips]
    .sort((a, b) => {
      const aPending = a.status !== "PAGO";
      const bPending = b.status !== "PAGO";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return a.dueDate.slice(0, 10).localeCompare(b.dueDate.slice(0, 10));
    })
    .slice(0, 4);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.panelIcon}>🧾</span>
          <h3 className={styles.title}>PRÓXIMAS DESPESAS</h3>
        </div>
        <span className={styles.badge}>
          {pendingSlips.length} Pendente{pendingSlips.length !== 1 ? "s" : ""}
        </span>
      </div>

      {recentSlips.length === 0 ? (
        <p className={styles.emptyText}>Nenhuma despesa registrada este mês 🎉</p>
      ) : (
        <ul className={styles.slipList}>
          {recentSlips.map((slip) => (
            <li
              key={slip.id}
              className={styles.compactSlipItem}
              onClick={() => onEdit(slip)}
              title="Clique para editar despesa"
            >
              <div className={styles.slipLeft}>
                <span
                  className={styles.slipCategoryPill}
                  style={{
                    background: slip.category?.colorCode || "var(--color-brand)",
                  }}
                />
                <div className={styles.slipTitleGroup}>
                  <span className={styles.slipTitle}>{slip.title}</span>
                  <span className={styles.slipDate}>
                    Vencimento: {formatDate(slip.dueDate)} · {slip.category?.name || "Geral"}
                  </span>
                </div>
              </div>

              <div className={styles.slipRight}>
                <button
                  type="button"
                  className={`${styles.slipStatusBadge} ${
                    slip.status === "PAGO"
                      ? styles.slipStatusPaid
                      : slip.status === "RESERVADO"
                      ? styles.slipStatusReserved
                      : styles.slipStatusPending
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusToggle(slip);
                  }}
                  title="Clique para alternar status (Pendente ➔ Reservado ➔ Pago)"
                  aria-label={`Status: ${slip.status}. Clique para alternar.`}
                >
                  <span className={styles.statusText}>
                    {slip.status === "PAGO"
                      ? "Pago"
                      : slip.status === "RESERVADO"
                      ? "Reservado"
                      : "Pendente"}
                  </span>
                  <span className={styles.statusToggleCue} aria-hidden="true">
                    ⇄
                  </span>
                </button>
                <span className={styles.slipAmount}>
                  {formatCurrency(slip.amount)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={selectedMonth ? `/expenses?month=${selectedMonth}` : "/expenses"}
        className={styles.actionBtn}
      >
        <span>Ver Todas as Despesas ({slips.length})</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
