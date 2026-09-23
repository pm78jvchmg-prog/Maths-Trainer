/**
 * Trigonometric Identities & Equations.
 *
 * Trigonometric Functions already teaches the pieces this course works with:
 * sin^2 + cos^2 = 1 (tf-l2), tan as sine over cosine, the reciprocals and
 * 1 + tan^2 = sec^2 (tf-l5), and every solution of sin x = k (tf-l6). Nothing
 * here re-teaches them. Level 1 *uses* them: to rewrite an expression, to pick
 * the identity a problem calls for, to turn an equation into a quadratic in one
 * function, and to turn sine and cosine into tangent. Level 2 adds the compound
 * and double-angle formulae, and level 3 writes a sin x + b cos x as
 * R sin(x + alpha). There alpha is a table angle wherever an angle is typed or
 * slid to; a Pythagorean triple's alpha, to one decimal place, is only ever an
 * option or a tile, and a surd R is only ever a tile.
 *
 * Every angle is a multiple of 30 or 45 degrees (or half of one, where a double
 * angle is being undone), every value is 0, +-1/2, +-1 or a surd, and every
 * bank is whole. Surds are never typed: a phone keypad makes
 * (sqrt(6) + sqrt(2))/4 a chore to enter and a trap to bracket, so exact surd
 * values are placed from a bank or picked from options, and the typed answers
 * are fractions and angles.
 *
 * Rewriting an expression is never a typed question either. The checker
 * compares values, so it would accept the question copied straight back
 * (PITFALLS 3.4); a rewrite is asked through `steps`, `tiles`, `flow` or a
 * native `choice`, which grade the form.
 */
import type { Block, ChoiceOption, Generator, KeypadKey, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';

/* ---------- Shared helpers ---------- */

/** Fraction entry; the base keypad supplies digits, signs and the point. */
const NUMBER_KEYS: KeypadKey[] = [{ insert: '/' }];

/** Angles in radians, as multiples of pi. */
const PI_KEYS: KeypadKey[] = [{ insert: 'pi', label: 'π' }, { insert: '/' }];

/** The letters a rewrite is written in, so one form is not always about x. */
const VARS = ['x', '\\theta', 'A'];

type Fn = 'sin' | 'cos' | 'tan';

type Rat = [number, number];

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/** n/d in lowest terms with the sign on top. */
function rat(n: number, d: number): Rat {
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return [(sign * n) / g, (sign * d) / g];
}

const ratValue = ([n, d]: Rat): number => n / d;

/** A fraction as the learner reads it: sign in front, lowest terms. */
const ratTex = ([n, d]: Rat): string =>
  d === 1 ? `${n}` : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;

/** The same value for mathjs. Never displayed. */
const ratAnswer = ([n, d]: Rat): string => (d === 1 ? `${n}` : `(${n})/(${d})`);

/** A value in a line of working, bracketed when negative so no "- -" appears. Solutions only, never tiles. */
const br = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);

/** A coefficient in front of a function: nothing for 1. */
const co = (k: number): string => (k === 1 ? '' : `${k}`);

const deg = (d: number): string => `${d}^{\\circ}`;

/** Degrees as a multiple of pi, as the learner reads it. */
function piTex(degrees: number): string {
  // Doubled so a half degree (22.5, a double angle undone) stays a whole fraction.
  const [n, d] = rat(Math.round(degrees * 2), 360);
  if (n === 0) return '0';
  const top = `${n < 0 ? '-' : ''}${Math.abs(n) === 1 ? '' : Math.abs(n)}\\pi`;
  return d === 1 ? top : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n) === 1 ? '' : Math.abs(n)}\\pi}{${d}}`;
}

/** Degrees as a multiple of pi, for mathjs. Never displayed. */
function piAnswer(degrees: number): string {
  const [n, d] = rat(Math.round(degrees * 2), 360);
  return `(${n}*pi)/(${d})`;
}

const angleTex = (degrees: number, radians: boolean): string => (radians ? piTex(degrees) : deg(degrees));

const angleAnswer = (degrees: number, radians: boolean): string =>
  radians ? piAnswer(degrees) : `${degrees}`;

/** sin, cos or tan of a whole number of degrees, with float dust swept to zero; undefined where tan has no value. */
function trigAt(fn: Fn, degrees: number): number | undefined {
  const r = (degrees * Math.PI) / 180;
  const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  const s = tidy(Math.sin(r));
  const c = tidy(Math.cos(r));
  if (fn === 'sin') return s;
  if (fn === 'cos') return c;
  return c === 0 ? undefined : tidy(s / c);
}

/** Every size a ratio takes at a multiple of 30 or 45 degrees. */
const SPECIAL: { value: number; tex: string }[] = [
  { value: 0, tex: '0' },
  { value: 0.5, tex: '\\frac{1}{2}' },
  { value: Math.SQRT2 / 2, tex: '\\frac{\\sqrt{2}}{2}' },
  { value: Math.sqrt(3) / 2, tex: '\\frac{\\sqrt{3}}{2}' },
  { value: 1, tex: '1' },
  { value: 1 / Math.sqrt(3), tex: '\\frac{1}{\\sqrt{3}}' },
  { value: Math.sqrt(3), tex: '\\sqrt{3}' },
  { value: 1.5, tex: '\\frac{3}{2}' },
  { value: 2, tex: '2' },
  { value: 3, tex: '3' },
];

/** A special value as the learner reads it. Throws off the table, so a slip cannot pass as a surd. */
function specialTex(value: number): string {
  const row = SPECIAL.find((entry) => Math.abs(entry.value - Math.abs(value)) < 1e-9);
  if (!row) throw new Error(`${value} is not a special value`);
  return value < 0 && row.value !== 0 ? `-${row.tex}` : row.tex;
}

/** The multiples of 30 and 45 degrees in one turn, from 0 up to but not including 360. */
const TURN = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

/** Every angle in 0 <= x < 360 where fn takes this value, smallest first. */
function solutionsOf(fn: Fn, value: number): number[] {
  return TURN.filter((d) => {
    const v = trigAt(fn, d);
    return v !== undefined && Math.abs(v - value) < 1e-9;
  });
}


/** A signed term: '3\\sin x' first, '+ 3\\sin x' or '- \\sin x' after. A bare number when the body is empty. */
function signed(coef: number, body: string, first = false): string {
  const size = Math.abs(coef);
  const mag = body === '' ? `${size}` : `${size === 1 ? '' : size}${body}`;
  if (first) return coef < 0 ? `-${mag}` : mag;
  return `${coef < 0 ? '-' : '+'} ${mag}`;
}

/** Terms joined with their signs, dropping zeros. */
function polyTex(terms: [number, string][]): string {
  const kept = terms.filter(([c]) => c !== 0);
  if (kept.length === 0) return '0';
  return kept.map(([c, body], i) => signed(c, body, i === 0)).join(' ');
}

/** A deterministic scatter: stable per token, so one question renders one way (PITFALLS 3.10). */
function scatter(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => hashSeed(a) - hashSeed(b) || (a < b ? -1 : 1));
}

/** The answer tokens as a multiset, plus up to `extra` distractors not already among them. */
function bankOf(answer: string[], distractors: string[], extra = 3): string[] {
  const picked: string[] = [];
  for (const token of distractors) {
    if (answer.includes(token) || picked.includes(token)) continue;
    picked.push(token);
    if (picked.length === extra) break;
  }
  return scatter([...answer, ...picked]);
}

/** A slot spread evenly from a question's parameters. */
const saltOf = (params: unknown): number => hashSeed(JSON.stringify(params));

/**
 * A native choice slide, the answer at a slot fixed by the question's own
 * numbers. Distractors that collide with the answer or each other are dropped.
 */
function choiceSlide(prompt: Block[], correct: string, distractors: string[], salt: number): Slide {
  const rest = [...new Set(distractors)].filter((tex) => tex !== correct).slice(0, 3);
  const slot = salt % (rest.length + 1);
  const ordered = [...rest.slice(0, slot), correct, ...rest.slice(slot)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
    correctId: `opt${slot}`,
  };
}

/** Choice options from fractions: the answer, then whichever slips differ from it in value. */
function ratOptions(correct: Rat, slips: Rat[]): ChoiceOption[] {
  const seen = [ratValue(correct)];
  const kept: Rat[] = [];
  for (const slip of slips) {
    const value = ratValue(slip);
    if (!Number.isFinite(value) || seen.some((v) => Math.abs(v - value) < 1e-9)) continue;
    seen.push(value);
    kept.push(slip);
    if (kept.length === 3) break;
  }
  return options(
    { tex: ratTex(correct), answer: ratAnswer(correct) },
    ...kept.map((slip) => ({ tex: ratTex(slip), answer: ratAnswer(slip) })),
  );
}

/** Choice options from angles in degrees: the answer and up to three others that differ. */
function angleOptions(correct: number, candidates: number[], radians: boolean): ChoiceOption[] {
  const kept = [...new Set(candidates)].filter((d) => d !== correct).slice(0, 3);
  return options(
    { tex: angleTex(correct, radians), answer: angleAnswer(correct, radians) },
    ...kept.map((d) => ({ tex: angleTex(d, radians), answer: angleAnswer(d, radians) })),
  );
}

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** The three Pythagorean-type identities and the quotient one, written in a given letter. */
const identity = {
  pyth: (v: string) => `\\sin^2 ${v} + \\cos^2 ${v} = 1`,
  tan: (v: string) => `1 + \\tan^2 ${v} = \\sec^2 ${v}`,
  cot: (v: string) => `1 + \\cot^2 ${v} = \\operatorname{cosec}^2 ${v}`,
  quot: (v: string) => `\\tan ${v} = \\frac{\\sin ${v}}{\\cos ${v}}`,
};

/* ---------- Level 1, lesson 1: rewriting with an identity ---------- */

interface SimplifyParams {
  form: number;
  k: number;
  v: number;
  phrasing: number;
}

interface StepsForm {
  hard: boolean;
  start: (c: string, k: number, v: string) => string[];
  reductions: (c: string, k: number, v: string) => { span: [number, number]; value: string; bank: string[] }[];
  why: (c: string, k: number, v: string) => SolutionStep[];
}

/** Simplifications that take two moves: an identity on one piece, then a cancellation across the line. */
const SIMPLIFY_FORMS: StepsForm[] = [
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos^2 ${v})`, '\\div', `\\sin ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\sin^2 ${v}`, bank: [`${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\sin^2 ${v})`] },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${c}\\cos ${v}`, `${c}\\tan ${v}`, `${c}\\sin^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.pyth(v)}$, taking $\\cos^2 ${v}$ from both sides gives $1 - \\cos^2 ${v} = \\sin^2 ${v}$.` },
      { tex: `${c}(1 - \\cos^2 ${v}) \\div \\sin ${v} = ${c}\\sin^2 ${v} \\div \\sin ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\sin^2 ${v})`, '\\div', `\\cos ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\cos^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\cos^2 ${v})`] },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\tan ${v}`, `${c}\\cos^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.pyth(v)}$, taking $\\sin^2 ${v}$ from both sides gives $1 - \\sin^2 ${v} = \\cos^2 ${v}$.` },
      { tex: `${c}(1 - \\sin^2 ${v}) \\div \\cos ${v} = ${c}\\cos^2 ${v} \\div \\cos ${v} = ${c}\\cos ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\sin^2 ${v})`, '\\div', `\\cos^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\cos^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\cos^2 ${v})`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\cos ${v}`, `${c}\\tan^2 ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$1 - \\sin^2 ${v} = \\cos^2 ${v}$, from $${identity.pyth(v)}$.` },
      { tex: `${c}\\cos^2 ${v} \\div \\cos^2 ${v} = ${k}` },
      { text: 'Everything that depended on the angle has cancelled, so the value is the same whatever the angle.' },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos^2 ${v})`, '\\div', `\\sin^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\sin^2 ${v}`, bank: [`${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`, `${c}(1 + \\sin^2 ${v})`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\sin ${v}`, `${c}\\cot^2 ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$1 - \\cos^2 ${v} = \\sin^2 ${v}$, from $${identity.pyth(v)}$.` },
      { tex: `${c}\\sin^2 ${v} \\div \\sin^2 ${v} = ${k}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`(\\sin^2 ${v} + \\cos^2 ${v})`, '\\times', `${c}\\cos ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: '1', bank: ['0', '2', `\\tan^2 ${v}`] },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\cos^2 ${v}`, `${k + 1}\\cos ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `The bracket is the identity itself: $${identity.pyth(v)}$.` },
      { tex: `1 \\times ${c}\\cos ${v} = ${c}\\cos ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(\\sec^2 ${v} - 1)`, '\\div', `\\tan ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\tan^2 ${v}`, bank: [`${c}\\sin^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}(\\sec^2 ${v} + 1)`] },
      { span: [0, 3], value: `${c}\\tan ${v}`, bank: [`${c}\\sec ${v}`, `${c}\\sin ${v}`, `${c}\\tan^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.tan(v)}$, taking $1$ from both sides gives $\\sec^2 ${v} - 1 = \\tan^2 ${v}$.` },
      { tex: `${c}\\tan^2 ${v} \\div \\tan ${v} = ${c}\\tan ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(1 + \\tan^2 ${v})`, '\\times', `\\cos^2 ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${c}\\sec^2 ${v}`, bank: [`${c}\\operatorname{cosec}^2 ${v}`, `${c}\\sin^2 ${v}`, `${c}\\cot^2 ${v}`] },
      { span: [0, 3], value: `${k}`, bank: [`-${k}`, `${c}\\sin^2 ${v}`, `${c}\\cos ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$${identity.tan(v)}$, and $\\sec ${v} = \\frac{1}{\\cos ${v}}$, so $\\sec^2 ${v} \\times \\cos^2 ${v} = 1$.` },
      { tex: `${c}\\sec^2 ${v} \\times \\cos^2 ${v} = ${k}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`\\tan ${v}`, '\\times', `${c}\\cos ${v}`],
    reductions: (c, k, v) => [
      {
        span: [0, 1],
        value: `\\frac{\\sin ${v}}{\\cos ${v}}`,
        bank: [`\\frac{\\cos ${v}}{\\sin ${v}}`, `\\sin ${v}\\cos ${v}`, `\\frac{1}{\\cos ${v}}`],
      },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${c}\\cos ${v}`, `${c}\\sin ${v}\\cos^2 ${v}`, `${k}`] },
    ],
    why: (c, _k, v) => [
      { text: `Write the tangent as $${identity.quot(v)}$.` },
      { tex: `\\frac{\\sin ${v}}{\\cos ${v}} \\times ${c}\\cos ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(\\operatorname{cosec}^2 ${v} - 1)`, '\\div', `\\cot ${v}`],
    reductions: (c, _k, v) => [
      { span: [0, 1], value: `${c}\\cot^2 ${v}`, bank: [`${c}\\tan^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}\\sec^2 ${v}`] },
      { span: [0, 3], value: `${c}\\cot ${v}`, bank: [`${c}\\tan ${v}`, `${c}\\cot^2 ${v}`, `${c}\\operatorname{cosec} ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `From $${identity.cot(v)}$, taking $1$ from both sides gives $\\operatorname{cosec}^2 ${v} - 1 = \\cot^2 ${v}$.` },
      { tex: `${c}\\cot^2 ${v} \\div \\cot ${v} = ${c}\\cot ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}\\sin ${v}`, '\\div', `\\tan ${v}`],
    reductions: (c, _k, v) => [
      {
        span: [2, 3],
        value: `\\frac{\\sin ${v}}{\\cos ${v}}`,
        bank: [`\\frac{\\cos ${v}}{\\sin ${v}}`, `\\sin ${v}\\cos ${v}`, `\\frac{1}{\\sin ${v}}`],
      },
      { span: [0, 3], value: `${c}\\cos ${v}`, bank: [`${c}\\sin ${v}`, `${c}\\tan ${v}`, `${c}\\sin^2 ${v}`] },
    ],
    why: (c, _k, v) => [
      { text: `Write the tangent as $${identity.quot(v)}$. Dividing by a fraction multiplies by it upside down.` },
      { tex: `${c}\\sin ${v} \\times \\frac{\\cos ${v}}{\\sin ${v}} = ${c}\\cos ${v}` },
    ],
  },
];

const SIMPLIFY_PROMPTS = [
  'Simplify, one step at a time: use an identity first, then cancel.',
  'Rewrite the piece an identity can change, then finish the simplifying.',
  'Work this down to one simple term.',
];

/** A two-move simplification: an identity on one piece, then a cancellation. */
const simplifySteps: Generator<SimplifyParams> = {
  id: 'tid-simplify-steps',
  sample: (rng, difficulty) => {
    const forms = SIMPLIFY_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      k: rng.int(1, 6),
      v: rng.int(0, VARS.length - 1),
      phrasing: rng.int(0, SIMPLIFY_PROMPTS.length - 1),
    };
  },
  render: ({ form, k, v, phrasing }): Slide => {
    const f = SIMPLIFY_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    return {
      kind: 'steps',
      prompt: [prose(SIMPLIFY_PROMPTS[phrasing])],
      start: f.start(c, k, letter),
      reductions: f.reductions(c, k, letter).map((r) => ({ ...r, bank: scatter([r.value, ...r.bank]) })),
    };
  },
  solution: ({ form, k, v }) => SIMPLIFY_FORMS[form].why(co(k), k, VARS[v]),
};

interface RearrangeParams {
  form: number;
  k: number;
  v: number;
}

interface RearrangeForm {
  hard: boolean;
  template: (c: string, k: number, v: string) => string;
  answer: (c: string, k: number, v: string) => string[];
  unordered?: boolean;
  from: 'pyth' | 'tan' | 'cot' | 'quot';
}

/** The identities, rearranged and scaled. */
const REARRANGE_FORMS: RearrangeForm[] = [
  { hard: false, from: 'pyth', template: (c, _k, v) => `${c}\\sin^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${k}`, `${c}\\cos^2 ${v}`] },
  { hard: false, from: 'pyth', template: (c, _k, v) => `${c}\\cos^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${k}`, `${c}\\sin^2 ${v}`] },
  {
    hard: false,
    from: 'pyth',
    template: (_c, k) => `{0} + {1} = ${k}`,
    answer: (c, _k, v) => [`${c}\\sin^2 ${v}`, `${c}\\cos^2 ${v}`],
    unordered: true,
  },
  { hard: false, from: 'pyth', template: (c, k, v) => `${k} - {0} = ${c}\\cos^2 ${v}`, answer: (c, _k, v) => [`${c}\\sin^2 ${v}`] },
  { hard: false, from: 'pyth', template: (c, k, v) => `${c}\\sin^2 ${v} - ${k} = {0}`, answer: (c, _k, v) => [`-${c}\\cos^2 ${v}`] },
  { hard: true, from: 'tan', template: (c, _k, v) => `${c}\\tan^2 ${v} = {0} - {1}`, answer: (c, k, v) => [`${c}\\sec^2 ${v}`, `${k}`] },
  {
    hard: true,
    from: 'tan',
    template: (c, _k, v) => `${c}\\sec^2 ${v} = {0} + {1}`,
    answer: (c, k, v) => [`${k}`, `${c}\\tan^2 ${v}`],
    unordered: true,
  },
  {
    hard: true,
    from: 'cot',
    template: (c, _k, v) => `${c}\\cot^2 ${v} = {0} - {1}`,
    answer: (c, k, v) => [`${c}\\operatorname{cosec}^2 ${v}`, `${k}`],
  },
  {
    hard: true,
    from: 'cot',
    template: (c, k, v) => `${c}\\operatorname{cosec}^2 ${v} - {0} = ${k}`,
    answer: (c, _k, v) => [`${c}\\cot^2 ${v}`],
  },
  { hard: true, from: 'quot', template: (c, _k, v) => `${c}\\tan ${v} = {0} \\div {1}`, answer: (c, _k, v) => [`${c}\\sin ${v}`, `\\cos ${v}`] },
];

/** Rearrange an identity into the form a problem needs. */
const rearrangeTiles: Generator<RearrangeParams> = {
  id: 'tid-rearrange-tiles',
  sample: (rng, difficulty) => {
    const forms = REARRANGE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 9), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = REARRANGE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const answer = f.answer(c, k, letter);
    const distractors = [
      `${c}\\sin^2 ${letter}`,
      `${c}\\cos^2 ${letter}`,
      `${c}\\tan^2 ${letter}`,
      `-${c}\\sin^2 ${letter}`,
      `-${k}`,
      `${c}\\sec^2 ${letter}`,
      `${c}\\cos ${letter}`,
      `\\sin ${letter}`,
    ];
    const hint = {
      pyth: `$${identity.pyth(letter)}$`,
      tan: `$${identity.tan(letter)}$`,
      cot: `$${identity.cot(letter)}$`,
      quot: 'tangent as sine over cosine',
    }[f.from];
    return {
      kind: 'tiles',
      prompt: [prose(`Complete the line. It is ${hint}, rearranged${k === 1 ? '' : ` and multiplied by $${k}$`}.`)],
      template: f.template(c, k, letter),
      bank: bankOf(answer, distractors),
      answer,
      ...(f.unordered ? { unordered: true } : {}),
    };
  },
  solution: ({ form, k, v }) => {
    const f = REARRANGE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const answer = f.answer(c, k, letter);
    let line = f.template(c, k, letter);
    answer.forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    const start = {
      pyth: identity.pyth(letter),
      tan: identity.tan(letter),
      cot: identity.cot(letter),
      quot: identity.quot(letter),
    }[f.from];
    return [
      { text: `Start from the identity:` },
      { tex: start },
      {
        text:
          k === 1
            ? 'Move terms across so the side you want stands alone.'
            : `Multiply every term by $${k}$, then move terms across so the side you want stands alone.`,
      },
      { tex: line },
    ];
  },
};

interface SimplifyChoiceParams {
  form: number;
  k: number;
  v: number;
}

interface ChoiceForm {
  hard: boolean;
  expr: (c: string, k: number, v: string) => string;
  right: (c: string, k: number, v: string) => string;
  wrong: (c: string, k: number, v: string) => string[];
  why: (c: string, k: number, v: string) => string;
}

const SIMPLIFY_CHOICE_FORMS: ChoiceForm[] = [
  {
    hard: false,
    expr: (c, _k, v) => `${c}(1 - \\sin^2 ${v})`,
    right: (c, _k, v) => `${c}\\cos^2 ${v}`,
    wrong: (c, k, v) => [`${c}\\sin^2 ${v}`, `${c}\\cos ${v}`, `${k} + ${c}\\cos^2 ${v}`],
    why: (_c, _k, v) => `$1 - \\sin^2 ${v} = \\cos^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `${c}\\sin^2 ${v} + ${c}\\cos^2 ${v}`,
    right: (_c, k) => `${k}`,
    wrong: (c, k, v) => [`${2 * k}`, `${c}\\tan^2 ${v}`, '0'],
    why: (c, k, v) => `Take out the $${k}$: $${c}(\\sin^2 ${v} + \\cos^2 ${v}) = ${c} \\times 1$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `\\dfrac{${c}(1 - \\cos^2 ${v})}{\\sin ${v}}`,
    right: (c, _k, v) => `${c}\\sin ${v}`,
    wrong: (c, k, v) => [`${c}\\cos ${v}`, `${c}\\sin^2 ${v}`, `\\dfrac{${k}}{\\sin ${v}}`],
    why: (c, _k, v) => `The top is $${c}\\sin^2 ${v}$, and one $\\sin ${v}$ cancels.`,
  },
  {
    hard: false,
    expr: (c, k, v) => `${c}\\cos^2 ${v} - ${k}`,
    right: (c, _k, v) => `-${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin^2 ${v}`, `-${c}\\cos^2 ${v}`, `${c}\\tan^2 ${v}`],
    why: (c, k, v) => `Take out $-${k}$: $-${c}(1 - \\cos^2 ${v}) = -${c}\\sin^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `\\dfrac{${c}\\sin^2 ${v}}{1 - \\sin^2 ${v}}`,
    right: (c, _k, v) => `${c}\\tan^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\cot^2 ${v}`, `${c}\\sin^2 ${v}`, `${c}\\sec^2 ${v}`],
    why: (c, _k, v) => `The bottom is $\\cos^2 ${v}$, and $\\frac{\\sin^2 ${v}}{\\cos^2 ${v}} = \\tan^2 ${v}$, so it is $${c}\\tan^2 ${v}$.`,
  },
  {
    hard: false,
    expr: (c, _k, v) => `${c}(1 - \\cos ${v})(1 + \\cos ${v})`,
    right: (c, _k, v) => `${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\cos^2 ${v}`, `${c}(1 - \\cos^2 ${v})^2`, `-${c}\\sin^2 ${v}`],
    why: (c, _k, v) => `The brackets multiply to $1 - \\cos^2 ${v}$, the difference of two squares, which is $\\sin^2 ${v}$; so it is $${c}\\sin^2 ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(\\sec^2 ${v} - 1)\\cos^2 ${v}`,
    right: (c, _k, v) => `${c}\\sin^2 ${v}`,
    wrong: (c, _k, v) => [`${c}\\tan^2 ${v}`, `${c}\\cos^2 ${v}`, `${c}\\sec^2 ${v}`],
    why: (c, _k, v) => `$\\sec^2 ${v} - 1 = \\tan^2 ${v}$, and $\\tan^2 ${v}\\cos^2 ${v} = \\sin^2 ${v}$, so it is $${c}\\sin^2 ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}\\tan ${v}\\cos ${v}`,
    right: (c, _k, v) => `${c}\\sin ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin ${v}\\cos^2 ${v}`, `${c}\\cos ${v}`, `${c}`],
    why: (c, _k, v) => `$\\tan ${v} = \\frac{\\sin ${v}}{\\cos ${v}}$, and the cosines cancel, leaving $${c}\\sin ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(1 + \\tan^2 ${v})\\cos^2 ${v}`,
    right: (_c, k) => `${k}`,
    wrong: (c, _k, v) => [`${c}\\sin^2 ${v}`, `${c}\\sec^2 ${v}`, `${c}\\cos^4 ${v}`],
    why: (c, k, v) => `$1 + \\tan^2 ${v} = \\sec^2 ${v} = \\frac{1}{\\cos^2 ${v}}$, so the cosines cancel and $${c}\\sec^2 ${v}\\cos^2 ${v} = ${k}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `\\dfrac{${c}\\sin ${v}}{\\tan ${v}}`,
    right: (c, _k, v) => `${c}\\cos ${v}`,
    wrong: (c, _k, v) => [`${c}\\sin ${v}`, `${c}\\sec ${v}`, `${c}\\sin^2 ${v}`],
    why: (c, _k, v) => `Dividing by $\\frac{\\sin ${v}}{\\cos ${v}}$ multiplies by $\\frac{\\cos ${v}}{\\sin ${v}}$, leaving $${c}\\cos ${v}$.`,
  },
  {
    hard: true,
    expr: (c, _k, v) => `${c}(\\operatorname{cosec}^2 ${v} - \\cot^2 ${v})`,
    right: (_c, k) => `${k}`,
    wrong: (c, k, v) => [`${c}\\sin^2 ${v}`, `-${k}`, `${c}\\tan^2 ${v}`],
    why: (_c, k, v) => `From $${identity.cot(v)}$, the bracket is $1$, so it is $${k}$.`,
  },
];

