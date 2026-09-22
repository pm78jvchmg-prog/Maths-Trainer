import { describe, it, expect } from 'vitest';
import { defaultSliderValue } from './sliderValue';
import { registry } from '../content/registry';
import { makeRng } from '../engine/rng';
import type { Generator } from '../content/types';

describe('the slider s resting value', () => {
  it('sits in the middle of a symmetric track', () => {
    expect(defaultSliderValue(-5, 5, 1)).toBe(0);
    expect(defaultSliderValue(0, 10, 2)).toBe(6);
  });

  it('snaps to the step lattice when the midpoint falls between two steps', () => {
    // -3 to 4 has its true midpoint at 0.5, which the input cannot produce.
    expect(defaultSliderValue(-3, 4, 1)).toBe(1);
    expect(defaultSliderValue(0, 5, 2)).toBe(2);
  });

  it('starts every slider question on a value its own track can reach', () => {
    // The guard the bug above escaped: a resting value off the lattice is one
    // the learner can never slide back to, and it is read out as the answer.
    for (const generator of Object.values(registry) as Generator<unknown>[]) {
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < 40; seed += 1) {
          const slide = generator.render(generator.sample(makeRng(seed), difficulty));
          if (slide.kind !== 'slider') continue;
          const start = defaultSliderValue(slide.min, slide.max, slide.step);
          const steps = (start - slide.min) / slide.step;
          expect(
            Math.abs(steps - Math.round(steps)),
            `${generator.id} rests at ${start}, which is off its own step`,
          ).toBeLessThan(1e-9);
          expect(start).toBeGreaterThanOrEqual(slide.min);
          expect(start).toBeLessThanOrEqual(slide.max);
        }
      }
    }
  });
});
