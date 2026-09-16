/**
 * Differentiation generators.
 *
 * Answers are graded by equivalence, so a learner may write 6x, 3*2x or 2x*3
 * and all pass. That freedom is why this course can ask for a typed expression
 * rather than offering multiple choice.
 *
 * Throughout, `*Tex` values are what the learner reads and `answer` is what
 * mathjs grades — the two are never the same string.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import { options } from '../choiceVariant';
import {
  ALGEBRA_KEYS,
  TRIG_KEYS,
  EXP_KEYS,
  ROOT_KEYS,
  termTex,
  termAnswer,
  sumTex,
  sumAnswer,
  ddx,
} from './calculus';
import { bin, num, pow } from '../expr';

/** A non-zero integer, for sampling where 0 would make a degenerate question. */
function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

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

/** c/2 · x^{power} with `power` a TeX exponent such as '-1/2'; whole halves lose the fraction. */
function halfTermTex(c: number, power: string): string {
  if (c % 2 === 0) {
    const h = c / 2;
    return `${h === 1 ? '' : h === -1 ? '-' : h}x^{${power}}`;
  }
  return `${c < 0 ? '-' : ''}\\frac{${Math.abs(c)}}{2}x^{${power}}`;
}

/** A straight line as the learner reads it; never the empty string. */
function lineTex(gradient: number, intercept: number): string {
  const tex = sumTex([termTex(gradient, 1), termTex(intercept, 0)]);
  return tex === '' ? '0' : tex;
}

/* ---------- Power rule ---------- */

interface PowerParams { coefficient: number; power: number }

export const powerRule: Generator<PowerParams> = {
  id: 'power-rule',
  // Dropping the index without multiplying by it, and multiplying without
  // dropping it: the two halves of the rule, each forgotten on its own.
  choices: ({ coefficient, power }) =>
    options(
      { tex: termTex(coefficient * power, power - 1), answer: termAnswer(coefficient * power, power - 1) },
      { tex: termTex(coefficient, power - 1), answer: termAnswer(coefficient, power - 1) },
      { tex: termTex(coefficient * power, power), answer: termAnswer(coefficient * power, power) },
      { tex: termTex(coefficient * (power - 1), power - 1), answer: termAnswer(coefficient * (power - 1), power - 1) },
    ),
  sample: (rng, difficulty) => ({
    coefficient: rng.int(2, difficulty >= 2 ? 12 : 9),
    // Difficulty 2 admits negative powers, where the exponent gets more negative.
    power: difficulty >= 2 ? rng.pick([-4, -3, -2, 4, 5, 6, 7]) : rng.int(2, 7),
  }),
  render: ({ coefficient, power }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Differentiate with respect to $x$.' },
      { kind: 'display', tex: `y = ${termTex(coefficient, power)}` },
    ],
    lead: '\\frac{dy}{dx} =',
    keypad: ALGEBRA_KEYS,
    answer: termAnswer(coefficient * power, power - 1),
    source: termAnswer(coefficient, power),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ coefficient, power }) => [
    {
      text: 'Bring the power down as a multiplier, then reduce the power by one.',
      tex: `${ddx('ax^{n}')} = anx^{n-1}`,
    },
    {
      text: `Here $a = ${coefficient}$ and $n = ${power}$.`,
      tex: `${coefficient} \\times ${power} = ${coefficient * power}, \\quad ${power} - 1 = ${power - 1}`,
    },
    { text: 'So the derivative is:', tex: termTex(coefficient * power, power - 1) },
  ],
};

/* ---------- Sum rule ---------- */

interface SumRuleParams {
  /** Highest power first; a `power: 0` entry is the constant term. */
  terms: { coefficient: number; power: number }[];
}

export const sumRule: Generator<SumRuleParams> = {
  id: 'sum-rule',
  choices: ({ terms }) => {
    const right = terms.map((t) => [t.coefficient * t.power, t.power - 1] as const);
    const tex = (pairs: readonly (readonly [number, number])[]) =>
      sumTex(pairs.map(([c, p]) => termTex(c, p)));
    const ans = (pairs: readonly (readonly [number, number])[]) =>
      sumAnswer(pairs.map(([c, p]) => termAnswer(c, p)));
    return options(
      { tex: tex(right), answer: ans(right) },
      { tex: tex(terms.map((t) => [t.coefficient, t.power - 1] as const)), answer: ans(terms.map((t) => [t.coefficient, t.power - 1] as const)) },
      { tex: tex(terms.map((t) => [t.coefficient * t.power, t.power] as const)), answer: ans(terms.map((t) => [t.coefficient * t.power, t.power] as const)) },
      // One term's sign flipped, which is what a dropped minus looks like.
      ...[right.map(([c, p], i) => [i === 0 ? c : -c, p] as const)].map((flipped) => ({
        tex: tex(flipped),
        answer: ans(flipped),
      })),
    );
  },
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    // Level 2 leaves a gap between the powers (x^5 and x, say) so the learner
    // cannot read the answer off by pattern-matching adjacent terms.
    const highPower = hard ? rng.pick([3, 4, 5]) : rng.pick([2, 3]);
    const lowPower = hard ? rng.pick([1, 2]) : rng.int(1, highPower - 1);

    // Exactly one of the two power terms is negative at level 2, so a sign has
    // to be carried through the differentiation rather than ignored.
    const negateHigh = hard && rng.chance(0.4);
    const highCoefficient = rng.int(2, hard ? 9 : 6) * (negateHigh ? -1 : 1);
    const lowCoefficient = rng.int(2, hard ? 9 : 6) * (hard && !negateHigh ? -1 : 1);

    const terms: SumRuleParams['terms'] = [
      { coefficient: highCoefficient, power: highPower },
      { coefficient: lowCoefficient, power: lowPower },
    ];
    // The constant is the point of level 2: it is visible in the question and
    // absent from the answer.
    if (hard) terms.push({ coefficient: rng.int(2, 9) * rng.sign(), power: 0 });
    return { terms };
  },
  render: ({ terms }) => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Differentiate with respect to $x$.' },
      {
        kind: 'display',
        tex: `y = ${sumTex(terms.map((term) => termTex(term.coefficient, term.power)))}`,
      },
    ],
    lead: '\\frac{dy}{dx} =',
    keypad: ALGEBRA_KEYS,
    // termAnswer(0, -1) collapses to '0' for the constant, which sumAnswer drops.
    answer: sumAnswer(
      terms.map((term) => termAnswer(term.coefficient * term.power, term.power - 1)),
    ),
    source: sumAnswer(terms.map((term) => termAnswer(term.coefficient, term.power))),
    domain: 'real',
    mode: 'exact',
  }),
  solution: ({ terms }) => {
    /** Parenthesise a negative multiplier so "×" never sits beside a minus. */
    const braced = (value: number) => (value < 0 ? `\\left(${value}\\right)` : `${value}`);

    const steps: SolutionStep[] = [
      {
        text: `The sum rule lets you differentiate each of the ${terms.length} terms on its own and add the results.`,
        tex: `\\frac{dy}{dx} = ${terms
          .map((term) => ddx(termTex(term.coefficient, term.power)))
          .join(' + ')}`,
      },
    ];

    for (const { coefficient, power } of terms) {
      if (power === 0) {
        steps.push({
          text: `The constant $${coefficient}$ contains no $x$, so changing $x$ does not change it: it differentiates to $0$.`,
          tex: `${ddx(`${coefficient}`)} = 0`,
        });
      } else if (power === 1) {
        steps.push({
          text: `$${termTex(coefficient, 1)}$ has power $1$, so it differentiates to its coefficient $${coefficient}$.`,
          tex: `${ddx(termTex(coefficient, 1))} = ${coefficient}`,
        });
      } else {
        steps.push({
          text: `Multiply $${coefficient}$ by the power $${power}$, then drop the power to $${power - 1}$.`,
          tex: `${ddx(termTex(coefficient, power))} = ${braced(coefficient)} \\times ${power} x^{${power - 1}} = ${termTex(coefficient * power, power - 1)}`,
        });
      }
    }

    const hasConstant = terms.some((term) => term.power === 0);
    steps.push({
      text: hasConstant
        ? 'Add the pieces back together; the $0$ from the constant leaves nothing behind.'
        : 'Add the pieces back together.',
      tex: `\\frac{dy}{dx} = ${sumTex(
        terms.map((term) => termTex(term.coefficient * term.power, term.power - 1)),
      )}`,
    });

    return steps;
  },
};
/* ---------- Trig derivative (chain rule with a linear inside) ---------- */

interface TrigParams {
  fn: 'sin' | 'cos';
  /** Coefficient outside the trig function; 1 at difficulty 1. */
  outer: number;
  /** Coefficient of $x$ inside — this is the chain rule factor. */
  inner: number;
  /** Constant added inside; 0 at difficulty 1. */
  shift: number;
}

