import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CategoryWithCount } from "@/lib/types";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/security";

// ── Curated icon set (from research.md) ────────────────────────────────────
const VALID_ICONS = new Set([
  "Home", "ShoppingCart", "Zap", "Car", "Heart", "Utensils", "CreditCard",
  "Briefcase", "Plane", "Dumbbell", "GraduationCap", "Music", "Gift", "Tv",
  "Wifi", "Coffee", "Baby", "Dog", "Wrench", "Landmark", "Shirt", "Pill",
  "TreePine", "Star", "FolderOpen", "UtensilsCrossed", "Bus", "Bike",
]);

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

// GET /api/categories — list all categories with slip count
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`categories:get:${userId}:${ip}`, { windowMs: 60000, max: 60 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const categories: CategoryWithCount[] = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null },
          { userId },
        ],
      },
      include: {
        _count: {
          select: {
            slips: {
              where: { userId },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    if (month) {
      const monthlyBudgets = await prisma.monthlyCategoryBudget.findMany({
        where: { userId, month },
      });
      const budgetMap = new Map(monthlyBudgets.map(mb => [mb.categoryId, mb.budgetLimit]));
      for (const cat of categories) {
        if (budgetMap.has(cat.id)) {
          cat.budgetLimit = budgetMap.get(cat.id)!;
        }
      }
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return NextResponse.json({ error: "Falha ao carregar categorias" }, { status: 500 });
  }
}

// POST /api/categories — create a new category
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`categories:post:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, colorCode, iconRef } = body as {
      name?: string;
      colorCode?: string;
      iconRef?: string;
    };

    const sanitizedName = sanitizeInput(name);

    // ── Validation ──────────────────────────────────────────────────────────
    if (!sanitizedName) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório e deve ter 50 caracteres ou menos." },
        { status: 400 }
      );
    }
    if (sanitizedName.length > 50) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório e deve ter 50 caracteres ou menos." },
        { status: 400 }
      );
    }
    if (!colorCode || !isValidHex(colorCode)) {
      return NextResponse.json(
        { error: "Um código de cor hexadecimal válido é obrigatório (ex: #3b82f6)." },
        { status: 400 }
      );
    }
    if (!iconRef || !VALID_ICONS.has(iconRef)) {
      return NextResponse.json(
        { error: "Uma referência de ícone válida é obrigatória." },
        { status: 400 }
      );
    }

    // ── Case-insensitive uniqueness check ───────────────────────────────────
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: sanitizedName, mode: "insensitive" },
        OR: [
          { userId: null },
          { userId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Uma categoria com este nome já existe." },
        { status: 409 }
      );
    }

    // ── Create ──────────────────────────────────────────────────────────────
    const created = await prisma.category.create({
      data: { name: sanitizedName, colorCode, iconRef, userId },
      include: {
        _count: {
          select: {
            slips: {
              where: { userId },
            },
          },
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[POST /api/categories]", error);
    return NextResponse.json({ error: "Falha ao criar categoria" }, { status: 500 });
  }
}

// PUT /api/categories — batch update category budget limits
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ip = getClientIp(request);
    if (isRateLimited(`categories:put:${userId}:${ip}`, { windowMs: 60000, max: 30 })) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    const body = await request.json();
    const { categoryLimits } = body as {
      categoryLimits: Array<{ id: string; budgetLimit: number | null }>;
    };

    if (!Array.isArray(categoryLimits)) {
      return NextResponse.json(
        { error: "Formato inválido para categoryLimits." },
        { status: 400 }
      );
    }

    // Update each category budgetLimit
    await Promise.all(
      categoryLimits.map(async (item) => {
        const val = item.budgetLimit !== null && item.budgetLimit !== undefined && !isNaN(Number(item.budgetLimit)) && Number(item.budgetLimit) > 0
          ? Number(item.budgetLimit)
          : null;

        if (month) {
          if (val === null) {
            await prisma.monthlyCategoryBudget.deleteMany({
              where: { categoryId: item.id, month, userId },
            });
          } else {
            await prisma.monthlyCategoryBudget.upsert({
              where: { categoryId_month: { categoryId: item.id, month } },
              update: { budgetLimit: val },
              create: { categoryId: item.id, month, userId, budgetLimit: val },
            });
          }
        } else {
          await prisma.category.updateMany({
            where: { id: item.id },
            data: { budgetLimit: val },
          });
        }
      })
    );

    return NextResponse.json({ message: "Limites de categoria atualizados com sucesso." });
  } catch (error) {
    console.error("[PUT /api/categories]", error);
    return NextResponse.json(
      { error: "Falha ao atualizar limites das categorias" },
      { status: 500 }
    );
  }
}
