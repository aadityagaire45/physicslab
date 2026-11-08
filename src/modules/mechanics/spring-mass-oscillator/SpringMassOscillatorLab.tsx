import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, NotebookPen, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { clamp } from '@/engine/mathematics/numeric';
import {
  simulateSpringMassTrajectory,
  springMassStateAt,
  springMassSummary,
  type SpringMassParams,
} from '@/engine/physics/oscillations';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { formatNumber } from '@/engine/units/format';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsDark } from '@/hooks/useTheme';
import { useNotebookStore } from '@/store/notebookStore';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { Toggle } from '@/components/controls/Toggle';
import { PlotChart } from '@/components/graphs/PlotChart';

const TIME_SCALES = [
  { value: '0.25', label: '0.25×' },
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
] as const;

const KINEMATIC_TABS = [
  { value: 'displacement', label: 'x(t) Displacement' },
  { value: 'velocity', label: 'v(t) Velocity' },
  { value: 'acceleration', label: 'a(t) Acceleration' },
] as const;

type KinematicTab = (typeof KINEMATIC_TABS)[number]['value'];

const ENERGY_TABS = [
  { value: 'all', label: 'K, U & Total E(t)' },
  { value: 'kinetic', label: 'K(t) Kinetic' },
  { value: 'potential', label: 'U(t) Potential' },
  { value: 'total', label: 'E(t) Total Mechanical' },
] as const;

type EnergyTab = (typeof ENERGY_TABS)[number]['value'];

const DAMPING_PRESETS = [
  { id: 'undamped', label: 'Undamped oscillator', zeta: 0, sub: 'ζ = 0 (b = 0)' },
  { id: 'light', label: 'Light damping', zeta: 0.1, sub: 'ζ = 0.10 (Underdamped)' },
  { id: 'critical', label: 'Critical damping', zeta: 1.0, sub: 'ζ = 1.00 (b = 2√mk)' },
  { id: 'heavy', label: 'Heavy damping', zeta: 2.0, sub: 'ζ = 2.00 (Overdamped)' },
] as const;

