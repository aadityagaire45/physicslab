import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@/data/categories';
import { checkChallengeAnswer, generateChallenge } from '@/data/challenges';
import { DIODE_COMPLIANCE_LIMIT_MA, GRAPH_MODELS } from '@/data/graphModels';
import { searchLaboratory } from '@/data/searchIndex';
import { projectileSummary } from '@/engine/physics/kinematics';
import { formatNumber } from '@/engine/units/format';
import { EXPERIMENTS, getCatalogueStats, getExperiment, queryExperiments } from '@/modules/registry';

describe('experiment registry & search', () => {
  it('registers all 8 laboratory categories with unique experiment slugs and distinct equation labels per experiment', () => {
    expect(CATEGORIES).toHaveLength(8);
    const slugs = new Set(EXPERIMENTS.map((e) => e.slug));
    expect(slugs.size).toBe(EXPERIMENTS.length);

    for (const exp of EXPERIMENTS) {
      const labels = exp.equations.map((eq) => eq.label);
      expect(new Set(labels).size).toBe(labels.length);
    }

    const stats = getCatalogueStats();
    expect(stats).toHaveLength(8);
    for (const s of stats) expect(s.total).toBeGreaterThan(0);
  });

  it('distinguishes available and planned experiments and filters accurately', () => {
    const available = queryExperiments({ status: 'available' });
    const planned = queryExperiments({ status: 'planned' });
    expect(available.map((e) => e.slug)).toEqual([
      'projectile-motion',
      'simple-pendulum',
      'spring-mass-oscillator',
      'inclined-plane-friction',
      'collisions-momentum',
      'orbital-motion',
      'ohms-law',
      'series-parallel-circuits',
      'kirchhoff-laws',
      'electrical-power-heating',
      'capacitors',
      'rc-circuits',
    ]);
    expect(available.length + planned.length).toBe(EXPERIMENTS.length);
    expect(getExperiment('projectile-motion')?.status).toBe('available');
    expect(getExperiment('simple-pendulum')?.status).toBe('available');
    expect(getExperiment('spring-mass-oscillator')?.status).toBe('available');
    expect(getExperiment('inclined-plane-friction')?.status).toBe('available');
    expect(getExperiment('collisions-momentum')?.status).toBe('available');
    expect(getExperiment('orbital-motion')?.status).toBe('available');
    expect(getExperiment('ohms-law')?.status).toBe('available');
    expect(getExperiment('series-parallel-circuits')?.status).toBe('available');
    expect(getExperiment('kirchhoff-laws')?.status).toBe('available');
    expect(getExperiment('electrical-power-heating')?.status).toBe('available');
    expect(getExperiment('capacitors')?.status).toBe('available');
    expect(getExperiment('rc-circuits')?.status).toBe('available');
    expect(getExperiment('series-parallel-resistors')?.slug).toBe('series-parallel-circuits');
    expect(getExperiment('rc-circuit')?.slug).toBe('rc-circuits');
    expect(queryExperiments({ text: 'snell optics' }).map((e) => e.slug)).toContain('refraction-snells-law');
  });

  it('ranks title matches in laboratory search', () => {
    const results = searchLaboratory('projectile');
    expect(results[0]?.to).toBe('/experiments/projectile-motion');
  });

  it('generates deterministic, verifiable challenge problems across categories', () => {
    for (const c of CATEGORIES) {
      const p1 = generateChallenge(42, c.id);
      const p2 = generateChallenge(42, c.id);
      expect(p1.category).toBe(c.id);
      expect(p1.answer).toBe(p2.answer);
      expect(checkChallengeAnswer(p1, p1.answer)).toBe(true);
      expect(checkChallengeAnswer(p1, p1.answer * 1.01)).toBe(true);
      expect(checkChallengeAnswer(p1, p1.answer * 1.25 + 10)).toBe(false);
    }
  });

  it('evaluates Graph Studio models with exact analytical projectile summary, regime-aware oscillator envelopes, and diode compliance disclosure', () => {
    const projModel = GRAPH_MODELS.find((m) => m.id === 'projectile')!;
    const projParams = { speed: 23, angleDeg: 37, height: 5, gravity: 9.80665 };
    const projRes = projModel.evaluate(projParams);
    const exact = projectileSummary(projParams);
    expect(projRes.summary).toEqual([
      { label: 'Range R', value: `${formatNumber(exact.range, 4)} m` },
      { label: 'Max height H', value: `${formatNumber(exact.maxHeight, 4)} m` },
      { label: 'Flight time T', value: `${formatNumber(exact.timeOfFlight, 4)} s` },
    ]);

    const oscModel = GRAPH_MODELS.find((m) => m.id === 'damped-oscillator')!;
    const underRes = oscModel.evaluate({ amplitude: 1, mass: 1, springConstant: 12, damping: 0.8 });
    expect(underRes.series.map((s) => s.key)).toEqual(['x', 'envelopePos', 'envelopeNeg']);

    const overRes = oscModel.evaluate({ amplitude: 1, mass: 1, springConstant: 4, damping: 6 });
    expect(overRes.series.map((s) => s.key)).toEqual(['x']);
    expect(overRes.data[0].envelopePos).toBeUndefined();

    const diodeModel = GRAPH_MODELS.find((m) => m.id === 'diode')!;
    const diodeRes = diodeModel.evaluate({ isNano: 20, ideality: 1.0, tempK: 300 });
    expect(diodeRes.summary.some((s) => s.value.includes(`${DIODE_COMPLIANCE_LIMIT_MA} mA`))).toBe(true);
    expect(diodeRes.series[0].label).toContain(`${DIODE_COMPLIANCE_LIMIT_MA} mA compliance`);
  });
});
