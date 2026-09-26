/**
 * Classical Mechanics level 3, checked against the physics.
 *
 * Every answer is read back off the rendered slide and checked by a route the
 * generator does not take: fluid pressure by stacking thin layers of liquid,
 * buoyancy as the difference in pressure between the bottom and top faces of
 * a cube, a hydraulic press by the work in equalling the work out, drag and
 * terminal speed by balancing forces, and bends by resolving the reaction and
 * friction horizontally and vertically.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;
const TIME = { timeout: 60_000 };
const g = 9.8;
const P0 = 101_000;

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

/** The numbers a slide's answer holds, in order; a flow's are its `$`-wrapped values. */
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
      return slide.answer.filter((s) => /^\$[\d.]+\$$/.test(s)).map((s) => Number(s.replace(/\$/g, '')));
    default:
      throw new Error(`no reader for ${slide.kind}`);
  }
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const n = (v: unknown) => v as number;
/** Absolute closeness, for an answer rounded to a stated precision: within half a last-place unit. */
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;
/** Half a last-place unit of a value given to 3 significant figures. */
const halfSf3 = (v: number) => 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(v))) - 2);

/** Pressure below the surface of a liquid, in pascals, by adding the weight of 10 000 thin layers over each square metre. */
function stacked(rho: number, h: number, top = 0): number {
  const layers = 10_000;
  const dh = h / layers;
  let p = top;
  for (let i = 0; i < layers; i += 1) p += rho * dh * g;
  return p;
}

/** Buoyant force on a cube of volume V (m^3) under a liquid: the bottom face pushed up harder than the top face is pushed down. */
function cubeBuoyancy(rho: number, V: number): number {
  const side = Math.cbrt(V);
  const topDepth = 1;
  const face = side * side;
  return (stacked(rho, topDepth + side) - stacked(rho, topDepth)) * face;
}

