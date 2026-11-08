import type { ReactNode } from 'react';
import { CircleCheck, CircleDashed, Signal, SignalHigh, SignalMedium } from 'lucide-react';
import type { Difficulty, ExperimentStatus } from '@/modules/types';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'border-line bg-surface-2 text-muted',
  accent: 'border-accent/25 bg-accent-soft text-accent',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5.5 items-center gap-1 rounded-md border px-1.5 text-[11.5px] font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  return status === 'available' ? (
    <Badge tone="success" icon={<CircleCheck className="size-3" aria-hidden />}>
      Available
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<CircleDashed className="size-3" aria-hidden />}>
      Planned
    </Badge>
  );
}

const DIFFICULTY_META: Record<Difficulty, { label: string; icon: typeof Signal }> = {
  introductory: { label: 'Introductory', icon: SignalMedium },
  intermediate: { label: 'Intermediate', icon: SignalHigh },
  advanced: { label: 'Advanced', icon: Signal },
};

export const difficultyLabel = (d: Difficulty) => DIFFICULTY_META[d].label;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, icon: Icon } = DIFFICULTY_META[difficulty];
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
