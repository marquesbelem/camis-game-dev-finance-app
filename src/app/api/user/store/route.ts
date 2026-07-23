import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  icon: string;
  type: "accessory" | "skin";
  description: string;
}

export const CATALOG: StoreItem[] = [
  { id: "ORANGE", name: "Laranja Clássica", price: 0, icon: "🍊", type: "accessory", description: "A tradicional fruta na cabeça da capivara." },
  { id: "SUNGLASSES", name: "Óculos Thug Life", price: 100, icon: "🕶️", type: "accessory", description: "Estilo estelar para quem mantém as contas em dia." },
  { id: "CROWN", name: "Coroa de Ouro", price: 250, icon: "👑", type: "accessory", description: "Para a verdadeira majestade das finanças." },
  { id: "PARTY_HAT", name: "Chapéu de Festa", price: 80, icon: "🥳", type: "accessory", description: "Celebre cada real economizado em grande estilo!" },
  { id: "WIZARD_HAT", name: "Chapéu de Mago", price: 180, icon: "🧙‍♂️", type: "accessory", description: "Faz as despesas indesejadas desaparecerem." },
  { id: "CAP", name: "Boné Gamer", price: 120, icon: "🧢", type: "accessory", description: "Visual descolado para o dia a dia." },

  { id: "DEFAULT", name: "Capivara Clássica", price: 0, icon: "🦫", type: "skin", description: "Pelagem natural aveludada." },
  { id: "GOLDEN", name: "Capivara Dourada", price: 500, icon: "✨", type: "skin", description: "Pelagem de ouro puro reluzente." },
  { id: "CYBERPUNK", name: "Capivara Neon", price: 350, icon: "🤖", type: "skin", description: "Estilo futurista neon." },
];

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let stats = await prisma.userStats.findUnique({ where: { id: userId } });
    if (!stats) {
      stats = await prisma.userStats.create({
        data: { id: userId, capyCoins: 50, equippedAccessory: "ORANGE", equippedSkin: "DEFAULT", unlockedItems: "ORANGE,DEFAULT" },
      });
    }

    const unlocked = (stats.unlockedItems || "ORANGE,DEFAULT").split(",").map(s => s.trim());

    return NextResponse.json({
      capyCoins: stats.capyCoins,
      equippedAccessory: stats.equippedAccessory,
      equippedSkin: stats.equippedSkin,
      unlockedItems: unlocked,
      catalog: CATALOG,
    });
  } catch (error) {
    console.error("[GET /api/user/store]", error);
    return NextResponse.json({ error: "Erro ao buscar loja" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { action, itemId } = body;

    const stats = await prisma.userStats.findUnique({ where: { id: userId } });
    if (!stats) {
      return NextResponse.json({ error: "Estatísticas do usuário não encontradas" }, { status: 404 });
    }

    const item = CATALOG.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: "Item inexistente no catálogo" }, { status: 400 });
    }

    const unlockedSet = new Set((stats.unlockedItems || "ORANGE,DEFAULT").split(",").map(s => s.trim()));

    if (action === "buy") {
      if (unlockedSet.has(itemId)) {
        return NextResponse.json({ error: "Você já possui este item" }, { status: 400 });
      }

      if (stats.capyCoins < item.price) {
        return NextResponse.json({ error: "Saldo de CapyCoins insuficiente" }, { status: 400 });
      }

      unlockedSet.add(itemId);
      const newUnlockedStr = Array.from(unlockedSet).join(",");

      const updated = await prisma.userStats.update({
        where: { id: userId },
        data: {
          capyCoins: stats.capyCoins - item.price,
          unlockedItems: newUnlockedStr,
          ...(item.type === "accessory" ? { equippedAccessory: itemId } : { equippedSkin: itemId }),
        },
      });

      return NextResponse.json({
        message: "Item comprado com sucesso!",
        capyCoins: updated.capyCoins,
        equippedAccessory: updated.equippedAccessory,
        equippedSkin: updated.equippedSkin,
        unlockedItems: Array.from(unlockedSet),
      });
    }

    if (action === "equip") {
      if (!unlockedSet.has(itemId)) {
        return NextResponse.json({ error: "Você ainda não possui este item" }, { status: 400 });
      }

      const updated = await prisma.userStats.update({
        where: { id: userId },
        data: {
          ...(item.type === "accessory" ? { equippedAccessory: itemId } : { equippedSkin: itemId }),
        },
      });

      return NextResponse.json({
        message: "Item equipado!",
        capyCoins: updated.capyCoins,
        equippedAccessory: updated.equippedAccessory,
        equippedSkin: updated.equippedSkin,
        unlockedItems: Array.from(unlockedSet),
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/user/store]", error);
    return NextResponse.json({ error: "Erro ao processar requisição da loja" }, { status: 500 });
  }
}
