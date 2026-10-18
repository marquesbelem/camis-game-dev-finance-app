"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  Tag,
  Home,
  LogOut,
  GraduationCap,
  Sliders,
  Dog,
  BarChart3,
  Wallet,
  ChevronDown,
} from "lucide-react";
import styles from "./TopBar.module.css";

interface TopBarProps {
  username: string;
  onLogout: () => void;
  onRestartTutorial?: () => void;
  onDeleteAccount?: () => void;
}

const financeLinks = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/charts", icon: BarChart3, label: "Gráficos" },
  { href: "/expenses", icon: Receipt, label: "Despesas" },
  { href: "/categories", icon: Tag, label: "Categorias" },
  { href: "/settings", icon: Sliders, label: "Parâmetros" },
];

const moduleLinks = [
  { href: "/pets", icon: Dog, label: "Pets" },
  { href: "/apartment", icon: Home, label: "Apartamento" },
];

export default function TopBar({ username, onLogout, onRestartTutorial, onDeleteAccount }: TopBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(true);
  const pathname = usePathname();
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

  // Ensure drawer closes and scroll unlocks when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      <header className={styles.topBar} role="banner">
        {/* Logo left */}
        <Link href="/" className={styles.logoArea} style={{ textDecoration: 'none' }}>
          <span className={styles.logoEmoji}>🦫</span>
          <span className={styles.logoText}>Capivara Poupadora</span>
        </Link>

        {/* Hamburger — right side */}
        <button
          type="button"
          id="topbar-burger-btn"
          className={styles.burgerBtn}
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menu de navegação"
          aria-expanded={isOpen}
        >
          <Menu size={22} />
        </button>
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
            <Link href="/" className={styles.drawerLogoArea} style={{ textDecoration: 'none' }} onClick={() => setIsOpen(false)}>
              <span className={styles.drawerLogoEmoji}>🦫</span>
              <span className={styles.drawerLogoText}>Capivara Poupadora</span>
            </Link>
            <button
              type="button"
              className={styles.drawerCloseBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links with Sub-menu Grouping */}
          <div className={styles.drawerNav}>
            <p className={styles.drawerNavLabel}>Menu Principal</p>

            {/* Sub-menu Finanças */}
            <div className={styles.navGroup}>
              <button
                type="button"
                className={styles.navGroupHeaderBtn}
                onClick={() => setFinanceOpen((prev) => !prev)}
                aria-expanded={financeOpen}
                aria-label="Abrir ou fechar submenu de Finanças"
              >
                <div className={styles.navGroupHeaderLeft}>
                  <span className={styles.drawerLinkIcon}>
                    <Wallet size={18} />
                  </span>
                  <span>Finanças</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`${styles.navGroupChevron} ${financeOpen ? styles.navGroupChevronOpen : ""}`}
                />
              </button>

              {financeOpen && (
                <div className={styles.subMenu}>
                  {financeLinks.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`${styles.drawerLink} ${styles.subDrawerLink} ${isActive ? styles.drawerLinkActive : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <span className={styles.drawerLinkIcon}>
                          <Icon size={16} />
                        </span>
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Outros Módulos */}
            <p className={styles.drawerNavLabel} style={{ marginTop: "10px" }}>Outros Módulos</p>
            {moduleLinks.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ""}`}
                  onClick={() => setIsOpen(false)}
                >
                  <span className={styles.drawerLinkIcon}>
                    <Icon size={18} />
                  </span>
                  {label}
                </Link>
              );
            })}
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
            {onRestartTutorial && (
              <button
                type="button"
                className={styles.drawerTutorialBtn}
                onClick={() => { setIsOpen(false); onRestartTutorial(); }}
              >
                <GraduationCap size={16} />
                Reiniciar Tutorial
              </button>
            )}
            <button
              type="button"
              className={styles.drawerLogoutBtn}
              onClick={() => { setIsOpen(false); onLogout(); }}
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
