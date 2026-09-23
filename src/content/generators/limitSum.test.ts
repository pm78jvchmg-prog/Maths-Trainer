/**
 * An independent check on the values behind the limit-of-a-sum level.
 *
 * Only `int-lim-sum-value` is a typed definite integral, so only it meets the
 * quadrature oracle in `generators.test.ts`. Every other value in the level is
 * a tree node, a tile, a slider position, a flow route or a marked option,
 * and would otherwise be checked by nothing but the generator agreeing with
 * itself. Here each one is read back off the rendered slide and compared with
 * what the question describes, worked out from scratch: rectangle sums added
 * up strip by strip, sums of k and k^2 added term by term, and areas and
 * limits found by Simpson's rule or by a rectangle sum with a very large n.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { valueOf } from '../expr';
import type { Generator, Slide } from '../types';
import {
  limitSumGenerators as g,
  type ApproachParams,
  type BoundParams,
  type EndsParams,
  type InNParams,
  type PiecesParams,
  type ReadParams,
  type RectSumParams,
  type SigmaParams,
  type StripParams,
  type SumLimitParams,
  type SumValueParams,
  type TurnParams,
  type WhichIntegralParams,
} from './integration';

const SEEDS = 60;

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

/** Coefficients lowest power first, evaluated here rather than by the generator. */
const evalPoly = (p: number[], x: number): number => p.reduce((total, c, i) => total + c * x ** i, 0);

function simpson(f: (x: number) => number, a: number, b: number, steps = 2000): number {
  const h = (b - a) / steps;
  let total = 0;
  for (let i = 0; i <= steps; i += 1) {
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * f(a + i * h);
  }
  return (total * h) / 3;
}

/** A left or right sum, strip by strip. */
function riemann(f: (x: number) => number, a: number, b: number, n: number, side: 'left' | 'right'): number {
  const h = (b - a) / n;
  let total = 0;
  for (let k = 0; k < n; k += 1) total += h * f(a + (side === 'left' ? k : k + 1) * h);
  return total;
}

