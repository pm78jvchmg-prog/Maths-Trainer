/**
 * Classical Mechanics level 6, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: a river crossing by stepping the boat across, the
 * centre-of-mass frame by the momentum in it being zero and an elastic bounce
 * keeping both momentum and energy, the rotating frame by Newton's second law
 * seen from the ground, and relativity by the Lorentz factor worked out from
 * the speed and by the invariant interval.
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

/** A TeX number or simple fraction as a value. */
const read = (s: string): number => {
  const t = s.replace(/\$/g, '');
  const frac = /^\\tfrac\{(\d+)\}\{(\d+)\}$/.exec(t);
  return frac ? Number(frac[1]) / Number(frac[2]) : Number(t);
};

function answerOf(slide: Slide): number[] {
  switch (slide.kind) {
    case 'expression':
      return [Number(math.evaluate(slide.answer))];
    case 'slider':
      return [slide.answer];
    case 'tree':
    case 'table':
      return slide.answer.map(read);
    case 'flow':
      return slide.answer.filter((s) => /^\$[^$]*\$$/.test(s)).map(read);
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

function filled(slide: Slide): string[][] {
  if (slide.kind !== 'table') throw new Error('not a table');
  const fill = [...slide.answer];
  return slide.rows.map((row) => row.map((cell) => cell ?? (fill.shift() as string)));
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
/** Absolute closeness, for an answer rounded to a stated precision: within half a last-place unit. */
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;
/** Half a last-place unit of a value given to 3 significant figures. */
const halfSf3 = (v: number) => 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(v))) - 2);
const gammaAt = (v: number) => 1 / Math.sqrt(1 - v * v);

