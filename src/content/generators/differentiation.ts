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
import type { ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
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
import { bin, num, pow, valueOf, type Expr } from '../expr';
import { markerWindow, plotSvg } from '../figures';

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

/* ======================================================================
 * Level 5: stationary points and the second derivative
 *
 * Everything below asks about the *shape* of a curve through its
 * derivatives: where it is flat, which way it is going, which way it bends.
 * Most of these answers are a number, a position or a verdict rather than a
 * derivative, so the `source` oracle in `generators.test.ts` only reaches the
 * one generator that answers with a derivative (`df-second-derivative`).
 * `stationaryPoints.test.ts` covers the rest: it differentiates each question's
 * function with mathjs and checks every claimed position, value and verdict
 * against it, so a generator that disagrees with calculus fails there rather
 * than in front of a learner.
 * ====================================================================== */

/**
 * A cubic whose stationary points sit on whole numbers.
 *
 * Built from its derivative rather than from its coefficients. Choosing
 * f'(x) = 3m(x - p)(x - q) and integrating gives
 * f(x) = mx^3 - (3m(p + q)/2)x^2 + 3mpq x + d, whose coefficients are whole
 * whenever m(p + q) is even. Sampling whole coefficients first almost never
 * lands a turning point on an integer, and a question whose answer is
 * x = 1.1547 is a calculator exercise rather than calculus.
 *
 * `p < q` always, so for m > 0 the left-hand turning point is the maximum.
 */
export interface Cubic {
  m: number;
  p: number;
  q: number;
  d: number;
}

export function cubicCoefficients({ m, p, q, d }: Cubic): [number, number, number, number] {
  return [m, (-3 * m * (p + q)) / 2, 3 * m * p * q, d];
}

export function cubicAt(cubic: Cubic, x: number): number {
  const [a, b, c, d] = cubicCoefficients(cubic);
  return a * x ** 3 + b * x ** 2 + c * x + d;
}

/** f''(x) = 6ax + 2b. */
function cubicSecondAt(cubic: Cubic, x: number): number {
  const [a, b] = cubicCoefficients(cubic);
  return 6 * a * x + 2 * b;
}

function cubicTex(cubic: Cubic): string {
  const [a, b, c, d] = cubicCoefficients(cubic);
  return sumTex([termTex(a, 3), termTex(b, 2), termTex(c, 1), termTex(d, 0)]);
}

/** The cubic in mathjs syntax, for the independent check. Never displayed. */
export function cubicSource(cubic: Cubic): string {
  const [a, b, c, d] = cubicCoefficients(cubic);
  return sumAnswer([termAnswer(a, 3), termAnswer(b, 2), termAnswer(c, 1), termAnswer(d, 0)]);
}

function cubicDerivativeTex(cubic: Cubic): string {
  const [a, b, c] = cubicCoefficients(cubic);
  return sumTex([termTex(3 * a, 2), termTex(2 * b, 1), termTex(c, 0)]);
}

function cubicSecondTex(cubic: Cubic): string {
  const [a, b] = cubicCoefficients(cubic);
  return lineTex(6 * a, 2 * b);
}

/** A coefficient written in front of a bracket: 1 and -1 are implied. */
function leadingTex(k: number): string {
  return k === 1 ? '' : k === -1 ? '-' : `${k}`;
}

/** The factor whose root is r: `(x - 2)`, `(x + 3)`, or plain `x`. */
function rootFactorTex(r: number): string {
  if (r === 0) return 'x';
  return r > 0 ? `(x - ${r})` : `(x + ${-r})`;
}

/** That factor raised to a power, with the bracket kept wherever it is needed. */
function rootPowerTex(r: number, n: number): string {
  if (n === 1) return rootFactorTex(r);
  return r === 0 ? `x^{${n}}` : `${rootFactorTex(r)}^{${n}}`;
}

/**
 * k(x - r)^i (x - t)^j as it would be written by hand.
 *
 * A bare `x` factor goes first, since `(x - 3)x` reads as a mistake.
 */
function factoredTex(k: number, factors: [number, number][]): string {
  const ordered = [...factors].sort((f, g) => (f[0] === 0 ? -1 : g[0] === 0 ? 1 : 0));
  return `${leadingTex(k)}${ordered.map(([r, n]) => rootPowerTex(r, n)).join('')}`;
}

/** The same product in mathjs syntax. */
function factoredAnswer(k: number, factors: [number, number][]): string {
  return [`(${k})`, ...factors.map(([r, n]) => `(x - (${r}))^(${n})`)].join(' * ');
}

/** The derivative of a sampled cubic, factorised: 3m(x - p)(x - q). */
function cubicFactoredTex({ m, p, q }: Cubic): string {
  return factoredTex(3 * m, [
    [p, 1],
    [q, 1],
  ]);
}

/** A trailing constant, signed: `+ 4`, `- 3`, or nothing at all. */
function constantTex(d: number): string {
  if (d === 0) return '';
  return d > 0 ? ` + ${d}` : ` - ${-d}`;
}

/**
 * A cubic with whole-number stationary points, at a size worth doing by hand.
 *
 * Difficulty 1 keeps m positive, so the maximum is always the left turning
 * point; difficulty 2 lets the curve turn upside down. `evenSum` asks for a
 * whole-number point of inflection too, which sits midway between the two.
 */
function sampleCubic(
  rng: Rng,
  difficulty: number,
  opts: { evenSum?: boolean; minGap?: number } = {},
): Cubic {
  const hard = difficulty >= 2;
  const span = hard ? 4 : 3;
  const minGap = opts.minGap ?? 1;
  for (;;) {
    const p = rng.int(-span, span);
    const q = rng.int(-span, span);
    if (q - p < minGap) continue;
    const odd = (p + q) % 2 !== 0;
    if (odd && opts.evenSum) continue;
    const size = odd ? 2 : rng.pick(hard ? [1, 1, 2] : [1]);
    // m = 2 with a turning point out at 4 sends the curve past two hundred,
    // which is arithmetic for its own sake rather than calculus.
    if (size === 2 && Math.max(Math.abs(p), Math.abs(q)) > 3) continue;
    return {
      m: hard ? size * rng.sign() : size,
      p,
      q,
      d: hard ? rng.int(-9, 9) : rng.int(-5, 5),
    };
  }
}

/**
 * Whole-number tiles: the answer's values, then distractors, topped up with
 * near misses so there is always something wrong left to place.
 *
 * Sorted numerically rather than shuffled, for the same reason every bank in
 * this course is: `render` has no rng, and a bank that moved between draws of
 * one question would defeat the deck de-duplicator.
 */
function numberTiles(answer: number[], distractors: number[], spare = 3): string[] {
  const needed = new Set(answer);
  const extras: number[] = [];
  const add = (value: number) => {
    if (!Number.isInteger(value) || needed.has(value) || extras.includes(value)) return;
    extras.push(value);
  };
  for (const value of distractors) {
    if (extras.length >= spare) break;
    add(value);
  }
  for (let step = 1; extras.length < spare; step += 1) {
    for (const value of answer) {
      add(value + step);
      add(value - step);
    }
  }
  return [...answer, ...extras].sort((x, y) => x - y).map(String);
}

/** Four whole-number options: the answer, the slips given, then near misses. */
function numberOptions(correct: number, wrong: number[]): ChoiceOption[] {
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
}

/** Which of a cubic's two stationary points a question is about. */
export interface CubicPoint {
  cubic: Cubic;
  /** The turning point at p when true, the one at q otherwise. */
  left: boolean;
}

export const pointOf = ({ cubic, left }: CubicPoint): number => (left ? cubic.p : cubic.q);

/** The other turning point, which a stationary-point question never asks about. */
const otherOf = ({ cubic, left }: CubicPoint): number => (left ? cubic.q : cubic.p);

/* ---------- Finding the stationary points ---------- */

/**
 * Where a cubic is flat, placed as two tiles.
 *
 * Unordered, because the two answers of `f'(x) = 0` have no order to them. The
 * bank carries both roots with their signs flipped — reading the root of
 * $(x + 3)$ as $3$ is the slip that turns a correct factorisation into two
 * wrong answers — alongside their sum and product, which are what a learner
 * reaches for when they half-remember a quadratic's roots.
 */
const stationaryRoots: Generator<Cubic> = {
  id: 'df-sp-roots',
  sample: (rng, difficulty) => sampleCubic(rng, difficulty),
  render: (cubic): Slide => ({
    kind: 'tiles',
    prompt: [
      {
        kind: 'prose',
        text: 'Find where this curve is flat: differentiate, set the derivative equal to zero, and place both values of $x$.',
      },
      { kind: 'display', tex: `y = ${cubicTex(cubic)}` },
    ],
    template: 'x = {0} \\quad \\text{and} \\quad x = {1}',
    bank: numberTiles([cubic.p, cubic.q], [-cubic.p, -cubic.q, cubic.p + cubic.q, cubic.p * cubic.q]),
    answer: [`${cubic.p}`, `${cubic.q}`],
    unordered: true,
  }),
  solution: (cubic) => {
    const { m, p, q } = cubic;
    const steps: SolutionStep[] = [
      {
        text: 'A stationary point is where the gradient is zero, so differentiate first.',
        tex: `\\frac{dy}{dx} = ${cubicDerivativeTex(cubic)}`,
      },
      {
        text: `Set that equal to zero. Every term shares a factor of $${3 * m}$, and what is left factorises.`,
        tex: `${cubicFactoredTex(cubic)} = 0`,
      },
      {
        text: 'A product is zero only when one of its factors is, which gives both answers at once.',
        tex: `x = ${p} \\quad \\text{or} \\quad x = ${q}`,
      },
    ];
    if (p !== 0 && q !== 0 && p !== -q) {
      steps.push({
        text: `The root of $${rootFactorTex(p)}$ is the number that makes it zero, which is $${p}$ and not $${-p}$. Reading the sign straight off the bracket is how $${-p}$ and $${-q}$ end up in an answer.`,
      });
    }
    return steps;
  },
};

/** f(s) as an expression tree, with each term's sign carried by the operator in front of it. */
function substitutedCubic(cubic: Cubic, s: number): Expr {
  const [a, b, c, d] = cubicCoefficients(cubic);
  const scaled = (coefficient: number, inner: Expr): Expr =>
    Math.abs(coefficient) === 1 ? inner : bin('*', num(Math.abs(coefficient)), inner);

  let expr: Expr =
    a < 0 ? bin('*', num(a), pow(num(s), num(3))) : scaled(a, pow(num(s), num(3)));
  const rest: [number, Expr | undefined][] = [
    [b, pow(num(s), num(2))],
    [c, num(s)],
    [d, undefined],
  ];
  for (const [coefficient, inner] of rest) {
    if (coefficient === 0) continue;
    const term = inner === undefined ? num(Math.abs(coefficient)) : scaled(coefficient, inner);
    expr = bin(coefficient < 0 ? '-' : '+', expr, term);
  }
  return expr;
}

/**
 * A bank for every piece of a substitution, built from the slips that piece
 * invites: a power taken as a product, a negative lost in the square, the
 * wrong one of adding and subtracting.
 */
function substitutionBanks(expr: Expr, path = 'r', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (expr.kind === 'num') return out;
  const value = valueOf(expr);
  const sorted = (bank: string[]) => bank.map(Number).sort((x, y) => x - y).map(String);
  if (expr.kind === 'power') {
    const base = valueOf(expr.base);
    const exponent = valueOf(expr.exponent);
    out[path] = sorted(bank4(value, -value, base * exponent, base ** (exponent - 1)));
    substitutionBanks(expr.base, `${path}.b`, out);
    substitutionBanks(expr.exponent, `${path}.e`, out);
    return out;
  }
  if (expr.kind === 'binary') {
    const left = valueOf(expr.left);
    const right = valueOf(expr.right);
    const slips =
      expr.op === '*'
        ? [-value, left + right, left * Math.abs(right)]
        : expr.op === '+'
          ? [left - right, right - left, value + 2 * left]
          : [left + right, right - left, -value];
    out[path] = sorted(bank4(value, ...slips));
    substitutionBanks(expr.left, `${path}.l`, out);
    substitutionBanks(expr.right, `${path}.r`, out);
  }
  return out;
}

/**
 * The y-coordinate of a stationary point, worked one piece at a time.
 *
 * The step after finding x, and the one that most often goes to the wrong
 * function: $x$ came from $f'(x) = 0$, so it is tempting to substitute back
 * into $f'$ — which gives $0$ every time, since that is how the point was
 * found. The prompt shows $f$ alone. The `evaluate` form offers $0$ among its
 * options for exactly that reason, next to the two sign slips a negative $x$
 * invites.
 */
const stationaryY: Generator<CubicPoint> = {
  id: 'df-sp-y',
  sample: (rng, difficulty) => ({ cubic: sampleCubic(rng, difficulty), left: rng.chance(0.5) }),
  choices: (params) => {
    const { cubic } = params;
    const s = pointOf(params);
    const [a, b] = cubicCoefficients(cubic);
    const y = cubicAt(cubic, s);
    return numberOptions(y, [y - 2 * a * s ** 3, y - 2 * b * s ** 2, y - cubic.d, 0]);
  },
  render: (params): Slide => {
    const { cubic } = params;
    const s = pointOf(params);
    const expr = substitutedCubic(cubic, s);
    return {
      kind: 'reduce',
      prompt: [
        {
          kind: 'prose',
          text: `This curve is flat at $x = ${s}$. Its $y$-coordinate comes from the curve itself, so substitute into $f(x)$. Tap the part you would do **next**, then choose what it comes to.`,
        },
        { kind: 'display', tex: `f(x) = ${cubicTex(cubic)}` },
      ],
      expr,
      banks: substitutionBanks(expr),
    };
  },
  solution: (params) => {
    const { cubic } = params;
    const s = pointOf(params);
    const [a, b, c, d] = cubicCoefficients(cubic);
    const y = cubicAt(cubic, s);
    const at = `\\left(${s}\\right)`;
    // One term per line: the whole substitution on one line runs off the side
    // of a phone, and so does even a pair of terms.
    const terms = [
      `${leadingTex(a)}${at}^{3} = ${a * s ** 3}`,
      b === 0 ? '' : `${leadingTex(b)}${at}^{2} = ${b * s ** 2}`,
      c === 0 ? '' : `${leadingTex(c)}${at} = ${c * s}`,
    ].filter((term) => term !== '');
    const worked = sumTex([`${a * s ** 3}`, `${b * s ** 2}`, `${c * s}`, `${d}`]);
    return [
      {
        text: `The $x$-coordinate came from $f'(x) = 0$. The $y$-coordinate is the height of the curve there, so it comes from $f$ itself. Powers first, then each multiplication:`,
        tex: terms[0],
      },
      ...terms.slice(1).map((tex) => ({ tex })),
      {
        text: `Then the additions, from left to right: $${worked === '' ? '0' : worked}$.`,
        tex: `f(${s}) = ${y}`,
      },
      {
        text: 'So the stationary point is:',
        tex: `\\left(${s}, ${y}\\right)`,
      },
      {
        text: `Substituting into $f'(x)$ instead would give $0$ — which is only a check that $x = ${s}$ really is stationary, not its height.`,
      },
    ];
  },
};

export interface SymmetricParams {
  /** f(x) = mx^3 - 3mr^2 x + d, flat at x = r and x = -r. */
  m: number;
  r: number;
  d: number;
  /** The point at -r when true. */
  left: boolean;
}

/**
 * The same substitution, as the tree the arithmetic really is.
 *
 * The cubic has no $x^{2}$ term, so its stationary points are $\pm r$ and the
 * substitution is two products and a sum: small enough to fit one row of two
 * on a phone. m is never 1, or the cube and the cubed term would be the same
 * number in two boxes.
 */
const stationaryYTree: Generator<SymmetricParams> = {
  id: 'df-sp-y-tree',
  sample: (rng, difficulty) => ({
    m: difficulty >= 2 ? rng.pick([-3, -2, 2, 3]) : rng.pick([2, 3]),
    r: rng.int(1, 3),
    d: difficulty >= 2 ? rng.int(-9, 9) : rng.int(-5, 5),
    left: rng.chance(0.5),
  }),
  render: ({ m, r, d, left }): Slide => {
    const s = left ? -r : r;
    const c = -3 * m * r * r;
    const cube = s ** 3;
    const cubeTerm = m * cube;
    const linear = Math.abs(c) * s;
    const total = cubeTerm + Math.sign(c) * linear + d;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `This curve is flat at $x = ${s}$. Fill the tree to find its height there, $f(${s})$: the top row is what can be done straight away.`,
        },
        { kind: 'display', tex: `f(x) = ${sumTex([termTex(m, 3), termTex(c, 1), termTex(d, 0)])}` },
      ],
      // No `f(s) =` in front: on a phone the line then runs out of room
      // before its last term.
      expression: `${m} \\times ${bracketedNumber(s)}^{3} ${c < 0 ? '-' : '+'} ${Math.abs(c)} \\times ${bracketedNumber(s)}${constantTex(d)}`,
      nodes: [
        { id: 'cube', from: [] },
        { id: 'linear', from: [] },
        { id: 'cubeTerm', from: ['cube'] },
        { id: 'total', from: ['cubeTerm', 'linear'] },
      ],
      bank: numberTiles(
        [cube, linear, cubeTerm, total],
        [3 * s, -cube, cubeTerm - Math.sign(c) * linear + d, total - d, 0],
      ),
      answer: [cube, linear, cubeTerm, total].map(String),
    };
  },
  solution: ({ m, r, d, left }) => {
    const s = left ? -r : r;
    const c = -3 * m * r * r;
    const cubeTerm = m * s ** 3;
    const linearTerm = c * s;
    return [
      {
        text: 'The derivative has no $x$ term, so it factorises as a difference of two squares, and the curve is flat at a matching pair of points.',
        tex: `f'(x) = ${sumTex([termTex(3 * m, 2), termTex(c, 0)])}`,
      },
      {
        tex: `= ${factoredTex(3 * m, [
          [-r, 1],
          [r, 1],
        ])}`,
      },
      {
        text: `Cube $${s}$ before multiplying by $${m}$: $${bracketedNumber(s)}^{3} = ${s ** 3}$${s < 0 ? ', and the cube of a negative stays negative' : ''}.`,
        tex: `${m} \\times ${s ** 3} = ${cubeTerm}`,
      },
      {
        text: `The other product is $${Math.abs(c)} \\times ${bracketedNumber(s)} = ${Math.abs(c) * s}$, taken ${c < 0 ? 'away' : 'added on'} in the last box along with the constant: $${cubeTerm} ${linearTerm < 0 ? '-' : '+'} ${Math.abs(linearTerm)}${constantTex(d)}$.`,
        tex: `f(${s}) = ${cubeTerm + linearTerm + d}`,
      },
    ];
  },
};

