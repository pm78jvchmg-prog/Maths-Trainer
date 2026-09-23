/**
 * An independent check on the calculus behind the rates-of-change level.
 *
 * The oracle in `generators.test.ts` differentiates a question's `source` in
 * $x$ and compares it with the answer. Almost nothing in this level fits that:
 * quantities change with time, so functions are written in $t$, and most
 * answers are a rate at a moment, a time, or a multiple of π rather than a
 * derivative. Each is checked here against mathjs's own derivative of the
 * function the question shows, never against the generator's hand-worked
 * coefficients, which would only prove the generator agrees with itself.
 *
 * As in `stationaryPoints.test.ts`, every answer is read back off the rendered
 * slide — the value typed, the tiles placed, the option marked correct — so a
 * slip anywhere between the sampled numbers and what the learner is graded on
 * fails here.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import { valueOf } from '../expr';
import type { Generator, Slide } from '../types';
import {
  ROUND_SOURCES,
  linkX,
  peakCoefficients,
  polyInAnswer,
  rateGenerators as g,
  sliderRate,
  smallChangeSource,
  type BlockBackParams,
  type BlockParams,
  type LinkParams,
  type MethodParams,
  type PeakParams,
  type RateAtParams,
  type RateFnParams,
  type RateSignParams,
  type RateSliderParams,
  type RoundParams,
  type ShapeFlowParams,
  type SmallChangeParams,
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
  const f = math.parse(source);
  const first = math.derivative(f, variable);
  const second = math.derivative(first, variable);
  const at =
    (node: { evaluate(scope: object): unknown }): Fn =>
    (value) =>
      node.evaluate({ [variable]: value }) as number;
  return { f: at(f), first: at(first), second: at(second), firstText: first.toString() };
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return slide.answer;
};

const placed = (slide: Slide): string[] => {
  if (slide.kind !== 'tiles') throw new Error(`expected a tiles slide, got ${slide.kind}`);
  return slide.answer;
};

/** A tile such as `24\pi` or `\pi` as its multiple of π. */
const piMultiple = (tile: string): number => {
  const match = /^(-?\d*)\\pi$/.exec(tile);
  if (!match) throw new Error(`not a multiple of pi: ${tile}`);
  return match[1] === '' ? 1 : match[1] === '-' ? -1 : Number(match[1]);
};

/** The cube, square and box of `df-rc-chain-tiles` and `df-rc-block-back`, in mathjs. */
const BLOCK_SOURCES = ['x^3', '6*x^2', 'x^2', '2*x^3'];

