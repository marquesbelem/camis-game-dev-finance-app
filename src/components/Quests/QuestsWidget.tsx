"use client";

import React, { useState, useEffect } from "react";
import { Target, CheckCircle, Leaf } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./QuestsWidget.module.css";

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  isCompleted: boolean;
  canClaim: boolean;
}

interface QuestsWidgetProps {
  onRewardClaimed?: () => void;
}

export default function QuestsWidget({ onRewardClaimed }: QuestsWidgetProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [capyCoins, setCapyCoins] = useState<number>(0);
  const [isZeroSpendClaimed, setIsZeroSpendClaimed] = useState<boolean>(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    loadQuests();
  }, []);

  async function loadQuests() {
    try {
      const userId = localStorage.getItem("user_id") || "demo-user";
      const res = await fetch("/api/user/quests", {
        headers: { "x-user-id": userId },
      });
      if (res.ok) {
        const data = await res.json();
        setQuests(data.quests || []);
        setCapyCoins(data.capyCoins || 0);
        setIsZeroSpendClaimed(data.isZeroSpendClaimed || false);
      }
    } catch (err) {
      console.error("Erro ao carregar missões:", err);
    }
  }

  async function claimQuest(questId: string) {
    setMessage("");
    setLoadingId(questId);
    try {
      const userId = localStorage.getItem("user_id") || "demo-user";
      const res = await fetch("/api/user/quests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ questId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao resgatar missão");
      }

      const data = await res.json();
      playSound("quest_claim");
      setMessage(data.message || "Recompensa resgatada com sucesso!");

      await loadQuests();
      if (onRewardClaimed) onRewardClaimed();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Target size={18} className="text-emerald-400" />
          <h3 className={styles.title}>Missões Diárias</h3>
        </div>
        <div className={styles.coinsCounter}>
          🪙 {capyCoins} CapyCoins
        </div>
      </div>

      {message && <div className={styles.toast}>{message}</div>}

      {/* Banner Dia Gasto Zero */}
      <div className={styles.zeroSpendBanner}>
        <div className={styles.zeroSpendInfo}>
          <span className={styles.zeroSpendTitle}>
            <Leaf size={14} style={{ display: "inline", marginRight: 4 }} />
            Dia Gasto Zero
          </span>
          <span className={styles.zeroSpendDesc}>
            Não realizou compras extras hoje? Ganhe +30 XP +15 🪙!
          </span>
        </div>

        {isZeroSpendClaimed ? (
          <span className={styles.zeroSpendClaimed}>
            <CheckCircle size={14} /> Resgatado
          </span>
        ) : (
          <button
            className={styles.zeroSpendBtn}
            onClick={() => claimQuest("ZERO_SPEND")}
            disabled={loadingId === "ZERO_SPEND"}
          >
            Resgatar
          </button>
        )}
      </div>

      {/* Outras Missões */}
      <div className={styles.questList}>
        {quests
          .filter((q) => q.id !== "ZERO_SPEND")
          .map((quest) => (
            <div key={quest.id} className={styles.questItem}>
              <div className={styles.questMain}>
                <span className={styles.questTitle}>{quest.title}</span>
                <span className={styles.questDesc}>{quest.description}</span>
                <span className={styles.questReward}>
                  +{quest.xpReward} XP | +{quest.coinReward} 🪙
                </span>
              </div>

              {quest.isCompleted ? (
                <span className={styles.claimedBadge}>
                  <CheckCircle size={14} /> Concluída
                </span>
              ) : (
                <button
                  className={`${styles.claimBtn} ${!quest.canClaim ? styles.disabledClaim : ""}`}
                  onClick={() => quest.canClaim && claimQuest(quest.id)}
                  disabled={!quest.canClaim || loadingId === quest.id}
                >
                  Resgatar
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
