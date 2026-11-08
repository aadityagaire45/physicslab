/**
 * Small deterministic pseudo-random number generator (Mulberry32).
 * Deterministic seeding makes generated problems reproducible and testable.
 */
export type RandomSource = () => number;

export function createRandom(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Uniform sample in [min, max] rounded to the given step. */
export function randomStep(random: RandomSource, min: number, max: number, step: number): number {
  const steps = Math.floor((max - min) / step);
  const value = min + Math.round(random() * steps) * step;
  // Guard against floating point artefacts such as 0.30000000000000004.
  return Number.parseFloat(value.toFixed(10));
}
