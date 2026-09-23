/**
 * An independent check on the calculus behind the optimisation level.
 *
 * The oracle in `generators.test.ts` only sees typed derivatives with a
 * declared `source`. Almost every answer in this level is something else: a
 * function built from a story, a best length, the greatest value, a tile on a
 * tree. Each is checked here against the situation the prompt describes —
 * its numbers read back off the prompt, the function rebuilt from the
 * geometry in this file, and its stationary points found by mathjs's own
 * derivative or by searching the domain — never against the generator's
 * hand-worked values, which would only prove it agrees with itself.
 *
 * As in `rates.test.ts`, every answer is read off the rendered slide: the
 * value typed, the tiles placed, the option marked correct, the path through
 * a flow.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import { valueOf } from '../expr';
import type { Block, Generator, Slide } from '../types';
import {
  optimisationGenerators as g,
  profitCoefficients,
  endpointCoefficients,
  polyInAnswer,
  type CostSliderParams,
  type CubicModel,
  type CylinderParams,
  type EliminateParams,
  type EndpointParams,
  type Model,
  type SliderModelParams,
  type SumLeastParams,
  type ValueParams,
  type WhichParams,
} from './differentiation';

const SEEDS = 200;

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

type Fn = (value: number) => number;

/** A function and its first two derivatives with respect to `variable`, from mathjs. */
function calculus(source: string, variable: string) {
  const key = `${variable}:${source}`;
  if (!derived.has(key)) derived.set(key, differentiate(source, variable));
  return derived.get(key)!;
}

const derived = new Map<string, { f: Fn; first: Fn; second: Fn }>();

function differentiate(source: string, variable: string): { f: Fn; first: Fn; second: Fn } {
  const f = math.parse(source);
  const first = math.derivative(f, variable);
  const second = math.derivative(first, variable);
  const at = (node: { compile(): { evaluate(scope: object): unknown } }): Fn => {
    const compiled = node.compile();
    return (value) => compiled.evaluate({ [variable]: value }) as number;
  };
  return { f: at(f), first: at(first), second: at(second) };
}

const close = (a: number, b: number, tolerance = 1e-9) =>
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

/** All the prose of a prompt, in order. */
const proseOf = (prompt: Block[]): string =>
  prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');

/** The first whole number the prompt mentions: the fence, the sheet, the sum, the area. */
const firstNumber = (text: string): number => Number(/\d+/.exec(text)![0]);

/** TeX as the learner reads it, turned into something mathjs can evaluate. */
function texToMath(tex: string): string {
  const group = '([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)';
  return tex
    .replaceAll('$', '')
    .replace(new RegExp(`\\\\frac\\{${group}\\}\\{${group}\\}`, 'g'), '(($1)/($2))')
    .replaceAll('\\pi', 'pi')
    .replaceAll('{', '(')
    .replaceAll('}', ')')
    .replace(/([0-9a-z)])\(/g, '$1*(');
}

const compiled = new Map<string, { evaluate(scope: object): unknown }>();

function evaluate(expression: string, scope: Record<string, number>): number {
  if (!compiled.has(expression)) compiled.set(expression, math.compile(expression));
  return compiled.get(expression)!.evaluate({ ...scope }) as number;
}

/** The best of f over a grid on (lo, hi), whole numbers included. */
function search(f: Fn, lo: number, hi: number, goal: 'greatest' | 'least'): { x: number; value: number } {
  let best = { x: NaN, value: goal === 'greatest' ? -Infinity : Infinity };
  const steps = 600;
  for (let i = 1; i < steps; i += 1) {
    const x = lo + ((hi - lo) * i) / steps;
    const value = f(x);
    if (goal === 'greatest' ? value > best.value : value < best.value) best = { x, value };
  }
  for (let x = Math.ceil(lo); x <= hi; x += 1) {
    if (x <= lo || x >= hi) continue;
    const value = f(x);
    if (goal === 'greatest' ? value >= best.value : value <= best.value) best = { x, value };
  }
  return best;
}

/**
 * The model's function, rebuilt here from the number its story states: the
 * perimeter, the length of fencing, the width of the sheet, the sum.
 */
