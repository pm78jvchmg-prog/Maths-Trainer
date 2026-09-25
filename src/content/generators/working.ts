/**
 * Generators for the two widgets that show *working* rather than a final answer.
 *
 * `tree` had no generators at all and `steps` had one, so between them two of
 * the four working widgets were shipped, tested and never seen by a learner.
 * That is what this file fixes, and why it is organised by widget rather than
 * by topic: the fifteen generators here have almost nothing in common with the
 * rest of their courses and everything in common with each other, down to the
 * bank-building helpers at the top. Their UI lives together in
 * `src/ui/workingSlides.tsx` for the same reason.
 *
 * Two rules decided what each one asks, both of them about not duplicating the
 * `reduce` widget, which already evaluates arithmetic one piece at a time in
 * sixteen places:
 *
 * - A `tree` is for a computation with *shape* — two or more strands that have
 *   to be worked separately before they can be combined. A single chain of
 *   operations is what `reduce` is for.
 * - A `steps` line is a list of TeX tokens, so unlike `reduce` it can carry
 *   algebra. Every `steps` generator here reduces a *symbolic* line — index
 *   laws, surds, a completed square, a derivative — which is the one thing
 *   `reduce` cannot do at all, since its expression tree holds only numbers.
 *
 * Ids follow the `-steps` convention in `choiceVariant.ts` and extend it to
 * `-tree`: `product-rule-tree` is the product rule with its working shown, so
 * it belongs to the `product-rule` family and cannot be used to dodge the
 * repetition rule in `shapeVariety.ts`. A generator asking something no
 * existing generator asks gets a name of its own instead.
 */
import type { Generator, Slide } from '../types';
import { hashSeed } from '../../engine/rng';
import { coeffTex, nonZero, say, surdTex } from './format';
import { signedTile } from './quadratics';

/* ---------- Shared helpers ---------- */

/**
 * A deterministic scatter of a bank.
 *
 * The answers have to be mixed in among the distractors, and a shuffle drawn
 * from the rng would be wrong here for the same reason `choiceVariant` rotates
 * rather than shuffles: the deck de-duplicator compares rendered slides, so one
 * question that renders two ways could appear twice in a lesson. Sorting by a
 * hash of the token is stable, has no such cost, and reads as random.
 */
function scatter(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => hashSeed(a) - hashSeed(b));
}

/**
 * A tree's bank: every value the answer needs, plus whatever distractors are
 * genuinely different from them.
 *
 * The widget spends bank entries by value, so an answer needing the same number
 * twice needs it in the bank twice — which is why the answers go in as a
 * multiset and only the distractors are de-duplicated.
 */
function treeBank(answer: string[], distractors: string[]): string[] {
  const extras: string[] = [];
  for (const value of distractors) {
    if (answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return scatter([...answer, ...extras]);
}

/** One stage's bank: the value it collapses to, and the near misses. */
function stepBank(value: string, ...candidates: string[]): string[] {
  const bank = [value];
  for (const candidate of candidates) {
    if (!bank.includes(candidate)) bank.push(candidate);
  }
  return scatter(bank);
}

/** `+ 3` or `- 3`, for appending to a term the learner reads. */
function signed(n: number): string {
  return n < 0 ? `- ${-n}` : `+ ${n}`;
}

/** A coefficient of x as it is written by hand: 3x, -x, x. */
function xTerm(coefficient: number, power = 1): string {
  const unit = power === 1 ? 'x' : `x^{${power}}`;
  if (coefficient === 1) return unit;
  if (coefficient === -1) return `-${unit}`;
  return `${coefficient}${unit}`;
}

/** `6x + 4`, `6x - 4`, `6x`. */
function linearTex(m: number, k: number): string {
  return k === 0 ? xTerm(m) : `${xTerm(m)} ${signed(k)}`;
}

/** A column vector. */
function columnTex(top: number, bottom: number): string {
  return `\\begin{pmatrix} ${top} \\\\ ${bottom} \\end{pmatrix}`;
}

/**
 * A power of x as the learner writes it: x, x^{5}, and 1 for x^{0}.
 *
 * `x^{1}` on the last line of a simplification reads as unfinished work, which
 * is exactly what the slide has just asked the learner not to leave behind.
 */
function powerTex(n: number): string {
  if (n === 0) return '1';
  if (n === 1) return 'x';
  return `x^{${n}}`;
}

/** A scalar written in front of something: 1 disappears, -1 is a bare minus. */
function scalarTex(n: number): string {
  if (n === 1) return '';
  if (n === -1) return '-';
  return `${n}`;
}

/* ---------- Tree: evaluating a power expression ---------- */

interface PowerPair {
  base: number;
  exp: number;
  value: number;
}

/** Every small power worth putting in a question, as base^exp. */
const SMALL_POWERS: PowerPair[] = [2, 3, 4, 5, 6, 7].flatMap((base) =>
  [2, 3, 4, 5, 6]
    .map((exp) => ({ base, exp, value: Math.pow(base, exp) }))
    .filter((power) => power.value <= 250),
);

/**
 * Pairs of powers whose product stays small enough to work out in the head.
 *
 * Enumerated up front rather than drawn and rejected, because rejection would
 * leave a draw with nothing to pick from: 128 has no partner at all under a
 * ceiling of 400 once its own base is excluded.
 */
function powerPairs(ceiling: number): [PowerPair, PowerPair][] {
  return SMALL_POWERS.flatMap((left) =>
    SMALL_POWERS.filter(
      (right) => right.base !== left.base && left.value * right.value <= ceiling,
    ).map((right) => [left, right] as [PowerPair, PowerPair]),
  );
}

const POWER_PAIRS_EASY = powerPairs(400);
const POWER_PAIRS_HARD = powerPairs(2500);

interface PowerTreeParams {
  left: PowerPair;
  right: PowerPair;
  add: number;
}

/**
 * a^m x b^n + c, as a tree.
 *
 * The two powers are independent strands — neither can wait for the other —
 * which is exactly what a tree shows and a line of working does not.
 */
const powersTree: Generator<PowerTreeParams> = {
  id: 'idx-powers-tree',
  sample: (rng, difficulty) => {
    const [left, right] = rng.pick(difficulty > 1 ? POWER_PAIRS_HARD : POWER_PAIRS_EASY);
    return { left, right, add: rng.int(2, difficulty > 1 ? 24 : 12) };
  },
  render: ({ left, right, add }): Slide => {
    const product = left.value * right.value;
    const answer = [`${left.value}`, `${right.value}`, `${product}`, `${product + add}`];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Work out each power first, then multiply them, then add. Fill the tree from the bottom up.',
        ),
      ],
      expression: `${left.base}^{${left.exp}} \\times ${right.base}^{${right.exp}} + ${add}`,
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'product', from: ['left', 'right'] },
        { id: 'total', from: ['product'] },
      ],
      bank: treeBank(answer, [
        `${left.base * left.exp}`,
        `${right.base * right.exp}`,
        `${left.value + right.value}`,
        `${product * add}`,
        `${product - add}`,
      ]),
      answer,
    };
  },
  solution: ({ left, right, add }) => [
    {
      text: `A power is a pile of copies, so $${left.base}^{${left.exp}}$ is ${left.exp} copies of ${left.base} multiplied together.`,
    },
    {
      tex: `${left.base}^{${left.exp}} = ${left.value} \\qquad ${right.base}^{${right.exp}} = ${right.value}`,
    },
    { text: 'The multiplication comes before the addition, so the two powers meet first.' },
    {
      tex: `${left.value} \\times ${right.value} = ${left.value * right.value} \\implies ${left.value * right.value} + ${add} = ${left.value * right.value + add}`,
    },
    {
      text: `Multiplying the base by the index is the usual slip: $${left.base}^{${left.exp}}$ is ${left.value}, not ${left.base * left.exp}.`,
    },
  ],
};

