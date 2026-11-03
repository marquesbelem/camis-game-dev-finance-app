import type { Metadata } from "next";
import localFont from "next/font/local";
import AuthProvider from "@/components/AuthProvider/AuthProvider";
import styles from "./layout.module.css";
import "./globals.css";

// ── Self-hosted Google Fonts via next/font ─────────────────────────────────
const bungee = localFont({
  src: "../../public/assets/FONT/Bungee/Bungee-Regular.ttf",
  weight: "400",
  variable: "--font-display-loaded",
  display: "swap",
});

const raleway = localFont({
  src: "../../public/assets/FONT/Raleway/Raleway-VariableFont_wght.ttf",
  weight: "100 900",
  variable: "--font-body-loaded",
  display: "swap",
});

// ── SEO Metadata ───────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "LootFinance – Gerenciador Financeiro Gamificado",
  description:
    "Controle suas despesas, acompanhe seus gastos por mês e desbloqueie conquistas para economizar mais. O seu painel financeiro pessoal, moderno e interativo.",
  keywords: ["finanças pessoais", "despesas", "conquistas", "dashboard", "economias"],
  authors: [{ name: "LootFinance" }],
  robots: "index, follow",
};

// ── Root Layout ────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${bungee.variable} ${raleway.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("lf-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}`,
          }}
        />
        {/* viewport-fit=cover enables edge-to-edge layout with safe-area-inset support */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#12082e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <AuthProvider>
          <div id="app-root">
            {children}
          </div>
          {/* Portal anchor for modals and toasts */}
          <div id="portal-root" />
        </AuthProvider>
      </body>
    </html>
  );
}

