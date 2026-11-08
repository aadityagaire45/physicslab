import { clamp } from '../mathematics/numeric';
import { VACUUM_PERMITTIVITY } from '../units/constants';

// ============================================================================
// 1. OHM'S LAW & CONDUCTOR CHARACTERISTICS (PHASE 3.1)
// ============================================================================

export type ConductorMode = 'ohmic' | 'filament-lamp' | 'semiconductor-diode';

export interface OhmsLawParams {
  /** Applied DC terminal voltage V (V), in [0, 50] (or [−24, 24]). */
  voltage: number;
  /** Nominal resistance R (Ω) at reference temperature, > 0. */
  resistance: number;
  /** Conductor model: ideal ohmic resistor vs illustrative non-ohmic loads. */
  conductorMode?: ConductorMode;
}

export interface OhmsLawState {
  /** Applied terminal voltage V (V). */
  voltage: number;
  /** Nominal baseline resistance R₀ (Ω). */
  nominalResistance: number;
  /** Effective static resistance R_static = V / I (Ω) at the operating point. */
  effectiveResistance: number;
  /** Steady-state DC current I (A). */
  current: number;
  /** Current in milliamperes (mA). */
  currentMa: number;
  /** Dissipated electrical power P = V I (W). */
  power: number;
  /** Active conductor model. */
  conductorMode: ConductorMode;
}

export interface ResistorColorBand {
  bandName: '1st Digit' | '2nd Digit' | 'Multiplier' | 'Tolerance';
  colorName: string;
  hex: string;
  label: string;
}

/** Validates parameters for Ohm's law calculations. */
export function validateOhmsLawParams(voltage: number, resistance: number): void {
  if (!Number.isFinite(voltage)) {
    throw new RangeError('Voltage V must be a finite number');
  }
  if (!Number.isFinite(resistance) || !(resistance > 0)) {
    throw new RangeError('Resistance must be positive');
  }
}

/** Ohm's law current: I = V / R (A). */
export function ohmsLawCurrent(voltage: number, resistance: number): number {
  validateOhmsLawParams(voltage, resistance);
  return voltage / resistance;
}

/** Ohm's law potential difference: V = I R (V). */
export function ohmsLawVoltage(current: number, resistance: number): number {
  if (!Number.isFinite(current)) {
    throw new RangeError('Current I must be a finite number');
  }
  if (!Number.isFinite(resistance) || !(resistance >= 0)) {
    throw new RangeError('Resistance R must be non-negative');
  }
  return current * resistance;
}

/** Ohm's law static resistance from measured V and I: R = V / I (Ω). */
export function ohmsLawResistance(voltage: number, current: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(current)) {
    throw new RangeError('Voltage and current must be finite numbers');
  }
  if (Math.abs(current) === 0) {
    throw new RangeError('Current I must be non-zero to determine resistance R = V / I');
  }
  return voltage / current;
}

/** Electrical power dissipated: P = V I (W). */
export function electricalPower(voltage: number, current: number): number {
  if (!Number.isFinite(voltage) || !Number.isFinite(current)) {
    throw new RangeError('Voltage and current must be finite numbers');
  }
  return voltage * current;
}

/** Electrical power from current and resistance: P = I² R (W). */
export function electricalPowerFromIR(current: number, resistance: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(resistance) || !(resistance >= 0)) {
    throw new RangeError('Current must be finite and resistance must be non-negative');
  }
  return current * current * resistance;
}

/** Electrical power from voltage and resistance: P = V² / R (W). */
export function electricalPowerFromVR(voltage: number, resistance: number): number {
  validateOhmsLawParams(voltage, resistance);
  return (voltage * voltage) / resistance;
}

/**
 * Evaluates the operating point (V, I, R_eff, P) for either an ideal ohmic
 * resistor or an illustrative non-ohmic device (tungsten filament lamp or
 * silicon diode with series current-limiting resistance R).
 */
export function evaluateOhmsLawState(params: OhmsLawParams): OhmsLawState {
  const { voltage, resistance, conductorMode = 'ohmic' } = params;
  validateOhmsLawParams(voltage, resistance);

  let current: number;
  let effectiveResistance: number;

  if (conductorMode === 'ohmic') {
    current = voltage / resistance;
    effectiveResistance = resistance;
  } else if (conductorMode === 'filament-lamp') {
    // Illustrative tungsten filament: resistance rises with thermal self-heating
    // R_eff(V) = R₀ · (1 + 0.14 |V|^1.15)
    const thermalFactor = 1 + 0.14 * Math.pow(Math.abs(voltage), 1.15);
    effectiveResistance = resistance * thermalFactor;
    current = voltage / effectiveResistance;
  } else {
    // Illustrative forward-biased silicon diode in series with resistor R:
    // Threshold knee V_th ≈ 0.7 V; reverse leakage ≈ 0 A on macroscopic scale.
    const vKnee = 0.7;
    if (voltage <= 0) {
      current = 0;
      effectiveResistance = Number.POSITIVE_INFINITY;
    } else if (voltage < vKnee) {
      // Smooth exponential sub-threshold turn-on
      const iKnee = (0.08 * vKnee) / resistance;
      current = iKnee * Math.expm1((voltage / vKnee) * 3) / Math.expm1(3);
      effectiveResistance = current > 1e-12 ? voltage / current : Number.POSITIVE_INFINITY;
    } else {
      const vDrop = voltage - vKnee * (1 - 0.08 * Math.exp(-(voltage - vKnee)));
      current = Math.max(0, vDrop / resistance);
      effectiveResistance = current > 1e-12 ? voltage / current : Number.POSITIVE_INFINITY;
    }
  }

  const power = Math.abs(voltage * current);

  return {
    voltage,
    nominalResistance: resistance,
    effectiveResistance,
    current,
    currentMa: current * 1000,
    power,
    conductorMode,
  };
}

const EIA_DIGIT_COLORS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Black', hex: '#1e293b' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Grey', hex: '#64748b' },
  { name: 'White', hex: '#f8fafc' },
];

