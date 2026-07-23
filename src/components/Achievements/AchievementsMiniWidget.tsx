"use client";

import React, { useState, useEffect } from "react";
import { Trophy, ArrowRight, Award } from "lucide-react";
import Link from "next/link";
import styles from "./AchievementsMiniWidget.module.css";

export default function AchievementsMiniWidget() {
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(18);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await fetch("/api/achievements");
      if (res.ok) {
        const achData = await res.json();
        if (Array.isArray(achData)) {
          setTotalCount(achData.length);
          setUnlockedCount(achData.filter((a: any) => a.isUnlocked).length);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar mini widget de conquistas:", err);
    } finally {
      setLoading(false);
    }
  }

  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (loading) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Trophy size={20} className="text-amber-400" />
          <h3 className={styles.title}>Árvore de Conquistas</h3>
        </div>
        <span className={styles.badge}>
          {unlockedCount}/{totalCount} Concluídas
        </span>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.labelsRow}>
          <span>Progresso Total</span>
          <span>{pct}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Link href="/achievements" className={styles.actionBtn}>
        <Award size={16} />
        <span>Ver Árvore Completa & Prêmios</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
