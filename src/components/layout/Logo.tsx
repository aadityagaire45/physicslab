import { Link } from 'react-router';
import { cn } from '@/utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-[#0a1020] dark:fill-[#111a2c]" />
      <ellipse cx="16" cy="16" rx="11" ry="4.5" stroke="#4b8bff" strokeWidth="1.6" transform="rotate(-30 16 16)" />
      <ellipse cx="16" cy="16" rx="11" ry="4.5" stroke="#2dd4ee" strokeWidth="1.6" transform="rotate(30 16 16)" />
      <circle cx="16" cy="16" r="2.6" fill="#e6ebf3" />
    </svg>
  );
}

export function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5" aria-label="PHYSICSLAB home">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-[0.06em] text-fg">
          PHYSICS<span className="text-accent">LAB</span>
        </span>
        <span className="mt-1 block text-[10.5px] font-medium tracking-wide text-muted">Explore. Experiment. Understand.</span>
      </span>
    </Link>
  );
}
