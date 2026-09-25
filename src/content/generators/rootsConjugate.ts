/**
 * Polynomials level 10: complex conjugate roots.
 *
 * A polynomial with real coefficients that has a non-real root a + bi also
 * has its conjugate a - bi, and the pair multiply to the real quadratic
 * factor x^2 - 2ax + (a^2 + b^2): the sum of the pair is 2a and the product
 * a^2 + b^2. That factor and the sums of the roots from level 4 (and the
 * quartic sums of level 8) are all this level needs: the real root of a
 * cubic, the other quadratic factor of a quartic, unknown coefficients, and
 * how many real roots a real polynomial can have.
 *
 * The Complex Numbers course already teaches i, the conjugate and quadratics
 * with complex roots, so nothing here re-teaches them; these generators start
 * from a root already written as a + bi.
 *
 * Everything is built outward: the complex roots have whole real and
 * imaginary parts, b never 0, the real roots are whole, and each polynomial
 * is the product of its factors, so every coefficient and every answer is
 * whole by construction. `rootsConjugate.test.ts` checks the answers again
 * with complex arithmetic, from the roots rather than from the coefficients.
 *
 * As everywhere in Polynomials, the learner never types a polynomial: a
 * factor or a cubic is built from tiles or picked, and only numbers are typed.
 */
import type { ChoiceOption, Generator, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { complexAnswer, complexTex, say } from './format';
import {
  chain,
  factor,
  fillBank,
  fits,
  intOptions,
  mulPoly,
  nonZero,
  numberBank,
  overLead,
  polyAnswer,
  polyTex,
  choiceSlide,
  sampleLead,
  signedNum,
  signedTerm,
  turned,
  type Poly,
} from './polynomials';

/* ---------- shared pieces ---------- */

/** A non-real root a + bi, with b never 0. */
interface Root {
  a: number;
  b: number;
}

const zOf = ({ a, b }: Root): string => complexTex(a, b);
const barOf = ({ a, b }: Root): string => complexTex(a, -b);
const sumOf = ({ a }: Root): number => 2 * a;
const prodOf = ({ a, b }: Root): number => a * a + b * b;

/** x^2 - 2ax + (a^2 + b^2), the real quadratic the pair a ± bi multiply to. */
const pairQuad = (z: Root): Poly => [1, -sumOf(z), prodOf(z)];

/** A root with |a| up to `maxA` (0 allowed unless `aNonZero`) and |b| from 1 to `maxB`. */
function sampleRoot(rng: Rng, maxA: number, maxB: number, aNonZero = false): Root {
  const a = aNonZero ? nonZero(rng, maxA) : rng.int(-maxA, maxA);
  return { a, b: nonZero(rng, maxB) };
}

/** Two roots that are not the same conjugate pair. */
const samePair = (z: Root, w: Root): boolean => z.a === w.a && Math.abs(z.b) === Math.abs(w.b);

/** A leading coefficient in front of a bracket: 1 left off, -1 a bare minus. */
const leadMark = (lead: number): string => (lead === 1 ? '' : lead === -1 ? '-' : String(lead));

/**
 * Minus a coefficient, worked: -(-5) = 5 shows the step, while minus a
 * positive 7 is just -7.
 */
const minusOf = (c: number): string => (c < 0 ? `-(${c}) = ${-c}` : `${-c}`);

/** c/a with the sign an identity gives it, worked, for a lead of any size. */
function identityValue(c: number, lead: number, minus: boolean): string {
  const value = ((minus ? -1 : 1) * c) / lead;
  if (lead === 1) return minus ? minusOf(c) : String(c);
  return `${overLead(c, lead, minus)} = ${value}`;
}

/** A number in a line of working, bracketed when negative. */
const f = (n: number): string => factor(String(n));

/** The sum and the product of a conjugate pair, worked out with its own numbers. */
function pairSteps(z: Root): string {
  return chain(
    `z + \\overline{z} &= 2 \\times ${f(z.a)} = ${sumOf(z)}`,
    `z\\overline{z} &= ${f(z.a)}^{2} + ${f(z.b)}^{2} = ${prodOf(z)}`,
  );
}

/** A polynomial written with x^2 rather than x^{2}, for a tiles template. */
const templateTex = (p: Poly): string => polyTex(p).replace(/\^\{(\d+)\}/g, '^$1');

const polyOption = (p: Poly): Omit<ChoiceOption, 'correct'> => ({ tex: polyTex(p), answer: polyAnswer(p) });

const PAIR_RULE = 'x^{2} - (z + \\overline{z})x + z\\overline{z}';

/* ================================================================
 * Lesson 1: conjugate pairs
 * ================================================================ */

/** Tap the partner of a given non-real root on the Argand grid. */
const conjPartnerPlot: Generator<Root> = {
  id: 'poly-conj-partner-plot',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleRoot(rng, 4, 4) : sampleRoot(rng, 3, 3)),
  render: (z): Slide => ({
    kind: 'plot',
    prompt: [say(`A polynomial with real coefficients has $z = ${zOf(z)}$ as a root. Tap the other root that $z$ tells you it must have.`)],
    range: 4,
    answer: { re: z.a, im: -z.b },
  }),
  solution: (z) => [
    { text: 'Real coefficients mean the non-real roots come in conjugate pairs. The conjugate keeps the real part and flips the sign of the imaginary part.' },
    { tex: `\\overline{${zOf(z)}} = ${barOf(z)}` },
    { text: `On the grid that is $z$ reflected in the real axis, the point $(${z.a}, ${-z.b})$.` },
  ],
};

interface PairAskParams extends Root {
  ask: number;
}

const PAIR_LABELS = ['z + \\overline{z}', 'z\\overline{z}'];