const EIA_MULTIPLIERS: Readonly<Record<number, { name: string; hex: string; label: string }>> = {
  [-2]: { name: 'Silver', hex: '#cbd5e1', label: '×0.01 Ω' },
  [-1]: { name: 'Gold', hex: '#d97706', label: '×0.1 Ω' },
  0: { name: 'Black', hex: '#1e293b', label: '×1 Ω' },
  1: { name: 'Brown', hex: '#78350f', label: '×10 Ω' },
  2: { name: 'Red', hex: '#dc2626', label: '×100 Ω' },
  3: { name: 'Orange', hex: '#ea580c', label: '×1 kΩ' },
  4: { name: 'Yellow', hex: '#eab308', label: '×10 kΩ' },
  5: { name: 'Green', hex: '#16a34a', label: '×100 kΩ' },
  6: { name: 'Blue', hex: '#2563eb', label: '×1 MΩ' },
};

/**
 * Encodes a positive resistance (Ω) into a standard 4-band EIA resistor color code.
 */
export function decodeResistorColorBands(
  resistanceOhms: number,
  tolerancePercent: 1 | 5 | 10 = 5,
): ResistorColorBand[] {
  if (!Number.isFinite(resistanceOhms) || !(resistanceOhms > 0)) {
    throw new RangeError('Resistance must be positive to encode color bands');
  }
  const exp = Math.floor(Math.log10(resistanceOhms));
  const multiplierPower = clamp(exp - 1, -2, 6);
  const twoDigits = clamp(Math.round(resistanceOhms / 10 ** multiplierPower), 10, 99);
  const d1 = Math.floor(twoDigits / 10);
  const d2 = twoDigits % 10;

  const c1 = EIA_DIGIT_COLORS[d1] ?? EIA_DIGIT_COLORS[1];
  const c2 = EIA_DIGIT_COLORS[d2] ?? EIA_DIGIT_COLORS[0];
  const mult = EIA_MULTIPLIERS[multiplierPower] ?? EIA_MULTIPLIERS[0];

  const tolColor =
    tolerancePercent === 1
      ? { name: 'Brown', hex: '#78350f', label: '±1%' }
      : tolerancePercent === 10
        ? { name: 'Silver', hex: '#cbd5e1', label: '±10%' }
        : { name: 'Gold', hex: '#d97706', label: '±5%' };

  return [
    { bandName: '1st Digit', colorName: c1.name, hex: c1.hex, label: `${d1}` },
    { bandName: '2nd Digit', colorName: c2.name, hex: c2.hex, label: `${d2}` },
    { bandName: 'Multiplier', colorName: mult.name, hex: mult.hex, label: mult.label },
    { bandName: 'Tolerance', colorName: tolColor.name, hex: tolColor.hex, label: tolColor.label },
  ];
}

// ============================================================================
// 2. SERIES, PARALLEL & MIXED RESISTOR NETWORKS (PHASE 3.2)
// ============================================================================

export type CircuitTopology =
  | 'series'
  | 'parallel'
  | 'mixed-series-parallel'
  | 'mixed-dual-parallel';

export interface ResistorBranchSpec {
  id: string;
  label: string;
  /** Resistance R_i (Ω), > 0. */
  resistance: number;
  /** Whether the branch switch S_i is closed (conducting). */
  closed: boolean;
}

export interface ResistorNetworkParams {
  /** Source EMF / battery terminal voltage V_s (V), ≥ 0. */
  sourceVoltage: number;
  /** Network topology. */
  topology: CircuitTopology;
  /** Active resistors (2 to 5 elements). */
  resistors: readonly ResistorBranchSpec[];
}

export interface ResistorBranchTelemetry {
  id: string;
  label: string;
  resistance: number;
  closed: boolean;
  /** Branch current I_i (A). */
  current: number;
  /** Potential drop ΔV_i = I_i R_i (V). */
  voltageDrop: number;
  /** Power dissipated P_i = I_i² R_i (W). */
  power: number;
  /** Percentage of total circuit power (%). */
  powerSharePercent: number;
}

export interface ResistorNetworkSolution {
  topology: CircuitTopology;
  sourceVoltage: number;
  /** Equivalent total resistance R_eq (Ω); +Infinity if open-circuited. */
  equivalentResistance: number;
  /** Total source current I_total (A). */
  totalCurrent: number;
  /** Total power delivered by the source P_total = V_s I_total (W). */
  totalPower: number;
  /** Whether a complete conducting path exists between battery terminals. */
  isCircuitComplete: boolean;
  /** Per-resistor telemetry (currents, voltage drops, powers). */
  branches: ResistorBranchTelemetry[];
  /** Equivalent resistance if the same active resistors were wired purely in series (Ω). */
  allSeriesEquivalent: number;
  /** Equivalent resistance if the same active resistors were wired purely in parallel (Ω). */
  allParallelEquivalent: number;
  /** KCL current conservation residual (A). */
  kclResidual: number;
  /** KVL loop voltage conservation residual (V). */
  kvlResidual: number;
}

/** Equivalent resistance of resistors in series: R = Σ Rᵢ (Ω). */
export function seriesResistance(resistances: readonly number[]): number {
  if (resistances.length === 0) throw new RangeError('At least one resistor is required');
  if (resistances.some((r) => !Number.isFinite(r) || !(r > 0))) {
    throw new RangeError('Resistances must be positive');
  }
  return resistances.reduce((sum, r) => sum + r, 0);
}

/** Equivalent resistance of resistors in parallel: 1/R = Σ 1/Rᵢ (Ω). */
export function parallelResistance(resistances: readonly number[]): number {
  if (resistances.length === 0) throw new RangeError('At least one resistor is required');
  if (resistances.some((r) => !Number.isFinite(r) || !(r > 0))) {
    throw new RangeError('Resistances must be positive');
  }
  return 1 / resistances.reduce((sum, r) => sum + 1 / r, 0);
}

/**
 * Solves current, voltage drop, power distribution, and equivalent resistance
 * for series, parallel, and mixed resistor networks with individual branch switches.
 */
