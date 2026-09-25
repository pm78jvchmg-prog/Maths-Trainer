/**
 * Logarithms.
 *
 * One constraint decides the shape of this whole file. The checker probes over
 * the reals, including negative x, and mathjs returns the *complex*
 * `ln|x| + iπ` for the logarithm of a negative number. So two expressions that
 * are equal for every positive x can disagree off the positive axis: ours
 * `2\log(x)` against a learner's `\log(x^2)` differ at exactly half the sample
 * points, and the learner — who is right — would be marked wrong.
 *
 * Every log law in this topic is an identity of precisely that kind. So no
 * question here asks for a typed expression containing the logarithm of a
 * variable. Instead:
 *
 * - numeric answers where the logarithm resolves to a number, which the checker
 *   settles in a single evaluation with no probing at all;
 * - typed answers that are numeric *expressions* — `log(30)/log(2)` — for
 *   solving, where the exact answer genuinely is a logarithm;
 * - tiles for the laws themselves, which grades the rewritten form rather than
 *   its value, and is what the laws are actually about.
 *
 * This is not a workaround imposed on the content: it is how the topic is
 * examined anyway.
 */
import type { Rng } from '../../engine/rng';
import type { ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { bin, log, num, pow, type Expr } from '../expr';
import { markerWindow, plotSvg, type PlotOptions } from '../figures';
import { EXP_KEYS, termTex } from './calculus';
import { fracTex, gcd, plusMinus } from './format';

/** Solving for an index needs a logarithm key. */
const LOG_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'log(' }];

function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/**
 * Base-and-index pairs whose value stays a number a learner recognises.
 *
 * Pairing them rather than drawing independently is what keeps the argument
 * readable: 2^13 is reasonable to print, 10^13 is not, and one shared ceiling
 * on the index would have to be set by the largest base.
 */
function basePairs(bases: number[], lowest: number, cap: number): { base: number; index: number }[] {
  return bases.flatMap((base) => {
    const out: { base: number; index: number }[] = [];
    for (let index = lowest; Math.pow(base, index) <= cap; index += 1) out.push({ base, index });
    return out;
  });
}

const EASY_PAIRS = basePairs([2, 3, 4, 5, 6, 7, 10], 0, 10_000);
const HARD_PAIRS = basePairs([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 0, 200_000);

/** A tile bank that keeps its answers with multiplicity. See quadratics.ts. */
function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  return [...answer, ...[...new Set(distractors)].filter((t) => !needed.has(t))].sort();
}

/** log_b(v), as it is written. */
function logTex(base: number, argument: string): string {
  return `\\log_{${base}}\\left(${argument}\\right)`;
}

/* ---------- Level 1: what a logarithm is ---------- */

interface PairParams {
  base: number;
  index: number;
}

/** Evaluating a logarithm, which means asking what index produced the argument. */
const evaluateLog: Generator<PairParams> = {
  id: 'log-evaluate',
  // Reading the argument back instead of the index is the slip named in the
  // worked solution.
  choices: ({ base, index }) => {
    const value = Math.pow(base, index);
    return options(
      { tex: `${index}`, answer: `${index}` },
      { tex: `${value}`, answer: `${value}` },
      { tex: `${base}`, answer: `${base}` },
      { tex: `${index + 1}`, answer: `${index + 1}` },
    );
  },
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? HARD_PAIRS : EASY_PAIRS),
  render: ({ base, index }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate.' }],
    lead: `${logTex(base, `${Math.pow(base, index)}`)} =`,
    keypad: [],
    answer: `${index}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, index }) => {
    const value = Math.pow(base, index);
    return [
      {
        text: `A logarithm asks for an index. $${logTex(base, `${value}`)}$ means: to what power must $${base}$ be raised to give $${value}$?`,
      },
      { tex: `${base}^{${index}} = ${value} \\implies ${logTex(base, `${value}`)} = ${index}` },
      {
        text:
          index === 0
            ? 'Anything to the power zero is 1, so the logarithm of 1 is 0 whatever the base. It is worth knowing on sight.'
            : index === 1
              ? `A logarithm of the base itself is always 1, because $${base}^{1} = ${base}$.`
              : `So the answer is $${index}$ — the index, not the value. Writing $${value}$ is the slip to guard against: the logarithm is the power, never the number it produces.`,
      },
    ];
  },
};

/** The same statement in index form, which is the definition restated. */
const logToIndex: Generator<PairParams> = {
  id: 'log-to-index',
  sample: (rng, difficulty) => {
    const pool = (difficulty > 1 ? HARD_PAIRS : EASY_PAIRS).filter(
      // base === index would make two of the four options render identically.
      (p) => p.index >= 2 && p.index !== p.base,
    );
    return rng.pick(pool);
  },
  render: ({ base, index }): Slide => {
    const value = Math.pow(base, index);
    const options = [
      { id: 'correct', label: `${base}^{${index}} = ${value}`, tex: true },
      { id: 'swapped', label: `${index}^{${base}} = ${value}`, tex: true },
      { id: 'inverted', label: `${value}^{${index}} = ${base}`, tex: true },
      { id: 'mixed', label: `${base}^{${value}} = ${index}`, tex: true },
    ];
    const turn = (base + index) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which of these says the same thing as $${logTex(base, `${value}`)} = ${index}$?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'correct',
    };
  },
  solution: ({ base, index }) => {
    const value = Math.pow(base, index);
    return [
      {
        text: 'A logarithm and an index are the same statement written two ways. Converting between them is the single most useful move in the topic.',
      },
      { tex: `\\log_{b}\\left(y\\right) = x \\iff b^{x} = y` },
      {
        text: `The base stays the base in both forms. The logarithm is the *index*, $${index}$, and the argument is the *result*, $${value}$.`,
      },
      { tex: `${logTex(base, `${value}`)} = ${index} \\iff ${base}^{${index}} = ${value}` },
      {
        text: 'When a log equation looks impenetrable, rewriting it in index form usually makes it ordinary. That is the first thing to try.',
      },
    ];
  },
};

/** Solving log_b(x) = n by converting to index form. */
const solveSimple: Generator<PairParams> = {
  id: 'log-solve-simple',
  choices: ({ base, index }) =>
    options(
      { tex: `${Math.pow(base, index)}`, answer: `${Math.pow(base, index)}` },
      { tex: `${Math.pow(index, base)}`, answer: `${Math.pow(index, base)}` },
      { tex: `${base * index}`, answer: `${base * index}` },
      { tex: `${Math.pow(base, index + 1)}`, answer: `${Math.pow(base, index + 1)}` },
    ),
  sample: (rng, difficulty) => {
    const pool = (difficulty > 1 ? HARD_PAIRS : EASY_PAIRS).filter((p) => p.index >= 1);
    return rng.pick(pool);
  },
  render: ({ base, index }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Solve for $x$.' }],
    lead: `${logTex(base, 'x')} = ${index} \\implies x =`,
    keypad: [],
    answer: `${Math.pow(base, index)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, index }) => [
    { text: 'Rewrite in index form and the equation answers itself.' },
    { tex: `${logTex(base, 'x')} = ${index} \\iff x = ${base}^{${index}}` },
    { tex: `x = ${Math.pow(base, index)}` },
    {
      text: `Note which number ends up as the index. It is the right-hand side, $${index}$, raised over the base — not the other way round. Swapping them gives $${index}^{${base}} = ${Math.pow(index, base)}$, which is a different number entirely.`,
    },
  ],
};

interface DomainParams {
  base: number;
  value: number;
  form: 'zero' | 'negative';
}

/** What a logarithm has no value for. */
const logDomain: Generator<DomainParams> = {
  id: 'log-domain',
  sample: (rng, difficulty) => {
    const base = rng.pick(difficulty > 1 ? [2, 3, 4, 5, 7, 10] : [2, 3, 5, 10]);
    const drawn = rng.int(2, difficulty > 1 ? 30 : 20);
    return {
      base,
      // The ordinary option must not land on the base or on 1, or two of the
      // four options render identically and the slide offers the same answer
      // twice. The id check in the property tests cannot see that.
      value: drawn === base ? drawn + 1 : drawn,
      form: rng.pick(['zero', 'negative'] as const),
    };
  },
  render: ({ base, value, form }): Slide => {
    const undefinedOne =
      form === 'zero'
        ? { id: 'undefined', label: logTex(base, '0'), tex: true }
        : { id: 'undefined', label: logTex(base, `-${value}`), tex: true };
    const options = [
      undefinedOne,
      { id: 'one', label: logTex(base, '1'), tex: true },
      { id: 'base', label: logTex(base, `${base}`), tex: true },
      { id: 'ordinary', label: logTex(base, `${value}`), tex: true },
    ];
    const turn = (base + value) % options.length;
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text: 'Which of these has no value?' }],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'undefined',
    };
  },
  solution: ({ base, value, form }) => [
    {
      text: `A logarithm asks what power of the base gives the argument. Since $${base}$ raised to any power is positive, no power of it can ever give zero or a negative number.`,
    },
    {
      tex:
        form === 'zero'
          ? `${base}^{x} = 0 \\quad \\text{has no solution}`
          : `${base}^{x} = -${value} \\quad \\text{has no solution}`,
    },
    {
      text: `So $${form === 'zero' ? logTex(base, '0') : logTex(base, `-${value}`)}$ is undefined. The argument of a logarithm must be strictly positive, and that restriction is worth checking before solving anything.`,
    },
    {
      text: `The other three are all perfectly ordinary: $${logTex(base, '1')} = 0$, $${logTex(base, `${base}`)} = 1$, and $${logTex(base, `${value}`)}$ is some number between them or beyond.`,
    },
    {
      text: 'This matters when solving: a log equation can produce a candidate that makes an argument negative, and that candidate has to be discarded rather than reported.',
    },
  ],
};

/* ---------- Level 2: the laws ---------- */

interface ArithmeticParams {
  base: number;
  p: number;
  q: number;
  op: 'add' | 'subtract';
}

/** Evaluating a sum or difference of logarithms. */
const logArithmetic: Generator<ArithmeticParams> = {
  id: 'log-arithmetic',
  sample: (rng, difficulty) => ({
    base: rng.pick(difficulty > 1 ? [2, 3, 4, 5, 6, 10] : [2, 3, 5, 10]),
    p: rng.int(1, difficulty > 1 ? 7 : 5),
    q: rng.int(1, difficulty > 1 ? 7 : 5),
    op: rng.pick(['add', 'subtract'] as const),
  }),
  render: ({ base, p, q, op }) => {
    const first = Math.pow(base, p);
    const second = Math.pow(base, q);
    const value = op === 'add' ? p + q : p - q;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Evaluate. The answer may be negative.' },
      ],
      lead: `${logTex(base, `${first}`)} ${op === 'add' ? '+' : '-'} ${logTex(base, `${second}`)} =`,
      keypad: [],
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, p, q, op }) => {
    const first = Math.pow(base, p);
    const second = Math.pow(base, q);
    return [
      {
        text: 'There are two routes, and they agree. Evaluate each logarithm and then combine, or combine first using the laws and then evaluate.',
      },
      {
        tex: `${logTex(base, `${first}`)} = ${p} \\qquad ${logTex(base, `${second}`)} = ${q}`,
      },
      {
        tex:
          op === 'add'
            ? `${p} + ${q} = ${p + q}`
            : `${p} - ${q} = ${p - q}`,
      },
      {
        tex:
          op === 'add'
            ? `\\log_{b}\\left(m\\right) + \\log_{b}\\left(n\\right) = \\log_{b}\\left(mn\\right)`
            : `\\log_{b}\\left(m\\right) - \\log_{b}\\left(n\\right) = \\log_{b}\\left(\\frac{m}{n}\\right)`,
      },
      {
        text:
          op === 'add'
            ? `The other route multiplies the arguments: $${first} \\times ${second} = ${first * second}$, and $${logTex(base, `${first * second}`)} = ${p + q}$. Adding logarithms multiplies their arguments, which is the whole reason logarithms were invented.`
            : `The other route divides the arguments: $${first} \\div ${second}$, whose logarithm is $${p - q}$. Subtracting logarithms divides their arguments.`,
      },
      {
        text: 'What the laws never do is combine across different bases. Both logarithms here share a base, and without that nothing can be combined at all.',
      },
    ];
  },
};

interface PowerParams {
  base: number;
  p: number;
  k: number;
}

/** The power law, evaluated. */
const powerLaw: Generator<PowerParams> = {
  id: 'log-power-rule',
  sample: (rng, difficulty) => ({
    base: rng.pick(difficulty > 1 ? [2, 3, 4, 5, 6, 10] : [2, 3, 5, 10]),
    p: rng.int(1, difficulty > 1 ? 4 : 3),
    k: rng.int(2, difficulty > 1 ? 6 : 4),
  }),
  render: ({ base, p, k }) => {
    const inner = Math.pow(base, p);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Evaluate.' }],
      lead: `${logTex(base, `${inner}^{${k}}`)} =`,
      keypad: [],
      answer: `${p * k}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, p, k }) => {
    const inner = Math.pow(base, p);
    return [
      {
        text: 'An index inside a logarithm comes out as a multiplier. It follows from the addition law, since a power is a repeated product.',
      },
      { tex: `\\log_{b}\\left(m^{k}\\right) = k\\log_{b}\\left(m\\right)` },
      { tex: `${logTex(base, `${inner}^{${k}}`)} = ${k}${logTex(base, `${inner}`)} = ${k} \\times ${p} = ${p * k}` },
      {
        text: `Bringing the index down is the move that makes logarithms able to solve equations at all: it turns an unknown *index* into an unknown *coefficient*, which ordinary algebra can handle.`,
      },
      {
        text: `The index multiplies the logarithm; it does not become a power of it. $${logTex(base, `${inner}^{${k}}`)}$ is $${p * k}$, not $${Math.pow(p, k)}$.`,
      },
    ];
  },
};

interface CombineParams {
  base: number;
  m: number;
  t: number;
  k: number;
  form: 'sum' | 'difference' | 'coefficient';
}

/**
 * Combining into a single logarithm.
 *
 * A tiles slide, because this is the one question where the *form* of the
 * answer is the entire point — and because a typed answer containing the
 * logarithm of a variable is exactly what this file cannot check.
 */
const combineLogs: Generator<CombineParams> = {
  id: 'log-combine',
  // Every argument stays strictly positive: m and t are at least 2, so no
  // distractor is ever the logarithm of zero or a negative, which would come
  // back indeterminate rather than wrong.
  choices: ({ base, m, t, k, form }) => {
    const lg = (arg: number) => ({ tex: logTex(base, `${arg}`), answer: `log(${arg})/log(${base})` });
    // Filtered by the argument's value, not by how it is written: 4^2 and 2^4
    // are the same number spelt two ways, and a distractor equal to the answer
    // is a second right answer. The "+ 1" option can never collide, so there is
    // always a distractor left however many of the others drop out.
    const against = (right: number, ...wrong: number[]) =>
      wrong.filter((v) => v !== right && v > 0).map(lg);

    if (form === 'sum') {
      return options(lg(m * t), ...against(m * t, m + t, base * m * t), lg(m * t + 1));
    }
    if (form === 'difference') {
      const big = m * t;
      return options(lg(m), ...against(m, big - t + 1, big * t, big + t), lg(m + 1));
    }
    const value = Math.pow(m, k);
    return options(
      { tex: logTex(base, `${m}^{${k}}`), answer: `log(${value})/log(${base})` },
      ...against(value, k * m, m + k, Math.pow(k, m)),
      lg(value + 1),
    );
  },
  sample: (rng, difficulty) => ({
    // Single-digit bases only, unlike every other generator here. This is the
    // one that answers through a tiles template, and a template is split on
    // `{n}`: the `{10}` of `\log_{10}` would be taken for a blank marker,
    // leaving `\log_` to render as an error. Base 10 still appears throughout
    // the other generators and the teaching slides, which use display blocks.
    base: rng.pick(difficulty > 1 ? [2, 3, 4, 5, 7, 9] : [2, 3, 5, 7]),
    m: rng.int(2, difficulty > 1 ? 9 : 7),
    t: rng.int(2, difficulty > 1 ? 9 : 7),
    k: rng.int(2, difficulty > 1 ? 5 : 4),
    form: rng.pick(['sum', 'difference', 'coefficient'] as const),
  }),
  render: ({ base, m, t, k, form }): Slide => {
    if (form === 'sum') {
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: 'Write as a single logarithm.' },
          { kind: 'display', tex: `${logTex(base, `${m}`)} + ${logTex(base, `${t}`)}` },
        ],
        template: `\\log_${base}({0})`,
        bank: bankOf([`${m * t}`], [`${m + t}`, `${m - t}`, `${m}^{${t}}`, `${base * m * t}`]),
        answer: [`${m * t}`],
      };
    }
    if (form === 'difference') {
      // The first argument is built as a multiple of the second, so the
      // quotient tile is a whole number rather than a fraction.
      const big = m * t;
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: 'Write as a single logarithm.' },
          { kind: 'display', tex: `${logTex(base, `${big}`)} - ${logTex(base, `${t}`)}` },
        ],
        template: `\\log_${base}({0})`,
        bank: bankOf([`${m}`], [`${big - t}`, `${big * t}`, `${big + t}`, `${t}`]),
        answer: [`${m}`],
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write as a single logarithm.' },
        { kind: 'display', tex: `${k}${logTex(base, `${m}`)}` },
      ],
      template: `\\log_${base}({0})`,
      bank: bankOf([`${m}^{${k}}`], [`${k}^{${m}}`, `${k * m}`, `${m + k}`, `${m}`]),
      answer: [`${m}^{${k}}`],
    };
  },
  solution: ({ base, m, t, k, form }) =>
    form === 'sum'
      ? [
          { text: 'Adding two logarithms of the same base multiplies their arguments.' },
          { tex: `\\log_{b}\\left(m\\right) + \\log_{b}\\left(n\\right) = \\log_{b}\\left(mn\\right)` },
          { tex: `${logTex(base, `${m}`)} + ${logTex(base, `${t}`)} = ${logTex(base, `${m * t}`)}` },
          {
            text: `Adding the arguments is the standard error: the answer is $${logTex(base, `${m * t}`)}$, not $${logTex(base, `${m + t}`)}$. The *logarithms* add, and that is what makes the arguments multiply.`,
          },
        ]
      : form === 'difference'
        ? [
            { text: 'Subtracting two logarithms of the same base divides their arguments.' },
            {
              tex: `\\log_{b}\\left(m\\right) - \\log_{b}\\left(n\\right) = \\log_{b}\\left(\\frac{m}{n}\\right)`,
            },
            {
              tex: `${logTex(base, `${m * t}`)} - ${logTex(base, `${t}`)} = ${logTex(base, `\\frac{${m * t}}{${t}}`)} = ${logTex(base, `${m}`)}`,
            },
            {
              text: 'The order matters, exactly as it does for ordinary subtraction: the first argument goes on top. Reversing it gives the reciprocal, whose logarithm is the negative of the right answer.',
            },
          ]
        : [
            { text: 'A coefficient in front of a logarithm goes back inside as an index.' },
            { tex: `k\\log_{b}\\left(m\\right) = \\log_{b}\\left(m^{k}\\right)` },
            { tex: `${k}${logTex(base, `${m}`)} = ${logTex(base, `${m}^{${k}}`)}` },
            {
              text: `The coefficient becomes a *power*, not a multiplier of the argument: the answer is $${logTex(base, `${m}^{${k}}`)}$, not $${logTex(base, `${k * m}`)}$.`,
            },
            {
              text: 'This is the law used most often in reverse, to pull an index out in front where it can be divided by.',
            },
          ],
};

interface LawEquationParams {
  base: number;
  k: number;
  n: number;
}

/** Solving an equation that needs a law first. */
const lawEquation: Generator<LawEquationParams> = {
  id: 'log-laws-equation',
  sample: (rng, difficulty) => ({
    base: rng.pick(difficulty > 1 ? [2, 3, 4, 5, 10] : [2, 3, 5, 10]),
    k: rng.int(2, difficulty > 1 ? 12 : 9),
    n: rng.int(1, difficulty > 1 ? 5 : 3),
  }),
  render: ({ base, k, n }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Solve for $x$.' }],
    lead: `${logTex(base, 'x')} - ${logTex(base, `${k}`)} = ${n} \\implies x =`,
    keypad: [],
    answer: `${k * Math.pow(base, n)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, k, n }) => [
    {
      text: 'Combine the two logarithms into one before doing anything else. Subtraction divides the arguments.',
    },
    { tex: `${logTex(base, 'x')} - ${logTex(base, `${k}`)} = ${logTex(base, `\\frac{x}{${k}}`)}` },
    { tex: `${logTex(base, `\\frac{x}{${k}}`)} = ${n} \\iff \\frac{x}{${k}} = ${base}^{${n}} = ${Math.pow(base, n)}` },
    { tex: `x = ${k} \\times ${Math.pow(base, n)} = ${k * Math.pow(base, n)}` },
    {
      text: 'Combine first, then convert to index form. Converting each logarithm separately leaves two unknowns where there was one and gets nowhere.',
    },
    {
      text: `Check the answer keeps every argument positive: $x = ${k * Math.pow(base, n)}$ is positive, so the original equation is genuinely defined there.`,
    },
  ],
};

/* ---------- Level 3: solving with logarithms ---------- */

interface ExponentialParams {
  base: number;
  target: number;
}

/**
 * Solving a^x = c, where c is deliberately not a power of a.
 *
 * If it were, the equation would be solved by matching indices and no logarithm
 * would be needed. The answer is a number rather than an expression in x, so
 * the checker settles it with one evaluation.
 */
const solveExponential: Generator<ExponentialParams> = {
  id: 'log-solve-exponential',
  choices: ({ base, target }) =>
    options(
      { tex: `\\frac{\\ln\\left(${target}\\right)}{\\ln\\left(${base}\\right)}`, answer: `log(${target}) / log(${base})` },
      { tex: `\\frac{\\ln\\left(${base}\\right)}{\\ln\\left(${target}\\right)}`, answer: `log(${base}) / log(${target})` },
      { tex: `\\ln\\left(\\frac{${target}}{${base}}\\right)`, answer: `log(${target} / ${base})` },
      { tex: `\\ln\\left(${target}\\right) - \\ln\\left(${base}\\right)`, answer: `log(${target}) - log(${base})` },
    ),
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 40; tries += 1) {
      const base = rng.int(2, difficulty > 1 ? 9 : 6);
      const target = rng.int(3, difficulty > 1 ? 60 : 40);
      const exact = Math.log(target) / Math.log(base);
      if (Math.abs(exact - Math.round(exact)) > 1e-9) return { base, target };
    }
    return { base: 2, target: 30 };
  },
  render: ({ base, target }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Solve for $x$, exactly. Leave the answer as a quotient of logarithms.',
      },
    ],
    lead: `${base}^{x} = ${target} \\implies x =`,
    keypad: LOG_KEYS,
    answer: `log(${target}) / log(${base})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, target }) => [
    {
      text: `$${target}$ is not a power of $${base}$, so matching indices is not available and a logarithm is needed.`,
    },
    { text: 'Take logarithms of both sides. Any base will do, so use whichever the calculator has.' },
    { tex: `${base}^{x} = ${target} \\implies x\\ln\\left(${base}\\right) = \\ln\\left(${target}\\right)` },
    { tex: `x = \\frac{\\ln\\left(${target}\\right)}{\\ln\\left(${base}\\right)}` },
    {
      text: 'The power law is what made this work: it brought the unknown down from the index into a coefficient, where dividing could reach it.',
    },
    {
      text: 'The answer is a *quotient* of logarithms, not the logarithm of a quotient. Those are different numbers, and confusing them is the usual error here.',
    },
  ],
};

interface NaturalParams {
  k: number;
  target: number;
}

/** ln(t) over k as the learner reads it: a minus in front, and no 1 underneath. */
function lnOver(target: number, k: number): string {
  const ln = `\\ln\\left(${target}\\right)`;
  const sign = k < 0 ? '-' : '';
  return Math.abs(k) === 1 ? `${sign}${ln}` : `${sign}\\frac{${ln}}{${Math.abs(k)}}`;
}

/** Solving e^(kx) = c with natural logarithms. */
const naturalLog: Generator<NaturalParams> = {
  id: 'log-natural',
  // ln(t)/k and ln(t/k) are the same number whenever the k-th root of t is t/k
  // — at t = 4, k = 2 both are ln 2 — so each distractor is checked against the
  // answer's value before it is offered. Dividing by k + 1 never collides,
  // which keeps at least one distractor on every draw.
  // A negative k has no ln(t/k) at all, and k = 1 or -1 loses k ln(t) too, so
  // two more slips wait behind: the minus sign dropped, and k taken away
  // rather than divided. The first three distinct slips are offered.
  choices: ({ k, target }) => {
    const right = Math.log(target) / k;
    const apart = (value: number) => Math.abs(value - right) > 1e-9;
    return options(
      { tex: lnOver(target, k), answer: `log(${target}) / (${k})` },
      ...(apart(Math.log(target / k))
        ? [{ tex: `\\ln\\left(\\frac{${target}}{${k}}\\right)`, answer: `log(${target} / (${k}))` }]
        : []),
      ...(apart(k * Math.log(target))
        ? [{ tex: `${k}\\ln\\left(${target}\\right)`, answer: `(${k}) * log(${target})` }]
        : []),
      // Stepped away from zero, not toward it: at k = -1 a step of +1 would
      // divide by zero, which comes back indeterminate rather than wrong.
      ...[k > 0 ? k + 1 : k - 1].map((alt) => ({
        tex: lnOver(target, alt),
        answer: `log(${target}) / (${alt})`,
      })),
      { tex: lnOver(target, -k), answer: `log(${target}) / (${-k})` },
      {
        tex: `\\ln\\left(${target}\\right) ${k > 0 ? '-' : '+'} ${Math.abs(k)}`,
        answer: `log(${target}) - (${k})`,
      },
    ).slice(0, 4);
  },
  sample: (rng, difficulty) => ({
    k: nonZero(rng.int(difficulty > 1 ? -6 : 2, difficulty > 1 ? 6 : 7), 3),
    target: rng.int(2, difficulty > 1 ? 40 : 25),
  }),
  render: ({ k, target }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$, exactly. Leave a natural logarithm in your answer.' },
    ],
    lead: `e^{${termTex(k, 1)}} = ${target} \\implies x =`,
    keypad: LOG_KEYS,
    answer: `log(${target}) / (${k})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ k, target }) => [
    {
      text: 'The natural logarithm is the logarithm to base $e$, which makes it the exact inverse of the exponential function. Applying it to $e$ raised to something simply removes the exponential.',
    },
    { tex: `\\ln\\left(e^{y}\\right) = y` },
    { tex: `e^{${termTex(k, 1)}} = ${target} \\implies ${termTex(k, 1)} = \\ln\\left(${target}\\right)` },
    { tex: `x = ${lnOver(target, k)}` },
    {
      text: 'Taking logarithms to any other base would work too, but it would leave a logarithm of $e$ behind to simplify. Matching the base to the exponential is what keeps the working clean.',
    },
    {
      text:
        k < 0
          ? 'A negative coefficient gives a negative answer here, which is ordinary: the exponential is decaying rather than growing, so reaching a value above 1 means going backwards in $x$.'
          : 'Divide the whole logarithm by the coefficient. Dividing only part of it is the slip worth watching for.',
    },
  ],
};

interface GrowthParams {
  start: number;
  multiplier: number;
  target: number;
}

/** How many whole steps before a growing quantity passes a threshold. */
const growth: Generator<GrowthParams> = {
  id: 'log-growth',
  // Rounding the wrong way is the characteristic error, so the whole number
  // below is always on offer.
  choices: ({ start, multiplier, target }) => {
    const exact = Math.log(target / start) / Math.log(multiplier);
    const steps = Math.ceil(exact);
    return options(
      { tex: `${steps}`, answer: `${steps}` },
      { tex: `${steps - 1}`, answer: `${steps - 1}` },
      { tex: `${steps + 1}`, answer: `${steps + 1}` },
      { tex: `${Math.round(target / start)}`, answer: `${Math.round(target / start)}` },
    );
  },
  sample: (rng, difficulty) => {
    const starts = [10, 20, 25, 50, 100, 200, 500];
    const targets = difficulty > 1 ? [5_000, 20_000, 50_000, 250_000] : [1_000, 2_000, 5_000, 10_000];
    for (let tries = 0; tries < 40; tries += 1) {
      const start = rng.pick(starts);
      const multiplier = rng.int(2, difficulty > 1 ? 6 : 4);
      const target = rng.pick(targets);
      const steps = Math.log(target / start) / Math.log(multiplier);
      // At least two steps, and never an exact power, so the answer genuinely
      // needs rounding up rather than reading off.
      if (steps > 1.5 && Math.abs(steps - Math.round(steps)) > 1e-9) {
        return { start, multiplier, target };
      }
    }
    return { start: 100, multiplier: 3, target: 10_000 };
  },
  render: ({ start, multiplier, target }) => {
    const steps = Math.ceil(Math.log(target / start) / Math.log(multiplier));
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `A colony of ${start} bacteria multiplies by ${multiplier} every hour. After how many whole hours does it first exceed ${target}?`,
        },
      ],
      lead: '\\text{hours} =',
      keypad: [],
      answer: `${steps}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ start, multiplier, target }) => {
    const exact = Math.log(target / start) / Math.log(multiplier);
    const steps = Math.ceil(exact);
    // A whole ratio is written whole: 50, not 50.00.
    const ratio = Number.isInteger(target / start) ? `${target / start}` : (target / start).toFixed(2);
    return [
      {
        text: `After $n$ hours the colony is $${start} \\times ${multiplier}^{n}$, so the question asks when that first passes $${target}$.`,
      },
      { tex: `${start} \\times ${multiplier}^{n} > ${target} \\implies ${multiplier}^{n} > ${ratio}` },
      {
        tex: `n > \\frac{\\ln\\left(${ratio}\\right)}{\\ln\\left(${multiplier}\\right)} = ${exact.toFixed(3)}`,
      },
      {
        text: `So $n = ${steps}$. The exact value is $${exact.toFixed(3)}$, and since only whole hours count it has to be rounded *up* — at $${steps - 1}$ hours the colony has not yet passed the threshold.`,
      },
      {
        text: 'Rounding the wrong way is the characteristic error in every question of this shape. Check by asking whether the smaller whole number actually satisfies the inequality; here it does not.',
      },
    ];
  },
};


/* ---------- evaluating a chain of logarithms ---------- */

interface LogChainParams {
  /** First log: base^index. */
  aBase: number;
  aIndex: number;
  /** Second log, subtracted. */
  bBase: number;
  bIndex: number;
  /** The whole number added on at the end. */
  extra: number;
}

/**
 * Evaluate a chain of logarithms, one piece at a time.
 *
 * Every other question in this course asks for one logarithm, so a learner can
 * answer the lot without ever deciding what happens first. Here the two logs
 * have to be settled before the subtraction can happen, and the multiplication
 * before the addition — the same precedence question the indices course asks,
 * but with `\log_{2}(32)` standing where a plain number would.
 *
 * That substitution is the point. A logarithm *is* a number; treating it as one
 * is most of what makes the laws usable, and a learner who hesitates at
 * `\log_{2}(32) - \log_{3}(27)` has not yet made that leap.
 */
const logChain: Generator<LogChainParams> = {
  id: 'log-chain-steps',
  choices: ({ aBase, aIndex, bBase, bIndex, extra }) => {
    const correct = (aIndex - bIndex) * extra;
    const wrong = [
      aIndex - bIndex * extra, // the multiplication taken before the bracket
      (aIndex + bIndex) * extra, // subtraction read as addition
      aIndex - bIndex + extra, // the times read as a plus
      Math.pow(aBase, aIndex) - Math.pow(bBase, bIndex), // the logs not taken at all
    ];
    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? HARD_PAIRS : EASY_PAIRS;
    // Indices of at least 2, and the first strictly larger than the second, so
    // the bracket is positive and the question is about order rather than
    // about handling a negative through a multiplication.
    const usable = pool.filter((pair) => pair.index >= 2 && pair.index <= 6);
    const a = rng.pick(usable);
    const smaller = usable.filter((pair) => pair.index < a.index);
    const b = smaller.length > 0 ? rng.pick(smaller) : { base: 2, index: 2 };
    return {
      aBase: a.base,
      aIndex: a.index,
      bBase: b.base,
      bIndex: b.index,
      extra: rng.int(2, difficulty > 1 ? 9 : 5),
    };
  },
  render: ({ aBase, aIndex, bBase, bIndex, extra }): Slide => {
    const aArg = Math.pow(aBase, aIndex);
    const bArg = Math.pow(bBase, bIndex);
    // (log_a - log_b) x extra. The bracket is explicit, so the question is
    // which of the two logs to take first rather than a precedence trap.
    const expr = bin(
      '*',
      bin('-', log(num(aBase), num(aArg)), log(num(bBase), num(bArg))),
      num(extra),
    );
    const gap = aIndex - bIndex;
    const total = gap * extra;

    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 6) break;
        if (!Number.isInteger(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks: {
        // The first log. Reading it as the argument divided by the base is the
        // slip that never quite goes away.
        'r.l.l': offer(aIndex, aArg / aBase, aArg, aBase),
        // The second.
        'r.l.r': offer(bIndex, bArg / bBase, bArg, bBase),
        // The bracket.
        'r.l': offer(gap, aIndex + bIndex, bIndex - aIndex, aIndex * bIndex),
        // The multiplication, last.
        r: offer(total, gap + extra, gap, extra),
      },
    };
  },
  solution: ({ aBase, aIndex, bBase, bIndex, extra }) => {
    const aArg = Math.pow(aBase, aIndex);
    const bArg = Math.pow(bBase, bIndex);
    const gap = aIndex - bIndex;
    return [
      {
        text: 'A logarithm asks what power the base has to be raised to. Answer each one and the line becomes ordinary arithmetic.',
      },
      {
        tex: `\\log_{${aBase}}\\left(${aArg}\\right) = ${aIndex} \\qquad \\log_{${bBase}}\\left(${bArg}\\right) = ${bIndex}`,
      },
      { tex: `\\left(${aIndex} - ${bIndex}\\right) \\times ${extra} = ${gap} \\times ${extra} = ${gap * extra}` },
      {
        text: `The bracket has to be settled before the multiplication, so this is $${gap * extra}$ and not $${aIndex - bIndex * extra}$. Both logs also have to be taken first — neither is a number until it is.`,
      },
    ];
  },
};


/* ---------- a power inside a logarithm ---------- */

interface LogPowerParams {
  /** The base of the logarithm. */
  base: number;
  /** The argument is `base^inner`, raised again to `outer`. */
  inner: number;
  outer: number;
  /** The whole number added on at the end. */
  extra: number;
}

/**
 * Evaluate a logarithm of a power, one piece at a time.
 *
 * The power law says $\log_b(a^n) = n\log_b a$, and the usual way it is
 * practised — rewrite the left side as the right — never makes the learner
 * commit to an order. Here they do. The logarithm is not a number until its
 * argument is one, so the power has to go first; the addition on the end is
 * offered from the start and is the tap that gets it wrong.
 *
 * Working it the long way round is the point rather than a detour. Seeing
 * $\log_{3}(9^{2})$ come out as 4 through $9^{2} = 81$ is what makes
 * $2 \times \log_{3}9$ believable, and the worked solution puts the two side by
 * side.
 */
const logPower: Generator<LogPowerParams> = {
  id: 'log-power-steps',
  choices: ({ base, inner, outer, extra }) => {
    const correct = inner * outer + extra;
    const wrong = [
      inner * (outer + extra), // the addition taken before the logarithm
      inner + outer + extra, // the indices added rather than multiplied
      Math.pow(base, inner) * outer + extra, // the logarithm never taken
      inner * outer - extra,
    ];
    const seen = new Set([correct]);
    const picked: number[] = [];
    for (const value of wrong) {
      if (picked.length === 3) break;
      if (!Number.isInteger(value) || seen.has(value)) continue;
      seen.add(value);
      picked.push(value);
    }
    for (let step = 1; picked.length < 3; step += 1) {
      for (const candidate of [correct + step, correct - step]) {
        if (picked.length === 3) break;
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        picked.push(candidate);
      }
    }
    return options(
      { tex: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
    );
  },
  sample: (rng, difficulty) => {
    // The argument is base^(inner x outer) once the power is taken, so the
    // product of the two indices is capped rather than each one separately —
    // 3^6 is 729, which is a bank of four-figure near-misses.
    const base = rng.pick(difficulty > 1 ? [2, 3, 5, 7] : [2, 3, 5]);
    const ceiling = base === 2 ? 7 : base === 3 ? 5 : 4;
    const inner = rng.int(2, 3);
    const outer = rng.int(2, Math.max(2, Math.floor(ceiling / inner)));
    return { base, inner, outer, extra: rng.int(2, difficulty > 1 ? 12 : 8) };
  },
  render: ({ base, inner, outer, extra }): Slide => {
    const argument = Math.pow(base, inner);
    const raised = Math.pow(argument, outer);
    const logValue = inner * outer;
    const expr = bin('+', log(num(base), pow(num(argument), num(outer))), num(extra));

    const offer = (correct: number, ...near: number[]) => {
      const seen = new Set([correct]);
      const out = [correct];
      for (const value of near) {
        if (out.length >= 6) break;
        if (!Number.isInteger(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
      }
      for (let step = 1; out.length < 6; step += 1) {
        for (const candidate of [correct + step, correct - step]) {
          if (out.length >= 6) break;
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          out.push(candidate);
        }
      }
      return out.sort((x, y) => x - y).map(String);
    };

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'Work this out one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr,
      banks: {
        // The power inside the logarithm. Multiplying instead of raising is the
        // slip that never quite goes away.
        'r.l.v': offer(raised, argument * outer, argument + outer, argument),
        // The logarithm itself, once its argument is a number.
        'r.l': offer(logValue, inner + outer, raised / base, inner),
        // The addition, last.
        r: offer(logValue + extra, logValue * extra, logValue - extra, extra),
      },
    };
  },
  solution: ({ base, inner, outer, extra }) => {
    const argument = Math.pow(base, inner);
    const raised = Math.pow(argument, outer);
    const logValue = inner * outer;
    return [
      {
        text: 'A logarithm is not a number until its argument is one, so the power inside goes first.',
      },
      { tex: `\\left(${argument}\\right)^{${outer}} = ${raised} \\qquad \\log_{${base}}\\left(${raised}\\right) = ${logValue}` },
      { tex: `${logValue} + ${extra} = ${logValue + extra}` },
      {
        text: `The power law gets there without the large number: $\\log_{${base}}\\left(${argument}^{${outer}}\\right) = ${outer} \\times \\log_{${base}}${argument} = ${outer} \\times ${inner} = ${logValue}$. Both routes agree, which is the argument for the law.`,
      },
    ];
  },
};
/* ---------- The same ideas asked through other widgets ---------- */

/**
 * Everything above answers through four shapes: type a number, pick an option,
 * place a tile, reduce a line. A lesson built from them alone reads as the same
 * question over and over even when no two draws are alike, which is the
 * complaint `docs/ROADMAP.md` phase A exists to fix.
 *
 * The eight generators below add the four shapes this topic was missing, and
 * each was chosen because it asks something the typed answer cannot:
 *
 * - a **tree** makes the learner settle each logarithm before the line can be
 *   combined, which is the thing a typed answer lets them skip;
 * - a **flow** asks which law or method applies, where a four-option choice
 *   would be a guess;
 * - a **slider** asks *when* a modelled quantity reaches a level — a question
 *   about a curve, not about a formula;
 * - more **tiles** run the laws backwards, splitting a logarithm rather than
 *   combining one, which is the direction every integration question needs and
 *   no lesson here practised.
 *
 * None of them asks for a typed expression containing the logarithm of a
 * variable, so the constraint at the top of this file still holds.
 */

/**
 * Base-and-index pairs whose base is a single character.
 *
 * A tiles template is split on `{n}`, so the `{10}` of `\log_{10}` would be
 * taken for a blank marker and leave `\log_` to render as an error — the same
 * restriction `log-combine` documents. Base 10 keeps appearing on the teaching
 * slides, which use display blocks and are not split.
 */
const TEMPLATE_PAIRS = EASY_PAIRS.filter((pair) => pair.base < 10 && pair.index >= 2);
const TEMPLATE_PAIRS_HARD = HARD_PAIRS.filter((pair) => pair.base < 10 && pair.index >= 2);

/**
 * A bank of numbers for a tree: the answers, then distractors that are not
 * answers, then — if everything collided — whole numbers above the largest.
 *
 * The top-up is what `bankOf` does not do. A tree's answers are derived from
 * each other (two indices, their sum, the sum less a third), so a distractor
 * computed from the same numbers lands on one of them more often than it
 * sounds, and a bank holding nothing but the answers can be filled by
 * elimination without reading the question.
 */
function treeBank(answer: string[], candidates: string[]): string[] {
  const needed = new Set(answer);
  const extras: string[] = [];
  for (const candidate of [...new Set(candidates)]) {
    if (!needed.has(candidate)) extras.push(candidate);
  }
  const top = Math.max(...answer.map(Number));
  for (let step = 1; extras.length < 2; step += 1) {
    const candidate = `${top + step}`;
    if (!needed.has(candidate) && !extras.includes(candidate)) extras.push(candidate);
  }
  // Numerically rather than lexicographically: every token here is a number,
  // and a bank reading 1, 10, 2 would be a puzzle of its own.
  return [...answer, ...extras].sort((x, y) => Number(x) - Number(y));
}

/**
 * The definition read the other way: from index form to logarithm form.
 *
 * `log-to-index` already asks this as a four-option choice, and the choice is
 * answerable by recognising a shape. Placing the argument and the index
 * yourself is not — the two numbers have to go in the right holes, and putting
 * the value where the index belongs is the error the whole of level 1 is about.
 */
const fromIndex: Generator<PairParams> = {
  id: 'log-from-index',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? TEMPLATE_PAIRS_HARD : TEMPLATE_PAIRS),
  render: ({ base, index }): Slide => {
    const value = Math.pow(base, index);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write the same statement as a logarithm.' },
        { kind: 'display', tex: `${base}^{${index}} = ${value}` },
      ],
      template: `\\log_${base}({0}) = {1}`,
      bank: bankOf(
        [`${value}`, `${index}`],
        [`${base}`, `${index + 1}`, `${base * index}`, `${value * base}`],
      ),
      answer: [`${value}`, `${index}`],
    };
  },
  solution: ({ base, index }) => {
    const value = Math.pow(base, index);
    return [
      { text: 'An index statement and a logarithm statement carry exactly the same information.' },
      { tex: `b^{x} = y \\iff \\log_{b}\\left(y\\right) = x` },
      {
        text: `The base stays the base. What was the *result*, $${value}$, becomes the argument, and what was the *index*, $${index}$, becomes the value.`,
      },
      { tex: `${base}^{${index}} = ${value} \\iff ${logTex(base, `${value}`)} = ${index}` },
      {
        text: `Putting them the other way round gives $${logTex(base, `${index}`)} = ${value}$, which is not true — and is the mistake this question exists to catch.`,
      },
    ];
  },
};

interface TreeParams {
  a: PairParams;
  b: PairParams;
  c: PairParams;
}

/**
 * A line of three logarithms, filled in one node at a time.
 *
 * The typed questions above let a learner answer without ever committing to an
 * order: they read the line, do it in their head, and write a number. Here the
 * three logarithms are separate holes that have to be filled before the sum and
 * the difference underneath them can be, which is the whole claim the laws rest
 * on — that a logarithm *is* a number and can be treated as one.
 *
 * The bases deliberately differ. Nothing can be combined across them, so there
 * is no route through this but evaluating each logarithm on its own.
 */
const logTree: Generator<TreeParams> = {
  id: 'log-tree',
  sample: (rng, difficulty) => {
    // Indices of at least 2 throughout. A logarithm whose value is 1 is
    // recognised rather than worked out, and two of those in a line of three
    // leaves nothing to settle.
    const pool = (difficulty > 1 ? HARD_PAIRS : EASY_PAIRS).filter(
      (pair) => pair.index >= 2 && pair.index <= 6,
    );
    const a = rng.pick(pool);
    const b = rng.pick(pool);
    // The last logarithm is subtracted, so its index is held below the sum of
    // the other two: a negative total is a different question from this one.
    const affordable = pool.filter((pair) => pair.index <= a.index + b.index);
    const c = affordable.length > 0 ? rng.pick(affordable) : { base: 2, index: 1 };
    return { a, b, c };
  },
  render: ({ a, b, c }): Slide => {
    const first = Math.pow(a.base, a.index);
    const second = Math.pow(b.base, b.index);
    const third = Math.pow(c.base, c.index);
    const sum = a.index + b.index;
    const total = sum - c.index;
    const answer = [`${a.index}`, `${b.index}`, `${c.index}`, `${sum}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill in each logarithm along the top, then what the line below it comes to.',
        },
      ],
      expression: `${logTex(a.base, `${first}`)} + ${logTex(b.base, `${second}`)} - ${logTex(c.base, `${third}`)}`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'third', from: [] },
        { id: 'sum', from: ['first', 'second'] },
        { id: 'total', from: ['sum', 'third'] },
      ],
      bank: treeBank(answer, [
        // Reading the argument back instead of the index, the standard slip.
        `${first}`,
        // Adding the third rather than subtracting it.
        `${sum + c.index}`,
        `${a.index * b.index}`,
        `${a.base}`,
      ]),
      answer,
    };
  },
  solution: ({ a, b, c }) => {
    const first = Math.pow(a.base, a.index);
    const second = Math.pow(b.base, b.index);
    const third = Math.pow(c.base, c.index);
    const sum = a.index + b.index;
    return [
      {
        text: 'Take each logarithm on its own first. Each one asks what power its base needs to reach its argument.',
      },
      {
        tex: `${logTex(a.base, `${first}`)} = ${a.index} \\qquad ${logTex(b.base, `${second}`)} = ${b.index} \\qquad ${logTex(c.base, `${third}`)} = ${c.index}`,
      },
      { tex: `${a.index} + ${b.index} = ${sum} \\qquad ${sum} - ${c.index} = ${sum - c.index}` },
      {
        text: 'The three bases are all different, so no law combines any two of them. Evaluating each one separately is not the long way round here — it is the only way.',
      },
    ];
  },
};

