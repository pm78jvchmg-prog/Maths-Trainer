/**
 * An independent check on the level 3 modulus generators, modulus on both
 * sides.
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
import type { Generator, Slide } from '../types';

const SEEDS = 120;
const POINTS = [-3, -2, -1, 0, 1, 2, 3, 5];

/** The learner-facing TeX of an expression as something mathjs evaluates. */
function toMath(tex: string): string {
  return tex
    .replace(/\\lvert/g, 'abs(')
    .replace(/\\rvert/g, ')')
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    // "0x" would read as the start of a hexadecimal number.
    .replace(/(\d)x/g, '$1*x')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)\(/g, ')*(');
}

const compiled = new Map<string, { evaluate(scope: { x: number }): unknown }>();

function at(tex: string, x: number): number {
  let expr = compiled.get(tex);
  if (!expr) {
    expr = math.compile(toMath(tex));
    compiled.set(tex, expr);
  }
  return expr.evaluate({ x }) as number;
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

function holds(tex: string, x: number): boolean {
  const { left, rel, right } = relation(tex);
  const l = at(left, x);
  const r = at(right, x);
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
