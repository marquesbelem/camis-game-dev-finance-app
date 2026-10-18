"use client";

import React, { useState, useEffect } from "react";
import { PetAppointment, AppointmentStatusType } from "@/lib/types";
import { X, Bell } from "lucide-react";
import DateInput from "@/components/ui/DateInput";
import styles from "./AppointmentModal.module.css";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (saved: PetAppointment) => void;
  petId: string;
  petName: string;
  editingAppointment?: PetAppointment | null;
}

const PRESETS = [
  { label: "Creche 🎒", title: "Dia de Creche", type: "CRECHE" },
  { label: "Veterinário 🩺", title: "Consulta Veterinária", type: "VETERINARIO" },
  { label: "Banho & Tosa ✂️", title: "Banho e Tosa", type: "BANHO_TOSA" },
  { label: "Exame 🔬", title: "Exame Clínico", type: "OUTRO" },
];

export default function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  petId,
  petName,
  editingAppointment,
}: AppointmentModalProps) {
  const [title, setTitle] = useState("Dia de Creche");
  const [type, setType] = useState("CRECHE");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [status, setStatus] = useState<AppointmentStatusType>("PENDENTE");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (editingAppointment) {
      setTitle(editingAppointment.title);
      setType(editingAppointment.type);
      setDate(editingAppointment.date.slice(0, 10));
      setTime(editingAppointment.time || "");
      setStatus(editingAppointment.status);
      setNotes(editingAppointment.notes || "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setTitle("Dia de Creche");
      setType("CRECHE");
      setDate(today);
      setTime("08:00");
      setStatus("PENDENTE");
      setNotes("");
    }
    setErrorMsg("");
  }, [editingAppointment, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("O título do compromisso é obrigatório.");
      return;
    }
    if (!date) {
      setErrorMsg("A data é obrigatória.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = editingAppointment
        ? `/api/pets/${petId}/appointments/${editingAppointment.id}`
        : `/api/pets/${petId}/appointments`;
      const method = editingAppointment ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          date,
          time: time.trim() || null,
          status,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar compromisso.");
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

  function handleSelectPreset(preset: typeof PRESETS[0]) {
    setTitle(preset.title);
    setType(preset.type);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h3 className={styles.title}>
            {editingAppointment ? "Editar Compromisso" : `Agendar Compromisso / Creche (${petName}) 🎒`}
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

          {/* Presets */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tipo Rápido</label>
            <div className={styles.presetsRow}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => handleSelectPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="appointment-title" className={styles.label}>
              Título do Compromisso *
            </label>
            <input
              id="appointment-title"
              type="text"
              className={styles.input}
              placeholder="Ex: Dia de Creche, Consulta, Banho..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="appointment-date" className={styles.label}>
                Data *
              </label>
              <DateInput
                id="appointment-date"
                value={date}
                onChange={(val) => setDate(val)}
                required
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="appointment-time" className={styles.label}>
                Horário (Opcional)
              </label>
              <input
                id="appointment-time"
                type="time"
                className={styles.input}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="appointment-status" className={styles.label}>
              Status da Presença
            </label>
            <select
              id="appointment-status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatusType)}
            >
              <option value="PENDENTE">⏳ Pendente (Aguardando)</option>
              <option value="COMPARECEU">✅ Compareceu (Foi para a creche)</option>
              <option value="FALTOU">❌ Não foi (Faltou)</option>
            </select>
            <span className={styles.helperText}>
              <Bell size={13} />
              Você receberá lembretes pela manhã nos dias agendados!
            </span>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="appointment-notes" className={styles.label}>
              Observações (Mochilinha, Cuidados, Transporte...)
            </label>
            <textarea
              id="appointment-notes"
              className={styles.textarea}
              placeholder="Ex: Levar ração da tarde, buscar às 18h..."
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
              {submitting ? "Salvando..." : editingAppointment ? "Salvar Alterações" : "Adicionar Compromisso"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