export function solveResistorNetwork(params: ResistorNetworkParams): ResistorNetworkSolution {
  const { sourceVoltage, topology, resistors } = params;
  if (!Number.isFinite(sourceVoltage) || !(sourceVoltage >= 0)) {
    throw new RangeError('Source voltage must be a non-negative finite number');
  }
  if (resistors.length < 2 || resistors.length > 5) {
    throw new RangeError('Resistor network must contain between 2 and 5 resistors');
  }
  for (const r of resistors) {
    if (!Number.isFinite(r.resistance) || !(r.resistance > 0)) {
      throw new RangeError(`Resistor ${r.label} must have a finite positive resistance`);
    }
  }

  const rawValues = resistors.map((r) => r.resistance);
  const allSeriesEquivalent = seriesResistance(rawValues);
  const allParallelEquivalent = parallelResistance(rawValues);

  const currents = new Array<number>(resistors.length).fill(0);
  const drops = new Array<number>(resistors.length).fill(0);
  let equivalentResistance = Number.POSITIVE_INFINITY;
  let totalCurrent = 0;
  let kclResidual = 0;
  let kvlResidual = 0;

  if (topology === 'series') {
    const allClosed = resistors.every((r) => r.closed);
    if (allClosed) {
      equivalentResistance = seriesResistance(rawValues);
      totalCurrent = sourceVoltage / equivalentResistance;
      for (let i = 0; i < resistors.length; i += 1) {
        currents[i] = totalCurrent;
        drops[i] = totalCurrent * resistors[i].resistance;
      }
      const sumDrops = drops.reduce((a, b) => a + b, 0);
      kvlResidual = Math.abs(sourceVoltage - sumDrops);
      kclResidual = Math.abs(totalCurrent - currents[0]);
    }
  } else if (topology === 'parallel') {
    const closedIndices = resistors
      .map((r, idx) => (r.closed ? idx : -1))
      .filter((idx) => idx >= 0);
    if (closedIndices.length > 0) {
      equivalentResistance = parallelResistance(
        closedIndices.map((idx) => resistors[idx].resistance),
      );
      for (const idx of closedIndices) {
        drops[idx] = sourceVoltage;
        currents[idx] = sourceVoltage / resistors[idx].resistance;
      }
      totalCurrent = currents.reduce((a, b) => a + b, 0);
      kclResidual = Math.abs(totalCurrent - sourceVoltage / equivalentResistance);
      kvlResidual = Math.abs(sourceVoltage - drops[closedIndices[0]]);
    }
  } else if (topology === 'mixed-series-parallel') {
    // R1 (index 0) in series with parallel bank of R2..R_{n-1} (or if n >= 4, R1 in series with (R2 || R3) and R4..R5 in series)
    const seriesHead = [0];
    const parallelIndices =
      resistors.length === 2
        ? [1]
        : resistors.length === 3
          ? [1, 2]
          : [1, 2];
    const seriesTail =
      resistors.length >= 4
        ? Array.from({ length: resistors.length - 3 }, (_, k) => k + 3)
        : [];

    const headClosed = seriesHead.every((idx) => resistors[idx].closed);
    const tailClosed = seriesTail.every((idx) => resistors[idx].closed);
    const activeParallel = parallelIndices.filter((idx) => resistors[idx].closed);

    if (headClosed && tailClosed && activeParallel.length > 0) {
      const rHead = seriesHead.reduce((s, idx) => s + resistors[idx].resistance, 0);
      const rTail = seriesTail.reduce((s, idx) => s + resistors[idx].resistance, 0);
      const rPar = parallelResistance(activeParallel.map((idx) => resistors[idx].resistance));
      equivalentResistance = rHead + rPar + rTail;
      totalCurrent = sourceVoltage / equivalentResistance;

      for (const idx of [...seriesHead, ...seriesTail]) {
        currents[idx] = totalCurrent;
        drops[idx] = totalCurrent * resistors[idx].resistance;
      }
      const vPar = totalCurrent * rPar;
      for (const idx of activeParallel) {
        drops[idx] = vPar;
        currents[idx] = vPar / resistors[idx].resistance;
      }
      const sumParCurrent = activeParallel.reduce((s, idx) => s + currents[idx], 0);
      kclResidual = Math.abs(totalCurrent - sumParCurrent);
      const loopVoltage =
        seriesHead.reduce((s, idx) => s + drops[idx], 0) +
        vPar +
        seriesTail.reduce((s, idx) => s + drops[idx], 0);
      kvlResidual = Math.abs(sourceVoltage - loopVoltage);
    }
  } else {
    // 'mixed-dual-parallel': Bank A (R1 || R2) in series with Bank B (R3 || R4 [|| R5])
    const bankA = [0, 1].filter((idx) => idx < resistors.length);
    const bankB = Array.from({ length: Math.max(0, resistors.length - 2) }, (_, k) => k + 2);
    const activeA = bankA.filter((idx) => resistors[idx].closed);
    const activeB = bankB.length > 0 ? bankB.filter((idx) => resistors[idx].closed) : [];

    if (activeA.length > 0 && (bankB.length === 0 || activeB.length > 0)) {
      const rA = parallelResistance(activeA.map((idx) => resistors[idx].resistance));
      const rB =
        activeB.length > 0
          ? parallelResistance(activeB.map((idx) => resistors[idx].resistance))
          : 0;
      equivalentResistance = rA + rB;
      totalCurrent = sourceVoltage / equivalentResistance;

      const vA = totalCurrent * rA;
      const vB = totalCurrent * rB;
      for (const idx of activeA) {
        drops[idx] = vA;
        currents[idx] = vA / resistors[idx].resistance;
      }
      for (const idx of activeB) {
        drops[idx] = vB;
        currents[idx] = vB / resistors[idx].resistance;
      }
      const sumA = activeA.reduce((s, idx) => s + currents[idx], 0);
      kclResidual = Math.abs(totalCurrent - sumA);
      kvlResidual = Math.abs(sourceVoltage - (vA + vB));
    }
  }

  const totalPower = sourceVoltage * totalCurrent;
  const isCircuitComplete = Number.isFinite(equivalentResistance) && equivalentResistance > 0;

  const branches: ResistorBranchTelemetry[] = resistors.map((r, i) => {
    const power = currents[i] * currents[i] * r.resistance;
    return {
      id: r.id,
      label: r.label,
      resistance: r.resistance,
      closed: r.closed,
      current: currents[i],
      voltageDrop: drops[i],
      power,
      powerSharePercent: totalPower > 1e-12 ? (power / totalPower) * 100 : 0,
    };
  });

  return {
    topology,
    sourceVoltage,
    equivalentResistance,
    totalCurrent,
    totalPower,
    isCircuitComplete,
    branches,
    allSeriesEquivalent,
    allParallelEquivalent,
    kclResidual,
    kvlResidual,
  };
}

