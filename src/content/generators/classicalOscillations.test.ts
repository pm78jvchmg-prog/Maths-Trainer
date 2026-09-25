/**
 * Classical Mechanics level 9, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: two masses on a spring and coupled pairs by
 * stepping every mass's equation of motion, damping by stepping a damped
 * spring and reading off its peaks, and strings as a chain of thousands of
 * beads, whose normal modes approach the continuous string's.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 60;
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
  return slide.rows.map((row) => row.map((cell) => Number(cell ?? fill.shift())));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
const promptText = (slide: Slide): string => JSON.stringify('prompt' in slide ? slide.prompt : '');
/** Every quantity in the prompt given in a unit, in order: the prompt is what the learner reads. */
const quantities = (slide: Slide, unit: string): number[] => [...promptText(slide).matchAll(new RegExp(`\\$([\\d.]+)\\\\\\\\text\\{ ${unit}`, 'g'))].map((m) => Number(m[1]));
const flowWords = (slide: Slide): string[] => (slide.kind === 'flow' ? slide.answer : []);

interface Run {
  /** Angular frequency from the time to the first turn of the watched velocity. */
  w: number;
  /** Greatest size of the watched velocity, and of each coordinate's displacement. */
  vMax: number;
  xMax: number[];
}

/**
 * Masses on springs, stepped by velocity Verlet from rest at x0 until the
 * watched velocity turns back to nothing: half a period of a normal mode.
 */
function stepMasses(masses: number[], force: (x: number[]) => number[], x0: number[], watch: (v: number[]) => number, wGuess: number): Run {
  const dt = 1e-4 / wGuess;
  let x = [...x0];
  let v = masses.map(() => 0);
  let a = force(x).map((f, i) => f / masses[i]);
  let vMax = 0;
  const xMax = x.map((xi) => Math.abs(xi));
  let before = 0;
  for (let step = 1; step < 1e7; step += 1) {
    const xNext = x.map((xi, i) => xi + v[i] * dt + 0.5 * a[i] * dt * dt);
    const aNext = force(xNext).map((f, i) => f / masses[i]);
    const vNext = v.map((vi, i) => vi + 0.5 * (a[i] + aNext[i]) * dt);
    const now = watch(vNext);
    vMax = Math.max(vMax, Math.abs(now));
    xNext.forEach((xi, i) => (xMax[i] = Math.max(xMax[i], Math.abs(xi))));
    if (step > 2 && Math.sign(now) !== Math.sign(before) && before !== 0) {
      const t = (step - 1 + Math.abs(before) / Math.abs(now - before)) * dt;
      return { w: Math.PI / t, vMax, xMax };
    }
    before = now;
    x = xNext;
    v = vNext;
    a = aNext;
  }
  throw new Error('never turned');
}

/** Two masses joined by a spring, released with the spring stretched by A. */
const twoBody = (m1: number, m2: number, k: number, A: number): Run =>
  stepMasses([m1, m2], ([x1, x2]) => [k * (x2 - x1), -k * (x2 - x1)], [-A * (m2 / (m1 + m2)), A * (m1 / (m1 + m2))], ([v1, v2]) => v2 - v1, Math.sqrt(k / Math.min(m1, m2)));

/** Two masses between walls, wall springs k and a middle spring kc, released from x0. */
const coupled = (m: number, k: number, kc: number, x0: number[]): Run =>
  stepMasses([m, m], ([x1, x2]) => [-k * x1 + kc * (x2 - x1), -k * x2 - kc * (x2 - x1)], x0, ([v1, v2]) => (x0[0] === x0[1] ? v1 + v2 : v1 - v2), Math.sqrt((k + 2 * kc) / m));

/** A spring on its own mass, for a natural frequency. */
const natural = (k: number, m: number): number => stepMasses([m], ([x]) => [-k * x], [1], ([v]) => v, Math.sqrt(k / m)).w;

/** The peaks of a damped spring, w0 = 1, damped so each cycle keeps r of the amplitude. */
function dampedPeaks(r: number, count: number): number[] {
  // Peaks one damped period apart fall by exp(-beta T_d); choose beta for that to be r.
  const L = -Math.log(r);
  const beta = L / Math.sqrt(4 * Math.PI * Math.PI + L * L);
  const dt = 2e-5;
  let x = 1;
  let v = 0;
  const peaks = [1];
  const acc = (xx: number, vv: number) => -xx - 2 * beta * vv;
  for (let i = 0; i < 1e8 && peaks.length <= count; i += 1) {
    // Runge-Kutta, since the damping makes the force depend on the speed.
    const k1x = v;
    const k1v = acc(x, v);
    const k2x = v + 0.5 * dt * k1v;
    const k2v = acc(x + 0.5 * dt * k1x, v + 0.5 * dt * k1v);
    const k3x = v + 0.5 * dt * k2v;
    const k3v = acc(x + 0.5 * dt * k2x, v + 0.5 * dt * k2v);
    const k4x = v + dt * k3v;
    const k4v = acc(x + dt * k3x, v + dt * k3v);
    const xn = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    const vn = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (v > 0 && vn <= 0) {
      // The peak between the two steps, from the parabola through the turn.
      const f = v / (v - vn);
      peaks.push(x + (xn - x) * f + peakCorrection(x, v, xn, dt, f));
    }
    x = xn;
    v = vn;
  }
  return peaks;
}

