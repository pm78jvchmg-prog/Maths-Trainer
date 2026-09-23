/**
 * The iteration-table generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves a slide agrees with itself:
 * the bank holds the answer, the TeX renders. It would pass a table whose
 * every row was computed with the wrong scheme. So this file re-derives each
 * row from the parameters with formulas written out again here, rounds them
 * without `toFixed`, and finds the root by bisection rather than by iterating,
 * which is the one way of reaching it the generator does not use.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import { hasAnswer, initialAnswer } from '../../ui/slides';
import type { Answer } from '../../engine/session';
import type { Generator, Slide } from '../types';
import {
  iterateFixedPoint,
  iterateNewtonRaphson,
  type FixedPointParams,
  type NewtonParams,
} from './iterationTable';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

type IterateSlide = Extract<Slide, { kind: 'iterate' }>;

/** Rounded by scaling, not by `toFixed`, so the two can disagree if the draw was unsafe. */
function rounded(value: number, dp: number): string {
  const unit = 10 ** dp;
  return (Math.round(value * unit) / unit).toFixed(dp);
}

/** A root of `f` in [lo, hi], by halving. Requires a sign change. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  let a = lo;
  let b = hi;
  expect(Math.sign(f(a)) * Math.sign(f(b)), `no sign change on [${lo}, ${hi}]`).toBe(-1);
  for (let n = 0; n < 200; n += 1) {
    const mid = (a + b) / 2;
    if (Math.sign(f(mid)) === Math.sign(f(a))) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/** Each fixed-point family, written out independently of the generator. */
function fixedPointMaths({ family, a, b }: FixedPointParams) {
  switch (family) {
    case 'sqrt':
      return { g: (x: number) => Math.sqrt(a * x + b), f: (x: number) => x ** 2 - a * x - b };
    case 'cbrt':
      return { g: (x: number) => Math.cbrt(a * x + b), f: (x: number) => x ** 3 - a * x - b };
    case 'recip':
      return { g: (x: number) => a / (x + b), f: (x: number) => x ** 2 + b * x - a };
    case 'square':
      return { g: (x: number) => (x ** 2 + b) / a, f: (x: number) => x ** 2 - a * x + b };
  }
}

function newtonMaths({ p, q, r }: NewtonParams) {
  const f = (x: number) => x ** 3 + p * x ** 2 + q * x + r;
  const df = (x: number) => 3 * x ** 2 + 2 * p * x + q;
  return { f, step: (x: number) => x - f(x) / df(x) };
}

function draws<P>(generator: Generator<P>) {
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      const slide = generator.render(params) as IterateSlide;
      return { params, slide, seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide, asked for real. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = {
    id: 'iterate-test',
    title: 'Iterate',
    slides: [],
    skillCheck: [{ type: 'literal' as const, slide }],
  };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

describe.each([
  ['iterate-fixed-point', iterateFixedPoint as Generator<unknown>],
  ['iterate-newton-raphson', iterateNewtonRaphson as Generator<unknown>],
])('%s', (_id, generator) => {
  const cases = draws(generator);

  it('is an iterate slide with four rows and a conclusion', () => {
    for (const { slide } of cases) {
      expect(slide.kind).toBe('iterate');
      expect(slide.answer).toHaveLength(5);
    }
  });

  it('grades the empty table wrong, its own answer right and a changed one wrong', () => {
    for (const { slide, seed } of cases) {
      const empty = initialAnswer(slide);
      expect(hasAnswer(slide, empty), `seed ${seed}: Check lit on an empty table`).toBe(false);
      expect(verdict(slide, empty)).toBe('incorrect');

      expect(hasAnswer(slide, slide.answer)).toBe(true);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');

      // One row swapped for a bank value that is not the one it needs.
      const row = seed % 4;
      const other = slide.bank.find((token) => token !== slide.answer[row])!;
      const perturbed = [...slide.answer];
      perturbed[row] = other;
      expect(verdict(slide, perturbed), `seed ${seed}: ${perturbed.join(' | ')}`).toBe('incorrect');
    }
  });

  it('offers every token the answer needs, and at least two it does not', () => {
    for (const { slide, seed } of cases) {
      const bank = [...slide.bank];
      for (const token of slide.answer) {
        const at = bank.indexOf(token);
        expect(at, `seed ${seed}: ${token} missing from the bank`).toBeGreaterThanOrEqual(0);
        bank.splice(at, 1);
      }
      expect(bank.length, `seed ${seed}: bank ${slide.bank.join(', ')}`).toBeGreaterThanOrEqual(2);
      // Sorted, never shuffled: a shuffle would let one question render two ways.
      const sorted = [...slide.bank].sort(
        (a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b),
      );
      expect(slide.bank).toEqual(sorted);
    }
  });

  it('renders the same slide twice from the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 30; seed += 1) {
        const once = generator.render(generator.sample(makeRng(seed), difficulty));
        const twice = generator.render(generator.sample(makeRng(seed), difficulty));
        expect(twice).toEqual(once);
      }
    }
  });
});

describe('iterate-fixed-point, against independent arithmetic', () => {
  const cases = draws(iterateFixedPoint);

  it('writes every row as the scheme gives it, to the places the prompt asks', () => {
    for (const { params, slide, seed } of cases) {
      const { g } = fixedPointMaths(params);
      let x = params.x0;
      for (let row = 0; row < 4; row += 1) {
        x = g(x);
        expect(slide.answer[row], `seed ${seed}, row ${row + 1}`).toBe(rounded(x, params.dp));
      }
    }
  });

  it('brackets the root found by bisection, with a sign change across the bracket', () => {
    for (const { params, slide, seed } of cases) {
      const { f, g } = fixedPointMaths(params);
      const match = /^(-?\d+\.\d) < \\alpha < (-?\d+\.\d)$/.exec(slide.answer[4]);
      expect(match, `seed ${seed}: ${slide.answer[4]}`).not.toBeNull();
      const lo = Number(match![1]);
      const hi = Number(match![2]);
      expect(hi - lo).toBeCloseTo(0.1, 9);
      const root = bisect(f, lo, hi);
      // The root in the bracket is the one this scheme is heading for: a fixed
      // point of g, close to where the fourth row landed.
      expect(Math.abs(g(root) - root), `seed ${seed}`).toBeLessThan(1e-9);
      expect(Math.abs(Number(slide.answer[3]) - root), `seed ${seed}`).toBeLessThan(0.1);
    }
  });
});

describe('iterate-newton-raphson, against independent arithmetic', () => {
  const cases = draws(iterateNewtonRaphson);

  it('writes every row as Newton-Raphson gives it, to the places the prompt asks', () => {
    for (const { params, slide, seed } of cases) {
      const { step } = newtonMaths(params);
      let x = params.x0;
      for (let row = 0; row < 4; row += 1) {
        x = step(x);
        expect(slide.answer[row], `seed ${seed}, row ${row + 1}`).toBe(rounded(x, params.dp));
      }
    }
  });

  it('converges to the root bisection finds, to the same places', () => {
    for (const { params, slide, seed } of cases) {
      const { f } = newtonMaths(params);
      const near = Number(slide.answer[4]);
      const half = 10 ** -params.dp;
      const root = bisect(f, near - half, near + half);
      expect(slide.answer[4], `seed ${seed}`).toBe(rounded(root, params.dp));
    }
  });
});