interface DomainFlowParams {
  base: number;
  argument: number;
  route: 'undefined' | 'one' | 'whole' | 'between';
}

/**
 * Does this logarithm have a value, and what kind of value?
 *
 * `log-domain` asks the first half of this as a four-option choice, where one
 * option is visibly odd and the answer can be had without a reason. Walking the
 * questions forces the reason, and it carries on past "defined" into the part
 * that actually matters later: most logarithms are perfectly well defined and
 * simply are not whole numbers, which is why a calculator exists.
 */
const domainFlow: Generator<DomainFlowParams> = {
  id: 'log-domain-flow',
  sample: (rng, difficulty) => {
    const base = rng.pick(difficulty > 1 ? [2, 3, 4, 5, 6, 7, 10] : [2, 3, 5, 10]);
    const route = rng.pick(['undefined', 'one', 'whole', 'between'] as const);
    if (route === 'undefined') {
      return { base, argument: rng.chance(0.25) ? 0 : -rng.int(1, difficulty > 1 ? 60 : 30), route };
    }
    if (route === 'one') return { base, argument: 1, route };
    if (route === 'whole') {
      const powers: number[] = [];
      for (let index = 1; Math.pow(base, index) <= 2000; index += 1) {
        powers.push(Math.pow(base, index));
      }
      return { base, argument: rng.pick(powers), route };
    }
    // Positive, not 1, and not a power of the base, so it is defined and is not
    // a whole number.
    for (let tries = 0; tries < 60; tries += 1) {
      const drawn = rng.int(2, difficulty > 1 ? 90 : 50);
      const exact = Math.log(drawn) / Math.log(base);
      if (Math.abs(exact - Math.round(exact)) > 1e-9) return { base, argument: drawn, route };
    }
    return { base, argument: base + 1, route };
  },
  render: ({ base, argument, route }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to say what this logarithm comes to. Each answer decides what gets asked next.',
      },
    ],
    subject: logTex(base, `${argument}`),
    steps: [
      {
        id: 'positive',
        ask: 'Is the number inside the logarithm greater than zero?',
        branches: [
          { label: 'Yes', to: 'one' },
          {
            label: 'No',
            outcome: 'It has no value at all. No power of a positive base is ever zero or negative.',
          },
        ],
      },
      {
        id: 'one',
        ask: 'Is that number 1?',
        branches: [
          { label: 'Yes', outcome: 'The value is 0. Any base to the power zero is 1.' },
          { label: 'No', to: 'power' },
        ],
      },
      {
        id: 'power',
        ask: 'Is it a whole-number power of the base?',
        branches: [
          { label: 'Yes', outcome: 'The value is that whole power.' },
          {
            label: 'No',
            outcome: 'It still has a value — it simply is not a whole number.',
          },
        ],
      },
    ],
    answer:
      route === 'undefined'
        ? ['No']
        : route === 'one'
          ? ['Yes', 'Yes']
          : route === 'whole'
            ? ['Yes', 'No', 'Yes']
            : ['Yes', 'No', 'No'],
  }),
  solution: ({ base, argument, route }) => {
    if (route === 'undefined') {
      return [
        {
          text: `$${base}$ raised to any power at all is positive, so nothing can make it ${argument === 0 ? 'zero' : 'negative'}.`,
        },
        { tex: `${base}^{x} = ${argument} \\quad \\text{has no solution}` },
        {
          text: 'The first question stops the walk. Everything below it assumes there is a value to describe.',
        },
      ];
    }
    if (route === 'one') {
      return [
        { text: 'The argument is positive, so there is a value — and it is the one worth knowing on sight.' },
        { tex: `${base}^{0} = 1 \\implies ${logTex(base, '1')} = 0` },
        {
          text: 'Every logarithm of 1 is zero, whatever the base. It is the one value that does not depend on the base at all.',
        },
      ];
    }
    if (route === 'whole') {
      const index = Math.round(Math.log(argument) / Math.log(base));
      return [
        { text: `The argument is positive and it is not 1, so the last question decides it.` },
        { tex: `${base}^{${index}} = ${argument} \\implies ${logTex(base, `${argument}`)} = ${index}` },
        {
          text: 'A whole answer only happens when the argument is an exact power of the base. That is the uncommon case, not the normal one.',
        },
      ];
    }
    const exact = Math.log(argument) / Math.log(base);
    const below = Math.floor(exact);
    return [
      { text: `$${argument}$ is positive and is not 1, so there is a value.` },
      {
        tex: `${base}^{${below}} = ${Math.pow(base, below)} < ${argument} < ${Math.pow(base, below + 1)} = ${base}^{${below + 1}}`,
      },
      {
        text: `So $${logTex(base, `${argument}`)}$ sits between $${below}$ and $${below + 1}$ — about $${exact.toFixed(2)}$. Defined, but not whole, which is the ordinary case.`,
      },
    ];
  },
};

interface LawFlowParams {
  base: number;
  other: number;
  m: number;
  n: number;
  k: number;
  route: 'sum' | 'difference' | 'power' | 'single' | 'mixed';
}

/**
 * Which law does this expression call for, if any?
 *
 * Every other question in level 2 names the law in the lesson title and then
 * asks the learner to run it. Choosing is the separate skill, and the two
 * cases a lesson never sets — nothing to combine, and two different bases —
 * are exactly the ones that go wrong in an exam, where the expression arrives
 * without a heading above it.
 */
const lawFlow: Generator<LawFlowParams> = {
  id: 'log-law-flow',
  sample: (rng, difficulty) => {
    const bases = difficulty > 1 ? [2, 3, 4, 5, 6, 7, 10] : [2, 3, 5, 10];
    const base = rng.pick(bases);
    const others = bases.filter((candidate) => candidate !== base);
    return {
      base,
      other: rng.pick(others),
      m: rng.int(2, difficulty > 1 ? 40 : 20),
      n: rng.int(2, difficulty > 1 ? 40 : 20),
      k: rng.int(2, difficulty > 1 ? 7 : 5),
      route: rng.pick(['sum', 'difference', 'power', 'single', 'mixed'] as const),
    };
  },
  render: ({ base, other, m, n, k, route }): Slide => {
    const subject =
      route === 'sum'
        ? `${logTex(base, `${m}`)} + ${logTex(base, `${n}`)}`
        : route === 'difference'
          ? `${logTex(base, `${m}`)} - ${logTex(base, `${n}`)}`
          : route === 'power'
            ? `${k}${logTex(base, `${m}`)}`
            : route === 'single'
              ? logTex(base, `${m}`)
              : `${logTex(base, `${m}`)} + ${logTex(other, `${n}`)}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide what, if anything, turns this into a single logarithm.',
        },
      ],
      subject,
      steps: [
        {
          id: 'count',
          ask: 'Is there more than one logarithm here?',
          branches: [
            { label: 'Yes', to: 'base' },
            { label: 'No', to: 'coefficient' },
          ],
        },
        {
          id: 'base',
          ask: 'Do they share a base?',
          branches: [
            { label: 'Yes', to: 'sign' },
            {
              label: 'No',
              outcome: 'Nothing combines. No law joins logarithms of different bases.',
            },
          ],
        },
        {
          id: 'sign',
          ask: 'Are they added or subtracted?',
          branches: [
            { label: 'Added', outcome: 'Multiply the arguments: $\\log_{b}\\left(mn\\right)$.' },
            {
              label: 'Subtracted',
              outcome: 'Divide the arguments, first over second: $\\log_{b}\\left(\\frac{m}{n}\\right)$.',
            },
          ],
        },
        {
          id: 'coefficient',
          ask: 'Is there a number in front of it?',
          branches: [
            { label: 'Yes', outcome: 'Power law: the number goes inside as an index.' },
            { label: 'No', outcome: 'It is already a single logarithm. There is nothing to do.' },
          ],
        },
      ],
      answer:
        route === 'sum'
          ? ['Yes', 'Yes', 'Added']
          : route === 'difference'
            ? ['Yes', 'Yes', 'Subtracted']
            : route === 'mixed'
              ? ['Yes', 'No']
              : route === 'power'
                ? ['No', 'Yes']
                : ['No', 'No'],
    };
  },
  solution: ({ base, other, m, n, k, route }) => {
    if (route === 'sum') {
      return [
        { text: 'Two logarithms, same base, added. The addition law applies.' },
        { tex: `${logTex(base, `${m}`)} + ${logTex(base, `${n}`)} = ${logTex(base, `${m * n}`)}` },
        {
          text: `Adding the arguments instead would give $${logTex(base, `${m + n}`)}$, which is a different number. The logarithms add; the arguments multiply.`,
        },
      ];
    }
    if (route === 'difference') {
      return [
        { text: 'Two logarithms, same base, subtracted. The subtraction law applies.' },
        {
          tex: `${logTex(base, `${m}`)} - ${logTex(base, `${n}`)} = ${logTex(base, `\\frac{${m}}{${n}}`)}`,
        },
        {
          text: 'The order matters: the first argument goes on top. Swapping them gives the reciprocal, whose logarithm is the negative of this.',
        },
      ];
    }
    if (route === 'mixed') {
      return [
        {
          text: `The bases are different — one is $${base}$ and the other is $${other}$ — and every law in this level starts by assuming they match.`,
        },
        { tex: `\\log_{b}\\left(m\\right) + \\log_{c}\\left(n\\right) \\neq \\log_{b}\\left(mn\\right)` },
        {
          text: 'These can be joined, but only after a change of base puts both over one base first. Nothing in this level does that, so the honest answer here is that nothing combines.',
        },
      ];
    }
    if (route === 'power') {
      return [
        { text: 'One logarithm with a number in front of it. That is the power law, used backwards.' },
        { tex: `${k}${logTex(base, `${m}`)} = ${logTex(base, `${m}^{${k}}`)}` },
        {
          text: `The coefficient becomes an *index*, not a multiplier of the argument: $${logTex(base, `${k * m}`)}$ would be a different number.`,
        },
      ];
    }
    return [
      { text: 'One logarithm, no coefficient, nothing to join it to.' },
      { tex: logTex(base, `${m}`) },
      {
        text: 'Recognising that there is nothing to do is worth as much as knowing the laws. Reaching for one here produces working that cannot be checked and an answer no simpler than the question.',
      },
    ];
  },
};

interface SplitParams {
  base: number;
  m: number;
  n: number;
  k: number;
  form: 'product' | 'quotient' | 'power';
}

/**
 * The laws run backwards: one logarithm pulled apart into two.
 *
 * `log-combine` only ever goes the other way, and the two directions are not
 * the same skill. Splitting is the one integration and differentiation
 * actually need — $\log(x^2/3)$ has to come apart before it can be
 * differentiated term by term — and it is the direction that makes the
 * power law look like a way of getting an index out of the way.
 */
const splitLogs: Generator<SplitParams> = {
  id: 'log-split',
  sample: (rng, difficulty) => ({
    // Single-digit bases only, for the same template reason as `log-combine`.
    base: rng.pick(difficulty > 1 ? [2, 3, 4, 5, 7, 9] : [2, 3, 5, 7]),
    m: rng.pick(difficulty > 1 ? [2, 3, 5, 7, 11] : [2, 3, 5, 7]),
    n: rng.int(3, difficulty > 1 ? 9 : 6),
    k: rng.int(2, difficulty > 1 ? 5 : 4),
    form: rng.pick(['product', 'quotient', 'power'] as const),
  }),
  render: ({ base, m, n, k, form }): Slide => {
    if (form === 'product') {
      const product = m * n;
      // A distractor that pairs with another tile to make the same product
      // would be a second right answer, and `unordered` cannot tell them
      // apart. Checked against the whole bank rather than against the answer.
      const offered = [`${m}`, `${n}`];
      for (const candidate of [`${m + n}`, `${product}`, `${n + 1}`, `${product + n}`]) {
        if (offered.includes(candidate)) continue;
        const pairs = offered.some((token) => Number(token) * Number(candidate) === product);
        if (!pairs) offered.push(candidate);
      }
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: 'Write this as two logarithms added together.' },
          { kind: 'display', tex: logTex(base, `${product}`) },
        ],
        template: `\\log_${base}({0}) + \\log_${base}({1})`,
        bank: [...offered].sort((x, y) => Number(x) - Number(y)),
        answer: [`${m}`, `${n}`],
        // Either factor may go first: the addition does not care, and marking
        // a learner wrong for writing them the other way round would be a lie
        // about the maths.
        unordered: true,
      };
    }
    if (form === 'quotient') {
      // One more than a multiple of the denominator, so the fraction does not
      // cancel: a quotient that simplifies to a whole number invites the
      // learner to simplify it and hands back a single logarithm, which is not
      // what the question asked for.
      const top = m * n + 1;
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: 'Write this as one logarithm take away another.' },
          { kind: 'display', tex: logTex(base, `\\frac{${top}}{${n}}`) },
        ],
        template: `\\log_${base}({0}) - \\log_${base}({1})`,
        bank: bankOf([`${top}`, `${n}`], [`${m}`, `${top - n}`, `${top * n}`, `${n + 1}`]),
        answer: [`${top}`, `${n}`],
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Bring the index out in front.' },
        { kind: 'display', tex: logTex(base, `${m}^{${k}}`) },
      ],
      template: `{0}\\log_${base}({1})`,
      bank: bankOf([`${k}`, `${m}`], [`${m * k}`, `${m + k}`, `${k + 1}`, `${base}`]),
      answer: [`${k}`, `${m}`],
    };
  },
  solution: ({ base, m, n, k, form }) => {
    if (form === 'product') {
      return [
        {
          text: `Splitting a logarithm needs the argument written as a product, so start by factorising it: $${m * n} = ${m} \\times ${n}$.`,
        },
        { tex: `\\log_{b}\\left(mn\\right) = \\log_{b}\\left(m\\right) + \\log_{b}\\left(n\\right)` },
        {
          tex: `${logTex(base, `${m * n}`)} = ${logTex(base, `${m}`)} + ${logTex(base, `${n}`)}`,
        },
        {
          text: 'Either factor may be written first — addition does not care about order. What it does care about is that they multiply to the original argument, not add to it.',
        },
      ];
    }
    if (form === 'quotient') {
      const top = m * n + 1;
      return [
        { text: 'A fraction inside a logarithm comes apart as a subtraction, top minus bottom.' },
        {
          tex: `\\log_{b}\\left(\\frac{m}{n}\\right) = \\log_{b}\\left(m\\right) - \\log_{b}\\left(n\\right)`,
        },
        { tex: `${logTex(base, `\\frac{${top}}{${n}}`)} = ${logTex(base, `${top}`)} - ${logTex(base, `${n}`)}` },
        {
          text: `The order is fixed here in a way the product is not. Writing it the other way round gives $${logTex(base, `\\frac{${n}}{${top}}`)}$, whose value is the negative of this one.`,
        },
      ];
    }
    return [
      { text: 'An index inside a logarithm comes out as a multiplier in front of it.' },
      { tex: `\\log_{b}\\left(m^{k}\\right) = k\\log_{b}\\left(m\\right)` },
      { tex: `${logTex(base, `${m}^{${k}}`)} = ${k}${logTex(base, `${m}`)}` },
      {
        text: `The index becomes the coefficient and the argument is left alone: $${k}${logTex(base, `${m}`)}$, not $${logTex(base, `${m * k}`)}$. This is the move that makes an unknown index reachable by ordinary algebra.`,
      },
    ];
  },
};

interface ExponentialTilesParams {
  base: number;
  target: number;
  form: 'takelogs' | 'quotient';
}

/**
 * The two lines of working that solve `a^x = c`, assembled rather than typed.
 *
 * `log-solve-exponential` asks for the finished answer, and a learner who has
 * memorised "log of the right over log of the left" gets it without ever
 * seeing why. These are the same question stopped one line earlier: the step
 * where the power law brings `x` down, and the step where dividing reaches it.
 *
 * The `quotient` form exists because the characteristic error is not
 * arithmetic — it is writing the quotient upside down, and no amount of
 * practice at the finished formula catches that.
 */
const exponentialTiles: Generator<ExponentialTilesParams> = {
  id: 'log-exponential-tiles',
  sample: (rng, difficulty) => {
    for (let tries = 0; tries < 40; tries += 1) {
      const base = rng.int(2, difficulty > 1 ? 9 : 6);
      const target = rng.int(3, difficulty > 1 ? 60 : 40);
      const exact = Math.log(target) / Math.log(base);
      if (Math.abs(exact - Math.round(exact)) > 1e-9) {
        return { base, target, form: rng.pick(['takelogs', 'quotient'] as const) };
      }
    }
    return { base: 2, target: 30, form: 'quotient' as const };
  },
  render: ({ base, target, form }): Slide => {
    const bank = bankOf(
      form === 'takelogs' ? [`${base}`, `${target}`] : [`${target}`, `${base}`],
      [`${base + target}`, `${base * target}`, `${target - base}`, `${base + 1}`],
    );
    if (form === 'takelogs') {
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: 'Take logarithms of both sides and bring the index down. Fill in the line that follows.',
          },
          { kind: 'display', tex: `${base}^{x} = ${target}` },
        ],
        template: `x \\ln({0}) = \\ln({1})`,
        bank,
        answer: [`${base}`, `${target}`],
      };
    }
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Finish the solution.' },
        { kind: 'display', tex: `${base}^{x} = ${target}` },
      ],
      template: `x = \\ln({0}) / \\ln({1})`,
      bank,
      answer: [`${target}`, `${base}`],
    };
  },
  solution: ({ base, target, form }) => [
    {
      text: `$${target}$ is not a power of $${base}$, so the indices cannot simply be matched and a logarithm is needed.`,
    },
    { tex: `${base}^{x} = ${target} \\implies \\ln\\left(${base}^{x}\\right) = \\ln\\left(${target}\\right)` },
    { tex: `x\\ln\\left(${base}\\right) = \\ln\\left(${target}\\right)` },
    ...(form === 'takelogs'
      ? [
          {
            text: 'That second line is the whole trick. The power law moved $x$ out of the index and into a coefficient, where dividing can reach it.',
          },
        ]
      : [
          { tex: `x = \\frac{\\ln\\left(${target}\\right)}{\\ln\\left(${base}\\right)}` },
          {
            text: `The logarithm of the *right* side goes on top. Upside down it would read $\\frac{\\ln\\left(${base}\\right)}{\\ln\\left(${target}\\right)}$, which is the reciprocal and the usual wrong answer.`,
          },
        ]),
  ],
};

interface DecayParams {
  end: number;
  factor: number;
  steps: number;
  direction: 'decay' | 'growth';
}

/** Rates whose change over the whole run stays readable on one picture. */
const DECAY_RATES = [
  { factor: 2, steps: 2 },
  { factor: 2, steps: 3 },
  { factor: 2, steps: 4 },
  { factor: 3, steps: 2 },
  { factor: 4, steps: 2 },
];
const DECAY_RATES_HARD = [...DECAY_RATES, { factor: 2, steps: 5 }, { factor: 3, steps: 3 }];
const GROWTH_RATES = [
  ...DECAY_RATES,
  { factor: 2, steps: 5 },
  { factor: 3, steps: 3 },
];
const GROWTH_RATES_HARD = [...GROWTH_RATES, { factor: 2, steps: 6 }, { factor: 4, steps: 3 }];

/**
 * When does a modelled quantity reach a given level?
 *
 * `log-growth` asks this in words and takes a typed number, which can be
 * answered by running the formula without ever picturing the curve. Here the
 * curve is the question: the level is drawn across it, and the learner drags
 * until the marker meets it.
 *
 * The answer is the same number either way, and that is the point — the two
 * questions are a check on each other, and a learner who can only do one of
 * them has half the idea.
 */
const decaySlider: Generator<DecayParams> = {
  id: 'log-decay-slider',
  sample: (rng, difficulty) => {
    const direction = rng.pick(['decay', 'growth'] as const);
    const rates =
      direction === 'decay'
        ? difficulty > 1
          ? DECAY_RATES_HARD
          : DECAY_RATES
        : difficulty > 1
          ? GROWTH_RATES_HARD
          : GROWTH_RATES;
    const rate = rng.pick(rates);
    const end = rng.pick(difficulty > 1 ? [5, 10, 20, 25, 50, 100, 200, 400] : [5, 10, 20, 25, 50, 100]);
    return { end, factor: rate.factor, steps: rate.steps, direction };
  },
  render: ({ end, factor, steps, direction }): Slide => {
    const change = Math.pow(factor, steps);
    // `end` is the level the curve has to reach, so the start is worked
    // backwards from it — which is what keeps every value on the picture whole.
    const start = direction === 'decay' ? end * change : end;
    const target = direction === 'decay' ? end : end * change;
    const f = (t: number) => start * Math.pow(direction === 'decay' ? 1 / factor : factor, t);
    const xMax = 8;
    const svg = plotSvg({
      xMin: 0,
      xMax,
      curves: [{ f }],
      horizontals: [target],
      yMin: 0,
      // The window is built around the level being asked about, not around the
      // whole curve, and both directions run off the top of it on purpose.
      // Fitting a decay curve from its starting value presses the level flat
      // against the axis, and the crossing — the thing the question is about —
      // becomes unreadable. Drawn this way the curve passes through the middle
      // of the picture and meets the dashed line where it can be seen.
      yMax: target * 3,
      label: direction === 'decay' ? 'A quantity falling over time' : 'A quantity growing over time',
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            direction === 'decay'
              ? `A sample of ${start} grams is divided by ${factor} every hour. The dashed line is ${target} grams. Slide to the hour it reaches that line.`
              : `A culture of ${start} cells multiplies by ${factor} every hour. The dashed line is ${target} cells. Slide to the hour it reaches that line.`,
        },
      ],
      min: 0,
      max: xMax,
      step: 1,
      answer: steps,
      readout: '\\text{hours} = {v}',
      figure: { svg, xMin: 0, xMax },
    };
  },
  solution: ({ end, factor, steps, direction }) => {
    const change = Math.pow(factor, steps);
    const start = direction === 'decay' ? end * change : end;
    const target = direction === 'decay' ? end : end * change;
    return [
      {
        text:
          direction === 'decay'
            ? `After $t$ hours the sample is $${start} \\div ${factor}^{t}$, and the question asks when that equals $${target}$.`
            : `After $t$ hours the culture is $${start} \\times ${factor}^{t}$, and the question asks when that equals $${target}$.`,
      },
      { tex: `${factor}^{t} = ${change}` },
      {
        tex: `t = \\frac{\\ln\\left(${change}\\right)}{\\ln\\left(${factor}\\right)} = ${steps}`,
      },
      {
        text: `Counting along the curve gives the same $${steps}$: each hour ${direction === 'decay' ? 'divides' : 'multiplies'} the amount by $${factor}$, and it takes $${steps}$ of those to ${direction === 'decay' ? 'come down' : 'get'} from $${start}$ to $${target}$.`,
      },
      {
        text: 'Reading the level off the curve and computing it with a logarithm are the same question. Being able to do only one of them is where modelling questions come unstuck.',
      },
    ];
  },
};

interface MethodParams {
  base: number;
  index: number;
  target: number;
  coefficient: number;
  route: 'index-form' | 'natural' | 'match' | 'take-logs';
}

/**
 * Which method does this equation call for?
 *
 * Level 3 teaches three of them — rewrite in index form, match indices, take
 * logarithms — and every lesson tells the learner which one before asking. The
 * skill that survives the lesson is picking, and the case worth practising
 * most is the one a learner over-applies: an equation whose right-hand side is
 * an exact power needs no logarithm at all.
 */
const methodFlow: Generator<MethodParams> = {
  id: 'log-method-flow',
  sample: (rng, difficulty) => {
    const base = rng.pick(difficulty > 1 ? [2, 3, 4, 5, 6, 7] : [2, 3, 5]);
    const index = rng.int(2, difficulty > 1 ? 6 : 4);
    let target = rng.int(3, difficulty > 1 ? 60 : 40);
    for (let tries = 0; tries < 40; tries += 1) {
      const exact = Math.log(target) / Math.log(base);
      if (Math.abs(exact - Math.round(exact)) > 1e-9) break;
      target = rng.int(3, difficulty > 1 ? 60 : 40);
    }
    return {
      base,
      index,
      target,
      coefficient: rng.int(2, difficulty > 1 ? 6 : 4),
      route: rng.pick(['index-form', 'natural', 'match', 'take-logs'] as const),
    };
  },
  render: ({ base, index, target, coefficient, route }): Slide => {
    const subject =
      route === 'index-form'
        ? `${logTex(base, 'x')} = ${index}`
        : route === 'natural'
          ? `e^{${coefficient}x} = ${target}`
          : route === 'match'
            ? `${base}^{x} = ${Math.pow(base, index)}`
            : `${base}^{x} = ${target}`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide how you would solve this. Each answer chooses what gets asked next.',
        },
      ],
      subject,
      steps: [
        {
          id: 'where',
          ask: 'Is the unknown up in the index?',
          branches: [
            { label: 'Yes', to: 'natural' },
            {
              label: 'No — it is inside a logarithm',
              outcome: 'Rewrite the equation in index form and read the answer off.',
            },
          ],
        },
        {
          id: 'natural',
          ask: 'Is the base $e$?',
          branches: [
            { label: 'Yes', outcome: 'Take natural logarithms — they undo $e$ exactly.' },
            { label: 'No', to: 'exact' },
          ],
        },
        {
          id: 'exact',
          ask: 'Is the other side an exact power of that base?',
          branches: [
            { label: 'Yes', outcome: 'Match the indices. No logarithm is needed at all.' },
            {
              label: 'No',
              outcome: 'Take logarithms of both sides, then divide to reach the unknown.',
            },
          ],
        },
      ],
      answer:
        route === 'index-form'
          ? ['No — it is inside a logarithm']
          : route === 'natural'
            ? ['Yes', 'Yes']
            : route === 'match'
              ? ['Yes', 'No', 'Yes']
              : ['Yes', 'No', 'No'],
    };
  },
  solution: ({ base, index, target, coefficient, route }) => {
    if (route === 'index-form') {
      return [
        { text: 'The unknown is the argument of a logarithm, not an index, so no logarithm has to be taken.' },
        { tex: `${logTex(base, 'x')} = ${index} \\iff x = ${base}^{${index}} = ${Math.pow(base, index)}` },
        {
          text: 'Converting to index form is the first thing to try whenever the unknown is inside a logarithm. It usually finishes the question on its own.',
        },
      ];
    }
    if (route === 'natural') {
      return [
        { text: `The base is $e$, and the natural logarithm is its exact inverse.` },
        {
          tex: `e^{${coefficient}x} = ${target} \\implies ${coefficient}x = \\ln\\left(${target}\\right)`,
        },
        { tex: `x = \\frac{\\ln\\left(${target}\\right)}{${coefficient}}` },
        {
          text: 'Any base would work, but taking logarithms to base 10 here would leave a $\\ln$ of $e$ behind to tidy up. Matching the base to the exponential is what keeps the working short.',
        },
      ];
    }
    if (route === 'match') {
      const value = Math.pow(base, index);
      return [
        {
          text: `$${value}$ is exactly $${base}^{${index}}$, so both sides are already powers of the same base.`,
        },
        { tex: `${base}^{x} = ${base}^{${index}} \\implies x = ${index}` },
        {
          text: 'Reaching for a logarithm here gives the same answer after three more lines. Checking whether the right-hand side is an exact power costs nothing and often saves the whole calculation.',
        },
      ];
    }
    return [
      {
        text: `$${target}$ is not a power of $${base}$, so matching indices is not available.`,
      },
      { tex: `${base}^{x} = ${target} \\implies x\\ln\\left(${base}\\right) = \\ln\\left(${target}\\right)` },
      { tex: `x = \\frac{\\ln\\left(${target}\\right)}{\\ln\\left(${base}\\right)}` },
      {
        text: 'The power law is what makes this work: it brings the unknown down from the index, where ordinary algebra can get at it.',
      },
    ];
  },
};

/* ---------- Level 4: change of base ---------- */

/**
 * Level 4 is where a logarithm stops having to be to a friendly base.
 *
 * The one fact the level teaches is `log_a(b) = log_c(b) / log_c(a)`, and most
 * of what it asks is what that fact is *for*: reaching a base the calculator
 * has, cancelling a chain of logarithms, solving an index equation whose answer
 * is not whole, and spotting when two numbers share a base so the answer comes
 * out as an exact fraction instead of a decimal.
 *
 * The constraint at the top of this file still holds. Nothing here asks for a
 * typed logarithm of a variable: answers are numbers, exact fractions, or
 * quotients of logarithms of numbers, and every one settles in a single
 * evaluation. The `reduce` and `evaluate` questions only use the cases where
 * every logarithm on the line is whole — a change of base usually is not, and
 * a bank of decimals would turn an order question into a calculator question.
 */

/** For an answer that is an exact fraction, which the base keypad cannot type. */
const FRACTION_KEYS: KeypadKey[] = [{ insert: '/' }, { insert: '(' }, { insert: ')' }];

/** p/q in lowest terms, with any sign carried on the numerator. */
function reduced(p: number, q: number): [number, number] {
  const g = gcd(p, q);
  const sign = q < 0 ? -1 : 1;
  return [(sign * p) / g, (sign * q) / g];
}

/** The fraction `fracTex` shows, for the checker. Never displayed. */
function fracAnswer(p: number, q: number): string {
  const [n, d] = reduced(p, q);
  return `(${n}) / (${d})`;
}

/** True when `n` is a whole-number power of `base`, 1 included. */
function isPowerOf(n: number, base: number): boolean {
  let value = 1;
  while (value < n) value *= base;
  return value === n;
}

/**
 * The smallest number `n` is a whole power of: 8 gives 2, 36 gives 6, and a
 * number that is no power of anything smaller gives itself. Two numbers share
 * a base exactly when this agrees on them.
 */
function rootOf(n: number): number {
  for (let candidate = 2; candidate < n; candidate += 1) {
    if (isPowerOf(n, candidate)) return candidate;
  }
  return n;
}

/**
 * A whole number in [lo, hi] that is not a power of `base`, so its logarithm
 * to that base is not whole and a change of base is genuinely needed.
 */
function nonPower(rng: Rng, base: number, lo: number, hi: number): number {
  for (let tries = 0; tries < 60; tries += 1) {
    const drawn = rng.int(lo, hi);
    if (drawn !== base && !isPowerOf(drawn, base)) return drawn;
  }
  // The number after the base is never a power of it.
  return base + 1;
}

/** ln(v), as it is written. */
function lnTex(argument: number | string): string {
  return `\\ln\\left(${argument}\\right)`;
}

/** ln(top) / ln(bottom), stacked. */
function lnQuotientTex(top: number | string, bottom: number | string): string {
  return `\\frac{${lnTex(top)}}{${lnTex(bottom)}}`;
}

/**
 * A reduce bank of six whole numbers: the value, the slips it invites, then
 * near misses until there are enough. The same shape the chain generators
 * above build inline, shared here because this level has three of them.
 */
function wholeBank(correct: number, ...near: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of near) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  for (let gap = 1; out.length < 6; gap += 1) {
    for (const candidate of [correct + gap, correct - gap]) {
      if (out.length >= 6) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((x, y) => x - y).map(String);
}

/** Four whole-number options for an `evaluate` form: the value and three slips. */
function wholeOptions(correct: number, ...wrong: number[]): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of wrong) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  for (let gap = 1; picked.length < 3; gap += 1) {
    for (const candidate of [correct + gap, correct - gap]) {
      if (picked.length === 3) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      picked.push(candidate);
    }
  }
  return options({ tex: `${correct}` }, ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })));
}

interface ChangeParams {
  base: number;
  argument: number;
}

/** The change of base formula itself, onto natural logarithms. */
const changeBase: Generator<ChangeParams> = {
  id: 'log-change-base',
  // Upside down is the characteristic error; the log of the quotient and the
  // quotient with the logarithms dropped are the two ways of misreading the
  // fraction as something a law applies to.
  choices: ({ base, argument }) =>
    options(
      { tex: lnQuotientTex(argument, base), answer: `log(${argument}) / log(${base})` },
      { tex: lnQuotientTex(base, argument), answer: `log(${base}) / log(${argument})` },
      { tex: lnTex(`\\frac{${argument}}{${base}}`), answer: `log(${argument} / ${base})` },
      { tex: `\\frac{${argument}}{${base}}`, answer: `${argument} / ${base}` },
    ),
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 12 : 7);
    return { base, argument: nonPower(rng, base, 3, difficulty > 1 ? 99 : 40) };
  },
  render: ({ base, argument }) => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Rewrite using natural logarithms, as one logarithm divided by another.',
      },
    ],
    lead: `${logTex(base, `${argument}`)} =`,
    keypad: LOG_KEYS,
    answer: `log(${argument}) / log(${base})`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ base, argument }) => {
    const value = Math.log(argument) / Math.log(base);
    return [
      {
        text: `A calculator has $\\ln$ and $\\log_{10}$ buttons and usually nothing for base $${base}$. The change of base formula moves any logarithm onto a base you can reach.`,
      },
      { tex: `\\log_{a}\\left(b\\right) = \\frac{\\ln\\left(b\\right)}{\\ln\\left(a\\right)}` },
      { tex: `${logTex(base, `${argument}`)} = ${lnQuotientTex(argument, base)} \\approx ${value.toFixed(3)}` },
      {
        text: `The argument, $${argument}$, goes on top and the base, $${base}$, underneath. Upside down it reads $${lnQuotientTex(base, argument)} \\approx ${(1 / value).toFixed(3)}$, which is $${logTex(argument, `${base}`)}$ — a different logarithm.`,
      },
    ];
  },
};

interface ChangeTilesParams {
  base: number;
  argument: number;
  /** The base being changed to. One character, for the tiles template. */
  target: number;
}

/**
 * The formula again, onto a base the question names.
 *
 * `log-change-base` always lands on `ln`, and a learner can come away thinking
 * `ln` is part of the rule. Here the new base changes from question to question,
 * which is the point of the formula: any base will do, so long as it is the same
 * one top and bottom.
 */
const changeBaseTiles: Generator<ChangeTilesParams> = {
  id: 'log-change-base-tiles',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 12 : 9);
    const argument = nonPower(rng, base, 3, difficulty > 1 ? 60 : 40);
    // Single-digit targets only: `\log_{10}` in a template would lose its `{10}`
    // to the blank-marker split, as `log-combine` documents.
    const targets = [2, 3, 4, 5, 6, 7, 8, 9].filter((t) => t !== base && t !== argument);
    return { base, argument, target: rng.pick(targets) };
  },
  render: ({ base, argument, target }): Slide => ({
    kind: 'tiles',
    prompt: [
      { kind: 'prose', text: `Change the base to $${target}$.` },
      { kind: 'display', tex: logTex(base, `${argument}`) },
    ],
    template: `\\log_${target}({0}) / \\log_${target}({1})`,
    bank: bankOf(
      [`${argument}`, `${base}`],
      [
        `${argument * base}`,
        `${argument + base}`,
        `${target}`,
        ...(argument > base ? [`${argument - base}`] : []),
      ],
    ),
    answer: [`${argument}`, `${base}`],
  }),
  solution: ({ base, argument, target }) => [
    { text: 'The change of base formula works with any new base, provided the same one is used top and bottom.' },
    { tex: `\\log_{a}\\left(b\\right) = \\frac{\\log_{c}\\left(b\\right)}{\\log_{c}\\left(a\\right)}` },
    {
      tex: `${logTex(base, `${argument}`)} = \\frac{${logTex(target, `${argument}`)}}{${logTex(target, `${base}`)}}`,
    },
    {
      text: `The old argument, $${argument}$, stays on top and the old base, $${base}$, goes underneath. The new base $${target}$ only appears as the subscript, and changing it to any other number would give the same value.`,
    },
  ],
};

/**
 * Where a^x meets b, found by the formula and checked on the curve.
 *
 * Every other question in this level leaves the answer as a quotient of
 * logarithms. This one asks what number that quotient actually is, with the two
 * natural logarithms supplied the way a calculator would give them, and draws
 * `y = a^x` against the level `b` so the learner can see the answer is where
 * the curve reaches the line.
 */
const changeBaseSlider: Generator<ChangeParams> = {
  id: 'log-change-base-slider',
  sample: (rng, difficulty) => {
    const base = rng.pick(difficulty > 1 ? [2, 3, 4, 5, 6] : [2, 3]);
    // Above the base, so the answer is past 1 and the crossing sits well inside
    // the picture rather than against the axis.
    return { base, argument: nonPower(rng, base, base + 1, difficulty > 1 ? 99 : 40) };
  },
  render: ({ base, argument }): Slide => {
    const value = Math.log(argument) / Math.log(base);
    const answer = Math.round(value * 10) / 10;
    // The handle starts in the middle of the track, so the track is stretched
    // until the middle is well clear of the answer — otherwise *Check* would be
    // right before anything had been dragged. Only by a unit or two, though: a
    // wider window squeezes the curve into its left-hand third.
    let top = Math.ceil(value) + 1;
    while (Math.abs(top / 2 - answer) < 0.35) top += 1;
    const svg = plotSvg({
      xMin: 0,
      xMax: top,
      curves: [{ f: (x) => Math.pow(base, x) }],
      horizontals: [argument],
      yMin: 0,
      yMax: argument * 2,
      label: `The curve y = ${base} to the x, and a dashed line at ${argument}`,
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = ${base}^{x}$ and the dashed line is $y = ${argument}$. They meet at $x = ${logTex(base, `${argument}`)}$.`,
        },
        {
          kind: 'prose',
          text: `Given $${lnTex(argument)} \\approx ${Math.log(argument).toFixed(3)}$ and $${lnTex(base)} \\approx ${Math.log(base).toFixed(3)}$, slide to its value to one decimal place.`,
        },
      ],
      min: 0,
      max: top,
      step: 0.1,
      answer,
      // A graph read by eye is good to about a tenth either side, and the
      // division gives the same answer to far better than that.
      tolerance: 0.2,
      readout: `${logTex(base, `${argument}`)} \\approx {v}`,
      figure: { svg, xMin: 0, xMax: top },
    };
  },
  solution: ({ base, argument }) => {
    const value = Math.log(argument) / Math.log(base);
    const below = Math.floor(value);
    return [
      { text: 'Change to natural logarithms, then divide the two numbers given.' },
      {
        tex: `${logTex(base, `${argument}`)} = ${lnQuotientTex(argument, base)} \\approx \\frac{${Math.log(argument).toFixed(3)}}{${Math.log(base).toFixed(3)}} \\approx ${value.toFixed(2)}`,
      },
      {
        tex: `${base}^{${below}} = ${Math.pow(base, below)} < ${argument} < ${Math.pow(base, below + 1)} = ${base}^{${below + 1}}`,
      },
      {
        text: `So the answer has to sit between $${below}$ and $${below + 1}$, and on the picture that is where the curve crosses the dashed line. A value outside that range means the fraction was taken upside down.`,
      },
    ];
  },
};

