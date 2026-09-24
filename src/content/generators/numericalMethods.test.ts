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

/* ---------- Euler's method ---------- */

/**
 * The problem as the learner reads it: f turned into mathjs from the slide's
 * TeX, the starting point, and h where the prompt states it. Nothing here
 * comes from the generator's parameters or its own stepping.
 */
interface ReadIvp {
  f: (x: number, y: number) => number;
  x0: number;
  y0: number;
  h: number | undefined;
}

/** Every piece of text on a slide: prose, displays and a flow's questions. */
function slideText(slide: Slide): string {
  if (slide.kind === 'teach') return '';
  const blocks = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : b.kind === 'display' ? `$${b.tex}$` : '')).join(' ');
  const flow = slide.kind === 'flow' ? slide.steps.map((s) => s.ask).join(' ') : '';
  return `${blocks} ${flow}`;
}

function readIvp(slide: Slide): ReadIvp {
  const text = slideText(slide);
  const eq = text.match(/\\frac\{dy\}\{dx\} = f\([^)]*\) = ([^$]*)\$/);
  const start = text.match(/\$y = (-?[\d.]+)\$ when \$x = (-?[\d.]+)\$/);
  if (!eq || !start) throw new Error(`no problem in: ${text}`);
  const expr = eq[1]
    .replace(/\\times/g, '*')
    .replace(/\^\{(\d+)\}/g, '^$1')
    .replace(/xy/g, 'x*y');
  const node = math.compile(expr);
  const h = text.match(/\$h = ([\d.]+)\$/);
  return {
    f: (x, y) => Number(node.evaluate({ x, y })),
    x0: Number(start[2]),
    y0: Number(start[1]),
    h: h ? Number(h[1]) : undefined,
  };
}

/** Euler's method written out again: n steps of h from (x0, y0). */
function euler({ f, x0, y0 }: ReadIvp, h: number, n: number) {
  const xs = [x0];
  const ys = [y0];
  const gs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    gs.push(f(xs[i], ys[i]));
    ys.push(ys[i] + h * gs[i]);
    xs.push(x0 + (i + 1) * h);
  }
  return { xs, ys, gs };
}

/** The exact y at X for an equation in x alone: f fitted as a quadratic, integrated by the power rule. */
function exactAt({ f, x0, y0 }: ReadIvp, X: number): number {
  const c = f(0, 0);
  const a = (f(1, 0) + f(-1, 0)) / 2 - c;
  const b = (f(1, 0) - f(-1, 0)) / 2;
  expect(f(2, 0), 'f is not a quadratic in x').toBeCloseTo(4 * a + 2 * b + c, 9);
  expect(f(1.3, 5), 'f has y in it').toBeCloseTo(f(1.3, -2), 9);
  return y0 + integratePoly([a, b, c], x0, X);
}

const stepsBetween = (from: number, to: number, h: number) => {
  const n = Math.round((to - from) / h);
  expect(from + n * h).toBeCloseTo(to, 9);
  return n;
};

const near = (token: string, value: number, where: string) => expect(Number(token.replace(/\$/g, '')), where).toBeCloseTo(value, 9);

