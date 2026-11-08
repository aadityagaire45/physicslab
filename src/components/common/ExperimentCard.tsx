import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Clock, FileText } from 'lucide-react';
import { getCategory } from '@/data/categories';
import type { ExperimentDefinition } from '@/modules/types';
import { cn } from '@/utils/cn';
import { DifficultyBadge, StatusBadge } from './Badge';
import { ExperimentGlyph } from './ExperimentGlyph';

interface ExperimentCardProps {
  experiment: ExperimentDefinition;
  compact?: boolean;
}

export function ExperimentCard({ experiment, compact = false }: ExperimentCardProps) {
  const category = getCategory(experiment.category);
  const available = experiment.status === 'available';

  return (
    <Link
      to={`/experiments/${experiment.slug}`}
      style={{ '--cat': category.color } as CSSProperties}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-pop)]',
      )}
      aria-label={`${experiment.title} — ${available ? 'open experiment' : 'view planned experiment brief'}`}
    >
      <div className="lab-grid relative flex h-28 items-center justify-center border-b border-line bg-surface-2/60">
        <span className="absolute inset-x-0 top-0 h-0.5 cat-strip opacity-80" />
        <ExperimentGlyph kind={experiment.glyph} className={cn('h-16 w-28 cat-text', !available && 'opacity-70')} />
        <span className="absolute top-3 right-3">
          <StatusBadge status={experiment.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="cat-text text-[11.5px] font-semibold tracking-wide uppercase">{category.name}</p>
        <h3 className="mt-1 text-[15px] font-semibold tracking-tight text-fg">{experiment.title}</h3>
        {!compact && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{experiment.summary}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex items-center gap-3">
            <DifficultyBadge difficulty={experiment.difficulty} />
            <span className="inline-flex items-center gap-1 text-[12px] text-muted">
              <Clock className="size-3.5" aria-hidden />
              {experiment.durationMinutes} min
            </span>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[12.5px] font-medium transition-colors',
              available ? 'text-accent' : 'text-muted group-hover:text-fg',
            )}
          >
            {available ? (
              <>
                Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </>
            ) : (
              <>
                <FileText className="size-3.5" aria-hidden /> Brief
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
