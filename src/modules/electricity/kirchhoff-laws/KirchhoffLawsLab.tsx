import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Compass, Info, NotebookPen, RotateCcw } from 'lucide-react';
import {
  solveTwoLoopKirchhoffCircuit,
  type KirchhoffCircuitParams,
  type LoopTraversalDirection,
} from '@/engine/physics/electricity';
import { formatNumber } from '@/engine/units/format';
import { useNotebookStore } from '@/store/notebookStore';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { Slider } from '@/components/controls/Slider';
import { Toggle } from '@/components/controls/Toggle';
import { PlotChart } from '@/components/graphs/PlotChart';

const LOOP_DIRECTIONS = [
  { value: 'clockwise', label: 'Clockwise (CW)' },
  { value: 'counter-clockwise', label: 'Counter-CW (CCW)' },
] as const;

const PLOT_TABS = [
  { value: 'emf-sweep', label: 'Branch Currents vs E₁' },
  { value: 'r2-sweep', label: 'Currents vs Center R₂' },
] as const;

type PlotTab = (typeof PLOT_TABS)[number]['value'];

interface KirchhoffPreset {
  id: string;
  label: string;
  sub: string;
  params: KirchhoffCircuitParams;
}

const KIRCHHOFF_PRESETS: readonly KirchhoffPreset[] = [
  {
    id: 'classic-dual-battery',
    label: 'Classic Dual-Battery Two-Loop Network',
    sub: 'E₁ = 12 V, E₂ = 0 V, E₃ = 6 V, R₁ = 4 Ω, R₂ = 6 Ω, R₃ = 3 Ω (V_A = 6.67 V charges E₃)',
    params: { e1: 12, e2: 0, e3: 6, r1: 4, r2: 6, r3: 3 },
  },
  {
    id: 'symmetric-opposing',
    label: 'Symmetric Twin Sources Sharing R₂',
    sub: 'E₁ = 10 V, E₂ = 0 V, E₃ = 10 V, R₁ = 5 Ω, R₂ = 10 Ω, R₃ = 5 Ω → I₃ < 0 (both feed R₂)',
    params: { e1: 10, e2: 0, e3: 10, r1: 5, r2: 10, r3: 5 },
  },
  {
    id: 'single-source-divider',
    label: 'Single Source Feeding Parallel Branches (E₃ = 0 V)',
    sub: 'E₁ = 15 V, E₂ = 0 V, E₃ = 0 V, R₁ = 3 Ω, R₂ = 6 Ω, R₃ = 6 Ω → All I_k > 0',
    params: { e1: 15, e2: 0, e3: 0, r1: 3, r2: 6, r3: 6 },
  },
  {
    id: 'three-emf-network',
    label: 'Three-EMF Active Bridge Network',
    sub: 'E₁ = 18 V, E₂ = 4 V, E₃ = 12 V, R₁ = 6 Ω, R₂ = 4 Ω, R₃ = 8 Ω',
    params: { e1: 18, e2: 4, e3: 12, r1: 6, r2: 4, r3: 8 },
  },
] as const;

