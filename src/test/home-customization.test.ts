import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_MODULES,
  normalizeHomeModules,
  normalizeHomeScale,
  resolveHomeModuleScale,
} from "@/lib/voto/home-customization";

describe("Home customization sizing", () => {
  it("limits the overall and per-module zoom to 80–100% in five-point steps", () => {
    expect(normalizeHomeScale(80)).toBe(80);
    expect(normalizeHomeScale(103)).toBe(100);
    expect(normalizeHomeScale(121)).toBe(100);
    expect(normalizeHomeScale(79)).toBe(80);
    expect(normalizeHomeScale(Number.NaN)).toBe(100);
  });

  it("keeps the combined module zoom within 80–100%", () => {
    expect(resolveHomeModuleScale(80, 80)).toBe(80);
    expect(resolveHomeModuleScale(120, 120)).toBe(100);
    expect(resolveHomeModuleScale(80, 120)).toBe(96);
    expect(resolveHomeModuleScale(120, 80)).toBe(96);
  });

  it("adds standard sizing to saved modules from before per-module scaling", () => {
    const modules = normalizeHomeModules([
      { id: "compiti", enabled: false },
      { id: "media", enabled: true, scale: 115 },
    ]);

    expect(modules.slice(0, 2)).toEqual([
      { id: "compiti", enabled: false, scale: 100 },
      { id: "media", enabled: true, scale: 100 },
    ]);
    expect(modules).toHaveLength(DEFAULT_HOME_MODULES.length);
    expect(modules.every((module) => module.scale >= 80 && module.scale <= 100)).toBe(true);
  });

  it("adds Ultimi voti to existing preferences and drops retired modules", () => {
    const modules = normalizeHomeModules([{ id: "media", enabled: true }]);
    expect(modules.find((module) => module.id === "ultimi-voti")).toEqual({
      id: "ultimi-voti",
      enabled: true,
      scale: 100,
    });

    expect(
      modules.some((module) => ["simulatore", "obiettivo", "domani-a-scuola"].includes(module.id)),
    ).toBe(false);
  });

  it("normalizes invalid saved module sizes back to 100%", () => {
    const [media] = normalizeHomeModules([{ id: "media", enabled: true, scale: "large" }]);
    expect(media?.scale).toBe(100);
  });
});
