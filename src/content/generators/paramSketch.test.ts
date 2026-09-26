/**
 * Independent checks on the sketching generators (Parametric & Implicit,
 * level 8).
 *
 * The sweep proves each generator agrees with itself. These read what the
 * learner is shown instead: the equations in the prompt are parsed back into
 * mathjs, and every answer is worked out again by brute force from them —
 * evaluating the curve, searching t for a listed point, scanning t for the
 * smallest or largest value, stepping forward from t = 0 to see which way a
 * circle turns, and reading the drawn path back out of the match figure's
 * SVG. None of it calls the generator's own helpers.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Block, Generator, Slide } from '../types';

const SEEDS = 150;

type Fn = (t: number) => number;
type Curve = { x: Fn; y: Fn; xTex: string; yTex: string };

/** Learner-facing TeX in t as mathjs. Handles only what these generators write. */
function toMath(tex: string): string {
  return tex
    .replace(/\\(cos|sin) t/g, '$1(t)')
    .replace(/\^\{(\d+)\}/g, '^$1')
    .replace(/(\d)\s*(t|cos|sin)/g, '$1*$2')
    .trim();
}

function compile(tex: string): Fn {
  const code = math.compile(toMath(tex));
  return (t) => code.evaluate({ t }) as number;
}

/** The "x = ..." and "y = ..." equations from a list of display strings. */
function curveFrom(displays: string[]): Curve {
  const pieces = displays
    .flatMap((tex) => tex.split(/,\s*\\quad|\\qquad|,\s*\\;/))
    .map((piece) => piece.trim());
  const xTex = pieces.find((p) => p.startsWith('x = '))!.slice(4);
  const yTex = pieces.find((p) => p.startsWith('y = '))!.slice(4);
  return { x: compile(xTex), y: compile(yTex), xTex, yTex };
}

const displaysOf = (blocks: Block[]): string[] =>
  blocks.filter((b): b is { kind: 'display'; tex: string } => b.kind === 'display').map((b) => b.tex);
const proseOf = (blocks: Block[]): string =>
  blocks
    .filter((b): b is { kind: 'prose'; text: string } => b.kind === 'prose')
    .map((b) => b.text)
    .join(' ');

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const pairTex = (x: number, y: number) => `(${x}, ${y})`;
const round = (v: number) => Math.round(v) + 0;

function draws(id: string): { slide: Slide; difficulty: number; seed: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `${id} is registered`).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      difficulty,
      seed,
    })),
  );
}

/** Values of t on a fine grid, integers included exactly. */
const grid = (lo: number, hi: number, perUnit = 100): number[] =>
  Array.from({ length: (hi - lo) * perUnit + 1 }, (_, i) => lo + i / perUnit);

/** The whole t in [-10, 10] at which the curve passes through a point, or undefined. */
function tAt(curve: Curve, [px, py]: [number, number]): number | undefined {
  for (let t = -10; t <= 10; t += 1) if (near(curve.x(t), px) && near(curve.y(t), py)) return t;
  return undefined;
}

function interval(blocks: Block[]): [number, number] {
  const match = /\$(-?\d+) \\le t \\le (-?\d+)\$/.exec(proseOf(blocks));
  expect(match).not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

function choiceLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error('not a choice slide');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
}

describe('psk-table', () => {
  it('fills every blank with the curve evaluated at its t', () => {
    for (const { slide } of draws('psk-table')) {
      if (slide.kind !== 'table') throw new Error('table');
      const curve = curveFrom(displaysOf(slide.prompt));
      const expected: string[] = [];
      for (const row of slide.rows) {
        const t = Number(row[0]);
        const values = [curve.x(t), curve.y(t)].map(round);
        [1, 2].forEach((col) => {
          if (row[col] === null) expected.push(String(values[col - 1]));
          else expect(row[col]).toBe(String(values[col - 1]));
        });
      }
      expect(slide.answer).toEqual(expected);
    }
  });
});

/** The listed points of an order question: letter and coordinates. */
function listedPoints(slide: Slide): { letter: string; p: [number, number] }[] {
  const listing = displaysOf((slide as { prompt: Block[] }).prompt).find((tex) => tex.includes('\\text{'))!;
  return [...listing.matchAll(/\\text\{([A-E])\}\\,\((-?\d+), (-?\d+)\)/g)].map((m) => ({
    letter: `\\text{${m[1]}}`,
    p: [Number(m[2]), Number(m[3])],
  }));
}

