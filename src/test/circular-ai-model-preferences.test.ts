import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CIRCULAR_AI_MODEL_PREFERENCES_KEY,
  CIRCULAR_AI_MODELS_CHANGE_EVENT,
  getCircularAiModelPreferences,
  setCircularAiModelPreferences,
  subscribeCircularAiModelPreferences,
} from "@/lib/voto/circular-ai-model-preferences";

afterEach(() => {
  localStorage.removeItem(CIRCULAR_AI_MODEL_PREFERENCES_KEY);
});

describe("preferenze dei modelli AI per le circolari", () => {
  it("mantiene Qwen testuale attivo per default e non scarica/attiva il modello visivo", () => {
    expect(getCircularAiModelPreferences()).toEqual({ text: true, vision: false });
  });

  it("salva la scelta indipendente tra testo e visione e notifica l'interfaccia", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeCircularAiModelPreferences(onChange);

    setCircularAiModelPreferences({ text: false, vision: true });

    expect(getCircularAiModelPreferences()).toEqual({ text: false, vision: true });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(CIRCULAR_AI_MODELS_CHANGE_EVENT).toBe("voto:circular-ai-models-changed");
    unsubscribe();
  });

  it("non consente di disattivare entrambi i modelli", () => {
    setCircularAiModelPreferences({ text: false, vision: false });

    expect(getCircularAiModelPreferences()).toEqual({ text: true, vision: false });
  });
});
