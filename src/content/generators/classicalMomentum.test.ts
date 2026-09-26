/**
 * Classical Mechanics level 5, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: impulse by adding up the force over small slices
 * of time, bounces by stepping the ball's rise, collisions by conserving each
 * component of momentum and never gaining kinetic energy, the rocket equation
 * by burning the fuel a gram at a time, and streams of hits one hit at a time.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;
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
  return slide.rows.map((row) => row.map((cell) => Number(cell ?? fill.shift())));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
/** Absolute closeness, for an answer rounded to a stated precision. */
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-6;

/** The pulse's force at time t (ms from its start), and its impulse by adding 20 000 slices. */
function sliced(F: number, rise: number, flat: number, fall: number): number {
  const at = (t: number) => (t < rise ? (F * t) / rise : t < rise + flat ? F : t < rise + flat + fall ? F * (1 - (t - rise - flat) / fall) : 0);
  const total = rise + flat + fall;
  const steps = 20_000;
  const dt = total / steps;
  let J = 0;
  for (let i = 0; i < steps; i += 1) J += at((i + 0.5) * dt) * dt;
  return J / 1000;
}

/** Height reached rising from speed v, stepped in time. */
function rise(v: number): number {
  const dt = 1e-5;
  let y = 0;
  let u = v;
  while (u - g * dt > 0) {
    y += (u - (g * dt) / 2) * dt;
    u -= g * dt;
  }
  return y + (u * u) / (2 * g);
}