/** A number as it reads inside a product: negatives get brackets. */
function bracketedNumber(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

export interface SliderPointParams {
  cubic: Cubic;
  want: 'max' | 'min';
}

/** Where a cubic's local maximum or minimum is. For m > 0 the maximum is on the left. */
export const extremumOf = ({ cubic, want }: SliderPointParams): number =>
  (want === 'max') === (cubic.m > 0) ? cubic.p : cubic.q;

/**
 * A cubic's turning point, found and then dragged to.
 *
 * The figure is the point of the widget: a cubic has two flat places and the
 * question names one, so the learner has to know which hump is the maximum as
 * well as where the flat places are. The answer is never 0, since an untouched
 * slider already rests there.
 */
const stationarySliderCubic: Generator<SliderPointParams> = {
  id: 'df-sp-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = { cubic: sampleCubic(rng, difficulty), want: rng.pick(['max', 'min'] as const) };
      if (extremumOf(params) !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { cubic, want } = params;
    const heights = [cubicAt(cubic, cubic.p), cubicAt(cubic, cubic.q)];
    const low = Math.min(...heights);
    const high = Math.max(...heights);
    const pad = (high - low) * 0.45 + 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            want === 'max'
              ? 'Find the **local maximum** of this curve, the top of its hump, and slide to its $x$-coordinate.'
              : 'Find the **local minimum** of this curve, the bottom of its dip, and slide to its $x$-coordinate.',
        },
        { kind: 'display', tex: `y = ${cubicTex(cubic)}` },
      ],
      min: -5,
      max: 5,
      step: 1,
      answer: extremumOf(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -5,
          xMax: 5,
          yMin: low - pad,
          yMax: high + pad,
          curves: [{ f: (x) => cubicAt(cubic, x) }],
          label: 'A cubic curve with two turning points',
        }),
        ...markerWindow(-5, 5),
      },
    };
  },
  solution: (params) => {
    const { cubic, want } = params;
    const x = extremumOf(params);
    const other = x === cubic.p ? cubic.q : cubic.p;
    const second = cubicSecondAt(cubic, x);
    return [
      {
        text: 'Differentiate and set the derivative to zero to find both flat places.',
        tex: `${cubicFactoredTex(cubic)} = 0`,
      },
      { tex: `x = ${cubic.p}, \\quad x = ${cubic.q}` },
      {
        text: `The second derivative says which is which: $f''(x) = ${cubicSecondTex(cubic)}$.`,
        tex: `f''(${x}) = ${second}`,
      },
      {
        text:
          want === 'max'
            ? `Negative, so the curve bends downwards at $x = ${x}$: that is the top of the hump. The other flat place, $x = ${other}$, is the bottom of the dip.`
            : `Positive, so the curve bends upwards at $x = ${x}$: that is the bottom of the dip. The other flat place, $x = ${other}$, is the top of the hump.`,
      },
    ];
  },
};

export interface CountParams {
  a: number;
  b: number;
  c: number;
  d: number;
  count: 0 | 1 | 2;
}

/**
 * How many stationary points a cubic has, without finding them.
 *
 * The derivative of a cubic is a quadratic, so the count is its discriminant's
 * sign. Three is offered because a cubic can have three *roots*, and mixing up
 * where a curve crosses the axis with where it is flat is the confusion this
 * question exists to catch.
 */
const stationaryCount: Generator<CountParams> = {
  id: 'df-sp-count',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const count = rng.pick([0, 1, 2] as const);
    const d = hard ? rng.int(-9, 9) : rng.int(-5, 5);
    if (count === 2) {
      const [a, b, c] = cubicCoefficients(sampleCubic(rng, difficulty));
      return { a, b, c, d, count };
    }
    if (count === 1) {
      // f'(x) = 3a(x - r)^2: a repeated root, flat once.
      const a = hard ? rng.pick([1, 2, -1, -2]) : rng.pick([1, 2]);
      const r = rng.int(-3, 3);
      return { a, b: -3 * a * r, c: 3 * a * r * r, d, count };
    }
    for (;;) {
      const a = hard ? rng.pick([1, 2, 3, -1, -2]) : rng.pick([1, 2]);
      const b = rng.int(-4, 4);
      const c = rng.int(1, 12) * Math.sign(a);
      if (b * b < 3 * a * c) return { a, b, c, d, count: 0 as const };
    }
  },
  render: ({ a, b, c, d, count }): Slide => ({
    kind: 'choice',
    prompt: [
      { kind: 'prose', text: 'How many stationary points does this curve have?' },
      { kind: 'display', tex: `y = ${sumTex([termTex(a, 3), termTex(b, 2), termTex(c, 1), termTex(d, 0)])}` },
    ],
    options: [0, 1, 2, 3].map((n) => ({ id: `n${n}`, label: `${n}` })),
    correctId: `n${count}`,
  }),
  solution: ({ a, b, c, count }) => {
    const discriminant = 4 * b * b - 12 * a * c;
    return [
      {
        text: 'The curve is flat wherever its derivative is zero, and the derivative of a cubic is a quadratic.',
        tex: `\\frac{dy}{dx} = ${sumTex([termTex(3 * a, 2), termTex(2 * b, 1), termTex(c, 0)])}`,
      },
      {
        text: `Its discriminant counts how many times that quadratic is zero: $\\left(${2 * b}\\right)^{2} - 4 \\times ${bracketedNumber(3 * a)} \\times ${bracketedNumber(c)}$.`,
        tex: `b^{2} - 4ac = ${discriminant}`,
      },
      {
        text:
          count === 2
            ? 'Positive, so the gradient is zero twice: two stationary points.'
            : count === 1
              ? 'Zero, so the gradient touches zero once without crossing it: one stationary point.'
              : 'Negative, so the gradient is never zero: no stationary points at all, and the curve runs one way throughout.',
      },
      {
        text: 'Three is never the answer. A cubic can cross the $x$-axis three times, but its derivative is a quadratic and can be zero at most twice.',
      },
    ];
  },
};

/* ---------- The second derivative ---------- */

export interface SecondParams {
  form: 'cubic' | 'quartic' | 'exp' | 'sin' | 'cos' | 'recip';
  a: number;
  b: number;
  c: number;
  e: number;
  /** Coefficient of the exponential, trig or reciprocal term. */
  A: number;
  /** Inner multiplier of the exponential or trig term. */
  k: number;
}

/** A multiplier in front of a function: `3\sin(2x)`, `-\sin(2x)`. */
function scaledTex(coefficient: number, body: string): string {
  return `${leadingTex(coefficient)}${body}`;
}

/** f, f' and f'' in both audiences, worked out once so the prompt, the answer and the solution agree. */
function secondForms({ form, a, b, c, e, A, k }: SecondParams) {
  if (form === 'cubic') {
    return {
      f: sumTex([termTex(a, 3), termTex(b, 2), termTex(c, 1), termTex(e, 0)]),
      source: sumAnswer([termAnswer(a, 3), termAnswer(b, 2), termAnswer(c, 1), termAnswer(e, 0)]),
      first: sumTex([termTex(3 * a, 2), termTex(2 * b, 1), termTex(c, 0)]),
      firstAnswer: sumAnswer([termAnswer(3 * a, 2), termAnswer(2 * b, 1), termAnswer(c, 0)]),
      second: lineTex(6 * a, 2 * b),
      secondAnswer: sumAnswer([termAnswer(6 * a, 1), termAnswer(2 * b, 0)]),
      keypad: ALGEBRA_KEYS,
      slips: [
        {
          tex: sumTex([termTex(6 * a, 2), termTex(2 * b, 1)]),
          answer: sumAnswer([termAnswer(6 * a, 2), termAnswer(2 * b, 1)]),
        },
        { tex: termTex(6 * a, 1), answer: termAnswer(6 * a, 1) },
      ],
    };
  }
  if (form === 'quartic') {
    return {
      // Three terms, not four: a four-term first derivative runs off the side
      // of a phone in the worked solution.
      f: sumTex([termTex(a, 4), termTex(b, 3), termTex(c, 2)]),
      source: sumAnswer([termAnswer(a, 4), termAnswer(b, 3), termAnswer(c, 2)]),
      first: sumTex([termTex(4 * a, 3), termTex(3 * b, 2), termTex(2 * c, 1)]),
      firstAnswer: sumAnswer([termAnswer(4 * a, 3), termAnswer(3 * b, 2), termAnswer(2 * c, 1)]),
      second: sumTex([termTex(12 * a, 2), termTex(6 * b, 1), termTex(2 * c, 0)]),
      secondAnswer: sumAnswer([termAnswer(12 * a, 2), termAnswer(6 * b, 1), termAnswer(2 * c, 0)]),
      keypad: ALGEBRA_KEYS,
      slips: [
        {
          tex: sumTex([termTex(12 * a, 3), termTex(6 * b, 2), termTex(2 * c, 1)]),
          answer: sumAnswer([termAnswer(12 * a, 3), termAnswer(6 * b, 2), termAnswer(2 * c, 1)]),
        },
        {
          tex: sumTex([termTex(12 * a, 2), termTex(6 * b, 1)]),
          answer: sumAnswer([termAnswer(12 * a, 2), termAnswer(6 * b, 1)]),
        },
      ],
    };
  }
  if (form === 'recip') {
    // f = ax^2 + A/x, so f' = 2ax - A/x^2 and f'' = 2a + 2A/x^3.
    const over = (top: number, power: number) =>
      `${top < 0 ? '-' : ''}\\frac{${Math.abs(top)}}{x^{${power}}}`;
    return {
      f: sumTex([termTex(a, 2), over(A, 1).replace('x^{1}', 'x')]),
      source: `(${a}) * x^2 + (${A}) / x`,
      first: sumTex([termTex(2 * a, 1), over(-A, 2)]),
      firstAnswer: `(${2 * a}) * x - (${A}) / x^2`,
      second: sumTex([`${2 * a}`, over(2 * A, 3)]),
      secondAnswer: `(${2 * a}) + (${2 * A}) / x^3`,
      keypad: ALGEBRA_KEYS,
      slips: [
        { tex: sumTex([`${2 * a}`, over(-2 * A, 3)]), answer: `(${2 * a}) - (${2 * A}) / x^3` },
        { tex: sumTex([`${2 * a}`, over(-A, 3)]), answer: `(${2 * a}) - (${A}) / x^3` },
      ],
    };
  }
  // A cubic term plus one exponential or trig term, each differentiated twice.
  const cubicPart = termTex(a, 3);
  const cubicSource = termAnswer(a, 3);
  const firstCubic = termTex(3 * a, 2);
  const firstCubicAnswer = termAnswer(3 * a, 2);
  const secondCubic = termTex(6 * a, 1);
  const secondCubicAnswer = termAnswer(6 * a, 1);
  const inner = `${k}x`;
  if (form === 'exp') {
    const term = (coefficient: number) => scaledTex(coefficient, `e^{${inner}}`);
    const answer = (coefficient: number) => `(${coefficient}) * exp(${k} * x)`;
    return {
      f: sumTex([cubicPart, term(A)]),
      source: `${cubicSource} + ${answer(A)}`,
      first: sumTex([firstCubic, term(A * k)]),
      firstAnswer: `${firstCubicAnswer} + ${answer(A * k)}`,
      second: sumTex([secondCubic, term(A * k * k)]),
      secondAnswer: `${secondCubicAnswer} + ${answer(A * k * k)}`,
      keypad: EXP_KEYS,
      slips: [
        { tex: sumTex([secondCubic, term(A * k)]), answer: `${secondCubicAnswer} + ${answer(A * k)}` },
        { tex: sumTex([secondCubic, term(A)]), answer: `${secondCubicAnswer} + ${answer(A)}` },
      ],
    };
  }
  const fn = form;
  const other = fn === 'sin' ? 'cos' : 'sin';
  const term = (coefficient: number, name: string) => scaledTex(coefficient, `\\${name}(${inner})`);
  const answer = (coefficient: number, name: string) => `(${coefficient}) * ${name}(${k} * x)`;
  // sin -> k cos -> -k^2 sin; cos -> -k sin -> -k^2 cos.
  const firstCoefficient = fn === 'sin' ? A * k : -A * k;
  return {
    f: sumTex([cubicPart, term(A, fn)]),
    source: `${cubicSource} + ${answer(A, fn)}`,
    first: sumTex([firstCubic, term(firstCoefficient, other)]),
    firstAnswer: `${firstCubicAnswer} + ${answer(firstCoefficient, other)}`,
    second: sumTex([secondCubic, term(-A * k * k, fn)]),
    secondAnswer: `${secondCubicAnswer} + ${answer(-A * k * k, fn)}`,
    keypad: TRIG_KEYS,
    slips: [
      { tex: sumTex([secondCubic, term(A * k * k, fn)]), answer: `${secondCubicAnswer} + ${answer(A * k * k, fn)}` },
      { tex: sumTex([secondCubic, term(-A * k, fn)]), answer: `${secondCubicAnswer} + ${answer(-A * k, fn)}` },
    ],
  };
}

