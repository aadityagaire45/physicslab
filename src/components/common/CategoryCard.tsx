import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { LabCategory } from '@/data/categories';

interface CategoryCardProps {
  category: LabCategory;
  total: number;
  available: number;
}

export function CategoryCard({ category, total, available }: CategoryCardProps) {
  const Icon = category.icon;
  return (
    <Link
      to={`/experiments?category=${category.id}`}
      style={{ '--cat': category.color } as CSSProperties}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[var(--shadow-panel)]"
    >
      <span className="absolute inset-y-0 left-0 w-0.5 cat-strip opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <span className="cat-tile flex size-9 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <span className="tabular text-[12px] text-muted">
          {available > 0 ? `${available} live · ` : ''}
          {total} total
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-fg">{category.name}</h3>
      <p className="cat-text text-[12px] font-medium">{category.tagline}</p>
      <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{category.description}</p>
    </Link>
  );
}
