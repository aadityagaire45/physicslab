import { degToRad, radToDeg } from '../units/conversions';

/**
 * Physical parameters for a block on an inclined plane with static and kinetic
 * Coulomb friction.
 *
 * Coordinate convention along the incline:
 *   - s = 0 is the initial position of the block on the slope.
 *   - Positive s (+s) points DOWNWARD along the incline (in the direction of
 *     the parallel gravitational component F_g = m g sin(θ) ≥ 0).
 *   - Therefore:
 *       v > 0  ⇒ sliding downward along the plane
 *       v < 0  ⇒ sliding upward along the plane
 *       v = 0  ⇒ stationary (or at an instantaneous turnaround point)
 */
export interface InclinedPlaneParams {
  /** Block mass m (kg), > 0. */
  mass: number;
  /** Inclination angle θ above horizontal (degrees), in [0, 60]. */
  angleDeg: number;
  /** Coefficient of static friction μ_s (dimensionless), ≥ 0. */
  staticFriction: number;
  /** Coefficient of kinetic friction μ_k (dimensionless), 0 ≤ μ_k ≤ μ_s. */
  kineticFriction: number;
  /** Gravitational field strength g (m/s²), > 0. */
  gravity: number;
  /** Initial velocity v₀ along the plane (m/s): positive downward, negative upward. */
  initialVelocity?: number;
}

export type InclineMotionRegime =
  | 'stationary'
  | 'limiting-equilibrium'
  | 'sliding-down'
  | 'sliding-up';

export type FrictionMode = 'none' | 'static' | 'kinetic';

export interface InclinedPlaneState {
  /** Simulation time t (s). */
  t: number;
  /** Displacement s(t) along the incline from start (m, positive downward). */
  s: number;
  /** Velocity v(t) = ds/dt along the incline (m/s, positive downward). */
  v: number;
  /** Acceleration a(t) = d²s/dt² along the incline (m/s², positive downward). */
  a: number;
  /** Weight magnitude W = m g (N). */
  weight: number;
  /** Normal reaction magnitude N = m g cos(θ) (N). */
  normalForce: number;
  /** Component of gravity parallel to the plane F_g = m g sin(θ) (N, downward). */
  gravityParallel: number;
  /** Component of gravity perpendicular to the plane F_⊥ = m g cos(θ) (N). */
  gravityPerpendicular: number;
  /** Maximum static friction threshold f_s(max) = μ_s N (N). */
  maxStaticFriction: number;
  /** Kinetic friction magnitude f_k = μ_k N (N). */
  kineticFrictionForce: number;
  /** Active friction force magnitude |f| acting on the block at time t (N). */
  frictionMagnitude: number;
  /**
   * Signed friction force F_f along the +s (downhill) axis (N):
   *   - Negative (−) when friction points uphill (opposing downhill pull or downhill motion).
   *   - Positive (+) when friction points downhill (opposing uphill motion, v < 0).
   */
  frictionSigned: number;
  /** Direction of the friction force along the slope. */
  frictionDirection: 'uphill' | 'downhill' | 'none';
  /** Active friction type at time t. */
  frictionMode: FrictionMode;
  /** Net force along the +s (downhill) axis: F_net = F_g + F_f = m a (N). */
  netForce: number;
  /** Instantaneous motion state. */
  motionRegime: InclineMotionRegime;
  /** Translational kinetic energy K = ½ m v² (J). */
  kineticEnergy: number;
  /** Change in gravitational potential energy ΔU = −m g s sin(θ) relative to s = 0 (J). */
  potentialEnergyChange: number;
  /** Cumulative thermal energy dissipated by kinetic friction E_th = ∫ f_k |v| dt (J). */
  thermalEnergy: number;
}

export interface InclinedPlaneSummary {
  /** Weight W = m g (N). */
  weight: number;
  /** Normal reaction N = m g cos(θ) (N). */
  normalForce: number;
  /** Parallel gravitational component F_g = m g sin(θ) (N). */
  gravityParallel: number;
  /** Perpendicular gravitational component F_⊥ = m g cos(θ) (N). */
  gravityPerpendicular: number;
  /** Maximum static friction threshold f_s(max) = μ_s m g cos(θ) (N). */
  maxStaticFriction: number;
  /** Kinetic friction magnitude f_k = μ_k m g cos(θ) (N). */
  kineticFrictionForce: number;
  /** Critical angle for impending motion θ_c = arctan(μ_s) (degrees). */
  criticalAngleDeg: number;
  /** Whether the block remains at rest when released from rest (F_g ≤ f_s(max)). */
  holdsAtRest: boolean;
  /** Initial state at t = 0+. */
  initialState: InclinedPlaneState;
  /** Time at which an initially moving block stops or reverses, if any (s). */
  transitionTime: number | null;
}

