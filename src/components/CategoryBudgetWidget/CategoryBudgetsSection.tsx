"use client";

import { useState } from "react";
import CategoryBudgetWidget, { CategoryBudgetInfo } from "./CategoryBudgetWidget";
import styles from "./CategoryBudgetsSection.module.css";

interface Props {
  categoryBudgets: CategoryBudgetInfo[];
}

export default function CategoryBudgetsSection({ categoryBudgets }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (categoryBudgets.length === 0) return null;

  return (
    <section aria-label="Orçamentos de categorias configuradas" className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleRow}>
          <span className={styles.panelIcon}>🎯</span>
          <h3 className={styles.panelTitle}>Orçamentos por Categoria</h3>
          <span className={styles.panelBadge}>
            {categoryBudgets.length} {categoryBudgets.length === 1 ? "configurado" : "configurados"}
          </span>
        </div>

        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setIsCollapsed((v) => !v)}
          aria-label={isCollapsed ? "Expandir orçamentos por categoria" : "Minimizar orçamentos por categoria"}
          title={isCollapsed ? "Expandir" : "Minimizar"}
        >
          <span className={`${styles.collapseIcon} ${isCollapsed ? "" : styles.collapseIconOpen}`}>
            ▼
          </span>
        </button>
      </div>

      {/* Grid of category budget widgets — only when expanded */}
      {!isCollapsed && (
        <div className={styles.categoryBudgetsGrid}>
          {categoryBudgets.map((cat) => (
            <CategoryBudgetWidget key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </section>
  );
}
