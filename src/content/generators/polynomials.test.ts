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

/** The curve a graph question is about: its display, or a prose block that is one inline formula. */
function curveOf(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  for (const block of slide.prompt) {
    if (block.kind === 'display') return block.tex;
    if (block.kind === 'prose' && /^\$[^$]+\$$/.test(block.text)) return block.text.slice(1, -1);
  }
  return '';
}

/** A curve's equation as displayed, "y = ..." or "p(x) = ...", evaluated at x. */
function curveAt(tex: string, x: number): number {
  return at(tex.replace(/^y\s*=\s*/, ''), x);
}

/** Degree and leading coefficient from finite differences at whole points: nothing read from the generator. */
function leading(tex: string): { degree: number; lead: number } {
  let row = Array.from({ length: 10 }, (_, x) => curveAt(tex, x));
  let degree = 0;
  let top = row[0];
  for (let n = 1; n < 9; n += 1) {
    row = row.slice(1).map((v, i) => v - row[i]);
    if (row.every((v) => Math.abs(v) < 1e-6)) break;
    degree = n;
    top = row[0];
  }
  let factorial = 1;
  for (let k = 2; k <= degree; k += 1) factorial *= k;
  return { degree, lead: top / factorial };
}

describe('polynomial graphs, checked from what the learner sees', () => {
  it('the roots placed make the curve zero', () => {
    for (const { slide, seed, difficulty } of slides('poly-graph-roots-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      for (const root of slide.answer) {
        expect(curveAt(curveOf(slide), Number(root)), `seed ${seed} d${difficulty}: x = ${root}`).toBeCloseTo(0, 9);
      }
    }
  });

  it('the y-intercept is the curve at x = 0', () => {
    for (const { slide, seed, difficulty } of slides('poly-intercept')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(curveAt(curveOf(slide), 0), `seed ${seed} d${difficulty}`).toBeCloseTo(Number(slide.answer), 9);
    }
  });

  it('the leading coefficient is what the curve does for large x', () => {
    for (const { slide, seed, difficulty } of slides('poly-lead-coefficient')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(leading(curveOf(slide)).lead, `seed ${seed} d${difficulty}`).toBeCloseTo(Number(slide.answer), 6);
    }
  });

  it('touch or cross agrees with the sign either side of the root', () => {
    for (const { slide, seed, difficulty } of slides('poly-touch-cross')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const root = Number(/at \$x = (-?\d+)\$/.exec(prose(slide))![1]);
      const left = curveAt(curveOf(slide), root - 0.01);
      const right = curveAt(curveOf(slide), root + 0.01);
      const touches = slide.options.find((o) => o.id === slide.correctId)!.label.startsWith('Touches');
      expect(Math.sign(left) === Math.sign(right), `seed ${seed} d${difficulty}: x = ${root}`).toBe(touches);
    }
  });

  it('a test point is worked out to the curve there', () => {
    for (const { slide, seed, difficulty } of slides('poly-test-point-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const text = prose(slide);
      const curve = /^\$p\(x\) = ([^$]+)\$/.exec(text)![1];
      const t = Number(/is \$p\((-?\d+)\)\$/.exec(text)![1]);
      const total = slide.reductions[slide.reductions.length - 1].value;
      expect(curveAt(curve, t), `seed ${seed} d${difficulty}`).toBeCloseTo(Number(total), 9);
    }
  });

  it('the number in front puts the curve through the point it was given', () => {
    for (const { slide, seed, difficulty } of slides('poly-find-lead')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const text = prose(slide);
      const point = /point \$\((-?\d+), (-?\d+)\)\$/.exec(text);
      const [x, y] = point ? [Number(point[1]), Number(point[2])] : [0, Number(/at \$y = (-?\d+)\$/.exec(text)![1])];
      const withA = curveOf(slide).replace('a', `(${slide.answer})`);
      expect(curveAt(withA, x), `seed ${seed} d${difficulty}`).toBeCloseTo(y, 9);
    }
  });

  it('a sketch written out touches, crosses and cuts the y-axis where it was described', () => {
    for (const { slide, seed, difficulty } of slides('poly-sketch-form-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const text = prose(slide);
      const touch = Number(/touches the \$x\$-axis at \$x = (-?\d+)\$/.exec(text)![1]);
      const cross = Number(/crosses it at \$x = (-?\d+)\$/.exec(text)![1]);
      const filled = slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const where = `seed ${seed} d${difficulty}`;
      expect(curveAt(filled, touch), where).toBeCloseTo(0, 9);
      expect(curveAt(filled, cross), where).toBeCloseTo(0, 9);
      expect(Math.sign(curveAt(filled, touch - 0.5)), where).toBe(Math.sign(curveAt(filled, touch + 0.5)));
      const intercept = /\$y\$-axis at \$y = (-?\d+)\$/.exec(text);
      if (intercept) expect(curveAt(filled, 0), where).toBeCloseTo(Number(intercept[1]), 9);
      else expect(leading(filled).lead, where).toBeGreaterThan(0);
    }
  });
});
