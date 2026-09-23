/**
 * An independent check on Binomial Expansion level 5, estimates and surds.
 *
 * The oracle in `generators.test.ts` differentiates a `source`, and nothing
 * here declares one: an estimate is a number and a surd expansion is a form.
 * So these tests read each question back off the rendered slide — the bracket
 * in the prompt or template, the tiles placed, the value typed, the option
 * marked correct, the path through a flow — and check it against mathjs
 * evaluating the power itself. a and b in a + b√k are recovered from the
 * power and its conjugate, (v + w)/2 and (v - w)/(2√k), never from the row
 * the generator used, which would only prove it agrees with itself.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import { binomialGenerators } from './binomialExpansion';

const SEEDS = 200;

function generator(id: string): Generator<unknown> {
  const found = binomialGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found as Generator<unknown>;
}

function slides(id: string): Slide[] {
  const g = generator(id);
  return [1, 2].flatMap((difficulty) => Array.from({ length: SEEDS }, (_, seed) => g.render(g.sample(makeRng(seed), difficulty))));
}

const evaluate = (source: string): number => math.evaluate(source) as number;

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const isWhole = (value: number) => Math.abs(value - Math.round(value)) < 1e-9 * Math.max(1, Math.abs(value));

/** A tile or label such as `- 3`, `+ 3` or `-3` as a number. */
const number = (token: string): number => Number(token.replace(/\s/g, ''));

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** TeX as the learner reads it, turned into something mathjs evaluates. */
const texToMath = (tex: string): string =>
  tex
    .replace(/\\sqrt\{(\d+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt(\d)/g, 'sqrt($1)')
    .replace(/\^\{(\d+)\}/g, '^($1)')
    .replace(/\$/g, '');

interface Surd {
  p: number;
  q: number;
  k: number;
  n: number;
}

/** (p ± q√k)^n, from TeX with or without braces. */
function surdIn(text: string): Surd {
  const m = text.match(/\((\d+) ([+-]) (\d*)\\sqrt\{?(\d+)\}?\)\^\{?(\d+)\}?/);
  if (!m) throw new Error(`no surd bracket in ${text}`);
  const size = m[3] === '' ? 1 : Number(m[3]);
  return { p: Number(m[1]), q: m[2] === '-' ? -size : size, k: Number(m[4]), n: Number(m[5]) };
}

/** a and b in (p + q√k)^n = a + b√k, from the power and its conjugate. */
function partsOf({ p, q, k, n }: Surd): { a: number; b: number } {
  const v = evaluate(`(${p} + ${q} * sqrt(${k}))^${n}`);
  const w = evaluate(`(${p} - ${q} * sqrt(${k}))^${n}`);
  return { a: Math.round((v + w) / 2), b: Math.round((v - w) / (2 * Math.sqrt(k))) };
}

/** n and x in "the first three terms of (1 + x)^n, with x = ...". */
function estimateIn(text: string): { n: number; x: number } {
  const m = text.match(/\(1 \+ x\)\^\{(\d+)\}.*? with \$x = (-?[\d.]+)\$/);
  if (!m) throw new Error(`no estimate in ${text}`);
  return { n: Number(m[1]), x: Number(m[2]) };
}

/** The three-term estimate and the power itself, both from mathjs. */
function estimateOf({ n, x }: { n: number; x: number }): { estimate: number; exact: number; dropped: number } {
  const scope = { n, x };
  return {
    estimate: math.evaluate('1 + n x + combinations(n, 2) x^2', scope) as number,
    exact: math.evaluate('(1 + x)^n', scope) as number,
    dropped: math.evaluate('combinations(n, 3) x^3', scope) as number,
  };
}

/** a, n and the sign in "(a ± x)^{n}", and the number being estimated. */
function nearIn(text: string): { a: number; n: number; s: number; base: number } {
  const bracket = text.match(/\((\d) ([+-]) x\)\^\{?(\d)\}?/);
  const base = text.match(/\((\d+\.\d+)\)\^\{(\d)\}/);
  if (!bracket || !base) throw new Error(`no bracket or base in ${text}`);
  return { a: Number(bracket[1]), n: Number(bracket[3]), s: bracket[2] === '-' ? -1 : 1, base: Number(base[1]) };
}

/** The first three coefficients of (a + sx)^n, by differentiating with mathjs. */
function nearCoefficients({ a, n, s }: { a: number; n: number; s: number }): number[] {
  const f = math.parse(`(${a} + ${s} * x)^${n}`);
  const d1 = math.derivative(f, 'x');
  const d2 = math.derivative(d1, 'x');
  return [f.evaluate({ x: 0 }), d1.evaluate({ x: 0 }), d2.evaluate({ x: 0 }) / 2].map((v: number) => Math.round(v));
}

function correctLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

function lastValue(slide: Slide): string {
  if (slide.kind !== 'steps') throw new Error(`expected a steps slide, got ${slide.kind}`);
  return slide.reductions[slide.reductions.length - 1].value;
}

describe('how big the error is', () => {
  it('names the first term left out as mathjs does', () => {
    for (const slide of slides('bin-dropped-term')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      expect(close(Number(slide.answer), estimateOf(estimateIn(proseOf(slide))).dropped), proseOf(slide)).toBe(true);
    }
  });

  it('sums the kept terms to the estimate, which is out by about the term left out', () => {
    for (const slide of slides('bin-kept-sum-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const { estimate, exact, dropped } = estimateOf(estimateIn(proseOf(slide)));
      const [, , droppedShown, estimateShown] = slide.answer.map(Number);
      expect(close(estimateShown, estimate)).toBe(true);
      expect(close(droppedShown, dropped)).toBe(true);
      // Same sign as the term left out, and nowhere near twice its size.
      expect(Math.abs(exact - estimate - dropped)).toBeLessThan(Math.abs(dropped));
    }
  });

  it('offers as correct the places the true error leaves accurate', () => {
    for (const slide of slides('bin-safe-places')) {
      const { estimate, exact } = estimateOf(estimateIn(proseOf(slide)));
      const error = Math.abs(exact - estimate);
      const k = Number(correctLabel(slide));
      expect(error, proseOf(slide)).toBeLessThan(0.5 * 10 ** -k);
      expect(error, proseOf(slide)).toBeGreaterThanOrEqual(0.5 * 10 ** -(k + 1));
    }
  });

  it('says three terms are enough exactly when the true error is under half a unit', () => {
    for (const slide of slides('bin-enough-terms-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const text = proseOf(slide);
      const m = text.match(/\(1 \+ x\)\^\{(\d+)\}\$, with \$x = (-?[\d.]+)\$, give this correct to \$(\d+)\$/);
      if (!m) throw new Error(`no question in ${text}`);
      const { estimate, exact, dropped } = estimateOf({ n: Number(m[1]), x: Number(m[2]) });
      const k = Number(m[3]);
      expect(close(Number(slide.answer[0].replace(/\$/g, '')), dropped)).toBe(true);
      expect(close(Number(slide.answer[1].replace(/\$/g, '')), 0.5 * 10 ** -k)).toBe(true);
      expect(slide.answer[2]).toBe(Math.abs(exact - estimate) < 0.5 * 10 ** -k ? 'Yes' : 'No');
    }
  });
});

describe('a number in front', () => {
  it('picks the bracket and x that make the number', () => {
    for (const slide of slides('bin-near-setup')) {
      const text = proseOf(slide);
      const base = Number(text.match(/\((\d+\.\d+)\)\^/)![1]);
      const label = correctLabel(slide);
      const { a, s } = nearIn(`${label} (${base})^{2}`);
      const x = Number(label.match(/x = ([\d.]+)/)![1]);
      expect(close(a + s * x, base), label).toBe(true);
      expect(x).toBeLessThan(0.1);
    }
  });

  it('places the first three coefficients mathjs finds', () => {
    for (const slide of slides('bin-near-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const shape = nearIn(`${slide.template} ${proseOf(slide)}`);
      expect(slide.answer.map(number)).toEqual(nearCoefficients(shape));
    }
  });

  it('estimates from those coefficients, close to the power itself', () => {
    const estimates = [
      ...slides('bin-near-estimate').map((slide) => [slide, slide.kind === 'expression' ? slide.answer : ''] as const),
      ...slides('bin-near-substitute-steps').map((slide) => [slide, lastValue(slide)] as const),
    ];
    for (const [slide, answer] of estimates) {
      const shape = nearIn(proseOf(slide));
      const x = Math.abs(shape.base - shape.a);
      const [c0, c1, c2] = nearCoefficients(shape);
      const estimate = c0 + c1 * x + c2 * x * x;
      expect(close(Number(answer), estimate), proseOf(slide)).toBe(true);
      expect(Math.abs(evaluate(`${shape.base}^${shape.n}`) - estimate)).toBeLessThan(0.01 * shape.a ** shape.n);
    }
  });
});

describe('surd expansions', () => {
  it('places a and b as the power and its conjugate give them', () => {
    for (const id of ['bin-surd-tiles', 'bin-mixed-tiles']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
        const { a, b } = partsOf(surdIn(slide.template));
        expect(slide.answer.map(number), slide.template).toEqual([a, b]);
      }
    }
  });

  it('asks for a or b and expects the right one', () => {
    for (const id of ['bin-surd-part', 'bin-mixed-part']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        const text = proseOf(slide);
        const { a, b } = partsOf(surdIn(text));
        expect(Number(slide.answer), text).toBe(text.endsWith('Find $a$.') ? a : b);
      }
    }
  });

  it('gathers the terms into a and b', () => {
    for (const id of ['bin-surd-powers-tree', 'bin-mixed-terms-tree']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected a tree slide');
        const surd = surdIn(slide.expression);
        const { a, b } = partsOf(surd);
        const values = slide.answer.map(Number);
        expect(values.slice(-2), slide.expression).toEqual([a, b]);
        // A bracket starting with 1 leaves that 1 out of the top row, and a takes it.
        const byId = new Map(slide.nodes.map((node, i) => [node.id, values[i]]));
        for (const node of slide.nodes.slice(-2)) {
          const start = node.id === 'a' && surd.p === 1 ? 1 : 0;
          expect(node.from.reduce((sum, id) => sum + byId.get(id)!, start)).toBe(byId.get(node.id));
        }
        expect(slide.nodes.length - 2).toBeLessThanOrEqual(4);
      }
    }
  });

  it('works a line of working out to a or b', () => {
    for (const slide of slides('bin-surd-gather-steps')) {
      const text = proseOf(slide);
      const { a, b } = partsOf(surdIn(text));
      expect(Number(lastValue(slide)), text).toBe(text.includes('$a$ is the sum') ? a : b);
    }
  });
});

describe('conjugate pairs', () => {
  /** (1 + √k)^n ± (1 - √k)^n in some TeX, evaluated. */
  const pairIn = (text: string) => {
    const m = text.match(/\(1 \+ \\sqrt\{(\d+)\}\)\^\{(\d+)\} ([+-]) \(1 - \\sqrt\{\d+\}\)\^\{\d+\}/);
    if (!m) throw new Error(`no pair in ${text}`);
    return { k: Number(m[1]), value: evaluate(texToMath(m[0])), sum: m[3] === '+' };
  };

  it('gives the value of the sum, or the number on the root in the difference', () => {
    for (const slide of slides('bin-conjugate-value')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      const { k, value, sum } = pairIn(proseOf(slide));
      expect(close(Number(slide.answer), sum ? value : value / Math.sqrt(k)), proseOf(slide)).toBe(true);
    }
  });

  it('places the sum and the difference', () => {
    for (const slide of slides('bin-conjugate-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (!display || display.kind !== 'display') throw new Error('no display');
      const [first, second] = display.tex.split(', \\quad ').map((tex) => evaluate(texToMath(tex)));
      expect(close(Number(slide.answer[0]), first + second)).toBe(true);
      expect(close(evaluate(texToMath(slide.answer[1]).replace(/^(\d+)/, '$1 * ')), first - second), slide.answer[1]).toBe(true);
    }
  });

  it('offers exactly one option of the kind asked for', () => {
    for (const slide of slides('bin-conjugate-which')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const text = proseOf(slide);
      const k = Number(slide.options[0].label.match(/\\sqrt\{(\d+)\}/)![1]);
      const fits = (label: string) => {
        const value = evaluate(texToMath(label));
        return text.includes('whole number?') ? isWhole(value) : isWhole(value / Math.sqrt(k)) && !isWhole(value);
      };
      const fitting = slide.options.filter((option) => fits(option.label)).map((option) => option.id);
      expect(fitting, slide.options.map((option) => option.label).join(' | ')).toEqual([slide.correctId]);
    }
  });

  it('ends the flow at whole exactly when the value is whole', () => {
    for (const slide of slides('bin-conjugate-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const { value } = pairIn(slide.subject);
      expect(slide.answer[2] === 'A whole number', slide.subject).toBe(isWhole(value));
    }
  });
});

describe('a bracket times its conjugate', () => {
  it('works the product out to what mathjs makes of it', () => {
    for (const slide of slides('bin-unit-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected a steps slide');
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (!display || display.kind !== 'display') throw new Error('no display');
      const value = evaluate(texToMath(display.tex).replace(/(\d)sqrt/g, '$1 * sqrt').replace(/\)\(/g, ') * ('));
      expect(Number(lastValue(slide)), display.tex).toBe(Math.round(value));
      expect(isWhole(value)).toBe(true);
    }
  });
});
