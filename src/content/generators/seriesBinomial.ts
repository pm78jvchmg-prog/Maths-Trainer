/**
 * Series Expansions level 5: the binomial series.
 *
 * Binomial Expansion's levels 6 and 7 quote `(1 + x)^n` for rational `n` and
 * use it. This level treats it as a series like the others in this course: its
 * coefficients derived from the derivatives at 0, its radius from the ratio
 * test (and the break where the bracket is 0), the recurrence one coefficient
 * gives the next by, `arctan` and `arcsin` by integrating it term by term, and
 * products with the standard series, with where such a product holds.
 *
 * A bracket is `(a + bx)^n` with `n` a fraction that is not a whole number at
 * least 0, held exactly as `Q`. Every coefficient shown is for `a = 1`, so
 * each is exact rational arithmetic; `a` other than 1 appears only where the
 * question is a radius, which needs no `a^n`.
 *
 * As everywhere, `*Tex` is what the learner reads and `answer` is what mathjs
 * grades. `seriesBinomial.test.ts` reads every answer back off the rendered
 * slide and recomputes it from the function itself, numerically.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { plotFigure, plotSvg } from '../figures';
import { say } from './format';
import { mix, stepBank, steered, tokenBank, turned } from './parametricImplicit';
import { choiceSlide, derivName, fact, monoTex, q, qAns, qBank, qChoices, qTex, signedMono, val, type Q } from './seriesExpansions';

/* ================================================================
 * Fractions
 * ================================================================ */

const ONE = q(1);
const add = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Q): Q => q(-a.n, a.d);
const sub = (a: Q, b: Q): Q => add(a, neg(b));
const mul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q): Q => q(a.n * b.d, a.d * b.n);
const abs = (a: Q): Q => q(Math.abs(a.n), a.d);
const eq = (a: Q, b: Q): boolean => a.n === b.n && a.d === b.d;

function pow(a: Q, k: number): Q {
  let out = ONE;
  for (let i = 0; i < k; i += 1) out = mul(out, a);
  return out;
}

/** `n(n - 1)...(n - k + 1)`, the number k derivatives of `(1 + x)^n` bring down. */
export function falling(n: Q, k: number): Q {
  let out = ONE;
  for (let i = 0; i < k; i += 1) out = mul(out, sub(n, q(i)));
  return out;
}

/** The coefficient of `x^k` in `(1 + x)^n`. */
export const binom = (n: Q, k: number): Q => div(falling(n, k), q(fact(k)));

/** The coefficient of `x^k` in `(1 + bx)^n`. */
export const coefOf = (n: Q, b: Q, k: number): Q => mul(binom(n, k), pow(b, k));

/**
 * A fraction that follows an operator: negatives are bracketed, with brackets
 * that grow to a full-size fraction rather than pinching it.
 */
const inLine = (a: Q): string => (a.n < 0 ? `\\left(${qTex(a)}\\right)` : qTex(a));

/** A power as it sits in an exponent: `-2`, `1/2`. */
export const nTex = (n: Q): string => (n.d === 1 ? `${n.n}` : `${n.n}/${n.d}`);

/** `a + bx` with the sign of `b` folded in. */
const insideTex = (a: number, b: Q, v = 'x', p = 1): string => `${a} ${signedMono(b, p, v)}`;

/**
 * `(a + bx)`. Sized brackets, so a fraction for `b` is not pinched by them in a
 * display, and an inline bracket is one piece a line cannot break inside.
 */
const bracketTex = (a: number, b: Q, v = 'x', p = 1): string => `\\left(${insideTex(a, b, v, p)}\\right)`;

/** `(a + bx)^n` as the learner reads it. */
export const binTex = (n: Q, b: Q, a = 1): string => `${bracketTex(a, b)}^{${nTex(n)}}`;

/** The same for mathjs. */
export const binSource = (n: Q, b: Q, a = 1): string => `(${a} + (${qAns(b)})*x)^(${qAns(n)})`;

/** A fraction as a choice option. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }];

const saltOf = (...qs: Q[]): number => mix(...qs.flatMap((c) => [c.n, c.d]));

/* ================================================================
 * Parameter pools
 * ================================================================ */

/** Powers a first question uses: whole negatives and halves. */
const N_EASY: Q[] = [q(-1), q(-2), q(-3), q(1, 2), q(-1, 2), q(3, 2), q(-3, 2)];

/** Thirds, quarters and the rest. */
const N_HARD: Q[] = [q(1, 3), q(-1, 3), q(2, 3), q(-2, 3), q(1, 4), q(-1, 4), q(5, 2), q(-5, 2), q(-4)];

const B_EASY: Q[] = [q(1), q(-1), q(2), q(-2)];
const B_HARD: Q[] = [q(3), q(-3), q(1, 2), q(-1, 2), q(2), q(-2)];

/** Denominators that stay readable on a phone. */
const tidy = (...cs: Q[]): boolean => cs.every((c) => c.d <= 2000 && Math.abs(c.n) <= 5000);

/* ================================================================
 * Lesson 1: deriving the series
 * ================================================================ */

interface NB {
  n: Q;
  b: Q;
}

function sampleNB(rng: Rng, difficulty: number): NB {
  return difficulty > 1 ? { n: rng.pick(N_HARD), b: rng.pick(B_HARD) } : { n: rng.pick(N_EASY), b: rng.pick(B_EASY) };
}

/** `f^(k)(0)` for `(1 + bx)^n`. */
const derivAt = (n: Q, b: Q, k: number): Q => mul(falling(n, k), pow(b, k));

