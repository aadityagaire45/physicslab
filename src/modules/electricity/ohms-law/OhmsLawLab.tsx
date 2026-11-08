import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, NotebookPen, Power, RotateCcw, Zap } from 'lucide-react';
import {
  decodeResistorColorBands,
  evaluateOhmsLawState,
  type ConductorMode,
} from '@/engine/physics/electricity';
import { formatNumber, formatQuantity } from '@/engine/units/format';
import { useNotebookStore } from '@/store/notebookStore';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { Toggle } from '@/components/controls/Toggle';
import { PlotChart } from '@/components/graphs/PlotChart';

const CONDUCTOR_MODES = [
  { value: 'ohmic', label: 'Ideal Ohmic Resistor' },
  { value: 'filament-lamp', label: 'Tungsten Filament (Non-Ohmic)' },
  { value: 'semiconductor-diode', label: 'Silicon Diode + R (Non-Ohmic)' },
] as const;

const PLOT_TABS = [
  { value: 'iv', label: 'I–V Characteristic' },
  { value: 'ir', label: 'I–R Relationship' },
  { value: 'pv', label: 'P–V Power Curve' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface OhmsLawPreset {
  id: string;
  label: string;
  sub: string;
  voltage: number;
  resistance: number;
  conductorMode: ConductorMode;
}

const OHMS_LAW_PRESETS: readonly OhmsLawPreset[] = [
  {
    id: 'standard-100',
    label: 'Standard 100 Ω Precision Resistor',
    sub: 'V = 5.0 V, R = 100 Ω → I = 50 mA, P = 0.25 W (Ohmic)',
    voltage: 5.0,
    resistance: 100,
    conductorMode: 'ohmic',
  },
  {
    id: 'led-ballast-220',
    label: '9 V Supply with 220 Ω Load',
    sub: 'V = 9.0 V, R = 220 Ω → I = 40.9 mA, P = 0.368 W (Ohmic)',
    voltage: 9.0,
    resistance: 220,
    conductorMode: 'ohmic',
  },
  {
    id: 'automotive-12v',
    label: '12 V High-Current 24 Ω Load',
    sub: 'V = 12.0 V, R = 24 Ω → I = 500 mA, P = 6.0 W (Ohmic)',
    voltage: 12.0,
    resistance: 24,
    conductorMode: 'ohmic',
  },
  {
    id: 'filament-bulb',
    label: '12 V Incandescent Filament Lamp',
    sub: 'V = 12.0 V, R₀ = 30 Ω (Cold) → Thermal resistance rise (Non-Ohmic)',
    voltage: 12.0,
    resistance: 30,
    conductorMode: 'filament-lamp',
  },
  {
    id: 'silicon-diode',
    label: 'Forward-Biased Silicon Diode (V_th ≈ 0.7 V)',
    sub: 'V = 3.5 V, R = 100 Ω → Non-linear threshold turn-on',
    voltage: 3.5,
    resistance: 100,
    conductorMode: 'semiconductor-diode',
  },
] as const;

export default function OhmsLawLab() {
  const [voltage, setVoltage] = useState(6.0);
  const [resistance, setResistance] = useState(120);
  const [conductorMode, setConductorMode] = useState<ConductorMode>('ohmic');
  const [switchClosed, setSwitchClosed] = useState(true);
  const [showElectronDrift, setShowElectronDrift] = useState(false);
  const [plotTab, setPlotTab] = useState<PlotTab>('iv');
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

  const rawState = useMemo(
    () => evaluateOhmsLawState({ voltage, resistance, conductorMode }),
    [voltage, resistance, conductorMode],
  );

  // When switch is open, circuit current and load voltage drop are zero.
  const activeVoltage = switchClosed ? rawState.voltage : 0;
  const activeCurrent = switchClosed ? rawState.current : 0;
  const activeCurrentMa = activeCurrent * 1000;
  const activePower = switchClosed ? rawState.power : 0;
  const measuredResistance =
    switchClosed && activeCurrent > 1e-9 ? activeVoltage / activeCurrent : rawState.effectiveResistance;

  const colorBands = useMemo(() => decodeResistorColorBands(resistance, 5), [resistance]);

  const ivData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 48; i += 1) {
      const v = (i / 48) * 24;
      const actual = evaluateOhmsLawState({ voltage: v, resistance, conductorMode });
      const ideal = evaluateOhmsLawState({ voltage: v, resistance, conductorMode: 'ohmic' });
      pts.push({
        v: Number(v.toFixed(2)),
        currentMa: Number((actual.current * 1000).toFixed(3)),
        ohmicReferenceMa: Number((ideal.current * 1000).toFixed(3)),
        powerW: Number(actual.power.toFixed(4)),
        ohmicPowerW: Number(ideal.power.toFixed(4)),
      });
    }
    return pts;
  }, [resistance, conductorMode]);

  const irData = useMemo(() => {
    const pts = [];
    for (let r = 20; r <= 1000; r += 20) {
      const st = evaluateOhmsLawState({ voltage: activeVoltage || voltage, resistance: r, conductorMode });
      pts.push({
        r,
        currentMa: Number((st.current * 1000).toFixed(3)),
      });
    }
    return pts;
  }, [activeVoltage, voltage, conductorMode]);

  const applyPreset = (preset: OhmsLawPreset) => {
    setVoltage(preset.voltage);
    setResistance(preset.resistance);
    setConductorMode(preset.conductorMode);
    setSwitchClosed(true);
  };

  const resetLab = () => {
    setVoltage(6.0);
    setResistance(120);
    setConductorMode('ohmic');
    setSwitchClosed(true);
    setShowElectronDrift(false);
  };

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'ohms-law',
      title: `Ohm’s Law — V = ${formatNumber(activeVoltage, 3)} V, R = ${formatNumber(resistance, 4)} Ω (${conductorMode})`,
      body: `Measured DC operating point with switch ${switchClosed ? 'closed' : 'open'} in ${conductorMode} mode. Applied voltage V = ${formatNumber(voltage, 3)} V across nominal resistance R₀ = ${formatNumber(resistance, 4)} Ω.`,
      measurements: [
        { label: 'Load voltage V', value: `${formatNumber(activeVoltage, 4)} V` },
        { label: 'Circuit current I', value: `${formatQuantity(activeCurrent, 'A', 4)} (${formatNumber(activeCurrentMa, 4)} mA)` },
        { label: 'Nominal resistance R₀', value: `${formatNumber(resistance, 4)} Ω` },
        {
          label: 'Static resistance V/I',
          value: Number.isFinite(measuredResistance)
            ? `${formatNumber(measuredResistance, 4)} Ω`
            : '∞ Ω (open/blocked)',
        },
        { label: 'Dissipated power P', value: formatQuantity(activePower, 'W', 4) },
        { label: 'Conductor type', value: conductorMode },
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        {/* Left Column: Interactive DC Circuit Apparatus & Digital Meters */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Interactive DC Ohm’s Law Circuit"
            description="Series ammeter (A) measures loop current; parallel voltmeter (V) measures load potential difference."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={switchClosed ? 'success' : 'warning'}>
                  {switchClosed ? 'Switch S₁ Closed (Conducting)' : 'Switch S₁ Open (I = 0 A)'}
                </Badge>
                <Badge tone={conductorMode === 'ohmic' ? 'accent' : 'warning'}>
                  {conductorMode === 'ohmic'
                    ? 'Linear Ohmic (R = const)'
                    : 'Illustrative Non-Ohmic Load'}
                </Badge>
              </div>
            }
          />

          {/* Interactive SVG Circuit Schematic */}
          <div className="relative bg-slate-950 px-4 py-6">
            <svg
              viewBox="0 0 720 330"
              className="mx-auto block w-full max-w-[720px]"
              role="img"
              aria-label="Interactive Ohm's law DC circuit diagram with battery, switch, ammeter, load resistor and voltmeter"
            >
              <defs>
                <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
                  <stop
                    offset="0%"
                    stopColor="#fde047"
                    stopOpacity={Math.min(0.85, activePower * 0.14)}
                  />
                  <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Subtle engineering grid */}
              <g stroke="rgba(148,163,184,0.08)" strokeWidth="1">
                {[60, 120, 180, 240, 300].map((y) => (
                  <line key={y} x1="0" y1={y} x2="720" y2={y} />
                ))}
                {[120, 240, 360, 480, 600].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="330" />
                ))}
              </g>

              {/* Main Loop Connecting Wires */}
              <g
                stroke={switchClosed && activeCurrent > 0 ? '#38bdf8' : '#475569'}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              >
                {/* Left battery up to top-left corner */}
                <path d="M 110 135 L 110 65 L 205 65" />
                {/* Switch S1 to Ammeter A */}
                <path d="M 265 65 L 365 65" />
                {/* Ammeter A to top-right corner and down to Load */}
                <path d="M 435 65 L 540 65 L 540 120" />
                {/* Load bottom to bottom-left and up to battery negative */}
                <path d="M 540 220 L 540 275 L 110 275 L 110 205" />
              </g>

              {/* Parallel Voltmeter Branch Wires */}
              <g stroke="#a78bfa" strokeWidth="2" strokeDasharray="4 4" fill="none">
                <path d="M 540 95 L 650 95 L 650 140" />
                <path d="M 650 200 L 650 245 L 540 245" />
              </g>
              <circle cx="540" cy="95" r="4" fill="#a78bfa" />
              <circle cx="540" cy="245" r="4" fill="#a78bfa" />

              {/* Conventional Current vs Electron Drift Indicators */}
              {switchClosed && activeCurrent > 1e-6 && (
                <g>
                  {/* Top wire arrow: Conventional current (+ → −, clockwise) */}
                  <polygon points="325,65 313,59 313,71" fill="#22d3ee" />
                  <text x="320" y="48" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="600">
                    I = {formatNumber(activeCurrentMa, 3)} mA (Conventional + → −)
                  </text>
                  {/* Bottom return arrow */}
                  <polygon points="315,275 327,269 327,281" fill="#22d3ee" />

                  {showElectronDrift && (
                    <g>
                      <polygon points="295,295 283,290 283,300" fill="#fbbf24" />
                      <text
                        x="320"
                        y="314"
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="10.5"
                        fontWeight="500"
                      >
                        e⁻ Electron Drift (− → +, opposite to conventional current)
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Variable DC Battery Source at (110, 170) */}
              <g transform="translate(110, 170)">
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
                {/* Long positive plate */}
                <line x1="-20" y1="-14" x2="20" y2="-14" stroke="#38bdf8" strokeWidth="3.5" />
                {/* Short thick negative plate */}
                <line x1="-11" y1="-2" x2="11" y2="-2" stroke="#94a3b8" strokeWidth="5" />
                {/* Second cell */}
                <line x1="-20" y1="10" x2="20" y2="10" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-11" y1="22" x2="11" y2="22" stroke="#94a3b8" strokeWidth="5" />
                {/* Diagonal variable-supply arrow */}
                <line x1="-24" y1="26" x2="24" y2="-24" stroke="#f59e0b" strokeWidth="1.8" />
                <polygon points="26,-26 17,-23 23,-17" fill="#f59e0b" />
                <text x="-30" y="-20" fill="#38bdf8" fontSize="12" fontWeight="700">
                  +
                </text>
                <text x="-30" y="28" fill="#94a3b8" fontSize="12" fontWeight="700">
                  −
                </text>
                <text x="0" y="58" textAnchor="middle" fill="#e2e8f0" fontSize="11.5" fontWeight="600">
                  V_s = {formatNumber(voltage, 3)} V
                </text>
              </g>

              {/* Interactive Switch S1 at (235, 65) */}
              <g
                transform="translate(235, 65)"
                onClick={() => setSwitchClosed((s) => !s)}
                className="cursor-pointer"
              >
                <rect x="-36" y="-28" width="72" height="46" rx="6" fill="transparent" />
                <circle cx="-30" cy="0" r="4.5" fill="#e2e8f0" />
                <circle cx="30" cy="0" r="4.5" fill="#e2e8f0" />
                <line
                  x1="-30"
                  y1="0"
                  x2={switchClosed ? 30 : 22}
                  y2={switchClosed ? 0 : -22}
                  stroke={switchClosed ? '#34d399' : '#fbbf24'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <text x="0" y="-30" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">
                  Switch S₁ ({switchClosed ? 'Closed' : 'Open'})
                </text>
              </g>

              {/* Series Ammeter (A) at (400, 65) */}
              <g transform="translate(400, 65)">
                <circle
                  cx="0"
                  cy="0"
                  r="34"
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                />
                <text x="0" y="-6" textAnchor="middle" fill="#22d3ee" fontSize="14" fontWeight="700">
                  A
                </text>
                <text x="0" y="13" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
                  {formatNumber(activeCurrentMa, 3)} mA
                </text>
                <text x="0" y="48" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Series Ammeter
                </text>
              </g>

              {/* Load Component at (540, 170) */}
              <g transform="translate(540, 170)">
                <text x="-22" y="-54" fill="#38bdf8" fontSize="12" fontWeight="700">
                  +
                </text>
                <text x="-22" y="62" fill="#94a3b8" fontSize="12" fontWeight="700">
                  −
                </text>

                {conductorMode === 'ohmic' && (
                  <g>
                    {/* Axial resistor body */}
                    <rect
                      x="-20"
                      y="-46"
                      width="40"
                      height="92"
                      rx="10"
                      fill="#d6c5a3"
                      stroke="#94a3b8"
                      strokeWidth="1.8"
                    />
                    {/* 4 EIA color bands */}
                    {colorBands.map((band, idx) => {
                      const bandY = -30 + idx * 18;
                      return (
                        <rect
                          key={band.bandName}
                          x="-20"
                          y={bandY}
                          width="40"
                          height="7"
                          fill={band.hex}
                        />
                      );
                    })}
                    <text
                      x="-68"
                      y="-4"
                      textAnchor="end"
                      fill="#e2e8f0"
                      fontSize="11.5"
                      fontWeight="600"
                    >
                      R = {formatNumber(resistance, 4)} Ω
                    </text>
                    <text x="-68" y="12" textAnchor="end" fill="#94a3b8" fontSize="10.5">
                      P = {formatQuantity(activePower, 'W', 3)}
                    </text>
                  </g>
                )}

                {conductorMode === 'filament-lamp' && (
                  <g>
                    <circle cx="0" cy="0" r="46" fill="url(#lampGlow)" />
                    <circle
                      cx="0"
                      cy="0"
                      r="30"
                      fill="#0f172a"
                      stroke="#fbbf24"
                      strokeWidth="2.2"
                    />
                    <path
                      d="M 0 -30 L 0 -12 C -14 -8, 14 8, 0 12 L 0 30"
                      stroke={activePower > 0.05 ? '#fde047' : '#94a3b8'}
                      strokeWidth="2.5"
                      fill="none"
                    />
                    <text
                      x="-42"
                      y="-4"
                      textAnchor="end"
                      fill="#fde047"
                      fontSize="11.5"
                      fontWeight="600"
                    >
                      R_eff = {formatNumber(measuredResistance, 4)} Ω
                    </text>
                    <text x="-42" y="12" textAnchor="end" fill="#94a3b8" fontSize="10.5">
                      R₀ (cold) = {formatNumber(resistance, 3)} Ω
                    </text>
                  </g>
                )}

                {conductorMode === 'semiconductor-diode' && (
                  <g>
                    <rect
                      x="-26"
                      y="-44"
                      width="52"
                      height="88"
                      rx="8"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                    />
                    {/* Diode triangle pointing downward (forward biased) */}
                    <polygon points="-14,-18 14,-18 0,6" fill="#38bdf8" />
                    <line x1="-14" y1="6" x2="14" y2="6" stroke="#f8fafc" strokeWidth="2.5" />
                    <text x="0" y="28" textAnchor="middle" fill="#cbd5e1" fontSize="10">
                      + R = {resistance} Ω
                    </text>
                    <text
                      x="-38"
                      y="0"
                      textAnchor="end"
                      fill="#38bdf8"
                      fontSize="11"
                      fontWeight="600"
                    >
                      V_th ≈ 0.7 V
                    </text>
                  </g>
                )}
              </g>

              {/* Parallel Voltmeter (V) at (650, 170) */}
              <g transform="translate(650, 170)">
                <circle
                  cx="0"
                  cy="0"
                  r="32"
                  fill="#0f172a"
                  stroke="#a78bfa"
                  strokeWidth="2.5"
                />
                <text x="0" y="-6" textAnchor="middle" fill="#a78bfa" fontSize="14" fontWeight="700">
                  V
                </text>
                <text x="0" y="13" textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
                  {formatNumber(activeVoltage, 3)} V
                </text>
                <text x="0" y="46" textAnchor="middle" fill="#94a3b8" fontSize="10">
                  Parallel Voltmeter
                </text>
              </g>
            </svg>
          </div>

          {/* Interactive Action Bar & EIA Color Code Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={switchClosed ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSwitchClosed((s) => !s)}
              >
                <Power className="size-3.5" />
                {switchClosed ? 'Open Switch S₁' : 'Close Switch S₁'}
              </Button>
              <Button variant="secondary" size="sm" onClick={resetLab}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
              <Toggle
                label="Show electron drift (e⁻)"
                checked={showElectronDrift}
                onChange={setShowElectronDrift}
              />
            </div>

            {conductorMode === 'ohmic' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-medium text-muted">4-Band EIA Code:</span>
                {colorBands.map((band) => (
                  <span
                    key={band.bandName}
                    className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-fg"
                  >
                    <span
                      className="inline-block size-2.5 rounded-full border border-slate-500"
                      style={{ backgroundColor: band.hex }}
                    />
                    {band.colorName} ({band.label})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Live Digital Multimeter Telemetry Readout Grid */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] font-medium text-muted">Voltmeter reading V</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-fg">
                {formatNumber(activeVoltage, 4)} V
              </p>
              <p className="text-[10.5px] text-muted">Across load terminals</p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] font-medium text-muted">Ammeter reading I</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-accent">
                {formatNumber(activeCurrentMa, 4)} mA
              </p>
              <p className="text-[10.5px] text-muted">{formatNumber(activeCurrent, 4)} A</p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] font-medium text-muted">Static resistance R = V/I</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-fg">
                {Number.isFinite(measuredResistance)
                  ? `${formatNumber(measuredResistance, 4)} Ω`
                  : '∞ Ω'}
              </p>
              <p className="text-[10.5px] text-muted">Nominal R₀ = {formatNumber(resistance, 4)} Ω</p>
            </div>

            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] font-medium text-muted">Dissipated power P = VI</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-fg">
                {formatQuantity(activePower, 'W', 4)}
              </p>
              <p className="text-[10.5px] text-muted">I²R = V²/R</p>
            </div>
          </div>
        </Panel>

        {/* Right Column: Controls, Presets & Notebook Logging */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Circuit Controls"
              description="Vary DC supply voltage V, resistance R, and conductor type."
            />

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-fg-soft">Load Conductor Model</p>
                <SegmentedControl
                  label="Conductor mode"
                  size="sm"
                  value={conductorMode}
                  options={CONDUCTOR_MODES}
                  onChange={setConductorMode}
                />
              </div>

              <Slider
                label="Supply voltage V"
                value={voltage}
                min={0}
                max={24}
                step={0.1}
                unit="V"
                onChange={setVoltage}
              />

              <Slider
                label="Nominal resistance R"
                value={resistance}
                min={10}
                max={1000}
                step={5}
                unit="Ω"
                onChange={setResistance}
              />

              <div className="pt-2">
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
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              title="Experiment Presets"
              description="Compare linear ohmic resistors against non-ohmic components."
            />
            <div className="mt-3 grid gap-2">
              {OHMS_LAW_PRESETS.map((preset) => (
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

      {/* Synchronized Characteristic Graphs */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Characteristic Curves: I–V, I–R & Power P–V
            </h3>
            <p className="text-xs text-muted">
              For an ideal ohmic conductor at constant temperature, the I–V characteristic is a straight
              line through the origin with gradient 1/R.
            </p>
          </div>
          <SegmentedControl
            label="Characteristic graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'iv' && (
            <PlotChart
              data={ivData}
              xKey="v"
              xLabel="Potential Difference V (V)"
              yLabel="Current I (mA)"
              series={[
                { key: 'currentMa', label: `Active load I(V) (${conductorMode}) (mA)`, color: '#38bdf8' },
                ...(conductorMode !== 'ohmic'
                  ? [
                      {
                        key: 'ohmicReferenceMa',
                        label: `Ideal ohmic reference (R₀ = ${resistance} Ω) (mA)`,
                        color: '#34d399',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}

          {plotTab === 'ir' && (
            <PlotChart
              data={irData}
              xKey="r"
              xLabel="Resistance R (Ω)"
              yLabel="Current I (mA)"
              series={[
                {
                  key: 'currentMa',
                  label: `Current I(R) at V = ${formatNumber(activeVoltage || voltage, 3)} V (mA)`,
                  color: '#a78bfa',
                },
              ]}
            />
          )}

          {plotTab === 'pv' && (
            <PlotChart
              data={ivData}
              xKey="v"
              xLabel="Potential Difference V (V)"
              yLabel="Electrical Power P (W)"
              series={[
                { key: 'powerW', label: 'Dissipated power P(V) = V·I (W)', color: '#fbbf24' },
                ...(conductorMode !== 'ohmic'
                  ? [
                      {
                        key: 'ohmicPowerW',
                        label: 'Ideal ohmic power V²/R₀ (W)',
                        color: '#34d399',
                        dashed: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory, Guided Steps & Misconceptions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Core Physics: Ohm’s Law & Ohmic vs. Non-Ohmic Conductors
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <p>
              <strong>Ohm’s Law</strong> states that the current <MathFormula latex="I" /> through a metallic
              conductor is directly proportional to the potential difference <MathFormula latex="V" /> across
              its ends, provided temperature and physical conditions remain constant:
            </p>
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="V = I R,\qquad I = \frac{V}{R},\qquad R = \frac{V}{I},\qquad P = V I = I^2 R = \frac{V^2}{R}"
              />
            </div>
            <ul className="list-disc space-y-1 pl-4 text-muted">
              <li>
                <strong>Ohmic conductors</strong> (e.g., constantan or nichrome wire at constant temperature)
                have constant resistance <MathFormula latex="R" /> and a linear <MathFormula latex="I\text{–}V" />{' '}
                graph passing through the origin with slope <MathFormula latex="\Delta I / \Delta V = 1/R" />.
              </li>
              <li>
                <strong>Illustrative non-ohmic components</strong>: An incandescent tungsten filament heats up
                as current increases, raising lattice vibration scattering and increasing <MathFormula latex="R" />.
                A semiconductor diode conducts negligibly below its forward threshold (<MathFormula latex="\approx 0.7\text{ V}" />).
              </li>
            </ul>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Guided Investigation & Common Misconceptions
            </h3>
          </div>
          <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-fg-soft">
            <p className="font-semibold text-fg">Guided Experiment Steps:</p>
            <ol className="list-decimal space-y-1 pl-4 text-muted">
              <li>
                Keep <MathFormula latex="R = 100\,\Omega" /> fixed in <em>Ideal Ohmic Resistor</em> mode and
                sweep <MathFormula latex="V" /> from <MathFormula latex="2\text{ V}" /> to{' '}
                <MathFormula latex="20\text{ V}" />. Confirm that <MathFormula latex="V / I" /> remains constant.
              </li>
              <li>
                Switch to the <em>I–R Relationship</em> graph and observe the inverse hyperbola{' '}
                <MathFormula latex="I \propto 1/R" /> at fixed voltage.
              </li>
              <li>
                Select the <em>12 V Incandescent Filament Lamp</em> preset and observe how the{' '}
                <MathFormula latex="I\text{–}V" /> curve bends downward compared to the dashed ideal ohmic reference.
              </li>
            </ol>
            <div className="rounded-lg border border-line bg-surface-2/40 p-3 text-muted">
              <p className="font-semibold text-fg">Common Misconceptions:</p>
              <p className="mt-1">
                • <strong>Conventional current vs. electron flow</strong>: Conventional current flows from the
                positive (<MathFormula latex="+" />) to negative (<MathFormula latex="-" />) terminal, whereas
                conduction electrons drift in the opposite direction (<MathFormula latex="- \to +" />).
                <br />• <strong>Defining R from V/I vs. dV/dI</strong>: Even for a non-ohmic component, static
                resistance at a single operating point is <MathFormula latex="R = V/I" />, not the inverse tangent
                slope of the curve.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
