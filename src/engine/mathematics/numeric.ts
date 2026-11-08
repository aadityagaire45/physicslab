/** General numeric utilities. */

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Returns `count` evenly spaced samples over the closed interval [start, end]. */
export function linspace(start: number, end: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [start];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? end : start + i * step));
}

/** Relative/absolute tolerance comparison. */
export function approxEqual(a: number, b: number, relTol = 1e-9, absTol = 0): boolean {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), absTol);
}

/**
 * Arithmetic–geometric mean of two positive numbers. Converges quadratically
 * and is used to evaluate complete elliptic integrals.
 */
export function arithmeticGeometricMean(a: number, b: number, tolerance = 1e-15): number {
  let x = a;
  let y = b;
  for (let i = 0; i < 64 && Math.abs(x - y) > tolerance * x; i += 1) {
    const nextX = (x + y) / 2;
    y = Math.sqrt(x * y);
    x = nextX;
  }
  return (x + y) / 2;
}

/**
 * Complete elliptic integral of the first kind, K(k), with modulus k ∈ [0, 1).
 * K(k) = π / (2 · AGM(1, √(1 − k²))).
 */
export function completeEllipticK(k: number): number {
  if (k < 0 || k >= 1) throw new RangeError('Elliptic modulus k must satisfy 0 ≤ k < 1');
  return Math.PI / (2 * arithmeticGeometricMean(1, Math.sqrt(1 - k * k)));
}
