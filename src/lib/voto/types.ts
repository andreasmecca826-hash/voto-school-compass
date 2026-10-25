/** Schema documentato del file JSON letto da VOTO. */
export type GradeType = "orale" | "scritto" | "pratico" | "altro";

export interface Grade {
  id: string;
  value: number;
  /** Valore originale (es. "7+") per la visualizzazione */
  label: string;
  date: string; // YYYY-MM-DD
  type: GradeType;
  weight: number; // default 1
  comment?: string;
}

export interface Subject {
  id: string;
  name: string;
  color?: string;
  teacher?: string;
  grades: Grade[];
}

export interface Assignment {
  id: string;
  title: string;
  subject?: string;
  dueDate?: string;
  dueTime?: string;
  completed: boolean;
  details?: string;
}

export type NotificationType = "note" | "grade" | "reminder" | "notice";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  date?: string;
  subject?: string;
  read: boolean;
}

export interface Attendance {
  absenceDays: number;
  absenceHours: number;
  delays: number;
  earlyExits: number;
  annualHours: number;
  absenceLimitHours: number;
}

export interface Student {
  name?: string;
  className?: string;
  schoolYear?: string;
}

export interface VotoData {
  student: Student;
  updatedAt?: string;
  previousAverage?: number;
  subjects: Subject[];
  assignments: Assignment[];
  notifications: AppNotification[];
  attendance: Attendance;
}

export type DataSource = "demo" | "remote" | "cache";
