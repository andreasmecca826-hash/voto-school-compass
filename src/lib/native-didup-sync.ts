import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Session } from "@supabase/supabase-js";
import { supabaseProjectUrl, supabasePublishableKey } from "@/lib/supabase-config";
import { supabase } from "@/lib/supabase-auth";

export type DidupSyncStatus = {
  enabled: boolean;
  hasCredentials: boolean;
  hasSession: boolean;
  intervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
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
  setEnabled(options: { enabled: boolean; intervalMinutes: number }): Promise<void>;
  setQuietHours(options: { enabled: boolean; startTime: string; endTime: string }): Promise<void>;
  openAppSettings(): Promise<void>;
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

export async function setNativeDidupSyncEnabled(enabled: boolean, intervalMinutes: number) {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.setEnabled({ enabled, intervalMinutes });
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

export async function openNativeDidupAppSettings() {
  if (!isAndroidDidupSyncAvailable())
    throw new Error("Funzione disponibile solo nell’app Android.");
  await NativeDidupSync.openAppSettings();
}

export async function clearNativeDidupSync() {
  if (!isAndroidDidupSyncAvailable()) return;
  try {
    await NativeDidupSync.clear();
  } catch {
    // An APK built before this native plugin exists must still be able to log out.
  }
}
