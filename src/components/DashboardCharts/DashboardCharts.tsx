"use client";

import { useState } from "react";
import styles from "./DashboardCharts.module.css";

interface Slip {
  id: string;
  title: string;
  amount: number;
  status: string;
  isCreditCardPayment?: boolean;
  category: { id: string; name: string; colorCode: string };
}

interface Props {
  slips: Slip[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Map category name to a gamified icon
function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("apart") || n.includes("morad") || n.includes("aluguel")) return "🏠";
  if (n.includes("aliment") || n.includes("comida") || n.includes("mercad")) return "🍖";
  if (n.includes("saúde") || n.includes("saude") || n.includes("médic") || n.includes("medic")) return "💊";
  if (n.includes("lazer") || n.includes("entret")) return "🎮";
  if (n.includes("transport") || n.includes("carro") || n.includes("gasolina")) return "⚔️";
  if (n.includes("educaç") || n.includes("educac") || n.includes("curso")) return "📚";
  if (n.includes("cartão") || n.includes("cartao") || n.includes("crédito")) return "💳";
  if (n.includes("emprést") || n.includes("emprest")) return "💀";
  if (n.includes("invest") || n.includes("poupanç")) return "🛡️";
  return "⚔️";
}

export default function DashboardCharts({ slips }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  if (slips.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>⚔️</span>
        <p className={styles.emptyText}>Nenhuma batalha registrada este mês.</p>
        <span className={styles.emptySubtext}>Adicione despesas para ver o mapa de dano.</span>
      </div>
    );
  }

  // Build category totals
  const categoryMap: Record<string, { name: string; color: string; total: number }> = {};
  let grandTotal = 0;
  for (const slip of slips) {
    const key = slip.category.name;
    if (!categoryMap[key]) {
      categoryMap[key] = { name: slip.category.name, color: slip.category.colorCode, total: 0 };
    }
    categoryMap[key].total += slip.amount;
    grandTotal += slip.amount;
  }

  const sorted = Object.values(categoryMap).sort((a, b) => b.total - a.total);
  const topCat = sorted[0];

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleRow}>
          <span className={styles.panelIcon}>⚔️</span>
          <h3 className={styles.panelTitle}>Mapa de Dano</h3>
          <span className={styles.panelBadge}>{sorted.length} categorias</span>
        </div>
        <div className={styles.panelHeaderRight}>
          <div className={styles.panelTotal}>
            <span className={styles.panelTotalLabel}>Total do mês</span>
            <span className={styles.panelTotalValue}>{formatCurrency(grandTotal)}</span>
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setIsCollapsed(v => !v)}
            aria-label={isCollapsed ? "Expandir mapa de dano" : "Minimizar mapa de dano"}
            title={isCollapsed ? "Expandir" : "Minimizar"}
          >
            <span className={`${styles.collapseIcon} ${isCollapsed ? "" : styles.collapseIconOpen}`}>
              ▼
            </span>
          </button>
        </div>
      </div>

      {/* Boss category highlight */}
      {topCat && (
        <div className={styles.bossRow} style={{ "--cat-color": topCat.color } as React.CSSProperties}>
          <span className={styles.bossIcon}>{getCategoryIcon(topCat.name)}</span>
          <div className={styles.bossInfo}>
            <span className={styles.bossLabel}>👑 Maior Ameaça</span>
            <span className={styles.bossName}>{topCat.name}</span>
          </div>
          <span className={styles.bossValue}>{formatCurrency(topCat.total)}</span>
        </div>
      )}

      {/* HP Bars — only when expanded */}
      {!isCollapsed && (
        <ul className={styles.barList}>
          {sorted.map((cat, i) => {
            const pct = grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0;
            return (
              <li key={cat.name} className={styles.barItem}>
                <div className={styles.barTop}>
                  <div className={styles.barLabel}>
                    <span className={styles.barRank}>#{i + 1}</span>
                    <span className={styles.barIcon}>{getCategoryIcon(cat.name)}</span>
                    <span className={styles.barName}>{cat.name}</span>
                  </div>
                  <div className={styles.barRight}>
                    <span className={styles.barPct}>{pct.toFixed(1)}%</span>
                    <span className={styles.barValue}>{formatCurrency(cat.total)}</span>
                  </div>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${pct}%`,
                      background: cat.color,
                      boxShadow: `0 0 8px ${cat.color}80`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
