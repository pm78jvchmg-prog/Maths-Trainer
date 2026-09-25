/**
 * Classical Mechanics level 10, checked against the physics.
 *
 * Dimensions are worked out again by changing the units: each quantity is
 * rebuilt from its definition as a number measured in units of mass, length
 * and time made 2, 3 and 5 times larger, and its powers read back off how the
 * number changes. Scalings are checked against the full formulas, constants
 * and all; natural time units by stepping the spring they come from; and
 * Lagrangians by integrating the force for V and differentiating L
 * numerically.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';
import { classicalGeneralInternals } from './classicalGeneral';

const SEEDS = 60;
const TIME = { timeout: 60_000 };
const { QUANTITIES } = classicalGeneralInternals;

function draws(id: string): { p: Record<string, unknown>; slide: Slide }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const p = generator.sample(makeRng(seed), difficulty);
      return { p: p as Record<string, unknown>, slide: generator.render(p) };
    }),
  );
}

function answerOf(slide: Slide): number[] {
  switch (slide.kind) {
    case 'expression':
      return [Number(math.evaluate(slide.answer))];
    case 'slider':
      return [slide.answer];
    case 'tree':
    case 'table':
      return slide.answer.map(Number);
    case 'flow':
      return slide.answer.filter((s) => /^\$-?[\d.]+\$$/.test(s)).map((s) => Number(s.replace(/\$/g, '')));
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
const promptText = (slide: Slide): string => JSON.stringify('prompt' in slide ? slide.prompt : '');
const quantities = (slide: Slide, unit: string): number[] => [...promptText(slide).matchAll(new RegExp(`\\$(-?[\\d.]+)\\\\\\\\text\\{ ${unit}`, 'g'))].map((m) => Number(m[1]));
const flowWords = (slide: Slide): string[] => (slide.kind === 'flow' ? slide.answer : []);

/**
 * How many new units a quantity of one old unit is, when the units of mass,
 * length and time are u = [uM, uL, uT] old units: built from each definition.
 */
const DEFS: Record<string, (u: number[]) => number> = {
  m: (u) => 1 / u[0],
  '\\ell': (u) => 1 / u[1],
  t: (u) => 1 / u[2],
};
DEFS.v = (u) => DEFS['\\ell'](u) / DEFS.t(u);
DEFS.a = (u) => DEFS.v(u) / DEFS.t(u);
DEFS.F = (u) => DEFS.m(u) * DEFS.a(u);
DEFS.E = (u) => DEFS.F(u) * DEFS['\\ell'](u);
DEFS.P = (u) => DEFS.E(u) / DEFS.t(u);
DEFS.p = (u) => DEFS.m(u) * DEFS.v(u);
DEFS['\\rho'] = (u) => DEFS.m(u) / DEFS['\\ell'](u) ** 3;
DEFS.f = (u) => 1 / DEFS.t(u);
DEFS.k = (u) => DEFS.F(u) / DEFS['\\ell'](u);

/** Powers of M, L and T, read off how the number changes when each unit alone grows. */
function powersOf(measure: (u: number[]) => number): number[] {
  const base = measure([1, 1, 1]);
  return [
    [2, 1, 1],
    [1, 3, 1],
    [1, 1, 5],
  ].map((u, i) => Number((-Math.log(measure(u) / base) / Math.log(u[i])).toFixed(9)) + 0);
}
const dimsOf = (sym: string): number[] => powersOf(DEFS[sym]);
const comboPowers = (p: Record<string, unknown>): number[] => powersOf((u) => DEFS[QUANTITIES[n(p.i)].sym](u) ** n(p.p) * DEFS[QUANTITIES[n(p.j)].sym](u) ** n(p.q));

/** The full formulas behind each law, constants included, in the order of the quantities each is written with. */
const FORMULAS: ((...x: number[]) => number)[] = [
  (l, g) => 2 * Math.PI * Math.sqrt(l / g),
  (m, k) => 2 * Math.PI * Math.sqrt(m / k),
  (T, mu) => Math.sqrt(T / mu),
  (h, g) => Math.sqrt((2 * h) / g),
  (u, g) => (u * u * Math.sin(2 * 0.6)) / g,
  (rho, v, l) => 0.5 * 0.3 * rho * v * v * l * l,
  (m, v) => 0.5 * m * v * v,
  (g, h) => Math.sqrt(2 * g * h),
  (m, v, r) => (m * v * v) / r,
];

