import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Info,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from 'lucide-react';
import {
  evaluateRCStateAt,
  rcTimeConstant,
  simulateRCTrajectory,
  type RCCircuitMode,
  type RCCircuitParams,
} from '@/engine/physics/electricity';
import { createSimulationLoop } from '@/engine/simulation/loop';
import { formatNumber, formatQuantity } from '@/engine/units/format';
import { useNotebookStore } from '@/store/notebookStore';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { PlotChart } from '@/components/graphs/PlotChart';

const RC_MODES = [
  { value: 'charging', label: 'Charging (Switch → Battery)' },
  { value: 'discharging', label: 'Discharging (Switch → Loop)' },
] as const;

const TIME_SCALES = [
  { value: '0.25', label: '0.25×' },
  { value: '0.5', label: '0.5×' },
  { value: '1', label: '1×' },
  { value: '2', label: '2×' },
] as const;

const PLOT_TABS = [
  { value: 'voltages', label: 'V_C(t) & V_R(t) Voltages' },
  { value: 'current', label: 'I(t) Current' },
  { value: 'charge', label: 'q(t) Capacitor Charge' },
  { value: 'energy', label: 'U_C(t) Stored Energy' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface RCPreset {
  id: string;
  label: string;
  sub: string;
  voltage: number;
  resistanceKOhm: number;
  capacitanceUf: number;
  mode: RCCircuitMode;
}

const RC_PRESETS: readonly RCPreset[] = [
  {
    id: 'standard-2s-charging',
    label: 'Standard τ = 2.0 s Charging Transient',
    sub: 'V₀ = 10 V, R = 2.0 kΩ, C = 1,000 µF → τ = 2.0 s, V_C(τ) = 6.32 V (63.2%)',
    voltage: 10,
    resistanceKOhm: 2.0,
    capacitanceUf: 1000,
    mode: 'charging',
  },
  {
    id: 'standard-2s-discharging',
    label: 'Standard τ = 2.0 s Exponential Discharge',
    sub: 'V₀ = 10 V, R = 2.0 kΩ, C = 1,000 µF → τ = 2.0 s, V_C(τ) = 3.68 V (36.8%)',
    voltage: 10,
    resistanceKOhm: 2.0,
    capacitanceUf: 1000,
    mode: 'discharging',
  },
  {
    id: 'fast-timing-0.5s',
    label: 'Fast Timing Network (τ = 0.50 s)',
    sub: 'V₀ = 12 V, R = 1.0 kΩ, C = 500 µF → τ = 0.50 s, I₀ = 12 mA',
    voltage: 12,
    resistanceKOhm: 1.0,
    capacitanceUf: 500,
    mode: 'charging',
  },
  {
    id: 'slow-delay-10s',
    label: 'Long-Delay Hold-Up Capacitor (τ = 10.0 s)',
    sub: 'V₀ = 20 V, R = 5.0 kΩ, C = 2,000 µF → τ = 10.0 s, U_max = 0.40 J',
    voltage: 20,
    resistanceKOhm: 5.0,
    capacitanceUf: 2000,
    mode: 'charging',
  },
] as const;

export default function RCCircuitsLab() {
  const [voltage, setVoltage] = useState(10);
  const [resistanceKOhm, setResistanceKOhm] = useState(2.0);
  const [capacitanceUf, setCapacitanceUf] = useState(1000);
  const [mode, setMode] = useState<RCCircuitMode>('charging');
  const [timeScale, setTimeScale] = useState<'0.25' | '0.5' | '1' | '2'>('1');
  const [running, setRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [plotTab, setPlotTab] = useState<PlotTab>('voltages');
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

  const resistanceOhms = resistanceKOhm * 1000;
  const capacitanceFarads = capacitanceUf * 1e-6;

  const params: RCCircuitParams = useMemo(
    () => ({
      voltage,
      resistance: resistanceOhms,
      capacitance: capacitanceFarads,
      mode,
    }),
    [voltage, resistanceOhms, capacitanceFarads, mode],
  );

  const tau = useMemo(
    () => rcTimeConstant(resistanceOhms, capacitanceFarads),
    [resistanceOhms, capacitanceFarads],
  );
  const windowDuration = Number((5 * tau).toFixed(3));

  const currentState = useMemo(
    () => evaluateRCStateAt(params, Math.min(simTime, windowDuration)),
    [params, simTime, windowDuration],
  );

  const trajectory = useMemo(
    () => simulateRCTrajectory(params, { duration: windowDuration, sampleCount: 201 }),
    [params, windowDuration],
  );

  const simTimeRef = useRef(simTime);
  simTimeRef.current = simTime;

  useEffect(() => {
    if (!running) return;
    if (simTimeRef.current >= windowDuration) {
      setSimTime(0);
      simTimeRef.current = 0;
    }
    // Scale playback so 1× completes the 5τ window in ~8 wall-clock seconds
    const playbackRate = (windowDuration / 8) * Number(timeScale);
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
  }, [running, windowDuration, timeScale]);

  const graphData = useMemo(() => {
    return trajectory.map((s) => ({
      t: Number(s.t.toFixed(3)),
      vc: Number(s.capacitorVoltage.toFixed(4)),
      vr: Number(s.resistorVoltage.toFixed(4)),
      vtauTarget: Number(
        (mode === 'charging' ? voltage * (1 - Math.exp(-1)) : voltage * Math.exp(-1)).toFixed(4),
      ),
      currentMa: Number((s.current * 1000).toFixed(4)),
      chargeMc: Number((s.charge * 1000).toFixed(4)),
      energyMj: Number((s.storedEnergy * 1000).toFixed(4)),
    }));
  }, [trajectory, mode, voltage]);

  const applyPreset = (preset: RCPreset) => {
    setRunning(false);
    setSimTime(0);
    setVoltage(preset.voltage);
    setResistanceKOhm(preset.resistanceKOhm);
    setCapacitanceUf(preset.capacitanceUf);
    setMode(preset.mode);
  };

  const stepForward = () => {
    setRunning(false);
    const stepDt = Number((windowDuration / 50).toFixed(3));
    setSimTime((t) =>
      t >= windowDuration ? stepDt : Math.min(windowDuration, Number((t + stepDt).toFixed(3))),
    );
  };

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'rc-circuits',
      title: `RC Circuit (${mode}) — τ = ${formatNumber(tau, 4)} s, V_C(t) = ${formatNumber(currentState.capacitorVoltage, 4)} V`,
      body: `Analytical RC ${mode} transient with V₀ = ${voltage} V, R = ${resistanceKOhm} kΩ, C = ${capacitanceUf} µF (τ = RC = ${formatNumber(tau, 4)} s) sampled at t = ${formatNumber(currentState.t, 4)} s (${formatNumber(currentState.tauMultiple, 3)} τ).`,
      measurements: [
        { label: 'Time constant τ = RC', value: `${formatNumber(tau, 4)} s` },
        { label: 'Sample time t', value: `${formatNumber(currentState.t, 4)} s (${formatNumber(currentState.tauMultiple, 3)} τ)` },
        { label: 'Capacitor voltage V_C(t)', value: `${formatNumber(currentState.capacitorVoltage, 4)} V` },
        { label: 'Resistor voltage V_R(t)', value: `${formatNumber(currentState.resistorVoltage, 4)} V` },
        { label: 'Circuit current I(t)', value: `${formatNumber(currentState.current * 1000, 4)} mA` },
        { label: 'Stored charge q(t)', value: formatQuantity(currentState.charge, 'C', 4) },
        { label: 'Charge state', value: `${formatNumber(currentState.percentCharged, 3)}% charged (${formatNumber(currentState.percentDischarged, 3)}% discharged)` },
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

  const chargeFraction = Math.min(1, Math.max(0, currentState.percentCharged / 100));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left Column: Interactive RC Transient Schematic, Transport & Live Telemetry */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="RC Transient Charging & Discharging Apparatus"
            description="SPDT switch selects Charging (V₀ → R → C) or Discharging (C → R). Driven by exact analytical exponentials."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">τ = RC = {formatNumber(tau, 4)} s</Badge>
                <Badge tone={mode === 'charging' ? 'success' : 'warning'}>
                  {mode === 'charging'
                    ? `${formatNumber(currentState.percentCharged, 3)}% Charged`
                    : `${formatNumber(currentState.percentDischarged, 3)}% Discharged (${formatNumber(currentState.percentCharged, 3)}% left)`}
                </Badge>
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

          {/* Interactive SVG RC Circuit Diagram */}
          <div className="bg-slate-950 px-4 py-5">
            <svg
              viewBox="0 0 720 310"
              className="mx-auto block w-full max-w-[720px]"
              role="img"
              aria-label="Interactive RC charging and discharging circuit diagram with SPDT switch, resistor and capacitor"
            >
              {/* Main RC Loop Wires */}
              <g stroke="#38bdf8" strokeWidth="3" fill="none">
                {/* Battery top to Switch terminal A */}
                <path
                  d="M 110 115 L 110 55 L 210 55"
                  stroke={mode === 'charging' ? '#38bdf8' : '#475569'}
                />
                {/* Discharge bypass wire from Switch terminal B down to bottom return */}
                <path
                  d="M 210 115 L 210 260"
                  stroke={mode === 'discharging' ? '#fbbf24' : '#475569'}
                  strokeDasharray={mode === 'discharging' ? undefined : '4 4'}
                />
                {/* Common switch pole (275, 55) through Resistor to Capacitor top */}
                <path d="M 275 55 L 560 55 L 560 125" />
                {/* Capacitor bottom to return rail */}
                <path d="M 560 185 L 560 260 L 110 260 L 110 195" />
              </g>

              {/* DC Supply Battery at (110, 155) */}
              <g transform="translate(110, 155)" opacity={mode === 'charging' ? 1 : 0.45}>
                <rect
                  x="-38"
                  y="-40"
                  width="76"
                  height="80"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <line x1="-18" y1="-12" x2="18" y2="-12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#94a3b8" strokeWidth="5" />
                <line x1="-18" y1="12" x2="18" y2="12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="24" x2="10" y2="24" stroke="#94a3b8" strokeWidth="5" />
                <text x="0" y="56" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
                  V₀ = {formatNumber(voltage, 3)} V
                </text>
              </g>

              {/* SPDT Charge/Discharge Switch at (245, 55) */}
              <g
                onClick={() => {
                  setRunning(false);
                  setSimTime(0);
                  setMode((m) => (m === 'charging' ? 'discharging' : 'charging'));
                }}
                className="cursor-pointer"
              >
                <circle cx="210" cy="55" r="5" fill="#34d399" />
                <text x="195" y="42" textAnchor="end" fill="#34d399" fontSize="10.5" fontWeight="600">
                  Charge (A)
                </text>
                <circle cx="210" cy="115" r="5" fill="#fbbf24" />
                <text x="198" y="120" textAnchor="end" fill="#fbbf24" fontSize="10.5" fontWeight="600">
                  Discharge (B)
                </text>
                <circle cx="275" cy="55" r="5" fill="#e2e8f0" />
                <line
                  x1="275"
                  y1="55"
                  x2="210"
                  y2={mode === 'charging' ? 55 : 115}
                  stroke={mode === 'charging' ? '#34d399' : '#fbbf24'}
                  strokeWidth="3.5"
                />
              </g>

              {/* Series Resistor R at (415, 55) */}
              <g transform="translate(415, 55)">
                <rect
                  x="-52"
                  y="-24"
                  width="104"
                  height="48"
                  rx="7"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontWeight="700">
                  R = {formatNumber(resistanceKOhm, 3)} kΩ
                </text>
                <text x="0" y="13" textAnchor="middle" fill="#22d3ee" fontSize="10.5" fontFamily="monospace">
                  V_R = {formatNumber(currentState.resistorVoltage, 3)} V
                </text>
                <text x="0" y="42" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="600" fontFamily="monospace">
                  I(t) = {formatNumber(currentState.current * 1000, 3)} mA
                </text>
              </g>

              {/* Capacitor C at (560, 155) with animated charge fill bar */}
              <g transform="translate(560, 155)">
                {/* Dielectric electric field glow proportional to V_C / V_0 */}
                <rect
                  x="-44"
                  y="-16"
                  width="88"
                  height="32"
                  rx="4"
                  fill={`rgba(56, 189, 248, ${(chargeFraction * 0.48).toFixed(3)})`}
                />
                {/* Top plate */}
                <line x1="-46" y1="-16" x2="46" y2="-16" stroke="#38bdf8" strokeWidth="5" />
                {/* Bottom plate */}
                <line x1="-46" y1="16" x2="46" y2="16" stroke="#94a3b8" strokeWidth="5" />

                <text x="58" y="-12" fill="#38bdf8" fontSize="11.5" fontWeight="700">
                  +q = {formatQuantity(currentState.charge, 'C', 3)}
                </text>
                <text x="58" y="6" fill="#f8fafc" fontSize="12" fontWeight="700" fontFamily="monospace">
                  V_C = {formatNumber(currentState.capacitorVoltage, 3)} V
                </text>
                <text x="58" y="22" fill="#34d399" fontSize="10.5" fontWeight="600">
                  {formatNumber(currentState.percentCharged, 3)}% of V₀
                </text>
                <text x="0" y="52" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">
                  C = {formatNumber(capacitanceUf, 4)} µF
                </text>
              </g>
            </svg>
          </div>

          {/* Transport, Time-Constant Jump Buttons & Time Scrubber */}
          <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
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
                disabled={running}
                onClick={stepForward}
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
                Reset (t = 0)
              </Button>

              {/* Quick τ Milestone Jump Buttons */}
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 5].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => {
                      setRunning(false);
                      setSimTime(Number((mult * tau).toFixed(3)));
                    }}
                    className="rounded border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-fg-soft hover:border-accent hover:text-fg"
                  >
                    t = {mult}τ ({formatNumber(mult * tau, 3)} s)
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label={`Time scrubber t (${formatNumber(currentState.tauMultiple, 2)} τ)`}
              value={Number(simTime.toFixed(3))}
              min={0}
              max={windowDuration}
              step={Math.max(0.01, Number((windowDuration / 200).toFixed(3)))}
              unit="s"
              onChange={(t) => {
                setRunning(false);
                setSimTime(t);
              }}
            />
          </div>

          {/* Live RC Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Time constant τ = RC</p>
              <p className="font-mono text-xs font-semibold text-accent">
                {formatNumber(tau, 4)} s
              </p>
              <p className="text-[10.5px] text-muted">5τ ≈ {formatNumber(5 * tau, 3)} s</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Capacitor voltage V_C(t)</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(currentState.capacitorVoltage, 4)} V
              </p>
              <p className="text-[10.5px] text-muted">
                {formatNumber(currentState.percentCharged, 3)}% charged
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Resistor voltage V_R(t)</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(currentState.resistorVoltage, 4)} V
              </p>
              <p className="text-[10.5px] text-muted">
                I(t) = {formatNumber(currentState.current * 1000, 4)} mA
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Stored charge & energy</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatQuantity(currentState.charge, 'C', 4)}
              </p>
              <p className="text-[10.5px] text-muted">
                U_C = {formatQuantity(currentState.storedEnergy, 'J', 3)}
              </p>
            </div>
          </div>
        </Panel>

        {/* Right Column: Controls & Presets */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="RC Circuit Parameters"
              description="Switch between Charging and Discharging and tune V₀, R, and C."
            />
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-fg-soft">Circuit Mode</p>
                <SegmentedControl
                  label="RC circuit mode"
                  size="sm"
                  value={mode}
                  options={RC_MODES}
                  onChange={(nextMode) => {
                    setRunning(false);
                    setSimTime(0);
                    setMode(nextMode);
                  }}
                />
              </div>

              <Slider
                label="Supply / Initial voltage V₀"
                value={voltage}
                min={1}
                max={24}
                step={0.5}
                unit="V"
                onChange={(v) => {
                  setRunning(false);
                  setSimTime(0);
                  setVoltage(v);
                }}
              />

              <Slider
                label="Series resistance R"
                value={resistanceKOhm}
                min={0.5}
                max={10}
                step={0.25}
                unit="kΩ"
                onChange={(r) => {
                  setRunning(false);
                  setSimTime(0);
                  setResistanceKOhm(r);
                }}
              />

              <Slider
                label="Capacitance C"
                value={capacitanceUf}
                min={100}
                max={3000}
                step={100}
                unit="µF"
                onChange={(c) => {
                  setRunning(false);
                  setSimTime(0);
                  setCapacitanceUf(c);
                }}
              />

              <Button
                variant={savedNotice ? 'secondary' : 'primary'}
                className="w-full justify-center"
                onClick={logToNotebook}
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
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="RC Transient Presets"
              description="Explore fast and slow time constants in charging and discharging modes."
            />
            <div className="mt-3 grid gap-2">
              {RC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="group flex flex-col items-start rounded-lg border border-line bg-surface-2/40 px-3.5 py-2.5 text-left transition-colors hover:border-accent/50 hover:bg-surface-2"
                >
                  <span className="text-xs font-semibold text-fg group-hover:text-accent">
                    {preset.label}
                  </span>
                  <span className="mt-0.5 text-[11px] text-muted">{preset.sub}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Synchronized RC Transient Graphs */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Synchronized RC Transient Curves (0 to 5τ)
            </h3>
            <p className="text-xs text-muted">
              At t = τ = {formatNumber(tau, 3)} s, charging reaches 1 − e⁻¹ ≈ 63.2% of V₀, while
              discharging decays to e⁻¹ ≈ 36.8% of V₀.
            </p>
          </div>
          <SegmentedControl
            label="RC graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'voltages' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Voltage (V)"
              zeroLine
              series={[
                { key: 'vc', label: 'Capacitor voltage V_C(t) (V)', color: '#38bdf8' },
                { key: 'vr', label: 'Resistor voltage V_R(t) (V)', color: '#fbbf24' },
                {
                  key: 'vtauTarget',
                  label: mode === 'charging' ? '63.2% V₀ level at t = τ (V)' : '36.8% V₀ level at t = τ (V)',
                  color: '#34d399',
                  dashed: true,
                },
              ]}
            />
          )}

          {plotTab === 'current' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Circuit Current I (mA)"
              zeroLine
              series={[
                { key: 'currentMa', label: 'Transient current I(t) (mA)', color: '#22d3ee' },
              ]}
            />
          )}

          {plotTab === 'charge' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Capacitor Charge q (mC)"
              series={[
                { key: 'chargeMc', label: 'Stored charge q(t) = C·V_C(t) (mC)', color: '#a78bfa' },
              ]}
            />
          )}

          {plotTab === 'energy' && (
            <PlotChart
              data={graphData}
              xKey="t"
              xLabel="Time t (s)"
              yLabel="Stored Energy U_C (mJ)"
              series={[
                { key: 'energyMj', label: 'Capacitor energy U_C(t) = ½CV_C² (mJ)', color: '#34d399' },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory & Time Constant Milestones */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Analytical RC Charging & Discharging Equations
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="\tau = RC,\qquad V_{C,\text{charge}}(t) = V_0\!\left(1 - e^{-t/RC}\right),\qquad V_{C,\text{discharge}}(t) = V_0\,e^{-t/RC}"
              />
            </div>
            <p className="text-muted">
              By Kirchhoff’s loop rule during charging (<MathFormula latex="V_0 - I R - q/C = 0" />),
              the rate of charge accumulation <MathFormula latex="I = dq/dt" /> decreases
              exponentially as the capacitor voltage opposes the supply. During discharging
              (<MathFormula latex="q/C + I R = 0" />), current flows in the opposite direction
              (<MathFormula latex="I(t) = -(V_0/R)e^{-t/RC}" />).
            </p>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Physical Meaning of the Time Constant τ = RC (63.2% & 36.8%)
            </h3>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              At <MathFormula latex="t = \tau = R C" />, the exponential factor equals{' '}
              <MathFormula latex="e^{-1} \approx 0.3679" />:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <strong>Charging at <MathFormula latex="t = 1\tau" /></strong>: The capacitor reaches{' '}
                <MathFormula latex="1 - e^{-1} \approx 63.2\%" /> of its final voltage{' '}
                <MathFormula latex="V_0" /> and charge <MathFormula latex="Q_{\max} = C V_0" />.
              </li>
              <li>
                <strong>Discharging at <MathFormula latex="t = 1\tau" /></strong>: The capacitor
                retains <MathFormula latex="e^{-1} \approx 36.8\%" /> of its initial voltage and
                charge (meaning <MathFormula latex="63.2\%" /> has been discharged).
              </li>
              <li>
                <strong>Practical steady state (<MathFormula latex="t = 5\tau" />)</strong>: Since{' '}
                <MathFormula latex="e^{-5} \approx 0.0067" />, an RC circuit is over{' '}
                <MathFormula latex="99.3\%" /> charged or discharged after five time constants.
              </li>
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}
