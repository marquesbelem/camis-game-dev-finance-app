"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, DollarSign, Tag, CreditCard, Calendar, AlertCircle } from "lucide-react";
import styles from "./RecurringEditModal.module.css";

interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
}

interface RecurringSlip {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  recurringDay?: number | null;
  isCreditCardPayment: boolean;
  categoryId: string;
  category: Category;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  slip: RecurringSlip;
}

export default function RecurringEditModal({ isOpen, onClose, onSave, slip }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [recurringDay, setRecurringDay] = useState(1);
  const [isCreditCardPayment, setIsCreditCardPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Load categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
      })
      .catch(console.error);
  }, []);

  // Populate data when slip changes
  useEffect(() => {
    if (slip) {
      const timer = setTimeout(() => {
        setTitle(slip.title);
        setAmount(slip.amount.toString());
        setCategoryId(slip.categoryId);
        setIsCreditCardPayment(slip.isCreditCardPayment);
        const defaultDay = slip.recurringDay ?? (slip.dueDate ? parseInt(slip.dueDate.slice(8, 10), 10) : 1);
        setRecurringDay(defaultDay);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [slip, isOpen]);

  // Focus title input on open
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!title.trim()) {
      setError("Título é obrigatório.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Valor deve ser positivo.");
      return;
    }
    if (recurringDay < 1 || recurringDay > 31) {
      setError("Dia de vencimento deve ser entre 1 e 31.");
      return;
    }
    if (!categoryId) {
      setError("Selecione uma categoria.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/slips/recurring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slip.id,
          title: title.trim(),
          amount: parsedAmount,
          categoryId,
          isCreditCardPayment,
          recurringDay,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar alterações da recorrência.");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  // Format "next month" string dynamically for the warning message
  const getNextMonthLabel = () => {
    const today = new Date();
    // Next month: add 1 to current month
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonthDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  if (!isOpen || !mounted) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="recurring-edit-title">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="recurring-edit-title" className={styles.title}>
            Editar Recorrência
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar formulário"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning card alerting user that changes take effect only starting next month */}
        <div className={styles.warningAlert} role="alert">
          <AlertCircle size={18} className={styles.warningIcon} />
          <div>
            <p className={styles.warningTitle}>Atenção!</p>
            <p className={styles.warningText}>
              Esta modificação só afetará as parcelas a partir de <strong>{getNextMonthLabel()}</strong>. O histórico do mês atual e meses passados continuará intocado.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="rec-title" className={styles.label}>
              <Tag size={14} /> Título <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              id="rec-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Assinatura de Streaming"
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          {/* Amount and Day */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="rec-amount" className={styles.label}>
                <DollarSign size={14} /> Valor (R$) <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                id="rec-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="rec-day" className={styles.label}>
                <Calendar size={14} /> Dia de Cobrança <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                id="rec-day"
                type="number"
                min="1"
                max="31"
                value={recurringDay}
                onChange={(e) => setRecurringDay(parseInt(e.target.value, 10) || 1)}
                placeholder="Ex: 15"
                className={styles.input}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label htmlFor="rec-category" className={styles.label}>
              Categoria <span className={styles.requiredAsterisk}>*</span>
            </label>
            <select
              id="rec-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={styles.select}
              required
              disabled={loading}
            >
              <option value="" disabled>Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Credit card Toggle */}
          <div
            className={`${styles.toggleRow} ${isCreditCardPayment ? styles.toggleRowActive : ""}`}
            onClick={() => !loading && setIsCreditCardPayment(!isCreditCardPayment)}
            role="checkbox"
            aria-checked={isCreditCardPayment}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!loading) setIsCreditCardPayment(!isCreditCardPayment);
              }
            }}
          >
            <div className={styles.toggleInfo}>
              <CreditCard size={16} />
              <span>Pagar com Cartão de Crédito</span>
            </div>
            <div className={`${styles.toggle} ${isCreditCardPayment ? styles.toggleOn : ""}`}>
              <div className={styles.toggleThumb} />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Alteração"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalRoot
  );
}
