/**
 * Classical Mechanics level 1, checked against the physics.
 *
 * The generic sweep proves each slide agrees with itself. Here every answer is
 * read back off the rendered slide (the value typed, the table or tree filled,
 * the slider's value, the flow's path) and compared with the same quantity
 * worked out afresh from the question's numbers, by a different route where
 * there is one: braking distances by stepping the motion finely, average speeds
 * from times rather than the 2ab/(a + b) shortcut, traffic by moving cars one
 * cell at a time.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;
const TIME = { timeout: 60_000 };

function draws(id: string): { p: Record<string, unknown>; slide: Slide; difficulty: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const p = generator.sample(makeRng(seed), difficulty);
      return { p: p as unknown as Record<string, unknown>, slide: generator.render(p), difficulty };
    }),
  );
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** The numbers a slide's answer holds, in order. */
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
      return slide.answer.map((label) => Number(label.replace(/\$/g, '')));
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

function expectAll(id: string, want: (p: Record<string, unknown>) => number[]): void {
  for (const { p, slide } of draws(id)) {
    const got = answerOf(slide);
    const expected = want(p);
    expect(got.length, `${id} ${JSON.stringify(p)}`).toBe(expected.length);
    got.forEach((v, i) => expect(close(v, expected[i]), `${id} ${JSON.stringify(p)}: slot ${i} is ${v}, want ${expected[i]}`).toBe(true));
  }
}

const n = (v: unknown) => v as number;

/** Distance to stop from u at deceleration a, by stepping the motion in tiny steps (trapezium rule). */
function brakeByStepping(u: number, a: number): number {
  const dt = 1e-4;
  let v = u;
  let s = 0;
  while (v > 0) {
    const next = Math.max(0, v - a * dt);
    const step = v > a * dt ? dt : v / a;
    s += ((v + next) / 2) * step;
    v = next;
  }
  return s;
}