/** The sum or the product of a root and its conjugate. */
const conjPairSum: Generator<PairAskParams> = {
  id: 'poly-conj-pair-sum',
  sample: (rng, difficulty) => ({
    ...(difficulty > 1 ? sampleRoot(rng, 6, 6, true) : sampleRoot(rng, 3, 3)),
    ask: rng.int(0, 1),
  }),
  choices: ({ a, b, ask }) => {
    const z = { a, b };
    return ask === 0
      ? intOptions(sumOf(z), [a, -sumOf(z), 2 * b, sumOf(z) + 2 * b])
      : intOptions(prodOf(z), [a * a - b * b, a + b, -prodOf(z), a * a + b]);
  },
  render: ({ a, b, ask }): Slide => ({
    kind: 'expression',
    prompt: [
      say(
        `$z = ${complexTex(a, b)}$ is a root of a polynomial with real coefficients, so $\\overline{z}$ is a root too. Find the ${ask === 0 ? 'sum' : 'product'} of the pair.`,
      ),
    ],
    lead: `${PAIR_LABELS[ask]} =`,
    keypad: [],
    answer: String(ask === 0 ? 2 * a : a * a + b * b),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ a, b, ask }) => {
    const z = { a, b };
    return ask === 0
      ? [
          { text: 'The imaginary parts cancel, leaving twice the real part:' },
          { tex: `(${zOf(z)}) + (${barOf(z)}) = ${sumOf(z)}` },
        ]
      : [
          { text: 'Multiplying a pair: $(a + bi)(a - bi) = a^{2} - b^{2}i^{2} = a^{2} + b^{2}$, since $i^{2} = -1$.' },
          { tex: `z\\overline{z} = ${f(a)}^{2} + ${f(b)}^{2} = ${prodOf(z)}` },
        ];
  },
};

