/**
 * Shared helpers for complex-number content.
 *
 * Two audiences, deliberately kept apart:
 *
 * - `*Tex` helpers produce what a person reads — "3 - 2i", never "3 + -2i".
 * - `*Answer` helpers produce what mathjs parses. These are never displayed,
 *   so they can be unambiguous rather than pretty.
 */
import type { KeypadKey } from '../types';
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