/* ---------- Tree: a quadratic at a value of x ---------- */

interface QuadraticTreeParams {
  a: number;
  b: number;
  c: number;
  k: number;
}

/**
 * Substituting x = k into ax^2 + bx + c.
 *
 * The square and the linear term are separate strands that meet at the top,
 * which is the thing a learner gets wrong here: ak^2 is not (ak)^2, and the
 * tree puts the square strictly below the multiplication that uses it.
 */
const quadraticTree: Generator<QuadraticTreeParams> = {
  id: 'quad-evaluate-tree',
  sample: (rng, difficulty) => ({
    // From 2: at a = 1 the scaling node repeats the square and (ak)^2 is no slip.
    a: rng.int(2, difficulty > 1 ? 5 : 3),
    b: nonZero(rng, difficulty > 1 ? 9 : 6),
    c: nonZero(rng, difficulty > 1 ? 12 : 9),
    k: nonZero(rng, difficulty > 1 ? 6 : 4),
  }),
  render: ({ a, b, c, k }): Slide => {
    const square = k * k;
    const quadratic = a * square;
    const linear = b * k;
    const total = quadratic + linear + c;
    const answer = [`${square}`, `${linear}`, `${quadratic}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Substitute $x = ${k}$, from the bottom up: $x^{2}$ and the $x$ term, then $${a}x^{2}$, then the whole thing with the constant.`,
        ),
      ],
      expression: `${xTerm(a, 2)} ${signedTile(b, 'x')} ${signed(c)}`,
      nodes: [
        { id: 'square', from: [] },
        { id: 'linear', from: [] },
        { id: 'scaled', from: ['square'] },
        { id: 'total', from: ['scaled', 'linear'] },
      ],
      bank: treeBank(answer, [
        `${a * k * a * k}`,
        `${2 * k}`,
        `${quadratic + linear}`,
        `${quadratic - linear + c}`,
        `${total + c}`,
        `${total - 1}`,
      ]),
      answer,
    };
  },
  solution: ({ a, b, c, k }) => [
    { text: `The square happens before anything multiplies it.` },
    { tex: `(${k})^{2} = ${k * k} \\implies ${a} \\times ${k * k} = ${a * k * k}` },
    { text: 'The $x$ term is its own strand, and the constant just joins at the end.' },
    {
      tex: `${b} \\times ${k} = ${b * k} \\implies ${a * k * k} ${signed(b * k)} ${signed(c)} = ${a * k * k + b * k + c}`,
    },
    {
      text: `Squaring the $${a}x$ instead would give ${a * k * a * k}, which is the commonest way to get this wrong.`,
    },
  ],
};

/* ---------- Tree: two logarithms ---------- */

interface LogValue {
  base: number;
  exp: number;
  value: number;
}

const LOG_VALUES: LogValue[] = [2, 3, 4, 5, 10].flatMap((base) =>
  [1, 2, 3, 4, 5, 6]
    .map((exp) => ({ base, exp, value: Math.pow(base, exp) }))
    .filter((entry) => entry.value <= 1000),
);

interface LogTreeParams {
  left: LogValue;
  right: LogValue;
  subtract: boolean;
}