/** The function a second-derivative question is about, in mathjs syntax. Never displayed. */
export const secondDerivativeFunction = (params: SecondParams): string => secondForms(params).source;

/**
 * Differentiating twice.
 *
 * `source` is the *first* derivative, so the oracle in `generators.test.ts`
 * differentiates it once more and must land on this answer; the independent
 * check in `stationaryPoints.test.ts` differentiates the original function
 * twice. The distractors are the three ways of stopping short: the first
 * derivative itself, a second pass that forgets to lower the powers (or to
 * bring the chain rule's factor down a second time), and a lost constant or a
 * lost sign.
 */
const secondDerivative: Generator<SecondParams> = {
  id: 'df-second-derivative',
  sample: (rng, difficulty) => {
    const form =
      difficulty >= 2
        ? rng.pick(['quartic', 'exp', 'sin', 'cos', 'recip'] as const)
        : ('cubic' as const);
    const hard = difficulty >= 2;
    return {
      form,
      a: rng.int(1, hard ? 4 : 5) * (hard ? rng.sign() : 1),
      b: nonZero(rng.int(-6, 6), 3),
      c: nonZero(rng.int(-9, 9), -4),
      e: rng.int(-9, 9),
      A: rng.int(1, 5) * (hard ? rng.sign() : 1),
      k: form === 'exp' ? rng.pick([2, 3, -2, -3]) : rng.int(2, 4),
    };
  },
  choices: (params) => {
    const forms = secondForms(params);
    return options(
      { tex: forms.second, answer: forms.secondAnswer },
      { tex: forms.first, answer: forms.firstAnswer },
      ...forms.slips,
    );
  },
  render: (params): Slide => {
    const forms = secondForms(params);
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: 'Differentiate twice to find the second derivative.' },
        { kind: 'display', tex: `y = ${forms.f}` },
      ],
      lead: '\\frac{d^{2}y}{dx^{2}} =',
      keypad: forms.keypad,
      answer: forms.secondAnswer,
      source: forms.firstAnswer,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const forms = secondForms(params);
    const { form, k } = params;
    return [
      {
        text: 'Differentiate once, exactly as before.',
        tex: `\\frac{dy}{dx} = ${forms.first}`,
      },
      {
        text: 'Then differentiate that result again, term by term.',
        tex: `\\frac{d^{2}y}{dx^{2}} = ${forms.second}`,
      },
      {
        text:
          form === 'cubic' || form === 'quartic'
            ? 'Each power drops twice and brings two multipliers down with it, so the constant term of the first derivative vanishes on the second pass.'
            : form === 'recip'
              ? 'The reciprocal is $x$ to a negative power, and each pass takes the power one further from zero: $-1$, then $-2$, then $-3$, with two sign changes on the way.'
              : form === 'exp'
                ? `The chain rule brings down a factor of $${k}$ on each pass, so the exponential term ends up multiplied by $${k}^{2} = ${k * k}$.`
                : `The chain rule brings down a factor of $${k}$ on each pass, and going from $\\sin$ to $\\cos$ and back picks up exactly one minus sign.`,
      },
    ];
  },
};

/**
 * The second derivative at a stationary point: a number whose sign says which
 * kind of point it is.
 *
 * $0$ is among the options because it is $f'$ at that point, which is the
 * number already known and the one most often written down by mistake.
 */
const secondAt: Generator<CubicPoint> = {
  id: 'df-second-at',
  sample: (rng, difficulty) => ({ cubic: sampleCubic(rng, difficulty), left: rng.chance(0.5) }),
  choices: (params) => {
    const s = pointOf(params);
    const [a] = cubicCoefficients(params.cubic);
    const value = cubicSecondAt(params.cubic, s);
    return numberOptions(value, [0, -value, 6 * a * s, 3 * a * s]);
  },
  render: (params): Slide => {
    const s = pointOf(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `This curve is flat at $x = ${params.cubic.p}$ and $x = ${params.cubic.q}$. Find the second derivative at $x = ${s}$.`,
        },
        { kind: 'display', tex: `f(x) = ${cubicTex(params.cubic)}` },
      ],
      lead: `f''(${s}) =`,
      keypad: [],
      answer: `${cubicSecondAt(params.cubic, s)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { cubic } = params;
    const s = pointOf(params);
    const [a, b] = cubicCoefficients(cubic);
    const value = cubicSecondAt(cubic, s);
    return [
      {
        text: 'Differentiate twice.',
        tex: `f'(x) = ${cubicDerivativeTex(cubic)}`,
      },
      { tex: `f''(x) = ${cubicSecondTex(cubic)}` },
      {
        text: `Substitute $x = ${s}$ into the second derivative: $${6 * a} \\times ${bracketedNumber(s)}${constantTex(2 * b)}$.`,
        tex: `f''(${s}) = ${value}`,
      },
      {
        text:
          value < 0
            ? `Negative: the gradient is falling as it passes through zero, so $x = ${s}$ is a local maximum.`
            : `Positive: the gradient is rising as it passes through zero, so $x = ${s}$ is a local minimum.`,
      },
      {
        text: `The other point, $x = ${otherOf(params)}$, gives $f''(${otherOf(params)}) = ${cubicSecondAt(cubic, otherOf(params))}$ — the opposite sign, as it must be for a cubic with two turning points.`,
      },
    ];
  },
};

/* ---------- Deciding the nature of a stationary point ---------- */

/**
 * A curve and a point on it, in one of the shapes the nature questions need:
 * a cubic at a turning point, a cubic somewhere it is not flat, and the two
 * powers where the second derivative is zero and the test says nothing —
 * $(x - r)^{4}$, which still has a minimum, and $(x - r)^{3}$, which does not.
 */
export type NatureParams =
  | { form: 'turn'; cubic: Cubic; left: boolean }
  | { form: 'off'; cubic: Cubic; t: number }
  | { form: 'quartic' | 'cubed'; k: number; r: number; d: number };

export function natureFunction(params: NatureParams): { tex: string; source: string; at: number } {
  if (params.form === 'turn') {
    return { tex: cubicTex(params.cubic), source: cubicSource(params.cubic), at: pointOf(params) };
  }
  if (params.form === 'off') {
    return { tex: cubicTex(params.cubic), source: cubicSource(params.cubic), at: params.t };
  }
  const { k, r, d } = params;
  const n = params.form === 'quartic' ? 4 : 3;
  return {
    tex: `${leadingTex(k)}${rootPowerTex(r, n)}${constantTex(d)}`,
    source: `(${k}) * (x - (${r}))^${n} + (${d})`,
    at: r,
  };
}

/** The labels along the right path through `df-nature-flow`. */
function naturePath(params: NatureParams): string[] {
  if (params.form === 'off') return ['No'];
  if (params.form === 'turn') {
    return ['Yes', cubicSecondAt(params.cubic, pointOf(params)) < 0 ? 'Negative' : 'Positive'];
  }
  if (params.form === 'cubed') return ['Yes', 'Zero', 'It does not change'];
  return ['Yes', 'Zero', params.k > 0 ? 'Negative to positive' : 'Positive to negative'];
}

/**
 * The whole decision, one fork at a time: is it stationary at all, what does
 * the second derivative say, and — only when that is zero — what does the
 * sign of the gradient either side say instead.
 *
 * The third fork is the one worth a tree. A learner who has only met the
 * second-derivative test tends to read $f'' = 0$ as "point of inflection",
 * and $(x - r)^{4}$ is the standing counterexample: flat, $f'' = 0$, and a
 * perfectly ordinary minimum.
 */
const natureFlow: Generator<NatureParams> = {
  id: 'df-nature-flow',
  sample: (rng, difficulty) => {
    const forms =
      difficulty >= 2
        ? (['turn', 'turn', 'off', 'quartic', 'cubed'] as const)
        : (['turn', 'turn', 'off'] as const);
    const form = rng.pick(forms);
    if (form === 'turn') return { form, cubic: sampleCubic(rng, difficulty), left: rng.chance(0.5) };
    if (form === 'off') {
      const cubic = sampleCubic(rng, difficulty);
      for (;;) {
        const t = rng.int(-4, 4);
        if (t !== cubic.p && t !== cubic.q) return { form, cubic, t };
      }
    }
    return {
      form,
      k: rng.pick([1, 2, 3]) * rng.sign(),
      r: rng.int(-3, 3),
      d: rng.int(-9, 9),
    };
  },
  render: (params): Slide => {
    const { tex, at } = natureFunction(params);
    const minimum = 'A local minimum: the gradient goes from negative, through zero, to positive.';
    const maximum = 'A local maximum: the gradient goes from positive, through zero, to negative.';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Decide what happens on this curve at $x = ${at}$. Each answer chooses the next question.`,
        },
      ],
      subject: `f(x) = ${tex}`,
      steps: [
        {
          id: 'flat',
          ask: `Is $f'(${at}) = 0$?`,
          branches: [
            { label: 'Yes', to: 'second' },
            { label: 'No', outcome: 'Not a stationary point: the curve is still rising or falling there.' },
          ],
        },
        {
          id: 'second',
          ask: `What sign is $f''(${at})$?`,
          branches: [
            { label: 'Negative', outcome: maximum },
            { label: 'Positive', outcome: minimum },
            { label: 'Zero', to: 'sides' },
          ],
        },
        {
          id: 'sides',
          ask: `The second derivative cannot tell, so look at $f'(x)$ just either side of $x = ${at}$. How does its sign change?`,
          branches: [
            { label: 'Positive to negative', outcome: maximum },
            { label: 'Negative to positive', outcome: minimum },
            {
              label: 'It does not change',
              outcome: 'A stationary point of inflection: flat for a moment, then carrying on the same way.',
            },
          ],
        },
      ],
      answer: naturePath(params),
    };
  },
  solution: (params) => {
    const { at } = natureFunction(params);
    if (params.form === 'off') {
      const [a, b, c] = cubicCoefficients(params.cubic);
      const gradient = 3 * a * at * at + 2 * b * at + c;
      return [
        { text: 'Differentiate and substitute.', tex: `f'(x) = ${cubicDerivativeTex(params.cubic)}` },
        {
          text: `The gradient there is not zero, so the question of which kind of stationary point never arises.`,
          tex: `f'(${at}) = ${gradient}`,
        },
        {
          text: `The curve is flat at $x = ${params.cubic.p}$ and $x = ${params.cubic.q}$ only, and is ${gradient > 0 ? 'rising' : 'falling'} at $x = ${at}$.`,
        },
      ];
    }
    if (params.form === 'turn') {
      const value = cubicSecondAt(params.cubic, at);
      return [
        {
          text: `The derivative factorises, and $x = ${at}$ is one of its roots, so the curve is flat there.`,
          tex: `f'(x) = ${cubicFactoredTex(params.cubic)}`,
        },
        {
          text: `The second derivative decides the rest: $f''(x) = ${cubicSecondTex(params.cubic)}$.`,
          tex: `f''(${at}) = ${value}`,
        },
        {
          text:
            value < 0
              ? 'Negative, so the curve bends downwards there: a local maximum.'
              : 'Positive, so the curve bends upwards there: a local minimum.',
        },
      ];
    }
    const { k, r } = params;
    const n = params.form === 'quartic' ? 4 : 3;
    return [
      {
        text: 'Differentiate twice. Both derivatives still contain the bracket, so both are zero at its root.',
        tex: `f'(x) = ${leadingTex(n * k)}${rootPowerTex(r, n - 1)}`,
      },
      { tex: `f''(x) = ${leadingTex(n * (n - 1) * k)}${rootPowerTex(r, n - 2)}` },
      {
        text: `So $f''(${r}) = 0$, and the second derivative says nothing. Look at the sign of $f'(x)$ either side instead.`,
      },
      {
        text:
          params.form === 'cubed'
            ? `The bracket in $f'(x)$ is squared, so it is never negative: $f'(x)$ has the sign of $${3 * k}$ on both sides. No change of sign, so this is a stationary point of inflection.`
            : `The bracket in $f'(x)$ is cubed, so it changes sign at $x = ${r}$: $f'(x)$ goes from ${k > 0 ? 'negative to positive, a minimum' : 'positive to negative, a maximum'}. A zero second derivative did not mean inflection here.`,
      },
    ];
  },
};

/** A derivative given ready-factorised, and the stationary point to classify. */
export interface SignParams {
  form: 'pair' | 'cubed' | 'squared';
  k: number;
  r: number;
  /** The other root, used by `pair` only. */
  t: number;
}

function signFactors({ form, r, t }: SignParams): [number, number][] {
  if (form === 'pair') {
    return [
      [r, 1],
      [t, 1],
    ];
  }
  return [[r, form === 'cubed' ? 3 : 2]];
}

/** f'(x) in mathjs syntax. Never displayed. */
export const signDerivative = (params: SignParams): string => factoredAnswer(params.k, signFactors(params));

function signDerivativeAt(params: SignParams, x: number): number {
  return signFactors(params).reduce((total, [root, n]) => total * (x - root) ** n, params.k);
}

const SIGN_TOKEN = (value: number) => (value > 0 ? '+' : '-');

/** The verdict a pair of signs gives, as the tile that names it. */
function verdictToken(before: number, after: number): string {
  if (before > 0 && after < 0) return '\\text{maximum}';
  if (before < 0 && after > 0) return '\\text{minimum}';
  return '\\text{inflection}';
}

/**
 * The sign test, with the working in tiles: the sign before, the sign after,
 * and what the pair of them means.
 *
 * The points tested are one either side of the stationary point, which only
 * works while no other root sits between them — hence the gap of at least 2
 * between the two roots of a `pair`. Every bank holds two of each sign and all
 * three verdicts, so which tiles are left over says nothing about the answer.
 */