export const trigDerivative: Generator<TrigParams> = {
  id: 'trig-derivative',
  // Sine and cosine trade places under differentiation and one of them gains a
  // minus; the option with the sign the other way round is the standard slip.
  choices: ({ fn, outer, inner, shift }) => {
    const arg = sumTex([termTex(inner, 1), termTex(shift, 0)]);
    const argAnswer = sumAnswer([termAnswer(inner, 1), termAnswer(shift, 0)]);
    const other = fn === 'sin' ? 'cos' : 'sin';
    const co = fn === 'sin' ? outer * inner : -outer * inner;
    const opt = (coefficient: number, name: string) => ({
      tex: `${coefficient === 1 ? '' : coefficient === -1 ? '-' : coefficient}\\${name}\\left(${arg}\\right)`,
      answer: `(${coefficient}) * ${name}(${argAnswer})`,
    });
    return options(opt(co, other), opt(-co, other), opt(co, fn), opt(outer, other));
  },
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    // Level 2 is harder in structure, not size: a coefficient outside and a
    // constant inside, so the learner must separate the two multipliers and
    // notice the constant contributes nothing to du/dx.
    outer: difficulty >= 2 ? rng.int(2, 8) : rng.int(1, 4),
    inner: difficulty >= 2 ? rng.int(2, 7) : rng.int(2, 9),
    shift: difficulty >= 2 ? rng.sign() * rng.int(1, 6) : 0,
  }),
  render: ({ fn, outer, inner, shift }) => {
    const innerTex = sumTex([termTex(inner, 1), termTex(shift, 0)]);
    const innerAnswer = sumAnswer([termAnswer(inner, 1), termAnswer(shift, 0)]);
    const outerTex = outer === 1 ? '' : outer === -1 ? '-' : `${outer}`;
    // d/dx sin(u) = cos(u) u', d/dx cos(u) = -sin(u) u'.
    const derivativeFn = fn === 'sin' ? 'cos' : 'sin';
    const derivativeCoefficient = fn === 'sin' ? outer * inner : -outer * inner;

    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = ${outerTex}\\${fn}\\left(${innerTex}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: TRIG_KEYS,
      answer: `(${derivativeCoefficient}) * ${derivativeFn}(${innerAnswer})`,
      source: `(${outer}) * ${fn}(${innerAnswer})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ fn, outer, inner, shift }) => {
    const innerTex = sumTex([termTex(inner, 1), termTex(shift, 0)]);
    const derivativeFn = fn === 'sin' ? 'cos' : 'sin';
    const derivativeCoefficient = fn === 'sin' ? outer * inner : -outer * inner;
    const resultCoefTex =
      derivativeCoefficient === 1 ? '' : derivativeCoefficient === -1 ? '-' : `${derivativeCoefficient}`;

    return [
      {
        text: 'The inside of the bracket is not just $x$, so this needs the chain rule: differentiate the outside, then multiply by the derivative of the inside.',
        tex: `${ddx(`\\${fn}(u)`)} = ${fn === 'sin' ? '\\cos(u)' : '-\\sin(u)'}\\,\\frac{du}{dx}`,
      },
      {
        text:
          shift === 0
            ? `Here the inside is $u = ${innerTex}$, so the chain rule factor is $${inner}$.`
            : `Here the inside is $u = ${innerTex}$. The constant differentiates to zero, so the chain rule factor is just $${inner}$.`,
        tex: `u = ${innerTex}, \\quad \\frac{du}{dx} = ${inner}`,
      },
      {
        text:
          fn === 'sin'
            ? `Differentiating the outside turns $\\sin$ into $\\cos$, and the inside $${innerTex}$ is carried through unchanged.`
            : `Differentiating the outside turns $\\cos$ into $-\\sin$ — that minus sign is the one people drop. The inside $${innerTex}$ is carried through unchanged.`,
        tex: `\\frac{dy}{dx} = ${outer === 1 ? '' : outer}\\left(${fn === 'sin' ? '' : '-'}\\${derivativeFn}\\left(${innerTex}\\right)\\right) \\times ${inner}`,
      },
      {
        text:
          outer === 1
            ? `There is no coefficient outside, so the chain rule factor $${inner}$ is the whole multiplier.`
            : `Now collect the multipliers: the outer coefficient $${outer}$ times the chain rule factor $${inner}$.`,
        tex: `${fn === 'cos' ? '-' : ''}${outer} \\times ${inner} = ${derivativeCoefficient}`,
      },
      {
        text: 'So the derivative is:',
        tex: `\\frac{dy}{dx} = ${resultCoefTex}\\${derivativeFn}\\left(${innerTex}\\right)`,
      },
    ];
  },
};

/* ---------- Product rule ---------- */

interface ProductParams { a: number; b: number; c: number; d: number }

export const productRule: Generator<ProductParams> = {
  id: 'product-rule',
  // Differentiating the two factors separately and multiplying the results is
  // the classic wrong move, so it is always on offer.
  choices: ({ a, b, c, d }) => {
    const right = sumAnswer([termAnswer(3 * a * c, 2), termAnswer(2 * b * c, 1), termAnswer(a * d, 0)]);
    const rightTex = sumTex([termTex(3 * a * c, 2), termTex(2 * b * c, 1), termTex(a * d, 0)]);
    return options(
      { tex: rightTex, answer: right },
      { tex: termTex(2 * a * c, 1), answer: termAnswer(2 * a * c, 1) },
      {
        tex: sumTex([termTex(a * c, 2), termTex(2 * b * c, 1), termTex(a * d, 0)]),
        answer: sumAnswer([termAnswer(a * c, 2), termAnswer(2 * b * c, 1), termAnswer(a * d, 0)]),
      },
      {
        tex: sumTex([termTex(3 * a * c, 2), termTex(b * c, 1), termTex(a * d, 0)]),
        answer: sumAnswer([termAnswer(3 * a * c, 2), termAnswer(b * c, 1), termAnswer(a * d, 0)]),
      },
    );
  },
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty >= 2 ? 5 : 3),
    b: rng.int(1, 5) * (difficulty >= 2 ? rng.sign() : 1),
    c: rng.int(1, difficulty >= 2 ? 4 : 2),
    d: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1),
  }),
  render: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    // u v' + v u' = (ax+b)(2cx) + (cx^2+d)(a), expanded to 3ac x^2 + 2bc x + ad.
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate using the product rule.' },
        { kind: 'display', tex: `y = \\left(${u}\\right)\\left(${v}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      // Expanded, but an unexpanded answer is equally accepted: the checker
      // compares values, not the shape they were written in.
      answer: sumAnswer([
        termAnswer(3 * a * c, 2),
        termAnswer(2 * b * c, 1),
        termAnswer(a * d, 0),
      ]),
      source: `(${sumAnswer([termAnswer(a, 1), termAnswer(b, 0)])}) * (${sumAnswer([termAnswer(c, 2), termAnswer(d, 0)])})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 2), termTex(d, 0)]);
    return [
      {
        text: 'Differentiate each factor in turn, keeping the other one intact.',
        tex: "\\frac{d}{dx}(uv) = u'v + uv'",
      },
      {
        text: 'Write down all four pieces before assembling anything — most slips here are bookkeeping, not calculus.',
        tex: `u = ${u}, \\quad v = ${v}, \\quad u' = ${a}, \\quad v' = ${termTex(2 * c, 1)}`,
      },
      {
        text: 'Now substitute into the rule.',
        tex: `\\frac{dy}{dx} = ${a}\\left(${v}\\right) + \\left(${u}\\right)\\left(${termTex(2 * c, 1)}\\right)`,
      },
      {
        text: 'Expanding and collecting like terms gives:',
        tex: sumTex([
          termTex(3 * a * c, 2),
          termTex(2 * b * c, 1),
          termTex(a * d, 0),
        ]),
      },
      {
        text: 'Leaving it unexpanded is fine too — both forms are marked correct.',
      },
    ];
  },
};

/* ---------- Quotient rule ---------- */

interface QuotientParams { a: number; b: number; c: number; d: number }

export const quotientRule: Generator<QuotientParams> = {
  id: 'quotient-rule',
  // Reversing the numerator is the error the quotient rule invites, since the
  // product rule it resembles is symmetric and this one is not.
  choices: ({ a, b, c, d }) => {
    const den = `\\left(${sumTex([termTex(c, 1), termTex(d, 0)])}\\right)^{2}`;
    const denAnswer = `(${sumAnswer([termAnswer(c, 1), termAnswer(d, 0)])})^2`;
    const top = a * d - b * c;
    return options(
      { tex: `\\frac{${top}}{${den}}`, answer: `(${top}) / ${denAnswer}` },
      { tex: `\\frac{${-top}}{${den}}`, answer: `(${-top}) / ${denAnswer}` },
      { tex: `\\frac{${a * d + b * c}}{${den}}`, answer: `(${a * d + b * c}) / ${denAnswer}` },
      { tex: `\\frac{${top}}{${sumTex([termTex(c, 1), termTex(d, 0)])}}`, answer: `(${top}) / (${sumAnswer([termAnswer(c, 1), termAnswer(d, 0)])})` },
    );
  },
  sample: (rng, difficulty) => {
    // ad - bc must be non-zero, or the function is constant and the derivative
    // collapses to 0 — a question with nothing in it to get right.
    for (;;) {
      const a = rng.int(1, difficulty >= 2 ? 5 : 3);
      const b = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      const c = rng.int(1, difficulty >= 2 ? 4 : 2);
      const d = rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1);
      if (a * d - b * c !== 0) return { a, b, c, d };
    }
  },
  render: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    const vAnswer = sumAnswer([termAnswer(c, 1), termAnswer(d, 0)]);
    // (u'v - uv')/v^2 collapses neatly: (ad - bc)/(cx + d)^2.
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate using the quotient rule.' },
        { kind: 'display', tex: `y = \\frac{${u}}{${v}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      answer: `(${a * d - b * c}) / ((${vAnswer})^2)`,
      source: `(${sumAnswer([termAnswer(a, 1), termAnswer(b, 0)])}) / (${vAnswer})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, d }) => {
    const u = sumTex([termTex(a, 1), termTex(b, 0)]);
    const v = sumTex([termTex(c, 1), termTex(d, 0)]);
    return [
      {
        text: 'The derivative of the top comes first, and the whole thing sits over the denominator squared.',
        tex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^{2}}",
      },
      {
        text: 'Identify the four pieces.',
        tex: `u = ${u}, \\quad v = ${v}, \\quad u' = ${a}, \\quad v' = ${c}`,
      },
      {
        text: 'Substituting gives a numerator that simplifies a long way.',
        tex: `\\frac{${a}\\left(${v}\\right) - \\left(${u}\\right)${c}}{\\left(${v}\\right)^{2}}`,
      },
      {
        text: `The $x$ terms in the numerator cancel, leaving $${a} \\times ${d} - ${b} \\times ${c} = ${a * d - b * c}$.`,
        tex: `\\frac{dy}{dx} = \\frac{${a * d - b * c}}{\\left(${v}\\right)^{2}}`,
      },
    ];
  },
};

/* ---------- Chain rule ---------- */

interface ChainParams { a: number; b: number; power: number; innerPower: number }

export const chainRule: Generator<ChainParams> = {
  id: 'chain-rule',
  // Forgetting the inner derivative is the whole point of the rule, so the
  // answer without it is always among the options.
  choices: ({ a, b, power, innerPower }) => {
    const inner = sumTex([termTex(a, innerPower), termTex(b, 0)]);
    const innerAnswer = sumAnswer([termAnswer(a, innerPower), termAnswer(b, 0)]);
    const bracket = `\\left(${inner}\\right)^{${power - 1}}`;
    const bracketAnswer = `((${innerAnswer})^(${power - 1}))`;
    return options(
      { tex: `${power}${bracket}\\left(${termTex(a * innerPower, innerPower - 1)}\\right)`, answer: `(${power}) * ${bracketAnswer} * (${termAnswer(a * innerPower, innerPower - 1)})` },
      { tex: `${power}${bracket}`, answer: `(${power}) * ${bracketAnswer}` },
      { tex: `${bracket}\\left(${termTex(a * innerPower, innerPower - 1)}\\right)`, answer: `${bracketAnswer} * (${termAnswer(a * innerPower, innerPower - 1)})` },
      { tex: `${power}\\left(${inner}\\right)^{${power}}\\left(${termTex(a * innerPower, innerPower - 1)}\\right)`, answer: `(${power}) * ((${innerAnswer})^(${power})) * (${termAnswer(a * innerPower, innerPower - 1)})` },
    );
  },
  sample: (rng, difficulty) => ({
    a: difficulty >= 2 ? 1 : rng.int(2, 5),
    b: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1),
    power: difficulty >= 2 ? rng.pick([3, 4, -2]) : rng.int(2, 4),
    // Difficulty 2 puts a quadratic inside, so the chain factor is a function
    // of x rather than a bare constant.
    innerPower: difficulty >= 2 ? 2 : 1,
  }),
  render: ({ a, b, power, innerPower }) => {
    const inner = sumTex([termTex(a, innerPower), termTex(b, 0)]);
    const innerAnswer = sumAnswer([termAnswer(a, innerPower), termAnswer(b, 0)]);
    // n(inner)^(n-1) * inner', where inner' = a * innerPower * x^(innerPower-1).
    const chainFactor = termAnswer(a * innerPower, innerPower - 1);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = \\left(${inner}\\right)^{${power}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      answer: `(${power}) * ((${innerAnswer})^(${power - 1})) * (${chainFactor})`,
      source: `(${innerAnswer})^(${power})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, power, innerPower }) => {
    const inner = sumTex([termTex(a, innerPower), termTex(b, 0)]);
    const innerDerivative = termTex(a * innerPower, innerPower - 1);
    return [
      {
        text: 'Differentiate the outside as usual, then multiply by the derivative of what was inside.',
        tex: "\\frac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)",
      },
      {
        text: `Here the inside is $u = ${inner}$.`,
        tex: `u = ${inner}, \\quad \\frac{du}{dx} = ${innerDerivative}`,
      },
      {
        text: `Differentiating the outside brings the power ${power} down and reduces it to ${power - 1}.`,
        tex: `${power}\\left(${inner}\\right)^{${power - 1}}`,
      },
      {
        text: 'Now multiply by the derivative of the inside — the step that is easiest to forget.',
        tex: `\\frac{dy}{dx} = ${power}\\left(${inner}\\right)^{${power - 1}} \\times ${innerDerivative}`,
      },
    ];
  },
};

/* ---------- Exponentials and logarithms ---------- */

interface ExpLogParams { form: 'exp' | 'lnScaled' | 'lnInner'; a: number; k: number }

export const expLogDerivative: Generator<ExpLogParams> = {
  id: 'exp-log-derivative',
  choices: ({ form, a, k }) => {
    if (form === 'exp') {
      const exponent = k === 1 ? 'x' : termTex(k, 1);
      const opt = (c: number) => ({ tex: `${c === 1 ? '' : c}e^{${exponent}}`, answer: `(${c}) * e^((${k}) * x)` });
      return options(opt(a * k), opt(a), opt(a * k * k), opt(a + k));
    }
    // Both logarithm forms differentiate to a/x: the inner constant cancels,
    // which is exactly what the distractors get wrong.
    const opt = (num: number, den: string, answer: string) => ({ tex: `\\frac{${num}}{${den}}`, answer });
    return options(
      opt(a, 'x', `(${a}) / x`),
      // Squaring the denominator is wrong at every k and every a, which keeps a
      // distractor on the slide when the others drop out below.
      { tex: `\\frac{${a}}{x^{2}}`, answer: `(${a}) / x^2` },
      // At k = 1 the inner constant is invisible, so "kept the k" and "left it
      // downstairs" are both just the right answer written differently.
      ...(k === 1
        ? []
        : [opt(a * k, 'x', `(${a * k}) / x`), opt(a, `${k}x`, `(${a}) / ((${k}) * x)`)]),
      ...(a === 1 ? [] : [opt(1, 'x', `1 / x`)]),
    );
  },
  sample: (rng, difficulty) => ({
    // lnInner is the instructive case: ln(kx) differentiates to 1/x whatever k is.
    form: difficulty >= 2
      ? rng.pick(['exp', 'lnScaled', 'lnInner'] as const)
      : rng.pick(['exp', 'lnScaled'] as const),
    a: difficulty >= 2 ? rng.int(2, 9) : rng.int(1, 4),
    k: difficulty >= 2 ? rng.int(2, 8) : rng.int(1, 6),
  }),
  render: ({ form, a, k }) => {
    const outer = a === 1 ? '' : `${a}`;
    if (form === 'exp') {
      const exponent = k === 1 ? 'x' : termTex(k, 1);
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Differentiate with respect to $x$.' },
          { kind: 'display', tex: `y = ${outer}e^{${exponent}}` },
        ],
        lead: '\\frac{dy}{dx} =',
        keypad: EXP_KEYS,
        answer: `(${a * k}) * e^((${k}) * x)`,
        source: `(${a}) * e^((${k}) * x)`,
        domain: 'real',
        mode: 'exact',
      };
    }
    // Both log forms differentiate to a multiple of 1/x.
    const body = form === 'lnScaled' ? 'x' : termTex(k, 1);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = ${outer}\\ln\\left(${body}\\right)` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: EXP_KEYS,
      answer: `(${a}) / x`,
      source: form === 'lnScaled' ? `(${a}) * log(x)` : `(${a}) * log((${k}) * x)`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ form, a, k }) => {
    if (form === 'exp') {
      const exponent = k === 1 ? 'x' : termTex(k, 1);
      return [
        {
          text: '$e^{x}$ is its own derivative, so all that changes is the chain rule factor from the exponent.',
          tex: `${ddx('e^{u}')} = e^{u}\\,\\frac{du}{dx}`,
        },
        {
          text: `Here $u = ${exponent}$, so $\\frac{du}{dx} = ${k}$.`,
          tex: `\\frac{dy}{dx} = ${a === 1 ? '' : a} \\times ${k} \\times e^{${exponent}} = ${termTex(a * k, 0)}e^{${exponent}}`,
        },
      ];
    }
    if (form === 'lnScaled') {
      return [
        {
          text: 'The natural logarithm differentiates to a reciprocal, with no logarithm left in the answer.',
          tex: `${ddx('\\ln x')} = \\frac{1}{x}`,
        },
        {
          text: `The constant multiplier $${a}$ simply carries through.`,
          tex: `\\frac{dy}{dx} = \\frac{${a}}{x}`,
        },
      ];
    }
    return [
      {
        text: `A log of a product splits into a sum: $\\ln(${k}x) = \\ln ${k} + \\ln x$.`,
        tex: `\\ln\\left(${termTex(k, 1)}\\right) = \\ln ${k} + \\ln x`,
      },
      {
        text: `$\\ln ${k}$ is just a constant, so it differentiates to zero — the $${k}$ disappears entirely.`,
        tex: `\\frac{dy}{dx} = ${a === 1 ? '' : a} \\times \\frac{1}{x} = \\frac{${a}}{x}`,
      },
    ];
  },
};

/* ---------- Evaluating a derivative at a point ---------- */

interface EvaluateParams { a: number; b: number; c: number; at: number }

export const evaluateDerivative: Generator<EvaluateParams> = {
  id: 'evaluate-derivative',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty >= 2 ? 4 : 2),
    b: rng.int(1, 5) * (difficulty >= 2 ? rng.sign() : 1),
    c: rng.int(1, 8) * (difficulty >= 2 ? rng.sign() : 1),
    // Small evaluation points keep the arithmetic tidy and the answer an integer.
    at: rng.int(1, 3) * (difficulty >= 2 ? rng.sign() : 1),
  }),
  render: ({ a, b, c, at }) => {
    const fn = sumTex([termTex(a, 3), termTex(b, 2), termTex(c, 1)]);
    // f'(x) = 3a x^2 + 2b x + c, evaluated at `at`.
    const value = 3 * a * at * at + 2 * b * at + c;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `The gradient of a curve at a point is the value of its derivative there. Find $f'(${at})$.`,
        },
        { kind: 'display', tex: `f(x) = ${fn}` },
      ],
      lead: `f'(${at}) =`,
      keypad: ALGEBRA_KEYS,
      answer: `${value}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, at }) => {
    const derivative = sumTex([termTex(3 * a, 2), termTex(2 * b, 1), termTex(c, 0)]);
    const value = 3 * a * at * at + 2 * b * at + c;
    return [
      {
        text: 'Differentiate first, leaving the answer as a function of $x$.',
        tex: `f'(x) = ${derivative}`,
      },
      {
        text: `Only now substitute $x = ${at}$.`,
        tex: `f'(${at}) = ${3 * a}\\left(${at}\\right)^{2} + ${2 * b}\\left(${at}\\right) + ${c}`,
      },
      {
        text: 'So the gradient of the tangent at that point is:',
        tex: `${value}`,
      },
    ];
  },
};

