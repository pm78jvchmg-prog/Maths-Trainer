/**
 * An independent check on the complex conjugate root generators.
 *
 * The sweep proves each generator agrees with itself. These read what the
 * learner is shown (the polynomial in the prompt, the root it names) and the
 * answer the slide marks right, turn both back into mathjs, and substitute
 * the complex roots with complex arithmetic: a claimed factor, root or
 * coefficient that is wrong leaves a non-zero value, however consistent the
 * generator is with itself.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { rootsConjugateGenerators } from './rootsConjugate';

const SEEDS = 100;
const DIFFICULTIES = [1, 2];

type C = { re: number; im: number };

/** Learner-facing TeX of a polynomial, a number or a + bi, as mathjs reads it. */
function toMath(tex: string): string {
  return tex
    .replace(/\$/g, '')
    .replace(/\s*=\s*0$/, '')
    .replace(/\^\{(\d+)\}/g, '^($1)')
    .replace(/\^(\d)/g, '^($1)')
    .replace(/(\d)([xi(])/g, '$1*$2')
    .replace(/\)\(/g, ')*(')
    .replace(/\)x/g, ')*x');
}

function value(tex: string, x: C | number, scope: Record<string, number> = {}): C {
  const v = math.evaluate(toMath(tex), { x: typeof x === 'number' ? x : math.complex(x.re, x.im), ...scope });
  return typeof v === 'number' ? { re: v, im: 0 } : { re: v.re, im: v.im };
}

function complexOf(tex: string): C {
  return value(tex, 0);
}

const isZero = (v: C): boolean => Math.abs(v.re) < 1e-7 && Math.abs(v.im) < 1e-7;
const conj = (z: C): C => ({ re: z.re, im: -z.im });
const same = (u: C, v: C): boolean => isZero({ re: u.re - v.re, im: u.im - v.im });

const byId = (id: string): Generator<unknown> => {
  const g = rootsConjugateGenerators.find((gen) => gen.id === id);
  if (!g) throw new Error(id);
  return g as Generator<unknown>;
};

function slides(id: string): Slide[] {
  const g = byId(id);
  return DIFFICULTIES.flatMap((d) => Array.from({ length: SEEDS }, (_, seed) => g.render(g.sample(makeRng(seed), d))));
}

const proseOf = (slide: Slide): string =>
  'prompt' in slide ? slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ') : '';

/** Every $...$ span in the prompt. */
const spans = (slide: Slide): string[] => [...proseOf(slide).matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);

/** The equation `... = 0` in the prompt. */
const equationOf = (slide: Slide): string => spans(slide).find((s) => s.endsWith('= 0'))!;
/** The first complex number in the prompt, `z = a + bi` or bare. */
const rootOf = (slide: Slide): C => complexOf(spans(slide).find((s) => /i$/.test(s))!.replace(/^z = /, ''));

function filled(slide: Slide & { kind: 'tiles' }): string {
  return slide.template
    .split(/\{(\d+)\}/)
    .map((piece, k) => (k % 2 === 1 ? ` ${slide.answer[Number(piece)]} ` : piece))
    .join('');
}

/**
 * The t where a value linear in t is zero, from two probes: v(t) = v0 + t(v1 - v0),
 * solved in complex arithmetic. A real unknown comes out with no imaginary part.
 */
function solveLinear(at: (t: number) => C): number {
  const v0 = at(0);
  const v1 = at(1);
  const dr = v1.re - v0.re;
  const di = v1.im - v0.im;
  const size = dr * dr + di * di;
  const re = -(v0.re * dr + v0.im * di) / size;
  const im = -(v0.im * dr - v0.re * di) / size;
  expect(Math.abs(im)).toBeLessThan(1e-7);
  return re;
}

