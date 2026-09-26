/**
 * Series Expansions level 5, checked against the functions themselves.
 *
 * Every answer is read back off the rendered slide and compared with a value
 * worked out without the generator's arithmetic: Taylor coefficients by the
 * Cauchy integral round a small circle (a discrete Fourier transform of the
 * function's own complex values, which mathjs evaluates), radii by walking out
 * along the real line until the function stops being a finite real number or
 * changes sign, and each integral by differentiating the function it names.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import { arcSource, binSource, binomialSeriesByName as g, partnerSource } from './seriesBinomial';
import { fact } from './seriesExpansions';

const SEEDS = 80;

function draws<P>(generator: Generator<P>, seeds = SEEDS): { params: P; slide: Slide }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: seeds }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params) };
    }),
  );
}

const coefCache = new Map<string, number[]>();

/** a_0..a_upTo of a function of x, from its values round |x| = r. */
function coefs(source: string, upTo = 7, r = 0.05): number[] {
  const key = `${source}#${upTo}#${r}`;
  const cached = coefCache.get(key);
  if (cached) return cached;
  const f = math.compile(source);
  const N = 64;
  const values = Array.from({ length: N }, (_, j) => {
    const t = (2 * Math.PI * j) / N;
    const v = f.evaluate({ x: math.complex(r * Math.cos(t), r * Math.sin(t)) });
    return typeof v === 'number' ? { re: v, im: 0 } : { re: v.re as number, im: v.im as number };
  });
  const out = Array.from({ length: upTo + 1 }, (_, k) => {
    let re = 0;
    for (let j = 0; j < N; j += 1) {
      const t = (2 * Math.PI * j * k) / N;
      re += values[j].re * Math.cos(t) + values[j].im * Math.sin(t);
    }
    return re / N / r ** k;
  });
  coefCache.set(key, out);
  return out;
}

/**
 * How far from 0 along the real line the function stays a finite real number
 * of one sign, and never passes a peak in size (the far side of a pole of even
 * order comes back down).
 */
function reach(source: string, limit = 12, step = 1e-3): number {
  const f = math.compile(source);
  const at = (x: number): number | null => {
    const v = f.evaluate({ x });
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    return v;
  };
  const f0 = at(0)!;
  let best = limit;
  for (const dir of [1, -1]) {
    let last = Math.abs(f0);
    let rising = false;
    for (let x = step; x < best; x += step) {
      const v = at(dir * x);
      if (v === null || Math.sign(v) !== Math.sign(f0) || (rising && Math.abs(v) < last)) {
        best = Math.min(best, x);
        break;
      }
      rising = Math.abs(v) > last;
      last = Math.abs(v);
    }
  }
  return best;
}

const near = (got: number, want: number, tol = 1e-5) => {
  expect(Math.abs(got - want)).toBeLessThan(tol * Math.max(1, Math.abs(want)));
};

/** A number as TeX writes it: `-\frac{4}{3}`, `(-2)`, `12`. */
function texNumber(tex: string): number {
  const t = tex.replace(/[()\s]/g, '');
  const frac = /^([+-]?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  if (frac) return (frac[1] === '-' ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`not a number: ${tex}`);
  return n;
}

/** A term as a tile writes it: `+ \frac{4}{3}x^{3}`, `- x`, `2x^{2}`. */
function texTerm(tex: string): { c: number; p: number } {
  const m = /^([+-]?)(\\frac\{(\d+)\}\{(\d+)\}|\d+)?x(\^\{(\d+)\})?$/.exec(tex.replace(/\s/g, ''));
  if (!m) throw new Error(`not a term: ${tex}`);
  const size = m[2] === undefined ? 1 : m[3] !== undefined ? Number(m[3]) / Number(m[4]) : Number(m[2]);
  return { c: (m[1] === '-' ? -1 : 1) * size, p: m[6] === undefined ? 1 : Number(m[6]) };
}

/** A range label: `$|x| < \frac{1}{2}$`, or every x. */
function rangeValue(label: string): number {
  if (label === 'every $x$') return Infinity;
  const m = /^\$\|x\| < (.+)\$$/.exec(label);
  if (!m) throw new Error(`not a range: ${label}`);
  return texNumber(m[1]);
}

/** An integral option as mathjs: `\int_{0}^{x} -\frac{2}{\sqrt{1 - 4t^{2}}}\,dt`. */
function integrand(tex: string): string {
  return tex
    .replace('\\int_{0}^{x} ', '')
    .replace('\\,dt', '')
    .replace(/t\^\{2\}/g, 't^2')
    .replace(/\\sqrt\{([^{}]*)\}/, 'sqrt($1)')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/, '($1)/($2)')
    .replace(/(\d)t/g, '$1*t');
}

