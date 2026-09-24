/**
 * The Kinematics generators, checked against physics of their own.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * suvat answer from the wrong equation, an area that forgot a half, or a
 * catching-up time when the two were nowhere near each other. So each check
 * here reaches the answer by a route the generators do not take: motions are
 * stepped through time, areas are summed by Simpson's rule over the graph as
 * drawn, gradients are read by difference, equations are chosen by reading
 * which letters they hold, and meetings are found by watching the gap close.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];
const G = 9.8;

function draws<P>(id: string) {
  const generator = registry[id] as unknown as Generator<P>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed, difficulty };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'kn-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** The graph through the corners, interpolated here rather than imported. */
function drawn(corners: [number, number][]) {
  return (t: number) => {
    const found = corners.findIndex(([x], i) => i > 0 && t <= x);
    const k = found === -1 ? corners.length - 1 : found;
    const [x0, y0] = corners[k - 1];
    const [x1, y1] = corners[k];
    return y0 + ((y1 - y0) * (t - x0)) / (x1 - x0);
  };
}

/** Simpson's rule on each unit strip, exact for straight stages between whole times. */
function simpson(f: (t: number) => number, a: number, b: number): number {
  const steps = Math.round((b - a) * 200);
  const h = (b - a) / steps;
  let total = 0;
  for (let i = 0; i <= steps; i += 1) total += (i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (total * h) / 3;
}

/** Position after `t` seconds, stepped through time rather than from a formula. */
function stepped(u: number, a: number, t: number): { s: number; v: number } {
  const n = 2000;
  const dt = t / n;
  let s = 0;
  let v = u;
  for (let i = 0; i < n; i += 1) {
    // Exact for constant acceleration: the average velocity over the step.
    s += (v + a * dt / 2) * dt;
    v += a * dt;
  }
  return { s, v };
}

/* ---------- exactness, for every generator in the file ---------- */

describe('every kinematics answer', () => {
  const ids = Object.keys(registry).filter((id) => id.startsWith('kin-') && !id.endsWith('+choice'));

  it('is a whole number or one decimal place, and carries no unit', () => {
    const tenth = (token: string) => /^-?\d+(\.\d)?$/.test(token);
    for (const id of ids) {
      for (const { slide, seed } of draws<unknown>(id)) {
        const where = `${id} seed ${seed}`;
        if (slide.kind === 'expression') expect(tenth(slide.answer), `${where}: ${slide.answer}`).toBe(true);
        if (slide.kind === 'slider') expect(slide.answer * 10 === Math.round(slide.answer * 10), where).toBe(true);
        if (slide.kind === 'tree' || slide.kind === 'table') {
          for (const token of slide.answer) expect(tenth(token), `${where}: ${token}`).toBe(true);
        }
        if (slide.kind === 'steps') {
          for (const { value } of slide.reductions) expect(tenth(value), `${where}: ${value}`).toBe(true);
        }
        if (slide.kind === 'tiles') {
          for (const token of [...slide.bank, slide.template]) expect(/\bm\b|m\/s/.test(token), `${where}: ${token}`).toBe(false);
        }
      }
    }
  }, 60_000);

  it('grades its own tree, table, tiles and flow answers right', () => {
    for (const id of ids) {
      for (const { slide, seed } of draws<unknown>(id).slice(0, 40)) {
        if (slide.kind === 'tree' || slide.kind === 'table' || slide.kind === 'tiles' || slide.kind === 'flow') {
          expect(verdict(slide, slide.answer), `${id} seed ${seed}`).toBe('correct');
        }
      }
    }
  });
});

/* ---------- level 1 ---------- */

describe('kin-disp', () => {
  it('walks the route a metre at a time', () => {
    for (const { params, slide, seed } of draws<{ stops: number[]; ask: string }>('kin-disp')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      let here = params.stops[0];
      let walked = 0;
      for (const stop of params.stops.slice(1)) {
        while (here !== stop) {
          here += Math.sign(stop - here);
          walked += 1;
        }
      }
      const expected = params.ask === 'distance' ? walked : here - params.stops[0];
      expect(Number(slide.answer), `seed ${seed}`).toBe(expected);
    }
  });
});

describe('kin-line-slider', () => {
  it('ends where the stages step it to', () => {
    for (const { params, slide, seed } of draws<{ start: number; moves: [number, number][] }>('kin-line-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const end = params.moves.reduce((s, [v, t]) => s + stepped(v, 0, t).s, params.start);
      expect(close(slide.answer, end), `seed ${seed}`).toBe(true);
      expect(slide.answer).toBeGreaterThanOrEqual(slide.min);
      expect(slide.answer).toBeLessThanOrEqual(slide.max);
    }
  });
});

describe('kin-mean-speed and kin-avg-tree', () => {
  it('divide the whole distance by the whole time', () => {
    for (const { params, slide, seed } of draws<{ d1: number; v1: number; d2: number; v2: number; rest: number }>('kin-mean-speed')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const time = params.d1 / params.v1 + params.d2 / params.v2 + params.rest;
      expect(close(Number(slide.answer), (params.d1 + params.d2) / time), `seed ${seed}`).toBe(true);
      expect(close(Number(slide.answer), (params.v1 + params.v2) / 2), `seed ${seed}: the mean of the speeds`).toBe(false);
    }
    for (const { params, slide, seed } of draws<{ legs: [number, number][]; bySpeed: boolean }>('kin-avg-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const dist = params.legs.reduce((sum, [x, t]) => sum + (params.bySpeed ? stepped(x, 0, t).s : x), 0);
      const time = params.legs.reduce((sum, [, t]) => sum + t, 0);
      expect(close(Number(slide.answer[slide.answer.length - 1]), dist / time), `seed ${seed}`).toBe(true);
    }
  });
});

describe('kin-avgvel-steps', () => {
  it('ends on the displacement over the time', () => {
    for (const { params, slide, seed } of draws<{ a: number; b: number; t1: number; t2: number }>('kin-avgvel-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(close(Number(last), (params.a - params.b) / (params.t1 + params.t2)), `seed ${seed}`).toBe(true);
    }
  });
});

interface GraphParams {
  corners: [number, number][];
  stage: number;
}

describe('graph gradients', () => {
  it('read the velocity or acceleration off the drawn graph by difference', () => {
    for (const id of ['kin-st-gradient', 'kin-vt-accel']) {
      for (const { params, slide, seed } of draws<GraphParams>(id)) {
        if (slide.kind !== 'expression') throw new Error('not an expression slide');
        const f = drawn(params.corners);
        const mid = (params.corners[params.stage][0] + params.corners[params.stage + 1][0]) / 2;
        const slope = (f(mid + 0.01) - f(mid - 0.01)) / 0.02;
        expect(close(Number(slide.answer), slope), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('mark the one stage that answers the question', () => {
    for (const { params, slide, seed } of draws<{ corners: [number, number][]; ask: string }>('kin-st-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const f = drawn(params.corners);
      const speedOf = (label: string) => {
        const parts = label.split('\\le').map((part) => Number(part.replace(/[^\d.-]/g, '')));
        const [a, b] = [parts[0], parts[2]];
        return (f(b) - f(a)) / (b - a);
      };
      const velocities = slide.options.map((o) => speedOf(o.label));
      const right = slide.options.findIndex((o) => o.id === slide.correctId);
      const speeds = velocities.map(Math.abs);
      const wanted = {
        rest: (k: number) => speeds[k] === 0,
        back: (k: number) => velocities[k] < 0,
        fastest: (k: number) => speeds[k] === Math.max(...speeds),
        slowest: (k: number) => speeds[k] === Math.min(...speeds.filter((s) => s > 0)),
      }[params.ask]!;
      const matching = velocities.map((_, k) => k).filter(wanted);
      expect(matching, `seed ${seed}`).toEqual([right]);
    }
  });
});

describe('kin-st-slider', () => {
  it('stops on a time the drawn graph agrees with', () => {
    for (const { params, slide, seed } of draws<{ corners: [number, number][]; ask: string }>('kin-st-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const f = drawn(params.corners);
      const t = slide.answer;
      if (params.ask === 'origin') expect(close(f(t), 0), `seed ${seed}`).toBe(true);
      if (params.ask === 'stops') {
        expect(close(f(t + 0.25), f(t)), `seed ${seed}`).toBe(true);
        expect(close(f(t - 0.25), f(t)), `seed ${seed}`).toBe(false);
      }
      if (params.ask === 'moves') {
        expect(close(f(t - 0.25), f(t)), `seed ${seed}`).toBe(true);
        expect(close(f(t + 0.25), f(t)), `seed ${seed}`).toBe(false);
      }
    }
  });
});

describe('kin-st-table', () => {
  it('fills each row by stepping the journey to that time', () => {
    for (const { params, slide, seed } of draws<{ s0: number; stages: [number, number][]; times: number[] }>('kin-st-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const at = (time: number) => {
        let s = params.s0;
        let left = time;
        for (const [v, d] of params.stages) {
          const run = Math.min(left, d);
          s += stepped(v, 0, run).s;
          left -= run;
        }
        return s;
      };
      const blanks = slide.rows.map((row, k) => (row[1] === null ? params.times[k] : undefined)).filter((t) => t !== undefined);
      expect(slide.answer.map(Number).every((value, k) => close(value, at(blanks[k]!))), `seed ${seed}`).toBe(true);
    }
  });
});

describe('areas under velocity-time graphs', () => {
  it('match Simpson over the graph as drawn', () => {
    for (const { params, slide, seed } of draws<{ corners: [number, number][] }>('kin-dist-area')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const T = params.corners[params.corners.length - 1][0];
      expect(close(Number(slide.answer), simpson(drawn(params.corners), 0, T)), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<{ corners: [number, number][]; ask: string }>('kin-net-disp')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const f = drawn(params.corners);
      const T = params.corners[params.corners.length - 1][0];
      const expected = params.ask === 'distance' ? simpson((t) => Math.abs(f(t)), 0, T) : simpson(f, 0, T);
      expect(Math.abs(Number(slide.answer) - expected), `seed ${seed}`).toBeLessThan(1e-3);
    }
    for (const { params, slide, seed } of draws<{ u: number; V: number; t1: number; t2: number; t3: number }>('kin-stages-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { u, V, t1, t2, t3 } = params;
      const f = drawn([
        [0, u],
        [t1, V],
        [t1 + t2, V],
        [t1 + t2 + t3, 0],
      ]);
      expect(close(Number(slide.answer[3]), simpson(f, 0, t1 + t2 + t3)), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<{ u: number; v: number; h: number }>('kin-trap-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const f = drawn([
        [0, params.u],
        [params.h, params.v],
      ]);
      expect(close(Number(slide.reductions[2].value), simpson(f, 0, params.h)), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<{ V: number; t1: number; t2: number; t3?: number }>('kin-twostage-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const { V, t1, t2, t3 = 0 } = params;
      const corners: [number, number][] = [
        [0, 0],
        [t1, V],
        [t1 + t2, V],
      ];
      if (t3 > 0) corners.push([t1 + t2 + t3, 0]);
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(close(Number(last), simpson(drawn(corners), 0, t1 + t2 + t3)), `seed ${seed}`).toBe(true);
    }
  });
});

describe('kin-speeding-flow', () => {
  it('says speeding up exactly when the speed grows a moment later', () => {
    for (const { params, slide, seed } of draws<{ v?: number; a?: number; corners?: [number, number][]; at: number }>('kin-speeding-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      let speedNow: number;
      let speedLater: number;
      if (params.corners === undefined) {
        speedNow = Math.abs(params.v!);
        speedLater = Math.abs(stepped(params.v!, params.a!, 0.01).v);
      } else {
        const f = drawn(params.corners);
        speedNow = Math.abs(f(params.at));
        speedLater = Math.abs(f(params.at + 0.01));
      }
      const [vs, as] = slide.answer;
      const said = as === 'Zero' ? 0 : (vs === 'Positive') === (as === 'Positive') ? 1 : -1;
      expect(said, `seed ${seed}`).toBe(Math.sign(Math.round((speedLater - speedNow) * 1e6)));
    }
  });
});

/* ---------- level 2 ---------- */

interface Motion {
  u: number;
  v: number;
  a: number;
  t: number;
  s: number;
}

/** A motion stepped through time lands where its s and v say. */
function checkMotion({ u, v, a, t, s }: Motion, where: string) {
  const run = stepped(u, a, t);
  expect(Math.abs(run.s - s), `${where}: s`).toBeLessThan(1e-6);
  expect(Math.abs(run.v - v), `${where}: v`).toBeLessThan(1e-6);
  expect(v, `${where}: turns back`).toBeGreaterThanOrEqual(0);
}

describe('the suvat generators', () => {
  it('hold motions that stepping through time agrees with, and answer the quantity asked', () => {
    for (const id of ['kin-vuat', 'kin-uvt', 'kin-solve-mixed', 'kin-suat-find']) {
      for (const { params, slide, seed } of draws<Motion & { find?: keyof Motion; asked?: keyof Motion }>(id)) {
        if (slide.kind !== 'expression') throw new Error('not an expression slide');
        checkMotion(params, `${id} seed ${seed}`);
        const key = params.asked ?? params.find ?? 's';
        expect(Number(slide.answer), `${id} seed ${seed}`).toBe(params[key]);
      }
    }
    for (const id of ['kin-suat-steps', 'kin-suat-tree']) {
      for (const { params, slide, seed } of draws<Motion>(id)) {
        checkMotion(params, `${id} seed ${seed}`);
        const last = slide.kind === 'steps' ? slide.reductions[slide.reductions.length - 1].value : slide.kind === 'tree' ? slide.answer[3] : '';
        expect(Number(last), `${id} seed ${seed}`).toBe(params.s);
      }
    }
  });

  it('keep v^2 = u^2 + 2as honest by stepping to the time it implies', () => {
    for (const id of ['kin-v2', 'kin-vsq-tree']) {
      for (const { params, slide, seed } of draws<{ u: number; v: number; a: number; s: number; find: 'v' | 's' | 'a' }>(id)) {
        const t = (params.v - params.u) / params.a;
        expect(t, `${id} seed ${seed}`).toBeGreaterThan(0);
        checkMotion({ ...params, t }, `${id} seed ${seed}`);
        const answer = slide.kind === 'expression' ? slide.answer : slide.kind === 'tree' ? slide.answer[3] : '';
        expect(Number(answer), `${id} seed ${seed}`).toBe(params[params.find]);
      }
    }
  });

  it('put the right values in the right blanks', () => {
    for (const { params, slide, seed } of draws<Motion & { find: string }>('kin-vuat-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const [x, y, z] = slide.answer.map((token) => Number(token.replace(/[()]/g, '')));
      const value = params.find === 'v' ? x + y * z : (x - y) / z;
      expect(value, `seed ${seed}`).toBe(params[params.find as keyof Motion]);
    }
    for (const { params, slide, seed } of draws<Motion & { find: string }>('kin-uvt-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const sum = slide.answer.find((token) => token.includes('+'))!.split('+').map(Number);
      expect(sum[0] + sum[1], `seed ${seed}`).toBe(params.u + params.v);
    }
  });
});

describe('choosing the equation', () => {
  /** The suvat letters an equation uses, read from its TeX. */
  const lettersOf = (tex: string) => new Set(tex.replace(/\\tfrac\{1\}\{2\}/g, '').match(/[suvat]/g) ?? []);
  const given = (p: { missing: string; asked: string }) => ['u', 'v', 'a', 't', 's'].filter((q) => q !== p.missing);

  it('picks the equation holding exactly the quantities in play', () => {
    for (const { params, slide, seed } of draws<{ missing: string; asked: string }>('kin-which-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect([...lettersOf(right.label)].sort(), `seed ${seed}`).toEqual(given(params).sort());
      for (const option of slide.options) {
        if (option.id === slide.correctId) continue;
        expect([...lettersOf(option.label)].sort(), `seed ${seed}: ${option.label}`).not.toEqual(given(params).sort());
      }
    }
  });

  it('walks the flow to that same equation', () => {
    for (const { params, slide, seed } of draws<{ missing: string; asked: string }>('kin-which-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      let step = slide.steps[0];
      let outcome = '';
      for (const label of slide.answer) {
        const branch = step.branches.find((b) => b.label === label)!;
        if (branch.outcome) outcome = branch.outcome;
        else step = slide.steps.find((s) => s.id === branch.to)!;
      }
      const tex = outcome.match(/\$([^$]+)\$/)![1];
      expect([...lettersOf(tex)].sort(), `seed ${seed}`).toEqual(given(params).sort());
    }
  });

  it('signs u, a and s against the positive direction', () => {
    for (const { params, slide, seed } of draws<{ kind: string; alongFirst: boolean; speed: number; accel: number; dist: number }>('kin-signs-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const [u, a, s] = slide.answer.map(Number);
      // The first motion is positive exactly when that direction is.
      expect(Math.sign(u), `seed ${seed}`).toBe(params.alongFirst ? 1 : -1);
      // Gravity and braking both act against the first motion.
      expect(Math.sign(a), `seed ${seed}`).toBe(-Math.sign(u));
      // A car ends ahead of where it braked; a stone ends below where it was thrown.
      expect(Math.sign(s), `seed ${seed}`).toBe(params.kind === 'brake' ? Math.sign(u) : -Math.sign(u));
      if (params.kind === 'brake') checkMotion({ u: params.speed, v: 0, a: -params.accel, t: params.speed / params.accel, s: params.dist }, `seed ${seed}`);
    }
  });
});

describe('gravity', () => {
  const height = (u: number, t: number) => stepped(u, -G, t).s;

  it('gives heights, velocities and landings that stepping under g agrees with', () => {
    for (const { params, slide, seed } of draws<{ k: number; t: number; ask: string }>('kin-grav-height')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const u = 4.9 * params.k;
      const answer = Number(slide.answer);
      const where = `seed ${seed}`;
      if (params.ask === 'height') expect(Math.abs(answer - height(u, params.t)), where).toBeLessThan(1e-6);
      if (params.ask === 'velocity') expect(Math.abs(answer - stepped(u, -G, params.t).v), where).toBeLessThan(1e-6);
      if (params.ask === 'impact') expect(Math.abs(answer - Math.abs(stepped(u, -G, params.t).v)), where).toBeLessThan(1e-6);
      if (params.ask === 'cliff') expect(Math.abs(answer + height(u, params.t)), where).toBeLessThan(1e-6);
      if (params.ask === 'time') {
        const cliff = Number(slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ').match(/cliff ([\d.]+) m/)![1]);
        expect(Math.abs(height(u, answer) + cliff), where).toBeLessThan(1e-6);
        expect(height(u, answer - 0.5) + cliff, `${where}: lands earlier`).toBeGreaterThan(0);
      }
    }
    for (const { params, slide, seed } of draws<{ k: number; t: number }>('kin-grav-steps')) {
      if (slide.kind !== 'steps') throw new Error('not a steps slide');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(Math.abs(Number(last) - height(4.9 * params.k, params.t)), `seed ${seed}`).toBeLessThan(1e-6);
    }
  });

  it('puts the top where the rise stops, and the fall where the ground is', () => {
    for (const { params, slide, seed } of draws<{ k: number; h: number; n?: number }>('kin-top-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const u = 4.9 * params.k;
      // Search for the top rather than solve for it: run the flight until it stops rising.
      let best = 0;
      for (let v = u, t = 0; v > 0; t += 1e-4) {
        v -= G * 1e-4;
        best = t + 1e-4;
      }
      const [up, rise, top] = slide.answer.map(Number);
      expect(Math.abs(up - best), `seed ${seed}`).toBeLessThan(0.002);
      expect(Math.abs(rise - height(u, up)), `seed ${seed}`).toBeLessThan(1e-6);
      expect(Math.abs(top - params.h - rise), `seed ${seed}`).toBeLessThan(1e-6);
      if (params.n !== undefined) {
        const fall = Number(slide.answer[3]);
        expect(Math.abs(stepped(0, G, fall).s - top), `seed ${seed}`).toBeLessThan(1e-6);
      }
    }
    for (const { params, slide, seed } of draws<{ k: number; T?: number; ask: string }>('kin-grav-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const u = 4.9 * params.k;
      const cliff = params.T === undefined ? 0 : -height(u, params.T);
      const t = slide.answer;
      if (params.ask === 'top') expect(Math.abs(stepped(u, -G, t).v), `seed ${seed}`).toBeLessThan(1e-6);
      if (params.ask === 'level') expect(Math.abs(height(u, t)), `seed ${seed}`).toBeLessThan(1e-6);
      if (params.ask === 'land') expect(Math.abs(cliff + height(u, t)), `seed ${seed}`).toBeLessThan(1e-6);
      expect(t, `seed ${seed}`).toBeGreaterThan(0);
    }
  });
});

describe('two stages and catching up', () => {
  it('fills each stage row from the one before', () => {
    for (const { params, slide, seed } of draws<{ a1: number; t1: number; a2: number; t2: number }>('kin-stage-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const one = stepped(0, params.a1, params.t1);
      const two = stepped(one.v, -params.a2, params.t2);
      const expected = [one.v, one.s, one.v, two.v, two.s];
      if (params.a2 !== 0) expected.push(one.s + two.s);
      expect(slide.answer.map(Number).every((value, k) => Math.abs(value - expected[k]) < 1e-6), `seed ${seed}`).toBe(true);
    }
  });

  it('meets where the gap closes, and not before', () => {
    for (const { params, slide, seed } of draws<{ w: number; accels: number[] }>('kin-catch-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const t = Number(slide.answer[params.accels.length > 1 ? 1 : 0]);
      const aA = params.accels.length > 1 ? params.accels[0] : 0;
      const aB = params.accels[params.accels.length - 1];
      const gap = (time: number) => stepped(params.w, aA, time).s - stepped(0, aB, time).s;
      expect(Math.abs(gap(t)), `seed ${seed}`).toBeLessThan(1e-6);
      expect(gap(t / 2), `seed ${seed}`).toBeGreaterThan(0);
    }
    for (const { params, slide, seed } of draws<{ kind: string; d: number; w1: number; w2: number }>('kin-catch-time')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const t = Number(slide.answer);
      const { kind, d, w1, w2 } = params;
      // Positions from the chaser's start; the first is ahead, or coming the other way.
      const first = (time: number) => (kind === 'towards' ? d - w1 * time : d + w1 * time);
      const second = (time: number) => (kind === 'head' ? stepped(0, w2, time).s : w2 * time);
      expect(Math.abs(first(t) - second(t)), `seed ${seed}`).toBeLessThan(1e-6);
      expect(first(t * 0.9) - second(t * 0.9), `seed ${seed}`).toBeGreaterThan(0);
    }
  });
});
