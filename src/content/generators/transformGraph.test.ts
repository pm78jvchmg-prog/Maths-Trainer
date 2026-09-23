/**
 * The graph-transformation widget, graded through the real reducer.
 *
 * The generic sweep in `generators.test.ts` proves each draw is well formed.
 * These prove what a learner meets: the untouched curve is never right, the
 * generator's own answer is, a curve one step off is not, and a different
 * route to the same picture is marked right — which is the whole reason the
 * grader compares curves rather than parameters.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession, type Session } from '../../engine/session';
import type { Generator, GeneratorRegistry, Lesson, Slide } from '../types';
import {
  IDENTITY,
  encodeTransform,
  parseTransform,
  transformTex,
  type BaseCurve,
  type Transform,
  BASES,
} from '../transform';
import { transformGraphGenerators } from './transformGraph';
import { hasAnswer, initialAnswer } from '../../ui/slides';

const registry: GeneratorRegistry = Object.fromEntries(
  transformGraphGenerators.map((g) => [g.id, g as unknown as Generator<never>]),
);

/** A one-question lesson asking `generatorId`, opened straight into its question. */
function questionFrom(generatorId: string, difficulty: number, seed: number): Session {
  const lesson: Lesson = {
    id: `t-${generatorId}`,
    title: 'Transform',
    slides: [],
    skillCheck: [{ type: 'generated', generatorId, difficulty }],
  };
  return startSession(lesson, registry, seed);
}

/** The same, for a slide written out by hand. */
function questionOf(slide: Slide): Session {
  const lesson: Lesson = {
    id: 't-literal',
    title: 'Transform',
    slides: [],
    skillCheck: [{ type: 'literal', slide }],
  };
  return startSession(lesson, {}, 1);
}

function verdict(session: Session, answer: string): string {
  return reduce(session, { type: 'submit', answer }).feedback.kind;
}

function transformSlide(session: Session): Extract<Slide, { kind: 'transform' }> {
  const slide = session.skillCheck[0].slide;
  if (slide.kind !== 'transform') throw new Error('expected a transform slide');
  return slide;
}

describe.each(transformGraphGenerators.map((g) => [g.id] as const))('%s', (id) => {
  const draws = [1, 2].flatMap((difficulty) =>
    Array.from({ length: 150 }, (_, seed) => ({ difficulty, seed })),
  );

  it('marks the untouched curve wrong, and will not submit it', () => {
    for (const { difficulty, seed } of draws) {
      const session = questionFrom(id, difficulty, seed);
      const slide = transformSlide(session);
      // Nothing tapped: the draft is empty and Check is off.
      expect(initialAnswer(slide)).toBe('');
      expect(hasAnswer(slide, initialAnswer(slide))).toBe(false);
      // And if it were sent anyway, it is not an answer.
      expect(verdict(session, '')).toBe('incorrect');
      // Tapped back to where it started, it is an answer — a wrong one.
      expect(hasAnswer(slide, encodeTransform(IDENTITY))).toBe(true);
      expect(verdict(session, encodeTransform(IDENTITY)), `seed ${seed}: ${slide.answer}`).toBe(
        'incorrect',
      );
    }
  });

  it("marks the generator's own answer right", () => {
    for (const { difficulty, seed } of draws) {
      const session = questionFrom(id, difficulty, seed);
      const slide = transformSlide(session);
      expect(verdict(session, slide.answer), `seed ${seed}: ${slide.answer}`).toBe('correct');
    }
  });

  it('marks a curve one step off wrong', () => {
    for (const { difficulty, seed } of draws) {
      const session = questionFrom(id, difficulty, seed);
      const slide = transformSlide(session);
      const target = parseTransform(slide.answer)!;
      for (const off of [
        { ...target, k: target.k + 1 },
        { ...target, h: target.h + 1 },
        { ...target, fy: !target.fy },
      ]) {
        expect(verdict(session, encodeTransform(off)), `seed ${seed}: ${encodeTransform(off)}`).toBe(
          'incorrect',
        );
      }
    }
  });

  it('renders the same slide for the same seed', () => {
    const generator = transformGraphGenerators.find((g) => g.id === id)!;
    for (const { difficulty, seed } of draws) {
      const once = generator.render(generator.sample(makeRng(seed), difficulty));
      const twice = generator.render(generator.sample(makeRng(seed), difficulty));
      expect(twice).toEqual(once);
      expect(transformSlide(questionFrom(id, difficulty, seed))).toEqual(
        transformSlide(questionFrom(id, difficulty, seed)),
      );
    }
  });
});

