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
import type { Generator, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { bin, log, num } from '../expr';
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
] as unknown as Generator<unknown>[];
