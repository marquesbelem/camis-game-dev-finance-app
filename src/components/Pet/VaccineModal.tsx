"use client";

import React, { useState, useEffect } from "react";
import { PetVaccine } from "@/lib/types";
import { X, Bell, DollarSign } from "lucide-react";
import DateInput from "@/components/ui/DateInput";
import styles from "./VaccineModal.module.css";

interface VaccineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedVaccine: PetVaccine) => void;
  petId: string;
  petName: string;
  editingVaccine?: PetVaccine | null;
}

const COMMON_NAMES = [
  "V10 (Múltipla)",
  "V8 (Múltipla)",
  "Antirrábica",
  "Giárdia",
  "Gripe Canina (Tosse dos Canis)",
  "Drontal Plus (Vermífugo)",
  "Bravecto (Antipulgas/Carrapatos)",
  "NexGard Spectra",
  "Simparic",
  "Milbemax (Vermífugo)",
];

export default function VaccineModal({
  isOpen,
  onClose,
  onSave,
  petId,
  petName,
  editingVaccine,
}: VaccineModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("VACINA");
  const [applicationDate, setApplicationDate] = useState("");
  const [boosterDate, setBoosterDate] = useState("");
  const [boosterDone, setBoosterDone] = useState(false);
  const [isExpense, setIsExpense] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (editingVaccine) {
      setName(editingVaccine.name);
      setType(editingVaccine.type);
      setApplicationDate(editingVaccine.applicationDate.slice(0, 10));
      setBoosterDate(editingVaccine.boosterDate ? editingVaccine.boosterDate.slice(0, 10) : "");
      setBoosterDone(Boolean(editingVaccine.boosterDone));
      setIsExpense(editingVaccine.isExpense);
      setAmount(editingVaccine.amount !== null ? String(editingVaccine.amount) : "");
      setNotes(editingVaccine.notes || "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setName("");
      setType("VACINA");
      setApplicationDate(today);
      setBoosterDate("");
      setBoosterDone(false);
      setIsExpense(false);
      setAmount("");
      setNotes("");
    }
    setErrorMsg("");
  }, [editingVaccine, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("O nome da vacina/vermífugo é obrigatório.");
      return;
    }
    if (!applicationDate) {
      setErrorMsg("A data de aplicação é obrigatória.");
      return;
    }

    if (isExpense) {
      const parsed = parseFloat(amount.replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) {
        setErrorMsg("Por favor, informe um valor válido para a despesa.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = editingVaccine
        ? `/api/pets/${petId}/vaccines/${editingVaccine.id}`
        : `/api/pets/${petId}/vaccines`;
      const method = editingVaccine ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          applicationDate,
          boosterDate: boosterDate || null,
          boosterDone: Boolean(boosterDone),
          isExpense,
          amount: isExpense && amount ? parseFloat(amount.replace(",", ".")) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar vacina.");
      }

      const saved = await res.json();
      onSave(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectSuggestion(sug: string) {
    setName(sug);
    if (sug.toLowerCase().includes("vermífugo") || sug.toLowerCase().includes("drontal") || sug.toLowerCase().includes("milbemax")) {
      setType("VERMIFUGO");
    } else if (sug.toLowerCase().includes("bravecto") || sug.toLowerCase().includes("nexgard") || sug.toLowerCase().includes("simparic")) {
      setType("OUTRO");
    } else {
      setType("VACINA");
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h3 className={styles.title}>
            {editingVaccine ? "Editar Registro de Vacina" : `Nova Vacina para ${petName} 💉`}
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formBody}>
            {errorMsg && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>{errorMsg}</div>
            )}

          <div className={styles.fieldGroup}>
            <label htmlFor="vaccine-name-input" className={styles.label}>
              Nome da Vacina / Vermífugo *
            </label>
            <input
              id="vaccine-name-input"
              type="text"
              className={styles.input}
              placeholder="Ex: V10, Antirrábica, Drontal Plus..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            {/* Suggestions */}
            <div className={styles.suggestionsRow}>
              {COMMON_NAMES.slice(0, 5).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  className={styles.suggestionChip}
                  onClick={() => handleSelectSuggestion(sug)}
                >
                  {sug.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="vaccine-type-select" className={styles.label}>
                Tipo
              </label>
              <select
                id="vaccine-type-select"
                className={styles.select}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="VACINA">Vacina 💉</option>
                <option value="VERMIFUGO">Vermífugo 💊</option>
                <option value="OUTRO">Antipulgas / Outro 🛡️</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="vaccine-app-date" className={styles.label}>
                Data da Aplicação *
              </label>
              <DateInput
                id="vaccine-app-date"
                value={applicationDate}
                onChange={(val) => setApplicationDate(val)}
                required
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="vaccine-booster-date" className={styles.label}>
              Data do Próximo Reforço (Opcional)
            </label>
            <DateInput
              id="vaccine-booster-date"
              value={boosterDate}
              onChange={(val) => setBoosterDate(val)}
            />
            <span className={styles.helperText}>
              <Bell size={13} />
              Você receberá notificação push e alertas no app quando o reforço estiver perto!
            </span>
            {boosterDate && (
              <label className={styles.checkboxLabel} style={{ marginTop: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={boosterDone}
                  onChange={(e) => setBoosterDone(e.target.checked)}
                />
                <span>Marcar que este reforço já foi realizado</span>
              </label>
            )}
          </div>

          {/* Expense Section */}
          <div className={styles.expenseSection}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={isExpense}
                onChange={(e) => setIsExpense(e.target.checked)}
              />
              <DollarSign size={16} />
              <span>Registrar como despesa financeira (gasto)</span>
            </label>

            {isExpense && (
              <div className={styles.expenseFields}>
                <div className={styles.rowTwo}>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="vaccine-amount" className={styles.label}>
                      Valor Pago (R$) *
                    </label>
                    <input
                      id="vaccine-amount"
                      type="text"
                      className={styles.input}
                      placeholder="Ex: 120,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required={isExpense}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Categoria</label>
                    <input
                      type="text"
                      className={styles.input}
                      value="Pet 🐶 (Padrão automático)"
                      disabled
                      style={{ opacity: 0.8, cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                <p className={styles.expenseNotice}>
                  ✨ Esta despesa aparecerá automaticamente na lista geral de despesas do mês ({applicationDate.slice(0, 7)}), somando no seu orçamento financeiro.
                </p>
              </div>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="vaccine-notes" className={styles.label}>
              Observações (Lote, Veterinário, Clínica...)
            </label>
            <textarea
              id="vaccine-notes"
              className={styles.textarea}
              placeholder="Ex: Aplicada na Clínica PetCare, veterinária Dra. Paula..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          </div>

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Salvando..." : editingVaccine ? "Salvar Alterações" : "Adicionar Vacina"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