describe('a different route to the same curve', () => {
  const slideFor = (base: BaseCurve, target: Transform): Extract<Slide, { kind: 'transform' }> => ({
    kind: 'transform',
    direction: 'match',
    base,
    window: BASES[base].window,
    answer: encodeTransform(target),
    prompt: [{ kind: 'prose', text: 'Move your curve onto the shaded one.' }],
  });

  const cases: [string, BaseCurve, Partial<Transform>, Partial<Transform>][] = [
    // f(x/2) = x^2/4: twice as wide is a quarter as tall.
    ['x^2 twice as wide, as a quarter as tall', 'square', { sx: 2 }, { sy: 1 / 4 }],
    // |x| is even, so a flip left to right changes nothing.
    ['|x| moved up, and flipped left to right on the way', 'abs', { k: 1 }, { k: 1, fx: true }],
    // 2^(x - 1) = 2^x / 2.
    ['2^x moved right 1, as halved', 'exp2', { h: 1 }, { sy: 1 / 2 }],
    // sin is odd: -sin x = sin(-x).
    ['sin x flipped top to bottom, as left to right', 'sin', { fy: true }, { fx: true }],
    // 1/(x/2) = 2/x.
    ['1/x twice as wide, as twice as tall', 'recip', { sx: 2 }, { sy: 2 }],
    // x^3 is odd too, and moved down after either flip.
    ['x^3 flipped and moved down', 'cube', { fy: true, k: -2 }, { fx: true, k: -2 }],
  ];

  it.each(cases)('%s', (_name, base, target, route) => {
    const session = questionOf(slideFor(base, { ...IDENTITY, ...target }));
    expect(verdict(session, encodeTransform({ ...IDENTITY, ...route }))).toBe('correct');
    // The equivalent route is not the parameters the question was written with.
    expect(encodeTransform({ ...IDENTITY, ...route })).not.toBe(encodeTransform({ ...IDENTITY, ...target }));
  });

  it('still refuses a curve that only looks close', () => {
    // sqrt x moved right 1 against sqrt x moved right 2: the same shape with a
    // different start, which a learner eyeballing it could easily mistake.
    const session = questionOf(slideFor('sqrt', { ...IDENTITY, h: 2 }));
    expect(verdict(session, encodeTransform({ ...IDENTITY, h: 1 }))).toBe('incorrect');
    // x^2 flipped top to bottom is not x^2 flipped left to right.
    const flipped = questionOf(slideFor('square', { ...IDENTITY, fy: true }));
    expect(verdict(flipped, encodeTransform({ ...IDENTITY, fx: true }))).toBe('incorrect');
  });

  it('refuses an answer string it cannot read', () => {
    const session = questionOf(slideFor('square', { ...IDENTITY, k: 2 }));
    for (const junk of ['k=2', 'h=0,k=2,sx=1,sy=1,fx=0', 'h=0,k=2,sx=0,sy=1,fx=0,fy=0', 'nonsense']) {
      expect(verdict(session, junk), junk).toBe('incorrect');
    }
  });
});

describe('the readout', () => {
  it.each<[Partial<Transform>, string]>([
    [{}, 'y = f(x)'],
    [{ h: 2, k: 1 }, 'y = f(x - 2) + 1'],
    [{ fy: true }, 'y = -f(x)'],
    [{ sy: 2 }, 'y = 2f(x)'],
    [{ fx: true }, 'y = f(-x)'],
    [{ sx: 2 }, 'y = f(\\tfrac{1}{2}x)'],
    [{ sx: 1 / 3, h: -1 }, 'y = f(3(x + 1))'],
    [{ sy: 2, h: 3, k: 1 }, 'y = 2f(x - 3) + 1'],
    [{ sy: 1 / 2, fy: true, fx: true, k: -4 }, 'y = -\\tfrac{1}{2}f(-x) - 4'],
    [{ fx: true, h: 3 }, 'y = f(-(x - 3))'],
  ])('%o reads %s', (t, tex) => {
    expect(transformTex({ ...IDENTITY, ...t })).toBe(tex);
  });

  it('writes an answer that reads back as the same transformation', () => {
    const t: Transform = { h: -3, k: 4, sx: 1 / 3, sy: 4, fx: true, fy: false };
    expect(encodeTransform(t)).toBe('h=-3,k=4,sx=1/3,sy=4,fx=1,fy=0');
    expect(parseTransform(encodeTransform(t))).toEqual(t);
  });
});