describe("Euler's method, stepped again from what each slide shows", () => {
  it('numer-euler-step-tree is x_1, the gradient at the start, h times it, and y_1', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-step-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const ivp = readIvp(slide);
      const { xs, ys, gs } = euler(ivp, ivp.h!, 1);
      [xs[1], gs[0], ivp.h! * gs[0], ys[1]].forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, node ${i}`));
    }
  });

  it('numer-euler-formula-tiles fills the step from the last point the table reached', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-formula-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const ivp = readIvp(slide);
      const k = Number(slide.template.match(/^y_(\d)/)![1]) - 1;
      const { xs, ys } = euler(ivp, ivp.h!, k);
      const table = slide.prompt.find((b) => b.kind === 'display');
      if (k > 0) {
        if (!table || table.kind !== 'display') throw new Error('no table');
        const last = numbersIn(table.tex.split('\\\\').at(-1)!);
        expect(last[1], `seed ${seed}`).toBeCloseTo(xs[k], 9);
        expect(last[2], `seed ${seed}`).toBeCloseTo(ys[k], 9);
      }
      const expected = [ys[k], ivp.h!, xs[k], ys[k]].slice(0, slide.answer.length);
      expected.forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, blank ${i}`));
      expect(slide.answer.length === 4, `seed ${seed}`).toBe(ivp.f(1.3, 5) !== ivp.f(1.3, -2));
    }
  });

  it('numer-euler-tangent-slider asks for the height the tangent reaches one step on', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-tangent-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const ivp = readIvp(slide);
      expect(slide.answer, `seed ${seed}`).toBeCloseTo(euler(ivp, ivp.h!, 1).ys[1], 9);
      expect(slide.answer > slide.min && slide.answer < slide.max, `seed ${seed}`).toBe(true);
    }
  });

  it('numer-euler-point-choice marks the point the step lands on', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-point-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const ivp = readIvp(slide);
      const n = slideText(slide).includes('the second step') ? 2 : 1;
      const { xs, ys } = euler(ivp, ivp.h!, n);
      const right = numbersIn(slide.options.find((o) => o.id === slide.correctId)!.label);
      expect(right[0], `seed ${seed}`).toBeCloseTo(xs[n], 9);
      expect(right[1], `seed ${seed}`).toBeCloseTo(ys[n], 9);
    }
  });

  it('numer-euler-first-value, reach-value and y-value are Euler at the x in the lead, and accepted', () => {
    for (const id of ['numer-euler-first-value', 'numer-euler-reach-value', 'numer-euler-y-value']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'expression') throw new Error('not an expression slide');
        const ivp = readIvp(slide);
        const X = Number(slide.lead!.match(/y\((-?[\d.]+)\)/)![1]);
        const h = ivp.h ?? X - ivp.x0;
        const n = stepsBetween(ivp.x0, X, h);
        if (id === 'numer-euler-first-value') expect(n).toBe(1);
        near(slide.answer, euler(ivp, h, n).ys[n], `${id} seed ${seed}`);
        expect(slide.source ?? slide.integrand ?? slide.limits, `${id} declares an oracle field`).toBeUndefined();
        expect(verdict(slide, slide.answer), `${id} seed ${seed}`).toBe('correct');
      }
    }
  });

  it('numer-euler-table and ytable read gradient then next y down the rows', () => {
    for (const id of ['numer-euler-table', 'numer-euler-ytable']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'table') throw new Error('not a table slide');
        const ivp = readIvp(slide);
        const n = slide.rows.length - 1;
        const { xs, ys, gs } = euler(ivp, ivp.h!, n);
        slide.rows.forEach((row, i) => expect(Number(row[1]), `${id} seed ${seed}`).toBeCloseTo(xs[i], 9));
        const expected = xs.flatMap((_, i) => [...(i > 0 ? [ys[i]] : []), ...(i < n ? [gs[i]] : [])]);
        expected.forEach((v, i) => near(slide.answer[i], v, `${id} seed ${seed}, blank ${i}`));
        expect(ivp.f(1.3, 5) !== ivp.f(1.3, -2), `${id} seed ${seed}: y in f`).toBe(id === 'numer-euler-ytable');
      }
    }
  });

  it('numer-euler-chain-steps ends on y_2, and a stated y_1 is the first step', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-chain-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const ivp = readIvp(slide);
      const { ys } = euler(ivp, ivp.h!, 2);
      near(slide.reductions.at(-1)!.value, ys[2], `seed ${seed}`);
      const stated = slideText(slide).match(/y_1 = (-?[\d.]+)/);
      if (stated) expect(Number(stated[1]), `seed ${seed}`).toBeCloseTo(ys[1], 9);
    }
  });

  it('numer-euler-count-flow counts the steps, takes the last gradient at its start, and lands on y_n', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-count-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const ivp = readIvp(slide);
      const X = Number(slide.steps[0].ask.match(/to \$(-?[\d.]+)\$/)![1]);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      const { xs, ys } = euler(ivp, ivp.h!, n);
      expect(slide.answer[0], `seed ${seed}`).toBe(String(n));
      near(slide.answer[1].match(/x = (-?[\d.]+)/)![1], xs[n - 1], `seed ${seed}`);
      near(slide.answer[2], ys[n], `seed ${seed}`);
      const reached = Number(slideText(slide).match(/reached \$y = (-?[\d.]+)\$/)![1]);
      expect(reached, `seed ${seed}`).toBeCloseTo(ys[n - 1], 9);
    }
  });

  it('numer-euler-y-tree recomputes the gradient at the new point', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-y-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const ivp = readIvp(slide);
      const { ys, gs } = euler(ivp, ivp.h!, 2);
      [gs[0], ys[1], gs[1], ys[2]].forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, node ${i}`));
    }
  });

  it('numer-euler-frozen-choice marks the line whose result is y_2, and every line adds up', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-frozen-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const ivp = readIvp(slide);
      const { ys } = euler(ivp, ivp.h!, 2);
      for (const option of slide.options) {
        const [y, h, x, yy, result] = numbersIn(option.label);
        expect(result, `seed ${seed}: ${option.label}`).toBeCloseTo(y + h * ivp.f(x, yy), 9);
        expect(Math.abs(result - ys[2]) < 1e-9, `seed ${seed}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('numer-euler-slip-flow asks where the gradient is found only when f has y in it, and ends on y_2', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-slip-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const ivp = readIvp(slide);
      const withY = [0, 0.7, 1.5].some((x) => ivp.f(x, 5) !== ivp.f(x, -2));
      expect(slide.answer[0], `seed ${seed}`).toBe(withY ? 'Yes' : 'No');
      near(slide.answer.at(-1)!, euler(ivp, ivp.h!, 2).ys[2], `seed ${seed}`);
    }
  });

  it('numer-euler-error-tree and error-value give the estimate less the power-rule y', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-error-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const ivp = readIvp(slide);
      const n = slide.nodes.length - 2;
      const { xs, ys } = euler(ivp, ivp.h!, n);
      const exact = exactAt(ivp, xs[n]);
      [...ys.slice(1), exact, ys[n] - exact].forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, node ${i}`));
    }
    for (const { slide, seed } of draws<unknown>('numer-euler-error-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const ivp = readIvp(slide);
      const X = Number(slideText(slide).match(/at \$x = (-?[\d.]+)\$/)![1]);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      near(slide.answer, euler(ivp, ivp.h!, n).ys[n] - exactAt(ivp, X), `seed ${seed}`);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-euler-exact-steps reaches the error, from an estimate that is Euler\'s', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-exact-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const ivp = readIvp(slide);
      const [, X, estimate] = slideText(slide).match(/y\((-?[\d.]+)\) \\approx (-?[\d.]+)/)!.map(Number);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      expect(estimate, `seed ${seed}`).toBeCloseTo(euler(ivp, ivp.h!, n).ys[n], 9);
      near(slide.reductions[3].value, exactAt(ivp, X), `seed ${seed}`);
      near(slide.reductions[4].value, estimate - exactAt(ivp, X), `seed ${seed}`);
    }
  });

  it('numer-euler-miss-flow and miss-choice say low exactly when the steps land below the true y', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-miss-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const ivp = readIvp(slide);
      const X = Number(slide.subject.match(/\\le (-?[\d.]+)/)![1]);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      const low = euler(ivp, ivp.h!, n).ys[n] < exactAt(ivp, X);
      expect(slide.answer, `seed ${seed}`).toEqual(low ? ['It rises', 'Below the curve', 'An underestimate'] : ['It falls', 'Above the curve', 'An overestimate']);
    }
    for (const { slide, seed } of draws<unknown>('numer-euler-miss-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const ivp = readIvp(slide);
      const X = Number(slideText(slide).match(/at \$x = (-?[\d.]+)\$/)![1]);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      const low = euler(ivp, ivp.h!, n).ys[n] < exactAt(ivp, X);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right, `seed ${seed}`).toBe(low ? 'Too low, as the curve bends upward' : 'Too high, as the curve bends downward');
    }
  });

  it('numer-euler-halve-table has both estimates and errors, and a straight-line f halves exactly', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-halve-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const ivp = readIvp(slide);
      const [h, n] = slide.rows[0].map(Number);
      const exact = Number(slideText(slide).match(/is \$(-?[\d.]+)\$/)![1]);
      const X = ivp.x0 + n * h;
      expect(exact, `seed ${seed}`).toBeCloseTo(exactAt(ivp, X), 9);
      const coarse = euler(ivp, h, n).ys[n];
      const fine = euler(ivp, h / 2, 2 * n).ys[2 * n];
      const expected = slide.rows[1][2] === null ? [coarse, coarse - exact, fine, fine - exact] : [coarse, coarse - exact, fine - exact];
      if (slide.rows[1][2] !== null) expect(Number(slide.rows[1][2]), `seed ${seed}`).toBeCloseTo(fine, 9);
      expected.forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, blank ${i}`));
      if (Math.abs(ivp.f(2, 0) - 2 * ivp.f(1, 0) + ivp.f(0, 0)) < 1e-9) expect(fine - exact, `seed ${seed}`).toBeCloseTo((coarse - exact) / 2, 9);
    }
  });

  it('numer-euler-halve-choice marks the option nearest the h/2 estimate, and it is exact for a straight line', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-halve-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const ivp = readIvp(slide);
      const [, X, estimate] = slideText(slide).match(/y\((-?[\d.]+)\) \\approx (-?[\d.]+)/)!.map(Number);
      const n = stepsBetween(ivp.x0, X, ivp.h!);
      expect(estimate, `seed ${seed}`).toBeCloseTo(euler(ivp, ivp.h!, n).ys[n], 9);
      const fine = euler(ivp, ivp.h! / 2, 2 * n).ys[2 * n];
      const nearest = [...slide.options].sort((a, b) => Math.abs(Number(a.label) - fine) - Math.abs(Number(b.label) - fine))[0];
      expect(nearest.id, `seed ${seed}`).toBe(slide.correctId);
      if (Math.abs(ivp.f(2, 0) - 2 * ivp.f(1, 0) + ivp.f(0, 0)) < 1e-9) near(nearest.label, fine, `seed ${seed}`);
    }
  });

  it('numer-euler-needed-value is the fewest steps whose proportional error meets the target', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-needed-value')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const [steps, , , , error, target] = numbersIn(slideText(slide).replace(/\$h = /, ''));
      let n = steps;
      while ((error * steps) / n > target + 1e-12) n += 1;
      expect(slide.answer, `seed ${seed}`).toBe(String(n));
    }
  });

  it('numer-euler-size-flow shrinks h by the error ratio and multiplies the steps by it', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-size-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const [steps, h, , , error, target] = numbersIn(slideText(slide));
      const newH = Number(slide.answer[1].match(/h = ([\d.]+)/)![1]);
      expect((error * newH) / h, `seed ${seed}`).toBeCloseTo(target, 9);
      expect(Number(slide.answer[2]), `seed ${seed}`).toBeCloseTo((steps * h) / newH, 9);
    }
  });

  it('numer-euler-size-slider asks for the h whose proportional error is the one stated', () => {
    for (const { slide, seed } of draws<unknown>('numer-euler-size-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const [error, h, , , wanted] = numbersIn(slideText(slide));
      expect((error * slide.answer) / h, `seed ${seed}`).toBeCloseTo(wanted, 9);
      expect(Math.abs(slide.answer / slide.step - Math.round(slide.answer / slide.step)), `seed ${seed}`).toBeLessThan(1e-9);
    }
  });
});

