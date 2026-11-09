export const CIRCULAR_AI_MODEL_PREFERENCES_KEY = "voto.circular-ai-models.v1";
export const CIRCULAR_AI_MODELS_CHANGE_EVENT = "voto:circular-ai-models-changed";

export interface CircularAiModelPreferences {
  text: boolean;
  vision: boolean;
}

const DEFAULT_PREFERENCES: CircularAiModelPreferences = { text: true, vision: false };

export function getCircularAiModelPreferences(): CircularAiModelPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(CIRCULAR_AI_MODEL_PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;
    const candidate = value as Partial<CircularAiModelPreferences>;
    const preferences = {
      text: candidate.text === true,
      vision: candidate.vision === true,
    };
    return preferences.text || preferences.vision ? preferences : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setCircularAiModelPreferences(preferences: CircularAiModelPreferences): void {
  const safePreferences =
    preferences.text || preferences.vision ? preferences : DEFAULT_PREFERENCES;
  try {
    window.localStorage.setItem(CIRCULAR_AI_MODEL_PREFERENCES_KEY, JSON.stringify(safePreferences));
  } catch {
    // La scelta resta valida per il pannello corrente anche se lo storage non è disponibile.
  }
  window.dispatchEvent(new Event(CIRCULAR_AI_MODELS_CHANGE_EVENT));
}

export function subscribeCircularAiModelPreferences(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CIRCULAR_AI_MODELS_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CIRCULAR_AI_MODELS_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
