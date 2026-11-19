import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { supabaseProjectUrl, supabasePublishableKey } from "./supabase-config";

const isBrowser = typeof window !== "undefined";
const isNativeApp = isBrowser && Capacitor.isNativePlatform();

export const supabase = createClient(supabaseProjectUrl(), supabasePublishableKey(), {
  auth: {
    autoRefreshToken: isBrowser && !isNativeApp,
    detectSessionInUrl: isBrowser,
    persistSession: isBrowser,
    flowType: "pkce",
  },
});

export const PRIVATE_SCHOOL_DATA_URL = `${supabaseProjectUrl()}/functions/v1/school-data`;

export async function claimSchoolDataAccess(code: string) {
  const { data, error } = await supabase.functions.invoke("claim-school-access", {
    body: { code },
  });
  if (error || data?.ok !== true) {
    throw new Error(typeof data?.error === "string" ? data.error : "Attivazione non riuscita.");
  }
}
