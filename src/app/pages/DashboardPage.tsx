import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ChartSpline,
  Clock,
  FlaskConical,
  GraduationCap,
  NotebookPen,
  Search,
  Trophy,
} from 'lucide-react';
import { CATEGORIES, getCategory } from '@/data/categories';
import { EXPERIMENTS, getCatalogueStats, getExperiment } from '@/modules/registry';
import { useActivityStore } from '@/store/activityStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useUiStore } from '@/store/uiStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatRelativeTime } from '@/utils/time';
import { Badge, StatusBadge } from '@/components/common/Badge';
import { Button, ButtonLink } from '@/components/common/Button';
import { CategoryCard } from '@/components/common/CategoryCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ExperimentCard } from '@/components/common/ExperimentCard';
import { Kbd } from '@/components/common/Kbd';
import { MathFormula } from '@/components/common/MathFormula';
import { SectionHeading } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { TrajectoryFamily } from '@/components/graphs/TrajectoryFamily';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const recent = useActivityStore((s) => s.recent);
  const sessions = useActivityStore((s) => s.sessions);
  const challengesSolved = useActivityStore((s) => s.challengesSolved);
  const challengesAttempted = useActivityStore((s) => s.challengesAttempted);
  const bestStreak = useActivityStore((s) => s.bestStreak);
  const entries = useNotebookStore((s) => s.entries);

  const stats = getCatalogueStats();
  const totalExperiments = EXPERIMENTS.length;
  const availableCount = EXPERIMENTS.filter((e) => e.status === 'available').length;
  const featured = EXPERIMENTS.filter((e) => e.featured).slice(0, 6);
  const quickAccess = EXPERIMENTS.filter((e) => e.status === 'available');

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="lab-grid relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-panel)] sm:p-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Interactive Physics Laboratory</Badge>
              <Badge tone="neutral">
                {availableCount} live · {totalExperiments} catalogued
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              THE UNIVERSE, EXPLORED.
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              An interactive virtual physics laboratory where students can explore scientific concepts, conduct
              experiments, visualize physical phenomena, and understand the laws governing our universe.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <ButtonLink
                to="/experiments/projectile-motion"
                variant="primary"
                icon={<FlaskConical className="size-4" aria-hidden />}
              >
                Launch Projectile Motion Lab
              </ButtonLink>
              <ButtonLink to="/experiments" variant="secondary">
                Browse Catalogue
              </ButtonLink>
              <Button
                variant="ghost"
                onClick={() => setSearchOpen(true)}
                icon={<Search className="size-4" aria-hidden />}
              >
                Search <Kbd>Ctrl K</Kbd>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-canvas/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
              <span className="font-medium text-fg-soft">Ballistic family · exact kinematic solution</span>
              <MathFormula latex={String.raw`R = \frac{v_0^2 \sin 2\theta}{g}`} className="text-muted" />
            </div>
            <TrajectoryFamily />
          </div>
        </div>
      </section>

      {/* Quick-access & Activity */}
      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Panel>
          <PanelHeader
            title="Quick-Access Laboratories"
            description="Fully implemented interactive simulations ready to run."
            actions={
              <Link to="/experiments?status=available" className="text-[12.5px] font-medium text-accent hover:underline">
                Filter available
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {quickAccess.map((exp) => {
              const cat = getCategory(exp.category);
              return (
                <div
                  key={exp.slug}
                  style={{ '--cat': cat.color } as CSSProperties}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="cat-text text-[11.5px] font-semibold tracking-wide uppercase">{cat.name}</span>
                      <StatusBadge status={exp.status} />
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-fg">{exp.title}</h3>
                    <p className="mt-1 text-[13px] text-muted">{exp.summary}</p>
                  </div>
                  <ButtonLink
                    to={`/experiments/${exp.slug}`}
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                  >
                    Open Experiment <ArrowRight className="size-3.5" aria-hidden />
                  </ButtonLink>
                </div>
              );
            })}
          </div>
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
            <Link
              to="/graph-studio"
              className="flex items-center gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <ChartSpline className="size-4.5 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold text-fg">Graph Studio</p>
                <p className="text-[11.5px] text-muted">Plot 6 analytical models</p>
              </div>
            </Link>
            <Link
              to="/challenges"
              className="flex items-center gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <Trophy className="size-4.5 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold text-fg">Challenge Mode</p>
                <p className="text-[11.5px] text-muted">Quantitative problem drills</p>
              </div>
            </Link>
            <Link
              to="/learn"
              className="flex items-center gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <GraduationCap className="size-4.5 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-semibold text-fg">Equation Reference</p>
                <p className="text-[11.5px] text-muted">16 core laws & units</p>
              </div>
            </Link>
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <PanelHeader
            title="Scientific Activity Overview"
            description="Stored locally in this browser."
          />
          <dl className="grid flex-1 grid-cols-2 gap-px bg-line">
            <div className="bg-surface p-4">
              <dt className="text-[12px] text-muted">Lab sessions</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-fg">{sessions}</dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle">{recent.length} distinct labs opened</dd>
            </div>
            <div className="bg-surface p-4">
              <dt className="text-[12px] text-muted">Challenges solved</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-fg">
                {challengesSolved}
                <span className="text-sm font-normal text-muted"> / {challengesAttempted}</span>
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle">Best streak: {bestStreak}</dd>
            </div>
            <div className="bg-surface p-4">
              <dt className="text-[12px] text-muted">Notebook entries</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-fg">{entries.length}</dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle">
                <Link to="/notebook" className="text-accent hover:underline">
                  Open notebook
                </Link>
              </dd>
            </div>
            <div className="bg-surface p-4">
              <dt className="text-[12px] text-muted">Catalogue coverage</dt>
              <dd className="tabular mt-1 text-2xl font-semibold text-fg">
                {availableCount}
                <span className="text-sm font-normal text-muted"> / {totalExperiments}</span>
              </dd>
              <dd className="mt-0.5 text-[11.5px] text-subtle">Across 8 laboratories</dd>
            </div>
          </dl>
        </Panel>
      </div>

      {/* Eight laboratory categories */}
      <section>
        <SectionHeading
          title="Laboratory Categories"
          description="Eight physics disciplines, each with its own identity, topics and experiments."
          action={
            <Link to="/experiments" className="text-[13px] font-medium text-accent hover:underline">
              All {totalExperiments} experiments →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => {
            const stat = stats.find((s) => s.category === category.id) ?? { total: 0, available: 0 };
            return (
              <CategoryCard
                key={category.id}
                category={category}
                total={stat.total}
                available={stat.available}
              />
            );
          })}
        </div>
      </section>

      {/* Featured experiments */}
      <section>
        <SectionHeading
          title="Featured Experiments"
          description="Representative experiments from across the curriculum. Planned entries show their full specification."
          action={
            <Link to="/experiments" className="text-[13px] font-medium text-accent hover:underline">
              View catalogue →
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((experiment) => (
            <ExperimentCard key={experiment.slug} experiment={experiment} />
          ))}
        </div>
      </section>

      {/* Recently accessed */}
      <section>
        <SectionHeading
          title="Recently Accessed Experiments"
          description="Your latest laboratory visits in this browser."
        />
        {recent.length === 0 ? (
          <EmptyState
            icon={<Clock className="size-5" aria-hidden />}
            title="No experiments opened yet"
            description="Open an experiment to record measurements and see your history here."
            action={
              <ButtonLink to="/experiments/projectile-motion" variant="primary" size="sm">
                Start with Projectile Motion
              </ButtonLink>
            }
          />
        ) : (
          <Panel className="divide-y divide-line">
            {recent.map((item) => {
              const exp = getExperiment(item.slug);
              if (!exp) return null;
              const cat = getCategory(exp.category);
              return (
                <Link
                  key={item.slug}
                  to={`/experiments/${exp.slug}`}
                  style={{ '--cat': cat.color } as CSSProperties}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="cat-strip size-2 shrink-0 rounded-full" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{exp.title}</p>
                      <p className="text-[12px] text-muted">{cat.name}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={exp.status} />
                    <span className="text-[12px] text-subtle">{formatRelativeTime(item.openedAt)}</span>
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </div>
                </Link>
              );
            })}
          </Panel>
        )}
      </section>

      {/* Recent notebook note shortcut if any */}
      {entries.length > 0 && (
        <Panel className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <NotebookPen className="size-4.5 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium text-fg">Latest note: {entries[0].title}</p>
              <p className="text-[12px] text-muted">Updated {formatRelativeTime(entries[0].updatedAt)}</p>
            </div>
          </div>
          <ButtonLink to="/notebook" size="sm">
            Open Notebook
          </ButtonLink>
        </Panel>
      )}
    </div>
  );
}
