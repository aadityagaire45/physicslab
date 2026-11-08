import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Compass,
  Info,
  Maximize2,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { clamp } from '@/engine/mathematics/numeric';
import {
  EARTH_EQUATORIAL_RADIUS,
  EARTH_MASS,
  MARS_MASS,
  circularOrbitalVelocity,
  escapeVelocity,
  interpolateOrbitalStateAt,
  simulateOrbitalTrajectory,
  type OrbitalParams,
} from '@/engine/physics/orbital';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { formatNumber } from '@/engine/units/format';
import { useElementSize } from '@/hooks/useElementSize';
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
  { value: '4', label: '4×' },
] as const;

const PLOT_TABS = [
  { value: 'radius', label: 'r(t) Orbital Radius' },
  { value: 'speed', label: 'v(t) Orbital Speed' },
  { value: 'kinetic', label: 'K(t) Kinetic Energy' },
  { value: 'potential', label: 'U(t) Potential Energy' },
  { value: 'total-energy', label: 'E(t) Total Energy' },
  { value: 'angular-momentum', label: 'L(t) Angular Momentum' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface OrbitalPreset {
  id: string;
  label: string;
  category: 'Real-World' | 'Illustrative';
  sub: string;
  params: OrbitalParams;
}

const LEO_RADIUS = 6.778e6; // ~400 km altitude above Earth
const GEO_RADIUS = 4.2164e7; // ~35,786 km altitude geostationary ring
const MOON_PERIGEE = 3.633e8; // Moon perigee distance
const CIRCULAR_DEMO_RADIUS = 1.0e7;
const ELLIPTICAL_DEMO_RADIUS = 8.0e6;
const ESCAPE_DEMO_RADIUS = 8.0e6;
const HYPERBOLIC_DEMO_RADIUS = 8.5e6;

const ORBITAL_PRESETS: readonly OrbitalPreset[] = [
  {
    id: 'leo',
    label: 'Low Earth Orbit',
    category: 'Real-World',
    sub: 'r₀ = 6,778 km (400 km alt), v_t = 7,669 m/s, T ≈ 92.6 min',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 1200,
      initialRadius: LEO_RADIUS,
      tangentialVelocity: circularOrbitalVelocity(EARTH_MASS, LEO_RADIUS),
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'geo',
    label: 'Geostationary Orbit',
    category: 'Real-World',
    sub: 'r₀ = 42,164 km, v_t = 3,075 m/s, T ≈ 23.93 h (sidereal day)',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 2500,
      initialRadius: GEO_RADIUS,
      tangentialVelocity: circularOrbitalVelocity(EARTH_MASS, GEO_RADIUS),
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'moon-like',
    label: 'Moon-like Orbit',
    category: 'Real-World',
    sub: 'r₀ = 363,300 km (perigee), v_t = 1,076 m/s, e ≈ 0.055',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 5000,
      initialRadius: MOON_PERIGEE,
      tangentialVelocity: 1076,
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'circular',
    label: 'Circular Orbit',
    category: 'Illustrative',
    sub: 'r₀ = 10,000 km, v_t = v_c = 6,314 m/s, e = 0',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 1000,
      initialRadius: CIRCULAR_DEMO_RADIUS,
      tangentialVelocity: circularOrbitalVelocity(EARTH_MASS, CIRCULAR_DEMO_RADIUS),
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'elliptical',
    label: 'Elliptical Orbit',
    category: 'Illustrative',
    sub: 'r₀ = 8,000 km, v_t = 8,200 m/s, e ≈ 0.35 (transfer ellipse)',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 1000,
      initialRadius: ELLIPTICAL_DEMO_RADIUS,
      tangentialVelocity: 8200,
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'escape',
    label: 'Escape Trajectory',
    category: 'Illustrative',
    sub: 'r₀ = 8,000 km, v_t = v_e = 9,983 m/s, e = 1.00 (parabolic limit)',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 800,
      initialRadius: ESCAPE_DEMO_RADIUS,
      tangentialVelocity: escapeVelocity(EARTH_MASS, ESCAPE_DEMO_RADIUS),
      radialVelocity: 0,
      initialAngleDeg: 0,
    },
  },
  {
    id: 'hyperbolic',
    label: 'Hyperbolic Flyby',
    category: 'Illustrative',
    sub: 'r₀ = 8,500 km, v_t = 11,200 m/s, v_r = 1,200 m/s, e > 1',
    params: {
      centralMass: EARTH_MASS,
      satelliteMass: 800,
      initialRadius: HYPERBOLIC_DEMO_RADIUS,
      tangentialVelocity: 11200,
      radialVelocity: 1200,
      initialAngleDeg: -30,
    },
  },
] as const;

/** Formats a time duration in seconds alongside minutes/hours/days for orbital intuition. */
function formatOrbitalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 120) return `${formatNumber(seconds, 4)} s`;
  if (seconds < 7200) {
    return `${formatNumber(seconds, 4)} s (${formatNumber(seconds / 60, 3)} min)`;
  }
  if (seconds < 172_800) {
    return `${formatNumber(seconds, 4)} s (${formatNumber(seconds / 3600, 3)} h)`;
  }
  return `${formatNumber(seconds, 4)} s (${formatNumber(seconds / 86_400, 3)} d)`;
}

