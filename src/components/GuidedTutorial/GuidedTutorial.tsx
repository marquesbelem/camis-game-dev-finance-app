"use client";

import React, { useState, useEffect, useCallback } from "react";
import styles from "./GuidedTutorial.module.css";

/* ── Step Definitions ───────────────────────────────────────────────────── */
interface TutorialStep {
  id: string;
  emoji: string;
  title: string;
  body: string[];
  targetSelector: string | null;
  cardPosition: "top" | "bottom" | "center";
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    emoji: "🦫",
    title: "Bem-vindo ao Capivara Poupadora!",
    body: [
      "Seu gerenciador financeiro gamificado.",
      "Vamos te mostrar como funciona em menos de 2 minutos!",
    ],
    targetSelector: null,
    cardPosition: "center",
  },
  {
    id: "parameters",
    emoji: "⚙️",
    title: "Configure seus Parâmetros",
    body: [
      "Clique no botão ⚙️ amarelo para configurar:",
      "• Salário mensal → define o HP máximo do orçamento",
      "• Limite do cartão → monitora uso do crédito",
      "• Orçamento de lazer → separa gastos recreativos",
    ],
    targetSelector: "#speed-dial-fab",
    cardPosition: "top",
  },
  {
    id: "expenses",
    emoji: "📋",
    title: "Adicione suas Despesas",
    body: [
      "Clique no botão + para registrar despesas. Cada despesa afeta:",
      "❤️ HP do Orçamento — cai conforme você gasta",
      "🛡️ Defesa — sobe ao marcar despesas como pagas",
      "⏰ Ameaças — contas pendentes são seus inimigos!",
    ],
    targetSelector: "#speed-dial-fab",
    cardPosition: "top",
  },
  {
    id: "dashboard",
    emoji: "⚔️",
    title: "Dashboard & Mapa de Dano",
    body: [
      "Os 4 cards de resumo mostram sua saúde financeira em tempo real.",
      "O Mapa de Dano mostra onde seu dinheiro é gasto por categoria — com barras de HP para cada uma.",
    ],
    targetSelector: "#summary-cards-section",
    cardPosition: "bottom",
  },
  {
    id: "gamification",
    emoji: "🏆",
    title: "Gamificação & Conquistas",
    body: [
      "🏆 Árvore de Conquistas — desbloqueie troféus ao bater metas",
      "🔥 Chama de Consistência — registre despesas todo dia e mantenha a sequência",
      "⚔️ Missões Diárias — complete desafios para ganhar CapyCoins",
      "🦫 Capy Score — seu score de saúde financeira de 0 a 1000",
    ],
    targetSelector: null, // center card — gamification section may not be visible
    cardPosition: "center",
  },
];

/* ── Spotlight rect ─────────────────────────────────────────────────────── */
interface SpotRect { x: number; y: number; w: number; h: number; }