/** log_b(x) and log_c(y), worked separately and then combined. */
const logarithmTree: Generator<LogTreeParams> = {
  id: 'log-sum-tree',
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? LOG_VALUES : LOG_VALUES.filter((entry) => entry.value <= 200);
    return {
      left: rng.pick(pool),
      right: rng.pick(pool),
      subtract: difficulty > 1 ? rng.chance(0.5) : false,
    };
  },
  render: ({ left, right, subtract }): Slide => {
    const total = subtract ? left.exp - right.exp : left.exp + right.exp;
    const answer = [`${left.exp}`, `${right.exp}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Each logarithm asks what power the base is raised to. Work out both, then combine them.',
        ),
      ],
      expression: `\\log_{${left.base}}(${left.value}) ${subtract ? '-' : '+'} \\log_{${right.base}}(${right.value})`,
      nodes: [
        { id: 'left', from: [] },
        { id: 'right', from: [] },
        { id: 'total', from: ['left', 'right'] },
      ],
      // Exponents are small numbers, so a distractor built from them lands on
      // one of the three answers surprisingly often. The values themselves
      // never do, which is what keeps the bank honest at the bottom of the
      // range.
      bank: treeBank(answer, [
        `${left.value}`,
        `${right.value}`,
        `${left.value + right.value}`,
        `${left.exp + 1}`,
        `${right.exp + 1}`,
        `${total + 1}`,
      ]),
      answer,
    };
  },
  solution: ({ left, right, subtract }) => [
    { text: 'Read each logarithm as a question about a power.' },
    {
      tex: `${left.base}^{${left.exp}} = ${left.value} \\implies \\log_{${left.base}}(${left.value}) = ${left.exp}`,
    },
    {
      tex: `${right.base}^{${right.exp}} = ${right.value} \\implies \\log_{${right.base}}(${right.value}) = ${right.exp}`,
    },
    {
      text: `${subtract ? 'Subtracting' : 'Adding'} the two answers gives $${subtract ? left.exp - right.exp : left.exp + right.exp}$. The laws of logarithms do not apply here — the bases are read separately because each logarithm is just a number.`,
    },
  ],
};

/* ---------- Tree: a wave at an angle ---------- */

interface ExactSine {
  degrees: number;
  tex: string;
  half: number;
}

/**
 * Angles whose sine is exactly +-1 or +-1/2, paired with twice that sine so the
 * arithmetic stays in integers until it is written out.
 *
 * The zeros are left out deliberately: a sine of 0 makes the product 0 too, and
 * a tree with the same value in two slots reads as a mistake.
 */
const EXACT_SINES: ExactSine[] = [
  { degrees: 30, tex: '\\frac{1}{2}', half: 1 },
  { degrees: 90, tex: '1', half: 2 },
  { degrees: 150, tex: '\\frac{1}{2}', half: 1 },
  { degrees: 210, tex: '-\\frac{1}{2}', half: -1 },
  { degrees: 270, tex: '-1', half: -2 },
  { degrees: 330, tex: '-\\frac{1}{2}', half: -1 },
];

interface WaveArgument {
  sine: ExactSine;
  b: number;
  c: number;
  x: number;
}

/** Arguments bx + c that land on an exact angle at a whole value of x. */
const WAVE_ARGUMENTS: WaveArgument[] = EXACT_SINES.flatMap((sine) =>
  [2, 3].flatMap((b) =>
    [0, 30, 60, 90].flatMap((c) => {
      const x = (sine.degrees - c) / b;
      return Number.isInteger(x) && x > 0 ? [{ sine, b, c, x }] : [];
    }),
  ),
);

interface WaveTreeParams {
  argument: WaveArgument;
  amplitude: number;
  shift: number;
}

/**
 * a sin(bx + c) + d at a value of x.
 *
 * The argument is a node of its own, because the whole point of the level is
 * that the bracket is worked out before the sine and the sine before anything
 * multiplying it.
 */
const waveTree: Generator<WaveTreeParams> = {
  id: 'trig-evaluate-wave-tree',
  sample: (rng, difficulty) => ({
    argument: rng.pick(WAVE_ARGUMENTS),
    amplitude: rng.int(1, difficulty > 1 ? 5 : 4) * 2,
    shift: nonZero(rng, difficulty > 1 ? 9 : 6),
  }),
  render: ({ argument, amplitude, shift }): Slide => {
    const { sine, b, c, x } = argument;
    const scaled = (amplitude * sine.half) / 2;
    const total = scaled + shift;
    const answer = [`${sine.degrees}^{\\circ}`, sine.tex, `${scaled}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Work out the value at $x = ${x}$, from the bottom up: the bracket, its sine, then $\\times ${amplitude}$, then the shift.`,
        ),
      ],
      expression: `${amplitude}\\sin((${c === 0 ? `${b}x` : `${b}x ${signed(c)}`})^{\\circ}) ${signed(shift)}`,
      nodes: [
        { id: 'angle', from: [] },
        { id: 'sine', from: ['angle'] },
        { id: 'scaled', from: ['sine'] },
        { id: 'total', from: ['scaled'] },
      ],
      bank: treeBank(answer, [
        `${b * x}^{\\circ}`,
        `${sine.degrees + 30}^{\\circ}`,
        `${-scaled}`,
        `${total + 1}`,
        sine.half > 0 ? '-\\frac{1}{2}' : '\\frac{1}{2}',
      ]),
      answer,
    };
  },
  solution: ({ argument, amplitude, shift }) => {
    const { sine, b, c, x } = argument;
    const scaled = (amplitude * sine.half) / 2;
    return [
      { text: 'The bracket is worked out first — everything else waits on it.' },
      { tex: `${b}(${x}) ${signed(c)} = ${sine.degrees}^{\\circ}` },
      { text: 'Then the sine of that angle, and only then the amplitude.' },
      {
        tex: `\\sin(${sine.degrees}^{\\circ}) = ${sine.tex} \\implies ${amplitude} \\times ${sine.tex} = ${scaled}`,
      },
      {
        text: `The shift is outside the sine, so it is added last: $${scaled} ${signed(shift)} = ${scaled + shift}$.`,
      },
    ];
  },
};

/* ---------- Tree: the discriminant of a quadratic with complex roots ---------- */

interface ComplexDiscriminant {
  a: number;
  b: number;
  c: number;
  discriminant: number;
  root: number;
}

/** Quadratics with no real roots whose discriminant has a whole square root. */
const COMPLEX_DISCRIMINANTS: ComplexDiscriminant[] = (() => {
  const found: ComplexDiscriminant[] = [];
  for (let a = 1; a <= 3; a += 1) {
    for (let b = -9; b <= 9; b += 1) {
      for (let c = 1; c <= 20; c += 1) {
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) continue;
        const root = Math.round(Math.sqrt(-discriminant));
        if (root * root === -discriminant && root <= 12) {
          found.push({ a, b, c, discriminant, root });
        }
      }
    }
  }
  return found;
})();

const SIMPLE_DISCRIMINANTS = COMPLEX_DISCRIMINANTS.filter((entry) => entry.a === 1);

/** The imaginary part of a root: i, 5i, never 1i. */
function imaginaryTex(k: number): string {
  if (k === 1) return 'i';
  if (k === -1) return '-i';
  return `${k}i`;
}

/** b^2 - 4ac when it is negative, and its square root as an imaginary number. */
const discriminantTree: Generator<ComplexDiscriminant> = {
  id: 'complex-discriminant-tree',
  sample: (rng, difficulty) =>
    rng.pick(difficulty > 1 ? COMPLEX_DISCRIMINANTS : SIMPLE_DISCRIMINANTS),
  render: ({ a, b, c, discriminant, root }): Slide => {
    const square = b * b;
    const product = 4 * a * c;
    const answer = [`${square}`, `${product}`, `${discriminant}`, imaginaryTex(root)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `This quadratic has no real roots. Work out $b^{2}$ and $4ac$, then the discriminant, then its square root.`,
        ),
      ],
      expression: `\\sqrt{(${b})^{2} - 4(${a})(${c})}`,
      nodes: [
        { id: 'square', from: [] },
        { id: 'product', from: [] },
        { id: 'discriminant', from: ['square', 'product'] },
        { id: 'root', from: ['discriminant'] },
      ],
      bank: treeBank(answer, [
        `${2 * b}`,
        `${a * c}`,
        `${-discriminant}`,
        `${root}`,
        imaginaryTex(-root),
        imaginaryTex(root + 1),
      ]),
      answer,
    };
  },
  solution: ({ a, b, c, discriminant, root }) => [
    { text: 'Square the whole of $b$, sign included, before anything else.' },
    { tex: `(${b})^{2} = ${b * b} \\qquad 4(${a})(${c}) = ${4 * a * c}` },
    { text: 'A negative discriminant is the signal that the roots are complex.' },
    { tex: `${b * b} - ${4 * a * c} = ${discriminant}` },
    {
      text: `Then $\\sqrt{${discriminant}} = \\sqrt{${-discriminant}} \\times \\sqrt{-1} = ${imaginaryTex(root)}$, because $i$ is what a square root of a negative number is for.`,
    },
  ],
};

/* ---------- Tree: the product rule ---------- */

interface ProductTreeParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * Differentiating (ax + b)(cx + d) with the product rule.
 *
 * The one generator here whose nodes hold algebra rather than numbers, and the
 * reason the tree earns its place in this lesson: u'v and uv' are two strands
 * built from different halves of the question, and a learner who writes u'v'
 * has made a structural mistake rather than an arithmetic one.
 */
const productRuleTree: Generator<ProductTreeParams> = {
  id: 'product-rule-tree',
  sample: (rng, difficulty) => {
    const a = rng.int(1, difficulty > 1 ? 6 : 4);
    const c = rng.int(1, difficulty > 1 ? 6 : 4);
    const b = nonZero(rng, difficulty > 1 ? 8 : 6);
    let d = nonZero(rng, difficulty > 1 ? 8 : 6);
    // Equal cross terms would put the same expression in both middle slots,
    // which hides the very difference the slide is about.
    if (a * d === b * c) d = d > 0 ? d + 1 : d - 1;
    return { a, b, c, d };
  },
  render: ({ a, b, c, d }): Slide => {
    const first = linearTex(a * c, a * d);
    const second = linearTex(a * c, b * c);
    const total = linearTex(2 * a * c, a * d + b * c);
    const answer = [`${a}`, `${c}`, first, second, total];
    return {
      kind: 'tree',
      prompt: [
        say(
          `With $u = ${linearTex(a, b)}$ and $v = ${linearTex(c, d)}$: the bottom row is $u'$ then $v'$, the middle row is $u'v$ then $uv'$, and the top is their sum.`,
        ),
      ],
      expression: `y = (${linearTex(a, b)})(${linearTex(c, d)})`,
      nodes: [
        { id: 'du', from: [] },
        { id: 'dv', from: [] },
        { id: 'first', from: ['du'] },
        { id: 'second', from: ['dv'] },
        { id: 'total', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [
        `${a * c}`,
        `${a + c}`,
        `${a + 1}`,
        linearTex(a * c, b * d),
        linearTex(2 * a * c, a * d - b * c),
      ]),
      answer,
    };
  },
  solution: ({ a, b, c, d }) => [
    { text: 'Differentiate each bracket on its own first. The constants disappear.' },
    { tex: `u = ${linearTex(a, b)} \\implies u' = ${a} \\qquad v = ${linearTex(c, d)} \\implies v' = ${c}` },
    { text: 'The product rule pairs each derivative with the **other** bracket, untouched.' },
    {
      tex: `u'v = ${linearTex(a * c, a * d)} \\qquad uv' = ${linearTex(a * c, b * c)}`,
    },
    {
      text: `Adding them gives $${linearTex(2 * a * c, a * d + b * c)}$. Multiplying the two derivatives instead would give ${a * c}, which is missing every $x$ the question had.`,
    },
  ],
};

/* ---------- Tree: integrating a sum ---------- */

interface IntegralTreeParams {
  coefficient: number;
  power: number;
  constant: number;
}

/** Integrating ax^n + b term by term, with the constant of integration on top. */
const integralTree: Generator<IntegralTreeParams> = {
  id: 'int-sum-tree',
  sample: (rng, difficulty) => {
    const power = rng.int(1, difficulty > 1 ? 5 : 3);
    return {
      power,
      // Divisible by n + 1, so the integrated coefficient is a whole number
      // rather than a fraction the tree would have to carry in every bank.
      coefficient: rng.int(1, difficulty > 1 ? 8 : 5) * (power + 1),
      constant: nonZero(rng, difficulty > 1 ? 12 : 9),
    };
  },
  render: ({ coefficient, power, constant }): Slide => {
    const raised = coefficient / (power + 1);
    const first = xTerm(raised, power + 1);
    const second = xTerm(constant);
    const total = `${first} ${signedTile(constant, 'x')} + C`;
    const answer = [first, second, total];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Integrate each term on its own, then put them together. Only one constant of integration is needed, at the top.',
        ),
      ],
      expression: `\\int (${xTerm(coefficient, power)} ${signed(constant)}) \\, dx`,
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'total', from: ['first', 'second'] },
      ],
      bank: treeBank(answer, [
        xTerm(coefficient, power + 1),
        xTerm(raised, power),
        `${constant}`,
        `${first} ${signedTile(constant, 'x')}`,
        `${xTerm(coefficient, power + 1)} ${signedTile(constant, 'x')} + C`,
      ]),
      answer,
    };
  },
  solution: ({ coefficient, power, constant }) => [
    { text: 'Raise the index by one, then divide by the new index.' },
    {
      tex: `\\int ${xTerm(coefficient, power)} \\, dx = \\frac{${coefficient}x^{${power + 1}}}{${power + 1}} = ${xTerm(coefficient / (power + 1), power + 1)}`,
    },
    { text: 'A constant integrates to itself times $x$.' },
    { tex: `\\int ${signed(constant)} \\, dx = ${xTerm(constant)}` },
    {
      text: `The $+ C$ goes on once, at the end. Dividing is the step people drop: $${xTerm(coefficient, power + 1)}$ would differentiate back to $${xTerm(coefficient * (power + 1), power)}$, not to the question.`,
    },
  ],
};

/* ---------- Tree: combining two column vectors ---------- */

interface VectorTreeParams {
  p: number;
  q: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Each component worked separately, then assembled into one vector. */
const vectorTree: Generator<VectorTreeParams> = {
  id: 'vec-add-tree',
  sample: (rng, difficulty) => ({
    p: difficulty > 1 ? rng.int(2, 4) : 1,
    q: difficulty > 1 ? rng.int(2, 4) * rng.sign() : 1,
    a: nonZero(rng, 7),
    b: nonZero(rng, 7),
    c: nonZero(rng, 7),
    d: nonZero(rng, 7),
  }),
  render: ({ p, q, a, b, c, d }): Slide => {
    const top = p * a + q * c;
    const bottom = p * b + q * d;
    const answer = [`${top}`, `${bottom}`, columnTex(top, bottom)];
    return {
      kind: 'tree',
      prompt: [
        say(
          'A vector sum is two separate sums. Work out the top component, then the bottom one, then put them together.',
        ),
      ],
      expression: `${scalarTex(p)}${columnTex(a, b)} ${q < 0 ? '-' : '+'} ${scalarTex(Math.abs(q))}${columnTex(c, d)}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'vector', from: ['top', 'bottom'] },
      ],
      bank: treeBank(answer, [
        `${p * a - q * c}`,
        `${top + 1}`,
        `${bottom - 1}`,
        columnTex(top + 1, bottom),
        columnTex(top, bottom - 1),
      ]),
      answer,
    };
  },
  solution: ({ p, q, a, b, c, d }) => [
    { text: 'The components never mix: the top of one vector only ever meets the top of the other.' },
    { tex: `${p} \\times (${a}) ${signed(q * c)} = ${p * a + q * c}` },
    { tex: `${p} \\times (${b}) ${signed(q * d)} = ${p * b + q * d}` },
    {
      text: `So the answer is $${columnTex(p * a + q * c, p * b + q * d)}$. Adding all four numbers into one would be answering a different question — the result of adding two vectors is a vector.`,
    },
  ],
};

