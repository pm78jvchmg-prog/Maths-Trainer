/**
 * Shared pieces for the Contest Math course.
 *
 * Contest questions are short to state and turn on one idea — add every
 * equation at once, count the gaps rather than the posts, look at the last
 * digit only — so most of them are answered with a single number. That number
 * is typed on the plain keypad, or picked from four options through the
 * generator's `choices`, and a third shape (tiles, a table, a Venn diagram)
 * asks for the working the trick produces.
 *
 * Every answer here is exact: a whole number, a terminating decimal, or a
 * fraction typed with the `/` key.
 */
import type { Block, ChoiceOption, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';

/** The keypad for an answer that may be a fraction. Digits are always there. */
export const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

export const say = (text: string): Block => ({ kind: 'prose', text });

export const show = (tex: string): Block => ({ kind: 'display', tex });

/** A number as the learner reads it and types it: `13.5`, never `13.50`. */
export function num(value: number): string {
  const text = String(Number(value.toFixed(6)));
  return text === '-0' ? '0' : text;
}

/** An amount of money in pounds: `£12`, `£13.50`. Prose, not TeX. */
export function pounds(value: number): string {
  return Number.isInteger(value) ? `£${value}` : `£${value.toFixed(2)}`;
}

/** A typed-number slide on the plain keypad, `lead` naming what is typed (`\\text{hours} =`). */
export function typed(prompt: Block[], answer: number | string, lead: string, keypad: KeypadKey[] = []): Slide {
  return {
    kind: 'expression',
    prompt,
    lead,
    keypad,
    answer: typeof answer === 'number' ? num(answer) : answer,
    domain: 'real',
    mode: 'exact',
  };
}

/** Values stepping away from `value` on both sides, nearest first. */
function around(value: number, step: number): number[] {
  const out: number[] = [];
  for (let gap = 1; gap <= 12; gap += 1) out.push(value + gap * step, value - gap * step);
  return out;
}

/**
 * Four options: the answer and the first three distinct slips, topped up with
 * neighbours. Slips that are not positive, repeat, or equal the answer are
 * skipped, so a slip formula landing on the answer can never offer it twice.
 */
export function numberOptions(correct: number, slips: number[], step = 1, min = 0): ChoiceOption[] {
  const seen = new Set([num(correct)]);
  const picked: number[] = [];
  for (const value of [...slips, ...around(correct, step)]) {
    if (picked.length === 3) break;
    if (!Number.isFinite(value) || value < min || seen.has(num(value))) continue;
    // A whole answer gets whole slips: 12.75 beside 12 is eliminated on sight.
    if (Number.isInteger(correct) && Number.isInteger(step) && !Number.isInteger(value)) continue;
    seen.add(num(value));
    picked.push(value);
  }
  return options(
    { tex: num(correct), answer: num(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: num(value), answer: num(value) })),
  );
}

/**
 * A tiles or table bank: every answer value, then `spare` distinct slips,
 * sorted by value so the order gives nothing away.
 */
export function numberBank(answer: number[], slips: number[], spare = 3, step = 1): string[] {
  const out = answer.map(num);
  const taken = new Set(out);
  const extras: string[] = [];
  const pool = [...slips, ...answer.flatMap((value) => around(value, step))];
  for (const value of pool) {
    if (extras.length === spare) break;
    if (!Number.isFinite(value) || value < 0 || taken.has(num(value))) continue;
    taken.add(num(value));
    extras.push(num(value));
  }
  return [...out, ...extras].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return true;
}

/** The prime factorisation of n as [prime, power] pairs, smallest first. */
export function factorise(n: number): [number, number][] {
  const out: [number, number][] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p += 1) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e += 1;
    }
    if (e > 0) out.push([p, e]);
  }
  if (rest > 1) out.push([rest, 1]);
  return out;
}

/** `2^{2} \\times 3^{2}`, a first power written bare. */
export function factorTex(n: number): string {
  return factorise(n)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`))
    .join(' \\times ');
}

/** `\\frac{a}{b}` in lowest terms, or a whole number left whole. */
export function fracTex(top: number, bottom: number): string {
  const g = gcd(top, bottom) || 1;
  const p = top / g;
  const q = bottom / g;
  return q === 1 ? `${p}` : `\\frac{${p}}{${q}}`;
}

/** The same fraction in mathjs syntax, for grading. */
export function fracAnswer(top: number, bottom: number): string {
  const g = gcd(top, bottom) || 1;
  const p = top / g;
  const q = bottom / g;
  return q === 1 ? `${p}` : `${p}/${q}`;
}
