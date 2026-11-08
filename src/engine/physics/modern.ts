import { ELECTRON_VOLT, PLANCK_CONSTANT, SPEED_OF_LIGHT } from '../units/constants';

/** Photon energy from wavelength: E = h c / λ (J). */
export function photonEnergy(wavelengthM: number): number {
  if (!(wavelengthM > 0)) throw new RangeError('Wavelength must be positive');
  return (PLANCK_CONSTANT * SPEED_OF_LIGHT) / wavelengthM;
}

/**
 * Maximum kinetic energy of photoelectrons: K_max = h f − φ (eV).
 * Returns 0 below the threshold frequency (no emission).
 */
export function photoelectricMaxKineticEnergyEv(wavelengthM: number, workFunctionEv: number): number {
  const photonEv = photonEnergy(wavelengthM) / ELECTRON_VOLT;
  return Math.max(0, photonEv - workFunctionEv);
}

/** de Broglie wavelength: λ = h / (m v) (m). */
export function deBroglieWavelength(mass: number, speed: number): number {
  if (!(mass > 0) || !(speed > 0)) throw new RangeError('Mass and speed must be positive');
  return PLANCK_CONSTANT / (mass * speed);
}

/** Decay constant from half-life: λ = ln 2 / t½. */
export function decayConstant(halfLife: number): number {
  if (!(halfLife > 0)) throw new RangeError('Half-life must be positive');
  return Math.LN2 / halfLife;
}

/** Remaining nuclei after time t: N(t) = N₀ e^(−λt). */
export function remainingNuclei(initial: number, halfLife: number, t: number): number {
  return initial * Math.exp(-decayConstant(halfLife) * t);
}

/** Bohr-model energy level of hydrogen: Eₙ = −13.6057 eV / n². */
export const HYDROGEN_GROUND_STATE_EV = 13.605_693_122_99;

export function hydrogenEnergyLevelEv(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
  return -HYDROGEN_GROUND_STATE_EV / (n * n);
}
