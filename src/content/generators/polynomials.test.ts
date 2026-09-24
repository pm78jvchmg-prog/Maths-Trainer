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

/** A display broken over two aligned lines, joined back into one. */
function flat(tex: string): string {
  if (!tex.startsWith('\\begin{aligned}')) return tex;
  return tex
    .replace(/\\(begin|end)\{aligned\}/g, '')
    .replace(/\\\\|\\quad|&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The learner-facing TeX of a polynomial as something mathjs evaluates. */
function toMath(tex: string): string {
  return flat(tex)
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
  return block && 'tex' in block ? flat(block.tex) : '';
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

/** toMath, with a letter standing for an unknown coefficient: "kx^{2}" is k times x^2. */
const lettered = (tex: string): string => toMath(tex).replace(/\b([kpq])x/g, '$1*x');

/** Whole-number roots of a displayed polynomial, found by trying every whole number in range. */
function wholeRoots(tex: string, scope: Record<string, number> = {}): number[] {
  const expr = toMath(tex.replace(/^f\(x\)\s*=\s*/, ''));
  const out: number[] = [];
  for (let x = -15; x <= 15; x += 1) {
    if (Math.abs(math.evaluate(expr, { ...scope, x }) as number) < 1e-9) out.push(x);
  }
  return out;
}

/** Σα, Σαβ, αβγ of a list of roots, computed the long way. */
function sumsOf(roots: number[]): number[] {
  const pairs = roots.flatMap((a, i) => roots.slice(i + 1).map((b) => a * b));
  return [roots.reduce((a, b) => a + b, 0), pairs.reduce((a, b) => a + b, 0), roots.reduce((a, b) => a * b, 1)];
}

/** A number as the learner reads it: 4, -3, (-3), -\frac{2}{3}. */
function readNumber(tex: string): number {
  const bare = tex.replace(/[()\s]/g, '');
  const frac = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(bare);
  if (frac) return (frac[1] ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  return Number(bare);
}

/** The polynomial a prompt says the roots belong to: "roots of $...= 0$". */
function rootsOfPrompt(slide: Slide): number[] {
  const match = /roots of \$([^$]+) = 0\$/.exec(prose(slide));
  if (!match) throw new Error(`no polynomial in ${prose(slide)}`);
  return wholeRoots(match[1]);
}

/** Roots listed in a prompt as "roots $-2, 1$ and $3$". */
function listedRoots(slide: Slide): number[] {
  const match = /roots \$([^$]+)\$ and \$(-?\d+)\$/.exec(prose(slide));
  if (!match) throw new Error(`no roots listed in ${prose(slide)}`);
  return [...match[1].split(',').map(Number), Number(match[2])];
}

const filledTemplate = (slide: Slide & { kind: 'tiles' }): string =>
  slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);

const correctLabel = (slide: Slide & { kind: 'choice' }): string =>
  slide.options.find((o) => o.id === slide.correctId)!.label;

describe('roots and coefficients, checked from what the learner sees', () => {
  it('the sum or product asked for is what the roots of the polynomial give', () => {
    for (const id of ['poly-roots-sum-product', 'poly-cubic-vieta']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected expression');
        const roots = rootsOfPrompt(slide);
        const sums = sumsOf(roots);
        const lead = slide.lead ?? '';
        const which = /\\gamma\\alpha/.test(lead) || (roots.length === 2 && !lead.includes('+')) ? 1 : lead.includes('+') ? 0 : roots.length - 1;
        const index = roots.length === 3 && which === 1 && !/\\gamma\\alpha/.test(lead) ? 2 : which;
        expect(Number(slide.answer), `${id} seed ${seed} d${difficulty}`).toBe(sums[index]);
      }
    }
  });

  it('the signs chosen are the signs of the roots', () => {
    for (const { slide, seed, difficulty } of slides('poly-root-signs')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const match = /^\$([^$]+) = 0\$/.exec(prose(slide))!;
      const roots = wholeRoots(match[1]);
      const label = correctLabel(slide);
      const expected = roots.every((r) => r > 0) ? 'Both positive' : roots.every((r) => r < 0) ? 'Both negative' : 'One positive, one negative';
      expect(label, `seed ${seed} d${difficulty}`).toBe(expected);
    }
  });

  it('a quadratic built from a sum and a product has roots with that sum and product', () => {
    for (const { slide, seed, difficulty } of slides('poly-sum-product-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [, s, p] = /sum is \$(-?\d+)\$ and whose product is \$(-?\d+)\$/.exec(prose(slide))!.map(Number);
      const roots = wholeRoots(filledTemplate(slide));
      expect(roots.length, `seed ${seed} d${difficulty}`).toBe(2);
      expect(sumsOf(roots).slice(0, 2), `seed ${seed} d${difficulty}`).toEqual([s, p]);
    }
  });

  it('the tree from two or three roots ends in coefficients that have those roots', () => {
    for (const id of ['poly-quad-coeffs-tree', 'poly-cubic-coeffs-tree']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected tree');
        const text = prose(slide);
        const roots = id === 'poly-quad-coeffs-tree'
          ? [...text.matchAll(/(?:alpha|beta) = (-?\d+)/g)].map((m) => Number(m[1]))
          : listedRoots(slide);
        const coefficients = slide.answer.slice(-roots.length).map(Number);
        const lead = slide.expression.startsWith('-x') ? -1 : Number(/^(-?\d*)x/.exec(slide.expression)![1] || 1);
        const poly = [lead, ...coefficients].map((c, i) => `(${c})*x^${roots.length - i}`).join(' + ');
        for (const r of roots) expect(math.evaluate(poly, { x: r }) as number, `${id} seed ${seed} d${difficulty}`).toBeCloseTo(0, 9);
      }
    }
  });

  it('the three sums of a cubic are the sums of its roots', () => {
    for (const { slide, seed, difficulty } of slides('poly-cubic-identity-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      expect(slide.answer.map(Number), `seed ${seed} d${difficulty}`).toEqual(sumsOf(rootsOfPrompt(slide)));
    }
    for (const { slide, seed, difficulty } of slides('poly-vieta-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const roots = wholeRoots(slide.subject.replace(/ = 0$/, ''));
      expect(slide.answer.map((a) => Number(a.replace(/\$/g, ''))), `seed ${seed} d${difficulty}`).toEqual(sumsOf(roots));
    }
    for (const { slide, seed, difficulty } of slides('poly-cubic-sums-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const roots = [...slide.expression.matchAll(/= (-?\d+)/g)].map((m) => Number(m[1]));
      const [s1, , , , s2, s3] = slide.answer.map(Number);
      expect([s1, s2, s3], `seed ${seed} d${difficulty}`).toEqual(sumsOf(roots));
    }
  });

  it('a cubic built from its roots is zero at each of them', () => {
    for (const { slide, seed, difficulty } of slides('poly-roots-to-cubic-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      for (const r of listedRoots(slide)) expect(at(filledTemplate(slide), r), `seed ${seed} d${difficulty}: x = ${r}`).toBeCloseTo(0, 9);
    }
    for (const { slide, seed, difficulty } of slides('poly-roots-to-cubic-tiles+choice')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      for (const r of listedRoots(slide)) expect(at(correctLabel(slide), r), `seed ${seed} d${difficulty}: x = ${r}`).toBeCloseTo(0, 9);
    }
  });

  it('a cubic chosen from its sums has roots with those sums', () => {
    for (const { slide, seed, difficulty } of slides('poly-sums-to-cubic')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const text = prose(slide);
      const stated = [/\\Sigma\\alpha = (-?\d+)/, /\\Sigma\\alpha\\beta = (-?\d+)/, /\\alpha\\beta\\gamma = (-?\d+)/].map((re) => Number(re.exec(text)![1]));
      const roots = wholeRoots(correctLabel(slide));
      expect(roots.length, `seed ${seed} d${difficulty}`).toBe(3);
      expect(sumsOf(roots), `seed ${seed} d${difficulty}`).toEqual(stated);
    }
  });

  it('a cubic with new roots is zero at each changed root of the old one', () => {
    for (const { slide, seed, difficulty } of slides('poly-new-roots-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const text = prose(slide);
      const old = wholeRoots(/^\$p\(x\) = ([^$]+)\$/.exec(text)![1]);
      const scale = /cubic with roots \$(-?\d*)\\alpha,/.exec(text);
      const shift = /cubic with roots \$\\alpha ([+-]) (\d+),/.exec(text);
      const changed = scale
        ? old.map((r) => r * (scale[1] === '-' ? -1 : Number(scale[1] || 1)))
        : old.map((r) => r + (shift![1] === '-' ? -1 : 1) * Number(shift![2]));
      const cubic = slide.reductions[slide.reductions.length - 1].value;
      for (const r of changed) expect(at(cubic, r), `seed ${seed} d${difficulty}: x = ${r}`).toBeCloseTo(0, 9);
    }
  });

  it('the third root makes the cubic zero, with any unknown coefficient fixed by the roots given', () => {
    for (const { slide, seed, difficulty } of slides('poly-third-root')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [r1, r2] = [.../roots of \$f\(x\) = 0\$ are \$(-?\d+)\$ and \$(-?\d+)\$/.exec(prose(slide))!].slice(1).map(Number);
      const f = lettered(display(slide).replace(/^f\(x\)\s*=\s*/, ''));
      const value = (x: number, k: number) => math.evaluate(f, { x, k }) as number;
      // k enters as k x^2, so p(r1) = 0 fixes it; with no k the same is harmless.
      const k = -value(r1, 0) / (value(r1, 1) - value(r1, 0) || 1);
      const where = `seed ${seed} d${difficulty}`;
      expect(value(r1, k), where).toBeCloseTo(0, 9);
      expect(value(r2, k), where).toBeCloseTo(0, 9);
      expect(value(Number(slide.answer), k), where).toBeCloseTo(0, 9);
    }
  });

  it('the missing coefficient makes the cubic zero at both roots given', () => {
    for (const { slide, seed, difficulty } of slides('poly-missing-coeff-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const match = /\$f\(x\) = ([^$]+) = 0\$ are \$(-?\d+)\$ and \$(-?\d+)\$/.exec(prose(slide))!;
      const k = Number(/^k = (-?\d+)$/.exec(slide.reductions[slide.reductions.length - 1].value)![1]);
      for (const r of [match[2], match[3]].map(Number)) {
        expect(math.evaluate(lettered(match[1]), { x: r, k }) as number, `seed ${seed} d${difficulty}: x = ${r}`).toBeCloseTo(0, 9);
      }
    }
  });

  it('the third root found by the one usable identity makes the cubic zero', () => {
    for (const { slide, seed, difficulty } of slides('poly-which-identity-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [r1, r2] = [.../are \$(-?\d+)\$ and \$(-?\d+)\$/.exec(prose(slide))!].slice(1).map(Number);
      const f = lettered(slide.subject.replace(/^f\(x\)\s*=\s*/, ''));
      const value = (x: number, p: number, q: number) => math.evaluate(f, { x, p, q }) as number;
      // p and q enter linearly: solve them from the two roots given.
      const row = (x: number) => [value(x, 1, 0) - value(x, 0, 0), value(x, 0, 1) - value(x, 0, 0), -value(x, 0, 0)];
      const [a1, b1, c1] = row(r1);
      const [a2, b2, c2] = row(r2);
      const det = a1 * b2 - a2 * b1;
      const p = (c1 * b2 - c2 * b1) / det;
      const q = (a1 * c2 - a2 * c1) / det;
      const gamma = Number(slide.answer[1].replace(/\$/g, ''));
      expect(value(gamma, p, q), `seed ${seed} d${difficulty}`).toBeCloseTo(0, 6);
    }
  });

  it('roots in arithmetic progression make the cubic zero', () => {
    for (const { slide, seed, difficulty } of slides('poly-ap-roots-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const mid = Number(slide.answer[2]);
      const d = Number(slide.answer[5]);
      for (const r of [mid - d, mid, mid + d]) expect(at(slide.expression, r), `seed ${seed} d${difficulty}: x = ${r}`).toBeCloseTo(0, 9);
    }
  });

  it('sums of squares and of reciprocals agree with the roots themselves', () => {
    const squares = (roots: number[]) => roots.reduce((a, r) => a + r * r, 0);
    const reciprocals = (roots: number[]) => roots.reduce((a, r) => a + 1 / r, 0);
    for (const { slide, seed, difficulty } of slides('poly-sum-squares')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(Number(slide.answer), `seed ${seed} d${difficulty}`).toBe(squares(rootsOfPrompt(slide)));
    }
    for (const { slide, seed, difficulty } of slides('poly-reciprocal-sum')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(math.evaluate(slide.answer) as number, `seed ${seed} d${difficulty}`).toBeCloseTo(reciprocals(rootsOfPrompt(slide)), 9);
    }
    for (const { slide, seed, difficulty } of slides('poly-square-identity-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      expect(Number(slide.answer[2]), `seed ${seed} d${difficulty}`).toBe(squares(rootsOfPrompt(slide)));
    }
    for (const { slide, seed, difficulty } of slides('poly-recip-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(readNumber(last), `seed ${seed} d${difficulty}`).toBeCloseTo(reciprocals(rootsOfPrompt(slide)), 9);
    }
    for (const { slide, seed, difficulty } of slides('poly-symmetric-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const roots = wholeRoots(slide.expression.replace(/ = 0$/, ''));
      const where = `seed ${seed} d${difficulty}`;
      expect(readNumber(slide.answer[4]), where).toBeCloseTo(reciprocals(roots), 9);
      expect(Number(slide.answer[5]), where).toBe(squares(roots));
    }
  });
});

/** An expanded polynomial as the learner reads it, as coefficients from the top power down. */
function coefficientsOf(tex: string): number[] {
  const bare = flat(tex).replace(/^[pf]\(x\)\s*=\s*/, '').replace(/\s*=\s*0$/, '').replace(/\s/g, '');
  const found = new Map<number, number>();
  for (const term of bare.split(/(?=[+-])/)) {
    const match = /^([+-]?)(\d*)(x(?:\^\{(\d+)\})?)?$/.exec(term);
    if (!match) throw new Error(`cannot read the term ${term} in ${tex}`);
    const [, sign, digits, x, power] = match;
    const size = digits === '' ? 1 : Number(digits);
    const degree = x ? Number(power ?? 1) : 0;
    found.set(degree, (found.get(degree) ?? 0) + (sign === '-' ? -size : size));
  }
  const top = Math.max(...found.keys());
  return Array.from({ length: top + 1 }, (_, i) => found.get(top - i) ?? 0);
}

/** Written out again for mathjs: the coefficients, highest power first. */
const polyOf = (c: number[]): string => c.map((k, i) => `(${k})*x^${c.length - 1 - i}`).join(' + ');

/** Divide by (x - a) as many times as it goes: how many times that is. */
function timesDivides(c: number[], a: number): number {
  let n = 0;
  let rest = c;
  for (;;) {
    const out: number[] = [];
    for (const k of rest) out.push(k + (out.length ? a * out[out.length - 1] : 0));
    if (out.pop() !== 0 || out.length === 0) return n;
    n += 1;
    rest = out;
  }
}

/** Long division by any divisor, done here from scratch: the remainder, highest power first. */
function remainderOf(p: number[], d: number[]): number[] {
  const rest = [...p];
  for (let i = 0; i + d.length <= rest.length; i += 1) {
    const q = rest[i] / d[0];
    d.forEach((k, j) => (rest[i + j] -= q * k));
  }
  return rest.slice(-(d.length - 1));
}

/** dividend = divisor × quotient + remainder at every point, all four read off the slide. */
function expectQuadDivision(dividend: string, divisor: string, quotient: string, remainder: string, where: string) {
  for (const x of POINTS) {
    expect(at(dividend, x), `${where} at x = ${x}`).toBeCloseTo(at(divisor, x) * at(quotient, x) + at(remainder, x), 9);
  }
}

/** A label that is one inline formula, without its dollars; any other label as it is. */
const unwrap = (label: string): string => (/^\$[^$]+\$$/.test(label) ? label.slice(1, -1) : label);
const divisorIn = (text: string): string => /by \$\((x\^\{2\}[^$]*)\)\$/.exec(text)![1];

describe('quartics and repeated factors, checked from what the learner sees', () => {
  it('dividing by a quadratic: quotient and remainder rebuild the dividend', () => {
    for (const { slide, seed, difficulty } of slides('poly-long-quad-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const where = `long seed ${seed} d${difficulty}`;
      const divisor = divisorIn(prose(slide));
      const dividend = slide.start.join(' ');
      const n = coefficientsOf(dividend).length - 1;
      const lead = coefficientsOf(divisor)[0];
      // Each step leaves a new first term; its coefficient over the divisor's
      // leading one is the next quotient coefficient. The last step is the remainder.
      const values = slide.reductions.map((step) => step.value);
      const quotient = [coefficientsOf(dividend)[0] / lead, ...values.slice(0, -1).map((v, i) => {
        const c = coefficientsOf(v);
        return c.length - 1 === n - 1 - i ? c[0] / lead : 0;
      })];
      expect(quotient.length, where).toBe(n - 1);
      expectQuadDivision(dividend, divisor, polyOf(quotient), values[values.length - 1], where);
    }
    for (const { slide, seed, difficulty } of slides('poly-quad-quotient-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [a, b, c, r, s] = slide.answer;
      expectQuadDivision(slide.expression, divisorIn(prose(slide)), `(${a})*x^2 + (${b})*x + (${c})`, `(${r})*x + (${s})`, `tree seed ${seed} d${difficulty}`);
    }
    for (const { slide, seed, difficulty } of slides('poly-quad-quotient-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = filledTemplate(slide);
      for (const x of POINTS) expect(at(filled, x), `tiles seed ${seed} d${difficulty} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      // The remainder is what follows the quotient's bracket, and it must be below x^2.
      expect(filled.split(')').pop()!, `tiles seed ${seed} d${difficulty}`).not.toMatch(/x\^/);
    }
    for (const { slide, seed, difficulty } of slides('poly-quad-remainder')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [r, s] = remainderOf(coefficientsOf(display(slide)), coefficientsOf(divisorIn(prose(slide))));
      expect(Number(slide.answer), `remainder seed ${seed} d${difficulty}`).toBe(slide.lead === 'r =' ? r : s);
    }
  });

  it('two factors at once: the quadratic factor, the other factor and the full form all rebuild p(x)', () => {
    for (const { slide, seed, difficulty } of slides('poly-pair-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `flow seed ${seed} d${difficulty}`;
      const p = slide.subject;
      const [a, b] = [.../\$p\((-?\d+)\) = 0\$ and \$p\((-?\d+)\) = 0\$/.exec(slide.steps[0].ask)!].slice(1).map(Number);
      const [k, g, verdict, form] = slide.answer.map(unwrap);
      for (const r of [a, b]) {
        expect(at(p, r), `${where}: p(${r})`).toBeCloseTo(0, 9);
        expect(at(k, r), `${where}: factor at ${r}`).toBeCloseTo(0, 9);
      }
      expectQuadDivision(p, k, g, '0', where);
      expect(verdict, where).toBe(wholeRoots(g).length > 0 ? 'Yes' : 'No');
      if (form) for (const x of POINTS) expect(at(form, x), `${where} at x = ${x}`).toBeCloseTo(at(p, x), 9);
    }
    for (const { slide, seed, difficulty } of slides('poly-two-roots-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const where = `tree seed ${seed} d${difficulty}`;
      const text = prose(slide);
      const roots = [.../\$x = (-?\d+)\$ and \$x = (-?\d+)\$/.exec(text)!].slice(1).map(Number);
      const lead = /\((-?\d*)x\^\{2\} \+ ex/.exec(text)![1];
      const [m, n, e, f] = slide.answer;
      const k = `x^2 + (${m})*x + (${n})`;
      for (const r of roots) expect(at(k, r), `${where}: x = ${r}`).toBeCloseTo(0, 9);
      const other = `(${lead === '-' ? -1 : Number(lead || 1)})*x^2 + (${e})*x + (${f})`;
      expectQuadDivision(slide.expression, k, other, '0', where);
    }
    for (const { slide, seed, difficulty } of slides('poly-other-factor-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const where = `tiles seed ${seed} d${difficulty}`;
      const filled = filledTemplate(slide);
      for (const x of POINTS) expect(at(filled, x), `${where} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      const given = /\$p\((-?\d+)\) = 0\$ and \$p\((-?\d+)\) = 0\$/.exec(prose(slide));
      if (given) {
        const first = /^\(([^)]*)\)/.exec(filled)![1];
        for (const r of [given[1], given[2]].map(Number)) expect(at(first, r), `${where}: x = ${r}`).toBeCloseTo(0, 9);
      }
    }
    for (const { slide, seed, difficulty } of slides('poly-pair-unknown')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const where = `unknown seed ${seed} d${difficulty}`;
      const roots = [.../\$\((x [+-] \d+)\)\$ and \$\((x [+-] \d+)\)\$/.exec(prose(slide))!].slice(1).map((t) => rootIn(`(${t})`));
      const f = lettered(display(slide).replace(/^f\(x\)\s*=\s*/, ''));
      const letters = ['k', 'p', 'q'].filter((l) => new RegExp(`${l}\\*x`).test(f));
      const value = (x: number, scope: Record<string, number>) => math.evaluate(f, { k: 0, p: 0, q: 0, ...scope, x }) as number;
      // Every unknown enters linearly, so each root gives one linear equation.
      const rows = roots.map((x) => [...letters.map((l) => value(x, { [l]: 1 }) - value(x, {})), -value(x, {})]);
      let solved: Record<string, number>;
      if (letters.length === 1) {
        solved = { [letters[0]]: rows[0][1] / rows[0][0] };
      } else {
        const [[a1, b1, c1], [a2, b2, c2]] = rows;
        const det = a1 * b2 - a2 * b1;
        solved = { [letters[0]]: (c1 * b2 - c2 * b1) / det, [letters[1]]: (a1 * c2 - a2 * c1) / det };
      }
      for (const r of roots) expect(value(r, solved), `${where}: x = ${r}`).toBeCloseTo(0, 9);
      const asked = /^([kpq]) =$/.exec(slide.lead ?? '')![1];
      expect(Number(slide.answer), where).toBeCloseTo(solved[asked], 9);
    }
  });

  it('repeated factors: the divisions, the values and the count agree with p(x)', () => {
    for (const { slide, seed, difficulty } of slides('poly-twice-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const where = `twice seed ${seed} d${difficulty}`;
      const a = rootIn(prose(slide));
      const [c2, c1, c0, e1, r1, r2] = slide.answer.map(Number);
      const row = /\\begin\{array\}\{r\|r+\} (-?\d+) & (.+) \\end\{array\}/.exec(display(slide))!;
      expect(Number(row[1]), where).toBe(a);
      expect(row[2].split(' & ').map(Number), where).toEqual(coefficientsOf(slide.expression));
      const quotient = `(${c2})*x^2 + (${c1})*x + (${c0})`;
      expectDivision(slide.expression, a, quotient, r1, where);
      expectDivision(quotient, a, `(${c2})*x + (${e1})`, r2, `${where}, second division`);
    }
    for (const { slide, seed, difficulty } of slides('poly-repeat-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `flow seed ${seed} d${difficulty}`;
      const a = rootIn(prose(slide));
      const [value, verdict, again, times] = slide.answer.map(unwrap);
      expect(Number(value), where).toBe(at(slide.subject, a));
      expect(verdict, where).toBe(Number(value) === 0 ? 'Yes' : 'No');
      if (verdict === 'Yes') {
        const q = /leaves \$q\(x\) = ([^$]+)\$/.exec(slide.steps.find((s) => s.id === 'again')!.ask)![1];
        expectDivision(slide.subject, a, q, 0, where);
        expect(Number(again), where).toBe(at(q, a));
        expect(times, where).toBe(timesDivides(coefficientsOf(slide.subject), a) > 1 ? 'At least twice' : 'Once only');
      }
    }
    for (const { slide, seed, difficulty } of slides('poly-multiplicity')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const a = rootIn(prose(slide));
      expect(Number(slide.answer), `multiplicity seed ${seed} d${difficulty}`).toBe(timesDivides(coefficientsOf(display(slide)), a));
    }
    for (const { slide, seed, difficulty } of slides('poly-repeat-factor-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const where = `steps seed ${seed} d${difficulty}`;
      const a = rootIn(prose(slide));
      const last = slide.reductions[slide.reductions.length - 1].value;
      for (const x of POINTS) expect(at(last, x), `${where} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      expect(timesDivides(coefficientsOf(display(slide)), a), where).toBe(2);
    }
  });

  it('quartics in x²: the factors, the values of u and x, and the count agree with p(x)', () => {
    for (const { slide, seed, difficulty } of slides('poly-biquad-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const where = `tiles seed ${seed} d${difficulty}`;
      const filled = filledTemplate(slide);
      for (const x of POINTS) expect(at(filled, x), `${where} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
      if (difficulty > 1) {
        // "Fully": no quadratic left in the answer has a whole-number root.
        for (const bracket of slide.answer.filter((t) => t.includes('x^{2}'))) expect(wholeRoots(bracket), `${where}: ${bracket}`).toEqual([]);
      }
    }
    for (const { slide, seed, difficulty } of slides('poly-in-u-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const where = `tree seed ${seed} d${difficulty}`;
      const expr = toMath(slide.expression);
      const [u1, u2, ...xs] = slide.answer.map(Number);
      expect(u1, where).toBeLessThanOrEqual(u2);
      for (const u of [u1, u2]) expect(math.abs(math.evaluate(expr, { x: math.sqrt(u) })) as number, `${where}: u = ${u}`).toBeLessThan(1e-9);
      expect([...new Set(xs)].sort((x, y) => x - y), where).toEqual(wholeRoots(expr));
    }
    for (const { slide, seed, difficulty } of slides('poly-biquad-count')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [one, , b, , c] = coefficientsOf(display(slide));
      expect(one, `count seed ${seed} d${difficulty}`).toBe(1);
      const disc = b * b - 4 * c;
      const us = disc < 0 ? [] : [...new Set([(-b - Math.sqrt(disc)) / 2, (-b + Math.sqrt(disc)) / 2])];
      const count = us.reduce((n, u) => n + (u > 0 ? 2 : u === 0 ? 1 : 0), 0);
      expect(Number(correctLabel(slide)), `count seed ${seed} d${difficulty}`).toBe(count);
    }
    for (const { slide, seed, difficulty } of slides('poly-biquad-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `flow seed ${seed} d${difficulty}`;
      const p = slide.subject;
      const [inU, which, full] = slide.answer.map(unwrap);
      const backInX = inU.replace(/u/g, '(x^2)');
      for (const x of POINTS) expect(at(backInX, x), `${where} at x = ${x}`).toBeCloseTo(at(p, x), 9);
      const brackets = [...inU.matchAll(/\(u ([+-] \d+)\)/g)].map((m) => `x^{2} ${m[1]}`);
      const splits = brackets.filter((t) => wholeRoots(t).length > 0);
      const expected = splits.length === 2 ? 'Both' : splits.length === 1 ? `Only $(${splits[0]})$` : 'Neither';
      expect(which, where).toBe(expected);
      if (full) {
        for (const x of POINTS) expect(at(full, x), `${where} full at x = ${x}`).toBeCloseTo(at(p, x), 9);
        for (const [, bracket] of full.matchAll(/\((x\^\{2\}[^)]*)\)/g)) expect(wholeRoots(bracket), `${where}: ${bracket}`).toEqual([]);
      } else {
        expect(splits, where).toEqual([]);
      }
    }
  });

  it('solving a quartic: the roots found by trial and division are every root of p(x)', () => {
    for (const { slide, seed, difficulty } of slides('poly-quartic-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `flow seed ${seed} d${difficulty}`;
      const p = slide.subject;
      const [first, cubic, second, all] = slide.answer.map(unwrap);
      const r0 = Number(first.replace('x = ', ''));
      const r1 = Number(second.replace('x = ', ''));
      expect(at(p, r0), where).toBeCloseTo(0, 9);
      expectDivision(p, r0, cubic, 0, where);
      expect(at(cubic, r1), where).toBeCloseTo(0, 9);
      const listed = all.replace('x = ', '').split(',\\ ').map(Number);
      expect(listed, where).toEqual(wholeRoots(p));
      expect(timesDivides(coefficientsOf(p), 0) + listed.reduce((n, r) => n + timesDivides(coefficientsOf(p), r), 0), where).toBe(4);
    }
    for (const { slide, seed, difficulty } of slides('poly-quartic-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const where = `steps seed ${seed} d${difficulty}`;
      const a = rootIn(prose(slide));
      const dividend = slide.start.join(' ');
      const values = slide.reductions.map((step) => step.value);
      const quotient = [coefficientsOf(dividend)[0], ...values.slice(0, -1).map((v, i) => {
        const c = coefficientsOf(v);
        return c.length - 1 === 3 - i ? c[0] : 0;
      })];
      expectDivision(dividend, a, polyOf(quotient), Number(values[values.length - 1]), where);
      expect(values[values.length - 1], where).toBe('0');
    }
    for (const { slide, seed, difficulty } of slides('poly-quartic-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const filled = filledTemplate(slide);
      for (const x of POINTS) expect(at(filled, x), `tiles seed ${seed} d${difficulty} at x = ${x}`).toBeCloseTo(at(display(slide), x), 9);
    }
    for (const { slide, seed, difficulty } of slides('poly-quartic-root')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const roots = wholeRoots(display(slide));
      const largest = (slide.lead ?? '').includes('largest');
      expect(Number(slide.answer), `root seed ${seed} d${difficulty}`).toBe(largest ? roots[roots.length - 1] : roots[0]);
    }
  });
});
