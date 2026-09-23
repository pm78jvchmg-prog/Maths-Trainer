/**
 * The `table` widget's demonstration generators, checked end to end.
 *
 * The generic sweep in `generators.test.ts` proves every table's bank holds
 * its answer. What it cannot see is whether the answer is *right*: that the
 * tokens land in the blanks they belong to, in reading order, and that the
 * column they fill really follows the rule on the slide. So every table here is
 * read back off the rendered slide — given cells and answers merged in the
 * order the widget fills them — and the whole column is checked against the
 * rule's own arithmetic, never against the generator's helpers.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Lesson, Slide } from '../types';
import { termTableGenerators } from './termTable';

type Table = Extract<Slide, { kind: 'table' }>;

const SEEDS = 200;
const DIFFICULTIES = [1, 2];

const ids = termTableGenerators.map((g) => g.id);

function draw(id: string, seed: number, difficulty: number) {
  const g = registry[id] as unknown as Generator<unknown>;
  const params = g.sample(makeRng(seed), difficulty);
  const slide = g.render(params);
  if (slide.kind !== 'table') throw new Error(`${id} rendered ${slide.kind}`);
  return { params, slide };
}

/** The table with its blanks filled from `answer`, in the widget's reading order. */
function merged(slide: Table, answer: string[]): string[][] {
  let next = 0;
  return slide.rows.map((row) => row.map((cell) => (cell === null ? answer[next++] : cell)));
}

/** One generated question as a one-slide sealed lesson, graded through the reducer. */
function grade(id: string, seed: number, difficulty: number, answer: string[]) {
  const lesson: Lesson = {
    id: 'table-test',
    title: 'Table',
    slides: [],
    skillCheck: [{ type: 'generated', generatorId: id, difficulty }],
  };
  return reduce(startSession(lesson, registry, seed), { type: 'submit', answer }).feedback.kind;
}

/** The slide the session actually resolved, which is what `grade` marks. */
function resolved(id: string, seed: number, difficulty: number): Table {
  const lesson: Lesson = {
    id: 'table-test',
    title: 'Table',
    slides: [],
    skillCheck: [{ type: 'generated', generatorId: id, difficulty }],
  };
  const slide = startSession(lesson, registry, seed).skillCheck[0].slide;
  if (slide.kind !== 'table') throw new Error(`${id} resolved ${slide.kind}`);
  return slide;
}

