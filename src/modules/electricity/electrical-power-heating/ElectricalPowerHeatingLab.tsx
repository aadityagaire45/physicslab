import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Flame,
  Info,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  StepForward,
} from 'lucide-react';
import {
  evaluatePowerHeatingState,
  type PowerHeatingParams,
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

const TIME_SCALES = [
  { value: '1', label: '1×' },
  { value: '5', label: '5×' },
  { value: '15', label: '15×' },
  { value: '30', label: '30×' },
] as const;

const PLOT_TABS = [
  { value: 'energy-time', label: 'E(t) Energy vs Time' },
  { value: 'power-time', label: 'P(t) & I(t) vs Time' },
  { value: 'joule-comparison', label: 'P(R): Constant V vs Constant I' },
  { value: 'thermal-time', label: 'T(t) Illustrative Heating' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface PowerPreset {
  id: string;
  label: string;
  sub: string;
  voltage: number;
  resistance: number;
  duration: number;
}

const POWER_PRESETS: readonly PowerPreset[] = [
  {
    id: 'bench-heater-12v',
    label: '12 V Lab Calorimeter Heating Coil',
    sub: 'V = 12 V, R = 6 Ω → I = 2.0 A, P = 24 W, H(120 s) = 2.88 kJ',
    voltage: 12,
    resistance: 6,
    duration: 120,
  },
  {
    id: 'low-power-signal',
    label: '5 V Low-Power Electronics Resistor',
    sub: 'V = 5 V, R = 50 Ω → I = 0.10 A, P = 0.50 W (Minimal heating)',
    voltage: 5,
    resistance: 50,
    duration: 120,
  },
  {
    id: 'automotive-defroster',
    label: '14 V Automotive Window Defroster Grid',
    sub: 'V = 14 V, R = 2.0 Ω → I = 7.0 A, P = 98 W, H(180 s) = 17.64 kJ',
    voltage: 14,
    resistance: 2,
    duration: 180,
  },
  {
    id: 'high-power-24v',
    label: '24 V Industrial Cartridge Heater',
    sub: 'V = 24 V, R = 4.0 Ω → I = 6.0 A, P = 144 W, H(300 s) = 43.2 kJ (0.012 kWh)',
    voltage: 24,
    resistance: 4,
    duration: 300,
  },
] as const;

export default function ElectricalPowerHeatingLab() {
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(6);
  const [windowDuration, setWindowDuration] = useState(120);
  const [simTime, setSimTime] = useState(60);
  const [running, setRunning] = useState(false);
  const [timeScale, setTimeScale] = useState<'1' | '5' | '15' | '30'>('5');
  const [plotTab, setPlotTab] = useState<PlotTab>('energy-time');
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

  const params: PowerHeatingParams = useMemo(
    () => ({
      voltage,
      resistance,
      ambientTempC: 22,
      thermalCapacityJK: 45,
      heatLossCoefficientWK: 1.5,
    }),
    [voltage, resistance],
  );

  const currentState = useMemo(
    () => evaluatePowerHeatingState(params, simTime),
    [params, simTime],
  );

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

  const timeSeriesData = useMemo(() => {
    const pts = [];
    const steps = 60;
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * windowDuration;
      const st = evaluatePowerHeatingState(params, t);
      pts.push({
        t: Number(t.toFixed(1)),
        energyKJ: Number(st.energyKilojoules.toFixed(4)),
        powerW: Number(st.powerWatts.toFixed(3)),
        currentA: Number(st.current.toFixed(3)),
        tempC: Number(st.illustrativeTempC.toFixed(2)),
        steadyTempC: Number(st.illustrativeSteadyStateTempC.toFixed(2)),
      });
    }
    return pts;
  }, [params, windowDuration]);

  const resistanceSweepData = useMemo(() => {
    const refCurrent = currentState.current;
    const pts = [];
    for (let r = 2; r <= 40; r += 2) {
      pts.push({
        r,
        constantVoltagePowerW: Number(((voltage * voltage) / r).toFixed(3)),
        constantCurrentPowerW: Number((refCurrent * refCurrent * r).toFixed(3)),
      });
    }
    return pts;
  }, [voltage, currentState.current]);

  const applyPreset = (preset: PowerPreset) => {
    setRunning(false);
    setVoltage(preset.voltage);
    setResistance(preset.resistance);
    setWindowDuration(preset.duration);
    setSimTime(preset.duration * 0.5);
  };

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'electrical-power-heating',
      title: `Joule Heating — P = ${formatNumber(currentState.powerWatts, 4)} W, H(${formatNumber(simTime, 3)} s) = ${formatQuantity(currentState.energyJoules, 'J', 4)}`,
      body: `Operated R = ${resistance} Ω resistor at V = ${voltage} V for t = ${formatNumber(simTime, 3)} s. Current I = ${formatNumber(currentState.current, 4)} A.`,
      measurements: [
        { label: 'Electrical power P = VI', value: `${formatNumber(currentState.powerWatts, 4)} W` },
        { label: 'Current I = V/R', value: `${formatNumber(currentState.current, 4)} A` },
        { label: 'Operating time t', value: `${formatNumber(simTime, 4)} s` },
        { label: 'Joule heat H = I²Rt (J)', value: `${formatQuantity(currentState.energyJoules, 'J', 4)}` },
        { label: 'Energy consumed (kWh)', value: `${formatNumber(currentState.energyKWh, 4)} kWh` },
        {
          label: 'Illustrative lumped temp T(t)',
          value: `${formatNumber(currentState.illustrativeTempC, 3)} °C (Lumped Newton-cooling model)`,
        },
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

  const glowIntensity = Math.min(1, currentState.powerWatts / 120);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        {/* Left Column: Joule Heating Apparatus, Playback & Live Wattmeter/Joulemeter */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Electrical Power & Joule Heating Apparatus"
            description="Measure instantaneous rate of energy transfer P = VI (W) and cumulative dissipated thermal energy H = I²Rt (J and kWh)."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">P = {formatNumber(currentState.powerWatts, 4)} W</Badge>
                <Badge tone="warning">
                  H(t) = {formatQuantity(currentState.energyJoules, 'J', 4)}
                </Badge>
                <SegmentedControl
                  label="Timer speed"
                  size="sm"
                  value={timeScale}
                  options={TIME_SCALES}
                  onChange={setTimeScale}
                />
              </div>
            }
          />

          {/* SVG Joule Heating Circuit & Lumped Thermal Element */}
          <div className="bg-slate-950 px-4 py-5">
            <svg
              viewBox="0 0 720 300"
              className="mx-auto block w-full max-w-[720px]"
              role="img"
              aria-label="Interactive electrical power and Joule heating circuit with wattmeter, heating coil and thermometer"
            >
              <defs>
                <radialGradient id="heaterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2 + glowIntensity * 0.65} />
                  <stop offset="60%" stopColor="#f97316" stopOpacity={glowIntensity * 0.35} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Connecting circuit wires */}
              <g stroke="#38bdf8" strokeWidth="3" fill="none">
                <path d="M 110 110 L 110 55 L 470 55 L 470 95" />
                <path d="M 470 215 L 470 255 L 110 255 L 110 195" />
              </g>

              {/* DC Supply at (110, 152) */}
              <g transform="translate(110, 152)">
                <rect
                  x="-42"
                  y="-42"
                  width="84"
                  height="84"
                  rx="10"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <line x1="-20" y1="-12" x2="20" y2="-12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#94a3b8" strokeWidth="5" />
                <line x1="-20" y1="12" x2="20" y2="12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="24" x2="10" y2="24" stroke="#94a3b8" strokeWidth="5" />
                <text x="0" y="58" textAnchor="middle" fill="#e2e8f0" fontSize="11.5" fontWeight="600">
                  V = {formatNumber(voltage, 3)} V
                </text>
              </g>

              {/* Digital Wattmeter & Energy Counter at (285, 55) */}
              <g transform="translate(285, 55)">
                <rect
                  x="-78"
                  y="-32"
                  width="156"
                  height="64"
                  rx="8"
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth="2"
                />
                <text x="0" y="-10" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="700">
                  WATTMETER · I = {formatNumber(currentState.current, 3)} A
                </text>
                <text x="0" y="9" textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace" fontWeight="700">
                  P = {formatNumber(currentState.powerWatts, 4)} W
                </text>
                <text x="0" y="24" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  H = {formatQuantity(currentState.energyJoules, 'J', 3)}
                </text>
              </g>

              {/* Resistive Heating Element & Calorimeter Chamber at (470, 155) */}
              <g transform="translate(470, 155)">
                <circle cx="0" cy="0" r="78" fill="url(#heaterGlow)" />
                <rect
                  x="-58"
                  y="-60"
                  width="116"
                  height="120"
                  rx="12"
                  fill="rgba(15, 23, 42, 0.85)"
                  stroke="#f97316"
                  strokeWidth="2"
                />
                {/* Helical nichrome heating coil */}
                <path
                  d="M 0 -60 L 0 -42 L -22 -32 L 22 -20 L -22 -8 L 22 4 L -22 16 L 22 28 L 0 38 L 0 60"
                  stroke={currentState.powerWatts > 5 ? '#fb923c' : '#94a3b8'}
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinejoin="round"
                />
                <text x="0" y="80" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontWeight="600">
                  Heater Coil R = {formatNumber(resistance, 3)} Ω
                </text>
              </g>

              {/* Illustrative Thermometer Gauge at (615, 155) */}
              <g transform="translate(615, 155)">
                <rect
                  x="-8"
                  y="-65"
                  width="16"
                  height="110"
                  rx="8"
                  fill="#0f172a"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                {(() => {
                  const frac = Math.min(1, Math.max(0.06, (currentState.illustrativeTempC - 20) / 140));
                  const colH = frac * 96;
                  return (
                    <rect
                      x="-4"
                      y={40 - colH}
                      width="8"
                      height={colH}
                      rx="4"
                      fill="#ef4444"
                    />
                  );
                })()}
                <circle cx="0" cy="46" r="13" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
                <text x="20" y="-20" fill="#fca5a5" fontSize="11" fontWeight="700" fontFamily="monospace">
                  {formatNumber(currentState.illustrativeTempC, 3)} °C
                </text>
                <text x="20" y="-4" fill="#94a3b8" fontSize="9.5">
                  Illustrative
                </text>
                <text x="20" y="9" fill="#94a3b8" fontSize="9.5">
                  Lumped Model
                </text>
              </g>
            </svg>
          </div>

          {/* Playback & Operating Duration Scrubber */}
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
                disabled={running}
                onClick={() =>
                  setSimTime((t) => Math.min(windowDuration, Number((t + 5).toFixed(1))))
                }
              >
                <StepForward className="size-3.5" />
                Step (+5 s)
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
                Reset Timer
              </Button>
              <span className="ml-auto font-mono text-xs text-muted">
                Operating elapsed time t = {formatNumber(simTime, 3)} s / {windowDuration} s
              </span>
            </div>

            <Slider
              label="Operating time scrubber t"
              value={Number(simTime.toFixed(1))}
              min={0}
              max={windowDuration}
              step={1}
              unit="s"
              onChange={(t) => {
                setRunning(false);
                setSimTime(t);
              }}
            />
          </div>

          {/* Live Power & Energy Readout Cards */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Current I = V/R</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(currentState.current, 4)} A
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Power P = VI = I²R</p>
              <p className="font-mono text-xs font-semibold text-accent">
                {formatNumber(currentState.powerWatts, 4)} W
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Joule Heat H = I²Rt</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatQuantity(currentState.energyJoules, 'J', 4)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Energy in kWh</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(currentState.energyKWh, 4)} kWh
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Charge Q = I·t</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(currentState.chargeCoulombs, 4)} C
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Illustrative T(t)</p>
              <p className="font-mono text-xs font-semibold text-amber-400">
                {formatNumber(currentState.illustrativeTempC, 3)} °C
              </p>
            </div>
          </div>
        </Panel>

        {/* Right Column: Controls & Presets */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Power & Heating Controls"
              description="Adjust supply voltage V, load resistance R, and total operating duration."
            />
            <div className="mt-4 space-y-4">
              <Slider
                label="Supply voltage V"
                value={voltage}
                min={1}
                max={48}
                step={0.5}
                unit="V"
                onChange={setVoltage}
              />
              <Slider
                label="Heater resistance R"
                value={resistance}
                min={1}
                max={100}
                step={0.5}
                unit="Ω"
                onChange={setResistance}
              />
              <Slider
                label="Operating window duration"
                value={windowDuration}
                min={30}
                max={600}
                step={30}
                unit="s"
                onChange={(d) => {
                  setRunning(false);
                  setWindowDuration(d);
                  setSimTime((prev) => Math.min(prev, d));
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
              title="Load & Heater Presets"
              description="Compare low-power electronics against high-wattage heating loads."
            />
            <div className="mt-3 grid gap-2">
              {POWER_PRESETS.map((preset) => (
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

      {/* Synchronized Power, Energy & Joule Comparison Graphs */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Power, Cumulative Energy & Joule Heating Curves
            </h3>
            <p className="text-xs text-muted">
              At constant DC power P, cumulative energy E(t) = P·t grows linearly with time while P(t)
              remains constant.
            </p>
          </div>
          <SegmentedControl
            label="Power & heating graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'energy-time' && (
            <PlotChart
              data={timeSeriesData}
              xKey="t"
              xLabel="Operating Time t (s)"
              yLabel="Cumulative Energy H (kJ)"
              series={[
                { key: 'energyKJ', label: 'Cumulative Joule heat H(t) = I²Rt (kJ)', color: '#fbbf24' },
              ]}
            />
          )}

          {plotTab === 'power-time' && (
            <PlotChart
              data={timeSeriesData}
              xKey="t"
              xLabel="Operating Time t (s)"
              yLabel="Power P (W) / Current I (A)"
              series={[
                { key: 'powerW', label: 'Electrical power P = VI (W)', color: '#38bdf8' },
                { key: 'currentA', label: 'Current I = V/R (A)', color: '#34d399', dashed: true },
              ]}
            />
          )}

          {plotTab === 'joule-comparison' && (
            <PlotChart
              data={resistanceSweepData}
              xKey="r"
              xLabel="Load Resistance R (Ω)"
              yLabel="Dissipated Power P (W)"
              series={[
                {
                  key: 'constantVoltagePowerW',
                  label: `Constant Voltage P = V²/R (V = ${voltage} V) (W)`,
                  color: '#38bdf8',
                },
                {
                  key: 'constantCurrentPowerW',
                  label: `Constant Current P = I²R (I = ${formatNumber(currentState.current, 3)} A) (W)`,
                  color: '#f97316',
                  dashed: true,
                },
              ]}
            />
          )}

          {plotTab === 'thermal-time' && (
            <PlotChart
              data={timeSeriesData}
              xKey="t"
              xLabel="Operating Time t (s)"
              yLabel="Illustrative Temperature T (°C)"
              series={[
                {
                  key: 'tempC',
                  label: 'Illustrative lumped element temperature T(t) (°C)',
                  color: '#ef4444',
                },
                {
                  key: 'steadyTempC',
                  label: 'Steady-state thermal equilibrium T_max (°C)',
                  color: '#94a3b8',
                  dashed: true,
                },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory & Thermal Model Disclosure */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Distinction Between Electrical Power (W) and Energy (J or kWh)
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="P = V I = I^2 R = \frac{V^2}{R},\qquad E = H = P t = I^2 R t,\qquad 1\text{ kWh} = 3.6 \times 10^6\text{ J}"
              />
            </div>
            <p className="text-muted">
              <strong>Electrical power (<MathFormula latex="P" />)</strong> is the instantaneous{' '}
              <em>rate</em> at which electrical energy is converted into thermal energy in the
              resistor, measured in watts (<MathFormula latex="1\text{ W} = 1\text{ J/s}" />).{' '}
              <strong>Electrical energy (<MathFormula latex="E" /> or Joule heat <MathFormula latex="H" />)</strong>{' '}
              is the total accumulated work or heat transferred over time <MathFormula latex="t" />,
              measured in joules (<MathFormula latex="\text{J}" />) or kilowatt-hours (<MathFormula latex="\text{kWh}" />).
            </p>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Illustrative Lumped-Parameter Thermal Model Disclosure
            </h3>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              While electrical power <MathFormula latex="P = V I" /> and Joule heat{' '}
              <MathFormula latex="H = I^2 R t" /> depend solely on circuit parameters, actual
              resistor temperature depends on geometry, mass, specific heat capacity, and convective
              environment.
            </p>
            <p>
              The thermometer readout uses an <strong>illustrative lumped Newton-cooling model</strong>{' '}
              (<MathFormula latex="C_{\text{th}} dT/dt = P - h_{\text{loss}}(T - T_{\text{amb}})" /> with
              illustrative <MathFormula latex="C_{\text{th}} = 45\text{ J/K}" />,{' '}
              <MathFormula latex="h_{\text{loss}} = 1.5\text{ W/K}" />, and{' '}
              <MathFormula latex="T_{\text{amb}} = 22\,^\circ\text{C}" />) to visualize how a heated
              resistor approaches thermal equilibrium when heat loss matches Joule heating power.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
