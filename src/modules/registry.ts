/**
 * Central experiment registry.
 *
 * To add an experiment: append its definition to the relevant module's
 * `index.ts`. To make it interactive, set `status: 'available'` and provide a
 * `load` function that lazily imports the lab component. No other part of the
 * application needs to change.
 */
import { CATEGORIES } from '@/data/categories';
import { electricityExperiments } from './electricity';
import { electronicsExperiments } from './electronics';
import { magnetismExperiments } from './magnetism';
import { mechanicsExperiments } from './mechanics';
import { modernPhysicsExperiments } from './modern-physics';
import { opticsExperiments } from './optics';
import { thermodynamicsExperiments } from './thermodynamics';
import type { CategoryId, Difficulty, ExperimentDefinition, ExperimentStatus } from './types';
import { wavesExperiments } from './waves';

export const EXPERIMENTS: readonly ExperimentDefinition[] = [
  ...mechanicsExperiments,
  ...electricityExperiments,
  ...magnetismExperiments,
  ...wavesExperiments,
  ...opticsExperiments,
  ...thermodynamicsExperiments,
  ...modernPhysicsExperiments,
  ...electronicsExperiments,
];

const BY_SLUG = new Map(EXPERIMENTS.map((e) => [e.slug, e]));

export function getExperiment(slug: string | undefined): ExperimentDefinition | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

export function getExperimentsByCategory(category: CategoryId): ExperimentDefinition[] {
  return EXPERIMENTS.filter((e) => e.category === category);
}

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  introductory: 0,
  intermediate: 1,
  advanced: 2,
};

export interface ExperimentQuery {
  text?: string;
  category?: CategoryId | null;
  status?: ExperimentStatus | null;
  difficulty?: Difficulty | null;
}

/**
 * Filters the catalogue. Text matching is case-insensitive and requires every
 * whitespace-separated term to appear in the title, summary, category or tags.
 */
export function queryExperiments(query: ExperimentQuery): ExperimentDefinition[] {
  const terms = (query.text ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return EXPERIMENTS.filter((e) => {
    if (query.category && e.category !== query.category) return false;
    if (query.status && e.status !== query.status) return false;
    if (query.difficulty && e.difficulty !== query.difficulty) return false;
    if (terms.length === 0) return true;
    const haystack = [e.title, e.summary, e.category.replace('-', ' '), ...e.tags]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  }).sort((a, b) => {
    // Available experiments first, then by catalogue category order.
    if (a.status !== b.status) return a.status === 'available' ? -1 : 1;
    return 0;
  });
}

export interface CategoryStats {
  category: CategoryId;
  total: number;
  available: number;
}

export function getCatalogueStats(): CategoryStats[] {
  return CATEGORIES.map((c) => {
    const items = getExperimentsByCategory(c.id);
    return {
      category: c.id,
      total: items.length,
      available: items.filter((e) => e.status === 'available').length,
    };
  });
}
