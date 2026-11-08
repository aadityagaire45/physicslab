import { rk4Step, type Derivative } from '../mathematics/integrators';
import { clamp } from '../mathematics/numeric';
import { GRAVITATIONAL_CONSTANT } from '../units/constants';
import { degToRad } from '../units/conversions';

/** Reference astronomical constants in SI units. */
export const EARTH_MASS = 5.972_168e24;
export const EARTH_EQUATORIAL_RADIUS = 6.378_137e6;
export const MOON_MASS = 7.342e22;
export const MOON_ORBITAL_RADIUS = 3.844e8;
export const MARS_MASS = 6.417_1e23;

/** Tolerance for classifying near-zero eccentricity as circular. */
export const CIRCULAR_ECCENTRICITY_TOL = 1e-3;

/** Tolerance around e = 1 for classifying parabolic escape trajectories. */
export const PARABOLIC_ECCENTRICITY_TOL = 1e-3;

export type OrbitClassification =
  | 'circular'
  | 'elliptical'
  | 'parabolic'
  | 'hyperbolic';

export type OrbitalMotionDirection =
  | 'counter-clockwise'
  | 'clockwise'
  | 'radial';

/**
 * Input parameters for two-dimensional Newtonian orbital mechanics in SI units.
 *
 * Coordinate convention:
 *   - Central mass M is located at the origin (0, 0).
 *   - Initial satellite position is at polar angle θ₀ (default 0° on the +x axis)
 *     at radial distance r₀ from the origin:
 *       x₀ = r₀ cos(θ₀),   y₀ = r₀ sin(θ₀)
 *   - Radial unit vector:     r̂ = (cos θ₀, sin θ₀)
 *   - Tangential unit vector: θ̂ = (−sin θ₀, cos θ₀) (counter-clockwise positive)
 *   - Initial velocity vector:
 *       v⃗₀ = v_r r̂ + v_t θ̂
 */
export interface OrbitalParams {
  /** Central body mass M (kg), > 0. */
  centralMass: number;
  /** Orbiting satellite mass m (kg), > 0. */
  satelliteMass: number;
  /** Initial orbital radius r₀ from central focus (m), > 0. */
  initialRadius: number;
  /** Initial tangential velocity v_t (m/s, positive = counter-clockwise). */
  tangentialVelocity: number;
  /** Initial radial velocity v_r (m/s, positive = outward from central body). */
  radialVelocity?: number;
  /** Initial angular position θ₀ in degrees (default 0°). */
  initialAngleDeg?: number;
  /** Optional gravitational constant override G (m³/(kg·s²)). */
  gravitationalConstant?: number;
}

