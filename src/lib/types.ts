// ── Category Types ──────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
  isSystemDefault: boolean;
  budgetLimit?: number | null;
  createdAt: Date | string;
}

export interface CategoryWithCount extends Category {
  _count: {
    slips: number;
  };
}