interface QuotientParams {
  base: number;
  /** The two logarithms are base^p over base^q, and q divides p. */
  p: number;
  q: number;
}

/**
 * Every base-and-pair whose change of base is whole on every piece: both
 * arguments are powers of the base, and the quotient of their indices is whole.
 * Drawn from a flat list so each question is equally likely — the easy pool is
 * only just past the 25-question floor, and drawing the base first would leave
 * the rarer pairs to chance.
 */
function quotientPool(cap: number): QuotientParams[] {
  const out: QuotientParams[] = [];
  for (let base = 2; base <= 10; base += 1) {
    for (let q = 2; Math.pow(base, 2 * q) <= cap; q += 1) {
      for (let k = 2; Math.pow(base, q * k) <= cap; k += 1) out.push({ base, p: q * k, q });
    }
  }
  return out;
}

const QUOTIENTS = quotientPool(10_000);
const QUOTIENTS_HARD = quotientPool(100_000);

/**
 * The change of base formula read backwards, on a line that comes out whole.
 *
 * `log_c(X) / log_c(Y)` is `log_Y(X)` with its base changed to c, and when both
 * arguments are powers of c each logarithm on the line is a whole number. So
 * the formula can be worked by hand, one piece at a time, which is how it
 * stops being a rule to trust and becomes a fact that can be checked.
 */
const quotientReduce: Generator<QuotientParams> = {
  id: 'log-quotient-reduce',
  // Subtracting the indices is the logarithm of the quotient, the slip this
  // level is built to catch.
  choices: ({ p, q }) => wholeOptions(p / q, p - q, p * q, p + q),
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? QUOTIENTS_HARD : QUOTIENTS),
  render: ({ base, p, q }): Slide => {
    const top = Math.pow(base, p);
    const bottom = Math.pow(base, q);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `This is $${logTex(bottom, `${top}`)}$ with its base changed to $${base}$. Work it out one piece at a time: tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: bin('/', log(num(base), num(top)), log(num(base), num(bottom))),
      banks: {
        // Reading the argument back, or dividing it by the base, instead of
        // asking what power it is.
        'r.l': wholeBank(p, top / base, top, base),
        'r.r': wholeBank(q, bottom / base, bottom, base),
        // Subtracting instead of dividing turns this into the logarithm of a
        // quotient, which is a different number.
        r: wholeBank(p / q, p - q, p * q, p + q),
      },
    };
  },
  solution: ({ base, p, q }) => {
    const top = Math.pow(base, p);
    const bottom = Math.pow(base, q);
    return [
      { text: 'Each logarithm asks what power of the base gives its argument, and both have whole answers here.' },
      {
        tex: `${logTex(base, `${top}`)} = ${p} \\qquad ${logTex(base, `${bottom}`)} = ${q}`,
      },
      { tex: `${p} \\div ${q} = ${p / q}` },
      {
        text: `So $${logTex(bottom, `${top}`)} = ${p / q}$, and it checks: $${bottom}^{${p / q}} = ${top}$. Subtracting the two instead would give $${p - q}$, which is $${logTex(base, `\\frac{${top}}{${bottom}}`)}$ — a quotient *inside* a logarithm, not a quotient *of* logarithms.`,
      },
    ];
  },
};

interface ChainParams {
  base: number;
  /** The middle number is base^m, the last is that number to the k. */
  m: number;
  k: number;
  /** Written with the second logarithm first; multiplication does not mind. */
  swap: boolean;
}

function chainPool(cap: number): ChainParams[] {
  const out: ChainParams[] = [];
  for (let base = 2; base <= 10; base += 1) {
    for (let m = 2; Math.pow(base, 2 * m) <= cap; m += 1) {
      for (let k = 2; Math.pow(base, m * k) <= cap; k += 1) {
        out.push({ base, m, k, swap: false }, { base, m, k, swap: true });
      }
    }
  }
  return out;
}

const CHAINS = chainPool(10_000);
const CHAINS_HARD = chainPool(100_000);

/**
 * `log_a(b) x log_b(c)`, worked one logarithm at a time.
 *
 * The chain rule says the product is `log_a(c)` — the shared number cancels.
 * Working the line piece by piece gets there without the rule, and the worked
 * solution then shows the rule arriving at the same number, which is the
 * argument for it.
 */
const chainReduce: Generator<ChainParams> = {
  id: 'log-chain-reduce',
  choices: ({ m, k }) => wholeOptions(m * k, m + k, Math.pow(m, k), Math.pow(k, m)),
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? CHAINS_HARD : CHAINS),
  render: ({ base, m, k, swap }): Slide => {
    const middle = Math.pow(base, m);
    const last = Math.pow(middle, k);
    const first = log(num(base), num(middle));
    const second = log(num(middle), num(last));
    const firstBank = wholeBank(m, middle / base, middle, base);
    const secondBank = wholeBank(k, last / middle, middle, k + 1);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'The argument of one logarithm is the base of the other. Work it out one piece at a time: tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      expr: swap ? bin('*', second, first) : bin('*', first, second),
      banks: {
        [swap ? 'r.r' : 'r.l']: firstBank,
        [swap ? 'r.l' : 'r.r']: secondBank,
        // Adding the two is the slip; the powers are what a learner produces
        // when they half-remember that indices are involved somewhere.
        r: wholeBank(m * k, m + k, Math.pow(m, k), Math.pow(k, m)),
      },
    };
  },
  solution: ({ base, m, k }) => {
    const middle = Math.pow(base, m);
    const last = Math.pow(middle, k);
    return [
      { text: 'Settle each logarithm on its own, then multiply.' },
      {
        tex: `${logTex(base, `${middle}`)} = ${m} \\qquad ${logTex(middle, `${last}`)} = ${k} \\qquad ${m} \\times ${k} = ${m * k}`,
      },
      {
        text: `The chain rule gets there in one step. Changing both to one base, the $${middle}$ in the middle cancels, leaving a single logarithm from the outer base to the outer argument.`,
      },
      { tex: `${logTex(base, `${middle}`)} \\times ${logTex(middle, `${last}`)} = ${logTex(base, `${last}`)} = ${m * k}` },
      { text: `And it checks: $${base}^{${m * k}} = ${last}$.` },
    ];
  },
};

interface ReciprocalParams {
  /** Both numbers are powers of this. */
  root: number;
  /** The base is root^q and the argument root^p. */
  p: number;
  q: number;
}

/** log_b(a) from log_a(b): swapping base and argument takes the reciprocal. */
const reciprocal: Generator<ReciprocalParams> = {
  id: 'log-reciprocal',
  // Leaving the value as it was, and the two sign slips that come from
  // half-remembering a "minus" somewhere in the laws.
  choices: ({ p, q }) =>
    options(
      { tex: fracTex(q, p), answer: fracAnswer(q, p) },
      { tex: fracTex(p, q), answer: fracAnswer(p, q) },
      { tex: fracTex(-q, p), answer: fracAnswer(-q, p) },
      { tex: fracTex(-p, q), answer: fracAnswer(-p, q) },
    ),
  sample: (rng, difficulty) => {
    const root = rng.pick(difficulty > 1 ? [2, 3, 5, 7] : [2, 3, 5]);
    const cap = difficulty > 1 ? 20_000 : 1_000;
    const indices: number[] = [];
    for (let index = 1; Math.pow(root, index) <= cap; index += 1) indices.push(index);
    const q = rng.pick(indices);
    const p = rng.pick(indices.filter((index) => index !== q));
    return { root, p, q };
  },
  render: ({ root, p, q }) => {
    const base = Math.pow(root, q);
    const argument = Math.pow(root, p);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Use the first logarithm to find the second.' },
        { kind: 'display', tex: `${logTex(base, `${argument}`)} = ${fracTex(p, q)}` },
      ],
      lead: `${logTex(argument, `${base}`)} =`,
      keypad: FRACTION_KEYS,
      answer: fracAnswer(q, p),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ root, p, q }) => {
    const base = Math.pow(root, q);
    const argument = Math.pow(root, p);
    return [
      { text: 'Change both to natural logarithms and the two are the same fraction, one upside down.' },
      {
        tex: `\\log_{a}\\left(b\\right) = \\frac{\\ln\\left(b\\right)}{\\ln\\left(a\\right)} \\qquad \\log_{b}\\left(a\\right) = \\frac{\\ln\\left(a\\right)}{\\ln\\left(b\\right)}`,
      },
      { tex: `${logTex(argument, `${base}`)} = \\frac{1}{${logTex(base, `${argument}`)}} = ${fracTex(q, p)}` },
      {
        text: `Check with powers of $${root}$: $${base} = ${root}^{${q}}$ and $${argument} = ${root}^{${p}}$, so raising $${argument}$ to $${fracTex(q, p)}$ gives $${root}^{${q}}$, which is $${base}$. The sign never changes — a logarithm and its reciprocal are either both positive or both negative.`,
      },
    ];
  },
};

interface ProductFlowParams {
  a: number;
  b: number;
  c: number;
  d: number;
  route: 'chain' | 'reversed' | 'reciprocal' | 'none';
}

/**
 * Does a product of two logarithms simplify, and to what?
 *
 * The chain and the reciprocal are the two shapes this level teaches, and both
 * hinge on one number being the argument of one logarithm and the base of the
 * other. Spotting that — in either order, since the product does not care which
 * logarithm is written first — is the skill, and a product with no shared
 * number is the case worth practising saying no to.
 */
const productFlow: Generator<ProductFlowParams> = {
  id: 'log-product-flow',
  sample: (rng, difficulty) => {
    const a = rng.int(2, 9);
    const pickApart = (lo: number, hi: number, taken: number[]) => {
      for (;;) {
        const drawn = rng.int(lo, hi);
        if (!taken.includes(drawn)) return drawn;
      }
    };
    const b = pickApart(2, difficulty > 1 ? 40 : 20, [a]);
    const c = pickApart(2, difficulty > 1 ? 80 : 50, [a, b]);
    const d = pickApart(2, difficulty > 1 ? 80 : 50, [a, b, c]);
    return { a, b, c, d, route: rng.pick(['chain', 'reversed', 'reciprocal', 'none'] as const) };
  },
  render: ({ a, b, c, d, route }): Slide => {
    const subject =
      route === 'chain'
        ? `${logTex(a, `${b}`)} \\times ${logTex(b, `${c}`)}`
        : route === 'reversed'
          ? `${logTex(b, `${c}`)} \\times ${logTex(a, `${b}`)}`
          : route === 'reciprocal'
            ? `${logTex(a, `${b}`)} \\times ${logTex(b, `${a}`)}`
            : `${logTex(a, `${b}`)} \\times ${logTex(c, `${d}`)}`;
    // What a cancelled middle would leave, from the numbers in this product.
    // Only a chain reaches this step on the right path; a wrong turn reaches it
    // from the others too, and must not be shown a c this product never used.
    const pairs: [number, number][] =
      route === 'reciprocal'
        ? [
            [a, a],
            [b, b],
          ]
        : route === 'none'
          ? [
              [a, d],
              [c, b],
            ]
          : [
              [a, c],
              [c, a],
            ];
    const [one, other] = pairs.map(([base, argument]) => logTex(base, `${argument}`));
    const right = `$${one}$`;
    // Any leaf can be reached, and read, from any route, so each says only what
    // that answer claims, and a fact about it, never a verdict on this product.
    // On the reciprocal route both of these are worth exactly 1: that path is
    // wrong only for having said the two are not reciprocals.
    const says = ([base, argument]: [number, number]) =>
      `That says the product is $${logTex(base, `${argument}`)}$, which is $${
        base === argument ? '1' : `\\frac{${lnTex(argument)}}{${lnTex(base)}}`
      }$.`;
    const left = [
      { label: right, outcome: says(pairs[0]) },
      { label: `$${other}$`, outcome: says(pairs[1]) },
    ];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide what this product simplifies to, if anything.',
        },
      ],
      subject,
      steps: [
        {
          id: 'link',
          ask: 'Is the argument of one logarithm the base of the other?',
          branches: [
            { label: 'Yes', to: 'both' },
            {
              label: 'No',
              outcome: 'That says no number is shared, so nothing cancels and the product stays as two logarithms.',
            },
          ],
        },
        {
          id: 'both',
          ask: "Is each one's base the other one's argument?",
          branches: [
            { label: 'Yes', outcome: 'That says they are reciprocals, so the product is exactly 1.' },
            { label: 'No', to: 'left' },
          ],
        },
        {
          id: 'left',
          ask: 'Suppose the shared number cancels. Which single logarithm is left?',
          branches: (a + c) % 2 === 0 ? left : [left[1], left[0]],
        },
      ],
      answer:
        route === 'none' ? ['No'] : route === 'reciprocal' ? ['Yes', 'Yes'] : ['Yes', 'No', right],
    };
  },
  solution: ({ a, b, c, d, route }) => {
    if (route === 'none') {
      return [
        {
          text: `The numbers are $${a}$ and $${b}$ in one logarithm and $${c}$ and $${d}$ in the other. None of them is shared, so there is nothing to cancel.`,
        },
        {
          tex: `${logTex(a, `${b}`)} \\times ${logTex(c, `${d}`)} = \\frac{${lnTex(b)}}{${lnTex(a)}} \\times \\frac{${lnTex(d)}}{${lnTex(c)}}`,
        },
        { text: 'Changing base still works — it always does — but four different logarithms are left and none of them cancels.' },
      ];
    }
    if (route === 'reciprocal') {
      return [
        { text: `$${a}$ and $${b}$ have swapped places, so each logarithm is the other upside down.` },
        {
          tex: `${logTex(a, `${b}`)} \\times ${logTex(b, `${a}`)} = \\frac{${lnTex(b)}}{${lnTex(a)}} \\times \\frac{${lnTex(a)}}{${lnTex(b)}} = 1`,
        },
        { text: 'Everything cancels. Whatever the two numbers are, a logarithm times its reciprocal is 1.' },
      ];
    }
    return [
      {
        text: `$${b}$ is the argument of $${logTex(a, `${b}`)}$ and the base of $${logTex(b, `${c}`)}$, so it cancels${route === 'reversed' ? ' — the order they are written in makes no difference to a product' : ''}.`,
      },
      {
        tex: `\\frac{${lnTex(b)}}{${lnTex(a)}} \\times \\frac{${lnTex(c)}}{${lnTex(b)}} = \\frac{${lnTex(c)}}{${lnTex(a)}} = ${logTex(a, `${c}`)}`,
      },
      {
        text: `What is left runs from the outer base, $${a}$, to the outer argument, $${c}$. Writing $${logTex(c, `${a}`)}$ instead gives the reciprocal.`,
      },
    ];
  },
};

interface ChainTilesParams {
  a: number;
  b: number;
  c: number;
  reversed: boolean;
}

/**
 * The chain rule, cancelled by hand.
 *
 * `log-chain-reduce` only ever uses numbers whose logarithms are whole, so it
 * can be done without seeing anything cancel. Here none of them is whole, and
 * the only way through is to change both to natural logarithms and watch the
 * middle number go.
 */
const chainTiles: Generator<ChainTilesParams> = {
  id: 'log-chain-tiles',
  sample: (rng, difficulty) => {
    const a = rng.int(2, 9);
    let b = rng.int(2, difficulty > 1 ? 40 : 20);
    if (b === a) b += 1;
    let c = rng.int(3, difficulty > 1 ? 60 : 40);
    while (c === a || c === b) c += 1;
    return { a, b, c, reversed: rng.chance(0.5) };
  },
  render: ({ a, b, c, reversed }): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: 'Change both to natural logarithms. One number cancels — fill in what is left.',
      },
      {
        kind: 'display',
        tex: reversed
          ? `${logTex(b, `${c}`)} \\times ${logTex(a, `${b}`)}`
          : `${logTex(a, `${b}`)} \\times ${logTex(b, `${c}`)}`,
      },
    ],
    template: `\\ln({0}) / \\ln({1})`,
    bank: bankOf([`${c}`, `${a}`], [`${b}`, `${a * c}`, `${b * c}`, `${a * b}`]),
    answer: [`${c}`, `${a}`],
  }),
  solution: ({ a, b, c }) => [
    { text: 'Write each logarithm as a quotient of natural logarithms.' },
    {
      tex: `${logTex(a, `${b}`)} \\times ${logTex(b, `${c}`)} = \\frac{${lnTex(b)}}{${lnTex(a)}} \\times \\frac{${lnTex(c)}}{${lnTex(b)}}`,
    },
    {
      text: `$${lnTex(b)}$ is on the top of one fraction and the bottom of the other, so it cancels.`,
    },
    { tex: `= ${lnQuotientTex(c, a)} = ${logTex(a, `${c}`)}` },
    {
      text: `That is the chain rule: the shared $${b}$ disappears, leaving a single logarithm from $${a}$ to $${c}$.`,
    },
  ],
};

interface SolveIndexParams {
  base: number;
  target: number;
  /** The coefficient of x in the index. 1 for the shift form. */
  m: number;
  /** The constant added to the index. 0 for the scale form. */
  k: number;
  form: 'shift' | 'scale' | 'both';
}

/** `m x + k`, as it would be written in an index. */
function indexTex(m: number, k: number): string {
  const lead = m === 1 ? 'x' : `${m}x`;
  if (k === 0) return lead;
  return k > 0 ? `${lead} + ${k}` : `${lead} - ${-k}`;
}

/** `- k` after something, written with the right sign. */
function minus(k: number): string {
  return k > 0 ? `- ${k}` : `+ ${-k}`;
}

/**
 * Solving when the unknown is not the whole index.
 *
 * Level 3 only ever sets `a^x = b`, where the answer is the change of base
 * formula and nothing more. Real equations put something next to the x, and
 * the change of base is then only the middle of the working: the index is set
 * equal to `log_a(b)` and ordinary algebra finishes it.
 */
const solveIndex: Generator<SolveIndexParams> = {
  id: 'log-solve-index',
  choices: ({ base, target, m, k, form }) => {
    const L = lnQuotientTex(target, base);
    const l = `log(${target}) / log(${base})`;
    if (form === 'shift') {
      return options(
        { tex: `${L} ${minus(k)}`, answer: `${l} - (${k})` },
        { tex: `${L} ${minus(-k)}`, answer: `${l} + (${k})` },
        { tex: L, answer: l },
        {
          tex: `\\frac{${lnTex(target)} ${minus(k)}}{${lnTex(base)}}`,
          answer: `(log(${target}) - (${k})) / log(${base})`,
        },
      );
    }
    if (form === 'scale') {
      return options(
        { tex: `\\frac{${lnTex(target)}}{${m}${lnTex(base)}}`, answer: `log(${target}) / ((${m}) * log(${base}))` },
        { tex: `\\frac{${m}${lnTex(target)}}{${lnTex(base)}}`, answer: `(${m}) * log(${target}) / log(${base})` },
        { tex: `${L} - ${m}`, answer: `${l} - (${m})` },
        { tex: L, answer: l },
      );
    }
    return options(
      { tex: `\\frac{1}{${m}}\\left(${L} ${minus(k)}\\right)`, answer: `(${l} - (${k})) / (${m})` },
      { tex: `\\frac{1}{${m}}${L} ${minus(k)}`, answer: `${l} / (${m}) - (${k})` },
      { tex: `\\frac{1}{${m}}\\left(${L} ${minus(-k)}\\right)`, answer: `(${l} + (${k})) / (${m})` },
      { tex: `${L} ${minus(k)}`, answer: `${l} - (${k})` },
    );
  },
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 6);
    const target = nonPower(rng, base, 3, difficulty > 1 ? 60 : 40);
    const form = rng.pick(difficulty > 1 ? (['shift', 'scale', 'both'] as const) : (['shift', 'scale'] as const));
    const k = nonZero(rng.int(-4, 4), 2);
    const m = rng.int(2, 5);
    return {
      base,
      target,
      m: form === 'shift' ? 1 : m,
      k: form === 'scale' ? 0 : k,
      form,
    };
  },
  render: ({ base, target, m, k, form }) => {
    const l = `log(${target}) / log(${base})`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Solve for $x$, exactly. Leave natural logarithms in your answer.' },
      ],
      lead: `${base}^{${indexTex(m, k)}} = ${target} \\implies x =`,
      keypad: LOG_KEYS,
      answer:
        form === 'shift'
          ? `${l} - (${k})`
          : form === 'scale'
            ? `log(${target}) / ((${m}) * log(${base}))`
            : `(${l} - (${k})) / (${m})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, target, m, k, form }) => {
    const L = lnQuotientTex(target, base);
    const final =
      form === 'shift'
        ? `x = ${L} ${minus(k)}`
        : form === 'scale'
          ? `x = \\frac{${lnTex(target)}}{${m}${lnTex(base)}}`
          : `x = \\frac{1}{${m}}\\left(${L} ${minus(k)}\\right)`;
    return [
      {
        text: `$${target}$ is not a power of $${base}$, so take logarithms. The whole index comes down as one bracket.`,
      },
      {
        tex: `${base}^{${indexTex(m, k)}} = ${target} \\implies ${indexTex(m, k)} = ${logTex(base, `${target}`)} = ${L}`,
      },
      { tex: final },
      {
        text:
          form === 'shift'
            ? `Change base first and deal with the $${k}$ afterwards. Taking it off $${lnTex(target)}$ before dividing is the usual slip — the $${k}$ belongs to the index, not to the logarithm.`
            : form === 'scale'
              ? `The $${m}$ multiplies the whole of $x$, so it divides the whole answer: it ends up beside $${lnTex(base)}$ on the bottom, not on the top.`
              : `Undo the index in the reverse of the order it was built: the $${k}$ comes off first, then everything is divided by $${m}$.`,
      },
    ];
  },
};

/**
 * The same solutions assembled from tiles.
 *
 * The typed form can be answered by anyone who types `log(b)/log(a)` and hopes;
 * placing the pieces makes each number go somewhere on purpose, and the
 * `scale` form puts the coefficient in a position that has to be chosen.
 */
const solveIndexTiles: Generator<SolveIndexParams> = {
  id: 'log-solve-index-tiles',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 6);
    const target = nonPower(rng, base, 3, difficulty > 1 ? 60 : 40);
    const form = rng.pick(['shift', 'scale'] as const);
    return {
      base,
      target,
      m: form === 'scale' ? rng.int(2, 5) : 1,
      k: form === 'shift' ? nonZero(rng.int(-4, 4), 3) : 0,
      form,
    };
  },
  render: ({ base, target, m, k, form }): Slide => {
    if (form === 'scale') {
      const answer = [`${target}`, `${m}`, `${base}`];
      return {
        kind: 'tiles',
        prompt: [
          { kind: 'prose', text: 'Take logarithms and solve. Fill in the answer.' },
          { kind: 'display', tex: `${base}^{${indexTex(m, 0)}} = ${target}` },
        ],
        template: `x = \\ln({0}) / ({1} \\ln({2}))`,
        bank: bankOf(answer, [`${m * base}`, `${m + 1}`, `${target * m}`, `${base + 1}`]),
        answer,
      };
    }
    const answer = [`${target}`, `${base}`, `${Math.abs(k)}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Take logarithms and solve. Fill in the answer.' },
        { kind: 'display', tex: `${base}^{${indexTex(1, k)}} = ${target}` },
      ],
      template: k > 0 ? `x = \\ln({0}) / \\ln({1}) - {2}` : `x = \\ln({0}) / \\ln({1}) + {2}`,
      bank: bankOf(answer, [`${target * base}`, `${Math.abs(k) + 1}`, `${base + target}`, `${target - 1}`]),
      answer,
    };
  },
  solution: ({ base, target, m, k, form }) => [
    { text: 'Taking logarithms brings the whole index down, so the index equals a change-of-base quotient.' },
    { tex: `${indexTex(m, k)} = ${lnQuotientTex(target, base)}` },
    {
      tex:
        form === 'scale'
          ? `x = \\frac{${lnTex(target)}}{${m}${lnTex(base)}}`
          : `x = ${lnQuotientTex(target, base)} ${minus(k)}`,
    },
    {
      text:
        form === 'scale'
          ? `The $${m}$ belongs to the bottom, beside $${lnTex(base)}$: it multiplied $x$, so it divides the whole of the answer.`
          : `The $${k}$ comes off last, after the division, because it was added to $x$ inside the index and not to any logarithm.`,
    },
  ],
};

/**
 * Which two whole numbers does a logarithm sit between?
 *
 * The estimate every answer in this level should be checked against, and the
 * one a calculator never gives: the powers of the base either side of the
 * argument bracket the logarithm, and an answer outside the bracket was taken
 * upside down.
 */
const between: Generator<ChangeParams> = {
  id: 'log-between',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 12 : 6);
    return { base, argument: nonPower(rng, base, base + 1, difficulty > 1 ? 999 : 100) };
  },
  render: ({ base, argument }): Slide => {
    let below = 0;
    while (Math.pow(base, below + 1) < argument) below += 1;
    // Starts one either side of the right pair, plus the pair that comes from
    // dividing the argument by the base as though the logarithm were a quotient.
    const starts = [below, below - 1, below + 1, Math.floor(argument / base)].filter(
      (start, idx, all) => start >= 0 && all.indexOf(start) === idx,
    );
    const options = starts.map((start) => ({
      id: start === below ? 'correct' : `s${start}`,
      label: `${start} \\text{ and } ${start + 1}`,
      tex: true,
    }));
    const turn = (base + argument) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Without a calculator: $${logTex(base, `${argument}`)}$ lies between which two whole numbers?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'correct',
    };
  },
  solution: ({ base, argument }) => {
    let below = 0;
    while (Math.pow(base, below + 1) < argument) below += 1;
    return [
      { text: `List the powers of $${base}$ until one passes $${argument}$.` },
      {
        tex: `${base}^{${below}} = ${Math.pow(base, below)} < ${argument} < ${Math.pow(base, below + 1)} = ${base}^{${below + 1}}`,
      },
      {
        text: `The logarithm is the power that lands exactly on $${argument}$, so it lies between $${below}$ and $${below + 1}$ — about $${(Math.log(argument) / Math.log(base)).toFixed(2)}$.`,
      },
      {
        text: 'Checking a change-of-base answer against this bracket catches the upside-down fraction every time, because the reciprocal is almost never in it.',
      },
    ];
  },
};

interface CommonParams {
  /** Both numbers are powers of this. */
  root: number;
  /** The base is root^q; the other number is root^p. */
  p: number;
  q: number;
  /** The other number is 1 / root^p rather than root^p. */
  flip: boolean;
}

/**
 * Pairs of powers of one root whose logarithm is a fraction, never whole: if q
 * divided p the base would already be a power of the base and no change would
 * be needed.
 */
function commonPool(roots: number[], baseCap: number, argumentCap: number, flips: boolean): CommonParams[] {
  const out: CommonParams[] = [];
  for (const root of roots) {
    for (let q = 2; Math.pow(root, q) <= baseCap; q += 1) {
      for (let p = 1; Math.pow(root, p) <= argumentCap; p += 1) {
        if (p % q === 0) continue;
        out.push({ root, p, q, flip: false });
        if (flips) out.push({ root, p, q, flip: true });
      }
    }
  }
  return out;
}

const COMMON = commonPool([2, 3, 5], 125, 3_125, false);
const COMMON_HARD = commonPool([2, 3, 5, 7], 343, 20_000, true);

/**
 * `8^x = 32`: an exact fraction, reached by choosing the base.
 *
 * Taking natural logarithms here works, and leaves `ln 32 / ln 8` — correct,
 * and hiding that the answer is 5/3. Seeing that both numbers are powers of 2
 * and changing to that base is the whole of "choosing a base".
 */
const solveCommon: Generator<CommonParams> = {
  id: 'log-solve-common',
  choices: ({ p, q, flip }) => {
    const s = flip ? -p : p;
    return options(
      { tex: fracTex(s, q), answer: fracAnswer(s, q) },
      { tex: fracTex(flip ? -q : q, p), answer: fracAnswer(flip ? -q : q, p) },
      { tex: fracTex(-s, q), answer: fracAnswer(-s, q) },
      { tex: fracTex(flip ? q : -q, p), answer: fracAnswer(flip ? q : -q, p) },
    );
  },
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? COMMON_HARD : COMMON),
  render: ({ root, p, q, flip }) => {
    const base = Math.pow(root, q);
    const value = Math.pow(root, p);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Solve for $x$, as an exact fraction.' }],
      lead: `${base}^{x} = ${flip ? `\\frac{1}{${value}}` : value} \\implies x =`,
      keypad: FRACTION_KEYS,
      answer: fracAnswer(flip ? -p : p, q),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ root, p, q, flip }) => {
    const base = Math.pow(root, q);
    const value = Math.pow(root, p);
    const s = flip ? -p : p;
    return [
      {
        text: `$${base}$ and $${value}$ are both powers of $${root}$, so write everything in base $${root}$ rather than reaching for $\\ln$.`,
      },
      {
        tex: `\\left(${root}^{${q}}\\right)^{x} = ${root}^{${s}} \\implies ${root}^{${q}x} = ${root}^{${s}}`,
      },
      { tex: `${q}x = ${s} \\implies x = ${fracTex(s, q)}` },
      {
        text: `Natural logarithms would give the same number as $${lnQuotientTex(flip ? `\\frac{1}{${value}}` : value, base)}$, which is correct but hides that it is exactly $${fracTex(s, q)}$. When both numbers share a base, change to it.`,
      },
    ];
  },
};

const COMMON_TILES = COMMON;
const COMMON_TILES_HARD = commonPool([2, 3, 5, 7], 343, 20_000, false);

/**
 * Evaluating `log_8(32)` by changing to base 2, with the two indices placed.
 *
 * `log-solve-common` asks for the finished fraction. This is the line before
 * it, where the choice of base turns two awkward logarithms into two whole
 * numbers that can be read off.
 */
const commonBaseTiles: Generator<CommonParams> = {
  id: 'log-common-base-tiles',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? COMMON_TILES_HARD : COMMON_TILES),
  render: ({ root, p, q }): Slide => {
    const base = Math.pow(root, q);
    const value = Math.pow(root, p);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Both numbers are powers of $${root}$. Change to base $${root}$ and fill in each logarithm.`,
        },
        { kind: 'display', tex: logTex(base, `${value}`) },
      ],
      // The root is a single digit and the arguments sit in plain brackets, so
      // nothing here is a braced number for the blank-marker split to take.
      template: `\\log_${root}(${value}) / \\log_${root}(${base}) = {0} / {1}`,
      bank: bankOf([`${p}`, `${q}`], [`${value}`, `${base}`, `${p + q}`, `${q + 1}`]),
      answer: [`${p}`, `${q}`],
    };
  },
  solution: ({ root, p, q }) => {
    const base = Math.pow(root, q);
    const value = Math.pow(root, p);
    // Written as the two indices first, then in lowest terms where that differs.
    const lowest = gcd(p, q) === 1 ? '' : ` = ${fracTex(p, q)}`;
    return [
      { text: `Change to base $${root}$, the number both are powers of.` },
      {
        tex: `${logTex(base, `${value}`)} = \\frac{${logTex(root, `${value}`)}}{${logTex(root, `${base}`)}}`,
      },
      {
        tex: `${value} = ${root}^{${p}} \\qquad ${base} = ${root}^{${q}} \\implies ${logTex(base, `${value}`)} = \\frac{${p}}{${q}}${lowest}`,
      },
      {
        text: `Each logarithm to base $${root}$ is just an index, so the answer is a fraction of two whole numbers — exact, with no calculator involved.`,
      },
    ];
  },
};

