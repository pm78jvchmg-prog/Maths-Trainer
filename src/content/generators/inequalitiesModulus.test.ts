/**
 * An independent check on the level 3 modulus generators, modulus on both
 * sides, the level 4 ones, the modulus of quadratics and cubics, and the
 * level 5 ones, regions of the plane bounded by a V or an upside-down V.
 *
 * The property tests in `generators.test.ts` prove each generator agrees with
 * itself, and the oracle there skips everything here. These read what the
 * learner is actually shown — the equation or inequality, and the roots,
 * factors or set the slide says are right — parse it with mathjs, and put the
 * claimed roots back into both sides with `abs`. A slip in building a question
 * outward from its roots, or in how an inside is written out, fails here even
 * when every generator is internally consistent.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import { modulusDips } from './inequalitiesModulus';
import type { Generator, Slide } from '../types';

const SEEDS = 120;
const POINTS = [-3, -2, -1, 0, 1, 2, 3, 5];

/** The learner-facing TeX of an expression as something mathjs evaluates. */
function toMath(tex: string): string {
  return tex
    .replace(/(\d)\\lvert/g, '$1*\\lvert')
    .replace(/\\lvert/g, 'abs(')
    .replace(/\\rvert/g, ')')
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    // "0x" would read as the start of a hexadecimal number.
    .replace(/(\d)x/g, '$1*x')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/x\(/g, 'x*(')
    .replace(/\)\(/g, ')*(');
}

const compiled = new Map<string, { evaluate(scope: { x: number; y: number }): unknown }>();

/** A TeX expression's value; `y` is there for the regions of level 5. */
function at(tex: string, x: number, y = 0): number {
  let expr = compiled.get(tex);
  if (!expr) {
    expr = math.compile(toMath(tex));
    compiled.set(tex, expr);
  }
  return expr.evaluate({ x, y }) as number;
}

type Rel = '=' | '<' | '<=' | '>' | '>=';

