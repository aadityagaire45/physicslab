import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, NotebookPen, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { clamp } from '@/engine/mathematics/numeric';
import {
  collisionTrackStateAt,
  simulateCollisionTrajectory,
  solveOneDimensionalCollision,
  type CollisionParams,
} from '@/engine/physics/mechanics';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { formatNumber } from '@/engine/units/format';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsDark } from '@/hooks/useTheme';
import { useNotebookStore } from '@/store/notebookStore';
import { Badge } from '@/components/common/Badge';
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
  { value: 'position', label: 'x(t) Position' },
  { value: 'velocity', label: 'v(t) Velocity' },
  { value: 'momentum', label: 'p(t) Momentum' },
  { value: 'energy', label: 'K(t) Kinetic Energy' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface CollisionPreset {
  id: string;
  label: string;
  sub: string;
  params: CollisionParams;
}

const COLLISION_PRESETS: readonly CollisionPreset[] = [
  {
    id: 'equal-elastic',
    label: 'Equal masses, elastic collision',
    sub: 'm₁ = m₂ = 2 kg, u₁ = 4 m/s, u₂ = 0, e = 1',
    params: { m1: 2.0, m2: 2.0, u1: 4.0, u2: 0.0, restitution: 1.0 },
  },
  {
    id: 'heavy-hits-light',
    label: 'Heavy object hitting a stationary light object',
    sub: 'm₁ = 8 kg, m₂ = 1 kg, u₁ = 3 m/s, u₂ = 0, e = 1',
    params: { m1: 8.0, m2: 1.0, u1: 3.0, u2: 0.0, restitution: 1.0 },
  },
  {
    id: 'light-hits-heavy',
    label: 'Light object hitting a stationary heavy object',
    sub: 'm₁ = 1 kg, m₂ = 8 kg, u₁ = 4 m/s, u₂ = 0, e = 1',
    params: { m1: 1.0, m2: 8.0, u1: 4.0, u2: 0.0, restitution: 1.0 },
  },
  {
    id: 'equal-inelastic',
    label: 'Equal masses, perfectly inelastic collision',
    sub: 'm₁ = m₂ = 2.5 kg, u₁ = 4 m/s, u₂ = 0, e = 0',
    params: { m1: 2.5, m2: 2.5, u1: 4.0, u2: 0.0, restitution: 0.0 },
  },
  {
    id: 'head-on',
    label: 'Two objects moving toward each other',
    sub: 'm₁ = 2 kg, m₂ = 3 kg, u₁ = 3.5 m/s, u₂ = −2.5 m/s, e = 0.8',
    params: { m1: 2.0, m2: 3.0, u1: 3.5, u2: -2.5, restitution: 0.8 },
  },
  {
    id: 'unequal-general',
    label: 'Unequal masses and velocities',
    sub: 'm₁ = 4 kg, m₂ = 1.5 kg, u₁ = 4.5 m/s, u₂ = 1 m/s, e = 0.6',
    params: { m1: 4.0, m2: 1.5, u1: 4.5, u2: 1.0, restitution: 0.6 },
  },
] as const;

export default function CollisionsMomentumLab() {
  const [params, setParams] = useState<CollisionParams>({
    m1: 2.0,
    m2: 2.0,
    u1: 4.0,
    u2: 0.0,
    restitution: 1.0,
    initialSeparation: 4.0,
  });
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2'>('1');
  const [showCenterOfMass, setShowCenterOfMass] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [plotTab, setPlotTab] = useState<PlotTab>('velocity');
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

  const outcome = useMemo(() => solveOneDimensionalCollision(params), [params]);

  // Choose window duration so impact occurs near ~40% of the window and post-collision motion is clearly visible.
  const windowDuration = useMemo(() => {
    if (outcome.willCollide && outcome.collisionTime !== null) {
      return clamp(Number((outcome.collisionTime * 2.4).toFixed(2)), 2.5, 16);
    }
    return 4.0;
  }, [outcome]);

  const trajectory = useMemo(
    () => simulateCollisionTrajectory(params, windowDuration, 241),
    [params, windowDuration],
  );

  const currentState = useMemo(
    () => collisionTrackStateAt(params, simTime),
    [params, simTime],
  );

  const updateParams = (patch: Partial<CollisionParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (preset: CollisionPreset) => {
    setRunning(false);
    setSimTime(0);
    setParams({ ...preset.params, initialSeparation: 4.0 });
  };

  const stepForward = () => {
    setRunning(false);
    const stepDt = Math.max(0.02, Number((windowDuration / 50).toFixed(3)));
    setSimTime((t) => (t >= windowDuration ? stepDt : Math.min(windowDuration, Number((t + stepDt).toFixed(3)))));
  };

  // Fixed-timestep animation loop.
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

  // Horizontal Collision Track Canvas 2D rendering.
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
          rail: '#334155',
          railTop: '#64748b',
          label: '#8b97ab',
          cart1Fill: '#1e3a8a',
          cart1Stroke: '#4b8bff',
          cart2Fill: '#083344',
          cart2Stroke: '#2dd4ee',
          cartText: '#e6ebf3',
          com: '#f59e0b',
          impact: '#f472b6',
          vel1: '#60a5fa',
          vel2: '#2dd4ee',
        }
      : {
          bg: '#f7f9fc',
          grid: 'rgba(15,23,42,0.06)',
          rail: '#cbd5e1',
          railTop: '#475569',
          label: '#5d6879',
          cart1Fill: '#dbeafe',
          cart1Stroke: '#1f5fe0',
          cart2Fill: '#cffafe',
          cart2Stroke: '#0e8ea8',
          cartText: '#0b1220',
          com: '#b26a00',
          impact: '#be185d',
          vel1: '#1d4ed8',
          vel2: '#0e8ea8',
        };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    // Compute world X bounds across the trajectory so both carts stay inside the viewport
    const allX = trajectory.flatMap((pt) => [pt.x1 - 2.2, pt.x2 + 2.2]);
    const minWorldX = Math.min(-6, ...allX);
    const maxWorldX = Math.max(6, ...allX);
    const spanX = Math.max(12, (maxWorldX - minWorldX) * 1.12);
    const centerWorldX = (minWorldX + maxWorldX) / 2;
    const xLeftWorld = centerWorldX - spanX / 2;
    const xRightWorld = centerWorldX + spanX / 2;

    const padX = 42;
    const usableW = Math.max(180, size.width - padX * 2);
    const pxPerMeter = usableW / (xRightWorld - xLeftWorld);
    const toScreenX = (xm: number) => padX + (xm - xLeftWorld) * pxPerMeter;

    const trackY = Math.round(size.height * 0.66);

    // Vertical metric grid lines & ruler labels
    const tickStep = spanX > 28 ? 5 : spanX > 14 ? 2 : 1;
    const firstTick = Math.ceil(xLeftWorld / tickStep) * tickStep;
    ctx.strokeStyle = palette.grid;
    ctx.fillStyle = palette.label;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (let xm = firstTick; xm <= xRightWorld + 1e-6; xm += tickStep) {
      const sx = toScreenX(xm);
      ctx.beginPath();
      ctx.moveTo(sx, 24);
      ctx.lineTo(sx, trackY + 18);
      ctx.stroke();

      const prefix = xm > 1e-6 ? '+' : '';
      ctx.fillText(`${prefix}${formatNumber(xm, 2)} m`, sx, trackY + 34);
    }

    // Horizontal air-track rail
    ctx.fillStyle = palette.rail;
    ctx.fillRect(padX, trackY, usableW, 8);
    ctx.strokeStyle = palette.railTop;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX, trackY);
    ctx.lineTo(padX + usableW, trackY);
    ctx.stroke();

    // Collision impact position marker x_c when a collision occurs
    if (outcome.willCollide && outcome.collisionPosition !== null) {
      const cx = toScreenX(outcome.collisionPosition);
      if (cx >= padX && cx <= padX + usableW) {
        ctx.strokeStyle = palette.impact;
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, 32);
        ctx.lineTo(cx, trackY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = palette.impact;
        ctx.font = '600 10.5px Inter Variable, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Impact x_c = ${formatNumber(outcome.collisionPosition, 3)} m (t_c = ${formatNumber(outcome.collisionTime ?? 0, 3)} s)`,
          cx,
          24,
        );
      }
    }

    // Center-of-mass marker on the track
    if (showCenterOfMass) {
      const cmX = toScreenX(currentState.xCm);
      ctx.strokeStyle = palette.com;
      ctx.fillStyle = palette.com;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cmX, trackY + 2);
      ctx.lineTo(cmX - 5, trackY + 13);
      ctx.lineTo(cmX + 5, trackY + 13);
      ctx.closePath();
      ctx.fill();
      ctx.font = '600 10.5px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`COM (v_cm = ${formatNumber(outcome.centerOfMassVelocity, 3)} m/s)`, cmX, trackY + 49);
    }

    // Cart dimensions:
    // Object 1's right bumper is at x1(t); Object 2's left bumper is at x2(t).
    // That way bumper-to-bumper contact happens at x1(t_c) = x2(t_c) = x_c without overlap!
    const cart1W = clamp(54 + Math.cbrt(params.m1) * 10, 56, 88);
    const cart1H = clamp(34 + Math.cbrt(params.m1) * 5, 36, 52);
    const cart2W = clamp(54 + Math.cbrt(params.m2) * 10, 56, 88);
    const cart2H = clamp(34 + Math.cbrt(params.m2) * 5, 36, 52);
    const wheelR = 5.5;

    const face1X = toScreenX(currentState.x1);
    const face2X = toScreenX(currentState.x2);

    const cart1Left = face1X - cart1W;
    const cart1Top = trackY - wheelR * 2 - cart1H;
    const cart1CenterX = cart1Left + cart1W / 2;

    const cart2Left = face2X;
    const cart2Top = trackY - wheelR * 2 - cart2H;
    const cart2CenterX = cart2Left + cart2W / 2;

    // Draw Cart 1 (Left object)
    ctx.fillStyle = palette.cart1Fill;
    ctx.strokeStyle = palette.cart1Stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cart1Left, cart1Top, cart1W, cart1H, 7);
    ctx.fill();
    ctx.stroke();

    // Cart 1 wheels & bumper
    ctx.fillStyle = palette.cart1Stroke;
    ctx.beginPath();
    ctx.arc(cart1Left + 14, trackY - wheelR, wheelR, 0, Math.PI * 2);
    ctx.arc(cart1Left + cart1W - 14, trackY - wheelR, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(face1X - 2, cart1Top + 8, 4, cart1H - 16);

    ctx.fillStyle = palette.cartText;
    ctx.font = '600 11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Object 1`, cart1CenterX, cart1Top + cart1H / 2 - 4);
    ctx.font = '10.5px Inter Variable, system-ui, sans-serif';
    ctx.fillText(`m₁ = ${formatNumber(params.m1, 2)} kg`, cart1CenterX, cart1Top + cart1H / 2 + 10);

    // Draw Cart 2 (Right object)
    ctx.fillStyle = palette.cart2Fill;
    ctx.strokeStyle = palette.cart2Stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cart2Left, cart2Top, cart2W, cart2H, 7);
    ctx.fill();
    ctx.stroke();

    // Cart 2 wheels & bumper
    ctx.fillStyle = palette.cart2Stroke;
    ctx.beginPath();
    ctx.arc(cart2Left + 14, trackY - wheelR, wheelR, 0, Math.PI * 2);
    ctx.arc(cart2Left + cart2W - 14, trackY - wheelR, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(face2X - 2, cart2Top + 8, 4, cart2H - 16);

    ctx.fillStyle = palette.cartText;
    ctx.font = '600 11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Object 2`, cart2CenterX, cart2Top + cart2H / 2 - 4);
    ctx.font = '10.5px Inter Variable, system-ui, sans-serif';
    ctx.fillText(`m₂ = ${formatNumber(params.m2, 2)} kg`, cart2CenterX, cart2Top + cart2H / 2 + 10);

    // Impact flash highlight when bumpers are in contact
    if (
      outcome.willCollide &&
      outcome.collisionTime !== null &&
      Math.abs(currentState.t - outcome.collisionTime) < 0.045
    ) {
      ctx.strokeStyle = palette.impact;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(face1X, trackY - wheelR * 2 - Math.min(cart1H, cart2H) / 2, 16, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Velocity vector arrows & labels above each cart
    if (showVectors) {
      const maxSpeed = Math.max(
        Math.abs(outcome.u1),
        Math.abs(outcome.u2),
        Math.abs(outcome.v1),
        Math.abs(outcome.v2),
        1,
      );
      const vScale = 58 / maxSpeed;

      const v1Y = cart1Top - 16;
      if (Math.abs(currentState.v1) > 1e-3) {
        const len1 = Math.sign(currentState.v1) * Math.max(18, Math.abs(currentState.v1) * vScale);
        drawArrow(ctx, cart1CenterX, v1Y, cart1CenterX + len1, v1Y, palette.vel1);
      }
      ctx.fillStyle = palette.vel1;
      ctx.font = '600 11px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`v₁ = ${formatNumber(currentState.v1, 3)} m/s`, cart1CenterX, v1Y - 8);

      const v2Y = cart2Top - 16;
      if (Math.abs(currentState.v2) > 1e-3) {
        const len2 = Math.sign(currentState.v2) * Math.max(18, Math.abs(currentState.v2) * vScale);
        drawArrow(ctx, cart2CenterX, v2Y, cart2CenterX + len2, v2Y, palette.vel2);
      }
      ctx.fillStyle = palette.vel2;
      ctx.font = '600 11px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`v₂ = ${formatNumber(currentState.v2, 3)} m/s`, cart2CenterX, v2Y - 8);
    }
  }, [
    size,
    isDark,
    params,
    outcome,
    currentState,
    trajectory,
    showCenterOfMass,
    showVectors,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const logToNotebook = () => {
    addEntry({
      title: `Collisions & Momentum — m₁=${params.m1} kg, m₂=${params.m2} kg, e=${params.restitution}`,
      experimentSlug: 'collisions-momentum',
      body: `1D collision with m₁ = ${params.m1} kg (u₁ = ${params.u1} m/s), m₂ = ${params.m2} kg (u₂ = ${params.u2} m/s), and restitution e = ${params.restitution} (${outcome.classification}).`,
      measurements: [
        { label: 'Post-collision v₁', value: `${formatNumber(outcome.v1, 4)} m/s` },
        { label: 'Post-collision v₂', value: `${formatNumber(outcome.v2, 4)} m/s` },
        { label: 'Initial momentum Pᵢ', value: `${formatNumber(outcome.initialMomentum, 4)} kg·m/s` },
        { label: 'Final momentum P_f', value: `${formatNumber(outcome.finalMomentum, 4)} kg·m/s` },
        { label: 'Initial kinetic energy Kᵢ', value: `${formatNumber(outcome.initialKineticEnergy, 4)} J` },
        { label: 'Final kinetic energy K_f', value: `${formatNumber(outcome.finalKineticEnergy, 4)} J` },
        { label: 'Kinetic energy lost ΔK', value: `${formatNumber(outcome.kineticEnergyLost, 4)} J (${formatNumber(outcome.kineticEnergyLostPercent, 3)}%)` },
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
        x1: pt.x1,
        x2: pt.x2,
        xCm: pt.xCm,
        v1: pt.v1,
        v2: pt.v2,
        vCm: outcome.centerOfMassVelocity,
        p1: pt.p1,
        p2: pt.p2,
        totalMomentum: pt.totalMomentum,
        k1: pt.k1,
        k2: pt.k2,
        totalKineticEnergy: pt.totalKineticEnergy,
      })),
    [trajectory, outcome.centerOfMassVelocity],
  );

  const classificationBadge = (() => {
    if (!outcome.willCollide) {
      return { tone: 'neutral' as const, label: 'No Collision (u₁ ≤ u₂)' };
    }
    switch (outcome.classification) {
      case 'perfectly-elastic':
        return { tone: 'success' as const, label: 'Perfectly Elastic (e = 1)' };
      case 'partially-inelastic':
        return { tone: 'accent' as const, label: `Partially Inelastic (e = ${formatNumber(params.restitution, 2)})` };
      case 'perfectly-inelastic':
        return { tone: 'warning' as const, label: 'Perfectly Inelastic (e = 0, Coupled)' };
      case 'superelastic':
        return { tone: 'warning' as const, label: `Superelastic (e = ${formatNumber(params.restitution, 2)})` };
    }
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        {/* Collision Track Apparatus & Before/After Table */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="1D Horizontal Collision Track"
            description="Frictionless air track. Object 1 starts at x₁(0) = −2 m and Object 2 starts at x₂(0) = +2 m."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={classificationBadge.tone}>{classificationBadge.label}</Badge>
                <SegmentedControl
                  label="Playback speed"
                  size="sm"
                  value={timeScale}
                  options={TIME_SCALES}
                  onChange={setTimeScale}
                />
              </div>
            }
          />

          <div ref={stageRef} className="relative h-[300px] w-full sm:h-[340px]">
            <canvas
              ref={canvasRef}
              className="block size-full"
              aria-label="One-dimensional collision track simulation canvas"
            />
          </div>

          {/* Transport controls & live telemetry */}
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
                <span>Phase: {currentState.phase}</span>
                <span>x₁ = {formatNumber(currentState.x1, 3)} m</span>
                <span>x₂ = {formatNumber(currentState.x2, 3)} m</span>
                <span>v₁ = {formatNumber(currentState.v1, 3)} m/s</span>
                <span>v₂ = {formatNumber(currentState.v2, 3)} m/s</span>
                <span>P = {formatNumber(currentState.totalMomentum, 4)} kg·m/s</span>
                <span>K = {formatNumber(currentState.totalKineticEnergy, 4)} J</span>
              </div>
            </div>

            {/* Before vs After Collision Comparison Table */}
            <div className="overflow-x-auto rounded-lg border border-line bg-surface pt-2 pb-1">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-subtle uppercase">
                    <th className="px-3 py-1.5">Quantity</th>
                    <th className="px-3 py-1.5">Object 1 (Before → After)</th>
                    <th className="px-3 py-1.5">Object 2 (Before → After)</th>
                    <th className="px-3 py-1.5">System Total (Before → After)</th>
                  </tr>
                </thead>
                <tbody className="tabular divide-y divide-line text-fg-soft">
                  <tr>
                    <td className="px-3 py-1.5 font-medium text-muted">Velocity (m/s)</td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.u1, 3)} → <strong className="text-fg">{formatNumber(outcome.v1, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.u2, 3)} → <strong className="text-fg">{formatNumber(outcome.v2, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      v_cm = <strong className="text-fg">{formatNumber(outcome.centerOfMassVelocity, 3)} m/s</strong>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-medium text-muted">Momentum (kg·m/s)</td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.p1Initial, 3)} → <strong className="text-fg">{formatNumber(outcome.p1Final, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.p2Initial, 3)} → <strong className="text-fg">{formatNumber(outcome.p2Final, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.initialMomentum, 4)} →{' '}
                      <strong className="text-success">{formatNumber(outcome.finalMomentum, 4)}</strong> (ΔP ={' '}
                      {formatNumber(outcome.momentumDifference, 4)})
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-medium text-muted">Kinetic Energy (J)</td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.k1Initial, 3)} → <strong className="text-fg">{formatNumber(outcome.k1Final, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.k2Initial, 3)} → <strong className="text-fg">{formatNumber(outcome.k2Final, 3)}</strong>
                    </td>
                    <td className="px-3 py-1.5">
                      {formatNumber(outcome.initialKineticEnergy, 4)} →{' '}
                      <strong className="text-fg">{formatNumber(outcome.finalKineticEnergy, 4)}</strong> (−
                      {formatNumber(outcome.kineticEnergyLost, 3)} J)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* Parameter Controls & Presets */}
        <Panel className="flex flex-col">
          <PanelHeader title="Collision Parameters" description="All quantities in SI units." />
          <div className="space-y-4 p-5">
            <Slider
              label="Object 1 mass m₁"
              value={params.m1}
              min={0.5}
              max={15.0}
              step={0.5}
              precision={1}
              unit="kg"
              onChange={(m1) => updateParams({ m1 })}
            />
            <Slider
              label="Object 2 mass m₂"
              value={params.m2}
              min={0.5}
              max={15.0}
              step={0.5}
              precision={1}
              unit="kg"
              onChange={(m2) => updateParams({ m2 })}
            />
            <Slider
              label="Object 1 initial velocity u₁"
              value={params.u1}
              min={-6.0}
              max={6.0}
              step={0.25}
              precision={2}
              unit="m/s"
              onChange={(u1) => updateParams({ u1 })}
            />
            <Slider
              label="Object 2 initial velocity u₂"
              value={params.u2}
              min={-6.0}
              max={6.0}
              step={0.25}
              precision={2}
              unit="m/s"
              onChange={(u2) => updateParams({ u2 })}
            />
            <Slider
              label="Coefficient of restitution e"
              value={params.restitution}
              min={0}
              max={1}
              step={0.05}
              precision={2}
              onChange={(restitution) => updateParams({ restitution })}
            />

            <div>
              <p className="mb-1.5 text-[12px] font-medium text-muted">Collision presets</p>
              <div className="grid grid-cols-1 gap-1.5">
                {COLLISION_PRESETS.map((preset) => {
                  const active =
                    Math.abs(params.m1 - preset.params.m1) < 0.05 &&
                    Math.abs(params.m2 - preset.params.m2) < 0.05 &&
                    Math.abs(params.u1 - preset.params.u1) < 0.05 &&
                    Math.abs(params.u2 - preset.params.u2) < 0.05 &&
                    Math.abs(params.restitution - preset.params.restitution) < 0.02;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] transition-colors ${
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-line bg-surface-2/60 text-muted hover:text-fg'
                      }`}
                    >
                      <span className="block font-medium text-fg">{preset.label}</span>
                      <span className="tabular text-[10.5px]">{preset.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line pt-3.5">
              <Toggle
                label="Velocity vectors on carts"
                checked={showVectors}
                onChange={setShowVectors}
              />
              <Toggle
                label="Center-of-mass (COM) marker"
                checked={showCenterOfMass}
                onChange={setShowCenterOfMass}
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

      {/* Summary Readout Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ReadoutCard
          label="Initial momentum Pᵢ"
          value={`${formatNumber(outcome.initialMomentum, 4)} kg·m/s`}
          sub={`p₁ᵢ = ${formatNumber(outcome.p1Initial, 3)}, p₂ᵢ = ${formatNumber(outcome.p2Initial, 3)}`}
        />
        <ReadoutCard
          label="Final momentum P_f"
          value={`${formatNumber(outcome.finalMomentum, 4)} kg·m/s`}
          sub={`ΔP = ${formatNumber(outcome.momentumDifference, 4)} kg·m/s (Conserved)`}
        />
        <ReadoutCard
          label="Initial kinetic energy Kᵢ"
          value={`${formatNumber(outcome.initialKineticEnergy, 4)} J`}
          sub={`K₁ᵢ = ${formatNumber(outcome.k1Initial, 3)} J, K₂ᵢ = ${formatNumber(outcome.k2Initial, 3)} J`}
        />
        <ReadoutCard
          label="Final kinetic energy K_f"
          value={`${formatNumber(outcome.finalKineticEnergy, 4)} J`}
          sub={`K₁f = ${formatNumber(outcome.k1Final, 3)} J, K₂f = ${formatNumber(outcome.k2Final, 3)} J`}
        />
        <ReadoutCard
          label="Energy lost ΔK_lost"
          value={`${formatNumber(outcome.kineticEnergyLost, 4)} J`}
          sub={`${formatNumber(outcome.kineticEnergyLostPercent, 3)}% of Kᵢ dissipated`}
        />
        <ReadoutCard
          label="Restitution & Regime"
          value={`e = ${formatNumber(params.restitution, 3)}`}
          sub={`Class: ${outcome.classification}`}
        />
      </div>

      {/* Synchronized Time-Series Graphs: Position, Velocity, Momentum, Kinetic Energy */}
      <Panel>
        <PanelHeader
          title="Collision Dynamics & Conservation Graphs"
          description="Observe the velocity step at impact t_c, constant total momentum P(t), and kinetic energy change."
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
          {plotTab === 'position' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Track position x (m)"
              zeroLine
              series={[
                { key: 'x1', label: 'Object 1 position x₁(t) (m)', color: 'var(--accent)' },
                { key: 'x2', label: 'Object 2 position x₂(t) (m)', color: 'var(--cyan)' },
                ...(showCenterOfMass
                  ? [
                      {
                        key: 'xCm',
                        label: 'Center of mass x_cm(t) (m)',
                        color: 'var(--warning)',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
          {plotTab === 'velocity' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Velocity v (m/s)"
              zeroLine
              series={[
                { key: 'v1', label: 'Object 1 velocity v₁(t) (m/s)', color: 'var(--accent)' },
                { key: 'v2', label: 'Object 2 velocity v₂(t) (m/s)', color: 'var(--cyan)' },
                { key: 'vCm', label: 'Center-of-mass velocity v_cm (m/s)', color: 'var(--warning)', dashed: true },
              ]}
            />
          )}
          {plotTab === 'momentum' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Momentum p (kg·m/s)"
              zeroLine
              series={[
                { key: 'totalMomentum', label: 'Total momentum P = p₁ + p₂ (kg·m/s)', color: 'var(--success)' },
                { key: 'p1', label: 'Object 1 momentum p₁(t) (kg·m/s)', color: 'var(--accent)', dashed: true },
                { key: 'p2', label: 'Object 2 momentum p₂(t) (kg·m/s)', color: 'var(--cyan)', dashed: true },
              ]}
            />
          )}
          {plotTab === 'energy' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Kinetic energy K (J)"
              zeroLine
              series={[
                { key: 'totalKineticEnergy', label: 'Total kinetic energy K = K₁ + K₂ (J)', color: 'var(--warning)' },
                { key: 'k1', label: 'Object 1 kinetic energy K₁(t) (J)', color: 'var(--accent)', dashed: true },
                { key: 'k2', label: 'Object 2 kinetic energy K₂(t) (J)', color: 'var(--cyan)', dashed: true },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Scientific Reference: Momentum Conservation vs Kinetic Energy Conservation */}
      <Panel>
        <PanelHeader
          title="Physical Principles — Momentum Conservation vs Kinetic Energy"
          icon={<Info className="size-4" aria-hidden />}
          description="General 1D collision equations, Newton's law of restitution, and energy dissipation."
        />
        <div className="grid gap-6 p-5 text-[13px] leading-relaxed text-muted lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-fg">1. Conservation of Linear Momentum</h3>
            <p>
              In an isolated horizontal collision with zero net external force, the internal contact forces obey
              Newton’s third law (<MathFormula latex={String.raw`\vec{F}_{12} = -\vec{F}_{21}`} />). Therefore, total
              linear momentum is conserved in <strong className="text-fg">every</strong> collision regardless of{' '}
              <MathFormula latex="e" />:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`P_i = m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2 = P_f`}
              />
            </div>
            <p>
              Consequently, the center-of-mass velocity{' '}
              <MathFormula latex={String.raw`v_{\text{cm}} = P_i / (m_1 + m_2)`} /> remains invariant before, during,
              and after impact.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">2. Restitution & Post-Collision Velocities</h3>
            <p>
              Newton’s law of restitution relates the relative speed of separation to the relative speed of approach via{' '}
              <MathFormula latex={String.raw`e = (v_2 - v_1)/(u_1 - u_2)`} />. Combining this with momentum
              conservation yields:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`v_1 = \frac{m_1 u_1 + m_2 u_2 - m_2 e(u_1 - u_2)}{m_1 + m_2}`}
              />
              <MathFormula
                display
                latex={String.raw`v_2 = \frac{m_1 u_1 + m_2 u_2 + m_1 e(u_1 - u_2)}{m_1 + m_2}`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">3. Kinetic Energy vs Momentum</h3>
            <p>
              Unlike momentum, kinetic energy is conserved <strong className="text-fg">only</strong> in a perfectly
              elastic collision (<MathFormula latex="e = 1" />). For inelastic collisions (
              <MathFormula latex="0 \le e < 1" />), deformation and heat dissipate kinetic energy equal to:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`\Delta K_{\text{lost}} = K_i - K_f = \tfrac{1}{2}\frac{m_1 m_2}{m_1 + m_2}(1 - e^2)(u_1 - u_2)^2`}
              />
            </div>
            <p>
              At <MathFormula latex="e = 0" /> (perfectly inelastic), both objects couple together at{' '}
              <MathFormula latex={String.raw`v_1 = v_2 = v_{\text{cm}}`} />, losing all relative kinetic energy.
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
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const head = 6.5;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}
