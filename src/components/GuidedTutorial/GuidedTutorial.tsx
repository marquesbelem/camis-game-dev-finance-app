"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import styles from "./GuidedTutorial.module.css";

/* ── Step Definitions ───────────────────────────────────────────────────── */
export interface TutorialBullet {
  icon: string;
  strong: string;
  text: string;
}

export interface TutorialStep {
  id: string;
  stepNum: number;
  badge: string;
  emoji: string;
  title: string;
  subtitle: string;
  bullets: TutorialBullet[];
  tip?: string;
  targetSelector: string | null;
  cardPosition: "top" | "bottom" | "center";
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    stepNum: 1,
    badge: "BEM-VINDO",
    emoji: "🦫",
    title: "LootFinance",
    subtitle: "Seu controle financeiro inteligente, gamificado e direto ao ponto.",
    bullets: [
      {
        icon: "🎯",
        strong: "Controle sem Estresse:",
        text: "Monitore saldo, despesas e poupança mensal sem planilhas complicadas.",
      },
      {
        icon: "⚡",
        strong: "Tudo em 1 Lugar:",
        text: "Lançamento ágil de contas, metas de gastos, relatórios e espaço para pets.",
      },
    ],
    tip: "💡 Leva menos de 1 minuto e você pode rever este tour quando quiser no menu.",
    targetSelector: null,
    cardPosition: "center",
  },
  {
    id: "parameters",
    stepNum: 2,
    badge: "CONFIGURAÇÃO INICIAL",
    emoji: "⚙️",
    title: "Parâmetros & Metas",
    subtitle: "Defina suas bases para o app calcular tudo automaticamente.",
    bullets: [
      {
        icon: "💵",
        strong: "Salário & Data:",
        text: "Informe seu salário e dia de recebimento para ativar a contagem regressiva de dias.",
      },
      {
        icon: "📊",
        strong: "Teto por Categoria:",
        text: "Escolha a % do seu salário reservada para cada área (mercado, lazer, moradia).",
      },
      {
        icon: "🎯",
        strong: "Limite de Gastos:",
        text: "Defina o teto geral do mês para manter a saúde e HP da sua Capivara.",
      },
    ],
    tip: "💡 Encontre em Menu (≡) > Parâmetros a qualquer momento.",
    targetSelector: "#topbar-burger-btn",
    cardPosition: "bottom",
  },
  {
    id: "expenses",
    stepNum: 3,
    badge: "LANÇAMENTOS RÁPIDOS",
    emoji: "➕",
    title: "Cadastre Despesas & Rendas",
    subtitle: "Adicione contas e rendas extras direto pelo botão flutuante.",
    bullets: [
      {
        icon: "📋",
        strong: "Despesas Flexíveis:",
        text: "Lance contas pontuais, despesas recorrentes e compras parceladas (ex: 2/10).",
      },
      {
        icon: "💰",
        strong: "Rendas Extras:",
        text: "Bônus ou freelances somam automaticamente ao orçamento disponível do mês.",
      },
      {
        icon: "✅",
        strong: "1 Toque para Quitar:",
        text: "Marque qualquer conta como paga na lista para atualizar seu saldo na hora.",
      },
    ],
    tip: "💡 Toque no botão (+) roxo no canto inferior para abrir o formulário.",
    targetSelector: "#speed-dial-fab",
    cardPosition: "top",
  },
  {
    id: "dashboard",
    stepNum: 4,
    badge: "PAINEL PRINCIPAL",
    emoji: "📊",
    title: "Dashboard & Orçamentos",
    subtitle: "Acompanhe a saúde financeira do mês em tempo real.",
    bullets: [
      {
        icon: "🛡️",
        strong: "Cards de Resumo:",
        text: "Veja saldo livre, contas quitadas, pendências e dias até o próximo salário.",
      },
      {
        icon: "🎯",
        strong: "Widgets por Categoria:",
        text: "Barras dinâmicas de progresso alertam se você estiver perto do teto de gastos.",
      },
    ],
    tip: "💡 Use as setas no topo da página para navegar entre meses anteriores e futuros.",
    targetSelector: "#summary-cards-section",
    cardPosition: "bottom",
  },
  {
    id: "charts",
    stepNum: 5,
    badge: "RELATÓRIOS VISUAIS",
    emoji: "📈",
    title: "Gráficos & Estatísticas",
    subtitle: "Descubra com clareza para onde vai o seu dinheiro.",
    bullets: [
      {
        icon: "🥧",
        strong: "Pizza por Categoria:",
        text: "Veja graficamente quais áreas consom a maior fatia do seu orçamento.",
      },
      {
        icon: "📉",
        strong: "Evolução Mensal:",
        text: "Compare histórico de receitas vs despesas e acompanhe sua taxa real de poupança.",
      },
    ],
    tip: "💡 Acesse a aba 'Gráficos' no menu lateral para visualizar relatórios completos.",
    targetSelector: null,
    cardPosition: "center",
  },
  {
    id: "pets",
    stepNum: 6,
    badge: "CUIDADO ESPECIAL",
    emoji: "🐾",
    title: "Espaço Pets & Vacinas",
    subtitle: "Mantenha a saúde e os custos dos seus companheiros organizados.",
    bullets: [
      {
        icon: "🐕",
        strong: "Perfis e Gastos Próprios:",
        text: "Cadastre seus bichinhos com foto e acompanhe os gastos exclusivos de cada um.",
      },
      {
        icon: "💉",
        strong: "Calendário de Vacinas:",
        text: "Receba lembretes automáticos de vacinação, reforços periódicos e consultas.",
      },
    ],
    tip: "💡 Acesse a aba 'Pets' no menu lateral para gerenciar seus amigos peludos!",
    targetSelector: null,
    cardPosition: "center",
  },
];

