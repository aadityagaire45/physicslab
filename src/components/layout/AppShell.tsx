import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { PageLoader } from './PageLoader';
import { SearchDialog } from './SearchDialog';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const { pathname } = useLocation();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => setMobileNavOpen(false), [pathname, setMobileNavOpen]);

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileNav />
      <SearchDialog />

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Header />
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[1400px]"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
        <footer className="border-t border-line px-4 py-4 text-[12px] text-subtle sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>PHYSQORA — THE UNIVERSE, EXPLORED.</span>
            <span>Runs entirely in your browser · No account required</span>
          </div>
        </footer>
      </div>
      <ScrollRestoration />
    </div>
  );
}
