"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, X, AlertTriangle, Calendar, Repeat } from "lucide-react";
import styles from "./DeleteRecurringModal.module.css";

interface DeleteRecurringModalProps {
  isOpen: boolean;
  expenseTitle: string;
  isRecurring?: boolean;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotal?: number;
  onClose: () => void;
  onConfirm: (deleteFuture: boolean) => void;
}

export default function DeleteRecurringModal({
  isOpen,
  expenseTitle,
  isRecurring = false,
  isInstallment = false,
  installmentNumber,
  installmentTotal,
  onClose,
  onConfirm,
}: DeleteRecurringModalProps) {
  const [deleteFuture, setDeleteFuture] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDeleteFuture(false);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm(deleteFuture);
    onClose();
  };

  const getHeaderTitle = () => {
    if (isRecurring) return "Excluir Despesa Recorrente";
    if (isInstallment) return "Excluir Despesa Parcelada";
    return "Excluir Despesa";
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className={styles.header}>
          <div className={styles.headerTitleArea}>
            <div className={styles.iconWrapper}>
              <Trash2 size={20} />
            </div>
            <h2 id="delete-modal-title" className={styles.title}>
              {getHeaderTitle()}
            </h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.expenseInfo}>
          Despesa selecionada: <span className={styles.expenseTitle}>"{expenseTitle}"</span>
          {isInstallment && installmentNumber && installmentTotal && (
            <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#60a5fa" }}>
              Parcela {installmentNumber} de {installmentTotal}
            </div>
          )}
        </div>

        {/* Recurring options */}
        {isRecurring && (
          <>
            <p className={styles.questionText}>
              Esta é uma despesa recorrente (fixa mensal). Escolha o alcance da exclusão:
            </p>

            <div className={styles.optionsList}>
              <label
                className={`${styles.optionCard} ${
                  !deleteFuture ? styles.optionCardSelected : ""
                }`}
                onClick={() => setDeleteFuture(false)}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  checked={!deleteFuture}
                  onChange={() => setDeleteFuture(false)}
                  className={styles.radioInput}
                />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>Excluir apenas o boleto deste mês</span>
                  <span className={styles.optionDesc}>
                    Apenas a cobrança do mês atual será removida. A renovação automática dos próximos meses continuará ativa.
                  </span>
                </div>
              </label>

              <label
                className={`${styles.optionCard} ${
                  deleteFuture ? styles.optionCardSelected : ""
                }`}
                onClick={() => setDeleteFuture(true)}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  checked={deleteFuture}
                  onChange={() => setDeleteFuture(true)}
                  className={styles.radioInput}
                />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>
                    Excluir este mês e cancelar os próximos
                  </span>
                  <span className={styles.optionDesc}>
                    Remove o boleto deste mês e encerra a recorrência automática para que não seja gerada nos meses seguintes.
                  </span>
                </div>
              </label>
            </div>
          </>
        )}

        {/* Installment options */}
        {isInstallment && (
          <>
            <p className={styles.questionText}>
              Esta despesa é parcelada. Escolha o alcance da exclusão:
            </p>

            <div className={styles.optionsList}>
              <label
                className={`${styles.optionCard} ${
                  !deleteFuture ? styles.optionCardSelected : ""
                }`}
                onClick={() => setDeleteFuture(false)}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  checked={!deleteFuture}
                  onChange={() => setDeleteFuture(false)}
                  className={styles.radioInput}
                />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>Excluir apenas esta parcela</span>
                  <span className={styles.optionDesc}>
                    Remove somente a parcela do mês selecionado ({installmentNumber}/{installmentTotal}).
                  </span>
                </div>
              </label>

              <label
                className={`${styles.optionCard} ${
                  deleteFuture ? styles.optionCardSelected : ""
                }`}
                onClick={() => setDeleteFuture(true)}
              >
                <input
                  type="radio"
                  name="deleteScope"
                  checked={deleteFuture}
                  onChange={() => setDeleteFuture(true)}
                  className={styles.radioInput}
                />
                <div className={styles.optionContent}>
                  <span className={styles.optionTitle}>
                    Excluir esta e todas as parcelas futuras
                  </span>
                  <span className={styles.optionDesc}>
                    Remove esta parcela e todas as parcelas restantes deste parcelamento.
                  </span>
                </div>
              </label>
            </div>
          </>
        )}

        {/* Normal single expense */}
        {!isRecurring && !isInstallment && (
          <p className={styles.questionText}>
            Tem certeza de que deseja excluir esta despesa? Esta ação não pode ser desfeita.
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirm}
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