export interface OrbitalElements {
  /** Standard gravitational parameter μ = G M (m³/s²). */
  mu: number;
  /** Initial radial distance r₀ (m). */
  r0: number;
  /** Initial speed v₀ = √(v_t² + v_r²) (m/s). */
  v0: number;
  /** Circular orbital speed at r₀: v_c = √(G M / r₀) (m/s). */
  circularVelocity: number;
  /** Escape speed at r₀: v_e = √(2 G M / r₀) (m/s). */
  escapeVelocity: number;
  /** Circular orbital period at r₀: T_c = 2π √(r₀³ / (G M)) (s). */
  circularPeriodAtR0: number;
  /** Initial gravitational acceleration magnitude a_g = G M / r₀² (m/s²). */
  initialAcceleration: number;
  /** Initial gravitational force magnitude F_g = G M m / r₀² (N). */
  initialForce: number;
  /** Specific orbital energy ε = v₀²/2 − G M / r₀ (J/kg). */
  specificEnergy: number;
  /** Initial kinetic energy K₀ = ½ m v₀² (J). */
  initialKineticEnergy: number;
  /** Initial gravitational potential energy U₀ = −G M m / r₀ (J). */
  initialPotentialEnergy: number;
  /** Initial total mechanical energy E₀ = K₀ + U₀ (J). */
  initialTotalEnergy: number;
  /** Signed z-component of specific angular momentum h_z = x₀ v_y0 − y₀ v_x0 (m²/s). */
  signedSpecificAngularMomentum: number;
  /** Specific angular momentum magnitude h = |r⃗ × v⃗| (m²/s). */
  specificAngularMomentum: number;
  /** Total angular momentum magnitude L = m h (kg·m²/s). */
  totalAngularMomentum: number;
  /** Sense of orbital motion in the (x, y) plane. */
  motionDirection: OrbitalMotionDirection;
  /** Orbital eccentricity e = √(1 + 2 ε h² / (G M)²) ≥ 0. */
  eccentricity: number;
  /** Laplace–Runge–Lenz eccentricity vector pointing from focus toward periapsis. */
  eccentricityVector: { ex: number; ey: number };
  /** Argument of periapsis ω in radians in the (x, y) plane. */
  periapsisAngleRad: number;
  /** Orbit classification from conserved energy and eccentricity. */
  classification: OrbitClassification;
  /** Whether the trajectory is gravitationally bound (circular or elliptical). */
  isBound: boolean;
  /**
   * Semi-major axis a = −G M / (2 ε) (m).
   * Positive for bound (circular/elliptical) orbits, negative for hyperbolic
   * trajectories, and null (divergent/undefined) at the parabolic limit.
   */
  semiMajorAxis: number | null;
  /** Semi-minor axis b = a √(1 − e²) (m) for bound orbits; null for unbound trajectories. */
  semiMinorAxis: number | null;
  /** Periapsis (closest approach) distance r_p (m). */
  periapsisDistance: number;
  /** Apoapsis (farthest point) distance r_a (m) for bound orbits; null for unbound trajectories. */
  apoapsisDistance: number | null;
  /** 2D position of periapsis in the orbital plane (m). */
  periapsisPosition: { x: number; y: number };
  /** 2D position of apoapsis in the orbital plane (m) for bound orbits; null if unbound. */
  apoapsisPosition: { x: number; y: number } | null;
  /** Orbital period T = 2π √(a³ / (G M)) (s) for bound orbits; null for unbound trajectories. */
  orbitalPeriod: number | null;
  /** Speed at periapsis v_p (m/s). */
  periapsisSpeed: number;
  /** Speed at apoapsis v_a (m/s) for bound orbits; null for unbound trajectories. */
  apoapsisSpeed: number | null;
}

export interface OrbitalState {
  /** Simulation time t (s). */
  t: number;
  /** Position x (m). */
  x: number;
  /** Position y (m). */
  y: number;
  /** Velocity v_x (m/s). */
  vx: number;
  /** Velocity v_y (m/s). */
  vy: number;
  /** Acceleration a_x (m/s²). */
  ax: number;
  /** Acceleration a_y (m/s²). */
  ay: number;
  /** Orbital radius r = √(x² + y²) (m). */
  r: number;
  /** Orbital speed v = √(v_x² + v_y²) (m/s). */
  speed: number;
  /** Radial velocity component v_r = (r⃗ · v⃗) / r (m/s). */
  radialVelocity: number;
  /** Tangential velocity component v_t = (x v_y − y v_x) / r (m/s). */
  tangentialVelocity: number;
  /** Gravitational acceleration magnitude a = G M / r² (m/s²). */
  accelerationMagnitude: number;
  /** Gravitational force magnitude F = G M m / r² (N). */
  forceMagnitude: number;
  /** Local circular orbital speed √(G M / r) (m/s). */
  localCircularSpeed: number;
  /** Local escape speed √(2 G M / r) (m/s). */
  localEscapeSpeed: number;
  /** Kinetic energy K = ½ m v² (J). */
  kineticEnergy: number;
  /** Gravitational potential energy U = −G M m / r (J). */
  potentialEnergy: number;
  /** Total mechanical energy E = K + U (J). */
  totalEnergy: number;
  /** Specific orbital energy ε = v²/2 − G M / r (J/kg). */
  specificEnergy: number;
  /** Specific angular momentum h = |x v_y − y v_x| (m²/s). */
  specificAngularMomentum: number;
  /** Total angular momentum L = m h (kg·m²/s). */
  angularMomentum: number;
}