/* ---------- Steps: the index laws ---------- */

interface IndexLawParams {
  a: number;
  b: number;
  c: number;
}

/** x^a times x^b divided by x^c, one law at a time. */
const indexLawSteps: Generator<IndexLawParams> = {
  id: 'idx-laws-steps',
  sample: (rng, difficulty) => {
    const a = rng.int(2, difficulty > 1 ? 9 : 6);
    const b = rng.int(2, difficulty > 1 ? 9 : 6);
    // At difficulty 1 the answer stays a positive power; at difficulty 2 the
    // division may take it past zero, which is the negative-index lesson.
    const c = difficulty > 1 ? rng.int(2, a + b + 4) : rng.int(1, a + b - 1);
    return { a, b, c };
  },
  render: ({ a, b, c }): Slide => ({
    kind: 'steps',
    prompt: [
      say(
        'Simplify one law at a time. Tap the part you would do **next**, then choose what it comes to.',
      ),
    ],
    start: [powerTex(a), '\\times', powerTex(b), '\\div', powerTex(c)],
    reductions: [
      {
        span: [0, 3],
        value: powerTex(a + b),
        bank: stepBank(
          powerTex(a + b),
          powerTex(a * b),
          powerTex(a - b),
          powerTex(a + b + c),
          powerTex(b - a),
        ),
      },
      {
        span: [0, 3],
        value: powerTex(a + b - c),
        bank: stepBank(
          powerTex(a + b - c),
          powerTex(a + b + c),
          powerTex(c - a - b),
          powerTex(a + b),
          powerTex((a + b) * c),
        ),
      },
    ],
  }),
  solution: ({ a, b, c }) => [
    { text: 'Multiplying powers of the same base adds the indices — count the copies.' },
    { tex: `${powerTex(a)} \\times ${powerTex(b)} = ${powerTex(a + b)}` },
    { text: 'Dividing subtracts, top index minus bottom one.' },
    { tex: `${powerTex(a + b)} \\div ${powerTex(c)} = ${powerTex(a + b - c)}` },
    {
      text:
        a + b - c < 0
          ? `A negative index is a perfectly good answer: $x^{${a + b - c}}$ means $\\frac{1}{x^{${c - a - b}}}$.`
          : `Multiplying the indices instead of adding them is the classic slip: that would give $${powerTex(a * b)}$.`,
    },
  ],
};