const SIMPLIFY_CHOICE_STEMS = [
  'Which of these is the same as',
  'Which is this written more simply?',
  'Pick the simplest equal expression.',
];

/** Which simpler expression is this equal to? */
const simplifyChoice: Generator<SimplifyChoiceParams & { stem: number }> = {
  id: 'tid-simplify-choice',
  sample: (rng, difficulty) => {
    const forms = SIMPLIFY_CHOICE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      k: rng.int(1, 6),
      v: rng.int(0, VARS.length - 1),
      stem: rng.int(0, SIMPLIFY_CHOICE_STEMS.length - 1),
    };
  },
  render: (p): Slide => {
    const f = SIMPLIFY_CHOICE_FORMS[p.form];
    const c = co(p.k);
    const v = VARS[p.v];
    return choiceSlide(
      [prose(SIMPLIFY_CHOICE_STEMS[p.stem]), display(f.expr(c, p.k, v))],
      f.right(c, p.k, v),
      f.wrong(c, p.k, v),
      saltOf(p),
    );
  },
  solution: ({ form, k, v }) => {
    const f = SIMPLIFY_CHOICE_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    return [{ text: f.why(c, k, letter) }, { tex: `${f.expr(c, k, letter)} = ${f.right(c, k, letter)}` }];
  },
};

interface ValueParams {
  form: number;
  p: number;
  q: number;
  k: number;
  b: number;
  v: number;
}

interface ValueForm {
  hard: boolean;
  given: 'sin' | 'cos' | 'tan';
  expr: (p: ValueParams, v: string) => string;
  /** The value, as a fraction over q^2 (or p^2 for the tan^2 form). */
  value: (p: ValueParams) => Rat;
  slips: (p: ValueParams) => Rat[];
  why: (p: ValueParams, v: string) => SolutionStep[];
}

const sq = (n: number) => n * n;

const VALUE_FORMS: ValueForm[] = [
  {
    hard: false,
    given: 'sin',
    expr: ({ k }, v) => `${k} - ${k}\\cos^2 ${v}`,
    value: ({ k, p, q }) => rat(k * sq(p), sq(q)),
    slips: ({ k, p, q }) => [rat(k * p, q), rat(k * (sq(q) - sq(p)), sq(q)), rat(sq(p), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `Take out the $${k}$ and use $1 - \\cos^2 ${v} = \\sin^2 ${v}$:` },
      { tex: `${k} - ${k}\\cos^2 ${v} = ${k}\\sin^2 ${v} = ${k} \\times \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(k * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: false,
    given: 'cos',
    expr: ({ k }, v) => `${k} - ${k}\\sin^2 ${v}`,
    value: ({ k, p, q }) => rat(k * sq(p), sq(q)),
    slips: ({ k, p, q }) => [rat(k * p, q), rat(k * (sq(q) - sq(p)), sq(q)), rat(sq(p), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `Take out the $${k}$ and use $1 - \\sin^2 ${v} = \\cos^2 ${v}$:` },
      { tex: `${k} - ${k}\\sin^2 ${v} = ${k}\\cos^2 ${v} = ${k} \\times \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(k * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: false,
    given: 'sin',
    expr: ({ k }, v) => `${co(k)}\\cos^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (q - p), q), rat(k * (sq(q) + sq(p)), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `$\\cos^2 ${v} = 1 - \\sin^2 ${v}$, so there is no need to find the angle:` },
      { tex: `\\cos^2 ${v} = 1 - \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) - sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\cos^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: false,
    given: 'cos',
    expr: ({ k }, v) => `${co(k)}\\sin^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (q - p), q), rat(k * (sq(q) + sq(p)), sq(q))],
    why: ({ k, p, q }, v) => [
      { text: `$\\sin^2 ${v} = 1 - \\cos^2 ${v}$, so there is no need to find the angle:` },
      { tex: `\\sin^2 ${v} = 1 - \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) - sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\sin^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: true,
    given: 'sin',
    expr: ({ k, b }, v) => `${k}\\sin^2 ${v} + ${b}\\cos^2 ${v}`,
    value: ({ k, b, p, q }) => rat(b * sq(q) + (k - b) * sq(p), sq(q)),
    slips: ({ k, b, p, q }) => [rat(k * sq(p) + b * sq(p), sq(q)), rat(k + b, 1), rat(k * sq(q) + (b - k) * sq(p), sq(q))],
    why: ({ k, b, p, q }, v) => [
      { text: `Write $\\cos^2 ${v}$ as $1 - \\sin^2 ${v}$, so everything is in terms of the sine you know:` },
      { tex: `${k}\\sin^2 ${v} + ${b}(1 - \\sin^2 ${v}) = ${b} + ${signed(k - b, `\\sin^2 ${v}`, true)}` },
      { tex: `= ${b} + ${k - b === 1 ? '' : k - b === -1 ? '-' : k - b}\\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(b * sq(q) + (k - b) * sq(p), sq(q)))}` },
    ],
  },
  {
    hard: true,
    given: 'tan',
    expr: ({ k }, v) => `${co(k)}\\sec^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) + sq(p)), sq(q)),
    slips: ({ k, p, q }) => [rat(k * sq(p), sq(q)), rat(k * (sq(q) - sq(p)), sq(q)), rat(k * (q + p), q)],
    why: ({ k, p, q }, v) => [
      { text: `$\\sec^2 ${v} = 1 + \\tan^2 ${v}$:` },
      { tex: `\\sec^2 ${v} = 1 + \\left(\\frac{${p}}{${q}}\\right)^2 = ${ratTex(rat(sq(q) + sq(p), sq(q)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\sec^2 ${v} = ${ratTex(rat(k * (sq(q) + sq(p)), sq(q)))}` }]),
    ],
  },
  {
    hard: true,
    given: 'cos',
    expr: ({ k }, v) => `${co(k)}\\tan^2 ${v}`,
    value: ({ k, p, q }) => rat(k * (sq(q) - sq(p)), sq(p)),
    slips: ({ k, p, q }) => [rat(k * (sq(q) - sq(p)), sq(q)), rat(k * sq(q), sq(p)), rat(k * (sq(q) + sq(p)), sq(p))],
    why: ({ k, p, q }, v) => [
      { text: `$\\tan^2 ${v} = \\sec^2 ${v} - 1$, and $\\sec ${v} = \\frac{1}{\\cos ${v}} = \\frac{${q}}{${p}}$:` },
      { tex: `\\tan^2 ${v} = \\left(\\frac{${q}}{${p}}\\right)^2 - 1 = ${ratTex(rat(sq(q) - sq(p), sq(p)))}` },
      ...(k === 1 ? [] : [{ tex: `${k}\\tan^2 ${v} = ${ratTex(rat(k * (sq(q) - sq(p)), sq(p)))}` }]),
    ],
  },
];

const GIVEN_TEX: Record<'sin' | 'cos' | 'tan', string> = { sin: '\\sin', cos: '\\cos', tan: '\\tan' };

/** A value found through an identity, without ever finding the angle. */
const valueFromIdentity: Generator<ValueParams> = {
  id: 'tid-value-from-identity',
  sample: (rng, difficulty) => {
    const forms = VALUE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    const form = rng.pick(forms).i;
    for (;;) {
      const q = rng.int(2, 7);
      const p = rng.int(1, q - 1);
      if (gcd(p, q) !== 1) continue;
      const k = rng.int(1, 5);
      let b = rng.int(1, 5);
      if (b === k) b = k === 5 ? 1 : k + 1;
      return { form, p, q, k, b, v: rng.int(0, VARS.length - 1) };
    }
  },
  render: (params): Slide => {
    const f = VALUE_FORMS[params.form];
    const v = VARS[params.v];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Given that $${GIVEN_TEX[f.given]} ${v} = \\frac{${params.p}}{${params.q}}$, find the exact value without finding $${v}$.`,
        ),
      ],
      lead: `${f.expr(params, v)} =`,
      keypad: NUMBER_KEYS,
      answer: ratAnswer(f.value(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (params) => {
    const f = VALUE_FORMS[params.form];
    return ratOptions(f.value(params), f.slips(params));
  },
  solution: (params) => VALUE_FORMS[params.form].why(params, VARS[params.v]),
};

/* ---------- Level 1, lesson 2: choosing the identity ---------- */

type IdentityKey = 'pyth' | 'tan' | 'quot' | 'cot';

interface WhichForm {
  hard: boolean;
  uses: IdentityKey;
  expr: (c: string, v: string) => string;
  result: (c: string, v: string) => string;
}

const WHICH_FORMS: WhichForm[] = [
  { hard: false, uses: 'pyth', expr: (c, v) => `${c}(1 - \\cos^2 ${v})`, result: (c, v) => `${c}\\sin^2 ${v}` },
  { hard: false, uses: 'tan', expr: (c, v) => `${c}(\\sec^2 ${v} - 1)`, result: (c, v) => `${c}\\tan^2 ${v}` },
  { hard: false, uses: 'quot', expr: (c, v) => `${c}\\tan ${v}\\cos ${v}`, result: (c, v) => `${c}\\sin ${v}` },
  { hard: false, uses: 'cot', expr: (c, v) => `${c}(\\operatorname{cosec}^2 ${v} - 1)`, result: (c, v) => `${c}\\cot^2 ${v}` },
  { hard: false, uses: 'pyth', expr: (c, v) => `${c}(\\sin^2 ${v} - 1)`, result: (c, v) => `-${c}\\cos^2 ${v}` },
  { hard: true, uses: 'quot', expr: (c, v) => `\\dfrac{${c}\\sin ${v}}{\\tan ${v}}`, result: (c, v) => `${c}\\cos ${v}` },
  { hard: true, uses: 'tan', expr: (c, v) => `${c}(1 + \\tan^2 ${v})`, result: (c, v) => `${c}\\sec^2 ${v}` },
  { hard: true, uses: 'cot', expr: (c, v) => `${c}(1 + \\cot^2 ${v})`, result: (c, v) => `${c}\\operatorname{cosec}^2 ${v}` },
  { hard: true, uses: 'pyth', expr: (c, v) => `${c}(\\cos^2 ${v} - 1)`, result: (c, v) => `-${c}\\sin^2 ${v}` },
];

const IDENTITY_ORDER: IdentityKey[] = ['pyth', 'tan', 'quot', 'cot'];

interface WhichParams {
  form: number;
  k: number;
  v: number;
}

/** Which identity does this expression call for, and what does it become? */
const whichIdentityFlow: Generator<WhichParams> = {
  id: 'tid-which-identity-flow',
  sample: (rng, difficulty) => {
    const forms = WHICH_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 9), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = WHICH_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const labels = IDENTITY_ORDER.map((key) => `$${identity[key](letter)}$`);
    const right = f.result(c, letter);
    const others = WHICH_FORMS.map((g) => g.result(c, letter)).filter((r) => r !== right);
    // The results of the forms nearest this one: same letter and coefficient, a different function.
    const wrong = [...new Set(others)].sort((a, b) => hashSeed(a + form) - hashSeed(b + form)).slice(0, 3);
    const results = [right, ...wrong].sort((a, b) => hashSeed(a) - hashSeed(b));
    return {
      kind: 'flow',
      prompt: [prose('Choose the identity that simplifies this, then say what it becomes.')],
      subject: f.expr(c, letter),
      steps: [
        {
          id: 'identity',
          ask: 'Which identity does this call for?',
          branches: labels.map((label) => ({ label, to: 'result' })),
        },
        {
          id: 'result',
          ask: 'So it simplifies to',
          branches: results.map((r) => ({ label: `$${r}$`, outcome: 'One term, one function.' })),
        },
      ],
      answer: [labels[IDENTITY_ORDER.indexOf(f.uses)], `$${right}$`],
    };
  },
  solution: ({ form, k, v }) => {
    const f = WHICH_FORMS[form];
    const c = co(k);
    const letter = VARS[v];
    const reason: Record<IdentityKey, string> = {
      pyth: `A $1$ beside a squared sine or cosine is the Pythagorean identity, $${identity.pyth(letter)}$.`,
      tan: `A $\\sec^2$ or $\\tan^2$ beside a $1$ is $${identity.tan(letter)}$.`,
      quot: `A tangent next to a sine or cosine wants writing as $${identity.quot(letter)}$.`,
      cot: `A $\\operatorname{cosec}^2$ or $\\cot^2$ beside a $1$ is $${identity.cot(letter)}$.`,
    };
    return [{ text: reason[f.uses] }, { tex: `${f.expr(c, letter)} = ${f.result(c, letter)}` }];
  },
};

interface ConstantParams {
  form: number;
  a: number;
  b: number;
  angle: number;
}

interface ConstantForm {
  hard: boolean;
  expr: (a: number, b: number, t: string) => string;
  value: (a: number, b: number) => number;
  slips: (a: number, b: number) => number[];
  why: (a: number, b: number, t: string) => string;
}

const CONSTANT_FORMS: ConstantForm[] = [
  {
    hard: false,
    expr: (a, _b, t) => `${a}\\sin^2 ${t} + ${a}\\cos^2 ${t}`,
    value: (a) => a,
    slips: (a) => [2 * a, 0, a * a],
    why: (a, _b, t) => `Take out the $${a}$: the bracket is $\\sin^2 ${t} + \\cos^2 ${t} = 1$.`,
  },
  {
    hard: false,
    expr: (a, b, t) => `${a}\\cos^2 ${t} + ${b} + ${a}\\sin^2 ${t}`,
    value: (a, b) => a + b,
    slips: (a, b) => [b, 2 * a + b, a * b],
    why: (a, b, t) => `The two squared terms make $${a}(\\sin^2 ${t} + \\cos^2 ${t}) = ${a}$, and the $${b}$ is added on.`,
  },
  {
    hard: false,
    expr: (a, b, t) => `${a}\\sin^2 ${t} - ${b} + ${a}\\cos^2 ${t}`,
    value: (a, b) => a - b,
    slips: (a, b) => [a + b, -b, 2 * a - b],
    why: (a, b, t) => `The two squared terms make $${a}(\\sin^2 ${t} + \\cos^2 ${t}) = ${a}$, and then $${b}$ is taken off.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}\\sec^2 ${t} - ${a}\\tan^2 ${t}`,
    value: (a) => a,
    slips: (a) => [-a, 2 * a, 0],
    why: (a, _b, t) => `$\\sec^2 ${t} - \\tan^2 ${t} = 1$, from $1 + \\tan^2 = \\sec^2$, so it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}\\operatorname{cosec}^2 ${t} - ${a}\\cot^2 ${t}`,
    value: (a) => a,
    slips: (a) => [-a, 2 * a, 0],
    why: (a, _b, t) => `$\\operatorname{cosec}^2 ${t} - \\cot^2 ${t} = 1$, from $1 + \\cot^2 = \\operatorname{cosec}^2$, so it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}(1 + \\tan^2 ${t})\\cos^2 ${t}`,
    value: (a) => a,
    slips: (a) => [2 * a, 0, a + 1],
    why: (a, _b, t) => `$1 + \\tan^2 ${t} = \\sec^2 ${t} = \\frac{1}{\\cos^2 ${t}}$, so the cosines cancel and it is $${a}$.`,
  },
  {
    hard: true,
    expr: (a, _b, t) => `${a}(\\sin ${t} + \\cos ${t})^2 + ${a}(\\sin ${t} - \\cos ${t})^2`,
    value: (a) => 2 * a,
    slips: (a) => [a, 4 * a, 0],
    why: (a, _b, t) =>
      `Expanding, the $2\\sin ${t}\\cos ${t}$ terms cancel and each bracket leaves $\\sin^2 ${t} + \\cos^2 ${t} = 1$, so it is $${a} \\times 2$.`,
  },
];

/** Angles with no table value, so a calculator is no help and the identity is the only way. */
const AWKWARD_ANGLES = [10, 20, 25, 35, 40, 50, 55, 65, 70, 80];

/** An expression whose value is the same at every angle. */
const constantValue: Generator<ConstantParams> = {
  id: 'tid-constant-value',
  sample: (rng, difficulty) => {
    const forms = CONSTANT_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    const a = rng.int(2, 9);
    let b = rng.int(1, 9);
    if (b === a) b = a === 9 ? 1 : a + 1;
    return { form: rng.pick(forms).i, a, b, angle: rng.pick(AWKWARD_ANGLES) };
  },
  render: ({ form, a, b, angle }): Slide => ({
    kind: 'expression',
    prompt: [prose('Find the exact value. No calculator is needed.')],
    lead: `${CONSTANT_FORMS[form].expr(a, b, deg(angle))} =`,
    keypad: NUMBER_KEYS,
    answer: `${CONSTANT_FORMS[form].value(a, b)}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: ({ form, a, b }) => {
    const f = CONSTANT_FORMS[form];
    const right = f.value(a, b);
    const kept = [...new Set(f.slips(a, b))].filter((n) => n !== right).slice(0, 3);
    return options({ tex: `${right}`, answer: `${right}` }, ...kept.map((n) => ({ tex: `${n}`, answer: `${n}` })));
  },
  solution: ({ form, a, b, angle }) => {
    const f = CONSTANT_FORMS[form];
    return [
      { text: f.why(a, b, deg(angle)) },
      { tex: `${f.expr(a, b, deg(angle))} = ${f.value(a, b)}` },
      { text: `It would be the same at any angle: $${deg(angle)}$ never mattered.` },
    ];
  },
};

/* ---------- Level 1, lesson 3: equations that are quadratics in disguise ---------- */

/** Roots as fractions. Inside -1..1 a sine or cosine can take them; outside it cannot. */
const VALID_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [0, 1],
  [1, 1],
  [-1, 1],
];
const TWO_SOLUTION_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [0, 1],
];
const INVALID_ROOTS: Rat[] = [
  [2, 1],
  [-2, 1],
  [3, 1],
  [-3, 1],
  [3, 2],
  [-3, 2],
];

/** (d1 s - n1)(d2 s - n2) = A s^2 + B s + C. */
function quadratic(r1: Rat, r2: Rat): [number, number, number] {
  const [n1, d1] = r1;
  const [n2, d2] = r2;
  return [d1 * d2, -(d1 * n2 + d2 * n1), n1 * n2];
}

const sameRat = (a: Rat, b: Rat) => a[0] * b[1] === b[0] * a[1];

/** A quadratic in fn x: 2\\sin^2 x - \\sin x - 1. */
function quadTex(A: number, B: number, C: number, fn: string, v = 'x'): string {
  return polyTex([
    [A, `\\${fn}^2 ${v}`],
    [B, `\\${fn} ${v}`],
    [C, ''],
  ]);
}

/** The equation, either with everything on the left or with the square alone on the left. */
function quadEquationTex(A: number, B: number, C: number, fn: string, rearranged: boolean): string {
  if (!rearranged) return `${quadTex(A, B, C, fn)} = 0`;
  const right = polyTex([
    [-B, `\\${fn} x`],
    [-C, ''],
  ]);
  return `${quadTex(A, 0, 0, fn)} = ${right}`;
}

/** A factor as written: (2\\sin x - 1), or \\sin x alone for a root of zero. */
function factorTex([n, d]: Rat, fn: string): string {
  if (n === 0) return `\\${fn} x`;
  return `(${d === 1 ? '' : d}\\${fn} x ${n > 0 ? '-' : '+'} ${Math.abs(n)})`;
}

interface QuadTreeParams {
  fn: 'sin' | 'cos';
  roots: [Rat, Rat];
  rearranged: boolean;
}

function sortedRoots(roots: [Rat, Rat]): [Rat, Rat] {
  return [...roots].sort((a, b) => ratValue(a) - ratValue(b)) as [Rat, Rat];
}

const QUAD_TREE_PROMPTS = [
  `Factorise to find the two values of {f} (smaller first on the top row). Then, under each, every solution with $0^{\\circ} \\le x < 360^{\\circ}$, smallest first. A value outside $-1$ to $1$ gives no angle.`,
  `Top row: the two values {f} can take, smaller first. Underneath: the angles from $0^{\\circ}$ up to $360^{\\circ}$ they give, smallest first. A value beyond $\\pm 1$ has nothing under it.`,
];

/** Solve a quadratic in sin x or cos x: two values, then the angles each one gives. */
const quadraticTree: Generator<QuadTreeParams & { phrasing: number }> = {
  id: 'tid-quadratic-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos'] as const);
    let roots: [Rat, Rat];
    if (difficulty > 1) {
      for (;;) {
        const pair = rng.sample(VALID_ROOTS, 2) as [Rat, Rat];
        if (!sameRat(pair[0], pair[1])) {
          roots = pair;
          break;
        }
      }
    } else {
      roots = [rng.pick(TWO_SOLUTION_ROOTS), rng.pick(INVALID_ROOTS)];
    }
    return { fn, roots: sortedRoots(roots), rearranged: rng.chance(0.5), phrasing: rng.int(0, QUAD_TREE_PROMPTS.length - 1) };
  },
  render: ({ fn, roots, rearranged, phrasing }): Slide => {
    const [A, B, C] = quadratic(roots[0], roots[1]);
    const rootToken = (r: Rat) => `\\${fn} x = ${ratTex(r)}`;
    const nodes: { id: string; from: string[] }[] = [
      { id: 'r0', from: [] },
      { id: 'r1', from: [] },
    ];
    const answer = [rootToken(roots[0]), rootToken(roots[1])];
    roots.forEach((r, i) => {
      solutionsOf(fn, ratValue(r)).forEach((d, j) => {
        nodes.push({ id: `s${i}${j}`, from: [`r${i}`] });
        answer.push(deg(d));
      });
    });
    const other = fn === 'sin' ? 'cos' : 'sin';
    const distractors = [
      ...roots.map((r) => rootToken([-r[0], r[1]])),
      ...roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(other, ratValue(r)).map(deg) : [])),
      ...roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(fn, -ratValue(r)).map(deg) : [])),
    ];
    return {
      kind: 'tree',
      prompt: [prose(QUAD_TREE_PROMPTS[phrasing].replace('{f}', `$\\${fn} x$`))],
      expression: quadEquationTex(A, B, C, fn, rearranged),
      nodes,
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: ({ fn, roots, rearranged }) => {
    const [A, B, C] = quadratic(roots[0], roots[1]);
    const steps: SolutionStep[] = [];
    if (rearranged) {
      steps.push({ text: 'Bring everything to one side first:' }, { tex: `${quadTex(A, B, C, fn)} = 0` });
    }
    steps.push(
      { text: `It is a quadratic in $\\${fn} x$, so it factorises like any other quadratic:` },
      { tex: `${factorTex(roots[0], fn)}${factorTex(roots[1], fn)} = 0` },
      { tex: `\\${fn} x = ${ratTex(roots[0])} \\quad \\text{or} \\quad \\${fn} x = ${ratTex(roots[1])}` },
    );
    for (const r of roots) {
      const sols = solutionsOf(fn, ratValue(r));
      steps.push({
        text:
          sols.length === 0
            ? `$\\${fn} x = ${ratTex(r)}$ has no solutions: $\\${fn} x$ never goes beyond $-1$ to $1$.`
            : `$\\${fn} x = ${ratTex(r)}$ gives $x = ${sols.map(deg).join(' \\text{ or } ')}$.`,
      });
    }
    return steps;
  },
};

interface DisguisedParams {
  target: 'sin' | 'cos' | 'tan';
  roots: [Rat, Rat];
}

/** Roots for a disguised quadratic: no zero root and no opposite pair, so all three terms are there. */
function disguisedRoots(rng: Rng, target: 'sin' | 'cos' | 'tan'): [Rat, Rat] {
  for (;;) {
    const r1 = rng.pick(target === 'tan' ? ([[1, 1], [-1, 1], [1, 2], [-1, 2], [2, 1], [-2, 1], [3, 1], [-3, 1]] as Rat[]) : VALID_ROOTS);
    const r2 = rng.pick([...VALID_ROOTS, ...INVALID_ROOTS]);
    if (r1[0] === 0 || r2[0] === 0 || sameRat(r1, r2) || ratValue(r1) === -ratValue(r2)) continue;
    const [A, , C] = quadratic(r1, r2);
    const constant = target === 'tan' ? C - A : A + C;
    if (constant === 0) continue;
    return sortedRoots([r1, r2]);
  }
}

/** What the disguised equation shows: A cos^2 x - B sin x - (A + C) = 0 for a sine target, and so on. */
function disguisedTex({ target, roots }: DisguisedParams): string {
  const [A, B, C] = quadratic(roots[0], roots[1]);
  if (target === 'sin') {
    return `${polyTex([
      [A, '\\cos^2 x'],
      [-B, '\\sin x'],
      [-(A + C), ''],
    ])} = 0`;
  }
  if (target === 'cos') {
    return `${polyTex([
      [A, '\\sin^2 x'],
      [-B, '\\cos x'],
      [-(A + C), ''],
    ])} = 0`;
  }
  return `${polyTex([
    [A, '\\sec^2 x'],
    [B, '\\tan x'],
    [C - A, ''],
  ])} = 0`;
}

const DISGUISE_HINT: Record<'sin' | 'cos' | 'tan', string> = {
  sin: '$\\cos^2 x = 1 - \\sin^2 x$',
  cos: '$\\sin^2 x = 1 - \\cos^2 x$',
  tan: '$\\sec^2 x = 1 + \\tan^2 x$',
};

/** Rewrite a two-function equation as a quadratic in one function. */
const disguisedTiles: Generator<DisguisedParams> = {
  id: 'tid-disguised-tiles',
  sample: (rng, difficulty) => {
    const target = difficulty > 1 ? rng.pick(['sin', 'cos', 'tan'] as const) : rng.pick(['sin', 'cos'] as const);
    return { target, roots: disguisedRoots(rng, target) };
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const f = p.target;
    const other = f === 'sin' ? 'cos' : f === 'cos' ? 'sin' : 'sec';
    const answer = [signed(A, `\\${f}^2 x`, true), signed(B, `\\${f} x`), signed(C, '')];
    const distractors = [
      signed(-B, `\\${f} x`),
      signed(-C, ''),
      signed(A, `\\${other}^2 x`, true),
      signed(C + 2 * A, ''),
      signed(-A, `\\${f}^2 x`, true),
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Use ${DISGUISE_HINT[f]} to write this as a quadratic in $\\${f} x$, with the squared term positive.`,
        ),
        display(disguisedTex(p)),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const f = p.target;
    const steps: SolutionStep[] = [{ text: `Replace using ${DISGUISE_HINT[f]}, so only $\\${f} x$ is left.` }];
    if (f === 'tan') {
      steps.push(
        { tex: `${A === 1 ? '' : A}(1 + \\tan^2 x) ${signed(B, '\\tan x')} ${signed(C - A, '')} = 0` },
        { text: `Multiply out the bracket and collect the numbers: $${A} ${signed(C - A, '')} = ${C}$.` },
      );
    } else {
      const other = f === 'sin' ? 'cos' : 'sin';
      steps.push(
        { tex: `${A === 1 ? '' : A}(1 - \\${f}^2 x) ${signed(-B, `\\${f} x`)} ${signed(-(A + C), '')} = 0` },
        {
          text: `Multiply out and collect the numbers, then multiply through by $-1$ so the $\\${f}^2 x$ term is positive. (The $\\${other}^2$ has gone, which was the point.)`,
        },
      );
    }
    steps.push({ tex: `${quadTex(A, B, C, f)} = 0` });
    return steps;
  },
};

interface CountParams {
  fn: Fn;
  roots: [Rat, Rat];
  factorised: boolean;
}

/** How many solutions a root gives in one turn. */
function countFor(fn: Fn, r: Rat): number {
  if (fn === 'tan') return 2;
  const v = Math.abs(ratValue(r));
  if (v > 1) return 0;
  return v === 1 ? 1 : 2;
}

const COUNT_ROOTS: Rat[] = [...VALID_ROOTS, ...INVALID_ROOTS];

/** How many solutions in one turn? Each value of the function is its own small question. */
const solutionCount: Generator<CountParams> = {
  id: 'tid-solution-count',
  sample: (rng, difficulty) => {
    const fn = rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const));
    for (;;) {
      const pair = rng.sample(COUNT_ROOTS, 2) as [Rat, Rat];
      if (sameRat(pair[0], pair[1])) continue;
      return { fn, roots: sortedRoots(pair), factorised: difficulty === 1 || rng.chance(0.3) };
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const equation = p.factorised
      ? `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0`
      : `${quadTex(A, B, C, p.fn)} = 0`;
    const right = countFor(p.fn, p.roots[0]) + countFor(p.fn, p.roots[1]);
    const near = [0, 1, 2, 3, 4].filter((n) => n !== right).sort((a, b) => Math.abs(a - right) - Math.abs(b - right));
    return choiceSlide(
      [prose('How many solutions does this have with $0^{\\circ} \\le x < 360^{\\circ}$?'), display(equation)],
      `${right}`,
      near.map(String),
      saltOf(p),
    );
  },
  solution: (p) => {
    const steps: SolutionStep[] = [];
    if (!p.factorised) {
      steps.push({ tex: `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0` });
    }
    for (const r of p.roots) {
      const n = countFor(p.fn, r);
      const why =
        p.fn === 'tan'
          ? 'tangent takes every value twice in a turn'
          : n === 0
            ? `$\\${p.fn} x$ never goes beyond $-1$ to $1$`
            : n === 1
              ? `the curve only touches $${ratTex(r)}$ at its ${ratValue(r) > 0 ? 'peak' : 'trough'}`
              : 'the level line crosses the curve twice in a turn';
      steps.push({ text: `$\\${p.fn} x = ${ratTex(r)}$: ${n} solution${n === 1 ? '' : 's'}, since ${why}.` });
    }
    steps.push({ text: `In total, $${countFor(p.fn, p.roots[0]) + countFor(p.fn, p.roots[1])}$.` });
    return steps;
  },
};

interface SolutionSliderParams {
  fn: 'sin' | 'cos';
  roots: [Rat, Rat];
  largest: boolean;
  factorised: boolean;
}

const DEGREE = Math.PI / 180;

/** Every solution of the pair of roots in 0 <= x < 360, smallest first. */
function allSolutions(fn: 'sin' | 'cos', roots: Rat[]): number[] {
  return roots.flatMap((r) => (Math.abs(ratValue(r)) <= 1 ? solutionsOf(fn, ratValue(r)) : [])).sort((a, b) => a - b);
}

/** The factored equation's graph: drag to the smallest or largest solution. */
const solutionSlider: Generator<SolutionSliderParams> = {
  id: 'tid-solution-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const fn = rng.pick(['sin', 'cos'] as const);
      const roots: [Rat, Rat] =
        difficulty > 1
          ? (rng.sample(VALID_ROOTS, 2) as [Rat, Rat])
          : [rng.pick(TWO_SOLUTION_ROOTS), rng.pick(INVALID_ROOTS.filter((r) => Math.abs(ratValue(r)) <= 2))];
      if (sameRat(roots[0], roots[1])) continue;
      const p = { fn, roots: sortedRoots(roots), largest: rng.chance(0.5), factorised: rng.chance(0.5) };
      const sols = allSolutions(fn, p.roots);
      const answer = p.largest ? sols[sols.length - 1] : sols[0];
      // The untouched slider rests at 180; never make that the answer, nor the left end.
      if (answer === 180 || answer === 0) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.roots[0], p.roots[1]);
    const sols = allSolutions(p.fn, p.roots);
    const answer = p.largest ? sols[sols.length - 1] : sols[0];
    const equation = p.factorised
      ? `${factorTex(p.roots[0], p.fn)}${factorTex(p.roots[1], p.fn)} = 0`
      : `${quadTex(A, B, C, p.fn)} = 0`;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => (p.fn === 'sin' ? Math.sin(x * DEGREE) : Math.cos(x * DEGREE)), accent: true }],
      horizontals: p.roots.map(ratValue),
      yMin: -2.4,
      yMax: 2.4,
      label: `The graph of y = ${p.fn} x from 0 to 360 degrees, with dashed level lines at the two values the equation allows`,
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The dashed lines are the two values of $\\${p.fn} x$ that solve the equation. Slide to the ${p.largest ? 'largest' : 'smallest'} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(equation),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer,
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const sols = allSolutions(p.fn, p.roots);
    const answer = p.largest ? sols[sols.length - 1] : sols[0];
    return [
      { tex: `\\${p.fn} x = ${ratTex(p.roots[0])} \\quad \\text{or} \\quad \\${p.fn} x = ${ratTex(p.roots[1])}` },
      ...p.roots.map((r) => ({
        text:
          Math.abs(ratValue(r)) > 1
            ? `The line at $${ratTex(r)}$ misses the curve entirely: no solutions.`
            : `The line at $${ratTex(r)}$ meets the curve at $${solutionsOf(p.fn, ratValue(r)).map(deg).join(', ')}$.`,
      })),
      { text: `The ${p.largest ? 'largest' : 'smallest'} of all of them is $${deg(answer)}$.` },
    ];
  },
};

