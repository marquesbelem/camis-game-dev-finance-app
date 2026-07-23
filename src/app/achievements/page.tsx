"use client";

import React, { useState } from "react";
import { Trophy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AchievementsPanel from "@/components/Achievements/AchievementsPanel";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import styles from "./page.module.css";

export default function AchievementsPage() {
  const { toasts, dismissToast, celebrateAchievement } = useToasts();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backBtn} title="Voltar ao Dashboard">
            <ArrowLeft size={20} />
          </Link>
          <div className={styles.titleInfo}>
            <h1 className={styles.title}>
              <Trophy size={28} className="text-amber-400" />
              Árvore de Conquistas RPG 👑
            </h1>
            <p className={styles.subtitle}>
              Desbloqueie conquistas financeiras, ganhe CapyCoins e XP para evoluir sua capivara!
            </p>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <AchievementsPanel onAchievementUnlocked={(title) => celebrateAchievement(title)} />
      </main>

      <Celebration toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
