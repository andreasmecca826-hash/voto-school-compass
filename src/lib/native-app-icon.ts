import { Capacitor, registerPlugin } from "@capacitor/core";

export type AppIconName = "classic" | "light" | "ocean" | "violet";

type AppIconPlugin = {
  getAppIcon(): Promise<{ name: AppIconName }>;
  setAppIcon(options: { name: AppIconName }): Promise<{ name: AppIconName }>;
};

const NativeAppIcon = registerPlugin<AppIconPlugin>("AppIcon");

export const isAndroidApp = () => Capacitor.getPlatform() === "android";

export async function getNativeAppIcon() {
  if (!isAndroidApp()) return null;
  return NativeAppIcon.getAppIcon();
}

export async function setNativeAppIcon(name: AppIconName) {
  if (!isAndroidApp()) throw new Error("Il cambio icona è disponibile nell’app Android.");
  return NativeAppIcon.setAppIcon({ name });
}