describe('classical mechanics level 1', () => {
  it('converts speeds with 1 m/s = 3600 m per hour', TIME, () => {
    expectAll('clm-kmh-convert', (p) => [p.to === 'ms' ? (n(p.v) * 3600) / 1000 / 3.6 : (n(p.v) * 3600) / 1000]);
  });

  it('times a lap as metres over metres per second, to 1 decimal place', TIME, () => {
    for (const { p, slide } of draws('clm-lap-time')) {
      const metres = n(p.L) * 1000;
      // Easy: seconds from km/h turned into m/s. Hard: m/s from the time, turned into km/h.
      const want = p.find === 't' ? metres / (n(p.given) / 3.6) : (metres / n(p.given)) * 3.6;
      expect(Math.abs(answerOf(slide)[0] - want), JSON.stringify(p)).toBeLessThanOrEqual(0.05 + 1e-6);
      // The lap length is printed to one decimal place of a kilometre, the speed or time whole.
      expect(Number.isInteger(n(p.L) * 10) && Number.isInteger(n(p.given)), JSON.stringify(p)).toBe(true);
    }
  });

  it('turns a time gap into a distance', TIME, () => {
    expectAll('clm-gap-slider', (p) => [(n(p.v) * n(p.tenths)) / 10]);
  });

  it('averages over total time, pit stops included', TIME, () => {
    expectAll('clm-stint-tree', (p) => {
      const d1 = n(p.v1) * n(p.t1);
      const d2 = n(p.v2) * n(p.t2);
      const T = n(p.t1) + n(p.t2) + n(p.pit);
      return [d1, d2, d1 + d2, T, (d1 + d2) / T];
    });
  });

  it('averages equal distances through the times they take', TIME, () => {
    expectAll('clm-equal-halves', (p) => {
      const d = 1000;
      const T = d / n(p.first) + d / n(p.second);
      return [p.find === 'avg' ? (2 * d) / T : n(p.second)];
    });
    // And the second speed really gives the stated average.
    for (const { p, slide } of draws('clm-equal-halves')) {
      if (p.find !== 'second') continue;
      const v2 = answerOf(slide)[0];
      const T = 1 / n(p.first) + 1 / v2;
      const avg = 2 / T;
      expect(close(avg, (2 * n(p.first) * n(p.second)) / (n(p.first) + n(p.second)))).toBe(true);
    }
  });

  it('walks the lap-two flow through the times', TIME, () => {
    for (const { p, slide } of draws('clm-avg-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const L = n(p.L);
      const t1 = L / n(p.v1);
      const t2 = L / n(p.v2);
      const values = slide.answer.filter((a) => a.startsWith('$')).map((a) => Number(a.replace(/\$/g, '')));
      expect(values).toEqual([t1 + t2, t1, L / t2]);
      // The target stated in the prompt is the whole race over the whole time.
      const prompt = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
      expect(prompt).toContain(`$${Number(((2 * L) / (t1 + t2)).toFixed(6))}\\text{ m s}^{-1}$ over both laps`);
    }
  });

  it('fills the stage table from d = vt, and the whole journey from totals', TIME, () => {
    for (const { p, slide } of draws('clm-avg-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const rows = p.rows as { v: number; t: number; blank: 'd' | 't' | 'v' }[];
      const want: number[] = rows.map((r) => (r.blank === 'd' ? r.v * r.t : r.blank === 't' ? r.t : r.v));
      if (p.total) {
        const D = rows.reduce((s, r) => s + r.v * r.t, 0);
        const T = rows.reduce((s, r) => s + r.t, 0);
        want.push(D, D / T);
      }
      answerOf(slide).forEach((v, i) => expect(close(v, want[i])).toBe(true));
    }
  });

  it('gives relative velocity as B minus A', TIME, () => {
    expectAll('clm-rel-velocity', (p) => [n(p.b) - n(p.a)]);
  });

  it('finds the meeting time by moving both until the gap closes', TIME, () => {
    for (const { p, slide } of draws('clm-meet-time')) {
      const t = answerOf(slide)[0];
      const gap = (p.chase ? n(p.v1) - n(p.v2) : n(p.v1) + n(p.v2)) * n(p.t);
      // After t seconds one has closed the whole gap, with the other's motion counted.
      const closed = p.chase ? n(p.v1) * t - n(p.v2) * t : n(p.v1) * t + n(p.v2) * t;
      expect(close(closed, gap)).toBe(true);
    }
  });

  it('puts the meeting point where both runners are at once', TIME, () => {
    for (const { p, slide } of draws('clm-meet-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider');
      const x = slide.answer;
      const d = slide.max;
      const tA = x / n(p.vA);
      const tB = (d - x) / n(p.vB) + n(p.head);
      expect(close(tA, tB), JSON.stringify(p)).toBe(true);
    }
  });

  it('overtakes by gaining both lengths and gaps', TIME, () => {
    expectAll('clm-overtake-tree', (p) => {
      const gain = n(p.behind) + n(p.car) + n(p.lorry) + n(p.ahead);
      const t = gain / n(p.r);
      return [gain, n(p.r), t, (n(p.vl) + n(p.r)) * t];
    });
  });

  it('brakes over the distance stepping the motion gives', TIME, () => {
    for (const { p, slide } of draws('clm-braking')) {
      const got = answerOf(slide)[0];
      if (p.find === 'd') expect(Math.abs(got - brakeByStepping(n(p.v), n(p.a)))).toBeLessThan(1e-2);
      else expect(close(got, n(p.a))).toBe(true);
    }
  });

  it('scales braking distance with the square of the speed', TIME, () => {
    for (const { p, slide } of draws('clm-speed-squared')) {
      const got = answerOf(slide)[0];
      const a = ((n(p.v1) / 3.6) ** 2) / (2 * n(p.d1));
      expect(Math.abs(got - (n(p.v2) / 3.6) ** 2 / (2 * a))).toBeLessThan(1e-9);
    }
  });

  it('prints distances and decelerations a textbook would, one decimal place at most', TIME, () => {
    const oneDp = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;
    for (const id of ['clm-thinking', 'clm-braking', 'clm-stopping-tree', 'clm-stop-flow']) {
      for (const { p } of draws(id)) {
        if (p.a !== undefined) expect(oneDp(n(p.a)), `${id} ${JSON.stringify(p)}`).toBe(true);
        if (id === 'clm-thinking' && p.find === 'tr') expect(oneDp((n(p.v) * n(p.tr)) / 10), JSON.stringify(p)).toBe(true);
        if (id === 'clm-braking' && p.find === 'a') expect(oneDp(n(p.v) ** 2 / (2 * n(p.a))), JSON.stringify(p)).toBe(true);
      }
    }
  });

  it('adds thinking and braking distances, and says rightly whether the car stops', TIME, () => {
    expectAll('clm-thinking', (p) => [p.find === 'd' ? (n(p.v) * n(p.tr)) / 10 : n(p.tr) / 10]);
    expectAll('clm-stopping-tree', (p) => {
      const think = (n(p.v) * n(p.tr)) / 10;
      const brake = brakeByStepping(n(p.v), n(p.a));
      return [think, brake, think + brake].map((v) => Math.round(v * 100) / 100);
    });
    for (const { p, slide } of draws('clm-stop-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const stop = (n(p.v) * n(p.tr)) / 10 + brakeByStepping(n(p.v), n(p.a));
      const verdict = slide.answer[slide.answer.length - 1];
      expect(verdict.startsWith('Yes'), JSON.stringify(p)).toBe(n(p.D) > stop);
    }
  });

  it('steps position with the old speed, and speed with the acceleration', TIME, () => {
    for (const { p, slide } of draws('clm-step-table')) {
      let x = n(p.x0);
      let v = n(p.v0);
      const want: number[] = [];
      for (let k = 0; k < 3; k += 1) {
        const nx = x + v * n(p.dt);
        v += n(p.a) * n(p.dt);
        x = nx;
        want.push(x, v);
      }
      answerOf(slide).forEach((got, i) => expect(close(got, want[i]), JSON.stringify(p)).toBe(true));
    }
  });

  it('moves traffic cell by cell without a car ever reaching the one in front', TIME, () => {
    for (const { p, slide } of draws('clm-traffic-table')) {
      const cars = p.cars as { x: number; v: number }[];
      const want: number[] = [];
      cars.forEach((car, i) => {
        let v = Math.min(car.v + 1, 5);
        // Move one cell at a time until the next cell is taken by the car ahead's old cell.
        let moved = 0;
        while (moved < v && (i === 0 || car.x + moved + 1 < cars[i - 1].x)) moved += 1;
        v = moved;
        want.push(v, car.x + v);
      });
      answerOf(slide).forEach((got, i) => expect(got, JSON.stringify(p)).toBe(want[i]));
    }
  });

  it('reads velocity and acceleration off positions at equal steps', TIME, () => {
    for (const { p, slide } of draws('clm-step-velocity')) {
      const at = (t: number) => n(p.x0) + n(p.u) * t + 0.5 * n(p.a) * t * t;
      const k = n(p.k);
      const dt = n(p.dt);
      const got = answerOf(slide)[0];
      // Average velocity over a step is the true velocity at its middle, for constant acceleration.
      if (p.find === 'v') expect(close(got, n(p.u) + n(p.a) * (k + 0.5) * dt)).toBe(true);
      else expect(close(got, (at((k + 2) * dt) - 2 * at((k + 1) * dt) + at(k * dt)) / dt ** 2)).toBe(true);
    }
  });

  it('measures how far stepping falls short of half a T squared', TIME, () => {
    for (const { p, slide } of draws('clm-step-error-tree')) {
      let x = 0;
      let v = 0;
      for (let k = 0; k < n(p.N); k += 1) {
        x += v * n(p.dt);
        v += n(p.a) * n(p.dt);
      }
      const T = n(p.N) * n(p.dt);
      const truth = 0.5 * n(p.a) * T * T;
      const got = answerOf(slide);
      expect(close(got[0], x)).toBe(true);
      expect(close(got[1], truth)).toBe(true);
      expect(close(got[2], 0.5 * n(p.a) * n(p.dt) * T)).toBe(true);
    }
  });

  it('fills the unit table both ways', TIME, () => {
    for (const { p, slide } of draws('clm-speed-table')) {
      const rows = p.rows as { v: number; blank: 'ms' | 'kmh' }[];
      answerOf(slide).forEach((got, i) => expect(close(got, rows[i].blank === 'ms' ? rows[i].v : rows[i].v * 3.6)).toBe(true));
    }
  });
});
