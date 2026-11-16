import { Capacitor, registerPlugin } from "@capacitor/core";

export const APP_ICONS = [
  { id: "voto", label: "VOTO", description: "Icona originale" },
  { id: "famiglia", label: "didUP", description: "Studenti e famiglia" },
  { id: "classeviva", label: "ClasseViva", description: "Studenti e famiglie" },
] as const;

export const APP_ICON_LABELS = [
  { id: "voto", label: "VOTO" },
  { id: "didup-famiglia", label: "didUP Famiglia" },
  { id: "classeviva", label: "ClasseViva Studenti e Famiglie" },
] as const;

export type AppIconId = (typeof APP_ICONS)[number]["id"];
export type AppIconLabelId = (typeof APP_ICON_LABELS)[number]["id"];

export type AppIconState = {
  icon: AppIconId;
  label: AppIconLabelId;
  galleryShortcutSupported: boolean;
  customShortcutPinned: boolean;
  customShortcutName: string;
  customShortcutNameHidden: boolean;
  customIconDataUrl?: string;
};

type AppIconPlugin = {
  getIcon(): Promise<{
    icon: string;
    label: string;
    galleryShortcutSupported: boolean;
    customShortcutPinned: boolean;
    customShortcutName: string;
    customShortcutNameHidden: boolean;
    customIconDataUrl?: string;
  }>;
  setIcon(options: { icon: AppIconId; label: AppIconLabelId }): Promise<{
    icon: string;
    label: string;
  }>;
  setCustomShortcutName(options: { name: string }): Promise<{ name: string }>;
  setCustomShortcutNameVisibility(options: { hideName: boolean }): Promise<{
    hideName: boolean;
  }>;
  chooseCustomIcon(options: { name: string }): Promise<{
    status: "cancelled" | "requested" | "updated";
    name: string;
    customIconDataUrl?: string;
  }>;
};

const AppIconBridge = registerPlugin<AppIconPlugin>("AppIcon");

export function isAndroidAppIconSupported() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function getAppIcon(): Promise<AppIconState> {
  const result = await AppIconBridge.getIcon();
  const availableIcon = APP_ICONS.find((option) => option.id === result.icon);
  const availableLabel = APP_ICON_LABELS.find((option) => option.id === result.label);
  if (!availableIcon) throw new Error("Android ha restituito un’icona non riconosciuta.");
  if (!availableLabel)
    throw new Error("Android ha restituito un nome dell’icona non riconosciuto.");
  if (
    typeof result.galleryShortcutSupported !== "boolean" ||
    typeof result.customShortcutPinned !== "boolean" ||
    typeof result.customShortcutName !== "string" ||
    typeof result.customShortcutNameHidden !== "boolean"
  ) {
    throw new Error("Android ha restituito uno stato dell’icona non valido.");
  }

  const state: AppIconState = {
    icon: availableIcon.id,
    label: availableLabel.id,
    galleryShortcutSupported: result.galleryShortcutSupported,
    customShortcutPinned: result.customShortcutPinned,
    customShortcutName: result.customShortcutName,
    customShortcutNameHidden: result.customShortcutNameHidden,
  };
  if (
    typeof result.customIconDataUrl === "string" &&
    result.customIconDataUrl.startsWith("data:image/png;base64,")
  ) {
    state.customIconDataUrl = result.customIconDataUrl;
  }
  return state;
}

export async function setAppIcon(icon: AppIconId, label: AppIconLabelId): Promise<void> {
  if (!APP_ICONS.some((option) => option.id === icon)) {
    throw new Error("L’icona selezionata non è disponibile.");
  }
  if (!APP_ICON_LABELS.some((option) => option.id === label)) {
    throw new Error("Il nome selezionato non è disponibile.");
  }
  if (!isAndroidAppIconSupported()) {
    throw new Error("Il cambio dell’icona è disponibile solo nell’app Android.");
  }
  await AppIconBridge.setIcon({ icon, label });
}

export async function chooseCustomAppIcon(name: string) {
  if (!isAndroidAppIconSupported()) {
    throw new Error("La galleria è disponibile solo nell’app Android.");
  }
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 25) {
    throw new Error("Inserisci un nome da 1 a 25 caratteri.");
  }
  return AppIconBridge.chooseCustomIcon({ name: normalizedName });
}

export async function setCustomAppIconName(name: string) {
  if (!isAndroidAppIconSupported()) {
    throw new Error("La modifica del nome è disponibile solo nell’app Android.");
  }
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 25) {
    throw new Error("Inserisci un nome da 1 a 25 caratteri.");
  }
  await AppIconBridge.setCustomShortcutName({ name: normalizedName });
}

export async function setCustomShortcutNameVisibility(hideName: boolean) {
  if (!isAndroidAppIconSupported()) {
    throw new Error("La modifica del nome è disponibile solo nell’app Android.");
  }
  await AppIconBridge.setCustomShortcutNameVisibility({ hideName });
}
