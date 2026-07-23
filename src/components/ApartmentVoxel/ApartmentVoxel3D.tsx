"use client";

import React, { useRef, useState, useEffect } from "react";
import { Home, Lock, Check } from "lucide-react";
import styles from "./ApartmentVoxel3D.module.css";

interface CubeProps {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  color: string;
  topColor?: string;
  rightColor?: string;
}

function Cube({ w, h, d, x, y, z, color, topColor, rightColor }: CubeProps) {
  const style = {
    width: `${w}px`,
    height: `${h}px`,
    left: `${x}px`,
    top: `${y}px`,
    transform: `translate3d(0, 0, ${z}px)`,
    "--w": `${w}px`,
    "--h": `${h}px`,
    "--d": `${d}px`,
    "--color-base": color,
    "--color-top": topColor || color,
    "--color-side": rightColor || color,
  } as React.CSSProperties;

  return (
    <div className={styles.cube} style={style}>
      <div className={`${styles.face} ${styles.front}`} />
      <div className={`${styles.face} ${styles.back}`} />
      <div className={`${styles.face} ${styles.left}`} />
      <div className={`${styles.face} ${styles.right}`} />
      <div className={`${styles.face} ${styles.top}`} />
      <div className={`${styles.face} ${styles.bottom}`} />
    </div>
  );
}

interface ApartmentVoxel3DProps {
  progressPct: number;
}

export default function ApartmentVoxel3D({ progressPct = 0 }: ApartmentVoxel3DProps) {
  const roundedPct = Math.min(100, Math.max(0, Math.round(progressPct)));
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Use zoom (not scale) because CSS zoom re-does layout + clips 3D content naturally.
  // The scene is 220px; we shrink on narrow containers.
  useEffect(() => {
    if (!containerRef.current) return;
    const SCENE_SIZE = 220;
    const obs = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.width - 40; // 20px padding each side
      setZoom(Math.min(1, Math.max(0.4, available / SCENE_SIZE)));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const isTier1 = roundedPct >= 15; // Piso & Chaves
  const isTier2 = roundedPct >= 40; // Sofá & TV
  const isTier3 = roundedPct >= 70; // Cozinha & Geladeira
  const isTier4 = roundedPct >= 90; // Varanda & Capivara de Férias!

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.titleArea}>
        <h3 className={styles.title}>
          <Home size={20} className="text-emerald-400" />
          Maquete 3D do Apê
        </h3>
        <span className={styles.pctBadge}>{roundedPct}% Concluído</span>
      </div>

      {/*
        The isometric room projects its 3D content ~155px to the LEFT of the scene origin
        (because cubes at x=-90 sit outside the 220px bounding box).
        We correct this with translateX(155px) translateY(18px) on .room (in screen space,
        applied AFTER the rotations in the CSS transform list).
        zoom scales the entire scene including 3D content and re-adjusts layout size.
      */}
      <div className={styles.scene} style={{ zoom }}>
        <div className={styles.room}>
          {/* 1. Base Floor */}
          <Cube w={180} h={180} d={12} x={-90} y={-90} z={-6} color={isTier1 ? "#0f766e" : "#334155"} topColor={isTier1 ? "#14b8a6" : "#475569"} rightColor={isTier1 ? "#0d9488" : "#1e293b"} />

          {/* Back Walls */}
          <Cube w={180} h={12} d={80} x={-90} y={-90} z={34} color="#1e293b" topColor="#334155" rightColor="#0f172a" />
          <Cube w={12} h={180} d={80} x={-90} y={-90} z={34} color="#1e293b" topColor="#334155" rightColor="#0f172a" />

          {/* Tier 1: Door Frame & Key */}
          {isTier1 && (
            <Cube w={16} h={8} d={40} x={60} y={-90} z={20} color="#b45309" topColor="#d97706" rightColor="#92400e" />
          )}

          {/* Tier 2: Sofa & TV */}
          {isTier2 && (
            <>
              {/* Sofa */}
              <Cube w={60} h={30} d={24} x={-70} y={10} z={12} color="#3b82f6" topColor="#60a5fa" rightColor="#2563eb" />
              {/* TV Unit */}
              <Cube w={10} h={50} d={36} x={50} y={-20} z={18} color="#0f172a" topColor="#1e293b" rightColor="#020617" />
            </>
          )}

          {/* Tier 3: Kitchen Counter & Fridge */}
          {isTier3 && (
            <>
              {/* Counter */}
              <Cube w={50} h={24} d={26} x={-70} y={-70} z={13} color="#e2e8f0" topColor="#f8fafc" rightColor="#cbd5e1" />
              {/* Fridge */}
              <Cube w={24} h={24} d={50} x={-10} y={-70} z={25} color="#94a3b8" topColor="#cbd5e1" rightColor="#64748b" />
            </>
          )}

          {/* Tier 4: Balcony Grill & Capivara resting */}
          {isTier4 && (
            <>
              {/* BBQ Grill */}
              <Cube w={24} h={24} d={30} x={40} y={40} z={15} color="#dc2626" topColor="#ef4444" rightColor="#b91c1c" />
              {/* Capivara in Room */}
              <Cube w={24} h={16} d={16} x={-20} y={20} z={14} color="#a06a42" topColor="#bd855b" rightColor="#84522f" />
              <Cube w={8} h={8} d={8} x={-10} y={16} z={20} color="#6d3d1e" />
            </>
          )}
        </div>
      </div>

      {/* Decor Badges Status */}
      <div className={styles.unlockedBadgeList}>
        <span className={`${styles.decorBadge} ${isTier1 ? styles.badgeUnlocked : styles.badgeLocked}`}>
          {isTier1 ? <Check size={12} /> : <Lock size={12} />} 🔑 Chave & Piso (15%)
        </span>
        <span className={`${styles.decorBadge} ${isTier2 ? styles.badgeUnlocked : styles.badgeLocked}`}>
          {isTier2 ? <Check size={12} /> : <Lock size={12} />} 🛋️ Sala & TV (40%)
        </span>
        <span className={`${styles.decorBadge} ${isTier3 ? styles.badgeUnlocked : styles.badgeLocked}`}>
          {isTier3 ? <Check size={12} /> : <Lock size={12} />} 🍳 Cozinha (70%)
        </span>
        <span className={`${styles.decorBadge} ${isTier4 ? styles.badgeUnlocked : styles.badgeLocked}`}>
          {isTier4 ? <Check size={12} /> : <Lock size={12} />} 🥩 Varanda & Capivara (90%)
        </span>
      </div>
    </div>
  );
}
