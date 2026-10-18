"use client";

import React from "react";
import { Pet } from "@/lib/types";
import { Plus } from "lucide-react";
import styles from "./PetSwitcher.module.css";

interface PetSwitcherProps {
  pets: Pet[];
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
  onAddPet: () => void;
}

export default function PetSwitcher({
  pets,
  selectedPetId,
  onSelectPet,
  onAddPet,
}: PetSwitcherProps) {
  if (pets.length === 0) return null;

  return (
    <nav className={styles.container} aria-label="Seletor de Pets">
      {pets.map((pet) => {
        const isActive = pet.id === selectedPetId;
        const emoji = pet.photoUrl || (pet.species === "Gato" ? "🐱" : "🐶");

        return (
          <button
            key={pet.id}
            type="button"
            className={`${styles.petPill} ${isActive ? styles.petPillActive : ""}`}
            onClick={() => onSelectPet(pet.id)}
            aria-pressed={isActive}
            aria-label={`Ver painel de ${pet.name}`}
          >
            <span className={styles.pillEmoji} aria-hidden="true">
              {emoji}
            </span>
            <span>{pet.name}</span>
          </button>
        );
      })}

      <button
        type="button"
        className={styles.addPetBtn}
        onClick={onAddPet}
        title="Cadastrar outro pet"
        aria-label="Adicionar outro pet"
      >
        <Plus size={15} />
        <span>Novo Pet</span>
      </button>
    </nav>
  );
}
