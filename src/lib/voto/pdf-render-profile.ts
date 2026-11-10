export type PdfRenderProfile = {
  pageScale: number;
  renderRatio: number;
  rootMargin: string;
};

type PdfRenderProfileInput = {
  performanceMode: boolean;
  smallScreen: boolean;
  devicePixelRatio: number;
};

const DEFAULT_PAGE_SCALE = 1.25;
const DEFAULT_ROOT_MARGIN = "900px 0px";
const PERFORMANCE_PAGE_SCALE = 1;
const PERFORMANCE_PIXEL_RATIO = 1.25;
const PERFORMANCE_ROOT_MARGIN = "300px 0px";

export function getPdfRenderProfile({
  performanceMode,
  smallScreen,
  devicePixelRatio,
}: PdfRenderProfileInput): PdfRenderProfile {
  const pixelRatio =
    Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  if (!performanceMode || !smallScreen) {
    return {
      pageScale: DEFAULT_PAGE_SCALE,
      renderRatio: pixelRatio,
      rootMargin: DEFAULT_ROOT_MARGIN,
    };
  }

  return {
    pageScale: PERFORMANCE_PAGE_SCALE,
    renderRatio: Math.min(pixelRatio, PERFORMANCE_PIXEL_RATIO),
    rootMargin: PERFORMANCE_ROOT_MARGIN,
  };
}
