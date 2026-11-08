/** Ohm's law: I = V / R. */
export function ohmsLawCurrent(voltage: number, resistance: number): number {
  if (!(resistance > 0)) throw new RangeError('Resistance must be positive');
  return voltage / resistance;
}

/** Electrical power dissipated: P = V I. */
export const electricalPower = (voltage: number, current: number): number => voltage * current;

/** Equivalent resistance of resistors in series: R = Σ Rᵢ. */
export function seriesResistance(resistances: readonly number[]): number {
  return resistances.reduce((sum, r) => sum + r, 0);
}

/** Equivalent resistance of resistors in parallel: 1/R = Σ 1/Rᵢ. */
export function parallelResistance(resistances: readonly number[]): number {
  if (resistances.length === 0) throw new RangeError('At least one resistor is required');
  if (resistances.some((r) => !(r > 0))) throw new RangeError('Resistances must be positive');
  return 1 / resistances.reduce((sum, r) => sum + 1 / r, 0);
}

/** RC time constant τ = R C (s). */
export const rcTimeConstant = (resistance: number, capacitance: number): number =>
  resistance * capacitance;

/** Capacitor voltage while charging from 0 V through R: V_C = V₀ (1 − e^(−t/RC)). */
export function capacitorChargingVoltage(
  supplyVoltage: number,
  resistance: number,
  capacitance: number,
  t: number,
): number {
  const tau = rcTimeConstant(resistance, capacitance);
  if (!(tau > 0)) throw new RangeError('R and C must be positive');
  return supplyVoltage * (1 - Math.exp(-t / tau));
}

/** Capacitor voltage while discharging from V₀ through R: V_C = V₀ e^(−t/RC). */
export function capacitorDischargingVoltage(
  initialVoltage: number,
  resistance: number,
  capacitance: number,
  t: number,
): number {
  const tau = rcTimeConstant(resistance, capacitance);
  if (!(tau > 0)) throw new RangeError('R and C must be positive');
  return initialVoltage * Math.exp(-t / tau);
}
