import { completeEllipticK } from '../mathematics/numeric';

/** Small-angle period of a simple pendulum: T = 2π √(L / g). */
export function pendulumPeriodSmallAngle(length: number, gravity: number): number {
  if (!(length > 0) || !(gravity > 0)) throw new RangeError('Length and gravity must be positive');
  return 2 * Math.PI * Math.sqrt(length / gravity);
}

/**
 * Exact period of an ideal simple pendulum released from rest at amplitude θ₀:
 *   T = 4 √(L / g) · K(sin(θ₀ / 2))
 * where K is the complete elliptic integral of the first kind.
 */
export function pendulumPeriodExact(length: number, gravity: number, amplitudeRad: number): number {
  if (!(Math.abs(amplitudeRad) < Math.PI)) throw new RangeError('Amplitude must be below π radians');
  const k = Math.sin(Math.abs(amplitudeRad) / 2);
  return 4 * Math.sqrt(length / gravity) * completeEllipticK(k);
}

/** Period of an ideal spring–mass oscillator: T = 2π √(m / k). */
export function springPeriod(mass: number, springConstant: number): number {
  if (!(mass > 0) || !(springConstant > 0)) throw new RangeError('Mass and spring constant must be positive');
  return 2 * Math.PI * Math.sqrt(mass / springConstant);
}

export interface DampedOscillatorParams {
  /** Initial displacement amplitude (m). */
  amplitude: number;
  /** Mass (kg), > 0. */
  mass: number;
  /** Spring constant (N/m), > 0. */
  springConstant: number;
  /** Linear damping coefficient b (kg/s), ≥ 0. */
  damping: number;
}

export type DampingRegime = 'undamped' | 'underdamped' | 'critically-damped' | 'overdamped';

export function dampingRegime({ mass, springConstant, damping }: DampedOscillatorParams): DampingRegime {
  if (damping === 0) return 'undamped';
  const gamma = damping / (2 * mass);
  const omega0 = Math.sqrt(springConstant / mass);
  const relative = (gamma - omega0) / omega0;
  if (Math.abs(relative) < 1e-9) return 'critically-damped';
  return gamma < omega0 ? 'underdamped' : 'overdamped';
}

/**
 * Displacement x(t) of a linear damped oscillator m x'' + b x' + k x = 0
 * released from rest at x(0) = A. Handles all damping regimes analytically.
 */
export function dampedDisplacement(params: DampedOscillatorParams, t: number): number {
  const { amplitude: A, mass: m, springConstant: k, damping: b } = params;
  const omega0 = Math.sqrt(k / m);
  const gamma = b / (2 * m);
  const regime = dampingRegime(params);

  if (regime === 'undamped') return A * Math.cos(omega0 * t);

  if (regime === 'underdamped') {
    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    return A * Math.exp(-gamma * t) * (Math.cos(omegaD * t) + (gamma / omegaD) * Math.sin(omegaD * t));
  }

  if (regime === 'critically-damped') {
    return A * Math.exp(-gamma * t) * (1 + gamma * t);
  }

  // Overdamped: x = C1 e^{r1 t} + C2 e^{r2 t}, with x(0) = A and x'(0) = 0.
  const root = Math.sqrt(gamma * gamma - omega0 * omega0);
  const r1 = -gamma + root;
  const r2 = -gamma - root;
  const c1 = (-r2 * A) / (r1 - r2);
  const c2 = (r1 * A) / (r1 - r2);
  return c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

/**
 * Positive amplitude envelope E(t) for a linear oscillator released from rest
 * at x(0) = A, x'(0) = 0:
 *   - Undamped (b = 0): E(t) = |A|
 *   - Underdamped (0 < γ < ω₀): since x(t) = A (ω₀ / ω_d) e^(−γt) cos(ω_d t − φ)
 *     with tan φ = γ / ω_d, the exact bounding envelope tangent to x(t) is
 *     E(t) = |A| (ω₀ / ω_d) e^(−γt), satisfying |x(t)| ≤ E(t) for all t ≥ 0.
 *   - Critically damped or overdamped (γ ≥ ω₀): motion is non-oscillatory, so
 *     no oscillatory envelope exists (returns null).
 */
export function dampedEnvelope(params: DampedOscillatorParams, t: number): number | null {
  const { amplitude: A, mass: m, springConstant: k, damping: b } = params;
  const regime = dampingRegime(params);
  if (regime === 'undamped') return Math.abs(A);
  if (regime === 'underdamped') {
    const omega0 = Math.sqrt(k / m);
    const gamma = b / (2 * m);
    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    return Math.abs(A) * (omega0 / omegaD) * Math.exp(-gamma * t);
  }
  return null;
}