/** The sum, the two squares and the product that make the quadratic factor. */
const conjFactorTree: Generator<Root> = {
  id: 'poly-conj-factor-tree',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleRoot(rng, 6, 6) : sampleRoot(rng, 3, 3)),
  render: (z): Slide => {
    const values = [sumOf(z), z.a * z.a, z.b * z.b, prodOf(z)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$z = ${zOf(z)}$ is a root, so $\\overline{z}$ is too. Top row: $z + \\overline{z}$, then the real part squared and the imaginary part squared. Underneath: $z\\overline{z}$, their sum.`,
        ),
      ],
      expression: PAIR_RULE,
      nodes: [
        { id: 's', from: [] },
        { id: 'a2', from: [] },
        { id: 'b2', from: [] },
        { id: 'p', from: ['a2', 'b2'] },
      ],
      bank: numberBank(values, [-sumOf(z), z.a, 2 * z.b, z.a * z.a - z.b * z.b, -prodOf(z)], String, 2),
      answer: values.map(String),
    };
  },
  solution: (z) => [
    { tex: pairSteps(z) },
    { text: 'So the quadratic factor the pair gives is' },
    { tex: polyTex(pairQuad(z)) },
  ],
};

/** The real quadratic factor x^2 - 2ax + (a^2 + b^2), from one root. */
const conjQuadFactorTiles: Generator<Root> = {
  id: 'poly-conj-quad-factor-tiles',
  sample: (rng, difficulty) => (difficulty > 1 ? sampleRoot(rng, 5, 5, true) : sampleRoot(rng, 3, 3, true)),
  choices: (z) => {
    const q = pairQuad(z);
    return options(
      polyOption(q),
      polyOption([1, sumOf(z), prodOf(z)]),
      polyOption([1, -sumOf(z), z.a * z.a - z.b * z.b]),
      polyOption([1, -z.a, prodOf(z)]),
    );
  },
  render: (z): Slide => {
    const s = sumOf(z);
    const m = prodOf(z);
    const answer = [signedTerm(-s, 1), signedNum(m)];
    const diff = z.a * z.a - z.b * z.b;
    return {
      kind: 'tiles',
      prompt: [say(`$${zOf(z)}$ is a root of a polynomial with real coefficients. Find the real quadratic factor it gives with its conjugate.`)],
      template: 'x^2 {0} {1}',
      bank: fillBank(answer, [signedTerm(s, 1), signedTerm(-z.a, 1), signedNum(-m), ...(diff === 0 ? [] : [signedNum(diff)])]),
      answer,
    };
  },
  solution: (z) => [
    { text: `The pair is $${zOf(z)}$ and $${barOf(z)}$.` },
    { tex: pairSteps(z) },
    { text: 'Minus the sum in front of $x$, the product at the end:' },
    { tex: polyTex(pairQuad(z)) },
  ],
};

/* ================================================================
 * Lesson 2: a cubic with a complex root
 * ================================================================ */

interface CubicParams extends Root {
  /** The real root. */
  r: number;
  lead: number;
}

const cubicOf = ({ a, b, r, lead }: CubicParams): Poly => mulPoly(pairQuad({ a, b }).map((c) => c * lead), [1, -r]);

function sampleCubic(rng: Rng, difficulty: number, aNonZero: boolean, useLead: boolean): CubicParams {
  for (;;) {
    const hard = difficulty > 1;
    const z = hard ? sampleRoot(rng, 4, 4, aNonZero) : sampleRoot(rng, 3, 3, aNonZero);
    const r = nonZero(rng, hard ? 6 : 5);
    const lead = useLead ? sampleLead(rng, hard) : 1;
    const params = { ...z, r, lead };
    if (!fits(cubicOf(params), hard ? 90 : 60)) continue;
    return params;
  }
}

/** Σα for the cubic, worked from its coefficients, then the real root. */
function realRootSteps(params: CubicParams): string {
  const p = cubicOf(params);
  const s = sumOf(params);
  const total = s + params.r;
  return chain(
    `\\Sigma\\alpha &= ${identityValue(p[1], p[0], true)}`,
    `${s} + \\gamma &= ${total}`,
    `\\gamma &= ${params.r}`,
  );
}

/** The real root of a real cubic, one of whose roots is given. */
const conjCubicRealRoot: Generator<CubicParams> = {
  id: 'poly-conj-cubic-real-root',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty, false, true),
  choices: (params) => {
    const s = sumOf(params);
    return intOptions(params.r, [-params.r, params.r + 2 * s, params.r + s, -(params.r + s)]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say(`$${zOf(params)}$ is a root of $${polyTex(cubicOf(params))} = 0$. Find its real root, $\\gamma$.`)],
    lead: '\\gamma =',
    keypad: [],
    answer: String(params.r),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const p = cubicOf(params);
    return [
      { text: `The coefficients are real, so $${barOf(params)}$ is a root too, and the pair adds to $2 \\times ${f(params.a)} = ${sumOf(params)}$.` },
      { text: 'The sum of all three roots is $-\\frac{b}{a}$:' },
      { tex: realRootSteps(params) },
      {
        text: `Check with the product: the pair multiplies to $${prodOf(params)}$, and $${prodOf(params)} \\times ${f(params.r)} = ${prodOf(params) * params.r}$, which is $-\\frac{d}{a}$ with $d = ${p[3]}$${p[0] === 1 ? '' : ` and $a = ${p[0]}$`}.`,
      },
    ];
  },
};

/** Partner, quadratic factor, real root: the cubic taken apart one fork at a time. */
const conjCubicFlow: Generator<CubicParams> = {
  id: 'poly-conj-cubic-flow',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty, true, true),
  render: (params): Slide => {
    const z = { a: params.a, b: params.b };
    const p = cubicOf(params);
    const key = polyTex(p);
    const q = pairQuad(z);
    const partner = [
      { label: `$${barOf(z)}$`, to: 'factor' },
      { label: `$${complexTex(-z.a, -z.b)}$`, outcome: 'That is $-z$. The conjugate keeps the real part and flips only the sign of the imaginary part.' },
      { label: `$${complexTex(-z.a, z.b)}$`, outcome: 'That flips the real part. The conjugate keeps the real part and flips the sign of the imaginary part.' },
    ];
    const quads = [
      { label: `$${polyTex(q)}$`, to: 'root' },
      { label: `$${polyTex([1, sumOf(z), prodOf(z)])}$`, outcome: 'The $x$ term is minus the sum of the pair, not plus.' },
      {
        label: `$${polyTex([1, -sumOf(z), z.a * z.a - z.b * z.b])}$`,
        outcome: 'The product of the pair is $a^{2} + b^{2}$: $i^{2} = -1$ turns the minus into a plus.',
      },
    ];
    const r = params.r;
    const slips = [...new Set([-r, r + sumOf(z)])].filter((v) => v !== r);
    const roots = [
      { label: `$${r}$`, outcome: `Right: $p(x) = ${leadMark(params.lead)}(${polyTex(q)})(x ${signedNum(-r)})$.` },
      ...slips.map((v) => ({
        label: `$${v}$`,
        outcome: `The three roots add to $${identityValue(p[1], p[0], true)}$, and the pair gives $${sumOf(z)}$ of that.`,
      })),
    ];
    return {
      kind: 'flow',
      prompt: [say(`This cubic has real coefficients and a root $z = ${zOf(z)}$. Each answer chooses what gets asked next.`)],
      subject: `${key} = 0`,
      steps: [
        { id: 'partner', ask: 'Which other root must it have?', branches: turned(partner, `${key}|1`) },
        { id: 'factor', ask: 'So which quadratic is a factor?', branches: turned(quads, `${key}|2`) },
        { id: 'root', ask: 'What is the real root?', branches: turned(roots, `${key}|3`) },
      ],
      answer: [`$${barOf(z)}$`, `$${polyTex(q)}$`, `$${r}$`],
    };
  },
  solution: (params) => [
    { text: `Real coefficients: $${barOf(params)}$ is a root as well.` },
    { tex: pairSteps(params) },
    { tex: polyTex(pairQuad(params)) },
    { text: 'The real root from the sum of the roots:' },
    { tex: realRootSteps(params) },
  ],
};

interface BuildParams extends Root {
  r: number;
}

const builtCubic = ({ a, b, r }: BuildParams): Poly => mulPoly(pairQuad({ a, b }), [1, -r]);

/** The monic cubic with a real root r and a conjugate pair. */
const conjCubicBuildTiles: Generator<BuildParams> = {
  id: 'poly-conj-cubic-build-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const z = hard ? sampleRoot(rng, 4, 4, true) : sampleRoot(rng, 3, 3, true);
      const r = nonZero(rng, hard ? 5 : 4);
      const p = builtCubic({ ...z, r });
      if (p.some((c) => c === 0) || !fits(p, hard ? 90 : 60)) continue;
      return { ...z, r };
    }
  },
  choices: (params) => {
    const { a, b, r } = params;
    const p = builtCubic(params);
    const diff = a * a - b * b;
    return options(
      polyOption(p),
      polyOption([1, -p[1], p[2], -p[3]]),
      polyOption(mulPoly([1, -2 * a, diff], [1, -r])),
      polyOption([p[0], p[1], p[2], -p[3]]),
    );
  },
  render: (params): Slide => {
    const p = builtCubic(params);
    const s = sumOf(params);
    const m = prodOf(params);
    const answer = [signedTerm(p[1], 2), signedTerm(p[2], 1), signedNum(p[3])];
    return {
      kind: 'tiles',
      prompt: [say(`Find the cubic with leading coefficient $1$, real coefficients, a real root $${params.r}$ and a root $${zOf(params)}$.`)],
      template: 'x^3 {0} {1} {2}',
      bank: fillBank(answer, [
        signedTerm(-p[1], 2),
        signedTerm(-p[2], 1),
        signedNum(-p[3]),
        ...(m === s * params.r ? [] : [signedTerm(m - s * params.r, 1)]),
        ...(params.r === s ? [] : [signedTerm(params.r - s, 2)]),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const q = pairQuad(params);
    return [
      { text: `The other roots are $${barOf(params)}$ and $${params.r}$. The pair gives:` },
      { tex: polyTex(q) },
      { text: `Multiply by $x ${signedNum(-params.r)}$:` },
      {
        tex: chain(
          `&(${polyTex(q)})(x ${signedNum(-params.r)})`,
          `=\\;&${polyTex(builtCubic(params))}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Lesson 3: quartics with complex roots
 * ================================================================ */

interface QuarticParams extends Root {
  /** The other factor, x^2 + ux + v. */
  u: number;
  v: number;
  /** Its roots: two whole reals, or a second conjugate pair. */
  other: { real: [number, number] } | { pair: Root };
}

const otherQuad = ({ u, v }: QuarticParams): Poly => [1, u, v];
const quarticOf = (params: QuarticParams): Poly => mulPoly(pairQuad(params), otherQuad(params));

function sampleQuartic(rng: Rng, difficulty: number): QuarticParams {
  const hard = difficulty > 1;
  for (;;) {
    const z = hard ? sampleRoot(rng, 3, 4, true) : sampleRoot(rng, 2, 3, true);
    let params: QuarticParams;
    if (rng.chance(0.55)) {
      const r1 = nonZero(rng, hard ? 5 : 4);
      const r2 = nonZero(rng, hard ? 5 : 4);
      if (r1 === r2) continue;
      params = { ...z, u: -(r1 + r2), v: r1 * r2, other: { real: [Math.min(r1, r2), Math.max(r1, r2)] } };
    } else {
      const w = { a: nonZero(rng, hard ? 3 : 2), b: rng.int(1, hard ? 3 : 2) };
      if (samePair(z, w)) continue;
      params = { ...z, u: -sumOf(w), v: prodOf(w), other: { pair: w } };
    }
    if (params.u === 0 || !fits(quarticOf(params), 150)) continue;
    return params;
  }
}

/** Comparing the x^3 terms and the constants, with the learner's numbers. */
function otherFactorSteps(params: QuarticParams): string {
  const p = quarticOf(params);
  const s = sumOf(params);
  const m = prodOf(params);
  return chain(
    `x^{3}\\!: \\quad u ${signedNum(-s)} &= ${p[1]}, \\quad u = ${params.u}`,
    `\\text{constant}\\!: \\quad ${m}v &= ${p[4]}, \\quad v = ${params.v}`,
  );
}

function otherRootsTex(params: QuarticParams): string {
  if ('real' in params.other) return `$${params.other.real[0]}$ and $${params.other.real[1]}$`;
  const w = params.other.pair;
  return `$${w.a} \\pm ${complexTex(0, w.b)}$`;
}

/** The other quadratic factor of a quartic, one of whose roots is given. */
const conjQuarticFactorTiles: Generator<QuarticParams> = {
  id: 'poly-conj-quartic-factor-tiles',
  sample: sampleQuartic,
  choices: (params) => {
    const { u, v } = params;
    return options(
      polyOption([1, u, v]),
      polyOption([1, -u, v]),
      polyOption([1, u, -v]),
      polyOption([1, u - 2 * sumOf(params), v]),
    );
  },
  render: (params): Slide => {
    const p = quarticOf(params);
    const answer = [signedTerm(params.u, 1), signedNum(params.v)];
    return {
      kind: 'tiles',
      prompt: [say(`$${zOf(params)}$ is a root of $${polyTex(p)} = 0$. Find its other quadratic factor.`)],
      template: `(${templateTex(pairQuad(params))})(x^2 {0} {1})`,
      bank: fillBank(answer, [
        signedTerm(-params.u, 1),
        signedNum(-params.v),
        ...(p[1] === 0 ? [] : [signedTerm(p[1], 1)]),
        ...(params.u === 2 * sumOf(params) ? [] : [signedTerm(params.u - 2 * sumOf(params), 1)]),
        signedNum(p[4]),
      ]),
      answer,
    };
  },
  solution: (params) => [
    { text: `$${zOf(params)}$ and $${barOf(params)}$ give the factor $${polyTex(pairQuad(params))}$. Call the other $x^{2} + ux + v$ and compare:` },
    { tex: otherFactorSteps(params) },
    { tex: polyTex(otherQuad(params)) },
  ],
};

/** Factor from the pair, the other factor, then its roots. */
const conjQuarticFlow: Generator<QuarticParams> = {
  id: 'poly-conj-quartic-flow',
  sample: sampleQuartic,
  render: (params): Slide => {
    const p = quarticOf(params);
    const key = polyTex(p);
    const q = pairQuad(params);
    const { u, v } = params;
    const quads = [
      { label: `$${polyTex(q)}$`, to: 'other' },
      { label: `$${polyTex([1, sumOf(params), prodOf(params)])}$`, outcome: 'The $x$ term is minus the sum of the pair, not plus.' },
      {
        label: `$${polyTex([1, -sumOf(params), params.a * params.a - params.b * params.b])}$`,
        outcome: 'The product of the pair is $a^{2} + b^{2}$, since $i^{2} = -1$.',
      },
    ];
    const others = [
      { label: `$${polyTex([1, u, v])}$`, to: 'roots' },
      { label: `$${polyTex([1, -u, v])}$`, outcome: `The $x^{3}$ terms give $u ${signedNum(-sumOf(params))} = ${p[1]}$: check the sign of $u$.` },
      { label: `$${polyTex([1, u, -v])}$`, outcome: `The constants give $${prodOf(params)}v = ${p[4]}$: check the sign of $v$.` },
    ];
    const right = otherRootsTex(params);
    const wrong: string[] = [];
    if ('real' in params.other) {
      const [r1, r2] = params.other.real;
      wrong.push(`$${-r2}$ and $${-r1}$`);
    } else {
      const w = params.other.pair;
      wrong.push(`$${-w.a} \\pm ${complexTex(0, w.b)}$`, `$${w.a - w.b}$ and $${w.a + w.b}$`);
    }
    const roots = [
      { label: right, outcome: `So the four roots are $${zOf(params)}$, $${barOf(params)}$, ${right}.` },
      ...wrong.map((label) => ({ label, outcome: `Solve $${polyTex([1, u, v])} = 0$ and check a root in it.` })),
    ];
    return {
      kind: 'flow',
      prompt: [say(`This quartic has real coefficients and a root $z = ${zOf(params)}$. Each answer chooses what gets asked next.`)],
      subject: `${key} = 0`,
      steps: [
        { id: 'factor', ask: 'Which quadratic factor do $z$ and its conjugate give?', branches: turned(quads, `${key}|1`) },
        { id: 'other', ask: 'Comparing the $x^{3}$ terms and the constants, what is the other factor?', branches: turned(others, `${key}|2`) },
        { id: 'roots', ask: 'What are the roots of that factor?', branches: turned(roots, `${key}|3`) },
      ],
      answer: [`$${polyTex(q)}$`, `$${polyTex([1, u, v])}$`, right],
    };
  },
  solution: (params) => {
    const other = otherQuad(params);
    const disc = params.u * params.u - 4 * params.v;
    return [
      { tex: pairSteps(params) },
      { text: `So one factor is $${polyTex(pairQuad(params))}$. For the other, $x^{2} + ux + v$:` },
      { tex: otherFactorSteps(params) },
      {
        text:
          'real' in params.other
            ? `$${polyTex(other)}$ factorises, with roots ${otherRootsTex(params)}.`
            : `$${polyTex(other)}$ has discriminant $${disc} < 0$, so its roots are another pair: ${otherRootsTex(params)}.`,
      },
    ];
  },
};

interface TwoPairsParams {
  z: Root;
  w: Root;
}

/** The quartic's coefficients from two conjugate pairs, via each pair's sum and product. */
const conjTwoPairsTree: Generator<TwoPairsParams> = {
  id: 'poly-conj-two-pairs-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const z = hard ? sampleRoot(rng, 3, 3) : sampleRoot(rng, 2, 2);
      const w = hard ? sampleRoot(rng, 3, 3) : sampleRoot(rng, 2, 2);
      if (samePair(z, w)) continue;
      if (!fits(mulPoly(pairQuad(z), pairQuad(w)), 150)) continue;
      return { z, w };
    }
  },
  render: ({ z, w }): Slide => {
    const p = mulPoly(pairQuad(z), pairQuad(w));
    const [s1, m1, s2, m2] = [sumOf(z), prodOf(z), sumOf(w), prodOf(w)];
    const values = [s1, m1, s2, m2, p[1], p[2], p[3], p[4]];
    return {
      kind: 'tree',
      prompt: [
        say(
          `A real quartic has roots $${zOf(z)}$ and $${zOf(w)}$, and so their conjugates. Top row: the sum and the product of the first pair, then of the second. Underneath: $B$, $C$, $D$ and $E$.`,
        ),
      ],
      expression: 'x^{4} + Bx^{3} + Cx^{2} + Dx + E',
      nodes: [
        { id: 's1', from: [] },
        { id: 'm1', from: [] },
        { id: 's2', from: [] },
        { id: 'm2', from: [] },
        { id: 'B', from: ['s1', 's2'] },
        { id: 'C', from: ['s1', 'm1', 's2', 'm2'] },
        { id: 'D', from: ['s1', 'm1', 's2', 'm2'] },
        { id: 'E', from: ['m1', 'm2'] },
      ],
      bank: numberBank(values, [-p[1], -p[2], -p[3], m1 + m2, s1 * s2], String, 2),
      answer: values.map(String),
    };
  },
  solution: ({ z, w }) => {
    const [s1, m1, s2, m2] = [sumOf(z), prodOf(z), sumOf(w), prodOf(w)];
    const p = mulPoly(pairQuad(z), pairQuad(w));
    return [
      { text: `The factors are $${polyTex(pairQuad(z))}$ and $${polyTex(pairQuad(w))}$. Multiplying out:` },
      {
        tex: chain(
          `B &= -(${s1} ${signedNum(s2)}) = ${p[1]}`,
          `C &= ${m1} + ${m2} + ${f(s1)} \\times ${f(s2)} = ${p[2]}`,
          `D &= -(${f(s1)} \\times ${m2} + ${f(s2)} \\times ${m1}) = ${p[3]}`,
          `E &= ${m1} \\times ${m2} = ${p[4]}`,
        ),
      },
      { tex: polyTex(p) },
    ];
  },
};