const signTiles: Generator<SignParams> = {
  id: 'df-sign-tiles',
  sample: (rng, difficulty) => {
    const form = rng.pick(
      difficulty >= 2 ? (['pair', 'cubed', 'squared'] as const) : (['pair', 'pair', 'squared'] as const),
    );
    const k = rng.int(1, difficulty >= 2 ? 4 : 3) * rng.sign();
    const r = rng.int(-4, 4);
    for (;;) {
      const t = rng.int(-4, 4);
      if (form !== 'pair' || Math.abs(t - r) >= 2) return { form, k, r, t };
    }
  },
  render: (params): Slide => {
    const { r } = params;
    const before = signDerivativeAt(params, r - 1);
    const after = signDerivativeAt(params, r + 1);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `This curve is flat at $x = ${r}$. Find the sign of the gradient just before it, at $x = ${r - 1}$, and just after it, at $x = ${r + 1}$. Then name the point.`,
        },
        { kind: 'display', tex: `f'(x) = ${factoredTex(params.k, signFactors(params))}` },
      ],
      // A phone wraps the verdict onto a second line, so it carries its own
      // words rather than sitting there as an unlabelled blank.
      template: '\\text{before } {0} \\quad \\text{after } {1} \\quad \\text{so it is a } {2}',
      bank: ['+', '+', '-', '-', '\\text{inflection}', '\\text{maximum}', '\\text{minimum}'],
      answer: [SIGN_TOKEN(before), SIGN_TOKEN(after), verdictToken(before, after)],
    };
  },
  solution: (params) => {
    const { r } = params;
    const before = signDerivativeAt(params, r - 1);
    const after = signDerivativeAt(params, r + 1);
    const verdict =
      before > 0 && after < 0
        ? 'Rising, then falling: a local maximum.'
        : before < 0 && after > 0
          ? 'Falling, then rising: a local minimum.'
          : `${before > 0 ? 'Rising' : 'Falling'} on both sides, so the curve only pauses: a stationary point of inflection.`;
    return [
      {
        text: `Substitute a value just before $x = ${r}$. Only the sign matters, so there is no need to tidy the number.`,
        tex: `f'(${r - 1}) = ${before}`,
      },
      {
        text: 'And one just after.',
        tex: `f'(${r + 1}) = ${after}`,
      },
      { text: verdict },
      {
        text:
          params.form === 'squared'
            ? 'A squared bracket is never negative, which is why the sign could not change: the gradient touches zero and comes straight back.'
            : 'Neither test point may be past the next place the gradient is zero, or the sign there belongs to a different part of the curve.',
      },
    ];
  },
};

/** f'(x) = k(x - r)^i (x - t)^j, asked about the point at r. */
export interface FactoredParams {
  k: number;
  r: number;
  t: number;
  i: number;
  j: number;
}

export const factoredDerivative = ({ k, r, t, i, j }: FactoredParams): string =>
  factoredAnswer(k, [
    [r, i],
    [t, j],
  ]);

function factoredNatureOf({ k, r, t, i, j }: FactoredParams): 'max' | 'min' | 'inflection' {
  const at = (x: number) => k * (x - r) ** i * (x - t) ** j;
  // t is at least 1 away, so half a unit either side stays on r's side of it.
  const before = at(r - 0.5);
  const after = at(r + 0.5);
  if (before > 0 && after < 0) return 'max';
  if (before < 0 && after > 0) return 'min';
  return 'inflection';
}

/**
 * The nature of a stationary point read off a factorised derivative, without
 * substituting anything.
 *
 * A factor raised to an even power keeps its sign through its root, and one
 * raised to an odd power flips it; everything else in the product holds its
 * sign near the point. That is the whole sign test, done by reasoning rather
 * than arithmetic, and the repeated factors are what make it worth asking.
 */
const factoredNature: Generator<FactoredParams> = {
  id: 'df-factored-nature',
  sample: (rng, difficulty) => {
    const [i, j] = rng.pick(
      difficulty >= 2
        ? ([
            [1, 1],
            [2, 1],
            [3, 1],
            [2, 2],
            [1, 2],
          ] as const)
        : ([
            [1, 1],
            [2, 1],
            [1, 2],
          ] as const),
    );
    const r = rng.int(-4, 4);
    for (;;) {
      const t = rng.int(-4, 4);
      if (t !== r) return { k: rng.int(1, 3) * rng.sign(), r, t, i, j };
    }
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: `A curve has this gradient function. What kind of stationary point does it have at $x = ${params.r}$?`,
      },
      {
        kind: 'display',
        tex: `\\frac{dy}{dx} = ${factoredTex(params.k, [
          [params.r, params.i],
          [params.t, params.j],
        ])}`,
      },
    ],
    options: [
      { id: 'max', label: 'A local maximum' },
      { id: 'min', label: 'A local minimum' },
      { id: 'inflection', label: 'A stationary point of inflection' },
    ],
    correctId: factoredNatureOf(params),
  }),
  solution: (params) => {
    const { k, r, t, i, j } = params;
    const nature = factoredNatureOf(params);
    const rest = k * (r - t) ** j;
    return [
      {
        text: `Near $x = ${r}$, every factor except $${rootPowerTex(r, i)}$ keeps its sign. Together they come to about $${k} \\times ${bracketedNumber(r - t)}${j > 1 ? `^{${j}}` : ''} = ${rest}$, which is ${rest > 0 ? 'positive' : 'negative'}.`,
      },
      {
        text:
          i % 2 === 0
            ? `$${rootPowerTex(r, i)}$ is an even power, so it is positive on both sides of $x = ${r}$: the gradient keeps the same sign.`
            : `$${rootPowerTex(r, i)}$ is an odd power, so it is negative before $x = ${r}$ and positive after: the gradient changes sign.`,
      },
      {
        text:
          nature === 'max'
            ? 'Positive, then negative: the curve rises, stops and falls. A local maximum.'
            : nature === 'min'
              ? 'Negative, then positive: the curve falls, stops and rises. A local minimum.'
              : 'The same sign on both sides: the curve pauses and carries on. A stationary point of inflection.',
      },
    ];
  },
};

/* ---------- Increasing and decreasing ---------- */

export interface AtParams {
  cubic: Cubic;
  t: number;
}

function gradientAt(cubic: Cubic, x: number): number {
  const [a, b, c] = cubicCoefficients(cubic);
  return 3 * a * x * x + 2 * b * x + c;
}

/**
 * Increasing or decreasing at one point: the sign of one number.
 *
 * Stationary is offered, and is the answer about one time in five, so that
 * "not increasing" is not taken to mean "decreasing".
 */
const increasingAt: Generator<AtParams> = {
  id: 'df-increasing-at',
  sample: (rng, difficulty) => {
    const cubic = sampleCubic(rng, difficulty);
    if (rng.chance(0.2)) return { cubic, t: rng.pick([cubic.p, cubic.q]) };
    for (;;) {
      const t = rng.int(-4, 4);
      if (t !== cubic.p && t !== cubic.q) return { cubic, t };
    }
  },
  render: ({ cubic, t }): Slide => {
    const gradient = gradientAt(cubic, t);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `At $x = ${t}$, is this function increasing, decreasing, or stationary?` },
        { kind: 'display', tex: `f(x) = ${cubicTex(cubic)}` },
      ],
      options: [
        { id: 'up', label: 'Increasing' },
        { id: 'down', label: 'Decreasing' },
        { id: 'flat', label: 'Stationary' },
      ],
      correctId: gradient > 0 ? 'up' : gradient < 0 ? 'down' : 'flat',
    };
  },
  solution: ({ cubic, t }) => {
    const gradient = gradientAt(cubic, t);
    return [
      {
        text: 'Whether a function is going up or down is the sign of its derivative.',
        tex: `f'(x) = ${cubicDerivativeTex(cubic)}`,
      },
      {
        text: `Substitute $x = ${t}$. Only the sign of the answer matters.`,
        tex: `f'(${t}) = ${gradient}`,
      },
      {
        text:
          gradient > 0
            ? 'Positive, so the function is increasing there.'
            : gradient < 0
              ? 'Negative, so the function is decreasing there.'
              : `Zero, so the function is stationary there: $x = ${t}$ is one of its turning points.`,
      },
    ];
  },
};

export interface IntervalParams {
  cubic: Cubic;
  ask: 'increasing' | 'decreasing';
}

/** Whether the asked-for stretch is the one between the turning points. */
export const betweenTurns = ({ cubic, ask }: IntervalParams): boolean =>
  (ask === 'decreasing') === (cubic.m > 0);

/**
 * Where a cubic goes up and where it comes down, as the boundaries of an
 * inequality.
 *
 * A cubic changes direction only at its turning points, so the answer is
 * always either the stretch between them or the two stretches outside. Which
 * one depends on the sign of $m$ — at difficulty 2 the curve can be upside
 * down — and the template changes to match, so the learner has to decide the
 * shape of the answer as well as its numbers.
 */
const increasingTiles: Generator<IntervalParams> = {
  id: 'df-increasing-tiles',
  sample: (rng, difficulty) => ({
    cubic: sampleCubic(rng, difficulty),
    ask: rng.pick(['increasing', 'decreasing'] as const),
  }),
  render: (params): Slide => {
    const { cubic, ask } = params;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `For which values of $x$ is this function **${ask}**? Place the boundaries.`,
        },
        { kind: 'display', tex: `f(x) = ${cubicTex(cubic)}` },
      ],
      template: betweenTurns(params) ? '{0} < x < {1}' : 'x < {0} \\quad \\text{or} \\quad x > {1}',
      bank: numberTiles([cubic.p, cubic.q], [-cubic.p, -cubic.q, cubic.p + cubic.q, cubic.q - cubic.p]),
      answer: [`${cubic.p}`, `${cubic.q}`],
    };
  },
  solution: (params) => {
    const { cubic, ask } = params;
    const between = betweenTurns(params);
    return [
      {
        text: 'A function can only change direction where its gradient is zero, so find those places first.',
        tex: `f'(x) = ${cubicFactoredTex(cubic)}`,
      },
      { tex: `x = ${cubic.p}, \\quad x = ${cubic.q}` },
      {
        text: `Between them the gradient has one sign and outside them the other, so one test point settles both. Beyond the right-hand one, $f'(${cubic.q + 1}) = ${gradientAt(cubic, cubic.q + 1)}$, so the function is ${cubic.m > 0 ? 'increasing' : 'decreasing'} outside the turning points and ${cubic.m > 0 ? 'decreasing' : 'increasing'} between them.`,
      },
      {
        text: `So the function is ${ask} ${between ? 'between' : 'outside'} the turning points:`,
        tex: between ? `${cubic.p} < x < ${cubic.q}` : `x < ${cubic.p} \\quad \\text{or} \\quad x > ${cubic.q}`,
      },
    ];
  },
};

/* ---------- Points of inflection ---------- */

export type InflectionParams =
  | { form: 'cubic'; cubic: Cubic }
  /** f''(x) = 12a(x - r)(x - s): two points of inflection, one of them given. */
  | { form: 'quartic'; a: number; r: number; s: number; e: number };

function quarticCoefficients({ a, r, s, e }: { a: number; r: number; s: number; e: number }): number[] {
  return [a, -2 * a * (r + s), 6 * a * r * s, e];
}

export function inflectionFunction(params: InflectionParams): string {
  if (params.form === 'cubic') return cubicSource(params.cubic);
  const [a, b, c, e] = quarticCoefficients(params);
  return sumAnswer([termAnswer(a, 4), termAnswer(b, 3), termAnswer(c, 2), termAnswer(e, 1)]);
}

export const inflectionAnswer = (params: InflectionParams): number =>
  params.form === 'cubic' ? (params.cubic.p + params.cubic.q) / 2 : params.s;

/**
 * Where the curve changes its bend.
 *
 * A cubic has exactly one point of inflection, midway between its turning
 * points, which is why the distractors include the turning points themselves:
 * solving $f'(x) = 0$ when the question needed $f''(x) = 0$. The quartic form
 * gives one point and asks for the other, which rules out guessing the
 * midpoint and makes the learner solve $f''(x) = 0$ properly.
 */
