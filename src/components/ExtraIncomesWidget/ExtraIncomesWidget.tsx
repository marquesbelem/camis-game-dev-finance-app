"use client";

import React, { useState } from "react";
import { Sparkles, Trash2, Plus, AlertTriangle } from "lucide-react";
import styles from "./ExtraIncomesWidget.module.css";

export interface ExtraIncomeItem {
  id: string;
  amount: number;
  description: string;
  month: string;
  createdAt: string;
}

interface ExtraIncomesWidgetProps {
  incomes: ExtraIncomeItem[];
  onDelete: (id: string) => void;
  onAddIncome: () => void;
}

export default function ExtraIncomesWidget({
  incomes,
  onDelete,
  onAddIncome,
}: ExtraIncomesWidgetProps) {
  const [incomeToDelete, setIncomeToDelete] = useState<ExtraIncomeItem | null>(null);
  const totalAmount = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <Sparkles size={20} className="text-emerald-400" />
            <h3 className={styles.title}>Receitas Extras</h3>
          </div>
          {incomes.length > 0 && (
            <span className={styles.totalBadge}>
              + {totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          )}
        </div>

        {incomes.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Nenhuma receita extra cadastrada este mês.</p>
            <button
              type="button"
              className={styles.addBtnEmpty}
              onClick={onAddIncome}
            >
              <Plus size={16} />
              <span>Adicionar Receita Extra</span>
            </button>
          </div>
        ) : (
          <ul className={styles.incomeList}>
            {incomes.map((inc) => (
              <li key={inc.id} className={styles.incomeCard}>
                <div className={styles.infoArea}>
                  <span className={styles.coinIcon}>💰</span>
                  <div className={styles.meta}>
                    <strong className={styles.description}>
                      {inc.description || "Receita Extra"}
                    </strong>
                    <span className={styles.date}>
                      {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString("pt-BR") : ""}
                    </span>
                  </div>
                </div>

                <div className={styles.rightArea}>
                  <span className={styles.amount}>
                    + {Number(inc.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setIncomeToDelete(inc)}
                    title="Excluir esta receita extra"
                    aria-label={`Excluir ${inc.description || "receita extra"}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirmation Modal */}
      {incomeToDelete && (
        <div className={styles.modalOverlay} onClick={() => setIncomeToDelete(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.warningIconWrap}>
                <AlertTriangle size={22} className={styles.warningIcon} />
              </div>
              <h3 className={styles.modalTitle}>Confirmar Exclusão</h3>
            </div>

            <p className={styles.modalText}>
              Tem certeza de que deseja excluir a receita extra{" "}
              <strong className={styles.highlightDesc}>"{incomeToDelete.description || "Receita Extra"}"</strong> no valor de{" "}
              <strong className={styles.highlightAmount}>
                +{Number(incomeToDelete.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </strong>?
            </p>

            <p className={styles.modalSubtext}>
              Esta ação removerá este valor do seu orçamento mensal.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIncomeToDelete(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(incomeToDelete.id);
                  setIncomeToDelete(null);
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
