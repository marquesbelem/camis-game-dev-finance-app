"use client";

import React from "react";
import { Activity } from "lucide-react";
import type { Slip } from "../SlipList/SlipItem";
import styles from "./CapyScoreGauge.module.css";

interface CapyScoreGaugeProps {
  slips: Slip[];
  budgetLimit?: number;
  leisureBudget?: number;
}

export function computeCapyScore(
  slips: Slip[],
  budgetLimit: number = 0,
  leisureBudget: number = 0
): {
  score: number;
  billsPts: number;
  budgetPts: number;
  statusLabel: string;
  statusColor: string;
  recommendedMood: "chilling" | "happy" | "nervous" | "party";
} {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Contas em dia (+50 max)
  const overdueCount = slips.filter(
    (s) => s.status !== "PAGO" && s.dueDate.slice(0, 10) < todayStr
  ).length;

  let billsPts = 50;
  if (overdueCount === 1) billsPts = 25;
  else if (overdueCount >= 2) billsPts = 0;

  // 2. Orçamento sob controle (+50 max)
  const totalSpent = slips.reduce((sum, s) => sum + s.amount, 0);
  let budgetPts = 50;
  if (budgetLimit > 0) {
    const ratio = (totalSpent / budgetLimit) * 100;
    if (ratio > 100) budgetPts = 0;
    else if (ratio > 85) budgetPts = 25;
    else budgetPts = 50;
  }

  const score = Math.min(100, Math.max(0, billsPts + budgetPts));

  let statusLabel = "Excelente 🌟";
  let statusColor = "#10b981";
  let recommendedMood: "chilling" | "happy" | "nervous" | "party" = "happy";

  if (score < 30) {
    statusLabel = "Crítico 🚨";
    statusColor = "#ef4444";
    recommendedMood = "nervous";
  } else if (score < 50) {
    statusLabel = "Atenção ⚠️";
    statusColor = "#f59e0b";
    recommendedMood = "nervous";
  } else if (score < 80) {
    statusLabel = "Saudável 💚";
    statusColor = "#3b82f6";
    recommendedMood = "chilling";
  }

  return {
    score,
    billsPts,
    budgetPts,
    statusLabel,
    statusColor,
    recommendedMood,
  };
}

export default function CapyScoreGauge({
  slips,
  budgetLimit = 0,
  leisureBudget = 0,
}: CapyScoreGaugeProps) {
  const { score, billsPts, budgetPts, statusLabel, statusColor } =
    computeCapyScore(slips, budgetLimit, leisureBudget);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Activity size={18} style={{ color: statusColor }} />
          <h3 className={styles.title}>CapyScore</h3>
        </div>
        <span
          className={styles.badge}
          style={{ background: `${statusColor}22`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      <div className={styles.gaugeContainer}>
        {/* SVG Circular Gauge */}
        <div className={styles.gaugeWrapper}>
          <svg className={styles.scoreSvg} viewBox="0 0 90 90">
            <circle
              className={styles.scoreBgCircle}
              cx="45"
              cy="45"
              r={radius}
            />
            <circle
              className={styles.scoreValueCircle}
              cx="45"
              cy="45"
              r={radius}
              style={{
                stroke: statusColor,
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          </svg>
          <div className={styles.scoreText}>
            <span className={styles.scoreNum}>{score}</span>
            <span className={styles.scoreMax}>/100</span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className={styles.breakdown}>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Contas em dia</span>
            <span className={styles.breakdownPts}>{billsPts}/50 pts</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Orçamento no limite</span>
            <span className={styles.breakdownPts}>{budgetPts}/50 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