/* ---------- Level 1, lesson 4: equations in tan ---------- */

/** Tangent values at multiples of 30 and 45 degrees, with the equation that produces each. */
const TAN_FORMS: { t: number; sinCoef: string; cosCoef: string }[] = [
  { t: 1, sinCoef: '', cosCoef: '' },
  { t: Math.sqrt(3), sinCoef: '', cosCoef: '\\sqrt{3}' },
  { t: 1 / Math.sqrt(3), sinCoef: '\\sqrt{3}', cosCoef: '' },
  { t: -1, sinCoef: '', cosCoef: '' },
  { t: -Math.sqrt(3), sinCoef: '', cosCoef: '\\sqrt{3}' },
  { t: -1 / Math.sqrt(3), sinCoef: '\\sqrt{3}', cosCoef: '' },
];

interface TanEqParams {
  form: number;
  k: number;
  /** Written with everything on one side. */
  moved: boolean;
}

/** a sin x = b cos x, or a sin x - b cos x = 0, with a k in front of both. */
function tanEquationTex({ form, k, moved }: TanEqParams): string {
  const { t, sinCoef, cosCoef } = TAN_FORMS[form];
  const s = `${co(k)}${sinCoef}\\sin x`;
  const c = `${co(k)}${cosCoef}\\cos x`;
  if (t > 0) return moved ? `${s} - ${c} = 0` : `${s} = ${c}`;
  return moved ? `${s} + ${c} = 0` : `${s} = -${c}`;
}

/** The angle in 0 <= x < 180 with this tangent. */
function tanPrincipal(t: number): number {
  const a = Math.round(Math.atan(t) / DEGREE);
  return a < 0 ? a + 180 : a;
}

interface TanSolveParams extends TanEqParams {
  /** 0: 0 <= x < 180 in degrees; 1: 180 <= x < 360; 2: 0 <= x < pi in radians. */
  interval: number;
}

const TAN_INTERVALS = [
  { tex: '0^{\\circ} \\le x < 180^{\\circ}', shift: 0, radians: false },
  { tex: '180^{\\circ} \\le x < 360^{\\circ}', shift: 180, radians: false },
  { tex: '0 \\le x < \\pi', shift: 0, radians: true },
];

/** a sin x = b cos x has one solution in any half turn: divide by cos x and read it off. */
const tanSolve: Generator<TanSolveParams> = {
  id: 'tid-tan-solve',
  sample: (rng, difficulty) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 5),
    moved: rng.chance(0.5),
    interval: difficulty > 1 ? rng.int(0, 2) : 0,
  }),
  render: (p): Slide => {
    const interval = TAN_INTERVALS[p.interval];
    const x = tanPrincipal(TAN_FORMS[p.form].t) + interval.shift;
    return {
      kind: 'expression',
      prompt: [
        prose(`Solve for $${interval.tex}$.${interval.radians ? ' Give the answer in radians.' : ''}`),
        display(tanEquationTex(p)),
      ],
      lead: 'x =',
      keypad: interval.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(x, interval.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const interval = TAN_INTERVALS[p.interval];
    const alpha = tanPrincipal(TAN_FORMS[p.form].t);
    const x = alpha + interval.shift;
    // The reciprocal's angle (cos over sin), the sign lost, and the other half turn.
    const recip = tanPrincipal(1 / TAN_FORMS[p.form].t) + interval.shift;
    const lost = 180 - alpha + interval.shift;
    return angleOptions(x, [recip, lost, x + (interval.shift === 0 ? 180 : -180)], interval.radians);
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const interval = TAN_INTERVALS[p.interval];
    const alpha = tanPrincipal(t);
    const x = alpha + interval.shift;
    return [
      { text: 'Get the sine and cosine on opposite sides, then divide both sides by $\\cos x$. Since $\\frac{\\sin x}{\\cos x} = \\tan x$:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text:
          interval.shift === 0
            ? `Tangent takes each value once in every half turn, and in $${interval.tex}$ that angle is $${angleTex(x, interval.radians)}$.`
            : `The angle in the first half turn is $${deg(alpha)}$; tangent repeats every $180^{\\circ}$, so the one in this interval is $${deg(alpha)} + 180^{\\circ} = ${deg(x)}$.`,
      },
    ];
  },
};

/** Both solutions of a sin x = b cos x in one turn, placed from a bank. */
const tanSolveTiles: Generator<TanEqParams & { radians: boolean }> = {
  id: 'tid-tan-solve-tiles',
  sample: (rng, difficulty) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    moved: rng.chance(0.5),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => {
    const alpha = tanPrincipal(TAN_FORMS[p.form].t);
    const answer = [alpha, alpha + 180].map((d) => angleTex(d, p.radians));
    const recip = tanPrincipal(1 / TAN_FORMS[p.form].t);
    const distractors = [180 - alpha, 360 - alpha, recip, recip + 180, alpha + 90, alpha + 270]
      .map((d) => ((d % 360) + 360) % 360)
      .map((d) => angleTex(d, p.radians));
    return {
      kind: 'tiles',
      prompt: [
        prose(`Find both solutions with ${p.radians ? '$0 \\le x < 2\\pi$' : '$0^{\\circ} \\le x < 360^{\\circ}$'}.`),
        display(tanEquationTex(p)),
      ],
      template: 'x = {0} \\quad \\text{or} \\quad x = {1}',
      bank: bankOf(answer, distractors),
      answer,
      unordered: true,
    };
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    return [
      { text: 'Divide both sides by $\\cos x$ to get a single tangent:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text: `One solution is $${angleTex(alpha, p.radians)}$. Tangent repeats every half turn, so the other is $${angleTex(alpha, p.radians)} + ${p.radians ? '\\pi' : deg(180)} = ${angleTex(alpha + 180, p.radians)}$.`,
      },
    ];
  },
};

interface DivideParams {
  /** 0: a sin x = b cos x; 1: sin x cos x = k cos x; 2: m sin x cos x = r sin x; 3: m sin^2 x = r sin x. */
  type: number;
  form: number;
  k: number;
  /** For types 1 to 3: which special value the second factor gives. */
  value: number;
}

const HALF_VALUES: Rat[] = [
  [1, 2],
  [-1, 2],
];

/** The equation for a divide-or-factorise question. */
function divideEquation(p: DivideParams): { tex: string; div: string; tanTex?: string; pair?: string; slipPair?: string; divided?: string } {
  if (p.type === 0) {
    return { tex: tanEquationTex({ form: p.form, k: p.k, moved: false }), div: '\\cos x', tanTex: specialTex(TAN_FORMS[p.form].t) };
  }
  const r = HALF_VALUES[p.value];
  const m = 2 * p.k;
  const rhs = (fn: string) => `${signed(r[0] * p.k, fn, true)}`;
  if (p.type === 1) {
    return {
      tex: `${m}\\sin x\\cos x = ${rhs('\\cos x')}`,
      div: '\\cos x',
      pair: `$\\cos x = 0$ or $\\sin x = ${ratTex(r)}$`,
      slipPair: `$\\cos x = 0$ or $\\sin x = ${ratTex([-r[0], r[1]])}$`,
      divided: `$\\sin x = ${ratTex(r)}$`,
    };
  }
  if (p.type === 2) {
    return {
      tex: `${m}\\sin x\\cos x = ${rhs('\\sin x')}`,
      div: '\\sin x',
      pair: `$\\sin x = 0$ or $\\cos x = ${ratTex(r)}$`,
      slipPair: `$\\sin x = 0$ or $\\cos x = ${ratTex([-r[0], r[1]])}$`,
      divided: `$\\cos x = ${ratTex(r)}$`,
    };
  }
  return {
    tex: `${m}\\sin^2 x = ${rhs('\\sin x')}`,
    div: '\\sin x',
    pair: `$\\sin x = 0$ or $\\sin x = ${ratTex(r)}$`,
    slipPair: `$\\sin x = 1$ or $\\sin x = ${ratTex(r)}$`,
    divided: `$\\sin x = ${ratTex(r)}$`,
  };
}

/** Divide, or factorise? Dividing by something that can be zero throws solutions away. */
const divideFlow: Generator<DivideParams> = {
  id: 'tid-divide-flow',
  sample: (rng, difficulty) => ({
    type: difficulty > 1 ? rng.int(0, 3) : rng.pick([0, 0, 1, 2]),
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    value: rng.int(0, HALF_VALUES.length - 1),
  }),
  render: (p): Slide => {
    const eq = divideEquation(p);
    const divide = `Divide both sides by $${eq.div}$`;
    const factor = `Take $${eq.div}$ out as a factor`;
    const square = 'Square both sides';
    const t = TAN_FORMS[p.form].t;
    const dividedLabels =
      p.type === 0
        ? [`$\\tan x = ${specialTex(t)}$`, `$\\tan x = ${specialTex(1 / t)}$`, `$\\tan x = ${specialTex(-t)}$`]
        : [eq.divided!, `$\\tan x = ${ratTex(HALF_VALUES[p.value])}$`, '$\\tan x = 1$'];
    const factorLabels =
      p.type === 0
        ? ['$\\sin x = 0$ or $\\cos x = 0$', `$\\sin x = 0$ or $\\tan x = ${specialTex(t)}$`]
        : [eq.pair!, eq.slipPair!];
    const answer = p.type === 0 ? [divide, dividedLabels[0]] : [factor, eq.pair!];
    return {
      kind: 'flow',
      prompt: [prose('Choose the first move, then what it leaves you to solve.')],
      subject: eq.tex,
      steps: [
        {
          id: 'first',
          ask: 'What is the safest first move?',
          branches: [
            { label: divide, to: 'divided' },
            { label: factor, to: 'factored' },
            { label: square, outcome: 'Squaring can add solutions the equation never had.' },
          ],
        },
        {
          id: 'divided',
          ask: 'That leaves',
          branches: [...new Set(dividedLabels)]
            .sort((a, b) => hashSeed(a) - hashSeed(b))
            .map((label) => ({ label, outcome: 'One equation in one function.' })),
        },
        {
          id: 'factored',
          ask: 'It splits into',
          branches: [...new Set(factorLabels)]
            .sort((a, b) => hashSeed(a) - hashSeed(b))
            .map((label) => ({ label, outcome: 'Two simpler equations to solve.' })),
        },
      ],
      answer,
    };
  },
  solution: (p) => {
    const eq = divideEquation(p);
    if (p.type === 0) {
      return [
        {
          text: 'Here $\\cos x$ cannot be zero at a solution: if it were, $\\sin x$ would be $\\pm 1$ and the two sides could not match. So dividing by it is safe.',
        },
        { tex: `\\tan x = ${eq.tanTex}` },
      ];
    }
    return [
      {
        text: `$${eq.div}$ is on both sides, and it can be zero. Dividing by it would lose every solution with $${eq.div} = 0$, so take it out as a factor instead.`,
      },
      { text: `That gives ${eq.pair}.` },
    ];
  },
};

/** One tangent crossing: drag to the solution in the second half turn, or the first. */
const tanSlider: Generator<TanEqParams & { second: boolean }> = {
  id: 'tid-tan-slider',
  sample: (rng) => ({
    form: rng.int(0, TAN_FORMS.length - 1),
    k: rng.int(1, 4),
    moved: rng.chance(0.5),
    second: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    const answer = p.second ? alpha + 180 : alpha;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => Math.tan(x * DEGREE), accent: true, breaks: true }],
      horizontals: [t],
      yMin: -4,
      yMax: 4,
      label: 'The graph of y = tan x from 0 to 360 degrees, with a dashed level line crossing each branch',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `Turn this into an equation in $\\tan x$; the dashed line is its value. Slide to the solution ${p.second ? 'between $180^{\\circ}$ and $360^{\\circ}$' : 'between $0^{\\circ}$ and $180^{\\circ}$'}.`,
        ),
        display(tanEquationTex(p)),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer,
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { t } = TAN_FORMS[p.form];
    const alpha = tanPrincipal(t);
    return [
      { text: 'Divide by $\\cos x$:' },
      { tex: `\\tan x = ${specialTex(t)}` },
      {
        text: p.second
          ? `In the first half turn that is $${deg(alpha)}$, and tangent repeats every $180^{\\circ}$, so here it is $${deg(alpha + 180)}$.`
          : `In the first half turn the angle with that tangent is $${deg(alpha)}$.`,
      },
    ];
  },
};

/* ---------- Level 2, lesson 1: sin(A + B) and cos(A + B) ---------- */

/** A special value's TeX, or undefined when the value is off the table. */
function tryTex(value: number): string | undefined {
  try {
    return specialTex(value);
  } catch {
    return undefined;
  }
}

/** sin and cos of a special angle, as the learner reads them. */
const sinTex = (degrees: number): string => specialTex(trigAt('sin', degrees)!);
const cosTex = (degrees: number): string => specialTex(trigAt('cos', degrees)!);

interface ExpandParams {
  fn: 'sin' | 'cos';
  plus: boolean;
  alpha: number;
  v: number;
}

const EXPAND_EASY = [30, 45, 60];
const EXPAND_ALL = [30, 45, 60, 90, 120, 135, 150];

/** sin(x + a) or cos(x - a) with a a table angle, expanded into numbers times sin x and cos x. */
const expandTiles: Generator<ExpandParams> = {
  id: 'tid-expand-tiles',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['sin', 'cos'] as const),
    plus: rng.chance(0.5),
    alpha: rng.pick(difficulty > 1 ? EXPAND_ALL : EXPAND_EASY),
    v: rng.int(0, VARS.length - 1),
  }),
  render: ({ fn, plus, alpha, v }): Slide => {
    const x = VARS[v];
    const op = plus ? '+' : '-';
    // cos(x + a) = cos x cos a - sin x sin a: the sign flips for cosine.
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const [first, second] = fn === 'sin' ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    const answer = [cosTex(alpha), sinTex(alpha)];
    const distractors = [
      specialTex(-trigAt('cos', alpha)!),
      specialTex(-trigAt('sin', alpha)!),
      '\\frac{1}{2}',
      '\\frac{\\sqrt{3}}{2}',
      '\\frac{\\sqrt{2}}{2}',
      '1',
    ];
    return {
      kind: 'tiles',
      prompt: [prose(`Expand with the compound-angle formula and fill in the exact values.`)],
      template: `\\${fn}(${x} ${op} ${deg(alpha)}) = {0}${first} ${x} ${inner} {1}${second} ${x}`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: ({ fn, plus, alpha, v }) => {
    const x = VARS[v];
    const op = plus ? '+' : '-';
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const formula =
      fn === 'sin'
        ? `\\sin(A ${op} B) = \\sin A\\cos B ${op} \\cos A\\sin B`
        : `\\cos(A ${op} B) = \\cos A\\cos B ${inner} \\sin A\\sin B`;
    const [first, second] = fn === 'sin' ? ['\\sin', '\\cos'] : ['\\cos', '\\sin'];
    return [
      { tex: formula },
      { text: `With $A = ${x}$ and $B = ${deg(alpha)}$, where $\\cos ${deg(alpha)} = ${cosTex(alpha)}$ and $\\sin ${deg(alpha)} = ${sinTex(alpha)}$:` },
      { tex: `\\${fn}(${x} ${op} ${deg(alpha)}) = ${cosTex(alpha)}${first} ${x} ${inner} ${sinTex(alpha)}${second} ${x}` },
    ];
  },
};

interface CollapseParams {
  /** 0: sin A cos B + cos A sin B; 1: the same with a minus; 2: cos A cos B - sin A sin B; 3: with a plus. */
  form: number;
  a: number;
  b: number;
}

/** Whether a collapse form is a sum, and which function it collapses to. */
const COLLAPSE = [
  { fn: 'sin' as const, sum: true },
  { fn: 'sin' as const, sum: false },
  { fn: 'cos' as const, sum: true },
  { fn: 'cos' as const, sum: false },
];

function collapseTex({ form, a, b }: CollapseParams): string {
  const A = deg(a);
  const B = deg(b);
  if (form === 0) return `\\sin ${A}\\cos ${B} + \\cos ${A}\\sin ${B}`;
  if (form === 1) return `\\sin ${A}\\cos ${B} - \\cos ${A}\\sin ${B}`;
  if (form === 2) return `\\cos ${A}\\cos ${B} - \\sin ${A}\\sin ${B}`;
  return `\\cos ${A}\\cos ${B} + \\sin ${A}\\sin ${B}`;
}

const collapseTarget = ({ form, a, b }: CollapseParams): number => (COLLAPSE[form].sum ? a + b : a - b);

const COLLAPSE_EASY = [30, 45, 60, 90];
const COLLAPSE_ALL = [30, 45, 60, 90, 120, 135, 150];
const COLLAPSE_PARTS = [5, 10, 20, 25, 35, 40, 50, 55, 65, 70, 80, 85];

/** Recognise an expansion and fold it back into one sine or cosine of a table angle. */
const collapseTiles: Generator<CollapseParams> = {
  id: 'tid-collapse-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const form = rng.int(0, 3);
      const target = rng.pick(difficulty > 1 ? COLLAPSE_ALL : COLLAPSE_EASY);
      const b = rng.pick(COLLAPSE_PARTS);
      const a = COLLAPSE[form].sum ? target - b : target + b;
      if (a <= 0 || a >= 180 || a === b || a % 15 === 0) continue;
      return { form, a, b };
    }
  },
  render: (p): Slide => {
    const { fn } = COLLAPSE[p.form];
    const other = fn === 'sin' ? 'cos' : 'sin';
    const target = collapseTarget(p);
    const wrongAngle = COLLAPSE[p.form].sum ? Math.abs(p.a - p.b) : p.a + p.b;
    const answer = [`\\${fn} ${deg(target)}`, specialTex(trigAt(fn, target)!)];
    const distractors = [
      `\\${fn} ${deg(wrongAngle)}`,
      `\\${other} ${deg(target)}`,
      specialTex(trigAt(other, target)!),
      specialTex(-trigAt(fn, target)!),
      '\\frac{1}{2}',
      '\\frac{\\sqrt{2}}{2}',
    ];
    return {
      kind: 'tiles',
      prompt: [prose('Write this as one sine or cosine, then give its exact value.'), display(collapseTex(p))],
      template: '{0} = {1}',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const { fn, sum } = COLLAPSE[p.form];
    const target = collapseTarget(p);
    const shape =
      fn === 'sin'
        ? `\\sin A\\cos B ${sum ? '+' : '-'} \\cos A\\sin B = \\sin(A ${sum ? '+' : '-'} B)`
        : `\\cos A\\cos B ${sum ? '-' : '+'} \\sin A\\sin B = \\cos(A ${sum ? '+' : '-'} B)`;
    return [
      { text: 'It has the shape of a compound-angle formula read backwards:' },
      { tex: shape },
      {
        tex: `${collapseTex(p)} = \\${fn}(${deg(p.a)} ${sum ? '+' : '-'} ${deg(p.b)}) = \\${fn} ${deg(target)} = ${specialTex(trigAt(fn, target)!)}`,
      },
    ];
  },
};

interface FormulaParams {
  fn: 'sin' | 'cos' | 'tan';
  plus: boolean;
  pair: number;
  reverse: boolean;
}

const LETTER_PAIRS: [string, string][] = [
  ['A', 'B'],
  ['x', 'y'],
  ['\\alpha', '\\beta'],
  ['P', 'Q'],
  ['\\theta', '\\phi'],
];

