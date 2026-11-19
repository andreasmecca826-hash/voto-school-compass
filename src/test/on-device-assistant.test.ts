import { beforeEach, describe, expect, it, vi } from "vitest";
const { generateOnDeviceLlm } = vi.hoisted(() => ({ generateOnDeviceLlm: vi.fn() }));
vi.mock("@/lib/native-local-llm", () => ({ generateOnDeviceLlm }));
import {
  answerOnDeviceDocument,
  answerOnDeviceGeneralQuestion,
} from "@/lib/voto/on-device-assistant";

describe("prompt AI telefono", () => {
  beforeEach(() => generateOnDeviceLlm.mockReset().mockResolvedValue("Risposta dispositivo"));
  it("inoltra una domanda generale soltanto al wrapper nativo", async () => {
    await answerOnDeviceGeneralQuestion("Spiega la fotosintesi");
    expect(generateOnDeviceLlm).toHaveBeenCalledOnce();
    expect(generateOnDeviceLlm.mock.calls[0]?.[0]).toContain("Spiega la fotosintesi");
  });
  it("limita allegato testuale e domanda prima dell’inferenza locale", async () => {
    await answerOnDeviceDocument("Riassumi", "x".repeat(20_000));
    expect(generateOnDeviceLlm).toHaveBeenCalledOnce();
    expect(generateOnDeviceLlm.mock.calls[0]?.[0].length).toBeLessThan(12_000);
  });
  it("propaga l’errore senza fallback", async () => {
    generateOnDeviceLlm.mockRejectedValueOnce(new Error("modello assente"));
    await expect(answerOnDeviceGeneralQuestion("Ciao")).rejects.toThrow("modello assente");
    expect(generateOnDeviceLlm).toHaveBeenCalledOnce();
  });
});
