/**
 * An independent check on the mathematics behind Separable Equations with
 * Harder Integrals.
 *
 * The typed x-side integrals declare `integrand`, so the sweep differentiates
 * them back; nothing else here is a plain integral in x. So for every draw
 * this file puts the tidied solution back into its equation — mathjs
 * differentiates y(x) and the right-hand side is evaluated at that y — and
 * checks the antiderivative the working shows differentiates to the x side.
 * Then each widget's answer is recomputed from what the prompt states: the
 * cover-up constants as limits, a value by evaluating the solution, a
 * condition by putting the point back in.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  TECHNIQUES,
  bottomAnswer,
  deHarderSeparableGenerators,
  fpCase,
  ivpCase,
  ivpConstant,
  pfCase,
  pfTopAt,
  sliderAt,
  spCase,
  sumAnswer,
  sumTex,
  throughValues,
  tidyAnswer,
  tidyTex,
  trigCase,
  valueCase,
  valuePoints,
  whichCase,
  type FpParams,
  type IvpParams,
  type PfParams,
  type SepCase,
  type SliderParams,
  type SpParams,
  type ThroughParams,
  type TrigFlowParams,
  type TrigIntParams,
  type TrigParams,
  type ValueParams,
  type WhichParams,
} from './deHarderSeparable';

vi.setConfig({ testTimeout: 180_000 });

const SEEDS = 150;

const byId = (id: string): Generator<unknown> => {
  const found = deHarderSeparableGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found as Generator<unknown>;
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

type Scope = Record<string, number>;
const cache = new Map<string, { evaluate: (scope: Scope) => unknown }>();
function compile(source: string, variable?: string) {
  const key = `${variable ?? ''}|${source}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = variable ? math.derivative(source, variable).compile() : math.compile(source);
    cache.set(key, hit);
  }
  return hit;
}
const evalAt = (source: string, scope: Scope): number => {
  const value = compile(source).evaluate({ ...scope });
  if (typeof value !== 'number') throw new Error(`${source} is not real at ${JSON.stringify(scope)}`);
  return value;
};
const dAt = (source: string, scope: Scope): number => compile(source, 'x').evaluate({ ...scope }) as number;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

/** Off every whole number and every root a partial-fraction bottom can have, and inside every sec's first branch. */
const XS = [0.13, 0.29, 0.41];

/** The solution with its constant, put back into the equation. */
function checkCase(sc: SepCase, where: string) {
  // The antiderivative the working shows differentiates to the x side.
  for (const x of XS) {
    expect(close(dAt(sumAnswer(sc.F), { x }), evalAt(sc.fAnswer, { x })), `${where}: F' != f at ${x}`).toBe(true);
  }
  // The tidied solution satisfies dy/dx = rhs(x, y).
  const K = sc.form === 'ln' ? 3 : sc.form === 'sec2' ? 0.4 : 1000;
  const y = tidyAnswer(sc, K);
  for (const x of XS) {
    const value = evalAt(y, { x });
    expect(close(dAt(y, { x }), evalAt(sc.rhsAnswer, { x, y: value })), `${where}: ${y} fails ${sc.rhsAnswer} at ${x}`).toBe(true);
  }
  // A product-of-powers tidy is e^F up to the sign the constant absorbs.
  if (sc.form === 'ln' && sc.lnTidyAnswer) {
    for (const x of XS) {
      expect(close(Math.abs(evalAt(sc.lnTidyAnswer(1), { x })), Math.exp(evalAt(sumAnswer(sc.F), { x }))), `${where}: tidy is not e^F`).toBe(true);
    }
  }
}