/** The expansion of fn(a +- b), with the sign given explicitly so a slip can be built by flipping it. */
function expansion(fn: 'sin' | 'cos' | 'tan', plus: boolean, a: string, b: string): string {
  const op = plus ? '+' : '-';
  const flip = plus ? '-' : '+';
  if (fn === 'sin') return `\\sin ${a}\\cos ${b} ${op} \\cos ${a}\\sin ${b}`;
  if (fn === 'cos') return `\\cos ${a}\\cos ${b} ${flip} \\sin ${a}\\sin ${b}`;
  return `\\dfrac{\\tan ${a} ${op} \\tan ${b}}{1 ${flip} \\tan ${a}\\tan ${b}}`;
}

/** Which expansion is right? Or, read backwards, which single term is this? */
const formulaChoice: Generator<FormulaParams> = {
  id: 'tid-formula-choice',
  sample: (rng, difficulty) => ({
    fn: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
    plus: rng.chance(0.5),
    pair: rng.int(0, LETTER_PAIRS.length - 1),
    reverse: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const [a, b] = LETTER_PAIRS[p.pair];
    const op = p.plus ? '+' : '-';
    const flipOp = p.plus ? '-' : '+';
    const compact = `\\${p.fn}(${a} ${op} ${b})`;
    if (p.reverse) {
      const others: string[] =
        p.fn === 'tan'
          ? [`\\tan(${a} ${flipOp} ${b})`, `\\tan ${a} ${op} \\tan ${b}`, `\\sin(${a} ${op} ${b})`]
          : [
              `\\${p.fn}(${a} ${flipOp} ${b})`,
              `\\${p.fn === 'sin' ? 'cos' : 'sin'}(${a} ${op} ${b})`,
              `\\${p.fn === 'sin' ? 'cos' : 'sin'}(${a} ${flipOp} ${b})`,
            ];
      return choiceSlide(
        [prose('Which single term is this equal to?'), display(expansion(p.fn, p.plus, a, b))],
        compact,
        others,
        saltOf(p),
      );
    }
    const slips: string[] =
      p.fn === 'sin'
        ? [expansion('sin', !p.plus, a, b), `\\cos ${a}\\cos ${b} ${op} \\sin ${a}\\sin ${b}`, `\\sin ${a} ${op} \\sin ${b}`]
        : p.fn === 'cos'
          ? [expansion('cos', !p.plus, a, b), `\\sin ${a}\\cos ${b} ${op} \\cos ${a}\\sin ${b}`, `\\cos ${a} ${op} \\cos ${b}`]
          : [
              `\\dfrac{\\tan ${a} ${op} \\tan ${b}}{1 ${op} \\tan ${a}\\tan ${b}}`,
              expansion('tan', !p.plus, a, b),
              `\\tan ${a} ${op} \\tan ${b}`,
            ];
    return choiceSlide(
      [prose('Which is the expansion of'), display(compact)],
      expansion(p.fn, p.plus, a, b),
      slips,
      saltOf(p),
    );
  },
  solution: (p) => {
    const [a, b] = LETTER_PAIRS[p.pair];
    const op = p.plus ? '+' : '-';
    const note = {
      sin: 'Sine mixes the functions, sine-cosine then cosine-sine, and keeps the sign of the angle.',
      cos: 'Cosine keeps the functions together, cosines then sines, and flips the sign.',
      tan: 'Tangent keeps the sign on top and flips it underneath.',
    }[p.fn];
    return [{ text: note }, { tex: `\\${p.fn}(${a} ${op} ${b}) = ${expansion(p.fn, p.plus, a, b)}` }];
  },
};

/** Pythagorean triples: an acute angle with sine a/h has cosine b/h. */
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

interface Acute {
  triple: number;
  swap: boolean;
  given: 'sin' | 'cos';
}

/** sin and cos of an acute angle from a triple, as fractions. */
function acuteRatios({ triple, swap }: Acute): { sin: Rat; cos: Rat } {
  const [p, q, h] = TRIPLES[triple];
  const [a, b] = swap ? [q, p] : [p, q];
  return { sin: [a, h], cos: [b, h] };
}

interface CompoundTreeParams {
  A: Acute;
  B: Acute;
  fn: 'sin' | 'cos';
  plus: boolean;
}

function compoundValue({ A, B, fn, plus }: CompoundTreeParams): Rat {
  const a = acuteRatios(A);
  const b = acuteRatios(B);
  const d = a.sin[1] * b.sin[1];
  const sc = a.sin[0] * b.cos[0];
  const cs = a.cos[0] * b.sin[0];
  const cc = a.cos[0] * b.cos[0];
  const ss = a.sin[0] * b.sin[0];
  if (fn === 'sin') return rat(plus ? sc + cs : sc - cs, d);
  return rat(plus ? cc - ss : cc + ss, d);
}

function sampleAcute(rng: Rng, given?: 'sin' | 'cos'): Acute {
  return { triple: rng.int(0, TRIPLES.length - 1), swap: rng.chance(0.5), given: given ?? rng.pick(['sin', 'cos'] as const) };
}

const missing = (given: 'sin' | 'cos') => (given === 'sin' ? 'cos' : 'sin');

/** Given one ratio of each acute angle, find the other two and then sin or cos of the sum or difference. */
const compoundTree: Generator<CompoundTreeParams> = {
  id: 'tid-compound-tree',
  sample: (rng, difficulty) =>
    difficulty > 1
      ? { A: sampleAcute(rng), B: sampleAcute(rng), fn: rng.pick(['sin', 'cos'] as const), plus: rng.chance(0.5) }
      : { A: sampleAcute(rng, 'sin'), B: sampleAcute(rng, 'cos'), fn: rng.pick(['sin', 'cos'] as const), plus: true },
  render: (p): Slide => {
    const a = acuteRatios(p.A);
    const b = acuteRatios(p.B);
    const mA = missing(p.A.given);
    const mB = missing(p.B.given);
    const value = compoundValue(p);
    const answer = [ratTex(a[mA]), ratTex(b[mB]), ratTex(value)];
    const other = compoundValue({ ...p, plus: !p.plus });
    const swapped = compoundValue({ ...p, fn: p.fn === 'sin' ? 'cos' : 'sin' });
    const distractors = [
      ratTex(a[p.A.given]),
      ratTex(b[p.B.given]),
      ratTex(other),
      ratTex(swapped),
      ratTex([-value[0], value[1]]),
    ];
    const op = p.plus ? '+' : '-';
    return {
      kind: 'tree',
      prompt: [
        prose(
          `$\\${p.A.given} A = ${ratTex(a[p.A.given])}$ and $\\${p.B.given} B = ${ratTex(b[p.B.given])}$, with $A$ and $B$ both acute. Top row: $\\${mA} A$, then $\\${mB} B$. Underneath: $\\${p.fn}(A ${op} B)$.`,
        ),
      ],
      expression: `\\${p.fn}(A ${op} B) = ${expansion(p.fn, p.plus, 'A', 'B')}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'r', from: ['a', 'b'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const a = acuteRatios(p.A);
    const b = acuteRatios(p.B);
    const mA = missing(p.A.given);
    const mB = missing(p.B.given);
    const op = p.plus ? '+' : '-';
    const [pa, qa, ha] = TRIPLES[p.A.triple];
    const [pb, qb, hb] = TRIPLES[p.B.triple];
    const t = (x: Rat) => ratTex(x);
    const line =
      p.fn === 'sin'
        ? `${t(a.sin)} \\times ${t(b.cos)} ${op} ${t(a.cos)} \\times ${t(b.sin)}`
        : `${t(a.cos)} \\times ${t(b.cos)} ${p.plus ? '-' : '+'} ${t(a.sin)} \\times ${t(b.sin)}`;
    return [
      {
        text: `Each angle is acute, so its other ratio is positive, and comes from a right-angled triangle: the sides ${pa}, ${qa}, ${ha} for $A$ and ${pb}, ${qb}, ${hb} for $B$.`,
      },
      { tex: `\\${mA} A = ${t(a[mA])} \\qquad \\${mB} B = ${t(b[mB])}` },
      { tex: `\\${p.fn}(A ${op} B) = ${line} = ${t(compoundValue(p))}` },
    ];
  },
};

/* ---------- Level 2, lesson 2: tan(A + B) ---------- */

interface TanCompoundParams {
  a: Rat;
  b: Rat;
  plus: boolean;
}

const TAN_EASY: Rat[] = [1, 2, 3, 4, 5, 6].map((n) => [n, 1] as Rat);
const TAN_ALL: Rat[] = [
  ...[-4, -3, -2, -1, 1, 2, 3, 4, 5].map((n) => [n, 1] as Rat),
  [1, 2],
  [-1, 2],
  [1, 3],
  [2, 3],
  [3, 2],
];

/** (a + b)/(1 - ab), or (a - b)/(1 + ab), as a numerator and denominator before reducing. */
function tanParts({ a, b, plus }: TanCompoundParams): { top: Rat; bottom: Rat; value: Rat } {
  const [an, ad] = a;
  const [bn, bd] = b;
  const top = rat(plus ? an * bd + bn * ad : an * bd - bn * ad, ad * bd);
  const bottom = rat(plus ? ad * bd - an * bn : ad * bd + an * bn, ad * bd);
  return { top, bottom, value: rat(top[0] * bottom[1], top[1] * bottom[0]) };
}

function sampleTanCompound(rng: Rng, difficulty: number): TanCompoundParams {
  for (;;) {
    const pool = difficulty > 1 ? TAN_ALL : TAN_EASY;
    const p = { a: rng.pick(pool), b: rng.pick(pool), plus: difficulty > 1 ? rng.chance(0.5) : true };
    const { top, bottom } = tanParts(p);
    if (bottom[0] === 0 || top[0] === 0 || sameRat(p.a, p.b)) continue;
    return p;
  }
}

const tanFormulaTex = (plus: boolean) =>
  plus
    ? '\\tan(A + B) = \\dfrac{\\tan A + \\tan B}{1 - \\tan A\\tan B}'
    : '\\tan(A - B) = \\dfrac{\\tan A - \\tan B}{1 + \\tan A\\tan B}';

function tanCompoundSolution(p: TanCompoundParams): SolutionStep[] {
  const { top, bottom, value } = tanParts(p);
  const op = p.plus ? '+' : '-';
  const flip = p.plus ? '-' : '+';
  const b = br(ratTex(p.b));
  return [
    { tex: tanFormulaTex(p.plus) },
    { tex: `\\text{top} = ${ratTex(p.a)} ${op} ${b} = ${ratTex(top)} \\qquad \\text{bottom} = 1 ${flip} ${br(ratTex(p.a))} \\times ${b} = ${ratTex(bottom)}` },
    { tex: `\\tan(A ${op} B) = ${ratTex(top)} \\div ${br(ratTex(bottom))} = ${ratTex(value)}` },
  ];
}

/** tan(A + B) from tan A and tan B, typed. */
const tanCompound: Generator<TanCompoundParams> = {
  id: 'tid-tan-compound',
  sample: (rng, difficulty) => sampleTanCompound(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(`$\\tan A = ${ratTex(p.a)}$ and $\\tan B = ${ratTex(p.b)}$. Find the exact value.`)],
    lead: `\\tan(A ${p.plus ? '+' : '-'} B) =`,
    keypad: NUMBER_KEYS,
    answer: ratAnswer(tanParts(p).value),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { top, value } = tanParts(p);
    const wrongSign = tanParts({ ...p, plus: !p.plus }).value;
    const flippedBottom = rat(top[0] * p.a[1] * p.b[1], top[1] * (p.a[1] * p.b[1] + (p.plus ? 1 : -1) * p.a[0] * p.b[0]));
    return ratOptions(value, [top, flippedBottom, wrongSign, [-value[0], value[1]]]);
  },
  solution: tanCompoundSolution,
};

/** The same computation laid out: top and bottom of the formula, then the quotient. */
const tanCompoundTree: Generator<TanCompoundParams> = {
  id: 'tid-tan-compound-tree',
  sample: (rng, difficulty) => sampleTanCompound(rng, difficulty),
  render: (p): Slide => {
    const { top, bottom, value } = tanParts(p);
    const answer = [ratTex(top), ratTex(bottom), ratTex(value)];
    const other = tanParts({ ...p, plus: !p.plus });
    const distractors = [
      ratTex(other.top),
      ratTex(other.bottom),
      ratTex(rat(bottom[0] * top[1], bottom[1] * top[0])),
      ratTex([-value[0], value[1]]),
      ratTex(rat(p.a[0] * p.b[0], p.a[1] * p.b[1])),
    ];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `$\\tan A = ${ratTex(p.a)}$ and $\\tan B = ${ratTex(p.b)}$. Top row: the top of the formula, then the bottom. Underneath: their quotient.`,
        ),
      ],
      expression: tanFormulaTex(p.plus),
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'q', from: ['top', 'bottom'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: tanCompoundSolution,
};

interface TanShiftParams {
  plus: boolean;
  k: Rat;
  phrasing: number;
}

/** tan x from tan(x + 45) = k or tan(x - 45) = k. */
function tanShiftValue({ plus, k }: TanShiftParams): Rat {
  const [n, d] = k;
  // tan(x + 45) = (t + 1)/(1 - t) = k gives t = (k - 1)/(k + 1); the minus version gives (1 + k)/(1 - k).
  return plus ? rat(n - d, n + d) : rat(d + n, d - n);
}

const SHIFT_FRACTIONS: Rat[] = [
  [1, 2],
  [-1, 2],
  [1, 3],
  [-1, 3],
  [2, 3],
  [3, 2],
  [-3, 2],
  [1, 4],
];

const TAN_SHIFT_PROMPTS = [
  'Expand the left-hand side with the formula for $\\tan(A \\pm B)$, then rearrange for $\\tan x$.',
  'Find the exact value of $\\tan x$.',
];

/** Undo a compound angle: tan(x + 45) = k, so tan x = ? */
const tanShiftSolve: Generator<TanShiftParams> = {
  id: 'tid-tan-shift-solve',
  sample: (rng, difficulty) => {
    for (;;) {
      const plus = rng.chance(0.5);
      const k: Rat =
        difficulty > 1 && rng.chance(0.6) ? rng.pick(SHIFT_FRACTIONS) : [rng.int(-9, 9), 1];
      // k = -1 (plus) or k = 1 (minus) would divide by zero; k = +-1 the other way round gives tan x = 0 or undefined.
      if (Math.abs(ratValue(k)) === 1) continue;
      return { plus, k, phrasing: rng.int(0, TAN_SHIFT_PROMPTS.length - 1) };
    }
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(TAN_SHIFT_PROMPTS[p.phrasing]), display(`\\tan(x ${p.plus ? '+' : '-'} 45^{\\circ}) = ${ratTex(p.k)}`)],
    lead: '\\tan x =',
    keypad: NUMBER_KEYS,
    answer: ratAnswer(tanShiftValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const [n, d] = p.k;
    const value = tanShiftValue(p);
    return ratOptions(value, [
      tanShiftValue({ ...p, plus: !p.plus }),
      rat(value[1], value[0]),
      rat(n - d, d),
      [-value[0], value[1]],
    ]);
  },
  solution: (p) => {
    const t = tanShiftValue(p);
    const k = ratTex(p.k);
    return p.plus
      ? [
          { text: 'With $\\tan 45^{\\circ} = 1$, write $t$ for $\\tan x$:' },
          { tex: `\\frac{t + 1}{1 - t} = ${k}` },
          { tex: `t + 1 = ${k}(1 - t) \\quad \\Rightarrow \\quad ${ratTex(addRat(p.k, [1, 1]))}\\,t = ${ratTex(addRat(p.k, [-1, 1]))}` },
          { tex: `\\tan x = ${ratTex(t)}` },
        ]
      : [
          { text: 'With $\\tan 45^{\\circ} = 1$, write $t$ for $\\tan x$:' },
          { tex: `\\frac{t - 1}{1 + t} = ${k}` },
          { tex: `t - 1 = ${k}(1 + t) \\quad \\Rightarrow \\quad ${ratTex(addRat([1, 1], [-p.k[0], p.k[1]]))}\\,t = ${ratTex(addRat([1, 1], p.k))}` },
          { tex: `\\tan x = ${ratTex(t)}` },
        ];
  },
};

interface TanExpandParams {
  alpha: number;
  plus: boolean;
  v: number;
}

const TAN_EXPAND_EASY = [30, 45, 60, 135];
const TAN_EXPAND_ALL = [30, 45, 60, 120, 135, 150];
const TAN_EXPAND_VARS = ['x', '\\theta', 'A', 'B'];

/** Top and bottom of tan(v +- alpha), cleared of fractions for 30 and 150 degrees. */
function tanExpandParts({ alpha, plus }: TanExpandParams, v: string): { top: string; bottom: string; slipTop: string; slipBottom: string } {
  const tau = trigAt('tan', alpha)!;
  const e = (plus ? 1 : -1) * Math.sign(tau);
  const up = e > 0 ? '+' : '-';
  const down = e > 0 ? '-' : '+';
  const size = Math.abs(tau);
  if (Math.abs(size - 1) < 1e-9) {
    return {
      top: `\\tan ${v} ${up} 1`,
      bottom: `1 ${down} \\tan ${v}`,
      slipTop: `\\tan ${v} ${down} 1`,
      slipBottom: `1 ${up} \\tan ${v}`,
    };
  }
  if (size > 1) {
    return {
      top: `\\tan ${v} ${up} \\sqrt{3}`,
      bottom: `1 ${down} \\sqrt{3}\\tan ${v}`,
      slipTop: `\\tan ${v} ${down} \\sqrt{3}`,
      slipBottom: `1 ${up} \\sqrt{3}\\tan ${v}`,
    };
  }
  return {
    top: `\\sqrt{3}\\tan ${v} ${up} 1`,
    bottom: `\\sqrt{3} ${down} \\tan ${v}`,
    slipTop: `\\sqrt{3}\\tan ${v} ${down} 1`,
    slipBottom: `\\sqrt{3} ${up} \\tan ${v}`,
  };
}

/** tan(x + 60) and friends as one fraction in tan x. */
const tanExpandTiles: Generator<TanExpandParams> = {
  id: 'tid-tan-expand-tiles',
  sample: (rng, difficulty) => ({
    alpha: rng.pick(difficulty > 1 ? TAN_EXPAND_ALL : TAN_EXPAND_EASY),
    plus: rng.chance(0.5),
    v: rng.int(0, difficulty > 1 ? 2 : 3),
  }),
  render: (p): Slide => {
    const v = TAN_EXPAND_VARS[p.v];
    const parts = tanExpandParts(p, v);
    const answer = [parts.top, parts.bottom];
    const cleared = Math.abs(Math.abs(trigAt('tan', p.alpha)!) * Math.sqrt(3) - 1) < 1e-9;
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Expand with the formula for $\\tan(A \\pm B)$, putting in $\\tan ${deg(p.alpha)} = ${specialTex(trigAt('tan', p.alpha)!)}$.${cleared ? ' Then multiply top and bottom by $\\sqrt{3}$ to clear the fraction.' : ''}`,
        ),
      ],
      template: `\\tan(${v} ${p.plus ? '+' : '-'} ${deg(p.alpha)}) = ({0}) \\div ({1})`,
      bank: bankOf(answer, [parts.slipTop, parts.slipBottom, parts.bottom.replace('1', '2')]),
      answer,
    };
  },
  solution: (p) => {
    const v = TAN_EXPAND_VARS[p.v];
    const parts = tanExpandParts(p, v);
    const tau = specialTex(trigAt('tan', p.alpha)!);
    const op = p.plus ? '+' : '-';
    return [
      { tex: tanFormulaTex(p.plus).replace(/A/g, v).replace(/B/g, deg(p.alpha)) },
      {
        text: `Put in $\\tan ${deg(p.alpha)} = ${tau}$ and tidy the signs${Math.abs(Math.abs(trigAt('tan', p.alpha)!) * Math.sqrt(3) - 1) < 1e-9 ? ', then multiply top and bottom by $\\sqrt{3}$' : ''}.`,
      },
      { tex: `\\tan(${v} ${op} ${deg(p.alpha)}) = \\frac{${parts.top}}{${parts.bottom}}` },
    ];
  },
};

/* ---------- Level 2, lesson 3: exact values from compound angles ---------- */

/** An angle between table angles, and every way to split it into a 45-type and a 30-type table angle. */
const HALF_TABLE = [15, 75, 105, 165];
const HALF_TABLE_ALL = [15, 75, 105, 165, 195, 255, 285, 345];

function splitsOf(angle: number): { p: number; q: number; plus: boolean }[] {
  const forty = [45, 135, 225, 315];
  const thirty = [30, 60, 120, 150, 210, 240, 300, 330];
  const out: { p: number; q: number; plus: boolean }[] = [];
  for (const f of forty) {
    for (const t of thirty) {
      if (f + t === angle) out.push({ p: Math.max(f, t), q: Math.min(f, t), plus: true });
      if (f - t === angle) out.push({ p: f, q: t, plus: false });
      if (t - f === angle) out.push({ p: t, q: f, plus: false });
    }
  }
  return out;
}

/** The value of fn(angle) as (s6 sqrt 6 + s2 sqrt 2)/4, with the signs found numerically and checked. */
function quarterSigns(fn: 'sin' | 'cos', angle: number): [number, number] {
  const value = trigAt(fn, angle)!;
  for (const s6 of [1, -1]) {
    for (const s2 of [1, -1]) {
      if (Math.abs((s6 * Math.sqrt(6) + s2 * Math.sqrt(2)) / 4 - value) < 1e-9) return [s6, s2];
    }
  }
  throw new Error(`${fn} ${angle} is not a (sqrt 6 +- sqrt 2)/4 value`);
}

/** (s6 sqrt 6 + s2 sqrt 2)/4 as the learner reads it, a positive term first. */
function quarterTex([s6, s2]: [number, number]): string {
  if (s6 > 0 && s2 > 0) return '\\frac{\\sqrt{6} + \\sqrt{2}}{4}';
  if (s6 > 0) return '\\frac{\\sqrt{6} - \\sqrt{2}}{4}';
  if (s2 > 0) return '\\frac{\\sqrt{2} - \\sqrt{6}}{4}';
  return '-\\frac{\\sqrt{6} + \\sqrt{2}}{4}';
}

const quarterAnswer = ([s6, s2]: [number, number]): string => `((${s6})*sqrt(6) + (${s2})*sqrt(2))/4`;

interface ExactTilesParams {
  fn: 'sin' | 'cos';
  angle: number;
  split: number;
}