export function validateInclinedPlaneParams(params: InclinedPlaneParams): void {
  const { mass, angleDeg, staticFriction, kineticFriction, gravity, initialVelocity = 0 } = params;
  if (!Number.isFinite(mass) || !(mass > 0)) {
    throw new RangeError('Block mass m must be a finite positive number');
  }
  if (!Number.isFinite(angleDeg) || angleDeg < 0 || angleDeg > 60) {
    throw new RangeError('Inclination angle θ must be in [0°, 60°]');
  }
  if (!Number.isFinite(staticFriction) || staticFriction < 0) {
    throw new RangeError('Static friction coefficient μ_s must be non-negative');
  }
  if (!Number.isFinite(kineticFriction) || kineticFriction < 0) {
    throw new RangeError('Kinetic friction coefficient μ_k must be non-negative');
  }
  if (kineticFriction - staticFriction > 1e-9) {
    throw new RangeError('Static friction coefficient μ_s must be greater than or equal to kinetic friction μ_k');
  }
  if (!Number.isFinite(gravity) || !(gravity > 0)) {
    throw new RangeError('Gravity g must be a finite positive number');
  }
  if (!Number.isFinite(initialVelocity)) {
    throw new RangeError('Initial velocity v₀ must be a finite number');
  }
}

/** Critical angle of repose θ_c = arctan(μ_s) in degrees. */
export function criticalInclineAngleDeg(staticFriction: number): number {
  if (!Number.isFinite(staticFriction) || staticFriction < 0) {
    throw new RangeError('Static friction coefficient μ_s must be non-negative');
  }
  return radToDeg(Math.atan(staticFriction));
}

function cleanZero(val: number): number {
  return Math.abs(val) < 1e-12 ? 0 : val;
}

/**
 * Evaluates the exact analytical state of the block on the inclined plane at
 * time `t ≥ 0`, handling:
 *   1. Initially stationary block (v₀ = 0):
 *      - Remains at rest if m g sin(θ) ≤ μ_s m g cos(θ), with static friction
 *        f_s = m g sin(θ) uphill and zero kinetic friction.
 *      - Accelerates downhill with a = g (sin(θ) − μ_k cos(θ)) if m g sin(θ) > μ_s m g cos(θ).
 *   2. Initially moving downhill (v₀ > 0):
 *      - Kinetic friction acts uphill: a = g (sin(θ) − μ_k cos(θ)).
 *      - If a < 0 (gentle slope with high μ_k), decelerates to rest at t_stop = −v₀ / a
 *        and remains permanently at rest thereafter (since μ_s ≥ μ_k > tan(θ)).
 *   3. Initially moving uphill (v₀ < 0):
 *      - Kinetic friction acts downhill alongside F_g: a_up = g (sin(θ) + μ_k cos(θ)) ≥ 0.
 *      - If a_up > 0, reaches turnaround (v = 0) at t_turn = −v₀ / a_up, then either
 *        sticks at rest (if m g sin(θ) ≤ f_s(max)) or slides back downhill for t > t_turn.
 */
