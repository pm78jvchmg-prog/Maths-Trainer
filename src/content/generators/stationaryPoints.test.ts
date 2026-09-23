/**
 * An independent check on the calculus behind the stationary-points level.
 *
 * The oracle in `generators.test.ts` differentiates a question's `source` and
 * compares it with the answer, which only works when the answer *is* a
 * derivative. Almost nothing in this level answers with one: it asks where a
 * curve is flat, how high it is there, which way it bends, and what kind of
 * point it has. Every one of those is a claim about the function a question
 * shows, so each is checked here against mathjs's own derivative of that
 * function — never against the generator's hand-worked coefficients, which
 * would only prove the generator agrees with itself.
 *
 * Each generator's slide is rendered and its stated answer read back off it:
 * the tiles placed, the option marked correct, the path through a flow. So a
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
  cubicSource,
  extremumOf,
  factoredDerivative,
  inflectionAnswer,
  inflectionFlowFunction,
  inflectionFunction,
  natureFunction,
  pointOf,
  secondDerivativeFunction,
  signDerivative,
  stationaryPointGenerators as g,
  type AtParams,
  type CountParams,
  type CubicPoint,
  type Cubic,
  type FactoredParams,
  type InflectionFlowParams,
  type InflectionParams,
  type IntervalParams,
  type NatureParams,
  type SecondParams,
  type SignParams,
  type SliderPointParams,
  type SymmetricParams,
} from './differentiation';

const SEEDS = 200;

/** Every draw of a generator at both difficulties, with the slide it renders. */
function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

/** f, f' and f'' of a mathjs source, as plain functions of x. */
function calculus(source: string) {
  const f = math.parse(source);
  const first = math.derivative(f, 'x');
  const second = math.derivative(first, 'x');
  const at = (node: { evaluate(scope: object): unknown }) => (x: number) => node.evaluate({ x }) as number;
  return { f: at(f), first: at(first), second: at(second) };
}

const isZero = (value: number) => Math.abs(value) < 1e-9;
const sign = (value: number) => (isZero(value) ? 0 : Math.sign(value));

/** How far either side of a point to look for a change of sign. No root in these questions is closer. */
const NEAR = 0.25;

/** What the sign of the gradient either side says about a stationary point. */
function natureBySigns(first: (x: number) => number, at: number): 'max' | 'min' | 'inflection' {
  const before = sign(first(at - NEAR));
  const after = sign(first(at + NEAR));
  if (before > 0 && after < 0) return 'max';
  if (before < 0 && after > 0) return 'min';
  return 'inflection';
}

const chosen = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.correctId;
};

const placed = (slide: Slide): string[] => {
  if (slide.kind !== 'tiles') throw new Error(`expected a tiles slide, got ${slide.kind}`);
  return slide.answer;
};

