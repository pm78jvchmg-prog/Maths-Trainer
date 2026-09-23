/**
 * Algebraic and Partial Fractions.
 *
 * Level 1 is arithmetic on algebraic fractions: simplifying by cancelling a
 * factor (never a term), multiplying and dividing, adding over a common
 * denominator, solving an equation with fractions in it, and where a fraction
 * is zero or undefined. Level 2 runs the addition backwards: a fraction split
 * into partial fractions over two linear factors, over three, over a repeated
 * factor, and after dividing out a whole part; then a preview of what the
 * split is for, integrating it and expanding it as a series.
 *
 * Every fraction is built outward from its answer: the factors that cancel,
 * the root that solves the equation, the numerators of the split and the
 * quotient of an improper fraction are drawn first and multiplied up, so every
 * value the learner meets is whole by construction. Polynomial arithmetic
 * comes from `polynomials.ts`.
 *
 * As in Polynomials, the learner never types a fraction or a polynomial: the
 * checker compares values, and a simplified fraction, a sum written as one
 * fraction and a partial-fraction split are all *equal* to the question, so a
 * typed answer would accept the question copied back (PITFALLS 3.4). Forms go
 * through `tiles`, `tree`, `steps`, `choice` and `flow`; only numbers are
 * typed.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { options } from '../choiceVariant';
import { markerWindow, plotSvg } from '../figures';
import { termTex } from './calculus';
import { type Poly, addPoly, divideBy, fromRoots, mulPoly, polyTex, scalePoly, valueAt } from './polynomials';

/* ---------- display ---------- */

const say = (text: string): Block => ({ kind: 'prose', text });
const show = (tex: string): Block => ({ kind: 'display', tex });

/** The inside of the bracket (x + c): x + 3, x - 2, or x. */
function br(c: number): string {
  if (c === 0) return 'x';
  return c > 0 ? `x + ${c}` : `x - ${-c}`;
}

/** The bracket itself. */
const pbr = (c: number): string => `(${br(c)})`;

/** x + c as a polynomial. */
const lin = (c: number): Poly => [1, c];

/** (x + c)(x + d), multiplied out. */
const quad = (c: number, d: number): Poly => mulPoly(lin(c), lin(d));

const frac = (top: string, bottom: string): string => `\\frac{${top}}{${bottom}}`;

/** A number after another term, its sign always shown: + 4, - 3. */
const signed = (n: number): string => (n < 0 ? `- ${-n}` : `+ ${n}`);

/** A number as a factor or a substituted value, bracketed when negative. */
const paren = (n: number): string => (n < 0 ? `(${n})` : `${n}`);

/** k over a bottom as a lone term: 3/(x + 1), or -3/(x + 1). */
function fracTerm(k: number, bottom: string): string {
  return k < 0 ? `-${frac(String(-k), bottom)}` : frac(String(k), bottom);
}

/** The same after another term: + 3/(x + 1), or - 3/(x + 1). */
function signedFracTerm(k: number, bottom: string): string {
  return k < 0 ? `- ${frac(String(-k), bottom)}` : `+ ${frac(String(k), bottom)}`;
}

/** A sum of numerators over bottoms, as the learner reads it. */
function splitTex(parts: [number, string][]): string {
  return parts.map(([k, bottom], i) => (i === 0 ? fracTerm(k, bottom) : signedFracTerm(k, bottom))).join(' ');
}

/** One term with its sign in front, for a tile that follows another. */
function signedTerm(c: number, k: number): string {
  return c < 0 ? `- ${termTex(-c, k)}` : `+ ${termTex(c, k)}`;
}

/** Every non-zero term of p as tiles, the first unsigned and the rest signed. */
function termTiles(p: Poly): string[] {
  const n = p.length - 1;
  const out: string[] = [];
  p.forEach((c, i) => {
    if (c !== 0) out.push(out.length === 0 ? termTex(c, n - i) : signedTerm(c, n - i));
  });
  return out;
}

/** k(x + c) as the learner reads it; the 1 and the bracket drop where they can. */
function timesTex(k: number, inside: string): string {
  if (k === 1) return inside;
  if (k === -1) return `-(${inside})`;
  return `${k}(${inside})`;
}

/** A polynomial for the grader. Never displayed. */
function polyMath(p: Poly): string {
  const n = p.length - 1;
  const terms = p.map((c, i) => (c === 0 ? '' : `(${c})*x^(${n - i})`)).filter(Boolean);
  return terms.length === 0 ? '0' : `(${terms.join(' + ')})`;
}

function chain(...lines: string[]): string {
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/* ---------- banks and options ---------- */

const bare = (token: string): string => token.replace(/\s+/g, '');

/**
 * A tiles or tree bank: every token the answer needs, as a multiset, plus the
 * distractors that differ from all of them. Sorted, so one question renders
 * one way (PITFALLS 3.10).
 */
function tileBank(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer.map(bare));
  const extras: string[] = [];
  for (const token of distractors) {
    if (needed.has(bare(token)) || extras.some((extra) => bare(extra) === bare(token))) continue;
    extras.push(token);
  }
  return [...answer, ...extras].sort();
}

/** Whole numbers near a value, nearest first, for topping up a bank whose slips collided. */
function near(value: number, count: number): number[] {
  const out: number[] = [];
  for (let gap = 1; out.length < count; gap += 1) out.push(value + gap, value - gap);
  return out.slice(0, count);
}

/**
 * A bank of numbers: the slips first, then values near the answers until at
 * least `spare` distractors survive. A tree needs two left over, and slips
 * built from a question's own numbers collide with its answers more often
 * than they look like they will.
 */
function numberBank(answer: number[], slips: number[], spare = 3): string[] {
  const needed = new Set(answer.map(String));
  const extras: string[] = [];
  for (const value of [...slips, ...answer.flatMap((v) => near(v, 6))]) {
    if (extras.length >= Math.max(spare, slips.length) && !slips.includes(value)) break;
    const token = String(value);
    if (!Number.isInteger(value) || needed.has(token) || extras.includes(token)) continue;
    extras.push(token);
  }
  return [...answer.map(String), ...extras].sort();
}

/**
 * A steps bank: the value and its slips, de-duplicated and scattered by hash
 * rather than shuffled, so the same question renders one way.
 */
function stepBank(value: string, ...slips: string[]): string[] {
  const out = [...new Set([value, ...slips])];
  return out.sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** Four whole-number options: the answer and the first three distinct whole slips, topped up. */
function intOptions(correct: number, slips: number[]): ChoiceOption[] {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of [...slips, ...near(correct, 12)]) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  return options(
    { tex: String(correct), answer: String(correct) },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: String(value), answer: String(value) })),
  );
}

/**
 * A native choice slide, the options turned by a hash of their labels so the
 * answer is not always first yet one question renders one way.
 */
function choiceSlide(prompt: Block[], opts: ChoiceOption[]): Slide {
  const turn = hashSeed(opts.map((o) => o.tex).join('|')) % opts.length;
  const ordered = [...opts.slice(turn), ...opts.slice(0, turn)];
  return {
    kind: 'choice',
    prompt,
    options: ordered.map((option, idx) => ({ id: `opt${idx}`, label: option.tex, tex: true })),
    correctId: `opt${ordered.findIndex((option) => option.correct)}`,
  };
}

/** Flow branches turned by a hash of `key`, so the right one is not always first. */
function turned<T>(items: T[], key: string): T[] {
  const turn = hashSeed(key) % items.length;
  return [...items.slice(turn), ...items.slice(0, turn)];
}

/** Options with the right one first, de-duplicated by label and cut to four. */
function firstFour(correct: string, ...wrong: string[]): ChoiceOption[] {
  return options({ tex: correct }, ...wrong.map((tex) => ({ tex }))).slice(0, 4);
}

/* ---------- sampling ---------- */

function nonZero(rng: Rng, max: number): number {
  return rng.int(1, max) * rng.sign();
}

/** `count` distinct non-zero whole numbers in [-max, max], none of them in `avoid`. */
function distinct(rng: Rng, count: number, max: number, avoid: number[] = []): number[] {
  for (;;) {
    const out = Array.from({ length: count }, () => nonZero(rng, max));
    if (new Set(out).size === count && out.every((v) => !avoid.includes(v))) return out;
  }
}

function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x;
}

/** The largest whole number dividing every coefficient. */
const contentOf = (p: Poly): number => p.reduce((g, c) => gcd(g, c), 0);

/**
 * Whether top and bottom share a factor that cancels: a common whole-number
 * factor, or a common root. Every polynomial here is built from whole roots
 * or has none, so checking whole points is enough.
 */
function sharesFactor(top: Poly, bottom: Poly): boolean {
  if (gcd(contentOf(top), contentOf(bottom)) > 1) return true;
  for (let x = -30; x <= 30; x += 1) {
    if (valueAt(top, x) === 0 && valueAt(bottom, x) === 0) return true;
  }
  return false;
}

/** The value a slider rests at before it is touched, which must not be the answer. */
const restingOn = (min: number, max: number): number => min + Math.round((max - min) / 2);

/** The factorised form of (x + s)(x + t) times k, as the learner reads it. */
function factorisedTex(k: number, ...cs: number[]): string {
  const brackets = cs.map(pbr).join('');
  if (k === 1) return brackets;
  if (k === -1) return `-${brackets}`;
  return `${k}${brackets}`;
}

/* ================================================================
 * Level 1, lesson 1: simplifying
 * ================================================================ */

interface CancelParams {
  /** The shared factor is (x + s). */
  s: number;
  /** The top is k(x + s)(x + b), or k(x + s) when b is null. */
  k: number;
  b: number | null;
  /** The bottom is (x + s)(x + c). */
  c: number;
}

function cancelTop({ s, k, b }: CancelParams): Poly {
  return b === null ? scalePoly(lin(s), k) : scalePoly(quad(s, b), k);
}

const cancelBottom = ({ s, c }: CancelParams): Poly => quad(s, c);

/**
 * Simplify a fraction whose top and bottom share a factor. Difficulty 2 hides
 * it: a number factored out of a linear top, or a difference of two squares.
 */
const fracCancel: Generator<CancelParams> = {
  id: 'frac-cancel',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const kind = rng.int(0, 2);
      if (kind === 0) {
        const [s, c] = distinct(rng, 2, 7);
        return { s, c, k: rng.int(2, 6), b: null };
      }
      if (kind === 1) {
        const s = nonZero(rng, 7);
        const [c] = distinct(rng, 1, 8, [s, -s]);
        return { s, c, k: 1, b: -s };
      }
      const [s, b, c] = distinct(rng, 3, 9);
      return { s, b, c, k: 1 };
    }
    const [s, b, c] = distinct(rng, 3, 6);
    return { s, b, c, k: 1 };
  },
  render: (params): Slide => {
    const top = cancelTop(params);
    const bottom = cancelBottom(params);
    const left = polyTex(divideBy(top, -params.s).quotient);
    const under = polyTex(divideBy(bottom, -params.s).quotient);
    const answer = [left, under];
    return {
      kind: 'tiles',
      prompt: [
        say('Simplify fully. Factorise the top and the bottom, cancel the factor they share, and place what is left.'),
        show(frac(polyTex(top), polyTex(bottom))),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, [
        br(params.s),
        br(-params.s),
        params.b === null ? '1' : br(-params.b),
        br(-params.c),
        params.b === null ? br(params.c) : String(params.b),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { s, k, b, c } = params;
    const top = cancelTop(params);
    const topFactors = b === null ? `${k}${pbr(s)}` : factorisedTex(k, s, b);
    const left = polyTex(divideBy(top, -s).quotient);
    const steps: SolutionStep[] = [];
    if (b === -s) steps.push({ text: `The top is a difference of two squares: $x^{2} - ${s * s} = ${pbr(s)}${pbr(-s)}$.` });
    else if (b === null) steps.push({ text: `Take the common number out of the top: $${polyTex(top)} = ${topFactors}$.` });
    steps.push({ tex: chain(`&${frac(polyTex(top), polyTex(cancelBottom(params)))}`, `=\\;&${frac(topFactors, `${pbr(s)}${pbr(c)}`)}`) });
    steps.push({ text: `Both have the factor $${pbr(s)}$, so it cancels, top and bottom:` });
    steps.push({ tex: frac(left, br(c)) });
    return steps;
  },
};

interface CancelWhichParams {
  /** The fraction that does cancel, then three that do not. */
  right: [Poly, Poly];
  wrong: [Poly, Poly][];
}

/** Fractions that look as though something cancels, and nothing does. */
function lookalikes(rng: Rng, hard: boolean): [Poly, Poly][] {
  const out: [Poly, Poly][] = [];
  // A term common to top and bottom: x^2 + q over x + q.
  const q = distinct(rng, 1, 9, [-1])[0];
  out.push([[1, 0, q], lin(q)]);
  // Both have sx: x^2 + sx + r over x + s.
  const [s, r] = distinct(rng, 2, 8);
  out.push([[1, s, r], lin(s)]);
  // Both start with x.
  const [t, u] = distinct(rng, 2, 9);
  out.push([lin(t), lin(u)]);
  // mx + n over mx, with nothing common to m and n.
  const m = rng.int(2, 5);
  let n = nonZero(rng, 9);
  while (gcd(m, n) !== 1) n += 1;
  out.push([[m, n], [m, 0]]);
  if (hard) {
    // Two quadratics that factorise, with no bracket in common.
    const [a, b, c, d] = distinct(rng, 4, 6);
    out.push([quad(a, b), quad(c, d)]);
  }
  return out;
}

const whichTex = ([top, bottom]: [Poly, Poly]): string => frac(polyTex(top), polyTex(bottom));

/**
 * Which one can be simplified? Three distractors share a *term* with their
 * bottom, or a bracket with its sign flipped, and only one shares a factor.
 */
const fracCancelWhich: Generator<CancelWhichParams> = {
  id: 'frac-cancel-which',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      let right: [Poly, Poly];
      const [s, c, e] = distinct(rng, 3, 7);
      const flipped: [Poly, Poly] = [quad(s, c), lin(-s)];
      if (!hard) right = [quad(s, c), lin(s)];
      else {
        const kind = rng.int(0, 2);
        const k = rng.int(2, 5);
        right = kind === 0 ? [quad(s, c), quad(s, e)] : kind === 1 ? [scalePoly(lin(s), k), quad(s, c)] : [[k, k * c], [k, 0]];
      }
      const pool = [...lookalikes(rng, hard), ...(c !== -s ? [flipped] : [])];
      const wrong = rng.sample(pool, 3);
      if (!sharesFactor(...right) || wrong.some((pair) => sharesFactor(...pair))) continue;
      const labels = [right, ...wrong].map(whichTex);
      if (new Set(labels).size !== 4) continue;
      return { right, wrong };
    }
  },
  render: ({ right, wrong }): Slide =>
    choiceSlide(
      [say('Only one of these can be simplified by cancelling. Which one?')],
      options({ tex: whichTex(right) }, ...wrong.map((pair) => ({ tex: whichTex(pair) }))),
    ),
  solution: ({ right }) => {
    const [top, bottom] = right;
    const k = gcd(contentOf(top), contentOf(bottom));
    const steps: SolutionStep[] = [
      {
        text: 'Cancelling divides the top and the bottom by the same thing, so what cancels has to be a factor of the whole top and the whole bottom — something multiplying everything, not a term added on.',
      },
    ];
    if (k > 1) {
      steps.push({ text: `In $${whichTex(right)}$, every term on both lines is a multiple of $${k}$, so $${k}$ cancels.` });
    } else {
      const root = Array.from({ length: 61 }, (_, i) => i - 30).find((x) => valueAt(top, x) === 0 && valueAt(bottom, x) === 0)!;
      steps.push({
        text: `In $${whichTex(right)}$, both the top and the bottom are zero at $x = ${root}$, so both have the factor $${pbr(-root)}$, and it cancels.`,
      });
    }
    steps.push({
      text: 'In the others, a number or an $x$ appears on both lines, but as part of a sum. Factorise each fully and no bracket appears on both.',
    });
    return steps;
  },
};

interface CancelFlowParams {
  k: number;
  s: number;
  c: number;
  /** The bottom is (x + t). */
  t: number;
}

const flowTop = ({ k, s, c }: CancelFlowParams): Poly => scalePoly(quad(s, c), k);

/**
 * Factorise, look for a common factor, cancel it: a walk through the whole
 * method. Sometimes the bottom is only a lookalike, and the answer is to
 * leave the fraction alone. Difficulty 2 has a number to take out first.
 */
const fracCancelFlow: Generator<CancelFlowParams> = {
  id: 'frac-cancel-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const [s, c] = distinct(rng, 2, 6);
      if (s === -c) continue;
      const k = difficulty > 1 ? rng.pick([2, 3, 4, -2]) : 1;
      if (rng.chance(0.65)) return { k, s, c, t: rng.pick([s, c]) };
      const t = rng.pick([-s, -c, s + c]);
      if (t === 0 || t === s || t === c || Math.abs(t) > 12) continue;
      return { k, s, c, t };
    }
  },
  render: (params): Slide => {
    const { k, s, c, t } = params;
    const right = factorisedTex(k, s, c);
    const factorings = [right, factorisedTex(k, -s, -c), factorisedTex(k, s, -c), factorisedTex(k, -s, c)];
    const common = t === s || t === c;
    const other = t === s ? c : s;
    const leftOver = [
      ...new Set([timesTex(k, br(other)), timesTex(k, br(t)), timesTex(k, br(-other)), frac('1', timesTex(k, br(other)))]),
    ];
    return {
      kind: 'flow',
      prompt: [say('Simplify this fraction, if it can be. Each answer decides what is asked next.')],
      subject: frac(polyTex(flowTop(params)), br(t)),
      steps: [
        {
          id: 'factorise',
          ask: 'Factorise the top fully. Which is it?',
          branches: turned(factorings, right).map((tex) => ({ label: `$${tex}$`, to: 'share' })),
        },
        {
          id: 'share',
          ask: 'Is one of the top’s factors the whole bottom?',
          branches: [
            { label: 'Yes', to: 'left' },
            { label: 'No', outcome: 'Then nothing cancels, and the fraction is already as simple as it gets.' },
          ],
        },
        {
          id: 'left',
          ask: 'Cancel it. What is left?',
          branches: turned(leftOver, right).map((tex) => ({ label: `$${tex}$`, outcome: `So it simplifies to $${tex}$.` })),
        },
      ],
      answer: common ? [`$${right}$`, 'Yes', `$${leftOver[0]}$`] : [`$${right}$`, 'No'],
    };
  },
  solution: (params) => {
    const { k, s, c, t } = params;
    const steps: SolutionStep[] = [];
    if (k !== 1) steps.push({ text: `Take out the common number first, then factorise the quadratic that is left.` });
    steps.push({ tex: chain(`&${polyTex(flowTop(params))}`, `=\\;&${factorisedTex(k, s, c)}`) });
    if (t === s || t === c) {
      const other = t === s ? c : s;
      steps.push({ text: `The bottom, $${br(t)}$, is one of those factors, so it cancels:` });
      steps.push({ tex: chain(`&${frac(factorisedTex(k, s, c), br(t))}`, `=\\;&${timesTex(k, br(other))}`) });
    } else {
      steps.push({
        text: `The bottom, $${br(t)}$, is not one of the factors. It shares a number or an $x$ with the top, but only as part of a sum, and a term cannot be cancelled — so the fraction stays as it is.`,
      });
    }
    return steps;
  },
};

interface FlipParams {
  k: number;
  s: number;
  c: number;
}

const flipTop = ({ k, s, c }: FlipParams): Poly => scalePoly(quad(-s, c), k);
const flipResult = ({ k, c }: FlipParams): Poly => [-k, -k * c];

/**
 * A bottom written the other way round: (s - x) is -(x - s), so cancelling it
 * leaves a minus sign behind. Difficulty 2 has a number in front of the top.
 */
