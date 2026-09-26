/**
 * An independent check on Implicit Curves and their Sketches.
 *
 * Nothing here trusts the generator's own arithmetic. Every question's curve
 * is read back off the slide the learner sees — the displayed equation parsed
 * from its TeX into mathjs — and each answer is worked out again from that:
 * symmetry by evaluating the equation at mirrored random points, crossings
 * and extents by brute-force scanning, flat and vertical tangents by mathjs's
 * own partial derivatives, and every sketch by reading its SVG path back into
 * coordinates and measuring how far each offered equation is from the drawn
 * curve.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { parseSet } from '../numberLine';
import type { Block, Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { GRID_PANEL, SKETCH_SPAN, implicitSketchGenerators } from './implicitSketch';

const SEEDS = 200;

const byId = (id: string): Generator<unknown> => {
  if (id.endsWith('+choice')) {
    const base = byId(id.slice(0, -'+choice'.length));
    return choiceVariant(base)!;
  }
  const found = implicitSketchGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
};

function slides(id: string): Slide[] {
  const generator = byId(id);
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => generator.render(generator.sample(makeRng(seed), difficulty))),
  );
}

/** TeX the learner reads, as mathjs syntax: fractions, powers and implied products. */
function texToMath(tex: string): string {
  let s = tex.replace(/\$/g, '');
  s = s.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*)\}/g, '(($1)/($2))');
  s = s.replace(/\^\{([^{}]*)\}/g, '^($1)');
  s = s.replace(/\\cdot|\\times/g, '*');
  s = s.replace(/([a-z])(?=[a-z])/g, '$1 ');
  s = s.replace(/([a-z0-9)])\s*\(/g, '$1*(');
  s = s.replace(/\)\s*([a-z0-9])/g, ')*$1');
  s = s.replace(/(\d)\s*([a-z])/g, '$1*$2');
  if (/\\/.test(s)) throw new Error(`unread TeX in ${tex}`);
  return s;
}

type G = (x: number, y: number) => number;

/** An equation `L = R` as G(x, y) = L - R. */
function curveOf(tex: string): G {
  const [left, right] = tex.split('=');
  const node = math.compile(`(${texToMath(left)}) - (${texToMath(right)})`);
  return (x, y) => node.evaluate({ x, y }) as number;
}

const displays = (blocks: Block[]): string =>
  blocks
    .filter((b): b is Extract<Block, { kind: 'display' }> => b.kind === 'display')
    .map((b) => b.tex)
    .join(' ');

const proseOf = (blocks: Block[]): string =>
  blocks
    .filter((b): b is Extract<Block, { kind: 'prose' }> => b.kind === 'prose')
    .map((b) => b.text)
    .join(' ');

const close = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/** Fixed off-integer probe points. */
const PROBES: [number, number][] = Array.from({ length: 12 }, (_, i) => [
  0.37 + 0.61 * i - 3.1,
  1.73 - 0.47 * i + 0.13 * (i % 3),
]);

const sameEverywhere = (f: G, g: G) => PROBES.every(([x, y]) => close(f(x, y), g(x, y)));

const pointIn = (text: string): [number, number][] =>
  [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);

/** The integer roots of v -> G on one axis, found by scanning. */
function axisRoots(g: G, axis: 'x' | 'y'): number[] {
  const out: number[] = [];
  for (let v = -40; v <= 40; v += 1) if (close(axis === 'x' ? g(v, 0) : g(0, v), 0)) out.push(v);
  return out;
}

/** Coefficients of the quadratic G restricted to an axis. */
function axisQuadratic(g: G, axis: 'x' | 'y'): [number, number, number] {
  const f = (v: number) => (axis === 'x' ? g(v, 0) : g(0, v));
  const c = f(0);
  const a = (f(1) + f(-1)) / 2 - c;
  const b = (f(1) - f(-1)) / 2;
  return [a, b, c];
}