const inflectionX: Generator<InflectionParams> = {
  id: 'df-inflection-x',
  sample: (rng, difficulty) => {
    if (difficulty < 2 || rng.chance(0.5)) {
      return { form: 'cubic', cubic: sampleCubic(rng, difficulty, { evenSum: true, minGap: 2 }) };
    }
    for (;;) {
      const r = rng.int(-3, 3);
      const s = rng.int(-3, 3);
      if (r !== s) return { form: 'quartic', a: rng.pick([1, -1]), r, s, e: rng.int(-9, 9) };
    }
  },
  choices: (params) => {
    const answer = inflectionAnswer(params);
    return numberOptions(
      answer,
      params.form === 'cubic'
        ? [params.cubic.p, params.cubic.q, -answer]
        : [params.r, -params.s, params.r + params.s],
    );
  },
  render: (params): Slide => {
    if (params.form === 'cubic') {
      return {
        kind: 'expression',
        prompt: [
          { kind: 'prose', text: 'Find the $x$-coordinate of the point of inflection on this curve.' },
          { kind: 'display', tex: `y = ${cubicTex(params.cubic)}` },
        ],
        lead: 'x =',
        keypad: [],
        answer: `${inflectionAnswer(params)}`,
        domain: 'real',
        mode: 'exact',
      };
    }
    const [a, b, c, e] = quarticCoefficients(params);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `This curve has two points of inflection, and one of them is at $x = ${params.r}$. Find the $x$-coordinate of the other.`,
        },
        { kind: 'display', tex: `y = ${sumTex([termTex(a, 4), termTex(b, 3), termTex(c, 2), termTex(e, 1)])}` },
      ],
      lead: 'x =',
      keypad: [],
      answer: `${params.s}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    if (params.form === 'cubic') {
      const { cubic } = params;
      const answer = inflectionAnswer(params);
      return [
        {
          text: 'A point of inflection is where the second derivative is zero and changes sign, so differentiate twice.',
          tex: `f''(x) = ${cubicSecondTex(cubic)}`,
        },
        {
          text: `Set $${cubicSecondTex(cubic)} = 0$ and solve. It is a straight line with a non-zero gradient, so it does change sign there.`,
          tex: `x = ${answer}`,
        },
        {
          text: `That is exactly halfway between the turning points at $x = ${cubic.p}$ and $x = ${cubic.q}$, which is true of every cubic with two turning points.`,
        },
      ];
    }
    const { a, r, s } = params;
    const [, b, c] = quarticCoefficients(params);
    return [
      {
        text: 'Differentiate twice.',
        tex: `f''(x) = ${sumTex([termTex(12 * a, 2), termTex(6 * b, 1), termTex(2 * c, 0)])}`,
      },
      {
        text: `Take out the common factor of $${12 * a}$, and the quadratic that is left factorises.`,
        tex: `${factoredTex(12 * a, [
          [r, 1],
          [s, 1],
        ])} = 0`,
      },
      {
        text: `One root is the $x = ${r}$ you were given; the other is the answer. Each is a single root, so $f''(x)$ changes sign at both.`,
        tex: `x = ${s}`,
      },
    ];
  },
};

/**
 * Convex or concave at a point: the sign of the second derivative.
 *
 * "Neither" is there for the one point on a cubic where $f''$ is zero, so a
 * learner cannot pass by treating the question as a two-way guess.
 */
const concavity: Generator<AtParams> = {
  id: 'df-concavity',
  sample: (rng, difficulty) => {
    const cubic = sampleCubic(rng, difficulty);
    const middle = (cubic.p + cubic.q) / 2;
    if (Number.isInteger(middle) && rng.chance(0.2)) return { cubic, t: middle };
    for (;;) {
      const t = rng.int(-4, 4);
      if (t !== middle) return { cubic, t };
    }
  },
  render: ({ cubic, t }): Slide => {
    const bend = cubicSecondAt(cubic, t);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: `At $x = ${t}$, which way is this curve bending?` },
        { kind: 'display', tex: `y = ${cubicTex(cubic)}` },
      ],
      options: [
        { id: 'convex', label: 'Convex: bending upwards' },
        { id: 'concave', label: 'Concave: bending downwards' },
        { id: 'neither', label: 'Neither: it is changing its bend there' },
      ],
      correctId: bend > 0 ? 'convex' : bend < 0 ? 'concave' : 'neither',
    };
  },
  solution: ({ cubic, t }) => {
    const [a, b] = cubicCoefficients(cubic);
    const bend = cubicSecondAt(cubic, t);
    return [
      {
        text: 'Which way a curve bends is the sign of its second derivative.',
        tex: `\\frac{d^{2}y}{dx^{2}} = ${cubicSecondTex(cubic)}`,
      },
      {
        text: `Substitute $x = ${t}$: $${6 * a} \\times ${bracketedNumber(t)}${constantTex(2 * b)}$.`,
        tex: `f''(${t}) = ${bend}`,
      },
      {
        text:
          bend > 0
            ? 'Positive: the gradient is increasing, so the curve is convex there, bending upwards like the inside of a bowl.'
            : bend < 0
              ? 'Negative: the gradient is decreasing, so the curve is concave there, bending downwards like an arch.'
              : 'Zero, and a cubic\'s second derivative is a straight line, so it changes sign here: this is the point of inflection.',
      },
    ];
  },
};

export type InflectionFlowParams =
  | { form: 'middle'; cubic: Cubic }
  | { form: 'turn'; cubic: Cubic; left: boolean }
  /** k(x - r)^n + cx + d. The cx term tilts the curve without touching f''. */
  | { form: 'power'; k: number; r: number; n: 3 | 4 | 5; c: number; d: number };

export function inflectionFlowFunction(params: InflectionFlowParams): { tex: string; source: string; at: number } {
  if (params.form === 'middle') {
    return {
      tex: cubicTex(params.cubic),
      source: cubicSource(params.cubic),
      at: (params.cubic.p + params.cubic.q) / 2,
    };
  }
  if (params.form === 'turn') {
    return { tex: cubicTex(params.cubic), source: cubicSource(params.cubic), at: pointOf(params) };
  }
  const { k, r, n, c, d } = params;
  return {
    tex: sumTex([`${leadingTex(k)}${rootPowerTex(r, n)}`, termTex(c, 1), termTex(d, 0)]),
    source: `(${k}) * (x - (${r}))^${n} + (${c}) * x + (${d})`,
    at: r,
  };
}

function inflectionPath(params: InflectionFlowParams): string[] {
  if (params.form === 'turn') return ['No'];
  if (params.form === 'middle') return ['Yes', 'Yes', 'No'];
  if (params.n === 4) return ['Yes', 'No'];
  return ['Yes', 'Yes', params.c === 0 ? 'Yes' : 'No'];
}

/**
 * Is this a point of inflection, and is it a stationary one?
 *
 * The three forks are the three conditions in order, and each has a curve
 * that stops at it: a turning point, where $f''$ is not zero; $(x - r)^{4}$,
 * where $f''$ is zero but keeps its sign; and the two kinds of genuine
 * inflection, told apart by whether the curve is also flat there.
 */
const inflectionFlow: Generator<InflectionFlowParams> = {
  id: 'df-inflection-flow',
  sample: (rng, difficulty) => {
    const form = rng.pick(['middle', 'turn', 'power', 'power'] as const);
    if (form === 'middle') return { form, cubic: sampleCubic(rng, difficulty, { evenSum: true, minGap: 2 }) };
    if (form === 'turn') return { form, cubic: sampleCubic(rng, difficulty), left: rng.chance(0.5) };
    const n = difficulty >= 2 ? rng.pick([3, 4, 5] as const) : rng.pick([3, 3, 4] as const);
    return {
      form,
      k: rng.int(1, 3) * rng.sign(),
      r: rng.int(-3, 3),
      n,
      c: rng.chance(0.5) ? 0 : nonZero(rng.int(-6, 6), 2),
      d: rng.int(-9, 9),
    };
  },
  render: (params): Slide => {
    const { tex, at } = inflectionFlowFunction(params);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Is there a point of inflection on this curve at $x = ${at}$? Each answer chooses the next question.`,
        },
      ],
      subject: `f(x) = ${tex}`,
      steps: [
        {
          id: 'zero',
          ask: `Is $f''(${at}) = 0$?`,
          branches: [
            { label: 'Yes', to: 'change' },
            {
              label: 'No',
              outcome: 'Not a point of inflection: the curve is bending firmly one way there.',
            },
          ],
        },
        {
          id: 'change',
          ask: `Does $f''(x)$ change sign as $x$ passes through $${at}$?`,
          branches: [
            { label: 'Yes', to: 'flat' },
            {
              label: 'No',
              outcome: 'Not a point of inflection: the curve bends the same way on both sides, as $x^{4}$ does at $0$.',
            },
          ],
        },
        {
          id: 'flat',
          ask: `Is $f'(${at}) = 0$ as well?`,
          branches: [
            { label: 'Yes', outcome: 'A stationary point of inflection: flat, and changing its bend.' },
            {
              label: 'No',
              outcome: 'A point of inflection that is not stationary: still sloping as it changes its bend.',
            },
          ],
        },
      ],
      answer: inflectionPath(params),
    };
  },
  solution: (params) => {
    const { at } = inflectionFlowFunction(params);
    if (params.form !== 'power') {
      const { cubic } = params;
      const bend = cubicSecondAt(cubic, at);
      const steps: SolutionStep[] = [
        { text: 'Differentiate twice.', tex: `f''(x) = ${cubicSecondTex(cubic)}` },
        { text: `Substitute $x = ${at}$.`, tex: `f''(${at}) = ${bend}` },
      ];
      if (params.form === 'turn') {
        steps.push({
          text: `Not zero, so the curve is bending ${bend > 0 ? 'upwards' : 'downwards'} at $x = ${at}$. It is a turning point, not a point of inflection.`,
        });
        return steps;
      }
      steps.push(
        {
          text: 'Zero, and the second derivative is a straight line through that point, so it changes sign there.',
        },
        {
          text: `But the gradient is not zero: $f'(${at}) = ${gradientAt(cubic, at)}$. So the curve is still sloping as it changes its bend.`,
        },
      );
      return steps;
    }
    const { k, r, n, c } = params;
    return [
      {
        text: 'Differentiate twice. The $x$ term only affects the first derivative.',
        tex: `f'(x) = ${sumTex([`${leadingTex(n * k)}${rootPowerTex(r, n - 1)}`, termTex(c, 0)])}`,
      },
      { tex: `f''(x) = ${leadingTex(n * (n - 1) * k)}${rootPowerTex(r, n - 2)}` },
      {
        text:
          n === 4
            ? `$f''(${r}) = 0$, but the bracket in $f''(x)$ is squared, so it never changes sign. The curve bends the same way on both sides: no inflection.`
            : `$f''(${r}) = 0$, and the bracket in $f''(x)$ is raised to an odd power, so it changes sign there: a point of inflection.`,
      },
      ...(n === 4
        ? []
        : [
            {
              text:
                c === 0
                  ? `And $f'(${r}) = 0$ too, since every term of $f'(x)$ still has the bracket in it: a stationary point of inflection.`
                  : `But $f'(${r}) = ${c}$, not zero, so the curve is still sloping there: a non-stationary point of inflection.`,
            },
          ]),
    ];
  },
};

/* ---------- Curve sketching ---------- */

/*
 * The level after stationary points puts them to use: a sketch is the roots,
 * how the curve meets the axis at each, where it crosses the y-axis, which way
 * its ends go, and its turning points, and every question below is one of
 * those read from an equation or read back off a picture.
 *
 * `plotSvg` draws no scale, so no question here asks for a number that could
 * only be read off a figure. A figure is there to be reasoned about: which
 * side of the y-axis a root sits, whether the curve crosses or touches, which
 * way it heads. Where a question needs positions, the prose states them.
 */

/**
 * A polynomial as it is sketched: k(x - r)^n (x - s)^m ..., every root a whole
 * number and no two the same.
 *
 * Held factorised because that is the form a sketch is read from. Where the
 * curve meets the axis, and whether it crosses or only touches there, is
 * printed on the brackets; expanding first would hide both.
 */
export interface Poly {
  k: number;
  /** [root, power], in the order they are written. */
  factors: [number, number][];
}

export function polyAt({ k, factors }: Poly, x: number): number {
  return factors.reduce((total, [r, n]) => total * (x - r) ** n, k);
}

const degreeOf = ({ factors }: Poly): number => factors.reduce((total, [, n]) => total + n, 0);

/** The roots, left to right. */
const rootsOf = ({ factors }: Poly): number[] => factors.map(([r]) => r).sort((x, y) => x - y);

const polyTex = ({ k, factors }: Poly): string => factoredTex(k, factors);

/** Coefficients of the expanded polynomial, constant first. */
function polyCoefficients({ k, factors }: Poly): number[] {
  let coefficients = [k];
  for (const [r, n] of factors) {
    for (let i = 0; i < n; i += 1) {
      const next: number[] = new Array(coefficients.length + 1).fill(0);
      coefficients.forEach((c, power) => {
        next[power + 1] += c;
        next[power] -= r * c;
      });
      coefficients = next;
    }
  }
  return coefficients;
}

/** Whole numbers lo..hi. */
function between(lo: number, hi: number): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** A polynomial with these powers on its brackets, at distinct roots in -span..span. */
function samplePoly(rng: Rng, powers: readonly number[], ks: readonly number[], span = 4): Poly {
  const roots = rng.sample(between(-span, span), powers.length);
  return { k: rng.pick(ks), factors: roots.map((r, i): [number, number] => [r, powers[i]]) };
}

/**
 * Whether a sketch of this polynomial can be read without a scale.
 *
 * The roots straddle the y-axis, so which side each lies on is visible; they
 * are at least 2 apart, so no hump between them is too shallow to show whether
 * the curve crosses or touches; and no root has its mirror image as another
 * root, or reflecting the roots would draw the same picture.
 */
function readable(poly: Poly): boolean {
  const roots = rootsOf(poly);
  if (roots[0] >= 0 || roots[roots.length - 1] <= 0) return false;
  for (let i = 1; i < roots.length; i += 1) {
    if (roots[i] - roots[i - 1] < 2) return false;
  }
  return roots.every((r) => !roots.includes(-r));
}

/** The same curve with every root on the other side of the y-axis. */
const mirrored = ({ k, factors }: Poly): Poly => ({ k, factors: factors.map(([r, n]) => [-r, n]) });

/**
 * A polynomial drawn around its roots, with the y-axis in and the roots ringed.
 *
 * `plotSvg` draws the x-axis only, so the y-axis goes in as a solid vertical:
 * which side of it a root lies on is a position a learner can read without
 * numbers. The window is set by the humps between the roots rather than by the
 * arms, which for a quartic are in the hundreds a unit or two further out.
 */
function sketchSvg(poly: Poly, label: string, opts: { accent?: boolean } = {}): string {
  const roots = rootsOf(poly);
  const lo = roots[0];
  const hi = roots[roots.length - 1];
  let reach = 1;
  for (let i = 0; i <= 80; i += 1) reach = Math.max(reach, Math.abs(polyAt(poly, lo + ((hi - lo) * i) / 80)));
  return plotSvg({
    xMin: Math.min(lo, 0) - 1.5,
    xMax: Math.max(hi, 0) + 1.5,
    yMin: -1.35 * reach,
    yMax: 1.35 * reach,
    curves: [{ f: (x) => polyAt(poly, x), accent: opts.accent }],
    verticals: [{ x: 0, dashed: false }],
    marks: roots.map((x) => ({ x, y: 0 })),
    label,
  });
}

/**
 * A stable turn for a native choice slide's options, drawn from the question's
 * own numbers.
 *
 * Options written in a fixed order put a fixed answer in a fixed slot, and the
 * derived `+choice` rotation only reaches generators with `choices()`. Hashing
 * the parameters keeps one question rendering one way, which the deck
 * de-duplicator relies on, while spreading the answer across the slots.
 */
function turnFor(size: number, ...values: number[]): number {
  let hash = 0x9e3779b9;
  for (const value of values) {
    hash = Math.imul(hash ^ (value + 1013), 0x85ebca6b);
    hash ^= hash >>> 13;
  }
  return (hash >>> 0) % size;
}

function turned<T>(items: T[], turn: number): T[] {
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** A number in plain text, with a proper minus sign. */
const plain = (value: number): string => (value < 0 ? `−${-value}` : `${value}`);

/** The roots of a polynomial as they read in a sentence: "$-2$, $1$ and $4$". */
function listTex(values: number[]): string {
  const each = values.map((value) => `$${value}$`);
  return each.length === 1 ? each[0] : `${each.slice(0, -1).join(', ')} and ${each[each.length - 1]}`;
}

/* ---------- Where a curve meets the axes ---------- */

/**
 * Where a factorised polynomial meets the x-axis, placed as tiles.
 *
 * The bank carries each root with its sign flipped, the slip of reading
 * $(x + 3)$ as a root at $3$, and the number in front, which is never a root.
 * A repeated bracket gives one root, not two, so difficulty 2 asks for fewer
 * tiles than there are brackets.
 */
const sketchRoots: Generator<Poly> = {
  id: 'df-cs-roots',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? samplePoly(
          rng,
          rng.pick([
            [2, 1],
            [1, 2, 1],
            [2, 1, 1],
            [1, 1, 1],
          ] as const),
          [1, 2, 3, -1, -2, -3],
        )
      : samplePoly(rng, [1, 1, 1], [1, 2, 3, -1]),
  render: (poly): Slide => {
    const roots = rootsOf(poly);
    const blanks = roots.map((_, i) => `{${i}}`);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Where does this curve meet the $x$-axis? Place each value of $x$ once.' },
        { kind: 'display', tex: `y = ${polyTex(poly)}` },
      ],
      template: `x = ${blanks.slice(0, -1).join(', \\; ')} \\; \\text{and} \\; ${blanks[blanks.length - 1]}`,
      bank: numberTiles(roots, [...roots.map((r) => -r), poly.k]),
      answer: roots.map(String),
      unordered: true,
    };
  },
  solution: (poly) => {
    const roots = rootsOf(poly);
    const steps: SolutionStep[] = [
      {
        text: 'The curve meets the $x$-axis where $y = 0$, and a product is zero only when one of its factors is.',
      },
      {
        text: `Each bracket is zero at the number that cancels it, which is the number inside with its sign flipped: ${poly.factors
          .map(([r]) => `$${rootFactorTex(r)}$ gives $x = ${r}$`)
          .join(', ')}.`,
        tex: `x = ${roots.join(', \\; ')}`,
      },
    ];
    if (Math.abs(poly.k) !== 1) {
      steps.push({ text: `The $${poly.k}$ in front is never zero, so it adds no root of its own.` });
    }
    const repeated = poly.factors.find(([, n]) => n > 1);
    if (repeated) {
      steps.push({
        text: `$${rootPowerTex(repeated[0], repeated[1])}$ is one bracket used twice, so it still gives only one place on the axis, $x = ${repeated[0]}$.`,
      });
    }
    return steps;
  },
};

/**
 * Where a factorised polynomial crosses the y-axis: put 0 into every bracket.
 *
 * The options carry the answer with its sign lost, the product of the roots
 * as written (every bracket's number without the sign flip), and the product
 * without the number in front.
 */