/** Why each derivative comes out as it does. */
function derivSay({ n, b }: NB): string {
  const chain = eq(b, ONE) ? '' : ` and, by the chain rule, another factor of $${qTex(b)}$`;
  return `Each derivative of $${binTex(n, b)}$ brings the power down and lowers it by one${chain}. At $x = 0$ the bracket is $1$.`;
}

/** Table: f'(0), f''(0), f'''(0) and the coefficient each gives. */
const derivTable: Generator<NB> = {
  id: 'ser-binom-deriv-table',
  sample: sampleNB,
  render: ({ n, b }): Slide => {
    const ds = [1, 2, 3].map((k) => derivAt(n, b, k));
    const cs = [1, 2, 3].map((k) => coefOf(n, b, k));
    const slips = [...cs.map(neg), mul(ds[1], q(2)), div(ds[2], q(3)), falling(n, 2), falling(n, 3)];
    return {
      kind: 'table',
      prompt: [
        say('Fill in each derivative at $0$ and the coefficient it gives:'),
        { kind: 'display', tex: `f(x) = ${binTex(n, b)} \\qquad a_{k} = \\frac{f^{(k)}(0)}{k!}` },
      ],
      columns: ['k', 'f^{(k)}(0)', 'a_{k}'],
      rows: [1, 2, 3].map((k) => [`${k}`, null, null]),
      bank: qBank([ds[0], cs[0], ds[1], cs[1], ds[2], cs[2]], slips, 3),
      answer: [ds[0], cs[0], ds[1], cs[1], ds[2], cs[2]].map(qTex),
    };
  },
  solution: (p) => {
    const { n, b } = p;
    return [
      { text: derivSay(p) },
      ...[1, 2, 3].map((k) => ({
        tex: `${derivName(k)} = ${qTex(derivAt(n, b, k))} \\qquad a_{${k}} = ${qTex(derivAt(n, b, k))} \\div ${k}! = ${qTex(coefOf(n, b, k))}`,
      })),
    ];
  },
};

interface KthParams extends NB {
  k: number;
}

