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
  comment?: string | undefined;
}

export interface Subject {
  id: string;
  name: string;
  color?: string | undefined;
  teacher?: string | undefined;
  grades: Grade[];
}

export interface Assignment {
  id: string;
  title: string;
  subject?: string | undefined;
  dueDate?: string | undefined;
  dueTime?: string | undefined;
  completed: boolean;
  details?: string | undefined;
}

export type NotificationType = "note" | "grade" | "reminder" | "notice";

export interface CircularAttachment {
  name?: string | undefined;
  /** Percorso del PDF nel bucket privato, ad esempio circulars/<sha256>.pdf. */
  path?: string | undefined;
  /** URL firmato temporaneo, valorizzato solo per allegati interni. */
  url?: string | undefined;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string | undefined;
  date?: string | undefined;
  subject?: string | undefined;
  /** Percorso del PDF nel bucket Supabase Storage interno. */
  attachmentPath?: string | undefined;
  /** URL sorgente legacy usato solo dal backend per il mirroring. */
  attachmentUrl?: string | undefined;
  attachmentName?: string | undefined;
  /** Allegati multipli della stessa circolare; i campi singoli restano per compatibilità. */
  attachments?: CircularAttachment[] | undefined;
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

export interface DiaryEntry {
  id: string;
  date: string;
  subject?: string | undefined;
  teacher?: string | undefined;
  hour?: string | undefined;
  activity: string;
}

export interface Student {
  name?: string | undefined;
  className?: string | undefined;
  schoolYear?: string | undefined;
}

export interface VotoData {
  student: Student;
  updatedAt?: string | undefined;
  previousAverage?: number | undefined;
  subjects: Subject[];
  assignments: Assignment[];
  notifications: AppNotification[];
  diary: DiaryEntry[];
  attendance: Attendance;
}

export type DataSource = "demo" | "remote" | "cache";
