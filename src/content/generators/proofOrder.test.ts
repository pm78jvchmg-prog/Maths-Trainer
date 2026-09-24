/**
 * The proof-ordering generators, graded through the session reducer.
 *
 * The generic sweep in `generators.test.ts` checks every `order` slide is well
 * formed. This checks what the grader makes of it: that the proof the
 * generator claims is the only arrangement accepted, from the same
 * `startSession` and `submit` a learner goes through.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { currentSlide, reduce, startSession, type Session } from '../../engine/session';
import type { Generator, GeneratorRegistry, Lesson, Slide } from '../types';
import { orderBank, proofOrderGenerators } from './proofOrder';
import { numberProofOrders } from './numberProof';
import { numberDivisibilityOrders } from './numberDivisibility';
import { numberEuclidOrders } from './numberEuclid';
import { coordinateGeometryOrders } from './coordinateGeometry';

type OrderSlide = Extract<Slide, { kind: 'order' }>;

const SEEDS = 60;
const DIFFICULTIES = [1, 2];

// Every order generator in the library, the demos, the Number & Proof
// course's own and Coordinate Geometry's, so each one's proofs are graded the
// way a learner's are.
const orderGenerators = [
  ...proofOrderGenerators,
  ...numberProofOrders,
  ...numberDivisibilityOrders,
  ...numberEuclidOrders,
  ...coordinateGeometryOrders,
] as Generator<unknown>[];

const registry: GeneratorRegistry = Object.fromEntries(
  orderGenerators.map((g) => [g.id, g as unknown as Generator<never>]),
);

/** A one-question lesson asking this generator, opened at `seed`. */
function open(id: string, difficulty: number, seed: number): { session: Session; slide: OrderSlide } {
  const lesson: Lesson = {
    id: `proof-${id}`,
    title: 'Proof',
    slides: [{ type: 'generated', generatorId: id, difficulty }],
    skillCheck: [],
  };
  const session = startSession(lesson, registry, seed);
  const slide = currentSlide(session)?.slide;
  if (slide?.kind !== 'order') throw new Error(`${id} did not render an order slide`);
  return { session, slide };
}

function verdict(session: Session, answer: string[]): string {
  return reduce(session, { type: 'submit', answer }).feedback.kind;
}

describe.each(orderGenerators.map((g) => [g.id] as const))('%s', (id) => {
  const draws = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({ difficulty, seed, ...open(id, difficulty, seed) })),
  );

  it('grades the empty draft incorrect', () => {
    for (const { session } of draws) expect(verdict(session, [])).toBe('incorrect');
  });

  it("grades the generator's own proof correct", () => {
    for (const { session, slide, seed } of draws) {
      expect(verdict(session, slide.answer), `seed ${seed}`).toBe('correct');
    }
  });

  it('grades every adjacent swap incorrect', () => {
    for (const { session, slide, seed } of draws) {
      for (let i = 0; i + 1 < slide.answer.length; i += 1) {
        const swapped = [...slide.answer];
        [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
        expect(verdict(session, swapped), `seed ${seed}: swapped ${i} and ${i + 1}`).toBe('incorrect');
      }
    }
  });

  it('grades a distractor in any slot incorrect', () => {
    for (const { session, slide, seed } of draws) {
      const distractors = slide.steps.filter((step) => !slide.answer.includes(step.id));
      for (const distractor of distractors) {
        for (let i = 0; i < slide.answer.length; i += 1) {
          const answer = [...slide.answer];
          answer[i] = distractor.id;
          expect(verdict(session, answer), `seed ${seed}: distractor in slot ${i}`).toBe('incorrect');
        }
      }
    }
  });

  it('grades a proof one step short incorrect', () => {
    for (const { session, slide } of draws) {
      expect(verdict(session, slide.answer.slice(0, -1))).toBe('incorrect');
    }
  });

  it('never shows the bank in the order of the answer', () => {
    for (const { slide, seed } of draws) {
      const positions = slide.answer.map((answerId) =>
        slide.steps.findIndex((step) => step.id === answerId),
      );
      const ascending = positions.every((at, idx) => idx === 0 || at > positions[idx - 1]);
      expect(ascending, `seed ${seed}: the bank reads as the proof`).toBe(false);
    }
  });

  it('offers every answer step exactly once, beside the distractors its difficulty asks for', () => {
    for (const { slide, difficulty, seed } of draws) {
      const ids = slide.steps.map((step) => step.id);
      expect(new Set(ids).size, `seed ${seed}: duplicate id`).toBe(ids.length);
      const texts = slide.steps.map((step) => step.text);
      expect(new Set(texts).size, `seed ${seed}: two steps read the same`).toBe(texts.length);
      for (const answerId of slide.answer) {
        expect(ids.filter((other) => other === answerId), `seed ${seed}: ${answerId}`).toHaveLength(1);
      }
      expect(new Set(slide.answer).size).toBe(slide.answer.length);

      const distractors = ids.length - slide.answer.length;
      expect(distractors).toBeGreaterThanOrEqual(1);
      // Difficulty 1: four or five steps and one distractor; 2: five or six and two.
      expect(distractors, `seed ${seed}`).toBe(difficulty >= 2 ? 2 : 1);
      const [low, high] = difficulty >= 2 ? [5, 6] : [4, 5];
      expect(slide.answer.length, `seed ${seed}`).toBeGreaterThanOrEqual(low);
      expect(slide.answer.length, `seed ${seed}`).toBeLessThanOrEqual(high);
    }
  });

  it('renders the same slide from the same seed', () => {
    const generator = orderGenerators.find((g) => g.id === id) as Generator<unknown>;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const once = generator.render(generator.sample(makeRng(seed), difficulty));
        const twice = generator.render(generator.sample(makeRng(seed), difficulty));
        expect(twice).toEqual(once);
      }
    }
  });
});

describe('orderBank', () => {
  it('reverses a bank that would otherwise read as the proof', () => {
    // Search for a proof whose hashed order happens to match: the case the
    // reversal exists for, which a random draw only meets now and then.
    for (let n = 0; n < 200; n += 1) {
      const proof = [`step a${n}`, `step b${n}`, `step c${n}`];
      const { steps, answer } = orderBank(proof, [`spare ${n}`]);
      const positions = answer.map((a) => steps.findIndex((s) => s.id === a));
      expect(positions.every((at, idx) => idx === 0 || at > positions[idx - 1])).toBe(false);
    }
  });
});
