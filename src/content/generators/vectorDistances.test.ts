/**
 * The `vdist-` generators, checked against the question the learner reads.
 *
 * The sweep proves each generator agrees with itself. Here every line, plane
 * and point is read back off the rendered prompt TeX, the distance or point is
 * worked out again by plain floating-point geometry (projection, not the
 * generator's own formulae), and the slide's answer has to match it.
 */
import { describe, expect, it } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import type { Block, Generator, Slide } from '../types';
import { vectorDistancesGenerators } from './vectorDistances';

const SEEDS = 300;
type V = number[];

const byId = (id: string) => vectorDistancesGenerators.find((g) => g.id === id) as Generator<unknown>;

const dot = (u: V, v: V) => u.reduce((s, x, i) => s + x * v[i], 0);
const sub = (u: V, v: V) => u.map((x, i) => x - v[i]);
const add = (u: V, v: V) => u.map((x, i) => x + v[i]);
const mul = (k: number, u: V) => u.map((x) => k * x);
const len = (u: V) => Math.sqrt(dot(u, u));

function displays(slide: Slide): string[] {
  const prompt = (slide as { prompt: Block[] }).prompt;
  return prompt.filter((b): b is { kind: 'display'; tex: string } => b.kind === 'display').map((b) => b.tex);
}

function columns(tex: string): V[] {
  return [...tex.matchAll(/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/g)].map((m) => m[1].split('\\\\').map((s) => Number(s.trim())));
}

function point(tex: string): V {
  const m = /\\left\((.*?)\\right\)/.exec(tex);
  if (!m) throw new Error(`no point in ${tex}`);
  return m[1].split(',').map((s) => Number(s.trim()));
}

/** `\Pi\colon \; {2x - y + 2z = 5}` or `{\mathbf{r} \cdot (col) = 5}` as [n, d]. */
function plane(tex: string): [V, number] {
  const body = /\{(.*)\}$/.exec(tex.replace(/^.*?\\;\s*/, ''))?.[1] ?? '';
  const [lhs, rhs] = body.split('=');
  const d = Number(rhs.trim());
  if (lhs.includes('pmatrix')) return [columns(lhs)[0], d];
  const n = [0, 0, 0];
  for (const m of lhs.replace(/\s+/g, '').matchAll(/([+-]?)(\d*)([xyz])/g)) {
    n['xyz'.indexOf(m[3])] = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
  }
  return [n, d];
}

/** Distance from p to the line a + t d, by projection. */
function pointLine(p: V, a: V, d: V): number {
  const ap = sub(p, a);
  const along = dot(ap, d) / dot(d, d);
  return len(sub(ap, mul(along, d)));
}

const numeric = (answer: string) => Number(evaluate(answer));

function draws(id: string, check: (slide: Slide) => void) {
  const g = byId(id);
  for (const difficulty of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const slide = g.render(g.sample(makeRng(`${id}:${difficulty}:${seed}`), difficulty));
      check(slide);
    }
  }
}

describe('vdist generators against the geometry on the page', () => {
  it('the foot of the perpendicular is on the line, square to it', () => {
    draws('vdist-foot-point', (slide) => {
      const [line, P] = displays(slide);
      const [a, d] = columns(line);
      const p = point(P);
      const F = (slide as { answer: string[] }).answer.map(Number);
      const t = dot(sub(p, a), d) / dot(d, d);
      expect(F).toEqual(add(a, mul(t, d)));
    });
    draws('vdist-foot-t', (slide) => {
      const [line, P] = displays(slide);
      const [a, d] = columns(line);
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(dot(sub(point(P), a), d) / dot(d, d), 9);
    });
  });

  it('point to line distances', () => {
    for (const id of ['vdist-point-line']) {
      draws(id, (slide) => {
        const [line, P] = displays(slide);
        const [a, d] = columns(line);
        expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(pointLine(point(P), a, d), 9);
      });
    }
    draws('vdist-parallel-lines', (slide) => {
      const [l1, l2] = displays(slide);
      const [a, d] = columns(l1);
      const [c, e] = columns(l2);
      expect(len([d[1] * e[2] - d[2] * e[1], d[2] * e[0] - d[0] * e[2], d[0] * e[1] - d[1] * e[0]])).toBe(0);
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(pointLine(c, a, d), 9);
    });
  });

  it('point to plane, origin to plane, and parallel planes', () => {
    draws('vdist-point-plane', (slide) => {
      const [pl, P] = displays(slide);
      const [n, d] = plane(pl);
      // The foot by moving along the unit normal; the distance is how far.
      const p = point(P);
      const expected = Math.abs((dot(n, p) - d) / len(n));
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(expected, 9);
    });
    draws('vdist-origin-plane', (slide) => {
      const [n, d] = plane(displays(slide)[0]);
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(Math.abs(d) / len(n), 9);
    });
    draws('vdist-origin-given', (slide) => {
      const text = (slide as { prompt: Block[] }).prompt.find((b) => b.kind === 'prose') as { text: string };
      const stated = /distance \$(.*?)\$/.exec(text.text)?.[1] ?? '';
      const frac = /^\\frac\{(\d+)\}\{(\d+)\}$/.exec(stated);
      const distance = frac ? Number(frac[1]) / Number(frac[2]) : Number(stated);
      const lhs = /\{(.*) = d\}/.exec(displays(slide)[0])?.[1] ?? '';
      const [n] = plane(`\\Pi\\colon \\; {${lhs} = 0}`);
      const d = numeric((slide as { answer: string }).answer);
      expect(d).toBeGreaterThan(0);
      expect(d / len(n)).toBeCloseTo(distance, 9);
    });
    draws('vdist-parallel-planes', (slide) => {
      const [p1, p2] = displays(slide);
      const [n1, d1] = plane(p1);
      const [n2, d2] = plane(p2);
      // A point on plane 1, then its distance to plane 2.
      const q = mul(d1 / dot(n1, n1), n1);
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(Math.abs(dot(n2, q) - d2) / len(n2), 9);
    });
  });

  it('the foot on a plane and the mirror image', () => {
    for (const id of ['vdist-plane-foot', 'vdist-reflect']) {
      draws(id, (slide) => {
        const [pl, P] = displays(slide);
        const [n, d] = plane(pl);
        const p = point(P);
        const got = (slide as { answer: string[] }).answer.map(Number);
        const foot = sub(p, mul((dot(n, p) - d) / dot(n, n), n));
        expect(got).toEqual(id === 'vdist-plane-foot' ? foot : sub(mul(2, foot), p));
      });
    }
  });

  it('skew lines', () => {
    draws('vdist-skew-distance', (slide) => {
      const [l1, l2] = displays(slide);
      const [a, d1] = columns(l1);
      const [c, d2] = columns(l2);
      // Minimise |a + s d1 - c - t d2| by solving the 2x2 normal equations.
      const w = sub(a, c);
      const A = dot(d1, d1);
      const B = dot(d1, d2);
      const C = dot(d2, d2);
      const D = dot(d1, w);
      const E = dot(d2, w);
      const det = A * C - B * B;
      expect(det).not.toBe(0);
      const s = (B * E - C * D) / det;
      const t = (A * E - B * D) / det;
      const gap = len(sub(add(a, mul(s, d1)), add(c, mul(t, d2))));
      expect(gap).toBeGreaterThan(0);
      expect(numeric((slide as { answer: string }).answer)).toBeCloseTo(gap, 9);
    });
  });
});
