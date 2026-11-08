/**
 * Physical constants in SI units.
 *
 * Values follow the CODATA 2022 recommended values. Constants marked "exact"
 * are defined exactly by the 2019 redefinition of the SI base units.
 */

/** Speed of light in vacuum, c (m/s) — exact. */
export const SPEED_OF_LIGHT = 299_792_458;

/** Planck constant, h (J·s) — exact. */
export const PLANCK_CONSTANT = 6.626_070_15e-34;

/** Reduced Planck constant, ħ = h / 2π (J·s). */
export const REDUCED_PLANCK_CONSTANT = PLANCK_CONSTANT / (2 * Math.PI);

/** Elementary charge, e (C) — exact. */
export const ELEMENTARY_CHARGE = 1.602_176_634e-19;

/** Boltzmann constant, k_B (J/K) — exact. */
export const BOLTZMANN_CONSTANT = 1.380_649e-23;

/** Avogadro constant, N_A (1/mol) — exact. */
export const AVOGADRO_CONSTANT = 6.022_140_76e23;

/** Molar gas constant, R = N_A · k_B (J/(mol·K)) — exact. */
export const GAS_CONSTANT = AVOGADRO_CONSTANT * BOLTZMANN_CONSTANT;

/** Standard acceleration of gravity, g_n (m/s²) — exact by definition. */
export const STANDARD_GRAVITY = 9.806_65;

/** Newtonian constant of gravitation, G (m³/(kg·s²)). */
export const GRAVITATIONAL_CONSTANT = 6.674_30e-11;

/** Vacuum electric permittivity, ε₀ (F/m). */
export const VACUUM_PERMITTIVITY = 8.854_187_818_8e-12;

/** Vacuum magnetic permeability, μ₀ (N/A²). */
export const VACUUM_PERMEABILITY = 1.256_637_061_27e-6;

/** Coulomb constant, k = 1 / (4πε₀) (N·m²/C²). */
export const COULOMB_CONSTANT = 1 / (4 * Math.PI * VACUUM_PERMITTIVITY);

/** Electron rest mass, m_e (kg). */
export const ELECTRON_MASS = 9.109_383_713_9e-31;

/** Proton rest mass, m_p (kg). */
export const PROTON_MASS = 1.672_621_925_95e-27;

/** One electronvolt expressed in joules (J) — exact. */
export const ELECTRON_VOLT = ELEMENTARY_CHARGE;

/** Absolute zero offset between kelvin and degrees Celsius. */
export const CELSIUS_OFFSET = 273.15;

export interface GravityPreset {
  id: string;
  label: string;
  /** Surface gravitational acceleration (m/s²). */
  value: number;
  /** Whether the value is a defined constant or an approximate mean. */
  exact: boolean;
}

/**
 * Mean surface gravity of selected bodies. Except for the standard value,
 * these are approximate equatorial/mean values suitable for teaching.
 */
export const GRAVITY_PRESETS: readonly GravityPreset[] = [
  { id: 'earth', label: 'Earth (standard)', value: STANDARD_GRAVITY, exact: true },
  { id: 'moon', label: 'Moon', value: 1.62, exact: false },
  { id: 'mars', label: 'Mars', value: 3.71, exact: false },
  { id: 'jupiter', label: 'Jupiter', value: 24.79, exact: false },
] as const;
