/**
 * Independent checks on the level 8 generators (factorising to simplify).
 *
 * The sweep proves each generator agrees with itself. These read only what
 * the learner is shown — the polynomial or fraction on screen, the answer
 * tokens, the branch labels, the lines of working — parse them with mathjs,
 * and confirm the answer is equal to the question at a spread of points. A
 * factorisation that multiplies back to something else, a simplified form
 * that is not equal to the fraction, or a value at a hole that is not the
 * limit there, fails here even when the generator's own model is consistent.
 *
 * "Simplify fully" is also checked from the screen: the answer's top and
 * bottom must share no root, so nothing cancelling is left behind.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';
import { fractionsLevel8Generators } from './fractionsLevel8';

const SEEDS = 80;
const POINTS = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17, 7.3];

/** Learner-facing TeX as something mathjs evaluates. Handles only what level 8 writes. */
function toMath(tex: string): string {
  let out = tex
    .replace(/\\text\{[^}]*\}/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\;|&/g, ' ');
  const fraction = /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  return out
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/(\d)\s*x/g, '$1*x')
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*x/g, ')*x')
    .replace(/x\s*\(/g, 'x*(');
}

function at(tex: string, x: number): number {
  return math.evaluate(toMath(tex), { x }) as number;
}

function expectSame(left: string, right: string, where: string) {
  for (const x of POINTS) {
    expect(at(left, x), `${where} at x = ${x}: ${left} vs ${right}`).toBeCloseTo(at(right, x), 7);
  }
}

/** No rational p/q with small p and q is a root of both. */
function expectNothingCancels(top: string, bottom: string, where: string) {
  for (let q = 1; q <= 6; q += 1) {
    for (let p = -40; p <= 40; p += 1) {
      const x = p / q;
      const both = Math.abs(at(top, x)) < 1e-9 && Math.abs(at(bottom, x)) < 1e-9;
      expect(both, `${where}: ${top} and ${bottom} both vanish at ${x}`).toBe(false);
    }
  }
}

function slides(id: string) {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { slide: generator.render(params), where: `${id} seed ${seed} d${difficulty}` };
    }),
  );
}