/* ================================================================
 * Lesson 4: unknown coefficients
 * ================================================================ */

interface UnknownParams extends Root {
  r: number;
  /** 'sum': x^3 + Bx^2 + px + q with B known; 'product': x^3 + px^2 + qx + D with D known. */
  form: 'sum' | 'product';
}

/** The cubic's coefficients [1, B, C, D] from the roots. */
const unknownCubic = ({ a, b, r }: UnknownParams): Poly => mulPoly(pairQuad({ a, b }), [1, -r]);

/** [p, q] for the form asked. */
function unknownsOf(params: UnknownParams): [number, number] {
  const c = unknownCubic(params);
  return params.form === 'sum' ? [c[2], c[3]] : [c[1], c[2]];
}

function unknownEquation(params: UnknownParams): string {
  const c = unknownCubic(params);
  if (params.form === 'sum') return `x^{3}${c[1] === 0 ? '' : ` ${signedTerm(c[1], 2)}`} + px + q = 0`;
  return `x^{3} + px^{2} + qx ${signedNum(c[3])} = 0`;
}

function sampleUnknown(rng: Rng, difficulty: number): UnknownParams {
  const hard = difficulty > 1;
  for (;;) {
    const z = hard ? sampleRoot(rng, 4, 4) : sampleRoot(rng, 3, 3);
    const r = nonZero(rng, hard ? 6 : 5);
    // The product form is taught second, so difficulty 1 asks only the sum form.
    const params: UnknownParams = { ...z, r, form: hard && rng.chance(0.5) ? 'product' : 'sum' };
    if (!fits(unknownCubic(params), 60)) continue;
    return params;
  }
}