/* ---------- Choosing a method ---------- */

/**
 * f, g and the plans as the learner reads them: TeX turned into mathjs, the
 * bracket, the start. Each method is then run again here, bisection by its
 * own loop, Newton-Raphson with a gradient by central difference, so nothing
 * leans on the generator's own stepping.
 */
function texFunction(tex: string): (x: number) => number {
  const expr = tex
    .replace(/x_n/g, 'x')
    .replace(/\^\{(\d+)\}/g, '^$1')
    .replace(/\\sqrt\[3\]\{([^}]*)\}/g, 'cbrt($1)')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  const node = math.compile(expr);
  return (x) => Number(node.evaluate({ x }));
}

const readF = (text: string) => texFunction(text.match(/\$f\(x\) = ([^$]*)\$/)![1]);

/** A plan's slide, read: f, the largest root, the bracket, g and the start. */
function readPlans(slide: Slide) {
  const text = slideText(slide);
  const f = readF(text);
  const [lo, hi] = text.match(/bisection on \$\[(-?\d+), (-?\d+)\]\$/)!.slice(1).map(Number);
  const g = texFunction(text.match(/with \$g\(x\) = (.*?)\$; and/)![1]);
  const x0 = Number(text.match(/from \$x_0 = (-?\d+)\$/)![1]);
  const near = Number(text.match(/\\alpha \\approx (-?[\d.]+)/)![1]);
  const alpha = bisect(f, near - 0.2, near + 0.2);
  const works = {
    bisection: f(lo) * f(hi) < 0,
    iteration: Math.abs(gradient(g, alpha)) < 1,
    newton: Math.abs(gradient(f, x0)) > 1e-6,
  };
  return { text, f, lo, hi, g, x0, alpha, works };
}

