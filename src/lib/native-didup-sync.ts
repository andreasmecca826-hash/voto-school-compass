import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Session } from "@supabase/supabase-js";
import { supabaseProjectUrl, supabasePublishableKey } from "@/lib/supabase-config";
import { supabase } from "@/lib/supabase-auth";

export type DidupSyncStatus = {
  enabled: boolean;
  hasCredentials: boolean;
  hasSession: boolean;
  intervalMinutes: number;
  variableInterval: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  updateNotificationsEnabled: boolean;
  notificationPermissionGranted: boolean;
  status: string;
  message: string;
  lastSyncAt: string;
  lastAttemptAt: string;
};

type NativeDidupSyncPlugin = {
  saveCredentials(options: {
    schoolCode: string;
    username: string;
    password: string;
    intervalMinutes: number;
    variableInterval: boolean;
    supabaseUrl: string;
    publishableKey: string;
  }): Promise<void>;
  setSupabaseSession(options: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }): Promise<void>;
  clearSupabaseSession(): Promise<void>;
  getSupabaseSession(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }>;
  getStatus(): Promise<DidupSyncStatus>;
  syncNow(): Promise<{ queued: boolean }>;
  refreshWidgets(): Promise<void>;
  setEnabled(options: {
    enabled: boolean;
    intervalMinutes: number;
    variableInterval: boolean;
  }): Promise<void>;
  setQuietHours(options: { enabled: boolean; startTime: string; endTime: string }): Promise<void>;
  setUpdateNotificationsEnabled(options: { enabled: boolean }): Promise<{
    enabled: boolean;
    permissionGranted: boolean;
  }>;
  openAppSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  clear(): Promise<void>;
};

const NativeDidupSync = registerPlugin<NativeDidupSyncPlugin>("DidupSync");

export function isAndroidDidupSyncAvailable() {
  return Capacitor.getPlatform() === "android";
}

export async function persistNativeSupabaseSession(session: Session) {
  if (!isAndroidDidupSyncAvailable()) return;
  await NativeDidupSync.setSupabaseSession({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
  });
}

export async function clearNativeSupabaseSession() {
  if (!isAndroidDidupSyncAvailable()) return;
  try {
    await NativeDidupSync.clearSupabaseSession();
  } catch {
    // APK precedenti possono non avere ancora il metodo nativo selettivo.
  }
}

export async function getNativeSupabaseSession() {
  if (!isAndroidDidupSyncAvailable()) return null;
  try {
    const session = await NativeDidupSync.getSupabaseSession();
    if (!session.accessToken || !session.refreshToken) return null;
    return session;
  } catch {
    return null;
  }
}

export async function saveNativeDidupCredentials(input: {
  schoolCode: string;
  username: string;
  password: string;
  intervalMinutes: number;
  variableInterval: boolean;
}) {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  const { data } = await supabase.auth.getSession();
  if (data.session) await persistNativeSupabaseSession(data.session);
  await NativeDidupSync.saveCredentials({
    ...input,
    supabaseUrl: supabaseProjectUrl(),
    publishableKey: supabasePublishableKey(),
  });
}

export async function getNativeDidupSyncStatus() {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  return NativeDidupSync.getStatus();
}

export async function requestNativeDidupSync() {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  return NativeDidupSync.syncNow();
}

export async function refreshNativeWidgets() {
  if (!isAndroidDidupSyncAvailable()) return;
  await NativeDidupSync.refreshWidgets();
}

export async function setNativeDidupSyncEnabled(
  enabled: boolean,
  intervalMinutes: number,
  variableInterval: boolean,
) {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.setEnabled({ enabled, intervalMinutes, variableInterval });
}

export async function setNativeDidupQuietHours(
  enabled: boolean,
  startTime: string,
  endTime: string,
) {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.setQuietHours({ enabled, startTime, endTime });
}

export async function setNativeDidupUpdateNotificationsEnabled(enabled: boolean) {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  return NativeDidupSync.setUpdateNotificationsEnabled({ enabled });
}

export async function openNativeDidupAppSettings() {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.openAppSettings();
}

export async function openNativeDidupNotificationSettings() {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.openNotificationSettings();
}

export async function clearNativeDidupSync() {
  if (!isAndroidDidupSyncAvailable()) return;
  try {
    await NativeDidupSync.clear();
  } catch {
    // An APK built before this native plugin exists must still be able to log out.
  }
}
