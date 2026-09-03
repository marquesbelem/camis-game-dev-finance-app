"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import * as Icons from "lucide-react";
import styles from "./CategoryBudgetWidget.module.css";

export interface CategoryBudgetInfo {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
  budgetLimitPct: number; // e.g. 15%
  budgetAmount: number;   // calculated R$
  spentAmount: number;    // R$ spent in selected month
  remainingAmount: number;// R$ budget - spent
}

interface CategoryBudgetWidgetProps {
  category: CategoryBudgetInfo;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CategoryBudgetWidget({ category }: CategoryBudgetWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { name, colorCode, iconRef, budgetAmount, spentAmount, remainingAmount } = category;

  const percentUsed = budgetAmount > 0 ? Math.min(Math.round((spentAmount / budgetAmount) * 100), 999) : 0;
  const isOverBudget = spentAmount > budgetAmount;
  const remainPct = budgetAmount > 0 ? (remainingAmount / budgetAmount) * 100 : 0;

  let status: "safe" | "warning" | "danger" = "safe";
  if (isOverBudget) {
    status = "danger";
  } else if (remainPct < 30) {
    status = "warning";
  }

  const statusLabel = {
    safe: "SEGURO",
    warning: "ATENÇÃO",
    danger: "ESTOURADO",
  }[status];

  const statusBadgeClass = {
    safe: styles.badgeSafe,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
  }[status];

  const barFillClass = {
    safe: styles.fillSafe,
    warning: styles.fillWarning,
    danger: styles.fillDanger,
  }[status];

  // Dynamic Icon component lookup
  const IconComponent = (Icons as any)[iconRef] || Icons.Tag;

  return (
    <article
      className={`${styles.card} ${isOverBudget ? styles.cardOverBudget : ""}`}
      aria-label={`Orçamento de ${name}`}
    >
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.leftInfo}>
          <div
            className={styles.iconWrap}
            style={{ backgroundColor: `${colorCode}20`, borderColor: `${colorCode}50`, color: colorCode }}
          >
            <IconComponent size={20} />
          </div>

          <div className={styles.meta}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{name}</span>
              <span className={`${styles.badge} ${statusBadgeClass}`}>
                {statusLabel}
              </span>
            </div>
            <div className={styles.valueRow}>
              <span className={`${styles.mainValue} ${isOverBudget ? styles.valueNegative : ""}`}>
                {formatCurrency(Math.abs(remainingAmount))}
              </span>
              <span className={styles.valueSuffix}>
                {isOverBudget ? "excedido" : "restante"}
              </span>
            </div>
          </div>
        </div>

        {/* Minimize / Expand Toggle Button */}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? "Expandir detalhes" : "Minimizar detalhes"}
          aria-label={isCollapsed ? `Expandir ${name}` : `Minimizar ${name}`}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Expandable Body */}
      {!isCollapsed && (
        <div className={styles.body}>
          {/* Progress Bar */}
          <div className={styles.progressBg}>
            <div
              className={`${styles.progressFill} ${barFillClass}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>

          {/* Progress Subtitle */}
          <div className={styles.progressSub}>
            <span className={styles.percentText}>{percentUsed}% usado</span>
            <span className={styles.ratioText}>
              {formatCurrency(spentAmount)} / {formatCurrency(budgetAmount)}
            </span>
          </div>

          <hr className={styles.divider} />

          {/* 3-Column Summary Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Orçamento ({category.budgetLimitPct}%)</span>
              <strong className={styles.statValBudget}>{formatCurrency(budgetAmount)}</strong>
            </div>

            <div className={styles.statCol}>
              <span className={styles.statLabel}>Gasto</span>
              <strong className={styles.statValSpent}>{formatCurrency(spentAmount)}</strong>
            </div>

            <div className={styles.statCol}>
              <span className={styles.statLabel}>Saldo</span>
              <strong className={isOverBudget ? styles.statValNegative : styles.statValRemaining}>
                {formatCurrency(remainingAmount)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