const sketchYIntercept: Generator<Poly> = {
  id: 'df-cs-y-int',
  sample: (rng, difficulty) => {
    for (;;) {
      const poly =
        difficulty >= 2
          ? samplePoly(
              rng,
              rng.pick([
                [1, 1, 1],
                [2, 1],
                [1, 2],
                [2, 1, 1],
              ] as const),
              [1, 2, -1, -2],
            )
          : samplePoly(rng, [1, 1, 1], [1, 2]);
      const y = polyAt(poly, 0);
      if (y !== 0 && Math.abs(y) <= 100) return poly;
    }
  },
  choices: (poly) => {
    const y = polyAt(poly, 0);
    const asWritten = poly.factors.reduce((total, [r, n]) => total * r ** n, poly.k);
    return numberOptions(y, [-y, asWritten, y / poly.k, y + poly.k]);
  },
  render: (poly): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Where does this curve cross the $y$-axis? Give the $y$-coordinate.' },
      { kind: 'display', tex: `y = ${polyTex(poly)}` },
    ],
    lead: 'y =',
    keypad: [],
    answer: `${polyAt(poly, 0)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (poly) => {
    const y = polyAt(poly, 0);
    const each = poly.factors.map(([r, n]) =>
      n === 1
        ? `$${rootFactorTex(r)}$ becomes $${-r}$`
        : `$${rootPowerTex(r, n)}$ becomes $${bracketedNumber(-r)}^{${n}} = ${(-r) ** n}$`,
    );
    const negatives = poly.factors.filter(([r, n]) => r > 0 && n % 2 === 1).length + (poly.k < 0 ? 1 : 0);
    return [
      { text: `The $y$-axis is the line $x = 0$, so put $0$ into every bracket: ${each.join(', ')}.` },
      {
        text: `Multiply those together${poly.k === 1 ? '' : `, with the $${poly.k}$ in front`}. There ${negatives === 1 ? 'is 1 negative' : `are ${negatives} negatives`} in the product, so it is ${negatives % 2 === 0 ? 'positive' : 'negative'}.`,
        tex: `y = ${y}`,
      },
      { text: `So the curve crosses the $y$-axis at $(0, ${y})$.` },
    ];
  },
};

/** One test point inside each stretch of the number line the roots cut out. */
function stretchPoints(roots: number[]): number[] {
  return [roots[0] - 1, ...roots.slice(1).map((r, i) => (r + roots[i]) / 2), roots[roots.length - 1] + 1];
}

/**
 * The sign of a polynomial on every stretch between its roots, as tiles.
 *
 * This is the skeleton of a sketch: above the axis or below it, stretch by
 * stretch. The roots sit in the template between the blanks, like a sign
 * chart, so the question is the signs rather than the roots. The bank holds as
 * many of each sign as there are blanks, so what is left over gives nothing
 * away, and difficulty 2 brings in repeated roots, where the sign does not
 * change.
 */
const sketchSigns: Generator<Poly> = {
  id: 'df-cs-signs',
  sample: (rng, difficulty) =>
    difficulty >= 2
      ? samplePoly(
          rng,
          rng.pick([
            [2, 1],
            [1, 2],
            [2, 1, 1],
            [1, 1, 2],
            [3, 1],
          ] as const),
          [1, 2, -1, -2],
        )
      : samplePoly(rng, [1, 1, 1], [1, 2, -1, -2]),
  render: (poly): Slide => {
    const roots = rootsOf(poly);
    const signs = stretchPoints(roots).map((x) => SIGN_TOKEN(polyAt(poly, x)));
    const marker = (r: number) => `\\overset{\\scriptstyle ${r}}{\\big|}`;
    const template = signs
      .map((_, i) => (i === 0 ? '{0}' : ` \\;\\; ${marker(roots[i - 1])} \\;\\; {${i}}`))
      .join('');
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The roots of this curve cut the number line into stretches. Place the sign of $y$ on each stretch, from left to right.',
        },
        { kind: 'display', tex: `y = ${polyTex(poly)}` },
      ],
      template,
      bank: [...signs.map(() => '+'), ...signs.map(() => '-')],
      answer: signs,
    };
  },
  solution: (poly) => {
    const roots = rootsOf(poly);
    const signs = stretchPoints(roots).map((x) => SIGN_TOKEN(polyAt(poly, x)));
    const powerAt = (r: number) => poly.factors.find(([root]) => root === r)?.[1] ?? 1;
    const kept = roots.filter((r) => powerAt(r) % 2 === 0);
    return [
      {
        text: `Far to the right every bracket is positive, so $y$ takes the sign of the number in front, $${poly.k}$: the last stretch is ${poly.k > 0 ? 'positive' : 'negative'}.`,
      },
      {
        text:
          kept.length === 0
            ? 'Every bracket has an odd power, so moving left the sign flips at every root.'
            : `Moving left the sign flips at each root, except where the bracket has an even power: at ${listTex(kept)} it stays the same, because the curve only touches the axis there.`,
        tex: signs.join(' \\quad '),
      },
    ];
  },
};

/** One root of a polynomial, to say how the curve meets the axis there. */
export interface TouchParams {
  poly: Poly;
  /** Which bracket, by its place in `poly.factors`. */
  at: number;
}

/** Everything in the product except the asked-about bracket, near its root. */
function restAt({ poly, at }: TouchParams): number {
  const [r] = poly.factors[at];
  return poly.factors.reduce((total, [s, n], i) => (i === at ? total : total * (r - s) ** n), poly.k);
}

/** The labels along the right path through `df-cs-touch`. */
function touchPath(params: TouchParams): string[] {
  const [, n] = params.poly.factors[params.at];
  if (n % 2 === 1) return ['Odd', n === 1 ? 'Yes' : 'No'];
  return ['Even', restAt(params) > 0 ? 'Positive' : 'Negative'];
}

/**
 * How a curve meets the x-axis at one root, a fork at a time: does the sign
 * change (odd power or even), and then either how it crosses or from which
 * side it touches.
 *
 * The second fork on the even side is the one a sketch most often gets wrong.
 * A squared bracket makes a turning point on the axis, and which way up it is
 * depends on everything *else* in the product, not on the bracket itself.
 */
const sketchTouch: Generator<TouchParams> = {
  id: 'df-cs-touch',
  sample: (rng, difficulty) => {
    const powers = rng.pick<readonly number[]>(
      difficulty >= 2
        ? ([
            [2, 1, 1],
            [1, 2, 1],
            [3, 1],
            [2, 2],
            [3, 2],
          ] as const)
        : ([
            [2, 1],
            [1, 2],
            [1, 1, 1],
            [3, 1],
          ] as const),
    );
    const poly = samplePoly(rng, powers, [1, 2, -1, -2]);
    // Weighted towards the repeated root, which is where the forks are.
    const repeated = poly.factors.findIndex(([, n]) => n > 1);
    const at = repeated >= 0 && rng.chance(0.6) ? repeated : rng.int(0, poly.factors.length - 1);
    return { poly, at };
  },
  render: (params): Slide => {
    const [r] = params.poly.factors[params.at];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Decide how this curve meets the $x$-axis at $x = ${r}$. Each answer chooses the next question.`,
        },
      ],
      subject: `y = ${polyTex(params.poly)}`,
      steps: [
        {
          id: 'parity',
          ask: `Is the power on the bracket $${rootFactorTex(r)}$ odd or even?`,
          branches: [
            { label: 'Odd', to: 'once' },
            { label: 'Even', to: 'side' },
          ],
        },
        {
          id: 'once',
          ask: 'Is that power exactly 1?',
          branches: [
            { label: 'Yes', outcome: 'The curve crosses the axis at a slant, like any single root.' },
            {
              label: 'No',
              outcome: 'The curve crosses the axis but flattens as it does: a stationary point of inflection on the axis.',
            },
          ],
        },
        {
          id: 'side',
          ask: `Close to $x = ${r}$, is the rest of the product, the number in front included, positive or negative?`,
          branches: [
            { label: 'Positive', outcome: 'The curve comes down to touch the axis and goes back up: a minimum on the axis.' },
            { label: 'Negative', outcome: 'The curve comes up to touch the axis and goes back down: a maximum on the axis.' },
          ],
        },
      ],
      answer: touchPath(params),
    };
  },
  solution: (params) => {
    const [r, n] = params.poly.factors[params.at];
    const steps: SolutionStep[] = [
      { text: `The bracket for $x = ${r}$ is $${rootPowerTex(r, n)}$, with power $${n}$.` },
    ];
    if (n === 1) {
      steps.push({
        text: 'A single bracket changes sign at its root, so $y$ does too: the curve crosses the axis there.',
      });
      return steps;
    }
    if (n % 2 === 1) {
      steps.push({
        text: `An odd power still changes sign, so the curve crosses. But a power above 1 leaves the bracket in $\\frac{dy}{dx}$ as well, so the curve is flat as it crosses: a stationary point of inflection.`,
      });
      return steps;
    }
    const rest = restAt(params);
    steps.push(
      {
        text: 'An even power is never negative, so $y$ keeps the same sign on both sides: the curve touches the axis and turns back.',
      },
      {
        text: `Which way it turns depends on the rest of the product. Put $x = ${r}$ into everything except that bracket:`,
        tex: `${rest}`,
      },
      {
        text:
          rest > 0
            ? 'Positive, so the curve is above the axis on both sides: it touches from above, a minimum on the axis.'
            : 'Negative, so the curve is below the axis on both sides: it touches from below, a maximum on the axis.',
      },
    );
    return steps;
  },
};

/* ---------- Placing the turning points ---------- */

/**
 * One turning point of a cubic, found and named, as tiles: its coordinates and
 * whether it is a maximum or a minimum.
 *
 * The question names the point by position — the one on the left — rather
 * than by kind, so the learner finds both flat places, picks the leftmost, and
 * only then decides what it is. The bank holds the other turning point's
 * coordinates, which is exactly what a learner who mixes the two up reaches for.
 */
const sketchTurn: Generator<CubicPoint> = {
  id: 'df-cs-turn',
  sample: (rng, difficulty) => ({ cubic: sampleCubic(rng, difficulty, { minGap: 2 }), left: rng.chance(0.5) }),
  render: (params): Slide => {
    const { cubic, left } = params;
    const x = pointOf(params);
    const other = otherOf(params);
    const y = cubicAt(cubic, x);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Find the turning point on the **${left ? 'left' : 'right'}** of this curve, and say what kind it is.`,
        },
        { kind: 'display', tex: `y = ${cubicTex(cubic)}` },
      ],
      template: '({0}, {1}) \\; \\text{is a local} \\; {2}',
      bank: [
        ...numberTiles([x, y], [other, cubicAt(cubic, other), -x, -y]),
        '\\text{maximum}',
        '\\text{minimum}',
      ],
      answer: [`${x}`, `${y}`, cubicSecondAt(cubic, x) < 0 ? '\\text{maximum}' : '\\text{minimum}'],
    };
  },
  solution: (params) => {
    const { cubic, left } = params;
    const x = pointOf(params);
    const y = cubicAt(cubic, x);
    const bend = cubicSecondAt(cubic, x);
    return [
      {
        text: 'Differentiate and set the derivative to zero. It factorises:',
        tex: `${cubicFactoredTex(cubic)} = 0`,
      },
      {
        text: `So the curve is flat at $x = ${cubic.p}$ and $x = ${cubic.q}$, and the one on the ${left ? 'left' : 'right'} is $x = ${x}$. Its height comes from the curve itself:`,
        tex: `f(${x}) = ${y}`,
      },
      {
        text: `The second derivative is $f''(x) = ${cubicSecondTex(cubic)}$.`,
        tex: `f''(${x}) = ${bend}`,
      },
      {
        text:
          bend < 0
            ? `Negative, so the curve bends downwards there: $(${x}, ${y})$ is a local maximum.`
            : `Positive, so the curve bends upwards there: $(${x}, ${y})$ is a local minimum.`,
      },
    ];
  },
};

/** A cubic's two turning points, given as coordinates. */
export interface CrossingParams {
  p: number;
  q: number;
  /** The height of the turning point at p. */
  left: number;
  /** The height of the turning point at q. */
  right: number;
}

/** How many times the cubic with these turning points meets the x-axis. */
export function crossingsOf({ left, right }: CrossingParams): number {
  if (left === 0 || right === 0) return 2;
  return left * right < 0 ? 3 : 1;
}

/**
 * How many times a cubic meets the axis, from its turning points alone.
 *
 * Any two points with the maximum above the minimum are the turning points of
 * exactly one cubic, so the coordinates can be drawn freely and the count is
 * decided by their signs: the stretch between them crosses the axis only when
 * they sit on opposite sides of it, and each outer arm heads off to infinity
 * one way or the other. The figure is the two points on bare axes, the start
 * of a sketch the learner finishes in their head. 0 is offered because a
 * cubic always meets the axis at least once.
 */
const sketchCrossings: Generator<CrossingParams> = {
  id: 'df-cs-crossings',
  sample: (rng, difficulty) => {
    const p = rng.int(-4, 2);
    const q = rng.int(p + 2, 4);
    const count = rng.pick([1, 2, 3] as const);
    let high: number;
    let low: number;
    if (count === 3) {
      high = rng.int(1, 9);
      low = -rng.int(1, 9);
    } else if (count === 2) {
      [high, low] = rng.chance(0.5) ? [0, -rng.int(1, 9)] : [rng.int(1, 9), 0];
    } else {
      const near = rng.int(1, 8);
      const far = rng.int(near + 1, 12);
      [high, low] = rng.chance(0.5) ? [far, near] : [-near, -far];
    }
    // Difficulty 2 turns the cubic upside down half the time: the minimum on the left.
    const upright = difficulty < 2 || rng.chance(0.5);
    return upright ? { p, q, left: high, right: low } : { p, q, left: low, right: high };
  },
  render: (params): Slide => {
    const { p, q, left, right } = params;
    const upright = left > right;
    const max = upright ? [p, left] : [q, right];
    const min = upright ? [q, right] : [p, left];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `A cubic has a local maximum at $(${max[0]}, ${max[1]})$ and a local minimum at $(${min[0]}, ${min[1]})$. How many times does it meet the $x$-axis?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -6,
            xMax: 6,
            yMin: -14,
            yMax: 14,
            curves: [],
            verticals: [{ x: 0, dashed: false }],
            marks: [
              { x: p, y: left },
              { x: q, y: right },
            ],
            label: 'Two turning points marked on a pair of axes',
          }),
        },
      ],
      options: [0, 1, 2, 3].map((n) => ({ id: `n${n}`, label: `${n}` })),
      correctId: `n${crossingsOf(params)}`,
    };
  },
  solution: (params) => {
    const { left, right } = params;
    const upright = left > right;
    const count = crossingsOf(params);
    const shape = upright
      ? 'It comes up from below on the left, over the maximum, down to the minimum, and away upwards on the right.'
      : 'It comes down from above on the left, into the minimum, up over the maximum, and away downwards on the right.';
    const reason =
      count === 3
        ? 'The maximum is above the axis and the minimum below it, so the curve crosses once on each outer arm and once on the way between them: 3 times.'
        : count === 2
          ? 'One turning point sits on the axis, so the curve touches it there, and crosses once more on the arm beyond the other turning point: 2 times.'
          : `Both turning points are ${left > 0 ? 'above' : 'below'} the axis, so the stretch between them never reaches it. Only the arm heading ${left > 0 ? 'downwards' : 'upwards'} crosses: once.`;
    return [
      { text: shape },
      { text: reason },
      { text: 'It is never 0. A cubic heads to opposite ends of the $y$ range, so it meets the axis at least once.' },
    ];
  },
};

