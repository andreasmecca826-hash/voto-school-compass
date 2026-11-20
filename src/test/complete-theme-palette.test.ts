import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

function readLightness(block: string, token: string): number | undefined {
  const value = block.match(new RegExp(`--theme-${token}:\\s*oklch\\(\\s*([\\d.]+)`));
  return value ? Number(value[1]) : undefined;
}

describe("complete theme palettes", () => {
  it("keeps explicit dark and light palettes on the correct side of the luminance range", () => {
    const palettes = [
      ...styles.matchAll(/(?:^|\n)\s*:?(?:root)?\[data-theme="([^"]+)"\][^{]*\{([^{}]*)\}/g),
    ]
      .map(([, name, block]) => ({ name, block }))
      .filter(({ block }) =>
        [
          "bg-dark",
          "card-dark",
          "surface-dark",
          "fg-dark",
          "bg-light",
          "card-light",
          "surface-light",
          "fg-light",
        ].every((token) => readLightness(block, token) !== undefined),
      );

    expect(palettes.length).toBeGreaterThan(10);

    for (const { name, block } of palettes) {
      const darkBackground = readLightness(block, "bg-dark")!;
      const darkCard = readLightness(block, "card-dark")!;
      const darkSurface = readLightness(block, "surface-dark")!;
      const darkForeground = readLightness(block, "fg-dark")!;
      const lightBackground = readLightness(block, "bg-light")!;
      const lightCard = readLightness(block, "card-light")!;
      const lightSurface = readLightness(block, "surface-light")!;
      const lightForeground = readLightness(block, "fg-light")!;

      expect(darkBackground, `${name} dark background`).toBeLessThan(0.3);
      expect(darkCard, `${name} dark card`).toBeLessThan(0.45);
      expect(darkSurface, `${name} dark surface`).toBeLessThan(0.5);
      expect(darkForeground, `${name} dark foreground`).toBeGreaterThan(darkBackground + 0.45);
      expect(lightBackground, `${name} light background`).toBeGreaterThan(0.74);
      expect(lightCard, `${name} light card`).toBeGreaterThan(0.82);
      expect(lightSurface, `${name} light surface`).toBeGreaterThan(0.68);
      expect(lightForeground, `${name} light foreground`).toBeLessThan(lightBackground - 0.38);
    }
  });
});
