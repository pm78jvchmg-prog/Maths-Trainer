/**
 * Shared helpers for complex-number content, and at the end the few that every
 * course needs: `gcd`, `gcdOrOne`, `fracTex` and `say`.
 *
 * Two audiences, deliberately kept apart:
 *
 * - `*Tex` helpers produce what a person reads — "3 - 2i", never "3 + -2i".
 * - `*Answer` helpers produce what mathjs parses. These are never displayed,
 *   so they can be unambiguous rather than pretty.
 */
import type { Block, KeypadKey } from '../types';
import type { Rng } from '../../engine/rng';

/** The imaginary unit. Every keypad in this course offers it. */
export const I_KEY: KeypadKey[] = [{ insert: 'i', tex: true }];

/** A signed coefficient as written by hand: 1i becomes i, -1i becomes -i. */
export function coeffTex(n: number, unit = 'i'): string {
  if (n === 1) return unit;
  if (n === -1) return `-${unit}`;
  return `${n}${unit}`;
}

/** "a + bi", collapsing signs so a negative imaginary part reads as a subtraction. */
export function complexTex(a: number, b: number): string {
  if (b === 0) return `${a}`;
  if (a === 0) return coeffTex(b);
  return b > 0 ? `${a} + ${coeffTex(b)}` : `${a} - ${coeffTex(Math.abs(b))}`;
}

/** The same value in a form mathjs parses without ambiguity. */
export function complexAnswer(a: number, b: number): string {
  if (b === 0) return `${a}`;
  return `(${a}) + (${b})*i`;
}

/** Wraps a complex number in brackets when it needs them, e.g. before a power. */
export function bracketedTex(a: number, b: number): string {
  return b === 0 ? `${a}` : `(${complexTex(a, b)})`;
}

/**
 * (a + bi)(c + di) = (ac - bd) + (ad + bc)i.
 *
 * Multiplication underpins expansion, division (numerator = quotient x divisor)
 * and powers, so it lives here rather than being spelled out at each site —
 * where a generator's `render` and `solution` would each need their own copy
 * and could drift apart.
 */
export function mulComplex(a: number, b: number, c: number, d: number): [number, number] {
  return [a * c - b * d, a * d + b * c];
}

/** Successive powers of a complex number: index 0 is the first power. */
export function powersOf(re: number, im: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  let current: [number, number] = [1, 0];
  for (let k = 0; k < n; k++) {
    current = mulComplex(current[0], current[1], re, im);
    out.push(current);
  }
  return out;
}

/**
 * n = k^2 * m with m square-free: the surd sqrt(n) in lowest terms. Integer
 * arithmetic only, so a modulus is never a float rounded back to the integer
 * it was meant to be.
 */
export function surdParts(n: number): { k: number; m: number } {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    while (m % (p * p) === 0) {
      m /= p * p;
      k *= p;
    }
  }
  return { k, m };
}

/** sqrt(n) as the learner reads it: 5, \sqrt{13}, 2\sqrt{5}. */
export function surdTex(n: number): string {
  const { k, m } = surdParts(n);
  if (m === 1) return `${k}`;
  return `${k === 1 ? '' : k}\\sqrt{${m}}`;
}

/** The same value for mathjs, simplified: 5, sqrt(13), 2*sqrt(5). */
export function surdAnswer(n: number): string {
  const { k, m } = surdParts(n);
  if (m === 1) return `${k}`;
  return k === 1 ? `sqrt(${m})` : `${k}*sqrt(${m})`;
}

/** A non-zero magnitude with a random sign. */
export function nonZero(rng: Rng, max: number): number {
  return rng.int(1, max) * rng.sign();
}

/**
 * A tile list with each token once. Two formulas for a distractor can land on
 * the same value (or on the answer), and a bank showing one tile twice reads
 * as a hint about how many times it is needed.
 */
export function distinct(tokens: string[]): string[] {
  return [...new Set(tokens)];
}

/* ---------- Shared by every course ---------- */

/**
 * The greatest common divisor of |a| and |b|: never negative, and 0 when both
 * are 0. To divide by it where both could be 0, use `gcdOrOne`.
 */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

/**
 * `gcd`, except that it is 1 rather than 0 when both are 0, so dividing by it
 * never gives NaN. Kept apart from `gcd` because the copies it replaced
 * answered 1 there: moving a caller to `gcd` means first showing it can never
 * pass two zeros, which a fold from 0 over a list starting with 0 would.
 */
export function gcdOrOne(a: number, b: number): number {
  return gcd(a, b) || 1;
}

/** top/bottom as the learner reads it: lowest terms, the sign out in front, a whole number left whole. */
export function fracTex(top: number, bottom: number): string {
  const g = gcdOrOne(top, bottom);
  let p = top / g;
  let q = bottom / g;
  if (q < 0) {
    p = -p;
    q = -q;
  }
  if (q === 1) return `${p}`;
  return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`;
}

/** A paragraph of prose in a prompt; inline maths sits between $ signs. */
export const say = (text: string): Block => ({ kind: 'prose', text });