export default function SpringMassOscillatorLab() {
  const [params, setParams] = useState<SpringMassParams>({
    mass: 1.0,
    springConstant: 16.0,
    initialDisplacement: 0.5,
    initialVelocity: 0.0,
    damping: 0.8,
  });
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2'>('1');
  const [showAnalytical, setShowAnalytical] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [kinematicTab, setKinematicTab] = useState<KinematicTab>('displacement');
  const [energyTab, setEnergyTab] = useState<EnergyTab>('all');
  const [running, setRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);
  const savedNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
    };
  }, []);

  const addEntry = useNotebookStore((s) => s.addEntry);
  const isDark = useIsDark();

  const summary = useMemo(() => springMassSummary(params), [params]);

  // Display ~4 natural periods (clamped to [5 s, 20 s]) so multiple oscillations or full decay are visible.
  const windowDuration = useMemo(
    () => clamp(4.0 * summary.period, 5, 20),
    [summary.period],
  );

  // RK4 trajectory with internal substeps (dt <= 0.002 s) shared by apparatus and graphs.
  const trajectory = useMemo(
    () => simulateSpringMassTrajectory(params, windowDuration, 281, 0.002),
    [params, windowDuration],
  );

  const currentState = useMemo(
    () => springMassStateAt(params, trajectory, simTime),
    [params, trajectory, simTime],
  );

  const updateParams = (patch: Partial<SpringMassParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const applyDampingPreset = (zeta: number) => {
    const bCrit = 2 * Math.sqrt(params.mass * params.springConstant);
    const nextB = clamp(Number((zeta * bCrit).toFixed(4)), 0, 40);
    updateParams({ damping: nextB });
  };

  const stepForward = () => {
    setRunning(false);
    const stepDt = Math.max(0.02, Number((summary.period / 40).toFixed(3)));
    setSimTime((t) => (t >= windowDuration ? stepDt : Math.min(windowDuration, t + stepDt)));
  };

  // Fixed-timestep animation loop advancing simTime along the RK4 trajectory.
  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  useEffect(() => {
    if (!running) return;
    if (simTimeRef.current >= windowDuration) {
      setSimTime(0);
      simTimeRef.current = 0;
    }
    const loop = createSimulationLoop({
      timeScale: Number(timeScale),
      step: (dt) => {
        simTimeRef.current = Math.min(windowDuration, simTimeRef.current + dt);
      },
      render: () => {
        setSimTime(simTimeRef.current);
        if (simTimeRef.current >= windowDuration) {
          loop.stop();
          setRunning(false);
        }
      },
    });
    loop.start();
    return () => loop.stop();
  }, [running, windowDuration, timeScale]);

  // Vertical spring-mass apparatus Canvas 2D rendering.
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(stageRef);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = isDark
      ? {
          bg: '#0a0f1c',
          grid: 'rgba(148,163,184,0.08)',
          axis: '#334155',
          label: '#8b97ab',
          support: '#475569',
          spring: '#cbd5e1',
          damper: '#94a3b8',
          eqLine: '#2dd4ee',
          massFill: '#1e3a8a',
          massStroke: '#4b8bff',
          massText: '#e6ebf3',
          trace: '#4b8bff',
          envelope: 'rgba(45,212,238,0.45)',
          velocity: '#34c48a',
          forceSpring: '#f59e0b',
          forceDamping: '#f472b6',
        }
      : {
          bg: '#f7f9fc',
          grid: 'rgba(15,23,42,0.06)',
          axis: '#cbd5e1',
          label: '#5d6879',
          support: '#64748b',
          spring: '#334155',
          damper: '#64748b',
          eqLine: '#0e8ea8',
          massFill: '#dbeafe',
          massStroke: '#1f5fe0',
          massText: '#0b1220',
          trace: '#1f5fe0',
          envelope: 'rgba(14,142,168,0.45)',
          velocity: '#138a52',
          forceSpring: '#b26a00',
          forceDamping: '#be185d',
        };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    // Layout geometry:
    // Positive x is downward extension from equilibrium (standard vertical spring convention),
    // with a calibrated vertical metric ruler on the left, the vertical spring-mass apparatus
    // in the center-left, and a live chart-recorder waveform trace on the right.
    const topSupportY = 34;
    const eqY = Math.round(size.height * 0.54);
    const maxScaleMeters = Math.max(1.0, summary.maxDisplacement * 1.25);
    const availHalfHeightPx = Math.max(60, Math.min(eqY - topSupportY - 58, size.height - eqY - 46));
    const pxPerMeter = availHalfHeightPx / maxScaleMeters;

    const toScreenY = (xMeters: number) => eqY + xMeters * pxPerMeter;

    // Background horizontal metric grid lines.
    const tickStep = maxScaleMeters > 1.4 ? 0.5 : 0.25;
    ctx.strokeStyle = palette.grid;
    ctx.fillStyle = palette.label;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'right';

    const rulerX = 54;
    for (
      let xm = -Math.floor(maxScaleMeters / tickStep) * tickStep;
      xm <= maxScaleMeters + 1e-6;
      xm += tickStep
    ) {
      const sy = toScreenY(xm);
      if (sy < topSupportY + 12 || sy > size.height - 18) continue;
      ctx.beginPath();
      ctx.moveTo(rulerX, sy);
      ctx.lineTo(size.width - 20, sy);
      ctx.stroke();

      const signPrefix = xm > 1e-6 ? '+' : '';
      ctx.fillText(`${signPrefix}${formatNumber(xm, 2)} m`, rulerX - 6, sy + 3.5);
    }

    // Vertical ruler spine.
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(rulerX, topSupportY + 10);
    ctx.lineTo(rulerX, size.height - 18);
    ctx.stroke();

    // Equilibrium reference line (x = 0).
    ctx.strokeStyle = palette.eqLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(rulerX, eqY);
    ctx.lineTo(size.width - 20, eqY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = palette.eqLine;
    ctx.font = '11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Equilibrium (x = 0)', rulerX + 8, eqY - 6);

    // Apparatus center X coordinate.
    const appX = Math.min(200, Math.max(135, Math.round(size.width * 0.27)));
    const blockHalfW = clamp(24 + Math.cbrt(params.mass) * 6, 26, 42);
    const blockHalfH = clamp(18 + Math.cbrt(params.mass) * 4, 20, 30);

    // Fixed overhead support beam with diagonal hatch marks.
    const beamHalfW = 58;
    ctx.fillStyle = palette.support;
    ctx.fillRect(appX - beamHalfW, topSupportY - 6, beamHalfW * 2, 6);
    ctx.strokeStyle = palette.support;
    ctx.lineWidth = 1.25;
    for (let hx = appX - beamHalfW + 6; hx <= appX + beamHalfW; hx += 10) {
      ctx.beginPath();
      ctx.moveTo(hx, topSupportY - 6);
      ctx.lineTo(hx - 7, topSupportY - 14);
      ctx.stroke();
    }

    const massCenterY = toScreenY(currentState.x);
    const springTopY = topSupportY;
    const springBottomY = massCenterY - blockHalfH;

    // Draw helical spring between springTopY and springBottomY.
    const hasDamper = params.damping > 0;
    const springX = hasDamper ? appX - 16 : appX;
    const coilCount = 11;
    const coilHalfWidth = 13;
    const leadEnd = 10;
    const activeLen = Math.max(16, springBottomY - springTopY - 2 * leadEnd);

    ctx.strokeStyle = palette.spring;
    ctx.lineWidth = 2.1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(springX, springTopY);
    ctx.lineTo(springX, springTopY + leadEnd);
    for (let i = 0; i < coilCount * 2; i += 1) {
      const frac = (i + 0.5) / (coilCount * 2);
      const cy = springTopY + leadEnd + frac * activeLen;
      const cx = springX + (i % 2 === 0 ? coilHalfWidth : -coilHalfWidth);
      ctx.lineTo(cx, cy);
    }
    ctx.lineTo(springX, springBottomY - leadEnd);
    ctx.lineTo(springX, springBottomY);
    ctx.stroke();

    // Draw viscous dashpot damper in parallel when b > 0.
    if (hasDamper) {
      const damperX = appX + 20;
      const cylTop = springTopY + 14;
      const cylHeight = Math.max(36, (eqY - blockHalfH - springTopY) * 0.58);
      const cylHalfW = 9;

      ctx.strokeStyle = palette.damper;
      ctx.lineWidth = 1.6;
      // Top rod to cylinder
      ctx.beginPath();
      ctx.moveTo(damperX, springTopY);
      ctx.lineTo(damperX, cylTop);
      ctx.stroke();

      // Open-bottom dashpot cylinder
      ctx.beginPath();
      ctx.moveTo(damperX - cylHalfW, cylTop + cylHeight);
      ctx.lineTo(damperX - cylHalfW, cylTop);
      ctx.lineTo(damperX + cylHalfW, cylTop);
      ctx.lineTo(damperX + cylHalfW, cylTop + cylHeight);
      ctx.stroke();

      // Piston head & rod attached to mass top
      const pistonY = clamp(
        cylTop + cylHeight * 0.5 + (currentState.x * pxPerMeter) * 0.35,
        cylTop + 6,
        cylTop + cylHeight - 4,
      );
      ctx.beginPath();
      ctx.moveTo(damperX - cylHalfW + 2, pistonY);
      ctx.lineTo(damperX + cylHalfW - 2, pistonY);
      ctx.moveTo(damperX, pistonY);
      ctx.lineTo(damperX, springBottomY);
      ctx.stroke();
    }

    // Live chart-recorder trace on the right side of the canvas.
    const traceStartX = appX + blockHalfW + 56;
    const traceEndX = size.width - 26;
    if (traceEndX - traceStartX > 90) {
      // Envelope guide curves on the chart-recorder area
      if (showEnvelope && (summary.regime === 'undamped' || summary.regime === 'underdamped')) {
        ctx.strokeStyle = palette.envelope;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        for (const sign of [1, -1] as const) {
          ctx.beginPath();
          trajectory.forEach((pt, idx) => {
            if (pt.envelope === null) return;
            const tx = traceStartX + (pt.t / windowDuration) * (traceEndX - traceStartX);
            const ty = toScreenY(sign * pt.envelope);
            if (idx === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          });
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Full predicted trajectory curve (faint dashed)
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      trajectory.forEach((pt, idx) => {
        const tx = traceStartX + (pt.t / windowDuration) * (traceEndX - traceStartX);
        const ty = toScreenY(pt.x);
        if (idx === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();

      // Active trace up to currentState.t
      ctx.strokeStyle = palette.trace;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (const pt of trajectory) {
        if (pt.t > currentState.t) break;
        const tx = traceStartX + (pt.t / windowDuration) * (traceEndX - traceStartX);
        const ty = toScreenY(pt.x);
        if (pt.t === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      const curTraceX = traceStartX + (currentState.t / windowDuration) * (traceEndX - traceStartX);
      ctx.lineTo(curTraceX, massCenterY);
      ctx.stroke();

      // Horizontal projection line from mass center to current trace point
      ctx.strokeStyle = palette.axis;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(appX + blockHalfW, massCenterY);
      ctx.lineTo(curTraceX, massCenterY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = palette.trace;
      ctx.beginPath();
      ctx.arc(curTraceX, massCenterY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Displacement indicator between equilibrium (y = eqY) and current mass center (y = massCenterY).
    if (Math.abs(currentState.x) > 0.01) {
      const gaugeX = appX - blockHalfW - 18;
      ctx.strokeStyle = palette.eqLine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gaugeX, eqY);
      ctx.lineTo(gaugeX, massCenterY);
      ctx.stroke();
      drawArrow(ctx, gaugeX, eqY, gaugeX, massCenterY, palette.eqLine);
    }

    // Mass block.
    ctx.fillStyle = palette.massFill;
    ctx.strokeStyle = palette.massStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(appX - blockHalfW, massCenterY - blockHalfH, blockHalfW * 2, blockHalfH * 2, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.massText;
    ctx.font = '600 11.5px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`m = ${formatNumber(params.mass, 2)} kg`, appX, massCenterY + 4);

    // Velocity and force vector overlays on the mass block.
    if (showVectors) {
      const peakV = Math.max(summary.maxDisplacement * summary.angularFrequency, Math.abs(params.initialVelocity), 0.5);
      const vScale = 44 / peakV;
      const vxX = appX + blockHalfW + 14;
      drawArrow(ctx, vxX, massCenterY, vxX, massCenterY + currentState.v * vScale, palette.velocity);

      const peakF = Math.max(params.springConstant * Math.max(summary.maxDisplacement, 0.2), 1);
      const fScale = 44 / peakF;
      const fxX = appX + blockHalfW + 28;
      drawArrow(
        ctx,
        fxX,
        massCenterY,
        fxX,
        massCenterY + currentState.springForce * fScale,
        palette.forceSpring,
      );

      if (params.damping > 0 && Math.abs(currentState.dampingForce) > 1e-3) {
        const fdX = appX + blockHalfW + 40;
        drawArrow(
          ctx,
          fdX,
          massCenterY,
          fdX,
          massCenterY + currentState.dampingForce * fScale,
          palette.forceDamping,
        );
      }
    }
  }, [
    size,
    isDark,
    params,
    summary,
    currentState,
    trajectory,
    windowDuration,
    showEnvelope,
    showVectors,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const logToNotebook = () => {
    addEntry({
      title: `Spring–Mass Oscillator — m=${params.mass} kg, k=${params.springConstant} N/m, b=${params.damping} kg/s`,
      experimentSlug: 'spring-mass-oscillator',
      body: `Vertical spring–mass oscillator released at x₀ = ${params.initialDisplacement} m, v₀ = ${params.initialVelocity} m/s with m = ${params.mass} kg, k = ${params.springConstant} N/m, and viscous damping b = ${params.damping} kg/s (${summary.regime}, ζ = ${formatNumber(summary.dampingRatio, 3)}).`,
      measurements: [
        { label: 'Natural angular freq ω₀', value: `${formatNumber(summary.angularFrequency, 4)} rad/s` },
        { label: 'Natural period T', value: `${formatNumber(summary.period, 4)} s` },
        { label: 'Natural frequency f', value: `${formatNumber(summary.frequency, 4)} Hz` },
        {
          label: 'Damped angular freq ω_d',
          value:
            summary.dampedAngularFrequency !== null
              ? `${formatNumber(summary.dampedAngularFrequency, 4)} rad/s`
              : 'Non-oscillatory (ζ ≥ 1)',
        },
        { label: 'Damping ratio ζ', value: formatNumber(summary.dampingRatio, 4) },
        { label: 'Max displacement |x|_max', value: `${formatNumber(summary.maxDisplacement, 4)} m` },
        { label: 'Initial energy E₀', value: `${formatNumber(summary.initialEnergy, 4)} J` },
      ],
    });
    setSavedNotice(true);
    if (savedNoticeTimerRef.current !== null) {
      window.clearTimeout(savedNoticeTimerRef.current);
    }
    savedNoticeTimerRef.current = window.setTimeout(() => {
      setSavedNotice(false);
      savedNoticeTimerRef.current = null;
    }, 2200);
  };

  const isOscillatory = summary.regime === 'undamped' || summary.regime === 'underdamped';

  const plotData = useMemo(
    () =>
      trajectory.map((pt) => ({
        t: pt.t,
        x: pt.x,
        xAnalytical: pt.xAnalytical,
        envelopePos: pt.envelope !== null ? pt.envelope : null,
        envelopeNeg: pt.envelope !== null ? -pt.envelope : null,
        v: pt.v,
        vAnalytical: pt.vAnalytical,
        a: pt.a,
        aAnalytical: pt.aAnalytical,
        kineticEnergy: pt.kineticEnergy,
        potentialEnergy: pt.potentialEnergy,
        totalEnergy: pt.totalEnergy,
      })),
    [trajectory],
  );

  const energyRetainedPercent =
    summary.initialEnergy > 1e-12
      ? clamp((currentState.totalEnergy / summary.initialEnergy) * 100, 0, 100)
      : 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Vertical Spring–Mass Apparatus & Transport */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Vertical Spring–Mass Apparatus"
            description="Displacement x is measured from static equilibrium (x = 0). Positive x is downward extension; negative x is upward compression."
            actions={
              <SegmentedControl
                label="Playback speed"
                size="sm"
                value={timeScale}
                options={TIME_SCALES}
                onChange={setTimeScale}
              />
            }
          />

          <div ref={stageRef} className="relative h-[360px] w-full sm:h-[420px]">
            <canvas
              ref={canvasRef}
              className="block size-full"
              aria-label="Vertical spring-mass oscillator simulation canvas"
            />
          </div>

          {/* Transport & instantaneous telemetry */}
          <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRunning((r) => !r)}
                icon={running ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              >
                {running ? 'Pause' : simTime > 0 && simTime < windowDuration ? 'Resume' : 'Start'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={stepForward}
                icon={<StepForward className="size-3.5" aria-hidden />}
              >
                Step
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRunning(false);
                  setSimTime(0);
                }}
                icon={<RotateCcw className="size-3.5" aria-hidden />}
              >
                Reset
              </Button>

              <div className="flex min-w-[180px] flex-1 items-center gap-3">
                <span className="tabular text-[12px] text-muted">
                  t = {formatNumber(currentState.t, 3)} / {formatNumber(windowDuration, 3)} s
                </span>
                <input
                  type="range"
                  aria-label="Simulation time"
                  className="range flex-1"
                  min={0}
                  max={windowDuration}
                  step={Math.max(windowDuration / 400, 0.005)}
                  value={currentState.t}
                  onChange={(e) => {
                    setRunning(false);
                    setSimTime(e.target.valueAsNumber);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
              <div className="tabular flex flex-wrap gap-x-4 gap-y-1">
                <span>x = {formatNumber(currentState.x, 3)} m</span>
                <span>v = {formatNumber(currentState.v, 3)} m/s</span>
                <span>a = {formatNumber(currentState.a, 3)} m/s²</span>
                <span>F_s = {formatNumber(currentState.springForce, 3)} N</span>
                {params.damping > 0 && <span>F_d = {formatNumber(currentState.dampingForce, 3)} N</span>}
                <span>E = {formatNumber(currentState.totalEnergy, 3)} J</span>
              </div>
              {showVectors && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-success" /> v
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-warning" /> F_spring = −kx
                  </span>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* Parameter Controls */}
        <Panel className="flex flex-col">
          <PanelHeader title="Oscillator Parameters" description="All quantities in SI units." />
          <div className="space-y-4 p-5">
            <Slider
              label="Mass m"
              value={params.mass}
              min={0.1}
              max={10.0}
              step={0.1}
              precision={1}
              unit="kg"
              onChange={(mass) => updateParams({ mass })}
            />
            <Slider
              label="Spring constant k"
              value={params.springConstant}
              min={1}
              max={100}
              step={0.5}
              precision={1}
              unit="N/m"
              onChange={(springConstant) => updateParams({ springConstant })}
            />
            <Slider
              label="Initial displacement x₀"
              value={params.initialDisplacement}
              min={-1.0}
              max={1.0}
              step={0.05}
              precision={2}
              unit="m"
              onChange={(initialDisplacement) => updateParams({ initialDisplacement })}
            />
            <Slider
              label="Initial velocity v₀"
              value={params.initialVelocity}
              min={-4.0}
              max={4.0}
              step={0.1}
              precision={1}
              unit="m/s"
              onChange={(initialVelocity) => updateParams({ initialVelocity })}
            />
            <Slider
              label="Damping coefficient b"
              value={params.damping}
              min={0}
              max={40}
              step={0.05}
              precision={2}
              unit="kg/s"
              onChange={(damping) => updateParams({ damping })}
            />

            <div>
              <p className="mb-1.5 text-[12px] font-medium text-muted">
                Damping presets (critical b_c = {formatNumber(summary.criticalDamping, 3)} kg/s)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {DAMPING_PRESETS.map((preset) => {
                  const active = Math.abs(summary.dampingRatio - preset.zeta) < 0.015;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyDampingPreset(preset.zeta)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-line bg-surface-2/60 text-muted hover:text-fg'
                      }`}
                    >
                      <span className="block font-medium text-fg">{preset.label}</span>
                      <span className="tabular text-[11px]">{preset.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line pt-3.5">
              <Toggle
                label="Analytical solution reference"
                checked={showAnalytical}
                onChange={setShowAnalytical}
              />
              <Toggle
                label="Decay envelope (±E_env)"
                checked={showEnvelope}
                onChange={setShowEnvelope}
              />
              <Toggle
                label="Velocity & force vectors"
                checked={showVectors}
                onChange={setShowVectors}
              />
            </div>

            <div className="border-t border-line pt-3.5">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={logToNotebook}
                icon={
                  savedNotice ? (
                    <Check className="size-3.5 text-success" aria-hidden />
                  ) : (
                    <NotebookPen className="size-3.5" aria-hidden />
                  )
                }
              >
                {savedNotice ? 'Saved to My Notebook' : 'Record run in My Notebook'}
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Key Calculated Readouts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ReadoutCard
          label="Angular frequency ω₀"
          value={`${formatNumber(summary.angularFrequency, 4)} rad/s`}
          sub="√(k / m)"
        />
        <ReadoutCard
          label="Time period T & freq f"
          value={`${formatNumber(summary.period, 4)} s`}
          sub={`f = ${formatNumber(summary.frequency, 4)} Hz`}
        />
        <ReadoutCard
          label="Damping ratio ζ"
          value={formatNumber(summary.dampingRatio, 4)}
          sub={`Regime: ${summary.regime} (γ = ${formatNumber(summary.decayRate, 3)} s⁻¹)`}
        />
        <ReadoutCard
          label="Damped angular freq ω_d"
          value={
            summary.dampedAngularFrequency !== null
              ? `${formatNumber(summary.dampedAngularFrequency, 4)} rad/s`
              : 'Non-oscillatory'
          }
          sub={
            summary.dampedPeriod !== null
              ? `T_d = ${formatNumber(summary.dampedPeriod, 4)} s`
              : 'ζ ≥ 1 (no oscillations)'
          }
        />
        <ReadoutCard
          label="Max displacement |x|_max"
          value={`${formatNumber(summary.maxDisplacement, 4)} m`}
          sub={`F_max = ${formatNumber(params.springConstant * summary.maxDisplacement, 3)} N`}
        />
        <ReadoutCard
          label="Mechanical energy E(t)"
          value={`${formatNumber(currentState.totalEnergy, 4)} J`}
          sub={`E₀ = ${formatNumber(summary.initialEnergy, 4)} J (${formatNumber(energyRetainedPercent, 3)}% retained)`}
        />
      </div>

      {/* Kinematic Graphs: x(t), v(t), a(t) */}
      <Panel>
        <PanelHeader
          title="Kinematic Response — x(t), v(t), a(t)"
          description="RK4 numerical integration compared with the exact closed-form analytical solution."
          actions={
            <SegmentedControl
              label="Kinematic graph selection"
              size="sm"
              value={kinematicTab}
              options={KINEMATIC_TABS}
              onChange={setKinematicTab}
            />
          }
        />
        <div className="p-4">
          {kinematicTab === 'displacement' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Displacement x (m)"
              zeroLine
              series={[
                { key: 'x', label: 'RK4 displacement x(t) (m)', color: 'var(--accent)' },
                ...(showAnalytical
                  ? [
                      {
                        key: 'xAnalytical',
                        label: 'Analytical x_exact(t) (m)',
                        color: 'var(--cyan)',
                        dashed: true,
                      },
                    ]
                  : []),
                ...(showEnvelope && isOscillatory
                  ? [
                      {
                        key: 'envelopePos',
                        label: '+Envelope (m)',
                        color: 'var(--muted)',
                        dashed: true,
                      },
                      {
                        key: 'envelopeNeg',
                        label: '−Envelope (m)',
                        color: 'var(--muted)',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
          {kinematicTab === 'velocity' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Velocity v (m/s)"
              zeroLine
              series={[
                { key: 'v', label: 'RK4 velocity v(t) (m/s)', color: 'var(--success)' },
                ...(showAnalytical
                  ? [
                      {
                        key: 'vAnalytical',
                        label: 'Analytical v_exact(t) (m/s)',
                        color: 'var(--cyan)',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
          {kinematicTab === 'acceleration' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Acceleration a (m/s²)"
              zeroLine
              series={[
                { key: 'a', label: 'RK4 acceleration a(t) (m/s²)', color: 'var(--warning)' },
                ...(showAnalytical
                  ? [
                      {
                        key: 'aAnalytical',
                        label: 'Analytical a_exact(t) (m/s²)',
                        color: 'var(--cyan)',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Energy Graphs: Kinetic K(t), Potential U(t), Total E(t) */}
      <Panel>
        <PanelHeader
          title="Mechanical Energy Analysis — K(t), U(t), E(t)"
          description="Track elastic potential energy U = ½kx², kinetic energy K = ½mv², and total mechanical energy E = K + U."
          actions={
            <SegmentedControl
              label="Energy graph selection"
              size="sm"
              value={energyTab}
              options={ENERGY_TABS}
              onChange={setEnergyTab}
            />
          }
        />
        <div className="p-4">
          {energyTab === 'all' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Energy (J)"
              zeroLine
              series={[
                { key: 'totalEnergy', label: 'Total mechanical energy E (J)', color: 'var(--accent)' },
                { key: 'kineticEnergy', label: 'Kinetic energy K = ½mv² (J)', color: 'var(--success)' },
                { key: 'potentialEnergy', label: 'Potential energy U = ½kx² (J)', color: 'var(--warning)' },
              ]}
            />
          )}
          {energyTab === 'kinetic' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Kinetic energy K (J)"
              zeroLine
              series={[{ key: 'kineticEnergy', label: 'Kinetic energy K = ½mv² (J)', color: 'var(--success)' }]}
            />
          )}
          {energyTab === 'potential' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Potential energy U (J)"
              zeroLine
              series={[{ key: 'potentialEnergy', label: 'Potential energy U = ½kx² (J)', color: 'var(--warning)' }]}
            />
          )}
          {energyTab === 'total' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Total mechanical energy E (J)"
              zeroLine
              series={[{ key: 'totalEnergy', label: 'Total mechanical energy E = K + U (J)', color: 'var(--accent)' }]}
            />
          )}
        </div>
      </Panel>

      {/* Theoretical Explanation & Damping Regimes */}
      <Panel>
        <PanelHeader
          title="Physical Principles & Damping Regime Classification"
          icon={<Info className="size-4" aria-hidden />}
          description="Hooke's law, natural frequency, energy conservation, and underdamped vs critical vs overdamped motion."
        />
        <div className="grid gap-6 p-5 text-[13px] leading-relaxed text-muted lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-fg">1. Hooke’s Law & Natural Oscillation</h3>
            <p>
              Measured from the vertical static equilibrium position (where gravitational weight{' '}
              <MathFormula latex={String.raw`mg`} /> balances the static preload{' '}
              <MathFormula latex={String.raw`k\Delta L_{\text{eq}}`} />), the net Hookean restoring force is:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`F = -kx,\qquad m\frac{d^2x}{dt^2} + b\frac{dx}{dt} + kx = 0`}
              />
            </div>
            <p>
              When undamped (<MathFormula latex={String.raw`b = 0`} />), the oscillator executes simple harmonic
              motion with natural angular frequency <MathFormula latex={String.raw`\omega_0 = \sqrt{k/m}`} />, time
              period <MathFormula latex={String.raw`T = 2\pi\sqrt{m/k}`} />, and frequency{' '}
              <MathFormula latex={String.raw`f = 1/T`} />.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">2. Underdamped, Critical & Overdamped Regimes</h3>
            <p>
              Comparing the decay rate <MathFormula latex={String.raw`\gamma = b/(2m)`} /> with{' '}
              <MathFormula latex={String.raw`\omega_0`} /> defines the dimensionless damping ratio{' '}
              <MathFormula latex={String.raw`\zeta = \gamma/\omega_0 = b/(2\sqrt{mk})`} />:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong className="text-fg">Underdamped (<MathFormula latex={String.raw`\zeta < 1`} />):</strong>{' '}
                Oscillates across equilibrium at the reduced frequency{' '}
                <MathFormula latex={String.raw`\omega_d = \sqrt{\omega_0^2 - \gamma^2}`} /> within an exponential
                decay envelope <MathFormula latex={String.raw`e^{-\gamma t}`} />.
              </li>
              <li>
                <strong className="text-fg">Critically damped (<MathFormula latex={String.raw`\zeta = 1`} />):</strong>{' '}
                Boundary regime (<MathFormula latex={String.raw`b_c = 2\sqrt{mk}`} />) that returns to equilibrium in
                the shortest time without oscillating.
              </li>
              <li>
                <strong className="text-fg">Overdamped (<MathFormula latex={String.raw`\zeta > 1`} />):</strong>{' '}
                Strong viscous drag prevents oscillation and produces a slower two-exponential return toward{' '}
                <MathFormula latex={String.raw`x = 0`} />.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">3. Mechanical Energy & Viscous Dissipation</h3>
            <p>
              Total mechanical energy is the sum of elastic potential energy and translational kinetic energy:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`E(t) = K + U = \tfrac{1}{2}mv^2 + \tfrac{1}{2}kx^2`}
              />
            </div>
            <p>
              For an undamped oscillator (<MathFormula latex={String.raw`b = 0`} />), energy exchanges periodically
              between <MathFormula latex={String.raw`K`} /> and <MathFormula latex={String.raw`U`} /> while{' '}
              <MathFormula latex={String.raw`E(t) = E_0`} /> remains constant. With viscous damping (
              <MathFormula latex={String.raw`b > 0`} />), mechanical energy decreases at rate{' '}
              <MathFormula latex={String.raw`dE/dt = -b v^2 \le 0`} />, with plateaus whenever the mass momentarily
              comes to rest (<MathFormula latex={String.raw`v = 0`} />).
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ReadoutCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Panel className="p-4">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold text-fg">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-subtle">{sub}</p>
    </Panel>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const head = 6;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
