import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { CheckCircle2, HelpCircle, Shuffle, Trophy, XCircle } from 'lucide-react';
import { CATEGORIES, getCategory } from '@/data/categories';
import { checkChallengeAnswer, generateChallenge } from '@/data/challenges';
import { formatNumber } from '@/engine/units/format';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { CategoryId } from '@/modules/types';
import { useActivityStore } from '@/store/activityStore';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { MathFormula } from '@/components/common/MathFormula';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';

export default function ChallengePage() {
  useDocumentTitle('Challenge Mode');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [seed, setSeed] = useState(101);
  const [input, setInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [verdict, setVerdict] = useState<'correct' | 'incorrect' | null>(null);

  const solved = useActivityStore((s) => s.challengesSolved);
  const attempted = useActivityStore((s) => s.challengesAttempted);
  const currentStreak = useActivityStore((s) => s.currentStreak);
  const bestStreak = useActivityStore((s) => s.bestStreak);
  const recordResult = useActivityStore((s) => s.recordChallengeResult);

  const problem = useMemo(() => generateChallenge(seed, category), [seed, category]);
  const catMeta = getCategory(problem.category);

  const nextProblem = (nextCategory: CategoryId | null = category) => {
    setCategory(nextCategory);
    setSeed((s) => s + 1);
    setInput('');
    setShowHint(false);
    setVerdict(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (verdict !== null) return;
    const numeric = Number.parseFloat(input);
    if (!Number.isFinite(numeric)) return;
    const ok = checkChallengeAnswer(problem, numeric);
    setVerdict(ok ? 'correct' : 'incorrect');
    recordResult(ok);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Challenge Mode"
        title="Quantitative Physics Drills"
        description="Procedurally generated problems graded against the PHYSQORA physics engine within ±2 % relative tolerance."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => nextProblem()}
            icon={<Shuffle className="size-3.5" aria-hidden />}
          >
            New Problem
          </Button>
        }
      />

      {/* Score strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <p className="text-[12px] text-muted">Solved / Attempted</p>
          <p className="tabular mt-1 text-xl font-semibold text-fg">
            {solved} <span className="text-sm font-normal text-muted">/ {attempted}</span>
          </p>
        </Panel>
        <Panel className="p-4">
          <p className="text-[12px] text-muted">Current streak</p>
          <p className="tabular mt-1 text-xl font-semibold text-fg">{currentStreak}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-[12px] text-muted">Best streak</p>
          <p className="tabular mt-1 text-xl font-semibold text-fg">{bestStreak}</p>
        </Panel>
      </div>

      {/* Category selector */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Problem discipline">
        <button
          type="button"
          onClick={() => nextProblem(null)}
          className={cn(
            'h-7.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
            category === null
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-line bg-surface text-muted hover:text-fg',
          )}
        >
          All disciplines
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => nextProblem(c.id)}
            style={{ '--cat': c.color } as CSSProperties}
            className={cn(
              'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
              category === c.id
                ? 'border-line-strong bg-surface text-fg'
                : 'border-line bg-surface-2/60 text-muted hover:text-fg',
            )}
          >
            <span className="cat-strip size-2 rounded-full" aria-hidden />
            {c.name}
          </button>
        ))}
      </div>

      {/* Problem card */}
      <Panel style={{ '--cat': catMeta.color } as CSSProperties}>
        <PanelHeader
          title={problem.title}
          description={`Problem #${problem.seed} · ±2 % tolerance`}
          icon={<Trophy className="size-4" aria-hidden />}
          actions={
            <span className="cat-text text-[12px] font-semibold tracking-wider uppercase">{catMeta.name}</span>
          }
        />

        <div className="space-y-6 p-6">
          <p className="text-[15px] leading-relaxed text-fg">{problem.prompt}</p>

          <div className="rounded-lg border border-line bg-surface-2/60 px-4 py-3">
            <p className="mb-1 text-[11.5px] font-medium text-muted">Relevant relation</p>
            <MathFormula latex={problem.equationLatex} display />
          </div>

          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="challenge-answer" className="mb-1.5 block text-[13px] font-medium text-fg-soft">
                Your numerical answer ({problem.unit})
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="challenge-answer"
                  type="number"
                  step="any"
                  required
                  disabled={verdict !== null}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter value…"
                  className="tabular h-9.5 w-48 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:border-accent focus:outline-none disabled:opacity-60"
                />
                <Badge tone="neutral">{problem.unit}</Badge>
              </div>
            </div>

            {verdict === null ? (
              <>
                <Button type="submit" variant="primary">
                  Check Answer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowHint((h) => !h)}
                  icon={<HelpCircle className="size-4" aria-hidden />}
                >
                  {showHint ? 'Hide hint' : 'Hint'}
                </Button>
              </>
            ) : (
              <Button type="button" variant="primary" onClick={() => nextProblem()}>
                Next Problem →
              </Button>
            )}
          </form>

          {showHint && verdict === null && (
            <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-[13px] text-fg-soft">
              <strong className="font-semibold text-fg">Hint: </strong>
              {problem.hint}
            </p>
          )}

          {verdict !== null && (
            <div
              role="status"
              className={cn(
                'space-y-3 rounded-xl border p-4',
                verdict === 'correct'
                  ? 'border-success/35 bg-success/10'
                  : 'border-danger/35 bg-danger/10',
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {verdict === 'correct' ? (
                  <>
                    <CheckCircle2 className="size-4.5 text-success" aria-hidden />
                    <span className="text-success">Correct within 2 % tolerance</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4.5 text-danger" aria-hidden />
                    <span className="text-danger">
                      Not quite — expected {formatNumber(problem.answer, 4)} {problem.unit}
                    </span>
                  </>
                )}
              </div>
              <div className="rounded-lg border border-line bg-surface px-4 py-3">
                <p className="mb-1 text-[11.5px] font-medium text-muted">Worked calculation</p>
                <MathFormula latex={problem.workedSolutionLatex} display />
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
