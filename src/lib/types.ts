// ── Category Types ──────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  colorCode: string;
  iconRef: string;
  isSystemDefault: boolean;
  budgetLimit?: number | null;
  createdAt: Date | string;
}

export interface CategoryWithCount extends Category {
  _count: {
    slips: number;
  };
}

// ── Pet Types ──────────────────────────────────────────────────────────────
export interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birthDate: string | null;
  weight: number | null;
  rga: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vaccines?: PetVaccine[];
  appointments?: PetAppointment[];
}

export interface PetVaccine {
  id: string;
  name: string;
  type: string;
  applicationDate: string;
  boosterDate: string | null;
  boosterDone?: boolean;
  notes: string | null;
  isExpense: boolean;
  amount: number | null;
  isCreditCardPayment?: boolean;
  slipId: string | null;
  slip?: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: string;
    isCreditCardPayment?: boolean;
    category?: {
      id: string;
      name: string;
      colorCode: string;
      iconRef: string;
    };
  } | null;
  petId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatusType = "PENDENTE" | "COMPARECEU" | "FALTOU";

export interface PetAppointment {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
  status: AppointmentStatusType;
  notes: string | null;
  petId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetAlert {
  id: string;
  type: "VACCINE_OVERDUE" | "VACCINE_UPCOMING" | "APPOINTMENT_TODAY";
  petId: string;
  petName: string;
  vaccineName?: string;
  vaccineType?: string;
  appointmentId?: string;
  appointmentTitle?: string;
  appointmentType?: string;
  time?: string | null;
  status?: string;
  date: string;
  diffDays?: number;
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  message: string;
}