function traceOrder(slide: Slide): string[] {
  const curve = curveFrom(displaysOf((slide as { prompt: Block[] }).prompt).filter((tex) => !tex.includes('\\text{')));
  const found = listedPoints(slide).map((point) => ({ ...point, t: tAt(curve, point.p) }));
  expect(found.filter((point) => point.t === undefined).length, 'exactly one listed point is off the curve').toBe(1);
  return found
    .filter((point) => point.t !== undefined)
    .sort((a, b) => a.t! - b.t!)
    .map((point) => point.letter);
}

describe('psk-order', () => {
  it('orders the points on the curve by the t that reaches each, leaving the one off it', () => {
    for (const { slide } of draws('psk-order')) {
      if (slide.kind !== 'tiles') throw new Error('tiles');
      expect(slide.answer).toEqual(traceOrder(slide));
    }
  });

  it('marks that order right in the choice form', () => {
    for (const { slide } of draws('psk-order+choice')) {
      expect(choiceLabel(slide)).toBe(traceOrder(slide).join(' \\to '));
    }
  });
});

describe('psk-first', () => {
  it('picks the point with the smallest t, or the largest when asked for the last', () => {
    for (const { slide } of draws('psk-first')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const curve = curveFrom(displaysOf(slide.prompt));
      const last = proseOf(slide.prompt).includes('reach last');
      const ts = slide.options.map((option) => {
        const m = /^\((-?\d+), (-?\d+)\)$/.exec(option.label)!;
        const t = tAt(curve, [Number(m[1]), Number(m[2])]);
        expect(t, `${option.label} is on the curve`).toBeDefined();
        return { id: option.id, t: t! };
      });
      const target = ts.reduce((best, o) => ((last ? o.t > best.t : o.t < best.t) ? o : best));
      expect(slide.correctId).toBe(target.id);
    }
  });
});

describe('psk-heading', () => {
  it('reads the direction off a small step either side of t = k', () => {
    for (const { slide } of draws('psk-heading')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const curve = curveFrom(displaysOf(slide.prompt));
      const k = Number(/through \$t = (-?\d+)\$/.exec(proseOf(slide.prompt))![1]);
      const dx = curve.x(k + 1e-4) - curve.x(k - 1e-4);
      const dy = curve.y(k + 1e-4) - curve.y(k - 1e-4);
      expect(slide.correctId).toBe(`${dx > 0 ? 'right' : 'left'}-${dy > 0 ? 'up' : 'down'}`);
    }
  });
});

const QUARTERS: Record<string, number> = {
  '0': 0,
  '\\frac{\\pi}{2}': Math.PI / 2,
  '\\pi': Math.PI,
  '\\frac{3\\pi}{2}': (3 * Math.PI) / 2,
};

function quarterPoint(slide: Slide): string {
  const curve = curveFrom(displaysOf((slide as { prompt: Block[] }).prompt));
  const t = QUARTERS[/when \$t = (.+)\$\?/.exec(proseOf((slide as { prompt: Block[] }).prompt))![1]];
  expect(t).toBeDefined();
  return pairTex(round(curve.x(t)), round(curve.y(t)));
}

describe('psk-quarter', () => {
  it('evaluates the cosine and sine at the quarter turn', () => {
    for (const { slide } of draws('psk-quarter')) {
      if (slide.kind !== 'tiles') throw new Error('tiles');
      expect(`(${slide.answer[0]}, ${slide.answer[1]})`).toBe(quarterPoint(slide));
    }
    for (const { slide } of draws('psk-quarter+choice')) expect(choiceLabel(slide)).toBe(quarterPoint(slide));
  });
});

/** Where a circle starts, and whether it turns anticlockwise, found by stepping it forward. */
function circleSense(slide: Slide): { start: string; anti: boolean; move: string } {
  const curve = curveFrom(displaysOf((slide as { prompt: Block[] }).prompt));
  const at = (t: number): [number, number] => [curve.x(t), curve.y(t)];
  const quarter = [0, 1, 2, 3].map((q) => at((q * Math.PI) / 2));
  const cx = quarter.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quarter.reduce((s, p) => s + p[1], 0) / 4;
  const [x0, y0] = at(0);
  const [x1, y1] = at(1e-3);
  const cross = (x0 - cx) * (y1 - y0) - (y0 - cy) * (x1 - x0);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const move = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Right' : 'Left') : dy > 0 ? 'Up' : 'Down';
  return { start: pairTex(round(x0), round(y0)), anti: cross > 0, move };
}

