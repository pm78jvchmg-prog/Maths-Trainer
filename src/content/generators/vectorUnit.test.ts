/**
 * Independent checks on the level 14 vector generators: each answer is worked
 * out again from the question's own numbers, by a different route from the
 * one the generator took (atan2 for angles, a sum of squares for unit
 * vectors), so a generator that agrees with itself but not with the maths
 * fails here.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { vectorUnitGenerators } from './vectorUnit';

const byId = (id: string) => {
  const found = vectorUnitGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found as Generator<Record<string, unknown>>;
};

/** Every draw of a generator over 200 seeds at both difficulties. */
function draws(id: string): { params: Record<string, unknown>; slide: Slide }[] {
  const generator = byId(id);
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: 200 }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params) };
    }),
  );
}

/** A tile token as a number: `3`, `-2`, `\frac{3}{5}`, `-\frac{4}{5}`. */
function tokenValue(token: string): number {
  const frac = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(token);
  if (frac) return (frac[1] ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  const n = Number(token);
  if (Number.isNaN(n)) throw new Error(`unreadable token ${token}`);
  return n;
}

const degrees = (x: number, y: number) => {
  const d = (Math.atan2(y, x) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};

describe('vectorUnit generators', () => {
  it('vunit-angle: the right option is the anticlockwise angle from i, to the nearest degree', () => {
    for (const { params, slide } of draws('vunit-angle')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      const expected = Math.round(degrees(params.a as number, params.b as number));
      expect(right.label).toBe(`${expected}^\\circ`);
      // Far from a half degree, so a calculator cannot round the other way.
      const exact = degrees(params.a as number, params.b as number);
      expect(Math.abs((exact % 1) - 0.5)).toBeGreaterThan(0.05);
    }
  });

  it('vunit-axis-angle: the answer is the angle atan2 gives', () => {
    for (const { slide } of draws('vunit-axis-angle')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const text = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
      const vector = /to \$([^$]+)\$/.exec(text)![1];
      const component = (unit: 'i' | 'j') => {
        const m = new RegExp(`(^|[+-])\\s*(\\d*)\\\\mathbf\\{${unit}\\}`).exec(vector.replace(/\s+/g, ''));
        if (!m) return 0;
        const size = m[2] === '' ? 1 : Number(m[2]);
        return m[1] === '-' ? -size : size;
      };
      expect(Number(slide.answer)).toBeCloseTo(degrees(component('i'), component('j')), 9);
    }
  });

  it('vunit-hat and vunit-3d-hat: the answer has length one and points the same way', () => {
    for (const id of ['vunit-hat', 'vunit-3d-hat']) {
      for (const { params, slide } of draws(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected tiles');
        const values = slide.answer.map(tokenValue);
        const v = id === 'vunit-hat' ? [params.a as number, params.b as number] : (params.v as number[]);
        expect(values.reduce((s, n) => s + n * n, 0)).toBeCloseTo(1, 12);
        const size = Math.hypot(...v);
        values.forEach((n, at) => expect(n).toBeCloseTo(v[at] / size, 12));
      }
    }
  });

  it('vunit-scale-to: the answer has the magnitude asked for, in the same direction', () => {
    for (const { params, slide } of draws('vunit-scale-to')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [x, y] = slide.answer.map(Number);
      const { a, b, c, t } = params as { a: number; b: number; c: number; t: number };
      expect(Math.hypot(x, y)).toBeCloseTo(t * c, 9);
      expect(x * b - y * a).toBe(0);
      expect(x * a + y * b).toBeGreaterThan(0);
    }
  });

  it('vunit-mag-k: the stated k gives the stated magnitude', () => {
    for (const { params, slide } of draws('vunit-mag-k')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const { b, c } = params as { b: number; c: number };
      expect(Math.hypot(Number(slide.answer), b)).toBeCloseTo(c, 12);
    }
  });

  it('vunit-surd: the right option is the magnitude, and in simplest form', () => {
    for (const { params, slide } of draws('vunit-surd')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const label = slide.options.find((o) => o.id === slide.correctId)!.label;
      const [, k, m] = /^(\d+)\\sqrt\{(\d+)\}$/.exec(label)!;
      const { x, y } = params as { x: number; y: number };
      expect(Number(k) * Math.sqrt(Number(m))).toBeCloseTo(Math.hypot(x, y), 9);
      for (let p = 2; p * p <= Number(m); p += 1) expect(Number(m) % (p * p)).not.toBe(0);
    }
  });

  it('vunit-3d-mag-tree: the root node is the magnitude', () => {
    for (const { params, slide } of draws('vunit-3d-mag-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      expect(Number(slide.answer[4])).toBeCloseTo(Math.hypot(...(params.v as number[])), 9);
    }
  });
});
