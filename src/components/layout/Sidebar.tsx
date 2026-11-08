import type { CSSProperties } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router';
import { NAV_GROUPS } from '@/app/navigation';
import { CATEGORIES } from '@/data/categories';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';

interface SidebarContentProps {
  onNavigate?: () => void;
}

/** Navigation content shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const [params] = useSearchParams();
  const activeCategory = location.pathname === '/experiments' ? params.get('category') : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo onNavigate={onNavigate} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                        isActive && !activeCategory
                          ? 'bg-accent-soft text-accent'
                          : 'text-fg-soft hover:bg-surface-2 hover:text-fg',
                      )
                    }
                  >
                    <Icon className="size-4.25 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-subtle uppercase">Laboratories</p>
          <ul className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <NavLink
                  to={`/experiments?category=${c.id}`}
                  onClick={onNavigate}
                  style={{ '--cat': c.color } as CSSProperties}
                  className={cn(
                    'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors',
                    activeCategory === c.id ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  <span className="cat-strip size-2 rounded-full" aria-hidden />
                  {c.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="shrink-0 border-t border-line px-5 py-3 text-[11.5px] text-subtle">
        v{__APP_VERSION__} · Open source (MIT)
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}