describe('psk-circle-flow and psk-sense', () => {
  it('starts where t = 0 puts it and turns the way a small step shows', () => {
    for (const { slide } of draws('psk-circle-flow')) {
      if (slide.kind !== 'flow') throw new Error('flow');
      const { start, anti, move } = circleSense(slide);
      expect(slide.answer).toEqual([`$${start}$`, move, anti ? 'Anticlockwise' : 'Clockwise']);
    }
    for (const { slide } of draws('psk-sense')) {
      const { start, anti } = circleSense(slide);
      expect(choiceLabel(slide)).toBe(`\\text{${anti ? 'Anticlockwise' : 'Clockwise'} from } ${start}`);
    }
  });
});

function endsOf(slide: Slide): [number, number, number, number] {
  const prompt = (slide as { prompt: Block[] }).prompt;
  const curve = curveFrom(displaysOf(prompt));
  const [lo, hi] = interval(prompt);
  return [curve.x(lo), curve.y(lo), curve.x(hi), curve.y(hi)].map(round) as [number, number, number, number];
}

describe('psk-ends', () => {
  it('starts at the smallest t of the interval and ends at the largest', () => {
    for (const { slide } of draws('psk-ends')) {
      if (slide.kind !== 'tiles') throw new Error('tiles');
      expect(slide.answer).toEqual(endsOf(slide).map(String));
    }
    for (const { slide } of draws('psk-ends+choice')) {
      const [a, b, c, d] = endsOf(slide);
      expect(choiceLabel(slide)).toBe(`${pairTex(a, b)} \\to ${pairTex(c, d)}`);
    }
  });
});

function coveredBy(slide: Slide): { coord: string; lo: number; hi: number } {
  const prompt = (slide as { prompt: Block[] }).prompt;
  const curve = curveFrom(displaysOf(prompt));
  const [tLo, tHi] = interval(prompt);
  const coord = /values of \$([xy])\$/.exec(proseOf(prompt))![1];
  const values = grid(tLo, tHi).map(coord === 'x' ? curve.x : curve.y);
  return { coord, lo: round(Math.min(...values)), hi: round(Math.max(...values)) };
}

describe('psk-range', () => {
  it('covers the smallest to the largest value found by scanning the interval', () => {
    let trapped = 0;
    for (const { slide } of draws('psk-range')) {
      if (slide.kind !== 'numberLine') throw new Error('numberLine');
      const { lo, hi } = coveredBy(slide);
      expect(slide.answer).toBe(`[${lo},${hi}]`);
      const prompt = slide.prompt;
      const curve = curveFrom(displaysOf(prompt));
      const [tLo, tHi] = interval(prompt);
      const f = /values of \$x\$/.test(proseOf(prompt)) ? curve.x : curve.y;
      const ends = [f(tLo), f(tHi)];
      if (Math.min(...ends) !== lo || Math.max(...ends) !== hi) trapped += 1;
    }
    // Most draws turn inside the interval, which is the point of the question.
    expect(trapped).toBeGreaterThan(SEEDS);
    for (const { slide } of draws('psk-range+choice')) {
      const { coord, lo, hi } = coveredBy(slide);
      expect(choiceLabel(slide)).toBe(`${lo} \\le ${coord} \\le ${hi}`);
    }
  });
});

/** The extreme point named in the prompt, by scanning t across [-10, 10]. */
function extreme(slide: Slide): { t: number; x: number; y: number; value: number } {
  const prompt = (slide as { prompt: Block[] }).prompt;
  const curve = curveFrom(displaysOf(prompt));
  const text = proseOf(prompt) + ((slide as { lead?: string }).lead ?? '');
  const word = /(leftmost|rightmost|lowest|highest|smallest \$?[xy]|largest \$?[xy])/.exec(text)?.[1];
  let f: Fn;
  let wantMin: boolean;
  if (word === 'leftmost' || word === 'rightmost') {
    f = curve.x;
    wantMin = word === 'leftmost';
  } else if (word === 'lowest' || word === 'highest') {
    f = curve.y;
    wantMin = word === 'lowest';
  } else {
    const lead = (slide as { lead?: string }).lead ?? '';
    const m = /\\text\{(smallest|largest) \} ([xy])/.exec(lead)!;
    f = m[2] === 'x' ? curve.x : curve.y;
    wantMin = m[1] === 'smallest';
  }
  let best = -10;
  for (const t of grid(-10, 10)) {
    if (wantMin ? f(t) < f(best) : f(t) > f(best)) best = t;
  }
  return { t: round(best), x: round(curve.x(best)), y: round(curve.y(best)), value: round(f(best)) };
}

