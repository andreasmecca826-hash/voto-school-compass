import { createClient } from "@supabase/supabase-js";
import { supabaseProjectUrl, supabasePublishableKey } from "./supabase-config";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(supabaseProjectUrl(), supabasePublishableKey(), {
  auth: {
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    persistSession: isBrowser,
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
