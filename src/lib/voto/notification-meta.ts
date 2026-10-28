import { AlertCircle, Clock, GraduationCap, Megaphone, type LucideIcon } from "lucide-react";
import type { NotificationType } from "./types";

export const NOTIF_META: Record<NotificationType, { label: string; icon: LucideIcon }> = {
  note: { label: "Nota", icon: AlertCircle },
  grade: { label: "Voto", icon: GraduationCap },
  reminder: { label: "Promemoria", icon: Clock },
  notice: { label: "Avviso", icon: Megaphone },
};
