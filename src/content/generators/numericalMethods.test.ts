/**
 * The Numerical Methods generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * table computed with the wrong scheme, a trapezium sum that forgot to double
 * the middle, or a "converges" option that diverges. So each check here
 * reaches the answer by a route the generator does not take: rows re-derived
 * with the formulas written out again and rounded without `toFixed`, roots
 * found by bisection rather than by iterating, schemes actually run to see
 * whether they converge, the trapezium rule summed strip by strip, and exact
 * integrals by Simpson's rule, which is exact for a cubic.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

type Poly = number[];

const valueAt = (p: Poly, x: number) => p.reduce((acc, c) => acc * x + c, 0);

/** Rounded by scaling, not by `toFixed`, so the two can disagree if a draw was unsafe. */
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

/** A gradient by central difference, knowing nothing of the formula. */
const gradient = (f: (x: number) => number, x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;

/** Simpson's rule, exact for polynomials up to degree three. */
function simpson(f: (x: number) => number, a: number, b: number): number {
  const steps = 200;
  const h = (b - a) / steps;
  let total = 0;
  for (let i = 0; i <= steps; i += 1) {
    const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
    total += weight * f(a + i * h);
  }
  return (total * h) / 3;
}

/** The trapezium rule strip by strip, which is not how the generator sums it. */
function trapezia(f: (x: number) => number, a: number, h: number, n: number): number {
  let area = 0;
  for (let i = 0; i < n; i += 1) area += (h * (f(a + i * h) + f(a + (i + 1) * h))) / 2;
  return area;
}

function draws<P>(id: string) {
  const generator = registry[id] as unknown as Generator<P>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'nm-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/* ---------- iteration tables ---------- */

interface FixedLimitParams {
  family: 'sqrt' | 'cbrt' | 'recip' | 'square';
  a: number;
  b: number;
  x0: number;
  dp: number;
}

function fixedMaths({ family, a, b }: FixedLimitParams) {
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

describe('numer-fixed-limit, against independent arithmetic', () => {
  const cases = draws<FixedLimitParams>('numer-fixed-limit');

  it('writes every row as the scheme gives it, and settles on the root bisection finds', () => {
    for (const { params, slide, seed } of cases) {
      if (slide.kind !== 'iterate') throw new Error('not an iterate slide');
      const { g, f } = fixedMaths(params);
      let x = params.x0;
      for (let row = 0; row < 4; row += 1) {
        x = g(x);
        expect(slide.answer[row], `seed ${seed}, row ${row + 1}`).toBe(rounded(x, params.dp));
      }
      const near = Number(slide.answer[4]);
      const half = 10 ** -params.dp;
      const root = bisect(f, near - half, near + half);
      expect(slide.answer[4], `seed ${seed}`).toBe(rounded(root, params.dp));
      expect(Math.abs(g(root) - root)).toBeLessThan(1e-9);
    }
  });

  it('grades its own table right and a changed row wrong', () => {
    for (const { slide, seed } of cases.slice(0, 60)) {
      if (slide.kind !== 'iterate') throw new Error('not an iterate slide');
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
      const row = seed % 4;
      const perturbed = [...slide.answer];
      perturbed[row] = slide.bank.find((token) => token !== slide.answer[row])!;
      expect(verdict(slide, perturbed), `seed ${seed}`).toBe('incorrect');
    }
  });
});

interface RootParams {
  k: 2 | 3;
  N: number;
  x0: number;
  dp: number;
}

describe('numer-newton-root-iterate, against independent arithmetic', () => {
  const cases = draws<RootParams>('numer-newton-root-iterate');

  it('writes every row as Newton-Raphson gives it, and ends on the root to the places asked', () => {
    for (const { params, slide, seed } of cases) {
      if (slide.kind !== 'iterate') throw new Error('not an iterate slide');
      const { k, N } = params;
      const f = (x: number) => x ** k - N;
      let x = params.x0;
      for (let row = 0; row < 4; row += 1) {
        x = x - f(x) / (k * x ** (k - 1));
        expect(slide.answer[row], `seed ${seed}, row ${row + 1}`).toBe(rounded(x, params.dp));
      }
      const root = bisect(f, 0, N + 1);
      expect(slide.answer[4], `seed ${seed}`).toBe(rounded(root, params.dp));
    }
  });
});

/* ---------- the sign test ---------- */

describe('numer-sign-interval', () => {
  it('marks as correct the one interval bisection finds a root in', () => {
    for (const { params, slide, seed } of draws<{ p: number; q: number }>('numer-sign-interval')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const f = (x: number) => x ** 3 + params.p * x + params.q;
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      const [lo, hi] = right.label.replace(/[[\]\\ ]/g, '').split(',').map(Number);
      const root = bisect(f, lo, hi);
      expect(Math.abs(f(root)), `seed ${seed}`).toBeLessThan(1e-6);
    }
  });
});

/* ---------- rearrangements ---------- */

interface WhichParams {
  p: number;
  q: number;
  alpha: number;
}

describe('numer-which-converges', () => {
  it('marks as correct the one rearrangement that, run from beside the root, converges to it', () => {
    for (const { params, slide, seed } of draws<WhichParams>('numer-which-converges')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const { p, q } = params;
      const f = (x: number) => x ** 3 + p * x + q;
      const alpha = bisect(f, params.alpha - 0.01, params.alpha + 0.01);
      // Each option's g, read from its label by shape rather than taken from the generator.
      const schemes: Record<string, (x: number) => number> = {
        cbrt: (x) => Math.cbrt(-p * x - q),
        divide: (x) => -(x ** 3 + q) / p,
        recip: (x) => -q / (x * x + p),
        sqrt: (x) => Math.sqrt(-p - q / x),
      };
      const shapeOf = (label: string) =>
        label.includes('\\sqrt[3]') ? 'cbrt' : label.includes('\\sqrt') ? 'sqrt' : label.includes('x^{3}') ? 'divide' : 'recip';
      for (const option of slide.options) {
        const g = schemes[shapeOf(option.label)];
        let x = alpha + 0.001;
        for (let n = 0; n < 400 && Number.isFinite(x) && Math.abs(x) < 100; n += 1) x = g(x);
        const converged = Number.isFinite(x) && Math.abs(x - alpha) < 1e-6;
        expect(converged, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

/* ---------- Newton-Raphson ---------- */

describe('numer-newton-tree', () => {
  it('lands where the tangent at x_0 meets the axis', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; x0: number }>('numer-newton-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const f = (x: number) => valueAt(params.poly, x);
      const x1 = Number(slide.answer[3]);
      const tangent = f(params.x0) + gradient(f, params.x0) * (x1 - params.x0);
      expect(Math.abs(tangent), `seed ${seed}`).toBeLessThan(1e-5);
    }
  });
});

describe('numer-tangent-slider', () => {
  it('asks for where the tangent at x_0 meets the axis', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; x0: number }>('numer-tangent-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const f = (x: number) => valueAt(params.poly, x);
      const tangent = f(params.x0) + gradient(f, params.x0) * (slide.answer - params.x0);
      expect(Math.abs(tangent), `seed ${seed}`).toBeLessThan(1e-5);
    }
  });
});

describe('numer-bounds-steps', () => {
  it('finds a change of sign exactly when the claim is the root rounded', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; dp: number; claimUnits: number }>('numer-bounds-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const f = (x: number) => valueAt(params.poly, x);
      const unit = 10 ** -params.dp;
      const claim = params.claimUnits * unit;
      // The root nearest the claim, found by bisection on a window around it.
      const root = bisect(f, claim - 3 * unit, claim + 3 * unit);
      const right = rounded(root, params.dp) === claim.toFixed(params.dp);
      expect(slide.reductions[2].value, `seed ${seed}`).toBe(right ? '< 0' : '> 0');
    }
  });
});

describe('numer-stop-flow', () => {
  it('confirms a root exactly when it rounds to where the iterates agree', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; dp: number; x3: string; x4: string }>('numer-stop-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const f = (x: number) => valueAt(params.poly, x);
      const near = Number(params.x4);
      const root = bisect(f, near - 0.02, near + 0.02);
      const agree = Number(params.x3).toFixed(params.dp) === Number(params.x4).toFixed(params.dp);
      const expected = !agree ? ['No'] : rounded(root, params.dp) === near.toFixed(params.dp) ? ['Yes', 'Yes'] : ['Yes', 'No'];
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
    }
  });
});

/* ---------- the trapezium rule ---------- */

interface TrapParams {
  fn: 'quad' | 'pow2' | 'recip';
  poly: Poly;
  k: number;
  a: number;
  h: number;
  n: number;
}

const trapF = ({ fn, poly, k }: TrapParams) =>
  fn === 'pow2' ? (x: number) => 2 ** x : fn === 'recip' ? (x: number) => k / x : (x: number) => valueAt(poly, x);

describe('the trapezium rule, summed strip by strip', () => {
  it('numer-ordinates-tree ends on the estimate', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-ordinates-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const area = trapezia(trapF(params), params.a, params.h, params.n);
      expect(Number(slide.answer[7]), `seed ${seed}`).toBeCloseTo(area, 9);
      // Every height is whole, so the table is written without decimals.
      for (const y of slide.answer.slice(0, 4)) expect(Number.isInteger(Number(y)), `seed ${seed}: ${y}`).toBe(true);
    }
  });

  it('numer-trapezium-estimate asks for the estimate, not the integral', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-trapezium-estimate')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const area = trapezia(trapF(params), params.a, params.h, params.n);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(area, 9);
      // Declaring these would send the estimate to the quadrature oracle,
      // which grades it against the exact integral.
      expect(slide.integrand).toBeUndefined();
      expect(slide.limits).toBeUndefined();
    }
  });

  it('numer-trapezium-steps works out to the estimate', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-trapezium-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const area = trapezia(trapF(params), params.a, params.h, params.n);
      expect(Number(slide.reductions[slide.reductions.length - 1].value), `seed ${seed}`).toBeCloseTo(area, 9);
    }
  });

  it('numer-mean-height-slider asks for the height whose rectangle has the trapezia\'s area', () => {
    for (const { params, slide, seed } of draws<{ trap: TrapParams }>('numer-mean-height-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const { trap } = params;
      const area = trapezia(trapF(trap), trap.a, trap.h, trap.n);
      expect(slide.answer * trap.h * trap.n, `seed ${seed}`).toBeCloseTo(area, 9);
    }
  });

  it('numer-error-value is the estimate minus the exact integral', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; a: number; n: number }>('numer-error-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const f = (x: number) => valueAt(params.poly, x);
      const b = params.a + params.n;
      const error = trapezia(f, params.a, 1, params.n) - simpson(f, params.a, b);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(error, 6);
    }
  });
});

