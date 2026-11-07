const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
// Chiave publishable destinata al client: non inserire qui chiavi amministrative.
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";

export function supabaseProjectUrl() {
  const raw = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim();
  if (!raw) return DEFAULT_SUPABASE_URL;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  return raw.replace(/\/+$/, "");
}

export function supabasePublishableKey() {
  return (
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}