/** Bisection's midpoints and the interval it leaves, halving `count` times. */
function midpoints(f: (x: number) => number, a: number, b: number, count: number) {
  let [lo, hi] = [a, b];
  const mids: number[] = [];
  const kept: [number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const m = (lo + hi) / 2;
    mids.push(m);
    if (f(m) * f(lo) > 0) lo = m;
    else hi = m;
    kept.push([lo, hi]);
  }
  return { mids, kept };
}

/** `steps` values of a scheme from x0. */
function iterates(step: (x: number) => number, x0: number, steps: number): number[] {
  const out: number[] = [];
  let x = x0;
  for (let n = 0; n < steps; n += 1) out.push((x = step(x)));
  return out;
}

const newtonFor = (f: (x: number) => number) => (x: number) => x - f(x) / gradient(f, x);

/** What a side-by-side slide states: f, the bracket, g and the shared start. */
function readSide(slide: Slide) {
  const text = slideText(slide);
  const f = readF(text);
  const lo = Number(text.match(/root \$\\alpha\$ in \$\[(-?\d+), /)![1]);
  const g = texFunction(text.match(/x_\{n\+1\} = (.*?)\$, and/)![1]);
  const x0 = Number(text.match(/from \$x_0 = (-?\d+)\$/)![1]);
  const mids = midpoints(f, lo, lo + 1, 3).mids;
  return { text, f, lo, g, x0, mids, iter: iterates(g, x0, 3), newton: iterates(newtonFor(f), x0, 3), alpha: bisect(f, lo, lo + 1) };
}

describe('Numerical Methods level 6: every method run again from what the slide shows', () => {
  it('numer-bisect-table halves the stated bracket, keeping the half that changes sign', () => {
    for (const { slide, seed } of draws<unknown>('numer-bisect-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const text = slideText(slide);
      const f = readF(text);
      const [, a, fa, b, fb] = text.match(/\$f\((-?[\d.]+)\) = (-?[\d.]+)\$ and \$f\((-?[\d.]+)\) = (-?[\d.]+)\$/)!.map(Number);
      expect(fa, `seed ${seed}`).toBeCloseTo(f(a), 9);
      expect(fb, `seed ${seed}`).toBeCloseTo(f(b), 9);
      const { mids, kept } = midpoints(f, a, b, 3);
      const expected = [mids[0], ...kept[0], mids[1], ...kept[1], mids[2]];
      expected.forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, blank ${i}`));
      mids.forEach((m, i) => expect(slide.rows[i][4], `seed ${seed}, row ${i}`).toBe(f(m) < 0 ? '-' : '+'));
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-bisect-flow takes the midpoint, keeps the half that changes sign, and moves to its middle', () => {
    for (const { slide, seed } of draws<unknown>('numer-bisect-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = slideText(slide);
      const f = readF(text);
      const [a, b] = text.match(/midpoint of \$\[(-?[\d.]+), (-?[\d.]+)\]\$/)!.slice(1).map(Number);
      const { mids, kept } = midpoints(f, a, b, 2);
      near(slide.answer[0], mids[0], `seed ${seed}`);
      expect(numbersIn(slide.answer[1]), `seed ${seed}`).toEqual(kept[0]);
      near(slide.answer[2], mids[1], `seed ${seed}`);
      const stated = Number(text.match(/\$f\(-?[\d.]+\) = (-?[\d.]+)\$\. The root/)![1]);
      expect(stated, `seed ${seed}`).toBeCloseTo(f(mids[0]), 9);
    }
  });

  it('numer-bisect-halvings is the width after k halvings, or the fewest halvings for the target', () => {
    for (const { slide, seed } of draws<unknown>('numer-bisect-halvings')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const text = slideText(slide);
      const [W, x] = numbersIn(text);
      if (slide.lead!.includes('width')) {
        near(slide.answer, W / 2 ** x, `seed ${seed}`);
      } else {
        const midpoint = text.includes('midpoint');
        let k = 0;
        while ((midpoint ? W / 2 ** (k + 1) : W / 2 ** k) >= x) k += 1;
        expect(slide.answer, `seed ${seed}`).toBe(String(k));
      }
      expect(slide.source ?? slide.integrand ?? slide.limits, 'declares an oracle field').toBeUndefined();
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-bisect-choice marks the interval that many halvings leave', () => {
    for (const { slide, seed } of draws<unknown>('numer-bisect-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = slideText(slide);
      const f = readF(text);
      const [, a, , b] = text.match(/\$f\((-?[\d.]+)\) = (-?[\d.]+)\$ and \$f\((-?[\d.]+)\)/)!.map(Number);
      const count = text.includes('three halvings') ? 3 : 2;
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(numbersIn(right), `seed ${seed}`).toEqual(midpoints(f, a, b, count).kept[count - 1]);
    }
  });

  it('numer-side-table fills all three columns as each method gives them', () => {
    for (const { slide, seed } of draws<unknown>('numer-side-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const { mids, iter, newton, x0, lo } = readSide(slide);
      expect(slide.rows[0].slice(2).map(Number), `seed ${seed}`).toEqual([x0, x0]);
      expect(numbersIn(slide.rows[0][1]!), `seed ${seed}`).toEqual([lo, lo + 1]);
      const cells = [1, 2, 3].flatMap((n) => [String(Number(mids[n - 1].toFixed(6))), rounded(iter[n - 1], 4), rounded(newton[n - 1], 4)]);
      const given = slide.rows.slice(1).flatMap((row) => row.slice(1));
      given.forEach((cell, i) => {
        if (cell !== null) expect(cell, `seed ${seed}, cell ${i}`).toBe(cells[i]);
      });
      expect(slide.answer, `seed ${seed}`).toEqual(cells.filter((_, i) => given[i] === null));
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('numer-side-flow picks each method\'s next value, first or second', () => {
    for (const { slide, seed } of draws<unknown>('numer-side-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { mids, iter, newton } = readSide(slide);
      const n = slideText(slide).includes('second value') ? 2 : 1;
      near(slide.answer[0], mids[n - 1], `seed ${seed}`);
      expect(slide.answer[1], `seed ${seed}`).toBe(`$${rounded(iter[n - 1], 4)}$`);
      expect(slide.answer[2], `seed ${seed}`).toBe(`$${rounded(newton[n - 1], 4)}$`);
    }
  });

  it('numer-nearest-method names the column whose third value is truly closest to the root', () => {
    for (const { slide, seed } of draws<unknown>('numer-nearest-method')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const { mids, iter, newton, alpha } = readSide(slide);
      const errors: [string, number][] = [
        ['Bisection', Math.abs(mids[2] - alpha)],
        ['Iteration', Math.abs(iter[2] - alpha)],
        ['Newton-Raphson', Math.abs(newton[2] - alpha)],
      ];
      const closest = errors.sort((p, q) => p[1] - q[1])[0][0];
      expect(slide.options.find((o) => o.id === slide.correctId)!.label, `seed ${seed}`).toBe(closest);
    }
  });

  it('numer-side-steps ends on Newton-Raphson\'s first step', () => {
    for (const { slide, seed } of draws<unknown>('numer-side-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const text = slideText(slide);
      const f = readF(text);
      const x0 = Number(text.match(/from \$x_0 = (-?\d+)\$/)![1]);
      near(slide.reductions[0].value, f(x0), `seed ${seed}`);
      expect(Number(slide.reductions[1].value), `seed ${seed}`).toBeCloseTo(gradient(f, x0), 5);
      expect(Number(slide.reductions.at(-1)!.value), `seed ${seed}`).toBeCloseTo(newtonFor(f)(x0), 6);
    }
  });

  it('numer-speed-flow halves the width, multiplies the error by |g\'|, and doubles the places', () => {
    for (const { slide, seed } of draws<unknown>('numer-speed-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const [W, e, p] = numbersIn(slide.subject);
      const r = numbersIn(slide.steps[1].ask)[0];
      near(slide.answer[0], W / 2, `seed ${seed}`);
      near(slide.answer[1], r * e, `seed ${seed}`);
      expect(slide.answer[2], `seed ${seed}`).toBe(String(2 * p));
    }
  });

  it('numer-speed-table steps each column on from row 0', () => {
    for (const { slide, seed } of draws<unknown>('numer-speed-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const r = Number(slideText(slide).match(/\\approx ([\d.]+)/)![1]);
      const [W, e, p] = slide.rows[0].slice(1).map(Number);
      const expected = slide.rows.slice(1).flatMap((_, i) => [W / 2 ** (i + 1), e * r ** (i + 1), p * 2 ** (i + 1)]);
      expected.forEach((v, i) => near(slide.answer[i], v, `seed ${seed}, blank ${i}`));
    }
  });

  it('numer-speed-tree counts the steps each needs to the stated error, and the fewest', () => {
    for (const { slide, seed } of draws<unknown>('numer-speed-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = slideText(slide);
      const e0 = Number(text.match(/at most \$([\d.]+)\$/)![1]);
      const r = Number(text.match(/about \$([\d.]+)\$/)![1]);
      const P = Number(text.match(/below \$10\^\{-(\d+)\}\$/)![1]);
      const count = (next: (error: number) => number) => {
        let [k, error] = [0, e0];
        while (error >= 10 ** -P * (1 - 1e-9)) [k, error] = [k + 1, next(error)];
        return k;
      };
      const bisection = count((error) => error / 2);
      const iteration = count((error) => error * r);
      let newton = 0;
      while (Math.round(-Math.log10(e0)) * 2 ** newton < P) newton += 1;
      expect(slide.answer, `seed ${seed}`).toEqual([bisection, iteration, newton, Math.min(bisection, iteration, newton)].map(String));
    }
  });

  it('numer-breaks-flow names the one plan that fails, and its reason', () => {
    for (const { slide, seed } of draws<unknown>('numer-breaks-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const { works, lo, hi, x0 } = readPlans(slide);
      const failed = (Object.keys(works) as (keyof typeof works)[]).filter((plan) => !works[plan]);
      expect(failed, `seed ${seed}`).toHaveLength(1);
      const names = { bisection: 'Bisection', iteration: 'Iteration', newton: 'Newton-Raphson' };
      expect(slide.answer[0], `seed ${seed}`).toBe(names[failed[0]]);
      const reason = { bisection: `$f(${lo})$ and $f(${hi})$`, iteration: "|g'(x)| > 1", newton: `$f'(${x0}) = 0$` }[failed[0]];
      expect(slide.answer[1].includes(reason), `seed ${seed}: ${slide.answer[1]}`).toBe(true);
    }
  });

  it('numer-breaks-picture marks bisection, Newton-Raphson or neither as the curve decides', () => {
    for (const { slide, seed } of draws<unknown>('numer-breaks-picture')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const text = slideText(slide);
      const f = readF(text);
      const [lo, hi] = text.match(/interval \$\[(-?\d+), (-?\d+)\]\$/)!.slice(1).map(Number);
      const x0 = Number(text.match(/from \$x_0 = (-?\d+)\$/)![1]);
      const bisectFails = f(lo) * f(hi) > 0;
      const newtonFails = Math.abs(gradient(f, x0)) < 1e-6;
      expect(bisectFails && newtonFails, `seed ${seed}`).toBe(false);
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      expect(right.split(' ')[0].replace(':', ''), `seed ${seed}`).toBe(bisectFails ? 'Bisection' : newtonFails ? 'Newton-Raphson' : 'Neither');
    }
  });

  it('numer-breaks-tree is f at both ends, their product, and f\'(x_0)', () => {
    for (const { slide, seed } of draws<unknown>('numer-breaks-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = slideText(slide);
      const f = readF(text);
      const [lo, hi] = text.match(/bisecting \$\[(-?\d+), (-?\d+)\]\$/)!.slice(1).map(Number);
      const x0 = Number(text.match(/at \$x_0 = (-?\d+)\$/)![1]);
      [f(lo), f(hi), gradient(f, x0), f(lo) * f(hi)].forEach((v, i) => expect(Number(slide.answer[i]), `seed ${seed}, node ${i}`).toBeCloseTo(v, 4));
    }
  });

  it('numer-reach-choice and reach-value take the fastest plan that works, and its first step', () => {
    const names = { bisection: 'Bisection', iteration: 'Iteration', newton: 'Newton-Raphson' };
    for (const id of ['numer-reach-choice', 'numer-reach-value']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        const { works, lo, hi, g, f, x0, alpha, text } = readPlans(slide);
        const plan = works.newton ? 'newton' : works.iteration ? 'iteration' : 'bisection';
        expect(works[plan], `${id} seed ${seed}`).toBe(true);
        const stated = text.match(/\$g'\(\\alpha\) \\approx (-?[\d.]+)\$ and \$f'\((-?\d+)\) = (-?[\d.]+)\$/);
        if (stated) {
          expect(Number(stated[1]), `${id} seed ${seed}`).toBeCloseTo(gradient(g, alpha), 2);
          expect(Number(stated[3]), `${id} seed ${seed}`).toBeCloseTo(gradient(f, x0), 4);
        }
        if (slide.kind === 'choice') {
          expect(slide.options.find((o) => o.id === slide.correctId)!.label, `${id} seed ${seed}`).toBe(names[plan]);
        } else if (slide.kind === 'expression') {
          const first = plan === 'bisection' ? (lo + hi) / 2 : plan === 'iteration' ? g(x0) : newtonFor(f)(x0);
          if (plan === 'iteration') expect(slide.answer, `${id} seed ${seed}`).toBe(rounded(first, 4));
          else expect(Number(slide.answer), `${id} seed ${seed}`).toBeCloseTo(first, 6);
          expect(verdict(slide, slide.answer), `${id} seed ${seed}`).toBe('correct');
        } else throw new Error(`${id}: unexpected ${slide.kind}`);
      }
    }
  });

  it('numer-reach-flow reaches for Newton-Raphson when it can start, then a converging g, then bisection', () => {
    for (const { slide, seed } of draws<unknown>('numer-reach-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const text = slideText(slide);
      const flat = /f'\(-?\d+\) = 0\$/.test(text);
      const table = text.includes('table of readings');
      const rate = text.match(/\|g'\| \\approx ([\d.]+)/);
      const plan = table ? 'Bisection' : !flat ? 'Newton-Raphson' : rate && Number(rate[1]) < 1 ? 'Iteration' : 'Bisection';
      expect(slide.answer[0], `seed ${seed}`).toBe(plan);
    }
  });
});
