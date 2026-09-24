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
 *
 * Level 3 is calculus in t, which the oracles in `generators.test.ts` cannot
 * reach: they differentiate in x. So the formula each question displays is
 * read back off the slide and differentiated here by mathjs in t, integrals
 * are Simpson's rule over that same formula, and speeding up is watched
 * happen a moment later rather than decided from signs.
 */
import { describe, it, expect } from 'vitest';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
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
        // Level 3 asks for v, a or s as a function of t: those answers are formulas, not numbers.
        const inT = slide.kind === 'expression' && slide.keypad.some((key) => key.insert.trim() === 't');
        if (slide.kind === 'expression' && !inT) expect(tenth(slide.answer), `${where}: ${slide.answer}`).toBe(true);
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

/* ---------- level 3 ---------- */

/** The formula a question displays, `s = ...`, as mathjs reads it: TeX braces become brackets. */
function shown(slide: Slide): string {
  if (!('prompt' in slide)) throw new Error(`no prompt on a ${slide.kind} slide`);
  const block = slide.prompt.find((b) => b.kind === 'display');
  if (!block || block.kind !== 'display') throw new Error('no formula displayed');
  return block.tex.split(' = ')[1].replace(/\{/g, '(').replace(/\}/g, ')');
}

const dt = (expr: string): string => math.derivative(expr, 't').toString();
const valueAt = (expr: string, t: number): number => math.evaluate(expr, { t }) as number;
const agrees = (typed: string, expected: string, seed: number) =>
  checkAnswer(typed, expected, { domain: 'real', mode: 'exact', seed }).status === 'correct';

/** A tiles template with its blanks filled, `v = 3t^2 + 4t - 1`, less the letter in front. */
function placedFormula(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
  const filled = slide.template.replace(/\{(\d)\}/g, (_, k: string) => ` ${slide.answer[Number(k)]} `);
  return filled.split(' = ')[1];
}

/** The rows of a table with its blanks filled in reading order. */
function filledRows(slide: Slide): number[][] {
  if (slide.kind !== 'table') throw new Error('not a table slide');
  let next = 0;
  return slide.rows.map((row) => row.map((cell) => Number(cell ?? slide.answer[next++])));
}