/* ---------- Steps: adding surds ---------- */

const SURD_BASES = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

interface SurdAddParams {
  m: number;
  p: number;
  q: number;
}

/** sqrt(A) + sqrt(B) where both simplify to multiples of the same surd. */
const surdAddSteps: Generator<SurdAddParams> = {
  id: 'rad-add-steps',
  sample: (rng, difficulty) => {
    const ceiling = difficulty > 1 ? 7 : 5;
    const p = rng.int(1, ceiling);
    let q = rng.int(1, ceiling);
    // Equal multipliers would make both stages read identically, which teaches
    // nothing the first stage has not already taught.
    if (q === p) q = p === 1 ? 2 : p - 1;
    return { m: rng.pick(SURD_BASES), p, q };
  },
  render: ({ m, p, q }): Slide => {
    const left = p * p * m;
    const right = q * q * m;
    const sum = `${p + q}\\sqrt{${m}}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Two surds only add when the number under the root matches. Simplify each one first. Tap the part you would do **next**, then choose what it comes to.',
        ),
      ],
      start: [`\\sqrt{${left}}`, '+', `\\sqrt{${right}}`],
      reductions: [
        {
          span: [0, 1],
          value: surdTex(left),
          bank: stepBank(
            surdTex(left),
            coeffTex(p, `\\sqrt{${p * m}}`),
            `${p * m}\\sqrt{${m}}`,
            `${m}\\sqrt{${p}}`,
            `\\sqrt{${p * m}}`,
          ),
        },
        {
          span: [2, 3],
          value: surdTex(right),
          bank: stepBank(
            surdTex(right),
            coeffTex(q, `\\sqrt{${q * m}}`),
            `${q * m}\\sqrt{${m}}`,
            `${m}\\sqrt{${q}}`,
            `\\sqrt{${q * m}}`,
          ),
        },
        {
          span: [0, 3],
          value: sum,
          bank: stepBank(
            sum,
            `${p * q}\\sqrt{${m}}`,
            `${p + q}\\sqrt{${2 * m}}`,
            `\\sqrt{${left + right}}`,
            `${p + q + m}`,
          ),
        },
      ],
    };
  },
  solution: ({ m, p, q }) => [
    { text: 'Pull the largest square out of each root.' },
    {
      tex: `\\sqrt{${p * p * m}} = \\sqrt{${p * p}} \\times \\sqrt{${m}} = ${surdTex(p * p * m)}`,
    },
    {
      tex: `\\sqrt{${q * q * m}} = \\sqrt{${q * q}} \\times \\sqrt{${m}} = ${surdTex(q * q * m)}`,
    },
    {
      text: `Now both are multiples of $\\sqrt{${m}}$, so they add like anything else: $${p + q}\\sqrt{${m}}$.`,
    },
    {
      text: `Adding the numbers under the roots is the trap — $\\sqrt{${p * p * m}} + \\sqrt{${q * q * m}}$ is not $\\sqrt{${p * p * m + q * q * m}}$.`,
    },
  ],
};

/* ---------- Steps: completing the square ---------- */

interface CompleteSquareParams {
  half: number;
  c: number;
}

/** x^2 + bx + c into (x + p)^2 + q, in two moves. */
const completeSquareSteps: Generator<CompleteSquareParams> = {
  id: 'quad-complete-square-steps',
  sample: (rng, difficulty) => {
    const half = nonZero(rng, difficulty > 1 ? 7 : 5);
    let c = nonZero(rng, difficulty > 1 ? 16 : 12);
    // q = 0 would leave a bare square, and the second stage would have nothing
    // to add.
    if (c === half * half) c += 1;
    return { half, c };
  },
  render: ({ half, c }): Slide => {
    const b = 2 * half;
    const square = half * half;
    const bracket = `(x ${signed(half)})^{2}`;
    const opened = `${bracket} - ${square}`;
    const finished = `${bracket} ${signed(c - square)}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Complete the square. Tap the part you would do **next**, then choose what it comes to.',
        ),
      ],
      start: [`x^{2} ${signed(b)}x`, c < 0 ? '-' : '+', `${Math.abs(c)}`],
      reductions: [
        {
          span: [0, 1],
          value: opened,
          bank: stepBank(
            opened,
            bracket,
            `(x ${signed(b)})^{2} - ${b * b}`,
            `${bracket} + ${square}`,
            `(x ${signed(-half)})^{2} - ${square}`,
          ),
        },
        {
          span: [0, 3],
          value: finished,
          bank: stepBank(
            finished,
            // At c = -square this slip leaves the bare square, not (x + a)^2 + 0.
            c + square === 0 ? bracket : `${bracket} ${signed(c + square)}`,
            `${bracket} ${signed(square - c)}`,
            `${bracket} ${signed(c)}`,
            `(x ${signed(b)})^{2} ${signed(c - square)}`,
          ),
        },
      ],
    };
  },
  solution: ({ half, c }) => [
    { text: 'Halve the coefficient of $x$ — that number goes inside the bracket.' },
    { tex: `x^{2} ${signed(2 * half)}x = (x ${signed(half)})^{2} - ${half * half}` },
    {
      text: `Squaring the bracket would give an extra $${half * half}$, so it is taken straight back off.`,
    },
    { tex: `(x ${signed(half)})^{2} - ${half * half} ${signed(c)} = (x ${signed(half)})^{2} ${signed(c - half * half)}` },
    {
      text: `The bracket holds ${half}, not ${2 * half}: it is *half* the coefficient of $x$, and forgetting to halve it is the commonest error here.`,
    },
  ],
};