/* ---------- Asymptotes and large x ---------- */

/** y = a/(x - h) + v, or at difficulty 2 also y = (px + q)/(x - h). */
export type RationalParams =
  | { form: 'shifted'; a: number; h: number; v: number }
  | { form: 'ratio'; p: number; q: number; h: number };

export function rationalAt(params: RationalParams, x: number): number {
  if (params.form === 'shifted') return params.a / (x - params.h) + params.v;
  return (params.p * x + params.q) / (x - params.h);
}

/** `x - 3`, `x + 2`, or `x`. */
function denominatorTex(h: number): string {
  if (h === 0) return 'x';
  return h > 0 ? `x - ${h}` : `x + ${-h}`;
}

function rationalTex(params: RationalParams): string {
  if (params.form === 'ratio') return `\\frac{${lineTex(params.p, params.q)}}{${denominatorTex(params.h)}}`;
  const { a, h, v } = params;
  return `${a < 0 ? '-' : ''}\\frac{${Math.abs(a)}}{${denominatorTex(h)}}${constantTex(v)}`;
}

/** The horizontal asymptote. */
const levelOf = (params: RationalParams): number => (params.form === 'shifted' ? params.v : params.p);

/** The number on top that a learner might take for an asymptote. */
const numeratorOf = (params: RationalParams): number => (params.form === 'shifted' ? params.a : params.q);

function sampleRational(rng: Rng, difficulty: number): RationalParams {
  if (difficulty < 2 || rng.chance(0.5)) {
    return { form: 'shifted', a: rng.int(1, 6) * (difficulty >= 2 ? rng.sign() : 1), h: rng.int(-5, 5), v: rng.int(-5, 5) };
  }
  for (;;) {
    const p = rng.int(1, 4) * rng.sign();
    const h = rng.int(-5, 5);
    const q = rng.int(-9, 9);
    // q + ph = 0 cancels the bracket, leaving a flat line with a hole in it.
    if (q + p * h !== 0) return { form: 'ratio', p, q, h };
  }
}

const pairTex = (x: number, y: number): string => `x = ${x}, \\; y = ${y}`;

/**
 * The two asymptotes of a reciprocal curve, as tiles.
 *
 * The bank holds both values with their signs flipped, which is the slip of
 * reading $x = -3$ off $x + 3$, and the number on top, which is what a learner
 * reaches for when they think the numerator sets the level. The pick-one form
 * adds the swap: the vertical asymptote's number given as the horizontal one.
 */
const sketchAsymptotes: Generator<RationalParams> = {
  id: 'df-cs-asymptotes',
  sample: (rng, difficulty) => sampleRational(rng, difficulty),
  choices: (params) => {
    const { h } = params;
    const v = levelOf(params);
    return options(
      { tex: pairTex(h, v) },
      { tex: pairTex(-h, v) },
      { tex: pairTex(v, h) },
      { tex: pairTex(h, numeratorOf(params)) },
      { tex: pairTex(-h, -v) },
      { tex: pairTex(h, v + 1) },
    ).slice(0, 4);
  },
  render: (params): Slide => {
    const v = levelOf(params);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Find the asymptotes of this curve: the vertical line it never reaches, and the level it settles towards far out.',
        },
        { kind: 'display', tex: `y = ${rationalTex(params)}` },
      ],
      template: 'x = {0} \\quad \\text{and} \\quad y = {1}',
      bank: numberTiles([params.h, v], [-params.h, -v, numeratorOf(params), 0]),
      answer: [`${params.h}`, `${v}`],
    };
  },
  solution: (params) => {
    const { h } = params;
    const steps: SolutionStep[] = [
      {
        text: `There is no value of $y$ where the denominator is zero, since nothing can be divided by zero. $${denominatorTex(h)} = 0$ at:`,
        tex: `x = ${h}`,
      },
    ];
    if (params.form === 'shifted') {
      steps.push({
        text: `As $x$ grows large in either direction the fraction shrinks towards $0$, so $y$ settles at the number added on${params.v === 0 ? ', which here is nothing at all' : ''}:`,
        tex: `y = ${params.v}`,
      });
    } else {
      steps.push({
        text: `For large $x$ the constants on top and bottom are tiny beside the $x$ terms, so $y$ behaves like $\\frac{${termTex(params.p, 1)}}{x}$, which is $${params.p}$:`,
        tex: `y = ${params.p}`,
      });
    }
    return steps;
  },
};

/**
 * Where a reciprocal curve crosses the y-axis, typed.
 *
 * Sampled so the division comes out whole: $h$ divides the number on top.
 */
const sketchRationalY: Generator<RationalParams> = {
  id: 'df-cs-rational-y',
  sample: (rng, difficulty) => {
    const h = rng.int(1, 4) * rng.sign();
    const t = rng.int(1, 3) * rng.sign();
    if (difficulty < 2 || rng.chance(0.5)) return { form: 'shifted', a: h * t, h, v: rng.int(-5, 5) };
    for (;;) {
      const p = rng.int(1, 3) * rng.sign();
      if (t !== -p) return { form: 'ratio', p, q: h * t, h };
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'Where does this curve cross the $y$-axis? Give the $y$-coordinate.' },
      { kind: 'display', tex: `y = ${rationalTex(params)}` },
    ],
    lead: 'y =',
    keypad: [],
    answer: `${rationalAt(params, 0)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const y = rationalAt(params, 0);
    const top = numeratorOf(params);
    const bottom = -params.h;
    return [
      {
        text: `The $y$-axis is the line $x = 0$, so substitute $0$ for $x$. The bottom becomes $${bottom}$${params.form === 'ratio' ? ` and the top becomes $${top}$` : ''}.`,
        tex: `\\frac{${top}}{${bottom}} = ${top / bottom}`,
      },
      ...(params.form === 'shifted' && params.v !== 0
        ? [{ text: `Then add the $${params.v}$ on the end:`, tex: `${top / bottom}${constantTex(params.v)} = ${y}` }]
        : []),
      { text: `So the curve crosses the $y$-axis at $(0, ${y})$.` },
    ];
  },
};

/** A reciprocal curve and the place it crosses the x-axis. */
export type RationalRootParams = RationalParams & { root: number };

/**
 * Where a reciprocal curve crosses the x-axis, found and slid to.
 *
 * Built from the root: a/(x - h) + v is zero at x = h - a/v, so choosing the
 * root and v first makes a whole. The figure draws both asymptotes dashed and
 * lifts the pen across the vertical one, since a stroke joining its two
 * branches would be a line the curve never draws.
 */
const sketchRationalRoot: Generator<RationalRootParams> = {
  id: 'df-cs-rational-root',
  sample: (rng, difficulty) => {
    for (;;) {
      const root = rng.int(-5, 5);
      const h = rng.int(-5, 5);
      if (h === root) continue;
      if (difficulty < 2 || rng.chance(0.5)) {
        const v = rng.int(1, 4) * rng.sign();
        const a = v * (h - root);
        if (Math.abs(a) <= 12) return { form: 'shifted', a, h, v, root };
        continue;
      }
      const p = rng.int(1, 3) * rng.sign();
      const q = -p * root;
      if (q + p * h !== 0) return { form: 'ratio', p, q, h, root };
    }
  },
  render: (params): Slide => {
    const v = levelOf(params);
    return {
      kind: 'slider',
      prompt: [
        { kind: 'prose', text: 'Find where this curve crosses the $x$-axis, and slide to it.' },
        { kind: 'display', tex: `y = ${rationalTex(params)}` },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: params.root,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: Math.min(0, v) - 6,
          yMax: Math.max(0, v) + 6,
          curves: [{ f: (x) => rationalAt(params, x), breaks: true }],
          verticals: [{ x: params.h }],
          horizontals: [v],
          label: 'A reciprocal curve with its two asymptotes dashed',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: (params) => {
    if (params.form === 'ratio') {
      return [
        { text: 'The curve crosses the $x$-axis where $y = 0$, and a fraction is zero only when its top is.' },
        { tex: `${lineTex(params.p, params.q)} = 0` },
        { tex: `x = ${params.root}` },
        { text: `The bottom is not zero there, since the vertical asymptote is at $x = ${params.h}$.` },
      ];
    }
    const { a, h, v } = params;
    return [
      {
        text: `The curve crosses the $x$-axis where $y = 0$, so the fraction has to cancel the $${v}$:`,
        tex: `${rationalTex({ form: 'shifted', a, h, v: 0 })} = ${-v}`,
      },
      {
        text: `Multiply both sides by $${h === 0 ? 'x' : `(${denominatorTex(h)})`}$ and divide by $${-v}$:`,
        tex: `${denominatorTex(h)} = ${-a / v}`,
      },
      { tex: `x = ${params.root}` },
    ];
  },
};

/** A polynomial, and whether it is shown factorised or multiplied out. */
export interface EndsParams {
  poly: Poly;
  /** Multiplied out, and written constant first so the leading term is last. */
  expanded: boolean;
}

type EndsId = 'du' | 'ud' | 'uu' | 'dd';

function endsOf({ poly }: EndsParams): EndsId {
  const odd = degreeOf(poly) % 2 === 1;
  if (odd) return poly.k > 0 ? 'du' : 'ud';
  return poly.k > 0 ? 'uu' : 'dd';
}

/**
 * Which way a polynomial's two ends go.
 *
 * For large x the highest power outweighs every other term together, so the
 * degree's parity and the leading coefficient's sign are the whole answer. The
 * factorised form hides both in plain sight: the degree is the sum of the
 * powers, and the leading coefficient is the number in front. Difficulty 2 also
 * writes the curve out constant first, so the term that decides is at the far
 * end of the line rather than the start.
 */
const sketchEnds: Generator<EndsParams> = {
  id: 'df-cs-ends',
  sample: (rng, difficulty) => {
    const hard = difficulty >= 2;
    const odd = rng.chance(0.5);
    // Multiplied out, a quartic runs off the side of a phone, so the
    // constant-first writing stays at cubics and quadratics.
    const expanded = hard && rng.chance(0.5);
    const powers = rng.pick<readonly number[]>(
      expanded
        ? odd
          ? ([[1, 1, 1], [2, 1]] as const)
          : ([[1, 1], [2]] as const)
        : odd
          ? hard
            ? ([[1, 1, 1], [2, 1], [3], [2, 2, 1]] as const)
            : ([[1, 1, 1], [2, 1]] as const)
          : hard
            ? ([[1, 1], [2, 1, 1], [2, 2], [3, 1]] as const)
            : ([[1, 1], [2, 1, 1], [2, 2]] as const),
    );
    return {
      poly: samplePoly(rng, powers, [1, 2, 3, -1, -2, -3], expanded ? 3 : 4),
      expanded,
    };
  },
  render: (params): Slide => {
    const { poly, expanded } = params;
    const tex = expanded
      ? sumTex(polyCoefficients(poly).map((c, n) => termTex(c, n)))
      : polyTex(poly);
    return {
      kind: 'choice',
      prompt: [
        { kind: 'prose', text: 'Far out to the left and far out to the right, which way does this curve go?' },
        { kind: 'display', tex: `y = ${tex}` },
      ],
      options: [
        { id: 'du', label: 'Down on the left, up on the right' },
        { id: 'ud', label: 'Up on the left, down on the right' },
        { id: 'uu', label: 'Up at both ends' },
        { id: 'dd', label: 'Down at both ends' },
      ],
      correctId: endsOf(params),
    };
  },
  solution: (params) => {
    const { poly, expanded } = params;
    const degree = degreeOf(poly);
    const odd = degree % 2 === 1;
    return [
      {
        text: expanded
          ? 'For large $x$ the term with the highest power outweighs all the others put together, wherever it is written in the line.'
          : `For large $x$ the highest power decides. Multiplying out would start with the number in front times one $x$ from every bracket: the powers add to $${degree}$.`,
        tex: `y \\approx ${termTex(poly.k, degree)}`,
      },
      {
        text: odd
          ? `An odd power keeps the sign of $x$, so the two ends go opposite ways. With $${poly.k}$ in front, ${poly.k > 0 ? 'the right end goes up and the left end down' : 'the right end goes down and the left end up'}.`
          : `An even power is positive for large $x$ of either sign, so both ends go the same way: ${poly.k > 0 ? 'up, since the number in front is positive' : 'down, since the number in front is negative'}.`,
      },
    ];
  },
};

/* ---------- Checking and reading a sketch ---------- */

/** A sketch, and what (if anything) is wrong with it. */
export interface SpotParams {
  /** Always a squared root and one or two single roots. */
  poly: Poly;
  error: 'none' | 'flipped' | 'swapped' | 'moved';
}

/** The repeated bracket's power given to the first single root, and theirs to it. */
function swappedPowers({ k, factors }: Poly): Poly {
  const repeated = factors.findIndex(([, n]) => n > 1);
  const single = factors.findIndex(([, n]) => n === 1);
  return {
    k,
    factors: factors.map(([r, n], i): [number, number] =>
      i === repeated ? [r, factors[single][1]] : i === single ? [r, factors[repeated][1]] : [r, n],
    ),
  };
}

function drawnFor({ poly, error }: SpotParams): Poly {
  if (error === 'flipped') return { k: -poly.k, factors: poly.factors };
  if (error === 'swapped') return swappedPowers(poly);
  if (error === 'moved') {
    const single = poly.factors.findIndex(([, n]) => n === 1);
    return { k: poly.k, factors: poly.factors.map(([r, n], i): [number, number] => [i === single ? -r : r, n]) };
  }
  return poly;
}

/**
 * A sketch to check against its equation, with at most one thing wrong.
 *
 * Each wrong sketch differs from the right one in one feature only: drawn
 * upside down, touching the axis at the wrong root, or with one root on the
 * wrong side of the y-axis. The other features stay right, so the error has to
 * be found by checking each in turn, which is the habit a sketch needs.
 *
 * A misplaced root is moved across the y-axis rather than every root being
 * reflected: with no scale on the figure, reflecting (x + 2)^2(x - 3) draws
 * the same left-to-right pattern — cross, then touch — as swapping which root
 * is squared, and the two errors could not be told apart.
 */
const sketchSpotError: Generator<SpotParams> = {
  id: 'df-cs-spot-error',
  sample: (rng, difficulty) => {
    for (;;) {
      const powers = rng.pick(
        difficulty >= 2
          ? ([
              [2, 1],
              [1, 2],
              [2, 1, 1],
              [1, 2, 1],
              [1, 1, 2],
            ] as const)
          : ([
              [2, 1],
              [1, 2],
            ] as const),
      );
      const poly = samplePoly(rng, powers, difficulty >= 2 ? [1, 2, -1, -2] : [1, -1]);
      if (readable(poly)) return { poly, error: rng.pick(['none', 'flipped', 'swapped', 'moved'] as const) };
    }
  },
  render: (params): Slide => ({
    kind: 'choice',
    prompt: [
      {
        kind: 'prose',
        text: 'Here is a sketch of this curve, with the $y$-axis drawn in and the roots ringed. Is anything wrong with it?',
      },
      { kind: 'display', tex: `y = ${polyTex(params.poly)}` },
      { kind: 'diagram', svg: sketchSvg(drawnFor(params), 'A sketch of a polynomial curve to be checked') },
    ],
    options: [
      { id: 'none', label: 'Nothing: the sketch is right' },
      { id: 'flipped', label: 'It is upside down' },
      { id: 'swapped', label: 'It touches the axis at the wrong root' },
      { id: 'moved', label: 'A root is on the wrong side of the y-axis' },
    ],
    correctId: params.error,
  }),
  solution: (params) => {
    const { poly, error } = params;
    const [touch] = poly.factors.find(([, n]) => n > 1) ?? [0];
    const [moved] = poly.factors.find(([, n]) => n === 1) ?? [0];
    const roots = rootsOf(poly);
    const degree = degreeOf(poly);
    const verdict = {
      none: 'All three agree with the sketch, so nothing is wrong.',
      flipped: 'The roots and the touch are in the right places, but the sketch has the ends the other way: it is upside down.',
      swapped: `The sketch crosses at $x = ${touch}$ and touches somewhere else instead.`,
      moved: `The sketch has the root at $x = ${moved}$ on the other side of the $y$-axis.`,
    }[error];
    return [
      {
        text: `Roots: the brackets give $x = $ ${listTex(roots)}. Check which side of the $y$-axis each lies.`,
      },
      {
        text: `Touching: the squared bracket is at $x = ${touch}$, so the curve touches the axis there and crosses at the others.`,
      },
      {
        text: `Ends: the degree is $${degree}$ and the number in front is $${poly.k}$, so the curve ends ${
          degree % 2 === 1
            ? poly.k > 0
              ? 'down on the left and up on the right'
              : 'up on the left and down on the right'
            : poly.k > 0
              ? 'up at both sides'
              : 'down at both sides'
        }.`,
      },
      { text: verdict },
    ];
  },
};

/** A curve, drawn, with the equations offered for it. */
export interface MatchParams {
  poly: Poly;
}

/** A near miss that changes how the curve meets the axis without moving any root. */
function reshaped(poly: Poly): Poly {
  const powers = poly.factors.map(([, n]) => n);
  if (powers.some((n) => n > 1) && powers.some((n) => n === 1)) return swappedPowers(poly);
  if (powers.every((n) => n === 1)) {
    return { k: poly.k, factors: poly.factors.map(([r, n], i): [number, number] => [r, i === 0 ? 2 : n]) };
  }
  return { k: poly.k, factors: poly.factors.map(([r]): [number, number] => [r, 1]) };
}

/**
 * The equation of a drawn curve, from four that share its roots.
 *
 * Every distractor keeps the same numbers in its brackets and changes one
 * thing: the sign in front (upside down), the signs inside (roots reflected
 * in the y-axis), or which root carries the repeated bracket. So nothing can
 * be matched on numbers alone; the learner reads the shape.
 */
const sketchMatch: Generator<MatchParams> = {
  id: 'df-cs-match',
  sample: (rng, difficulty) => {
    for (;;) {
      const powers = rng.pick<readonly number[]>(
        difficulty >= 2
          ? ([
              [2, 1],
              [1, 1, 1],
              [2, 1, 1],
              [1, 2, 1],
              [2, 2],
              [3, 1],
            ] as const)
          : ([
              [2, 1],
              [1, 2],
              [1, 1, 1],
            ] as const),
      );
      const poly = samplePoly(rng, powers, difficulty >= 2 ? [1, 2, -1, -2] : [1, -1]);
      if (readable(poly)) return { poly };
    }
  },
  render: ({ poly }): Slide => {
    const candidates = [
      { id: 'right', label: polyTex(poly) },
      { id: 'flipped', label: polyTex({ k: -poly.k, factors: poly.factors }) },
      { id: 'mirrored', label: polyTex(mirrored(poly)) },
      { id: 'reshaped', label: polyTex(reshaped(poly)) },
    ];
    const turn = turnFor(4, poly.k, ...poly.factors.flat());
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `This curve meets the $x$-axis only at $x = $ ${listTex(rootsOf(poly))}. Which equation is it?`,
        },
        { kind: 'diagram', svg: sketchSvg(poly, 'A polynomial curve with its roots ringed and the y-axis drawn') },
      ],
      options: turned(candidates, turn).map(({ id, label }) => ({ id, label: `y = ${label}`, tex: true })),
      correctId: 'right',
    };
  },
  solution: ({ poly }) => {
    const touching = poly.factors.filter(([, n]) => n % 2 === 0).map(([r]) => r);
    const flattening = poly.factors.filter(([, n]) => n > 1 && n % 2 === 1).map(([r]) => r);
    const degree = degreeOf(poly);
    const steps: SolutionStep[] = [
      {
        text: `A root at $x = r$ comes from a bracket $(x - r)$, so the brackets hold the roots with their signs flipped. That rules out the reflected equation.`,
      },
    ];
    steps.push({
      text:
        touching.length === 0 && flattening.length === 0
          ? 'The curve crosses cleanly at every root, so every bracket is to the power $1$.'
          : `${touching.length > 0 ? `It touches the axis at ${listTex(touching)}, so ${touching.length === 1 ? 'that bracket is' : 'those brackets are'} squared.` : ''}${flattening.length > 0 ? ` It flattens as it crosses at ${listTex(flattening)}, so that bracket is cubed.` : ''}`.trim(),
    });
    steps.push(
      {
        text: `The powers add to $${degree}$, and the curve ends ${
          degree % 2 === 1
            ? poly.k > 0
              ? 'up on the right'
              : 'down on the right'
            : poly.k > 0
              ? 'up at both sides'
              : 'down at both sides'
        }, so the number in front is ${poly.k > 0 ? 'positive' : 'negative'}.`,
      },
      { tex: `y = ${polyTex(poly)}` },
    );
    return steps;
  },
};

/** A cubic drawn with its turning points, to say what its gradient function looks like. */
const sketchGradientShape: Generator<Cubic> = {
  id: 'df-cs-gradient-shape',
  sample: (rng, difficulty) => {
    const cubic = sampleCubic(rng, difficulty, { evenSum: true, minGap: 2 });
    return difficulty < 2 && rng.chance(0.5) ? { ...cubic, m: -cubic.m } : cubic;
  },
  render: (cubic): Slide => {
    const { p, q, m } = cubic;
    const mid = (p + q) / 2;
    const heights = [cubicAt(cubic, p), cubicAt(cubic, q)];
    const low = Math.min(...heights);
    const high = Math.max(...heights);
    const pad = (high - low) * 0.45 + 2;
    const candidates = [
      { id: 'up', label: `A U-shaped parabola crossing the x-axis at x = ${plain(p)} and x = ${plain(q)}` },
      {
        id: 'down',
        label: `An upside-down U-shaped parabola crossing the x-axis at x = ${plain(p)} and x = ${plain(q)}`,
      },
      { id: 'line', label: `A straight line crossing the x-axis at x = ${plain(mid)}` },
      { id: 'cubic', label: `A cubic curve with turning points at x = ${plain(p)} and x = ${plain(q)}` },
    ];
    return {
      kind: 'choice',
      prompt: [
        {
          kind: 'prose',
          text: `This is $y = f(x)$, a cubic with turning points at $x = ${p}$ and $x = ${q}$. Which describes the graph of its gradient function, $y = f'(x)$?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -5,
            xMax: 5,
            yMin: low - pad,
            yMax: high + pad,
            curves: [{ f: (x) => cubicAt(cubic, x) }],
            marks: [
              { x: p, y: cubicAt(cubic, p) },
              { x: q, y: cubicAt(cubic, q) },
            ],
            label: 'A cubic curve with its two turning points marked',
          }),
        },
      ],
      options: turned(candidates, turnFor(4, p, q, m, cubic.d)),
      correctId: m > 0 ? 'up' : 'down',
    };
  },
  solution: (cubic) => {
    const { p, q, m } = cubic;
    return [
      {
        text: `The gradient function is zero wherever $y = f(x)$ is flat, so its graph meets the $x$-axis at the turning points, $x = ${p}$ and $x = ${q}$.`,
      },
      {
        text:
          m > 0
            ? `Left of $x = ${p}$ the curve rises, so $f'(x) > 0$. Between the turning points it falls, so $f'(x) < 0$. After $x = ${q}$ it rises again. Positive, negative, positive: a U shape.`
            : `Left of $x = ${p}$ the curve falls, so $f'(x) < 0$. Between the turning points it rises, so $f'(x) > 0$. After $x = ${q}$ it falls again. Negative, positive, negative: an upside-down U.`,
      },
      {
        text: 'The derivative of a cubic is a quadratic, which is why the graph is a parabola rather than a line or another cubic.',
        tex: `f'(x) = ${cubicFactoredTex(cubic)}`,
      },
    ];
  },
};

