import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createPinLockRecord, isValidPin, verifyPinAgainstRecord } from "@/lib/voto/app-pin-lock";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto as unknown as Crypto);
});

describe("Blocco PIN locale", () => {
  it("accetta soltanto PIN numerici da 4 a 8 cifre", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
  });

  it("conserva un derivato e verifica solo il PIN corretto", async () => {
    const record = await createPinLockRecord("583921");
    expect(record).not.toHaveProperty("pin");
    expect(record.digest).not.toBe("583921");
    expect(await verifyPinAgainstRecord("583921", record)).toBe(true);
    expect(await verifyPinAgainstRecord("583922", record)).toBe(false);
  });

  it("rifiuta un PIN non valido durante la configurazione", async () => {
    await expect(createPinLockRecord("12a4")).rejects.toThrow("Il PIN deve contenere");
  });
});