/** sin 75 exactly: split into table angles, expand, and place the surds. */
const exactTiles: Generator<ExactTilesParams> = {
  id: 'tid-exact-tiles',
  sample: (rng, difficulty) => {
    const angle = rng.pick(difficulty > 1 ? HALF_TABLE_ALL : HALF_TABLE);
    return { fn: rng.pick(['sin', 'cos'] as const), angle, split: rng.int(0, splitsOf(angle).length - 1) };
  },
  render: (p): Slide => {
    const [s6, s2] = quarterSigns(p.fn, p.angle);
    const s = splitsOf(p.angle)[p.split];
    const answer = [s6 > 0 ? '\\sqrt{6}' : '-\\sqrt{6}', s2 > 0 ? '+ \\sqrt{2}' : '- \\sqrt{2}'];
    const distractors = [
      s6 > 0 ? '-\\sqrt{6}' : '\\sqrt{6}',
      s2 > 0 ? '- \\sqrt{2}' : '+ \\sqrt{2}',
      '\\sqrt{2}',
      '+ \\sqrt{3}',
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Find the exact value of $\\${p.fn} ${deg(p.angle)}$, using $${deg(p.angle)} = ${deg(s.p)} ${s.plus ? '+' : '-'} ${deg(s.q)}$. Put the $\\sqrt{6}$ term first.`,
        ),
      ],
      template: `\\${p.fn} ${deg(p.angle)} = \\tfrac14({0} {1})`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  choices: (p) => {
    const signs = quarterSigns(p.fn, p.angle);
    const others: [number, number][] = [
      [signs[0], -signs[1]],
      [-signs[0], signs[1]],
      [-signs[0], -signs[1]],
    ];
    return options(
      { tex: quarterTex(signs), answer: quarterAnswer(signs) },
      ...others.map((o) => ({ tex: quarterTex(o), answer: quarterAnswer(o) })),
    );
  },
  solution: (p) => exactSolution(p.fn, splitsOf(p.angle)[p.split]),
};

/** The working for fn(p +- q), each product written out. */
function exactSolution(fn: 'sin' | 'cos', s: { p: number; q: number; plus: boolean }): SolutionStep[] {
  const op = s.plus ? '+' : '-';
  const inner = fn === 'sin' ? op : s.plus ? '-' : '+';
  const [f1, g1, f2, g2] = fn === 'sin' ? ['sin', 'cos', 'cos', 'sin'] : ['cos', 'cos', 'sin', 'sin'];
  const t1 = surdProduct(f1 as 'sin' | 'cos', s.p, g1 as 'sin' | 'cos', s.q);
  const t2 = surdProduct(f2 as 'sin' | 'cos', s.p, g2 as 'sin' | 'cos', s.q);
  const total = surdCombine(t1, t2, inner === '+' ? 1 : -1);
  return [
    { tex: `\\${fn}(${deg(s.p)} ${op} ${deg(s.q)}) = \\${f1} ${deg(s.p)}\\${g1} ${deg(s.q)} ${inner} \\${f2} ${deg(s.p)}\\${g2} ${deg(s.q)}` },
    {
      tex: `= ${specialTex(trigAt(f1 as Fn, s.p)!)} \\times ${br(specialTex(trigAt(g1 as Fn, s.q)!))} ${inner} ${br(specialTex(trigAt(f2 as Fn, s.p)!))} \\times ${br(specialTex(trigAt(g2 as Fn, s.q)!))}`,
    },
    { tex: `= ${surdTex(t1)} ${inner} ${br(surdTex(t2))} = ${surdSumTex(total)}` },
  ];
}

/**
 * Exact arithmetic on values like sqrt(3)/2: a sum of rationals times square roots of
 * square-free numbers, keyed by the number under the root.
 */
type SurdSum = Map<number, Rat>;

/** sin or cos of 0, 30, 45, 60 or 90 degrees (or any multiple), as a coefficient and a root. */
function tableSurd(fn: Fn, degrees: number): SurdSum {
  const value = trigAt(fn, degrees)!;
  const size = Math.abs(value);
  const sign = Math.sign(value);
  const out: SurdSum = new Map();
  if (size < 1e-9) return out;
  if (Math.abs(size - 1) < 1e-9) out.set(1, [sign, 1]);
  else if (Math.abs(size - 0.5) < 1e-9) out.set(1, [sign, 2]);
  else if (Math.abs(size - Math.SQRT2 / 2) < 1e-9) out.set(2, [sign, 2]);
  else if (Math.abs(size - Math.sqrt(3) / 2) < 1e-9) out.set(3, [sign, 2]);
  else throw new Error(`${fn} ${degrees} is not a sine or cosine table value`);
  return out;
}

const addRat = (a: Rat, b: Rat): Rat => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);

/** The product of two single-root values. */
function surdProduct(f: 'sin' | 'cos', p: number, g: 'sin' | 'cos', q: number): SurdSum {
  const x = tableSurd(f, p);
  const y = tableSurd(g, q);
  const out: SurdSum = new Map();
  for (const [m1, r1] of x) {
    for (const [m2, r2] of y) {
      let m = m1 * m2;
      let k = 1;
      // Pull square factors out from under the root; only 4 and 9 can occur here.
      for (const s of [2, 3]) {
        while (m % (s * s) === 0) {
          m /= s * s;
          k *= s;
        }
      }
      const term = rat(r1[0] * r2[0] * k, r1[1] * r2[1]);
      out.set(m, out.has(m) ? addRat(out.get(m)!, term) : term);
    }
  }
  return out;
}

function surdCombine(a: SurdSum, b: SurdSum, sign: number): SurdSum {
  const out: SurdSum = new Map(a);
  for (const [m, r] of b) {
    const term: Rat = [sign * r[0], r[1]];
    out.set(m, out.has(m) ? addRat(out.get(m)!, term) : term);
  }
  for (const [m, r] of [...out]) if (r[0] === 0) out.delete(m);
  return out;
}

const surdValue = (s: SurdSum): number => [...s].reduce((t, [m, [n, d]]) => t + (n / d) * Math.sqrt(m), 0);

/** One term: \\frac{\\sqrt{6}}{4}, -\\frac{1}{2}, 2\\sqrt{3}. */
function surdTex(s: SurdSum): string {
  const terms = [...s];
  if (terms.length === 0) return '0';
  if (terms.length > 1) return surdSumTex(s);
  const [m, [n, d]] = terms[0];
  if (m === 1) return ratTex([n, d]);
  const sign = n < 0 ? '-' : '';
  const k = Math.abs(n) === 1 ? '' : `${Math.abs(n)}`;
  return d === 1 ? `${sign}${k}\\sqrt{${m}}` : `${sign}\\frac{${k}\\sqrt{${m}}}{${d}}`;
}

/** Several roots over a common denominator, a positive term first: \\frac{\\sqrt{6} + \\sqrt{2}}{4}. */
function surdSumTex(s: SurdSum): string {
  const terms = [...s].sort((a, b) => b[0] - a[0]);
  if (terms.length <= 1) return surdTex(s);
  const common = terms.reduce((l, [, [, d]]) => (l * d) / gcd(l, d), 1);
  const nums = terms.map(([m, [n, d]]) => ({ m, n: (n * common) / d }));
  const negate = nums.every(({ n }) => n < 0);
  const ordered = [...nums.filter(({ n }) => (negate ? -n : n) > 0), ...nums.filter(({ n }) => (negate ? -n : n) < 0)];
  const top = polyTex(ordered.map(({ m, n }) => [negate ? -n : n, m === 1 ? '' : `\\sqrt{${m}}`]));
  const body = common === 1 ? top : `\\frac{${top}}{${common}}`;
  return negate ? `-${common === 1 ? `(${top})` : body}` : body;
}

interface ExactStepsParams {
  fn: 'sin' | 'cos';
  p: number;
  q: number;
  plus: boolean;
  phrasing: number;
}

const EXACT_PAIRS_EASY: [number, number, boolean][] = [
  [30, 30, true],
  [45, 30, true],
  [45, 45, true],
  [60, 30, true],
  [60, 45, true],
  [60, 60, true],
  [45, 30, false],
  [60, 30, false],
  [60, 45, false],
];
const EXACT_PAIRS_ALL: [number, number, boolean][] = [
  ...EXACT_PAIRS_EASY,
  [90, 30, true],
  [90, 45, true],
  [90, 60, true],
  [90, 30, false],
  [90, 45, false],
  [90, 60, false],
];

const EXACT_STEPS_PROMPTS = [
  'Expand, then work out each product and add them.',
  'Put in the table values one product at a time, then combine.',
];

/** Each product of table values first, then the two combined. */
const exactSteps: Generator<ExactStepsParams> = {
  id: 'tid-exact-steps',
  sample: (rng, difficulty) => {
    const [p, q, plus] = rng.pick(difficulty > 1 ? EXACT_PAIRS_ALL : EXACT_PAIRS_EASY);
    return { fn: rng.pick(['sin', 'cos'] as const), p, q, plus, phrasing: rng.int(0, EXACT_STEPS_PROMPTS.length - 1) };
  },
  render: ({ fn, p, q, plus, phrasing }): Slide => {
    const op = plus ? '+' : '-';
    const inner = fn === 'sin' ? op : plus ? '-' : '+';
    const [f1, g1, f2, g2] = (fn === 'sin' ? ['sin', 'cos', 'cos', 'sin'] : ['cos', 'cos', 'sin', 'sin']) as ('sin' | 'cos')[];
    const t1 = surdProduct(f1, p, g1, q);
    const t2 = surdProduct(f2, p, g2, q);
    const sign = inner === '+' ? 1 : -1;
    const total = surdCombine(t1, t2, sign);
    const target = plus ? p + q : p - q;
    if (Math.abs(surdValue(total) - trigAt(fn, target)!) > 1e-9) throw new Error(`exact steps disagree at ${fn} ${target}`);
    const products = [
      surdProduct('sin', p, 'sin', q),
      surdProduct('cos', p, 'cos', q),
      surdProduct('sin', p, 'cos', q),
      surdProduct('cos', p, 'sin', q),
    ].map(surdTex);
    const combos = [surdCombine(t1, t2, -sign), surdCombine(t2, t1, -1), surdCombine(surdCombine(new Map(), t1, -1), t2, -sign)].map(
      surdSumTex,
    );
    const bank = (value: string, extra: string[]) => scatter([value, ...[...new Set(extra)].filter((t) => t !== value).slice(0, 3)]);
    return {
      kind: 'steps',
      prompt: [prose(`$\\${fn} ${deg(target)} = \\${fn}(${deg(p)} ${op} ${deg(q)})$. ${EXACT_STEPS_PROMPTS[phrasing]}`)],
      start: [`\\${f1} ${deg(p)}\\${g1} ${deg(q)}`, inner, `\\${f2} ${deg(p)}\\${g2} ${deg(q)}`],
      reductions: [
        { span: [0, 1], value: surdTex(t1), bank: bank(surdTex(t1), [...products, '\\frac{\\sqrt{3}}{2}', '\\frac{1}{2}']) },
        { span: [2, 3], value: surdTex(t2), bank: bank(surdTex(t2), [...products, '\\frac{\\sqrt{2}}{2}', '\\frac{1}{4}']) },
        { span: [0, 3], value: surdSumTex(total), bank: bank(surdSumTex(total), [...combos, '\\frac{\\sqrt{6}}{2}', '1']) },
      ],
    };
  },
  solution: ({ fn, p, q, plus }) => exactSolution(fn, { p, q, plus }),
};

interface TanExactParams {
  fn: 'tan' | 'cot';
  angle: number;
  radians: boolean;
  phrasing: number;
}

/** tan of the angle as a + b sqrt 3 with a = +-2, b = +-1, signs found numerically. */
function tanSigns({ fn, angle }: TanExactParams): [number, number] {
  const t = trigAt('tan', angle)!;
  const value = fn === 'tan' ? t : 1 / t;
  for (const a of [2, -2]) {
    for (const b of [1, -1]) {
      if (Math.abs(a + b * Math.sqrt(3) - value) < 1e-9) return [a, b];
    }
  }
  throw new Error(`${fn} ${angle} is not 2 +- sqrt 3`);
}

function twoRootThreeTex([a, b]: [number, number]): string {
  if (a > 0) return `2 ${b > 0 ? '+' : '-'} \\sqrt{3}`;
  return b > 0 ? '\\sqrt{3} - 2' : '-2 - \\sqrt{3}';
}

const TAN_EXACT_PROMPTS = ['Find the exact value.', 'Which is the exact value?'];

/** tan 75 = 2 + sqrt 3 and its relatives: a compound angle, then rationalising. */
const tanExactChoice: Generator<TanExactParams> = {
  id: 'tid-tan-exact-choice',
  sample: (rng, difficulty) => ({
    fn: rng.pick(['tan', 'cot'] as const),
    angle: rng.pick(difficulty > 1 ? HALF_TABLE_ALL : HALF_TABLE),
    radians: rng.chance(0.5),
    phrasing: rng.int(0, TAN_EXACT_PROMPTS.length - 1),
  }),
  render: (p): Slide => {
    const signs = tanSigns(p);
    const all: [number, number][] = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
    ];
    const fnTex = p.fn === 'tan' ? '\\tan' : '\\cot';
    return choiceSlide(
      [prose(TAN_EXACT_PROMPTS[p.phrasing]), display(`${fnTex} ${angleTex(p.angle, p.radians)}`)],
      twoRootThreeTex(signs),
      all.filter(([a, b]) => a !== signs[0] || b !== signs[1]).map(twoRootThreeTex),
      saltOf(p),
    );
  },
  solution: (p) => {
    const signs = tanSigns(p);
    const reduced = p.angle % 180;
    const s = splitsOf(reduced)[0];
    const steps: SolutionStep[] = [];
    if (reduced !== p.angle) {
      steps.push({ text: `Tangent repeats every half turn, so this is the same as at $${deg(reduced)}$.` });
    }
    steps.push(
      { text: `$${deg(reduced)} = ${deg(s.p)} ${s.plus ? '+' : '-'} ${deg(s.q)}$, so use the formula for $\\tan(A ${s.plus ? '+' : '-'} B)$ with $\\tan ${deg(s.p)} = ${specialTex(trigAt('tan', s.p)!)}$ and $\\tan ${deg(s.q)} = ${specialTex(trigAt('tan', s.q)!)}$.` },
      { text: 'Multiply top and bottom by $\\sqrt{3}$, then by the conjugate of the bottom, to clear the roots from the denominator.' },
      { tex: `\\tan ${deg(reduced)} = ${twoRootThreeTex(tanSigns({ ...p, fn: 'tan', angle: reduced }))}` },
    );
    if (p.fn === 'cot') {
      steps.push({
        text: 'Cotangent is one over tangent. Since $(2 + \\sqrt{3})(2 - \\sqrt{3}) = 1$, turning one of these over gives the other, with the same sign.',
      });
    }
    steps.push({ tex: `${p.fn === 'tan' ? '\\tan' : '\\cot'} ${angleTex(p.angle, p.radians)} = ${twoRootThreeTex(signs)}` });
    return steps;
  },
};

/* ---------- Level 2, lesson 4: the double-angle formulae ---------- */

interface DoubleValueParams {
  triple: number;
  swap: boolean;
  given: 'sin' | 'cos' | 'tan';
  /** 1 to 4. */
  quadrant: number;
  ask: 'sin' | 'cos' | 'tan';
}

const QUADRANT_TEXT = [
  '',
  '$x$ is acute',
  '$90^{\\circ} < x < 180^{\\circ}$',
  '$180^{\\circ} < x < 270^{\\circ}$',
  '$270^{\\circ} < x < 360^{\\circ}$',
];

/** sin x and cos x with the quadrant's signs, as fractions. */
function signedRatios({ triple, swap, quadrant }: DoubleValueParams): { s: Rat; c: Rat } {
  const [p, q, h] = TRIPLES[triple];
  const [a, b] = swap ? [q, p] : [p, q];
  const sSign = quadrant <= 2 ? 1 : -1;
  const cSign = quadrant === 1 || quadrant === 4 ? 1 : -1;
  return { s: [sSign * a, h], c: [cSign * b, h] };
}

function doubleValue(p: DoubleValueParams): Rat {
  const { s, c } = signedRatios(p);
  const h2 = s[1] * s[1];
  if (p.ask === 'sin') return rat(2 * s[0] * c[0], h2);
  if (p.ask === 'cos') return rat(c[0] * c[0] - s[0] * s[0], h2);
  return rat(2 * s[0] * c[0], c[0] * c[0] - s[0] * s[0]);
}

function givenRatio(p: DoubleValueParams): Rat {
  const { s, c } = signedRatios(p);
  if (p.given === 'sin') return s;
  if (p.given === 'cos') return c;
  return rat(s[0], c[0]);
}

/** sin 2x, cos 2x or tan 2x from one ratio of x and where x lies. */
const doubleValue_: Generator<DoubleValueParams> = {
  id: 'tid-double-value',
  sample: (rng, difficulty) => ({
    triple: rng.int(0, TRIPLES.length - 1),
    swap: rng.chance(0.5),
    given: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
    quadrant: difficulty > 1 ? rng.int(2, 4) : 1,
    ask: rng.pick(difficulty > 1 ? (['sin', 'cos', 'tan'] as const) : (['sin', 'cos'] as const)),
  }),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [prose(`Given that $\\${p.given} x = ${ratTex(givenRatio(p))}$ and ${QUADRANT_TEXT[p.quadrant]}, find the exact value.`)],
    lead: `\\${p.ask} 2x =`,
    keypad: NUMBER_KEYS,
    answer: ratAnswer(doubleValue(p)),
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { s, c } = signedRatios(p);
    const value = doubleValue(p);
    const h = s[1];
    return ratOptions(value, [
      [-value[0], value[1]],
      p.ask === 'sin' ? rat(2 * s[0], h) : p.ask === 'cos' ? rat(s[0] * s[0] - c[0] * c[0], h * h) : rat(2 * s[0], c[0]),
      p.ask === 'tan' ? rat(2 * s[0] * c[0], h * h) : rat(2 * c[0], h),
      rat(value[1], value[0]),
    ]);
  },
  solution: (p) => {
    const { s, c } = signedRatios(p);
    const [pp, qq, h] = TRIPLES[p.triple];
    const steps: SolutionStep[] = [
      {
        text: `A right-angled triangle with sides ${pp}, ${qq}, ${h} gives the sizes of the ratios; ${QUADRANT_TEXT[p.quadrant]} fixes their signs.`,
      },
      { tex: `\\sin x = ${ratTex(s)} \\qquad \\cos x = ${ratTex(c)}` },
    ];
    if (p.ask === 'sin') steps.push({ tex: `\\sin 2x = 2\\sin x\\cos x = 2 \\times ${br(ratTex(s))} \\times ${br(ratTex(c))} = ${ratTex(doubleValue(p))}` });
    else if (p.ask === 'cos') steps.push({ tex: `\\cos 2x = \\cos^2 x - \\sin^2 x = ${ratTex(rat(c[0] * c[0], h * h))} - ${ratTex(rat(s[0] * s[0], h * h))} = ${ratTex(doubleValue(p))}` });
    else {
      const t = rat(s[0], c[0]);
      steps.push(
        { tex: `\\tan x = ${ratTex(t)}` },
        { tex: `\\tan 2x = \\frac{2\\tan x}{1 - \\tan^2 x} = ${ratTex(doubleValue(p))}` },
      );
    }
    return steps;
  },
};

interface DoubleTilesParams {
  form: number;
  m: number;
  v: number;
}

interface DoubleForm {
  hard: boolean;
  template: (H: string, D: string) => string;
  answer: (H: string, D: string) => string[];
  wrong: (H: string, D: string, Q: string) => string[];
  says: string;
}

const DOUBLE_FORMS: DoubleForm[] = [
  {
    hard: false,
    template: (H, D) => `\\sin ${D} = 2\\sin ${H}\\,{0}`,
    answer: (H) => [`\\cos ${H}`],
    wrong: (H, D) => [`\\cos ${D}`, `\\sin ${H}`, `\\cos^2 ${H}`],
    says: '\\sin 2A = 2\\sin A\\cos A',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = 1 - {0}`,
    answer: (H) => [`2\\sin^2 ${H}`],
    wrong: (H, D) => [`2\\sin^2 ${D}`, `\\sin^2 ${H}`, `2\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = {0} - 1`,
    answer: (H) => [`2\\cos^2 ${H}`],
    wrong: (H, D) => [`2\\cos^2 ${D}`, `\\cos^2 ${H}`, `2\\sin^2 ${H}`],
    says: '\\cos 2A = 2\\cos^2 A - 1',
  },
  {
    hard: false,
    template: (_H, D) => `\\cos ${D} = {0} - {1}`,
    answer: (H) => [`\\cos^2 ${H}`, `\\sin^2 ${H}`],
    wrong: (H, D) => [`\\cos^2 ${D}`, `\\sin^2 ${D}`, `2\\sin^2 ${H}`],
    says: '\\cos 2A = \\cos^2 A - \\sin^2 A',
  },
  {
    hard: false,
    template: (H) => `{0} = 2\\sin ${H}\\cos ${H}`,
    answer: (_H, D) => [`\\sin ${D}`],
    wrong: (H, D, Q) => [`\\sin ${H}`, `2\\sin ${D}`, `\\cos ${D}`, `\\sin ${Q}`],
    says: '\\sin 2A = 2\\sin A\\cos A',
  },
  {
    hard: false,
    template: (H) => `{0} = 1 - 2\\sin^2 ${H}`,
    answer: (_H, D) => [`\\cos ${D}`],
    wrong: (H, D) => [`\\cos ${H}`, `\\sin ${D}`, `\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: true,
    template: (H, D) => `\\tan ${D} = {0} \\div (1 - \\tan^2 ${H})`,
    answer: (H) => [`2\\tan ${H}`],
    wrong: (H, D) => [`\\tan ${H}`, `2\\tan ${D}`, `\\tan^2 ${H}`],
    says: '\\tan 2A = \\frac{2\\tan A}{1 - \\tan^2 A}',
  },
  {
    hard: true,
    template: (H) => `\\sin^2 ${H} = \\tfrac12(1 - {0})`,
    answer: (_H, D) => [`\\cos ${D}`],
    wrong: (H, D) => [`\\cos ${H}`, `\\sin ${D}`, `\\cos^2 ${H}`],
    says: '\\cos 2A = 1 - 2\\sin^2 A',
  },
  {
    hard: true,
    template: (H) => `\\cos^2 ${H} = \\tfrac12({0})`,
    answer: (_H, D) => [`1 + \\cos ${D}`],
    wrong: (H, D) => [`1 - \\cos ${D}`, `1 + \\cos ${H}`, `\\cos ${D}`],
    says: '\\cos 2A = 2\\cos^2 A - 1',
  },
];

/** A double-angle formula completed, including for 2 times a multiple: cos 6x from sin 3x. */
const doubleTiles: Generator<DoubleTilesParams> = {
  id: 'tid-double-tiles',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_FORMS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, m: rng.int(1, 4), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, m, v }): Slide => {
    const f = DOUBLE_FORMS[form];
    const x = VARS[v];
    const H = m === 1 ? x : `${m}${x}`;
    const D = `${2 * m}${x}`;
    const Q = `${4 * m}${x}`;
    const answer = f.answer(H, D);
    return {
      kind: 'tiles',
      prompt: [prose(m === 1 ? 'Complete the double-angle formula.' : `Complete the double-angle formula. Here the single angle is $${H}$.`)],
      template: f.template(H, D),
      bank: bankOf(answer, f.wrong(H, D, Q)),
      answer,
    };
  },
  solution: ({ form, m, v }) => {
    const f = DOUBLE_FORMS[form];
    const x = VARS[v];
    const H = m === 1 ? x : `${m}${x}`;
    const D = `${2 * m}${x}`;
    let line = f.template(H, D);
    f.answer(H, D).forEach((token, i) => {
      line = line.replace(`{${i}}`, token);
    });
    return [
      { text: 'The formula is' },
      { tex: f.says },
      { text: m === 1 ? `with $A = ${x}$.` : `with $A = ${H}$, so $2A = ${D}$: the single angle is always half the double one.` },
      { tex: line },
    ];
  },
};

interface DoubleCollapseParams {
  form: number;
  a: number;
  radians: boolean;
}

const DOUBLE_COLLAPSE = [
  { hard: false, fn: 'sin' as Fn, tex: (a: string) => `2\\sin ${a}\\cos ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `\\cos^2 ${a} - \\sin^2 ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `1 - 2\\sin^2 ${a}` },
  { hard: false, fn: 'cos' as Fn, tex: (a: string) => `2\\cos^2 ${a} - 1` },
  { hard: true, fn: 'tan' as Fn, tex: (a: string) => `\\dfrac{2\\tan ${a}}{1 - \\tan^2 ${a}}` },
];

const COLLAPSE_HALVES = [15, 22.5, 30, 60, 67.5, 75];
const COLLAPSE_HALVES_ALL = [15, 22.5, 30, 60, 67.5, 75, 105, 112.5, 150, 165];

/** A double-angle formula read backwards: 2 sin 15 cos 15 is sin 30. */
const doubleCollapseChoice: Generator<DoubleCollapseParams> = {
  id: 'tid-double-collapse-choice',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_COLLAPSE.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return {
      form: rng.pick(forms).i,
      a: rng.pick(difficulty > 1 ? COLLAPSE_HALVES_ALL : COLLAPSE_HALVES),
      radians: rng.chance(0.5),
    };
  },
  render: (p): Slide => {
    const f = DOUBLE_COLLAPSE[p.form];
    const value = trigAt(f.fn, 2 * p.a)!;
    const other: Fn = f.fn === 'sin' ? 'cos' : 'sin';
    const candidates = [
      -value,
      trigAt(other, 2 * p.a)!,
      -trigAt(other, 2 * p.a)!,
      0.5,
      Math.sqrt(3) / 2,
      Math.SQRT2 / 2,
      1,
    ];
    const wrong = candidates.map(tryTex).filter((t): t is string => t !== undefined);
    return choiceSlide(
      [prose('What is the exact value?'), display(f.tex(angleTex(p.a, p.radians)))],
      specialTex(value),
      wrong,
      saltOf(p),
    );
  },
  solution: (p) => {
    const f = DOUBLE_COLLAPSE[p.form];
    const a = angleTex(p.a, p.radians);
    const two = angleTex(2 * p.a, p.radians);
    return [
      { text: `This is the double-angle formula for $\\${f.fn} 2A$, read backwards, with $A = ${a}$.` },
      { tex: `${f.tex(a)} = \\${f.fn} ${two} = ${specialTex(trigAt(f.fn, 2 * p.a)!)}` },
    ];
  },
};

interface DoubleStepsParams {
  form: number;
  k: number;
  v: number;
}

const DOUBLE_STEPS: StepsForm[] = [
  {
    hard: false,
    start: (c, _k, v) => [`${c}\\sin 2${v}`, '\\div', `2\\cos ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin ${v}\\cos ${v}`, bank: [`${k}\\sin ${v}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
      { span: [0, 3], value: `${c}\\sin ${v}`, bank: [`${2 * k}\\sin ${v}`, `${c}\\cos ${v}`, `${c}\\tan ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `$\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `${2 * k}\\sin ${v}\\cos ${v} \\div 2\\cos ${v} = ${c}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 - \\cos 2${v})`, '\\div', `\\sin ${v}`],
    reductions: (_c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${v}`, bank: [`${k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v}`, `-${2 * k}\\sin^2 ${v}`] },
      { span: [0, 3], value: `${2 * k}\\sin ${v}`, bank: [`${k}\\sin ${v}`, `${2 * k}\\cos ${v}`, `${2 * k}\\sin^2 ${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\cos 2${v} = 1 - 2\\sin^2 ${v}$, so $1 - \\cos 2${v} = 2\\sin^2 ${v}$.` },
      { tex: `${2 * k}\\sin^2 ${v} \\div \\sin ${v} = ${2 * k}\\sin ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}(1 + \\cos 2${v})`, '\\div', `\\cos ${v}`],
    reductions: (_c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\cos^2 ${v}`, bank: [`${k}\\cos^2 ${v}`, `${2 * k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v} - ${k}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${v}`, bank: [`${k}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${2 * k}\\cos^2 ${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\cos 2${v} = 2\\cos^2 ${v} - 1$, so $1 + \\cos 2${v} = 2\\cos^2 ${v}$.` },
      { tex: `${2 * k}\\cos^2 ${v} \\div \\cos ${v} = ${2 * k}\\cos ${v}` },
    ],
  },
  {
    hard: false,
    start: (c, _k, v) => [`${c}\\sin 2${v}`, '\\div', `\\sin ${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin ${v}\\cos ${v}`, bank: [`${k}\\sin ${v}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
      { span: [0, 3], value: `${2 * k}\\cos ${v}`, bank: [`${c}\\cos ${v}`, `${2 * k}\\sin ${v}`, `${c}\\cos 2${v}`] },
    ],
    why: (_c, k, v) => [
      { text: `$\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `${2 * k}\\sin ${v}\\cos ${v} \\div \\sin ${v} = ${2 * k}\\cos ${v}` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}\\cos 2${v}`, '\\div', `(\\cos ${v} - \\sin ${v})`],
    reductions: (c, _k, v) => [
      {
        span: [0, 1],
        value: `${c}(\\cos ${v} - \\sin ${v})(\\cos ${v} + \\sin ${v})`,
        bank: [`${c}(\\cos ${v} - \\sin ${v})^2`, `${c}(1 - 2\\sin ${v})`, `${c}(\\cos ${v} + \\sin ${v})^2`],
      },
      { span: [0, 3], value: `${c}(\\cos ${v} + \\sin ${v})`, bank: [`${c}(\\cos ${v} - \\sin ${v})`, `${c}`, `${c}\\cos 2${v}`] },
    ],
    why: (c, _k, v) => [
      {
        text: `$\\cos 2${v} = \\cos^2 ${v} - \\sin^2 ${v}$, a difference of two squares: it is $(\\cos ${v} - \\sin ${v})(\\cos ${v} + \\sin ${v})$, so the bracket $\\cos ${v} - \\sin ${v}$ cancels.`,
      },
      { tex: `${c}\\cos 2${v} \\div (\\cos ${v} - \\sin ${v}) = ${c}(\\cos ${v} + \\sin ${v})` },
    ],
  },
  {
    hard: true,
    start: (c, _k, v) => [`${c}(1 - \\cos 2${v})`, '\\div', `\\sin 2${v}`],
    reductions: (c, k, v) => [
      { span: [0, 1], value: `${2 * k}\\sin^2 ${v}`, bank: [`${k}\\sin^2 ${v}`, `${2 * k}\\cos^2 ${v}`, `${c}\\sin 2${v}`] },
      { span: [2, 3], value: `2\\sin ${v}\\cos ${v}`, bank: [`2\\sin ${v}`, `\\sin ${v}\\cos ${v}`, `2\\cos^2 ${v}`] },
      { span: [0, 3], value: `${c}\\tan ${v}`, bank: [`${c}\\cot ${v}`, `${2 * k}\\tan ${v}`, `${c}\\sin ${v}`] },
    ],
    why: (c, k, v) => [
      { text: `Rewrite both: $1 - \\cos 2${v} = 2\\sin^2 ${v}$ and $\\sin 2${v} = 2\\sin ${v}\\cos ${v}$.` },
      { tex: `\\frac{${2 * k}\\sin^2 ${v}}{2\\sin ${v}\\cos ${v}} = ${c}\\frac{\\sin ${v}}{\\cos ${v}} = ${c}\\tan ${v}` },
    ],
  },
];

/** Simplify with a double-angle formula: rewrite the double angle, then cancel. */
const doubleSteps: Generator<DoubleStepsParams> = {
  id: 'tid-double-steps',
  sample: (rng, difficulty) => {
    const forms = DOUBLE_STEPS.map((f, i) => ({ f, i })).filter(({ f }) => difficulty > 1 || !f.hard);
    return { form: rng.pick(forms).i, k: rng.int(1, 6), v: rng.int(0, VARS.length - 1) };
  },
  render: ({ form, k, v }): Slide => {
    const f = DOUBLE_STEPS[form];
    const c = co(k);
    const letter = VARS[v];
    return {
      kind: 'steps',
      prompt: [prose('Rewrite the double angle with the formula that makes things cancel, then simplify.')],
      start: f.start(c, k, letter),
      reductions: f.reductions(c, k, letter).map((r) => ({ ...r, bank: scatter([r.value, ...r.bank.filter((b) => b !== r.value)]) })),
    };
  },
  solution: ({ form, k, v }) => DOUBLE_STEPS[form].why(co(k), k, VARS[v]),
};

/* ---------- Level 2, lesson 5: equations with a double angle ---------- */

interface DoubleEqFlowParams {
  /** 0: cos 2x against sin x; 1: cos 2x against cos x; 2: sin 2x against cos x; 3: sin 2x against sin x. */
  type: number;
  a: number;
  b: number;
  /** For types 2 and 3: the multiple of the single function, from K_VALUES. */
  kIndex: number;
}

const K_VALUES = [
  { value: 1, tex: '' },
  { value: -1, tex: '-' },
  { value: Math.sqrt(3), tex: '\\sqrt{3}' },
  { value: Math.SQRT2, tex: '\\sqrt{2}' },
];

const FORM_LABELS = [
  '$\\cos 2x = 1 - 2\\sin^2 x$',
  '$\\cos 2x = 2\\cos^2 x - 1$',
  '$\\cos 2x = \\cos^2 x - \\sin^2 x$',
  '$\\sin 2x = 2\\sin x\\cos x$',
];

/** 2 sin x - k, as written inside a factor. */
function minusK(fn: string, kIndex: number): string {
  const k = K_VALUES[kIndex];
  if (k.value === -1) return `2\\${fn} x + 1`;
  return `2\\${fn} x - ${k.tex === '' ? '1' : k.tex}`;
}

function doubleEqTex(p: DoubleEqFlowParams): string {
  if (p.type === 0) return `\\cos 2x = ${polyTex([[p.a, '\\sin x'], [p.b, '']])}`;
  if (p.type === 1) return `\\cos 2x = ${polyTex([[p.a, '\\cos x'], [p.b, '']])}`;
  const k = K_VALUES[p.kIndex].tex;
  return `\\sin 2x = ${k}\\${p.type === 2 ? 'cos' : 'sin'} x`;
}

/** Which version of cos 2x (or sin 2x) turns this into one function, and what does it become? */
const doubleEqFlow: Generator<DoubleEqFlowParams> = {
  id: 'tid-double-eq-flow',
  sample: (rng) => {
    const type = rng.int(0, 3);
    let a = rng.int(-4, 4);
    if (a === 0) a = 3;
    return { type, a, b: rng.int(-3, 3), kIndex: rng.int(0, K_VALUES.length - 1) };
  },
  render: (p): Slide => {
    const { a, b } = p;
    let right: string;
    let slips: string[];
    let form: string;
    if (p.type === 0) {
      form = FORM_LABELS[0];
      right = `$${quadTex(2, a, b - 1, 'sin')} = 0$`;
      slips = [`$${quadTex(2, -a, b - 1, 'sin')} = 0$`, `$${quadTex(2, a, b + 1, 'sin')} = 0$`, `$${quadTex(2, a, b, 'sin')} = 0$`];
    } else if (p.type === 1) {
      form = FORM_LABELS[1];
      right = `$${quadTex(2, -a, -(1 + b), 'cos')} = 0$`;
      slips = [`$${quadTex(2, a, -(1 + b), 'cos')} = 0$`, `$${quadTex(2, -a, 1 - b, 'cos')} = 0$`, `$${quadTex(2, -a, -b, 'cos')} = 0$`];
    } else {
      form = FORM_LABELS[3];
      const [f, g] = p.type === 2 ? ['cos', 'sin'] : ['sin', 'cos'];
      right = `$\\${f} x(${minusK(g, p.kIndex)}) = 0$`;
      slips = [`$${minusK(g, p.kIndex)} = 0$`, `$\\${g} x(${minusK(f, p.kIndex)}) = 0$`, `$\\${f} x(${minusK(g, p.kIndex)}) = 1$`];
    }
    const results = [right, ...[...new Set(slips)].filter((s) => s !== right)].sort((x, y) => hashSeed(x) - hashSeed(y));
    return {
      kind: 'flow',
      prompt: [prose('Pick the version of the double-angle formula that leaves one function, then say what the equation becomes.')],
      subject: doubleEqTex(p),
      steps: [
        { id: 'form', ask: 'Which version do you use?', branches: FORM_LABELS.map((label) => ({ label, to: 'becomes' })) },
        {
          id: 'becomes',
          ask: 'Bring everything to one side. The equation becomes',
          branches: results.map((label) => ({ label, outcome: 'Ready to factorise and solve.' })),
        },
      ],
      answer: [form, right],
    };
  },
  solution: (p) => {
    if (p.type === 0) {
      return [
        { text: 'The other side has $\\sin x$ in it, so use the version of $\\cos 2x$ with only sines: $1 - 2\\sin^2 x$.' },
        { tex: `1 - 2\\sin^2 x = ${polyTex([[p.a, '\\sin x'], [p.b, '']])}` },
        { tex: `${quadTex(2, p.a, p.b - 1, 'sin')} = 0` },
      ];
    }
    if (p.type === 1) {
      return [
        { text: 'The other side has $\\cos x$ in it, so use the version with only cosines: $2\\cos^2 x - 1$.' },
        { tex: `2\\cos^2 x - 1 = ${polyTex([[p.a, '\\cos x'], [p.b, '']])}` },
        { tex: `${quadTex(2, -p.a, -(1 + p.b), 'cos')} = 0` },
      ];
    }
    const [f, g] = p.type === 2 ? ['cos', 'sin'] : ['sin', 'cos'];
    return [
      { text: `Write $\\sin 2x = 2\\sin x\\cos x$. Both sides then share a factor of $\\${f} x$.` },
      {
        text: `Take it out rather than dividing by it: dividing would lose the solutions where $\\${f} x = 0$.`,
      },
      { tex: `\\${f} x(${minusK(g, p.kIndex)}) = 0` },
    ];
  },
};

interface DoubleEqSliderParams {
  eq: number;
  pick: number;
}

/** Equations with a double angle, each as the special values its factors give. */
const DOUBLE_EQS: { hard: boolean; lhs: 'sin' | 'cos'; k: number; kTex: string; rhs: 'sin' | 'cos'; parts: [Fn, number][] }[] = [
  { hard: false, lhs: 'sin', k: 1, kTex: '', rhs: 'sin', parts: [['sin', 0], ['cos', 0.5]] },
  { hard: false, lhs: 'sin', k: 1, kTex: '', rhs: 'cos', parts: [['cos', 0], ['sin', 0.5]] },
  { hard: false, lhs: 'sin', k: -1, kTex: '-', rhs: 'sin', parts: [['sin', 0], ['cos', -0.5]] },
  { hard: false, lhs: 'sin', k: -1, kTex: '-', rhs: 'cos', parts: [['cos', 0], ['sin', -0.5]] },
  { hard: false, lhs: 'cos', k: 1, kTex: '', rhs: 'cos', parts: [['cos', 1], ['cos', -0.5]] },
  { hard: false, lhs: 'cos', k: -1, kTex: '-', rhs: 'cos', parts: [['cos', 0.5], ['cos', -1]] },
  { hard: false, lhs: 'cos', k: 1, kTex: '', rhs: 'sin', parts: [['sin', 0.5], ['sin', -1]] },
  { hard: false, lhs: 'cos', k: -1, kTex: '-', rhs: 'sin', parts: [['sin', -0.5], ['sin', 1]] },
  { hard: true, lhs: 'sin', k: Math.sqrt(3), kTex: '\\sqrt{3}', rhs: 'cos', parts: [['cos', 0], ['sin', Math.sqrt(3) / 2]] },
  { hard: true, lhs: 'sin', k: Math.SQRT2, kTex: '\\sqrt{2}', rhs: 'sin', parts: [['sin', 0], ['cos', Math.SQRT2 / 2]] },
  { hard: false, lhs: 'sin', k: Math.sqrt(3), kTex: '\\sqrt{3}', rhs: 'sin', parts: [['sin', 0], ['cos', Math.sqrt(3) / 2]] },
  { hard: false, lhs: 'sin', k: Math.SQRT2, kTex: '\\sqrt{2}', rhs: 'cos', parts: [['cos', 0], ['sin', Math.SQRT2 / 2]] },
];

/** Every solution with 0 < x < 360, smallest first. */
function doubleEqSolutions(eq: number): number[] {
  const out = new Set<number>();
  for (const [fn, value] of DOUBLE_EQS[eq].parts) for (const d of solutionsOf(fn, value)) if (d > 0) out.add(d);
  return [...out].sort((a, b) => a - b);
}

const ORDINALS = ['smallest', 'second smallest', 'third smallest', 'fourth smallest'];

/** Where the two curves cross: slide to one particular solution. */
const doubleEqSlider: Generator<DoubleEqSliderParams> = {
  id: 'tid-double-eq-slider',
  sample: (rng, difficulty) => {
    const eqs = DOUBLE_EQS.map((e, i) => ({ e, i })).filter(({ e }) => difficulty > 1 || !e.hard);
    const eq = rng.pick(eqs).i;
    return { eq, pick: rng.int(0, doubleEqSolutions(eq).length - 1) };
  },
  render: ({ eq, pick }): Slide => {
    const e = DOUBLE_EQS[eq];
    const sols = doubleEqSolutions(eq);
    const last = pick === sols.length - 1;
    const f = (fn: 'sin' | 'cos') => (fn === 'sin' ? Math.sin : Math.cos);
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [
        { f: (x) => f(e.lhs)(2 * x * DEGREE), accent: true },
        { f: (x) => e.k * f(e.rhs)(x * DEGREE) },
      ],
      yMin: -2,
      yMax: 2,
      label: `The graphs of y = ${e.lhs} 2x and the right-hand side from 0 to 360 degrees, crossing at the solutions`,
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The coloured curve is the left-hand side and the other is the right. Solve, and slide to the ${last ? 'largest' : ORDINALS[pick]} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`\\${e.lhs} 2x = ${e.kTex}\\${e.rhs} x`),
      ],
      // Stopping at 330 puts the untouched handle at 165, which is never a solution here.
      min: 0,
      max: 330,
      step: 15,
      answer: sols[pick],
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: ({ eq, pick }) => {
    const e = DOUBLE_EQS[eq];
    const sols = doubleEqSolutions(eq);
    const parts = e.parts.map(([fn, v]) => `\\${fn} x = ${specialTex(v)}`).join(' \\quad \\text{or} \\quad ');
    return [
      {
        text:
          e.lhs === 'sin'
            ? `Write $\\sin 2x = 2\\sin x\\cos x$ and take out the common factor.`
            : `Write $\\cos 2x$ in terms of $\\${e.rhs} x$ alone and factorise the quadratic.`,
      },
      { tex: parts },
      { text: `So $x = ${sols.map(deg).join(', ')}$, and the one asked for is $${deg(sols[pick])}$.` },
    ];
  },
};

interface DoubleQuadParams {
  target: 'sin' | 'cos';
  r1: Rat;
  r2: Rat;
  hint: boolean;
}

const HALF_ROOTS: Rat[] = [
  [1, 2],
  [-1, 2],
  [3, 2],
  [-3, 2],
];
const WHOLE_ROOTS: Rat[] = [1, -1, 2, -2, 3, -3].map((n) => [n, 1] as Rat);

/** cos 2x + q sin x + r = 0, which is a quadratic in sin x once cos 2x = 1 - 2 sin^2 x. */
const doubleQuadTiles: Generator<DoubleQuadParams> = {
  id: 'tid-double-quadratic-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const r1 = rng.pick(HALF_ROOTS);
      const r2 = rng.pick(WHOLE_ROOTS);
      const [, , C] = quadratic(r1, r2);
      // No constant term is a different shape; and at least one root a sine or cosine can take.
      if (C + 1 === 0 || (Math.abs(ratValue(r1)) > 1 && Math.abs(ratValue(r2)) > 1)) continue;
      return { target: rng.pick(['sin', 'cos'] as const), r1, r2, hint: difficulty === 1 };
    }
  },
  render: (p): Slide => {
    const [A, B, C] = quadratic(p.r1, p.r2);
    const f = p.target;
    const shown =
      f === 'sin'
        ? `\\cos 2x ${signed(-B, '\\sin x')} ${signed(-(C + 1), '')} = 0`
        : `\\cos 2x ${signed(B, '\\cos x')} ${signed(C + 1, '')} = 0`;
    const answer = [signed(A, `\\${f}^2 x`, true), signed(B, `\\${f} x`), signed(C, '')];
    const distractors = [signed(-B, `\\${f} x`), signed(-C, ''), `\\${f}^2 x`, signed(C + 2, ''), signed(A, `\\${f === 'sin' ? 'cos' : 'sin'}^2 x`, true)];
    const hint = f === 'sin' ? '$\\cos 2x = 1 - 2\\sin^2 x$' : '$\\cos 2x = 2\\cos^2 x - 1$';
    return {
      kind: 'tiles',
      prompt: [
        prose(
          p.hint
            ? `Use ${hint} to write this as a quadratic in $\\${f} x$, with the squared term positive.`
            : `Write this as a quadratic in $\\${f} x$, with the squared term positive.`,
        ),
        display(shown),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const [A, B, C] = quadratic(p.r1, p.r2);
    const f = p.target;
    return f === 'sin'
      ? [
          { text: 'The other term is in $\\sin x$, so use $\\cos 2x = 1 - 2\\sin^2 x$:' },
          { tex: `1 - 2\\sin^2 x ${signed(-B, '\\sin x')} ${signed(-(C + 1), '')} = 0` },
          { text: 'Collect the numbers and multiply through by $-1$:' },
          { tex: `${quadTex(A, B, C, 'sin')} = 0` },
        ]
      : [
          { text: 'The other term is in $\\cos x$, so use $\\cos 2x = 2\\cos^2 x - 1$:' },
          { tex: `2\\cos^2 x - 1 ${signed(B, '\\cos x')} ${signed(C + 1, '')} = 0` },
          { tex: `${quadTex(A, B, C, 'cos')} = 0` },
        ];
  },
};

interface DoubleTreeParams {
  fn: Fn;
  value: number;
  /** 0: 0 <= x < 180; 1: 180 <= x < 360. */
  half: number;
  radians: boolean;
}

const TREE_VALUES: Record<Fn, number[]> = {
  sin: [0, 0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2],
  cos: [0, 0.5, -0.5, Math.SQRT2 / 2, -Math.SQRT2 / 2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2],
  tan: [0, 1, -1, Math.sqrt(3), -Math.sqrt(3), 1 / Math.sqrt(3), -1 / Math.sqrt(3)],
};

/** The two values of 2x in its doubled interval, smallest first. */
const doubledAngles = ({ fn, value, half }: DoubleTreeParams): number[] => solutionsOf(fn, value).map((d) => d + 360 * half);

/** Solve fn 2x = k: the interval doubles, so find 2x first, then halve. */
const doubleEqTree: Generator<DoubleTreeParams> = {
  id: 'tid-double-eq-tree',
  sample: (rng, difficulty) => {
    const fn = rng.pick(['sin', 'cos', 'tan'] as const);
    return { fn, value: rng.pick(TREE_VALUES[fn]), half: rng.int(0, 1), radians: difficulty > 1 };
  },
  render: (p): Slide => {
    const twos = doubledAngles(p);
    const a = (d: number) => angleTex(d, p.radians);
    const answer = [...twos.map((d) => `2x = ${a(d)}`), ...twos.map((d) => `x = ${a(d / 2)}`)];
    const base = solutionsOf(p.fn, p.value);
    const distractors = [
      ...twos.map((d) => `x = ${a(2 * d)}`),
      ...base.map((d) => `x = ${a(d)}`),
      ...base.map((d) => `2x = ${a(d + 360 * (1 - p.half))}`),
      `2x = ${a(twos[0] + 180)}`,
    ];
    const range = p.half === 0 ? [0, 180] : [180, 360];
    const rangeTex = `${a(range[0])} \\le x < ${a(range[1])}`;
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Solve for $${rangeTex}$. That makes $${a(2 * range[0])} \\le 2x < ${a(2 * range[1])}$. Top row: the two values of $2x$, smaller first. Underneath each: the $x$ it gives.`,
        ),
      ],
      expression: `\\${p.fn} 2x = ${specialTex(p.value)}`,
      nodes: [
        { id: 'a', from: [] },
        { id: 'b', from: [] },
        { id: 'xa', from: ['a'] },
        { id: 'xb', from: ['b'] },
      ],
      bank: bankOf(answer, distractors, 4),
      answer,
    };
  },
  solution: (p) => {
    const twos = doubledAngles(p);
    const a = (d: number) => angleTex(d, p.radians);
    const base = solutionsOf(p.fn, p.value);
    return [
      { text: `If $x$ runs over half a turn, $2x$ runs over a whole one, so look for every $2x$ in that doubled range.` },
      { text: `$\\${p.fn} \\theta = ${specialTex(p.value)}$ at $\\theta = ${base.map(a).join(', ')}$ in the first turn${p.half === 1 ? `; add a full turn to land in the range` : ''}.` },
      { tex: `2x = ${twos.map(a).join(' \\text{ or } ')}` },
      { tex: `x = ${twos.map((d) => a(d / 2)).join(' \\text{ or } ')}` },
    ];
  },
};

/* ---------- Level 3: the form R sin(x + α) ---------- */

/**
 * The four forms, with R > 0 and α acute. Each expands to R cos α times its own
 * function, then R sin α times the other function with `sign` between them:
 * R sin(x + α) = R cos α sin x + R sin α cos x, and
 * R cos(x - α) = R cos α cos x + R sin α sin x.
 *
 * So two positive terms added fit two forms (R sin(x + α) and R cos(x - α),
 * with different α) and a minus fits exactly one. Every question here names
 * the form it wants, and never offers both of a tie as options.
 */
const R_FORMS: { fn: 'sin' | 'cos'; plus: boolean; sign: '+' | '-' }[] = [
  { fn: 'sin', plus: true, sign: '+' },
  { fn: 'sin', plus: false, sign: '-' },
  { fn: 'cos', plus: false, sign: '+' },
  { fn: 'cos', plus: true, sign: '-' },
];

/** Forms with both terms added, and with a minus. `form ^ 1` is the same function with the other sign. */
const PLUS_FORMS = [0, 2];
const SIN_FORMS = [0, 1];
const ALL_FORMS = [0, 1, 2, 3];

const R_VARS = ['x', '\\theta'];

const otherFn = (fn: 'sin' | 'cos'): 'sin' | 'cos' => (fn === 'sin' ? 'cos' : 'sin');

/** A coefficient: its value, and its TeX standing alone ('1' for one). */
interface Coef {
  value: number;
  tex: string;
}

const wholeCoef = (n: number): Coef => ({ value: n, tex: `${n}` });

/** A coefficient in front of a function: nothing for 1. */
const front = (c: Coef): string => (c.tex === '1' ? '' : c.tex);

/** `C` times the form's own function, then `S` times the other with the form's sign. Swapped writes the other term first. */
function rExprTex(form: number, C: Coef, S: Coef, v: string, swapped = false): string {
  const f = R_FORMS[form];
  const own = `${front(C)}\\${f.fn} ${v}`;
  const other = `${front(S)}\\${otherFn(f.fn)} ${v}`;
  return swapped ? `${f.sign === '-' ? '-' : ''}${other} + ${own}` : `${own} ${f.sign} ${other}`;
}

/** R sin(x + α) and its kin, with R and α as given TeX. */
function rFormTex(form: number, r: string, v: string, alpha: string): string {
  const f = R_FORMS[form];
  return `${r}\\${f.fn}(${v} ${f.plus ? '+' : '-'} ${alpha})`;
}

/**
 * An expansion as three rows: the left side, its first term, then the second
 * term under it. Written out rather than left to `fit`, which keeps a short
 * left side on the first row, and a bracket beside an equals sign and a
 * product is already too wide for a phone.
 */
const stacked = (lhs: string, first: string, sign: string, second: string): string =>
  `\\begin{aligned} &${lhs} \\\\ &= ${first} \\\\ &\\quad ${sign} ${second} \\end{aligned}`;

/** Why a sign pattern fits the form named, for a worked solution. */
function formReason(form: number, v: string): string {
  const f = R_FORMS[form];
  return f.sign === '+'
    ? `Both terms are added. $${rFormTex(form, 'R', v, '\\alpha')}$ expands with a plus between two positive terms:`
    : `There is a minus, and $${rFormTex(form, 'R', v, '\\alpha')}$ puts it in front of the $\\${otherFn(f.fn)}$ term:`;
}

/** Whole coefficients from a Pythagorean triple, so R is whole: 6 sin x + 8 cos x has R = 10. */
interface WholePair {
  C: number;
  S: number;
  R: number;
}

/** How far each row of TRIPLES is scaled, so every coefficient stays small enough to square in the head. */
const PAIR_SCALES: { easy: number[]; all: number[] }[] = [
  { easy: [1, 2, 3], all: [1, 2, 3, 4] },
  { easy: [1], all: [1, 2] },
  { easy: [], all: [1] },
  { easy: [], all: [1] },
];

function wholePairs(difficulty: number): WholePair[] {
  const out: WholePair[] = [];
  TRIPLES.forEach(([p, q, h], t) => {
    for (const k of difficulty > 1 ? PAIR_SCALES[t].all : PAIR_SCALES[t].easy) {
      out.push({ C: k * p, S: k * q, R: k * h }, { C: k * q, S: k * p, R: k * h });
    }
  });
  return out;
}

/** α in degrees to one decimal place, from R sin α and R cos α. Only ever a choice label or a bank tile. */
const alphaDp = (S: number, C: number): number => Math.round((Math.atan2(S, C) / DEGREE) * 10) / 10;

const dpTex = (degrees: number): string => `${degrees.toFixed(1)}^{\\circ}`;

/**
 * Coefficients from the table: (k√3, k) gives α = 30° and (k, k√3) gives
 * α = 60°, both with R = 2k; (k, k) gives α = 45° with R = k√2.
 */
interface TablePair {
  kind: number;
  k: number;
}

function tableCoefs({ kind, k }: TablePair): { C: Coef; S: Coef; R: Coef; alpha: number; tan: string } {
  const root3: Coef = { value: k * Math.sqrt(3), tex: `${co(k)}\\sqrt{3}` };
  const plain = wholeCoef(k);
  if (kind === 0) return { C: root3, S: plain, R: wholeCoef(2 * k), alpha: 30, tan: '\\frac{1}{\\sqrt{3}}' };
  if (kind === 1) return { C: plain, S: root3, R: wholeCoef(2 * k), alpha: 60, tan: '\\sqrt{3}' };
  return { C: plain, S: plain, R: { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` }, alpha: 45, tan: '1' };
}

const squareOf = (c: Coef): number => Math.round(c.value * c.value);

function sampleTable(rng: Rng, maxK: number): TablePair {
  return { kind: rng.int(0, 2), k: rng.int(1, maxK) };
}

/** Two different whole coefficients, neither of them zero. */
function sampleCoefs(rng: Rng, max: number): { C: number; S: number } {
  const C = rng.int(1, max);
  let S = rng.int(1, max - 1);
  if (S >= C) S += 1;
  return { C, S };
}

/** The lines that match coefficients and read off tan α, shared by several solutions. */
function matchSteps(form: number, v: string, C: string, S: string): SolutionStep[] {
  return [
    { text: formReason(form, v) },
    {
      tex: stacked(
        rFormTex(form, 'R', v, '\\alpha'),
        `R\\cos\\alpha\\,\\${R_FORMS[form].fn} ${v}`,
        R_FORMS[form].sign,
        `R\\sin\\alpha\\,\\${otherFn(R_FORMS[form].fn)} ${v}`,
      ),
    },
    { text: `Match the $\\${R_FORMS[form].fn}$ terms, then the $\\${otherFn(R_FORMS[form].fn)}$ terms:` },
    { tex: `R\\cos\\alpha = ${C} \\qquad R\\sin\\alpha = ${S}` },
  ];
}

/* Lesson 1: matching the expansion. */

interface RExpandParams {
  form: number;
  R: number;
  v: number;
  signed: boolean;
}

/** Expand R sin(x + α) with R a number and α a letter. The harder draws put the sign on the tile. */
const rExpandTiles: Generator<RExpandParams> = {
  id: 'tid-r-expand-tiles',
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? ALL_FORMS : PLUS_FORMS),
    R: rng.int(2, difficulty > 1 ? 15 : 12),
    v: rng.int(0, R_VARS.length - 1),
    signed: difficulty > 1,
  }),
  render: ({ form, R, v, signed }): Slide => {
    const f = R_FORMS[form];
    const x = R_VARS[v];
    const other = otherFn(f.fn);
    const cosA = `${R}\\cos\\alpha`;
    const sinA = `${R}\\sin\\alpha`;
    const flip = f.sign === '+' ? '-' : '+';
    const answer = signed ? [cosA, `${f.sign} ${sinA}`] : [cosA, sinA];
    const distractors = signed
      ? [`${flip} ${sinA}`, `${f.sign} ${cosA}`, `${flip} ${cosA}`, sinA]
      : ['\\cos\\alpha', '\\sin\\alpha', `${R}\\tan\\alpha`];
    return {
      kind: 'tiles',
      prompt: [
        prose('Expand with the compound-angle formula, keeping the number in front.'),
        display(`${rFormTex(form, `${R}`, x, '\\alpha')} =`),
      ],
      template: signed ? `{0}\\${f.fn} ${x} {1}\\${other} ${x}` : `{0}\\${f.fn} ${x} ${f.sign} {1}\\${other} ${x}`,
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  solution: ({ form, R, v }) => {
    const f = R_FORMS[form];
    const x = R_VARS[v];
    const other = otherFn(f.fn);
    return [
      { text: `The compound-angle formula, with $${x}$ first and $\\alpha$ second:` },
      { tex: stacked(`\\${f.fn}(${x} ${f.plus ? '+' : '-'} \\alpha)`, `\\${f.fn} ${x}\\cos\\alpha`, f.sign, `\\${other} ${x}\\sin\\alpha`) },
      { text: `Multiply by $${R}$, and write each term as a number times a function of $${x}$:` },
      {
        tex: stacked(rFormTex(form, `${R}`, x, '\\alpha'), `${R}\\cos\\alpha\\,\\${f.fn} ${x}`, f.sign, `${R}\\sin\\alpha\\,\\${other} ${x}`),
      },
    ];
  },
};

interface RPairParams {
  form: number;
  C: number;
  S: number;
  v: number;
  swapped: boolean;
}

function samplePair(rng: Rng, forms: number[], swapChance: number, max: number): RPairParams {
  const { C, S } = sampleCoefs(rng, max);
  return { form: rng.pick(forms), C, S, v: rng.int(0, R_VARS.length - 1), swapped: rng.chance(swapChance) };
}

const pairExpr = (p: RPairParams): string => rExprTex(p.form, wholeCoef(p.C), wholeCoef(p.S), R_VARS[p.v], p.swapped);

/** The forms offered for a pair: the one it is, and every form that cannot fit its signs. Never the other half of a tie. */
function formsOffered(form: number): number[] {
  return R_FORMS[form].sign === '+' ? [form, 1, 3].sort((a, b) => a - b) : ALL_FORMS;
}

/** Which form fits the signs, then tan α from the matched coefficients. */
const rFormFlow: Generator<RPairParams> = {
  id: 'tid-r-form-flow',
  sample: (rng, difficulty) => samplePair(rng, ALL_FORMS, difficulty > 1 ? 0.5 : 0, 9),
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const offered = formsOffered(p.form);
    const labels = offered.map((i) => `$${rFormTex(i, 'R', x, '\\alpha')}$`);
    const tans = [rat(p.S, p.C), rat(p.C, p.S), rat(-p.S, p.C), rat(-p.C, p.S)].map((r) => `$${ratTex(r)}$`);
    return {
      kind: 'flow',
      prompt: [prose('Write this with $R > 0$ and $\\alpha$ acute: pick the form its signs fit, then find $\\tan\\alpha$.')],
      subject: pairExpr(p),
      steps: [
        { id: 'form', ask: 'Which form can it be written in?', branches: labels.map((label) => ({ label, to: 'tan' })) },
        {
          id: 'tan',
          ask: 'Matching coefficients, $\\tan\\alpha$ is',
          branches: scatter(tans).map((label) => ({ label, outcome: '$R\\sin\\alpha$ over $R\\cos\\alpha$ leaves $\\tan\\alpha$.' })),
        },
      ],
      answer: [labels[offered.indexOf(p.form)], `$${ratTex(rat(p.S, p.C))}$`],
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const simple = ratTex(rat(p.S, p.C));
    const raw = `\\frac{${p.S}}{${p.C}}`;
    return [
      ...matchSteps(p.form, x, `${p.C}`, `${p.S}`),
      { tex: `\\tan\\alpha = \\frac{R\\sin\\alpha}{R\\cos\\alpha} = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
    ];
  },
};

interface RMatchParams extends RPairParams {
  sinFirst: boolean;
}

/** Match coefficients: R cos α and R sin α, placed as numbers. */
const rMatchTiles: Generator<RMatchParams> = {
  id: 'tid-r-match-tiles',
  sample: (rng, difficulty) => ({
    ...samplePair(rng, difficulty > 1 ? ALL_FORMS : PLUS_FORMS, difficulty > 1 ? 0.5 : 0, 9),
    sinFirst: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const answer = p.sinFirst ? [`${p.S}`, `${p.C}`] : [`${p.C}`, `${p.S}`];
    const distractors = [`-${p.S}`, `-${p.C}`, `${p.C + p.S}`, `${Math.abs(p.C - p.S)}`];
    return {
      kind: 'tiles',
      prompt: [prose(`Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ and match the coefficients.`), display(pairExpr(p))],
      template: p.sinFirst ? 'R\\sin\\alpha = {0} \\quad R\\cos\\alpha = {1}' : 'R\\cos\\alpha = {0} \\quad R\\sin\\alpha = {1}',
      bank: bankOf(answer, distractors),
      answer,
    };
  },
  choices: (p) => {
    const pair = (c: number, s: number) => `R\\cos\\alpha = ${c},\\; R\\sin\\alpha = ${s}`;
    return options({ tex: pair(p.C, p.S) }, { tex: pair(p.S, p.C) }, { tex: pair(p.C, -p.S) }, { tex: pair(-p.C, p.S) });
  },
  solution: (p) => {
    const steps = matchSteps(p.form, R_VARS[p.v], `${p.C}`, `${p.S}`);
    if (R_FORMS[p.form].sign === '-') {
      steps.push({ text: 'The minus belongs to the form, so both matched values are positive.' });
    }
    return steps;
  },
};

interface RTreeParams {
  form: number;
  v: number;
  whole: WholePair | null;
  table: TablePair | null;
}

function treeCoefs(p: RTreeParams): { C: Coef; S: Coef; R: Coef } {
  if (p.table) return tableCoefs(p.table);
  const { C, S, R } = p.whole!;
  return { C: wholeCoef(C), S: wholeCoef(S), R: wholeCoef(R) };
}

/** Square and add: the two coefficients squared, then R^2, then R. */
const rSquaredTree: Generator<RTreeParams> = {
  id: 'tid-r-squared-tree',
  sample: (rng, difficulty) => {
    const form = rng.pick(difficulty > 1 ? ALL_FORMS : PLUS_FORMS);
    const v = rng.int(0, R_VARS.length - 1);
    if (difficulty > 1 && rng.chance(0.5)) return { form, v, whole: null, table: sampleTable(rng, 3) };
    return { form, v, whole: rng.pick(wholePairs(difficulty)), table: null };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const { C, S, R } = treeCoefs(p);
    const c2 = squareOf(C);
    const s2 = squareOf(S);
    const r2 = c2 + s2;
    const answer = [`${c2}`, `${s2}`, `${r2}`, R.tex];
    const slips = p.table
      ? p.table.kind === 2
        ? [`${2 * p.table.k}`, `${4 * p.table.k * p.table.k}`]
        : [`${co(p.table.k)}\\sqrt{2}`, `${2 * r2}`]
      : [`${C.value + S.value}`, `${2 * R.value}`];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$. Top row: $(R\\cos\\alpha)^2$, then $(R\\sin\\alpha)^2$. Underneath: $R^2$, then $R$.`,
        ),
      ],
      expression: rExprTex(p.form, C, S, x),
      nodes: [
        { id: 'c', from: [] },
        { id: 's', from: [] },
        { id: 'r2', from: ['c', 's'] },
        { id: 'r', from: ['r2'] },
      ],
      bank: bankOf(answer, [`-${s2}`, ...slips, `${Math.abs(c2 - s2)}`], 4),
      answer,
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const { C, S, R } = treeCoefs(p);
    const c2 = squareOf(C);
    const s2 = squareOf(S);
    const root = `\\sqrt{${c2 + s2}}`;
    return [
      {
        text: `Matching coefficients, $R\\cos\\alpha = ${C.tex}$ and $R\\sin\\alpha = ${S.tex}$${R_FORMS[p.form].sign === '-' ? ': the minus belongs to the form' : ''}. Squaring and adding uses $\\cos^2\\alpha + \\sin^2\\alpha = 1$:`,
      },
      { tex: `R^2 = (${C.tex})^2 + (${S.tex})^2 = ${c2} + ${s2} = ${c2 + s2}` },
      { tex: `R = ${root}${root === R.tex ? '' : ` = ${R.tex}`}` },
      { text: `So $${rExprTex(p.form, C, S, x)}$ is $${rFormTex(p.form, R.tex, x, '\\alpha')}$ for some acute $\\alpha$.` },
    ];
  },
};

/* Lesson 2: finding R and α. */

interface RWholeParams {
  form: number;
  pair: WholePair;
  v: number;
  swapped: boolean;
}

function sampleWhole(rng: Rng, difficulty: number, easyForms = PLUS_FORMS): RWholeParams {
  return {
    form: rng.pick(difficulty > 1 ? ALL_FORMS : easyForms),
    pair: rng.pick(wholePairs(difficulty)),
    v: rng.int(0, R_VARS.length - 1),
    swapped: difficulty > 1 && rng.chance(0.5),
  };
}

const wholeExpr = (p: RWholeParams): string =>
  rExprTex(p.form, wholeCoef(p.pair.C), wholeCoef(p.pair.S), R_VARS[p.v], p.swapped);

/** The lines finding R from a whole pair. */
function rSteps(p: RWholeParams): SolutionStep[] {
  const { C, S, R } = p.pair;
  return [
    ...matchSteps(p.form, R_VARS[p.v], `${C}`, `${S}`),
    { tex: `R = \\sqrt{${C}^2 + ${S}^2} = \\sqrt{${C * C + S * S}} = ${R}` },
  ];
}

/** R, typed. */
const rValue: Generator<RWholeParams> = {
  id: 'tid-r-value',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$. Find $R$.`),
      display(wholeExpr(p)),
    ],
    lead: 'R =',
    keypad: NUMBER_KEYS,
    answer: `${p.pair.R}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { C, S, R } = p.pair;
    return options(
      { tex: `${R}`, answer: `${R}` },
      { tex: `${R * R}`, answer: `${R * R}` },
      { tex: `${C + S}`, answer: `${C + S}` },
      { tex: `${Math.abs(C - S)}`, answer: `${Math.abs(C - S)}` },
    );
  },
  solution: (p) => [
    ...rSteps(p),
    { text: 'Squaring and adding works because $\\cos^2\\alpha + \\sin^2\\alpha = 1$: the $\\alpha$ drops out and $R^2$ is left.' },
  ],
};

/** tan α as a fraction, typed. Any coefficients: R need not be whole for this. */
const rTanAlpha: Generator<RPairParams> = {
  id: 'tid-r-tan-alpha',
  sample: (rng, difficulty) =>
    difficulty > 1 ? samplePair(rng, ALL_FORMS, 0.5, 12) : samplePair(rng, SIN_FORMS, 0, 9),
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\tan\\alpha$.`),
      display(pairExpr(p)),
    ],
    lead: '\\tan\\alpha =',
    keypad: NUMBER_KEYS,
    answer: ratAnswer(rat(p.S, p.C)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const simple = ratTex(rat(p.S, p.C));
    const raw = `\\frac{${p.S}}{${p.C}}`;
    return [
      ...matchSteps(p.form, R_VARS[p.v], `${p.C}`, `${p.S}`),
      { text: 'Divide the second by the first: the $R$ cancels.' },
      { tex: `\\tan\\alpha = \\frac{R\\sin\\alpha}{R\\cos\\alpha} = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
    ];
  },
};

/** α to one decimal place, worked on the line: the fraction, its lowest terms, then the angle. */
const rAlphaSteps: Generator<RWholeParams> = {
  id: 'tid-r-alpha-steps',
  sample: (rng, difficulty) => ({ ...sampleWhole(rng, difficulty), swapped: false }),
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const g = gcd(C, S);
    const a = alphaDp(S, C);
    const frac = (n: number, d: number) => `\\frac{${n}}{${d}}`;
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      { span: [2, 3], value: frac(S, C), bank: [frac(C, S), `-${frac(S, C)}`, frac(S, R)] },
    ];
    if (g > 1) {
      reductions.push({ span: [2, 3], value: frac(S / g, C / g), bank: [frac(C / g, S / g), frac(S, C / g), frac(S / g, C)] });
    }
    reductions.push({
      span: [0, 3],
      value: `\\alpha = ${dpTex(a)}`,
      bank: [`\\alpha = ${dpTex(alphaDp(C, S))}`, `\\alpha = ${dpTex(Math.round((180 - a) * 10) / 10)}`, `\\alpha = -${dpTex(a)}`],
    });
    return {
      kind: 'steps',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', R_VARS[p.v], '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\alpha$ to one decimal place, a step at a time.`,
        ),
        display(wholeExpr(p)),
      ],
      start: ['\\tan\\alpha', '=', '\\dfrac{R\\sin\\alpha}{R\\cos\\alpha}'],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([r.value, ...r.bank]) })),
    };
  },
  solution: (p) => {
    const { C, S } = p.pair;
    const simple = ratTex(rat(S, C));
    const raw = `\\frac{${S}}{${C}}`;
    return [
      ...matchSteps(p.form, R_VARS[p.v], `${C}`, `${S}`),
      { tex: `\\tan\\alpha = ${raw}${raw === simple ? '' : ` = ${simple}`}` },
      { text: 'Both matched values are positive, so $\\alpha$ is acute: exactly the angle a calculator gives.' },
      { tex: `\\alpha = \\tan^{-1} ${simple} = ${dpTex(alphaDp(S, C))}` },
    ];
  },
};

