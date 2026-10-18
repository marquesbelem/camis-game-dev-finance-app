"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Dog, Syringe, CalendarDays } from "lucide-react";
import styles from "./PetFab.module.css";

interface PetFabProps {
  onAddPet: () => void;
  onAddVaccine?: () => void;
  onAddAppointment?: () => void;
  hasPets: boolean;
}

export default function PetFab({
  onAddPet,
  onAddVaccine,
  onAddAppointment,
  hasPets,
}: PetFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function handleMainClick() {
    if (!hasPets) {
      onAddPet();
    } else {
      setIsOpen((prev) => !prev);
    }
  }

  function handleSubAction(action: () => void) {
    action();
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={styles.fabContainer}>
      {isOpen && hasPets && (
        <div className={styles.menuList}>
          <div className={styles.menuItem}>
            <span className={styles.itemLabel}>Cadastrar Novo Pet</span>
            <button
              type="button"
              className={`${styles.subBtn} ${styles.subBtnPet}`}
              onClick={() => handleSubAction(onAddPet)}
              title="Cadastrar Novo Pet"
              aria-label="Cadastrar Novo Pet"
            >
              <Dog size={18} />
            </button>
          </div>

          {onAddVaccine && (
            <div className={styles.menuItem}>
              <span className={styles.itemLabel}>Nova Vacina / Vermífugo</span>
              <button
                type="button"
                className={`${styles.subBtn} ${styles.subBtnVac}`}
                onClick={() => handleSubAction(onAddVaccine)}
                title="Nova Vacina / Vermífugo"
                aria-label="Nova Vacina ou Vermífugo"
              >
                <Syringe size={18} />
              </button>
            </div>
          )}

          {onAddAppointment && (
            <div className={styles.menuItem}>
              <span className={styles.itemLabel}>Agendar Creche / Compromisso</span>
              <button
                type="button"
                className={`${styles.subBtn} ${styles.subBtnApp}`}
                onClick={() => handleSubAction(onAddAppointment)}
                title="Agendar Creche ou Compromisso"
                aria-label="Agendar Creche ou Compromisso"
              >
                <CalendarDays size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className={styles.mainBtn}
        onClick={handleMainClick}
        title={hasPets ? (isOpen ? "Fechar opções" : "Ações do Pet") : "Adicionar Pet"}
        aria-label={hasPets ? "Ações do Pet" : "Adicionar Pet"}
        aria-expanded={isOpen}
      >
        <span className={`${styles.iconWrapper} ${isOpen ? styles.iconOpen : ""}`}>
          <Plus size={28} />
        </span>
      </button>
    </div>
  );
}
