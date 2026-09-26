/**
 * Classical Mechanics level 2, checked against the physics.
 *
 * Every answer is read back off the rendered slide and compared with the
 * motion worked out afresh: projectiles by stepping the flight in small time
 * steps until they land, turning by counting revolutions step by step, and
 * circular motion from the change in velocity over a small arc. None of the
 * generator's own shortcuts (4.9t^2, 1.225k^2, v^2/2a) decides what is right.
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

/** The numbers a slide's answer holds, in order; a multiple of pi is read as its number. */
function answerOf(slide: Slide): number[] {
  switch (slide.kind) {
    case 'expression':
      return [Number(math.evaluate(slide.answer))];
    case 'slider':
      return [slide.answer];
    case 'tree':
    case 'table':
      return slide.answer.map((s) => (s.includes('\\pi') ? Number(s.replace('\\pi', '') || 1) * Math.PI : Number(s)));
    case 'flow':
      return slide.answer.filter((s) => s.startsWith('$')).map((s) => Number(s.replace(/\$/g, '')));
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
/** Absolute closeness, for an answer rounded to a stated precision. */
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-6;

/** A flight stepped at 1e-4 s (exact for constant acceleration with the average-velocity step) until it comes back down to `floor`. */
function fly(ux: number, uy: number, floor: number): { t: number; x: number; top: number; vy: number } {
  const dt = 1e-4;
  let t = 0;
  let y = 0;
  let vy = uy;
  let top = 0;
  for (;;) {
    const ny = y + vy * dt - 0.5 * g * dt * dt;
    if (ny < floor && t > 0) {
      // Finish the last partial step exactly: solve y + vy s - g s^2/2 = floor.
      const s = (vy + Math.sqrt(vy * vy + 2 * g * (y - floor))) / g;
      return { t: t + s, x: ux * (t + s), top, vy: Math.abs(vy - g * s) };
    }
    y = ny;
    vy -= g * dt;
    t += dt;
    top = Math.max(top, y);
  }
}

describe('classical mechanics level 2', () => {
  it('lands a sideways throw when the fall is done, and where, to the precision asked', TIME, () => {
    // Times to 2 decimal places, speeds and distances to 1: within half a last-place unit of the flight.
    for (const { p, slide } of draws('clm-fall-time')) {
      const f = fly(n(p.u), 0, -n(p.h));
      expect(within(answerOf(slide)[0], p.find === 't' ? f.t : f.x, p.find === 't' ? 0.005 : 0.05), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-horiz-tree')) {
      const f = fly(n(p.u), 0, -n(p.h));
      const [t, vy, R] = answerOf(slide);
      expect(within(t, f.t, 0.005) && within(vy, f.vy, 0.05) && within(R, f.x, 0.05), JSON.stringify(p)).toBe(true);
    }
  });

  it('prints the heights a textbook would, whole metres or one decimal place', TIME, () => {
    for (const id of ['clm-fall-time', 'clm-horiz-tree', 'clm-horiz-slider', 'clm-horiz-flow']) {
      for (const { p } of draws(id)) expect(Number.isInteger(n(p.h) * 10), `${id} ${JSON.stringify(p)}`).toBe(true);
    }
  });

  it('puts the landing mark, or the launch speed, where the flight says', TIME, () => {
    for (const { p, slide } of draws('clm-horiz-slider')) {
      const f = fly(p.findSpeed ? 1 : n(p.given), 0, -n(p.h));
      // To the nearest half: within a quarter of the true value.
      expect(within(answerOf(slide)[0], p.findSpeed ? n(p.given) / f.t : f.x, 0.25)).toBe(true);
    }
    for (const { p, slide } of draws('clm-horiz-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const f = fly(n(p.u), 0, -n(p.h));
      expect(slide.answer[2].startsWith('Yes')).toBe(f.x > n(p.D));
    }
  });

  it('splits a launch by its triangle', TIME, () => {
    for (const { p, slide } of draws('clm-launch-table')) {
      const rows = p.rows as { tri: { o: number; a: number; h: number }; k: number }[];
      const want = rows.flatMap(({ tri, k }) => {
        const angle = Math.atan2(tri.o, tri.a);
        const u = tri.h * k;
        return [u * Math.cos(angle), u * Math.sin(angle)];
      });
      answerOf(slide).forEach((v, i) => expect(near(v, want[i], 1e-9)).toBe(true));
    }
  });

  it('flies an angled launch for its time, height and range', TIME, () => {
    for (const id of ['clm-flight-tree', 'clm-range-flow']) {
      for (const { p, slide } of draws(id)) {
        const launch = p.launch as { tri: { o: number; a: number; h: number }; k: number } | null;
        let ux = n(p.ux);
        let uy = 4.9 * n(p.k);
        if (launch) {
          const u = (4.9 * launch.k * launch.tri.h) / launch.tri.o;
          const angle = Math.atan2(launch.tri.o, launch.tri.a);
          ux = u * Math.cos(angle);
          uy = u * Math.sin(angle);
        }
        const f = fly(ux, uy, 0);
        const got = answerOf(slide);
        const want = id === 'clm-range-flow' ? [f.t / 2, f.t, f.x] : launch ? [ux, uy, f.t, f.top, f.x] : [f.t, f.top, f.x];
        got.forEach((v, i) => expect(near(v, want[i], 1e-4), `${id} ${JSON.stringify(p)} slot ${i}: ${v} vs ${want[i]}`).toBe(true));
      }
    }
  });

  it('rises to the height the flight reaches', TIME, () => {
    for (const { p, slide } of draws('clm-max-height')) {
      const f = fly(0, 1.4 * n(p.m), -1);
      expect(near(answerOf(slide)[0], f.top, 1e-4), JSON.stringify(p)).toBe(true);
    }
  });

  it('converts spin rates through turns of 2 pi', TIME, () => {
    for (const { p, slide } of draws('clm-rpm-convert')) {
      const rpm = 30 * n(p.k);
      const rad = (rpm / 60) * 2 * Math.PI;
      expect(near(answerOf(slide)[0], p.to === 'rad' ? rad : rpm)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spin-table')) {
      const rows = p.rows as { halves: number; given: string }[];
      const want = rows.flatMap(({ halves, given }) => [given === 'rpm' ? halves / 2 : halves * 30, halves * Math.PI]);
      answerOf(slide).forEach((v, i) => expect(near(v, want[i])).toBe(true));
    }
  });

  it('moves a rim, and a belt, at r omega', TIME, () => {
    for (const { p, slide } of draws('clm-rim-speed')) {
      const r = n(p.cm) / 100;
      expect(near(answerOf(slide)[0], p.find === 'v' ? r * n(p.omega) : n(p.omega))).toBe(true);
    }
    for (const { p, slide } of draws('clm-gear-tree')) {
      const r1 = n(p.r1) / 100;
      const r2 = n(p.r2) / 100;
      // The belt covers the same length on each wheel in one second.
      const belt = r1 * n(p.w1);
      const got = answerOf(slide);
      expect(near(got[0], belt) && near(got[1] * r2, belt)).toBe(true);
      if (p.hard) expect(near(got[2], (r2 / 2) * got[1])).toBe(true);
    }
  });

  it('counts turns step by step while the spin changes', TIME, () => {
    const turn = (w0: number, a: number, t: number) => {
      const steps = 100000;
      const dt = t / steps;
      let w = w0;
      let th = 0;
      for (let i = 0; i < steps; i += 1) {
        th += (w + a * dt / 2) * dt;
        w += a * dt;
      }
      return { th, w };
    };
    for (const { p, slide } of draws('clm-spin-up')) {
      const a = n(p.quarters) / 4;
      expect(near(answerOf(slide)[0], p.find === 'w' ? turn(n(p.w0), a, n(p.t)).w : a, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spin-turns-tree')) {
      const a = (n(p.w) - n(p.w0)) / n(p.t);
      const { th } = turn(n(p.w0), a, n(p.t));
      const got = answerOf(slide);
      expect(near(got[0], a) && near(got[2], th, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spin-stop-slider')) {
      const a = n(p.quarters) / 4;
      const { th } = turn(n(p.w0), -a, n(p.w0) / a);
      expect(near(answerOf(slide)[0], th, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-spin-flow')) {
      const a = n(p.quarters) / 4;
      const { th, w } = turn(n(p.w0), a, n(p.t));
      if (slide.kind !== 'flow') throw new Error('not a flow');
      // The first step picks an equation, whose label is TeX too; the value is the second.
      const got = Number(slide.answer[1].replace(/\$/g, ''));
      expect(near(got, p.find === 'turns' ? th : w, 1e-6), JSON.stringify(p)).toBe(true);
    }
  });

  it('accelerates towards the centre by the turning of the velocity', TIME, () => {
    // The velocity turns through omega dt in dt; its change over dt, divided by dt, is the acceleration.
    const centreward = (v: number, r: number) => {
      const dt = 1e-6;
      const turned = (v / r) * dt;
      return (2 * v * Math.sin(turned / 2)) / dt;
    };
    for (const { p, slide } of draws('clm-centripetal')) {
      const got = answerOf(slide)[0];
      if (p.find === 'a') expect(near(got, centreward(n(p.v), n(p.r)), 1e-6)).toBe(true);
      else expect(near(got, n(p.v))).toBe(true);
    }
    for (const { p, slide } of draws('clm-circle-table')) {
      const rows = p.rows as { v: number; r: number; blank: string }[];
      const want = rows.map(({ v, r, blank }) => (blank === 'a' ? centreward(v, r) : blank === 'w' ? v / r : blank === 'v' ? v : r));
      answerOf(slide).forEach((got, i) => expect(near(got, want[i], 1e-6)).toBe(true));
    }
    for (const { p, slide } of draws('clm-g-force-flow')) {
      const v = 7 * n(p.j);
      const r = (10 * n(p.j) ** 2) / n(p.halves);
      const a = centreward(v, r);
      const got = answerOf(slide);
      expect(near(got[0], a, 1e-6) && near(got[1], a / g, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-radius-slider')) {
      const r = answerOf(slide)[0];
      expect(near(centreward(n(p.v), r), n(p.a), 1e-6)).toBe(true);
    }
  });
});