/* ---------- Evaluating a derivative, one piece at a time ---------- */

interface EvaluateStepsParams {
  /** Coefficient of x^3 in f(x). */
  a: number;
  /** Coefficient of x in f(x). */
  b: number;
  /** The point the derivative is evaluated at. */
  at: number;
}

/**
 * Substituting a value into a derivative, worked one piece at a time.
 *
 * `evaluate-derivative` asks the same underlying question but as one typed
 * number, so a learner who squares before multiplying and one who multiplies
 * before squaring both just type the same correct total — the order is
 * invisible in the answer. Here it is the whole question: the power has to be
 * taken before the multiplication, and the multiplication before the
 * addition, and a tree is what lets that be graded rather than assumed.
 *
 * f(x) is kept to two terms — a cube and a linear term — so f'(x) = 3ax^2 + b
 * is itself only two pieces: a power, then a multiplication, then an
 * addition, with nothing left over to obscure which step is which.
 */
const evaluateSteps: Generator<EvaluateStepsParams> = {
  id: 'df-evaluate-steps',
  sample: (rng, difficulty) => ({
    a: rng.int(1, difficulty > 1 ? 5 : 3),
    b: nonZero(rng.int(difficulty > 1 ? -9 : -6, difficulty > 1 ? 9 : 6), 4),
    at: difficulty > 1 ? nonZero(rng.int(-4, 4), -2) : rng.int(1, 4),
  }),
  /**
   * The no-working form: four whole-number totals. The distractors are the
   * slips real substitution produces — dropping the added term, subtracting
   * it instead of adding, and dropping the coefficient of the squared term.
   * Padded exactly as `quad-discriminant-steps` pads, since these collide for
   * some draws (a coefficient of 1 makes "keep it" and "drop it" the same
   * multiplication).
   */
  choices: ({ a, b, at }) => {
    const coefficient = 3 * a;
    const square = at * at;
    const correct = coefficient * square + b;

    const wrong = [coefficient * square - b, coefficient * square, square + b];
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
  render: ({ a, b, at }): Slide => {
    const coefficient = 3 * a;
    const expr = bin('+', bin('*', num(coefficient), pow(num(at), num(2))), num(b));

    const square = at * at;
    const product = coefficient * square;

    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `Substitute $x = ${at}$ into the derivative, one piece at a time. Tap the part you would do **next**, then choose what it comes to.`,
        },
        {
          kind: 'display',
          tex: `f(x) = ${sumTex([termTex(a, 3), termTex(b, 1)])} \\quad \\implies \\quad f'(x) = ${sumTex([termTex(coefficient, 2), termTex(b, 0)])}`,
        },
      ],
      expr,
      banks: {
        // at^2: doubling instead of squaring, forgetting to square at all, and
        // squaring but losing the sign — the distinctive slip when `at` is
        // negative, where the square should come out positive.
        'r.l.r': bank4(square, 2 * at, at, -square),
        // coefficient x at^2: forgetting the coefficient, adding it instead of
        // multiplying, and multiplying by `a` rather than by `3a` — the power
        // rule's own multiplier left off before this step ever starts.
        'r.l': bank4(product, square, coefficient + square, a * square),
        // The final addition: subtracting the constant instead of adding it,
        // and dropping it altogether.
        r: bank4(product + b, product - b, product, square + b),
      },
    };
  },
  solution: ({ a, b, at }) => {
    const coefficient = 3 * a;
    const square = at * at;
    const product = coefficient * square;
    const total = product + b;
    return [
      {
        text: 'Differentiate first, leaving the answer as a function of $x$. Only then substitute the number in.',
        tex: `f'(x) = ${sumTex([termTex(coefficient, 2), termTex(b, 0)])}`,
      },
      {
        text: `Work the power out before the multiplication: $x = ${at}$ is squared first, then multiplied by $${coefficient}$.`,
        tex: `f'(${at}) = ${coefficient}\\left(${at}\\right)^{2} + ${b} = ${coefficient} \\times ${square} + ${b}`,
      },
      { tex: `= ${product} + ${b} = ${total}` },
      {
        text:
          at < 0
            ? `$${at}$ is negative here, but $\\left(${at}\\right)^{2}$ still comes out positive — squaring a negative number always does. Writing down $-${square}$ instead is the sign that gets carried through by mistake, not squared away.`
            : `Squaring before multiplying is not a matter of taste: multiplying the coefficient in first would square it too, giving $\\left(${coefficient} \\times ${at}\\right)^{2} = ${(coefficient * at) ** 2}$ instead of $${product}$.`,
      },
    ];
  },
};

