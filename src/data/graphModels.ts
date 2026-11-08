import { linspace } from '@/engine/mathematics/numeric';
import { capacitorChargingVoltage, capacitorDischargingVoltage } from '@/engine/physics/electricity';
import { diodeCurrent, thermalVoltage } from '@/engine/physics/electronics';
import { projectileSummary, sampleTrajectory } from '@/engine/physics/kinematics';
import { remainingNuclei } from '@/engine/physics/modern';
import { refractionAngle } from '@/engine/physics/optics';
import { dampedDisplacement, dampedEnvelope, dampingRegime } from '@/engine/physics/oscillations';
import { STANDARD_GRAVITY } from '@/engine/units/constants';
import { degToRad, radToDeg } from '@/engine/units/conversions';
import { formatNumber } from '@/engine/units/format';
import type { PlotDatum, PlotSeries } from '@/components/graphs/PlotChart';

/** Instrument current compliance limit applied to the Diode I–V plot (mA). */
export const DIODE_COMPLIANCE_LIMIT_MA = 250;

export interface ModelParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
  unit: string;
  defaultValue: number;
}

export interface GraphModelResult {
  data: PlotDatum[];
  series: PlotSeries[];
  summary: Array<{ label: string; value: string }>;
}

export interface GraphModel {
  id: string;
  name: string;
  category: string;
  equationLatex: string;
  xKey: string;
  xLabel: string;
  yLabel: string;
  zeroLine?: boolean;
  params: readonly ModelParamSpec[];
  evaluate: (params: Record<string, number>) => GraphModelResult;
}

const tex = String.raw;