export interface OrbitalTrajectoryResult {
  /** Numerically integrated state samples across the simulation window. */
  samples: OrbitalState[];
  /** Conserved theoretical orbital elements from initial conditions. */
  elements: OrbitalElements;
  /** Total duration simulated (s). */
  duration: number;
  /** Maximum relative drift in total mechanical energy |E(t) − E₀| / |E₀| (or |ε(t) − ε₀| / v_c²). */
  maxRelativeEnergyDrift: number;
  /** Maximum relative drift in specific angular momentum |h(t) − h₀| / h₀. */
  maxRelativeAngularMomentumDrift: number;
}

/** Validates physical parameters for Newtonian orbital simulation. */
export function validateOrbitalParams(params: OrbitalParams): void {
  const {
    centralMass,
    satelliteMass,
    initialRadius,
    tangentialVelocity,
    radialVelocity = 0,
    initialAngleDeg = 0,
    gravitationalConstant = GRAVITATIONAL_CONSTANT,
  } = params;

  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central body mass M must be a finite positive number');
  }
  if (!Number.isFinite(satelliteMass) || !(satelliteMass > 0)) {
    throw new RangeError('Satellite mass m must be a finite positive number');
  }
  if (!Number.isFinite(initialRadius) || !(initialRadius > 0)) {
    throw new RangeError('Initial orbital radius r₀ must be a finite positive number');
  }
  if (!Number.isFinite(tangentialVelocity)) {
    throw new RangeError('Initial tangential velocity v_t must be a finite number');
  }
  if (!Number.isFinite(radialVelocity)) {
    throw new RangeError('Initial radial velocity v_r must be a finite number');
  }
  if (!Number.isFinite(initialAngleDeg)) {
    throw new RangeError('Initial angle θ₀ must be a finite number');
  }
  if (!Number.isFinite(gravitationalConstant) || !(gravitationalConstant > 0)) {
    throw new RangeError('Gravitational constant G must be a finite positive number');
  }
}

/**
 * Newtonian gravitational force magnitude:
 *   F = G M m / r²  (N)
 */
