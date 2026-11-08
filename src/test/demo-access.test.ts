import { describe, expect, it } from "vitest";
import { isDemoAccessCode } from "@/lib/demo-access";

describe("accesso modalità demo", () => {
  it("accetta il codice demo senza distinzione tra maiuscole e minuscole", () => {
    expect(isDemoAccessCode("21/06/27")).toBe(true);
    expect(isDemoAccessCode(" 21/06/27 ")).toBe(true);
  });

  it("rifiuta codici incompleti o casuali", () => {
    expect(isDemoAccessCode("21/06/2")).toBe(false);
    expect(isDemoAccessCode("codice-sbagliato")).toBe(false);
    expect(isDemoAccessCode("")).toBe(false);
  });
});
