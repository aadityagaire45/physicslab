import { NAV_ITEMS } from '@/app/navigation';
import { CATEGORIES, getCategory } from '@/data/categories';
import { CONCEPTS } from '@/data/concepts';
import { EXPERIMENTS } from '@/modules/registry';

export type SearchResultType = 'page' | 'experiment' | 'laboratory' | 'concept';

export interface SearchEntry {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  to: string;
  keywords: string;
}

export const SEARCH_INDEX: readonly SearchEntry[] = [
  ...NAV_ITEMS.map((item) => ({
    id: `page:${item.to}`,
    type: 'page' as const,
    title: item.label,
    subtitle: item.description,
    to: item.to,
    keywords: item.description.toLowerCase(),
  })),
  ...EXPERIMENTS.map((e) => ({
    id: `experiment:${e.slug}`,
    type: 'experiment' as const,
    title: e.title,
    subtitle: `${getCategory(e.category).name} · ${e.status === 'available' ? 'Available' : 'Planned'}`,
    to: `/experiments/${e.slug}`,
    keywords: [e.summary, ...e.tags].join(' ').toLowerCase(),
  })),
  ...CATEGORIES.map((c) => ({
    id: `laboratory:${c.id}`,
    type: 'laboratory' as const,
    title: `${c.name} laboratory`,
    subtitle: c.tagline,
    to: `/experiments?category=${c.id}`,
    keywords: [c.description, ...c.topics].join(' ').toLowerCase(),
  })),
  ...CONCEPTS.map((c) => ({
    id: `concept:${c.id}`,
    type: 'concept' as const,
    title: c.title,
    subtitle: `Concept · ${getCategory(c.category).name}`,
    to: `/learn#${c.id}`,
    keywords: c.summary.toLowerCase(),
  })),
];

/**
 * Ranks entries against a query. Every term must match the title or
 * keywords; title-prefix matches rank highest.
 */
export function searchLaboratory(query: string, limit = 12): SearchEntry[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored: Array<{ entry: SearchEntry; score: number }> = [];
  for (const entry of SEARCH_INDEX) {
    const title = entry.title.toLowerCase();
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      if (title.startsWith(term)) score += 6;
      else if (title.split(/[\s–-]+/).some((word) => word.startsWith(term))) score += 4;
      else if (title.includes(term)) score += 3;
      else if (entry.keywords.includes(term)) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
