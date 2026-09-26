/**
 * Independent checks on the level 10 generators, fractions within fractions.
 *
 * The sweep proves each generator agrees with itself. These read what the
 * learner is shown — the compound fraction or the equation — evaluate it with
 * mathjs, and hold the answer the slide marks right to it: a simplified form
 * must agree with the original at a spread of points, a value must be the
 * original's value, a solution must satisfy the original equation, and a
 * solution rejected must be one where the original is undefined. None of it
 * goes through the generator's own arithmetic.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import { gcd } from './format';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
/** Off the whole numbers and off every small bottom's zero drawn here. */
const POINTS = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17, 7.3, -6.13];

/** Learner-facing TeX as something mathjs evaluates. Handles only what these generators write. */
function toMath(tex: string): string {
  let out = tex
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\\left|\\right/g, '')
    .replace(/\\text\{[^}]*\}/g, '')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/');
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

function at(tex: string, x = 0): number {
  return math.evaluate(toMath(tex), { x }) as number;
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

function expectSame(left: string, right: string, where: string) {
  let compared = 0;
  for (const x of POINTS) {
    const l = at(left, x);
    const r = at(right, x);
    if (!Number.isFinite(l) || !Number.isFinite(r)) continue;
    compared += 1;
    expect(close(l, r), `${where} at x = ${x}: ${left} is ${l}, ${right} is ${r}`).toBe(true);
  }
  expect(compared, `${where}: too few points to compare`).toBeGreaterThanOrEqual(6);
}

function slides(id: string): { slide: Slide; seed: number; difficulty: number; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const slide = generator.render(generator.sample(makeRng(seed), difficulty));
      return { slide, seed, difficulty, where: `${id} seed ${seed} d${difficulty}` };
    }),
  );
}

function display(slide: Slide): string {
  if (!('prompt' in slide)) throw new Error('no prompt');
  const block = slide.prompt.find((b) => b.kind === 'display');
  if (!block || !('tex' in block)) throw new Error('no display');
  return block.tex;
}

function proseOf(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  return slide.prompt.map((b) => ('text' in b ? b.text : '')).join(' ');
}

/** The first `\dfrac{top}{bottom}` in a string, split by brace matching. */
function dfracParts(tex: string): [string, string] {
  const start = tex.indexOf('\\dfrac{');
  if (start < 0) throw new Error(`no \\dfrac in ${tex}`);
  const read = (from: number): [string, number] => {
    let depth = 0;
    for (let i = from; i < tex.length; i += 1) {
      if (tex[i] === '{') depth += 1;
      if (tex[i] === '}') {
        depth -= 1;
        if (depth === 0) return [tex.slice(from + 1, i), i + 1];
      }
    }
    throw new Error(`unbalanced ${tex}`);
  };
  const [top, next] = read(start + '\\dfrac'.length);
  const [bottom] = read(next);
  return [top, bottom];
}

/** The option the slide marks right, and the rest. */
function choiceLabels(slide: Slide): { right: string; wrong: string[] } {
  if (slide.kind !== 'choice') throw new Error(`expected choice, got ${slide.kind}`);
  const right = slide.options.find((o) => o.id === slide.correctId)!.label;
  return { right, wrong: slide.options.filter((o) => o.id !== slide.correctId).map((o) => o.label) };
}

const unwrap = (label: string): string => label.replace(/^\$|\$$/g, '');

/** The labels along a flow's stated answer, by step id. */
function flowPath(slide: Slide): Record<string, string> {
  if (slide.kind !== 'flow') throw new Error(`expected flow, got ${slide.kind}`);
  const out: Record<string, string> = {};
  let step = slide.steps[0];
  for (const label of slide.answer) {
    out[step.id] = label;
    const branch = step.branches.find((b) => b.label === label);
    expect(branch, `answer ${label} is not a branch of ${step.id}`).toBeDefined();
    if (!branch!.to) break;
    step = slide.steps.find((s) => s.id === branch!.to)!;
  }
  return out;
}

