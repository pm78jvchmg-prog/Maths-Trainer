/**
 * The Series Expansions generators, checked against mathjs's own calculus.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * series with a factorial missing, a sign that fails to alternate, or a Taylor
 * coefficient taken about the wrong point. So here every answer is read back
 * off the rendered slide — the tiles placed, the tree filled, the value typed,
 * the option marked correct, the last value of a line of working — and each
 * coefficient is compared with `f^(n)(a)/n!`, where mathjs differentiates the
 * function `n` times itself. None of the generator's own coefficient
 * arithmetic is used to decide what is right.
 *
 * Level 3 is checked the same way: every remainder, derivative at c, bound M
 * and error is recomputed from mathjs's derivatives, the largest size of a
 * derivative on an interval found on a grid, and each read back off the slide.
 *
 * Level 4 recomputes every radius from the functions themselves. Symbolic
 * derivatives blow up past a few orders here, so the Taylor coefficients are
 * read off the function's own values round a circle in the complex plane (the
 * Cauchy integral, as a discrete Fourier transform), the radius is the limit
 * of |a_n / a_(n+1)|, and each end is judged by how fast its terms shrink.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';
import {
  centreOf,
  cfnSource,
  fact,
  fnSource,
  hTex,
  numeratorSource,
  powerSource,
  seriesByName as g,
  seriesSumTex,
  singSource,
  taylorSource,
  type Fn,
} from './seriesExpansions';

const SEEDS = 120;

function draws<P>(generator: Generator<P>, seeds = SEEDS): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: seeds }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** `f^(n)(a)/n!` for n = 0..upTo, by differentiating the source n times with mathjs. */
const taylorCache = new Map<string, number[]>();
function taylor(source: string, upTo: number, at = 0, simplify = false): number[] {
  const key = `${source}@${at}#${upTo}#${simplify}`;
  const cached = taylorCache.get(key);
  if (cached) return cached;
  const out: number[] = [];
  let node = math.parse(source);
  // Unsimplified derivatives keep terms like 0 * x^(-1), which are NaN at
  // exactly 0; a hair away from 0 they are 0, and nothing else moves. Left
  // unsimplified the tree also doubles at each quotient, so the long runs
  // (fourteen derivatives of ln(1 + x)) simplify as they go instead.
  const x = at === 0 ? 1e-40 : at;
  for (let n = 0; n <= upTo; n += 1) {
    out.push((node.evaluate({ x }) as number) / fact(n));
    node = math.derivative(node, 'x', { simplify });
  }
  taylorCache.set(key, out);
  return out;
}

const maclaurin = (f: Fn, upTo: number, simplify = false) => taylor(fnSource(f), upTo, 0, simplify);

