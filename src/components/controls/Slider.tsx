import { useId, useState, type CSSProperties } from 'react';
import { clamp } from '@/engine/mathematics/numeric';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Decimal places shown in the numeric field. */
  precision?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}

/**
 * Labelled range slider paired with a numeric input for precise entry.
 * Values are clamped to [min, max] and snapped to the step.
 */
export function Slider({ label, value, min, max, step, unit, precision = 1, onChange, disabled, hint }: SliderProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const fill = ((value - min) / (max - min)) * 100;

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    const snapped = Math.round((raw - min) / step) * step + min;
    onChange(Number.parseFloat(clamp(snapped, min, max).toFixed(10)));
  };

  return (
    <div className={disabled ? 'opacity-50' : undefined}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-fg-soft">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            aria-label={`${label} value`}
            value={draft ?? Number(value.toFixed(precision))}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft !== null) commit(Number.parseFloat(draft));
              setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setDraft(null);
            }}
            className="tabular h-7 w-18 rounded-md border border-line bg-surface-2 px-2 text-right text-[13px] text-fg focus:border-accent focus:outline-none"
          />
          {unit && <span className="w-9 text-[12px] text-muted">{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => commit(e.target.valueAsNumber)}
        style={{ '--fill': `${fill}%` } as CSSProperties}
      />
      {hint && <p className="mt-1 text-[11.5px] text-subtle">{hint}</p>}
    </div>
  );
}