/* ---------- Steps: the addition law for logarithms ---------- */

interface LogSplit {
  base: number;
  exp: number;
  product: number;
  x: number;
  y: number;
}

/** Products of a power of the base, split two ways. */
const LOG_SPLITS: LogSplit[] = LOG_VALUES.filter((entry) => entry.exp >= 2).flatMap(
  ({ base, exp, value }) => {
    const splits: LogSplit[] = [];
    for (let x = 2; x < value; x += 1) {
      if (value % x === 0) splits.push({ base, exp, product: value, x, y: value / x });
    }
    return splits;
  },
);

const EASY_LOG_SPLITS = LOG_SPLITS.filter((split) => split.product <= 200);

/** log_b(x) + log_b(y): combine with the law, then read the power off. */
const logCombineSteps: Generator<LogSplit> = {
  id: 'log-combine-steps',
  sample: (rng, difficulty) => rng.pick(difficulty > 1 ? LOG_SPLITS : EASY_LOG_SPLITS),
  render: ({ base, exp, product, x, y }): Slide => ({
    kind: 'steps',
    prompt: [
      say(
        'Use the addition law to make this one logarithm, then read off its value. Tap the part you would do **next**, then choose what it comes to.',
      ),
    ],
    start: [`\\log_{${base}}(${x})`, '+', `\\log_{${base}}(${y})`],
    reductions: [
      {
        span: [0, 3],
        value: `\\log_{${base}}(${product})`,
        bank: stepBank(
          `\\log_{${base}}(${product})`,
          `\\log_{${base}}(${x + y})`,
          `\\log_{${base * base}}(${product})`,
          `2\\log_{${base}}(${product})`,
          `\\log_{${base}}(${x})\\log_{${base}}(${y})`,
        ),
      },
      {
        span: [0, 1],
        value: `${exp}`,
        bank: stepBank(`${exp}`, `${product}`, `${exp + 1}`, `${base}`, `${exp * base}`),
      },
    ],
  }),
  solution: ({ base, exp, product, x, y }) => [
    { text: 'Adding two logarithms of the same base multiplies what is inside them.' },
    { tex: `\\log_{${base}}(${x}) + \\log_{${base}}(${y}) = \\log_{${base}}(${x} \\times ${y}) = \\log_{${base}}(${product})` },
    { text: 'Then the logarithm is just asking for a power.' },
    { tex: `${base}^{${exp}} = ${product} \\implies \\log_{${base}}(${product}) = ${exp}` },
    {
      text: `Adding what is inside the brackets is the mistake to avoid: that would be $\\log_{${base}}(${x + y})$, a different number entirely.`,
    },
  ],
};

