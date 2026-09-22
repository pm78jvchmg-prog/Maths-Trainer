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
import { bin, log, num, pow } from '../expr';
import { plotSvg } from '../figures';
import { EXP_KEYS } from './calculus';

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

/** Solving e^(kx) = c with natural logarithms. */
const naturalLog: Generator<NaturalParams> = {
  id: 'log-natural',
  // ln(t)/k and ln(t/k) are the same number whenever the k-th root of t is t/k
  // — at t = 4, k = 2 both are ln 2 — so each distractor is checked against the
  // answer's value before it is offered. Dividing by k + 1 never collides,
  // which keeps at least one distractor on every draw.
  choices: ({ k, target }) => {
    const right = Math.log(target) / k;
    const apart = (value: number) => Math.abs(value - right) > 1e-9;
    return options(
      { tex: `\\frac{\\ln\\left(${target}\\right)}{${k}}`, answer: `log(${target}) / (${k})` },
      ...(apart(Math.log(target / k))
        ? [{ tex: `\\ln\\left(\\frac{${target}}{${k}}\\right)`, answer: `log(${target} / (${k}))` }]
        : []),
      ...(apart(k * Math.log(target))
        ? [{ tex: `${k}\\ln\\left(${target}\\right)`, answer: `(${k}) * log(${target})` }]
        : []),
      // Stepped away from zero, not toward it: at k = -1 a step of +1 would
      // divide by zero, which comes back indeterminate rather than wrong.
      ...[k > 0 ? k + 1 : k - 1].map((alt) => ({
        tex: `\\frac{\\ln\\left(${target}\\right)}{${alt}}`,
        answer: `log(${target}) / (${alt})`,
      })),
    );
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
    lead: `e^{${k === 1 ? '' : k}x} = ${target} \\implies x =`,
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
    { tex: `e^{${k === 1 ? '' : k}x} = ${target} \\implies ${k === 1 ? '' : k}x = \\ln\\left(${target}\\right)` },
    { tex: `x = \\frac{\\ln\\left(${target}\\right)}{${k}}` },
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
    return [
      {
        text: `After $n$ hours the colony is $${start} \\times ${multiplier}^{n}$, so the question asks when that first passes $${target}$.`,
      },
      { tex: `${start} \\times ${multiplier}^{n} > ${target} \\implies ${multiplier}^{n} > ${(target / start).toFixed(2)}` },
      {
        tex: `n > \\frac{\\ln\\left(${(target / start).toFixed(2)}\\right)}{\\ln\\left(${multiplier}\\right)} = ${exact.toFixed(3)}`,
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

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** p/q in lowest terms, with any sign carried on the numerator. */
function reduced(p: number, q: number): [number, number] {
  const g = gcd(p, q);
  const sign = q < 0 ? -1 : 1;
  return [(sign * p) / g, (sign * q) / g];
}

/** A fraction as the learner reads it. A whole number stays whole. */
function fracTex(p: number, q: number): string {
  const [n, d] = reduced(p, q);
  if (d === 1) return `${n}`;
  return n < 0 ? `-\\frac{${-n}}{${d}}` : `\\frac{${n}}{${d}}`;
}

/** The same fraction for the checker. Never displayed. */
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
    // until the middle is nowhere near the answer — otherwise *Check* would be
    // right before anything had been dragged.
    let top = Math.ceil(value) + 1;
    while (Math.abs(top / 2 - answer) < 0.6) top += 1;
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
    const right = `$${logTex(a, `${c}`)}$`;
    const wrong = `$${logTex(c, `${a}`)}$`;
    const left = [
      { label: right, outcome: `That reads the product as $${logTex(a, `${c}`)}$.` },
      { label: wrong, outcome: `That reads the product as $${logTex(c, `${a}`)}$.` },
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
              outcome: 'Nothing cancels. The product stays as two logarithms.',
            },
          ],
        },
        {
          id: 'both',
          ask: "Is each one's base the other one's argument?",
          branches: [
            { label: 'Yes', outcome: 'They are reciprocals, so the product is exactly 1.' },
            { label: 'No', to: 'left' },
          ],
        },
        {
          id: 'left',
          ask: 'The shared number cancels. Which single logarithm is left?',
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
] as unknown as Generator<unknown>[];