export function gravitationalForceMagnitude(
  centralMass: number,
  satelliteMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(satelliteMass) || !(satelliteMass > 0)) {
    throw new RangeError('Satellite mass m must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return (G * centralMass * satelliteMass) / (r * r);
}

/**
 * Newtonian gravitational acceleration magnitude:
 *   a = G M / r²  (m/s²)
 */
export function gravitationalAccelerationMagnitude(
  centralMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return (G * centralMass) / (r * r);
}

/**
 * Vector gravitational acceleration toward the central body at (0, 0):
 *   a⃗ = −G M r⃗ / r³
 *
 * Includes optional close-approach radius clamping `minRadius` for numerical
 * integration safety; if `minRadius <= 0` and r = 0, throws RangeError.
 */
export function gravitationalAccelerationVector(
  x: number,
  y: number,
  centralMass: number,
  G = GRAVITATIONAL_CONSTANT,
  minRadius = 0,
): { ax: number; ay: number; r: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError('Position coordinates (x, y) must be finite');
  }
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  const r = Math.hypot(x, y);
  const rEff = Math.max(r, minRadius);
  if (!(rEff > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  const factor = -(G * centralMass) / (rEff * rEff * rEff);
  return {
    ax: factor * x,
    ay: factor * y,
    r,
  };
}

/**
 * Gravitational potential energy:
 *   U = −G M m / r  (J)
 */
export function gravitationalPotentialEnergy(
  centralMass: number,
  satelliteMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(satelliteMass) || !(satelliteMass > 0)) {
    throw new RangeError('Satellite mass m must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return -(G * centralMass * satelliteMass) / r;
}

/**
 * Kinetic energy of the orbiting body:
 *   K = ½ m v²  (J)
 */
export function orbitalKineticEnergy(satelliteMass: number, speed: number): number {
  if (!Number.isFinite(satelliteMass) || !(satelliteMass > 0)) {
    throw new RangeError('Satellite mass m must be positive');
  }
  if (!Number.isFinite(speed)) {
    throw new RangeError('Orbital speed v must be finite');
  }
  return 0.5 * satelliteMass * speed * speed;
}

/**
 * Total mechanical energy:
 *   E = K + U = ½ m v² − G M m / r  (J)
 */
export function totalMechanicalEnergy(
  centralMass: number,
  satelliteMass: number,
  r: number,
  speed: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  return (
    orbitalKineticEnergy(satelliteMass, speed) +
    gravitationalPotentialEnergy(centralMass, satelliteMass, r, G)
  );
}

/**
 * Specific orbital energy (energy per unit satellite mass):
 *   ε = v² / 2 − G M / r  (J/kg)
 */
export function specificOrbitalEnergy(
  centralMass: number,
  r: number,
  speed: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(speed)) {
    throw new RangeError('Orbital speed v must be finite');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return 0.5 * speed * speed - (G * centralMass) / r;
}

/**
 * Signed z-component of specific angular momentum in 2D:
 *   h_z = x v_y − y v_x  (m²/s)
 */
export function signedSpecificAngularMomentum(
  x: number,
  y: number,
  vx: number,
  vy: number,
): number {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
    throw new RangeError('State components (x, y, vx, vy) must be finite');
  }
  return x * vy - y * vx;
}

/**
 * Specific angular momentum magnitude:
 *   h = |r⃗ × v⃗| = |x v_y − y v_x|  (m²/s)
 */
export function specificAngularMomentum(
  x: number,
  y: number,
  vx: number,
  vy: number,
): number {
  return Math.abs(signedSpecificAngularMomentum(x, y, vx, vy));
}

/**
 * Circular orbital velocity at radius r:
 *   v_c = √(G M / r)  (m/s)
 */
export function circularOrbitalVelocity(
  centralMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return Math.sqrt((G * centralMass) / r);
}

/**
 * Gravitational escape velocity at radius r:
 *   v_e = √(2 G M / r)  (m/s)
 */
export function escapeVelocity(
  centralMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return Math.sqrt((2 * G * centralMass) / r);
}

/**
 * Circular orbital period at radius r (or Keplerian period for semi-major axis a = r):
 *   T = 2π √(r³ / (G M))  (s)
 */
export function circularOrbitalPeriod(
  centralMass: number,
  r: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius / semi-major axis must be positive');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  return 2 * Math.PI * Math.sqrt((r * r * r) / (G * centralMass));
}

/**
 * Orbital speed from the vis-viva equation:
 *   v² = G M (2 / r − 1 / a)
 */
export function visVivaSpeed(
  centralMass: number,
  r: number,
  semiMajorAxis: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(r) || !(r > 0)) {
    throw new RangeError('Orbital radius r must be positive');
  }
  if (!Number.isFinite(semiMajorAxis) || semiMajorAxis === 0) {
    throw new RangeError('Semi-major axis a must be a non-zero finite number');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  const term = 2 / r - 1 / semiMajorAxis;
  if (term < -1e-12) {
    throw new RangeError('Radius r exceeds maximum reach 2a for the given bound semi-major axis');
  }
  return Math.sqrt(G * centralMass * Math.max(0, term));
}

/**
 * Orbital eccentricity from conserved specific energy ε and specific angular momentum h:
 *   e = √(1 + 2 ε h² / (G M)²)
 */
export function orbitalEccentricity(
  centralMass: number,
  specificEnergy: number,
  specificAngMomentum: number,
  G = GRAVITATIONAL_CONSTANT,
): number {
  if (!Number.isFinite(centralMass) || !(centralMass > 0)) {
    throw new RangeError('Central mass M must be positive');
  }
  if (!Number.isFinite(specificEnergy) || !Number.isFinite(specificAngMomentum)) {
    throw new RangeError('Specific energy and angular momentum must be finite');
  }
  if (!Number.isFinite(G) || !(G > 0)) {
    throw new RangeError('Gravitational constant G must be positive');
  }
  const mu = G * centralMass;
  const discriminant = 1 + (2 * specificEnergy * specificAngMomentum * specificAngMomentum) / (mu * mu);
  if (discriminant <= 1e-14) return 0;
  return Math.sqrt(discriminant);
}

/**
 * Classifies a conic orbit from its specific energy ε, eccentricity e, and
 * characteristic circular energy scale μ / r₀.
 */
export function classifyOrbit(
  specificEnergy: number,
  eccentricity: number,
  characteristicEnergyScale = 1,
): OrbitClassification {
  if (!Number.isFinite(specificEnergy) || !Number.isFinite(eccentricity) || eccentricity < 0) {
    throw new RangeError('Specific energy and non-negative eccentricity must be finite');
  }
  const normalizedEnergy =
    characteristicEnergyScale > 0
      ? specificEnergy / characteristicEnergyScale
      : specificEnergy;

  if (
    Math.abs(eccentricity - 1) <= PARABOLIC_ECCENTRICITY_TOL ||
    Math.abs(normalizedEnergy) <= PARABOLIC_ECCENTRICITY_TOL * 0.5
  ) {
    return 'parabolic';
  }
  if (specificEnergy < 0 && eccentricity < 1) {
    return eccentricity <= CIRCULAR_ECCENTRICITY_TOL ? 'circular' : 'elliptical';
  }
  return 'hyperbolic';
}

/**
 * Computes initial Cartesian state (x₀, y₀, v_x0, v_y0) from polar orbital parameters.
 */
export function initialCartesianState(params: OrbitalParams): {
  x0: number;
  y0: number;
  vx0: number;
  vy0: number;
} {
  validateOrbitalParams(params);
  const theta = degToRad(params.initialAngleDeg ?? 0);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const r0 = params.initialRadius;
  const vr = params.radialVelocity ?? 0;
  const vt = params.tangentialVelocity;

  return {
    x0: r0 * cosT,
    y0: r0 * sinT,
    vx0: vr * cosT - vt * sinT,
    vy0: vr * sinT + vt * cosT,
  };
}

/**
 * Computes the complete set of conserved orbital elements and conic geometry
 * from the initial orbital parameters.
 */
export function computeOrbitalElements(params: OrbitalParams): OrbitalElements {
  validateOrbitalParams(params);
  const G = params.gravitationalConstant ?? GRAVITATIONAL_CONSTANT;
  const mu = G * params.centralMass;
  const { x0, y0, vx0, vy0 } = initialCartesianState(params);
  const r0 = params.initialRadius;
  const v0 = Math.hypot(vx0, vy0);

  const vc = circularOrbitalVelocity(params.centralMass, r0, G);
  const ve = escapeVelocity(params.centralMass, r0, G);
  const circularPeriodAtR0 = circularOrbitalPeriod(params.centralMass, r0, G);
  const initialAcceleration = gravitationalAccelerationMagnitude(params.centralMass, r0, G);
  const initialForce = gravitationalForceMagnitude(
    params.centralMass,
    params.satelliteMass,
    r0,
    G,
  );

  const eps = specificOrbitalEnergy(params.centralMass, r0, v0, G);
  const K0 = orbitalKineticEnergy(params.satelliteMass, v0);
  const U0 = gravitationalPotentialEnergy(params.centralMass, params.satelliteMass, r0, G);
  const E0 = K0 + U0;

  const hz = signedSpecificAngularMomentum(x0, y0, vx0, vy0);
  const h = Math.abs(hz);
  const L = params.satelliteMass * h;

  const motionDirection: OrbitalMotionDirection =
    Math.abs(hz) <= 1e-9 * r0 * Math.max(1, v0)
      ? 'radial'
      : hz > 0
        ? 'counter-clockwise'
        : 'clockwise';

  // Laplace–Runge–Lenz eccentricity vector: e⃗ = (v⃗ × h⃗)/μ − r⃗/r
  const ex = (vy0 * hz) / mu - x0 / r0;
  const ey = (-vx0 * hz) / mu - y0 / r0;
  const eEnergy = orbitalEccentricity(params.centralMass, eps, h, G);
  const eVecMag = Math.hypot(ex, ey);
  const eccentricity = Number.isFinite(eEnergy) ? eEnergy : eVecMag;

  const theta0 = degToRad(params.initialAngleDeg ?? 0);
  const periapsisAngleRad =
    eVecMag > 1e-8 ? Math.atan2(ey, ex) : theta0;

  const classification = classifyOrbit(eps, eccentricity, vc * vc);
  const isBound = classification === 'circular' || classification === 'elliptical';

  // Do NOT compute a finite semi-major axis for a parabolic orbit.
  let semiMajorAxis: number | null = null;
  let semiMinorAxis: number | null = null;
  let periapsisDistance: number;
  let apoapsisDistance: number | null = null;
  let orbitalPeriod: number | null = null;

  if (classification === 'circular') {
    semiMajorAxis = -mu / (2 * eps);
    semiMinorAxis = semiMajorAxis;
    periapsisDistance = semiMajorAxis * (1 - eccentricity);
    apoapsisDistance = semiMajorAxis * (1 + eccentricity);
    orbitalPeriod = circularOrbitalPeriod(params.centralMass, semiMajorAxis, G);
  } else if (classification === 'elliptical') {
    semiMajorAxis = -mu / (2 * eps);
    semiMinorAxis = semiMajorAxis * Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity));
    periapsisDistance = semiMajorAxis * (1 - eccentricity);
    apoapsisDistance = semiMajorAxis * (1 + eccentricity);
    orbitalPeriod = circularOrbitalPeriod(params.centralMass, semiMajorAxis, G);
  } else if (classification === 'parabolic') {
    semiMajorAxis = null;
    semiMinorAxis = null;
    periapsisDistance = h > 0 ? (h * h) / (2 * mu) : 0;
    apoapsisDistance = null;
    orbitalPeriod = null;
  } else {
    // Hyperbolic escape trajectory (ε > 0, e > 1): transverse axis a < 0, unbound.
    semiMajorAxis = -mu / (2 * eps);
    semiMinorAxis = null;
    periapsisDistance =
      h > 0 ? (h * h) / (mu * (1 + eccentricity)) : Math.abs(semiMajorAxis) * (eccentricity - 1);
    apoapsisDistance = null;
    orbitalPeriod = null;
  }

  const periapsisPosition = {
    x: periapsisDistance * Math.cos(periapsisAngleRad),
    y: periapsisDistance * Math.sin(periapsisAngleRad),
  };

  const apoapsisPosition =
    apoapsisDistance !== null
      ? {
          x: -apoapsisDistance * Math.cos(periapsisAngleRad),
          y: -apoapsisDistance * Math.sin(periapsisAngleRad),
        }
      : null;

  const periapsisSpeed =
    periapsisDistance > 0
      ? Math.sqrt(Math.max(0, 2 * (eps + mu / periapsisDistance)))
      : v0;

  const apoapsisSpeed =
    apoapsisDistance !== null && apoapsisDistance > 0
      ? Math.sqrt(Math.max(0, 2 * (eps + mu / apoapsisDistance)))
      : null;

  return {
    mu,
    r0,
    v0,
    circularVelocity: vc,
    escapeVelocity: ve,
    circularPeriodAtR0,
    initialAcceleration,
    initialForce,
    specificEnergy: eps,
    initialKineticEnergy: K0,
    initialPotentialEnergy: U0,
    initialTotalEnergy: E0,
    signedSpecificAngularMomentum: hz,
    specificAngularMomentum: h,
    totalAngularMomentum: L,
    motionDirection,
    eccentricity,
    eccentricityVector: { ex, ey },
    periapsisAngleRad,
    classification,
    isBound,
    semiMajorAxis,
    semiMinorAxis,
    periapsisDistance,
    apoapsisDistance,
    periapsisPosition,
    apoapsisPosition,
    orbitalPeriod,
    periapsisSpeed,
    apoapsisSpeed,
  };
}

