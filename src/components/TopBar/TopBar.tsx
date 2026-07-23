"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  Tag,
  Home,
  Trophy,
  LogOut,
} from "lucide-react";
import styles from "./TopBar.module.css";

interface TopBarProps {
  username: string;
  onLogout: () => void;
}

const navLinks = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/expenses", icon: Receipt, label: "Despesas" },
  { href: "/categories", icon: Tag, label: "Categorias" },
  { href: "/apartment", icon: Home, label: "Apartamento" },
  { href: "/achievements", icon: Trophy, label: "Conquistas" },
];

export default function TopBar({ username, onLogout }: TopBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      <header className={styles.topBar} role="banner">
        {/* Hamburger */}
        <button
          type="button"
          className={styles.burgerBtn}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={isOpen}
        >
          <Menu size={22} />
        </button>

        {/* Logo center */}
        <div className={styles.logoArea}>
          <span className={styles.logoEmoji}>🦫</span>
          <span className={styles.logoText}>Capivara Poupadora</span>
        </div>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.drawerOverlay}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in Drawer */}
      {isOpen && (
        <nav
          ref={drawerRef}
          className={styles.drawer}
          aria-label="Menu de navegação principal"
        >
          {/* Drawer Header */}
          <div className={styles.drawerHeader}>
            <div className={styles.drawerLogoArea}>
              <span className={styles.drawerLogoEmoji}>🦫</span>
              <span className={styles.drawerLogoText}>Capivara Poupadora</span>
            </div>
            <button
              type="button"
              className={styles.drawerCloseBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className={styles.drawerNav}>
            <p className={styles.drawerNavLabel}>Navegação</p>
            {navLinks.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={styles.drawerLink}
                onClick={() => setIsOpen(false)}
              >
                <span className={styles.drawerLinkIcon}>
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            ))}
          </div>

          {/* Drawer Footer – user info + logout */}
          <div className={styles.drawerFooter}>
            <div className={styles.drawerUserRow}>
              <div className={styles.drawerUserAvatar}>{initials}</div>
              <div className={styles.drawerUserInfo}>
                <p className={styles.drawerUserName}>{username}</p>
                <p className={styles.drawerUserLabel}>Conta ativa</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.drawerLogoutBtn}
              onClick={() => { setIsOpen(false); onLogout(); }}
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
