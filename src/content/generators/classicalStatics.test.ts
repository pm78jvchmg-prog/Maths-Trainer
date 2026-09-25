/**
 * Classical Mechanics level 7, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: a centre of mass by the moments about it adding
 * to nothing, a stack by building it block by block from the top, a pushed
 * crate by the moments at the push it names, a rope by resolving each half's
 * pull, and the body's levers by moments about a different point.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;
const TIME = { timeout: 60_000 };

function draws(id: string): { p: Record<string, unknown>; slide: Slide }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const p = generator.sample(makeRng(seed), difficulty);
      return { p: p as Record<string, unknown>, slide: generator.render(p) };
    }),
  );
}

function answerOf(slide: Slide): number[] {
  switch (slide.kind) {
    case 'expression':
      return [Number(math.evaluate(slide.answer))];
    case 'slider':
      return [slide.answer];
    case 'tree':
    case 'table':
      return slide.answer.map(Number);
    case 'flow':
      return slide.answer.filter((s) => /^\$-?[\d.]+\$$/.test(s)).map((s) => Number(s.replace(/\$/g, '')));
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

function filled(slide: Slide): number[][] {
  if (slide.kind !== 'table') throw new Error('not a table');
  const fill = [...slide.answer];
  return slide.rows.map((row) => row.map((cell) => Number((cell ?? fill.shift() ?? '').replace(/^M = /, ''))));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
const moments = (ms: number[], xs: number[], about: number) => ms.reduce((s, m, i) => s + m * (xs[i] - about), 0);

/** The steps of the greatest overhang, built from the top: each block goes under the centre of mass of those above. */
function builtSteps(L: number, count: number): number[] {
  const steps: number[] = [];
  let centre = 0;
  for (let k = 1; k <= count; k += 1) {
    // The new block's right end sits under the centre of the k - 1 above; its own centre is L/2 behind that.
    const edge = centre;
    const below = (k - 1) * centre + (edge - L / 2);
    centre = k === 1 ? -L / 2 : below / k;
    steps.push(edge - centre);
  }
  // steps[0] is the top block's half length; each later one the next block's overhang over the one beneath.
  return steps;
}

