/**
 * Maps between world coordinates (SI metres, y up) and canvas pixels (y down).
 * Keeps an equal scale on both axes so trajectories are not distorted.
 */
export interface Viewport {
  /** World x shown at the left edge of the plot area. */
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** Padding around the plot area in CSS pixels. */
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface ViewportTransform {
  scale: number;
  toScreenX: (x: number) => number;
  toScreenY: (y: number) => number;
  /** Visible world bounds after equal-aspect fitting. */
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
}

export function createViewportTransform(viewport: Viewport): ViewportTransform {
  const { padding, width, height } = viewport;
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const spanX = Math.max(1e-9, viewport.xMax - viewport.xMin);
  const spanY = Math.max(1e-9, viewport.yMax - viewport.yMin);
  const scale = Math.min(plotWidth / spanX, plotHeight / spanY);

  const originX = padding.left - viewport.xMin * scale;
  const originY = padding.top + plotHeight + viewport.yMin * scale;

  return {
    scale,
    toScreenX: (x) => originX + x * scale,
    toScreenY: (y) => originY - y * scale,
    bounds: {
      xMin: viewport.xMin,
      xMax: viewport.xMin + plotWidth / scale,
      yMin: viewport.yMin,
      yMax: viewport.yMin + plotHeight / scale,
    },
  };
}

/**
 * Chooses a "nice" grid spacing (1, 2 or 5 × 10ⁿ) so that roughly
 * `targetDivisions` gridlines span the given range.
 */
export function niceStep(range: number, targetDivisions = 8): number {
  if (!(range > 0)) return 1;
  const rough = range / targetDivisions;
  const exponent = Math.floor(Math.log10(rough));
  const base = 10 ** exponent;
  const fraction = rough / base;
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return niceFraction * base;
}
