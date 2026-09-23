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
