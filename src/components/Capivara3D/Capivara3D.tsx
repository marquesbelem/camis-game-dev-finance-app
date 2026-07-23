"use client";

import React from "react";
import styles from "./Capivara3D.module.css";

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

export interface Capivara3DProps {
  sizeMultiplier?: number;
  mood?: "chilling" | "happy" | "nervous" | "party";
  equippedAccessory?: string;
  equippedSkin?: string;
}

export default function Capivara3D({
  sizeMultiplier = 1,
  mood = "chilling",
  equippedAccessory = "ORANGE",
  equippedSkin = "DEFAULT",
}: Capivara3DProps) {
  // Skin Color Palettes
  let furLight = "#a06a42";
  let furDark = "#6d3d1e";
  let furTop = "#bd855b";
  let furSide = "#84522f";
  let snoutTop = "#84522f";
  let snoutSide = "#522d14";
  let eyeColor = "#111111";

  if (equippedSkin === "GOLDEN") {
    furLight = "#ffd700";
    furDark = "#b8860b";
    furTop = "#fff066";
    furSide = "#d4af37";
    snoutTop = "#d4af37";
    snoutSide = "#8b6508";
    eyeColor = "#221100";
  } else if (equippedSkin === "CYBERPUNK") {
    furLight = "#00e5ff";
    furDark = "#ff007f";
    furTop = "#80effe";
    furSide = "#00b2cc";
    snoutTop = "#ff40a0";
    snoutSide = "#b30059";
    eyeColor = "#ffff00";
  }

  const scaleStyle = {
    transform: `scale(${sizeMultiplier})`,
  } as React.CSSProperties;

  const moodClass = styles[`mood_${mood}`] || styles.mood_chilling;

  return (
    <div className={styles.container} style={scaleStyle}>
      <div className={styles.scene}>
        <div className={`${styles.capivara} ${moodClass}`}>
          {/* 1. Body */}
          <Cube
            w={80} h={52} d={54}
            x={-40} y={-10} z={-27}
            color={furLight}
            topColor={furTop}
            rightColor={furSide}
          />

          {/* 2. Head */}
          <Cube
            w={38} h={38} d={38}
            x={24} y={-36} z={-19}
            color={furLight}
            topColor={furTop}
            rightColor={furSide}
          />

          {/* 3. Snout */}
          <Cube
            w={20} h={24} d={32}
            x={56} y={-24} z={-16}
            color={furDark}
            topColor={snoutTop}
            rightColor={snoutSide}
          />

          {/* 4. Olhos em 3D (Eyes with white pupil shine) */}
          {mood === "nervous" ? (
            <>
              {/* Olho Esquerdo (Nervoso) */}
              <Cube w={7} h={7} d={6} x={44} y={-33} z={19} color="#ffffff" topColor="#ffffff" rightColor="#e2e8f0" />
              <Cube w={4} h={4} d={7} x={46} y={-32} z={20} color="#000000" />

              {/* Olho Direito (Nervoso) */}
              <Cube w={7} h={7} d={6} x={44} y={-33} z={-21} color="#ffffff" topColor="#ffffff" rightColor="#e2e8f0" />
              <Cube w={4} h={4} d={7} x={46} y={-32} z={-22} color="#000000" />
            </>
          ) : (
            <>
              {/* Olho Esquerdo (Expressivo com Brilho) */}
              <Cube w={7} h={7} d={6} x={44} y={-32} z={19} color={eyeColor} topColor="#222222" rightColor="#111111" />
              <Cube w={3} h={3} d={7} x={47} y={-33} z={20} color="#ffffff" topColor="#ffffff" rightColor="#ffffff" />

              {/* Olho Direito (Expressivo com Brilho) */}
              <Cube w={7} h={7} d={6} x={44} y={-32} z={-21} color={eyeColor} topColor="#222222" rightColor="#111111" />
              <Cube w={3} h={3} d={7} x={47} y={-33} z={-20} color="#ffffff" topColor="#ffffff" rightColor="#ffffff" />
            </>
          )}

          {/* 5. Ears */}
          <Cube w={8} h={10} d={4} x={26} y={-44} z={18} color={furDark} />
          <Cube w={8} h={10} d={4} x={26} y={-44} z={-22} color={furDark} />

          {/* 6. Legs */}
          <Cube w={14} h={22} d={14} x={-34} y={38} z={14} color={furDark} />
          <Cube w={14} h={22} d={14} x={-34} y={38} z={-28} color={furDark} />
          <Cube w={14} h={22} d={14} x={18} y={38} z={14} color={furDark} />
          <Cube w={14} h={22} d={14} x={18} y={38} z={-28} color={furDark} />

          {/* 7. Accessories */}
          {equippedAccessory === "ORANGE" && (
            <>
              <Cube w={16} h={14} d={16} x={34} y={-50} z={-8} color="#ff9800" topColor="#ffa726" rightColor="#f57c00" />
              <Cube w={6} h={3} d={6} x={39} y={-53} z={-3} color="#4caf50" />
            </>
          )}

          {equippedAccessory === "SUNGLASSES" && (
            <>
              <Cube w={5} h={10} d={46} x={43} y={-33} z={-23} color="#0f172a" topColor="#1e293b" rightColor="#020617" />
              <Cube w={12} h={2} d={2} x={32} y={-30} z={20} color="#0f172a" />
              <Cube w={12} h={2} d={2} x={32} y={-30} z={-22} color="#0f172a" />
            </>
          )}

          {equippedAccessory === "CROWN" && (
            <>
              <Cube w={22} h={8} d={22} x={31} y={-44} z={-11} color="#eab308" topColor="#fde047" rightColor="#ca8a04" />
              <Cube w={5} h={6} d={5} x={31} y={-50} z={-11} color="#eab308" />
              <Cube w={5} h={6} d={5} x={48} y={-50} z={-11} color="#ef4444" />
              <Cube w={5} h={6} d={5} x={31} y={-50} z={6} color="#3b82f6" />
              <Cube w={5} h={6} d={5} x={48} y={-50} z={6} color="#eab308" />
            </>
          )}

          {equippedAccessory === "PARTY_HAT" && (
            <>
              <Cube w={20} h={6} d={20} x={32} y={-42} z={-10} color="#ec4899" />
              <Cube w={14} h={10} d={14} x={35} y={-52} z={-7} color="#3b82f6" />
              <Cube w={8} h={10} d={8} x={38} y={-62} z={-4} color="#eab308" />
              <Cube w={6} h={6} d={6} x={39} y={-68} z={-3} color="#ffffff" />
            </>
          )}

          {equippedAccessory === "WIZARD_HAT" && (
            <>
              <Cube w={32} h={4} d={32} x={26} y={-40} z={-16} color="#6366f1" topColor="#818cf8" rightColor="#4338ca" />
              <Cube w={20} h={12} d={20} x={32} y={-52} z={-10} color="#4338ca" />
              <Cube w={12} h={12} d={12} x={36} y={-64} z={-6} color="#3730a3" />
              <Cube w={6} h={4} d={6} x={39} y={-50} z={-11} color="#eab308" />
            </>
          )}

          {equippedAccessory === "CAP" && (
            <>
              <Cube w={38} h={8} d={38} x={24} y={-42} z={-19} color="#ef4444" topColor="#f87171" rightColor="#dc2626" />
              <Cube w={18} h={2} d={32} x={56} y={-38} z={-16} color="#3b82f6" />
            </>
          )}
        </div>

        {/* Sweat drop for nervous mood */}
        {mood === "nervous" && <div className={styles.sweatDrop} />}

        {/* Shadow */}
        <div className={styles.shadow} />
      </div>
    </div>
  );
}