/* ---------- Steps: powers of i ---------- */

interface PowerOfIParams {
  turns: number;
  remainder: number;
}

/** What i^n comes to, by splitting off whole turns of four. */
const powersOfISteps: Generator<PowerOfIParams> = {
  id: 'powers-of-i-steps',
  sample: (rng, difficulty) => ({
    turns: rng.int(difficulty > 1 ? 6 : 1, difficulty > 1 ? 30 : 12),
    remainder: rng.int(1, 3),
  }),
  render: ({ turns, remainder }): Slide => {
    const cycles = turns * 4;
    const value = ['i', '-1', '-i'][remainder - 1];
    return {
      kind: 'steps',
      prompt: [
        say(
          `Every four powers of $i$ come back to 1, so $i^{${cycles + remainder}}$ splits into whole turns and a remainder. Tap the part you would do **next**, then choose what it comes to.`,
        ),
        { kind: 'display', tex: `i^{${cycles + remainder}} = i^{${cycles}} \\times i^{${remainder}}` },
      ],
      start: [`i^{${cycles}}`, '\\times', `i^{${remainder}}`],
      reductions: [
        { span: [0, 1], value: '1', bank: stepBank('1', '-1', 'i', '-i', '0') },
        { span: [2, 3], value, bank: stepBank(value, '1', '-1', 'i', '-i') },
        { span: [0, 3], value, bank: stepBank(value, '1', '-1', 'i', '-i') },
      ],
    };
  },
  solution: ({ turns, remainder }) => {
    const value = ['i', '-1', '-i'][remainder - 1];
    return [
      { text: `$i^{4}$ is 1, so $${turns}$ whole turns leave nothing behind.` },
      { tex: `i^{${turns * 4}} = (i^{4})^{${turns}} = 1` },
      { text: 'What is left is the remainder, and there are only ever four answers.' },
      { tex: `i^{1} = i \\quad i^{2} = -1 \\quad i^{3} = -i \\quad i^{4} = 1` },
      {
        text: `Here the remainder is ${remainder}, so $i^{${turns * 4 + remainder}} = ${value}$. Dividing the index by 4 and keeping the remainder is the whole method.`,
      },
    ];
  },
};

