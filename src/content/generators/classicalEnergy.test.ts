/**
 * Classical Mechanics level 4, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: spring energy by adding up the work of a force
 * that grows as it stretches, launches and slopes and buffers by stepping the
 * motion in small time steps, loops by the forces at the top of the circle,
 * and potential energy diagrams by scanning the curve itself.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';
import { classicalEnergyInternals } from './classicalEnergy';

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

/** A table's cells with its blanks filled from the answer, row by row. */
function filled(slide: Slide): number[][] {
  if (slide.kind !== 'table') throw new Error('not a table');
  const fill = [...slide.answer];
  return slide.rows.map((row) => row.map((cell) => Number(cell ?? fill.shift())));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;

/** Work to stretch a spring by x, adding k s ds over 10 000 small pieces (exact for a straight-line force at the midpoints). */
function springWork(k: number, x: number): number {
  const steps = 10_000;
  const ds = x / steps;
  let w = 0;
  for (let i = 0; i < steps; i += 1) w += k * (i + 0.5) * ds * ds;
  return w;
}

/** A body moving at v into a spring of stiffness k, stepped until it stops; returns the squash. */
function squash(m: number, v: number, k: number): number {
  const dt = Math.sqrt(m / k) / 20_000;
  let x = 0;
  let u = v;
  for (;;) {
    const a = (k * x) / m;
    const next = u - a * dt;
    // In the last part-step the deceleration hardly changes: stop within it.
    if (next <= 0) return x + (u * u) / (2 * a);
    x += ((u + next) / 2) * dt;
    u = next;
  }
}

/** Fall from rest through a drop h, stepped; returns the speed at the bottom. */
function fallSpeed(u: number, h: number): number {
  const dt = 1e-5;
  let y = 0;
  let v = u;
  for (;;) {
    const ny = y + v * dt + 0.5 * g * dt * dt;
    if (ny >= h) {
      const s = (-v + Math.sqrt(v * v + 2 * g * (h - y))) / g;
      return v + g * s;
    }
    y = ny;
    v += g * dt;
  }
}

describe('classical mechanics level 4', () => {
  it('stores the work done stretching a spring', TIME, () => {
    for (const { p, slide } of draws('clm-hooke')) {
      const k = n(p.k);
      const got = answerOf(slide)[0];
      if (p.find === 'F') expect(near(got, (k * n(p.x)) / 100)).toBe(true);
      else expect(near(k * (got / 100), (k * n(p.x)) / 100)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spring-energy')) {
      expect(near(answerOf(slide)[0], springWork(n(p.k), n(p.x) / 100), 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spring-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const E = 0.5 * n(p.k) * (0.02 * n(p.steps)) ** 2;
      expect(near(springWork(n(p.k), slide.answer), E, 1e-6)).toBe(true);
    }
    for (const { slide } of draws('clm-spring-table')) {
      for (const [k, x, F, E] of filled(slide)) expect(near(F, k * x) && near(E, springWork(k, x), 1e-6)).toBe(true);
    }
  });

  it('carries energy between springs, heights and speeds', TIME, () => {
    const { launchK, bumperK } = classicalEnergyInternals;
    for (const { p, slide } of draws('clm-launch-tree')) {
      const m = n(p.m);
      const [E, v, h] = answerOf(slide);
      const k = launchK(p as never);
      expect(near(E, springWork(k, n(p.x)), 1e-6)).toBe(true);
      // Launched at v, it rises to h: the fall from h gives back v.
      expect(near(fallSpeed(0, h), v, 1e-6) && near(0.5 * m * v * v, E, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-ramp-speed')) {
      const drop = 2.5 * (n(p.c) ** 2 - n(p.a) ** 2);
      expect(near(answerOf(slide)[0], fallSpeed(7 * n(p.a), drop), 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-bumper-flow')) {
      const [E, v, x] = answerOf(slide);
      const h = 2.5 * n(p.j) ** 2;
      expect(near(E, n(p.m) * g * h) && near(v, fallSpeed(0, h), 1e-6)).toBe(true);
      expect(near(squash(n(p.m), v, bumperK(p as never)), x, 1e-3), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-track-table')) {
      const H = 2.5 * n(p.c) ** 2;
      for (const [h, v] of filled(slide)) expect(near(fallSpeed(0, H - h), v, 1e-6) || (h === H && v === 0)).toBe(true);
    }
  });

  it('turns a car or a ball at the top and bottom of a vertical circle', TIME, () => {
    for (const { p, slide } of draws('clm-loop-top')) {
      const r = 5 * n(p.j) ** 2;
      const got = answerOf(slide)[0];
      // At the least speed the track pushes nothing: the weight alone is the centripetal force.
      const vTop = p.find === 'v' ? got : Math.sqrt(2 * g * (got - 2 * r));
      expect(near((vTop * vTop) / r - g, 0, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-loop-tree')) {
      const [bottom, top, R] = answerOf(slide);
      const m = n(p.m);
      const r = n(p.r);
      expect(near(Math.sqrt(bottom), fallSpeed(0, n(p.h)), 1e-6)).toBe(true);
      expect(near(Math.sqrt(top), fallSpeed(0, n(p.h) - 2 * r), 1e-6)).toBe(true);
      expect(near(R + m * g, (m * top) / r, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-loop-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const r = n(p.r);
      const vTop = fallSpeed(0, n(p.halves) / 2 - 2 * r);
      // The push needed at the top is m(v^2/r - g); a negative one is a track that would have to pull.
      expect(slide.answer[2].startsWith('Yes')).toBe((vTop * vTop) / r - g > 0);
    }
    for (const { p, slide } of draws('clm-whirl-tension')) {
      const T = answerOf(slide)[0];
      const m = n(p.m);
      const inward = p.at === 'bottom' ? T - m * g : T + m * g;
      expect(near(inward, (m * n(p.v2)) / n(p.r), 1e-9)).toBe(true);
    }
  });

  it('reads a potential energy diagram off the curve', TIME, () => {
    const { uAt } = classicalEnergyInternals;
    /** Every x on a fine grid where the particle may be: U no more than E. */
    const allowed = (U: number[], E: number) => Array.from({ length: 8001 }, (_, i) => i / 1000).filter((x) => uAt(U, x) <= E + 1e-9);
    for (const { p, slide } of draws('clm-pe-turning')) {
      const U = p.U as number[];
      const E = n(p.E);
      const x = answerOf(slide)[0];
      expect(near(uAt(U, x), E, 1e-9)).toBe(true);
      // The valley's edge on the side it moves towards.
      const inValley = allowed(U, E);
      expect(near(x, p.side === 'right' ? Math.max(...inValley) : Math.min(...inValley), 1e-3)).toBe(true);
    }
    for (const { p, slide } of draws('clm-pe-speed')) {
      const U = p.U as number[];
      const K = n(p.E) - uAt(U, n(p.at));
      const got = answerOf(slide)[0];
      expect(near(p.hard ? 0.5 * n(p.m) * got * got : got, K, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-pe-force')) {
      const U = p.U as number[];
      const x = n(p.seg) + 0.5;
      const dx = 1e-4;
      expect(near(answerOf(slide)[0], -(uAt(U, x + dx) - uAt(U, x - dx)) / (2 * dx), 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-pe-fastest')) {
      const U = p.U as number[];
      const got = answerOf(slide)[0];
      const points = p.points as number[];
      for (const x of points) expect(uAt(U, got)).toBeLessThanOrEqual(uAt(U, x));
    }
  });

  it('prices lifting in power, efficiency and battery time', TIME, () => {
    for (const { p, slide } of draws('clm-lift-power')) {
      // Force mg at speed h/t.
      expect(near(answerOf(slide)[0], n(p.m) * g * (n(p.h) / n(p.t)), 1e-9)).toBe(true);
    }
    for (const { slide } of draws('clm-efficiency-table')) {
      for (const [input, out, pct] of filled(slide)) expect(near(out / input, pct / 100, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-drone-flow')) {
      const [E, t, mins] = answerOf(slide);
      expect(near(E, n(p.wh) * 3600) && near(t * n(p.P), E, 1e-9) && near(mins * 60, t, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-motor-tree')) {
      const [out, input, t] = answerOf(slide);
      expect(near(out, n(p.m) * g * n(p.h), 1e-9) && near(out / input, n(p.pct) / 100, 1e-9) && near(n(p.P) * t, input, 1e-9)).toBe(true);
    }
  });
});
