"use client";

import React from "react";
import { Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";
import SlipItem, { Slip } from "@/components/SlipList/SlipItem";
import styles from "./RecentExpensesWidget.module.css";

interface RecentExpensesWidgetProps {
  slips: Slip[];
  onStatusToggle: (slip: Slip) => void;
  onEdit: (slip: Slip) => void;
  onDelete: (id: string, deleteFuture?: boolean) => void;
}

export default function RecentExpensesWidget({
  slips,
  onStatusToggle,
  onEdit,
  onDelete,
}: RecentExpensesWidgetProps) {
  // Sort pending / due soon slips first and take top 3
  const pendingSlips = slips.filter((s) => s.status !== "PAGO");
  const recentSlips = [...slips]
    .sort((a, b) => {
      const aPending = a.status !== "PAGO";
      const bPending = b.status !== "PAGO";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return a.dueDate.slice(0, 10).localeCompare(b.dueDate.slice(0, 10));
    })
    .slice(0, 3);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Receipt size={20} className="text-blue-400" />
          <h3 className={styles.title}>Próximas Despesas</h3>
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
            <li key={slip.id}>
              <SlipItem
                slip={slip}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusToggle={onStatusToggle}
              />
            </li>
          ))}
        </ul>
      )}

      <Link href="/expenses" className={styles.actionBtn}>
        <Receipt size={16} />
        <span>Ver Todas as Despesas ({slips.length})</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
