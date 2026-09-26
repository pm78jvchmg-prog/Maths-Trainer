/**
 * Shared pieces for the three later Further Integration levels: reduction
 * formulae, arc length and surface area, and inverse trigonometric and
 * hyperbolic integrals.
 *
 * Kept apart from `integration.ts`, which is already past nine thousand lines,
 * and holding no generators itself, so the registry passes it by.
 */
import type { Block, ChoiceOption, KeypadKey, Slide } from '../types';
import { ALGEBRA_KEYS } from './calculus';

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const show = (tex: string): Block => ({ kind: 'display', tex });

/** The algebra keys plus the constant of integration. */
export const C_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'C' }];

/** Exact numbers: fractions only. */
export const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

/** Exact numbers with pi in them. */
export const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

/** Exact numbers with a logarithm in them. */
export const LN_KEYS: KeypadKey[] = [{ insert: 'ln(' }, { insert: '/' }];

/**
 * Draw until `ok` holds. Deterministic per seed; the fallback is a valid
 * question for the case no attempt passes, which none of the samplers here
 * comes near.
 */
export function drawUntil<T>(make: () => T, ok: (value: T) => boolean, fallback: T): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make();
    if (ok(value)) return value;
  }
  return fallback;
}

/** A stable hash of some numbers, so one question always renders one way. */
export function mix(...values: number[]): number {
  let hash = 0x9e3779b9;
  for (const value of values) {
    hash = Math.imul(hash ^ (Math.round(value * 1000) + 1013), 0x85ebca6b);
    hash ^= hash >>> 13;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Items turned so the first lands `turn` places along. */
export function turned<T>(items: T[], turn: number): T[] {
  const at = ((turn % items.length) + items.length) % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/**
 * A native choice slide's options: the first TeX string is the right one, the
 * rest distractors, repeats dropped, at most four, placed by `salt`.
 */
export function placed(texs: string[], salt: number): { options: { id: string; label: string; tex: boolean }[]; correctId: string } {
  const unique = [...new Set(texs)].slice(0, 4);
  const order = turned(unique, salt % unique.length);
  return {
    options: order.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
    correctId: `opt${order.indexOf(unique[0])}`,
  };
}

/** Options for a derived `+choice` form, the first being right, repeats dropped. */
export function choiceList(right: ChoiceOption, ...wrong: ChoiceOption[]): ChoiceOption[] {
  const seen = new Set([right.tex]);
  const out: ChoiceOption[] = [{ ...right, correct: true }];
  for (const option of wrong) {
    if (out.length === 4 || seen.has(option.tex)) continue;
    seen.add(option.tex);
    out.push({ ...option, correct: false });
  }
  return out;
}

/** A tile bank: the answer's tokens, then distinct extras, sorted so nothing is given away by position. */
export function tokenBank(answer: string[], extras: string[], spare = 3): string[] {
  // Keyed without spaces: TeX draws `- 8` and `-8` alike, so they count as one tile.
  const key = (token: string) => token.replace(/\s+/g, '');
  const out = [...answer];
  const seen = new Set(answer.map(key));
  for (const token of extras) {
    if (out.length - answer.length >= spare) break;
    if (seen.has(key(token))) continue;
    seen.add(key(token));
    out.push(token);
  }
  return out.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/* ---------- fractions ---------- */

export interface Frac {
  n: number;
  d: number;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function frac(n: number, d = 1): Frac {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (sign * n) / g + 0, d: (sign * d) / g };
}

export const fmul = (a: Frac, b: Frac): Frac => frac(a.n * b.n, a.d * b.d);
export const fadd = (a: Frac, b: Frac): Frac => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const fsub = (a: Frac, b: Frac): Frac => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const fval = (a: Frac): number => a.n / a.d;
export const feq = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d;

/** A fraction as the learner reads it: `3`, `-\frac{2}{3}`. */
export function fracTex(f: Frac): string {
  if (f.d === 1) return `${f.n}`;
  return `${f.n < 0 ? '-' : ''}\\frac{${Math.abs(f.n)}}{${f.d}}`;
}

/** The same fraction for mathjs. */
export const fracAns = (f: Frac): string => (f.d === 1 ? `(${f.n})` : `(${f.n}/${f.d})`);

/**
 * A coefficient written in front of something: nothing for 1, a bare minus
 * for -1, otherwise the fraction.
 */
export function coefTex(f: Frac): string {
  if (f.d === 1 && f.n === 1) return '';
  if (f.d === 1 && f.n === -1) return '-';
  return fracTex(f);
}

/** A signed term joined onto what comes before: ` + \frac{1}{2}x`, ` - 3x`. */
export function joinTerm(coefficient: Frac, body: string): string {
  if (coefficient.n === 0) return '';
  const size = frac(Math.abs(coefficient.n), coefficient.d);
  const shown = body === '' ? fracTex(size) : `${coefTex(size)}${body}`;
  return ` ${coefficient.n < 0 ? '-' : '+'} ${shown}`;
}

/** A term that opens an expression: `\frac{1}{2}x`, `-x`, `3`. */
export function leadTerm(coefficient: Frac, body: string): string {
  return body === '' ? fracTex(coefficient) : `${coefTex(coefficient)}${body}`;
}

/** A multiple of pi: `\pi`, `\frac{3\pi}{16}`, `-\frac{\pi}{4}`. */
export function piTex(f: Frac): string {
  if (f.n === 0) return '0';
  const size = Math.abs(f.n);
  const top = size === 1 ? '\\pi' : `${size}\\pi`;
  const sign = f.n < 0 ? '-' : '';
  return f.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${f.d}}`;
}

/** A multiple of pi for mathjs. */
export const piAns = (f: Frac): string => `(${f.n}/${f.d})*pi`;

/** A number written as a whole number or a decimal, for tiles and trees. */
export const whole = (v: number): string => `${Math.round(v * 1e9) / 1e9 + 0}`;

/**
 * A typed exact number. The checker grades by value, so the stored answer is
 * the decimal — which is also what lets the quadrature oracle read it — and
 * `alsoAccepts` records the exact writing the prompt asks for.
 */
export function typedValue(opts: {
  prompt: Block[];
  lead: string;
  value: number;
  exact: string;
  keypad: KeypadKey[];
  integrand?: string;
  limits?: [number, number];
}): Slide {
  return {
    kind: 'expression',
    prompt: opts.prompt,
    lead: opts.lead,
    keypad: opts.keypad,
    answer: `${opts.value}`,
    alsoAccepts: [opts.exact],
    ...(opts.integrand ? { integrand: opts.integrand, limits: opts.limits } : {}),
    domain: 'real',
    mode: 'exact',
  };
}

/** e^{kx} as read: `e^{x}`, `e^{-2x}`. */
export function expTex(k: number): string {
  if (k === 1) return 'e^{x}';
  if (k === -1) return 'e^{-x}';
  return `e^{${k}x}`;
}

/** x^n as read: `x`, `x^{3}`, nothing for n = 0. */
export function powTex(n: number, letter = 'x'): string {
  if (n === 0) return '';
  if (n === 1) return letter;
  return `${letter}^{${n}}`;
}

/** A root of a sum of squares or a difference, as read: `\sqrt{9 - x^{2}}`. */
export const rootTex = (inside: string): string => `\\sqrt{${inside}}`;