/**
 * Evaluates a rich `OrbitalState` telemetry snapshot from a raw Cartesian state
 * vector `[x, y, vx, vy]` at simulation time `t`.
 */
export function evaluateOrbitalState(
  params: OrbitalParams,
  t: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
): OrbitalState {
  const G = params.gravitationalConstant ?? GRAVITATIONAL_CONSTANT;
  const minR = Math.max(1e3, params.initialRadius * 1e-3);
  const { ax, ay, r } = gravitationalAccelerationVector(
    x,
    y,
    params.centralMass,
    G,
    minR,
  );
  const safeR = Math.max(r, minR);
  const speed = Math.hypot(vx, vy);
  const radialVelocity = (x * vx + y * vy) / safeR;
  const hz = x * vy - y * vx;
  const tangentialVelocity = hz / safeR;
  const accelerationMagnitude = Math.hypot(ax, ay);
  const forceMagnitude = params.satelliteMass * accelerationMagnitude;
  const localCircularSpeed = circularOrbitalVelocity(params.centralMass, safeR, G);
  const localEscapeSpeed = escapeVelocity(params.centralMass, safeR, G);
  const kineticEnergy = orbitalKineticEnergy(params.satelliteMass, speed);
  const potentialEnergy = gravitationalPotentialEnergy(
    params.centralMass,
    params.satelliteMass,
    safeR,
    G,
  );
  const totalEnergy = kineticEnergy + potentialEnergy;
  const specificEnergy = specificOrbitalEnergy(params.centralMass, safeR, speed, G);
  const specificAngMom = Math.abs(hz);
  const angularMomentum = params.satelliteMass * specificAngMom;

  return {
    t,
    x,
    y,
    vx,
    vy,
    ax,
    ay,
    r: safeR,
    speed,
    radialVelocity,
    tangentialVelocity,
    accelerationMagnitude,
    forceMagnitude,
    localCircularSpeed,
    localEscapeSpeed,
    kineticEnergy,
    potentialEnergy,
    totalEnergy,
    specificEnergy,
    specificAngularMomentum: specificAngMom,
    angularMomentum,
  };
}

