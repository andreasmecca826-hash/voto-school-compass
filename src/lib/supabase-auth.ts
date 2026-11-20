import { createClient } from "@supabase/supabase-js";
import { supabaseProjectUrl, supabasePublishableKey } from "./supabase-config";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseProjectUrl(), supabasePublishableKey(), {
  auth: {
    // Anche l’app nativa usa il client Supabase nel WebView: disattivare qui
    // il rinnovo faceva scadere il token dopo poco tempo e riportava al login.
    autoRefreshToken: isBrowser,
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
