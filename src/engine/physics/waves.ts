/** Wave speed from frequency and wavelength: v = f λ. */
export const waveSpeed = (frequency: number, wavelength: number): number => frequency * wavelength;

/** Speed of a transverse wave on a string: v = √(T / μ). */
export function stringWaveSpeed(tension: number, linearDensity: number): number {
  if (!(tension > 0) || !(linearDensity > 0)) throw new RangeError('Tension and linear density must be positive');
  return Math.sqrt(tension / linearDensity);
}

export interface TravellingWaveParams {
  /** Amplitude (m). */
  amplitude: number;
  /** Wavelength (m), > 0. */
  wavelength: number;
  /** Frequency (Hz), ≥ 0. */
  frequency: number;
  /** Phase constant (rad). */
  phase?: number;
}

/** Sinusoidal wave travelling in +x: y(x, t) = A sin(kx − ωt + φ). */
export function travellingWave(params: TravellingWaveParams, x: number, t: number): number {
  if (!(params.wavelength > 0)) throw new RangeError('Wavelength must be positive');
  if (!(params.frequency >= 0)) throw new RangeError('Frequency must be non-negative');
  const k = (2 * Math.PI) / params.wavelength;
  const omega = 2 * Math.PI * params.frequency;
  return params.amplitude * Math.sin(k * x - omega * t + (params.phase ?? 0));
}

/** Frequency of the n-th harmonic of a string fixed at both ends: fₙ = n v / (2L). */
export function stringHarmonicFrequency(harmonic: number, speed: number, length: number): number {
  if (!Number.isInteger(harmonic) || harmonic < 1) throw new RangeError('Harmonic must be a positive integer');
  return (harmonic * speed) / (2 * length);
}