/** Expression: one derivative at 0. */
const kthDeriv: Generator<KthParams> = {
  id: 'ser-binom-kth-deriv',
  sample: (rng, difficulty) => {
    for (;;) {
      const { n, b } = sampleNB(rng, difficulty);
      const k = difficulty > 1 ? rng.pick([2, 3, 4]) : rng.pick([2, 3]);
      if (!tidy(derivAt(n, b, k))) continue;
      return { n, b, k };
    }
  },
  render: ({ n, b, k }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find $${derivName(k)}$ for $f(x) = ${binTex(n, b)}$.`)],
    lead: `${derivName(k)} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(derivAt(n, b, k)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const { n, b, k } = p;
    const factors = Array.from({ length: k }, (_, i) => `(${qTex(sub(n, q(i)))})`).join('');
    return [
      { text: derivSay(p) },
      { tex: `${derivName(k)} = ${factors}${eq(b, ONE) ? '' : ` \\times ${inLine(b)}^{${k}}`}` },
      { tex: `= ${qTex(derivAt(n, b, k))}` },
    ];
  },
  choices: ({ n, b, k }) =>
    qChoices(
      derivAt(n, b, k),
      [coefOf(n, b, k), mul(falling(n, k), b), falling(n, k), derivAt(n, b, k - 1)],
      saltOf(n, b, q(k)),
    ),
};

/** Tiles: the first four terms of the series. */
const termsTiles: Generator<NB> = {
  id: 'ser-binom-terms-tiles',
  sample: sampleNB,
  render: ({ n, b }): Slide => {
    const answer = [1, 2, 3].map((k) => signedMono(coefOf(n, b, k), k));
    const slips: string[] = [];
    for (const k of [1, 2, 3]) {
      const c = coefOf(n, b, k);
      for (const s of [neg(c), derivAt(n, b, k), mul(binom(n, k), b)]) {
        if (s.n !== 0) slips.push(signedMono(s, k));
      }
    }
    return {
      kind: 'tiles',
      prompt: [say('Complete the first four terms of the Maclaurin series of'), { kind: 'display', tex: `f(x) = ${binTex(n, b)}` }],
      template: 'f(x) = 1 {0} {1} {2} + \\cdots',
      bank: tokenBank(answer, slips.filter((s) => !answer.includes(s)), 4),
      answer,
    };
  },
  solution: (p) => {
    const { n, b } = p;
    return [
      { text: derivSay(p) },
      { tex: [1, 2, 3].map((k) => `a_{${k}} = ${qTex(derivAt(n, b, k))} \\div ${k}! = ${qTex(coefOf(n, b, k))}`).join(' \\qquad ') },
      { tex: `f(x) = 1 ${[1, 2, 3].map((k) => signedMono(coefOf(n, b, k), k)).join(' ')} + \\cdots` },
    ];
  },
};

/* ================================================================
 * Lesson 2: the radius
 * ================================================================ */

interface RadiusParams {
  n: Q;
  a: number;
  b: Q;
}

const radiusOf = ({ a, b }: RadiusParams): Q => div(q(a), abs(b));
const limitOf = ({ a, b }: RadiusParams): Q => div(abs(b), q(a));

/** Powers that are never a whole number at least 0, so the series never stops. */
const N_ANY: Q[] = [...N_EASY, ...N_HARD];

const B_RADIUS_EASY: Q[] = [q(2), q(-2), q(3), q(-3), q(4), q(-4), q(1, 2), q(-1, 2), q(1, 3), q(-1, 3)];

function sampleRadius(rng: Rng, difficulty: number): RadiusParams {
  if (difficulty <= 1) return { n: rng.pick(N_ANY), a: 1, b: rng.pick(B_RADIUS_EASY) };
  for (;;) {
    const a = rng.pick([2, 3, 4, 5, 9]);
    const b = q(rng.pick([1, 2, 3, 4, 5, 6]) * rng.pick([1, -1]));
    if (Math.abs(b.n) === a) continue;
    return { n: rng.pick(N_ANY), a, b };
  }
}

/** Why the radius is what it is. */
function radiusSteps(p: RadiusParams): SolutionStep[] {
  const { n, a, b } = p;
  const taken = a === 1 ? [] : [{ tex: `${binTex(n, b, a)} = ${a}^{${nTex(n)}}\\left(1 ${signedMono(div(b, q(a)), 1)}\\right)^{${nTex(n)}}` }];
  return [
    ...taken,
    { text: 'One coefficient over the one before is' },
    { tex: `\\left|\\frac{a_{k + 1}}{a_{k}}\\right| = \\left|\\frac{${qTex(n)} - k}{k + 1}\\right| \\times ${qTex(limitOf(p))}` },
    { text: `As $k \\to \\infty$ the fraction tends to $1$, so $L = ${qTex(limitOf(p))}$ and $R = ${qTex(radiusOf(p))}$.` },
  ];
}

/** Up to three distinct values, the right one first. */
function distinct(values: Q[], count = 3): Q[] {
  const out: Q[] = [];
  for (const v of values) {
    if (out.length === count) break;
    if (!out.some((o) => eq(o, v))) out.push(v);
  }
  return out;
}

const LIMIT_LABELS = ['$0$', '$1$', '$\\infty$'];

/** Flow: the fraction's limit, then L, then R. */
const ratioFlow: Generator<RadiusParams> = {
  id: 'ser-binom-ratio-flow',
  sample: sampleRadius,
  render: (p): Slide => {
    const { n, a, b } = p;
    const L = limitOf(p);
    const R = radiusOf(p);
    const salt = saltOf(n, b, q(a));
    const lValues = distinct([L, R, abs(b), ONE, q(a)]);
    const rValues = distinct([R, L, ONE, q(a), abs(b)]);
    const lLabels = lValues.map((v) => `$L = ${qTex(v)}$`);
    const rLabels = rValues.map((v) => `$R = ${qTex(v)}$`);
    return {
      kind: 'flow',
      prompt: [say('Find the radius of convergence of the binomial series of this function.')],
      subject: `\\displaystyle ${binTex(n, b, a)}`,
      steps: [
        {
          id: 'limit',
          // The power written with a slash: a fraction inside an inline fraction is too small to read.
          ask: `As $k \\to \\infty$, $\\left|\\frac{${nTex(n)} - k}{k + 1}\\right|$ tends to`,
          branches: [
            { label: LIMIT_LABELS[0], outcome: 'Then the series would converge for every $x$.' },
            { label: LIMIT_LABELS[1], to: 'L' },
            { label: LIMIT_LABELS[2], outcome: 'Then the series would converge only at $x = 0$.' },
          ],
        },
        {
          id: 'L',
          ask: 'So one term over the one before tends to $L|x|$, where',
          branches: turned(lLabels, salt).map((label) => ({ label, to: 'R' })),
        },
        {
          id: 'R',
          ask: 'So the radius of convergence is',
          branches: turned(rLabels, salt + 1).map((label, i) => ({
            label,
            outcome: `So the series converges for $|x| < ${qTex(turned(rValues, salt + 1)[i])}$.`,
          })),
        },
      ],
      answer: [LIMIT_LABELS[1], lLabels[0], rLabels[0]],
    };
  },
  solution: radiusSteps,
};

/** Expression: the radius, typed. */
const radiusTyped: Generator<RadiusParams> = {
  id: 'ser-binom-radius',
  sample: sampleRadius,
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say('Find the radius of convergence of the binomial series of'), { kind: 'display', tex: binTex(p.n, p.b, p.a) }],
    lead: 'R =',
    keypad: FRACTION_KEYS,
    answer: qAns(radiusOf(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: radiusSteps,
  choices: (p) => qChoices(radiusOf(p), [limitOf(p), q(p.a), div(ONE, abs(p.b)), abs(p.b), ONE], saltOf(p.n, p.b, q(p.a))),
};

interface SliderParams {
  n: Q;
  a: number;
  /** The bracket is `a - b x`, `b` positive, so it breaks at `x = a/b`. */
  b: number;
}

/** Slider: where the graph of (a - bx)^n breaks. */
const radiusSlider: Generator<SliderParams> = {
  id: 'ser-binom-radius-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const b = rng.pick(hard ? [2, 4] : [1, 2]);
      const a = rng.int(1, 11);
      const r = a / b;
      if (r < 0.5 || r > 2.75 || (r * 4) % 1 !== 0) continue;
      const n = rng.pick(hard ? [q(-3, 2), q(-1, 3), q(-2, 3), q(-3)] : [q(-1), q(-2), q(-1, 2), q(-3)]);
      return { n, a, b };
    }
  },
  render: ({ n, a, b }): Slide => {
    const f = (x: number) => (a - b * x) ** val(n);
    const top = 4 * a ** val(n);
    const svg = plotSvg({
      xMin: 0,
      xMax: 3,
      yMin: 0,
      yMax: top,
      grid: false,
      curves: [{ f, accent: true, breaks: true }],
      label: `The curve y = (${a} - ${b}x) to the power ${nTex(n)} for x from 0 to 3, shooting up where the bracket is 0`,
    });
    return {
      kind: 'slider',
      prompt: [
        say('Slide to the radius of convergence of the binomial series of'),
        { kind: 'display', tex: `y = ${binTex(n, q(-b), a)}` },
        say('The graph shows it for $x$ from $0$ to $3$.'),
      ],
      min: 0,
      max: 3,
      step: 0.25,
      answer: a / b,
      readout: 'R = {v}',
      figure: plotFigure(svg),
    };
  },
  solution: ({ n, a, b }) => [
    { text: `The bracket is $0$ at $x = \\frac{${a}}{${b}}$, where the function breaks. The series reaches only as far as that break:` },
    { tex: `R = \\frac{${a}}{${b}} = ${qTex(q(a, b))}` },
    { text: `The ratio test agrees: $L = \\frac{${b}}{${a}}$ for $${binTex(n, q(-b), a)}$.` },
  ],
};

