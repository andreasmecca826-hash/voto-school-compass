import { describe, expect, it } from "vitest";
import { getPdfRenderProfile } from "@/lib/voto/pdf-render-profile";

describe("profilo di rendering PDF", () => {
  it("mantiene qualità e caricamento normali con la modalità prestazioni disattivata", () => {
    expect(
      getPdfRenderProfile({
        performanceMode: false,
        smallScreen: true,
        devicePixelRatio: 3,
      }),
    ).toEqual({ pageScale: 1.25, renderRatio: 3, rootMargin: "900px 0px" });
  });

  it("riduce pixel e precaricamento su smartphone quando la modalità è attiva", () => {
    expect(
      getPdfRenderProfile({
        performanceMode: true,
        smallScreen: true,
        devicePixelRatio: 3,
      }),
    ).toEqual({ pageScale: 1, renderRatio: 1.25, rootMargin: "300px 0px" });
  });

  it("non riduce la qualità PDF su schermi grandi anche se la modalità è attiva", () => {
    expect(
      getPdfRenderProfile({
        performanceMode: true,
        smallScreen: false,
        devicePixelRatio: 2,
      }),
    ).toEqual({ pageScale: 1.25, renderRatio: 2, rootMargin: "900px 0px" });
  });
});