// ============================================================================
// 3. KIRCHHOFF'S LAWS (KCL & KVL) & LINEAR SYSTEM SOLVER (PHASE 3.3)
// ============================================================================

export type LinearSolverStatus = 'unique' | 'singular' | 'ill-conditioned';

export interface LinearSystemResult {
  status: LinearSolverStatus;
  /** Solution vector x satisfying A x = b (or empty if singular). */
  solution: number[];
  /** Infinity-norm residual max_i |(A x - b)_i|. */
  residualNorm: number;
  /** Minimum pivot ratio encountered during Gaussian elimination. */
  minPivotRatio: number;
}

/**
 * Solves an n×n linear system A x = b using Gaussian elimination with partial
 * pivoting. Safely detects singular and ill-conditioned matrices without
 * producing NaN or Infinity.
 */
export function solveLinearSystem(
  matrixA: readonly (readonly number[])[],
  vectorB: readonly number[],
): LinearSystemResult {
  const n = matrixA.length;
  if (n === 0 || vectorB.length !== n) {
    throw new RangeError('Matrix A must be non-empty square and match vector b length');
  }
  for (let i = 0; i < n; i += 1) {
    if (matrixA[i].length !== n) {
      throw new RangeError('Matrix A must be square (n × n)');
    }
    if (!Number.isFinite(vectorB[i]) || matrixA[i].some((v) => !Number.isFinite(v))) {
      throw new RangeError('Matrix A and vector b entries must be finite numbers');
    }
  }

  const a = matrixA.map((row) => [...row]);
  const b = [...vectorB];
  const rowScales = a.map((row) => Math.max(...row.map((v) => Math.abs(v)), 1e-15));
  let minPivotRatio = 1;

  for (let col = 0; col < n; col += 1) {
    // Partial pivoting scaled by row infinity norm
    let pivotRow = col;
    let bestScaledPivot = Math.abs(a[col][col]) / rowScales[col];
    for (let row = col + 1; row < n; row += 1) {
      const scaled = Math.abs(a[row][col]) / rowScales[row];
      if (scaled > bestScaledPivot) {
        bestScaledPivot = scaled;
        pivotRow = row;
      }
    }

    if (pivotRow !== col) {
      [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
      [rowScales[col], rowScales[pivotRow]] = [rowScales[pivotRow], rowScales[col]];
    }

    const pivot = a[col][col];
    const pivotRatio = Math.abs(pivot) / rowScales[col];
    if (pivotRatio < minPivotRatio) minPivotRatio = pivotRatio;

    if (Math.abs(pivot) <= 1e-12 * rowScales[col]) {
      return {
        status: 'singular',
        solution: [],
        residualNorm: Number.POSITIVE_INFINITY,
        minPivotRatio: 0,
      };
    }

    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row][col] / pivot;
      a[row][col] = 0;
      for (let k = col + 1; k < n; k += 1) {
        a[row][k] -= factor * a[col][k];
      }
      b[row] -= factor * b[col];
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = b[row];
    for (let col = row + 1; col < n; col += 1) {
      sum -= a[row][col] * x[col];
    }
    x[row] = sum / a[row][row];
  }

  // Compute residual ||A x - b||_∞
  let residualNorm = 0;
  for (let i = 0; i < n; i += 1) {
    let ax = 0;
    for (let j = 0; j < n; j += 1) {
      ax += matrixA[i][j] * x[j];
    }
    const err = Math.abs(ax - vectorB[i]);
    if (err > residualNorm) residualNorm = err;
  }

  const status: LinearSolverStatus =
    minPivotRatio < 1e-7 ? 'ill-conditioned' : 'unique';

  return {
    status,
    solution: x,
    residualNorm,
    minPivotRatio,
  };
}

export type LoopTraversalDirection = 'clockwise' | 'counter-clockwise';

/**
 * Parameters for a two-loop, three-branch DC Kirchhoff network with top
 * junction A and bottom reference junction B (V_B = 0 V):
 *
 *   - Branch 1 (Left):   EMF E₁ (+ terminal upward) in series with R₁.
 *                        Assumed current I₁ flows UPWARD into Junction A.
 *   - Branch 2 (Center): EMF E₂ (+ terminal upward, default 0 V) in series with R₂.
 *                        Assumed current I₂ flows DOWNWARD from Junction A to B.
 *   - Branch 3 (Right):  EMF E₃ (+ terminal upward) in series with R₃.
 *                        Assumed current I₃ flows DOWNWARD from Junction A to B.
 *
 * By KCL at Junction A:
 *   I₁ = I₂ + I₃   ⇒   I₁ − I₂ − I₃ = 0
 */
export interface KirchhoffCircuitParams {
  /** Left branch EMF E₁ (V). */
  e1: number;
  /** Center branch EMF E₂ (V, default 0). */
  e2?: number;
  /** Right branch EMF E₃ (V). */
  e3: number;
  /** Left branch resistance R₁ (Ω), > 0. */
  r1: number;
  /** Center shared branch resistance R₂ (Ω), > 0. */
  r2: number;
  /** Right branch resistance R₃ (Ω), > 0. */
  r3: number;
  /** User-selected Loop 1 (Left–Center) traversal direction. */
  loop1Direction?: LoopTraversalDirection;
  /** User-selected Loop 2 (Center–Right) traversal direction. */
  loop2Direction?: LoopTraversalDirection;
}

export interface KirchhoffBranchResult {
  branchId: 1 | 2 | 3;
  label: string;
  emf: number;
  resistance: number;
  /** Signed current I_k (A) relative to the assumed arrow direction. */
  signedCurrent: number;
  /** Current magnitude |I_k| (A). */
  magnitudeCurrent: number;
  /** Resistor voltage drop magnitude |I_k| R_k (V). */
  resistorVoltageDrop: number;
  /** Power dissipated in resistor R_k: I_k² R_k (W). */
  resistorPower: number;
  /** Power delivered (+) or absorbed (−) by branch source E_k (W). */
  sourcePower: number;
  /** Assumed current direction description. */
  assumedDirectionLabel: string;
  /** Actual physical conventional current direction description. */
  actualDirectionLabel: string;
  /** True when I_k < 0 (actual conventional current is opposite to assumed arrow). */
  isReversedFromAssumed: boolean;
}