export function inclinedPlaneStateAt(params: InclinedPlaneParams, t: number): InclinedPlaneState {
  validateInclinedPlaneParams(params);
  if (!Number.isFinite(t) || t < 0) {
    throw new RangeError('Time t must be a finite non-negative number');
  }

  const { mass: m, angleDeg, staticFriction: muS, kineticFriction: muK, gravity: g } = params;
  const v0 = params.initialVelocity ?? 0;
  const theta = degToRad(angleDeg);
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  const weight = m * g;
  const normalForce = weight * cosT;
  const gravityParallel = weight * sinT;
  const gravityPerpendicular = normalForce;
  const maxStaticFriction = muS * normalForce;
  const kineticFrictionForce = muK * normalForce;

  const holdsAtRest = gravityParallel <= maxStaticFriction + 1e-9 * weight;
  const isLimitingAtRest =
    holdsAtRest && angleDeg > 0 && Math.abs(gravityParallel - maxStaticFriction) <= 1e-5 * weight;

  const aDown = cleanZero(g * (sinT - muK * cosT));
  const aUp = cleanZero(g * (sinT + muK * cosT));

  let s = 0;
  let v = 0;
  let a = 0;
  let pathLength = 0;
  let motionRegime: InclineMotionRegime = 'stationary';
  let frictionMode: FrictionMode = 'static';
  let frictionSigned = 0;

  if (Math.abs(v0) < 1e-12) {
    // Released from rest (v₀ = 0)
    if (holdsAtRest) {
      s = 0;
      v = 0;
      a = 0;
      pathLength = 0;
      motionRegime = isLimitingAtRest ? 'limiting-equilibrium' : 'stationary';
      frictionSigned = cleanZero(-gravityParallel);
      frictionMode = Math.abs(frictionSigned) > 0 ? 'static' : 'none';
    } else {
      a = aDown;
      v = a * t;
      s = 0.5 * a * t * t;
      pathLength = s;
      motionRegime = 'sliding-down';
      frictionSigned = cleanZero(-kineticFrictionForce);
      frictionMode = kineticFrictionForce > 0 ? 'kinetic' : 'none';
    }
  } else if (v0 > 0) {
    // Launched downhill (v₀ > 0)
    if (aDown < 0) {
      const tStop = -v0 / aDown;
      if (t < tStop) {
        a = aDown;
        v = v0 + a * t;
        s = v0 * t + 0.5 * a * t * t;
        pathLength = s;
        motionRegime = 'sliding-down';
        frictionSigned = cleanZero(-kineticFrictionForce);
        frictionMode = kineticFrictionForce > 0 ? 'kinetic' : 'none';
      } else {
        s = v0 * tStop + 0.5 * aDown * tStop * tStop;
        v = 0;
        a = 0;
        pathLength = s;
        motionRegime = isLimitingAtRest ? 'limiting-equilibrium' : 'stationary';
        frictionSigned = cleanZero(-gravityParallel);
        frictionMode = Math.abs(frictionSigned) > 0 ? 'static' : 'none';
      }
    } else {
      a = aDown;
      v = v0 + a * t;
      s = v0 * t + 0.5 * a * t * t;
      pathLength = s;
      motionRegime = 'sliding-down';
      frictionSigned = cleanZero(-kineticFrictionForce);
      frictionMode = kineticFrictionForce > 0 ? 'kinetic' : 'none';
    }
  } else {
    // Launched uphill (v₀ < 0)
    if (aUp <= 0) {
      // Frictionless horizontal surface (θ = 0, μ_k = 0) moving at constant v₀ < 0
      a = 0;
      v = v0;
      s = v0 * t;
      pathLength = Math.abs(s);
      motionRegime = 'sliding-up';
      frictionSigned = 0;
      frictionMode = 'none';
    } else {
      const tTurn = -v0 / aUp;
      const sTurn = v0 * tTurn + 0.5 * aUp * tTurn * tTurn; // negative (uphill)
      if (t < tTurn) {
        a = aUp;
        v = v0 + aUp * t;
        s = v0 * t + 0.5 * aUp * t * t;
        pathLength = Math.abs(s);
        motionRegime = 'sliding-up';
        // Opposes uphill motion -> points downhill (+s)
        frictionSigned = cleanZero(kineticFrictionForce);
        frictionMode = kineticFrictionForce > 0 ? 'kinetic' : 'none';
      } else if (holdsAtRest) {
        // Stops and sticks at the highest point sTurn
        s = sTurn;
        v = 0;
        a = 0;
        pathLength = Math.abs(sTurn);
        motionRegime = isLimitingAtRest ? 'limiting-equilibrium' : 'stationary';
        frictionSigned = cleanZero(-gravityParallel);
        frictionMode = Math.abs(frictionSigned) > 0 ? 'static' : 'none';
      } else {
        // Reverses at tTurn and slides back downhill with acceleration aDown > 0
        const dtAfter = t - tTurn;
        a = aDown;
        v = aDown * dtAfter;
        const downDist = 0.5 * aDown * dtAfter * dtAfter;
        s = sTurn + downDist;
        pathLength = Math.abs(sTurn) + downDist;
        motionRegime = dtAfter === 0 ? 'stationary' : 'sliding-down';
        frictionSigned = cleanZero(-kineticFrictionForce);
        frictionMode = kineticFrictionForce > 0 ? 'kinetic' : 'none';
      }
    }
  }

  const frictionMagnitude = Math.abs(frictionSigned);
  const frictionDirection: 'uphill' | 'downhill' | 'none' =
    frictionSigned < -1e-12 ? 'uphill' : frictionSigned > 1e-12 ? 'downhill' : 'none';
  const netForce = cleanZero(gravityParallel + frictionSigned);

  const kineticEnergy = 0.5 * m * v * v;
  const potentialEnergyChange = cleanZero(-m * g * s * sinT);
  const thermalEnergy = kineticFrictionForce * pathLength;

  return {
    t,
    s: cleanZero(s),
    v: cleanZero(v),
    a: cleanZero(a),
    weight,
    normalForce,
    gravityParallel,
    gravityPerpendicular,
    maxStaticFriction,
    kineticFrictionForce,
    frictionMagnitude,
    frictionSigned,
    frictionDirection,
    frictionMode,
    netForce,
    motionRegime,
    kineticEnergy,
    potentialEnergyChange,
    thermalEnergy,
  };
}