const fracFlipSign: Generator<FlipParams> = {
  id: 'frac-flip-sign',
  sample: (rng, difficulty) => {
    const s = rng.int(1, 9);
    const [c] = distinct(rng, 1, 8, [-s, s]);
    return { s, c, k: difficulty > 1 ? rng.int(2, 4) : 1 };
  },
  choices: (params) => {
    const { k, c } = params;
    const right = flipResult(params);
    const pick = (p: Poly) => ({ tex: polyTex(p), answer: polyMath(p) });
    return options(pick(right), pick([k, k * c]), pick([-k, k * c]), pick([k, -k * c]));
  },
  render: (params): Slide => {
    const { k, s, c } = params;
    const result = flipResult(params);
    const answer = termTiles(result);
    return {
      kind: 'tiles',
      prompt: [say('Simplify fully.'), show(frac(polyTex(flipTop(params)), `${s} - x`))],
      template: '{0} {1}',
      bank: tileBank(answer, [termTex(k, 1), signedTerm(k * c, 0), signedTerm(-k * c, 0), signedTerm(s, 0)]),
      answer,
    };
  },
  solution: (params) => {
    const { k, s, c } = params;
    return [
      { text: `Factorise the top: $${polyTex(flipTop(params))} = ${factorisedTex(k, -s, c)}$.` },
      { text: `The bottom is the same bracket the other way round: $${s} - x = -${pbr(-s)}$.` },
      { tex: `${frac(factorisedTex(k, -s, c), `-${pbr(-s)}`)} = -${k === 1 ? pbr(c) : `${k}${pbr(c)}`}` },
      { text: `Multiplied out, that is $${polyTex(flipResult(params))}$.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 2: multiplying and dividing
 * ================================================================ */

interface MultiplyParams {
  p: number;
  q: number;
  t: number;
  r: number;
  expanded: boolean;
}

/** The second fraction of the product: (x + q)(x + t) over (x + p)(x + r). */
function secondTex({ p, q, t, r, expanded }: MultiplyParams): string {
  return expanded ? frac(polyTex(quad(q, t)), polyTex(quad(p, r))) : frac(`${pbr(q)}${pbr(t)}`, `${pbr(p)}${pbr(r)}`);
}

/**
 * Multiply two fractions, cancelling first: every factor of the first cancels
 * against the second. Difficulty 2 hides the factors by multiplying them out.
 */
const fracMultiply: Generator<MultiplyParams> = {
  id: 'frac-multiply',
  sample: (rng, difficulty) => {
    const [p, q, t, r] = distinct(rng, 4, difficulty > 1 ? 7 : 6);
    return { p, q, t, r, expanded: difficulty > 1 };
  },
  render: (params): Slide => {
    const { p, q, t, r } = params;
    const answer = [br(t), br(r)];
    return {
      kind: 'tiles',
      prompt: [
        say('Multiply, and simplify fully. Cancel before multiplying anything out.'),
        show(`${frac(br(p), br(q))} \\times ${secondTex(params)}`),
      ],
      template: '\\text{top: } {0} \\quad \\text{bottom: } {1}',
      bank: tileBank(answer, [br(p), br(q), br(-t), br(-r)]),
      answer,
    };
  },
  solution: (params) => {
    const { p, q, t, r, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) {
      steps.push({ text: 'Factorise the second fraction first, so its factors can be seen:' });
      steps.push({ tex: chain(`&${secondTex(params)}`, `=\\;&${frac(`${pbr(q)}${pbr(t)}`, `${pbr(p)}${pbr(r)}`)}`) });
    }
    steps.push({ text: 'Multiplying fractions multiplies the tops and multiplies the bottoms, so any factor on top can cancel with any factor below:' });
    steps.push({ tex: frac(`${pbr(p)}${pbr(q)}${pbr(t)}`, `${pbr(q)}${pbr(p)}${pbr(r)}`) });
    steps.push({ text: `$${pbr(p)}$ and $${pbr(q)}$ cancel, which leaves $${frac(br(t), br(r))}$.` });
    return steps;
  },
};

interface DivideParams {
  p: number;
  q: number;
  r: number;
  t: number;
  hard: boolean;
}

/** The division as tops and bottoms: (A/B) ÷ (C/D). */
function divideParts({ p, q, r, t, hard }: DivideParams): { A: string; B: string; C: string; D: string } {
  return hard
    ? { A: polyTex(quad(p, t)), B: br(q), C: br(p), D: polyTex(quad(q, r)) }
    : { A: br(p), B: br(q), C: br(p), D: br(r) };
}

/** What the division comes to. */
function divideResult({ q, r, t, hard }: DivideParams): string {
  return hard ? polyTex(quad(t, r)) : frac(br(r), br(q));
}

/**
 * Divide by flipping the second fraction and multiplying, then cancel. At
 * difficulty 2 the cancelling needs a factorisation first and nothing is left
 * on the bottom.
 */
const fracDivideSteps: Generator<DivideParams> = {
  id: 'frac-divide-steps',
  sample: (rng, difficulty) => {
    const [p, q, r, t] = distinct(rng, 4, 6);
    return { p, q, r, t, hard: difficulty > 1 };
  },
  render: (params): Slide => {
    const { p, q, r, t, hard } = params;
    const { A, B, C, D } = divideParts(params);
    const flipped = `\\times ${frac(D, C)}`;
    const value = divideResult(params);
    const slips = hard
      ? [frac(`${pbr(p)}^{2}${pbr(t)}`, `${pbr(q)}^{2}${pbr(r)}`), frac('1', polyTex(quad(t, r))), polyTex(quad(t, -r))]
      : [frac(br(q), br(r)), frac(`${pbr(p)}^{2}`, `${pbr(q)}${pbr(r)}`), frac(br(r), br(p))];
    return {
      kind: 'steps',
      prompt: [
        say('Divide, and simplify fully. Tap the part you would do **next**, then choose what it becomes.'),
      ],
      start: [frac(A, B), '\\div', frac(C, D)],
      reductions: [
        {
          span: [1, 3],
          operator: 1,
          value: flipped,
          bank: stepBank(flipped, `\\times ${frac(C, D)}`, `\\div ${frac(D, C)}`),
        },
        { span: [0, 2], value, bank: stepBank(value, ...slips) },
      ],
    };
  },
  solution: (params) => {
    const { p, q, r, t, hard } = params;
    const { A, B, C, D } = divideParts(params);
    const steps: SolutionStep[] = [
      { text: 'Dividing by a fraction is multiplying by it upside down, so the question becomes:' },
      { tex: chain(`&${frac(A, B)}`, `&\\times ${frac(D, C)}`) },
    ];
    if (hard) {
      steps.push({ text: 'Factorise, so the factors can be seen:' });
      steps.push({ tex: chain(`&${frac(`${pbr(p)}${pbr(t)}`, br(q))}`, `&\\times ${frac(`${pbr(q)}${pbr(r)}`, br(p))}`) });
      steps.push({ text: `$${pbr(p)}$ and $${pbr(q)}$ cancel, leaving $${pbr(t)}${pbr(r)} = ${polyTex(quad(t, r))}$.` });
    } else {
      steps.push({ text: `$${pbr(p)}$ cancels, leaving $${frac(br(r), br(q))}$.` });
    }
    return steps;
  },
};

interface FlipWhichParams {
  /** Tops and bottoms of the two fractions. */
  A: string;
  B: string;
  C: string;
  D: string;
}

/**
 * The first step of a division, and the three ways of getting it wrong:
 * flipping the first fraction, flipping both, or flipping neither.
 */
const fracFlipWhich: Generator<FlipWhichParams> = {
  id: 'frac-flip-which',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const [p, q, r] = distinct(rng, 3, 6);
      const [m, n] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9], 2);
      return { A: String(m), B: br(p), C: String(n), D: polyTex(quad(q, r)) };
    }
    const [p, q, r, t] = distinct(rng, 4, 7);
    return { A: br(p), B: br(q), C: br(r), D: br(t) };
  },
  render: ({ A, B, C, D }): Slide =>
    choiceSlide(
      [say('Which is the right first step for this division?'), show(`${frac(A, B)} \\div ${frac(C, D)}`)],
      options(
        { tex: `${frac(A, B)} \\times ${frac(D, C)}` },
        { tex: `${frac(B, A)} \\times ${frac(C, D)}` },
        { tex: `${frac(A, B)} \\times ${frac(C, D)}` },
        { tex: `${frac(B, A)} \\times ${frac(D, C)}` },
      ),
    ),
  solution: ({ A, B, C, D }) => [
    { text: 'To divide by a fraction, multiply by it upside down. Only the fraction you are dividing *by* turns over; the first stays as it is.' },
    { tex: chain(`&${frac(A, B)} \\div ${frac(C, D)}`, `=\\;&${frac(A, B)} \\times ${frac(D, C)}`) },
  ],
};

interface ProductValueParams {
  p: number;
  q: number;
  t: number;
  u: number;
  x: number;
  divide: boolean;
}

/** The product or quotient as the learner sees it. */
function productValueTex({ p, q, t, u, divide }: ProductValueParams): string {
  if (divide) return `${frac(polyTex(quad(p, t)), br(q))} \\div ${frac(br(p), polyTex(quad(q, u)))}`;
  return `${frac(polyTex(quad(p, t)), br(q))} \\times ${frac(br(q), br(p))}`;
}

/** What it simplifies to, evaluated. */
function productValue({ t, u, x, divide }: ProductValueParams): number {
  return divide ? (x + t) * (x + u) : x + t;
}

/**
 * Simplify, then evaluate. Once it has cancelled the value is a sum or a
 * product of two small numbers; substituted straight in, it is a page of
 * arithmetic. Difficulty 2 divides.
 */
const fracProductValue: Generator<ProductValueParams> = {
  id: 'frac-product-value',
  sample: (rng, difficulty) => {
    for (;;) {
      const divide = difficulty > 1;
      const [p, q, t, u] = distinct(rng, 4, 6);
      const x = rng.int(2, 9);
      if ([p, q, u].some((c) => x + c === 0)) continue;
      const params = { p, q, t, u, x, divide };
      if (productValue(params) === 0) continue;
      return params;
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      say(`Simplify first, then find the value when $x = ${params.x}$.`),
      show(productValueTex(params)),
    ],
    lead: '\\text{value} =',
    keypad: [],
    answer: String(productValue(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { p, q, t, u, x, divide } = params;
    const value = productValue(params);
    if (divide) {
      return [
        { text: 'Turn the second fraction over and multiply, factorising as you go:' },
        { text: `$${frac(`${pbr(p)}${pbr(t)}`, br(q))} \\times ${frac(`${pbr(q)}${pbr(u)}`, br(p))}$` },
        { text: `$${pbr(p)}$ and $${pbr(q)}$ cancel, leaving $${pbr(t)}${pbr(u)}$.` },
        { text: `At $x = ${x}$: $(${x} ${signed(t)})(${x} ${signed(u)}) = ${x + t} \\times ${paren(x + u)} = ${value}$.` },
      ];
    }
    return [
      { text: 'Factorise the first top so its factors can be seen:' },
      { text: `$${frac(`${pbr(p)}${pbr(t)}`, br(q))} \\times ${frac(br(q), br(p))}$` },
      { text: `$${pbr(p)}$ and $${pbr(q)}$ cancel, leaving $${br(t)}$.` },
      { text: `At $x = ${x}$ that is $${x} ${signed(t)} = ${value}$.` },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 3: adding and subtracting
 * ================================================================ */

interface LcdParams {
  kind: 'distinct' | 'shared' | 'hidden' | 'quadratics';
  m: number;
  n: number;
  p: number;
  q: number;
  r: number;
  minus: boolean;
}

function lcdSum({ kind, m, n, p, q, r, minus }: LcdParams): string {
  const op = minus ? '-' : '+';
  if (kind === 'distinct') return `${frac(String(m), br(p))} ${op} ${frac(String(n), br(q))}`;
  if (kind === 'shared') return `${frac(String(m), br(p))} ${op} ${frac(String(n), `${pbr(p)}${pbr(q)}`)}`;
  if (kind === 'hidden') return `${frac(String(m), br(p))} ${op} ${frac(String(n), polyTex(quad(p, q)))}`;
  return `${frac(String(m), polyTex(quad(p, q)))} ${op} ${frac(String(n), polyTex(quad(p, r)))}`;
}

/**
 * The simplest common denominator: the product of two different brackets, or
 * no product at all when one bottom already contains the other. Difficulty 2
 * hides the shared bracket inside a quadratic.
 */
const fracLcd: Generator<LcdParams> = {
  id: 'frac-lcd',
  sample: (rng, difficulty) => {
    const kind = difficulty > 1 ? rng.pick<LcdParams['kind']>(['hidden', 'quadratics']) : rng.pick<LcdParams['kind']>(['distinct', 'shared']);
    const [p, q, r] = distinct(rng, 3, 6);
    return { kind, p, q, r, m: rng.int(1, 9), n: rng.int(1, 9), minus: rng.chance(0.5) };
  },
  render: (params): Slide => {
    const { kind, p, q, r } = params;
    const both = `${pbr(p)}${pbr(q)}`;
    const opts =
      kind === 'distinct'
        ? firstFour(both, polyTex([2, p + q]), polyTex([1, 0, p * q]), `${pbr(p)}^{2}${pbr(q)}^{2}`)
        : kind === 'shared'
          ? firstFour(both, `${pbr(p)}^{2}${pbr(q)}`, br(q), `${pbr(p)}^{2}`)
          : kind === 'hidden'
            ? firstFour(both, `${pbr(p)}(${polyTex(quad(p, q))})`, polyTex([1, p + q + 1, p * q + p]), `${pbr(p)}^{2}${pbr(q)}`)
            : firstFour(`${pbr(p)}${pbr(q)}${pbr(r)}`, `${pbr(p)}^{2}${pbr(q)}${pbr(r)}`, `${pbr(q)}${pbr(r)}`, `${pbr(p)}${pbr(q)}`);
    return choiceSlide([say('What is the simplest common denominator for this sum?'), show(lcdSum(params))], opts);
  },
  solution: ({ kind, p, q, r }) => {
    if (kind === 'distinct') {
      return [
        { text: 'The two bottoms have no factor in common, so the simplest bottom they both divide into is their product.' },
        { tex: `${pbr(p)}${pbr(q)}` },
        { text: 'Adding the bottoms is never right: a common denominator is something each bottom divides into.' },
      ];
    }
    if (kind === 'quadratics') {
      return [
        { text: 'Factorise both bottoms:' },
        { text: `$${polyTex(quad(p, q))} = ${pbr(p)}${pbr(q)}$` },
        { text: `$${polyTex(quad(p, r))} = ${pbr(p)}${pbr(r)}$` },
        { text: `Each bracket is needed once, and $${pbr(p)}$ is in both, so the simplest common bottom is $${pbr(p)}${pbr(q)}${pbr(r)}$.` },
      ];
    }
    return [
      ...(kind === 'hidden' ? [{ text: `Factorise the second bottom: $${polyTex(quad(p, q))} = ${pbr(p)}${pbr(q)}$.` }] : []),
      {
        text: `The second bottom already contains $${pbr(p)}$, the first bottom, so it is itself a common denominator: $${pbr(p)}${pbr(q)}$. Multiplying the two bottoms would put $${pbr(p)}$ in twice.`,
      },
    ];
  },
};

interface AddParams {
  m: number;
  n: number;
  p: number;
  q: number;
  minus: boolean;
}

/** The top of m/(x + p) ± n/(x + q) over (x + p)(x + q). */
function addTop({ m, n, p, q, minus }: AddParams): Poly {
  const sign = minus ? -1 : 1;
  return [m + sign * n, m * q + sign * n * p];
}

function addTex({ m, n, p, q, minus }: AddParams): string {
  return `${frac(String(m), br(p))} ${minus ? '-' : '+'} ${frac(String(n), br(q))}`;
}

function sampleAdd(rng: Rng, minus: boolean, max = 6): AddParams {
  for (;;) {
    const [p, q] = distinct(rng, 2, 6);
    const params = { m: rng.int(1, max), n: rng.int(1, max), p, q, minus };
    if (addTop(params).some((c) => c === 0)) continue;
    return params;
  }
}

/**
 * The new top of a sum over the common bottom, as strands: each top times the
 * other bottom, then combined. Difficulty 2 subtracts, where the second strand
 * is taken away whole.
 */
const fracAddTree: Generator<AddParams> = {
  id: 'frac-add-tree',
  sample: (rng, difficulty) => sampleAdd(rng, difficulty > 1),
  render: (params): Slide => {
    const { m, n, p, q, minus } = params;
    const first = polyTex([m, m * q]);
    const second = polyTex([n, n * p]);
    const answer = [first, second, polyTex(addTop(params))];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Put both fractions over $${pbr(p)}${pbr(q)}$. Top row: the first top times $${pbr(q)}$, then the second top times $${pbr(p)}$, each multiplied out. Below: the new top, the first ${minus ? 'minus' : 'plus'} the second.`,
        ),
      ],
      expression: addTex(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'top', from: ['first', 'second'] },
      ],
      bank: tileBank(answer, [
        polyTex([m, m * p]),
        polyTex([n, n * q]),
        polyTex(addTop({ ...params, minus: !minus })),
        polyTex([m + (minus ? -n : n), m * q + (minus ? n * p : -n * p)]),
        polyTex([m + n, m * p + n * q]),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { m, n, p, q, minus } = params;
    const op = minus ? '-' : '+';
    return [
      { text: `The common bottom is $${pbr(p)}${pbr(q)}$. Each fraction is multiplied top and bottom by the bracket it is missing:` },
      { tex: frac(`${m}${pbr(q)} ${op} ${n}${pbr(p)}`, `${pbr(p)}${pbr(q)}`) },
      {
        text: `$${m}${pbr(q)} = ${polyTex([m, m * q])}$ and $${n}${pbr(p)} = ${polyTex([n, n * p])}$.${minus ? ' The minus sign takes away the whole of the second, both of its terms.' : ''}`,
      },
      { tex: frac(polyTex(addTop(params)), `${pbr(p)}${pbr(q)}`) },
    ];
  },
};

interface SumTilesParams {
  m: number;
  n: number;
  p: number;
  q: number;
  minus: boolean;
  /** The second bottom is (x + p)(x + q), so only the first fraction needs a bracket. */
  shared: boolean;
}

function sumTilesTop({ m, n, p, q, minus, shared }: SumTilesParams): Poly {
  const sign = minus ? -1 : 1;
  return shared ? [m, m * q + sign * n] : [m + sign * n, m * q + sign * n * p];
}

function sumTilesTex({ m, n, p, q, minus, shared }: SumTilesParams): string {
  const second = shared ? `${pbr(p)}${pbr(q)}` : br(q);
  return `${frac(String(m), br(p))} ${minus ? '-' : '+'} ${frac(String(n), second)}`;
}

/**
 * The top of a sum or difference as one fraction. Difficulty 1 subtracts over
 * two different brackets; difficulty 2 has one bottom inside the other, so
 * only one fraction changes.
 */
const fracSumTiles: Generator<SumTilesParams> = {
  id: 'frac-sum-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const [p, q] = distinct(rng, 2, 6);
      const shared = difficulty > 1;
      const params = { m: rng.int(1, 7), n: rng.int(1, 9), p, q, minus: shared ? rng.chance(0.5) : true, shared };
      if (sumTilesTop(params).some((c) => c === 0)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { m, n, p, q, shared } = params;
    const answer = termTiles(sumTilesTop(params));
    const flip = sumTilesTop({ ...params, minus: !params.minus });
    const slips = shared ? [[m, m * p + n], [m, m * q], flip] : [flip, [m - n, m * q + n * p], [m - n, m * p - n * q]];
    return {
      kind: 'tiles',
      prompt: [
        say(`Write this as one fraction over $${pbr(p)}${pbr(q)}$. Place its top.`),
        show(sumTilesTex(params)),
      ],
      template: '\\text{top} = {0} {1}',
      bank: tileBank(answer, slips.flatMap((poly) => termTiles(poly))),
      answer,
    };
  },
  solution: (params) => {
    const { m, n, p, q, minus, shared } = params;
    const op = minus ? '-' : '+';
    const top = sumTilesTop(params);
    if (shared) {
      return [
        { text: `The second bottom already contains $${pbr(p)}$, so only the first fraction needs changing: multiply it top and bottom by $${pbr(q)}$.` },
        { tex: frac(`${m}${pbr(q)} ${op} ${n}`, `${pbr(p)}${pbr(q)}`) },
        { text: `$${m}${pbr(q)} ${op} ${n} = ${polyTex(top)}$.` },
      ];
    }
    return [
      { text: `Multiply each fraction top and bottom by the bracket it is missing:` },
      { tex: frac(`${m}${pbr(q)} ${op} ${n}${pbr(p)}`, `${pbr(p)}${pbr(q)}`) },
      { text: `The minus takes away all of $${n}${pbr(p)} = ${polyTex([n, n * p])}$, both terms, so the top is $${polyTex(top)}$.` },
    ];
  },
};

interface SumCoefficientParams extends AddParams {
  ask: 'a' | 'b';
}

/**
 * One number of the combined top, typed: its x coefficient or its constant.
 * Difficulty 2 subtracts and asks for the constant, where the sign slip lives.
 */
const fracSumCoefficient: Generator<SumCoefficientParams> = {
  id: 'frac-sum-coefficient',
  sample: (rng, difficulty) => ({
    ...sampleAdd(rng, difficulty > 1, difficulty > 1 ? 8 : 6),
    ask: difficulty > 1 ? 'b' : rng.pick<'a' | 'b'>(['a', 'b']),
  }),
  choices: (params) => {
    const { m, n, p, q, ask } = params;
    const [a, b] = addTop(params);
    const [fa, fb] = addTop({ ...params, minus: !params.minus });
    return ask === 'a' ? intOptions(a, [fa, m * n, m, n]) : intOptions(b, [fb, m * p + n * q, -b, m * q, n * p]);
  },
  render: (params): Slide => {
    const { p, q, ask } = params;
    const [a, b] = addTop(params);
    return {
      kind: 'expression',
      prompt: [
        say(`Written as one fraction, this is $${frac('ax + b', `${pbr(p)}${pbr(q)}`)}$. Find $${ask}$.`),
        show(addTex(params)),
      ],
      lead: `${ask} =`,
      keypad: [],
      answer: String(ask === 'a' ? a : b),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { m, n, p, q, minus, ask } = params;
    const op = minus ? '-' : '+';
    const [a, b] = addTop(params);
    return [
      { text: `Over $${pbr(p)}${pbr(q)}$ the top is $${m}${pbr(q)} ${op} ${n}${pbr(p)}$.` },
      ask === 'a'
        ? { text: `The $x$ terms: $${m}x ${op} ${n}x = ${termTex(a, 1)}$, so $a = ${a}$.` }
        : { text: `The numbers: $${m} \\times ${paren(q)} ${op} ${n} \\times ${paren(p)} = ${b}$, so $b = ${b}$.` },
      { tex: frac(polyTex(addTop(params)), `${pbr(p)}${pbr(q)}`) },
    ];
  },
};

/* ================================================================
 * Level 1, lesson 4: equations with fractions
 * ================================================================ */

interface ClearParams {
  hard: boolean;
  /** Difficulty 1: m/(x + p) = n/(x + q). Difficulty 2: (x + m)/(x + p) = (x + n)/(x + q). */
  m: number;
  n: number;
  p: number;
  q: number;
}

function clearTex({ hard, m, n, p, q }: ClearParams): string {
  return hard ? `${frac(br(m), br(p))} = ${frac(br(n), br(q))}` : `${frac(String(m), br(p))} = ${frac(String(n), br(q))}`;
}

/**
 * Clear the fractions by multiplying both sides by both bottoms: each side
 * becomes its own top times the other bottom.
 */
const fracClearTiles: Generator<ClearParams> = {
  id: 'frac-clear-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const [p, q] = distinct(rng, 2, 7);
    if (hard) {
      const [m, n] = distinct(rng, 2, 7, [p, q]);
      return { hard, m, n, p, q };
    }
    const [m, n] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9], 2);
    return { hard, m, n, p, q };
  },
  render: (params): Slide => {
    const { hard, m, n, p, q } = params;
    const answer = hard ? [signed(m), signed(q), signed(n), signed(p)] : [String(m), signed(q), String(n), signed(p)];
    const slips = hard
      ? [-m, -n, -p, -q, m + q, n + p, m + 1, n - 1].filter((v) => v !== 0).map(signed)
      : [signed(-p), signed(-q), String(m + n), String(m * n)];
    return {
      kind: 'tiles',
      prompt: [
        say('Multiply both sides by both bottoms. Each side becomes its own top times the other side’s bottom.'),
        show(clearTex(params)),
      ],
      template: hard ? '(x {0})(x {1}) = (x {2})(x {3})' : '{0}(x {1}) = {2}(x {3})',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => {
    const { hard, m, n, p, q } = params;
    const left = hard ? `${pbr(m)}${pbr(q)}` : `${m}${pbr(q)}`;
    const right = hard ? `${pbr(n)}${pbr(p)}` : `${n}${pbr(p)}`;
    return [
      { text: `Multiply both sides by $${pbr(p)}${pbr(q)}$. On the left $${pbr(p)}$ cancels, and on the right $${pbr(q)}$ does:` },
      { text: `$${left} = ${right}$` },
      { text: 'Cross-multiplying is the same thing done in one step.' },
    ];
  },
};

interface EquationParams {
  hard: boolean;
  /** As in ClearParams. */
  m: number;
  n: number;
  p: number;
  q: number;
  /** The solution. */
  r: number;
}

/**
 * m/(x + p) = n/(x + q), or its difficulty-2 cousin with x on each top, built
 * from its solution so the root is whole.
 */
function sampleEquation(rng: Rng, hard: boolean): EquationParams {
  for (;;) {
    const r = nonZero(rng, 6);
    const [p, q] = distinct(rng, 2, 6, [-r]);
    if (hard) {
      // (r + m)(r + q) = (r + n)(r + p), with n found from the rest.
      const m = nonZero(rng, 6);
      if (m === p || r + m === 0) continue;
      const product = (r + m) * (r + q);
      if (product % (r + p) !== 0) continue;
      const n = product / (r + p) - r;
      // The x terms must not cancel too, or there is no single solution.
      if (n === 0 || n === q || Math.abs(n) > 9 || m + q === n + p) continue;
      return { hard, m, n, p, q, r };
    }
    const g = gcd(r + p, r + q);
    const sign = rng.sign();
    const m = (sign * (r + p)) / g;
    const n = (sign * (r + q)) / g;
    if (Math.abs(m) > 12 || Math.abs(n) > 12 || m === n) continue;
    return { hard, m, n, p, q, r };
  }
}

/** x = r from what clearing gives. */
function solveLine({ hard, m, n, p, q, r }: EquationParams): string[] {
  if (hard) {
    return [
      `${polyTex(quad(m, q))} = ${polyTex(quad(n, p))}`,
      `${termTex(m + q - n - p, 1)} = ${n * p - m * q}`,
      `x = ${r}`,
    ];
  }
  return [`${polyTex([m, m * q])} = ${polyTex([n, n * p])}`, `${termTex(m - n, 1)} = ${n * p - m * q}`, `x = ${r}`];
}

/**
 * Solve by clearing the fractions, one side at a time, then the linear
 * equation that is left. Difficulty 2 has x on both tops, and the x^2 terms
 * cancel once each side is multiplied out.
 */
const fracEquationSteps: Generator<EquationParams> = {
  id: 'frac-equation-steps',
  sample: (rng, difficulty) => sampleEquation(rng, difficulty > 1),
  render: (params): Slide => {
    const { hard, m, n, p, q, r } = params;
    const left = hard ? polyTex(quad(m, q)) : timesTex(m, br(q));
    const right = hard ? polyTex(quad(n, p)) : timesTex(n, br(p));
    const leftSlips = hard ? [polyTex(quad(m, p)), polyTex(quad(m, -q))] : [timesTex(m, br(p)), polyTex([m, q])];
    const rightSlips = hard ? [polyTex(quad(n, q)), polyTex(quad(-n, p))] : [timesTex(n, br(q)), polyTex([n, p])];
    const answer = `x = ${r}`;
    return {
      kind: 'steps',
      prompt: [
        say(
          'Solve by multiplying both sides by both bottoms: each side becomes its own top times the other bottom. Tap the part you would do **next**, then choose what it becomes.',
        ),
      ],
      start: hard ? [frac(br(m), br(p)), '=', frac(br(n), br(q))] : [fracTerm(m, br(p)), '=', fracTerm(n, br(q))],
      reductions: [
        { span: [0, 1], value: left, bank: stepBank(left, ...leftSlips) },
        { span: [2, 3], value: right, bank: stepBank(right, ...rightSlips) },
        { span: [0, 3], operator: 1, value: answer, bank: stepBank(answer, `x = ${-r}`, `x = ${r + 1}`, `x = ${r - 2}`) },
      ],
    };
  },
  solution: (params) => {
    const { p, q } = params;
    const [cleared, collected, solved] = solveLine(params);
    return [
      { text: `Multiply both sides by $${pbr(p)}${pbr(q)}$ and multiply out:` },
      { text: `$${cleared}$` },
      ...(params.hard ? [{ text: 'The $x^{2}$ terms are the same on both sides, so they cancel.' }] : []),
      { text: 'Collect $x$ on one side and the numbers on the other:' },
      { tex: collected },
      { tex: solved },
    ];
  },
};

interface SolveParams {
  kind: 'plus' | 'sum';
  m: number;
  n: number;
  p: number;
  q: number;
  /** In `plus`, the equation is m/(x + p) + n = q... reuses n and q as the constants. */
  r: number;
}

function solveTex({ kind, m, n, p, q }: SolveParams): string {
  if (kind === 'plus') return `${frac(String(m), br(p))} ${signed(n)} = ${q}`;
  return `${fracTerm(m, br(p))} ${signedFracTerm(n, br(q))} = 0`;
}

/**
 * Solve, and type x. Difficulty 1 has one fraction and a number either side;
 * difficulty 2 two fractions summing to zero.
 */
const fracEquationSolve: Generator<SolveParams> = {
  id: 'frac-equation-solve',
  sample: (rng, difficulty) => {
    for (;;) {
      const r = nonZero(rng, 7);
      if (difficulty > 1) {
        const [p, q] = distinct(rng, 2, 6, [-r]);
        // m(r + q) = -n(r + p)
        const g = gcd(r + p, r + q);
        const sign = rng.sign();
        const m = (sign * (r + p)) / g;
        const n = (-sign * (r + q)) / g;
        if (Math.abs(m) > 12 || Math.abs(n) > 12) continue;
        return { kind: 'sum', m, n, p, q, r };
      }
      const p = nonZero(rng, 6);
      if (r + p === 0) continue;
      const v = nonZero(rng, 4);
      const m = v * (r + p);
      if (m <= 0 || m > 24) continue;
      const n = nonZero(rng, 7);
      return { kind: 'plus', m, n, p, q: v + n, r };
    }
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [say('Solve.'), show(solveTex(params))],
    lead: 'x =',
    keypad: [],
    answer: String(params.r),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { kind, m, n, p, q, r } = params;
    if (kind === 'plus') {
      const v = q - n;
      return [
        { text: `Get the fraction on its own: $${frac(String(m), br(p))} = ${v}$.` },
        { text: `Multiply both sides by $${pbr(p)}$: $${m} = ${v}${pbr(p)}$, so $${br(p)} = ${m / v}$.` },
        { tex: `x = ${r}` },
      ];
    }
    return [
      { text: `Multiply both sides by $${pbr(p)}${pbr(q)}$:` },
      { tex: `${timesTex(m, br(q))} ${n < 0 ? '-' : '+'} ${timesTex(Math.abs(n), br(p))} = 0` },
      { tex: `${polyTex([m + n, m * q + n * p])} = 0` },
      { tex: `x = ${r}` },
    ];
  },
};

interface RejectParams {
  hard: boolean;
  /** Difficulty 1: (x^2 + bx)/(x + p) = c/(x + p). */
  p: number;
  /** Difficulty 2: x/(x + p) + m/(x + q) = N/((x + p)(x + q)). */
  q: number;
  roots: [number, number];
}

/** The equation, rebuilt from its roots. */
function rejectTex({ hard, p, q, roots: [u, v] }: RejectParams): string {
  if (hard) {
    // x(x + q) + m(x + p) = N  <=>  x^2 + (q + m)x + (mp - N) = (x - u)(x - v)
    const m = -(u + v) - q;
    const N = m * p - u * v;
    return chain(`&${frac('x', br(p))} ${signedFracTerm(m, br(q))}`, `&\\quad = ${fracTerm(N, `${pbr(p)}${pbr(q)}`)}`);
  }
  // x^2 + bx - c = (x - u)(x - v)
  const b = -(u + v);
  const c = -u * v;
  return `${frac(polyTex([1, b, 0]), br(p))} = ${fracTerm(c, br(p))}`;
}

/**
 * The root that has to go. Clearing the fractions multiplies by something
 * that is zero at one of the roots it produces, and that root makes the
 * original equation undefined. Sometimes both roots stand, so checking is
 * the habit and not a trick.
 */
const fracRejectFlow: Generator<RejectParams> = {
  id: 'frac-reject-flow',
  sample: (rng, difficulty) => {
    for (;;) {
      const hard = difficulty > 1;
      const [p, q] = distinct(rng, 2, 6);
      const bad = hard ? rng.pick([-p, -q]) : -p;
      const reject = rng.chance(0.7);
      const [r] = distinct(rng, 1, 7, [-p, -q]);
      const other = reject ? bad : distinct(rng, 1, 7, [-p, -q, r])[0];
      const roots = [r, other].sort((x, y) => x - y) as [number, number];
      if (roots[0] === roots[1]) continue;
      if (hard) {
        const m = -(roots[0] + roots[1]) - q;
        const N = m * p - roots[0] * roots[1];
        if (m === 0 || N === 0 || Math.abs(m) > 12 || Math.abs(N) > 40) continue;
      } else if (roots[0] * roots[1] === 0) continue;
      return { hard, p, q: hard ? q : p, roots };
    }
  },
  render: (params): Slide => {
    const { p, q, roots } = params;
    const [lo, hi] = roots;
    const zeroes = (x: number) => x === -p || x === -q;
    const finals = [`$x = ${lo}$ only`, `$x = ${hi}$ only`, `$x = ${lo}$ or $x = ${hi}$`, 'No solution'];
    const right = zeroes(lo) ? finals[1] : zeroes(hi) ? finals[0] : finals[2];
    const outcome = (label: string) =>
      label === 'No solution' ? 'So neither value is a solution.' : `So the solution is ${label.replace(' only', '')}.`;
    return {
      kind: 'flow',
      prompt: [
        say(
          `Clearing the fractions turns this into a quadratic whose solutions are $x = ${lo}$ and $x = ${hi}$. Check each against the bottoms of the original before keeping it.`,
        ),
      ],
      subject: rejectTex(params),
      steps: [
        {
          id: 'first',
          ask: `Does $x = ${lo}$ make a bottom zero?`,
          branches: [
            { label: 'Yes', to: 'second' },
            { label: 'No', to: 'second' },
          ],
        },
        {
          id: 'second',
          ask: `Does $x = ${hi}$ make a bottom zero?`,
          branches: [
            { label: 'Yes', to: 'answer' },
            { label: 'No', to: 'answer' },
          ],
        },
        {
          id: 'answer',
          ask: 'So what is the solution?',
          branches: finals.map((label) => ({ label, outcome: outcome(label) })),
        },
      ],
      answer: [zeroes(lo) ? 'Yes' : 'No', zeroes(hi) ? 'Yes' : 'No', right],
    };
  },
  solution: (params) => {
    const { hard, p, q, roots } = params;
    const bad = roots.find((x) => x === -p || x === -q);
    const bottoms = hard ? `$${br(p)}$ and $${br(q)}$` : `$${br(p)}$`;
    const steps: SolutionStep[] = [{ text: `The bottoms are ${bottoms}, which are zero at ${hard ? `$x = ${-p}$ and $x = ${-q}$` : `$x = ${-p}$`}.` }];
    if (bad === undefined) {
      steps.push({ text: `Neither $x = ${roots[0]}$ nor $x = ${roots[1]}$ is one of those, so both solutions stand.` });
    } else {
      const good = roots.find((x) => x !== bad)!;
      steps.push({
        text: `$x = ${bad}$ makes a bottom zero, so the original equation is undefined there: it was created by multiplying through by zero. Reject it.`,
      });
      steps.push({ tex: `x = ${good}` });
    }
    return steps;
  },
};

/* ================================================================
 * Level 1, lesson 5: where a fraction is zero or undefined
 * ================================================================ */

interface PoleParams {
  /** The top is x + t; the bottom's roots are `roots`. */
  t: number;
  roots: number[];
  /** Which root is asked for, when there are two. */
  which: 'smaller' | 'larger';
  left: number;
  right: number;
}

function poleBottom({ roots }: PoleParams): Poly {
  return fromRoots(roots);
}

function poleAsked({ roots, which }: PoleParams): number {
  return which === 'smaller' ? Math.min(...roots) : Math.max(...roots);
}

function poleTrack({ roots, left, right }: PoleParams): [number, number] {
  return [Math.min(...roots) - left, Math.max(...roots) + right];
}

/** A y window tall enough to show the shape without the arms setting the scale. */
const POLE_HEIGHT = 6;

/**
 * Where the fraction is undefined, found on its graph: the curve shoots off
 * where the bottom is zero. Difficulty 2 has two such places.
 */
const fracPoleSlider: Generator<PoleParams> = {
  id: 'frac-pole-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = difficulty > 1 ? distinct(rng, 2, 5) : distinct(rng, 1, 6);
      const t = nonZero(rng, 6);
      if (roots.includes(-t)) continue;
      const params: PoleParams = {
        t,
        roots,
        which: rng.pick<'smaller' | 'larger'>(['smaller', 'larger']),
        left: rng.int(1, 3),
        right: rng.int(1, 3),
      };
      const [min, max] = poleTrack(params);
      if (poleAsked(params) === restingOn(min, max) || max - min > 12) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const bottom = poleBottom(params);
    const [min, max] = poleTrack(params);
    const window = markerWindow(min, max);
    const f = (x: number) => (x + params.t) / valueAt(bottom, x);
    const two = params.roots.length > 1;
    return {
      kind: 'slider',
      prompt: [
        say(
          two
            ? `The graph is $y = ${frac(br(params.t), polyTex(bottom))}$. It is undefined at two values of $x$. Slide the marker to the ${params.which} one.`
            : `The graph is $y = ${frac(br(params.t), polyTex(bottom))}$. Slide the marker to the value of $x$ where it is undefined.`,
        ),
      ],
      min,
      max,
      step: 1,
      answer: poleAsked(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: -POLE_HEIGHT,
          yMax: POLE_HEIGHT,
          curves: [{ f, breaks: true }],
          label: 'The graph of the fraction, which shoots off where its bottom is zero',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const bottom = poleBottom(params);
    const asked = poleAsked(params);
    const two = params.roots.length > 1;
    return [
      { text: 'A fraction is undefined where its bottom is zero, because nothing can be divided by zero.' },
      two
        ? { text: `$${polyTex(bottom)} = ${params.roots.map((r) => pbr(-r)).join('')}$, which is zero at $x = ${Math.min(...params.roots)}$ and $x = ${Math.max(...params.roots)}$.` }
        : { text: `$${polyTex(bottom)} = 0$ at $x = ${asked}$.` },
      { text: `On the graph the curve shoots off there, up one side and down the other. The ${two ? `${params.which} is ` : 'answer is '}$x = ${asked}$.` },
    ];
  },
};

interface ZeroParams {
  /** The top is (x + t), times (x + s) at difficulty 2. */
  t: number;
  /** A factor on top and bottom: the hole. Null at difficulty 1. */
  s: number | null;
  /** The bottom is (x + u), times (x + s) at difficulty 2. */
  u: number;
  left: number;
  right: number;
}

function zeroTop({ t, s }: ZeroParams): Poly {
  return s === null ? lin(t) : quad(s, t);
}

function zeroBottom({ u, s }: ZeroParams): Poly {
  return s === null ? lin(u) : quad(s, u);
}

function zeroTrack({ t, s, u, left, right }: ZeroParams): [number, number] {
  const marks = [-t, -u, ...(s === null ? [] : [-s])];
  return [Math.min(...marks) - left, Math.max(...marks) + right];
}

/**
 * Where the fraction is zero: where the top is, as long as the bottom is not.
 * At difficulty 2 the top is zero twice, and one of those is a hole, where the
 * bottom is zero as well.
 */
const fracZeroSlider: Generator<ZeroParams> = {
  id: 'frac-zero-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const [t, u, s] = distinct(rng, 3, 5);
      const params: ZeroParams = { t, u, s: difficulty > 1 ? s : null, left: rng.int(1, 2), right: rng.int(1, 2) };
      const [min, max] = zeroTrack(params);
      if (-t === restingOn(min, max) || max - min > 12) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const top = zeroTop(params);
    const bottom = zeroBottom(params);
    const [min, max] = zeroTrack(params);
    const window = markerWindow(min, max);
    const { s, t, u } = params;
    const hole = s === null ? [] : [{ x: -s, y: (-s + t) / (-s + u), hollow: true }];
    return {
      kind: 'slider',
      prompt: [
        say(`The graph is $y = ${frac(polyTex(top), polyTex(bottom))}$. Slide the marker to the value of $x$ where it equals zero.`),
      ],
      min,
      max,
      step: 1,
      answer: -t,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: -POLE_HEIGHT,
          yMax: POLE_HEIGHT,
          curves: [{ f: (x) => valueAt(top, x) / valueAt(bottom, x), breaks: true }],
          marks: hole.filter((mark) => Math.abs(mark.y) < POLE_HEIGHT),
          label: 'The graph of the fraction',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { s, t, u } = params;
    if (s === null) {
      return [
        { text: 'A fraction is zero where its top is zero and its bottom is not.' },
        { text: `The top, $${br(t)}$, is zero at $x = ${-t}$, and the bottom is $${-t + u}$ there, so $x = ${-t}$.` },
      ];
    }
    return [
      { text: `The top is $${pbr(s)}${pbr(t)}$, zero at $x = ${-s}$ and at $x = ${-t}$.` },
      {
        text: `But the bottom, $${pbr(s)}${pbr(u)}$, is also zero at $x = ${-s}$, so the fraction is undefined there, not zero — the hollow dot on the graph is that gap.`,
      },
      { text: `So it is zero only at $x = ${-t}$.` },
    ];
  },
};

interface UndefinedParams {
  top: Poly;
  roots: [number, number];
  expanded: boolean;
}

/** x = a or x = b, in order. */
function orTex(values: number[]): string {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted.map((v) => `x = ${v}`).join(' \\text{ or } ');
}

/**
 * Where is it undefined? The bottom's roots, not their negatives, and not the
 * top's. Difficulty 2 gives the bottom multiplied out.
 */
const fracUndefinedWhich: Generator<UndefinedParams> = {
  id: 'frac-undefined-which',
  sample: (rng, difficulty) => {
    for (;;) {
      const roots = distinct(rng, 2, 6) as [number, number];
      if (roots[0] === -roots[1]) continue;
      const topRoot = distinct(rng, 1, 6, [...roots, -roots[0], -roots[1]])[0];
      const top = difficulty > 1 && rng.chance(0.5) ? fromRoots([topRoot, distinct(rng, 1, 6, [...roots, topRoot])[0]]) : lin(-topRoot);
      return { top, roots, expanded: difficulty > 1 };
    }
  },
  render: ({ top, roots, expanded }): Slide => {
    const bottom = expanded ? polyTex(fromRoots(roots)) : roots.map((r) => pbr(-r)).join('');
    const topRoots = Array.from({ length: 13 }, (_, i) => i - 6).filter((x) => valueAt(top, x) === 0);
    return choiceSlide(
      [say('For which values of $x$ is this fraction undefined?'), show(frac(polyTex(top), bottom))],
      options(
        { tex: orTex(roots) },
        { tex: orTex(roots.map((r) => -r)) },
        { tex: orTex(topRoots) },
        { tex: orTex([...roots, ...topRoots]) },
      ),
    );
  },
  solution: ({ top, roots, expanded }) => [
    { text: 'A fraction is undefined where its bottom is zero. What the top does there does not matter.' },
    ...(expanded ? [{ text: `Factorise the bottom: $${polyTex(fromRoots(roots))} = ${roots.map((r) => pbr(-r)).join('')}$.` }] : []),
    { text: `Each bracket is zero when $x$ is the number that cancels it: $${orTex(roots)}$.` },
    { text: `Where the top, $${polyTex(top)}$, is zero, the fraction is zero, which is a different question.` },
  ],
};

interface HoleParams {
  s: number;
  t: number;
  /** The bottom is (x + s), times (x + u) at difficulty 2. */
  u: number | null;
}

function holeValue({ s, t, u }: HoleParams): number {
  return u === null ? -s + t : (-s + t) / (-s + u);
}

/**
 * A fraction undefined at one point that cancels to something defined there:
 * the value it would have had, found from the simplified form.
 */
const fracHoleValue: Generator<HoleParams> = {
  id: 'frac-hole-value',
  sample: (rng, difficulty) => {
    for (;;) {
      if (difficulty > 1) {
        const [s, t, u] = distinct(rng, 3, 8);
        const params = { s, t, u };
        const value = holeValue(params);
        if (!Number.isInteger(value) || value === 0 || value === 1) continue;
        return params;
      }
      const [s, t] = distinct(rng, 2, 9);
      return { s, t, u: null };
    }
  },
  render: (params): Slide => {
    const { s, t, u } = params;
    const bottom = u === null ? lin(s) : quad(s, u);
    return {
      kind: 'expression',
      prompt: [
        show(frac(polyTex(quad(s, t)), polyTex(bottom))),
        say(
          `This is undefined at $x = ${-s}$, because the bottom is zero there. Everywhere else it equals its simplified form. What value does the simplified form give at $x = ${-s}$?`,
        ),
      ],
      lead: '\\text{value} =',
      keypad: [],
      answer: String(holeValue(params)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { s, t, u } = params;
    const simplified = u === null ? br(t) : frac(br(t), br(u));
    const at = u === null ? `${-s} ${signed(t)}` : frac(`${-s} ${signed(t)}`, `${-s} ${signed(u)}`);
    return [
      { text: `Factorise and cancel $${pbr(s)}$:` },
      { tex: `${frac(`${pbr(s)}${pbr(t)}`, u === null ? br(s) : `${pbr(s)}${pbr(u)}`)} = ${simplified}` },
      { text: `At $x = ${-s}$ the simplified form is defined:` },
      { tex: `${at} = ${holeValue(params)}` },
      { text: 'On the graph this is a single missing point, a hole, rather than a place where the curve shoots off.' },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 1: two linear factors
 * ================================================================ */

interface Split {
  /** The fraction is A/(x + a) + B/(x + b), added up. */
  A: number;
  B: number;
  a: number;
  b: number;
  /** The bottom shown multiplied out, to be factorised first. */
  expanded: boolean;
}

/** A(x + b) + B(x + a). */
const splitTop = ({ A, B, a, b }: Split): Poly => [A + B, A * b + B * a];

function splitBottomTex({ a, b, expanded }: Split): string {
  return expanded ? polyTex(quad(a, b)) : `${pbr(a)}${pbr(b)}`;
}

const splitFractionTex = (params: Split): string => frac(polyTex(splitTop(params)), splitBottomTex(params));

const lettersTex = ({ a, b }: { a: number; b: number }): string => `${frac('A', br(a))} + ${frac('B', br(b))}`;

const splitAnswerTex = ({ A, B, a, b }: Split): string => splitTex([
  [A, br(a)],
  [B, br(b)],
]);

function sampleSplit(rng: Rng, difficulty: number): Split {
  const hard = difficulty > 1;
  const [a, b] = distinct(rng, 2, hard ? 6 : 5);
  const [A, B] = distinct(rng, 2, hard ? 7 : 5);
  return { A, B, a, b, expanded: hard };
}

/**
 * Which split adds back up to the fraction? The distractors swap the
 * numerators, flip a sign, or flip both.
 */
const fracSplitWhich: Generator<Split> = {
  id: 'frac-split-which',
  sample: sampleSplit,
  render: (params): Slide => {
    const { A, B, a, b } = params;
    return choiceSlide(
      [say('Which of these is this fraction split into partial fractions?'), show(splitFractionTex(params))],
      firstFour(
        splitAnswerTex(params),
        splitTex([
          [B, br(a)],
          [A, br(b)],
        ]),
        splitTex([
          [A, br(a)],
          [-B, br(b)],
        ]),
        splitTex([
          [-A, br(a)],
          [-B, br(b)],
        ]),
        splitTex([
          [-A, br(a)],
          [B, br(b)],
        ]),
      ),
    );
  },
  solution: (params) => {
    const { A, B, a, b, expanded } = params;
    return [
      ...(expanded ? [{ text: `Factorise the bottom: $${polyTex(quad(a, b))} = ${pbr(a)}${pbr(b)}$.` }] : []),
      { text: 'Add each option back up and compare tops, or find each numerator by cover-up:' },
      { text: `Cover $${pbr(a)}$ and put $x = ${-a}$ into the rest: $${frac(String(valueAt(splitTop(params), -a)), String(b - a))} = ${A}$.` },
      { text: `Cover $${pbr(b)}$ and put $x = ${-b}$: $${frac(String(valueAt(splitTop(params), -b)), String(a - b))} = ${B}$.` },
      { tex: splitAnswerTex(params) },
    ];
  },
};

interface CoverParams extends Split {
  ask: 'A' | 'B';
}

/** The asked numerator, its own bracket's constant and the other one's. */
function coverSides({ A, B, a, b, ask }: CoverParams) {
  return ask === 'A' ? { k: A, own: a, other: b } : { k: B, own: b, other: a };
}

function coverSolution(params: CoverParams): SolutionStep[] {
  const { k, own, other } = coverSides(params);
  const top = splitTop(params);
  const t = valueAt(top, -own);
  return [
    ...(params.expanded ? [{ text: `Factorise the bottom: $${polyTex(quad(params.a, params.b))} = ${pbr(params.a)}${pbr(params.b)}$.` }] : []),
    { text: `Multiply both sides by the bottom: $${polyTex(top)} = A${pbr(params.b)} + B${pbr(params.a)}$.` },
    { text: `Put $x = ${-own}$, which makes $${pbr(own)}$ zero, so the other numerator's term vanishes:` },
    { tex: `${t} = ${params.ask} \\times ${paren(other - own)}, \\quad ${params.ask} = ${k}` },
    { text: `That is cover-up: cover $${pbr(own)}$ in the fraction and put $x = ${-own}$ into what is left.` },
  ];
}

/** One numerator, typed. Difficulty 2 gives the bottom multiplied out. */
const fracCover: Generator<CoverParams> = {
  id: 'frac-cover',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty), ask: rng.pick<'A' | 'B'>(['A', 'B']) }),
  choices: (params) => {
    const { k, own, other } = coverSides(params);
    const top = splitTop(params);
    const t = valueAt(top, -own);
    return intOptions(k, [-k, t, valueAt(top, own) / (own + other), t / (own + other)]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      show(splitFractionTex(params)),
      say(`This splits as $${lettersTex(params)}$. Find $${params.ask}$.`),
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: String(coverSides(params).k),
    domain: 'real',
    mode: 'exact',
  }),
  solution: coverSolution,
};

/**
 * Both numerators by cover-up as a tree: the top and the other bracket at each
 * root of the bottom, then each division.
 */
const fracSplitTree: Generator<Split> = {
  id: 'frac-split-tree',
  sample: sampleSplit,
  render: (params): Slide => {
    const { A, B, a, b } = params;
    const top = splitTop(params);
    const answer = [valueAt(top, -a), b - a, valueAt(top, -b), a - b, A, B];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${lettersTex(params)}$ by cover-up. Top row: the top of the fraction at $x = ${-a}$, then $${br(b)}$ there; the same two at $x = ${-b}$, with $${br(a)}$. Below them, $A$ and $B$.`,
        ),
      ],
      expression: splitFractionTex(params),
      nodes: [
        { id: 'top-a', from: [] },
        { id: 'rest-a', from: [] },
        { id: 'top-b', from: [] },
        { id: 'rest-b', from: [] },
        { id: 'A', from: ['top-a', 'rest-a'] },
        { id: 'B', from: ['top-b', 'rest-b'] },
      ],
      bank: numberBank(answer, [-A, -B, a + b, valueAt(top, a)]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { A, B, a, b } = params;
    const top = splitTop(params);
    return [
      ...(params.expanded ? [{ text: `Factorise the bottom: $${polyTex(quad(a, b))} = ${pbr(a)}${pbr(b)}$.` }] : []),
      { text: `At $x = ${-a}$ the top is $${valueAt(top, -a)}$ and $${br(b)}$ is $${b - a}$, so $A = ${A}$.` },
      { text: `At $x = ${-b}$ the top is $${valueAt(top, -b)}$ and $${br(a)}$ is $${a - b}$, so $B = ${B}$.` },
      { tex: `= ${splitAnswerTex(params)}` },
    ];
  },
};

/** The split placed as tiles, the (x + a) part first. */
const fracSplitTiles: Generator<Split> = {
  id: 'frac-split-tiles',
  sample: sampleSplit,
  render: (params): Slide => {
    const { A, B, a, b } = params;
    const answer = [fracTerm(A, br(a)), signedFracTerm(B, br(b))];
    return {
      kind: 'tiles',
      prompt: [
        say(`Split into partial fractions, the $${pbr(a)}$ part first.`),
        show(splitFractionTex(params)),
      ],
      template: '{0} {1}',
      bank: tileBank(answer, [fracTerm(B, br(a)), signedFracTerm(A, br(b)), fracTerm(-A, br(a)), signedFracTerm(-B, br(b))]),
      answer,
    };
  },
  solution: (params) => coverSolution({ ...params, ask: 'A' }).concat(
    { text: `The same with $x = ${-params.b}$ gives $B = ${params.B}$.` },
    { tex: splitAnswerTex(params) },
  ),
};

/** cA + dB, as the learner reads it. */
function lettersSum(c: number, d: number): string {
  const one = (k: number, letter: string) => (k === 1 ? letter : k === -1 ? `-${letter}` : `${k}${letter}`);
  if (d === 0) return one(c, 'A');
  return `${one(c, 'A')} ${d < 0 ? '-' : '+'} ${one(Math.abs(d), 'B')}`;
}

/**
 * Comparing coefficients, worked as a tree: the two equations the top gives,
 * then eliminating B, then A, then B.
 */
const fracCompareTree: Generator<Split> = {
  id: 'frac-compare-tree',
  sample: (rng, difficulty) => ({ ...sampleSplit(rng, difficulty), expanded: false }),
  render: (params): Slide => {
    const { A, B, a, b } = params;
    const [p, q] = splitTop(params);
    const answer = [p, q, (b - a) * A, A, B];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Compare coefficients in $${polyTex(splitTop(params))} = A${pbr(b)} + B${pbr(a)}$. Top row: what the $x$ terms say $A + B$ is, then what the numbers say $${lettersSum(b, a)}$ is. Next: the second minus $${paren(a)}$ times the first, which is $${lettersSum(b - a, 0)}$. Then $A$, and then $B$.`,
        ),
      ],
      expression: splitFractionTex(params),
      nodes: [
        { id: 'xs', from: [] },
        { id: 'numbers', from: [] },
        { id: 'eliminated', from: ['xs', 'numbers'] },
        { id: 'A', from: ['eliminated'] },
        { id: 'B', from: ['xs', 'A'] },
      ],
      bank: numberBank(answer, [-A, -B, q + a * p, p - B, (a - b) * A]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { A, B, a, b } = params;
    const [p, q] = splitTop(params);
    return [
      { text: `Multiply out the right: $A${pbr(b)} + B${pbr(a)} = (A + B)x + (${lettersSum(b, a)})$.` },
      { tex: chain(`A + B &= ${p}`, `${lettersSum(b, a)} &= ${q}`) },
      { text: `Take $${paren(a)}$ times the first from the second, and $B$ goes: $${lettersSum(b - a, 0)} = ${q - a * p}$, so $A = ${A}$.` },
      { text: `Then $B = ${p} - ${paren(A)} = ${B}$.` },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 2: three linear factors
 * ================================================================ */

const LETTERS = ['A', 'B', 'C'];

interface ThreeParams {
  K: number[];
  c: number[];
  expanded: boolean;
  /** Which numerator a single-numerator question asks for. */
  ask: number;
}

function threeTop({ K, c }: ThreeParams): Poly {
  return K.reduce<Poly>((sum, k, i) => {
    const others = c.filter((_, j) => j !== i);
    return addPoly(sum, scalePoly(quad(others[0], others[1]), k));
  }, [0]);
}

function threeBottomTex({ c, expanded }: ThreeParams): string {
  return expanded ? polyTex(fromRoots(c.map((v) => -v))) : c.map(pbr).join('');
}

const threeFractionTex = (params: ThreeParams): string => frac(polyTex(threeTop(params)), threeBottomTex(params));

const threeLettersTex = ({ c }: ThreeParams): string => c.map((v, i) => frac(LETTERS[i], br(v))).join(' + ');

const threeSplitTex = (K: number[], c: number[]): string => splitTex(K.map((k, i) => [k, br(c[i])]));

function sampleThree(rng: Rng, difficulty: number): ThreeParams {
  return {
    K: distinct(rng, 3, 4),
    c: distinct(rng, 3, 4),
    expanded: difficulty > 1,
    ask: rng.int(0, 2),
  };
}

/** The values cover-up needs for the asked numerator. */
function threeCover(params: ThreeParams) {
  const { K, c, ask } = params;
  const own = c[ask];
  const [o1, o2] = c.filter((_, j) => j !== ask);
  const r = -own;
  const t = valueAt(threeTop(params), r);
  const u = r + o1;
  const v = r + o2;
  return { own, o1, o2, r, t, u, v, w: u * v, k: K[ask], letter: LETTERS[ask] };
}

function threeSolution(params: ThreeParams): SolutionStep[] {
  const { own, o1, o2, r, t, u, v, w, k, letter } = threeCover(params);
  return [
    ...(params.expanded
      ? [{ text: `The bottom factorises, by the factor theorem: $${threeBottomTex(params)} = ${params.c.map(pbr).join('')}$.` }]
      : []),
    { text: `To find $${letter}$, cover $${pbr(own)}$ and put $x = ${r}$ into the rest. The top there is $${t}$.` },
    { tex: chain(`${letter} &= ${frac(String(t), `${paren(u)} \\times ${paren(v)}`)}`, `&= ${frac(String(t), String(w))} = ${k}`) },
    { text: `The other two go the same way, with $x$ making $${pbr(o1)}$ or $${pbr(o2)}$ zero.` },
  ];
}

/**
 * One of three numerators by cover-up, as a tree: the top and the two other
 * brackets at the root, the product of the brackets, then the numerator.
 */
const fracThreeCoverTree: Generator<ThreeParams> = {
  id: 'frac-three-cover-tree',
  sample: sampleThree,
  render: (params): Slide => {
    const { own, o1, o2, r, t, u, v, w, k, letter } = threeCover(params);
    const answer = [t, u, v, w, k];
    return {
      kind: 'tree',
      prompt: [
        say(
          `This splits as $${threeLettersTex(params)}$. To find $${letter}$, cover $${pbr(own)}$ and put $x = ${r}$ into the rest. Top row: the top at $x = ${r}$, then $${br(o1)}$ and $${br(o2)}$ there. Below: the two brackets multiplied, then $${letter}$.`,
        ),
      ],
      expression: threeFractionTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'first', from: [] },
        { id: 'second', from: [] },
        { id: 'product', from: ['first', 'second'] },
        { id: 'numerator', from: ['top', 'product'] },
      ],
      bank: numberBank(answer, [-k, -w, u + v, -r + o1, -r + o2]),
      answer: answer.map(String),
    };
  },
  solution: threeSolution,
};

/**
 * The same cover-up as a line of working: each bracket at the root, their
 * product, then the division.
 */
const fracThreeSteps: Generator<ThreeParams> = {
  id: 'frac-three-steps',
  sample: sampleThree,
  render: (params): Slide => {
    const { own, o1, o2, r, t, u, v, w, k, letter } = threeCover(params);
    return {
      kind: 'steps',
      prompt: [
        show(threeFractionTex(params)),
        say(
          `This splits as $${threeLettersTex(params)}$. To find $${letter}$, cover $${pbr(own)}$ and put $x = ${r}$ into the rest: the top is $${t}$ there. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [String(t), '\\div', `(${r} ${signed(o1)})`, `(${r} ${signed(o2)})`],
      reductions: [
        { span: [2, 3], value: `(${u})`, bank: stepBank(`(${u})`, `(${-r + o1})`, `(${-u})`, `(${r - o1})`) },
        { span: [3, 4], value: `(${v})`, bank: stepBank(`(${v})`, `(${-r + o2})`, `(${-v})`, `(${r - o2})`) },
        { span: [2, 4], value: String(w), bank: stepBank(String(w), String(-w), String(u + v)) },
        { span: [0, 3], operator: 1, value: String(k), bank: stepBank(String(k), String(-k), String(k + 1), String(t + w)) },
      ],
    };
  },
  solution: threeSolution,
};

/** All three numerators placed. */
const fracThreeTiles: Generator<ThreeParams> = {
  id: 'frac-three-tiles',
  sample: sampleThree,
  render: (params): Slide => {
    const { K, c } = params;
    const top = threeTop(params);
    return {
      kind: 'tiles',
      prompt: [
        say(`Split into $${threeLettersTex(params)}$. Place $A$, $B$ and $C$.`),
        show(threeFractionTex(params)),
      ],
      template: 'A = {0}, \\quad B = {1}, \\quad C = {2}',
      bank: numberBank(K, [...K.map((k) => -k), valueAt(top, -c[0]), valueAt(top, -c[1])]),
      answer: K.map(String),
    };
  },
  solution: (params) => {
    const { K, c } = params;
    const top = threeTop(params);
    return [
      ...(params.expanded
        ? [{ text: `The bottom factorises, by the factor theorem: $${threeBottomTex(params)} = ${c.map(pbr).join('')}$.` }]
        : []),
      ...c.map((own, i) => {
        const [o1, o2] = c.filter((_, j) => j !== i);
        return {
          text: `Cover $${pbr(own)}$, put $x = ${-own}$: $${LETTERS[i]} = ${frac(String(valueAt(top, -own)), `${paren(o1 - own)} \\times ${paren(o2 - own)}`)} = ${K[i]}$.`,
        };
      }),
      { tex: threeSplitTex(K, c) },
    ];
  },
};

/** Which three-part split is right? */
const fracThreeWhich: Generator<ThreeParams> = {
  id: 'frac-three-which',
  sample: sampleThree,
  render: (params): Slide => {
    const { K, c } = params;
    const [A, B, C] = K;
    return choiceSlide(
      [say('Which of these is this fraction split into partial fractions?'), show(threeFractionTex(params))],
      firstFour(
        threeSplitTex(K, c),
        threeSplitTex([B, A, C], c),
        threeSplitTex([A, B, -C], c),
        threeSplitTex([-A, B, C], c),
        threeSplitTex([A, C, B], c),
      ),
    );
  },
  solution: (params) => [
    { text: 'Find one numerator by cover-up and rule out every option that disagrees; a second settles it.' },
    ...threeSolution(params),
    { tex: threeSplitTex(params.K, params.c) },
  ],
};

/* ================================================================
 * Level 2, lesson 3: repeated factors
 * ================================================================ */

interface RepeatedParams {
  A: number;
  B: number;
  a: number;
  /** A third part C/(x + b) at difficulty 2; null at difficulty 1. */
  C: number | null;
  b: number | null;
}

function repeatedTop({ A, B, a, C, b }: RepeatedParams): Poly {
  if (C === null || b === null) return [A, A * a + B];
  return addPoly(addPoly(scalePoly(quad(a, b), A), scalePoly(lin(b), B)), scalePoly(quad(a, a), C));
}

function repeatedBottomTex({ a, b }: RepeatedParams): string {
  return b === null ? `${pbr(a)}^{2}` : `${pbr(a)}^{2}${pbr(b)}`;
}

const repeatedFractionTex = (params: RepeatedParams): string => frac(polyTex(repeatedTop(params)), repeatedBottomTex(params));

function repeatedLettersTex({ a, b }: RepeatedParams): string {
  const pair = `${frac('A', br(a))} + ${frac('B', `${pbr(a)}^{2}`)}`;
  return b === null ? pair : `${pair} + ${frac('C', br(b))}`;
}

function repeatedSplitTex({ A, B, a, C, b }: RepeatedParams): string {
  const parts: [number, string][] = [
    [A, br(a)],
    [B, `${pbr(a)}^{2}`],
  ];
  if (C !== null && b !== null) parts.push([C, br(b)]);
  return splitTex(parts);
}

function sampleRepeated(rng: Rng, difficulty: number): RepeatedParams {
  if (difficulty > 1) {
    const [a, b] = distinct(rng, 2, 4);
    return { A: nonZero(rng, 4), B: nonZero(rng, 4), C: nonZero(rng, 4), a, b };
  }
  return { A: nonZero(rng, 6), B: nonZero(rng, 9), a: nonZero(rng, 6), C: null, b: null };
}

/** Which form does the split take? The repeated bracket needs both powers. */
const fracRepeatedForm: Generator<RepeatedParams> = {
  id: 'frac-repeated-form',
  sample: sampleRepeated,
  render: (params): Slide => {
    const { a, b } = params;
    const single = br(a);
    const square = `${pbr(a)}^{2}`;
    const opts =
      b === null
        ? firstFour(
            repeatedLettersTex(params),
            `${frac('A', single)} + ${frac('B', single)}`,
            `${frac('A', square)} + ${frac('B', square)}`,
            frac('A', square),
          )
        : firstFour(
            repeatedLettersTex(params),
            `${frac('A', square)} + ${frac('B', br(b))}`,
            `${frac('A', single)} + ${frac('B', br(b))}`,
            `${frac('A', single)} + ${frac('B', single)} + ${frac('C', br(b))}`,
          );
    return choiceSlide([say('Which form does the split of this fraction take?'), show(repeatedFractionTex(params))], opts);
  },
  solution: (params) => [
    {
      text: `A repeated bracket $${pbr(params.a)}^{2}$ needs a part over each power: $${frac('A', br(params.a))}$ and $${frac('B', `${pbr(params.a)}^{2}`)}$.`,
    },
    ...(params.b === null ? [] : [{ text: `The other bracket, $${pbr(params.b)}$, gets its own part as usual.` }]),
    { tex: repeatedLettersTex(params) },
    { text: 'Two parts over the same $x + a$ would add up to one, which cannot make every top; one over the square alone cannot make an $x$ term.' },
  ],
};

/** The numerators, by cover-up where it works and by comparing where it does not. */
function repeatedValues(params: RepeatedParams) {
  const { a, b } = params;
  const top = repeatedTop(params);
  if (b === null) return { top, atA: valueAt(top, -a), atB: 0, dA: 0, dB: 0 };
  return { top, atA: valueAt(top, -a), dA: b - a, atB: valueAt(top, -b), dB: (a - b) * (a - b) };
}

function repeatedSolution(params: RepeatedParams): SolutionStep[] {
  const { A, B, C, a, b } = params;
  const { top, atA, dA, atB, dB } = repeatedValues(params);
  if (b === null || C === null) {
    return [
      { text: `Multiply both sides by $${pbr(a)}^{2}$: $${polyTex(top)} = A${pbr(a)} + B$.` },
      { text: `The $x$ terms give $A = ${A}$.` },
      { text: `The numbers give $${lettersSum(a, 0)} + B = ${top[1]}$, so $B = ${top[1]} - ${paren(a * A)} = ${B}$.` },
      { text: `Or put $x = ${-a}$, which clears $A$ and leaves $B$ at once.` },
      { tex: repeatedSplitTex(params) },
    ];
  }
  return [
    { text: `Multiply both sides by the bottom: $${polyTex(top)} = A${pbr(a)}${pbr(b)} + B${pbr(b)} + C${pbr(a)}^{2}$.` },
    { text: `Put $x = ${-a}$: only $B$ survives, $${atA} = ${paren(dA)}B$, so $B = ${B}$.` },
    { text: `Put $x = ${-b}$: only $C$ survives, $${atB} = ${dB}C$, so $C = ${C}$.` },
    { text: `No value of $x$ isolates $A$, so compare the $x^{2}$ terms: $A + C = ${top[0]}$, so $A = ${A}$.` },
    { tex: repeatedSplitTex(params) },
  ];
}

/** Every numerator placed. */
const fracRepeatedTiles: Generator<RepeatedParams> = {
  id: 'frac-repeated-tiles',
  sample: sampleRepeated,
  render: (params): Slide => {
    const { A, B, C, a } = params;
    const { top } = repeatedValues(params);
    const three = C !== null;
    const answer = three ? [A, B, C] : [A, B];
    return {
      kind: 'tiles',
      prompt: [say(`Split into $${repeatedLettersTex(params)}$. Place the numerators.`), show(repeatedFractionTex(params))],
      template: three ? 'A = {0}, \\quad B = {1}, \\quad C = {2}' : 'A = {0}, \\quad B = {1}',
      bank: numberBank(answer, [-A, -B, top[top.length - 1], top[0] - (C ?? 0) - 1, A * a]),
      answer: answer.map(String),
    };
  },
  solution: repeatedSolution,
};

/**
 * The numerators as a tree. Difficulty 1 compares coefficients: A from the x
 * terms, then what A(x + a) puts into the numbers, then B. Difficulty 2
 * substitutes for B and C, then compares x^2 terms for A.
 */
const fracRepeatedTree: Generator<RepeatedParams> = {
  id: 'frac-repeated-tree',
  sample: sampleRepeated,
  render: (params): Slide => {
    const { A, B, C, a, b } = params;
    const { top, atA, dA, atB, dB } = repeatedValues(params);
    if (b === null || C === null) {
      const answer = [A, a * A, B];
      return {
        kind: 'tree',
        prompt: [
          say(
            `Match $${polyTex(top)} = A${pbr(a)} + B$. First: $A$, from the $x$ terms. Next: the number $A${pbr(a)}$ puts in, $${lettersSum(a, 0)}$. Last: $B$, whatever the numbers still need.`,
          ),
        ],
        expression: repeatedFractionTex(params),
        nodes: [
          { id: 'A', from: [] },
          { id: 'aA', from: ['A'] },
          { id: 'B', from: ['aA'] },
        ],
        bank: numberBank(answer, [-A, -a * A, top[1] + a * A, -B]),
        answer: answer.map(String),
      };
    }
    const answer = [atA, dA, atB, dB, B, C, A];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${repeatedLettersTex(params)}$. Top row: the top at $x = ${-a}$ and $${br(b)}$ there; the top at $x = ${-b}$ and $${pbr(a)}^{2}$ there. Below: $B$ and $C$. Last: $A$, from the $x^{2}$ terms, $A + C = ${top[0]}$.`,
        ),
      ],
      expression: repeatedFractionTex(params),
      nodes: [
        { id: 'top-a', from: [] },
        { id: 'rest-a', from: [] },
        { id: 'top-b', from: [] },
        { id: 'rest-b', from: [] },
        { id: 'B', from: ['top-a', 'rest-a'] },
        { id: 'C', from: ['top-b', 'rest-b'] },
        { id: 'A', from: ['C'] },
      ],
      bank: numberBank(answer, [-B, -C, top[0] + C, a - b]),
      answer: answer.map(String),
    };
  },
  solution: repeatedSolution,
};

interface RepeatedValueParams extends RepeatedParams {
  ask: 'B' | 'C';
}

function repeatedAsked(params: RepeatedValueParams): number {
  return params.ask === 'C' && params.C !== null ? params.C : params.B;
}

/** One numerator by cover-up, typed: the one over the square, or the other bracket's. */
const fracRepeatedValue: Generator<RepeatedValueParams> = {
  id: 'frac-repeated-value',
  sample: (rng, difficulty) => ({
    ...sampleRepeated(rng, difficulty),
    ask: difficulty > 1 ? rng.pick<'B' | 'C'>(['B', 'C']) : 'B',
  }),
  choices: (params) => {
    const k = repeatedAsked(params);
    const { top, atA, atB, dA } = repeatedValues(params);
    return intOptions(k, [-k, params.ask === 'C' ? atB : atA, params.A, top[0], dA === 0 ? k + params.a : atA / -dA]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      show(repeatedFractionTex(params)),
      say(`This splits as $${repeatedLettersTex(params)}$. Find $${params.ask}$.`),
    ],
    lead: `${params.ask} =`,
    keypad: [],
    answer: String(repeatedAsked(params)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: repeatedSolution,
};

/* ================================================================
 * Level 2, lesson 4: improper fractions
 * ================================================================ */

interface ImproperParams extends Split {
  /** The whole part. */
  Q: Poly;
  /** For the flow: a fraction with no whole part at all. */
  proper: boolean;
}

function improperTop(params: ImproperParams): Poly {
  const rest = splitTop(params);
  return params.proper ? rest : addPoly(mulPoly(params.Q, quad(params.a, params.b)), rest);
}

/**
 * Divide the top by (x + a)(x + b) with `divideBy`, one bracket at a time:
 * N = (x + a)q1 + r1 and q1 = (x + b)q2 + r2, so the quotient is q2 and the
 * remainder is r2(x + a) + r1. Computed from the top alone, never from the
 * parameters that built it, so a test can compare the two.
 */
export function divideByPair(top: Poly, a: number, b: number): { quotient: Poly; remainder: Poly } {
  const first = divideBy(top, -a);
  const second = divideBy(first.quotient, -b);
  return { quotient: second.quotient, remainder: addPoly(scalePoly(lin(a), second.remainder), [first.remainder]) };
}

function sampleImproper(rng: Rng, difficulty: number, proper = false): ImproperParams {
  const hard = difficulty > 1;
  const [a, b] = distinct(rng, 2, hard ? 4 : 5);
  const [A, B] = distinct(rng, 2, hard ? 5 : 4);
  const Q = hard ? [rng.pick([1, 1, 2]), nonZero(rng, 5)] : [rng.pick([1, 2, 3, -1, -2])];
  return { A, B, a, b, Q, expanded: false, proper };
}

const improperBottom = ({ a, b }: Split): string => `${pbr(a)}${pbr(b)}`;

const improperFractionTex = (params: ImproperParams): string => frac(polyTex(improperTop(params)), improperBottom(params));

/** The whole part and the proper fraction left over. */
function improperDivided(params: ImproperParams): string {
  return `${polyTex(params.Q)} + ${frac(polyTex(splitTop(params)), improperBottom(params))}`;
}

function improperSplitTex(params: ImproperParams): string {
  return `${polyTex(params.Q)} ${signedFracTerm(params.A, br(params.a))} ${signedFracTerm(params.B, br(params.b))}`;
}

function improperSolution(params: ImproperParams): SolutionStep[] {
  const { Q, a, b } = params;
  const top = improperTop(params);
  const { quotient, remainder } = divideByPair(top, a, b);
  return [
    { text: `The top has degree $${top.length - 1}$ and the bottom degree $2$, so divide first. The bottom is $${polyTex(quad(a, b))}$.` },
    { tex: chain(`&${polyTex(top)}`, `=\\;&(${polyTex(Q)})(${polyTex(quad(a, b))})`, `&\\quad + (${polyTex(remainder)})`) },
    { text: `So the whole part is $${polyTex(quotient)}$, and $${frac(polyTex(remainder), improperBottom(params))}$ is left to split.` },
    { text: `Cover-up on that gives $A = ${params.A}$ over $${pbr(a)}$ and $B = ${params.B}$ over $${pbr(b)}$:` },
    { tex: improperSplitTex(params) },
  ];
}

/** Wrong whole parts: the sign flipped, and a coefficient read straight off the top. */
function wholeSlips(params: ImproperParams): string[] {
  const { Q } = params;
  const top = improperTop(params);
  if (Q.length === 1) return [String(-Q[0]), termTex(Q[0], 1), String(Q[0] + 1)];
  return [polyTex([Q[0], -Q[1]]), polyTex([Q[0], top[1]]), polyTex([Q[0], Q[1] + 1])];
}

/** The remainder fraction's slips: its sign, and its constant's sign. */
function restSlips(params: ImproperParams): string[] {
  const rest = splitTop(params);
  const bottom = improperBottom(params);
  return [frac(polyTex(scalePoly(rest, -1)), bottom), frac(polyTex([rest[0], -rest[1]]), bottom), frac(polyTex([rest[0] + 1, rest[1]]), bottom)];
}

/**
 * Proper or improper, and if improper, what dividing gives. Each answer
 * decides the next question.
 */
const fracImproperFlow: Generator<ImproperParams> = {
  id: 'frac-improper-flow',
  sample: (rng, difficulty) => sampleImproper(rng, difficulty, rng.chance(difficulty > 1 ? 0.25 : 0.4)),
  render: (params): Slide => {
    const whole = polyTex(params.Q);
    const rest = frac(polyTex(splitTop(params)), improperBottom(params));
    const wholes = [...new Set([whole, ...wholeSlips(params)])];
    const rests = [...new Set([rest, ...restSlips(params)])];
    return {
      kind: 'flow',
      prompt: [say('Before splitting, decide whether there is a whole part to divide out. Each answer decides what is asked next.')],
      subject: improperFractionTex(params),
      steps: [
        {
          id: 'degree',
          ask: 'Is the degree of the top at least the degree of the bottom?',
          branches: [
            { label: 'Yes', to: 'whole' },
            { label: 'No', outcome: 'Then it is proper: it splits straight away, with no whole part.' },
          ],
        },
        {
          id: 'whole',
          ask: 'Divide the top by the bottom. What is the whole part?',
          branches: turned(wholes, whole).map((tex) => ({ label: `$${tex}$`, to: 'rest' })),
        },
        {
          id: 'rest',
          ask: 'And what proper fraction is left over to split?',
          branches: turned(rests, rest).map((tex) => ({ label: `$${tex}$`, outcome: `So the fraction is $${whole} + ${tex}$ before splitting.` })),
        },
      ],
      answer: params.proper ? ['No'] : ['Yes', `$${whole}$`, `$${rest}$`],
    };
  },
  solution: (params) => {
    const top = improperTop(params);
    if (params.proper) {
      return [
        { text: `The top, $${polyTex(top)}$, has degree $${top.length - 1}$ and the bottom has degree $2$.` },
        { text: 'The top is lower, so the fraction is proper and splits straight away.' },
        { tex: splitTex([[params.A, br(params.a)], [params.B, br(params.b)]]) },
      ];
    }
    return improperSolution(params);
  },
};

/**
 * Divide, then split, as a line that is rewritten twice. The first step
 * divides out the whole part; the second splits what is left.
 */
const fracImproperSteps: Generator<ImproperParams> = {
  id: 'frac-improper-steps',
  sample: (rng, difficulty) => sampleImproper(rng, difficulty),
  render: (params): Slide => {
    const { A, B, a, b, Q } = params;
    const divided = improperDivided(params);
    const bottom = improperBottom(params);
    const rest = splitTop(params);
    const split = improperSplitTex(params);
    const whole = polyTex(Q);
    return {
      kind: 'steps',
      prompt: [
        say('Divide out the whole part first, then split what is left. Tap the line to take the next step, then choose what it becomes.'),
      ],
      start: [improperFractionTex(params)],
      reductions: [
        {
          span: [0, 1],
          value: divided,
          bank: stepBank(
            divided,
            `${polyTex(scalePoly(Q, -1))} + ${frac(polyTex(rest), bottom)}`,
            `${whole} + ${frac(polyTex(scalePoly(rest, -1)), bottom)}`,
            frac(polyTex(rest), bottom),
          ),
        },
        {
          span: [0, 1],
          value: split,
          bank: stepBank(
            split,
            `${whole} ${signedFracTerm(B, br(a))} ${signedFracTerm(A, br(b))}`,
            `${whole} ${signedFracTerm(-A, br(a))} ${signedFracTerm(-B, br(b))}`,
            splitTex([
              [A, br(a)],
              [B, br(b)],
            ]),
          ),
        },
      ],
    };
  },
  solution: improperSolution,
};

/** The whole part and both numerators placed as tiles. */
const fracImproperTiles: Generator<ImproperParams> = {
  id: 'frac-improper-tiles',
  sample: (rng, difficulty) => sampleImproper(rng, difficulty),
  render: (params): Slide => {
    const { A, B, a, b, Q } = params;
    const answer = [polyTex(Q), signedFracTerm(A, br(a)), signedFracTerm(B, br(b))];
    return {
      kind: 'tiles',
      prompt: [
        say(`Divide first, then split. Place the whole part, then the $${pbr(a)}$ part, then the $${pbr(b)}$ part.`),
        show(improperFractionTex(params)),
      ],
      template: '{0} {1} {2}',
      bank: tileBank(answer, [
        ...wholeSlips(params).slice(0, 2),
        signedFracTerm(B, br(a)),
        signedFracTerm(A, br(b)),
        signedFracTerm(-A, br(a)),
      ]),
      answer,
    };
  },
  solution: improperSolution,
};

/**
 * The whole part, typed: a number at difficulty 1, and at difficulty 2 the
 * number in x + m, which is where reading the top's next coefficient straight
 * off goes wrong.
 */
const fracImproperQuotient: Generator<ImproperParams> = {
  id: 'frac-improper-quotient',
  sample: (rng, difficulty) => ({ ...sampleImproper(rng, difficulty), Q: difficulty > 1 ? [1, nonZero(rng, 5)] : [rng.pick([1, 2, 3, -1, -2, -3])] }),
  choices: (params) => {
    const { Q, a, b } = params;
    const top = improperTop(params);
    const k = Q[Q.length - 1];
    return Q.length === 1 ? intOptions(k, [-k, top[2], k + 1]) : intOptions(k, [top[1], top[1] + a + b, -k]);
  },
  render: (params): Slide => {
    const { Q } = params;
    const two = Q.length > 1;
    return {
      kind: 'expression',
      prompt: [
        show(improperFractionTex(params)),
        say(
          two
            ? 'Dividing the top by the bottom gives a whole part $x + m$ and a proper fraction left over. What is $m$?'
            : 'Dividing the top by the bottom gives a whole number and a proper fraction left over. What is the whole number?',
        ),
      ],
      lead: two ? 'm =' : '\\text{whole part} =',
      keypad: [],
      answer: String(Q[Q.length - 1]),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { Q, a, b } = params;
    const top = improperTop(params);
    const bottom = polyTex(quad(a, b));
    if (Q.length === 1) {
      return [
        { text: `Multiplied out, the bottom is $${bottom}$. Both have degree 2, so the whole part is the ratio of the $x^{2}$ terms: $${top[0]}$.` },
        { text: `Take $${top[0]}$ lots of the bottom away and what is left has degree 1:` },
        { tex: chain(`&${polyTex(top)}`, `&\\quad - ${paren(top[0])}(${bottom})`, `=\\;&${polyTex(splitTop(params))}`) },
      ];
    }
    return [
      { text: `The bottom is $${bottom}$. To clear $x^{3}$, the whole part starts with $x$: $x(${bottom}) = ${polyTex([1, a + b, a * b, 0])}$.` },
      { text: `Taking that away leaves $${termTex(top[1] - (a + b), 2)}$ as the new first term, so $m = ${top[1]} - ${paren(a + b)} = ${Q[1]}$.` },
      { tex: chain(`&${polyTex(top)}`, `=\\;&(${polyTex(Q)})(${bottom})`, `&\\quad + (${polyTex(splitTop(params))})`) },
    ];
  },
};

/* ================================================================
 * Level 2, lesson 5: what the split is for
 * ================================================================ */

/** k ln|x + c| as a lone term or after another. */
function lnTerm(k: number, c: number, first: boolean): string {
  const size = Math.abs(k) === 1 ? '' : String(Math.abs(k));
  const body = `${size}\\ln|${br(c)}|`;
  if (first) return k < 0 ? `-${body}` : body;
  return k < 0 ? `- ${body}` : `+ ${body}`;
}

interface IntegrateParams {
  A: number;
  B: number;
  a: number;
  /** Difficulty 2: A/(x + a) + B/(x + a)^2 + C/(x + b). Difficulty 1: A/(x + a) + B/(x + b). */
  b: number;
  C: number | null;
}

function integrateSplitTex({ A, B, a, b, C }: IntegrateParams): string {
  return C === null
    ? splitTex([
        [A, br(a)],
        [B, br(b)],
      ])
    : splitTex([
        [A, br(a)],
        [B, `${pbr(a)}^{2}`],
        [C, br(b)],
      ]);
}

function integrateFractionTex(params: IntegrateParams): string {
  const { A, B, a, b, C } = params;
  if (C === null) return frac(polyTex(splitTop({ A, B, a, b, expanded: false })), `${pbr(a)}${pbr(b)}`);
  return repeatedFractionTex({ A, B, a, C, b });
}

function sampleIntegrate(rng: Rng, difficulty: number): IntegrateParams {
  const [a, b] = distinct(rng, 2, 5);
  const [A, B] = distinct(rng, 2, 5);
  return { A, B, a, b, C: difficulty > 1 ? nonZero(rng, 4) : null };
}

/**
 * Integrate a split fraction part by part: each linear part is a logarithm,
 * and at difficulty 2 the part over a square is a power instead. The facts are
 * given; integrating is taught in the Integration course.
 */
const fracIntegrateTiles: Generator<IntegrateParams> = {
  id: 'frac-integrate-tiles',
  sample: sampleIntegrate,
  render: (params): Slide => {
    const { A, B, a, b, C } = params;
    const answer =
      C === null
        ? [lnTerm(A, a, true), lnTerm(B, b, false)]
        : [lnTerm(A, a, true), signedFracTerm(-B, br(a)), lnTerm(C, b, false)];
    const slips =
      C === null
        ? [lnTerm(B, a, true), lnTerm(A, b, false), lnTerm(-B, b, false), lnTerm(-A, a, true)]
        : [lnTerm(B, a, false), signedFracTerm(B, br(a)), lnTerm(-C, b, false), signedFracTerm(-B, `${pbr(a)}^{3}`)];
    return {
      kind: 'tiles',
      prompt: [
        show(`\\int ${integrateFractionTex(params)} \\, dx`),
        say(
          C === null
            ? `The fraction splits as $${integrateSplitTex(params)}$. Integrate each part, using $\\int ${frac('k', 'x + c')} \\, dx = k\\ln|x + c| + \\text{const}$.`
            : `The fraction splits as $${integrateSplitTex(params)}$. Integrate each part, using $\\int ${frac('k', 'x + c')} \\, dx = k\\ln|x + c|$ and $\\int ${frac('k', '(x + c)^{2}')} \\, dx = -${frac('k', 'x + c')}$, plus a constant.`,
        ),
      ],
      template: C === null ? '{0} {1} + \\text{const}' : '{0} {1} {2} + \\text{const}',
      bank: tileBank(answer, slips),
      answer,
    };
  },
  solution: (params) => {
    const { A, B, a, b, C } = params;
    const steps: SolutionStep[] = [{ text: `Split first: $${integrateSplitTex(params)}$.` }];
    steps.push({ text: `$${fracTerm(A, br(a))}$ integrates to $${lnTerm(A, a, true)}$.` });
    if (C === null) {
      steps.push({ text: `$${fracTerm(B, br(b))}$ integrates to $${lnTerm(B, b, true)}$.` });
      steps.push({ text: `$${lnTerm(A, a, true)} ${lnTerm(B, b, false)} + \\text{const}$` });
    } else {
      steps.push({ text: `$${fracTerm(B, `${pbr(a)}^{2}`)}$ is $${B}${pbr(a)}^{-2}$, which integrates to $${fracTerm(-B, br(a))}$: a power, not a logarithm.` });
      steps.push({ text: `$${fracTerm(C, br(b))}$ integrates to $${lnTerm(C, b, true)}$.` });
      steps.push({ text: `$${lnTerm(A, a, true)} ${signedFracTerm(-B, br(a))} ${lnTerm(C, b, false)} + \\text{const}$` });
    }
    steps.push({ text: 'The Integration course does this properly, with definite integrals, in its partial-fractions lesson.' });
    return steps;
  },
};

interface IntegrateWhichParams extends IntegrateParams {
  /** Difficulty 2 asks about the part over the square alone. */
  square: boolean;
}

/**
 * The integral, picked from four. Difficulty 1: the whole split, against the
 * logarithm of the whole bottom and a differentiated answer. Difficulty 2: the
 * part over a square, which is not a logarithm.
 */
const fracIntegrateWhich: Generator<IntegrateWhichParams> = {
  id: 'frac-integrate-which',
  sample: (rng, difficulty) => ({ ...sampleIntegrate(rng, 1), B: nonZero(rng, 9), square: difficulty > 1 }),
  render: (params): Slide => {
    const { A, B, a, b, square } = params;
    if (square) {
      const part = fracTerm(B, `${pbr(a)}^{2}`);
      return choiceSlide(
        [say('The part over a square is not a logarithm. Which is its integral?'), show(`\\int ${part} \\, dx`)],
        firstFour(
          `${fracTerm(-B, br(a))} + \\text{const}`,
          `${B === 1 ? '' : B === -1 ? '-' : B}\\ln|${pbr(a)}^{2}| + \\text{const}`,
          `${fracTerm(B, br(a))} + \\text{const}`,
          `${fracTerm(-2 * B, `${pbr(a)}^{3}`)} + \\text{const}`,
        ),
      );
    }
    return choiceSlide(
      [
        say(`This splits as $${integrateSplitTex(params)}$. Which is its integral?`),
        show(`\\int ${integrateFractionTex(params)} \\, dx`),
      ],
      firstFour(
        `${lnTerm(A, a, true)} ${lnTerm(B, b, false)} + \\text{const}`,
        `${lnTerm(B, a, true)} ${lnTerm(A, b, false)} + \\text{const}`,
        `\\ln|${pbr(a)}${pbr(b)}| + \\text{const}`,
        `${fracTerm(-A, `${pbr(a)}^{2}`)} ${signedFracTerm(-B, `${pbr(b)}^{2}`)} + \\text{const}`,
      ),
    );
  },
  solution: (params) => {
    const { A, B, a, b, square } = params;
    if (square) {
      return [
        { text: `Write it as a power: $${fracTerm(B, `${pbr(a)}^{2}`)} = ${B}${pbr(a)}^{-2}$.` },
        { text: 'Raise the power by one and divide by the new power, $-1$:' },
        { tex: `${fracTerm(-B, br(a))} + \\text{const}` },
        { text: 'Differentiate it back to check: the power $-1$ comes down and cancels the minus sign.' },
      ];
    }
    return [
      { text: 'Each part over a linear bracket integrates to a logarithm, keeping its numerator in front:' },
      { text: `$${lnTerm(A, a, true)} ${lnTerm(B, b, false)} + \\text{const}$` },
      { text: `The logarithm of the whole bottom would only work if the top were the bottom's derivative, which it is not here.` },
    ];
  },
};

interface SeriesParams {
  A: number;
  B: number;
  /** Brackets (1 - px) and (1 - qx). */
  p: number;
  q: number;
  /** The power whose coefficient a typed question asks for. */
  n: number;
  /** Give each bracket's series ready-made. */
  given: boolean;
}

/** 1 - 2x, 1 + x, as the learner reads it. */
function oneMinus(p: number): string {
  return `1 ${signedTerm(-p, 1)}`;
}

/** The top A(1 - qx) + B(1 - px). */
const seriesTop = ({ A, B, p, q }: SeriesParams): Poly => [-(A * q + B * p), A + B];

const seriesFractionTex = (params: SeriesParams): string =>
  frac(polyTex(seriesTop(params)), `(${oneMinus(params.p)})(${oneMinus(params.q)})`);

const seriesSplitTex = ({ A, B, p, q }: SeriesParams): string => splitTex([
  [A, oneMinus(p)],
  [B, oneMinus(q)],
]);

/** The coefficient of x^k in A/(1 - px) + B/(1 - qx). */
const seriesCoefficient = ({ A, B, p, q }: SeriesParams, k: number): number => A * p ** k + B * q ** k;

/** 1 + px + p^2x^2 + ..., as the learner reads it. */
function geometricTex(p: number): string {
  return `1 ${signedTerm(p, 1)} ${signedTerm(p * p, 2)} + \\dots`;
}

function sampleSeries(rng: Rng, difficulty: number): SeriesParams {
  for (;;) {
    const [p, q] = rng.sample([-3, -2, -1, 1, 2, 3], 2);
    const [A, B] = [nonZero(rng, 5), nonZero(rng, 5)];
    const params = { A, B, p, q, n: difficulty > 1 ? 3 : 2, given: difficulty === 1 };
    if ([0, 1, 2, params.n].some((k) => seriesCoefficient(params, k) === 0)) continue;
    if (seriesTop(params).some((c) => c === 0)) continue;
    return params;
  }
}

function seriesPrompt(params: SeriesParams): Block[] {
  const { p, q, given } = params;
  return [
    show(seriesFractionTex(params)),
    say(
      given
        ? `This splits as $${seriesSplitTex(params)}$, and each part is a series you are given: $${frac('1', oneMinus(p))} = ${geometricTex(p)}$ and $${frac('1', oneMinus(q))} = ${geometricTex(q)}$.`
        : `This splits as $${seriesSplitTex(params)}$. Use $${frac('1', '1 - u')} = 1 + u + u^{2} + u^{3} + \\dots$ for each part.`,
    ),
  ];
}

function seriesSolution(params: SeriesParams): SolutionStep[] {
  const { A, B, p, q } = params;
  return [
    { text: `Each part is its numerator times a series:` },
    { text: `$${fracTerm(A, oneMinus(p))} = ${A}(${geometricTex(p)})$` },
    { text: `$${fracTerm(B, oneMinus(q))} = ${B}(${geometricTex(q)})$` },
    {
      text: `Add power by power. The number: $${A} ${signed(B)} = ${seriesCoefficient(params, 0)}$. The $x$ term: $${A} \\times ${paren(p)} ${signed(B)} \\times ${paren(q)} = ${seriesCoefficient(params, 1)}$. In general the $x^{k}$ term is $${A} \\times ${paren(p)}^{k} ${signed(B)} \\times ${paren(q)}^{k}$.`,
    },
    { text: 'The Binomial Expansion course derives these series, and when they are valid, in a later level.' },
  ];
}

/** The first three terms of the series, placed as tiles. */
const fracSeriesTiles: Generator<SeriesParams> = {
  id: 'frac-series-tiles',
  sample: sampleSeries,
  render: (params): Slide => {
    const { A, B, p, q } = params;
    const [c0, c1, c2] = [0, 1, 2].map((k) => seriesCoefficient(params, k));
    const answer = [String(c0), signedTerm(c1, 1), signedTerm(c2, 2)];
    return {
      kind: 'tiles',
      prompt: [...seriesPrompt(params), say('Write the first three terms of the series for the whole fraction.')],
      template: '{0} {1} {2} + \\dots',
      bank: tileBank(answer, [
        String(A * B),
        signedTerm(-c1, 1),
        signedTerm(A * p - B * q, 1),
        signedTerm(A * p * p - B * q * q, 2),
        signedTerm(c1, 2),
      ]),
      answer,
    };
  },
  solution: (params) => [
    ...seriesSolution(params),
    { tex: `${seriesCoefficient(params, 0)} ${signedTerm(seriesCoefficient(params, 1), 1)} ${signedTerm(seriesCoefficient(params, 2), 2)} + \\dots` },
  ],
};

/** One coefficient of the series, typed: x^2 at difficulty 1, x^3 at difficulty 2. */
const fracSeriesCoefficient: Generator<SeriesParams> = {
  id: 'frac-series-coefficient',
  sample: sampleSeries,
  choices: (params) => {
    const { A, B, p, q, n } = params;
    const right = seriesCoefficient(params, n);
    return intOptions(right, [A * p ** n - B * q ** n, A * p ** (n - 1) + B * q ** (n - 1), -right, A + B]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [...seriesPrompt(params), say(`What is the coefficient of $${termTex(1, params.n)}$ in the series for the whole fraction?`)],
    lead: `\\text{coefficient of } ${termTex(1, params.n)} =`,
    keypad: [],
    answer: String(seriesCoefficient(params, params.n)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { A, B, p, q, n } = params;
    return [
      ...seriesSolution(params),
      { text: `$${A} \\times ${paren(p)}^{${n}} ${signed(B)} \\times ${paren(q)}^{${n}} = ${seriesCoefficient(params, n)}$` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 1: a bracket that will not split
 * ================================================================ */

type Reductions = Extract<Slide, { kind: 'steps' }>['reductions'];

/** x^2 + c. */
const sq = (c: number): Poly => [1, 0, c];

const sqTex = (c: number): string => polyTex(sq(c));

/** A square root as the learner reads it: 3, or the radical when it is not whole. */
function rootTex(n: number): string {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? String(r) : `\\sqrt{${n}}`;
}

/**
 * Numbers times letters, summed, as the learner reads it: 2A + B, -B + 5C.
 * Every letter-sum tile and option goes through here, so a distractor is
 * spelled the way the answer is. A zero drops its letter, a one its number.
 */
function lettersCombo(terms: [number, string][]): string {
  return terms
    .filter(([k]) => k !== 0)
    .map(([k, letter], i) => {
      const size = Math.abs(k) === 1 ? '' : String(Math.abs(k));
      if (i === 0) return `${k < 0 ? '-' : ''}${size}${letter}`;
      return `${k < 0 ? '-' : '+'} ${size}${letter}`;
    })
    .join(' ');
}

/** One letter after another term, its sign shown: + 2B, - B. */
function moreLetters(k: number, letter: string): string {
  return `${k < 0 ? '-' : '+'} ${Math.abs(k) === 1 ? '' : Math.abs(k)}${letter}`;
}

/** Two brackets with these constants, the smaller first: (x - 3)(x + 3). */
function pairTex(s: number, t: number): string {
  const [u, v] = [s, t].sort((x, y) => x - y);
  return `${pbr(u)}${pbr(v)}`;
}

/**
 * Ax + B over a bottom, the minus sign outside when A is negative, as a lone
 * term or after another. Every quadratic part goes through here, so a
 * distractor tile is spelled the way the answer is.
 */
function quadPart(A: number, B: number, bottom: string, first: boolean): string {
  const body = frac(polyTex(A < 0 ? [-A, -B] : [A, B]), bottom);
  if (A < 0) return first ? `-${body}` : `- ${body}`;
  return first ? body : `+ ${body}`;
}

interface FormParams {
  /** The linear bracket is (x + a). */
  a: number;
  /** The quadratic factor, monic. */
  q: Poly;
  /** Its bracket constants, smaller first, when it factorises; null when it will not split. */
  s: [number, number] | null;
  /** Numerators, only so that the top shown is a real top for this bottom. */
  K: [number, number, number];
}

function formTop({ a, q, s, K }: FormParams): Poly {
  if (s === null) return addPoly(mulPoly([K[0], K[1]], lin(a)), scalePoly(q, K[2]));
  return addPoly(
    addPoly(scalePoly(quad(s[1], a), K[0]), scalePoly(quad(s[0], a), K[1])),
    scalePoly(quad(s[0], s[1]), K[2]),
  );
}

const formBottomTex = ({ a, q }: FormParams): string => `${pbr(a)}(${polyTex(q)})`;

const formFractionTex = (params: FormParams): string => frac(polyTex(formTop(params)), formBottomTex(params));

/** The form the split takes, with letters. */
function formLettersTex({ a, q, s }: FormParams): string {
  if (s === null) return `${frac('Ax + B', polyTex(q))} + ${frac('C', br(a))}`;
  return `${frac('A', br(s[0]))} + ${frac('B', br(s[1]))} + ${frac('C', br(a))}`;
}

/**
 * A bottom (x + a) times a quadratic. Difficulty 1 takes x^2 + c, which will
 * not split, or x^2 - k^2, which will; difficulty 2 any monic quadratic, told
 * apart by its discriminant. `splits` says which.
 */
function sampleForm(rng: Rng, difficulty: number, splits: boolean): FormParams {
  for (;;) {
    const a = nonZero(rng, 5);
    let q: Poly;
    let s: [number, number] | null = null;
    if (difficulty > 1 && splits) {
      const [u, v] = distinct(rng, 2, 5);
      s = [Math.min(u, v), Math.max(u, v)];
      q = quad(u, v);
    } else if (difficulty > 1) {
      const p = nonZero(rng, 6);
      q = [1, p, Math.floor((p * p) / 4) + rng.int(1, 6)];
    } else if (splits) {
      const k = rng.int(1, 5);
      s = [-k, k];
      q = [1, 0, -k * k];
    } else q = sq(rng.int(1, 9));
    if (s !== null && s.includes(a)) continue;
    const K: [number, number, number] = [nonZero(rng, 4), nonZero(rng, 4), nonZero(rng, 4)];
    if (formTop({ a, q, s, K }).length !== 3) continue;
    return { a, q, s, K };
  }
}

/**
 * Wrong factorisations: the signs flipped, a bracket squared, factors of the
 * constant that do not add up, and x^2 + c read as a difference of squares.
 */
function factorSlips({ q, s }: FormParams): string[] {
  const [, p, k] = q;
  const out: string[] = [];
  if (s !== null) out.push(pairTex(-s[0], -s[1]), `${pbr(s[0])}^{2}`, `${pbr(s[1])}^{2}`);
  else if (p === 0) out.push(`(x - ${rootTex(k)})(x + ${rootTex(k)})`);
  out.push(pairTex(1, k), pairTex(-1, -k));
  return out;
}

function formSolution(params: FormParams): SolutionStep[] {
  const { q, s } = params;
  const [, p, k] = q;
  const qTex = polyTex(q);
  const disc = p * p - 4 * k;
  const steps: SolutionStep[] = [];
  if (p !== 0) steps.push({ text: `For $${qTex}$, $b^{2} - 4ac = ${paren(p)}^{2} - 4 \\times ${paren(k)} = ${disc}$.` });
  if (s === null) {
    steps.push({
      text:
        p === 0
          ? `$${qTex}$ is at least $${k}$ for every $x$, so it is never zero: it has no real roots and will not split.`
          : `That is negative, so $${qTex}$ has no real roots and will not split.`,
    });
    steps.push({ text: 'A quadratic that stays whole takes a top one degree lower: an $x$ term and a number, not a number alone.' });
  } else {
    steps.push({
      text: `${p === 0 ? 'It is a difference of two squares' : 'That is a square, so it factorises'}: $${qTex} = ${pairTex(s[0], s[1])}$. The bottom is three linear brackets, each with a number over it.`,
    });
  }
  steps.push({ tex: formLettersTex(params) });
  return steps;
}

/**
 * Does the quadratic split, and so what form does the fraction take? The two
 * wrong turns are a number alone over x^2 + c, and x^2 - 9 kept whole as if it
 * would not split.
 */
const fracQuadFactoriseFlow: Generator<FormParams> = {
  id: 'frac-quad-factorise-flow',
  sample: (rng, difficulty) => sampleForm(rng, difficulty, rng.chance(0.5)),
  render: (params): Slide => {
    const { a, q, s } = params;
    const qTex = polyTex(q);
    const factors = s === null ? null : pairTex(s[0], s[1]);
    const factorings = [...new Set([...(factors === null ? [] : [factors]), ...factorSlips(params)])].slice(0, 4);
    const forms = [frac('Ax + B', qTex), frac('A', qTex), frac('Ax^{2} + Bx + D', qTex)];
    return {
      kind: 'flow',
      prompt: [say('Decide what the split of this fraction looks like. Each answer decides what is asked next.')],
      subject: formFractionTex(params),
      steps: [
        {
          id: 'splits',
          ask: `Does $${qTex}$ factorise into two brackets?`,
          branches: [
            { label: 'Yes', to: 'factors' },
            { label: 'No', to: 'form' },
          ],
        },
        {
          id: 'factors',
          ask: `What does $${qTex}$ factorise into?`,
          branches: turned(factorings, qTex).map((tex) => ({
            label: `$${tex}$`,
            outcome: `So the bottom is $${pbr(a)}${tex}$, and each bracket gets a number over it.`,
          })),
        },
        {
          id: 'form',
          ask: `So what goes over $${qTex}$?`,
          branches: turned(forms, `${qTex}|${a}`).map((tex) => ({
            label: `$${tex}$`,
            outcome: `So the split is $${tex} + ${frac('C', br(a))}$.`,
          })),
        },
      ],
      answer: factors === null ? ['No', `$${forms[0]}$`] : ['Yes', `$${factors}$`],
    };
  },
  solution: formSolution,
};

/** The two parts of a split over a quadratic that will not split, placed as tiles. */
const fracQuadPartsTiles: Generator<FormParams> = {
  id: 'frac-quad-parts-tiles',
  sample: (rng, difficulty) => sampleForm(rng, difficulty, false),
  render: (params): Slide => {
    const { a, q } = params;
    const qTex = polyTex(q);
    const answer = [frac('Ax + B', qTex), frac('C', br(a))];
    return {
      kind: 'tiles',
      prompt: [say('Place the two parts this fraction splits into, with letters for the numbers still to find.'), show(formFractionTex(params))],
      template: '{0} + {1}',
      unordered: true,
      bank: tileBank(answer, [frac('A', qTex), frac('C', qTex), frac('Cx + D', br(a)), frac('Ax + B', br(a))]),
      answer,
    };
  },
  solution: formSolution,
};

/** Which form does the split take? Forgetting the x on top, or splitting what will not split. */
const fracQuadFormWhich: Generator<FormParams> = {
  id: 'frac-quad-form-which',
  sample: (rng, difficulty) => sampleForm(rng, difficulty, rng.chance(0.5)),
  render: (params): Slide => {
    const { a, q, s } = params;
    const qTex = polyTex(q);
    const linear = frac('C', br(a));
    const wrong =
      s === null
        ? [
            `${frac('A', qTex)} + ${frac('B', br(a))}`,
            ...(q[1] === 0 ? [`${frac('A', `x - ${rootTex(q[2])}`)} + ${frac('B', `x + ${rootTex(q[2])}`)} + ${linear}`] : []),
            `${frac('Ax + B', qTex)} + ${frac('Cx + D', br(a))}`,
            frac('Ax + B', qTex),
          ]
        : [`${frac('Ax + B', qTex)} + ${linear}`, `${frac('A', qTex)} + ${frac('B', br(a))}`, `${frac('A', br(s[0]))} + ${frac('B', br(s[1]))}`];
    return choiceSlide(
      [say('Which form does this fraction split into?'), show(formFractionTex(params))],
      firstFour(formLettersTex(params), ...wrong),
    );
  },
  solution: formSolution,
};

interface DiscriminantParams {
  /** The quadratic kx^2 + px + q. */
  k: number;
  p: number;
  q: number;
}

/**
 * b^2 - 4ac as a tree. Difficulty 2 has a leading coefficient other than 1.
 * The discriminant is drawn negative or a square, never a positive that
 * splits into surds, so "will it split?" has a plain answer.
 */
const fracDiscriminantTree: Generator<DiscriminantParams> = {
  id: 'frac-discriminant-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const k = difficulty > 1 ? rng.int(2, 3) : 1;
      const p = nonZero(rng, difficulty > 1 ? 7 : 6);
      const q = rng.chance(0.6) ? rng.int(1, 12) : -rng.int(1, 9);
      const disc = p * p - 4 * k * q;
      if (disc < 0 || Math.round(Math.sqrt(disc)) ** 2 === disc) return { k, p, q };
    }
  },
  render: ({ k, p, q }): Slide => {
    const answer = [p * p, 4 * k * q, p * p - 4 * k * q];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Will this quadratic split? Here $a = ${k}$, $b = ${p}$ and $c = ${q}$. Top row: $b^{2}$, then $4ac$. Below: $b^{2} - 4ac$, which is negative exactly when it has no real roots.`,
        ),
      ],
      expression: polyTex([k, p, q]),
      nodes: [
        { id: 'b2', from: [] },
        { id: 'ac', from: [] },
        { id: 'disc', from: ['b2', 'ac'] },
      ],
      bank: numberBank(answer, [-p * p, 2 * k * q, 4 * q, p * p + 4 * k * q, 2 * p]),
      answer: answer.map(String),
    };
  },
  solution: ({ k, p, q }) => {
    const disc = p * p - 4 * k * q;
    const tex = polyTex([k, p, q]);
    const verdict =
      disc < 0
        ? `negative, so $${tex}$ has no real roots. It will not split, and its part in a split is $${frac('Ax + B', tex)}$.`
        : `$${Math.sqrt(disc)}^{2}$, a square, so it factorises into brackets with whole numbers in them.`;
    return [
      { text: `$b^{2} = ${paren(p)}^{2} = ${p * p}$ and $4ac = 4 \\times ${k} \\times ${paren(q)} = ${4 * k * q}$.` },
      { tex: `b^{2} - 4ac = ${p * p} - ${paren(4 * k * q)} = ${disc}` },
      { text: `That is ${verdict}` },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 2: the linear part first
 * ================================================================ */

interface QuadSplit {
  /** The fraction is (Ax + B)/(x^2 + c) + C/(x + a), added up; a = 0 puts C over x. */
  A: number;
  B: number;
  C: number;
  a: number;
  c: number;
  /** The bottom shown multiplied out, to be factorised first. */
  expanded: boolean;
}

/** (Ax + B)(x + a) + C(x^2 + c). */
const quadSplitTop = ({ A, B, C, a, c }: QuadSplit): Poly => addPoly(mulPoly([A, B], lin(a)), scalePoly(sq(c), C));

/** Both sides multiplied by the bottom, over three lines so it fits a phone. */
function multipliedTex(params: QuadSplit): string {
  return chain(`&${polyTex(quadSplitTop(params))}`, `=\\;&(Ax + B)${quadLinearTex(params.a)}`, `&\\quad + C(${sqTex(params.c)})`);
}

/** The linear bracket as a factor: (x + 2), or x itself. */
const quadLinearTex = (a: number): string => (a === 0 ? 'x' : pbr(a));

/** The first `count` distractors that differ from the answer and from each other. */
function fewest(answer: string[], count: number, distractors: string[]): string[] {
  const seen = new Set(answer.map(bare));
  const out: string[] = [];
  for (const token of distractors) {
    if (out.length === count || seen.has(bare(token))) continue;
    seen.add(bare(token));
    out.push(token);
  }
  return out;
}

/** (x + a)(x^2 + c) multiplied out. */
const quadCubic = ({ a, c }: QuadSplit): Poly => mulPoly(lin(a), sq(c));

function quadBottomTex(params: QuadSplit): string {
  if (params.expanded) return polyTex(quadCubic(params));
  return params.a === 0 ? `x(${sqTex(params.c)})` : `${pbr(params.a)}(${sqTex(params.c)})`;
}

const quadFractionTex = (params: QuadSplit): string => frac(polyTex(quadSplitTop(params)), quadBottomTex(params));

const quadLettersTex = ({ a, c }: QuadSplit): string => `${frac('Ax + B', sqTex(c))} + ${frac('C', br(a))}`;

const quadAnswerTex = ({ A, B, C, a, c }: QuadSplit): string => `${quadPart(A, B, sqTex(c), true)} ${signedFracTerm(C, br(a))}`;

/** The top's coefficients, and what cover-up meets at x = -a. */
function quadValues(params: QuadSplit) {
  const top = quadSplitTop(params);
  return { top, x2: top[0], x1: top[1], x0: top[2], t: valueAt(top, -params.a), square: params.a * params.a + params.c };
}

/**
 * The letters, drawn first, the top multiplied up from them. Difficulty 1
 * keeps A and C positive and the brackets small; difficulty 2 signs them all.
 * `overX` makes the linear bracket x itself.
 */
function sampleQuadSplit(rng: Rng, difficulty: number, overX = false): QuadSplit {
  const hard = difficulty > 1;
  for (;;) {
    const a = overX ? 0 : nonZero(rng, hard ? 5 : 3);
    const c = rng.int(1, hard ? 9 : 5);
    const A = hard ? nonZero(rng, 5) : rng.int(1, 3);
    const B = nonZero(rng, hard ? 5 : 4);
    const C = hard ? nonZero(rng, 5) : rng.int(1, 3);
    // A top with no x^2 term, or a cover-up value past two digits, is a different question.
    if (A + C === 0 || Math.abs(C) * (a * a + c) > 99) continue;
    return { A, B, C, a, c, expanded: overX && hard };
  }
}

function quadCoverSolution(params: QuadSplit): SolutionStep[] {
  const { C, a, c } = params;
  const { top, t, square } = quadValues(params);
  return [
    { text: `Multiply both sides by the bottom: $${polyTex(top)} = (Ax + B)${pbr(a)} + C(${sqTex(c)})$.` },
    {
      text: `Put $x = ${-a}$: the first bracket is zero, so only $C$ survives. The top is $${t}$ there, and $${sqTex(c)}$ is $${paren(-a)}^{2} + ${c} = ${square}$.`,
    },
    { tex: `C = ${frac(String(t), String(square))} = ${C}` },
    { text: `That is cover-up: cover $${pbr(a)}$ and put $x = ${-a}$ into what is left.` },
  ];
}

function quadSolution(params: QuadSplit): SolutionStep[] {
  const { A, B, C, a, c } = params;
  const { top, x2, x0, t, square } = quadValues(params);
  return [
    { text: `Multiply both sides by the bottom: $${polyTex(top)} = (Ax + B)${pbr(a)} + C(${sqTex(c)})$.` },
    { text: `Put $x = ${-a}$, which makes $${pbr(a)}$ zero: $${t} = ${lettersCombo([[square, 'C']])}$, so $C = ${C}$.` },
    { text: `The $x^{2}$ terms: $A + C = ${x2}$, so $A = ${A}$.` },
    { text: `The numbers: $${lettersCombo([[a, 'B'], [c, 'C']])} = ${x0}$, so $B = ${B}$.` },
    { tex: quadAnswerTex(params) },
  ];
}

/** C by cover-up, then A from the x^2 terms, as a tree. */
const fracQuadCAndATree: Generator<QuadSplit> = {
  id: 'frac-quad-c-and-a-tree',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { A, C, a, c } = params;
    const { top, x2, t, square } = quadValues(params);
    const answer = [t, square, C, A];
    return {
      kind: 'tree',
      prompt: [
        say(
          `This splits as $${quadLettersTex(params)}$. Cover $${pbr(a)}$ and put $x = ${-a}$ into the rest. Top row: the top there, then $${sqTex(c)}$ there. Below: $C$. Last: $A$, from the $x^{2}$ terms, $A + C = ${x2}$.`,
        ),
      ],
      expression: quadFractionTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'square', from: [] },
        { id: 'C', from: ['top', 'square'] },
        { id: 'A', from: ['C'] },
      ],
      bank: numberBank(answer, [-C, c - a * a, x2 + C, -A, valueAt(top, a)]),
      answer: answer.map(String),
    };
  },
  solution: (params) => [
    ...quadCoverSolution(params).slice(0, 3),
    { text: `Then the $x^{2}$ terms: $A + C = ${quadValues(params).x2}$, so $A = ${params.A}$.` },
  ],
};

/** Cover-up as a line of working, where (-a)^2 is the step that goes wrong. */
const fracQuadCoverSteps: Generator<QuadSplit> = {
  id: 'frac-quad-cover-steps',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { C, a, c } = params;
    const { t, square } = quadValues(params);
    const aa = a * a;
    return {
      kind: 'steps',
      prompt: [
        show(quadFractionTex(params)),
        say(
          `This splits as $${quadLettersTex(params)}$. Cover $${pbr(a)}$ and put $x = ${-a}$ into the rest: the top there is $${t}$. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [String(t), '\\div', `(${paren(-a)}^{2} + ${c})`],
      reductions: [
        {
          span: [2, 3],
          value: `(${aa} + ${c})`,
          bank: stepBank(`(${aa} + ${c})`, `(${-aa} + ${c})`, `(${-2 * a} + ${c})`, `(${2 * Math.abs(a)} + ${c})`),
        },
        { span: [2, 3], value: String(square), bank: stepBank(String(square), String(c - aa), String(aa * c), String(square + 1)) },
        { span: [0, 3], operator: 1, value: String(C), bank: stepBank(String(C), String(-C), String(t - square), String(C + 1)) },
      ],
    };
  },
  solution: quadCoverSolution,
};

interface QuadAskParams extends QuadSplit {
  ask: 'A' | 'C';
}

/** One letter, typed: C by cover-up, and at difficulty 2 sometimes A after it. */
const fracQuadCValue: Generator<QuadAskParams> = {
  id: 'frac-quad-c-value',
  sample: (rng, difficulty) => ({ ...sampleQuadSplit(rng, difficulty), ask: difficulty > 1 ? rng.pick<'A' | 'C'>(['A', 'C']) : 'C' }),
  choices: (params) => {
    const { A, C, a, c } = params;
    const { x2, t } = quadValues(params);
    return params.ask === 'C' ? intOptions(C, [-C, t, x2, t / (c - a * a)]) : intOptions(A, [x2, x2 + C, -A, C]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [show(quadFractionTex(params)), say(`This splits as $${quadLettersTex(params)}$. Find $${params.ask}$.`)],
    lead: `${params.ask} =`,
    keypad: [],
    answer: String(params.ask === 'C' ? params.C : params.A),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) =>
    params.ask === 'C'
      ? quadCoverSolution(params)
      : [...quadCoverSolution(params).slice(0, 3), { text: `Then the $x^{2}$ terms: $A + C = ${quadValues(params).x2}$, so $A = ${params.A}$.` }],
};

/** What each power of x says once the right side is multiplied out, as letter sums. */
const fracQuadCoefficientsTiles: Generator<QuadSplit> = {
  id: 'frac-quad-coefficients-tiles',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { a, c } = params;
    const { x2, x1, x0 } = quadValues(params);
    const answer = [lettersCombo([[1, 'A'], [1, 'C']]), lettersCombo([[a, 'A'], [1, 'B']]), lettersCombo([[a, 'B'], [c, 'C']])];
    return {
      kind: 'tiles',
      prompt: [
        say(
          'Multiplied by the bottom, the two tops agree for every $x$. Multiply out the right, then place what its $x^{2}$ terms, its $x$ terms and its numbers come to, in that order.',
        ),
        show(multipliedTex(params)),
      ],
      template: `{0} = ${x2}, \\quad {1} = ${x1}, \\quad {2} = ${x0}`,
      bank: tileBank(
        answer,
        fewest(answer, 4, [
          lettersCombo([[1, 'A'], [1, 'B']]),
          lettersCombo([[c, 'B'], [a, 'C']]),
          lettersCombo([[a, 'B'], [1, 'C']]),
          lettersCombo([[-a, 'A'], [1, 'B']]),
          lettersCombo([[1, 'A'], [a, 'B']]),
          lettersCombo([[1, 'B'], [c, 'C']]),
          lettersCombo([[a, 'B'], [-c, 'C']]),
        ]),
      ),
      answer,
    };
  },
  solution: (params) => {
    const { a, c } = params;
    const { x2, x1, x0 } = quadValues(params);
    return [
      {
        text: `Multiply out: $(Ax + B)${pbr(a)} = Ax^{2} + (${lettersCombo([[a, 'A'], [1, 'B']])})x ${moreLetters(a, 'B')}$, and $C(${sqTex(c)}) = Cx^{2} ${moreLetters(c, 'C')}$.`,
      },
      {
        tex: chain(
          `x^{2} \\text{ terms:} &\\;\\; A + C = ${x2}`,
          `x \\text{ terms:} &\\;\\; ${lettersCombo([[a, 'A'], [1, 'B']])} = ${x1}`,
          `\\text{numbers:} &\\;\\; ${lettersCombo([[a, 'B'], [c, 'C']])} = ${x0}`,
        ),
      },
    ];
  },
};

/* ================================================================
 * Level 3, lesson 3: finding B
 * ================================================================ */

/** B from the numbers, once C is known, as a line of working. */
const fracQuadBSteps: Generator<QuadSplit> = {
  id: 'frac-quad-b-steps',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { B, C, a, c } = params;
    const { x0 } = quadValues(params);
    const cC = c * C;
    const rest = x0 - cC;
    return {
      kind: 'steps',
      prompt: [
        show(quadFractionTex(params)),
        say(
          `This splits as $${quadLettersTex(params)}$, and cover-up gives $C = ${C}$. The numbers say $${lettersCombo([[a, 'B'], [c, 'C']])} = ${x0}$. Tap the part you would work out **next**, then choose its value.`,
        ),
      ],
      start: [lettersCombo([[a, 'B']]), `+ ${c} \\times ${paren(C)}`, '=', String(x0)],
      reductions: [
        { span: [1, 2], value: signed(cC), bank: stepBank(signed(cC), signed(-cC), signed(c + C), signed(cC + c)) },
        { span: [1, 4], operator: 2, value: `= ${rest}`, bank: stepBank(`= ${rest}`, `= ${x0 + cC}`, `= ${-rest}`) },
        { span: [0, 2], value: `B = ${B}`, bank: stepBank(`B = ${B}`, `B = ${-B}`, `B = ${rest}`, `B = ${x0}`, `B = ${rest * a}`) },
      ],
    };
  },
  solution: quadSolution,
};

/** All three letters in one tree: cover-up for C, then A and B from it. */
const fracQuadAbcTree: Generator<QuadSplit> = {
  id: 'frac-quad-abc-tree',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { A, B, C, a, c } = params;
    const { x2, x1, x0, t, square } = quadValues(params);
    const answer = [t, square, C, A, B];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${quadLettersTex(params)}$. Top row: the top at $x = ${-a}$, then $${sqTex(c)}$ there. Below: $C$. Then $A$, from the $x^{2}$ terms, $A + C = ${x2}$; and $B$, from the numbers, $${lettersCombo([[a, 'B'], [c, 'C']])} = ${x0}$.`,
        ),
      ],
      expression: quadFractionTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'square', from: [] },
        { id: 'C', from: ['top', 'square'] },
        { id: 'A', from: ['C'] },
        { id: 'B', from: ['C'] },
      ],
      bank: numberBank(answer, [-C, -B, x0 - c * C, x2 + C, x1]),
      answer: answer.map(String),
    };
  },
  solution: quadSolution,
};

interface SubstituteParams extends QuadSplit {
  /** The value of x put into both sides. */
  at: 0 | 1;
}

/**
 * Which equation does a value of x give? x = 0 gives the numbers' equation,
 * which is the quick way to B; at difficulty 2, x = 1 gives one with every
 * letter in it, the check.
 */
const fracQuadSubstitute: Generator<SubstituteParams> = {
  id: 'frac-quad-substitute',
  sample: (rng, difficulty) => ({ ...sampleQuadSplit(rng, difficulty), at: difficulty > 1 ? 1 : 0 }),
  render: (params): Slide => {
    const { a, c, at } = params;
    const { top } = quadValues(params);
    const left = valueAt(top, at);
    const eq = (...terms: [number, string][]) => `${left} = ${lettersCombo(terms)}`;
    const right = at === 0 ? eq([a, 'B'], [c, 'C']) : eq([1 + a, 'A'], [1 + a, 'B'], [1 + c, 'C']);
    const wrong =
      at === 0
        ? [
            eq([a, 'B'], [1, 'C']),
            eq([1, 'B'], [c, 'C']),
            eq([c, 'B'], [a, 'C']),
            eq([a, 'A'], [c, 'C']),
            eq([a, 'B'], [-c, 'C']),
            eq([1, 'A'], [1, 'B'], [c, 'C']),
            eq([a, 'B']),
          ]
        : [
            eq([1 + a, 'A'], [1, 'B'], [1 + c, 'C']),
            eq([1 + a, 'A'], [1 + a, 'B'], [c, 'C']),
            eq([a, 'A'], [a, 'B'], [1 + c, 'C']),
            eq([1, 'A'], [1, 'B'], [1 + c, 'C']),
          ];
    return choiceSlide(
      [
        say(`Multiplied by the bottom, the tops agree for every $x$. Put $x = ${at}$ into both sides. Which equation comes out?`),
        show(multipliedTex(params)),
      ],
      firstFour(right, ...wrong),
    );
  },
  solution: (params) => {
    const { A, B, C, a, c, at } = params;
    const left = valueAt(quadValues(params).top, at);
    if (at === 0) {
      return [
        { text: `At $x = 0$ the left is its number, $${left}$.` },
        { text: `On the right, $(A \\times 0 + B)(0 ${signed(a)})$ is $${lettersCombo([[a, 'B']])}$ and $C(0 + ${c})$ is $${lettersCombo([[c, 'C']])}$.` },
        { tex: `${left} = ${lettersCombo([[a, 'B'], [c, 'C']])}` },
        { text: `It is the equation the numbers give, since $x = 0$ wipes out every $x$ term. With $C = ${C}$ it gives $B = ${B}$.` },
      ];
    }
    return [
      { text: `At $x = 1$ the left is its coefficients added up, $${left}$.` },
      { text: `On the right, $(A + B)(1 ${signed(a)})$ and $C(1 + ${c})$:` },
      { tex: `${left} = ${lettersCombo([[1 + a, 'A'], [1 + a, 'B'], [1 + c, 'C']])}` },
      { text: `That is the check: $A = ${A}$, $B = ${B}$ and $C = ${C}$ satisfy it.` },
    ];
  },
};

/** B, typed. */
const fracQuadBValue: Generator<QuadSplit> = {
  id: 'frac-quad-b-value',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  choices: (params) => {
    const { B, C, c } = params;
    const { x0, x1 } = quadValues(params);
    return intOptions(B, [-B, x0 - c * C, x1, x0]);
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [show(quadFractionTex(params)), say(`This splits as $${quadLettersTex(params)}$. Find $B$.`)],
    lead: 'B =',
    keypad: [],
    answer: String(params.B),
    domain: 'real',
    mode: 'exact',
  }),
  solution: quadSolution,
};

/** The whole split placed as tiles, the quadratic part first. */
const fracQuadSplitTiles: Generator<QuadSplit> = {
  id: 'frac-quad-split-tiles',
  sample: (rng, difficulty) => sampleQuadSplit(rng, difficulty),
  render: (params): Slide => {
    const { A, B, C, a, c } = params;
    const { x2, t } = quadValues(params);
    const s = sqTex(c);
    const answer = [quadPart(A, B, s, true), signedFracTerm(C, br(a))];
    return {
      kind: 'tiles',
      prompt: [say(`Split into partial fractions, the part over $${s}$ first.`), show(quadFractionTex(params))],
      template: '{0} {1}',
      bank: tileBank(answer, [
        quadPart(A, -B, s, true),
        quadPart(x2, B, s, true),
        quadPart(B, A, s, true),
        signedFracTerm(-C, br(a)),
        signedFracTerm(t, br(a)),
      ]),
      answer,
    };
  },
  solution: quadSolution,
};

/* ================================================================
 * Level 3, lesson 4: a bottom of x(x^2 + c)
 * ================================================================ */

const sampleOverX = (rng: Rng, difficulty: number): QuadSplit => sampleQuadSplit(rng, difficulty, true);

function overXSolution(params: QuadSplit): SolutionStep[] {
  const { A, B, C, c, expanded } = params;
  const { top, x2, x0 } = quadValues(params);
  return [
    ...(expanded ? [{ text: `Take out the $x$: $${polyTex(quadCubic(params))} = x(${sqTex(c)})$.` }] : []),
    { text: `Multiply both sides by the bottom: $${polyTex(top)} = (Ax + B)x + C(${sqTex(c)})$.` },
    { text: `Put $x = 0$: only $C$ survives, $${x0} = ${lettersCombo([[c, 'C']])}$, so $C = ${C}$.` },
    {
      text: `$(Ax + B)x$ is $Ax^{2} + Bx$, with no number, so the $x$ terms give $B = ${B}$ straight away, and the $x^{2}$ terms give $A + C = ${x2}$, so $A = ${A}$.`,
    },
    { tex: quadAnswerTex(params) },
  ];
}

/** Cover-up at x = 0, then A and B, as a tree. */
const fracXQuadTree: Generator<QuadSplit> = {
  id: 'frac-x-quad-tree',
  sample: sampleOverX,
  render: (params): Slide => {
    const { A, B, C, c } = params;
    const { x2, x0 } = quadValues(params);
    const answer = [x0, C, A, B];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${quadLettersTex(params)}$. First: the top at $x = 0$, which is $${lettersCombo([[c, 'C']])}$. Then $C$. Then $A$, from the $x^{2}$ terms, $A + C = ${x2}$. Last: $B$, from the $x$ terms.`,
        ),
      ],
      expression: quadFractionTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'C', from: ['top'] },
        { id: 'A', from: ['C'] },
        { id: 'B', from: [] },
      ],
      bank: numberBank(answer, [-C, x2, x2 + C, -B, x0 - c]),
      answer: answer.map(String),
    };
  },
  solution: overXSolution,
};

/** The line rewritten: the bottom factorised at difficulty 2, then C in place, then A and B. */
const fracXQuadCoverSteps: Generator<QuadSplit> = {
  id: 'frac-x-quad-cover-steps',
  sample: sampleOverX,
  render: (params): Slide => {
    const { A, B, C, c, expanded } = params;
    const { top, x2, x0 } = quadValues(params);
    const s = sqTex(c);
    const withC = (k: number) => `${frac('Ax + B', s)} ${signedFracTerm(k, 'x')}`;
    const withAll = (a: number, b: number, k: number) => `${quadPart(a, b, s, true)} ${signedFracTerm(k, 'x')}`;
    const factored = frac(polyTex(top), `x(${s})`);
    const reductions: Reductions = [
      { span: [0, 1], value: withC(C), bank: stepBank(withC(C), withC(x0), withC(-C), withC(x2)) },
      { span: [0, 1], value: withAll(A, B, C), bank: stepBank(withAll(A, B, C), withAll(x2, B, C), withAll(A, -B, C), withAll(B, A, C)) },
    ];
    if (expanded) {
      reductions.unshift({
        span: [0, 1],
        value: factored,
        bank: stepBank(factored, frac(polyTex(top), `x^{2}(x + ${c})`), frac(polyTex(top), `x(${polyTex([1, 0, -c])})`)),
      });
    }
    return {
      kind: 'steps',
      prompt: [
        say(
          `Split this fraction: ${expanded ? 'factorise the bottom, then ' : ''}put $C$ in by cover-up, then $A$ and $B$. Tap the line to take the next step, then choose what it becomes.`,
        ),
      ],
      start: [quadFractionTex(params)],
      reductions,
    };
  },
  solution: overXSolution,
};

/** The split over x(x^2 + c) placed as tiles. */
const fracXQuadTiles: Generator<QuadSplit> = {
  id: 'frac-x-quad-tiles',
  sample: sampleOverX,
  render: (params): Slide => {
    const { A, B, C, c } = params;
    const { x2, x0 } = quadValues(params);
    const s = sqTex(c);
    const answer = [quadPart(A, B, s, true), signedFracTerm(C, 'x')];
    return {
      kind: 'tiles',
      prompt: [say(`Split into partial fractions, the part over $${s}$ first.`), show(quadFractionTex(params))],
      template: '{0} {1}',
      bank: tileBank(answer, [quadPart(x2, B, s, true), quadPart(A, -B, s, true), signedFracTerm(x0, 'x'), signedFracTerm(-C, 'x')]),
      answer,
    };
  },
  solution: overXSolution,
};

/** The order of the work: the form, which letter first, then C, then A. */
const fracXQuadOrderFlow: Generator<QuadSplit> = {
  id: 'frac-x-quad-order-flow',
  sample: sampleOverX,
  render: (params): Slide => {
    const { A, C, c } = params;
    const { x2, x0 } = quadValues(params);
    const s = sqTex(c);
    const right = `${frac('Ax + B', s)} + ${frac('C', 'x')}`;
    const forms = [right, `${frac('A', s)} + ${frac('C', 'x')}`, `${frac('Ax + B', s)} + ${frac('Cx + D', 'x')}`];
    const firsts = ['$C$, with $x = 0$', '$A$, with $x = 0$', '$B$, with $x = 1$'];
    const cs = [...new Set([C, x0, -C, x2])].map((v) => `$${v}$`);
    const as = [...new Set([A, x2, x2 + C, -A])].map((v) => `$${v}$`);
    return {
      kind: 'flow',
      prompt: [say('Plan the split of this fraction one decision at a time. Each answer decides what is asked next.')],
      subject: quadFractionTex(params),
      steps: [
        {
          id: 'form',
          ask: 'What form does the split take?',
          branches: turned(forms, `${s}|${x0}`).map((tex) =>
            tex === right ? { label: `$${tex}$`, to: 'first' } : { label: `$${tex}$`, outcome: `So you would look for the numbers in $${tex}$.` },
          ),
        },
        {
          id: 'first',
          ask: 'Which letter can be found first, from one value of $x$?',
          branches: turned(firsts, `${x0}|${x2}`).map((label) =>
            label === firsts[0] ? { label, to: 'c' } : { label, outcome: `So you would start with ${label}.` },
          ),
        },
        { id: 'c', ask: 'Put $x = 0$ into both sides. What is $C$?', branches: turned(cs, cs.join()).map((label) => ({ label, to: 'a' })) },
        {
          id: 'a',
          ask: 'And $A$, from the $x^{2}$ terms?',
          branches: turned(as, as.join()).map((label) => ({ label, outcome: `So $A = ${label.slice(1, -1)}$.` })),
        },
      ],
      answer: [`$${right}$`, firsts[0], `$${C}$`, `$${A}$`],
    };
  },
  solution: overXSolution,
};

/* ================================================================
 * Level 3, lesson 5: improper, with a quadratic factor
 * ================================================================ */

interface QuadImproperParams extends QuadSplit {
  /** The whole number in front. */
  Q: number;
  /** For the flow: a fraction with no whole part at all. */
  proper: boolean;
}

function quadImproperTop(params: QuadImproperParams): Poly {
  const rest = quadSplitTop(params);
  return params.proper ? rest : addPoly(scalePoly(quadCubic(params), params.Q), rest);
}

/**
 * Smaller letters than the proper lessons, since the whole part adds to every
 * coefficient. Difficulty 2 signs the letters and the whole number, and may
 * make the linear bracket x.
 */
function sampleQuadImproper(rng: Rng, difficulty: number, proper = false): QuadImproperParams {
  const hard = difficulty > 1;
  for (;;) {
    const a = hard ? rng.int(-3, 3) : nonZero(rng, 3);
    const c = rng.int(1, hard ? 5 : 4);
    const A = hard ? nonZero(rng, 3) : rng.int(1, 2);
    const B = nonZero(rng, 3);
    const C = hard ? nonZero(rng, 3) : rng.int(1, 2);
    if (A + C === 0) continue;
    const Q = hard ? rng.pick([2, 3, -1, -2]) : rng.pick([1, 2, 3]);
    return { A, B, C, a, c, Q, expanded: false, proper };
  }
}

const quadImproperFractionTex = (params: QuadImproperParams): string => frac(polyTex(quadImproperTop(params)), quadBottomTex(params));

const quadImproperAnswerTex = ({ A, B, C, a, c, Q }: QuadImproperParams): string =>
  `${Q} ${quadPart(A, B, sqTex(c), false)} ${signedFracTerm(C, br(a))}`;

function quadImproperSolution(params: QuadImproperParams): SolutionStep[] {
  const { A, B, C, Q } = params;
  const cubic = polyTex(quadCubic(params));
  return [
    { text: `The bottom multiplies out to $${cubic}$, a cubic like the top, so divide first. The $x^{3}$ terms give the whole number, $${Q}$.` },
    { tex: chain(`&${polyTex(quadImproperTop(params))}`, `=\\;&${paren(Q)}(${cubic})`, `&\\quad + (${polyTex(quadSplitTop(params))})`) },
    { text: `Split what is left as before: cover-up gives $C = ${C}$, and comparing coefficients gives $A = ${A}$ and $B = ${B}$.` },
    { tex: quadImproperAnswerTex(params) },
  ];
}

/** Proper or improper, and if improper, the whole number and what is left. */
const fracQuadDegreeFlow: Generator<QuadImproperParams> = {
  id: 'frac-quad-degree-flow',
  sample: (rng, difficulty) => sampleQuadImproper(rng, difficulty, rng.chance(difficulty > 1 ? 0.25 : 0.4)),
  render: (params): Slide => {
    const { Q } = params;
    const top = quadImproperTop(params);
    const bottom = quadBottomTex(params);
    const rest = quadSplitTop(params);
    const restTex = frac(polyTex(rest), bottom);
    const wholes = [...new Set([Q, -Q, Q + 1, top[1]])].map((v) => `$${v}$`);
    const rests = [
      ...new Set([
        restTex,
        frac(polyTex(scalePoly(rest, -1)), bottom),
        frac(polyTex([rest[0], rest[1], -rest[2]]), bottom),
        frac(polyTex(top.slice(1)), bottom),
      ]),
    ];
    return {
      kind: 'flow',
      prompt: [say('Before splitting, decide whether there is a whole part to divide out. Each answer decides what is asked next.')],
      subject: quadImproperFractionTex(params),
      steps: [
        {
          id: 'degree',
          ask: 'Is the degree of the top at least the degree of the bottom?',
          branches: [
            { label: 'Yes', to: 'whole' },
            { label: 'No', outcome: 'Then it is proper: it splits straight away, with no whole part.' },
          ],
        },
        {
          id: 'whole',
          ask: 'Divide the top by the bottom. What is the whole number in front?',
          branches: turned(wholes, wholes.join()).map((label) => ({ label, to: 'rest' })),
        },
        {
          id: 'rest',
          ask: 'And what proper fraction is left over to split?',
          branches: turned(rests, restTex).map((tex) => ({ label: `$${tex}$`, outcome: `So it splits as a whole number plus the parts of $${tex}$.` })),
        },
      ],
      answer: params.proper ? ['No'] : ['Yes', `$${Q}$`, `$${restTex}$`],
    };
  },
  solution: (params) =>
    params.proper
      ? [
          { text: `The top, $${polyTex(quadSplitTop(params))}$, has degree 2, and the bottom multiplies out to $${polyTex(quadCubic(params))}$, degree 3.` },
          { text: 'The top is lower, so the fraction is proper and splits straight away:' },
          { tex: quadAnswerTex(params) },
        ]
      : quadImproperSolution(params),
};

/** The whole number and both parts placed as tiles. */
const fracQuadWholeTiles: Generator<QuadImproperParams> = {
  id: 'frac-quad-whole-tiles',
  sample: (rng, difficulty) => sampleQuadImproper(rng, difficulty),
  render: (params): Slide => {
    const { A, B, C, a, c, Q } = params;
    const s = sqTex(c);
    const answer = [String(Q), quadPart(A, B, s, false), signedFracTerm(C, br(a))];
    // Forgetting that the whole part puts Qa into the x^2 terms.
    const unstripped = A + Q * a;
    return {
      kind: 'tiles',
      prompt: [
        say(`Divide first, then split. Place the whole number, then the part over $${s}$, then the part over $${br(a)}$.`),
        show(quadImproperFractionTex(params)),
      ],
      template: '{0} {1} {2}',
      bank: tileBank(answer, [
        String(-Q),
        String(Q + 1),
        quadPart(A, -B, s, false),
        ...(unstripped !== 0 ? [quadPart(unstripped, B, s, false)] : []),
        signedFracTerm(-C, br(a)),
      ]),
      answer,
    };
  },
  solution: quadImproperSolution,
};

/** Divide, then split, as a line rewritten twice. */
const fracQuadImproperSteps: Generator<QuadImproperParams> = {
  id: 'frac-quad-improper-steps',
  sample: (rng, difficulty) => sampleQuadImproper(rng, difficulty),
  render: (params): Slide => {
    const { A, B, C, a, c, Q } = params;
    const s = sqTex(c);
    const bottom = quadBottomTex(params);
    const rest = polyTex(quadSplitTop(params));
    const flipped = polyTex(scalePoly(quadSplitTop(params), -1));
    const divided = `${Q} + ${frac(rest, bottom)}`;
    const split = quadImproperAnswerTex(params);
    return {
      kind: 'steps',
      prompt: [say('Divide out the whole number first, then split what is left. Tap the line to take the next step, then choose what it becomes.')],
      start: [quadImproperFractionTex(params)],
      reductions: [
        { span: [0, 1], value: divided, bank: stepBank(divided, `${-Q} + ${frac(rest, bottom)}`, `${Q} + ${frac(flipped, bottom)}`, frac(rest, bottom)) },
        {
          span: [0, 1],
          value: split,
          bank: stepBank(
            split,
            `${Q} ${quadPart(A, -B, s, false)} ${signedFracTerm(C, br(a))}`,
            `${Q} ${quadPart(A, B, s, false)} ${signedFracTerm(-C, br(a))}`,
            quadAnswerTex(params),
          ),
        },
      ],
    };
  },
  solution: quadImproperSolution,
};

/**
 * The numbers of an improper split as a tree: the whole number, cover-up on
 * the original top (the whole part vanishes at x = -a too), then A from the
 * x^2 terms, which now include the whole part's.
 */
const fracQuadRestTree: Generator<QuadImproperParams> = {
  id: 'frac-quad-rest-tree',
  sample: (rng, difficulty) => sampleQuadImproper(rng, difficulty),
  render: (params): Slide => {
    const { A, C, a, c, Q } = params;
    const top = quadImproperTop(params);
    const t = valueAt(top, -a);
    const square = a * a + c;
    const answer = [Q, t, square, C, A];
    const x2Line = `${Q * a === 0 ? '' : `${Q * a} + `}A + C = ${top[1]}`;
    return {
      kind: 'tree',
      prompt: [
        say(
          `This is a whole number plus $${quadLettersTex(params)}$. Top row: the whole number, from the $x^{3}$ terms; the top at $x = ${-a}$; and $${sqTex(c)}$ there. Below: $C$. Last: $A$, from the $x^{2}$ terms, $${x2Line}$.`,
        ),
      ],
      expression: quadImproperFractionTex(params),
      nodes: [
        { id: 'Q', from: [] },
        { id: 'top', from: [] },
        { id: 'square', from: [] },
        { id: 'C', from: ['top', 'square'] },
        { id: 'A', from: ['Q', 'C'] },
      ],
      bank: numberBank(answer, [-Q, -C, top[1] - C, t - Q, Q + 1]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { A, C, a, c, Q } = params;
    const top = quadImproperTop(params);
    const square = a * a + c;
    return [
      { text: `The bottom multiplies out to $${polyTex(quadCubic(params))}$, so the $x^{3}$ terms give the whole number, $${Q}$.` },
      {
        text: `Put $x = ${-a}$: the whole number times the bottom is zero there too, so only $C$ survives. $${valueAt(top, -a)} = ${lettersCombo([[square, 'C']])}$, so $C = ${C}$.`,
      },
      {
        text: `The $x^{2}$ terms: the whole number times the bottom puts in ${Q * a === 0 ? 'no $x^{2}$ term' : `$${Q * a}x^{2}$`}, so $${Q * a === 0 ? '' : `${Q * a} + `}A + C = ${top[1]}$ and $A = ${A}$.`,
      },
      { tex: quadImproperAnswerTex(params) },
    ];
  },
};

export const algebraicFractionGenerators = [
  fracCancel,
  fracCancelWhich,
  fracCancelFlow,
  fracFlipSign,
  fracMultiply,
  fracDivideSteps,
  fracFlipWhich,
  fracProductValue,
  fracLcd,
  fracAddTree,
  fracSumTiles,
  fracSumCoefficient,
  fracClearTiles,
  fracEquationSteps,
  fracEquationSolve,
  fracRejectFlow,
  fracPoleSlider,
  fracZeroSlider,
  fracUndefinedWhich,
  fracHoleValue,
  fracSplitWhich,
  fracCover,
  fracSplitTree,
  fracSplitTiles,
  fracCompareTree,
  fracThreeCoverTree,
  fracThreeSteps,
  fracThreeTiles,
  fracThreeWhich,
  fracRepeatedForm,
  fracRepeatedTiles,
  fracRepeatedTree,
  fracRepeatedValue,
  fracImproperFlow,
  fracImproperSteps,
  fracImproperTiles,
  fracImproperQuotient,
  fracIntegrateTiles,
  fracIntegrateWhich,
  fracSeriesTiles,
  fracSeriesCoefficient,
  fracQuadFactoriseFlow,
  fracQuadPartsTiles,
  fracQuadFormWhich,
  fracDiscriminantTree,
  fracQuadCAndATree,
  fracQuadCoverSteps,
  fracQuadCValue,
  fracQuadCoefficientsTiles,
  fracQuadBSteps,
  fracQuadAbcTree,
  fracQuadSubstitute,
  fracQuadBValue,
  fracQuadSplitTiles,
  fracXQuadTree,
  fracXQuadCoverSteps,
  fracXQuadTiles,
  fracXQuadOrderFlow,
  fracQuadDegreeFlow,
  fracQuadWholeTiles,
  fracQuadImproperSteps,
  fracQuadRestTree,
];
