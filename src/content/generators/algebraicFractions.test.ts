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
import { parseSet, type Piece } from '../numberLine';
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

describe('inequalities with fractions, from what the learner is shown', () => {
  type Rel = '<' | '\\le' | '>' | '\\ge' | '=';
  const relation = /\s(\\le|\\ge|<|>|=)\s/;

  /** The shown inequality as its two sides and the sign between them. */
  function sides(tex: string): { left: string; rel: Rel; right: string } {
    const [left, rel, right] = tex.split(relation);
    return { left, rel: rel as Rel, right };
  }

  /** Whether the shown inequality holds at x; undefined at a pole, where it has no value. */
  function holds(tex: string, x: number): boolean | undefined {
    const { left, rel, right } = sides(tex);
    const gap = at(left, x) - at(right, x);
    if (!Number.isFinite(gap)) return undefined;
    const zero = Math.abs(gap) < 1e-9;
    if (rel === '<') return gap < 0 && !zero;
    if (rel === '\\le') return gap < 0 || zero;
    if (rel === '>') return gap > 0 && !zero;
    if (rel === '\\ge') return gap > 0 || zero;
    return zero;
  }

  /** Every bottom in the shown inequality. */
  function bottoms(tex: string): string[] {
    return [...tex.matchAll(/\\frac\{[^{}]*\}\{([^{}]*)\}/g)].map((m) => m[1]);
  }

  const inPieces = (pieces: Piece[], x: number) =>
    pieces.some((p) => (x > p.lo || (x === p.lo && p.loClosed)) && (x < p.hi || (x === p.hi && p.hiClosed)));

  /** A set as `setTex` writes it, read back: pieces joined by "or". */
  function readSetTex(tex: string): Piece[] {
    return tex.split(' \\text{ or } ').map((part) => {
      const closed = (rel: string) => rel === '\\le' || rel === '\\ge';
      let m = /^(-?\d+) (<|\\le) x (<|\\le) (-?\d+)$/.exec(part);
      if (m) return { lo: Number(m[1]), hi: Number(m[4]), loClosed: closed(m[2]), hiClosed: closed(m[3]) };
      m = /^x (<|\\le|>|\\ge) (-?\d+)$/.exec(part);
      if (!m) throw new Error(`unreadable piece ${part}`);
      const end = Number(m[2]);
      return m[1] === '<' || m[1] === '\\le'
        ? { lo: -Infinity, hi: end, loClosed: false, hiClosed: closed(m[1]) }
        : { lo: end, hi: Infinity, loClosed: closed(m[1]), hiClosed: false };
    });
  }

  /** Quarter steps across a window, so every region and every whole end is probed. */
  const probes = (min: number, max: number) => Array.from({ length: (max - min) * 4 + 1 }, (_, i) => min + i / 4);

  it('shades exactly the points that satisfy the inequality shown', () => {
    for (const id of ['frac-ineq-line', 'frac-ineq-square-line', 'frac-ineq-two-line', 'frac-ineq-table-line']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
        const pieces = parseSet(slide.answer)!;
        for (const x of probes(slide.min, slide.max)) {
          const truth = holds(display(slide), x) ?? false;
          expect(inPieces(pieces, x), `${id} seed ${seed} d${difficulty} at ${x}: ${slide.answer}`).toBe(truth);
        }
      }
    }
  });

  it('offers the real set as the right option, and only there', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-slip-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const shown = display(slide);
      for (const option of slide.options) {
        const pieces = readSetTex(option.label);
        const agrees = probes(-12, 12).every((x) => inPieces(pieces, x) === (holds(shown, x) ?? false));
        expect(agrees, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('solves each case to the part of it the inequality holds on', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-cases-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const caseTex = /\$(x [<>] -?\d+)\$/.exec(slide.steps[0].ask)![1];
      const casePiece = readSetTex(caseTex);
      const said = slide.answer[2];
      const claimed = said === 'None of it' ? [] : said.startsWith('All of') ? casePiece : readSetTex(said.slice(1, -1));
      for (const x of probes(-12, 12).filter((x) => inPieces(casePiece, x))) {
        expect(inPieces(claimed, x), `seed ${seed} d${difficulty} at ${x}: ${said}`).toBe(holds(slide.subject, x) ?? false);
      }
      const bottom = bottoms(slide.subject)[0];
      const at0 = at(bottom, casePiece[0].lo === -Infinity ? casePiece[0].hi - 0.5 : casePiece[0].lo + 0.5);
      expect(slide.answer[0], `seed ${seed} d${difficulty}`).toBe(at0 > 0 ? 'Positive' : 'Negative');
    }
  });

  it('finds the crossing, the pole and the tree values from the fraction shown', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-crossing')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { left, right } = sides(display(slide));
      expect(at(left, Number(slide.answer)), `seed ${seed} d${difficulty}`).toBeCloseTo(at(right, 0), 9);
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-test-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const t = Number(/x = (-?\d+)/.exec((slide.prompt[0] as { text: string }).text)![1]);
      const { left, right } = sides(slide.expression);
      const [top, bottom, kb, value] = slide.answer.map(Number);
      expect(bottom, `seed ${seed} d${difficulty}`).toBeLessThan(0);
      expect(bottom).toBeCloseTo(at(bottoms(slide.expression)[0], t), 9);
      expect(top / bottom).toBeCloseTo(value, 9);
      expect(value, `seed ${seed} d${difficulty}`).toBeCloseTo(at(left, t), 9);
      expect(kb).toBeCloseTo(at(right, t) * bottom, 9);
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-critical-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { left, right } = sides(slide.expression);
      const bottom = bottoms(slide.expression)[0];
      const [coef, num, pole, cross] = slide.answer.map(Number);
      expect(at(bottom, pole), `seed ${seed} d${difficulty}`).toBeCloseTo(0, 9);
      expect(at(left, cross), `seed ${seed} d${difficulty}`).toBeCloseTo(at(right, cross), 9);
      for (const x of POINTS) expect(coef * x + num).toBeCloseTo((at(left, x) - at(right, x)) * at(bottom, x), 8);
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-two-top-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { left, right } = sides(slide.expression);
      const [b1, b2] = bottoms(slide.expression);
      const [, , s, num, cross] = slide.answer.map(Number);
      expect(at(left, cross), `seed ${seed} d${difficulty}`).toBeCloseTo(at(right, cross), 9);
      for (const x of POINTS) expect(s * x + num).toBeCloseTo((at(left, x) - at(right, x)) * at(b1, x) * at(b2, x), 8);
    }
  });

  it('every line of working equals the difference it started from', () => {
    for (const id of ['frac-ineq-one-side-steps', 'frac-ineq-two-steps']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'steps') throw new Error('expected steps');
        const { left, right } = sides(display(slide));
        let line = slide.start;
        for (const x of POINTS) expect(at(line.join(' '), x), `${id} seed ${seed}`).toBeCloseTo(at(left, x) - at(right, x), 8);
        for (const reduction of slide.reductions) {
          line = [...line.slice(0, reduction.span[0]), reduction.value, ...line.slice(reduction.span[1])];
          expectSame(line.join(' '), slide.start.join(' '), `${id} seed ${seed} d${difficulty}`);
        }
      }
    }
  });

  it('multiplying by the square keeps the inequality, line by line', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-square-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const shown = /\$(\\frac[^$]*)\$/.exec((slide.prompt[0] as { text: string }).text)![1];
      const { left, right } = sides(shown);
      const bottom = bottoms(shown)[0];
      const squared = (x: number) => (at(left, x) - at(right, x)) * at(bottom, x) ** 2;
      let line = slide.start;
      const read = (tokens: string[]) => tokens.join(' ').replace(/\[/g, '(').replace(/\]/g, ')');
      for (const reduction of [undefined, ...slide.reductions]) {
        if (reduction) line = [...line.slice(0, reduction.span[0]), reduction.value, ...line.slice(reduction.span[1])];
        for (const x of POINTS) expect(at(read(line), x), `seed ${seed} d${difficulty}: ${read(line)}`).toBeCloseTo(squared(x), 7);
      }
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-square-tiles')) {
      const { left, right } = sides(display(slide));
      const bottom = bottoms(display(slide))[0];
      const quadratic = sides(filled(slide));
      expect(quadratic.rel, `seed ${seed} d${difficulty}`).toBe(sides(display(slide)).rel);
      for (const x of POINTS) {
        expect(at(quadratic.left, x), `seed ${seed} d${difficulty}`).toBeCloseTo((at(left, x) - at(right, x)) * at(bottom, x) ** 2, 7);
      }
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-new-top-tiles')) {
      const shown = display(slide);
      const bottom = bottoms(shown)[0];
      for (const x of POINTS) {
        expect(at(filled(slide), x) / at(bottom, x), `seed ${seed} d${difficulty}`).toBeCloseTo(at(shown, x), 8);
      }
    }
  });

  it('offers the difference as one fraction as the right option, and only there', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-two-top-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      for (const option of slide.options) {
        const same = POINTS.every((x) => Math.abs(at(option.label, x) - at(display(slide), x)) < 1e-8);
        expect(same, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('reads whole numbers, single values and the graph against the inequality shown', () => {
    for (const { slide, seed, difficulty } of slides('frac-ineq-least-whole')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const n = Number(slide.answer);
      const least = (slide.prompt[1] as { text: string }).text.includes('least');
      expect(holds(display(slide), n), `seed ${seed} d${difficulty}`).toBe(true);
      for (let gap = 1; gap <= 30; gap += 1) {
        expect(holds(display(slide), least ? n - gap : n + gap) ?? false, `seed ${seed} d${difficulty} beyond ${n}`).toBe(false);
      }
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-member-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const v = Number(/x = (-?\d+)/.exec(slide.steps[0].ask)![1]);
      const verdict = slide.answer[slide.answer.length - 1];
      expect(verdict, `seed ${seed} d${difficulty} at ${v}`).toBe(holds(slide.subject, v) ? 'Yes' : 'No');
    }
    for (const { slide, seed, difficulty } of slides('frac-ineq-graph-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const text = (slide.prompt[0] as { text: string }).text;
      const shown = /answer to \$([^$]*)\$/.exec(text)![1];
      const { left, right } = sides(shown);
      if (text.includes('to where it shoots off')) expect(at(bottoms(shown)[0], slide.answer), `seed ${seed} d${difficulty}`).toBeCloseTo(0, 9);
      else expect(at(left, slide.answer), `seed ${seed} d${difficulty}`).toBeCloseTo(at(right, slide.answer), 9);
    }
  });
});

describe('graphs of rational functions, from what the learner is shown', () => {
  /** A shown rule compiled once, so a sweep of whole points costs no re-parsing. */
  function compiled(tex: string): (x: number) => number {
    const code = math.compile(toMath(tex));
    return (x) => code.evaluate({ x }) as number;
  }

  /** The rule without its `y = `. */
  const ruleOf = (tex: string): string => tex.replace(/^y = /, '');

  /** The prompt's prose, joined. */
  const proseOf = (slide: Slide): string =>
    'prompt' in slide ? slide.prompt.map((b) => ('text' in b ? b.text : '')).join(' ') : '';

  /** The rule a slide's prose quotes as $y = ...$. */
  const quoted = (slide: Slide): string => /\$y = ([^$]*)\$/.exec(proseOf(slide))![1];

  const WHOLE = Array.from({ length: 31 }, (_, i) => i - 15);

  /**
   * Every feature, found from the rule alone: the poles by evaluating the
   * bottom, holes as the places the top is zero too (the factor cancels), the
   * level by evaluating far out, and the intercepts by evaluation.
   */
  function featuresOf(tex: string) {
    const rule = ruleOf(tex);
    const m = /^\\frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}$/.exec(rule);
    if (!m) throw new Error(`not one fraction: ${rule}`);
    const [top, bottom, f] = [compiled(m[1]), compiled(m[2]), compiled(rule)];
    const poles: number[] = [];
    const holes: number[] = [];
    const zeros: number[] = [];
    for (const x of WHOLE) {
      const [t, b] = [top(x), bottom(x)];
      if (Math.abs(b) < 1e-9) (Math.abs(t) < 1e-9 ? holes : poles).push(x);
      else if (Math.abs(t) < 1e-9) zeros.push(x);
    }
    const far = [1e7, -1e7].map(f);
    const level = far.every((v) => Math.abs(v) < 1e3) ? far[0] : null;
    if (level !== null) expect(Math.abs(level - Math.round(level)), `${rule} settles off a whole number`).toBeLessThan(1e-4);
    return {
      f,
      top,
      bottom,
      poles,
      holes,
      zeros,
      level: level === null ? null : Math.round(level) || 0,
      /** The curve's height beside x, which is the height of a hole. */
      near: (x: number) => (f(x + 1e-7) + f(x - 1e-7)) / 2,
    };
  }

  /** Whole numbers quoted as x = n in a label, or none for a word. */
  const valuesIn = (label: string): number[] => [...label.matchAll(/[xy] = (-?\d+)/g)].map((g) => Number(g[1])).sort((a, b) => a - b);

  it('names the vertical asymptotes and which way each arm goes', () => {
    for (const { slide, seed, difficulty } of slides('frac-va-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { poles } = featuresOf(display(slide));
      for (const option of slide.options) {
        const same = JSON.stringify(valuesIn(option.label)) === JSON.stringify(poles);
        expect(same, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
    for (const { slide, seed, difficulty } of slides('frac-va-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const { f, poles } = featuresOf(quoted(slide));
      const up = proseOf(slide).includes('shoots up just to its right');
      const fits = poles.filter((p) => f(p + 1e-6) > 0 === up && f(p - 1e-6) < 0 === up);
      expect(fits, `seed ${seed} d${difficulty}`).toEqual([slide.answer]);
    }
    for (const { slide, seed, difficulty } of slides('frac-va-side-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { f, poles } = featuresOf(slide.subject);
      const p = Number(/asymptote \$x = (-?\d+)\$/.exec(proseOf(slide))![1]);
      const right = proseOf(slide).includes('to the right');
      expect(poles, `seed ${seed} d${difficulty}`).toContain(p);
      const heads = f(right ? p + 1e-6 : p - 1e-6) > 0;
      expect(slide.answer[2].includes('+\\infty'), `seed ${seed} d${difficulty}`).toBe(heads);
    }
    for (const { slide, seed, difficulty } of slides('frac-va-arms-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { f, poles } = featuresOf(display(slide));
      const p = Number(/asymptote at \$x = (-?\d+)\$/.exec(proseOf(slide))![1]);
      expect(poles, `seed ${seed} d${difficulty}`).toContain(p);
      const ends = [f(p - 1e-6), f(p + 1e-6)].map((y) => (y > 0 ? '\\infty' : '-\\infty'));
      expect(slide.answer, `seed ${seed} d${difficulty}`).toEqual(ends);
    }
  });

  it('settles on the horizontal asymptote it quotes', () => {
    for (const { slide, seed, difficulty } of slides('frac-ha-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { level } = featuresOf(slide.subject);
      const said = slide.answer[1];
      expect(level === null ? said.includes('no level') : valuesIn(said)[0] === level, `seed ${seed} d${difficulty}: ${said}`).toBe(true);
    }
    for (const { slide, seed, difficulty } of slides('frac-ha-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      expect(featuresOf(quoted(slide)).level, `seed ${seed} d${difficulty}`).toBe(slide.answer);
    }
    for (const { slide, seed, difficulty } of slides('frac-ha-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(featuresOf(display(slide)).level, `seed ${seed} d${difficulty}`).toBe(Number(slide.answer));
    }
    for (const { slide, seed, difficulty } of slides('frac-ha-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const c = valuesIn(proseOf(slide))[0];
      for (const option of slide.options) {
        expect(featuresOf(option.label).level === c, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('puts every hole where a factor cancels, at the height the curve has beside it', () => {
    for (const { slide, seed, difficulty } of slides('frac-hole-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { holes, near } = featuresOf(slide.expression);
      const [h, top, bottom, y] = slide.answer.map(Number);
      expect(holes, `seed ${seed} d${difficulty}`).toEqual([h]);
      expect(top / bottom, `seed ${seed} d${difficulty}`).toBe(y);
      expect(near(h), `seed ${seed} d${difficulty}`).toBeCloseTo(y, 4);
    }
    for (const { slide, seed, difficulty } of slides('frac-hole-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { holes, poles } = featuresOf(slide.subject);
      const asked = slide.steps.map((step) => Number(/x = (-?\d+)/.exec(step.ask)![1]));
      expect([...asked].sort((a, b) => a - b), `seed ${seed} d${difficulty}`).toEqual([...holes, ...poles].sort((a, b) => a - b));
      asked.forEach((x, i) => expect(slide.answer[i].includes('hole'), `seed ${seed} d${difficulty} at ${x}`).toBe(holes.includes(x)));
    }
    for (const { slide, seed, difficulty } of slides('frac-hole-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      expect(featuresOf(quoted(slide)).holes, `seed ${seed} d${difficulty}`).toEqual([slide.answer]);
    }
    for (const { slide, seed, difficulty } of slides('frac-hole-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [simplified, h] = slide.answer;
      expect(featuresOf(display(slide)).holes, `seed ${seed} d${difficulty}`).toEqual([Number(h)]);
      expectSame(simplified, ruleOf(display(slide)), `seed ${seed} d${difficulty}`);
    }
  });

  it('crosses each axis where it says', () => {
    for (const { slide, seed, difficulty } of slides('frac-x-int-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { zeros } = featuresOf(display(slide));
      for (const option of slide.options) {
        const same = JSON.stringify(valuesIn(option.label)) === JSON.stringify(zeros);
        expect(same, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
    for (const { slide, seed, difficulty } of slides('frac-y-int-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { f, top, bottom } = featuresOf(slide.expression);
      expect(slide.answer.map(Number), `seed ${seed} d${difficulty}`).toEqual([top(0), bottom(0), f(0)]);
    }
    for (const { slide, seed, difficulty } of slides('frac-y-int-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      expect(featuresOf(quoted(slide)).f(0), `seed ${seed} d${difficulty}`).toBe(slide.answer);
    }
    for (const { slide, seed, difficulty } of slides('frac-intercepts-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { f, bottom, zeros } = featuresOf(slide.subject);
      const onAxis = Math.abs(bottom(0)) < 1e-9;
      expect(slide.answer[0].startsWith('Yes'), `seed ${seed} d${difficulty}`).toBe(onAxis);
      if (!onAxis) expect(valuesIn(slide.answer[1]), `seed ${seed} d${difficulty}`).toEqual([f(0)]);
      expect(slide.answer[slide.answer.length - 1], `seed ${seed} d${difficulty}`).toBe(['Never', 'Once', 'Twice'][zeros.length]);
    }
  });

  it('fills the feature table with the features of the curve shown', () => {
    for (const { slide, seed, difficulty } of slides('frac-features-table')) {
      if (slide.kind !== 'table') throw new Error('expected table');
      const { f, poles, holes, zeros, level, near } = featuresOf(display(slide));
      const expected: Record<string, number | null> = {
        'Asymptote } x': poles[0],
        'Asymptote } y': level,
        'Hole } x': holes[0],
        'Hole } y': holes.length ? Math.round(near(holes[0]) * 1e6) / 1e6 : null,
        'Meets } x\\text{-axis}': zeros[0],
        'Meets } y\\text{-axis}': f(0),
      };
      expect(poles.length + zeros.length, `seed ${seed} d${difficulty}`).toBe(2);
      slide.rows.forEach(([name], i) => {
        const key = Object.keys(expected).find((k) => (name as string).endsWith(k))!;
        expect(Number(slide.answer[i]), `seed ${seed} d${difficulty}: ${name}`).toBe(expected[key]);
      });
    }
  });

  /**
   * The sketch read the way the learner reads it: grid lines a unit apart, the
   * axes at zero, and the drawn curve's points turned back into coordinates.
   */
  function drawnCurve(svg: string): { x: number; y: number; dx: number }[] {
    const lines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*opacity="([\d.]+)"/g)].map((g) => ({
      x1: Number(g[1]),
      y1: Number(g[2]),
      x2: Number(g[3]),
      y2: Number(g[4]),
      opacity: g[5],
    }));
    const across = (o: string) => lines.filter((l) => l.y1 === l.y2 && l.opacity === o).map((l) => l.y1).sort((a, b) => a - b);
    const down = (o: string) => lines.filter((l) => l.x1 === l.x2 && l.opacity === o).map((l) => l.x1).sort((a, b) => a - b);
    // Grid lines sit at every whole number and the axis at zero, so together
    // they run a unit apart: the average gap is the unit, free of the rounding
    // in any one line.
    const unit = (v: number[]) => (Math.max(...v) - Math.min(...v)) / (v.length - 1);
    const [ux, uy] = [unit([...down('0.18'), ...down('0.55')]), unit([...across('0.18'), ...across('0.55')])];
    const [x0] = down('0.55');
    const [y0] = across('0.55');
    const top = Math.min(...across('0.18'));
    const bottom = Math.max(...across('0.18'));
    const d = /<path class="plot-accent"[^>]* d="([^"]*)"/.exec(svg)![1];
    return [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
      .map((g) => ({ px: Number(g[1]), py: Number(g[2]) }))
      .filter(({ py }) => py > top && py < bottom)
      // Each coordinate, the axis's included, is written to a tenth of a
      // pixel, so x is known only to within about that.
      .map(({ px, py }) => ({ x: (px - x0) / ux, y: (y0 - py) / uy, dx: 0.12 / ux }));
  }

  it('matches exactly one rule to the sketch drawn', () => {
    for (const { slide, seed, difficulty } of slides('frac-sketch-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const figure = slide.prompt.find((b) => b.kind === 'diagram') as { svg: string };
      const points = drawnCurve(figure.svg);
      expect(points.length, `seed ${seed} d${difficulty}`).toBeGreaterThan(40);
      for (const option of slide.options) {
        const f = compiled(ruleOf(option.label));
        // Beside a pole the curve is steep, so the rounding in x moves y a lot:
        // a point fits when the rule passes through its height somewhere in
        // the sliver of x it could have come from.
        const fits = ({ x, y, dx }: { x: number; y: number; dx: number }) =>
          Math.abs(f(x) - y) < 0.1 || (f(x - dx) - y) * (f(x + dx) - y) <= 0;
        const share = points.filter(fits).length / points.length;
        expect(share > 0.99, `seed ${seed} d${difficulty}: ${option.label} fits ${share}`).toBe(option.id === slide.correctId);
      }
    }
  });

  /**
   * Whether the curve ever takes the value `level`: where top - level * bottom,
   * a polynomial with no poles, is zero and the bottom is not. Sampled at
   * every whole number near the roots and far out either side, so a sign
   * change anywhere is caught.
   */
  function crosses(tex: string, level: number): boolean {
    const { top, bottom } = featuresOf(tex);
    const g = (x: number) => top(x) - level * bottom(x);
    const xs = [-1e6, -1e3, ...Array.from({ length: 201 }, (_, i) => i - 100), 1e3, 1e6];
    return xs.some((x, i) => {
      if (Math.abs(g(x)) < 1e-9) return Math.abs(bottom(x)) > 1e-9;
      return i > 0 && Math.abs(g(xs[i - 1])) > 1e-9 && g(x) * g(xs[i - 1]) < 0;
    });
  }

  it('crosses its horizontal asymptote where, and only when, it says', () => {
    for (const { slide, seed, difficulty } of slides('frac-cross-ha')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { f, level, poles } = featuresOf(display(slide));
      const x = Number(slide.answer);
      expect(level, `seed ${seed} d${difficulty}`).toBe(valuesIn(proseOf(slide))[0]);
      expect(poles, `seed ${seed} d${difficulty}`).not.toContain(x);
      expect(f(x), `seed ${seed} d${difficulty}`).toBeCloseTo(level!, 9);
    }
    for (const { slide, seed, difficulty } of slides('frac-sketch-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { poles, level } = featuresOf(slide.subject);
      const [vertical, flat, cross] = slide.answer;
      expect(valuesIn(vertical), `seed ${seed} d${difficulty}`).toEqual(poles);
      if (level === null) {
        expect(flat, `seed ${seed} d${difficulty}`).toBe('None');
        expect(cross).toBeUndefined();
      } else {
        expect(valuesIn(flat), `seed ${seed} d${difficulty}`).toEqual([level]);
        expect(cross.startsWith('Yes'), `seed ${seed} d${difficulty}: ${slide.subject}`).toBe(crosses(slide.subject, level));
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
