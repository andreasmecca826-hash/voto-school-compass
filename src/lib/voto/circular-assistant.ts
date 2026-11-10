import { supabase } from "../supabase-auth";

export type CircularAssistantMessage = {
  role: "user" | "assistant";
  text: string;
};

type AssistantApiRequest = {
  question: string;
  documentText?: string;
  documentTruncated?: boolean;
  pageImages?: Array<{ pageNumber: number; dataUrl: string }>;
};

export type ApiQuota = {
  limitRequests?: number;
  remainingRequests?: number;
  resetRequests?: string;
  limitTokens?: number;
  remainingTokens?: number;
  resetTokens?: string;
  observedAt: string;
};

const API_QUOTA_KEY = "voto.api-quota.v1";

function rememberApiQuota(value: unknown) {
  if (typeof window === "undefined" || !value || typeof value !== "object") return;
  const raw = value as Record<string, unknown>;
  const quota: ApiQuota = {
    ...(typeof raw["limitRequests"] === "number" ? { limitRequests: raw["limitRequests"] } : {}),
    ...(typeof raw["remainingRequests"] === "number"
      ? { remainingRequests: raw["remainingRequests"] }
      : {}),
    ...(typeof raw["resetRequests"] === "string" ? { resetRequests: raw["resetRequests"] } : {}),
    ...(typeof raw["limitTokens"] === "number" ? { limitTokens: raw["limitTokens"] } : {}),
    ...(typeof raw["remainingTokens"] === "number"
      ? { remainingTokens: raw["remainingTokens"] }
      : {}),
    ...(typeof raw["resetTokens"] === "string" ? { resetTokens: raw["resetTokens"] } : {}),
    observedAt: new Date().toISOString(),
  };
  if (Object.keys(quota).length <= 1) return;
  try {
    window.localStorage.setItem(API_QUOTA_KEY, JSON.stringify(quota));
  } catch {
    // La risposta API resta comunque utilizzabile.
  }
}

export function getLastApiQuota(): ApiQuota | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(API_QUOTA_KEY) ?? "null",
    ) as ApiQuota | null;
    return value && typeof value === "object" && typeof value.observedAt === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}

async function askAssistantApi(input: AssistantApiRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke("circular-assistant", {
    body: input,
  });
  rememberApiQuota(data?.quota);

  if (error) {
    if (error.name === "FunctionsFetchError") {
      throw new Error("Non riesco a raggiungere il servizio AI. Riprova più tardi.");
    }
    let message =
      typeof data?.error === "string" ? data.error : "La risposta AI non è disponibile.";
    if (error.context instanceof Response) {
      try {
        const body = (await error.context.clone().json()) as { error?: unknown };
        if (typeof body.error === "string") message = body.error;
      } catch {
        // La risposta HTTP potrebbe non contenere JSON.
      }
    }
    throw new Error(message);
  }

  if (!data || typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("Il servizio AI ha restituito una risposta vuota.");
  }
  return data.answer.trim();
}

export function askAboutCircular(input: {
  question: string;
  documentText: string;
  documentTruncated: boolean;
}): Promise<string> {
  return askAssistantApi(input);
}

export function askAboutCircularImages(input: {
  question: string;
  pageImages: Array<{ pageNumber: number; dataUrl: string }>;
}): Promise<string> {
  return askAssistantApi({ question: input.question, pageImages: input.pageImages });
}

export function askWithDocument(input: {
  question: string;
  documentText: string;
  documentTruncated: boolean;
}): Promise<string> {
  return askAssistantApi(input);
}

export function askGeneralQuestion(question: string): Promise<string> {
  return askAssistantApi({ question });
}
