"use client";

import { useState } from "react";
import { Pencil, Trash2, FileText, AlertCircle, CheckCircle2, Clock, Repeat, Calendar, Lock } from "lucide-react";
import DeleteRecurringModal from "../DeleteRecurringModal/DeleteRecurringModal";
import { playSound } from "@/lib/sounds";
import styles from "./SlipItem.module.css";

interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
}

export interface Slip {
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
  slip: Slip;
  onEdit: (slip: Slip) => void;
  onDelete: (id: string, deleteAll?: boolean) => void;
  onStatusToggle: (slip: Slip) => void;
}

function getSlipState(slip: Slip): "paid" | "overdue" | "pending" | "reserved" {
  if (slip.status === "PAGO") return "paid";
  if (slip.status === "RESERVADO") return "reserved";
  const dueStr = slip.dueDate.slice(0, 10);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  if (dueStr < todayStr) return "overdue";
  return "pending";
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const dateStr = iso.slice(0, 10);
  const [y, m, d] = dateStr.split("-");
  if (y && m && d && y.length === 4) {
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function SlipItem({ slip, onEdit, onDelete, onStatusToggle }: Props) {
  const state = getSlipState(slip);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  function handleToggleClick() {
    if (slip.status === "PENDENTE") {
      playSound("paid");
    } else {
      playSound("toast_info");
    }
    onStatusToggle(slip);
  }

  function handleDeleteClick() {
    setIsDeleteModalOpen(true);
  }

  const StateIcon =
    state === "paid"
      ? CheckCircle2
      : state === "reserved"
        ? Lock
        : state === "overdue"
          ? AlertCircle
          : Clock;

  const isOverdue = slip.status !== "PAGO" && slip.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

  return (
    <>
      <DeleteRecurringModal
        isOpen={isDeleteModalOpen}
        expenseTitle={slip.title}
        isRecurring={slip.isRecurring}
        isInstallment={slip.isInstallment && !!slip.installmentGroupId}
        installmentNumber={slip.installmentNumber}
        installmentTotal={slip.installmentTotal}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={(deleteFuture) => onDelete(slip.id, deleteFuture)}
      />
      <article
        className={`${styles.item} ${styles[`state_${state}`]}`}
        aria-label={`Despesa: ${slip.title}`}
      >
        {/* Color accent bar */}
        <span
          className={styles.colorBar}
          style={{ background: slip.category.colorCode }}
          aria-hidden="true"
        />

        {/* Main content */}
        <div className={styles.body}>
          {/* Top row */}
          <div className={styles.topRow}>
            <div className={styles.titleContainer}>
              <div className={styles.titleHeader}>
                <StateIcon
                  size={18}
                  className={`${styles.stateIcon} ${styles[`stateIcon_${state}`]}`}
                  aria-hidden="true"
                />
                <h3 className={styles.title}>{slip.title}</h3>
              </div>

              <div className={styles.badgesRow}>
                {slip.isRecurring && (
                  <span className={styles.recurringBadge} title="Despesa Recorrente">
                    <Repeat size={12} />
                  </span>
                )}
                {slip.isInstallment && (
                  <span className={styles.installmentBadge} title={`Parcela ${slip.installmentNumber}/${slip.installmentTotal}`}>
                    <Calendar size={12} />
                    <span>{slip.installmentNumber}/{slip.installmentTotal}</span>
                  </span>
                )}
              </div>
            </div>

            <span className={styles.amount}>{formatCurrency(slip.amount)}</span>
          </div>

          {/* Meta row */}
          <div className={styles.metaRow}>
            <span
              className={styles.categoryTag}
              style={{
                background: `${slip.category.colorCode}22`,
                color: slip.category.colorCode,
                borderColor: `${slip.category.colorCode}44`,
              }}
            >
              {slip.category.name}
            </span>

            {(() => {
              const isPending = slip.status === "PENDENTE" || slip.status === "RESERVADO";
              const dueStr = slip.dueDate.slice(0, 10);
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              const dd = String(today.getDate()).padStart(2, "0");
              const todayStr = `${yyyy}-${mm}-${dd}`;

              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tyyyy = tomorrow.getFullYear();
              const tmm = String(tomorrow.getMonth() + 1).padStart(2, "0");
              const tdd = String(tomorrow.getDate()).padStart(2, "0");
              const tomorrowStr = `${tyyyy}-${tmm}-${tdd}`;

              const isDueTomorrow = isPending && dueStr === tomorrowStr;
              const isOverdueTag = isPending && dueStr < todayStr;

              return (
                <span className={`${styles.dueDateTag} ${isDueTomorrow ? styles.dueDateTagTomorrow :
                    isOverdueTag ? styles.dueDateTagOverdue : ""
                  }`}>
                  Vence {formatDate(slip.dueDate)}
                </span>
              );
            })()}

            {slip.documentPath && (
              <a
                href={slip.documentPath}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.docLink}
                title="Ver documento anexo"
                id={`doc-link-${slip.id}`}
              >
                <FileText size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Status toggle */}
          <button
            id={`toggle-status-${slip.id}`}
            className={`${styles.actionBtn} ${state === "paid" ? styles.paidBtn : state === "reserved" ? styles.reservedBtn : styles.pendingBtn}`}
            onClick={handleToggleClick}
            title={state === "paid" ? "Marcar como pendente" : state === "reserved" ? "Marcar como pago" : "Marcar como reservado"}
            aria-label={state === "paid" ? "Marcar como pendente" : state === "reserved" ? "Marcar como pago" : "Marcar como reservado"}
          >
            {state === "paid" ? <Clock size={15} /> : state === "reserved" ? <CheckCircle2 size={15} /> : <Lock size={15} />}
          </button>

          <button
            id={`edit-slip-${slip.id}`}
            className={`${styles.actionBtn} ${styles.editBtn}`}
            onClick={() => onEdit(slip)}
            title="Editar despesa"
            aria-label={`Editar ${slip.title}`}
          >
            <Pencil size={15} />
          </button>

          <button
            id={`delete-slip-${slip.id}`}
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDeleteClick}
            title="Excluir despesa"
            aria-label={`Excluir ${slip.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </article>
    </>
  );
}