/** The gradient function c(x - p)(x - q), drawn, to read the original's turning points from. */
export interface ReadGradientParams {
  c: number;
  p: number;
  q: number;
}

/** [where f has its maximum, where it has its minimum]. */
export function turnsFromGradient({ c, p, q }: ReadGradientParams): [number, number] {
  // c > 0: f' is positive, negative, positive, so f rises, falls, rises.
  return c > 0 ? [p, q] : [q, p];
}

/**
 * The turning points of f, read from a graph of f'.
 *
 * The crossings are given, since the figure has no scale; what the graph
 * shows is the sign of the gradient either side of each, which is the whole
 * of deciding maximum from minimum. The learner has to read the picture as a
 * gradient rather than as a curve, which is the step that goes wrong: the
 * lowest point of the drawn parabola is not a minimum of f.
 */
const sketchReadGradient: Generator<ReadGradientParams> = {
  id: 'df-cs-read-gradient',
  sample: (rng, difficulty) => {
    const span = difficulty >= 2 ? 5 : 4;
    const [p, q] = rng.sample(between(-span, span), 2).sort((x, y) => x - y);
    return { c: rng.pick([1, 2, 3]) * rng.sign(), p, q };
  },
  render: (params): Slide => {
    const { c, p, q } = params;
    const [max, min] = turnsFromGradient(params);
    const reach = (Math.abs(c) * (q - p) ** 2) / 4;
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `This is the graph of a **gradient function**, $y = f'(x)$, not of $f$ itself. It crosses the $x$-axis at $x = ${p}$ and $x = ${q}$. Where does $y = f(x)$ have its local maximum and its local minimum?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -6,
            xMax: 6,
            yMin: -1.6 * reach,
            yMax: 1.6 * reach,
            curves: [{ f: (x) => c * (x - p) * (x - q), accent: true }],
            verticals: [{ x: 0, dashed: false }],
            marks: [
              { x: p, y: 0 },
              { x: q, y: 0 },
            ],
            label: 'The graph of a gradient function, a parabola crossing the x-axis twice',
          }),
        },
      ],
      template: '\\text{maximum at } x = {0} \\quad \\text{minimum at } x = {1}',
      bank: numberTiles([max, min], [(p + q) / 2, -p, -q, 0], 2),
      answer: [`${max}`, `${min}`],
    };
  },
  solution: (params) => {
    const { c, p, q } = params;
    const [max, min] = turnsFromGradient(params);
    return [
      { text: `$f$ has a turning point wherever $f'(x) = 0$, which is where this graph crosses the axis: $x = ${p}$ and $x = ${q}$.` },
      {
        text:
          c > 0
            ? `Left of $x = ${p}$ the graph is above the axis, so $f$ is rising. Between the crossings it is below, so $f$ is falling. After $x = ${q}$ it is above again.`
            : `Left of $x = ${p}$ the graph is below the axis, so $f$ is falling. Between the crossings it is above, so $f$ is rising. After $x = ${q}$ it is below again.`,
      },
      { text: `Rising then falling is a maximum, at $x = ${max}$. Falling then rising is a minimum, at $x = ${min}$.` },
      {
        text: `The lowest or highest point of this parabola, at $x = ${(p + q) / 2}$, is not a turning point of $f$. It is where $f$ is steepest.`,
      },
    ];
  },
};

/**
 * Where a cubic is steepest, found and slid to.
 *
 * Between its turning points a cubic is steepest at its point of inflection:
 * the gradient function is a parabola, and a parabola is at its lowest or
 * highest halfway between its roots. `evenSum` keeps that halfway point whole.
 */
const sketchSteepest: Generator<Cubic> = {
  id: 'df-cs-steepest',
  sample: (rng, difficulty) => {
    const cubic = sampleCubic(rng, difficulty, { evenSum: true, minGap: 2 });
    return difficulty < 2 && rng.chance(0.5) ? { ...cubic, m: -cubic.m } : cubic;
  },
  render: (cubic): Slide => {
    const heights = [cubicAt(cubic, cubic.p), cubicAt(cubic, cubic.q)];
    const low = Math.min(...heights);
    const high = Math.max(...heights);
    const pad = (high - low) * 0.45 + 2;
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text:
            cubic.m > 0
              ? 'Between its turning points this curve falls. Find where it falls **most steeply**, and slide to it.'
              : 'Between its turning points this curve rises. Find where it rises **most steeply**, and slide to it.',
        },
        { kind: 'display', tex: `y = ${cubicTex(cubic)}` },
      ],
      min: -5,
      max: 5,
      step: 1,
      answer: (cubic.p + cubic.q) / 2,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -5,
          xMax: 5,
          yMin: low - pad,
          yMax: high + pad,
          curves: [{ f: (x) => cubicAt(cubic, x) }],
          label: 'A cubic curve with two turning points',
        }),
        ...markerWindow(-5, 5),
      },
    };
  },
  solution: (cubic) => {
    const mid = (cubic.p + cubic.q) / 2;
    return [
      {
        text: 'How steep the curve is, is its gradient function. For a cubic that is a parabola:',
        tex: `f'(x) = ${cubicFactoredTex(cubic)}`,
      },
      {
        text: `A parabola is at its ${cubic.m > 0 ? 'lowest' : 'highest'} where its own derivative is zero, halfway between its roots $x = ${cubic.p}$ and $x = ${cubic.q}$:`,
        tex: `f''(x) = ${cubicSecondTex(cubic)} = 0`,
      },
      { tex: `x = ${mid}` },
      {
        text: `That is the curve's point of inflection. A cubic is always steepest where it changes its bend.`,
      },
    ];
  },
};

export const stationaryPointGenerators = {
  stationaryRoots,
  stationaryY,
  stationaryYTree,
  stationarySliderCubic,
  stationaryCount,
  secondDerivative,
  secondAt,
  natureFlow,
  signTiles,
  factoredNature,
  increasingAt,
  increasingTiles,
  inflectionX,
  concavity,
  inflectionFlow,
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
  stationaryRoots,
  stationaryY,
  stationaryYTree,
  stationarySliderCubic,
  stationaryCount,
  secondDerivative,
  secondAt,
  natureFlow,
  signTiles,
  factoredNature,
  increasingAt,
  increasingTiles,
  inflectionX,
  concavity,
  inflectionFlow,
  sketchRoots,
  sketchYIntercept,
  sketchSigns,
  sketchTouch,
  sketchTurn,
  sketchCrossings,
  sketchAsymptotes,
  sketchRationalY,
  sketchRationalRoot,
  sketchEnds,
  sketchSpotError,
  sketchMatch,
  sketchGradientShape,
  sketchReadGradient,
  sketchSteepest,
];
