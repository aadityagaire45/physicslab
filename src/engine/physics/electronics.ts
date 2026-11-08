import { BOLTZMANN_CONSTANT, ELEMENTARY_CHARGE } from '../units/constants';

/** Thermal voltage V_T = k_B T / q (V). ≈ 25.85 mV at 300 K. */
export const thermalVoltage = (temperatureK: number): number =>
  (BOLTZMANN_CONSTANT * temperatureK) / ELEMENTARY_CHARGE;

export interface DiodeParams {
  /** Reverse saturation current I_s (A), > 0. */
  saturationCurrent: number;
  /** Ideality factor n, typically 1–2. */
  idealityFactor: number;
  /** Junction temperature (K). */
  temperatureK: number;
}

/** Shockley diode equation: I = I_s (e^(V / (n V_T)) − 1). */
export function diodeCurrent(params: DiodeParams, voltage: number): number {
  const vt = thermalVoltage(params.temperatureK);
  return params.saturationCurrent * Math.expm1(voltage / (params.idealityFactor * vt));
}

/** Unloaded voltage divider output: V_out = V_in R₂ / (R₁ + R₂). */
export function voltageDividerOutput(inputVoltage: number, r1: number, r2: number): number {
  if (!(r1 >= 0) || !(r2 >= 0) || r1 + r2 === 0) throw new RangeError('Resistances must be non-negative and not both zero');
  return (inputVoltage * r2) / (r1 + r2);
}