/** A trig power or e^(c tan kx) as mathjs, for the tiles these slides place. */
function tileToMath(tex: string): string {
  return tex
    .replace(/\\(sec|cos|sin|tan)\^\{(\d+)\} (\d*)x/g, (_, fn, e, k) => `${fn}(${k || 1}*x)^${e}`)
    .replace(/\\(sec|cos|sin|tan) (\d*)x/g, (_, fn, k) => `${fn}(${k || 1}*x)`)
    .replace(/\^\{/g, '^(')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

const stepsValues = (slide: Slide): string[] => {
  if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
  return slide.reductions.map((r) => r.value);
};

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};

describe('a fraction whose top is the derivative of its bottom', () => {
  it('solves every equation, and the steps end on that solution', () => {
    for (const { params, slide } of draws<FpParams>('de-hsep-fp-steps')) {
      const sc = fpCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(stepsValues(slide).at(-1)).toBe(tidyTex(sc));
    }
  });

  it('types an integral whose logarithm is of something always positive', () => {
    for (const { params, slide } of draws<FpParams>('de-hsep-fp-int')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      for (const x of [-3, -1.5, 0, 1.5, 3]) {
        expect(evalAt(bottomAnswer(params.bottom), { x })).toBeGreaterThan(0);
        expect(Number.isFinite(evalAt(slide.answer, { x }))).toBe(true);
      }
      for (const x of XS) expect(close(dAt(slide.answer, { x }), evalAt(slide.integrand!, { x }))).toBe(true);
    }
  });

  it('places A and the power the solution has', () => {
    for (const { params, slide } of draws<FpParams>('de-hsep-fp-general')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const sc = fpCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(slide.answer[0]).toBe('A');
      for (const x of XS) {
        expect(close(evalAt(tileToMath(slide.answer[1]), { x }), evalAt(sc.lnTidyAnswer!(1), { x }))).toBe(true);
      }
    }
  });

  it('walks to the derivative, the multiple and the integral', () => {
    for (const { params, slide } of draws<FpParams>('de-hsep-fp-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const deriv = math.derivative(bottomAnswer(params.bottom), 'x').toString();
      const [d, c, integral] = slide.answer;
      // The derivative the walk accepts is the bottom's.
      const shown = tileToMath(d.slice(1, -1)).replace(/(\d)e/g, '$1*e').replace(/(\d)x/g, '$1*x');
      for (const x of XS) expect(close(evalAt(shown, { x }), evalAt(deriv, { x }))).toBe(true);
      expect(c).toBe(`$${params.c}$`);
      expect(integral).toBe(`$${sumTex(fpCase(params).F)} + C$`);
    }
  });
});

describe('partial fractions', () => {
  const coverUp = (params: PfParams, root: number): number => {
    const f = pfCase(params).fAnswer;
    const h = 1e-7;
    return evalAt(`(${f})*(x - (${root}))`, { x: root + h });
  };

  it('solves every equation, through its split', () => {
    for (const { params, slide } of draws<PfParams>('de-hsep-pf-steps')) {
      const sc = pfCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(stepsValues(slide).at(-1)).toBe(tidyTex(sc));
      expect(Math.abs(coverUp(params, params.p) - params.alpha)).toBeLessThan(1e-4);
      expect(Math.abs(coverUp(params, params.q) - params.beta)).toBeLessThan(1e-4);
    }
  });

  it('covers up to the constants the fraction really has', () => {
    for (const { params, slide } of draws<PfParams>('de-hsep-pf-cover-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [np, a, nq, b] = slide.answer.map(Number);
      expect(Math.abs(coverUp(params, params.p) - a)).toBeLessThan(1e-4);
      expect(Math.abs(coverUp(params, params.q) - b)).toBeLessThan(1e-4);
      expect(np).toBe(pfTopAt(params, params.p));
      expect(nq).toBe(pfTopAt(params, params.q));
      expect(np / (params.p - params.q)).toBe(a);
      expect(nq / (params.q - params.p)).toBe(b);
    }
  });

  it('marks the general solution the equation has', () => {
    for (const { params, slide } of draws<PfParams>('de-hsep-pf-general')) {
      const sc = pfCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(correctLabel(slide)).toBe(tidyTex(sc));
      if (slide.kind === 'choice') expect(slide.options.length).toBe(4);
    }
  });

  it('splits into fractions that add back to the top', () => {
    for (const { params, slide } of draws<PfParams>('de-hsep-pf-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { p, q, alpha, beta } = params;
      const split = `(${alpha})/(x - (${p})) + (${beta})/(x - (${q}))`;
      for (const x of XS) expect(close(evalAt(split, { x }), evalAt(pfCase(params).fAnswer, { x }))).toBe(true);
      expect(slide.answer[0]).toBe('No');
    }
  });
});

describe('trigonometric integrals', () => {
  it('solves every equation', () => {
    for (const { params, slide } of draws<TrigParams>('de-hsep-trig-steps')) {
      const sc = trigCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(stepsValues(slide).at(-1)).toBe(tidyTex(sc));
    }
  });

  it('places A and the function the solution has', () => {
    for (const { params, slide } of draws<TrigParams>('de-hsep-trig-general')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const sc = trigCase(params);
      checkCase(sc, JSON.stringify(params));
      const want = sc.lnTidyAnswer ? sc.lnTidyAnswer(1) : `e^(${sumAnswer(sc.F)})`;
      for (const x of XS) expect(close(evalAt(tileToMath(slide.answer[1]), { x }), evalAt(want, { x }))).toBe(true);
    }
  });

  it('types a sec² integral that differentiates back', () => {
    for (const { params, slide } of draws<TrigIntParams>('de-hsep-trig-int')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      checkCase(trigCase({ kind: 'sec2', ...params }), JSON.stringify(params));
      for (const x of XS) expect(close(dAt(slide.answer, { x }), evalAt(slide.integrand!, { x }))).toBe(true);
    }
  });

  it('walks tan and cot to the logarithm that differentiates back', () => {
    for (const { params, slide } of draws<TrigFlowParams>('de-hsep-trig-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { kind, c, k } = params;
      const integral = kind === 'tan' ? `(${c})*log(abs(sec(${k}*x)))` : `(${c})*log(abs(sin(${k}*x)))`;
      for (const x of XS) expect(close(dAt(integral, { x }), evalAt(`(${c * k})*${kind}(${k}*x)`, { x }))).toBe(true);
      const main = kind === 'tan' ? 'sec' : 'sin';
      expect(slide.answer[2]).toBe(`$${c === 1 ? '' : c}\\ln|\\${main} ${k === 1 ? 'x' : `${k}x`}| + C$`);
    }
  });
});

describe('substitution and parts', () => {
  for (const id of ['de-hsep-sub-int', 'de-hsep-parts-int']) {
    it(`${id} types an integral that differentiates back`, () => {
      for (const { params, slide } of draws<SpParams>(id)) {
        if (slide.kind !== 'expression') throw new Error('expected expression');
        checkCase(spCase(params), JSON.stringify(params));
        for (const x of XS) expect(close(dAt(slide.answer, { x }), evalAt(slide.integrand!, { x }))).toBe(true);
      }
    });
  }

  it('solves every equation', () => {
    for (const { params, slide } of draws<SpParams>('de-hsep-sp-steps')) {
      const sc = spCase(params);
      checkCase(sc, JSON.stringify(params));
      expect(stepsValues(slide).at(-1)).toBe(tidyTex(sc));
    }
  });

  it('names the technique that fits', () => {
    for (const { params, slide } of draws<WhichParams>('de-hsep-which')) {
      checkCase(whichCase(params), JSON.stringify(params));
      const want =
        params.tech === 'pf'
          ? TECHNIQUES.pf
          : ['chain', 'expsq', 'sincos'].includes(params.sp.kind)
            ? TECHNIQUES.sub
            : TECHNIQUES.parts;
      expect(correctLabel(slide)).toBe(want);
    }
  });
});

describe('particular solutions', () => {
  it('fills the tree from the condition to the value', () => {
    for (const { params, slide } of draws<ThroughParams>('de-hsep-through-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { exp, a, c, A, x0, x1 } = params;
      const sc = fpCase({ bottom: exp ? { type: 'exp', m: 1, a } : { type: 'sq', a }, c, inv: false });
      checkCase(sc, JSON.stringify(params));
      const solution = sc.lnTidyAnswer!(A);
      const at0 = evalAt(solution, { x: x0 });
      const at1 = evalAt(solution, { x: exp ? Math.log(x1) : x1 });
      const { y0 } = throughValues(params);
      expect(close(at0, y0)).toBe(true);
      expect(slide.answer[1]).toBe(`${A}`);
      expect(close(Number(slide.answer[3]), at1)).toBe(true);
      expect(slide.prompt.some((b) => b.kind === 'prose' && b.text.includes(`= ${y0}$`))).toBe(true);
    }
  });

  it('types the value the solution through the condition takes', () => {
    const x = (tex: string): number =>
      ({ '0': 0, '\\frac{\\pi}{3}': Math.PI / 3, '\\frac{\\pi}{2}': Math.PI / 2, '\\frac{\\pi}{6}': Math.PI / 6 })[tex] ?? Number(tex);
    for (const { params, slide } of draws<ValueParams>('de-hsep-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const sc = valueCase(params);
      checkCase(sc, JSON.stringify(params));
      const { at, y0, to } = valuePoints(params);
      const solution = sc.lnTidyAnswer!(params.A);
      expect(close(evalAt(solution, { x: x(at) }), y0), JSON.stringify(params)).toBe(true);
      expect(close(evalAt(solution, { x: x(to) }), Number(slide.answer)), JSON.stringify(params)).toBe(true);
      expect(Number.isInteger(Number(slide.answer))).toBe(true);
      expect(Number.isInteger(y0)).toBe(true);
    }
  });

  it('puts the condition in and ends on the particular solution through it', () => {
    for (const { params } of draws<IvpParams>('de-hsep-ivp-steps')) {
      const sc = ivpCase(params);
      checkCase(sc, JSON.stringify(params));
      const K = ivpConstant(params);
      const solution = params.kind === 'sq' ? tidyAnswer(sc, K) : sc.lnTidyAnswer!(K);
      const [x0, y0] =
        params.kind === 'tan'
          ? [Math.PI / 3, params.A * 2 ** params.c]
          : params.kind === 'sq'
            ? [params.x0, params.y0]
            : params.kind === 'fp'
              ? [params.x0, params.c === -1 ? params.A / (params.x0 ** 2 + params.a) : params.A * (params.x0 ** 2 + params.a) ** params.c]
              : [params.x0, (params.A * (params.x0 - params.p)) / (params.x0 - params.q)];
      expect(Number.isInteger(y0), JSON.stringify(params)).toBe(true);
      expect(close(evalAt(solution, { x: x0 }), y0), JSON.stringify(params)).toBe(true);
    }
  });

  it('slides to where the solution through the point meets the axis', () => {
    for (const { params, slide } of draws<SliderParams>('de-hsep-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const sc = fpCase({ bottom: { type: 'sq', a: params.a }, c: params.c, inv: false });
      checkCase(sc, JSON.stringify(params));
      const solution = sc.lnTidyAnswer!(params.A);
      expect(close(evalAt(solution, { x: 0 }), slide.answer)).toBe(true);
      expect(close(evalAt(solution, { x: params.x1 }), sliderAt(params, params.x1))).toBe(true);
      expect(Number.isInteger(sliderAt(params, params.x1))).toBe(true);
    }
  });
});