function measureTarget(selector: string | null): SpotRect | null {
  if (!selector) return null;
  try {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Ignore elements outside the viewport entirely
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    const pad = 12;
    return {
      x: Math.max(4, r.left - pad),
      y: Math.max(4, r.top - pad),
      w: Math.min(r.width + pad * 2, window.innerWidth - 8),
      h: Math.min(r.height + pad * 2, window.innerHeight - 8),
    };
  } catch {
    return null;
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */
interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedTutorial({ onComplete, onSkip }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotRect | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [visible, setVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  /* Initialize viewport dimensions on client only */
  useEffect(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      setSpotRect(measureTarget(STEPS[stepIdx]?.targetSelector ?? null));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [stepIdx]);

  /* When step changes: scroll target into view, then measure after scroll settles */
  useEffect(() => {
    setSpotRect(null); // clear old spotlight immediately

    const selector = step.targetSelector;
    if (!selector) return;

    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Wait for scroll animation (~400ms) before measuring
    const timer = setTimeout(() => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      setSpotRect(measureTarget(selector));
    }, 450);

    return () => clearTimeout(timer);
  }, [step.targetSelector, stepIdx]);

  /* Navigate to next step with brief fade */
  const goTo = useCallback((nextIdx: number) => {
    setTransitioning(true);
    setVisible(false);
    setTimeout(() => {
      setStepIdx(nextIdx);
      setVisible(true);
      setTransitioning(false);
    }, 220);
  }, []);

  const handleNext = () => {
    if (isLast) { onComplete(); return; }
    goTo(stepIdx + 1);
  };

  /* Card position: keep within viewport */
  const getCardStyle = (): React.CSSProperties => {
    if (step.cardPosition === "center" || !spotRect || !vw || !vh) return {};

    const cardH = 290;
    const margin = 14;
    const spaceBelow = vh - (spotRect.y + spotRect.h);
    const spaceAbove = spotRect.y;

    if (spaceBelow >= cardH + margin || spaceAbove < cardH + margin) {
      // Place below spotlight
      return { top: Math.min(spotRect.y + spotRect.h + margin, vh - cardH - 8) };
    }
    // Place above spotlight
    return { bottom: vh - spotRect.y + margin };
  };

  /* Build SVG cutout path — fully clamped to viewport */
  const buildMaskPath = (): string | null => {
    if (!spotRect || !vw || !vh) return null;
    const { x, y, w, h } = spotRect;
    const r = 12; // border radius
    // Outer rect (full screen) + inner rounded rect (cutout) using even-odd fill
    return [
      `M0,0 H${vw} V${vh} H0 Z`,
      `M${x + r},${y}`,
      `H${x + w - r} Q${x + w},${y} ${x + w},${y + r}`,
      `V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}`,
      `H${x + r} Q${x},${y + h} ${x},${y + h - r}`,
      `V${y + r} Q${x},${y} ${x + r},${y} Z`,
    ].join(" ");
  };

  const maskPath = buildMaskPath();

  return (
    <div className={styles.root} role="dialog" aria-label="Tutorial guiado" aria-modal="true">
      {/* ── SVG Overlay ── */}
      {vw > 0 && vh > 0 && (
        <svg
          className={styles.overlay}
          width={vw}
          height={vh}
          viewBox={`0 0 ${vw} ${vh}`}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {maskPath ? (
            <path d={maskPath} fill="rgba(0,0,0,0.78)" fillRule="evenodd" />
          ) : (
            <rect width={vw} height={vh} fill="rgba(0,0,0,0.78)" />
          )}
          {spotRect && (
            <rect
              x={spotRect.x}
              y={spotRect.y}
              width={spotRect.w}
              height={spotRect.h}
              rx={12}
              fill="none"
              stroke="rgba(168,85,247,0.8)"
              strokeWidth={2.5}
              className={styles.spotRing}
            />
          )}
        </svg>
      )}

      {/* ── Info Card ── */}
      {vw > 0 && (
        <div
          className={`${styles.card} ${visible ? styles.cardIn : styles.cardOut} ${
            step.cardPosition === "center" ? styles.cardCenter : styles.cardFloat
          }`}
          style={step.cardPosition !== "center" ? getCardStyle() : undefined}
        >
          {/* Progress dots */}
          <div className={styles.dots} aria-label={`Passo ${stepIdx + 1} de ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${
                  i === stepIdx ? styles.dotActive : i < stepIdx ? styles.dotDone : ""
                }`}
              />
            ))}
          </div>

          {/* Header */}
          <div className={styles.cardHeader}>
            <span className={styles.cardEmoji}>{step.emoji}</span>
            <h2 className={styles.cardTitle}>{step.title}</h2>
          </div>

          {/* Body */}
          <ul className={styles.cardBody}>
            {step.body.map((line, i) => (
              <li key={i} className={styles.cardLine}>{line}</li>
            ))}
          </ul>

          {/* Actions */}
          <div className={styles.cardActions}>
            <button type="button" className={styles.skipBtn} onClick={onSkip} disabled={transitioning}>
              Pular
            </button>
            <button type="button" className={styles.nextBtn} onClick={handleNext} disabled={transitioning}>
              {isLast ? "🎉 Começar!" : "Próximo →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