describe('rates of change, checked against mathjs', { timeout: 60_000 }, () => {
  it('df-rc-rate-fn asks for the derivative in t', () => {
    for (const { params, slide, seed } of draws(g.rateFunction as Generator<RateFnParams>)) {
      const { firstText } = calculus(polyInAnswer(params.coefficients), 't');
      const verdict = checkAnswer(typed(slide), firstText, { domain: 'real', mode: 'exact', seed });
      expect(verdict.status, `d/dt(${polyInAnswer(params.coefficients)}) is ${firstText}`).toBe('correct');
    }
  });

  it('df-rc-rate-at gives the derivative at the moment asked, not the amount', () => {
    for (const { params, slide } of draws(g.rateAt as Generator<RateAtParams>)) {
      const { first } = calculus(polyInAnswer(params.coefficients), 't');
      expect(Number(typed(slide))).toBeCloseTo(first(params.at), 9);
    }
  });

  it('df-rc-read-units marks the rate, in a unit per unit of time', () => {
    for (const { params, slide } of draws(g.readUnits as Generator<RateAtParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { first } = calculus(polyInAnswer(params.coefficients), 't');
      const right = slide.options.find((option) => option.id === slide.correctId)!;
      expect(right.label.startsWith(`${first(params.at)}\\,`), right.label).toBe(true);
      expect(right.label).toContain('\\text{ per ');
    }
  });

  it('df-rc-rate-slider lands on the one moment the rate is what the prompt says', () => {
    for (const { params, slide } of draws(g.rateSlider as Generator<RateSliderParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const { p, q, c } = params;
      const { first } = calculus(polyInAnswer([p, q, c]), 't');
      const target = sliderRate(params);
      expect(close(first(slide.answer), target), `rate at t = ${slide.answer}`).toBe(true);
      // Nowhere else on the track reaches the same rate.
      for (let t = slide.min; t <= slide.max; t += slide.step) {
        if (t !== slide.answer) expect(close(first(t), target), `also at t = ${t}`).toBe(false);
      }
    }
  });

  it('df-rc-chain-tiles places dQ/dx, dx/dt and their product', () => {
    for (const { params, slide } of draws(g.chainTiles as Generator<BlockParams>)) {
      const { first } = calculus(BLOCK_SOURCES[params.shape], 'x');
      const [gradient, rate, product] = placed(slide).map(Number);
      expect(gradient).toBe(first(params.s));
      expect(rate).toBe(params.r);
      expect(product).toBe(first(params.s) * params.r);
    }
  });

  it('df-rc-block-back divides the known rate by dQ/dx', () => {
    for (const { params, slide } of draws(g.blockBack as Generator<BlockBackParams>)) {
      if (slide.kind !== 'reduce') throw new Error('expected reduce');
      const { first } = calculus(BLOCK_SOURCES[params.shape], 'x');
      // The rate the prompt states, read off the prompt itself.
      const prose = slide.prompt[0].kind === 'prose' ? slide.prompt[0].text : '';
      const known = Number(/growing at \$(\d+)\$/.exec(prose)![1]);
      expect(valueOf(slide.expr)).toBeCloseTo(known / first(params.s), 9);
    }
  });

  it('df-rc-link-tree evaluates dy/dx at x, not at t', () => {
    for (const { params, slide } of draws(g.linkTree as Generator<LinkParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      // y as a function of t, differentiated in one go: the chain rule's answer
      // without the chain rule.
      const y = `(${params.k}) * (${linkX(params)})^${params.n}`;
      const { first } = calculus(y, 't');
      const [, , , dydt] = slide.answer.map(Number);
      expect(dydt).toBeCloseTo(first(params.at), 9);
    }
  });

  it('df-rc-shape-k and df-rc-shape-back agree with the formula differentiated', () => {
    for (const { params, slide } of draws(g.shapeK as Generator<RoundParams>)) {
      const variable = params.shape === 4 ? 'h' : 'r';
      const { first } = calculus(ROUND_SOURCES[params.shape], variable);
      expect(Number(typed(slide)) * Math.PI).toBeCloseTo(first(params.s) * params.rate, 6);
    }
    for (const { params, slide } of draws(g.shapeBack as Generator<RoundParams>)) {
      const variable = params.shape === 4 ? 'h' : 'r';
      const { first } = calculus(ROUND_SOURCES[params.shape], variable);
      const [known, gradient, rate] = placed(slide);
      expect(piMultiple(gradient) * Math.PI).toBeCloseTo(first(params.s), 6);
      expect(Number(rate)).toBeCloseTo((piMultiple(known) * Math.PI) / first(params.s), 9);
      expect(Number(rate)).toBe(params.rate);
    }
  });

  it('df-rc-shape-flow walks to the derivative and its value at that size', () => {
    for (const { params, slide } of draws(g.shapeFlow as Generator<ShapeFlowParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const variable = params.shape === 4 ? 'h' : 'r';
      const { first } = calculus(ROUND_SOURCES[params.shape], variable);
      const value = slide.answer[1].replaceAll('$', '');
      expect(piMultiple(value) * Math.PI).toBeCloseTo(first(params.s), 6);
    }
  });

  it('df-rc-sign reads the sign of the derivative', () => {
    for (const { params, slide } of draws(g.rateSign as Generator<RateSignParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { first } = calculus(polyInAnswer(peakCoefficients(params)), 't');
      const rate = first(params.at);
      const expected = Math.abs(rate) < 1e-9 ? 'still' : rate > 0 ? 'up' : 'down';
      expect(slide.correctId).toBe(expected);
    }
  });

  it('df-rc-peak-tiles places where the rate falls to zero and where it peaks', () => {
    for (const { params, slide } of draws(g.peakTiles as Generator<PeakParams>)) {
      const { first, second } = calculus(polyInAnswer(peakCoefficients(params)), 't');
      const [stops, fastest] = placed(slide).map(Number);
      expect(close(first(stops), 0), 'rate is zero where it stops').toBe(true);
      expect(first(stops - 0.25) > 0, 'and was increasing just before').toBe(true);
      expect(close(second(fastest), 0), 'rate is flat where it peaks').toBe(true);
      expect(first(fastest)).toBeGreaterThan(first(fastest - 0.5));
      expect(first(fastest)).toBeGreaterThan(first(fastest + 0.5));
    }
  });

  it('df-rc-method-flow asks about a quantity that really rises then stops', () => {
    for (const { params } of draws(g.methodFlow as Generator<MethodParams>)) {
      const { first } = calculus(polyInAnswer(peakCoefficients(params)), 't');
      // The "stop increasing" and "increasing fastest" questions only make
      // sense if the quantity is increasing at the time the question names.
      expect(first(params.at)).toBeGreaterThan(0);
    }
  });

  it('df-rc-small-change estimates with the gradient at the start', () => {
    for (const { params, slide } of draws(g.smallChange as Generator<SmallChangeParams>)) {
      const { first } = calculus(smallChangeSource(params), 'x');
      expect(Number(typed(slide))).toBeCloseTo(first(params.a) * (params.dh / 100), 9);
    }
  });
});