function display(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  const block = slide.prompt.find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

function prose(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  return slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
}

const unwrap = (label: string): string => label.replace(/^\$|\$$/g, '');

const TOP_BOTTOM = ['af8-hcf-simplify', 'af8-dots-simplify', 'af8-ac-simplify', 'af8-cubic-simplify', 'af8-combo-multiply'];

describe('level 8: every answer equals its question', () => {
  it('knows every level 8 generator', () => {
    // A generator added without a check here would pass on the sweep alone.
    const checked = new Set([
      ...TOP_BOTTOM,
      'af8-hcf-tiles',
      'af8-dots-tiles',
      'af8-ac-tiles',
      'af8-cubic-tiles',
      'af8-ac-tree',
      'af8-combo-add-tree',
      'af8-hcf-flow',
      'af8-ac-flow',
      'af8-dots-chain-steps',
      'af8-group-steps',
      'af8-combo-divide-steps',
      'af8-hcf-hole',
      'af8-dots-hole',
      'af8-cubic-hole',
      'af8-combo-value',
    ]);
    expect(fractionsLevel8Generators.map((g) => g.id).filter((id) => !checked.has(id))).toEqual([]);
  });

  it('a factorisation multiplies back to the line shown', () => {
    for (const id of ['af8-hcf-tiles', 'af8-dots-tiles', 'af8-ac-tiles', 'af8-cubic-tiles']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error(`${where}: expected tiles`);
        const product = slide.answer.map((token) => `(${token})`).join('');
        expectSame(product, display(slide), where);
      }
    }
  });

  it('a simplified top over bottom equals the fraction, with nothing left to cancel', () => {
    for (const id of TOP_BOTTOM) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error(`${where}: expected tiles`);
        const [top, bottom] = slide.answer;
        expectSame(`\\frac{${top}}{${bottom}}`, display(slide), where);
        expectNothingCancels(top, bottom, where);
      }
    }
  });

  it('the choice forms mark the same fraction right', () => {
    for (const id of TOP_BOTTOM) {
      for (const { slide, where } of slides(`${id}+choice`)) {
        if (slide.kind !== 'choice') throw new Error(`${where}: expected choice`);
        const right = slide.options.find((o) => o.id === slide.correctId)!.label;
        expectSame(right, display(slide), where);
        for (const option of slide.options) {
          if (option.id === slide.correctId) continue;
          const differs = POINTS.some((x) => Math.abs(at(option.label, x) - at(right, x)) > 1e-6);
          expect(differs, `${where}: ${option.label} is worth the same as ${right}`).toBe(true);
        }
      }
    }
  });

  it('the ac tree: ac, a pair that multiplies to it and adds to b, and factors that multiply back', () => {
    for (const { slide, where } of slides('af8-ac-tree')) {
      if (slide.kind !== 'tree') throw new Error(`${where}: expected tree`);
      const f = (x: number) => at(slide.expression, x);
      const c = f(0);
      const a = (f(1) + f(-1)) / 2 - c;
      const b = (f(1) - f(-1)) / 2;
      const [ac, pair, factors] = slide.answer;
      expect(Number(ac), where).toBeCloseTo(a * c, 9);
      const [u, v] = pair.split('\\text{ and }').map((s) => Number(s.trim()));
      expect(u * v, `${where}: pair product`).toBeCloseTo(a * c, 9);
      expect(u + v, `${where}: pair sum`).toBeCloseTo(b, 9);
      expectSame(factors, slide.expression, where);
    }
  });

  it('the sum tree: each fraction simplified, and the total equal to the whole question', () => {
    for (const { slide, where } of slides('af8-combo-add-tree')) {
      if (slide.kind !== 'tree') throw new Error(`${where}: expected tree`);
      const [first, second, total] = slide.answer;
      const minus = / - \\frac/.test(slide.expression);
      const [left, right] = slide.expression.split(minus ? ' - \\frac' : ' + \\frac');
      expectSame(first, left, `${where} first`);
      expectSame(second, `\\frac${right}`, `${where} second`);
      expectSame(total, slide.expression, `${where} total`);
    }
  });

  it('a flow: the factorised top and bottom and the result all equal what they came from', () => {
    for (const { slide, where } of slides('af8-hcf-flow')) {
      if (slide.kind !== 'flow') throw new Error(`${where}: expected flow`);
      const [top, bottom, result] = slide.answer.map(unwrap);
      expectSame(`\\frac{${top}}{${bottom}}`, slide.subject, where);
      expectSame(result, slide.subject, where);
    }
    for (const { slide, where } of slides('af8-ac-flow')) {
      if (slide.kind !== 'flow') throw new Error(`${where}: expected flow`);
      const [pair, factors, result] = slide.answer.map(unwrap);
      const ask = slide.steps[0].ask;
      const ac = Number(/\$ac = (-?\d+)\$/.exec(ask)![1]);
      const b = Number(/\$b = (-?\d+)\$/.exec(ask)![1]);
      const [u, v] = pair.split('\\text{ and }').map((s) => Number(s.trim()));
      expect([u * v, u + v], where).toEqual([ac, b]);
      // The factors are the top's: over the subject's bottom they give the subject back.
      const bottom = /\}\{(.*)\}$/.exec(slide.subject)![1];
      expectSame(`\\frac{${factors}}{${bottom}}`, slide.subject, where);
      expectSame(result, slide.subject, where);
    }
  });

  it('every line of a steps slide is equal to the line it started from', () => {
    for (const id of ['af8-dots-chain-steps', 'af8-group-steps', 'af8-combo-divide-steps']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'steps') throw new Error(`${where}: expected steps`);
        const start = slide.start.join(' ');
        let line = slide.start;
        for (const step of slide.reductions) {
          line = [...line.slice(0, step.span[0]), step.value, ...line.slice(step.span[1])];
          expectSame(line.join(' '), start, where);
        }
      }
    }
  });

  it('the value at a hole is the limit of the fraction there', () => {
    for (const id of ['af8-hcf-hole', 'af8-dots-hole', 'af8-cubic-hole']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'expression') throw new Error(`${where}: expected expression`);
        const h = at(/\$x = ([^$]+)\$/.exec(prose(slide))![1], 0);
        const fraction = display(slide);
        const bottom = /\}\{(.*)\}$/.exec(fraction)![1];
        expect(Math.abs(at(bottom, h)), `${where}: the bottom is not zero at ${h}`).toBeLessThan(1e-9);
        const limit = (at(fraction, h + 1e-6) + at(fraction, h - 1e-6)) / 2;
        expect(Number(slide.answer), where).toBeCloseTo(limit, 4);
      }
    }
  });

  it('the value after simplifying is the value of the product at that x', () => {
    for (const { slide, where } of slides('af8-combo-value')) {
      if (slide.kind !== 'expression') throw new Error(`${where}: expected expression`);
      const x = Number(/\$x = (-?\d+)\$/.exec(prose(slide))![1]);
      expect(Number(slide.answer), where).toBeCloseTo(at(display(slide), x), 9);
    }
  });
});
