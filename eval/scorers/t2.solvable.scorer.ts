import { describe, expect, it } from 'vitest';
import { makeRng } from '../engine/rng';
import { registeredGenerators } from './registry';
import { nodeAt, reduceAt, renderExpr, targets, toTex, valueOf, type Expr } from './expr';
import type { Generator } from './types';

/**
 * Every reduce slide must be finishable by tapping.
 *
 * Implementation-neutral: it only asks that some legal target is reachable as a
 * handle on a rendered fragment, which is exactly what the widget requires.
 */
describe('every reduce slide can be finished', () => {
  it('always offers a legal target that is rendered as a handle', () => {
    for (const g of registeredGenerators as unknown as Generator<unknown>[]) {
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < 40; seed += 1) {
          const slide = g.render(g.sample(makeRng(seed), difficulty));
          if (slide.kind !== 'reduce') continue;
          let live: Expr = slide.expr;
          for (let taps = 0; live.kind !== 'num'; taps += 1) {
            expect(taps, `${g.id}: does not finish`).toBeLessThan(12);
            const handles = new Set(
              renderExpr(live)
                .map((f) => f.handle)
                .filter((h): h is string => h !== undefined),
            );
            const next = targets(live).find((t) => t.legal && handles.has(t.path));
            expect(next, `${g.id} seed ${seed}: nothing legal is tappable in ${toTex(live)}`)
              .toBeDefined();
            live = reduceAt(live, next!.path, valueOf(nodeAt(live, next!.path)!));
          }
        }
      }
    }
  });
});
