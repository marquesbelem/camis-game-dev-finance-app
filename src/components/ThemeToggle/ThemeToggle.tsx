"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

type Theme = "dark" | "light";
const STORAGE_KEY = "lf-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#f6f3ff" : "#12082e");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: theme applies for this session only */
    }
  }

  const goingLight = theme === "dark";
  return (
    <button
      type="button"
      id="theme-toggle-btn"
      className={styles.toggle}
      onClick={toggle}
      aria-label={goingLight ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={goingLight ? "Tema claro" : "Tema escuro"}
    >
      {goingLight ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}