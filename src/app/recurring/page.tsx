"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Edit, Trash2, Calendar, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";
import RecurringEditModal from "@/components/RecurringEditModal/RecurringEditModal";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import styles from "./page.module.css";

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

export default function RecurringPage() {
  const [slips, setSlips] = useState<RecurringSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlip, setEditingSlip] = useState<RecurringSlip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { toasts, dismissToast, addToast } = useToasts();

  const loadRecurringSlips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/slips/recurring");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSlips(data);
    } catch {
      addToast({
        title: "Erro",
        message: "Não foi possível carregar as despesas recorrentes.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRecurringSlips();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRecurringSlips]);

  const handleEditClick = (slip: RecurringSlip) => {
    setEditingSlip(slip);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (slip: RecurringSlip) => {
    const message = `Atenção: A exclusão da recorrência de "${slip.title}" impedirá que ela seja gerada a partir do próximo mês. As parcelas anteriores e do mês atual continuarão registradas. Tem certeza de que deseja prosseguir?`;
    if (!confirm(message)) return;

    try {
      const res = await fetch(`/api/slips/recurring?id=${slip.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error();
      }

      addToast({
        title: "Recorrência Excluída",
        message: `A recorrência de "${slip.title}" foi desativada para os próximos meses.`,
        type: "success",
      });

      // Reload
      loadRecurringSlips();
    } catch {
      addToast({
        title: "Erro",
        message: "Não foi possível desativar a recorrência.",
        type: "danger",
      });
    }
  };

  const handleSaveSuccess = () => {
    addToast({
      title: "Recorrência Atualizada",
      message: "Alterações salvas com sucesso! Terão efeito no próximo mês.",
      type: "success",
    });
    loadRecurringSlips();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getNextMonthLabel = () => {
    const today = new Date();
    const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonthDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <>
      <main className={styles.page} id="recurring-main">
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/" className={styles.backBtn} aria-label="Voltar ao painel">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className={styles.pageTitle}>Despesas Recorrentes</h1>
              <p className={styles.pageSubtitle}>
                Gerenciamento de assinaturas e contas mensais fixas 🔄
              </p>
            </div>
          </div>
        </header>

        {/* Global info alert */}
        <div className={styles.infoAlert} role="note">
          <AlertCircle size={18} className={styles.infoIcon} />
          <p className={styles.infoText}>
            Qualquer alteração ou exclusão feita nesta aba passará a ter validade apenas a partir do mês de <strong>{getNextMonthLabel()}</strong>. O histórico passado e do mês atual permanecerá inalterado.
          </p>
        </div>

        {/* List content */}
        {loading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonItem} />
            ))}
          </div>
        ) : slips.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔄</span>
            <p className={styles.emptyTitle}>Nenhuma recorrência ativa</p>
            <p className={styles.emptyHint}>
              Para tornar uma despesa recorrente, ative a opção correspondente ao criá-la no painel principal.
            </p>
          </div>
        ) : (
          <div className={styles.listContainer}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>
                Recorrências Ativas
                <span className={styles.listCount}>{slips.length}</span>
              </h2>
            </div>

            <ul className={styles.recurringList} role="list">
              {slips.map((slip) => {
                const day = slip.recurringDay ?? (slip.dueDate ? parseInt(slip.dueDate.slice(8, 10), 10) : 1);
                return (
                  <li key={slip.id} className={styles.listItem}>
                    {/* Color bar indicator based on category */}
                    <span
                      className={styles.colorBar}
                      style={{ background: slip.category.colorCode }}
                      aria-hidden="true"
                    />

                    <div className={styles.itemBody}>
                      <div className={styles.itemMain}>
                        <h3 className={styles.itemTitle}>{slip.title}</h3>
                        <div className={styles.itemMeta}>
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
                          <span className={styles.metaInfo}>
                            <Calendar size={13} className={styles.metaIcon} />
                            Dia {day} de cada mês
                          </span>
                          {slip.isCreditCardPayment && (
                            <span className={styles.creditBadge} title="Cartão de Crédito">
                              <CreditCard size={12} className={styles.metaIcon} />
                              Cartão
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <span className={styles.amount}>{formatCurrency(slip.amount)}</span>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleEditClick(slip)}
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            title="Editar recorrência"
                            aria-label={`Editar recorrência de ${slip.title}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(slip)}
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="Excluir recorrência"
                            aria-label={`Excluir recorrência de ${slip.title}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingSlip && (
        <RecurringEditModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSlip(null);
          }}
          onSave={handleSaveSuccess}
          slip={editingSlip}
        />
      )}

      {/* Celebration and toasts anchor */}
      <Celebration toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
