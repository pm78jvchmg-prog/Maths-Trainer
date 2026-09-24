/**
 * The Venn generators, checked against the numbers their prompts state.
 *
 * The generic sweep in `generators.test.ts` proves the four regions add up.
 * It would pass a diagram that adds up to a different survey than the one
 * the prompt describes. So this file reads the stated numbers back out of the
 * prompt and works the regions out again from them alone, by inclusion and
 * exclusion, never from the generator's parameters.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { registry } from '../registry';
import { hasAnswer, initialAnswer } from '../../ui/slides';
import type { Answer } from '../../engine/session';
import type { Generator, Slide } from '../types';
import { tokenValue } from './probTree';
import { vennCounts, vennProbabilities, type VennParams } from './venn';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

type VennSlide = Extract<Slide, { kind: 'venn' }>;

function draws(generator: Generator<VennParams>) {
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      const slide = generator.render(params) as VennSlide;
      return { params, slide, seed, difficulty };
    }),
  );
}

function verdict(slide: Slide, answer: Answer) {
  const lesson = {
    id: 'venn-test',
    title: 'Venn',
    slides: [],
    skillCheck: [{ type: 'literal' as const, slide }],
  };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/** Every region, given or answered, in region order. */
function filled(slide: VennSlide): number[] {
  const answers = [...slide.answer];
  return slide.regions.map((given) => tokenValue(given ?? answers.shift()!)!);
}

/** The four regions from what the prompt says, and nothing else. */
function fromPrompt(slide: VennSlide): number[] {
  const text = slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');
  if (slide.total !== undefined) {
    const m = /^Of (\d+) [^,]+, (\d+) [^,]+, (\d+) .+? and (\d+) ([^.]+)\./.exec(text);
    expect(m, text).not.toBeNull();
    const [total, a, b, third] = m!.slice(1, 5).map(Number);
    expect(total).toBe(slide.total);
    const rest = m![5];
    const both = /neither/.test(rest) ? a + b - (total - third) : /at least one/.test(rest) ? a + b - third : third;
    return [a - both, both, b - both, total - a - b + both];
  }
  const p = (pattern: RegExp) => {
    const m = pattern.exec(text);
    return m ? Number(m[1]) : undefined;
  };
  const [x, y] = slide.sets;
  const a = p(new RegExp(`P\\(${x}\\) = ([\\d.]+)`))!;
  const b = p(new RegExp(`P\\(${y}\\) = ([\\d.]+)`))!;
  const cap = p(/\\cap \w\) = ([\d.]+)/);
  const cup = p(/\\cup \w\) = ([\d.]+)/);
  const both = /independent/.test(text) ? a * b : cap ?? a + b - cup!;
  return [a - both, both, b - both, 1 - a - b + both];
}

describe.each([
  ['venn-counts', vennCounts],
  ['venn-probabilities', vennProbabilities],
])('%s', (_id, generator) => {
  const cases = draws(generator);

  it('grades an empty diagram wrong, its own answer right and one changed region wrong', () => {
    for (const { slide, seed } of cases) {
      const empty = initialAnswer(slide);
      expect(hasAnswer(slide, empty), `seed ${seed}: Check lit on an empty diagram`).toBe(false);
      expect(verdict(slide, empty)).toBe('incorrect');

      expect(hasAnswer(slide, slide.answer)).toBe(true);
      expect(verdict(slide, slide.answer), `seed ${seed}`).toBe('correct');

      const changed = [...slide.answer];
      const at = seed % changed.length;
      changed[at] = slide.bank.find((token) => token !== changed[at])!;
      expect(verdict(slide, changed), `seed ${seed}: ${changed.join(' | ')}`).toBe('incorrect');
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

  it('fills every region as the prompt\'s own numbers give it', () => {
    for (const { slide, seed } of cases) {
      const want = fromPrompt(slide);
      filled(slide).forEach((value, idx) => {
        expect(value, `seed ${seed}, region ${idx}: ${JSON.stringify(slide.prompt)}`).toBeCloseTo(want[idx], 9);
      });
    }
  });

  it('leaves every region positive, so no region is an empty set', () => {
    for (const { slide, seed } of cases) {
      for (const value of filled(slide)) expect(value, `seed ${seed}`).toBeGreaterThan(0);
    }
  });
});