interface BaseFlowParams {
  base: number;
  argument: number;
  route: 'power' | 'common' | 'calculator';
}

/**
 * Which base should this logarithm be changed to?
 *
 * Three cases, and the level's closing skill is telling them apart: an
 * argument that is a power of the base needs no change at all; two numbers
 * that are powers of a smaller one go to that base and come out as a fraction;
 * anything else goes to `e` and comes out as a decimal.
 */
const baseFlow: Generator<BaseFlowParams> = {
  id: 'log-base-flow',
  sample: (rng, difficulty) => {
    const route = rng.pick(['power', 'common', 'calculator'] as const);
    if (route === 'power') {
      const base = rng.int(2, difficulty > 1 ? 10 : 6);
      const indices: number[] = [];
      for (let index = 2; Math.pow(base, index) <= 10_000; index += 1) indices.push(index);
      return { base, argument: Math.pow(base, rng.pick(indices)), route };
    }
    if (route === 'common') {
      const pick = rng.pick(difficulty > 1 ? COMMON_TILES_HARD : COMMON_TILES);
      return { base: Math.pow(pick.root, pick.q), argument: Math.pow(pick.root, pick.p), route };
    }
    const base = rng.int(2, difficulty > 1 ? 12 : 9);
    for (let tries = 0; tries < 60; tries += 1) {
      const argument = rng.int(3, difficulty > 1 ? 99 : 60);
      if (argument !== base && rootOf(argument) !== rootOf(base)) return { base, argument, route };
    }
    return { base, argument: base + 1, route };
  },
  render: ({ base, argument }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: 'Work down the questions to decide how you would evaluate this. Each answer decides what gets asked next.',
      },
    ],
    subject: logTex(base, `${argument}`),
    steps: [
      {
        id: 'power',
        ask: 'Is the argument a whole-number power of the base?',
        branches: [
          { label: 'Yes', outcome: 'Read the index straight off. No change of base is needed.' },
          { label: 'No', to: 'common' },
        ],
      },
      {
        id: 'common',
        ask: 'Are the base and the argument both powers of one smaller whole number?',
        branches: [
          {
            label: 'Yes',
            outcome: 'Change to that number. Both logarithms come out whole, so the answer is an exact fraction.',
          },
          {
            label: 'No',
            outcome: 'Change to base $e$ and use a calculator. The answer is not a fraction at all.',
          },
        ],
      },
    ],
    answer: isPowerOf(argument, base) ? ['Yes'] : rootOf(argument) === rootOf(base) ? ['No', 'Yes'] : ['No', 'No'],
  }),
  solution: ({ base, argument }) => {
    if (isPowerOf(argument, base)) {
      const index = Math.round(Math.log(argument) / Math.log(base));
      return [
        { text: `$${argument}$ is an exact power of $${base}$, so the logarithm is just that power.` },
        { tex: `${base}^{${index}} = ${argument} \\implies ${logTex(base, `${argument}`)} = ${index}` },
        { text: 'Changing base here would give the same answer the long way round.' },
      ];
    }
    const root = rootOf(base);
    if (root === rootOf(argument)) {
      const q = Math.round(Math.log(base) / Math.log(root));
      const p = Math.round(Math.log(argument) / Math.log(root));
      return [
        { text: `$${argument}$ is not a power of $${base}$, but both are powers of $${root}$.` },
        {
          tex: `${logTex(base, `${argument}`)} = \\frac{${logTex(root, `${argument}`)}}{${logTex(root, `${base}`)}} = \\frac{${p}}{${q}}`,
        },
        { text: 'Changing to the shared number makes both logarithms whole, which is what makes the answer exact.' },
      ];
    }
    return [
      {
        text: `$${argument}$ is not a power of $${base}$, and the two share no smaller base, so no choice of base makes the logarithms whole.`,
      },
      {
        tex: `${logTex(base, `${argument}`)} = ${lnQuotientTex(argument, base)} \\approx ${(Math.log(argument) / Math.log(base)).toFixed(3)}`,
      },
      { text: 'Base $e$ is the usual choice because the calculator has it. Base 10 would give the same number.' },
    ];
  },
};

/* ---------- Level 5: logarithmic graphs ---------- */

/*
 * Level 5 is about the picture: the curve y = log_a(x), its mirror image
 * y = a^x, what a transformation does to it, and reading a solution off it.
 *
 * Every curve here is drawn through `logGraphSvg`, which wraps `plotSvg` for
 * the two things a logarithm needs that a wave or a parabola does not. The
 * curve is undefined left of its asymptote, and plotSvg samples every curve
 * across the whole window, so a sample there has to go somewhere harmless
 * rather than into the path as NaN. And the asymptote is usually the y-axis,
 * which plotSvg does not draw, so the helper draws it whenever it is in view.
 *
 * Every window names its own y range. plotSvg's automatic window fits the
 * sampled extremes, and a logarithm plunging towards its asymptote would set
 * the scale and squash the part of the curve the question is about.
 */

/** log_b(v) as a plain number, for drawing and for bounds. */
function logOf(base: number, value: number): number {
  return Math.log(value) / Math.log(base);
}

/** b^k as the learner reads it: a whole number, or one over one. */
function powTex(base: number, k: number): string {
  return k >= 0 ? `${Math.pow(base, k)}` : `\\frac{1}{${Math.pow(base, -k)}}`;
}

/** The same number for the checker. Never displayed. */
function powAnswer(base: number, k: number): string {
  return k >= 0 ? `${Math.pow(base, k)}` : `1 / ${Math.pow(base, -k)}`;
}

/** The same number inside a figure, where there is no TeX. */
function powText(base: number, k: number): string {
  return k >= 0 ? `${Math.pow(base, k)}` : `1/${Math.pow(base, -k)}`;
}

/** A signed whole number inside a figure, with a true minus sign. */
function figNum(value: number): string {
  return value < 0 ? `−${-value}` : `${value}`;
}

/** x shifted inside a bracket, as it is written: x, x - 3 or x + 3. */
function shiftedX(k: number): string {
  return k === 0 ? 'x' : k > 0 ? `x - ${k}` : `x + ${-k}`;
}

/** A constant added after the logarithm: nothing, + 2 or - 2. */
function tail(c: number): string {
  return c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`;
}

/** log_b(x - k) + c, the right-hand side as it is written. */
function shiftedLogTex(base: number, k: number, c = 0): string {
  const inner = k === 0 ? `\\log_{${base}} x` : `\\log_{${base}}\\left(${shiftedX(k)}\\right)`;
  return `${inner}${tail(c)}`;
}

/** The curve y = s log_b(x - k) + c, as a function to draw. */
function logCurve(base: number, k = 0, c = 0, s = 1): (x: number) => number {
  return (x) => s * logOf(base, x - k) + c;
}

/**
 * A stable number from a question's own parameters, for ordering the options
 * of a native choice slide. Not the rng: one question must render one way, or
 * the deck de-duplicator sees two questions where there is one.
 */
function mix(...values: number[]): number {
  let hash = 7;
  for (const value of values) hash = (hash * 31 + Math.round(value * 3) + 101) | 0;
  return Math.abs(hash);
}

/** The list turned by `turn` places, so the answer is not always first. */
function turned<T>(items: T[], turn: number): T[] {
  const at = turn % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/** A whole number as a choice option, with its value for the distractor test. */
function numberOption(value: number): ChoiceOption {
  return { tex: `${value}`, answer: `${value}` };
}

/** The correct option and up to three distinct wrong ones, compared by label. */
function fourOptions(correct: ChoiceOption, ...wrong: ChoiceOption[]): ChoiceOption[] {
  const seen = new Set([correct.tex]);
  const out: ChoiceOption[] = [{ ...correct, correct: true }];
  for (const option of wrong) {
    if (out.length === 4) break;
    if (seen.has(option.tex)) continue;
    seen.add(option.tex);
    out.push(option);
  }
  return out;
}

/** plotSvg's own geometry, needed to put a label where it puts a point. */
const PLOT_WIDTH = 280;
const PLOT_PAD = 12;

/** Text beside a point in a figure: its coordinates, usually. */
export interface GraphLabel {
  x: number;
  y: number;
  text: string;
  /** Where the text sits against the point, when the default would collide. */
  place?: 'above-left' | 'below-right';
}

export type LogGraphOptions = Omit<PlotOptions, 'yMin' | 'yMax'> & {
  yMin: number;
  yMax: number;
  labels?: GraphLabel[];
  /**
   * Names printed at the far end of each axis, for a graph whose axes are not
   * plain x and y: a straightened model plots log y against log x, and the
   * picture has to say so or its gradient means nothing.
   */
  axisNames?: { x: string; y: string };
};

/**
 * A figure for a logarithm or an exponential: plotSvg, plus the y-axis, a
 * curve that is safe to sample left of its asymptote, and labelled points.
 *
 * Labels are the reason a point can carry its coordinates at all. plotSvg draws
 * no scale, so a question about reading a point off a curve has to print the
 * point beside it; the label is placed with plotSvg's own mapping, which is
 * why its width and inset are repeated above.
 */
export function logGraphSvg({ labels = [], axisNames, ...opts }: LogGraphOptions): string {
  const span = opts.yMax - opts.yMin;
  // Far enough off the picture to read as a curve leaving it, near enough that
  // the path stays a sensible size. A sample where the curve is undefined
  // (left of the asymptote) goes to the bottom, which is where the curve went.
  const low = opts.yMin - span;
  const high = opts.yMax + span;
  const tame = (f: (x: number) => number) => (x: number) => {
    const y = f(x);
    return Number.isFinite(y) ? Math.min(high, Math.max(low, y)) : low;
  };
  const yAxis = opts.xMin < 0 && opts.xMax > 0 ? [{ x: 0, dashed: false }] : [];
  const svg = plotSvg({
    ...opts,
    curves: opts.curves.map((curve) => ({ ...curve, f: tame(curve.f) })),
    verticals: [...yAxis, ...(opts.verticals ?? [])],
  });
  if (labels.length === 0 && !axisNames) return svg;

  const height = opts.height ?? 150;
  const px = (x: number) => PLOT_PAD + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * (PLOT_WIDTH - 2 * PLOT_PAD);
  const py = (y: number) => PLOT_PAD + ((opts.yMax - y) / span) * (height - 2 * PLOT_PAD);
  const text = labels
    .map(({ x, y, text: words, place }) => {
      const cx = px(x);
      const cy = py(y);
      // Every curve here rises left to right, so the empty space beside a
      // point is below and to its right, or above and to its left. Below-right
      // unless that runs off the edge; then above-left, unless that runs off
      // the top.
      const left = place ? place === 'above-left' : cx > PLOT_WIDTH * 0.6;
      const below = place ? place === 'below-right' : left ? cy < 26 : cy < height - 30;
      const ty = below ? cy + 18 : cy - 9;
      return `<text x="${(left ? cx - 8 : cx + 8).toFixed(1)}" y="${ty.toFixed(1)}" font-size="12" fill="currentColor" text-anchor="${left ? 'end' : 'start'}">${words}</text>`;
    })
    .join('');
  // The horizontal name sits just above the right-hand end of the x-axis and
  // the vertical one at the top of the y-axis: the corners a rising line
  // leaves empty.
  const names = axisNames
    ? `<text x="${PLOT_WIDTH - PLOT_PAD}" y="${(py(0) - 6).toFixed(1)}" font-size="12" font-style="italic" fill="currentColor" text-anchor="end">${axisNames.x}</text>` +
      `<text x="${(px(0) + 6).toFixed(1)}" y="${PLOT_PAD + 10}" font-size="12" font-style="italic" fill="currentColor" text-anchor="start">${axisNames.y}</text>`
    : '';
  return svg.replace('</svg>', `${text}${names}</svg>`);
}

/** Every (base, k) with base^k no larger than `cap`. */
function logPoints(bases: number[], ks: number[], cap: number): { base: number; k: number }[] {
  return bases.flatMap((base) => ks.filter((k) => Math.pow(base, k) <= cap).map((k) => ({ base, k })));
}

/** y = log_b(x) round one marked point, with the whole shape of the curve in view. */
function pointFigure(base: number, k: number, label: string): string {
  const x = Math.pow(base, k);
  const xMax = Math.max(x, base, 2) * 1.3;
  return logGraphSvg({
    xMin: -0.06 * xMax,
    xMax,
    yMin: Math.min(-2.5, k - 1),
    yMax: Math.max(logOf(base, xMax), k) + 0.8,
    curves: [{ f: logCurve(base) }],
    marks: [{ x, y: k }],
    labels: [{ x, y: k, text: label }],
    label: 'A logarithm curve with one point marked',
  });
}

interface GraphReadParams {
  base: number;
  /** The point asked about is (base^k, k). */
  k: number;
  ask: 'y' | 'x' | 'base';
}

const READ_POINTS = logPoints([2, 3, 4, 5, 6, 7], [0, 1, 2, 3], 64);
const READ_POINTS_HARD = logPoints([2, 3, 4, 5, 6, 7, 8, 9, 10], [-1, 0, 1, 2, 3, 4], 100);

/**
 * A point on y = log_b(x): its height, its position, or the base it gives away.
 *
 * Every point on the curve is (b^k, k), and each direction of reading it is
 * one of the ways the curve is used: the height is the logarithm, the position
 * is the power, and a point with height 1 sits exactly at the base.
 */
const graphRead: Generator<GraphReadParams> = {
  id: 'log-graph-read',
  choices: ({ base, k, ask }) => {
    const x = Math.pow(base, k);
    if (ask === 'y') {
      return fourOptions(
        numberOption(k),
        ...(k >= 1 ? [numberOption(x)] : []),
        numberOption(base),
        numberOption(k + 1),
        numberOption(k - 1),
      );
    }
    if (ask === 'base') {
      return fourOptions(
        numberOption(base),
        ...(Number.isInteger(x / k) ? [numberOption(x / k)] : []),
        numberOption(x),
        numberOption(x - k),
        numberOption(base + 1),
        numberOption(k),
      );
    }
    if (k < 0) {
      return fourOptions(
        { tex: powTex(base, k), answer: powAnswer(base, k) },
        numberOption(-Math.pow(base, -k)),
        numberOption(Math.pow(base, -k)),
        { tex: `\\frac{1}{${2 * Math.pow(base, -k)}}`, answer: `1 / ${2 * Math.pow(base, -k)}` },
      );
    }
    return fourOptions(
      numberOption(x),
      numberOption(base * k),
      ...(k >= 2 && Math.pow(k, base) <= 10_000 ? [numberOption(Math.pow(k, base))] : []),
      numberOption(Math.pow(base, k + 1)),
      numberOption(k === 0 ? 0 : Math.pow(base, k - 1)),
    );
  },
  sample: (rng, difficulty) => {
    const ask = rng.pick(['y', 'x', 'base'] as const);
    const pool = (difficulty > 1 ? READ_POINTS_HARD : READ_POINTS).filter(
      // Reading a base needs a point above the axis; (1, 0) is on every curve.
      (point) => ask !== 'base' || point.k >= 1,
    );
    return { ...rng.pick(pool), ask };
  },
  render: ({ base, k, ask }): Slide => {
    const label =
      ask === 'y'
        ? `(${powText(base, k)}, ?)`
        : ask === 'x'
          ? `(?, ${figNum(k)})`
          : `(${powText(base, k)}, ${k})`;
    const svg = pointFigure(base, k, label);
    return {
      kind: 'expression',
      prompt:
        ask === 'base'
          ? [
              {
                kind: 'prose',
                text: `The curve is $y = \\log_{a} x$ for some base $a$, and the marked point on it is $(${powTex(base, k)}, ${k})$. Find $a$.`,
              },
              { kind: 'diagram', svg },
            ]
          : [
              {
                kind: 'prose',
                text:
                  ask === 'y'
                    ? `The curve is $y = \\log_{${base}} x$. The marked point is $(${powTex(base, k)}, y)$. Find $y$.`
                    : `The curve is $y = \\log_{${base}} x$. The marked point is $(x, ${k})$. Find $x$.`,
              },
              { kind: 'diagram', svg },
            ],
      lead: ask === 'y' ? 'y =' : ask === 'x' ? 'x =' : 'a =',
      keypad: ask === 'x' && k < 0 ? FRACTION_KEYS : [],
      answer: ask === 'y' ? `${k}` : ask === 'x' ? powAnswer(base, k) : `${base}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, k, ask }) => {
    const x = powTex(base, k);
    if (ask === 'y') {
      return [
        { text: `The height of $y = \\log_{${base}} x$ above any $x$ is the power of $${base}$ that gives that $x$.` },
        { tex: `${base}^{${k}} = ${x}` },
        { tex: `\\log_{${base}}\\left(${x}\\right) = ${k}` },
        {
          text:
            k === 0
              ? 'So $y = 0$. Every logarithm curve crosses the $x$-axis at $x = 1$, whatever its base.'
              : `So $y = ${k}$, and the point is $(${x}, ${k})$.`,
        },
      ];
    }
    if (ask === 'x') {
      return [
        { text: `A height of $${k}$ means $\\log_{${base}} x = ${k}$. Turn that into index form.` },
        { tex: `\\log_{${base}} x = ${k}` },
        { tex: `x = ${base}^{${k}} = ${x}` },
        {
          text:
            k < 0
              ? 'A negative height means a power below zero, so $x$ is a fraction between 0 and 1. The curve is below the axis there.'
              : `So the point is $(${x}, ${k})$.`,
        },
      ];
    }
    return [
      { text: `The point says $\\log_{a}\\left(${x}\\right) = ${k}$, which in index form is $a^{${k}} = ${x}$.` },
      k === 1
        ? { tex: `a^{1} = ${x} \\implies a = ${base}` }
        : { tex: `a^{${k}} = ${x} \\implies a = ${base}` },
      {
        text:
          k === 1
            ? `A height of 1 always sits at the base: $y = \\log_{a} x$ passes through $(a, 1)$.`
            : `Check: $${base}^{${k}} = ${x}$. The point at height 1 would be $(${base}, 1)$.`,
      },
    ];
  },
};

interface GraphSliderParams {
  base: number;
  /** The height of the dashed line. The answer is base^level. */
  level: number;
  /** Whether the prompt names the base; when not, the slide asks for it. */
  named: boolean;
  /** Extra room right of the answer, so the track is not framed on it exactly. */
  extra: number;
}

function graphSliderPool(bases: number[], cap: number): Omit<GraphSliderParams, 'extra'>[] {
  const out: Omit<GraphSliderParams, 'extra'>[] = [];
  for (const base of bases) {
    out.push({ base, level: 1, named: false }, { base, level: 0, named: true });
    for (let level = 2; Math.pow(base, level) <= cap; level += 1) out.push({ base, level, named: true });
  }
  return out;
}

const GRAPH_SLIDES = graphSliderPool([2, 3, 4, 5, 6, 7, 8, 9], 32);
const GRAPH_SLIDES_HARD = graphSliderPool([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 40);

/**
 * Where y = log_b(x) crosses a level, found on the curve.
 *
 * Three of them: the x-axis, which every such curve crosses at 1; the line
 * y = 1, which it crosses at the base, and which is how a base is read off a
 * graph; and a higher line, crossed at a power of the base.
 */
const graphSlider: Generator<GraphSliderParams> = {
  id: 'log-graph-slider',
  sample: (rng, difficulty) => ({
    ...rng.pick(difficulty > 1 ? GRAPH_SLIDES_HARD : GRAPH_SLIDES),
    extra: rng.int(0, 2),
  }),
  render: ({ base, level, named, extra }): Slide => {
    const answer = Math.pow(base, level);
    const top = answer + 2 + extra + Math.ceil(answer * 0.25);
    const left = -0.06 * top;
    const svg = logGraphSvg({
      xMin: left,
      xMax: top,
      yMin: -2.5,
      yMax: Math.max(logOf(base, top), level) + 0.8,
      curves: [{ f: logCurve(base) }],
      horizontals: level === 0 ? [] : [level],
      label: 'A logarithm curve and a level to find it at',
    });
    const text = !named
      ? 'The curve is $y = \\log_{a} x$ for a base $a$ that is not given, and the dashed line is $y = 1$. Slide to the value of $a$.'
      : level === 0
        ? `The curve is $y = \\log_{${base}} x$. Slide to where it crosses the $x$-axis.`
        : `The curve is $y = \\log_{${base}} x$ and the dashed line is $y = ${level}$. Slide to where they meet.`;
    return {
      kind: 'slider',
      prompt: [{ kind: 'prose', text }],
      min: 0,
      max: top,
      step: 1,
      answer,
      readout: named ? 'x = {v}' : 'a = {v}',
      figure: { svg, ...markerWindow(left, top) },
    };
  },
  solution: ({ base, level, named }) => {
    if (!named) {
      return [
        { text: 'The curve meets $y = 1$ where $\\log_{a} x = 1$, which in index form is $x = a^{1} = a$.' },
        { tex: `\\log_{a} x = 1 \\iff x = a` },
        { text: `So the crossing is at the base itself: here $a = ${base}$. Every curve $y = \\log_{a} x$ passes through $(a, 1)$.` },
      ];
    }
    if (level === 0) {
      return [
        { text: `The curve meets the $x$-axis where $\\log_{${base}} x = 0$.` },
        { tex: `\\log_{${base}} x = 0 \\iff x = ${base}^{0} = 1` },
        { text: 'So it crosses at $x = 1$. That is true of every base, because any number to the power 0 is 1.' },
      ];
    }
    return [
      { text: `The curve meets the line where $\\log_{${base}} x = ${level}$. Turn that into index form.` },
      { tex: `\\log_{${base}} x = ${level} \\iff x = ${base}^{${level}} = ${Math.pow(base, level)}` },
      { text: `Each step of 1 up the curve multiplies $x$ by $${base}$, which is why it climbs so slowly.` },
    ];
  },
};

interface PointsTilesParams {
  base: number;
  /** The three points are (base^k, k) for these k, in order. */
  ks: number[];
  /** Which coordinate of each point is blank. */
  blanks: ('x' | 'y')[];
}

/**
 * Three points on y = log_b(x), with one coordinate of each to fill in.
 *
 * The pattern is the thing: (1, 0), (b, 1), (b^2, 2). Multiplying x by the base
 * adds one to the height, and a learner who sees that has the whole curve.
 */
const pointsTiles: Generator<PointsTilesParams> = {
  id: 'log-graph-points-tiles',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 6);
    const cap = difficulty > 1 ? 200 : 100;
    const ks = (difficulty > 1 ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]).filter((k) => Math.pow(base, k) <= cap);
    const chosen = rng.sample(ks, 3).sort((a, b) => a - b);
    // A fraction cannot sit in the template, where `\frac{1}{3}` would lose its
    // `{1}` to the blank-marker split, so the x of a point below the axis is
    // always the blank.
    return { base, ks: chosen, blanks: chosen.map((k) => (k < 0 ? 'x' : rng.pick(['x', 'y'] as const))) };
  },
  render: ({ base, ks, blanks }): Slide => {
    const answer = ks.map((k, i) => (blanks[i] === 'x' ? powTex(base, k) : `${k}`));
    const template = ks
      .map((k, i) => (blanks[i] === 'x' ? `({${i}}, ${k})` : `(${Math.pow(base, k)}, {${i}})`))
      .join(' \\quad ');
    const distractors = ks.flatMap((k, i) => {
      if (blanks[i] === 'y') return [`${Math.pow(base, k)}`, `${k + 1}`, `${base}`];
      if (k < 0) return [`${-Math.pow(base, -k)}`];
      if (k === 0) return ['0', `${base}`];
      return [`${base * k}`, `${base + k}`];
    });
    const xs = ks.map((k) => Math.pow(base, k));
    const xMax = Math.max(...xs) * 1.2 + 0.5;
    const svg = logGraphSvg({
      xMin: -0.06 * xMax,
      xMax,
      yMin: Math.min(-1.5, ks[0] - 1.2),
      yMax: ks[2] + 1,
      curves: [{ f: logCurve(base) }],
      marks: ks.map((k) => ({ x: Math.pow(base, k), y: k })),
      label: 'A logarithm curve with three points marked',
    });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `All three points lie on $y = \\log_{${base}} x$. Fill in the missing coordinates.` },
        { kind: 'diagram', svg },
      ],
      template,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: ({ base, ks }) => [
    { text: `Every point on $y = \\log_{${base}} x$ has the form $(${base}^{k}, k)$: the height is the power of $${base}$ that gives $x$.` },
    { tex: ks.map((k) => `\\left(${powTex(base, k)}, ${k}\\right)`).join(' \\quad ') },
    {
      text: `Multiplying $x$ by $${base}$ adds 1 to the height. ${
        ks[0] <= 0
          ? 'And $(1, 0)$ is on every logarithm curve, whatever the base.'
          : ks[0] === 1
            ? 'One step further back is $(1, 0)$, which is on every logarithm curve.'
            : `So going back, $(${base}, 1)$ and $(1, 0)$ are on it too.`
      }`,
    },
  ],
};

interface OnCurveParams {
  base: number;
  k: number;
  kind: 'on' | 'swapped' | 'off' | 'negative' | 'zero';
}

/** The point an `OnCurveParams` describes, as it is written and as a height. */
function onCurvePoint({ base, k, kind }: OnCurveParams): { x: string; y: number } {
  if (kind === 'swapped') return { x: `${k}`, y: Math.pow(base, k) };
  if (kind === 'negative') return { x: `${-Math.pow(base, k)}`, y: k };
  if (kind === 'zero') return { x: '0', y: k };
  return { x: powTex(base, k), y: kind === 'off' ? k + 1 : k };
}

/**
 * Is this point on y = log_b(x)?
 *
 * Two questions settle it, in order: is x positive at all, and does the base to
 * the height give x. The swapped point (k, b^k) is the one worth catching,
 * since it is on the *exponential* curve instead.
 */
const onCurveFlow: Generator<OnCurveParams> = {
  id: 'log-on-curve-flow',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 6);
    const kind = rng.pick(['on', 'on', 'swapped', 'off', 'negative', 'zero'] as const);
    const ks = (kind === 'swapped' ? [2, 3] : difficulty > 1 ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]).filter(
      (k) => Math.pow(base, k) <= 200,
    );
    return { base, k: rng.pick(ks), kind };
  },
  render: (params): Slide => {
    const { base, kind } = params;
    const point = onCurvePoint(params);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Is this point on the curve $y = \\log_{${base}} x$? Work down the questions to decide.`,
        },
      ],
      subject: `\\left(${point.x}, ${point.y}\\right)`,
      steps: [
        {
          id: 'domain',
          ask: 'Is the $x$-coordinate greater than 0?',
          branches: [
            { label: 'Yes', to: 'power' },
            {
              label: 'No',
              outcome: 'Not on the curve. A logarithm only takes positive inputs, so the curve never reaches $x \\le 0$.',
            },
          ],
        },
        {
          id: 'power',
          ask: `Does $${base}$ to the power of the $y$-coordinate give the $x$-coordinate?`,
          branches: [
            { label: 'Yes', outcome: 'On the curve.' },
            { label: 'No', outcome: 'Not on the curve. At that $x$ the curve is at a different height.' },
          ],
        },
      ],
      answer: kind === 'negative' || kind === 'zero' ? ['No'] : kind === 'on' ? ['Yes', 'Yes'] : ['Yes', 'No'],
    };
  },
  solution: (params) => {
    const { base, k, kind } = params;
    const point = onCurvePoint(params);
    if (kind === 'negative' || kind === 'zero') {
      return [
        { text: `The $x$-coordinate is $${point.x}$, and $\\log_{${base}}$ of a number that is not positive does not exist.` },
        { tex: `${base}^{y} > 0 \\text{ for every } y` },
        { text: 'So the whole curve sits to the right of the $y$-axis, which it approaches but never meets.' },
      ];
    }
    if (kind === 'on') {
      return [
        { text: `The $x$-coordinate is positive, so check the height.` },
        { tex: `${base}^{${k}} = ${powTex(base, k)}` },
        { text: `The height matches, so $(${point.x}, ${point.y})$ is on the curve.` },
      ];
    }
    return [
      { text: `The $x$-coordinate is positive, so check the height.` },
      {
        // The swapped point's height is a power of the base, so the base to that
        // power is far too big to print; it is enough that it is not k.
        tex:
          kind === 'swapped'
            ? `${base}^{${point.y}} \\ne ${point.x}`
            : `${base}^{${point.y}} = ${Math.pow(base, point.y)} \\ne ${point.x}`,
      },
      {
        text:
          kind === 'swapped'
            ? `So it is not on the curve. $(${k}, ${point.y})$ is on $y = ${base}^{x}$ instead: the coordinates are the wrong way round.`
            : `So it is not on the curve. At $x = ${point.x}$ the curve's height is $${k}$.`,
      },
    ];
  },
};

interface GraphMatchParams {
  base: number;
  k: number;
  shape: 'log' | 'exp';
}

const MATCH_POINTS = logPoints([2, 3, 4, 5, 6, 7], [1, 2, 3], 64);
const MATCH_POINTS_HARD = logPoints([2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3], 100);

/**
 * Which equation is this curve?
 *
 * The shape says logarithm or exponential; the marked point says the base. The
 * distractors are the other shape with the same base, and bases read off the
 * wrong coordinate.
 */