/** The whole conversion, picked from four. */
const rConvertChoice: Generator<RWholeParams> = {
  id: 'tid-r-convert-choice',
  sample: (rng, difficulty) => sampleWhole(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const a = dpTex(alphaDp(S, C));
    return choiceSlide(
      [
        prose(`Write this in the form $${rFormTex(p.form, 'R', x, '\\alpha')}$, with $R > 0$ and $\\alpha$ acute.`),
        display(wholeExpr(p)),
      ],
      rFormTex(p.form, `${R}`, x, a),
      [
        rFormTex(p.form, `${R}`, x, dpTex(alphaDp(C, S))),
        rFormTex(p.form ^ 1, `${R}`, x, a),
        rFormTex(p.form, `${R * R}`, x, a),
      ],
      saltOf(p),
    );
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const a = dpTex(alphaDp(S, C));
    return [
      ...rSteps(p),
      { tex: `\\tan\\alpha = ${ratTex(rat(S, C))} \\quad \\Rightarrow \\quad \\alpha = ${a}` },
      { text: 'Put the two back into the form:' },
      { tex: `${wholeExpr(p)} = ${rFormTex(p.form, `${R}`, x, a)}` },
    ];
  },
};

/* Lesson 3: table angles. */

interface RTableParams {
  form: number;
  table: TablePair;
  v: number;
  radians: boolean;
}

