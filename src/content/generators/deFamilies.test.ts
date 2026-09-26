/**
 * An independent check on the mathematics behind Families of Solutions.
 *
 * Nothing here is a plain derivative or integral in x, so the sweep's oracles
 * skip it. Instead each answer is worked out again from the parameters, by a
 * different route from the generator's own: mathjs differentiates every
 * member and checks it satisfies its family's equation, evaluates every
 * right-hand side the slide names, and a small numerical integration follows
 * each solution to see where it really goes. Every seed, both difficulties.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  SHAPES,
  deFam as g,
  equilibriumRhsAnswer,
  familyDeRhsAnswer,
  fieldOptions,
  isoRhs,
  isoclineAnswer,
  memberAnswer,
  pointTex,
  rhsAnswer,
  riseRhs,
  type EffectParams,
  type EquationParams,
  type EquilibriumParams,
  type FieldParams,
  type FlatParams,
  type GapParams,
  type IsoclineParams,
  type MemberParams,
  type OnPointParams,
  type PointRhsParams,
  type ReadParams,
  type RiseParams,
  type StepParams,
  type ThroughParams,
} from './deFamilies';
import { registry } from '../registry';

const SEEDS = 200;

vi.setConfig({ testTimeout: 120_000 });

function draws<P>(generator: Generator<P>): { params: P; slide: Slide }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params) };
    }),
  );
}

type Scope = Record<string, number>;
const compiled = new Map<string, { evaluate: (scope: Scope) => unknown }>();
function compile(source: string, variable?: string) {
  const key = `${variable ?? ''}|${source}`;
  let hit = compiled.get(key);
  if (!hit) {
    hit = variable ? math.derivative(source, variable).compile() : math.compile(source);
    compiled.set(key, hit);
  }
  return hit;
}
const evalAt = (source: string, scope: Scope): number => compile(source).evaluate({ ...scope }) as number;
const derivAt = (source: string, scope: Scope): number => compile(source, 'x').evaluate({ ...scope }) as number;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

const PROBES = [0.6, 1.3, 2.2, -0.8];

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
};
const labels = (slide: Slide): string[] => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.map((option) => option.label);
};

/** Reads `(x, y)` back into numbers. */
const readPoint = (label: string): [number, number] => {
  const match = label.match(/^\((-?\d+), (-?\d+)\)$/);
  if (!match) throw new Error(`not a point: ${label}`);
  return [Number(match[1]), Number(match[2])];
};

/** Follows dy/dx = f(y) from y0 by small steps; the height it reaches, or ±Infinity. */
function follow(f: (y: number) => number, y0: number): number {
  let y = y0;
  for (let i = 0; i < 40_000; i += 1) {
    y += f(y) * 0.001;
    if (Math.abs(y) > 200) return Math.sign(y) * Infinity;
  }
  return y;
}