/** Samples the inclined-plane trajectory over [0, duration] into `sampleCount` states. */
export function simulateInclinedPlaneTrajectory(
  params: InclinedPlaneParams,
  duration: number,
  sampleCount = 201,
): InclinedPlaneState[] {
  validateInclinedPlaneParams(params);
  if (!Number.isFinite(duration) || !(duration >= 0)) {
    throw new RangeError('Simulation duration must be a finite non-negative number');
  }
  if (sampleCount < 2) {
    throw new RangeError('sampleCount must be at least 2');
  }
  return Array.from({ length: sampleCount }, (_, i) =>
    inclinedPlaneStateAt(params, (duration * i) / (sampleCount - 1)),
  );
}

/** Computes summary force decomposition, critical angle, and stopping/turnaround times. */
export function inclinedPlaneSummary(params: InclinedPlaneParams): InclinedPlaneSummary {
  validateInclinedPlaneParams(params);
  const initialState = inclinedPlaneStateAt(params, 0);
  const criticalAngleDeg = criticalInclineAngleDeg(params.staticFriction);
  const holdsAtRest =
    initialState.gravityParallel <= initialState.maxStaticFriction + 1e-9 * initialState.weight;

  const v0 = params.initialVelocity ?? 0;
  const theta = degToRad(params.angleDeg);
  const aDown = params.gravity * (Math.sin(theta) - params.kineticFriction * Math.cos(theta));
  const aUp = params.gravity * (Math.sin(theta) + params.kineticFriction * Math.cos(theta));

  let transitionTime: number | null = null;
  if (v0 > 0 && aDown < -1e-12) {
    transitionTime = -v0 / aDown;
  } else if (v0 < 0 && aUp > 1e-12) {
    transitionTime = -v0 / aUp;
  }

  return {
    weight: initialState.weight,
    normalForce: initialState.normalForce,
    gravityParallel: initialState.gravityParallel,
    gravityPerpendicular: initialState.gravityPerpendicular,
    maxStaticFriction: initialState.maxStaticFriction,
    kineticFrictionForce: initialState.kineticFrictionForce,
    criticalAngleDeg,
    holdsAtRest,
    initialState,
    transitionTime,
  };
}

/**
 * Physical parameters for a one-dimensional two-body collision along a
 * horizontal frictionless track.
 *
 * Track geometry convention:
 *   - Object 1 begins to the left of Object 2 (x₁(0) < x₂(0)), separated by
 *     initial contact gap `initialSeparation` (default 4.0 m, with x₁(0) = −2 m
 *     and x₂(0) = +2 m).
 *   - Positive velocity (+x) points to the right; negative velocity (−x) points
 *     to the left.
 *   - A collision occurs if and only if u₁ > u₂ (closing speed u₁ − u₂ > 0).
 */
export interface CollisionParams {
  /** Mass of object 1 m₁ (kg), > 0. */
  m1: number;
  /** Mass of object 2 m₂ (kg), > 0. */
  m2: number;
  /** Initial velocity of object 1 u₁ (m/s). */
  u1: number;
  /** Initial velocity of object 2 u₂ (m/s). */
  u2: number;
  /** Coefficient of restitution e, in [0, 1] (or > 1 for superelastic). */
  restitution: number;
  /** Initial bumper-to-bumper separation Δx₀ = x₂(0) − x₁(0) (m), > 0. Default 4.0 m. */
  initialSeparation?: number;
}