describe('classical mechanics level 6', () => {
  it('adds velocities between everyday frames', TIME, () => {
    for (const { slide } of draws('clm-train-table')) {
      for (const [train, walk, ground] of filled(slide).map((row) => row.map(Number))) expect(near(ground, train + walk)).toBe(true);
    }
    for (const id of ['clm-river-tree', 'clm-drift-slider']) {
      for (const { p, slide } of draws(id)) {
        const tri = p.tri as number[];
        const b = n(p.k) * tri[1] * 0.5;
        const c = n(p.k) * tri[0] * 0.5;
        // Step the boat across: y by the boat, x by the current.
        let x = 0;
        let y = 0;
        let t = 0;
        const dt = 1e-3;
        while (y + b * dt <= n(p.w) + 1e-12) {
          x += c * dt;
          y += b * dt;
          t += dt;
        }
        const rest = (n(p.w) - y) / b;
        x += c * rest;
        t += rest;
        const got = answerOf(slide);
        if (id === 'clm-river-tree') expect(near(got[0], t, 1e-6) && near(got[1], x, 1e-6) && near(got[2], Math.hypot(b, c), 1e-9), JSON.stringify(p)).toBe(true);
        else expect(near(got[0], x, 1e-6)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-plane-wind')) {
      const tri = p.tri as number[];
      const wind = n(p.k) * tri[0];
      const v = answerOf(slide)[0];
      // Hard: air velocity (-wind, v) has the stated air speed; easy: ground velocity (wind, air speed north).
      if (p.hard) expect(near(Math.hypot(wind, v), n(p.k) * tri[2])).toBe(true);
      else expect(near(v, Math.hypot(wind, n(p.k) * tri[1]))).toBe(true);
    }
  });

  it('sees zero momentum from the centre of mass, and an elastic bounce keeps energy', TIME, () => {
    for (const { p, slide } of draws('clm-com-frame-tree')) {
      const [, u1, u2] = answerOf(slide);
      expect(near(n(p.m1) * u1 + n(p.m2) * u2, 0, 1e-9) && near(u1 - u2, n(p.v1) - n(p.v2))).toBe(true);
    }
    for (const { p, slide } of draws('clm-com-velocity')) {
      const V = answerOf(slide)[0];
      expect(near((n(p.m1) + n(p.m2)) * V, n(p.m1) * n(p.v1) + n(p.m2) * n(p.v2))).toBe(true);
    }
    for (const { p, slide } of draws('clm-elastic-flow')) {
      const v1 = answerOf(slide)[2];
      const { m1, m2, v1: u1, v2: u2 } = p as { m1: number; m2: number; v1: number; v2: number };
      const v2 = (m1 * u1 + m2 * u2 - m1 * v1) / m2;
      expect(near(0.5 * m1 * v1 ** 2 + 0.5 * m2 * v2 ** 2, 0.5 * m1 * u1 ** 2 + 0.5 * m2 * u2 ** 2, 1e-9), JSON.stringify(p)).toBe(true);
      expect(near(v1, u1)).toBe(false);
    }
    for (const { slide } of draws('clm-com-energy-table')) {
      for (const row of filled(slide)) {
        const [m1, m2] = row[0].split(',').map(Number);
        const [v1, v2] = row[1].split(',').map(Number);
        const V = (m1 * v1 + m2 * v2) / (m1 + m2);
        // Energy about the centre of mass, from the velocities in that frame.
        const inner = 0.5 * m1 * (v1 - V) ** 2 + 0.5 * m2 * (v2 - V) ** 2;
        expect(near(Number(row[4]), inner, 1e-9) && near(Number(row[2]), Number(row[3]) + Number(row[4]), 1e-9)).toBe(true);
      }
    }
  });

  it('balances the turning frame with the ground’s inward force', TIME, () => {
    for (const { p, slide } of draws('clm-centrifugal')) {
      // From the ground: the inward force is m v^2 / r with v = omega r.
      const v = n(p.w) * n(p.r);
      expect(near(answerOf(slide)[0], (n(p.m) * v * v) / n(p.r), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-space-station')) {
      const got = answerOf(slide)[0];
      // From the ground the rim moves at v = omega r, and v^2 / r must be the gravity felt. Asked to 3 significant figures.
      if (p.find === 'w') {
        const w = Math.sqrt((n(p.f) * g) / n(p.r));
        const v = w * n(p.r);
        expect(near((v * v) / n(p.r), n(p.f) * g, 1e-9) && within(got, w, halfSf3(w)), JSON.stringify(p)).toBe(true);
      } else {
        const r = (n(p.f) * g) / n(p.w) ** 2;
        expect(within(got, r, halfSf3(r)), JSON.stringify(p)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-rotor-flow')) {
      const [N, F] = answerOf(slide);
      const v = n(p.w) * n(p.r);
      expect(near(N, (n(p.m) * v * v) / n(p.r), 1e-9) && near(F, n(p.mu) * N, 1e-9)).toBe(true);
      expect(slide.kind === 'flow' && slide.answer[2] === (F >= n(p.m) * g ? 'They stay up' : 'They slide down')).toBe(true);
    }
    for (const { p, slide } of draws('clm-rotor-slider')) {
      const w = answerOf(slide)[0];
      const r = slide.kind === 'slider' ? Number(/radius \$([\d.]+)/.exec(JSON.stringify(slide.prompt))?.[1]) : NaN;
      // Friction at its limit just holds the weight, at the spin to the nearest 0.1.
      expect(within(w, Math.sqrt(g / (n(p.mu) * r)), 0.05), JSON.stringify(p)).toBe(true);
    }
  });

  it('slows moving clocks by the Lorentz factor', TIME, () => {
    for (const { p, slide } of draws('clm-dilation')) {
      const speed = p.speed as { v: number } | null;
      const gam = speed ? gammaAt(speed.v) : n(p.gamma);
      const got = answerOf(slide)[0];
      const [t, tau] = p.find === 't' ? [got, n(p.tau)] : [gam * n(p.tau), got];
      expect(near(t, gam * tau, 1e-9)).toBe(true);
    }
    for (const { slide } of draws('clm-gamma-table')) {
      for (const [gam, tau, t] of filled(slide).map((row) => row.map(Number))) expect(near(t, gam * tau, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-muon-flow')) {
      const v = (p.speed as { v: number }).v;
      const [gam, t, d] = answerOf(slide);
      // The interval: (ct)^2 - d^2 is the particle's own (c tau)^2, with c = 300 m per microsecond.
      expect(near(gam, gammaAt(v), 1e-9) && near((300 * t) ** 2 - d * d, (300 * n(p.tau)) ** 2, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-twin-tree')) {
      const v = (p.speed as { v: number }).v;
      const [t, tau, gap] = answerOf(slide);
      // Each leg: the interval in light years and years.
      const leg = t / 2;
      expect(near(leg * v, n(p.L)) && near(tau / 2, Math.sqrt(leg * leg - n(p.L) ** 2), 1e-9) && near(gap, t - tau)).toBe(true);
    }
  });

  it('shortens moving lengths and never adds speeds past light', TIME, () => {
    for (const { p, slide } of draws('clm-contraction')) {
      const speed = p.speed as { v: number } | null;
      expect(near(answerOf(slide)[0] * (speed ? gammaAt(speed.v) : n(p.gamma)), n(p.L0), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-pass-tree')) {
      const v = (p.speed as { v: number }).v;
      const [gam, L, t] = answerOf(slide);
      // In the ship's frame a point of the station crosses L0 in L0/v; that is the station's proper time t.
      expect(near(gam, gammaAt(v), 1e-9) && near(L, n(p.L0) / gammaAt(v), 1e-9) && near(t, n(p.L0) / (300 * v) / gammaAt(v), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-velocity-add')) {
      const u = answerOf(slide)[0];
      // Rapidities add.
      expect(near(Math.atanh(u), Math.atanh(n(p.a)) + Math.atanh(n(p.b)), 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-add-flow')) {
      const [naive, u] = answerOf(slide);
      const a = n(p.i) / 20;
      const b = n(p.j) / 20;
      expect(near(naive, a + b) && near(Math.atanh(u), Math.atanh(a) + Math.atanh(b), 1e-9) && u < 1 && naive > 1).toBe(true);
    }
  });
});
