/**
 * Number and quantity formatting helpers for scientific display.
 */

interface SiPrefix {
  symbol: string;
  exponent: number;
}

const SI_PREFIXES: readonly SiPrefix[] = [
  { symbol: 'T', exponent: 12 },
  { symbol: 'G', exponent: 9 },
  { symbol: 'M', exponent: 6 },
  { symbol: 'k', exponent: 3 },
  { symbol: '', exponent: 0 },
  { symbol: 'm', exponent: -3 },
  { symbol: 'µ', exponent: -6 },
  { symbol: 'n', exponent: -9 },
  { symbol: 'p', exponent: -12 },
  { symbol: 'f', exponent: -15 },
];

/** Rounds a number to the given count of significant figures. */
export function toSignificant(value: number, sigFigs = 3): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const digits = Math.max(1, Math.min(15, Math.round(sigFigs)));
  return Number.parseFloat(value.toPrecision(digits));
}

/**
 * Formats a number with a fixed count of significant figures. Very large and
 * very small magnitudes use scientific notation (e.g. 6.63 × 10⁻³⁴).
 */
export function formatNumber(value: number, sigFigs = 3): string {
  if (Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  if (value === 0) return '0';

  const rounded = toSignificant(value, sigFigs);
  const magnitude = Math.abs(rounded);
  if (magnitude >= 1e6 || magnitude < 1e-3) {
    const [mantissa, exponent] = rounded.toExponential(Math.max(0, sigFigs - 1)).split('e');
    return `${mantissa.replace('-', '−')} × 10${toSuperscript(Number(exponent))}`;
  }

  const decimals = Math.max(0, sigFigs - 1 - Math.floor(Math.log10(magnitude) + 1e-12));
  return rounded.toFixed(Math.min(decimals, 12)).replace('-', '−');
}

/**
 * Formats a quantity using an SI prefix so the rounded mantissa lies in [1, 1000).
 * Example: formatQuantity(0.0042, 'A') → "4.20 mA", formatQuantity(0.9999, 'A', 3) → "1.00 A".
 */
export function formatQuantity(value: number, unit: string, sigFigs = 3): string {
  if (!Number.isFinite(value) || value === 0) return `${formatNumber(value, sigFigs)} ${unit}`;
  const roundedAbs = toSignificant(Math.abs(value), sigFigs);
  const exponent = Math.floor(Math.log10(roundedAbs) + 1e-12);
  const prefix =
    SI_PREFIXES.find((p) => exponent >= p.exponent) ?? SI_PREFIXES[SI_PREFIXES.length - 1];
  const scaled = value / 10 ** prefix.exponent;
  return `${formatNumber(scaled, sigFigs)} ${prefix.symbol}${unit}`;
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

export function toSuperscript(value: number): string {
  return String(value)
    .split('')
    .map((char) => SUPERSCRIPT_DIGITS[char] ?? char)
    .join('');
}
