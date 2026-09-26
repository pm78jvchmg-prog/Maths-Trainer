/**
 * An independent check on the sums-of-powers generators.
 *
 * The generators work from the coefficients, through Newton's identities and
 * the recurrence. This finds the roots themselves, numerically and as complex
 * numbers since most of these polynomials have no whole roots, and works
 * every claimed answer out again from them directly: α³ + β³ as two cubes,
 * Σα²β as its six terms, Σ1/α² as three reciprocals. A slip in an identity
 * cannot agree with itself here.
 */
import { describe, expect, it } from 'vitest';
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
const pow = (a: C, n: number): C => {
  let out: C = [1, 0];
  for (let i = 0; i < Math.abs(n); i += 1) out = mul(out, a);
  return n < 0 ? div([1, 0], out) : out;
};

/** Every root of p, by Durand-Kerner. */
function rootsOf(p: number[]): C[] {
  const monic = p.map((c) => c / p[0]);
  const n = p.length - 1;
  const at = (z: C): C => monic.reduce<C>((acc, c) => add(mul(acc, z), [c, 0]), [0, 0]);
  let zs: C[] = Array.from({ length: n }, (_, k) => pow([0.4, 0.9], k + 1));
  for (let it = 0; it < 500; it += 1) {
    zs = zs.map((z, i) => {
      let den: C = [1, 0];
      zs.forEach((w, j) => {
        if (j !== i) den = mul(den, sub(z, w));
      });
      return sub(z, div(at(z), den));
    });
  }
  return zs;
}

/** A real sum over the roots; the imaginary part must vanish. */
function real(z: C): number {
  expect(Math.abs(z[1])).toBeLessThan(1e-4);
  return z[0];
}

const powerSum = (roots: C[], n: number): number => real(roots.reduce<C>((acc, r) => add(acc, pow(r, n)), [0, 0]));

/** The value of a label's TeX: an integer or a (signed) \frac. */
function texValue(tex: string): number {
  const bare = tex.replace(/\$/g, '').trim();
  const frac = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(bare);
  if (frac) return (frac[1] ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  expect(bare).toMatch(/^-?\d+$/);
  return Number(bare);
}

/** An answer string: "12" or "(n)/(d)". */
function answerValue(answer: string): number {
  const frac = /^\((-?\d+)\)\/\((-?\d+)\)$/.exec(answer);
  return frac ? Number(frac[1]) / Number(frac[2]) : Number(answer);
}

interface Draw {
  params: Record<string, unknown>;
  slide: Slide;
}

function draws(id: string): Draw[] {
  const generator = registry[id] as unknown as Generator<Record<string, unknown>>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params) };
    }),
  );
}

// A repeated root converges slowly, so the tolerance is loose; every value is a
// whole number or a fraction over at most 324, far coarser than this.
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-4);

/** Σα, Σαβ, αβγ from the roots, multiplied out. */
function sums(roots: C[]): number[] {
  const [a, b, c] = roots;
  return [real(add(add(a, b), c)), real(add(add(mul(a, b), mul(b, c)), mul(c, a))), real(mul(mul(a, b), c))];
}