/** The real root from the identity with no unknown in it. */
function unknownRootSteps(params: UnknownParams): string {
  const c = unknownCubic(params);
  const s = sumOf(params);
  const m = prodOf(params);
  if (params.form === 'sum') {
    return chain(`\\Sigma\\alpha &= ${minusOf(c[1])}`, `${s} + \\gamma &= ${s + params.r}`, `\\gamma &= ${params.r}`);
  }
  return chain(`\\alpha\\beta\\gamma &= ${minusOf(c[3])}`, `${m}\\gamma &= ${m * params.r}`, `\\gamma &= ${params.r}`);
}

/** Then p and q from the other two identities. */
function unknownCoeffSteps(params: UnknownParams): string {
  const s = sumOf(params);
  const m = prodOf(params);
  const r = params.r;
  const [p, q] = unknownsOf(params);
  const pairs = `${m} + ${f(r)} \\times ${f(s)}`;
  if (params.form === 'sum') {
    return chain(`p &= \\Sigma\\alpha\\beta = ${pairs} = ${p}`, `q &= -\\alpha\\beta\\gamma = -${m} \\times ${f(r)} = ${q}`);
  }
  return chain(`p &= -\\Sigma\\alpha = -(${s} ${signedNum(r)}) = ${p}`, `q &= \\Sigma\\alpha\\beta = ${pairs} = ${q}`);
}

