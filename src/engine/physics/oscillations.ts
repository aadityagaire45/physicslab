import { rk4Step, type Derivative } from '../mathematics/integrators';
import { completeEllipticK } from '../mathematics/numeric';
import { degToRad, radToDeg } from '../units/conversions';

/** Small-angle period of a simple pendulum: T = 2π √(L / g). */
export function pendulumPeriodSmallAngle(length: number, gravity: number): number {
  if (!(length > 0) || !(gravity > 0)) throw new RangeError('Length and gravity must be positive');
  return 2 * Math.PI * Math.sqrt(length / gravity);
}

/**
 * Exact period of an ideal undamped simple pendulum released from rest at amplitude θ₀:
 *   T = 4 √(L / g) · K(sin(|θ₀| / 2))
 * where K is the complete elliptic integral of the first kind.
 */
export function pendulumPeriodExact(length: number, gravity: number, amplitudeRad: number): number {
  if (!(length > 0) || !(gravity > 0)) throw new RangeError('Length and gravity must be positive');
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
  if (!(mass > 0) || !(springConstant > 0) || !(damping >= 0)) {
    throw new RangeError('Mass and springConstant must be positive and damping must be non-negative');
  }
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
 * Velocity x'(t) of a linear damped oscillator m x'' + b x' + k x = 0
 * released from rest at x(0) = A, x'(0) = 0.
 */
export function dampedVelocity(params: DampedOscillatorParams, t: number): number {
  const { amplitude: A, mass: m, springConstant: k, damping: b } = params;
  const omega0 = Math.sqrt(k / m);
  const gamma = b / (2 * m);
  const regime = dampingRegime(params);

  if (regime === 'undamped') return -A * omega0 * Math.sin(omega0 * t);

  if (regime === 'underdamped') {
    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    return -A * ((omega0 * omega0) / omegaD) * Math.exp(-gamma * t) * Math.sin(omegaD * t);
  }

  if (regime === 'critically-damped') {
    return -A * gamma * gamma * t * Math.exp(-gamma * t);
  }

  const root = Math.sqrt(gamma * gamma - omega0 * omega0);
  const r1 = -gamma + root;
  const r2 = -gamma - root;
  const c1 = (-r2 * A) / (r1 - r2);
  const c2 = (r1 * A) / (r1 - r2);
  return c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
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

/**
 * Physical parameters of a nonlinear damped simple pendulum governed by:
 *   d²θ/dt² + (b / m) dθ/dt + (g / L) sin(θ) = 0
 *
 * Physical meaning of `damping` (b):
 *   Linear tangential viscous damping coefficient in SI units of kg/s (N·s/m).
 *   A bob moving with tangential speed v = L · dθ/dt experiences a resistive
 *   drag force F_d = −b v = −b L dθ/dt, producing a resistive torque
 *   τ_d = −b L² dθ/dt about the pivot. Dividing the rotational equation of
 *   motion m L² d²θ/dt² = −m g L sin(θ) − b L² dθ/dt by m L² yields the
 *   specific damping term (b / m) dθ/dt with units of s⁻¹.
 */
export interface PendulumParams {
  /** Pendulum rod/string length L from pivot to bob center of mass (m), > 0. */
  length: number;
  /** Bob mass m (kg), > 0. */
  mass: number;
  /** Gravitational field strength g (m/s²), > 0. */
  gravity: number;
  /** Initial release angle θ₀ from downward vertical (degrees), |θ₀| < 180°. */
  initialAngleDeg: number;
  /** Linear tangential viscous damping coefficient b (kg/s, i.e. N·s/m), ≥ 0. */
  damping: number;
}

export interface PendulumState {
  /** Simulation time t (s). */
  t: number;
  /** Nonlinear angular displacement θ (rad). */
  theta: number;
  /** Nonlinear angular displacement θ (deg). */
  thetaDeg: number;
  /** Nonlinear angular velocity ω = dθ/dt (rad/s). */
  omega: number;
  /** Nonlinear angular acceleration α = d²θ/dt² (rad/s²). */
  alpha: number;
  /** Small-angle linearized displacement θ_lin(t) (rad). */
  thetaSmallAngle: number;
  /** Small-angle linearized displacement θ_lin(t) (deg). */
  thetaSmallAngleDeg: number;
  /** Small-angle linearized angular velocity ω_lin(t) (rad/s). */
  omegaSmallAngle: number;
  /** Horizontal bob coordinate x = L sin(θ) relative to pivot (m). */
  x: number;
  /** Vertical bob coordinate y = −L cos(θ) relative to pivot (m). */
  y: number;
  /** Vertical elevation h = L (1 − cos(θ)) above the lowest equilibrium point (m). */
  height: number;
  /** Tangential speed |v| = L |ω| (m/s). */
  speed: number;
  /** Tangential velocity v_t = L ω (m/s, positive counter-clockwise). */
  tangentialVelocity: number;
  /** String/rod tension T = m (g cos(θ) + L ω²) (N). */
  tension: number;
  /** Translational kinetic energy K = ½ m L² ω² (J). */
  kineticEnergy: number;
  /** Gravitational potential energy U = m g L (1 − cos(θ)) relative to θ = 0 (J). */
  potentialEnergy: number;
  /** Total mechanical energy E = K + U (J). */
  totalEnergy: number;
}

export interface PendulumSummary {
  /** Small-angle period T₀ = 2π √(L / g) (s). */
  smallAnglePeriod: number;
  /** Exact undamped nonlinear period T_exact = 4 √(L / g) K(sin(|θ₀|/2)) (s). */
  exactUndampedPeriod: number;
  /** Numerical period measured from RK4 zero-crossings (s), or null if non-oscillatory. */
  measuredPeriod: number | null;
  /** Relative period lengthening (T_exact − T₀) / T₀ in percent (%). */
  periodDeviationPercent: number;
  /** Small-angle natural angular frequency ω₀ = √(g / L) (rad/s). */
  naturalFrequency: number;
  /** Specific damping rate 2γ = b / m (s⁻¹). */
  dampingRate: number;
  /** Dimensionless small-angle damping ratio ζ = b / (2 m ω₀). */
  dampingRatio: number;
  /** Small-angle damping classification. */
  regime: DampingRegime;
  /** Initial mechanical energy E₀ = m g L (1 − cos(θ₀)) (J). */
  initialEnergy: number;
  /** Theoretical undamped peak speed at bottom v_max = √(2 g L (1 − cos(θ₀))) (m/s). */
  maxSpeedUndamped: number;
  /** Theoretical undamped peak string tension at bottom T_max = m g (3 − 2 cos(θ₀)) (N). */
  maxTensionUndamped: number;
}

export function validatePendulumParams(params: PendulumParams): void {
  const { length, mass, gravity, initialAngleDeg, damping } = params;
  if (!Number.isFinite(length) || !(length > 0)) {
    throw new RangeError('Pendulum length L must be a finite positive number');
  }
  if (!Number.isFinite(mass) || !(mass > 0)) {
    throw new RangeError('Pendulum mass m must be a finite positive number');
  }
  if (!Number.isFinite(gravity) || !(gravity > 0)) {
    throw new RangeError('Gravity g must be a finite positive number');
  }
  if (!Number.isFinite(initialAngleDeg) || !(Math.abs(initialAngleDeg) < 180)) {
    throw new RangeError('Initial angle θ₀ must be finite with |θ₀| < 180 degrees');
  }
  if (!Number.isFinite(damping) || !(damping >= 0)) {
    throw new RangeError('Damping coefficient b must be a finite non-negative number');
  }
}

/**
 * First-order ODE derivative for state vector [θ, ω]:
 *   d/dt [θ, ω] = [ω, −(b / m) ω − (g / L) sin(θ)]
 */
export function pendulumDerivative(params: PendulumParams): Derivative {
  validatePendulumParams(params);
  const { length, mass, gravity, damping } = params;
  const dampingOverMass = damping / mass;
  const gravityOverLength = gravity / length;
  return (_t, state) => {
    const theta = state[0];
    const omega = state[1];
    return [omega, -dampingOverMass * omega - gravityOverLength * Math.sin(theta)];
  };
}

/** Advances [θ, ω] by `dt` seconds using classical 4th-order Runge–Kutta (RK4). */
export function stepPendulumRK4(
  params: PendulumParams,
  t: number,
  theta: number,
  omega: number,
  dt: number,
): [number, number] {
  const deriv = pendulumDerivative(params);
  const next = rk4Step(deriv, t, [theta, omega], dt);
  return [next[0], next[1]];
}

/** Computes the complete physical state (kinematics, forces, energies, and small-angle comparison) at (t, θ, ω). */
export function evaluatePendulumState(
  params: PendulumParams,
  t: number,
  theta: number,
  omega: number,
): PendulumState {
  validatePendulumParams(params);
  const { length: L, mass: m, gravity: g, initialAngleDeg, damping: b } = params;
  const theta0 = degToRad(initialAngleDeg);
  const alpha = -(b / m) * omega - (g / L) * Math.sin(theta);

  // Equivalent linearized harmonic oscillator: m θ'' + b θ' + (m g / L) θ = 0
  const linearParams: DampedOscillatorParams = {
    amplitude: theta0,
    mass: m,
    springConstant: (m * g) / L,
    damping: b,
  };
  const thetaSmallAngle = dampedDisplacement(linearParams, t);
  const omegaSmallAngle = dampedVelocity(linearParams, t);

  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const x = L * sinTheta;
  const y = -L * cosTheta;
  const height = L * (1 - cosTheta);
  const tangentialVelocity = L * omega;
  const speed = Math.abs(tangentialVelocity);
  const tension = m * (g * cosTheta + L * omega * omega);
  const kineticEnergy = 0.5 * m * L * L * omega * omega;
  const potentialEnergy = m * g * height;
  const totalEnergy = kineticEnergy + potentialEnergy;

  return {
    t,
    theta,
    thetaDeg: radToDeg(theta),
    omega,
    alpha,
    thetaSmallAngle,
    thetaSmallAngleDeg: radToDeg(thetaSmallAngle),
    omegaSmallAngle,
    x,
    y,
    height,
    speed,
    tangentialVelocity,
    tension,
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
  };
}

/**
 * Integrates the nonlinear pendulum ODE from rest at θ(0) = θ₀, ω(0) = 0 over
 * [0, duration] using RK4 with internal sub-stepping (maxIntegrationDt ≤ 0.002 s)
 * and returns `sampleCount` uniformly spaced states.
 */
export function simulatePendulumTrajectory(
  params: PendulumParams,
  duration: number,
  sampleCount = 241,
  maxIntegrationDt = 0.002,
): PendulumState[] {
  validatePendulumParams(params);
  if (!Number.isFinite(duration) || !(duration >= 0)) {
    throw new RangeError('Simulation duration must be a finite non-negative number');
  }
  if (sampleCount < 2) {
    throw new RangeError('sampleCount must be at least 2');
  }

  const theta0 = degToRad(params.initialAngleDeg);
  if (duration === 0) {
    return [evaluatePendulumState(params, 0, theta0, 0)];
  }

  const deriv = pendulumDerivative(params);
  const sampleDt = duration / (sampleCount - 1);
  const subSteps = Math.max(1, Math.ceil(sampleDt / maxIntegrationDt));
  const h = sampleDt / subSteps;

  const states: PendulumState[] = new Array(sampleCount);
  let theta = theta0;
  let omega = 0;
  let t = 0;

  states[0] = evaluatePendulumState(params, 0, theta, omega);

  for (let i = 1; i < sampleCount; i += 1) {
    for (let s = 0; s < subSteps; s += 1) {
      const next = rk4Step(deriv, t, [theta, omega], h);
      theta = next[0];
      omega = next[1];
      t += h;
    }
    const exactT = i === sampleCount - 1 ? duration : i * sampleDt;
    states[i] = evaluatePendulumState(params, exactT, theta, omega);
  }

  return states;
}

/**
 * Evaluates the exact RK4 pendulum state at any arbitrary time `t` within a
 * pre-integrated `trajectory` by stepping from the nearest preceding sample
 * with a single RK4 sub-step. Guarantees that apparatus state and plotted
 * trajectory series share the exact same physical state at every instant.
 */
export function pendulumStateAt(
  params: PendulumParams,
  trajectory: readonly PendulumState[],
  t: number,
): PendulumState {
  if (trajectory.length === 0) {
    return evaluatePendulumState(params, 0, degToRad(params.initialAngleDeg), 0);
  }
  if (t <= 0 || trajectory.length === 1) return trajectory[0];
  const last = trajectory[trajectory.length - 1];
  if (t >= last.t) return last;

  const sampleDt = last.t / (trajectory.length - 1);
  const idx = Math.min(trajectory.length - 2, Math.max(0, Math.floor(t / sampleDt)));
  const base = trajectory[idx];
  const remDt = t - base.t;
  if (remDt <= 1e-9) return base;

  const [theta, omega] = stepPendulumRK4(params, base.t, base.theta, base.omega, remDt);
  return evaluatePendulumState(params, t, theta, omega);
}


/**
 * Numerically measures the oscillation period of the pendulum from its RK4
 * trajectory by finding the first two zero-crossings of θ(t) using cubic
 * Hermite / linear interpolation between fine RK4 steps (dt ≤ 0.0015 s).
 * Returns `null` if θ₀ = 0 or if damping prevents the pendulum from completing
 * a half-cycle (overdamped / heavily damped regime).
 */
export function measurePendulumPeriod(params: PendulumParams): number | null {
  validatePendulumParams(params);
  const theta0 = degToRad(params.initialAngleDeg);
  if (Math.abs(theta0) < 1e-9) {
    return params.damping === 0 ? pendulumPeriodSmallAngle(params.length, params.gravity) : null;
  }

  const exactUndamped = pendulumPeriodExact(params.length, params.gravity, theta0);
  const maxSearchTime = exactUndamped * 2.5;
  const dt = Math.min(0.0015, exactUndamped / 1600);
  const maxSteps = Math.ceil(maxSearchTime / dt);
  const deriv = pendulumDerivative(params);

  let t = 0;
  let theta = theta0;
  let omega = 0;
  const crossings: number[] = [];

  for (let i = 0; i < maxSteps && crossings.length < 2; i += 1) {
    const next = rk4Step(deriv, t, [theta, omega], dt);
    const nextTheta = next[0];
    const nextOmega = next[1];

    if ((theta > 0 && nextTheta <= 0) || (theta < 0 && nextTheta >= 0)) {
      // Refine zero-crossing time within [t, t + dt]
      const frac = Math.abs(theta) / (Math.abs(theta) + Math.abs(nextTheta));
      crossings.push(t + frac * dt);
    }

    theta = nextTheta;
    omega = nextOmega;
    t += dt;
  }

  if (crossings.length < 2) return null;
  // Time between first and second equilibrium crossings is one half-period (T / 2)
  return 2 * (crossings[1] - crossings[0]);
}

/** Computes analytical and numerical summary metrics for the pendulum configuration. */
export function pendulumSummary(params: PendulumParams): PendulumSummary {
  validatePendulumParams(params);
  const { length: L, mass: m, gravity: g, initialAngleDeg, damping: b } = params;
  const theta0 = degToRad(initialAngleDeg);
  const smallAnglePeriod = pendulumPeriodSmallAngle(L, g);
  const exactUndampedPeriod = pendulumPeriodExact(L, g, theta0);
  const periodDeviationPercent =
    ((exactUndampedPeriod - smallAnglePeriod) / smallAnglePeriod) * 100;

  const naturalFrequency = Math.sqrt(g / L);
  const dampingRate = b / m;
  const dampingRatio = b / (2 * m * naturalFrequency);
  const regime = dampingRegime({
    amplitude: theta0,
    mass: m,
    springConstant: (m * g) / L,
    damping: b,
  });

  const initialHeight = L * (1 - Math.cos(theta0));
  const initialEnergy = m * g * initialHeight;
  const maxSpeedUndamped = Math.sqrt(2 * g * initialHeight);
  const maxTensionUndamped = m * g * (3 - 2 * Math.cos(theta0));
  const measuredPeriod = regime === 'overdamped' || regime === 'critically-damped'
    ? null
    : measurePendulumPeriod(params);

  return {
    smallAnglePeriod,
    exactUndampedPeriod,
    measuredPeriod,
    periodDeviationPercent,
    naturalFrequency,
    dampingRate,
    dampingRatio,
    regime,
    initialEnergy,
    maxSpeedUndamped,
    maxTensionUndamped,
  };
}
