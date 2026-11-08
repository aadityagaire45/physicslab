import { useEffect, useSyncExternalStore } from 'react';
import { useThemeStore } from '@/store/themeStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Resolves the active theme and keeps the <html> class in sync. */
export function useThemeEffect(): void {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#080c15' : '#f4f6fa');
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

const subscribeToSystemTheme = (onChange: () => void) => {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const getSystemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

/** Returns true when dark mode is currently applied; re-renders on change. */
export function useIsDark(): boolean {
  const theme = useThemeStore((s) => s.theme);
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, getSystemPrefersDark, () => true);
  return theme === 'system' ? systemDark : theme === 'dark';
}
