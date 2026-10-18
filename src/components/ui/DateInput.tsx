"use client";

import React, { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import styles from "./DateInput.module.css";

interface DateInputProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function DateInput({
  id,
  value,
  onChange,
  required,
  min,
  max,
  className,
  disabled,
  placeholder = "dd/mm/yyyy",
}: DateInputProps) {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const toDisplay = (val: string) => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length !== 3) return val;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD
  const toYmd = (val: string) => {
    const parts = val.split("/");
    if (parts.length !== 3) return "";
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const [textVal, setTextVal] = useState(() => toDisplay(value));
  const hiddenNativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTextVal(toDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = raw;
    if (raw.length > 2 && raw.length <= 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    } else if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
    }
    setTextVal(formatted);

    if (raw.length === 8) {
      const ymd = toYmd(formatted);
      onChange(ymd);
    } else if (raw.length === 0) {
      onChange("");
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setTextVal(toDisplay(val));
  };

  const handlePickerOpen = () => {
    try {
      hiddenNativeRef.current?.showPicker();
    } catch {
      hiddenNativeRef.current?.focus();
    }
  };

  return (
    <div className={styles.dateInputWrapper}>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={textVal}
        onChange={handleTextChange}
        className={`${styles.textInput} ${className || ""}`}
        required={required}
        disabled={disabled}
        maxLength={10}
        autoComplete="off"
      />
      <button
        type="button"
        className={styles.calendarBtn}
        onClick={handlePickerOpen}
        disabled={disabled}
        tabIndex={-1}
        aria-label="Selecionar data no calendário"
      >
        <Calendar size={16} />
      </button>
      <input
        ref={hiddenNativeRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={handleNativeChange}
        className={styles.hiddenNativeInput}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
