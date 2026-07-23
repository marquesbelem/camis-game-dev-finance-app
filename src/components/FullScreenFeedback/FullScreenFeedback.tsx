"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import styles from "./FullScreenFeedback.module.css";

export type FeedbackType = "paid" | "income" | null;

interface Props {
  type: FeedbackType;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

export default function FullScreenFeedback({ type, title, subtitle, onComplete }: Props) {
  const [mounted, setMounted] = useState(false);
  const [activeType, setActiveType] = useState<FeedbackType>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (type) {
      setActiveType(type);
      const timer = setTimeout(() => {
        setActiveType(null);
        if (onComplete) onComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [type, onComplete]);

  if (!mounted || !activeType) return null;

  const isPaid = activeType === "paid";

  const defaultTitle = isPaid ? "Conta Paga com Sucesso!" : "Receita Extra Registrada!";
  const defaultSubtitle = isPaid
    ? "Orçamento atualizado e seguro ✨"
    : "Seu saldo total do mês aumentou 💰";

  return createPortal(
    <div
      className={`${styles.overlay} ${isPaid ? styles.overlayPaid : styles.overlayIncome}`}
      aria-hidden="true"
    >
      {/* Background Pulse Radial Waves */}
      <div className={styles.waveGroup}>
        <div className={styles.wave1} />
        <div className={styles.wave2} />
        <div className={styles.wave3} />
      </div>

      {/* Floating Sparkles & Particles */}
      <div className={styles.particlesContainer}>
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={styles.particle}
            style={
              {
                "--x": `${(i % 6) * 18 + Math.random() * 10 - 45}vw`,
                "--y": `${-20 - Math.random() * 60}vh`,
                "--delay": `${(i * 0.04).toFixed(2)}s`,
                "--size": `${12 + (i % 3) * 8}px`,
                "--color": isPaid
                  ? ["#10b981", "#34d399", "#059669", "#6ee7b7"][i % 4]
                  : ["#f59e0b", "#fbbf24", "#10b981", "#34d399"][i % 4],
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Center Badge Card */}
      <div className={styles.centerBadge}>
        <div className={`${styles.iconWrap} ${isPaid ? styles.iconWrapPaid : styles.iconWrapIncome}`}>
          {isPaid ? (
            <CheckCircle2 className={styles.badgeIcon} size={48} />
          ) : (
            <TrendingUp className={styles.badgeIcon} size={48} />
          )}
          <Sparkles className={styles.sparkleIcon} size={24} />
        </div>

        <h2 className={styles.badgeTitle}>{title || defaultTitle}</h2>
        <p className={styles.badgeSubtitle}>{subtitle || defaultSubtitle}</p>
      </div>
    </div>,
    document.body
  );
}
