import { describe, expect, it } from "vitest";
import { LOCAL_MODEL_CATALOG } from "@/lib/native-local-llm";

describe("catalogo AI locale", () => {
  it("espone le quattro AI scaricabili con peso e compatibilità", () => {
    expect(LOCAL_MODEL_CATALOG.map((model) => model.label)).toEqual([
      "Locale Potente",
      "Locale Media",
      "Locale Leggera",
      "Locale Ultra Leggera",
    ]);
    expect(LOCAL_MODEL_CATALOG).toHaveLength(4);
    expect(
      LOCAL_MODEL_CATALOG.every(
        (model) => model.sizeBytes > 0 && model.requiredFreeBytes >= model.sizeBytes,
      ),
    ).toBe(true);
    expect(LOCAL_MODEL_CATALOG.find((model) => model.id === "qwen3-0.6b")?.compatibility).toContain(
      "poca RAM",
    );
    expect(LOCAL_MODEL_CATALOG.some((model) => model.label.includes("Potentissima"))).toBe(false);
  });
});
