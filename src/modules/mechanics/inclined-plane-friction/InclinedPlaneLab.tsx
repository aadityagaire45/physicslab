import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, NotebookPen, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { clamp } from '@/engine/mathematics/numeric';
import {
  inclinedPlaneStateAt,
  inclinedPlaneSummary,
  simulateInclinedPlaneTrajectory,
  type InclinedPlaneParams,
} from '@/engine/physics/mechanics';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { GRAVITY_PRESETS, STANDARD_GRAVITY } from '@/engine/units/constants';
import { degToRad, radToDeg } from '@/engine/units/conversions';
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

const KINEMATIC_TABS = [
  { value: 'position', label: 's(t) Position' },
  { value: 'velocity', label: 'v(t) Velocity' },
  { value: 'acceleration', label: 'a(t) Acceleration' },
] as const;

type KinematicTab = (typeof KINEMATIC_TABS)[number]['value'];

const ANALYSIS_TABS = [
  { value: 'forces', label: 'Forces vs Time' },
  { value: 'angle-sweep', label: 'Static vs Kinetic (θ Sweep)' },
  { value: 'energy', label: 'Energy & Thermal Dissipation' },
] as const;

type AnalysisTab = (typeof ANALYSIS_TABS)[number]['value'];

interface SurfacePreset {
  id: string;
  label: string;
  sub: string;
  angleDeg: number;
  staticFriction: number;
  kineticFriction: number;
  initialVelocity: number;
}

const SURFACE_PRESETS: readonly SurfacePreset[] = [
  {
    id: 'frictionless',
    label: 'Frictionless plane',
    sub: 'μ_s = 0, μ_k = 0, θ = 25°',
    angleDeg: 25,
    staticFriction: 0,
    kineticFriction: 0,
    initialVelocity: 0,
  },
  {
    id: 'rough',
    label: 'Rough plane',
    sub: 'μ_s = 0.50, μ_k = 0.35, θ = 20° (at rest)',
    angleDeg: 20,
    staticFriction: 0.5,
    kineticFriction: 0.35,
    initialVelocity: 0,
  },
  {
    id: 'limiting',
    label: 'Just at limiting equilibrium',
    sub: 'θ = arctan(μ_s) ≈ 26.57°',
    angleDeg: radToDeg(Math.atan(0.5)),
    staticFriction: 0.5,
    kineticFriction: 0.35,
    initialVelocity: 0,
  },
  {
    id: 'sliding',
    label: 'Sliding block',
    sub: 'μ_s = 0.40, μ_k = 0.28, θ = 35°',
    angleDeg: 35,
    staticFriction: 0.4,
    kineticFriction: 0.28,
    initialVelocity: 0,
  },
  {
    id: 'high-friction',
    label: 'High-friction surface',
    sub: 'μ_s = 0.85, μ_k = 0.70, θ = 30°',
    angleDeg: 30,
    staticFriction: 0.85,
    kineticFriction: 0.7,
    initialVelocity: 0,
  },
] as const;

