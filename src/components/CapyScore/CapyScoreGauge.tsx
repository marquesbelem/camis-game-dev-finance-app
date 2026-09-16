"use client";

import React from "react";
import { Activity } from "lucide-react";
import type { Slip } from "../SlipList/SlipItem";
import styles from "./CapyScoreGauge.module.css";

interface CapyScoreGaugeProps {
  slips: Slip[];
  totalCreditLimit: number;
  leisureBudget: number;
}

export function computeCapyScore(
  slips: Slip[],
  totalCreditLimit: number,
  leisureBudget: number
): {
  score: number;
  billsPts: number;
  creditPts: number;
  leisurePts: number;
  statusLabel: string;
  statusColor: string;
  recommendedMood: "chilling" | "happy" | "nervous" | "party";
} {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Contas em dia (+40 max)
  const overdueCount = slips.filter(
    (s) => s.status !== "PAGO" && s.dueDate.slice(0, 10) < todayStr
  ).length;

  let billsPts = 40;
  if (overdueCount === 1) billsPts = 20;
  else if (overdueCount >= 2) billsPts = 0;

  // 2. Uso do cartão de crédito (+30 max)
  const creditSpent = slips
    .filter((s) => s.isCreditCardPayment && s.status !== "PAGO")
    .reduce((acc, s) => acc + s.amount, 0);

  const creditRatio = totalCreditLimit > 0 ? (creditSpent / totalCreditLimit) * 100 : 0;
  let creditPts = 30;
  if (creditRatio > 80) creditPts = 0;
  else if (creditRatio > 50) creditPts = 10;
  else if (creditRatio > 30) creditPts = 20;

  // 3. Orçamento de lazer (+30 max)
  const leisureSpent = slips
    .filter((s) => !s.isCreditCardPayment) // Non-credit or general expenses
    .reduce((acc, s) => acc + s.amount, 0);

  let leisurePts = 30;
  if (leisureBudget > 0) {
    const leisureRatio = (leisureSpent / leisureBudget) * 100;
    if (leisureRatio > 120) leisurePts = 0;
    else if (leisureRatio > 100) leisurePts = 15;
  }

  const score = Math.min(100, Math.max(0, billsPts + creditPts + leisurePts));

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
    creditPts,
    leisurePts,
    statusLabel,
    statusColor,
    recommendedMood,
  };
}

export default function CapyScoreGauge({
  slips,
  totalCreditLimit,
  leisureBudget,
}: CapyScoreGaugeProps) {
  const { score, billsPts, creditPts, leisurePts, statusLabel, statusColor } =
    computeCapyScore(slips, totalCreditLimit, leisureBudget);

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
            <span className={styles.breakdownPts}>{billsPts}/40 pts</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Cartão sob controle</span>
            <span className={styles.breakdownPts}>{creditPts}/30 pts</span>
          </div>
          <div className={styles.breakdownItem}>
            <span className={styles.breakdownLabel}>Lazer equilibrado</span>
            <span className={styles.breakdownPts}>{leisurePts}/30 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
