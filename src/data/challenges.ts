import { approxEqual } from '@/engine/mathematics/numeric';
import { createRandom, randomStep } from '@/engine/mathematics/random';
import { ohmsLawCurrent, parallelResistance } from '@/engine/physics/electricity';
import { voltageDividerOutput } from '@/engine/physics/electronics';
import { levelGroundRange } from '@/engine/physics/kinematics';
import { straightWireField } from '@/engine/physics/magnetism';
import { photoelectricMaxKineticEnergyEv } from '@/engine/physics/modern';
import { refractionAngle } from '@/engine/physics/optics';
import { pendulumPeriodSmallAngle } from '@/engine/physics/oscillations';
import { idealGasPressure } from '@/engine/physics/thermodynamics';
import { waveSpeed } from '@/engine/physics/waves';
import { STANDARD_GRAVITY } from '@/engine/units/constants';
import { degToRad, nanometresToMetres, radToDeg } from '@/engine/units/conversions';
import { formatNumber } from '@/engine/units/format';
import type { CategoryId } from '@/modules/types';

export interface ChallengeProblem {
  id: string;
  seed: number;
  category: CategoryId;
  title: string;
  prompt: string;
  equationLatex: string;
  answer: number;
  unit: string;
  hint: string;
  workedSolutionLatex: string;
}

type ProblemGenerator = (seed: number) => ChallengeProblem;

const tex = String.raw;