/**
 * Creates the 2D Newtonian gravitational ODE derivative function for RK4:
 *   d/dt [x, y, vx, vy] = [vx, vy, -GM x / r³, -GM y / r³]
 */
export function createOrbitalDerivative(
  centralMass: number,
  G = GRAVITATIONAL_CONSTANT,
  minRadius = 1e3,
): Derivative {
  const mu = G * centralMass;
  const rMin = Math.max(1, minRadius);
  return (_t, state) => {
    const [x, y, vx, vy] = state;
    const r = Math.max(Math.hypot(x, y), rMin);
    const invR3 = -mu / (r * r * r);
    return [vx, vy, invR3 * x, invR3 * y];
  };
}

/**
 * Advances a 2D orbital state `[x, y, vx, vy]` across time step `dt` using
 * bounded adaptive-substep 4th-order Runge–Kutta integration (`rk4Step`) so close
 * periapsis passages remain accurate and numerically stable.
 */
export function stepOrbitalRK4(
  params: OrbitalParams,
  t: number,
  stateVec: readonly [number, number, number, number],
  dt: number,
): [number, number, number, number] {
  validateOrbitalParams(params);
  if (!Number.isFinite(dt) || dt === 0) {
    return [stateVec[0], stateVec[1], stateVec[2], stateVec[3]];
  }
  const G = params.gravitationalConstant ?? GRAVITATIONAL_CONSTANT;
  const minR = Math.max(1e3, params.initialRadius * 5e-3);
  const f = createOrbitalDerivative(params.centralMass, G, minR);

  const rNow = Math.max(Math.hypot(stateVec[0], stateVec[1]), minR);
  const vNow = Math.max(
    Math.hypot(stateVec[2], stateVec[3]),
    circularOrbitalVelocity(params.centralMass, rNow, G),
  );
  const localCharacteristicTime = rNow / vNow;
  const substeps = clamp(Math.ceil(Math.abs(dt) / (0.04 * localCharacteristicTime)), 1, 24);
  const subDt = dt / substeps;

  let current: number[] = [stateVec[0], stateVec[1], stateVec[2], stateVec[3]];
  let currentT = t;
  for (let i = 0; i < substeps; i += 1) {
    current = rk4Step(f, currentT, current, subDt);
    currentT += subDt;
  }
  return [current[0], current[1], current[2], current[3]];
}