/* ================================================================
 * Lesson 3: one coefficient from the last
 * ================================================================ */

/** The factor a_(k+1)/a_k for (1 + x)^n. */
const stepFactor = (n: Q, k: number): Q => div(sub(n, q(k)), q(k + 1));

/** The rule, with this n and b in it. */
const ruleTex = (n: Q, b: Q): string =>
  `a_{k + 1} = a_{k} \\times \\frac{${qTex(n)} - k}{k + 1}${eq(b, ONE) ? '' : ` \\times ${inLine(b)}`}`;

/** Table: a_1 to a_4 from a_0 = 1, by the rule. */
const recurTable: Generator<NB> = {
  id: 'ser-binom-recur-table',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = sampleNB(rng, difficulty);
      if (!tidy(coefOf(p.n, p.b, 4))) continue;
      return p;
    }
  },
  render: ({ n, b }): Slide => {
    const cs = [1, 2, 3, 4].map((k) => coefOf(n, b, k));
    const slips = [...cs.map(neg), ...[1, 2, 3].map((k) => mul(cs[k - 1], mul(div(sub(n, q(k)), q(k)), b)))];
    return {
      kind: 'table',
      prompt: [say(`Use this rule to fill in the coefficients of $${binTex(n, b)}$:`), { kind: 'display', tex: ruleTex(n, b) }],
      columns: ['k', 'a_{k}'],
      rows: [['0', '1'], ...[1, 2, 3, 4].map((k) => [`${k}`, null])],
      bank: qBank(cs, slips, 3),
      answer: cs.map(qTex),
    };
  },
  solution: ({ n, b }) => [
    { text: 'Start from $a_{0} = 1$ and apply the rule four times:' },
    ...[0, 1, 2, 3].map((k) => ({
      tex: `a_{${k + 1}} = ${inLine(coefOf(n, b, k))} \\times ${inLine(stepFactor(n, k))}${eq(b, ONE) ? '' : ` \\times ${inLine(b)}`} = ${qTex(coefOf(n, b, k + 1))}`,
    })),
  ],
};

