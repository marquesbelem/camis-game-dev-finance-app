"use client";

import React, { useState, useEffect } from "react";
import { Flame, Shield, Trophy } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./StreakFlameCard.module.css";

interface StreakData {
  currentStreak: number;
  highestStreak: number;
  shields: number;
  nextMilestone?: { days: number; xp: number; coins: number; title: string };
  milestones: Array<{ days: number; xp: number; coins: number; title: string }>;
}

export default function StreakFlameCard() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreakData();
  }, []);

  async function loadStreakData() {
    try {
      const userId = localStorage.getItem("user_id") || "demo-user";
      const res = await fetch("/api/user/streak", {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar streak:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Flame size={20} className="text-amber-500" />
          <h3 className={styles.title}>Chama de Consistência</h3>
        </div>
        <div className={styles.shieldBadge} title="Escudo mensal de proteção de streak">
          <Shield size={14} /> {data.shields} Escudo{data.shields !== 1 ? "s" : ""}
        </div>
      </div>

      <div className={styles.streakHero} onClick={() => playSound("streak")} style={{ cursor: "pointer" }} title="Ouvir chama">
        <div className={styles.flameIcon}>🔥</div>
        <div className={styles.streakMeta}>
          <span className={styles.streakDays}>{data.currentStreak} dias seguidos</span>
          <span className={styles.streakSub}>
            Recorde: {data.highestStreak} dias <Trophy size={12} style={{ display: "inline" }} />
          </span>
        </div>
      </div>

      {/* Milestones */}
      <div className={styles.milestonesList}>
        {data.milestones.map((m) => {
          const isAchieved = data.currentStreak >= m.days;
          return (
            <div
              key={m.days}
              className={`${styles.milestoneItem} ${isAchieved ? styles.milestoneAchieved : ""}`}
            >
              <span className={styles.milestoneDays}>{m.days}d</span>
              <span>+{m.coins}🪙</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
