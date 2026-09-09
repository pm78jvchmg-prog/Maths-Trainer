/**
 * Property tests for the generators.
 *
 * A generator is a small program that writes questions, so a bug in one does
 * not show up as a crash — it shows up as a question that is impossible to
 * answer correctly, halfway through a lesson on a train. These run every
 * generator across many seeds and assert that the answer it claims is genuinely
 * accepted by the checker that will grade it.
 */
import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { parseExpression, math } from '../../engine/expression';
import { allGenerators, registry } from '../registry';
import { courses } from '../courses';
import { TRIPLES } from './complexPlane';
import type { Generator } from '../types';

const SEEDS = 200;
const DIFFICULTIES = [1, 2];

describe.each(allGenerators.map((g) => [g.id, g] as const))('%s', (_id, generator) => {
  const cases = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = (generator as Generator<unknown>).sample(makeRng(seed), difficulty);
      return { params, difficulty, seed };
    }),
  );

  it('renders a well-formed slide for every seed', () => {
    for (const { params } of cases) {
      const slide = (generator as Generator<unknown>).render(params);

      if (slide.kind === 'choice') {
        expect(slide.options.length).toBeGreaterThanOrEqual(2);
        const ids = slide.options.map((o) => o.id);
        expect(ids).toContain(slide.correctId);
        // Duplicate options would let a learner pick "the right one" twice.
        expect(new Set(ids).size).toBe(ids.length);
      }

      if (slide.kind === 'tiles') {
        expect(slide.answer.length).toBeGreaterThan(0);
        // Every token the answer needs must actually be on offer.
        const bank = [...slide.bank];
        for (const token of slide.answer) {
          const at = bank.indexOf(token);
          expect(at, `token ${token} missing from bank`).toBeGreaterThanOrEqual(0);
          bank.splice(at, 1);
        }
      }

      if (slide.kind === 'plot') {
        expect(Number.isInteger(slide.answer.re)).toBe(true);
        expect(Number.isInteger(slide.answer.im)).toBe(true);
        // The target must be reachable on the grid the widget draws.
        expect(Math.abs(slide.answer.re)).toBeLessThanOrEqual(slide.range);
        expect(Math.abs(slide.answer.im)).toBeLessThanOrEqual(slide.range);
      }

      if (slide.kind === 'expression') {
        expect(parseExpression(slide.answer).ok, `unparseable answer: ${slide.answer}`).toBe(true);
        expect(slide.lead).toBeTruthy();
      }
    }
  });

  it('produces an answer its own checker accepts', () => {
    for (const { params, seed } of cases) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression') continue;

      const verdict = checkAnswer(slide.answer, slide.answer, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(verdict.status, `seed ${seed}: ${slide.answer}`).toBe('correct');
    }
  });

  it('rejects a perturbed answer', () => {
    for (const { params, seed } of cases) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression') continue;

      const verdict = checkAnswer(`(${slide.answer}) + 1`, slide.answer, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(verdict.status, `seed ${seed}: ${slide.answer}`).toBe('incorrect');
    }
  });

  it("matches an independent symbolic derivative, where the generator declares its source", () => {
    // The other property tests only prove a generator agrees with itself: they
    // would happily pass a question whose stated answer is the wrong
    // derivative. This differentiates the source function with mathjs — an
    // oracle written by someone else — and checks the generator's answer
    // against it. A sign slip or a missed chain-rule factor fails here.
    for (const { params, seed } of cases) {
      const slide = (generator as Generator<unknown>).render(params);
      if (slide.kind !== 'expression' || !slide.source) continue;

      const oracle = math.derivative(slide.source, 'x').toString();
      const verdict = checkAnswer(slide.answer, oracle, {
        domain: slide.domain,
        mode: slide.mode,
        seed,
      });
      expect(
        verdict.status,
        `seed ${seed}: d/dx(${slide.source}) is ${oracle}, generator claims ${slide.answer}`,
      ).toBe('correct');
    }
  });

  it('always offers a worked solution', () => {
    for (const { params } of cases) {
      const steps = (generator as Generator<unknown>).solution(params);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(step.text ?? step.tex).toBeTruthy();
      }
    }
  });

  it('varies its worked solution with the question', () => {
    // The reason render and solution share parameters is so the steps describe
    // the learner's actual numbers. A solution that reads the same regardless
    // of the question would be a generic explanation, which is far less useful
    // when you have just got something wrong.
    const texts = new Set(
      cases.slice(0, 60).map(({ params }) =>
        (generator as Generator<unknown>)
          .solution(params)
          .map((step) => `${step.text ?? ''} ${step.tex ?? ''}`)
          .join(' '),
      ),
    );
    expect(texts.size).toBeGreaterThan(1);
  });
});