/**
 * Recommends a default simulation window duration (s) for the given orbital
 * parameters:
 *   - Bound circular/elliptical orbits: 1.25 full orbital periods (capped to a
 *     reasonable ratio if extreme apoapsis is set)
 *   - Unbound parabolic/hyperbolic trajectories: 1.6× characteristic circular
 *     period at r₀ so the escape departure curve is clearly visible.
 */
export function defaultOrbitalWindowDuration(params: OrbitalParams): number {
  const elements = computeOrbitalElements(params);
  if (elements.isBound && elements.orbitalPeriod !== null && Number.isFinite(elements.orbitalPeriod)) {
    const maxBoundWindow = elements.circularPeriodAtR0 * 30;
    return Math.min(elements.orbitalPeriod * 1.25, maxBoundWindow);
  }
  return elements.circularPeriodAtR0 * 1.4;
}

/**
 * Numerically integrates a 2D Newtonian orbital trajectory using RK4 over
 * `[0, duration]` with `sampleCount` evenly spaced output samples.
 */
export function simulateOrbitalTrajectory(
  params: OrbitalParams,
  options?: {
    duration?: number;
    sampleCount?: number;
  },
): OrbitalTrajectoryResult {
  validateOrbitalParams(params);
  const elements = computeOrbitalElements(params);
  const duration =
    options?.duration !== undefined && options.duration > 0
      ? options.duration
      : defaultOrbitalWindowDuration(params);
  const sampleCount = clamp(Math.round(options?.sampleCount ?? 240), 16, 720);

  const { x0, y0, vx0, vy0 } = initialCartesianState(params);
  const dt = duration / (sampleCount - 1);

  const samples: OrbitalState[] = [];
  let vec: [number, number, number, number] = [x0, y0, vx0, vy0];
  const initialState = evaluateOrbitalState(params, 0, x0, y0, vx0, vy0);
  samples.push(initialState);

  const energyScale = Math.max(
    Math.abs(initialState.totalEnergy),
    0.5 * params.satelliteMass * elements.circularVelocity * elements.circularVelocity,
    1e-9,
  );
  const hScale = Math.max(
    initialState.specificAngularMomentum,
    elements.r0 * elements.circularVelocity,
    1e-9,
  );

  let maxRelativeEnergyDrift = 0;
  let maxRelativeAngularMomentumDrift = 0;

  for (let i = 1; i < sampleCount; i += 1) {
    const tPrev = (i - 1) * dt;
    const tNow = i === sampleCount - 1 ? duration : i * dt;
    vec = stepOrbitalRK4(params, tPrev, vec, tNow - tPrev);
    const state = evaluateOrbitalState(params, tNow, vec[0], vec[1], vec[2], vec[3]);
    samples.push(state);

    const eDrift = Math.abs(state.totalEnergy - initialState.totalEnergy) / energyScale;
    const hDrift =
      Math.abs(state.specificAngularMomentum - initialState.specificAngularMomentum) / hScale;
    if (eDrift > maxRelativeEnergyDrift) maxRelativeEnergyDrift = eDrift;
    if (hDrift > maxRelativeAngularMomentumDrift) maxRelativeAngularMomentumDrift = hDrift;
  }

  return {
    samples,
    elements,
    duration,
    maxRelativeEnergyDrift,
    maxRelativeAngularMomentumDrift,
  };
}

