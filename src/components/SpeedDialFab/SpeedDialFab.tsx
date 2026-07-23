"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Settings, DollarSign, Receipt } from "lucide-react";
import styles from "./SpeedDialFab.module.css";

interface SpeedDialFabProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onOpenSettings: () => void;
}

export default function SpeedDialFab({
  onAddExpense,
  onAddIncome,
  onOpenSettings,
}: SpeedDialFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div id="speed-dial-fab" ref={containerRef} className={styles.container}>
      {/* Main Trigger Button */}
      <button
        type="button"
        className={styles.mainTrigger}
        onClick={() => setIsOpen((v) => !v)}
        title={isOpen ? "Fechar menu" : "Menu de Ações Rápida"}
        aria-expanded={isOpen}
        aria-label="Menu de ações rápidas"
      >
        <span
          className={`${styles.iconWrapper} ${
            isOpen ? styles.iconOpen : ""
          }`}
        >
          <Plus size={26} />
        </span>
      </button>

      {/* Expanded Speed Dial Items */}
      {isOpen && (
        <div className={styles.speedDialList}>
          {/* Option 3: Settings */}
          <div
            className={styles.dialItem}
            style={{ animationDelay: "0ms" }}
          >
            <span className={styles.itemLabel}>Parâmetros</span>
            <button
              type="button"
              className={`${styles.subFab} ${styles.fabSettings}`}
              onClick={() => handleAction(onOpenSettings)}
              title="Configurar Parâmetros"
              aria-label="Configurar parâmetros"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Option 2: Extra Income */}
          <div
            className={styles.dialItem}
            style={{ animationDelay: "40ms" }}
          >
            <span className={styles.itemLabel}>Receita Extra</span>
            <button
              type="button"
              className={`${styles.subFab} ${styles.fabAddIncome}`}
              onClick={() => handleAction(onAddIncome)}
              title="Adicionar Receita Extra"
              aria-label="Adicionar receita extra"
            >
              <DollarSign size={20} />
            </button>
          </div>

          {/* Option 1: Add Expense */}
          <div
            className={styles.dialItem}
            style={{ animationDelay: "80ms" }}
          >
            <span className={styles.itemLabel}>Adicionar Despesa</span>
            <button
              type="button"
              className={`${styles.subFab} ${styles.fabAddExpense}`}
              onClick={() => handleAction(onAddExpense)}
              title="Adicionar Despesa"
              aria-label="Adicionar despesa"
            >
              <Receipt size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