describe('conjugate root generators, checked from the roots', () => {
  it('the partner is the conjugate', () => {
    for (const slide of slides('poly-conj-partner-plot')) {
      if (slide.kind !== 'plot') throw new Error('kind');
      expect(same(slide.answer, conj(rootOf(slide)))).toBe(true);
    }
  });

  it('the pair sum and product', () => {
    for (const slide of slides('poly-conj-pair-sum')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      const z = rootOf(slide);
      const want = slide.lead!.includes('+') ? z.re * 2 : z.re * z.re + z.im * z.im;
      expect(Number(slide.answer)).toBe(want + 0);
    }
  });

  it('the factor tree: z + conj z and z conj z', () => {
    for (const slide of slides('poly-conj-factor-tree')) {
      if (slide.kind !== 'tree') throw new Error('kind');
      const z = rootOf(slide);
      const [s, , , p] = slide.answer.map(Number);
      expect(s).toBe(2 * z.re + 0);
      expect(p).toBe(z.re * z.re + z.im * z.im);
    }
  });

  it('the quadratic factor vanishes at the root and its conjugate', () => {
    for (const slide of slides('poly-conj-quad-factor-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const z = rootOf(slide);
      const q = filled(slide);
      expect(isZero(value(q, z)), q).toBe(true);
      expect(isZero(value(q, conj(z))), q).toBe(true);
    }
  });

  it('the real root of the cubic is a root', () => {
    for (const slide of slides('poly-conj-cubic-real-root')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      const p = equationOf(slide);
      expect(isZero(value(p, rootOf(slide))), p).toBe(true);
      expect(isZero(value(p, Number(slide.answer))), p).toBe(true);
    }
  });

  it('the cubic flow: conjugate, factor and real root', () => {
    for (const slide of slides('poly-conj-cubic-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const p = slide.subject;
      const z = rootOf(slide);
      const [partner, quad, root] = slide.answer.map((l) => l.replace(/\$/g, ''));
      expect(same(complexOf(partner), conj(z))).toBe(true);
      expect(isZero(value(p, z))).toBe(true);
      expect(isZero(value(quad, z)) && isZero(value(quad, conj(z)))).toBe(true);
      expect(isZero(value(p, Number(root)))).toBe(true);
    }
  });

  it('the built cubic has all three roots', () => {
    for (const slide of slides('poly-conj-cubic-build-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const z = rootOf(slide);
      const r = Number(spans(slide)[1]);
      const p = filled(slide);
      expect(isZero(value(p, z)) && isZero(value(p, conj(z))) && isZero(value(p, r)), p).toBe(true);
    }
  });

  it('the other factor of the quartic multiplies back to it', () => {
    for (const slide of slides('poly-conj-quartic-factor-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const p = equationOf(slide);
      const product = filled(slide);
      expect(isZero(value(p, rootOf(slide)))).toBe(true);
      for (const x of [-2.5, -1, 0, 0.5, 1.5, 3]) {
        expect(value(p, x).re).toBeCloseTo(value(product, x).re, 6);
      }
    }
  });

  it('the quartic flow: both factors and the other roots', () => {
    for (const slide of slides('poly-conj-quartic-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const p = slide.subject;
      const [quad, other, roots] = slide.answer.map((l) => l.replace(/\$/g, ''));
      for (const x of [-2.5, -1, 0, 0.5, 1.5, 3]) {
        expect(value(p, x).re).toBeCloseTo(value(`(${quad})(${other})`, x).re, 6);
      }
      const found: C[] = roots.includes('\\pm')
        ? (() => {
            const [re, im] = roots.split(' \\pm ');
            const b = complexOf(im).im;
            return [{ re: Number(re), im: b }, { re: Number(re), im: -b }];
          })()
        : roots.split(' and ').map((r) => ({ re: Number(r), im: 0 }));
      for (const r of found) expect(isZero(value(p, r)), `${roots} in ${p}`).toBe(true);
    }
  });

  it('the two-pair quartic vanishes at both pairs', () => {
    for (const slide of slides('poly-conj-two-pairs-tree')) {
      if (slide.kind !== 'tree') throw new Error('kind');
      const [z, w] = spans(slide).filter((s) => /i$/.test(s)).map(complexOf);
      const [, , , , B, C, D, E] = slide.answer.map(Number);
      const p = 'x^4 + B*x^3 + C*x^2 + D*x + E';
      for (const root of [z, w, conj(z), conj(w)]) {
        const v = math.evaluate(p, { x: math.complex(root.re, root.im), B, C, D, E });
        expect(isZero({ re: v.re, im: v.im })).toBe(true);
      }
    }
  });

  /** The unknown-coefficient equation with p and q put in, as a function of x. */
  const withPQ = (eq: string, p: number, q: number) => (x: C | number) => value(eq.replace(/p/g, '(P)').replace(/q/g, '(Q)'), x, { P: p, Q: q });

  it('the unknown tree: p and q make z and gamma roots', () => {
    for (const slide of slides('poly-conj-unknown-tree')) {
      if (slide.kind !== 'tree') throw new Error('kind');
      const [, , r, p, q] = slide.answer.map(Number);
      const f = withPQ(slide.expression, p, q);
      const z = rootOf(slide);
      expect(isZero(f(z)) && isZero(f(conj(z))) && isZero(f(r)), slide.expression).toBe(true);
    }
  });

  it('the unknown coefficient is the one that makes z a root', () => {
    const g = byId('poly-conj-unknown-coeff');
    const tree = byId('poly-conj-unknown-tree');
    for (const d of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const params = g.sample(makeRng(seed), d);
        const slide = g.render(params);
        const whole = tree.render(params);
        if (slide.kind !== 'expression' || whole.kind !== 'tree') throw new Error('kind');
        const eq = equationOf(slide);
        // The other unknown is recovered by solving from z being a root.
        const asked = slide.lead!.startsWith('p') ? 'p' : 'q';
        const known = Number(slide.answer);
        const z = rootOf(slide);
        // p(z) is linear in the other unknown: solve for it from two probes.
        const at = (t: number) => (asked === 'p' ? withPQ(eq, known, t) : withPQ(eq, t, known))(z);
        const t = solveLinear(at);
        expect(isZero(at(t)), `${eq} with ${asked} = ${known}`).toBe(true);
      }
    }
  });

  it('the identity flow reaches the real root and p', () => {
    for (const slide of slides('poly-conj-identity-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const eq = slide.subject;
      const z = rootOf(slide);
      const [which, root, pl] = slide.answer;
      const r = Number(root.replace(/\$/g, ''));
      const p = Number(pl.replace(/\$/g, ''));
      // q from z being a root once p is in.
      const at = (t: number) => withPQ(eq, p, t)(z);
      const t = solveLinear(at);
      expect(isZero(at(t))).toBe(true);
      expect(isZero(withPQ(eq, p, t)(r))).toBe(true);
      // The chosen identity has no unknown in it: the known coefficient is the x^2 one or the constant.
      expect(which).toBe(eq.includes('px^{2}') ? 'The product of the roots' : 'The sum of the roots');
    }
  });

  it('the root that must be included is the missing conjugate, and no other option is forced', () => {
    for (const slide of slides('poly-conj-must-include')) {
      if (slide.kind !== 'choice') throw new Error('kind');
      const given = spans(slide).slice(1).map(complexOf);
      const forced = given.filter((z) => z.im !== 0 && !given.some((w) => same(w, conj(z)))).map(conj);
      for (const option of slide.options) {
        const v = complexOf(option.label);
        expect(forced.some((f) => same(f, v))).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the count flow ends at every count the leftover roots allow', () => {
    for (const slide of slides('poly-conj-count-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const [nTex, ...roots] = spans(slide);
      const n = Number(nTex);
      const left = n - 2 * roots.length;
      // Brute force: t real roots and the rest in pairs.
      const counts = Array.from({ length: left + 1 }, (_, t) => t).filter((t) => (left - t) % 2 === 0);
      const label = slide.answer[2];
      const listed = [...label.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
      expect(listed).toEqual(counts);
      expect(slide.answer[0]).toBe(`$${2 * roots.length}$`);
    }
  });

  it('only the right list of roots is closed under conjugation', () => {
    for (const slide of slides('poly-conj-possible-sets')) {
      if (slide.kind !== 'choice') throw new Error('kind');
      const degree = proseOf(slide).includes('cubic') ? 3 : 4;
      for (const option of slide.options) {
        const roots = option.label.split(',\\ ').map(complexOf);
        const closed = roots.length === degree && roots.every((z) => roots.some((w) => same(w, conj(z))));
        expect(closed, option.label).toBe(option.id === slide.correctId);
      }
    }
  });
});
