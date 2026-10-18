"use client";

import React, { useState } from "react";
import { PetAlert } from "@/lib/types";
import { X } from "lucide-react";
import styles from "./PetAlertBanner.module.css";

interface PetAlertBannerProps {
  alerts: PetAlert[];
}

export default function PetAlertBanner({ alerts }: PetAlertBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
  if (activeAlerts.length === 0) return null;

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  return (
    <aside className={styles.alertContainer} aria-label="Avisos do Pet">
      {activeAlerts.map((alert) => {
        const severityClass = styles[alert.severity] || styles.info;
        const icon =
          alert.type === "VACCINE_OVERDUE"
            ? "🚨"
            : alert.type === "VACCINE_UPCOMING"
            ? "💉"
            : "🎒";

        return (
          <div key={alert.id} className={`${styles.alertItem} ${severityClass}`} role="alert">
            <div className={styles.alertContent}>
              <span className={styles.alertIcon} aria-hidden="true">
                {icon}
              </span>
              <div className={styles.alertText}>
                <span className={styles.alertTitle}>{alert.title}</span>
                <span className={styles.alertMessage}>{alert.message}</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.dismissBtn}
              onClick={() => handleDismiss(alert.id)}
              title="Dispensar aviso"
              aria-label="Dispensar aviso"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </aside>
  );
}
