"use client";

import React, { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./MonsterCard.module.css";

interface BattleSlashProps {
  amount: number;
  onComplete?: () => void;
}

export function BattleSlash({ amount, onComplete }: BattleSlashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    playSound("quest_claim");
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  const formattedAmount = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <>
      <div className={styles.slashOverlay}>
        <div className={styles.slashLine} />
        <div className={styles.damageText}>-{formattedAmount}! ⚔️</div>
      </div>
      <div className={styles.bossDefeatedBanner}>
        <Swords size={22} />
        <span>DESPESA MONSTRO DERROTADA! +25 XP</span>
      </div>
    </>
  );
}

export function MonsterBadge({
  isOverdue,
  isCreditCard,
  isRecurring,
}: {
  isOverdue?: boolean;
  isCreditCard?: boolean;
  isRecurring?: boolean;
}) {
  if (isOverdue) {
    return (
      <span className={`${styles.monsterBadge} ${styles.badgeOverdue}`} title="Monstro dos Juros">
        👹 Monstro dos Juros
      </span>
    );
  }

  if (isCreditCard) {
    return (
      <span className={`${styles.monsterBadge} ${styles.badgeCredit}`} title="Fantasma da Fatura">
        🐲 Fantasma da Fatura
      </span>
    );
  }

  if (isRecurring) {
    return (
      <span className={`${styles.monsterBadge} ${styles.badgeRecurring}`} title="Lorde da Recorrência">
        👺 Lorde Recorrente
      </span>
    );
  }

  return null;
}