describe('Series Expansions level 5: the binomial series', () => {
  it('fills each derivative and coefficient of (1 + bx)^n correctly', () => {
    for (const { params, slide } of draws(g.derivTable)) {
      if (slide.kind !== 'table') throw new Error('expected a table');
      const a = coefs(binSource(params.n, params.b));
      const got = slide.answer.map(texNumber);
      [1, 2, 3].forEach((k, i) => {
        near(got[2 * i], a[k] * fact(k));
        near(got[2 * i + 1], a[k]);
      });
    }
  });

  it('types the right derivative at 0', () => {
    for (const { params, slide } of draws(g.kthDeriv)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      near(math.evaluate(slide.answer) as number, coefs(binSource(params.n, params.b))[params.k] * fact(params.k));
    }
  });

  it('places the first terms of the series', () => {
    for (const { params, slide } of draws(g.termsTiles)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const a = coefs(binSource(params.n, params.b));
      slide.answer.map(texTerm).forEach((t, i) => {
        expect(t.p).toBe(i + 1);
        near(t.c, a[t.p]);
      });
    }
  });

  it('gives the radius the function itself reaches', () => {
    for (const gen of [g.ratioFlow, g.radiusTyped]) {
      for (const { params, slide } of draws(gen as Generator<{ n: never; b: never; a: number }>)) {
        const r = reach(binSource(params.n, params.b, params.a));
        const got =
          slide.kind === 'expression'
            ? (math.evaluate(slide.answer) as number)
            : slide.kind === 'flow'
              ? texNumber(slide.answer[2].replace(/^\$R = |\$$/g, ''))
              : NaN;
        expect(Math.abs(got - r)).toBeLessThan(2e-3);
      }
    }
  });

  it('slides to where the graph breaks', () => {
    for (const { params, slide } of draws(g.radiusSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const r = reach(`(${params.a} - ${params.b}*x)^(${params.n.n}/${params.n.d})`);
      expect(Math.abs(slide.answer - r)).toBeLessThan(2e-3);
    }
  });

  it('runs the recurrence to the right coefficients', () => {
    for (const { params, slide } of draws(g.recurTable)) {
      if (slide.kind !== 'table') throw new Error('expected a table');
      const a = coefs(binSource(params.n, params.b));
      slide.answer.map(texNumber).forEach((v, i) => near(v, a[i + 1]));
    }
    for (const { params, slide } of draws(g.recurSteps)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const a = coefs(binSource(params.n, params.b));
      near(texNumber(slide.start[0]), a[params.k]);
      near(texNumber(slide.reductions[slide.reductions.length - 1].value), a[params.k + 1]);
    }
    for (const { params, slide } of draws(g.coefTyped)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      near(math.evaluate(slide.answer) as number, coefs(binSource(params.n, params.b))[params.k]);
    }
  });

  it('integrates the series term by term', () => {
    for (const { params, slide } of draws(g.intTiles)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const a = coefs(`(1 + (${params.c.n}/${params.c.d})*x^2)^(${params.n.n}/${params.n.d})`);
      slide.answer.map(texTerm).forEach((t, i) => {
        expect(t.p).toBe(2 * i + 3);
        near(t.c, a[t.p - 1] / t.p);
      });
    }
    for (const { params, slide } of draws(g.arcCoef)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      near(math.evaluate(slide.answer) as number, coefs(arcSource(params.fn, params.b))[2 * params.k + 1]);
    }
  });

  it('picks the integral whose derivative is the function’s, and only that one', () => {
    for (const { params, slide } of draws(g.whichInt)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const d = math.derivative(arcSource(params.fn, params.b), 'x');
      const slope = (t: number) => d.evaluate({ x: t }) as number;
      const b = params.b.n / params.b.d;
      const ts = [0.3, -0.2, 0.11].map((t) => t / Math.abs(b));
      for (const option of slide.options) {
        const f = math.compile(integrand(option.label));
        const matches = ts.every((t) => Math.abs((f.evaluate({ t }) as number) - slope(t)) < 1e-9);
        expect(matches, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('multiplies the series pair by pair', () => {
    for (const { params, slide } of draws(g.pairsTree)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const got = slide.answer.map(texNumber);
      const p = coefs(partnerSource(params.partner, params.c));
      const a = coefs(binSource(params.n, params.b));
      [0, 1, 2].forEach((i) => near(got[i], p[i] * a[2 - i]));
      near(got[3], coefs(`(${partnerSource(params.partner, params.c)})*${binSource(params.n, params.b)}`)[2]);
    }
    for (const { params, slide } of draws(g.productCoef)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const want = coefs(`(${partnerSource(params.partner, params.c)})*${binSource(params.n, params.b)}`)[params.j];
      near(math.evaluate(slide.answer) as number, want);
    }
  });

  it('says where a product is valid', () => {
    for (const { params, slide } of draws(g.validFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const other =
        params.partner === 'pow' ? binSource(params.m, { n: params.c, d: 1 }) : partnerSource(params.partner, params.c);
      const r1 = reach(binSource(params.n, params.b));
      const r2 = reach(other, 12);
      const [one, two, both] = slide.answer.map(rangeValue);
      expect(Math.abs(one - r1)).toBeLessThan(2e-3);
      if (params.partner === 'exp') expect(two).toBe(Infinity);
      else expect(Math.abs(two - r2)).toBeLessThan(2e-3);
      expect(Math.abs(both - Math.min(r1, r2))).toBeLessThan(2e-3);
    }
  });
});
