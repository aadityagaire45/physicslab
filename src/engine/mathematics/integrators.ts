/**
 * Ordinary differential equation integrators operating on plain state
 * vectors. The derivative function receives the time and current state and
 * returns dState/dt. These are framework-agnostic and allocation-light.
 */

export type StateVector = readonly number[];
export type Derivative = (t: number, state: StateVector) => number[];

/** Explicit (forward) Euler step — first order. Useful for comparison only. */
export function eulerStep(f: Derivative, t: number, state: StateVector, dt: number): number[] {
  const k = f(t, state);
  return state.map((value, i) => value + dt * k[i]);
}

/** Semi-implicit (symplectic) Euler for [position..., velocity...] states. */
export function semiImplicitEulerStep(
  f: Derivative,
  t: number,
  state: StateVector,
  dt: number,
): number[] {
  const half = state.length / 2;
  const derivative = f(t, state);
  const next = [...state];
  for (let i = half; i < state.length; i += 1) next[i] = state[i] + dt * derivative[i];
  for (let i = 0; i < half; i += 1) next[i] = state[i] + dt * next[i + half];
  return next;
}

/** Classical fourth-order Runge–Kutta step. */
export function rk4Step(f: Derivative, t: number, state: StateVector, dt: number): number[] {
  const k1 = f(t, state);
  const k2 = f(
    t + dt / 2,
    state.map((v, i) => v + (dt / 2) * k1[i]),
  );
  const k3 = f(
    t + dt / 2,
    state.map((v, i) => v + (dt / 2) * k2[i]),
  );
  const k4 = f(
    t + dt,
    state.map((v, i) => v + dt * k3[i]),
  );
  return state.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
