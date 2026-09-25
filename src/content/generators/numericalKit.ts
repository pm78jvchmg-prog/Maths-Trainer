/**
 * Helpers shared by the later Numerical Methods generator files
 * (`numericalDifferentiation.ts`, `numericalGraphs.ts`, `numericalContext.ts`,
 * `numericalModelling.ts`). `numericalMethods.ts` keeps its own file-local
 * copies of several of these; they agree, and the ones here are exported so the
 * newer files do not each carry a fourth copy.
 *
 * No generator lives here, so the registry finds nothing in this file.
 */
import type { Block, ChoiceOption, Slide } from '../types';
import { hashSeed } from '../../engine/rng';
import { sumTex, termTex } from './calculus';
import { fmt } from './numericalMethods';

export { fmt };

export const show = (tex: string): Block => ({ kind: 'display', tex });

/** Polynomial coefficients, highest power first. */
export type Poly = number[];

export const valueAt = (p: Poly, x: number): number => p.reduce((acc, c) => acc * x + c, 0);

export function derivative(p: Poly): Poly {
  const n = p.length - 1;
  return p.slice(0, -1).map((c, i) => c * (n - i));
}

export function polyTex(p: Poly): string {
  const n = p.length - 1;
  return sumTex(p.map((c, i) => termTex(c, n - i))) || '0';
}

/** A value with the float dust taken off, so sums of decimals compare exactly. */
export const clean = (value: number): number => Number(value.toFixed(6));

/** A number as a factor or a term being taken away, bracketed when negative. */
export const paren = (value: number): string => (value < 0 ? `(${fmt(value)})` : fmt(value));

/** "+ 4" or "- 3", for a term that follows another. */
export const signed = (value: number): string => (value < 0 ? `- ${fmt(-value)}` : `+ ${fmt(value)}`);

export function aligned(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** Whether a value is an exact decimal of at most `dp` places. */
export function terminates(value: number, dp = 3): boolean {
  const scaled = value * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-7;
}

/**
 * A bank of numbers: the answer as a multiset, then slips that differ from
 * every answer, topped up from `fillers` until `spare` are left. Sorted.
 */
export function numberBank(answer: string[], slips: (string | undefined)[], fillers: string[] = [], spare = 3): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const token of [...slips, ...fillers]) {
    if (extras.length >= spare) break;
    if (token === undefined || needed.has(token) || extras.includes(token)) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
}

/** Numbers either side of each value, for topping up a bank. */
export function around(values: number[], unit: number): string[] {
  return [1, 2, 3].flatMap((k) => values.flatMap((v) => [fmt(v + k * unit), fmt(v - k * unit)]));
}

/** A tiles bank: the answer's tokens, then distractors that look different from all of them. Sorted. */
export function fillBank(answer: string[], distractors: string[]): string[] {
  const bare = (token: string) => token.replace(/\s+/g, '');
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  for (const token of distractors) {
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort();
}

/** A steps bank: the value and its slips, de-duplicated, ordered by hash. */
export function stepBank(value: string, ...slips: string[]): string[] {
  const out = [...new Set([value, ...slips])];
  return out.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** A native choice slide, turned by a hash of its labels so one question renders one way. */
export function choiceSlide(prompt: Block[], opts: ChoiceOption[], tex = true): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
export function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** "Positive" or "Negative", for a flow branch. */
export const sgn = (value: number): 'Positive' | 'Negative' => (value > 0 ? 'Positive' : 'Negative');

/** A root of `f` between `lo` and `hi`, by halving. Requires a sign change. */
export function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  for (let n = 0; n < 200; n += 1) {
    const mid = (a + b) / 2;
    if (Math.sign(f(mid)) === Math.sign(f(a))) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/** Every real root of a continuous `f` in [lo, hi], found where it changes sign on a fine comb. */
export function rootsIn(f: (x: number) => number, lo: number, hi: number, steps = 800): number[] {
  const out: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    const a = lo + ((hi - lo) * i) / steps;
    const b = lo + ((hi - lo) * (i + 1)) / steps;
    if (f(a) === 0) out.push(a);
    else if (f(a) * f(b) < 0) out.push(bisect(f, a, b));
  }
  return out;
}

/** A curve clamped so a steep arm leaves the picture without huge numbers in the SVG. */
export function clamped(f: (x: number) => number, limit: number): (x: number) => number {
  return (x) => {
    const y = f(x);
    return Number.isFinite(y) ? Math.max(-limit, Math.min(limit, y)) : y;
  };
}

/**
 * Numbers along the x-axis of a figure drawn by `plotSvg`, one at every whole
 * number, so a root can be read off as "between 1 and 2". Plain SVG text,
 * digits and a minus sign only: KaTeX cannot render inside SVG. The window is
 * read back out of the drawing's `data-plot`, so the numbers cannot disagree
 * with the curve.
 */
export function withAxisNumbers(svg: string): string {
  const plot = svg.match(/data-plot="([^"]+)"/);
  const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!plot || !box) throw new Error('withAxisNumbers needs a figure drawn by plotSvg');
  const [x0, x1, lo, hi] = plot[1].split(' ').map(Number);
  const width = Number(box[1]);
  const height = Number(box[2]);
  const pad = 12;
  const px = (x: number) => pad + ((x - x0) / (x1 - x0)) * (width - 2 * pad);
  const axis = pad + ((hi - 0) / (hi - lo)) * (height - 2 * pad);
  const below = axis + 11 <= height - 1;
  const textY = below ? axis + 11 : axis - 4;
  const parts: string[] = [];
  for (let x = Math.ceil(x0); x <= Math.floor(x1); x += 1) {
    const at = px(x);
    if (at < 6 || at > width - 6) continue;
    const label = x < 0 ? `−${-x}` : String(x);
    parts.push(
      `<line x1="${at.toFixed(1)}" y1="${(axis - 3).toFixed(1)}" x2="${at.toFixed(1)}" y2="${(axis + 3).toFixed(1)}" stroke="currentColor" stroke-width="1" opacity="0.7" />`,
      `<text x="${(x === 0 ? at - 5 : at).toFixed(1)}" y="${textY.toFixed(1)}" font-size="9" fill="currentColor" opacity="0.8" text-anchor="middle">${label}</text>`,
    );
  }
  return svg.replace(/<\/svg>$/, `${parts.join('')}</svg>`);
}