describe('velocity and acceleration by differentiating', { timeout: 60_000 }, () => {
  it('kin-ds-dt and kin-a-dt type the derivative of the formula shown', () => {
    for (const { slide, seed } of draws('kin-ds-dt')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(agrees(slide.answer, dt(shown(slide)), seed), `seed ${seed}: ${shown(slide)}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<{ from: 'v' | 's' }>('kin-a-dt')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const once = dt(shown(slide));
      expect(agrees(slide.answer, params.from === 'v' ? once : dt(once), seed), `seed ${seed}: ${shown(slide)}`).toBe(true);
    }
  });

  it('kin-ds-tiles and kin-a-tiles place the terms of the derivative', () => {
    for (const { slide, seed } of draws('kin-ds-tiles')) {
      expect(agrees(placedFormula(slide), dt(shown(slide)), seed), `seed ${seed}`).toBe(true);
    }
    for (const { slide, seed } of draws('kin-a-tiles')) {
      expect(agrees(placedFormula(slide), dt(dt(shown(slide))), seed), `seed ${seed}`).toBe(true);
    }
  });

  it('kin-v-at and kin-a-at give the derivative at the time asked', () => {
    for (const { params, slide, seed } of draws<{ at: number }>('kin-v-at')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(close(Number(slide.answer), valueAt(dt(shown(slide)), params.at)), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<{ at: number; from: 'v' | 's' }>('kin-a-at')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const once = dt(shown(slide));
      expect(close(Number(slide.answer), valueAt(params.from === 'v' ? once : dt(once), params.at)), `seed ${seed}`).toBe(true);
    }
  });

  it('kin-v-table and kin-va-table fill every row from the formula', () => {
    for (const { slide, seed } of draws('kin-v-table')) {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const s = shown(slide);
      for (const row of filledRows(slide)) {
        const [t, ...cells] = row;
        const expected = slide.columns.length === 3 ? [valueAt(s, t), valueAt(dt(s), t)] : [valueAt(dt(s), t)];
        expect(cells.every((cell, k) => close(cell, expected[k])), `seed ${seed} t = ${t}`).toBe(true);
      }
    }
    for (const { params, slide, seed } of draws<{ from: 'v' | 's' }>('kin-va-table')) {
      const v = params.from === 'v' ? shown(slide) : dt(shown(slide));
      for (const [t, vt, at] of filledRows(slide)) {
        expect(close(vt, valueAt(v, t)) && close(at, valueAt(dt(v), t)), `seed ${seed} t = ${t}`).toBe(true);
      }
    }
  });

  it('kin-v-slider stops at the time v reaches the value asked', () => {
    for (const { params, slide, seed } of draws<{ target: number }>('kin-v-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      expect(close(valueAt(dt(shown(slide)), slide.answer), params.target), `seed ${seed}`).toBe(true);
      expect(slide.answer).toBeGreaterThan(slide.min);
      expect(slide.answer).toBeLessThan(slide.max);
    }
  });

  it('kin-accel-flow says speeding up exactly when the speed grows a moment later', () => {
    for (const { params, slide, seed } of draws<{ at: number; from: 'v' | 's' }>('kin-accel-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const v = params.from === 'v' ? shown(slide) : dt(shown(slide));
      const now = valueAt(v, params.at);
      const soon = valueAt(v, params.at + 1e-4);
      expect(slide.answer[0], `seed ${seed}`).toBe(now > 0 ? 'Positive' : 'Negative');
      const speedingUp = Math.abs(soon) > Math.abs(now);
      expect(slide.answer[0] === slide.answer[1], `seed ${seed}`).toBe(speedingUp);
    }
  });
});

describe('exponential motion', { timeout: 60_000 }, () => {
  it('kin-exp-v differentiates the exponential shown, once or twice', () => {
    for (const { params, slide, seed } of draws<{ ask: 'v' | 'a' }>('kin-exp-v')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const once = dt(shown(slide));
      expect(agrees(slide.answer, params.ask === 'v' ? once : dt(once), seed), `seed ${seed}: ${shown(slide)}`).toBe(true);
    }
  });

  it('kin-exp-start reads s, v or a at t = 0', () => {
    for (const { params, slide, seed } of draws<{ ask: 's' | 'v' | 'a' }>('kin-exp-start')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const s = shown(slide);
      const f = { s, v: dt(s), a: dt(dt(s)) }[params.ask];
      expect(close(Number(slide.answer), valueAt(f, 0)), `seed ${seed}`).toBe(true);
    }
  });

  it('kin-exp-tree gives v and a at a real moment when s is the value stated', () => {
    for (const { params, slide, seed } of draws<{ A: number; k: number; B: number; S: number }>('kin-exp-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const { A, k, B, S } = params;
      const t = Math.log((S - B) / A) / k;
      expect(t, `seed ${seed}`).toBeGreaterThan(0);
      const s = shown(slide);
      expect(Math.abs(valueAt(s, t) - S), `seed ${seed}`).toBeLessThan(1e-6);
      expect(Math.abs(Number(slide.answer[1]) - valueAt(dt(s), t)), `seed ${seed}`).toBeLessThan(1e-6);
      expect(Math.abs(Number(slide.answer[2]) - valueAt(dt(dt(s)), t)), `seed ${seed}`).toBeLessThan(1e-6);
    }
  });

  it('kin-exp-flow says speeding up exactly when the speed grows', () => {
    for (const { slide, seed } of draws('kin-exp-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const v = dt(shown(slide));
      for (const t of [0, 0.5, 1]) {
        const now = valueAt(v, t);
        expect(slide.answer[0], `seed ${seed}`).toBe(now > 0 ? 'Positive' : 'Negative');
        expect(slide.answer[0] === slide.answer[1], `seed ${seed}`).toBe(Math.abs(valueAt(v, t + 0.01)) > Math.abs(now));
      }
    }
  });
});

describe('back by integrating', { timeout: 60_000 }, () => {
  it('kin-int-v and kin-int-s-tiles differentiate back to the rate, and meet the condition', () => {
    for (const id of ['kin-int-v', 'kin-int-s-tiles']) {
      for (const { params, slide, seed } of draws<{ at: number; value: number }>(id)) {
        const found = slide.kind === 'tiles' ? placedFormula(slide) : slide.kind === 'expression' ? slide.answer : '';
        expect(agrees(dt(found), shown(slide), seed), `${id} seed ${seed}`).toBe(true);
        expect(close(valueAt(found, params.at), params.value), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('kin-int-c-tree finds c from the area under the rate up to the time given', () => {
    for (const { params, slide, seed } of draws<{ at: number; value: number }>('kin-int-c-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const rate = shown(slide);
      const gained = simpson((t) => valueAt(rate, t), 0, params.at);
      const values = slide.answer.map(Number);
      const c = values[values.length - 1];
      const terms = values.slice(0, -1).reduce((sum, term) => sum + term, 0);
      expect(close(terms, gained), `seed ${seed}`).toBe(true);
      expect(close(c, params.value - gained), `seed ${seed}`).toBe(true);
    }
  });

  it('kin-int-v-at and kin-int-s-table add the area under the rate to the start', () => {
    for (const { params, slide, seed } of draws<{ u: number; at: number }>('kin-int-v-at')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const a = shown(slide);
      expect(close(Number(slide.answer), params.u + simpson((t) => valueAt(a, t), 0, params.at)), `seed ${seed}`).toBe(true);
    }
    for (const { slide, seed } of draws('kin-int-s-table')) {
      const v = shown(slide);
      const [[, s0], ...rows] = filledRows(slide);
      for (const [t, s] of rows) expect(close(s, s0 + simpson((x) => valueAt(v, x), 0, t)), `seed ${seed} t = ${t}`).toBe(true);
    }
  });
});

describe('displacement over an interval', { timeout: 60_000 }, () => {
  type Interval = { from: number; to: number };

  /** v sampled across the interval: every drawn interval keeps one sign, never touching zero. */
  function signThroughout(v: string, { from, to }: Interval): number {
    const values = Array.from({ length: 201 }, (_, k) => valueAt(v, from + ((to - from) * k) / 200));
    if (values.every((value) => value > 0)) return 1;
    if (values.every((value) => value < 0)) return -1;
    return 0;
  }

  const area = (v: string, { from, to }: Interval) => simpson((t) => valueAt(v, t), from, to);

  it('keeps v one sign on every interval it draws', () => {
    for (const id of ['kin-disp-int', 'kin-interval-tree', 'kin-dist-choice', 'kin-dist-int']) {
      for (const { params, slide, seed } of draws<Interval>(id)) {
        expect(signThroughout(shown(slide), params), `${id} seed ${seed}`).not.toBe(0);
      }
    }
  });

  it('kin-disp-int and kin-dist-int are the area, signed and unsigned', () => {
    for (const { params, slide, seed } of draws<Interval>('kin-disp-int')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(close(Number(slide.answer), area(shown(slide), params)), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide, seed } of draws<Interval>('kin-dist-int')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const v = shown(slide);
      expect(signThroughout(v, params), `seed ${seed}`).toBe(-1);
      expect(close(Number(slide.answer), simpson((t) => Math.abs(valueAt(v, t)), params.from, params.to)), `seed ${seed}`).toBe(true);
    }
  });

  it('kin-interval-tree takes the bottom from the top, and gives the distance as its size', () => {
    for (const { params, slide, seed } of draws<Interval>('kin-interval-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const [top, bottom, d, distance] = slide.answer.map(Number);
      const v = shown(slide);
      expect(close(top - bottom, d) && close(d, area(v, params)), `seed ${seed}`).toBe(true);
      if (distance !== undefined) expect(close(distance, simpson((t) => Math.abs(valueAt(v, t)), params.from, params.to)), `seed ${seed}`).toBe(true);
      expect(distance !== undefined, `seed ${seed}: a distance node exactly when v is negative`).toBe(d < 0);
    }
  });

  it('kin-dist-choice marks the integral that comes to what is asked', () => {
    for (const { params, slide, seed } of draws<Interval & { ask: 'distance' | 'displacement' }>('kin-dist-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const v = shown(slide);
      const target = params.ask === 'distance' ? simpson((t) => Math.abs(valueAt(v, t)), params.from, params.to) : area(v, params);
      const label = slide.options.find((option) => option.id === slide.correctId)!.label;
      const integral = `\\int_{${params.from}}^{${params.to}} v \\, dt`;
      expect([integral, `-${integral}`], `seed ${seed}`).toContain(label);
      const value = (label.startsWith('-') ? -1 : 1) * area(v, params);
      expect(close(value, target), `seed ${seed}: ${label}`).toBe(true);
    }
  });

  it('kin-area-slider stops where the area from the start reaches the distance stated', () => {
    for (const { params, slide, seed } of draws<{ start: number }>('kin-area-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const v = shown(slide);
      const stated = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ').match(/travelled \$(-?[\d.]+)\$ m/);
      expect(stated, `seed ${seed}`).not.toBeNull();
      expect(signThroughout(v, { from: 0, to: slide.max }), `seed ${seed}`).toBe(1);
      expect(close(simpson((t) => valueAt(v, t), params.start, slide.answer), Number(stated![1])), `seed ${seed}`).toBe(true);
    }
  });
});

/* ---------- level 4 ---------- */

/** The prose of a slide's prompt, joined. */
function proseOf(slide: Slide): string {
  if (slide.kind === 'teach') throw new Error('a teach slide has no prompt');
  return slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');
}

/** The function of t the learner reads as `$v = ...$`, parsed by mathjs rather than taken from the params. */
function shownIn(text: string, letter: string): { tex: string; at: (t: number) => number } {
  const tex = text.match(new RegExp(`\\$${letter} = ([^$]+)\\$`))?.[1];
  if (!tex) throw new Error(`no ${letter} in ${text}`);
  // `t(t - 3)` is a product on paper; mathjs would call t.
  const code = math.parse(tex.replace(/t\(/g, 't*(')).compile();
  return { tex, at: (t) => code.evaluate({ t }) as number };
}

/** Its derivative by mathjs, in t. */
function rate(tex: string): (t: number) => number {
  const code = math.derivative(tex, 't').compile();
  return (t) => code.evaluate({ t }) as number;
}

/** The velocity a prompt gives at t = 0; "from rest" or none is 0. */
const startVelocity = (text: string): number => Number(text.match(/velocity(?: at \$t = 0\$)?(?: is)? \$(-?[\d.]+)\$/)?.[1] ?? 0);

/** The position a prompt starts from; at O is 0. */
const startPosition = (text: string): number => Number(text.match(/at \$s = (-?[\d.]+)\$/)?.[1] ?? 0);

/** Simpson's rule with n strips, n even: exact on cubics whatever n is. */
function simpsonN(f: (t: number) => number, a: number, b: number, n = 20): number {
  const h = (b - a) / n;
  let total = 0;
  for (let i = 0; i <= n; i += 1) total += (i === 0 || i === n ? 1 : i % 2 === 1 ? 4 : 2) * f(a + i * h);
  return (total * h) / 3;
}

function bisect(f: (t: number) => number, lo: number, hi: number): number {
  let [a, b] = [lo, hi];
  const left = Math.sign(f(a));
  for (let i = 0; i < 60; i += 1) {
    const mid = (a + b) / 2;
    if (Math.sign(f(mid)) === left) a = mid;
    else b = mid;
  }
  return (a + b) / 2;
}

/** Every time in (a, b) where f changes sign, found by a scan kept off the whole and half numbers, then bisection. */
function signChanges(f: (t: number) => number, a: number, b: number): number[] {
  const n = 600;
  const xs = Array.from({ length: n }, (_, i) => a + ((b - a) * (i + 0.37)) / n);
  const out: number[] = [];
  for (let i = 1; i < n; i += 1) if (Math.sign(f(xs[i - 1])) !== Math.sign(f(xs[i]))) out.push(bisect(f, xs[i - 1], xs[i]));
  return out;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** The interval a prompt names, `$0 \le t \le 5$`. */
function intervalOf(text: string): [number, number] {
  const found = text.match(/\$(\d+) \\le t \\le (\d+)\$/);
  if (!found) throw new Error(`no interval in ${text}`);
  return [Number(found[1]), Number(found[2])];
}

/** The velocity a slide is about: shown, differentiated from s, or integrated from a and the start. */
function velocityOf(text: string): (t: number) => number {
  if (/\$v = /.test(text)) return shownIn(text, 'v').at;
  if (/\$s = [^$\d-]/.test(text) || /\$s = -?\d*t/.test(text)) return rate(shownIn(text, 's').tex);
  const a = shownIn(text, 'a').at;
  const u = startVelocity(text);
  return (t) => u + simpsonN(a, 0, t, 2);
}

describe('kin-rest-times', () => {
  it('fills in the times v changes sign, differentiating s by mathjs where s is given', () => {
    for (const { slide, seed } of draws<unknown>('kin-rest-times')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const roots = signChanges(velocityOf(proseOf(slide)), 0.01, 10);
      expect(roots.length, `seed ${seed}`).toBe(2);
      const given = slide.answer.map(Number).sort((a, b) => a - b);
      expect(given.every((t, k) => near(t, roots[k])), `seed ${seed}: ${given} against ${roots}`).toBe(true);
    }
  });
});

describe('kin-turn-position', () => {
  it('is where s is when v changes sign, or the distance between the two', () => {
    for (const { params, slide, seed } of draws<{ ask: string }>('kin-turn-position')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const s = shownIn(proseOf(slide), 's');
      const turns = signChanges(rate(s.tex), 0.01, 10);
      expect(turns.length, `seed ${seed}`).toBe(2);
      const [first, second] = turns.map(s.at);
      const expected = { first, second, between: Math.abs(second - first) }[params.ask]!;
      expect(near(Number(slide.answer), expected), `seed ${seed}`).toBe(true);
    }
  });
});

describe('kin-turn-flow', () => {
  it('says zero only when v is, and turning only when v changes sign there', () => {
    for (const { params, slide, seed } of draws<{ r: number }>('kin-turn-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const v = shownIn(proseOf(slide), 'v').at;
      const { r } = params;
      const expected = Math.abs(v(r)) > 1e-9 ? ['Not zero'] : ['Zero', Math.sign(v(r - 0.01)) !== Math.sign(v(r + 0.01)) ? 'Yes' : 'No'];
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
    }
  });
});

describe('kin-origin-slider', () => {
  it('stops where s crosses zero, counted from the start', () => {
    for (const { params, slide, seed } of draws<{ roots: number[]; ask: number }>('kin-origin-slider')) {
      if (slide.kind !== 'slider') throw new Error('not a slider slide');
      const zeros = signChanges(shownIn(proseOf(slide), 's').at, 0.01, slide.max);
      const expected = params.roots.length > 2 ? zeros[params.ask] : zeros[0];
      expect(near(slide.answer, expected), `seed ${seed}`).toBe(true);
      expect(slide.answer).toBeLessThanOrEqual(slide.max);
    }
  });
});

describe('kin-peak-tree and kin-max-velocity', () => {
  it('find where a = 0 by bisection, and v is greatest there', () => {
    for (const id of ['kin-peak-tree', 'kin-max-velocity']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'tree' && slide.kind !== 'expression') throw new Error('not a tree or expression slide');
        const v = velocityOf(proseOf(slide));
        const tops = signChanges((t) => (v(t + 1e-4) - v(t - 1e-4)) / 2e-4, 0.01, 10);
        expect(tops.length, `${id} seed ${seed}`).toBe(1);
        const [top] = tops;
        expect(v(top - 0.1) < v(top) && v(top + 0.1) < v(top), `${id} seed ${seed}: not a greatest value`).toBe(true);
        const answers = slide.kind === 'tree' ? slide.answer.map(Number) : [Number(slide.answer)];
        if (slide.kind === 'tree') expect(Math.abs(answers[0] - top), `${id} seed ${seed}`).toBeLessThan(1e-4);
        expect(Math.abs(answers[answers.length - 1] - v(top)), `${id} seed ${seed}`).toBeLessThan(1e-4);
      }
    }
  });
});

describe('kin-speed-table and kin-interval-speed', () => {
  it('take the greatest |v| over the ends and every a = 0 inside, and no grid point beats it', () => {
    for (const id of ['kin-speed-table', 'kin-interval-speed']) {
      for (const { slide, seed } of draws<unknown>(id)) {
        if (slide.kind !== 'table' && slide.kind !== 'expression') throw new Error('not a table or expression slide');
        const text = proseOf(slide);
        const v = velocityOf(text);
        const [t1, t2] = intervalOf(text);
        const inside = signChanges((t) => (v(t + 1e-4) - v(t - 1e-4)) / 2e-4, t1, t2);
        const best = Math.max(...[t1, ...inside, t2].map((t) => Math.abs(v(t))));
        const grid = Math.max(...Array.from({ length: 501 }, (_, i) => Math.abs(v(t1 + ((t2 - t1) * i) / 500))));
        expect(grid, `${id} seed ${seed}`).toBeLessThanOrEqual(best + 1e-6);
        if (slide.kind === 'expression') expect(Math.abs(Number(slide.answer) - best), `${id} seed ${seed}`).toBeLessThan(1e-4);
        else {
          const [v0, s0, h, vh, sh, vT, sT] = slide.answer.map(Number);
          expect(inside.length, `${id} seed ${seed}`).toBe(1);
          expect(Math.abs(h - inside[0]), `${id} seed ${seed}`).toBeLessThan(1e-4);
          expect([near(v0, v(t1)), near(vh, v(h)), near(vT, v(t2))], `${id} seed ${seed}`).toEqual([true, true, true]);
          expect([near(s0, Math.abs(v0)), near(sh, Math.abs(vh)), near(sT, Math.abs(vT))], `${id} seed ${seed}`).toEqual([true, true, true]);
        }
      }
    }
  });
});

describe('distance against displacement', () => {
  it('splits at the one sign change, found by bisection, and sums the pieces by Simpson', () => {
    for (const id of ['kin-disp-integral', 'kin-pieces-tree', 'kin-dist-total']) {
      for (const { params, slide, seed } of draws<{ T: number }>(id)) {
        if (slide.kind !== 'tree' && slide.kind !== 'expression') throw new Error('not a tree or expression slide');
        const v = shownIn(proseOf(slide), 'v').at;
        const roots = signChanges(v, 0, params.T);
        expect(roots.length, `${id} seed ${seed}: v must change sign once`).toBe(1);
        const r = Math.round(roots[0]);
        expect(near(r, roots[0]), `${id} seed ${seed}`).toBe(true);
        const [A1, A2] = [simpson(v, 0, r), simpson(v, r, params.T)];
        if (id === 'kin-disp-integral') expect(near(Number(slide.answer), simpson(v, 0, params.T)), `${id} seed ${seed}`).toBe(true);
        if (id === 'kin-dist-total') expect(near(Number(slide.answer), Math.abs(A1) + Math.abs(A2)), `${id} seed ${seed}`).toBe(true);
        if (slide.kind === 'tree') {
          const expected = [r, A1, A2, Math.abs(A1) + Math.abs(A2)];
          expect(slide.answer.map(Number).every((value, k) => near(value, expected[k])), `${id} seed ${seed}`).toBe(true);
        }
      }
    }
  });

  it('marks the calculation that makes the negative piece positive', () => {
    for (const { params, slide, seed } of draws<{ r: number; T: number }>('kin-dist-or-disp')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const v = shownIn(proseOf(slide), 'v').at;
      const right = slide.options.find((o) => o.id === slide.correctId)!.label;
      // The piece before the turn is subtracted exactly when v is negative there.
      const [before, after] = right.split(/ [+-] (?=\\int)/);
      expect(before.startsWith('-'), `seed ${seed}: ${right}`).toBe(v(params.r / 2) < 0);
      expect(right.includes(' - \\int'), `seed ${seed}: ${right}`).toBe(v((params.r + params.T) / 2) < 0);
      expect(after, `seed ${seed}`).toContain(`_{${params.r}}^{${params.T}}`);
    }
  });

  it('splits the flow only where v changes sign inside the interval', () => {
    for (const { params, slide, seed } of draws<{ a: number; b: number }>('kin-split-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow slide');
      const crossings = signChanges(shownIn(proseOf(slide), 'v').at, params.a, params.b);
      const expected = crossings.length === 1 ? ['Yes', `$t = ${Math.round(crossings[0])}$`] : ['No'];
      expect(crossings.length, `seed ${seed}`).toBeLessThanOrEqual(1);
      expect(slide.answer, `seed ${seed}`).toEqual(expected);
    }
  });
});

describe('curved motion graphs', () => {
  it('give the gradient mathjs finds at the marked time', () => {
    for (const { params, slide, seed } of draws<{ t0: number }>('kin-curve-gradient')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      expect(near(Number(slide.answer), rate(shownIn(proseOf(slide), 's').tex)(params.t0)), `seed ${seed}`).toBe(true);
    }
  });

  it('slide to where the graph is flat', () => {
    for (const [id, letter] of [
      ['kin-flat-slider', 's'],
      ['kin-azero-slider', 'v'],
    ] as const) {
      for (const { params, slide, seed } of draws<{ roots: number[]; ask: number }>(id)) {
        if (slide.kind !== 'slider') throw new Error('not a slider slide');
        const flats = signChanges(rate(shownIn(proseOf(slide), letter).tex), 0, slide.max);
        expect(flats.length, `${id} seed ${seed}`).toBe(params.roots.length);
        expect(near(slide.answer, flats[params.ask]), `${id} seed ${seed}`).toBe(true);
      }
    }
  });

  it('shade an area Simpson agrees with, over a curve that stays above the axis', () => {
    for (const { params, slide, seed } of draws<{ T: number }>('kin-curve-area')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const v = shownIn(proseOf(slide), 'v').at;
      expect(Math.min(...Array.from({ length: 201 }, (_, i) => v((params.T * i) / 200))), `seed ${seed}`).toBeGreaterThan(0);
      expect(near(Number(slide.answer), simpson(v, 0, params.T)), `seed ${seed}`).toBe(true);
    }
  });

  it('mark the one moment that answers the question, read from the graph worked out', () => {
    for (const { params, slide, seed } of draws<{ ask: string }>('kin-graph-choice')) {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      // The graph carries no equation; the worked solution names the curve drawn.
      const g = registry['kin-graph-choice'] as unknown as Generator<unknown>;
      const said = g.solution(params).map((step) => step.text ?? '').join(' ');
      const v = rate(shownIn(said, 's').tex);
      const times = slide.options.map((o) => Number(o.label.replace('t = ', '')));
      const speeds = times.map((t) => Math.abs(v(t)));
      const wanted = {
        rest: (k: number) => Math.abs(v(times[k])) < 1e-9,
        back: (k: number) => v(times[k]) < -1e-9,
        forward: (k: number) => v(times[k]) > 1e-9,
        fastest: (k: number) => speeds[k] === Math.max(...speeds),
      }[params.ask]!;
      const right = slide.options.findIndex((o) => o.id === slide.correctId);
      expect(times.map((_, k) => k).filter(wanted), `seed ${seed}`).toEqual([right]);
    }
  });
});

describe('putting it together', () => {
  it('integrates a from the start the prompt gives, by Simpson', () => {
    for (const { params, slide, seed } of draws<{ T: number; toS: boolean }>('kin-chain-velocity')) {
      if (slide.kind !== 'expression') throw new Error('not an expression slide');
      const v = velocityOf(proseOf(slide));
      const expected = params.toS ? simpsonN(v, 0, params.T) : v(params.T);
      expect(near(Number(slide.answer), expected), `seed ${seed}`).toBe(true);
    }
  });

  it('fills tiles that differentiate back to what was given and start where the prompt says', () => {
    for (const { slide, seed } of draws<unknown>('kin-integrate-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('not a tiles slide');
      const text = proseOf(slide);
      const built = slide.template.replace(/\{(\d)\}/g, (_, k) => slide.answer[Number(k)]).split(' = ')[1];
      const toS = slide.template.startsWith('s');
      const given = shownIn(text, toS ? 'v' : 'a').at;
      const d = rate(built);
      for (const t of [0.3, 1.7, 2.9]) expect(near(d(t), given(t)), `seed ${seed}: ${built}`).toBe(true);
      const start = toS ? startPosition(text) : startVelocity(text);
      expect(near(math.evaluate(built, { t: 0 }) as number, start), `seed ${seed}: ${built}`).toBe(true);
    }
  });

  it('stops where the integrated velocity first reaches zero, having gone the Simpson distance', () => {
    for (const { slide, seed } of draws<unknown>('kin-stop-tree')) {
      if (slide.kind !== 'tree') throw new Error('not a tree slide');
      const text = proseOf(slide);
      const v = velocityOf(text);
      const [T] = signChanges(v, 0.01, 20);
      const S = simpsonN(v, 0, T);
      const expected = [T, S, startPosition(text) + S];
      expect(slide.answer.map(Number).every((value, k) => Math.abs(value - expected[k]) < 1e-4), `seed ${seed}`).toBe(true);
    }
  });
});
