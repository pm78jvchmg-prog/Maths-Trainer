/**
 * Independent checks on the level 9 generators: rearranging formulae.
 *
 * The sweep proves each generator agrees with itself. These read what the
 * learner is shown (the formula, and the rearrangement the slide says is
 * right), parse both with mathjs, and check the rearrangement by putting it
 * back: pick values for the other letters, work out the subject from the
 * claimed answer, and confirm the original formula holds. Nothing here reuses
 * the generators' own algebra, so a sign slip in building a rearrangement
 * fails here even when every slide is internally consistent.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { choiceVariants } from '../choiceVariant';
import type { Generator, Slide } from '../types';
import { fractionsLevel9Generators } from './fractionsLevel9';

const SEEDS = 120;
const POINTS = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17];

const all = [...fractionsLevel9Generators, ...choiceVariants(fractionsLevel9Generators as Generator<unknown>[])] as Generator<unknown>[];
const byId = (id: string) => {
  const found = all.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
};

function slides(id: string): { slide: Slide; where: string }[] {
  const generator = byId(id);
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} seed ${seed} d${difficulty}`,
    })),
  );
}

/** Learner-facing TeX as mathjs syntax: fractions, subscripts, Greek, and every implicit product. */
function toMath(tex: string): string {
  let out = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '*')
    .replace(/\\quad|\\,|\\;/g, ' ')
    .replace(/\\rho/g, 'rho')
    .replace(/\\mu/g, 'mu')
    .replace(/([A-Za-z])_(\d)/g, '$1$2');
  const fraction = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  if (out.includes('\\')) throw new Error(`unread TeX in ${tex}`);
  const tokens = out.match(/rho|mu|[A-Za-z]\d?|\d+|[()+\-*/=]/g) ?? [];
  const operand = (t: string) => /^[A-Za-z0-9]/.test(t);
  let result = '';
  tokens.forEach((token, i) => {
    const prev = tokens[i - 1];
    if (prev !== undefined && (operand(prev) || prev === ')') && (operand(token) || token === '(')) result += '*';
    result += token;
  });
  return result;
}

const evalAt = (tex: string, scope: Record<string, number>): number => math.evaluate(toMath(tex), { ...scope }) as number;

/** The right side of `lhs = rhs`. */
const rightOf = (line: string): string => line.slice(line.indexOf('=') + 1);
const leftOf = (line: string): string => line.slice(0, line.indexOf('='));

/** Does an equation hold at these values? */
const holds = (line: string, scope: Record<string, number>): boolean =>
  Math.abs(evalAt(leftOf(line), scope) - evalAt(rightOf(line), scope)) < 1e-7 * Math.max(1, Math.abs(evalAt(leftOf(line), scope)));

function display(slide: Slide, index = 0): string {
  if (!('prompt' in slide)) return '';
  const blocks = slide.prompt.filter((b) => b.kind === 'display');
  const block = blocks[index];
  return block && 'tex' in block ? block.tex : '';
}

function filled(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
}

/** A top/bottom tiles answer as one fraction. */
function placed(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  if (slide.template.includes('top')) return `\\frac{${slide.answer[0]}}{${slide.answer[1]}}`;
  return rightOf(filled(slide));
}

function rightLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected choice, got ${slide.kind}`);
  return slide.options.find((o) => o.id === slide.correctId)!.label;
}

/** y = f(x) shown as `y = ...`: x from the claim, put back in, gives y. */
function expectInverts(original: string, xOfY: string, where: string) {
  for (const y of POINTS) {
    const x = evalAt(xOfY, { y });
    if (!Number.isFinite(x)) continue;
    expect(evalAt(rightOf(original), { x }), `${where}: y = ${y}, x = ${x}`).toBeCloseTo(y, 7);
  }
}

describe('the subject twice, put back into the formula shown', () => {
  it('tiles, tree, steps and the pick-one form all give an x that returns the y', () => {
    for (const { slide, where } of slides('af9-twice-place')) expectInverts(display(slide), placed(slide), where);
    for (const { slide, where } of slides('af9-twice-place+choice')) expectInverts(display(slide), rightOf(rightLabel(slide)), where);
    for (const { slide, where } of slides('af9-factor-tree')) {
      if (slide.kind !== 'tree') throw new Error('tree');
      expectInverts(slide.expression, rightOf(slide.answer[2]), where);
      // The bracket times x, set equal to the other side, is the same equation.
      expectInverts(slide.expression, `\\frac{${slide.answer[1]}}{${slide.answer[0]}}`, where);
    }
    for (const { slide, where } of slides('af9-twice-steps')) {
      if (slide.kind !== 'steps') throw new Error('steps');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectInverts(slide.start.join(' '), rightOf(last), where);
    }
  });

  it('every intermediate step line is true of each (x, y) on the curve', () => {
    for (const { slide, where } of slides('af9-twice-steps')) {
      if (slide.kind !== 'steps') throw new Error('steps');
      const original = slide.start.join(' ');
      for (const x of POINTS) {
        const y = evalAt(rightOf(original), { x });
        for (const reduction of slide.reductions) expect(holds(reduction.value, { x, y }), `${where}: ${reduction.value}`).toBe(true);
      }
    }
  });

  it('the answer collected on the right equals the one shown, and no other option does', () => {
    for (const { slide, where } of slides('af9-twice-equal')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const shown = rightOf(display(slide));
      for (const option of slide.options) {
        const same = POINTS.every((y) => Math.abs(evalAt(rightOf(option.label), { y }) - evalAt(shown, { y })) < 1e-7);
        expect(same, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('the subject on the bottom', () => {
  it('x placed or reached returns the y', () => {
    for (const { slide, where } of slides('af9-bottom-place')) expectInverts(display(slide), placed(slide), where);
    for (const { slide, where } of slides('af9-bottom-steps')) {
      if (slide.kind !== 'steps') throw new Error('steps');
      expectInverts(slide.start.join(' '), rightOf(slide.reductions[slide.reductions.length - 1].value), where);
    }
    for (const { slide, where } of slides('af9-bottom-plan')) {
      if (slide.kind !== 'flow') throw new Error('flow');
      const last = slide.answer[slide.answer.length - 1].replace(/^\$|\$$/g, '');
      expectInverts(slide.subject, rightOf(last), where);
    }
  });

  it('the right letter formula satisfies the formula shown, and every other option breaks it', () => {
    const rng = makeRng('letters');
    for (const { slide, where } of slides('af9-bottom-letters')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const formula = display(slide);
      for (const option of slide.options) {
        const verdicts = Array.from({ length: 5 }, () => {
          const scope: Record<string, number> = {};
          for (const name of toMath(formula + option.label).match(/rho|mu|[A-Za-z]\d?/g) ?? []) scope[name] = rng.float(1.1, 9.7);
          const subject = toMath(leftOf(option.label)).trim();
          scope[subject] = evalAt(rightOf(option.label), scope);
          return holds(formula, scope);
        });
        expect(verdicts.every(Boolean), `${where}: ${option.label} in ${formula}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

/** Values for every letter of a sum-of-reciprocals formula, the subject from the claim, then the formula checked. */
function expectRecip(formula: string, subject: string, claim: string, where: string) {
  const rng = makeRng(where);
  for (let i = 0; i < 5; i += 1) {
    const scope: Record<string, number> = {};
    for (const name of toMath(formula + claim).match(/rho|mu|[A-Za-z]\d?/g) ?? []) scope[name] = rng.float(1.1, 9.7);
    scope[toMath(subject)] = evalAt(claim, scope);
    expect(holds(formula, scope), `${where}: ${subject} = ${claim} in ${formula}`).toBe(true);
  }
}

describe('sums of reciprocals, put back into the formula shown', () => {
  it('placed, picked and reached', () => {
    for (const { slide, where } of slides('af9-recip-place')) {
      const subject = /Make \$([^$]+)\$ the subject/.exec((slide as { prompt: { kind: string; text?: string }[] }).prompt[0].text!)![1];
      expectRecip(display(slide), subject, placed(slide), where);
    }
    for (const { slide, where } of slides('af9-recip-place+choice')) {
      const label = rightLabel(slide);
      expectRecip(display(slide), leftOf(label), rightOf(label), where);
    }
    for (const { slide, where } of slides('af9-recip-steps')) {
      if (slide.kind !== 'steps') throw new Error('steps');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expectRecip(slide.start.join(' '), leftOf(last), rightOf(last), where);
    }
  });

  it('numbers put into the formula as it was given', () => {
    for (const { slide, where } of slides('af9-parallel-tree')) {
      if (slide.kind !== 'tree') throw new Error('tree');
      const text = (slide.prompt[0] as { text: string }).text;
      const values = Object.fromEntries([...text.matchAll(/\$([A-Za-z](?:_\d)?) = (\d+)\$/g)].map((m) => [toMath(m[1]), Number(m[2])]));
      const [first, second, result] = slide.answer.map(Number);
      if ('f' in values) {
        const v = result;
        expect(1 / values.f, where).toBeCloseTo(1 / values.u + 1 / v, 10);
        expect(first, where).toBe(values.u - values.f);
        expect(second, where).toBe(values.u * values.f);
      } else {
        expect(1 / result, where).toBeCloseTo(1 / values.R1 + 1 / values.R2, 10);
        expect(first, where).toBe(values.R1 + values.R2);
        expect(second, where).toBe(values.R1 * values.R2);
      }
    }
  });

  it('a typed member of the pair satisfies the formula with the other two', () => {
    for (const id of ['af9-recip-value', 'af9-sub-value']) {
      for (const { slide, where } of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expression');
        const text = (slide.prompt[0] as { text: string }).text;
        const scope = Object.fromEntries([...text.matchAll(/\$([A-Za-z](?:_\d)?) = (\d+)\$/g)].map((m) => [toMath(m[1]), Number(m[2])]));
        scope[toMath(slide.lead!.replace('=', ''))] = Number(slide.answer);
        expect(Number.isInteger(Number(slide.answer)), where).toBe(true);
        expect(holds(display(slide), scope), `${where}: ${JSON.stringify(scope)} in ${display(slide)}`).toBe(true);
      }
    }
  });
});

