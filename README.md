# 💰 LootFinance — Plataforma de Gestão Financeira Pessoal Gamificada

Uma aplicação web full-stack de controle financeiro pessoal que combina rigor analítico e elementos de gamificação para transformar o controle de despesas e orçamentos em uma experiência intuitiva, motivadora e previsível.

---

## ✨ Principais Funcionalidades

- **📄 Gestão Financeira Completa** — Cadastro, edição e controle de despesas pontuais, parceladas e recorrentes (com upload de comprovantes em PDF/imagem e filtros mensais).
- **💵 Renda Fixa e Rendas Extras** — Configuração de salário agendado por mês e lançamento de receitas adicionais com cálculo automático de margem líquida e saldo livre.
- **📊 Analytics & Relatórios Avançados** — Dashboard completo de análise anual e mensal:
  - Distribuição e representatividade de gastos por categoria.
  - Balanço comparativo anual de receitas vs. despesas.
  - Taxa de poupança (*savings rate*) e identificação automática do melhor e pior mês financeiro.
- **🛡️ Gamificação & Indicadores de Saúde Financeira** — Elementos lúdicos atrelados ao cumprimento de metas:
  - **Barra de HP do Orçamento:** O teto de gastos do mês define a vida (HP); o medidor reage dinamicamente conforme o consumo do orçamento.
  - **Progressão & Conquistas:** Níveis de consistência financeira e trilhas de redução de gastos.
- **🐾 Pet Hub** — Módulo dedicado à saúde e controle de custos dos pets, incluindo calendário de vacinação, agendamentos e acompanhamento de cuidados.
- **🏠 Planejamento Imobiliário (Apê)** — Gestão de fluxo de caixa e parcelas de financiamento/obras integrado às despesas gerais.
- **🌓 Design System Adaptativo** — Suporte completo a **Tema Claro (Light Mode)** e **Tema Escuro (Dark Mode)**, com layout responsivo para desktop e mobile.

---

## 🛠️ Tech Stack

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend** | React 19, Next.js 16 (App Router) | Server Components, Client Modals, Portals |
| **Linguagem** | TypeScript | Tipagem estrita de ponta a ponta |
| **Estilização** | CSS Modules & CSS Custom Properties | Design System responsivo com alternância de temas |
| **Banco de Dados** | PostgreSQL via Supabase | Modelagem relacional e integridade referencial |
| **ORM** | Prisma ORM | Modelagem de dados, migrações e tipagem |
| **Visualização de Dados** | Recharts & Lucide Icons | Gráficos interativos e iconografia moderna |
| **Segurança & Performance** | Rate Limiting, JWT, Sanitização | Proteção contra abusos e validação de payloads |

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js LTS (v20+)
- npm v9+
- Projeto configurado no [Supabase](https://supabase.com) (ou PostgreSQL local)

### Instalação e Execução

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   Crie ou edite o arquivo `.env` na raiz do projeto com as credenciais do seu banco:
   ```env
   # Pooler (modo Transaction / porta 6543)
   DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-1-[regiao].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"

   # Conexão direta (modo Session / porta 5432)
   DIRECT_URL="postgresql://postgres:[senha]@db.[ref].supabase.co:5432/postgres"

   # Segredo de autenticação
   JWT_SECRET="seu-segredo-jwt-aqui"
   ```

3. **Sincronizar o banco de dados:**
   ```bash
   npx prisma db push
   ```

4. **Iniciar o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📁 Estrutura do Projeto

```text
├── prisma/
│   └── schema.prisma      # Models (User, PaymentSlip, MonthlyBudget, Pet, Apartment, etc.)
├── public/
│   └── uploads/           # Anexos e comprovantes de pagamentos
├── src/
│   ├── app/
│   │   ├── api/           # Rotas de API (slips, analytics, stats, pets, extra-income, auth)
│   │   ├── charts/        # Página de relatórios e analytics anuais
│   │   ├── pets/          # Módulo de acompanhamento de pets e vacinas
│   │   ├── apartment/     # Módulo de controle do apartamento/obras
│   │   ├── settings/      # Configurações de orçamento e perfil
│   │   ├── page.tsx       # Dashboard principal
│   │   └── globals.css    # Variáveis CSS globais e tokens de tema (light/dark)
│   ├── components/        # Componentes reutilizáveis (Modais, TopBar, Charts, Cards)
│   └── lib/               # Clientes utilitários (Prisma, Rate Limit, Auth, Upload)
```

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento local |
| `npm run build` | Cria a build otimizada de produção |
| `npm run start` | Inicia a aplicação a partir da build gerada |
| `npx prisma studio` | Interface visual para navegação e edição do banco de dados |
| `npx prisma db push` | Sincroniza o schema Prisma diretamente com o banco |