describe('classical mechanics level 5', () => {
  it('adds up impulse slice by slice', TIME, () => {
    for (const id of ['clm-impulse-area', 'clm-impulse-tree']) {
      for (const { p, slide } of draws(id)) {
        const J = sliced(n(p.F), n(p.rise), n(p.flat), n(p.fall));
        const got = answerOf(slide);
        expect(near(got[0], J, 1e-6), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id === 'clm-impulse-tree') expect(near(n(p.m) * got[1], J, 1e-6)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-avg-force')) {
      // Velocity from +u to -v: the force times the time is the whole change.
      expect(near(answerOf(slide)[0] * (n(p.t) / 1000), n(p.m) * (n(p.u) - -n(p.v)), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-peak-slider')) {
      const F = answerOf(slide)[0];
      const T = n(p.T);
      expect(near(sliced(F, T / 2, 0, T / 2), (50 * n(p.steps) * T) / 2000, 1e-6)).toBe(true);
    }
  });

  it('bounces with the speed cut by e', TIME, () => {
    for (const id of ['clm-bounce-height', 'clm-bounce-tree']) {
      for (const { p, slide } of draws(id)) {
        const drop = 2.5 * n(p.j) ** 2;
        const land = Math.sqrt(2 * g * drop);
        const got = answerOf(slide);
        const h = id === 'clm-bounce-height' ? got[0] : got[2];
        expect(near(h, rise(n(p.e) * land), 1e-6), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id === 'clm-bounce-tree') expect(near(got[0], land, 1e-9) && near(got[1], n(p.e) * land, 1e-9)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-restitution')) {
      const e = answerOf(slide)[0];
      // From heights, e is asked to 2 decimal places: within half a last-place unit of
      // the speed that rises h2 over the speed that fell h1.
      if (p.fromHeights) expect(within(e, Math.sqrt(2 * g * n(p.h2)) / Math.sqrt(2 * g * n(p.h1)), 0.005), JSON.stringify(p)).toBe(true);
      else expect(near(e * n(p.u), n(p.e) * n(p.u), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-collision-flow')) {
      const [sep, vA, vB] = answerOf(slide);
      const { mA, mB, uA, e } = p as { mA: number; mB: number; uA: number; e: number };
      expect(near(mA * vA + mB * vB, mA * uA, 1e-9) && near(vB - vA, e * uA, 1e-9) && near(sep, vB - vA, 1e-9)).toBe(true);
      expect(0.5 * mA * vA ** 2 + 0.5 * mB * vB ** 2).toBeLessThanOrEqual(0.5 * mA * uA ** 2 + 1e-9);
    }
  });

  it('keeps each part of momentum in two dimensions', TIME, () => {
    for (const { p, slide } of draws('clm-momentum-table')) {
      for (const [m, vx, vy, px, py] of filled(slide)) expect(near(px, m * vx) && near(py, m * vy), JSON.stringify(p)).toBe(true);
    }
    for (const id of ['clm-merge-tree', 'clm-merge-angle']) {
      for (const { p, slide } of draws(id)) {
        const tri = p.tri as number[];
        const vA = (n(p.k) * tri[0]) / n(p.mA);
        const vB = (n(p.k) * tri[1]) / n(p.mB);
        const px = n(p.mA) * vA;
        const py = n(p.mB) * vB;
        const got = answerOf(slide);
        if (id === 'clm-merge-tree') expect(near(got[0], px) && near(got[1], py) && near(got[2] * (n(p.mA) + n(p.mB)), Math.hypot(px, py), 1e-9)).toBe(true);
        else expect(near(Math.atan(got[0]), Math.atan2(py, px), 1e-9)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-glance-tree')) {
      const [vx, vy, v] = answerOf(slide);
      // Equal masses: momentum east and north before equals after.
      expect(near(n(p.ax) + vx, n(p.u)) && near(n(p.ay) + vy, 0) && near(v, Math.hypot(vx, vy), 1e-9)).toBe(true);
      expect(0.5 * (n(p.ax) ** 2 + n(p.ay) ** 2 + v * v)).toBeLessThanOrEqual(0.5 * n(p.u) ** 2 + 1e-9);
    }
  });

  it('burns a rocket’s fuel a little at a time', TIME, () => {
    for (const { p, slide } of draws('clm-rocket-dv')) {
      const m0 = n(p.R) * 100;
      const m1 = 100;
      let m = m0;
      let v = 0;
      const dm = 0.01;
      // Throwing dm back at u relative to the rocket; the midpoint mass makes each step exact to second order.
      while (m - dm >= m1 - 1e-9) {
        v += (n(p.u) * dm) / (m - dm / 2);
        m -= dm;
      }
      expect(near(answerOf(slide)[0], v, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const id of ['clm-rocket-thrust', 'clm-rocket-flow']) {
      for (const { p, slide } of draws(id)) {
        const T = n(p.u) * n(p.rate);
        const got = answerOf(slide);
        const a = id === 'clm-rocket-flow' ? got[2] : p.hard ? got[0] : NaN;
        if (id === 'clm-rocket-thrust' && !p.hard) expect(near(got[0], T)).toBe(true);
        else expect(near(n(p.m) * a + n(p.m) * g, T, 1e-9)).toBe(true);
      }
    }
    for (const { slide } of draws('clm-rocket-table')) {
      for (const [u, r, T] of filled(slide)) expect(near(u * r, T)).toBe(true);
    }
  });

  it('prints the given values a textbook would', TIME, () => {
    const places = (v: number, dp: number) => Math.abs(v * 10 ** dp - Math.round(v * 10 ** dp)) < 1e-6;
    for (const { p } of draws('clm-peak-slider')) expect(places((50 * n(p.steps) * n(p.T)) / 2000, 1), JSON.stringify(p)).toBe(true);
    for (const { p } of draws('clm-restitution')) {
      if (p.fromHeights) expect(Number.isInteger(n(p.h1)) && places(n(p.h2), 1), JSON.stringify(p)).toBe(true);
      else expect(places(n(p.e) * n(p.u), 1), JSON.stringify(p)).toBe(true);
    }
    for (const id of ['clm-merge-tree', 'clm-merge-angle']) {
      for (const { p } of draws(id)) {
        const tri = p.tri as number[];
        expect(places((n(p.k) * tri[0]) / n(p.mA), 1) && places((n(p.k) * tri[1]) / n(p.mB), 1), `${id} ${JSON.stringify(p)}`).toBe(true);
      }
    }
    for (const { p } of draws('clm-gas-tree')) if (p.find === 'T') expect(Number.isInteger(n(p.kPa)), JSON.stringify(p)).toBe(true);
  });

  it('pushes with a stream of hits, a gas and light', TIME, () => {
    for (const { p, slide } of draws('clm-stream-force')) {
      // One second of hits, each an impulse.
      let J = 0;
      for (let i = 0; i < n(p.n); i += 1) J += n(p.m) * (n(p.v) - (p.bounce ? -n(p.v) : 0));
      expect(near(answerOf(slide)[0], J, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-gas-tree')) {
      const got = answerOf(slide);
      if (p.find === 'T') {
        // Given the pressure: pV exactly, and T to 3 significant figures (a whole kelvin here).
        const [V, pV, T] = got;
        expect(near(V, n(p.L) / 1000, 1e-9) && near(pV, n(p.kPa) * 1000 * V, 1e-9), JSON.stringify(p)).toBe(true);
        expect(within(T, pV / (n(p.n) * 8.3), 0.5), JSON.stringify(p)).toBe(true);
        continue;
      }
      const [pV, V, pk] = got;
      expect(near(pV, n(p.n) * 8.3 * n(p.T), 1e-9) && near(V, n(p.L) / 1000, 1e-9)).toBe(true);
      expect(near(pk * 1000 * V, n(p.n) * 8.3 * n(p.T), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-light-force')) {
      const F = ((p.mirror ? 2 : 1) * n(p.P)) / 3e8;
      expect(near(answerOf(slide)[0] * 1e-6, F, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-sail-flow')) {
      const [P, F, a] = answerOf(slide);
      expect(near(P, n(p.I) * n(p.A)) && near(F * 1e-6, (2 * P) / 3e8, 1e-9) && near((a / 1000) * n(p.m), F * 1e-6, 1e-9)).toBe(true);
    }
  });
});
