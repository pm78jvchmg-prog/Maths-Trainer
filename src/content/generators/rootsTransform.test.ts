/**
 * An independent check on the transforming-the-roots generators.
 *
 * The generators build each new equation by moving coefficients about. This
 * finds the roots of the original polynomial numerically (Durand-Kerner, in
 * complex arithmetic, since most of them are not real), transforms each root
 * directly (2α, α + 1, 1/α, α², 1/(α + 1)), and checks the equation the slide
 * claims is right really has those roots: it is read back from the learner-
 * facing TeX, evaluated at each transformed root, and must vanish there. The
 * values in the last lessons are recomputed from the roots in the same way.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;

type C = [number, number];
const add = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const abs = (a: C): number => Math.hypot(a[0], a[1]);
const re = (n: number): C => [n, 0];

function horner(p: number[], z: C): C {
  return p.reduce<C>((acc, c) => add(mul(acc, z), re(c)), re(0));
}

/** Every root of p, complex, by Durand-Kerner. */
function roots(p: number[]): C[] {
  const n = p.length - 1;
  const monic = p.map((c) => c / p[0]);
  let zs: C[] = Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n + 0.4;
    return [1.3 * Math.cos(t), 1.3 * Math.sin(t)];
  });
  for (let iter = 0; iter < 2000; iter += 1) {
    zs = zs.map((z, i) => {
      let den: C = re(1);
      zs.forEach((w, j) => {
        if (j !== i) den = mul(den, sub(z, w));
      });
      return sub(z, div(horner(monic, z), den));
    });
  }
  return zs;
}

/** The monic polynomial with these roots, times lead, real parts. */
function fromComplexRoots(zs: C[], lead: number): number[] {
  let out: C[] = [re(1)];
  for (const z of zs) {
    const next: C[] = [...out, re(0)];
    for (let i = 1; i < next.length; i += 1) next[i] = sub(next[i], mul(z, out[i - 1]));
    out = next;
  }
  return out.map((c) => c[0] * lead);
}

/** Learner-facing TeX of a polynomial equation as something mathjs reads. */
function toMath(tex: string): string {
  return tex
    .replace(/\$/g, '')
    .replace(/\s*=\s*0\s*$/, '')
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/(\d)x/g, '$1*x');
}

/** The claimed polynomial, read from TeX, evaluated at a complex point. */
function at(tex: string, z: C): C {
  const v = math.evaluate(toMath(tex), { x: math.complex(z[0], z[1]) }) as unknown;
  if (typeof v === 'number') return re(v);
  const c = v as { re: number; im: number };
  return [c.re, c.im];
}

/** Its coefficients, highest first, by evaluating at n + 1 points and solving. */
function coefficientsOf(tex: string, n: number): number[] {
  const xs = Array.from({ length: n + 1 }, (_, i) => i - 1);
  const rows = xs.map((x) => [...Array.from({ length: n + 1 }, (_, j) => x ** (n - j)), at(tex, re(x))[0]]);
  for (let col = 0; col <= n; col += 1) {
    const pivot = rows.findIndex((r, i) => i >= col && Math.abs(r[col]) > 1e-9);
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    for (let i = 0; i <= n; i += 1) {
      if (i === col) continue;
      const f = rows[i][col] / rows[col][col];
      rows[i] = rows[i].map((v, j) => v - f * rows[col][j]);
    }
  }
  return rows.map((r, i) => Math.round((r[n + 1] / r[i]) * 1e6) / 1e6);
}

/** The claimed equation has every transformed root, and the right degree. */
function expectRoots(tex: string, n: number, newRoots: C[], where: string) {
  const q = coefficientsOf(tex, n + 1);
  expect(q[0], `${where}: degree above ${n}`).toBeCloseTo(0, 6);
  expect(Math.abs(q[1]), `${where}: degree below ${n}`).toBeGreaterThan(0.5);
  const scale = q.reduce((s, c) => s + Math.abs(c), 0);
  for (const y of newRoots) {
    const size = Math.max(1, abs(y)) ** n;
    expect(abs(at(tex, y)) / (scale * size), `${where}: ${tex} at ${y}`).toBeLessThan(1e-6);
  }
}

function draws(id: string): { params: Record<string, unknown>; slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<Record<string, unknown>>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), where: `${id} seed ${seed} d${difficulty}` };
    }),
  );
}

/** A tiles slide's template with its blanks filled from the answer. */
function filled(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error('not tiles');
  return slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
}

const polyFrom = (values: number[]): string =>
  values.map((c, i) => `(${c})*x^(${values.length - 1 - i})`).join(' + ');

const numberOf = (answer: string): number => math.evaluate(answer) as number;

