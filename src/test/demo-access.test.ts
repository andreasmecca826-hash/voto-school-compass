import { describe, expect, it } from "vitest";
import { isDemoAccessCode } from "@/lib/demo-access";

describe("accesso modalità demo", () => {
  it("accetta il codice demo senza distinzione tra maiuscole e minuscole", () => {
    expect(isDemoAccessCode("voto-demo-dev")).toBe(true);
    expect(isDemoAccessCode(" VOTO DEMO DEV ")).toBe(true);
  });

  it("rifiuta codici incompleti o casuali", () => {
    expect(isDemoAccessCode("VOTO-DEMO")).toBe(false);
    expect(isDemoAccessCode("codice-sbagliato")).toBe(false);
    expect(isDemoAccessCode("")).toBe(false);
  });
});