function rebuilt({ kind }: Model, stated: number): { source: string; upper: number } {
  switch (kind) {
    case 'rect':
      return { source: `x * ((${stated} - 2x) / 2)`, upper: stated / 2 };
    case 'wall':
      return { source: `x * (${stated} - 2x)`, upper: stated / 2 };
    case 'box':
      return { source: `x * (${stated} - 2x)^2`, upper: stated / 2 };
    case 'sum':
      return { source: `x * (${stated} - x)^2`, upper: stated };
    case 'fence':
      return { source: `2x + 2 * ${stated} / x`, upper: 10 * Math.sqrt(stated) };
    case 'tin':
      return { source: `x^2 + 4x * (${stated} / x^2)`, upper: 10 * Math.cbrt(stated) };
    case 'can':
      // A closed cylinder with surface 2 pi r^2 + 2 pi r h = stated pi.
      return { source: `pi * r^2 * ((${stated} - 2r^2) / (2r))`, upper: Math.sqrt(stated / 2) };
  }
}

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return slide.answer;
};

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
};

describe('optimisation, checked against mathjs', { timeout: 60_000 }, () => {
  it('df-op-build writes the function the story describes', () => {
    for (const { params, slide, seed } of draws(g.buildModel as Generator<Model>)) {
      const { source } = rebuilt(params, firstNumber(proseOf(slide.kind === 'expression' ? slide.prompt : [])));
      const verdict = checkAnswer(typed(slide), source, { domain: 'real', mode: 'exact', seed });
      expect(verdict.status, `${typed(slide)} against ${source}`).toBe('correct');
    }
  });

  it('df-op-value reduces to the function at the length asked', () => {
    for (const { params, slide } of draws(g.modelValue as Generator<ValueParams>)) {
      if (slide.kind !== 'reduce') throw new Error('expected reduce');
      const prose = proseOf(slide.prompt);
      const { source } = rebuilt(params, firstNumber(prose));
      const at = Number(/when \$x = (\d+)\$/.exec(prose)![1]);
      expect(valueOf(slide.expr)).toBeCloseTo(evaluate(source, { x: at }), 9);
    }
  });

  it('df-op-domain names the other length and where it runs out', () => {
    for (const { params, slide } of draws(g.modelDomain as Generator<Model>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const stated = firstNumber(proseOf(slide.prompt));
      const [other, bound] = slide.answer;
      const upper = Number(bound);
      // The other length vanishes at the bound, is positive below it, and is
      // what the geometry leaves.
      expect(close(evaluate(texToMath(other), { x: upper }), 0), `${other} at ${upper}`).toBe(true);
      expect(evaluate(texToMath(other), { x: upper - 0.5 })).toBeGreaterThan(0);
      const leftover =
        params.kind === 'rect' ? `(${stated} - 2x) / 2` : params.kind === 'sum' ? `${stated} - x` : `${stated} - 2x`;
      for (const x of [0.3, 1.7, 2.9]) {
        expect(close(evaluate(texToMath(other), { x }), evaluate(leftover, { x }))).toBe(true);
      }
    }
  });

  it('df-op-derivative is about the function the story describes', () => {
    for (const { params, slide, seed } of draws(g.modelDerivative as Generator<Model>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { source } = rebuilt(params, firstNumber(proseOf(slide.prompt)));
      // The oracle checks the answer is the derivative of `source`; this checks
      // `source` is the function the learner was told about.
      const verdict = checkAnswer(slide.source!, source, { domain: 'positive', mode: 'exact', seed });
      expect(verdict.status, `${slide.source} against ${source}`).toBe('correct');
    }
  });

  it('df-op-slider lands on the greatest point of the function shown', () => {
    for (const { params, slide } of draws(g.modelSlider as Generator<SliderModelParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const variable = params.kind === 'can' ? 'r' : 'x';
      const { source, upper } = rebuilt(params, firstNumber(proseOf(slide.prompt)));
      const { f, first, second } = calculus(source, variable);
      expect(close(first(slide.answer), 0, 1e-7), `gradient at ${slide.answer}`).toBe(true);
      expect(second(slide.answer)).toBeLessThan(0);
      expect(close(search(f, 0, upper, 'greatest').value, f(slide.answer), 1e-6)).toBe(true);
      expect(slide.max).toBeGreaterThanOrEqual(upper - 1e-9);
    }
  });

  it('df-op-box-tree fills the best x, the length it leaves, and the value', () => {
    for (const { params, slide } of draws(g.modelTree as Generator<Model>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { source, upper } = rebuilt(params, firstNumber(proseOf(slide.prompt)));
      const { f, first } = calculus(source, 'x');
      const [x, other, value] = slide.answer.map(Number);
      expect(close(first(x), 0, 1e-7)).toBe(true);
      expect(close(search(f, 0, upper, 'greatest').value, f(x), 1e-6)).toBe(true);
      expect(value).toBeCloseTo(f(x), 9);
      // What the constraint leaves: the base, the other number, the long side.
      const stated = firstNumber(proseOf(slide.prompt));
      expect(other).toBe(params.kind === 'sum' ? stated - x : stated - 2 * x);
    }
  });

  it('df-op-best-value is the greatest or least the function reaches', () => {
    for (const { params, slide } of draws(g.bestValue as Generator<Model>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { source, upper } = rebuilt(params, firstNumber(proseOf(slide.prompt)));
      const goal = /greatest/.test(proseOf(slide.prompt)) ? 'greatest' : 'least';
      const { f } = calculus(source, 'x');
      expect(close(search(f, 0, upper, goal).value, Number(slide.answer), 1e-6), `${source}`).toBe(true);
    }
  });

  /** The cubic a profit-style question shows, and the stationary point it names. */
  const cubicOf = (params: CubicModel) => calculus(polyInAnswer(profitCoefficients(params), 'x'), 'x');

  it('df-op-second marks the second derivative and the nature it gives', () => {
    for (const { params, slide } of draws(g.secondTest as Generator<CubicModel>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const p = Number(/stationary point at \$x = (\d+)\$/.exec(proseOf(slide.prompt))![1]);
      const { first, second } = cubicOf(params);
      expect(close(first(p), 0)).toBe(true);
      const label = correctLabel(slide);
      expect(Number(/^-?\d+/.exec(label)![0])).toBeCloseTo(second(p), 9);
      expect(label).toContain(second(p) < 0 ? 'maximum' : 'minimum');
    }
  });

  it('df-op-nature-flow walks the second derivative, the nature and the value', () => {
    for (const { params, slide } of draws(g.optNatureFlow as Generator<CubicModel>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const p = Number(/Sort out the one at \$x = (\d+)\$/.exec(proseOf(slide.prompt))![1]);
      const { f, first, second } = cubicOf(params);
      expect(close(first(p), 0)).toBe(true);
      const [value2, word, value] = slide.answer;
      expect(Number(value2.replaceAll('$', ''))).toBeCloseTo(second(p), 9);
      expect(word.toLowerCase()).toContain(second(p) < 0 ? 'maximum' : 'minimum');
      expect(Number(value.replaceAll('$', ''))).toBeCloseTo(f(p), 9);
    }
  });

  it('df-op-cubic-best finds the stationary point of the kind asked', () => {
    for (const { params, slide } of draws(g.cubicBest as Generator<CubicModel>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { first, second } = cubicOf(params);
      const x = Number(slide.answer);
      expect(close(first(x), 0)).toBe(true);
      const wanted = /\*\*maximum\*\*/.test(proseOf(slide.prompt)) ? 'maximum' : 'minimum';
      expect(second(x) < 0 ? 'maximum' : 'minimum').toBe(wanted);
    }
  });

  it('df-op-endpoint gives the greatest or least over the closed interval', () => {
    for (const { params, slide } of draws(g.endpointBest as Generator<EndpointParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { f } = calculus(polyInAnswer(endpointCoefficients(params), 'x'), 'x');
      const prose = proseOf(slide.prompt);
      const c = Number(/\\le (\d+)\$/.exec(prose)![1]);
      const goal = /\*\*greatest\*\*/.test(prose) ? 'greatest' : 'least';
      // The grid is open, so the two ends are checked on their own.
      const inside = search(f, 0, c, goal).value;
      const ends = [f(0), f(c)];
      const best = goal === 'greatest' ? Math.max(inside, ...ends) : Math.min(inside, ...ends);
      expect(close(best, Number(slide.answer), 1e-6), `${polyInAnswer(endpointCoefficients(params), 'x')} on [0, ${c}]`).toBe(true);
    }
  });

  it('df-op-sum-least is the least of the weighted sum with the product fixed', () => {
    for (const { slide } of draws(g.sumLeast as Generator<SumLeastParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const k = firstNumber(proseOf(slide.prompt).replace('$x$ and $y$', ''));
      const display = slide.prompt.find((block) => block.kind === 'display');
      const objective = texToMath((display as { tex: string }).tex.replace('C = ', ''));
      const cost = (x: number) => evaluate(objective, { x, y: k / x });
      expect(close(search(cost, 0, 4 * k, 'least').value, Number(slide.answer), 1e-6), objective).toBe(true);
    }
  });

  it('df-op-cost-slider lands where the cost is least', () => {
    for (const { slide } of draws(g.costSlider as Generator<CostSliderParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const display = slide.prompt.find((block) => block.kind === 'display');
      const { f, first, second } = calculus(texToMath((display as { tex: string }).tex.replace('C = ', '')), 'x');
      expect(close(first(slide.answer), 0, 1e-7)).toBe(true);
      expect(second(slide.answer)).toBeGreaterThan(0);
      expect(close(search(f, 0, slide.max, 'least').value, f(slide.answer), 1e-6)).toBe(true);
    }
  });

  it('df-op-cylinder-tree fills the best radius, its height and the volume', () => {
    for (const { params, slide } of draws(g.cylinderTree as Generator<CylinderParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      // The sheet's area, as a multiple of pi, and the height it leaves.
      const sheet = firstNumber(proseOf(slide.prompt));
      const height = params.closed ? `(${sheet} - 2r^2) / (2r)` : `(${sheet} - r^2) / (2r)`;
      const { f, first } = calculus(`r^2 * ${height}`, 'r');
      const [r, h, k] = slide.answer.map(Number);
      expect(close(first(r), 0, 1e-7)).toBe(true);
      expect(close(search(f, 0, Math.sqrt(sheet), 'greatest').value, f(r), 1e-6)).toBe(true);
      expect(h).toBeCloseTo(evaluate(height, { r }), 9);
      expect(k).toBeCloseTo(f(r), 9);
    }
  });

  /** [best length, other length, best value] for a model, from its story alone. */
  function solved(params: Model, prompt: Block[]): number[] {
    const stated = firstNumber(proseOf(prompt));
    const { source, upper } = rebuilt(params, stated);
    const variable = params.kind === 'can' ? 'r' : 'x';
    const { f } = calculus(source, variable);
    const x = Math.round(search(f, 0, upper, 'greatest').x);
    const other =
      params.kind === 'can'
        ? (stated - 2 * x * x) / (2 * x)
        : params.kind === 'sum'
          ? stated - x
          : stated - 2 * x;
    const value = params.kind === 'can' ? f(x) / Math.PI : f(x);
    return [x, other, value];
  }

  it('df-op-which-quantity marks the quantity the question asks for', () => {
    for (const { params, slide } of draws(g.whichQuantity as Generator<WhichParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const wanted = solved(params, slide.prompt)[params.ask];
      expect(Number(correctLabel(slide))).toBeCloseTo(wanted, 9);
    }
  });

  it('df-op-method-flow builds the right function, keeps the right root, gives what was asked', () => {
    for (const { params, slide } of draws(g.optMethodFlow as Generator<WhichParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const stated = firstNumber(proseOf(slide.prompt));
      const variable = params.kind === 'can' ? 'r' : 'x';
      const { source } = rebuilt(params, stated);
      const [build, keep, give] = slide.answer;
      const built = texToMath(build.replace(/^\$[A-Z] = /, '$'));
      for (const value of [0.4, 1.3, 2.2]) {
        expect(close(evaluate(built, { [variable]: value }), evaluate(source, { [variable]: value })), build).toBe(true);
      }
      const [best, , ] = solved(params, slide.prompt);
      expect(Number(keep.replaceAll('$', '').split('=')[1])).toBe(best);
      expect(Number(give.replaceAll('$', ''))).toBeCloseTo(solved(params, slide.prompt)[params.ask], 9);
    }
  });

  it('df-op-eliminate uses the constraint and substitutes it', () => {
    for (const { params, slide } of draws(g.eliminate as Generator<EliminateParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const stated = firstNumber(proseOf(slide.prompt).replace(/\$[a-z]\$/g, ''));
      const [first, second] = slide.answer.map(texToMath);
      for (const v of [0.7, 1.9, 3.1]) {
        const other = evaluate(first, { x: v, r: v });
        const rest = evaluate(second, { x: v, r: v });
        switch (params.kind) {
          case 'fence':
            expect(close(v * other, stated)).toBe(true);
            expect(close(rest, 2 * other)).toBe(true);
            break;
          case 'tin':
            expect(close(v * v * other, stated)).toBe(true);
            expect(close(rest, 4 * v * other)).toBe(true);
            break;
          case 'sum':
            expect(close(v + other, stated)).toBe(true);
            expect(close(rest, v * other * other)).toBe(true);
            break;
          case 'can':
            expect(close(Math.PI * v * v * other, stated * Math.PI)).toBe(true);
            expect(close(rest, 2 * Math.PI * v * other)).toBe(true);
            break;
        }
      }
    }
  });
});
