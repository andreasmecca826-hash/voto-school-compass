export function normalizeSupabaseUrl(rawUrl: string): string {
  const value = rawUrl.trim().replace(/\/+$/, "");
  if (!value) throw new Error("SUPABASE_URL non configurato.");
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) {
    throw new Error("SUPABASE_URL deve usare HTTPS.");
  }
  if (/^[a-z0-9]{20}$/i.test(value)) {
    return `https://${value.toLowerCase()}.supabase.co`;
  }
  return `https://${value}`;
}

export function supabaseAuthHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  const isLegacyJwt = key.split(".").length === 3;
  if (isLegacyJwt) headers["authorization"] = `Bearer ${key}`;
  return headers;
}