describe('course integrity', () => {
  // Every course, so a new one cannot skip these checks by existing.
  const lessons = courses.flatMap((course) =>
    course.levels.flatMap((level) => level.lessons),
  );

  it('references only generators that exist', () => {
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type === 'generated') {
          expect(registry[ref.generatorId], `${lesson.id} -> ${ref.generatorId}`).toBeDefined();
        }
      }
    }
  });

  it('gives every lesson about ten guided slides and three skill checks', () => {
    for (const lesson of lessons) {
      expect(lesson.slides.length, lesson.id).toBeGreaterThanOrEqual(9);
      expect(lesson.slides.length, lesson.id).toBeLessThanOrEqual(11);
      expect(lesson.skillCheck.length, lesson.id).toBe(3);
    }
  });

  it('opens each lesson by teaching before asking', () => {
    for (const lesson of lessons) {
      const first = lesson.slides[0];
      expect(first.type, lesson.id).toBe('literal');
      if (first.type === 'literal') expect(first.slide.kind).toBe('teach');
    }
  });

  it('never puts a teaching slide in a skill check', () => {
    for (const lesson of lessons) {
      for (const ref of lesson.skillCheck) {
        if (ref.type === 'literal') expect(ref.slide.kind).not.toBe('teach');
      }
    }
  });

  /**
   * Every authored TeX fragment: display blocks, plus the $...$ segments inside
   * prose. Ordinary English is deliberately excluded — a sentence containing
   * the word "times" is not a broken \times command.
   */
  const texFragments = (): { tex: string; where: string }[] => {
    const out: { tex: string; where: string }[] = [];
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind === 'display') {
            out.push({ tex: block.tex, where: `${lesson.id} display` });
          }
          if (block.kind === 'prose') {
            // Odd indices of a split on $...$ are the inline maths segments.
            block.text
              .split(/\$([^$]+)\$/g)
              .filter((_, idx) => idx % 2 === 1)
              .forEach((tex) => out.push({ tex, where: `${lesson.id} inline` }));
          }
        }
      }
    }
    return out;
  };

  it('renders every authored TeX fragment without error', () => {
    // Asks the real question — is this valid TeX — so it covers every command,
    // present and future, rather than a list someone must remember to extend.
    const fragments = texFragments();
    expect(fragments.length).toBeGreaterThan(0);
    for (const { tex, where } of fragments) {
      expect(
        () => katex.renderToString(tex, { throwOnError: true, strict: 'error' }),
        `${where}: ${tex}`,
      ).not.toThrow();
    }
  });

  it('never lets a TeX command lose its backslash', () => {
    // Kept alongside the KaTeX check, which does NOT cover this: a
    // backslash-stripped command like "overline{3 + 4i}" is perfectly valid TeX
    // — it renders the literal letters — so KaTeX raises nothing and the learner
    // just sees a wrong slide. Only a name check catches it, and it is applied
    // to TeX fragments alone so English prose is never scanned.
    const COMMANDS =
      /(?<!\\)\b(qquad|quad|overline|dfrac|tfrac|frac|sqrt|cdot|times|pm|geq|leq|rightarrow|implies|arg|sin|cos|tan|ln|pi|text|left|right)\b/;

    for (const { tex, where } of texFragments()) {
      expect(COMMANDS.test(tex), `${where}: bare TeX command in ${tex}`).toBe(false);
    }
  });

  it('never leaves a raw escape sequence in prose', () => {
    // The sibling failure, outside TeX: '\\u2019' in source reaches the reader
    // as the literal text "’" rather than an apostrophe.
    for (const lesson of lessons) {
      for (const ref of [...lesson.slides, ...lesson.skillCheck]) {
        if (ref.type !== 'literal') continue;
        const blocks = ref.slide.kind === 'teach' ? ref.slide.body : ref.slide.prompt;
        for (const block of blocks) {
          if (block.kind !== 'prose') continue;
          expect(block.text, lesson.id).not.toMatch(/\\u[0-9a-fA-F]{4}/);
        }
      }
    }
  });

  it('holds a genuine Pythagorean triple in every modulus row', () => {
    // The modulus generator reads its answer straight from this table instead
    // of rounding Math.hypot. That is only safe while the table is honest, so
    // the invariant is asserted rather than assumed.
    expect(TRIPLES.length).toBeGreaterThan(0);
    for (const [a, b, c] of TRIPLES) {
      expect(a * a + b * b, `${a},${b},${c} is not a triple`).toBe(c * c);
    }
  });

  it('uses unique lesson ids', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
