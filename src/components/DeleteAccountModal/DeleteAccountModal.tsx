"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { playSound } from "@/lib/sounds";
import styles from "./DeleteAccountModal.module.css";

interface DeleteAccountModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  onAccountDeleted: () => void;
}

export default function DeleteAccountModal({
  isOpen,
  username,
  onClose,
  onAccountDeleted,
}: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Digite sua senha para confirmar a exclusão.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir conta.");
      }

      playSound("toast_danger");
      
      // Clear local storage data
      localStorage.clear();
      
      onAccountDeleted();
    } catch (err: any) {
      setErrorMsg(err.message || "Senha incorreta ou falha na conexão.");
    } finally {
      setLoading(false);
    }
  }

  const portalRoot = typeof document !== "undefined" ? document.getElementById("portal-root") || document.body : null;
  if (!portalRoot) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.warningIconWrap}>
            <ShieldAlert size={28} />
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>Excluir Conta Permanentemente</h3>
          <p className={styles.subTitle}>
            Usuário: <strong>@{username}</strong>
          </p>

          <div className={styles.dangerBox}>
            <div className={styles.dangerHeader}>
              <AlertTriangle size={16} />
              <span>⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!</span>
            </div>
            <ul className={styles.dangerList}>
              <li>Todas as suas despesas, boletos e contas registradas</li>
              <li>Histórico de receitas extras e relatórios mensais</li>
              <li>Todas as conquistas, nível e XP acumulados</li>
              <li>Projeto, etapas e maquete 3D do seu apartamento</li>
              <li>Seu usuário e credenciais de acesso ao sistema</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>
                Confirme sua senha para prosseguir:
              </label>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.deleteConfirmBtn}
                disabled={loading}
              >
                <Trash2 size={16} />
                <span>{loading ? "Excluindo..." : "Sim, Excluir Minha Conta"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