describe('psk-turn, psk-extreme-slider and psk-square', () => {
  it('finds the extreme point where a scan of t finds it', () => {
    for (const { slide } of draws('psk-turn')) {
      if (slide.kind !== 'tree') throw new Error('tree');
      const { t, x, y } = extreme(slide);
      expect(slide.answer).toEqual([t, x, y].map(String));
    }
    for (const { slide } of draws('psk-turn+choice')) {
      const { x, y } = extreme(slide);
      expect(choiceLabel(slide)).toBe(pairTex(x, y));
    }
    for (const { slide } of draws('psk-extreme-slider')) {
      if (slide.kind !== 'slider') throw new Error('slider');
      const { value } = extreme(slide);
      expect(slide.answer).toBe(value);
      expect(slide.figure?.axis).toBe(/across/.test(proseOf(slide.prompt)) ? 'x' : 'y');
    }
    for (const { slide } of draws('psk-square')) {
      if (slide.kind !== 'expression') throw new Error('expression');
      expect(Number(slide.answer)).toBe(extreme(slide).value);
    }
    for (const { slide } of draws('psk-square+choice')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const lead = displaysOf(slide.prompt).find((tex) => tex.includes('\\text{'))!;
      const curve = curveFrom(displaysOf(slide.prompt).filter((tex) => tex !== lead));
      const m = /\\text\{(smallest|largest) \} ([xy])/.exec(lead)!;
      const f = m[2] === 'x' ? curve.x : curve.y;
      const values = grid(-10, 10).map(f);
      expect(Number(choiceLabel(slide))).toBe(round(m[1] === 'smallest' ? Math.min(...values) : Math.max(...values)));
    }
  });
});

describe('psk-features', () => {
  it('fills the point at t = 0, the extreme point and the x-axis crossing', () => {
    for (const { slide } of draws('psk-features')) {
      if (slide.kind !== 'table') throw new Error('table');
      const curve = curveFrom(displaysOf(slide.prompt));
      const leftmost = slide.rows[1][0]!.includes('leftmost');
      let best = -10;
      for (const t of grid(-10, 10)) if (leftmost ? curve.x(t) < curve.x(best) : curve.x(t) > curve.x(best)) best = t;
      let root: number | undefined;
      for (const t of grid(-10, 10)) if (near(curve.y(t), 0)) root = t;
      expect(root).toBeDefined();
      const expected = [curve.x(0), curve.y(0), curve.x(best), curve.y(best), curve.x(root!)].map(round);
      expect(slide.answer).toEqual(expected.map(String));
      expect(slide.rows[2][2]).toBe('0');
    }
  });
});

/** The drawn path of a paramSvg figure, read back into the window's units. */
function drawnPath(svg: string, span: number): [number, number][] {
  const d = /<path fill="none"[^>]* d="([^"]+)"/.exec(svg)![1];
  return [...d.matchAll(/[ML] (-?[\d.]+),(-?[\d.]+)/g)]
    .map((m) => [(Number(m[1]) * 2 * span) / 220 - span, span - (Number(m[2]) * 2 * span) / 220] as [number, number])
    .filter(([x, y]) => Math.abs(x) <= span && Math.abs(y) <= span);
}

/** Points along a curve given by its option label, over a wide range of t. */
function labelPoints(label: string): [number, number][] {
  const curve = curveFrom([label]);
  const trig = /\\(cos|sin)/.test(label);
  const ts = trig ? grid(0, 7, 200) : grid(-6, 6, 200);
  return ts.map((t) => [curve.x(t), curve.y(t)]);
}

const nearestGap = (p: [number, number], to: [number, number][]) =>
  Math.min(...to.map(([u, v]) => Math.hypot(p[0] - u, p[1] - v)));