export type CollisionClassification =
  | 'perfectly-elastic'
  | 'partially-inelastic'
  | 'perfectly-inelastic'
  | 'superelastic';

export interface CollisionOutcome {
  /** Mass m₁ (kg). */
  m1: number;
  /** Mass m₂ (kg). */
  m2: number;
  /** Pre-collision velocity u₁ (m/s). */
  u1: number;
  /** Pre-collision velocity u₂ (m/s). */
  u2: number;
  /** Post-collision velocity v₁ (m/s). */
  v1: number;
  /** Post-collision velocity v₂ (m/s). */
  v2: number;
  /** Coefficient of restitution e. */
  restitution: number;
  /** Realized restitution ratio (v₂ − v₁) / (u₁ − u₂), or null when u₁ ≤ u₂. */
  realizedRestitution: number | null;
  /** Collision classification based on e. */
  classification: CollisionClassification;
  /** Whether object 1 (left) catches up to and collides with object 2 (right) (u₁ > u₂). */
  willCollide: boolean;
  /** Time of impact t_c = Δx₀ / (u₁ − u₂) (s), or null if willCollide is false. */
  collisionTime: number | null;
  /** Position of contact face at impact x_c (m), or null if willCollide is false. */
  collisionPosition: number | null;
  /** Initial momentum of object 1 p₁ᵢ = m₁ u₁ (kg·m/s). */
  p1Initial: number;
  /** Initial momentum of object 2 p₂ᵢ = m₂ u₂ (kg·m/s). */
  p2Initial: number;
  /** Total initial momentum Pᵢ = m₁ u₁ + m₂ u₂ (kg·m/s). */
  initialMomentum: number;
  /** Final momentum of object 1 p₁_f = m₁ v₁ (kg·m/s). */
  p1Final: number;
  /** Final momentum of object 2 p₂_f = m₂ v₂ (kg·m/s). */
  p2Final: number;
  /** Total final momentum P_f = m₁ v₁ + m₂ v₂ (kg·m/s). */
  finalMomentum: number;
  /** Total momentum difference P_f − Pᵢ (kg·m/s), theoretically 0. */
  momentumDifference: number;
  /** Magnitude of impulse J transferred between objects during collision (N·s). */
  impulseMagnitude: number;
  /** Center-of-mass velocity v_cm = (m₁ u₁ + m₂ u₂) / (m₁ + m₂) (m/s). */
  centerOfMassVelocity: number;
  /** Initial kinetic energy of object 1 K₁ᵢ = ½ m₁ u₁² (J). */
  k1Initial: number;
  /** Initial kinetic energy of object 2 K₂ᵢ = ½ m₂ u₂² (J). */
  k2Initial: number;
  /** Total initial kinetic energy Kᵢ = K₁ᵢ + K₂ᵢ (J). */
  initialKineticEnergy: number;
  /** Final kinetic energy of object 1 K₁_f = ½ m₁ v₁² (J). */
  k1Final: number;
  /** Final kinetic energy of object 2 K₂_f = ½ m₂ v₂² (J). */
  k2Final: number;
  /** Total final kinetic energy K_f = K₁_f + K₂_f (J). */
  finalKineticEnergy: number;
  /** Kinetic energy dissipated during collision ΔK_lost = Kᵢ − K_f (J). */
  kineticEnergyLost: number;
  /** Percentage of initial kinetic energy dissipated (%). */
  kineticEnergyLostPercent: number;
}