/** Quadratic correction to a linear interpolation of the position at the turning point. */
function peakCorrection(x: number, v: number, xn: number, dt: number, f: number): number {
  // Over the step x(t) is close to x + v t + c t^2; the turn is where v + 2ct = 0.
  const c = (xn - x - v * dt) / (dt * dt);
  const t = -v / (2 * c);
  return x + v * t + c * t * t - (x + (xn - x) * f);
}

/** A string as a chain of beads: the frequency of mode n, in hertz. */
function beadedFrequency(T: number, mu: number, L: number, mode: number): number {
  const N = 4000;
  const a = L / (N + 1);
  return (2 * Math.sqrt(T / (mu * a)) * Math.sqrt(1 / a) * Math.sin((mode * Math.PI) / (2 * (N + 1)))) / (2 * Math.PI);
}

/** Wave speed on a string, as twice the lowest frequency of a one-metre chain. */
const beadedSpeed = (T: number, mu: number): number => 2 * beadedFrequency(T, mu, 1, 1);

describe('classical mechanics level 9', () => {
  it('steps two masses on a spring for the reduced mass', TIME, () => {
    for (const { p, slide } of draws('clm-reduced-mass')) {
      const got = answerOf(slide)[0];
      const [m2, mu] = p.find === 'mu' ? [n(p.m2), got] : [got, Number(/reduced mass is \$([\d.]+)/.exec(promptText(slide))?.[1])];
      // Two bodies on a spring of 1 N/m swing as one of mass mu.
      const run = twoBody(n(p.m1), m2, 1, 0.01);
      expect(near(run.w * run.w * mu, 1, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { slide } of draws('clm-reduced-table').slice(0, 40)) {
      for (const [m1, m2, mu] of filled(slide)) {
        const run = twoBody(m1, m2, 1, 0.01);
        expect(near(run.w * run.w * mu, 1, 1e-6)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-molecule-tree')) {
      const [mu, w, v] = answerOf(slide);
      const k = Number(/stiffness \$([\d.]+)/.exec(promptText(slide))?.[1]);
      const run = twoBody(n(p.m1), n(p.m2), k, n(p.A));
      expect(near(run.w, w, 1e-6) && near(run.vMax, v, 1e-5) && near(k / mu, w * w, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-molecule-flow')) {
      const [, w] = answerOf(slide);
      const k = Number(/stiffness \$([\d.]+)/.exec(promptText(slide))?.[1]);
      const run = twoBody(n(p.light), n(p.heavy), k, 0.01);
      expect(near(run.w, w, 1e-6)).toBe(true);
      // The heavy mass barely moves when it swings a ninth as far as the light one, or less.
      expect(flowWords(slide)[2]).toBe(9 * run.xMax[1] <= run.xMax[0] * (1 + 1e-6) ? 'The heavy mass barely moves' : 'Both masses move');
    }
  });

  it('reads a damped spring’s amplitude off its stepped peaks', TIME, () => {
    const peaks = new Map<number, number[]>();
    const peaksFor = (r: number) => peaks.get(r) ?? (peaks.set(r, dampedPeaks(r, 4)), peaks.get(r)!);
    for (const { p, slide } of draws('clm-damp-decay')) {
      expect(near(answerOf(slide)[0], n(p.A0) * peaksFor(n(p.r))[n(p.n)], 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-damp-table')) {
      for (const [cycles, A, E] of filled(slide)) {
        expect(near(A, n(p.A0) * peaksFor(n(p.r))[cycles], 1e-6) && near(E, 0.5 * n(p.k) * A * A, 1e-9), JSON.stringify(p)).toBe(true);
      }
    }
  });

  it('puts resonance at the stepped natural frequency', TIME, () => {
    for (const { p, slide } of draws('clm-resonance-slider')) {
      const k = Number(/stiffness \$([\d.]+)/.exec(promptText(slide))?.[1]);
      expect(near(natural(k, answerOf(slide)[0]), n(p.w), 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-resonance-flow')) {
      const [w0, mRes] = answerOf(slide);
      const [k] = quantities(slide, 'N m');
      const stepped = natural(k, quantities(slide, 'kg')[0]);
      expect(near(stepped, w0, 1e-6) && near(natural(k, mRes), n(p.wd), 1e-6)).toBe(true);
      const verdict = Math.abs(n(p.wd) - stepped) < 1e-4 ? 'At resonance' : n(p.wd) < stepped ? 'Below resonance' : 'Above resonance';
      expect(flowWords(slide)[2]).toBe(verdict);
    }
  });

  it('steps a coupled pair in each of its modes', TIME, () => {
    const modes = (m: number, k: number, kc: number) => [coupled(m, k, kc, [0.01, 0.01]), coupled(m, k, kc, [0.01, -0.01])];
    for (const { p, slide } of draws('clm-couple-modes')) {
      const got = answerOf(slide)[0];
      const [m] = quantities(slide, 'kg');
      const [k, kcShown] = quantities(slide, 'N m');
      const kc = p.find === 'kc' ? got : kcShown;
      const w2 = p.find === 'w2' ? got : quantities(slide, 'rad s')[0];
      expect(near(coupled(m, k, kc, [0.01, -0.01]).w, w2, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { slide } of draws('clm-couple-tree')) {
      const [w1, w2, beat] = answerOf(slide);
      const [inStep, opposite] = modes(quantities(slide, 'kg')[0], ...(quantities(slide, 'N m') as [number, number]));
      expect(near(inStep.w, w1, 1e-6) && near(opposite.w, w2, 1e-6) && near(beat, opposite.w - inStep.w, 1e-5)).toBe(true);
    }
    for (const { p, slide } of draws('clm-couple-table').slice(0, 40)) {
      for (const [k, kc, w1, w2] of filled(slide)) {
        const [inStep, opposite] = modes(quantities(slide, 'kg')[0], k, kc);
        expect(near(inStep.w, w1, 1e-6) && near(opposite.w, w2, 1e-6), JSON.stringify(p)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-couple-flow')) {
      const start = p.same ? [0.01, 0.01] : [0.01, -0.01];
      const [k, kc] = quantities(slide, 'N m');
      const run = coupled(quantities(slide, 'kg')[0], k, kc, start);
      expect(near(run.w, answerOf(slide)[0], 1e-6)).toBe(true);
      // Released together, the gap between the masses never changes, so neither does the middle spring.
      expect(flowWords(slide).slice(0, 2)).toEqual(p.same ? ['The in-step mode', 'It keeps its length'] : ['The opposite mode', 'It stretches and squashes']);
    }
  });

  it('times waves on a string as a chain of beads', TIME, () => {
    for (const { p, slide } of draws('clm-wave-speed')) {
      const got = answerOf(slide)[0];
      const [mu] = quantities(slide, 'kg m');
      const [T, v] = p.find === 'v' ? [quantities(slide, 'N')[0], got] : [got, quantities(slide, 'm s')[0]];
      expect(near(beadedSpeed(T, mu), v, 1e-5), JSON.stringify(p)).toBe(true);
    }
    for (const { slide } of draws('clm-wave-table')) {
      for (const [f, lambda, v] of filled(slide)) expect(near(f * lambda, v, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-wave-tree')) {
      const [mu, v, lambda] = answerOf(slide);
      const M = Number(/weighs \$([\d.]+)/.exec(promptText(slide))?.[1]);
      const T = Number(/tight at \$([\d.]+)/.exec(promptText(slide))?.[1]);
      expect(near(mu * n(p.L), M, 1e-9) && near(beadedSpeed(T, mu), v, 1e-5) && near(lambda * n(p.f), v, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-wave-flow')) {
      const [r, v2] = answerOf(slide);
      const ratio = beadedSpeed(n(p.f), 0.01) / beadedSpeed(1, 0.01);
      expect(near(ratio, r, 1e-5) && near(v2, r * n(p.v), 1e-9)).toBe(true);
      expect(flowWords(slide)[2]).toBe(ratio > 1 ? 'Longer' : 'Shorter');
    }
  });

  it('finds standing waves as the modes of a chain of beads', TIME, () => {
    for (const { p, slide } of draws('clm-standing-freq')) {
      const [L] = quantities(slide, 'm}');
      const [v] = quantities(slide, 'm s');
      expect(near(beadedFrequency(v ** 2, 1, L, n(p.n)), answerOf(slide)[0], 1e-5), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-standing-slider')) {
      // Any wave speed will do: the wavelength is the speed over the mode's frequency.
      expect(near(1 / beadedFrequency(1, 1, quantities(slide, 'm}')[0], n(p.n)), answerOf(slide)[0], 1e-5), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-standing-tree')) {
      const [v, f1, fn] = answerOf(slide);
      const [T] = quantities(slide, 'N');
      const [mu] = quantities(slide, 'kg m');
      const [L] = quantities(slide, 'm}');
      expect(near(beadedSpeed(T, mu), v, 1e-5) && near(beadedFrequency(T, mu, L, 1), f1, 1e-5) && near(beadedFrequency(T, mu, L, n(p.n)), fn, 1e-5), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-standing-table')) {
      const rows = filled(slide);
      for (const [mode, lambda, f] of rows) {
        const [v] = quantities(slide, 'm s');
        const stepped = beadedFrequency(v ** 2, 1, quantities(slide, 'm}')[0], mode);
        expect(near(stepped, f, 1e-5) && near(lambda * stepped, v, 1e-5), JSON.stringify(p)).toBe(true);
      }
    }
  });
});