describe('classical mechanics level 3', () => {
  it('spreads a force over an area', TIME, () => {
    for (const { p, slide } of draws('clm-pressure')) {
      const F = p.cm ? n(p.F) * g : n(p.F);
      const A = p.cm ? n(p.A) * 1e-4 : n(p.A);
      expect(near(answerOf(slide)[0], p.cm ? F / A / 1000 : F / A, 1e-9), JSON.stringify(p)).toBe(true);
    }
    for (const { slide } of draws('clm-pressure-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const fill = [...slide.answer];
      for (const row of slide.rows) {
        const [F, A, pr] = row.map((cell) => Number(cell ?? fill.shift()));
        expect(near(F, pr * A, 1e-9)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-heel-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const heel = (n(p.m) * g) / (n(p.heel) * 1e-4) / 1000;
      const footArea = p.footCm ? n(p.foot) * 1e-4 : n(p.foot);
      const foot = (n(p.M) * g) / 4 / footArea / 1000;
      const [a, b] = answerOf(slide);
      // Each pressure to 3 significant figures.
      expect(within(a, heel, halfSf3(heel)) && within(b, foot, halfSf3(foot)), JSON.stringify(p)).toBe(true);
      expect(slide.answer[2].includes('heel')).toBe(heel > foot);
    }
    for (const { p, slide } of draws('clm-area-slider')) {
      const F = p.hard ? n(p.load) * g : n(p.load);
      const limit = n(p.limit) * 1000;
      const A = answerOf(slide)[0];
      if (p.hard) {
        // The walker's area to the nearest 0.02: within 0.01 of the area that puts them exactly at the limit.
        expect(within(A, F / limit, 0.01), JSON.stringify(p)).toBe(true);
      } else {
        // Exactly at the limit on that area, and over it one step smaller.
        expect(near(F / A, limit, 1e-9) && F / (A - 0.02) > limit).toBe(true);
      }
    }
  });

  it('adds pressure layer by layer going down', TIME, () => {
    for (const { p, slide } of draws('clm-depth-pressure')) {
      const liquid = p.liquid as { rho: number } | null;
      const h = n(p.halves) / 2;
      const want = p.absolute ? stacked(liquid!.rho, h, P0) : stacked(1000, h);
      expect(near(answerOf(slide)[0] * 1000, want, 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-depth-tree')) {
      const water = stacked(p.sea ? 1025 : 1000, n(p.halves) / 2);
      const [gauge, total, push] = answerOf(slide);
      // Air on both faces of the window cancels; the water alone pushes it in.
      const net = (P0 + water) * n(p.A) - P0 * n(p.A);
      expect(near(gauge * 1000, water, 1e-6) && near(total * 1000, P0 + water, 1e-6) && near(push * 1000, net, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-depth-slider')) {
      const h = answerOf(slide)[0];
      const reading = 9.8 * (n(p.halves) / 2) * 1000 + (p.total ? P0 : 0);
      expect(near(stacked(1000, h, p.total ? P0 : 0), reading, 1e-6)).toBe(true);
    }
  });

  it('gets out of a hydraulic press the work put in', TIME, () => {
    for (const { slide } of draws('clm-hydraulic-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const fill = [...slide.answer];
      for (const row of slide.rows) {
        const [A1, A2, F1, F2] = row.map((cell) => Number(cell ?? fill.shift()));
        // Push the small piston 1 cm: the oil it moves lifts the big one A1/A2 cm.
        const d1 = 0.01;
        const d2 = (d1 * A1) / A2;
        expect(near(F1 * d1, F2 * d2, 1e-9)).toBe(true);
      }
    }
  });

  it('pushes up by the difference between the bottom and top faces', TIME, () => {
    for (const { p, slide } of draws('clm-buoyant-force')) {
      const liquid = p.liquid as { rho: number } | null;
      const V = liquid ? n(p.cc) * 1e-6 : (n(p.halves) / 2) * 1e-3;
      expect(near(answerOf(slide)[0], cubeBuoyancy(liquid ? liquid.rho : 1000, V), 1e-6), JSON.stringify(p)).toBe(true);
    }
    for (const { p, slide } of draws('clm-float-depth')) {
      const d = answerOf(slide)[0] / 100;
      const fluid = p.fluid as { rho: number };
      // Per square metre of base: the block's weight against the push of the liquid at its bottom face.
      expect(near(n(p.rho) * (n(p.H) / 100) * g, stacked(fluid.rho, d), 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-weigh-tree')) {
      const m = n(p.m);
      const V = n(p.V) * 1e-3;
      const got = answerOf(slide);
      const B = cubeBuoyancy(1000, V);
      if (p.hard) expect(near(got[0], B, 1e-6) && near(got[1], V, 1e-9) && near(got[2], m / V, 1e-9)).toBe(true);
      else expect(near(got[0], m * g, 1e-9) && near(got[1], B, 1e-6) && near(got[2], m * g - B, 1e-6)).toBe(true);
    }
    for (const { p, slide } of draws('clm-sink-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const fluid = p.fluid as { rho: number };
      const V = n(p.V) * 1e-3;
      const rho = n(p.m) / V;
      const most = cubeBuoyancy(fluid.rho, V);
      const floats = most > n(p.m) * g;
      expect(slide.answer[1] === 'It floats').toBe(floats);
      const got = answerOf(slide);
      expect(near(got[0], rho, 1e-9)).toBe(true);
      // Floating, the part under pushes aside its own weight of liquid.
      if (floats) expect(near(cubeBuoyancy(fluid.rho, V * got[1]), n(p.m) * g, 1e-6)).toBe(true);
    }
  });

  it('balances drag against weight', TIME, () => {
    for (const { p, slide } of draws('clm-drag-force')) {
      const v = n(p.v);
      const want = p.hard ? 0.5 * n(p.C) * 1.2 * n(p.A) * v * v : n(p.k) * v * v;
      expect(near(answerOf(slide)[0], want, 1e-9)).toBe(true);
    }
    for (const id of ['clm-terminal', 'clm-terminal-slider']) {
      for (const { p, slide } of draws(id)) {
        const W = p.hard ? n(p.load) * g : n(p.load);
        // The speed where drag kv^2 has grown to the weight, to 1 decimal place, or to the nearest whole on the slider.
        const v = Math.sqrt(W / n(p.k));
        expect(within(answerOf(slide)[0], v, id === 'clm-terminal' ? 0.05 : 0.5), `${id} ${JSON.stringify(p)}`).toBe(true);
      }
    }
    for (const { slide } of draws('clm-drag-table')) {
      if (slide.kind !== 'table') throw new Error('not a table');
      const fill = [...slide.answer];
      const rows = slide.rows.map((row) => row.map((cell) => Number(cell ?? fill.shift())));
      const k = rows[0][1] / rows[0][0] ** 2;
      for (const [v, F] of rows) expect(near(F, k * v * v, 1e-9)).toBe(true);
    }
    for (const { p, slide } of draws('clm-fall-accel-flow')) {
      const [drag, net, a] = answerOf(slide);
      const m = n(p.m);
      expect(near(drag, n(p.k) * n(p.v) ** 2, 1e-9) && near(m * a + drag, m * g, 1e-9) && near(net, m * a, 1e-9)).toBe(true);
    }
  });

  it('turns a bend with the forces resolved', TIME, () => {
    for (const { p, slide } of draws('clm-bend-pick')) {
      if (slide.kind !== 'forces' || slide.mode !== 'pick') throw new Error('not a pick');
      const scene = p.scene as { surface: string };
      const acting = slide.answer.split('|');
      expect(acting).toContain('down');
      if (scene.surface === 'level') {
        // Up balances the weight; exactly one sideways force, the friction, and it points into the turn.
        expect(acting.filter((d) => d === 'left' || d === 'right')).toHaveLength(1);
        expect(String(p.story)).toContain(`turning to the ${acting.find((d) => d === 'left' || d === 'right')}`);
      } else {
        expect(acting).toContain('outOfSlope');
        expect(acting.filter((d) => d === 'upSlope' || d === 'downSlope').length).toBeLessThanOrEqual(1);
      }
    }
    for (const id of ['clm-flat-bend', 'clm-bend-slider']) {
      for (const { p, slide } of draws(id)) {
        const got = answerOf(slide)[0];
        // Per kilogram: the most friction can give, mu g, equals what the turn needs, v^2 / r.
        if (p.find === 'v') {
          const v = Math.sqrt(n(p.mu) * g * n(p.r));
          expect(within(got, v, id === 'clm-flat-bend' ? 0.05 : 0.25), `${id} ${JSON.stringify(p)}`).toBe(true);
        } else {
          const r = n(p.v) ** 2 / (n(p.mu) * g);
          expect(within(got, r, halfSf3(r)), `${id} ${JSON.stringify(p)}`).toBe(true);
        }
      }
    }
    for (const { p, slide } of draws('clm-bank-tree')) {
      const got = answerOf(slide);
      const r = n(p.r);
      // Per kilogram: R cos(theta) holds the weight, R sin(theta) turns it, so tan(theta) = v^2 / (rg).
      if (p.find === 'tan') {
        const v = n(p.v);
        const tan = (v * v) / (r * g);
        expect(near(got[0], v * v) && near(got[1], r * g) && within(got[2], tan, halfSf3(tan)), JSON.stringify(p)).toBe(true);
      } else {
        const theta = Math.atan(n(p.tan));
        const v = Math.sqrt(r * g * Math.tan(theta));
        expect(near(got[0], r * g) && near(got[1], v * v, 1e-6) && within(got[2], v, 0.05), JSON.stringify(p)).toBe(true);
      }
    }
    for (const { p, slide } of draws('clm-bank-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const theta = Math.atan(n(p.tan));
      const r = n(p.r);
      const u = n(p.u);
      // Friction along the slope, per kilogram, positive down it: what the turn needs beyond the reaction's share.
      const along = ((u * u) / r) * Math.cos(theta) - g * Math.sin(theta);
      const want = Math.abs(along) < 1e-9 ? 'No friction is needed' : along > 0 ? 'Down the slope' : 'Up the slope';
      expect(slide.answer[1], JSON.stringify(p)).toBe(want);
      expect(within(answerOf(slide)[0], Math.sqrt(r * g * n(p.tan)), 0.05)).toBe(true);
    }
  });
});
