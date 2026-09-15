/**
 * T8 — a root written as a fractional index grades correct.
 *
 * Rule 1/1b: the domain value the fix introduces must not be named. The first
 * run's scorer asserted `domain: 'positive'`, which does not exist at this
 * task's base commit (96cf78e) and is not what the model chose. The domain is
 * therefore *discovered* from the content: the task asks for a generator, so
 * the generator's own slide tells us which option it opted into.
 *
 * `checkAnswer`, `registry` and `makeRng` all exist at the base.
 */
import { describe, expect, it } from 'vitest';
import { checkAnswer } from './equivalence';
import { makeRng } from './rng';
import { registry } from '../content/registry';
import type { Generator } from '../content/types';

/**
 * A fractional index in an answer string, tolerant of how it is bracketed.
 *
 * `answer` is parsed by mathjs and never displayed, so the house style is to
 * over-bracket it for unambiguity — `x^((3)/(2))`, not `x^(3/2)`. The first
 * version of this allowed a single optional open paren and so could not see
 * the repo's own convention: rep 2's generator was invisible to it and the
 * task scored a false FAIL. Rule 1 again, one level down from naming — the
 * predicate was asserting a spelling.
 */
const FRACTIONAL_INDEX = /\^\s*\(*\s*-?\s*\(*\s*-?\d+\s*\)*\s*\/\s*\(*\s*\d+/;

/** The slide the task asked for, found by what it asks rather than by its id. */
function fractionalIndexSlide() {
  for (const [id, generator] of Object.entries(registry)) {
    const gen = generator as unknown as Generator<unknown>;
    for (let seed = 0; seed < 40; seed += 1) {
      for (const difficulty of [1, 2]) {
        let slide;
        try {
          slide = gen.render(gen.sample(makeRng(seed), difficulty));
        } catch {
          continue;
        }
        if (slide.kind !== 'expression') continue;
        if (FRACTIONAL_INDEX.test(slide.answer)) return { id, slide };
      }
    }
  }
  return undefined;
}

describe('T8: roots as fractional indices', () => {
  const found = fractionalIndexSlide();

  it('a generator asks the question', () => {
    expect(found, 'no expression slide answers with a fractional index').toBeDefined();
  });

  it('the option that slide opts into accepts a root written as an index', () => {
    const domain = found!.slide.domain;
    expect(checkAnswer('x^(3/2)', 'sqrt(x^3)', { domain }).status).toBe('correct');
    expect(checkAnswer('x^(2/3)', '(x^2)^(1/3)', { domain }).status).toBe('correct');
  });

  it('that option still refuses a genuinely wrong index', () => {
    const domain = found!.slide.domain;
    expect(checkAnswer('x^(5/2)', 'sqrt(x^3)', { domain }).status).toBe('incorrect');
  });

  it('the plain real domain is not loosened', () => {
    // The whole constraint: buy the fractional index without buying sqrt(x^2) = x.
    expect(checkAnswer('sqrt(x^2)', 'x', { domain: 'real' }).status).toBe('incorrect');
  });

  it('the generator own answer is accepted by its own checker', () => {
    const { slide } = found!;
    expect(checkAnswer(slide.answer, slide.answer, { domain: slide.domain }).status).toBe('correct');
  });
});