export default function KirchhoffLawsLab() {
  const [params, setParams] = useState<KirchhoffCircuitParams>(KIRCHHOFF_PRESETS[0].params);
  const [loop1Direction, setLoop1Direction] = useState<LoopTraversalDirection>('clockwise');
  const [loop2Direction, setLoop2Direction] = useState<LoopTraversalDirection>('clockwise');
  const [guidedMode, setGuidedMode] = useState(true);
  const [guidedStep, setGuidedStep] = useState<1 | 2 | 3 | 4>(1);
  const [plotTab, setPlotTab] = useState<PlotTab>('emf-sweep');
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
      solveTwoLoopKirchhoffCircuit({
        ...params,
        loop1Direction,
        loop2Direction,
      }),
    [params, loop1Direction, loop2Direction],
  );

  const updateParams = (patch: Partial<KirchhoffCircuitParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  };

  const emfSweepData = useMemo(() => {
    const pts = [];
    for (let e1Val = 0; e1Val <= 24; e1Val += 1) {
      const sol = solveTwoLoopKirchhoffCircuit({ ...params, e1: e1Val });
      pts.push({
        e1: e1Val,
        i1: Number(sol.i1.toFixed(4)),
        i2: Number(sol.i2.toFixed(4)),
        i3: Number(sol.i3.toFixed(4)),
        vab: Number(sol.junctionVoltageAB.toFixed(4)),
      });
    }
    return pts;
  }, [params]);

  const r2SweepData = useMemo(() => {
    const pts = [];
    for (let r2Val = 1; r2Val <= 25; r2Val += 1) {
      const sol = solveTwoLoopKirchhoffCircuit({ ...params, r2: r2Val });
      pts.push({
        r2: r2Val,
        i1: Number(sol.i1.toFixed(4)),
        i2: Number(sol.i2.toFixed(4)),
        i3: Number(sol.i3.toFixed(4)),
      });
    }
    return pts;
  }, [params]);

  const logToNotebook = () => {
    addEntry({
      experimentSlug: 'kirchhoff-laws',
      title: `Kirchhoff Network — E₁=${params.e1} V, E₂=${params.e2 ?? 0} V, E₃=${params.e3} V`,
      body: `Solved 2-loop, 3-branch DC network via KCL at Junction A and KVL around Loop 1 (${loop1Direction}) and Loop 2 (${loop2Direction}). Node voltage V_AB = ${formatNumber(solution.junctionVoltageAB, 4)} V.`,
      measurements: [
        {
          label: 'Branch 1 current I₁',
          value: `${formatNumber(solution.i1, 4)} A (${solution.branches[0].actualDirectionLabel})`,
        },
        {
          label: 'Branch 2 current I₂',
          value: `${formatNumber(solution.i2, 4)} A (${solution.branches[1].actualDirectionLabel})`,
        },
        {
          label: 'Branch 3 current I₃',
          value: `${formatNumber(solution.i3, 4)} A (${solution.branches[2].actualDirectionLabel})`,
        },
        { label: 'Junction voltage V_AB', value: `${formatNumber(solution.junctionVoltageAB, 4)} V` },
        { label: 'KCL residual |I₁ − I₂ − I₃|', value: `${formatNumber(solution.kclResidual, 3)} A` },
        {
          label: 'KVL residuals (L1, L2)',
          value: `${formatNumber(solution.kvlLoop1Residual, 3)} V, ${formatNumber(solution.kvlLoop2Residual, 3)} V`,
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

  const anyReversed = solution.branches.some((b) => b.isReversedFromAssumed);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left Column: Multi-Loop DC Schematic, Guided Solver & Branch Table */}
        <Panel className="flex flex-col overflow-hidden">
          <PanelHeader
            title="Two-Loop Kirchhoff Network (KCL & KVL)"
            description="Junction A (top) and reference Junction B (bottom, 0 V). Assumed currents: I₁ enters A; I₂ and I₃ leave A."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  KCL Residual: {formatNumber(solution.kclResidual, 2)} A
                </Badge>
                {anyReversed && (
                  <Badge tone="warning">
                    Negative Current Detected (Opposite to Assumed Arrow)
                  </Badge>
                )}
              </div>
            }
          />

          {/* Interactive Two-Loop Schematic */}
          <div className="bg-slate-950 px-4 py-5">
            <svg
              viewBox="0 0 740 340"
              className="mx-auto block w-full max-w-[740px]"
              role="img"
              aria-label="Interactive two-loop Kirchhoff circuit diagram with Junctions A and B, three branches, and selectable loop directions"
            >
              {/* Outer & Center Branch Wires */}
              <g stroke="#38bdf8" strokeWidth="3" fill="none">
                {/* Left Loop 1 perimeter */}
                <path d="M 140 50 L 370 50 L 600 50" />
                <path d="M 140 50 L 140 290" />
                <path d="M 370 50 L 370 290" />
                <path d="M 600 50 L 600 290" />
                <path d="M 140 290 L 370 290 L 600 290" />
              </g>

              {/* Top Junction A & Bottom Junction B */}
              <g transform="translate(370, 50)">
                <circle cx="0" cy="0" r="7" fill="#22d3ee" stroke="#0f172a" strokeWidth="2" />
                <text x="0" y="-16" textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="700">
                  Junction A (V_A = {formatNumber(solution.junctionVoltageAB, 3)} V)
                </text>
              </g>
              <g transform="translate(370, 290)">
                <circle cx="0" cy="0" r="7" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
                <text x="0" y="24" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">
                  Reference Junction B (V_B = 0 V)
                </text>
              </g>

              {/* Loop 1 Traversal Indicator at (255, 170) */}
              <g transform="translate(255, 170)">
                <circle
                  cx="0"
                  cy="0"
                  r="42"
                  fill="rgba(15, 23, 42, 0.78)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text x="0" y="-6" textAnchor="middle" fill="#38bdf8" fontSize="11.5" fontWeight="700">
                  Loop 1
                </text>
                <text x="0" y="11" textAnchor="middle" fill="#cbd5e1" fontSize="10">
                  {loop1Direction === 'clockwise' ? '↻ Clockwise' : '↺ Counter-CW'}
                </text>
              </g>

              {/* Loop 2 Traversal Indicator at (485, 170) */}
              <g transform="translate(485, 170)">
                <circle
                  cx="0"
                  cy="0"
                  r="42"
                  fill="rgba(15, 23, 42, 0.78)"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />
                <text x="0" y="-6" textAnchor="middle" fill="#a78bfa" fontSize="11.5" fontWeight="700">
                  Loop 2
                </text>
                <text x="0" y="11" textAnchor="middle" fill="#cbd5e1" fontSize="10">
                  {loop2Direction === 'clockwise' ? '↻ Clockwise' : '↺ Counter-CW'}
                </text>
              </g>

              {/* Branch 1 (Left at x = 140): R1 top, E1 bottom */}
              <g transform="translate(140, 115)">
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="6"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                  R₁ = {params.r1} Ω
                </text>
                <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  ΔV₁ = {formatNumber(solution.branches[0].resistorVoltageDrop, 3)} V
                </text>
              </g>
              <g transform="translate(140, 225)">
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="6"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <text x="-26" y="-8" fill="#fbbf24" fontSize="11" fontWeight="700">
                  +
                </text>
                <text x="-26" y="16" fill="#94a3b8" fontSize="11" fontWeight="700">
                  −
                </text>
                <text x="4" y="4" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="700">
                  E₁ = {params.e1} V
                </text>
              </g>
              {/* Branch 1 Current Label */}
              <text x="200" y="38" fill="#22d3ee" fontSize="11" fontWeight="700" fontFamily="monospace">
                I₁ = {formatNumber(solution.i1, 3)} A (Assumed → A)
              </text>

              {/* Branch 2 (Center at x = 370): R2 top, E2 bottom */}
              <g transform="translate(370, 125)">
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="6"
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth="2"
                />
                <text x="0" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                  R₂ = {params.r2} Ω
                </text>
                <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  ΔV₂ = {formatNumber(solution.branches[1].resistorVoltageDrop, 3)} V
                </text>
              </g>
              <g transform="translate(370, 225)">
                <rect
                  x="-36"
                  y="-22"
                  width="72"
                  height="44"
                  rx="6"
                  fill="#0f172a"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text x="0" y="4" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">
                  E₂ = {params.e2 ?? 0} V
                </text>
              </g>
              <text x="370" y="84" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="700" fontFamily="monospace">
                I₂ = {formatNumber(solution.i2, 3)} A (↓)
              </text>

              {/* Branch 3 (Right at x = 600): R3 top, E3 bottom */}
              <g transform="translate(600, 115)">
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="6"
                  fill="#0f172a"
                  stroke="#a78bfa"
                  strokeWidth="2"
                />
                <text x="0" y="-4" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                  R₃ = {params.r3} Ω
                </text>
                <text x="0" y="12" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  ΔV₃ = {formatNumber(solution.branches[2].resistorVoltageDrop, 3)} V
                </text>
              </g>
              <g transform="translate(600, 225)">
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="6"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <text x="-26" y="-8" fill="#fbbf24" fontSize="11" fontWeight="700">
                  +
                </text>
                <text x="-26" y="16" fill="#94a3b8" fontSize="11" fontWeight="700">
                  −
                </text>
                <text x="4" y="4" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="700">
                  E₃ = {params.e3} V
                </text>
              </g>
              <text
                x="535"
                y="38"
                textAnchor="end"
                fill={solution.i3 < 0 ? '#fbbf24' : '#a78bfa'}
                fontSize="11"
                fontWeight="700"
                fontFamily="monospace"
              >
                I₃ = {formatNumber(solution.i3, 3)} A ({solution.i3 < 0 ? 'Reversed ↑' : 'Assumed ↓'})
              </text>
            </svg>
          </div>

          {/* Loop Direction Controls & Guided Step-by-Step Solver */}
          <div className="space-y-3 border-t border-line bg-surface-2/50 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                  label="Loop 1 direction"
                  size="sm"
                  value={loop1Direction}
                  options={LOOP_DIRECTIONS}
                  onChange={setLoop1Direction}
                />
                <SegmentedControl
                  label="Loop 2 direction"
                  size="sm"
                  value={loop2Direction}
                  options={LOOP_DIRECTIONS}
                  onChange={setLoop2Direction}
                />
              </div>
              <Toggle
                label="Guided solving steps"
                checked={guidedMode}
                onChange={setGuidedMode}
              />
            </div>

            {guidedMode && (
              <div className="rounded-lg border border-line bg-surface p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                  <span className="font-semibold text-fg">
                    Guided Kirchhoff Solver — Step {guidedStep} of 4
                  </span>
                  <div className="flex gap-1.5">
                    {([1, 2, 3, 4] as const).map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setGuidedStep(step)}
                        className={`rounded px-2.5 py-0.5 text-[11px] font-semibold ${
                          guidedStep === step
                            ? 'bg-accent text-white'
                            : 'border border-line bg-surface-2 text-fg-soft'
                        }`}
                      >
                        Step {step}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-fg-soft">
                  {guidedStep === 1 && (
                    <>
                      <p className="font-semibold text-fg">
                        Step 1 — Kirchhoff’s Current Law (KCL) at Top Junction A:
                      </p>
                      <p>
                        Assign reference arrows: <MathFormula latex="I_1" /> enters Junction A from
                        Branch 1, while <MathFormula latex="I_2" /> and <MathFormula latex="I_3" />{' '}
                        leave Junction A:
                      </p>
                      <p className="font-mono text-accent">
                        {solution.kclEquationText} ⇒ ({formatNumber(solution.i1, 4)}) − (
                        {formatNumber(solution.i2, 4)}) − ({formatNumber(solution.i3, 4)}) ={' '}
                        {formatNumber(solution.kclResidual, 3)} A
                      </p>
                    </>
                  )}
                  {guidedStep === 2 && (
                    <>
                      <p className="font-semibold text-fg">
                        Step 2 — Kirchhoff’s Voltage Law (KVL) around Loop 1 ({loop1Direction}):
                      </p>
                      <p className="font-mono text-accent">
                        {solution.kvlLoop1EquationText} (Residual ={' '}
                        {formatNumber(solution.kvlLoop1Residual, 3)} V)
                      </p>
                      <p className="text-muted">
                        Notice that flipping Loop 1 between CW and CCW multiplies the entire KVL
                        equation by −1 without changing the physical branch currents!
                      </p>
                    </>
                  )}
                  {guidedStep === 3 && (
                    <>
                      <p className="font-semibold text-fg">
                        Step 3 — Kirchhoff’s Voltage Law (KVL) around Loop 2 ({loop2Direction}):
                      </p>
                      <p className="font-mono text-accent">
                        {solution.kvlLoop2EquationText} (Residual ={' '}
                        {formatNumber(solution.kvlLoop2Residual, 3)} V)
                      </p>
                    </>
                  )}
                  {guidedStep === 4 && (
                    <>
                      <p className="font-semibold text-fg">
                        Step 4 — Simultaneous Linear System Solution & Sign Interpretation:
                      </p>
                      <p className="font-mono text-accent">
                        I₁ = {formatNumber(solution.i1, 4)} A, I₂ = {formatNumber(solution.i2, 4)} A,
                        I₃ = {formatNumber(solution.i3, 4)} A, V_AB ={' '}
                        {formatNumber(solution.junctionVoltageAB, 4)} V
                      </p>
                      <p className="text-muted">
                        Any branch with a <strong>negative calculated current</strong> (<MathFormula latex="I_k < 0" />)
                        simply carries conventional current in the direction{' '}
                        <strong>opposite to the assumed arrow</strong>.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Branch Analysis & Sign Comparison Table */}
          <div className="border-t border-line px-5 py-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[11px] text-muted">
                    <th className="py-2 pr-3">Branch</th>
                    <th className="px-3 py-2 font-mono">Signed I_k</th>
                    <th className="px-3 py-2 font-mono">|I_k| R_k Drop</th>
                    <th className="px-3 py-2 font-mono">I_k² R_k Heat</th>
                    <th className="py-2 pl-3">Actual Conventional Current Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {solution.branches.map((b) => (
                    <tr key={b.branchId}>
                      <td className="py-2 pr-3 font-semibold text-fg">{b.label}</td>
                      <td
                        className={`px-3 py-2 font-mono font-semibold ${
                          b.isReversedFromAssumed ? 'text-amber-400' : 'text-accent'
                        }`}
                      >
                        {formatNumber(b.signedCurrent, 4)} A
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">
                        {formatNumber(b.resistorVoltageDrop, 4)} V
                      </td>
                      <td className="px-3 py-2 font-mono text-fg">
                        {formatNumber(b.resistorPower, 4)} W
                      </td>
                      <td className="py-2 pl-3 text-fg-soft">
                        {b.actualDirectionLabel}
                        {b.isReversedFromAssumed && (
                          <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            Opposite to assumed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* Right Column: Controls & Presets */}
        <div className="space-y-6">
          <Panel className="p-5">
            <PanelHeader
              title="Multi-Loop Parameters"
              description="Adjust branch EMFs (E₁, E₂, E₃) and resistances (R₁, R₂, R₃)."
            />
            <div className="mt-4 space-y-3.5">
              <Slider
                label="Left branch EMF E₁"
                value={params.e1}
                min={0}
                max={24}
                step={0.5}
                unit="V"
                onChange={(e1) => updateParams({ e1 })}
              />
              <Slider
                label="Center branch EMF E₂"
                value={params.e2 ?? 0}
                min={0}
                max={24}
                step={0.5}
                unit="V"
                onChange={(e2) => updateParams({ e2 })}
              />
              <Slider
                label="Right branch EMF E₃"
                value={params.e3}
                min={0}
                max={24}
                step={0.5}
                unit="V"
                onChange={(e3) => updateParams({ e3 })}
              />
              <Slider
                label="Left resistance R₁"
                value={params.r1}
                min={1}
                max={30}
                step={0.5}
                unit="Ω"
                onChange={(r1) => updateParams({ r1 })}
              />
              <Slider
                label="Center shared resistance R₂"
                value={params.r2}
                min={1}
                max={30}
                step={0.5}
                unit="Ω"
                onChange={(r2) => updateParams({ r2 })}
              />
              <Slider
                label="Right resistance R₃"
                value={params.r3}
                min={1}
                max={30}
                step={0.5}
                unit="Ω"
                onChange={(r3) => updateParams({ r3 })}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setParams(KIRCHHOFF_PRESETS[0].params)}
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
              title="Kirchhoff Network Presets"
              description="Explore current reversal, battery charging, and balanced bridges."
            />
            <div className="mt-3 grid gap-2">
              {KIRCHHOFF_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setParams({ ...preset.params })}
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

      {/* Synchronized Parameter-Sweep Graphs */}
      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-fg">
              Branch Current Sensitivity & Zero-Crossing Analysis
            </h3>
            <p className="text-xs text-muted">
              Observe where branch current I₃ crosses zero as E₁ or R₂ varies, reversing physical
              current direction.
            </p>
          </div>
          <SegmentedControl
            label="Kirchhoff graph tab"
            size="sm"
            value={plotTab}
            options={PLOT_TABS}
            onChange={setPlotTab}
          />
        </div>

        <div className="mt-4">
          {plotTab === 'emf-sweep' && (
            <PlotChart
              data={emfSweepData}
              xKey="e1"
              xLabel="Left Source EMF E₁ (V)"
              yLabel="Branch Current I (A)"
              zeroLine
              series={[
                { key: 'i1', label: 'Branch 1 current I₁ (A)', color: '#38bdf8' },
                { key: 'i2', label: 'Center branch current I₂ (A)', color: '#34d399' },
                { key: 'i3', label: 'Right branch current I₃ (A)', color: '#fbbf24' },
              ]}
            />
          )}

          {plotTab === 'r2-sweep' && (
            <PlotChart
              data={r2SweepData}
              xKey="r2"
              xLabel="Center Shared Resistance R₂ (Ω)"
              yLabel="Branch Current I (A)"
              zeroLine
              series={[
                { key: 'i1', label: 'Branch 1 current I₁ (A)', color: '#38bdf8' },
                { key: 'i2', label: 'Center branch current I₂ (A)', color: '#34d399' },
                { key: 'i3', label: 'Right branch current I₃ (A)', color: '#fbbf24' },
              ]}
            />
          )}
        </div>
      </Panel>

      {/* Educational Theory & Negative Current Explanation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Kirchhoff’s Current & Voltage Laws (KCL & KVL)
            </h3>
          </div>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-fg-soft">
            <div className="rounded-lg border border-line bg-surface-2/40 p-3">
              <MathFormula
                display
                latex="\sum I_{\text{in}} = \sum I_{\text{out}},\qquad \sum_{\text{closed loop}} \Delta V = 0"
              />
            </div>
            <ul className="list-disc space-y-1 pl-4 text-muted">
              <li>
                <strong>Kirchhoff’s Current Law (KCL)</strong> expresses conservation of electric
                charge at any junction: charge cannot accumulate at a node, so the algebraic sum of
                currents entering equals the sum leaving.
              </li>
              <li>
                <strong>Kirchhoff’s Voltage Law (KVL)</strong> expresses conservation of energy for
                the electrostatic field (<MathFormula latex="\oint \vec{E}\cdot d\vec{\ell} = 0" />):
                the net change in electric potential around any closed loop is identically zero.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-accent" />
            <h3 className="text-sm font-semibold text-fg">
              Why Can a Calculated Branch Current Be Negative?
            </h3>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
            <p>
              Before solving a multi-loop network, we do not always know by inspection which way
              current flows in every branch. We therefore choose an arbitrary{' '}
              <strong>assumed reference arrow</strong> for each unknown current (<MathFormula latex="I_1, I_2, I_3" />)
              and apply KCL and KVL consistently with those arrows.
            </p>
            <p>
              If the linear solver returns <MathFormula latex="I_3 = -0.333\text{ A}" />, the
              magnitude <MathFormula latex="0.333\text{ A}" /> is physically exact, and the minus
              sign simply tells us that the <strong>actual conventional current flows opposite to our
              assumed arrow</strong> (for example, upward into <MathFormula latex="E_3" />, recharging
              that source).
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
