/**
 * Classical Mechanics level 8, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: springs by the forces in each, oscillators and
 * pendulums by stepping their equations of motion in time, large swings by
 * integrating the full pendulum equation rather than using energy.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 60;
const TIME = { timeout: 60_000 };
const g = 9.8;

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
  return slide.rows.map((row) => row.map((cell) => (cell === '' ? NaN : Number(cell ?? fill.shift()))));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
/** Absolute closeness, for an answer rounded to a stated precision. */
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-6;
const promptText = (slide: Slide): string => JSON.stringify('prompt' in slide ? slide.prompt : '');

/** Steps x'' = -w^2 x from rest at A until x falls to x0, and returns the speed there. */
function speedByStepping(w: number, A: number, x0: number): number {
  const dt = 2e-5 / w;
  let x = A;
  let v = 0;
  for (let i = 0; i < 1e7; i += 1) {
    const a = -w * w * x;
    const xNext = x + v * dt + 0.5 * a * dt * dt;
    const vNext = v + 0.5 * (a - w * w * xNext) * dt;
    if (xNext <= x0) {
      const f = (x - x0) / (x - xNext);
      return Math.abs(v + f * (vNext - v));
    }
    x = xNext;
    v = vNext;
  }
  throw new Error('never arrived');
}

/** Steps the full pendulum equation from rest at theta0 to the bottom, and returns the bob's speed there. */
function swingByStepping(L: number, theta0: number): number {
  const dt = 1e-5;
  let th = theta0;
  let om = 0;
  for (let i = 0; i < 1e7; i += 1) {
    const al = (-g / L) * Math.sin(th);
    const thNext = th + om * dt + 0.5 * al * dt * dt;
    const omNext = om + 0.5 * (al + (-g / L) * Math.sin(thNext)) * dt;
    if (thNext <= 0) {
      const f = th / (th - thNext);
      return L * Math.abs(om + f * (omNext - om));
    }
    th = thNext;
    om = omNext;
  }
  throw new Error('never arrived');
}

/** The small-swing period of a pendulum by stepping it through half a swing. */
function pendulumOmega(L: number): number {
  const dt = 1e-4 * Math.sqrt(L / g);
  let th = 1e-3;
  let om = 0;
  let t = 0;
  for (let i = 0; i < 1e7; i += 1) {
    const al = (-g / L) * Math.sin(th);
    const thNext = th + om * dt + 0.5 * al * dt * dt;
    const omNext = om + 0.5 * (al + (-g / L) * Math.sin(thNext)) * dt;
    if (om < 0 && omNext >= 0) return Math.PI / (t + dt * (-om / (omNext - om)));
    th = thNext;
    om = omNext;
    t += dt;
  }
  throw new Error('never turned');
}

