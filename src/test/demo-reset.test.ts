import { describe, expect, it } from "vitest";
import { canResetDemoData } from "@/lib/voto/demo";

describe("canResetDemoData", () => {
  it("consente il ripristino solo nella demo senza una sorgente collegata", () => {
    expect(canResetDemoData("demo", "")).toBe(true);
    expect(canResetDemoData("demo", "   ")).toBe(true);
    expect(canResetDemoData("remote", "https://example.test/voto.json")).toBe(false);
    expect(canResetDemoData("cache", "https://example.test/voto.json")).toBe(false);
    expect(canResetDemoData("demo", "https://example.test/voto.json")).toBe(false);
    expect(canResetDemoData("remote", "")).toBe(false);
  });
});
