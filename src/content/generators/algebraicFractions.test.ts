/**
 * Independent checks on the algebraic and partial fraction generators.
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself. These read what the learner is shown — the fraction, and the split
 * or the solution the slide says is right — parse it with mathjs, and confirm
 * the two agree at a spread of points. A slip in building a fraction outward
 * from its answer, or in how one is written out, fails here even when every
 * generator is internally consistent.
 *
 * The typed questions are also played through `startSession` and `submit`, at
 * both difficulties, since every fraction has poles and a pole near a probe
 * point is exactly what would make a right answer grade as something else.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Lesson, Slide } from '../types';
import { algebraicFractionGenerators, divideByPair } from './algebraicFractions';
import { fromRoots, mulPoly, addPoly, valueAt } from './polynomials';

const SEEDS = 120;
/** Whole points, and a few off them, none a root of any bottom drawn here by accident of choice. */
const POINTS = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17, 7.3];

/** Learner-facing TeX as something mathjs evaluates. Handles only what these generators write. */
function toMath(tex: string): string {
  let out = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\,/g, ' ')
    .replace(/\\text\{[^}]*\}/g, '')
    .replace(/\\ln\|([^|]+)\|/g, 'log(abs($1))');
  // Innermost fractions first, so a fraction whose top holds a power still parses.
  const fraction = /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  return out
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/(\d)\s*x/g, '$1*x')
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*x/g, ')*x')
    .replace(/(\d)\s*log/g, '$1*log')
    .replace(/x\s*\(/g, 'x*(');
}

function at(tex: string, x: number): number {
  return math.evaluate(toMath(tex), { x }) as number;
}

function slides(id: string): { slide: Slide; params: unknown; seed: number; difficulty: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { slide: generator.render(params), params, seed, difficulty };
    }),
  );
}