/** Steps: one turn of the rule, a_k to a_(k+1). */
const recurSteps: Generator<KthParams> = {
  id: 'ser-binom-recur-steps',
  sample: (rng, difficulty) => {
    for (;;) {
      const { n, b } = sampleNB(rng, difficulty);
      const k = rng.pick([1, 2, 3]);
      if (!tidy(coefOf(n, b, k + 1))) continue;
      return { n, b, k };
    }
  },
  render: ({ n, b, k }): Slide => {
    const ak = coefOf(n, b, k);
    const f = stepFactor(n, k);
    const af = mul(ak, f);
    const next = mul(af, b);
    const reductions: Extract<Slide, { kind: 'steps' }>['reductions'] = [
      {
        span: [2, 3],
        value: qTex(f),
        bank: stepBank(qTex(f), qTex(div(add(n, q(k)), q(k + 1))), qTex(div(sub(n, q(k)), q(k))), qTex(stepFactor(n, k - 1)), qTex(sub(n, q(k)))),
      },
      {
        span: [0, 3],
        operator: 1,
        value: qTex(af),
        bank: stepBank(qTex(af), qTex(add(ak, f)), qTex(neg(af)), qTex(mul(af, q(2)))),
      },
    ];
    if (!eq(b, ONE)) {
      reductions.push({
        span: [0, 3],
        operator: 1,
        value: qTex(next),
        bank: stepBank(qTex(next), qTex(neg(next)), qTex(add(af, b)), qTex(mul(next, b))),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        say(`Given $a_{${k}} = ${qTex(ak)}$ in the series of $${binTex(n, b)}$, find $a_{${k + 1}}$: tap each piece and give its value.`),
      ],
      // `\dfrac`: set inline, a plain `\frac` holding a fraction shrinks its top to unreadable.
      start: [qTex(ak), '\\times', `\\dfrac{${qTex(n)} - ${k}}{${k + 1}}`, ...(eq(b, ONE) ? [] : ['\\times', inLine(b)])],
      reductions,
    };
  },
  solution: ({ n, b, k }) => [
    { tex: ruleTex(n, b) },
    { tex: `\\frac{${qTex(n)} - ${k}}{${k + 1}} = ${qTex(stepFactor(n, k))}` },
    {
      tex: `a_{${k + 1}} = ${inLine(coefOf(n, b, k))} \\times ${inLine(stepFactor(n, k))}${eq(b, ONE) ? '' : ` \\times ${inLine(b)}`} = ${qTex(coefOf(n, b, k + 1))}`,
    },
  ],
};

/** Expression: the coefficient of x^k, for k past the first few. */
const coefTyped: Generator<KthParams> = {
  id: 'ser-binom-coef',
  sample: (rng, difficulty) => {
    for (;;) {
      const { n, b } = sampleNB(rng, difficulty);
      const k = difficulty > 1 ? rng.pick([3, 4, 5]) : rng.pick([3, 4]);
      if (!tidy(coefOf(n, b, k), derivAt(n, b, k))) continue;
      return { n, b, k };
    }
  },
  render: ({ n, b, k }): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $x^{${k}}$ in the binomial series of $${binTex(n, b)}$.`)],
    lead: `a_{${k}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(coefOf(n, b, k)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ n, b, k }) => {
    const factors = Array.from({ length: k }, (_, i) => `(${qTex(sub(n, q(i)))})`).join('');
    return [
      { tex: `\\frac{${factors}}{${k}!} = ${qTex(binom(n, k))}` },
      ...(eq(b, ONE) ? [] : [{ text: `Then multiply by $${inLine(b)}^{${k}} = ${qTex(pow(b, k))}$:` }]),
      { tex: `a_{${k}} = ${qTex(coefOf(n, b, k))}` },
    ];
  },
  choices: ({ n, b, k }) =>
    qChoices(coefOf(n, b, k), [neg(coefOf(n, b, k)), mul(binom(n, k), b), binom(n, k), derivAt(n, b, k)], saltOf(n, b, q(k))),
};

/* ================================================================
 * Lesson 4: integrating to arctan and arcsin
 * ================================================================ */

interface IntParams {
  n: Q;
  c: Q;
}

/** The coefficient of x^(2k+1) in the integral from 0 to x of (1 + c t^2)^n. */
const intCoef = ({ n, c }: IntParams, k: number): Q => div(coefOf(n, c, k), q(2 * k + 1));

export const integrandTex = ({ n, c }: IntParams): string => `\\int_{0}^{x} ${bracketTex(1, c, 't', 2)}^{${nTex(n)}}\\,dt`;

/** Tiles: the first three terms of the integral. */
const intTiles: Generator<IntParams> = {
  id: 'ser-binom-int-tiles',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { n: rng.pick([q(-1, 2), q(1, 2), q(-3, 2), q(-1, 3), q(2, 3), q(-3)]), c: rng.pick([q(2), q(-2), q(3), q(-3), q(1, 2), q(-1, 2), q(4), q(-4)]) }
      : { n: rng.pick([q(-1), q(-1, 2), q(1, 2), q(-2)]), c: rng.pick([q(1), q(-1), q(2), q(-2), q(3), q(-3), q(4)]) },
  render: (p): Slide => {
    const answer = [1, 2].map((k) => signedMono(intCoef(p, k), 2 * k + 1));
    const slips: string[] = [];
    for (const k of [1, 2]) {
      const c = intCoef(p, k);
      for (const [s, power] of [
        [neg(c), 2 * k + 1],
        [coefOf(p.n, p.c, k), 2 * k + 1],
        [c, 2 * k],
        [div(coefOf(p.n, p.c, k), q(2 * k)), 2 * k + 1],
      ] as [Q, number][]) {
        if (s.n !== 0) slips.push(signedMono(s, power));
      }
    }
    return {
      kind: 'tiles',
      prompt: [say('Expand the bracket, then integrate term by term. Complete the first three terms of'), { kind: 'display', tex: integrandTex(p) }],
      template: 'x {0} {1} + \\cdots',
      bank: tokenBank(answer, slips.filter((s) => !answer.includes(s)), 4),
      answer,
    };
  },
  solution: (p) => [
    { tex: `${bracketTex(1, p.c, 't', 2)}^{${nTex(p.n)}} = 1 ${[1, 2].map((k) => signedMono(coefOf(p.n, p.c, k), 2 * k, 't')).join(' ')} + \\cdots` },
    { text: 'Each power integrates from $0$ to $x$ as' },
    { tex: '\\int_{0}^{x} t^{2k}\\,dt = \\frac{x^{2k + 1}}{2k + 1}' },
    { tex: `x ${[1, 2].map((k) => signedMono(intCoef(p, k), 2 * k + 1)).join(' ')} + \\cdots` },
  ],
};

type Arc = 'atan' | 'asin' | 'ln';

interface ArcParams {
  fn: 'atan' | 'asin';
  b: Q;
  k: number;
}

/** `\arctan(2x)`, `\arcsin x`, `\ln(1 - 3x)`. */
export function arcTex(fn: Arc, b: Q): string {
  if (fn === 'ln') return `\\ln${bracketTex(1, b)}`;
  const name = fn === 'atan' ? '\\arctan' : '\\arcsin';
  return eq(b, ONE) ? `${name} x` : `${name}(${monoTex(b, 1)})`;
}

export const arcSource = (fn: Arc, b: Q): string =>
  fn === 'ln' ? `log(1 + (${qAns(b)})*x)` : `${fn}((${qAns(b)})*x)`;

/** The series under each: `(1 + t^2)^-1` for arctan, `(1 - t^2)^-1/2` for arcsin. */
const UNDER: Record<'atan' | 'asin', IntParams> = { atan: { n: q(-1), c: q(1) }, asin: { n: q(-1, 2), c: q(-1) } };

/** The coefficient of x^(2k+1) in arctan(bx) or arcsin(bx). */
const arcCoefOf = ({ fn, b, k }: ArcParams): Q => mul(intCoef(UNDER[fn], k), pow(b, 2 * k + 1));

/** Expression: one coefficient of arctan(bx) or arcsin(bx). */
const arcCoef: Generator<ArcParams> = {
  id: 'ser-binom-arc-coef',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn: Arc = difficulty > 1 ? rng.pick<ArcParams['fn']>(['asin', 'asin', 'atan']) : 'atan';
      const b = rng.pick([q(1), q(-1), q(2), q(-2), q(3), q(1, 2), q(-1, 2), q(1, 3), q(-3)]);
      const k = rng.pick([1, 2, 3]);
      const p = { fn, b, k };
      if (!tidy(arcCoefOf(p))) continue;
      return p;
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $x^{${2 * p.k + 1}}$ in the Maclaurin series of $${arcTex(p.fn, p.b)}$.`)],
    lead: `a_{${2 * p.k + 1}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(arcCoefOf(p)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const { fn, b, k } = p;
    const under = UNDER[fn];
    const unit = intCoef(under, k);
    return [
      { text: `The $t^{${2 * k}}$ term of $${bracketTex(1, under.c, 't', 2)}^{${nTex(under.n)}}$ has coefficient $${qTex(coefOf(under.n, under.c, k))}$, which integrates to` },
      { tex: `${arcTex(fn, ONE)} = \\cdots ${signedMono(unit, 2 * k + 1)} + \\cdots` },
      ...(eq(b, ONE)
        ? []
        : [
            { text: `Put $${monoTex(b, 1)}$ in place of $x$:` },
            { tex: `${qTex(unit)} \\times ${inLine(b)}^{${2 * k + 1}} = ${qTex(arcCoefOf(p))}` },
          ]),
    ];
  },
  choices: (p) => {
    const under = UNDER[p.fn];
    const unit = intCoef(under, p.k);
    return qChoices(
      arcCoefOf(p),
      [mul(unit, p.b), mul(coefOf(under.n, under.c, p.k), pow(p.b, 2 * p.k + 1)), neg(arcCoefOf(p)), mul(unit, pow(p.b, 2 * p.k))],
      saltOf(p.b, q(p.k), q(p.fn.length)),
    );
  },
};

/** An integral from 0 to x of a fraction, written so a phone can read it. */
function integralTex(top: Q, bottom: string, root = false): string {
  const under = root ? `\\sqrt{${bottom}}` : bottom;
  const size = abs(top);
  return `\\int_{0}^{x} ${top.n < 0 ? '-' : ''}\\frac{${qTex(size)}}{${under}}\\,dt`;
}

/** `1 + b t` or `1 + b^2 t^2`, with the sign given. */
const lin = (sign: 1 | -1, coef: Q, p: number): string => `1 ${signedMono(mul(coef, q(sign)), p, 't')}`;

interface WhichParams {
  fn: Arc;
  b: Q;
}

/** Every integral offered, the right one first. */
function whichOptions({ fn, b }: WhichParams): ChoiceOption[] {
  const b2 = mul(b, b);
  const right =
    fn === 'atan'
      ? integralTex(b, lin(1, b2, 2))
      : fn === 'asin'
        ? integralTex(b, lin(-1, b2, 2), true)
        : integralTex(b, lin(1, b, 1));
  const pool = [
    integralTex(b, lin(1, b2, 2)),
    integralTex(b, lin(-1, b2, 2), true),
    integralTex(b, lin(1, b, 1)),
    integralTex(ONE, fn === 'asin' ? lin(-1, b2, 2) : fn === 'atan' ? lin(1, b2, 2) : lin(1, b, 1), fn === 'asin'),
    integralTex(b, fn === 'ln' ? lin(1, b2, 2) : lin(1, b, 2), fn === 'asin'),
    integralTex(b, lin(fn === 'asin' ? 1 : -1, b2, 2), fn === 'asin'),
    integralTex(b, lin(-1, b2, 2)),
  ];
  const kept = pool.filter((tex, i) => tex !== right && pool.indexOf(tex) === i);
  return steered(
    options({ tex: right }, ...kept.slice(0, 3).map((tex) => ({ tex }))),
    mix(b.n, b.d, fn.length, fn.charCodeAt(1)),
    kept.slice(3).map((tex) => ({ tex })),
  );
}

/** Choice: which integral a function is. */
const whichInt: Generator<WhichParams> = {
  id: 'ser-binom-which-int',
  sample: (rng) => ({
    fn: rng.pick<Arc>(['atan', 'asin', 'ln']),
    b: q(rng.pick([1, -1, 2, -2, 3, -3, 4, -4, 5])),
  }),
  render: (p): Slide => choiceSlide([say(`Which integral is $${arcTex(p.fn, p.b)}$?`)], whichOptions(p)),
  solution: ({ fn, b }) => {
    const rule =
      fn === 'atan'
        ? '\\frac{d}{dx}\\arctan x = \\frac{1}{1 + x^{2}}'
        : fn === 'asin'
          ? '\\frac{d}{dx}\\arcsin x = \\frac{1}{\\sqrt{1 - x^{2}}}'
          : '\\frac{d}{dx}\\ln(1 + x) = \\frac{1}{1 + x}';
    return [
      { tex: rule },
      { text: `With $${monoTex(b, 1)}$ inside, the chain rule puts $${qTex(b)}$ on top${fn === 'ln' ? '' : ` and $${qTex(mul(b, b))}$ with the $t^{2}$`}. The function is $0$ at $x = 0$, so it is the integral from $0$:` },
      { tex: whichOptions({ fn, b })[0].tex },
    ];
  },
};

/* ================================================================
 * Lesson 5: products
 * ================================================================ */

type Partner = 'exp' | 'geo' | 'ln';

interface ProductParams extends NB {
  partner: Partner;
  c: number;
}

/** The coefficient of x^j in the partner series. */
function partnerCoef(partner: Partner, c: number, j: number): Q {
  const cq = q(c);
  if (partner === 'exp') return div(pow(cq, j), q(fact(j)));
  if (partner === 'geo') return pow(cq, j);
  if (j === 0) return q(0);
  return div(mul(pow(cq, j), q(j % 2 === 1 ? 1 : -1)), q(j));
}

export function partnerTex(partner: Partner, c: number): string {
  if (partner === 'exp') return c === 1 ? 'e^{x}' : `e^{${monoTex(q(c), 1)}}`;
  if (partner === 'geo') return `\\frac{1}{${insideTex(1, q(-c))}}`;
  return `\\ln${bracketTex(1, q(c))}`;
}

export const partnerSource = (partner: Partner, c: number): string =>
  partner === 'exp' ? `exp((${c})*x)` : partner === 'geo' ? `1/(1 - (${c})*x)` : `log(1 + (${c})*x)`;

/** The pairs making x^j: partner's x^i times the binomial's x^(j - i). */
const pairs = ({ n, b, partner, c }: ProductParams, j: number): Q[] =>
  Array.from({ length: j + 1 }, (_, i) => mul(partnerCoef(partner, c, i), coefOf(n, b, j - i)));

const productCoefOf = (p: ProductParams, j: number): Q => pairs(p, j).reduce(add, q(0));

function sampleProduct(rng: Rng, difficulty: number, j: number): ProductParams {
  for (;;) {
    const hard = difficulty > 1;
    const { n, b } = sampleNB(rng, difficulty);
    const partner = rng.pick<Partner>(hard ? ['exp', 'geo', 'ln'] : ['exp', 'geo']);
    const c = rng.pick(hard ? [1, -1, 2, -2, 3] : [1, 2, -1, -2]);
    const p = { n, b, partner, c };
    const total = productCoefOf(p, j);
    if (total.n === 0 || !tidy(total, ...pairs(p, j))) continue;
    return p;
  }
}

const productTex = (p: ProductParams): string => `${partnerTex(p.partner, p.c)}${binTex(p.n, p.b)}`;

/** Tree: the three pairs that make x^2, then their sum. */
const pairsTree: Generator<ProductParams> = {
  id: 'ser-binom-pairs-tree',
  sample: (rng, difficulty) => sampleProduct(rng, difficulty, 2),
  render: (p): Slide => {
    const parts = pairs(p, 2);
    const total = productCoefOf(p, 2);
    const slips = [...parts.map(neg), neg(total), mul(partnerCoef(p.partner, p.c, 2), coefOf(p.n, p.b, 2)), add(parts[0], parts[2])];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Find the coefficient of $x^{2}$ in the product below. Write $p_{i}$ for the coefficient of $x^{i}$ in the first factor and $a_{i}$ in the second. Fill in the three pairs on the top row, each as a number, and their sum underneath.',
        ),
        { kind: 'display', tex: productTex(p) },
      ],
      expression: 'p_{0}a_{2} + p_{1}a_{1} + p_{2}a_{0}',
      nodes: [
        { id: 't0', from: [] },
        { id: 't1', from: [] },
        { id: 't2', from: [] },
        { id: 'sum', from: ['t0', 't1', 't2'] },
      ],
      bank: qBank([...parts, total], slips, 3),
      answer: [...parts, total].map(qTex),
    };
  },
  solution: (p) => productSolution(p, 2),
};

