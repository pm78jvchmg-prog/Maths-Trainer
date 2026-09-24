/**
 * The probability-tree generators, checked against arithmetic of their own.
 *
 * The generic sweep in `generators.test.ts` proves a tree is well formed: the
 * bank holds the answer, every point's branches sum to 1. It would pass a
 * tree whose second stage forgot that a counter had been taken out, since
 * `\frac{5}{8}` and `\frac{3}{8}` sum to 1 as happily as `\frac{4}{7}` and
 * `\frac{3}{7}`. So this file rebuilds every branch from the parameters with
 * formulas written out again here, and finds a path question's answer by
 * multiplying every path out, the way the learner does.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import { hasAnswer, initialAnswer } from '../../ui/slides';
import type { Answer } from '../../engine/session';
import type { Generator, Slide } from '../types';
import { ptreeFill, ptreePath, tokenValue, type ProbTreeParams } from './probTree';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

type ProbTreeSlide = Extract<Slide, { kind: 'probTree' }>;

function draws(generator: Generator<ProbTreeParams>) {
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      const slide = generator.render(params) as ProbTreeSlide;
      return { params, slide, seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide, asked for real. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = {
    id: 'ptree-test',
    title: 'Tree',
    slides: [],
    skillCheck: [{ type: 'literal' as const, slide }],
  };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/**
 * Every branch's probability, first stage then second, as plain numbers from
 * the parameters. Counters: `x` of one kind and `y` of the other, one taken
 * out before the second draw.
 */
function expected({ family, values }: ProbTreeParams): number[] {
  if (family === 'counters') {
    const [x, y] = values;
    const n = x + y;
    return [x / n, y / n, (x - 1) / (n - 1), y / (n - 1), x / (n - 1), (y - 1) / (n - 1)];
  }
  if (family === 'conditional') {
    const [a, b, c] = values.map((h) => h / 100);
    return [a, 1 - a, b, 1 - b, c, 1 - c];
  }
  const [s1, s2, r1, r2, r3] = values.map((h) => h / 100);
  return [s1, s2, 1 - s1 - s2, ...[r1, r2, r3].flatMap((r) => [r, 1 - r])];
}

describe.each([
  ['ptree-fill', ptreeFill],
  ['ptree-path', ptreePath],
])('%s', (_id, generator) => {
  const cases = draws(generator);

  it('grades an empty draft wrong, its own answer right and one changed token wrong', () => {
    for (const { slide, seed } of cases) {
      const empty = initialAnswer(slide);
      expect(hasAnswer(slide, empty), `seed ${seed}: Check lit on an empty tree`).toBe(false);
      expect(verdict(slide, empty)).toBe('incorrect');

      expect(hasAnswer(slide, slide.answer)).toBe(true);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');

      const changed = [...slide.answer];
      if (slide.mode === 'fill') {
        const at = seed % changed.length;
        changed[at] = slide.bank.find((token) => token !== changed[at])!;
      } else {
        // The other branch under the same first-stage branch.
        const top = slide.branches.find((b) => b.label === changed[0])!;
        changed[1] = top.next.find((b) => b.label !== changed[1])!.label;
      }
      expect(verdict(slide, changed), `seed ${seed}: ${changed.join(' | ')}`).toBe('incorrect');

      // A path stopped after the first stage is not an answer.
      if (slide.mode === 'path') {
        expect(hasAnswer(slide, changed.slice(0, 1))).toBe(false);
        expect(verdict(slide, changed.slice(0, 1))).toBe('incorrect');
      }
    }
  });

  it('renders the same slide twice from the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 30; seed += 1) {
        const once = generator.render(generator.sample(makeRng(seed), difficulty));
        const twice = generator.render(generator.sample(makeRng(seed), difficulty));
        expect(twice).toEqual(once);
      }
    }
  });

  it('writes every branch as the situation gives it', () => {
    for (const { params, slide, seed } of cases) {
      const want = expected(params);
      const answers = [...slide.answer];
      const shown = slide.branches.flatMap((b) => [b.p, ...b.next.map((u) => u.p)]);
      // Reorder to first stage then second, the way `expected` lists them.
      const k = slide.branches.length;
      const firstStage = shown.filter((_, idx) => idx % 3 === 0);
      const secondStage = shown.filter((_, idx) => idx % 3 !== 0);
      const flat = [...firstStage, ...secondStage].map((p) =>
        p === null ? (slide.mode === 'fill' ? answers.shift()! : null) : p,
      );
      expect(flat).toHaveLength(k * 3);
      flat.forEach((token, idx) => {
        expect(token, `seed ${seed}: branch ${idx} is blank in a path question`).not.toBeNull();
        expect(tokenValue(token!), `seed ${seed}: branch ${idx} is ${token}`).toBeCloseTo(want[idx], 9);
      });
    }
  });
});

describe('ptree-fill', () => {
  it('asks something at every difficulty: the second draw, or a branch from each point', () => {
    for (const { params, slide, seed } of draws(ptreeFill)) {
      const blanks = slide.branches.flatMap((b) => [b.p, ...b.next.map((u) => u.p)]).filter((p) => p === null);
      expect(blanks.length, `seed ${seed}`).toBe(slide.answer.length);
      if (params.family === 'counters') {
        // Every second-stage branch is asked: that is where "without
        // replacement" lives.
        for (const branch of slide.branches) {
          for (const under of branch.next) expect(under.p, `seed ${seed}`).toBeNull();
        }
      } else {
        // One blank per point, so each is found by taking the rest from 1.
        expect(slide.branches.filter((b) => b.p === null)).toHaveLength(1);
        for (const branch of slide.branches) {
          expect(branch.next.filter((u) => u.p === null), `seed ${seed}`).toHaveLength(1);
        }
      }
    }
  });
});

describe('ptree-path', () => {
  it('points at the one path the question describes, found by multiplying every path', () => {
    for (const { params, slide, seed } of draws(ptreePath)) {
      const want = expected(params);
      const k = slide.branches.length;
      const products = slide.branches.flatMap((branch, i) =>
        branch.next.map((under, j) => ({
          path: [branch.label, under.label],
          p: want[i] * want[k + 2 * i + j],
        })),
      );
      const prose = slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');
      let matches: typeof products;
      if (params.ask === 'product') {
        const stated = /probability \$([^$]+)\$/.exec(prose);
        expect(stated, `seed ${seed}: ${prose}`).not.toBeNull();
        const target = tokenValue(stated![1])!;
        matches = products.filter((entry) => Math.abs(entry.p - target) < 1e-9);
      } else {
        const ps = products.map((entry) => entry.p);
        const extreme = params.ask === 'most' ? Math.max(...ps) : Math.min(...ps);
        expect(prose, `seed ${seed}`).toContain(params.ask === 'most' ? 'most likely' : 'least likely');
        matches = products.filter((entry) => Math.abs(entry.p - extreme) < 1e-9);
      }
      expect(matches.map((entry) => entry.path), `seed ${seed}`).toEqual([slide.answer]);
    }
  });
});