/** A displayed equation or inequality, split at its one relation. */
function relation(stackedTex: string): { left: string; rel: Rel; right: string } {
  // A line too wide for a phone is broken over two rows; read it as one.
  const tex = stackedTex
    .replace(/\\(begin|end)\{aligned\}|&|\\\\|\\quad/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const match = / (=|<|>|\\le|\\ge) /.exec(tex);
  if (!match) throw new Error(`no relation in ${tex}`);
  const rel = ({ '=': '=', '<': '<', '>': '>', '\\le': '<=', '\\ge': '>=' } as const)[match[1] as '=' | '<' | '>' | '\\le' | '\\ge'];
  return { left: tex.slice(0, match.index), rel, right: tex.slice(match.index + match[0].length) };
}

function holds(tex: string, x: number, y = 0): boolean {
  const { left, rel, right } = relation(tex);
  const l = at(left, x, y);
  const r = at(right, x, y);
  const eps = 1e-9;
  if (rel === '=') return Math.abs(l - r) < eps;
  if (rel === '<') return l < r - eps;
  if (rel === '<=') return l <= r + eps;
  if (rel === '>') return l > r + eps;
  return l >= r - eps;
}

function slides(id: string): { slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  if (!generator) throw new Error(`no generator ${id}`);
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} d${difficulty} seed ${seed}`,
    })),
  );
}

function prose(slide: Slide): string {
  return 'prompt' in slide ? slide.prompt.map((block) => ('text' in block ? block.text : '')).join(' ') : '';
}

function displays(slide: Slide): string[] {
  if (!('prompt' in slide)) return [];
  return slide.prompt.flatMap((block) => (block.kind === 'display' ? [block.tex] : []));
}

/** The first $...$ segment of the prose that holds a modulus. */
function proseEquation(slide: Slide): string {
  const found = prose(slide)
    .split(/\$([^$]+)\$/g)
    .filter((_, idx) => idx % 2 === 1)
    .find((tex) => tex.includes('\\lvert'));
  if (!found) throw new Error('no modulus in the prose');
  return found;
}

/** Every whole number that solves an equation, over a range wide enough for these. */
function wholeRoots(tex: string): number[] {
  const out: number[] = [];
  for (let x = -60; x <= 60; x += 1) if (holds(tex, x)) out.push(x);
  return out;
}

/** The root of a linear equation `left = right`, read by evaluating both sides. */
function linearRoot(left: string, right: string): number {
  const f = (x: number) => at(left, x) - at(right, x);
  const slope = f(1) - f(0);
  return -f(0) / slope;
}

/** `x = 3 \text{ or } x = -2` as numbers. */
function rootsIn(tex: string): number[] {
  return [...tex.matchAll(/x = (-?\d+)/g)].map((m) => Number(m[1]));
}

describe('modulus on both sides, checked from what the learner sees', () => {
  it('a named root of two moduli equal is a root, and the one asked for', () => {
    for (const id of ['mod-both-root', 'mod-square-root']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected expression');
        const [equation] = displays(slide);
        const roots = wholeRoots(equation);
        expect(roots, where).toHaveLength(2);
        const wanted = prose(slide).includes('**larger**') ? Math.max(...roots) : Math.min(...roots);
        expect(Number(slide.answer), where).toBe(wanted);
      }
    }
  });

  it('each case written from tiles gives a root of the original', () => {
    for (const { slide, where } of slides('mod-both-cases')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [equation] = displays(slide);
      const { left } = relation(equation);
      const inside = left.replace(/\\lvert|\\rvert/g, '');
      const found = slide.answer.map((tile) => linearRoot(inside, tile));
      for (const root of found) expect(holds(equation, root), `${where} at ${root}`).toBe(true);
      expect(new Set(found).size, where).toBe(2);
    }
  });

  it('the opposite case solved step by step lands on a root where the insides are opposite', () => {
    for (const { slide, where } of slides('mod-both-negative-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const equation = proseEquation(slide);
      const [root] = rootsIn(slide.reductions[slide.reductions.length - 1].value);
      expect(holds(equation, root), where).toBe(true);
      const { left, right } = relation(equation);
      const strip = (tex: string) => tex.replace(/\\lvert|\\rvert/g, '');
      expect(at(strip(left), root), where).toBeCloseTo(-at(strip(right), root), 9);
    }
  });

  it('the difference of two squares multiplies back to u^2 - v^2', () => {
    for (const id of ['mod-square-factor', 'mod-square-tree']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'tiles' && slide.kind !== 'tree') throw new Error('expected tiles or a tree');
        const squared = slide.kind === 'tiles' ? displays(slide)[0] : slide.expression;
        const { left } = relation(squared);
        const [first, second] = slide.answer;
        for (const x of POINTS) {
          expect(at(first, x) * at(second, x), `${where} at x = ${x}`).toBeCloseTo(at(left, x), 9);
        }
        if (slide.kind === 'tree') {
          const equation = proseEquation(slide);
          const roots = [rootsIn(slide.answer[2])[0], rootsIn(slide.answer[3])[0]];
          for (const root of roots) expect(holds(equation, root), `${where} root ${root}`).toBe(true);
          expect(at(first, roots[0]), where).toBeCloseTo(0, 9);
          expect(at(second, roots[1]), where).toBeCloseTo(0, 9);
        }
      }
    }
  });

  it('multiplying out keeps every line equivalent, and the roots solve the original', () => {
    for (const { slide, where } of slides('mod-expand-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const equation = proseEquation(slide);
      const { left, right } = relation(equation);
      const [expanded, collected, roots] = slide.reductions.map((step) => step.value);
      const e = relation(expanded);
      const c = relation(collected);
      for (const x of POINTS) {
        expect(at(e.left, x), `${where} left at ${x}`).toBeCloseTo(at(left, x) ** 2, 9);
        expect(at(e.right, x), `${where} right at ${x}`).toBeCloseTo(at(right, x) ** 2, 9);
        expect(Math.abs(at(c.left, x)), `${where} collected at ${x}`).toBeCloseTo(Math.abs(at(left, x) ** 2 - at(right, x) ** 2), 9);
      }
      expect(rootsIn(roots).sort((a, b) => a - b), where).toEqual(wholeRoots(equation));
    }
  });

  it('the crossings of two Vs are where the moduli agree', () => {
    for (const { slide, where } of slides('mod-cross-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const [left, right] = prose(slide)
        .split(/\$([^$]+)\$/g)
        .filter((_, idx) => idx % 2 === 1)
        .filter((tex) => tex.startsWith('y = '))
        .map((tex) => tex.slice(4));
      const roots = wholeRoots(`${left} = ${right}`);
      expect(roots, where).toHaveLength(2);
      const wanted = prose(slide).includes('**left-hand**') ? Math.min(...roots) : Math.max(...roots);
      expect(slide.answer, where).toBe(wanted);
      expect(Math.abs(slide.answer), where).toBeLessThanOrEqual(6);
    }
    for (const { slide, where } of slides('mod-cross-points')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [left, right] = prose(slide)
        .split(/\$([^$]+)\$/g)
        .filter((_, idx) => idx % 2 === 1)
        .filter((tex) => tex.startsWith('y = '))
        .map((tex) => tex.slice(4));
      const [x1, y1, x2, y2] = slide.answer.map(Number);
      expect(x1, where).toBeLessThan(x2);
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        expect(at(left, x), `${where} at ${x}`).toBeCloseTo(y, 9);
        expect(at(right, x), `${where} at ${x}`).toBeCloseTo(y, 9);
      }
      expect([x1, x2], where).toEqual(wholeRoots(`${left} = ${right}`));
    }
  });

  it('counts the solutions of two moduli equal', () => {
    // Counted by sign changes and touches of |u| - |v| on a fine grid, which
    // knows nothing about cases or steepness.
    const words = ['No solutions', 'Exactly one', 'Exactly two', 'Infinitely many'];
    for (const { slide, where } of slides('mod-cross-count')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const [equation] = displays(slide);
      const { left, right } = relation(equation);
      const f = (x: number) => at(left, x) - at(right, x);
      let count = 0;
      // Every root here is a multiple of an eighth, so the grid lands on it.
      const step = 1 / 8;
      for (let x = -30; x < 30; x += step) {
        const here = f(x);
        const next = f(x + step);
        if (Math.abs(here) < 1e-9) count += 1;
        else if (here * next < 0) count += 1;
      }
      const chosen = slide.options.find((option) => option.id === slide.correctId)?.label;
      expect(chosen, where).toBe(words[count]);
    }
  });

  it('shades exactly where the modulus inequality holds', () => {
    for (const { slide, where } of slides('mod-both-ineq-line')) {
      if (slide.kind !== 'numberLine') throw new Error('expected a number line');
      const [inequality] = displays(slide);
      const pieces = slide.answer.split('|').map((piece) => {
        const m = /^([[(])([^,]+),([^\])]+)([\])])$/.exec(piece);
        if (!m) throw new Error(`unreadable piece ${piece}`);
        const end = (s: string) => (s === 'inf' ? Infinity : s === '-inf' ? -Infinity : Number(s));
        return { lo: end(m[2]), hi: end(m[3]), loClosed: m[1] === '[', hiClosed: m[4] === ']' };
      });
      const inSet = (x: number) =>
        pieces.some(
          (p) => (x > p.lo || (x === p.lo && p.loClosed)) && (x < p.hi || (x === p.hi && p.hiClosed)),
        );
      for (let x = slide.min - 2; x <= slide.max + 2; x += 0.25) {
        expect(inSet(x), `${where} at x = ${x}`).toBe(holds(inequality, x));
      }
    }
  });

  it('places critical values that are roots, and the side the set is on', () => {
    for (const { slide, where } of slides('mod-ends-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [inequality] = displays(slide);
      const { left, right } = relation(inequality);
      const [lo, hi] = slide.answer.slice(0, 2).map(Number);
      expect(lo, where).toBeLessThan(hi);
      expect(wholeRoots(`${left} = ${right}`), where).toEqual([lo, hi]);
      const between = holds(inequality, (lo + hi) / 2);
      expect(slide.answer[2], where).toBe(between ? '\\text{between}' : '\\text{outside}');
      expect(holds(inequality, hi + 1), where).toBe(!between);
    }
  });

  it('tests a point with values that are really the insides there', () => {
    for (const { slide, where } of slides('mod-test-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const t = Number(/Test \$x = (-?\d+)\$/.exec(prose(slide))?.[1]);
      const { left, right } = relation(slide.expression);
      const [u, v, minus, plus, product] = slide.answer.map(Number);
      expect(Math.abs(u), where).toBe(at(left, t));
      expect(Math.abs(v), where).toBe(at(right, t));
      expect(minus, where).toBe(u - v);
      expect(plus, where).toBe(u + v);
      expect(product, where).toBe(at(left, t) ** 2 - at(right, t) ** 2);
    }
  });

  it('rejects the root squaring brought in, and keeps the one that stands', () => {
    for (const id of ['mod-false-root', 'mod-square-check-steps']) {
      for (const { slide, where } of slides(id)) {
        const equation = proseEquation(slide);
        const { left, right } = relation(equation);
        let good: number;
        let bad: number;
        if (slide.kind === 'expression') {
          bad = Number(slide.answer);
          const both = rootsIn(prose(slide).replace(/\$/g, ''));
          good = both.find((root) => root !== bad) as number;
          const [factors] = displays(slide);
          for (const root of [good, bad]) expect(at(relation(factors).left, root), `${where} factor at ${root}`).toBeCloseTo(0, 9);
        } else if (slide.kind === 'steps') {
          const values = slide.reductions.map((step) => step.value);
          [good] = rootsIn(values[2]);
          bad = rootsIn(values[1]).find((root) => root !== good) as number;
          for (const x of POINTS) {
            expect(at(relation(values[0]).left, x), `${where} factors at ${x}`).toBeCloseTo(at(left, x) ** 2 - at(right, x) ** 2, 9);
          }
        } else {
          throw new Error('expected an expression or steps');
        }
        expect(holds(equation, good), `${where} keeps ${good}`).toBe(true);
        expect(holds(equation, bad), `${where} rejects ${bad}`).toBe(false);
        expect(at(left, bad) ** 2, `${where} squared at ${bad}`).toBeCloseTo(at(right, bad) ** 2, 9);
        expect(at(right, bad), where).toBeLessThan(0);
      }
    }
  });

  it('never offers two tiles that look the same', () => {
    // TeX ignores spaces, so "- 8" and "-8" would draw as one tile while the
    // grader holds them apart.
    for (const id of ['mod-both-cases', 'mod-square-factor', 'mod-square-tree', 'mod-cross-points', 'mod-ends-tiles', 'mod-test-tree']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'tiles' && slide.kind !== 'tree') throw new Error('expected tiles or a tree');
        const looks = new Map<string, string>();
        for (const token of slide.bank) {
          const look = token.replace(/\s+/g, '');
          const seen = looks.get(look);
          expect(seen === undefined || seen === token, `${where}: ${seen} and ${token}`).toBe(true);
          looks.set(look, token);
        }
      }
    }
  });
});

/** Every $...$ segment of a slide's prose, in order. */
function inlineMaths(slide: Slide): string[] {
  return prose(slide)
    .split(/\$([^$]+)\$/g)
    .filter((_, idx) => idx % 2 === 1);
}

/** How many times `f` is zero, by sign changes and exact zeros on a grid of hundredths. */
function zeroCount(f: (x: number) => number): number {
  let count = 0;
  let previous = f(-2000 / 100);
  if (Math.abs(previous) < 1e-9) count += 1;
  for (let i = -1999; i <= 2000; i += 1) {
    const here = f(i / 100);
    if (Math.abs(here) < 1e-9) count += 1;
    else if (Math.abs(previous) >= 1e-9 && previous * here < 0) count += 1;
    previous = here;
  }
  return count;
}

/** The pieces of a canonical number-line answer, and a membership test. */
function readSet(answer: string): (x: number) => boolean {
  const pieces = answer.split('|').map((piece) => {
    const m = /^([[(])([^,]+),([^\])]+)([\])])$/.exec(piece);
    if (!m) throw new Error(`unreadable piece ${piece}`);
    const end = (s: string) => (s === 'inf' ? Infinity : s === '-inf' ? -Infinity : Number(s));
    return { lo: end(m[2]), hi: end(m[3]), loClosed: m[1] === '[', hiClosed: m[4] === ']' };
  });
  return (x) =>
    pieces.some((p) => (x > p.lo || (x === p.lo && p.loClosed)) && (x < p.hi || (x === p.hi && p.hiClosed)));
}

/** A tile template filled in with its answer, tiles' spaces closed up. */
function filled(template: string, answer: string[]): string {
  return answer.reduce((tex, token, idx) => tex.replace(`{${idx}}`, token.replace(/^([+-]) /, '$1')), template);
}

/** Where a flow's stated answer leads: the outcome text it reaches. */
function outcomeOf(slide: Slide): string {
  if (slide.kind !== 'flow') throw new Error('expected a flow');
  let step = slide.steps[0];
  for (const label of slide.answer) {
    const branch = step.branches.find((b) => b.label === label);
    if (!branch) throw new Error(`no branch ${label}`);
    if (branch.outcome) return branch.outcome;
    step = slide.steps.find((s) => s.id === branch.to)!;
  }
  throw new Error('the answer stops before an outcome');
}

/** The label of the option marked right. */
function chosen(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error('expected a choice');
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

/** The whole numbers from -8 to 8 where a function is zero. */
function integerZeros(f: (x: number) => number): number[] {
  return Array.from({ length: 17 }, (_, i) => i - 8).filter((x) => Math.abs(f(x)) < 1e-9);
}

const GRID = Array.from({ length: 121 }, (_, i) => -6 + i / 10);
const isEven = (f: (x: number) => number) => GRID.every((x) => Math.abs(f(x) - f(-x)) < 1e-9);
const neverNegative = (f: (x: number) => number) => GRID.every((x) => f(x) >= -1e-9);

describe('the modulus of quadratics and cubics, checked from what the learner sees', () => {
  it('holds only rows whose roots are all whole', () => {
    for (const { h, c, outer, inner } of modulusDips) {
      const row = `h ${h}, c ${c}`;
      expect(h, row).toBeGreaterThan(0);
      expect(c, row).toBeGreaterThan(0);
      expect(outer * outer, row).toBe(h + c);
      if (inner === null) expect(h, row).toBeLessThan(c);
      else expect(inner * inner, row).toBe(h - c);
    }
  });

  it('marks as right the one graph that is the modulus of the quadratic or cubic', () => {
    for (const id of ['mod-abs-quad-match', 'mod-cubic-match']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'choice') throw new Error('expected a choice');
        // Difficulty 2 of the cubic leaves the roots to the grid.
        if (!prose(slide).includes('axis at')) continue;
        const roots = [...prose(slide).matchAll(/\$x = ([^$]+)\$/g)].flatMap((m) => m[1].split(', ').map(Number));
        const fits = slide.options.filter(({ label }) => {
          const f = (x: number) => at(label.slice(4), x);
          return neverNegative(f) && !isEven(f) && JSON.stringify(integerZeros(f)) === JSON.stringify([...roots].sort((a, b) => a - b));
        });
        expect(fits.map((option) => option.id), where).toEqual([slide.correctId]);
      }
    }
  });

  it('marks as right the one graph that is f(|x|), even and through the stated roots', () => {
    for (const { slide, where } of slides('mod-fabs-match')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const stated = /at \$x = ([^$]+)\$/.exec(prose(slide));
      const roots = stated![1].split(', ').map(Number);
      const fits = slide.options.filter(({ label }) => {
        const f = (x: number) => at(label.slice(4), x);
        return isEven(f) && JSON.stringify(integerZeros(f)) === JSON.stringify(roots);
      });
      expect(fits.map((option) => option.id), where).toEqual([slide.correctId]);
    }
  });

  it('slides to the height of the vertex of |f(x)|', () => {
    for (const { slide, where } of slides('mod-abs-vertex-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const f = (x: number) => at(inlineMaths(slide)[0].slice(4), x);
      const a = (f(1) + f(-1) - 2 * f(0)) / 2;
      const b = (f(1) - f(-1)) / 2;
      expect(slide.answer, where).toBe(Math.abs(f(-b / (2 * a))));
    }
  });

  it('works out f and |f| at the named points', () => {
    for (const { slide, where } of slides('mod-abs-values-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const f = slide.expression.replace('f(x) = ', '');
      const [x1, x2] = [...prose(slide).matchAll(/\$x = (-?\d+)\$/g)].map((m) => Number(m[1]));
      const [u, v, au, av] = slide.answer.map(Number);
      expect([u, v, au, av], where).toEqual([at(f, x1), at(f, x2), Math.abs(at(f, x1)), Math.abs(at(f, x2))]);
      expect(u * v, `${where}: one point below the axis and one above`).toBeLessThan(0);
    }
  });

  it('says which part of the quadratic the modulus reflects', () => {
    for (const { slide, where } of slides('mod-abs-sketch-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const f = (x: number) => at(inlineMaths(slide).at(-1)!.replace('f(x) = ', ''), x);
      const wide = Array.from({ length: 401 }, (_, i) => -20 + i / 10);
      const negative = wide.filter((x) => f(x) < 0);
      let expected: string[];
      if (negative.length === 0) expected = ['No'];
      else if (negative.length === wide.length) expected = ['Yes', 'Everywhere'];
      else if (f(-20) < 0) expected = ['Yes', 'Outside its roots'];
      else expected = ['Yes', 'Between its roots'];
      expect(slide.answer, where).toEqual(expected);
    }
  });

  it('builds the left arm of f(|x|) that agrees with it wherever x < 0', () => {
    for (const { slide, where } of slides('mod-fabs-arm-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const whole = inlineMaths(slide)[0].slice(4);
      const arm = filled(slide.template, slide.answer).slice(4);
      for (const x of [-6, -4.5, -3, -2, -1.25, -0.5]) {
        expect(at(arm, x), `${where} at ${x}`).toBeCloseTo(at(whole, x), 9);
      }
      expect(at(arm, 2.5), `${where}: the arm is not the right-hand one too`).not.toBeCloseTo(at(whole, 2.5), 9);
    }
  });

  it('takes the modulus inside and outside at the same negative x', () => {
    for (const { slide, where } of slides('mod-inside-out-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const f = slide.expression.replace('f(x) = ', '');
      const t = Number(/at \$x = (-?\d+)\$/.exec(prose(slide))?.[1]);
      expect(t, where).toBeLessThan(0);
      expect(slide.answer.map(Number), where).toEqual([Math.abs(t), at(f, Math.abs(t)), at(f, t), Math.abs(at(f, t))]);
      expect(at(f, Math.abs(t)), where).not.toBe(Math.abs(at(f, t)));
    }
  });

  it('counts the roots of f(|x|) = 0', () => {
    const counts: Record<string, number> = { Two: 4, 'One,Yes': 3, 'One,No': 2, 'None,Yes': 1, 'None,No': 0 };
    for (const { slide, where } of slides('mod-fabs-count-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const f = slide.subject.replace('f(x) = ', '');
      expect(counts[slide.answer.join(',')], where).toBe(zeroCount((x) => at(f, Math.abs(x))));
    }
  });

  it('gives the root of |f(x)| = c that was asked for, and every root is whole', () => {
    for (const { slide, where } of slides('mod-quad-eq-root')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [equation] = displays(slide);
      const { left, right } = relation(equation);
      const roots = wholeRoots(equation);
      expect(zeroCount((x) => at(left, x) - at(right, x)), where).toBe(roots.length);
      const text = prose(slide);
      const wanted = text.includes('**smallest**') ? roots[0] : text.includes('**largest**') ? roots.at(-1) : roots.at(-2);
      expect(Number(slide.answer), where).toBe(wanted);
    }
  });

  it('splits |f(x)| = c into two cases whose roots are all the roots', () => {
    const read = (tile: string) =>
      tile === '\\text{no roots}' ? [] : tile.includes('\\pm') ? [-Number(tile.split('\\pm ')[1]), Number(tile.split('\\pm ')[1])] : tile.slice(4).split(', ').map(Number);
    for (const { slide, where } of slides('mod-two-cases-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const [plus, minus, plusRoots, minusRoots] = slide.answer;
      const c = Number(relation(slide.expression).right);
      const { left } = relation(slide.expression);
      const inside = left.replace(/\\lvert|\\rvert/g, '');
      for (const x of POINTS) {
        // Each case is f(x) = c or f(x) = -c with the same number added to both sides.
        expect(at(relation(plus).left, x) - Number(relation(plus).right), `${where} plus at ${x}`).toBeCloseTo(at(inside, x) - c, 9);
        expect(at(relation(minus).left, x) - Number(relation(minus).right), `${where} minus at ${x}`).toBeCloseTo(at(inside, x) + c, 9);
      }
      for (const root of read(plusRoots)) expect(holds(plus, root), `${where} ${root}`).toBe(true);
      for (const root of read(minusRoots)) expect(holds(minus, root), `${where} ${root}`).toBe(true);
      const all = [...new Set([...read(plusRoots), ...read(minusRoots)])].sort((a, b) => a - b);
      expect(all, where).toEqual(wholeRoots(slide.expression));
    }
  });

  it('slides to the crossing of |f(x)| and the line that was asked for', () => {
    for (const { slide, where } of slides('mod-crossing-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const [curve, line] = inlineMaths(slide).map((tex) => tex.slice(4));
      const roots = wholeRoots(`${curve} = ${line}`);
      const text = prose(slide);
      const c = Number(line);
      const f = curve.replace(/\\lvert|\\rvert/g, '');
      let wanted: number | undefined;
      if (text.includes('**left-most**')) wanted = roots[0];
      else if (text.includes('**right-most**')) wanted = roots.at(-1);
      else {
        // On the reflected hump: where f(x) = -c, left or right of the vertex.
        const hump = roots.filter((x) => at(f, x) < 0);
        expect(hump, where).toHaveLength(2);
        wanted = text.includes('**left** side') ? hump[0] : hump[1];
        expect(at(f, wanted), where).toBe(-c);
      }
      expect(slide.answer, where).toBe(wanted);
    }
  });

  it('counts the solutions of |f(x)| = c for quadratics and cubics', () => {
    const words: Record<number, string> = { 0: 'None', 2: 'Two', 3: 'Three', 4: 'Four' };
    for (const { slide, where } of slides('mod-quad-count')) {
      const { left, right } = relation(displays(slide)[0]);
      expect(chosen(slide), where).toBe(words[zeroCount((x) => at(left, x) - Number(right))]);
    }
    for (const { slide, where } of slides('mod-cubic-count')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { left, right } = relation(displays(slide)[0]);
      expect(Number(slide.answer), where).toBe(zeroCount((x) => at(left, x) - Number(right)));
    }
  });

  it('shades where the cubic is negative', () => {
    for (const { slide, where } of slides('mod-cubic-reflect-line')) {
      if (slide.kind !== 'numberLine') throw new Error('expected a number line');
      const f = displays(slide)[0].replace('f(x) = ', '');
      const inSet = readSet(slide.answer);
      for (let x = slide.min - 2; x <= slide.max + 2; x += 0.25) {
        expect(inSet(x), `${where} at x = ${x}`).toBe(at(f, x) < 0);
      }
    }
  });

  it('reaches the reflected outcome exactly where the cubic is negative', () => {
    for (const { slide, where } of slides('mod-cubic-sign-flow')) {
      const f = inlineMaths(slide).at(-1)!.replace('f(x) = ', '');
      const t = Number(/Above \$x = (-?\d+)\$/.exec(prose(slide))?.[1]);
      expect(outcomeOf(slide).includes('reflected up'), `${where} at ${t}`).toBe(at(f, t) < 0);
    }
  });

  it('shades exactly where |f(x)| op c holds', () => {
    for (const { slide, where } of slides('mod-quad-ineq-line')) {
      if (slide.kind !== 'numberLine') throw new Error('expected a number line');
      const [inequality] = displays(slide);
      const inSet = readSet(slide.answer);
      for (let x = slide.min - 2; x <= slide.max + 2; x += 0.25) {
        expect(inSet(x), `${where} at x = ${x}`).toBe(holds(inequality, x));
      }
    }
  });

  it('names the shape the solution set really has', () => {
    const pieces: Record<string, number> = { 'Less than,Yes': 2, 'Less than,No': 1, 'Greater than,Yes': 3, 'Greater than,No': 2 };
    for (const { slide, where } of slides('mod-quad-ineq-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      let runs = 0;
      let inside = false;
      for (let i = -300; i <= 300; i += 1) {
        const here = holds(slide.subject, i / 10 + 0.05);
        if (here && !inside) runs += 1;
        inside = here;
      }
      expect(pieces[slide.answer.join(',')], where).toBe(runs);
      expect(slide.answer[0] === 'Less than', where).toBe(/ (<|\\le) /.test(slide.subject));
    }
  });

  it('finds the four critical values from the two cases', () => {
    for (const { slide, where } of slides('mod-critical-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const { left, right } = relation(slide.expression);
      const equation = `${left} = ${right}`;
      const [, , a, b, c, d] = slide.answer.map(Number);
      expect(a, where).toBeLessThan(b);
      expect(c, where).toBeLessThan(d);
      expect([a, c, d, b], where).toEqual(wholeRoots(equation));
      const inside = left.replace(/\\lvert|\\rvert/g, '');
      expect(at(inside, a), where).toBe(Number(right));
      expect(at(inside, c), where).toBe(-Number(right));
    }
  });

  it('places the ends of the solution set so it reads as the inequality', () => {
    for (const { slide, where } of slides('mod-quad-ineq-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [inequality] = displays(slide);
      const parts = filled(slide.template, slide.answer).split(' \\text{ or } ');
      const rel = (a: number, op: string, b: number) => (op === '<' ? a < b : op === '>' ? a > b : op === '\\le' ? a <= b : a >= b);
      const reads = (x: number) =>
        parts.some((part) => {
          const span = /^(-?\d+) (<|\\le) x (<|\\le) (-?\d+)$/.exec(part);
          if (span) return rel(Number(span[1]), span[2], x) && rel(x, span[3], Number(span[4]));
          const ray = /^x (<|\\le|>|\\ge) (-?\d+)$/.exec(part);
          if (!ray) throw new Error(`${where}: unreadable ${part}`);
          return rel(x, ray[1], Number(ray[2]));
        });
      for (let x = -10; x <= 10; x += 0.25) expect(reads(x), `${where} at x = ${x}`).toBe(holds(inequality, x));
    }
  });
});

/* ---------- Level 5: regions of the plane ---------- */

const LATTICE = Array.from({ length: 13 }, (_, i) => i - 6).flatMap((x) =>
  Array.from({ length: 13 }, (_, j): [number, number] => [x, j - 6]),
);

/** The rules of a region: one inequality, or several stacked in `gathered`. */
function rules(tex: string): string[] {
  return tex
    .replace(/\\(begin|end)\{gathered\}/g, '')
    .split('\\\\')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

const inRegion = (texs: readonly string[], x: number, y: number) => texs.every((tex) => holds(tex, x, y));

/** One rule read as a boundary `y = f(x)`, the side it keeps, and whether the boundary is in. */
function boundary(tex: string): { f: (x: number) => number; above: boolean; strict: boolean } {
  const { left, rel, right } = relation(tex);
  const yFirst = left.trim() === 'y';
  if (!yFirst && right.trim() !== 'y') throw new Error(`no lone y in ${tex}`);
  const other = yFirst ? right : left;
  const greater = rel === '>' || rel === '>=';
  return {
    f: (x) => at(other, x),
    above: yFirst ? greater : !greater,
    strict: rel === '<' || rel === '>',
  };
}

/* The figure read back into the plane, from plotSvg's own constants. */
const PLOT_W = 280;
const PLOT_PAD = 12;

interface Drawn {
  dots: [number, number][];
  lines: { dashed: boolean; points: [number, number][] }[];
}

function drawn(svg: string): Drawn {
  const height = Number(/viewBox="0 0 280 (\d+)"/.exec(svg)![1]);
  const x = (px: number) => -6 + ((px - PLOT_PAD) / (PLOT_W - 2 * PLOT_PAD)) * 12;
  const y = (py: number) => 6 - ((py - PLOT_PAD) / (height - 2 * PLOT_PAD)) * 12;
  const dots = [...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g)].map(
    (m): [number, number] => [Math.round(x(Number(m[1]))), Math.round(y(Number(m[2])))],
  );
  const lines = [...svg.matchAll(/<path fill="none" stroke="currentColor" stroke-width="2"([^>]*?) d="([^"]+)"/g)].map((m) => ({
    dashed: m[1].includes('stroke-dasharray'),
    points: [...m[2].matchAll(/([\d.-]+),([\d.-]+)/g)].map((p): [number, number] => [x(Number(p[1])), y(Number(p[2]))]),
  }));
  return { dots, lines };
}

/** Does a drawn line run along y = f(x)? Coordinates are printed to a tenth of a pixel. */
const traces = (line: Drawn['lines'][number], f: (x: number) => number) =>
  line.points.every(([x, y]) => Math.abs(f(x) - y) < 0.08);

function diagramOf(slide: Slide): string {
  if (slide.kind === 'slider' && slide.figure) return slide.figure.svg;
  if (!('prompt' in slide)) throw new Error('no prompt');
  const block = slide.prompt.find((b) => b.kind === 'diagram');
  if (!block || block.kind !== 'diagram') throw new Error('no diagram');
  return block.svg;
}

/** Each drawn line is the boundary of one rule, dashed exactly when that rule is strict. */
function matchesPicture(texs: readonly string[], picture: Drawn): boolean {
  if (picture.lines.length !== texs.length) return false;
  return texs.every((tex) => {
    const { f, strict } = boundary(tex);
    return picture.lines.some((line) => traces(line, f) && line.dashed === strict);
  });
}

/**
 * The region a picture shows, as a membership test: on the dot's side of
 * every line, a point on a line counting only when that line is solid.
 */
function pictureRegion(picture: Drawn): (x: number, y: number) => boolean {
  const [[dx, dy]] = picture.dots;
  const sides = picture.lines.map((line) => {
    // A drawn line is a V or an upside-down V: two straight arms, each
    // rebuilt from two points of its path far apart either side of the kink,
    // which fixes the height at every x rather than between samples.
    const pts = line.points;
    const opensUp = pts[1][1] < pts[0][1];
    const ys = pts.map(([, y]) => y);
    const kink = ys.indexOf(opensUp ? Math.min(...ys) : Math.max(...ys));
    const arm = ([x0, y0]: [number, number], [x1, y1]: [number, number]) => (x: number) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    const left = arm(pts[0], pts[kink - 2]);
    const right = arm(pts[kink + 2], pts[pts.length - 1]);
    const height = (x: number) => {
      const raw = opensUp ? Math.max(left(x), right(x)) : Math.min(left(x), right(x));
      return Math.abs(raw - Math.round(raw)) < 0.02 ? Math.round(raw) : raw;
    };
    return { height, above: dy > height(dx), solid: !line.dashed };
  });
  return (x, y) =>
    sides.every(({ height, above, solid }) => {
      const h = height(x);
      if (y === h) return solid;
      return above ? y > h : y < h;
    });
}

/** The picture and the rules agree at every lattice point, and the dot is in. */
function sameRegion(texs: readonly string[], picture: Drawn): boolean {
  const shown = pictureRegion(picture);
  const [[dx, dy]] = picture.dots;
  return inRegion(texs, dx, dy) && LATTICE.every(([x, y]) => shown(x, y) === inRegion(texs, x, y));
}

/** Where two boundaries cross, from a sign change on a fine grid, to the nearest hundredth. */
function crossings(f: (x: number) => number, g: (x: number) => number): number[] {
  const out: number[] = [];
  for (let i = -1200; i <= 1200; i += 1) {
    const x = i / 100;
    const here = f(x) - g(x);
    const next = f(x + 0.01) - g(x + 0.01);
    if (Math.abs(here) < 1e-9) out.push(x);
    else if (Math.abs(next) >= 1e-9 && here * next < 0) out.push(x + 0.005);
  }
  return out;
}

const pointsIn = (text: string) => [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);

describe('regions with modulus, checked from what the learner sees', () => {
  it('draws every region with one line per rule, dashed exactly when the rule is strict', () => {
    const withRules = [
      'mod-region-lowest-slider',
      'mod-region-highest-slider',
      'mod-between-corner-slider',
      'mod-region-count',
      'mod-region-width',
    ];
    for (const id of withRules) {
      for (const { slide, where } of slides(id)) {
        const texs = displays(slide).length > 0 ? rules(displays(slide)[0]) : [inlineMaths(slide)[0]];
        expect(matchesPicture(texs, drawn(diagramOf(slide))), where).toBe(true);
      }
    }
  });

  it('reads the boundary of a rule the same way mathjs evaluates it, at every lattice point', () => {
    const ids = ['mod-region-vertex-tiles', 'mod-cap-intercepts-tiles', 'mod-region-point-choice'];
    for (const id of ids) {
      for (const { slide, where } of slides(id)) {
        const [tex] = rules(displays(slide)[0]);
        const { f, above, strict } = boundary(tex);
        for (const [x, y] of LATTICE) {
          const h = f(x);
          const expected = y === h ? !strict : above ? y > h : y < h;
          expect(holds(tex, x, y), `${where} at (${x}, ${y})`).toBe(expected);
        }
      }
    }
  });

  it('places the vertex of a V, how it is drawn, and which side is in', () => {
    for (const { slide, where } of slides('mod-region-vertex-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { f, above, strict } = boundary(displays(slide)[0]);
      const [a, c, line, side] = slide.answer;
      expect(f(Number(a)), where).toBe(Number(c));
      expect(f(Number(a) - 1) > Number(c) && f(Number(a) + 1) > Number(c), `${where}: a V turns up`).toBe(true);
      expect(line, where).toBe(strict ? '\\text{dashed}' : '\\text{solid}');
      expect(side, where).toBe(above ? '\\text{above}' : '\\text{below}');
    }
  });

  it('places the top of an upside-down V and its two whole x-intercepts', () => {
    for (const { slide, where } of slides('mod-cap-intercepts-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { f } = boundary(displays(slide)[0]);
      const [a, k, left, right] = slide.answer.map(Number);
      expect(f(a), where).toBe(k);
      expect(f(a - 1) < k && f(a + 1) < k, `${where}: it turns down`).toBe(true);
      expect(left, where).toBeLessThan(right);
      expect([f(left), f(right)], where).toEqual([0, 0]);
      expect(crossings(f, () => 0).map((x) => Math.round(x)), where).toEqual([left, right]);
    }
  });

  it('works a point through the boundary at its x, and the point is in exactly when the gap says so', () => {
    for (const id of ['mod-region-test-tree', 'mod-cap-test-tree']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected a tree');
        const [[x, y]] = pointsIn(prose(slide));
        const { f, above, strict } = boundary(slide.expression);
        const vertex = pointsIn(prose(slide)).length;
        expect(vertex, where).toBe(1);
        const [inside, abs, height, gap] = slide.answer.map(Number);
        expect(abs, where).toBe(Math.abs(inside));
        expect(height, where).toBe(f(x));
        expect(gap, where).toBe(y - f(x));
        // The inside is x minus where the modulus is zero: the vertex.
        expect(f(x - inside), where).toBe(id === 'mod-region-test-tree' ? Math.min(...LATTICE.map(([u]) => f(u))) : Math.max(...LATTICE.map(([u]) => f(u))));
        const inByGap = gap === 0 ? !strict : above ? gap > 0 : gap < 0;
        expect(inByGap, where).toBe(holds(slide.expression, x, y));
      }
    }
  });

  it('marks as right the one point that is in the region', () => {
    for (const id of ['mod-region-point-choice', 'mod-pair-point-choice']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'choice') throw new Error('expected a choice');
        const texs = rules(displays(slide)[0]);
        const fits = slide.options.filter(({ label }) => {
          const [[x, y]] = pointsIn(label);
          return inRegion(texs, x, y);
        });
        expect(fits.map((option) => option.id), where).toEqual([slide.correctId]);
      }
    }
  });

  it('slides to the lowest or highest whole y in the region on the line asked about', () => {
    for (const id of ['mod-region-lowest-slider', 'mod-region-highest-slider']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'slider') throw new Error('expected a slider');
        const [tex] = inlineMaths(slide);
        const t = Number(/line \$x = (-?\d+)\$/.exec(prose(slide))![1]);
        const ys = Array.from({ length: 41 }, (_, i) => i - 20).filter((y) => holds(tex, t, y));
        const lowest = prose(slide).includes('**lowest**');
        expect(slide.answer, where).toBe(lowest ? Math.min(...ys) : Math.max(...ys));
        expect(Math.abs(slide.answer), `${where}: on the window`).toBeLessThanOrEqual(6);
        expect(slide.figure?.axis, where).toBe('y');
      }
    }
  });

  it('reaches the right verdict on whether the origin is in', () => {
    for (const { slide, where } of slides('mod-origin-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const inside = holds(slide.subject, 0, 0);
      expect(outcomeOf(slide), where).toBe(inside ? 'The origin is in the region.' : 'The origin is not in the region.');
    }
  });

  /** The two rules of a region between graphs, and where their boundaries cross. */
  const betweenOf = (slide: Slide) => {
    const texs = rules(displays(slide)[0]);
    expect(texs).toHaveLength(2);
    const [f, g] = texs.map((tex) => boundary(tex).f);
    return { texs, f, g, cross: crossings(f, g) };
  };

  it('places the two side corners where the graphs cross, both whole', () => {
    for (const { slide, where } of slides('mod-between-corners-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { f, g, cross } = betweenOf(slide);
      const [x1, y1, x2, y2] = slide.answer.map(Number);
      expect(cross, where).toEqual([x1, x2]);
      expect([f(x1), g(x1), f(x2), g(x2)], where).toEqual([y1, y1, y2, y2]);
    }
    for (const { slide, where } of slides('mod-between-corner-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const { cross } = betweenOf(slide);
      expect(cross, where).toHaveLength(2);
      expect(slide.answer, where).toBe(prose(slide).includes('**right-hand**') ? cross[1] : cross[0]);
    }
  });

  it('names the shape the two graphs really enclose', () => {
    const labels: Record<string, string> = {
      square: 'A square',
      rectangle: 'A rectangle that is not a square',
      kite: 'A kite that is not a square',
      empty: 'Nothing: no point satisfies both',
    };
    for (const { slide, where } of slides('mod-between-shape')) {
      const { texs, f, g, cross } = betweenOf(slide);
      let shape: string;
      const anyPoint = Array.from({ length: 2401 }, (_, i) => -12 + i / 100).some((x) => f(x) <= g(x));
      if (!anyPoint) shape = 'empty';
      else {
        expect(cross, where).toHaveLength(2);
        const xs = Array.from({ length: 2401 }, (_, i) => -12 + i / 100);
        const bottomX = xs.reduce((best, x) => (f(x) < f(best) ? x : best));
        const topX = xs.reduce((best, x) => (g(x) > g(best) ? x : best));
        const corners = [
          [bottomX, f(bottomX)],
          [cross[1], f(cross[1])],
          [topX, g(topX)],
          [cross[0], f(cross[0])],
        ];
        const side = (i: number) => [corners[(i + 1) % 4][0] - corners[i][0], corners[(i + 1) % 4][1] - corners[i][1]];
        const length = (i: number) => Math.hypot(...side(i));
        const square = (i: number) => Math.abs(side(i)[0] * side((i + 1) % 4)[0] + side(i)[1] * side((i + 1) % 4)[1]) < 1e-6;
        const right = [0, 1, 2, 3].every(square);
        const equal = (i: number, j: number) => Math.abs(length(i) - length(j)) < 1e-6;
        if (right) shape = equal(0, 1) ? 'square' : 'rectangle';
        else {
          expect(equal(0, 3) && equal(1, 2), `${where}: two pairs of neighbouring sides equal`).toBe(true);
          shape = 'kite';
        }
      }
      expect(chosen(slide), `${where} ${texs.join(' ; ')}`).toBe(labels[shape]);
    }
  });

  it('builds the rules the picture shows, dot and dashes included', () => {
    for (const { slide, where } of slides('mod-read-region-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const texs = filled(slide.template, slide.answer).split(' \\quad \\text{and} \\quad ');
      const picture = drawn(diagramOf(slide));
      expect(matchesPicture(texs, picture), where).toBe(true);
      expect(sameRegion(texs, picture), where).toBe(true);
    }
  });

  it('marks as right the one option that is the region drawn', () => {
    for (const { slide, where } of slides('mod-read-region-match')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const picture = drawn(diagramOf(slide));
      const fits = slide.options.filter(({ label }) => {
        const texs = rules(label);
        return matchesPicture(texs, picture) && sameRegion(texs, picture);
      });
      expect(fits.map((option) => option.id), where).toEqual([slide.correctId]);
    }
  });

  it('walks from the picture to the inequality it shows', () => {
    for (const { slide, where } of slides('mod-read-region-flow')) {
      const texs = [outcomeOf(slide).replace(/^\$|\$$/g, '')];
      const picture = drawn(diagramOf(slide));
      expect(matchesPicture(texs, picture), where).toBe(true);
      expect(sameRegion(texs, picture), where).toBe(true);
      // The subject quotes the vertex, which the drawn boundary must turn at.
      const [[a, c]] = pointsIn((slide as Extract<Slide, { kind: 'flow' }>).subject);
      expect(boundary(texs[0]).f(a), where).toBe(c);
    }
  });

  it('finds the one thing wrong with a picture, or nothing', () => {
    for (const { slide, where } of slides('mod-region-picture-check')) {
      const texs = rules(displays(slide)[0]);
      const picture = drawn(diagramOf(slide));
      const shapes = texs.every((tex) => picture.lines.some((line) => traces(line, boundary(tex).f)));
      const [[dx, dy]] = picture.dots;
      let verdict: string;
      if (!shapes) verdict = 'No: a vertex is in the wrong place';
      else if (!matchesPicture(texs, picture)) verdict = 'No: solid and dashed are the wrong way round';
      else if (!inRegion(texs, dx, dy)) verdict = 'No: the dot is not in the region';
      else verdict = 'Yes, it is right';
      expect(chosen(slide), where).toBe(verdict);
      if (verdict === 'Yes, it is right') expect(sameRegion(texs, picture), where).toBe(true);
      // Only one thing is ever wrong: a moved vertex or a wrong dash keeps the dot in.
      if (verdict !== 'No: the dot is not in the region') expect(inRegion(texs, dx, dy), where).toBe(true);
    }
  });

  it('counts the lattice points of a region', () => {
    for (const { slide, where } of slides('mod-region-count')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const texs = rules(displays(slide)[0]);
      let n = 0;
      for (let x = -20; x <= 20; x += 1) for (let y = -20; y <= 20; y += 1) if (inRegion(texs, x, y)) n += 1;
      expect(Number(slide.answer), where).toBe(n);
    }
  });

  it('gives the width of the region at the height asked about', () => {
    for (const { slide, where } of slides('mod-region-width')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const texs = rules(displays(slide)[0]);
      const h = Number(/height \$y = (-?\d+)\$/.exec(prose(slide))![1]);
      const xs = Array.from({ length: 2401 }, (_, i) => -12 + i / 100).filter((x) => inRegion(texs, x, h));
      const width = xs[xs.length - 1] - xs[0];
      expect(Math.abs(Number(slide.answer) - width), where).toBeLessThan(0.02);
      expect(Number(slide.answer), where).toBeGreaterThan(0);
    }
  });

  it('finds the highest or lowest lattice point of a region, which is the only one at that height', () => {
    for (const { slide, where } of slides('mod-region-highest-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const texs = rules(displays(slide)[0]);
      const found = LATTICE.filter(([x, y]) => inRegion(texs, x, y));
      const lowest = prose(slide).includes('**lowest**');
      const best = lowest ? Math.min(...found.map(([, y]) => y)) : Math.max(...found.map(([, y]) => y));
      const at = found.filter(([, y]) => y === best);
      expect(at, where).toHaveLength(1);
      expect(slide.answer.map(Number), where).toEqual(at[0]);
    }
  });
});
