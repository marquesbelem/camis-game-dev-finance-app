"use client";

import { useState, useCallback, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import type { CategoryWithCount } from "@/lib/types";
import styles from "./CategoryCard.module.css";

interface Props {
  category: CategoryWithCount;
  onEdit: (category: CategoryWithCount) => void;
  onDelete: (id: string) => void;
}

// Resolve icon string → Lucide component at runtime
function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const Icon = icons[name];
  if (!Icon) return <LucideIcons.Tag size={size} />;
  return <Icon size={size} />;
}

export default function CategoryCard({ category, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  const slipCount = category._count.slips;

  const handleDeleteClick = useCallback(() => {
    if (category.name === "Sem Categoria") return;
    const isConfirmed = window.confirm(
      `Tem certeza que deseja excluir a categoria "${category.name}"?\nTodas as despesas associadas a ela serão movidas para "Sem Categoria".`
    );
    if (isConfirmed) {
      setDeleting(true);
      onDelete(category.id);
    }
  }, [category.id, category.name, onDelete]);

  const handleEditClick = useCallback(() => {
    if (category.name === "Sem Categoria") return;
    onEdit(category);
  }, [category, onEdit]);

  const swatchStyle = useMemo(() => ({
    background: category.colorCode,
    boxShadow: `0 0 12px ${category.colorCode}55`,
  }), [category.colorCode]);

  const accentStyle = useMemo(() => ({
    background: category.colorCode,
  }), [category.colorCode]);

  const badgeStyle = useMemo(() => ({
    background: `${category.colorCode}22`,
    color: category.colorCode,
    border: `1px solid ${category.colorCode}44`,
  }), [category.colorCode]);

  return (
    <article
      className={`${styles.card} ${deleting ? styles.cardDeleting : ""}`}
      aria-label={`Categoria: ${category.name}`}
    >
      {/* Color accent bar */}
      <span className={styles.accentBar} style={accentStyle} aria-hidden="true" />

      {/* Card body */}
      <div className={styles.body}>
        {/* Icon + color swatch row */}
        <div className={styles.topRow}>
          <div className={styles.iconWrap} style={{ color: category.colorCode }}>
            <CategoryIcon name={category.iconRef} size={22} />
          </div>
          <span
            className={styles.swatch}
            style={swatchStyle}
            title={category.colorCode}
            aria-label={`Cor: ${category.colorCode}`}
          />
          {category.isSystemDefault && (
            <span className={styles.systemBadge} title="Categoria padrão do sistema">
              <ShieldCheck size={13} />
            </span>
          )}
        </div>

        {/* Category name */}
        <h3 className={styles.name}>{category.name}</h3>

        {/* Slip count */}
        <span className={styles.slipCount} style={badgeStyle}>
          {slipCount} {slipCount === 1 ? "despesa" : "despesas"}
        </span>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          id={`edit-category-${category.id}-btn`}
          className={`${styles.actionBtn} ${styles.editBtn}`}
          onClick={handleEditClick}
          aria-label={`Editar ${category.name}`}
          title="Editar categoria"
          disabled={category.name === "Sem Categoria"}
          style={category.name === "Sem Categoria" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          <Pencil size={15} />
        </button>

        {!category.isSystemDefault && (
          <button
            id={`delete-category-${category.id}-btn`}
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDeleteClick}
            aria-label={`Excluir ${category.name}`}
            title="Excluir categoria"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

    </article>
  );
}
