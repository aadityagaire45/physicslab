import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, NotebookPen, Pause, Pin, Play, RotateCcw, Trash2 } from 'lucide-react';
import {
  projectileStateAt,
  projectileSummary,
  sampleTrajectory,
  type ProjectileParams,
  type ProjectileState,
} from '@/engine/physics/kinematics';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { createViewportTransform, niceStep } from '@/engine/simulation/viewport';
import { GRAVITY_PRESETS, STANDARD_GRAVITY } from '@/engine/units/constants';
import { formatNumber } from '@/engine/units/format';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsDark } from '@/hooks/useTheme';
import { useNotebookStore } from '@/store/notebookStore';
import { Button } from '@/components/common/Button';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { Toggle } from '@/components/controls/Toggle';
import { PlotChart } from '@/components/graphs/PlotChart';

interface PinnedTrace {
  id: string;
  label: string;
  color: string;
  points: ProjectileState[];
}

const TRACE_COLORS = ['#f59e0b', '#a855f7', '#22c55e', '#ec4899'];

const TIME_SCALES = [
  { value: '0.25', label: '0.25×' },
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
] as const;

const PLOT_TABS = [
  { value: 'trajectory', label: 'y(x) Trajectory' },
  { value: 'height', label: 'y(t) Height' },
  { value: 'velocity', label: 'v_y(t) Vertical velocity' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

export default function ProjectileMotionLab() {
  const [params, setParams] = useState<ProjectileParams>({
    speed: 24,
    angleDeg: 45,
    height: 0,
    gravity: STANDARD_GRAVITY,
  });
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1'>('1');
  const [showVectors, setShowVectors] = useState(true);
  const [showApex, setShowApex] = useState(true);
  const [plotTab, setPlotTab] = useState<PlotTab>('trajectory');
  const [pinned, setPinned] = useState<PinnedTrace[]>([]);
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

  const summary = useMemo(() => projectileSummary(params), [params]);
  const trajectory = useMemo(() => sampleTrajectory(params, 140), [params]);
  const currentState = useMemo(() => projectileStateAt(params, simTime), [params, simTime]);

  // Reset scrub position when parameters change so the readout stays consistent.
  const updateParams = (patch: Partial<ProjectileParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({ ...prev, ...patch }));
  };

  // Fixed-timestep animation loop.
  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  useEffect(() => {
    if (!running) return;
    const T = summary.timeOfFlight;
    if (simTimeRef.current >= T) {
      setSimTime(0);
      simTimeRef.current = 0;
    }
    const loop = createSimulationLoop({
      timeScale: Number(timeScale),
      step: (dt) => {
        simTimeRef.current = Math.min(T, simTimeRef.current + dt);
      },
      render: () => {
        setSimTime(simTimeRef.current);
        if (simTimeRef.current >= T) {
          loop.stop();
          setRunning(false);
        }
      },
    });
    loop.start();
    return () => loop.stop();
  }, [running, summary.timeOfFlight, timeScale]);

  // Canvas rendering.
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

    const allX = [summary.range, 10, ...pinned.flatMap((p) => p.points.map((pt) => pt.x))];
    const allY = [summary.maxHeight, params.height + 4, ...pinned.flatMap((p) => p.points.map((pt) => pt.y))];
    const worldMaxX = Math.max(...allX) * 1.08;
    const worldMaxY = Math.max(...allY) * 1.18;

    const padding = { top: 20, right: 24, bottom: 34, left: 46 };
    const vp = createViewportTransform({
      xMin: 0,
      xMax: worldMaxX,
      yMin: 0,
      yMax: worldMaxY,
      width: size.width,
      height: size.height,
      padding,
    });

    const palette = isDark
      ? {
          bg: '#0a0f1c',
          grid: 'rgba(148,163,184,0.09)',
          axis: '#334155',
          label: '#8b97ab',
          path: '#4b8bff',
          travelled: '#2dd4ee',
          vx: '#34c48a',
          vy: '#f59e0b',
          body: '#e6ebf3',
        }
      : {
          bg: '#f7f9fc',
          grid: 'rgba(15,23,42,0.07)',
          axis: '#cbd5e1',
          label: '#5d6879',
          path: '#1f5fe0',
          travelled: '#0e8ea8',
          vx: '#138a52',
          vy: '#b26a00',
          body: '#0b1220',
        };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    // Equal-aspect metric grid.
    const step = niceStep(Math.max(vp.bounds.xMax, vp.bounds.yMax), 8);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = palette.label;
    ctx.font = '11px Inter Variable, system-ui, sans-serif';

    ctx.textAlign = 'center';
    for (let x = 0; x <= vp.bounds.xMax + 1e-6; x += step) {
      const sx = vp.toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, padding.top);
      ctx.lineTo(sx, vp.toScreenY(0));
      ctx.stroke();
      ctx.fillText(`${formatNumber(x, 3)} m`, sx, size.height - 12);
    }

    ctx.textAlign = 'right';
    for (let y = 0; y <= vp.bounds.yMax + 1e-6; y += step) {
      const sy = vp.toScreenY(y);
      if (sy < padding.top - 2) break;
      ctx.beginPath();
      ctx.moveTo(padding.left, sy);
      ctx.lineTo(size.width - padding.right, sy);
      ctx.stroke();
      ctx.fillText(`${formatNumber(y, 3)}`, padding.left - 8, sy + 3.5);
    }

    // Ground line.
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, vp.toScreenY(0));
    ctx.lineTo(size.width - padding.right, vp.toScreenY(0));
    ctx.stroke();

    // Launch pedestal when h > 0.
    if (params.height > 0) {
      ctx.fillStyle = palette.axis;
      ctx.fillRect(vp.toScreenX(0) - 4, vp.toScreenY(params.height), 8, vp.toScreenY(0) - vp.toScreenY(params.height));
    }

    // Pinned reference trajectories.
    for (const trace of pinned) {
      ctx.strokeStyle = trace.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      trace.points.forEach((pt, idx) => {
        const sx = vp.toScreenX(pt.x);
        const sy = vp.toScreenY(pt.y);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    // Full predicted trajectory (dashed).
    ctx.strokeStyle = palette.path;
    ctx.lineWidth = 1.75;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    trajectory.forEach((pt, idx) => {
      const sx = vp.toScreenX(pt.x);
      const sy = vp.toScreenY(pt.y);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Path travelled up to simTime (solid).
    ctx.strokeStyle = palette.travelled;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const pt of trajectory) {
      if (pt.t > currentState.t) break;
      const sx = vp.toScreenX(pt.x);
      const sy = vp.toScreenY(pt.y);
      if (pt.t === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.lineTo(vp.toScreenX(currentState.x), vp.toScreenY(currentState.y));
    ctx.stroke();

    // Apex marker.
    if (showApex && summary.timeToApex > 0) {
      const apex = projectileStateAt(params, summary.timeToApex);
      const ax = vp.toScreenX(apex.x);
      const ay = vp.toScreenY(apex.y);
      ctx.strokeStyle = palette.path;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, vp.toScreenY(0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = palette.path;
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Velocity vectors on the projectile.
    const px = vp.toScreenX(currentState.x);
    const py = vp.toScreenY(currentState.y);
    if (showVectors && params.speed > 0) {
      const vScale = 44 / Math.max(params.speed, summary.impactSpeed, 1);
      drawArrow(ctx, px, py, px + currentState.vx * vScale, py, palette.vx);
      drawArrow(ctx, px, py, px, py - currentState.vy * vScale, palette.vy);
      drawArrow(ctx, px, py, px + currentState.vx * vScale, py - currentState.vy * vScale, palette.path);
    }

    // Projectile body.
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.path;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [size, summary, pinned, params, isDark, trajectory, currentState, showApex, showVectors]);

  useEffect(() => {
    draw();
  }, [draw]);

  const pinCurrent = () => {
    setPinned((prev) => {
      if (prev.length >= 4) return prev;
      const color = TRACE_COLORS[prev.length % TRACE_COLORS.length];
      const label = `v₀=${params.speed} m/s, θ=${params.angleDeg}°, h=${params.height} m, g=${formatNumber(params.gravity, 3)}`;
      return [...prev, { id: `${Date.now()}`, label, color, points: trajectory }];
    });
  };

  const logToNotebook = () => {
    addEntry({
      title: `Projectile Motion — v₀=${params.speed} m/s, θ=${params.angleDeg}°`,
      experimentSlug: 'projectile-motion',
      body: `Launch from h = ${params.height} m at θ = ${params.angleDeg}° with v₀ = ${params.speed} m/s under g = ${formatNumber(params.gravity, 4)} m/s².`,
      measurements: [
        { label: 'Range R', value: `${formatNumber(summary.range, 4)} m` },
        { label: 'Max height H', value: `${formatNumber(summary.maxHeight, 4)} m` },
        { label: 'Flight time T', value: `${formatNumber(summary.timeOfFlight, 4)} s` },
        { label: 'Impact speed', value: `${formatNumber(summary.impactSpeed, 4)} m/s` },
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
        x: pt.x,
        t: pt.t,
        y: pt.y,
        vy: pt.vy,
      })),
    [trajectory],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Apparatus canvas + transport */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Trajectory Apparatus"
            description="1:1 aspect ratio in metres. Drag the time scrubber or press Launch."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  label="Playback speed"
                  size="sm"
                  value={timeScale}
                  options={TIME_SCALES}
                  onChange={setTimeScale}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={pinCurrent}
                  disabled={pinned.length >= 4}
                  icon={<Pin className="size-3.5" aria-hidden />}
                >
                  Pin ({pinned.length}/4)
                </Button>
                {pinned.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPinned([])}
                    icon={<Trash2 className="size-3.5" aria-hidden />}
                  >
                    Clear pins
                  </Button>
                )}
              </div>
            }
          />

          <div ref={stageRef} className="relative h-[340px] w-full sm:h-[400px]">
            <canvas
              ref={canvasRef}
              className="block size-full"
              aria-label="Projectile trajectory canvas"
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
                {running ? 'Pause' : simTime > 0 && simTime < summary.timeOfFlight ? 'Resume' : 'Launch'}
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
                  t = {formatNumber(currentState.t, 3)} / {formatNumber(summary.timeOfFlight, 3)} s
                </span>
                <input
                  type="range"
                  aria-label="Simulation time"
                  className="range flex-1"
                  min={0}
                  max={Math.max(summary.timeOfFlight, 0.001)}
                  step={Math.max(summary.timeOfFlight / 300, 0.0005)}
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
                <span>y = {formatNumber(currentState.y, 3)} m</span>
                <span>vₓ = {formatNumber(currentState.vx, 3)} m/s</span>
                <span>vᵧ = {formatNumber(currentState.vy, 3)} m/s</span>
                <span>|v| = {formatNumber(Math.hypot(currentState.vx, currentState.vy), 3)} m/s</span>
              </div>
              {showVectors && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-success" /> vₓ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-warning" /> vᵧ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-accent" /> v
                  </span>
                </div>
              )}
            </div>

            {pinned.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11.5px]">
                {pinned.map((trace) => (
                  <span
                    key={trace.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-0.5 text-muted"
                  >
                    <span className="size-2 rounded-full" style={{ background: trace.color }} />
                    {trace.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Parameter controls */}
        <Panel className="flex flex-col">
          <PanelHeader title="Launch Parameters" description="All quantities in SI units." />
          <div className="space-y-5 p-5">
            <Slider
              label="Launch speed v₀"
              value={params.speed}
              min={1}
              max={50}
              step={0.5}
              precision={1}
              unit="m/s"
              onChange={(speed) => updateParams({ speed })}
            />
            <Slider
              label="Launch angle θ"
              value={params.angleDeg}
              min={0}
              max={90}
              step={1}
              precision={0}
              unit="deg"
              onChange={(angleDeg) => updateParams({ angleDeg })}
            />
            <Slider
              label="Launch height h"
              value={params.height}
              min={0}
              max={40}
              step={0.5}
              precision={1}
              unit="m"
              onChange={(height) => updateParams({ height })}
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

            <div className="space-y-3 border-t border-line pt-4">
              <Toggle label="Velocity component vectors" checked={showVectors} onChange={setShowVectors} />
              <Toggle label="Mark trajectory apex" checked={showApex} onChange={setShowApex} />
            </div>

            <div className="border-t border-line pt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={logToNotebook}
                icon={savedNotice ? <Check className="size-3.5 text-success" aria-hidden /> : <NotebookPen className="size-3.5" aria-hidden />}
              >
                {savedNotice ? 'Saved to My Notebook' : 'Record run in My Notebook'}
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      {/* Summary readouts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ReadoutCard label="Horizontal range R" value={`${formatNumber(summary.range, 4)} m`} sub="x at y = 0" />
        <ReadoutCard label="Maximum height H" value={`${formatNumber(summary.maxHeight, 4)} m`} sub={`at t = ${formatNumber(summary.timeToApex, 3)} s`} />
        <ReadoutCard label="Time of flight T" value={`${formatNumber(summary.timeOfFlight, 4)} s`} sub="Until ground impact" />
        <ReadoutCard label="Impact speed" value={`${formatNumber(summary.impactSpeed, 4)} m/s`} sub={`θ = ${formatNumber(summary.impactAngleDeg, 3)}° below horizontal`} />
        <ReadoutCard
          label="Initial velocity"
          value={`(${formatNumber( currentState.vx, 3)}, ${formatNumber(params.speed * Math.sin((params.angleDeg * Math.PI) / 180), 3)}) m/s`}
          sub="(v₀ₓ, v₀ᵧ)"
        />
      </div>

      {/* Kinematic graphs */}
      <Panel>
        <PanelHeader
          title="Kinematic Graphs"
          description="Computed directly from the analytical equations of motion."
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
          {plotTab === 'trajectory' && (
            <PlotChart
              data={plotData}
              xKey="x"
              xLabel="Horizontal position x (m)"
              yLabel="Height y (m)"
              series={[{ key: 'y', label: 'Height y (m)', color: 'var(--accent)' }]}
            />
          )}
          {plotTab === 'height' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Height y (m)"
              series={[{ key: 'y', label: 'Height y (m)', color: 'var(--accent)' }]}
            />
          )}
          {plotTab === 'velocity' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Vertical velocity v_y (m/s)"
              zeroLine
              series={[{ key: 'vy', label: 'v_y (m/s)', color: 'var(--cyan)' }]}
            />
          )}
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