function display(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  const block = slide.prompt.find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

/** A tiles slide's template with its answer placed. */
function filled(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
}

/** The number in front of a term tile: "+ 6x" is 6, "- x^{2}" is -1. */
function coefficient(token: string): number {
  const bareToken = token.replace(/\s+/g, '').replace(/x(\^\{\d\})?$/, '');
  if (bareToken === '' || bareToken === '+') return 1;
  if (bareToken === '-') return -1;
  return Number(bareToken);
}

function expectSame(left: string, right: string, where: string) {
  for (const x of POINTS) {
    expect(at(left, x), `${where} at x = ${x}: ${left} vs ${right}`).toBeCloseTo(at(right, x), 8);
  }
}

describe('a split, placed from what the learner is shown, adds back to the fraction', () => {
  it('two brackets', () => {
    for (const { slide, seed, difficulty } of slides('frac-split-tiles')) {
      expectSame(filled(slide), display(slide), `seed ${seed} d${difficulty}`);
    }
  });

  it('a quadratic factor and a linear one', () => {
    for (const id of ['frac-quad-split-tiles', 'frac-x-quad-tiles']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        expectSame(filled(slide), display(slide), `${id} seed ${seed} d${difficulty}`);
      }
    }
  });

  it('a whole number, a quadratic factor and a linear one', () => {
    for (const { slide, seed, difficulty } of slides('frac-quad-whole-tiles')) {
      expectSame(filled(slide), display(slide), `seed ${seed} d${difficulty}`);
    }
  });

  it('letters found by a tree, put into the form the prompt names', () => {
    // Which answer slot holds each letter, per tree.
    const slots: Record<string, Record<string, number>> = {
      'frac-quad-abc-tree': { C: 2, A: 3, B: 4 },
      'frac-x-quad-tree': { C: 1, A: 2, B: 3 },
    };
    for (const [id, slot] of Object.entries(slots)) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected tree');
        const prose = slide.prompt.map((b) => ('text' in b ? b.text : '')).join(' ');
        const letters = /\$([^$]*Ax \+ B[^$]*)\$/.exec(prose)![1];
        const split = letters.replace(/[ABC]/g, (l) => `(${slide.answer[slot[l]]})`);
        expectSame(split, slide.expression, `${id} seed ${seed} d${difficulty}`);
      }
    }
  });

  it('a whole part and two brackets', () => {
    for (const { slide, seed, difficulty } of slides('frac-improper-tiles')) {
      expectSame(filled(slide), display(slide), `seed ${seed} d${difficulty}`);
    }
  });

  it('numerators placed into the letters the prompt names', () => {
    for (const id of ['frac-three-tiles', 'frac-repeated-tiles']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected tiles');
        const prose = slide.prompt.map((b) => ('text' in b ? b.text : '')).join(' ');
        const letters = /\$([^$]*\\frac\{A\}[^$]*)\$/.exec(prose)![1];
        const values = Object.fromEntries(['A', 'B', 'C'].map((l, i) => [l, slide.answer[i]]));
        const split = letters.replace(/\\frac\{([ABC])\}/g, (_, l: string) => `\\frac{${values[l]}}`);
        expectSame(split, display(slide), `${id} seed ${seed} d${difficulty}`);
      }
    }
  });

  it('the integral differentiates back to the fraction', () => {
    for (const { slide, seed, difficulty } of slides('frac-integrate-tiles')) {
      const integral = filled(slide).replace(/\+\s*\\text\{const\}/, '');
      const integrand = display(slide).replace(/^\\int\s*/, '').replace(/\\,\s*dx$/, '');
      const h = 1e-5;
      for (const x of POINTS) {
        const slope = (at(integral, x + h) - at(integral, x - h)) / (2 * h);
        expect(slope, `seed ${seed} d${difficulty} at ${x}`).toBeCloseTo(at(integrand, x), 4);
      }
    }
  });

  it('the series agrees with the fraction near zero', () => {
    for (const { slide, seed, difficulty } of slides('frac-series-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [c0, c1, c2] = slide.answer.map(coefficient);
      const f = (x: number) => at(display(slide), x);
      // f(h) = c0 + c1 h + c2 h^2 + O(h^3): read the coefficients off finite differences.
      const h = 1e-3;
      expect(f(0), `seed ${seed} d${difficulty}`).toBeCloseTo(c0, 6);
      expect((f(h) - f(-h)) / (2 * h), `seed ${seed} d${difficulty}`).toBeCloseTo(c1, 3);
      expect((f(h) - 2 * f(0) + f(-h)) / (2 * h * h), `seed ${seed} d${difficulty}`).toBeCloseTo(c2, 1);
    }
  });
});

