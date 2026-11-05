"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trophy,
  Star,
  Zap,
  TrendingDown,
  Settings,
  Lock,
  ChevronDown,
  Swords,
  Home,
  Activity,
  CheckCircle2,
} from "lucide-react";
import styles from "./AchievementsPanel.module.css";

interface Achievement {
  id: string;
  title: string;
  description: string;
  type: string;
  conditionValue: number;
  level: number;
  isUnlocked: boolean;
  progressPercentage: number;
  unlockedAt: string | null;
}

interface UserStats {
  monthlyBudgetLimit: number;
  totalCreditLimit?: number;
  currentStreakDays: number;
  level: number;
  xp: number;
  scheduledSalaryAmount: number;
  leisureBudget: number;
}

interface Props {
  selectedMonth?: string;
  onAchievementUnlocked?: (title: string) => void;
  onSettingsSaved?: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BUDGET_CONTROL: <TrendingDown size={18} />,
  SAVINGS: <Star size={18} />,
  STREAK: <Zap size={18} />,
  MONSTER_HUNTER: <Swords size={18} />,
  APARTMENT_PROGRESS: <Home size={18} />,
  CAPY_SCORE: <Activity size={18} />,
};

const TRAIL_LABELS: Record<string, string> = {
  BUDGET_CONTROL: "🛡️ Trilha Orçamento Blindado",
  STREAK: "🔥 Trilha Consistência Diária",
  SAVINGS: "📈 Trilha Margem de Lucro",
  MONSTER_HUNTER: "⚔️ Trilha Caçador de Monstros",
  APARTMENT_PROGRESS: "🏠 Trilha Conquista do Apê 3D",
  CAPY_SCORE: "📊 Trilha Saúde CapyScore",
};

