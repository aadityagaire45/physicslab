import { lazy, Suspense, useEffect, useMemo, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BookOpen, ChartSpline, Clock, Compass, FlaskConical } from 'lucide-react';
import { getCategory } from '@/data/categories';
import { getExperiment, getExperimentsByCategory } from '@/modules/registry';
import { useActivityStore } from '@/store/activityStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, DifficultyBadge, StatusBadge } from '@/components/common/Badge';
import { ButtonLink } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ExperimentCard } from '@/components/common/ExperimentCard';
import { ExperimentGlyph } from '@/components/common/ExperimentGlyph';
import { MathFormula } from '@/components/common/MathFormula';
import { SectionHeading } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { PageLoader } from '@/components/layout/PageLoader';

export default function ExperimentPage() {
  const { slug } = useParams<{ slug: string }>();
  const experiment = getExperiment(slug);
  const recordOpen = useActivityStore((s) => s.recordExperimentOpen);

  useDocumentTitle(experiment?.title ?? 'Experiment not found');

  useEffect(() => {
    if (experiment) recordOpen(experiment.slug);
  }, [experiment, recordOpen]);

  const LabComponent = useMemo(
    () => (experiment?.status === 'available' ? lazy(experiment.load) : null),
    [experiment],
  );

  if (!experiment) {
    return (
      <EmptyState
        icon={<Compass className="size-5" aria-hidden />}
        title="Experiment not found"
        description={`No experiment is registered under “${slug ?? ''}”.`}
        action={
          <ButtonLink to="/experiments" variant="primary" size="sm">
            Back to catalogue
          </ButtonLink>
        }
      />
    );
  }

  const category = getCategory(experiment.category);
  const siblings = getExperimentsByCategory(experiment.category).filter((e) => e.slug !== experiment.slug);

  return (
    <div className="space-y-8" style={{ '--cat': category.color } as CSSProperties}>
      <div>
        <Link
          to={`/experiments?category=${category.id}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {category.name} laboratory
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="cat-text text-[12px] font-semibold tracking-wider uppercase">{category.name}</span>
          <StatusBadge status={experiment.status} />
          <DifficultyBadge difficulty={experiment.difficulty} />
          <span className="inline-flex items-center gap-1 text-[12px] text-muted">
            <Clock className="size-3.5" aria-hidden />
            {experiment.durationMinutes} min
          </span>
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{experiment.title}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{experiment.description}</p>
      </div>

      {/* Interactive lab or honest planned specification */}
      {LabComponent ? (
        <Suspense fallback={<PageLoader label="Loading simulation apparatus…" />}>
          <LabComponent />
        </Suspense>
      ) : (
        <Panel className="overflow-hidden">
          <div className="lab-grid flex flex-col items-start justify-between gap-6 border-b border-line bg-surface-2/50 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="cat-tile flex h-16 w-24 shrink-0 items-center justify-center rounded-xl">
                <ExperimentGlyph kind={experiment.glyph} className="h-12 w-20" />
              </div>
              <div>
                <Badge tone="neutral">Planned Experiment Specification</Badge>
                <h2 className="mt-2 text-base font-semibold text-fg">
                  Interactive apparatus scheduled for Phase 2+
                </h2>
                <p className="mt-1 max-w-xl text-[13px] text-muted">
                  PHYSICSLAB does not present placeholder controls as working simulations. Below are the learning
                  objectives and governing equations already implemented in the underlying physics engine.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <ButtonLink
                to="/experiments/projectile-motion"
                variant="primary"
                size="sm"
                icon={<FlaskConical className="size-3.5" aria-hidden />}
              >
                Open Projectile Motion
              </ButtonLink>
              <ButtonLink
                to="/graph-studio"
                variant="secondary"
                size="sm"
                icon={<ChartSpline className="size-3.5" aria-hidden />}
              >
                Plot in Graph Studio
              </ButtonLink>
            </div>
          </div>
        </Panel>
      )}

      {/* Objectives & governing equations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Learning Objectives" icon={<BookOpen className="size-4" aria-hidden />} />
          <ol className="space-y-2.5 p-5 text-[13.5px] leading-relaxed text-fg-soft">
            {experiment.objectives.map((objective, index) => (
              <li key={objective} className="flex gap-3">
                <span className="tabular flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11.5px] font-semibold text-muted">
                  {index + 1}
                </span>
                <span>{objective}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <PanelHeader title="Governing Equations" description="Typeset in SI conventions." />
          <div className="divide-y divide-line">
            {experiment.equations.map((eq) => (
              <div key={`${eq.label}:${eq.latex}`} className="flex flex-col justify-between gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
                <span className="text-[13px] text-muted">{eq.label}</span>
                <MathFormula latex={eq.latex} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {siblings.length > 0 && (
        <section>
          <SectionHeading title={`More in ${category.name}`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.slice(0, 3).map((item) => (
              <ExperimentCard key={item.slug} experiment={item} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