/** A number as TeX writes it: `-\frac{4}{3}`, `- 3`, `(-\frac{1}{2})`, `12`. */
function texNumber(tex: string): number {
  const t = tex.replace(/[()\s]/g, '');
  const frac = /^([+-]?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  if (frac) return (frac[1] === '-' ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`not a number: ${tex}`);
  return n;
}

/** A term as a tile writes it: `+ \frac{4}{3}x^{3}`, `- x`, `2x^{2}`, `5`, `+ \frac{1}{4}(x - 4)^{2}`. */
function texTerm(tex: string, v = 'x'): { c: number; p: number } {
  const t = tex.replace(/\s/g, '');
  const escaped = v.replace(/\s/g, '').replace(/[()\\^{}+-]/g, (ch) => `\\${ch}`);
  const re = new RegExp(`^([+-]?)(\\\\frac\\{(\\d+)\\}\\{(\\d+)\\}|\\d+)?(${escaped}(\\^\\{(\\d+)\\})?)?$`);
  const m = re.exec(t);
  if (!m || (m[2] === undefined && m[5] === undefined)) throw new Error(`not a term: ${tex}`);
  const sign = m[1] === '-' ? -1 : 1;
  const size = m[2] === undefined ? 1 : m[3] !== undefined ? Number(m[3]) / Number(m[4]) : Number(m[2]);
  const p = m[5] === undefined ? 0 : m[7] === undefined ? 1 : Number(m[7]);
  return { c: sign * size, p };
}

/** A whole series as an option writes it, split into its terms. */
function texSeries(tex: string, v = 'x'): { c: number; p: number }[] {
  const body = tex.replace(/\+\s*\\cdots$/, '').trim();
  const parts = body.split(/\s(?=[+-]\s)/);
  return parts.map((part) => texTerm(part, v));
}

const placed = (slide: Slide): string[] => {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.answer;
};

const filled = (slide: Slide): number[] => {
  if (slide.kind !== 'tree') throw new Error(`expected a tree, got ${slide.kind}`);
  return slide.answer.map(texNumber);
};

/** The value a steps slide ends on. */
const lastValue = (slide: Slide): number => {
  if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
  return texNumber(slide.reductions[slide.reductions.length - 1].value);
};

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression, got ${slide.kind}`);
  return slide.answer;
};

const typedNumber = (slide: Slide): number => math.evaluate(typed(slide)) as number;

const picked = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Each placed term matches the true coefficient, and they are the first non-zero terms in order. */
function expectLeadingTerms(terms: { c: number; p: number }[], truth: number[], from = 0) {
  const expected = truth
    .map((c, p) => ({ c, p }))
    .filter(({ c, p }) => p >= from && Math.abs(c) > 1e-12)
    .slice(0, terms.length);
  expect(terms.map((t) => t.p)).toEqual(expected.map((t) => t.p));
  terms.forEach((t, i) => expect(close(t.c, expected[i].c), `x^${t.p}: ${t.c} against ${expected[i].c}`).toBe(true));
}

describe('level 1 series, checked against mathjs derivatives', { timeout: 120_000 }, () => {
  it('ser-coef-tree fills f\'(0), f\'\'(0), f\'\'\'(0), then f\'\'(0)/2! and f\'\'\'(0)/3!', () => {
    for (const { params, slide } of draws(g.coefTree)) {
      const t = maclaurin(params.f, 3);
      const [d1, d2, d3, c2, c3] = filled(slide);
      expect([d1, d2, d3].every((d, i) => close(d, t[i + 1] * fact(i + 1)))).toBe(true);
      expect(close(c2, t[2]) && close(c3, t[3])).toBe(true);
    }
  });

  it('ser-coef-typed types f^(n)(0)/n!', () => {
    for (const { params, slide } of draws(g.coefTyped)) {
      const value = typedNumber(slide);
      if (params.f) {
        expect(close(value, maclaurin(params.f, params.n)[params.n])).toBe(true);
      } else {
        // Read the derivative back out of the prompt, not the params.
        const name = params.n <= 3 ? `f${"'".repeat(params.n)}(0)` : `f^{(${params.n})}(0)`;
        const at = proseOf(slide).indexOf(`$${name} = `);
        const given = Number(/= (-?\d+)\$/.exec(proseOf(slide).slice(at))![1]);
        expect(close(value, given / fact(params.n))).toBe(true);
      }
    }
  });

  it('ser-first-terms-tiles places the first four non-zero terms', () => {
    for (const { params, slide } of draws(g.firstTermsTiles)) {
      const terms = placed(slide).map((tok) => texTerm(tok));
      const truth = params.f ? maclaurin(params.f, 6) : params.derivs!.map((d, p) => d / fact(p));
      expectLeadingTerms(terms, truth);
    }
  });

  it('ser-which-flow finds the constant term exactly when every derivative exists', () => {
    for (const { params, slide } of draws(g.whichFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      if (params.rough === 'ln' || params.rough === 'recip') expect(slide.answer).toEqual(['No']);
      else if (params.rough) expect(slide.answer).toEqual(['Yes', 'No']);
      else {
        const f0 = math.evaluate(fnSource(params.good!), { x: 0 }) + params.shift;
        expect(slide.answer.slice(0, 2)).toEqual(['Yes', 'Yes']);
        expect(texNumber(slide.answer[2].replace(/\$/g, ''))).toBe(f0);
      }
    }
  });

  it('ser-exp-tiles places the terms after the constant', () => {
    for (const { params, slide } of draws(g.expTiles)) {
      const truth = maclaurin(params.f, 5);
      expect(slide.kind === 'tiles' && slide.template.startsWith(`f(x) = ${truth[0]} `)).toBe(true);
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), truth, 1);
    }
  });

  it('ser-exp-steps ends on the x^n coefficient', () => {
    for (const { params, slide } of draws(g.expSteps)) {
      const source = `(${params.a})*exp((${params.k.n}/${params.k.d})*x)`;
      expect(close(lastValue(slide), taylor(source, params.n)[params.n])).toBe(true);
    }
  });

  it('ser-exp-term types the x^n term', () => {
    for (const { params, slide, seed } of draws(g.expTerm)) {
      const c = maclaurin(params.f, params.n)[params.n];
      expect(checkAnswer(typed(slide), `(${c})*x^${params.n}`, { seed }).status).toBe('correct');
    }
  });

  it('ser-exp-slider answers with the polynomial at the marked x', () => {
    for (const { params, slide } of draws(g.expSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const t = taylor(`exp(${params.k}*x)`, params.deg);
      const value = t.reduce((total, c, p) => total + c * params.a ** p, 0);
      expect(close(slide.answer, value)).toBe(true);
    }
  });

  it('ser-trig-tiles places the first three terms', () => {
    for (const { params, slide } of draws(g.trigTiles)) {
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), maclaurin(params.f, 6));
    }
  });

  it('ser-trig-sign-flow says No exactly when the coefficient is zero, and its sign otherwise', () => {
    for (const { params, slide } of draws(g.trigSignFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const t = maclaurin(params.f, 7);
      const c = t[params.n];
      if (Math.abs(c) < 1e-12) {
        expect(slide.answer).toEqual(['No']);
        continue;
      }
      const place = t.slice(0, params.n + 1).filter((v) => Math.abs(v) > 1e-12).length;
      expect(slide.answer).toEqual(['Yes', ['1st', '2nd', '3rd', '4th'][place - 1], c > 0 ? 'Positive' : 'Negative']);
    }
  });

  it('ser-trig-cycle-tree fills f(0) to f^(4)(0)', () => {
    for (const { params, slide } of draws(g.trigCycleTree)) {
      const t = taylor(`${params.a}*sin(${params.k}*x) + ${params.b}*cos(${params.k}*x)`, 4);
      filled(slide).forEach((d, i) => expect(close(d, t[i] * fact(i))).toBe(true));
    }
  });

  it('ser-trig-pick marks the true series correct, and no distractor is it', () => {
    for (const { params, slide } of draws(g.trigPick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const truth = maclaurin(params.f, 6);
      expectLeadingTerms(texSeries(picked(slide)), truth);
      for (const option of slide.options) {
        if (option.id === slide.correctId) continue;
        const terms = texSeries(option.label);
        const matches = terms.every((t) => close(t.c, truth[t.p] ?? 0));
        expect(matches, `distractor ${option.label} is the series`).toBe(false);
      }
    }
  });

  it('ser-log-tiles places ln a and the terms of the series', () => {
    for (const { params, slide } of draws(g.logTiles)) {
      const tokens = placed(slide);
      if (params.a !== undefined) {
        expect(tokens[0]).toBe(`\\ln ${params.a}`);
        const truth = taylor(`log(${params.a} + (${params.b})*x)`, 6);
        expect(close(truth[0], Math.log(params.a))).toBe(true);
        expectLeadingTerms(tokens.slice(1).map((tok) => texTerm(tok)), truth, 1);
      } else {
        expectLeadingTerms(tokens.map((tok) => texTerm(tok)), maclaurin(params.f!, 6));
      }
    }
  });

  it('ser-log-coef types the x^n coefficient', () => {
    for (const { params, slide } of draws(g.logCoefGen)) {
      const source =
        params.k !== undefined
          ? `log(1 + (${params.k})*x)`
          : `log(1 + (${params.a})*x) ${params.quotient ? '-' : '+'} log(1 + (${params.b})*x)`;
      expect(close(typedNumber(slide), taylor(source, params.n)[params.n])).toBe(true);
    }
  });

  it('ser-log-valid-flow says Yes exactly when the partial sums settle on f(x)', () => {
    for (const { params, slide } of draws(g.logValidFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const x = texNumber(/x = (.+)$/.exec(slide.subject)![1]);
      const ln = params.form.startsWith('ln');
      const u = (params.form.endsWith('-') ? -1 : 1) * params.k * x * (params.form.startsWith('geo') ? -1 : 1);
      // ln(1 + kx) and ln(1 - kx) are ln(1 + u); 1/(1 - kx) and 1/(1 + kx) are 1/(1 - u).
      const f = ln ? Math.log(1 + u) : 1 / (1 - u);
      const term = (j: number) => (ln ? ((j % 2 === 1 ? 1 : -1) * u ** j) / j : u ** j);
      let sum = ln ? 0 : 1;
      for (let j = 1; j <= 20000; j += 1) sum += term(j);
      const settles = Number.isFinite(f) && Math.abs(sum - f) < 1e-3;
      expect(slide.answer[2], `u = ${u}`).toBe(settles ? 'Yes' : 'No');
      expect(texNumber(slide.answer[1].replace(/\$/g, ''))).toBeCloseTo(ln ? u : u, 9);
    }
  });

  it('ser-log-range picks the interval whose inside the series converges on', () => {
    for (const { params, slide } of draws(g.logRange)) {
      const label = picked(slide);
      if (params.form === 'pow') {
        expect(label).toBe('\\text{all real } x');
        continue;
      }
      const m = /^(.+?) (<|\\le) x (<|\\le) (.+)$/.exec(label)!;
      const [lo, hi] = [texNumber(m[1]), texNumber(m[4])];
      const k = params.k.n / params.k.d;
      const ln = params.form !== 'geo';
      // Just inside each end the series converges; just outside it does not.
      const converges = (x: number) => {
        const u = k * x;
        return ln ? u > -1 && u <= 1 + 1e-12 : Math.abs(u) < 1;
      };
      expect(converges(lo + 1e-6) && converges(hi - 1e-6)).toBe(true);
      expect(converges(lo - 1e-6) || converges(hi + 1e-6)).toBe(false);
      expect(converges(lo)).toBe(m[2] === '\\le');
      expect(converges(hi)).toBe(m[3] === '\\le');
    }
  });

  it('ser-sub-tiles places the first three terms of x^r f(c x^m)', () => {
    for (const { params, slide } of draws(g.subTiles, 80)) {
      const source = `x^${params.r} * ${fnSource(params.f)}`;
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), taylor(source, 7));
    }
  });

  it('ser-sub-tree ends on the two x coefficients', () => {
    for (const { params, slide } of draws(g.subTree, 80)) {
      const values = filled(slide);
      const t = maclaurin(params.f, params.f.m * (params.j + 1));
      expect(close(values[4], t[params.f.m * params.j])).toBe(true);
      expect(close(values[5], t[params.f.m * (params.j + 1)])).toBe(true);
    }
  });

  it('ser-multiply-steps ends on the x^n coefficient of the product', () => {
    for (const { params, slide } of draws(g.multiplySteps)) {
      const t = taylor(`${fnSource(params.f)} * ${fnSource(params.g)}`, params.n);
      expect(close(lastValue(slide), t[params.n])).toBe(true);
    }
  });

  it('ser-product-coef types the x^n coefficient of the product', () => {
    for (const { params, slide } of draws(g.productCoefGen)) {
      const t = taylor(`${fnSource(params.f)} * ${fnSource(params.g)}`, params.n);
      expect(close(typedNumber(slide), t[params.n])).toBe(true);
    }
  });
});

/** The first `count` non-zero coefficients, with their powers. */
const nonZeroTerms = (coefs: number[], count: number, from = 0) =>
  coefs
    .map((c, p) => ({ c, p }))
    .filter(({ c, p }) => p >= from && Math.abs(c) > 1e-12)
    .slice(0, count);

/** A centre or value as an option writes it: `16`, `\pi`, `\frac{\pi}{2}`, `e`, `1.1`. */
const texPoint = (tex: string): number =>
  tex === '\\pi' ? Math.PI : tex === '\\frac{\\pi}{2}' ? Math.PI / 2 : tex === 'e' ? Math.E : texNumber(tex);

/**
 * Where a series about `centre` is valid, found from the function itself: the
 * radius is the distance to the nearest point where it blows up, and an end is
 * included only where the function is still finite and the series still
 * converges there (the alternating ln end).
 */
function validity(source: string, centre: number, singular: number, lnLike: boolean) {
  const R = Math.abs(singular - centre);
  const other = singular < centre ? centre + R : centre - R;
  const f = (x: number) => math.evaluate(source, { x }) as number;
  expect(Number.isFinite(f(singular)), `${source} is finite at ${singular}`).toBe(false);
  return {
    lo: centre - R,
    hi: centre + R,
    loIn: lnLike && other < centre,
    hiIn: lnLike && other > centre,
  };
}

/** The function, centre and nearest singular point for a range question. */
function lineCase(form: string, k: number, a: number): { source: string; centre: number; singular: number; lnLike: boolean } {
  switch (form) {
    case 'ln':
      return { source: `log(1 + ${k}*x)`, centre: 0, singular: -1 / k, lnLike: true };
    case 'geo':
      return { source: `1/(1 - ${k}*x)`, centre: 0, singular: 1 / k, lnLike: false };
    case 'lnShift':
      return { source: `log(${a} + ${k * a}*x)`, centre: 0, singular: -1 / k, lnLike: true };
    case 'geoShift':
      return { source: `1/(${a} - ${k * a}*x)`, centre: 0, singular: 1 / k, lnLike: false };
    case 'lnTaylor':
      return { source: `log(x + ${1 - a})`, centre: a, singular: a - 1, lnLike: true };
    default:
      return { source: `1/(x + ${1 - a})`, centre: a, singular: a - 1, lnLike: false };
  }
}

/** `-\frac{1}{2} < x \le \frac{1}{2}` read back. */
function readRange(tex: string) {
  const m = /^(.+?) (<|\\le) x (<|\\le) (.+)$/.exec(tex.replace(/\$/g, '').trim())!;
  return { lo: texNumber(m[1]), hi: texNumber(m[4]), loIn: m[2] === '\\le', hiIn: m[3] === '\\le' };
}

function expectRange(got: { lo: number; hi: number; loIn: boolean; hiIn: boolean }, want: ReturnType<typeof validity>) {
  expect(close(got.lo, want.lo) && close(got.hi, want.hi), `${JSON.stringify(got)} against ${JSON.stringify(want)}`).toBe(true);
  expect([got.loIn, got.hiIn]).toEqual([want.loIn, want.hiIn]);
}

describe('level 2 series, checked against mathjs derivatives', { timeout: 120_000 }, () => {
  it('ser-taylor-tree fills the derivatives at a, then the coefficients', () => {
    for (const { params, slide } of draws(g.taylorTree)) {
      const t = taylor(taylorSource(params.t), 3, centreOf(params.t));
      const [d1, d2, d3, c2, c3] = filled(slide);
      expect([d1, d2, d3].every((d, i) => close(d, t[i + 1] * fact(i + 1)))).toBe(true);
      expect(close(c2, t[2]) && close(c3, t[3])).toBe(true);
    }
  });

  it('ser-taylor-tiles places the first terms in powers of (x - a)', () => {
    for (const { params, slide } of draws(g.taylorTiles)) {
      const truth = taylor(taylorSource(params.t), 5, centreOf(params.t));
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok, hTex(params.t))), truth);
    }
  });

  it('ser-taylor-coef types f^(n)(a)/n!', () => {
    for (const { params, slide } of draws(g.taylorCoef)) {
      expect(close(typedNumber(slide), taylor(taylorSource(params.t), params.n, centreOf(params.t))[params.n])).toBe(true);
    }
  });

  it('ser-taylor-centre picks the closest point where the function is known exactly', () => {
    const whole = (x: number) => Number.isInteger(x);
    // Where each function and all its derivatives have exact values, and a series exists.
    const known: [RegExp, (x: number) => boolean][] = [
      [/\\sqrt\[3\]\{x\}/, (x) => x > 0 && Math.round(Math.cbrt(x)) ** 3 === x],
      [/\\sqrt\{x\}/, (x) => x > 0 && whole(Math.sqrt(x))],
      [/\\ln x/, (x) => close(x, 1) || close(x, Math.E)],
      [/\\frac\{1\}\{x\}/, (x) => x !== 0 && whole(x)],
      [/\\sin x/, (x) => whole(Math.round((2 * x) / Math.PI)) && close((2 * x) / Math.PI, Math.round((2 * x) / Math.PI))],
    ];
    for (const { slide } of draws(g.taylorCentre)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const prose = proseOf(slide);
      // The number under the root (or inside the log) is what a centre is measured from.
      const value = math.evaluate(/estimate \$(.+?)\$ from/.exec(prose)![1].replace(/\\sqrt\[3\]\{(.+?)\}/, '$1').replace(/\\sqrt\{(.+?)\}/, '$1').replace(/\\ln /, '').replace(/\\sin /, '').replace(/\\frac\{1\}\{(.+?)\}/, '$1')) as number;
      const fnTex = /series of \$(.+?)\$/.exec(prose)![1];
      const nice = known.find(([re]) => re.test(fnTex))![1];
      const points = slide.options.map((o) => ({ id: o.id, x: texPoint(o.label.replace('x = ', '')) }));
      const usable = points.filter((p) => nice(p.x) && !close(p.x, value));
      const best = usable.reduce((a, b) => (Math.abs(b.x - value) < Math.abs(a.x - value) ? b : a));
      expect(best.id, prose).toBe(slide.correctId);
    }
  });

  it('ser-estimate-tree adds the first terms of the true series at h', () => {
    for (const { params, slide } of draws(g.estimateTree)) {
      const h = params.h.n / params.h.d;
      const terms = nonZeroTerms(maclaurin(params.f, 9), params.count);
      const values = filled(slide);
      terms.forEach(({ c, p }, i) => expect(close(values[i], c * h ** p)).toBe(true));
      expect(close(values[values.length - 1], terms.reduce((s, { c, p }) => s + c * h ** p, 0))).toBe(true);
    }
  });

  it('ser-dropped-term types the next non-zero term at h', () => {
    for (const { params, slide } of draws(g.droppedTerm)) {
      const h = params.h.n / params.h.d;
      const next = nonZeroTerms(maclaurin(params.f, 10, true), params.count + 1)[params.count];
      expect(close(typedNumber(slide), next.c * h ** next.p)).toBe(true);
    }
  });

  it('ser-estimate-pick counts terms until the next one is small enough', () => {
    for (const { params, slide } of draws(g.estimatePick, 60)) {
      const h = params.h.n / params.h.d;
      const terms = nonZeroTerms(maclaurin(params.f, 14, true), 20);
      let n = 1;
      while (Math.abs(terms[n].c * h ** terms[n].p) >= 10 ** -params.places) n += 1;
      expect(Number(picked(slide))).toBe(n);
    }
  });

  it('ser-estimate-slider stops where the first term left out meets the bound', () => {
    for (const { params, slide } of draws(g.estimateSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      // The first term left out, from the true series.
      const kept = nonZeroTerms(maclaurin(fnOfBase(params.base), 7), 8).filter((t) => t.p < params.p);
      const next = nonZeroTerms(maclaurin(fnOfBase(params.base), 7), kept.length + 1)[kept.length];
      expect(next.p).toBe(params.p);
      const bound = texNumber(/at most \$(.+)\$\.$/.exec(proseOf(slide))![1]);
      expect(close(Math.abs(next.c) * slide.answer ** next.p, bound)).toBe(true);
    }
  });

  it('ser-limit types the limit, which the series of the top gives', () => {
    for (const { params, slide } of draws(g.limitGen)) {
      const top = taylor(numeratorSource(params), params.p + 1);
      top.slice(0, params.p).forEach((c) => expect(Math.abs(c) < 1e-9).toBe(true));
      expect(close(typedNumber(slide), top[params.p] / params.b)).toBe(true);
    }
  });

  it('ser-limit-sum-steps ends on the limit', () => {
    for (const { params, slide } of draws(g.limitSumSteps)) {
      const top = taylor(numeratorSource(params), params.p);
      top.slice(0, params.p).forEach((c) => expect(Math.abs(c) < 1e-9).toBe(true));
      expect(close(lastValue(slide), top[params.p] / params.b)).toBe(true);
    }
  });

  it('ser-limit-flow compares the top\'s first power with the bottom\'s', () => {
    for (const { params, slide } of draws(g.limitFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      if (params.direct !== undefined) {
        expect(slide.answer).toEqual(['No']);
        continue;
      }
      const top = taylor(numeratorSource(params), 4);
      const p = top.findIndex((c) => Math.abs(c) > 1e-9);
      expect(slide.answer[1]).toBe(p === 1 ? '$x$' : `$x^{${p}}$`);
      const verdict = slide.answer[2];
      if (p > params.m) expect(verdict).toBe('is $0$');
      else if (p < params.m) expect(verdict).toBe('does not exist');
      else expect(close(texNumber(verdict.replace(/^is \$|\$$/g, '')), top[p] / params.b)).toBe(true);
    }
  });

  it('ser-leading-term picks the first term of the top\'s series', () => {
    for (const { params, slide } of draws(g.leadingTerm)) {
      const top = taylor(numeratorSource(params), 4);
      const p = top.findIndex((c) => Math.abs(c) > 1e-9);
      const term = texTerm(picked(slide));
      expect(term.p).toBe(p);
      expect(close(term.c, top[p])).toBe(true);
    }
  });

  it('ser-int-tiles places the integral of each term', () => {
    for (const { params, slide } of draws(g.intTiles)) {
      const f = maclaurin(params.f, 6);
      const integral = [0, ...f.map((c, p) => c / (p + 1))];
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), integral);
    }
  });

  it('ser-int-steps ends on three integrated terms at h', () => {
    for (const { params, slide } of draws(g.intSteps)) {
      const h = params.h.n / params.h.d;
      const f = maclaurin(params.f, 6);
      const total = nonZeroTerms(f, 3).reduce((s, { c, p }) => s + (c / (p + 1)) * h ** (p + 1), 0);
      expect(close(lastValue(slide), total)).toBe(true);
    }
  });

  it('ser-int-terms-tree fills the integrand coefficients, then the integral\'s', () => {
    for (const { params, slide } of draws(g.intTree)) {
      const terms = nonZeroTerms(maclaurin(params.f, 6), 3);
      const values = filled(slide);
      terms.forEach(({ c, p }, i) => {
        expect(close(values[i], c)).toBe(true);
        expect(close(values[i + 3], c / (p + 1))).toBe(true);
      });
    }
  });

  it('ser-int-coef types a coefficient of the integral', () => {
    for (const { params, slide } of draws(g.intCoef)) {
      const { c, p } = nonZeroTerms(maclaurin(params.f, 6), 3)[params.which];
      expect(close(typedNumber(slide), c / (p + 1))).toBe(true);
    }
  });

  it('ser-valid-line shades out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.validLine)) {
      if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      const want = validity(c.source, c.centre, c.singular, c.lnLike);
      const m = /^([[(])(-?[\d.]+),(-?[\d.]+)([\])])$/.exec(slide.answer)!;
      expectRange({ lo: Number(m[2]), hi: Number(m[3]), loIn: m[1] === '[', hiIn: m[4] === ']' }, want);
    }
  });

  it('ser-range-flow ends on the interval out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.rangeFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const k = params.b / params.a;
      const c = lineCase(params.ln ? 'lnShift' : 'geoShift', k, params.a);
      expectRange(readRange(slide.answer[2]), validity(c.source, c.centre, c.singular, c.lnLike));
    }
  });

  it('ser-valid-pick marks the one value inside the interval', () => {
    for (const { params, slide } of draws(g.validPick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      const want = validity(c.source, c.centre, c.singular, c.lnLike);
      const inside = (x: number) =>
        (want.loIn ? x >= want.lo - 1e-12 : x > want.lo + 1e-12) && (want.hiIn ? x <= want.hi + 1e-12 : x < want.hi - 1e-12);
      for (const option of slide.options) {
        expect(inside(texNumber(option.label.replace('x = ', '')))).toBe(option.id === slide.correctId);
      }
    }
  });

  it('ser-valid-tiles writes the interval out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.validTiles)) {
      const [lo, r1, r2, hi] = placed(slide);
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      expectRange(readRange(`${lo} ${r1} x ${r2} ${hi}`), validity(c.source, c.centre, c.singular, c.lnLike));
    }
  });
});

/** e^x, sin x or cos x itself. */
function fnOfBase(base: Fn['base']): Fn {
  return { base, k: { n: 1, d: 1 }, m: 1, scale: 1, index: 0 };
}

/* ---------- Level 3: error terms ---------- */

/**
 * TeX as the level 3 slides print a derivative, a bound or a remainder, as
 * mathjs reads it: `\frac{a}{b}` and `^{...}` become brackets, `\sin X` becomes
 * `sin(X)` and `e` becomes `exp(1)`. Only what these slides print is covered.
 */
function texMath(tex: string): string {
  let s = tex
    .replace(/\$/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/');
  for (;;) {
    const next = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\^\{([^{}]*)\}/g, '^($1)');
    if (next === s) break;
    s = next;
  }
  // `\sin X`: X is a bracket, or a run such as `2c`.
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    const trig = /^\\(sin|cos)\s*/.exec(s.slice(i));
    if (!trig) {
      out += s[i];
      continue;
    }
    let j = i + trig[0].length;
    const start = j;
    if (s[j] === '(') {
      for (let depth = 0; j < s.length; j += 1) {
        if (s[j] === '(') depth += 1;
        if (s[j] === ')' && --depth === 0) break;
      }
      j += 1;
    } else {
      j += /^[0-9.]*[a-z]/.exec(s.slice(j))![0].length;
    }
    out += ` ${trig[1]}(${s.slice(start, j)})`;
    i = j - 1;
  }
  return out.replace(/(?<![a-z])e(?![a-z])/g, ' exp(1)');
}

/** A printed TeX value, with its variables set. */
const at = (tex: string, scope: Record<string, number> = {}): number => math.evaluate(texMath(tex), scope) as number;

const valueOf = (a: { n: number; d: number }): number => a.n / a.d;

/** `f^(p)` as a function of x, differentiated by mathjs. */
const derivCache = new Map<string, (x: number) => number>();
function derivative(source: string, p: number): (x: number) => number {
  const key = `${source}#${p}`;
  const cached = derivCache.get(key);
  if (cached) return cached;
  let node = math.parse(source);
  for (let i = 0; i < p; i += 1) node = math.derivative(node, 'x', { simplify: true });
  const compiled = node.compile();
  const fn = (x: number) => compiled.evaluate({ x }) as number;
  derivCache.set(key, fn);
  return fn;
}