describe('families of curves', () => {
  it('reads the constant where the solid member crosses the y-axis', () => {
    for (const { params, slide } of draws(g.deFamRead as Generator<ReadParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      expect(evalAt(memberAnswer(params.fam, params.c), { x: 0 })).toBeCloseTo(slide.answer, 9);
      expect(slide.answer).toBeGreaterThanOrEqual(slide.min);
      expect(slide.answer).toBeLessThanOrEqual(slide.max);
    }
  });

  it('moves an added constant and stretches a multiplying one, as the flow says', () => {
    for (const { params, slide } of draws(g.deFamEffect as Generator<EffectParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const { fam, c1, c2 } = params;
      const gaps = PROBES.map((x) => evalAt(memberAnswer(fam, c2), { x }) - evalAt(memberAnswer(fam, c1), { x }));
      const ratios = PROBES.map((x) => evalAt(memberAnswer(fam, c2), { x }) / evalAt(memberAnswer(fam, c1), { x }));
      const shifted = gaps.every((gap) => close(gap, gaps[0]));
      const stretched = ratios.every((ratio) => close(ratio, ratios[0]));
      if (shifted) {
        const gap = Math.round(gaps[0]);
        expect(close(gap, gaps[0])).toBe(true);
        expect(slide.answer[1]).toBe(gap > 0 ? `Moved up by $${gap}$` : `Moved down by $${-gap}$`);
      } else {
        expect(stretched).toBe(true);
        expect(slide.answer[1]).toBe(`Stretched from the $x$-axis, scale factor $${Math.round(ratios[0])}$`);
      }
    }
  });

  it('offers the one equation every member satisfies', () => {
    for (const { params, slide } of draws(g.deFamEquation as Generator<EquationParams>)) {
      const { fam } = params;
      const rhs = familyDeRhsAnswer(fam);
      for (const c of [1, 3, -2]) {
        for (const x of PROBES) {
          const y = evalAt(memberAnswer(fam, c), { x });
          expect(close(derivAt(memberAnswer(fam, c), { x }), evalAt(rhs, { x, y }))).toBe(true);
        }
      }
      expect(correctLabel(slide)).toContain('\\frac{dy}{dx} = ');
      expect(labels(slide).length).toBe(4);
    }
  });

  it('works out the gap between two members at a point', () => {
    for (const { params, slide } of draws(g.deFamGapTree as Generator<GapParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const { fam, c1, c2, x0 } = params;
      const y1 = evalAt(memberAnswer(fam, c1), { x: x0 });
      const y2 = evalAt(memberAnswer(fam, c2), { x: x0 });
      expect(slide.answer.map(Number)).toEqual([y1, y2, y2 - y1].map((v) => Math.round(v)));
      for (const v of [y1, y2]) expect(Number.isInteger(Math.round(v * 1e9) / 1e9)).toBe(true);
    }
  });
});

describe('the member through a point', () => {
  const onMember = ({ fam, c, x1 }: MemberParams, yTex: string) => {
    const y = evalAt(memberAnswer(fam, c), { x: x1 });
    const read = yTex.includes('e^') ? evalAt(yTex.replace(/e\^\{(-?\d+)\}/, '*e^($1)').replace(/^\*/, ''), {}) : Number(yTex);
    return close(y, read);
  };

  it('ends the steps on the member through the point', () => {
    for (const { params, slide } of draws(g.deFamPointSteps as Generator<MemberParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const point = slide.start[2].match(/^\((-?\d+), (.+)\)$/)!;
      expect(Number(point[1])).toBe(params.x1);
      expect(onMember(params, point[2])).toBe(true);
      expect(slide.reductions[1].value).toMatch(new RegExp(`= ${params.c}$`));
    }
  });

  it('types the constant of the member through the point', () => {
    for (const { params, slide } of draws(g.deFamMember as Generator<MemberParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      expect(slide.answer).toBe(`${params.c}`);
      const prose = slide.prompt[0].kind === 'prose' ? slide.prompt[0].text : '';
      const point = prose.match(/\((-?\d+), ([^)]+)\)\$/)!;
      expect(Number(point[1])).toBe(params.x1);
      expect(onMember(params, point[2])).toBe(true);
    }
  });

  it('slides to the C of the member through the marked point', () => {
    for (const { params, slide } of draws(g.deFamThrough as Generator<ThroughParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const { a, n, x1 } = params;
      const y1 = a * x1 ** n + slide.answer;
      expect(slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ')).toContain(pointTex(x1, y1));
      expect(evalAt(memberAnswer({ kind: 'add', a, n }, slide.answer), { x: x1 })).toBeCloseTo(y1, 9);
    }
  });

  it('marks the one point on the same member', () => {
    for (const { params, slide } of draws(g.deFamOnPoint as Generator<OnPointParams>)) {
      const { fam, c } = params;
      const on = labels(slide).filter((label) => {
        const [x, y] = readPoint(label);
        return close(evalAt(memberAnswer(fam, c), { x }), y);
      });
      expect(on).toEqual([correctLabel(slide)]);
    }
  });
});

describe('the gradient at a point', () => {
  it('types the gradient the equation gives at the point', () => {
    for (const { params, slide } of draws(g.deFamGradient as Generator<PointRhsParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      expect(Number(slide.answer)).toBe(evalAt(rhsAnswer(params.rhs), { x: params.x, y: params.y }) + 0);
      expect(Number.isInteger(Number(slide.answer))).toBe(true);
    }
  });

  it('follows the segment to the right height', () => {
    for (const { params, slide } of draws(g.deFamStepTree as Generator<StepParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const { rhs, x, y, steps } = params;
      const f = (px: number, py: number) => evalAt(rhsAnswer(rhs), { x: px, y: py });
      const values = slide.answer.map(Number);
      let height = y;
      for (let i = 0; i < steps; i += 1) height += f(x + i, height);
      expect(values[values.length - 1]).toBe(height);
      if (steps === 1) expect(values[0] + values[1]).toBe(f(x, y));
    }
  });

  it('says rising, falling or flat by the sign of the gradient', () => {
    for (const { params, slide } of draws(g.deFamSign as Generator<PointRhsParams>)) {
      const m = evalAt(rhsAnswer(params.rhs), { x: params.x, y: params.y });
      expect(correctLabel(slide)).toBe(m > 0 ? 'Rising' : m < 0 ? 'Falling' : 'Flat');
    }
  });

  it('offers exactly one point with the gradient asked for', () => {
    for (const { params, slide } of draws(g.deFamGradPoint as Generator<PointRhsParams>)) {
      const m = evalAt(rhsAnswer(params.rhs), { x: params.x, y: params.y });
      const hits = labels(slide).filter((label) => {
        const [x, y] = readPoint(label);
        return close(evalAt(rhsAnswer(params.rhs), { x, y }), m);
      });
      expect(hits).toEqual([correctLabel(slide)]);
      expect(labels(slide).length).toBe(4);
    }
  });
});

describe('direction fields', () => {
  it('draws every segment at the gradient the right equation gives', () => {
    for (const { params, slide } of draws(g.deFamField as Generator<FieldParams>)) {
      if (slide.kind !== 'choice' || slide.prompt[0].kind !== 'diagram') throw new Error('expected a figure');
      const [right, ...wrong] = fieldOptions(params);
      expect(correctLabel(slide)).toBe(`\\frac{dy}{dx} = ${SHAPES[right].tex}`);
      const svg = slide.prompt[0].svg;
      const segments = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)" stroke="currentColor" stroke-width="1.8"/g)];
      expect(segments.length).toBe(35);
      // x from -3 to 3 over 256 px, y from -2 to 2 over the same scale.
      const unit = 256 / 6;
      for (const [, x1, y1, x2, y2] of segments) {
        const cx = ((Number(x1) + Number(x2)) / 2 - 12) / unit - 3;
        const cy = 2 - ((Number(y1) + Number(y2)) / 2 - 12) / unit;
        const px = Math.round(cx);
        const py = Math.round(cy);
        const slope = -(Number(y2) - Number(y1)) / (Number(x2) - Number(x1));
        // Compared as angles: a steep segment's end points are rounded to a tenth of a pixel.
        expect(Math.abs(Math.atan(slope) - Math.atan(SHAPES[right].f(px, py)))).toBeLessThan(0.03);
      }
      // Every other equation offered draws a different field somewhere.
      for (const i of wrong) {
        const differs = [-3, -2, -1, 0, 1, 2, 3].some((x) => [-2, -1, 0, 1, 2].some((y) => SHAPES[i].f(x, y) !== SHAPES[right].f(x, y)));
        expect(differs).toBe(true);
      }
    }
  });

  it('gives the isocline on which the gradient is the value asked for', () => {
    for (const { params, slide } of draws(g.deFamIsocline as Generator<IsoclineParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      expect(slide.answer).toBe(isoclineAnswer(params));
      for (const x of PROBES) {
        const y = evalAt(slide.answer, { x });
        expect(close(evalAt(rhsAnswer(isoRhs(params)), { x, y }), params.m)).toBe(true);
      }
    }
  });

  it('slides to the height where the segments on the dashed line are flat', () => {
    for (const { params, slide } of draws(g.deFamFlat as Generator<FlatParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      expect(evalAt(rhsAnswer(params.rhs), { x: params.a, y: slide.answer }) + 0).toBe(0);
      expect(Object.is(slide.answer, -0)).toBe(false);
      expect(Number.isInteger(slide.answer)).toBe(true);
      expect(Math.abs(slide.answer)).toBeLessThanOrEqual(3);
    }
  });
});

describe('following the field', () => {
  it('finds both equilibrium solutions, and no distractor is one', () => {
    for (const { params, slide } of draws(g.deFamEquilibrium as Generator<EquilibriumParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const rhs = equilibriumRhsAnswer(params);
      const isSolution = (y: number) => PROBES.every((x) => evalAt(rhs, { x, y }) === 0 || close(evalAt(rhs, { x, y }), 0));
      for (const token of slide.answer) expect(isSolution(Number(token))).toBe(true);
      for (const token of slide.bank.filter((t) => !slide.answer.includes(t))) expect(isSolution(Number(token))).toBe(false);
      expect(new Set(slide.bank).size).toBe(slide.bank.length);
      expect(slide.bank.length).toBeGreaterThan(slide.answer.length);
    }
  });

  it('sends the solution where following the equation really takes it', () => {
    for (const { params, slide } of draws(g.deFamRise as Generator<RiseParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const end = follow(riseRhs(params), params.y0);
      const label = slide.answer[2];
      if (end === Infinity) expect(label).toBe('Rises without limit');
      else if (end === -Infinity) expect(label).toBe('Falls without limit');
      else expect(label).toBe(`${end > params.y0 ? 'Rises' : 'Falls'} towards $y = ${Math.round(end)}$`);
      expect(slide.answer[1]).toBe(riseRhs(params)(params.y0) > 0 ? 'Positive' : 'Negative');
    }
  });

  it('slides to the level the solution really settles at', () => {
    for (const { params, slide } of draws(g.deFamLevel as Generator<RiseParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const end = follow(riseRhs(params), params.y0);
      expect(Number.isFinite(end)).toBe(true);
      expect(Math.abs(end - slide.answer)).toBeLessThan(0.01);
      expect(slide.answer).toBeGreaterThanOrEqual(slide.min);
      expect(slide.answer).toBeLessThanOrEqual(slide.max);
    }
  });

  it('registers every generator in the level', () => {
    for (const generator of Object.values(g)) expect(registry[generator.id]).toBeDefined();
  });
});