/** `\frac{8}{3}`, `-\frac{1}{2}` or `12`, as a number. */
function texNumber(tex: string): number {
  const frac = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(tex);
  if (frac) return (frac[1] ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  return Number(tex);
}

/** The two limits of an `\int_{a}^{b}` tile. */
function intLimits(tex: string): [number, number] {
  const m = /^\\int_\{(-?\d+)\}\^\{(-?\d+)\}$/.exec(tex);
  if (!m) throw new Error(`not an integral tile: ${tex}`);
  return [Number(m[1]), Number(m[2])];
}

function correctLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error('not a choice');
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

describe('the limit-of-a-sum level, checked independently', () => {
  it('adds up the strips a strip tree asks for', () => {
    for (const { params, slide } of draws(g.stripTree as Generator<StripParams>)) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const { f, a, h, n, side } = params;
      const f0 = (x: number) => evalPoly(f, x);
      const answer = slide.answer.map(Number);
      expect(answer[answer.length - 1]).toBeCloseTo(riemann(f0, a, a + n * h, n, side), 9);
      const heights = Array.from({ length: n }, (_, k) => f0(a + (side === 'left' ? k : k + 1) * h));
      expect(answer.slice(0, n)).toEqual(heights);
    }
  });

  it('puts the right rectangle sum on the reduce line', () => {
    for (const { params, slide } of draws(g.rectSumLine as Generator<RectSumParams>)) {
      if (slide.kind !== 'reduce') throw new Error('not a reduce slide');
      const { power, a, h, n, side } = params;
      expect(valueOf(slide.expr)).toBeCloseTo(riemann((x) => x ** power, a, a + n * h, n, side), 9);
    }
  });

  it('marks the written sum whose heights the rectangles use', () => {
    for (const { params, slide } of draws(g.whichSum as Generator<StripParams>)) {
      const { a, h, n, side } = params;
      const xs = [...correctLabel(slide).matchAll(/f\((-?\d+)\)/g)].map((m) => Number(m[1]));
      const expected = Array.from({ length: n }, (_, k) => a + (side === 'left' ? k : k + 1) * h);
      expect(xs).toEqual(expected);
      expect(correctLabel(slide).startsWith(`${h}\\left[`)).toBe(true);
    }
  });

  it('starts and ends a sum on the right edges', () => {
    for (const { params, slide } of draws(g.sumEnds as Generator<EndsParams>)) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const { a, h, n, side } = params;
      const edges = Array.from({ length: n + 1 }, (_, k) => a + k * h);
      const used = side === 'left' ? edges.slice(0, n) : edges.slice(1);
      expect(slide.answer.map(Number)).toEqual([used[0], used[n - 1]]);
    }
  });

  /** The kth term of a sum, read from the parameters rather than the formulas. */
  const sigmaTerm = ({ form, a, b }: { form: string; a: number; b: number }, k: number): number => {
    if (form === 'k') return a * k;
    if (form === 'lin') return a * k + b;
    if (form === 'k2') return a * k * k;
    if (form === 'quad') return a * k * k + b;
    return a * k * k + b * k;
  };

  it('evaluates a sum to a given n by adding its terms', () => {
    for (const { params, slide } of draws(g.sigma as Generator<SigmaParams>)) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      let total = 0;
      for (let k = 1; k <= params.n; k += 1) total += sigmaTerm(params, k);
      expect(Number(slide.answer)).toBe(total);
    }
  });

  it('writes a sum to n as a formula that agrees term by term', () => {
    for (const { params, slide } of draws(g.sumInN as Generator<InNParams>)) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const formula = math.compile(slide.answer);
      let total = 0;
      for (let n = 1; n <= 12; n += 1) {
        total += sigmaTerm(params, n);
        expect(formula.evaluate({ n }) as number).toBeCloseTo(total, 9);
      }
    }
  });

  it('ends the simplified right sum on the integral', () => {
    for (const { params, slide } of draws(g.sumLimitSteps as Generator<SumLimitParams>)) {
      if (slide.kind !== 'steps') throw new Error('not steps');
      const { power, c, b } = params;
      const last = slide.reductions[slide.reductions.length - 1].value;
      const area = simpson((x) => c * x ** power, 0, b);
      expect(texNumber(last)).toBeCloseTo(area, 6);
      expect(Math.abs(riemann((x) => c * x ** power, 0, b, 100000, 'right') - area)).toBeLessThan(1e-3 * Math.max(1, area));
    }
  });

  it('plots sums that really are the rectangle sums, closing in on the integral', () => {
    for (const { params, slide } of draws(g.approachSlider as Generator<ApproachParams>)) {
      if (slide.kind !== 'slider' || !slide.figure) throw new Error('not a slider with a figure');
      const { power, c, b, side } = params;
      const f = (x: number) => c * x ** power;
      expect(slide.answer).toBeCloseTo(simpson(f, 0, b), 6);
      // The formula in the prompt, checked at every plotted n against the sum itself.
      const formula = /= (.*)\$, plotted/.exec((slide.prompt[0] as { text: string }).text)![1];
      const asMath = formula
        .replace(/\\left\(|\\right\)/g, (m) => (m === '\\left(' ? '(' : ')'))
        .replace(/\\frac\{(\d+)\}\{(\w+)\}/g, '($1/$2)')
        .replace(/\)\(/g, ')*(')
        .replace(/(\d)\(/g, '$1*(');
      for (let n = 1; n <= 10; n += 1) {
        expect(math.evaluate(asMath, { n }) as number, `${formula} at n = ${n}`).toBeCloseTo(riemann(f, 0, b, n, side), 9);
      }
    }
  });

  /** The limit of sum (w/n) c (a + wk/n)^p, as a rectangle sum with a great many strips. */
  const readLimit = ({ a, w, p, c }: ReadParams) => riemann((x) => c * x ** p, a, a + w, 200000, 'right');

  it('reads the limits and integrand the sum stands for', () => {
    for (const { params, slide } of draws(g.readTiles as Generator<ReadParams>)) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const [lower, upper] = intLimits(slide.answer[0]);
      const integrand = math.compile(slide.answer[1].replace(/\{|\}/g, '').replace(/(\d)x/, '$1*x'));
      const area = simpson((x) => integrand.evaluate({ x }) as number, lower, upper);
      expect(Math.abs(readLimit(params) - area)).toBeLessThan(1e-3 * Math.max(1, Math.abs(area)));
    }
  });

  it('follows a route that reads the right integral off the sum', () => {
    for (const { params, slide } of draws(g.identifyFlow as Generator<ReadParams>)) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const [width, start, integrand] = slide.answer.map((label) => label.replace(/\$/g, ''));
      const f = math.compile(integrand.replace(/\{|\}/g, '').replace(/(\d)x/, '$1*x'));
      const area = simpson((x) => f.evaluate({ x }) as number, Number(start), Number(start) + Number(width));
      expect(Math.abs(readLimit(params) - area)).toBeLessThan(1e-3 * Math.max(1, Math.abs(area)));
    }
  });

  it('marks the one term whose sum tends to the stated integral', () => {
    const TERM = /^\\frac\{(\d+)\}\{n\} (?:f\\left\(|\\left\()(?:(-?\d+) \+ )?\\frac\{(\d*)k\}\{n\}\\right\)/;
    for (const { params, slide } of draws(g.whichIntegral as Generator<WhichIntegralParams>)) {
      if (slide.kind !== 'choice') throw new Error('not a choice');
      const { a, w, p } = params;
      // Any function tells a right term from a wrong one; x^2 for the general f.
      const f = (x: number) => x ** (p === 0 ? 2 : p);
      const target = simpson(f, a, a + w);
      for (const option of slide.options) {
        const m = TERM.exec(option.label);
        expect(m, option.label).not.toBeNull();
        const [width, from, step] = [Number(m![1]), Number(m![2] ?? 0), Number(m![3] || 1)];
        const N = 20000;
        let total = 0;
        for (let k = 1; k <= N; k += 1) total += (width / N) * f(from + (step * k) / N);
        const right = Math.abs(total - target) < 1e-2 * Math.max(1, Math.abs(target));
        expect(right, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('gives the limit the sum itself tends to', () => {
    for (const { params, slide } of draws(g.sumValueTyped as Generator<SumValueParams>)) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const { f, a, w } = params;
      const sum = riemann((x) => evalPoly(f, x), a, a + w, 200000, 'right');
      expect(Math.abs(sum - Number(slide.answer))).toBeLessThan(1e-3 * Math.max(1, Math.abs(sum)));
    }
  });

  /** Whether f' changes sign strictly inside (a, b), found numerically. */
  const turnsInside = (f: (x: number) => number, a: number, b: number): boolean => {
    const slope = (x: number) => f(x + 1e-6) - f(x - 1e-6);
    const signs = Array.from({ length: 200 }, (_, i) => Math.sign(slope(a + ((b - a) * (i + 0.5)) / 200)));
    return signs.some((s) => s !== signs[0]);
  };

  it('calls a sum over or under only when it really is', () => {
    for (const { params, slide } of draws(g.overUnder as Generator<BoundParams>)) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const { f, a, h, n, side } = params;
      const f0 = (x: number) => evalPoly(f, x);
      const b = a + n * h;
      const last = slide.answer[slide.answer.length - 1];
      if (last === 'It turns') {
        expect(turnsInside(f0, a, b)).toBe(true);
        continue;
      }
      expect(turnsInside(f0, a, b)).toBe(false);
      const sum = riemann(f0, a, b, n, side);
      const area = simpson(f0, a, b);
      expect(last === 'lowest' ? sum < area : sum > area).toBe(true);
      expect(slide.answer[0] === 'Rising').toBe(f0(b) > f0(a));
    }
  });

  it('marks the right verdict and reason for the drawn sum', () => {
    for (const { params, slide } of draws(g.boundChoice as Generator<BoundParams & { drawn: boolean }>)) {
      const { f, a, h, n, side } = params;
      const f0 = (x: number) => evalPoly(f, x);
      const b = a + n * h;
      const label = correctLabel(slide);
      const under = riemann(f0, a, b, n, side) < simpson(f0, a, b);
      expect(label.includes('Under')).toBe(under);
      expect(label.includes('rises')).toBe(f0(b) > f0(a));
    }
  });

  it('brackets the area between the left and right sums', () => {
    for (const { params, slide } of draws(g.betweenTilesSum as Generator<StripParams>)) {
      if (slide.kind !== 'tiles') throw new Error('not tiles');
      const { f, a, h, n } = params;
      const f0 = (x: number) => evalPoly(f, x);
      const b = a + n * h;
      const [lower, upper] = slide.answer.map(Number);
      const sums = [riemann(f0, a, b, n, 'left'), riemann(f0, a, b, n, 'right')].sort((x, y) => x - y);
      expect(lower).toBeCloseTo(sums[0], 9);
      expect(upper).toBeCloseTo(sums[1], 9);
      const area = simpson(f0, a, b);
      expect(lower < area && area < upper).toBe(true);
    }
  });

  it('puts the marker where the curve turns', () => {
    for (const { params, slide } of draws(g.turnSlider as Generator<TurnParams>)) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const { s, k, p, q } = params;
      const f = (x: number) => s * k * (x - p) ** 2 + q;
      const slope = (x: number) => (f(x + 1e-4) - f(x - 1e-4)) / 2e-4;
      expect(Math.abs(slope(slide.answer))).toBeLessThan(1e-6);
      expect(slide.answer).toBeGreaterThan(slide.min);
      expect(slide.answer).toBeLessThan(slide.max);
    }
  });

  it('splits the integral into the terms that add up to it', () => {
    for (const { params, slide } of draws(g.piecesTree as Generator<PiecesParams>)) {
      if (slide.kind !== 'tree') throw new Error('not a tree');
      const { c, d, e, a, b } = params;
      const answer = slide.answer.map(Number);
      const pieces = [simpson((x) => c * x * x, a, b), ...(d !== 0 ? [simpson((x) => d * x, a, b)] : []), simpson(() => e, a, b)];
      pieces.forEach((piece, i) => expect(answer[i]).toBeCloseTo(piece, 6));
      expect(answer[answer.length - 1]).toBeCloseTo(simpson((x) => c * x * x + d * x + e, a, b), 6);
    }
  });
});