/** Pair sum, pair product, the real root, then p and q. */
const conjUnknownTree: Generator<UnknownParams> = {
  id: 'poly-conj-unknown-tree',
  sample: sampleUnknown,
  render: (params): Slide => {
    const s = sumOf(params);
    const m = prodOf(params);
    const [p, q] = unknownsOf(params);
    const values = [s, m, params.r, p, q];
    return {
      kind: 'tree',
      prompt: [
        say(
          `$${zOf(params)}$ is a root of $${unknownEquation(params)}$, where $p$ and $q$ are real. Top row: $z + \\overline{z}$ and $z\\overline{z}$. Then the real root $\\gamma$, then $p$ and $q$.`,
        ),
      ],
      expression: unknownEquation(params),
      nodes: [
        { id: 's', from: [] },
        { id: 'm', from: [] },
        { id: 'r', from: [params.form === 'sum' ? 's' : 'm'] },
        { id: 'p', from: params.form === 'sum' ? ['s', 'm', 'r'] : ['s', 'r'] },
        { id: 'q', from: params.form === 'sum' ? ['m', 'r'] : ['s', 'm', 'r'] },
      ],
      bank: numberBank(values, [-s, -m, -params.r, -p, -q], String, 2),
      answer: values.map(String),
    };
  },
  solution: (params) => [
    { tex: pairSteps(params) },
    { text: `The ${params.form === 'sum' ? 'sum of the roots' : 'product of the roots'} has no unknown in it:` },
    { tex: unknownRootSteps(params) },
    { tex: unknownCoeffSteps(params) },
  ],
};

interface UnknownAskParams extends UnknownParams {
  ask: number;
}

