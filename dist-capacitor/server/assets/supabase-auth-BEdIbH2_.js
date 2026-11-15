import { createClient } from "@supabase/supabase-js";
//#region src/lib/supabase-config.ts
var DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
var DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
function supabaseProjectUrl() {
	const raw = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_SUPABASE_URL"]?.trim();
	if (!raw) return DEFAULT_SUPABASE_URL;
	if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
	return raw.replace(/\/+$/, "");
}
function supabasePublishableKey() {
	return {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_SUPABASE_PUBLISHABLE_KEY"] || {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/"
	}["VITE_SUPABASE_ANON_KEY"] || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}
//#endregion
//#region src/lib/supabase-auth.ts
var isBrowser = typeof window !== "undefined";
var supabase = createClient(supabaseProjectUrl(), supabasePublishableKey(), { auth: {
	autoRefreshToken: isBrowser,
	detectSessionInUrl: isBrowser,
	persistSession: isBrowser
} });
var PRIVATE_SCHOOL_DATA_URL = `${supabaseProjectUrl()}/functions/v1/school-data`;
async function claimSchoolDataAccess(code) {
	const { data, error } = await supabase.functions.invoke("claim-school-access", { body: { code } });
	if (error || data?.ok !== true) throw new Error(typeof data?.error === "string" ? data.error : "Attivazione non riuscita.");
}
//#endregion
export { supabasePublishableKey as a, supabaseProjectUrl as i, claimSchoolDataAccess as n, supabase as r, PRIVATE_SCHOOL_DATA_URL as t };