/** Formats a distance in meters with a companion km readout. */
function formatOrbitalDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  const km = meters / 1000;
  return `${formatNumber(meters, 4)} m (${formatNumber(km, 4)} km)`;
}

export default function OrbitalMotionLab() {
  const [params, setParams] = useState<OrbitalParams>(ORBITAL_PRESETS[4].params); // Start on Elliptical Orbit so periapsis/apoapsis are immediately visible
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2' | '4'>('1');
  const [showTrail, setShowTrail] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [showApseMarkers, setShowApseMarkers] = useState(true);
  const [plotTab, setPlotTab] = useState<PlotTab>('radius');
  const [running, setRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(
    null,
  );
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

  // Compute orbital elements and full RK4 trajectory.
  const trajectory = useMemo(
    () => simulateOrbitalTrajectory(params, { sampleCount: 280 }),
    [params],
  );
  const { elements, duration: windowDuration, samples } = trajectory;

  const currentState = useMemo(
    () => interpolateOrbitalStateAt(trajectory, params, simTime),
    [trajectory, params, simTime],
  );

  const updateParams = (patch: Partial<OrbitalParams>) => {
    setRunning(false);
    setSimTime(0);
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (preset: OrbitalPreset) => {
    setRunning(false);
    setSimTime(0);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setParams({ ...preset.params });
  };

  const stepForward = () => {
    setRunning(false);
    const stepDt = Math.max(1, Number((windowDuration / 60).toFixed(2)));
    setSimTime((t) =>
      t >= windowDuration ? stepDt : Math.min(windowDuration, Number((t + stepDt).toFixed(2))),
    );
  };

  // Animation loop mapped so 1× playback completes the orbital window in ~12 wall-clock seconds.
  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  useEffect(() => {
    if (!running) return;
    if (simTimeRef.current >= windowDuration) {
      setSimTime(0);
      simTimeRef.current = 0;
    }
    const playbackRate = (windowDuration / 12) * Number(timeScale);
    const loop = createSimulationLoop({
      timeScale: playbackRate,
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
  }, [running, timeScale, windowDuration]);

  // Synchronized graph series from RK4 trajectory samples.
  const graphData = useMemo(() => {
    return samples.map((s) => ({
      t: Number(s.t.toFixed(2)),
      rKm: s.r / 1000,
      rpKm: elements.periapsisDistance / 1000,
      aKm:
        elements.isBound && elements.semiMajorAxis !== null
          ? elements.semiMajorAxis / 1000
          : null,
      speed: s.speed,
      vc: s.localCircularSpeed,
      ve: s.localEscapeSpeed,
      kineticMJ: s.kineticEnergy / 1e6,
      potentialMJ: s.potentialEnergy / 1e6,
      totalMJ: s.totalEnergy / 1e6,
      initialTotalMJ: elements.initialTotalEnergy / 1e6,
      specificAngMom: s.specificAngularMomentum,
      initialSpecificAngMom: elements.specificAngularMomentum,
      totalAngMom: s.angularMomentum,
    }));
  }, [samples, elements]);

  // Record observation in My Notebook.
  const recordToNotebook = () => {
    const classLabel =
      elements.classification === 'circular'
        ? 'Circular Orbit'
        : elements.classification === 'elliptical'
          ? 'Elliptical Orbit'
          : elements.classification === 'parabolic'
            ? 'Parabolic Escape Trajectory'
            : 'Hyperbolic Escape Trajectory';

    addEntry({
      experimentSlug: 'orbital-motion',
      title: `${classLabel} (e = ${formatNumber(elements.eccentricity, 3)}, r₀ = ${formatNumber(params.initialRadius / 1000, 4)} km)`,
      body: `2D Newtonian orbital simulation with central mass M = ${formatNumber(params.centralMass, 4)} kg, satellite mass m = ${formatNumber(params.satelliteMass, 4)} kg, r₀ = ${formatNumber(params.initialRadius / 1000, 4)} km, v_t = ${formatNumber(params.tangentialVelocity, 4)} m/s, v_r = ${formatNumber(params.radialVelocity ?? 0, 4)} m/s. Max RK4 energy drift: ${formatNumber(trajectory.maxRelativeEnergyDrift * 100, 3)}%, angular momentum drift: ${formatNumber(trajectory.maxRelativeAngularMomentumDrift * 100, 3)}%.`,
      measurements: [
        { label: 'Central body mass M', value: `${formatNumber(params.centralMass, 4)} kg` },
        { label: 'Satellite mass m', value: `${formatNumber(params.satelliteMass, 4)} kg` },
        { label: 'Orbit classification', value: classLabel },
        { label: 'Eccentricity e', value: formatNumber(elements.eccentricity, 4) },
        {
          label: 'Orbital period T',
          value:
            elements.orbitalPeriod !== null
              ? formatOrbitalDuration(elements.orbitalPeriod)
              : 'Unbound (no finite period)',
        },
        {
          label: 'Semi-major axis a',
          value:
            elements.semiMajorAxis !== null
              ? formatOrbitalDistance(elements.semiMajorAxis)
              : 'Divergent / undefined (parabolic limit)',
        },
        { label: 'Periapsis r_p', value: formatOrbitalDistance(elements.periapsisDistance) },
        {
          label: 'Apoapsis r_a',
          value:
            elements.apoapsisDistance !== null
              ? formatOrbitalDistance(elements.apoapsisDistance)
              : 'Unbound (∞)',
        },
        { label: 'Specific orbital energy ε', value: `${formatNumber(elements.specificEnergy, 4)} J/kg` },
        { label: 'Specific angular momentum h', value: `${formatNumber(elements.specificAngularMomentum, 4)} m²/s` },
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

  // Canvas 2D space-inspired orbital apparatus.
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(stageRef);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDraggingCanvas(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvas || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPanOffset({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleCanvasPointerUp = () => {
    setIsDraggingCanvas(false);
    dragStartRef.current = null;
  };

  const drawApparatus = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, size.width || 680);
    const height = Math.max(1, size.height || 420);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Deep space backdrop with subtle radial nebula gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      20,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75,
    );
    bgGrad.addColorStop(0, '#0d172a');
    bgGrad.addColorStop(0.55, '#080e1c');
    bgGrad.addColorStop(1, '#050912');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle deterministic background stars
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    for (let i = 0; i < 42; i += 1) {
      const sx = ((i * 137 + 29) % 997) / 997 * width;
      const sy = ((i * 293 + 71) % 991) / 991 * height;
      const sr = i % 5 === 0 ? 1.3 : 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Compute world-to-screen bounding box from trajectory samples
    let maxCoord = params.initialRadius * 1.35;
    for (let i = 0; i < samples.length; i += 1) {
      const d = Math.hypot(samples[i].x, samples[i].y);
      if (d * 1.18 > maxCoord) maxCoord = d * 1.18;
    }
    if (elements.apoapsisDistance !== null && elements.isBound) {
      maxCoord = Math.max(maxCoord, elements.apoapsisDistance * 1.2);
    }

    const usableRadiusPx = Math.min(width, height) * 0.39;
    const metersPerPixel = maxCoord / (usableRadiusPx * zoom);
    const focusX = width * 0.5 + panOffset.x;
    const focusY = height * 0.5 + panOffset.y;

    const toScreenX = (xM: number) => focusX + xM / metersPerPixel;
    const toScreenY = (yM: number) => focusY - yM / metersPerPixel;

    // 3. Polar & Cartesian coordinate reference grid centered on Focus (0, 0)
    const rawStepM = (usableRadiusPx * 0.35) * metersPerPixel;
    const mag = 10 ** Math.floor(Math.log10(Math.max(1, rawStepM)));
    const norm = rawStepM / mag;
    const niceMultiplier = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    const gridRingStepM = niceMultiplier * mag;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.11)';
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 5; ring += 1) {
      const ringRadiusPx = (ring * gridRingStepM) / metersPerPixel;
      if (ringRadiusPx > Math.max(width, height) * 1.3) break;
      ctx.beginPath();
      ctx.arc(focusX, focusY, ringRadiusPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Coordinate axes (+x, +y) through focus
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(0, focusY);
    ctx.lineTo(width, focusY);
    ctx.moveTo(focusX, 0);
    ctx.lineTo(focusX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('+x (0°)', width - 12, focusY - 6);
    ctx.textAlign = 'left';
    ctx.fillText('+y (90°)', focusX + 6, 16);

    // 4. Apse line (line of apsides connecting Periapsis and Apoapsis)
    if (showApseMarkers) {
      const px = toScreenX(elements.periapsisPosition.x);
      const py = toScreenY(elements.periapsisPosition.y);

      if (elements.apoapsisPosition !== null) {
        const ax = toScreenX(elements.apoapsisPosition.x);
        const ay = toScreenY(elements.apoapsisPosition.y);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 5. Full numerically integrated reference orbit path (faint guide curve)
    if (samples.length > 1) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let i = 0; i < samples.length; i += 1) {
        const sx = toScreenX(samples[i].x);
        const sy = toScreenY(samples[i].y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Active trajectory trail up to current simulation time t
    if (showTrail && samples.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toScreenX(samples[0].x), toScreenY(samples[0].y));
      for (let i = 1; i < samples.length; i += 1) {
        if (samples[i].t > currentState.t) break;
        ctx.lineTo(toScreenX(samples[i].x), toScreenY(samples[i].y));
      }
      ctx.lineTo(toScreenX(currentState.x), toScreenY(currentState.y));
      ctx.stroke();
    }

    // 7. Central massive celestial body at Focus (0, 0)
    const physicalPlanetRadiusPx =
      (EARTH_EQUATORIAL_RADIUS * Math.cbrt(params.centralMass / EARTH_MASS)) / metersPerPixel;
    const planetRadiusPx = clamp(physicalPlanetRadiusPx, 10, 34);

    // Atmospheric glow
    const glow = ctx.createRadialGradient(
      focusX,
      focusY,
      planetRadiusPx * 0.4,
      focusX,
      focusY,
      planetRadiusPx * 2.2,
    );
    glow.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
    glow.addColorStop(0.6, 'rgba(37, 99, 235, 0.14)');
    glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(focusX, focusY, planetRadiusPx * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Planet sphere
    const planetGrad = ctx.createRadialGradient(
      focusX - planetRadiusPx * 0.3,
      focusY - planetRadiusPx * 0.3,
      planetRadiusPx * 0.15,
      focusX,
      focusY,
      planetRadiusPx,
    );
    planetGrad.addColorStop(0, '#60a5fa');
    planetGrad.addColorStop(0.55, '#2563eb');
    planetGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(focusX, focusY, planetRadiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Central focus marker crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(focusX - 4, focusY);
    ctx.lineTo(focusX + 4, focusY);
    ctx.moveTo(focusX, focusY - 4);
    ctx.lineTo(focusX, focusY + 4);
    ctx.stroke();

    // 8. Periapsis (P) and Apoapsis (A) markers
    if (showApseMarkers && elements.classification !== 'circular') {
      const px = toScreenX(elements.periapsisPosition.x);
      const py = toScreenY(elements.periapsisPosition.y);
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `P (r_p = ${formatNumber(elements.periapsisDistance / 1000, 3)} km)`,
        px + 8,
        py - 6,
      );

      if (elements.apoapsisPosition !== null && elements.apoapsisDistance !== null) {
        const ax = toScreenX(elements.apoapsisPosition.x);
        const ay = toScreenY(elements.apoapsisPosition.y);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(ax, ay, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(
          `A (r_a = ${formatNumber(elements.apoapsisDistance / 1000, 3)} km)`,
          ax + 8,
          ay + 14,
        );
      }
    }

    // 9. Orbital radius indicator line r⃗(t) from Focus (0, 0) to Satellite (x, y)
    const satX = toScreenX(currentState.x);
    const satY = toScreenY(currentState.y);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(focusX, focusY);
    ctx.lineTo(satX, satY);
    ctx.stroke();
    ctx.setLineDash([]);

    const midRx = (focusX + satX) * 0.5;
    const midRy = (focusY + satY) * 0.5;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${formatNumber(currentState.r / 1000, 4)} km`, midRx, midRy - 6);

    // 10. Velocity vector v⃗ and Gravitational acceleration/force vector a⃗_g
    const drawVectorArrow = (
      x0: number,
      y0: number,
      dx: number,
      dy: number,
      color: string,
      label: string,
    ) => {
      const len = Math.hypot(dx, dy);
      if (len < 4) return;
      const x1 = x0 + dx;
      const y1 = y0 + dy;
      const angle = Math.atan2(dy, dx);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      const head = 7;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      ctx.font = '600 10.5px Inter, system-ui, sans-serif';
      ctx.textAlign = dx >= 0 ? 'left' : 'right';
      ctx.fillText(label, x1 + (dx >= 0 ? 6 : -6), y1 + (dy >= 0 ? 12 : -5));
    };

    if (showVectors) {
      // Velocity vector v⃗ (scaled relative to circular velocity)
      const vScale = clamp((currentState.speed / Math.max(1, elements.circularVelocity)) * 46, 18, 78);
      const vUnitX = currentState.speed > 0 ? currentState.vx / currentState.speed : 0;
      const vUnitY = currentState.speed > 0 ? -currentState.vy / currentState.speed : 0;
      drawVectorArrow(
        satX,
        satY,
        vUnitX * vScale,
        vUnitY * vScale,
        '#22d3ee',
        `v⃗ (${formatNumber(currentState.speed, 4)} m/s)`,
      );

      // Gravitational acceleration vector a⃗_g pointing toward focus
      const aScale = clamp(
        (currentState.accelerationMagnitude / Math.max(1e-6, elements.initialAcceleration)) * 38,
        16,
        68,
      );
      const aUnitX =
        currentState.accelerationMagnitude > 0
          ? currentState.ax / currentState.accelerationMagnitude
          : 0;
      const aUnitY =
        currentState.accelerationMagnitude > 0
          ? -currentState.ay / currentState.accelerationMagnitude
          : 0;
      drawVectorArrow(
        satX,
        satY,
        aUnitX * aScale,
        aUnitY * aScale,
        '#fb7185',
        `a⃗_g (${formatNumber(currentState.accelerationMagnitude, 3)} m/s²)`,
      );
    }

    // 11. Orbiting satellite / spacecraft icon at (satX, satY)
    const satHeading = Math.atan2(-currentState.vy, currentState.vx);
    ctx.save();
    ctx.translate(satX, satY);
    ctx.rotate(satHeading);

    // Solar panel wings
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1;
    ctx.fillRect(-3, -12, 6, 7);
    ctx.strokeRect(-3, -12, 6, 7);
    ctx.fillRect(-3, 5, 6, 7);
    ctx.strokeRect(-3, 5, 6, 7);

    // Spacecraft bus
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 12. HUD overlays: Motion direction, simulation time, and distance scale bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 235, 52, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 11.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${formatOrbitalDuration(currentState.t)}`, 22, 31);

    const dirText =
      elements.motionDirection === 'counter-clockwise'
        ? 'CCW Prograde (h_z > 0)'
        : elements.motionDirection === 'clockwise'
          ? 'CW Retrograde (h_z < 0)'
          : 'Radial Trajectory (h_z = 0)';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10.5px Inter, system-ui, sans-serif';
    ctx.fillText(`Motion: ${dirText}`, 22, 49);

    // Distance scale bar at bottom-left
    const scaleBarPx = gridRingStepM / metersPerPixel;
    const clampedBarPx = clamp(scaleBarPx, 45, 140);
    const representedKm = (clampedBarPx * metersPerPixel) / 1000;
    const barX = 16;
    const barY = height - 18;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + clampedBarPx, barY);
    ctx.moveTo(barX, barY - 4);
    ctx.lineTo(barX, barY + 4);
    ctx.moveTo(barX + clampedBarPx, barY - 4);
    ctx.lineTo(barX + clampedBarPx, barY + 4);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 10.5px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Scale: ${formatNumber(representedKm, 3)} km`, barX, barY - 8);

    ctx.restore();
  }, [
    size.width,
    size.height,
    params,
    samples,
    elements,
    currentState,
    showTrail,
    showVectors,
    showApseMarkers,
    zoom,
    panOffset,
  ]);

  useEffect(() => {
    drawApparatus();
  }, [drawApparatus]);

  const classificationBadge = (() => {
    switch (elements.classification) {
      case 'circular':
        return {
          tone: 'success' as const,
          label: `Circular Orbit (e = ${formatNumber(elements.eccentricity, 3)})`,
        };
      case 'elliptical':
        return {
          tone: 'accent' as const,
          label: `Elliptical Orbit (e = ${formatNumber(elements.eccentricity, 3)})`,
        };
      case 'parabolic':
        return {
          tone: 'warning' as const,
          label: `Parabolic Escape Trajectory (e = ${formatNumber(elements.eccentricity, 3)})`,
        };
      case 'hyperbolic':
        return {
          tone: 'warning' as const,
          label: `Hyperbolic Escape Trajectory (e = ${formatNumber(elements.eccentricity, 3)})`,
        };
    }
  })();

  const centralMassScale = params.centralMass / 1e24;
  const radiusKm = params.initialRadius / 1000;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left Column: 2D Orbital Apparatus, Transport Controls & Live Telemetry */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="2D Newtonian Orbital Apparatus"
            description="Central mass M at Focus (0, 0). Satellite trajectory is integrated numerically via 4th-order Runge–Kutta."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={classificationBadge.tone}>{classificationBadge.label}</Badge>
                <SegmentedControl
                  label="Simulation speed"
                  size="sm"
                  value={timeScale}
                  options={TIME_SCALES}
                  onChange={setTimeScale}
                />
              </div>
            }
          />

          <div ref={stageRef} className="relative h-[380px] w-full sm:h-[430px]">
            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              className="block size-full cursor-grab active:cursor-grabbing"
              aria-label="Two-dimensional orbital mechanics simulation canvas"
            />

            {/* Zoom & Pan Floating Toolbar */}
            <div className=" absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/85 px-2 py-1 text-xs text-slate-200 shadow-md backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(Number((z * 0.8).toFixed(2)), 0.35, 3.5))}
                className="rounded p-1 hover:bg-slate-800"
                aria-label="Zoom out orbital view"
                title="Zoom out"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="min-w-[42px] text-center font-mono text-[11px]">
                {formatNumber(zoom, 2)}×
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => clamp(Number((z * 1.25).toFixed(2)), 0.35, 3.5))}
                className="rounded p-1 hover:bg-slate-800"
                aria-label="Zoom in orbital view"
                title="Zoom in"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="ml-1 flex items-center gap-1 rounded border border-slate-700 px-1.5 py-0.5 text-[11px] hover:bg-slate-800"
                aria-label="Reset orbital camera view"
              >
                <Maximize2 className="size-3" />
                Center
              </button>
            </div>
          </div>

          {/* Playback Controls & Scrubber */}
          <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRunning((r) => !r)}
              >
                {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {running ? 'Pause' : simTime > 0 && simTime < windowDuration ? 'Resume' : 'Play'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={stepForward}
                disabled={running}
              >
                <StepForward className="size-3.5" />
                Step
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRunning(false);
                  setSimTime(0);
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>

              <div className="ml-auto flex flex-wrap items-center gap-4">
                <Toggle
                  label="Orbit trail"
                  checked={showTrail}
                  onChange={setShowTrail}
                />
                <Toggle
                  label="Vectors (v⃗, a⃗_g)"
                  checked={showVectors}
                  onChange={setShowVectors}
                />
                <Toggle
                  label="Apse markers (P/A)"
                  checked={showApseMarkers}
                  onChange={setShowApseMarkers}
                />
              </div>
            </div>

            <Slider
              label="Simulation time scrubber t"
              value={Number(simTime.toFixed(1))}
              min={0}
              max={Number(windowDuration.toFixed(1))}
              step={Math.max(1, Number((windowDuration / 240).toFixed(1)))}
              unit="s"
              onChange={(t) => {
                setRunning(false);
                setSimTime(t);
              }}
            />
          </div>

          {/* Live Orbital Calculations & Telemetry Grid (14 required metrics) */}
          <div className="border-t border-line px-5 py-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
                Live Orbital Telemetry & Conic Elements
              </h3>
              <span className="font-mono text-xs text-muted">
                v / v_c = {formatNumber(currentState.speed / elements.circularVelocity, 3)} · v / v_e ={' '}
                {formatNumber(currentState.speed / elements.escapeVelocity, 3)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Orbital radius r(t)</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatOrbitalDistance(currentState.r)}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Orbital speed v(t)</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(currentState.speed, 4)} m/s
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Gravity accel a_g(t)</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(currentState.accelerationMagnitude, 4)} m/s²
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Circular velocity v_c</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(elements.circularVelocity, 4)} m/s
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Escape velocity v_e</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(elements.escapeVelocity, 4)} m/s
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Orbital period T</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {elements.orbitalPeriod !== null
                    ? formatOrbitalDuration(elements.orbitalPeriod)
                    : 'Unbound (no period)'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Eccentricity e</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(elements.eccentricity, 4)}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Semi-major axis a</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {elements.semiMajorAxis !== null
                    ? formatOrbitalDistance(elements.semiMajorAxis)
                    : 'Divergent (e = 1)'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Periapsis distance r_p</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatOrbitalDistance(elements.periapsisDistance)}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Apoapsis distance r_a</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {elements.apoapsisDistance !== null
                    ? formatOrbitalDistance(elements.apoapsisDistance)
                    : 'Unbound (∞)'}
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Specific energy ε</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(currentState.specificEnergy, 4)} J/kg
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Total energy E(t)</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(currentState.totalEnergy, 4)} J
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Specific ang. mom. h</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-fg">
                  {formatNumber(currentState.specificAngularMomentum, 4)} m²/s
                </p>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] font-medium text-muted">Orbit classification</p>
                <p className="mt-0.5 text-xs font-semibold text-accent capitalize">
                  {elements.classification}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Right Column: Orbital Parameters, Presets & Notebook Action */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Orbital Parameters"
              description="Adjust central mass, satellite mass, initial radius and velocity components."
            />

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Slider
                  label="Central body mass M (×10²⁴ kg)"
                  value={Number(centralMassScale.toFixed(3))}
                  min={0.5}
                  max={25}
                  step={0.05}
                  unit="×10²⁴ kg"
                  onChange={(val) => updateParams({ centralMass: val * 1e24 })}
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateParams({ centralMass: EARTH_MASS })}
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-soft hover:border-accent/50 hover:text-fg"
                  >
                    Earth (5.97×10²⁴ kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParams({ centralMass: MARS_MASS })}
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-soft hover:border-accent/50 hover:text-fg"
                  >
                    Mars (0.642×10²⁴ kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParams({ centralMass: 2 * EARTH_MASS })}
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-soft hover:border-accent/50 hover:text-fg"
                  >
                    Super-Earth (2 M⊕)
                  </button>
                </div>
              </div>

              <Slider
                label="Satellite mass m"
                value={params.satelliteMass}
                min={100}
                max={10000}
                step={50}
                unit="kg"
                onChange={(satelliteMass) => updateParams({ satelliteMass })}
              />

              <Slider
                label="Initial orbital radius r₀"
                value={ Math.round(radiusKm) }
                min={6500}
                max={400000}
                step={100}
                unit="km"
                onChange={(km) => updateParams({ initialRadius: km * 1000 })}
              />

              <div className="space-y-2">
                <Slider
                  label="Initial tangential velocity v_t"
                  value={Number(params.tangentialVelocity.toFixed(1))}
                  min={-14000}
                  max={14000}
                  step={10}
                  unit="m/s"
                  onChange={(tangentialVelocity) => updateParams({ tangentialVelocity })}
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateParams({
                        tangentialVelocity: Number(
                          circularOrbitalVelocity(params.centralMass, params.initialRadius).toFixed(2),
                        ),
                        radialVelocity: 0,
                      })
                    }
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-soft hover:border-accent/50 hover:text-fg"
                  >
                    Set v_t = v_c ({formatNumber(elements.circularVelocity, 4)} m/s)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateParams({
                        tangentialVelocity: Number(
                          escapeVelocity(params.centralMass, params.initialRadius).toFixed(4),
                        ),
                        radialVelocity: 0,
                      })
                    }
                    className="rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-soft hover:border-accent/50 hover:text-fg"
                  >
                    Set v_t = v_e ({formatNumber(elements.escapeVelocity, 4)} m/s)
                  </button>
                </div>
              </div>

              <Slider
                label="Initial radial velocity v_r"
                value={params.radialVelocity ?? 0}
                min={-6000}
                max={6000}
                step={25}
                unit="m/s"
                onChange={(radialVelocity) => updateParams({ radialVelocity })}
              />

              <Slider
                label="Initial orbital angle θ₀"
                value={params.initialAngleDeg ?? 0}
                min={-180}
                max={180}
                step={5}
                unit="°"
                onChange={(initialAngleDeg) => updateParams({ initialAngleDeg })}
              />

              <div className="pt-2">
                <Button
                  variant={savedNotice ? 'secondary' : 'primary'}
                  className="w-full justify-center"
                  onClick={recordToNotebook}
                >
                  {savedNotice ? (
                    <>
                      <Check className="size-4 text-emerald-400" />
                      Saved to My Notebook
                    </>
                  ) : (
                    <>
                      <NotebookPen className="size-4" />
                      Record run in My Notebook
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Panel>

          {/* Orbital Presets */}
          <Panel className="p-5">
            <PanelHeader
              title="Orbital Trajectory Presets"
              description="Real-world Earth/lunar missions and illustrative conic-section trajectories."
            />
            <div className="mt-3.5 grid gap-2">
              {ORBITAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group flex flex-col items-start rounded-lg border border-line bg-surface-2/40 px-3.5 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-surface-2"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-fg group-hover:text-accent">
                      {preset.label}
                    </span>
                    <Badge tone={preset.category === 'Real-World' ? 'accent' : 'neutral'}>
                      {preset.category}
                    </Badge>
                  </div>
                  <span className="mt-1 text-[11px] text-muted">{preset.sub}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Synchronized Interactive Graphs (6 required tabs) */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Synchronized Orbital Kinematics & Conservation Graphs
            </h3>
            <p className="text-xs text-muted">
              Plotted directly from the 2D RK4 numerical integration across the orbital window.
            </p>
          </div>
          <SegmentedControl
            label="Orbital graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'radius' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Orbital radius r (km)"
              series={[
                { key: 'rKm', label: 'Orbital radius r(t) (km)', color: '#38bdf8' },
                { key: 'rpKm', label: 'Periapsis distance r_p (km)', color: '#34d399', dashed: true },
                ...(elements.isBound && elements.semiMajorAxis !== null
                  ? [{ key: 'aKm', label: 'Semi-major axis a (km)', color: '#a78bfa', dashed: true }]
                  : []),
              ]}
            />
          )}

          {plotTab === 'speed' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Speed v (m/s)"
              series={[
                { key: 'speed', label: 'Orbital speed v(t) (m/s)', color: '#22d3ee' },
                { key: 'vc', label: 'Local circular speed v_c(r) (m/s)', color: '#34d399', dashed: true },
                { key: 've', label: 'Local escape speed v_e(r) (m/s)', color: '#fb7185', dashed: true },
              ]}
            />
          )}

          {plotTab === 'kinetic' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Kinetic Energy K (MJ)"
              series={[
                { key: 'kineticMJ', label: 'Kinetic energy K(t) = ½mv² (MJ)', color: '#38bdf8' },
              ]}
            />
          )}

          {plotTab === 'potential' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Potential Energy U (MJ)"
              series={[
                { key: 'potentialMJ', label: 'Gravitational potential U(t) = −GMm/r (MJ)', color: '#fbbf24' },
              ]}
            />
          )}

          {plotTab === 'total-energy' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Mechanical Energy (MJ)"
              zeroLine
              series={[
                { key: 'totalMJ', label: 'Total mechanical energy E(t) = K + U (MJ)', color: '#34d399' },
                { key: 'kineticMJ', label: 'Kinetic energy K(t) (MJ)', color: '#38bdf8', dashed: true },
                { key: 'potentialMJ', label: 'Potential energy U(t) (MJ)', color: '#fbbf24', dashed: true },
              ]}
            />
          )}

          {plotTab === 'angular-momentum' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Specific Angular Momentum h (m²/s)"
              series={[
                { key: 'specificAngMom', label: 'Simulated h(t) = |r⃗ × v⃗| (m²/s)', color: '#a78bfa' },
                { key: 'initialSpecificAngMom', label: 'Conserved theoretical h₀ (m²/s)', color: '#34d399', dashed: true },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Conservation Analysis & Numerical Integration Diagnostics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Conservation Laws & RK4 Numerical Drift Analysis
            </h3>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            In an exact Newtonian central-force field (<MathFormula latex="\vec{F} = -GMm\vec{r}/r^3" />),
            gravity exerts zero torque (<MathFormula latex="\vec{\tau} = \vec{r} \times \vec{F} = \vec{0}" />)
            and is conservative. As the satellite approaches periapsis (<MathFormula latex="r_p" />),
            gravitational potential energy <MathFormula latex="U = -GMm/r" /> becomes more negative while
            kinetic energy <MathFormula latex="K = \tfrac{1}{2}mv^2" /> peaks, keeping total mechanical
            energy <MathFormula latex="E = K + U" /> constant.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="text-[11px] font-medium text-muted">Speed at Periapsis vs Apoapsis</p>
              <p className="mt-1 font-mono text-xs font-semibold text-fg">
                v_p = {formatNumber(elements.periapsisSpeed, 4)} m/s
                {elements.apoapsisSpeed !== null
                  ? ` · v_a = ${formatNumber(elements.apoapsisSpeed, 4)} m/s`
                  : ' · Unbound'}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Kepler’s 2nd Law: <MathFormula latex="r_p v_p = r_a v_a = h" /> (faster near periapsis,
                slower near apoapsis).
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="text-[11px] font-medium text-muted">RK4 Numerical Integration Drift</p>
              <p className="mt-1 font-mono text-xs font-semibold text-fg">
                ΔE / |E₀|: {formatNumber(trajectory.maxRelativeEnergyDrift * 100, 3)}% · Δh / h₀:{' '}
                {formatNumber(trajectory.maxRelativeAngularMomentumDrift * 100, 3)}%
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Classical 4th-order Runge–Kutta is non-symplectic with local truncation error{' '}
                <MathFormula latex="\mathcal{O}(\Delta t^5)" />; adaptive sub-stepping near periapsis bounds
                cumulative drift without masking finite-step numerical behavior.
              </p>
            </div>
          </div>
        </Panel>

        {/* Educational Theory & Equations Panel */}
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Orbital Mechanics, Conic Sections & Kepler’s Laws
            </h3>
          </div>

          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="font-semibold text-fg">1. Universal Gravitation & Vis-Viva Equation</p>
              <div className="my-1.5">
                <MathFormula
                  display
                  latex="\vec{a} = -\frac{GM}{r^3}\vec{r},\qquad v^2 = GM\!\left(\frac{2}{r} - \frac{1}{a}\right)"
                />
              </div>
              <p className="text-muted">
                Circular speed occurs when centripetal acceleration equals gravity:{' '}
                <MathFormula latex="v_c = \sqrt{GM/r}" />. Setting specific energy{' '}
                <MathFormula latex="\varepsilon = v^2/2 - GM/r = 0" /> yields the parabolic escape velocity{' '}
                <MathFormula latex="v_e = \sqrt{2GM/r} = \sqrt{2}\,v_c" />.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="font-semibold text-fg">2. Eccentricity, Apsides & Kepler’s Third Law</p>
              <div className="my-1.5">
                <MathFormula
                  display
                  latex="e = \sqrt{1 + \frac{2\varepsilon h^2}{(GM)^2}},\qquad r_p = a(1-e),\qquad r_a = a(1+e),\qquad T = 2\pi\sqrt{\frac{a^3}{GM}}"
                />
              </div>
              <p className="text-muted">
                Bound orbits (<MathFormula latex="\varepsilon < 0" />) form circles (<MathFormula latex="e = 0" />)
                or ellipses (<MathFormula latex="0 < e < 1" />) with central focus <MathFormula latex="M" />.
                Unbound trajectories form parabolas (<MathFormula latex="\varepsilon = 0, e = 1" />) or
                hyperbolas (<MathFormula latex="\varepsilon > 0, e > 1" />) that escape to infinity.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