export interface CollisionTrackState {
  /** Simulation time t (s). */
  t: number;
  /** Phase of the collision at time t. */
  phase: 'pre-collision' | 'impact' | 'post-collision' | 'no-collision';
  /** Contact-face position of object 1 x₁(t) (m). */
  x1: number;
  /** Contact-face position of object 2 x₂(t) (m). */
  x2: number;
  /** Instantaneous velocity of object 1 v₁(t) (m/s). */
  v1: number;
  /** Instantaneous velocity of object 2 v₂(t) (m/s). */
  v2: number;
  /** Instantaneous center-of-mass position x_cm(t) (m). */
  xCm: number;
  /** Instantaneous momentum of object 1 (kg·m/s). */
  p1: number;
  /** Instantaneous momentum of object 2 (kg·m/s). */
  p2: number;
  /** Instantaneous total momentum P = p₁ + p₂ (kg·m/s). */
  totalMomentum: number;
  /** Instantaneous kinetic energy of object 1 (J). */
  k1: number;
  /** Instantaneous kinetic energy of object 2 (J). */
  k2: number;
  /** Instantaneous total kinetic energy K = K₁ + K₂ (J). */
  totalKineticEnergy: number;
}

export function validateCollisionParams(params: CollisionParams): void {
  const { m1, m2, u1, u2, restitution, initialSeparation = 4.0 } = params;
  if (!Number.isFinite(m1) || !(m1 > 0)) {
    throw new RangeError('Mass m₁ must be a finite positive number');
  }
  if (!Number.isFinite(m2) || !(m2 > 0)) {
    throw new RangeError('Mass m₂ must be a finite positive number');
  }
  if (!Number.isFinite(u1) || !Number.isFinite(u2)) {
    throw new RangeError('Initial velocities u₁ and u₂ must be finite numbers');
  }
  if (!Number.isFinite(restitution) || restitution < 0 || restitution > 1.5) {
    throw new RangeError('Coefficient of restitution e must be in [0, 1.5]');
  }
  if (!Number.isFinite(initialSeparation) || !(initialSeparation > 0)) {
    throw new RangeError('Initial separation must be a finite positive number');
  }
}

export function classifyCollision(restitution: number): CollisionClassification {
  if (!Number.isFinite(restitution) || restitution < 0) {
    throw new RangeError('Coefficient of restitution e must be non-negative');
  }
  if (Math.abs(restitution) < 1e-9) return 'perfectly-inelastic';
  if (Math.abs(restitution - 1) < 1e-9) return 'perfectly-elastic';
  return restitution < 1 ? 'partially-inelastic' : 'superelastic';
}

/**
 * Computes the complete analytical solution of a 1D two-body collision:
 *   v₁ = [m₁ u₁ + m₂ u₂ − m₂ e (u₁ − u₂)] / (m₁ + m₂)
 *   v₂ = [m₁ u₁ + m₂ u₂ + m₁ e (u₁ − u₂)] / (m₁ + m₂)
 * Safely handles equal initial velocities (u₁ = u₂) and non-colliding setups (u₁ ≤ u₂).
 */