/**
 * Interpolates (or integrates on-demand) the orbital state at time `t` from a
 * precomputed `OrbitalTrajectoryResult` for zero-allocation 60 fps scrubbing.
 */
export function interpolateOrbitalStateAt(
  trajectory: OrbitalTrajectoryResult,
  params: OrbitalParams,
  t: number,
): OrbitalState {
  const { samples, duration } = trajectory;
  if (samples.length === 0) {
    const { x0, y0, vx0, vy0 } = initialCartesianState(params);
    return evaluateOrbitalState(params, 0, x0, y0, vx0, vy0);
  }
  const clampedT = clamp(t, 0, duration);
  if (clampedT <= 0) return samples[0];
  if (clampedT >= duration) return samples[samples.length - 1];

  const dt = duration / (samples.length - 1);
  const idx = Math.min(samples.length - 2, Math.max(0, Math.floor(clampedT / dt)));
  const s0 = samples[idx];
  const remainder = clampedT - s0.t;
  if (Math.abs(remainder) <= 1e-9) return s0;

  const stepped = stepOrbitalRK4(params, s0.t, [s0.x, s0.y, s0.vx, s0.vy], remainder);
  return evaluateOrbitalState(params, clampedT, stepped[0], stepped[1], stepped[2], stepped[3]);
}
