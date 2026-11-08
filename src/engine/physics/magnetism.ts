import { VACUUM_PERMEABILITY } from '../units/constants';

/** Magnetic flux density at distance r from a long straight wire: B = μ₀ I / (2π r). */
export function straightWireField(current: number, distance: number): number {
  if (!(distance > 0)) throw new RangeError('Distance must be positive');
  return (VACUUM_PERMEABILITY * current) / (2 * Math.PI * distance);
}

/** Magnitude of the magnetic Lorentz force: F = |q| v B sin θ. */
export function lorentzForceMagnitude(
  charge: number,
  speed: number,
  field: number,
  angleRad: number,
): number {
  return Math.abs(charge) * speed * field * Math.abs(Math.sin(angleRad));
}

/** Radius of circular motion of a charge moving perpendicular to B: r = m v / (|q| B). */
export function cyclotronRadius(mass: number, speed: number, charge: number, field: number): number {
  if (charge === 0 || field === 0) return Number.POSITIVE_INFINITY;
  return (mass * speed) / (Math.abs(charge) * Math.abs(field));
}

/** Field inside a long ideal solenoid: B = μ₀ n I, with n turns per metre. */
export const solenoidField = (turnsPerMetre: number, current: number): number =>
  VACUUM_PERMEABILITY * turnsPerMetre * current;