describe('classical mechanics level 8', () => {
  it('shares a load between springs by the force in each', TIME, () => {
    for (const { p, slide } of draws('clm-spring-series')) {
      const k = answerOf(slide)[0];
      // A load of 1 N: the stretches of the parts in line add up to the stretch of the whole.
      const stretch = p.k3 ? 1 / (n(p.k1) + n(p.k2)) + 1 / n(p.k3) : 1 / n(p.k1) + 1 / n(p.k2);
      expect(near(k * stretch, 1, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const { slide } of draws('clm-spring-combo-table')) {
      for (const [k1, k2, side, end] of filled(slide)) {
        if (!Number.isNaN(side)) expect(near(side, k1 + k2)).toBe(true);
        // End to end, a 1 N load stretches each part in turn.
        expect(near(end * (1 / k1 + 1 / k2), 1, 1e-9)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-spring-stretch-tree')) {
      const [x1, x2, x] = answerOf(slide);
      expect(near(n(p.k1) * x1, n(p.W)) && near(n(p.k2) * x2, n(p.W)) && near(x, x1 + x2)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spring-share-flow')) {
      const [, x, F1] = answerOf(slide);
      expect(near(n(p.k1) * x + n(p.k2) * x, n(p.W), 1e-9) && near(F1, n(p.k1) * x)).toBe(true);
    }
  });

  it('finds speeds in a spring’s well by stepping the motion', TIME, () => {
    for (const { p, slide } of draws('clm-spring-turning')) {
      const E = Number(/with \$([\d.]+)\\\\text\{ J\}/.exec(promptText(slide))?.[1]);
      const A = answerOf(slide)[0];
      expect(near(0.5 * n(p.k) * A * A, E, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const id of ['clm-spring-speed', 'clm-spring-well-flow']) {
      for (const { p, slide } of draws(id)) {
        const tri = p.tri as number[];
        const A = tri[2] * n(p.s);
        const x = tri[0] * n(p.s);
        const got = answerOf(slide);
        const v = id === 'clm-spring-speed' ? got[0] : got[2];
        expect(near(v, speedByStepping(n(p.w), A, x), 1e-5), `${id} ${JSON.stringify(p)}`).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-spring-energy-table')) {
      const E = 0.5 * n(p.k) * n(p.A) ** 2;
      for (const [x, U, K] of filled(slide)) {
        expect(near(U, 0.5 * n(p.k) * x * x, 1e-9) && near(U + K, E, 1e-9)).toBe(true);
      }
    }
  });

  it('steps simple harmonic motion to its greatest speed and acceleration', TIME, () => {
    for (const { p, slide } of draws('clm-shm-omega')) {
      const got = answerOf(slide)[0];
      const [w, k] = p.find === 'w' ? [got, n(p.m) * n(p.w) ** 2] : [n(p.w), got];
      expect(near(w * w * n(p.m), k, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-shm-tree')) {
      const [w, v, a] = answerOf(slide);
      const k = n(p.m) * n(p.w) ** 2;
      expect(near(w, Math.sqrt(k / n(p.m)), 1e-9)).toBe(true);
      expect(near(v, speedByStepping(w, n(p.A), 0), 1e-5) && near(a, (k * n(p.A)) / n(p.m), 1e-9)).toBe(true);
    }
    for (const { slide } of draws('clm-shm-table')) {
      for (const [A, w, v, a] of filled(slide)) expect(near(v, speedByStepping(w, A, 0), 1e-5) && near(a, w * w * A, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-shm-slider')) {
      const a = Number(/acceleration is \$([\d.]+)/.exec(promptText(slide))?.[1]);
      expect(near(n(p.w) ** 2 * answerOf(slide)[0], a, 1e-9)).toBe(true);
    }
  });

  it('times pendulums by stepping a small swing', TIME, () => {
    for (const { p, slide } of draws('clm-pend-omega')) {
      const got = answerOf(slide)[0];
      if (p.find === 'w') {
        // Asked to 2 decimal places: within half a last-place unit of the stepped swing.
        expect(within(got, pendulumOmega(n(p.L)), 0.005), JSON.stringify(p)).toBe(true);
      } else {
        expect(near(pendulumOmega(got), n(p.w), 1e-4), JSON.stringify(p)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-pend-slider')) expect(near(pendulumOmega(answerOf(slide)[0]), n(p.w), 1e-4)).toBe(true);
    for (const { p, slide } of draws('clm-pend-table')) {
      const rows = (p.rows as { blank: string }[]).map((r) => r.blank);
      filled(slide).forEach(([L, w], i) => {
        // A filled omega is to 2 decimal places; a filled length is exact.
        expect(rows[i] === 'w' ? within(w, pendulumOmega(L), 0.005) : near(pendulumOmega(L), w, 1e-4), JSON.stringify(p)).toBe(true);
      });
    }
    for (const { p, slide } of draws('clm-pend-ratio-flow')) {
      const [r, T2] = answerOf(slide);
      const L = 1;
      // Period from the stepped swing, before and after.
      expect(near(pendulumOmega(L) / pendulumOmega(L * n(p.f)), r, 1e-4) && near(T2, r * n(p.T), 1e-9)).toBe(true);
      expect(slide.kind === 'flow' && slide.answer[2]).toBe(r > 1 ? 'It runs slow' : 'It runs fast');
    }
  });

  it('swings a pendulum through a large angle by the full equation', TIME, () => {
    for (const id of ['clm-swing-speed', 'clm-swing-tree', 'clm-swing-flow']) {
      for (const { p, slide } of draws(id).slice(0, 80)) {
        const release = p.release as { c: number };
        const L = n(p.L);
        const got = answerOf(slide);
        const v = id === 'clm-swing-speed' ? got[0] : id === 'clm-swing-tree' ? got[1] : got[0];
        expect(near(v, swingByStepping(L, Math.acos(release.c)), 1e-5), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id !== 'clm-swing-speed') {
          const T = id === 'clm-swing-tree' ? got[2] : got[1];
          // At the bottom the string supports the weight and gives the inward acceleration v^2 / L.
          expect(near(T - n(p.m) * g, (n(p.m) * v * v) / L, 1e-6)).toBe(true);
        }
      }
    }
    for (const { slide } of draws('clm-swing-slider')) {
      const v = Number(/reaches \$([\d.]+)/.exec(promptText(slide))?.[1]);
      const h = answerOf(slide)[0];
      // Falling h from rest by stepping.
      let y = 0;
      let u = 0;
      const dt = 1e-5;
      while (y + u * dt + 0.5 * g * dt * dt < h) {
        y += u * dt + 0.5 * g * dt * dt;
        u += g * dt;
      }
      u = Math.sqrt(u * u + 2 * g * (h - y));
      expect(near(u, v, 1e-6)).toBe(true);
    }
  });
});
