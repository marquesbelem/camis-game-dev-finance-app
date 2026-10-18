"use client";

import React, { useState } from "react";
import { Pet } from "@/lib/types";
import { Edit2, Trash2, Calendar, Scale, ShieldCheck, Copy, Check } from "lucide-react";
import styles from "./PetProfileCard.module.css";

interface PetProfileCardProps {
  pet: Pet;
  onEdit: (pet: Pet) => void;
  onDelete: (petId: string, petName: string) => void;
}

function calculateAge(birthDateStr: string | null): string {
  if (!birthDateStr) return "Não informada";
  const birth = new Date(birthDateStr);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) return "Data futura";
  if (years === 0 && months === 0) return "Recém-nascido";
  if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
  if (months === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function PetProfileCard({ pet, onEdit, onDelete }: PetProfileCardProps) {
  const [copiedRga, setCopiedRga] = useState(false);

  function handleCopyRga() {
    if (!pet.rga) return;
    navigator.clipboard.writeText(pet.rga);
    setCopiedRga(true);
    setTimeout(() => setCopiedRga(false), 2000);
  }

  const age = calculateAge(pet.birthDate);
  const avatar = pet.photoUrl || (pet.species === "Gato" ? "🐱" : "🐶");

  return (
    <article className={styles.card} aria-label={`Perfil de ${pet.name}`}>
      <div className={styles.glowDecor} aria-hidden="true" />

      <header className={styles.headerRow}>
        <div className={styles.petIdentity}>
          <div className={styles.avatarWrapper} aria-hidden="true">
            {avatar}
          </div>
          <div className={styles.titleArea}>
            <h2 className={styles.petName}>{pet.name}</h2>
            <p className={styles.speciesBadge}>
              {pet.species || "Pet"} {pet.breed ? `• ${pet.breed}` : ""}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => onEdit(pet)}
            title="Editar informações do pet"
            aria-label={`Editar ${pet.name}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.deleteBtn}`}
            onClick={() => onDelete(pet.id, pet.name)}
            title="Excluir pet"
            aria-label={`Excluir ${pet.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Stats Grid: Birth date / Age, Weight, RGA */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            <Calendar size={13} />
            Idade
          </span>
          <span className={styles.statValue}>{age}</span>
          {pet.birthDate && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>
              {formatDate(pet.birthDate)}
            </span>
          )}
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            <Scale size={13} />
            Peso
          </span>
          <span className={styles.statValue}>
            {pet.weight ? `${pet.weight.toFixed(1).replace(".", ",")} kg` : "Não registrado"}
          </span>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            <ShieldCheck size={13} />
            RGA (Registro)
          </span>
          <div className={styles.rgaRow}>
            <span className={styles.statValue} style={{ letterSpacing: "0.03em" }}>
              {pet.rga || "Não informado"}
            </span>
            {pet.rga && (
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyRga}
                title={copiedRga ? "Copiado!" : "Copiar RGA"}
                aria-label="Copiar RGA"
              >
                {copiedRga ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {pet.notes && (
        <div className={styles.notesBlock}>
          <strong>Obs:</strong> {pet.notes}
        </div>
      )}
    </article>
  );
}
