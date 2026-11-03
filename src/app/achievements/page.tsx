"use client";

import React from "react";
import AchievementsPanel from "@/components/Achievements/AchievementsPanel";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";

export default function AchievementsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { toasts, dismissToast, addToast } = useToasts();

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 5rem" }}>
      <Celebration toasts={toasts} onDismiss={dismissToast} />
      <AchievementsPanel
        selectedMonth={currentMonth}
        onAchievementUnlocked={(ach: any) => {
          addToast({
            title: `🏆 Conquista Desbloqueada!`,
            message: typeof ach === "object" ? ach?.title || "" : String(ach),
            type: "success",
          });
        }}
      />
    </main>
  );
}