describe('sums of powers of roots, from the roots themselves', () => {
  it('α³ + β³, both ways', () => {
    for (const { params, slide } of draws('poly-pow-cube-two')) {
      const roots = rootsOf(params.p as number[]);
      if (slide.kind !== 'expression') throw new Error('kind');
      close(answerValue(slide.answer), powerSum(roots, 3));
    }
    for (const { params, slide } of draws('poly-pow-cube-tree')) {
      const [a, b] = rootsOf(params.p as number[]);
      if (slide.kind !== 'tree') throw new Error('kind');
      const s = real(add(a, b));
      const e = real(mul(a, b));
      const want = [s, e, s ** 3, 3 * e * s, powerSum([a, b], 3)];
      slide.answer.forEach((v, i) => close(Number(v), want[i]));
    }
  });

  it('α²β + αβ² and (α - β)²', () => {
    for (const { params, slide } of draws('poly-pow-two-sym')) {
      const [a, b] = rootsOf(params.p as number[]);
      if (slide.kind !== 'expression') throw new Error('kind');
      const want = params.ask === 0 ? real(add(mul(mul(a, a), b), mul(a, mul(b, b)))) : real(pow(sub(a, b), 2));
      close(answerValue(slide.answer), want);
    }
  });

  it('the steps lines land on S_n', () => {
    for (const { params, slide } of draws('poly-pow-quad-steps')) {
      const roots = rootsOf([1, params.b as number, params.c as number]);
      if (slide.kind !== 'steps') throw new Error('kind');
      close(Number(slide.reductions[slide.reductions.length - 1].value), powerSum(roots, params.n as number));
    }
    for (const { params, slide } of draws('poly-pow-cubic-steps')) {
      const roots = rootsOf(params.p as number[]);
      if (slide.kind !== 'steps') throw new Error('kind');
      close(Number(slide.reductions[slide.reductions.length - 1].value), powerSum(roots, params.n as number));
    }
  });

  it('the tables hold S_n, given cells included', () => {
    for (const id of ['poly-pow-quad-table', 'poly-pow-cubic-table']) {
      for (const { params, slide } of draws(id)) {
        const p = id === 'poly-pow-quad-table' ? [1, params.b as number, params.c as number] : (params.p as number[]);
        const roots = rootsOf(p);
        if (slide.kind !== 'table') throw new Error('kind');
        const answers = [...slide.answer];
        slide.rows.forEach(([n, cell]) => close(Number(cell ?? answers.shift()), powerSum(roots, Number(n))));
      }
    }
  });

  it('the rule offered as right is the one the power sums follow', () => {
    for (const { params, slide } of draws('poly-pow-recurrence')) {
      const roots = rootsOf(params.p as number[]);
      if (slide.kind !== 'choice') throw new Error('kind');
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      const [lhs, rhs] = label.split(' = ');
      const shift = Number(/n\+(\d)/.exec(lhs)![1]);
      for (let n = 0; n <= 3; n += 1) {
        let total = 0;
        for (const m of rhs.matchAll(/([+-]?)\s*(\d*)S_\{n(?:\+(\d))?\}/g)) {
          const k = (m[1] === '-' ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
          total += k * powerSum(roots, n + Number(m[3] ?? 0));
        }
        close(total, powerSum(roots, n + shift));
      }
      // And no other option is.
      for (const option of slide.options) {
        if (option.id === slide.correctId) continue;
        expect(option.label).not.toBe(label);
      }
    }
  });

  it('S_3, S_4 and S_5 of a cubic or quadratic', () => {
    for (const { params, slide } of draws('poly-pow-cubic-s3')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      close(answerValue(slide.answer), powerSum(rootsOf(params.p as number[]), 3));
    }
    for (const { params, slide } of draws('poly-pow-s3-tree')) {
      const roots = rootsOf(params.p as number[]);
      if (slide.kind !== 'tree') throw new Error('kind');
      const want = [...sums(roots), powerSum(roots, 2), powerSum(roots, 3)];
      slide.answer.forEach((v, i) => close(Number(v), want[i]));
    }
    for (const { params, slide } of draws('poly-pow-higher')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      close(answerValue(slide.answer), powerSum(rootsOf(params.p as number[]), params.n as number));
    }
  });

  it('Σα²β as its six terms', () => {
    const six = (roots: C[]): number => {
      let total: C = [0, 0];
      roots.forEach((a, i) =>
        roots.forEach((b, j) => {
          if (i !== j) total = add(total, mul(mul(a, a), b));
        }),
      );
      return real(total);
    };
    for (const { params, slide } of draws('poly-pow-sq-beta')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      close(answerValue(slide.answer), six(rootsOf(params.p as number[])));
    }
    for (const { params, slide } of draws('poly-pow-sq-beta-tree')) {
      if (slide.kind !== 'tree') throw new Error('kind');
      close(Number(slide.answer[slide.answer.length - 1]), six(rootsOf(params.p as number[])));
    }
  });

  it('shifted products and reciprocal squares', () => {
    for (const { params, slide } of draws('poly-pow-shift-product')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      const k = params.k as number;
      const product = rootsOf(params.p as number[]).reduce<C>((acc, r) => mul(acc, add(r, [k, 0])), [1, 0]);
      close(answerValue(slide.answer), real(product));
    }
    for (const { params, slide } of draws('poly-pow-recip-squares')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      close(answerValue(slide.answer), powerSum(rootsOf(params.p as number[]), -2));
    }
  });

  it('the flow ends on the right value', () => {
    for (const { params, slide } of draws('poly-pow-which-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const roots = rootsOf(params.p as number[]);
      const [e1, e2, e3] = sums(roots);
      const want = [
        powerSum(roots, 3),
        e1 * e2 - 3 * e3,
        powerSum(roots, -2),
        real(roots.reduce<C>((acc, r) => mul(acc, add(r, [1, 0])), [1, 0])),
      ][params.target as number];
      close(texValue(slide.answer[1]), want);
    }
  });
});
