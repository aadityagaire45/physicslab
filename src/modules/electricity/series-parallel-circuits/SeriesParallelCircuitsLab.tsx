import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GitBranch, Info, NotebookPen, Plus, Power, RotateCcw, Trash2 } from 'lucide-react';
import {
  solveResistorNetwork,
  type CircuitTopology,
  type ResistorBranchSpec,
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

const TOPOLOGY_OPTIONS = [
  { value: 'series', label: 'Series Chain' },
  { value: 'parallel', label: 'Parallel Bank' },
  { value: 'mixed-series-parallel', label: 'Mixed: R₁ + (R₂∥R₃)' },
  { value: 'mixed-dual-parallel', label: 'Mixed: (R₁∥R₂) + (R₃∥R₄)' },
] as const;

const PLOT_TABS = [
  { value: 'vi-comparison', label: 'I(V) Network vs Series/Parallel' },
  { value: 'branch-voltage', label: 'Branch Voltage Drops ΔVᵢ(V_s)' },
  { value: 'power-curve', label: 'Total Power P(V_s)' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface NetworkPreset {
  id: string;
  label: string;
  sub: string;
  sourceVoltage: number;
  topology: CircuitTopology;
  resistors: ResistorBranchSpec[];
}

const DEFAULT_RESISTORS: ResistorBranchSpec[] = [
  { id: 'r1', label: 'R₁', resistance: 100, closed: true },
  { id: 'r2', label: 'R₂', resistance: 200, closed: true },
  { id: 'r3', label: 'R₃', resistance: 300, closed: true },
];

const NETWORK_PRESETS: readonly NetworkPreset[] = [
  {
    id: 'series-divider',
    label: 'Three-Resistor Series Voltage Divider',
    sub: 'V_s = 12 V, R₁ = 100 Ω, R₂ = 200 Ω, R₃ = 300 Ω → R_eq = 600 Ω, I = 20 mA',
    sourceVoltage: 12,
    topology: 'series',
    resistors: [
      { id: 'r1', label: 'R₁', resistance: 100, closed: true },
      { id: 'r2', label: 'R₂', resistance: 200, closed: true },
      { id: 'r3', label: 'R₃', resistance: 300, closed: true },
    ],
  },
  {
    id: 'parallel-current-splitter',
    label: 'Three-Branch Parallel Current Divider',
    sub: 'V_s = 12 V, R₁ = 60 Ω, R₂ = 120 Ω, R₃ = 180 Ω → R_eq = 32.73 Ω',
    sourceVoltage: 12,
    topology: 'parallel',
    resistors: [
      { id: 'r1', label: 'R₁', resistance: 60, closed: true },
      { id: 'r2', label: 'R₂', resistance: 120, closed: true },
      { id: 'r3', label: 'R₃', resistance: 180, closed: true },
    ],
  },
  {
    id: 'mixed-combinational',
    label: 'Mixed Series–Parallel Network: R₁ + (R₂ ∥ R₃)',
    sub: 'V_s = 15 V, R₁ = 100 Ω in series with (200 Ω ∥ 200 Ω) → R_eq = 200 Ω',
    sourceVoltage: 15,
    topology: 'mixed-series-parallel',
    resistors: [
      { id: 'r1', label: 'R₁', resistance: 100, closed: true },
      { id: 'r2', label: 'R₂', resistance: 200, closed: true },
      { id: 'r3', label: 'R₃', resistance: 200, closed: true },
    ],
  },
  {
    id: 'five-resistor-parallel',
    label: 'Five-Resistor Equal Parallel Array',
    sub: 'V_s = 10 V, five 500 Ω branches in parallel → R_eq = 100 Ω, I_total = 100 mA',
    sourceVoltage: 10,
    topology: 'parallel',
    resistors: [
      { id: 'r1', label: 'R₁', resistance: 500, closed: true },
      { id: 'r2', label: 'R₂', resistance: 500, closed: true },
      { id: 'r3', label: 'R₃', resistance: 500, closed: true },
      { id: 'r4', label: 'R₄', resistance: 500, closed: true },
      { id: 'r5', label: 'R₅', resistance: 500, closed: true },
    ],
  },
  {
    id: 'dual-parallel-ladder',
    label: 'Dual Parallel Banks: (R₁ ∥ R₂) + (R₃ ∥ R₄)',
    sub: 'V_s = 18 V, (120 Ω ∥ 120 Ω) + (180 Ω ∥ 90 Ω) → R_eq = 60 + 60 = 120 Ω',
    sourceVoltage: 18,
    topology: 'mixed-dual-parallel',
    resistors: [
      { id: 'r1', label: 'R₁', resistance: 120, closed: true },
      { id: 'r2', label: 'R₂', resistance: 120, closed: true },
      { id: 'r3', label: 'R₃', resistance: 180, closed: true },
      { id: 'r4', label: 'R₄', resistance: 90, closed: true },
    ],
  },
] as const;

export default function SeriesParallelCircuitsLab() {
  const [sourceVoltage, setSourceVoltage] = useState(12);
  const [topology, setTopology] = useState<CircuitTopology>('series');
  const [resistors, setResistors] = useState<ResistorBranchSpec[]>(DEFAULT_RESISTORS);
  const [plotTab, setPlotTab] = useState<PlotTab>('vi-comparison');
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

  const solution = useMemo(
    () =>
      solveResistorNetwork({
        sourceVoltage,
        topology,
        resistors,
      }),
    [sourceVoltage, topology, resistors],
  );

  const updateResistorValue = (index: number, resistance: number) => {
    setResistors((prev) =>
      prev.map((item, i) => (i === index ? { ...item, resistance } : item)),
    );
  };

  const toggleBranchSwitch = (index: number) => {
    setResistors((prev) =>
      prev.map((item, i) => (i === index ? { ...item, closed: !item.closed } : item)),
    );
  };

  const addResistor = () => {
    if (resistors.length >= 5) return;
    const nextIdx = resistors.length + 1;
    const subscripts = ['₁', '₂', '₃', '₄', '₅'];
    setResistors((prev) => [
      ...prev,
      {
        id: `r${nextIdx}`,
        label: `R${subscripts[nextIdx - 1] ?? nextIdx}`,
        resistance: 150,
        closed: true,
      },
    ]);
  };

  const removeLastResistor = () => {
    if (resistors.length <= 2) return;
    setResistors((prev) => prev.slice(0, -1));
  };

  const applyPreset = (preset: NetworkPreset) => {
    setSourceVoltage(preset.sourceVoltage);
    setTopology(preset.topology);
    setResistors(preset.resistors.map((r) => ({ ...r })));
  };

  const graphData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 24; i += 1) {
      const v = i;
      const sol = solveResistorNetwork({ sourceVoltage: v, topology, resistors });
      pts.push({
        v,
        activeCurrentMa: Number((sol.totalCurrent * 1000).toFixed(3)),
        allSeriesCurrentMa: Number(((v / sol.allSeriesEquivalent) * 1000).toFixed(3)),
        allParallelCurrentMa: Number(((v / sol.allParallelEquivalent) * 1000).toFixed(3)),
        totalPowerW: Number(sol.totalPower.toFixed(4)),
        v1: Number((sol.branches[0]?.voltageDrop ?? 0).toFixed(3)),
        v2: Number((sol.branches[1]?.voltageDrop ?? 0).toFixed(3)),
        v3: Number((sol.branches[2]?.voltageDrop ?? 0).toFixed(3)),
      });
    }
    return pts;
  }, [topology, resistors]);

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'series-parallel-circuits',
      title: `Resistor Network (${topology}) — R_eq = ${Number.isFinite(solution.equivalentResistance) ? `${formatNumber(solution.equivalentResistance, 4)} Ω` : '∞ Ω'}`,
      body: `Analyzed ${resistors.length}-resistor ${topology} network at V_s = ${formatNumber(sourceVoltage, 3)} V. Total current I_total = ${formatQuantity(solution.totalCurrent, 'A', 4)}, total power P = ${formatQuantity(solution.totalPower, 'W', 4)}.`,
      measurements: [
        { label: 'Topology', value: topology },
        {
          label: 'Equivalent resistance R_eq',
          value: Number.isFinite(solution.equivalentResistance)
            ? `${formatNumber(solution.equivalentResistance, 4)} Ω`
            : '∞ Ω (Open circuit)',
        },
        { label: 'Total current I_total', value: formatQuantity(solution.totalCurrent, 'A', 4) },
        { label: 'Total power P_total', value: formatQuantity(solution.totalPower, 'W', 4) },
        ...solution.branches.map((b) => ({
          label: `${b.label} (${b.resistance} Ω, ${b.closed ? 'Closed' : 'Open'})`,
          value: `I = ${formatQuantity(b.current, 'A', 3)}, ΔV = ${formatNumber(b.voltageDrop, 3)} V`,
        })),
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
      <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
        {/* Left Column: Interactive Network Schematic & Per-Branch Telemetry Table */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Series, Parallel & Mixed Resistor Network"
            description="Click any branch switch (S₁–S₅) on the schematic or table to connect/disconnect individual branches."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={solution.isCircuitComplete ? 'success' : 'warning'}>
                  {solution.isCircuitComplete
                    ? `R_eq = ${formatNumber(solution.equivalentResistance, 4)} Ω`
                    : 'Open Circuit (R_eq = ∞)'}
                </Badge>
                <SegmentedControl
                  label="Circuit topology"
                  size="sm"
                  value={topology}
                  options={TOPOLOGY_OPTIONS}
                  onChange={setTopology}
                />
              </div>
            }
          />

          {/* Interactive SVG Network Diagram */}
          <div className="bg-slate-950 px-4 py-5">
            <svg
              viewBox="0 0 740 310"
              className="mx-auto block w-full max-w-[740px]"
              role="img"
              aria-label="Interactive series and parallel resistor circuit schematic"
            >
              {/* Source Battery on left at (75, 155) */}
              <g transform="translate(75, 155)">
                <rect
                  x="-36"
                  y="-44"
                  width="72"
                  height="88"
                  rx="8"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <line x1="-18" y1="-12" x2="18" y2="-12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#94a3b8" strokeWidth="5" />
                <line x1="-18" y1="12" x2="18" y2="12" stroke="#38bdf8" strokeWidth="3.5" />
                <line x1="-10" y1="24" x2="10" y2="24" stroke="#94a3b8" strokeWidth="5" />
                <text x="-26" y="-16" fill="#38bdf8" fontSize="11" fontWeight="700">
                  +
                </text>
                <text x="-26" y="28" fill="#94a3b8" fontSize="11" fontWeight="700">
                  −
                </text>
                <text x="0" y="60" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">
                  V_s = {formatNumber(sourceVoltage, 3)} V
                </text>
                <text x="0" y="75" textAnchor="middle" fill="#22d3ee" fontSize="10.5" fontFamily="monospace">
                  I_tot = {formatNumber(solution.totalCurrent * 1000, 3)} mA
                </text>
              </g>

              {/* Main supply rails */}
              <path
                d="M 75 111 L 75 45 L 155 45"
                stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M 75 199 L 75 265 L 675 265"
                stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                strokeWidth="3"
                fill="none"
              />

              {/* Topology-aware interactive resistor nodes */}
              {topology === 'series' && (
                <g>
                  <line
                    x1="155"
                    y1="45"
                    x2="675"
                    y2="45"
                    stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                    strokeWidth="3"
                  />
                  <line
                    x1="675"
                    y1="45"
                    x2="675"
                    y2="265"
                    stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                    strokeWidth="3"
                  />
                  {solution.branches.map((b, i) => {
                    const count = solution.branches.length;
                    const x = 195 + (i * 440) / Math.max(1, count - 1);
                    return (
                      <g
                        key={b.id}
                        transform={`translate(${x}, 45)`}
                        onClick={() => toggleBranchSwitch(i)}
                        className="cursor-pointer"
                      >
                        <rect
                          x="-36"
                          y="-22"
                          width="72"
                          height="44"
                          rx="7"
                          fill="#0f172a"
                          stroke={b.closed && b.current > 0 ? '#22d3ee' : '#ef4444'}
                          strokeWidth="2"
                        />
                        <text x="0" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                          {b.label} = {b.resistance} Ω
                        </text>
                        <text x="0" y="12" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                          ΔV = {formatNumber(b.voltageDrop, 3)} V
                        </text>
                        <text
                          x="0"
                          y="38"
                          textAnchor="middle"
                          fill={b.closed ? '#34d399' : '#fbbf24'}
                          fontSize="10"
                          fontWeight="600"
                        >
                          S{i + 1}: {b.closed ? 'Closed' : 'OPEN'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {topology === 'parallel' && (
                <g>
                  <line x1="155" y1="45" x2="675" y2="45" stroke="#38bdf8" strokeWidth="3" />
                  {solution.branches.map((b, i) => {
                    const count = solution.branches.length;
                    const x = 210 + (i * 430) / Math.max(1, count - 1);
                    const active = b.closed && b.current > 0;
                    return (
                      <g
                        key={b.id}
                        transform={`translate(${x}, 155)`}
                        onClick={() => toggleBranchSwitch(i)}
                        className="cursor-pointer"
                      >
                        <line
                          x1="0"
                          y1="-110"
                          x2="0"
                          y2="110"
                          stroke={active ? '#22d3ee' : '#475569'}
                          strokeWidth="2.5"
                          strokeDasharray={b.closed ? undefined : '4 4'}
                        />
                        <circle cx="0" cy="-110" r="4" fill="#38bdf8" />
                        <circle cx="0" cy="110" r="4" fill="#38bdf8" />
                        <rect
                          x="-40"
                          y="-34"
                          width="80"
                          height="68"
                          rx="7"
                          fill="#0f172a"
                          stroke={active ? '#22d3ee' : '#f59e0b'}
                          strokeWidth="2"
                        />
                        <text x="0" y="-14" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                          {b.label} ({b.resistance} Ω)
                        </text>
                        <text x="0" y="3" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="monospace">
                          I = {formatNumber(b.current * 1000, 3)} mA
                        </text>
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          fill={b.closed ? '#34d399' : '#fbbf24'}
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          S{i + 1}: {b.closed ? 'Closed' : 'OPEN'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {(topology === 'mixed-series-parallel' || topology === 'mixed-dual-parallel') && (
                <g>
                  <line
                    x1="155"
                    y1="45"
                    x2="675"
                    y2="45"
                    stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                    strokeWidth="2.5"
                  />
                  <line
                    x1="675"
                    y1="45"
                    x2="675"
                    y2="265"
                    stroke={solution.isCircuitComplete ? '#38bdf8' : '#475569'}
                    strokeWidth="2.5"
                  />
                  {solution.branches.map((b, i) => {
                    const count = solution.branches.length;
                    const x = 195 + (i * 440) / Math.max(1, count - 1);
                    const y = i % 2 === 1 ? 115 : 185;
                    const active = b.closed && b.current > 0;
                    return (
                      <g
                        key={b.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => toggleBranchSwitch(i)}
                        className="cursor-pointer"
                      >
                        <line
                          x1="0"
                          y1={45 - y}
                          x2="0"
                          y2={265 - y}
                          stroke={active ? '#38bdf8' : '#475569'}
                          strokeWidth="2"
                        />
                        <rect
                          x="-42"
                          y="-32"
                          width="84"
                          height="64"
                          rx="7"
                          fill="#0f172a"
                          stroke={active ? '#22d3ee' : '#f59e0b'}
                          strokeWidth="2"
                        />
                        <text x="0" y="-12" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                          {b.label} = {b.resistance} Ω
                        </text>
                        <text x="0" y="4" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="monospace">
                          {formatNumber(b.voltageDrop, 3)} V · {formatNumber(b.current * 1000, 3)} mA
                        </text>
                        <text
                          x="0"
                          y="20"
                          textAnchor="middle"
                          fill={b.closed ? '#34d399' : '#fbbf24'}
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          S{i + 1}: {b.closed ? 'Closed' : 'OPEN'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Per-Resistor Branch Telemetry Table */}
          <div className="border-t border-line px-5 py-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wider text-muted uppercase">
                Branch Current, Voltage Drop & Power Distribution
              </h3>
              <span className="font-mono text-xs text-muted">
                All-Series R = {formatNumber(solution.allSeriesEquivalent, 4)} Ω · All-Parallel R ={' '}
                {formatNumber(solution.allParallelEquivalent, 4)} Ω
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[11px] text-muted">
                    <th className="py-2 pr-3">Branch</th>
                    <th className="px-3 py-2">Switch</th>
                    <th className="px-3 py-2 font-mono">Rᵢ (Ω)</th>
                    <th className="px-3 py-2 font-mono">Current Iᵢ</th>
                    <th className="px-3 py-2 font-mono">Drop ΔVᵢ (V)</th>
                    <th className="px-3 py-2 font-mono">Power Pᵢ (W)</th>
                    <th className="py-2 pl-3 font-mono">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {solution.branches.map((b, idx) => (
                    <tr key={b.id}>
                      <td className="py-2 pr-3 font-semibold text-fg">{b.label}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleBranchSwitch(idx)}
                          className="inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg hover:border-accent"
                        >
                          <Power className="size-3" />
                          {b.closed ? 'Closed' : 'Open'}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">{formatNumber(b.resistance, 4)}</td>
                      <td className="px-3 py-2 font-mono text-accent">
                        {formatNumber(b.current * 1000, 3)} mA
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">
                        {formatNumber(b.voltageDrop, 3)} V
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">
                        {formatQuantity(b.power, 'W', 3)}
                      </td>
                      <td className="py-2 pl-3 font-mono text-muted">
                        {formatNumber(b.powerSharePercent, 3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Conservation Checks */}
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] text-muted">Equivalent R_eq</p>
                <p className="font-mono text-xs font-semibold text-fg">
                  {Number.isFinite(solution.equivalentResistance)
                    ? `${formatNumber(solution.equivalentResistance, 4)} Ω`
                    : '∞ Ω'}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] text-muted">Source current I_total</p>
                <p className="font-mono text-xs font-semibold text-accent">
                  {formatNumber(solution.totalCurrent * 1000, 4)} mA
                </p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] text-muted">Total power P_total</p>
                <p className="font-mono text-xs font-semibold text-fg">
                  {formatQuantity(solution.totalPower, 'W', 4)}
                </p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2/40 p-2.5">
                <p className="text-[11px] text-muted">KCL & KVL Conservation</p>
                <p className="font-mono text-xs font-semibold text-emerald-400">
                  ΔI = {formatNumber(solution.kclResidual, 2)} A · ΔV ={' '}
                  {formatNumber(solution.kvlResidual, 2)} V
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Right Column: Controls & Presets */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Network Builder Controls"
              description="Configure 2 to 5 resistors, battery voltage, and individual resistances."
              actions={
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={addResistor}
                    disabled={resistors.length >= 5}
                  >
                    <Plus className="size-3.5" />
                    Add R ({resistors.length}/5)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={removeLastResistor}
                    disabled={resistors.length <= 2}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              }
            />

            <div className="mt-4 space-y-3.5">
              <Slider
                label="Battery source voltage V_s"
                value={sourceVoltage}
                min={0}
                max={24}
                step={0.5}
                unit="V"
                onChange={setSourceVoltage}
              />

              {resistors.map((r, idx) => (
                <Slider
                  key={r.id}
                  label={`Resistor ${r.label} (${r.closed ? 'Closed' : 'Open'})`}
                  value={r.resistance}
                  min={10}
                  max={1000}
                  step={10}
                  unit="Ω"
                  onChange={(val) => updateResistorValue(idx, val)}
                />
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset(NETWORK_PRESETS[0])}
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  variant={savedNotice ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-1 justify-center"
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
              title="Circuit Presets"
              description="Standard series dividers, parallel splitters, and combinational networks."
            />
            <div className="mt-3 grid gap-2">
              {NETWORK_PRESETS.map((preset) => (
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

      {/* Synchronized Network Graphs */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Network Comparison & Branch Characteristics
            </h3>
            <p className="text-xs text-muted">
              Compare the active topology against pure series and pure parallel equivalents of the
              same resistors.
            </p>
          </div>
          <SegmentedControl
            label="Network graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'vi-comparison' && (
            <PlotChart
              data={graphData}
              xKey="v"
              xLabel="Source Voltage V_s (V)"
              yLabel="Total Current I (mA)"
              series={[
                { key: 'activeCurrentMa', label: `Active (${topology}) I(V_s) (mA)`, color: '#38bdf8' },
                { key: 'allSeriesCurrentMa', label: 'Pure Series Equivalent (mA)', color: '#fbbf24', dashed: true },
                { key: 'allParallelCurrentMa', label: 'Pure Parallel Equivalent (mA)', color: '#34d399', dashed: true },
              ]}
            />
          )}

          {plotTab === 'branch-voltage' && (
            <PlotChart
              data={graphData}
              xKey="v"
              xLabel="Source Voltage V_s (V)"
              yLabel="Branch Voltage Drop ΔVᵢ (V)"
              series={[
                { key: 'v1', label: 'ΔV₁ across R₁ (V)', color: '#38bdf8' },
                { key: 'v2', label: 'ΔV₂ across R₂ (V)', color: '#22d3ee' },
                ...(resistors.length >= 3
                  ? [{ key: 'v3', label: 'ΔV₃ across R₃ (V)', color: '#a78bfa' }]
                  : []),
              ]}
            />
          )}

          {plotTab === 'power-curve' && (
            <PlotChart
              data={graphData}
              xKey="v"
              xLabel="Source Voltage V_s (V)"
              yLabel="Total Dissipated Power P (W)"
              series={[
                { key: 'totalPowerW', label: 'Total network power P = V_s² / R_eq (W)', color: '#34d399' },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory & Guided Steps */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Series vs. Parallel Equivalent Resistance
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="R_{\text{series}} = \sum_{i=1}^{N} R_i,\qquad \frac{1}{R_{\text{parallel}}} = \sum_{i=1}^{N} \frac{1}{R_i}"
              />
            </div>
            <ul className="list-disc space-y-1 pl-4 text-muted">
              <li>
                <strong>Series combination</strong>: The same current <MathFormula latex="I" /> flows
                through every resistor, and potential differences add (<MathFormula latex="V_s = \sum I R_i" />).
                Adding a resistor in series <em>increases</em> <MathFormula latex="R_{\text{eq}}" /> above the
                largest individual resistor.
              </li>
              <li>
                <strong>Parallel combination</strong>: Every closed branch shares the same terminal
                voltage <MathFormula latex="V_s" />, and branch currents add (<MathFormula latex="I_{\text{total}} = \sum V_s / R_i" />).
                Adding a branch in parallel provides an additional conducting pathway and{' '}
                <em>reduces</em> <MathFormula latex="R_{\text{eq}}" /> below the smallest individual resistor.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Guided Investigation & Common Misconceptions
            </h3>
          </div>
          <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-fg-soft">
            <ol className="list-decimal space-y-1 pl-4 text-muted">
              <li>
                In <em>Series Chain</em> mode, click switch <MathFormula latex="S_2" /> to open it.
                Observe that opening any single element breaks the entire loop (<MathFormula latex="I = 0\text{ A}" />).
              </li>
              <li>
                Switch to <em>Parallel Bank</em> mode and open <MathFormula latex="S_2" />. Observe that
                the remaining branches continue operating with unchanged voltage and branch current.
              </li>
              <li>
                Compare power dissipation: in series, the <em>largest</em> resistor dissipates the most
                power (<MathFormula latex="P = I^2 R" />), whereas in parallel, the <em>smallest</em>{' '}
                resistor dissipates the most power (<MathFormula latex="P = V^2 / R" />).
              </li>
            </ol>
          </div>
        </Panel>
      </div>
    </div>
  );
}