export function solveOneDimensionalCollision(params: CollisionParams): CollisionOutcome {
  validateCollisionParams(params);
  const { m1, m2, u1, u2, restitution: e } = params;
  const separation = params.initialSeparation ?? 4.0;
  const totalMass = m1 + m2;
  const classification = classifyCollision(e);

  const p1Initial = cleanZero(m1 * u1);
  const p2Initial = cleanZero(m2 * u2);
  const initialMomentum = cleanZero(p1Initial + p2Initial);
  const centerOfMassVelocity = cleanZero(initialMomentum / totalMass);

  const closingSpeed = u1 - u2;
  const willCollide = closingSpeed > 1e-9;

  let v1 = u1;
  let v2 = u2;
  let collisionTime: number | null = null;
  let collisionPosition: number | null = null;
  let realizedRestitution: number | null = null;

  if (willCollide) {
    v1 = cleanZero((m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / totalMass);
    v2 = cleanZero((m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / totalMass);
    // Guarantee exact shared velocity when perfectly inelastic (e = 0)
    if (classification === 'perfectly-inelastic') {
      v1 = centerOfMassVelocity;
      v2 = centerOfMassVelocity;
    }
    const x10 = -separation / 2;
    collisionTime = separation / closingSpeed;
    collisionPosition = cleanZero(x10 + u1 * collisionTime);
    realizedRestitution = cleanZero((v2 - v1) / closingSpeed);
  }

  const p1Final = cleanZero(m1 * v1);
  const p2Final = cleanZero(m2 * v2);
  const finalMomentum = cleanZero(p1Final + p2Final);
  const momentumDifference = cleanZero(finalMomentum - initialMomentum);
  const impulseMagnitude = willCollide ? Math.abs(m2 * (v2 - u2)) : 0;

  const k1Initial = 0.5 * m1 * u1 * u1;
  const k2Initial = 0.5 * m2 * u2 * u2;
  const initialKineticEnergy = k1Initial + k2Initial;

  const k1Final = 0.5 * m1 * v1 * v1;
  const k2Final = 0.5 * m2 * v2 * v2;
  const finalKineticEnergy = k1Final + k2Final;

  const kineticEnergyLost = cleanZero(initialKineticEnergy - finalKineticEnergy);
  const kineticEnergyLostPercent =
    initialKineticEnergy > 1e-12
      ? cleanZero((kineticEnergyLost / initialKineticEnergy) * 100)
      : 0;

  return {
    m1,
    m2,
    u1,
    u2,
    v1,
    v2,
    restitution: e,
    realizedRestitution,
    classification,
    willCollide,
    collisionTime,
    collisionPosition,
    p1Initial,
    p2Initial,
    initialMomentum,
    p1Final,
    p2Final,
    finalMomentum,
    momentumDifference,
    impulseMagnitude,
    centerOfMassVelocity,
    k1Initial,
    k2Initial,
    initialKineticEnergy,
    k1Final,
    k2Final,
    finalKineticEnergy,
    kineticEnergyLost,
    kineticEnergyLostPercent,
  };
}

/** Evaluates the instantaneous track state of both objects at time `t ≥ 0`. */
export function collisionTrackStateAt(params: CollisionParams, t: number): CollisionTrackState {
  validateCollisionParams(params);
  if (!Number.isFinite(t) || t < 0) {
    throw new RangeError('Time t must be a finite non-negative number');
  }

  const outcome = solveOneDimensionalCollision(params);
  const separation = params.initialSeparation ?? 4.0;
  const x10 = -separation / 2;
  const x20 = separation / 2;

  let x1 = 0;
  let x2 = 0;
  let v1 = outcome.u1;
  let v2 = outcome.u2;
  let phase: CollisionTrackState['phase'] = 'no-collision';

  if (!outcome.willCollide || outcome.collisionTime === null || outcome.collisionPosition === null) {
    x1 = x10 + outcome.u1 * t;
    x2 = x20 + outcome.u2 * t;
    v1 = outcome.u1;
    v2 = outcome.u2;
    phase = 'no-collision';
  } else if (t < outcome.collisionTime - 1e-9) {
    x1 = x10 + outcome.u1 * t;
    x2 = x20 + outcome.u2 * t;
    v1 = outcome.u1;
    v2 = outcome.u2;
    phase = 'pre-collision';
  } else {
    const dtAfter = Math.max(0, t - outcome.collisionTime);
    x1 = outcome.collisionPosition + outcome.v1 * dtAfter;
    x2 = outcome.collisionPosition + outcome.v2 * dtAfter;
    v1 = outcome.v1;
    v2 = outcome.v2;
    phase = dtAfter < 1e-3 ? 'impact' : 'post-collision';
  }

  const xCm = (params.m1 * x1 + params.m2 * x2) / (params.m1 + params.m2);
  const p1 = cleanZero(params.m1 * v1);
  const p2 = cleanZero(params.m2 * v2);
  const totalMomentum = cleanZero(p1 + p2);
  const k1 = 0.5 * params.m1 * v1 * v1;
  const k2 = 0.5 * params.m2 * v2 * v2;
  const totalKineticEnergy = k1 + k2;

  return {
    t,
    phase,
    x1: cleanZero(x1),
    x2: cleanZero(x2),
    v1: cleanZero(v1),
    v2: cleanZero(v2),
    xCm: cleanZero(xCm),
    p1,
    p2,
    totalMomentum,
    k1,
    k2,
    totalKineticEnergy,
  };
}

/** Samples the 1D collision trajectory over [0, duration] into `sampleCount` states, including the exact impact instant. */
export function simulateCollisionTrajectory(
  params: CollisionParams,
  duration: number,
  sampleCount = 201,
): CollisionTrackState[] {
  validateCollisionParams(params);
  if (!Number.isFinite(duration) || !(duration >= 0)) {
    throw new RangeError('Simulation duration must be a finite non-negative number');
  }
  if (sampleCount < 2) {
    throw new RangeError('sampleCount must be at least 2');
  }

  return Array.from({ length: sampleCount }, (_, i) =>
    collisionTrackStateAt(params, (duration * i) / (sampleCount - 1)),
  );
}

