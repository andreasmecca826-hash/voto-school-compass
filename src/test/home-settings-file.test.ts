import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_MODULES } from "@/lib/voto/home-customization";
import { createHomeSettingsFile, parseHomeSettingsFile } from "@/lib/voto/home-settings-file";

describe("home settings JSON file", () => {
  it("esporta e reimporta scala, ordine, visibilità e dimensione dei moduli", () => {
    const homeModules = [
      { id: "simulatore" as const, enabled: false, scale: 115 },
      ...DEFAULT_HOME_MODULES.filter((item) => item.id !== "simulatore"),
    ];
    const file = createHomeSettingsFile({ homeScale: 110, homeModules });
    const imported = parseHomeSettingsFile(file);

    expect(imported.homeScale).toBe(110);
    expect(imported.homeModules[0]).toEqual({ id: "simulatore", enabled: false, scale: 115 });
    expect(imported.homeModules).toHaveLength(DEFAULT_HOME_MODULES.length);
  });

  it("rifiuta JSON malformato, tipi di file estranei e moduli non validi", () => {
    expect(() => parseHomeSettingsFile("{")).toThrow("JSON valido");
    expect(() => parseHomeSettingsFile(JSON.stringify({ app: "altro" }))).toThrow(
      "non è un’esportazione compatibile",
    );

    const malformed = {
      app: "VOTO",
      type: "voto-home-customization",
      version: 1,
      settings: { homeScale: 100, homeModules: [{ id: "inesistente", enabled: true, scale: 100 }] },
    };
    expect(() => parseHomeSettingsFile(JSON.stringify(malformed))).toThrow(
      "configurazione di modulo Home non valida",
    );
  });

  it("normalizza i valori di scala nel range supportato", () => {
    const file = createHomeSettingsFile({ homeScale: 150, homeModules: DEFAULT_HOME_MODULES });
    expect(parseHomeSettingsFile(file).homeScale).toBe(120);
  });
});
