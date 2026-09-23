/**
 * An independent check on the Rearranging Formulae level.
 *
 * The generic tests in `generators.test.ts` prove a generator's answer agrees
 * with itself. They would pass a question whose stated rearrangement is
 * wrong. So each typed rearrangement is checked against the formula it came
 * from: the answer is put back in place of the subject, and the formula's two
 * sides must still agree at random values of every other letter. Nothing the
 * generator worked out by hand is trusted — only the formula as shown.
 *
 * Then each typed generator is played through `startSession` and `submit` at
 * both difficulties, with the answer spelled the way the keypad spells it —
 * every letter bracketed, products written side by side — so a correct answer typed on the
 * phone is proven to grade correct, not merely the generator's own string.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Lesson } from '../types';
import { rearrangements, type Formula } from './linearEquations';

const SEEDS = 200;

function draws(id: string) {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      difficulty,
      seed,
      params: generator.sample(makeRng(seed), difficulty),
      generator,
    })),
  );
}

type Value = number | { re: number; im: number };

function size(value: Value): number {
  return typeof value === 'number' ? Math.abs(value) : Math.hypot(value.re, value.im);
}

/** The keypad's spelling: every letter and π bracketed, products implicit. */
function asTyped(answer: string): string {
  return answer
    .replace(/(?<![A-Za-z])([A-Za-z]|pi)(?![A-Za-z])/g, '($1)')
    .replace(/\*(?=\s*\()/g, '');
}

describe.each(Object.keys(rearrangements))('%s', (id) => {
  const build = rearrangements[id] as (params: unknown) => Formula;

  it('rearranges the formula it shows: the answer put back in balances it', () => {
    const rng = makeRng(`oracle-${id}`);
    for (const { params, seed, difficulty } of draws(id)) {
      const f = build(params);
      const slide = registry[id].render(params as never);
      if (slide.kind !== 'expression') throw new Error(`${id} is not typed`);
      expect(slide.answer, `seed ${seed}`).toBe(f.answer);

      const positive = slide.domain === 'positive';
      const others = f.letters.filter((letter) => letter !== f.subject);
      const output = /^([A-Za-z])(\^2)?$/.exec(f.left);
      if (positive && output) {
        // A formula with a root in it holds only where its letters are
        // positive — √s + 5 is never 3 — so run it forwards: draw the subject
        // and the rest, let the formula say what its left-hand letter is,
        // then the answer has to lead back to the subject.
        const [, out, squared] = output;
        for (let probe = 0; probe < 6; probe += 1) {
          const scope: Record<string, number> = {};
          for (const letter of f.letters) if (letter !== out) scope[letter] = rng.float(0.4, 2.5);
          const made = math.evaluate(f.right, { ...scope }) as number;
          const subject = scope[f.subject];
          const back = math.evaluate(f.answer, { ...scope, [out]: squared ? Math.sqrt(made) : made, [f.subject]: Number.NaN }) as Value;
          expect(
            size(math.subtract(back as never, subject) as unknown as Value),
            `difficulty ${difficulty}, seed ${seed}: ${f.tex}, ${f.subject} = ${f.answer} at ${JSON.stringify(scope)}`,
          ).toBeLessThan(1e-7 * Math.max(1, subject));
        }
        continue;
      }
      for (let probe = 0; probe < 6; probe += 1) {
        const scope: Record<string, number> = {};
        for (const letter of others) scope[letter] = rng.float(0.4, 2.5) * (positive ? 1 : rng.sign());
        scope[f.subject] = Number.NaN;
        const value = math.evaluate(f.answer, { ...scope }) as Value;
        const withSubject = { ...scope, [f.subject]: value };
        const left = math.evaluate(f.left, { ...withSubject }) as Value;
        const right = math.evaluate(f.right, { ...withSubject }) as Value;
        const gap = size(math.subtract(left as never, right as never) as unknown as Value);
        expect(
          gap,
          `difficulty ${difficulty}, seed ${seed}: ${f.tex}, ${f.subject} = ${f.answer} at ${JSON.stringify(scope)}`,
        ).toBeLessThan(1e-7 * Math.max(1, size(left), size(right)));
      }
    }
  });

  it('grades the answer correct when typed on the keypad, at both difficulties', () => {
    for (const { difficulty, seed } of draws(id).filter((draw) => draw.seed < 40)) {
      const lesson: Lesson = {
        id: `probe-${id}`,
        title: 'probe',
        slides: [{ type: 'generated', generatorId: id, difficulty }],
        skillCheck: [],
      };
      const session = startSession(lesson, registry, seed);
      const slide = session.guided[0].slide;
      if (slide.kind !== 'expression') throw new Error(`${id} is not typed`);
      const typed = asTyped(slide.answer);
      const after = reduce(session, { type: 'submit', answer: typed });
      expect(after.feedback.kind, `difficulty ${difficulty}, seed ${seed}: typed "${typed}" for ${slide.answer}`).toBe('correct');

      // Every letter the answer needs is on the keypad.
      const keys = new Set(slide.keypad.map((key) => key.insert.replace(/[()]/g, '')));
      for (const letter of slide.answer.match(/(?<![A-Za-z])[A-Za-z](?![A-Za-z])/g) ?? []) {
        expect(keys.has(letter), `seed ${seed}: no key for ${letter}`).toBe(true);
      }
    }
  });

  it('needs its letters bracketed: bare, mathjs reads them as one symbol or a function', () => {
    // Why the letter keys insert "(a)": "at" is one symbol and "b(l + w)" is a
    // call to a function b. Guarding the reason keeps anyone from "tidying"
    // the brackets away.
    expect(math.parse('at').type).toBe('SymbolNode');
    expect(math.parse('b(l + w)').type).toBe('FunctionNode');
    expect(math.parse('(a)(t)').type).toBe('OperatorNode');
    expect(math.parse('(b)(l + w)').type).toBe('OperatorNode');
  });
});