const graphMatch: Generator<GraphMatchParams> = {
  id: 'log-graph-match',
  sample: (rng, difficulty) => ({
    ...rng.pick(difficulty > 1 ? MATCH_POINTS_HARD : MATCH_POINTS),
    shape: rng.pick(['log', 'exp'] as const),
  }),
  render: ({ base, k, shape }): Slide => {
    const value = Math.pow(base, k);
    const logTexOf = (b: number) => `y = \\log_{${b}} x`;
    const expTexOf = (b: number) => `y = ${b}^{x}`;
    const labels =
      shape === 'log'
        ? [
            logTexOf(base),
            expTexOf(base),
            logTexOf(k >= 2 ? value : base + 1),
            logTexOf(k >= 2 && k !== base ? k : base + 2),
          ]
        : [
            expTexOf(base),
            logTexOf(base),
            expTexOf(k >= 2 ? value : base + 1),
            // x^b passes through (k, b^k) exactly when k^b = b^k, as 4^2 = 2^4 does.
            Math.pow(k, base) !== value ? `y = x^{${base}}` : expTexOf(base + 2),
          ];
    const unique = [...new Set(labels)];
    const options = turned(
      unique.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
      mix(base, k, shape === 'log' ? 1 : 2),
    );
    const xMax = shape === 'log' ? value * 1.3 : k + 1.2;
    const xMin = shape === 'log' ? -0.06 * xMax : -2.5;
    const point = shape === 'log' ? { x: value, y: k } : { x: k, y: value };
    const svg = logGraphSvg({
      xMin,
      xMax,
      yMin: shape === 'log' ? -2.5 : -0.12 * value * 1.3,
      yMax: shape === 'log' ? Math.max(logOf(base, xMax), k) + 0.8 : value * 1.3,
      curves: [{ f: shape === 'log' ? logCurve(base) : (x) => Math.pow(base, x) }],
      marks: [point],
      labels: [{ ...point, text: `(${point.x}, ${point.y})` }],
      label: 'A curve with one point marked',
    });
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Which equation does this curve have? The marked point is $(${point.x}, ${point.y})$.` },
        { kind: 'diagram', svg },
      ],
      options,
      correctId: 'correct',
    };
  },
  solution: ({ base, k, shape }) => {
    const value = Math.pow(base, k);
    return shape === 'log'
      ? [
          { text: 'The curve rises ever more slowly and runs down beside the $y$-axis without touching it: the shape of a logarithm.' },
          { tex: `\\log_{a}\\left(${value}\\right) = ${k}` },
          { tex: `a^{${k}} = ${value} \\implies a = ${base}` },
          { text: `So it is $y = \\log_{${base}} x$. Its mirror image in $y = x$ is $y = ${base}^{x}$, which passes through $(${k}, ${value})$ instead.` },
        ]
      : [
          { text: 'The curve rises ever faster and flattens towards the $x$-axis on the left: the shape of an exponential.' },
          { tex: `a^{${k}} = ${value} \\implies a = ${base}` },
          { text: `So it is $y = ${base}^{x}$. Its mirror image in $y = x$ is $y = \\log_{${base}} x$, which passes through $(${value}, ${k})$ instead.` },
        ];
  },
};

interface InversePointParams {
  base: number;
  k: number;
  /** Which curve the given point is on. The answer is on the other. */
  from: 'exp' | 'log';
}

/**
 * Reflecting a point in y = x: the coordinates swap.
 *
 * That is all "inverse" means on a graph, and it is why every fact about
 * y = b^x has a twin on y = log_b(x): (0, 1) becomes (1, 0), (1, b) becomes
 * (b, 1), and a point with a fractional height becomes one near the asymptote.
 */
const inversePoint: Generator<InversePointParams> = {
  id: 'log-inverse-point',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 6);
    const ks = (difficulty > 1 ? [-2, -1, 0, 1, 2, 3] : [0, 1, 2, 3]).filter(
      (k) => Math.pow(base, Math.abs(k)) <= 100,
    );
    return { base, k: rng.pick(ks), from: rng.pick(['exp', 'log'] as const) };
  },
  render: ({ base, k, from }): Slide => {
    const power = powTex(base, k);
    const given = from === 'exp' ? `\\left(${k}, ${power}\\right)` : `\\left(${power}, ${k}\\right)`;
    const answer = from === 'exp' ? [power, `${k}`] : [`${k}`, power];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text:
            from === 'exp'
              ? `This point is on $y = ${base}^{x}$. Reflect it in the line $y = x$ to get a point on $y = \\log_{${base}} x$.`
              : `This point is on $y = \\log_{${base}} x$. Reflect it in the line $y = x$ to get a point on $y = ${base}^{x}$.`,
        },
        { kind: 'display', tex: given },
      ],
      template: '({0}, {1})',
      bank: bankOf(answer, [
        `${-k}`,
        k >= 0 ? `${-Math.pow(base, k)}` : `${Math.pow(base, -k)}`,
        `${base}`,
        `${k + 1}`,
      ]),
      answer,
    };
  },
  solution: ({ base, k, from }) => {
    const power = powTex(base, k);
    return [
      { text: 'Reflecting in $y = x$ swaps the two coordinates, and nothing else.' },
      {
        tex:
          from === 'exp'
            ? `\\left(${k}, ${power}\\right) \\to \\left(${power}, ${k}\\right)`
            : `\\left(${power}, ${k}\\right) \\to \\left(${k}, ${power}\\right)`,
      },
      {
        text: `Check: $${base}^{${k}} = ${power}$, so $\\log_{${base}}\\left(${power}\\right) = ${k}$. The two statements are the same fact, which is why the two curves are mirror images.`,
      },
    ];
  },
};

interface MirrorSliderParams {
  base: number;
  k: number;
  /** The marked point is on this curve; the learner finds its reflection on the other. */
  from: 'exp' | 'log';
}

/** Where the figure's left and bottom edges sit, so negative answers fit. */
const MIRROR_MARGIN = 3;
/** Tall enough that the two axes can share one scale. */
const MIRROR_HEIGHT = 240;

function mirrorPool(bases: number[], cap: number): MirrorSliderParams[] {
  const out: MirrorSliderParams[] = [];
  for (const base of bases) {
    for (let k = 0; Math.pow(base, k) <= cap; k += 1) out.push({ base, k, from: 'exp' });
    for (let k = -2; Math.pow(base, k) <= cap; k += 1) out.push({ base, k, from: 'log' });
  }
  return out;
}

const MIRRORS = mirrorPool([2, 3, 4, 5], 16);
const MIRRORS_HARD = mirrorPool([2, 3, 4, 5, 6, 7, 8], 27);

/**
 * Both curves and the mirror between them, drawn to one scale.
 *
 * plotSvg stretches x and y independently, and a reflection in y = x only
 * looks like one when a unit is the same length both ways — otherwise the
 * dashed line is not at 45 degrees and the two curves do not look alike. So
 * the window is worked out from the figure's shape rather than the other way
 * round: whatever x range the points need, the y range follows from it.
 */
const mirrorSlider: Generator<MirrorSliderParams> = {
  id: 'log-mirror-slider',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? MIRRORS_HARD : MIRRORS),
  render: ({ base, k, from }): Slide => {
    const power = Math.pow(base, k);
    const ratio = (MIRROR_HEIGHT - 2 * PLOT_PAD) / (PLOT_WIDTH - 2 * PLOT_PAD);
    const need = Math.max(power, k) + 1.5;
    const right = Math.max(need, (need + MIRROR_MARGIN) / ratio - MIRROR_MARGIN);
    const top = -MIRROR_MARGIN + (right + MIRROR_MARGIN) * ratio;
    const point = from === 'exp' ? { x: k, y: power } : { x: power, y: k };
    const svg = logGraphSvg({
      xMin: -MIRROR_MARGIN,
      xMax: right,
      yMin: -MIRROR_MARGIN,
      yMax: top,
      height: MIRROR_HEIGHT,
      curves: [
        // Neither curve in the accent colour: the slider's marker is drawn in
        // it, and a purple curve beside a purple marker reads as one thing.
        { f: (x) => Math.pow(base, x) },
        { f: logCurve(base) },
        { f: (x) => x, dashed: true },
      ],
      // No coordinates beside the point: the prompt gives them, and between
      // two curves and a diagonal there is no clear space to print them in.
      marks: [point],
      label: 'An exponential curve and a logarithm curve, reflected in the line y = x',
    });
    const given = from === 'exp' ? `(${k}, ${powTex(base, k)})` : `(${powTex(base, k)}, ${k})`;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            from === 'exp'
              ? `The curves are $y = ${base}^{x}$ and $y = \\log_{${base}} x$, mirror images in the dashed line $y = x$. The marked point $${given}$ is on $y = ${base}^{x}$. Slide to the $x$-coordinate of its reflection.`
              : `The curves are $y = ${base}^{x}$ and $y = \\log_{${base}} x$, mirror images in the dashed line $y = x$. The marked point $${given}$ is on $y = \\log_{${base}} x$. Slide to the $x$-coordinate of its reflection.`,
        },
      ],
      min: -MIRROR_MARGIN,
      max: Math.floor(right),
      step: 1,
      answer: from === 'exp' ? power : k,
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(-MIRROR_MARGIN, right) },
    };
  },
  solution: ({ base, k, from }) => {
    const power = powTex(base, k);
    return [
      { text: 'Reflecting in $y = x$ swaps the coordinates, so the reflected point is the marked one written the other way round.' },
      {
        tex:
          from === 'exp'
            ? `\\left(${k}, ${power}\\right) \\to \\left(${power}, ${k}\\right)`
            : `\\left(${power}, ${k}\\right) \\to \\left(${k}, ${power}\\right)`,
      },
      {
        text:
          from === 'exp'
            ? `So its $x$-coordinate is $${power}$, and indeed $\\log_{${base}}\\left(${power}\\right) = ${k}$.`
            : `So its $x$-coordinate is $${k}$, and indeed $${base}^{${k}} = ${power}$.`,
      },
    ];
  },
};

interface UndoParams {
  base: number;
  /** A power inside a logarithm: log_b(b^k). */
  k: number;
  /** A logarithm inside a power, b^(log_b(b^j)), or the second base's power. */
  j: number;
  /** The second base, for the form that adds one of each. */
  other: number;
  form: 'log-of-power' | 'power-of-log' | 'sum' | 'scaled';
}

/** The expression an `UndoParams` describes. */
function undoExpr({ base, k, j, other, form }: UndoParams): Expr {
  const logOfPower = log(num(base), pow(num(base), num(k)));
  if (form === 'log-of-power') return logOfPower;
  if (form === 'power-of-log') return pow(num(base), log(num(base), num(Math.pow(base, j))));
  if (form === 'scaled') return bin('*', num(j), logOfPower);
  return bin('+', logOfPower, pow(num(other), log(num(other), num(Math.pow(other, j)))));
}

/**
 * The logarithm and the exponential undo each other.
 *
 * That is the algebra of the reflection: log_b(b^k) = k and b^(log_b(n)) = n.
 * Asked as an `evaluate` slide, in the head, because the point is to see the
 * two cancel rather than to work either one out. The numbers inside are
 * powers of the base so every value on the slide is whole, as this widget
 * requires; the reason it cancels does not depend on that.
 */
const undoEvaluate: Generator<UndoParams> = {
  id: 'log-undo-evaluate',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 5);
    const form = rng.pick(['log-of-power', 'power-of-log', 'sum', 'scaled'] as const);
    const others = [2, 3, 4, 5, 6, 7].filter((b) => b !== base);
    const other = rng.pick(others);
    const j = form === 'scaled' ? rng.int(2, 5) : rng.int(1, other > 4 || base > 4 ? 2 : 3);
    return { base, k: rng.int(2, difficulty > 1 ? 9 : 6), j, other, form };
  },
  render: (params): Slide => {
    const { base, k, j, other, form } = params;
    const power = Math.pow(base, k);
    const [correct, ...wrong] =
      form === 'log-of-power'
        ? [k, power, base * k, k + 1]
        : form === 'power-of-log'
          ? [Math.pow(base, j), j, base * j, Math.pow(base, j + 1)]
          : form === 'scaled'
            ? [j * k, j + k, j * power, k]
            : [k + Math.pow(other, j), k + j, power + Math.pow(other, j), k * Math.pow(other, j)];
    const choices = [...new Set([correct, ...wrong])];
    for (let gap = 1; choices.length < 4; gap += 1) {
      if (!choices.includes(correct + gap)) choices.push(correct + gap);
    }
    return {
      kind: 'evaluate',
      prompt: [
        {
          kind: 'prose',
          text: 'Evaluate the expression. A logarithm and a power of the same base undo each other.',
        },
      ],
      expr: undoExpr(params),
      options: turned(choices.slice(0, 4).map(String), mix(base, k, j, other)),
    };
  },
  solution: ({ base, k, j, other, form }) => {
    const power = Math.pow(base, k);
    if (form === 'log-of-power') {
      return [
        { text: `$\\log_{${base}}$ asks what power of $${base}$ gives the number inside, and the number inside is written as a power of $${base}$ already.` },
        { tex: `\\log_{${base}}\\left(${base}^{${k}}\\right) = ${k}` },
        { text: `Working out $${base}^{${k}} = ${power}$ first gets there too, but the logarithm only hands the $${k}$ back.` },
      ];
    }
    if (form === 'power-of-log') {
      const inside = Math.pow(base, j);
      return [
        { text: `$\\log_{${base}}\\left(${inside}\\right)$ is the power of $${base}$ that gives $${inside}$, and raising $${base}$ to that power gives $${inside}$ back.` },
        { tex: `${base}^{\\log_{${base}}\\left(${inside}\\right)} = ${inside}` },
        { text: `That holds for any positive number inside, not only a power: $${base}^{\\log_{${base}} x} = x$.` },
      ];
    }
    if (form === 'scaled') {
      return [
        { text: 'The logarithm of a power of its own base is just that power.' },
        { tex: `${j} \\times \\log_{${base}}\\left(${base}^{${k}}\\right) = ${j} \\times ${k} = ${j * k}` },
        { text: 'The multiplication waits until the logarithm is a number.' },
      ];
    }
    const inside = Math.pow(other, j);
    return [
      { text: 'Each half undoes itself: a logarithm of a power of its base, and a power of a logarithm with the same base.' },
      { tex: `\\log_{${base}}\\left(${base}^{${k}}\\right) = ${k}` },
      { tex: `${other}^{\\log_{${other}}\\left(${inside}\\right)} = ${inside}` },
      { tex: `${k} + ${inside} = ${k + inside}` },
    ];
  },
};

interface TransformSliderParams {
  base: number;
  /** The curve is y = log_b(x - k) + c. */
  k: number;
  c: number;
  ask: 'asymptote' | 'intercept';
  extra: number;
}

/**
 * The asymptote and the x-intercept after a translation.
 *
 * The asymptote is where the inside of the logarithm is zero, so only a change
 * inside moves it; the intercept is where the whole thing is zero, so either
 * change moves that. Asked on the curve so the learner sees both move.
 */
const transformSlider: Generator<TransformSliderParams> = {
  id: 'log-transform-slider',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 4 : 3);
    const ask = rng.pick(['asymptote', 'intercept'] as const);
    // An intercept is whole only when the constant is not positive: it sits at
    // k + b^(-c).
    const cs = ask === 'asymptote' ? [-2, -1, 0, 1, 2] : [0, -1, ...(base <= 3 ? [-2] : [])];
    return { base, k: rng.int(-3, difficulty > 1 ? 6 : 5), c: rng.pick(cs), ask, extra: rng.int(0, 2) };
  },
  render: ({ base, k, c, ask, extra }): Slide => {
    const answer = ask === 'asymptote' ? k : k + Math.pow(base, -c);
    const min = Math.min(k, 0) - 2;
    const max = Math.max(answer, k, 0) + 3 + extra;
    const left = min - 0.5;
    const f = logCurve(base, k, c);
    const svg = logGraphSvg({
      xMin: left,
      xMax: max,
      yMin: Math.min(-3, c - 2),
      yMax: Math.max(f(max), c, 1) + 1,
      curves: [{ f }],
      verticals: ask === 'intercept' ? [{ x: k }] : [],
      label: 'A translated logarithm curve',
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            ask === 'asymptote'
              ? `The curve is $y = ${shiftedLogTex(base, k, c)}$. Slide to its vertical asymptote.`
              : `The curve is $y = ${shiftedLogTex(base, k, c)}$, and its asymptote is dashed. Slide to where it crosses the $x$-axis.`,
        },
      ],
      min,
      max,
      step: 1,
      answer,
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(left, max) },
    };
  },
  solution: ({ base, k, c, ask }) => {
    if (ask === 'asymptote') {
      return [
        { text: 'The curve runs down beside the line where the inside of the logarithm reaches zero.' },
        { tex: k === 0 ? 'x = 0' : `${shiftedX(k)} = 0 \\implies x = ${k}` },
        {
          text:
            c === 0
              ? `The asymptote is $x = ${k}$.`
              : `The asymptote is $x = ${k}$. The $${tail(c).trim()}$ outside moves the curve ${c > 0 ? 'up' : 'down'}, which leaves a vertical line where it was.`,
        },
      ];
    }
    const across = Math.pow(base, -c);
    return [
      { text: 'The curve crosses the $x$-axis where $y = 0$.' },
      { tex: `${shiftedLogTex(base, k, c)} = 0` },
      { tex: `\\log_{${base}}\\left(${shiftedX(k)}\\right) = ${-c}` },
      { tex: `${shiftedX(k)} = ${base}^{${-c}} = ${across}${k === 0 ? '' : ` \\implies x = ${k + across}`}` },
    ];
  },
};

interface TransformMatchParams {
  base: number;
  n: number;
  type: 'right' | 'left' | 'up' | 'down' | 'vstretch' | 'hstretch';
}

/** The equation a `TransformMatchParams` describes, right-hand side only. */
function transformedTex({ base, n, type }: TransformMatchParams): string {
  if (type === 'right') return shiftedLogTex(base, n);
  if (type === 'left') return shiftedLogTex(base, -n);
  if (type === 'up') return shiftedLogTex(base, 0, n);
  if (type === 'down') return shiftedLogTex(base, 0, -n);
  if (type === 'vstretch') return `${n}\\log_{${base}} x`;
  return `\\log_{${base}}\\left(${n}x\\right)`;
}

/**
 * What does this change do to the graph?
 *
 * Inside the bracket acts on x, and backwards: x - 3 moves the curve right, and
 * 3x squeezes it by a factor of 3. Outside acts on y, and the way it reads.
 */
const transformMatch: Generator<TransformMatchParams> = {
  id: 'log-transform-match',
  sample: (rng, difficulty) => ({
    base: rng.int(2, difficulty > 1 ? 9 : 5),
    n: rng.int(2, difficulty > 1 ? 7 : 5),
    type: rng.pick(['right', 'left', 'up', 'down', 'vstretch', 'hstretch'] as const),
  }),
  render: (params): Slide => {
    const { base, n, type } = params;
    const moved = (way: string) => `Translated ${n} units ${way}`;
    const vertical = `Stretched vertically, scale factor ${n}`;
    const wide = `Stretched horizontally, scale factor ${n}`;
    const narrow = `Stretched horizontally, scale factor 1/${n}`;
    const labels =
      type === 'right'
        ? [moved('right'), moved('left'), moved('up'), moved('down')]
        : type === 'left'
          ? [moved('left'), moved('right'), moved('up'), moved('down')]
          : type === 'up'
            ? [moved('up'), moved('down'), moved('right'), moved('left')]
            : type === 'down'
              ? [moved('down'), moved('up'), moved('left'), moved('right')]
              : type === 'vstretch'
                ? [vertical, wide, narrow, moved('up')]
                : [narrow, wide, vertical, moved('right')];
    const options = turned(
      labels.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: false })),
      mix(base, n, labels[0].length),
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `How does this graph compare with $y = \\log_{${base}} x$?` },
        { kind: 'display', tex: `y = ${transformedTex(params)}` },
      ],
      options,
      correctId: 'correct',
    };
  },
  solution: (params) => {
    const { base, n, type } = params;
    if (type === 'right' || type === 'left') {
      return [
        { text: 'A number added to $x$ inside the bracket moves the curve sideways, and the opposite way to its sign.' },
        { tex: `y = ${transformedTex(params)}` },
        {
          text: `The curve now reaches the height $\\log_{${base}} x$ used to have ${n} units ${type === 'right' ? 'later, so it has moved right' : 'sooner, so it has moved left'}. The asymptote moves with it, to $x = ${type === 'right' ? n : -n}$.`,
        },
      ];
    }
    if (type === 'up' || type === 'down') {
      return [
        { text: 'A number added after the logarithm changes every height by the same amount.' },
        { tex: `y = ${transformedTex(params)}` },
        { text: `So the curve moves ${n} units ${type}. The asymptote $x = 0$ is a vertical line, so it stays where it is.` },
      ];
    }
    if (type === 'vstretch') {
      return [
        { text: 'Multiplying the whole logarithm by a number multiplies every height by it.' },
        { tex: `y = ${transformedTex(params)}` },
        { text: `That is a vertical stretch, scale factor $${n}$. Height 0 stays 0, so the curve still crosses at $(1, 0)$.` },
      ];
    }
    return [
      { text: `Multiplying $x$ by $${n}$ inside the bracket means the curve reaches each height at $\\frac{1}{${n}}$ of the old $x$.` },
      { tex: `y = ${transformedTex(params)}` },
      { text: `That is a horizontal stretch, scale factor $\\frac{1}{${n}}$, and the curve now crosses the axis at $x = \\frac{1}{${n}}$. The asymptote stays at $x = 0$.` },
    ];
  },
};

interface TransformTilesParams {
  /** One digit, since a tiles template cannot hold a braced subscript. */
  base: number;
  mode: 'shift' | 'stretch';
  /** shift: y = log_b(x - k) + c. stretch: y = s log_b(x) + c. */
  k: number;
  c: number;
  s: number;
}

/** A number as a tile added or subtracted: "+ 3" or "- 3". */
function signedTile(value: number): string {
  return value >= 0 ? `+ ${value}` : `- ${-value}`;
}

/**
 * Build the equation of a transformed curve from what the graph shows.
 *
 * The asymptote gives the shift inside the bracket and the point where the old
 * (1, 0) landed gives the one outside; or, for a stretch, two points give the
 * scale factor and the constant.
 */
const transformTiles: Generator<TransformTilesParams> = {
  id: 'log-transform-tiles',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 9 : 5);
    const nonZero = (lo: number, hi: number) => rng.pick([...Array(hi - lo + 1).keys()].map((i) => i + lo).filter((v) => v !== 0));
    return {
      base,
      mode: rng.pick(['shift', 'shift', 'stretch'] as const),
      k: nonZero(-4, 5),
      c: nonZero(-3, 4),
      s: rng.int(2, difficulty > 1 ? 5 : 4),
    };
  },
  render: ({ base, mode, k, c, s }): Slide => {
    if (mode === 'shift') {
      const inner = signedTile(-k);
      const outer = signedTile(c);
      const left = Math.min(k, 0) - 1.5;
      const right = Math.max(k, 0) + 6;
      const f = logCurve(base, k, c);
      const svg = logGraphSvg({
        xMin: left,
        xMax: right,
        yMin: Math.min(-2.5, c - 2.5),
        yMax: Math.max(f(right), c, 0) + 1,
        curves: [{ f }],
        verticals: [{ x: k }],
        marks: [{ x: k + 1, y: c }],
        labels: [{ x: k + 1, y: c, text: `(${figNum(k + 1)}, ${figNum(c)})` }],
        label: 'A translated logarithm curve with its asymptote dashed',
      });
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `This is $y = \\log_{${base}} x$ translated. Its asymptote is the dashed line $x = ${k}$, and the point $(1, 0)$ has moved to $(${k + 1}, ${c})$. Complete its equation.`,
          },
          { kind: 'diagram', svg },
        ],
        template: `y = \\log_${base}(x {0}) {1}`,
        bank: bankOf([inner, outer], [signedTile(k), signedTile(-c), signedTile(-(k + 1))]),
        answer: [inner, outer],
      };
    }
    const outer = signedTile(c);
    const f = logCurve(base, 0, c, s);
    const right = base * 1.4 + 0.5;
    const svg = logGraphSvg({
      xMin: -0.06 * right,
      xMax: right,
      yMin: Math.min(-3, c - 3),
      yMax: Math.max(s + c, c, 0) + 1.2,
      curves: [{ f }],
      marks: [
        { x: 1, y: c },
        { x: base, y: s + c },
      ],
      labels: [{ x: base, y: s + c, text: `(${base}, ${figNum(s + c)})` }],
      label: 'A stretched and translated logarithm curve',
    });
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `This curve has the form $y = p\\log_{${base}} x + q$ and passes through $(1, ${c})$ and $(${base}, ${s + c})$. Complete its equation.`,
        },
        { kind: 'diagram', svg },
      ],
      template: `y = {0}\\log_${base}(x) {1}`,
      // p + q is the slip for p, and as a bare number it is spelled as the
      // tiles for q are, or "−1" appears twice when it is negative.
      bank: bankOf([`${s}`, outer], [s + c < 0 ? signedTile(s + c) : `${s + c}`, signedTile(-c), signedTile(s + c), `${base}`]),
      answer: [`${s}`, outer],
    };
  },
  solution: ({ base, mode, k, c, s }) => {
    if (mode === 'shift') {
      return [
        { text: `The asymptote is where the bracket is zero, so the bracket is $${shiftedX(k)}$.` },
        { text: `$(1, 0)$ is where $\\log_{${base}}$ of the bracket is 0, and it now sits at height $${c}$, so $${c}$ is added outside.` },
        { tex: `y = ${shiftedLogTex(base, k, c)}` },
      ];
    }
    return [
      { text: `At $x = 1$ the logarithm is 0, so the height there is $q$ alone: $q = ${c}$.` },
      { text: `At $x = ${base}$ the logarithm is 1, so the height is $p + q = ${s + c}$, giving $p = ${s}$.` },
      { tex: `y = ${s}\\log_{${base}} x${tail(c)}` },
    ];
  },
};

interface TransformFlowParams {
  base: number;
  n: number;
  type: 'shift-in' | 'stretch-in' | 'stretch-out' | 'shift-out';
  /** The direction of a shift. */
  sign: number;
}

/**
 * What does this transformation do to the asymptote and the intercept?
 *
 * The deciding question is inside or outside the logarithm, then add or
 * multiply. Only one of the four moves the asymptote, which is the fact a
 * learner most often gets wrong.
 */
const transformFlow: Generator<TransformFlowParams> = {
  id: 'log-transform-flow',
  sample: (rng, difficulty) => ({
    base: rng.int(2, difficulty > 1 ? 9 : 5),
    n: rng.int(2, difficulty > 1 ? 8 : 6),
    type: rng.pick(['shift-in', 'stretch-in', 'stretch-out', 'shift-out'] as const),
    sign: rng.sign(),
  }),
  render: ({ base, n, type, sign }): Slide => {
    const equation =
      type === 'shift-in'
        ? shiftedLogTex(base, sign * n)
        : type === 'shift-out'
          ? shiftedLogTex(base, 0, sign * n)
          : type === 'stretch-in'
            ? `\\log_{${base}}\\left(${n}x\\right)`
            : `${n}\\log_{${base}} x`;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Work down the questions to decide what this change does to the graph of $y = \\log_{${base}} x$.`,
        },
      ],
      subject: `y = ${equation}`,
      steps: [
        {
          id: 'inside',
          ask: 'Is the change made to $x$, inside the logarithm?',
          branches: [
            { label: 'Yes', to: 'inside-kind' },
            { label: 'No', to: 'outside-kind' },
          ],
        },
        {
          id: 'inside-kind',
          ask: 'Is a number added to or taken from $x$?',
          branches: [
            { label: 'Yes', outcome: 'A horizontal translation. The asymptote moves with the curve.' },
            {
              label: 'No',
              outcome: 'A horizontal stretch. The asymptote stays at $x = 0$ and the $x$-intercept moves.',
            },
          ],
        },
        {
          id: 'outside-kind',
          ask: 'Is the whole logarithm multiplied by a number?',
          branches: [
            {
              label: 'Yes',
              outcome: 'A vertical stretch. The asymptote and the $x$-intercept both stay where they were.',
            },
            {
              label: 'No',
              outcome: 'A vertical translation. The asymptote stays at $x = 0$ and the $x$-intercept moves.',
            },
          ],
        },
      ],
      answer:
        type === 'shift-in'
          ? ['Yes', 'Yes']
          : type === 'stretch-in'
            ? ['Yes', 'No']
            : type === 'stretch-out'
              ? ['No', 'Yes']
              : ['No', 'No'],
    };
  },
  solution: ({ base, n, type, sign }) => {
    if (type === 'shift-in') {
      const k = sign * n;
      return [
        { text: `The $${sign > 0 ? '-' : '+'} ${n}$ is inside the bracket, added to $x$: a horizontal translation.` },
        { tex: `${shiftedX(k)} = 0 \\implies x = ${k}` },
        { text: `So the asymptote moves to $x = ${k}$, and $(1, 0)$ moves to $(${k + 1}, 0)$.` },
      ];
    }
    if (type === 'stretch-in') {
      return [
        { text: `The $${n}$ multiplies $x$ inside the bracket: a horizontal stretch, scale factor $\\frac{1}{${n}}$.` },
        { tex: `${n}x = 1 \\implies x = \\frac{1}{${n}}` },
        { text: `The inside is still zero only at $x = 0$, so the asymptote stays, while the intercept moves to $x = \\frac{1}{${n}}$.` },
      ];
    }
    if (type === 'stretch-out') {
      return [
        { text: `The $${n}$ multiplies the whole logarithm: a vertical stretch, scale factor $${n}$.` },
        { tex: `${n} \\times 0 = 0` },
        { text: 'Height 0 stays 0, so the intercept stays at $x = 1$, and the asymptote $x = 0$ is untouched.' },
      ];
    }
    const c = sign * n;
    return [
      { text: `The $${tail(c).trim()}$ is outside the logarithm: a vertical translation, ${n} units ${c > 0 ? 'up' : 'down'}.` },
      { tex: `\\log_{${base}} x${tail(c)} = 0 \\implies x = ${base}^{${-c}}` },
      { text: 'A vertical line moved up or down is the same line, so the asymptote stays at $x = 0$. The intercept moves.' },
    ];
  },
};

interface SolveGraphParams {
  base: number;
  /** The curve is y = log_b(x - k); the line is y = c. */
  k: number;
  c: number;
}

/**
 * Solve log_b(x - k) = c, with the curve and the line drawn.
 *
 * The graph shows where the answer is and roughly what size it is; the index
 * form gives it exactly. The shift is what the question is about: forgetting
 * it gives b^c, which is where the *unshifted* curve would meet the line.
 */
const solveGraph: Generator<SolveGraphParams> = {
  id: 'log-solve-graph',
  choices: ({ base, k, c }) => {
    const power = Math.pow(base, c);
    return fourOptions(
      numberOption(k + power),
      numberOption(power),
      numberOption(power - k),
      numberOption(k + base * c),
      numberOption(k + Math.pow(c, base)),
    );
  },
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 5 : 4);
    const cs = [0, 1, 2, 3].filter((c) => Math.pow(base, c) <= (difficulty > 1 ? 64 : 27));
    const ks = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
    return { base, k: rng.pick(ks), c: rng.pick(cs) };
  },
  render: ({ base, k, c }): Slide => {
    const answer = k + Math.pow(base, c);
    const left = Math.min(k, 0) - 1;
    const right = answer + 2 + Math.ceil(Math.pow(base, c) * 0.2);
    const f = logCurve(base, k);
    const svg = logGraphSvg({
      xMin: left,
      xMax: right,
      yMin: -3,
      yMax: Math.max(f(right), c) + 1,
      curves: [{ f }],
      horizontals: c === 0 ? [] : [c],
      verticals: [{ x: k }],
      marks: [{ x: answer, y: c, hollow: true }],
      label: 'A translated logarithm curve meeting a level',
    });
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The graph shows $y = ${shiftedLogTex(base, k)}$, its asymptote dashed, meeting ${c === 0 ? 'the $x$-axis' : `the line $y = ${c}$`}. Solve the equation.`,
        },
        { kind: 'diagram', svg },
        { kind: 'display', tex: `${shiftedLogTex(base, k)} = ${c}` },
      ],
      lead: 'x =',
      keypad: [],
      answer: `${answer}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ base, k, c }) => {
    const power = Math.pow(base, c);
    return [
      { text: 'Write the logarithm in index form: the bracket is the base to the power on the right.' },
      { tex: `${shiftedX(k)} = ${base}^{${c}} = ${power}` },
      { tex: `x = ${power} ${k > 0 ? '+' : '-'} ${Math.abs(k)} = ${k + power}` },
      {
        text: `On the graph, the asymptote at $x = ${k}$ is where the curve starts from, and the crossing is $${power}$ to the right of it.`,
      },
    ];
  },
};

interface MeetParams {
  base: number;
  c: number;
  /** The second curve is log_b(x - shift) + c when shift > 0, log_b(x - shift) - c when shift < 0. */
  shift: number;
  extra: number;
}

/** Where log_b(x) meets the second curve of a `MeetParams`. */
function meetAt({ base, c, shift }: Omit<MeetParams, 'extra'>): number {
  const power = Math.pow(base, c);
  return shift > 0 ? (power * shift) / (power - 1) : -shift / (power - 1);
}

function meetPool(bases: number[], cap: number): Omit<MeetParams, 'extra'>[] {
  const out: Omit<MeetParams, 'extra'>[] = [];
  for (const base of bases) {
    for (const c of [1, 2]) {
      for (let size = 1; size <= 12; size += 1) {
        for (const shift of [size, -size]) {
          const x = meetAt({ base, c, shift });
          if (Number.isInteger(x) && x >= 1 && x <= cap) out.push({ base, c, shift });
        }
      }
    }
  }
  return out;
}

const MEETS = meetPool([2, 3, 4], 12);
const MEETS_HARD = meetPool([2, 3, 4, 5], 16);

/**
 * Where two logarithm curves meet.
 *
 * One is y = log_b(x); the other is it moved sideways and up or down, so the
 * two cross exactly once. Setting them equal and using the quotient law gives
 * a single logarithm, and the crossing falls out of index form.
 */
const meetSlider: Generator<MeetParams> = {
  id: 'log-meet-slider',
  sample: (rng, difficulty) => ({ ...rng.pick(difficulty > 1 ? MEETS_HARD : MEETS), extra: rng.int(0, 2) }),
  render: ({ base, c, shift, extra }): Slide => {
    const answer = meetAt({ base, c, shift });
    const lift = shift > 0 ? c : -c;
    const other = logCurve(base, shift, lift);
    const right = answer + 3 + extra;
    const left = -0.08 * right;
    const svg = logGraphSvg({
      xMin: left,
      xMax: right,
      yMin: -3,
      yMax: Math.max(logOf(base, right), other(right)) + 1,
      // The reference curve dashed rather than the other in the accent colour,
      // which is the slider marker's colour.
      curves: [{ f: logCurve(base), dashed: true }, { f: other }],
      label: 'Two logarithm curves that cross once',
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curves are $y = \\log_{${base}} x$ and $y = ${shiftedLogTex(base, shift, lift)}$. Slide to the $x$-coordinate where they meet.`,
        },
      ],
      min: 0,
      max: right,
      step: 1,
      answer,
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(left, right) },
    };
  },
  solution: ({ base, c, shift }) => {
    const power = Math.pow(base, c);
    const answer = meetAt({ base, c, shift });
    if (shift > 0) {
      return [
        { text: 'Set the two equal and gather the logarithms on one side.' },
        { tex: `\\log_{${base}} x - \\log_{${base}}\\left(${shiftedX(shift)}\\right) = ${c}` },
        { tex: `\\frac{x}{${shiftedX(shift)}} = ${base}^{${c}} = ${power}` },
        { tex: `x = ${power}x - ${power * shift} \\implies x = ${answer}` },
      ];
    }
    return [
      { text: 'Set the two equal and gather the logarithms on one side.' },
      { tex: `\\log_{${base}}\\left(${shiftedX(shift)}\\right) - \\log_{${base}} x = ${c}` },
      { tex: `\\frac{${shiftedX(shift)}}{x} = ${base}^{${c}} = ${power}` },
      { tex: `${shiftedX(shift)} = ${power}x \\implies x = ${answer}` },
    ];
  },
};

interface CompareParams {
  /** The two bases, smaller first. */
  low: number;
  high: number;
  /** The x asked about: n itself, or 1/n when `below` is set; 1 when n is 1. */
  n: number;
  below: boolean;
}

/**
 * Which base gives the higher curve at a given x?
 *
 * Right of 1, a smaller base climbs faster, because it needs a larger power to
 * reach the same x. Left of 1 the order flips, since both curves are negative
 * and the smaller base is further below. At 1 they meet. The flip is what the
 * question is for.
 */
const compareBases: Generator<CompareParams> = {
  id: 'log-compare-bases',
  sample: (rng, difficulty) => {
    const [low, high] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, difficulty > 1 ? 9 : 7), 2).sort((a, b) => a - b);
    const where = rng.pick(['above', 'above', 'below', 'below', 'one'] as const);
    if (where === 'one') return { low, high, n: 1, below: false };
    return { low, high, n: rng.int(where === 'above' ? 3 : 2, difficulty > 1 ? 60 : 30), below: where === 'below' };
  },
  render: ({ low, high, n, below }): Slide => {
    const at = n === 1 ? '1' : below ? `\\frac{1}{${n}}` : `${n}`;
    const answer = n === 1 ? 'meet' : below ? 'high' : 'low';
    const all = [
      { id: 'low', label: `y = \\log_{${low}} x`, tex: true },
      { id: 'high', label: `y = \\log_{${high}} x`, tex: true },
      { id: 'meet', label: 'They are at the same height', tex: false },
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which curve is higher at $x = ${at}$? Decide from the shapes of the curves, without working either one out.`,
        },
      ],
      options: turned(all, mix(low, high, n, below ? 1 : 0)),
      correctId: answer,
    };
  },
  solution: ({ low, high, n, below }) => {
    if (n === 1) {
      return [
        { text: 'Every logarithm is 0 at $x = 1$, whatever its base.' },
        { tex: `\\log_{${low}}\\left(1\\right) = \\log_{${high}}\\left(1\\right) = 0` },
        { text: 'So the two curves cross there. It is the only place they meet.' },
      ];
    }
    const x = below ? `\\frac{1}{${n}}` : `${n}`;
    return [
      { text: `Reaching $x = ${x}$ from 1 takes a larger power of a smaller base: $${low}$ has to be raised further than $${high}$ to get as far.` },
      { tex: `\\log_{${low}}\\left(${x}\\right) \\approx ${(Math.log(below ? 1 / n : n) / Math.log(low)).toFixed(2)}` },
      { tex: `\\log_{${high}}\\left(${x}\\right) \\approx ${(Math.log(below ? 1 / n : n) / Math.log(high)).toFixed(2)}` },
      {
        text: below
          ? `Left of 1 both are negative, so the larger size puts $y = \\log_{${low}} x$ further *below*. The higher curve is $y = \\log_{${high}} x$.`
          : `Right of 1 both are positive, so the smaller base is higher: $y = \\log_{${low}} x$.`,
      },
    ];
  },
};

interface InequalityParams {
  base: number;
  c: number;
  sense: 'less' | 'more';
}

/**
 * Solve log_b(x) < c or > c from the curve.
 *
 * The curve always rises, so the inequality keeps its direction when it goes
 * into index form. And a logarithm only exists right of 0, which is where the
 * lower end of a "less than" comes from: 0, not minus infinity.
 */
