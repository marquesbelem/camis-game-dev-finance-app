"use client";

import React, { useState } from "react";
import { X, ShoppingBag, Check, Lock } from "lucide-react";
import Capivara3D from "../Capivara3D/Capivara3D";
import type { StoreItem } from "@/app/api/user/store/route";
import styles from "./CapyStoreModal.module.css";

interface CapyStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  capyCoins: number;
  equippedAccessory: string;
  equippedSkin: string;
  unlockedItems: string[];
  catalog: StoreItem[];
  onUpdateStore: () => void;
}

export default function CapyStoreModal({
  isOpen,
  onClose,
  capyCoins,
  equippedAccessory,
  equippedSkin,
  unlockedItems,
  catalog,
  onUpdateStore,
}: CapyStoreModalProps) {
  const [activeTab, setActiveTab] = useState<"accessory" | "skin">("accessory");
  const [previewAccessory, setPreviewAccessory] = useState(equippedAccessory);
  const [previewSkin, setPreviewSkin] = useState(equippedSkin);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const items = catalog.filter((i) => i.type === activeTab);

  async function handleAction(item: StoreItem) {
    setError("");
    const isUnlocked = unlockedItems.includes(item.id);
    const action = isUnlocked ? "equip" : "buy";

    setLoadingId(item.id);
    try {
      const userId = localStorage.getItem("user_id") || "demo-user";
      const res = await fetch("/api/user/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ action, itemId: item.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar item");
      }

      if (item.type === "accessory") {
        setPreviewAccessory(item.id);
      } else {
        setPreviewSkin(item.id);
      }

      onUpdateStore();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <ShoppingBag size={20} className="text-blue-400" />
            <h2 className={styles.title}>Loja da Capivara</h2>
          </div>
          <div className={styles.coinsBadge}>
            🪙 {capyCoins} CapyCoins
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar loja">
            <X size={18} />
          </button>
        </div>

        {/* 3D Preview Section */}
        <div className={styles.previewSection}>
          <Capivara3D
            sizeMultiplier={0.8}
            equippedAccessory={previewAccessory}
            equippedSkin={previewSkin}
            mood="party"
          />
          <span className={styles.previewLabel}>Pré-visualização em tempo real</span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "accessory" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("accessory")}
          >
            Acessórios 👑
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "skin" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("skin")}
          >
            Skins 🎨
          </button>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* Catalog List */}
        <div className={styles.contentList}>
          {items.map((item) => {
            const isUnlocked = unlockedItems.includes(item.id);
            const isEquipped =
              item.type === "accessory"
                ? equippedAccessory === item.id
                : equippedSkin === item.id;
            const canAfford = capyCoins >= item.price;

            return (
              <div
                key={item.id}
                className={`${styles.itemCard} ${isEquipped ? styles.itemCardEquipped : ""}`}
                onClick={() => {
                  if (item.type === "accessory") setPreviewAccessory(item.id);
                  else setPreviewSkin(item.id);
                }}
              >
                <div className={styles.itemIcon}>{item.icon}</div>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemDesc}>{item.description}</div>

                {isEquipped ? (
                  <button className={`${styles.actionBtn} ${styles.btnEquipped}`}>
                    <Check size={12} /> Equipado
                  </button>
                ) : isUnlocked ? (
                  <button
                    className={`${styles.actionBtn} ${styles.btnEquip}`}
                    onClick={() => handleAction(item)}
                    disabled={loadingId === item.id}
                  >
                    Equipar
                  </button>
                ) : (
                  <button
                    className={`${styles.actionBtn} ${canAfford ? styles.btnBuy : styles.btnDisabled}`}
                    onClick={() => canAfford && handleAction(item)}
                    disabled={!canAfford || loadingId === item.id}
                  >

                    {canAfford ? `Comprar 🪙${item.price}` : <><Lock size={12} /> 🪙{item.price}</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