function sampleTableParams(rng: Rng, difficulty: number): RTableParams {
  return {
    form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
    table: sampleTable(rng, 4),
    v: rng.int(0, R_VARS.length - 1),
    radians: difficulty > 1 && rng.chance(0.5),
  };
}

function tableSteps(p: RTableParams): SolutionStep[] {
  const { C, S, R, alpha, tan } = tableCoefs(p.table);
  const x = R_VARS[p.v];
  const root = `\\sqrt{${squareOf(C) + squareOf(S)}}`;
  const ratio = `\\frac{${S.tex}}{${C.tex}}`;
  return [
    ...matchSteps(p.form, x, C.tex, S.tex),
    { tex: `R = \\sqrt{(${C.tex})^2 + (${S.tex})^2} = ${root}${root === R.tex ? '' : ` = ${R.tex}`}` },
    { tex: `\\tan\\alpha = ${ratio}${ratio === tan ? '' : ` = ${tan}`}` },
    { text: `That is a table value: $\\alpha = ${angleTex(alpha, p.radians)}$, exactly.` },
    { tex: `${rExprTex(p.form, C, S, x)} = ${rFormTex(p.form, R.tex, x, angleTex(alpha, p.radians))}` },
  ];
}

/** R (a surd, placed from the bank) and α (a table angle) for a table pair. */
const rExactTiles: Generator<RTableParams> = {
  id: 'tid-r-exact-tiles',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const x = R_VARS[p.v];
    const { k, kind } = p.table;
    const answer = [R.tex, angleTex(alpha, p.radians)];
    const rSlips = kind === 2 ? [`${2 * k}`, `${2 * k * k}`] : [`${4 * k * k}`, `${co(k)}\\sqrt{2}`];
    const angleSlips = [30, 45, 60].filter((d) => d !== alpha).map((d) => angleTex(d, p.radians));
    return {
      kind: 'tiles',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$ and $\\alpha$ acute${p.radians ? ', in radians' : ''}.`,
        ),
        display(rExprTex(p.form, C, S, x)),
      ],
      template: `{0}\\${f.fn}(${x} ${f.plus ? '+' : '-'} {1})`,
      bank: bankOf(answer, [...rSlips, ...angleSlips], 4),
      answer,
    };
  },
  solution: (p) => tableSteps(p),
};

/** α alone, typed: a table angle, in degrees or radians. */
const rExactAlpha: Generator<RTableParams> = {
  id: 'tid-r-exact-alpha',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Write this as $${rFormTex(p.form, 'R', x, '\\alpha')}$ with $R > 0$ and $\\alpha$ acute. Find $\\alpha$ ${p.radians ? 'in radians' : 'in degrees'}.`,
        ),
        display(rExprTex(p.form, C, S, x)),
      ],
      lead: '\\alpha =',
      keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(alpha, p.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (p) => tableSteps(p),
};