const inequalityTiles: Generator<InequalityParams> = {
  id: 'log-inequality-tiles',
  sample: (rng, difficulty) => {
    const base = rng.int(2, difficulty > 1 ? 7 : 6);
    const cs = (difficulty > 1 ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]).filter((c) => Math.pow(base, c) <= 125);
    return { base, c: rng.pick(cs), sense: rng.pick(['less', 'more'] as const) };
  },
  render: ({ base, c, sense }): Slide => {
    const bound = powTex(base, c);
    const answer = sense === 'less' ? ['0', bound] : [bound];
    const xMax = Math.max(Math.pow(base, c), 1) * 1.6 + 1;
    const svg = logGraphSvg({
      xMin: -0.06 * xMax,
      xMax,
      yMin: Math.min(-2.5, c - 1.5),
      yMax: Math.max(logOf(base, xMax), c) + 0.8,
      curves: [{ f: logCurve(base) }],
      horizontals: c === 0 ? [] : [c],
      marks: [{ x: Math.pow(base, c), y: c, hollow: true }],
      label: 'A logarithm curve and a level',
    });
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Use the graph of $y = \\log_{${base}} x$ to solve the inequality.` },
        { kind: 'display', tex: `\\log_{${base}} x ${sense === 'less' ? '<' : '>'} ${c}` },
        { kind: 'diagram', svg },
      ],
      template: sense === 'less' ? '{0} < x < {1}' : 'x > {0}',
      bank: bankOf(answer, [
        '-\\infty',
        `${c}`,
        `${base * c}`,
        '1',
        c >= 0 ? `${-Math.pow(base, c)}` : `${Math.pow(base, -c)}`,
      ]),
      answer,
    };
  },
  solution: ({ base, c, sense }) => {
    const bound = powTex(base, c);
    return [
      { text: `The curve meets the level $y = ${c}$ at $x = ${base}^{${c}} = ${bound}$, and it rises the whole way.` },
      { tex: `\\log_{${base}} x ${sense === 'less' ? '<' : '>'} ${c} \\iff x ${sense === 'less' ? '<' : '>'} ${bound}` },
      {
        text:
          sense === 'less'
            ? `But the curve only exists for $x > 0$, so the solution is $0 < x < ${bound}$. Below 0 there is no logarithm to be less than anything.`
            : `So the solution is $x > ${bound}$: everywhere the curve is above the line.`,
      },
    ];
  },
};

/* ---------- Level 6: linearising a model ---------- */

/*
 * Taking logarithms turns a power model y = kx^n, or an exponential model
 * y = ab^x, into a straight line; reading the line back gives the model. The
 * whole level is about which logarithm goes where, so every logarithm the
 * learner is asked to work out is whole: the constants are powers of 10, or of
 * e for natural logarithms, and so every intercept, gradient and plotted point
 * is a whole number. The real-life version, with ln 5 / ln 2 in it, is a
 * calculator's job rather than this level's.
 *
 * `log` means log base 10 throughout, as it does on a calculator. A tiles
 * template could not hold `\log_{10}` anyway: the braced 10 would be taken for
 * a blank.
 */

/** Which logarithm a model is straightened with. */
type LogKind = 'log' | 'ln';

/** A power model y = kx^n, or an exponential y = ab^x. */
type ModelKind = 'power' | 'exp';

/** Typing a power of 10 or of e needs the power key, and e. */
const POWER_KEYS: KeypadKey[] = [{ insert: '^' }, { insert: '(' }, { insert: ')' }];
const E_POWER_KEYS: KeypadKey[] = [{ insert: 'e', tex: true }, ...POWER_KEYS];

/** The logarithm of something, as written: `\log y` or `\ln y`. */
function lg(kind: LogKind, of: string): string {
  return kind === 'log' ? `\\log ${of}` : `\\ln ${of}`;
}

/** How the prose names the logarithm being taken. */
function logWords(kind: LogKind): string {
  return kind === 'log' ? 'logs to base 10' : 'natural logs';
}

/** The number whose logarithm is `c`, as the learner reads it: 10^c, or e^c. */
function unlogTex(kind: LogKind, c: number): string {
  if (kind === 'log') return `${Math.pow(10, c)}`;
  return c === 0 ? '1' : c === 1 ? 'e' : `e^{${c}}`;
}

/** The same number for the checker. Never displayed. */
function unlogAnswer(kind: LogKind, c: number): string {
  return kind === 'log' ? `${Math.pow(10, c)}` : `e^(${c})`;
}

/** Undoing a logarithm in the working: 10^2 = 100, or just e^2. */
function undoTex(kind: LogKind, c: number): string {
  return kind === 'log' ? `10^{${c}} = ${Math.pow(10, c)}` : c === 1 ? 'e^{1} = e' : `e^{${c}}`;
}

/** A power of 10 or of e left as a power, for a value too big to print whole. */
function powerOfTex(kind: LogKind, c: number): string {
  return kind === 'log' ? `10^{${c}}` : `e^{${c}}`;
}

/** The same, for the checker. */
function powerOfAnswer(kind: LogKind, c: number): string {
  return kind === 'log' ? `10^(${c})` : `e^(${c})`;
}

/** The model as it is written: y = 100x^3, y = 100 × 1000^x, y = e^2 e^(3x). */
function modelTex(model: ModelKind, kind: LogKind, c: number, m: number): string {
  // A thin space after an e, so e x^3 does not read as a word.
  const gap = kind === 'ln' ? '\\,' : '';
  const coefficient = c === 0 ? '' : `${unlogTex(kind, c)}${gap}`;
  if (model === 'power') return `y = ${coefficient}x^{${m}}`;
  if (kind === 'ln') return `y = ${coefficient}e^{${m === 1 ? '' : m}x}`;
  const growth = `${unlogTex(kind, m)}^{x}`;
  return c === 0 ? `y = ${growth}` : `y = ${unlogTex(kind, c)} \\times ${growth}`;
}

/** What goes along the bottom: log x for a power model, x itself for an exponential. */
function across(model: ModelKind, kind: LogKind): string {
  return model === 'power' ? lg(kind, 'x') : 'x';
}

/** The straight line a model becomes: log y = 2 + 3 log x, or log y = 2 + 3x. */
function lineTex(model: ModelKind, kind: LogKind, c: number, m: number): string {
  const run = across(model, kind);
  const slope = m === 1 ? run : `${m}${run}`;
  return c === 0 ? `${lg(kind, 'y')} = ${slope}` : `${lg(kind, 'y')} = ${c} + ${slope}`;
}

/** The general form of each model and of its straight line. */
function formTex(model: ModelKind): string {
  return model === 'power' ? 'y = kx^{n}' : 'y = ab^{x}';
}

function generalLineTex(model: ModelKind, kind: LogKind): string {
  return model === 'power'
    ? `${lg(kind, 'y')} = ${lg(kind, 'k')} + n${lg(kind, 'x')}`
    : `${lg(kind, 'y')} = ${lg(kind, 'a')} + x${lg(kind, 'b')}`;
}

/** The constant the intercept gives: k for a power model, a for an exponential. */
function constantOf(model: ModelKind): string {
  return model === 'power' ? 'k' : 'a';
}

/**
 * Taller than plotSvg's default, so a labelled point low on a steep line still
 * has room for its label above the x-axis.
 */
const LINE_HEIGHT = 190;

/** The window a line figure is drawn in: the origin in view and the line rising to the top-right. */
function lineWindow(c: number, m: number, right: number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const top = c + m * right;
  return { xMin: -0.08 * right, xMax: right, yMin: -0.15 * top, yMax: top * 1.08 + 0.4 };
}

interface LineView {
  model: ModelKind;
  kind: LogKind;
  c: number;
  m: number;
  /** The right-hand edge, in the plotted horizontal units. */
  right: number;
  labelled?: { x: number; y: number }[];
  horizontals?: number[];
  verticals?: number[];
}

/** A straightened model: its line, on axes named for what is plotted. */
function lineSvg({ model, kind, c, m, right, labelled = [], horizontals = [], verticals = [] }: LineView): string {
  const bottom = model === 'power' ? `${kind} x` : 'x';
  return logGraphSvg({
    ...lineWindow(c, m, right),
    curves: [{ f: (x) => c + m * x }],
    marks: labelled,
    labels: labelled.map((point) => ({ ...point, text: `(${point.x}, ${point.y})` })),
    horizontals,
    verticals: verticals.map((x) => ({ x })),
    axisNames: { x: bottom, y: `${kind} y` },
    height: LINE_HEIGHT,
    label: `A straight line on a graph of ${kind} y against ${bottom}`,
  });
}

interface LineParams {
  model: ModelKind;
  kind: LogKind;
  /** The intercept: log k, or log a. */
  c: number;
  /** The gradient: n, or log b. */
  m: number;
  /** Horizontal coordinates of the two points given, x1 < x2. */
  x1: number;
  x2: number;
}

function sampleLine(rng: Rng, difficulty: number, model: ModelKind): LineParams {
  const hard = difficulty > 1;
  const kind: LogKind = rng.chance(hard ? 0.5 : 0.3) ? 'ln' : 'log';
  // b = 10^m has to stay a number worth printing.
  const steepest = model === 'exp' && kind === 'log' ? 3 : hard ? 6 : 4;
  const x1 = rng.int(1, hard ? 4 : 3);
  return { model, kind, c: rng.int(1, hard ? 4 : 3), m: rng.int(1, steepest), x1, x2: x1 + rng.int(1, 3) };
}

/** The heights of a line's two given points. */
function heights({ c, m, x1, x2 }: LineParams): [number, number] {
  return [c + m * x1, c + m * x2];
}

/** The gradient and intercept of a line through two points, worked. */
function gradientSteps(params: LineParams): { tex: string }[] {
  const { c, m, x1, x2 } = params;
  const [y1, y2] = heights(params);
  return [
    { tex: `\\text{gradient} = \\frac{${y2} - ${y1}}{${x2} - ${x1}} = ${m}` },
    { tex: `\\text{intercept} = ${y1} - ${m} \\times ${x1} = ${c}` },
  ];
}

/**
 * The options in an order that puts the answer in the slot `salt` picks, once
 * `choiceVariant` has turned them.
 *
 * That turn is a hash of the labels, and these labels are short numbers, so
 * left alone the answer bunches into one or two slots. This tries the orders
 * until one lands where it should, the same way `steered` in complexPlane.ts
 * does; `turnOf` mirrors the private `rotation` in `choiceVariant.ts`.
 */
function steeredOptions(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const turnOf = (list: ChoiceOption[]) => {
    let hash = 0;
    for (const option of list) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % list.length;
  };
  const size = opts.length;
  const target = salt % size;
  const orders = (list: ChoiceOption[]): ChoiceOption[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((head, idx) => orders([...list.slice(0, idx), ...list.slice(idx + 1)]).map((rest) => [head, ...rest]));
  for (const order of orders(opts)) {
    const at = order.findIndex((option) => option.correct);
    if ((((at - turnOf(order)) % size) + size) % size === target) return order;
  }
  return opts;
}

interface ReadParams extends LineParams {
  /** The gradient's constant (n, or b) or the intercept's (k, or a). */
  ask: 'slope' | 'constant';
}

/** What a read question asks for: its name, and the answer for the checker. */
function readAsked({ model, kind, c, m, ask }: ReadParams): { name: string; answer: string } {
  if (ask === 'constant') return { name: constantOf(model), answer: unlogAnswer(kind, c) };
  return model === 'power' ? { name: 'n', answer: `${m}` } : { name: 'b', answer: unlogAnswer(kind, m) };
}

/** The options for a read question: the answer, the log left un-undone, and the lines mixed up. */
function readOptions(model: ModelKind, params: ReadParams): ChoiceOption[] {
  const { kind, c, m, x2, ask } = params;
  const [y1, y2] = heights(params);
  if (model === 'power' && ask === 'slope') {
    return fourOptions(
      numberOption(m),
      numberOption(y2 - y1),
      ...(Number.isInteger(y2 / x2) ? [numberOption(y2 / x2)] : []),
      numberOption(m + 1),
      numberOption(c),
      numberOption(y1),
    );
  }
  const value = ask === 'constant' ? c : m;
  const other = ask === 'constant' ? m : c;
  const undone = (n: number): ChoiceOption => ({ tex: unlogTex(kind, n), answer: unlogAnswer(kind, n) });
  return fourOptions(
    undone(value),
    numberOption(value),
    undone(other),
    kind === 'log' ? numberOption(10 * value) : { tex: `${value + 1}e`, answer: `${value + 1} * e` },
    undone(value + 1),
    undone(value + 2),
  );
}

/**
 * Read a model's constants off its straight line, through two marked points.
 *
 * The gradient of log y against log x is the power n itself; everything else
 * is a logarithm and has to be undone. That asymmetry is the lesson, and the
 * distractors are the logarithm left un-undone and the two lines mixed up.
 */
function lineRead(model: ModelKind): Generator<ReadParams> {
  return {
    id: `log-lin-${model}-read`,
    choices: (params) => steeredOptions(readOptions(model, params), mix(params.c, params.m, params.x1, params.x2)),
    sample: (rng, difficulty) => ({
      ...sampleLine(rng, difficulty, model),
      ask: rng.pick(['slope', 'constant'] as const),
    }),
    render: (params): Slide => {
      const { kind, c, m, x1, x2, ask } = params;
      const [y1, y2] = heights(params);
      const { name, answer } = readAsked(params);
      const typesPower = !(model === 'power' && ask === 'slope');
      return {
        kind: 'expression',
        prompt: [
          {
            kind: 'prose',
            text: `Taking ${logWords(kind)} of $${formTex(model)}$ gives a straight line. Its graph of $${lg(kind, 'y')}$ against $${across(model, kind)}$ passes through $(${x1}, ${y1})$ and $(${x2}, ${y2})$. Find $${name}$.`,
          },
          {
            kind: 'diagram',
            svg: lineSvg({ model, kind, c, m, right: x2 + 1, labelled: [{ x: x1, y: y1 }, { x: x2, y: y2 }] }),
          },
        ],
        lead: `${name} =`,
        keypad: !typesPower ? [] : kind === 'ln' ? E_POWER_KEYS : POWER_KEYS,
        answer,
        domain: 'real',
        mode: 'exact',
      };
    },
    solution: (params) => {
      const { kind, c, m, ask } = params;
      const [gradient, intercept] = gradientSteps(params);
      const slopeName = model === 'power' ? 'n' : lg(kind, 'b');
      const opening = {
        text: `Taking logs gives $${generalLineTex(model, kind)}$: the gradient is $${slopeName}$ and the intercept is $${lg(kind, constantOf(model))}$.`,
      };
      if (ask === 'slope') {
        return model === 'power'
          ? [opening, gradient, { text: `So $n = ${m}$. The power comes straight off the gradient, with nothing to undo.` }]
          : [opening, gradient, { text: `So $${lg(kind, 'b')} = ${m}$, and undoing the log gives $b$:` }, { tex: `b = ${undoTex(kind, m)}` }];
      }
      const name = constantOf(model);
      return [
        opening,
        gradient,
        intercept,
        { text: `So $${lg(kind, name)} = ${c}$, and undoing the log gives $${name}$:` },
        { tex: `${name} = ${undoTex(kind, c)}` },
      ];
    },
  };
}

interface LineEvalParams {
  base: number;
  /** The constant is base^c. */
  c: number;
  /** Power model: the power n. Exponential: b is base^m. */
  m: number;
  /** Power model: x is base^p. Exponential: x is p. */
  p: number;
}

/** The highest power of each base worth printing inside a logarithm. */
function evalCap(base: number): number {
  return base === 10 ? 4 : base === 3 ? 6 : 10;
}

/** log_B(B^c) + m log_B(B^p), or log_B(B^c) + p log_B(B^m). */
function lineEvalExpr(model: ModelKind, { base, c, m, p }: LineEvalParams): Expr {
  const constant = log(num(base), num(Math.pow(base, c)));
  const term =
    model === 'power'
      ? bin('*', num(m), log(num(base), num(Math.pow(base, p))))
      : bin('*', num(p), log(num(base), num(Math.pow(base, m))));
  return bin('+', constant, term);
}

/** The multiplier and the logarithm's value in the second term. */
function evalTerm(model: ModelKind, { m, p }: LineEvalParams): { times: number; inner: number } {
  return model === 'power' ? { times: m, inner: p } : { times: p, inner: m };
}

/**
 * Use the straight-line form to find log y at a given x.
 *
 * This is what linearising is for: the line is easy to work with where the
 * curve is not. The logs are of powers of the base so every value is whole, as
 * a reduce slide needs; the slip worth catching is multiplying before the
 * logarithm is taken, which the bank on the product offers.
 */
function lineEvaluate(model: ModelKind): Generator<LineEvalParams> {
  return {
    id: `log-lin-${model}-evaluate`,
    choices: (params) => {
      const { c } = params;
      const { times, inner } = evalTerm(model, params);
      return steeredOptions(
        wholeOptions(c + times * inner, (c + times) * inner, c + times + inner, times * inner, c * times * inner),
        mix(params.base, c, params.m, params.p),
      );
    },
    sample: (rng, difficulty) => {
      const hard = difficulty > 1;
      const base = hard ? rng.pick([10, 2, 3]) : 10;
      const cap = evalCap(base);
      const c = rng.int(1, Math.min(cap, hard ? 5 : 3));
      if (model === 'power') {
        return { base, c, m: rng.int(2, hard ? 7 : 5), p: rng.int(1, Math.min(cap, hard ? 6 : 4)) };
      }
      return { base, c, m: rng.int(1, Math.min(cap, hard ? 4 : 3)), p: rng.int(2, hard ? 8 : 6) };
    },
    render: (params): Slide => {
      const { base, c, m, p } = params;
      const { times, inner } = evalTerm(model, params);
      const total = c + times * inner;
      const k = Math.pow(base, c);
      const innerArg = Math.pow(base, inner);
      const L = `\\log_{${base}}`;
      const text =
        model === 'power'
          ? `Taking logs to base ${base} of $y = ${k}x^{${m}}$ gives $${L} y = ${L} ${k} + ${m}${L} x$. Put in $x = ${innerArg}$ to find $${L} y$.`
          : `Taking logs to base ${base} of $y = ${k} \\times ${innerArg}^{x}$ gives $${L} y = ${L} ${k} + x${L} ${innerArg}$. Put in $x = ${p}$ to find $${L} y$.`;
      return {
        kind: 'reduce',
        prompt: [{ kind: 'prose', text }],
        expr: lineEvalExpr(model, params),
        banks: {
          r: wholeBank(total, (c + times) * inner, c + times + inner, c * times * inner),
          'r.l': wholeBank(c, c + 1, base * c, ...(k <= 100 ? [k] : [])),
          'r.r': wholeBank(times * inner, times + inner, times * innerArg, times * inner + times),
          'r.r.r': wholeBank(inner, inner + 1, base * inner, ...(innerArg <= 100 ? [innerArg] : [])),
        },
      };
    },
    solution: (params) => {
      const { base, c } = params;
      const { times, inner } = evalTerm(model, params);
      const L = `\\log_{${base}}`;
      const total = c + times * inner;
      return [
        { text: `Each logarithm is of a power of ${base}, so each is just that power.` },
        { tex: `${L} ${Math.pow(base, c)} = ${c}` },
        { tex: `${L} ${Math.pow(base, inner)} = ${inner}` },
        { tex: `${c} + ${times} \\times ${inner} = ${c} + ${times * inner} = ${total}` },
        { text: `So $${L} y = ${total}$, which means $y = ${base}^{${total}}$. On the straight line that is one point, read off with no powers of $x$ at all.` },
      ];
    },
  };
}

interface LineSliderParams {
  kind: LogKind;
  c: number;
  m: number;
  /** Where the line meets a dashed level, or how high it is above a dashed position. */
  ask: 'meet' | 'height';
  /** The horizontal coordinate asked about, or that gives the level. */
  at: number;
  /** Room right of it, so the answer is not at the end of the picture. */
  extra: number;
}

/**
 * Find a point on a straightened model's line: where it reaches a level, or
 * its height at a position. The line is the model, so either is a prediction
 * made with a ruler instead of a power.
 */
function lineSlider(model: ModelKind): Generator<LineSliderParams> {
  return {
    id: `log-lin-${model}-slider`,
    sample: (rng, difficulty) => {
      const hard = difficulty > 1;
      const kind: LogKind = rng.chance(hard ? 0.5 : 0.3) ? 'ln' : 'log';
      const steepest = model === 'exp' && kind === 'log' ? 3 : hard ? 5 : 3;
      return {
        kind,
        c: rng.int(1, hard ? 4 : 3),
        m: rng.int(1, steepest),
        ask: rng.pick(['meet', 'height'] as const),
        at: rng.int(1, hard ? 5 : 4),
        extra: rng.int(0, 2),
      };
    },
    render: ({ kind, c, m, ask, at, extra }): Slide => {
      const right = at + 1 + extra;
      const level = c + m * at;
      const window = lineWindow(c, m, right);
      const X = across(model, kind);
      const Y = lg(kind, 'y');
      const opening = `Taking ${logWords(kind)} of $${modelTex(model, kind, c, m)}$ gives the straight line $${lineTex(model, kind, c, m)}$.`;
      if (ask === 'meet') {
        return {
          kind: 'slider',
          prompt: [
            {
              kind: 'prose',
              text: `${opening} The dashed line is $${Y} = ${level}$. Slide to the value of $${X}$ where they meet.`,
            },
          ],
          min: 0,
          max: right,
          step: 1,
          answer: at,
          readout: `${X} = {v}`,
          figure: {
            svg: lineSvg({ model, kind, c, m, right, horizontals: [level] }),
            ...markerWindow(window.xMin, window.xMax),
          },
        };
      }
      return {
        kind: 'slider',
        prompt: [
          {
            kind: 'prose',
            text: `${opening} The dashed line is $${X} = ${at}$. Slide to the height of the line there: the value of $${Y}$.`,
          },
        ],
        min: 0,
        max: Math.floor(window.yMax),
        step: 1,
        answer: level,
        readout: `${Y} = {v}`,
        figure: {
          svg: lineSvg({ model, kind, c, m, right, verticals: [at] }),
          ...markerWindow(window.yMin, window.yMax, 'y', LINE_HEIGHT),
          axis: 'y',
        },
      };
    },
    solution: ({ kind, c, m, ask, at }) => {
      const level = c + m * at;
      const X = across(model, kind);
      const Y = lg(kind, 'y');
      const xValue = model === 'power' ? `x = ${powerOfTex(kind, at)}` : `x = ${at}`;
      if (ask === 'meet') {
        return [
          { text: `The line reaches $${Y} = ${level}$ where` },
          { tex: `${c} + ${m === 1 ? '' : m}${X} = ${level}` },
          { tex: `${X} = \\frac{${level} - ${c}}{${m}} = ${at}` },
          { text: `So the model gives $y = ${powerOfTex(kind, level)}$ at $${xValue}$.` },
        ];
      }
      return [
        { text: `Put $${X} = ${at}$ into the line.` },
        { tex: `${Y} = ${c} + ${m} \\times ${at} = ${level}` },
        { text: `So at $${xValue}$ the model gives $y = ${powerOfTex(kind, level)}$.` },
      ];
    },
  };
}

interface PowerTilesParams {
  kind: LogKind;
  /** split: y = kx^n with k left inside a log. whole: k = 10^c, so its log is c. */
  form: 'split' | 'whole';
  k: number;
  c: number;
  n: number;
}

/** Constants that are not powers of 10, so their logarithm stays a logarithm. */
const PLAIN = [2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20, 25, 30, 40, 50];
const PLAIN_HARD = [...PLAIN, 11, 13, 16, 18, 24, 35, 60, 75, 80];

/**
 * Take logs of y = kx^n and split it with the laws: the product law peels off
 * k, the power law brings n down in front of log x. Swapping the two is the
 * slip, and both numbers are in the bank to make it.
 */
const linPowerTiles: Generator<PowerTilesParams> = {
  id: 'log-lin-power-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      kind: rng.chance(hard ? 0.5 : 0.3) ? 'ln' : 'log',
      form: rng.pick(['split', 'whole'] as const),
      k: rng.pick(hard ? PLAIN_HARD : PLAIN),
      c: rng.int(1, hard ? 4 : 3),
      n: rng.int(2, hard ? 7 : 5),
    };
  },
  render: ({ kind, form, k, c, n }): Slide => {
    const Y = lg(kind, 'y');
    const X = lg(kind, 'x');
    if (form === 'split') {
      const answer = [`${k}`, `${n}`];
      return {
        kind: 'tiles',
        prompt: [
          {
            kind: 'prose',
            text: `Take ${logWords(kind)} of both sides of $y = ${k}x^{${n}}$, and split the right-hand side with the laws of logs.`,
          },
        ],
        template: `${Y} = ${lg(kind, '{0}')} {} + {} {1}${X}`,
        bank: bankOf(answer, [`${k * n}`, `${n + 1}`, `${k + n}`]),
        answer,
      };
    }
    const answer = [`${c}`, `${n}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Take ${logWords(kind)} of both sides of $${modelTex('power', kind, c, n)}$. The constant is a power of ${kind === 'log' ? '10' : '$e$'}, so its logarithm is a whole number.`,
        },
      ],
      template: `${Y} = {0} {} + {} {1}${X}`,
      bank: bankOf(answer, [unlogTex(kind, c), `${c + 1}`, `${n + 1}`, `${c * n}`]),
      answer,
    };
  },
  solution: ({ kind, form, k, c, n }) => {
    const Y = lg(kind, 'y');
    const X = lg(kind, 'x');
    const constant = form === 'split' ? `${k}` : unlogTex(kind, c);
    const logged = form === 'split' ? lg(kind, `${k}`) : `${c}`;
    return [
      { text: 'The product law splits the logarithm of a product into a sum of logarithms.' },
      { tex: `${Y} = ${lg(kind, `\\left(${constant}x^{${n}}\\right)`)}` },
      { tex: `${Y} = ${lg(kind, constant)} + ${lg(kind, `x^{${n}}`)}` },
      { text: `The power law brings the $${n}$ down in front.` },
      { tex: `${Y} = ${logged} + ${n}${X}` },
      {
        text:
          form === 'split'
            ? `A straight line in $${X}$: gradient $${n}$, intercept $${lg(kind, `${k}`)}$.`
            : `$${lg(kind, constant)} = ${c}$, so the line has gradient $${n}$ and intercept $${c}$.`,
      },
    ];
  },
};

interface ExpTilesParams {
  kind: LogKind;
  /**
   * split: y = a × b^x, or y = a e^(gx) for natural logs, with a left inside a
   * log. whole: every constant a power of 10 or of e, so its log is whole.
   */
  form: 'split' | 'whole';
  a: number;
  b: number;
  c: number;
  g: number;
}

/**
 * Take logs of an exponential model. Here x is the one that comes down in
 * front, since it is the power, and b stays inside a logarithm: the gradient
 * is log b, not b. With e as the base that logarithm is 1 and the gradient is
 * the number in the power.
 */
const linExpTiles: Generator<ExpTilesParams> = {
  id: 'log-lin-exp-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const a = rng.pick(hard ? PLAIN_HARD : PLAIN);
    const b = rng.int(2, 9);
    const kind: LogKind = rng.chance(hard ? 0.5 : 0.4) ? 'ln' : 'log';
    const form = rng.pick(['split', 'whole'] as const);
    return {
      kind,
      form,
      a,
      // y = 9 × 9^x would put the same number in both blanks, and swapping
      // them is the slip this is here to catch.
      b: b === a ? b + 1 : b,
      c: rng.int(1, hard ? 4 : 3),
      // A base of 10^g is printed in full, so it stops at 1000.
      g: rng.int(2, kind === 'log' && form === 'whole' ? 3 : hard ? 6 : 4),
    };
  },
  render: ({ kind, form, a, b, c, g }): Slide => {
    const Y = lg(kind, 'y');
    const say = (model: string, extra = '') => [
      {
        kind: 'prose' as const,
        text: `Take ${logWords(kind)} of both sides of $${model}$, and split the right-hand side with the laws of logs.${extra}`,
      },
    ];
    if (form === 'split' && kind === 'log') {
      const answer = [`${a}`, `${b}`];
      return {
        kind: 'tiles',
        prompt: say(`y = ${a} \\times ${b}^{x}`),
        template: `${Y} = \\log {0} {} + {} x\\log {1}`,
        bank: bankOf(answer, [`${a * b}`, `${a + b}`, `${b + 1}`]),
        answer,
      };
    }
    if (form === 'split') {
      const answer = [`${a}`, `${g}`];
      return {
        kind: 'tiles',
        prompt: say(`y = ${a}e^{${g}x}`, ' Remember that $\\ln e = 1$.'),
        template: `${Y} = \\ln {0} {} + {} {1}x`,
        bank: bankOf(answer, [`${a * g}`, `${g + 1}`, unlogTex('ln', g)]),
        answer,
      };
    }
    const answer = [`${c}`, `${g}`];
    if (kind === 'log') {
      return {
        kind: 'tiles',
        prompt: say(modelTex('exp', 'log', c, g)),
        template: `${Y} = {0} {} + {} {1}x`,
        bank: bankOf(answer, [unlogTex('log', c), unlogTex('log', g), `${c + g}`, `${c + 1}`]),
        answer,
      };
    }
    return {
      kind: 'tiles',
      prompt: say(`y = e^{${c} + ${g}x}`),
      template: `${Y} = {0} {} + {} {1}x`,
      bank: bankOf(answer, [unlogTex('ln', c), `${c + g}`, `${g + 1}`, `${c * g}`]),
      answer,
    };
  },
  solution: ({ kind, form, a, b, c, g }) => {
    if (form === 'split' && kind === 'log') {
      return [
        { text: 'The product law splits off the constant, and the power law brings $x$ down in front.' },
        { tex: `\\log y = \\log ${a} + \\log\\left(${b}^{x}\\right)` },
        { tex: `\\log y = \\log ${a} + x\\log ${b}` },
        { text: `A straight line in $x$: gradient $\\log ${b}$, intercept $\\log ${a}$. The gradient is the log of $${b}$, not $${b}$ itself.` },
      ];
    }
    if (form === 'split') {
      return [
        { text: 'The product law splits off the constant, and the power law brings the power down in front.' },
        { tex: `\\ln y = \\ln ${a} + \\ln\\left(e^{${g}x}\\right)` },
        { tex: `\\ln y = \\ln ${a} + ${g}x\\ln e` },
        { text: `Since $\\ln e = 1$, the gradient is $${g}$ and the intercept is $\\ln ${a}$.` },
      ];
    }
    if (kind === 'log') {
      return [
        { text: `Both constants are powers of 10: $${unlogTex('log', c)} = 10^{${c}}$ and $${unlogTex('log', g)} = 10^{${g}}$.` },
        { tex: `\\log y = \\log ${unlogTex('log', c)} + x\\log ${unlogTex('log', g)}` },
        { tex: `\\log y = ${c} + ${g}x` },
        { text: `A straight line in $x$ with gradient $${g}$ and intercept $${c}$.` },
      ];
    }
    return [
      { text: 'The natural log undoes $e$, so it hands back the whole power.' },
      { tex: `\\ln y = \\ln\\left(e^{${c} + ${g}x}\\right) = ${c} + ${g}x` },
      { text: `A straight line in $x$ with gradient $${g}$ and intercept $${c}$. As a model, $y = e^{${c}}e^{${g}x}$.` },
    ];
  },
};

/**
 * Two points on the line to the model, as a tree: the rise and the run, the
 * gradient, the gradient times the first x, and what that leaves of the first
 * height, which is the intercept. Leaves are slots too, so the rise and the run
 * are worked out rather than read.
 */
const linGradientTree: Generator<LineParams> = {
  id: 'log-lin-gradient-tree',
  sample: (rng, difficulty) => sampleLine(rng, difficulty, rng.pick(['power', 'exp'] as const)),
  render: (params): Slide => {
    const { model, kind, c, m, x1, x2 } = params;
    const [y1, y2] = heights(params);
    const answer = [`${y2 - y1}`, `${x2 - x1}`, `${m}`, `${m * x1}`, `${c}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Two points on the graph of $${lg(kind, 'y')}$ against $${across(model, kind)}$ are $(${x1}, ${y1})$ and $(${x2}, ${y2})$. Fill in the rise and the run, then the gradient, then the gradient times $${x1}$, then the intercept.`,
        },
      ],
      expression: `${lg(kind, constantOf(model))} = ${y1} - \\frac{${y2} - ${y1}}{${x2} - ${x1}} \\times ${x1}`,
      nodes: [
        { id: 'rise', from: [] },
        { id: 'run', from: [] },
        { id: 'gradient', from: ['rise', 'run'] },
        { id: 'times', from: ['gradient'] },
        { id: 'intercept', from: ['times'] },
      ],
      bank: treeBank(answer, [
        // Adding the heights rather than subtracting, reading the gradient as
        // the second height over the second x, and adding the product back on.
        `${y2 + y1}`,
        `${x2 + x1}`,
        `${y1 + m * x1}`,
        `${m + x1}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { model, kind, c } = params;
    const [gradient, intercept] = gradientSteps(params);
    const name = constantOf(model);
    return [
      gradient,
      { text: 'The intercept is the height where the horizontal coordinate is 0: go back from the first point by the gradient times its horizontal coordinate.' },
      intercept,
      { text: `So $${lg(kind, name)} = ${c}$, and $${name} = ${undoTex(kind, c)}$.` },
    ];
  },
};

/** A steps bank: distinct, in a fixed order so one question renders one way. */
function stepsBank(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/**
 * The model's constant from the gradient and one point, one step at a time:
 * the product, the subtraction that leaves the intercept, and undoing the
 * logarithm. The last step is the one a learner forgets, and its bank offers
 * the intercept itself as though it were the constant.
 */
const linConstantSteps: Generator<LineParams> = {
  id: 'log-lin-constant-steps',
  sample: (rng, difficulty) => {
    const params = sampleLine(rng, difficulty, rng.pick(['power', 'exp'] as const));
    // A gradient of 1 leaves the multiplication with nothing to do.
    return params.m === 1 ? { ...params, m: 2 } : params;
  },
  render: (params): Slide => {
    const { model, kind, c, m, x1 } = params;
    const [y1] = heights(params);
    const name = constantOf(model);
    const is = (n: number | string) => `${name} = ${n}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `On the graph of $${lg(kind, 'y')}$ against $${across(model, kind)}$ for $${formTex(model)}$, the line has gradient $${m}$ and passes through $(${x1}, ${y1})$. Find $${name}$ one step at a time: tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [lg(kind, name), '=', `${y1}`, '-', `${m}`, '\\times', `${x1}`],
      reductions: [
        {
          span: [4, 7],
          operator: 5,
          value: `${m * x1}`,
          bank: stepsBank([`${m * x1}`, `${m + x1}`, `${m * x1 + 1}`, `${m * x1 - 1}`, `${Math.max(m, x1) * 2 + 1}`]),
        },
        {
          span: [2, 5],
          operator: 3,
          value: `${c}`,
          bank: stepsBank([`${c}`, `${y1 + m * x1}`, `${c + 1}`, `${y1}`]),
        },
        {
          span: [0, 3],
          operator: 0,
          value: is(unlogTex(kind, c)),
          bank: stepsBank([
            is(unlogTex(kind, c)),
            is(c),
            is(unlogTex(kind, c + 1)),
            kind === 'log' ? is(10 * c) : is(`${c + 1}e`),
          ]),
        },
      ],
    };
  },
  solution: (params) => {
    const { model, kind, c, m, x1 } = params;
    const [y1] = heights(params);
    const name = constantOf(model);
    return [
      { text: `The intercept is $${lg(kind, name)}$. Go back from the point by the gradient times its horizontal coordinate, $${m} \\times ${x1} = ${m * x1}$.` },
      { tex: `${lg(kind, name)} = ${y1} - ${m * x1} = ${c}` },
      { text: `That is still a logarithm. Undo it to get $${name}$ itself.` },
      { tex: `${name} = ${undoTex(kind, c)}` },
    ];
  },
};

/**
 * Which model does this line come from? The axes say power or exponential,
 * the two points say the numbers. The wrong answers are the other model with
 * the same numbers, the gradient and intercept swapped, and the logarithms
 * left un-undone.
 */
const linModelMatch: Generator<LineParams> = {
  id: 'log-lin-model-match',
  sample: (rng, difficulty) => sampleLine(rng, difficulty, rng.pick(['power', 'exp'] as const)),
  render: (params): Slide => {
    const { model, kind, c, m, x1, x2 } = params;
    const [y1, y2] = heights(params);
    const other: ModelKind = model === 'power' ? 'exp' : 'power';
    const raw =
      model === 'power'
        ? `y = ${c === 1 ? '' : c}x^{${m}}`
        : kind === 'ln'
          ? `y = ${c === 1 ? '' : c}e^{${m === 1 ? '' : m}x}`
          : m > 1
            ? `y = ${c} \\times ${m}^{x}`
            : modelTex(model, kind, c + 2, m);
    const labels = [
      ...new Set([
        modelTex(model, kind, c, m),
        modelTex(other, kind, c, m),
        m !== c ? modelTex(model, kind, m, c) : modelTex(model, kind, c + 1, m),
        raw,
        modelTex(model, kind, c + 1, m),
      ]),
    ].slice(0, 4);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The graph of $${lg(kind, 'y')}$ against $${across(model, kind)}$ is a straight line through $(${x1}, ${y1})$ and $(${x2}, ${y2})$. Which model does it come from?`,
        },
        {
          kind: 'diagram',
          svg: lineSvg({ model, kind, c, m, right: x2 + 1, labelled: [{ x: x1, y: y1 }, { x: x2, y: y2 }] }),
        },
      ],
      options: turned(
        labels.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
        mix(c, m, x1, x2, model === 'power' ? 1 : 2, kind === 'log' ? 1 : 2),
      ),
      correctId: 'correct',
    };
  },
  solution: (params) => {
    const { model, kind, c, m } = params;
    const [gradient, intercept] = gradientSteps(params);
    const name = constantOf(model);
    return [
      {
        text:
          model === 'power'
            ? `Against $${lg(kind, 'x')}$ the line is a power model, $${generalLineTex(model, kind)}$.`
            : `Against $x$ itself the line is an exponential model, $${generalLineTex(model, kind)}$.`,
      },
      gradient,
      intercept,
      {
        text:
          model === 'power'
            ? `So $n = ${m}$ and $${lg(kind, name)} = ${c}$, giving $k = ${undoTex(kind, c)}$.`
            : `So $${lg(kind, 'b')} = ${m}$ and $${lg(kind, name)} = ${c}$: undo both.`,
      },
      { tex: modelTex(model, kind, c, m) },
    ];
  },
};

interface ModelTilesParams extends LineParams {
  /** For an exponential, which constant is asked for at the end. */
  which: 'a' | 'b';
}

/** Two rows of a table, as the learner reads it. */
function tableTex(model: ModelKind, kind: LogKind, rows: [number, number][]): string {
  const body = rows.map(([x, y]) => `${x} & ${y}`).join(' \\\\ ');
  return `\\begin{array}{c|c} ${across(model, kind)} & ${lg(kind, 'y')} \\\\ \\hline ${body} \\end{array}`;
}

/**
 * From a two-row table to the line and then the model: gradient, intercept,
 * and one constant undone. The bank carries the rise (a gradient not divided
 * by the run) and the intercept left as a logarithm.
 */
const linModelTiles: Generator<ModelTilesParams> = {
  id: 'log-lin-model-tiles',
  sample: (rng, difficulty) => ({
    ...sampleLine(rng, difficulty, rng.pick(['power', 'exp'] as const)),
    which: rng.pick(['a', 'b'] as const),
  }),
  render: (params): Slide => {
    const { model, kind, c, m, x1, x2, which } = params;
    const [y1, y2] = heights(params);
    const Y = lg(kind, 'y');
    const name = model === 'power' ? 'k' : which;
    const undone = model === 'exp' && which === 'b' ? m : c;
    const answer = [`${m}`, `${c}`, unlogTex(kind, undone)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The table gives two points on the straight line for a model $${formTex(model)}$. Fill in the line's equation, then $${name}$.`,
        },
        { kind: 'display', tex: tableTex(model, kind, [[x1, y1], [x2, y2]]) },
      ],
      template:
        model === 'power'
          ? `${Y} = {0}${lg(kind, 'x')} + {} {1} \\quad k = {2}`
          : `${Y} = {0}x + {} {1} \\quad ${name} = {2}`,
      bank: bankOf(answer, [
        `${y2 - y1}`,
        `${y1}`,
        `${c + 1}`,
        unlogTex(kind, undone + 1),
        unlogTex(kind, undone === c ? m : c),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { model, kind, c, m, which } = params;
    const [gradient, intercept] = gradientSteps(params);
    const name = model === 'power' ? 'k' : which;
    const undone = model === 'exp' && which === 'b' ? m : c;
    return [
      gradient,
      intercept,
      { tex: lineTex(model, kind, c, m) },
      {
        text:
          model === 'power'
            ? `Matching $${generalLineTex(model, kind)}$, the intercept is $${lg(kind, 'k')} = ${c}$.`
            : `Matching $${generalLineTex(model, kind)}$, $${lg(kind, name)} = ${undone}$.`,
      },
      { tex: `${name} = ${undoTex(kind, undone)}` },
    ];
  },
};

interface AxesFlowParams {
  form: 'power' | 'recip' | 'root' | 'exp' | 'exp-e' | 'sum-power' | 'sum-exp' | 'linear';
  a: number;
  n: number;
  d: number;
}

function axesSubject({ form, a, n, d }: AxesFlowParams): string {
  if (form === 'power') return `y = ${a}x^{${n}}`;
  if (form === 'recip') return `y = \\frac{${a}}{x^{${n}}}`;
  if (form === 'root') return `y = ${a}\\sqrt{x}`;
  if (form === 'exp') return `y = ${a} \\times ${n}^{x}`;
  if (form === 'exp-e') return `y = ${a}e^{${n}x}`;
  if (form === 'sum-power') return `y = ${a}x^{${n}} + ${d}`;
  if (form === 'sum-exp') return `y = ${a} \\times ${n}^{x} + ${d}`;
  return `y = ${a}x + ${d}`;
}

/**
 * Which graph straightens this model, if any? Two questions settle it: is the
 * right-hand side a single product (logs cannot split a sum), and is x the
 * power or the thing raised to one. A reciprocal and a square root are power
 * models in disguise, which is the harder end.
 */
