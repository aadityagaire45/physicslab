import { useMemo, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { FilterX, Search } from 'lucide-react';
import { CATEGORIES, isCategoryId } from '@/data/categories';
import { EXPERIMENTS, queryExperiments } from '@/modules/registry';
import type { CategoryId, Difficulty, ExperimentStatus } from '@/modules/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ExperimentCard } from '@/components/common/ExperimentCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { SegmentedControl } from '@/components/controls/SegmentedControl';
import { SelectField } from '@/components/controls/SelectField';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'planned', label: 'Planned' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All difficulties' },
  { value: 'introductory', label: 'Introductory' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export default function ExperimentsPage() {
  useDocumentTitle('Experiments');
  const [params, setParams] = useSearchParams();

  const text = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category: CategoryId | null = isCategoryId(rawCategory) ? rawCategory : null;
  const rawStatus = params.get('status');
  const status: ExperimentStatus | null =
    rawStatus === 'available' || rawStatus === 'planned' ? rawStatus : null;
  const rawDifficulty = params.get('difficulty');
  const difficulty: Difficulty | null =
    rawDifficulty === 'introductory' || rawDifficulty === 'intermediate' || rawDifficulty === 'advanced'
      ? rawDifficulty
      : null;

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const resetFilters = () => setParams({}, { replace: true });

  const results = useMemo(
    () => queryExperiments({ text, category, status, difficulty }),
    [text, category, status, difficulty],
  );

  const availableTotal = EXPERIMENTS.filter((e) => e.status === 'available').length;
  const hasFilters = Boolean(text || category || status || difficulty);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Experiment Catalogue"
        title="Virtual Physics Laboratories"
        description={`${EXPERIMENTS.length} experiments across eight disciplines (${availableTotal} interactive now, ${EXPERIMENTS.length - availableTotal} specified for upcoming phases).`}
      />

      {/* Filter bar */}
      <Panel className="space-y-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={text}
              onChange={(e) => updateParam('q', e.target.value || null)}
              placeholder="Filter by title, concept, equation topic or tag…"
              aria-label="Filter experiments"
              className="h-9.5 w-full rounded-lg border border-line bg-surface-2 pr-3 pl-9 text-sm text-fg placeholder:text-subtle focus:border-accent focus:bg-surface focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SegmentedControl
              label="Availability filter"
              value={status ?? 'all'}
              options={STATUS_OPTIONS}
              onChange={(val) => updateParam('status', val)}
            />
            <div className="w-44">
              <SelectField
                label="Difficulty"
                hideLabel
                value={difficulty ?? 'all'}
                options={DIFFICULTY_OPTIONS}
                onChange={(val) => updateParam('difficulty', val)}
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} icon={<FilterX className="size-3.5" aria-hidden />}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Laboratory category">
          <button
            type="button"
            onClick={() => updateParam('category', null)}
            className={cn(
              'h-7.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
              category === null
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-line bg-surface-2 text-muted hover:text-fg',
            )}
          >
            All laboratories ({EXPERIMENTS.length})
          </button>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => updateParam('category', active ? null : c.id)}
                style={{ '--cat': c.color } as CSSProperties}
                className={cn(
                  'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
                  active
                    ? 'border-line-strong bg-surface text-fg shadow-xs'
                    : 'border-line bg-surface-2/60 text-muted hover:text-fg',
                )}
              >
                <span className="cat-strip size-2 rounded-full" aria-hidden />
                {c.name}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>
          Showing <strong className="font-semibold text-fg">{results.length}</strong> of {EXPERIMENTS.length} experiments
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<FilterX className="size-5" aria-hidden />}
          title="No experiments match these filters"
          description="Try clearing the search query or switching to All laboratories."
          action={
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset all filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((experiment) => (
            <ExperimentCard key={experiment.slug} experiment={experiment} />
          ))}
        </div>
      )}
    </div>
  );
}
