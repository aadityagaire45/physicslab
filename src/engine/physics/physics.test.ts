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
import {
  classifyCollision,
  collisionTrackStateAt,
  criticalInclineAngleDeg,
  inclinedPlaneStateAt,
  inclinedPlaneSummary,
  solveOneDimensionalCollision,
  validateCollisionParams,
  validateInclinedPlaneParams,
} from '@/engine/physics/mechanics';
import { cyclotronRadius, straightWireField } from '@/engine/physics/magnetism';
import { photoelectricMaxKineticEnergyEv, remainingNuclei } from '@/engine/physics/modern';
import { criticalAngle, refractionAngle, thinLensImageDistance } from '@/engine/physics/optics';
import {
  dampedDisplacement,
  dampedEnvelope,
  dampingRegime,
  hookesLawForce,
  measurePendulumPeriod,
  pendulumPeriodExact,
  pendulumPeriodSmallAngle,
  pendulumStateAt,
  pendulumSummary,
  simulatePendulumTrajectory,
  simulateSpringMassTrajectory,
  springAngularFrequency,
  springFrequency,
  springMassStateAt,
  springMassSummary,
  springPeriod,
  validatePendulumParams,
  validateSpringMassParams,
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

  it('resolves inclined plane forces, static threshold, critical angle, and stationary vs sliding states', () => {
    const stationaryParams = {
      mass: 4.0,
      angleDeg: 20,
      staticFriction: 0.5,
      kineticFriction: 0.35,
      gravity: 10.0,
      initialVelocity: 0,
    };
    const st0 = inclinedPlaneStateAt(stationaryParams, 2.0);
    const theta20 = degToRad(20);
    expect(st0.weight).toBeCloseTo(40, 12);
    expect(st0.normalForce).toBeCloseTo(40 * Math.cos(theta20), 12);
    expect(st0.gravityParallel).toBeCloseTo(40 * Math.sin(theta20), 12);
    expect(st0.maxStaticFriction).toBeCloseTo(0.5 * 40 * Math.cos(theta20), 12);
    expect(st0.kineticFrictionForce).toBeCloseTo(0.35 * 40 * Math.cos(theta20), 12);

    // Since tan(20°) ≈ 0.364 ≤ μ_s = 0.5, the block remains stationary and uses static friction (not kinetic)
    expect(st0.motionRegime).toBe('stationary');
    expect(st0.s).toBe(0);
    expect(st0.v).toBe(0);
    expect(st0.a).toBe(0);
    expect(st0.frictionMode).toBe('static');
    expect(st0.frictionDirection).toBe('uphill');
    expect(st0.frictionMagnitude).toBeCloseTo(st0.gravityParallel, 12);
    expect(st0.netForce).toBe(0);

    // Critical angle θ_c = arctan(μ_s)
    const thetaC = criticalInclineAngleDeg(0.5);
    expect(thetaC).toBeCloseTo(radToDeg(Math.atan(0.5)), 12);
    const limiting = inclinedPlaneStateAt({ ...stationaryParams, angleDeg: thetaC }, 0);
    expect(limiting.motionRegime).toBe('limiting-equilibrium');
    expect(limiting.a).toBe(0);

    // Downward sliding when θ > θ_c
    const slidingParams = { ...stationaryParams, angleDeg: 35 };
    const theta35 = degToRad(35);
    const expectedADown = 10.0 * (Math.sin(theta35) - 0.35 * Math.cos(theta35));
    const stSlide = inclinedPlaneStateAt(slidingParams, 2.0);
    expect(stSlide.motionRegime).toBe('sliding-down');
    expect(stSlide.frictionMode).toBe('kinetic');
    expect(stSlide.frictionDirection).toBe('uphill');
    expect(stSlide.frictionMagnitude).toBeCloseTo(stSlide.kineticFrictionForce, 12);
    expect(stSlide.a).toBeCloseTo(expectedADown, 12);
    expect(stSlide.v).toBeCloseTo(expectedADown * 2.0, 12);
    expect(stSlide.s).toBeCloseTo(0.5 * expectedADown * 4.0, 12);
    // Work-energy balance: -ΔU = K + E_thermal
    expect(-stSlide.potentialEnergyChange).toBeCloseTo(stSlide.kineticEnergy + stSlide.thermalEnergy, 9);
  });

  it('handles upward sliding friction direction, turnaround sticking/reversal, zero-angle, and invalid inputs', () => {
    // Upward launch (v₀ < 0) on a gentle rough slope (θ = 15°, μ_s = 0.6, μ_k = 0.4) -> sticks at turnaround
    const uphillStickParams = {
      mass: 2.0,
      angleDeg: 15,
      staticFriction: 0.6,
      kineticFriction: 0.4,
      gravity: 10.0,
      initialVelocity: -4.0,
    };
    const theta15 = degToRad(15);
    const expectedAUp = 10.0 * (Math.sin(theta15) + 0.4 * Math.cos(theta15));
    const stUp = inclinedPlaneStateAt(uphillStickParams, 0.2);
    expect(stUp.motionRegime).toBe('sliding-up');
    expect(stUp.frictionMode).toBe('kinetic');
    // During upward sliding, kinetic friction points downhill (+s)
    expect(stUp.frictionDirection).toBe('downhill');
    expect(stUp.a).toBeCloseTo(expectedAUp, 12);

    const summaryStick = inclinedPlaneSummary(uphillStickParams);
    expect(summaryStick.transitionTime).toBeCloseTo(4.0 / expectedAUp, 12);
    const stAfterTurn = inclinedPlaneStateAt(uphillStickParams, summaryStick.transitionTime! + 1.0);
    expect(stAfterTurn.motionRegime).toBe('stationary');
    expect(stAfterTurn.v).toBe(0);
    expect(stAfterTurn.a).toBe(0);
    expect(stAfterTurn.frictionMode).toBe('static');
    expect(stAfterTurn.frictionDirection).toBe('uphill');

    // Upward launch on a steep slope (θ = 40°, μ_s = 0.3, μ_k = 0.2) -> reverses at turnaround and slides downhill
    const uphillReverseParams = {
      mass: 2.0,
      angleDeg: 40,
      staticFriction: 0.3,
      kineticFriction: 0.2,
      gravity: 10.0,
      initialVelocity: -3.0,
    };
    const summaryRev = inclinedPlaneSummary(uphillReverseParams);
    const stAfterRev = inclinedPlaneStateAt(uphillReverseParams, summaryRev.transitionTime! + 0.8);
    expect(stAfterRev.motionRegime).toBe('sliding-down');
    expect(stAfterRev.v).toBeGreaterThan(0);
    expect(stAfterRev.frictionDirection).toBe('uphill');

    // Zero-angle horizontal surface at rest
    const horiz = inclinedPlaneStateAt(
      { mass: 5, angleDeg: 0, staticFriction: 0.4, kineticFriction: 0.3, gravity: 9.81, initialVelocity: 0 },
      1.0,
    );
    expect(horiz.normalForce).toBeCloseTo(5 * 9.81, 12);
    expect(horiz.gravityParallel).toBe(0);
    expect(horiz.frictionMagnitude).toBe(0);
    expect(horiz.frictionMode).toBe('none');

    // Parameter validation
    expect(() =>
      validateInclinedPlaneParams({
        mass: 0,
        angleDeg: 20,
        staticFriction: 0.4,
        kineticFriction: 0.3,
        gravity: 9.81,
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateInclinedPlaneParams({
        mass: 2,
        angleDeg: 70,
        staticFriction: 0.4,
        kineticFriction: 0.3,
        gravity: 9.81,
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateInclinedPlaneParams({
        mass: 2,
        angleDeg: 20,
        staticFriction: 0.2,
        kineticFriction: 0.4, // μ_k > μ_s invalid
        gravity: 9.81,
      }),
    ).toThrow(RangeError);
  });

  it('solves 1D elastic, partially inelastic, and perfectly inelastic collisions while strictly conserving momentum', () => {
    // 1. Equal masses, elastic collision with stationary target -> complete velocity transfer
    const equalElastic = solveOneDimensionalCollision({
      m1: 2.0,
      m2: 2.0,
      u1: 4.0,
      u2: 0.0,
      restitution: 1.0,
    });
    expect(equalElastic.classification).toBe('perfectly-elastic');
    expect(equalElastic.willCollide).toBe(true);
    expect(equalElastic.v1).toBeCloseTo(0, 12);
    expect(equalElastic.v2).toBeCloseTo(4.0, 12);
    expect(equalElastic.initialMomentum).toBeCloseTo(equalElastic.finalMomentum, 12);
    expect(equalElastic.momentumDifference).toBe(0);
    expect(equalElastic.initialKineticEnergy).toBeCloseTo(equalElastic.finalKineticEnergy, 12);
    expect(equalElastic.kineticEnergyLost).toBe(0);
    expect(equalElastic.realizedRestitution).toBeCloseTo(1.0, 12);

    // 2. Equal masses, perfectly inelastic collision -> objects couple at v_cm = u1 / 2 and lose 50% of K_i
    const equalInelastic = solveOneDimensionalCollision({
      m1: 3.0,
      m2: 3.0,
      u1: 4.0,
      u2: 0.0,
      restitution: 0.0,
    });
    expect(equalInelastic.classification).toBe('perfectly-inelastic');
    expect(equalInelastic.v1).toBeCloseTo(2.0, 12);
    expect(equalInelastic.v2).toBeCloseTo(2.0, 12);
    expect(equalInelastic.initialMomentum).toBeCloseTo(equalInelastic.finalMomentum, 12);
    expect(equalInelastic.kineticEnergyLost).toBeCloseTo(equalInelastic.initialKineticEnergy * 0.5, 12);
    expect(equalInelastic.realizedRestitution).toBe(0);

    // Verify both objects move together at identical positions after t_c in perfectly inelastic collision
    const postState = collisionTrackStateAt(
      { m1: 3.0, m2: 3.0, u1: 4.0, u2: 0.0, restitution: 0.0, initialSeparation: 4.0 },
      equalInelastic.collisionTime! + 1.5,
    );
    expect(postState.phase).toBe('post-collision');
    expect(postState.x1).toBeCloseTo(postState.x2, 12);
    expect(postState.v1).toBeCloseTo(postState.v2, 12);

    // 3. Partially inelastic head-on collision (opposite-direction motion, unequal masses)
    const headOn = solveOneDimensionalCollision({
      m1: 2.0,
      m2: 3.0,
      u1: 3.5,
      u2: -2.5,
      restitution: 0.6,
    });
    expect(headOn.classification).toBe('partially-inelastic');
    expect(headOn.initialMomentum).toBeCloseTo(headOn.finalMomentum, 12);
    expect(headOn.realizedRestitution).toBeCloseTo(0.6, 12);
    const expectedKLost = 0.5 * ((2 * 3) / 5) * (1 - 0.36) * Math.pow(3.5 - -2.5, 2);
    expect(headOn.kineticEnergyLost).toBeCloseTo(expectedKLost, 12);
    expect(headOn.finalKineticEnergy).toBeLessThan(headOn.initialKineticEnergy);
  });

  it('handles heavy/light mass ratios, equal velocities, non-colliding trajectories, and invalid collision inputs', () => {
    // Heavy hitting stationary light (m1 >> m2): both move forward, v2 > u1
    const heavyLight = solveOneDimensionalCollision({
      m1: 10.0,
      m2: 1.0,
      u1: 3.0,
      u2: 0.0,
      restitution: 1.0,
    });
    expect(heavyLight.v1).toBeGreaterThan(0);
    expect(heavyLight.v2).toBeGreaterThan(3.0);
    expect(heavyLight.initialMomentum).toBeCloseTo(heavyLight.finalMomentum, 12);

    // Light hitting stationary heavy (m1 << m2): object 1 rebounds (v1 < 0)
    const lightHeavy = solveOneDimensionalCollision({
      m1: 1.0,
      m2: 10.0,
      u1: 3.0,
      u2: 0.0,
      restitution: 1.0,
    });
    expect(lightHeavy.v1).toBeLessThan(0);
    expect(lightHeavy.v2).toBeGreaterThan(0);
    expect(lightHeavy.initialMomentum).toBeCloseTo(lightHeavy.finalMomentum, 12);

    // Equal initial velocities (u1 = u2): safe handling with no division by zero
    const equalVel = solveOneDimensionalCollision({
      m1: 2.0,
      m2: 4.0,
      u1: 2.5,
      u2: 2.5,
      restitution: 0.8,
    });
    expect(equalVel.willCollide).toBe(false);
    expect(equalVel.collisionTime).toBeNull();
    expect(equalVel.realizedRestitution).toBeNull();
    expect(equalVel.v1).toBeCloseTo(2.5, 12);
    expect(equalVel.v2).toBeCloseTo(2.5, 12);
    expect(equalVel.kineticEnergyLost).toBe(0);

    // Invalid inputs
    expect(() => classifyCollision(-0.1)).toThrow(RangeError);
    expect(() =>
      validateCollisionParams({ m1: 0, m2: 2, u1: 1, u2: 0, restitution: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      validateCollisionParams({ m1: 2, m2: -1, u1: 1, u2: 0, restitution: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      validateCollisionParams({ m1: 2, m2: 2, u1: 1, u2: 0, restitution: -0.2 }),
    ).toThrow(RangeError);
    expect(() =>
      validateCollisionParams({ m1: 2, m2: 2, u1: 1, u2: 0, restitution: 2.0 }),
    ).toThrow(RangeError);
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

  it('evaluates Hooke’s law, natural angular frequency, period, frequency, and damped frequency for spring–mass systems', () => {
    expect(hookesLawForce(25, 0.4)).toBeCloseTo(-10, 12);
    expect(hookesLawForce(25, -0.4)).toBeCloseTo(10, 12);
    expect(hookesLawForce(25, 0)).toBe(0);

    const m = 2.0;
    const k = 32.0;
    const omega0 = springAngularFrequency(m, k);
    const period = springPeriod(m, k);
    const freq = springFrequency(m, k);
    expect(omega0).toBeCloseTo(4.0, 12);
    expect(period).toBeCloseTo((2 * Math.PI) / 4.0, 12);
    expect(freq).toBeCloseTo(4.0 / (2 * Math.PI), 12);

    const underSummary = springMassSummary({
      mass: m,
      springConstant: k,
      initialDisplacement: 0.5,
      initialVelocity: 0,
      damping: 4.0, // gamma = 1.0 < omega0 = 4.0
    });
    expect(underSummary.regime).toBe('underdamped');
    expect(underSummary.dampedAngularFrequency).toBeCloseTo(Math.sqrt(15), 12);
    expect(underSummary.dampingRatio).toBeCloseTo(0.25, 12);

    const critSummary = springMassSummary({
      mass: m,
      springConstant: k,
      initialDisplacement: 0.5,
      initialVelocity: 0,
      damping: 16.0, // b_c = 2 * sqrt(64) = 16
    });
    expect(critSummary.regime).toBe('critically-damped');
    expect(critSummary.dampedAngularFrequency).toBeNull();
    expect(critSummary.dampingRatio).toBeCloseTo(1.0, 12);

    const overSummary = springMassSummary({
      mass: m,
      springConstant: k,
      initialDisplacement: 0.5,
      initialVelocity: 0,
      damping: 24.0,
    });
    expect(overSummary.regime).toBe('overdamped');
    expect(overSummary.dampedAngularFrequency).toBeNull();
  });

  it('matches RK4 spring–mass integration to exact analytical solutions across all regimes and conserves/dissipates energy accurately', () => {
    const regimes: Array<{ damping: number; label: string }> = [
      { damping: 0, label: 'undamped' },
      { damping: 1.2, label: 'underdamped' },
      { damping: 8.0, label: 'critically-damped' },
      { damping: 14.0, label: 'overdamped' },
    ];

    for (const r of regimes) {
      const params = {
        mass: 1.0,
        springConstant: 16.0,
        initialDisplacement: 0.6,
        initialVelocity: -1.2,
        damping: r.damping,
      };
      const states = simulateSpringMassTrajectory(params, 5, 201, 0.0015);
      for (const s of states) {
        expect(s.x).toBeCloseTo(s.xAnalytical, 6);
        expect(s.v).toBeCloseTo(s.vAnalytical, 5);
        expect(s.a).toBeCloseTo(s.aAnalytical, 4);
      }

      if (r.damping === 0) {
        const e0 = states[0].totalEnergy;
        for (const s of states) {
          expect(s.totalEnergy).toBeCloseTo(e0, 6);
        }
        const mid = springMassStateAt(params, states, 2.345);
        expect(mid.totalEnergy).toBeCloseTo(e0, 6);
      } else {
        for (let i = 1; i < states.length; i += 1) {
          expect(states[i].totalEnergy).toBeLessThanOrEqual(states[i - 1].totalEnergy + 1e-12);
        }
        expect(states[states.length - 1].totalEnergy).toBeLessThan(states[0].totalEnergy * 0.15);
      }
    }

    expect(() => hookesLawForce(0, 0.5)).toThrow(RangeError);
    expect(() => springAngularFrequency(-1, 10)).toThrow(RangeError);
    expect(() => springPeriod(1, 0)).toThrow(RangeError);
    expect(() =>
      validateSpringMassParams({
        mass: 0,
        springConstant: 10,
        initialDisplacement: 0.2,
        initialVelocity: 0,
        damping: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateSpringMassParams({
        mass: 1,
        springConstant: 10,
        initialDisplacement: 0.2,
        initialVelocity: 0,
        damping: -0.5,
      }),
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
