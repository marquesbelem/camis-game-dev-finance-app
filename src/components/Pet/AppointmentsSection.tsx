"use client";

import React, { useState, useMemo } from "react";
import { PetAppointment, AppointmentStatusType } from "@/lib/types";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit2,
  Trash2,
  Calendar,
} from "lucide-react";
import styles from "./AppointmentsSection.module.css";

interface AppointmentsSectionProps {
  appointments: PetAppointment[];
  petName: string;
  onAdd: () => void;
  onEdit: (appointment: PetAppointment) => void;
  onDelete: (appointmentId: string, title: string) => void;
  onToggleStatus: (appointmentId: string, currentStatus: AppointmentStatusType) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" });
}

export default function AppointmentsSection({
  appointments,
  petName,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
}: AppointmentsSectionProps) {
  const [tab, setTab] = useState<"UPCOMING" | "ALL">("UPCOMING");

  const todaySPStr = useMemo(() => {
    const today = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    return today.toISOString().slice(0, 10);
  }, []);

  const filtered = useMemo(() => {
    return appointments.filter((app) => {
      if (tab === "UPCOMING") {
        const dStr = app.date.slice(0, 10);
        return dStr >= todaySPStr;
      }
      return true;
    });
  }, [appointments, tab, todaySPStr]);

  function getStatusBadge(status: AppointmentStatusType) {
    if (status === "COMPARECEU") {
      return {
        className: styles.statusCompareceu,
        icon: CheckCircle2,
        label: "Compareceu 🎉",
      };
    }
    if (status === "FALTOU") {
      return {
        className: styles.statusFaltou,
        icon: XCircle,
        label: "Não foi ❌",
      };
    }
    return {
      className: styles.statusPendente,
      icon: HelpCircle,
      label: "Marcar Presença ⏳",
    };
  }

  return (
    <section className={styles.container} aria-label="Compromissos e Creche do Pet">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <CalendarDays className={styles.titleIcon} size={22} />
          <h3 className={styles.title}>Compromissos & Creche</h3>
          <span className={styles.countBadge}>{appointments.length}</span>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={onAdd}
          aria-label="Agendar novo dia de creche ou compromisso"
        >
          <Plus size={16} />
          <span>Novo Compromisso</span>
        </button>
      </header>

      {/* Tabs */}
      <div className={styles.tabsRow} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "UPCOMING"}
          className={`${styles.tabBtn} ${tab === "UPCOMING" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("UPCOMING")}
        >
          Próximos & Hoje
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ALL"}
          className={`${styles.tabBtn} ${tab === "ALL" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("ALL")}
        >
          Todos / Histórico ({appointments.length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎒</span>
          <p className={styles.emptyText}>
            Nenhum compromisso {tab === "UPCOMING" ? "agendado para os próximos dias" : `cadastrado para ${petName}`}.
          </p>
          <p className={styles.emptySubtext}>
            Adicione os dias que ela vai para a creche, veterinário ou banho para receber lembretes e registrar presença!
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((app) => {
            const isToday = app.date.slice(0, 10) === todaySPStr;
            const statusInfo = getStatusBadge(app.status);
            const StatusIcon = statusInfo.icon;

            return (
              <li
                key={app.id}
                className={`${styles.card} ${isToday ? styles.cardToday : ""}`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardIdentity}>
                    <h4 className={styles.cardTitle}>{app.title}</h4>
                    {isToday && <span className={styles.todayBadge}>Hoje! 🐾</span>}
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={() => onEdit(app)}
                      title="Editar compromisso"
                      aria-label={`Editar ${app.title}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniBtn} ${styles.deleteBtn}`}
                      onClick={() => onDelete(app.id, app.title)}
                      title="Excluir compromisso"
                      aria-label={`Excluir ${app.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.detailsRow}>
                  <div className={styles.datetimeGroup}>
                    <div className={styles.dateItem}>
                      <Calendar size={14} />
                      <span>{formatDate(app.date)}</span>
                    </div>
                    {app.time && (
                      <div className={styles.dateItem}>
                        <Clock size={14} />
                        <span>{app.time}</span>
                      </div>
                    )}
                  </div>

                  {/* 1-click status toggler button */}
                  <button
                    type="button"
                    className={`${styles.statusToggler} ${statusInfo.className}`}
                    onClick={() => onToggleStatus(app.id, app.status)}
                    title="Clique para alternar presença (Pendente → Compareceu → Não foi)"
                    aria-label={`Status: ${app.status}. Clique para alternar`}
                  >
                    <StatusIcon size={14} />
                    <span>{statusInfo.label}</span>
                  </button>
                </div>

                {app.notes && <p className={styles.notes}>{app.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