describe('inverse functions, from the f shown', () => {
  /** f(g(x)) = x at every point. */
  function expectInverse(f: string, g: string, where: string) {
    for (const x of POINTS) {
      const inner = evalAt(g, { x });
      if (!Number.isFinite(inner)) continue;
      expect(evalAt(f, { x: inner }), `${where} at ${x}`).toBeCloseTo(x, 7);
    }
  }

  it('placed, picked and reached inverses undo f', () => {
    for (const { slide, where } of slides('af9-inverse-place')) expectInverse(rightOf(display(slide)), placed(slide), where);
    for (const { slide, where } of slides('af9-inverse-place+choice')) expectInverse(rightOf(display(slide)), rightOf(rightLabel(slide)), where);
    for (const { slide, where } of slides('af9-inverse-steps')) {
      if (slide.kind !== 'steps') throw new Error('steps');
      expectInverse(rightOf(display(slide)), rightOf(slide.reductions[slide.reductions.length - 1].value), where);
    }
  });

  it('f sends the typed value of the inverse back to the number asked about', () => {
    for (const { slide, where } of slides('af9-inverse-value')) {
      if (slide.kind !== 'expression') throw new Error('expression');
      const k = Number(/f\^\{-1\}\((-?\d+)\)/.exec(slide.lead!)![1]);
      expect(evalAt(rightOf(display(slide)), { x: Number(slide.answer) }), where).toBeCloseTo(k, 9);
    }
  });

  it('the excluded value is the one f never takes', () => {
    for (const { slide, where } of slides('af9-inverse-excluded')) {
      if (slide.kind !== 'expression') throw new Error('expression');
      const f = rightOf(display(slide));
      const value = Number(slide.answer);
      expect(evalAt(f, { x: 1e9 }), where).toBeCloseTo(value, 6);
      // f(x) - value times the bottom is a non-zero constant, so f(x) = value has no solution.
      const bottom = /\\frac\{[^{}]*\}\{([^{}]*)\}/.exec(f)![1];
      const constant = POINTS.map((x) => (evalAt(f, { x }) - value) * evalAt(bottom, { x }));
      for (const c of constant) expect(c, where).toBeCloseTo(constant[0], 7);
      expect(Math.abs(constant[0]), where).toBeGreaterThan(0.5);
    }
  });

  it('exactly the right option is its own inverse', () => {
    for (const { slide, where } of slides('af9-self-inverse')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      for (const option of slide.options) {
        const selfInverse = POINTS.every((x) => Math.abs(evalAt(option.label, { x: evalAt(option.label, { x }) }) - x) < 1e-7);
        expect(selfInverse, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('rearrange, then substitute; spot the slip', () => {
  it('the x the tree reaches gives the y the prompt names, and the top and bottom divide to it', () => {
    for (const { slide, where } of slides('af9-sub-tree')) {
      if (slide.kind !== 'tree') throw new Error('tree');
      const Y = Number(/put \$y = (-?\d+)\$ in/.exec((slide.prompt[0] as { text: string }).text)![1]);
      const [top, bottom, x] = slide.answer.map(Number);
      expect(evalAt(rightOf(slide.expression), { x }), where).toBeCloseTo(Y, 9);
      expect(top / bottom, where).toBe(x);
    }
  });

  /** The numbered lines of an attempt, read back out of its display. */
  const attemptLines = (tex: string): string[] =>
    tex
      .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
      .split('\\\\')
      .map((line) => line.slice(line.indexOf('&') + 1).trim());

  /** The first line false at a point on the curve, 1-based, or 0 when all hold. */
  function firstWrong(original: string, lines: string[]): number {
    const wrong = lines.findIndex((line) =>
      POINTS.some((x) => {
        const y = evalAt(rightOf(original), { x });
        return !holds(line, { x, y });
      }),
    );
    return wrong + 1;
  }

  it('the line picked is the first one false on the curve', () => {
    for (const { slide, where } of slides('af9-slip-line')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const wrong = firstWrong(display(slide, 0), attemptLines(display(slide, 1)));
      expect(wrong, where).toBeGreaterThan(0);
      expect(rightLabel(slide), where).toBe(`\\text{Line (${wrong})}`);
    }
  });

  it('the flow stops at the first false line, and its fix is true', () => {
    for (const { slide, where } of slides('af9-slip-flow')) {
      if (slide.kind !== 'flow') throw new Error('flow');
      const original = slide.subject;
      const wrong = firstWrong(original, attemptLines(display(slide, 0)));
      const yeses = slide.answer.filter((a) => a === 'Yes').length;
      if (wrong === 0) {
        expect(slide.answer, where).toEqual(['Yes', 'Yes', 'Yes', 'Yes']);
        continue;
      }
      expect(yeses, where).toBe(wrong - 1);
      const fix = slide.answer[slide.answer.length - 1].replace(/^\$|\$$/g, '');
      for (const x of POINTS) expect(holds(fix, { x, y: evalAt(rightOf(original), { x }) }), `${where}: ${fix}`).toBe(true);
    }
  });
});
