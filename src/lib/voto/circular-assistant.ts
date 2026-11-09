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

async function askAssistantApi(input: AssistantApiRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke("circular-assistant", {
    body: input,
  });

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