describe('simplifying, from what the learner is shown', () => {
  it('the cancelled fraction equals the original', () => {
    for (const { slide, seed, difficulty } of slides('frac-cancel')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [top, bottom] = slide.answer;
      expectSame(`\\frac{${top}}{${bottom}}`, display(slide), `seed ${seed} d${difficulty}`);
    }
  });

  it('a backwards bracket leaves the minus sign', () => {
    for (const { slide, seed, difficulty } of slides('frac-flip-sign')) {
      expectSame(filled(slide), display(slide), `seed ${seed} d${difficulty}`);
    }
  });

  it('a division reduces to what the steps say', () => {
    for (const { slide, seed, difficulty } of slides('frac-divide-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [a, , b] = slide.start;
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectSame(`(${a}) / (${b})`.replace(/\\div/g, '/'), last, `seed ${seed} d${difficulty}`);
    }
  });
});

describe('equations, from what the learner is shown', () => {
  it('the solution satisfies the equation and makes no bottom zero', () => {
    for (const { slide, seed, difficulty } of slides('frac-equation-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const x = Number(slide.reductions[2].value.replace('x = ', ''));
      const [left, , right] = slide.start;
      expect(Number.isFinite(at(left, x)) && Number.isFinite(at(right, x)), `seed ${seed}`).toBe(true);
      expect(at(left, x), `seed ${seed} d${difficulty}`).toBeCloseTo(at(right, x), 9);
    }
  });

  it('the rejected root makes a bottom zero, and every kept root solves the original', () => {
    for (const { slide, seed, difficulty } of slides('frac-reject-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const flat = slide.subject.replace(/\\begin\{aligned\}|\\end\{aligned\}|&|\\\\|\\quad/g, ' ');
      const [left, right] = flat.split(/\s=\s/);
      const roots = [slide.steps[0].ask, slide.steps[1].ask].map((ask) => Number(/x = (-?\d+)/.exec(ask)![1]));
      roots.forEach((x, i) => {
        const undefinedThere = !Number.isFinite(at(left, x)) || !Number.isFinite(at(right, x));
        expect(undefinedThere, `seed ${seed} d${difficulty}: x = ${x}`).toBe(slide.answer[i] === 'Yes');
        if (!undefinedThere) expect(at(left, x), `seed ${seed} d${difficulty}: x = ${x}`).toBeCloseTo(at(right, x), 9);
      });
    }
  });
});

describe('dividing by two brackets', () => {
  it('quotient times bottom plus remainder rebuilds the top', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 300; i += 1) {
      const [a, b] = [rng.int(-6, 6), rng.int(-6, 6)];
      const top = fromRoots([rng.int(-5, 5), rng.int(-5, 5), rng.int(-5, 5)], rng.int(1, 3));
      const { quotient, remainder } = divideByPair(top, a, b);
      expect(remainder.length).toBeLessThanOrEqual(2);
      const rebuilt = addPoly(mulPoly(quotient, fromRoots([-a, -b])), remainder);
      for (const x of [-3, -1, 0, 2, 5]) expect(valueAt(rebuilt, x)).toBe(valueAt(top, x));
    }
  });

  it('agrees with the whole part every improper question was built from', () => {
    for (const { slide, seed, difficulty } of slides('frac-improper-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      expectSame(slide.reductions[0].value, slide.start[0], `seed ${seed} d${difficulty}`);
      expectSame(slide.reductions[1].value, slide.start[0], `seed ${seed} d${difficulty}`);
    }
  });
});

describe('quadratic factors, from what the learner is shown', () => {
  it('every line of working equals the fraction it started from', () => {
    for (const id of ['frac-quad-improper-steps', 'frac-x-quad-cover-steps']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'steps') throw new Error('expected steps');
        for (const reduction of slide.reductions) {
          if (reduction.value.includes('Ax + B')) continue;
          expectSame(reduction.value, slide.start[0], `${id} seed ${seed} d${difficulty}`);
        }
      }
    }
  });

  it('a quadratic said to split does, and one said not to has no real roots', () => {
    for (const { slide, params, seed, difficulty } of slides('frac-quad-factorise-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const q = (params as { q: number[] }).q;
      const quadratic = (x: number) => valueAt(q, x);
      if (slide.answer[0] === 'Yes') {
        const factors = slide.answer[1].slice(1, -1);
        for (const x of POINTS) expect(at(factors, x), `seed ${seed} d${difficulty}`).toBeCloseTo(quadratic(x), 9);
      } else {
        expect(q[1] * q[1] - 4 * q[0] * q[2], `seed ${seed} d${difficulty}`).toBeLessThan(0);
      }
    }
  });
});

describe('typed questions grade their own answer correct through a session', () => {
  const typed = algebraicFractionGenerators.filter((g) => {
    const slide = (g as Generator<unknown>).render((g as Generator<unknown>).sample(makeRng(1), 1));
    return slide.kind === 'expression';
  });

  it.each(typed.map((g) => [g.id]))('%s', (id) => {
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < 60; seed += 1) {
        const lesson: Lesson = {
          id: `test-${id}-${difficulty}`,
          title: 'Typed',
          slides: [],
          skillCheck: [{ type: 'generated', generatorId: id, difficulty }],
        };
        const session = startSession(lesson, registry, seed);
        const slide = session.skillCheck[0].slide;
        if (slide.kind !== 'expression') throw new Error(`${id} rendered ${slide.kind}`);
        const verdict = reduce(session, { type: 'submit', answer: slide.answer }).feedback.kind;
        expect(verdict, `seed ${seed} d${difficulty}`).toBe('correct');
        const wrong = reduce(session, { type: 'submit', answer: String(Number(slide.answer) + 1) }).feedback.kind;
        expect(wrong, `seed ${seed} d${difficulty}`).toBe('incorrect');
      }
    }
  });
});
