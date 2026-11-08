import type { ReactNode } from 'react';
import type { GlyphKind } from '@/modules/types';
import { cn } from '@/utils/cn';

/**
 * Minimal line-art illustrations for experiments. Each glyph is drawn in a
 * 96 × 56 viewBox with `currentColor`, so it inherits the category colour.
 * Pure SVG keeps them crisp, theme-aware and essentially free to render.
 */
const GLYPHS: Record<GlyphKind, ReactNode> = {
  trajectory: (
    <>
      <path d="M6 48h84" opacity={0.35} />
      <path d="M12 48 Q44 -6 80 48" strokeDasharray="3 3" />
      <circle cx="46" cy="21" r="3" fill="currentColor" stroke="none" />
      <path d="M12 48l10-14" />
      <path d="M22 34l-1 5M22 34l-5 2" />
    </>
  ),
  pendulum: (
    <>
      <path d="M30 6h36" opacity={0.35} />
      <path d="M48 6l14 34" />
      <circle cx="63" cy="43" r="5" fill="currentColor" stroke="none" opacity={0.85} />
      <path d="M48 6v38" strokeDasharray="2 3" opacity={0.4} />
      <path d="M34 40 Q48 50 62 40" strokeDasharray="2 3" opacity={0.6} />
    </>
  ),
  spring: (
    <>
      <path d="M8 6v44" opacity={0.35} />
      <path d="M8 28h6l4-8 6 16 6-16 6 16 6-16 6 16 4-8h6" />
      <rect x="62" y="18" width="20" height="20" rx="2" />
      <path d="M8 50h82" opacity={0.35} />
    </>
  ),
  incline: (
    <>
      <path d="M8 48h80L8 12z" opacity={0.5} />
      <g transform="rotate(24.2 40 30)">
        <rect x="32" y="18" width="16" height="11" rx="1.5" />
      </g>
      <path d="M70 48 A18 18 0 0 0 66 40" opacity={0.6} />
    </>
  ),
  collision: (
    <>
      <path d="M6 44h84" opacity={0.35} />
      <rect x="16" y="26" width="22" height="18" rx="2" />
      <rect x="54" y="30" width="16" height="14" rx="2" />
      <path d="M8 35h5M84 37h5" />
      <path d="M44 28l2 6M47 26v8M50 28l-2 6" opacity={0.7} />
    </>
  ),
  orbit: (
    <>
      <ellipse cx="48" cy="28" rx="38" ry="18" />
      <circle cx="38" cy="28" r="6" fill="currentColor" stroke="none" opacity={0.85} />
      <circle cx="84" cy="24" r="3" fill="currentColor" stroke="none" />
      <path d="M38 28L84 24" strokeDasharray="2 3" opacity={0.5} />
    </>
  ),
  circuit: (
    <>
      <path d="M14 12h20M56 12h26v32H14V12" />
      <path d="M34 12l3-5 4 10 4-10 4 10 4-10 3 5" />
      <path d="M44 38v12M50 41v6" />
      <circle cx="14" cy="28" r="6" />
      <path d="M11 28h6M14 25v6" />
    </>
  ),
  resistors: (
    <>
      <path d="M6 28h12M78 28h12" />
      <path d="M18 28v-14h10M18 28v14h10M68 14h10v28H68" />
      <rect x="28" y="9" width="40" height="10" rx="1.5" />
      <rect x="28" y="37" width="40" height="10" rx="1.5" />
    </>
  ),
  capacitor: (
    <>
      <path d="M8 46 C 24 46, 30 12, 88 10" />
      <path d="M8 10v38h82" opacity={0.35} />
      <path d="M28 46V30" strokeDasharray="2 3" opacity={0.5} />
      <path d="M8 13h80" strokeDasharray="3 3" opacity={0.45} />
    </>
  ),
  charges: (
    <>
      <circle cx="28" cy="28" r="7" />
      <path d="M24 28h8M28 24v8" />
      <circle cx="68" cy="28" r="7" />
      <path d="M64 28h8" />
      <path d="M35 24 Q48 14 61 24M35 32 Q48 42 61 32M34 20 Q48 0 62 20M34 36 Q48 56 62 36" opacity={0.6} />
    </>
  ),
  'wire-field': (
    <>
      <circle cx="48" cy="28" r="4" fill="currentColor" stroke="none" />
      <circle cx="48" cy="28" r="10" />
      <circle cx="48" cy="28" r="17" opacity={0.65} />
      <circle cx="48" cy="28" r="25" opacity={0.35} />
      <path d="M58 26l0 4M58 30l-3-2" />
    </>
  ),
  cyclotron: (
    <>
      <circle cx="54" cy="28" r="18" strokeDasharray="3 3" />
      <path d="M6 46h30" />
      <path d="M36 46 A18 18 0 0 0 54 10" />
      <circle cx="54" cy="10" r="3" fill="currentColor" stroke="none" />
      <path d="M80 14h6M80 24h6M80 34h6M80 44h6" opacity={0.4} />
    </>
  ),
  induction: (
    <>
      <path d="M50 14c6 0 6 28 0 28M58 14c6 0 6 28 0 28M66 14c6 0 6 28 0 28M74 14c6 0 6 28 0 28" />
      <path d="M50 14h24M50 42h24" opacity={0.4} />
      <rect x="10" y="22" width="26" height="12" rx="1.5" />
      <path d="M23 22v12" />
      <path d="M38 28h6M42 25l3 3-3 3" opacity={0.7} />
    </>
  ),
  wave: (
    <>
      <path d="M4 28h88" opacity={0.3} />
      <path d="M4 28 C 12 8, 20 8, 26 28 S 40 48, 48 28 S 62 8, 70 28 S 84 48, 92 28" />
      <path d="M15 12v-4M37 12v-4M15 10h22" opacity={0.6} />
    </>
  ),
  'standing-wave': (
    <>
      <path d="M8 28h80" opacity={0.3} />
      <path d="M8 28 Q 21 6 34 28 T 61 28 T 88 28" />
      <path d="M8 28 Q 21 50 34 28 T 61 28 T 88 28" opacity={0.5} />
      <circle cx="8" cy="28" r="2" fill="currentColor" stroke="none" />
      <circle cx="34" cy="28" r="2" fill="currentColor" stroke="none" />
      <circle cx="61" cy="28" r="2" fill="currentColor" stroke="none" />
      <circle cx="88" cy="28" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  interference: (
    <>
      <circle cx="36" cy="28" r="8" opacity={0.85} />
      <circle cx="36" cy="28" r="16" opacity={0.55} />
      <circle cx="36" cy="28" r="24" opacity={0.3} />
      <circle cx="60" cy="28" r="8" opacity={0.85} />
      <circle cx="60" cy="28" r="16" opacity={0.55} />
      <circle cx="60" cy="28" r="24" opacity={0.3} />
    </>
  ),
  doppler: (
    <>
      <circle cx="52" cy="28" r="6" />
      <circle cx="46" cy="28" r="13" opacity={0.7} />
      <circle cx="40" cy="28" r="20" opacity={0.5} />
      <circle cx="34" cy="28" r="26" opacity={0.3} />
      <circle cx="56" cy="28" r="2.5" fill="currentColor" stroke="none" />
      <path d="M64 28h20M80 25l4 3-4 3" />
    </>
  ),
  refraction: (
    <>
      <path d="M4 28h88" opacity={0.45} />
      <rect x="4" y="28" width="88" height="24" fill="currentColor" stroke="none" opacity={0.1} />
      <path d="M48 4v48" strokeDasharray="2 3" opacity={0.4} />
      <path d="M22 4L48 28L60 52" />
      <path d="M48 28L74 4" opacity={0.35} />
    </>
  ),
  lens: (
    <>
      <path d="M4 28h88" opacity={0.35} />
      <path d="M48 6 Q56 28 48 50 Q40 28 48 6z" />
      <path d="M16 28v-14" />
      <path d="M16 14h32L80 42M16 14L80 42" opacity={0.65} />
      <path d="M80 28v14" />
    </>
  ),
  'double-slit': (
    <>
      <path d="M36 4v16M36 24v8M36 36v16" />
      <path d="M8 28h20" opacity={0.6} />
      <path d="M88 4v48" opacity={0.4} />
      <path d="M86 10h4M85 19h6M84 28h8M85 37h6M86 46h4" />
      <path d="M36 22L88 10M36 34L88 46M36 22L88 28M36 34L88 28" opacity={0.35} />
    </>
  ),
  prism: (
    <>
      <path d="M48 6L72 48H24z" />
      <path d="M4 32L38 26" />
      <path d="M58 30L92 20M58 31L92 28M58 32L92 36" opacity={0.75} />
    </>
  ),
  gas: (
    <>
      <path d="M18 14v36h60V14" />
      <path d="M18 22h60" />
      <path d="M48 22V4" />
      <circle cx="30" cy="34" r="2" fill="currentColor" stroke="none" />
      <circle cx="44" cy="42" r="2" fill="currentColor" stroke="none" />
      <circle cx="60" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="68" cy="42" r="2" fill="currentColor" stroke="none" />
      <circle cx="38" cy="29" r="2" fill="currentColor" stroke="none" />
      <path d="M31 34l5-3M45 42l6 2M60 30l-4 4" opacity={0.5} />
    </>
  ),
  heat: (
    <>
      <rect x="40" y="6" width="8" height="34" rx="4" />
      <circle cx="44" cy="44" r="7" />
      <path d="M44 40V18" strokeWidth={3} />
      <path d="M54 14h6M54 22h4M54 30h6" opacity={0.5} />
      <path d="M22 46c-3-5 3-7 0-12M30 46c-3-5 3-7 0-12" opacity={0.6} />
    </>
  ),
  cycle: (
    <>
      <path d="M10 4v46h82" opacity={0.35} />
      <path d="M24 12 C 34 18, 44 20, 58 22 C 66 30, 74 38, 84 44 C 70 42, 56 40, 42 36 C 36 28, 30 20, 24 12z" />
      <path d="M44 20l4 1-3 3" />
    </>
  ),
  distribution: (
    <>
      <path d="M8 4v46h84" opacity={0.35} />
      <path d="M8 50 C 18 50, 22 10, 34 10 S 56 44, 90 48" />
      <path d="M8 50 C 22 50, 30 26, 44 26 S 66 46, 90 49" opacity={0.5} />
      <path d="M34 10v40" strokeDasharray="2 3" opacity={0.4} />
    </>
  ),
  photon: (
    <>
      <path d="M8 44h80" strokeWidth={3} opacity={0.5} />
      <path d="M8 8 l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 l4 4 L46 40" />
      <path d="M60 40L78 14" />
      <circle cx="78" cy="14" r="2.5" fill="currentColor" stroke="none" />
      <path d="M74 14h4v4" />
    </>
  ),
  decay: (
    <>
      <path d="M8 4v46h84" opacity={0.35} />
      <path d="M8 8 C 22 30, 40 42, 90 48" />
      <path d="M8 27h17v23M8 38h34v12" strokeDasharray="2 3" opacity={0.5} />
    </>
  ),
  spectrum: (
    <>
      <rect x="6" y="14" width="84" height="28" rx="2" opacity={0.45} />
      <path d="M22 14v28" strokeWidth={2.5} />
      <path d="M44 14v28" strokeWidth={2.5} />
      <path d="M56 14v28" strokeWidth={2.5} />
      <path d="M62 14v28" strokeWidth={2} opacity={0.75} />
      <path d="M65 14v28" strokeWidth={1.5} opacity={0.55} />
    </>
  ),
  diode: (
    <>
      <path d="M8 28h26M62 28h26" />
      <path d="M34 14v28l26-14z" />
      <path d="M60 14v28" />
    </>
  ),
  divider: (
    <>
      <path d="M30 4v8M30 44v8M30 28h40" />
      <rect x="24" y="12" width="12" height="14" rx="1.5" />
      <rect x="24" y="30" width="12" height="14" rx="1.5" />
      <path d="M30 26v4" />
      <circle cx="72" cy="28" r="2.5" />
      <path d="M22 52h16" />
    </>
  ),
  logic: (
    <>
      <path d="M8 18h22M8 38h22M70 28h18" />
      <path d="M30 10h18a18 18 0 0 1 0 36H30z" />
    </>
  ),
  transistor: (
    <>
      <circle cx="52" cy="28" r="20" />
      <path d="M12 28h30M42 16v24" />
      <path d="M42 22L62 10V4M42 34L62 46v6" />
      <path d="M56 42l6 4-7 1" />
    </>
  ),
};

interface ExperimentGlyphProps {
  kind: GlyphKind;
  className?: string;
  title?: string;
}

export function ExperimentGlyph({ kind, className, title }: ExperimentGlyphProps) {
  return (
    <svg
      viewBox="0 0 96 56"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('block', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {GLYPHS[kind]}
    </svg>
  );
}