describe('numbers first', () => {
  it('the tree tidies the top and the bottom, and divides', () => {
    for (const { slide, where } of slides('af10-num-tidy-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [top, bottom] = dfracParts(slide.expression);
      const [T, B, R] = slide.answer.map((tex) => at(tex));
      expect(close(T, at(top)), `${where}: top`).toBe(true);
      expect(close(B, at(bottom)), `${where}: bottom`).toBe(true);
      expect(close(R, at(slide.expression)), `${where}: value`).toBe(true);
      // Lowest terms: no whole number bigger than 1 divides a top and its bottom.
      for (const tex of slide.answer) {
        const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(tex);
        if (m) expect(gcd(Number(m[1]), Number(m[2])), `${where}: ${tex} not in lowest terms`).toBe(1);
      }
    }
  });

  it('clearing multiplies the top and the bottom by the stated number', () => {
    for (const { slide, where } of slides('af10-num-clear-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const L = Number(/by \$(\d+)\$/.exec(proseOf(slide))![1]);
      const [top, bottom] = dfracParts(display(slide));
      const [newTop, newBottom] = slide.answer.map(Number);
      expect(close(newTop, L * at(top)), `${where}: top`).toBe(true);
      expect(close(newBottom, L * at(bottom)), `${where}: bottom`).toBe(true);
      expect(Number.isInteger(newTop) && Number.isInteger(newBottom), `${where}: not whole`).toBe(true);
    }
  });

  it('k is the smallest number every small bottom divides into', () => {
    for (const { slide, where } of slides('af10-num-lcd')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const dens = [...display(slide).matchAll(/\\frac\{\d+\}\{(\d+)\}/g)].map((m) => Number(m[1]));
      const clears = (k: number) => dens.every((d) => k % d === 0);
      const k = Number(slide.answer);
      expect(clears(k), `${where}: ${k} does not clear ${dens}`).toBe(true);
      for (let smaller = 1; smaller < k; smaller += 1) expect(clears(smaller), `${where}: ${smaller} already clears`).toBe(false);
    }
  });

  it('the value marked right is the value, and no other option is', () => {
    for (const { slide, where } of slides('af10-num-value')) {
      const { right, wrong } = choiceLabels(slide);
      const value = at(display(slide));
      expect(close(at(right), value), `${where}: ${right}`).toBe(true);
      for (const label of wrong) expect(close(at(label), value), `${where}: ${label} is also right`).toBe(false);
    }
  });
});

describe('clearing with the common bottom', () => {
  it('the tiles make a fraction equal to the original', () => {
    for (const { slide, where } of slides('af10-common-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const fraction = `\\frac{${slide.answer.slice(0, 2).join(' ')}}{${slide.answer.slice(2).join(' ')}}`;
      expectSame(fraction, display(slide), where);
    }
  });

  it('the option marked right equals the original and no other does', () => {
    for (const { slide, where } of slides('af10-common-which')) {
      const { right, wrong } = choiceLabels(slide);
      expectSame(right, display(slide), where);
      for (const label of wrong) expect(close(at(label, 0.37), at(display(slide), 0.37)), `${where}: ${label}`).toBe(false);
    }
  });

  it('the flow multiplies by the small bottom and lands on an equal fraction', () => {
    for (const { slide, where } of slides('af10-common-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const path = flowPath(slide);
      const smallBottom = /\\frac\{-?\d+\}\{([^{}]+)\}/.exec(slide.subject)![1];
      expect(path.by, `${where}`).toBe(`Top and bottom by $${smallBottom}$`);
      expectSame(`\\frac{${unwrap(path.top)}}{${unwrap(path.bottom)}}`, slide.subject, where);
    }
  });

  it('the value is the original at the stated x', () => {
    for (const { slide, where } of slides('af10-common-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const x = Number(/\$x = (-?\d+)\$/.exec(proseOf(slide))![1]);
      expect(close(Number(slide.answer), at(display(slide), x)), `${where} at x = ${x}`).toBe(true);
      expect(Number.isInteger(Number(slide.answer)), `${where}: not whole`).toBe(true);
    }
  });
});

describe('a fraction over a fraction', () => {
  it('each step of the reduction equals the original', () => {
    for (const { slide, where } of slides('af10-over-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      for (const reduction of slide.reductions) expectSame(reduction.value, slide.start[0], where);
    }
  });

  it('the tiles make a fraction equal to the original', () => {
    for (const { slide, where } of slides('af10-over-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      expectSame(`\\frac{${slide.answer[0]}}{${slide.answer[1]}}`, display(slide), where);
    }
  });

  it('the option marked right equals the original and no other does', () => {
    for (const { slide, where } of slides('af10-over-which')) {
      const { right, wrong } = choiceLabels(slide);
      expectSame(right, display(slide), where);
      for (const label of wrong) expect(close(at(label, 0.37), at(display(slide), 0.37)), `${where}: ${label}`).toBe(false);
    }
  });

  it('the flow factorises the quadratic, finds the bracket, and lands on an equal fraction', () => {
    for (const { slide, where } of slides('af10-over-cancel-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const path = flowPath(slide);
      const quadratic = /Factorise \$([^$]+)\$/.exec(slide.steps[0].ask)![1];
      expectSame(unwrap(path.factorise), quadratic, `${where} factorising`);
      // The bracket chosen is a factor of the quadratic.
      const bracket = unwrap(path.cancel);
      const root = -Number(/x ([+-] \d+)/.exec(bracket)![1].replace(' ', ''));
      expect(close(at(quadratic, root), 0), `${where}: ${bracket} is not a factor`).toBe(true);
      expectSame(unwrap(path.left), slide.subject, where);
    }
  });
});

describe('stacked fractions', () => {
  it('the tree works from the inside out to an equal fraction', () => {
    for (const { slide, where } of slides('af10-stack-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [inner, divided, whole] = slide.answer;
      const prose = proseOf(slide);
      const innerShown = /Top: \$([^$]+)\$/.exec(prose)![1];
      const top = /Next: \$(\d+)\$/.exec(prose)![1];
      expectSame(inner, innerShown, `${where} inner`);
      expectSame(divided, `\\frac{${top}}{${innerShown}}`, `${where} divided`);
      expectSame(whole, slide.expression, `${where} whole`);
    }
  });

  it('the tiles make a fraction equal to the original', () => {
    for (const { slide, where } of slides('af10-stack-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const fraction = `\\frac{${slide.answer.slice(0, 2).join(' ')}}{${slide.answer.slice(2).join(' ')}}`;
      expectSame(fraction, display(slide), where);
    }
  });

  it('the flow starts inside and divides correctly', () => {
    for (const { slide, where } of slides('af10-stack-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const path = flowPath(slide);
      expect(path.start.startsWith('The innermost part'), where).toBe(true);
      const innerShown = /Write \$([^$]+)\$ as one fraction/.exec(slide.steps.find((s) => s.id === 'inner')!.ask)![1];
      const top = /divide \$(\d+)\$/.exec(slide.steps.find((s) => s.id === 'divide')!.ask)![1];
      expectSame(unwrap(path.inner), innerShown, `${where} inner`);
      expectSame(unwrap(path.divide), `\\frac{${top}}{${innerShown}}`, `${where} divided`);
    }
  });

  it('the value is the original at the stated x', () => {
    for (const id of ['af10-stack-value', 'af10-stack-value+choice']) {
      for (const { slide, where } of slides(id)) {
        const x = Number(/\$x = (-?\d+)\$/.exec(proseOf(slide))![1]);
        const value = at(display(slide), x);
        const claimed = slide.kind === 'expression' ? Number(slide.answer) : Number(choiceLabels(slide).right);
        expect(close(claimed, value), `${where} at x = ${x}`).toBe(true);
        expect(Number.isInteger(claimed), `${where}: not whole`).toBe(true);
      }
    }
  });
});

describe('equations with a fraction inside a fraction', () => {
  /** The two sides of `left = right`, split at the last top-level "=". */
  const sides = (tex: string): [string, string] => {
    const i = tex.lastIndexOf(' = ');
    return [tex.slice(0, i), tex.slice(i + 3)];
  };

  it('the solution typed satisfies the original', () => {
    for (const { slide, where } of slides('af10-eq-solve')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const [left, right] = sides(display(slide));
      const r = Number(slide.answer);
      expect(close(at(left, r), at(right, r)), `${where}: x = ${r}`).toBe(true);
    }
  });

  it('the steps make one fraction equal to the left side, and end on a solution', () => {
    for (const { slide, where } of slides('af10-eq-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [left, , right] = slide.start;
      expectSame(slide.reductions[0].value, left, `${where} one fraction`);
      const r = Number(/x = (-?\d+)/.exec(slide.reductions[2].value)![1]);
      expect(close(at(left, r), at(right, r)), `${where}: x = ${r}`).toBe(true);
      // The cleared line holds wherever the original does.
      const [clearedLeft, clearedRight] = sides(slide.reductions[1].value);
      expect(close(at(clearedLeft, r), at(clearedRight, r)), `${where}: cleared line at x = ${r}`).toBe(true);
    }
  });

  it('a root is rejected exactly when the original is undefined there', () => {
    for (const { slide, where } of slides('af10-eq-reject-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const [left, right] = sides(slide.subject);
      const roots = [...proseOf(slide).matchAll(/\$x = (-?\d+)\$/g)].map((m) => Number(m[1]));
      expect(roots.length, where).toBe(2);
      const standing: number[] = [];
      roots.forEach((x, i) => {
        const value = at(left, x);
        const undefinedThere = !Number.isFinite(value);
        expect(slide.answer[i], `${where}: x = ${x}`).toBe(undefinedThere ? 'Yes' : 'No');
        // A root not rejected really solves it.
        if (!undefinedThere) {
          expect(close(value, at(right, x)), `${where}: x = ${x} does not solve it`).toBe(true);
          standing.push(x);
        }
      });
      const last = slide.answer[2];
      const named = [...last.matchAll(/x = (-?\d+)/g)].map((m) => Number(m[1]));
      expect(named.sort((a, b) => a - b), `${where}: ${last}`).toEqual(standing.sort((a, b) => a - b));
    }
  });

  it('the quadratic placed has the roots of the original, and no others', () => {
    for (const { slide, where } of slides('af10-eq-quad-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [left, right] = sides(display(slide));
      const quadratic = `x^{2} ${slide.answer.join(' ')}`;
      const C = at(right);
      // x^2 + bx + c, read back at three points.
      const c = at(quadratic, 0);
      const b = at(quadratic, 1) - 1 - c;
      const disc = b * b - 4 * c;
      expect(disc, `${where}: no real roots`).toBeGreaterThan(0);
      const roots = [(-b - Math.sqrt(disc)) / 2, (-b + Math.sqrt(disc)) / 2];
      for (const x of roots) {
        const value = at(left, x);
        // Every root of the quadratic solves the original or makes it undefined.
        if (Number.isFinite(value)) expect(close(value, C), `${where}: x = ${x}`).toBe(true);
      }
      // And it is (left - right) times x + something, so it has no root the
      // original lacks: dividing it by left - right leaves x plus a constant.
      const shifts = POINTS.map((x) => at(quadratic, x) / (at(left, x) - C) - x);
      for (const shift of shifts) expect(close(shift, shifts[0]), `${where}: ${shifts}`).toBe(true);
    }
  });
});