/* ── Spotlight rect ─────────────────────────────────────────────────────── */
interface SpotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function measureTarget(selector: string | null): SpotRect | null {
  if (!selector) return null;
  try {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Element outside viewport
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
  const isFirst = stepIdx === 0;
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

    // Wait for scroll animation (~380ms) before measuring
    const timer = setTimeout(() => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      setSpotRect(measureTarget(selector));
    }, 400);

    return () => clearTimeout(timer);
  }, [step.targetSelector, stepIdx]);

  /* Navigate to any step with brief fade */
  const goTo = useCallback((nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= STEPS.length) return;
    setTransitioning(true);
    setVisible(false);
    setTimeout(() => {
      setStepIdx(nextIdx);
      setVisible(true);
      setTransitioning(false);
    }, 180);
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    goTo(stepIdx + 1);
  }, [isLast, onComplete, goTo, stepIdx]);

  const handlePrev = useCallback(() => {
    if (stepIdx > 0) {
      goTo(stepIdx - 1);
    }
  }, [stepIdx, goTo]);

  /* Keyboard navigation */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (transitioning) return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onSkip, transitioning]);

  /* Card position: fallback to center if no spotRect */
  const isCentered = step.cardPosition === "center" || !spotRect;

  const getCardStyle = (): React.CSSProperties => {
    if (isCentered || !spotRect || !vw || !vh) return {};

    const estimatedCardH = 340;
    const margin = 16;
    const spaceBelow = vh - (spotRect.y + spotRect.h);
    const spaceAbove = spotRect.y;

    if (spaceBelow >= estimatedCardH + margin || spaceAbove < estimatedCardH + margin) {
      // Place below spotlight
      return { top: Math.min(spotRect.y + spotRect.h + margin, vh - estimatedCardH - 12) };
    }
    // Place above spotlight
    return { bottom: Math.max(12, vh - spotRect.y + margin) };
  };

  /* Build SVG cutout path — clamped to viewport */
  const buildMaskPath = (): string | null => {
    if (!spotRect || !vw || !vh) return null;
    const { x, y, w, h } = spotRect;
    const r = 12; // border radius
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
            <path d={maskPath} fill="rgba(8, 10, 20, 0.82)" fillRule="evenodd" />
          ) : (
            <rect width={vw} height={vh} fill="rgba(8, 10, 20, 0.82)" />
          )}
          {spotRect && (
            <rect
              x={spotRect.x}
              y={spotRect.y}
              width={spotRect.w}
              height={spotRect.h}
              rx={12}
              fill="none"
              stroke="rgba(122, 75, 232, 0.85)"
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
            isCentered ? styles.cardCenter : styles.cardFloat
          }`}
          style={!isCentered ? getCardStyle() : undefined}
        >
          {/* Top Bar: Eyebrow + Close X */}
          <div className={styles.topRow}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>{step.badge}</span>
              <span className={styles.stepCounter}>
                Passo {step.stepNum} de {STEPS.length}
              </span>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onSkip}
              aria-label="Fechar tutorial"
              title="Fechar (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Interactive Progress dots */}
          <div className={styles.dots} aria-label={`Passo ${stepIdx + 1} de ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`${styles.dot} ${
                  i === stepIdx ? styles.dotActive : i < stepIdx ? styles.dotDone : ""
                }`}
                onClick={() => goTo(i)}
                disabled={transitioning}
                title={`Ir para: ${s.title}`}
                aria-label={`Ir para passo ${i + 1}: ${s.title}`}
              />
            ))}
          </div>

          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.emojiBadge}>
              <span className={styles.cardEmoji}>{step.emoji}</span>
            </div>
            <div className={styles.titleCol}>
              <h2 className={styles.cardTitle}>{step.title}</h2>
              <p className={styles.cardSubtitle}>{step.subtitle}</p>
            </div>
          </div>

          {/* Bullets List */}
          <div className={styles.bulletsContainer}>
            {step.bullets.map((bullet, i) => (
              <div key={i} className={styles.bulletRow}>
                <span className={styles.bulletIcon}>{bullet.icon}</span>
                <div className={styles.bulletText}>
                  <strong className={styles.bulletStrong}>{bullet.strong}</strong>{" "}
                  <span className={styles.bulletDesc}>{bullet.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Tip */}
          {step.tip && (
            <div className={styles.tipBox}>
              <span>{step.tip}</span>
            </div>
          )}

          {/* Actions */}
          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.skipBtn}
              onClick={onSkip}
              disabled={transitioning}
            >
              Pular tutorial
            </button>

            <div className={styles.navButtons}>
              {!isFirst && (
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={handlePrev}
                  disabled={transitioning}
                >
                  <ChevronLeft size={16} />
                  Voltar
                </button>
              )}

              <button
                type="button"
                className={styles.nextBtn}
                onClick={handleNext}
                disabled={transitioning}
              >
                {isLast ? (
                  <>
                    <Check size={16} />
                    Começar a Usar!
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