/** A mass on a spring stepped through half a swing, for its angular frequency. */
function natural(k: number, m: number): number {
  const w0 = Math.sqrt(k / m);
  const dt = 1e-4 / w0;
  let x = 1;
  let v = 0;
  for (let i = 1; i < 1e7; i += 1) {
    const a = (-k * x) / m;
    const xn = x + v * dt + 0.5 * a * dt * dt;
    const vn = v + 0.5 * (a + (-k * xn) / m) * dt;
    if (v < 0 && vn >= 0) return Math.PI / ((i - 1 + -v / (vn - v)) * dt);
    x = xn;
    v = vn;
  }
  throw new Error('never turned');
}

/** The work done against a force from 0 to x, by the trapezium rule on a fine grid. */
function workAgainst(force: (s: number) => number, x: number): number {
  const steps = 20_000;
  const h = x / steps;
  let sum = 0;
  for (let i = 0; i < steps; i += 1) sum -= 0.5 * (force(i * h) + force((i + 1) * h)) * h;
  return sum;
}

const d = (f: (s: number) => number, s: number) => (f(s + 1e-5) - f(s - 1e-5)) / 2e-5;

describe('classical mechanics level 10', () => {
  it('reads dimensions off a change of units', TIME, () => {
    for (const id of ['clm-dim-power', 'clm-dim-si-slider']) {
      for (const { p, slide } of draws(id)) expect(near(answerOf(slide)[0], comboPowers(p)[n(p.base)]), `${id} ${JSON.stringify(p)}`).toBe(true);
    }
    for (const { p, slide } of draws('clm-dim-flow')) expect(answerOf(slide)).toEqual(comboPowers(p));
    for (const { p, slide } of draws('clm-dim-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const fill = [...slide.answer];
      (p.picks as number[]).forEach((q, r) => {
        const row = slide.rows[r].slice(1).map((cell) => Number(cell ?? fill.shift()));
        expect(row, QUANTITIES[q].sym).toEqual(dimsOf(QUANTITIES[q].sym));
      });
    }
  });

  it('scales each law as its full formula does', TIME, () => {
    for (const { p, slide } of draws('clm-dim-scale')) {
      const law = FORMULAS[n(p.law)];
      const args = [1.7, 2.3, 0.9].slice(0, law.length);
      const after = args.map((x, i) => (i === n(p.which) ? x * n(p.f) : x));
      expect(near(law(...after) / law(...args), answerOf(slide)[0], 1e-9), JSON.stringify(p)).toBe(true);
    }
  });

  it('combines quantities into the dimensions they are asked for', TIME, () => {
    for (const id of ['clm-rayleigh-tree', 'clm-rayleigh-slider']) {
      for (const { p, slide } of draws(id)) {
        const from = (p.from as number[]).map((i) => QUANTITIES[i].sym);
        const powers = id === 'clm-rayleigh-tree' ? answerOf(slide) : (p.powers as number[]).map((x, k) => (k === n(p.which) ? answerOf(slide)[0] : x));
        const got = powersOf((u) => from.reduce((prod, sym, k) => prod * DEFS[sym](u) ** powers[k], 1));
        expect(got.map((x) => Number(x.toFixed(6))), `${id} ${JSON.stringify(p)}`).toEqual(dimsOf(QUANTITIES[n(p.target)].sym).map((x) => Number(x.toFixed(6))));
      }
    }
    for (const { p, slide } of draws('clm-rayleigh-flow')) {
      const [a, b] = answerOf(slide);
      const [A, B, T] = [p.A, p.B, p.target].map((i) => dimsOf(QUANTITIES[n(i)].sym));
      const sum = [0, 1, 2].map((k) => a * A[k] + b * B[k]);
      // The named bases are matched by these powers; the verdict is whether the last one is too.
      expect(near(sum[n(p.baseA)], T[n(p.baseA)]) && near(sum[n(p.baseB)], T[n(p.baseB)]), JSON.stringify(p)).toBe(true);
      expect(flowWords(slide)[2]).toBe(sum.every((x, k) => near(x, T[k])) ? 'Those powers work' : 'No powers work');
    }
  });

  it('builds natural units from the constants they set to one', TIME, () => {
    for (const { p, slide } of draws('clm-natural-time')) {
      const [m] = quantities(slide, 'kg');
      const [k] = quantities(slide, 'N m');
      const tau = 1 / natural(k, m);
      const want = p.find === 'tau' ? tau : quantities(slide, 's')[0] / tau;
      expect(near(answerOf(slide)[0], want, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-natural-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const u = [...quantities(slide, 'kg'), ...quantities(slide, 'm}'), ...quantities(slide, 's}')];
      const fill = [...slide.answer];
      (p.picks as number[]).forEach((q, r) => {
        const [si, nat] = slide.rows[r].slice(1).map((cell) => Number(cell ?? fill.shift()));
        // One SI unit is DEFS(u) natural units.
        expect(near(si * DEFS[QUANTITIES[q].sym](u), nat, 1e-9), JSON.stringify(p)).toBe(true);
      });
    }
    for (const { p, slide } of draws('clm-natural-tree')) {
      const [tau, u, count] = answerOf(slide);
      const [L0] = quantities(slide, 'm}');
      const [v] = quantities(slide, 'm s');
      // A small pendulum of length L0 swings at 1/tau.
      expect(near(1 / tau, natural(9.8, L0), 1e-6) && near(v * DEFS.v([1, L0, tau]), count, 1e-9) && near(u, L0 / tau, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-natural-flow')) {
      const [tau, E0, count] = answerOf(slide);
      const [m] = quantities(slide, 'kg');
      const [k] = quantities(slide, 'N m');
      const [L0] = quantities(slide, 'm}');
      const [E] = quantities(slide, 'J');
      expect(near(1 / tau, natural(k, m), 1e-6) && near(1 / DEFS.E([m, L0, tau]), E0, 1e-9) && near(E / E0, count, 1e-9), JSON.stringify(p)).toBe(true);
    }
  });

  it('takes the potential energy away from the kinetic', TIME, () => {
    const lagOf = (p: Record<string, unknown>) => {
      const m = n(p.m);
      const T = (m * n(p.v)) ** 2 / (2 * m);
      const V = p.system === 'spring' ? workAgainst((s) => -n(p.k) * s, n(p.x)) : workAgainst(() => -m * 9.8, n(p.x));
      return { T, V, L: T - V };
    };
    for (const { p, slide } of draws('clm-lag-value')) expect(near(answerOf(slide)[0], lagOf(p).L, 1e-6), JSON.stringify(p)).toBe(true);
    for (const { p, slide } of draws('clm-lag-tree')) {
      const { T, V, L } = lagOf(p);
      expect(answerOf(slide).every((x, i) => near(x, [T, V, L][i], 1e-6)), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-lag-flow')) {
      expect(near(answerOf(slide)[0], lagOf(p).L, 1e-6)).toBe(true);
      expect(flowWords(slide).slice(0, 2)).toEqual(['$\\tfrac{1}{2}m\\dot{x}^{2}$', p.system === 'spring' ? '$\\tfrac{1}{2}kx^{2}$' : '$mgx$']);
    }
    for (const { p, slide } of draws('clm-lag-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const fill = [...slide.answer];
      for (const row of slide.rows) {
        const [x, v, T, V, L] = row.map((cell) => Number(cell ?? fill.shift()));
        const want = lagOf({ system: 'spring', m: p.m, k: p.k, x, v });
        expect(near(T, want.T, 1e-6) && near(V, want.V, 1e-6) && near(L, want.L, 1e-6), JSON.stringify(p)).toBe(true);
      }
    }
  });

  it('differentiates each Lagrangian numerically for the motion', TIME, () => {
    const L = (p: Record<string, unknown>) => (x: number, xd: number) => 0.5 * n(p.m) * xd * xd - 0.5 * n(p.k) * x * x + n(p.F0) * x;
    for (const { p, slide } of draws('clm-el-accel')) {
      const f = L(p);
      // d/dt of dL/dx' is m x'', so x'' is dL/dx over the coefficient of x' in dL/dx'.
      const force = d((x) => f(x, 0), n(p.x));
      const mass = d((xd) => f(0, xd), 1);
      expect(near(answerOf(slide)[0], force / mass, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-el-tree')) {
      const f = L(p);
      const [dv, dx, acc] = answerOf(slide);
      const force = d((x) => f(x, n(p.v)), n(p.x));
      expect(near(dv, d((xd) => f(n(p.x), xd), n(p.v)), 1e-6) && near(dx, force, 1e-6) && near(acc, force / n(p.m), 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-el-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const f = L(p);
      const fill = [...slide.answer];
      for (const row of slide.rows) {
        const [x, dx, acc] = row.map((cell) => Number(cell ?? fill.shift()));
        const force = d((s) => f(s, 0), x);
        expect(near(dx, force, 1e-6) && near(acc, force / n(p.m), 1e-6), JSON.stringify(p)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-el-flow')) {
      const k = n(p.m) * n(p.w) ** 2;
      expect(near(answerOf(slide)[0], natural(k, n(p.m)), 1e-6), JSON.stringify(p)).toBe(true);
      expect(flowWords(slide)[0]).toBe(`$-${Number(k.toFixed(6))}x$`);
    }
  });
});
