"use client";

import React, { useState, useMemo } from "react";
import { PetVaccine } from "@/lib/types";
import {
  Syringe,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Edit2,
  Trash2,
} from "lucide-react";
import styles from "./VaccineCalendar.module.css";

interface VaccineCalendarProps {
  vaccines: PetVaccine[];
  petName: string;
  onAdd: () => void;
  onEdit: (vaccine: PetVaccine) => void;
  onDelete: (vaccineId: string, vaccineName: string) => void;
  onToggleBooster?: (vaccineId: string, currentStatus: boolean) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VaccineCalendar({
  vaccines,
  petName,
  onAdd,
  onEdit,
  onDelete,
  onToggleBooster,
}: VaccineCalendarProps) {
  const [filter, setFilter] = useState<"ALL" | "VACINA" | "VERMIFUGO" | "UPCOMING">("ALL");

  const todaySPStr = useMemo(() => {
    const today = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    return today.toISOString().slice(0, 10);
  }, []);

  const filteredVaccines = useMemo(() => {
    return vaccines.filter((vac) => {
      if (filter === "VACINA") return vac.type === "VACINA";
      if (filter === "VERMIFUGO") return vac.type === "VERMIFUGO";
      if (filter === "UPCOMING") {
        if (!vac.boosterDate || vac.boosterDone) return false;
        const bStr = vac.boosterDate.slice(0, 10);
        return bStr >= todaySPStr;
      }
      return true;
    });
  }, [vaccines, filter, todaySPStr]);

  function getBoosterInfo(boosterDateStr: string | null, boosterDone?: boolean) {
    if (!boosterDateStr) {
      return {
        badgeClass: styles.boosterNone,
        icon: CheckCircle2,
        text: "Dose única / Sem reforço",
        isDone: false,
      };
    }

    if (boosterDone) {
      return {
        badgeClass: styles.boosterDone,
        icon: CheckCircle2,
        text: `Reforço Realizado (${formatDate(boosterDateStr)})`,
        isDone: true,
      };
    }

    const boosterDate = new Date(boosterDateStr);
    const boosterDayStr = boosterDate.toISOString().slice(0, 10);
    const now = new Date();
    const diffTime = boosterDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (boosterDayStr < todaySPStr) {
      return {
        badgeClass: styles.boosterOverdue,
        icon: AlertTriangle,
        text: `Reforço atrasado (${formatDate(boosterDateStr)})`,
        isDone: false,
      };
    }

    if (diffDays <= 0) {
      return {
        badgeClass: styles.boosterSoon,
        icon: AlertTriangle,
        text: "Reforço vence hoje! 💉",
        isDone: false,
      };
    }

    if (diffDays <= 15) {
      return {
        badgeClass: styles.boosterSoon,
        icon: Clock,
        text: `Reforço em ${diffDays} dia${diffDays > 1 ? "s" : ""} (${formatDate(boosterDateStr)})`,
        isDone: false,
      };
    }

    return {
      badgeClass: styles.boosterGood,
      icon: Calendar,
      text: `Reforço em ${formatDate(boosterDateStr)}`,
      isDone: false,
    };
  }

  return (
    <section className={styles.container} aria-label="Calendário de Vacinas e Vermifugação">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <Syringe className={styles.titleIcon} size={22} />
          <h3 className={styles.title}>Vacinas & Vermifugação</h3>
          <span className={styles.countBadge}>{vaccines.length}</span>
        </div>

        <button
          type="button"
          className={styles.addBtn}
          onClick={onAdd}
          aria-label="Registrar nova vacina ou vermífugo"
        >
          <Plus size={16} />
          <span>Nova Vacina</span>
        </button>
      </header>

      {/* Filter Chips */}
      <div className={styles.filtersRow} role="tablist" aria-label="Filtros de vacinas">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "ALL"}
          className={`${styles.filterChip} ${filter === "ALL" ? styles.filterChipActive : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Todas ({vaccines.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "VACINA"}
          className={`${styles.filterChip} ${filter === "VACINA" ? styles.filterChipActive : ""}`}
          onClick={() => setFilter("VACINA")}
        >
          Vacinas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "VERMIFUGO"}
          className={`${styles.filterChip} ${filter === "VERMIFUGO" ? styles.filterChipActive : ""}`}
          onClick={() => setFilter("VERMIFUGO")}
        >
          Vermífugos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "UPCOMING"}
          className={`${styles.filterChip} ${filter === "UPCOMING" ? styles.filterChipActive : ""}`}
          onClick={() => setFilter("UPCOMING")}
        >
          Próximos Reforços
        </button>
      </div>

      {/* Vaccines list */}
      {filteredVaccines.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💉</span>
          <p className={styles.emptyText}>
            Nenhuma vacina ou vermífugo {filter !== "ALL" ? "com este filtro" : `cadastrado para ${petName}`}.
          </p>
          <p className={styles.emptySubtext}>
            Mantenha a saúde em dia registrando doses e programando reforços!
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filteredVaccines.map((vac) => {
            const boosterInfo = getBoosterInfo(vac.boosterDate, vac.boosterDone);
            const BoosterIcon = boosterInfo.icon;

            const typeClass =
              vac.type === "VERMIFUGO"
                ? styles.typeBadgeVermifugo
                : vac.type === "OUTRO"
                ? styles.typeBadgeOutro
                : styles.typeBadgeVacina;

            const typeLabel =
              vac.type === "VERMIFUGO"
                ? "Vermífugo"
                : vac.type === "OUTRO"
                ? "Outro"
                : "Vacina";

            return (
              <li key={vac.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <div className={styles.itemMeta}>
                    <h4 className={styles.itemName}>{vac.name}</h4>
                    <span className={`${styles.typeBadge} ${typeClass}`}>{typeLabel}</span>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={() => onEdit(vac)}
                      title="Editar vacina"
                      aria-label={`Editar ${vac.name}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.miniBtn} ${styles.deleteBtn}`}
                      onClick={() => onDelete(vac.id, vac.name)}
                      title="Excluir vacina"
                      aria-label={`Excluir ${vac.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.datesRow}>
                  <div className={styles.dateItem}>
                    <Calendar size={14} color="#94a3b8" />
                    <span>Aplicada em: <strong>{formatDate(vac.applicationDate)}</strong></span>
                  </div>

                  {vac.boosterDate ? (
                    <button
                      type="button"
                      className={`${styles.boosterToggler} ${boosterInfo.badgeClass}`}
                      onClick={() => onToggleBooster && onToggleBooster(vac.id, !!vac.boosterDone)}
                      title={
                        vac.boosterDone
                          ? "Reforço marcado como feito. Clique para desmarcar se necessário."
                          : "Clique para marcar que o reforço foi realizado!"
                      }
                      aria-label={
                        vac.boosterDone
                          ? `Reforço de ${vac.name} realizado. Clique para desmarcar.`
                          : `Marcar reforço de ${vac.name} como feito`
                      }
                    >
                      <BoosterIcon size={13} />
                      <span>{boosterInfo.text}</span>
                      <span className={styles.boosterActionBadge}>
                        {vac.boosterDone ? "✓ Feito" : "Marcar Feito"}
                      </span>
                    </button>
                  ) : (
                    <div className={`${styles.boosterBadge} ${boosterInfo.badgeClass}`}>
                      <BoosterIcon size={13} />
                      <span>{boosterInfo.text}</span>
                    </div>
                  )}
                </div>

                {vac.isExpense && vac.amount && (
                  <div className={styles.expenseBar}>
                    <DollarSign size={14} />
                    <span>Despesa: <strong className={styles.expenseValue}>{formatCurrency(vac.amount)}</strong></span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.85, marginLeft: "auto" }}>
                      ✓ Integrado às despesas
                    </span>
                  </div>
                )}

                {vac.notes && <p className={styles.itemNotes}>{vac.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
