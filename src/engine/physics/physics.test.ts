import { describe, expect, it } from 'vitest';
import { rk4Step } from '@/engine/mathematics/integrators';
import { approxEqual, completeEllipticK } from '@/engine/mathematics/numeric';
import {
  capacitorChargingVoltage,
  ohmsLawCurrent,
  parallelResistance,
  seriesResistance,
} from '@/engine/physics/electricity';
import { voltageDividerOutput } from '@/engine/physics/electronics';
import { levelGroundRange, projectileStateAt, projectileSummary, timeOfFlight } from '@/engine/physics/kinematics';
import { cyclotronRadius, straightWireField } from '@/engine/physics/magnetism';
import { photoelectricMaxKineticEnergyEv, remainingNuclei } from '@/engine/physics/modern';
import { criticalAngle, refractionAngle, thinLensImageDistance } from '@/engine/physics/optics';
import {
  dampedDisplacement,
  dampedEnvelope,
  dampingRegime,
  measurePendulumPeriod,
  pendulumPeriodExact,
  pendulumPeriodSmallAngle,
  pendulumStateAt,
  pendulumSummary,
  simulatePendulumTrajectory,
  validatePendulumParams,
} from '@/engine/physics/oscillations';
import { carnotEfficiency, idealGasPressure } from '@/engine/physics/thermodynamics';
import { stringHarmonicFrequency, travellingWave, waveSpeed } from '@/engine/physics/waves';
import { STANDARD_GRAVITY } from '@/engine/units/constants';
import { celsiusToKelvin, degToRad, radToDeg } from '@/engine/units/conversions';
import { formatNumber, formatQuantity } from '@/engine/units/format';

describe('physics engine — kinematics', () => {
  it('computes symmetric range for complementary launch angles on level ground', () => {
    const r30 = levelGroundRange(25, 30, STANDARD_GRAVITY);
    const r60 = levelGroundRange(25, 60, STANDARD_GRAVITY);
    const r45 = levelGroundRange(25, 45, STANDARD_GRAVITY);
    expect(approxEqual(r30, r60, 1e-12)).toBe(true);
    expect(r45).toBeGreaterThan(r30);
  });

  it('returns projectile to y = 0 at t = timeOfFlight', () => {
    const params = { speed: 20, angleDeg: 37, height: 12, gravity: STANDARD_GRAVITY };
    const T = timeOfFlight(params);
    const end = projectileStateAt(params, T);
    const summary = projectileSummary(params);
    expect(end.y).toBeCloseTo(0, 9);
    expect(summary.range).toBeCloseTo(end.x, 9);
    expect(summary.maxHeight).toBeGreaterThan(params.height);
  });

  it('validates parameters in levelGroundRange', () => {
    expect(() => levelGroundRange(-5, 45, STANDARD_GRAVITY)).toThrow(RangeError);
    expect(() => levelGroundRange(10, 120, STANDARD_GRAVITY)).toThrow(RangeError);
    expect(() => levelGroundRange(10, 45, 0)).toThrow(RangeError);
  });
});

