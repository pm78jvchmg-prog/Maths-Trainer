import { describe, it, expect } from 'vitest';
import { defaultSliderValue } from './sliderValue';
import { markerWindow } from '../content/figures';
import { registry } from '../content/registry';
import { makeRng } from '../engine/rng';
import { reduce, startSession } from '../engine/session';
import { hasAnswer, initialAnswer } from './slides';
import type { Generator, Slide } from '../content/types';
import type { TailSliderParams } from '../content/generators/integration';

type SliderSlide = Extract<Slide, { kind: 'slider' }>;

interface SliderDraw {
  generator: Generator<unknown>;
  slide: SliderSlide;
  seed: number;
  difficulty: number;
}

/**
 * Every slider question the registry can draw, at both difficulties and forty
 * seeds, rendered once while the file is collected.
 *
 * The two registry sweeps below used to render the whole library each, inside
 * their own 5 s budgets, and crossed it under load as the library grew.
 * Collection is untimed, and drawing once serves both, so nothing is walked any
 * less: every generator, both difficulties, all forty seeds.
 */
const SLIDER_DRAWS: SliderDraw[] = (() => {
  const draws: SliderDraw[] = [];
  for (const generator of Object.values(registry) as Generator<unknown>[]) {
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < 40; seed += 1) {
        const slide = generator.render(generator.sample(makeRng(seed), difficulty));
        if (slide.kind === 'slider') draws.push({ generator, slide, seed, difficulty });
      }
    }
  }
  return draws;
})();

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
    for (const { generator, slide } of SLIDER_DRAWS) {
      const start = defaultSliderValue(slide.min, slide.max, slide.step);
      const steps = (start - slide.min) / slide.step;
      expect(
        Math.abs(steps - Math.round(steps)),
        `${generator.id} rests at ${start}, which is off its own step`,
      ).toBeLessThan(1e-9);
      expect(start).toBeGreaterThanOrEqual(slide.min);
      expect(start).toBeLessThanOrEqual(slide.max);
    }
  });
});

/**
 * An untouched slider is not an answer.
 *
 * The handle has to rest somewhere, and on `argument-turns` every position on
 * the track is the answer to one of its questions, so a resting value that
 * counted would hand out a free mark on one draw in eight. What the widget
 * starts from is held to two things: Check cannot take it, and the reducer
 * would not mark it correct if it were sent anyway.
 */
describe('an untouched slider', () => {
  const untouchedVerdict = (slide: Slide) => {
    const lesson = {
      id: 'untouched',
      title: 'Untouched',
      slides: [],
      skillCheck: [{ type: 'literal' as const, slide }],
    };
    const draft = initialAnswer(slide);
    const session = reduce(startSession(lesson, registry, 1), { type: 'submit', answer: draft });
    return { submittable: hasAnswer(slide, draft), feedback: session.feedback.kind };
  };

  /** Every draw an untouched handle would score, and every draw Check would take. */
  const audit = (draws: SliderDraw[]) => {
    const marked: string[] = [];
    const live: string[] = [];
    for (const { generator, slide, seed, difficulty } of draws) {
      const { submittable, feedback } = untouchedVerdict(slide);
      const where = `${generator.id} seed ${seed} d${difficulty}`;
      if (feedback === 'correct') marked.push(where);
      if (submittable) live.push(where);
    }
    return { marked, live };
  };

  it('is never marked correct on the argument slider', () => {
    const argument = SLIDER_DRAWS.filter(({ generator }) => generator.id === 'argument-turns');
    expect(argument, 'argument-turns draws no slider').not.toEqual([]);
    const { marked, live } = audit(argument);
    expect(marked, 'marked correct without being touched').toEqual([]);
    expect(live, 'Check is live before the handle moves').toEqual([]);
  });

  it('is never marked correct on any slider in the registry', () => {
    const { marked, live } = audit(SLIDER_DRAWS);
    expect(marked, 'marked correct without being touched').toEqual([]);
    expect(live, 'Check is live before the handle moves').toEqual([]);
  });
});

/**
 * The marker lines up with the picture under it.
 *
 * `plotSvg` insets its drawing by a margin at every edge, while the widget
 * places the marker as a percentage of the whole figure box. A figure that
 * hands the widened `markerWindow` to `plotSvg` as well as to the widget pads
 * twice, and the line drifts off the curve towards the ends: the area slider
 * drew its "levels off here" line visibly above the level the curve reached.
 * `plotSvg` records the window it drew in `data-plot`, and the marker's window
 * has to be that one widened by `markerWindow`, exactly.
 */
describe('a slider figure', () => {
  /**
   * Drawn in grid units and marked in the data's own units, one scaled from
   * the other, so the two windows differ by that scale and cannot be compared
   * here. `cfMarker` widens the data's window by the same inset instead.
   */
  const SCALED_UNITS = new Set(['dat-cf-below-slider', 'dat-cf-quartile-slider', 'dat-pct-slider']);

  it('declares the marker window that matches its drawing', () => {
    const off: string[] = [];
    for (const { generator, slide, seed, difficulty } of SLIDER_DRAWS) {
      if (SCALED_UNITS.has(generator.id)) continue;
      const figure = slide.figure;
      const plot = figure?.svg.match(/data-plot="([^"]+)"/);
      const box = figure?.svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/);
      if (!figure || !plot || !box) continue;
      const [x0, x1, y0, y1] = plot[1].split(' ').map(Number);
      const axis = figure.axis ?? 'x';
      const want = axis === 'y' ? markerWindow(y0, y1, 'y', Number(box[1])) : markerWindow(x0, x1, 'x');
      const scale = Math.abs(want.xMax - want.xMin);
      if (Math.abs(figure.xMin - want.xMin) > 1e-6 * scale || Math.abs(figure.xMax - want.xMax) > 1e-6 * scale) {
        off.push(`${generator.id} seed ${seed} d${difficulty}`);
      }
    }
    expect([...new Set(off.map((where) => where.split(' ')[0]))]).toEqual([]);
  });

  it('puts the tail slider s line on the level its area graph reaches', () => {
    // Drawn by hand, two graphs stacked, so the check above cannot read it.
    // The line slid to the area the graph reaches at its right-hand end has to
    // cross the graph's last point, worked out from the question's own numbers.
    const draws = SLIDER_DRAWS.filter(({ generator }) => generator.id === 'int-imp-tail-slider');
    expect(draws).not.toEqual([]);
    for (const { generator, slide, seed, difficulty } of draws) {
      const { form, L } = generator.sample(makeRng(seed), difficulty) as TailSliderParams;
      // Out to 6 / a for the exponential, 13a for the power: see tailSliderParts.
      const reached = form === 'exp' ? L * (1 - Math.exp(-6)) : L - L / 13;
      const figure = slide.figure!;
      const height = Number(figure.svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)![1]);
      const curves = [...figure.svg.matchAll(/fill="none" stroke="currentColor" stroke-width="2" d="([^"]+)"/g)];
      const endY = Number(curves[1][1].trim().split(' ').pop()!.split(',')[1]);
      const markerY = (height * (figure.xMax - reached)) / (figure.xMax - figure.xMin);
      expect(Math.abs(markerY - endY), `seed ${seed} d${difficulty}`).toBeLessThan(0.5);
    }
  });
});
