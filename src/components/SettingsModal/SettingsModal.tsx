"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, X, DollarSign, Calendar, CreditCard, HeartHandshake, Percent } from "lucide-react";
import styles from "./SettingsModal.module.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [budgetLimit, setBudgetLimit] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [leisureBudget, setLeisureBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch current stats to populate settings form
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setBudgetLimit(data.monthlyBudgetLimit?.toString() ?? "50");
          setCreditLimit(data.totalCreditLimit?.toString() ?? "1000");
          setSalaryAmount(data.scheduledSalaryAmount?.toString() ?? "3000");
          setPaymentDay(data.salaryPaymentDay?.toString() ?? "5");
          setLeisureBudget(data.leisureBudget?.toString() ?? "0");
        }
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyBudgetLimit: parseFloat(budgetLimit) || 50,
          totalCreditLimit: parseFloat(creditLimit) || 1000,
          scheduledSalaryAmount: parseFloat(salaryAmount) || 3000,
          salaryPaymentDay: parseInt(paymentDay, 10) || 5,
          leisureBudget: parseFloat(leisureBudget) || 0,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className={styles.header}>
          <div className={styles.headerTitleArea}>
            <div className={styles.iconWrapper}>
              <Settings size={20} />
            </div>
            <h2 id="settings-modal-title" className={styles.title}>
              Parâmetros Financeiros
            </h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>
              <DollarSign size={14} /> Salário Agendado (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={salaryAmount}
              onChange={(e) => setSalaryAmount(e.target.value)}
              className={styles.input}
              placeholder="3000.00"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Calendar size={14} /> Dia do Pagamento
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              className={styles.input}
              placeholder="5"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <CreditCard size={14} /> Limite do Cartão (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className={styles.input}
              placeholder="1000.00"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <HeartHandshake size={14} /> Orçamento Lazer (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={leisureBudget}
              onChange={(e) => setLeisureBudget(e.target.value)}
              className={styles.input}
              placeholder="300.00"
              required
            />
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label}>
              <Percent size={14} /> Orçamento Teto HP Capivara (% Limite Geral)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              className={styles.input}
              placeholder="50"
              required
            />
          </div>

          <div className={`${styles.actions} ${styles.fullWidth}`}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalRoot
  );
}
