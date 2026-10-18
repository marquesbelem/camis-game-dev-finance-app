"use client";

import React, { useState, useEffect } from "react";
import { Pet } from "@/lib/types";
import { X } from "lucide-react";
import styles from "./PetModal.module.css";

interface PetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savedPet: Pet) => void;
  editingPet?: Pet | null;
}

const EMOJI_OPTIONS = ["🐶", "🐕", "🐩", "🦮", "🐱", "🐈", "🐾", "🐰", "🦜", "🐹"];

export default function PetModal({
  isOpen,
  onClose,
  onSave,
  editingPet,
}: PetModalProps) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Cachorro");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [weight, setWeight] = useState("");
  const [rga, setRga] = useState("");
  const [photoUrl, setPhotoUrl] = useState("🐶");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (editingPet) {
      setName(editingPet.name);
      setSpecies(editingPet.species || "Cachorro");
      setBreed(editingPet.breed || "");
      setBirthDate(editingPet.birthDate ? editingPet.birthDate.slice(0, 10) : "");
      setWeight(editingPet.weight !== null ? String(editingPet.weight) : "");
      setRga(editingPet.rga || "");
      setPhotoUrl(editingPet.photoUrl || (editingPet.species === "Gato" ? "🐱" : "🐶"));
      setNotes(editingPet.notes || "");
    } else {
      setName("");
      setSpecies("Cachorro");
      setBreed("");
      setBirthDate("");
      setWeight("");
      setRga("");
      setPhotoUrl("🐶");
      setNotes("");
    }
    setErrorMsg("");
  }, [editingPet, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("O nome do pet é obrigatório.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const url = editingPet ? `/api/pets/${editingPet.id}` : "/api/pets";
      const method = editingPet ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          species,
          breed: breed.trim() || null,
          birthDate: birthDate || null,
          weight: weight ? parseFloat(weight.replace(",", ".")) : null,
          rga: rga.trim() || null,
          photoUrl,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar informações do pet");
      }

      const saved = await res.json();
      onSave(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h3 className={styles.title}>
            {editingPet ? `Editar ${editingPet.name}` : "Cadastrar Novo Pet 🐾"}
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formBody}>
            {errorMsg && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>{errorMsg}</div>
            )}

          {/* Avatar selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Ícone do Pet</label>
            <div className={styles.avatarPicker}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`${styles.avatarOption} ${photoUrl === emoji ? styles.avatarOptionActive : ""}`}
                  onClick={() => setPhotoUrl(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="pet-name-input" className={styles.label}>
              Nome do Pet *
            </label>
            <input
              id="pet-name-input"
              type="text"
              className={styles.input}
              placeholder="Ex: Luna, Thor, Belinha..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="pet-species-select" className={styles.label}>
                Espécie
              </label>
              <select
                id="pet-species-select"
                className={styles.select}
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
              >
                <option value="Cachorro">Cachorro 🐶</option>
                <option value="Gato">Gato 🐱</option>
                <option value="Coelho">Coelho 🐰</option>
                <option value="Ave">Ave 🦜</option>
                <option value="Outro">Outro 🐾</option>
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="pet-breed-input" className={styles.label}>
                Raça
              </label>
              <input
                id="pet-breed-input"
                type="text"
                className={styles.input}
                placeholder="Ex: Golden, SRD..."
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.rowTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="pet-birth-input" className={styles.label}>
                Data de Nascimento
              </label>
              <input
                id="pet-birth-input"
                type="date"
                className={styles.input}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="pet-weight-input" className={styles.label}>
                Peso (kg)
              </label>
              <input
                id="pet-weight-input"
                type="text"
                className={styles.input}
                placeholder="Ex: 8.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="pet-rga-input" className={styles.label}>
              RGA (Registro Geral Animal)
            </label>
            <input
              id="pet-rga-input"
              type="text"
              className={styles.input}
              placeholder="Ex: 12345678-9"
              value={rga}
              onChange={(e) => setRga(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="pet-notes-input" className={styles.label}>
              Observações / Cuidados Especiais
            </label>
            <textarea
              id="pet-notes-input"
              className={styles.textarea}
              placeholder="Ex: Alérgica a frango, toma remédio preventivo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          </div>

          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Salvando..." : editingPet ? "Salvar Alterações" : "Cadastrar Pet"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
