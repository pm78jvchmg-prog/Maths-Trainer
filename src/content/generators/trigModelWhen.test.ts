import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';

/**
 * The times these questions accept must be times the model is at the level
 * asked. A model with a minus in front (`h = 7 - 2sin(30t)`) once accepted the
 * times of the mirror level, because the sign was undone twice, and the sweep
 * could not see it: it only checks a generator agrees with itself. So the model
 * is evaluated here, from its parameters, at every time the question accepts.
 */
interface Params {
  d: number;
  a: number;
  start: 'rise' | 'fall' | 'peak' | 'trough';
  period: number;
  half: 1 | -1;
}

const value = (p: Params, t: number): number => {
  const angle = ((360 * t) / p.period) * (Math.PI / 180);
  const fn = p.start === 'rise' || p.start === 'fall' ? Math.sin : Math.cos;
  const sign = p.start === 'rise' || p.start === 'peak' ? 1 : -1;
  return p.d + sign * p.a * fn(angle);
};

describe.each(['trig-model-when-tree', 'trig-model-when-tiles'])('%s', (id) => {
  it('accepts only times the model is at the level asked', () => {
    const generator = registry[id] as unknown as {
      sample: (rng: ReturnType<typeof makeRng>, difficulty: number) => Params;
      render: (p: Params) => import('../types').Slide;
    };
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < 200; seed += 1) {
        const p = generator.sample(makeRng(seed), difficulty);
        const slide = generator.render(p);
        const answer = (slide as { answer: string[] }).answer;
        const times = (id.endsWith('tree') ? answer.slice(-2) : answer).map(Number);
        const sign = p.start === 'rise' || p.start === 'peak' ? 1 : -1;
        const level = p.d + (sign * p.a * p.half) / 2;
        if (slide.kind === 'tree') expect(slide.expression.endsWith(`= ${level}`)).toBe(true);
        for (const t of times) expect(value(p, t), `${id} seed ${seed}: t = ${t}`).toBeCloseTo(level, 9);
      }
    }
  });
});