/** The largest |h| over [lo, hi], on a grid that includes both ends. */
function supOn(h: (x: number) => number, lo: number, hi: number, steps = 400): number {
  let best = 0;
  for (let i = 0; i <= steps; i += 1) best = Math.max(best, Math.abs(h(lo + ((hi - lo) * i) / steps)));
  return best;
}

/**
 * The Lagrange M: the most |f^(p)(c)| can be for c from lo to hi. A sine or
 * cosine is bounded by the most it ever reaches, so it is searched over a whole
 * period, not the interval, which is what the standard M = 1 means.
 */
const supCache = new Map<string, number>();
function lagrangeM(f: Fn, p: number, lo: number, hi: number): number {
  const wave = f.base === 'sin' || f.base === 'cos';
  const key = `${fnSource(f)}#${p}#${wave ? '' : `${lo},${hi}`}`;
  const cached = supCache.get(key);
  if (cached !== undefined) return cached;
  const d = derivative(fnSource(f), p);
  const value = wave ? supOn(d, 0, (2 * Math.PI) / Math.abs(valueOf(f.k)), 4000) : supOn(d, lo, hi);
  supCache.set(key, value);
  return value;
}

const near = (a: number, b: number, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

/** A value as asked for: to 3 significant figures. */
const sf3 = (v: number): number => Number(v.toPrecision(3));

/** `f'''`, `f^{(4)}`: the name of the p-th derivative, as a flow labels it. */
const dLabel = (p: number): string => (p <= 3 ? `$f${"'".repeat(p)}$` : `$f^{(${p})}$`);

const POINTS = [-0.7, -0.2, 0.3, 0.9, 1.4];

/** Whether printed TeX in `v` is the p-th derivative of `source` at every point. */
const isDerivative = (tex: string, source: string, p: number, v = 'c', points = POINTS): boolean =>
  points.every((c) => near(at(tex, { [v]: c }), derivative(source, p)(c)));

/** The typed slide, then its `+choice` variant, each with the number the learner gives. */
function answered<P>(generator: Generator<P>): { params: P; value: number; slide: Slide }[] {
  const variant = registry[`${generator.id}+choice`] as unknown as Generator<P>;
  return [...draws(generator), ...draws(variant)].map(({ params, slide }) => ({
    params,
    slide,
    value: slide.kind === 'choice' ? at(picked(slide)) : typedNumber(slide),
  }));
}

/** Whether a statement such as `E < \frac{1}{48}` or `a < E \le b` holds for this E. */
function holds(statement: string, e: number): boolean {
  const s = statement.replace(/\$/g, '').trim();
  const between = /^(.+) < E \\le (.+)$/.exec(s);
  if (between) return at(between[1]) < e && e <= at(between[2]) * (1 + 1e-12);
  const [, op, rhs] = /^E (<|=|>) (.+)$/.exec(s)!;
  const v = at(rhs);
  return op === '<' ? e < v : op === '>' ? e > v : near(e, v);
}

/** f(h) take away its Maclaurin polynomial up to x^n, from mathjs's derivatives. */
function remainderAt(source: string, n: number, h: number): number {
  const kept = taylor(source, n, 0, true).reduce((sum, c, p) => sum + c * h ** p, 0);
  return (math.evaluate(source, { x: h }) as number) - kept;
}

describe('level 3 error terms, checked against mathjs derivatives', { timeout: 120_000 }, () => {
  it('reads the TeX these slides print', () => {
    expect(at('16e^{2c}', { c: 0.5 })).toBeCloseTo(16 * Math.E);
    expect(at('\\frac{1}{16}\\cos\\frac{c}{2}', { c: 1 })).toBeCloseTo(Math.cos(0.5) / 16);
    expect(at('-\\sin(-c)', { c: 1 })).toBeCloseTo(Math.sin(1));
    expect(at('-\\frac{15}{16}c^{-\\frac{7}{2}}', { c: 4 })).toBeCloseTo((-15 / 16) * 4 ** -3.5);
    expect(at('\\frac{2}{c^{3}}', { c: 2 })).toBeCloseTo(0.25);
    expect(at('\\frac{-3\\cos 2c}{24}x^{4}', { c: 0.2, x: 0.5 })).toBeCloseTo((-3 * Math.cos(0.4) * 0.0625) / 24);
    expect(at('\\frac{(x - 4)^{3}}{3!}', { x: 5 })).toBeCloseTo(1 / 6);
    expect(at('e^{0.5}')).toBeCloseTo(Math.exp(0.5));
  });

  it('ser-rem-tiles places f^(n+1)(c) and x^(n+1)/(n+1)!', () => {
    for (const { params, slide } of draws(g.remTiles)) {
      const p = params.n + 1;
      const [d, frac] = placed(slide);
      expect(isDerivative(d, fnSource(params.f), p), d).toBe(true);
      expect(POINTS.every((x) => near(at(frac, { x }), x ** p / fact(p))), frac).toBe(true);
    }
  });

  it('ser-rem-flow names f^(n+1), writes it out and takes it at c', () => {
    for (const { params, slide } of draws(g.remFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const p = params.n + 1;
      const [which, what, where] = slide.answer;
      expect(which).toBe(dLabel(p));
      expect(isDerivative(what, fnSource(params.f), p, 'x'), what).toBe(true);
      expect(where).toBe('some $c$ between $0$ and $x$');
    }
  });

  it('ser-rem-pick marks the one option equal to f^(n+1)(c) x^(n+1)/(n+1)!', () => {
    for (const { params, slide } of draws(g.remPick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const p = params.n + 1;
      const d = derivative(fnSource(params.f), p);
      const right = (tex: string) => POINTS.every((c) => [0.4, -1.1].every((x) => near(at(tex, { c, x }), (d(c) * x ** p) / fact(p))));
      for (const option of slide.options) expect(right(option.label), option.label).toBe(option.id === slide.correctId);
    }
  });

  it('ser-rem-exact gives f(h) - P_n(h) for the polynomial', () => {
    for (const { params, value } of answered(g.remExact)) {
      expect(near(value, remainderAt(fnSource(params.f), params.n, valueOf(params.h)))).toBe(true);
    }
  });

  it('ser-bound-m-flow takes M as the most |f^(n+1)(c)| can be between 0 and x', () => {
    for (const { params, slide } of draws(g.boundMFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const p = params.n + 1;
      const x = valueOf(params.x);
      const [which, where, m] = slide.answer;
      expect(which).toBe(dLabel(p));
      expect(near(at(m.replace(/^\$M = /, ''), {}), lagrangeM(params.f, p, Math.min(0, x), Math.max(0, x)), 1e-6), m).toBe(true);
      const d = derivative(fnSource(params.f), p);
      if (params.f.base !== 'exp') expect(where.startsWith('Nowhere')).toBe(true);
      else expect(where).toBe(Math.abs(d(0)) > Math.abs(d(x)) ? 'At $c = 0$' : `At $c = ${x}$`);
    }
  });

  it('ser-bound-tiles places M, |x|^(n+1) and (n+1)!', () => {
    for (const { params, slide } of draws(g.boundTiles)) {
      const p = params.n + 1;
      const x = valueOf(params.x);
      const [m, power, factorial] = placed(slide);
      expect(near(at(m), lagrangeM(params.f, p, Math.min(0, x), Math.max(0, x)), 1e-6), m).toBe(true);
      expect(power.endsWith(`^{${p}}`) && near(at(power), Math.abs(x) ** p), power).toBe(true);
      expect(factorial).toBe(`${p}!`);
    }
  });

  it('ser-bound-tree fills M, |x|^(n+1), (n+1)! and the bound', () => {
    for (const { params, slide } of draws(g.boundTree)) {
      const p = params.n + 1;
      const x = valueOf(params.x);
      const M = lagrangeM(params.f, p, Math.min(0, x), Math.max(0, x));
      const [m, power, factorial, bound] = filled(slide);
      expect(near(m, M, 1e-6) && near(power, Math.abs(x) ** p) && factorial === fact(p)).toBe(true);
      expect(near(bound, (M * Math.abs(x) ** p) / fact(p), 1e-6)).toBe(true);
    }
  });

  it('ser-bound-dec gives the Lagrange bound to 3 s.f.', () => {
    for (const { params, value } of answered(g.boundDec)) {
      const p = params.n + 1;
      const x = valueOf(params.x);
      expect(value).toBe(sf3((lagrangeM(params.f, p, Math.min(0, x), Math.max(0, x)) * Math.abs(x) ** p) / fact(p)));
    }
  });

  it('ser-compare-flow says the error is under the first term left out exactly when the terms alternate', () => {
    for (const { params, slide } of draws(g.compareFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const h = valueOf(params.h);
      const source = fnSource(params.f);
      const values = nonZeroTerms(taylor(source, 12, 0, true), 6).map(({ c, p }) => c * h ** p);
      const alt = values.every((v, i) => i === 0 || v * values[i - 1] < 0);
      expect(slide.answer).toEqual(alt ? ['They alternate', 'Smaller'] : ['They all have the same sign', 'Larger']);
      // And the claim is true of this function at this h.
      const error = Math.abs((math.evaluate(source, { x: h }) as number) - values.slice(0, params.count).reduce((s, v) => s + v, 0));
      expect(alt ? error < Math.abs(values[params.count]) : error > Math.abs(values[params.count])).toBe(true);
    }
  });

  it('ser-compare-tree fills h^(n+1), (n+1)!, the first term left out D, and a Lagrange bound B', () => {
    for (const { params, slide } of draws(g.compareTree)) {
      const p = params.n + 1;
      const h = valueOf(params.h);
      const source = `exp(${params.k}*x)`;
      const [power, factorial, D, B] = filled(slide);
      expect(near(power, h ** p) && factorial === fact(p)).toBe(true);
      expect(near(D, Math.abs(taylor(source, p, 0, true)[p]) * h ** p)).toBe(true);
      const lagrange = (supOn(derivative(source, p), 0, h) * h ** p) / fact(p);
      const error = Math.abs(remainderAt(source, params.n, h));
      if (params.k < 0) expect(near(B, lagrange)).toBe(true);
      // e^{c} is bounded by a whole number above e^h, so B is a whole multiple of D at or above Lagrange's.
      else expect(Number.isInteger(Math.round(B / D)) && near(B / D, Math.round(B / D)) && B >= lagrange && B < lagrange + D).toBe(true);
      expect(error <= B && (params.k > 0 ? error > D : error < D)).toBe(true);
    }
  });

  it('ser-compare-pick marks the one true statement about the actual error', () => {
    for (const { params, slide } of draws(g.comparePick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const p = params.n + 1;
      const h = valueOf(params.h);
      const source = fnSource(params.f);
      const prose = proseOf(slide);
      const D = at(/\$D = ([^$]+)\$/.exec(prose)![1]);
      const B = at(/\$B = ([^$]+)\$/.exec(prose)![1]);
      expect(near(D, Math.abs(taylor(source, p, 0, true)[p] * h ** p))).toBe(true);
      const lagrange = (lagrangeM(params.f, p, Math.min(0, h), Math.max(0, h)) * Math.abs(h) ** p) / fact(p);
      const grows = params.f.base === 'exp' && valueOf(params.f.k) * h > 0;
      expect(grows ? B >= lagrange : near(B, lagrange, 1e-9), prose).toBe(true);
      const error = Math.abs(remainderAt(source, params.n, h));
      for (const option of slide.options) expect(holds(option.label, error), option.label).toBe(option.id === slide.correctId);
    }
  });

  it('ser-compare-exact gives the actual error of the geometric estimate', () => {
    for (const { params, value } of answered(g.compareExact)) {
      const source = `1/(1 - (${valueOf(params.k)})*x)`;
      expect(near(value, remainderAt(source, params.n, valueOf(params.h)))).toBe(true);
    }
  });

  it('ser-degree-table states a sound M and fills M|x|^(n+1)/(n+1)! for each n', () => {
    for (const { params, slide } of draws(g.degreeTable)) {
      if (slide.kind !== 'table') throw new Error('expected table');
      const h = valueOf(params.h);
      const M = Number(/\$M = (\d+)\$/.exec(proseOf(slide))![1]);
      slide.rows.forEach((row, i) => {
        const n = Number(row[0]);
        const p = n + 1;
        const least = lagrangeM(params.f, p, Math.min(0, h), Math.max(0, h));
        // At least the true M, and above it by less than one multiplier: a whole number above e^c.
        expect(M >= least * (1 - 1e-9) && M < least + Math.abs(params.f.scale)).toBe(true);
        expect(near(at(slide.answer[i]), (M * Math.abs(h) ** p) / fact(p))).toBe(true);
      });
    }
  });

  it('ser-degree-n gives the smallest n whose Lagrange bound is under the tolerance', () => {
    for (const { params, value, slide } of answered(g.degreeN)) {
      const x = valueOf(params.x);
      const tol = Number(/under \$([\d.]+)\$/.exec(proseOf(slide))![1]);
      const bound = (n: number) => (lagrangeM(params.f, n + 1, Math.min(0, x), Math.max(0, x)) * Math.abs(x) ** (n + 1)) / fact(n + 1);
      let n = 1;
      while (bound(n) >= tol) n += 1;
      expect(value).toBe(n);
    }
  });

  it('ser-degree-slider stops at the last step where the bound is within the tolerance', () => {
    for (const { params, slide } of draws(g.degreeSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const p = params.n + 1;
      const tol = Number(/at most \$([\d.]+)\$\.$/.exec(proseOf(slide))![1]);
      const bound = (x: number) => (lagrangeM(params.f, p, 0, x) * x ** p) / fact(p);
      let best = 0;
      for (let i = 0; i * 0.05 <= 2 + 1e-9; i += 1) if (bound(i * 0.05) <= tol) best = i * 0.05;
      expect(near(slide.answer, best)).toBe(true);
    }
  });

  it('ser-degree-reach gives the X where the Lagrange bound reaches the tolerance', () => {
    for (const { params, value, slide } of answered(g.degreeReach)) {
      const p = params.n + 1;
      const tol = at(/at most \$([^$]+)\$/.exec(proseOf(slide))![1]);
      // M does not grow with x for any function asked here, so the bound is M x^p / p!.
      const M = lagrangeM(params.f, p, 0, 3);
      expect(near(value, ((tol * fact(p)) / M) ** (1 / p), 1e-6)).toBe(true);
    }
  });

  it('ser-centre-tiles places f^(n+1)(c) and (x - a)^(n+1)/(n+1)!', () => {
    for (const { params, slide } of draws(g.centreTiles)) {
      const p = params.n + 1;
      const { a } = params.g;
      const [d, frac] = placed(slide);
      const points = [0.2, 0.5, 1.3].map((t) => a + t);
      expect(isDerivative(d, cfnSource(params.g), p, 'c', points), d).toBe(true);
      expect(points.every((x) => near(at(frac, { x }), (x - a) ** p / fact(p))), frac).toBe(true);
    }
  });

  it('ser-centre-flow takes M at whichever end the derivative is largest', () => {
    for (const { params, slide } of draws(g.centreFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const p = params.n + 1;
      const x = valueOf(params.x);
      const [lo, hi] = [Math.min(x, params.g.a), Math.max(x, params.g.a)];
      const d = derivative(cfnSource(params.g), p);
      const bigger = Math.abs(d(hi)) > Math.abs(d(lo));
      const [which, grow, end] = slide.answer;
      expect(which).toBe(dLabel(p));
      expect(grow).toBe(bigger ? 'Gets bigger' : 'Gets smaller');
      expect(near(Number(/c = (-?[\d.]+)\$/.exec(end)![1]), bigger ? hi : lo)).toBe(true);
    }
  });

  it('ser-centre-tree fills |x - a|^(n+1), M, (n+1)! and the bound', () => {
    for (const { params, slide } of draws(g.centreTree)) {
      const p = params.n + 1;
      const x = valueOf(params.x);
      const h = Math.abs(x - params.g.a);
      const M = supOn(derivative(cfnSource(params.g), p), Math.min(x, params.g.a), Math.max(x, params.g.a));
      const [power, m, factorial, bound] = filled(slide);
      expect(near(power, h ** p) && near(m, M) && factorial === fact(p)).toBe(true);
      expect(near(bound, (M * h ** p) / fact(p))).toBe(true);
    }
  });

  it('ser-centre-dec gives the bound about the centre to 3 s.f.', () => {
    for (const { params, value } of answered(g.centreDec)) {
      const p = params.n + 1;
      const x = valueOf(params.x);
      const M = supOn(derivative(cfnSource(params.g), p), Math.min(x, params.g.a), Math.max(x, params.g.a));
      expect(value).toBe(sf3((M * Math.abs(x - params.g.a) ** p) / fact(p)));
    }
  });
});

/* ---------- Level 4: the radius of convergence ---------- */

/**
 * The Taylor coefficients about `centre` from the function's own values: the
 * Cauchy integral, which is mathjs evaluating the function at 128 points round
 * a circle of radius `rho` in the complex plane, then a discrete Fourier
 * transform. `taylor` differentiates symbolically, and that is hopeless here:
 * mathjs's sixth derivative of `-log(1 - 4/9 x^2)` is over seven thousand
 * characters and took half a minute, and a shifted `u/(1 - u)^2` is worse.
 * `c_n rho^n` is what the transform measures, and the function's values are
 * only good to about `1e-16` of the largest, or of 1 when they are all small
 * (`log(1 - u)` for small u loses the rest to the 1), so a measurement under
 * `1e-11` of that is rounding and is returned as exactly 0.
 */
const cauchyCache = new Map<string, number[]>();
function cauchy(source: string, centre: number, rho: number, count = 20, points = 128): number[] {
  const key = `${source}@${centre}~${rho}`;
  const cached = cauchyCache.get(key);
  if (cached) return cached;
  const f = math.compile(source);
  const values = Array.from({ length: points }, (_, j) => {
    const t = (2 * Math.PI * j) / points;
    return math.complex(f.evaluate({ x: math.complex(centre + rho * Math.cos(t), rho * Math.sin(t)) }));
  });
  const measured = Array.from({ length: count }, (_, n) => {
    let sum = 0;
    for (let j = 0; j < points; j += 1) {
      const t = (2 * Math.PI * j * n) / points;
      sum += values[j].re * Math.cos(t) + values[j].im * Math.sin(t);
    }
    return sum / points;
  });
  const largest = Math.max(...values.map((v) => math.abs(v) as unknown as number));
  const out = measured.map((m, n) => (Math.abs(m) < 1e-11 * Math.max(largest, 1) ? 0 : m / rho ** n));
  cauchyCache.set(key, out);
  return out;
}

/** The coefficients that are there. */
const present = (coefs: number[]): { p: number; c: number }[] => coefs.map((c, p) => ({ p, c })).filter(({ c }) => c !== 0);

/**
 * The radius the coefficients give. `|c_n / c_(n+1)|` across consecutive
 * terms tends to `R^g`, where only every g-th power appears. An extra n or
 * 1/n makes it approach like `R^g (1 + b/n + c/n^2 + ...)`, so they are
 * extrapolated in 1/n from the last three, which a plain geometric run
 * passes through unchanged.
 * Infinite when they keep growing, as a factorial underneath makes them.
 */
function radiusFromCoefs(coefs: number[]): number {
  const terms = present(coefs);
  expect(terms.length, `too few coefficients survive: ${coefs.join(', ')}`).toBeGreaterThanOrEqual(4);
  const g = terms[terms.length - 1].p - terms[terms.length - 2].p;
  const ratios = terms.slice(0, -1).map((t, i) => ({ n: t.p / g, v: Math.abs(t.c / terms[i + 1].c) }));
  const last = ratios.length - 1;
  const [a, b, c] = [ratios[last - 2], ratios[last - 1], ratios[last]];
  if (c.v / ratios[Math.floor(last / 2)].v > 1.4) return Infinity;
  const n = c.n;
  const rg = (n * n * c.v - 2 * (n - 1) ** 2 * b.v + (n - 2) ** 2 * a.v) / 2;
  return rg ** (1 / g);
}

/**
 * The coefficients about `centre`, from a circle half as wide as the radius.
 * The circle has to sit inside the radius, and the error in `c_n` grows like
 * `(R/rho)^n`, so it starts small and widens to half of what each pass finds,
 * or doubles while too few terms rise above rounding to judge by.
 */
function coefsOf(source: string, centre = 0): number[] {
  let rho = 0.01;
  for (let pass = 0; pass < 16; pass += 1) {
    const coefs = cauchy(source, centre, rho);
    const terms = present(coefs);
    if (terms.length < 6 || terms[terms.length - 1].p < 12) {
      // Too far inside the radius: the terms fall below rounding before enough of them are seen.
      rho *= 2;
      continue;
    }
    const r = radiusFromCoefs(coefs);
    const next = Math.min(r, 8) / 2;
    if (Math.abs(next - rho) < 0.1 * rho) return coefs;
    expect(r, `${source}: a radius below the first circle`).toBeGreaterThan(rho);
    rho = next;
  }
  throw new Error(`${source}: the circle never settled`);
}

const radiusFrom = (source: string, centre = 0): number => radiusFromCoefs(coefsOf(source, centre));

/**
 * Whether the series about `centre` converges at `x`, from the terms there:
 * terms that do not shrink to 0 diverge, and terms shrinking like 1/n
 * converge exactly when their signs alternate.
 */
function convergesAt(source: string, centre: number, x: number): boolean {
  const terms = present(coefsOf(source, centre)).map(({ p, c }) => ({ p, t: c * (x - centre) ** p }));
  const last = terms[terms.length - 1];
  const mid = terms[Math.floor(terms.length / 2)];
  const power = Math.log(Math.abs(last.t) / Math.abs(mid.t)) / Math.log(last.p / mid.p);
  if (power > -0.5) return false;
  if (power < -1.5) return true;
  return terms.slice(-4).every((term, i, run) => i === 0 || Math.sign(term.t) !== Math.sign(run[i - 1].t));
}

/** Two radii agree: both infinite, or within the extrapolation's reach. */
const sameRadius = (a: number, b: number): boolean => (a === Infinity || b === Infinity ? a === b : Math.abs(a - b) < 5e-3 * Math.max(a, b));

/** A printed value, roots included: `\frac{1}{\sqrt{2}}`, `\sqrt[3]{4}`, `$R = \frac{3}{2}$`; `\infty` is Infinity. */
function texValue(tex: string, scope: Record<string, number> = {}): number {
  let s = tex
    .replace(/\$/g, '')
    .replace(/^[LR] = /, '')
    .replace(/\\,/g, ' ')
    .replace(/\\cdot/g, '*')
    .trim();
  if (s === '\\infty') return Infinity;
  for (;;) {
    const next = s
      .replace(/\\sqrt\[3\]\{([^{}]*)\}/g, 'cbrt($1)')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
    if (next === s) break;
    s = next;
  }
  return at(s, scope);
}

/** A number line's set, read back. */
function lineRange(answer: string) {
  const m = /^([[(])(-?[\d.]+),(-?[\d.]+)([\])])$/.exec(answer)!;
  return { lo: Number(m[2]), hi: Number(m[3]), loIn: m[1] === '[', hiIn: m[4] === ']' };
}

/** An interval about `centre` out to the radius, with each end included exactly where the series converges there. */
function expectInterval(got: { lo: number; hi: number; loIn: boolean; hiIn: boolean }, source: string, centre: number) {
  const r = radiusFrom(source, centre);
  expect(near(got.lo, centre - r, 5e-3 * r) && near(got.hi, centre + r, 5e-3 * r), `${JSON.stringify(got)} for R = ${r} about ${centre}`).toBe(true);
  expect(got.loIn, `the end ${got.lo} of ${source}`).toBe(convergesAt(source, centre, got.lo));
  expect(got.hiIn, `the end ${got.hi} of ${source}`).toBe(convergesAt(source, centre, got.hi));
}

describe('level 4 radius of convergence, checked against the functions themselves', { timeout: 120_000 }, () => {
  it('reads radii off coefficients, and ends off terms', () => {
    // Each kind of series once, against radii and ends known by hand.
    expect(sameRadius(radiusFrom('1/(1 - 3*x)'), 1 / 3)).toBe(true);
    expect(sameRadius(radiusFrom('-log(1 - x/2)'), 2)).toBe(true);
    expect(sameRadius(radiusFrom('(x/5)/(1 - x/5)^2'), 5)).toBe(true);
    expect(sameRadius(radiusFrom('-log(1 - 8*x^3)'), 1 / 2)).toBe(true);
    expect(sameRadius(radiusFrom('1/((x - 2)*(x + 2))', 1), 1)).toBe(true);
    expect(sameRadius(radiusFrom('1/(9 + 4*x^2)'), 3 / 2)).toBe(true);
    expect(radiusFrom('exp(5*x)')).toBe(Infinity);
    expect(radiusFrom('(x/2)*exp(x/2)')).toBe(Infinity);
    expect(convergesAt('-log(1 - x)', 0, 1)).toBe(false);
    expect(convergesAt('-log(1 - x)', 0, -1)).toBe(true);
    expect(convergesAt('1/(1 - x)', 0, -1)).toBe(false);
    expect(convergesAt('x/(1 - x)^2', 0, -1)).toBe(false);
    expect(texValue('\\frac{1}{\\sqrt{2}}')).toBeCloseTo(Math.SQRT1_2);
    expect(texValue('\\sqrt{\\frac{3}{2}}')).toBeCloseTo(Math.sqrt(1.5));
    expect(texValue('\\sqrt[3]{4}')).toBeCloseTo(Math.cbrt(4));
    expect(texValue('(-1)^{n}\\,n', { n: 3 })).toBe(-3);
  });

  it('ser-ratio-tiles splits the ratio of consecutive coefficients truly', () => {
    for (const { params, slide } of draws(g.ratioTiles)) {
      const [kPart, nPart] = placed(slide);
      const c = coefsOf(powerSource(params.s));
      for (let n = 4; n <= 10; n += 1) {
        expect(near(texValue(kPart) * texValue(nPart, { n }), Math.abs(c[n + 1] / c[n]), 1e-6), `n = ${n}`).toBe(true);
      }
    }
  });

  it('ser-ratio-flow finds L and compares L|x| with 1', () => {
    for (const { params, slide } of draws(g.ratioFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const r = radiusFrom(powerSource(params.s));
      const x = Math.abs(texValue(/x = (.+)$/.exec(slide.subject)![1]));
      expect(sameRadius(1 / texValue(slide.answer[0]), r)).toBe(true);
      const want = sameRadius(x, r) ? 'equal to $1$' : x < r ? 'less than $1$' : 'more than $1$';
      expect(slide.answer[1]).toBe(want);
    }
  });

  it('ser-ratio-limit types L, which is 1/R', () => {
    for (const { params, value } of answered(g.ratioLimit)) {
      expect(sameRadius(1 / value, radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-radius-slider stops at the radius', () => {
    for (const { params, slide } of draws(g.radiusSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      expect(sameRadius(slide.answer, radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-radius-typed types the radius', () => {
    for (const { params, value } of answered(g.radiusTyped)) {
      expect(sameRadius(value, radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-ratio-steps ends on L', () => {
    for (const { params, slide } of draws(g.ratioSteps)) {
      expect(sameRadius(1 / lastValue(slide), radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-radius-flow ends on the radius, or on an infinite one', () => {
    for (const { params, slide } of draws(g.radiusFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const r = radiusFrom(powerSource(params.s));
      if (r === Infinity) {
        expect(slide.answer).toEqual(['tends to $0$']);
        continue;
      }
      expect(slide.answer[0]).toBe('tends to a number $L > 0$');
      expect(sameRadius(1 / texValue(slide.answer[1]), r) && sameRadius(texValue(slide.answer[2]), r)).toBe(true);
    }
  });

  it('ser-radius-match marks the one series with the radius asked for', () => {
    for (const { params, slide } of draws(g.radiusMatch)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const asked = /radius of convergence \$(.+?)\$/.exec(proseOf(slide));
      const want = asked ? texValue(asked[1]) : Infinity;
      const all = [params.target, ...params.others];
      expect(slide.options.map((o) => o.label).sort()).toEqual(all.map(seriesSumTex).sort());
      for (const s of all) {
        const option = slide.options.find((o) => o.label === seriesSumTex(s))!;
        expect(sameRadius(radiusFrom(powerSource(s)), want), option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('ser-end-flow gives the true term at the end, and whether it converges there', () => {
    for (const { params, slide } of draws(g.endFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const source = powerSource(params.s);
      const x = texValue(/the end \$x = (.+?)\$/.exec(proseOf(slide))![1]);
      expect(sameRadius(Math.abs(x), radiusFrom(source))).toBe(true);
      const c = coefsOf(source);
      for (let n = 5; n <= 8; n += 1) expect(near(texValue(slide.answer[0], { n }), c[n] * x ** n, 1e-6), `n = ${n}`).toBe(true);
      const converges = slide.answer.length === 3 && slide.answer[2] === 'Yes';
      expect(converges).toBe(convergesAt(source, 0, x));
    }
  });

  it('ser-interval-line shades out to the radius, with each end as the terms there decide', () => {
    for (const { params, slide } of draws(g.intervalLine)) {
      if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
      expectInterval(lineRange(slide.answer), powerSource(params.s), 0);
    }
  });

  it('ser-interval-tiles writes the interval of convergence', () => {
    for (const { params, slide } of draws(g.intervalTiles)) {
      const [lo, r1, r2, hi] = placed(slide);
      expectInterval(readRange(`${lo} ${r1} x ${r2} ${hi}`), powerSource(params.s), 0);
    }
  });

  it('ser-interval-pick marks the interval of convergence, or every x', () => {
    for (const { params, slide } of draws(g.intervalPick)) {
      const label = picked(slide);
      const source = powerSource(params.s);
      if (label === '\\text{all real } x') expect(radiusFrom(source)).toBe(Infinity);
      else expectInterval(readRange(label), source, 0);
    }
  });

  it('ser-sub-radius types the radius of a series in x^2 or x^3', () => {
    for (const { params, value } of answered(g.subRadius)) {
      expect(sameRadius(value, radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-sub-pick marks the radius when it is a root', () => {
    for (const { params, slide } of draws(g.subPick)) {
      expect(sameRadius(texValue(picked(slide)), radiusFrom(powerSource(params.s)))).toBe(true);
    }
  });

  it('ser-shift-tree fills L, R and the ends about the centre', () => {
    for (const { params, slide } of draws(g.shiftTree)) {
      const r = radiusFrom(powerSource(params.s), params.s.a);
      const [L, R, lo, hi] = filled(slide);
      expect(sameRadius(1 / L, r) && sameRadius(R, r)).toBe(true);
      expect(near(lo, params.s.a - r, 5e-3) && near(hi, params.s.a + r, 5e-3)).toBe(true);
    }
  });

  it('ser-shift-line shades the interval about the centre, ends and all', () => {
    for (const { params, slide } of draws(g.shiftLine)) {
      if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
      expectInterval(lineRange(slide.answer), powerSource(params.s), params.s.a);
    }
  });

  it('ser-singular-typed types the radius, which the coefficients about the centre give', () => {
    for (const { params, value } of answered(g.singularTyped)) {
      expect(sameRadius(value, radiusFrom(singSource(params), params.a))).toBe(true);
    }
  });

  it('ser-singular-flow finds where the function breaks, then the radius', () => {
    for (const { params, slide } of draws(g.singularFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const source = singSource(params);
      const points = [...slide.answer[0].matchAll(/\$x = (-?\d+)\$/g)].map((m) => Number(m[1]));
      for (const x of points) expect(Number.isFinite(math.evaluate(source, { x }) as number), `${source} at ${x}`).toBe(false);
      expect(sameRadius(texValue(slide.answer[1]), radiusFrom(source, params.a))).toBe(true);
    }
  });

  it('ser-singular-slider stops at the radius', () => {
    for (const { params, slide } of draws(g.singularSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      expect(sameRadius(slide.answer, radiusFrom(singSource(params), params.a))).toBe(true);
    }
  });

  it('ser-complex-pick marks the radius a curve with no real break still has', () => {
    for (const { params, slide } of draws(g.complexPick)) {
      const source = `${params.b}/(${params.c ** 2} + ${params.k ** 2}*x^2)`;
      const label = picked(slide);
      expect(label).not.toBe('\\infty');
      expect(sameRadius(texValue(label), radiusFrom(source))).toBe(true);
    }
  });
});
