import { useMemo, useState } from 'react';
import { Download, RotateCcw, Table } from 'lucide-react';
import { GRAPH_MODELS, type GraphModel } from '@/data/graphModels';
import { formatNumber } from '@/engine/units/format';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { downloadTextFile, toCsv } from '@/utils/download';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SelectField } from '@/components/controls/SelectField';
import { Slider } from '@/components/controls/Slider';
import { PlotChart } from '@/components/graphs/PlotChart';

function buildDefaultParams(model: GraphModel): Record<string, number> {
  return Object.fromEntries(model.params.map((p) => [p.key, p.defaultValue]));
}

const MODEL_OPTIONS = GRAPH_MODELS.map((m) => ({
  value: m.id,
  label: `${m.name} (${m.category})`,
}));

export default function GraphStudioPage() {
  useDocumentTitle('Graph Studio');
  const [modelId, setModelId] = useState(GRAPH_MODELS[0].id);
  const model = useMemo(() => GRAPH_MODELS.find((m) => m.id === modelId) ?? GRAPH_MODELS[0], [modelId]);
  const [paramState, setParamState] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(GRAPH_MODELS.map((m) => [m.id, buildDefaultParams(m)])),
  );
  const [showTable, setShowTable] = useState(false);

  const currentParams = paramState[model.id] ?? buildDefaultParams(model);
  const result = useMemo(() => model.evaluate(currentParams), [model, currentParams]);

  const setParam = (key: string, value: number) => {
    setParamState((prev) => ({
      ...prev,
      [model.id]: { ...(prev[model.id] ?? buildDefaultParams(model)), [key]: value },
    }));
  };

  const resetModel = () => {
    setParamState((prev) => ({ ...prev, [model.id]: buildDefaultParams(model) }));
  };

  const exportCsv = () => {
    const columns = [model.xKey, ...result.series.map((s) => s.key)];
    const headers = [model.xLabel, ...result.series.map((s) => s.label)];
    const rows = result.data.map((row) => columns.map((col) => row[col] ?? ''));
    downloadTextFile(`physqora-${model.id}.csv`, toCsv(headers, rows), 'text/csv');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Graph Studio"
        title="Analytical Model Plotter"
        description="Evaluate physical equations directly with the PHYSQORA calculation engine, inspect numerical tables and export CSV data."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTable((s) => !s)}
              icon={<Table className="size-3.5" aria-hidden />}
            >
              {showTable ? 'Hide table' : 'Inspect table'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={exportCsv}
              icon={<Download className="size-3.5" aria-hidden />}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title={model.name}
              description={`${model.category} · ${result.data.length} evaluated points`}
              actions={<MathFormula latex={model.equationLatex} />}
            />
            <div className="p-4">
              <PlotChart
                data={result.data}
                xKey={model.xKey}
                xLabel={model.xLabel}
                yLabel={model.yLabel}
                series={result.series}
                zeroLine={model.zeroLine}
                height={340}
              />
            </div>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-3">
            {result.summary.map((item) => (
              <Panel key={item.label} className="p-4">
                <p className="text-[12px] text-muted">{item.label}</p>
                <p className="tabular mt-1 text-lg font-semibold text-fg">{item.value}</p>
              </Panel>
            ))}
          </div>

          {showTable && (
            <Panel className="overflow-hidden">
              <PanelHeader title="Sampled Data Table" description="Every 5th evaluated sample shown below." />
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="sticky top-0 border-b border-line bg-surface-2 text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">{model.xLabel}</th>
                      {result.series.map((s) => (
                        <th key={s.key} className="px-4 py-2 font-medium">
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular divide-y divide-line">
                    {result.data
                      .filter((_, i) => i % 5 === 0)
                      .map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-1.5 text-fg">{formatNumber(row[model.xKey] ?? Number.NaN, 4)}</td>
                          {result.series.map((s) => (
                            <td key={s.key} className="px-4 py-1.5 text-muted">
                              {row[s.key] === null ? '—' : formatNumber(row[s.key] ?? Number.NaN, 4)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        <Panel>
          <PanelHeader
            title="Model & Parameters"
            actions={
              <Button variant="ghost" size="sm" onClick={resetModel} icon={<RotateCcw className="size-3.5" aria-hidden />}>
                Defaults
              </Button>
            }
          />
          <div className="space-y-5 p-5">
            <SelectField label="Physical model" value={model.id} options={MODEL_OPTIONS} onChange={setModelId} />
            <div className="space-y-4 border-t border-line pt-4">
              {model.params.map((spec) => (
                <Slider
                  key={spec.key}
                  label={spec.label}
                  value={currentParams[spec.key] ?? spec.defaultValue}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  precision={spec.precision}
                  unit={spec.unit}
                  onChange={(val) => setParam(spec.key, val)}
                />
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