function productSolution(p: ProductParams, j: number): SolutionStep[] {
  const ps = Array.from({ length: j + 1 }, (_, i) => partnerCoef(p.partner, p.c, i));
  const as = Array.from({ length: j + 1 }, (_, i) => coefOf(p.n, p.b, i));
  return [
    { text: `The first coefficients of $${partnerTex(p.partner, p.c)}$ and of $${binTex(p.n, p.b)}$:` },
    { tex: `p: \\; ${ps.map(qTex).join(', \\; ')} \\qquad a: \\; ${as.map(qTex).join(', \\; ')}` },
    { text: `Pair each $x^{i}$ with $x^{${j} - i}$ and add:` },
    { tex: `${ps.map((pc, i) => `${inLine(pc)} \\times ${inLine(as[j - i])}`).join(' + ')} = ${qTex(productCoefOf(p, j))}` },
  ];
}

interface ProductCoefParams extends ProductParams {
  j: number;
}

/** Expression: the coefficient of x^2 or x^3 in the product. */
const productCoef: Generator<ProductCoefParams> = {
  id: 'ser-binom-product-coef',
  sample: (rng, difficulty) => {
    const j = difficulty > 1 ? 3 : 2;
    return { ...sampleProduct(rng, difficulty, j), j };
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [say(`Find the coefficient of $x^{${p.j}}$ in the Maclaurin series of`), { kind: 'display', tex: productTex(p) }],
    lead: `a_{${p.j}} =`,
    keypad: FRACTION_KEYS,
    answer: qAns(productCoefOf(p, p.j)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => productSolution(p, p.j),
  choices: (p) => {
    const parts = pairs(p, p.j);
    return qChoices(
      productCoefOf(p, p.j),
      [add(parts[0], parts[p.j]), mul(partnerCoef(p.partner, p.c, p.j), coefOf(p.n, p.b, p.j)), neg(productCoefOf(p, p.j)), sub(productCoefOf(p, p.j), parts[1])],
      saltOf(p.n, p.b, q(p.c), q(p.j), q(p.partner.length)),
    );
  },
};

type ValidPartner = 'exp' | 'geo' | 'pow';

interface ValidParams extends NB {
  partner: ValidPartner;
  c: number;
  /** The second bracket's power, for `pow`. */
  m: Q;
}

const validPartnerTex = ({ partner, c, m }: ValidParams): string =>
  partner === 'pow' ? binTex(m, q(c)) : partnerTex(partner, c);

/** The radius of the partner, or null for every x. */
const partnerRadius = ({ partner, c }: ValidParams): Q | null => (partner === 'exp' ? null : q(1, Math.abs(c)));

const rangeLabel = (r: Q | null): string => (r === null ? 'every $x$' : `$|x| < ${qTex(r)}$`);

/** Flow: where each series holds, then where the product does. */
const validFlow: Generator<ValidParams> = {
  id: 'ser-binom-valid-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const n = rng.pick(N_ANY);
      const b = rng.pick(hard ? [q(3), q(-3), q(2), q(-2), q(1, 2), q(-1, 2), q(4)] : [q(2), q(-2), q(3), q(-3), q(4)]);
      const partner = rng.pick<ValidPartner>(hard ? ['geo', 'pow', 'exp'] : ['exp', 'geo']);
      const c = rng.pick([1, -1, 2, -2, 3, -3, 4, 5, -5]);
      const m = rng.pick([q(-1), q(1, 2), q(-1, 2), q(-2)]);
      if (partner !== 'exp' && Math.abs(c) === Math.abs(b.n / b.d)) continue;
      if (partner !== 'exp' && Math.abs(c) === b.d && Math.abs(b.n) === 1) continue;
      return { n, b, partner, c, m };
    }
  },
  render: (p): Slide => {
    const r1 = div(ONE, abs(p.b));
    const r2 = partnerRadius(p);
    const both = r2 === null || val(r1) < val(r2) ? r1 : r2;
    const salt = saltOf(p.n, p.b, q(p.c), p.m);
    const oneValues = distinct([r1, abs(p.b), ONE, q(2)]);
    const twoLabels =
      r2 === null
        ? ['every $x$', ...distinct([q(Math.abs(p.c)), q(1, Math.abs(p.c)), ONE, q(2)], 2).map(rangeLabel)]
        : distinct([r2, q(Math.abs(p.c)), ONE, q(2)]).map(rangeLabel);
    const other = r2 === null ? null : val(r1) < val(r2) ? r2 : r1;
    const bothValues: (Q | null)[] = [both, other, ...distinct([mul(both, q(2)), div(both, q(2))], 2)].filter(
      (v, i, all) => all.findIndex((w) => (w === null ? v === null : v !== null && eq(v, w))) === i,
    );
    const bothLabels = bothValues.slice(0, 3).map(rangeLabel);
    return {
      kind: 'flow',
      prompt: [say('Find where the Maclaurin series of this product is valid.')],
      subject: `\\displaystyle ${validPartnerTex(p)}${binTex(p.n, p.b)}`,
      steps: [
        {
          id: 'one',
          ask: `The series of $${binTex(p.n, p.b)}$ is valid for`,
          branches: turned(oneValues.map(rangeLabel), salt).map((label) => ({ label, to: 'two' })),
        },
        {
          id: 'two',
          ask: `The series of $${validPartnerTex(p)}$ is valid for`,
          branches: turned(twoLabels, salt + 1).map((label) => ({ label, to: 'both' })),
        },
        {
          id: 'both',
          ask: 'So the product of the two series is valid for',
          branches: turned(bothLabels, salt + 2).map((label) => ({ label, outcome: `The product's series holds for ${label}.` })),
        },
      ],
      answer: [rangeLabel(r1), rangeLabel(r2), rangeLabel(both)],
    };
  },
  solution: (p) => {
    const r1 = div(ONE, abs(p.b));
    const r2 = partnerRadius(p);
    const both = r2 === null || val(r1) < val(r2) ? r1 : r2;
    return [
      { text: `$${binTex(p.n, p.b)}$ holds for $|${monoTex(p.b, 1)}| < 1$, which is ${rangeLabel(r1)}.` },
      { text: `$${validPartnerTex(p)}$ holds for ${rangeLabel(r2)}.` },
      { text: `Both must hold, so the product's series is valid for ${rangeLabel(both)}.` },
    ];
  },
};

/** The generators by name, for `seriesBinomial.test.ts`. */
export const binomialSeriesByName = {
  derivTable,
  kthDeriv,
  termsTiles,
  ratioFlow,
  radiusTyped,
  radiusSlider,
  recurTable,
  recurSteps,
  coefTyped,
  intTiles,
  arcCoef,
  whichInt,
  pairsTree,
  productCoef,
  validFlow,
};

export const seriesBinomialGenerators = Object.values(binomialSeriesByName) as Generator<never>[];
