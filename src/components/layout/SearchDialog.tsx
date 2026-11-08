import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, FileText, FlaskConical, GraduationCap, LayoutGrid, Search, type LucideIcon } from 'lucide-react';
import { NAV_ITEMS } from '@/app/navigation';
import { searchLaboratory, type SearchEntry, type SearchResultType } from '@/data/searchIndex';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';
import { Kbd } from '../common/Kbd';

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  page: FileText,
  experiment: FlaskConical,
  laboratory: LayoutGrid,
  concept: GraduationCap,
};

const SUGGESTIONS: SearchEntry[] = NAV_ITEMS.map((item) => ({
  id: `page:${item.to}`,
  type: 'page',
  title: item.label,
  subtitle: item.description,
  to: item.to,
  keywords: '',
}));

/** Global keyboard shortcuts: Ctrl/⌘ + K or "/" open search. */
function useSearchShortcut(open: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === '/' && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
}

export function SearchDialog() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  useSearchShortcut(open, setOpen);

  return (
    <AnimatePresence>
      {open && <SearchPanel onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const open = useUiStore((s) => s.searchOpen);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => (query.trim() ? searchLaboratory(query) : SUGGESTIONS), [query]);

  useFocusTrap(panelRef, open, inputRef);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    onClose();
    navigate(entry.to);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <motion.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]"
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4.5 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search experiments, laboratories, concepts…"
            className="h-13 flex-1 bg-transparent text-[15px] text-fg placeholder:text-subtle focus:outline-none"
            aria-label="Search query"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `search-${results[active].id}` : undefined}
            role="combobox"
            aria-expanded="true"
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul id="search-results" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {!query.trim() && <li className="px-2.5 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-subtle uppercase">Go to</li>}
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-[13px] text-muted">
              No matches for “{query}”. Try a topic such as <em>gravity</em>, <em>lens</em> or <em>diode</em>.
            </li>
          )}
          {results.map((entry, index) => {
            const Icon = TYPE_ICON[entry.type];
            return (
              <li key={entry.id} id={`search-${entry.id}`} role="option" aria-selected={index === active} data-index={index}>
                <button
                  type="button"
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(entry)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left',
                    index === active ? 'bg-accent-soft' : 'hover:bg-surface-2',
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[13.5px] font-medium', index === active ? 'text-accent' : 'text-fg')}>
                      {entry.title}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{entry.subtitle}</span>
                  </span>
                  {index === active && <CornerDownLeft className="size-3.5 text-muted" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11.5px] text-subtle">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
        </div>
      </motion.div>
    </div>
  );
}
