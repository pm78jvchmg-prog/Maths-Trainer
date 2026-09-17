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
import { options } from '../choiceVariant';
import { ALGEBRA_KEYS, EXP_KEYS, TRIG_KEYS, ROOT_KEYS, termTex, termAnswer, sumTex, sumAnswer } from './calculus';
import { bin, num, pow } from '../expr';

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
] as unknown as Generator<unknown>[];
