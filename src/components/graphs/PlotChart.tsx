import { memo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/engine/units/format';

export interface PlotSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

export type PlotDatum = Record<string, number | null>;

interface PlotChartProps {
  data: readonly PlotDatum[];
  xKey: string;
  series: readonly PlotSeries[];
  xLabel: string;
  yLabel: string;
  height?: number;
  /** Draw a horizontal reference line at y = 0. */
  zeroLine?: boolean;
}

const axisTick = { fill: 'var(--muted)', fontSize: 11 };
const tickFormatter = (value: number) => formatNumber(value, 3);

/**
 * Line chart with PHYSQORA styling. Animations are disabled: data updates
 * continuously as parameters change, and animating every update wastes CPU
 * on integrated graphics.
 */
export const PlotChart = memo(function PlotChart({
  data,
  xKey,
  series,
  xLabel,
  yLabel,
  height = 280,
  zeroLine = false,
}: PlotChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 640, height }}>
        <LineChart data={data as PlotDatum[]} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={axisTick}
            tickFormatter={tickFormatter}
            stroke="var(--line-strong)"
            label={{ value: xLabel, position: 'insideBottom', offset: -14, fill: 'var(--muted)', fontSize: 12 }}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={tickFormatter}
            stroke="var(--line-strong)"
            width={64}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 4, fill: 'var(--muted)', fontSize: 12, style: { textAnchor: 'middle' } }}
          />
          {zeroLine && <ReferenceLine y={0} stroke="var(--line-strong)" />}
          <Tooltip
            formatter={(value) => (typeof value === 'number' ? formatNumber(value, 4) : String(value ?? ''))}
            labelFormatter={(label) => `${xLabel}: ${typeof label === 'number' ? formatNumber(label, 4) : String(label)}`}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--fg)',
            }}
            labelStyle={{ color: 'var(--muted)' }}
          />
          {series.length > 1 && <Legend verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
