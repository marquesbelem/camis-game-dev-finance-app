"use client";

import React, { useState, useEffect } from "react";
import Capivara3D from "@/components/Capivara3D/Capivara3D";
import { Eye, EyeOff } from "lucide-react";
import styles from "./AuthProvider.module.css";

// ── Global Fetch Interceptor ────────────────────────────────────────────────
// Dynamically intercepts all client-side fetches to append the active x-user-id header.
function setupFetchInterceptor(userId: string) {
  if (typeof window === "undefined") return;

  // Prevent duplicate interceptors
  if ((window as any).__fetchInterceptorActive) return;
  (window as any).__fetchInterceptorActive = true;

  const originalFetch = window.fetch;
  window.fetch = async (input, init) => {
    init = init || {};
    init.headers = init.headers || {};

    if (init.headers instanceof Headers) {
      init.headers.set("x-user-id", userId);
    } else if (Array.isArray(init.headers)) {
      init.headers.push(["x-user-id", userId]);
    } else {
      (init.headers as Record<string, string>)["x-user-id"] = userId;
    }

    return originalFetch(input, init);
  };
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form input state
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("cami_username");
    const storedUserId = localStorage.getItem("cami_user_id");

    if (storedUsername && storedUserId) {
      setUsername(storedUsername);
      setUserId(storedUserId);
      setupFetchInterceptor(storedUserId);
    }
    setLoading(false);
  }, []);

  // ── Firebase Push Notifications registration ──────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (!firebaseConfig.messagingSenderId || !firebaseConfig.apiKey) {
      console.warn("Firebase client configuration variables missing. Push notifications setup skipped.");
      return;
    }

    async function setupPushNotifications() {
      try {
        const { initializeApp } = await import("firebase/app");
        const { getMessaging, getToken } = await import("firebase/messaging");

        if (typeof window !== "undefined" && "Notification" in window) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("Notification permission not granted by user.");
            return;
          }

          const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey || "")}` +
            `&authDomain=${encodeURIComponent(firebaseConfig.authDomain || "")}` +
            `&projectId=${encodeURIComponent(firebaseConfig.projectId || "")}` +
            `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket || "")}` +
            `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId || "")}` +
            `&appId=${encodeURIComponent(firebaseConfig.appId || "")}`;

          const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
          console.log("Service Worker registered successfully.", registration);

          const app = initializeApp(firebaseConfig);
          const messaging = getMessaging(app);

          const token = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          });

          if (token) {
            console.log("Firebase Device token obtained:", token);
            await fetch("/api/auth/push-tokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to initialize Firebase FCM notifications:", err);
      }
    }

    const timer = setTimeout(setupPushNotifications, 3000);
    return () => clearTimeout(timer);
  }, [userId]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = usernameInput.trim();

    if (!cleanName) {
      setErrorMsg("Por favor, insira seu nome de usuário.");
      return;
    }

    if (!passwordInput) {
      setErrorMsg("Por favor, insira sua senha.");
      return;
    }

    if (authMode === "register" || authMode === "reset") {
      if (passwordInput.length < 6) {
        setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setErrorMsg("As senhas não coincidem.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode === "reset" ? "reset-password" : authMode,
          username: cleanName,
          password: passwordInput,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro na autenticação");
      }

      const userData = await res.json();
      
      if (authMode === "reset") {
        setErrorMsg("");
        setPasswordInput("");
        setConfirmPasswordInput("");
        setAuthMode("login");
        alert("Senha redefinida com sucesso. Faça login agora com a nova senha.");
      } else {
        // Store credentials locally
        localStorage.setItem("cami_username", userData.username);
        localStorage.setItem("cami_user_id", userData.id);

        setUsername(userData.username);
        setUserId(userData.id);
        setupFetchInterceptor(userData.id);

        // Force-reload the page to clear any previous cached client state and bind the fetch interceptor
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("cami_username");
    localStorage.removeItem("cami_user_id");
    // Reload to clear auth state
    window.location.reload();
  }

  function toggleMode(mode: "login" | "register" | "reset") {
    setAuthMode(mode);
    setErrorMsg("");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Carregando painel...</p>
      </div>
    );
  }

  // If no user session is active, render the welcome identification gate
  if (!username || !userId) {
    return (
      <main className={styles.authContainer} id="auth-gate-root">
        <div className={styles.authCard}>
          <header className={styles.authHeader}>
            <div className={styles.logo3d}>
              <Capivara3D sizeMultiplier={0.7} />
            </div>
            <h1 className={styles.title}>Capivara Poupadora</h1>
            <p className={styles.subtitle}>
              Seu painel financeiro pessoal, moderno e gamificado com capivaras!
            </p>
          </header>

          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabBtn} ${authMode === "login" ? styles.tabActive : ""}`}
              onClick={() => toggleMode("login")}
              disabled={submitting}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${authMode === "register" ? styles.tabActive : ""}`}
              onClick={() => toggleMode("register")}
              disabled={submitting}
            >
              Criar Conta
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${authMode === "reset" ? styles.tabActive : ""}`}
              onClick={() => toggleMode("reset")}
              disabled={submitting}
            >
              Redefinir Senha
            </button>
          </div>

          <form onSubmit={handleAuth} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="login-username-input" className={styles.label}>
                Nome de Usuário
              </label>
              <input
                type="text"
                id="login-username-input"
                className={styles.input}
                placeholder="Ex: Cami, Marques..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled={submitting}
                maxLength={30}
                autoFocus
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="login-password-input" className={styles.label}>
                Senha
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password-input"
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="Mínimo de 6 caracteres"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={submitting}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {(authMode === "register" || authMode === "reset") && (
              <div className={styles.inputGroup}>
                <label htmlFor="confirm-password-input" className={styles.label}>
                  Confirme a Senha
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password-input"
                    className={`${styles.input} ${styles.passwordInput}`}
                    placeholder="Repita sua senha"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    disabled={submitting}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Exibir senha"}
                    disabled={submitting}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className={styles.errorContainer} role="alert">
                <span className={styles.errorIcon}>⚠</span>
                <p className={styles.errorText}>{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              id="login-submit-button"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <span className={styles.btnLoading}>Aguarde...</span>
              ) : authMode === "login" ? (
                "Entrar no App"
              ) : authMode === "register" ? (
                "Cadastrar e Entrar"
              ) : (
                "Salvar Nova Senha"
              )}
            </button>
          </form>

          <footer className={styles.authFooter}>
            <p>Seus dados serão salvos de forma segura e persistente.</p>
          </footer>
        </div>
      </main>
    );
  }

  // Inject a small hidden session indicator/logout bar at the top or bottom of layout (discreet layout integration)
  return (
    <>
      <div className={styles.sessionBar}>
        <span className={styles.sessionUser}>
          Conectado como <strong>{username}</strong>
        </span>
        <button
          onClick={handleLogout}
          className={styles.logoutBtn}
          title="Sair desta conta"
        >
          Sair
        </button>
      </div>
      {children}
    </>
  );
}
