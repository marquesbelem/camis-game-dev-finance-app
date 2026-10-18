"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Upload, Calendar, DollarSign, Tag, Repeat } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./AdicionarDespesa.module.css";

interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
}

interface Slip {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: string;
  isCreditCardPayment?: boolean;
  isRecurring: boolean;
  isInstallment?: boolean;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string | null;
  categoryId: string;
  documentPath: string | null;
  category: Category;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (slip: Slip) => void;
  editingSlip?: Slip | null;
  targetMonth?: string;
}

function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdicionarDespesa({ isOpen, onClose, onSave, editingSlip, targetMonth }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueDateText, setDueDateText] = useState("");
  const [status, setStatus] = useState("PENDENTE");
  const [categoryId, setCategoryId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState("2");
  const [recurringScope, setRecurringScope] = useState<"SINGLE" | "FUTURE">("FUTURE");
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD to DD/MM/AAAA
  const formatToDisplay = (ymd: string) => {
    if (!ymd) return "";
    const parts = ymd.split("-");
    if (parts.length !== 3) return ymd;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert DD/MM/AAAA to YYYY-MM-DD
  const formatToYmd = (dma: string) => {
    const parts = dma.split("/");
    if (parts.length !== 3) return "";
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const handleDateTextChange = (val: string) => {
    // Keep only digits, max 8 digits for formatting
    const cleanDigits = val.replace(/\D/g, "").slice(0, 8);
    let formatted = cleanDigits;
    
    if (cleanDigits.length > 2 && cleanDigits.length <= 4) {
      formatted = `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2)}`;
    } else if (cleanDigits.length > 4) {
      formatted = `${cleanDigits.slice(0, 2)}/${cleanDigits.slice(2, 4)}/${cleanDigits.slice(4, 8)}`;
    }
    
    setDueDateText(formatted);

    // If fully typed, update the state used for payload/native input
    if (cleanDigits.length === 8) {
      const ymd = formatToYmd(formatted);
      setDueDate(ymd);
    } else {
      setDueDate("");
    }
  };

  const handleNativeDateChange = (val: string) => {
    if (!val) return;
    setDueDate(val);
    setDueDateText(formatToDisplay(val));
  };

  const handleCalendarClick = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  // Set mounted state on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (editingSlip) {
      setTitle(editingSlip.title);
      setAmount(editingSlip.amount.toString());
      const datePart = editingSlip.dueDate.slice(0, 10);
      setDueDate(datePart);
      setDueDateText(formatToDisplay(datePart));
      setStatus(editingSlip.status);
      setCategoryId(editingSlip.categoryId);
      setIsRecurring((editingSlip as any).isRecurring ?? false);
      setIsInstallment((editingSlip as any).isInstallment ?? false);
      setInstallmentsCount(((editingSlip as any).installmentTotal ?? 2).toString());
      setRemoveDocument(false);
    } else {
      resetForm();
    }
  }, [editingSlip, isOpen]);

  // Auto-focus the title field whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => titleInputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [isOpen]);

  function resetForm() {
    setTitle("");
    setAmount("");
    const today = getTodayDateString();
    let initialDate = today;
    if (targetMonth && !today.startsWith(targetMonth)) {
      initialDate = `${targetMonth}-05`;
    }
    setDueDate(initialDate);
    setDueDateText(formatToDisplay(initialDate));
    setStatus("PENDENTE");
    setCategoryId(categories[0]?.id ?? "");
    setIsRecurring(false);
    setIsInstallment(false);
    setInstallmentsCount("2");
    setFile(null);
    setRemoveDocument(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Valor deve ser positivo."); return; }
    
    if (!dueDate) {
      setError("Data de vencimento é obrigatória (formato DD/MM/AAAA).");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dueDate)) {
      setError("Formato de data inválido. Por favor, insira no formato DD/MM/AAAA.");
      return;
    }
    const dateParts = dueDate.split("-");
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      setError("Data de vencimento inválida. Por favor, insira uma data correta.");
      return;
    }

    if (targetMonth && dueDate.slice(0, 7) !== targetMonth) {
      const [tY, tM] = targetMonth.split("-");
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const mName = monthNames[parseInt(tM, 10) - 1] ?? tM;
      setError(`A data de vencimento deve pertencer ao mês exibido na tela (${mName} de ${tY}).`);
      return;
    }

    if (!categoryId) { setError("Selecione uma categoria."); return; }

    if (isInstallment && !editingSlip) {
      const parsedCount = parseInt(installmentsCount, 10);
      if (isNaN(parsedCount) || parsedCount < 2 || parsedCount > 100) {
        setError("Quantidade de parcelas deve ser entre 2 e 100.");
        return;
      }
    } else if (editingSlip && editingSlip.isInstallment) {
      const parsedCount = parseInt(installmentsCount, 10);
      const minCount = editingSlip.installmentNumber ?? 1;
      if (isNaN(parsedCount) || parsedCount < minCount || parsedCount > 100) {
        setError(`Quantidade de parcelas deve ser entre ${minCount} e 100.`);
        return;
      }
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("amount", parsedAmount.toString());
    formData.append("dueDate", dueDate);
    formData.append("status", status);
    formData.append("isRecurring", isRecurring.toString());
    formData.append("isInstallment", isInstallment.toString());
    if (isInstallment && !editingSlip) {
      formData.append("installmentsCount", installmentsCount);
    } else if (editingSlip && editingSlip.isInstallment) {
      formData.append("installmentsCount", installmentsCount);
    }
    formData.append("categoryId", categoryId);
    if (file) formData.append("document", file);
    if (removeDocument) formData.append("removeDocument", "true");

    setLoading(true);
    try {
      const url = editingSlip ? `/api/slips/${editingSlip.id}` : "/api/slips";
      const method = editingSlip ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar despesa.");
      }

      const saved: Slip = await res.json();
      playSound("add_expense");

      // If editing a recurring slip and user chose FUTURE scope, update future recurrence configuration
      if (editingSlip && (editingSlip.isRecurring || isRecurring) && recurringScope === "FUTURE") {
        try {
          await fetch("/api/slips/recurring", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingSlip.id,
              title: title.trim(),
              amount: parsedAmount,
              categoryId,
              recurringDay: parseInt(dueDate.slice(8, 10), 10) || 5,
            }),
          });
        } catch (rErr) {
          console.error("Erro ao sincronizar recorrência futura:", rErr);
        }
      }

      onSave(saved);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;
  if (!mounted) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="form-title" className={styles.title}>
            {editingSlip ? "Editar Despesa" : "Adicionar Despesa"}
          </h2>
          <button
            id="close-modal-btn"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar formulário"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {error && <p className={styles.errorMsg} role="alert">{error}</p>}

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="slip-title" className={styles.label}>
              <Tag size={14} /> Título <span className={styles.requiredAsterisk}>*</span>
            </label>
            <input
              id="slip-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conta de Luz"
              className={styles.input}
              required
            />
          </div>

          {/* Amount */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="slip-amount" className={styles.label}>
                <DollarSign size={14} /> Valor (R$) <span className={styles.requiredAsterisk}>*</span>
              </label>
              <input
                id="slip-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className={styles.input}
                required
              />
            </div>

            {/* Due Date */}
            <div className={styles.field}>
              <label htmlFor="slip-due-date" className={styles.label}>
                <Calendar size={14} /> Vencimento <span className={styles.requiredAsterisk}>*</span>
              </label>
              <div className={styles.dateInputWrapper}>
                <input
                  id="slip-due-date"
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dueDateText}
                  onChange={(e) => handleDateTextChange(e.target.value)}
                  className={styles.input}
                  maxLength={10}
                  required
                />
                <button
                  type="button"
                  className={styles.calendarPickerBtn}
                  onClick={handleCalendarClick}
                  aria-label="Abrir calendário"
                >
                  <Calendar size={16} />
                </button>
                {/* Hidden native input for date picker invocation */}
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dueDate}
                  min={targetMonth ? `${targetMonth}-01` : undefined}
                  max={targetMonth ? `${targetMonth}-${String(new Date(parseInt(targetMonth.split("-")[0], 10), parseInt(targetMonth.split("-")[1], 10), 0).getDate()).padStart(2, "0")}` : undefined}
                  onChange={(e) => handleNativeDateChange(e.target.value)}
                  className={styles.hiddenNativeDateInput}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="slip-category" className={styles.label}>
                <Tag size={14} /> Categoria <span className={styles.requiredAsterisk}>*</span>
              </label>
              <select
                id="slip-category"
                value={categoryId}
                onChange={(e) => {
                  const newCatId = e.target.value;
                  setCategoryId(newCatId);
                  // Auto-set status to PAGO when selecting Lazer
                  const selectedCat = categories.find((c) => c.id === newCatId);
                  if (selectedCat?.name === "Lazer") {
                    setStatus("PAGO");
                  }
                }}
                className={styles.input}
                required
              >
                <option value="">Selecionar…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className={styles.field}>
              <label htmlFor="slip-status" className={styles.label}>
                Status
              </label>
              <select
                id="slip-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={styles.input}
              >
                <option value="PENDENTE">Pendente</option>
                <option value="RESERVADO">Reservado</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>
          </div>

          {/* Recurring toggle */}
          <label className={styles.toggleRow} htmlFor="slip-recurring">
            <div className={styles.toggleInfo}>
              <Repeat size={16} />
              <span>Despesa recorrente (mensal)</span>
            </div>
            <div
              id="slip-recurring"
              role="switch"
              aria-checked={isRecurring}
              className={`${styles.toggle} ${isRecurring ? styles.toggleOn : ""}`}
              onClick={() => {
                setIsRecurring((v) => !v);
                if (!isRecurring) {
                  setIsInstallment(false);
                }
              }}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  setIsRecurring((v) => !v);
                  if (!isRecurring) setIsInstallment(false);
                }
              }}
            >
              <span className={styles.toggleThumb} />
            </div>
          </label>

          {/* Recurring Scope Selection when editing */}
          {editingSlip && (editingSlip.isRecurring || isRecurring) && (
            <div className={styles.recurringOptionBox}>
              <span className={styles.recurringOptionLabel}>Escopo das alterações:</span>
              <div className={styles.recurringOptionList}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="recurringScope"
                    value="SINGLE"
                    checked={recurringScope === "SINGLE"}
                    onChange={() => setRecurringScope("SINGLE")}
                  />
                  <span>Alterar apenas a conta deste mês</span>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="recurringScope"
                    value="FUTURE"
                    checked={recurringScope === "FUTURE"}
                    onChange={() => setRecurringScope("FUTURE")}
                  />
                  <span>Alterar esta e todas as recorrências futuras</span>
                </label>
              </div>
            </div>
          )}

          {/* Installment toggle */}
          {!editingSlip ? (
            <>
              <label className={styles.toggleRow} htmlFor="slip-installment">
                <div className={styles.toggleInfo}>
                  <Calendar size={16} />
                  <span>Despesa parcelada</span>
                </div>
                <div
                  id="slip-installment"
                  role="switch"
                  aria-checked={isInstallment}
                  className={`${styles.toggle} ${isInstallment ? styles.toggleOn : ""}`}
                  onClick={() => {
                    setIsInstallment((v) => !v);
                    if (!isInstallment) {
                      setIsRecurring(false);
                    }
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      setIsInstallment((v) => !v);
                      if (!isInstallment) setIsRecurring(false);
                    }
                  }}
                >
                  <span className={styles.toggleThumb} />
                </div>
              </label>

              {isInstallment && (
                <div className={styles.field} style={{ marginTop: "0.5rem" }}>
                  <label htmlFor="slip-installments-count" className={styles.label}>
                    Quantidade de parcelas
                  </label>
                  <input
                    id="slip-installments-count"
                    type="number"
                    min="2"
                    max="100"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              )}
            </>
          ) : editingSlip.isInstallment ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className={styles.installmentInfo}>
                <span>ℹ️ Esta despesa é a parcela <strong>{editingSlip.installmentNumber}</strong> de <strong>{editingSlip.installmentTotal}</strong>.</span>
              </div>
              <div className={styles.field}>
                <label htmlFor="slip-installments-count" className={styles.label}>
                  Alterar total de parcelas
                </label>
                <input
                  id="slip-installments-count"
                  type="number"
                  min={editingSlip.installmentNumber ?? 1}
                  max="100"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            </div>
          ) : null}

          {/* File upload */}
          <div className={styles.field}>
            <label className={styles.label}>
              <Upload size={14} /> Documento (PDF/Imagem)
            </label>
            {editingSlip && editingSlip.documentPath && !removeDocument ? (
              <div className={styles.existingDocument}>
                <span className={styles.fileName}>📎 Documento Anexado</span>
                <button
                  type="button"
                  className={styles.removeDocumentBtn}
                  onClick={() => setRemoveDocument(true)}
                >
                  Remover
                </button>
              </div>
            ) : (
              <div
                className={styles.fileDropZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
              >
                {file ? (
                  <span className={styles.fileName}>📎 {file.name}</span>
                ) : (
                  <span className={styles.fileHint}>
                    Arraste ou clique para anexar
                  </span>
                )}
              </div>
            )}
            <input
              id="slip-document"
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={styles.hiddenInput}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              id="cancel-slip-btn"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="save-slip-btn"
              className={styles.saveBtn}
              disabled={loading}
            >
              {loading ? "Salvando…" : editingSlip ? "Atualizar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalRoot
  );
}