/* ---------- Choosing a rule ---------- */

interface RuleParams {
  route: 'power' | 'sum' | 'chain' | 'product' | 'quotient';
  /** Which shape of chain, when `route === 'chain'`. */
  chainForm: 'bracket' | 'trig';
  /** Which trig function, when `chainForm === 'trig'`. */
  fn: 'sin' | 'cos';
  a: number;
  b: number;
  c: number;
  d: number;
  power: number;
  /** The second term's power in a sum; the inner power in a bracket chain. */
  innerPower: number;
}

/**
 * Which rule does this derivative call for?
 *
 * Every other generator in this course asks the learner to *run* a rule
 * after being told which one applies. Recognising which rule a fresh
 * expression needs is the skill the rest of the course assumes and none of
 * it tests — a `choice` slide asking "which rule?" would be a one-in-five
 * guess. Walking the tree makes the learner commit to a reason at each fork:
 * is it a single term; a sum of terms with nothing multiplying between them;
 * a function of a function; or, failing both of those, a product or a
 * quotient of two.
 */
const chooseRule: Generator<RuleParams> = {
  id: 'df-choose-rule',
  sample: (rng, difficulty) => {
    const route = rng.pick(['power', 'sum', 'chain', 'product', 'quotient'] as const);
    const hard = difficulty >= 2;
    if (route === 'power') {
      return {
        route,
        chainForm: 'bracket' as const,
        fn: 'sin' as const,
        a: rng.int(2, hard ? 12 : 9),
        b: 0,
        c: 0,
        d: 0,
        power: hard ? rng.pick([-4, -3, -2, 4, 5, 6, 7]) : rng.int(2, 7),
        innerPower: 1,
      };
    }
    if (route === 'sum') {
      // A gap between the two powers, at difficulty 2, so the answer cannot
      // be read off by pattern-matching adjacent terms.
      const highPower = hard ? rng.pick([3, 4, 5]) : rng.pick([2, 3]);
      const lowPower = hard ? rng.pick([1, 2]) : rng.int(1, highPower - 1);
      const negateHigh = hard && rng.chance(0.4);
      return {
        route,
        chainForm: 'bracket' as const,
        fn: 'sin' as const,
        a: rng.int(2, hard ? 9 : 6) * (negateHigh ? -1 : 1),
        b: rng.int(2, hard ? 9 : 6) * (hard && !negateHigh ? -1 : 1),
        c: hard ? rng.int(2, 9) * rng.sign() : 0,
        d: 0,
        power: highPower,
        innerPower: lowPower,
      };
    }
    if (route === 'chain') {
      const chainForm = rng.pick(['bracket', 'trig'] as const);
      if (chainForm === 'bracket') {
        return {
          route,
          chainForm,
          fn: 'sin' as const,
          a: hard ? 1 : rng.int(2, 5),
          b: rng.int(1, 6) * (hard ? rng.sign() : 1),
          c: 0,
          d: 0,
          power: hard ? rng.pick([3, 4, -2]) : rng.int(2, 4),
          // Difficulty 2 puts a quadratic inside, so the inner derivative is
          // itself a function of x rather than a bare constant.
          innerPower: hard ? 2 : 1,
        };
      }
      return {
        route,
        chainForm,
        fn: rng.pick(['sin', 'cos'] as const),
        a: 0,
        b: hard ? rng.int(2, 7) : rng.int(2, 9),
        c: hard ? rng.sign() * rng.int(1, 6) : 0,
        d: 0,
        power: 0,
        innerPower: 1,
      };
    }
    if (route === 'product') {
      return {
        route,
        chainForm: 'bracket' as const,
        fn: 'sin' as const,
        a: rng.int(2, hard ? 5 : 3),
        b: rng.int(1, 5) * (hard ? rng.sign() : 1),
        c: rng.int(1, hard ? 4 : 2),
        d: rng.int(1, 6) * (hard ? rng.sign() : 1),
        power: 0,
        innerPower: 1,
      };
    }
    // quotient: a genuine fraction, never one that collapses to a constant.
    for (;;) {
      const a = rng.int(1, hard ? 5 : 3);
      const b = rng.int(1, 6) * (hard ? rng.sign() : 1);
      const c = rng.int(1, hard ? 4 : 2);
      const d = rng.int(1, 6) * (hard ? rng.sign() : 1);
      if (a * d - b * c !== 0) {
        return { route, chainForm: 'bracket' as const, fn: 'sin' as const, a, b, c, d, power: 0, innerPower: 1 };
      }
    }
  },
  render: ({ route, chainForm, fn, a, b, c, d, power, innerPower }): Slide => {
    const subject =
      route === 'power'
        ? termTex(a, power)
        : route === 'sum'
          ? sumTex([termTex(a, power), termTex(b, innerPower), termTex(c, 0)])
          : route === 'chain'
            ? chainForm === 'bracket'
              ? `\\left(${sumTex([termTex(a, innerPower), termTex(b, 0)])}\\right)^{${power}}`
              : `\\${fn}\\left(${sumTex([termTex(b, 1), termTex(c, 0)])}\\right)`
            : route === 'product'
              ? `\\left(${sumTex([termTex(a, 1), termTex(b, 0)])}\\right)\\left(${sumTex([termTex(c, 2), termTex(d, 0)])}\\right)`
              : `\\frac{${sumTex([termTex(a, 1), termTex(b, 0)])}}{${sumTex([termTex(c, 1), termTex(d, 0)])}}`;

    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: 'Work down the questions to decide how you would differentiate this. Each answer chooses what gets asked next.',
        },
      ],
      subject: `y = ${subject}`,
      steps: [
        {
          id: 'power',
          ask: 'Is it a single power of $x$ — one term, however it is written?',
          branches: [
            { label: 'Yes', outcome: 'Power rule: bring the power down as a multiplier, then reduce the power by one.' },
            { label: 'No', to: 'sum' },
          ],
        },
        {
          id: 'sum',
          ask: 'Is it several such terms added or subtracted, with no multiplying or dividing between them?',
          branches: [
            { label: 'Yes', outcome: 'Differentiate term by term and add the results.' },
            { label: 'No', to: 'composed' },
          ],
        },
        {
          id: 'composed',
          ask: 'Is it one function wrapped around another — like $(3x + 1)^{5}$ or $\\sin(2x)$ — rather than two separate factors?',
          branches: [
            {
              label: 'Yes',
              outcome: 'Chain rule: differentiate the outside, then multiply by the derivative of the inside.',
            },
            { label: 'No', to: 'combine' },
          ],
        },
        {
          id: 'combine',
          ask: 'Are the two factors multiplied together, rather than one divided by the other?',
          branches: [
            {
              label: 'Yes',
              outcome: 'Product rule: differentiate each factor in turn, keeping the other intact, and add.',
            },
            {
              label: 'No',
              outcome:
                "Quotient rule: derivative of the top times the bottom, minus the top times the derivative of the bottom, all over the bottom squared.",
            },
          ],
        },
      ],
      answer:
        route === 'power'
          ? ['Yes']
          : route === 'sum'
            ? ['No', 'Yes']
            : route === 'chain'
              ? ['No', 'No', 'Yes']
              : route === 'product'
                ? ['No', 'No', 'No', 'Yes']
                : ['No', 'No', 'No', 'No'],
    };
  },
  solution: ({ route, chainForm, fn, a, b, c, d, power, innerPower }) => {
    if (route === 'power') {
      return [
        {
          text: `$${termTex(a, power)}$ is a single power of $x$ — nothing more elaborate is going on, so this is a job for the power rule alone.`,
        },
        {
          text: 'Reaching for the product or chain rule here would still land on the right answer eventually, but only after unnecessary work.',
        },
      ];
    }
    if (route === 'sum') {
      return [
        {
          text: `The expression is $${sumTex([termTex(a, power), termTex(b, innerPower), termTex(c, 0)])}$ — power terms added or subtracted, with nothing multiplying or dividing between them.`,
        },
        {
          text: 'That independence is exactly what the sum rule needs: each term is differentiated on its own and the results are added.',
        },
      ];
    }
    if (route === 'chain') {
      return chainForm === 'bracket'
        ? [
            {
              text: `The bracket $\\left(${sumTex([termTex(a, innerPower), termTex(b, 0)])}\\right)$ is raised to a power, so this is one function — a power — wrapped around another.`,
            },
            {
              text: 'A function of a function is what the chain rule is for: differentiate the outside, then multiply by the derivative of what is inside.',
            },
          ]
        : [
            {
              text: `$\\${fn}$ is wrapped around $${sumTex([termTex(b, 1), termTex(c, 0)])}$ rather than plain $x$, so this is a function of a function.`,
            },
            {
              text: 'The chain rule applies: differentiate the trig function as usual, then multiply by the derivative of the inside.',
            },
          ];
    }
    if (route === 'product') {
      return [
        {
          text: `Two factors, $${sumTex([termTex(a, 1), termTex(b, 0)])}$ and $${sumTex([termTex(c, 2), termTex(d, 0)])}$, are multiplied together rather than added.`,
        },
        {
          text: 'That is the product rule: differentiate each factor in turn, keeping the other intact, and add the two results.',
        },
      ];
    }
    return [
      {
        text: `One expression, $${sumTex([termTex(a, 1), termTex(b, 0)])}$, sits over another, $${sumTex([termTex(c, 1), termTex(d, 0)])}$ — a quotient, not a product.`,
      },
      {
        text: 'Order matters here in a way it does not for the product rule: derivative of the top times the bottom, minus the top times the derivative of the bottom, all over the bottom squared.',
      },
    ];
  },
};