export const GRAPH_MODELS: readonly GraphModel[] = [
  {
    id: 'projectile',
    name: 'Projectile Trajectory y(x)',
    category: 'Mechanics',
    equationLatex: tex`y(x) = h + x\tan\theta - \frac{g x^2}{2 v_0^2 \cos^2\theta}`,
    xKey: 'x',
    xLabel: 'Horizontal distance x (m)',
    yLabel: 'Height y (m)',
    params: [
      { key: 'speed', label: 'Launch speed v₀', min: 2, max: 50, step: 0.5, precision: 1, unit: 'm/s', defaultValue: 20 },
      { key: 'angleDeg', label: 'Launch angle θ', min: 5, max: 85, step: 1, precision: 0, unit: 'deg', defaultValue: 45 },
      { key: 'height', label: 'Launch height h', min: 0, max: 30, step: 0.5, precision: 1, unit: 'm', defaultValue: 0 },
      { key: 'gravity', label: 'Gravity g', min: 1.6, max: 25, step: 0.01, precision: 2, unit: 'm/s²', defaultValue: STANDARD_GRAVITY },
    ],
    evaluate: ({ speed, angleDeg, height, gravity }) => {
      const params = { speed, angleDeg, height, gravity };
      const pts = sampleTrajectory(params, 100);
      const summary = projectileSummary(params);
      return {
        data: pts.map((p) => ({ x: p.x, y: p.y })),
        series: [{ key: 'y', label: 'Height y (m)', color: 'var(--accent)' }],
        summary: [
          { label: 'Range R', value: `${formatNumber(summary.range, 4)} m` },
          { label: 'Max height H', value: `${formatNumber(summary.maxHeight, 4)} m` },
          { label: 'Flight time T', value: `${formatNumber(summary.timeOfFlight, 4)} s` },
        ],
      };
    },
  },
  {
    id: 'damped-oscillator',
    name: 'Damped Harmonic Oscillator x(t)',
    category: 'Mechanics',
    equationLatex: tex`m\ddot{x} + b\dot{x} + kx = 0`,
    xKey: 't',
    xLabel: 'Time t (s)',
    yLabel: 'Displacement x (m)',
    zeroLine: true,
    params: [
      { key: 'amplitude', label: 'Initial amplitude A', min: 0.1, max: 2, step: 0.05, precision: 2, unit: 'm', defaultValue: 1 },
      { key: 'mass', label: 'Mass m', min: 0.2, max: 5, step: 0.1, precision: 1, unit: 'kg', defaultValue: 1 },
      { key: 'springConstant', label: 'Spring constant k', min: 1, max: 40, step: 0.5, precision: 1, unit: 'N/m', defaultValue: 12 },
      { key: 'damping', label: 'Damping b', min: 0, max: 15, step: 0.1, precision: 1, unit: 'kg/s', defaultValue: 0.8 },
    ],
    evaluate: ({ amplitude, mass, springConstant, damping }) => {
      const p = { amplitude, mass, springConstant, damping };
      const regime = dampingRegime(p);
      const omega0 = Math.sqrt(springConstant / mass);
      const oscillatory = regime === 'undamped' || regime === 'underdamped';
      const ts = linspace(0, 10, 160);
      const envelopeLabel =
        regime === 'undamped' ? 'Envelope ±A' : 'Envelope ±A(ω₀/ω_d)e^(−γt)';
      return {
        data: ts.map((t) => {
          const env = dampedEnvelope(p, t);
          return {
            t,
            x: dampedDisplacement(p, t),
            ...(env !== null ? { envelopePos: env, envelopeNeg: -env } : {}),
          };
        }),
        series: [
          { key: 'x', label: 'x(t) (m)', color: 'var(--accent)' },
          ...(oscillatory
            ? [
                { key: 'envelopePos', label: `+${envelopeLabel}`, color: 'var(--cyan)', dashed: true },
                { key: 'envelopeNeg', label: `−${envelopeLabel}`, color: 'var(--cyan)', dashed: true },
              ]
            : []),
        ],
        summary: [
          { label: 'Regime', value: regime.replace('-', ' ') },
          { label: 'ω₀', value: `${formatNumber(omega0, 3)} rad/s` },
          { label: 'b_crit = 2√(mk)', value: `${formatNumber(2 * Math.sqrt(mass * springConstant), 3)} kg/s` },
        ],
      };
    },
  },
  {
    id: 'rc-transient',
    name: 'RC Capacitor Transient V_C(t)',
    category: 'Electricity',
    equationLatex: tex`V_C(t) = V_0\left(1 - e^{-t/RC}\right)`,
    xKey: 'tMs',
    xLabel: 'Time t (ms)',
    yLabel: 'Capacitor voltage V_C (V)',
    params: [
      { key: 'supply', label: 'Supply voltage V₀', min: 1, max: 24, step: 0.5, precision: 1, unit: 'V', defaultValue: 10 },
      { key: 'resistanceK', label: 'Resistance R', min: 0.5, max: 20, step: 0.5, precision: 1, unit: 'kΩ', defaultValue: 2 },
      { key: 'capacitanceU', label: 'Capacitance C', min: 1, max: 100, step: 1, precision: 0, unit: 'µF', defaultValue: 10 },
    ],
    evaluate: ({ supply, resistanceK, capacitanceU }) => {
      const r = resistanceK * 1e3;
      const c = capacitanceU * 1e-6;
      const tau = r * c;
      const ts = linspace(0, 5 * tau, 120);
      return {
        data: ts.map((t) => ({
          tMs: t * 1e3,
          charging: capacitorChargingVoltage(supply, r, c, t),
          discharging: capacitorDischargingVoltage(supply, r, c, t),
        })),
        series: [
          { key: 'charging', label: 'Charging V_C (V)', color: 'var(--accent)' },
          { key: 'discharging', label: 'Discharging V_C (V)', color: 'var(--cyan)', dashed: true },
        ],
        summary: [
          { label: 'Time constant τ = RC', value: `${formatNumber(tau * 1e3, 3)} ms` },
          { label: 'V_C at t = τ', value: `${formatNumber(supply * (1 - Math.exp(-1)), 3)} V` },
          { label: '99 % settling (5τ)', value: `${formatNumber(5 * tau * 1e3, 3)} ms` },
        ],
      };
    },
  },
  {
    id: 'snell',
    name: 'Snell’s Law θ₂(θ₁)',
    category: 'Optics',
    equationLatex: tex`\theta_2 = \arcsin\!\left(\frac{n_1}{n_2}\sin\theta_1\right)`,
    xKey: 'theta1',
    xLabel: 'Incidence angle θ₁ (deg)',
    yLabel: 'Refraction angle θ₂ (deg)',
    params: [
      { key: 'n1', label: 'Incident index n₁', min: 1, max: 2.4, step: 0.01, precision: 2, unit: '—', defaultValue: 1.5 },
      { key: 'n2', label: 'Transmitted index n₂', min: 1, max: 2.4, step: 0.01, precision: 2, unit: '—', defaultValue: 1.0 },
    ],
    evaluate: ({ n1, n2 }) => {
      const angles = linspace(0, 89, 90);
      const crit = n1 > n2 ? radToDeg(Math.asin(n2 / n1)) : null;
      return {
        data: angles.map((theta1) => {
          const r = refractionAngle(n1, n2, degToRad(theta1));
          return { theta1, theta2: r === null ? null : radToDeg(r) };
        }),
        series: [{ key: 'theta2', label: 'Refraction angle θ₂ (deg)', color: 'var(--accent)' }],
        summary: [
          { label: 'Ratio n₁ / n₂', value: formatNumber(n1 / n2, 3) },
          { label: 'Critical angle θ_c', value: crit === null ? 'None (n₁ ≤ n₂)' : `${formatNumber(crit, 3)}°` },
        ],
      };
    },
  },
  {
    id: 'decay',
    name: 'Radioactive Decay N(t)',
    category: 'Modern Physics',
    equationLatex: tex`N(t) = N_0\, e^{-(\ln 2)\, t / t_{1/2}}`,
    xKey: 't',
    xLabel: 'Time t (s)',
    yLabel: 'Remaining nuclei N(t)',
    params: [
      { key: 'initial', label: 'Initial count N₀', min: 100, max: 5000, step: 100, precision: 0, unit: '—', defaultValue: 1000 },
      { key: 'halfLife', label: 'Half-life t½', min: 1, max: 60, step: 1, precision: 0, unit: 's', defaultValue: 12 },
    ],
    evaluate: ({ initial, halfLife }) => {
      const ts = linspace(0, 5 * halfLife, 120);
      const lambda = Math.LN2 / halfLife;
      return {
        data: ts.map((t) => ({
          t,
          remaining: remainingNuclei(initial, halfLife, t),
          decayed: initial - remainingNuclei(initial, halfLife, t),
        })),
        series: [
          { key: 'remaining', label: 'Remaining N(t)', color: 'var(--accent)' },
          { key: 'decayed', label: 'Daughter nuclei', color: 'var(--cyan)', dashed: true },
        ],
        summary: [
          { label: 'Decay constant λ', value: `${formatNumber(lambda, 3)} s⁻¹` },
          { label: 'Mean lifetime τ = 1/λ', value: `${formatNumber(1 / lambda, 3)} s` },
          { label: 'Remaining at 3 t½', value: formatNumber(initial / 8, 4) },
        ],
      };
    },
  },
  {
    id: 'diode',
    name: 'Shockley Diode I–V Curve',
    category: 'Electronics',
    equationLatex: tex`I = \min\!\left(I_\text{lim},\; I_s\left(e^{V / nV_T} - 1\right)\right)`,
    xKey: 'v',
    xLabel: 'Forward voltage V (V)',
    yLabel: `Current I (mA, ${DIODE_COMPLIANCE_LIMIT_MA} mA compliance)`,
    params: [
      { key: 'isNano', label: 'Saturation current I_s', min: 0.1, max: 20, step: 0.1, precision: 1, unit: 'nA', defaultValue: 2 },
      { key: 'ideality', label: 'Ideality factor n', min: 1, max: 2, step: 0.05, precision: 2, unit: '—', defaultValue: 1.4 },
      { key: 'tempK', label: 'Temperature T', min: 250, max: 380, step: 5, precision: 0, unit: 'K', defaultValue: 300 },
    ],
    evaluate: ({ isNano, ideality, tempK }) => {
      const vs = linspace(0, 0.78, 120);
      const diodeParams = {
        saturationCurrent: isNano * 1e-9,
        idealityFactor: ideality,
        temperatureK: tempK,
      };
      const rawAt065 = diodeCurrent(diodeParams, 0.65) * 1e3;
      const clampedAt065 = rawAt065 > DIODE_COMPLIANCE_LIMIT_MA;
      return {
        data: vs.map((v) => ({
          v,
          iMa: Math.min(DIODE_COMPLIANCE_LIMIT_MA, diodeCurrent(diodeParams, v) * 1e3),
        })),
        series: [
          {
            key: 'iMa',
            label: `Forward current I (mA, ≤ ${DIODE_COMPLIANCE_LIMIT_MA} mA compliance)`,
            color: 'var(--accent)',
          },
        ],
        summary: [
          {
            label: 'Shockley I at V = 0.65 V',
            value: clampedAt065
              ? `${formatNumber(rawAt065, 3)} mA (clamped to ${DIODE_COMPLIANCE_LIMIT_MA} mA)`
              : `${formatNumber(rawAt065, 3)} mA`,
          },
          { label: 'Thermal voltage V_T', value: `${formatNumber(thermalVoltage(tempK) * 1e3, 3)} mV` },
          { label: 'Plot compliance limit I_lim', value: `${DIODE_COMPLIANCE_LIMIT_MA} mA` },
        ],
      };
    },
  },
];
