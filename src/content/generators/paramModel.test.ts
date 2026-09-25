/**
 * An independent check on Modelling with Parametric Equations.
 *
 * The sweep proves each generator agrees with itself. Here every answer is
 * read back off the rendered slide (the tiles placed, the value typed, the
 * option marked correct, the path through a flow) and checked against the
 * motion itself: positions evaluated by mathjs from the equations as mathjs
 * source, landing times and greatest heights found by brute force over a fine
 * grid of t, meetings found by stepping t, and every path equation checked by
 * putting points of the motion into it.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { choiceVariant } from '../choiceVariant';
import type { Generator, Slide } from '../types';
import {
  ballSources,
  lineSource,
  paramModelGenerators,
  type Ball,
  type BallPathParams,
  type DomainParams,
  type HeightParams,
  type LineMotion,
  type LinePathParams,
  type LinePointParams,
  type MeetParams,
  type MovedParams,
  type ReachParams,
} from './paramModel';

const SEEDS = 300;

const byId = (id: string): Generator<unknown> => {
  const found = paramModelGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
};

function draws<P>(id: string): { params: P; slide: Slide }[] {
  const generator = byId(id) as Generator<P>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params) };
    }),
  );
}

/** The derived choice slide's correct label. */
function choiceAnswer<P>(id: string, params: P): string {
  const derived = choiceVariant(byId(id) as Generator<P>);
  if (!derived) throw new Error(`${id} has no choices`);
  const slide = derived.render(params);
  if (slide.kind !== 'choice') throw new Error('not a choice');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
}

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error('not a choice');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};

interface Compiled {
  evaluate(scope: Record<string, number>): unknown;
}
const compiled = new Map<string, Compiled>();
const at = (source: string, t: number): number => {
  let f = compiled.get(source);
  if (!f) {
    f = math.compile(source) as unknown as Compiled;
    compiled.set(source, f);
  }
  return Number(f.evaluate({ t }));
};

const lineXY = (m: LineMotion, t: number): [number, number] => [at(lineSource(m.x0, m.u), t), at(lineSource(m.y0, m.v), t)];

const ballXY = (b: Ball, t: number): [number, number] => {
  const { x, y } = ballSources(b);
  return [at(x, t), at(y, t)];
};