/** The other way: R sin(x + α) with table values, expanded back to a sin x + b cos x. */
const rExpandExactChoice: Generator<RTableParams> = {
  id: 'tid-r-expand-exact-choice',
  sample: (rng, difficulty) => sampleTableParams(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    const { k, kind } = p.table;
    // The halves of the table values forgotten: R times sqrt 3 and R, or R sqrt 2 twice.
    const unhalved: [Coef, Coef] =
      kind === 2
        ? [
            { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` },
            { value: k * Math.SQRT2, tex: `${co(k)}\\sqrt{2}` },
          ]
        : [
            { value: 2 * k * Math.sqrt(3), tex: `${2 * k}\\sqrt{3}` },
            wholeCoef(2 * k),
          ];
    const orderedUnhalved: [Coef, Coef] = kind === 1 ? [unhalved[1], unhalved[0]] : unhalved;
    return choiceSlide(
      [prose('Which expression is this equal to?'), display(rFormTex(p.form, R.tex, x, angleTex(alpha, p.radians)))],
      rExprTex(p.form, C, S, x),
      [
        rExprTex(p.form, S, C, x),
        rExprTex(p.form ^ 1, C, S, x),
        rExprTex(p.form, orderedUnhalved[0], orderedUnhalved[1], x),
        rExprTex(p.form, wholeCoef(2 * k), wholeCoef(2 * k), x),
      ],
      saltOf(p),
    );
  },
  solution: (p) => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const a = angleTex(alpha, p.radians);
    return [
      { text: 'Expand with the compound-angle formula:' },
      {
        tex: stacked(rFormTex(p.form, R.tex, x, a), `${R.tex}\\cos ${a}\\,\\${f.fn} ${x}`, f.sign, `${R.tex}\\sin ${a}\\,\\${otherFn(f.fn)} ${x}`),
      },
      {
        text: `With $\\cos ${a} = ${cosTex(alpha)}$ and $\\sin ${a} = ${sinTex(alpha)}$, the coefficients are $${R.tex} \\times ${cosTex(alpha)} = ${C.tex}$ and $${R.tex} \\times ${sinTex(alpha)} = ${S.tex}$.`,
      },
      { tex: `${rFormTex(p.form, R.tex, x, a)} = ${rExprTex(p.form, C, S, x)}` },
    ];
  },
};

/* Lesson 4: maximum and minimum. */

/** Where the bracket of a form reaches the angle that gives its greatest or least value, inside the range x = 0 to 360 puts it in. */
function extremeBracket(form: number, alpha: number, greatest: boolean): number {
  const f = R_FORMS[form];
  const target = f.fn === 'sin' ? (greatest ? 90 : 270) : greatest ? 0 : 180;
  const lo = f.plus ? alpha : -alpha;
  return target < lo ? target + 360 : target >= lo + 360 ? target - 360 : target;
}

/** The x in 0 <= x < 360 where a form is greatest or least. */
function extremeAt(form: number, alpha: number, greatest: boolean): number {
  const u = extremeBracket(form, alpha, greatest);
  return R_FORMS[form].plus ? u - alpha : u + alpha;
}

/** "+ 3" or "- 3" after an expression, or nothing. */
const plusConst = (c: number): string => (c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`);

/** The greatest or least value, R moved by the constant: "greatest = 5 + 2 = 7", or just "greatest = 5". */
function extremeLine(greatest: boolean, R: number, c: number): string {
  const lead = `${greatest ? '\\text{greatest}' : '\\text{least}'} = ${greatest ? R : -R}`;
  return c === 0 ? lead : `${lead}${plusConst(c)} = ${c + (greatest ? R : -R)}`;
}

interface RMaxParams extends RWholeParams {
  c: number;
  greatest: boolean;
}

function maxValueOf(p: RMaxParams): number {
  return p.c + (p.greatest ? p.pair.R : -p.pair.R);
}

/** The greatest or least value of a sin x + b cos x (+ c), typed. */
const rMaxValue: Generator<RMaxParams> = {
  id: 'tid-r-max-value',
  sample: (rng, difficulty) => {
    const base = sampleWhole(rng, difficulty);
    let c = difficulty > 1 ? rng.int(-9, 8) : 0;
    if (difficulty > 1 && c >= 0) c += 1;
    return { ...base, c, greatest: rng.chance(0.5) };
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Find the ${p.greatest ? 'greatest' : 'least'} value of $f(${R_VARS[p.v]})$ as $${R_VARS[p.v]}$ varies.`),
      display(`f(${R_VARS[p.v]}) = ${wholeExpr(p)}${plusConst(p.c)}`),
    ],
    lead: p.greatest ? 'f_{\\max} =' : 'f_{\\min} =',
    keypad: NUMBER_KEYS,
    answer: `${maxValueOf(p)}`,
    domain: 'real',
    mode: 'exact',
  }),
  choices: (p) => {
    const { C, S, R } = p.pair;
    const s = p.greatest ? 1 : -1;
    const n = (value: number) => ({ tex: `${value}`, answer: `${value}` });
    return options(n(p.c + s * R), n(p.c - s * R), n(p.c + s * (C + S)), n(p.c + s * R * R));
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const { R } = p.pair;
    const form = rFormTex(p.form, `${R}`, x, '\\alpha');
    return [
      { text: `Written as $${form}$, with $R = \\sqrt{${p.pair.C}^2 + ${p.pair.S}^2} = ${R}$.` },
      { text: `A sine or cosine runs from $-1$ to $1$, so $${form}$ runs from $${-R}$ to $${R}$.` },
      {
        tex: extremeLine(p.greatest, R, p.c),
      },
    ];
  },
};

interface RWhereParams {
  form: number;
  R: number;
  alpha: number;
  c: number;
  greatest: boolean;
  v: number;
}

/** Where a converted form is greatest or least, and the value there. */
const rMaxTiles: Generator<RWhereParams> = {
  id: 'tid-r-max-tiles',
  sample: (rng, difficulty) => {
    let c = difficulty > 1 ? rng.int(-5, 4) : 0;
    if (difficulty > 1 && c >= 0) c += 1;
    return {
      form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
      R: rng.int(2, 9),
      alpha: rng.pick([30, 45, 60]),
      c,
      greatest: rng.chance(0.5),
      v: rng.int(0, R_VARS.length - 1),
    };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const where = extremeAt(p.form, p.alpha, p.greatest);
    const value = p.c + (p.greatest ? p.R : -p.R);
    const target = f.fn === 'sin' ? (p.greatest ? 90 : 270) : p.greatest ? 0 : 180;
    const wrongWay = (((f.plus ? target + p.alpha : target - p.alpha) % 360) + 360) % 360;
    const distractors = [
      `${p.c - (p.greatest ? p.R : -p.R)}`,
      deg(extremeAt(p.form, p.alpha, !p.greatest)),
      deg(wrongWay),
      deg(target),
    ];
    return {
      kind: 'tiles',
      prompt: [
        prose(`For $0^{\\circ} \\le ${x} < 360^{\\circ}$, find the ${p.greatest ? 'greatest' : 'least'} value and where it happens.`),
        display(`${rFormTex(p.form, `${p.R}`, x, deg(p.alpha))}${plusConst(p.c)}`),
      ],
      template: `\\text{${p.greatest ? 'max' : 'min'} } {0} \\text{ at } ${x} = {1}`,
      bank: bankOf([`${value}`, deg(where)], distractors, 4),
      answer: [`${value}`, deg(where)],
    };
  },
  solution: (p) => {
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const op = f.plus ? '+' : '-';
    const u = extremeBracket(p.form, p.alpha, p.greatest);
    const where = extremeAt(p.form, p.alpha, p.greatest);
    return [
      {
        text: `$\\${f.fn}$ is ${p.greatest ? 'greatest, at $1$' : 'least, at $-1$'}, when its angle is $${deg(u)}$ (inside the range $${x} ${op} ${deg(p.alpha)}$ covers).`,
      },
      { tex: `${x} ${op} ${deg(p.alpha)} = ${deg(u)} \\quad \\Rightarrow \\quad ${x} = ${deg(where)}` },
      { tex: extremeLine(p.greatest, p.R, p.c) },
    ];
  },
};

interface RPeakParams {
  form: number;
  table: TablePair;
  greatest: boolean;
  c: number;
}

const bracketFn = (form: number, alpha: number) => (x: number): number => {
  const f = R_FORMS[form];
  const u = (x + (f.plus ? alpha : -alpha)) * DEGREE;
  return f.fn === 'sin' ? Math.sin(u) : Math.cos(u);
};

/** The wave drawn: slide to its peak or its trough. */
const rPeakSlider: Generator<RPeakParams> = {
  id: 'tid-r-peak-slider',
  sample: (rng, difficulty) => ({
    form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS),
    table: sampleTable(rng, 3),
    greatest: rng.chance(0.5),
    c: difficulty > 1 ? rng.int(-2, 2) : 0,
  }),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const wave = bracketFn(p.form, alpha);
    const pad = 0.3 * R.value + 0.5;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (x) => p.c + R.value * wave(x), accent: true }],
      horizontals: [p.c + R.value, p.c - R.value],
      yMin: p.c - R.value - pad,
      yMax: p.c + R.value + pad,
      label: 'The graph of the expression from 0 to 360 degrees, a wave between two dashed lines at its greatest and least values',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `Write it in the form $${rFormTex(p.form, 'R', 'x', '\\alpha')}$, then slide to where it is ${p.greatest ? 'greatest' : 'least'}, with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`y = ${rExprTex(p.form, C, S, 'x')}${plusConst(p.c)}`),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer: extremeAt(p.form, alpha, p.greatest),
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const op = f.plus ? '+' : '-';
    const u = extremeBracket(p.form, alpha, p.greatest);
    return [
      { tex: `${rExprTex(p.form, C, S, 'x')} = ${rFormTex(p.form, R.tex, 'x', deg(alpha))}` },
      { text: `$\\${f.fn}$ is ${p.greatest ? '$1$, its greatest,' : '$-1$, its least,'} when its angle is $${deg(u)}$:` },
      { tex: `x ${op} ${deg(alpha)} = ${deg(u)} \\quad \\Rightarrow \\quad x = ${deg(extremeAt(p.form, alpha, p.greatest))}` },
    ];
  },
};

interface RExtremeParams extends RWholeParams {
  c: number;
  greatest: boolean;
  /** The expression under a number, so the fraction is greatest where the expression is least. */
  reciprocal: boolean;
  m: number;
}

/** R's candidates as flow labels: R, R^2, and the two sums a careless square root gives. */
function rCandidates({ C, S, R }: WholePair): string[] {
  return scatter([`$${R}$`, `$${R * R}$`, `$${C + S}$`, `$${Math.abs(C - S)}$`]);
}

/** The first n distinct labels. */
function distinctLabels(labels: string[], n = 4): string[] {
  return [...new Set(labels)].slice(0, n);
}

/** Greatest or least value, one decision at a time: R, then (for a fraction) which end of the bottom, then the value. */
const rExtremeFlow: Generator<RExtremeParams> = {
  id: 'tid-r-extreme-flow',
  sample: (rng, difficulty) => {
    const base = { ...sampleWhole(rng, difficulty), swapped: false };
    if (difficulty > 1) {
      return { ...base, c: base.pair.R + rng.int(1, 4), greatest: rng.chance(0.5), reciprocal: true, m: rng.int(1, 12) };
    }
    return { ...base, c: rng.int(-6, 9), greatest: rng.chance(0.5), reciprocal: false, m: 1 };
  },
  render: (p): Slide => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const word = p.greatest ? 'greatest' : 'least';
    const rStep = {
      id: 'R',
      ask: `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$, $R$ is`,
      branches: rCandidates(p.pair).map((label) => ({ label, to: p.reciprocal ? 'bottom' : 'value' })),
    };
    if (!p.reciprocal) {
      const s = p.greatest ? 1 : -1;
      const right = `$${p.c + s * R}$`;
      const values = distinctLabels([right, `$${p.c - s * R}$`, `$${p.c + s * (C + S)}$`, `$${s * R}$`, `$${p.c + s * R * R}$`]);
      return {
        kind: 'flow',
        prompt: [prose(`Find the ${word} value, one decision at a time.`)],
        subject: `${wholeExpr(p)}${plusConst(p.c)}`,
        steps: [
          rStep,
          { id: 'value', ask: `So the ${word} value is`, branches: scatter(values).map((label) => ({ label, outcome: 'Sine and cosine never go past $1$ or below $-1$.' })) },
        ],
        answer: [`$${R}$`, right],
      };
    }
    const value = (bottom: number): string => `$${ratTex(rat(p.m, bottom))}$`;
    const right = value(p.greatest ? p.c - R : p.c + R);
    const bottoms = [p.c - R, p.c + R, p.c, p.c - C - S].filter((b) => b !== 0);
    const values = distinctLabels([right, ...bottoms.map(value)]);
    const ends = ['as small as it gets', 'as large as it gets'];
    return {
      kind: 'flow',
      prompt: [prose(`Find the ${word} value of this fraction, one decision at a time.`)],
      subject: `\\dfrac{${p.m}}{${p.c} + ${wholeExpr(p)}}`,
      steps: [
        rStep,
        { id: 'bottom', ask: `The fraction is ${word} when the bottom is`, branches: ends.map((label) => ({ label, to: 'value' })) },
        { id: 'value', ask: `So the ${word} value is`, branches: scatter(values).map((label) => ({ label, outcome: 'The top is fixed, so the bottom decides.' })) },
      ],
      answer: [`$${R}$`, ends[p.greatest ? 0 : 1], right],
    };
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const form = rFormTex(p.form, `${R}`, x, '\\alpha');
    const steps: SolutionStep[] = [
      { text: `$R = \\sqrt{${C}^2 + ${S}^2} = ${R}$, so the expression is $${form}$, which runs from $${-R}$ to $${R}$.` },
    ];
    if (!p.reciprocal) {
      steps.push({ tex: extremeLine(p.greatest, R, p.c) });
      return steps;
    }
    const bottom = p.greatest ? p.c - R : p.c + R;
    steps.push(
      { text: `So the bottom runs from $${p.c} - ${R} = ${p.c - R}$ to $${p.c} + ${R} = ${p.c + R}$, always positive.` },
      {
        text: p.greatest
          ? 'A fixed top over a smaller bottom is a bigger fraction, so the greatest value comes with the smallest bottom.'
          : 'A fixed top over a larger bottom is a smaller fraction, so the least value comes with the largest bottom.',
      },
      { tex: `\\frac{${p.m}}{${bottom}}${ratTex(rat(p.m, bottom)) === `\\frac{${p.m}}{${bottom}}` ? '' : ` = ${ratTex(rat(p.m, bottom))}`}` },
    );
    return steps;
  },
};

/* Lesson 5: solving a sin x + b cos x = c. */

interface RSolveParams {
  form: number;
  table: TablePair;
  /** fn(x ± α) = value: a signed special value. */
  value: number;
}

/** The right-hand side c = R times the value, as the learner reads it, or undefined when it is not tidy. */
function rhsTex({ kind, k }: TablePair, value: number): string | undefined {
  const size = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (kind < 2) {
    if (near(size, 0.5)) return `${sign}${k}`;
    if (near(size, Math.SQRT2 / 2)) return `${sign}${co(k)}\\sqrt{2}`;
    if (near(size, Math.sqrt(3) / 2)) return `${sign}${co(k)}\\sqrt{3}`;
    return undefined;
  }
  if (near(size, Math.SQRT2 / 2)) return `${sign}${k}`;
  if (near(size, 0.5) && k % 2 === 0) return `${sign}${co(k / 2)}\\sqrt{2}`;
  return undefined;
}

const SOLVE_VALUES = [0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2];

function sampleSolve(rng: Rng, difficulty: number): RSolveParams {
  for (;;) {
    const table = sampleTable(rng, 3);
    const value = rng.pick(SOLVE_VALUES) * (difficulty > 1 && rng.chance(0.5) ? -1 : 1);
    if (rhsTex(table, value) === undefined) continue;
    return { form: rng.pick(difficulty > 1 ? ALL_FORMS : SIN_FORMS), table, value };
  }
}

/** The bracket's solutions over the range x = 0 to 360 sends it through, then x itself, both smallest first. */
function shiftedSolutions(form: number, alpha: number, value: number): { u: number[]; x: number[] } {
  const f = R_FORMS[form];
  const lo = f.plus ? alpha : -alpha;
  const u = solutionsOf(f.fn, value)
    .map((s) => (s < lo ? s + 360 : s >= lo + 360 ? s - 360 : s))
    .sort((a, b) => a - b);
  return { u, x: u.map((w) => (f.plus ? w - alpha : w + alpha)) };
}

const solveEquation = (p: RSolveParams): string => {
  const { C, S } = tableCoefs(p.table);
  return `${rExprTex(p.form, C, S, 'x')} = ${rhsTex(p.table, p.value)}`;
};

const bracketTex = (form: number, alpha: number): string => `x ${R_FORMS[form].plus ? '+' : '-'} ${deg(alpha)}`;

const angleList = (angles: number[]): string => angles.map(deg).join(', ');

function solveSteps(p: RSolveParams): SolutionStep[] {
  const { R, alpha } = tableCoefs(p.table);
  const f = R_FORMS[p.form];
  const { u, x } = shiftedSolutions(p.form, alpha, p.value);
  const raw = solutionsOf(f.fn, p.value);
  const shifted = raw.some((s, i) => s !== u[i]);
  return [
    { text: 'Convert the left-hand side first:' },
    { tex: solveEquation(p) },
    { tex: `${rFormTex(p.form, R.tex, 'x', deg(alpha))} = ${rhsTex(p.table, p.value)}` },
    { tex: `\\${f.fn}(${bracketTex(p.form, alpha)}) = ${specialTex(p.value)}` },
    {
      text: `As $x$ runs from $0^{\\circ}$ to $360^{\\circ}$, $${bracketTex(p.form, alpha)}$ runs from $${deg(f.plus ? alpha : -alpha)}$ to $${deg(f.plus ? 360 + alpha : 360 - alpha)}$.${shifted ? ` So the table's $${angleList(raw)}$ becomes $${angleList(u)}$.` : ''}`,
    },
    { tex: `${bracketTex(p.form, alpha)} = ${angleList(u)}` },
    { tex: `x = ${angleList(x)}` },
  ];
}

/** The whole solution as a line of working: convert, divide by R, solve for the bracket, undo the shift. */
const rSolveSteps: Generator<RSolveParams> = {
  id: 'tid-r-solve-steps',
  sample: (rng, difficulty) => sampleSolve(rng, difficulty),
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const f = R_FORMS[p.form];
    const rhs = rhsTex(p.table, p.value)!;
    const { u, x } = shiftedSolutions(p.form, alpha, p.value);
    const br = bracketTex(p.form, alpha);
    const rSquared = `${squareOf(R)}`;
    const slipValues = SPECIAL.filter((row) => row.value > 0 && row.value < 1 && Math.abs(row.value - Math.abs(p.value)) > 1e-9);
    const raw = solutionsOf(f.fn, p.value);
    const wrongWay = x.map((w) => (((f.plus ? w + 2 * alpha : w - 2 * alpha) % 360) + 360) % 360).sort((a, b) => a - b);
    const reductions: { span: [number, number]; value: string; bank: string[] }[] = [
      {
        span: [0, 1],
        value: rFormTex(p.form, R.tex, 'x', deg(alpha)),
        bank: [
          rFormTex(p.form, rSquared, 'x', deg(alpha)),
          rFormTex(p.form, R.tex, 'x', deg(90 - alpha)),
          rFormTex(p.form ^ 1, R.tex, 'x', deg(alpha)),
        ],
      },
      {
        span: [0, 3],
        value: `\\${f.fn}(${br}) = ${specialTex(p.value)}`,
        bank: [
          `\\${f.fn}(${br}) = ${specialTex(-p.value)}`,
          `\\${f.fn}(${br}) = ${p.value < 0 ? '-' : ''}${slipValues[0].tex}`,
          `\\${f.fn}(${br}) = ${p.value < 0 ? '-' : ''}${slipValues[1].tex}`,
        ],
      },
      {
        span: [0, 1],
        value: `${br} = ${angleList(u)}`,
        bank: [
          `${br} = ${angleList(raw)}`,
          `${br} = ${angleList(solutionsOf(otherFn(f.fn), p.value))}`,
          `${br} = ${angleList(solutionsOf(f.fn, -p.value))}`,
        ],
      },
      {
        span: [0, 1],
        value: `x = ${angleList(x)}`,
        bank: [`x = ${angleList(wrongWay)}`, `x = ${angleList(u)}`],
      },
    ];
    return {
      kind: 'steps',
      prompt: [prose('Solve for $0^{\\circ} \\le x < 360^{\\circ}$, a line at a time.')],
      start: [rExprTex(p.form, C, S, 'x'), '=', rhs],
      reductions: reductions.map((r) => ({ ...r, bank: scatter([...new Set([r.value, ...r.bank])]) })),
    };
  },
  solution: (p) => solveSteps(p),
};

interface RSolveAngleParams extends RSolveParams {
  largest: boolean;
  radians: boolean;
}

/** One solution, typed: the smallest or the largest. */
const rSolveAngle: Generator<RSolveAngleParams> = {
  id: 'tid-r-solve-angle',
  sample: (rng, difficulty) => ({
    ...sampleSolve(rng, difficulty),
    largest: rng.chance(0.5),
    radians: difficulty > 1 && rng.chance(0.5),
  }),
  render: (p): Slide => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const answer = p.largest ? x[x.length - 1] : x[0];
    return {
      kind: 'expression',
      prompt: [
        prose(
          `Solve for $${p.radians ? '0 \\le x < 2\\pi' : '0^{\\circ} \\le x < 360^{\\circ}'}$ and give the ${p.largest ? 'largest' : 'smallest'} solution${p.radians ? ', in radians' : ''}.`,
        ),
        display(solveEquation(p)),
      ],
      lead: 'x =',
      keypad: p.radians ? PI_KEYS : NUMBER_KEYS,
      answer: angleAnswer(answer, p.radians),
      domain: 'real',
      mode: 'exact',
    };
  },
  choices: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { u, x } = shiftedSolutions(p.form, alpha, p.value);
    const i = p.largest ? x.length - 1 : 0;
    const f = R_FORMS[p.form];
    const wrongWay = (((f.plus ? x[i] + 2 * alpha : x[i] - 2 * alpha) % 360) + 360) % 360;
    return angleOptions(x[i], [u[i], x[x.length - 1 - i], wrongWay], p.radians);
  },
  solution: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const answer = p.largest ? x[x.length - 1] : x[0];
    return [
      ...solveSteps(p),
      { text: `The ${p.largest ? 'largest' : 'smallest'} is $${angleTex(answer, p.radians)}$.` },
    ];
  },
};

interface RCountParams extends RWholeParams {
  /** A constant on the left, taken across before comparing with R. */
  d: number;
  /** R sin(x + α) = shifted. */
  shifted: number;
}

const countOf = (p: RCountParams): number => {
  const size = Math.abs(p.shifted);
  return size > p.pair.R ? 0 : size === p.pair.R ? 1 : 2;
};

/** How many solutions: R first, then the right-hand side against it. */
const rCountFlow: Generator<RCountParams> = {
  id: 'tid-r-count-flow',
  sample: (rng, difficulty) => {
    const base = { ...sampleWhole(rng, difficulty), swapped: false };
    const { R } = base.pair;
    const count = rng.int(0, 2);
    const sign = rng.chance(0.5) ? 1 : -1;
    const shifted = count === 2 ? rng.int(-(R - 1), R - 1) : count === 1 ? sign * R : sign * (R + rng.int(1, 4));
    let d = difficulty > 1 ? rng.int(-5, 4) : 0;
    if (difficulty > 1 && d >= 0) d += 1;
    return { ...base, d, shifted };
  },
  render: (p): Slide => {
    const x = R_VARS[p.v];
    const counts = ['0', '1', '2', '3'].map((n) => `$${n}$`);
    return {
      kind: 'flow',
      prompt: [prose(`How many solutions has this with $0^{\\circ} \\le ${x} < 360^{\\circ}$?`)],
      subject: `${wholeExpr(p)}${plusConst(p.d)} = ${p.shifted + p.d}`,
      steps: [
        {
          id: 'R',
          ask: `Written as $${rFormTex(p.form, 'R', x, '\\alpha')}$, $R$ is`,
          branches: rCandidates(p.pair).map((label) => ({ label, to: 'count' })),
        },
        {
          id: 'count',
          ask: 'So the number of solutions is',
          branches: counts.map((label) => ({ label, outcome: 'A wave of height $R$ meets a level line twice a turn, once, or never.' })),
        },
      ],
      answer: [`$${p.pair.R}$`, `$${countOf(p)}$`],
    };
  },
  solution: (p) => {
    const { C, S, R } = p.pair;
    const x = R_VARS[p.v];
    const f = R_FORMS[p.form];
    const n = countOf(p);
    const steps: SolutionStep[] = [{ text: `$R = \\sqrt{${C}^2 + ${S}^2} = ${R}$.` }];
    if (p.d !== 0) steps.push({ text: `Take the $${p.d}$ across first:` });
    steps.push(
      { tex: `${rFormTex(p.form, `${R}`, x, '\\alpha')} = ${p.shifted}` },
      { tex: `\\${f.fn}(${x} ${f.plus ? '+' : '-'} \\alpha) = ${ratTex(rat(p.shifted, R))}` },
      {
        text:
          n === 0
            ? `That is beyond $-1$ to $1$, which no sine or cosine reaches: no solutions.`
            : n === 1
              ? `That is the very ${p.shifted > 0 ? 'top' : 'bottom'} of the wave, reached once a turn: one solution.`
              : 'That is strictly between $-1$ and $1$, and a full turn crosses each such level twice: two solutions.',
      },
    );
    return steps;
  },
};

interface RSolveSliderParams extends RSolveParams {
  largest: boolean;
}

/** The equation's two sides drawn: slide to one of the solutions. */
const rSolveSlider: Generator<RSolveSliderParams> = {
  id: 'tid-r-solve-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const p = { ...sampleSolve(rng, difficulty), largest: difficulty > 1 && rng.chance(0.5) };
      const { alpha } = tableCoefs(p.table);
      const { x } = shiftedSolutions(p.form, alpha, p.value);
      const answer = p.largest ? x[x.length - 1] : x[0];
      // The untouched slider rests at 180; never make that the answer, nor either end.
      if (answer === 180 || answer === 0) continue;
      return p;
    }
  },
  render: (p): Slide => {
    const { C, S, R, alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    const wave = bracketFn(p.form, alpha);
    const pad = 0.3 * R.value + 0.5;
    const svg = plotSvg({
      xMin: 0,
      xMax: 360,
      curves: [{ f: (t) => R.value * wave(t), accent: true }],
      horizontals: [R.value * p.value],
      yMin: -R.value - pad,
      yMax: R.value + pad,
      label: 'The graph of the left-hand side from 0 to 360 degrees, with a dashed level line at the right-hand side',
    });
    return {
      kind: 'slider',
      prompt: [
        prose(
          `The dashed line is the right-hand side. Solve, and slide to the ${p.largest ? 'largest' : 'smallest'} solution with $0^{\\circ} < x < 360^{\\circ}$.`,
        ),
        display(`${rExprTex(p.form, C, S, 'x')} = ${rhsTex(p.table, p.value)}`),
      ],
      min: 0,
      max: 360,
      step: 15,
      answer: p.largest ? x[x.length - 1] : x[0],
      readout: 'x = {v}^{\\circ}',
      figure: { svg, ...markerWindow(0, 360) },
    };
  },
  solution: (p) => {
    const { alpha } = tableCoefs(p.table);
    const { x } = shiftedSolutions(p.form, alpha, p.value);
    return [...solveSteps(p), { text: `The ${p.largest ? 'largest' : 'smallest'} is $${deg(p.largest ? x[x.length - 1] : x[0])}$.` }];
  },
};

/* ---------- Fitting a phone ---------- */

/**
 * Roughly how many characters wide a line of TeX renders, counting a fraction
 * as its wider half and a function name as its letters. Only good enough to
 * tell a line that fits a phone from one that would scroll sideways.
 */
function texWidth(tex: string): number {
  let s = tex;
  for (;;) {
    const next = s.replace(/\\d?t?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${a.length > b.length ? a : b}xx`);
    if (next === s) break;
    s = next;
  }
  return s
    .replace(/\^\{\\circ\}/g, 'o')
    .replace(/\\operatorname\{cosec\}/g, 'cosec')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\(left|right)/g, 'x')
    .replace(/\\(,|;|!)/g, '')
    .replace(/\\qquad/g, 'xxxx')
    .replace(/\\quad/g, 'xx')
    .replace(/\\([a-zA-Z]+)/g, (_m, w: string) => (w.length > 3 ? 'xx' : w))
    .replace(/[=+]| - /g, 'xx')
    .replace(/[{}\s^_]/g, '').length;
}

/** The widest line, by `texWidth`, that sits on a 393-pixel screen without scrolling. */
const FIT = 22;

/** Splits at `sep` wherever it is outside every bracket and brace. */
function splitTop(tex: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (depth === 0 && tex.startsWith(sep, i)) {
      out.push(tex.slice(start, i).trim());
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(tex.slice(start).trim());
  return out;
}

/**
 * Breaks a long run of terms before an operator, packing terms greedily. A sum
 * breaks before a plus or minus first; only a piece still too wide after that
 * breaks inside a product, so `a \\times b + c \\times d` never splits `c` from `d`.
 */
function breakTerms(
  tex: string,
  limit = FIT - 5,
  groups: string[][] = [[' + ', ' - '], [' \\times ', ' \\div ']],
): string[] {
  if (texWidth(tex) <= limit || groups.length === 0) return [tex];
  let terms = [tex];
  for (const op of groups[0]) {
    terms = terms.flatMap((term) => {
      const [head, ...tail] = splitTop(term, op);
      return [head, ...tail.map((t) => `${op.trim()} ${t}`)];
    });
  }
  const lines: string[] = [];
  for (const term of terms) {
    const last = lines.length - 1;
    if (last >= 0 && texWidth(`${lines[last]} ${term}`) <= limit) lines[last] = `${lines[last]} ${term}`;
    else lines.push(term);
  }
  return lines.flatMap((line) => breakTerms(line, limit, groups.slice(1)));
}

/**
 * One `L = R1 = R2` chain as aligned rows, each `=` under the last. A long
 * left-hand side gets a row of its own, so it does not push every row right.
 */
function chainRows(tex: string, prefix: string): string[] {
  const [lhs, ...rhs] = splitTop(tex, ' = ');
  const pieces = (side: string, lead: string, limit = FIT - 5) =>
    breakTerms(side, limit).map((piece, j) => (j === 0 ? `${lead}${piece}` : `& \\quad {} ${piece}`));
  if (rhs.length === 0) return pieces(tex, `& ${prefix}`, FIT);
  if (texWidth(`${prefix}${tex}`) <= FIT) return [`${prefix}${lhs} &= ${rhs.join(' = ')}`];
  const own = texWidth(lhs) > FIT / 2 || (rhs.length === 1 && breakTerms(rhs[0]).length === 1);
  return [
    ...(own ? pieces(lhs, `& ${prefix}`, FIT) : []),
    ...rhs.flatMap((side, i) => pieces(side, i === 0 && !own ? `${prefix}${lhs} &= ` : '&= ')),
  ];
}

/**
 * A line of working too wide for a phone, stacked: a chain of equals signs one
 * per row, two statements side by side one above the other, and a long sum
 * broken before a plus or minus. A line that already fits is left alone.
 */
function fit(tex: string): string {
  if (tex.includes('\\begin') || texWidth(tex) <= FIT) return tex;
  const rows: string[] = [];
  for (const part of splitTop(tex, '\\qquad')) {
    // Two statements joined by an arrow or an "or": each gets its own row,
    // the joining word leading the second.
    const pieces = [{ tex: part, lead: '' }];
    for (const [sep, lead] of [
      ['\\quad \\Rightarrow \\quad', '\\Rightarrow\\; '],
      ['\\quad \\text{or} \\quad', '\\text{or}\\; '],
    ]) {
      const next = pieces.splice(0).flatMap((piece) =>
        texWidth(piece.tex) <= FIT
          ? [piece]
          : splitTop(piece.tex, sep).map((t, i) => ({ tex: t, lead: i === 0 ? piece.lead : lead })),
      );
      pieces.push(...next);
    }
    for (const piece of pieces) rows.push(...chainRows(piece.tex, piece.lead));
  }
  return rows.length === 1 ? tex : `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
}

/** The same generator, with every display and every line of working fitted to a phone. */
function fitted<P>(generator: Generator<P>): Generator<P> {
  return {
    ...generator,
    render: (params) => {
      const slide = generator.render(params);
      if (!('prompt' in slide)) return slide;
      if (slide.kind === 'expression' && slide.lead && texWidth(slide.lead) > FIT) {
        // Stacked in place, so the lead still ends in the equals sign the
        // input sits after, and a choice form built from it still finds it.
        const body = slide.lead.replace(/\s*=\s*$/, '').trim();
        return { ...slide, lead: `${fit(body)} =` };
      }
      return {
        ...slide,
        ...(slide.kind === 'tree' ? { expression: fit(slide.expression) } : {}),
        prompt: slide.prompt.map((block): Block => (block.kind === 'display' ? { ...block, tex: fit(block.tex) } : block)),
      };
    },
    solution: (params) => generator.solution(params).map((step) => (step.tex ? { ...step, tex: fit(step.tex) } : step)),
  };
}

export const trigIdentityGenerators = [
  fitted(simplifySteps),
  fitted(rearrangeTiles),
  fitted(simplifyChoice),
  fitted(valueFromIdentity),
  fitted(whichIdentityFlow),
  fitted(constantValue),
  fitted(quadraticTree),
  fitted(disguisedTiles),
  fitted(solutionCount),
  fitted(solutionSlider),
  fitted(tanSolve),
  fitted(tanSolveTiles),
  fitted(divideFlow),
  fitted(tanSlider),
  fitted(expandTiles),
  fitted(collapseTiles),
  fitted(formulaChoice),
  fitted(compoundTree),
  fitted(tanCompound),
  fitted(tanCompoundTree),
  fitted(tanShiftSolve),
  fitted(tanExpandTiles),
  fitted(exactTiles),
  fitted(exactSteps),
  fitted(tanExactChoice),
  fitted(doubleValue_),
  fitted(doubleTiles),
  fitted(doubleCollapseChoice),
  fitted(doubleSteps),
  fitted(doubleEqFlow),
  fitted(doubleEqSlider),
  fitted(doubleQuadTiles),
  fitted(doubleEqTree),
  fitted(rExpandTiles),
  fitted(rFormFlow),
  fitted(rMatchTiles),
  fitted(rSquaredTree),
  fitted(rValue),
  fitted(rTanAlpha),
  fitted(rAlphaSteps),
  fitted(rConvertChoice),
  fitted(rExactTiles),
  fitted(rExactAlpha),
  fitted(rExpandExactChoice),
  fitted(rMaxValue),
  fitted(rMaxTiles),
  fitted(rPeakSlider),
  fitted(rExtremeFlow),
  fitted(rSolveSteps),
  fitted(rSolveAngle),
  fitted(rCountFlow),
  fitted(rSolveSlider),
];