describe('physics engine — oscillations & integrators', () => {
  it('matches exact pendulum period to small-angle limit as amplitude approaches zero', () => {
    const t0 = pendulumPeriodSmallAngle(1.0, STANDARD_GRAVITY);
    const tSmall = pendulumPeriodExact(1.0, STANDARD_GRAVITY, degToRad(1));
    const tLarge = pendulumPeriodExact(1.0, STANDARD_GRAVITY, degToRad(60));
    expect(tSmall).toBeCloseTo(t0, 4);
    expect(tLarge).toBeGreaterThan(t0);
    expect(completeEllipticK(0)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('classifies undamped, underdamped, critical and overdamped regimes and bounds x(t) with dampedEnvelope', () => {
    const undamped = { amplitude: 1.5, mass: 1, springConstant: 4, damping: 0 };
    const underdamped = { amplitude: 1.5, mass: 1, springConstant: 12, damping: 1.2 };
    const critical = { amplitude: 1.5, mass: 1, springConstant: 4, damping: 4 };
    const overdamped = { amplitude: 1.5, mass: 1, springConstant: 4, damping: 8 };

    expect(dampingRegime(undamped)).toBe('undamped');
    expect(dampingRegime(underdamped)).toBe('underdamped');
    expect(dampingRegime(critical)).toBe('critically-damped');
    expect(dampingRegime(overdamped)).toBe('overdamped');

    expect(dampedDisplacement(underdamped, 0)).toBeCloseTo(1.5, 12);
    expect(dampedEnvelope(undamped, 3.7)).toBeCloseTo(1.5, 12);
    expect(dampedEnvelope(critical, 1.0)).toBeNull();
    expect(dampedEnvelope(overdamped, 1.0)).toBeNull();

    // Verify |x(t)| <= E(t) for all sampled instants in the underdamped regime,
    // and that |x(t)| reaches E(t) at the tangency instant omega_d * t = atan(gamma / omega_d).
    for (let t = 0; t <= 10; t += 0.05) {
      const x = Math.abs(dampedDisplacement(underdamped, t));
      const env = dampedEnvelope(underdamped, t)!;
      expect(x).toBeLessThanOrEqual(env + 1e-12);
    }
    const omega0 = Math.sqrt(underdamped.springConstant / underdamped.mass);
    const gamma = underdamped.damping / (2 * underdamped.mass);
    const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
    const tTangent = Math.atan(gamma / omegaD) / omegaD;
    expect(dampedDisplacement(underdamped, tTangent)).toBeCloseTo(
      dampedEnvelope(underdamped, tTangent)!,
      12,
    );
  });

  it('integrates simple harmonic motion accurately with RK4', () => {
    // x'' = -x with x(0) = 1, v(0) = 0 has exact solution x(t) = cos(t)
    let state = [1, 0];
    const dt = 0.01;
    for (let i = 0; i < 100; i += 1) {
      state = rk4Step((_t, [x, v]) => [v, -x], i * dt, state, dt);
    }
    expect(state[0]).toBeCloseTo(Math.cos(1), 6);
  });

  it('matches RK4 simulated pendulum period to small-angle and exact elliptic periods across amplitudes and masses', () => {
    const smallAngleParams1 = {
      length: 1.5,
      mass: 0.5,
      gravity: STANDARD_GRAVITY,
      initialAngleDeg: 3,
      damping: 0,
    };
    const smallAngleParams2 = { ...smallAngleParams1, mass: 8.0 };
    const t0 = pendulumPeriodSmallAngle(1.5, STANDARD_GRAVITY);
    const measuredSmall1 = measurePendulumPeriod(smallAngleParams1)!;
    const measuredSmall2 = measurePendulumPeriod(smallAngleParams2)!;

    expect(measuredSmall1).toBeCloseTo(t0, 3);
    // Undamped period is independent of bob mass
    expect(measuredSmall1).toBeCloseTo(measuredSmall2, 9);

    // Large-angle nonlinear regime (90° and 150°)
    const large90 = {
      length: 1.2,
      mass: 1.0,
      gravity: STANDARD_GRAVITY,
      initialAngleDeg: 90,
      damping: 0,
    };
    const exact90 = pendulumPeriodExact(1.2, STANDARD_GRAVITY, degToRad(90));
    const measured90 = measurePendulumPeriod(large90)!;
    expect(measured90).toBeCloseTo(exact90, 3);
    expect(measured90).toBeGreaterThan(pendulumPeriodSmallAngle(1.2, STANDARD_GRAVITY) * 1.15);

    const large150 = { ...large90, initialAngleDeg: 150 };
    const exact150 = pendulumPeriodExact(1.2, STANDARD_GRAVITY, degToRad(150));
    const measured150 = measurePendulumPeriod(large150)!;
    expect(measured150).toBeCloseTo(exact150, 2);
  });

  it('conserves mechanical energy when damping is zero and dissipates energy monotonically when damping is positive', () => {
    const undampedParams = {
      length: 1.6,
      mass: 1.25,
      gravity: STANDARD_GRAVITY,
      initialAngleDeg: 110,
      damping: 0,
    };
    const summaryUndamped = pendulumSummary(undampedParams);
    const undampedStates = simulatePendulumTrajectory(undampedParams, 8, 201, 0.0015);

    for (const s of undampedStates) {
      expect(s.totalEnergy).toBeCloseTo(summaryUndamped.initialEnergy, 6);
      expect(s.kineticEnergy).toBeGreaterThanOrEqual(0);
      expect(s.potentialEnergy).toBeGreaterThanOrEqual(0);
    }

    // Interpolated state at an arbitrary intermediate time matches conserved energy
    const midState = pendulumStateAt(undampedParams, undampedStates, 3.14159);
    expect(midState.totalEnergy).toBeCloseTo(summaryUndamped.initialEnergy, 6);

    // Damped pendulum loses mechanical energy monotonically
    const dampedParams = { ...undampedParams, damping: 0.35 };
    const dampedStates = simulatePendulumTrajectory(dampedParams, 8, 161, 0.002);
    for (let i = 1; i < dampedStates.length; i += 1) {
      expect(dampedStates[i].totalEnergy).toBeLessThanOrEqual(dampedStates[i - 1].totalEnergy + 1e-12);
    }
    expect(dampedStates[dampedStates.length - 1].totalEnergy).toBeLessThan(
      dampedStates[0].totalEnergy * 0.25,
    );
  });

  it('maintains numerical stability at high initial angles and rejects invalid pendulum parameters', () => {
    const highAngleParams = {
      length: 1.0,
      mass: 1.0,
      gravity: STANDARD_GRAVITY,
      initialAngleDeg: 170,
      damping: 0,
    };
    const states = simulatePendulumTrajectory(highAngleParams, 10, 201, 0.0015);
    for (const s of states) {
      expect(Number.isFinite(s.theta)).toBe(true);
      expect(Number.isFinite(s.omega)).toBe(true);
      expect(Math.abs(s.thetaDeg)).toBeLessThanOrEqual(170.01);
    }

    expect(() =>
      validatePendulumParams({ length: 0, mass: 1, gravity: 9.8, initialAngleDeg: 30, damping: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      validatePendulumParams({ length: 1, mass: -1, gravity: 9.8, initialAngleDeg: 30, damping: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      validatePendulumParams({ length: 1, mass: 1, gravity: 0, initialAngleDeg: 30, damping: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      validatePendulumParams({ length: 1, mass: 1, gravity: 9.8, initialAngleDeg: 180, damping: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      validatePendulumParams({ length: 1, mass: 1, gravity: 9.8, initialAngleDeg: 30, damping: -0.1 }),
    ).toThrow(RangeError);
  });
});

describe('physics engine — electricity, magnetism, waves, optics, thermo, modern, electronics', () => {
  it('evaluates series/parallel resistance and RC charging at t = RC', () => {
    expect(seriesResistance([10, 20, 30])).toBe(60);
    expect(parallelResistance([10, 10])).toBeCloseTo(5, 12);
    expect(ohmsLawCurrent(12, 4)).toBe(3);
    const vTau = capacitorChargingVoltage(10, 1000, 1e-3, 1);
    expect(vTau).toBeCloseTo(10 * (1 - Math.exp(-1)), 9);
  });

  it('evaluates magnetic field of a straight wire and cyclotron radius', () => {
    expect(straightWireField(10, 0.05)).toBeCloseTo(4e-5, 9);
    expect(cyclotronRadius(1, 10, 2, 5)).toBeCloseTo(1, 12);
  });

  it('evaluates wave speed, harmonics and validates travellingWave inputs', () => {
    expect(waveSpeed(250, 1.36)).toBeCloseTo(340, 9);
    expect(stringHarmonicFrequency(3, 100, 2)).toBeCloseTo(75, 9);
    expect(travellingWave({ amplitude: 2, wavelength: 4, frequency: 1 }, 1, 0)).toBeCloseTo(2, 12);
    expect(() => travellingWave({ amplitude: 1, wavelength: 0, frequency: 1 }, 0, 0)).toThrow(RangeError);
    expect(() => travellingWave({ amplitude: 1, wavelength: 2, frequency: -1 }, 0, 0)).toThrow(RangeError);
  });

  it('handles Snell refraction and total internal reflection', () => {
    const crit = criticalAngle(1.5, 1.0);
    expect(crit).not.toBeNull();
    expect(radToDeg(crit!)).toBeCloseTo(41.8103, 3);
    expect(refractionAngle(1.5, 1.0, degToRad(60))).toBeNull();
    expect(thinLensImageDistance(0.1, 0.2)).toBeCloseTo(0.2, 9);
  });

  it('evaluates ideal gas pressure and Carnot efficiency', () => {
    expect(celsiusToKelvin(0)).toBeCloseTo(273.15, 6);
    expect(idealGasPressure(1, 273.15, 0.022414)).toBeCloseTo(101_325, -2);
    expect(carnotEfficiency(300, 600)).toBeCloseTo(0.5, 12);
  });

  it('evaluates photoelectric kinetic energy, half-life decay and voltage divider', () => {
    expect(photoelectricMaxKineticEnergyEv(200e-9, 4.2)).toBeGreaterThan(1.9);
    expect(photoelectricMaxKineticEnergyEv(800e-9, 4.2)).toBe(0);
    expect(remainingNuclei(1000, 10, 30)).toBeCloseTo(125, 9);
    expect(voltageDividerOutput(12, 1000, 3000)).toBeCloseTo(9, 12);
    expect(formatQuantity(0.0042, 'A', 3)).toBe('4.20 mA');
    expect(formatQuantity(0.9999, 'A', 3)).toBe('1.00 A');
    expect(formatQuantity(999.9, 'V', 3)).toBe('1.00 kV');
    expect(formatQuantity(-0.9999, 'A', 3)).toBe('−1.00 A');
    expect(formatNumber(999_999, 3)).toBe('1.00 × 10⁶');
  });
});
