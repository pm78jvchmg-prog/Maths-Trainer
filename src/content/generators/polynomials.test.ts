/**
 * An independent check on the polynomial division generators.
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself. These read what the learner is actually shown — the dividend, the
 * divisor, and the quotient and remainder the slide says are right — parse it
 * with mathjs, and confirm that divisor times quotient plus remainder is the
 * dividend at a spread of points. A slip in the arithmetic, or in how a
 * polynomial is written out, fails here even when every generator is
 * internally consistent.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 120;
const POINTS = [-3, -2, -1, 0, 1, 2, 3, 5];

/** The learner-facing TeX of a polynomial as something mathjs evaluates. */
function toMath(tex: string): string {
  return tex
    .replace(/^p\(x\)\s*=\s*/, '')
    .replace(/\s*=\s*0$/, '')
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/\\div/g, '/')
    // "0x" would read as the start of a hexadecimal number.
    .replace(/(\d)x/g, '$1*x');
}

function at(tex: string, x: number): number {
  return math.evaluate(toMath(tex), { x }) as number;
}

function slides(id: string): { slide: Slide; seed: number; difficulty: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      seed,
      difficulty,
    })),
  );
}

/** The divisor's root, read from "(x - 3)" or "(x + 2)" in the text given. */
function rootIn(text: string): number {
  const match = /\(x ([+-]) (\d+)\)/.exec(text);
  if (!match) throw new Error(`no linear divisor in ${text}`);
  return match[1] === '-' ? Number(match[2]) : -Number(match[2]);
}

function prose(slide: Slide): string {
  return 'prompt' in slide ? slide.prompt.map((block) => ('text' in block ? block.text : '')).join(' ') : '';
}

function display(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  const block = slide.prompt.find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

/** The identity itself: dividend(x) = (x - a) quotient(x) + remainder, at every point. */
function expectDivision(dividend: string, a: number, quotient: string, remainder: number, where: string) {
  for (const x of POINTS) {
    expect(at(dividend, x), `${where} at x = ${x}`).toBeCloseTo((x - a) * at(quotient, x) + remainder, 9);
  }
}

describe('polynomial division, checked from what the learner sees', () => {
  it('long division: the terms taken away and the remainder rebuild the dividend', () => {
    for (const { slide, seed, difficulty } of slides('poly-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const a = rootIn(prose(slide));
      // Each step's value is the next first term, whose coefficient is the next
      // quotient coefficient; the last is the remainder.
      const [b, c, r] = slide.reductions.map((step) => step.value);
      const coefficient = (term: string) => at(term, 1);
      const quotient = `x^(2) + (${coefficient(b)})*x + (${coefficient(c)})`;
      expectDivision(slide.start.join(' '), a, quotient, Number(r), `seed ${seed} d${difficulty}`);
    }
  });

  it('synthetic division: the chain is the quotient then the remainder', () => {
    for (const { slide, seed, difficulty } of slides('poly-synthetic-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [, dividend, divisor] = /^\\frac\{(.+)\}\{(.+)\}$/.exec(slide.expression)!;
      const [q2, q1, q0, r] = slide.answer.map(Number);
      expectDivision(dividend, rootIn(`(${divisor})`), `(${q2})*x^2 + (${q1})*x + (${q0})`, r, `seed ${seed} d${difficulty}`);
    }
  });

  it('quotient tiles: the filled template is the dividend', () => {
    for (const { slide, seed, difficulty } of slides('poly-quotient-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
      for (const x of POINTS) {
        expect(at(filled, x), `seed ${seed} d${difficulty} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      }
    }
  });

  it('remainder: the answer is what long division would leave', () => {
    for (const { slide, seed, difficulty } of slides('poly-remainder')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const text = prose(slide);
      const dividend = /\$p\(x\) = ([^$]+)\$/.exec(text)![1];
      const a = rootIn(text);
      // Divide by (x - a) with nothing borrowed from the generator: the
      // remainder is whatever is left once (x - a) times some quadratic is
      // taken off, which is the dividend's value at a.
      const r = Number(slide.answer);
      const quotientAt = (x: number) => (at(dividend, x) - r) / (x - a);
      // A true remainder leaves a quotient that is a polynomial, so its
      // values at whole points are finite and fit one quadratic exactly.
      const [y0, y1, y2, y3] = [10, 11, 12, 13].map(quotientAt);
      expect(y3 - 3 * y2 + 3 * y1 - y0, `seed ${seed} d${difficulty}`).toBeCloseTo(0, 6);
    }
  });

  it('factorised tiles multiply back to the cubic', () => {
    for (const { slide, seed, difficulty } of slides('poly-factorise-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
      for (const x of POINTS) {
        expect(at(filled, x), `seed ${seed} d${difficulty} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      }
    }
  });

  it('solutions of a cubic make it zero', () => {
    for (const { slide, seed, difficulty } of slides('poly-solve-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      for (const root of slide.answer) {
        expect(at(display(slide), Number(root)), `seed ${seed} d${difficulty}: x = ${root}`).toBeCloseTo(0, 9);
      }
    }
  });
});