export interface KirchhoffSolution {
  solverStatus: LinearSolverStatus;
  /** Signed branch currents I₁, I₂, I₃ (A). */
  i1: number;
  i2: number;
  i3: number;
  /** Potential of Top Junction A relative to Bottom Junction B (V_B = 0 V) (V). */
  junctionVoltageAB: number;
  /** KCL residual at Junction A: |I₁ − (I₂ + I₃)| (A). */
  kclResidual: number;
  /** KVL residual around Loop 1 (Left–Center) (V). */
  kvlLoop1Residual: number;
  /** KVL residual around Loop 2 (Center–Right) (V). */
  kvlLoop2Residual: number;
  /** KVL residual around Outer Loop (Left–Right perimeter) (V). */
  kvlOuterLoopResidual: number;
  /** Symbolic & numerical KCL equation string. */
  kclEquationText: string;
  /** Symbolic & numerical KVL Loop 1 equation string respecting loop1Direction. */
  kvlLoop1EquationText: string;
  /** Symbolic & numerical KVL Loop 2 equation string respecting loop2Direction. */
  kvlLoop2EquationText: string;
  /** Per-branch analysis details. */
  branches: [KirchhoffBranchResult, KirchhoffBranchResult, KirchhoffBranchResult];
  /** Total power dissipated across all 3 resistors (W). */
  totalResistorPower: number;
}

export function validateKirchhoffParams(params: KirchhoffCircuitParams): void {
  const { e1, e2 = 0, e3, r1, r2, r3 } = params;
  if (!Number.isFinite(e1) || !Number.isFinite(e2) || !Number.isFinite(e3)) {
    throw new RangeError('Branch EMFs E₁, E₂, E₃ must be finite numbers');
  }
  if (!Number.isFinite(r1) || !(r1 > 0) || !Number.isFinite(r2) || !(r2 > 0) || !Number.isFinite(r3) || !(r3 > 0)) {
    throw new RangeError('Branch resistances R₁, R₂, R₃ must be finite positive numbers');
  }
}

/**
 * Solves the 2-loop, 3-branch Kirchhoff DC network via simultaneous linear equations.
 */
export function solveTwoLoopKirchhoffCircuit(
  params: KirchhoffCircuitParams,
): KirchhoffSolution {
  validateKirchhoffParams(params);
  const {
    e1,
    e2 = 0,
    e3,
    r1,
    r2,
    r3,
    loop1Direction = 'clockwise',
    loop2Direction = 'clockwise',
  } = params;

  const s1 = loop1Direction === 'clockwise' ? 1 : -1;
  const s2 = loop2Direction === 'clockwise' ? 1 : -1;

  // Row 0: KCL at Junction A:  1·I₁ - 1·I₂ - 1·I₃ = 0
  // Row 1: KVL Loop 1 (CW):    s1·(R₁ I₁ + R₂ I₂) = s1·(E₁ - E₂)
  // Row 2: KVL Loop 2 (CW):    s2·(-R₂ I₂ + R₃ I₃) = s2·(E₂ - E₃)
  const matrixA = [
    [1, -1, -1],
    [s1 * r1, s1 * r2, 0],
    [0, -s2 * r2, s2 * r3],
  ];
  const vectorB = [0, s1 * (e1 - e2), s2 * (e2 - e3)];

  const solved = solveLinearSystem(matrixA, vectorB);
  const [i1 = 0, i2 = 0, i3 = 0] = solved.solution;

  // Node voltage V_AB = E₁ - I₁ R₁ = E₂ + I₂ R₂ = E₃ + I₃ R₃
  const junctionVoltageAB = e2 + i2 * r2;

  const kclResidual = Math.abs(i1 - i2 - i3);
  const kvlLoop1Residual = Math.abs(s1 * (e1 - i1 * r1 - i2 * r2 - e2));
  const kvlLoop2Residual = Math.abs(s2 * (e2 + i2 * r2 - i3 * r3 - e3));
  const kvlOuterLoopResidual = Math.abs(e1 - i1 * r1 - i3 * r3 - e3);

  const kclEquationText = `I₁ − I₂ − I₃ = 0`;
  const kvlLoop1EquationText =
    loop1Direction === 'clockwise'
      ? `+E₁ − I₁R₁ − I₂R₂ − E₂ = 0`
      : `+E₂ + I₂R₂ + I₁R₁ − E₁ = 0`;
  const kvlLoop2EquationText =
    loop2Direction === 'clockwise'
      ? `+E₂ + I₂R₂ − I₃R₃ − E₃ = 0`
      : `+E₃ + I₃R₃ − I₂R₂ − E₂ = 0`;

  const makeBranch = (
    branchId: 1 | 2 | 3,
    label: string,
    emf: number,
    r: number,
    current: number,
    assumedLabel: string,
    oppositeLabel: string,
    emfSignWithAssumed: 1 | -1,
  ): KirchhoffBranchResult => {
    const reversed = current < -1e-9;
    const zero = Math.abs(current) <= 1e-9;
    return {
      branchId,
      label,
      emf,
      resistance: r,
      signedCurrent: current,
      magnitudeCurrent: Math.abs(current),
      resistorVoltageDrop: Math.abs(current) * r,
      resistorPower: current * current * r,
      sourcePower: emfSignWithAssumed * emf * current,
      assumedDirectionLabel: assumedLabel,
      actualDirectionLabel: zero
        ? 'No current (0 A)'
        : reversed
          ? oppositeLabel
          : assumedLabel,
      isReversedFromAssumed: reversed,
    };
  };

  const b1 = makeBranch(
    1,
    'Branch 1 (Left)',
    e1,
    r1,
    i1,
    'Upward into Junction A (B → A)',
    'Downward into Junction B (A → B)',
    1,
  );
  const b2 = makeBranch(
    2,
    'Branch 2 (Center)',
    e2,
    r2,
    i2,
    'Downward from Junction A to B (A → B)',
    'Upward from Junction B to A (B → A)',
    -1,
  );
  const b3 = makeBranch(
    3,
    'Branch 3 (Right)',
    e3,
    r3,
    i3,
    'Downward from Junction A to B (A → B)',
    'Upward from Junction B to A (B → A)',
    -1,
  );

  return {
    solverStatus: solved.status,
    i1,
    i2,
    i3,
    junctionVoltageAB,
    kclResidual,
    kvlLoop1Residual,
    kvlLoop2Residual,
    kvlOuterLoopResidual,
    kclEquationText,
    kvlLoop1EquationText,
    kvlLoop2EquationText,
    branches: [b1, b2, b3],
    totalResistorPower: b1.resistorPower + b2.resistorPower + b3.resistorPower,
  };
}

