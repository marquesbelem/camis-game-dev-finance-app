"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, Sparkles, Award } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./Celebration.module.css";

export interface Toast {
  id: string;
  title: string;
  message: string;
  type?: "success" | "warning" | "danger" | "info" | "xp" | "levelup";
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

// ── Toast Host ───────────────────────────────────────────────────────────────
export default function Celebration({
  toasts,
  onDismiss,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const portalRoot = document.getElementById("portal-root");
  if (!portalRoot) return null;

  return createPortal(
    <div className={styles.host} aria-live="assertive" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    portalRoot
  );
}

// ── Individual Toast ───────────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 320);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    // Play sound when toast appears
    if (toast.type === "levelup") playSound("toast_levelup");
    else if (toast.type === "xp") playSound("toast_xp");
    else if (toast.type === "danger") playSound("toast_danger");
    else if (toast.type === "info") playSound("toast_info");
    else playSound("toast_success");

    // Keep XP toasts visible for 3.5s, Levelups for 6s, others 5s
    const duration = toast.type === "levelup" ? 6000 : toast.type === "xp" ? 3500 : 5000;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, toast.type]);

  const getToastIcon = () => {
    if (toast.type === "levelup") return <Award size={22} className={styles.glowIcon} />;
    if (toast.type === "xp") return <Sparkles size={20} />;
    return <Trophy size={20} />;
  };

  return (
    <div
      className={`${styles.toast} ${styles[`toast_${toast.type ?? "success"}`]} ${
        exiting ? styles.exiting : ""
      }`}
      role="alert"
      aria-label={toast.title}
    >
      {/* Particle Explosion on render */}
      <div className={styles.particles} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className={styles.particle}
            style={
              {
                "--i": i,
                "--color":
                  toast.type === "levelup"
                    ? "#8F6BF0"
                    : toast.type === "xp"
                    ? "#6366f1"
                    : "#f59e0b",
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Icon */}
      <div className={styles.iconWrap}>{getToastIcon()}</div>

      {/* Content */}
      <div className={styles.content}>
        <strong className={styles.toastTitle}>{toast.title}</strong>
        <span className={styles.toastMsg}>{toast.message}</span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar} />

      {/* Dismiss */}
      <button
        id={`dismiss-toast-${toast.id}`}
        className={styles.dismissBtn}
        onClick={dismiss}
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── useToasts hook ─────────────────────────────────────────────────────────────
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    setToasts((prev) => [...prev, { ...toast, id: crypto.randomUUID() }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const celebrateAchievement = useCallback((_title: string) => {}, []);
  const showXpToast = useCallback((_xpGained: number, _message: string) => {}, []);
  const showLevelUpToast = useCallback((_newLevel: number) => {}, []);

  return {
    toasts,
    addToast,
    dismissToast,
    celebrateAchievement,
    showXpToast,
    showLevelUpToast,
  };
}

