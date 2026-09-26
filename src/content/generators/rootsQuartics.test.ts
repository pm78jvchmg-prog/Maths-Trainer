/**
 * An independent check on the level 8 generators (roots of quartics).
 *
 * The sweep proves each generator agrees with itself. These work every answer
 * out again the long way, from the roots: each sum by adding the products of
 * every subset of the roots, Σα² and Σ1/α term by term, and the quartic the
 * learner reads is parsed and evaluated at each root, which must give zero.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 80;

/** The sum of the products of every k-subset of the roots. */
function subsetSum(roots: number[], k: number): number {
  let total = 0;
  const walk = (from: number, left: number, product: number) => {
    if (left === 0) {
      total += product;
      return;
    }
    for (let i = from; i < roots.length; i += 1) walk(i + 1, left - 1, product * roots[i]);
  };
  walk(0, k, 1);
  return total;
}

/** A learner-facing polynomial as something mathjs evaluates. */
function toMath(tex: string): string {
  return tex
    .replace(/\s*=\s*0$/, '')
    .replace(/\^\{(\d+)\}/g, '^$1')
    .replace(/(\d)x/g, '$1*x');
}

/** A tiles template with its blanks filled, split the way the widget splits it. */
const fill = (template: string, answer: string[]): string =>
  template.split(/\{(\d+)\}/g).map((piece, i) => (i % 2 === 1 ? ` ${answer[Number(piece)]} ` : piece)).join('');

const at = (tex: string, x: number): number => Number(math.evaluate(toMath(tex), { x }));

function draws<P>(id: string, run: (params: P, slide: Slide) => void): void {
  const generator = registry[id] as unknown as Generator<P>;
  expect(generator, id).toBeDefined();
  for (const difficulty of [1, 2]) {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const params = generator.sample(makeRng(seed * 7 + difficulty), difficulty);
      run(params, generator.render(params));
    }
  }
}

const value = (answer: string): number => Number(math.evaluate(answer));

interface Quartic {
  roots: number[];
  lead: number;
}

describe('roots of quartics', () => {
  it('reads each sum of the roots correctly, and shows a quartic with those roots', () => {
    draws<Quartic & { ask: number }>('poly-q4-vieta', ({ roots, ask }, slide) => {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(value(slide.answer)).toBe(subsetSum(roots, ask + 1));
      const tex = (slide.prompt[0] as { text: string }).text.split('$')[9];
      for (const r of roots) expect(Math.abs(at(tex, r))).toBeLessThan(1e-9);
    });
  });

  it('builds the four sums from the roots', () => {
    draws<{ roots: number[] }>('poly-q4-sums-tree', ({ roots }, slide) => {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      expect(slide.answer.slice(4).map(Number)).toEqual([1, 2, 3, 4].map((k) => subsetSum(roots, k)));
    });
  });

  it('fills in a quartic that vanishes at every root', () => {
    draws<Quartic>('poly-q4-build-tiles', ({ roots }, slide) => {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = fill(slide.template, slide.answer);
      for (const r of roots) expect(Math.abs(at(filled.replace(/x\^4/, 'x^{4}'), r))).toBeLessThan(1e-9);
    });
  });

  it('fills in two factors, one per pair of roots', () => {
    draws<{ roots: number[] }>('poly-q4-pairs-tiles', ({ roots }, slide) => {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = fill(slide.template, slide.answer);
      const [first, second] = filled.split(')(').map((part) => part.replace(/[()]/g, ''));
      expect(Math.abs(at(first, roots[0])) + Math.abs(at(first, roots[1]))).toBeLessThan(1e-9);
      expect(Math.abs(at(second, roots[2])) + Math.abs(at(second, roots[3]))).toBeLessThan(1e-9);
    });
  });

  it('finds the other pair from two known roots', () => {
    draws<Quartic>('poly-q4-other-pair-tree', ({ roots }, slide) => {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      expect(slide.answer.slice(4).map(Number)).toEqual([roots[2] + roots[3], roots[2] * roots[3]]);
    });
    draws<Quartic>('poly-q4-other-roots-flow', ({ roots }, slide) => {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const last = slide.answer[2].match(/-?\d+/g)!.map(Number).sort((a, b) => a - b);
      expect(last).toEqual([roots[2], roots[3]].sort((a, b) => a - b));
    });
  });

  it('builds a quartic in opposite pairs that vanishes at ±√u and ±√v', () => {
    draws<{ u: number; v: number; lead: number }>('poly-q4-pm-tiles', ({ u, v }, slide) => {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = fill(slide.template, slide.answer);
      for (const x of [Math.sqrt(u), -Math.sqrt(u), Math.sqrt(v), -Math.sqrt(v)]) {
        expect(Math.abs(at(filled.replace(/x\^4/, 'x^{4}').replace(/x\^2/, 'x^{2}'), x))).toBeLessThan(1e-6);
      }
    });
    draws<{ u: number; v: number; lead: number }>('poly-q4-pm-unknown', ({ u, v, lead }, slide) => {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      // The quartic with k in place has to vanish at both pairs.
      const k = value(slide.answer);
      for (const x of [Math.sqrt(u), Math.sqrt(v)]) {
        expect(Math.abs(lead * x ** 4 - lead * (u + v) * x ** 2 + k)).toBeLessThan(1e-6);
      }
    });
  });

  it('finds Σα² and Σ1/α term by term', () => {
    draws<Quartic & { ask: number }>('poly-q4-symmetric', ({ roots, ask }, slide) => {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const want = ask === 0 ? roots.reduce((s, r) => s + r * r, 0) : roots.reduce((s, r) => s + 1 / r, 0);
      expect(Math.abs(value(slide.answer) - want)).toBeLessThan(1e-9);
    });
    draws<Quartic>('poly-q4-squares-tree', ({ roots }, slide) => {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      expect(Number(slide.answer[4])).toBe(roots.reduce((s, r) => s + r * r, 0));
    });
    draws<Quartic & { target: number }>('poly-q4-identity-flow', ({ roots, target }, slide) => {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      let want = roots.reduce((s, r) => s + r * r, 0);
      if (target === 1) want = roots.reduce((s, r) => s + 1 / r, 0);
      if (target === 2) {
        want = 0;
        for (let i = 0; i < 4; i += 1) for (let j = i + 1; j < 4; j += 1) want += 1 / (roots[i] * roots[j]);
      }
      const tex = slide.answer[1].replace(/\$/g, '').replace(/\\frac\{(\d+)\}\{(\d+)\}/, '($1/$2)');
      expect(Math.abs(Number(math.evaluate(tex)) - want)).toBeLessThan(1e-9);
    });
  });
});