describe.each(ids)('%s', (id) => {
  const cases = DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({ seed, difficulty })),
  );

  it('keeps the table to at most six rows and three columns, with n given', () => {
    for (const { seed, difficulty } of cases) {
      const { slide } = draw(id, seed, difficulty);
      expect(slide.rows.length).toBeLessThanOrEqual(6);
      expect(slide.columns.length).toBeGreaterThanOrEqual(2);
      expect(slide.columns.length).toBeLessThanOrEqual(3);
      slide.rows.forEach((row, r) => {
        expect(row.length, `row ${r} is ragged`).toBe(slide.columns.length);
        expect(row[0], `row ${r} has no n`).toBe(String(r + 1));
      });
    }
  });

  it('never gives and blanks the same cell', () => {
    // A cell is either a string or a blank, so the overlap to guard against is
    // a count: one answer token per blank, no more and no fewer, or the reading
    // order the widget fills in no longer lines up with the answer.
    for (const { seed, difficulty } of cases) {
      const { slide } = draw(id, seed, difficulty);
      const blanks = slide.rows.flat().filter((cell) => cell === null).length;
      expect(blanks, `seed ${seed}`).toBeGreaterThan(0);
      expect(slide.answer.length, `seed ${seed}`).toBe(blanks);
      expect(slide.answer.every((token) => token !== '')).toBe(true);
    }
  });

  it('offers every token the answer needs and at least two distractors, sorted', () => {
    for (const { seed, difficulty } of cases) {
      const { slide } = draw(id, seed, difficulty);
      const left = [...slide.bank];
      for (const token of slide.answer) {
        const at = left.indexOf(token);
        expect(at, `seed ${seed}: ${token} missing from ${slide.bank.join(' ')}`).toBeGreaterThanOrEqual(0);
        left.splice(at, 1);
      }
      expect(left.length, `seed ${seed}: ${slide.bank.join(' ')}`).toBeGreaterThanOrEqual(2);
      expect(new Set(left).size, 'a distractor repeats').toBe(left.length);
      const values = slide.bank.map(Number);
      expect(values, 'bank is not sorted').toEqual([...values].sort((a, b) => a - b));
    }
  });

  it('renders the same slide from the same seed', () => {
    for (const { seed, difficulty } of cases.slice(0, 40)) {
      expect(draw(id, seed, difficulty).slide).toEqual(draw(id, seed, difficulty).slide);
    }
  });

  it('grades the empty draft incorrect, its own answer correct, and a perturbed one incorrect', () => {
    for (const { seed, difficulty } of cases.slice(0, 60).concat(cases.slice(SEEDS, SEEDS + 60))) {
      const slide = resolved(id, seed, difficulty);
      const empty = slide.answer.map(() => '');
      expect(grade(id, seed, difficulty, empty), `seed ${seed} empty`).toBe('incorrect');
      expect(grade(id, seed, difficulty, slide.answer), `seed ${seed} answer`).toBe('correct');

      // One blank off by one: the smallest wrong table there is.
      const nudged = [...slide.answer];
      nudged[nudged.length - 1] = String(Number(nudged[nudged.length - 1]) + 1);
      expect(grade(id, seed, difficulty, nudged), `seed ${seed} nudged`).toBe('incorrect');

      // Every right value, in the wrong blanks.
      if (new Set(slide.answer).size > 1) {
        const rotated = [...slide.answer.slice(1), slide.answer[0]];
        expect(grade(id, seed, difficulty, rotated), `seed ${seed} rotated`).toBe('incorrect');
      }
    }
  });
});

describe('the tables follow their rules', () => {
  it('explicit: every u_n is an + b, and every S_n the running total of the u_n column', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const { params, slide } = draw('term-table-explicit', seed, difficulty);
        const { a, b } = params as { a: number; b: number };
        const table = merged(slide, slide.answer);
        let total = 0;
        table.forEach((row, r) => {
          const n = r + 1;
          expect(Number(row[1]), `seed ${seed} u_${n}`).toBe(a * n + b);
          total += Number(row[1]);
          if (slide.columns.length === 3) {
            expect(slide.columns[2]).toBe('S_n');
            expect(Number(row[2]), `seed ${seed} S_${n}`).toBe(total);
          }
        });
        // The rule on the slide names the same a and b the column was checked against.
        const display = slide.prompt.find((block) => block.kind === 'display');
        expect(display && display.kind === 'display' ? display.tex : '').toMatch(
          new RegExp(`^u_n = ${a}n [+-] ${Math.abs(b)}$`),
        );
      }
    }
  });

  it('recursive: every term is p times the one before plus q', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const { params, slide } = draw('term-table-recursive', seed, difficulty);
        const { p, q, first } = params as { p: number; q: number; first: number };
        const column = merged(slide, slide.answer).map((row) => Number(row[1]));
        expect(column[0]).toBe(first);
        expect(slide.rows[0][1], 'u_1 must be given').not.toBeNull();
        for (let n = 1; n < column.length; n += 1) {
          expect(column[n], `seed ${seed} u_${n + 1}`).toBe(p * column[n - 1] + q);
        }
        expect(new Set(column).size, `seed ${seed}: a constant sequence`).toBeGreaterThan(1);
      }
    }
  });

  it('asks a harder table at difficulty 2', () => {
    // Explicit gains a running-sum column; recursive a multiplier other than
    // one and blanks that are not a single run.
    for (let seed = 0; seed < SEEDS; seed += 1) {
      expect(draw('term-table-explicit', seed, 1).slide.columns.length).toBe(2);
      expect(draw('term-table-explicit', seed, 2).slide.columns.length).toBe(3);
      const { params } = draw('term-table-recursive', seed, 2);
      expect((params as { p: number }).p).not.toBe(1);
    }
  });
});