/** One unknown coefficient, typed. */
const conjUnknownCoeff: Generator<UnknownAskParams> = {
  id: 'poly-conj-unknown-coeff',
  sample: (rng, difficulty) => ({ ...sampleUnknown(rng, difficulty), ask: rng.int(0, 1) }),
  choices: (params) => {
    const values = unknownsOf(params);
    const v = values[params.ask];
    return intOptions(v, [-v, values[1 - params.ask], params.r, v + 2 * params.r]);
  },
  render: (params): Slide => {
    const name = params.ask === 0 ? 'p' : 'q';
    return {
      kind: 'expression',
      prompt: [say(`$${zOf(params)}$ is a root of $${unknownEquation(params)}$, where $p$ and $q$ are real. Find $${name}$.`)],
      lead: `${name} =`,
      keypad: [],
      answer: String(unknownsOf(params)[params.ask]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => [
    { text: `$${barOf(params)}$ is a root too.` },
    { tex: pairSteps(params) },
    { text: 'Find the real root $\\gamma$ first, from the identity with no unknown in it:' },
    { tex: unknownRootSteps(params) },
    { tex: unknownCoeffSteps(params) },
  ],
};

const IDENTITIES = ['The sum of the roots', 'The sum of the pairs', 'The product of the roots'];

/** Which identity to start from, then the real root, then p. */
const conjIdentityFlow: Generator<UnknownParams> = {
  id: 'poly-conj-identity-flow',
  sample: sampleUnknown,
  render: (params): Slide => {
    const key = unknownEquation(params);
    const s = sumOf(params);
    const m = prodOf(params);
    const r = params.r;
    const [p] = unknownsOf(params);
    const right = params.form === 'sum' ? 0 : 2;
    // Sum form x^3 + Bx^2 + px + q: the pairs need p and the product q.
    // Product form x^3 + px^2 + qx + D: the sum needs p and the pairs q.
    const needs = params.form === 'sum' ? ['', '$p$', '$q$'] : ['$p$', '$q$', ''];
    const which = IDENTITIES.map((label, k) =>
      k === right ? { label, to: 'root' } : { label, outcome: `That one needs ${needs[k]}, which is not known yet.` },
    );
    const rootSlips = [...new Set([-r, r + s, r + m])].filter((v) => v !== r);
    const roots = [
      { label: `$${r}$`, to: 'coef' },
      ...rootSlips.slice(0, 2).map((v) => ({ label: `$${v}$`, outcome: `Work ${IDENTITIES[right].toLowerCase()} again with the pair's ${right === 0 ? `sum, $${s}$` : `product, $${m}$`}.` })),
    ];
    const pSlips = [...new Set([-p, params.form === 'sum' ? m + r : s - r])].filter((v) => v !== p);
    const ps = [
      { label: `$${p}$`, outcome: 'Right. $q$ comes out the same way, from the identity that still needs it.' },
      ...pSlips.map((v) => ({
        label: `$${v}$`,
        outcome: params.form === 'sum' ? 'The pairs are $z\\overline{z}$, then $\\gamma$ with each of $z$ and $\\overline{z}$.' : '$p$ is minus the sum of all three roots.',
      })),
    ];
    return {
      kind: 'flow',
      prompt: [say(`$${zOf(params)}$ is a root of this cubic, where $p$ and $q$ are real. Each answer chooses what gets asked next.`)],
      subject: key,
      steps: [
        { id: 'which', ask: 'Which identity gives the real root $\\gamma$ with no unknown in it?', branches: which },
        { id: 'root', ask: 'So what is $\\gamma$?', branches: turned(roots, `${key}|${params.a}|${params.b}|2`) },
        { id: 'coef', ask: 'Then what is $p$?', branches: turned(ps, `${key}|${params.a}|${params.b}|3`) },
      ],
      answer: [IDENTITIES[right], `$${r}$`, `$${p}$`],
    };
  },
  solution: (params) => [
    { tex: pairSteps(params) },
    { text: `${params.form === 'sum' ? 'The $x^{2}$ coefficient is known, so start from the sum' : 'The constant is known, so start from the product'}:` },
    { tex: unknownRootSteps(params) },
    { tex: unknownCoeffSteps(params) },
  ],
};

/* ================================================================
 * Lesson 5: how many real roots
 * ================================================================ */

interface IncludeParams {
  n: number;
  z: Root;
  /** A real root given alongside, at difficulty 1. */
  r?: number;
  /** A whole conjugate pair given alongside, at difficulty 2. */
  w?: Root;
}

/** Of four candidates, the one the given roots force: the conjugate. */
const conjMustInclude: Generator<IncludeParams> = {
  id: 'poly-conj-must-include',
  sample: (rng, difficulty) => {
    for (;;) {
      const z = sampleRoot(rng, 5, 5, true);
      if (difficulty > 1) {
        const w = sampleRoot(rng, 5, 5, true);
        if (samePair(z, w)) continue;
        return { n: rng.int(5, 6), z, w };
      }
      return { n: rng.int(3, 5), z, r: nonZero(rng, 6) };
    }
  },
  render: ({ n, z, r, w }): Slide => {
    const given = w ? `$${zOf(w)}$, $${barOf(w)}$ and $${zOf(z)}$` : `$${zOf(z)}$ and $${r}$`;
    const third = w ? { tex: complexTex(-w.a, -w.b), answer: complexAnswer(-w.a, -w.b) } : { tex: String(-r!), answer: String(-r!) };
    const opts = options(
      { tex: barOf(z), answer: complexAnswer(z.a, -z.b) },
      { tex: complexTex(-z.a, -z.b), answer: complexAnswer(-z.a, -z.b) },
      { tex: complexTex(-z.a, z.b), answer: complexAnswer(-z.a, z.b) },
      third,
    );
    return choiceSlide(
      [say(`A polynomial of degree $${n}$ with real coefficients has roots including ${given}. Which of these must also be a root?`)],
      opts,
    );
  },
  solution: ({ z, w }) => [
    { text: 'Non-real roots of a real polynomial come in conjugate pairs.' },
    ...(w ? [{ text: `$${zOf(w)}$ and $${barOf(w)}$ are already a pair, so they force nothing new.` }] : []),
    { text: `$${zOf(z)}$ has no partner yet, so its conjugate must be a root:` },
    { tex: `\\overline{${zOf(z)}} = ${barOf(z)}` },
    { text: 'The other options might be roots, but nothing says they have to be.' },
  ],
};

interface CountParams {
  n: number;
  /** Non-real roots given, none the conjugate of another. */
  known: Root[];
}

/** "1 or 3", "0, 2 or 4", "exactly 1": a set of possible counts in words. */
function countLabel(values: number[]): string {
  if (values.length === 1) return `Exactly $${values[0]}$`;
  return `$${values.slice(0, -1).join('$, $')}$ or $${values[values.length - 1]}$`;
}

/** The possible numbers of real roots among `left` roots of a real polynomial. */
const possibleCounts = (left: number): number[] => {
  const out: number[] = [];
  for (let k = left % 2; k <= left; k += 2) out.push(k);
  return out;
};

/** Pairs first, then what is left, then the possible numbers of real roots. */
const conjCountFlow: Generator<CountParams> = {
  id: 'poly-conj-count-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const k = difficulty > 1 ? rng.int(1, 2) : 1;
      const known = Array.from({ length: k }, () => sampleRoot(rng, 4, 4));
      if (k === 2 && samePair(known[0], known[1])) continue;
      const n = rng.int(2 * k + 1, difficulty > 1 ? 7 : 5);
      return { n, known };
    }
  },
  render: ({ n, known }): Slide => {
    const k = known.length;
    const left = n - 2 * k;
    const key = `${n}|${known.map(zOf).join('|')}`;
    const pairLabels = [...new Set([2 * k, k, 2 * k + 1])];
    const pairs = pairLabels.map((v) =>
      v === 2 * k
        ? { label: `$${v}$`, to: 'left' }
        : { label: `$${v}$`, outcome: 'Each non-real root brings its conjugate with it, so count each given root twice.' },
    );
    const leftLabels = [...new Set([left, n - k, n])];
    const lefts = leftLabels.map((v) =>
      v === left
        ? { label: `$${v}$`, to: 'real' }
        : { label: `$${v}$`, outcome: `A degree $${n}$ polynomial has $${n}$ roots in all, and $${2 * k}$ of them are accounted for.` },
    );
    const right = possibleCounts(left);
    const all = Array.from({ length: left + 1 }, (_, v) => v);
    const candidates = [right, all, [left], right.length > 1 ? right.slice(1) : [left + 1]];
    const seen = new Set<string>();
    const reals = candidates
      .map(countLabel)
      .filter((label) => (seen.has(label) ? false : (seen.add(label), true)))
      .map((label, idx) =>
        idx === 0
          ? { label, outcome: 'The rest are real, or further conjugate pairs, which come off two at a time.' }
          : { label, outcome: 'Any of the remaining roots that are not real come as a conjugate pair, so the real ones drop two at a time.' },
      );
    const list = known.length === 1 ? `$${zOf(known[0])}$` : `$${zOf(known[0])}$ and $${zOf(known[1])}$`;
    return {
      kind: 'flow',
      prompt: [say(`A polynomial of degree $${n}$ with real coefficients has ${list} among its roots. Each answer chooses what gets asked next.`)],
      subject: `\\text{degree } ${n}`,
      steps: [
        { id: 'pairs', ask: 'At least how many of its roots are non-real?', branches: turned(pairs, `${key}|1`) },
        { id: 'left', ask: 'So how many of its roots are still unknown?', branches: turned(lefts, `${key}|2`) },
        { id: 'real', ask: 'How many real roots can it have?', branches: turned(reals, `${key}|3`) },
      ],
      answer: [`$${2 * k}$`, `$${left}$`, countLabel(right)],
    };
  },
  solution: ({ n, known }) => {
    const k = known.length;
    const left = n - 2 * k;
    return [
      { text: `Each given root brings its conjugate: ${known.map((z) => `$${barOf(z)}$`).join(' and ')}. That is $${2 * k}$ non-real roots.` },
      { text: `Degree $${n}$ means $${n}$ roots counted with multiplicity, so $${n} - ${2 * k} = ${left}$ are left.` },
      { text: `Those are real, or more conjugate pairs, so the number of real roots is ${countLabel(possibleCounts(left)).replace('Exactly', 'exactly')}.` },
    ];
  },
};

interface SetsParams {
  degree: 3 | 4;
  z: Root;
  w: Root;
  r: number;
  s: number;
  /** For a quartic, whether the right set is two pairs rather than a pair and two reals. */
  twoPairs: boolean;
}

const listTex = (roots: string[]): string => roots.join(',\\ ');

/** Which list could be every root of a real cubic or quartic. */
const conjPossibleSets: Generator<SetsParams> = {
  id: 'poly-conj-possible-sets',
  sample: (rng, difficulty) => {
    for (;;) {
      const z = sampleRoot(rng, 3, 3, true);
      const w = sampleRoot(rng, 3, 3, true);
      if (samePair(z, w)) continue;
      const r = nonZero(rng, 5);
      const s = nonZero(rng, 5);
      if (r === s) continue;
      const degree = difficulty > 1 ? 4 : 3;
      return { degree, z, w, r, s, twoPairs: degree === 4 && rng.chance(0.5) };
    }
  },
  render: ({ degree, z, w, r, s, twoPairs }): Slide => {
    const Z = zOf(z);
    const Zb = barOf(z);
    const flipped = complexTex(-z.a, z.b);
    const W = zOf(w);
    const opts: Omit<ChoiceOption, 'correct'>[] =
      degree === 3
        ? [
            { tex: listTex([Z, Zb, String(r)]) },
            { tex: listTex([Z, flipped, String(r)]) },
            { tex: listTex([Z, String(r), String(s)]) },
            { tex: listTex([Z, Zb, W]) },
          ]
        : [
            { tex: listTex(twoPairs ? [Z, Zb, W, barOf(w)] : [Z, Zb, String(r), String(s)]) },
            { tex: listTex([Z, Zb, W, String(r)]) },
            { tex: listTex([Z, flipped, String(r), String(s)]) },
            { tex: listTex([Z, Zb, W, complexTex(-w.a, -w.b)]) },
          ];
    const [right, ...wrong] = opts;
    return choiceSlide(
      [say(`Which of these could be the complete list of roots of a ${degree === 3 ? 'cubic' : 'quartic'} with real coefficients?`)],
      options(right, ...wrong),
    );
  },
  solution: ({ degree, z, w, twoPairs }) => [
    { text: 'Every non-real root must have its conjugate in the list too.' },
    { text: `$${zOf(z)}$ needs $${barOf(z)}$, not $${complexTex(-z.a, z.b)}$.` },
    ...(degree === 4 && twoPairs
      ? [{ text: `$${zOf(w)}$ needs $${barOf(w)}$, and here it has it.` }]
      : [{ text: `A lone $${zOf(w)}$ would need $${barOf(w)}$ as well, so any list with it and not its partner is impossible.` }]),
    { text: `The list that works has every non-real root paired, and ${degree === 3 ? 'three' : 'four'} roots in all.` },
  ],
};

export const rootsConjugateGenerators = [
  conjPartnerPlot,
  conjPairSum,
  conjFactorTree,
  conjQuadFactorTiles,
  conjCubicRealRoot,
  conjCubicFlow,
  conjCubicBuildTiles,
  conjQuarticFactorTiles,
  conjQuarticFlow,
  conjTwoPairsTree,
  conjUnknownTree,
  conjUnknownCoeff,
  conjIdentityFlow,
  conjMustInclude,
  conjCountFlow,
  conjPossibleSets,
];