/* ---------- Roots and fractions, by index form ---------- */

interface IndexFormParams {
  form: 'reciprocal' | 'root' | 'reciprocalRoot';
  a: number;
  n: number;
}

/**
 * A fraction with $x$ underneath, or a root, differentiated by first
 * rewriting it as a power of $x$ — the move the power rule itself does not
 * teach, since it only ever meets whole positive powers.
 */
const indexForm: Generator<IndexFormParams> = {
  id: 'df-index-form',
  sample: (rng, difficulty) => {
    if (difficulty >= 2) {
      return {
        form: rng.pick(['reciprocal', 'root', 'reciprocalRoot'] as const),
        a: rng.int(2, 12),
        n: rng.int(2, 6),
      };
    }
    return {
      form: rng.pick(['reciprocal', 'reciprocal', 'root'] as const),
      a: rng.int(1, 9),
      n: rng.int(1, 4),
    };
  },
  choices: ({ form, a, n }) => {
    if (form === 'reciprocal') {
      return options(
        { tex: termTex(-a * n, -(n + 1)), answer: termAnswer(-a * n, -(n + 1)) },
        // Dropped the sign.
        { tex: termTex(a * n, -(n + 1)), answer: termAnswer(a * n, -(n + 1)) },
        // Multiplied by the power but forgot to reduce it.
        { tex: termTex(-a * n, -n), answer: termAnswer(-a * n, -n) },
        // Forgot to multiply by the power.
        { tex: termTex(-a, -(n + 1)), answer: termAnswer(-a, -(n + 1)) },
      );
    }
    if (form === 'root') {
      return options(
        { tex: halfTermTex(a, '-1/2'), answer: `((${a})/2) * x^(-1/2)` },
        // Forgot to reduce the power.
        { tex: halfTermTex(a, '1/2'), answer: `((${a})/2) * x^(1/2)` },
        // Forgot the half.
        { tex: `${a === 1 ? '' : a}x^{-1/2}`, answer: `(${a}) * x^(-1/2)` },
        // Sign dropped in.
        { tex: halfTermTex(-a, '-1/2'), answer: `((${-a})/2) * x^(-1/2)` },
      );
    }
    return options(
      { tex: halfTermTex(-a, '-3/2'), answer: `((${-a})/2) * x^(-3/2)` },
      // Sign dropped.
      { tex: halfTermTex(a, '-3/2'), answer: `((${a})/2) * x^(-3/2)` },
      // Forgot to reduce the power.
      { tex: halfTermTex(-a, '-1/2'), answer: `((${-a})/2) * x^(-1/2)` },
      // Forgot the half.
      { tex: `-${a === 1 ? '' : a}x^{-3/2}`, answer: `(${-a}) * x^(-3/2)` },
    );
  },
  render: ({ form, a, n }) => {
    if (form === 'reciprocal') {
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Differentiate with respect to $x$.' },
          { kind: 'display', tex: `y = ${n === 1 ? `\\frac{${a}}{x}` : `\\frac{${a}}{x^{${n}}}`}` },
        ],
        lead: '\\frac{dy}{dx} =',
        keypad: ALGEBRA_KEYS,
        answer: termAnswer(-a * n, -(n + 1)),
        // The solution's step 4, the answer written back as a fraction.
        alsoAccepts: [`(${-a * n})/x^(${n + 1})`],
        source: termAnswer(a, -n),
        domain: 'real',
        mode: 'exact',
      };
    }
    if (form === 'root') {
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Differentiate with respect to $x$.' },
          { kind: 'display', tex: `y = ${a === 1 ? '' : a}\\sqrt{x}` },
        ],
        lead: '\\frac{dy}{dx} =',
        keypad: ROOT_KEYS,
        answer: `((${a})/2) * x^(-1/2)`,
        // The solution's step 4, $\frac{a}{2\sqrt{x}}$.
        alsoAccepts: [`(${a})/(2*sqrt(x))`],
        source: `(${a}) * x^(1/2)`,
        domain: 'positive',
        mode: 'exact',
      };
    }
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = \\frac{${a}}{\\sqrt{x}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ROOT_KEYS,
      answer: `((${-a})/2) * x^(-3/2)`,
      // Two ways the learner is told they may write it. The first is the
      // solution's own step 4, $-\frac{a}{2x\sqrt{x}}$. The second is the
      // radical-of-a-cube form the teach slide's "a fraction under a root"
      // invites and that the checker's own domain policy names as the reason
      // `positive` exists: over the real line $\sqrt{x^3}$ takes the other
      // branch at negative x and disagrees with the index form, so this
      // writing is the one that fails if the `domain` below is widened. The
      // other three writings across this generator agree on any domain —
      // this is the only one that pins the prose to the domain field.
      alsoAccepts: [`(${-a})/(2*x*sqrt(x))`, `(${-a})/(2*sqrt(x^3))`],
      source: `(${a}) * x^(-1/2)`,
      domain: 'positive',
      mode: 'exact',
    };
  },
  solution: ({ form, a, n }) => {
    if (form === 'reciprocal') {
      const rewritten = `\\frac{${a}}{${n === 1 ? 'x' : `x^{${n}}`}} = ${termTex(a, -n)}`;
      return [
        {
          text: 'A fraction with $x$ underneath is a negative power. Rewrite it in index form before differentiating.',
          tex: rewritten,
        },
        {
          text: `Now the power rule applies as usual: multiply by the power $${-n}$, then reduce it by one.`,
          tex: `${a} \\times (${-n}) = ${-a * n}, \\; ${-n} - 1 = ${-(n + 1)}`,
        },
        { text: 'So the derivative in index form is:', tex: termTex(-a * n, -(n + 1)) },
        {
          text: 'Written back as a fraction, the power became *more* negative than it started. The coefficient $-an$ is negative, so for positive $x$ the gradient is negative — right, since $1/x^n$ falls as $x$ grows there.',
          tex: `\\frac{dy}{dx} = -\\frac{${a * n}}{x^{${n + 1}}}`,
        },
      ];
    }
    if (form === 'root') {
      return [
        {
          text: 'A root is a fractional power. Rewrite it in index form before differentiating.',
          tex: `${a === 1 ? '' : a}\\sqrt{x} = ${a === 1 ? '' : a}x^{1/2}`,
        },
        {
          text: 'The power rule applies exactly as before: multiply by the power $\\tfrac{1}{2}$, then reduce it by one.',
          tex: `${a} \\times \\tfrac{1}{2} = ${a % 2 === 0 ? a / 2 : `\\tfrac{${a}}{2}`}, \\; \\tfrac{1}{2} - 1 = -\\tfrac{1}{2}`,
        },
        { text: 'So the derivative in index form is:', tex: halfTermTex(a, '-1/2') },
        {
          text: 'Either that, or written back as a fraction under a root — both are accepted.',
          tex: `\\frac{dy}{dx} = \\frac{${a}}{2\\sqrt{x}}`,
        },
      ];
    }
    return [
      {
        text: 'A root underneath a fraction is a negative fractional power. Rewrite it in index form before differentiating.',
        tex: `\\frac{${a}}{\\sqrt{x}} = ${a === 1 ? '' : a}x^{-1/2}`,
      },
      {
        text: 'Multiply by the power $-\\tfrac{1}{2}$, then reduce it by one.',
        tex: `${a} \\times \\left(-\\tfrac{1}{2}\\right) = -${a % 2 === 0 ? a / 2 : `\\tfrac{${a}}{2}`}, \\; -\\tfrac{1}{2} - 1 = -\\tfrac{3}{2}`,
      },
      { text: 'So the derivative in index form is:', tex: halfTermTex(-a, '-3/2') },
      {
        text: 'Written back as a fraction, the power went from $-\\tfrac{1}{2}$ to $-\\tfrac{3}{2}$, further from zero — reducing a negative power by one always moves it further from zero, never closer.',
        tex: `\\frac{dy}{dx} = -\\frac{${a}}{2x\\sqrt{x}}`,
      },
    ];
  },
};