describe('psk-match', () => {
  it('has the right pair draw the figure, and every other pair draw something else', () => {
    const SPAN = 6;
    for (const { slide, seed } of draws('psk-match')) {
      if (seed >= 40 || slide.kind !== 'choice') continue;
      const diagram = slide.prompt.find((b): b is { kind: 'diagram'; svg: string } => b.kind === 'diagram')!;
      const drawn = drawnPath(diagram.svg, SPAN).filter((_, i) => i % 4 === 0);
      expect(drawn.length).toBeGreaterThan(10);
      for (const option of slide.options) {
        const points = labelPoints(option.label);
        const gap = Math.max(...drawn.map((p) => nearestGap(p, points)));
        const visible = points.filter(([x, y]) => Math.abs(x) <= SPAN && Math.abs(y) <= SPAN).filter((_, i) => i % 4 === 0);
        const back = Math.max(...visible.map((p) => nearestGap(p, drawn)), 0);
        if (option.id === slide.correctId) {
          expect(gap, `${option.label} should draw the figure`).toBeLessThan(0.2);
          // And the dot sits where this pair puts t = 0.
          const own = curveFrom([option.label]);
          const [x0, y0] = [own.x(0), own.y(0)];
          const dot = /<circle cx="([\d.]+)" cy="([\d.]+)"/.exec(diagram.svg)!;
          expect(Number(dot[1])).toBeCloseTo((220 * (x0 + SPAN)) / (2 * SPAN), 0);
          expect(Number(dot[2])).toBeCloseTo((220 * (SPAN - y0)) / (2 * SPAN), 0);
        } else {
          expect(Math.max(gap, back), `${option.label} draws the same picture as the figure`).toBeGreaterThan(0.5);
        }
      }
    }
  });
});

const MIRRORS: [RegExp, (p: [number, number]) => [number, number]][] = [
  [/line \$y = x\$/, ([x, y]) => [y, x]],
  [/the \$x\$-axis/, ([x, y]) => [x, -y]],
  [/the \$y\$-axis/, ([x, y]) => [-x, y]],
];

function mirrorOf(prompt: Block[]): (p: [number, number]) => [number, number] {
  const text = proseOf(prompt);
  return MIRRORS.find(([pattern]) => pattern.test(text))![1];
}

describe('psk-reflect', () => {
  it('traces the reflection of every point of the curve', () => {
    for (const { slide } of draws('psk-reflect')) {
      if (slide.kind !== 'tiles') throw new Error('tiles');
      const curve = curveFrom(displaysOf(slide.prompt));
      const mirror = mirrorOf(slide.prompt);
      const ax = compile(slide.answer[0]);
      const ay = compile(slide.answer[1]);
      for (const t of [-2.3, -1, 0, 0.7, 1.9, 3]) {
        const [mx, my] = mirror([curve.x(t), curve.y(t)]);
        expect(near(ax(t), mx) && near(ay(t), my)).toBe(true);
      }
    }
    for (const { slide } of draws('psk-reflect+choice')) {
      if (slide.kind !== 'choice') throw new Error('choice');
      const curve = curveFrom(displaysOf(slide.prompt));
      const mirror = mirrorOf(slide.prompt);
      const right = curveFrom([choiceLabel(slide)]);
      for (const t of [-2.3, 0.7, 3]) {
        const [mx, my] = mirror([curve.x(t), curve.y(t)]);
        expect(near(right.x(t), mx) && near(right.y(t), my)).toBe(true);
      }
    }
  });

  it('never lets another pair of tiles trace the same curve as the answer', () => {
    // No picture is shown, so what matters is the whole curve, not a window
    // of it: every point of the answer's curve for -5 <= t <= 5 is looked
    // for on the other pair's curve over a wider range of t, where any
    // reparametrisation of it would be found.
    for (const { slide, seed } of draws('psk-reflect')) {
      if (seed >= 30 || slide.kind !== 'tiles') continue;
      const toPoints = (xTex: string, yTex: string, reach: number): [number, number][] => {
        const [x, y] = [compile(xTex), compile(yTex)];
        return grid(-reach, reach, 40).map((t) => [x(t), y(t)]);
      };
      const target = toPoints(slide.answer[0], slide.answer[1], 5);
      for (const a of slide.bank) {
        for (const b of slide.bank) {
          if (a === b || (a === slide.answer[0] && b === slide.answer[1])) continue;
          const other = toPoints(a, b, 10);
          const gap = Math.max(...target.map((p) => nearestGap(p, other)));
          expect(gap, `x = ${a}, y = ${b} traces the answer's curve`).toBeGreaterThan(0.5);
        }
      }
    }
  });
});