// ============================================================================
// 4. ELECTRICAL POWER, JOULE HEATING & ILLUSTRATIVE THERMAL MODEL (PHASE 3.4)
// ============================================================================

export interface PowerHeatingParams {
  /** Supply voltage V (V), ≥ 0. */
  voltage: number;
  /** Load resistance R (Ω), > 0. */
  resistance: number;
  /** Ambient temperature T_amb (°C, default 22 °C) for the illustrative thermal model. */
  ambientTempC?: number;
  /** Illustrative lumped thermal heat capacity C_th (J/K, default 45 J/K). */
  thermalCapacityJK?: number;
  /** Illustrative Newton cooling coefficient h_loss (W/K, default 1.5 W/K). */
  heatLossCoefficientWK?: number;
}

export interface PowerHeatingState {
  /** Elapsed operating time t (s). */
  t: number;
  /** Voltage V (V). */
  voltage: number;
  /** Resistance R (Ω). */
  resistance: number;
  /** Current I = V / R (A). */
  current: number;
  /** Electrical power P = V I = I² R = V² / R (W). */
  powerWatts: number;
  /** Electrical power in kilowatts (kW). */
  powerKilowatts: number;
  /** Cumulative Joule heat / electrical energy H = I² R t (J). */
  energyJoules: number;
  /** Cumulative energy in kilojoules (kJ). */
  energyKilojoules: number;
  /** Cumulative energy in kilowatt-hours (kWh). */
  energyKWh: number;
  /** Total electric charge transferred Q = I t (C). */
  chargeCoulombs: number;
  /**
   * Illustrative resistor surface temperature (°C) from a lumped Newton-cooling
   * model: T(t) = T_amb + (P / h_loss)(1 − e^(−t / τ_th)).
   */
  illustrativeTempC: number;
  /** Steady-state asymptotic temperature T_max = T_amb + P / h_loss (°C). */
  illustrativeSteadyStateTempC: number;
}

/**
 * Joule heating energy dissipated in a resistor over duration t:
 *   H = I² R t  (J)
 */
export function jouleHeatingEnergy(
  current: number,
  resistance: number,
  durationSeconds: number,
): number {
  if (!Number.isFinite(current)) {
    throw new RangeError('Current I must be finite');
  }
  if (!Number.isFinite(resistance) || !(resistance >= 0)) {
    throw new RangeError('Resistance R must be non-negative');
  }
  if (!Number.isFinite(durationSeconds) || !(durationSeconds >= 0)) {
    throw new RangeError('Operating duration t must be non-negative');
  }
  return current * current * resistance * durationSeconds;
}

/** Converts energy from joules (J) to kilowatt-hours (kWh): 1 kWh = 3.6 × 10⁶ J. */
export function joulesToKilowattHours(joules: number): number {
  if (!Number.isFinite(joules)) throw new RangeError('Energy in joules must be finite');
  return joules / 3_600_000;
}

/** Converts energy from kilowatt-hours (kWh) to joules (J). */
export function kilowattHoursToJoules(kWh: number): number {
  if (!Number.isFinite(kWh)) throw new RangeError('Energy in kWh must be finite');
  return kWh * 3_600_000;
}

/**
 * Evaluates instantaneous power, cumulative Joule heating energy (J and kWh),
 * and illustrative lumped-element temperature at elapsed time `tSeconds`.
 */
export function evaluatePowerHeatingState(
  params: PowerHeatingParams,
  tSeconds: number,
): PowerHeatingState {
  const {
    voltage,
    resistance,
    ambientTempC = 22,
    thermalCapacityJK = 45,
    heatLossCoefficientWK = 1.5,
  } = params;

  if (!Number.isFinite(voltage) || !(voltage >= 0)) {
    throw new RangeError('Voltage V must be a non-negative finite number');
  }
  if (!Number.isFinite(resistance) || !(resistance > 0)) {
    throw new RangeError('Resistance R must be a finite positive number');
  }
  if (!Number.isFinite(tSeconds) || !(tSeconds >= 0)) {
    throw new RangeError('Elapsed time t must be a non-negative finite number');
  }
  if (!(thermalCapacityJK > 0) || !(heatLossCoefficientWK > 0)) {
    throw new RangeError('Thermal capacity and heat loss coefficient must be positive');
  }

  const current = voltage / resistance;
  const powerWatts = voltage * current;
  const powerKilowatts = powerWatts / 1000;
  const energyJoules = jouleHeatingEnergy(current, resistance, tSeconds);
  const energyKilojoules = energyJoules / 1000;
  const energyKWh = joulesToKilowattHours(energyJoules);
  const chargeCoulombs = current * tSeconds;

  const tauThermal = thermalCapacityJK / heatLossCoefficientWK;
  const deltaTMax = powerWatts / heatLossCoefficientWK;
  const illustrativeTempC = ambientTempC + deltaTMax * (1 - Math.exp(-tSeconds / tauThermal));
  const illustrativeSteadyStateTempC = ambientTempC + deltaTMax;

  return {
    t: tSeconds,
    voltage,
    resistance,
    current,
    powerWatts,
    powerKilowatts,
    energyJoules,
    energyKilojoules,
    energyKWh,
    chargeCoulombs,
    illustrativeTempC,
    illustrativeSteadyStateTempC,
  };
}

// ============================================================================
// 5. CAPACITORS, DIELECTRICS & CAPACITOR COMBINATIONS (PHASE 3.5)
// ============================================================================

export type CapacitorConnectionMode = 'connected' | 'isolated';

