import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Info, Layers, NotebookPen, RotateCcw, Unplug } from 'lucide-react';
import {
  evaluateCapacitorState,
  parallelCapacitance,
  parallelPlateCapacitance,
  seriesCapacitance,
  type CapacitorConnectionMode,
} from '@/engine/physics/electricity';
import { formatNumber, formatQuantity } from '@/engine/units/format';
import { useNotebookStore } from '@/store/notebookStore';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { PlotChart } from '@/components/graphs/PlotChart';

const CONNECTION_MODES = [
  { value: 'connected', label: 'Battery Connected (Constant V)' },
  { value: 'isolated', label: 'Isolated Plates (Constant Q)' },
] as const;

const PLOT_TABS = [
  { value: 'qv', label: 'Q(V) Charge vs Voltage' },
  { value: 'cd', label: 'C(d) Capacitance vs Separation' },
  { value: 'uv', label: 'U(V) Stored Energy vs Voltage' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface CapacitorPreset {
  id: string;
  label: string;
  sub: string;
  areaCm2: number;
  separationMm: number;
  dielectric: number;
  voltage: number;
  mode: CapacitorConnectionMode;
}

const CAPACITOR_PRESETS: readonly CapacitorPreset[] = [
  {
    id: 'air-gap-standard',
    label: 'Air-Gap Parallel-Plate Capacitor (ε_r = 1.0)',
    sub: 'A = 200 cm², d = 2.0 mm, ε_r = 1.0, V = 20 V (Battery Connected)',
    areaCm2: 200,
    separationMm: 2.0,
    dielectric: 1.0,
    voltage: 20,
    mode: 'connected',
  },
  {
    id: 'teflon-connected',
    label: 'PTFE / Teflon Dielectric at Constant Voltage (ε_r = 2.1)',
    sub: 'A = 200 cm², d = 2.0 mm, ε_r = 2.1, V = 20 V → C, Q and U increase by 2.1×',
    areaCm2: 200,
    separationMm: 2.0,
    dielectric: 2.1,
    voltage: 20,
    mode: 'connected',
  },
  {
    id: 'glass-connected',
    label: 'Pyrex Glass Dielectric High-Energy Cell (ε_r = 4.7)',
    sub: 'A = 400 cm², d = 1.0 mm, ε_r = 4.7, V = 50 V (Constant V)',
    areaCm2: 400,
    separationMm: 1.0,
    dielectric: 4.7,
    voltage: 50,
    mode: 'connected',
  },
  {
    id: 'isolated-dielectric-insertion',
    label: 'Isolated Charged Capacitor with Dielectric Inserted (Constant Q)',
    sub: 'Charged at 30 V in air, then isolated & ε_r = 3.0 inserted → V, E and U drop by 3×',
    areaCm2: 250,
    separationMm: 2.0,
    dielectric: 3.0,
    voltage: 30,
    mode: 'isolated',
  },
] as const;

export default function CapacitorsLab() {
  const [areaCm2, setAreaCm2] = useState(200);
  const [separationMm, setSeparationMm] = useState(2.0);
  const [dielectricConstant, setDielectricConstant] = useState(1.0);
  const [supplyVoltage, setSupplyVoltage] = useState(20);
  const [connectionMode, setConnectionMode] = useState<CapacitorConnectionMode>('connected');
  const [lockedCharge, setLockedCharge] = useState<number>(() => {
    const c0 = parallelPlateCapacitance(200 * 1e-4, 2.0 * 1e-3, 1.0);
    return c0 * 20;
  });

  // Companion 3-capacitor network comparison (in µF)
  const [c1Uf, setC1Uf] = useState(10);
  const [c2Uf, setC2Uf] = useState(20);
  const [c3Uf, setC3Uf] = useState(30);

  const [plotTab, setPlotTab] = useState<PlotTab>('qv');
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

  const plateAreaM2 = areaCm2 * 1e-4;
  const separationM = separationMm * 1e-3;

  const state = useMemo(
    () =>
      evaluateCapacitorState({
        plateAreaM2,
        separationM,
        dielectricConstant,
        supplyVoltage,
        connectionMode,
        lockedChargeCoulombs: lockedCharge,
      }),
    [plateAreaM2, separationM, dielectricConstant, supplyVoltage, connectionMode, lockedCharge],
  );

  // Keep lockedCharge synchronized while connected so switching to 'isolated' locks the current plate charge!
  const handleConnectionModeChange = (nextMode: CapacitorConnectionMode) => {
    if (nextMode === 'isolated' && connectionMode === 'connected') {
      setLockedCharge(state.charge);
    }
    setConnectionMode(nextMode);
  };

  const cSeriesUf = useMemo(
    () => seriesCapacitance([c1Uf, c2Uf, c3Uf]),
    [c1Uf, c2Uf, c3Uf],
  );
  const cParallelUf = useMemo(
    () => parallelCapacitance([c1Uf, c2Uf, c3Uf]),
    [c1Uf, c2Uf, c3Uf],
  );

  const qvData = useMemo(() => {
    const pts = [];
    for (let v = 0; v <= 100; v += 5) {
      pts.push({
        v,
        qWithDielectricNc: Number((state.capacitance * v * 1e9).toFixed(4)),
        qVacuumNc: Number((state.vacuumCapacitance * v * 1e9).toFixed(4)),
        energyNj: Number((0.5 * state.capacitance * v * v * 1e9).toFixed(4)),
        vacuumEnergyNj: Number((0.5 * state.vacuumCapacitance * v * v * 1e9).toFixed(4)),
      });
    }
    return pts;
  }, [state.capacitance, state.vacuumCapacitance]);

  const cdData = useMemo(() => {
    const pts = [];
    for (let dMm = 0.5; dMm <= 10; dMm += 0.5) {
      const c = parallelPlateCapacitance(plateAreaM2, dMm * 1e-3, dielectricConstant);
      const c0 = parallelPlateCapacitance(plateAreaM2, dMm * 1e-3, 1.0);
      pts.push({
        dMm: Number(dMm.toFixed(1)),
        cPf: Number((c * 1e12).toFixed(3)),
        c0Pf: Number((c0 * 1e12).toFixed(3)),
      });
    }
    return pts;
  }, [plateAreaM2, dielectricConstant]);

  const applyPreset = (preset: CapacitorPreset) => {
    setAreaCm2(preset.areaCm2);
    setSeparationMm(preset.separationMm);
    setDielectricConstant(preset.dielectric);
    setSupplyVoltage(preset.voltage);
    const cAir = parallelPlateCapacitance(preset.areaCm2 * 1e-4, preset.separationMm * 1e-3, 1.0);
    setLockedCharge(cAir * preset.voltage);
    setConnectionMode(preset.mode);
  };

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'capacitors',
      title: `Parallel-Plate Capacitor (${connectionMode}) — C = ${formatQuantity(state.capacitance, 'F', 4)}, ε_r = ${formatNumber(dielectricConstant, 3)}`,
      body: `Plate area A = ${areaCm2} cm² (${formatNumber(plateAreaM2, 3)} m²), separation d = ${separationMm} mm, dielectric ε_r = ${dielectricConstant} in ${connectionMode} mode.`,
      measurements: [
        { label: 'Capacitance C = ε₀ε_rA/d', value: formatQuantity(state.capacitance, 'F', 4) },
        { label: 'Vacuum capacitance C₀', value: formatQuantity(state.vacuumCapacitance, 'F', 4) },
        { label: 'Plate voltage V', value: `${formatNumber(state.voltage, 4)} V` },
        { label: 'Stored charge Q = CV', value: formatQuantity(state.charge, 'C', 4) },
        { label: 'Electric field E = V/d', value: `${formatNumber(state.electricField, 4)} V/m` },
        { label: 'Stored energy U = ½CV²', value: formatQuantity(state.storedEnergy, 'J', 4) },
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

  const plateWidthPx = 180 + (areaCm2 / 500) * 140;
  const gapPx = 36 + (separationMm / 10) * 74;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left Column: Parallel-Plate Capacitor Apparatus & Telemetry */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Parallel-Plate Capacitor & Dielectric Apparatus"
            description="Adjust plate area A, separation d, dielectric constant ε_r, and switch between constant-voltage and isolated constant-charge conditions."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={connectionMode === 'connected' ? 'success' : 'warning'}>
                  {connectionMode === 'connected'
                    ? `Battery Connected (V = ${formatNumber(state.voltage, 3)} V)`
                    : `Isolated Plates (Q = ${formatQuantity(state.charge, 'C', 3)})`}
                </Badge>
                <Badge tone="accent">C = {formatQuantity(state.capacitance, 'F', 4)}</Badge>
              </div>
            }
          />

          {/* Interactive SVG Parallel-Plate Apparatus */}
          <div className="bg-slate-950 px-4 py-5">
            <svg
              viewBox="0 0 720 310"
              className="mx-auto block w-full max-w-[720px]"
              role="img"
              aria-label="Interactive parallel-plate capacitor apparatus showing plates, electric field lines, dielectric slab and battery connection"
            >
              {/* Left Battery & Connection Switch */}
              <g transform="translate(105, 155)">
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
                <text x="0" y="58" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
                  V₀ = {formatNumber(supplyVoltage, 3)} V
                </text>
              </g>

              {/* Connecting Wires to Top & Bottom Plates */}
              <path
                d={`M 105 113 L 105 50 L 210 50 M 265 50 L 440 50 L 440 ${155 - gapPx / 2}`}
                stroke={connectionMode === 'connected' ? '#38bdf8' : '#64748b'}
                strokeWidth="3"
                fill="none"
              />
              <path
                d={`M 105 197 L 105 260 L 440 260 L 440 ${155 + gapPx / 2}`}
                stroke={connectionMode === 'connected' ? '#38bdf8' : '#64748b'}
                strokeWidth="3"
                fill="none"
              />

              {/* Isolation Switch at (238, 50) */}
              <g
                transform="translate(238, 50)"
                onClick={() =>
                  handleConnectionModeChange(
                    connectionMode === 'connected' ? 'isolated' : 'connected',
                  )
                }
                className="cursor-pointer"
              >
                <circle cx="-26" cy="0" r="4.5" fill="#e2e8f0" />
                <circle cx="26" cy="0" r="4.5" fill="#e2e8f0" />
                <line
                  x1="-26"
                  y1="0"
                  x2={connectionMode === 'connected' ? 26 : 18}
                  y2={connectionMode === 'connected' ? 0 : -22}
                  stroke={connectionMode === 'connected' ? '#34d399' : '#fbbf24'}
                  strokeWidth="3.5"
                />
                <text x="0" y="-28" textAnchor="middle" fill="#cbd5e1" fontSize="10.5" fontWeight="600">
                  {connectionMode === 'connected' ? 'Connected (Constant V)' : 'Isolated (Constant Q)'}
                </text>
              </g>

              {/* Parallel Plates & Dielectric Slab Centered at (440, 155) */}
              <g transform="translate(440, 155)">
                {/* Dielectric slab when ε_r > 1 */}
                {dielectricConstant > 1.01 && (
                  <g>
                    <rect
                      x={-plateWidthPx / 2 + 6}
                      y={-gapPx / 2 + 6}
                      width={plateWidthPx - 12}
                      height={gapPx - 12}
                      rx="4"
                      fill="rgba(167, 139, 250, 0.22)"
                      stroke="#a78bfa"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#ddd6fe"
                      fontSize="11"
                      fontWeight="600"
                    >
                      Dielectric ε_r = {formatNumber(dielectricConstant, 2)}
                    </text>
                  </g>
                )}

                {/* Uniform Electric Field E Arrows (Top + Plate → Bottom − Plate) */}
                {state.voltage > 0.1 &&
                  [-0.36, -0.18, 0, 0.18, 0.36].map((frac, idx) => {
                    const x = frac * plateWidthPx;
                    const yTop = -gapPx / 2 + 8;
                    const yBot = gapPx / 2 - 8;
                    return (
                      <g key={idx}>
                        <line
                          x1={x}
                          y1={yTop}
                          x2={x}
                          y2={yBot}
                          stroke="#22d3ee"
                          strokeWidth="1.6"
                        />
                        <polygon
                          points={`${x},${yBot} ${x - 4},${yBot - 8} ${x + 4},${yBot - 8}`}
                          fill="#22d3ee"
                        />
                      </g>
                    );
                  })}

                {/* Top Positive Plate (+Q) */}
                <rect
                  x={-plateWidthPx / 2}
                  y={-gapPx / 2 - 12}
                  width={plateWidthPx}
                  height="12"
                  rx="3"
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <text
                  x={plateWidthPx / 2 + 12}
                  y={-gapPx / 2 - 2}
                  fill="#38bdf8"
                  fontSize="11"
                  fontWeight="700"
                >
                  +Q = +{formatQuantity(state.charge, 'C', 3)}
                </text>

                {/* Bottom Negative Plate (−Q) */}
                <rect
                  x={-plateWidthPx / 2}
                  y={gapPx / 2}
                  width={plateWidthPx}
                  height="12"
                  rx="3"
                  fill="#334155"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={plateWidthPx / 2 + 12}
                  y={gapPx / 2 + 10}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="700"
                >
                  −Q = −{formatQuantity(state.charge, 'C', 3)}
                </text>

                {/* Dimension Callout */}
                <text
                  x={-plateWidthPx / 2 - 12}
                  y="4"
                  textAnchor="end"
                  fill="#cbd5e1"
                  fontSize="10.5"
                  fontFamily="monospace"
                >
                  d = {formatNumber(separationMm, 2)} mm
                </text>
              </g>
            </svg>
          </div>

          {/* Boundary Condition Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/50 px-5 py-3">
            <SegmentedControl
              label="Boundary condition"
              size="sm"
              value={connectionMode}
              options={CONNECTION_MODES}
              onChange={handleConnectionModeChange}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => applyPreset(CAPACITOR_PRESETS[0])}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>

          {/* Live Capacitor Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Capacitance C</p>
              <p className="font-mono text-xs font-semibold text-accent">
                {formatQuantity(state.capacitance, 'F', 4)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Vacuum C₀ (ε_r=1)</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatQuantity(state.vacuumCapacitance, 'F', 4)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Plate voltage V</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatNumber(state.voltage, 4)} V
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Plate charge Q = CV</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatQuantity(state.charge, 'C', 4)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Electric field E = V/d</p>
              <p className="font-mono text-xs font-semibold text-fg">
                {formatQuantity(state.electricField, 'V/m', 4)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
              <p className="text-[11px] text-muted">Stored energy U</p>
              <p className="font-mono text-xs font-semibold text-emerald-400">
                {formatQuantity(state.storedEnergy, 'J', 4)}
              </p>
            </div>
          </div>

          {/* Companion Series & Parallel Capacitor Combination Explorer */}
          <div className="border-t border-line bg-surface-2/30 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
                <Layers className="size-3.5 text-accent" />
                Series & Parallel Capacitor Combinations (C₁, C₂, C₃)
              </h3>
              <span className="font-mono text-xs font-semibold text-fg">
                Series C_eq = {formatNumber(cSeriesUf, 4)} µF · Parallel C_eq ={' '}
                {formatNumber(cParallelUf, 4)} µF
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Slider
                label="Capacitor C₁"
                value={c1Uf}
                min={1}
                max={100}
                step={1}
                unit="µF"
                onChange={setC1Uf}
              />
              <Slider
                label="Capacitor C₂"
                value={c2Uf}
                min={1}
                max={100}
                step={1}
                unit="µF"
                onChange={setC2Uf}
              />
              <Slider
                label="Capacitor C₃"
                value={c3Uf}
                min={1}
                max={100}
                step={1}
                unit="µF"
                onChange={setC3Uf}
              />
            </div>
          </div>
        </Panel>

        {/* Right Column: Geometry/Dielectric Controls & Presets */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Capacitor Geometry & Dielectric"
              description="Vary plate area A, plate separation d, dielectric constant ε_r, and voltage."
            />
            <div className="mt-4 space-y-4">
              <Slider
                label="Plate area A"
                value={areaCm2}
                min={50}
                max={500}
                step={10}
                unit="cm²"
                onChange={setAreaCm2}
              />
              <Slider
                label="Plate separation d"
                value={separationMm}
                min={0.5}
                max={10}
                step={0.25}
                unit="mm"
                onChange={setSeparationMm}
              />
              <Slider
                label="Dielectric constant ε_r"
                value={dielectricConstant}
                min={1.0}
                max={10.0}
                step={0.1}
                unit=""
                onChange={setDielectricConstant}
              />
              <Slider
                label="Battery supply voltage V₀"
                value={supplyVoltage}
                min={0}
                max={100}
                step={2}
                unit="V"
                onChange={setSupplyVoltage}
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
              title="Capacitor & Dielectric Presets"
              description="Compare air, PTFE, Pyrex glass, and isolated constant-charge insertion."
            />
            <div className="mt-3 grid gap-2">
              {CAPACITOR_PRESETS.map((preset) => (
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

      {/* Synchronized Graphs: Q–V, C–d, U–V */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Capacitor Characteristic Curves: Q(V), C(d) & Stored Energy U(V)
            </h3>
            <p className="text-xs text-muted">
              Compare dielectric-enhanced capacitance against vacuum reference C₀ = ε₀ A / d.
            </p>
          </div>
          <SegmentedControl
            label="Capacitor graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'qv' && (
            <PlotChart
              data={qvData}
              xKey="v"
              xLabel="Potential Difference V (V)"
              yLabel="Plate Charge Q (nC)"
              series={[
                {
                  key: 'qWithDielectricNc',
                  label: `Charge Q(V) = C·V (ε_r = ${formatNumber(dielectricConstant, 2)}) (nC)`,
                  color: '#38bdf8',
                },
                {
                  key: 'qVacuumNc',
                  label: 'Vacuum reference Q₀(V) = C₀·V (nC)',
                  color: '#94a3b8',
                  dashed: true,
                },
              ]}
            />
          )}

          {plotTab === 'cd' && (
            <PlotChart
              data={cdData}
              xKey="dMm"
              xLabel="Plate Separation d (mm)"
              yLabel="Capacitance C (pF)"
              series={[
                {
                  key: 'cPf',
                  label: `Capacitance C(d) = ε₀ε_rA/d (ε_r = ${formatNumber(dielectricConstant, 2)}) (pF)`,
                  color: '#a78bfa',
                },
                {
                  key: 'c0Pf',
                  label: 'Vacuum capacitance C₀(d) = ε₀A/d (pF)',
                  color: '#34d399',
                  dashed: true,
                },
              ]}
            />
          )}

          {plotTab === 'uv' && (
            <PlotChart
              data={qvData}
              xKey="v"
              xLabel="Potential Difference V (V)"
              yLabel="Stored Electrostatic Energy U (nJ)"
              series={[
                {
                  key: 'energyNj',
                  label: `Stored energy U(V) = ½CV² (nJ)`,
                  color: '#34d399',
                },
                {
                  key: 'vacuumEnergyNj',
                  label: 'Vacuum reference U₀(V) = ½C₀V² (nJ)',
                  color: '#fbbf24',
                  dashed: true,
                },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory: Constant-V vs Constant-Q & Edge Effects */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Parallel-Plate Capacitance, Energy & Ideal Assumptions
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="C = \frac{Q}{V} = \frac{\varepsilon_0 \varepsilon_r A}{d},\qquad U = \tfrac{1}{2}CV^2 = \frac{Q^2}{2C} = \tfrac{1}{2}QV"
              />
            </div>
            <p className="text-muted">
              <strong>Ideal parallel-plate approximation & edge effects</strong>: The formula{' '}
              <MathFormula latex="C = \varepsilon_0 \varepsilon_r A / d" /> assumes a uniform
              electric field <MathFormula latex="E = V/d" /> confined strictly between the plates
              (<MathFormula latex="\sqrt{A} \gg d" />). In real capacitors with larger relative
              spacing, <em>fringing fields</em> bulge outward at the plate edges, slightly increasing
              actual capacitance above the ideal formula.
            </p>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Unplug className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Inserting a Dielectric: Constant Voltage vs. Isolated Plates
            </h3>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              • <strong>Battery Connected (Constant <MathFormula latex="V = V_0" />)</strong>:
              Inserting a dielectric (<MathFormula latex="\varepsilon_r > 1" />) increases{' '}
              <MathFormula latex="C = \varepsilon_r C_0" />. The battery supplies extra charge so{' '}
              <MathFormula latex="Q = \varepsilon_r Q_0" /> increases, <MathFormula latex="E = V_0/d" />{' '}
              stays constant, and stored energy <MathFormula latex="U = \tfrac{1}{2}CV_0^2" />{' '}
              <strong>increases</strong> by factor <MathFormula latex="\varepsilon_r" />.
            </p>
            <p>
              • <strong>Battery Disconnected (Isolated Constant <MathFormula latex="Q" />)</strong>:
              Charge <MathFormula latex="Q" /> is trapped on the plates. Inserting a dielectric
              polarizes the medium, weakening the internal electric field{' '}
              <MathFormula latex="E = E_0 / \varepsilon_r" />, reducing plate voltage{' '}
              <MathFormula latex="V = Q / C = V_0 / \varepsilon_r" />, and <strong>decreasing</strong>{' '}
              stored energy <MathFormula latex="U = Q^2 / (2C) = U_0 / \varepsilon_r" /> (the field
              pulls the dielectric slab inward, doing mechanical work).
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