describe('classical mechanics level 7', () => {
  it('puts the centre of mass where the moments balance', TIME, () => {
    for (const id of ['clm-com-rod', 'clm-com-slider']) {
      for (const { p, slide } of draws(id)) expect(near(moments(p.ms as number[], p.xs as number[], answerOf(slide)[0]), 0, 1e-9), `${id} ${JSON.stringify(p)}`).toBe(true);
    }
    for (const { slide } of draws('clm-com-table')) {
      const rows = filled(slide);
      const masses = rows.slice(0, 3);
      for (const [m, x, mx] of masses) expect(near(mx, m * x)).toBe(true);
      const [M, xb, total] = rows[3];
      expect(near(M, masses.reduce((s, r) => s + r[0], 0)) && near(total, masses.reduce((s, r) => s + r[2], 0))).toBe(true);
      expect(near(moments(masses.map((r) => r[0]), masses.map((r) => r[1]), xb), 0, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-com-2d-tree')) {
      const [M, xb, yb] = answerOf(slide);
      const ms = p.ms as number[];
      const pts = p.pts as number[][];
      expect(near(M, ms.reduce((s, m) => s + m, 0))).toBe(true);
      expect(near(moments(ms, pts.map((q) => q[0]), xb), 0, 1e-9) && near(moments(ms, pts.map((q) => q[1]), yb), 0, 1e-9)).toBe(true);
    }
  });

  it('builds the greatest overhang block by block', TIME, () => {
    for (const { p, slide } of draws('clm-stack-table')) {
      const L = n(p.L);
      const steps = builtSteps(L, 7);
      for (const [nBlocks, step, total] of filled(slide)) {
        // With nBlocks, the bottom block's overhang is the last step built; the reach adds them all.
        expect(near(step, steps[nBlocks - 1], 1e-9), JSON.stringify(p)).toBe(true);
        expect(near(total, steps.slice(0, nBlocks).reduce((s, v) => s + v, 0), 1e-9)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-stack-slider')) {
      expect(near(answerOf(slide)[0], builtSteps(n(p.L), n(p.n)).reduce((s, v) => s + v, 0), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-stack-tree')) {
      const [a, d, reach] = answerOf(slide);
      const { L1, m1, L2, m2 } = p as { L1: number; m1: number; L2: number; m2: number };
      // Table edge at 0: lower block from d - L2 to d, top block from d + a - L1 to d + a.
      const lowerCentre = d - L2 / 2;
      const topCentre = d + a - L1 / 2;
      expect(near(topCentre, d, 1e-9) && near(m1 * topCentre + m2 * lowerCentre, 0, 1e-9) && near(reach, a + d)).toBe(true);
    }
    for (const { p, slide } of draws('clm-stack-flow')) {
      const { L, s, d } = p as { L: number; s: number; d: number };
      const lower = [d - L, d];
      const top = [d + s - L, d + s];
      const topCentre = (top[0] + top[1]) / 2;
      const pair = ((lower[0] + lower[1]) / 2 + topCentre) / 2;
      const verdict = topCentre > lower[1] ? 'The top block falls off' : pair > 0 ? 'The whole stack topples' : 'It stands';
      expect(slide.kind === 'flow' && slide.answer[2]).toBe(verdict);
    }
  });

  it('tips a crate where the moments about its front edge balance', TIME, () => {
    for (const id of ['clm-tip-push', 'clm-tip-tree', 'clm-slide-tip-flow']) {
      for (const { p, slide } of draws(id)) {
        const { W, b, h, mu } = p as { W: number; b: number; h: number; mu: number };
        const got = answerOf(slide);
        const tip = id === 'clm-tip-push' ? got[0] : id === 'clm-tip-tree' ? got[1] : got[1];
        // Moments about the front edge: the push at height h against the weight half the base back.
        expect(near(tip * h - W * (b / 2), 0, 1e-9), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id === 'clm-tip-tree') expect(near(got[0], W * (b / 2)) && near(got[2], mu * W)).toBe(true);
        if (id === 'clm-slide-tip-flow') {
          expect(near(got[0], mu * W)).toBe(true);
          expect(slide.kind === 'flow' && slide.answer[2]).toBe(tip < mu * W ? 'It tips first' : 'It slides first');
        }
      }
    }
    for (const { p, slide } of draws('clm-tip-slider')) {
      const h = answerOf(slide)[0];
      const W = 100;
      // At that height the push that tips equals the push that slides.
      expect(near((W * n(p.b)) / 2 / h, n(p.mu) * W, 1e-9)).toBe(true);
    }
  });

  it('holds a rope’s load with the upward parts of both halves', TIME, () => {
    for (const id of ['clm-rope-tension', 'clm-rope-tree', 'clm-rope-flow', 'clm-rope-slider']) {
      for (const { p, slide } of draws(id)) {
        const tri = p.tri as number[];
        const s = tri[0] * n(p.k);
        const a = tri[1] * n(p.k);
        const got = answerOf(slide);
        if (id === 'clm-rope-slider') {
          const T = Number(/tension is \$([\d.]+)/.exec(JSON.stringify(slide.kind === 'slider' ? slide.prompt : ''))?.[1]);
          const sag = got[0];
          expect(near((2 * T * sag) / Math.hypot(sag, a), n(p.W), 1e-9), JSON.stringify(p)).toBe(true);
          continue;
        }
        const T = id === 'clm-rope-tension' ? got[0] : id === 'clm-rope-tree' ? got[2] : got[1];
        // Each half pulls along its own line, from the middle towards a hook a across and s up.
        const up = (T * s) / Math.hypot(a, s);
        expect(near(2 * up, n(p.W), 1e-9), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id === 'clm-rope-tree') expect(near(got[0], Math.hypot(a, s)) && near(got[1], s / Math.hypot(a, s))).toBe(true);
        if (id === 'clm-rope-flow') expect(slide.kind === 'flow' && slide.answer[2]).toBe(T <= n(p.strength) ? 'It holds' : 'It snaps');
      }
    }
  });

  it('balances the body’s levers about a second point', TIME, () => {
    for (const id of ['clm-biceps', 'clm-elbow-tree']) {
      for (const { p, slide } of draws(id)) {
        const { W, L, w, c, d } = p as { W: number; L: number; w: number; c: number; d: number };
        const got = answerOf(slide);
        const F = id === 'clm-biceps' ? got[0] : got[1];
        // Force balance gives the joint's push down; then moments about the hand must vanish too.
        const R = id === 'clm-biceps' ? F - W - w : got[2];
        expect(near(F - R - W - w, 0, 1e-9)).toBe(true);
        expect(near(F * (d - L) + R * L - w * (c - L), 0, 1e-9), `${id} ${JSON.stringify(p)}`).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-tiptoe')) {
      const T = answerOf(slide)[0];
      const N = p.one ? n(p.W) : n(p.W) / 2;
      // The shin pushes down on the ankle with N + T; moments about the ball of the foot, a in front.
      const a = n(p.a);
      const b = n(p.b);
      expect(near(T * (-b - a) + -(N + T) * (0 - a), 0, 1e-9)).toBe(true);
    }
    for (const { slide } of draws('clm-lever-table')) {
      for (const [W, L, d, F] of filled(slide)) expect(near(F * d, W * L, 1e-9)).toBe(true);
    }
  });
});