export interface CapacitorLabParams {
  /** Plate area A (m²), > 0. */
  plateAreaM2: number;
  /** Plate separation d (m), > 0. */
  separationM: number;
  /** Relative permittivity (dielectric constant) ε_r ≥ 1. */
  dielectricConstant: number;
  /** Battery supply voltage V₀ (V), ≥ 0. */
  supplyVoltage: number;
  /**
   * Whether the battery is connected ('connected', constant V = V₀) or
   * disconnected ('isolated', constant locked charge Q = Q_locked).
   */
  connectionMode?: CapacitorConnectionMode;
  /** Locked plate charge Q_locked (C) when operating in 'isolated' mode. */
  lockedChargeCoulombs?: number;
}

export interface CapacitorLabState {
  plateAreaM2: number;
  separationM: number;
  dielectricConstant: number;
  connectionMode: CapacitorConnectionMode;
  /** Vacuum capacitance without dielectric C₀ = ε₀ A / d (F). */
  vacuumCapacitance: number;
  /** Capacitance with dielectric C = ε₀ ε_r A / d (F). */
  capacitance: number;
  /** Terminal voltage across plates V = Q / C (V). */
  voltage: number;
  /** Stored magnitude of charge on each plate Q = C V (C). */
  charge: number;
  /** Uniform electric field magnitude between plates E = V / d (V/m). */
  electricField: number;
  /** Stored electrostatic energy U = ½ C V² = Q² / (2C) = ½ Q V (J). */
  storedEnergy: number;
  /** Energy density u_E = ½ ε₀ ε_r E² (J/m³). */
  energyDensity: number;
}

/**
 * Parallel-plate capacitance:
 *   C = ε₀ ε_r A / d  (F)
 */
export function parallelPlateCapacitance(
  plateAreaM2: number,
  separationM: number,
  relativePermittivity = 1,
): number {
  if (!Number.isFinite(plateAreaM2) || !(plateAreaM2 > 0)) {
    throw new RangeError('Plate area A must be positive');
  }
  if (!Number.isFinite(separationM) || !(separationM > 0)) {
    throw new RangeError('Plate separation d must be positive');
  }
  if (!Number.isFinite(relativePermittivity) || !(relativePermittivity >= 1)) {
    throw new RangeError('Relative permittivity ε_r must be ≥ 1');
  }
  return (VACUUM_PERMITTIVITY * relativePermittivity * plateAreaM2) / separationM;
}

/** Charge on a capacitor: Q = C V (C). */
export function capacitorCharge(capacitance: number, voltage: number): number {
  if (!Number.isFinite(capacitance) || !(capacitance > 0)) {
    throw new RangeError('Capacitance C must be positive');
  }
  if (!Number.isFinite(voltage)) {
    throw new RangeError('Voltage V must be finite');
  }
  return capacitance * voltage;
}

/** Uniform electric field between parallel plates: E = V / d (V/m). */
export function parallelPlateElectricField(voltage: number, separationM: number): number {
  if (!Number.isFinite(voltage)) {
    throw new RangeError('Voltage V must be finite');
  }
  if (!Number.isFinite(separationM) || !(separationM > 0)) {
    throw new RangeError('Plate separation d must be positive');
  }
  return Math.abs(voltage) / separationM;
}

/** Electrostatic energy stored in a capacitor: U = ½ C V² (J). */
export function capacitorEnergyFromCV(capacitance: number, voltage: number): number {
  if (!Number.isFinite(capacitance) || !(capacitance > 0)) {
    throw new RangeError('Capacitance C must be positive');
  }
  if (!Number.isFinite(voltage)) {
    throw new RangeError('Voltage V must be finite');
  }
  return 0.5 * capacitance * voltage * voltage;
}

/** Electrostatic energy from charge and capacitance: U = Q² / (2 C) (J). */
export function capacitorEnergyFromQC(charge: number, capacitance: number): number {
  if (!Number.isFinite(charge)) {
    throw new RangeError('Charge Q must be finite');
  }
  if (!Number.isFinite(capacitance) || !(capacitance > 0)) {
    throw new RangeError('Capacitance C must be positive');
  }
  return (charge * charge) / (2 * capacitance);
}

/** Electrostatic energy from charge and voltage: U = ½ Q V (J). */
export function capacitorEnergyFromQV(charge: number, voltage: number): number {
  if (!Number.isFinite(charge) || !Number.isFinite(voltage)) {
    throw new RangeError('Charge Q and voltage V must be finite');
  }
  return 0.5 * charge * voltage;
}

/** Equivalent capacitance of capacitors in series: 1/C_eq = Σ (1/C_i) (F). */
export function seriesCapacitance(capacitances: readonly number[]): number {
  if (capacitances.length === 0) throw new RangeError('At least one capacitor is required');
  if (capacitances.some((c) => !Number.isFinite(c) || !(c > 0))) {
    throw new RangeError('Capacitances must be positive');
  }
  return 1 / capacitances.reduce((sum, c) => sum + 1 / c, 0);
}

/** Equivalent capacitance of capacitors in parallel: C_eq = Σ C_i (F). */
export function parallelCapacitance(capacitances: readonly number[]): number {
  if (capacitances.length === 0) throw new RangeError('At least one capacitor is required');
  if (capacitances.some((c) => !Number.isFinite(c) || !(c > 0))) {
    throw new RangeError('Capacitances must be positive');
  }
  return capacitances.reduce((sum, c) => sum + c, 0);
}

/**
 * Evaluates the full state of a parallel-plate capacitor in either
 * constant-voltage ('connected') or isolated constant-charge ('isolated') mode.
 */