/** The first t > 0 where the ball's height reaches 0: stepped to a sign change, then bisected. */
function landing(b: Ball): number {
  const { y } = ballSources(b);
  const h = (t: number) => at(y, t);
  const STEP = 0.01;
  for (let t = STEP; t < 200; t += STEP) {
    if (h(t) <= 0) {
      let lo = t - STEP;
      let hi = t;
      for (let i = 0; i < 60; i += 1) {
        const mid = (lo + hi) / 2;
        if (h(mid) > 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
  }
  throw new Error('never lands');
}

/** The t and height of the top, by ternary search over the flight. */
function top(b: Ball): [number, number] {
  const { y } = ballSources(b);
  const h = (t: number) => at(y, t);
  let lo = 0;
  let hi = landing(b);
  for (let i = 0; i < 120; i += 1) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (h(m1) < h(m2)) lo = m1;
    else hi = m2;
  }
  const t = (lo + hi) / 2;
  return [t, h(t)];
}

const tilesOf = (slide: Slide): string[] => {
  if (slide.kind !== 'tiles' && slide.kind !== 'tree') throw new Error(`not tiles: ${slide.kind}`);
  return slide.answer;
};

const answerOf = (slide: Slide): number => {
  if (slide.kind !== 'expression') throw new Error('not typed');
  return Number(math.evaluate(slide.answer));
};

/** `- 3` or `+ 3` or `3` back to a number. */
const tileNumber = (token: string): number => Number(token.replace(/\s+/g, ''));

describe('straight-line motion', () => {
  it('places the point reached at the time asked', () => {
    for (const { params, slide } of draws<LinePointParams>('pmod-line-point')) {
      const [x, y] = lineXY(params, params.k);
      expect(tilesOf(slide).map(Number)).toEqual([x, y]);
      expect(choiceAnswer('pmod-line-point', params)).toBe(`(${x}, ${y})`);
    }
  });

  it('starts where t = 0 puts it', () => {
    for (const { params, slide } of draws<LineMotion>('pmod-start')) {
      const [x, y] = lineXY(params, 0);
      expect(correctLabel(slide)).toBe(`(${x}, ${y})`);
    }
  });

  it('measures the distance across as the change in x', () => {
    for (const { params, slide } of draws<MovedParams>('pmod-moved')) {
      const d = Math.abs(lineXY(params, params.b)[0] - lineXY(params, params.a)[0]);
      expect(answerOf(slide)).toBe(d);
      expect(Number(choiceAnswer('pmod-moved', params))).toBe(d);
    }
  });

  it('finds when the coordinate given is reached, by stepping t', () => {
    for (const id of ['pmod-reach-time', 'pmod-reach-tree']) {
      for (const { params, slide } of draws<ReachParams>(id)) {
        const along = params.obj === 'drone' ? 1 : 0;
        const target = lineXY(params, params.T)[along];
        const hits = Array.from({ length: 401 }, (_, i) => i / 10).filter(
          (t) => Math.abs(lineXY(params, t)[along] - target) < 1e-9,
        );
        expect(hits, `${id}: one time reaches ${target}`).toHaveLength(1);
        const [t] = hits;
        if (params.obj === 'drone') expect(target).toBeGreaterThan(0);
        if (id === 'pmod-reach-time') {
          expect(answerOf(slide)).toBe(t);
          expect(Number(choiceAnswer(id, params))).toBe(t);
        } else {
          expect(tilesOf(slide).map(Number)).toEqual([t, lineXY(params, t)[1 - along]]);
        }
      }
    }
  });
});

describe('a thrown ball', () => {
  it('works the height at a time in two parts', () => {
    for (const { params, slide } of draws<HeightParams>('pmod-height-tree')) {
      const [, y] = ballXY(params, params.k);
      const [a, b, total] = tilesOf(slide).map(Number);
      expect(total).toBe(y);
      expect(a - b).toBe(y);
      expect(a).toBe(params.v * params.k);
      expect(y).toBeGreaterThan(0);
    }
  });

  it('lands at the first t after the throw where the height is 0', () => {
    for (const { params, slide } of draws<Ball>('pmod-land-time')) {
      const T = landing(params);
      expect(Math.abs(answerOf(slide) - T)).toBeLessThan(0.002);
      expect(Math.abs(Number(choiceAnswer('pmod-land-time', params)) - T)).toBeLessThan(0.002);
    }
    for (const { params, slide } of draws<Ball>('pmod-landing-tree')) {
      const T = landing(params);
      const [t, x] = tilesOf(slide).map(Number);
      expect(Math.abs(t - T)).toBeLessThan(0.002);
      expect(Math.abs(x - ballXY(params, T)[0])).toBeLessThan(0.05);
    }
  });

  it('peaks where brute force finds the greatest height', () => {
    for (const { params, slide } of draws<Ball>('pmod-top-time')) {
      const [T] = top(params);
      expect(Math.abs(answerOf(slide) - T)).toBeLessThan(0.001);
      expect(Math.abs(Number(choiceAnswer('pmod-top-time', params)) - T)).toBeLessThan(0.001);
    }
    for (const { params, slide } of draws<Ball>('pmod-top')) {
      const [, Y] = top(params);
      expect(Math.abs(answerOf(slide) - Y)).toBeLessThan(1e-4);
      expect(Math.abs(Number(choiceAnswer('pmod-top', params)) - Y)).toBeLessThan(1e-4);
    }
    for (const { params, slide } of draws<Ball>('pmod-top-slider')) {
      const [, Y] = top(params);
      if (slide.kind !== 'slider') throw new Error('not a slider');
      expect(Math.abs(slide.answer - Y)).toBeLessThan(1e-4);
      expect(slide.max).toBeGreaterThan(Y);
    }
    for (const { params, slide } of draws<Ball>('pmod-peak-tree')) {
      const [T, Y] = top(params);
      const [t, x, y] = tilesOf(slide).map(Number);
      expect(Math.abs(t - T)).toBeLessThan(0.001);
      expect(Math.abs(x - ballXY(params, T)[0])).toBeLessThan(0.01);
      expect(Math.abs(y - Y)).toBeLessThan(1e-4);
    }
  });

  it('writes a path every point of the flight lies on', () => {
    for (const { params, slide } of draws<BallPathParams>('pmod-ball-path')) {
      if (slide.kind !== 'expression') throw new Error('not typed');
      const b = { u: params.u, v: params.v, h: 0 };
      const options = choiceVariant(byId('pmod-ball-path') as Generator<BallPathParams>)!;
      const rendered = options.render(params);
      if (rendered.kind !== 'choice') throw new Error('not a choice');
      const typed = math.compile(slide.answer);
      for (const t of [0.3, 0.9, 1.7, 2.2]) {
        const [x, y] = ballXY(b, t);
        expect(Math.abs(Number(typed.evaluate({ x })) - y)).toBeLessThan(1e-9);
      }
      // The option marked correct reads as the typed answer, and no other does.
      const labelValue = (label: string, x: number) => {
        const tex = label.replace(/^y = /, '');
        const js = tex
          .replace(/\\frac\{(\d*)x\^\{2\}\}\{(\d+)\}/g, (_, p, q) => `(${p || 1})*x^2/${q}`)
          .replace(/\\frac\{(\d*)x\}\{(\d+)\}/g, (_, p, q) => `(${p || 1})*x/${q}`)
          .replace(/(\d+)x\^\{2\}/g, '$1*x^2')
          .replace(/(\d+)x/g, '$1*x')
          .replace(/x\^\{2\}/g, 'x^2');
        return Number(math.evaluate(js, { x }));
      };
      for (const option of rendered.options) {
        const agrees = [0.4, 1.3, 2.1].every((x) => Math.abs(labelValue(option.label, x) - Number(typed.evaluate({ x }))) < 1e-9);
        expect(agrees, `${option.label} vs ${slide.answer}`).toBe(option.id === rendered.correctId);
      }
    }
  });

  it('keeps the model to the flight: from the throw until it lands', () => {
    for (const { params, slide } of draws<DomainParams>('pmod-domain')) {
      const b = { u: params.u, v: params.v, h: 0 };
      const T = Math.round(landing(b) * 1e6) / 1e6;
      const want = params.ask === 't' ? `0 \\le t \\le ${T}` : `0 \\le x \\le ${ballXY(b, T)[0]}`;
      expect(correctLabel(slide)).toBe(want);
    }
  });
});

describe('two boats', () => {
  /** The whole t where the x agree, by stepping. */
  const xMeet = (p: MeetParams): number => {
    const A = { obj: 'boat' as const, x0: p.a1, u: p.p1, y0: p.b1, v: p.q1 };
    const B = { obj: 'boat' as const, x0: p.a2, u: p.p2, y0: p.b2, v: p.q2 };
    const hits = Array.from({ length: 301 }, (_, i) => i / 10).filter(
      (t) => Math.abs(lineXY(A, t)[0] - lineXY(B, t)[0]) < 1e-9,
    );
    expect(hits).toHaveLength(1);
    return hits[0];
  };
  const ysAt = (p: MeetParams, t: number): [number, number] => [
    at(lineSource(p.b1, p.q1), t),
    at(lineSource(p.b2, p.q2), t),
  ];

  it('finds the time their x agree, and each y then', () => {
    for (const { params, slide } of draws<MeetParams>('pmod-meet-time')) {
      const t = xMeet(params);
      expect(answerOf(slide)).toBe(t);
      expect(Number(choiceAnswer('pmod-meet-time', params))).toBe(t);
    }
    for (const { params, slide } of draws<MeetParams>('pmod-meet-tree')) {
      const t = xMeet(params);
      expect(tilesOf(slide).map(Number)).toEqual([t, ...ysAt(params, t)]);
    }
  });

  it('says they collide exactly when both coordinates agree at one time', () => {
    let yes = 0;
    let no = 0;
    for (const { params, slide } of draws<MeetParams>('pmod-meet-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const t = xMeet(params);
      const [yA, yB] = ysAt(params, t);
      expect(slide.answer[0]).toBe(`$t = ${t}$`);
      expect(slide.answer[1]).toBe(`A: $y = ${yA}$, B: $y = ${yB}$`);
      expect(slide.answer[2]).toBe(yA === yB ? 'Yes' : 'No');
      if (yA === yB) yes += 1;
      else no += 1;
    }
    // Both verdicts are asked, often.
    expect(yes).toBeGreaterThan(SEEDS / 3);
    expect(no).toBeGreaterThan(SEEDS / 3);
  });
});

describe('the path without t', () => {
  const motion = (p: LinePathParams): LineMotion => ({ obj: 'boat', x0: p.x0, u: p.u, y0: p.y0, v: p.m * p.u });

  it('places a line every point of the motion lies on', () => {
    for (const { params, slide } of draws<LinePathParams>('pmod-line-path')) {
      const [m, c] = tilesOf(slide).map(tileNumber);
      for (const t of [0, 1.5, 4]) {
        const [x, y] = lineXY(motion(params), t);
        expect(m * x + c).toBeCloseTo(y, 9);
      }
      expect(choiceAnswer('pmod-line-path', params)).toBe(`y = ${m}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`);
    }
  });

  it('walks to the same line through the flow', () => {
    for (const { params, slide } of draws<LinePathParams>('pmod-path-flow')) {
      if (slide.kind !== 'flow') throw new Error('not a flow');
      const match = /^\$y = (-?\d+)x ([+-]) (\d+)\$$/.exec(slide.answer[1]);
      expect(match, slide.answer[1]).not.toBeNull();
      const m = Number(match![1]);
      const c = (match![2] === '-' ? -1 : 1) * Number(match![3]);
      for (const t of [0, 2.5, 7]) {
        const [x, y] = lineXY(motion(params), t);
        expect(m * x + c).toBeCloseTo(y, 9);
      }
      // The subject of t chosen gives back the motion's x.
      const subject = slide.answer[0].replace(/^\$t = /, '').replace(/\$$/, '');
      const js = subject.replace(/\\frac\{([^}]*)\}\{(\d+)\}/, '($1)/$2');
      for (const t of [1, 3]) {
        const [x] = lineXY(motion(params), t);
        expect(Number(math.evaluate(js, { x }))).toBeCloseTo(t, 9);
      }
    }
  });
});