describe('isk-symmetry', () => {
  it('names the axes the displayed equation is really symmetric in', () => {
    for (const slide of slides('isk-symmetry')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const g = curveOf(displays(slide.prompt));
      const inX = sameEverywhere(g, (x, y) => g(x, -y));
      const inY = sameEverywhere(g, (x, y) => g(-x, y));
      const want = inX && inY ? 'both' : inX ? 'x' : inY ? 'y' : 'neither';
      expect(slide.correctId).toBe(want);
    }
  });

  it('walks the flow through the true substitutions', () => {
    for (const slide of slides('isk-symmetry-flow')) {
      if (slide.kind !== 'flow') throw new Error('flow expected');
      const g = curveOf(slide.subject);
      const afterY = curveOf(slide.answer[0]);
      const afterX = curveOf(slide.answer[1]);
      expect(sameEverywhere(afterY, (x, y) => g(x, -y))).toBe(true);
      expect(sameEverywhere(afterX, (x, y) => g(-x, y))).toBe(true);
      // The slip offered at each step really is a different equation.
      for (const [stepId, flipped] of [
        ['y', (x: number, y: number) => g(x, -y)],
        ['x', (x: number, y: number) => g(-x, y)],
      ] as const) {
        const step = slide.steps.find((s) => s.id === stepId)!;
        for (const branch of step.branches.filter((b) => b.outcome !== undefined)) {
          expect(sameEverywhere(curveOf(branch.label), flipped)).toBe(false);
        }
      }
      const inX = sameEverywhere(g, (x, y) => g(x, -y));
      const inY = sameEverywhere(g, (x, y) => g(-x, y));
      const verdict = inX && inY ? 'Both axes' : inX ? 'The $x$-axis only' : inY ? 'The $y$-axis only' : 'Neither axis';
      expect(slide.answer[2]).toBe(verdict);
    }
  });
});

describe('isk-mirror-point', () => {
  it('places a mirrored point that is on the curve, where the other mirrors are not', () => {
    for (const slide of slides('isk-mirror-point')) {
      if (slide.kind !== 'tiles') throw new Error('tiles expected');
      const g = curveOf(displays(slide.prompt));
      const [[p, q]] = pointIn(proseOf(slide.prompt));
      expect(close(g(p, q), 0)).toBe(true);
      const [x, y] = slide.answer.map(Number);
      expect(close(g(x, y), 0)).toBe(true);
      const mirrors: [number, number][] = [
        [p, -q],
        [-p, q],
        [-p, -q],
      ];
      const at = mirrors.findIndex(([s, t]) => s === x && t === y);
      expect(at).toBeGreaterThanOrEqual(0);
      // The symmetry that sends (p, q) there holds everywhere, not just at the point.
      const moved: G = [(u: number, v: number) => g(u, -v), (u: number, v: number) => g(-u, v), (u: number, v: number) => g(-u, -v)][at];
      expect(sameEverywhere(g, moved)).toBe(true);
      for (const [s, t] of mirrors.filter((_, i) => i !== at)) expect(close(g(s, t), 0)).toBe(false);
    }
  });

  it('offers exactly one option on the curve in its choice form', () => {
    for (const slide of slides('isk-mirror-point+choice')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const g = curveOf(displays(slide.prompt));
      const [given] = pointIn(proseOf(slide.prompt));
      for (const option of slide.options) {
        const [[x, y]] = pointIn(option.label);
        const on = close(g(x, y), 0) && (x !== given[0] || y !== given[1]);
        expect(on, option.label).toBe(option.id === slide.correctId);
      }
    }
  });
});

