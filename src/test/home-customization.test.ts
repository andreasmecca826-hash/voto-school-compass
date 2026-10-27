import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_MODULES,
  normalizeHomeModules,
  normalizeHomeScale,
} from "@/lib/voto/home-customization";

describe("Home customization sizing", () => {
  it("limits the overall and per-module scale to 80–120% in five-point steps", () => {
    expect(normalizeHomeScale(80)).toBe(80);
    expect(normalizeHomeScale(103)).toBe(105);
    expect(normalizeHomeScale(121)).toBe(120);
    expect(normalizeHomeScale(79)).toBe(80);
    expect(normalizeHomeScale(Number.NaN)).toBe(100);
  });

  it("adds standard sizing to saved modules from before per-module scaling", () => {
    const modules = normalizeHomeModules([
      { id: "compiti", enabled: false },
      { id: "media", enabled: true, scale: 115 },
    ]);

    expect(modules.slice(0, 2)).toEqual([
      { id: "compiti", enabled: false, scale: 100 },
      { id: "media", enabled: true, scale: 115 },
    ]);
    expect(modules).toHaveLength(DEFAULT_HOME_MODULES.length);
    expect(modules.every((module) => module.scale >= 80 && module.scale <= 120)).toBe(true);
  });

  it("normalizes invalid saved module sizes back to 100%", () => {
    const [media] = normalizeHomeModules([{ id: "media", enabled: true, scale: "large" }]);
    expect(media?.scale).toBe(100);
  });
});
