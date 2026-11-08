import { degToRad } from '../units/conversions';

/**
 * Ideal projectile motion in a uniform gravitational field with no air
 * resistance. Coordinates: x horizontal, y vertical (up), origin at ground
 * level directly below the launch point.
 */
export interface ProjectileParams {
  /** Launch speed (m/s), ≥ 0. */
  speed: number;
  /** Launch angle above the horizontal (degrees), in [−90, 90]. */
  angleDeg: number;
  /** Launch height above the ground (m), ≥ 0. */
  height: number;
  /** Gravitational acceleration magnitude (m/s²), > 0. */
  gravity: number;
}

export interface ProjectileState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface ProjectileSummary {
  /** Time until the projectile returns to y = 0 (s). */
  timeOfFlight: number;
  /** Horizontal distance travelled at impact (m). */
  range: number;
  /** Greatest height above ground reached (m). */
  maxHeight: number;
  /** Time at which the maximum height is reached (s). */
  timeToApex: number;
  /** Speed at the moment of impact (m/s). */
  impactSpeed: number;
  /** Angle of the velocity below the horizontal at impact (degrees). */
  impactAngleDeg: number;
}

export function validateProjectileParams({ speed, angleDeg, height, gravity }: ProjectileParams): void {
  if (!(speed >= 0)) throw new RangeError('Launch speed must be non-negative');
  if (!(angleDeg >= -90 && angleDeg <= 90)) throw new RangeError('Launch angle must be in [−90°, 90°]');
  if (!(height >= 0)) throw new RangeError('Launch height must be non-negative');
  if (!(gravity > 0)) throw new RangeError('Gravity must be positive');
}

export function initialVelocity({ speed, angleDeg }: Pick<ProjectileParams, 'speed' | 'angleDeg'>) {
  const theta = degToRad(angleDeg);
  return { vx: speed * Math.cos(theta), vy: speed * Math.sin(theta) };
}

/**
 * Time of flight from launch until y = 0:
 *   T = (v_y + √(v_y² + 2 g h)) / g
 */
export function timeOfFlight(params: ProjectileParams): number {
  validateProjectileParams(params);
  const { vy } = initialVelocity(params);
  const { gravity: g, height: h } = params;
  return (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
}

/** Exact kinematic state at time t (s), clamped to the flight interval. */
export function projectileStateAt(params: ProjectileParams, t: number): ProjectileState {
  const { vx, vy } = initialVelocity(params);
  const time = Math.min(Math.max(t, 0), timeOfFlight(params));
  return {
    t: time,
    x: vx * time,
    y: Math.max(0, params.height + vy * time - 0.5 * params.gravity * time * time),
    vx,
    vy: vy - params.gravity * time,
  };
}

export function projectileSummary(params: ProjectileParams): ProjectileSummary {
  const T = timeOfFlight(params);
  const { vx, vy } = initialVelocity(params);
  const g = params.gravity;
  const timeToApex = vy > 0 ? vy / g : 0;
  const maxHeight = vy > 0 ? params.height + (vy * vy) / (2 * g) : params.height;
  const impactVy = vy - g * T;
  return {
    timeOfFlight: T,
    range: vx * T,
    maxHeight,
    timeToApex,
    impactSpeed: Math.hypot(vx, impactVy),
    impactAngleDeg: (Math.atan2(-impactVy, vx) * 180) / Math.PI,
  };
}

/** Samples the full trajectory at `samples` evenly spaced instants. */
export function sampleTrajectory(params: ProjectileParams, samples = 120): ProjectileState[] {
  const T = timeOfFlight(params);
  const count = Math.max(2, Math.floor(samples));
  return Array.from({ length: count }, (_, i) => projectileStateAt(params, (T * i) / (count - 1)));
}

/** Range on level ground (h = 0): R = v² sin(2θ) / g. */
export function levelGroundRange(speed: number, angleDeg: number, gravity: number): number {
  validateProjectileParams({ speed, angleDeg, height: 0, gravity });
  return (speed * speed * Math.sin(2 * degToRad(angleDeg))) / gravity;
}
