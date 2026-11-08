/**
 * Fixed-timestep simulation loop driven by requestAnimationFrame.
 *
 * Physics advances in constant increments (`fixedDt`) independent of display
 * refresh rate, which keeps results deterministic on 60 Hz laptops and
 * 144 Hz monitors alike. Rendering happens once per animation frame.
 * Browsers pause requestAnimationFrame in background tabs, so no CPU is used
 * while the lab is hidden.
 */
export interface SimulationLoopOptions {
  /** Advance the simulation by exactly `dt` seconds of simulated time. */
  step: (dt: number) => void;
  /** Draw the current state. `alpha` ∈ [0, 1) is the interpolation factor. */
  render: (alpha: number) => void;
  /** Fixed physics timestep in seconds (default 1/240 s). */
  fixedDt?: number;
  /** Simulated seconds per real second (default 1). */
  timeScale?: number;
  /** Upper bound on real time processed per frame, prevents spiral of death. */
  maxFrameTime?: number;
}

export interface SimulationLoop {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  setTimeScale: (scale: number) => void;
}

export function createSimulationLoop(options: SimulationLoopOptions): SimulationLoop {
  const fixedDt = options.fixedDt ?? 1 / 240;
  const maxFrameTime = options.maxFrameTime ?? 0.1;
  let timeScale = options.timeScale ?? 1;
  let frameId: number | null = null;
  let lastTimestamp: number | null = null;
  let accumulator = 0;

  const frame = (timestamp: number) => {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const realDelta = Math.min((timestamp - lastTimestamp) / 1000, maxFrameTime);
    lastTimestamp = timestamp;
    accumulator += realDelta * timeScale;

    while (accumulator >= fixedDt) {
      options.step(fixedDt);
      accumulator -= fixedDt;
    }

    options.render(accumulator / fixedDt);
    if (frameId !== null) frameId = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (frameId !== null) return;
      lastTimestamp = null;
      accumulator = 0;
      frameId = requestAnimationFrame(frame);
    },
    stop() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    },
    isRunning: () => frameId !== null,
    setTimeScale(scale: number) {
      timeScale = Math.max(0, scale);
    },
  };
}
