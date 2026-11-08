import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, NotebookPen, Pause, Play, RotateCcw } from 'lucide-react';
import { clamp } from '@/engine/mathematics/numeric';
import {
  pendulumStateAt,
  pendulumSummary,
  simulatePendulumTrajectory,
  type PendulumParams,
} from '@/engine/physics/oscillations';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { createViewportTransform, niceStep } from '@/engine/simulation/viewport';
import { GRAVITY_PRESETS, STANDARD_GRAVITY } from '@/engine/units/constants';
import { degToRad } from '@/engine/units/conversions';
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

const PLOT_TABS = [
  { value: 'angle', label: 'θ(t) Angular displacement' },
  { value: 'velocity', label: 'ω(t) Angular velocity' },
  { value: 'energy', label: 'E(t) Mechanical energy' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

const ANGLE_PRESETS = [
  { label: '10° (Small)', angleDeg: 10 },
  { label: '35° (Moderate)', angleDeg: 35 },
  { label: '90° (Horizontal)', angleDeg: 90 },
  { label: '150° (Large)', angleDeg: 150 },
] as const;

export default function SimplePendulumLab() {
  const [params, setParams] = useState<PendulumParams>({
    length: 1.5,
    mass: 1.0,
    gravity: STANDARD_GRAVITY,
    initialAngleDeg: 35,
    damping: 0.0,
  });
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2'>('1');
  const [showSmallAngle, setShowSmallAngle] = useState(true);
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [plotTab, setPlotTab] = useState<PlotTab>('angle');
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

  const summary = useMemo(() => pendulumSummary(params), [params]);

  // Simulate 3.5 full nonlinear periods (clamped to [6 s, 24 s]) so multiple oscillations
  // are visible in real-time graphs and playback.
  const windowDuration = useMemo(
    () => clamp(3.5 * summary.exactUndampedPeriod, 6, 24),
    [summary.exactUndampedPeriod],
  );

  // High-precision RK4 trajectory shared by both the canvas apparatus and the scientific graphs.
  const trajectory = useMemo(
    () => simulatePendulumTrajectory(params, windowDuration, 281, 0.002),
    [params, windowDuration],
  );

  const currentState = useMemo(
    () => pendulumStateAt(params, trajectory, simTime),
    [params, trajectory, simTime],
  );

  const updateParams = (patch: Partial<PendulumParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({ ...prev, ...patch }));
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

  // Canvas 2D apparatus rendering.
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

    const L = params.length;
    const highAngle = Math.abs(params.initialAngleDeg) > 95;
    const yMaxWorld = highAngle ? L * 1.15 : L * 0.25;
    const yMinWorld = -L * 1.25;
    const xExtent = L * 1.25;

    const padding = { top: 24, right: 28, bottom: 32, left: 48 };
    const vp = createViewportTransform({
      xMin: -xExtent,
      xMax: xExtent,
      yMin: yMinWorld,
      yMax: yMaxWorld,
      width: size.width,
      height: size.height,
      padding,
    });

    const palette = isDark
      ? {
          bg: '#0a0f1c',
          grid: 'rgba(148,163,184,0.08)',
          axis: '#334155',
          label: '#8b97ab',
          arc: 'rgba(75,139,255,0.28)',
          arcFill: 'rgba(75,139,255,0.10)',
          rod: '#cbd5e1',
          bobFill: '#4b8bff',
          bobStroke: '#e6ebf3',
          smallAngle: '#2dd4ee',
          velocity: '#34c48a',
          forceGravity: '#f59e0b',
          forceTension: '#60a5fa',
          forceDamping: '#f472b6',
          mount: '#475569',
        }
      : {
          bg: '#f7f9fc',
          grid: 'rgba(15,23,42,0.06)',
          axis: '#cbd5e1',
          label: '#5d6879',
          arc: 'rgba(31,95,224,0.28)',
          arcFill: 'rgba(31,95,224,0.09)',
          rod: '#334155',
          bobFill: '#1f5fe0',
          bobStroke: '#0b1220',
          smallAngle: '#0e8ea8',
          velocity: '#138a52',
          forceGravity: '#b26a00',
          forceTension: '#1d4ed8',
          forceDamping: '#be185d',
          mount: '#64748b',
        };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    // 1:1 metric background grid.
    const step = niceStep(2 * L, 6);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.label;
    ctx.font = '11px Inter Variable, system-ui, sans-serif';

    const xStart = Math.ceil(vp.bounds.xMin / step) * step;
    ctx.textAlign = 'center';
    for (let x = xStart; x <= vp.bounds.xMax + 1e-6; x += step) {
      const sx = vp.toScreenX(x);
      if (sx < padding.left || sx > size.width - padding.right) continue;
      ctx.beginPath();
      ctx.moveTo(sx, padding.top);
      ctx.lineTo(sx, size.height - padding.bottom);
      ctx.stroke();
      ctx.fillText(`${formatNumber(x, 2)} m`, sx, size.height - 10);
    }

    const yStart = Math.ceil(vp.bounds.yMin / step) * step;
    ctx.textAlign = 'right';
    for (let y = yStart; y <= vp.bounds.yMax + 1e-6; y += step) {
      const sy = vp.toScreenY(y);
      if (sy < padding.top || sy > size.height - padding.bottom) continue;
      ctx.beginPath();
      ctx.moveTo(padding.left, sy);
      ctx.lineTo(size.width - padding.right, sy);
      ctx.stroke();
      ctx.fillText(`${formatNumber(y, 2)} m`, padding.left - 6, sy + 3.5);
    }

    const pivotX = vp.toScreenX(0);
    const pivotY = vp.toScreenY(0);
    const radiusPx = L * vp.scale;

    // Equilibrium vertical reference line (θ = 0).
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, vp.toScreenY(-L * 1.12));
    ctx.stroke();
    ctx.setLineDash([]);

    // Circular swing path & angular protractor markings.
    ctx.strokeStyle = palette.arc;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    const maxArcRad = Math.min(Math.PI * 0.96, Math.max(degToRad(Math.abs(params.initialAngleDeg) + 15), degToRad(60)));
    ctx.arc(pivotX, pivotY, radiusPx, Math.PI / 2 - maxArcRad, Math.PI / 2 + maxArcRad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Protractor degree ticks along the swing path.
    const tickAnglesDeg = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
    ctx.fillStyle = palette.label;
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1;
    ctx.font = '10px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const deg of tickAnglesDeg) {
      const rad = degToRad(deg);
      if (Math.abs(rad) > maxArcRad + 0.02) continue;
      const sinA = Math.sin(rad);
      const cosA = Math.cos(rad);
      const innerR = radiusPx - 5;
      const outerR = radiusPx + 5;
      ctx.beginPath();
      ctx.moveTo(pivotX + innerR * sinA, pivotY + innerR * cosA);
      ctx.lineTo(pivotX + outerR * sinA, pivotY + outerR * cosA);
      ctx.stroke();
      if (deg % 30 === 0) {
        const labelR = radiusPx + 16;
        ctx.fillText(`${deg}°`, pivotX + labelR * sinA, pivotY + labelR * cosA + 3);
      }
    }

    // Angle sector & arc at the pivot showing current θ.
    const angleGaugeRadius = Math.min(48, Math.max(26, radiusPx * 0.28));
    if (Math.abs(currentState.theta) > 0.01) {
      const startAngle = Math.PI / 2;
      const endAngle = Math.PI / 2 - currentState.theta;
      ctx.fillStyle = palette.arcFill;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.arc(pivotX, pivotY, angleGaugeRadius, startAngle, endAngle, currentState.theta > 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette.bobFill;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, angleGaugeRadius, startAngle, endAngle, currentState.theta > 0);
      ctx.stroke();

      const midAngle = Math.PI / 2 - currentState.theta / 2;
      const labelDist = angleGaugeRadius + 14;
      ctx.fillStyle = palette.label;
      ctx.font = '11px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `θ = ${formatNumber(currentState.thetaDeg, 3)}°`,
        pivotX + labelDist * Math.cos(midAngle),
        pivotY + labelDist * Math.sin(midAngle) + 4,
      );
    }

    // Small-angle approximation ghost pendulum (dashed cyan).
    const bobRadiusPx = clamp(8 + Math.cbrt(params.mass) * 3.5, 9, 18);
    if (showSmallAngle) {
      const saX = vp.toScreenX(L * Math.sin(currentState.thetaSmallAngle));
      const saY = vp.toScreenY(-L * Math.cos(currentState.thetaSmallAngle));
      ctx.strokeStyle = palette.smallAngle;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(saX, saY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = isDark ? 'rgba(45,212,238,0.22)' : 'rgba(14,142,168,0.18)';
      ctx.strokeStyle = palette.smallAngle;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(saX, saY, bobRadiusPx * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Elevation guide line from bob to vertical equilibrium axis.
    const bobX = vp.toScreenX(currentState.x);
    const bobY = vp.toScreenY(currentState.y);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(pivotX, bobY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Primary pendulum string / rod.
    ctx.strokeStyle = palette.rod;
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Pivot support bracket.
    ctx.fillStyle = palette.mount;
    ctx.fillRect(pivotX - 22, pivotY - 5, 44, 5);
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Unit tangent e_θ = (cos θ, sin θ) in world coordinates -> screen (cos θ, -sin θ)
    // Unit radial inward -e_r = (-sin θ, cos θ) in world -> screen (-sin θ, -cos θ)
    const sinT = Math.sin(currentState.theta);
    const cosT = Math.cos(currentState.theta);
    const tangentScreenX = cosT;
    const tangentScreenY = -sinT;
    const radialInScreenX = -sinT;
    const radialInScreenY = -cosT;

    // Velocity vector overlay.
    if (showVelocityVector && summary.maxSpeedUndamped > 1e-4) {
      const vScale = 46 / Math.max(summary.maxSpeedUndamped, 0.5);
      const vxPx = currentState.tangentialVelocity * tangentScreenX * vScale;
      const vyPx = currentState.tangentialVelocity * tangentScreenY * vScale;
      drawArrow(ctx, bobX, bobY, bobX + vxPx, bobY + vyPx, palette.velocity);
    }

    // Force vector overlays (Tangential restoring gravity F_{g,t}, Tension T, and Damping F_d).
    if (showForceVectors) {
      const fScale = 36 / Math.max(summary.maxTensionUndamped, params.mass * params.gravity, 1);
      // Tangential component of gravity: F_{g,t} = -m g sin(θ) along e_θ
      const fgTangent = -params.mass * params.gravity * sinT;
      drawArrow(
        ctx,
        bobX,
        bobY,
        bobX + fgTangent * tangentScreenX * fScale,
        bobY + fgTangent * tangentScreenY * fScale,
        palette.forceGravity,
      );

      // String tension inward along -e_r
      const tensionClamped = Math.max(0, currentState.tension);
      drawArrow(
        ctx,
        bobX,
        bobY,
        bobX + tensionClamped * radialInScreenX * fScale,
        bobY + tensionClamped * radialInScreenY * fScale,
        palette.forceTension,
      );

      // Viscous damping force: F_d = -b v_t along e_θ
      if (params.damping > 0) {
        const fdTangent = -params.damping * currentState.tangentialVelocity;
        drawArrow(
          ctx,
          bobX,
          bobY,
          bobX + fdTangent * tangentScreenX * fScale * 2.5,
          bobY + fdTangent * tangentScreenY * fScale * 2.5,
          palette.forceDamping,
        );
      }
    }

    // Pendulum bob.
    ctx.fillStyle = palette.bobFill;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.bobStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [
    size,
    params,
    isDark,
    currentState,
    summary,
    showSmallAngle,
    showVelocityVector,
    showForceVectors,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const logToNotebook = () => {
    addEntry({
      title: `Simple Pendulum — L=${params.length} m, θ₀=${params.initialAngleDeg}°, b=${params.damping} kg/s`,
      experimentSlug: 'simple-pendulum',
      body: `Released from θ₀ = ${params.initialAngleDeg}° with L = ${params.length} m, m = ${params.mass} kg, g = ${formatNumber(params.gravity, 4)} m/s², and linear damping b = ${params.damping} kg/s (${summary.regime}).`,
      measurements: [
        { label: 'Small-angle period T₀', value: `${formatNumber(summary.smallAnglePeriod, 4)} s` },
        { label: 'Exact undamped period T', value: `${formatNumber(summary.exactUndampedPeriod, 4)} s` },
        {
          label: 'RK4 measured period T_sim',
          value: summary.measuredPeriod !== null ? `${formatNumber(summary.measuredPeriod, 4)} s` : 'Non-oscillatory',
        },
        { label: 'Anharmonic shift ΔT/T₀', value: `+${formatNumber(summary.periodDeviationPercent, 3)} %` },
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

  const plotData = useMemo(
    () =>
      trajectory.map((pt) => ({
        t: pt.t,
        thetaDeg: pt.thetaDeg,
        thetaSmallAngleDeg: pt.thetaSmallAngleDeg,
        omega: pt.omega,
        omegaSmallAngle: pt.omegaSmallAngle,
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
      <div className="grid gap-6 xl:grid-cols-[1fr_370px]">
        {/* Apparatus canvas + transport */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Pendulum Apparatus"
            description="1:1 metric scale (RK4 nonlinear integrator). Compare the nonlinear bob with the dashed small-angle harmonic reference."
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
              aria-label="Simple pendulum simulation canvas"
            />
          </div>

          {/* Transport & instantaneous state */}
          <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-3">
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
                <span>θ = {formatNumber(currentState.thetaDeg, 3)}°</span>
                {showSmallAngle && (
                  <span>θ_lin = {formatNumber(currentState.thetaSmallAngleDeg, 3)}°</span>
                )}
                <span>ω = {formatNumber(currentState.omega, 3)} rad/s</span>
                <span>α = {formatNumber(currentState.alpha, 3)} rad/s²</span>
                <span>|v| = {formatNumber(currentState.speed, 3)} m/s</span>
                <span>h = {formatNumber(currentState.height, 3)} m</span>
                <span>T = {formatNumber(currentState.tension, 3)} N</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {showSmallAngle && (
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-cyan" /> θ_lin
                  </span>
                )}
                {showVelocityVector && (
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-success" /> v
                  </span>
                )}
                {showForceVectors && (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-accent" /> T
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-warning" /> F_g,t
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Panel>

        {/* Parameter controls */}
        <Panel className="flex flex-col">
          <PanelHeader title="Pendulum Parameters" description="All quantities in SI units." />
          <div className="space-y-4 p-5">
            <Slider
              label="String length L"
              value={params.length}
              min={0.2}
              max={5.0}
              step={0.05}
              precision={2}
              unit="m"
              onChange={(length) => updateParams({ length })}
            />
            <Slider
              label="Bob mass m"
              value={params.mass}
              min={0.1}
              max={10.0}
              step={0.1}
              precision={1}
              unit="kg"
              onChange={(mass) => updateParams({ mass })}
            />
            <Slider
              label="Initial release angle θ₀"
              value={params.initialAngleDeg}
              min={-170}
              max={170}
              step={1}
              precision={0}
              unit="deg"
              onChange={(initialAngleDeg) => updateParams({ initialAngleDeg })}
            />

            <div>
              <p className="mb-1.5 text-[12px] font-medium text-muted">Release angle presets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ANGLE_PRESETS.map((preset) => {
                  const active = Math.abs(params.initialAngleDeg - preset.angleDeg) < 0.5;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateParams({ initialAngleDeg: preset.angleDeg })}
                      className={`rounded-lg border px-2.5 py-1 text-left text-[11.5px] transition-colors ${
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-line bg-surface-2/60 text-muted hover:text-fg'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Slider
              label="Linear damping b"
              value={params.damping}
              min={0}
              max={2.0}
              step={0.02}
              precision={2}
              unit="kg/s"
              onChange={(damping) => updateParams({ damping })}
            />
            <Slider
              label="Gravitational field g"
              value={params.gravity}
              min={1}
              max={26}
              step={0.01}
              precision={2}
              unit="m/s²"
              onChange={(gravity) => updateParams({ gravity })}
            />

            <div>
              <p className="mb-1.5 text-[12px] font-medium text-muted">Gravity presets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {GRAVITY_PRESETS.map((preset) => {
                  const active = Math.abs(params.gravity - preset.value) < 0.005;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => updateParams({ gravity: preset.value })}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-line bg-surface-2/60 text-muted hover:text-fg'
                      }`}
                    >
                      <span className="block font-medium text-fg">{preset.label}</span>
                      <span className="tabular text-[11px]">{preset.value} m/s²</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line pt-3.5">
              <Toggle
                label="Small-angle comparison (θ_lin)"
                checked={showSmallAngle}
                onChange={setShowSmallAngle}
              />
              <Toggle
                label="Velocity vector (v)"
                checked={showVelocityVector}
                onChange={setShowVelocityVector}
              />
              <Toggle
                label="Force vectors (T, F_g,t, F_d)"
                checked={showForceVectors}
                onChange={setShowForceVectors}
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

      {/* Live measurement & period comparison cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ReadoutCard
          label="Small-angle period T₀"
          value={`${formatNumber(summary.smallAnglePeriod, 4)} s`}
          sub={`ω₀ = ${formatNumber(summary.naturalFrequency, 3)} rad/s`}
        />
        <ReadoutCard
          label="Exact undamped period T"
          value={`${formatNumber(summary.exactUndampedPeriod, 4)} s`}
          sub={`+${formatNumber(summary.periodDeviationPercent, 3)}% vs small-angle T₀`}
        />
        <ReadoutCard
          label="RK4 measured period T_sim"
          value={
            summary.measuredPeriod !== null
              ? `${formatNumber(summary.measuredPeriod, 4)} s`
              : 'Non-oscillatory'
          }
          sub={`Regime: ${summary.regime} (ζ = ${formatNumber(summary.dampingRatio, 3)})`}
        />
        <ReadoutCard
          label="Mechanical energy E(t)"
          value={`${formatNumber(currentState.totalEnergy, 4)} J`}
          sub={`E₀ = ${formatNumber(summary.initialEnergy, 4)} J (${formatNumber(energyRetainedPercent, 3)}% retained)`}
        />
        <ReadoutCard
          label="Instantaneous K / U"
          value={`${formatNumber(currentState.kineticEnergy, 3)} / ${formatNumber(currentState.potentialEnergy, 3)} J`}
          sub={`Peak v₀ = ${formatNumber(summary.maxSpeedUndamped, 3)} m/s`}
        />
      </div>

      {/* Real-time scientific graphs */}
      <Panel>
        <PanelHeader
          title="Oscillation & Energy Graphs"
          description="Computed from the exact same RK4 state trajectory as the canvas apparatus."
          actions={
            <SegmentedControl
              label="Graph selection"
              size="sm"
              value={plotTab}
              options={PLOT_TABS}
              onChange={setPlotTab}
            />
          }
        />
        <div className="p-4">
          {plotTab === 'angle' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Angular displacement θ (deg)"
              zeroLine
              series={
                showSmallAngle
                  ? [
                      { key: 'thetaDeg', label: 'Nonlinear θ(t) (deg)', color: 'var(--accent)' },
                      {
                        key: 'thetaSmallAngleDeg',
                        label: 'Small-angle θ_lin(t) (deg)',
                        color: 'var(--cyan)',
                        dashed: true,
                      },
                    ]
                  : [{ key: 'thetaDeg', label: 'Nonlinear θ(t) (deg)', color: 'var(--accent)' }]
              }
            />
          )}
          {plotTab === 'velocity' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Angular velocity ω (rad/s)"
              zeroLine
              series={
                showSmallAngle
                  ? [
                      { key: 'omega', label: 'Nonlinear ω(t) (rad/s)', color: 'var(--accent)' },
                      {
                        key: 'omegaSmallAngle',
                        label: 'Small-angle ω_lin(t) (rad/s)',
                        color: 'var(--cyan)',
                        dashed: true,
                      },
                    ]
                  : [{ key: 'omega', label: 'Nonlinear ω(t) (rad/s)', color: 'var(--accent)' }]
              }
            />
          )}
          {plotTab === 'energy' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Mechanical energy (J)"
              zeroLine
              series={[
                { key: 'totalEnergy', label: 'Total energy E = K + U (J)', color: 'var(--accent)' },
                { key: 'kineticEnergy', label: 'Kinetic energy K (J)', color: 'var(--success)' },
                { key: 'potentialEnergy', label: 'Potential energy U (J)', color: 'var(--warning)' },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Scientific explanation of equations and physical assumptions */}
      <Panel>
        <PanelHeader
          title="Physical Model & Mathematical Assumptions"
          icon={<Info className="size-4" aria-hidden />}
          description="Exact nonlinear dynamics, viscous damping conventions, and small-angle linearization."
        />
        <div className="grid gap-6 p-5 text-[13px] leading-relaxed text-muted lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-fg">1. Nonlinear Equation & Damping Units</h3>
            <p>
              For a point mass <strong className="text-fg">m</strong> on a massless rigid rod of length{' '}
              <strong className="text-fg">L</strong> subject to a linear tangential viscous drag force{' '}
              <MathFormula latex={String.raw`F_d = -b\,v = -b L \dot{\theta}`} />, the rotational equation{' '}
              <MathFormula latex={String.raw`m L^2 \ddot{\theta} = -m g L \sin\theta - b L^2 \dot{\theta}`} />{' '}
              divides by <MathFormula latex={String.raw`m L^2`} /> to give:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`\frac{d^2\theta}{dt^2} + \frac{b}{m}\frac{d\theta}{dt} + \frac{g}{L}\sin\theta = 0`}
              />
            </div>
            <p>
              Here <strong className="text-fg">b</strong> has SI units of{' '}
              <strong className="text-fg">kg/s (N·s/m)</strong>, so the specific damping rate{' '}
              <MathFormula latex={String.raw`b/m`} /> has units of <MathFormula latex={String.raw`\text{s}^{-1}`} />.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">2. Small-Angle Approximation Breakdown</h3>
            <p>
              Expanding <MathFormula latex={String.raw`\sin\theta = \theta - \frac{\theta^3}{6} + \mathcal{O}(\theta^5)`} />{' '}
              and retaining only the linear term yields simple harmonic motion with period{' '}
              <MathFormula latex={String.raw`T_0 = 2\pi\sqrt{L/g}`} />, independent of mass and amplitude.
            </p>
            <p>
              At large release angles <MathFormula latex={String.raw`\theta_0`} />, the restoring torque{' '}
              <MathFormula latex={String.raw`|\sin\theta| < |\theta|`} /> is weaker than the linear hookean
              restoring torque, lengthening the true undamped period according to the complete elliptic integral of the
              first kind <MathFormula latex={String.raw`K(k)`} />:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`T(\theta_0) = 4\sqrt{\frac{L}{g}}\,K\!\left(\sin\frac{|\theta_0|}{2}\right)`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">3. Mechanical Energy & Dissipation</h3>
            <p>
              Choosing gravitational potential energy <MathFormula latex={String.raw`U = 0`} /> at the lowest point{' '}
              <MathFormula latex={String.raw`\theta = 0`} />, the instantaneous mechanical energy is:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`E(t) = \tfrac{1}{2} m L^2 \dot{\theta}^2 + m g L (1 - \cos\theta)`}
              />
            </div>
            <p>
              When <MathFormula latex={String.raw`b = 0`} />, mechanical energy is strictly conserved (
              <MathFormula latex={String.raw`E(t) = E_0`} />). For <MathFormula latex={String.raw`b > 0`} />,
              non-conservative viscous drag dissipates mechanical power at rate{' '}
              <MathFormula latex={String.raw`dE/dt = -b L^2 \dot{\theta}^2 \le 0`} />.
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
