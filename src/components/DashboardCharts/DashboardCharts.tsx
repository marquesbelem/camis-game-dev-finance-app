"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import styles from "./DashboardCharts.module.css";

interface Slip {
  id: string;
  title: string;
  amount: number;
  status: string;
  isCreditCardPayment: boolean;
  category: { id: string; name: string; colorCode: string };
}

interface Props {
  slips: Slip[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Custom donut label
function renderCustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function DashboardCharts({ slips }: Props) {
  if (slips.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📊</span>
        <p>Nenhuma despesa neste mês para visualizar.</p>
      </div>
    );
  }

  // ── Category breakdown for donut ──────────────────────────────────────────
  const categoryMap: Record<string, { name: string; color: string; total: number }> = {};
  for (const slip of slips) {
    const key = slip.category.name;
    if (!categoryMap[key]) {
      categoryMap[key] = { name: slip.category.name, color: slip.category.colorCode, total: 0 };
    }
    categoryMap[key].total += slip.amount;
  }
  const donutData = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  return (
    <div className={styles.chartsGrid}>
      {/* ── Donut – Spending by Category ─────────────────────────────────── */}
      <section className={styles.chartCard} aria-label="Gastos por categoria">
        <h3 className={styles.chartTitle}>Gastos por Categoria</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
              dataKey="total"
              labelLine={false}
              label={renderCustomLabel}
            >
              {donutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
                fontSize: "13px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Legend */}
        <ul className={styles.legend}>
          {donutData.map((d) => (
            <li key={d.name} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: d.color }} />
              <span className={styles.legendName}>{d.name}</span>
              <span className={styles.legendValue}>{formatCurrency(d.total)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