const GENERATORS: readonly ProblemGenerator[] = [
  (seed) => {
    const rng = createRandom(seed);
    const v0 = randomStep(rng, 12, 36, 2);
    const theta = randomStep(rng, 20, 70, 5);
    const answer = levelGroundRange(v0, theta, STANDARD_GRAVITY);
    return {
      id: `proj-${seed}`,
      seed,
      category: 'mechanics',
      title: 'Projectile Range on Level Ground',
      prompt: `A projectile is launched from level ground at v₀ = ${v0} m/s at θ = ${theta}° above the horizontal (take g = ${STANDARD_GRAVITY} m/s²). Calculate the horizontal range R.`,
      equationLatex: tex`R = \frac{v_0^2 \sin 2\theta}{g}`,
      answer,
      unit: 'm',
      hint: 'Double the launch angle before taking the sine, and keep your calculator in degree mode.',
      workedSolutionLatex: tex`R = \frac{${v0}^2 \sin(${2 * theta}^\circ)}{${STANDARD_GRAVITY}} = ${formatNumber(answer, 4)}\ \text{m}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const length = randomStep(rng, 0.4, 2.4, 0.2);
    const answer = pendulumPeriodSmallAngle(length, STANDARD_GRAVITY);
    return {
      id: `pend-${seed}`,
      seed,
      category: 'mechanics',
      title: 'Small-Angle Pendulum Period',
      prompt: `A simple pendulum of length L = ${length} m oscillates with small amplitude under standard gravity (g = ${STANDARD_GRAVITY} m/s²). Find its period T.`,
      equationLatex: tex`T = 2\pi\sqrt{\frac{L}{g}}`,
      answer,
      unit: 's',
      hint: 'Divide length by g first, take the square root, then multiply by 2π.',
      workedSolutionLatex: tex`T = 2\pi\sqrt{\frac{${length}}{${STANDARD_GRAVITY}}} = ${formatNumber(answer, 4)}\ \text{s}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const r1 = randomStep(rng, 10, 60, 5);
    const r2 = randomStep(rng, 10, 60, 5);
    const v = randomStep(rng, 6, 24, 2);
    const req = parallelResistance([r1, r2]);
    const answer = ohmsLawCurrent(v, req);
    return {
      id: `par-${seed}`,
      seed,
      category: 'electricity',
      title: 'Current Drawn by Parallel Resistors',
      prompt: `Resistors R₁ = ${r1} Ω and R₂ = ${r2} Ω are connected in parallel across a ${v} V ideal DC supply. Calculate the total supply current I.`,
      equationLatex: tex`R_\text{eq} = \frac{R_1 R_2}{R_1 + R_2},\qquad I = \frac{V}{R_\text{eq}}`,
      answer,
      unit: 'A',
      hint: 'Find the equivalent resistance of the parallel pair (or sum the two branch currents V/R₁ + V/R₂).',
      workedSolutionLatex: tex`R_\text{eq} = ${formatNumber(req, 4)}\ \Omega,\qquad I = \frac{${v}}{${formatNumber(req, 4)}} = ${formatNumber(answer, 4)}\ \text{A}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const current = randomStep(rng, 2, 20, 1);
    const rCm = randomStep(rng, 2, 10, 1);
    const bTesla = straightWireField(current, rCm / 100);
    const answer = bTesla * 1e6; // microtesla
    return {
      id: `wire-${seed}`,
      seed,
      category: 'magnetism',
      title: 'Magnetic Field Near a Straight Wire',
      prompt: `A long straight wire carries a steady current I = ${current} A. Calculate the magnetic flux density B at a perpendicular distance r = ${rCm} cm from the wire, expressed in microtesla (µT).`,
      equationLatex: tex`B = \frac{\mu_0 I}{2\pi r}`,
      answer,
      unit: 'µT',
      hint: 'Convert r from centimetres to metres first, and multiply the result in tesla by 10⁶.',
      workedSolutionLatex: tex`B = \frac{4\pi\times 10^{-7}\times ${current}}{2\pi\times ${(rCm / 100).toFixed(2)}} = ${formatNumber(answer, 4)}\ \mu\text{T}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const freq = randomStep(rng, 50, 400, 25);
    const lambda = randomStep(rng, 0.4, 2.4, 0.2);
    const answer = waveSpeed(freq, lambda);
    return {
      id: `wave-${seed}`,
      seed,
      category: 'waves',
      title: 'Phase Speed of a Travelling Wave',
      prompt: `A periodic wave has frequency f = ${freq} Hz and wavelength λ = ${lambda} m. Calculate its wave speed v.`,
      equationLatex: tex`v = f\lambda`,
      answer,
      unit: 'm/s',
      hint: 'Wave speed is the product of frequency and wavelength.',
      workedSolutionLatex: tex`v = ${freq}\times ${lambda} = ${formatNumber(answer, 4)}\ \text{m/s}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const n2 = randomStep(rng, 1.3, 1.7, 0.05);
    const theta1 = randomStep(rng, 20, 60, 5);
    const theta2Rad = refractionAngle(1.0, n2, degToRad(theta1)) ?? 0;
    const answer = radToDeg(theta2Rad);
    return {
      id: `snell-${seed}`,
      seed,
      category: 'optics',
      title: 'Angle of Refraction from Air into Glass',
      prompt: `A light ray in air (n₁ = 1.00) strikes a medium of refractive index n₂ = ${n2.toFixed(2)} at an angle of incidence θ₁ = ${theta1}°. Find the angle of refraction θ₂ in degrees.`,
      equationLatex: tex`\theta_2 = \arcsin\!\left(\frac{n_1}{n_2}\sin\theta_1\right)`,
      answer,
      unit: 'deg',
      hint: 'Evaluate (1 / n₂) sin θ₁ first, then apply arcsin in degrees.',
      workedSolutionLatex: tex`\theta_2 = \arcsin\!\left(\frac{\sin ${theta1}^\circ}{${n2.toFixed(2)}}\right) = ${formatNumber(answer, 4)}^\circ`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const moles = randomStep(rng, 0.5, 3.0, 0.5);
    const tempK = randomStep(rng, 280, 380, 20);
    const litres = randomStep(rng, 10, 40, 5);
    const answer = idealGasPressure(moles, tempK, litres * 1e-3) / 1e3; // kPa
    return {
      id: `gas-${seed}`,
      seed,
      category: 'thermodynamics',
      title: 'Pressure of an Ideal Gas',
      prompt: `An ideal gas sample of n = ${moles} mol is held at T = ${tempK} K in a rigid vessel of volume V = ${litres} L (1 L = 10⁻³ m³). Calculate the pressure P in kilopascals (kPa).`,
      equationLatex: tex`P = \frac{nRT}{V}`,
      answer,
      unit: 'kPa',
      hint: 'Use R = 8.3145 J/(mol·K) and convert litres to cubic metres (or divide directly by L to get kPa).',
      workedSolutionLatex: tex`P = \frac{${moles}\times 8.3145\times ${tempK}}{${litres}\times 10^{-3}} = ${formatNumber(answer, 4)}\ \text{kPa}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const lambdaNm = randomStep(rng, 200, 320, 20);
    const phiEv = randomStep(rng, 2.0, 3.2, 0.2);
    const answer = photoelectricMaxKineticEnergyEv(nanometresToMetres(lambdaNm), phiEv);
    return {
      id: `photo-${seed}`,
      seed,
      category: 'modern-physics',
      title: 'Photoelectric Maximum Kinetic Energy',
      prompt: `Ultraviolet light of wavelength λ = ${lambdaNm} nm illuminates a metal with work function φ = ${phiEv.toFixed(1)} eV. Find the maximum kinetic energy K_max of emitted photoelectrons in eV.`,
      equationLatex: tex`K_\text{max} = \frac{hc}{\lambda} - \phi,\qquad hc \approx 1239.84\ \text{eV·nm}`,
      answer,
      unit: 'eV',
      hint: 'Compute the photon energy in eV using hc ≈ 1239.84 eV·nm, then subtract φ.',
      workedSolutionLatex: tex`K_\text{max} = \frac{1239.84}{${lambdaNm}} - ${phiEv.toFixed(1)} = ${formatNumber(answer, 4)}\ \text{eV}`,
    };
  },
  (seed) => {
    const rng = createRandom(seed);
    const vin = randomStep(rng, 5, 15, 1);
    const r1 = randomStep(rng, 1, 9, 1);
    const r2 = randomStep(rng, 1, 9, 1);
    const answer = voltageDividerOutput(vin, r1, r2);
    return {
      id: `div-${seed}`,
      seed,
      category: 'electronics',
      title: 'Unloaded Voltage Divider Output',
      prompt: `An unloaded resistive divider has input voltage V_in = ${vin} V, upper resistor R₁ = ${r1} kΩ and lower resistor R₂ = ${r2} kΩ. Calculate the output voltage V_out.`,
      equationLatex: tex`V_\text{out} = V_\text{in}\frac{R_2}{R_1 + R_2}`,
      answer,
      unit: 'V',
      hint: 'Because R₂ / (R₁ + R₂) is dimensionless, you can leave both resistances in kΩ.',
      workedSolutionLatex: tex`V_\text{out} = ${vin}\times\frac{${r2}}{${r1} + ${r2}} = ${formatNumber(answer, 4)}\ \text{V}`,
    };
  },
];

export function generateChallenge(seed: number, category?: CategoryId | null): ChallengeProblem {
  const pool = category
    ? GENERATORS.filter((g) => g(1).category === category)
    : GENERATORS;
  const chosen = pool[Math.abs(seed) % pool.length] ?? GENERATORS[0];
  return chosen(seed);
}

/** Checks a user answer within 2 % relative tolerance (or 0.01 absolute). */
export function checkChallengeAnswer(problem: ChallengeProblem, userValue: number): boolean {
  if (!Number.isFinite(userValue)) return false;
  return approxEqual(userValue, problem.answer, 0.02, 0.01);
}