describe('numer-concavity-flow', () => {
  it('reads the sign of the second derivative across the whole interval', () => {
    type Params = { kind: 'cubic' | 'recip'; r: number; p: number; q: number; k: number; a: number };
    for (const { params, slide, seed } of draws<Params>('numer-concavity-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const f = params.kind === 'recip' ? (x: number) => params.k / x : (x: number) => valueAt([1, params.r, params.p, params.q], x);
      const second = (x: number) => (f(x + 1e-3) - 2 * f(x) + f(x - 1e-3)) / 1e-6;
      const signs = [0, 0.5, 1, 1.5, 2].map((t) => Math.sign(second(params.a + t)));
      expect(new Set(signs).size, `seed ${seed}: f'' changes sign`).toBe(1);
      expect(slide.answer[1], `seed ${seed}`).toBe(signs[0] > 0 ? 'Positive' : 'Negative');
    }
  });
});

/* ---------- level 3: bounds and errors ---------- */

/** A rounded value's bounds, worked from the rounding rather than taken from the generator. */
const bounds = (value: number, dp: number): [number, number] => [value - 0.5 / 10 ** dp, value + 0.5 / 10 ** dp];

/** Every corner of a box of bounds: a calculation that is monotone in each input is extreme at one. */
function corners(boxes: [number, number][]): number[][] {
  return boxes.reduce<number[][]>((acc, [lo, hi]) => acc.flatMap((c) => [[...c, lo], [...c, hi]]), [[]]);
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

type Exact = { kind: 'frac' | 'sqrt' | 'cbrt'; a: number; b: number };
const exactNumber = ({ kind, a, b }: Exact) => (kind === 'frac' ? a / b : kind === 'sqrt' ? a ** 0.5 : a ** (1 / 3));

describe('Numerical Methods level 3: bounds and errors, against independent arithmetic', () => {
  it('numer-abs-error is the iterate minus the root, which bisection finds from the equation', () => {
    type P = { p: number; q: number; r: number; estimate: number };
    for (const { params, slide, seed } of draws<P>('numer-abs-error')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const f = (x: number) => (params.q * x - params.p) * (x + params.r);
      const alpha = bisect(f, 0.01, 7);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(params.estimate - alpha, 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-abs-size-steps ends on the size of the difference, having passed through its sign', () => {
    for (const { params, slide, seed } of draws<{ num: number; den: number; estimate: number }>('numer-abs-size-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const error = params.estimate - params.num / params.den;
      expect(Number(slide.reductions[1].value), `seed ${seed}`).toBeCloseTo(error, 9);
      expect(Number(slide.reductions[2].value), `seed ${seed}`).toBeCloseTo(Math.abs(error), 9);
    }
  });

  it('numer-closest-choice marks the estimate nearest the exact value, and only that one', () => {
    for (const { params, slide, seed } of draws<{ exact: Exact }>('numer-closest-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const value = exactNumber(params.exact);
      const gaps = slide.options.map((o) => Math.abs(Number(o.label) - value));
      const best = gaps.indexOf(Math.min(...gaps));
      expect(slide.options[best].id, `seed ${seed}`).toBe(slide.correctId);
      expect(gaps.filter((g) => g < gaps[best] * 1.5).length, `seed ${seed}: a near tie`).toBe(1);
    }
  });

  it('numer-over-under-flow reads the sign of the error and whether the estimate is the value rounded', () => {
    for (const { params, slide, seed } of draws<{ exact: Exact; estimate: string; dp: number }>('numer-over-under-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const value = exactNumber(params.exact);
      const sign = Number(params.estimate) > value ? 'Positive' : 'Negative';
      const isRounded = rounded(value, params.dp) === params.estimate;
      expect(slide.answer, `seed ${seed}`).toEqual([sign, isRounded ? 'Yes' : 'No']);
    }
  });

  it('numer-rel-error divides the error by the exact value, never the estimate', () => {
    type P = { exact: number; rel: number; percent: boolean };
    for (const { params, slide, seed } of draws<P>('numer-rel-error')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      // The estimate is read back out of the prompt, as the learner reads it.
      const prose = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
      const numbers = [...prose.matchAll(/\$(-?\d+(?:\.\d+)?)\$/g)].map((m) => Number(m[1]));
      const estimate = numbers.find((n) => !close(n, params.exact))!;
      const rel = (estimate - params.exact) / params.exact;
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(params.percent ? 100 * rel : rel, 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-rel-tiles builds a calculation that comes to the value it claims', () => {
    for (const { params, slide, seed } of draws<{ exact: number; rel: number; percent: boolean }>('numer-rel-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const [estimate, exact, divisor, value] = slide.answer.map(Number);
      expect(exact, `seed ${seed}`).toBe(params.exact);
      const worked = ((estimate - exact) / divisor) * (params.percent ? 100 : 1);
      expect(value, `seed ${seed}`).toBeCloseTo(worked, 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-rel-slider asks for the value that gives the stated percentage error', () => {
    for (const { params, slide, seed } of draws<{ exact: number; pct: number; inverse: boolean }>('numer-rel-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const exact = params.inverse ? slide.answer : params.exact;
      const estimate = params.inverse ? params.exact * (1 + params.pct / 100) : slide.answer;
      expect((100 * (estimate - exact)) / exact, `seed ${seed}`).toBeCloseTo(params.pct, 9);
    }
  });

  it('numer-rel-compare marks the measurement with the extreme error for its size', () => {
    for (const { params, slide, seed } of draws<{ largest: boolean }>('numer-rel-compare')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const rels = slide.options.map((o) => {
        const [exact, measured] = [...o.label.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
        return Math.abs(measured - exact) / exact;
      });
      const target = params.largest ? Math.max(...rels) : Math.min(...rels);
      expect(slide.options[rels.indexOf(target)].id, `seed ${seed}`).toBe(slide.correctId);
    }
  });

  it('numer-bound-tree gives the least and greatest result over every pair of ends', () => {
    type R = { value: number; dp: number };
    for (const { params, slide, seed } of draws<{ a: R; b: R; op: 'sum' | 'diff' | 'prod' }>('numer-bound-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const op = (x: number, y: number) => (params.op === 'sum' ? x + y : params.op === 'diff' ? x - y : x * y);
      const results = corners([bounds(params.a.value, params.a.dp), bounds(params.b.value, params.b.dp)]).map(([x, y]) => op(x, y));
      expect(Number(slide.answer[4]), `seed ${seed}`).toBeCloseTo(Math.min(...results), 9);
      expect(Number(slide.answer[5]), `seed ${seed}`).toBeCloseTo(Math.max(...results), 9);
    }
  });

  it('numer-bound-value is the extreme of the calculation over every corner', () => {
    type R = { value: number; dp: number };
    type P = { op: 'sum' | 'diff' | 'prod' | 'prodDiff' | 'diffProd'; xs: R[]; upper: boolean };
    const calc = {
      sum: ([x, y]: number[]) => x + y,
      diff: ([x, y]: number[]) => x - y,
      prod: ([x, y]: number[]) => x * y,
      prodDiff: ([x, y, z]: number[]) => x * y - z,
      diffProd: ([x, y, z]: number[]) => (x - y) * z,
    };
    for (const { params, slide, seed } of draws<P>('numer-bound-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const results = corners(params.xs.map((x) => bounds(x.value, x.dp))).map(calc[params.op]);
      const expected = params.upper ? Math.max(...results) : Math.min(...results);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(expected, 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-bound-ends marks the calculation that reaches the extreme over every corner', () => {
    type R = { value: number; dp: number };
    type P = { shape: 'quot' | 'quotDiff' | 'diffQuot' | 'subQuot'; xs: R[]; lower: boolean };
    const calc = {
      quot: ([a, b]: number[]) => a / b,
      quotDiff: ([a, b, c]: number[]) => a / (b - c),
      diffQuot: ([a, b, c]: number[]) => (a - b) / c,
      subQuot: ([a, b, c]: number[]) => a - b / c,
    };
    for (const { params, slide, seed } of draws<P>('numer-bound-ends')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const results = corners(params.xs.map((x) => bounds(x.value, x.dp))).map(calc[params.shape]);
      const extreme = params.lower ? Math.min(...results) : Math.max(...results);
      // Each option's value, from the numbers written in its label.
      const values = slide.options.map((o) => calc[params.shape]([...o.label.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))));
      for (const [i, option] of slide.options.entries()) {
        expect(close(values[i], extreme), `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('numer-bound-accuracy-flow quotes the result only as far as both bounds agree', () => {
    type R = { value: number; dp: number };
    for (const { params, slide, seed } of draws<{ op: 'sum' | 'prod'; x: R; y: R }>('numer-bound-accuracy-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const op = (a: number, b: number) => (params.op === 'sum' ? a + b : a * b);
      const results = corners([bounds(params.x.value, params.x.dp), bounds(params.y.value, params.y.dp)]).map(([a, b]) => op(a, b));
      const [lo, hi] = [Math.min(...results), Math.max(...results)];
      expect(Number(slide.answer[0].replace(/\$/g, '')), `seed ${seed}`).toBeCloseTo(lo, 9);
      const rest = rounded(lo, 1) === rounded(hi, 1) ? ['Yes'] : rounded(lo, 0) === rounded(hi, 0) ? ['No', 'Yes'] : ['No', 'No'];
      expect(slide.answer.slice(1), `seed ${seed}`).toEqual(rest);
    }
  });

  it('numer-carry-tree runs the scheme at both bounds of x_n, and the bracket narrows', () => {
    for (const { params, slide, seed } of draws<FixedLimitParams & { c: number }>('numer-carry-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { g } = fixedMaths(params);
      const [lo, hi] = bounds(params.c, params.dp);
      expect(Number(slide.answer[0]), `seed ${seed}`).toBeCloseTo(lo, 9);
      expect(Number(slide.answer[1]), `seed ${seed}`).toBeCloseTo(hi, 9);
      expect(slide.answer[2], `seed ${seed}`).toBe(rounded(g(lo), 4));
      expect(slide.answer[3], `seed ${seed}`).toBe(rounded(g(hi), 4));
      expect(Number(slide.answer[4]), `seed ${seed}`).toBeLessThan(hi - lo);
    }
  });

  type ExactScheme = { family: 'square' | 'recip' | 'fall'; alpha: number; m: number };
  const exactG = ({ family, alpha, m }: ExactScheme) =>
    family === 'square'
      ? (x: number) => (x * x + alpha * m) / (alpha + m)
      : family === 'recip'
        ? (x: number) => (alpha * (alpha + m)) / (x + m)
        : (x: number) => (alpha * alpha + alpha * m - x * x) / m;

  it('numer-carry-error is the gradient at the root times the error, and one real step agrees', () => {
    for (const { params, slide, seed } of draws<ExactScheme & { delta: number }>('numer-carry-error')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const g = exactG(params);
      expect(Math.abs(g(params.alpha) - params.alpha), `seed ${seed}: alpha is not a root`).toBeLessThan(1e-12);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(gradient(g, params.alpha) * params.delta, 6);
      // The first-order estimate misses a real step by no more than the square of the error, give or take.
      const real = g(params.alpha + params.delta) - params.alpha;
      expect(Math.abs(real - Number(slide.answer)), `seed ${seed}`).toBeLessThan(2 * params.delta ** 2);
    }
  });

  it('numer-carry-slider asks for the extreme of g across the bounds of x_n', () => {
    type P = { family: 'square' | 'recip'; a: number; b: number; c: number; upper: boolean };
    for (const { params, slide, seed } of draws<P>('numer-carry-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const g = params.family === 'square' ? (x: number) => (x ** 2 + params.b) / params.a : (x: number) => params.a / (x + params.b);
      const values = [params.c - 0.5, params.c + 0.5].map(g);
      expect(slide.answer, `seed ${seed}`).toBeCloseTo(params.upper ? Math.max(...values) : Math.min(...values), 9);
    }
  });

  it('numer-shrink-flow multiplies by the gradient and grows exactly when |g\'(α)| > 1', () => {
    for (const { params, slide, seed } of draws<ExactScheme & { delta: number }>('numer-shrink-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const g = exactG(params);
      const slope = gradient(g, params.alpha);
      expect(Number(slide.answer[0].replace(/\$/g, '')), `seed ${seed}`).toBeCloseTo(slope * params.delta, 6);
      // Run the scheme from beside the root to see which way the error goes.
      let x = params.alpha + 1e-4;
      for (let n = 0; n < 20 && Math.abs(x - params.alpha) < 1; n += 1) x = g(x);
      const grew = Math.abs(x - params.alpha) > 1e-4;
      expect(slide.answer[1], `seed ${seed}`).toBe(grew ? 'No' : 'Yes');
    }
  });

  /** The first k with r^k δ < ε, found by stepping rather than by logarithms. */
  function stepsNeeded(r: number, delta: number, eps: number): number {
    let error = delta;
    let k = 0;
    while (error >= eps) {
      error *= r;
      k += 1;
    }
    return k;
  }

  it('numer-k-count is the first k for which the error bound is below the target', () => {
    for (const { params, slide, seed } of draws<{ r: number; delta: number; eps: number; scheme?: ExactScheme }>('numer-k-count')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const r = params.scheme ? Math.abs(gradient(exactG(params.scheme), params.scheme.alpha)) : params.r;
      expect(Number(slide.answer), `seed ${seed}`).toBe(stepsNeeded(r, params.delta, params.eps));
    }
  });

  it('numer-k-tiles builds a condition that holds first at the k stepping finds', () => {
    for (const { params, slide, seed } of draws<{ r: number; delta: number; eps: number; logs: boolean }>('numer-k-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const k = stepsNeeded(params.r, params.delta, params.eps);
      const holds = params.logs
        ? (n: number) => n > Math.log(Number(slide.answer[0])) / Math.log(Number(slide.answer[1]))
        : (n: number) => Number(slide.answer[0]) ** n * Number(slide.answer[1]) < Number(slide.answer[2]);
      expect(holds(k) && !holds(k - 1), `seed ${seed}`).toBe(true);
    }
  });

  it('numer-k-logs-steps works out to a quotient whose next whole number is the k stepping finds', () => {
    for (const { params, slide, seed } of draws<{ r: number; delta: number; eps: number }>('numer-k-logs-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const quotient = Number(slide.reductions[2].value);
      expect(quotient, `seed ${seed}`).toBeCloseTo(Math.log(params.eps / params.delta) / Math.log(params.r), 2);
      expect(Math.ceil(quotient), `seed ${seed}`).toBe(stepsNeeded(params.r, params.delta, params.eps));
    }
  });

  it('numer-error-iterate writes every row as the scheme gives it, and brackets the root bisection finds', () => {
    for (const { params, slide, seed } of draws<FixedLimitParams>('numer-error-iterate')) {
      if (slide.kind !== 'iterate') throw new Error('not an iterate slide');
      const { g, f } = fixedMaths(params);
      let x = params.x0;
      for (let row = 0; row < 4; row += 1) {
        x = g(x);
        expect(slide.answer[row], `seed ${seed}, row ${row + 1}`).toBe(rounded(x, params.dp));
      }
      let root = x;
      for (let n = 0; n < 500; n += 1) root = g(root);
      const tenth = Math.floor(bisect(f, root - 0.01, root + 0.01) * 10);
      expect(slide.answer[4], `seed ${seed}`).toBe(`${(tenth / 10).toFixed(1)} < \\alpha < ${((tenth + 1) / 10).toFixed(1)}`);
    }
  });
});

/* ---------- level 4: Simpson's rule ---------- */

/**
 * Simpson's rule pair by pair, by fitting each parabola and integrating it:
 * through (x_1 - h, y_0), (x_1, y_1), (x_1 + h, y_2) the parabola is
 * y_1 + b u + c u^2 with u = x - x_1 and c = (y_0 - 2y_1 + y_2) / 2h^2, whose
 * integral over [-h, h] is 2h y_1 + 2c h^3 / 3. No weights 1, 4, 2 anywhere.
 */
function parabolaAreas(ys: number[], h: number): number {
  expect((ys.length - 1) % 2, 'Simpson needs an even number of strips').toBe(0);
  let area = 0;
  for (let i = 0; i + 2 < ys.length; i += 2) {
    const c = (ys[i] - 2 * ys[i + 1] + ys[i + 2]) / (2 * h * h);
    area += 2 * h * ys[i + 1] + (2 * c * h ** 3) / 3;
  }
  return area;
}

const heightsOf = (f: (x: number) => number, a: number, h: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => f(a + i * h));

/** A polynomial's integral by the power rule, highest power first. */
function integratePoly(poly: Poly, a: number, b: number): number {
  const top = poly.length - 1;
  return poly.reduce((sum, c, i) => sum + (c * (b ** (top - i + 1) - a ** (top - i + 1))) / (top - i + 1), 0);
}

/** A bracket written with numbers, `5 + 4(7) + 9`, worked out. */
const bracketValue = (label: string) => Number(math.evaluate(label.replace(/(\d)\(/g, '$1*(')));

/** Every number in a line of TeX, in order. */
const numbersIn = (tex: string) => [...tex.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));

/** The two rows of a readings table: the x values, then the readings. */
function tableRows(slide: Slide): [number[], number[]] {
  const table = slide.kind === 'teach' ? undefined : slide.prompt.find((b) => b.kind === 'display' && b.tex.includes('\\hline'));
  if (!table || table.kind !== 'display') throw new Error('no table');
  // A long table is split into two arrays, one above the other.
  const parts = table.tex.split('\\end{array}').filter((part) => part.includes('\\hline'));
  const rows = parts.map((part) => {
    const [top, bottom] = part.replace(/^[^]*\\begin\{array\}\{[^}]*\}/, '').split('\\hline');
    return [numbersIn(top.split('\\\\')[0]), numbersIn(bottom)];
  });
  return [rows.flatMap((row) => row[0]), rows.flatMap((row) => row[1])];
}

/**
 * An integrand as the learner reads it, turned into mathjs, for the checks
 * that classify it by its values rather than by the generator's label.
 */
function integrandOf(tex: string): (x: number) => number {
  let s = tex;
  for (let i = 0; i < 3; i += 1) s = s.replace(/\^\{([^{}]*)\}/g, '^($1)');
  s = s
    .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/\\ln x/g, 'log(x)')
    .replace(/\\sin x/g, 'sin(x)')
    .replace(/(x|\)|\d)(?=\(|sqrt|log)/g, '$1*');
  const node = math.compile(s);
  return (x) => Number(node.evaluate({ x }));
}

/** The k-th forward difference at unit spacing: zero for a polynomial of degree below k. */
function difference(f: (x: number) => number, k: number, from = 1.3): number {
  let values = Array.from({ length: k + 1 }, (_, i) => f(from + i * 0.7));
  for (let j = 0; j < k; j += 1) values = values.slice(1).map((v, i) => v - values[i]);
  return values[0];
}

/** Degree 3 or less exactly when the fourth difference vanishes; a polynomial when the sixth does (every one here is degree 5 at most). */
function classify(tex: string): 'exact' | 'high' | 'other' {
  const f = integrandOf(tex);
  const scale = Math.max(1, Math.abs(f(2)), Math.abs(f(5)));
  if (Math.abs(difference(f, 6)) > 1e-7 * scale) return 'other';
  return Math.abs(difference(f, 4)) > 1e-7 * scale ? 'high' : 'exact';
}

describe("Numerical Methods level 4: Simpson's rule, parabola by parabola", () => {
  it('numer-simpson-tiles puts h/3 in front, the ends once, the odd heights by 4 and the even by 2', () => {
    for (const { params, slide, seed } of draws<{ h: number; n: number }>('numer-simpson-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const { h, n } = params;
      expect(3 * Number(slide.answer[0]), `seed ${seed}`).toBeCloseTo(h, 9);
      expect(slide.answer[1], `seed ${seed}`).toBe(`y_0 + y_${n}`);
      const indices = (token: string) => [...token.matchAll(/y_(\d)/g)].map((m) => Number(m[1]));
      const odd = indices(slide.answer[2]);
      const even = n > 2 ? indices(slide.answer[3]) : [];
      expect(odd.every((i) => i % 2 === 1) && even.every((i) => i % 2 === 0), `seed ${seed}`).toBe(true);
      expect([...odd, ...even].sort((x, y) => x - y), `seed ${seed}`).toEqual(Array.from({ length: n - 1 }, (_, i) => i + 1));
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
      if (n > 2) {
        const swapped = [slide.answer[0], slide.answer[1], slide.answer[3], slide.answer[2]];
        expect(verdict(slide, swapped), `seed ${seed}`).toBe('incorrect');
      }
    }
  });

  it('numer-parabola-tree ends on the area under the parabola through the three heights', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-parabola-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const ys = heightsOf(trapF(params), params.a, params.h, 2);
      expect(slide.answer.slice(0, 3).map(Number), `seed ${seed}`).toEqual(ys);
      expect(Number(slide.answer[5]), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, params.h), 9);
    }
  });

  it('numer-simpson-steps works out to the parabolas\' area', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-simpson-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const ys = heightsOf(trapF(params), params.a, params.h, params.n);
      expect(Number(slide.reductions[slide.reductions.length - 1].value), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, params.h), 9);
    }
  });

  it('numer-weights-choice marks the one bracket that gives the parabolas\' area', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-weights-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const ys = heightsOf(trapF(params), params.a, params.h, params.n);
      const area = parabolaAreas(ys, params.h);
      for (const option of slide.options) {
        const hits = Math.abs((params.h / 3) * bracketValue(option.label) - area) < 1e-9;
        expect(hits, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('numer-weights-tiles weights the heights it shows so that h/3 times the sum is the parabolas\' area', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-weights-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const shown = [...slide.template.matchAll(/\((\d+)\)/g)].map((m) => Number(m[1]));
      expect(shown, `seed ${seed}`).toEqual(heightsOf(trapF(params), params.a, params.h, params.n));
      const sum = shown.reduce((s, y, i) => s + Number(slide.answer[i]) * y, 0);
      expect((params.h / 3) * sum, `seed ${seed}`).toBeCloseTo(parabolaAreas(shown, params.h), 9);
    }
  });

  it('numer-simpson-estimate asks for the estimate, not the integral', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-simpson-estimate')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const ys = heightsOf(trapF(params), params.a, params.h, params.n);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, params.h), 9);
      expect(slide.integrand).toBeUndefined();
      expect(slide.limits).toBeUndefined();
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-odd-flow counts the strips from the prompt and pairs them only when even', () => {
    for (const { slide, seed } of draws<unknown>('numer-odd-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const prose = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
      const listed = prose.match(/at \$x = ([^$]+)\$/);
      const ranged = prose.match(/every \$([\d.]+)\$ from \$x = ([\d.]+)\$ to \$x = ([\d.]+)\$/);
      const strips = listed ? listed[1].split(',').length - 1 : (Number(ranged![3]) - Number(ranged![2])) / Number(ranged![1]);
      expect(slide.answer[0], `seed ${seed}`).toBe(String(strips));
      expect(slide.answer.slice(1, 2), `seed ${seed}`).toEqual([strips % 2 === 0 ? 'Yes' : 'No']);
      expect(slide.answer.length, `seed ${seed}`).toBe(strips % 2 === 0 ? 2 : 3);
    }
  });

  it('numer-strips-tree ends on the two parabolas\' area', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-strips-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const ys = heightsOf(trapF(params), params.a, params.h, 4);
      expect(Number(slide.answer[9]), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, params.h), 9);
    }
  });

  it('numer-both-tree ends on the trapezia\'s area and the parabolas\'', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-both-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const f = trapF(params);
      const last = slide.answer.length - 1;
      expect(Number(slide.answer[last - 1]), `seed ${seed}`).toBeCloseTo(trapezia(f, params.a, params.h, params.n), 9);
      expect(Number(slide.answer[last]), `seed ${seed}`).toBeCloseTo(parabolaAreas(heightsOf(f, params.a, params.h, params.n), params.h), 9);
    }
  });

  it('numer-gap-value is the parabolas\' area less the trapezia\'s', () => {
    for (const { params, slide, seed } of draws<TrapParams>('numer-gap-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const f = trapF(params);
      const gap = parabolaAreas(heightsOf(f, params.a, params.h, params.n), params.h) - trapezia(f, params.a, params.h, params.n);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(gap, 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-closer-choice marks the rule nearer the power-rule integral, and asks both ways at difficulty 2', () => {
    const winners = new Set<string>();
    for (const { params, slide, seed, difficulty } of draws<{ poly: Poly; a: number; n: number }>('numer-closer-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const f = (x: number) => valueAt(params.poly, x);
      const b = params.a + params.n;
      const exact = integratePoly(params.poly, params.a, b);
      const dt = Math.abs(trapezia(f, params.a, 1, params.n) - exact);
      const ds = Math.abs(parabolaAreas(heightsOf(f, params.a, 1, params.n), 1) - exact);
      const expected = dt < 1e-9 && ds < 1e-9 ? 'Both are equally close' : ds < dt ? "Simpson's rule" : 'The trapezium rule';
      expect(slide.options.find((o) => o.id === slide.correctId)!.label, `seed ${seed}`).toBe(expected);
      if (difficulty > 1) winners.add(expected);
    }
    expect([...winners].sort()).toEqual(["Simpson's rule", 'The trapezium rule']);
  });

  it('numer-refine-flow reads the bend from T_1 and T_2, and S as the parabola through the three heights', () => {
    for (const { params, slide, seed } of draws<{ trap: TrapParams }>('numer-refine-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { trap } = params;
      const f = trapF(trap);
      const b = trap.a + 2 * trap.h;
      const up = f(trap.a) + f(b) > 2 * f((trap.a + b) / 2);
      expect(slide.answer[0].startsWith(up ? 'Upward' : 'Downward'), `seed ${seed}`).toBe(true);
      const t1 = trapezia(f, trap.a, 2 * trap.h, 1);
      const t2 = trapezia(f, trap.a, trap.h, 2);
      expect(slide.subject, `seed ${seed}`).toBe(`T_1 = ${Number(t1.toFixed(6))}, \\quad T_2 = ${Number(t2.toFixed(6))}`);
      expect(Number(slide.answer[1].replace(/\$/g, '')), `seed ${seed}`).toBeCloseTo(parabolaAreas(heightsOf(f, trap.a, trap.h, 2), trap.h), 9);
    }
  });

  it('numer-simpson-error is the parabolas\' area less the power-rule integral, and nought on a cubic', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; a: number; n: number }>('numer-simpson-error')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const f = (x: number) => valueAt(params.poly, x);
      const error = parabolaAreas(heightsOf(f, params.a, 1, params.n), 1) - integratePoly(params.poly, params.a, params.a + params.n);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(error, 9);
      if (params.poly.length <= 4) expect(Number(slide.answer), `seed ${seed}`).toBe(0);
      else expect(Number(slide.answer), `seed ${seed}`).not.toBe(0);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-exact-flow says exact only for a polynomial whose fourth difference vanishes', () => {
    for (const { slide, seed } of draws<unknown>('numer-exact-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const kind = classify(slide.subject.replace(/^f\(x\) = /, ''));
      const expected = kind === 'other' ? ['No'] : ['Yes', kind === 'exact' ? '3 or less' : '4 or more'];
      expect(slide.answer, `seed ${seed}: ${slide.subject}`).toEqual(expected);
    }
  });

  it('numer-exact-choice marks the one integrand Simpson\'s rule gets exactly', () => {
    for (const { slide, seed } of draws<unknown>('numer-exact-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      for (const option of slide.options) {
        expect(classify(option.label) === 'exact', `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('numer-cubic-steps reaches the parabola\'s area, then the power-rule integral, then nought', () => {
    for (const { params, slide, seed } of draws<{ poly: Poly; a: number; h: number }>('numer-cubic-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const f = (x: number) => valueAt(params.poly, x);
      const [, , , estimate, exact, last] = slide.reductions.map((r) => Number(r.value));
      expect(estimate, `seed ${seed}`).toBeCloseTo(parabolaAreas(heightsOf(f, params.a, params.h, 2), params.h), 9);
      expect(exact, `seed ${seed}`).toBeCloseTo(integratePoly(params.poly, params.a, params.a + 2 * params.h), 9);
      expect(last, `seed ${seed}`).toBe(0);
    }
  });

  it('numer-readings-estimate is the parabolas\' area under the readings the table shows', () => {
    for (const { slide, seed } of draws<unknown>('numer-readings-estimate')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const [xs, ys] = tableRows(slide);
      expect(Number(slide.answer), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, xs[1] - xs[0]), 9);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-table-tree ends on the parabolas\' area under the readings the table shows', () => {
    for (const { slide, seed } of draws<unknown>('numer-table-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const [xs, ys] = tableRows(slide);
      expect(Number(slide.answer[6]), `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, xs[1] - xs[0]), 9);
    }
  });

  it('numer-readings-slider asks for the height of the rectangle with the parabolas\' area, on the slider\'s steps', () => {
    for (const { slide, seed } of draws<unknown>('numer-readings-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const [xs, ys] = tableRows(slide);
      const width = xs[xs.length - 1] - xs[0];
      expect(slide.answer * width, `seed ${seed}`).toBeCloseTo(parabolaAreas(ys, xs[1] - xs[0]), 9);
      expect(Math.abs(slide.answer / slide.step - Math.round(slide.answer / slide.step)), `seed ${seed}`).toBeLessThan(1e-9);
    }
  });

  it('numer-odd-choice picks Simpson throughout exactly when the readings make an even number of strips', () => {
    for (const { params, slide, seed } of draws<{ ys: number[]; h: number; listed: boolean }>('numer-odd-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      let strips: number;
      if (params.listed) strips = tableRows(slide)[1].length - 1;
      else {
        const prose = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
        const every = Number(prose.match(/every \$([\d.]+)\$/)![1]);
        const to = Number(prose.match(/to \$[a-z] = ([\d.]+)\$/)![1]);
        strips = Math.round(to / every);
      }
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right.startsWith("Simpson's rule on all the strips"), `seed ${seed}`).toBe(strips % 2 === 0);
    }
  });
});