// Symbolic differentiation of every draw takes about two seconds a test, which
// overruns vitest's 5s default once the other files compete for the CPU. The
// budget is raised rather than the draws cut, as for the oracle in
// `generators.test.ts`.
describe('stationary points, checked against mathjs', { timeout: 60_000 }, () => {
  it('df-sp-roots places exactly the points where the gradient is zero', () => {
    for (const { params, slide } of draws(g.stationaryRoots as Generator<Cubic>)) {
      const { first } = calculus(cubicSource(params));
      const roots = placed(slide).map(Number);
      expect(new Set(roots).size, 'two different points').toBe(2);
      for (const x of roots) expect(isZero(first(x)), `f'(${x}) for ${cubicSource(params)}`).toBe(true);
    }
  });

  it('df-sp-y reduces to the height of the curve at a flat point', () => {
    for (const { params, slide } of draws(g.stationaryY as Generator<CubicPoint>)) {
      if (slide.kind !== 'reduce') throw new Error('expected reduce');
      const { f, first } = calculus(cubicSource(params.cubic));
      const s = pointOf(params);
      expect(isZero(first(s)), `x = ${s} is not stationary`).toBe(true);
      expect(valueOf(slide.expr)).toBeCloseTo(f(s), 9);
    }
  });

  it('df-sp-y-tree ends on the height of the curve at a flat point', () => {
    for (const { params, slide } of draws(g.stationaryYTree as Generator<SymmetricParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { m, r, d, left } = params;
      // Written out from the prompt's own description, not from the generator.
      const { f, first } = calculus(`${m} * x^3 - 3 * ${m} * ${r}^2 * x + ${d}`);
      const s = left ? -r : r;
      expect(isZero(first(s))).toBe(true);
      expect(Number(slide.answer[slide.answer.length - 1])).toBeCloseTo(f(s), 9);
    }
  });

  it('df-sp-slider rests on the turning point it names', () => {
    for (const { params, slide } of draws(g.stationarySliderCubic as Generator<SliderPointParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const { first, second } = calculus(cubicSource(params.cubic));
      expect(slide.answer).toBe(extremumOf(params));
      expect(isZero(first(slide.answer))).toBe(true);
      expect(sign(second(slide.answer))).toBe(params.want === 'max' ? -1 : 1);
    }
  });

  it('df-sp-count counts the real roots of the derivative', () => {
    for (const { params, slide } of draws(g.stationaryCount as Generator<CountParams>)) {
      const { a, b, c, d } = params;
      const { first } = calculus(`${a} * x^3 + ${b} * x^2 + ${c} * x + ${d}`);
      // f' is a quadratic: read its coefficients back off three values.
      const c0 = first(0);
      const c2 = (first(1) + first(-1)) / 2 - c0;
      const c1 = (first(1) - first(-1)) / 2;
      const discriminant = c1 * c1 - 4 * c2 * c0;
      const count = isZero(discriminant) ? 1 : discriminant > 0 ? 2 : 0;
      expect(chosen(slide)).toBe(`n${count}`);
    }
  });

  it('df-second-derivative is the original function differentiated twice', () => {
    for (const { params, slide, seed } of draws(g.secondDerivative as Generator<SecondParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const source = secondDerivativeFunction(params);
      const oracle = math.derivative(math.derivative(source, 'x'), 'x').toString();
      expect(
        checkAnswer(slide.answer, oracle, { domain: slide.domain, mode: slide.mode, seed }).status,
        `d2/dx2(${source}) is ${oracle}, generator claims ${slide.answer}`,
      ).toBe('correct');
    }
  });

  it('df-second-at is the second derivative at a flat point', () => {
    for (const { params, slide } of draws(g.secondAt as Generator<CubicPoint>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { first, second } = calculus(cubicSource(params.cubic));
      const s = pointOf(params);
      expect(isZero(first(s))).toBe(true);
      expect(Number(slide.answer)).toBeCloseTo(second(s), 9);
    }
  });

  it('df-nature-flow follows the path the derivatives call for', () => {
    for (const { params, slide } of draws(g.natureFlow as Generator<NatureParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { source, at } = natureFunction(params);
      const { first, second } = calculus(source);
      let expected: string[];
      if (!isZero(first(at))) expected = ['No'];
      else if (sign(second(at)) < 0) expected = ['Yes', 'Negative'];
      else if (sign(second(at)) > 0) expected = ['Yes', 'Positive'];
      else {
        const nature = natureBySigns(first, at);
        expected = [
          'Yes',
          'Zero',
          nature === 'max'
            ? 'Positive to negative'
            : nature === 'min'
              ? 'Negative to positive'
              : 'It does not change',
        ];
      }
      expect(slide.answer, `${source} at x = ${at}`).toEqual(expected);
    }
  });

  it('df-sign-tiles reads the signs either side and the verdict they give', () => {
    for (const { params, slide } of draws(g.signTiles as Generator<SignParams>)) {
      const node = math.parse(signDerivative(params));
      const gradient = (x: number) => node.evaluate({ x }) as number;
      const { r } = params;
      expect(isZero(gradient(r))).toBe(true);
      const before = sign(gradient(r - 1));
      const after = sign(gradient(r + 1));
      // The test points must see the same sign as the point just beside r,
      // or the question is testing the wrong part of the curve.
      expect(before).toBe(sign(gradient(r - NEAR)));
      expect(after).toBe(sign(gradient(r + NEAR)));
      const verdict =
        before > 0 && after < 0 ? 'maximum' : before < 0 && after > 0 ? 'minimum' : 'inflection';
      expect(placed(slide)).toEqual([
        before > 0 ? '+' : '-',
        after > 0 ? '+' : '-',
        `\\text{${verdict}}`,
      ]);
    }
  });

  it('df-factored-nature names the point the gradient signs describe', () => {
    for (const { params, slide } of draws(g.factoredNature as Generator<FactoredParams>)) {
      const node = math.parse(factoredDerivative(params));
      const gradient = (x: number) => node.evaluate({ x }) as number;
      expect(isZero(gradient(params.r))).toBe(true);
      expect(chosen(slide)).toBe(natureBySigns(gradient, params.r));
    }
  });

  it('df-increasing-at is the sign of the gradient', () => {
    for (const { params, slide } of draws(g.increasingAt as Generator<AtParams>)) {
      const { first } = calculus(cubicSource(params.cubic));
      const s = sign(first(params.t));
      expect(chosen(slide)).toBe(s > 0 ? 'up' : s < 0 ? 'down' : 'flat');
    }
  });

  it('df-increasing-tiles bounds exactly the stretch it asks about', () => {
    for (const { params, slide } of draws(g.increasingTiles as Generator<IntervalParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { first } = calculus(cubicSource(params.cubic));
      const [lo, hi] = placed(slide).map(Number);
      expect(lo).toBeLessThan(hi);
      expect(isZero(first(lo)) && isZero(first(hi))).toBe(true);
      const between = slide.template.startsWith('{0} < x');
      const want = params.ask === 'increasing' ? 1 : -1;
      // Inside the stretch the template describes, the gradient has the asked-for sign.
      const inside = between ? [(lo + hi) / 2] : [lo - 1, hi + 1];
      for (const x of inside) expect(sign(first(x)), `f'(${x})`).toBe(want);
      const outside = between ? [lo - 1, hi + 1] : [(lo + hi) / 2];
      for (const x of outside) expect(sign(first(x)), `f'(${x})`).toBe(-want);
    }
  });

  it('df-inflection-x is where the second derivative is zero and changes sign', () => {
    for (const { params, slide } of draws(g.inflectionX as Generator<InflectionParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { second } = calculus(inflectionFunction(params));
      const x = Number(slide.answer);
      expect(x).toBe(inflectionAnswer(params));
      expect(isZero(second(x))).toBe(true);
      expect(sign(second(x - NEAR)) * sign(second(x + NEAR))).toBe(-1);
      if (params.form === 'quartic') {
        // The point the prompt gives away must be genuine too.
        expect(isZero(second(params.r))).toBe(true);
        expect(params.r).not.toBe(x);
      }
    }
  });

  it('df-concavity is the sign of the second derivative', () => {
    for (const { params, slide } of draws(g.concavity as Generator<AtParams>)) {
      const { second } = calculus(cubicSource(params.cubic));
      const s = sign(second(params.t));
      expect(chosen(slide)).toBe(s > 0 ? 'convex' : s < 0 ? 'concave' : 'neither');
    }
  });

  it('df-inflection-flow follows the path the derivatives call for', () => {
    for (const { params, slide } of draws(g.inflectionFlow as Generator<InflectionFlowParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { source, at } = inflectionFlowFunction(params);
      const { first, second } = calculus(source);
      let expected: string[];
      if (!isZero(second(at))) expected = ['No'];
      else if (sign(second(at - NEAR)) === sign(second(at + NEAR))) expected = ['Yes', 'No'];
      else expected = ['Yes', 'Yes', isZero(first(at)) ? 'Yes' : 'No'];
      expect(slide.answer, `${source} at x = ${at}`).toEqual(expected);
    }
  });
});