/* ---------- Chain rule on roots and reciprocals of a bracket ---------- */

interface ChainRootParams {
  form: 'root' | 'reciprocal';
  a: number;
  b: number;
  n: number;
}

/**
 * The chain rule applied to $\sqrt{ax+b}$ and $\frac{1}{(ax+b)^{n}}$ — the
 * same two shapes as `df-index-form`, but with a linear bracket in place of
 * plain $x$, so the chain rule's inner factor is now genuinely part of the
 * question rather than always being $1$.
 */
const chainRoot: Generator<ChainRootParams> = {
  id: 'df-chain-root',
  sample: (rng, difficulty) => {
    const form = rng.pick(['root', 'reciprocal'] as const);
    // `a` is never 1, so the chain factor is always visible: a distractor
    // that forgets it is then wrong at every draw, not just some.
    const a = rng.int(2, difficulty >= 2 ? 7 : 5);
    const b =
      form === 'root'
        ? rng.int(1, 9)
        : nonZero(rng.int(-9, 9), difficulty >= 2 ? -4 : 3);
    const n = difficulty >= 2 ? rng.pick([2, 3] as const) : 1;
    return { form, a, b, n };
  },
  choices: ({ form, a, b, n }) => {
    const linear = sumTex([termTex(a, 1), termTex(b, 0)]);
    const linearAnswer = sumAnswer([termAnswer(a, 1), termAnswer(b, 0)]);
    if (form === 'root') {
      // c/2, reduced to a whole number whenever c is even — an unreduced
      // \frac{2}{2} or \frac{4}{2} is a fraction that has not been simplified.
      const half = (c: number) => {
        if (c % 2 !== 0) return `\\frac{${c}}{2}`;
        const h = c / 2;
        return h === 1 ? '' : `${h}`;
      };
      return options(
        {
          tex: a % 2 === 0 ? `\\frac{${a / 2}}{\\sqrt{${linear}}}` : `\\frac{${a}}{2\\sqrt{${linear}}}`,
          answer: `((${a})/2) * (${linearAnswer})^(-1/2)`,
        },
        // Forgot the chain rule factor.
        { tex: `\\frac{1}{2\\sqrt{${linear}}}`, answer: `(1/2) * (${linearAnswer})^(-1/2)` },
        // Forgot the half.
        { tex: `\\frac{${a}}{\\sqrt{${linear}}}`, answer: `(${a}) * (${linearAnswer})^(-1/2)` },
        // Forgot to reduce the power.
        { tex: `${half(a)}\\sqrt{${linear}}`, answer: `((${a})/2) * (${linearAnswer})^(1/2)` },
      );
    }
    const bracket = (p: number) =>
      p === 1 ? `\\left(${linear}\\right)` : `\\left(${linear}\\right)^{${p}}`;
    return options(
      { tex: `-\\frac{${a * n}}{${bracket(n + 1)}}`, answer: `(${-a * n}) * (${linearAnswer})^(${-(n + 1)})` },
      // Sign dropped.
      { tex: `\\frac{${a * n}}{${bracket(n + 1)}}`, answer: `(${a * n}) * (${linearAnswer})^(${-(n + 1)})` },
      // Forgot the chain rule factor.
      { tex: `-\\frac{${n}}{${bracket(n + 1)}}`, answer: `(${-n}) * (${linearAnswer})^(${-(n + 1)})` },
      // The power was not increased by one.
      { tex: `-\\frac{${a * n}}{${bracket(n)}}`, answer: `(${-a * n}) * (${linearAnswer})^(${-n})` },
    );
  },
  render: ({ form, a, b, n }) => {
    const linear = sumTex([termTex(a, 1), termTex(b, 0)]);
    const linearAnswer = sumAnswer([termAnswer(a, 1), termAnswer(b, 0)]);
    if (form === 'root') {
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Differentiate with respect to $x$.' },
          { kind: 'display', tex: `y = \\sqrt{${linear}}` },
        ],
        lead: '\\frac{dy}{dx} =',
        keypad: ROOT_KEYS,
        answer: `((${a})/2) * (${linearAnswer})^(-1/2)`,
        source: `(${linearAnswer})^(1/2)`,
        domain: 'positive',
        mode: 'exact',
      };
    }
    const bracket = (p: number) =>
      p === 1 ? `\\left(${linear}\\right)` : `\\left(${linear}\\right)^{${p}}`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = \\frac{1}{${n === 1 ? linear : bracket(n)}}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: ALGEBRA_KEYS,
      answer: `(${-a * n}) * (${linearAnswer})^(${-(n + 1)})`,
      source: `(${linearAnswer})^(${-n})`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ form, a, b, n }) => {
    const linear = sumTex([termTex(a, 1), termTex(b, 0)]);
    if (form === 'root') {
      return [
        {
          text: 'A root of a bracket is that bracket raised to the power $\\tfrac{1}{2}$.',
          tex: `\\sqrt{${linear}} = \\left(${linear}\\right)^{1/2}`,
        },
        {
          text: 'Differentiate the outside as usual, then multiply by the derivative of the inside.',
          tex: `\\tfrac{1}{2}\\left(${linear}\\right)^{-1/2} \\times \\frac{du}{dx}, \\quad u = ${linear}, \\; \\frac{du}{dx} = ${a}`,
        },
        {
          text: `The $\\tfrac{1}{2}$ is the outer derivative; the $${a}$ is the chain rule factor from the bracket. Both must appear.`,
          tex: `\\tfrac{1}{2} \\times ${a} = ${a % 2 === 0 ? a / 2 : `\\tfrac{${a}}{2}`}`,
        },
        {
          text: 'So the derivative is:',
          tex: `\\frac{dy}{dx} = ${a % 2 === 0 ? `\\frac{${a / 2}}{\\sqrt{${linear}}}` : `\\frac{${a}}{2\\sqrt{${linear}}}`}`,
        },
      ];
    }
    return [
      {
        text:
          n === 1
            ? 'A reciprocal is that bracket to the power $-1$.'
            : `A reciprocal of a bracket to the power $${n}$ is that bracket to the power $${-n}$.`,
        tex: `\\frac{1}{${n === 1 ? linear : `\\left(${linear}\\right)^{${n}}`}} = \\left(${linear}\\right)^{${-n}}`,
      },
      {
        text: 'Differentiate the outside as usual, then multiply by the derivative of the inside.',
        tex: `${n === 1 ? '-' : -n}\\left(${linear}\\right)^{${-n - 1}} \\times \\frac{du}{dx}, \\quad u = ${linear}, \\; \\frac{du}{dx} = ${a}`,
      },
      {
        text: `Collect the two multipliers: the power $${-n}$ times the chain rule factor $${a}$.`,
        tex: `${-n} \\times ${a} = ${-a * n}`,
      },
      {
        text: 'So the derivative is:',
        tex: `\\frac{dy}{dx} = -\\frac{${a * n}}{\\left(${linear}\\right)^{${n + 1}}}`,
      },
    ];
  },
};

