"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Pet, PetVaccine, PetAppointment, PetAlert, AppointmentStatusType } from "@/lib/types";
import PetProfileCard from "@/components/Pet/PetProfileCard";
import PetSwitcher from "@/components/Pet/PetSwitcher";
import VaccineCalendar from "@/components/Pet/VaccineCalendar";
import AppointmentsSection from "@/components/Pet/AppointmentsSection";
import PetAlertBanner from "@/components/Pet/PetAlertBanner";
import PetModal from "@/components/Pet/PetModal";
import VaccineModal from "@/components/Pet/VaccineModal";
import AppointmentModal from "@/components/Pet/AppointmentModal";
import PetFab from "@/components/Pet/PetFab";
import Celebration, { useToasts } from "@/components/Achievements/Celebration";
import { Dog, Plus } from "lucide-react";
import styles from "./page.module.css";

export default function PetDashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<PetAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);

  const [isVaccineModalOpen, setIsVaccineModalOpen] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<PetVaccine | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<PetAppointment | null>(null);

  const { toasts, dismissToast, addToast } = useToasts();

  // Load pets from API
  const loadPets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/pets");
      if (res.ok) {
        const data: Pet[] = await res.json();
        setPets(data);

        // Keep or set active pet
        setSelectedPetId((curr) => {
          if (curr && data.some((p) => p.id === curr)) return curr;
          return data.length > 0 ? data[0].id : null;
        });
      }
    } catch (err) {
      console.error("Erro ao carregar pets:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Load alerts (vaccine boosters & daycare today)
  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/pets/notifications");
      if (res.ok) {
        const data = await res.json();
        const combined = [...(data.vaccineAlerts || []), ...(data.appointmentAlerts || [])];
        setAlerts(combined);
      }
    } catch (err) {
      console.error("Erro ao carregar alertas de pet:", err);
    }
  }, []);

  useEffect(() => {
    loadPets();
    loadAlerts();
  }, [loadPets, loadAlerts]);

  // Current active pet
  const activePet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId) || null;
  }, [pets, selectedPetId]);

  // ── Pet CRUD Handlers ─────────────────────────────────────────────────────
  function handleOpenAddPet() {
    setEditingPet(null);
    setIsPetModalOpen(true);
  }

  function handleOpenEditPet(pet: Pet) {
    setEditingPet(pet);
    setIsPetModalOpen(true);
  }

  async function handleDeletePet(petId: string, petName: string) {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de "${petName}"? Todas as vacinas e compromissos também serão removidos.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pets/${petId}`, { method: "DELETE" });
      if (res.ok) {
        setPets((prev) => prev.filter((p) => p.id !== petId));
        setSelectedPetId((curr) => (curr === petId ? null : curr));
        addToast({
          title: "Pet excluído",
          message: `${petName} foi removido(a) com sucesso.`,
          type: "info",
        });
        await loadPets(true);
        await loadAlerts();
      }
    } catch (err) {
      console.error("Erro ao excluir pet:", err);
    }
  }

  // ── Vaccine CRUD Handlers ─────────────────────────────────────────────────
  function handleOpenAddVaccine() {
    setEditingVaccine(null);
    setIsVaccineModalOpen(true);
  }

  function handleOpenEditVaccine(vaccine: PetVaccine) {
    setEditingVaccine(vaccine);
    setIsVaccineModalOpen(true);
  }

  async function handleDeleteVaccine(vaccineId: string, vaccineName: string) {
    if (!activePet) return;
    if (!window.confirm(`Deseja excluir o registro da vacina "${vaccineName}"? Se havia despesa vinculada, ela também será removida.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/pets/${activePet.id}/vaccines/${vaccineId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast({
          title: "Vacina excluída",
          message: `Registro de ${vaccineName} removido.`,
          type: "info",
        });
        await loadPets(true);
        await loadAlerts();
      }
    } catch (err) {
      console.error("Erro ao excluir vacina:", err);
    }
  }

  // ── Appointment CRUD Handlers ─────────────────────────────────────────────
  function handleOpenAddAppointment() {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(true);
  }

  function handleOpenEditAppointment(appointment: PetAppointment) {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  }

  async function handleDeleteAppointment(appointmentId: string, title: string) {
    if (!activePet) return;
    if (!window.confirm(`Deseja excluir o compromisso "${title}"?`)) return;

    try {
      const res = await fetch(
        `/api/pets/${activePet.id}/appointments/${appointmentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        addToast({
          title: "Compromisso excluído",
          message: `"${title}" removido com sucesso.`,
          type: "info",
        });
        await loadPets(true);
        await loadAlerts();
      }
    } catch (err) {
      console.error("Erro ao excluir compromisso:", err);
    }
  }

  async function handleToggleAppointmentStatus(
    appointmentId: string,
    currentStatus: AppointmentStatusType
  ) {
    if (!activePet) return;

    // Cycle: PENDENTE -> COMPARECEU -> FALTOU -> PENDENTE
    const nextStatus: AppointmentStatusType =
      currentStatus === "PENDENTE"
        ? "COMPARECEU"
        : currentStatus === "COMPARECEU"
        ? "FALTOU"
        : "PENDENTE";

    // Optimistic update
    setPets((prev) =>
      prev.map((pet) => {
        if (pet.id !== activePet.id) return pet;
        return {
          ...pet,
          appointments: (pet.appointments || []).map((app) =>
            app.id === appointmentId ? { ...app, status: nextStatus } : app
          ),
        };
      })
    );

    try {
      const res = await fetch(
        `/api/pets/${activePet.id}/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (res.ok) {
        const label =
          nextStatus === "COMPARECEU"
            ? "Presença confirmada! 🎉"
            : nextStatus === "FALTOU"
            ? "Marcado como não compareceu."
            : "Marcado como pendente.";

        addToast({
          title: "Presença atualizada",
          message: label,
          type: nextStatus === "COMPARECEU" ? "success" : "info",
        });
        await loadAlerts();
      } else {
        await loadPets(true);
      }
    } catch (err) {
      console.error("Erro ao atualizar status do compromisso:", err);
      await loadPets(true);
    }
  }

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <header className={styles.topSection}>
        <div className={styles.titleArea}>
          <div>
            <h1 className={styles.pageTitle}>
              <Dog size={28} color="#f43f5e" />
              Dashboard Pet
            </h1>
            <p className={styles.pageSubtitle}>
              Acompanhamento de saúde, calendário de vacinas, creche e despesas do seu pet
            </p>
          </div>
        </div>

        {/* Pet Switcher Bar */}
        <PetSwitcher
          pets={pets}
          selectedPetId={selectedPetId}
          onSelectPet={setSelectedPetId}
          onAddPet={handleOpenAddPet}
        />
      </header>

      {/* Real-time Alerts Banner (Vaccine boosters & daycare today) */}
      <PetAlertBanner alerts={alerts} />

      {/* Main Content Area */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      ) : pets.length === 0 ? (
        /* Empty State */
        <section className={styles.zeroPetsCard}>
          <div className={styles.zeroIcon} aria-hidden="true">
            🐶
          </div>
          <h2 className={styles.zeroTitle}>Nenhum Pet Cadastrado</h2>
          <p className={styles.zeroText}>
            Cadastre seu primeiro pet para gerenciar vacinas com reforço automático, dias de creche com controle de presença e vincular os gastos diretamente às suas despesas financeiras mensais!
          </p>
          <button
            type="button"
            className={styles.createFirstBtn}
            onClick={handleOpenAddPet}
          >
            <Plus size={18} />
            <span>Cadastrar Meu Pet</span>
          </button>
        </section>
      ) : activePet ? (
        <main className={styles.mainGrid}>
          {/* Pet Profile Hero Card */}
          <PetProfileCard
            pet={activePet}
            onEdit={handleOpenEditPet}
            onDelete={handleDeletePet}
          />

          {/* Two-columns on desktop: Vaccine Calendar & Daycare Appointments */}
          <div className={styles.twoCols}>
            {/* Vaccines & Vermifuges */}
            <VaccineCalendar
              vaccines={activePet.vaccines || []}
              petName={activePet.name}
              onAdd={handleOpenAddVaccine}
              onEdit={handleOpenEditVaccine}
              onDelete={handleDeleteVaccine}
            />

            {/* Appointments / Daycare */}
            <AppointmentsSection
              appointments={activePet.appointments || []}
              petName={activePet.name}
              onAdd={handleOpenAddAppointment}
              onEdit={handleOpenEditAppointment}
              onDelete={handleDeleteAppointment}
              onToggleStatus={handleToggleAppointmentStatus}
            />
          </div>
        </main>
      ) : null}

      {/* Floating Action Button (FAB) */}
      <PetFab
        onAddPet={handleOpenAddPet}
        onAddVaccine={activePet ? handleOpenAddVaccine : undefined}
        onAddAppointment={activePet ? handleOpenAddAppointment : undefined}
        hasPets={pets.length > 0}
      />

      {/* Modals */}
      <PetModal
        isOpen={isPetModalOpen}
        onClose={() => setIsPetModalOpen(false)}
        onSave={(saved) => {
          loadPets(true);
          setSelectedPetId(saved.id);
          addToast({
            title: editingPet ? "Pet atualizado" : "Pet cadastrado! 🐾",
            message: `${saved.name} foi salvo(a) com sucesso.`,
            type: "success",
          });
        }}
        editingPet={editingPet}
      />

      {activePet && (
        <VaccineModal
          isOpen={isVaccineModalOpen}
          onClose={() => setIsVaccineModalOpen(false)}
          onSave={(saved) => {
            loadPets(true);
            loadAlerts();
            addToast({
              title: editingVaccine ? "Vacina atualizada" : "Vacina registrada! 💉",
              message: saved.isExpense
                ? `${saved.name} registrada e despesa vinculada às contas do mês.`
                : `${saved.name} registrada com sucesso.`,
              type: "success",
            });
          }}
          petId={activePet.id}
          petName={activePet.name}
          editingVaccine={editingVaccine}
        />
      )}

      {activePet && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          onSave={(saved) => {
            loadPets(true);
            loadAlerts();
            addToast({
              title: editingAppointment ? "Compromisso atualizado" : "Compromisso agendado! 🎒",
              message: `${saved.title} agendado(a) com sucesso.`,
              type: "success",
            });
          }}
          petId={activePet.id}
          petName={activePet.name}
          editingAppointment={editingAppointment}
        />
      )}

      {/* Celebrations & Toasts */}
      <Celebration toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