describe('transforming the roots: every claimed equation has the transformed roots', () => {
  it('scaling', () => {
    for (const { params, slide, where } of draws('poly-tr-scale-tiles')) {
      const p = params.p as number[];
      const k = params.k as number;
      expectRoots(filled(slide), p.length - 1, roots(p).map((z) => mul(z, re(k))), where);
      // The leading coefficient is kept.
      expect(coefficientsOf(filled(slide), p.length - 1)[0], where).toBeCloseTo(p[0], 6);
    }
    for (const { params, slide, where } of draws('poly-tr-scale-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const [b, k2, c, k3, d] = slide.answer.map(Number);
      expect([k2, k3], where).toEqual([k * k, k ** 3]);
      expectRoots(polyFrom([p[0], b, c, d]), 3, roots(p).map((z) => mul(z, re(k))), where);
    }
    for (const { params, slide, where } of draws('poly-tr-scale-value')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const power = params.power as number;
      const expected = params.over
        ? fromComplexRoots(roots(p).map((z) => div(z, re(k))), p[0] * k ** 3)
        : fromComplexRoots(roots(p).map((z) => mul(z, re(k))), p[0]);
      expect(numberOf(slide.answer), where).toBeCloseTo(expected[3 - power], 3);
    }
  });

  it('shifting', () => {
    for (const { params, slide, where } of draws('poly-tr-shift-steps')) {
      if (slide.kind !== 'steps') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectRoots(last, p.length - 1, roots(p).map((z) => add(z, re(k))), where);
    }
    for (const { params, slide, where } of draws('poly-tr-shift-tiles')) {
      const p = params.p as number[];
      const k = params.k as number;
      expectRoots(filled(slide), p.length - 1, roots(p).map((z) => add(z, re(k))), where);
    }
    for (const { params, slide, where } of draws('poly-tr-shift-value')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const n = p.length - 1;
      const expected = fromComplexRoots(roots(p).map((z) => add(z, re(k))), p[0]);
      expect(numberOf(slide.answer), where).toBeCloseTo(expected[n - (params.power as number)], 3);
    }
  });

  it('reciprocals', () => {
    for (const { params, slide, where } of draws('poly-tr-recip-tiles')) {
      const p = params.p as number[];
      const k = params.k as number;
      expectRoots(filled(slide), p.length - 1, roots(p).map((z) => div(re(k), z)), where);
    }
    for (const { params, slide, where } of draws('poly-tr-recip-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const [a, b, k2, c, k3, d] = slide.answer.map(Number);
      expect([k2, k3], where).toEqual([k * k, k ** 3]);
      expectRoots(polyFrom([a, b, c, d]), 3, roots(p).map((z) => div(re(k), z)), where);
    }
    for (const { params, slide, where } of draws('poly-tr-recip-value')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const rs = roots(params.p as number[]).map((z) => div(re(1), z));
      const ask = params.ask as number;
      let value: C;
      if (ask === 0) value = rs.reduce(add, re(0));
      else if (ask === 2 || rs.length === 2) value = rs.reduce(mul, re(1));
      else value = add(add(mul(rs[0], rs[1]), mul(rs[1], rs[2])), mul(rs[2], rs[0]));
      expect(numberOf(slide.answer), where).toBeCloseTo(value[0], 3);
    }
  });

  it('squares', () => {
    for (const { params, slide, where } of draws('poly-tr-square-sums-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const rs = roots(params.p as number[]);
      const sq = rs.map((z) => mul(z, z));
      const sums = (zs: C[]): number[] =>
        fromComplexRoots(zs, 1)
          .slice(1)
          .map((c, i) => (i % 2 === 0 ? -c : c));
      const got = slide.answer.map(Number);
      if (rs.length === 2) {
        const q = fromComplexRoots(sq, 1);
        const expected = [...sums(rs), ...sums(sq), q[1], q[2]];
        got.forEach((v, i) => expect(v, where).toBeCloseTo(expected[i], 3));
      } else {
        const expected = [...sums(rs), ...sums(sq)];
        got.forEach((v, i) => expect(v, where).toBeCloseTo(expected[i], 3));
      }
    }
    for (const { params, slide, where } of draws('poly-tr-square-sub-steps')) {
      if (slide.kind !== 'steps') throw new Error(where);
      const p = params.p as number[];
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectRoots(last, p.length - 1, roots(p).map((z) => mul(z, z)), where);
    }
    for (const { params, slide, where } of draws('poly-tr-square-value')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const p = params.p as number[];
      const n = p.length - 1;
      const expected = fromComplexRoots(roots(p).map((z) => mul(z, z)), 1);
      expect(numberOf(slide.answer), where).toBeCloseTo(expected[n - (params.power as number)], 3);
    }
  });

  it('choosing a substitution and using it', () => {
    for (const { params, slide, where } of draws('poly-tr-sub-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const p = params.p as number[];
      const k = params.k as number;
      const map: Record<string, (z: C) => C> = {
        scale: (z) => mul(z, re(k)),
        shift: (z) => add(z, re(k)),
        recip: (z) => div(re(1), z),
        square: (z) => mul(z, z),
        combo: (z) => div(re(1), add(z, re(k))),
      };
      const transform = map[params.type as string];
      expectRoots(slide.answer[1], p.length - 1, roots(p).map(transform), where);
      // Every other equation offered is genuinely wrong.
      const eq = slide.steps.find((s) => s.id === 'eq')!;
      for (const branch of eq.branches) {
        if (branch.label === slide.answer[1]) continue;
        const bad = roots(p)
          .map(transform)
          .some((y) => abs(at(branch.label, y)) > 1e-3);
        expect(bad, `${where}: ${branch.label} also has the roots`).toBe(true);
      }
    }
    for (const { params, slide, where } of draws('poly-tr-using-value')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const k = params.k as number;
      const ys = roots(params.p as number[]).map((z) => add(z, re(k)));
      const ask = params.ask as number;
      let value: C;
      if (ask === 0) value = ys.map((y) => div(re(1), y)).reduce(add, re(0));
      else if (ask === 2) value = ys.reduce(mul, re(1));
      else value = add(add(mul(ys[0], ys[1]), mul(ys[1], ys[2])), mul(ys[2], ys[0]));
      expect(numberOf(slide.answer), where).toBeCloseTo(value[0], 3);
    }
  });
});