export default function InclinedPlaneLab() {
  const [params, setParams] = useState<InclinedPlaneParams>({
    mass: 5.0,
    angleDeg: 35,
    staticFriction: 0.4,
    kineticFriction: 0.28,
    gravity: STANDARD_GRAVITY,
    initialVelocity: 0,
  });
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2'>('1');
  const [showComponents, setShowComponents] = useState(true);
  const [showPrimaryForces, setShowPrimaryForces] = useState(true);
  const [kinematicTab, setKinematicTab] = useState<KinematicTab>('position');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('forces');
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

  const summary = useMemo(() => inclinedPlaneSummary(params), [params]);

  const windowDuration = 4.0;

  const trajectory = useMemo(
    () => simulateInclinedPlaneTrajectory(params, windowDuration, 201),
    [params, windowDuration],
  );

  const currentState = useMemo(
    () => inclinedPlaneStateAt(params, simTime),
    [params, simTime],
  );

  const updateParams = (patch: Partial<InclinedPlaneParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => {
      const next = { ...prev, ...patch };
      // Enforce physical invariant μ_s ≥ μ_k automatically
      if (patch.staticFriction !== undefined && next.kineticFriction > next.staticFriction) {
        next.kineticFriction = Number(next.staticFriction.toFixed(2));
      } else if (patch.kineticFriction !== undefined && next.kineticFriction > next.staticFriction) {
        next.staticFriction = Number(next.kineticFriction.toFixed(2));
      }
      return next;
    });
  };

  const applyPreset = (preset: SurfacePreset) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({
      ...prev,
      angleDeg: preset.angleDeg,
      staticFriction: preset.staticFriction,
      kineticFriction: preset.kineticFriction,
      initialVelocity: preset.initialVelocity,
    }));
  };

  const stepForward = () => {
    setRunning(false);
    setSimTime((t) => (t >= windowDuration ? 0.05 : Math.min(windowDuration, Number((t + 0.05).toFixed(3)))));
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

  // Canvas 2D Inclined Plane Apparatus rendering.
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
          rampFill: 'rgba(30,41,59,0.75)',
          rampStroke: '#64748b',
          label: '#8b97ab',
          blockFill: '#1e3a8a',
          blockStroke: '#4b8bff',
          blockText: '#e6ebf3',
          weight: '#94a3b8',
          gravityPar: '#f59e0b',
          gravityPerp: '#38bdf8',
          normal: '#2dd4ee',
          friction: '#f472b6',
          velocity: '#34c48a',
          angleArc: 'rgba(75,139,255,0.22)',
          critLine: 'rgba(244,114,182,0.55)',
        }
      : {
          bg: '#f7f9fc',
          grid: 'rgba(15,23,42,0.06)',
          rampFill: 'rgba(226,232,240,0.85)',
          rampStroke: '#475569',
          label: '#5d6879',
          blockFill: '#dbeafe',
          blockStroke: '#1f5fe0',
          blockStrokeGhost: 'rgba(31,95,224,0.35)',
          blockText: '#0b1220',
          weight: '#475569',
          gravityPar: '#b26a00',
          gravityPerp: '#0284c7',
          normal: '#0e8ea8',
          friction: '#be185d',
          velocity: '#138a52',
          angleArc: 'rgba(31,95,224,0.18)',
          critLine: 'rgba(190,24,93,0.45)',
        };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size.width, size.height);

    // Subtle background grid
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let gx = 40; gx < size.width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size.height);
      ctx.stroke();
    }
    for (let gy = 40; gy < size.height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(size.width, gy);
      ctx.stroke();
    }

    const theta = degToRad(params.angleDeg);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Ramp geometry: high end at top-left, toe at bottom-right so +s (downhill) goes down and right.
    const marginX = 56;
    const baseY = size.height - 46;
    const maxHorizPx = Math.max(200, size.width - marginX * 2 - 40);
    const maxVertPx = Math.max(120, size.height - 120);
    const slopeLenPx = Math.min(
      maxHorizPx / Math.max(cosT, 0.35),
      sinT > 0.05 ? maxVertPx / sinT : maxHorizPx,
    );

    const toeX = marginX + slopeLenPx * cosT;
    const toeY = baseY;
    const topX = marginX;
    const topY = baseY - slopeLenPx * sinT;

    // Critical angle dashed guide line from the toe vertex
    const critRad = degToRad(summary.criticalAngleDeg);
    if (summary.criticalAngleDeg > 0.5 && summary.criticalAngleDeg <= 60) {
      const critLen = Math.min(slopeLenPx * 0.85, 240);
      ctx.strokeStyle = palette.critLine;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(toeX, toeY);
      ctx.lineTo(toeX - critLen * Math.cos(critRad), toeY - critLen * Math.sin(critRad));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw ramp wedge
    ctx.fillStyle = palette.rampFill;
    ctx.strokeStyle = palette.rampStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topX, baseY);
    ctx.lineTo(toeX, toeY);
    ctx.lineTo(topX, topY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Protractor arc & angle label at the bottom-right vertex (toeX, toeY)
    if (params.angleDeg > 0.5) {
      const arcR = Math.min(68, slopeLenPx * 0.26);
      ctx.fillStyle = palette.angleArc;
      ctx.beginPath();
      ctx.moveTo(toeX, toeY);
      ctx.arc(toeX, toeY, arcR, Math.PI, Math.PI + theta, false);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette.blockStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(toeX, toeY, arcR, Math.PI, Math.PI + theta, false);
      ctx.stroke();

      const midA = Math.PI + theta / 2;
      ctx.fillStyle = palette.label;
      ctx.font = '600 11.5px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `θ = ${formatNumber(params.angleDeg, 3)}° (θ_c = ${formatNumber(summary.criticalAngleDeg, 3)}°)`,
        toeX - arcR - 8,
        toeY + (arcR + 10) * Math.sin(midA) + 4,
      );
    } else {
      ctx.fillStyle = palette.label;
      ctx.font = '600 11.5px Inter Variable, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        `θ = 0° (Horizontal, θ_c = ${formatNumber(summary.criticalAngleDeg, 3)}°)`,
        toeX - 12,
        toeY - 10,
      );
    }

    // Determine physical scale along the slope so the full trajectory fits on the ramp
    const sValues = trajectory.map((pt) => pt.s);
    const minS = Math.min(0, ...sValues);
    const maxS = Math.max(4, ...sValues);
    const totalSpanMeters = Math.max(8, (maxS - minS) * 1.35);
    const usableSlopePx = Math.max(120, slopeLenPx - 96);
    const pxPerMeter = usableSlopePx / totalSpanMeters;

    // Position of s = 0 along the slope from the top vertex
    const startOffsetFraction = minS < -0.1 ? clamp(Math.abs(minS) / (maxS - minS + 2), 0.25, 0.72) : 0.22;
    const sZeroPxFromTop = 48 + usableSlopePx * startOffsetFraction;

    // Unit tangent along +s (downhill): u_s = (cos θ, sin θ) in screen coords
    // Unit outward normal from ramp surface: u_n = (sin θ, -cos θ) in screen coords
    const ux = cosT;
    const uy = sinT;
    const nx = sinT;
    const ny = -cosT;

    // Draw metric distance ticks along the incline surface
    const tickStepM = totalSpanMeters > 24 ? 5 : totalSpanMeters > 12 ? 2 : 1;
    ctx.strokeStyle = palette.rampStroke;
    ctx.fillStyle = palette.label;
    ctx.font = '10px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const minTickM = Math.ceil((-sZeroPxFromTop / pxPerMeter) / tickStepM) * tickStepM;
    const maxTickM = Math.floor(((slopeLenPx - 20 - sZeroPxFromTop) / pxPerMeter) / tickStepM) * tickStepM;
    for (let sm = minTickM; sm <= maxTickM; sm += tickStepM) {
      const distPx = sZeroPxFromTop + sm * pxPerMeter;
      const sx = topX + distPx * ux;
      const sy = topY + distPx * uy;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 5 * nx, sy - 5 * ny);
      ctx.stroke();
    }

    const blockW = clamp(44 + Math.cbrt(params.mass) * 6, 48, 66);
    const blockH = clamp(28 + Math.cbrt(params.mass) * 4, 30, 44);

    // Ghost outline at s = 0 when block has moved
    if (Math.abs(currentState.s) > 0.04) {
      const gBaseX = topX + sZeroPxFromTop * ux;
      const gBaseY = topY + sZeroPxFromTop * uy;
      ctx.save();
      ctx.translate(gBaseX, gBaseY);
      ctx.rotate(theta);
      ctx.strokeStyle = palette.rampStroke;
      ctx.lineWidth = 1.25;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(-blockW / 2, -blockH, blockW, blockH);
      ctx.restore();
    }

    // Current block center on the incline
    const currentDistPx = clamp(
      sZeroPxFromTop + currentState.s * pxPerMeter,
      34,
      slopeLenPx - 34,
    );
    const contactX = topX + currentDistPx * ux;
    const contactY = topY + currentDistPx * uy;
    const centerX = contactX + (blockH / 2) * nx;
    const centerY = contactY + (blockH / 2) * ny;

    // Draw the block rotated flush with the incline
    ctx.save();
    ctx.translate(contactX, contactY);
    ctx.rotate(theta);
    ctx.fillStyle = palette.blockFill;
    ctx.strokeStyle = palette.blockStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-blockW / 2, -blockH, blockW, blockH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.blockText;
    ctx.font = '600 11px Inter Variable, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${formatNumber(params.mass, 2)} kg`, 0, -blockH / 2 + 4);
    ctx.restore();

    // Force vector scaling (normalized to weight W = mg so arrows remain readable across all masses/gravities)
    const forceScale = 58 / Math.max(currentState.weight, 1);

    // 1. Parallel & perpendicular gravity components (dashed decomposition)
    if (showComponents && params.angleDeg > 0) {
      const fParPx = currentState.gravityParallel * forceScale;
      const fPerpPx = currentState.gravityPerpendicular * forceScale;
      // Perpendicular component into ramp: -u_n = (-nx, -ny)
      const perpEndX = centerX - fPerpPx * nx;
      const perpEndY = centerY - fPerpPx * ny;
      drawArrow(ctx, centerX, centerY, perpEndX, perpEndY, palette.gravityPerp, true);
      drawVectorLabel(
        ctx,
        perpEndX - 10 * nx,
        perpEndY - 10 * ny,
        `mg cosθ = ${formatNumber(currentState.gravityPerpendicular, 3)} N`,
        palette.gravityPerp,
      );

      // Parallel component down ramp: +u_s = (ux, uy)
      const parEndX = centerX + fParPx * ux;
      const parEndY = centerY + fParPx * uy;
      drawArrow(ctx, centerX, centerY, parEndX, parEndY, palette.gravityPar, true);
      drawVectorLabel(
        ctx,
        parEndX + 12 * ux,
        parEndY + 12 * uy - 6,
        `mg sinθ = ${formatNumber(currentState.gravityParallel, 3)} N`,
        palette.gravityPar,
      );
    }

    // 2. Primary forces: Weight W (vertical down), Normal N (outward normal), and Friction f (along surface)
    if (showPrimaryForces) {
      // Weight W straight down (0, +1 in screen coords)
      const wPx = currentState.weight * forceScale;
      drawArrow(ctx, centerX, centerY, centerX, centerY + wPx, palette.weight);
      drawVectorLabel(
        ctx,
        centerX,
        centerY + wPx + 13,
        `W = ${formatNumber(currentState.weight, 3)} N`,
        palette.weight,
      );

      // Normal force N along +u_n
      const nPx = currentState.normalForce * forceScale;
      const nEndX = centerX + nPx * nx;
      const nEndY = centerY + nPx * ny;
      drawArrow(ctx, centerX, centerY, nEndX, nEndY, palette.normal);
      drawVectorLabel(
        ctx,
        nEndX + 8 * nx,
        nEndY + 8 * ny - 4,
        `N = ${formatNumber(currentState.normalForce, 3)} N`,
        palette.normal,
      );

      // Friction vector f along contact surface (signed along +u_s)
      if (currentState.frictionMagnitude > 1e-3) {
        const fSignedPx = currentState.frictionSigned * forceScale;
        // Ensure visible minimum length when non-zero
        const fDir = Math.sign(fSignedPx);
        const fLenPx = Math.max(22, Math.abs(fSignedPx));
        const fEndX = contactX + fDir * fLenPx * ux;
        const fEndY = contactY + fDir * fLenPx * uy;
        drawArrow(ctx, contactX, contactY, fEndX, fEndY, palette.friction);
        const fSymbol = currentState.frictionMode === 'static' ? 'f_s' : 'f_k';
        drawVectorLabel(
          ctx,
          fEndX + fDir * 14 * ux,
          fEndY + fDir * 14 * uy - 8,
          `${fSymbol} = ${formatNumber(currentState.frictionMagnitude, 3)} N`,
          palette.friction,
        );
      }
    }

    // Velocity vector when moving
    if (Math.abs(currentState.v) > 1e-2) {
      const vDir = Math.sign(currentState.v);
      const vLen = clamp(20 + Math.abs(currentState.v) * 6, 22, 68);
      const vStartX = centerX + (blockH * 0.75) * nx;
      const vStartY = centerY + (blockH * 0.75) * ny;
      drawArrow(
        ctx,
        vStartX,
        vStartY,
        vStartX + vDir * vLen * ux,
        vStartY + vDir * vLen * uy,
        palette.velocity,
      );
    }
  }, [
    size,
    isDark,
    params,
    summary,
    currentState,
    trajectory,
    showComponents,
    showPrimaryForces,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const logToNotebook = () => {
    addEntry({
      title: `Inclined Plane — m=${params.mass} kg, θ=${params.angleDeg}°, μ_s=${params.staticFriction}, μ_k=${params.kineticFriction}`,
      experimentSlug: 'inclined-plane-friction',
      body: `Block of mass m = ${params.mass} kg on a θ = ${params.angleDeg}° incline with μ_s = ${params.staticFriction}, μ_k = ${params.kineticFriction}, v₀ = ${params.initialVelocity ?? 0} m/s under g = ${formatNumber(params.gravity, 4)} m/s² (${currentState.motionRegime}).`,
      measurements: [
        { label: 'Normal reaction N', value: `${formatNumber(summary.normalForce, 4)} N` },
        { label: 'Parallel gravity F_g', value: `${formatNumber(summary.gravityParallel, 4)} N` },
        { label: 'Max static friction f_s(max)', value: `${formatNumber(summary.maxStaticFriction, 4)} N` },
        { label: 'Kinetic friction f_k', value: `${formatNumber(summary.kineticFrictionForce, 4)} N` },
        { label: 'Active friction f(0)', value: `${formatNumber(summary.initialState.frictionMagnitude, 4)} N (${summary.initialState.frictionMode})` },
        { label: 'Acceleration a(0)', value: `${formatNumber(summary.initialState.a, 4)} m/s²` },
        { label: 'Critical angle θ_c', value: `${formatNumber(summary.criticalAngleDeg, 3)}°` },
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
        s: pt.s,
        v: pt.v,
        a: pt.a,
        gravityParallel: pt.gravityParallel,
        frictionMagnitude: pt.frictionMagnitude,
        maxStaticFriction: pt.maxStaticFriction,
        kineticFrictionForce: pt.kineticFrictionForce,
        netForce: pt.netForce,
        kineticEnergy: pt.kineticEnergy,
        potentialDrop: -pt.potentialEnergyChange,
        thermalEnergy: pt.thermalEnergy,
      })),
    [trajectory],
  );

  // Angle sweep (0° to 60°) comparing static vs kinetic friction thresholds and active friction
  const angleSweepData = useMemo(() => {
    const pts = [];
    for (let deg = 0; deg <= 60; deg += 1) {
      const st = inclinedPlaneStateAt({ ...params, angleDeg: deg, initialVelocity: 0 }, 0);
      pts.push({
        angleDeg: deg,
        gravityParallel: st.gravityParallel,
        maxStaticFriction: st.maxStaticFriction,
        kineticFrictionForce: st.kineticFrictionForce,
        activeFriction: st.frictionMagnitude,
      });
    }
    return pts;
  }, [params]);

  const regimeBadge = (() => {
    switch (currentState.motionRegime) {
      case 'stationary':
        return { tone: 'neutral' as const, label: 'Stationary (Static Equilibrium)' };
      case 'limiting-equilibrium':
        return { tone: 'warning' as const, label: 'Limiting Equilibrium (f_s = f_s,max)' };
      case 'sliding-down':
        return { tone: 'success' as const, label: 'Sliding Downslope (Kinetic Friction Uphill)' };
      case 'sliding-up':
        return { tone: 'accent' as const, label: 'Sliding Upslope (Kinetic Friction Downhill)' };
    }
  })();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_385px]">
        {/* Inclined Plane Apparatus & Transport */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Inclined Plane & Free-Body Apparatus"
            description="Positive s points downward along the incline. Static friction holds the block when mg sinθ ≤ μ_s mg cosθ."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={regimeBadge.tone}>{regimeBadge.label}</Badge>
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

          <div ref={stageRef} className="relative h-[360px] w-full sm:h-[420px]">
            <canvas
              ref={canvasRef}
              className="block size-full"
              aria-label="Inclined plane and friction simulation canvas"
            />
          </div>

          {/* Transport & live telemetry */}
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
                  step={0.01}
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
                <span>s = {formatNumber(currentState.s, 3)} m</span>
                <span>v = {formatNumber(currentState.v, 3)} m/s</span>
                <span>a = {formatNumber(currentState.a, 3)} m/s²</span>
                <span>N = {formatNumber(currentState.normalForce, 3)} N</span>
                <span>F_g = {formatNumber(currentState.gravityParallel, 3)} N</span>
                <span>
                  f ({currentState.frictionMode}) = {formatNumber(currentState.frictionMagnitude, 3)} N ({currentState.frictionDirection})
                </span>
                <span>F_net = {formatNumber(currentState.netForce, 3)} N</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Parameter Controls */}
        <Panel className="flex flex-col">
          <PanelHeader title="Incline & Surface Parameters" description="All quantities in SI units (μ_s ≥ μ_k enforced)." />
          <div className="space-y-4 p-5">
            <Slider
              label="Block mass m"
              value={params.mass}
              min={0.1}
              max={20.0}
              step={0.1}
              precision={1}
              unit="kg"
              onChange={(mass) => updateParams({ mass })}
            />
            <Slider
              label="Inclination angle θ"
              value={params.angleDeg}
              min={0}
              max={60}
              step={0.5}
              precision={1}
              unit="deg"
              onChange={(angleDeg) => updateParams({ angleDeg })}
            />
            <Slider
              label="Static friction coefficient μ_s"
              value={params.staticFriction}
              min={0}
              max={1.2}
              step={0.01}
              precision={2}
              onChange={(staticFriction) => updateParams({ staticFriction })}
            />
            <Slider
              label="Kinetic friction coefficient μ_k"
              value={params.kineticFriction}
              min={0}
              max={1.2}
              step={0.01}
              precision={2}
              onChange={(kineticFriction) => updateParams({ kineticFriction })}
            />
            <Slider
              label="Initial velocity along slope v₀"
              value={params.initialVelocity ?? 0}
              min={-6.0}
              max={6.0}
              step={0.2}
              precision={1}
              unit="m/s"
              onChange={(initialVelocity) => updateParams({ initialVelocity })}
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
              <p className="mb-1.5 text-[12px] font-medium text-muted">Surface & motion presets</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {SURFACE_PRESETS.map((preset) => {
                  const active =
                    Math.abs(params.angleDeg - preset.angleDeg) < 0.1 &&
                    Math.abs(params.staticFriction - preset.staticFriction) < 0.005 &&
                    Math.abs(params.kineticFriction - preset.kineticFriction) < 0.005 &&
                    Math.abs((params.initialVelocity ?? 0) - preset.initialVelocity) < 0.05;
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
                label="Primary force vectors (W, N, f)"
                checked={showPrimaryForces}
                onChange={setShowPrimaryForces}
              />
              <Toggle
                label="Gravity components (mg sinθ, mg cosθ)"
                checked={showComponents}
                onChange={setShowComponents}
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

      {/* Force & Kinematic Readout Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ReadoutCard
          label="Normal force N"
          value={`${formatNumber(currentState.normalForce, 4)} N`}
          sub={`mg cos(${formatNumber(params.angleDeg, 3)}°)`}
        />
        <ReadoutCard
          label="Parallel gravity F_g"
          value={`${formatNumber(currentState.gravityParallel, 4)} N`}
          sub={`mg sin(${formatNumber(params.angleDeg, 3)}°) downhill`}
        />
        <ReadoutCard
          label="Active friction force f"
          value={`${formatNumber(currentState.frictionMagnitude, 4)} N`}
          sub={`Mode: ${currentState.frictionMode} (${currentState.frictionDirection})`}
        />
        <ReadoutCard
          label="Friction thresholds"
          value={`${formatNumber(currentState.maxStaticFriction, 3)} / ${formatNumber(currentState.kineticFrictionForce, 3)} N`}
          sub="f_s(max) = μ_s N  |  f_k = μ_k N"
        />
        <ReadoutCard
          label="Net force & acceleration"
          value={`${formatNumber(currentState.netForce, 4)} N`}
          sub={`a = ${formatNumber(currentState.a, 4)} m/s²`}
        />
        <ReadoutCard
          label="Critical angle θ_c"
          value={`${formatNumber(summary.criticalAngleDeg, 3)}°`}
          sub={
            summary.holdsAtRest
              ? 'θ ≤ θ_c (Holds at rest)'
              : 'θ > θ_c (Breaks static friction)'
          }
        />
      </div>

      {/* Kinematic Graphs: s(t), v(t), a(t) */}
      <Panel>
        <PanelHeader
          title="Kinematics Along the Incline — s(t), v(t), a(t)"
          description="Computed from the exact piecewise equations of motion along the slope."
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
          {kinematicTab === 'position' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Position along slope s (m)"
              zeroLine
              series={[{ key: 's', label: 'Position s(t) (m)', color: 'var(--accent)' }]}
            />
          )}
          {kinematicTab === 'velocity' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Velocity v (m/s)"
              zeroLine
              series={[{ key: 'v', label: 'Velocity v(t) (m/s)', color: 'var(--success)' }]}
            />
          )}
          {kinematicTab === 'acceleration' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Acceleration a (m/s²)"
              zeroLine
              series={[{ key: 'a', label: 'Acceleration a(t) (m/s²)', color: 'var(--warning)' }]}
            />
          )}
        </div>
      </Panel>

      {/* Force Magnitudes, Static vs Kinetic Comparison & Energy Analysis */}
      <Panel>
        <PanelHeader
          title="Force Magnitudes & Static vs Kinetic Friction Analysis"
          description="Compare active friction with the static threshold f_s(max) = μ_s N and kinetic friction f_k = μ_k N."
          actions={
            <SegmentedControl
              label="Analysis graph selection"
              size="sm"
              value={analysisTab}
              options={ANALYSIS_TABS}
              onChange={setAnalysisTab}
            />
          }
        />
        <div className="p-4">
          {analysisTab === 'forces' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Force magnitude (N)"
              zeroLine
              series={[
                { key: 'gravityParallel', label: 'Parallel gravity F_g = mg sinθ (N)', color: 'var(--warning)' },
                { key: 'frictionMagnitude', label: 'Active friction |f(t)| (N)', color: 'var(--accent)' },
                { key: 'maxStaticFriction', label: 'Max static threshold f_s(max) = μ_s N (N)', color: 'var(--cyan)', dashed: true },
                { key: 'kineticFrictionForce', label: 'Kinetic threshold f_k = μ_k N (N)', color: 'var(--muted)', dashed: true },
                { key: 'netForce', label: 'Net force F_net (N)', color: 'var(--success)' },
              ]}
            />
          )}
          {analysisTab === 'angle-sweep' && (
            <PlotChart
              data={angleSweepData}
              xKey="angleDeg"
              xLabel="Inclination angle θ (deg)"
              yLabel="Force magnitude (N)"
              zeroLine
              series={[
                { key: 'activeFriction', label: 'Actual friction on block released from rest (N)', color: 'var(--accent)' },
                { key: 'gravityParallel', label: 'Downhill pull mg sinθ (N)', color: 'var(--warning)', dashed: true },
                { key: 'maxStaticFriction', label: 'Static limit f_s(max) = μ_s mg cosθ (N)', color: 'var(--cyan)', dashed: true },
                { key: 'kineticFrictionForce', label: 'Kinetic friction f_k = μ_k mg cosθ (N)', color: 'var(--success)', dashed: true },
              ]}
            />
          )}
          {analysisTab === 'energy' && (
            <PlotChart
              data={plotData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Energy (J)"
              zeroLine
              series={[
                { key: 'potentialDrop', label: 'Gravitational work −ΔU = mg s sinθ (J)', color: 'var(--accent)' },
                { key: 'kineticEnergy', label: 'Kinetic energy K = ½mv² (J)', color: 'var(--success)' },
                { key: 'thermalEnergy', label: 'Thermal energy dissipated E_th = f_k d (J)', color: 'var(--warning)' },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Scientific Reference: Static vs Kinetic Friction */}
      <Panel>
        <PanelHeader
          title="Physical Principles — Static vs Kinetic Friction on an Incline"
          icon={<Info className="size-4" aria-hidden />}
          description="Force resolution, limiting equilibrium, and direction-dependent Coulomb friction."
        />
        <div className="grid gap-6 p-5 text-[13px] leading-relaxed text-muted lg:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-semibold text-fg">1. Resolution of Weight & Normal Force</h3>
            <p>
              Rotating coordinates to align with the incline resolves the gravitational weight{' '}
              <MathFormula latex={String.raw`W = mg`} /> into a component perpendicular to the surface and a component
              parallel to the slope:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`N = mg\cos\theta,\qquad F_g = mg\sin\theta`}
              />
            </div>
            <p>
              Because there is no motion perpendicular to the ramp, the normal reaction <MathFormula latex="N" />{' '}
              balances <MathFormula latex={String.raw`mg\cos\theta`} />.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">2. Static Threshold & Critical Angle</h3>
            <p>
              When the block is at rest (<MathFormula latex="v = 0" />), static friction self-adjusts to match the
              downhill pull (<MathFormula latex={String.raw`f_s = mg\sin\theta`} />) up to the maximum threshold:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`f_{s,\max} = \mu_s N = \mu_s mg\cos\theta,\qquad \tan\theta_c = \mu_s`}
              />
            </div>
            <p>
              For <MathFormula latex={String.raw`\theta \le \theta_c`} />, the block remains stationary and kinetic
              friction is never applied. At <MathFormula latex={String.raw`\theta = \theta_c`} />, the block is in{' '}
              <strong className="text-fg">limiting equilibrium</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-fg">3. Kinetic Friction & Sliding Direction</h3>
            <p>
              Once sliding begins, friction drops from <MathFormula latex={String.raw`f_{s,\max}`} /> to{' '}
              <MathFormula latex={String.raw`f_k = \mu_k mg\cos\theta`} />, opposing the instantaneous velocity vector:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5 text-center">
              <MathFormula
                display
                latex={String.raw`a_{\text{down}} = g(\sin\theta - \mu_k\cos\theta),\quad a_{\text{up}} = g(\sin\theta + \mu_k\cos\theta)`}
              />
            </div>
            <p>
              During <strong className="text-fg">downward sliding</strong>, kinetic friction acts uphill. During{' '}
              <strong className="text-fg">upward sliding</strong> (<MathFormula latex="v_0 < 0" />), kinetic friction
              acts downhill alongside gravity until the block reaches its turnaround point.
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
  dashed = false,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const angle = Math.atan2(dy, dx);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.85;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  if (dashed) ctx.setLineDash([]);

  const head = 6.5;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawVectorLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.font = '600 10.5px Inter Variable, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}