const linAxesFlow: Generator<AxesFlowParams> = {
  id: 'log-lin-axes-flow',
  sample: (rng, difficulty) => {
    const forms =
      difficulty > 1
        ? (['power', 'recip', 'root', 'exp', 'exp-e', 'sum-power', 'sum-exp', 'linear'] as const)
        : (['power', 'power', 'exp', 'exp-e', 'sum-power', 'linear'] as const);
    return { form: rng.pick(forms), a: rng.int(2, 9), n: rng.int(2, difficulty > 1 ? 7 : 5), d: rng.int(1, 9) };
  },
  render: (params): Slide => {
    const { form } = params;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Which graph, if any, turns this model into a straight line? Work down the questions.',
        },
      ],
      subject: axesSubject(params),
      steps: [
        {
          id: 'single',
          ask: 'Is the right-hand side one product: a constant times a single power, with nothing added on?',
          branches: [
            { label: 'Yes', to: 'index' },
            {
              label: 'No',
              outcome: 'Neither graph straightens it. The log of a sum does not split into a sum of logs.',
            },
          ],
        },
        {
          id: 'index',
          ask: 'Is $x$ the index, up in the power?',
          branches: [
            {
              label: 'Yes',
              outcome: 'An exponential model. Plot $\\log y$ against $x$: gradient $\\log b$, intercept $\\log a$.',
            },
            {
              label: 'No',
              outcome: 'A power model. Plot $\\log y$ against $\\log x$: gradient $n$, intercept $\\log k$.',
            },
          ],
        },
      ],
      answer:
        form === 'power' || form === 'recip' || form === 'root'
          ? ['Yes', 'No']
          : form === 'exp' || form === 'exp-e'
            ? ['Yes', 'Yes']
            : ['No'],
    };
  },
  solution: (params) => {
    const { form, a, n } = params;
    const subject = axesSubject(params);
    if (form === 'sum-power' || form === 'sum-exp' || form === 'linear') {
      return [
        { text: `$${subject}$ has a term added on, so taking logs gives the log of a sum.` },
        { tex: `\\log(p + q) \\ne \\log p + \\log q` },
        { text: 'Nothing splits, so neither $\\log y$ against $x$ nor against $\\log x$ is straight.' },
      ];
    }
    if (form === 'exp' || form === 'exp-e') {
      const b = form === 'exp' ? `${n}` : 'e';
      return [
        { text: `$${subject}$ is a constant times a power with $x$ in the index: an exponential.` },
        {
          tex:
            form === 'exp'
              ? `\\log y = \\log ${a} + x\\log ${b}`
              : `\\ln y = \\ln ${a} + ${n}x`,
        },
        { text: 'A straight line in $x$, so plot the log of $y$ against $x$ itself.' },
      ];
    }
    const power = form === 'recip' ? -n : form === 'root' ? '\\frac{1}{2}' : n;
    return [
      {
        text:
          form === 'recip'
            ? `Dividing by $x^{${n}}$ is multiplying by $x^{-${n}}$, so this is a constant times a power of $x$.`
            : form === 'root'
              ? 'A square root is the power $\\frac{1}{2}$, so this is a constant times a power of $x$.'
              : `$${subject}$ is a constant times a fixed power of $x$: a power model.`,
      },
      { tex: `\\log y = \\log ${a} ${typeof power === 'number' ? plusMinus(power) : `+ ${power}`}\\log x` },
      { text: `A straight line in $\\log x$, with gradient $${power}$.` },
    ];
  },
};

interface StraightParams {
  mode: 'axes' | 'model' | 'meaning';
  model: ModelKind;
  a: number;
  n: number;
  d: number;
  /** For `meaning`: which feature of the line is asked about. */
  feature: 'gradient' | 'intercept';
}

/** A power or an exponential model with plain numbers, for choosing between. */
function plainModelTex(model: ModelKind, a: number, n: number): string {
  return model === 'power' ? `y = ${a}x^{${n}}` : `y = ${a} \\times ${n}^{x}`;
}

/**
 * Choosing the transformation, three ways round: the axes that straighten a
 * given model, the model a given pair of axes straightens, and what the
 * gradient or intercept of the straight line means.
 */
const linStraightChoice: Generator<StraightParams> = {
  id: 'log-lin-straight-choice',
  sample: (rng, difficulty) => {
    const a = rng.int(2, difficulty > 1 ? 30 : 12);
    let n = rng.int(2, difficulty > 1 ? 9 : 6);
    if (n === a) n += 1;
    return {
      mode: rng.pick(['axes', 'model', 'meaning'] as const),
      model: rng.pick(['power', 'exp'] as const),
      a,
      n,
      d: rng.int(1, 9),
      feature: rng.pick(['gradient', 'intercept'] as const),
    };
  },
  render: ({ mode, model, a, n, d, feature }): Slide => {
    let text: string;
    let display: string | undefined;
    let labels: string[];
    if (mode === 'axes') {
      text = 'Which graph of this model is a straight line?';
      display = plainModelTex(model, a, n);
      const logLog = '\\log y \\text{ against } \\log x';
      const logLin = '\\log y \\text{ against } x';
      labels = [
        model === 'power' ? logLog : logLin,
        model === 'power' ? logLin : logLog,
        'y \\text{ against } \\log x',
        'y \\text{ against } x',
      ];
    } else if (mode === 'model') {
      text =
        model === 'power'
          ? 'Plotting $\\log y$ against $\\log x$ gives a straight line for which of these?'
          : 'Plotting $\\log y$ against $x$ gives a straight line for which of these?';
      labels = [
        plainModelTex(model, a, n),
        plainModelTex(model === 'power' ? 'exp' : 'power', a, n),
        model === 'power' ? `y = ${a}x^{${n}} + ${d}` : `y = ${a} \\times ${n}^{x} + ${d}`,
        `y = ${a}x + ${d}`,
      ];
    } else {
      display = plainModelTex(model, a, n);
      const against = model === 'power' ? '$\\log y$ against $\\log x$' : '$\\log y$ against $x$';
      text = `This model plots as a straight line on a graph of ${against}. What is its ${feature}?`;
      const right =
        model === 'power'
          ? feature === 'gradient'
            ? `${n}`
            : `\\log ${a}`
          : feature === 'gradient'
            ? `\\log ${n}`
            : `\\log ${a}`;
      labels = [...new Set([right, `\\log ${a}`, `\\log ${n}`, `${n}`, `${a}`])].slice(0, 4);
    }
    return {
      kind: 'choice',
      prompt: [{ kind: 'prose', text }, ...(display ? [{ kind: 'display' as const, tex: display }] : [])],
      options: turned(
        labels.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
        mix(a, n, d, mode.length, model.length, feature.length),
      ),
      correctId: 'correct',
    };
  },
  solution: ({ mode, model, a, n, feature }) => {
    const line = model === 'power' ? `\\log y = \\log ${a} ${plusMinus(n)}\\log x` : `\\log y = \\log ${a} + x\\log ${n}`;
    const opening = {
      text:
        model === 'power'
          ? `$${plainModelTex(model, a, n)}$ is a power model: take logs and the power comes down in front of $\\log x$.`
          : `$${plainModelTex(model, a, n)}$ is an exponential model: take logs and $x$ comes down in front of $\\log ${n}$.`,
    };
    if (mode === 'model') {
      return [
        opening,
        { tex: line },
        { text: 'The others do not straighten: a sum does not split under a log, and the other model is straight on the other graph.' },
      ];
    }
    if (mode === 'axes') {
      return [
        opening,
        { tex: line },
        {
          text:
            model === 'power'
              ? 'That is a straight line in $\\log x$, so plot $\\log y$ against $\\log x$.'
              : 'That is a straight line in $x$, so plot $\\log y$ against $x$.',
        },
      ];
    }
    return [
      opening,
      { tex: line },
      {
        text:
          feature === 'intercept'
            ? `The intercept is the constant term, $\\log ${a}$: the constant's logarithm, not the constant.`
            : model === 'power'
              ? `The gradient is what multiplies $\\log x$: the power, $${n}$.`
              : `The gradient is what multiplies $x$: $\\log ${n}$, the logarithm of the base.`,
      },
    ];
  },
};

interface PredictParams {
  model: ModelKind;
  kind: LogKind;
  c: number;
  m: number;
  /** Predict y at a given x, or the x that gives a given y. */
  ask: 'y' | 'x';
  /** The horizontal coordinate: log x for a power model, x for an exponential. */
  p: number;
}

/** x as the prompt gives it: 100, e^2, or a plain 3 for an exponential model. */
function predictXTex({ model, kind, p }: PredictParams): string {
  return model === 'power' ? unlogTex(kind, p) : `${p}`;
}

/** The options for a prediction: the answer, log y left as it is, and near misses. */
function predictOptions(params: PredictParams): ChoiceOption[] {
  const { model, kind, c, m, ask, p } = params;
  const level = c + m * p;
  const as = (v: number): ChoiceOption => ({ tex: powerOfTex(kind, v), answer: powerOfAnswer(kind, v) });
  const undone = (v: number): ChoiceOption => ({ tex: unlogTex(kind, v), answer: unlogAnswer(kind, v) });
  if (ask === 'y') {
    return fourOptions(as(level), numberOption(level), as(level + 1), as(c + m + p), as(level - 1));
  }
  const back = (level + c) / m;
  const extras = [back, level / m].filter((v) => Number.isInteger(v) && v !== p && v >= 0);
  if (model === 'power') {
    return fourOptions(undone(p), numberOption(p), ...extras.map(undone), undone(p + 1), undone(p + 2));
  }
  return fourOptions(numberOption(p), undone(p), ...extras.map(numberOption), numberOption(p + 1), numberOption(p + 2));
}

/**
 * Use a line of best fit to predict. Along the line everything is a logarithm,
 * so a prediction is a height on it undone at the end; forgetting that last
 * step answers with log y instead of y, which is the first distractor.
 */
const linPredict: Generator<PredictParams> = {
  id: 'log-lin-predict',
  choices: (params) => steeredOptions(predictOptions(params), mix(params.c, params.m, params.p, params.ask === 'y' ? 1 : 2)),
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const model = rng.pick(['power', 'exp'] as const);
    const kind: LogKind = rng.chance(hard ? 0.5 : 0.3) ? 'ln' : 'log';
    // log y stays at 7 or below: the checker grades whole numbers reliably only
    // up to about 10^8.
    for (;;) {
      const c = rng.int(1, 3);
      const m = rng.int(1, hard ? 4 : 3);
      const p = rng.int(1, hard ? 4 : 3);
      if (c + m * p <= 7) return { model, kind, c, m, ask: rng.pick(['y', 'x'] as const), p };
    }
  },
  render: (params): Slide => {
    const { model, kind, c, m, ask, p } = params;
    const level = c + m * p;
    const opening = `A line of best fit on a graph of $${lg(kind, 'y')}$ against $${across(model, kind)}$ is $${lineTex(model, kind, c, m)}$.`;
    const power = kind === 'log' ? 'a power of 10' : 'a power of $e$';
    if (ask === 'y') {
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: `${opening} Predict $y$ when $x = ${predictXTex(params)}$. Give it as ${power}.` }],
        lead: 'y =',
        keypad: kind === 'ln' ? E_POWER_KEYS : POWER_KEYS,
        answer: powerOfAnswer(kind, level),
        domain: 'real',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${opening} Predict the value of $x$ that gives $y = ${powerOfTex(kind, level)}$.` }],
      lead: 'x =',
      keypad: model === 'exp' ? [] : kind === 'ln' ? E_POWER_KEYS : POWER_KEYS,
      answer: model === 'power' ? unlogAnswer(kind, p) : `${p}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { model, kind, c, m, ask, p } = params;
    const level = c + m * p;
    const X = across(model, kind);
    const Y = lg(kind, 'y');
    if (ask === 'y') {
      return [
        {
          text:
            model === 'power'
              ? `Work along the line in logs: $${X} = ${lg(kind, predictXTex(params))} = ${p}$.`
              : `Put $x = ${p}$ into the line.`,
        },
        { tex: `${Y} = ${c} + ${m} \\times ${p} = ${level}` },
        { text: `That is $${Y}$, not $y$. Undo the log: $y = ${powerOfTex(kind, level)}$.` },
      ];
    }
    return [
      { text: `$y = ${powerOfTex(kind, level)}$ means $${Y} = ${level}$. Solve along the line.` },
      { tex: `${c} + ${m === 1 ? '' : m}${X} = ${level}` },
      { tex: `${X} = ${p}` },
      {
        text:
          model === 'power'
            ? `That is $${X}$. Undo the log: $x = ${undoTex(kind, p)}$.`
            : `The horizontal axis is $x$ itself, so $x = ${p}$ with nothing to undo.`,
      },
    ];
  },
};

const linPowerRead = lineRead('power');
const linExpRead = lineRead('exp');
const linPowerEvaluate = lineEvaluate('power');
const linExpEvaluate = lineEvaluate('exp');
const linPowerSlider = lineSlider('power');
const linExpSlider = lineSlider('exp');

/* ---------- Level 7: compound log equations ---------- */

/*
 * Equations that need several of the earlier ideas at once: the laws to
 * collapse two logarithms into one, index form or matching logarithms to drop
 * them, a quadratic, and the domain to throw out a root that the quadratic
 * produces but the logarithms cannot take.
 *
 * Every equation is built outward from its answers. The root comes first, then
 * the shifts and the base, and the constants are whatever expanding gives, so
 * every answer is whole and every impostor is an integer the learner can test.
 * `\log` with no base written is base 10, as in level 6.
 */

/** x shifted by p, as written: x + 3, x - 1, or x alone. */
function shifted(p: number): string {
  return p === 0 ? 'x' : p > 0 ? `x + ${p}` : `x - ${-p}`;
}

/** ax + c, as written. */
function linearTex(a: number, c: number): string {
  const head = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
  return c === 0 ? head : c > 0 ? `${head} + ${c}` : `${head} - ${-c}`;
}

/**
 * log_b of something. No base is written for 10. Brackets are plain, so the
 * logarithm is valid TeX on its own as one fragment of a steps line; a fraction
 * gets sized brackets, which is safe because both halves are in this fragment.
 */
function logb(base: number, arg: string): string {
  const head = base === 10 ? '\\log' : `\\log_{${base}}`;
  if (/^([a-z]|\d+)$/.test(arg)) return `${head} ${arg}`;
  return arg.includes('\\frac') ? `${head}\\left(${arg}\\right)` : `${head}(${arg})`;
}

/** A term added or taken away: " + 5x", " - x", " + 3", or nothing for zero. */
function signed(value: number, variable = ''): string {
  if (value === 0) return '';
  const size = Math.abs(value) === 1 && variable ? variable : `${Math.abs(value)}${variable}`;
  return value > 0 ? ` + ${size}` : ` - ${size}`;
}

/** a2 v^2 + a1 v + a0 = 0, with the square written as `square`. */
function quadraticTex(a1: number, a0: number, square = 'x^2', variable = 'x'): string {
  return `${square}${signed(a1, variable)}${signed(a0)} = 0`;
}

/** (x - r), or the variable alone when r is 0. */
function factorTex(root: number, variable = 'x'): string {
  return root === 0 ? variable : root > 0 ? `(${variable} - ${root})` : `(${variable} + ${-root})`;
}

/** The factorised quadratic with these roots, a lone variable first. */
function factorisedTex(r1: number, r2: number, variable = 'x'): string {
  const [first, second] = r2 === 0 ? [r2, r1] : [r1, r2];
  return `${factorTex(first, variable)}${factorTex(second, variable)} = 0`;
}

/** (x + p)(x + q), or x(x + q) when a shift is 0. */
function productTex(p: number, q: number): string {
  if (p === 0) return `x(${shifted(q)})`;
  if (q === 0) return `x(${shifted(p)})`;
  return `(${shifted(p)})(${shifted(q)})`;
}

function quotientTex(p: number, q: number): string {
  return `\\frac{${shifted(p)}}{${shifted(q)}}`;
}

/** Both roots, as a line of working. */
function eitherTex(r1: number, r2: number, variable = 'x'): string {
  return `${variable} = ${r1} \\text{ or } ${variable} = ${r2}`;
}

/** The answer and three wrong values, each written `x = n`, first distinct ones first. */
function valueOptions(name: string, right: number, wrong: (number | ChoiceOption)[]): ChoiceOption[] {
  const labelled = (n: number): ChoiceOption => ({ tex: `${name} = ${n}`, answer: `${n}` });
  const fallbacks = [right + 1, right + 2, right + 3, right - 1].filter((n) => n !== right);
  return fourOptions(
    labelled(right),
    ...wrong.map((w) => (typeof w === 'number' ? labelled(w) : w)).filter((o) => o.answer !== `${right}`),
    ...fallbacks.map(labelled),
  );
}

/** Keeps a native choice's labels in a fixed order per question, answer first. */
function choiceOf(labels: string[], salt: number): { id: string; label: string; tex: boolean }[] {
  return turned(
    labels.map((label, i) => ({ id: i === 0 ? 'correct' : `wrong${i}`, label, tex: true })),
    salt,
  );
}

interface SumLogParams {
  base: number;
  /** The shifts inside the two logarithms, in the order written. */
  p: number;
  q: number;
  /** The root that keeps both arguments positive. */
  r: number;
  /** log: the right-hand side is log_b N. number: it is k, so N = b^k. */
  rhs: 'log' | 'number';
  k: number;
}

/** The product the logarithms collapse to at the kept root. */
function pairN({ p, q, r }: SumLogParams): number {
  return (r + p) * (r + q);
}

/**
 * The quadratic's other root. At it x + p = -(r + q) and x + q = -(r + p), so
 * both arguments are negative, always: the sum of two logarithms always has
 * exactly one root to throw away.
 */
function impostorOf({ p, q, r }: SumLogParams): number {
  return -(p + q) - r;
}

function pairLhs({ base, p, q }: SumLogParams): string {
  return `${logb(base, shifted(p))} + ${logb(base, shifted(q))}`;
}

/**
 * An equation with a logarithm on each side, set on two lines. At phone width
 * three logarithms with bases written run past the edge of the screen, so the
 * right-hand side drops to a second line, under its equals sign.
 */
function twoLines(lhs: string, rhs: string): string {
  return `\\begin{aligned} &${lhs} \\\\ &\\quad = ${rhs} \\end{aligned}`;
}

function pairTex(params: SumLogParams): string {
  if (params.rhs === 'log') return twoLines(pairLhs(params), logb(params.base, `${pairN(params)}`));
  return `${pairLhs(params)} = ${params.k}`;
}

/** Powers of a base small enough to factor into two shifts. */
const PAIR_POWERS = [
  { base: 2, k: 1 },
  { base: 2, k: 2 },
  { base: 2, k: 3 },
  { base: 2, k: 4 },
  { base: 3, k: 1 },
  { base: 3, k: 2 },
  { base: 10, k: 1 },
];
const PAIR_POWERS_HARD = [...PAIR_POWERS, { base: 2, k: 5 }, { base: 3, k: 3 }, { base: 4, k: 2 }, { base: 5, k: 1 }, { base: 6, k: 2 }];

/**
 * log_b(x + p) + log_b(x + q) = log_b N, or = k. The arguments at the root, A
 * and B, are chosen first; N is their product, or b^k is split into them.
 * `positive` asks for an impostor above zero, which is the one that looks safe.
 */
function samplePair(rng: Rng, difficulty: number, rhs: 'log' | 'number', positive = false): SumLogParams {
  const hard = difficulty > 1;
  for (;;) {
    let base: number;
    let k = 0;
    let A: number;
    let B: number;
    if (rhs === 'number') {
      const power = rng.pick(hard ? PAIR_POWERS_HARD : PAIR_POWERS);
      base = power.base;
      k = power.k;
      const N = Math.pow(base, k);
      const divisors = [...Array(N).keys()].map((i) => i + 1).filter((d) => N % d === 0 && d <= 16 && N / d <= 16);
      A = rng.pick(divisors);
      B = N / A;
    } else {
      base = rng.pick(hard ? [10, 2, 3, 5, 7] : [10, 10, 2, 3]);
      A = rng.int(1, hard ? 9 : 6);
      B = rng.int(1, hard ? 9 : 6);
    }
    const r = positive ? A + B + rng.int(1, 4) : rng.int(1, hard ? 9 : 6);
    const p = A - r;
    const q = B - r;
    // Equal arguments are one logarithm doubled, no x term leaves nothing to
    // tile, and a zero root is a constant term of 0.
    if (A === B || p + q === 0 || r === A + B || Math.abs(p) > 12 || Math.abs(q) > 12) continue;
    return { base, p, q, r, rhs, k };
  }
}

/** The working shared by every sum-of-logs question: collapse, drop, factorise, check. */
function pairSolution(params: SumLogParams): { text?: string; tex?: string }[] {
  const { base, p, q, r, rhs, k } = params;
  const N = pairN(params);
  const lost = impostorOf(params);
  const product = productTex(p, q);
  return [
    { text: 'The product law adds two logarithms by multiplying their arguments.' },
    { tex: rhs === 'log' ? twoLines(logb(base, product), logb(base, `${N}`)) : `${logb(base, product)} = ${k}` },
    {
      text:
        rhs === 'log'
          ? 'A logarithm on each side, same base: the arguments are equal.'
          : `Index form: the argument is ${base} to the power ${k}.`,
    },
    { tex: rhs === 'log' ? `${product} = ${N}` : `${product} = ${base}^{${k}} = ${N}` },
    { tex: quadraticTex(p + q, p * q - N) },
    { tex: factorisedTex(r, lost) },
    {
      text: `At $x = ${lost}$, $${shifted(p)} = ${lost + p}$, and a logarithm needs a positive argument. So $x = ${r}$ is the only solution.`,
    },
  ];
}

/**
 * Logs on both sides, collapsed one step at a time: the product law, then the
 * logarithms dropped, then the quadratic, then the root that survives. Each
 * bank carries the step's usual slip: adding the arguments, undoing the log on
 * the right as if it were a number, forgetting to move N across, keeping both.
 */
const cmpCollapse: Generator<SumLogParams> = {
  id: 'log-cmp-collapse-steps',
  sample: (rng, difficulty) => samplePair(rng, difficulty, 'log'),
  render: (params): Slide => {
    const { base, p, q, r } = params;
    const N = pairN(params);
    const lost = impostorOf(params);
    const product = productTex(p, q);
    const added = linearTex(2, p + q);
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve it one step at a time: tap the step to do next, then choose what it gives.',
        },
      ],
      start: [logb(base, shifted(p)), '+', logb(base, shifted(q)), '=', logb(base, `${N}`)],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: logb(base, product),
          bank: stepsBank([
            logb(base, product),
            logb(base, added),
            logb(base, quotientTex(p, q)),
            `${logb(base, shifted(p))} \\times ${logb(base, shifted(q))}`,
          ]),
        },
        {
          span: [0, 3],
          operator: 1,
          value: `${product} = ${N}`,
          bank: stepsBank([`${product} = ${N}`, `${product} = ${base}^{${N}}`, `${added} = ${N}`, `${product} = 0`]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: quadraticTex(p + q, p * q - N),
          bank: stepsBank([
            quadraticTex(p + q, p * q - N),
            quadraticTex(p + q, p * q),
            quadraticTex(p + q, p * q + N),
            quadraticTex(-(p + q), p * q - N),
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: `x = ${r}`,
          bank: stepsBank([`x = ${r}`, `x = ${lost}`, eitherTex(r, lost), `x = ${-lost}`]),
        },
      ],
    };
  },
  solution: pairSolution,
};

interface CollapseParams {
  base: number;
  /** What the left-hand side collapses to. */
  left: 'sum' | 'difference' | 'double';
  /** How the right-hand side's argument is written. */
  right: 'plain' | 'sum' | 'double' | 'difference';
  p: number;
  q: number;
  /** The single argument the right-hand side comes to. */
  N: number;
  /** The pieces the right-hand side is written in, when it is not plain. */
  a: number;
  c: number;
}

function combineLeftTex({ base, left, p, q }: CollapseParams): string {
  if (left === 'double') return `2${logb(base, shifted(p))}`;
  return `${logb(base, shifted(p))} ${left === 'sum' ? '+' : '-'} ${logb(base, shifted(q))}`;
}

function combineRightTex({ base, right, N, a, c }: CollapseParams): string {
  if (right === 'plain') return logb(base, `${N}`);
  if (right === 'double') return `2${logb(base, `${a}`)}`;
  return `${logb(base, `${a}`)} ${right === 'sum' ? '+' : '-'} ${logb(base, `${c}`)}`;
}

/** The left-hand side's single argument, as the learner builds it. */
function combinedArgument({ left, p, q }: CollapseParams): string {
  if (left === 'double') return `(${shifted(p)})^2`;
  return left === 'sum' ? productTex(p, q) : quotientTex(p, q);
}

/**
 * Collapse both sides into one logarithm each and drop them. The left is a
 * sum, a difference or a doubled logarithm; the right is a number's logarithm
 * written plainly or through the same laws. Adding arguments where they
 * multiply, subtracting where they divide and doubling where they square are
 * all in the bank.
 */
const cmpCombineTiles: Generator<CollapseParams> = {
  id: 'log-cmp-combine-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const left = rng.pick(hard ? (['sum', 'difference', 'double'] as const) : (['sum', 'difference'] as const));
    // Each built from its root like the rest of the level, so a learner who
    // carries on past the tiles reaches a whole answer.
    let base: number;
    let p: number;
    let q = 0;
    let N: number;
    if (left === 'sum') {
      const pair = samplePair(rng, difficulty, 'log');
      ({ base, p, q } = pair);
      N = pairN(pair);
    } else if (left === 'difference') {
      const quotient = sampleQuotient(rng, difficulty, 'log');
      ({ base, p, q } = quotient);
      N = quotient.K;
    } else {
      base = rng.pick(hard ? [10, 2, 3, 5] : [10, 10, 2, 3]);
      p = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
      N = Math.pow(rng.int(2, hard ? 9 : 6), 2);
    }
    // A difference on the right multiplies N up, so it is kept for small N.
    const rights: CollapseParams['right'][] = N <= 20 ? ['plain', 'difference'] : ['plain'];
    const factors = [2, 3, 4, 5, 6, 7].filter((f) => N % f === 0 && N / f > 1 && N / f !== f);
    if (factors.length > 0) rights.push('sum');
    if (Number.isInteger(Math.sqrt(N))) rights.push('double');
    const right = hard ? rng.pick(rights) : rng.pick(rights.filter((r) => r !== 'double'));
    let a = 0;
    let c = 0;
    if (right === 'sum') {
      a = rng.pick(factors);
      c = N / a;
    } else if (right === 'double') {
      a = Math.sqrt(N);
    } else if (right === 'difference') {
      c = rng.int(2, 5);
      a = N * c;
    }
    return { base, left, right, p, q, N, a, c };
  },
  render: (params): Slide => {
    const { left, right, p, q, N, a, c } = params;
    const answer = [combinedArgument(params), `${N}`];
    const wrongLeft =
      left === 'double'
        ? [`2(${shifted(p)})`, `x^2${signed(p * p)}`]
        : left === 'sum'
          ? [linearTex(2, p + q), quotientTex(p, q)]
          : [`${p - q}`, productTex(p, q)];
    const wrongRight =
      right === 'sum' ? [`${a + c}`] : right === 'double' ? [`${2 * a}`] : right === 'difference' ? [`${a - c}`] : [`${N + 1}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Collapse each side into a single logarithm, then drop the logarithms. What equation is left?',
        },
        { kind: 'display', tex: twoLines(combineLeftTex(params), combineRightTex(params)) },
      ],
      template: '{0} = {1}',
      bank: bankOf(answer, [...wrongLeft, ...wrongRight]),
      answer,
    };
  },
  solution: (params) => {
    const { base, left, right, p, N, a, c } = params;
    const law =
      left === 'sum'
        ? 'The product law: adding logarithms multiplies their arguments.'
        : left === 'difference'
          ? 'The quotient law: subtracting logarithms divides their arguments, the first on top.'
          : `The power law: the $2$ goes back inside as a square, $(${shifted(p)})^2$, not a doubling.`;
    const rightWork =
      right === 'plain'
        ? `The right is already one logarithm, of $${N}$.`
        : right === 'sum'
          ? `On the right, $${a} \\times ${c} = ${N}$.`
          : right === 'double'
            ? `On the right, $${a}^2 = ${N}$.`
            : `On the right, $${a} \\div ${c} = ${N}$.`;
    return [
      { text: law },
      { text: rightWork },
      { tex: twoLines(logb(base, combinedArgument(params)), logb(base, `${N}`)) },
      { text: 'Same base on both sides, so the arguments are equal.' },
      { tex: `${combinedArgument(params)} = ${N}` },
    ];
  },
};

/**
 * Solve a sum of logarithms equal to a logarithm, typed. The multiple-choice
 * form offers the impostor alone, both roots together, and the root with its
 * sign slipped.
 */
const cmpBoth: Generator<SumLogParams> = {
  id: 'log-cmp-both',
  choices: (params) => {
    const { r } = params;
    const lost = impostorOf(params);
    return steeredOptions(
      valueOptions('x', r, [lost, { tex: eitherTex(r, lost) }, -lost, -r]),
      mix(params.base, params.p, params.q, r),
    );
  },
  sample: (rng, difficulty) => samplePair(rng, difficulty, 'log'),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. Keep only a root at which every logarithm is defined.' },
      { kind: 'display', tex: pairTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.r}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: pairSolution,
};

interface DifferenceParams {
  base: number;
  p: number;
  q: number;
  /** The root. */
  x0: number;
  /** The argument's ratio, K = b^c when the right-hand side is a number c. */
  K: number;
  rhs: 'log' | 'number';
  c: number;
}

/** log_b(x + p) - log_b(x + q) = log_b K, or = c. Built from the root: p = K(x0 + q) - x0. */
function sampleQuotient(rng: Rng, difficulty: number, rhs: 'log' | 'number'): DifferenceParams {
  const hard = difficulty > 1;
  for (;;) {
    let base: number;
    let K: number;
    let c = 0;
    if (rhs === 'number') {
      const power = rng.pick(
        hard
          ? [
              { base: 2, c: 1 },
              { base: 2, c: 2 },
              { base: 2, c: 3 },
              { base: 3, c: 1 },
              { base: 3, c: 2 },
              { base: 5, c: 1 },
              { base: 10, c: 1 },
            ]
          : [
              { base: 2, c: 1 },
              { base: 2, c: 2 },
              { base: 3, c: 1 },
              { base: 5, c: 1 },
            ],
      );
      base = power.base;
      c = power.c;
      K = Math.pow(base, c);
    } else {
      base = rng.pick(hard ? [10, 2, 3, 5] : [10, 10, 2, 3]);
      K = rng.int(2, hard ? 6 : 4);
    }
    const x0 = rng.int(1, hard ? 9 : 6);
    const q = rng.int(1 - x0, hard ? 6 : 4);
    const p = K * (x0 + q) - x0;
    // q = 0 would put K(x) in the working.
    if (q === 0 || p === q || p > 30) continue;
    return { base, p, q, x0, K, rhs, c };
  }
}

function quotientEquationTex({ base, p, q, K, rhs, c }: DifferenceParams): string {
  const lhs = `${logb(base, shifted(p))} - ${logb(base, shifted(q))}`;
  return rhs === 'log' ? twoLines(lhs, logb(base, `${K}`)) : `${lhs} = ${c}`;
}

/** A number in a product, bracketed when negative. */
function factorOf(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/**
 * A difference of logarithms drops to a linear equation, x + p = K(x + q), and
 * the tree solves it: K times q from expanding, K - 1 from gathering the x
 * terms, what is left on the right, and x.
 */
const cmpQuotientTree: Generator<DifferenceParams> = {
  id: 'log-cmp-quotient-tree',
  sample: (rng, difficulty) => sampleQuotient(rng, difficulty, rng.chance(difficulty > 1 ? 0.5 : 0.2) ? 'number' : 'log'),
  render: (params): Slide => {
    const { p, q, x0, K } = params;
    const answer = [`${K * q}`, `${K - 1}`, `${p - K * q}`, `${x0}`];
    const plus = (p + K * q) / (K - 1);
    return {
      kind: 'tree',
      prompt: [
        { kind: 'display', tex: quotientEquationTex(params) },
        {
          kind: 'prose',
          text: `The quotient law and dropping the logarithms leave the equation below. Expand it, gather the $x$ terms on the right, and solve. Fill in $${K} \\times ${factorOf(q)}$, then the coefficient of $x$, then the number it equals, then $x$.`,
        },
      ],
      expression: `${shifted(p)} = ${K}(${shifted(q)})`,
      nodes: [
        { id: 'expand', from: [] },
        { id: 'coefficient', from: [] },
        { id: 'rest', from: ['expand'] },
        { id: 'x', from: ['rest', 'coefficient'] },
      ],
      bank: treeBank(answer, [
        `${-K * q}`,
        `${K + 1}`,
        `${p + K * q}`,
        ...(Number.isInteger(plus) ? [`${plus}`] : []),
        `${x0 + 1}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { base, p, q, x0, K, rhs, c } = params;
    return [
      { text: 'The quotient law: subtracting logarithms divides their arguments.' },
      {
        tex: rhs === 'log' ? twoLines(logb(base, quotientTex(p, q)), logb(base, `${K}`)) : `${logb(base, quotientTex(p, q))} = ${c}`,
      },
      { tex: rhs === 'log' ? `${quotientTex(p, q)} = ${K}` : `${quotientTex(p, q)} = ${base}^{${c}} = ${K}` },
      { tex: `${shifted(p)} = ${K}x${signed(K * q)}` },
      { tex: `${p - K * q} = ${termTex(K - 1, 1)}` },
      { tex: `x = ${x0}` },
      { text: `Check: at $x = ${x0}$ both arguments are positive, $${p + x0}$ and $${q + x0}$.` },
    ];
  },
};

interface IndexTilesParams {
  form: 'sum' | 'difference';
  pair: SumLogParams;
  quotient: DifferenceParams;
}

/**
 * Logarithms equal to a number: collapse the left, then write it in index
 * form. The bank holds the number itself, the base times it, and it to the
 * power of the base, which is the usual slip (3^2 for 2^3).
 */
const cmpIndexTiles: Generator<IndexTilesParams> = {
  id: 'log-cmp-index-tiles',
  sample: (rng, difficulty) => ({
    form: rng.chance(0.6) ? 'sum' : 'difference',
    pair: samplePair(rng, difficulty, 'number'),
    quotient: sampleQuotient(rng, difficulty, 'number'),
  }),
  render: ({ form, pair, quotient }): Slide => {
    const base = form === 'sum' ? pair.base : quotient.base;
    const k = form === 'sum' ? pair.k : quotient.c;
    const value = form === 'sum' ? pairN(pair) : quotient.K;
    const argument = form === 'sum' ? productTex(pair.p, pair.q) : quotientTex(quotient.p, quotient.q);
    const answer = [argument, `${value}`];
    const slips =
      form === 'sum'
        ? [linearTex(2, pair.p + pair.q), quotientTex(pair.p, pair.q)]
        : [`${quotient.p - quotient.q}`, productTex(quotient.p, quotient.q)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Collapse the left into one logarithm, then write the equation in index form.' },
        { kind: 'display', tex: form === 'sum' ? pairTex(pair) : quotientEquationTex(quotient) },
      ],
      template: '{0} = {1}',
      bank: bankOf(answer, [...slips, `${k}`, `${base * k}`, `${Math.pow(k, base)}`, `${Math.pow(base, k + 1)}`]),
      answer,
    };
  },
  solution: ({ form, pair, quotient }) => {
    if (form === 'sum') {
      const { base, p, q, k } = pair;
      return [
        { text: 'The product law collapses the left.' },
        { tex: `${logb(base, productTex(p, q))} = ${k}` },
        { text: `In index form the argument is the base to the power on the right: $${base}^{${k}} = ${pairN(pair)}$.` },
        { tex: `${productTex(p, q)} = ${pairN(pair)}` },
      ];
    }
    const { base, p, q, c, K } = quotient;
    return [
      { text: 'The quotient law collapses the left, the first argument on top.' },
      { tex: `${logb(base, quotientTex(p, q))} = ${c}` },
      { text: `In index form the argument is $${base}^{${c}} = ${K}$.` },
      { tex: `${quotientTex(p, q)} = ${K}` },
    ];
  },
};

interface NumberParams {
  form: 'sum' | 'difference';
  pair: SumLogParams;
  quotient: DifferenceParams;
}

/**
 * Logarithms equal to a number, solved and typed. The choice form offers the
 * impostor, both roots, and the root of the equation with the number left
 * un-powered where that comes out whole.
 */
const cmpNumber: Generator<NumberParams> = {
  id: 'log-cmp-number',
  choices: ({ form, pair, quotient }) => {
    if (form === 'sum') {
      const lost = impostorOf(pair);
      return steeredOptions(
        valueOptions('x', pair.r, [lost, { tex: eitherTex(pair.r, lost) }, -lost, pair.r * 2]),
        mix(pair.base, pair.p, pair.q, pair.r, pair.k),
      );
    }
    const { p, q, x0, c } = quotient;
    const raw = c > 1 ? (p - c * q) / (c - 1) : NaN;
    return steeredOptions(
      valueOptions('x', x0, [...(Number.isInteger(raw) ? [raw] : []), -x0, x0 + q, x0 * 2]),
      mix(quotient.base, p, q, x0, c),
    );
  },
  sample: (rng, difficulty) => ({
    form: rng.chance(0.65) ? 'sum' : 'difference',
    pair: samplePair(rng, difficulty, 'number'),
    quotient: sampleQuotient(rng, difficulty, 'number'),
  }),
  render: ({ form, pair, quotient }): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$.' },
      { kind: 'display', tex: form === 'sum' ? pairTex(pair) : quotientEquationTex(quotient) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${form === 'sum' ? pair.r : quotient.x0}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form, pair, quotient }) => {
    if (form === 'sum') return pairSolution(pair);
    const { base, p, q, x0, K, c } = quotient;
    return [
      { text: 'The quotient law collapses the left, then index form drops the logarithm.' },
      { tex: `${quotientTex(p, q)} = ${base}^{${c}} = ${K}` },
      { tex: `${shifted(p)} = ${K}(${shifted(q)})` },
      { tex: `${p - K * q} = ${termTex(K - 1, 1)} \\implies x = ${x0}` },
      { text: `Check: at $x = ${x0}$ both arguments are positive, so it stands.` },
    ];
  },
};

