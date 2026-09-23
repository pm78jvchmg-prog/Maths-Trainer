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
import type { Generator, KeypadKey, Slide } from '../types';
import type { Rng } from '../../engine/rng';
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS, EXP_KEYS, TRIG_KEYS, ROOT_KEYS, termTex, termAnswer, sumTex, sumAnswer } from './calculus';
import { bin, num, pow } from '../expr';
import { markerWindow, plotSvg } from '../figures';

/** The algebra keys plus the constant of integration. */
const INTEGRAL_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'C' }];
const EXP_INTEGRAL_KEYS: KeypadKey[] = [...EXP_KEYS, { insert: 'C' }];
const TRIG_INTEGRAL_KEYS: KeypadKey[] = [...TRIG_KEYS, { insert: 'C' }];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A fraction in lowest terms, with the sign carried by the numerator. */
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
        tex: `${integralTex(termTex(coefficient, power))} = \\frac{${coefficient}x^{${n}}}{${n}} + C = ${fracTermTex(coefficient, n, n)} + C`,
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
          ? `A constant term integrates to a multiple of $x$, since $${b}$ is really $${b}x^{0}$. Leaving it out altogether is the mistake to watch for.`
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
      { tex: `${co(a, k)}e^{${kx}} + C`, answer: `((${a})/(${k})) * e^((${k}) * x)` },
      { tex: `${termTex(a, 0)}e^{${kx}} + C`, answer: `(${a}) * e^((${k}) * x)` },
      { tex: `${termTex(a * k, 0)}e^{${kx}} + C`, answer: `(${a * k}) * e^((${k}) * x)` },
      { tex: `${co(a, k)}e^{${termTex(k, 1)}} \\times x + C`, answer: `((${a})/(${k})) * x * e^((${k}) * x)` },
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
      { tex: `${integralTex(a === 1 ? `e^{${termTex(k, 1)}}` : `${a}e^{${termTex(k, 1)}}`)} = ${coefficient}e^{${termTex(k, 1)}} + C` },
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
        tex: `${integralTex(`${a === 1 ? '' : a}\\${fn}\\left(${termTex(k, 1)}\\right)`)} = ${sign}${size}\\${other}\\left(${termTex(k, 1)}\\right) + C`,
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
      { tex: `${fracTermTex(a, 2 * n, 0)}${bracket}^{${n}} + C`, answer: `((${a})/(2 * (${n}))) * ${inner}^(${n})` },
      { tex: `${fracTermTex(a, n, 0)}${bracket}^{${n}} + C`, answer: `((${a})/(${n})) * ${inner}^(${n})` },
      { tex: `${fracTermTex(a, 2, 0)}${bracket}^{${n}} + C`, answer: `((${a})/2) * ${inner}^(${n})` },
      { tex: `${fracTermTex(a, 2 * n, 0)}${bracket}^{${power}} + C`, answer: `((${a})/(2 * (${n}))) * ${inner}^(${power})` },
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
        text: `Put $u = x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$. Then $\\frac{du}{dx} = 2x$, so $${a}x \\, dx$ becomes $\\frac{${a}}{2} \\, du$.`,
      },
      { tex: `${integralTex(`${termTex(a, 1)}${bracket}^{${power}}`)} = \\frac{${a}}{2}\\int u^{${power}} \\, du` },
      { tex: `= \\frac{${a}}{2} \\times \\frac{u^{${n}}}{${n}} = ${coefficient}u^{${n}}` },
      { tex: `= ${coefficient}${bracket}^{${n}} + C` },
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
    if (form === 'exp') {
      return options(
        { tex: `\\frac{${a}e^{${kx}}\\left(${kx} - 1\\right)}{${sq}} + C`, answer: `((${a})/((${k})^2)) * e^(${inner}) * ((${k}) * x - 1)` },
        { tex: `\\frac{${a}e^{${kx}}\\left(${kx} + 1\\right)}{${sq}} + C`, answer: `((${a})/((${k})^2)) * e^(${inner}) * ((${k}) * x + 1)` },
        { tex: `\\frac{${a}xe^{${kx}}}{${k}} + C`, answer: `((${a})/(${k})) * x * e^(${inner})` },
        // Choosing u the other way round, which the worked solution warns about.
        { tex: `\\frac{${a}x^{2}e^{${kx}}}{2} + C`, answer: `((${a})/2) * x^2 * e^(${inner})` },
        // Only a slip when there is something to divide by: at |k| = 1 this is
        // the correct answer, not a distractor.
        ...(Math.abs(k) === 1
          ? []
          : [{ tex: `${a}e^{${kx}}\\left(${kx} - 1\\right) + C`, answer: `(${a}) * e^(${inner}) * ((${k}) * x - 1)` }]),
      );
    }
    const fn = form;
    const other = form === 'sin' ? 'cos' : 'sin';
    const sign = form === 'sin' ? '-' : '+';
    return options(
      {
        tex: `\\frac{${a}\\left(\\${fn}\\left(${kx}\\right) ${sign} ${kx}\\${other}\\left(${kx}\\right)\\right)}{${sq}} + C`,
        answer:
          form === 'sin'
            ? `((${a})/((${k})^2)) * (sin(${inner}) - (${k}) * x * cos(${inner}))`
            : `((${a})/((${k})^2)) * (cos(${inner}) + (${k}) * x * sin(${inner}))`,
      },
      {
        tex: `\\frac{${a}\\left(\\${fn}\\left(${kx}\\right) ${sign === '-' ? '+' : '-'} ${kx}\\${other}\\left(${kx}\\right)\\right)}{${sq}} + C`,
        answer:
          form === 'sin'
            ? `((${a})/((${k})^2)) * (sin(${inner}) + (${k}) * x * cos(${inner}))`
            : `((${a})/((${k})^2)) * (cos(${inner}) - (${k}) * x * sin(${inner}))`,
      },
      {
        tex: `\\frac{${a}x\\${other}\\left(${kx}\\right)}{${k}} + C`,
        answer: `((${a})/(${k})) * x * ${other}(${inner})`,
      },
      {
        tex: `${a}\\${fn}\\left(${kx}\\right) + C`,
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
        text: `Put $u = x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, so $\\frac{du}{dx} = 2x$ and $${a}x \\, dx$ becomes $${(n + 1) * m} \\, du$. Change the limits with the variable: at $x = ${lower}$, $u = ${lower * lower + b}$; at $x = ${upper}$, $u = ${upper * upper + b}$.`,
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
          text: `Inside the bracket is $x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, whose derivative is $3x^{2}$, and there is an $x^{2}$ outside. Put $u = x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, so $${a}x^{2} \\, dx$ becomes $\\frac{${a}}{3} \\, du$.`,
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
          text: `The derivative of $x^{2}$ is $2x$, and there is an $x$ outside the exponential. Put $u = x^{2}$, so $${a}x \\, dx$ becomes $\\frac{${a}}{2} \\, du$.`,
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
      tex: `\\left(${polyTex(top)}\\right) - \\left(${polyTex(bottom)}\\right) = ${polyTex(gap)}`,
    },
    { text: 'Integrate that difference between the limits: upper curve minus lower curve, one integral.' },
    {
      tex: `\\int_{${lower}}^{${upper}} \\left(${polyTex(gap)}\\right) dx = \\left[${antiTex(gap)}\\right]_{${lower}}^{${upper}}`,
    },
    { tex: `= ${fu} - \\left(${fl}\\right) = ${fu - fl}` },
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
      { tex: `\\int_{${lower}}^{${upper}} \\left(${polyTex(top)}\\right) dx = \\left[${antiTex(top)}\\right]_{${lower}}^{${upper}} = ${over}` },
      { tex: `\\int_{${lower}}^{${upper}} \\left(${polyTex(bottom)}\\right) dx = \\left[${antiTex(bottom)}\\right]_{${lower}}^{${upper}} = ${under}` },
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
    { tex: `\\left(${polyTex(first)}\\right) - \\left(${polyTex(second)}\\right) = ${polyTex(gap)} = ${factorisedTex(k, roots[0], roots[1])}` },
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
    subject: `y_1 = ${polyTex(first)}, \\quad y_2 = ${polyTex(second)}`,
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
    { tex: `${polyTex(curve)} = ${polyTex(other)}` },
    { tex: `${polyTex(gap)} = 0` },
    { tex: `${factorisedTex(k, p, q)} = 0` },
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

/** The slider's track, which is also the figure's width. */
const MEET_MIN = -5;
const MEET_MAX = 7;

/**
 * The right-hand meeting point, dragged to on a picture of the two curves.
 *
 * The algebra and the picture are one fact seen twice, and a learner who has
 * solved for the limits should be able to point at them. The answer is never
 * where the handle rests before it is touched.
 */
const meetSlider: Generator<MeetParams> = {
  id: 'int-meet-slider',
  sample: (rng, difficulty) =>
    drawUntil(
      () => sampleMeet(rng, difficulty),
      ({ q }) => q !== MEET_MIN + Math.round((MEET_MAX - MEET_MIN) / 2),
      { curve: [-1, 0, 1], other: [1, 1, 0], p: -1, q: 2, swap: false },
    ),
  render: (params): Slide => {
    const { curve, other, p, q } = params;
    const [first, second] = meetNames(params);
    const { yMin, yMax } = windowFor([curve, other], p - 1.5, q + 1.5);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curves $y = ${first}$ and $y = ${second}$ meet twice. Slide the marker to the right-hand meeting point.`,
        },
      ],
      min: MEET_MIN,
      max: MEET_MAX,
      step: 1,
      answer: q,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: MEET_MIN,
          xMax: MEET_MAX,
          yMin,
          yMax,
          curves: [{ f: (x) => polyAt(curve, x) }, { f: (x) => polyAt(other, x), accent: true }],
          label: 'Two curves crossing each other twice',
        }),
        ...markerWindow(MEET_MIN, MEET_MAX),
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
      ...meetSolution(params).slice(0, 4),
      { text: `So the limits are $${p}$ and $${q}$. Between them, at $x = ${at}$, $y = ${polyTex(top)}$ gives $${polyAt(top, at)}$ and $y = ${polyTex(bottom)}$ gives $${polyAt(bottom, at)}$, so the first is on top.` },
      { tex: `\\left(${polyTex(top)}\\right) - \\left(${polyTex(bottom)}\\right) = ${polyTex(polySub(top, bottom))}` },
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
  return options(
    { tex: `${area}`, answer: `${area}` },
    { tex: `${-area}`, answer: `${-area}` },
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
    { tex: `${polyTex(gap)} = 0 \\quad \\Rightarrow \\quad ${factorisedTex(-k, p, q)} = 0` },
    {
      text: `They meet at $x = ${p}$ and $x = ${q}$. At $x = ${at}$, between them, $y = ${polyTex(top)}$ gives $${polyAt(top, at)}$ and $y = ${polyTex(bottom)}$ gives $${polyAt(bottom, at)}$, so the first is on top.`,
    },
    {
      tex: `\\int_{${p}}^{${q}} \\left(${polyTex(gap)}\\right) dx = \\left[${antiTex(gap)}\\right]_{${p}}^{${q}} = ${enclosedArea(params)}`,
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
  return q === 0 ? '(-x)' : `(${q} - x)`;
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
    return options(
      { tex: `${cube / 6}`, answer: `${cube / 6}` },
      { tex: `${cube / 3}`, answer: `${cube / 3}` },
      { tex: `${cube / 2}`, answer: `${cube / 2}` },
      { tex: `${cube}`, answer: `${cube}` },
    );
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
      { tex: `\\frac{${k}}{6} \\times ${width}^{3} = \\frac{${k} \\times ${width ** 3}}{6} = \\frac{${k * width ** 3}}{6} = ${area}` },
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
    { tex: `\\left(${polyTex(first)}\\right) - \\left(${polyTex(second)}\\right) = ${polyTex(gap)}` },
    { tex: `\\int_{${lower}}^{${cross}} \\left(${polyTex(gap)}\\right) dx = ${left}` },
    { tex: `\\int_{${cross}}^{${upper}} \\left(${polyTex(gap)}\\right) dx = ${right}` },
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
    const [left, right] = crossingPieces(params);
    const total = Math.abs(left) + Math.abs(right);
    return options(
      { tex: `${total}`, answer: `${total}` },
      // Integrating straight through the crossing.
      { tex: `${Math.abs(left + right)}`, answer: `${Math.abs(left + right)}` },
      { tex: `${left + right}`, answer: `${left + right}` },
      // Only the larger piece.
      { tex: `${Math.max(Math.abs(left), Math.abs(right))}`, answer: `${Math.max(Math.abs(left), Math.abs(right))}` },
      { tex: `${total + params.upper - params.lower}`, answer: `${total + params.upper - params.lower}` },
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
    { tex: `\\int_{${lower}}^{${upper}} \\left(y_1 - y_2\\right) dx = ${above} - ${below} = ${above - below}` },
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
] as unknown as Generator<unknown>[];
