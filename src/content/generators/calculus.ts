/**
 * Shared pieces for the Differentiation course.
 *
 * As with the complex course, display TeX and parseable answer strings are kept
 * apart: `*Tex` is what the learner reads, `*Answer` is what mathjs grades.
 */
import type { KeypadKey } from '../types';

/** Algebra keys: every differentiation question needs these. */
export const ALGEBRA_KEYS: KeypadKey[] = [
  { insert: 'x', tex: true },
  { insert: '^' },
  { insert: '(' },
  { insert: ')' },
  { insert: '/' },
  { insert: '*', label: '×' },
];

export const TRIG_KEYS: KeypadKey[] = [
  ...ALGEBRA_KEYS,
  { insert: 'sin(' },
  { insert: 'cos(' },
];

export const EXP_KEYS: KeypadKey[] = [
  ...ALGEBRA_KEYS,
  { insert: 'e', tex: true },
  { insert: 'ln(' },
];

/**
 * A single power term as it would be written by hand.
 *
 * Handles the cases that make naive templating look wrong: a coefficient of 1
 * or -1 is implied, x^1 is just x, and x^0 vanishes leaving the coefficient.
 */
export function termTex(coefficient: number, power: number): string {
  if (coefficient === 0) return '0';
  if (power === 0) return `${coefficient}`;

  const sign = coefficient < 0 ? '-' : '';
  const size = Math.abs(coefficient);
  const number = size === 1 ? '' : `${size}`;
  const variable = power === 1 ? 'x' : `x^{${power}}`;
  return `${sign}${number}${variable}`;
}

/** The same term in a form mathjs parses unambiguously. */
export function termAnswer(coefficient: number, power: number): string {
  if (coefficient === 0) return '0';
  if (power === 0) return `${coefficient}`;
  return `(${coefficient}) * x^(${power})`;
}

/** Joins signed terms into one expression, collapsing "+ -3" into "- 3". */
export function sumTex(terms: string[]): string {
  return terms
    .filter((term) => term !== '0')
    .map((term, idx) => {
      if (idx === 0) return term;
      return term.startsWith('-') ? ` - ${term.slice(1)}` : ` + ${term}`;
    })
    .join('');
}

/** Joins terms for the grader, where explicit signs are safe. */
export function sumAnswer(terms: string[]): string {
  const kept = terms.filter((term) => term !== '0');
  return kept.length === 0 ? '0' : kept.map((term) => `(${term})`).join(' + ');
}

/** Leibniz notation wrapper, e.g. \frac{d}{dx}\left(3x^2\right). */
export function ddx(inner: string): string {
  return `\\frac{d}{dx}\\left(${inner}\\right)`;
}
