"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Home,
  Hammer,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  Landmark,
  FileText
} from "lucide-react";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import styles from "./page.module.css";

interface Stage {
  id: string;
  name: string;
  budget: number;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
  expenses?: Expense[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  status: "PENDENTE" | "PAGO";
  type: string; // "OBRA" | "DOCUMENTACAO" | "MOVEIS" | "DECORACAO" | "GERAL"
  date: string;
  stageId?: string | null;
}

interface ApartmentInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: "PENDENTE" | "PAGO";
}

interface PaymentSlip {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: "PENDENTE" | "PAGO";
  category: {
    name: string;
    colorCode: string;
    iconRef: string;
  };
}

interface Project {
  hasProject: boolean;
  id?: string;
  propertyValue?: number;
  downPayment?: number;
  financedAmount?: number;
  interestRate?: number;
  loanTermMonths?: number;
  amortizationType?: "SAC" | "PRICE";
  installmentsPaid?: number;
  installmentsTotal?: number;
  obraBudget?: number;
  stages?: Stage[];
  expenses?: Expense[];
  installments?: ApartmentInstallment[];
  generalSlips?: PaymentSlip[];
}

export default function ApartmentPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"financiamento" | "obra" | "despesas">("financiamento");
  const { toasts, dismissToast, celebrateAchievement, addToast } = useToasts();

  // Project setup / edit form state
  const [propertyValue, setPropertyValue] = useState(350000);
  const [downPayment, setDownPayment] = useState(70000);
  const [interestRate, setInterestRate] = useState(9.5);
  const [loanTermMonths, setLoanTermMonths] = useState(360);
  const [amortizationType, setAmortizationType] = useState<"SAC" | "PRICE">("SAC");
  const [installmentsPaid, setInstallmentsPaid] = useState(0);
  const [obraBudget, setObraBudget] = useState(50000);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Stage form state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageBudget, setStageBudget] = useState(0);

  // Expense form state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseStatus, setExpenseStatus] = useState<"PENDENTE" | "PAGO">("PENDENTE");
  const [expenseType, setExpenseType] = useState("OBRA");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseStageId, setExpenseStageId] = useState("");

  // Installment form state
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<ApartmentInstallment | null>(null);
  const [instNumber, setInstNumber] = useState(1);
  const [instDueDate, setInstDueDate] = useState("");
  const [instAmount, setInstAmount] = useState(0);
  const [instStatus, setInstStatus] = useState<"PENDENTE" | "PAGO">("PENDENTE");

  // Filters
  const [filterStageId, setFilterStageId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterExpenseType, setFilterExpenseType] = useState("ALL");

  // Manual Installments Handlers
  async function handleSaveInstallment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingInstallment ? "PUT" : "POST";
      const url = editingInstallment 
        ? `/api/apartment/installments/${editingInstallment.id}` 
        : "/api/apartment/installments";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentNumber: instNumber,
          dueDate: new Date(instDueDate).toISOString(),
          amount: instAmount,
          status: instStatus,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar parcela");
      }

      addToast({
        title: editingInstallment ? "Parcela Atualizada" : "Parcela Adicionada",
        message: `Parcela #${instNumber}`,
        type: "success",
      });
      setIsInstallmentModalOpen(false);
      setEditingInstallment(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      addToast({ title: "Erro", message: msg, type: "danger" });
    }
  }

  async function handleToggleInstallmentStatus(inst: ApartmentInstallment) {
    const nextStatus: "PENDENTE" | "PAGO" = inst.status === "PAGO" ? "PENDENTE" : "PAGO";

    // Optimistic Update
    setProject(prev => {
      if (!prev || !prev.installments) return prev;
      const updated = prev.installments.map(i => i.id === inst.id ? { ...i, status: nextStatus } : i);
      return { ...prev, installments: updated };
    });

    try {
      const res = await fetch(`/api/apartment/installments/${inst.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      addToast({ title: "Status Atualizado", message: `Parcela #${inst.installmentNumber} paga!`, type: "success" });
      loadData();
    } catch {
      // Revert
      setProject(prev => {
        if (!prev || !prev.installments) return prev;
        const reverted = prev.installments.map(i => i.id === inst.id ? { ...i, status: inst.status } : i);
        return { ...prev, installments: reverted };
      });
      addToast({ title: "Erro", message: "Não foi possível alterar o status.", type: "danger" });
    }
  }

  async function handleDeleteInstallment(id: string, number: number) {
    if (!confirm(`Excluir a parcela manual #${number}?`)) return;
    try {
      const res = await fetch(`/api/apartment/installments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ title: "Parcela Excluída", message: `Parcela #${number}`, type: "info" });
      loadData();
    } catch {
      addToast({ title: "Erro", message: "Não foi possível excluir a parcela.", type: "danger" });
    }
  }

  function openInstallmentModal(inst?: ApartmentInstallment) {
    if (inst) {
      setEditingInstallment(inst);
      setInstNumber(inst.installmentNumber);
      setInstDueDate(inst.dueDate.substring(0, 10));
      setInstAmount(inst.amount);
      setInstStatus(inst.status);
    } else {
      setEditingInstallment(null);
      // Auto increment next installment number
      const nextNum = project?.installments && project.installments.length > 0 
        ? Math.max(...project.installments.map(i => i.installmentNumber)) + 1
        : 1;
      setInstNumber(nextNum);
      setInstDueDate(new Date().toISOString().substring(0, 10));
      setInstAmount(0);
      setInstStatus("PENDENTE");
    }
    setIsInstallmentModalOpen(true);
  }

  async function handleToggleGeneralSlipStatus(slip: PaymentSlip) {
    const nextStatus: "PENDENTE" | "PAGO" = slip.status === "PAGO" ? "PENDENTE" : "PAGO";

    // Optimistic Update
    setProject(prev => {
      if (!prev || !prev.generalSlips) return prev;
      const updated = prev.generalSlips.map(s => s.id === slip.id ? { ...s, status: nextStatus } : s);
      return { ...prev, generalSlips: updated };
    });

    try {
      const form = new FormData();
      form.append("status", nextStatus);
      const res = await fetch(`/api/slips/${slip.id}`, {
        method: "PUT",
        body: form,
      });
      if (!res.ok) throw new Error();
      addToast({ title: "Status Atualizado", message: `Despesa geral "${slip.title}" paga!`, type: "success" });
      loadData();
    } catch {
      // Revert
      setProject(prev => {
        if (!prev || !prev.generalSlips) return prev;
        const reverted = prev.generalSlips.map(s => s.id === slip.id ? { ...s, status: slip.status } : s);
        return { ...prev, generalSlips: reverted };
      });
      addToast({ title: "Erro", message: "Não foi possível atualizar o status.", type: "danger" });
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/apartment");
      const data = await res.json();
      setProject(data);
      if (data.hasProject) {
        setPropertyValue(data.propertyValue);
        setDownPayment(data.downPayment);
        setInterestRate(data.interestRate);
        setLoanTermMonths(data.loanTermMonths);
        setAmortizationType(data.amortizationType);
        setInstallmentsPaid(data.installmentsPaid);
        setObraBudget(data.obraBudget);
      }
    } catch {
      addToast({ title: "Erro", message: "Não foi possível carregar os dados.", type: "danger" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Project Handlers
  async function handleSetupProject(e: React.FormEvent) {
    e.preventDefault();
    try {
      const financedAmount = propertyValue - downPayment;
      const res = await fetch("/api/apartment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyValue,
          downPayment,
          financedAmount,
          interestRate,
          loanTermMonths,
          amortizationType,
          installmentsPaid,
          installmentsTotal: loanTermMonths,
          obraBudget,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao inicializar projeto");
      }

      addToast({ title: "Projeto Criado!", message: "Planejamento inicializado com sucesso.", type: "success" });
      setIsProjectModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      addToast({ title: "Erro", message: msg, type: "danger" });
    }
  }

  async function handleUpdateProject(e: React.FormEvent) {
    e.preventDefault();
    try {
      const financedAmount = propertyValue - downPayment;
      const res = await fetch("/api/apartment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyValue,
          downPayment,
          financedAmount,
          interestRate,
          loanTermMonths,
          amortizationType,
          installmentsPaid,
          installmentsTotal: loanTermMonths,
          obraBudget,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao atualizar projeto");
      }

      addToast({ title: "Projeto Atualizado!", message: "Dados de financiamento salvos.", type: "success" });
      setIsProjectModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      addToast({ title: "Erro", message: msg, type: "danger" });
    }
  }

  // Amortization increment helper
  async function handleIncrementInstallments() {
    if (!project || project.installmentsPaid === undefined || project.loanTermMonths === undefined) return;
    const nextVal = Math.min(project.loanTermMonths, project.installmentsPaid + 1);
    if (nextVal === project.installmentsPaid) return;

    try {
      const res = await fetch("/api/apartment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentsPaid: nextVal }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar");
      
      // Local state optimistic increment
      setProject(prev => prev ? { ...prev, installmentsPaid: nextVal } : null);
      setInstallmentsPaid(nextVal);
      addToast({
        title: "Parcela Paga!",
        message: `Total de parcelas pagas atualizado para ${nextVal}.`,
        type: "success",
      });
      
      if (nextVal === project.loanTermMonths) {
        celebrateAchievement("🏡 Financiamento Quitados! Apartamento totalmente pago!");
      }
    } catch {
      addToast({ title: "Erro", message: "Não foi possível registrar o pagamento.", type: "danger" });
    }
  }

  // Stage Handlers
  async function handleSaveStage(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingStage ? "PUT" : "POST";
      const url = editingStage ? `/api/apartment/stages/${editingStage.id}` : "/api/apartment/stages";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stageName,
          budget: stageBudget,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar etapa");
      }

      addToast({
        title: editingStage ? "Etapa Atualizada" : "Etapa Adicionada",
        message: stageName,
        type: "success",
      });
      setIsStageModalOpen(false);
      setEditingStage(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      addToast({ title: "Erro", message: msg, type: "danger" });
    }
  }

  async function handleCycleStageStatus(stage: Stage) {
    const nextStatusMap: Record<string, "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO"> = {
      PENDENTE: "EM_ANDAMENTO",
      EM_ANDAMENTO: "CONCLUIDO",
      CONCLUIDO: "PENDENTE",
    };
    const nextStatus = nextStatusMap[stage.status];

    try {
      const res = await fetch(`/api/apartment/stages/${stage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      addToast({ title: "Status Atualizado", message: `Etapa "${stage.name}" agora está ${nextStatus.replace("_", " ")}.`, type: "info" });
      loadData();
    } catch {
      addToast({ title: "Erro", message: "Não foi possível alterar o status.", type: "danger" });
    }
  }

  async function handleDeleteStage(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir a etapa "${name}"? Todas as despesas vinculadas perderão o vínculo.`)) return;
    try {
      const res = await fetch(`/api/apartment/stages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast({ title: "Etapa Excluída", message: name, type: "info" });
      loadData();
    } catch {
      addToast({ title: "Erro", message: "Não foi possível excluir a etapa.", type: "danger" });
    }
  }

  // Expense Handlers
  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const method = editingExpense ? "PUT" : "POST";
      const url = editingExpense ? `/api/apartment/expenses/${editingExpense.id}` : "/api/apartment/expenses";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDesc,
          amount: expenseAmount,
          status: expenseStatus,
          type: expenseType,
          date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
          stageId: expenseStageId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar despesa");
      }

      addToast({
        title: editingExpense ? "Despesa Atualizada" : "Despesa Adicionada",
        message: expenseDesc,
        type: "success",
      });
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      addToast({ title: "Erro", message: msg, type: "danger" });
    }
  }

  async function handleToggleExpenseStatus(expense: Expense) {
    const nextStatus: "PENDENTE" | "PAGO" = expense.status === "PAGO" ? "PENDENTE" : "PAGO";
    
    // Optimistic Update
    setProject(prev => {
      if (!prev || !prev.expenses) return prev;
      const updated = prev.expenses.map(e => e.id === expense.id ? { ...e, status: nextStatus } : e);
      return { ...prev, expenses: updated };
    });

    try {
      const res = await fetch(`/api/apartment/expenses/${expense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      addToast({ title: "Status Atualizado", message: `Despesa "${expense.description}" paga!`, type: "success" });
      loadData();
    } catch {
      // Revert on error
      setProject(prev => {
        if (!prev || !prev.expenses) return prev;
        const reverted = prev.expenses.map(e => e.id === expense.id ? { ...e, status: expense.status } : e);
        return { ...prev, expenses: reverted };
      });
      addToast({ title: "Erro", message: "Não foi possível alterar o pagamento.", type: "danger" });
    }
  }

  async function handleDeleteExpense(id: string, description: string) {
    if (!confirm(`Excluir a despesa "${description}"?`)) return;
    try {
      const res = await fetch(`/api/apartment/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let errMsg = "Não foi possível excluir a despesa.";
        try {
          const data = await res.json();
          if (data && data.error) errMsg = data.error;
        } catch {}
        throw new Error(errMsg);
      }
      addToast({ title: "Despesa Excluída", message: description, type: "info" });
      loadData();
    } catch (err: any) {
      addToast({ title: "Erro", message: err.message || "Não foi possível excluir a despesa.", type: "danger" });
    }
  }

  // Open modals helper
  function openStageModal(stage?: Stage) {
    if (stage) {
      setEditingStage(stage);
      setStageName(stage.name);
      setStageBudget(stage.budget);
    } else {
      setEditingStage(null);
      setStageName("");
      setStageBudget(0);
    }
    setIsStageModalOpen(true);
  }

  function openExpenseModal(expense?: Expense) {
    if (expense) {
      setEditingExpense(expense);
      setExpenseDesc(expense.description);
      setExpenseAmount(expense.amount);
      setExpenseStatus(expense.status);
      setExpenseType(expense.type || "OBRA");
      setExpenseDate(expense.date.substring(0, 10));
      setExpenseStageId(expense.stageId || "");
    } else {
      setEditingExpense(null);
      setExpenseDesc("");
      setExpenseAmount(0);
      setExpenseStatus("PENDENTE");
      setExpenseType("OBRA");
      setExpenseDate(new Date().toISOString().substring(0, 10));
      setExpenseStageId("");
    }
    setIsExpenseModalOpen(true);
  }

  // Calculations & Simulations
  const amortizationDetails = useMemo(() => {
    if (!project || !project.hasProject) return null;
    
    const pValue = project.propertyValue || 0;
    const dPayment = project.downPayment || 0;
    const rate = project.interestRate || 0;
    const term = project.loanTermMonths || 0;
    const type = project.amortizationType || "SAC";
    const paid = project.installmentsPaid || 0;

    const financed = pValue - dPayment;
    if (financed <= 0 || term <= 0) return null;

    const monthlyRate = rate / 12 / 100;
    const schedule = [];
    let balance = financed;
    let totalInterest = 0;

    if (type === "SAC") {
      const amortization = financed / term;
      for (let k = 1; k <= term; k++) {
        const interest = balance * monthlyRate;
        const installment = amortization + interest;
        totalInterest += interest;
        balance -= amortization;

        if (k > paid && schedule.length < 8) {
          schedule.push({
            installmentNumber: k,
            installment,
            amortization,
            interest,
            remainingBalance: Math.max(0, balance),
          });
        }
      }
      return {
        financed,
        firstInstallment: (financed / term) + (financed * monthlyRate),
        lastInstallment: (financed / term) + ((financed / term) * monthlyRate),
        averageInstallment: (financed / term) + (totalInterest / term),
        totalInterest,
        totalPaidEst: (financed / term) * paid + (totalInterest * (paid / term)),
        schedule,
      };
    } else {
      // PRICE
      const installment = monthlyRate > 0
        ? financed * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
        : financed / term;

      for (let k = 1; k <= term; k++) {
        const interest = balance * monthlyRate;
        const amortization = installment - interest;
        totalInterest += interest;
        balance -= amortization;

        if (k > paid && schedule.length < 8) {
          schedule.push({
            installmentNumber: k,
            installment,
            amortization,
            interest,
            remainingBalance: Math.max(0, balance),
          });
        }
      }

      return {
        financed,
        firstInstallment: installment,
        lastInstallment: installment,
        averageInstallment: installment,
        totalInterest,
        totalPaidEst: installment * paid,
        schedule,
      };
    }
  }, [project]);

  // Stage list values calculation
  const calculatedStages = useMemo(() => {
    if (!project || !project.stages || !project.expenses) return [];
    
    return project.stages.map(stage => {
      const stageExpenses = project.expenses?.filter(e => e.stageId === stage.id) || [];
      const totalSpent = stageExpenses.reduce((sum, e) => e.status === "PAGO" ? sum + e.amount : sum, 0);
      const totalPending = stageExpenses.reduce((sum, e) => e.status === "PENDENTE" ? sum + e.amount : sum, 0);
      return {
        ...stage,
        totalSpent,
        totalPending,
        expenses: stageExpenses,
      };
    });
  }, [project]);

  const spentOnObra = useMemo(() => {
    if (!project || !project.expenses) return 0;
    return project.expenses.reduce((sum, e) => e.status === "PAGO" ? sum + e.amount : sum, 0);
  }, [project]);

  const pendingOnObra = useMemo(() => {
    if (!project || !project.expenses) return 0;
    return project.expenses.reduce((sum, e) => e.status === "PENDENTE" ? sum + e.amount : sum, 0);
  }, [project]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    if (!project || !project.expenses) return [];
    let result = [...project.expenses];

    if (filterStageId !== "ALL") {
      result = result.filter(e => e.stageId === filterStageId);
    }
    if (filterStatus !== "ALL") {
      result = result.filter(e => e.status === filterStatus);
    }
    if (filterExpenseType !== "ALL") {
      result = result.filter(e => e.type === filterExpenseType);
    }

    // Sort by date desc
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [project, filterStageId, filterStatus, filterExpenseType]);

  // Formatted currencies helper
  function fmtBrl(val: number | undefined) {
    if (val === undefined) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Custom UI components
  if (loading) {
    return (
      <div className={styles.fullWidthLayout}>
        <main className={styles.main}>
          <div className={styles.setupCard}>
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid var(--color-border-strong)", borderTopColor: "var(--color-brand)", borderRadius: "50%" }} />
            </div>
            <p style={{ textAlign: "center", color: "var(--color-text-secondary)" }}>Carregando dados do apartamento...</p>
          </div>
        </main>
      </div>
    );
  }

  // Identify if user has started the planning project
  if (!project?.hasProject) {
    return (
      <div className={styles.fullWidthLayout}>
        <main className={styles.main}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Home size={28} className={styles.headerIcon} />
              <div>
                <h1 className={styles.appTitle}>Planejamento do Apartamento</h1>
                <p className={styles.appSubtitle}>Planeje seu financiamento, etapas da obra e custos do novo lar 🔑</p>
              </div>
            </div>
          </header>

          <div className={styles.setupCard}>
            <h2 className={styles.setupTitle}>🔐 Inicialize seu Planejamento</h2>
            <p className={styles.setupDesc}>Insira os parâmetros de financiamento e reforma do seu apartamento para gerar o simulador e cronograma de obra.</p>
            
            <form onSubmit={handleSetupProject} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Valor do Imóvel</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={propertyValue}
                    onChange={e => setPropertyValue(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Valor da Entrada</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={downPayment}
                    onChange={e => setDownPayment(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Taxa de Juros Anual (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    value={interestRate}
                    onChange={e => setInterestRate(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Prazo (Meses)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={loanTermMonths}
                    onChange={e => setLoanTermMonths(Math.max(1, parseInt(e.target.value)))}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo de Amortização</label>
                  <select
                    className={styles.select}
                    value={amortizationType}
                    onChange={e => setAmortizationType(e.target.value as "SAC" | "PRICE")}
                  >
                    <option value="SAC">SAC (Prestações decrescentes)</option>
                    <option value="PRICE">PRICE (Prestações fixas)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Parcelas Pagas</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={installmentsPaid}
                    onChange={e => setInstallmentsPaid(Math.max(0, parseInt(e.target.value)))}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Orçamento Planejado para a Obra/Reforma</label>
                <input
                  type="number"
                  className={styles.input}
                  value={obraBudget}
                  onChange={e => setObraBudget(Math.max(0, parseFloat(e.target.value)))}
                  required
                />
              </div>

              <button type="submit" className={styles.submitBtn}>Inicializar Meu Planejamento</button>
            </form>
          </div>
          <Celebration toasts={toasts} onDismiss={dismissToast} />
        </main>
      </div>
    );
  }

  // Dashboard structure
  const manualInstallments = project.installments || [];
  const manualPaidInstCount = manualInstallments.filter(i => i.status === "PAGO").length;
  const manualTotalInstCount = manualInstallments.length;
  const progressPctFin = manualTotalInstCount > 0 ? (manualPaidInstCount / manualTotalInstCount) * 100 : 0;
  const progressPctObra = project.obraBudget ? (spentOnObra / project.obraBudget) * 100 : 0;
  const totalProjectInvestment = (project.propertyValue || 0) + spentOnObra;

  return (
    <div className={styles.fullWidthLayout}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Home size={28} className={styles.headerIcon} />
            <div>
              <h1 className={styles.appTitle}>Meu Apartamento 🔑</h1>
              <p className={styles.appSubtitle}>Gerencie o financiamento, etapas de reforma e finanças do apartamento.</p>
            </div>
          </div>
          <button onClick={() => setIsProjectModalOpen(true)} className={styles.actionBtn}>
            <Edit2 size={16} />
            <span>Configurar Orçamento</span>
          </button>
        </header>

        {/* Overview Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Financiamento (Real)</span>
              <DollarSign size={16} className={styles.statIcon} />
            </div>
            <span className={styles.statValue}>
              {manualTotalInstCount > 0
                ? fmtBrl(manualInstallments.reduce((sum, i) => sum + i.amount, 0))
                : fmtBrl((project.propertyValue || 0) - (project.downPayment || 0))}
            </span>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPctFin}%` }} />
              </div>
              <div className={styles.progressLabel}>
                <span>{manualPaidInstCount} de {manualTotalInstCount} parcelas</span>
                <span>{progressPctFin.toFixed(0)}% pago</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${spentOnObra > (project.obraBudget || 0) ? styles.statCardWarning : styles.statCardSuccess}`}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Orçamento da Obra</span>
              <Hammer size={16} className={styles.statIcon} />
            </div>
            <span className={styles.statValue}>{fmtBrl(project.obraBudget)}</span>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(100, progressPctObra)}%`,
                    backgroundColor: spentOnObra > (project.obraBudget || 0) ? "var(--color-danger)" : undefined
                  }}
                />
              </div>
              <div className={styles.progressLabel}>
                <span>Spent: {fmtBrl(spentOnObra)}</span>
                <span>{progressPctObra.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Custo Total Acumulado</span>
              <TrendingUp size={16} className={styles.statIcon} />
            </div>
            <span className={styles.statValue}>{fmtBrl(totalProjectInvestment)}</span>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}>
              Imóvel ({fmtBrl(project.propertyValue)}) + Obra Paga ({fmtBrl(spentOnObra)})
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className={styles.tabs} aria-label="Abas do Apartamento">
          <button
            className={`${styles.tabBtn} ${activeTab === "financiamento" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("financiamento")}
          >
            Financiamento
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "obra" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("obra")}
          >
            Etapas da Obra
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "despesas" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("despesas")}
          >
            Despesas ({project.expenses?.length || 0})
          </button>
        </nav>

        {/* Tab Contents */}
        <div className={styles.tabContent}>
          {activeTab === "financiamento" && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Landmark size={20} />
                  <span>Parcelas Reais de Financiamento (Lançamento Manual)</span>
                </h2>
                <button onClick={() => openInstallmentModal()} className={styles.primaryActionBtn}>
                  <Plus size={16} />
                  <span>Lançar Parcela Manual</span>
                </button>
              </div>

              {!project.installments || project.installments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px var(--space-4)" }}>
                  <p style={{ color: "var(--color-text-tertiary)" }}>Nenhuma parcela manual lançada ainda.</p>
                  <button onClick={() => openInstallmentModal()} className={styles.actionBtn} style={{ margin: "16px auto 0" }}>
                    <Plus size={16} />
                    <span>Lançar Primeira Parcela</span>
                  </button>
                </div>
              ) : (
                <div>
                  {/* Manual Stats Summary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                    <div className={styles.infoBox} style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", padding: "12px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Progresso Geral</span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                        <strong style={{ fontSize: "16px" }}>
                          {project.installments.filter(i => i.status === "PAGO").length} de {project.installments.length}
                        </strong>
                        <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: "bold" }}>
                          {((project.installments.filter(i => i.status === "PAGO").length / project.installments.length) * 100).toFixed(0)}% Pago
                        </span>
                      </div>
                    </div>
                    <div className={styles.infoBox} style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", padding: "12px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Total Pago</span>
                      <div style={{ marginTop: "4px" }}>
                        <strong style={{ fontSize: "16px", color: "var(--color-success)" }}>
                          {fmtBrl(project.installments.filter(i => i.status === "PAGO").reduce((sum, i) => sum + i.amount, 0))}
                        </strong>
                      </div>
                    </div>
                    <div className={styles.infoBox} style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", padding: "12px" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-tertiary)" }}>Restante a Pagar</span>
                      <div style={{ marginTop: "4px" }}>
                        <strong style={{ fontSize: "16px", color: "var(--color-warning)" }}>
                          {fmtBrl(project.installments.filter(i => i.status === "PENDENTE").reduce((sum, i) => sum + i.amount, 0))}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: "80px" }}>Pago?</th>
                          <th>Nº Parcela</th>
                          <th>Vencimento</th>
                          <th>Valor da Prestação</th>
                          <th style={{ width: "100px", textAlign: "right" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.installments.map((inst) => (
                          <tr key={inst.id} style={{ opacity: inst.status === "PAGO" ? 0.8 : 1 }}>
                            <td>
                              <input
                                type="checkbox"
                                className={styles.expenseCheckbox}
                                checked={inst.status === "PAGO"}
                                onChange={() => handleToggleInstallmentStatus(inst)}
                                title="Marcar parcela como paga"
                              />
                            </td>
                            <td style={{ fontWeight: "bold" }}>Parcela #{inst.installmentNumber}</td>
                            <td>{new Date(inst.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                            <td style={{ fontWeight: "bold", color: inst.status === "PAGO" ? "var(--color-success)" : "var(--color-warning)" }}>
                              {fmtBrl(inst.amount)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => openInstallmentModal(inst)} className={styles.iconBtn} title="Editar Parcela">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteInstallment(inst.id, inst.installmentNumber)} className={`${styles.iconBtn} ${styles.dangerIconBtn}`} title="Excluir Parcela">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "obra" && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <Hammer size={20} />
                  <span>Cronograma da Reforma</span>
                </h2>
                <button onClick={() => openStageModal()} className={styles.primaryActionBtn}>
                  <Plus size={16} />
                  <span>Nova Etapa</span>
                </button>
              </div>

              {calculatedStages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px var(--space-4)" }}>
                  <p style={{ color: "var(--color-text-tertiary)" }}>Nenhuma etapa de obra cadastrada ainda.</p>
                  <button onClick={() => openStageModal()} className={styles.actionBtn} style={{ margin: "16px auto 0" }}>
                    <Plus size={16} />
                    <span>Cadastrar Primeira Etapa</span>
                  </button>
                </div>
              ) : (
                <div className={styles.stagesGrid}>
                  {calculatedStages.map((stage) => {
                    const stPercent = stage.budget ? (stage.totalSpent / stage.budget) * 100 : 0;
                    return (
                      <div key={stage.id} className={styles.stageCard}>
                        <div className={styles.stageCardHeader}>
                          <span className={styles.stageName}>{stage.name}</span>
                          <button
                            onClick={() => handleCycleStageStatus(stage)}
                            className={`${styles.stageStatusBadge} ${
                              stage.status === "CONCLUIDO"
                                ? styles.statusCompleted
                                : stage.status === "EM_ANDAMENTO"
                                ? styles.statusOngoing
                                : styles.statusPending
                            }`}
                            title="Clique para alterar o status"
                          >
                            {stage.status === "CONCLUIDO" ? "Concluída" : stage.status === "EM_ANDAMENTO" ? "Em Andamento" : "Pendente"}
                          </button>
                        </div>

                        <div className={styles.stageBudgetInfo}>
                          <div>
                            <div className={styles.label} style={{ fontSize: "10px" }}>Orçamento</div>
                            <span className={styles.stageBudgetValue}>{fmtBrl(stage.budget)}</span>
                          </div>
                          <div>
                            <div className={styles.label} style={{ fontSize: "10px" }}>Gasto Real</div>
                            <span className={`${styles.stageSpentValue} ${stage.totalSpent > stage.budget ? styles.stageSpentOverBudget : ""}`}>
                              {fmtBrl(stage.totalSpent)}
                            </span>
                          </div>
                        </div>

                        <div className={styles.progressContainer}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${Math.min(100, stPercent)}%`,
                                backgroundColor: stage.totalSpent > stage.budget ? "var(--color-danger)" : "var(--color-brand)"
                              }}
                            />
                          </div>
                          <div className={styles.progressLabel}>
                            <span>Eficiência do Orçamento</span>
                            <span>{stPercent.toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className={styles.stageActions}>
                          <button onClick={() => openStageModal(stage)} className={styles.iconBtn} title="Editar Etapa">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteStage(stage.id, stage.name)} className={`${styles.iconBtn} ${styles.dangerIconBtn}`} title="Excluir Etapa">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "despesas" && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <DollarSign size={20} />
                  <span>Despesas do Apartamento</span>
                </h2>
                <button onClick={() => openExpenseModal()} className={styles.primaryActionBtn}>
                  <Plus size={16} />
                  <span>Adicionar Despesa</span>
                </button>
              </div>

              <div className={styles.expensesControls}>
                <div className={styles.expensesFilters}>
                  <div className={styles.formGroup} style={{ width: "auto" }}>
                    <select
                      className={styles.filterSelect}
                      value={filterStageId}
                      onChange={e => setFilterStageId(e.target.value)}
                    >
                      <option value="ALL">Todas as Etapas</option>
                      {project.stages?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="NONE">Sem Etapa Vinculada</option>
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ width: "auto" }}>
                    <select
                      className={styles.filterSelect}
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                    >
                      <option value="ALL">Todos os Status</option>
                      <option value="PAGO">Pagas</option>
                      <option value="PENDENTE">Pendentes</option>
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ width: "auto" }}>
                    <select
                      className={styles.filterSelect}
                      value={filterExpenseType}
                      onChange={e => setFilterExpenseType(e.target.value)}
                    >
                      <option value="ALL">Todos os Tipos</option>
                      <option value="OBRA">Obra/Reforma</option>
                      <option value="DOCUMENTACAO">Documentação</option>
                      <option value="MOVEIS">Móveis Planejados</option>
                      <option value="DECORACAO">Decoração/Acabamento</option>
                      <option value="GERAL">Geral/Outros</option>
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
                  <span>Pendente: <strong className={styles.pendingAmount}>{fmtBrl(pendingOnObra)}</strong></span>
                  <span style={{ marginLeft: "16px" }}>Pago: <strong className={styles.paidAmount}>{fmtBrl(spentOnObra)}</strong></span>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px var(--space-4)" }}>
                  <p style={{ color: "var(--color-text-tertiary)" }}>Nenhuma despesa de apartamento encontrada para os filtros selecionados.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredExpenses.map((expense) => {
                    const linkedStage = project.stages?.find(s => s.id === expense.stageId);
                    return (
                      <div
                        key={expense.id}
                        className={`${styles.expenseRow} ${expense.status === "PAGO" ? styles.expenseRowChecked : ""}`}
                      >
                        <div className={styles.expenseLeft}>
                          <input
                            type="checkbox"
                            className={styles.expenseCheckbox}
                            checked={expense.status === "PAGO"}
                            onChange={() => handleToggleExpenseStatus(expense)}
                            title="Marcar como paga"
                          />
                          <div className={styles.expenseMeta}>
                            <span className={styles.expenseDesc}>{expense.description}</span>
                            <div className={styles.expenseDetails}>
                              <span className={`${styles.typeBadge} ${
                                expense.type === "OBRA" ? styles.badgeObra :
                                expense.type === "DOCUMENTACAO" ? styles.badgeDocumentacao :
                                expense.type === "MOVEIS" ? styles.badgeMoveis :
                                expense.type === "DECORACAO" ? styles.badgeDecoracao :
                                styles.badgeGeral
                              }`}>
                                {expense.type === "OBRA" ? "Obra" :
                                 expense.type === "DOCUMENTACAO" ? "Documentação" :
                                 expense.type === "MOVEIS" ? "Móveis" :
                                 expense.type === "DECORACAO" ? "Decoração" : "Geral"}
                              </span>
                              {linkedStage && (
                                <span className={styles.expenseStageTag}>{linkedStage.name}</span>
                              )}
                              {(() => {
                                const isPending = expense.status === "PENDENTE";
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                const tomorrow = new Date(today);
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const yyyy = tomorrow.getFullYear();
                                const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
                                const dd = String(tomorrow.getDate()).padStart(2, "0");
                                const tomorrowStr = `${yyyy}-${mm}-${dd}`;
                                
                                const isDueTomorrow = isPending && expense.date.slice(0, 10) === tomorrowStr;
                                const isOverdue = isPending && new Date(expense.date) < today;

                                return (
                                  <span className={`${styles.dueDateTag} ${
                                    isDueTomorrow ? styles.dueDateTagTomorrow :
                                    isOverdue ? styles.dueDateTagOverdue : ""
                                  }`}>
                                    <Calendar size={12} />
                                    <span>Vence {new Date(expense.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className={styles.expenseRight}>
                          <span className={`${styles.expenseAmount} ${expense.status === "PAGO" ? styles.paidAmount : styles.pendingAmount}`}>
                            {fmtBrl(expense.amount)}
                          </span>
                          <button onClick={() => openExpenseModal(expense)} className={styles.iconBtn} title="Editar despesa">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id, expense.description)} className={`${styles.iconBtn} ${styles.dangerIconBtn}`} title="Excluir despesa">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* General slips with Apartamento category section */}
              <div className={styles.generalSlipsSection}>
                <h3 className={styles.generalSlipsTitle}>
                  <FileText size={18} />
                  <span>Despesas Gerais Registradas como "Apartamento"</span>
                </h3>
                
                {!project.generalSlips || project.generalSlips.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", background: "var(--color-bg-input)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                    <p style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>
                      Nenhuma despesa geral cadastrada sob a categoria "Apartamento" no painel principal.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                      Estas despesas são cadastradas no fluxo financeiro geral (com categoria "Apartamento") e sincronizadas automaticamente aqui.
                    </p>
                    {project.generalSlips.map((slip) => (
                      <div
                        key={slip.id}
                        className={`${styles.expenseRow} ${slip.status === "PAGO" ? styles.expenseRowChecked : ""}`}
                      >
                        <div className={styles.expenseLeft}>
                          <input
                            type="checkbox"
                            className={styles.expenseCheckbox}
                            checked={slip.status === "PAGO"}
                            onChange={() => handleToggleGeneralSlipStatus(slip)}
                            title="Marcar despesa geral como paga"
                          />
                          <div className={styles.expenseMeta}>
                            <span className={styles.expenseDesc}>{slip.title}</span>
                            <div className={styles.expenseDetails}>
                              <span className={styles.expenseStageTag} style={{ backgroundColor: (slip.category?.colorCode || "var(--color-brand)") + "20", color: slip.category?.colorCode || "var(--color-brand)" }}>
                                {slip.category?.name || "Apartamento"}
                              </span>
                              {(() => {
                                const isPending = slip.status === "PENDENTE";
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                const tomorrow = new Date(today);
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                const yyyy = tomorrow.getFullYear();
                                const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
                                const dd = String(tomorrow.getDate()).padStart(2, "0");
                                const tomorrowStr = `${yyyy}-${mm}-${dd}`;
                                
                                const isDueTomorrow = isPending && slip.dueDate.slice(0, 10) === tomorrowStr;
                                const isOverdue = isPending && new Date(slip.dueDate) < today;

                                return (
                                  <span className={`${styles.dueDateTag} ${
                                    isDueTomorrow ? styles.dueDateTagTomorrow :
                                    isOverdue ? styles.dueDateTagOverdue : ""
                                  }`}>
                                    <Calendar size={12} />
                                    <span>Vence {new Date(slip.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <div className={styles.expenseRight}>
                          <span className={`${styles.expenseAmount} ${slip.status === "PAGO" ? styles.paidAmount : styles.pendingAmount}`}>
                            {fmtBrl(slip.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modals Section */}
        
        {/* 1. Project Parameters Modal */}
        {isProjectModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>Configurar Orçamento</h3>
              <form onSubmit={handleUpdateProject} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Valor do Imóvel</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={propertyValue}
                    onChange={e => setPropertyValue(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Orçamento da Obra</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={obraBudget}
                    onChange={e => setObraBudget(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsProjectModalOpen(false)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Stage Modal */}
        {isStageModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>{editingStage ? "Editar Etapa da Obra" : "Nova Etapa da Obra"}</h3>
              <form onSubmit={handleSaveStage} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome da Etapa</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={stageName}
                    onChange={e => setStageName(e.target.value)}
                    placeholder="Ex: Demolição, Pintura, Marcenaria..."
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Orçamento Estimado (R$)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={stageBudget}
                    onChange={e => setStageBudget(Math.max(0, parseFloat(e.target.value)))}
                    required
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsStageModalOpen(false)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    {editingStage ? "Salvar Alterações" : "Adicionar Etapa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Expense Modal */}
        {isExpenseModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>{editingExpense ? "Editar Despesa" : "Nova Despesa"}</h3>
              <form onSubmit={handleSaveExpense} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descrição</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={expenseDesc}
                    onChange={e => setExpenseDesc(e.target.value)}
                    placeholder="Ex: Piso porcelanato, Tomadas, Pedreiro..."
                    required
                  />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={expenseAmount}
                      onChange={e => setExpenseAmount(Math.max(0, parseFloat(e.target.value)))}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Data</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={expenseDate}
                      onChange={e => setExpenseDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status de Pagamento</label>
                    <select
                      className={styles.select}
                      value={expenseStatus}
                      onChange={e => setExpenseStatus(e.target.value as "PENDENTE" | "PAGO")}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="PAGO">Pago</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Etapa Vinculada</label>
                    <select
                      className={styles.select}
                      value={expenseStageId}
                      onChange={e => setExpenseStageId(e.target.value)}
                    >
                      <option value="">Nenhuma (Geral)</option>
                      {project.stages?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginTop: "8px" }}>
                  <label className={styles.label}>Tipo de Despesa</label>
                  <select
                    className={styles.select}
                    value={expenseType}
                    onChange={e => setExpenseType(e.target.value)}
                  >
                    <option value="OBRA">Obra/Reforma</option>
                    <option value="DOCUMENTACAO">Documentação (ITBI, Registro, Taxas...)</option>
                    <option value="MOVEIS">Móveis Planejados</option>
                    <option value="DECORACAO">Decoração/Acabamento</option>
                    <option value="GERAL">Outros/Geral</option>
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    {editingExpense ? "Salvar Alterações" : "Adicionar Despesa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Manual Installment Modal */}
        {isInstallmentModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.modalTitle}>{editingInstallment ? "Editar Parcela Manual" : "Lançar Parcela Manual"}</h3>
              <form onSubmit={handleSaveInstallment} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nº da Parcela</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={instNumber}
                      onChange={e => setInstNumber(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Valor da Prestação (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={styles.input}
                      value={instAmount}
                      onChange={e => setInstAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Data de Vencimento</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={instDueDate}
                      onChange={e => setInstDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status</label>
                    <select
                      className={styles.select}
                      value={instStatus}
                      onChange={e => setInstStatus(e.target.value as "PENDENTE" | "PAGO")}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="PAGO">Pago</option>
                    </select>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsInstallmentModalOpen(false)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    {editingInstallment ? "Salvar Alterações" : "Adicionar Parcela"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Celebration toasts={toasts} onDismiss={dismissToast} />
      </main>
    </div>
  );
}
