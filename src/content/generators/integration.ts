/**
 * Integration.
 *
 * Indefinite integrals answer in `mode: 'upToConstant'`, so every valid
 * antiderivative passes whether or not the learner wrote "+ C". The keypad
 * carries a `C` key anyway, because writing it is the habit worth building.
 *
 * Two things are deliberately avoided rather than worked around:
 *
 * - `∫ 1/x dx` is never a typed expression question. Its answer is `ln|x|`, and
 *   the checker probes negative x, where mathjs hands back the complex
 *   `ln|x| + iπ` for `ln(x)`. A learner writing the better answer, `ln|x|`,
 *   would then disagree with ours at half the sample points and be marked
 *   wrong. It is taught on the slides and asked as a choice question instead.
 *   `int-parts-log` puts `ln x` into a typed answer, under `domain: 'positive'`,
 *   where the concern does not arise: the question is only posed for x > 0 and
 *   the probe never leaves it.
 *
 * - Definite integrals stay polynomial. Their answers are numbers, and the
 *   whole-number results come from choosing the coefficient as a multiple of
 *   the new index rather than from rounding anything.
 */
import type { ChoiceOption, Generator, KeypadKey, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS, EXP_KEYS, TRIG_KEYS, ROOT_KEYS, termTex, termAnswer, sumTex, sumAnswer } from './calculus';
import { bin, num, pow, valueOf, type Expr } from '../expr';
import { markerWindow, plotSvg } from '../figures';
import { coeffTex, gcd } from './format';

/** The algebra keys plus the constant of integration. */
const INTEGRAL_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'C' }];
const EXP_INTEGRAL_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'C' }];
const TRIG_INTEGRAL_KEYS: KeypadKey[] = [...TRIG_KEYS, { insert: 'C' }];

/** A fraction in lowest terms, with the sign carried by the numerator. */
/** A coefficient written in front of a letter: nothing for 1, a bare minus for -1. */
const inFront = (c: string): string => (c === '1' ? '' : c === '-1' ? '-' : c);

function reduce(num: number, den: number): { n: number; d: number } {
  const sign = den < 0 ? -1 : 1;
  const g = gcd(Math.abs(num), Math.abs(den)) || 1;
  return { n: (sign * num) / g, d: (sign * den) / g };
}

/**
 * A term with a fractional coefficient, as it would be written by hand.
 *
 * Falls through to `termTex` whenever the fraction turns out to be a whole
 * number, so `\frac{4}{2}x` never reaches the learner.
 */
function fracTermTex(num: number, den: number, power: number): string {
  const { n, d } = reduce(num, den);
  if (d === 1) return termTex(n, power);
  const variable = power === 1 ? 'x' : `x^{${power}}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}${variable}`;
}

/** The same term for the grader, where the fraction can stay unevaluated. */
function fracTermAnswer(num: number, den: number, power: number): string {
  return `((${num})/(${den})) * x^(${power})`;
}

/** The integral sign around an integrand, with the dx the learner expects. */
function integralTex(integrand: string): string {
  return `\\int ${integrand} \\, dx`;
}

function definiteTex(integrand: string, lower: number, upper: number): string {
  return `\\int_{${lower}}^{${upper}} ${integrand} \\, dx`;
}

/** A signed number as it appears inside a bracket: "2x + 3", "2x - 3". */
function linearTex(a: number, b: number): string {
  return `${termTex(a, 1)} ${b < 0 ? '-' : '+'} ${Math.abs(b)}`;
}

function linearAnswer(a: number, b: number): string {
  return `(${a}) * x + (${b})`;
}

/** A non-zero integer in a range. */
function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/**
 * Choice options with no two rendering the same label.
 *
 * Distractors computed arithmetically can collide with each other: for a split
 * integral, `first - second` equals `first * second` whenever second is 2 and
 * first is -2, and the slide then offers the same number twice. The correct
 * option is passed first so it always survives the de-duplication.
 */
function distinctOptions<T extends { label: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.label)) return false;
    seen.add(option.label);
    return true;
  });
}

/* ---------- Level 1: reversing differentiation ---------- */

interface FamilyParams {
  power: number;
  coefficient: number;
  up: number;
  down: number;
}

/**
 * The constant of integration, asked as an odd-one-out.
 *
 * Three of the four options differ only by a constant, so they share a
 * derivative; the fourth has a different coefficient. Picking it is the same
 * skill as knowing why "+ C" is there, without asking the learner to reason
 * about a question with four correct answers.
 */
const antiderivativeFamily: Generator<FamilyParams> = {
  id: 'int-antiderivative-family',
  sample: (rng, difficulty) => ({
    power: rng.int(1, difficulty > 1 ? 6 : 4),
    coefficient: rng.int(1, 6),
    up: rng.int(2, 9),
    down: rng.int(2, 9),
  }),
  render: ({ power, coefficient, up, down }) => {
    const n = power + 1;
    const base = termTex(coefficient, n);
    const options = [
      { id: 'base', label: base, tex: true },
      { id: 'plus', label: `${base} + ${up}`, tex: true },
      { id: 'minus', label: `${base} - ${down}`, tex: true },
      { id: 'odd', label: termTex(coefficient + 1, n), tex: true },
    ];
    const turn = (power + coefficient + up) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: 'Three of these four functions have exactly the same derivative. Which is the odd one out?',
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'odd',
    };
  },
  solution: ({ power, coefficient, up, down }) => {
    const n = power + 1;
    return [
      {
        text: `Differentiating kills a constant term, so $${termTex(coefficient, n)}$, $${termTex(coefficient, n)} + ${up}$ and $${termTex(coefficient, n)} - ${down}$ all differentiate to the same thing.`,
      },
      { tex: `\\frac{d}{dx}\\left(${termTex(coefficient, n)} + k\\right) = ${termTex(coefficient * n, power)}` },
      {
        text: `Changing the coefficient is a different matter: $${termTex(coefficient + 1, n)}$ differentiates to $${termTex((coefficient + 1) * n, power)}$, which is not the same. That is the odd one out.`,
      },
      {
        text: 'This is exactly why an indefinite integral carries "+ C". Infinitely many functions share one derivative, differing only by a constant, and the integral names all of them at once.',
      },
    ];
  },
};

interface PowerParams {
  coefficient: number;
  power: number;
}

/**
 * Integrating a power of x.
 *
 * Difficulty 2 brings in negative indices, skipping -1 — that is the one case
 * the rule cannot reach, since it would divide by zero, and it is the reason
 * `ln|x|` has to be learned separately.
 */
const integratePower: Generator<PowerParams> = {
  id: 'int-power',
  // Dividing by the old index instead of the new one, and forgetting to divide
  // at all: the two slips the worked solution names.
  choices: ({ coefficient, power }) => {
    const n = power + 1;
    return options(
      { tex: `${fracTermTex(coefficient, n, n)} + C`, answer: fracTermAnswer(coefficient, n, n) },
      { tex: `${fracTermTex(coefficient, power, n)} + C`, answer: fracTermAnswer(coefficient, power, n) },
      { tex: `${termTex(coefficient, n)} + C`, answer: termAnswer(coefficient, n) },
      { tex: `${fracTermTex(coefficient, n, power)} + C`, answer: fracTermAnswer(coefficient, n, power) },
    );
  },
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const power = nonZero(rng.int(-7, -2), -3);
      return { coefficient: rng.int(1, 9), power };
    }
    return { coefficient: rng.int(1, 8), power: rng.int(1, 8) };
  },
  render: ({ coefficient, power }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Integrate.' }],
    lead: `${integralTex(termTex(coefficient, power))} =`,
    keypad: INTEGRAL_KEYS,
    answer: fracTermAnswer(coefficient, power + 1, power + 1),
    integrand: termAnswer(coefficient, power),
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: ({ coefficient, power }) => {
    const n = power + 1;
    return [
      {
        text: 'Integrating a power of $x$ reverses the power rule: add one to the index, then divide by the new index.',
      },
      { tex: `\\int x^{n} \\, dx = \\frac{x^{n + 1}}{n + 1} + C` },
      {
        tex: `${integralTex(termTex(coefficient, power))} = \\frac{${termTex(coefficient, n)}}{${n}} + C = ${fracTermTex(coefficient, n, n)} + C`,
      },
      {
        text:
          power < 0
            ? `A negative index is no obstacle — adding one to $${power}$ gives $${n}$ and the rule proceeds as usual. The single case it cannot handle is $x^{-1}$, where adding one gives zero and the division is impossible.`
            : 'Dividing by the *new* index is the step to get right. Dividing by the old one is the usual slip, and differentiating your answer back is the quickest way to catch it.',
      },
    ];
  },
};

interface SumParams {
  a: number;
  m: number;
  b: number;
  n: number;
}

/** Integrating term by term. */
const integrateSum: Generator<SumParams> = {
  id: 'int-sum',
  choices: ({ a, m, b, n }) =>
    options(
      {
        tex: `${sumTex([fracTermTex(a, m + 1, m + 1), fracTermTex(b, n + 1, n + 1)])} + C`,
        answer: sumAnswer([fracTermAnswer(a, m + 1, m + 1), fracTermAnswer(b, n + 1, n + 1)]),
      },
      {
        tex: `${sumTex([termTex(a, m + 1), termTex(b, n + 1)])} + C`,
        answer: sumAnswer([termAnswer(a, m + 1), termAnswer(b, n + 1)]),
      },
      {
        tex: `${sumTex([fracTermTex(a, m, m + 1), fracTermTex(b, n === 0 ? 1 : n, n + 1)])} + C`,
        answer: sumAnswer([fracTermAnswer(a, m, m + 1), fracTermAnswer(b, n === 0 ? 1 : n, n + 1)]),
      },
      {
        tex: `${sumTex([fracTermTex(a, m + 1, m + 1), termTex(b, n)])} + C`,
        answer: sumAnswer([fracTermAnswer(a, m + 1, m + 1), termAnswer(b, n)]),
      },
    ),
  sample: (rng, difficulty) => {
    const m = rng.int(2, difficulty > 1 ? 7 : 5);
    let n = rng.int(0, m - 1);
    if (n === m) n = 0;
    return {
      a: rng.int(1, difficulty > 1 ? 9 : 6) * (difficulty > 1 ? rng.sign() : 1),
      m,
      b: rng.int(1, difficulty > 1 ? 9 : 6) * (difficulty > 1 ? rng.sign() : 1),
      n,
    };
  },
  render: ({ a, m, b, n }) => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Integrate.' }],
    lead: `${integralTex(sumTex([termTex(a, m), termTex(b, n)]))} =`,
    keypad: INTEGRAL_KEYS,
    answer: sumAnswer([fracTermAnswer(a, m + 1, m + 1), fracTermAnswer(b, n + 1, n + 1)]),
    integrand: sumAnswer([termAnswer(a, m), termAnswer(b, n)]),
    domain: 'real',
    mode: 'upToConstant',
  }),
  solution: ({ a, m, b, n }) => [
    {
      text: 'An integral of a sum is the sum of the integrals, so the terms can be taken one at a time and a single $C$ covers the whole answer.',
    },
    { tex: `${integralTex(termTex(a, m))} = ${fracTermTex(a, m + 1, m + 1)}` },
    { tex: `${integralTex(termTex(b, n))} = ${fracTermTex(b, n + 1, n + 1)}` },
    {
      tex: `${integralTex(sumTex([termTex(a, m), termTex(b, n)]))} = ${sumTex([fracTermTex(a, m + 1, m + 1), fracTermTex(b, n + 1, n + 1)])} + C`,
    },
    {
      text:
        n === 0
          ? `A constant term integrates to a multiple of $x$, since $${b}$ is really $${b === 1 ? '' : b === -1 ? '-' : b}x^{0}$. Leaving it out altogether is the mistake to watch for.`
          : 'Each term keeps its own coefficient through the division. Only one constant of integration is needed no matter how many terms there are, because the sum of several constants is just another constant.',
    },
  ],
};

interface ExponentialParams {
  a: number;
  k: number;
}

/** Integrating a e^(kx). */
const integrateExponential: Generator<ExponentialParams> = {
  id: 'int-exponential',
  choices: ({ a, k }) => {
    const kx = termTex(k, 1);
    const co = (num: number, den: number) => fracTermTex(num, den, 0);
    return options(
      { tex: `${inFront(co(a, k))}e^{${kx}} + C`, answer: `((${a})/(${k})) * e^((${k}) * x)` },
      { tex: `${inFront(termTex(a, 0))}e^{${kx}} + C`, answer: `(${a}) * e^((${k}) * x)` },
      { tex: `${inFront(termTex(a * k, 0))}e^{${kx}} + C`, answer: `(${a * k}) * e^((${k}) * x)` },
      { tex: `${inFront(co(a, k))}e^{${termTex(k, 1)}} \\times x + C`, answer: `((${a})/(${k})) * x * e^((${k}) * x)` },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 9 : 6),
    k: nonZero(rng.int(-6, 6), 2) * (difficulty > 1 ? 1 : 1),
  }),
  render: ({ a, k }) => {
    const integrand = a === 1 ? `e^{${termTex(k, 1)}}` : `${a}e^{${termTex(k, 1)}}`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate.' }],
      lead: `${integralTex(integrand)} =`,
      keypad: EXP_INTEGRAL_KEYS,
      answer: `((${a})/(${k})) * e^((${k}) * x)`,
      integrand: `(${a}) * e^((${k}) * x)`,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ a, k }) => {
    const { n, d } = reduce(a, k);
    const coefficient = d === 1 ? `${n}` : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
    return [
      {
        text: `Differentiating $e^{${termTex(k, 1)}}$ multiplies it by $${k}$, by the chain rule. Integrating must therefore divide by $${k}$.`,
      },
      { tex: `\\int e^{kx} \\, dx = \\frac{e^{kx}}{k} + C` },
      { tex: `${integralTex(a === 1 ? `e^{${termTex(k, 1)}}` : `${a}e^{${termTex(k, 1)}}`)} = ${inFront(coefficient)}e^{${termTex(k, 1)}} + C` },
      {
        text: 'The exponential is the one function that survives both operations unchanged in shape — only the constant in front moves. Forgetting to divide by the $x$ coefficient is the error here, and differentiating the answer back catches it immediately.',
      },
    ];
  },
};

interface TrigParams {
  a: number;
  k: number;
  fn: 'sin' | 'cos';
}

/** Integrating a sin(kx) or a cos(kx). */
const integrateTrig: Generator<TrigParams> = {
  id: 'int-trig',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 9 : 6),
    k: rng.int(2, difficulty > 1 ? 9 : 6),
    fn: rng.pick(['sin', 'cos'] as const),
  }),
  render: ({ a, k, fn }) => {
    const integrand = `${a === 1 ? '' : a}\\${fn}\\left(${termTex(k, 1)}\\right)`;
    const other = fn === 'sin' ? 'cos' : 'sin';
    const sign = fn === 'sin' ? '-' : '';
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate.' }],
      lead: `${integralTex(integrand)} =`,
      keypad: TRIG_INTEGRAL_KEYS,
      answer: `${sign}((${a})/(${k})) * ${other}((${k}) * x)`,
      integrand: `(${a}) * ${fn}((${k}) * x)`,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ a, k, fn }) => {
    const { n, d } = reduce(a, k);
    const size = d === 1 ? `${n}` : `\\frac{${n}}{${d}}`;
    const other = fn === 'sin' ? 'cos' : 'sin';
    const sign = fn === 'sin' ? '-' : '';
    return [
      {
        text: 'The two standard results are worth committing to memory, signs included.',
      },
      { tex: '\\int \\sin(kx) \\, dx = -\\frac{\\cos(kx)}{k} + C' },
      { tex: '\\int \\cos(kx) \\, dx = \\frac{\\sin(kx)}{k} + C' },
      {
        tex: `${integralTex(`${a === 1 ? '' : a}\\${fn}\\left(${termTex(k, 1)}\\right)`)} = ${sign}${inFront(size)}\\${other}\\left(${termTex(k, 1)}\\right) + C`,
      },
      {
        text:
          fn === 'sin'
            ? 'Integrating sine picks up a minus sign; integrating cosine does not. That asymmetry is the one thing to remember here, and it is the reverse of the derivative pair, where cosine is the one that gains the minus.'
            : 'Integrating cosine keeps its sign, while integrating sine gains a minus. Check by differentiating: the derivative of sine is cosine, with no sign change, so the integral runs back the same way.',
      },
    ];
  },
};

/* ---------- Level 2: definite integrals and area ---------- */

interface DefinitePowerParams {
  /** Coefficient, always a multiple of power + 1 so the result is a whole number. */
  multiple: number;
  power: number;
  lower: number;
  upper: number;
}

/** A definite integral of a single power. */
const definitePower: Generator<DefinitePowerParams> = {
  id: 'int-definite-power',
  choices: ({ multiple, power, lower, upper }) => {
    const n = power + 1;
    const at = (t: number) => multiple * Math.pow(t, n);
    const value = at(upper) - at(lower);
    return options(
      { tex: `${value}`, answer: `${value}` },
      { tex: `${-value}`, answer: `${-value}` },
      { tex: `${at(upper)}`, answer: `${at(upper)}` },
      { tex: `${at(upper) + at(lower)}`, answer: `${at(upper) + at(lower)}` },
    );
  },
  sample: (rng, difficulty) => {
    const lower = rng.int(0, difficulty > 1 ? 3 : 2);
    return {
      multiple: rng.int(1, difficulty > 1 ? 7 : 5),
      power: rng.int(1, difficulty > 1 ? 5 : 4),
      lower,
      upper: lower + rng.int(1, 4),
    };
  },
  render: ({ multiple, power, lower, upper }) => {
    const n = power + 1;
    const coefficient = multiple * n;
    const value = multiple * (Math.pow(upper, n) - Math.pow(lower, n));
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
      lead: `${definiteTex(termTex(coefficient, power), lower, upper)} =`,
      keypad: [],
      answer: `${value}`,
      integrand: termAnswer(coefficient, power),
      limits: [lower, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ multiple, power, lower, upper }) => {
    const n = power + 1;
    const coefficient = multiple * n;
    const at = (t: number) => multiple * Math.pow(t, n);
    return [
      {
        text: 'Integrate first, ignoring the limits, then substitute the upper limit and the lower limit and subtract.',
      },
      { tex: `\\int ${termTex(coefficient, power)} \\, dx = ${termTex(multiple, n)}` },
      {
        tex: `\\left[${termTex(multiple, n)}\\right]_{${lower}}^{${upper}} = ${at(upper)} - ${at(lower)} = ${at(upper) - at(lower)}`,
      },
      {
        text: 'No constant of integration appears, and that is not an oversight: whatever $C$ might be, it is added at the top and subtracted at the bottom, so it cancels. Definite integrals never need it.',
      },
      {
        text: `Upper minus lower, in that order. Reversing them gives $${at(lower) - at(upper)}$ — the right size with the wrong sign, which is the most common error here.`,
      },
    ];
  },
};

/** Four whole-number bank entries: the correct value, then near ones, padded to stay distinct. */
function bank4(correct: number, ...near: number[]): string[] {
  const seen = new Set<number>([correct]);
  const out = [correct];
  for (const value of near) {
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  // Pad from just beside the answer rather than at random, so a learner cannot
  // find the right one by spotting it as the odd number out.
  for (let step = 1; out.length < 4; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (out.length >= 4) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.map(String);
}

interface DefiniteStepsParams {
  coefficient: number;
  power: number;
  lower: number;
  upper: number;
}

/**
 * Evaluating a definite integral once the antiderivative F is already known:
 * substitute the two limits and subtract, one piece at a time.
 *
 * Built as a tree of powers and products subtracted, rather than as a typed
 * expression, because the skill being isolated here is arithmetic, not
 * calculus — the antiderivative is handed over already integrated, so nothing
 * about integration is being tested. What is being tested is the substitution
 * itself, and in particular the subtraction at the end: `lower` may be
 * negative, which makes `F(lower)` itself negative, and "upper minus a
 * negative" is exactly where the sign gets dropped. No existing question
 * isolates that single step — `int-definite-power` asks it as one typed
 * answer, with the power, the multiplication and the subtraction all bundled
 * together.
 *
 * The tree mirrors the order a learner should actually work in: the power
 * first (`upper^power`, `lower^power`), then each multiplication by the
 * coefficient, then the final subtraction — exactly the order `isReducible`
 * enforces, since a multiplication needs its power already resolved and the
 * subtraction needs both multiplications done.
 */
const definiteSteps: Generator<DefiniteStepsParams> = {
  id: 'int-definite-steps',
  sample: (rng, difficulty) => {
    const power = difficulty > 1 ? rng.pick([2, 3, 4]) : rng.pick([2, 3]);
    const coefficient = rng.int(1, difficulty > 1 ? 6 : 4);
    const lower = difficulty > 1 ? nonZero(rng.int(-5, 4), -2) : nonZero(rng.int(-3, 3), -1);
    const upper = lower + rng.int(1, difficulty > 1 ? 5 : 4);
    return { coefficient, power, lower, upper };
  },
  /**
   * The no-working form: four whole-number totals, the three distractors
   * being the slips real working produces — reading the subtraction as an
   * addition (which is what happens when the dropped lower term is itself
   * negative), subtracting the wrong way round, and dropping the lower term
   * altogether. Padded exactly as `quad-discriminant-steps` pads, since these
   * collide for some draws (a lower limit of 0 makes its own term vanish, so
   * "add it" and "drop it" are the same thing).
   */
  choices: ({ coefficient, power, lower, upper }) => {
    const upperTerm = coefficient * Math.pow(upper, power);
    const lowerTerm = coefficient * Math.pow(lower, power);
    const correct = upperTerm - lowerTerm;

    const wrong = [upperTerm + lowerTerm, lowerTerm - upperTerm, upperTerm];
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
      { tex: `${correct}`, answer: `${correct}` },
      ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}`, answer: `${value}` })),
    );
  },
  render: ({ coefficient, power, lower, upper }): Slide => {
    const expr = bin(
      '-',
      bin('*', num(coefficient), pow(num(upper), num(power))),
      bin('*', num(coefficient), pow(num(lower), num(power))),
    );

    const upperPow = Math.pow(upper, power);
    const lowerPow = Math.pow(lower, power);
    const upperTerm = coefficient * upperPow;
    const lowerTerm = coefficient * lowerPow;

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: 'The antiderivative is already known. Substitute the two limits and subtract, one piece at a time. Tap the part you would do **next**, then choose what it comes to.',
        },
        { kind: 'display', tex: `\\left[${termTex(coefficient, power)}\\right]_{${lower}}^{${upper}}` },
      ],
      expr,
      banks: {
        // upper^power: multiplying by the power instead of raising to it,
        // forgetting to raise it at all, and raising it one power too far.
        'r.l.r': bank4(upperPow, power * upper, upper, Math.pow(upper, power + 1)),
        // lower^power, the same three slips against the lower limit.
        'r.r.r': bank4(lowerPow, power * lower, lower, Math.pow(lower, power + 1)),
        // coefficient x upper^power: forgetting the coefficient, adding it
        // instead of multiplying, and multiplying the coefficient by the
        // limit rather than by the limit's power.
        'r.l': bank4(upperTerm, upperPow, coefficient + upperPow, coefficient * upper),
        'r.r': bank4(lowerTerm, lowerPow, coefficient + lowerPow, coefficient * lower),
        // The final subtraction: reading it as addition, subtracting the
        // wrong way round, and dropping the lower term altogether.
        r: bank4(upperTerm - lowerTerm, upperTerm + lowerTerm, lowerTerm - upperTerm, upperTerm),
      },
    };
  },
  solution: ({ coefficient, power, lower, upper }) => {
    const upperPow = Math.pow(upper, power);
    const lowerPow = Math.pow(lower, power);
    const upperTerm = coefficient * upperPow;
    const lowerTerm = coefficient * lowerPow;
    const total = upperTerm - lowerTerm;
    return [
      {
        text: 'Substitute the upper limit into the antiderivative, then the lower limit, before subtracting anything.',
      },
      {
        tex: `\\left[${termTex(coefficient, power)}\\right]_{${lower}}^{${upper}} = ${termTex(coefficient, power).replace(/x/, `\\left(${upper}\\right)`)} - ${termTex(coefficient, power).replace(/x/, `\\left(${lower}\\right)`)}`,
      },
      { tex: `= ${upperTerm} - \\left(${lowerTerm}\\right) = ${total}` },
      {
        text:
          lowerTerm < 0
            ? `The lower value comes out negative here, so the subtraction becomes "minus a negative" — the value at the lower limit is added back on rather than taken away. Dropping that bracket is exactly how the sign gets lost.`
            : 'Bracket the lower value before subtracting it. It costs nothing when the value is positive and saves the sign when it is not.',
      },
      {
        text: `Reversing the order gives $${lowerTerm} - \\left(${upperTerm}\\right) = ${lowerTerm - upperTerm}$ — the right size with the wrong sign, and the most common slip in this step.`,
      },
    ];
  },
};

interface DefiniteLineParams {
  /** Always even, so halving the square term leaves a whole number. */
  slope: number;
  intercept: number;
  lower: number;
  upper: number;
}

/** A definite integral of a straight line, which may well come out negative. */
const definiteLine: Generator<DefiniteLineParams> = {
  id: 'int-definite-sum',
  // Unlike the other definite integrals this one can evaluate to zero, and
  // then every distractor built by negating or halving it collapses onto the
  // answer and the slide is left with one option. The last two are offset by
  // sampled values that are never zero, so at least one distractor always
  // survives whatever the integral comes to.
  choices: ({ slope, intercept, lower, upper }) => {
    const at = (t: number) => (slope * t * t) / 2 + intercept * t;
    const value = at(upper) - at(lower);
    return options(
      { tex: `${value}`, answer: `${value}` },
      { tex: `${-value}`, answer: `${-value}` },
      { tex: `${at(upper)}`, answer: `${at(upper)}` },
      { tex: `${value + slope}`, answer: `${value + slope}` },
      { tex: `${value - intercept}`, answer: `${value - intercept}` },
    );
  },
  sample: (rng, difficulty) => {
    const lower = rng.int(difficulty > 1 ? -3 : -1, 2);
    return {
      slope: rng.int(1, difficulty > 1 ? 5 : 4) * 2 * (difficulty > 1 ? rng.sign() : 1),
      intercept: nonZero(rng.int(-6, 6), 3),
      lower,
      upper: lower + rng.int(1, 4),
    };
  },
  render: ({ slope, intercept, lower, upper }) => {
    const at = (t: number) => (slope * t * t) / 2 + intercept * t;
    const value = at(upper) - at(lower);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Evaluate. The answer is a whole number, and it may be negative.' },
      ],
      lead: `${definiteTex(linearTex(slope, intercept), lower, upper)} =`,
      keypad: [],
      answer: `${value}`,
      integrand: linearAnswer(slope, intercept),
      limits: [lower, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ slope, intercept, lower, upper }) => {
    const half = slope / 2;
    const at = (t: number) => half * t * t + intercept * t;
    return [
      { text: 'Integrate term by term, then substitute the two limits and subtract.' },
      {
        tex: `\\int ${linearTex(slope, intercept)} \\, dx = ${sumTex([termTex(half, 2), termTex(intercept, 1)])}`,
      },
      {
        tex: `\\left[${sumTex([termTex(half, 2), termTex(intercept, 1)])}\\right]_{${lower}}^{${upper}} = ${at(upper)} - \\left(${at(lower)}\\right) = ${at(upper) - at(lower)}`,
      },
      {
        text: 'Bracket the lower value before subtracting it. When it is negative, subtracting without the bracket flips a sign and the answer comes out wrong by twice that amount.',
      },
      {
        text: `A negative result is perfectly legitimate — it means the line spent more of the interval below the axis than above it. It is a signed total, not a measurement.`,
      },
    ];
  },
};

interface AreaParams {
  multiple: number;
  power: number;
  upper: number;
}

/** Area under a curve, from the origin. */
const areaUnder: Generator<AreaParams> = {
  id: 'int-area-under',
  choices: ({ multiple, power, upper }) => {
    const n = power + 1;
    const value = multiple * Math.pow(upper, n);
    return options(
      { tex: `${value}`, answer: `${value}` },
      { tex: `${multiple * n * Math.pow(upper, power)}`, answer: `${multiple * n * Math.pow(upper, power)}` },
      { tex: `${value * n}`, answer: `${value * n}` },
      { tex: `${-value}`, answer: `${-value}` },
    );
  },
  sample: (rng, difficulty) => ({
    multiple: rng.int(1, difficulty > 1 ? 6 : 4),
    power: rng.int(1, difficulty > 1 ? 4 : 3),
    upper: rng.int(2, difficulty > 1 ? 6 : 5),
  }),
  render: ({ multiple, power, upper }) => {
    const n = power + 1;
    const coefficient = multiple * n;
    const value = multiple * Math.pow(upper, n);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the area between the curve $y = ${termTex(coefficient, power)}$, the $x$-axis, and the lines $x = 0$ and $x = ${upper}$.`,
        },
      ],
      lead: '\\text{area} =',
      keypad: [],
      answer: `${value}`,
      integrand: termAnswer(coefficient, power),
      limits: [0, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ multiple, power, upper }) => {
    const n = power + 1;
    const coefficient = multiple * n;
    return [
      {
        text: 'Area under a curve is a definite integral between the two $x$ values bounding it.',
      },
      { tex: `\\text{area} = \\int_{0}^{${upper}} ${termTex(coefficient, power)} \\, dx` },
      {
        tex: `\\left[${termTex(multiple, n)}\\right]_{0}^{${upper}} = ${multiple * Math.pow(upper, n)} - 0 = ${multiple * Math.pow(upper, n)}`,
      },
      {
        text: `The lower limit is 0 here and the term vanishes, which makes the arithmetic short — but write the subtraction down anyway. It is not always zero, and the habit of skipping it is what loses the mark when the lower limit moves.`,
      },
    ];
  },
};

interface PropertyParams {
  form: 'reverse' | 'split';
  lower: number;
  middle: number;
  upper: number;
  first: number;
  second: number;
}

/** The two properties that follow straight from "upper minus lower". */
const integralProperties: Generator<PropertyParams> = {
  id: 'int-properties',
  sample: (rng, difficulty) => {
    const lower = rng.int(0, 4);
    const middle = lower + rng.int(1, 3);
    return {
      form: difficulty > 1 ? rng.pick(['reverse', 'split'] as const) : 'reverse',
      lower,
      middle,
      upper: middle + rng.int(1, 3),
      first: rng.int(2, 14) * rng.sign(),
      second: rng.int(2, 14) * rng.sign(),
    };
  },
  render: ({ form, lower, middle, upper, first, second }): Slide => {
    if (form === 'reverse') {
      const options = distinctOptions([
        { id: 'negated', label: `${-first}`, tex: true },
        { id: 'same', label: `${first}`, tex: true },
        { id: 'zero', label: '0', tex: true },
        { id: 'doubled', label: `${2 * first}`, tex: true },
      ]);
      const turn = (lower + Math.abs(first)) % options.length;
      return {
        kind: 'choice',
        prompt: [
          {
            kind: 'prose',
            text: `Given that $\\int_{${lower}}^{${upper}} f(x) \\, dx = ${first}$, what is $\\int_{${upper}}^{${lower}} f(x) \\, dx$?`,
          },
        ],
        options: [...options.slice(turn), ...options.slice(0, turn)],
        correctId: 'negated',
      };
    }
    const options = distinctOptions([
      { id: 'sum', label: `${first + second}`, tex: true },
      { id: 'difference', label: `${first - second}`, tex: true },
      { id: 'product', label: `${first * second}`, tex: true },
      { id: 'first-only', label: `${first}`, tex: true },
    ]);
    const turn = (middle + Math.abs(second)) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Given that $\\int_{${lower}}^{${middle}} f(x) \\, dx = ${first}$ and $\\int_{${middle}}^{${upper}} f(x) \\, dx = ${second}$, what is $\\int_{${lower}}^{${upper}} f(x) \\, dx$?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'sum',
    };
  },
  solution: ({ form, lower, middle, upper, first, second }) =>
    form === 'reverse'
      ? [
          {
            text: 'A definite integral is the antiderivative at the top minus the antiderivative at the bottom. Swapping the limits swaps which is subtracted from which, so the sign flips and nothing else changes.',
          },
          { tex: `\\int_{a}^{b} f(x) \\, dx = -\\int_{b}^{a} f(x) \\, dx` },
          { tex: `\\int_{${upper}}^{${lower}} f(x) \\, dx = ${-first}` },
          {
            text: 'One consequence is worth noticing: an integral from a point to itself is zero, because it is its own negative.',
          },
        ]
      : [
          {
            text: `Integrating from $${lower}$ to $${middle}$ and then from $${middle}$ to $${upper}$ covers the whole interval exactly once, so the two results add.`,
          },
          { tex: `\\int_{a}^{b} f + \\int_{b}^{c} f = \\int_{a}^{c} f` },
          { tex: `${first} + \\left(${second}\\right) = ${first + second}` },
          {
            text: 'It works even when the middle point lies outside the interval, because of the sign rule for reversed limits — which is the real reason this property is stated so generally.',
          },
        ],
};

interface BelowAxisParams {
  scale: number;
  /** Even, so halving the square term leaves a whole number. */
  root: number;
}

/** Signed integral versus actual area, where the curve is below the axis. */
const areaBelowAxis: Generator<BelowAxisParams> = {
  id: 'int-signed-area',
  sample: (rng, difficulty) => ({
    scale: rng.int(1, difficulty > 1 ? 6 : 5),
    root: rng.int(1, difficulty > 1 ? 7 : 6) * 2,
  }),
  render: ({ scale, root }) => {
    const area = (scale * root * root) / 2;
    const options = distinctOptions([
      { id: 'area', label: `${area}`, tex: true },
      { id: 'signed', label: `${-area}`, tex: true },
      { id: 'zero', label: '0', tex: true },
      { id: 'doubled', label: `${2 * area}`, tex: true },
    ]);
    const turn = (scale + root) % options.length;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Between $x = 0$ and $x = ${root}$ the line $y = ${scale === 1 ? '' : scale}\\left(x - ${root}\\right)$ lies below the $x$-axis, and $\\int_{0}^{${root}} ${scale === 1 ? '' : scale}\\left(x - ${root}\\right) \\, dx = ${-area}$. What is the area enclosed between the line and the axis?`,
        },
      ],
      options: [...options.slice(turn), ...options.slice(0, turn)],
      correctId: 'area',
    };
  },
  solution: ({ scale, root }) => {
    const area = (scale * root * root) / 2;
    return [
      {
        text: 'An integral is a *signed* total. Where the curve sits below the axis the contribution is negative, so the integral and the area disagree in sign.',
      },
      { tex: `\\int_{0}^{${root}} ${scale === 1 ? '' : scale}\\left(x - ${root}\\right) \\, dx = ${-area}` },
      {
        text: `Area is a measurement and cannot be negative, so the area here is $${area}$. Take the size of the integral and discard the sign.`,
      },
      {
        text: 'This is why a curve crossing the axis has to be split at the crossing point. Integrating straight through lets the positive and negative parts cancel, and the result is neither the area nor anything much use.',
      },
    ];
  },
};

/* ---------- Level 3: techniques ---------- */

interface BracketParams {
  a: number;
  b: number;
  power: number;
}

/** Integrating (ax + b)^n, the reverse chain rule in its simplest form. */
const linearBracket: Generator<BracketParams> = {
  id: 'int-linear-bracket',
  choices: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(${linearTex(a, b)}\\right)`;
    return options(
      { tex: `\\frac{${bracket}^{${n}}}{${a * n}} + C`, answer: `(${linearAnswer(a, b)})^(${n}) / (${a * n})` },
      { tex: `\\frac{${bracket}^{${n}}}{${n}} + C`, answer: `(${linearAnswer(a, b)})^(${n}) / (${n})` },
      { tex: `\\frac{${bracket}^{${n}}}{${a}} + C`, answer: `(${linearAnswer(a, b)})^(${n}) / (${a})` },
      { tex: `${bracket}^{${n}} + C`, answer: `(${linearAnswer(a, b)})^(${n})` },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 6 : 5),
    b: nonZero(rng.int(-6, 6), 4),
    power: rng.int(2, difficulty > 1 ? 7 : 5),
  }),
  render: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(${linearTex(a, b)}\\right)`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate.' }],
      lead: `${integralTex(`${bracket}^{${power}}`)} =`,
      keypad: INTEGRAL_KEYS,
      answer: `(${linearAnswer(a, b)})^(${n}) / ((${a}) * (${n}))`,
      integrand: `(${linearAnswer(a, b)})^(${power})`,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(${linearTex(a, b)}\\right)`;
    return [
      {
        text: 'Treat the bracket as a single object: raise the index by one and divide by the new index, exactly as for a power of $x$.',
      },
      { tex: `${integralTex(`${bracket}^{${power}}`)} = \\frac{${bracket}^{${n}}}{${n}} \\times \\frac{1}{${a}} + C` },
      { tex: `= \\frac{${bracket}^{${n}}}{${a * n}} + C` },
      {
        text: `Then divide again by $${a}$, the coefficient of $x$ inside the bracket. Differentiating the answer shows why: the chain rule would produce a factor of $${a}$, so the integral has to cancel it in advance.`,
      },
      {
        text: 'Missing that second division is the characteristic error. It only disappears when the coefficient is 1, which is exactly why questions with a coefficient of 1 fail to reveal whether the method is understood.',
      },
    ];
  },
};

interface SubstitutionParams {
  a: number;
  b: number;
  power: number;
}

/** Integration by substitution, in the form a x (x^2 + b)^n. */
const substitution: Generator<SubstitutionParams> = {
  id: 'int-substitution',
  choices: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
    const inner = `(x^2 + (${b}))`;
    return options(
      { tex: `${inFront(fracTermTex(a, 2 * n, 0))}${bracket}^{${n}} + C`, answer: `((${a})/(2 * (${n}))) * ${inner}^(${n})` },
      { tex: `${inFront(fracTermTex(a, n, 0))}${bracket}^{${n}} + C`, answer: `((${a})/(${n})) * ${inner}^(${n})` },
      { tex: `${inFront(fracTermTex(a, 2, 0))}${bracket}^{${n}} + C`, answer: `((${a})/2) * ${inner}^(${n})` },
      { tex: `${inFront(fracTermTex(a, 2 * n, 0))}${bracket}^{${power}} + C`, answer: `((${a})/(2 * (${n}))) * ${inner}^(${power})` },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 6),
    b: nonZero(rng.int(difficulty > 1 ? -5 : 1, 6), 2),
    power: rng.int(2, difficulty > 1 ? 7 : 5),
  }),
  render: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Integrate, using the substitution $u = x^{2} + c$.' },
      ],
      lead: `${integralTex(`${termTex(a, 1)}${bracket}^{${power}}`)} =`,
      keypad: INTEGRAL_KEYS,
      answer: `((${a})/(2 * (${n}))) * (x^2 + (${b}))^(${n})`,
      integrand: `(${a}) * x * (x^2 + (${b}))^(${power})`,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ a, b, power }) => {
    const n = power + 1;
    const bracket = `\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
    const { n: cn, d: cd } = reduce(a, 2 * n);
    const coefficient = cd === 1 ? `${cn}` : `\\frac{${cn}}{${cd}}`;
    return [
      {
        text: `Put $u = x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$. Then $\\frac{du}{dx} = 2x$, so $${termTex(a, 1)} \\, dx$ becomes $\\frac{${a}}{2} \\, du$.`,
      },
      { tex: `${integralTex(`${termTex(a, 1)}${bracket}^{${power}}`)} = \\frac{${a}}{2}\\int u^{${power}} \\, du` },
      { tex: `= \\frac{${a}}{2} \\times \\frac{u^{${n}}}{${n}} = ${inFront(coefficient)}u^{${n}}` },
      { tex: `= ${inFront(coefficient)}${bracket}^{${n}} + C` },
      {
        text: 'The substitution works because the $x$ outside the bracket is, up to a constant, the derivative of what is inside. Spotting that pairing is the whole skill — without it the substitution leaves a stray $x$ behind and nothing has been gained.',
      },
      {
        text: 'Always convert back to $x$ at the end. An answer left in terms of $u$ is an answer to a different question.',
      },
    ];
  },
};

interface PartsParams {
  a: number;
  k: number;
  form: 'exp' | 'sin' | 'cos';
}

/** Integration by parts, for x times an exponential or a trigonometric function. */
const byParts: Generator<PartsParams> = {
  id: 'int-by-parts',
  choices: ({ a, k, form }) => {
    const kx = termTex(k, 1);
    const sq = k * k;
    const inner = `(${k}) * x`;
    // The number in front, with no 1 written; and kx added or taken away with
    // one sign, so a negative k reads "+ 5x" rather than "- -5x".
    const A = inFront(`${a}`);
    const withKx = (sign: '+' | '-') => (k < 0 ? `${sign === '-' ? '+' : '-'} ${termTex(-k, 1)}` : `${sign} ${kx}`);
    if (form === 'exp') {
      return options(
        { tex: `\\frac{${A}e^{${kx}}\\left(${kx} - 1\\right)}{${sq}} + C`, answer: `((${a})/((${k})^2)) * e^(${inner}) * ((${k}) * x - 1)` },
        { tex: `\\frac{${A}e^{${kx}}\\left(${kx} + 1\\right)}{${sq}} + C`, answer: `((${a})/((${k})^2)) * e^(${inner}) * ((${k}) * x + 1)` },
        { tex: `\\frac{${A}xe^{${kx}}}{${k}} + C`, answer: `((${a})/(${k})) * x * e^(${inner})` },
        // Choosing u the other way round, which the worked solution warns about.
        { tex: `\\frac{${A}x^{2}e^{${kx}}}{2} + C`, answer: `((${a})/2) * x^2 * e^(${inner})` },
        // Only a slip when there is something to divide by: at |k| = 1 this is
        // the correct answer, not a distractor.
        ...(Math.abs(k) === 1
          ? []
          : [{ tex: `${A}e^{${kx}}\\left(${kx} - 1\\right) + C`, answer: `(${a}) * e^(${inner}) * ((${k}) * x - 1)` }]),
      );
    }
    const fn = form;
    const other = form === 'sin' ? 'cos' : 'sin';
    const sign = form === 'sin' ? '-' : '+';
    return options(
      {
        tex: `\\frac{${A}\\left(\\${fn}\\left(${kx}\\right) ${withKx(sign)}\\${other}\\left(${kx}\\right)\\right)}{${sq}} + C`,
        answer:
          form === 'sin'
            ? `((${a})/((${k})^2)) * (sin(${inner}) - (${k}) * x * cos(${inner}))`
            : `((${a})/((${k})^2)) * (cos(${inner}) + (${k}) * x * sin(${inner}))`,
      },
      {
        tex: `\\frac{${A}\\left(\\${fn}\\left(${kx}\\right) ${withKx(sign === '-' ? '+' : '-')}\\${other}\\left(${kx}\\right)\\right)}{${sq}} + C`,
        answer:
          form === 'sin'
            ? `((${a})/((${k})^2)) * (sin(${inner}) + (${k}) * x * cos(${inner}))`
            : `((${a})/((${k})^2)) * (cos(${inner}) - (${k}) * x * sin(${inner}))`,
      },
      {
        tex: `\\frac{${A}x\\${other}\\left(${kx}\\right)}{${k}} + C`,
        answer: `((${a})/(${k})) * x * ${other}(${inner})`,
      },
      {
        tex: `${A}\\${fn}\\left(${kx}\\right) + C`,
        answer: `(${a}) * ${fn}(${inner})`,
      },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 6 : 6),
    k: nonZero(rng.int(difficulty > 1 ? -5 : 2, difficulty > 1 ? 5 : 7), 3),
    form: difficulty > 1 ? rng.pick(['exp', 'sin', 'cos'] as const) : 'exp',
  }),
  render: ({ a, k, form }) => {
    const kx = termTex(k, 1);
    const factor = form === 'exp' ? `e^{${kx}}` : `\\${form}\\left(${kx}\\right)`;
    const inner = `(${k}) * x`;
    // Checked by differentiating: each is the standard one-step parts result.
    const answer =
      form === 'exp'
        ? `((${a})/((${k})^2)) * e^(${inner}) * ((${k}) * x - 1)`
        : form === 'sin'
          ? `((${a})/((${k})^2)) * (sin(${inner}) - (${k}) * x * cos(${inner}))`
          : `((${a})/((${k})^2)) * (cos(${inner}) + (${k}) * x * sin(${inner}))`;
    const integrand =
      form === 'exp'
        ? `(${a}) * x * e^(${inner})`
        : `(${a}) * x * ${form}(${inner})`;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate by parts.' }],
      lead: `${integralTex(`${a === 1 ? '' : a}x${factor}`)} =`,
      keypad: form === 'exp' ? EXP_INTEGRAL_KEYS : TRIG_INTEGRAL_KEYS,
      answer,
      integrand,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ a, k, form }) => {
    const kx = termTex(k, 1);
    const factor = form === 'exp' ? `e^{${kx}}` : `\\${form}\\left(${kx}\\right)`;
    const antiderivative =
      form === 'exp'
        ? `\\frac{e^{${kx}}}{${k}}`
        : form === 'sin'
          ? `-\\frac{\\cos\\left(${kx}\\right)}{${k}}`
          : `\\frac{\\sin\\left(${kx}\\right)}{${k}}`;
    return [
      {
        text: 'By parts trades one integral for another, and the trade is only worth making if the new one is easier.',
      },
      { tex: '\\int u \\frac{dv}{dx} \\, dx = uv - \\int v \\frac{du}{dx} \\, dx' },
      {
        text: `Choose $u = ${a === 1 ? 'x' : `${a}x`}$ and $\\frac{dv}{dx} = ${factor}$. Differentiating $u$ turns it into a constant, which is what makes the second integral simpler than the first.`,
      },
      { tex: `u = ${a === 1 ? 'x' : `${a}x`} \\quad v = ${antiderivative}` },
      {
        text: `Substituting into the formula leaves an integral of ${form === 'exp' ? 'an exponential' : 'a trigonometric function'} with no $x$ in front, which is a standard result.`,
      },
      {
        text: 'Choosing $u$ the other way round is the mistake worth avoiding: it makes the new integral harder than the original, and the method then runs forever.',
      },
    ];
  },
};

/* ---------- Choosing a method ---------- */

interface MethodParams {
  route: 'standard' | 'bracket' | 'substitution' | 'parts';
  /** Which standard result, when `route === 'standard'`. */
  kind: 'power' | 'exp' | 'sin' | 'cos';
  /** Which factor accompanies $x$, when `route === 'parts'`. */
  form: 'exp' | 'sin' | 'cos';
  a: number;
  b: number;
  power: number;
}

/**
 * Which technique does this integral call for?
 *
 * Every other generator in this course asks the learner to *run* a technique
 * after being told which one applies. Recognising which one a fresh integrand
 * needs is the skill the rest of the course assumes and none of it tests —
 * a `choice` slide asking "which method?" would be a one-in-four guess.
 * Walking the tree makes the learner commit to a reason at each fork: is it
 * a standard result outright; a linear bracket that only needs adjusting for;
 * an inner function whose derivative is already sitting in the integrand, so
 * substitution applies; or, failing all of that, a product of two unrelated
 * things, which is what by parts is for.
 *
 * The four routes are ordered by how little work they are, which is the order
 * worth building as a habit: recognise it on sight before reaching for either
 * technique.
 */
const chooseMethod: Generator<MethodParams> = {
  id: 'int-choose-method',
  sample: (rng, difficulty) => {
    const route = rng.pick(['standard', 'bracket', 'substitution', 'parts'] as const);
    if (route === 'standard') {
      const kind = rng.pick(['power', 'exp', 'sin', 'cos'] as const);
      if (kind === 'power') {
        return {
          route,
          kind,
          form: 'exp' as const,
          a: rng.int(1, 9),
          b: 0,
          power: rng.int(1, difficulty > 1 ? 8 : 5),
        };
      }
      if (kind === 'exp') {
        return {
          route,
          kind,
          form: 'exp' as const,
          a: rng.int(1, 9),
          b: nonZero(rng.int(-6, 6), 2),
          power: 0,
        };
      }
      // sin or cos, with a coefficient of x inside.
      return {
        route,
        kind,
        form: 'exp' as const,
        a: rng.int(1, 9),
        b: rng.int(2, difficulty > 1 ? 9 : 6),
        power: 0,
      };
    }
    if (route === 'bracket') {
      // A coefficient of at least 2 inside the bracket, so the second
      // division — the one the tree is asking about — is never invisible.
      return {
        route,
        kind: 'power' as const,
        form: 'exp' as const,
        a: rng.int(2, difficulty > 1 ? 7 : 5),
        b: nonZero(rng.int(-6, 6), 4),
        power: rng.int(2, difficulty > 1 ? 7 : 5),
      };
    }
    if (route === 'substitution') {
      // a * x * (x^2 + b)^n: the x outside is, up to a constant, the
      // derivative of the bracket inside.
      return {
        route,
        kind: 'power' as const,
        form: 'exp' as const,
        a: rng.int(2, difficulty > 1 ? 9 : 6),
        b: nonZero(rng.int(difficulty > 1 ? -5 : 1, 6), 2),
        power: rng.int(2, difficulty > 1 ? 7 : 5),
      };
    }
    // parts: x times an exponential or trig function, neither the
    // derivative of the other.
    const form = rng.pick(['exp', 'sin', 'cos'] as const);
    return {
      route,
      kind: 'power' as const,
      form,
      a: rng.int(1, difficulty > 1 ? 6 : 4),
      b: nonZero(rng.int(difficulty > 1 ? -5 : 2, difficulty > 1 ? 5 : 7), 3),
      power: 0,
    };
  },
  render: ({ route, kind, form, a, b, power }): Slide => {
    const integrand =
      route === 'standard'
        ? kind === 'power'
          ? termTex(a, power)
          : kind === 'exp'
            ? `${a === 1 ? '' : a}e^{${termTex(b, 1)}}`
            : `${a === 1 ? '' : a}\\${kind}\\left(${termTex(b, 1)}\\right)`
        : route === 'bracket'
          ? `\\left(${linearTex(a, b)}\\right)^{${power}}`
          : route === 'substitution'
            ? `${termTex(a, 1)}\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)^{${power}}`
            : `${a === 1 ? '' : a}x${form === 'exp' ? `e^{${termTex(b, 1)}}` : `\\${form}\\left(${termTex(b, 1)}\\right)`}`;

    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide how you would integrate this. Each answer chooses what gets asked next.',
        },
      ],
      subject: integralTex(integrand),
      steps: [
        {
          id: 'standard',
          ask: 'Is this a standard result you already know outright — a power of $x$, $e^{kx}$, $\\sin(kx)$ or $\\cos(kx)$?',
          branches: [
            { label: 'Yes', outcome: 'Apply the standard result directly.' },
            { label: 'No', to: 'bracket' },
          ],
        },
        {
          id: 'bracket',
          ask: 'Is the whole integrand one linear bracket raised to a power, like $(ax + b)^{n}$?',
          branches: [
            {
              label: 'Yes',
              outcome: 'Integrate as though the bracket were $x$, then divide by the coefficient of $x$ inside it.',
            },
            { label: 'No', to: 'inner' },
          ],
        },
        {
          id: 'inner',
          ask: "Does the integrand contain a function of $x$ alongside (a multiple of) that function's derivative?",
          branches: [
            { label: 'Yes', outcome: 'Substitute $u$ for the inner function.' },
            { label: 'No', outcome: 'Integrate by parts.' },
          ],
        },
      ],
      answer:
        route === 'standard'
          ? ['Yes']
          : route === 'bracket'
            ? ['No', 'Yes']
            : route === 'substitution'
              ? ['No', 'No', 'Yes']
              : ['No', 'No', 'No'],
    };
  },
  solution: ({ route, kind, form, a, b, power }) => {
    if (route === 'standard') {
      const label =
        kind === 'power' ? `$${termTex(a, power)}$, a power of $x$` : kind === 'exp' ? 'an exponential' : `a $\\${kind}$`;
      return [
        {
          text: `This is ${label} — one of the standard results, so no technique is needed beyond recalling it.`,
        },
        {
          text: 'Reaching for substitution or parts here would still work eventually, but it is far more machinery than the question needs.',
        },
      ];
    }
    if (route === 'bracket') {
      return [
        {
          text: `The whole integrand is a single linear bracket raised to a power, so this is the reverse chain rule: raise the index by one, divide by the new index, then divide again by the coefficient of $x$ inside the bracket — here $${a}$.`,
        },
        {
          text: 'Substitution would also work, with $u$ equal to the bracket, but for a linear bracket that is more machinery than the shortcut needs.',
        },
      ];
    }
    if (route === 'substitution') {
      return [
        {
          text: `Differentiating $x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$ gives $2x$, and there is an $x$ sitting outside the bracket — up to the constant $${a}$, that is exactly the derivative of what is inside.`,
        },
        {
          text: 'That pairing is what makes substitution work: put $u$ equal to the inner function and the remaining $x$ is absorbed into $du$.',
        },
      ];
    }
    return [
      {
        text: `$x$ and ${form === 'exp' ? 'an exponential' : `a $\\${form}$`} are unrelated functions here — neither is the derivative of the other, so there is nothing to substitute.`,
      },
      {
        text: 'That is exactly the case by parts is for: differentiating the polynomial factor eventually turns it into a constant, which is what makes the method terminate.',
      },
    ];
  },
};

interface DefiniteSubstitutionParams {
  m: number;
  n: number;
  b: number;
  lower: number;
  upper: number;
}

/**
 * A definite integral by substitution, where the one real trap is changing
 * the variable without changing the limits.
 */
const definiteSubstitution: Generator<DefiniteSubstitutionParams> = {
  id: 'int-definite-substitution',
  sample: (rng, difficulty) => {
    const n = rng.pick([2, 3] as const);
    const m = rng.int(1, difficulty > 1 ? 2 : 3);
    const b = difficulty > 1 ? nonZero(rng.int(-3, 4), 2) : rng.int(1, 4);
    const lower = rng.int(0, 1);
    const upper = lower + rng.int(1, difficulty > 1 ? 2 : 1);
    return { m, n, b, lower, upper };
  },
  choices: ({ m, n, b, lower, upper }) => {
    const at = (t: number) => m * Math.pow(t * t + b, n + 1);
    const value = at(upper) - at(lower);
    return options(
      { tex: `${value}`, answer: `${value}` },
      // Forgot that a x dx is a/2 du.
      { tex: `${2 * value}`, answer: `${2 * value}` },
      // Dropped the lower term.
      { tex: `${at(upper)}`, answer: `${at(upper)}` },
      // Kept the x-limits on the u antiderivative.
      {
        tex: `${m * (Math.pow(upper, n + 1) - Math.pow(lower, n + 1))}`,
        answer: `${m * (Math.pow(upper, n + 1) - Math.pow(lower, n + 1))}`,
      },
    );
  },
  render: ({ m, n, b, lower, upper }) => {
    const a = 2 * (n + 1) * m;
    const at = (t: number) => m * Math.pow(t * t + b, n + 1);
    const total = at(upper) - at(lower);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: 'Evaluate, using the substitution $u = x^{2} + c$. The answer is a whole number.',
        },
      ],
      lead: `${definiteTex(`${termTex(a, 1)}\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)^{${n}}`, lower, upper)} =`,
      keypad: [],
      answer: `${total}`,
      integrand: `(${a}) * x * (x^2 + (${b}))^(${n})`,
      limits: [lower, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ m, n, b, lower, upper }) => {
    const a = 2 * (n + 1) * m;
    const at = (t: number) => m * Math.pow(t * t + b, n + 1);
    const total = at(upper) - at(lower);
    return [
      {
        text: `Put $u = x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, so $\\frac{du}{dx} = 2x$ and $${termTex(a, 1)} \\, dx$ becomes $${(n + 1) * m} \\, du$. Change the limits with the variable: at $x = ${lower}$, $u = ${lower * lower + b}$; at $x = ${upper}$, $u = ${upper * upper + b}$.`,
      },
      {
        tex: `${(n + 1) * m}\\int_{${lower * lower + b}}^{${upper * upper + b}} u^{${n}} \\, du = \\left[${m === 1 ? '' : m}u^{${n + 1}}\\right]_{${lower * lower + b}}^{${upper * upper + b}}`,
      },
      { tex: `= ${at(upper)} - \\left(${at(lower)}\\right) = ${total}` },
      {
        text: 'Once the limits are $u$-values there is nothing to convert back. The answer is a number, and $x$ never reappears.',
      },
      {
        text: `Putting the $x$-limits into the $u$ bracket instead gives $${m * (Math.pow(upper, n + 1) - Math.pow(lower, n + 1))}$ — the working looks right and the number is wrong. Change both, or change neither.`,
      },
    ];
  },
};

/**
 * A coefficient in lowest terms in front of an arbitrary TeX factor: a bracket,
 * an exponential, a power of a trigonometric function. `fracTermTex` covers a
 * power of x; this covers everything else, and drops a coefficient of 1 so the
 * learner never reads "1(x^3 + 1)^4".
 */
function fracCoeffTex(num: number, den: number, factor: string): string {
  const { n, d } = reduce(num, den);
  if (d === 1) return `${n === 1 ? '' : n === -1 ? '-' : n}${factor}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}${factor}`;
}

type SubstitutionForm = 'cube' | 'exp' | 'sinPower' | 'cosPower';

interface GeneralSubstitutionParams {
  form: SubstitutionForm;
  a: number;
  b: number;
  n: number;
}

/**
 * Substitution beyond the one shape `int-substitution` teaches: a cube inside
 * a bracket, an exponential, or a power of sine or cosine.
 */
const substitutionGeneral: Generator<GeneralSubstitutionParams> = {
  id: 'int-substitution-general',
  sample: (rng, difficulty) => {
    const form: SubstitutionForm =
      difficulty > 1 ? rng.pick(['cube', 'exp', 'sinPower', 'cosPower'] as const) : 'cube';
    if (form === 'cube') {
      const a = rng.int(2, 9);
      const b = difficulty > 1 ? nonZero(rng.int(-4, 4), 2) : rng.int(1, 4);
      const n = rng.int(2, 4);
      return { form, a, b, n };
    }
    if (form === 'exp') {
      return { form, a: rng.int(1, 9), b: 0, n: 0 };
    }
    return { form, a: rng.int(1, 6), b: 0, n: rng.int(2, 4) };
  },
  choices: ({ form, a, b, n }) => {
    if (form === 'cube') {
      const bracket = `\\left(x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
      const inner = `(x^3 + (${b}))`;
      return options(
        {
          tex: `${fracCoeffTex(a, 3 * (n + 1), `${bracket}^{${n + 1}}`)} + C`,
          answer: `((${a})/(3 * (${n + 1}))) * ${inner}^(${n + 1})`,
        },
        // Forgot the 3 from du = 3x^2 dx.
        {
          tex: `${fracCoeffTex(a, n + 1, `${bracket}^{${n + 1}}`)} + C`,
          answer: `((${a})/(${n + 1})) * ${inner}^(${n + 1})`,
        },
        // Divided by 3 only. At n = 2, n + 1 = 3, which would make this
        // byte-identical to the "forgot the 3" distractor above and collapse
        // the slide to 3 options every time; divide by 6 there instead so it
        // stays a distinct (and still wrong) slip.
        {
          tex: `${fracCoeffTex(a, n === 2 ? 6 : 3, `${bracket}^{${n + 1}}`)} + C`,
          answer: `((${a})/(${n === 2 ? 6 : 3})) * ${inner}^(${n + 1})`,
        },
        // Correct coefficient on the old power.
        {
          tex: `${fracCoeffTex(a, 3 * (n + 1), `${bracket}^{${n}}`)} + C`,
          answer: `((${a})/(3 * (${n + 1}))) * ${inner}^(${n})`,
        },
      );
    }
    if (form === 'exp') {
      return options(
        { tex: `${fracCoeffTex(a, 2, 'e^{x^{2}}')} + C`, answer: `((${a})/2) * e^(x^2)` },
        // No halving.
        { tex: `${a === 1 ? '' : a}e^{x^{2}} + C`, answer: `(${a}) * e^(x^2)` },
        // Kept an x^2 factor and halved.
        {
          tex: `${fracCoeffTex(a, 2, 'x^{2}e^{x^{2}}')} + C`,
          answer: `((${a})/2) * x^2 * e^(x^2)`,
        },
        // Exponent power wrong.
        { tex: `${fracCoeffTex(a, 3, 'e^{x^{3}}')} + C`, answer: `((${a})/3) * e^(x^3)` },
      );
    }
    const fn = form === 'sinPower' ? 'sin' : 'cos';
    const sign = form === 'sinPower' ? 1 : -1;
    return options(
      {
        tex: `${fracCoeffTex(sign * a, n + 1, `\\${fn}^{${n + 1}}(x)`)} + C`,
        answer: `((${sign * a})/(${n + 1})) * ${fn}(x)^(${n + 1})`,
      },
      // Sign flipped.
      {
        tex: `${fracCoeffTex(-sign * a, n + 1, `\\${fn}^{${n + 1}}(x)`)} + C`,
        answer: `((${-sign * a})/(${n + 1})) * ${fn}(x)^(${n + 1})`,
      },
      // Not divided.
      {
        tex: `${fracCoeffTex(sign * a, 1, `\\${fn}^{${n + 1}}(x)`)} + C`,
        answer: `(${sign * a}) * ${fn}(x)^(${n + 1})`,
      },
      // Power not raised.
      {
        tex: `${fracCoeffTex(sign * a, n + 1, `\\${fn}^{${n}}(x)`)} + C`,
        answer: `((${sign * a})/(${n + 1})) * ${fn}(x)^(${n})`,
      },
    );
  },
  render: ({ form, a, b, n }) => {
    if (form === 'cube') {
      const scale = 3 * (n + 1);
      const shown = termTex(a, 2);
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: 'Integrate by substitution, choosing $u$ yourself.' }],
        lead: `${integralTex(`${shown}\\left(x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)^{${n}}`)} =`,
        keypad: INTEGRAL_KEYS,
        answer: `((${a})/(${scale})) * (x^3 + (${b}))^(${n + 1})`,
        integrand: `(${a}) * x^2 * (x^3 + (${b}))^(${n})`,
        domain: 'real',
        mode: 'upToConstant',
      };
    }
    if (form === 'exp') {
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: 'Integrate by substitution, choosing $u$ yourself.' }],
        lead: `${integralTex(`${a === 1 ? '' : a}xe^{x^{2}}`)} =`,
        keypad: EXP_INTEGRAL_KEYS,
        answer: `((${a})/2) * e^(x^2)`,
        integrand: `(${a}) * x * e^(x^2)`,
        domain: 'real',
        mode: 'upToConstant',
      };
    }
    if (form === 'sinPower') {
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: 'Integrate by substitution, choosing $u$ yourself.' }],
        lead: `${integralTex(`${a === 1 ? '' : a}\\cos(x)\\sin^{${n}}(x)`)} =`,
        keypad: TRIG_INTEGRAL_KEYS,
        answer: `((${a})/(${n + 1})) * sin(x)^(${n + 1})`,
        integrand: `(${a}) * cos(x) * sin(x)^(${n})`,
        domain: 'real',
        mode: 'upToConstant',
      };
    }
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate by substitution, choosing $u$ yourself.' }],
      lead: `${integralTex(`${a === 1 ? '' : a}\\sin(x)\\cos^{${n}}(x)`)} =`,
      keypad: TRIG_INTEGRAL_KEYS,
      answer: `((${-a})/(${n + 1})) * cos(x)^(${n + 1})`,
      integrand: `(${a}) * sin(x) * cos(x)^(${n})`,
      domain: 'real',
      mode: 'upToConstant',
    };
  },
  solution: ({ form, a, b, n }) => {
    if (form === 'cube') {
      const bracket = `\\left(x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\right)`;
      const correct = `${fracCoeffTex(a, 3 * (n + 1), `${bracket}^{${n + 1}}`)} + C`;
      return [
        {
          text: `Inside the bracket is $x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, whose derivative is $3x^{2}$, and there is an $x^{2}$ outside. Put $u = x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, so $${termTex(a, 2)} \\, dx$ becomes $\\frac{${a}}{3} \\, du$.`,
        },
        { tex: `\\frac{${a}}{3}\\int u^{${n}} \\, du = \\frac{${a}}{3} \\times \\frac{u^{${n + 1}}}{${n + 1}}` },
        { tex: `= ${correct}` },
        {
          text: 'The constant factor is no obstacle; it just sits outside. An $x$ left over after the substitution would be, and would mean the wrong $u$ was chosen.',
        },
      ];
    }
    if (form === 'exp') {
      const correct = `${fracCoeffTex(a, 2, 'e^{x^{2}}')} + C`;
      return [
        {
          text: `The derivative of $x^{2}$ is $2x$, and there is an $x$ outside the exponential. Put $u = x^{2}$, so $${termTex(a, 1)} \\, dx$ becomes $\\frac{${a}}{2} \\, du$.`,
        },
        { tex: `\\frac{${a}}{2}\\int e^{u} \\, du = \\frac{${a}}{2}e^{u}` },
        { tex: `= ${correct}` },
        {
          text: 'The constant factor is no obstacle; it just sits outside. An $x$ left over after the substitution would be, and would mean the wrong $u$ was chosen.',
        },
      ];
    }
    if (form === 'sinPower') {
      const correct = `${fracCoeffTex(a, n + 1, `\\sin^{${n + 1}}(x)`)} + C`;
      return [
        {
          text: 'The derivative of $\\sin(x)$ is $\\cos(x)$, which is sitting alongside it. Put $u = \\sin(x)$, so $\\cos(x) \\, dx$ becomes $du$.',
        },
        { tex: `${a === 1 ? '' : a}\\int u^{${n}} \\, du = ${fracCoeffTex(a, n + 1, `u^{${n + 1}}`)}` },
        { tex: `= ${correct}` },
        {
          text: 'A power of $\\sin(x)$ next to $\\cos(x)$ is a power of $u$ next to $du$: it integrates exactly like $u^{n}$.',
        },
      ];
    }
    const correct = `${fracCoeffTex(-a, n + 1, `\\cos^{${n + 1}}(x)`)} + C`;
    return [
      {
        text: 'The derivative of $\\cos(x)$ is $-\\sin(x)$, which is sitting alongside it. Put $u = \\cos(x)$, so $\\sin(x) \\, dx$ becomes $-du$.',
      },
      { tex: `-${a === 1 ? '' : a}\\int u^{${n}} \\, du = -${fracCoeffTex(a, n + 1, `u^{${n + 1}}`)}` },
      { tex: `= ${correct}` },
      {
        text: 'Differentiating $\\cos(x)$ gives $-\\sin(x)$, so the $\\sin(x)$ in the integrand is $-\\frac{du}{dx}$ and the answer picks up a minus sign. Forgetting it is the characteristic slip with cosine.',
      },
    ];
  },
};

/** The algebra keys plus a root and the constant of integration. */
const ROOT_INTEGRAL_KEYS: KeypadKey[] = [...ROOT_KEYS, { insert: 'C' }];

type RootForm = 'sqrt' | 'invSqrt' | 'index' | 'xSqrt' | 'invXSqrt' | 'index5';

/**
 * The index of x over 2, per form: the question is a·x^{p/2}. A table rather
 * than a derivation, so a mistyped row fails a test instead of shipping.
 */
const HALF_INDEX: Record<RootForm, number> = {
  sqrt: 1,
  invSqrt: -1,
  index: 3,
  xSqrt: 3,
  invXSqrt: -3,
  index5: 5,
};
const ROOT_FORMS_1: RootForm[] = ['sqrt', 'invSqrt', 'index'];
const ROOT_FORMS_2: RootForm[] = ['sqrt', 'invSqrt', 'index', 'xSqrt', 'invXSqrt', 'index5'];

/** The root or root-fraction as the learner reads it, before it is rewritten as a power. */
function shownTex(form: RootForm, a: number): string {
  const c = a === 1 ? '' : `${a}`;
  if (form === 'sqrt') return `${c}\\sqrt{x}`;
  if (form === 'invSqrt') return `\\frac{${a}}{\\sqrt{x}}`;
  if (form === 'index') return `${c}x^{3/2}`;
  if (form === 'xSqrt') return `${c}x\\sqrt{x}`;
  if (form === 'invXSqrt') return `\\frac{${a}}{x\\sqrt{x}}`;
  return `${c}x^{5/2}`;
}

/** A coefficient in lowest terms in front of a fractional power of x. */
function halfPowTex(num: number, den: number, p: number): string {
  return fracCoeffTex(num, den, `x^{${p}/2}`);
}

interface RootPowerParams {
  form: RootForm;
  a: number;
}

/** Integrating a root, or a root under a fraction, by rewriting it as a fractional power first. */
const rootPower: Generator<RootPowerParams> = {
  id: 'int-root-power',
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? ROOT_FORMS_2 : ROOT_FORMS_1),
    a: rng.int(difficulty > 1 ? 2 : 1, 12),
  }),
  choices: ({ form, a }) => {
    const p = HALF_INDEX[form];
    const q = p + 2;
    return options(
      { tex: `${halfPowTex(2 * a, q, q)} + C`, answer: `((${2 * a})/(${q})) * x^((${q})/2)` },
      // Divided by the old index.
      { tex: `${halfPowTex(2 * a, p, q)} + C`, answer: `((${2 * a})/(${p})) * x^((${q})/2)` },
      // Not divided at all.
      { tex: `${halfPowTex(a, 1, q)} + C`, answer: `(${a}) * x^((${q})/2)` },
      // Index lowered instead of raised.
      { tex: `${halfPowTex(a * p, 2, p - 2)} + C`, answer: `((${a * p})/2) * x^((${p - 2})/2)` },
    );
  },
  render: ({ form, a }) => {
    const p = HALF_INDEX[form];
    const newIndex = p + 2;
    const alreadyIndex = form === 'index' || form === 'index5';
    const rootWriting =
      newIndex > 0 ? `((${2 * a})/(${newIndex})) * sqrt(x^(${newIndex}))` : `(${-2 * a})/sqrt(x)`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: alreadyIndex
            ? 'Integrate, for $x > 0$.'
            : 'Integrate, for $x > 0$. Write the root as a power first.',
        },
      ],
      lead: `${integralTex(shownTex(form, a))} =`,
      keypad: ROOT_INTEGRAL_KEYS,
      answer: `((${2 * a})/(${newIndex})) * x^((${newIndex})/2)`,
      alsoAccepts: [rootWriting],
      integrand: `(${a}) * x^((${p})/2)`,
      domain: 'positive',
      mode: 'upToConstant',
    };
  },
  solution: ({ form, a }) => {
    const p = HALF_INDEX[form];
    const newIndex = p + 2;
    const alreadyIndex = form === 'index' || form === 'index5';
    const rootForm =
      newIndex > 0
        ? fracCoeffTex(2 * a, newIndex, newIndex === 1 ? '\\sqrt{x}' : `\\sqrt{x^{${newIndex}}}`)
        : `-\\frac{${2 * a}}{\\sqrt{x}}`;
    return [
      {
        text: alreadyIndex
          ? `The index is already a fraction, and the power rule never required a whole one: raise it by one and divide by the new index.`
          : `Write the root as a power: $${shownTex(form, a)}$ is $${a === 1 ? '' : a}x^{${p}/2}$. Then the rule is the usual one — raise the index by one, divide by the new index.`,
      },
      {
        tex: `\\int ${a === 1 ? '' : a}x^{${p}/2} \\, dx = \\frac{${a === 1 ? '' : a}x^{${newIndex}/2}}{${newIndex}/2} + C`,
      },
      { tex: `= ${halfPowTex(2 * a, newIndex, newIndex)} + C = ${rootForm} + C` },
      {
        text:
          p > 0
            ? `Dividing by a fraction is multiplying by its reciprocal: dividing by $\\frac{${newIndex}}{2}$ multiplies by $\\frac{2}{${newIndex}}$. Check by differentiating, and the two fractions cancel back to the original coefficient.`
            : `Adding one to a negative fraction moves it towards zero, so $${p}/2$ becomes $${newIndex}/2$, and dividing by that ${newIndex < 0 ? 'negative fraction flips the sign' : 'fraction doubles the coefficient'}. Differentiate the answer to check the sign.`,
      },
    ];
  },
};

interface PartsLogParams {
  form: 'power' | 'plain';
  a: number;
  n: number;
}

/**
 * Integration by parts with a logarithm as u, the exception to "the
 * polynomial is always u" — including x^0 * ln x, where dv/dx = 1.
 *
 * `answer`/`integrand` use `log(x)` rather than `ln(x)`: `math.derivative`
 * throws on the `ln` alias (it exists only for evaluation), while the
 * learner still types `ln(` from the keypad, which grades correct against
 * `log` through the same alias.
 */
const partsLog: Generator<PartsLogParams> = {
  id: 'int-parts-log',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.3)) return { form: 'plain' as const, a: rng.int(1, 9), n: 0 };
    return {
      form: 'power' as const,
      a: rng.int(1, difficulty > 1 ? 9 : 12),
      n: rng.int(1, difficulty > 1 ? 4 : 3),
    };
  },
  choices: ({ form, a, n }) => {
    if (form === 'power') {
      const m = n + 1;
      const sq = m * m;
      const first = `${fracTermTex(a, m, m)}\\ln x`;
      return options(
        {
          tex: `${first} - ${fracTermTex(a, sq, m)} + C`,
          answer: `((${a})/(${m})) * x^(${m}) * log(x) - ((${a})/(${sq})) * x^(${m})`,
        },
        // Sign flipped on the second term.
        {
          tex: `${first} + ${fracTermTex(a, sq, m)} + C`,
          answer: `((${a})/(${m})) * x^(${m}) * log(x) + ((${a})/(${sq})) * x^(${m})`,
        },
        // uv only.
        { tex: `${first} + C`, answer: `((${a})/(${m})) * x^(${m}) * log(x)` },
        // Second term divided by m rather than m^2.
        {
          tex: `${first} - ${fracTermTex(a, m, m)} + C`,
          answer: `((${a})/(${m})) * x^(${m}) * log(x) - ((${a})/(${m})) * x^(${m})`,
        },
      );
    }
    return options(
      { tex: `${termTex(a, 1)}\\ln x - ${termTex(a, 1)} + C`, answer: `(${a}) * x * log(x) - (${a}) * x` },
      // Plus instead of minus.
      { tex: `${termTex(a, 1)}\\ln x + ${termTex(a, 1)} + C`, answer: `(${a}) * x * log(x) + (${a}) * x` },
      // uv only.
      { tex: `${termTex(a, 1)}\\ln x + C`, answer: `(${a}) * x * log(x)` },
      // Differentiated instead of integrated.
      { tex: `\\frac{${a}}{x} + C`, answer: `(${a})/x` },
    );
  },
  render: ({ form, a, n }) => {
    if (form === 'plain') {
      return {
        kind: 'expression',
        prompt: [{ kind: 'prose', text: 'Integrate by parts, for $x > 0$.' }],
        lead: `${integralTex(`${a === 1 ? '' : a}\\ln x`)} =`,
        keypad: EXP_INTEGRAL_KEYS,
        answer: `(${a}) * x * log(x) - (${a}) * x`,
        integrand: `(${a}) * log(x)`,
        domain: 'positive',
        mode: 'upToConstant',
      };
    }
    const m = n + 1;
    const square = m * m;
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: 'Integrate by parts, for $x > 0$.' }],
      lead: `${integralTex(`${termTex(a, n)}\\ln x`)} =`,
      keypad: EXP_INTEGRAL_KEYS,
      answer: `((${a})/(${m})) * x^(${m}) * log(x) - ((${a})/(${square})) * x^(${m})`,
      integrand: `(${a}) * x^(${n}) * log(x)`,
      domain: 'positive',
      mode: 'upToConstant',
    };
  },
  solution: ({ form, a, n }) => {
    if (form === 'plain') {
      return [
        {
          text: `The logarithm is $u$: it has no standard integral to be $\\frac{dv}{dx}$, and its derivative $\\frac{1}{x}$ is as simple as a function gets. So $u = \\ln x$ and $\\frac{dv}{dx} = ${a === 1 ? '1' : `${a}`}$.`,
        },
        { tex: `u = \\ln x \\quad v = ${termTex(a, 1)} \\quad \\frac{du}{dx} = \\frac{1}{x}` },
        { tex: `${termTex(a, 1)}\\ln x - \\int ${a} \\, dx` },
        { tex: `= ${termTex(a, 1)}\\ln x - ${termTex(a, 1)} + C` },
        {
          text: 'Taking $\\frac{dv}{dx} = 1$ looks like cheating and is not: $v = x$, and the $x$ cancels the $\\frac{1}{x}$ from the logarithm, leaving an integral of a constant.',
        },
      ];
    }
    const m = n + 1;
    const sq = m * m;
    return [
      {
        text: `The logarithm is $u$: it has no standard integral to be $\\frac{dv}{dx}$, and its derivative $\\frac{1}{x}$ is as simple as a function gets. So $u = \\ln x$ and $\\frac{dv}{dx} = ${termTex(a, n)}$.`,
      },
      { tex: `u = \\ln x \\quad v = ${fracTermTex(a, m, m)} \\quad \\frac{du}{dx} = \\frac{1}{x}` },
      { tex: `${fracTermTex(a, m, m)}\\ln x - \\int ${fracTermTex(a, m, n)} \\, dx` },
      { tex: `= ${fracTermTex(a, m, m)}\\ln x - ${fracTermTex(a, sq, m)} + C` },
      {
        text: `The denominator of the second term is the square of the first, $${m}$ and $${sq}$. Writing $${m}$ for both is the common slip, and differentiating the answer catches it: the $\\ln x$ terms only cancel when the second denominator is the square.`,
      },
    ];
  },
};

/* ---------- Level 4: area between curves ---------- */

/**
 * A polynomial as its coefficients, lowest power first: `[c, b, a]` is
 * a x^2 + b x + c.
 *
 * Every curve in this level is a polynomial of degree two at most, and that is
 * deliberate rather than a limit of the widgets. The quadrature oracle reads a
 * definite integral's answer as a number, so an exponential area such as
 * `(e^2 - 1)/2` reads as NaN to it (`eval/plans/TASK6-PLAN.md` found that), and
 * a whole-number area is only guaranteed where the samplers can do the
 * arithmetic exactly — which `sixIntegral` below does for these and nothing
 * else.
 */
type Poly = number[];

const coefficientOf = (p: Poly, power: number): number => p[power] ?? 0;

/** A polynomial as the learner reads it, highest power first. */
function polyTex(p: Poly): string {
  const terms: string[] = [];
  for (let power = p.length - 1; power >= 0; power -= 1) {
    terms.push(termTex(coefficientOf(p, power), power));
  }
  return sumTex(terms) || '0';
}

/** The same polynomial for the grader. */
function polyAnswer(p: Poly): string {
  return sumAnswer(p.map((value, power) => termAnswer(value, power)));
}

function polyAt(p: Poly, x: number): number {
  return p.reduce((total, value, power) => total + value * Math.pow(x, power), 0);
}

function polyAdd(a: Poly, b: Poly): Poly {
  return Array.from(
    { length: Math.max(a.length, b.length) },
    (_, power) => coefficientOf(a, power) + coefficientOf(b, power),
  );
}

function polyScale(p: Poly, k: number): Poly {
  // `+ 0` turns a -0 into a 0, so a scaled zero never prints or serialises oddly.
  return p.map((value) => value * k + 0);
}

const polySub = (a: Poly, b: Poly): Poly => polyAdd(a, polyScale(b, -1));

/** k(x - p)(x - q), expanded. */
function fromRoots(k: number, p: number, q: number): Poly {
  return [k * p * q, -k * (p + q), k];
}

/**
 * Six times the integral of `p` from `a` to `b`.
 *
 * Always a whole number for whole coefficients and whole limits up to degree
 * two, since the denominators 1, 2 and 3 all divide six. That is what lets a
 * sampler *reject* a draw whose area would not be whole, instead of rounding
 * one into a question whose stated answer is slightly wrong.
 */
function sixIntegral(p: Poly, a: number, b: number): number {
  return p.reduce(
    (total, value, power) =>
      total + (value * 6 * (Math.pow(b, power + 1) - Math.pow(a, power + 1))) / (power + 1),
    0,
  );
}

/** The antiderivative with no constant, fractions and all. */
function antiTex(p: Poly): string {
  const terms: string[] = [];
  for (let power = p.length - 1; power >= 0; power -= 1) {
    terms.push(fracTermTex(coefficientOf(p, power), power + 1, power + 1));
  }
  return sumTex(terms) || '0';
}

/** The smallest value a polynomial of degree two or less takes on [a, b]. */
function minOn(p: Poly, a: number, b: number): number {
  const candidates = [a, b];
  const lead = coefficientOf(p, 2);
  if (lead !== 0) {
    const vertex = -coefficientOf(p, 1) / (2 * lead);
    if (vertex > a && vertex < b) candidates.push(vertex);
  }
  return Math.min(...candidates.map((x) => polyAt(p, x)));
}

/** A factor (x - r), as it would be written by hand. */
function factorTex(root: number): string {
  if (root === 0) return 'x';
  return `(x ${root < 0 ? '+' : '-'} ${Math.abs(root)})`;
}

/** k(x - p)(x - q), factorised, with a unit k left implied. */
function factorisedTex(k: number, p: number, q: number): string {
  const lead = k === 1 ? '' : k === -1 ? '-' : `${k}`;
  return `${lead}${factorTex(p)}${factorTex(q)}`;
}

/**
 * A limit written into a tiles template, where a brace group holding only
 * digits would be taken for a blank. The limits here stay between -9 and 9, so
 * a bare digit never runs into a second one.
 */
function templateLimit(value: number): string {
  return value >= 0 ? `${value}` : `{${value}}`;
}

/**
 * Draw until `ok` holds.
 *
 * Deterministic per seed, since every attempt reads the same stream in the same
 * order. The fallback is a valid question for the case where no attempt
 * passes, which none of the samplers below comes near in practice.
 */
function drawUntil<T>(make: () => T, ok: (value: T) => boolean, fallback: T): T {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const value = make();
    if (ok(value)) return value;
  }
  return fallback;
}

/**
 * Several short lines of working as one display, left-aligned.
 *
 * A phone shows about twenty characters of display maths before a line is cut
 * off at the edge of the solution panel, and two bracketed quadratics
 * subtracted run well past that. Breaking the working onto lines of its own is
 * what keeps every step on screen.
 */
function stacked(...rows: string[]): string {
  return `\\begin{aligned} ${rows.map((row) => `& ${row}`).join(' \\\\ ')} \\end{aligned}`;
}

/** Options turned by an amount taken from the question, so one draw renders one way. */
function turned<T>(list: T[], turn: number): T[] {
  const at = ((turn % list.length) + list.length) % list.length;
  return [...list.slice(at), ...list.slice(0, at)];
}

/**
 * A bank of whole numbers: the answer values, then distinct distractors,
 * padded from beside the last answer so the right tile never stands out as the
 * one value unlike the rest.
 */
function wholeBank(answer: number[], distractors: number[], atLeast = 3): string[] {
  const needed = new Set(answer.map(String));
  const extras: string[] = [];
  const push = (value: number) => {
    const token = String(value + 0);
    if (!Number.isInteger(value) || needed.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  for (const value of distractors) push(value);
  const seed = answer[answer.length - 1];
  for (let step = 1; extras.length < atLeast; step += 1) {
    push(seed + step);
    push(seed - step);
  }
  return [...answer.map(String), ...extras].sort((x, y) => Number(x) - Number(y));
}

/** A tile bank of TeX tokens: the answer's, then the distinct distractors, sorted. */
function tokenBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((token) => !needed.has(token));
  return [...answer, ...extras].sort();
}

/** A y window covering two curves over [from, to], with a little room. */
function windowFor(curves: Poly[], from: number, to: number): { yMin: number; yMax: number } {
  const values = curves.flatMap((p) =>
    Array.from({ length: 41 }, (_, i) => polyAt(p, from + ((to - from) * i) / 40)),
  );
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.12 || 1;
  return { yMin: lo - pad, yMax: hi + pad };
}

/**
 * Two curves with the region between them shaded.
 *
 * `plotSvg` shades between one curve and the axis, and the region this level
 * is about has a curve on both sides. Rather than widen the shared figure
 * module from a content batch, the band is drawn here and laid underneath the
 * plot, through the same frame `plotSvg` maps with: 280 wide, inset 12 at each
 * edge. The y window is therefore required rather than optional, so the two
 * agree on the vertical scale instead of `plotSvg` choosing its own.
 */
export function betweenSvg(opts: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  top: (x: number) => number;
  bottom: (x: number) => number;
  from: number;
  to: number;
  label: string;
  verticals?: number[];
  marks?: { x: number; y: number }[];
  height?: number;
}): string {
  const WIDTH = 280;
  const PAD = 12;
  const SAMPLES = 80;
  const height = opts.height ?? 150;
  const px = (x: number) => PAD + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * (WIDTH - PAD * 2);
  const py = (y: number) => PAD + ((opts.yMax - y) / (opts.yMax - opts.yMin)) * (height - PAD * 2);
  const edge = (f: (x: number) => number) =>
    Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const x = opts.from + ((opts.to - opts.from) * i) / SAMPLES;
      return `${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`;
    });
  const band = `<path class="plot-shade" d="M ${[...edge(opts.top), ...edge(opts.bottom).reverse()].join(' L ')} Z" />`;
  const plot = plotSvg({
    xMin: opts.xMin,
    xMax: opts.xMax,
    yMin: opts.yMin,
    yMax: opts.yMax,
    height,
    curves: [{ f: opts.top }, { f: opts.bottom, accent: true }],
    verticals: (opts.verticals ?? []).map((x) => ({ x })),
    marks: opts.marks,
    label: opts.label,
  });
  const open = plot.indexOf('>') + 1;
  return `${plot.slice(0, open)}${band}${plot.slice(open)}`;
}

interface BetweenParams {
  top: Poly;
  bottom: Poly;
  /** True when the question names the lower curve first. */
  swap: boolean;
  lower: number;
  upper: number;
}

/**
 * Two curves, one above the other across given limits.
 *
 * The gap between them is drawn first, as 3a x^2 + 2b x + c, whose
 * antiderivative a x^3 + b x^2 + c x has whole coefficients, so the area is
 * whole at whole limits with nothing rounded. The lower curve is drawn freely
 * and the upper one is the lower plus the gap, which is what varies both
 * curves at once — varying one parameter of a fixed pair is what emptied the
 * pool in `eval/plans/TASK6-PLAN.md`.
 */
function sampleBetween(rng: Rng, difficulty: number): BetweenParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const lower = rng.int(-2, hard ? 3 : 2);
      const upper = lower + rng.int(1, hard ? 4 : 3);
      const a = rng.int(hard ? -1 : 0, hard ? 2 : 1);
      const b = rng.int(-3, 3);
      const c = rng.int(-4, 9);
      const bottom = [rng.int(-6, 6), rng.int(-4, 4), rng.pick(hard ? [-2, -1, 0, 1, 2] : [-1, 0, 1])];
      return { top: polyAdd(bottom, [c, 2 * b, 3 * a]), bottom, swap: rng.int(0, 1) === 1, lower, upper };
    },
    ({ top, bottom, lower, upper }) => {
      const gap = polySub(top, bottom);
      return (
        minOn(gap, lower, upper) > 0 &&
        (coefficientOf(top, 2) !== 0 || coefficientOf(bottom, 2) !== 0) &&
        bottom.some((value) => value !== 0) &&
        sixIntegral(gap, lower, upper) <= 6 * 120
      );
    },
    { top: [1, 0, 1], bottom: [-2, 0, 1], swap: false, lower: 0, upper: 2 },
  );
}

/** The two curves in the order the question names them. */
function named(top: Poly, bottom: Poly, swap: boolean): [string, string] {
  return swap ? [polyTex(bottom), polyTex(top)] : [polyTex(top), polyTex(bottom)];
}

/** A test point inside [a, b], preferring a whole one so the arithmetic stays clean. */
function testPoint(a: number, b: number): number {
  return b - a >= 2 ? a + 1 : (a + b) / 2;
}

/** The worked solution shared by the questions that give the limits. */
function betweenSolution({ top, bottom, lower, upper }: BetweenParams) {
  const gap = polySub(top, bottom);
  const at = testPoint(lower, upper);
  const fu = sixIntegral(gap, 0, upper) / 6;
  const fl = sixIntegral(gap, 0, lower) / 6;
  return [
    {
      text: `First decide which curve is on top. At $x = ${at}$, $y = ${polyTex(top)}$ gives $${polyAt(top, at)}$ and $y = ${polyTex(bottom)}$ gives $${polyAt(bottom, at)}$, so the first of those is the upper one.`,
    },
    {
      tex: stacked(`\\left(${polyTex(top)}\\right)`, `- \\left(${polyTex(bottom)}\\right)`, `= ${polyTex(gap)}`),
    },
    { text: 'Integrate that difference between the limits: upper curve minus lower curve, one integral.' },
    {
      tex: stacked(
        `\\int_{${lower}}^{${upper}} \\left(${polyTex(gap)}\\right) dx`,
        `= \\left[${antiTex(gap)}\\right]_{${lower}}^{${upper}}`,
        `= ${fu} - \\left(${fl}\\right) = ${fu - fl}`,
      ),
    },
    {
      text: 'The bracket round the lower curve is the step that goes wrong: every one of its terms changes sign, not just the first.',
    },
  ];
}

/** The area between two curves, with the limits given. */
const betweenGiven: Generator<BetweenParams> = {
  id: 'int-between-given',
  sample: sampleBetween,
  choices: ({ top, bottom, lower, upper }) => {
    const gap = polySub(top, bottom);
    const area = sixIntegral(gap, lower, upper) / 6;
    const fu = sixIntegral(gap, 0, upper) / 6;
    const fl = sixIntegral(gap, 0, lower) / 6;
    return options(
      { tex: `${area}`, answer: `${area}` },
      // Lower curve minus upper: the right size with the wrong sign.
      { tex: `${-area}`, answer: `${-area}` },
      // Adding the value at the lower limit instead of subtracting it.
      { tex: `${fu + fl}`, answer: `${fu + fl}` },
      // Dropping the lower limit's value altogether.
      { tex: `${fu}`, answer: `${fu}` },
      { tex: `${area + upper - lower}`, answer: `${area + upper - lower}` },
    ).slice(0, 4);
  },
  render: ({ top, bottom, swap, lower, upper }): Slide => {
    const [first, second] = named(top, bottom, swap);
    const gap = polySub(top, bottom);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the area between the curves $y = ${first}$ and $y = ${second}$, from $x = ${lower}$ to $x = ${upper}$.`,
        },
      ],
      lead: '\\text{area} =',
      keypad: [],
      answer: `${sixIntegral(gap, lower, upper) / 6}`,
      integrand: polyAnswer(gap),
      limits: [lower, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: betweenSolution,
};

/**
 * The integrand and the area, placed as tiles.
 *
 * The typed form grades only the number, so a learner who subtracted the lower
 * curve's first term and added the rest sees "wrong" and nothing else. Here the
 * simplified difference is its own tile, beside the two differences that go
 * wrong — the reversed one, and the one with the bracket left off.
 */
const betweenTiles: Generator<BetweenParams> = {
  id: 'int-between-tiles',
  sample: sampleBetween,
  render: ({ top, bottom, swap, lower, upper }): Slide => {
    const [first, second] = named(top, bottom, swap);
    const gap = polySub(top, bottom);
    const area = sixIntegral(gap, lower, upper) / 6;
    // The lower curve's leading term subtracted and the rest of it added: what
    // subtracting without a bracket produces.
    const unbracketed = [
      coefficientOf(top, 0) + coefficientOf(bottom, 0),
      coefficientOf(top, 1) + coefficientOf(bottom, 1),
      coefficientOf(top, 2) - coefficientOf(bottom, 2),
    ];
    const answer = [polyTex(gap), `${area}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The region between $y = ${first}$ and $y = ${second}$, from $x = ${lower}$ to $x = ${upper}$. Place the simplified integrand, then the area it gives.`,
        },
      ],
      template: `\\text{area} = \\int_${templateLimit(lower)}^${templateLimit(upper)} ( {0} ) \\, dx = {1}`,
      bank: tokenBank(answer, [
        polyTex(polyScale(gap, -1)),
        polyTex(unbracketed),
        `${-area}`,
        `${sixIntegral(gap, 0, upper) / 6}`,
        `${area + 1}`,
      ]),
      answer,
    };
  },
  solution: betweenSolution,
};

interface TreeParams {
  top: Poly;
  bottom: Poly;
  lower: number;
  upper: number;
}

/**
 * Area between as two areas subtracted: the integral of each curve on its
 * own, then the difference.
 *
 * The idea the whole level rests on, laid out as a picture — the region is
 * what lies under the top curve and not under the bottom one. Both curves are
 * built with whole antiderivatives so each box holds a whole number, and a
 * curve dipping below the axis makes its own box negative, which is the point:
 * the difference is still the area.
 */
const betweenTree: Generator<TreeParams> = {
  id: 'int-between-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const whole = (): Poly => [rng.int(-5, 6), 2 * rng.int(-3, 3), 3 * rng.pick(hard ? [-1, 0, 1] : [0, 1])];
    return drawUntil(
      () => {
        const lower = rng.int(-2, 2);
        return { top: whole(), bottom: whole(), lower, upper: lower + rng.int(1, hard ? 3 : 2) };
      },
      ({ top, bottom, lower, upper }) =>
        minOn(polySub(top, bottom), lower, upper) > 0 &&
        (coefficientOf(top, 2) !== 0 || coefficientOf(bottom, 2) !== 0) &&
        Math.abs(sixIntegral(top, lower, upper)) <= 6 * 80 &&
        Math.abs(sixIntegral(bottom, lower, upper)) <= 6 * 80,
      { top: [4, 0, 3], bottom: [-1, 2, 0], lower: 0, upper: 2 },
    );
  },
  render: ({ top, bottom, lower, upper }): Slide => {
    const over = sixIntegral(top, lower, upper) / 6;
    const under = sixIntegral(bottom, lower, upper) / 6;
    const answer = [over, under, over - under];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Between $x = ${lower}$ and $x = ${upper}$ the curve $y_1 = ${polyTex(top)}$ lies above $y_2 = ${polyTex(bottom)}$. Fill the top row with the integral of each curve on its own, $y_1$ first, and the box below with the area between them.`,
        },
      ],
      expression: `\\int_{${lower}}^{${upper}} y_1 \\, dx - \\int_{${lower}}^{${upper}} y_2 \\, dx`,
      nodes: [
        { id: 'upper-curve', from: [] },
        { id: 'lower-curve', from: [] },
        { id: 'between', from: ['upper-curve', 'lower-curve'] },
      ],
      bank: wholeBank(answer, [over + under, under - over, -over, -under]),
      answer: answer.map(String),
    };
  },
  solution: ({ top, bottom, lower, upper }) => {
    const over = sixIntegral(top, lower, upper) / 6;
    const under = sixIntegral(bottom, lower, upper) / 6;
    return [
      { text: 'The region between the curves is what lies under the upper one and not under the lower one, so integrate each and subtract.' },
      {
        tex: stacked(
          `\\int_{${lower}}^{${upper}} \\left(${polyTex(top)}\\right) dx`,
          `= \\left[${antiTex(top)}\\right]_{${lower}}^{${upper}} = ${over}`,
        ),
      },
      {
        tex: stacked(
          `\\int_{${lower}}^{${upper}} \\left(${polyTex(bottom)}\\right) dx`,
          `= \\left[${antiTex(bottom)}\\right]_{${lower}}^{${upper}} = ${under}`,
        ),
      },
      { tex: `${over} - \\left(${under}\\right) = ${over - under}` },
      {
        text:
          under < 0 || over < 0
            ? 'One of the integrals is negative because that curve dips below the axis. It does not matter: the difference still measures the gap between the curves, wherever the axis happens to be.'
            : 'Integrating the difference in one go gives the same number, and is usually quicker: simplify top minus bottom first, then integrate once.',
      },
    ];
  },
};

interface SidesParams {
  /** The curves in the order the question names them. */
  first: Poly;
  second: Poly;
  /** Where they meet, whatever the interval. */
  roots: [number, number];
  lower: number;
  upper: number;
  /** Which is higher across the interval, or whether they cross inside it. */
  verdict: 'first' | 'second' | 'cross';
}

/**
 * Two curves meeting at two whole points, and an interval placed relative to
 * those points: between them, clear of them, or straddling one.
 *
 * The meeting points are never an endpoint of the interval, so "cross in
 * between" never has to be read against a curve that only touches at the edge.
 */
function sampleSides(rng: Rng, difficulty: number, allowCross: boolean): SidesParams {
  const hard = difficulty > 1;
  const r1 = rng.int(-4, 1);
  const r2 = r1 + rng.int(3, 5);
  const k = rng.sign() * rng.int(1, hard ? 2 : 1);
  const layout = rng.pick(allowCross ? (['inside', 'outside', 'cross'] as const) : (['inside', 'outside'] as const));
  let lower: number;
  let upper: number;
  if (layout === 'inside') {
    lower = rng.int(r1 + 1, r2 - 2);
    upper = rng.int(lower + 1, r2 - 1);
  } else if (layout === 'outside') {
    if (rng.int(0, 1) === 0) {
      lower = r2 + rng.int(1, 2);
      upper = lower + rng.int(1, 2);
    } else {
      upper = r1 - rng.int(1, 2);
      lower = upper - rng.int(1, 2);
    }
  } else if (rng.int(0, 1) === 0) {
    lower = r1 - rng.int(1, 2);
    upper = rng.int(r1 + 1, r2 - 1);
  } else {
    lower = rng.int(r1 + 1, r2 - 1);
    upper = r2 + rng.int(1, 2);
  }
  const second = [rng.int(-6, 6), rng.int(-3, 3), hard ? rng.pick([-1, 0, 1]) : 0];
  const first = polyAdd(second, fromRoots(k, r1, r2));
  const middle = polyAt(polySub(first, second), (lower + upper) / 2);
  return {
    first,
    second,
    roots: [r1, r2],
    lower,
    upper,
    verdict: layout === 'cross' ? 'cross' : middle > 0 ? 'first' : 'second',
  };
}

/** The worked reasoning shared by the questions that ask which curve is higher. */
function sidesSolution({ first, second, roots, lower, upper, verdict }: SidesParams) {
  const gap = polySub(first, second);
  const k = coefficientOf(gap, 2);
  const inside = roots.find((root) => root > lower && root < upper);
  const at = testPoint(lower, upper);
  return [
    { text: 'Subtract one curve from the other and see where the difference is positive.' },
    {
      tex: stacked(
        `\\left(${polyTex(first)}\\right)`,
        `- \\left(${polyTex(second)}\\right)`,
        `= ${polyTex(gap)}`,
        `= ${factorisedTex(k, roots[0], roots[1])}`,
      ),
    },
    {
      text: `The curves meet where this is zero, at $x = ${roots[0]}$ and $x = ${roots[1]}$, and only there can the higher one change.`,
    },
    verdict === 'cross'
      ? {
          text: `$x = ${inside}$ lies strictly between $${lower}$ and $${upper}$, so the curves cross inside the interval and each is on top for part of it.`,
        }
      : {
          text: `Neither meeting point lies strictly between $${lower}$ and $${upper}$, so one curve is higher all the way across. At $x = ${at}$ the difference is $${polyAt(gap, at)}$, so $y = ${polyTex(verdict === 'first' ? first : second)}$ is on top.`,
        },
  ];
}

/** Which curve is higher across an interval, or do they cross in it? */
const whichAbove: Generator<SidesParams> = {
  id: 'int-which-above',
  // Crossing is always on offer, but only a correct answer at difficulty 2,
  // after the lesson on curves that cross.
  sample: (rng, difficulty) => sampleSides(rng, difficulty, difficulty > 1),
  render: ({ first, second, lower, upper, verdict }): Slide => {
    const choices = [
      { id: 'first', label: `y = ${polyTex(first)}`, tex: true },
      { id: 'second', label: `y = ${polyTex(second)}`, tex: true },
      { id: 'cross', label: '\\text{they cross in between}', tex: true },
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Between $x = ${lower}$ and $x = ${upper}$, which curve is higher all the way across, or do they cross in between?`,
        },
      ],
      options: turned(choices, lower + 2 * upper + coefficientOf(second, 0)),
      correctId: verdict,
    };
  },
  solution: sidesSolution,
};

/**
 * The same decision as a route through the method: do they cross, and if not,
 * which is on top — and so which integral, or pair of integrals, gives the area.
 */
const regionFlow: Generator<SidesParams> = {
  id: 'int-region-flow',
  sample: (rng, difficulty) => sampleSides(rng, difficulty, true),
  render: ({ first, second, lower, upper, verdict }): Slide => ({
    kind: 'flow',
    prompt: [
      {
        kind: 'prose',
        text: `Decide how to find the area between these curves from $x = ${lower}$ to $x = ${upper}$. Each answer chooses what gets asked next.`,
      },
    ],
    subject: `\\begin{aligned} y_1 &= ${polyTex(first)} \\\\ y_2 &= ${polyTex(second)} \\end{aligned}`,
    steps: [
      {
        id: 'cross',
        ask: `Do the curves cross strictly between $x = ${lower}$ and $x = ${upper}$? Solve $y_1 = y_2$ and see whether a solution lies inside.`,
        branches: [
          {
            label: 'Yes',
            outcome:
              'Neither curve is on top all the way, so split at the crossing point, integrate $y_1 - y_2$ over each piece, and add the sizes of the two results.',
          },
          { label: 'No', to: 'top' },
        ],
      },
      {
        id: 'top',
        ask: `Which curve is higher across the interval? Try a value of $x$ between $${lower}$ and $${upper}$.`,
        branches: [
          {
            label: '$y_1$',
            outcome: `One integral does it: $\\int_{${lower}}^{${upper}} \\left(y_1 - y_2\\right) dx$ is the area.`,
          },
          {
            label: '$y_2$',
            outcome: `One integral does it: $\\int_{${lower}}^{${upper}} \\left(y_2 - y_1\\right) dx$ is the area.`,
          },
        ],
      },
    ],
    answer: verdict === 'cross' ? ['Yes'] : ['No', verdict === 'first' ? '$y_1$' : '$y_2$'],
  }),
  solution: sidesSolution,
};

interface MeetParams {
  /** Always a parabola. */
  curve: Poly;
  /** A line, or at difficulty 2 sometimes a second parabola. */
  other: Poly;
  p: number;
  q: number;
  /** True when the question names `other` first. */
  swap: boolean;
}

/**
 * A parabola and a line (or a second parabola) meeting at two whole points.
 *
 * Built from the meeting points outward: the gap between the curves is
 * k(x - p)(x - q), and the second curve is drawn freely and added to it. That
 * varies both curves and the coefficients together, which is what keeps the
 * pool wide even though the answers are whole numbers from a short range.
 */
function sampleMeet(rng: Rng, difficulty: number): MeetParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const p = rng.int(-4, 2);
      const q = p + rng.int(1, 4);
      const k = rng.sign() * rng.int(1, hard ? 2 : 1);
      const other = [rng.int(-6, 6), rng.int(-4, 4), hard ? rng.pick([-1, 0, 0, 1]) : 0];
      return { curve: polyAdd(other, fromRoots(k, p, q)), other, p, q, swap: rng.int(0, 1) === 1 };
    },
    ({ curve, other }) => coefficientOf(curve, 2) !== 0 && other.some((value) => value !== 0),
    { curve: [-1, 0, 1], other: [1, 1, 0], p: -1, q: 2, swap: false },
  );
}

function meetNames({ curve, other, swap }: MeetParams): [string, string] {
  return swap ? [polyTex(other), polyTex(curve)] : [polyTex(curve), polyTex(other)];
}

function meetSolution({ curve, other, p, q }: MeetParams) {
  const gap = polySub(curve, other);
  const k = coefficientOf(gap, 2);
  return [
    { text: 'Where the curves meet they share a $y$ value, so set the two right-hand sides equal and gather everything on one side.' },
    { tex: stacked(`${polyTex(curve)}`, `= ${polyTex(other)}`) },
    { tex: stacked(`${polyTex(gap)} = 0`, `${factorisedTex(k, p, q)} = 0`) },
    {
      text: `So $x = ${p}$ or $x = ${q}$. These are the limits of the region the curves enclose: it runs from one meeting point to the other.`,
    },
  ];
}

/** Where a parabola and a line (or two parabolas) meet, placed as tiles. */
const meetPoints: Generator<MeetParams> = {
  id: 'int-meet-points',
  sample: sampleMeet,
  render: (params): Slide => {
    const { p, q } = params;
    const [first, second] = meetNames(params);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Where do $y = ${first}$ and $y = ${second}$ meet? Place the two $x$-coordinates.`,
        },
      ],
      template: 'x = {0} \\quad \\text{and} \\quad x = {1}',
      // Each root with its sign flipped is the slip factorising invites.
      bank: wholeBank([p, q], [-p, -q, p + q, p * q]),
      answer: [`${p}`, `${q}`],
      unordered: true,
    };
  },
  solution: meetSolution,
};

interface MeetSliderParams extends MeetParams {
  /** How far the track runs past each meeting point, so the answer's place on it varies. */
  left: number;
  right: number;
}

/** Where the handle rests before it is touched: the snapped middle of the track. */
const restingOn = (min: number, max: number): number => min + Math.round((max - min) / 2);

/**
 * The right-hand meeting point, dragged to on a picture of the two curves.
 *
 * The algebra and the picture are one fact seen twice, and a learner who has
 * solved for the limits should be able to point at them. The track is framed
 * round the meeting points with a margin drawn each side, so the picture is
 * about the region rather than mostly empty, and the answer sits at no fixed
 * distance from either end. It is never where the handle rests.
 */
const meetSlider: Generator<MeetSliderParams> = {
  id: 'int-meet-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ ...sampleMeet(rng, difficulty), left: rng.int(2, 4), right: rng.int(2, 4) }),
      ({ p, q, left, right }) => q !== restingOn(p - left, q + right),
      { curve: [-1, 0, 1], other: [1, 1, 0], p: -1, q: 2, swap: false, left: 2, right: 3 },
    ),
  render: (params): Slide => {
    const { curve, other, p, q, left, right } = params;
    const [first, second] = meetNames(params);
    const min = p - left;
    const max = q + right;
    const { yMin, yMax } = windowFor([curve, other], p - 1, q + 1);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curves $y = ${first}$ and $y = ${second}$ meet twice. Slide the marker to the right-hand meeting point.`,
        },
      ],
      min,
      max,
      step: 1,
      answer: q,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: min,
          xMax: max,
          yMin,
          yMax,
          curves: [{ f: (x) => polyAt(curve, x) }, { f: (x) => polyAt(other, x), accent: true }],
          label: 'Two curves crossing each other twice',
        }),
        ...markerWindow(min, max),
        axis: 'x',
      },
    };
  },
  solution: meetSolution,
};

/**
 * Which integral gives the enclosed area?
 *
 * The setting-up step on its own: the limits from the meeting points, and the
 * integrand the right way round. The distractors are the three ways the set-up
 * goes wrong — upside down, limits with their signs flipped, and the upper curve
 * integrated as if the lower one were the axis.
 */
const setupIntegral: Generator<MeetParams> = {
  id: 'int-setup-integral',
  sample: sampleMeet,
  render: (params): Slide => {
    const { curve, other, p, q } = params;
    const [first, second] = meetNames(params);
    const k = coefficientOf(polySub(curve, other), 2);
    // Between the roots k(x - p)(x - q) has the opposite sign to k.
    const top = k < 0 ? curve : other;
    const gap = fromRoots(-Math.abs(k), p, q);
    const integral = (from: number, to: number, body: Poly) =>
      `\\int_{${from}}^{${to}} \\left(${polyTex(body)}\\right) dx`;
    const wrongLimits = p + q === 0 ? integral(0, q, gap) : integral(-q, -p, gap);
    const choices = distinctOptions([
      { id: 'right', label: integral(p, q, gap), tex: true },
      { id: 'reversed', label: integral(p, q, polyScale(gap, -1)), tex: true },
      { id: 'limits', label: wrongLimits, tex: true },
      { id: 'top-only', label: integral(p, q, top), tex: true },
    ]);
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which integral gives the area of the region enclosed by $y = ${first}$ and $y = ${second}$?`,
        },
      ],
      options: turned(choices, p + 3 * q + coefficientOf(other, 0)),
      correctId: 'right',
    };
  },
  solution: (params) => {
    const { curve, other, p, q } = params;
    const k = coefficientOf(polySub(curve, other), 2);
    const top = k < 0 ? curve : other;
    const bottom = k < 0 ? other : curve;
    const at = testPoint(p, q);
    return [
      ...meetSolution(params).slice(0, 3),
      { text: `So the limits are $${p}$ and $${q}$. Between them, at $x = ${at}$, $y = ${polyTex(top)}$ gives $${polyAt(top, at)}$ and $y = ${polyTex(bottom)}$ gives $${polyAt(bottom, at)}$, so the first is on top.` },
      {
        tex: stacked(
          `\\left(${polyTex(top)}\\right)`,
          `- \\left(${polyTex(bottom)}\\right)`,
          `= ${polyTex(polySub(top, bottom))}`,
        ),
      },
      { text: 'Upper minus lower, between the meeting points. Nothing about the axis enters into it.' },
    ];
  },
};

interface EnclosedParams {
  top: Poly;
  bottom: Poly;
  p: number;
  q: number;
  /** The gap is k(x - p)(q - x), so the area is k(q - p)^3 / 6. */
  k: number;
  /** True when the question names the lower curve first. */
  swap: boolean;
}

/**
 * Widths and scales for which the enclosed area k w^3 / 6 is whole.
 *
 * Found by listing rather than by rounding: of the pairs a learner would
 * recognise, only these divide exactly, and restricting to them costs nothing
 * in the pool because the curves around the gap still vary freely.
 */
function wholeSegments(maxWidth: number, maxScale: number): [number, number][] {
  const out: [number, number][] = [];
  for (let width = 2; width <= maxWidth; width += 1) {
    for (let scale = 1; scale <= maxScale; scale += 1) {
      if ((scale * width ** 3) % 6 === 0) out.push([width, scale]);
    }
  }
  return out;
}

/** A region enclosed by a parabola and a line, or by two parabolas. */
function sampleEnclosed(rng: Rng, difficulty: number, pair: boolean): EnclosedParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const [width, k] = rng.pick(wholeSegments(hard ? 5 : 4, hard ? 6 : 4));
      const p = rng.int(-3, 2);
      const q = p + width;
      // Positive between the roots: the height of the region at each x.
      const gap = fromRoots(-k, p, q);
      const other = [rng.int(-6, 6), rng.int(-4, 4), pair ? rng.pick([-2, -1, 1, 2]) : 0];
      const otherOnTop = rng.int(0, 1) === 1;
      return {
        top: otherOnTop ? other : polyAdd(other, gap),
        bottom: otherOnTop ? polySub(other, gap) : other,
        p,
        q,
        k,
        swap: rng.int(0, 1) === 1,
      };
    },
    ({ top, bottom }) =>
      (pair
        ? coefficientOf(top, 2) !== 0 && coefficientOf(bottom, 2) !== 0
        : coefficientOf(top, 2) === 0 || coefficientOf(bottom, 2) === 0) &&
      top.some((value) => value !== 0) &&
      bottom.some((value) => value !== 0),
    pair
      ? { top: [4, 0, -1], bottom: [-4, 0, 1], p: -2, q: 2, k: 2, swap: false }
      : { top: [4, 0, 0], bottom: [-5, 0, 1], p: -3, q: 3, k: 1, swap: false },
  );
}

const enclosedArea = ({ p, q, k }: EnclosedParams) => (k * (q - p) ** 3) / 6;

/**
 * The slips of a parabolic segment's area that land on a whole number: the
 * box round it (width times greatest height, 3/2 of the answer) and the
 * triangle inside it (3/4 of the answer).
 */
function enclosedChoices(params: EnclosedParams) {
  const { p, q, k } = params;
  const area = enclosedArea(params);
  const cube = k * (q - p) ** 3;
  const whole = [cube / 4, cube / 8].filter((value) => Number.isInteger(value));
  // Subtracting only the lower curve's leading term and adding the rest of it,
  // integrated between the right limits. It depends on the curves themselves,
  // which also spreads the correct answer across the four slots: the other
  // options depend only on the width and the scale, so on their own they
  // rotate the same way for every question of one size.
  const [b0, b1] = [coefficientOf(params.bottom, 0), coefficientOf(params.bottom, 1)];
  const unbracketed = area + 2 * b0 * (q - p) + b1 * (q * q - p * p);
  return options(
    { tex: `${area}`, answer: `${area}` },
    { tex: `${-area}`, answer: `${-area}` },
    { tex: `${unbracketed}`, answer: `${unbracketed}` },
    ...whole.map((value) => ({ tex: `${value}`, answer: `${value}` })),
    { tex: `${area + q - p}`, answer: `${area + q - p}` },
  ).slice(0, 4);
}

function enclosedRender(params: EnclosedParams): Slide {
  const { top, bottom, swap, p, q } = params;
  const [first, second] = named(top, bottom, swap);
  return {
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Find the area of the region enclosed by $y = ${first}$ and $y = ${second}$.`,
      },
    ],
    lead: '\\text{area} =',
    keypad: [],
    answer: `${enclosedArea(params)}`,
    integrand: polyAnswer(polySub(top, bottom)),
    limits: [p, q],
    domain: 'real',
    mode: 'exact',
  };
}

function enclosedSolution(params: EnclosedParams) {
  const { top, bottom, p, q, k } = params;
  const gap = polySub(top, bottom);
  const at = testPoint(p, q);
  return [
    { text: 'No limits are given, so they are where the curves meet. Set the curves equal and solve.' },
    { tex: stacked(`${polyTex(gap)} = 0`, `${factorisedTex(-k, p, q)} = 0`) },
    {
      text: `They meet at $x = ${p}$ and $x = ${q}$. At $x = ${at}$, between them, $y = ${polyTex(top)}$ gives $${polyAt(top, at)}$ and $y = ${polyTex(bottom)}$ gives $${polyAt(bottom, at)}$, so the first is on top.`,
    },
    {
      tex: stacked(
        `\\int_{${p}}^{${q}} \\left(${polyTex(gap)}\\right) dx`,
        `= \\left[${antiTex(gap)}\\right]_{${p}}^{${q}}`,
        `= ${enclosedArea(params)}`,
      ),
    },
    {
      text: `A check that needs no integrating: when top minus bottom is $k(x - p)(q - x)$ the area is $\\frac{k}{6}(q - p)^{3}$, here $\\frac{${k}}{6} \\times ${q - p}^{3} = ${enclosedArea(params)}$.`,
    },
  ];
}

/** The area enclosed by a parabola and a line: find the limits, then integrate. */
const enclosedByLine: Generator<EnclosedParams> = {
  id: 'int-enclosed-area',
  sample: (rng, difficulty) => sampleEnclosed(rng, difficulty, false),
  choices: enclosedChoices,
  render: enclosedRender,
  solution: enclosedSolution,
};

/**
 * The area enclosed by two parabolas.
 *
 * The same method with nothing new in it except the moment of doubt: the
 * difference of two quadratics is another quadratic, and once it is simplified
 * the question is the one the learner has already done.
 */
const enclosedByParabolas: Generator<EnclosedParams> = {
  id: 'int-parabolas-area',
  sample: (rng, difficulty) => sampleEnclosed(rng, difficulty, true),
  choices: enclosedChoices,
  render: enclosedRender,
  solution: (params) => [
    {
      text: 'Both curves have an $x^{2}$ term, but their difference is still a single quadratic, and that is all the method needs.',
    },
    ...enclosedSolution(params),
  ],
};

interface SixthParams {
  k: number;
  p: number;
  q: number;
}

/** (q - x) as it would be written by hand. */
function rightFactorTex(q: number): string {
  return `(${q} - x)`;
}

/**
 * The one-sixth rule, k(q - p)^3 / 6, reduced one piece at a time.
 *
 * Every region in this level whose top minus bottom is a quadratic has this
 * area, which makes it both a shortcut and a check on the long way. As a
 * `reduce` the order matters — the bracket before the cube, the cube before the
 * multiplication — and the banks hold the slips each step invites: adding the
 * limits, multiplying by three instead of cubing, dividing by three.
 */
const sixthRule: Generator<SixthParams> = {
  id: 'int-sixth-rule',
  sample: (rng, difficulty) => {
    const [width, k] = rng.pick(wholeSegments(difficulty > 1 ? 6 : 3, 6));
    const p = rng.int(-3, 3);
    return { k, p, q: p + width };
  },
  choices: ({ k, p, q }) => {
    const cube = k * (q - p) ** 3;
    // Cubing each limit and subtracting, k(q^3 - p^3)/6. Always whole, since
    // k(q - p) is a multiple of six whenever k(q - p)^3 is, and it is the one
    // option that moves with the limits rather than only with the width.
    const eachCubed = (k * (q ** 3 - p ** 3)) / 6;
    return options(
      { tex: `${cube / 6}`, answer: `${cube / 6}` },
      { tex: `${eachCubed}`, answer: `${eachCubed}` },
      { tex: `${cube / 3}`, answer: `${cube / 3}` },
      { tex: `${cube / 2}`, answer: `${cube / 2}` },
      { tex: `${cube}`, answer: `${cube}` },
    ).slice(0, 4);
  },
  render: ({ k, p, q }): Slide => {
    const width = q - p;
    const cube = width ** 3;
    const gap = fromRoots(-k, p, q);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Two curves meet at $x = ${p}$ and $x = ${q}$, and top minus bottom is $${polyTex(gap)}$, which is $${k === 1 ? '' : k}${factorTex(p)}${rightFactorTex(q)}$. For a gap of that shape the area is $\\frac{k}{6}(q - p)^{3}$. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr: bin('/', bin('*', num(k), pow(bin('-', num(q), num(p)), num(3))), num(6)),
      banks: {
        'r.l.r.b': bank4(width, q + p, p - q, q),
        'r.l.r': bank4(cube, 3 * width, width * width, (q + p) ** 3),
        'r.l': bank4(k * cube, k + cube, k * width, cube),
        r: bank4((k * cube) / 6, (k * cube) / 3, (k * cube) / 2, k * cube),
      },
    };
  },
  solution: ({ k, p, q }) => {
    const width = q - p;
    const area = (k * width ** 3) / 6;
    return [
      { text: `The curves meet at $${p}$ and $${q}$, so the width of the region is $${q} - \\left(${p}\\right) = ${width}$.` },
      {
        tex: stacked(
          `\\frac{${k}}{6} \\times ${width}^{3}`,
          `= \\frac{${k} \\times ${width ** 3}}{6}`,
          `= \\frac{${k * width ** 3}}{6} = ${area}`,
        ),
      },
      {
        text: `The long way gives the same: $\\int_{${p}}^{${q}} ${k === 1 ? '' : k}${factorTex(p)}${rightFactorTex(q)} \\, dx = ${area}$. The rule is that integral done once in general, which is why it only applies when top minus bottom is a quadratic.`,
      },
      { text: 'Cube the width before multiplying, and divide by six, not three: the sixth comes from the integral, not from the number of terms.' },
    ];
  },
};

interface CrossingParams {
  first: Poly;
  second: Poly;
  lower: number;
  /** Where the curves cross, strictly inside the interval. */
  cross: number;
  upper: number;
}

/**
 * Two curves crossing once inside an interval, each piece of the region a
 * whole number.
 *
 * The gap is a line through the crossing point, or at difficulty 2 sometimes a
 * quadratic whose other root lies outside the interval. Drafts whose pieces are
 * not whole are rejected using `sixIntegral`'s exact arithmetic.
 *
 * The widths are 2, 4 and 5 for the oracle's sake. It integrates |gap| by
 * Simpson's rule on 1000 steps, which is exact on each side of the kink at the
 * crossing only if the kink falls on an even node — true for these widths at
 * every whole crossing point, and false for a width of 3.
 */
function sampleCrossing(rng: Rng, difficulty: number): CrossingParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const width = rng.pick([2, 4, 5]);
      const lower = rng.int(-3, 1);
      const upper = lower + width;
      const cross = rng.int(lower + 1, upper - 1);
      let gap: Poly;
      if (!hard || rng.int(0, 1) === 0) {
        const slope = rng.sign() * 2 * rng.int(1, 2);
        gap = [-slope * cross, slope];
      } else {
        const beyond = rng.pick([lower - 2, lower - 1, lower, upper, upper + 1, upper + 2]);
        gap = fromRoots(rng.sign() * rng.int(1, 3), cross, beyond);
      }
      const second = [rng.int(-5, 5), rng.int(-3, 3), rng.pick([-1, 1, 2])];
      return { first: polyAdd(second, gap), second, lower, cross, upper };
    },
    ({ first, second, lower, cross, upper }) => {
      const gap = polySub(first, second);
      const left = sixIntegral(gap, lower, cross);
      const right = sixIntegral(gap, cross, upper);
      return (
        left % 6 === 0 &&
        right % 6 === 0 &&
        Math.abs(left) + Math.abs(right) <= 6 * 60 &&
        first.some((value) => value !== 0)
      );
    },
    { first: [-3, 2, 1], second: [-1, 0, 1], lower: 0, cross: 1, upper: 2 },
  );
}

/** The two signed pieces of the integral, split at the crossing point. */
function crossingPieces({ first, second, lower, cross, upper }: CrossingParams): [number, number] {
  const gap = polySub(first, second);
  return [sixIntegral(gap, lower, cross) / 6, sixIntegral(gap, cross, upper) / 6];
}

function crossingSolution(params: CrossingParams) {
  const { first, second, lower, cross, upper } = params;
  const gap = polySub(first, second);
  const [left, right] = crossingPieces(params);
  return [
    {
      text: `The curves cross at $x = ${cross}$, inside the interval, so the higher curve changes there. Split the integral at the crossing and integrate the difference over each piece.`,
    },
    {
      tex: stacked(`\\left(${polyTex(first)}\\right)`, `- \\left(${polyTex(second)}\\right)`, `= ${polyTex(gap)}`),
    },
    { tex: stacked(`\\int_{${lower}}^{${cross}} \\left(${polyTex(gap)}\\right) dx`, `= ${left}`) },
    { tex: stacked(`\\int_{${cross}}^{${upper}} \\left(${polyTex(gap)}\\right) dx`, `= ${right}`) },
    {
      text: `One piece is negative because the other curve is on top there. Add the sizes: $${Math.abs(left)} + ${Math.abs(right)} = ${Math.abs(left) + Math.abs(right)}$. Integrating straight through gives $${left + right}$, where the two pieces cancel.`,
    },
  ];
}

/** The total area between two curves that cross inside the interval. */
const crossingArea: Generator<CrossingParams> = {
  id: 'int-crossing-area',
  sample: sampleCrossing,
  choices: (params) => {
    const { first, second, lower, cross, upper } = params;
    const [left, right] = crossingPieces(params);
    const total = Math.abs(left) + Math.abs(right);
    // Splitting one step away from the crossing, where the interval allows it:
    // the method right and the crossing point wrong. It depends on the shape
    // of the curves rather than only on the two pieces, which is also what
    // keeps the correct option from settling into the same slots.
    const gap = polySub(first, second);
    const wrong = cross + 1 < upper ? cross + 1 : cross - 1;
    const misplaced =
      wrong > lower
        ? (Math.abs(sixIntegral(gap, lower, wrong)) + Math.abs(sixIntegral(gap, wrong, upper))) / 6
        : Number.NaN;
    return options(
      { tex: `${total}`, answer: `${total}` },
      // Integrating straight through the crossing.
      { tex: `${Math.abs(left + right)}`, answer: `${Math.abs(left + right)}` },
      ...(Number.isInteger(misplaced) ? [{ tex: `${misplaced}`, answer: `${misplaced}` }] : []),
      // Only the larger piece.
      { tex: `${Math.max(Math.abs(left), Math.abs(right))}`, answer: `${Math.max(Math.abs(left), Math.abs(right))}` },
      { tex: `${left + right}`, answer: `${left + right}` },
      { tex: `${total + upper - lower}`, answer: `${total + upper - lower}` },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const { first, second, lower, cross, upper } = params;
    const [left, right] = crossingPieces(params);
    // Given outright at difficulty 1; at difficulty 2 the learner finds it,
    // and discards the other root of a quadratic gap, which lies outside.
    const where = (params.first[2] ?? 0) === (params.second[2] ?? 0)
      ? `cross at $x = ${cross}$`
      : `cross once between $x = ${lower}$ and $x = ${upper}$`;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The curves $y = ${polyTex(first)}$ and $y = ${polyTex(second)}$ ${where}. Find the total area between them from $x = ${lower}$ to $x = ${upper}$.`,
        },
      ],
      lead: '\\text{area} =',
      keypad: [],
      answer: `${Math.abs(left) + Math.abs(right)}`,
      integrand: `abs(${polyAnswer(polySub(first, second))})`,
      limits: [lower, upper],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: crossingSolution,
};

/**
 * The two pieces and their total, as a tree.
 *
 * The signed pieces go in the top row as they come out of the integral, one of
 * them negative, and only the box below turns them into an area. That keeps
 * "integrate" and "take the size" as two visible steps, which is exactly where
 * the typed question's wrong answers come from.
 */
const crossingTree: Generator<CrossingParams> = {
  id: 'int-crossing-pieces',
  sample: sampleCrossing,
  render: (params): Slide => {
    const { first, second, lower, cross, upper } = params;
    const [left, right] = crossingPieces(params);
    const answer = [left, right, Math.abs(left) + Math.abs(right)];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The curves $y_1 = ${polyTex(first)}$ and $y_2 = ${polyTex(second)}$ cross at $x = ${cross}$. Write $D(x) = y_1 - y_2$. Fill the top row with the integral of $D$ over each piece, left piece first, and the box below with the total area.`,
        },
      ],
      expression: `\\left|\\int_{${lower}}^{${cross}} D \\, dx\\right| + \\left|\\int_{${cross}}^{${upper}} D \\, dx\\right|`,
      nodes: [
        { id: 'left-piece', from: [] },
        { id: 'right-piece', from: [] },
        { id: 'total', from: ['left-piece', 'right-piece'] },
      ],
      bank: wholeBank(answer, [left + right, -left, -right, Math.abs(left) - Math.abs(right)]),
      answer: answer.map(String),
    };
  },
  solution: crossingSolution,
};

interface NetParams {
  lower: number;
  upper: number;
  /** Area of the part where y_1 is higher. */
  above: number;
  /** Area of the part where y_2 is higher. */
  below: number;
  ask: 'net' | 'total' | 'reversed';
}

/**
 * The signed integral against the area, with the pieces already known.
 *
 * The integration counterpart of `int-signed-area` for two curves: nothing to
 * integrate, only the question of what the integral of y_1 - y_2 counts. It
 * counts the part where y_2 is higher as negative, and the area does not.
 */
const netBetween: Generator<NetParams> = {
  id: 'int-net-between',
  sample: (rng, difficulty) => {
    const lower = rng.int(-3, 2);
    return drawUntil(
      () => ({
        lower,
        upper: lower + rng.int(2, 5),
        above: rng.int(2, 20),
        below: rng.int(2, 20),
        ask: rng.pick(difficulty > 1 ? (['net', 'total', 'reversed'] as const) : (['net', 'total'] as const)),
      }),
      ({ above, below }) => above !== below,
      { lower, upper: lower + 3, above: 7, below: 4, ask: 'net' },
    );
  },
  render: ({ lower, upper, above, below, ask }): Slide => {
    const choices = distinctOptions([
      { id: 'net', label: `${above - below}`, tex: true },
      { id: 'reversed', label: `${below - above}`, tex: true },
      { id: 'total', label: `${above + below}`, tex: true },
      { id: 'larger', label: `${Math.max(above, below)}`, tex: true },
    ]);
    const question =
      ask === 'total'
        ? 'the total area between the curves'
        : ask === 'net'
          ? `$\\int_{${lower}}^{${upper}} \\left(y_1 - y_2\\right) dx$`
          : `$\\int_{${lower}}^{${upper}} \\left(y_2 - y_1\\right) dx$`;
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The curves $y_1$ and $y_2$ cross once between $x = ${lower}$ and $x = ${upper}$. Where $y_1$ is higher the region between them has area $${above}$; where $y_2$ is higher, $${below}$. What is ${question}?`,
        },
      ],
      options: turned(choices, above + 2 * below + lower),
      correctId: ask,
    };
  },
  solution: ({ lower, upper, above, below, ask }) => [
    {
      text: 'The integral of $y_1 - y_2$ counts the part where $y_1$ is higher as positive and the part where $y_2$ is higher as negative, because there the difference is negative.',
    },
    { tex: stacked(`\\int_{${lower}}^{${upper}} \\left(y_1 - y_2\\right) dx`, `= ${above} - ${below} = ${above - below}`) },
    ask === 'reversed'
      ? { text: `Swapping the curves swaps every sign, so $\\int \\left(y_2 - y_1\\right) dx = ${below - above}$.` }
      : { text: `Area counts both parts as positive: $${above} + ${below} = ${above + below}$.` },
    {
      text: ask === 'total'
        ? 'So the area is the sum of the sizes. The integral straight through is a signed total, useful for other things but not for this.'
        : 'The integral straight through is a signed total, and it is what was asked. The area would be the sum of the sizes.',
    },
  ],
};

/* ---------- Level 5: volumes of revolution ---------- */

/*
 * Every volume in this level is a rational multiple of pi, and the answer has
 * to carry that pi without blinding the quadrature oracle. The oracle reads a
 * definite integral's answer with `Number()`, so `26*pi/3` reads as NaN there;
 * stripping the pi out of the question instead ("V = k pi, find k") asks for a
 * number no textbook asks for. So `answer` holds the volume as a decimal, pi
 * included, and `alsoAccepts` holds the exact writing, which a test grades
 * against it under the slide's own mode. The learner types `26pi/3`, as a
 * textbook leaves it, and the checker compares numbers either way. The
 * integrand is declared with its pi, `pi * (...)^2`, so the oracle checks the
 * factor of pi as well as the integral.
 *
 * Every curve squared is a polynomial of degree four at most, the root forms
 * included (clearing the root is what squaring is for), so `sixtyIntegral`
 * does the arithmetic exactly and nothing is rounded into an answer.
 */

/** Number entry with a pi key; `/` is what puts the fraction key on the pad. */
const VOLUME_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

function polyMul(a: Poly, b: Poly): Poly {
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => 0);
  a.forEach((x, i) =>
    b.forEach((y, j) => {
      out[i + j] += x * y;
    }),
  );
  return out;
}

/**
 * Sixty times the integral of `p` from `a` to `b`.
 *
 * `sixIntegral` stops at degree two; a squared quadratic reaches degree four,
 * whose antiderivative divides by five. Sixty is the smallest number every
 * one of 1 to 5 divides, so this is whole for whole coefficients and limits,
 * and a volume can be carried as an exact fraction of pi.
 */
function sixtyIntegral(p: Poly, a: number, b: number): number {
  return p.reduce(
    (total, value, power) => total + value * (60 / (power + 1)) * (b ** (power + 1) - a ** (power + 1)),
    0,
  );
}

/** A fraction in lowest terms, the sign on top. */
interface Ratio {
  n: number;
  d: number;
}

const sixtieths = (sixty: number): Ratio => reduce(sixty, 60);

const times = ({ n, d }: Ratio, k: number): Ratio => reduce(n * k, d);

/** A fraction as the learner reads it: `\frac{26}{3}`, `12`. */
function ratioTex({ n, d }: Ratio): string {
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
}

/** The same fraction subtracted from something, bracketed when negative. */
function subtrahendTex(r: Ratio): string {
  return r.n < 0 ? `\\left(${ratioTex(r)}\\right)` : ratioTex(r);
}

/** A multiple of pi as a textbook leaves it: `\frac{26\pi}{3}`, `12\pi`, `\pi`. */
function piTex({ n, d }: Ratio): string {
  if (n === 0) return '0';
  const size = Math.abs(n);
  const pi = size === 1 ? '\\pi' : `${size}\\pi`;
  const sign = n < 0 ? '-' : '';
  return d === 1 ? `${sign}${pi}` : `${sign}\\frac{${pi}}{${d}}`;
}

/** The grader's copy: a decimal, so the quadrature oracle can read it. See the note above. */
const piValue = ({ n, d }: Ratio): string => `${(n * Math.PI) / d}`;

/** The exact writing, which a test proves the decimal accepts. */
const piExact = ({ n, d }: Ratio): string => `(${n}/${d})*pi`;

const piOption = (r: Ratio) => ({ tex: piTex(r), answer: piExact(r) });

/** The right number with the pi left off. */
const bareOption = (r: Ratio) => ({ tex: ratioTex(r), answer: `${r.n}/${r.d}` });

/** A whole multiple of pi as a tile. */
function piWhole(n: number): string {
  return piTex({ n, d: 1 });
}

/** A polynomial written in y rather than x. `polyTex` writes no other letter. */
const inY = (tex: string): string => tex.replace(/x/g, 'y');

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** A slot number spread evenly from a question's parameters. */
const mix = (...xs: number[]): number =>
  xs.reduce((h, x) => Math.imul(h ^ (x + 0x9e37), 0x5bd1e995) >>> 0, 17) >>> 7;

/**
 * Options for a derived `+choice` form, ordered so the answer lands in the slot
 * the question's own numbers pick.
 *
 * `choiceVariant` turns the options by a hash of their labels, and labels that
 * are multiples of pi share most of their characters, which leaves the hash
 * uneven. This tries orders of the options until the hash rotation puts the
 * answer at `salt`. A copy of `steered` in `complexPlane.ts`, which mirrors the
 * private `rotation` in `choiceVariant.ts`; if that changes, the answer is
 * still on offer and only its slot drifts.
 */
function steered(opts: ChoiceOption[], salt: number): ChoiceOption[] {
  const turnOf = (list: ChoiceOption[]) => {
    let hash = 0;
    for (const option of list) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % list.length;
  };
  const target = mod(salt, opts.length);
  const orders = (list: ChoiceOption[]): ChoiceOption[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((head, idx) =>
          orders([...list.slice(0, idx), ...list.slice(idx + 1)]).map((rest) => [head, ...rest]),
        );
  for (const order of orders(opts)) {
    const at = order.findIndex((option) => option.correct);
    if (mod(at - turnOf(order), order.length) === target) return order;
  }
  return opts;
}

/** A native choice's options with the right one placed at the slot `salt` picks. */
function slotted<T>(correct: T, rest: T[], salt: number): T[] {
  const slot = mod(salt, rest.length + 1);
  return [...rest.slice(0, slot), correct, ...rest.slice(slot)];
}

/**
 * A region and the solid it sweeps out.
 *
 * The region is shaded as `betweenSvg` shades it, and the turn is suggested
 * the way it is drawn by hand: the edges that move carried to the far side of
 * the axis, dashed, and an ellipse at each flat face. Nothing here is a true
 * perspective drawing, which would need a 3D renderer for a picture whose job
 * is only to say "this region, spun round that axis, makes this".
 *
 * For a turn about the y-axis an `edges` curve is still y as a function of x,
 * and its far side is the reflection in the y-axis; a rim's `at` is then a
 * height and its radius a distance across.
 */
export function solidSvg(opts: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  top: (x: number) => number;
  bottom?: (x: number) => number;
  from: number;
  to: number;
  axis: 'x' | 'y';
  edges: { f: (x: number) => number; from: number; to: number }[];
  rims: { at: number; radius: number }[];
  label: string;
  height?: number;
}): string {
  const WIDTH = 280;
  const PAD = 12;
  const height = opts.height ?? 150;
  const px = (x: number) => PAD + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * (WIDTH - PAD * 2);
  const py = (y: number) => PAD + ((opts.yMax - y) / (opts.yMax - opts.yMin)) * (height - PAD * 2);
  const far = (x: number, y: number): [number, number] => (opts.axis === 'x' ? [x, -y] : [-x, y]);
  const ghosts = opts.edges.map(({ f, from, to }) => {
    const points = Array.from({ length: 61 }, (_, i) => {
      const x = from + ((to - from) * i) / 60;
      const [gx, gy] = far(x, f(x));
      return `${px(gx).toFixed(1)},${py(gy).toFixed(1)}`;
    });
    return `<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6" d="M ${points.join(' L ')}" />`;
  });
  const rims = opts.rims.map(({ at, radius }) => {
    const [cx, cy, rx, ry] =
      opts.axis === 'x'
        ? [px(at), py(0), 5, Math.abs(py(radius) - py(0))]
        : [px(0), py(at), Math.abs(px(radius) - px(0)), 5];
    return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.6" />`;
  });
  // `plotSvg` draws only the x-axis; a turn about the y-axis needs its own.
  const spindle =
    opts.axis === 'y'
      ? `<line x1="${px(0).toFixed(1)}" y1="${PAD}" x2="${px(0).toFixed(1)}" y2="${height - PAD}" stroke="currentColor" stroke-width="1" opacity="0.55" />`
      : '';
  const region = betweenSvg({
    xMin: opts.xMin,
    xMax: opts.xMax,
    yMin: opts.yMin,
    yMax: opts.yMax,
    top: opts.top,
    bottom: opts.bottom ?? (() => 0),
    from: opts.from,
    to: opts.to,
    label: opts.label,
    height,
  });
  const close = region.lastIndexOf('</svg>');
  return `${region.slice(0, close)}${spindle}${ghosts.join('')}${rims.join('')}${region.slice(close)}`;
}

/**
 * The curve that is turned: a polynomial, or k times the square root of one.
 *
 * Plain numbers rather than a function, so a question's parameters stay data.
 * The root forms are the ones squaring was made for: y^2 = k^2 (under) is a
 * polynomial, so the volume is as easy to find as an area.
 */
interface Profile {
  poly: Poly;
  root: boolean;
  k: number;
}

function profileTex({ poly, root, k }: Profile): string {
  if (!root) return polyTex(poly);
  const lead = k === 1 ? '' : `${k}`;
  // x^3 under a root is written the way a textbook writes it.
  if (poly.length === 4 && poly.every((value, power) => value === (power === 3 ? 1 : 0))) return `${lead}x\\sqrt{x}`;
  return `${lead}\\sqrt{${polyTex(poly)}}`;
}

function profileSquared({ poly, root, k }: Profile): Poly {
  return root ? polyScale(poly, k * k) : polyMul(poly, poly);
}

/** y at x: NaN outside a root's domain, which `plotSvg` skips when a curve has `breaks`. */
function profileAt({ poly, root, k }: Profile, x: number): number {
  return root ? k * Math.sqrt(polyAt(poly, x)) : polyAt(poly, x);
}

function profileAnswer({ poly, root, k }: Profile): string {
  return root ? `(${k}) * sqrt(${polyAnswer(poly)})` : polyAnswer(poly);
}

/** Each term squared on its own, cross terms lost: the slip squaring a bracket invites. */
function eachSquared(p: Poly): Poly {
  const out: Poly = Array.from({ length: 2 * p.length - 1 }, () => 0);
  p.forEach((value, power) => {
    out[2 * power] += value * value;
  });
  return out;
}

type ProfileForm = 'line' | 'parabola' | 'root';

function drawProfile(rng: Rng, difficulty: number, form: ProfileForm): Profile {
  const hard = difficulty > 1;
  if (form === 'line') {
    const m = rng.int(1, hard ? 4 : 3);
    return { poly: [rng.int(hard ? -2 : 0, hard ? 9 : 6), rng.chance(hard ? 0.4 : 0.25) ? -m : m], root: false, k: 1 };
  }
  if (form === 'parabola') {
    if (!hard) {
      return rng.int(0, 1) === 0
        ? { poly: [rng.int(0, 5), 0, 1], root: false, k: 1 }
        : { poly: [0, 0, rng.int(2, 3)], root: false, k: 1 };
    }
    // Two terms, never three: a squared three-term quadratic has five terms,
    // which runs off a phone in the working and as a tile.
    const a = rng.pick([-1, 1, 2, 3]);
    return rng.int(0, 1) === 0
      ? { poly: [rng.int(-3, 8), 0, a], root: false, k: 1 }
      : { poly: [0, rng.pick([-3, -2, -1, 1, 2, 3, 4]), a], root: false, k: 1 };
  }
  if (!hard) {
    return rng.int(0, 1) === 0
      ? { poly: [0, 1], root: true, k: rng.int(1, 4) }
      : { poly: [rng.int(1, 7), 1], root: true, k: 1 };
  }
  const shape = rng.int(0, 2);
  if (shape === 0) return { poly: [rng.int(-3, 6), rng.int(2, 5)], root: true, k: 1 };
  if (shape === 1) return { poly: [0, 0, 0, 1], root: true, k: rng.int(1, 2) };
  return { poly: [rng.int(1, 9), 0, 1], root: true, k: 1 };
}

/** A curve and the limits it is turned between. */
interface Turned {
  profile: Profile;
  a: number;
  b: number;
}

/**
 * A curve that stays on or above the axis between whole limits, so the region
 * under it is what gets turned and y is a radius all the way along.
 */
function sampleTurned(rng: Rng, difficulty: number, forms: ProfileForm[]): Turned {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const a = rng.int(0, 2);
      return { profile: drawProfile(rng, difficulty, rng.pick(forms)), a, b: a + rng.int(1, hard ? 3 : 2) };
    },
    ({ profile, a, b }) => {
      const sixty = sixtyIntegral(profileSquared(profile), a, b);
      return minOn(profile.poly, a, b) >= 0 && sixty > 0 && sixty <= 60 * (hard ? 400 : 160);
    },
    { profile: { poly: [1, 1], root: false, k: 1 }, a: 0, b: 2 },
  );
}

function turnedVolume({ profile, a, b }: Turned): Ratio {
  return sixtieths(sixtyIntegral(profileSquared(profile), a, b));
}

/** The worked solution to a volume about the x-axis: square, integrate, evaluate. */
function turnedSolution({ profile, a, b }: Turned) {
  const y = profileTex(profile);
  const squared = profileSquared(profile);
  const upper = sixtieths(sixtyIntegral(squared, 0, b));
  const lower = sixtieths(sixtyIntegral(squared, 0, a));
  return [
    { text: 'Square $y$ first, then integrate: the volume is $\\pi \\int_{a}^{b} y^{2} \\, dx$.' },
    { tex: stacked(`y^{2} = \\left(${y}\\right)^{2}`, `= ${polyTex(squared)}`) },
    {
      text: `That integrates to $${antiTex(squared)}$. Put in $x = ${b}$, then $x = ${a}$, and subtract.`,
    },
    {
      tex: stacked(
        `V = \\pi \\left(${ratioTex(upper)} - ${subtrahendTex(lower)}\\right)`,
        `= ${piTex(turnedVolume({ profile, a, b }))}`,
      ),
    },
    {
      text: profile.root
        ? 'Squaring removes the square root, which is why a root curve is often the easiest one to turn.'
        : 'Multiply the bracket out before integrating. Squaring each term on its own loses the middle term, and the volume with it.',
    },
  ];
}

/**
 * The wrong volumes worth offering: squaring term by term, integrating
 * without dividing by the new power, leaving the pi off, and 2 pi, which
 * belongs to a circumference rather than an area.
 */
function turnedChoices(params: Turned): ChoiceOption[] {
  const { profile, a, b } = params;
  const squared = profileSquared(profile);
  const right = turnedVolume(params);
  const undivided = reduce(
    squared.reduce((total, value, power) => total + value * (b ** (power + 1) - a ** (power + 1)), 0),
    1,
  );
  const termwise = profile.root ? times(right, 2) : sixtieths(sixtyIntegral(eachSquared(profile.poly), a, b));
  return steered(
    options(piOption(right), piOption(termwise), piOption(undivided), bareOption(right), piOption(times(right, 2))).slice(
      0,
      4,
    ),
    mix(a, b, ...squared),
  );
}

type SolidKind = 'cylinder' | 'cone' | 'frustum' | 'sphere' | 'hemisphere';

interface ShapeParams {
  kind: SolidKind;
  /** y = m x + c for the straight edges. For the round solids c is the radius. */
  m: number;
  c: number;
  from: number;
  to: number;
}

const SOLID_NAMES: Record<SolidKind, string> = {
  cylinder: 'A cylinder',
  cone: 'A cone',
  frustum: 'A frustum: a cone with its tip cut off',
  sphere: 'A sphere',
  hemisphere: 'A hemisphere',
};

const isRound = (kind: SolidKind): boolean => kind === 'sphere' || kind === 'hemisphere';

function shapeCurve({ kind, m, c }: ShapeParams): (x: number) => number {
  return isRound(kind) ? (x) => Math.sqrt(c * c - x * x) : (x) => m * x + c;
}

function shapeTex({ kind, m, c }: ShapeParams): string {
  return isRound(kind) ? `\\sqrt{${c * c} - x^{2}}` : polyTex([c, m]);
}

/**
 * What solid a region makes: the picture before any integral.
 *
 * Every solid a learner already has a formula for, so the level can later
 * check an integral against it. The region is shaded and the solid is not
 * drawn, since drawing it is the question.
 */
const volumeShape: Generator<ShapeParams> = {
  id: 'int-vol-shape',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<SolidKind>(
      hard ? ['cylinder', 'cone', 'frustum', 'sphere', 'hemisphere'] : ['cylinder', 'cone', 'frustum', 'sphere'],
    );
    if (kind === 'cylinder') {
      const from = rng.int(0, 3);
      return { kind, m: 0, c: rng.int(1, 6), from, to: from + rng.int(1, 5) };
    }
    if (kind === 'sphere') {
      const r = rng.int(1, 7);
      return { kind, m: 0, c: r, from: -r, to: r };
    }
    if (kind === 'hemisphere') {
      const r = rng.int(1, 7);
      return rng.int(0, 1) === 0 ? { kind, m: 0, c: r, from: 0, to: r } : { kind, m: 0, c: r, from: -r, to: 0 };
    }
    const m = rng.int(1, 3);
    if (kind === 'cone') {
      const length = rng.int(1, 5);
      // The tip at the origin, or at difficulty 2 sometimes at the far end,
      // where a falling line comes down to meet the axis.
      return hard && rng.int(0, 1) === 0
        ? { kind, m: -m, c: m * length, from: 0, to: length }
        : { kind, m, c: 0, from: 0, to: length };
    }
    if (hard && rng.int(0, 1) === 0) {
      const from = rng.int(1, 3);
      return { kind, m, c: 0, from, to: from + rng.int(1, 3) };
    }
    return { kind, m, c: rng.int(1, 4), from: 0, to: rng.int(1, 4) };
  },
  render: (params): Slide => {
    const { kind, from, to, c } = params;
    const f = shapeCurve(params);
    const high = Math.max(f(from), f(to), isRound(kind) ? c : 0);
    const others = (['cylinder', 'cone', 'frustum', kind === 'hemisphere' ? 'hemisphere' : 'sphere'] as SolidKind[])
      .filter((other) => other !== kind)
      .map((other) => ({ id: other, label: SOLID_NAMES[other] }));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The shaded region under $y = ${shapeTex(params)}$, from $x = ${from}$ to $x = ${to}$, is rotated $360^{\\circ}$ about the $x$-axis. What solid does it sweep out?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: Math.min(from, 0) - 0.6,
            xMax: Math.max(to, 0) + 0.6,
            yMin: -0.15 * high - 0.2,
            yMax: 1.2 * high + 0.2,
            height: 130,
            curves: [{ f, breaks: true }],
            shade: { f, from, to },
            label: `The region under the curve from x = ${from} to x = ${to}`,
          }),
        },
      ],
      options: slotted({ id: kind, label: SOLID_NAMES[kind] }, others, mix(params.m, c, from, to, kind.length)),
      correctId: kind,
    };
  },
  solution: (params) => {
    const { kind, m, c, from, to } = params;
    const f = shapeCurve(params);
    if (kind === 'cylinder') {
      return [
        { text: `Every slice across the solid is a disc of radius $${c}$, the height of the line, the same all the way along.` },
        { text: `So the solid is a cylinder of radius $${c}$ and length $${to - from}$.` },
      ];
    }
    if (isRound(kind)) {
      return [
        { text: `$y = \\sqrt{${c * c} - x^{2}}$ is the top half of the circle $x^{2} + y^{2} = ${c * c}$, radius $${c}$.` },
        kind === 'sphere'
          ? { text: `From $x = ${-c}$ to $x = ${c}$ that is a semicircle, and a semicircle turned about its diameter is a sphere of radius $${c}$.` }
          : { text: `From $x = ${from}$ to $x = ${to}$ it is a quarter circle, which turns into half a sphere: a hemisphere of radius $${c}$.` },
      ];
    }
    const [r1, r2] = [f(from), f(to)];
    return [
      {
        text: `A straight edge makes each slice's radius change steadily: here from $${r1}$ at $x = ${from}$ to $${r2}$ at $x = ${to}$.`,
      },
      kind === 'cone'
        ? { text: `One end has radius $0$, a point, so the solid is a cone with its tip at $x = ${r1 === 0 ? from : to}$.` }
        : { text: `Neither end is a point, so the solid is a cone with its tip cut off: a frustum. The tip would have been where $y = ${polyTex([c, m])}$ meets the axis.` },
    ];
  },
};

/** Which integral gives the volume: the set-up on its own, nothing evaluated. */
const volumeSetup: Generator<Turned> = {
  id: 'int-vol-setup',
  sample: (rng, difficulty) => sampleTurned(rng, difficulty, ['line', 'parabola', 'root']),
  render: ({ profile, a, b }): Slide => {
    const y = profileTex(profile);
    const integral = (factor: string, integrand: string) => `${factor}\\int_{${a}}^{${b}} ${integrand} \\, dx`;
    const squared = `\\left(${y}\\right)^{2}`;
    const choices = slotted(
      { id: 'right', label: integral('\\pi ', squared), tex: true },
      [
        { id: 'unsquared', label: integral('\\pi ', y), tex: true },
        { id: 'two-pi', label: integral('2\\pi ', squared), tex: true },
        { id: 'no-pi', label: integral('', squared), tex: true },
      ],
      mix(a, b, profile.k, ...profile.poly),
    );
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The region under $y = ${y}$ from $x = ${a}$ to $x = ${b}$ is rotated $360^{\\circ}$ about the $x$-axis. Which integral gives the volume of the solid?`,
        },
      ],
      options: choices,
      correctId: 'right',
    };
  },
  solution: ({ profile, a, b }) => [
    {
      text: 'Slice the solid across the $x$-axis. The slice at $x$ is a disc of radius $y$, so its area is $\\pi y^{2}$, and a slice $\\delta x$ thick has volume about $\\pi y^{2} \\, \\delta x$.',
    },
    { text: `Adding the slices from $x = ${a}$ to $x = ${b}$, and letting them get thinner, turns the sum into an integral.` },
    { tex: `V = \\pi \\int_{${a}}^{${b}} y^{2} \\, dx` },
    {
      text: `Here $y = ${profileTex(profile)}$, and it is squared because the radius is squared in $\\pi r^{2}$. The $\\pi$ comes from the circle; $2\\pi$ belongs to a circumference, not an area.`,
    },
  ],
};

/** The volume integral completed as tiles: the constant in front and y squared, multiplied out. */
const volumeIntegrand: Generator<Turned> = {
  id: 'int-vol-integrand',
  sample: (rng, difficulty) =>
    sampleTurned(rng, difficulty, difficulty > 1 ? ['line', 'parabola', 'root'] : ['line', 'root']),
  render: ({ profile, a, b }): Slide => {
    const squared = profileSquared(profile);
    const answer = ['\\pi', polyTex(squared)];
    // Each term squared (cross terms lost), the cross term not doubled, y
    // itself; for a root, k left unsquared and the root left in.
    const halfCross = polyScale(polyAdd(squared, eachSquared(profile.poly)), 0.5);
    const slips = profile.root
      ? [polyTex(polyScale(profile.poly, profile.k)), profileTex(profile)]
      : [polyTex(eachSquared(profile.poly)), polyTex(halfCross), polyTex(profile.poly)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The region under $y = ${profileTex(profile)}$ from $x = ${a}$ to $x = ${b}$ is rotated $360^{\\circ}$ about the $x$-axis. Complete the volume integral, with the integrand multiplied out.`,
        },
      ],
      template: `V = {0} \\int_${templateLimit(a)}^${templateLimit(b)} ( {1} ) \\, dx`,
      bank: tokenBank(answer, ['2\\pi', '\\pi^{2}', ...slips]),
      answer,
    };
  },
  solution: ({ profile, a, b }) => {
    const y = profileTex(profile);
    return [
      { text: 'The volume of a region turned about the $x$-axis is $\\pi$ times the integral of $y^{2}$, between the same limits.' },
      { tex: `V = \\pi \\int_{${a}}^{${b}} y^{2} \\, dx` },
      { tex: stacked(`y^{2} = \\left(${y}\\right)^{2}`, `= ${polyTex(profileSquared(profile))}`) },
      {
        text: profile.root
          ? 'Squaring a square root gives back what was under it, and a number in front is squared too.'
          : 'Every term of the bracket multiplies every other. Squaring each term on its own drops the middle term, which is twice the product of the two.',
      },
    ];
  },
};

interface SliceParams extends Turned {
  /** Where the slice is taken. */
  t: number;
  /** The top of the slider's track. */
  top: number;
}

/** A point inside the limits where the curve's height is whole and not zero. */
function sampleSlice(rng: Rng, difficulty: number): SliceParams {
  return drawUntil(
    () => {
      const turned = sampleTurned(rng, difficulty, ['line', 'parabola', 'root']);
      const t = rng.int(turned.a, turned.b);
      return { ...turned, t, top: Math.ceil(profileAt(turned.profile, t)) + rng.int(2, 5) };
    },
    ({ profile, t, top }) => {
      const r = profileAt(profile, t);
      return Number.isInteger(r) && r > 0 && r <= 16 && r !== restingOn(0, top);
    },
    { profile: { poly: [1, 1], root: false, k: 1 }, a: 0, b: 2, t: 2, top: 7 },
  );
}

/**
 * The radius of one slice, dragged to on a picture.
 *
 * The step the whole formula rests on: the slice at x is a disc whose radius is
 * the height of the curve there. The line across the region marks the slice;
 * the marker is a height.
 */
const volumeSlice: Generator<SliceParams> = {
  id: 'int-vol-slice',
  sample: sampleSlice,
  render: ({ profile, a, b, t, top }): Slide => {
    const f = (x: number) => profileAt(profile, x);
    const window = markerWindow(0, top, 'y');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The shaded region under $y = ${profileTex(profile)}$ is rotated $360^{\\circ}$ about the $x$-axis, and every slice across the solid is a disc. Slide the line to the radius of the disc at $x = ${t}$.`,
        },
      ],
      min: 0,
      max: top,
      step: 1,
      answer: profileAt(profile, t),
      readout: 'r = {v}',
      figure: {
        svg: plotSvg({
          xMin: a - 1,
          xMax: b + 1,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f, breaks: true }],
          shade: { f, from: a, to: b },
          verticals: [{ x: t, dashed: false }],
          label: `The region under the curve, with the slice at x = ${t} marked`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: ({ profile, t }) => [
    {
      text: `At $x = ${t}$ the curve is at height $y = ${profileAt(profile, t)}$: put $x = ${t}$ into $y = ${profileTex(profile)}$.`,
    },
    {
      text: 'Turning the region, that point on the curve sweeps a circle round the axis, and everything below it fills the circle in. So the slice is a disc, and its radius is the height of the curve.',
    },
    { tex: `r = y = ${profileAt(profile, t)}` },
  ],
};

/** The area of one slice: pi times the radius squared, leaving pi in. */
const discArea: Generator<SliceParams> = {
  id: 'int-vol-disc-area',
  sample: sampleSlice,
  render: ({ profile, t }): Slide => {
    const r = profileAt(profile, t);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The curve $y = ${profileTex(profile)}$ is rotated $360^{\\circ}$ about the $x$-axis. The slice across the solid at $x = ${t}$ is a disc. Find its area, leaving $\\pi$ in your answer.`,
        },
      ],
      lead: '\\text{area} =',
      keypad: VOLUME_KEYS,
      answer: piValue({ n: r * r, d: 1 }),
      alsoAccepts: [piExact({ n: r * r, d: 1 })],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ profile, t }) => {
    const r = profileAt(profile, t);
    return [
      { text: `The disc's radius is the height of the curve at $x = ${t}$, which is $y = ${r}$.` },
      { tex: `\\pi r^{2} = \\pi \\times ${r}^{2} = ${piWhole(r * r)}` },
      {
        text: 'The volume integral is these areas added up along the axis: $\\pi y^{2}$ at every $x$, which is why $y$ is squared and the $\\pi$ sits in front.',
      },
    ];
  },
};

/** The typed volume of a turned region, shared by the polynomial and root forms. */
function turnedRender({ profile, a, b }: Turned): Slide {
  const volume = turnedVolume({ profile, a, b });
  return {
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `The region under $y = ${profileTex(profile)}$ from $x = ${a}$ to $x = ${b}$ is rotated $360^{\\circ}$ about the $x$-axis. Find the volume of the solid, leaving $\\pi$ in your answer.`,
      },
    ],
    lead: 'V =',
    keypad: VOLUME_KEYS,
    answer: piValue(volume),
    alsoAccepts: [piExact(volume)],
    integrand: `pi * (${profileAnswer(profile)})^2`,
    limits: [a, b],
    domain: 'real',
    mode: 'exact',
  };
}

/** The volume from a polynomial turned about the x-axis: square it, then integrate. */
const volumeXAxis: Generator<Turned> = {
  id: 'int-vol-x-axis',
  sample: (rng, difficulty) => sampleTurned(rng, difficulty, ['line', 'parabola']),
  choices: turnedChoices,
  render: turnedRender,
  solution: turnedSolution,
};

/**
 * The same with a square root in the curve, which squaring removes.
 *
 * Its own family rather than a form of the one above, because the move is
 * different: here the square is the step that makes the integral possible,
 * where for a polynomial it is only arithmetic.
 */
const volumeRoot: Generator<Turned> = {
  id: 'int-vol-root',
  sample: (rng, difficulty) => sampleTurned(rng, difficulty, ['root']),
  choices: turnedChoices,
  render: turnedRender,
  solution: turnedSolution,
};

interface SquareParams {
  m: number;
  /** Signed, never zero. */
  c: number;
  /** y = m x + c, or at difficulty 2 sometimes y = m x^2 + c. */
  power: 1 | 2;
}

/**
 * Squaring the curve before integrating, one coefficient per tile.
 *
 * The middle term is the point: it is the one squaring term by term loses,
 * and the bank carries the product without its factor of two, and the
 * doubled coefficients, beside it.
 */
const volumeSquare: Generator<SquareParams> = {
  id: 'int-vol-square',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const power = hard && rng.int(0, 1) === 0 ? 2 : 1;
    return { m: rng.int(1, hard ? 6 : 5), c: rng.sign() * rng.int(1, hard ? 7 : 5), power };
  },
  render: ({ m, c, power }): Slide => {
    const y = power === 1 ? polyTex([c, m]) : polyTex([c, 0, m]);
    const size = Math.abs(c);
    const answer = [m * m, 2 * m * size, c * c];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `A volume about the $x$-axis integrates $y^{2}$, so it has to be multiplied out first. Square $y = ${y}$ and place the coefficients.`,
        },
      ],
      template:
        power === 1
          ? `y^2 = {0}x^2 ${c < 0 ? '-' : '+'} {1}x + {2}`
          : `y^2 = {0}x^4 ${c < 0 ? '-' : '+'} {1}x^2 + {2}`,
      bank: wholeBank(answer, [m * size, 2 * m, 2 * size, m * m + size * size]).filter(
        (token) => Number(token) > 0,
      ),
      answer: answer.map(String),
    };
  },
  solution: ({ m, c, power }) => {
    const y = power === 1 ? polyTex([c, m]) : polyTex([c, 0, m]);
    const squared = power === 1 ? polyMul([c, m], [c, m]) : polyMul([c, 0, m], [c, 0, m]);
    return [
      { text: 'Square the first term, double the product of the two terms, and square the last.' },
      { tex: stacked(`\\left(${y}\\right)^{2}`, `= ${polyTex(squared)}`) },
      {
        text: `The middle term is $2 \\times ${m} \\times ${Math.abs(c)} = ${2 * m * Math.abs(c)}$, with the sign of $${c}$. Squaring term by term loses it, and the volume comes out wrong by exactly its integral.`,
      },
    ];
  },
};

type LimitForm = 'cylinder' | 'cone' | 'root';

interface LimitParams {
  /** y = k, y = k x or y = sqrt(k x), from x = 0 to x = h. */
  form: LimitForm;
  k: number;
  h: number;
  /** How far the track runs past the answer. */
  right: number;
}

/** The power of h in the volume, and its coefficient as a multiple of pi. */
function limitLaw({ form, k }: LimitParams): { power: number; coefficient: Ratio } {
  if (form === 'cylinder') return { power: 1, coefficient: reduce(k * k, 1) };
  if (form === 'cone') return { power: 3, coefficient: reduce(k * k, 3) };
  return { power: 2, coefficient: reduce(k, 2) };
}

function limitVolume(params: LimitParams): Ratio {
  const { power, coefficient } = limitLaw(params);
  return times(coefficient, params.h ** power);
}

function limitTex({ form, k }: LimitParams): string {
  if (form === 'cylinder') return `${k}`;
  if (form === 'cone') return polyTex([0, k]);
  return `\\sqrt{${polyTex([0, k])}}`;
}

/**
 * The limit that gives a stated volume, dragged to on the curve.
 *
 * The integral run backwards: the volume is known and the length is not. The
 * track starts at the origin, where every region here starts, and runs a
 * random distance past the answer, so the answer's place on it is no clue.
 */
const volumeFindLimit: Generator<LimitParams> = {
  id: 'int-vol-find-limit',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const form = rng.pick<LimitForm>(['cylinder', 'cone', 'root']);
        const k = form === 'cylinder' ? rng.int(1, 5) : form === 'cone' ? rng.int(1, 3) : rng.int(1, 8);
        return { form, k, h: rng.int(2, difficulty > 1 ? 8 : 6), right: rng.int(2, 4) };
      },
      ({ h, right }) => h !== restingOn(0, h + right),
      { form: 'cone', k: 1, h: 3, right: 2 },
    ),
  render: (params): Slide => {
    const { form, k, h, right } = params;
    const max = h + right;
    const f = (x: number) => (form === 'cylinder' ? k : form === 'cone' ? k * x : Math.sqrt(k * x));
    const high = Math.max(f(max), 1);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The region under $y = ${limitTex(params)}$ from $x = 0$ to $x = h$ is rotated $360^{\\circ}$ about the $x$-axis, and the solid has volume $${piTex(limitVolume(params))}$. Slide the marker to $h$.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: h,
      readout: 'h = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: max,
          yMin: -0.12 * high,
          yMax: 1.15 * high,
          curves: [{ f }],
          label: 'The curve, starting at the origin',
        }),
        ...markerWindow(0, max),
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { h } = params;
    const { power, coefficient } = limitLaw(params);
    const squared = params.form === 'cylinder' ? `${params.k ** 2}` : polyTex(params.form === 'cone' ? [0, 0, params.k ** 2] : [0, params.k]);
    const hPower = power === 1 ? 'h' : `h^{${power}}`;
    return [
      { text: `Square $y$ and integrate from $0$ to $h$, leaving $h$ as a letter.` },
      { tex: stacked(`V = \\pi \\int_{0}^{h} ${squared} \\, dx`, `= ${piTex(coefficient)} ${hPower}`) },
      {
        text: `Set that equal to $${piTex(limitVolume(params))}$ and the $\\pi$ cancels, leaving $${hPower} = ${h ** power}$, so $h = ${h}$.`,
      },
    ];
  },
};

/**
 * A curve turned about the y-axis: y = a x^2 + c, or the line y = x / a
 * through the origin, which turns into a cone standing on its tip.
 *
 * Both give x^2 in terms of y with whole coefficients over a whole
 * denominator, (y - c)/a or a^2 y^2, so the volume is still exact. Only the
 * right-hand half, x >= 0, is ever turned.
 */
interface Riser {
  line: boolean;
  a: number;
  c: number;
}

function drawRiser(rng: Rng, difficulty: number): Riser {
  const hard = difficulty > 1;
  if (rng.int(0, 3) === 0) return { line: true, a: rng.int(1, hard ? 4 : 3), c: 0 };
  const a = rng.pick(hard ? [1, 1, 2, 3] : [1, 1, 2, 3]);
  // At difficulty 1 a parabola is shifted or stretched, not both.
  const c = hard ? rng.int(-3, 6) : a === 1 ? rng.int(0, 6) : 0;
  return { line: false, a, c };
}

function riserTex({ line, a, c }: Riser): string {
  if (line) return a === 1 ? 'x' : `\\frac{x}{${a}}`;
  return polyTex([c, 0, a]);
}

function riserAt({ line, a, c }: Riser, x: number): number {
  return line ? x / a : a * x * x + c;
}

/** x at a whole step `u` along the curve: whole, and a whole y there too. */
function riserX({ line, a }: Riser, u: number): number {
  return line ? a * u : u;
}

/** x^2 in terms of y, as a polynomial in y over a whole denominator. */
function riserSquared({ line, a, c }: Riser): { num: Poly; den: number } {
  return line ? { num: [0, 0, a * a], den: 1 } : { num: [-c, 1], den: a };
}

function overTex(num: Poly, den: number): string {
  const top = inY(polyTex(num));
  return den === 1 ? top : `\\frac{${top}}{${den}}`;
}

function riserVolume(riser: Riser, lower: number, upper: number): Ratio {
  const { num, den } = riserSquared(riser);
  return reduce(sixtyIntegral(num, lower, upper), 60 * den);
}

/** Rearranging for x^2, as the lines of working a learner writes. */
function rearrangeTex(riser: Riser): string {
  const { num, den } = riserSquared(riser);
  if (riser.line) {
    return stacked(`y = ${riserTex(riser)}`, `x = ${inY(polyTex([0, riser.a]))}`, `x^{2} = ${overTex(num, den)}`);
  }
  return riser.a === 1 || riser.c === 0
    ? stacked(`y = ${riserTex(riser)}`, `x^{2} = ${overTex(num, den)}`)
    : stacked(`y = ${riserTex(riser)}`, `${riser.a}x^{2} = ${inY(polyTex(num))}`, `x^{2} = ${overTex(num, den)}`);
}

interface RearrangeParams {
  riser: Riser;
  /** Whole steps along the curve; x at each is `riserX`. */
  u1: number;
  u2: number;
}

/**
 * The two changes a turn about the y-axis asks for, placed as tiles: limits in
 * y rather than x, and x^2 in terms of y.
 *
 * The bank holds the x-limits beside the y-limits, and x beside x^2, which are
 * the two things carried over from the x-axis by habit.
 */
const volumeRearrange: Generator<RearrangeParams> = {
  id: 'int-vol-rearrange',
  sample: (rng, difficulty) => {
    const u1 = rng.int(0, 2);
    return { riser: drawRiser(rng, difficulty), u1, u2: u1 + rng.int(1, difficulty > 1 ? 3 : 2) };
  },
  render: ({ riser, u1, u2 }): Slide => {
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    const [y1, y2] = [riserAt(riser, x1), riserAt(riser, x2)];
    const { num, den } = riserSquared(riser);
    const answer = [`${y1}`, `${y2}`, overTex(num, den)];
    const slips = riser.line
      ? [inY(polyTex([0, riser.a])), `\\frac{y^{2}}{${riser.a * riser.a}}`, inY(polyTex([0, 0, riser.a])), '\\sqrt{y}']
      : [
          overTex([riser.c, 1], den),
          `\\sqrt{${overTex(num, den)}}`,
          inY(polyTex(polyScale(num, riser.a))),
          inY(polyTex([-riser.c, 0, 1])),
        ];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The arc of $y = ${riserTex(riser)}$ from $x = ${x1}$ to $x = ${x2}$ and the $y$-axis bound a region, which is rotated $360^{\\circ}$ about the $y$-axis. Place the limits in $y$, then $x^{2}$ in terms of $y$.`,
        },
      ],
      template: '{0} \\le y \\le {1}, \\quad x^2 = {2}',
      bank: tokenBank(answer, [`${x1}`, `${x2}`, ...slips]),
      answer,
    };
  },
  solution: ({ riser, u1, u2 }) => {
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    return [
      {
        text: `Turning about the $y$-axis, the slices are stacked up the $y$-axis, so the limits are heights. At $x = ${x1}$, $y = ${riserAt(riser, x1)}$; at $x = ${x2}$, $y = ${riserAt(riser, x2)}$.`,
      },
      { text: 'Each slice is a disc whose radius is $x$, so the integrand is $\\pi x^{2}$, written in terms of $y$.' },
      { tex: rearrangeTex(riser) },
      { text: 'There is no need to take the square root: the formula wants $x^{2}$, and that is what rearranging gives.' },
    ];
  },
};

interface YVolumeParams extends RearrangeParams {
  /** True when the region is given by x-limits on the arc, which the learner converts. */
  givenInX: boolean;
}

function yRegionText({ riser, u1, u2, givenInX }: YVolumeParams): string {
  const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
  return givenInX
    ? `The arc of $y = ${riserTex(riser)}$ from $x = ${x1}$ to $x = ${x2}$ and the $y$-axis bound a region, which is rotated $360^{\\circ}$ about the $y$-axis.`
    : `The region between $y = ${riserTex(riser)}$, the $y$-axis and the lines $y = ${riserAt(riser, x1)}$ and $y = ${riserAt(riser, x2)}$ is rotated $360^{\\circ}$ about the $y$-axis.`;
}

/**
 * The volume of a region turned about the y-axis.
 *
 * The quadrature oracle integrates in a variable it calls x, so the integrand
 * is declared as x^2-in-terms-of-y with the letter renamed: the same definite
 * integral over the same interval, which is all the oracle needs.
 */
const volumeYAxis: Generator<YVolumeParams> = {
  id: 'int-vol-y-axis',
  sample: (rng, difficulty) => {
    const u1 = rng.int(0, 2);
    return {
      riser: drawRiser(rng, difficulty),
      u1,
      u2: u1 + rng.int(1, difficulty > 1 ? 3 : 2),
      givenInX: difficulty > 1 && rng.int(0, 1) === 0,
    };
  },
  choices: (params) => {
    const { riser, u1, u2 } = params;
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    const [y1, y2] = [riserAt(riser, x1), riserAt(riser, x2)];
    const right = riserVolume(riser, y1, y2);
    const { den } = riserSquared(riser);
    // x^2 = (y + c)/a: the sign slip in rearranging.
    // For the line, x = y / a instead of x = a y: the rearranging upside down.
    const flipped = riser.line
      ? reduce(sixtyIntegral([0, 0, 1], y1, y2), 60 * riser.a * riser.a)
      : reduce(sixtyIntegral([riser.c, 1], y1, y2), 60 * den);
    // pi times the integral of y^2 dx across the x-limits: the x-axis rule.
    const wrongAxis = riser.line
      ? reduce(sixtyIntegral([0, 0, 1], x1, x2), 60 * riser.a * riser.a)
      : sixtieths(sixtyIntegral(polyMul([riser.c, 0, riser.a], [riser.c, 0, riser.a]), x1, x2));
    return steered(
      options(piOption(right), piOption(flipped), piOption(wrongAxis), bareOption(right), piOption(times(right, 2))).slice(
        0,
        4,
      ),
      mix(y1, y2, riser.a, riser.c, x2),
    );
  },
  render: (params): Slide => {
    const { riser, u1, u2 } = params;
    const [y1, y2] = [riserAt(riser, riserX(riser, u1)), riserAt(riser, riserX(riser, u2))];
    const { num, den } = riserSquared(riser);
    const volume = riserVolume(riser, y1, y2);
    return {
      kind: 'expression',
      prompt: [{ kind: 'prose', text: `${yRegionText(params)} Find the volume, leaving $\\pi$ in your answer.` }],
      lead: 'V =',
      keypad: VOLUME_KEYS,
      answer: piValue(volume),
      alsoAccepts: [piExact(volume)],
      integrand: `pi * (${polyAnswer(num)}) / ${den}`,
      limits: [y1, y2],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ riser, u1, u2, givenInX }) => {
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    const [y1, y2] = [riserAt(riser, x1), riserAt(riser, x2)];
    const { num, den } = riserSquared(riser);
    const anti = inY(antiTex(num));
    return [
      {
        text: 'About the $y$-axis the slices are stacked up the $y$-axis and each radius is an $x$ value, so $V = \\pi \\int x^{2} \\, dy$ with the limits in $y$.',
      },
      ...(givenInX ? [{ text: `The limits first: at $x = ${x1}$, $y = ${y1}$, and at $x = ${x2}$, $y = ${y2}$.` }] : []),
      { tex: rearrangeTex(riser) },
      { tex: `V = \\pi \\int_{${y1}}^{${y2}} ${overTex(num, den)} \\, dy` },
      {
        text: `The top integrates to $${anti}$${den === 1 ? '' : `, over $${den}$`}. Evaluate between $y = ${y1}$ and $y = ${y2}$.`,
      },
      { tex: `V = ${piTex(riserVolume(riser, y1, y2))}` },
    ];
  },
};

interface RadiusParams {
  riser: Riser;
  u: number;
  right: number;
}

/**
 * The radius of a slice when the turn is about the y-axis: a distance across,
 * so the marker is a vertical line and the slice is drawn as a height.
 */
const volumeYRadius: Generator<RadiusParams> = {
  id: 'int-vol-y-radius',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ riser: drawRiser(rng, difficulty), u: rng.int(1, difficulty > 1 ? 4 : 3), right: rng.int(2, 4) }),
      ({ riser, u, right }) => {
        const x = riserX(riser, u);
        return x <= 8 && x !== restingOn(0, x + right) && riserAt(riser, x) > 0;
      },
      { riser: { line: false, a: 1, c: 1 }, u: 2, right: 3 },
    ),
  render: ({ riser, u, right }): Slide => {
    const x = riserX(riser, u);
    const height = riserAt(riser, x);
    const max = x + right;
    const low = Math.min(0, riserAt(riser, 0));
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve $y = ${riserTex(riser)}$ is rotated $360^{\\circ}$ about the $y$-axis. The slice across the solid at height $y = ${height}$ is a disc. Slide the marker to its radius.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: x,
      readout: 'r = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: max,
          yMin: low - 0.15 * (height - low) - 0.3,
          yMax: height + 0.4 * (height - low) + 0.5,
          curves: [{ f: (at) => riserAt(riser, at) }],
          horizontals: [height],
          label: `The curve for x from 0, with the height y = ${height} marked`,
        }),
        ...markerWindow(0, max),
        axis: 'x',
      },
    };
  },
  solution: ({ riser, u }) => {
    const x = riserX(riser, u);
    const height = riserAt(riser, x);
    const { num, den } = riserSquared(riser);
    const squared = (num.reduce((total, value, power) => total + value * height ** power, 0)) / den;
    return [
      {
        text: 'About the $y$-axis a slice is taken at a height, and its radius is how far the curve is from the $y$-axis there: its $x$ value.',
      },
      { tex: stacked(`${riserTex(riser)} = ${height}`, `x^{2} = ${squared}`) },
      { text: `So $x = ${x}$, taking the positive root, which is the side of the axis the region is on.` },
    ];
  },
};

type AxisLayout = 'x-axis' | 'y-given' | 'x-given';

interface AxisFlowParams extends RearrangeParams {
  layout: AxisLayout;
}

const X_AXIS = 'The $x$-axis';
const Y_AXIS = 'The $y$-axis';
const DX = '$\\pi y^{2}$, in $x$';
const DY = '$\\pi x^{2}$, in $y$';

/**
 * Setting up any volume, as a route: which axis, and so which variable; and
 * for the y-axis, whether the limits given are heights yet.
 *
 * The outcomes state a method and never judge the route taken, so a wrong
 * turn discloses nothing before the answer is checked.
 */
const volumeAxisFlow: Generator<AxisFlowParams> = {
  id: 'int-vol-axis-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const u1 = rng.int(0, 2);
        return {
          riser: drawRiser(rng, difficulty),
          u1,
          u2: u1 + rng.int(1, 2),
          layout: rng.pick<AxisLayout>(['x-axis', 'y-given', 'x-given']),
        };
      },
      ({ riser, u1 }) => riserAt(riser, riserX(riser, u1)) >= 0,
      { riser: { line: false, a: 1, c: 1 }, u1: 0, u2: 2, layout: 'x-axis' },
    ),
  render: ({ riser, u1, u2, layout }): Slide => {
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    const region =
      layout === 'x-axis'
        ? `The region under the curve from $x = ${x1}$ to $x = ${x2}$ is rotated $360^{\\circ}$ about the $x$-axis.`
        : yRegionText({ riser, u1, u2, givenInX: layout === 'x-given' }).replace(`$y = ${riserTex(riser)}$`, 'the curve');
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `${region} Decide how to set up the volume integral. Each answer chooses what gets asked next.`,
        },
      ],
      subject: `y = ${riserTex(riser)}`,
      steps: [
        {
          id: 'axis',
          ask: 'Which axis does the region turn about?',
          branches: [
            { label: X_AXIS, to: 'across' },
            { label: Y_AXIS, to: 'given' },
          ],
        },
        {
          id: 'across',
          ask: 'The slices are stacked along that axis. Which radius, and which variable, does the integral use?',
          branches: [
            { label: DX, outcome: 'Integrate $\\pi y^{2}$ with respect to $x$, between the $x$-limits, with $y^{2}$ written in terms of $x$.' },
            { label: DY, outcome: 'Integrate $\\pi x^{2}$ with respect to $y$, between the $y$-limits, with $x^{2}$ written in terms of $y$.' },
          ],
        },
        {
          id: 'given',
          ask: 'The radius is an $x$ value and the slices are stacked up in $y$. Are the limits you were given already $y$ values?',
          branches: [
            { label: 'Yes', outcome: 'Rearrange for $x^{2}$ in terms of $y$ and integrate $\\pi x^{2}$ between those limits.' },
            {
              label: 'No',
              outcome: 'Put each $x$-limit into the curve to get the $y$-limits, then rearrange for $x^{2}$ and integrate $\\pi x^{2}$ between them.',
            },
          ],
        },
      ],
      answer: layout === 'x-axis' ? [X_AXIS, DX] : [Y_AXIS, layout === 'y-given' ? 'Yes' : 'No'],
    };
  },
  solution: ({ riser, u1, u2, layout }) => {
    const [x1, x2] = [riserX(riser, u1), riserX(riser, u2)];
    const [y1, y2] = [riserAt(riser, x1), riserAt(riser, x2)];
    if (layout === 'x-axis') {
      return [
        { text: 'The turn is about the $x$-axis, so the slices are stacked along it and each radius is a height, $y$.' },
        { tex: `V = \\pi \\int_{${x1}}^{${x2}} y^{2} \\, dx` },
        { text: `The limits $${x1}$ and $${x2}$ are already $x$ values, and $y^{2}$ is the curve squared.` },
      ];
    }
    return [
      { text: 'The turn is about the $y$-axis, so the slices are stacked up it and each radius is a distance across, $x$.' },
      layout === 'y-given'
        ? { text: `The limits are the lines $y = ${y1}$ and $y = ${y2}$: heights already.` }
        : { text: `The limits are given as $x = ${x1}$ and $x = ${x2}$. Put them into the curve: $y = ${y1}$ and $y = ${y2}$.` },
      { tex: `V = \\pi \\int_{${y1}}^{${y2}} x^{2} \\, dy` },
      { tex: rearrangeTex(riser) },
    ];
  },
};

interface ConeParams {
  /** The radius at x = h, and at x = 0; c = 0 is a cone, anything more a frustum. */
  r: number;
  c: number;
  h: number;
}

/** The line from (0, c) to (h, r), as the learner reads it. */
function coneLineTex({ r, c, h }: ConeParams): string {
  const g = reduce(r - c, h);
  const slope = g.d === 1 ? termTex(g.n, 1) : `\\frac{${g.n}}{${g.d}}x`;
  return c === 0 ? slope : `${slope} + ${c}`;
}

const coneVolume = ({ r, c, h }: ConeParams): Ratio => reduce(h * (c * c + c * r + r * r), 3);

/**
 * A cone or a frustum found by integration, which the level then checks against
 * the formula the learner already knows.
 *
 * The line's gradient is r/h, a fraction more often than not, so the volume is
 * worked from the frustum formula rather than through `sixtyIntegral`; the
 * quadrature oracle integrates the line itself, which is the independent check
 * that the two agree.
 */
const volumeCone: Generator<ConeParams> = {
  id: 'int-vol-cone',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.int(0, 1) === 0) {
      const c = rng.int(1, 4);
      return { c, r: c + rng.int(1, 5), h: rng.int(1, 6) };
    }
    return { c: 0, r: rng.int(1, difficulty > 1 ? 9 : 6), h: rng.int(1, 8) };
  },
  choices: (params) => {
    const { r, c, h } = params;
    const right = coneVolume(params);
    const cylinder = reduce(r * r * h, 1);
    // A cone with radius and height swapped; for a frustum, the two end discs averaged.
    const third = c === 0 ? reduce(r * h * h, 3) : reduce(h * (r * r + c * c), 2);
    return steered(
      options(piOption(right), piOption(cylinder), piOption(third), bareOption(right)),
      mix(r, c, h),
    );
  },
  render: (params): Slide => {
    const { r, c, h } = params;
    const volume = coneVolume(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The line $y = ${coneLineTex(params)}$ from $x = 0$ to $x = ${h}$ is rotated $360^{\\circ}$ about the $x$-axis, making ${c === 0 ? 'a cone' : 'a frustum, a cone with its tip cut off'}. Find its volume by integrating, leaving $\\pi$ in your answer.`,
        },
      ],
      lead: 'V =',
      keypad: VOLUME_KEYS,
      answer: piValue(volume),
      alsoAccepts: [piExact(volume)],
      integrand: `pi * ((${r - c}) / (${h}) * x + (${c}))^2`,
      limits: [0, h],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { r, c, h } = params;
    const g = reduce(r - c, h);
    const squared = sumTex([
      fracTermTex(g.n * g.n, g.d * g.d, 2),
      fracTermTex(2 * g.n * c, g.d, 1),
      c === 0 ? '0' : `${c * c}`,
    ]);
    const anti = sumTex([
      fracTermTex(g.n * g.n, 3 * g.d * g.d, 3),
      fracTermTex(g.n * c, g.d, 2),
      c === 0 ? '0' : termTex(c * c, 1),
    ]);
    const volume = piTex(coneVolume(params));
    return [
      { text: `Square the line: $y^{2} = ${squared}$, which integrates to $${anti}$.` },
      { tex: stacked(`V = \\pi \\int_{0}^{${h}} y^{2} \\, dx`, `= ${volume}`) },
      c === 0
        ? {
            text: `Check against the cone formula. The radius is the height of the line at $x = ${h}$, which is $${r}$, and the height of the cone is $${h}$: $\\frac{1}{3}\\pi \\times ${r}^{2} \\times ${h} = ${volume}$. The third in that formula is the third from integrating $x^{2}$.`,
          }
        : {
            text: `Check against the frustum formula $\\frac{1}{3}\\pi h\\left(R^{2} + Rr + r^{2}\\right)$, with end radii $${c}$ and $${r}$ and length $${h}$: $\\frac{1}{3}\\pi \\times ${h} \\times ${c * c + c * r + r * r} = ${volume}$.`,
          },
    ];
  },
};

/**
 * Reading a cone off its line, as tiles: the radius is the line's height at the
 * wide end, the height is the length along the axis, and the formula does the
 * rest. The gradient is in the bank, since it is the number the question shows
 * and the easiest to mistake for the radius.
 */
const volumeConeParts: Generator<ConeParams> = {
  id: 'int-vol-cone-parts',
  sample: (rng, difficulty) => ({ c: 0, r: rng.int(1, difficulty > 1 ? 9 : 8), h: rng.int(2, 8) }),
  render: (params): Slide => {
    const { r, h } = params;
    const g = reduce(r, h);
    const answer = [`${r}`, `${h}`, piTex(coneVolume(params))];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Turning the line $y = ${coneLineTex(params)}$, from $x = 0$ to $x = ${h}$, about the $x$-axis makes a cone. Place its radius and height, then its volume from $\\frac{1}{3}\\pi r^{2} h$.`,
        },
      ],
      template: 'r = {0}, \\quad h = {1}, \\quad V = {2}',
      bank: tokenBank(answer, [
        ratioTex(g),
        piTex(reduce(r * r * h, 1)),
        piTex(reduce(r * h * h, 3)),
        `${r + h}`,
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { r, h } = params;
    return [
      { text: `The cone's tip is at the origin, where the line meets the axis. Its base is at $x = ${h}$, so its height is $${h}$.` },
      { text: `The radius of the base is the height of the line there: put $x = ${h}$ into $y = ${coneLineTex(params)}$ to get $${r}$.` },
      { tex: stacked(`\\frac{1}{3}\\pi r^{2} h`, `= \\frac{1}{3}\\pi \\times ${r}^{2} \\times ${h}`, `= ${piTex(coneVolume(params))}`) },
      { text: 'Integrating $\\pi y^{2}$ from $0$ to the base gives the same number, which is where the third in the formula comes from.' },
    ];
  },
};

interface WasherParams {
  top: Poly;
  bottom: Poly;
  a: number;
  b: number;
  /** True when the question names the lower curve first. */
  swap: boolean;
}

/**
 * Two curves, both on or above the axis, one above the other between whole
 * limits: the region between them turns into a solid with a hole down it.
 */
function sampleWasher(rng: Rng, difficulty: number): WasherParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const a = rng.int(0, 2);
      const b = a + rng.int(1, hard ? 3 : 2);
      const swap = rng.int(0, 1) === 1;
      if (!hard) {
        const constant = [rng.int(1, 7)];
        const curve = rng.pick([[rng.int(0, 3), rng.int(1, 2)], [rng.int(0, 2), 0, 1]]);
        // A flat roof over a rising floor, or a rising roof over a flat floor.
        return rng.int(0, 1) === 0
          ? { top: constant, bottom: curve, a, b, swap }
          : { top: curve, bottom: [rng.int(1, 3)], a, b, swap };
      }
      return {
        top: [rng.int(0, 8), rng.int(-2, 3), rng.pick([0, 0, 1, -1])],
        bottom: [rng.int(0, 4), rng.int(0, 2), rng.pick([0, 1])],
        a,
        b,
        swap,
      };
    },
    ({ top, bottom, a, b }) => {
      const sixty = sixtyIntegral(polySub(polyMul(top, top), polyMul(bottom, bottom)), a, b);
      return (
        minOn(bottom, a, b) >= 0 &&
        minOn(polySub(top, bottom), a, b) > 0 &&
        bottom.some((value) => value !== 0) &&
        sixty <= 60 * (hard ? 500 : 200)
      );
    },
    { top: [4], bottom: [0, 1], a: 0, b: 2, swap: false },
  );
}

function washerVolume({ top, bottom, a, b }: WasherParams): Ratio {
  return sixtieths(sixtyIntegral(polySub(polyMul(top, top), polyMul(bottom, bottom)), a, b));
}

/** The volume of a region between two curves turned about the x-axis. */
const volumeWasher: Generator<WasherParams> = {
  id: 'int-vol-washer',
  sample: sampleWasher,
  choices: (params) => {
    const { top, bottom, a, b } = params;
    const gap = polySub(top, bottom);
    return steered(
      options(
        piOption(washerVolume(params)),
        // Squaring the gap between the curves instead of each curve.
        piOption(sixtieths(sixtyIntegral(polyMul(gap, gap), a, b))),
        // The outer curve's solid, with nothing taken out.
        piOption(sixtieths(sixtyIntegral(polyMul(top, top), a, b))),
        bareOption(washerVolume(params)),
        piOption(times(washerVolume(params), 2)),
      ).slice(0, 4),
      mix(a, b, ...top, ...bottom),
    );
  },
  render: (params): Slide => {
    const { top, bottom, a, b, swap } = params;
    const [first, second] = named(top, bottom, swap);
    const volume = washerVolume(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The region between $y = ${first}$ and $y = ${second}$, from $x = ${a}$ to $x = ${b}$, is rotated $360^{\\circ}$ about the $x$-axis. Find the volume of the solid, leaving $\\pi$ in your answer.`,
        },
      ],
      lead: 'V =',
      keypad: VOLUME_KEYS,
      answer: piValue(volume),
      alsoAccepts: [piExact(volume)],
      integrand: `pi * ((${polyAnswer(top)})^2 - (${polyAnswer(bottom)})^2)`,
      limits: [a, b],
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { top, bottom, a, b } = params;
    const at = testPoint(a, b);
    const difference = polySub(polyMul(top, top), polyMul(bottom, bottom));
    return [
      {
        text: 'The solid has a hole down the middle. Each slice is a washer: a disc as wide as the outer curve, with a disc as wide as the inner curve taken out.',
      },
      { tex: `V = \\pi \\int_{${a}}^{${b}} \\left(y_1^{2} - y_2^{2}\\right) dx` },
      {
        text: `The outer radius is the upper curve, $y_1 = ${polyTex(top)}$: at $x = ${at}$ it gives $${polyAt(top, at)}$ against $${polyAt(bottom, at)}$ for $y_2 = ${polyTex(bottom)}$.`,
      },
      {
        text: `Square each and subtract: $y_1^{2} - y_2^{2} = ${polyTex(difference)}$, which integrates to $${antiTex(difference)}$.`,
      },
      { tex: `V = ${piTex(washerVolume(params))}` },
      {
        text: 'Squaring the gap between the curves, $\\left(y_1 - y_2\\right)^{2}$, is the tempting slip. A washer is one disc minus another, $\\pi y_1^{2} - \\pi y_2^{2}$, and that is not the same number.',
      },
    ];
  },
};

interface HollowParams {
  top: Poly;
  bottom: Profile;
  a: number;
  b: number;
}

/**
 * The hollow solid as two solids, one taken from the other, as a tree.
 *
 * The same picture `int-between-tree` gives an area: the volume under the outer
 * curve less the volume under the inner one. Each box is a whole multiple of
 * pi, which the sampler insists on by exact arithmetic rather than rounding.
 */
const volumeOuterInner: Generator<HollowParams> = {
  id: 'int-vol-outer-inner',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const a = rng.int(0, 2);
        return {
          top: hard && rng.int(0, 1) === 0 ? [rng.int(1, 5), rng.int(1, 2)] : [rng.int(2, 7)],
          bottom: drawProfile(rng, 1, rng.pick<ProfileForm>(['line', 'root', 'parabola'])),
          a,
          b: a + rng.int(1, hard ? 3 : 2),
        };
      },
      ({ top, bottom, a, b }) => {
        const outer = sixtyIntegral(polyMul(top, top), a, b);
        const inner = sixtyIntegral(profileSquared(bottom), a, b);
        return (
          minOn(bottom.poly, a, b) >= 0 &&
          inner > 0 &&
          minOn(polySub(polyMul(top, top), profileSquared(bottom)), a, b) > 0 &&
          outer % 60 === 0 &&
          inner % 60 === 0 &&
          outer <= 60 * 200
        );
      },
      { top: [3], bottom: { poly: [0, 1], root: false, k: 1 }, a: 0, b: 3 },
    );
  },
  render: ({ top, bottom, a, b }): Slide => {
    const outer = sixtyIntegral(polyMul(top, top), a, b) / 60;
    const inner = sixtyIntegral(profileSquared(bottom), a, b) / 60;
    const answer = [outer, inner, outer - inner];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The region between $y_1 = ${polyTex(top)}$ and $y_2 = ${profileTex(bottom)}$, from $x = ${a}$ to $x = ${b}$, is rotated $360^{\\circ}$ about the $x$-axis. Fill the top row with the volume each curve sweeps out on its own, $y_1$ first, and the box below with the volume of the hollow solid.`,
        },
      ],
      expression: `\\pi \\int_{${a}}^{${b}} y_1^{2} \\, dx - \\pi \\int_{${a}}^{${b}} y_2^{2} \\, dx`,
      nodes: [
        { id: 'outer', from: [] },
        { id: 'inner', from: [] },
        { id: 'hollow', from: ['outer', 'inner'] },
      ],
      bank: wholeBank(answer, [outer + inner, inner - outer, 2 * inner, outer - 2 * inner]).map((n) =>
        piWhole(Number(n)),
      ),
      answer: answer.map(piWhole),
    };
  },
  solution: ({ top, bottom, a, b }) => {
    const outer = sixtyIntegral(polyMul(top, top), a, b) / 60;
    const inner = sixtyIntegral(profileSquared(bottom), a, b) / 60;
    return [
      { text: 'The hollow solid is the solid under the outer curve with the solid under the inner curve taken out of it.' },
      {
        tex: stacked(
          `\\pi \\int_{${a}}^{${b}} \\left(${polyTex(top)}\\right)^{2} dx`,
          `= ${piWhole(outer)}`,
        ),
      },
      {
        tex: stacked(
          `\\pi \\int_{${a}}^{${b}} ${polyTex(profileSquared(bottom))} \\, dx`,
          `= ${piWhole(inner)}`,
        ),
      },
      { tex: `${piWhole(outer)} - ${piWhole(inner)} = ${piWhole(outer - inner)}` },
      { text: 'Integrating $\\pi\\left(y_1^{2} - y_2^{2}\\right)$ in one go gives the same, and is usually quicker.' },
    ];
  },
};

/* ---------- Level 6: partial fractions in integration ---------- */

/*
 * Every fraction in this level is built from its answer. The numerators A and
 * B and the brackets (x + a) and (x + b) are drawn first, and the fraction's
 * top is what A/(x + a) + B/(x + b) adds up to, so every coefficient a learner
 * finds is whole and nothing is rounded.
 *
 * Typed answers here are logarithms, and the checker probes negative x unless
 * told otherwise, where ln goes complex (see the header of this file). So a
 * typed log answer is only asked with a and b positive and under
 * `domain: 'positive'`, where every bracket is positive at every probe; a
 * bracket such as x - 3 appears only in tiles, choice and flow questions.
 * `answer` and `integrand` write `log(` rather than `ln(`, which
 * `math.derivative` rejects (see `int-parts-log`); the learner still types
 * `ln(` from the keypad.
 *
 * A definite integral of a fraction is a logarithm such as ln(9/4), and the
 * quadrature oracle reads a definite answer with `Number()`, so those are
 * asked by choice, tiles and slider rather than typed.
 */

interface Split {
  /** The numerators, never zero. */
  A: number;
  B: number;
  /** The brackets are (x + a) and (x + b): a and b differ, and neither is zero. */
  a: number;
  b: number;
}

/** x + a as the learner reads it: `x + 3`, `x - 2`. */
const bracketTex = (a: number): string => linearTex(1, a);

const bracketAnswer = (a: number): string => `(x + (${a}))`;

/** The top A(x + b) + B(x + a), lowest power first. */
const splitTop = ({ A, B, a, b }: Split): Poly => [A * b + B * a, A + B];

/** The bottom multiplied out, for a question that leaves the factorising to the learner. */
const splitBottom = ({ a, b }: Split): Poly => [a * b, a + b, 1];

/** The fraction before it is split, with the bottom factorised or multiplied out. */
function splitFractionTex(split: Split, expanded = false): string {
  const bottom = expanded ? polyTex(splitBottom(split)) : `(${bracketTex(split.a)})(${bracketTex(split.b)})`;
  return `\\frac{${polyTex(splitTop(split))}}{${bottom}}`;
}

function splitFractionAnswer(split: Split): string {
  return `(${polyAnswer(splitTop(split))}) / (${bracketAnswer(split.a)} * ${bracketAnswer(split.b)})`;
}

/** Where a term goes in a sum: first on the line, or after a sign. */
function signedTerm(negative: boolean, body: string, first: boolean): string {
  if (first) return negative ? `-${body}` : body;
  return negative ? ` - ${body}` : ` + ${body}`;
}

/** k / (x + a), or k / (x + a)^2, as one term of a sum. */
function fractionTermTex(k: number, a: number, first: boolean, squared = false): string {
  const bottom = squared ? `(${bracketTex(a)})^{2}` : bracketTex(a);
  return signedTerm(k < 0, `\\frac{${Math.abs(k)}}{${bottom}}`, first);
}

function splitTex({ A, B, a, b }: Split): string {
  return `${fractionTermTex(A, a, true)}${fractionTermTex(B, b, false)}`;
}

/** The split form with letters for the numerators, as the question poses it. */
function lettersTex({ a, b }: Split): string {
  return `\\frac{A}{${bracketTex(a)}} + \\frac{B}{${bracketTex(b)}}`;
}

/** k ln|x + a| as one term of a sum. */
function lnTermTex(k: number, a: number, first: boolean): string {
  const size = Math.abs(k) === 1 ? '' : `${Math.abs(k)}`;
  return signedTerm(k < 0, `${size}\\ln|${bracketTex(a)}|`, first);
}

function lnSumTex({ A, B, a, b }: Split): string {
  return `${lnTermTex(A, a, true)}${lnTermTex(B, b, false)}`;
}

/** Both logs following something else on the line, each with its own sign. */
function lnSumAfter({ A, B, a, b }: Split): string {
  return `${lnTermTex(A, a, false)}${lnTermTex(B, b, false)}`;
}

/** Both fractions following something else on the line. */
function splitAfter({ A, B, a, b }: Split): string {
  return `${fractionTermTex(A, a, false)}${fractionTermTex(B, b, false)}`;
}

/** The two logs and the constant on two lines, for a solution panel about twenty characters wide. */
function lnSumStacked({ A, B, a, b }: Split): string {
  return stacked(lnTermTex(A, a, true), `${lnTermTex(B, b, false).trim()} + C`);
}

function lnSumAnswer({ A, B, a, b }: Split): string {
  return `(${A}) * log${bracketAnswer(a)} + (${B}) * log${bracketAnswer(b)}`;
}

/** A coefficient written in front of something, with 1 and -1 left implied. */
function leadingTex(r: Ratio): string {
  if (r.d === 1 && r.n === 1) return '';
  if (r.d === 1 && r.n === -1) return '-';
  return ratioTex(r);
}

/** A number of the form n/d as a tile or a limit: `\frac{9}{4}`, `3`. */
const fractionTex = ({ n, d }: Ratio): string => (d === 1 ? `${n}` : `\\frac{${n}}{${d}}`);

/** ln of a positive fraction, as a textbook leaves it: `\ln\frac{9}{4}`, `\ln 3`. */
const lnOfTex = (r: Ratio): string => (r.d === 1 ? `\\ln ${r.n}` : `\\ln\\frac{${r.n}}{${r.d}}`);

function sampleSplit(rng: Rng, difficulty: number, positive: boolean): Split {
  const hard = difficulty > 1;
  const reach = hard ? 7 : 5;
  const size = hard ? 6 : 4;
  const coefficient = () => rng.sign() * rng.int(1, size);
  const bracket = () => (positive ? rng.int(1, reach) : rng.sign() * rng.int(1, reach));
  return drawUntil(
    () => ({ A: coefficient(), B: coefficient(), a: bracket(), b: bracket() }),
    ({ a, b }) => a !== b,
    { A: 2, B: 3, a: 1, b: 2 },
  );
}

/**
 * Four whole-number options for a derived choice form: the right one, the
 * slips given, then values beside the answer, placed at the slot `salt` picks.
 */
function numberChoices(correct: number, slips: number[], salt: number): ChoiceOption[] {
  const picked: number[] = [];
  for (const value of slips) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || value === correct || picked.includes(value)) continue;
    picked.push(value + 0);
  }
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (picked.length < 3 && !picked.includes(candidate)) picked.push(candidate);
    }
  }
  return steered(
    options({ tex: `${correct}`, answer: `${correct}` }, ...picked.map((value) => ({ tex: `${value}`, answer: `${value}` }))),
    salt,
  );
}

/** A native choice's options, the first of `opts` being the right one, placed by `salt`. */
function placedChoices(opts: ChoiceOption[], salt: number) {
  const [right, ...rest] = opts;
  const order = slotted(right, rest.slice(0, 3), salt);
  return {
    options: order.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${order.indexOf(right)}`,
  };
}

interface CoverParams extends Split {
  /** Which numerator is asked for: A, over x + a, or B, over x + b. */
  ask: 'A' | 'B';
}

/** The asked numerator, its own bracket's constant and the other bracket's. */
function coverSides({ A, B, a, b, ask }: CoverParams) {
  return ask === 'A' ? { k: A, own: a, other: b, name: 'A' } : { k: B, own: b, other: a, name: 'B' };
}

function sampleCover(rng: Rng, difficulty: number): CoverParams {
  return drawUntil(
    () => ({ ...sampleSplit(rng, difficulty, false), ask: rng.pick<'A' | 'B'>(['A', 'B']) }),
    (params) => splitTop(params).every((value) => value !== 0),
    { A: 2, B: 3, a: 1, b: 2, ask: 'A' },
  );
}

/** The working behind cover-up, shared by every question that finds a numerator. */
function coverSolution(params: CoverParams) {
  const { k, own, other, name } = coverSides(params);
  const top = splitTop(params);
  return [
    {
      text: `Multiply both sides by the bottom: $${polyTex(top)} = A(${bracketTex(params.b)}) + B(${bracketTex(params.a)})$.`,
    },
    {
      text: `Put $x = ${-own}$. That makes $${bracketTex(own)}$ zero, so the other term vanishes and only $${name}$ is left.`,
    },
    { tex: `${name} = \\frac{${polyAt(top, -own)}}{${other - own}} = ${k}` },
    {
      text: `Cover-up is the same thing done by eye: cover $(${bracketTex(own)})$ in the fraction and put $x = ${-own}$ into what is left.`,
    },
  ];
}

/**
 * One numerator by cover-up, worked one piece at a time: the top at x = -a,
 * the other bracket at x = -a, and the division.
 *
 * The line is built from the substitution itself, so a learner who puts in
 * +a instead of -a meets that slip as a wrong value in the first box.
 */
const coverUp: Generator<CoverParams> = {
  id: 'int-pf-cover-up',
  sample: sampleCover,
  choices: (params) => {
    const { k, own, other } = coverSides(params);
    const [q, p] = splitTop(params);
    const top = p * -own + q;
    // Dividing by the wrong bracket's value; substituting +a; stopping before the division.
    return numberChoices(k, [-k, (p * own + q) / (own + other), top], mix(k, own, other, p));
  },
  render: (params): Slide => {
    const { own, other, name } = coverSides(params);
    const [q, p] = splitTop(params);
    const r = -own;
    const t = p * r + q;
    const d = other - own;
    const constant = (left: Expr) => bin(q < 0 ? '-' : '+', left, num(Math.abs(q)));
    const top = p === 1 ? constant(num(r)) : constant(bin('*', num(p), num(r)));
    const bottom = bin(other < 0 ? '-' : '+', num(r), num(Math.abs(other)));
    return {
      kind: 'reduce',
      prompt: [
        { kind: 'display', tex: splitFractionTex(params) },
        {
          kind: 'prose',
          text: `This splits as $${lettersTex(params)}$. To find $${name}$, cover $(${bracketTex(own)})$ and put $x = ${r}$ into what is left. Tap the part you would work out **next**, then choose its value.`,
        },
      ],
      expr: bin('/', top, bottom),
      banks: {
        ...(p === 1 ? {} : { 'r.l.l': bank4(p * r, -p * r, p + r) }),
        'r.l': bank4(t, p * own + q, p * r - q, -t),
        'r.r': bank4(d, own + other, -d),
        r: bank4(t / d, -t / d, t, d),
      },
    };
  },
  solution: coverSolution,
};

/** Both numerators placed as tiles, the fraction's bottom sometimes left to factorise. */
const splitCoefficients: Generator<Split & { expanded: boolean }> = {
  id: 'int-pf-coefficients',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty, false), expanded: difficulty > 1 && rng.chance(0.4) }),
  render: (params): Slide => {
    const { A, B, a, b, expanded } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: splitFractionTex(params, expanded) },
        {
          kind: 'prose',
          text: expanded
            ? `Factorise the bottom, then split the fraction as $${lettersTex(params)}$. Place $A$ and $B$.`
            : `Split the fraction as $${lettersTex(params)}$. Place $A$ and $B$.`,
        },
      ],
      template: 'A = {0}, \\quad B = {1}',
      // Signs flipped, and the top's value at x = -a before dividing.
      bank: wholeBank([A, B], [-A, -B, A * (b - a)]),
      answer: [`${A}`, `${B}`],
    };
  },
  solution: (params) => {
    const { A, B, a, b, expanded } = params;
    const top = splitTop(params);
    return [
      ...(expanded ? [{ text: `The bottom factorises: $${polyTex(splitBottom(params))} = (${bracketTex(a)})(${bracketTex(b)})$.` }] : []),
      { text: `Cover $(${bracketTex(a)})$ and put $x = ${-a}$ into the rest:` },
      { tex: `A = \\frac{${polyAt(top, -a)}}{${b - a}} = ${A}` },
      { text: `Cover $(${bracketTex(b)})$ and put $x = ${-b}$:` },
      { tex: `B = \\frac{${polyAt(top, -b)}}{${a - b}} = ${B}` },
      { text: `Check by adding back: $${splitTex(params)}$ has top $${polyTex(top)}$.` },
    ];
  },
};

/**
 * Both numerators by cover-up as a tree: the top and the other bracket at each
 * root of the bottom, then each division.
 */
const coverBothTree: Generator<Split> = {
  id: 'int-pf-both-tree',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty, false),
  render: (params): Slide => {
    const { A, B, a, b } = params;
    const top = splitTop(params);
    const answer = [polyAt(top, -a), b - a, polyAt(top, -b), a - b, A, B];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Split into $${lettersTex(params)}$ by cover-up. Top row: the top of the fraction at $x = ${-a}$, then $${bracketTex(b)}$ there; the same two at $x = ${-b}$. Below them, $A$ and $B$.`,
        },
      ],
      expression: splitFractionTex(params),
      nodes: [
        { id: 'top-at-a', from: [] },
        { id: 'rest-at-a', from: [] },
        { id: 'top-at-b', from: [] },
        { id: 'rest-at-b', from: [] },
        { id: 'A', from: ['top-at-a', 'rest-at-a'] },
        { id: 'B', from: ['top-at-b', 'rest-at-b'] },
      ],
      bank: wholeBank(answer, [-A, -B, a + b, polyAt(top, a)]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { A, B, a, b } = params;
    const top = splitTop(params);
    return [
      { text: `At $x = ${-a}$ the top is $${polyAt(top, -a)}$ and $${bracketTex(b)}$ is $${b - a}$, so $A = ${A}$.` },
      { text: `At $x = ${-b}$ the top is $${polyAt(top, -b)}$ and $${bracketTex(a)}$ is $${a - b}$, so $B = ${B}$.` },
      { tex: `= ${splitTex(params)}` },
      { text: 'Each substitution makes one bracket zero, which is what wipes out the other numerator.' },
    ];
  },
};

interface PoleParams extends CoverParams {
  /** How far the track runs past each root of the bottom. */
  left: number;
  right: number;
}

function poleTrack({ a, b, left, right }: PoleParams): [number, number] {
  return [Math.min(-a, -b) - left, Math.max(-a, -b) + right];
}

/**
 * Which x to substitute, found on the graph: the bottom is zero where the
 * curve shoots off, and there are two such places, one for each numerator.
 */
const poleSlider: Generator<PoleParams> = {
  id: 'int-pf-pole-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ ...sampleCover(rng, difficulty), left: rng.int(1, 3), right: rng.int(1, 3) }),
      (params) => {
        const [min, max] = poleTrack(params);
        return -coverSides(params).own !== restingOn(min, max);
      },
      { A: 2, B: 3, a: 1, b: -2, ask: 'A', left: 2, right: 1 },
    ),
  render: (params): Slide => {
    const { own, name } = coverSides(params);
    const [min, max] = poleTrack(params);
    const top = splitTop(params);
    const f = (x: number) => polyAt(top, x) / ((x + params.a) * (x + params.b));
    const heights = Array.from({ length: 4 * (max - min) + 1 }, (_, i) => min + i / 4)
      .filter((x) => Math.abs(x + params.a) > 0.4 && Math.abs(x + params.b) > 0.4)
      .map((x) => Math.abs(f(x)));
    const high = 1.3 * Math.min(6, Math.max(1.5, ...heights));
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The graph is $y = ${splitFractionTex(params)}$, which splits as $${lettersTex(params)}$. To find $${name}$ by cover-up, which value of $x$ goes in? Slide the marker to it.`,
        },
      ],
      min,
      max,
      step: 1,
      answer: -own,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: -high,
          yMax: high,
          curves: [{ f, breaks: true }],
          label: 'The graph of the fraction, which shoots off where its bottom is zero',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { own, other, name } = coverSides(params);
    return [
      {
        text: `$${name}$ sits over $${bracketTex(own)}$, so cover that bracket and choose $x$ to make it zero: $x = ${-own}$.`,
      },
      {
        text: `On the graph that is one of the two places the curve shoots off, because the bottom is zero there. The other, $x = ${-other}$, is the one for the other numerator.`,
      },
      { tex: `${name} = ${coverSides(params).k}` },
    ];
  },
};

/**
 * Adding the split back up, the direction every learner already knows, with
 * the slip that makes partial fractions necessary in the first place: adding
 * the bottoms.
 */
const recombine: Generator<Split> = {
  id: 'int-pf-recombine',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty, false),
  render: (params): Slide => {
    const { A, B, a, b } = params;
    const bottom = `(${bracketTex(a)})(${bracketTex(b)})`;
    const over = (top: Poly, under = bottom) => ({
      tex: `\\frac{${polyTex(top)}}{${under}}`,
      answer: `(${polyAnswer(top)}) / (${under === bottom ? `${bracketAnswer(a)} * ${bracketAnswer(b)}` : polyAnswer([a + b, 2])})`,
    });
    const opts = options(
      over(splitTop(params)),
      // Each numerator times its own bracket rather than the other one.
      over([A * a + B * b, A + B]),
      // Taking one fraction from the other.
      over([A * b - B * a, A - B]),
      // Adding tops and adding bottoms.
      ...(A + B === 0 ? [] : [over([A + B], polyTex([a + b, 2]))]),
      over([-(A * b + B * a), -(A + B)]),
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Add these as one fraction. Which is it?' },
        { kind: 'display', tex: splitTex(params) },
      ],
      ...placedChoices(opts, mix(A, B, a, b)),
    };
  },
  solution: (params) => {
    const { A, B, a, b } = params;
    return [
      { text: 'Put both over the common bottom. Each top is multiplied by the bracket it is missing.' },
      { tex: `\\frac{${coeffTex(A, `(${bracketTex(b)})`)} ${B < 0 ? '-' : '+'} ${coeffTex(Math.abs(B), `(${bracketTex(a)})`)}}{(${bracketTex(a)})(${bracketTex(b)})}` },
      { tex: `= ${splitFractionTex(params)}` },
      { text: 'Partial fractions is this run backwards: from the single fraction to the two simple ones.' },
    ];
  },
};

interface LogTermParams {
  k: number;
  m: number;
  c: number;
}

function logTermCoefficient({ k, m }: LogTermParams): Ratio {
  return reduce(k, m);
}

/** k/(mx + c) integrated: a logarithm of the bracket, divided by its x coefficient. */
const logTerm: Generator<LogTermParams> = {
  id: 'int-pf-log-term',
  sample: (rng, difficulty) => {
    if (difficulty > 1) return { k: rng.sign() * rng.int(1, 9), m: rng.int(1, 5), c: rng.int(1, 9) };
    const m = rng.pick([1, 1, 2, 3]);
    return { k: rng.chance(0.6) ? m * rng.int(1, 4) : rng.int(1, 6), m, c: rng.int(1, 9) };
  },
  choices: (params) => {
    const { k, m, c } = params;
    const bracket = linearTex(m, c);
    const ln = `\\ln|${bracket}|`;
    const inside = `(${m}) * x + (${c})`;
    const term = (r: Ratio, body = ln, argument = inside) => ({
      tex: `${leadingTex(r)}${body} + C`,
      answer: `((${r.n})/(${r.d})) * log(${argument})`,
    });
    return steered(
      options(
        term(logTermCoefficient(params)),
        // Not divided by the x coefficient, then multiplied by it.
        term(reduce(k, 1)),
        term(reduce(k * m, 1)),
        // The bracket's constant dropped.
        term(logTermCoefficient(params), '\\ln|x|', 'x'),
        // Differentiated instead: the power rule on the bracket to the -1.
        {
          tex: `-\\frac{${k * m}}{(${bracket})^{2}} + C`,
          answer: `-(${k * m}) / (${inside})^2`,
        },
      ).slice(0, 4),
      mix(k, m, c),
    );
  },
  render: ({ k, m, c }): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Integrate, for $x > 0$.' }],
    lead: `${integralTex(`${k < 0 ? '-' : ''}\\frac{${Math.abs(k)}}{${linearTex(m, c)}}`)} =`,
    keypad: EXP_INTEGRAL_KEYS,
    answer: `((${k})/(${m})) * log((${m}) * x + (${c}))`,
    integrand: `(${k}) / ((${m}) * x + (${c}))`,
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (params) => {
    const { k, m, c } = params;
    const coefficient = logTermCoefficient(params);
    return [
      { text: `$\\int \\frac{1}{x} \\, dx = \\ln|x|$, and a bracket works the same way: the top is a number and the bottom is linear.` },
      ...(m === 1
        ? []
        : [{ text: `The $x$ in the bracket has coefficient $${m}$, so divide by $${m}$, exactly as for any linear bracket.` }]),
      { tex: `${leadingTex(coefficient)}\\ln|${linearTex(m, c)}| + C` },
      { text: `Check by differentiating: the chain rule brings the $${m}$ back and returns $\\frac{${k}}{${linearTex(m, c)}}$.` },
    ];
  },
};

interface IntegrateParams extends Split {
  expanded: boolean;
}

/** The whole method, typed: split, then integrate each part to a logarithm. */
const integrateSplit: Generator<IntegrateParams> = {
  id: 'int-pf-integrate',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty, true), expanded: difficulty > 1 && rng.chance(0.5) }),
  choices: (params) => {
    const { A, B, a, b } = params;
    const choice = (split: Split) => ({ tex: `${lnSumTex(split)} + C`, answer: lnSumAnswer(split) });
    return steered(
      options(
        choice(params),
        // Numerators swapped over, and each sign slip.
        choice({ A: B, B: A, a, b }),
        choice({ A, B: -B, a, b }),
        choice({ A: -A, B, a, b }),
      ),
      mix(A, B, a, b),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Split into partial fractions, then integrate, for $x > 0$.' }],
    lead: `${integralTex(splitFractionTex(params, params.expanded))} =`,
    keypad: EXP_INTEGRAL_KEYS,
    answer: lnSumAnswer(params),
    integrand: splitFractionAnswer(params),
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (params) => {
    const { a, b, expanded } = params;
    return [
      ...(expanded ? [{ text: `Factorise the bottom first: $(${bracketTex(a)})(${bracketTex(b)})$.` }] : []),
      { text: `Cover-up at $x = ${-a}$ and $x = ${-b}$ splits the fraction:` },
      { tex: `${splitTex(params)}` },
      { text: 'Each part is a number over a linear bracket, so each integrates to a logarithm.' },
      { tex: lnSumStacked(params) },
    ];
  },
};

/** The split and the integration as tiles, brackets of either sign allowed. */
const integrateTiles: Generator<Split> = {
  id: 'int-pf-integrate-tiles',
  sample: (rng, difficulty) => sampleSplit(rng, difficulty, false),
  render: (params): Slide => {
    const { A, B, a, b } = params;
    // A whole term per tile, the second carrying its own sign, so a slip in
    // a sign or a numerator is a slip in the tile. Two tiles fit a phone's
    // width where four pieces of template did not.
    const later = (k: number, at: number) => lnTermTex(k, at, false).trim();
    const answer = [lnTermTex(A, a, true), later(B, b)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Split into partial fractions and integrate each part. The $+ C$ is left off here.' },
        { kind: 'display', tex: integralTex(splitFractionTex(params)) },
      ],
      template: '{0} \\; {1}',
      // Signs flipped, the numerators swapped, and the top before dividing.
      bank: tokenBank(answer, [
        lnTermTex(-A, a, true),
        lnTermTex(B, a, true),
        later(-B, b),
        later(A, b),
        lnTermTex(A * (b - a), a, true),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { A, B, a, b } = params;
    const top = splitTop(params);
    return [
      { text: `Cover-up: at $x = ${-a}$, $A = \\frac{${polyAt(top, -a)}}{${b - a}} = ${A}$; at $x = ${-b}$, $B = \\frac{${polyAt(top, -b)}}{${a - b}} = ${B}$.` },
      { tex: `${splitTex(params)}` },
      { text: 'Each part integrates to its numerator times the logarithm of its bracket.' },
      { tex: lnSumStacked(params) },
    ];
  },
};

interface DefiniteParams extends Split {
  l: number;
  u: number;
}

/** A multiplied by ln((u + a)/(l + a)) and so on, collapsed to one fraction inside a single log. */
function logRatio(parts: [top: number, bottom: number, power: number][]): Ratio {
  let n = 1;
  let d = 1;
  for (const [top, bottom, power] of parts) {
    for (let i = 0; i < Math.abs(power); i += 1) {
      n *= power > 0 ? top : bottom;
      d *= power > 0 ? bottom : top;
    }
  }
  return reduce(n, d);
}

function definiteRatio({ A, B, a, b, l, u }: DefiniteParams): Ratio {
  return logRatio([
    [u + a, l + a, A],
    [u + b, l + b, B],
  ]);
}

/**
 * A definite integral of a split fraction whose answer collapses to one log.
 *
 * Numerators of one or two, so the fraction inside stays small enough to read;
 * brackets may be x - 1 or x - 2 where the interval keeps clear of their root.
 */
function sampleDefinite(rng: Rng, difficulty: number): DefiniteParams {
  const hard = difficulty > 1;
  const coefficient = () => rng.pick(hard ? [-2, -1, 1, 1, 2] : [-1, 1, 1, 2]);
  const bracket = () => rng.pick(hard ? [-2, -1, 1, 2, 3, 4, 5] : [-1, 1, 2, 3, 4]);
  return drawUntil(
    () => {
      const l = rng.int(0, hard ? 3 : 2);
      return { A: coefficient(), B: coefficient(), a: bracket(), b: bracket(), l, u: l + rng.int(1, hard ? 3 : 2) };
    },
    (params) => {
      const r = definiteRatio(params);
      return (
        params.a !== params.b &&
        params.l + Math.min(params.a, params.b) >= 1 &&
        !(r.n === r.d) &&
        r.n <= 400 &&
        r.d <= 400
      );
    },
    { A: 1, B: 1, a: 1, b: 2, l: 0, u: 1 },
  );
}

function definiteSolution(params: DefiniteParams) {
  const { a, b, l, u } = params;
  return [
    { text: `Split first: $${splitTex(params)}$, which integrates to $${lnSumTex(params)}$.` },
    { text: `Put in $x = ${u}$, then $x = ${l}$, and subtract. The brackets are positive between the limits, so the bars can go.` },
    {
      tex: stacked(
        `${params.A === 1 ? '' : params.A === -1 ? '-' : params.A}\\ln\\frac{${u + a}}{${l + a}}`,
        `${params.B < 0 ? '-' : '+'} ${Math.abs(params.B) === 1 ? '' : Math.abs(params.B)}\\ln\\frac{${u + b}}{${l + b}}`,
      ),
    },
    { text: 'A number in front becomes a power, and logs added or taken away become one log of a product or a quotient.' },
    { tex: `= ${lnOfTex(definiteRatio(params))}` },
  ];
}

/** The definite integral, asked for as a single logarithm. */
const definiteSplit: Generator<DefiniteParams> = {
  id: 'int-pf-definite',
  sample: sampleDefinite,
  render: (params): Slide => {
    const { A, B, a, b, l, u } = params;
    const right = definiteRatio(params);
    const same = (r: Ratio) => r.n === right.n && r.d === right.d;
    const wrong = [
      // Lower limit minus upper.
      reduce(right.d, right.n),
      // Numerators swapped.
      logRatio([
        [u + a, l + a, B],
        [u + b, l + b, A],
      ]),
      // The numbers in front left off.
      logRatio([
        [u + a, l + a, Math.sign(A)],
        [u + b, l + b, Math.sign(B)],
      ]),
      // Only the upper limit put in.
      logRatio([
        [u + a, 1, A],
        [u + b, 1, B],
      ]),
      // Both logs added, whatever their signs.
      logRatio([
        [u + a, l + a, Math.abs(A)],
        [u + b, l + b, Math.abs(B)],
      ]),
    ].filter((r, idx, all) => !same(r) && r.n !== r.d && all.findIndex((s) => s.n === r.n && s.d === r.d) === idx);
    const opts = options(
      { tex: lnOfTex(right), answer: `log(${right.n}/${right.d})` },
      ...wrong.map((r) => ({ tex: lnOfTex(r), answer: `log(${r.n}/${r.d})` })),
    );
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Evaluate, as a single logarithm.' },
        { kind: 'display', tex: definiteTex(splitFractionTex(params), l, u) },
      ],
      ...placedChoices(opts, mix(A, B, a, b, l, u)),
    };
  },
  solution: definiteSolution,
};

/**
 * Putting the limits into the logs, as tiles: each log's upper value over its
 * lower one, which is the quotient law applied to one bracket at a time.
 */
const substituteLimits: Generator<DefiniteParams> = {
  id: 'int-pf-substitute',
  sample: sampleDefinite,
  render: (params): Slide => {
    const { A, B, a, b, l, u } = params;
    const [first, second] = [reduce(u + a, l + a), reduce(u + b, l + b)];
    const answer = [fractionTex(first), fractionTex(second)];
    const lead = (k: number) => (k === 1 ? '' : k === -1 ? '-' : `${k}`);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$${splitTex(params)}$ integrates to $${lnSumTex(params)}$. Put in the limits $x = ${u}$ and $x = ${l}$, and write each log as one.`,
        },
      ],
      template: `${lead(A)}\\ln {0} ${B < 0 ? '-' : '+'} ${lead(Math.abs(B))}\\ln {1}`,
      // Each fraction upside down, and the upper limit put in alone.
      bank: tokenBank(answer, [
        fractionTex(reduce(first.d, first.n)),
        fractionTex(reduce(second.d, second.n)),
        `${u + a}`,
        `${u + b}`,
      ]),
      answer,
    };
  },
  solution: definiteSolution,
};

interface FindLimitParams {
  k: number;
  a: number;
  h: number;
  right: number;
}

/**
 * The upper limit that gives a stated logarithm, dragged to on the curve: the
 * integral run backwards, as `int-vol-find-limit` runs a volume.
 */
const findLimit: Generator<FindLimitParams> = {
  id: 'int-pf-find-limit',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ k: rng.int(1, difficulty > 1 ? 4 : 3), a: rng.int(1, 5), h: rng.int(1, difficulty > 1 ? 9 : 7), right: rng.int(2, 4) }),
      ({ h, right }) => h !== restingOn(0, h + right),
      { k: 1, a: 2, h: 4, right: 3 },
    ),
  render: ({ k, a, h, right }): Slide => {
    const max = h + right;
    const window = markerWindow(0, max);
    const top = k / a;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$\\int_{0}^{h} \\frac{${k}}{${bracketTex(a)}} \\, dx = ${leadingTex(reduce(k, 1))}${lnOfTex(reduce(h + a, a))}$. Slide the marker to $h$.`,
        },
      ],
      min: 0,
      max,
      step: 1,
      answer: h,
      readout: 'h = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: -0.15 * top,
          yMax: 1.2 * top,
          curves: [{ f: (x) => k / (x + a) }],
          label: `The curve y = ${k}/(x + ${a}) for x from 0`,
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: ({ k, a, h }) => {
    const r = reduce(h + a, a);
    return [
      { text: `The integral is $${leadingTex(reduce(k, 1))}\\ln|${bracketTex(a)}|$ between $0$ and $h$:` },
      { tex: `${leadingTex(reduce(k, 1))}\\ln\\frac{h + ${a}}{${a}}` },
      { text: `Match it to the value given: $\\frac{h + ${a}}{${a}} = ${fractionTex(r)}$, so $h + ${a} = ${h + a}$.` },
      { tex: `h = ${h}` },
    ];
  },
};

type FprimeForm = 'square' | 'quad' | 'cube';

interface FprimeParams {
  form: FprimeForm;
  /** The top is n x, n x^2 or n(2x + s): n times the derivative, over 2, 3 or 1. */
  n: number;
  s: number;
  t: number;
}

function fprimeBottom({ form, s, t }: FprimeParams): Poly {
  if (form === 'cube') return [t, 0, 0, 1];
  return [t, form === 'quad' ? s : 0, 1];
}

function fprimeTop({ form, n, s }: FprimeParams): Poly {
  if (form === 'square') return [0, n];
  if (form === 'cube') return [0, 0, n];
  return [n * s, 2 * n];
}

/** How many times the derivative the top is. */
function fprimeCoefficient({ form, n }: FprimeParams): Ratio {
  return reduce(n, form === 'square' ? 2 : form === 'cube' ? 3 : 1);
}

function fprimeLnTex(params: FprimeParams): string {
  const bottom = polyTex(fprimeBottom(params));
  // x^2 + t is positive everywhere, so a textbook writes a bracket, not bars.
  return params.form === 'square' ? `\\ln(${bottom})` : `\\ln|${bottom}|`;
}

/**
 * The shortcut beside partial fractions: a top that is a multiple of the
 * bottom's derivative integrates straight to a logarithm of the bottom.
 */
const fprimeOverF: Generator<FprimeParams> = {
  id: 'int-pf-fprime',
  sample: (rng, difficulty) => {
    const form = rng.pick<FprimeForm>(['square', 'quad', 'cube']);
    const hard = difficulty > 1;
    const t = rng.int(1, 9);
    const s = form === 'quad' ? rng.int(1, 6) : 0;
    if (form === 'quad') return { form, n: (hard && rng.chance(0.3) ? -1 : 1) * rng.int(1, hard ? 5 : 3), s, t };
    const step = form === 'square' ? 2 : 3;
    return { form, n: hard ? rng.sign() * rng.int(1, 9) : step * rng.int(1, 3), s, t };
  },
  choices: (params) => {
    const bottom = polyAnswer(fprimeBottom(params));
    const right = fprimeCoefficient(params);
    const scaled = (r: Ratio) => ({
      tex: `${leadingTex(r)}${fprimeLnTex(params)} + C`,
      answer: `((${r.n})/(${r.d})) * log(${bottom})`,
    });
    return steered(
      options(
        scaled(right),
        // The factor left off, turned upside down, and the top's own number.
        scaled(reduce(1, 1)),
        scaled(reduce(right.d, right.n)),
        scaled(reduce(params.n, 1)),
        scaled(reduce(2 * right.n, right.d)),
        scaled(reduce(-right.n, right.d)),
      ).slice(0, 4),
      mix(params.n, params.s, params.t, params.form.length),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Integrate, for $x > 0$.' }],
    lead: `${integralTex(`\\frac{${polyTex(fprimeTop(params))}}{${polyTex(fprimeBottom(params))}}`)} =`,
    keypad: EXP_INTEGRAL_KEYS,
    answer: `((${fprimeCoefficient(params).n})/(${fprimeCoefficient(params).d})) * log(${polyAnswer(fprimeBottom(params))})`,
    integrand: `(${polyAnswer(fprimeTop(params))}) / (${polyAnswer(fprimeBottom(params))})`,
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (params) => {
    const bottom = fprimeBottom(params);
    const derivative = bottom.slice(1).map((value, power) => value * (power + 1));
    const r = fprimeCoefficient(params);
    return [
      { text: `The bottom is $${polyTex(bottom)}$ and its derivative is $${polyTex(derivative)}$.` },
      {
        text: `The top, $${polyTex(fprimeTop(params))}$, is $${fractionTex({ n: Math.abs(r.n), d: r.d })}$ times ${r.n < 0 ? 'minus ' : ''}that derivative.`,
      },
      { tex: `\\int \\frac{f'(x)}{f(x)} \\, dx = \\ln|f(x)| + C` },
      { tex: `= ${leadingTex(r)}${fprimeLnTex(params)} + C` },
      { text: 'Differentiating the answer checks it: the chain rule puts the derivative of the bottom back on top.' },
    ];
  },
};

interface DivideParams extends Split {
  /** The whole part left after dividing. */
  k: number;
}

/** The top k(x + a)(x + b) + A(x + b) + B(x + a): one degree too many to split. */
function divideTop(params: DivideParams): Poly {
  return polyAdd(polyScale(splitBottom(params), params.k), splitTop(params));
}

/** A top-heavy fraction: divide, then split what is left. */
const divideFirst: Generator<DivideParams> = {
  id: 'int-pf-divide',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty, false), k: rng.int(1, difficulty > 1 ? 4 : 2) }),
  render: (params): Slide => {
    const { A, B, a, b, k } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: `\\frac{${polyTex(divideTop(params))}}{(${bracketTex(a)})(${bracketTex(b)})}` },
        {
          kind: 'prose',
          text: `The top's degree is not lower than the bottom's, so divide first. Write it as $k + ${lettersTex(params)}$ and place the numbers.`,
        },
      ],
      template: 'k = {0}, \\quad A = {1}, \\quad B = {2}',
      // Signs flipped, and the remainder's own coefficients.
      bank: wholeBank([k, A, B], [-A, -B, A + B, k + 1]),
      answer: [`${k}`, `${A}`, `${B}`],
    };
  },
  solution: (params) => {
    const { a, b, k } = params;
    return [
      { text: `The bottom multiplies out to $${polyTex(splitBottom(params))}$. It goes into the top $${k}$ times.` },
      {
        tex: stacked(
          `${polyTex(divideTop(params))}`,
          `= ${coeffTex(k, `(${polyTex(splitBottom(params))})`)}`,
          `\\quad ${sumTex(['x', polyTex(splitTop(params))]).slice(1)}`,
        ),
      },
      { text: `What is left over, $${polyTex(splitTop(params))}$, is lower in degree than the bottom, so it splits by cover-up at $x = ${-a}$ and $x = ${-b}$.` },
      { tex: `${k}${splitAfter(params)}` },
    ];
  },
};

/** The top-heavy integral typed: kx from the division, then the two logarithms. */
const topHeavy: Generator<DivideParams> = {
  id: 'int-pf-top-heavy',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty, true), k: rng.int(1, difficulty > 1 ? 4 : 2) }),
  choices: (params) => {
    const { A, B, a, b, k } = params;
    const choice = (split: Split, whole: number) => ({
      tex: `${whole === 0 ? lnSumTex(split) : `${termTex(whole, 1)}${lnSumAfter(split)}`} + C`,
      answer: `(${whole}) * x + ${lnSumAnswer(split)}`,
    });
    return steered(
      options(
        choice(params, k),
        // The division forgotten; numerators swapped; a sign slip.
        choice(params, 0),
        choice({ A: B, B: A, a, b }, k),
        choice({ A, B: -B, a, b }, k),
      ),
      mix(A, B, a, b, k),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Integrate, for $x > 0$. Divide first.' }],
    lead: `${integralTex(`\\frac{${polyTex(divideTop(params))}}{(${bracketTex(params.a)})(${bracketTex(params.b)})}`)} =`,
    keypad: EXP_INTEGRAL_KEYS,
    answer: `(${params.k}) * x + ${lnSumAnswer(params)}`,
    integrand: `(${polyAnswer(divideTop(params))}) / (${bracketAnswer(params.a)} * ${bracketAnswer(params.b)})`,
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (params) => {
    const { k } = params;
    return [
      { text: `The bottom goes into the top $${k}$ times, leaving $${polyTex(splitTop(params))}$ over the same bottom.` },
      { tex: `${k}${splitAfter(params)}` },
      { text: `The whole number integrates to $${termTex(k, 1)}$ and each fraction to a logarithm.` },
      {
        tex: stacked(
          `${termTex(k, 1)}${lnTermTex(params.A, params.a, false)}`,
          `${lnTermTex(params.B, params.b, false).trim()} + C`,
        ),
      },
    ];
  },
};

interface RepeatedParams {
  A: number;
  B: number;
  a: number;
}

/** The top A(x + a) + B over (x + a)^2, lowest power first. */
const repeatedTop = ({ A, B, a }: RepeatedParams): Poly => [A * a + B, A];

function repeatedFractionTex(params: RepeatedParams): string {
  return `\\frac{${polyTex(repeatedTop(params))}}{(${bracketTex(params.a)})^{2}}`;
}

function sampleRepeated(rng: Rng, difficulty: number, positive: boolean): RepeatedParams {
  const hard = difficulty > 1;
  const reach = hard ? 7 : 5;
  return {
    A: rng.sign() * rng.int(1, hard ? 6 : 4),
    B: rng.sign() * rng.int(1, hard ? 8 : 5),
    a: positive ? rng.int(1, reach) : rng.sign() * rng.int(1, reach),
  };
}

function repeatedSplitTex({ A, B, a }: RepeatedParams): string {
  return `${fractionTermTex(A, a, true)}${fractionTermTex(B, a, false, true)}`;
}

function repeatedSolution(params: RepeatedParams) {
  const { A, B, a } = params;
  return [
    { text: `Write the top in terms of the bracket: $${polyTex(repeatedTop(params))} = ${coeffTex(A, `(${bracketTex(a)})`)} ${B < 0 ? '-' : '+'} ${Math.abs(B)}$.` },
    { text: 'Divide each part by the bracket squared:' },
    { tex: `${repeatedSplitTex(params)}` },
    { text: `So $A = ${A}$, the $x$ coefficient of the top, and $B = ${B}$, the top's value at $x = ${-a}$.` },
  ];
}

/** A repeated bracket's split, as tiles. */
const repeatedSplit: Generator<RepeatedParams> = {
  id: 'int-pf-repeated',
  sample: (rng, difficulty) => sampleRepeated(rng, difficulty, false),
  render: (params): Slide => {
    const { A, B, a } = params;
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: repeatedFractionTex(params) },
        {
          kind: 'prose',
          text: `The bracket is repeated, so split it as $\\frac{A}{${bracketTex(a)}} + \\frac{B}{(${bracketTex(a)})^{2}}$. Place $A$ and $B$.`,
        },
      ],
      template: 'A = {0}, \\quad B = {1}',
      // The top's constant term, the signs flipped, and A times a.
      bank: wholeBank([A, B], [A * a + B, -B, -A, A * a]),
      answer: [`${A}`, `${B}`],
    };
  },
  solution: repeatedSolution,
};

/** A repeated bracket integrated: a logarithm, and a power that is not one. */
const repeatedIntegrate: Generator<RepeatedParams> = {
  id: 'int-pf-repeated-integrate',
  sample: (rng, difficulty) => sampleRepeated(rng, difficulty, true),
  choices: (params) => {
    const { A, B, a } = params;
    const ln = lnTermTex(A, a, true);
    const inside = bracketAnswer(a);
    const withSecond = (tex: string, answer: string) => ({
      tex: `${ln}${tex} + C`,
      answer: `(${A}) * log${inside} + ${answer}`,
    });
    return steered(
      options(
        withSecond(fractionTermTex(-B, a, false), `(${-B}) / ${inside}`),
        // The sign of the power rule lost; the square kept; a log for the square too.
        withSecond(fractionTermTex(B, a, false), `(${B}) / ${inside}`),
        withSecond(fractionTermTex(-B, a, false, true), `(${-B}) / ${inside}^2`),
        withSecond(lnTermTex(B, a, false), `(${B}) * log${inside}`),
      ),
      mix(A, B, a),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Split into partial fractions, then integrate, for $x > 0$.' }],
    lead: `${integralTex(repeatedFractionTex(params))} =`,
    keypad: EXP_INTEGRAL_KEYS,
    answer: `(${params.A}) * log${bracketAnswer(params.a)} - (${params.B}) / ${bracketAnswer(params.a)}`,
    integrand: `(${polyAnswer(repeatedTop(params))}) / ${bracketAnswer(params.a)}^2`,
    domain: 'positive',
    mode: 'upToConstant',
  }),
  solution: (params) => {
    const { A, B, a } = params;
    return [
      { tex: `${repeatedSplitTex(params)}` },
      { text: `The first part is a logarithm. The second is $${coeffTex(B, `(${bracketTex(a)})^{-2}`)}$, which integrates by the power rule, not to a log.` },
      { tex: `\\int ${coeffTex(B, `(${bracketTex(a)})^{-2}`)} dx = ${B < 0 ? '' : '-'}\\frac{${Math.abs(B)}}{${bracketTex(a)}}` },
      { tex: `${lnTermTex(A, a, true)}${fractionTermTex(-B, a, false)} + C` },
    ];
  },
};

type FormKind = 'divide' | 'fprime' | 'repeated' | 'distinct';

interface FormParams {
  kind: FormKind;
  split: DivideParams;
  fprime: FprimeParams;
  repeated: RepeatedParams;
  /** The bottom multiplied out rather than factorised. */
  expanded: boolean;
}

function formIntegrandTex({ kind, split, fprime, repeated, expanded }: FormParams): string {
  const bottom = expanded ? polyTex(splitBottom(split)) : `(${bracketTex(split.a)})(${bracketTex(split.b)})`;
  if (kind === 'divide') return `\\frac{${polyTex(divideTop(split))}}{${bottom}}`;
  if (kind === 'distinct') return `\\frac{${polyTex(splitTop(split))}}{${bottom}}`;
  if (kind === 'fprime') return `\\frac{${polyTex(fprimeTop(fprime))}}{${polyTex(fprimeBottom(fprime))}}`;
  const square = expanded ? polyTex([repeated.a * repeated.a, 2 * repeated.a, 1]) : `(${bracketTex(repeated.a)})^{2}`;
  return `\\frac{${polyTex(repeatedTop(repeated))}}{${square}}`;
}

const FORM_DIVIDE = 'Divide first, then split the proper fraction that is left.';
const FORM_FPRIME = 'The top is a multiple of the derivative of the bottom: integrate straight to a logarithm of the bottom.';
const FORM_REPEATED = 'Split as $\\frac{A}{x + a} + \\frac{B}{(x + a)^{2}}$: a logarithm and a power.';
const FORM_DISTINCT = 'Split as $\\frac{A}{x + a} + \\frac{B}{x + b}$: two logarithms.';

/**
 * Which method a fraction calls for, as a route: degree first, then the
 * derivative shortcut, then whether the bottom has a repeated bracket.
 *
 * The outcomes state a method and never judge the route, so a wrong turn
 * discloses nothing before the answer is checked.
 */
const formFlow: Generator<FormParams> = {
  id: 'int-pf-form-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({
        kind: rng.pick<FormKind>(['divide', 'fprime', 'repeated', 'distinct']),
        split: { ...sampleSplit(rng, difficulty, false), k: rng.int(1, 3) },
        fprime: {
          form: rng.pick<FprimeForm>(['square', 'quad', 'quad']),
          n: rng.int(1, hard ? 6 : 3),
          s: rng.int(1, 6),
          t: rng.int(1, 9),
        },
        repeated: sampleRepeated(rng, difficulty, false),
        expanded: hard && rng.chance(0.5),
      }),
      // A distinct pair whose top happens to be a multiple of the bottom's
      // derivative would have two right routes; leave those out.
      ({ kind, split }) => {
        if (kind !== 'distinct') return true;
        const [q, p] = splitTop(split);
        return p * (split.a + split.b) !== 2 * q;
      },
      {
        kind: 'distinct',
        split: { A: 2, B: 3, a: 1, b: 2, k: 1 },
        fprime: { form: 'square', n: 2, s: 0, t: 1 },
        repeated: { A: 1, B: 2, a: 1 },
        expanded: false,
      },
    );
  },
  render: (params): Slide => {
    const answer: Record<FormKind, string[]> = {
      divide: ['No'],
      fprime: ['Yes', 'Yes'],
      repeated: ['Yes', 'No', 'Yes'],
      distinct: ['Yes', 'No', 'No'],
    };
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Decide how to integrate this fraction. Each answer chooses what gets asked next.',
        },
      ],
      subject: integralTex(formIntegrandTex(params)),
      steps: [
        {
          id: 'degree',
          ask: "Is the top's degree lower than the bottom's?",
          branches: [
            { label: 'Yes', to: 'derivative' },
            { label: 'No', outcome: FORM_DIVIDE },
          ],
        },
        {
          id: 'derivative',
          ask: 'Is the top a number times the derivative of the bottom?',
          branches: [
            { label: 'Yes', outcome: FORM_FPRIME },
            { label: 'No', to: 'repeated' },
          ],
        },
        {
          id: 'repeated',
          ask: 'Does the bottom have a repeated bracket?',
          branches: [
            { label: 'Yes', outcome: FORM_REPEATED },
            { label: 'No', outcome: FORM_DISTINCT },
          ],
        },
      ],
      answer: answer[params.kind],
    };
  },
  solution: (params) => {
    const { kind, split, fprime, repeated } = params;
    if (kind === 'divide') {
      return [
        { text: 'The top and the bottom are both quadratics, so the top is not lower in degree.' },
        { text: `Divide first: it becomes $${split.k}${splitAfter(split)}$, and only then does it split.` },
      ];
    }
    if (kind === 'fprime') {
      const bottom = fprimeBottom(fprime);
      const derivative = bottom.slice(1).map((value, power) => value * (power + 1));
      return [
        { text: 'The top is linear and the bottom quadratic, so the degree is lower.' },
        { text: `The bottom's derivative is $${polyTex(derivative)}$, and the top is a number times it.` },
        { text: `So the integral is $${leadingTex(fprimeCoefficient(fprime))}${fprimeLnTex(fprime)} + C$, with no splitting at all.` },
      ];
    }
    if (kind === 'repeated') {
      return [
        { text: 'The top is linear and the bottom quadratic, so the degree is lower.' },
        { text: `The bottom's derivative is $${polyTex([2 * repeated.a, 2])}$, and the top is not a number times it.` },
        { text: `The bottom is $(${bracketTex(repeated.a)})^{2}$, a repeated bracket, so the split is $${repeatedSplitTex(repeated)}$.` },
      ];
    }
    return [
      { text: 'The top is linear and the bottom quadratic, so the degree is lower.' },
      { text: `The bottom's derivative is $${polyTex([split.a + split.b, 2])}$, and the top is not a number times it.` },
      { text: `The bottom is $(${bracketTex(split.a)})(${bracketTex(split.b)})$, two different brackets, so the split is $${splitTex(split)}$.` },
    ];
  },
};

/* ---------- Level 7: improper integrals ---------- */

/*
 * An improper integral has an end the ordinary method cannot reach: an
 * infinite limit, or a point where the integrand is unbounded. The fix is
 * always the same: put t in place of that end, integrate as usual, and let t
 * go to it. Every value in this level is built outward from a whole answer:
 * the coefficient on the page is chosen from the answer, so nothing is
 * rounded.
 *
 * The oracles in `generators.test.ts` cannot see any of this. Quadrature over
 * declared limits reads finite limits only and would integrate straight
 * through a pole, and the antiderivative oracle is for indefinite integrals.
 * So no slide here declares `integrand` or `limits`. Instead each question
 * with a value exports its integral as an `ImproperSpec`, and
 * `improper.test.ts` integrates that numerically out towards infinity or in
 * towards the pole, and compares it with the answer read off the slide.
 */

/** An improper integral, for the independent check in `improper.test.ts`. Never displayed. */
export interface ImproperSpec {
  /** The integrand in mathjs syntax, in x. */
  f: string;
  /** Either may be infinite. */
  lower: number;
  upper: number;
  /** Interior points to split at: a pole, or a kink such as |x| has at 0. */
  splits?: number[];
}

/** A power of x as p = m/q, in lowest terms. */
interface Power {
  m: number;
  q: number;
}

const pw = (m: number, q = 1): Power => ({ m, q });

/**
 * (inner)^(m/q) as a textbook writes it: `x^{2}`, `\sqrt{x}`, `x\sqrt[3]{x}`,
 * `(x - 2)^{2}`, `\sqrt[3]{(x + 1)^{2}}`.
 */
function powerOfTex({ m, q }: Power, inner = 'x'): string {
  const base = inner.includes(' ') ? `(${inner})` : inner;
  const whole = Math.floor(m / q);
  const rest = m % q;
  if (whole === 1 && rest === 0) return inner;
  const outside = whole === 0 ? '' : whole === 1 ? base : `${base}^{${whole}}`;
  if (rest === 0) return outside;
  const index = q === 2 ? '' : `[${q}]`;
  const under = rest === 1 ? inner : `${base}^{${rest}}`;
  return `${outside}\\sqrt${index}{${under}}`;
}

/** The same power for mathjs; a cube root goes through `cbrt` so a negative inside stays real. */
function powerAnswer({ m, q }: Power, c = 0): string {
  const inner = c === 0 ? 'x' : `(x - (${c}))`;
  if (q === 3) return `cbrt(${inner})^${m}`;
  return `${inner}^(${m}/${q})`;
}

/** The same power as a number; a square root of a negative is NaN, which a figure skips. */
function powerAt({ m, q }: Power, x: number): number {
  const root = q === 3 ? Math.cbrt(x) : q === 2 ? Math.sqrt(x) : x;
  return root ** m;
}

/** p = m/q as the learner reads it: `2`, `\frac{3}{2}`. */
const powerValueTex = ({ m, q }: Power): string => (q === 1 ? `${m}` : `\\frac{${m}}{${q}}`);

/** x - c as the learner reads it, or plain x. */
const shiftTex = (c: number): string => (c === 0 ? 'x' : linearTex(1, -c));

/** A limit of integration, infinite ones included. */
const endTex = (v: number): string => (v === Infinity ? '\\infty' : v === -Infinity ? '-\\infty' : `${v}`);

function improperTex(integrand: string, lower: number, upper: number): string {
  return `\\int_{${endTex(lower)}}^{${endTex(upper)}} ${integrand} \\, dx`;
}

/** x^n for a whole n, in whichever letter: `x`, `t^{2}`. */
const letterTo = (n: number, letter = 'x'): string => (n === 1 ? letter : `${letter}^{${n}}`);

/** k e^(-rx) for a decay, k e^(rx) for a negative r. */
function expTex(k: number, rate: number): string {
  const size = Math.abs(rate);
  return `${k === 1 ? '' : k}e^{${rate > 0 ? '-' : ''}${size === 1 ? '' : size}x}`;
}

/** A number a salt can use: infinite limits become fixed stand-ins. */
const saltOf = (v: number): number => (v === Infinity ? 101 : v === -Infinity ? 103 : v);

const DIVERGES_TEX = '\\text{Diverges}';
const convergesTex = (r: Ratio): string => `\\text{Converges to } ${ratioTex(r)}`;

/** Ratios for slips, the right value and repeats removed, at most `count` of them. */
function slipRatios(right: Ratio, slips: Ratio[], count: number): Ratio[] {
  const out: Ratio[] = [];
  for (const slip of slips) {
    if (out.length === count) break;
    if (!Number.isFinite(slip.n) || !Number.isFinite(slip.d) || slip.d === 0) continue;
    const same = (r: Ratio) => r.n === slip.n && r.d === slip.d;
    if (same(right) || out.some(same)) continue;
    out.push(slip);
  }
  return out;
}

/** A typed value's options: the value, numeric slips, and "diverges". */
function valueChoices(right: Ratio, slips: Ratio[], salt: number): ChoiceOption[] {
  const numeric = (r: Ratio) => ({ tex: ratioTex(r), answer: `${r.n}/${r.d}` });
  return steered(
    options(numeric(right), ...slipRatios(right, slips, 2).map(numeric), { tex: DIVERGES_TEX }),
    salt,
  );
}

/** A native "converge or diverge" choice: `right` is null when the integral diverges. */
function verdictOptions(right: Ratio | null, slips: Ratio[], salt: number) {
  const say = (r: Ratio) => ({ tex: convergesTex(r) });
  const opts =
    right === null
      ? options({ tex: DIVERGES_TEX }, ...slipRatios({ n: NaN, d: 1 }, slips, 3).map(say))
      : options(say(right), { tex: DIVERGES_TEX }, ...slipRatios(right, slips, 2).map(say));
  return placedChoices(opts, salt);
}

/* What makes an integral improper. */

type WhichKind = 'upper' | 'lower' | 'end' | 'inside' | 'proper';

export interface WhichParams {
  kind: WhichKind;
  k: number;
  power: Power;
  /** Where the bottom of the integrand is zero. */
  c: number;
  lower: number;
  upper: number;
}

function sampleWhich(rng: Rng, difficulty: number): WhichParams {
  const hard = difficulty > 1;
  const kind = rng.pick<WhichKind>(hard ? ['upper', 'lower', 'end', 'inside', 'proper', 'proper'] : ['upper', 'lower', 'end', 'inside', 'proper']);
  const k = rng.int(1, 9);
  const c = rng.int(-3, 3);
  const gap = rng.int(1, hard ? 2 : 3);
  const width = rng.int(2, 5);
  if (kind === 'upper') {
    return { kind, k, c, power: rng.pick([pw(2), pw(3), pw(1, 2), pw(3, 2)]), lower: c + gap, upper: Infinity };
  }
  if (kind === 'lower') return { kind, k, c, power: rng.pick([pw(2), pw(3)]), lower: -Infinity, upper: c - gap };
  if (kind === 'end') {
    const power = rng.pick([pw(1), pw(2), pw(1, 2), pw(1, 3)]);
    const atLower = power.q === 2 || rng.chance(0.5);
    return atLower ? { kind, k, c, power, lower: c, upper: c + width } : { kind, k, c, power, lower: c - width, upper: c };
  }
  if (kind === 'inside') {
    const left = rng.int(1, width - 1);
    return { kind, k, c, power: rng.pick([pw(1), pw(2), pw(1, 3), pw(2, 3)]), lower: c - left, upper: c - left + width };
  }
  const power = rng.pick([pw(1), pw(2), pw(1, 2), pw(2, 3)]);
  const right = power.q === 2 || rng.chance(0.5);
  return right
    ? { kind, k, c, power, lower: c + gap, upper: c + gap + width }
    : { kind, k, c, power, lower: c - gap - width, upper: c - gap };
}

const whichIntegrandTex = ({ k, power, c }: { k: number; power: Power; c: number }): string =>
  `\\frac{${k}}{${powerOfTex(power, shiftTex(c))}}`;

export function whichSpec({ k, power, c, lower, upper }: WhichParams): ImproperSpec & { pole: number } {
  return { f: `(${k}) / ${powerAnswer(power, c)}`, lower, upper, pole: c };
}

const WHICH_INFINITE = 'Improper: an infinite limit. Put $t$ in its place and let $t$ grow.';
const WHICH_POLE = 'Improper: the integrand is unbounded there. Put $t$ in place of that point and let $t$ approach it.';
const WHICH_PROPER = 'Proper: an ordinary definite integral, worked as usual.';

/**
 * Proper or improper, as a route: an infinite limit first, then a point in
 * the interval where the integrand is unbounded. The proper draws keep the
 * bad point one or two units outside the interval, which is the near miss.
 */
const whichFlow: Generator<WhichParams> = {
  id: 'int-imp-which-flow',
  sample: sampleWhich,
  render: (params): Slide => {
    const answer: Record<WhichKind, string[]> = {
      upper: ['Yes'],
      lower: ['Yes'],
      end: ['No', 'Yes'],
      inside: ['No', 'Yes'],
      proper: ['No', 'No'],
    };
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Is this integral improper? Each answer chooses what gets asked next.' }],
      subject: improperTex(whichIntegrandTex(params), params.lower, params.upper),
      steps: [
        {
          id: 'limit',
          ask: 'Is either limit infinite?',
          branches: [
            { label: 'Yes', outcome: WHICH_INFINITE },
            { label: 'No', to: 'unbounded' },
          ],
        },
        {
          id: 'unbounded',
          ask: 'Is the integrand unbounded anywhere from the lower limit to the upper, the ends included?',
          branches: [
            { label: 'Yes', outcome: WHICH_POLE },
            { label: 'No', outcome: WHICH_PROPER },
          ],
        },
      ],
      answer: answer[params.kind],
    };
  },
  solution: ({ kind, c, lower, upper }) => {
    if (kind === 'upper' || kind === 'lower') {
      return [
        { text: `The ${kind} limit is infinite, so the integral is improper whatever the integrand does.` },
        { text: 'It is worked as a limit: put $t$ in place of the infinite end, integrate, and let $t$ grow.' },
      ];
    }
    const where = kind === 'inside' ? 'inside the interval' : kind === 'end' ? 'an end of the interval' : 'outside the interval';
    return [
      { text: `Both limits are finite. The bottom of the integrand is zero at $x = ${c}$, where the integrand is unbounded.` },
      { text: `The interval runs from $${lower}$ to $${upper}$, so $x = ${c}$ is ${where}.` },
      {
        text:
          kind === 'proper'
            ? 'The integrand never blows up between the limits, so this is an ordinary definite integral.'
            : `So the integral is improper, and $x = ${c}$ is where the limit is taken.`,
      },
    ];
  },
};

interface PointParams {
  k: number;
  power: Power;
  c: number;
  lower: number;
  upper: number;
}

/** Where a finite-looking integral goes wrong, found on its graph. */
const problemPoint: Generator<PointParams> = {
  id: 'int-imp-problem-point',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const power = rng.pick([pw(1), pw(2), pw(1, 2), pw(1, 3), pw(2, 3)]);
        const lower = rng.int(-4, 1);
        const upper = lower + rng.int(4, difficulty > 1 ? 8 : 6);
        return { k: rng.int(1, 6), power, c: power.q === 2 ? lower : rng.int(lower, upper), lower, upper };
      },
      ({ c, lower, upper }) => c !== restingOn(lower, upper),
      { k: 2, power: pw(2), c: 1, lower: -2, upper: 4 },
    ),
  render: (params): Slide => {
    const { k, power, c, lower, upper } = params;
    const f = (x: number) => k / powerAt(power, x - c);
    const high = 3 * k;
    // An odd power changes sign across the pole; an even one or a square root does not.
    const signed = power.m % 2 === 1 && power.q !== 2;
    const window = markerWindow(lower, upper);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `Both limits of $${improperTex(whichIntegrandTex(params), lower, upper)}$ are finite, yet it is improper. Slide the marker to where the integrand is unbounded.`,
        },
      ],
      min: lower,
      max: upper,
      step: 1,
      answer: c,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: signed ? -high : -0.25 * high,
          yMax: high,
          curves: [{ f, breaks: true }],
          label: 'The graph of the integrand between the limits',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: ({ power, c, lower, upper }) => [
    { text: `The integrand is unbounded where its bottom is zero, and $${powerOfTex(power, shiftTex(c))}$ is zero at $x = ${c}$.` },
    {
      text: `That is ${c === lower || c === upper ? 'an end' : 'inside'} of the interval from $${lower}$ to $${upper}$. On the graph it is where the curve shoots off.`,
    },
    { tex: `x = ${c}` },
  ],
};

interface SpotIntegral {
  k: number;
  power: Power;
  c: number;
  lower: number;
  upper: number;
}

interface SpotParams {
  right: SpotIntegral;
  wrong: SpotIntegral[];
}

const spotTex = (s: SpotIntegral): string => improperTex(whichIntegrandTex(s), s.lower, s.upper);

/**
 * One improper integral among three ordinary ones. At difficulty 2 all four
 * share one integrand shape and finite limits, so the only difference is
 * whether the bad point lies inside the interval.
 */
const spotImproper: Generator<SpotParams> = {
  id: 'int-imp-spot',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shared = rng.pick([pw(1), pw(2), pw(1, 2), pw(2, 3)]);
    const powerFor = () => (hard ? shared : rng.pick([pw(1), pw(2), pw(3), pw(1, 2), pw(2, 3)]));
    const proper = (): SpotIntegral => {
      const power = powerFor();
      const c = rng.int(-3, 3);
      const width = rng.int(1, 4);
      const gap = rng.int(1, 2);
      return power.q === 2 || rng.chance(0.5)
        ? { k: rng.int(1, 9), power, c, lower: c + gap, upper: c + gap + width }
        : { k: rng.int(1, 9), power, c, lower: c - gap - width, upper: c - gap };
    };
    const improper = (): SpotIntegral => {
      const power = powerFor();
      const c = rng.int(-3, 3);
      const k = rng.int(1, 9);
      const width = rng.int(2, 4);
      const kind = power.q === 2 ? rng.pick(hard ? ['end'] : ['end', 'infinite']) : rng.pick(hard ? ['end', 'inside'] : ['end', 'infinite']);
      if (kind === 'infinite') return { k, power, c, lower: c + rng.int(1, 2), upper: Infinity };
      if (kind === 'inside') {
        const left = rng.int(1, width - 1);
        return { k, power, c, lower: c - left, upper: c - left + width };
      }
      return power.q === 2 || rng.chance(0.5) ? { k, power, c, lower: c, upper: c + width } : { k, power, c, lower: c - width, upper: c };
    };
    return drawUntil(
      () => ({ right: improper(), wrong: [proper(), proper(), proper()] }),
      ({ right, wrong }) => new Set([right, ...wrong].map(spotTex)).size === 4,
      {
        right: { k: 1, power: pw(2), c: 0, lower: -1, upper: 2 },
        wrong: [
          { k: 1, power: pw(2), c: 0, lower: 1, upper: 3 },
          { k: 2, power: pw(2), c: 1, lower: 2, upper: 4 },
          { k: 3, power: pw(2), c: -1, lower: -4, upper: -2 },
        ],
      },
    );
  },
  render: ({ right, wrong }): Slide => ({
    kind: 'choice',
    prompt: [{ kind: 'prose', text: 'Which of these integrals is improper?' }],
    ...placedChoices(
      [right, ...wrong].map((s) => ({ tex: spotTex(s) })),
      mix(right.k, right.c, saltOf(right.upper), ...wrong.map((s) => s.c * 7 + s.k)),
    ),
  }),
  solution: ({ right }) => [
    { tex: spotTex(right) },
    {
      text:
        right.upper === Infinity
          ? 'Its upper limit is infinite, so it is improper whatever the integrand does.'
          : `Its integrand is unbounded at $x = ${right.c}$, which is ${right.c === right.lower || right.c === right.upper ? 'an end' : 'inside'} of the interval from $${right.lower}$ to $${right.upper}$.`,
    },
    { text: 'In each of the others the bottom is zero only outside the interval, so the integrand stays bounded and the integral is an ordinary one.' },
  ],
};

type LimitKind = 'upper' | 'lower' | 'start' | 'finish';

interface LimitTilesParams {
  kind: LimitKind;
  k: number;
  n: number;
  a: number;
  b: number;
}

const limTok = (to: string): string => `\\lim_{t \\to ${to}}`;
const intTok = (lower: string | number, upper: string | number): string => `\\int_{${lower}}^{${upper}}`;

function limitTilesParts({ kind, k, n, a, b }: LimitTilesParams) {
  if (kind === 'upper') {
    return {
      integrand: `\\frac{${k}}{${letterTo(n)}}`,
      lower: a,
      upper: Infinity,
      answer: [limTok('\\infty'), intTok(a, 't')],
      wrong: [limTok('0'), limTok('-\\infty'), intTok('t', '\\infty'), intTok('t', a)],
    };
  }
  if (kind === 'lower') {
    return {
      integrand: expTex(k, -n),
      lower: -Infinity,
      upper: b,
      answer: [limTok('-\\infty'), intTok('t', b)],
      wrong: [limTok('\\infty'), limTok('0'), intTok(b, 't'), intTok('-\\infty', 't')],
    };
  }
  if (kind === 'start') {
    return {
      integrand: `\\frac{${k}}{\\sqrt{${shiftTex(a)}}}`,
      lower: a,
      upper: b,
      answer: [limTok(`${a}^{+}`), intTok('t', b)],
      wrong: [limTok(`${a}^{-}`), limTok(`${b}^{-}`), intTok(a, 't'), intTok('t', a)],
    };
  }
  return {
    integrand: `\\frac{${k}}{\\sqrt{${b} - x}}`,
    lower: a,
    upper: b,
    answer: [limTok(`${b}^{-}`), intTok(a, 't')],
    wrong: [limTok(`${b}^{+}`), limTok(`${a}^{+}`), intTok('t', b), intTok(b, 't')],
  };
}

/** The limit an improper integral stands for, assembled from tiles. */
const limitTiles: Generator<LimitTilesParams> = {
  id: 'int-imp-limit-tiles',
  sample: (rng, difficulty) => {
    const kind = rng.pick<LimitKind>(difficulty > 1 ? ['upper', 'lower', 'start', 'finish'] : ['upper', 'start', 'upper', 'lower']);
    const a = kind === 'upper' ? rng.int(1, 5) : rng.int(-3, 3);
    return { kind, k: rng.int(1, 9), n: rng.int(2, 3), a, b: kind === 'lower' ? rng.int(-3, 3) : a + rng.int(1, 6) };
  },
  render: (params): Slide => {
    const { integrand, lower, upper, answer, wrong } = limitTilesParts(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: improperTex('f(x)', lower, upper) },
        {
          kind: 'prose',
          text: `Here $f(x) = ${integrand}$. Put $t$ in place of the troublesome end and write the integral as a limit.`,
        },
      ],
      template: '{0} \\; {1} f(x) \\, dx',
      bank: tokenBank(answer, wrong),
      answer,
    };
  },
  solution: (params) => {
    const { kind, a, b } = params;
    const { lower, upper, answer } = limitTilesParts(params);
    const trouble =
      kind === 'upper'
        ? 'The upper limit is infinite.'
        : kind === 'lower'
          ? 'The lower limit is infinite.'
          : kind === 'start'
            ? `The integrand is unbounded at $x = ${a}$, the lower limit, and the integral only exists to the right of it.`
            : `The integrand is unbounded at $x = ${b}$, the upper limit, and the integral only exists to the left of it.`;
    return [
      { text: trouble },
      { text: 'Replace that end by $t$, keep the other limit, and let $t$ go to the troublesome end from inside the interval.' },
      { tex: stacked(`${improperTex('f(x)', lower, upper)}`, `= ${answer[0]} ${answer[1]} f(x) \\, dx`) },
    ];
  },
};

/* An infinite limit. */

export interface PowerTailParams {
  n: number;
  a: number;
  /** The value of the integral, from which the coefficient is built. */
  W: number;
}

/** The coefficient that makes the integral from a to infinity of k/x^n come to W. */
const powerTailK = ({ n, a, W }: PowerTailParams): number => W * (n - 1) * a ** (n - 1);

function samplePowerTail(rng: Rng, difficulty: number): PowerTailParams {
  return drawUntil(
    () =>
      difficulty > 1
        ? { n: rng.pick([2, 2, 3, 4]), a: rng.int(1, 3), W: rng.int(1, 8) }
        : { n: 2, a: rng.int(1, 4), W: rng.int(1, 8) },
    (params) => powerTailK(params) <= 120,
    { n: 2, a: 1, W: 3 },
  );
}

const powerTailTex = (params: PowerTailParams): string =>
  improperTex(`\\frac{${powerTailK(params)}}{${letterTo(params.n)}}`, params.a, Infinity);

export function powerTailSpec(params: PowerTailParams): ImproperSpec {
  return { f: `(${powerTailK(params)}) / x^${params.n}`, lower: params.a, upper: Infinity };
}

function powerTailSolution(params: PowerTailParams) {
  const { n, a, W } = params;
  const k = powerTailK(params);
  const c = k / (n - 1);
  return [
    { text: 'Put $t$ in place of $\\infty$, integrate as usual, then let $t$ grow.' },
    {
      tex: stacked(
        `\\int_{${a}}^{t} \\frac{${k}}{${letterTo(n)}} \\, dx`,
        `= \\left[-\\frac{${c}}{${letterTo(n - 1)}}\\right]_{${a}}^{t}`,
        `= ${W} - \\frac{${c}}{${letterTo(n - 1, 't')}}`,
      ),
    },
    { text: `As $t$ grows, $\\frac{${c}}{${letterTo(n - 1, 't')}}$ shrinks to $0$, so the integral converges.` },
    { tex: `${powerTailTex(params)} = ${W}` },
  ];
}

/** The integral of k/x^n from a to infinity, typed. */
const powerTail: Generator<PowerTailParams> = {
  id: 'int-imp-power-tail',
  sample: samplePowerTail,
  choices: (params) => {
    const { n, a, W } = params;
    const k = powerTailK(params);
    // Subtracted the wrong way; not divided by n - 1; the integrand's own value at a; the power taken the wrong way.
    return valueChoices(
      reduce(W, 1),
      [reduce(-W, 1), reduce(k, a ** (n - 1)), reduce(k, a ** n), reduce(k, (n + 1) * a ** (n + 1))],
      mix(n, a, W),
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
    lead: `${powerTailTex(params)} =`,
    keypad: [],
    answer: `${params.W}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: powerTailSolution,
};

/** The same integral worked one move at a time: integrate, put in the limits, let t grow. */
const workSteps: Generator<PowerTailParams> = {
  id: 'int-imp-work-steps',
  sample: samplePowerTail,
  render: (params): Slide => {
    const { n, a, W } = params;
    const k = powerTailK(params);
    const c = k / (n - 1);
    const bracket = (top: string, power: number, sign = '-') => `\\left[${sign}\\frac{${top}}{${letterTo(power)}}\\right]_{${a}}^{t}`;
    const atT = `\\frac{${c}}{${letterTo(n - 1, 't')}}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: 'Integrate, put in the limits, then let $t$ grow. Tap the part you would do **next**, then choose what it comes to.',
        },
      ],
      start: [limTok('\\infty'), `\\int_{${a}}^{t} \\frac{${k}}{${letterTo(n)}} \\, dx`],
      reductions: [
        {
          span: [1, 2],
          value: bracket(`${c}`, n - 1),
          // A sign lost; the power taken down instead of up; multiplied by n - 1 instead of divided.
          bank: tokenBank(
            [bracket(`${c}`, n - 1)],
            [
              bracket(`${c}`, n - 1, ''),
              bracket(`${k}`, n + 1),
              bracket(`${k * (n - 1)}`, n - 1),
              bracket(`${k}`, n - 1, ''),
              // A logarithm, as if every power of x went that way.
              `\\left[${inFront(`${k}`)}\\ln x\\right]_{${a}}^{t}`,
            ],
          ),
        },
        {
          span: [1, 2],
          value: `${W} - ${atT}`,
          // Lower minus upper, and the sign of each term.
          bank: tokenBank([`${W} - ${atT}`], [`${atT} - ${W}`, `-${atT} - ${W}`, `${W} + ${atT}`]),
        },
        {
          span: [0, 2],
          value: `${W}`,
          bank: tokenBank([`${W}`], ['\\infty', '0', `${-W}`]),
        },
      ],
    };
  },
  solution: powerTailSolution,
};

type ExpForm = 'rate' | 'scale' | 'left';

export interface ExpTailParams {
  form: ExpForm;
  /** The rate c in e^(-cx), or the scale m in e^(-x/m). */
  rate: number;
  k: number;
}

const expTailValue = ({ form, rate, k }: ExpTailParams): number => (form === 'scale' ? k * rate : k / rate);

function expTailParts({ form, rate, k }: ExpTailParams) {
  if (form === 'scale') return { integrand: `${k === 1 ? '' : k}e^{-x/${rate}}`, lower: 0, upper: Infinity };
  if (form === 'left') return { integrand: expTex(k, -rate), lower: -Infinity, upper: 0 };
  return { integrand: expTex(k, rate), lower: 0, upper: Infinity };
}

const expTailTex = (params: ExpTailParams): string => {
  const { integrand, lower, upper } = expTailParts(params);
  return improperTex(integrand, lower, upper);
};

export function expTailSpec(params: ExpTailParams): ImproperSpec {
  const { form, rate, k } = params;
  const { lower, upper } = expTailParts(params);
  const exponent = form === 'scale' ? `-x / ${rate}` : form === 'left' ? `${rate} * x` : `-${rate} * x`;
  return { f: `(${k}) * exp(${exponent})`, lower, upper };
}

/** An exponential from 0 to infinity, or from minus infinity to 0, typed. */
const expTail: Generator<ExpTailParams> = {
  id: 'int-imp-exp-tail',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick<ExpForm>(hard ? ['rate', 'scale', 'left'] : ['rate', 'scale']);
    if (form === 'scale') return { form, rate: rng.int(2, hard ? 6 : 4), k: rng.int(1, 9) };
    const rate = rng.int(1, hard ? 6 : 4);
    return { form, rate, k: rate * rng.int(1, hard ? 10 : 8) };
  },
  choices: (params) => {
    const { form, rate, k } = params;
    const V = expTailValue(params);
    // Divided where it should multiply (or the reverse), the coefficient alone, and the wrong sign.
    const slips = form === 'scale' ? [reduce(k, rate), reduce(k, 1), reduce(-V, 1)] : [reduce(k * rate, 1), reduce(k, 1), reduce(-V, 1)];
    return valueChoices(reduce(V, 1), slips, mix(rate, k, form.length));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
    lead: `${expTailTex(params)} =`,
    keypad: [],
    answer: `${expTailValue(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, rate, k } = params;
    const V = expTailValue(params);
    if (form === 'left') {
      return [
        { text: `Put $t$ in place of $-\\infty$ and integrate: $\\int ${expTex(k, -rate)} \\, dx = ${leadingTex(reduce(k, rate))}${expTex(1, -rate)}$.` },
        { tex: stacked(`\\left[${leadingTex(reduce(k, rate))}${expTex(1, -rate)}\\right]_{t}^{0}`, `= ${V} - ${leadingTex(reduce(k, rate))}${expTex(1, -rate).replace('x', 't')}`) },
        { text: 'As $t \\to -\\infty$ the exponential shrinks to $0$, leaving the value at $x = 0$, where $e^{0} = 1$.' },
        { tex: `${expTailTex(params)} = ${V}` },
      ];
    }
    const antiderivative = form === 'scale' ? `-${V}e^{-x/${rate}}` : `-${leadingTex(reduce(k, rate))}${expTex(1, rate)}`;
    return [
      { text: 'Put $t$ in place of $\\infty$ and integrate, dividing by the number in front of $x$ in the power.' },
      { tex: stacked(`\\left[${antiderivative}\\right]_{0}^{t}`, `= ${V} ${antiderivative.replace(/x/, 't')}`) },
      { text: 'As $t$ grows the exponential shrinks to $0$, leaving the value at $x = 0$, where $e^{0} = 1$.' },
      { tex: `${expTailTex(params)} = ${V}` },
    ];
  },
};

export interface TailSliderParams {
  form: 'power' | 'exp';
  /** The limit the area levels off at. */
  L: number;
  /** The lower limit for k/x^2, or the rate for an exponential from 0. */
  a: number;
  /** The top of the slider's track. */
  top: number;
}

function tailSliderParts({ form, L, a }: TailSliderParams) {
  if (form === 'power') {
    return { integrand: `\\frac{${L * a}}{x^{2}}`, lower: a, area: (t: number) => (t < a ? NaN : L - (L * a) / t), span: 12 * a };
  }
  return { integrand: expTex(L * a, a), lower: 0, area: (t: number) => (t < 0 ? NaN : L * (1 - Math.exp(-a * t))), span: 6 / a };
}

export function tailSliderSpec(params: TailSliderParams): ImproperSpec {
  const { form, L, a } = params;
  return form === 'power'
    ? { f: `(${L * a}) / x^2`, lower: a, upper: Infinity }
    : { f: `(${L * a}) * exp(-${a} * x)`, lower: 0, upper: Infinity };
}

/**
 * The area from the lower limit to t, drawn against t: it rises and levels
 * off, and the level it approaches is the improper integral.
 */
const tailSlider: Generator<TailSliderParams> = {
  id: 'int-imp-tail-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const L = rng.int(2, difficulty > 1 ? 9 : 7);
        return { form: rng.pick<'power' | 'exp'>(['power', 'exp']), L, a: rng.int(1, 3), top: L + rng.int(2, 4) };
      },
      ({ L, top }) => L !== restingOn(0, top),
      { form: 'power', L: 4, a: 2, top: 7 },
    ),
  render: (params): Slide => {
    const { L, top } = params;
    const { integrand, lower, area, span } = tailSliderParts(params);
    const window = markerWindow(0, top, 'y');
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The graph shows the area under $y = ${integrand}$ from $x = ${lower}$ to $x = t$, against $t$. It levels off at $${improperTex(integrand, lower, Infinity)}$. Work that out and slide the line to it.`,
        },
      ],
      min: 0,
      max: top,
      step: 1,
      answer: L,
      readout: '\\text{area} = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: lower + span,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [{ f: area, accent: true, breaks: true }],
          label: 'The area so far, rising and levelling off as t grows',
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { form, L, a } = params;
    const { integrand, lower } = tailSliderParts(params);
    return [
      {
        tex: stacked(
          `\\int_{${lower}}^{t} ${integrand} \\, dx`,
          form === 'power' ? `= ${L} - \\frac{${L * a}}{t}` : `= ${L} - ${L}e^{-${a === 1 ? '' : a}t}`,
        ),
      },
      { text: 'As $t$ grows the second term shrinks to $0$, which is why the graph flattens out.' },
      { tex: `${improperTex(integrand, lower, Infinity)} = ${L}` },
    ];
  },
};

/* Converge or diverge. */

type VerdictKind = 'tail' | 'pole' | 'exp';

export interface VerdictParams {
  kind: VerdictKind;
  power: Power;
  k: number;
  /** For an exponential: its rate, and whether it grows rather than decays. */
  rate: number;
  grows: boolean;
}

/** p-integrals from 1 to infinity converge for p > 1; from 0 to 1, for p < 1. */
function pValue(where: 'tail' | 'pole', { m, q }: Power, k: number): Ratio | null {
  if (where === 'tail') return m > q ? reduce(k * q, m - q) : null;
  return m < q ? reduce(k * q, q - m) : null;
}

function verdictValue({ kind, power, k, rate, grows }: VerdictParams): Ratio | null {
  if (kind === 'exp') return grows ? null : reduce(k, rate);
  return pValue(kind, power, k);
}

function verdictParts(params: VerdictParams) {
  const { kind, power, k, rate, grows } = params;
  if (kind === 'exp') return { integrand: expTex(k, grows ? -rate : rate), lower: 0, upper: Infinity };
  const integrand = `\\frac{${k}}{${powerOfTex(power)}}`;
  return kind === 'tail' ? { integrand, lower: 1, upper: Infinity } : { integrand, lower: 0, upper: 1 };
}

export function verdictSpec(params: VerdictParams): ImproperSpec {
  const { kind, power, k, rate, grows } = params;
  const { lower, upper } = verdictParts(params);
  if (kind === 'exp') return { f: `(${k}) * exp(${grows ? '' : '-'}${rate} * x)`, lower, upper };
  return { f: `(${k}) / ${powerAnswer(power)}`, lower, upper };
}

const TAIL_POWERS = [pw(1, 2), pw(2, 3), pw(1), pw(4, 3), pw(3, 2), pw(2), pw(3)];
const POLE_POWERS = [pw(1, 3), pw(1, 2), pw(2, 3), pw(1), pw(3, 2), pw(2)];

/** Converges to what, or diverges: p-integrals both ways round, and exponentials. */
const verdict: Generator<VerdictParams> = {
  id: 'int-imp-verdict',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const kind = rng.pick<VerdictKind>(difficulty > 1 ? ['tail', 'pole', 'exp'] : ['tail', 'tail', 'exp']);
        const rate = rng.int(1, 3);
        const grows = rng.chance(0.3);
        return {
          kind,
          power: rng.pick(kind === 'pole' ? POLE_POWERS : TAIL_POWERS),
          k: kind === 'exp' && !grows ? rate * rng.int(1, 6) : rng.int(1, 9),
          rate,
          grows: kind === 'exp' && grows,
        };
      },
      (params) => {
        const value = verdictValue(params);
        return value === null || value.d === 1;
      },
      { kind: 'tail', power: pw(2), k: 3, rate: 1, grows: false },
    ),
  render: (params): Slide => {
    const { kind, power, k, rate, grows } = params;
    const { integrand, lower, upper } = verdictParts(params);
    const value = verdictValue(params);
    // For a divergent p-integral, what the formula gives when it is used anyway.
    const naive =
      kind === 'exp'
        ? reduce(-k, rate)
        : power.m === power.q
          ? reduce(k, 1)
          : reduce(k * power.q, kind === 'tail' ? power.m - power.q : power.q - power.m);
    const slips = value === null ? [naive, reduce(-naive.n, naive.d), reduce(0, 1), reduce(k, 1)] : [reduce(k, 1), reduce(-value.n, value.d), times(value, 2)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Does this integral converge? If it does, to what?' },
        { kind: 'display', tex: improperTex(integrand, lower, upper) },
      ],
      ...verdictOptions(value, slips, mix(k, power.m, power.q, rate, kind.length, grows ? 1 : 0)),
    };
  },
  solution: (params) => {
    const { kind, power, k, rate, grows } = params;
    const value = verdictValue(params);
    if (kind === 'exp') {
      return grows
        ? [
            { text: `$${expTex(1, -rate)}$ grows without limit as $x$ grows, and so does its integral from $0$ to $t$.` },
            { text: 'So the integral diverges. For an exponential to converge on an infinite interval, it has to decay.' },
          ]
        : [
            { text: `$\\int_{0}^{t} ${expTex(k, rate)} \\, dx = ${inFront(ratioTex(reduce(k, rate)))}\\left(1 - ${expTex(1, rate).replace('x', 't')}\\right)$.` },
            { text: 'As $t$ grows the exponential shrinks to $0$.' },
            { tex: `\\text{Converges to } ${ratioTex(value ?? reduce(0, 1))}` },
          ];
    }
    const p = powerValueTex(power);
    const after = reduce(power.q - power.m, power.q);
    const rule =
      kind === 'tail'
        ? `From $1$ to $\\infty$, $\\frac{1}{x^{p}}$ converges only when $p > 1$. Here $p = ${p}$.`
        : `From $0$ to $1$, $\\frac{1}{x^{p}}$ converges only when $p < 1$. Here $p = ${p}$.`;
    if (value === null) {
      return [
        { text: rule },
        {
          text:
            power.m === power.q
              ? `The integral is $${inFront(`${k}`)}\\ln x$, and $\\ln x$ has no limit ${kind === 'tail' ? 'as $x$ grows' : 'as $x \\to 0$'}.`
              : `The antiderivative has $x^{${ratioTex(after)}}$ in it, which grows without limit ${kind === 'tail' ? 'as $x$ grows' : 'as $x \\to 0$'}.`,
        },
        { text: 'So the integral diverges.' },
      ];
    }
    return [
      { text: rule },
      { text: `The antiderivative is $${inFront(ratioTex(reduce(k * power.q, power.q - power.m)))}x^{${ratioTex(after)}}$. ${kind === 'tail' ? 'Its value as $x$ grows is $0$, and at $x = 1$ it is the number in front.' : 'At $x = 1$ it is the number in front, and as $x \\to 0$ it goes to $0$.'}` },
      { tex: `\\text{Converges to } ${ratioTex(value)}` },
    ];
  },
};

export interface PFlowParams {
  where: 'tail' | 'pole';
  power: Power;
  k: number;
}

export function pFlowSpec({ where, power, k }: PFlowParams): ImproperSpec {
  return { f: `(${k}) / ${powerAnswer(power)}`, lower: where === 'tail' ? 1 : 0, upper: where === 'tail' ? Infinity : 1 };
}

const P_TAIL_YES = 'It converges: after integrating, the power of $x$ is negative, so the term at $t$ dies away as $t$ grows.';
const P_TAIL_NO = 'It diverges: the antiderivative grows without limit as $t$ grows.';
const P_POLE_YES = 'It converges: after integrating, the power of $x$ is positive, so the term at $t$ vanishes as $t \\to 0$.';
const P_POLE_NO = 'It diverges: the antiderivative grows without limit as $t \\to 0$.';

/** The p-rule as a route: which end is the problem, then which side of 1 the power is. */
const pFlow: Generator<PFlowParams> = {
  id: 'int-imp-p-flow',
  sample: (rng, difficulty) => ({
    where: difficulty > 1 && rng.chance(0.5) ? 'pole' : 'tail',
    power: rng.pick([pw(1, 3), pw(1, 2), pw(2, 3), pw(1), pw(4, 3), pw(3, 2), pw(2), pw(3)]),
    k: rng.int(1, 9),
  }),
  render: ({ where, power, k }): Slide => {
    const tail = where === 'tail';
    const yes = tail ? power.m > power.q : power.m < power.q;
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Does this integral converge? Each answer chooses what gets asked next.' }],
      subject: improperTex(`\\frac{${k}}{${powerOfTex(power)}}`, tail ? 1 : 0, tail ? Infinity : 1),
      steps: [
        {
          id: 'where',
          ask: 'Where is the trouble with this integral?',
          branches: [
            { label: 'An infinite limit', to: 'tail' },
            { label: 'It blows up at x = 0', to: 'pole' },
          ],
        },
        {
          id: 'tail',
          ask: 'Is the power of x on the bottom bigger than 1?',
          branches: [
            { label: 'Yes', outcome: P_TAIL_YES },
            { label: 'No', outcome: P_TAIL_NO },
          ],
        },
        {
          id: 'pole',
          ask: 'Is the power of x on the bottom smaller than 1?',
          branches: [
            { label: 'Yes', outcome: P_POLE_YES },
            { label: 'No', outcome: P_POLE_NO },
          ],
        },
      ],
      answer: [tail ? 'An infinite limit' : 'It blows up at x = 0', yes ? 'Yes' : 'No'],
    };
  },
  solution: ({ where, power, k }) => {
    const tail = where === 'tail';
    const p = powerValueTex(power);
    const value = pValue(where, power, k);
    return [
      {
        text: tail
          ? 'The upper limit is infinite, and the integrand is bounded from $1$ on.'
          : 'Both limits are finite, but the integrand blows up at $x = 0$, the lower limit.',
      },
      { text: `$${powerOfTex(power)}$ is $x^{p}$ with $p = ${p}$.` },
      {
        text: tail
          ? `On an infinite interval, $\\frac{1}{x^{p}}$ converges only for $p > 1$, where the power after integrating, $1 - p$, is negative.`
          : `At $0$, $\\frac{1}{x^{p}}$ converges only for $p < 1$, where the power after integrating, $1 - p$, is positive.`,
      },
      { text: value === null ? 'So this one diverges.' : `So this one converges, to $${ratioTex(value)}$.` },
    ];
  },
};

export interface RootTailParams {
  m: number;
  q: number;
  /** The lower limit is r^q, so its root is whole. */
  r: number;
  W: number;
}

const ROOT_TAILS: [number, number, number][] = [
  [3, 2, 1],
  [3, 2, 2],
  [3, 2, 3],
  [4, 3, 1],
  [5, 2, 1],
  [4, 3, 2],
  [5, 3, 1],
  [5, 2, 2],
];

/** The coefficient that makes the integral from r^q to infinity of k/x^(m/q) come to W. */
const rootTailK = ({ m, q, r, W }: RootTailParams): number => (W * (m - q) * r ** (m - q)) / q;

const rootTailTex = (params: RootTailParams): string =>
  improperTex(`\\frac{${rootTailK(params)}}{${powerOfTex(pw(params.m, params.q))}}`, params.r ** params.q, Infinity);

export function rootTailSpec(params: RootTailParams): ImproperSpec {
  return { f: `(${rootTailK(params)}) / ${powerAnswer(pw(params.m, params.q))}`, lower: params.r ** params.q, upper: Infinity };
}

/** A fractional power over an infinite interval, typed. */
const rootTail: Generator<RootTailParams> = {
  id: 'int-imp-root-tail',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const [m, q, r] = rng.pick(difficulty > 1 ? ROOT_TAILS : ROOT_TAILS.slice(0, 5));
        return { m, q, r, W: rng.int(1, 12) };
      },
      (params) => Number.isInteger(rootTailK(params)) && rootTailK(params) <= 150,
      { m: 3, q: 2, r: 2, W: 3 },
    ),
  choices: (params) => {
    const { m, q, r, W } = params;
    const k = rootTailK(params);
    // Not divided by p - 1; multiplied by it instead; the wrong sign.
    return valueChoices(reduce(W, 1), [reduce(k, r ** (m - q)), reduce(k * (m - q), q * r ** (m - q)), reduce(-W, 1)], mix(m, q, r, W));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
    lead: `${rootTailTex(params)} =`,
    keypad: [],
    answer: `${params.W}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { m, q, r, W } = params;
    const k = rootTailK(params);
    const a = r ** q;
    const K = reduce(k * q, m - q);
    const down = `-\\frac{${m - q}}{${q}}`;
    return [
      { text: `Write the integrand as a power: $${inFront(`${k}`)}x^{-\\frac{${m}}{${q}}}$. Adding one to the power gives $${down}$, which is negative, so the integral converges.` },
      { tex: stacked(`\\int ${inFront(`${k}`)}x^{-\\frac{${m}}{${q}}} \\, dx`, `= ${inFront(`-${ratioTex(K)}`)}x^{${down}}`) },
      {
        text: `As $x$ grows the term at $t$ dies away, leaving the value at $x = ${a}$, where $x^{${down}} = \\frac{1}{${r ** (m - q)}}$${r === 1 ? ' is just $1$' : ''}.`,
      },
      { tex: `0 + ${ratioTex(K)} \\times \\frac{1}{${r ** (m - q)}} = ${W}` },
    ];
  },
};

/* Unbounded integrands. */

type RootPoleForm = 'sqrt' | 'shift' | 'cbrt' | 'cbrt2';

export interface RootPoleParams {
  form: RootPoleForm;
  k: number;
  r: number;
  /** Where the square root's inside is zero, for the shifted form. */
  c: number;
}

function rootPoleParts({ form, k, r, c }: RootPoleParams) {
  if (form === 'sqrt') return { power: pw(1, 2), c: 0, upper: r * r, value: 2 * k * r, front: 2 * k, top: r };
  if (form === 'shift') return { power: pw(1, 2), c, upper: c + r * r, value: 2 * k * r, front: 2 * k, top: r };
  if (form === 'cbrt') return { power: pw(1, 3), c: 0, upper: r ** 3, value: (3 * k * r * r) / 2, front: (3 * k) / 2, top: r * r };
  return { power: pw(2, 3), c: 0, upper: r ** 3, value: 3 * k * r, front: 3 * k, top: r };
}

const rootPoleTex = (params: RootPoleParams): string => {
  const { power, c, upper } = rootPoleParts(params);
  return improperTex(whichIntegrandTex({ k: params.k, power, c }), c, upper);
};

export function rootPoleSpec(params: RootPoleParams): ImproperSpec {
  const { power, c, upper } = rootPoleParts(params);
  return { f: `(${params.k}) / ${powerAnswer(power, c)}`, lower: c, upper };
}

/** A root on the bottom, unbounded at the lower limit, typed. */
const rootPole: Generator<RootPoleParams> = {
  id: 'int-imp-root-pole',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const form = rng.pick<RootPoleForm>(difficulty > 1 ? ['sqrt', 'shift', 'cbrt', 'cbrt2'] : ['sqrt', 'cbrt2']);
        const square = form === 'sqrt' || form === 'shift';
        return { form, k: rng.int(1, 9), r: rng.int(square ? 2 : 1, square ? 5 : 3), c: form === 'shift' ? nonZero(rng.int(-3, 5), 2) : 0 };
      },
      (params) => Number.isInteger(rootPoleParts(params).value),
      { form: 'sqrt', k: 2, r: 3, c: 0 },
    ),
  choices: (params) => {
    const { k, r } = params;
    const { value, top } = rootPoleParts(params);
    // Not divided by 1 - p; the root forgotten; the wrong sign.
    return valueChoices(reduce(value, 1), [reduce(k * top, 1), reduce(value * r, 1), reduce(-value, 1)], mix(k, r, params.c, params.form.length));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
    lead: `${rootPoleTex(params)} =`,
    keypad: [],
    answer: `${rootPoleParts(params).value}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { power, c, upper, value, front } = rootPoleParts(params);
    const after = reduce(power.q - power.m, power.q);
    const inner = shiftTex(c);
    const F = `${ratioTex(reduce(front * 2, 2))}${powerOfTex(pw(after.n, after.d), inner)}`;
    const atT = `${ratioTex(reduce(front * 2, 2))}${powerOfTex(pw(after.n, after.d), c === 0 ? 't' : linearTex(1, -c).replace('x', 't'))}`;
    return [
      { text: `The integrand is unbounded at $x = ${c}$, the lower limit. Put $t$ there and let $t \\to ${c}^{+}$.` },
      { text: `Adding one to the power $-${powerValueTex(power)}$ gives $${ratioTex(after)}$, so an antiderivative is $${F}$.` },
      { tex: stacked(`\\left[${F}\\right]_{t}^{${upper}}`, `= ${value} - ${atT}`) },
      { text: `As $t \\to ${c}$ the term at $t$ goes to $0$, so the integral converges to $${value}$.` },
    ];
  },
};

export interface PoleTreeParams {
  power: Power;
  k: number;
  r: number;
}

function poleTreeParts({ power, k, r }: PoleTreeParams) {
  const upper = r ** power.q;
  const front = (k * power.q) / (power.q - power.m);
  const root = r ** (power.q - power.m);
  return { upper, front, root, total: front * root };
}

export function poleTreeSpec(params: PoleTreeParams): ImproperSpec {
  return { f: `(${params.k}) / ${powerAnswer(params.power)}`, lower: 0, upper: poleTreeParts(params).upper };
}

/** The same kind of integral as a tree: the number in front, the root at the top, the limit at 0. */
const poleTree: Generator<PoleTreeParams> = {
  id: 'int-imp-pole-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const power = rng.pick(difficulty > 1 ? [pw(1, 2), pw(1, 3), pw(2, 3)] : [pw(1, 2), pw(1, 2), pw(2, 3)]);
        return { power, k: rng.int(1, 9), r: rng.int(2, power.q === 2 ? 6 : 3) };
      },
      (params) => Number.isInteger(poleTreeParts(params).front),
      { power: pw(1, 2), k: 3, r: 2 },
    ),
  render: (params): Slide => {
    const { power, k } = params;
    const { upper, front, root, total } = poleTreeParts(params);
    const after = powerValueTex(pw(power.q - power.m, power.q));
    const answer = [front, root, 0, total, total];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Top row: the number in front of $x^{${after}}$ after integrating, then $${upper}^{${after}}$, then the antiderivative at $t$ as $t \\to 0^{+}$. Below: its value at $${upper}$, then the integral.`,
        },
      ],
      expression: improperTex(`\\frac{${k}}{${powerOfTex(power)}}`, 0, upper),
      nodes: [
        { id: 'front', from: [] },
        { id: 'root', from: [] },
        { id: 'limit', from: [] },
        { id: 'top', from: ['front', 'root'] },
        { id: 'total', from: ['top', 'limit'] },
      ],
      // Not divided by 1 - p, the limit used without its root, and the wrong sign.
      bank: wholeBank(answer, [k, upper, -total, front * upper, front + root]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { power, k } = params;
    const { upper, front, root, total } = poleTreeParts(params);
    const after = powerValueTex(pw(power.q - power.m, power.q));
    return [
      { text: `Adding one to the power $-${powerValueTex(power)}$ gives $${after}$; dividing by it puts $${front}$ in front: $\\int ${inFront(`${k}`)}x^{-${powerValueTex(power)}} \\, dx = ${front}x^{${after}}$.` },
      { text: `At $x = ${upper}$, $${upper}^{${after}} = ${root}$, so the antiderivative there is $${front} \\times ${root} = ${total}$.` },
      { text: `At $x = t$ it is $${front}t^{${after}}$, which goes to $0$ as $t \\to 0$, because the power is positive.` },
      { tex: `${total} - 0 = ${total}` },
    ];
  },
};

/* Splitting. */

type SplitKind = 'line' | 'pole';

interface SplitTilesParams {
  kind: SplitKind;
  k: number;
  /** The kink or the pole. */
  c: number;
  left: number;
  right: number;
  rate: number;
}

function splitTilesParts({ kind, k, c, left, right, rate }: SplitTilesParams) {
  if (kind === 'line') {
    const integrand = `${k === 1 ? '' : k}e^{-${rate === 1 ? '' : rate}|${shiftTex(c)}|}`;
    return {
      integrand,
      lower: -Infinity,
      upper: Infinity,
      answer: [intTok('-\\infty', c), intTok(c, '\\infty')],
      wrong: [intTok(c, '-\\infty'), intTok('\\infty', c), intTok('-\\infty', '\\infty'), c === 0 ? intTok('-\\infty', 1) : intTok(0, '\\infty')],
    };
  }
  const lower = c - left;
  const upper = c + right;
  return {
    integrand: `\\frac{${k}}{${powerOfTex(pw(2, 3), shiftTex(c))}}`,
    lower,
    upper,
    answer: [intTok(lower, c), intTok(c, upper)],
    wrong: [intTok(lower, upper), intTok(c, lower), intTok(upper, c), c === 0 ? intTok(lower, 1) : intTok(lower, 0)],
  };
}

/** Where to split, and the two halves, as tiles. */
const splitTiles: Generator<SplitTilesParams> = {
  id: 'int-imp-split-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<SplitKind>(['line', 'pole']);
    return {
      kind,
      k: rng.int(1, 9),
      c: hard ? rng.int(-3, 3) : kind === 'line' ? 0 : rng.int(-2, 2),
      left: rng.int(1, 4),
      right: rng.int(1, 4),
      rate: rng.int(1, 3),
    };
  },
  render: (params): Slide => {
    const { integrand, lower, upper, answer, wrong } = splitTilesParts(params);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'display', tex: improperTex('f(x)', lower, upper) },
        {
          kind: 'prose',
          text: `Here $f(x) = ${integrand}$. Split it into two integrals of $f(x)$, each with just one troublesome end.`,
        },
      ],
      template: '{0} \\; + \\; {1}',
      bank: tokenBank(answer, wrong),
      answer,
    };
  },
  solution: (params) => {
    const { kind, c } = params;
    const { lower, upper, answer } = splitTilesParts(params);
    return [
      {
        text:
          kind === 'line'
            ? `Both limits are infinite, and one $t$ cannot go two ways at once. Split at a convenient point; $x = ${c}$ is where the $|\\,|$ changes, so each half has a plain exponential.`
            : `The integrand is unbounded at $x = ${c}$, inside the interval from $${lower}$ to $${upper}$. Split there, so the trouble sits at one end of each half.`,
      },
      { tex: stacked(improperTex('f(x)', lower, upper), `= ${answer[0]} f(x) \\, dx`, `\\quad + ${answer[1]} f(x) \\, dx`) },
      { text: 'Each half is then its own limit, and the whole converges only if both halves do.' },
    ];
  },
};

export interface TwoSidedParams {
  k: number;
  rate: number;
  h: number;
}

const twoSidedValue = ({ k, rate }: TwoSidedParams): number => (2 * k) / rate;

const twoSidedTex = ({ k, rate, h }: TwoSidedParams): string =>
  improperTex(`${k === 1 ? '' : k}e^{-${rate === 1 ? '' : rate}|${shiftTex(h)}|}`, -Infinity, Infinity);

export function twoSidedSpec({ k, rate, h }: TwoSidedParams): ImproperSpec {
  return { f: `(${k}) * exp(-${rate} * abs(x - (${h})))`, lower: -Infinity, upper: Infinity, splits: [h] };
}

/** k e^(-c|x - h|) over the whole line, typed: two equal halves. */
const twoSided: Generator<TwoSidedParams> = {
  id: 'int-imp-two-sided',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ k: rng.int(1, 12), rate: rng.int(1, 4), h: difficulty > 1 ? rng.int(-3, 3) : 0 }),
      (params) => Number.isInteger(twoSidedValue(params)),
      { k: 3, rate: 1, h: 0 },
    ),
  choices: (params) => {
    const V = twoSidedValue(params);
    // One half only, the halves cancelled, and the wrong sign.
    return valueChoices(reduce(V, 1), [reduce(V, 2), reduce(0, 1), reduce(-V, 1)], mix(params.k, params.rate, params.h));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Evaluate. The answer is a whole number.' }],
    lead: `${twoSidedTex(params)} =`,
    keypad: [],
    answer: `${twoSidedValue(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { k, rate, h } = params;
    const half = reduce(k, rate);
    return [
      { text: `Split at $x = ${h}$, where the $|\\,|$ changes. To the right the integrand is $${k === 1 ? '' : k}e^{-${rate === 1 ? '' : rate}(${shiftTex(h)})}$, and to the left it is the mirror image.` },
      { tex: stacked(`\\int_{${h}}^{\\infty} ${k === 1 ? '' : k}e^{-${rate === 1 ? '' : rate}(${shiftTex(h)})} \\, dx`, `= ${ratioTex(half)}`) },
      { text: `The left half is the same by symmetry, and both converge, so the whole integral is twice one half.` },
      { tex: `2 \\times ${ratioTex(half)} = ${twoSidedValue(params)}` },
    ];
  },
};

type HalvesForm = 'cbrt2' | 'abs' | 'cbrt';

export interface HalvesParams {
  form: HalvesForm;
  k: number;
  a: number;
  b: number;
}

function halvesParts({ form, k, a, b }: HalvesParams) {
  if (form === 'abs') {
    const K = 2 * k;
    return { integrand: `\\frac{${k}}{\\sqrt{|x|}}`, lower: -a * a, upper: b * b, low: -K * a, high: K * b, left: K * a, right: K * b, K };
  }
  if (form === 'cbrt') {
    const K = (3 * k) / 2;
    return { integrand: `\\frac{${k}}{\\sqrt[3]{x}}`, lower: -(a ** 3), upper: b ** 3, low: K * a * a, high: K * b * b, left: -K * a * a, right: K * b * b, K };
  }
  const K = 3 * k;
  return { integrand: `\\frac{${k}}{\\sqrt[3]{x^{2}}}`, lower: -(a ** 3), upper: b ** 3, low: -K * a, high: K * b, left: K * a, right: K * b, K };
}

function halvesAntiderivative({ form }: HalvesParams, K: number): string {
  if (form === 'abs') return `$F(x) = ${K}\\sqrt{x}$ for $x > 0$ and $-${K}\\sqrt{-x}$ for $x < 0$`;
  if (form === 'cbrt') return `$F(x) = ${K}\\sqrt[3]{x^{2}}$`;
  return `$F(x) = ${K}\\sqrt[3]{x}$`;
}

export function halvesSpec(params: HalvesParams): ImproperSpec {
  const { form, k } = params;
  const { lower, upper } = halvesParts(params);
  const f = form === 'abs' ? `(${k}) / sqrt(abs(x))` : form === 'cbrt' ? `(${k}) / cbrt(x)` : `(${k}) / cbrt(x)^2`;
  return { f, lower, upper, splits: [0] };
}

/** An integrand unbounded at 0, inside the interval, as a tree of its two halves. */
const halvesTree: Generator<HalvesParams> = {
  id: 'int-imp-halves-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const form = rng.pick<HalvesForm>(difficulty > 1 ? ['cbrt2', 'abs', 'cbrt'] : ['cbrt2', 'abs']);
        const reach = form === 'abs' ? 4 : difficulty > 1 ? 3 : 2;
        return { form, k: rng.int(1, 9), a: rng.int(1, reach), b: rng.int(1, reach) };
      },
      (params) => Number.isInteger(halvesParts(params).K),
      { form: 'cbrt2', k: 2, a: 1, b: 2 },
    ),
  render: (params): Slide => {
    const { integrand, lower, upper, low, high, left, right, K } = halvesParts(params);
    const answer = [low, high, left, right, left + right];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Split at $0$, where the integrand is unbounded. Here ${halvesAntiderivative(params, K)}, and $F(0) = 0$. Top row: $F$ at each limit. Then each half, then the integral.`,
        },
      ],
      expression: improperTex(integrand, lower, upper),
      nodes: [
        { id: 'low', from: [] },
        { id: 'high', from: [] },
        { id: 'left', from: ['low'] },
        { id: 'right', from: ['high'] },
        { id: 'total', from: ['left', 'right'] },
      ],
      // Each half's sign flipped, and one half taken from the other.
      bank: wholeBank(answer, [-left, -right, right - left, left - right]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { lower, upper, low, high, left, right } = halvesParts(params);
    return [
      { text: `Left half, from $${lower}$ up to $0$: $F(0) - F(${lower}) = 0 - (${low}) = ${left}$.` },
      { text: `Right half, from $0$ up to $${upper}$: $F(${upper}) - F(0) = ${high} - 0 = ${right}$.` },
      { text: 'Both halves converge, since $F$ has a limit at $0$, so the integral is their sum.' },
      { tex: `${left} + ${right < 0 ? `(${right})` : right} = ${left + right}` },
    ];
  },
};

type TrapForm = 'square' | 'cube' | 'cbrt2' | 'abs';

export interface TrapParams {
  form: TrapForm;
  k: number;
  a: number;
  b: number;
}

function trapParts({ form, k, a, b }: TrapParams) {
  if (form === 'square') return { integrand: `\\frac{${k}}{x^{2}}`, lower: -a, upper: b, value: null, naive: reduce(-k * (a + b), a * b) };
  if (form === 'cube') return { integrand: `\\frac{${k}}{x^{3}}`, lower: -a, upper: b, value: null, naive: reduce(k * (b * b - a * a), 2 * a * a * b * b) };
  if (form === 'abs') return { integrand: `\\frac{${k}}{\\sqrt{|x|}}`, lower: -a * a, upper: b * b, value: reduce(2 * k * (a + b), 1), naive: reduce(2 * k * (b - a), 1) };
  return { integrand: `\\frac{${k}}{\\sqrt[3]{x^{2}}}`, lower: -(a ** 3), upper: b ** 3, value: reduce(3 * k * (a + b), 1), naive: reduce(3 * k * (b - a), 1) };
}

export function trapSpec(params: TrapParams): ImproperSpec {
  const { form, k } = params;
  const { lower, upper } = trapParts(params);
  const f = form === 'square' ? `(${k}) / x^2` : form === 'cube' ? `(${k}) / x^3` : form === 'abs' ? `(${k}) / sqrt(abs(x))` : `(${k}) / cbrt(x)^2`;
  return { f, lower, upper, splits: [0] };
}

/**
 * A pole inside the interval, where integrating straight across gives a
 * number whether or not the integral exists. Half the draws do converge, so
 * "diverges" is never the safe guess.
 */
const trap: Generator<TrapParams> = {
  id: 'int-imp-trap',
  sample: (rng, difficulty) => {
    const form = rng.pick<TrapForm>(difficulty > 1 ? ['square', 'cube', 'cbrt2', 'abs'] : ['square', 'cbrt2']);
    const reach = form === 'cube' || form === 'cbrt2' ? 3 : 4;
    return { form, k: rng.int(1, 6), a: rng.int(1, reach), b: rng.int(1, reach) };
  },
  render: (params): Slide => {
    const { k, a, b } = params;
    const { integrand, lower, upper, value, naive } = trapParts(params);
    const slips = value === null ? [naive, reduce(-naive.n, naive.d), reduce(0, 1), reduce(k, 1)] : [naive, reduce(-value.n, value.d), reduce(0, 1)];
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Does this integral converge? If it does, to what?' },
        { kind: 'display', tex: improperTex(integrand, lower, upper) },
      ],
      ...verdictOptions(value, slips, mix(k, a, b, params.form.length)),
    };
  },
  solution: (params) => {
    const { form } = params;
    const { lower, upper, value, naive } = trapParts(params);
    if (value === null) {
      return [
        { text: `The integrand is unbounded at $x = 0$, which is inside the interval, so split there.` },
        { text: `The right half, $\\int_{0}^{${upper}} ${form === 'square' ? '\\frac{1}{x^{2}}' : '\\frac{1}{x^{3}}'}$ times a number, has power $${form === 'square' ? 2 : 3}$ at $0$, which is not less than $1$, so it diverges.` },
        { text: 'One divergent half is enough: the whole integral diverges.' },
        { text: `Integrating straight across $0$ gives $${ratioTex(naive)}$, a number with no meaning, because the formula jumps over the point where the integrand is infinite.` },
      ];
    }
    return [
      { text: `The integrand is unbounded at $x = 0$, inside the interval, so split there. Its power at $0$ is less than $1$, so each half converges.` },
      { text: `Left half from $${lower}$ to $0$, right half from $0$ to $${upper}$. Both are positive, since the integrand is positive on both sides.` },
      { tex: `\\text{Converges to } ${ratioTex(value)}` },
    ];
  },
};

/** This level's generators by name, for `improper.test.ts`. */
export const improperGenerators = {
  whichFlow,
  problemPoint,
  spotImproper,
  limitTiles,
  powerTail,
  workSteps,
  expTail,
  tailSlider,
  verdict,
  pFlow,
  rootTail,
  rootPole,
  poleTree,
  splitTiles,
  twoSided,
  halvesTree,
  trap,
};

/* ---------- Level 8: integration as a limit of a sum ---------- */

/*
 * A definite integral is the limit of a sum of thin rectangles. The level
 * builds that up a strip at a time: the heights at the left or right edge of
 * each strip and their total, then the sum written in terms of n and its
 * limit, then reading an integral off a limit of a sum, then which sums over-
 * or under-estimate, and last the same area by the limit and by the
 * antiderivative.
 *
 * Every function is a polynomial with whole coefficients, every strip width is
 * whole and every x a sum reads is whole, so each rectangle sum is a whole
 * number without rounding. Limits are built from their answer or filtered with
 * `sixIntegral`.
 *
 * The typed limit, `int-lim-sum-value`, declares `integrand` and `limits`, so
 * the quadrature oracle in `generators.test.ts` checks it. The other values
 * are checked by `limitSum.test.ts`, which adds each rectangle sum up from the
 * function itself and finds each limit by quadrature.
 */

export type Side = 'left' | 'right';

const otherSide = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** The x at which each strip's height is read: its left edge or its right edge. */
function stripXs(a: number, h: number, n: number, side: Side): number[] {
  return Array.from({ length: n }, (_, k) => a + (side === 'left' ? k : k + 1) * h);
}

/** h times the sum of the heights: a left or right rectangle sum. */
function rectSum(f: Poly, a: number, h: number, n: number, side: Side): number {
  return h * stripXs(a, h, n, side).reduce((total, x) => total + polyAt(f, x), 0);
}

/** Every x from a to b in steps of h, both ends included. */
const gridXs = (a: number, h: number, n: number): number[] => Array.from({ length: n + 1 }, (_, k) => a + k * h);

/** The heights a sum adds, as the learner writes them: `2\left[f(0) + f(2) + f(4)\right]`. */
function heightsTex(xs: number[], h: number): string {
  const inside = xs.map((x) => `f(${x})`).join(' + ');
  return h === 1 ? inside : `${h}\\left[${inside}\\right]`;
}

/** The same with the middle heights elided, and likewise no 1 in front: `2\left[f(0) + \dots + f(8)\right]`. */
function elidedHeightsTex(xs: number[], h: number): string {
  const inside = `f(${xs[0]}) + \\dots + f(${xs[xs.length - 1]})`;
  return h === 1 ? inside : `${h}\\left[${inside}\\right]`;
}

/** A rectangle sum's name: `L_{4}` or `R_{4}`. */
const sumName = (side: Side, n: number): string => `${side === 'left' ? 'L' : 'R'}_{${n}}`;

/** A y window over [a, b] that keeps the axis and the whole curve in view. */
function stripWindow(f: (x: number) => number, a: number, b: number): { yMin: number; yMax: number } {
  const values = Array.from({ length: 41 }, (_, i) => f(a + ((b - a) * i) / 40));
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const pad = (hi - lo) * 0.1 || 1;
  return { yMin: lo - pad, yMax: hi + pad };
}

/**
 * A curve with the rectangles of a left or right sum drawn under it.
 *
 * Laid underneath `plotSvg` the way `betweenSvg` lays its band, through the
 * same frame (280 wide, inset 12 at each edge), so the y window is required.
 * Each rectangle is shaded and outlined, so neighbours of equal height still
 * read as separate strips.
 */
export function stripsSvg(opts: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  f: (x: number) => number;
  a: number;
  h: number;
  n: number;
  side: Side;
  label: string;
  height?: number;
}): string {
  const WIDTH = 280;
  const PAD = 12;
  const height = opts.height ?? 150;
  const px = (x: number) => PAD + ((x - opts.xMin) / (opts.xMax - opts.xMin)) * (WIDTH - PAD * 2);
  const py = (y: number) => PAD + ((opts.yMax - y) / (opts.yMax - opts.yMin)) * (height - PAD * 2);
  const rects = stripXs(opts.a, opts.h, opts.n, opts.side).map((x, k) => {
    const left = px(opts.a + k * opts.h);
    const right = px(opts.a + (k + 1) * opts.h);
    const y = opts.f(x);
    const top = py(Math.max(0, y));
    const bottom = py(Math.min(0, y));
    const box = `x="${left.toFixed(1)}" y="${top.toFixed(1)}" width="${(right - left).toFixed(1)}" height="${(bottom - top).toFixed(1)}"`;
    return `<rect class="plot-shade" ${box} /><rect ${box} fill="none" stroke="currentColor" stroke-width="1" opacity="0.6" />`;
  });
  const plot = plotSvg({
    xMin: opts.xMin,
    xMax: opts.xMax,
    yMin: opts.yMin,
    yMax: opts.yMax,
    height,
    curves: [{ f: opts.f, accent: true }],
    label: opts.label,
  });
  const open = plot.indexOf('>') + 1;
  return `${plot.slice(0, open)}${rects.join('')}${plot.slice(open)}`;
}

/** The strips of a sum over [a, a + nh], framed with a little room either side. */
function stripFigure({ f, a, h, n, side }: StripParams): string {
  const b = a + n * h;
  const at = (x: number) => polyAt(f, x);
  return stripsSvg({
    xMin: a - 0.3 * h,
    xMax: b + 0.3 * h,
    ...stripWindow(at, a - 0.3 * h, b + 0.3 * h),
    f: at,
    a,
    h,
    n,
    side,
    label: `The curve with the rectangles of the ${side} sum drawn under it`,
  });
}

/**
 * Four whole or half-unit options for a derived choice form, placed at the slot
 * `salt` picks. Anything that is not a whole number or a half is left out, so
 * no option is a recurring decimal.
 */
function halvesChoices(correct: number, slips: number[], salt: number): ChoiceOption[] {
  const ok = (v: number) => Number.isFinite(v) && Number.isInteger(2 * v);
  const picked: number[] = [];
  for (const value of slips) {
    if (picked.length === 3) break;
    if (!ok(value) || value === correct || picked.includes(value)) continue;
    picked.push(value + 0);
  }
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (picked.length < 3 && !picked.includes(candidate)) picked.push(candidate);
    }
  }
  const option = (v: number) => ({ tex: `${v}`, answer: `${v}` });
  return steered(options(option(correct), ...picked.map(option)), salt);
}

/* Area by strips. */

export interface StripParams {
  f: Poly;
  a: number;
  h: number;
  n: number;
  side: Side;
}

type StripCurve = 'line' | 'square' | 'quad';

/** A small polynomial: a line, a shifted x^2, or a quadratic. */
function drawStripCurve(rng: Rng, forms: StripCurve[]): Poly {
  const form = rng.pick(forms);
  if (form === 'line') return [rng.int(0, 8), nonZero(rng.int(-3, 3), 2)];
  if (form === 'square') return [rng.int(0, 12), 0, rng.pick([1, 1, -1])];
  return [rng.int(-2, 9), nonZero(rng.int(-4, 4), 1), 1];
}

/** Heights at every grid point, both ends included, all positive and not too tall. */
function heightsFit({ f, a, h, n }: StripParams, most: number): boolean {
  return gridXs(a, h, n).every((x) => polyAt(f, x) >= 1 && polyAt(f, x) <= most);
}

/** Whether f only rises, or only falls, from a to b. */
function trendOf(f: Poly, a: number, b: number): 'up' | 'down' | 'turns' {
  const lead = coefficientOf(f, 2);
  if (lead !== 0) {
    const vertex = -coefficientOf(f, 1) / (2 * lead);
    if (vertex > a && vertex < b) return 'turns';
  }
  const slope = coefficientOf(f, 1) + 2 * lead * ((a + b) / 2);
  return slope > 0 ? 'up' : 'down';
}

function sampleStrips(rng: Rng, difficulty: number, monotone: boolean): StripParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => ({
      f: drawStripCurve(rng, hard ? ['square', 'quad', 'quad'] : ['line', 'square']),
      a: rng.int(-2, 3),
      // A quadratic seldom stays one way over twelve units, so a monotone hard draw uses narrower strips.
      h: monotone && hard ? rng.int(1, 2) : rng.int(2, 3),
      n: hard ? 4 : 3,
      side: rng.pick<Side>(['left', 'right']),
    }),
    (params) =>
      heightsFit(params, hard ? 60 : 40) &&
      (!monotone || trendOf(params.f, params.a, params.a + params.n * params.h) !== 'turns'),
    { f: [1, 0, 1], a: 0, h: 2, n: hard ? 4 : 3, side: 'left' },
  );
}

/** The heights, their total and the sum, in words and working. */
function stripSolution({ f, a, h, n, side }: StripParams) {
  const xs = stripXs(a, h, n, side);
  const heights = xs.map((x) => polyAt(f, x));
  const total = heights.reduce((s, v) => s + v, 0);
  return [
    {
      text: `The strips run from $x = ${a}$ to $x = ${a + n * h}$ in steps of $${h}$. The ${side} sum reads each height at the ${side} edge of its strip: $x = ${xs.join(', ')}$.`,
    },
    { text: `With $f(x) = ${polyTex(f)}$ those heights are $${heights.join(', ')}$, which add to $${total}$.` },
    { tex: `${sumName(side, n)} = ${h} \\times ${total} = ${h * total}` },
  ];
}

/** A left or right sum built as a tree: each height, their total, then times the width. */
const stripTree: Generator<StripParams> = {
  id: 'int-lim-strip-tree',
  sample: (rng, difficulty) => sampleStrips(rng, difficulty, false),
  render: (params): Slide => {
    const { f, a, h, n, side } = params;
    const xs = stripXs(a, h, n, side);
    const heights = xs.map((x) => polyAt(f, x));
    const total = heights.reduce((s, v) => s + v, 0);
    const answer = [...heights, total, h * total];
    const otherTotal = rectSum(f, a, h, n, otherSide(side)) / h;
    // The height the other sum reads, the other sum, and the width added rather than multiplied.
    const extra = polyAt(f, side === 'left' ? a + n * h : a);
    const hard = n > 3;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Here $f(x) = ${polyTex(f)}$, cut from $x = ${a}$ to $x = ${a + n * h}$ into ${n} strips of width $${h}$. Top row: each strip's height at its ${side} edge. Then their total, then the ${side} sum.`,
        },
      ],
      expression: hard ? sumName(side, n) : heightsTex(xs, h),
      nodes: [
        ...xs.map((_, k) => ({ id: `h${k}`, from: [] as string[] })),
        { id: 'total', from: xs.map((_, k) => `h${k}`) },
        { id: 'sum', from: ['total'] },
      ],
      bank: wholeBank(answer, [extra, otherTotal, h * otherTotal, total + extra, total + h]),
      answer: answer.map(String),
    };
  },
  solution: stripSolution,
};

export interface RectSumParams {
  power: number;
  a: number;
  h: number;
  n: number;
  side: Side;
}

function rectSumExpr({ power, a, h, n, side }: RectSumParams): Expr {
  const terms = stripXs(a, h, n, side).map((x) => pow(num(x), num(power)));
  const inside = terms.slice(1).reduce((acc, term) => bin('+', acc, term), terms[0]);
  return bin('*', num(h), inside);
}

/**
 * Banks for a sum of powers times a width, at every node: a power taken as a
 * product or one too far, a total with a carry dropped or added, and a product
 * with the width added instead.
 */
function rectSumBanks(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'num') return out;
  const value = valueOf(expr);
  if (expr.kind === 'power') {
    const base = valueOf(expr.base);
    const index = valueOf(expr.exponent);
    out[path] = bank4(value, base * index, base ** (index + 1), base + index);
    rectSumBanks(expr.base, `${path}.b`, out);
    rectSumBanks(expr.exponent, `${path}.e`, out);
  } else if (expr.kind === 'binary') {
    const left = valueOf(expr.left);
    const right = valueOf(expr.right);
    out[path] = expr.op === '*' ? bank4(value, left + right, right, value + left) : bank4(value, value + 10, value - 10);
    rectSumBanks(expr.left, `${path}.l`, out);
    rectSumBanks(expr.right, `${path}.r`, out);
  }
  return out;
}

const rectPowerTex = (power: number): string => (power === 1 ? 'x' : `x^{${power}}`);

/** A left or right sum of x^2 or x^3 worked on a reduce line, or picked from four. */
const rectSumLine: Generator<RectSumParams> = {
  id: 'int-lim-rect-sum',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        power: difficulty > 1 ? rng.pick([2, 3]) : 2,
        a: rng.int(0, 4),
        h: rng.int(1, 3),
        n: rng.int(3, 4),
        side: rng.pick<Side>(['left', 'right']),
      }),
      ({ power, a, h, n }) => (a + n * h) ** power <= (power === 3 ? 350 : 150),
      { power: 2, a: 0, h: 2, n: 3, side: 'right' },
    ),
  choices: (params) => {
    const { power, a, h, n, side } = params;
    const f: Poly = power === 3 ? [0, 0, 0, 1] : [0, 0, 1];
    const total = rectSum(f, a, h, n, side);
    // The other edge, the width left off, and every grid point added.
    const all = h * gridXs(a, h, n).reduce((s, x) => s + x ** power, 0);
    return numberChoices(total, [rectSum(f, a, h, n, otherSide(side)), total / h, all], mix(power, a, h, n, side.length));
  },
  render: (params): Slide => {
    const { power, a, h, n, side } = params;
    const expr = rectSumExpr(params);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `The ${side} sum for $y = ${rectPowerTex(power)}$ from $x = ${a}$ to $x = ${a + n * h}$, with ${n} strips of width $${h}$. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      expr,
      banks: rectSumBanks(expr),
    };
  },
  solution: ({ power, a, h, n, side }) => {
    const xs = stripXs(a, h, n, side);
    const heights = xs.map((x) => x ** power);
    const total = heights.reduce((s, v) => s + v, 0);
    return [
      { text: `The ${side} edges are at $x = ${xs.join(', ')}$, so the heights are $${heights.join(', ')}$.` },
      { text: `They add to $${total}$. Each rectangle is $${h}$ wide, so multiply by $${h}$.` },
      { tex: `${sumName(side, n)} = ${h} \\times ${total} = ${h * total}` },
    ];
  },
};

/** Which written sum the drawn rectangles add up. */
const whichSum: Generator<StripParams> = {
  id: 'int-lim-which-sum',
  sample: (rng, difficulty) => sampleStrips(rng, difficulty, false),
  render: (params): Slide => {
    const { a, h, n, side } = params;
    const right = heightsTex(stripXs(a, h, n, side), h);
    const other = heightsTex(stripXs(a, h, n, otherSide(side)), h);
    const noWidth = stripXs(a, h, n, side)
      .map((x) => `f(${x})`)
      .join(' + ');
    // Stepping along in ones rather than in strip widths.
    const unitSteps = heightsTex(stripXs(a, 1, n, side), h);
    const opts = [right, other, noWidth, unitSteps].map((tex) => ({ tex }));
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `The rectangles cover $x = ${a}$ to $x = ${a + n * h}$ in ${n} strips of equal width, under $y = f(x)$. Which sum do they add up?`,
        },
        { kind: 'diagram', svg: stripFigure(params) },
      ],
      ...placedChoices(opts, mix(a, h, n, side.length, ...params.f)),
    };
  },
  solution: ({ a, h, n, side }) => {
    const xs = stripXs(a, h, n, side);
    return [
      { text: `${n} strips from $x = ${a}$ to $x = ${a + n * h}$ are each $${h}$ wide.` },
      {
        text: `Each rectangle meets the curve at its ${side} edge, so the heights are read at $x = ${xs.join(', ')}$. That is the ${side} sum.`,
      },
      { tex: elidedHeightsTex(xs, h) },
      { text: 'Each height is multiplied by the width, which is the same for every strip, so it comes outside the bracket.' },
    ];
  },
};

export interface EndsParams {
  a: number;
  h: number;
  n: number;
  side: Side;
  /** Whether the prompt states the width, or leaves it to be found. */
  given: boolean;
}

/** The first and last x a left or right sum reads, as tiles. */
const sumEnds: Generator<EndsParams> = {
  id: 'int-lim-sum-ends',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const hard = difficulty > 1;
        return {
          a: rng.int(-3, 4),
          h: rng.int(1, hard ? 4 : 3),
          n: rng.int(hard ? 4 : 3, hard ? 8 : 5),
          side: rng.pick<Side>(['left', 'right']),
          given: !hard,
        };
      },
      ({ a, h, n }) => a + n * h <= 16,
      { a: 0, h: 2, n: 4, side: 'left', given: difficulty <= 1 },
    ),
  render: ({ a, h, n, side, given }): Slide => {
    const b = a + n * h;
    const xs = stripXs(a, h, n, side);
    const answer = [xs[0], xs[n - 1]];
    const width = given ? `${n} strips of width $${h}$` : `${n} equal strips`;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Cut $x = ${a}$ to $x = ${b}$ into ${width}. The ${side} sum adds $f(x)$ at the ${side} edge of each strip, times the width. Which $x$ does it start and end on?`,
        },
      ],
      template: 'f({0}) + \\dots + f({1})',
      bank: wholeBank(answer, [a, a + h, b - h, b, a + 1, b - 1]),
      answer: answer.map(String),
    };
  },
  solution: ({ a, h, n, side }) => {
    const b = a + n * h;
    const xs = stripXs(a, h, n, side);
    return [
      { text: `Each strip is $\\frac{${b} - (${a})}{${n}} = ${h}$ wide, so the edges are $x = ${gridXs(a, h, n).join(', ')}$.` },
      {
        text:
          side === 'left'
            ? `The left sum uses every edge but the last, $x = ${b}$, since no strip starts there.`
            : `The right sum uses every edge but the first, $x = ${a}$, since no strip ends there.`,
      },
      { tex: elidedHeightsTex(xs, h) },
    ];
  },
};

/* The sum as n grows. */

type SigmaForm = 'k' | 'lin' | 'k2' | 'quad';

export interface SigmaParams {
  form: SigmaForm;
  n: number;
  a: number;
  b: number;
}

const sumK = (n: number): number => (n * (n + 1)) / 2;
const sumK2 = (n: number): number => (n * (n + 1) * (2 * n + 1)) / 6;

/** a k + b or a k^2 + b, as the learner reads it inside a sum. */
function sigmaTermTex({ form, a, b }: { form: SigmaForm; a: number; b: number }): string {
  const lead = `${a === 1 ? '' : a}k${form === 'k2' || form === 'quad' ? '^{2}' : ''}`;
  if (form === 'k' || form === 'k2') return lead;
  return `(${lead} ${b < 0 ? '-' : '+'} ${Math.abs(b)})`;
}

export function sigmaValue({ form, n, a, b }: SigmaParams): number {
  const squares = form === 'k2' || form === 'quad';
  const constant = form === 'lin' || form === 'quad' ? b : 0;
  return a * (squares ? sumK2(n) : sumK(n)) + constant * n;
}

const sigmaTex = (params: SigmaParams): string => `\\sum_{k=1}^{${params.n}} ${sigmaTermTex(params)}`;

/** A sum of k or k^2 terms to a given n, typed as a number. */
const sigma: Generator<SigmaParams> = {
  id: 'int-lim-sigma',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick<SigmaForm>(hard ? ['k2', 'quad', 'quad'] : ['k', 'lin', 'lin']);
    const squares = form === 'k2' || form === 'quad';
    return {
      form,
      n: squares ? rng.int(4, 12) : rng.int(5, 20),
      a: rng.int(form === 'k' || form === 'k2' ? 2 : 1, 6),
      b: nonZero(rng.int(-5, 9), 3),
    };
  },
  choices: (params) => {
    const { form, n, a, b } = params;
    const V = sigmaValue(params);
    const squares = form === 'k2' || form === 'quad';
    const constant = form === 'lin' || form === 'quad' ? b : 0;
    // One term short, the constant added once instead of n times, and the other formula.
    const short = sigmaValue({ ...params, n: n - 1 });
    const other = a * (squares ? sumK(n) : sumK2(n)) + constant * n;
    return numberChoices(V, [short, V - constant * n + constant, other], mix(n, a, b, form.length));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text:
          params.form === 'k' || params.form === 'lin'
            ? 'Evaluate, using $\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$. The answer is a whole number.'
            : 'Evaluate. The answer is a whole number.',
      },
    ],
    lead: `${sigmaTex(params)} =`,
    keypad: [],
    answer: `${sigmaValue(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { form, n, a, b } = params;
    const squares = form === 'k2' || form === 'quad';
    const base = squares ? sumK2(n) : sumK(n);
    const formula = squares ? `\\frac{${n}(${n + 1})(${2 * n + 1})}{6}` : `\\frac{${n}(${n + 1})}{2}`;
    const steps: { text?: string; tex?: string }[] = [
      { text: `Split the sum term by term. The $k${squares ? '^{2}' : ''}$ part uses the formula with $n = ${n}$:` },
      { tex: stacked(`\\sum_{k=1}^{${n}} k${squares ? '^{2}' : ''} = ${formula}`, `= ${base}`) },
      { text: `Each term carries a factor of $${a}$, so that part is $${a} \\times ${base} = ${a * base}$.` },
    ];
    if (form === 'lin' || form === 'quad') {
      steps.push({ text: `The constant $${b}$ is added once for each of the $${n}$ terms, giving $${b * n}$.` });
    }
    steps.push({ tex: `${sigmaTex(params)} = ${sigmaValue(params)}` });
    return steps;
  },
};

type InNForm = 'lin' | 'quad' | 'mixed';

export interface InNParams {
  form: InNForm;
  a: number;
  b: number;
}

/** The terms of a sum in n as the learner reads them: `(3k + 2)`, `(2k^{2} - k)`. */
function inNTermTex({ form, a, b }: InNParams): string {
  const lead = `${a === 1 ? '' : a}k${form === 'lin' ? '' : '^{2}'}`;
  if (b === 0) return lead;
  const tail = form === 'mixed' ? `${Math.abs(b) === 1 ? '' : Math.abs(b)}k` : `${Math.abs(b)}`;
  return `(${lead} ${b < 0 ? '-' : '+'} ${tail})`;
}

/** The sum as a formula in n, for the grader. */
export function inNAnswer({ form, a, b }: InNParams): string {
  if (form === 'lin') return `(${a}) * n * (n + 1) / 2 + (${b}) * n`;
  if (form === 'quad') return `(${a}) * n * (n + 1) * (2 * n + 1) / 6 + (${b}) * n`;
  return `(${a}) * n * (n + 1) * (2 * n + 1) / 6 + (${b}) * n * (n + 1) / 2`;
}

const N_KEYS: KeypadKey[] = [
  { insert: 'n', tex: true },
  { insert: '^' },
  { insert: '(' },
  { insert: ')' },
  { insert: '/' },
  { insert: '*', label: '×' },
];

/** A sum to n written as a formula in n, typed. */
const sumInN: Generator<InNParams> = {
  id: 'int-lim-sum-in-n',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { form: rng.pick<InNForm>(['quad', 'mixed']), a: rng.int(1, 6), b: nonZero(rng.int(-6, 6), 2) }
      : { form: 'lin', a: rng.int(1, 9), b: rng.int(-6, 9) },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [{ kind: 'prose', text: 'Write the sum as a formula in $n$, using the $n$ key.' }],
    lead: `\\sum_{k=1}^{n} ${inNTermTex(params)} =`,
    keypad: N_KEYS,
    answer: inNAnswer(params),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ form, a, b }) => {
    const first = form === 'lin' ? `\\frac{n(n+1)}{2}` : `\\frac{n(n+1)(2n+1)}{6}`;
    const lead = a === 1 ? '' : `${a} \\times `;
    const steps: { text?: string; tex?: string }[] = [
      { text: `Take the sum apart term by term. The $k${form === 'lin' ? '' : '^{2}'}$ part is ${lead ? `$${a}$ times ` : ''}the standard formula:` },
      { tex: `${lead}${first}` },
    ];
    if (b !== 0 && form === 'mixed') {
      steps.push({ text: `The $k$ part is $${b}$ times $\\frac{n(n+1)}{2}$.` });
    } else if (b !== 0) {
      steps.push({ text: `The constant $${b}$ appears once in each of the $n$ terms, so it adds $${b === 1 ? '' : b === -1 ? '-' : b}n$.` });
    }
    steps.push({ text: 'Any equivalent formula is fine: the answer is checked by value.' });
    return steps;
  },
};

export interface SumLimitParams {
  /** The power of x in c x^power, integrated from 0 to b. */
  power: number;
  c: number;
  b: number;
}

/** c b^(p + 1), the number in front once the widths and heights are multiplied out. */
const sumLimitA = ({ power, c, b }: SumLimitParams): number => c * b ** (power + 1);

/** The limit of the right sum, which is the integral: A / (p + 1). */
export const sumLimitValue = (params: SumLimitParams): Ratio => reduce(sumLimitA(params), params.power + 1);

const sumLimitIntegral = ({ power, c, b }: SumLimitParams): string => `\\int_{0}^{${b}} ${termTex(c, power)} \\, dx`;

/** The right sum simplified, with the formula for its sum of k or k^2 put in. */
function sumLimitForm(params: SumLimitParams, sign: '+' | '-' = '+'): string {
  const A = sumLimitA(params);
  if (params.power === 1) return `${leadingTex(reduce(A, 2))}\\left(1 ${sign} \\frac{1}{n}\\right)`;
  return `${leadingTex(reduce(A, 6))}\\left(1 ${sign} \\frac{1}{n}\\right)\\left(2 ${sign} \\frac{1}{n}\\right)`;
}

function sumLimitSolution(params: SumLimitParams) {
  const { power, c, b } = params;
  const A = sumLimitA(params);
  const kPower = power === 1 ? 'k' : 'k^{2}';
  return [
    {
      text: `Strips of width $\\frac{${b}}{n}$ have right edges at $x = \\frac{${b === 1 ? '' : b}k}{n}$, so the $k$th height is $${c === 1 ? '' : c}\\left(\\frac{${b === 1 ? '' : b}k}{n}\\right)^{${power}}$. Width times height, added up:`,
    },
    { tex: `\\frac{${A}}{n^{${power + 1}}} \\sum_{k=1}^{n} ${kPower}` },
    {
      text: `Put in $\\sum ${kPower} = ${power === 1 ? '\\frac{n(n+1)}{2}' : '\\frac{n(n+1)(2n+1)}{6}'}$ and divide each bracket by $n$:`,
    },
    { tex: sumLimitForm(params) },
    { text: 'As $n$ grows, $\\frac{1}{n} \\to 0$, which leaves the integral.' },
    { tex: `${sumLimitIntegral(params)} = ${ratioTex(sumLimitValue(params))}` },
  ];
}

function sampleSumLimit(rng: Rng, difficulty: number): SumLimitParams {
  const power = difficulty > 1 ? 2 : 1;
  return drawUntil(
    () => ({ power, c: rng.int(1, 9), b: rng.int(1, power === 1 ? 6 : 4) }),
    (params) => sumLimitA(params) <= 300 && (power === 2 || sumLimitA(params) % 2 === 0),
    { power, c: 2, b: 3 },
  );
}

/** The right sum for c x or c x^2 from 0, simplified a move at a time, then its limit. */
const sumLimitSteps: Generator<SumLimitParams> = {
  id: 'int-lim-sum-limit-steps',
  sample: sampleSumLimit,
  render: (params): Slide => {
    const { power, b } = params;
    const A = sumLimitA(params);
    const over = `\\frac{${A}}{n^{${power + 1}}}`;
    const withK = (formula: string) => `${over} \\cdot ${formula}`;
    const S1 = '\\frac{n(n+1)}{2}';
    const S2 = '\\frac{n(n+1)(2n+1)}{6}';
    const limit = sumLimitValue(params);
    const first =
      power === 1
        ? { value: withK(S1), wrong: [withK('\\frac{n(n-1)}{2}'), withK('n'), withK(S2)] }
        : { value: withK(S2), wrong: [withK(S1), withK('\\frac{n(n-1)(2n-1)}{6}'), withK('\\frac{n^{2}(n+1)^{2}}{4}')] };
    const second =
      power === 1
        ? {
            value: sumLimitForm(params),
            wrong: [
              `${leadingTex(reduce(A, 2))}\\left(1 + \\frac{1}{n^{2}}\\right)`,
              `${leadingTex(reduce(A, 1))}\\left(1 + \\frac{1}{n}\\right)`,
              `${leadingTex(reduce(A, 2))}(n + 1)`,
            ],
          }
        : {
            value: sumLimitForm(params),
            wrong: [
              `${leadingTex(reduce(A, 6))}(n + 1)(2n + 1)`,
              `${leadingTex(reduce(A, 3))}\\left(1 + \\frac{1}{n}\\right)\\left(2 + \\frac{1}{n}\\right)`,
              `${leadingTex(reduce(A, 6))}\\left(1 + \\frac{1}{n}\\right)\\left(1 + \\frac{2}{n}\\right)`,
            ],
          };
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `The right sum for $${sumLimitIntegral(params)}$ with $n$ strips of width $\\frac{${b}}{n}$ is below. Tap the part you would do **next**, then choose what it comes to.`,
        },
      ],
      start: ['\\lim_{n \\to \\infty}', `${over} \\sum_{k=1}^{n} ${power === 1 ? 'k' : 'k^{2}'}`],
      reductions: [
        { span: [1, 2], value: first.value, bank: tokenBank([first.value], first.wrong) },
        { span: [1, 2], value: second.value, bank: tokenBank([second.value], second.wrong) },
        {
          span: [0, 2],
          value: ratioTex(limit),
          // Not divided at all, the sum taken to grow for ever, and the bracket's 2 dropped.
          bank: tokenBank([ratioTex(limit)], [`${A}`, '\\infty', '0', ratioTex(reduce(A, power === 1 ? 4 : 6))]),
        },
      ],
    };
  },
  solution: sumLimitSolution,
};

export interface ApproachParams extends SumLimitParams {
  side: Side;
  /** The top of the slider's track. */
  top: number;
}

/** The sum with n strips, as a number, for the plotted points. */
export function approachAt({ power, side, ...rest }: ApproachParams, n: number): number {
  const A = sumLimitA({ power, ...rest });
  const s = side === 'right' ? 1 : -1;
  return power === 1 ? (A / 2) * (1 + s / n) : (A / 6) * (1 + s / n) * (2 + s / n);
}

/**
 * Left or right sums plotted against n, with the formula given: slide to the
 * value they close in on, which is the integral.
 */
const approachSlider: Generator<ApproachParams> = {
  id: 'int-lim-approach-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const power = difficulty > 1 ? rng.pick([1, 2, 2]) : 1;
        const c = rng.int(1, 9);
        const b = rng.int(1, power === 1 ? 4 : 3);
        const L = (c * b ** (power + 1)) / (power + 1);
        return { power, c, b, side: rng.pick<Side>(['left', 'right']), top: Math.ceil(L) + rng.int(2, 4) };
      },
      (params) => {
        const L = sumLimitA(params) / (params.power + 1);
        return Number.isInteger(L) && L >= 2 && L <= 18 && L !== restingOn(0, params.top);
      },
      { power: 1, c: 2, b: 3, side: 'right', top: 12 },
    ),
  render: (params): Slide => {
    const { side, top } = params;
    const L = sumLimitA(params) / (params.power + 1);
    const window = markerWindow(0, top, 'y');
    const name = side === 'left' ? 'L_{n}' : 'R_{n}';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The ${side} sums for $${sumLimitIntegral(params)}$ are $${name} = ${sumLimitForm(params, side === 'right' ? '+' : '-')}$, plotted for $n = 1$ to $10$. Slide the line to the value they close in on.`,
        },
      ],
      min: 0,
      max: top,
      step: 1,
      answer: L,
      readout: '\\text{limit} = {v}',
      figure: {
        svg: plotSvg({
          xMin: 0,
          xMax: 11,
          yMin: window.xMin,
          yMax: window.xMax,
          curves: [],
          marks: Array.from({ length: 10 }, (_, i) => ({ x: i + 1, y: approachAt(params, i + 1) })),
          label: `The ${side} sums plotted against the number of strips, closing in on a value`,
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { side } = params;
    const L = sumLimitA(params) / (params.power + 1);
    return [
      { text: 'As $n$ grows, each $\\frac{1}{n}$ shrinks to $0$, so every bracket settles to the number in it.' },
      { tex: `${sumLimitForm(params, side === 'right' ? '+' : '-')} \\to ${L}` },
      {
        text: `The ${side} sums close in ${side === 'right' ? 'from above' : 'from below'}, since the curve rises and the ${side} edge is each strip's ${side === 'right' ? 'highest' : 'lowest'} point.`,
      },
      { tex: `${sumLimitIntegral(params)} = ${L}` },
    ];
  },
};

/* Reading the integral from the sum. */

export interface ReadParams {
  a: number;
  w: number;
  p: number;
  c: number;
}

/** a + wk/n, the right edge of the kth strip, as the learner reads it. */
function edgeTex(a: number, w: number): string {
  const step = `\\frac{${w === 1 ? '' : w}k}{n}`;
  if (a === 0) return step;
  return `${a} + ${step}`;
}

/** lim sum (w/n) c(a + wk/n)^p, displayed. */
function readSumTex({ a, w, p, c }: ReadParams): string {
  const power = p === 1 ? '' : `^{${p}}`;
  return `\\lim_{n \\to \\infty} \\sum_{k=1}^{n} \\frac{${w}}{n} \\cdot ${c === 1 ? '' : c}\\left(${edgeTex(a, w)}\\right)${power}`;
}

/** The integral a limit of a sum stands for, as two tiles: the limits, then the integrand. */
const readTiles: Generator<ReadParams> = {
  id: 'int-lim-read-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.int(hard ? -3 : 0, 4),
      w: rng.int(1, 5),
      p: hard ? rng.int(2, 3) : rng.int(1, 2),
      c: hard ? rng.int(2, 5) : 1,
    };
  },
  render: (params): Slide => {
    const { a, w, p, c } = params;
    const answer = [intTok(a, a + w), termTex(c, p)];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write this limit as a definite integral.' },
        { kind: 'display', tex: readSumTex(params) },
      ],
      template: '{0} \\, {1} \\, dx',
      bank: tokenBank(answer, [
        // Limits read as 0 to the width, the width as the top, or 0 to the far end.
        intTok(0, w),
        intTok(a, w),
        intTok(0, a + w),
        // The power raised, and the width folded into the integrand.
        termTex(c, p + 1),
        termTex(c * w, p),
      ]),
      answer,
    };
  },
  solution: ({ a, w, p, c }) => [
    { text: `The factor $\\frac{${w}}{n}$ is the strip width, $\\frac{b - a}{n}$, so the interval is $${w}$ long.` },
    { text: `The bracket is $x$ at the right edge of strip $k$. At $k = 0$ it is $${a}$, where the strips start, so $a = ${a}$ and $b = ${a + w}$.` },
    { text: `Writing $x$ for the bracket, the height is $${termTex(c, p)}$.` },
    { tex: `\\int_{${a}}^{${a + w}} ${termTex(c, p)} \\, dx` },
  ],
};

export interface WhichIntegralParams {
  a: number;
  w: number;
  /** 0 for a general f, or the power of x written into the terms. */
  p: number;
}

/** One term of the sum: (width/n) f(start + step k/n), general or with x^p written in. */
function termOptionTex(width: number, start: number, step: number, p: number): string {
  const inside = edgeTex(start, step);
  const height = p === 0 ? `f\\left(${inside}\\right)` : `\\left(${inside}\\right)^{${p}}`;
  return `\\frac{${width}}{n} ${height}`;
}

/** Which term, summed and taken to the limit, gives a stated integral. */
const whichIntegral: Generator<WhichIntegralParams> = {
  id: 'int-lim-which-integral',
  // The far end stays positive, so the slip that uses it as the width is a width at all.
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ a: nonZero(rng.int(-3, 5), 2), w: rng.int(2, 6), p: difficulty > 1 ? rng.int(2, 3) : 0 }),
      // With x^p written in, a wrong term can still land on the right number (an odd
      // power across 0 gives 0 either way), so every slip's limit must differ.
      ({ a, w, p }) => {
        if (a + w < 1) return false;
        if (p === 0) return true;
        const limitOf = (width: number, start: number, step: number) =>
          (width / step) * (((start + step) ** (p + 1) - start ** (p + 1)) / (p + 1));
        const right = limitOf(w, a, w);
        return [limitOf(1, a, w), limitOf(w, 0, w), limitOf(a + w, a, a + w), limitOf(w, a, 1)].every(
          (slip) => Math.abs(slip - right) > 0.5,
        );
      },
      { a: 1, w: 3, p: difficulty > 1 ? 2 : 0 },
    ),
  render: ({ a, w, p }): Slide => {
    const b = a + w;
    const integrand = p === 0 ? 'f(x)' : `x^{${p}}`;
    const opts = [
      termOptionTex(w, a, w, p),
      // The width taken as 1/n, the start left off, the far end used as the width, and the step left as k/n.
      termOptionTex(1, a, w, p),
      termOptionTex(w, 0, w, p),
      termOptionTex(b, a, b, p),
      termOptionTex(w, a, 1, p),
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `Which term, summed from $k = 1$ to $n$, tends to $\\int_{${a}}^{${b}} ${integrand} \\, dx$ as $n$ grows?`,
        },
      ],
      ...placedChoices(
        [...new Set(opts)].slice(0, 4).map((tex) => ({ tex })),
        mix(a, w, p),
      ),
    };
  },
  solution: ({ a, w, p }) => {
    const b = a + w;
    return [
      { text: `The interval is $${b} - (${a}) = ${w}$ long, so each of the $n$ strips is $\\frac{${w}}{n}$ wide.` },
      { text: `The right edge of strip $k$ is $${a} + \\frac{${w}k}{n}$: it starts at $${a}$ and steps by the width.` },
      { text: 'Width times the height at that edge:' },
      { tex: termOptionTex(w, a, w, p) },
    ];
  },
};

export interface SumValueParams {
  f: Poly;
  a: number;
  w: number;
}

/** The value of the integral the limit stands for. */
export const sumValue = ({ f, a, w }: SumValueParams): number => sixIntegral(f, a, a + w) / 6;

/** lim sum (w/n) f(a + wk/n), with f given in the prompt. */
const sumValueTex = ({ a, w }: SumValueParams): string =>
  `\\lim_{n \\to \\infty} \\sum_{k=1}^{n} \\frac{${w}}{n} f\\left(${edgeTex(a, w)}\\right)`;

/** A limit of a sum recognised as an integral and evaluated: typed, checked by quadrature. */
const sumValueTyped: Generator<SumValueParams> = {
  id: 'int-lim-sum-value',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const c = nonZero(rng.int(-3, 4), 2);
        const f: Poly = hard
          ? [rng.int(-4, 6), nonZero(rng.int(-4, 4), 1), c]
          : rng.pick<Poly>([[0, rng.int(1, 6)], [0, 0, rng.int(1, 3)], [rng.int(1, 5), rng.int(1, 4)]]);
        return { f, a: rng.int(hard ? -2 : 0, 3), w: rng.int(1, 4) };
      },
      (params) => {
        const six = sixIntegral(params.f, params.a, params.a + params.w);
        return hard ? six % 3 === 0 && Math.abs(six) <= 600 : six % 6 === 0 && six <= 360;
      },
      { f: [0, 2], a: 1, w: 2 },
    );
  },
  choices: (params) => {
    const { f, a, w } = params;
    const V = sumValue(params);
    // Integrated from 0 instead of from a, the top limit alone, and one wide rectangle.
    const fromZero = sixIntegral(f, 0, w) / 6;
    const topOnly = sixIntegral(f, 0, a + w) / 6;
    return halvesChoices(V, [fromZero, topOnly, w * polyAt(f, a + w)], mix(a, w, ...f));
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Here $f(x) = ${polyTex(params.f)}$. Call this limit $L$ and write it as an integral, then evaluate it. ${
          Number.isInteger(sumValue(params)) ? 'The answer is a whole number.' : 'The answer ends in $.5$.'
        }`,
      },
      { kind: 'display', tex: sumValueTex(params) },
    ],
    lead: 'L =',
    keypad: [],
    answer: `${sumValue(params)}`,
    integrand: polyAnswer(params.f),
    limits: [params.a, params.a + params.w],
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { f, a, w } = params;
    const b = a + w;
    return [
      { text: `The width is $\\frac{${w}}{n}$ and the edges start at $${a}$, so this is the integral from $${a}$ to $${b}$.` },
      { tex: `\\int_{${a}}^{${b}} (${polyTex(f)}) \\, dx` },
      { tex: `= \\left[${antiTex(f)}\\right]_{${a}}^{${b}}` },
      { tex: `L = ${sumValue(params)}` },
    ];
  },
};

/** Reading a limit of a sum one piece at a time: the width, the start, then the integrand. */
const identifyFlow: Generator<ReadParams> = {
  id: 'int-lim-identify-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { a: rng.int(hard ? -3 : 0, 4), w: rng.int(1, 5), p: hard ? rng.int(2, 3) : rng.int(1, 2), c: hard ? rng.int(2, 5) : 1 };
  },
  render: (params): Slide => {
    const { a, w, p, c } = params;
    const b = a + w;
    const salt = mix(a, w, p, c);
    const distinct = (values: number[]) => [...new Set(values)];
    const widths = distinct([w, a + w, w + 1, w + 2]).slice(0, 3);
    const starts = distinct([a, a === 0 ? w : 0, b, a + 1]).slice(0, 3);
    const integrand = termTex(c, p);
    const wrongWidth = 'Not quite: $\\frac{b - a}{n}$ is the width, so $b - a$ is the number over $n$.';
    const wrongStart = 'Not quite: at $k = 0$ the bracket gives the left end of the first strip, which is $a$.';
    const wrongF = 'Not quite: the width becomes the $dx$, and $x$ replaces the whole bracket.';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Read the integral off this limit, one piece at a time.' }],
      subject: readSumTex(params),
      steps: [
        {
          id: 'width',
          ask: `The factor $\\frac{${w}}{n}$ is the strip width, $\\frac{b - a}{n}$. So what is $b - a$?`,
          branches: turned(
            widths.map((v) => (v === w ? { label: `$${v}$`, to: 'start' } : { label: `$${v}$`, outcome: wrongWidth })),
            salt,
          ),
        },
        {
          id: 'start',
          ask: 'Where do the strips start? That is the lower limit $a$.',
          branches: turned(
            starts.map((v) => (v === a ? { label: `$${v}$`, to: 'height' } : { label: `$${v}$`, outcome: wrongStart })),
            salt + 1,
          ),
        },
        {
          id: 'height',
          ask: 'Write $x$ for the bracket. What is being integrated?',
          branches: turned(
            [...new Set([integrand, termTex(c * w, p), termTex(c, p + 1), termTex(c + 1, p)])].slice(0, 3).map((tex) =>
              tex === integrand
                ? { label: `$${tex}$`, outcome: `The limit is $\\int_{${a}}^{${b}} ${integrand} \\, dx$.` }
                : { label: `$${tex}$`, outcome: wrongF },
            ),
            salt + 2,
          ),
        },
      ],
      answer: [`$${w}$`, `$${a}$`, `$${integrand}$`],
    };
  },
  solution: ({ a, w, p, c }) => [
    { text: `The width is $\\frac{${w}}{n}$, so $b - a = ${w}$.` },
    { text: `At $k = 0$ the bracket is $${a}$, so the strips start at $a = ${a}$, and $b = ${a + w}$.` },
    { text: `With $x$ for the bracket, the height is $${termTex(c, p)}$.` },
    { tex: `\\int_{${a}}^{${a + w}} ${termTex(c, p)} \\, dx` },
  ],
};

/* Over or under. */

const UNDER = 'Under-estimate: every rectangle sits below the curve.';
const OVER = 'Over-estimate: every rectangle pokes above the curve.';
const NEITHER = 'Neither is certain: some rectangles sit below the curve and some above.';

/** Over or under for a monotone f: the side's edge is each strip's lowest point, or its highest. */
function isUnder(trend: 'up' | 'down', side: Side): boolean {
  return (trend === 'up') === (side === 'left');
}

export interface BoundParams {
  f: Poly;
  a: number;
  h: number;
  n: number;
  side: Side;
}

function sampleBound(rng: Rng, difficulty: number, allowTurn: boolean): BoundParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const f = rng.chance(hard ? 0.3 : 0.5) ? [rng.int(1, 9), nonZero(rng.int(-4, 4), 1)] : [rng.int(-3, 12), rng.int(-6, 6), rng.pick([1, -1])];
      return { f, a: rng.int(-2, 3), h: 1, n: rng.int(3, 6), side: rng.pick<Side>(['left', 'right']) };
    },
    (params) => {
      const trend = trendOf(params.f, params.a, params.a + params.n);
      return heightsFit(params, 40) && (trend !== 'turns' || (allowTurn && hard && rng.chance(0.5)));
    },
    { f: [2, 1], a: 0, h: 1, n: 4, side: 'left' },
  );
}

const boundTex = ({ f, a, h, n }: BoundParams): string => `\\int_{${a}}^{${a + n * h}} (${polyTex(f)}) \\, dx`;

/** Over, under or neither, walked: which way f goes, then where the side's edge sits. */
const overUnder: Generator<BoundParams> = {
  id: 'int-lim-over-under',
  sample: (rng, difficulty) => sampleBound(rng, difficulty, true),
  render: (params): Slide => {
    const { f, a, h, n, side } = params;
    const trend = trendOf(f, a, a + n * h);
    const edge = (id: string) => ({
      id,
      ask: `So on each strip, the ${side} edge is where $f$ is`,
      branches: [
        { label: 'lowest', outcome: UNDER },
        { label: 'highest', outcome: OVER },
      ],
    });
    const answer =
      trend === 'turns' ? ['It turns'] : [trend === 'up' ? 'Rising' : 'Falling', isUnder(trend, side) ? 'lowest' : 'highest'];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `The ${side} sum with ${n} strips estimates this integral. Does it over- or under-estimate?`,
        },
      ],
      subject: boundTex(params),
      steps: [
        {
          id: 'trend',
          ask: `From $x = ${a}$ to $x = ${a + n * h}$, is $f(x) = ${polyTex(f)}$ rising or falling?`,
          branches: [
            { label: 'Rising', to: 'up' },
            { label: 'Falling', to: 'down' },
            { label: 'It turns', outcome: NEITHER },
          ],
        },
        edge('up'),
        edge('down'),
      ],
      answer,
    };
  },
  solution: ({ f, a, h, n, side }) => {
    const b = a + n * h;
    const trend = trendOf(f, a, b);
    const slope = coefficientOf(f, 2) === 0 ? `f'(x) = ${coefficientOf(f, 1)}` : `f'(x) = ${polyTex([coefficientOf(f, 1), 2 * coefficientOf(f, 2)])}`;
    if (trend === 'turns') {
      const vertex = -coefficientOf(f, 1) / (2 * coefficientOf(f, 2));
      return [
        { text: `$${slope}$, which is zero at $x = ${vertex}$, inside the interval. So $f$ turns there.` },
        { text: 'On one side of the turn the rectangles sit below the curve and on the other they poke above, so the sum could land either side of the area.' },
      ];
    }
    const under = isUnder(trend, side);
    return [
      { text: `$${slope}$, which keeps one sign from $x = ${a}$ to $x = ${b}$, so $f$ is ${trend === 'up' ? 'rising' : 'falling'} throughout.` },
      {
        text: `On each strip the ${side} edge is then the ${under ? 'lowest' : 'highest'} point, so each rectangle is ${under ? 'below' : 'above'} the curve.`,
      },
      { text: under ? UNDER : OVER },
    ];
  },
};

const BOUND_OPTIONS = {
  underUp: '\\text{Under, as } f \\text{ rises}',
  underDown: '\\text{Under, as } f \\text{ falls}',
  overUp: '\\text{Over, as } f \\text{ rises}',
  overDown: '\\text{Over, as } f \\text{ falls}',
};

/** Over or under, and why, from the drawn rectangles (or at difficulty 2 from the formula alone). */
const boundChoice: Generator<BoundParams & { drawn: boolean }> = {
  id: 'int-lim-bound-choice',
  sample: (rng, difficulty) => ({ ...sampleBound(rng, difficulty, false), drawn: difficulty <= 1 }),
  render: (params): Slide => {
    const { f, a, h, n, side, drawn } = params;
    const trend = trendOf(f, a, a + n * h) as 'up' | 'down';
    const under = isUnder(trend, side);
    const key = `${under ? 'under' : 'over'}${trend === 'up' ? 'Up' : 'Down'}` as keyof typeof BOUND_OPTIONS;
    const rest = (Object.keys(BOUND_OPTIONS) as (keyof typeof BOUND_OPTIONS)[]).filter((k) => k !== key);
    const opts = [key, ...rest].map((k) => ({ tex: BOUND_OPTIONS[k] }));
    return {
      kind: 'choice',
      prompt: drawn
        ? [
            {
              kind: 'prose',
              text: `The rectangles make the ${side} sum for the area under $y = ${polyTex(f)}$ from $x = ${a}$ to $x = ${a + n * h}$. Over- or under-estimate?`,
            },
            { kind: 'diagram', svg: stripFigure(params) },
          ]
        : [
            {
              kind: 'prose',
              text: `The ${side} sum with ${n} strips estimates this integral. Over- or under-estimate?`,
            },
            { kind: 'display', tex: boundTex(params) },
          ],
      ...placedChoices(opts, mix(a, n, side.length, ...f)),
    };
  },
  solution: ({ f, a, h, n, side }) => {
    const trend = trendOf(f, a, a + n * h) as 'up' | 'down';
    const under = isUnder(trend, side);
    return [
      { text: `From $x = ${a}$ to $x = ${a + n * h}$, $f$ is ${trend === 'up' ? 'rising' : 'falling'}.` },
      { text: `So the ${side} edge of each strip is its ${under ? 'lowest' : 'highest'} point, and the rectangle ${under ? 'misses a sliver of' : 'takes in a sliver more than'} the area.` },
      { tex: BOUND_OPTIONS[`${under ? 'under' : 'over'}${trend === 'up' ? 'Up' : 'Down'}` as keyof typeof BOUND_OPTIONS] },
    ];
  },
};

export interface TurnParams {
  /** 1 for a cup, -1 for a cap. */
  s: number;
  k: number;
  p: number;
  q: number;
  a: number;
  b: number;
  side: Side;
}

/** s k (x - p)^2 + q, expanded. */
export const turnPoly = ({ s, k, p, q }: TurnParams): Poly => [s * k * p * p + q, -2 * s * k * p, s * k];

/** Where the rectangles stop sitting on one side of the curve: slide to the turning point. */
const turnSlider: Generator<TurnParams> = {
  id: 'int-lim-turn-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const hard = difficulty > 1;
        const s = rng.pick([1, -1]);
        const k = hard ? rng.int(1, 2) : 1;
        const p = rng.int(-2, 5);
        const a = p - rng.int(1, 4);
        const b = p + rng.int(1, 4);
        const reach = Math.max(p - a, b - p);
        const q = s === 1 ? rng.int(1, 6) : k * reach * reach + rng.int(1, 6);
        return { s, k, p, q, a, b, side: hard ? rng.pick<Side>(['left', 'right']) : 'left' };
      },
      ({ p, a, b }) => b - a >= 4 && p !== restingOn(a, b),
      { s: -1, k: 1, p: 2, q: 10, a: -1, b: 4, side: 'left' },
    ),
  render: (params): Slide => {
    const { s, a, b, side } = params;
    const f = turnPoly(params);
    const window = markerWindow(a, b);
    const at = (x: number) => polyAt(f, x);
    const rising = s === -1;
    const firstHalf = isUnder(rising ? 'up' : 'down', side) ? 'under-estimates' : 'over-estimates';
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `Here $f(x) = ${polyTex(f)}$, and the ${side} sum on each strip ${firstHalf} while $f$ ${rising ? 'rises' : 'falls'}. Slide the marker to where $f$ stops ${rising ? 'rising' : 'falling'}.`,
        },
      ],
      min: a,
      max: b,
      step: 1,
      answer: params.p,
      readout: 'x = {v}',
      figure: {
        svg: stripsSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          ...stripWindow(at, window.xMin, window.xMax),
          f: at,
          a,
          h: 1,
          n: b - a,
          side,
          label: `The curve with the ${side} sum's rectangles, turning inside the interval`,
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { s, k, p } = params;
    const f = turnPoly(params);
    return [
      { text: `$f'(x) = ${polyTex([coefficientOf(f, 1), 2 * coefficientOf(f, 2)])}$, which is zero at $x = ${p}$.` },
      {
        text: `The $x^{2}$ coefficient is ${s * k > 0 ? 'positive, so $f$ falls to a minimum there and then rises' : 'negative, so $f$ rises to a maximum there and then falls'}.`,
      },
      { tex: `x = ${p}` },
      { text: 'Either side of it the rectangles sit on opposite sides of the curve, so this sum is neither a sure over- nor a sure under-estimate.' },
    ];
  },
};

/** The left and right sums of a monotone f as the two bounds on its area, as tiles. */
const betweenTilesSum: Generator<StripParams> = {
  id: 'int-lim-between-tiles',
  sample: (rng, difficulty) => sampleStrips(rng, difficulty, true),
  render: (params): Slide => {
    const { f, a, h, n } = params;
    const left = rectSum(f, a, h, n, 'left');
    const right = rectSum(f, a, h, n, 'right');
    const answer = [Math.min(left, right), Math.max(left, right)];
    const all = h * gridXs(a, h, n).reduce((s, x) => s + polyAt(f, x), 0);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Here $f(x) = ${polyTex(f)}$, and $A$ is the area under it from $x = ${a}$ to $x = ${a + n * h}$. Work out the left and right sums with ${n} strips of width $${h}$, then fill in the bounds they give.`,
        },
      ],
      template: '{0} < A < {1}',
      // Each sum without its width, and every grid point added.
      bank: wholeBank(answer, [left / h, right / h, all]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { f, a, h, n } = params;
    const left = rectSum(f, a, h, n, 'left');
    const right = rectSum(f, a, h, n, 'right');
    const trend = trendOf(f, a, a + n * h);
    return [
      { text: `Left edges $x = ${stripXs(a, h, n, 'left').join(', ')}$ give $L_{${n}} = ${left}$. Right edges $x = ${stripXs(a, h, n, 'right').join(', ')}$ give $R_{${n}} = ${right}$.` },
      {
        text: `$f$ is ${trend === 'up' ? 'rising, so the left sum is under and the right sum over' : 'falling, so the left sum is over and the right sum under'} the area.`,
      },
      { tex: `${Math.min(left, right)} < A < ${Math.max(left, right)}` },
    ];
  },
};

/* Closing the loop. */

export interface PiecesParams {
  c: number;
  d: number;
  e: number;
  a: number;
  b: number;
}

/** Each term's limit: c(b^3 - a^3)/3, d(b^2 - a^2)/2 and e(b - a). */
export function piecesOf({ c, d, e, a, b }: PiecesParams): { sq: number; lin: number; con: number } {
  return { sq: (c * (b ** 3 - a ** 3)) / 3, lin: (d * (b ** 2 - a ** 2)) / 2, con: e * (b - a) };
}

const piecesPoly = ({ c, d, e }: PiecesParams): Poly => [e, d, c];

/** The limit of a sum taken term by term, which is the antiderivative taken term by term. */
const piecesTree: Generator<PiecesParams> = {
  id: 'int-lim-pieces-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const a = hard ? rng.int(0, 2) : 0;
        return { c: rng.int(1, 6), d: hard ? nonZero(rng.int(-4, 4), 2) : 0, e: rng.int(1, 9), a, b: a + rng.int(1, 3) };
      },
      (params) => {
        const { sq, lin } = piecesOf(params);
        return Number.isInteger(sq) && Number.isInteger(lin) && sq <= 150;
      },
      { c: 3, d: 0, e: 2, a: 0, b: 2 },
    );
  },
  render: (params): Slide => {
    const { c, d, e, a, b } = params;
    const { sq, lin, con } = piecesOf(params);
    const three = d !== 0;
    const values = three ? [sq, lin, con] : [sq, con];
    const total = values.reduce((s, v) => s + v, 0);
    const answer = [...values, total];
    const ids = three ? ['sq', 'lin', 'con'] : ['sq', 'con'];
    const rule =
      a === 0
        ? `$x^{2}$ gives $\\frac{${b}^{3}}{3}$${three ? `, $x$ gives $\\frac{${b}^{2}}{2}$` : ''} and a constant gives $${b}$`
        : `$x^{2}$ gives $\\frac{${b}^{3} - ${a}^{3}}{3}$${three ? `, $x$ gives $\\frac{${b}^{2} - ${a}^{2}}{2}$` : ''} and a constant gives $${b} - ${a}$`;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `The limit of the sum splits term by term: ${rule}, each times its coefficient. Top row: each term's limit. Then the integral.`,
        },
      ],
      expression: `\\int_{${a}}^{${b}} (${polyTex(piecesPoly(params))}) \\, dx`,
      nodes: [...ids.map((id) => ({ id, from: [] as string[] })), { id: 'total', from: ids }],
      // Not divided by 3 or 2, the constant not multiplied by the width, and the top limit alone.
      bank: wholeBank(answer, [c * (b ** 3 - a ** 3), ...(three ? [d * (b ** 2 - a ** 2)] : []), e, c * b ** 3, total + e]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const { sq, lin, con } = piecesOf(params);
    const f = piecesPoly(params);
    const total = sq + lin + con;
    return [
      { text: `Term by term: $${sq}$ from the $x^{2}$ term${params.d !== 0 ? `, $${lin}$ from the $x$ term` : ''} and $${con}$ from the constant.` },
      { tex: `\\text{Total} = ${total}` },
      { text: 'The same number comes from the antiderivative, which is the point: the limit of the sum is the integral.' },
      { tex: stacked(`\\left[${antiTex(f)}\\right]_{${a}}^{${b}}`, `= ${total}`) },
    ];
  },
};

/** This level's generators by name, for `limitSum.test.ts`. */
export const limitSumGenerators = {
  stripTree,
  rectSumLine,
  whichSum,
  sumEnds,
  sigma,
  sumInN,
  sumLimitSteps,
  approachSlider,
  readTiles,
  whichIntegral,
  sumValueTyped,
  identifyFlow,
  overUnder,
  boundChoice,
  turnSlider,
  betweenTilesSum,
  piecesTree,
};

export const integrationGenerators = [
  antiderivativeFamily,
  integratePower,
  integrateSum,
  integrateExponential,
  integrateTrig,
  definitePower,
  definiteSteps,
  definiteLine,
  areaUnder,
  integralProperties,
  areaBelowAxis,
  linearBracket,
  substitution,
  byParts,
  chooseMethod,
  definiteSubstitution,
  substitutionGeneral,
  rootPower,
  partsLog,
  betweenGiven,
  betweenTiles,
  betweenTree,
  whichAbove,
  regionFlow,
  meetPoints,
  meetSlider,
  setupIntegral,
  enclosedByLine,
  enclosedByParabolas,
  sixthRule,
  crossingArea,
  crossingTree,
  netBetween,
  volumeShape,
  volumeSetup,
  volumeIntegrand,
  volumeSlice,
  discArea,
  volumeXAxis,
  volumeRoot,
  volumeSquare,
  volumeFindLimit,
  volumeRearrange,
  volumeYAxis,
  volumeYRadius,
  volumeAxisFlow,
  volumeCone,
  volumeConeParts,
  volumeWasher,
  volumeOuterInner,
  coverUp,
  splitCoefficients,
  coverBothTree,
  poleSlider,
  recombine,
  logTerm,
  integrateSplit,
  integrateTiles,
  definiteSplit,
  substituteLimits,
  findLimit,
  fprimeOverF,
  divideFirst,
  topHeavy,
  repeatedSplit,
  repeatedIntegrate,
  formFlow,
  ...Object.values(improperGenerators),
  ...Object.values(limitSumGenerators),
] as unknown as Generator<unknown>[];