/* ---------- Product rule with a chain-ruled trig or exponential factor ---------- */

interface ProductMixedParams {
  fn: 'sin' | 'cos' | 'exp';
  a: number;
  n: number;
  k: number;
}

/** A coefficient in front of a function-call factor, eliding $1$ and $-1$. */
function coeffFactorTex(coefficient: number, power: number, factorTex: string): string {
  if (power !== 0) return `${termTex(coefficient, power)}${factorTex}`;
  return `${coefficient === 1 ? '' : coefficient === -1 ? '-' : coefficient}${factorTex}`;
}

/**
 * The product rule where one factor is a power of $x$ and the other needs the
 * chain rule of its own — $ax^{n} \sin(kx)$, $\cos(kx)$ or $e^{kx}$. Every
 * other product-rule question in this course multiplies two polynomials;
 * this is the shape that shows up once the chain rule and the product rule
 * have both been taught, and it needs both at once.
 */
const productMixed: Generator<ProductMixedParams> = {
  id: 'df-product-mixed',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos', 'exp'] as const);
    if (difficulty >= 2) {
      return { fn, a: rng.int(2, 5), n: rng.int(2, 4), k: rng.int(2, 6) };
    }
    return { fn, a: 1, n: rng.int(1, 3), k: rng.int(2, 5) };
  },
  choices: ({ fn, a, n, k }) => {
    const kx = termTex(k, 1);
    const inner = `(${k}) * x`;
    const factorTex = fn === 'exp' ? `e^{${kx}}` : `\\${fn}\\left(${kx}\\right)`;
    const derivFn = fn === 'sin' ? 'cos' : fn === 'cos' ? 'sin' : 'exp';
    const otherFactorTex = fn === 'exp' ? `e^{${kx}}` : `\\${derivFn}\\left(${kx}\\right)`;
    const s = fn === 'cos' ? -1 : 1;
    const fAnswer = fn === 'exp' ? `e^(${inner})` : `${fn}(${inner})`;
    const fdAnswer = fn === 'exp' ? `e^(${inner})` : `${derivFn}(${inner})`;

    const pair = (c1: number, c2: number) => ({
      tex: sumTex([coeffFactorTex(c1, n - 1, factorTex), coeffFactorTex(c2, n, otherFactorTex)]),
      answer: sumAnswer([`${termAnswer(c1, n - 1)} * ${fAnswer}`, `${termAnswer(c2, n)} * ${fdAnswer}`]),
    });

    return options(
      pair(a * n, s * a * k),
      // The product of the two derivatives, as a single term rather than a sum.
      {
        tex: coeffFactorTex(s * a * n * k, n - 1, otherFactorTex),
        answer: `${termAnswer(s * a * n * k, n - 1)} * ${fdAnswer}`,
      },
      // Forgot the chain rule factor k on the second term.
      pair(a * n, s * a),
      // Sign slip on the second term.
      pair(a * n, -s * a * k),
    );
  },
  render: ({ fn, a, n, k }) => {
    const kx = termTex(k, 1);
    const inner = `(${k}) * x`;
    const factorTex = fn === 'exp' ? `e^{${kx}}` : `\\${fn}\\left(${kx}\\right)`;
    const derivFn = fn === 'sin' ? 'cos' : fn === 'cos' ? 'sin' : 'exp';
    const s = fn === 'cos' ? -1 : 1;
    const fAnswer = fn === 'exp' ? `e^(${inner})` : `${fn}(${inner})`;
    const fdAnswer = fn === 'exp' ? `e^(${inner})` : `${derivFn}(${inner})`;

    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate with respect to $x$.' },
        { kind: 'display', tex: `y = ${termTex(a, n)}${factorTex}` },
      ],
      lead: '\\frac{dy}{dx} =',
      keypad: fn === 'exp' ? EXP_KEYS : TRIG_KEYS,
      answer: sumAnswer([`${termAnswer(a * n, n - 1)} * ${fAnswer}`, `${termAnswer(s * a * k, n)} * ${fdAnswer}`]),
      // The solution's own last step, for the exponential case only: both
      // terms share the exponential, so the answer factorises and the
      // teach slide for df-l4-combine promises "either form is accepted".
      // Absent (not undefined) on a trig draw — the prose and the solution's
      // promise are the exponential case, and a trig "factorised form" only
      // shares x^{n-1}, so none is invented here.
      ...(fn === 'exp'
        ? { alsoAccepts: [`(${a}) * x^(${n - 1}) * e^((${k})*x) * ((${n}) + (${k})*x)`] }
        : {}),
      source: `${termAnswer(a, n)} * ${fAnswer}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ fn, a, n, k }) => {
    const kx = termTex(k, 1);
    const factorTex = fn === 'exp' ? `e^{${kx}}` : `\\${fn}\\left(${kx}\\right)`;
    const derivFn = fn === 'sin' ? 'cos' : fn === 'cos' ? 'sin' : 'exp';
    const otherFactorTex = fn === 'exp' ? `e^{${kx}}` : `\\${derivFn}\\left(${kx}\\right)`;
    const s = fn === 'cos' ? -1 : 1;
    const uTex = termTex(a, n);
    const uPrimeTex = termTex(a * n, n - 1);
    const vPrimeTex = coeffFactorTex(s * k, 0, otherFactorTex);

    const steps: SolutionStep[] = [
      {
        text: 'Two factors are multiplied together, so this needs the product rule.',
        tex: "\\frac{d}{dx}(uv) = u'v + uv'",
      },
      {
        text: "The second factor is not just $x$, so its own derivative needs the chain rule too — that is where the chain rule factor already sits, inside $v'$.",
        tex: `u = ${uTex}, \\quad v = ${factorTex}, \\quad u' = ${uPrimeTex}, \\quad v' = ${vPrimeTex}`,
      },
      {
        text: 'Substitute into the rule.',
        tex: `\\frac{dy}{dx} = ${coeffFactorTex(a * n, n - 1, factorTex)} + ${uTex}\\left(${vPrimeTex}\\right)`,
      },
      {
        text: 'Collecting the two terms gives:',
        tex: `\\frac{dy}{dx} = ${sumTex([coeffFactorTex(a * n, n - 1, factorTex), coeffFactorTex(s * a * k, n, otherFactorTex)])}`,
      },
    ];

    if (fn === 'exp') {
      steps.push({
        text: 'Both terms share the same exponential, so the answer factorises — either form is accepted.',
        tex: `\\frac{dy}{dx} = ${coeffFactorTex(a, n - 1, `e^{${kx}}\\left(${n} + ${kx}\\right)`)}`,
      });
    } else if (fn === 'cos') {
      steps.push({
        text: 'The minus sign lands on the second term, where cosine differentiated into sine.',
      });
    } else {
      steps.push({
        text: 'Sine differentiated into cosine on the second term, with no sign change to track.',
      });
    }

    return steps;
  },
};

/* ---------- The tangent to a curve at a point ---------- */

interface TangentParams {
  a: number;
  b: number;
  c: number;
  at: number;
}

/**
 * The equation of the tangent to $y = ax^{2} + bx + c$ at $x = at$: the
 * derivative supplies the gradient, the curve itself supplies the point, and
 * the two are assembled with point-gradient form. Unlike every other
 * generator in this course, the answer here is not a derivative of anything
 * — it is a line built *from* one — so this generator declares no `source`
 * and the oracle test correctly has nothing to check.
 */
const tangentLine: Generator<TangentParams> = {
  id: 'df-tangent-line',
  sample: (rng, difficulty) => {
    // A horizontal tangent (m = 0) makes the "forgot to shift" distractor
    // equal to the correct answer, so it is excluded rather than sampled.
    for (;;) {
      const a = difficulty >= 2 ? nonZero(rng.int(-3, 3), 2) : 1;
      const b = difficulty >= 2 ? rng.int(-6, 6) : rng.int(-4, 4);
      const c = difficulty >= 2 ? rng.int(-9, 9) : rng.int(-5, 5);
      const at = difficulty >= 2 ? nonZero(rng.int(-4, 4), -2) : nonZero(rng.int(-3, 3), 2);
      if (2 * a * at + b !== 0) return { a, b, c, at };
    }
  },
  choices: ({ a, b, c, at }) => {
    const m = 2 * a * at + b;
    const height = a * at * at + b * at + c;
    const k = height - m * at;
    const pair = (gradient: number, intercept: number) => ({
      tex: lineTex(gradient, intercept),
      answer: sumAnswer([termAnswer(gradient, 1), termAnswer(intercept, 0)]),
    });
    // Candidates that happen to land on the correct (gradient, intercept)
    // pair for this draw are dropped rather than offered as if wrong.
    const candidates = [
      // The right gradient, but never shifted onto the point — the
      // constant term is left as the curve's height rather than reduced.
      [m, height],
      // Substituted the point into the curve before differentiating,
      // which gives a constant and so a gradient of 0.
      [0, height],
      // Used the height as if it were the gradient.
      [height, height - height * at],
    ].filter(([g, i]) => !(g === m && i === k));
    return options(pair(m, k), ...candidates.map(([g, i]) => pair(g, i)));
  },
  render: ({ a, b, c, at }) => {
    const m = 2 * a * at + b;
    const height = a * at * at + b * at + c;
    const k = height - m * at;
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `Find the equation of the tangent to the curve at $x = ${at}$. Give the answer as an expression in $x$.`,
        },
        { kind: 'display', tex: `y = ${sumTex([termTex(a, 2), termTex(b, 1), termTex(c, 0)])}` },
      ],
      lead: 'y =',
      keypad: ALGEBRA_KEYS,
      answer: sumAnswer([termAnswer(m, 1), termAnswer(k, 0)]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: ({ a, b, c, at }) => {
    const m = 2 * a * at + b;
    const height = a * at * at + b * at + c;
    const k = height - m * at;
    const derivative = sumTex([termTex(2 * a, 1), termTex(b, 0)]);
    return [
      {
        text: 'Differentiate first, to get the gradient function.',
        tex: `f'(x) = ${derivative}`,
      },
      {
        text: `Substitute $x = ${at}$ into the gradient function to find the gradient at that point.`,
        tex: `m = f'(${at}) = ${m}`,
      },
      {
        text: `Substitute $x = ${at}$ into the original curve to find the point it touches.`,
        tex: `f(${at}) = ${height}`,
      },
      {
        text: 'A tangent is a straight line through that point with that gradient. Start from point-gradient form and rearrange.',
        tex: `y - ${height} = ${m}\\left(x - ${at}\\right)`,
      },
      {
        text: `The order matters the same way it always has: substituting into the curve before differentiating would give a constant, whose gradient is $0$ rather than the $${m}$ found above.`,
        tex: `y = ${lineTex(m, k)}`,
      },
    ];
  },
};

export const differentiationGenerators = [
  powerRule,
  sumRule,
  productRule,
  quotientRule,
  chainRule,
  trigDerivative,
  expLogDerivative,
  evaluateDerivative,
  evaluateSteps,
  chooseRule,
  indexForm,
  chainRoot,
  productMixed,
  tangentLine,
];
