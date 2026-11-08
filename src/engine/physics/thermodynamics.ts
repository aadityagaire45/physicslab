import { GAS_CONSTANT } from '../units/constants';

/** Ideal gas pressure: P = n R T / V (Pa). */
export function idealGasPressure(moles: number, temperatureK: number, volumeM3: number): number {
  if (!(volumeM3 > 0)) throw new RangeError('Volume must be positive');
  if (!(temperatureK >= 0)) throw new RangeError('Temperature must be non-negative in kelvin');
  return (moles * GAS_CONSTANT * temperatureK) / volumeM3;
}

/** Sensible heat: Q = m c ΔT (J). */
export const sensibleHeat = (mass: number, specificHeat: number, deltaT: number): number =>
  mass * specificHeat * deltaT;

/** Carnot efficiency between reservoirs: η = 1 − T_c / T_h. */
export function carnotEfficiency(coldK: number, hotK: number): number {
  if (!(hotK > 0) || !(coldK >= 0) || coldK > hotK) throw new RangeError('Require 0 ≤ T_c ≤ T_h, T_h > 0');
  return 1 - coldK / hotK;
}