/* ---------- Steps: the chain rule ---------- */

interface ChainStepsParams {
  a: number;
  b: number;
  n: number;
}

/** Differentiating (ax + b)^n: outside first, then the inside's derivative. */
const chainRuleSteps: Generator<ChainStepsParams> = {
  id: 'chain-rule-steps',
  sample: (rng, difficulty) => ({
    a: rng.int(2, difficulty > 1 ? 9 : 6),
    b: nonZero(rng, difficulty > 1 ? 9 : 7),
    n: rng.int(2, difficulty > 1 ? 8 : 5),
  }),
  render: ({ a, b, n }): Slide => {
    const inner = `(${linearTex(a, b)})`;
    const opened = `${n}${inner}^{${n - 1}} \\times ${a}`;
    const tidied = `${n * a}${inner}^{${n - 1}}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Differentiate with the chain rule, one move at a time. Tap the expression, then choose what it comes to.',
        ),
      ],
      start: [`${inner}^{${n}}`],
      reductions: [
        {
          span: [0, 1],
          value: opened,
          bank: stepBank(
            opened,
            `${n}${inner}^{${n - 1}}`,
            `${inner}^{${n - 1}} \\times ${a}`,
            `${n}${inner}^{${n}} \\times ${a}`,
            `${n}(${a})^{${n - 1}}`,
          ),
        },
        {
          span: [0, 1],
          value: tidied,
          bank: stepBank(
            tidied,
            `${n + a}${inner}^{${n - 1}}`,
            `${n * a}${inner}^{${n}}`,
            `${a}${inner}^{${n - 1}}`,
            `${n * a}${inner}^{${n + 1}}`,
          ),
        },
      ],
    };
  },
  solution: ({ a, b, n }) => [
    { text: 'Differentiate the outside first, leaving the bracket exactly as it is.' },
    { tex: `\\frac{d}{dx}(${linearTex(a, b)})^{${n}} = ${n}(${linearTex(a, b)})^{${n - 1}} \\times \\frac{d}{dx}(${linearTex(a, b)})` },
    { text: 'The inside differentiates to its own gradient, and the constant goes.' },
    { tex: `${n}(${linearTex(a, b)})^{${n - 1}} \\times ${a} = ${n * a}(${linearTex(a, b)})^{${n - 1}}` },
    {
      text: `Leaving off the $\\times ${a}$ is what the chain rule exists to prevent — the bracket changes ${a} times as fast as $x$ does.`,
    },
  ],
};

/* ---------- Steps: combining column vectors ---------- */

interface VectorStepsParams {
  p: number;
  q: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

/** pA + qB, scaling each vector before adding them. */
const vectorCombineSteps: Generator<VectorStepsParams> = {
  id: 'vec-scalar-combine-steps',
  sample: (rng, difficulty) => ({
    p: rng.int(2, difficulty > 1 ? 6 : 4),
    q: rng.int(2, difficulty > 1 ? 6 : 4) * (difficulty > 1 ? rng.sign() : 1),
    a: nonZero(rng, 6),
    b: nonZero(rng, 6),
    c: nonZero(rng, 6),
    d: nonZero(rng, 6),
  }),
  render: ({ p, q, a, b, c, d }): Slide => {
    const scale = Math.abs(q);
    const left = columnTex(p * a, p * b);
    const right = columnTex(scale * c, scale * d);
    const total = columnTex(p * a + q * c, p * b + q * d);
    return {
      kind: 'steps',
      prompt: [
        say(
          'Multiply each vector out before combining them. Tap the part you would do **next**, then choose what it comes to.',
        ),
      ],
      start: [`${p}${columnTex(a, b)}`, q < 0 ? '-' : '+', `${scale}${columnTex(c, d)}`],
      reductions: [
        {
          span: [0, 1],
          value: left,
          bank: stepBank(
            left,
            columnTex(p * a, b),
            columnTex(p + a, p + b),
            columnTex(p * b, p * a),
            columnTex(a, b),
          ),
        },
        {
          span: [2, 3],
          value: right,
          bank: stepBank(
            right,
            columnTex(scale * c, d),
            columnTex(scale + c, scale + d),
            columnTex(scale * d, scale * c),
            columnTex(c, d),
          ),
        },
        {
          span: [0, 3],
          value: total,
          bank: stepBank(
            total,
            columnTex(p * a - q * c, p * b - q * d),
            columnTex(p * b + q * d, p * a + q * c),
            columnTex(a + c, b + d),
            columnTex(p * a + q * d, p * b + q * c),
          ),
        },
      ],
    };
  },
  solution: ({ p, q, a, b, c, d }) => [
    { text: 'A scalar multiplies every component, not just the first.' },
    { tex: `${p}${columnTex(a, b)} = ${columnTex(p * a, p * b)}` },
    { tex: `${scalarTex(q)}${columnTex(c, d)} = ${columnTex(q * c, q * d)}` },
    { text: 'Only then do the two vectors meet, component by component.' },
    { tex: `${columnTex(p * a, p * b)} + ${columnTex(q * c, q * d)} = ${columnTex(p * a + q * c, p * b + q * d)}` },
  ],
};

export const workingGenerators = [
  powersTree,
  quadraticTree,
  logarithmTree,
  waveTree,
  discriminantTree,
  productRuleTree,
  integralTree,
  vectorTree,
  indexLawSteps,
  surdAddSteps,
  completeSquareSteps,
  logCombineSteps,
  powersOfISteps,
  chainRuleSteps,
  vectorCombineSteps,
];