export function evaluateCapacitorState(params: CapacitorLabParams): CapacitorLabState {
  const {
    plateAreaM2,
    separationM,
    dielectricConstant,
    supplyVoltage,
    connectionMode = 'connected',
    lockedChargeCoulombs,
  } = params;

  if (!Number.isFinite(supplyVoltage) || !(supplyVoltage >= 0)) {
    throw new RangeError('Supply voltage V must be non-negative');
  }

  const vacuumCapacitance = parallelPlateCapacitance(plateAreaM2, separationM, 1);
  const capacitance = parallelPlateCapacitance(plateAreaM2, separationM, dielectricConstant);

  let voltage: number;
  let charge: number;

  if (connectionMode === 'isolated') {
    charge =
      lockedChargeCoulombs !== undefined && Number.isFinite(lockedChargeCoulombs)
        ? Math.max(0, lockedChargeCoulombs)
        : vacuumCapacitance * supplyVoltage;
    voltage = charge / capacitance;
  } else {
    voltage = supplyVoltage;
    charge = capacitance * voltage;
  }

  const electricField = parallelPlateElectricField(voltage, separationM);
  const storedEnergy = capacitorEnergyFromCV(capacitance, voltage);
  const volume = plateAreaM2 * separationM;
  const energyDensity = volume > 0 ? storedEnergy / volume : 0;

  return {
    plateAreaM2,
    separationM,
    dielectricConstant,
    connectionMode,
    vacuumCapacitance,
    capacitance,
    voltage,
    charge,
    electricField,
    storedEnergy,
    energyDensity,
  };
}

// ============================================================================
// 6. RC TRANSIENT CIRCUITS — CHARGING & DISCHARGING (PHASE 3.6)
// ============================================================================

export type RCCircuitMode = 'charging' | 'discharging';

export interface RCCircuitParams {
  /** Supply or initial capacitor voltage V₀ (V), > 0. */
  voltage: number;
  /** Series resistance R (Ω), > 0. */
  resistance: number;
  /** Capacitance C (F), > 0. */
  capacitance: number;
  /** Circuit switch mode: 'charging' (connected to battery) or 'discharging' (shorted through R). */
  mode: RCCircuitMode;
}

export interface RCCircuitState {
  /** Elapsed time t (s). */
  t: number;
  /** Time normalized by time constant: t / τ. */
  tauMultiple: number;
  /** Time constant τ = R C (s). */
  tau: number;
  /** Capacitor voltage V_C(t) (V). */
  capacitorVoltage: number;
  /** Resistor voltage V_R(t) = I(t) R (V). */
  resistorVoltage: number;
  /** Stored charge q(t) = C V_C(t) (C). */
  charge: number;
  /** Circuit current I(t) = dq/dt (A; positive while charging, negative while discharging). */
  current: number;
  /** Stored capacitor energy U_C(t) = ½ C V_C(t)² (J). */
  storedEnergy: number;
  /** Instantaneous resistor heating power P_R(t) = I(t)² R (W). */
  resistorPower: number;
  /** Percentage of maximum charge/voltage currently on the capacitor (%). */
  percentCharged: number;
  /** Percentage of charge/voltage discharged from full (%). */
  percentDischarged: number;
}

/** RC time constant τ = R C (s). */
export const rcTimeConstant = (resistance: number, capacitance: number): number => {
  if (!Number.isFinite(resistance) || !(resistance > 0)) {
    throw new RangeError('Resistance R must be positive');
  }
  if (!Number.isFinite(capacitance) || !(capacitance > 0)) {
    throw new RangeError('Capacitance C must be positive');
  }
  return resistance * capacitance;
};

/** Capacitor voltage while charging from 0 V through R: V_C = V₀ (1 − e^(−t/RC)). */
export function capacitorChargingVoltage(
  supplyVoltage: number,
  resistance: number,
  capacitance: number,
  t: number,
): number {
  const tau = rcTimeConstant(resistance, capacitance);
  if (!Number.isFinite(supplyVoltage) || !Number.isFinite(t) || t < 0) {
    throw new RangeError('Supply voltage must be finite and time t must be non-negative');
  }
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
  if (!Number.isFinite(initialVoltage) || !Number.isFinite(t) || t < 0) {
    throw new RangeError('Initial voltage must be finite and time t must be non-negative');
  }
  return initialVoltage * Math.exp(-t / tau);
}

/**
 * Evaluates the exact analytical RC transient state at time `t` (s) for either
 * charging or discharging mode.
 */
export function evaluateRCStateAt(params: RCCircuitParams, t: number): RCCircuitState {
  const { voltage, resistance, capacitance, mode } = params;
  if (!Number.isFinite(voltage) || !(voltage >= 0)) {
    throw new RangeError('Voltage V₀ must be a non-negative finite number');
  }
  if (!Number.isFinite(t) || t < 0) {
    throw new RangeError('Time t must be a non-negative finite number');
  }
  const tau = rcTimeConstant(resistance, capacitance);
  const expFactor = Math.exp(-t / tau);

  let capacitorVoltage: number;
  let resistorVoltage: number;
  let current: number;
  let percentCharged: number;

  if (mode === 'charging') {
    capacitorVoltage = voltage * (1 - expFactor);
    resistorVoltage = voltage * expFactor;
    current = (voltage / resistance) * expFactor;
    percentCharged = (1 - expFactor) * 100;
  } else {
    capacitorVoltage = voltage * expFactor;
    resistorVoltage = -voltage * expFactor;
    current = -(voltage / resistance) * expFactor;
    percentCharged = expFactor * 100;
  }

  const charge = capacitance * capacitorVoltage;
  const storedEnergy = 0.5 * capacitance * capacitorVoltage * capacitorVoltage;
  const resistorPower = current * current * resistance;
  const percentDischarged = Math.max(0, 100 - percentCharged);

  return {
    t,
    tauMultiple: t / tau,
    tau,
    capacitorVoltage,
    resistorVoltage,
    charge,
    current,
    storedEnergy,
    resistorPower,
    percentCharged,
    percentDischarged,
  };
}

/**
 * Samples the exact analytical RC transient trajectory across `[0, duration]`
 * (defaults to `5 τ`).
 */
export function simulateRCTrajectory(
  params: RCCircuitParams,
  options?: { duration?: number; sampleCount?: number },
): RCCircuitState[] {
  const tau = rcTimeConstant(params.resistance, params.capacitance);
  const duration =
    options?.duration !== undefined && options.duration > 0 ? options.duration : 5 * tau;
  const sampleCount = clamp(Math.round(options?.sampleCount ?? 201), 21, 501);
  const dt = duration / (sampleCount - 1);

  return Array.from({ length: sampleCount }, (_, i) => {
    const t = i === sampleCount - 1 ? duration : i * dt;
    return evaluateRCStateAt(params, t);
  });
}
