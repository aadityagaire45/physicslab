import { Link } from 'react-router';
import { cn } from '@/utils/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="physqora-ring" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4b8bff" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#2dd4ee" />
        </linearGradient>
        <linearGradient id="physqora-orbit" x1="5" y1="22" x2="27" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" className="fill-[#070b16] dark:fill-[#0b1122]" />
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="rgba(139, 92, 246, 0.28)" strokeWidth="1" />
      <circle cx="15.5" cy="15.5" r="9.2" stroke="url(#physqora-ring)" strokeWidth="1.75" />
      <ellipse
        cx="15.5"
        cy="15.5"
        rx="11.2"
        ry="4.2"
        transform="rotate(-32 15.5 15.5)"
        stroke="url(#physqora-orbit)"
        strokeWidth="1.35"
        strokeOpacity="0.9"
      />
      <path d="M18.2 18.2L24.8 24.8" stroke="url(#physqora-ring)" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="2.5" fill="#f8fafc" />
      <circle cx="24.8" cy="24.8" r="1.65" fill="#2dd4ee" />
    </svg>
  );
}

export function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5" aria-label="PHYSQORA home">
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-[0.09em] text-fg">
          PHYS<span className="bg-gradient-to-r from-[#4b8bff] via-[#8b5cf6] to-[#2dd4ee] bg-clip-text text-transparent">QORA</span>
        </span>
        <span className="mt-1 block text-[9.5px] font-semibold tracking-[0.14em] text-muted uppercase">
          THE UNIVERSE, EXPLORED.
        </span>
      </span>
    </Link>
  );
}
