import { useLocation } from 'react-router';
import { Menu, Search } from 'lucide-react';
import { NAV_ITEMS, REPOSITORY_URL } from '@/app/navigation';
import { getExperiment } from '@/modules/registry';
import { useUiStore } from '@/store/uiStore';
import { Kbd } from '../common/Kbd';
import { LogoMark } from './Logo';
import { ThemeSwitcher } from './ThemeSwitcher';

function useSectionTitle(): string {
  const { pathname } = useLocation();
  if (pathname.startsWith('/experiments/')) {
    return getExperiment(pathname.split('/')[2])?.title ?? 'Experiments';
  }
  const match = NAV_ITEMS.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)));
  return match?.label ?? 'PHYSQORA';
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function Header() {
  const title = useSectionTitle();
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <LogoMark className="size-7 lg:hidden" />

      <h1 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-fg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-muted transition-colors hover:border-line-strong md:flex xl:w-80"
          aria-label="Search experiments, concepts and pages"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search the laboratory…</span>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg md:hidden"
          aria-label="Search"
        >
          <Search className="size-4.5" />
        </button>
        <ThemeSwitcher />
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg sm:flex"
          aria-label="PHYSQORA on GitHub"
          title="Source code on GitHub"
        >
          <GitHubIcon className="size-4.5" />
        </a>
      </div>
    </header>
  );
}