interface MeetCurveParams extends SumLogParams {
  extra: number;
}

/**
 * The same equation as a picture: the left-hand side drawn as a curve, the
 * right as a horizontal line, and the solution where they cross. The impostor
 * has nowhere to appear, because the curve does not exist left of its
 * asymptote.
 */
const cmpMeetSlider: Generator<MeetCurveParams> = {
  id: 'log-cmp-meet-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const pair = samplePair(rng, difficulty, 'number');
      if (pair.r <= 10) return { ...pair, extra: rng.int(0, 2) };
    }
  },
  render: (params): Slide => {
    const { base, p, q, r, k, extra } = params;
    const f = (x: number) => logOf(base, x + p) + logOf(base, x + q);
    // The untouched handle rests mid-track; widen the track if that would put
    // its marker straight on the crossing.
    const right = r + 2 + extra + (Math.round((r + 2 + extra) / 2) === r ? 2 : 0);
    const left = -0.08 * right;
    const svg = logGraphSvg({
      xMin: left,
      xMax: right,
      yMin: Math.min(-2, k - 3),
      yMax: Math.max(f(right), k) + 1,
      curves: [{ f }, { f: () => k }],
      label: `The curve y = ${pairLhs(params)} and the line y = ${k}`,
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = ${pairLhs(params)}$ and the flat line is $y = ${k}$. Solve the equation they make, then slide to where they meet.`,
        },
      ],
      min: 0,
      max: right,
      step: 1,
      answer: r,
      readout: 'x = {v}',
      figure: { svg, ...markerWindow(left, right) },
    };
  },
  solution: (params) => [
    ...pairSolution(params),
    { text: `The curve starts at its asymptote, $x = ${Math.max(-params.p, -params.q)}$, so the impostor is not on it at all.` },
  ],
};

/**
 * From the equation to the quadratic it becomes, as the x term and the
 * constant. The constant is where the slips are: the product of the shifts
 * with N left behind, N added instead, and for a number on the right, that
 * number used in place of the power it stands for.
 */
const cmpQuadTiles: Generator<SumLogParams> = {
  id: 'log-cmp-quad-tiles',
  sample: (rng, difficulty) => samplePair(rng, difficulty, rng.chance(0.5) ? 'number' : 'log'),
  render: (params): Slide => {
    const { p, q, rhs, k } = params;
    const N = pairN(params);
    const s = p + q;
    const t = p * q - N;
    const term = (n: number) => signed(n, 'x').trim();
    const constant = (n: number) => (n === 0 ? '+ 0' : signed(n).trim());
    const answer = [term(s), constant(t)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Collapse the logarithms, drop them, and rearrange into a quadratic equal to zero.' },
        { kind: 'display', tex: pairTex(params) },
      ],
      template: 'x^2 {0} {1} = 0',
      bank: bankOf(answer, [
        term(-s),
        constant(p * q),
        constant(p * q + N),
        constant(-t),
        ...(rhs === 'number' ? [constant(p * q - k)] : []),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { base, p, q, rhs, k } = params;
    const N = pairN(params);
    return [
      { text: 'Collapse with the product law and drop the logarithms.' },
      {
        tex:
          rhs === 'log'
            ? twoLines(logb(base, productTex(p, q)), logb(base, `${N}`))
            : `${logb(base, productTex(p, q))} = ${k}`,
      },
      { tex: `${productTex(p, q)} = ${N}` },
      { text: `Expand, then take $${N}$ from both sides so the right is zero.` },
      { tex: `x^2${signed(p + q, 'x')}${signed(p * q)} = ${N}` },
      { tex: quadraticTex(p + q, p * q - N) },
    ];
  },
};

interface SquareParams {
  base: number;
  p: number;
  /** The quadratic's roots: x1 always keeps x + p positive, x2 may not. */
  x1: number;
  x2: number;
  /** Written with the doubled logarithm on the right rather than the left. */
  flip: boolean;
}

/**
 * 2log_b(x + p) = log_b(ax + c). With a = 2p + x1 + x2 and c = p^2 - x1x2 the
 * quadratic's roots are x1 and x2, and ax + c = (x + p)^2 at both, so it is
 * always positive there: the only argument that can fail is x + p. Both roots
 * can survive, which is what makes this the honest test of checking.
 */
function sampleSquare(rng: Rng, difficulty: number, both: boolean): SquareParams {
  const hard = difficulty > 1;
  for (;;) {
    const base = rng.pick(hard ? [10, 2, 3, 5, 7] : [10, 10, 2, 3]);
    const p = rng.int(0, hard ? 4 : 3);
    const y1 = rng.int(1, hard ? 7 : 5);
    const y2 = both ? rng.int(1, hard ? 7 : 5) : -rng.int(1, hard ? 5 : 3);
    const x1 = y1 - p;
    const x2 = y2 - p;
    const c = p * p - x1 * x2;
    if (y1 === y2 || y1 + y2 < 1 || x1 === 0 || x2 === 0 || Math.abs(c) > 40) continue;
    return { base, p, x1, x2, flip: rng.chance(0.5) };
  }
}

function squareSides({ base, p, x1, x2 }: SquareParams): [string, string] {
  return [`2${logb(base, shifted(p))}`, logb(base, linearTex(2 * p + x1 + x2, p * p - x1 * x2))];
}

function squareTex(params: SquareParams): string {
  const [doubled, single] = squareSides(params);
  return params.flip ? `${single} = ${doubled}` : `${doubled} = ${single}`;
}

/** Each logarithm's argument as written, left to right, with its value at x. */
function squareArgs({ p, x1, x2, flip }: SquareParams): { tex: string; at: (x: number) => number }[] {
  const a = 2 * p + x1 + x2;
  const c = p * p - x1 * x2;
  const doubled = { tex: shifted(p), at: (x: number) => x + p };
  const single = { tex: linearTex(a, c), at: (x: number) => a * x + c };
  return flip ? [single, doubled] : [doubled, single];
}

function squareSolution(params: SquareParams): { text?: string; tex?: string }[] {
  const { base, p, x1, x2 } = params;
  const a = 2 * p + x1 + x2;
  const c = p * p - x1 * x2;
  const verdict = (x: number) =>
    x + p > 0
      ? `At $x = ${x}$, $${shifted(p)} = ${x + p}$: positive, so it stands.`
      : `At $x = ${x}$, $${shifted(p)} = ${x + p}$: not positive, so it goes.`;
  return [
    {
      text: `The power law puts the 2 back inside as a square, $${logb(base, `(${shifted(p)})^2`)}$, and then the logarithms drop.`,
    },
    { tex: `(${shifted(p)})^2 = ${linearTex(a, c)}` },
    { tex: quadraticTex(2 * p - a, p * p - c) },
    { tex: factorisedTex(x1, x2) },
    { text: `The right-hand argument equals the square, so it is positive at both. Check $${shifted(p)}$.` },
    { text: verdict(x1) },
    { text: verdict(x2) },
  ];
}

interface ImpostorParams {
  form: 'sum' | 'square';
  pair: SumLogParams;
  square: SquareParams;
  /** Flow only: whether the candidate given is the root that survives. */
  kept: boolean;
}

/** The equation, its arguments in the order written, and its two roots. */
function impostorCase({ form, pair, square }: ImpostorParams): {
  tex: string;
  args: { tex: string; at: (x: number) => number }[];
  roots: [number, number];
} {
  if (form === 'sum') {
    return {
      tex: pairTex(pair),
      args: [
        { tex: shifted(pair.p), at: (x) => x + pair.p },
        { tex: shifted(pair.q), at: (x) => x + pair.q },
      ],
      roots: [pair.r, impostorOf(pair)],
    };
  }
  return { tex: squareTex(square), args: squareArgs(square), roots: [square.x1, square.x2] };
}

/**
 * Keep or reject one root, by testing each argument in turn. A doubled
 * logarithm written on the right puts the failing argument second, so the
 * walk does not always stop at the first question; a sum of logarithms fails
 * both at once, and some of its impostors are positive, which is the case
 * that catches people who only check the sign of x.
 */
const cmpImpostorFlow: Generator<ImpostorParams> = {
  id: 'log-cmp-impostor-flow',
  sample: (rng, difficulty) => ({
    form: rng.chance(0.5) ? 'sum' : 'square',
    pair: samplePair(rng, difficulty, rng.chance(0.5) ? 'log' : 'number', rng.chance(0.4)),
    square: sampleSquare(rng, difficulty, false),
    kept: rng.chance(0.4),
  }),
  render: (params): Slide => {
    const { tex, args, roots } = impostorCase(params);
    const x = params.kept ? roots[0] : roots[1];
    const [first, second] = args;
    const reject = `Reject it. A logarithm needs a positive argument, so $x = ${x}$ is an impostor.`;
    const answer = first.at(x) <= 0 ? ['No'] : second.at(x) <= 0 ? ['Yes', 'No'] : ['Yes', 'Yes'];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Dropping the logarithms gives a quadratic with $x = ${x}$ as one root. Does it solve the original equation? Test each argument in turn.`,
        },
      ],
      // The subject box is narrower than a prompt, so a sum is always set on
      // two lines here, even with a number on the right.
      subject: params.form === 'sum' && params.pair.rhs === 'number' ? twoLines(pairLhs(params.pair), `${params.pair.k}`) : tex,
      steps: [
        {
          id: 'first',
          ask: `At $x = ${x}$, is $${first.tex}$ positive?`,
          branches: [
            { label: 'Yes', to: 'second' },
            { label: 'No', outcome: reject },
          ],
        },
        {
          id: 'second',
          ask: `At $x = ${x}$, is $${second.tex}$ positive?`,
          branches: [
            { label: 'Yes', outcome: `Keep it. Every logarithm is defined at $x = ${x}$.` },
            { label: 'No', outcome: reject },
          ],
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const { args, roots } = impostorCase(params);
    const x = params.kept ? roots[0] : roots[1];
    return [
      { text: 'Put the root into each argument, not into the quadratic: the quadratic is satisfied by both roots.' },
      ...args.map(({ tex, at }) => ({ tex: `${tex} = ${at(x)}` })),
      {
        text: args.every(({ at }) => at(x) > 0)
          ? `Both are positive, so $x = ${x}$ solves the original equation.`
          : `A logarithm of a number that is not positive is undefined, so $x = ${x}$ is rejected.`,
      },
    ];
  },
};

/**
 * Of the quadratic's two roots, which solve the equation: one, the other, or
 * both. The roots are given in increasing order, so their position says
 * nothing, and a doubled logarithm sometimes keeps both.
 */
const cmpImpostor: Generator<ImpostorParams> = {
  id: 'log-cmp-impostor',
  sample: (rng, difficulty) => ({
    form: rng.chance(0.5) ? 'sum' : 'square',
    pair: samplePair(rng, difficulty, rng.chance(0.5) ? 'log' : 'number', rng.chance(0.5)),
    square: sampleSquare(rng, difficulty, rng.chance(0.4)),
    kept: true,
  }),
  render: (params): Slide => {
    const { tex, args, roots } = impostorCase(params);
    const [lo, hi] = [...roots].sort((m, n) => m - n);
    const works = (x: number) => args.every(({ at }) => at(x) > 0);
    const only = (x: number) => `x = ${x} \\text{ only}`;
    const all = [only(lo), only(hi), '\\text{both}', '\\text{neither}'];
    const right = works(lo) && works(hi) ? '\\text{both}' : works(lo) ? only(lo) : only(hi);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Dropping the logarithms gives a quadratic with roots $x = ${lo}$ and $x = ${hi}$. Which of them solve the original equation?`,
        },
        { kind: 'display', tex },
      ],
      options: choiceOf([right, ...all.filter((label) => label !== right)], mix(lo, hi, args.length, params.form === 'sum' ? 1 : 2)),
      correctId: 'correct',
    };
  },
  solution: (params) => {
    if (params.form === 'square') return squareSolution(params.square);
    const { pair } = params;
    const lost = impostorOf(pair);
    return [
      { text: 'Put each root into both arguments.' },
      { text: `At $x = ${pair.r}$: $${shifted(pair.p)} = ${pair.r + pair.p}$ and $${shifted(pair.q)} = ${pair.r + pair.q}$.` },
      { text: `At $x = ${lost}$: $${shifted(pair.p)} = ${lost + pair.p}$ and $${shifted(pair.q)} = ${lost + pair.q}$.` },
      { text: `Only $x = ${pair.r}$ keeps both positive.${lost > 0 ? ` A positive root can still be an impostor: it is the arguments that must be positive, not $x$.` : ''}` },
    ];
  },
};

/**
 * A doubled logarithm equal to a single one, solved and typed. There is always
 * exactly one root to keep here; the choice form offers the one to reject.
 */
const cmpSquare: Generator<SquareParams> = {
  id: 'log-cmp-square',
  choices: (params) =>
    steeredOptions(
      valueOptions('x', params.x1, [params.x2, { tex: eitherTex(params.x1, params.x2) }, -params.x2, params.x1 + params.p]),
      mix(params.base, params.p, params.x1, params.x2, params.flip ? 1 : 2),
    ),
  sample: (rng, difficulty) => sampleSquare(rng, difficulty, false),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$. Only one root survives the check.' },
      { kind: 'display', tex: squareTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.x1}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: squareSolution,
};

interface SubParams {
  base: number;
  /** The values of log_b x, smaller first. */
  u1: number;
  u2: number;
  form: 'standard' | 'moved' | 'power' | 'fraction';
}

/** The largest power of each base printed in full. */
function subCap(base: number): number {
  return base === 10 ? 3 : base === 2 ? 6 : base === 3 ? 4 : 3;
}

/**
 * A quadratic in log_b x, built from its two values of u = log_b x. `negative`
 * lets a root fall below zero, which makes x a fraction; `nonZero` keeps both
 * away from 0, for forms that divide by u or need a constant term.
 */
function sampleSub(
  rng: Rng,
  difficulty: number,
  forms: SubParams['form'][],
  { negative = false, nonZero = false } = {},
): SubParams {
  const hard = difficulty > 1;
  for (;;) {
    const base = rng.pick(hard ? [10, 2, 3, 4, 5] : [10, 2, 2, 3]);
    const low = negative && hard ? -2 : negative ? -1 : 0;
    const a = rng.int(low, subCap(base));
    const b = rng.int(low, subCap(base));
    const [u1, u2] = a < b ? [a, b] : [b, a];
    const form = rng.pick(forms);
    const s = u1 + u2;
    if (u1 === u2 || s === 0) continue;
    if ((nonZero || form === 'fraction') && u1 * u2 === 0) continue;
    if (form === 'power' && s < 2) continue;
    return { base, u1, u2, form };
  }
}

/** b^u as the learner reads it: a whole number, or one over one. */
function subX(base: number, u: number): string {
  return u >= 0 ? `${Math.pow(base, u)}` : `\\frac{1}{${Math.pow(base, -u)}}`;
}

/** The coefficient of a term: nothing for 1, a minus for -1. */
function coefficientTex(n: number): string {
  return n === 1 ? '' : n === -1 ? '-' : `${n}`;
}

function subTex({ base, u1, u2, form }: SubParams): string {
  const L = logb(base, 'x');
  const square = `(${L})^2`;
  const s = u1 + u2;
  const t = u1 * u2;
  if (form === 'moved') return `${square}${signed(t)} = ${coefficientTex(s)}${L}`;
  if (form === 'power') return `${square} - ${logb(base, `x^{${s}}`)}${signed(t)} = 0`;
  if (form === 'fraction') return `${L} ${t > 0 ? '+' : '-'} \\frac{${Math.abs(t)}}{${L}} = ${s}`;
  return quadraticTex(-s, t, square, L);
}

function subSolution(params: SubParams): { text?: string; tex?: string }[] {
  const { base, u1, u2, form } = params;
  const L = logb(base, 'x');
  const s = u1 + u2;
  const t = u1 * u2;
  const opening =
    form === 'power'
      ? `Let $u = ${L}$. The power law makes $${logb(base, `x^{${s}}`)} = ${s}${L} = ${s}u$.`
      : form === 'fraction'
        ? `Let $u = ${L}$ and multiply through by $u$, which is not zero at either root.`
        : form === 'moved'
          ? `Let $u = ${L}$ and bring every term to one side. Do not divide by $u$: that loses a root.`
          : `Let $u = ${L}$.`;
  return [
    { text: opening },
    { tex: quadraticTex(-s, t, 'u^2', 'u') },
    { tex: factorisedTex(u1, u2, 'u') },
    { text: `So $u = ${u1}$ or $u = ${u2}$. Each is a value of $${L}$, so undo it.` },
    { tex: `x = ${base}^{${u1}} = ${subX(base, u1)}` },
    { tex: `x = ${base}^{${u2}} = ${subX(base, u2)}` },
  ];
}

/**
 * Both solutions of a quadratic in log x. The bank holds the values of u
 * themselves, which is where the working stops if the substitution is not
 * undone, and u to the power of the base, which is b^u turned round.
 */
const cmpSubTiles: Generator<SubParams> = {
  id: 'log-cmp-sub-tiles',
  sample: (rng, difficulty) =>
    sampleSub(rng, difficulty, difficulty > 1 ? ['standard', 'moved', 'power'] : ['standard', 'moved'], { negative: true }),
  render: (params): Slide => {
    const { base, u1, u2 } = params;
    const answer = [subX(base, u1), subX(base, u2)];
    const flipped = [u1, u2].filter((u) => u > 1 && Math.pow(u, base) <= 1000).map((u) => `${Math.pow(u, base)}`);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Solve for $x$. Let $u = ${logb(base, 'x')}$ first.` },
        { kind: 'display', tex: subTex(params) },
      ],
      template: 'x = {0} \\text{ or } x = {1}',
      bank: bankOf(answer, [`${u1}`, `${u2}`, ...flipped, `${base * u2}`, `${Math.pow(base, u2 + 1)}`]),
      answer,
      unordered: true,
    };
  },
  solution: subSolution,
};

/**
 * The substitution one step at a time: the square becomes u^2, the other
 * logarithm a multiple of u, then the factorised quadratic and both values of
 * x. The first two banks carry the swap that trips people: (log x)^2 is u^2,
 * while log(x^3) is 3u.
 */
const cmpSubSteps: Generator<SubParams> = {
  id: 'log-cmp-sub-steps',
  sample: (rng, difficulty) =>
    sampleSub(rng, difficulty, difficulty > 1 ? ['standard', 'power'] : ['standard'], { negative: true, nonZero: true }),
  render: (params): Slide => {
    const { base, u1, u2, form } = params;
    const L = logb(base, 'x');
    const s = u1 + u2;
    const t = u1 * u2;
    const m = Math.abs(s);
    const middle = form === 'power' ? logb(base, `x^{${m}}`) : `${m === 1 ? '' : m}${L}`;
    const mu = m === 1 ? 'u' : `${m}u`;
    const either = (f: (u: number) => string) => `x = ${f(u1)} \\text{ or } x = ${f(u2)}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve by letting $u = ${L}$. Tap the step to do next, then choose what it gives.`,
        },
      ],
      start: [`(${L})^2`, s > 0 ? '-' : '+', middle, t > 0 ? '+' : '-', `${Math.abs(t)}`, '=', '0'],
      reductions: [
        { span: [0, 1], operator: 0, value: 'u^2', bank: stepsBank(['u^2', '2u', 'u', '2u^2']) },
        {
          span: [2, 3],
          operator: 2,
          value: mu,
          bank: stepsBank([mu, m === 1 ? 'u^2' : `u^{${m}}`, `${m} + u`, `${m + 1}u`]),
        },
        {
          span: [0, 7],
          operator: 5,
          value: factorisedTex(u1, u2, 'u'),
          bank: stepsBank([
            factorisedTex(u1, u2, 'u'),
            factorisedTex(-u1, -u2, 'u'),
            factorisedTex(u1, -u2, 'u'),
            factorisedTex(-u1, u2, 'u'),
          ]),
        },
        {
          span: [0, 1],
          operator: 0,
          value: either((u) => subX(base, u)),
          bank: stepsBank([
            either((u) => subX(base, u)),
            either((u) => `${u}`),
            either((u) => subX(base, -u)),
            either((u) => `${base * u}`),
          ]),
        },
      ],
    };
  },
  solution: subSolution,
};

/**
 * The larger solution of a quadratic in log x, typed. At the harder end the
 * quadratic is hidden behind the power law or a fraction.
 */
const cmpSubRoot: Generator<SubParams> = {
  id: 'log-cmp-sub-root',
  choices: ({ base, u1, u2, form }) =>
    steeredOptions(
      valueOptions('x', Math.pow(base, u2), [
        u2,
        Math.pow(base, u1),
        ...(Math.pow(u2, base) <= 1000 ? [Math.pow(u2, base)] : []),
        base * u2,
      ]),
      mix(base, u1, u2, form.length),
    ),
  sample: (rng, difficulty) =>
    sampleSub(rng, difficulty, difficulty > 1 ? ['standard', 'moved', 'power', 'fraction'] : ['standard', 'moved']),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Find the larger solution for $x$.' },
      { kind: 'display', tex: subTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${Math.pow(params.base, params.u2)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    ...subSolution(params),
    { text: `The larger is $x = ${subX(params.base, params.u2)}$.` },
  ],
};

interface HiddenParams {
  base: number;
  /**
   * power: (log x)^2 - log(x^s) + t = 0. product: log x · log(b^j x) = c.
   * quotient: (log x)^2 = log(x^m / b^j).
   */
  form: 'power' | 'product' | 'quotient';
  u1: number;
  u2: number;
}

function hiddenTex({ base, form, u1, u2 }: HiddenParams): string {
  const L = logb(base, 'x');
  const s = u1 + u2;
  const t = u1 * u2;
  if (form === 'power') return `(${L})^2 - ${logb(base, `x^{${s}}`)}${signed(t)} = 0`;
  if (form === 'product') return `${L} \\cdot ${logb(base, `${Math.pow(base, -s)}x`)} = ${-t}`;
  return `(${L})^2 = ${logb(base, `\\frac{x^{${s}}}{${Math.pow(base, t)}}`)}`;
}

/**
 * Which quadratic in u = log x the equation becomes. Each form hides u behind a
 * different law: the power law in log(x^s), the product law in log(b^j x), the
 * quotient law in a fraction. The wrong options forget the law (b^j left as a
 * number, the power left off) or slip a sign moving a term across.
 */
const cmpHidden: Generator<HiddenParams> = {
  id: 'log-cmp-hidden',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const base = rng.pick(hard ? [10, 2, 3, 5] : [10, 2, 3]);
      const form = rng.pick(['power', 'product', 'quotient'] as const);
      const a = rng.int(-3, 4);
      const b = rng.int(-3, 4);
      const [u1, u2] = a < b ? [a, b] : [b, a];
      const s = u1 + u2;
      const t = u1 * u2;
      if (u1 === u2 || t === 0) continue;
      if (form === 'power' && s < 2) continue;
      if (form === 'product' && (-s < 1 || Math.pow(base, -s) > 100)) continue;
      if (form === 'quotient' && (s < 2 || t < 1 || Math.pow(base, t) > 1000)) continue;
      return { base, form, u1, u2 };
    }
  },
  render: (params): Slide => {
    const { base, form, u1, u2 } = params;
    const s = u1 + u2;
    const t = u1 * u2;
    const q = (one: number, zero: number) => quadraticTex(one, zero, 'u^2', 'u');
    const wrong =
      form === 'power'
        ? [q(-1, t), q(s, t), q(-s, -t), q(-(s + 1), t)]
        : form === 'product'
          ? [q(Math.pow(base, -s), t), q(s, t), q(-s, -t), q(-s + 1, t)]
          : [q(-s, -t), q(-s, Math.pow(base, t)), q(-1, t), q(-(s + 1), t)];
    const right = q(-s, t);
    const labels = [right, ...[...new Set(wrong)].filter((label) => label !== right)].slice(0, 4);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `Let $u = ${logb(base, 'x')}$. Which quadratic in $u$ does this equation become?` },
        { kind: 'display', tex: hiddenTex(params) },
      ],
      options: choiceOf(labels, mix(base, u1, u2, form.length)),
      correctId: 'correct',
    };
  },
  solution: (params) => {
    const { base, form, u1, u2 } = params;
    const L = logb(base, 'x');
    const s = u1 + u2;
    const t = u1 * u2;
    const law =
      form === 'power'
        ? { text: `The power law: $${logb(base, `x^{${s}}`)} = ${s}${L} = ${s}u$, and $(${L})^2 = u^2$.` }
        : form === 'product'
          ? {
              text: `The product law: $${logb(base, `${Math.pow(base, -s)}x`)} = ${logb(base, `${Math.pow(base, -s)}`)} + ${L} = ${-s} + u$.`,
            }
          : {
              text: `The quotient and power laws: $${logb(base, `\\frac{x^{${s}}}{${Math.pow(base, t)}}`)} = ${s}u - ${t}$.`,
            };
    const middle =
      form === 'product' ? `u(u${signed(-s)}) = ${-t}` : form === 'quotient' ? `u^2 = ${s}u - ${t}` : `u^2 - ${s}u${signed(t)} = 0`;
    return [
      law,
      { tex: middle },
      { tex: quadraticTex(-s, t, 'u^2', 'u') },
      { text: `It factorises as $${factorisedTex(u1, u2, 'u').replace(' = 0', '')}$, so $x = ${subX(base, u1)}$ or $x = ${subX(base, u2)}$.` },
    ];
  },
};

interface SystemParams {
  base: number;
  /** log_b x and log_b y. */
  u: number;
  v: number;
  /**
   * split: log x + log y = S, log x - log y = D. merged: log(xy) = S and
   * log(x/y) = D. weighted: 2log x + log y = S', log x - log y = D.
   */
  form: 'split' | 'merged' | 'weighted';
  ask: 'x' | 'y';
}

function sampleSystem(rng: Rng, difficulty: number, forms: SystemParams['form'][]): SystemParams {
  const hard = difficulty > 1;
  for (;;) {
    const base = rng.pick(hard ? [10, 2, 3, 5] : [10, 10, 2, 3]);
    const u = rng.int(1, subCap(base));
    const v = rng.int(0, subCap(base));
    if (u === v) continue;
    return { base, u, v, form: rng.pick(forms), ask: rng.chance(0.5) ? 'x' : 'y' };
  }
}

function systemLines({ base, u, v, form }: SystemParams): [string, string] {
  const X = logb(base, 'x');
  const Y = logb(base, 'y');
  if (form === 'merged') {
    return [`${logb(base, 'xy')} &= ${u + v}`, `${logb(base, '\\frac{x}{y}')} &= ${u - v}`];
  }
  if (form === 'weighted') return [`2${X} + ${Y} &= ${2 * u + v}`, `${X} - ${Y} &= ${u - v}`];
  return [`${X} + ${Y} &= ${u + v}`, `${X} - ${Y} &= ${u - v}`];
}

function systemTex(params: SystemParams): string {
  const [first, second] = systemLines(params);
  return `\\begin{aligned} ${first} \\\\ ${second} \\end{aligned}`;
}

function systemSolution(params: SystemParams): { text?: string; tex?: string }[] {
  const { base, u, v, form } = params;
  const X = logb(base, 'x');
  const Y = logb(base, 'y');
  const split =
    form === 'merged'
      ? [{ text: `Split each with the laws: $${X} + ${Y} = ${u + v}$ and $${X} - ${Y} = ${u - v}$.` }]
      : [];
  const add =
    form === 'weighted'
      ? { tex: `3${X} = ${2 * u + v} + ${factorOf(u - v)} = ${3 * u}` }
      : { tex: `2${X} = ${u + v} + ${factorOf(u - v)} = ${2 * u}` };
  return [
    ...split,
    { text: 'Add the two equations: the $y$ logarithms cancel.' },
    add,
    { tex: `${X} = ${u} \\qquad ${Y} = ${v}` },
    { text: 'Each is a logarithm, so undo it.' },
    { tex: `x = ${base}^{${u}} = ${Math.pow(base, u)}` },
    { tex: `y = ${base}^{${v}} = ${Math.pow(base, v)}` },
  ];
}

/**
 * Two logarithms, two unknowns, as a tree: add the equations for twice log x,
 * halve it, take it from the sum for log y, and undo both. Subtracting the
 * equations instead, and stopping at the logarithms, are in the bank.
 */
const cmpPairTree: Generator<SystemParams> = {
  id: 'log-cmp-pair-tree',
  sample: (rng, difficulty) => sampleSystem(rng, difficulty, difficulty > 1 ? ['split', 'merged'] : ['split']),
  render: (params): Slide => {
    const { base, u, v, form } = params;
    const answer = [`${2 * u}`, `${u}`, `${v}`, `${Math.pow(base, u)}`, `${Math.pow(base, v)}`];
    const X = logb(base, 'x');
    const Y = logb(base, 'y');
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `${form === 'merged' ? 'Split each logarithm with the laws first. Then add' : 'Add'} the two equations. Fill in $2${X}$, then $${X}$, then $${Y}$, then $x$, then $y$.`,
        },
      ],
      expression: systemTex(params),
      nodes: [
        { id: 'twice', from: [] },
        { id: 'logx', from: ['twice'] },
        { id: 'logy', from: ['logx'] },
        { id: 'x', from: ['logx'] },
        { id: 'y', from: ['logy'] },
      ],
      bank: treeBank(answer, [`${2 * v}`, `${base * u}`, `${u + v}`, `${Math.pow(base, u + v)}`]),
      answer,
    };
  },
  solution: systemSolution,
};

/**
 * One of the two unknowns, typed. The weighted form, where log x appears
 * twice, means adding gives three of it rather than two.
 */
const cmpSystem: Generator<SystemParams> = {
  id: 'log-cmp-system',
  choices: (params) => {
    const { base, u, v, ask } = params;
    const [mine, other] = ask === 'x' ? [u, v] : [v, u];
    return steeredOptions(
      valueOptions(ask, Math.pow(base, mine), [mine, Math.pow(base, other), Math.pow(base, mine + 1), base * mine]),
      mix(base, u, v, ask === 'x' ? 1 : 2, params.form.length),
    );
  },
  sample: (rng, difficulty) =>
    sampleSystem(rng, difficulty, difficulty > 1 ? ['split', 'merged', 'weighted'] : ['split', 'merged']),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve the pair of equations for $${params.ask}$.` },
      { kind: 'display', tex: systemTex(params) },
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: `${Math.pow(params.base, params.ask === 'x' ? params.u : params.v)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: systemSolution,
};

interface MixedParams {
  base: number;
  /** The other base is base^k. */
  k: number;
  /** log_base x. */
  u: number;
  /** Added or taken away. */
  sign: 1 | -1;
  /** The base^k logarithm written first. */
  bigFirst: boolean;
}

/** Every base, power and root where log_{b^k} x comes out whole. */
const MIXED = [2, 3, 5].flatMap((base) =>
  [2, 3].flatMap((k) =>
    [...Array(9).keys()]
      .map((i) => (i + 1) * k)
      .filter((u) => Math.pow(base, u) <= 729)
      .map((u) => ({ base, k, u })),
  ),
);

function sampleMixed(rng: Rng, difficulty: number): MixedParams {
  const hard = difficulty > 1;
  const pick = rng.pick(MIXED);
  const sign = rng.chance(hard ? 0.4 : 0.25) ? -1 : 1;
  return { ...pick, sign, bigFirst: rng.chance(0.5) };
}

/** The two coefficients of log_b x, in the order written, once the other logarithm is rebased. */
function mixedTerms({ k, sign, bigFirst }: MixedParams): [[number, number], [number, number]] {
  const small: [number, number] = [1, 1];
  const big: [number, number] = [1, k];
  const second = bigFirst ? small : big;
  return [bigFirst ? big : small, [sign * second[0], second[1]]];
}

/** The total coefficient of log_b x, as a fraction [numerator, denominator]. */
function mixedCoefficient(params: MixedParams): [number, number] {
  const [[a, b], [c, d]] = mixedTerms(params);
  return [a * d + c * b, b * d];
}

function mixedTarget(params: MixedParams): number {
  const [n, d] = mixedCoefficient(params);
  return (params.u * n) / d;
}

function fractionTex(n: number, d: number): string {
  if (d === 1) return `${n}`;
  return n < 0 ? `-\\frac{${-n}}{${d}}` : `\\frac{${n}}{${d}}`;
}

/** d/n, with the sign kept on top. */
function reciprocalTex(n: number, d: number): string {
  return fractionTex(Math.sign(n) * d, Math.abs(n));
}

function mixedTex(params: MixedParams): string {
  const { base, k, sign, bigFirst } = params;
  const small = logb(base, 'x');
  const big = logb(Math.pow(base, k), 'x');
  const [first, second] = bigFirst ? [big, small] : [small, big];
  return `${first} ${sign > 0 ? '+' : '-'} ${second} = ${mixedTarget(params)}`;
}

function mixedSolution(params: MixedParams): { text?: string; tex?: string }[] {
  const { base, k, u } = params;
  const bigBase = Math.pow(base, k);
  const [n, d] = mixedCoefficient(params);
  const T = mixedTarget(params);
  return [
    {
      text: `Change the base of $${logb(bigBase, 'x')}$ to ${base}: since $${bigBase} = ${base}^{${k}}$, it is $\\frac{${logb(base, 'x')}}{${k}}$.`,
    },
    { tex: `${fractionTex(n, d)}${logb(base, 'x')} = ${T}` },
    { tex: `${logb(base, 'x')} = ${factorOf(T)} \\times ${reciprocalTex(n, d)} = ${u}` },
    { tex: `x = ${base}^{${u}} = ${Math.pow(base, u)}` },
  ];
}

/**
 * Two logarithms in different bases, one a power of the other, typed. Change
 * of base folds them into one; the wrong answers stop at the logarithm or at
 * the number on the right.
 */
const cmpMixed: Generator<MixedParams> = {
  id: 'log-cmp-mixed',
  choices: (params) => {
    const { base, u } = params;
    const T = mixedTarget(params);
    return steeredOptions(
      valueOptions('x', Math.pow(base, u), [
        u,
        ...(T > 0 && Math.pow(base, T) <= 1_000_000 ? [Math.pow(base, T)] : []),
        T,
        Math.pow(base, u + 1),
      ]),
      mix(base, params.k, u, params.sign, params.bigFirst ? 1 : 2),
    );
  },
  sample: sampleMixed,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Solve for $x$.' },
      { kind: 'display', tex: mixedTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${Math.pow(params.base, params.u)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: mixedSolution,
};

/**
 * The same equation as tiles: the total coefficient once both logarithms are
 * in the small base, then x. Treating log_{b^k} as if it were log_b (a
 * coefficient of 2) and the reciprocal of the right fraction are in the bank.
 */
const cmpBaseTiles: Generator<MixedParams> = {
  id: 'log-cmp-base-tiles',
  sample: sampleMixed,
  render: (params): Slide => {
    const { base, k, u } = params;
    const [n, d] = mixedCoefficient(params);
    const T = mixedTarget(params);
    const answer = [fractionTex(n, d), `${Math.pow(base, u)}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Change $${logb(Math.pow(base, k), 'x')}$ to base ${base}, collect the logarithms, then solve.`,
        },
        { kind: 'display', tex: mixedTex(params) },
      ],
      template: `{0}\\log_${base} x = ${T} \\qquad x = {1}`,
      bank: bankOf(answer, [reciprocalTex(n, d), `${params.sign > 0 ? 2 : 0}`, `\\frac{1}{${k}}`, `${u}`, `${Math.pow(base, u + 1)}`]),
      answer,
    };
  },
  solution: mixedSolution,
};

export const logarithmGenerators = [
  evaluateLog,
  logToIndex,
  solveSimple,
  logDomain,
  logArithmetic,
  powerLaw,
  combineLogs,
  lawEquation,
  solveExponential,
  naturalLog,
  growth,
  logChain,
  logPower,
  fromIndex,
  logTree,
  domainFlow,
  lawFlow,
  splitLogs,
  exponentialTiles,
  decaySlider,
  methodFlow,
  changeBase,
  changeBaseTiles,
  changeBaseSlider,
  quotientReduce,
  chainReduce,
  reciprocal,
  productFlow,
  chainTiles,
  solveIndex,
  solveIndexTiles,
  between,
  solveCommon,
  commonBaseTiles,
  baseFlow,
  graphRead,
  graphSlider,
  pointsTiles,
  onCurveFlow,
  graphMatch,
  inversePoint,
  mirrorSlider,
  undoEvaluate,
  transformSlider,
  transformMatch,
  transformTiles,
  transformFlow,
  solveGraph,
  meetSlider,
  compareBases,
  inequalityTiles,
  linPowerTiles,
  linPowerRead,
  linPowerEvaluate,
  linPowerSlider,
  linExpTiles,
  linExpRead,
  linExpEvaluate,
  linExpSlider,
  linGradientTree,
  linConstantSteps,
  linModelMatch,
  linModelTiles,
  linAxesFlow,
  linStraightChoice,
  linPredict,
  cmpCollapse,
  cmpCombineTiles,
  cmpBoth,
  cmpQuotientTree,
  cmpIndexTiles,
  cmpNumber,
  cmpMeetSlider,
  cmpQuadTiles,
  cmpImpostorFlow,
  cmpImpostor,
  cmpSquare,
  cmpSubTiles,
  cmpSubSteps,
  cmpSubRoot,
  cmpHidden,
  cmpPairTree,
  cmpSystem,
  cmpMixed,
  cmpBaseTiles,
] as unknown as Generator<unknown>[];