export default function AchievementsPanel({ selectedMonth, onAchievementUnlocked, onSettingsSaved }: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  // Settings form state
  const [budgetLimit, setBudgetLimit] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [leisureBudget, setLeisureBudget] = useState("");

  const achievementsRef = useRef<Achievement[]>([]);
  achievementsRef.current = achievements;

  const loadData = useCallback(async () => {
    const statsUrl = selectedMonth ? `/api/stats?month=${selectedMonth}` : "/api/stats";
    const [achRes, statsRes] = await Promise.all([
      fetch("/api/achievements"),
      fetch(statsUrl),
    ]);
    const [achData, statsData] = await Promise.all([achRes.json(), statsRes.json()]);
    const prev = achievementsRef.current;
    setAchievements(achData);
    setStats(statsData);

    if (statsData && !statsData.error) {
      setBudgetLimit(statsData.monthlyBudgetLimit?.toString() ?? "50");
      setSalaryAmount(statsData.scheduledSalaryAmount?.toString() ?? "3000");
      setLeisureBudget(statsData.leisureBudget?.toString() ?? "0");
    }

    if (Array.isArray(achData) && prev.length > 0) {
      achData.forEach((ach: Achievement) => {
        const p = prev.find((x) => x.id === ach.id);
        if (p && !p.isUnlocked && ach.isUnlocked) {
          onAchievementUnlocked?.(ach.title);
        }
      });
    }

    setLoading(false);
  }, [selectedMonth, onAchievementUnlocked]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/stats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyBudgetLimit: parseFloat(budgetLimit) || 50,
          scheduledSalaryAmount: parseFloat(salaryAmount) || 3000,
          leisureBudget: parseFloat(leisureBudget) || 0,
        }),
      });
      if (res.ok) {
        setShowSettings(false);
        onSettingsSaved?.();
        await loadData();
      }
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
    }
  }

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const allTrailTypes = Object.keys(TRAIL_LABELS);

  const filteredTrails = allTrailTypes.filter((t) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "RPG" && (t === "MONSTER_HUNTER" || t === "APARTMENT_PROGRESS" || t === "CAPY_SCORE")) return true;
    if (activeFilter === "FINANCE" && (t === "BUDGET_CONTROL" || t === "STREAK" || t === "SAVINGS")) return true;
    return false;
  });

  function isChainedLocked(ach: Achievement): boolean {
    if (ach.level <= 1) return false;
    const prev = achievements.find((a) => a.type === ach.type && a.level === ach.level - 1);
    return prev ? !prev.isUnlocked : false;
  }

  if (loading) {
    return (
      <aside className={styles.panel}>
        <div style={{ color: "#94a3b8", fontSize: "0.85rem", padding: "20px" }}>
          Carregando Árvore de Conquistas...
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleButton}>
          <Trophy size={20} className={styles.trophyIcon} />
          <h2 className={styles.panelTitle}>Árvore de Conquistas</h2>
          <span className={styles.badge}>
            {unlockedCount}/{achievements.length} Concluídas
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterBtn} ${activeFilter === "ALL" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveFilter("ALL")}
        >
          Todas ({achievements.length})
        </button>
        <button
          className={`${styles.filterBtn} ${activeFilter === "RPG" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveFilter("RPG")}
        >
          🎮 RPG & Conquistas
        </button>
        <button
          className={`${styles.filterBtn} ${activeFilter === "FINANCE" ? styles.filterBtnActive : ""}`}
          onClick={() => setActiveFilter("FINANCE")}
        >
          💰 Orçamento & Margem
        </button>
      </div>

      {/* Filtered Skill Tree Trails */}
      {filteredTrails.map((trailType) => {
        const trailAchievements = achievements
          .filter((a) => a.type === trailType)
          .sort((a, b) => a.level - b.level);

        return (
          <section key={trailType} className={styles.trailSection}>
            <div className={styles.trailTitleRow}>
              <h3 className={styles.trailTitle}>
                {TRAIL_LABELS[trailType]}
              </h3>
            </div>
            <div className={styles.nodesChain}>
              {trailAchievements.map((ach) => {
                const locked = isChainedLocked(ach);
                return <AchievementNodeCard key={ach.id} achievement={ach} isLocked={locked} />;
              })}
            </div>
          </section>
        );
      })}
    </aside>
  );
}

function AchievementNodeCard({
  achievement: ach,
  isLocked,
}: {
  achievement: Achievement;
  isLocked: boolean;
}) {
  const coinReward = ach.level * 25;
  const xpReward = ach.level * 40;

  return (
    <article
      className={`${styles.achCard} ${ach.isUnlocked ? styles.achUnlocked : ""} ${
        isLocked ? styles.achChainLocked : ""
      }`}
    >
      <div className={styles.achHeader}>
        <div className={`${styles.achIcon} ${ach.isUnlocked ? styles.achIconUnlocked : ""}`}>
          {isLocked ? <Lock size={16} /> : TYPE_ICONS[ach.type] ?? <Trophy size={16} />}
        </div>
        <div className={styles.achMeta}>
          <div className={styles.titleRow}>
            <span className={styles.achTitle}>{ach.title}</span>
            <span className={styles.lvlBadge}>Nv. {ach.level}</span>
          </div>
          <span className={styles.achDesc}>{ach.description}</span>
        </div>
      </div>

      {/* Rewards Row */}
      <div className={styles.rewardsRow}>
        <span className={`${styles.rewardChip} ${styles.chipCoin}`}>🪙 +{coinReward}</span>
        <span className={`${styles.rewardChip} ${styles.chipXp}`}>⚡ +{xpReward} XP</span>
      </div>

      {/* Progress or Unlock Status */}
      {!ach.isUnlocked && !isLocked && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${ach.progressPercentage}%` }} />
          </div>
          <span className={styles.progressLabel}>{ach.progressPercentage.toFixed(0)}%</span>
        </div>
      )}

      {ach.isUnlocked && (
        <span className={styles.unlockedDate}>
          <CheckCircle2 size={13} /> Concluída!
        </span>
      )}

      {isLocked && <span className={styles.lockedLabel}>🔒 Bloqueado: Requer Nível {ach.level - 1}</span>}
    </article>
  );
}