describe('meeting the axes', () => {
  it('places every crossing of the asked axis', () => {
    for (const slide of slides('isk-intercepts')) {
      if (slide.kind !== 'tiles') throw new Error('tiles expected');
      const g = curveOf(displays(slide.prompt));
      const axis = slide.template.startsWith('x') ? 'x' : 'y';
      const roots = axisRoots(g, axis);
      expect(roots).toHaveLength(2);
      expect([...slide.answer].map(Number).sort((a, b) => a - b)).toEqual(roots);
    }
  });

  it('marks the true pair of crossings in the choice form', () => {
    for (const slide of slides('isk-intercepts+choice')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const g = curveOf(displays(slide.prompt));
      const axis = /\$x\$-axis/.test(proseOf(slide.prompt)) ? 'x' : 'y';
      const roots = axisRoots(g, axis).join(',');
      for (const option of slide.options) {
        const values = [...option.label.matchAll(/= (-?\d+)/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
        expect(values.join(',') === roots, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('follows the flow to the true crossings', () => {
    for (const slide of slides('isk-meet-flow')) {
      if (slide.kind !== 'flow') throw new Error('flow expected');
      const g = curveOf(displays(slide.prompt));
      const axis = /\$x\$-axis/.test(proseOf(slide.prompt)) ? 'x' : 'y';
      expect(slide.answer[0]).toBe(axis === 'x' ? '$y = 0$' : '$x = 0$');
      // The equation left on the axis agrees with the curve along it.
      const left = curveOf(slide.answer[1]);
      for (const v of [-2.3, 0.7, 1.9]) {
        expect(close(axis === 'x' ? left(v, 0) : left(0, v), axis === 'x' ? g(v, 0) : g(0, v))).toBe(true);
      }
      const values = [...slide.answer[2].matchAll(/= (-?\d+)/g)].map((m) => Number(m[1]));
      expect(values).toEqual(axisRoots(g, axis));
    }
  });

  it('counts the crossings by the discriminant of the axis quadratic', () => {
    for (const slide of slides('isk-axis-count')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const g = curveOf(displays(slide.prompt));
      const axis = /\$x\$-axis/.test(proseOf(slide.prompt)) ? 'x' : 'y';
      const [a, b, c] = axisQuadratic(g, axis);
      const disc = b * b - 4 * a * c;
      const count = Math.abs(disc) < 1e-9 ? 1 : disc > 0 ? 2 : 0;
      expect(slide.correctId).toBe(`${count}`);
      // The curve has real points: it crosses the other axis twice.
      const [a2, b2, c2] = axisQuadratic(g, axis === 'x' ? 'y' : 'x');
      expect(b2 * b2 - 4 * a2 * c2).toBeGreaterThan(0);
    }
  });
});

/** Whether the curve has a point with this x (or y): G is w^2 times a positive number plus a function of v. */
function reaches(g: G, v: number, axis: 'x' | 'y'): boolean {
  // Solve over the other coordinate by scanning finely: enough for whole-number edges.
  const at = (w: number) => (axis === 'x' ? g(v, w) : g(w, v));
  let sign = Math.sign(at(-60));
  for (let w = -60; w <= 60; w += 0.05) {
    const value = at(w);
    const s = Math.sign(value);
    if (Math.abs(value) < 1e-9 || s !== sign) return true;
    sign = s;
  }
  return false;
}

describe('where the curve can go', () => {
  it('places the true bounds of an ellipse', () => {
    for (const slide of slides('isk-bounds')) {
      if (slide.kind !== 'tiles') throw new Error('tiles expected');
      const g = curveOf(displays(slide.prompt));
      const axis = slide.template.includes('\\le x') ? 'x' : 'y';
      const [lo, hi] = slide.answer.map(Number);
      expect(lo).toBe(-hi);
      expect(reaches(g, hi, axis)).toBe(true);
      expect(reaches(g, lo, axis)).toBe(true);
      expect(reaches(g, hi + 0.01, axis)).toBe(false);
      expect(reaches(g, lo - 0.01, axis)).toBe(false);
    }
  });

  it('finds the furthest a parabola reaches', () => {
    for (const slide of slides('isk-furthest')) {
      if (slide.kind !== 'expression') throw new Error('expression expected');
      const g = curveOf(displays(slide.prompt));
      const axis = slide.lead!.startsWith('x') ? 'x' : 'y';
      const most = proseOf(slide.prompt).includes('largest');
      const h = Number(slide.answer);
      expect(reaches(g, h, axis)).toBe(true);
      expect(reaches(g, h + (most ? -0.5 : 0.5), axis)).toBe(true);
      expect(reaches(g, h + (most ? 0.01 : -0.01), axis)).toBe(false);
    }
  });

  it('shades exactly the x the curve reaches', () => {
    for (const slide of slides('isk-gap-line')) {
      if (slide.kind !== 'numberLine') throw new Error('numberLine expected');
      const g = curveOf(displays(slide.prompt));
      const pieces = parseSet(slide.answer)!;
      for (let x = -6; x <= 6; x += 0.25) {
        const inSet = pieces.some(
          (p) => (x > p.lo || (x === p.lo && p.loClosed)) && (x < p.hi || (x === p.hi && p.hiClosed)),
        );
        // y^2 = R(x) has a point exactly when R(x) >= 0, that is G(x, 0) <= 0.
        expect(g(x, 0) <= 1e-12, `x = ${x} on ${slide.answer}`).toBe(inSet);
      }
    }
  });
});

/** Partial derivatives of the displayed equation, by mathjs. */
function partials(tex: string): { gx: G; gy: G; g: G } {
  const [left, right] = tex.split('=');
  const node = math.parse(`(${texToMath(left)}) - (${texToMath(right)})`);
  const dx = math.derivative(node, 'x').compile();
  const dy = math.derivative(node, 'y').compile();
  const whole = node.compile();
  return {
    g: (x, y) => whole.evaluate({ x, y }) as number,
    gx: (x, y) => dx.evaluate({ x, y }) as number,
    gy: (x, y) => dy.evaluate({ x, y }) as number,
  };
}

describe('flat and vertical tangents', () => {
  it('names the line on which the right partial derivative vanishes', () => {
    for (const slide of slides('isk-flat-line')) {
      if (slide.kind !== 'expression') throw new Error('expression expected');
      const { gx, gy } = partials(displays(slide.prompt));
      const horizontal = proseOf(slide.prompt).includes('horizontal');
      const slope = math.evaluate(slide.answer, { x: 1, y: 1 }) as number;
      for (const w of [0.7, -1.3, 2.1]) {
        // Horizontal: dy/dx = -Gx/Gy is zero, so Gx vanishes along y = m x.
        const [x, y] = horizontal ? [w, slope * w] : [slope * w, w];
        expect(close(horizontal ? gx(x, y) : gy(x, y), 0)).toBe(true);
        expect(close(horizontal ? gy(x, y) : gx(x, y), 0)).toBe(false);
      }
    }
  });

  it('marks the true line in the choice form', () => {
    for (const slide of slides('isk-flat-line+choice')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const { gx, gy } = partials(displays(slide.prompt));
      const horizontal = proseOf(slide.prompt).includes('horizontal');
      for (const option of slide.options) {
        const [, rhs] = option.label.split('=');
        const slope = math.evaluate(texToMath(rhs), { x: 1, y: 1 }) as number;
        const [x, y] = horizontal ? [1.3, slope * 1.3] : [slope * 1.3, 1.3];
        expect(close(horizontal ? gx(x, y) : gy(x, y), 0), option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('fills the substitution tree with values that put the point on the curve', () => {
    for (const slide of slides('isk-sub-tree')) {
      if (slide.kind !== 'tree') throw new Error('tree expected');
      const { g, gx, gy } = partials(displays(slide.prompt));
      const horizontal = proseOf(slide.prompt).includes('horizontal');
      const line = /\$([xy]) = (-?\d*)([xy])\$/.exec(proseOf(slide.prompt))!;
      const m = line[2] === '' ? 1 : line[2] === '-' ? -1 : Number(line[2]);
      const [, , S, sq, w] = slide.answer.map(Number);
      const [x, y] = horizontal ? [w, m * w] : [m * w, w];
      expect(w).toBeGreaterThan(0);
      expect(sq).toBe(w * w);
      expect(close(g(x, y), 0)).toBe(true);
      expect(close(S * sq, -g(0, 0))).toBe(true);
      expect(close(horizontal ? gx(x, y) : gy(x, y), 0)).toBe(true);
      // The expression shown is the curve with the line put in.
      const shown = curveOf(slide.expression);
      for (const t of [0.4, 1.7]) {
        expect(close(horizontal ? shown(t, 0) : shown(0, t), horizontal ? g(t, m * t) : g(m * t, t))).toBe(true);
      }
    }
  });

  it('places the tangent point on the asked side', () => {
    for (const id of ['isk-flat-points', 'isk-flat-points+choice']) {
      for (const slide of slides(id)) {
        const curve = displays(slide.kind === 'teach' ? [] : slide.prompt).split(' \\frac{dy}{dx}')[0];
        const { g, gx, gy } = partials(curve);
        const prompt = slide.kind === 'teach' ? '' : proseOf(slide.prompt);
        const horizontal = prompt.includes('horizontal');
        const good = ([x, y]: [number, number]) =>
          close(g(x, y), 0) &&
          close(horizontal ? gx(x, y) : gy(x, y), 0) &&
          !close(horizontal ? gy(x, y) : gx(x, y), 0) &&
          (horizontal ? x > 0 : y > 0);
        if (slide.kind === 'tiles') {
          expect(good(slide.answer.map(Number) as [number, number])).toBe(true);
        } else if (slide.kind === 'choice') {
          for (const option of slide.options) {
            expect(good(pointIn(option.label)[0]), option.label).toBe(option.id === slide.correctId);
          }
        } else throw new Error(`unexpected ${slide.kind}`);
      }
    }
  });
});

/** The drawn curve's points back in world coordinates, from an SVG fragment `size` wide. */
function drawnPoints(svg: string, size: number): [number, number][] {
  const out: [number, number][] = [];
  for (const m of svg.matchAll(/<path fill="none" stroke="currentColor" stroke-width="2" d="([^"]+)"/g)) {
    for (const p of m[1].matchAll(/[ML] (-?[\d.]+),(-?[\d.]+)/g)) {
      const x = (Number(p[1]) * 2 * SKETCH_SPAN) / size - SKETCH_SPAN;
      const y = SKETCH_SPAN - (Number(p[2]) * 2 * SKETCH_SPAN) / size;
      if (Math.abs(x) < SKETCH_SPAN - 0.1 && Math.abs(y) < SKETCH_SPAN - 0.1) out.push([x, y]);
    }
  }
  return out;
}

/** The furthest a drawn point sits from the curve G = 0, to first order. */
function worstDistance(g: G, points: [number, number][]): number {
  const h = 1e-5;
  let worst = 0;
  for (const [x, y] of points) {
    const gx = (g(x + h, y) - g(x - h, y)) / (2 * h);
    const gy = (g(x, y + h) - g(x, y - h)) / (2 * h);
    worst = Math.max(worst, Math.abs(g(x, y)) / Math.max(Math.hypot(gx, gy), 1e-9));
  }
  return worst;
}

describe('putting a sketch together', () => {
  it('marks as right the one equation the drawn curve satisfies', () => {
    for (const slide of slides('isk-match')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const svg = slide.prompt.find((b) => b.kind === 'diagram')!;
      const points = drawnPoints((svg as { svg: string }).svg, 220);
      expect(points.length).toBeGreaterThan(40);
      for (const option of slide.options) {
        const distance = worstDistance(curveOf(option.label), points);
        if (option.id === slide.correctId) expect(distance, option.label).toBeLessThan(0.05);
        else expect(distance, option.label).toBeGreaterThan(0.3);
      }
    }
  });

  it('points at the one panel that draws the equation', () => {
    for (const slide of slides('isk-match-sketch')) {
      if (slide.kind !== 'choice') throw new Error('choice expected');
      const g = curveOf(displays(slide.prompt));
      const svg = (slide.prompt.find((b) => b.kind === 'diagram') as { svg: string }).svg;
      const panels = [...svg.matchAll(/<g data-panel="([A-D])"[^>]*>(.*?)<\/g>/g)];
      expect(panels).toHaveLength(4);
      for (const [, letter, inner] of panels) {
        const distance = worstDistance(g, drawnPoints(inner, GRID_PANEL));
        const option = slide.options.find((o) => o.label === `Sketch ${letter}`)!;
        if (option.id === slide.correctId) expect(distance, letter).toBeLessThan(0.05);
        else expect(distance, letter).toBeGreaterThan(0.3);
      }
    }
  });

  it('builds the sketch from facts that hold for the equation', () => {
    for (const slide of slides('isk-sketch-flow')) {
      if (slide.kind !== 'flow') throw new Error('flow expected');
      const g = curveOf(slide.subject);
      const [sym, meet, reach, shape] = slide.answer;
      const inX = sameEverywhere(g, (x, y) => g(x, -y));
      const inY = sameEverywhere(g, (x, y) => g(-x, y));
      expect(sym).toBe(inX && inY ? 'Both axes' : inX ? 'The $x$-axis only' : 'The $y$-axis only');

      // Crossings of the x-axis, by scanning finely for sign changes and zeros.
      const crossings: number[] = [];
      for (let x = -20; x <= 20; x += 1) if (close(g(x, 0), 0)) crossings.push(x);
      if (meet === 'At the origin only') expect(crossings).toEqual([0]);
      else {
        const a = Number(/\\pm (\d+)/.exec(meet)![1]);
        expect(crossings).toEqual([-a, a]);
      }

      // Which x the curve reaches, compared with the inequality chosen.
      const reached = (x: number) => reaches(g, x, 'x');
      const stated = (x: number): boolean => {
        const between = /\$-(\d+) \\le x \\le (\d+)\$/.exec(reach);
        if (between) return x >= -Number(between[1]) && x <= Number(between[2]);
        const outside = /\$x \\le -(\d+)\$ or \$x \\ge (\d+)\$/.exec(reach);
        if (outside) return x <= -Number(outside[1]) || x >= Number(outside[2]);
        if (reach === '$x \\ge 0$') return x >= 0;
        if (reach === '$x \\le 0$') return x <= 0;
        throw new Error(`unread ${reach}`);
      };
      for (let x = -9.75; x <= 9.75; x += 0.5) expect(reached(x), `x = ${x}: ${reach}`).toBe(stated(x));

      // The shape, from how far it reaches and how it is squared.
      const boundedX = !reached(19.75) && !reached(-19.75);
      const boundedY = !reaches(g, 19.75, 'y') && !reaches(g, -19.75, 'y');
      const xx = (g(1, 0) + g(-1, 0)) / 2 - g(0, 0);
      const yy = (g(0, 1) + g(0, -1)) / 2 - g(0, 0);
      const kind =
        boundedX && boundedY
          ? close(xx, yy)
            ? 'A circle'
            : 'An ellipse'
          : !reached(0)
            ? 'A hyperbola in two branches'
            : 'A parabola';
      expect(shape).toBe(kind);
    }
  });
});
