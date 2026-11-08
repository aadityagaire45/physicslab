/**
 * Snell's law: n₁ sin θ₁ = n₂ sin θ₂.
 * Returns the refraction angle in radians, or null for total internal reflection.
 */
export function refractionAngle(n1: number, n2: number, incidenceRad: number): number | null {
  if (!(n1 > 0) || !(n2 > 0)) throw new RangeError('Refractive indices must be positive');
  const s = (n1 / n2) * Math.sin(incidenceRad);
  if (Math.abs(s) > 1) return null;
  return Math.asin(s);
}

/** Critical angle for total internal reflection (radians), or null when n₁ ≤ n₂. */
export function criticalAngle(n1: number, n2: number): number | null {
  if (n1 <= n2) return null;
  return Math.asin(n2 / n1);
}

/**
 * Thin-lens equation (real-is-positive convention): 1/f = 1/d_o + 1/d_i.
 * Returns the image distance; Infinity when the object is at the focal point.
 */
export function thinLensImageDistance(focalLength: number, objectDistance: number): number {
  if (objectDistance === focalLength) return Number.POSITIVE_INFINITY;
  return 1 / (1 / focalLength - 1 / objectDistance);
}

/** Lateral magnification m = −d_i / d_o. */
export const lateralMagnification = (imageDistance: number, objectDistance: number): number =>
  -imageDistance / objectDistance;
