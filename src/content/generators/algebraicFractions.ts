/**
 * Algebraic and Partial Fractions.
 *
 * Level 1 is arithmetic on algebraic fractions: simplifying by cancelling a
 * factor (never a term), multiplying and dividing, adding over a common
 * denominator, solving an equation with fractions in it, and where a fraction
 * is zero or undefined. Level 2 runs the addition backwards: a fraction split
 * into partial fractions over two linear factors, over three, over a repeated
 * factor, and after dividing out a whole part; then a preview of what the
 * split is for, integrating it and expanding it as a series. Level 3 meets a
 * quadratic factor that will not split. Level 4 solves inequalities with
 * fractions in them, drawn on the number line. Level 5 reads the graph of a
 * fraction off its rule: vertical and horizontal asymptotes, holes,
 * intercepts, and all of them together in a sketch. Level 6 is the method of
 * differences: the split that makes a sum telescope, a number in front, three
 * factors regrouped into two, a top in r over squares, sums from a later r,
 * n from a given sum, and the sum to infinity.
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
import { canonicalPieces, formatSet, type Piece } from '../numberLine';
import { termTex } from './calculus';
import { type Poly, addPoly, divideBy, fromRoots, mulPoly, polyTex, scalePoly, valueAt } from './polynomials';
import { windowFor } from './numberLine';

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
  // The top's x^2 coefficient, which is A + C. Not `top[0]`: `addPoly` trims a
  // leading zero, so when A + C = 0 the top is linear and `top[0]` is its x term.
  const x2 = top.length === 3 ? top[0] : 0;
  if (b === null) return { top, x2, atA: valueAt(top, -a), atB: 0, dA: 0, dB: 0 };
  return { top, x2, atA: valueAt(top, -a), dA: b - a, atB: valueAt(top, -b), dB: (a - b) * (a - b) };
}

function repeatedSolution(params: RepeatedParams): SolutionStep[] {
  const { A, B, C, a, b } = params;
  const { top, x2, atA, dA, atB, dB } = repeatedValues(params);
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
    { text: `No value of $x$ isolates $A$, so compare the $x^{2}$ terms: $A + C = ${x2}$, so $A = ${A}$.` },
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
    const { top, x2, atA, dA, atB, dB } = repeatedValues(params);
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
          `Split into $${repeatedLettersTex(params)}$. Top row: the top at $x = ${-a}$ and $${br(b)}$ there; the top at $x = ${-b}$ and $${pbr(a)}^{2}$ there. Below: $B$ and $C$. Last: $A$, from the $x^{2}$ terms, $A + C = ${x2}$.`,
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
      bank: numberBank(answer, [-B, -C, x2 + C, a - b]),
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

/* ================================================================
 * Level 4: inequalities with fractions
 *
 * A fraction against a number, then against another fraction. The bottom's
 * sign is not known, so the inequality is never multiplied through by it:
 * either everything comes to one side and a sign table reads it, or both
 * sides are multiplied by the bottom squared, which is positive everywhere
 * the fraction has a value.
 *
 * Built outward like the rest of the file: the number k, the pole and the
 * crossing (where the fraction equals k) are drawn first and the top worked
 * out from them, so every critical value is whole and sits on a tick of the
 * number line. A fraction against zero is Inequalities & the Modulus
 * Function's `im-l1`, and is pointed at rather than taught again.
 * ================================================================ */

type Op = '<' | '<=' | '>' | '>=';

const OPS: readonly Op[] = ['<', '<=', '>', '>='];
const OP_TEX: Record<Op, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const FLIP: Record<Op, Op> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const isStrict = (op: Op): boolean => op === '<' || op === '>';
/** Whether the inequality asks for the bigger side, `>` or `\ge`. */
const pointsUp = (op: Op): boolean => op === '>' || op === '>=';
/** `<` or `\le`, for an end that is left out or included. */
const le = (closed: boolean): string => (closed ? '\\le' : '<');

/** Whether `left op right` is true. */
function compare(left: number, op: Op, right: number): boolean {
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '>') return left > right;
  return left >= right;
}

const POSITIVE = 'Positive';
const YES = 'Yes';
const NO = 'No';
const NEGATIVE = 'Negative';

/** A bracket as a factor: x itself, or (x + c). */
const factorOf = (c: number): string => (c === 0 ? 'x' : pbr(c));

/** (x + c)(x + d) as the learner reads it, a bare x put first. */
function productTex(c: number, d: number): string {
  if (c === 0 && d === 0) return 'x^{2}';
  if (d === 0) return `x${pbr(c)}`;
  return `${factorOf(c)}${factorOf(d)}`;
}

/** k(x + b) as the learner reads it: 3(x - 2), or 3x when the bottom is x. */
const timesBottom = (k: number, b: number): string => (b === 0 ? polyTex([k, 0]) : timesTex(k, br(b)));

/** lead(x - z)... for zeros z, a bare x first and a lead of 1 dropped. */
function factoredTex(lead: number, ...zeros: number[]): string {
  const body = [...zeros.filter((z) => z === 0).map(() => 'x'), ...zeros.filter((z) => z !== 0).map((z) => pbr(-z))].join('');
  if (lead === 1) return body;
  if (lead === -1) return `-${body}`;
  return `${lead}${body}`;
}

/**
 * Where `sign (x - zero) / prod (x - pole)` satisfies `op 0`.
 *
 * Each region between neighbouring critical values is tested at a point
 * inside it; a zero joins the set when the inequality is not strict, and a
 * pole never does, since the fraction has no value there. The same rule as
 * `signSet` in `inequalitiesModulus.ts`, which is file-local there.
 */
function regionSet(zeros: number[], poles: number[], sign: number, op: Op): Piece[] {
  const critical = [...new Set([...zeros, ...poles])].sort((x, y) => x - y);
  const value = (x: number) => (sign * zeros.reduce((acc, z) => acc * (x - z), 1)) / poles.reduce((acc, p) => acc * (x - p), 1);
  const ends = [-Infinity, ...critical, Infinity];
  const pieces: Piece[] = [];
  for (let i = 0; i + 1 < ends.length; i += 1) {
    const [lo, hi] = [ends[i], ends[i + 1]];
    const probe = lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (pointsUp(op) ? value(probe) > 0 : value(probe) < 0) pieces.push({ lo, hi, loClosed: false, hiClosed: false });
  }
  if (!isStrict(op)) for (const z of zeros) pieces.push({ lo: z, hi: z, loClosed: true, hiClosed: true });
  return canonicalPieces(pieces);
}

/** One piece as an inequality: `x < 2`, `x \ge -1`, `-3 < x \le 4`. */
function pieceTex(p: Piece): string {
  if (p.lo === -Infinity) return `x ${le(p.hiClosed)} ${p.hi}`;
  if (p.hi === Infinity) return `x ${p.loClosed ? '\\ge' : '>'} ${p.lo}`;
  return `${p.lo} ${le(p.loClosed)} x ${le(p.hiClosed)} ${p.hi}`;
}

/** A whole set as inequalities joined by "or". */
const setTex = (pieces: Piece[]): string => canonicalPieces(pieces).map(pieceTex).join(' \\text{ or } ');

/** The canonical answer a `numberLine` slide stores. */
const setOf = (pieces: Piece[]): string => formatSet(canonicalPieces(pieces));

/** A region between critical values, in words for a sign table or a solution. */
function regionTex(lo: number, hi: number): string {
  if (lo === -Infinity) return `x < ${hi}`;
  if (hi === Infinity) return `x > ${lo}`;
  return `${lo} < x < ${hi}`;
}

/** Each region with a point inside it, left to right. */
function regionsOf(zeros: number[], poles: number[]): { lo: number; hi: number; probe: number }[] {
  const ends = [-Infinity, ...[...zeros, ...poles].sort((x, y) => x - y), Infinity];
  return ends.slice(0, -1).map((lo, i) => {
    const hi = ends[i + 1];
    return { lo, hi, probe: lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2 };
  });
}

/**
 * A fraction against zero, read region by region: the working the whole
 * level ends in, whichever way it got there.
 */
function readSteps(zeros: number[], poles: number[], sign: number, op: Op): SolutionStep[] {
  const value = (x: number) => (sign * zeros.reduce((acc, z) => acc * (x - z), 1)) / poles.reduce((acc, p) => acc * (x - p), 1);
  const regions = regionsOf(zeros, poles).map(({ lo, hi, probe }) => `$${regionTex(lo, hi)}$: ${value(probe) > 0 ? 'positive' : 'negative'}`);
  const polesSaid = poles.length > 1 ? `$x = ${poles[0]}$ and $x = ${poles[1]}$ make` : `$x = ${poles[0]}$ makes`;
  return [
    { text: `Test one value in each region. ${regions.join('; ')}.` },
    {
      text: `${polesSaid} the bottom zero, so the fraction has no value there: ${poles.length > 1 ? 'those dots are' : 'that dot is'} hollow. ${
        isStrict(op)
          ? `The inequality is strict, so $x = ${zeros[0]}$, where the top is zero, is left out too.`
          : `The inequality is not strict, so $x = ${zeros[0]}$, where the top is zero, is in.`
      }`,
    },
    { tex: setTex(regionSet(zeros, poles, sign, op)) },
  ];
}

/* ---------- a fraction against a number ---------- */

interface AgainstParams {
  /** The top is mx + a; m is 1 except at difficulty 2. */
  m: number;
  a: number;
  /** The bottom is x + b, so the pole is at -b. */
  b: number;
  /** The number the fraction is compared with: never 0, which is `im-l1`, and never m. */
  k: number;
  /** The crossing, where the fraction equals k. */
  r: number;
  op: Op;
  /** The number line's window. */
  min: number;
  max: number;
}

const againstTop = ({ m, a }: AgainstParams): Poly => [m, a];
const againstFracTex = (params: AgainstParams): string => frac(polyTex(againstTop(params)), br(params.b));
const againstTex = (params: AgainstParams): string => `${againstFracTex(params)} ${OP_TEX[params.op]} ${params.k}`;
/** The top once k has come over: (m - k)x + (a - kb). */
const oneSideTop = ({ m, a, b, k }: AgainstParams): Poly => [m - k, a - k * b];
const againstSet = (params: AgainstParams): Piece[] => regionSet([params.r], [-params.b], params.m - params.k, params.op);
const againstAt = ({ m, a, b }: AgainstParams, x: number): number => (m * x + a) / (x + b);

/**
 * The pole and the crossing first, then the top from them: the fraction
 * less k is (m - k)(x - r)/(x + b), which fixes a = kb - (m - k)r. Difficulty
 * 2 puts a number in front of the top's x and allows a negative k.
 */
function sampleAgainst(rng: Rng, difficulty: number): AgainstParams {
  for (;;) {
    const hard = difficulty > 1;
    const m = hard && rng.chance(0.5) ? rng.int(2, 3) : 1;
    const k = rng.pick(hard ? [-3, -2, -1, 2, 3, 4, 5] : [-2, -1, 2, 3, 4]);
    const pole = rng.int(-5, 5);
    const r = rng.int(-5, 5);
    const span = Math.abs(r - pole);
    if (k === m || span === 0 || span > 8) continue;
    const b = -pole || 0;
    const a = k * b - (m - k) * r;
    if (Math.abs(a) > 25) continue;
    const [lo, hi] = [Math.min(pole, r), Math.max(pole, r)];
    return { m, a, b, k, r, op: rng.pick(OPS), ...windowFor(rng, lo, hi, span <= 6 ? 10 : 12, 2) };
  }
}

/** The usual working: to one side, then the sign table. */
function againstSolution(params: AgainstParams): SolutionStep[] {
  const { b, k, m, r, op } = params;
  return [
    { text: `Never multiply through by $${br(b)}$: its sign changes at $x = ${-b}$. Take $${k}$ over to the left and write one fraction over $${br(b)}$:` },
    { tex: `${againstFracTex(params)} ${signed(-k)} = ${frac(polyTex(oneSideTop(params)), br(b))} ${OP_TEX[op]} 0` },
    { text: `The top is zero at $x = ${r}$ and the bottom at $x = ${-b}$.` },
    ...readSteps([r], [-b], m - k, op),
  ];
}

/**
 * Solving by cases: on the side of the pole the crossing is on, is the bottom
 * positive, which way does multiplying by it leave the sign, and which part
 * of that side is in the set?
 */
const fracIneqCasesFlow: Generator<AgainstParams> = {
  id: 'frac-ineq-cases-flow',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { m, b, k, r, op } = params;
    const p = -b;
    const right = r > p;
    const caseTex = `x ${right ? '>' : '<'} ${p}`;
    const top = polyTex(againstTop(params));
    const times = timesBottom(k, b);
    const keep = `$${top} ${OP_TEX[op]} ${times}$`;
    const turn = `$${top} ${OP_TEX[FLIP[op]]} ${times}$`;
    const multiplied: Op = right ? op : FLIP[op];
    const solved: Op = m - k > 0 ? multiplied : FLIP[multiplied];
    const closed = !isStrict(op);
    const near = right ? `$${p} < x ${le(closed)} ${r}$` : `$${r} ${le(closed)} x < ${p}$`;
    const far = right ? `$x ${closed ? '\\ge' : '>'} ${r}$` : `$x ${le(closed)} ${r}$`;
    const all = `All of $${caseTex}$`;
    const none = 'None of it';
    const towardPole = right ? !pointsUp(solved) : pointsUp(solved);
    const correct = towardPole ? near : far;
    const multiply = {
      ask: `Multiply both sides by $${br(b)}$. Which inequality holds for $${caseTex}$?`,
      branches: turned([keep, turn], `${keep}|${p}`).map((label) => ({ label, to: 'solve' })),
    };
    return {
      kind: 'flow',
      prompt: [
        say(`Solve this by cases. Take the side of the pole, $x = ${p}$, that the crossing $x = ${r}$ is on, and work one decision at a time.`),
      ],
      subject: againstTex(params),
      steps: [
        {
          id: 'sign',
          ask: `For $${caseTex}$, is the bottom, $${br(b)}$, positive or negative?`,
          branches: [
            { label: POSITIVE, to: 'pos' },
            { label: NEGATIVE, to: 'neg' },
          ],
        },
        { id: 'pos', ...multiply },
        { id: 'neg', ...multiply },
        {
          id: 'solve',
          ask: `Solve that for $x$. Which part of $${caseTex}$ is in the set?`,
          branches: turned([near, far, all, none], `${near}|${op}`).map((label) => ({
            label,
            outcome: label === none ? `So nothing with $${caseTex}$ is in the set.` : `So the set holds ${label === all ? `all of $${caseTex}$` : label} on this side.`,
          })),
        },
      ],
      answer: [right ? POSITIVE : NEGATIVE, right ? keep : turn, correct],
    };
  },
  solution: (params) => {
    const { m, a, b, k, r, op } = params;
    const p = -b;
    const right = r > p;
    const multiplied: Op = right ? op : FLIP[op];
    const solved: Op = m - k > 0 ? multiplied : FLIP[multiplied];
    const steps: SolutionStep[] = [
      {
        text: `For $x ${right ? '>' : '<'} ${p}$ the bottom $${br(b)}$ is ${right ? 'positive, so multiplying by it keeps the sign' : 'negative, so multiplying by it turns the sign round'}:`,
      },
      { tex: `${polyTex(againstTop(params))} ${OP_TEX[multiplied]} ${timesBottom(k, b)}` },
      { text: 'Collect the $x$ terms on the left:' },
      { tex: `${termTex(m - k, 1)} ${OP_TEX[multiplied]} ${k * b - a}` },
    ];
    if (m - k !== 1) {
      steps.push({
        text: `Divide by $${m - k}$${m - k < 0 ? ', which is negative, so the sign turns again' : ''}: $x ${OP_TEX[solved]} ${r}$.`,
      });
    }
    const piece = regionSet([r], [p], m - k, op).find((q) => (right ? q.lo >= p : q.hi <= p));
    steps.push({ text: piece ? `Inside $x ${right ? '>' : '<'} ${p}$ that leaves $${pieceTex(piece)}$.` : 'Nothing on that side is in the set.' });
    return steps;
  },
};

interface TestParams extends AgainstParams {
  /** A test value where the bottom is negative, and the fraction whole. */
  t: number;
}

/**
 * The fraction at a point where its bottom is negative, beside what
 * multiplying through compares: k times the bottom. The two verdicts always
 * disagree there, which is the whole reason not to multiply through.
 */
const fracIneqTestTree: Generator<TestParams> = {
  id: 'frac-ineq-test-tree',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleAgainst(rng, difficulty);
      const { m, a, b, r } = params;
      const tests = [1, 2, 3, 4, 5, 6]
        .map((gap) => -b - gap)
        .filter((t) => t !== r && (m * t + a) % (t + b) === 0 && Math.abs((m * t + a) / (t + b)) <= 12);
      if (tests.length === 0) continue;
      return { ...params, t: rng.pick(tests) };
    }
  },
  render: (params): Slide => {
    const { m, a, b, k, t } = params;
    const top = m * t + a;
    const bottom = t + b;
    const value = top / bottom;
    const answer = [top, bottom, k * bottom, value];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Test $x = ${t}$, where the bottom is negative. Top row: the top and the bottom there. Below: $${k}$ times the bottom, which multiplying through compares the top with, and the value of the fraction itself.`,
        ),
      ],
      expression: againstTex(params),
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'kb', from: ['bottom'] },
        { id: 'value', from: ['top', 'bottom'] },
      ],
      bank: numberBank(answer, [-top, -bottom, -k * bottom, -value, top - bottom, k + bottom]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { m, a, b, k, t, op } = params;
    const top = m * t + a;
    const bottom = t + b;
    const value = top / bottom;
    const inSet = compare(value, op, k);
    return [
      { text: `At $x = ${t}$ the top is $${top}$ and the bottom is $${bottom}$, so $${k}$ times the bottom is $${k * bottom}$ and the fraction is $${frac(String(top), String(bottom))} = ${value}$.` },
      { text: `Multiplying through compares $${top}$ with $${k * bottom}$: $${top} ${OP_TEX[op]} ${k * bottom}$ is ${compare(top, op, k * bottom) ? 'true' : 'false'}.` },
      {
        text: `The fraction itself compares $${value}$ with $${k}$: $${value} ${OP_TEX[op]} ${k}$ is ${inSet ? 'true' : 'false'}. The two disagree because the bottom is negative, and multiplying by a negative turns the sign. So $x = ${t}$ ${inSet ? 'is' : 'is not'} in the set.`,
      },
    ];
  },
};

/**
 * Multiplying through as if the bottom were positive gives one ray; the real
 * set is two pieces, or a stretch between the pole and the crossing.
 * Distractors: that ray, the real set with the pole filled in, and the
 * regions the real set leaves out.
 */
const fracIneqSlipWhich: Generator<AgainstParams> = {
  id: 'frac-ineq-slip-which',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { m, a, b, k, r, op } = params;
    const p = -b;
    const real = againstSet(params);
    const solved: Op = m - k > 0 ? op : FLIP[op];
    const slip: Piece[] = [pointsUp(solved) ? { lo: r, hi: Infinity, loClosed: !isStrict(op), hiClosed: false } : { lo: -Infinity, hi: r, loClosed: false, hiClosed: !isStrict(op) }];
    const poleIn = real.map((q) => ({ ...q, loClosed: q.lo === p || q.loClosed, hiClosed: q.hi === p || q.hiClosed }));
    const others = regionSet([r], [p], m - k, FLIP[op]);
    const working = [`${polyTex(againstTop(params))} ${OP_TEX[op]} ${timesBottom(k, b)}`, `${termTex(m - k, 1)} ${OP_TEX[op]} ${k * b - a}`];
    if (m - k !== 1) working.push(`x ${OP_TEX[solved]} ${r}`);
    return choiceSlide(
      [
        show(againstTex(params)),
        say(`Multiplying both sides by $${br(b)}$ gives this:`),
        show(chain(...working.map((line) => `&${line}`))),
        say(`That treats $${br(b)}$ as positive for every $x$. Which is the real solution set?`),
      ],
      options({ tex: setTex(real) }, { tex: setTex(slip) }, { tex: setTex(poleIn) }, { tex: setTex(others) }),
    );
  },
  solution: againstSolution,
};

/** Where the fraction equals k: the one place besides the pole where the answer can change. */
const fracIneqCrossing: Generator<AgainstParams> = {
  id: 'frac-ineq-crossing',
  sample: sampleAgainst,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      show(`${againstFracTex(params)} = ${params.k}`),
      say(
        `A fraction can only get from one side of $${params.k}$ to the other where it equals $${params.k}$, or at its pole. Where does this one equal $${params.k}$?`,
      ),
    ],
    lead: 'x =',
    keypad: [],
    answer: String(params.r),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { m, a, b, k, r } = params;
    const steps: SolutionStep[] = [
      { text: `Multiply both sides by $${br(b)}$. In an equation that is safe: there is no sign to turn round.` },
      { tex: `${polyTex(againstTop(params))} = ${timesBottom(k, b)}` },
      { tex: `${termTex(m - k, 1)} = ${k * b - a}` },
    ];
    if (m - k !== 1) steps.push({ tex: `x = ${r}` });
    return steps;
  },
};

/* ---------- to one side ---------- */

/** The fraction less k as one fraction, in two taps: k over the bottom, then the difference. */
const fracIneqOneSideSteps: Generator<AgainstParams> = {
  id: 'frac-ineq-one-side-steps',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { m, a, b, k } = params;
    const size = Math.abs(k);
    const bottom = br(b);
    const over = (p: Poly) => frac(polyTex(p), bottom);
    const kOver = over([size, size * b]);
    return {
      kind: 'steps',
      prompt: [
        show(againstTex(params)),
        say(
          `Take $${k}$ over to the left, so the right side is $0$, and write the left as one fraction. Tap the part you would work out **next**, then choose what it becomes.`,
        ),
      ],
      start: [over(againstTop(params)), k > 0 ? '-' : '+', String(size)],
      reductions: [
        {
          span: [2, 3],
          value: kOver,
          bank: stepBank(kOver, over([size, b]), frac(String(size), bottom), over([size, -size * b]), frac(bottom, String(size))),
        },
        {
          span: [0, 3],
          operator: 1,
          value: over(oneSideTop(params)),
          bank: stepBank(over(oneSideTop(params)), over([m - k, a + k * b]), over([m + k, a + k * b]), over([k - m, k * b - a])),
        },
      ],
    };
  },
  solution: (params) => {
    const { b, k } = params;
    const size = Math.abs(k);
    const kOver = frac(polyTex([size, size * b]), br(b));
    return [
      { text: `Write $${size}$ over the bottom: $${size} = ${kOver}$.` },
      {
        tex: chain(
          `&${againstFracTex(params)} ${k > 0 ? '-' : '+'} ${kOver}`,
          `=\\;&${frac(`${polyTex(againstTop(params))} ${k > 0 ? '-' : '+'} (${polyTex([size, size * b])})`, br(b))}`,
        ),
      },
      { text: `Clear the bracket, minding the sign in front of it:` },
      { tex: frac(polyTex(oneSideTop(params)), br(b)) },
      { text: `So the inequality is $${frac(polyTex(oneSideTop(params)), br(b))} ${OP_TEX[params.op]} 0$, a fraction against zero, which a sign table reads.` },
    ];
  },
};

/** The top of the fraction less k, placed as two terms. */
const fracIneqNewTopTiles: Generator<AgainstParams> = {
  id: 'frac-ineq-new-top-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleAgainst(rng, difficulty);
      if (params.r !== 0) return params;
    }
  },
  render: (params): Slide => {
    const { m, a, b, k } = params;
    const answer = termTiles(oneSideTop(params));
    return {
      kind: 'tiles',
      prompt: [
        show(`${againstFracTex(params)} ${signed(-k)}`),
        say(`Write this as one fraction over $${br(b)}$. Place its top.`),
      ],
      template: '\\text{top: } {0} {1}',
      bank: tileBank(answer, [
        ...termTiles([m - k, a + k * b]),
        ...termTiles([m + k, a + k * b]),
        ...termTiles([m - k, a - b]),
        ...termTiles([k - m, k * b - a]),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { b, k } = params;
    return [
      { text: `Over $${br(b)}$, $${k}$ is $${frac(timesBottom(k, b), br(b))}$, so the top is the old top less $${timesBottom(k, b)}$:` },
      {
        tex: chain(
          `&${polyTex(againstTop(params))} - ${k === 1 ? factorOf(b) : `${paren(k)}${factorOf(b)}`}`,
          `=\\;&${polyTex(oneSideTop(params))}`,
        ),
      },
    ];
  },
};

/** The critical values from the one-side form: the top's two numbers, the pole, and the crossing. */
const fracIneqCriticalTree: Generator<AgainstParams> = {
  id: 'frac-ineq-critical-tree',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { a, b, k, m, r } = params;
    const [coef, num] = oneSideTop(params);
    const answer = [coef, num, -b, r];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Bring it to one side over $${br(b)}$. Top row: the $x$ coefficient and the number in the new top, then where the bottom is zero. Below: where the top is zero.`,
        ),
      ],
      expression: againstTex(params),
      nodes: [
        { id: 'coef', from: [] },
        { id: 'num', from: [] },
        { id: 'pole', from: [] },
        { id: 'cross', from: ['coef', 'num'] },
      ],
      bank: numberBank(answer, [-coef, -num, b, -r, a + k * b, m + k]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { b, r } = params;
    const top = oneSideTop(params);
    return [
      { tex: `${againstFracTex(params)} ${signed(-params.k)} = ${frac(polyTex(top), br(b))}` },
      { text: `The new top is $${polyTex(top)}$: $x$ coefficient $${top[0]}$, number $${top[1]}$. The bottom is zero at $x = ${-b}$.` },
      { text: `The top is zero where $${termTex(top[0], 1)} = ${-top[1]}$, at $x = ${r}$.` },
    ];
  },
};

/** A fraction against a number, shaded on the line. */
const fracIneqLine: Generator<AgainstParams> = {
  id: 'frac-ineq-line',
  sample: sampleAgainst,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      say('Shade the solution set. Bring everything to one side first, and never multiply through by the bottom.'),
      show(againstTex(params)),
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(againstSet(params)),
  }),
  solution: againstSolution,
};

/* ---------- multiplying by the square ---------- */

/** k(x + b) on the right, bracketed so a minus in front of it reads right. */
function kBracket(size: number, b: number): string {
  if (b === 0) return polyTex([size, 0]);
  return size === 1 ? pbr(b) : `${size}${pbr(b)}`;
}

/** The top as a factor: (x + 3), or 2x when it has no number. */
const topFactor = (params: AgainstParams): string => (params.a === 0 ? polyTex(againstTop(params)) : `(${polyTex(againstTop(params))})`);

/** (x + b)^2 as the learner reads it. */
const squareTex = (b: number): string => `${factorOf(b)}^{2}`;

/** The line multiplying by the square leaves: top times bottom, less k times the square. */
function squaredLine(params: AgainstParams): string[] {
  const { b, k } = params;
  const size = Math.abs(k);
  const first = b === 0 ? `x${topFactor(params)}` : `${topFactor(params)}${pbr(b)}`;
  return [first, k > 0 ? '-' : '+', `${size === 1 ? '' : size}${squareTex(b)}`];
}

function squareSolution(params: AgainstParams): SolutionStep[] {
  const { m, b, k, r, op } = params;
  const p = -b;
  return [
    { text: `$${squareTex(b)}$ is positive for every $x$ except $${p}$, so multiplying by it keeps the sign:` },
    { tex: chain(`&${squaredLine(params)[0]}`, `&${squaredLine(params).slice(1).join(' ')} ${OP_TEX[op]} 0`) },
    { text: `Take out the common bracket $${factorOf(b)}$ and tidy what is left:` },
    { tex: `${factoredTex(m - k, p, r)} ${OP_TEX[op]} 0` },
    {
      text: `A quadratic with roots $${Math.min(p, r)}$ and $${Math.max(p, r)}$. But the fraction has no value at $x = ${p}$, so that end is always hollow.`,
    },
    { tex: setTex(againstSet(params)) },
  ];
}

/** Factorising top times bottom less k times the square, one tap at a time. */
const fracIneqSquareSteps: Generator<AgainstParams> = {
  id: 'frac-ineq-square-steps',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { m, a, b, k, r, op } = params;
    const p = -b;
    const size = Math.abs(k);
    const [sign, other] = k > 0 ? ['-', '+'] : ['+', '-'];
    const top = polyTex(againstTop(params));
    const out = factorOf(b);
    const inner = `${out}[${top} ${sign} ${kBracket(size, b)}]`;
    const tidy = (q: Poly) => `${out}(${polyTex(q)})`;
    const factored = factoredTex(m - k, p, r);
    const lastSlips = [factoredTex(m - k, p, -r), factoredTex(k - m, p, r)];
    if (Math.abs(m - k) !== 1) lastSlips.push(factoredTex(1, p, r));
    else lastSlips.push(factoredTex(m - k, -p, r));
    return {
      kind: 'steps',
      prompt: [
        say(
          `Multiply both sides of $${againstTex(params)}$ by $${squareTex(b)}$, which is never negative, and bring everything to the left: the line below is $${OP_TEX[op]} 0$. Factorise it. Tap the part you would work out **next**, then choose what it becomes.`,
        ),
      ],
      start: squaredLine(params),
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: inner,
          bank: stepBank(inner, `${out}[${top} ${sign} ${size}]`, `${out}[${top} ${other} ${kBracket(size, b)}]`, `${squareTex(b)}[${top} ${sign} ${size}]`),
        },
        {
          span: [0, 1],
          value: tidy(oneSideTop(params)),
          bank: stepBank(tidy(oneSideTop(params)), tidy([m - k, a + k * b]), tidy([m + k, a + k * b]), tidy([m - k, a - b]), tidy([k - m, k * b - a])),
        },
        { span: [0, 1], value: factored, bank: stepBank(factored, ...lastSlips) },
      ],
    };
  },
  solution: squareSolution,
};

/** Top times bottom less k times the square, multiplied out. */
const fracIneqSquareTiles: Generator<AgainstParams> = {
  id: 'frac-ineq-square-tiles',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleAgainst(rng, difficulty);
      if (params.b !== 0 && params.r !== 0 && params.b !== params.r) return params;
    }
  },
  render: (params): Slide => {
    const { b, k, op } = params;
    const times = mulPoly(againstTop(params), lin(b));
    const answer = termTiles(addPoly(times, scalePoly(quad(b, b), -k)));
    return {
      kind: 'tiles',
      prompt: [
        show(againstTex(params)),
        say(
          `Multiply both sides by $${pbr(b)}^{2}$, which is positive wherever the fraction has a value, and bring everything to the left. Place the quadratic, multiplied out.`,
        ),
      ],
      template: `{0} {1} {2} ${OP_TEX[op]} 0`,
      bank: tileBank(answer, [
        ...termTiles(addPoly(times, scalePoly([1, 0, b * b], -k))),
        ...termTiles(addPoly(times, scalePoly(quad(b, b), k))),
        ...termTiles(addPoly(times, scalePoly(lin(b), -k))),
      ]),
      answer,
    };
  },
  solution: (params) => {
    const { b, k, op } = params;
    const times = mulPoly(againstTop(params), lin(b));
    const square = scalePoly(quad(b, b), k);
    return [
      { text: `Multiply both sides by $${pbr(b)}^{2}$. On the left the bottom cancels one of its two factors:` },
      { tex: `${topFactor(params)}${pbr(b)} ${OP_TEX[op]} ${k === 1 ? '' : k === -1 ? '-' : k}${pbr(b)}^{2}` },
      { text: `Multiply out: the left is $${polyTex(times)}$ and the right is $${polyTex(square)}$. Take the right from both sides:` },
      { tex: `${polyTex(addPoly(times, scalePoly(square, -1)))} ${OP_TEX[op]} 0` },
    ];
  },
};

/**
 * The squared form given factorised, and the set shaded. The pole is a root
 * of the quadratic, so with `\le` or `\ge` the quadratic includes it and the
 * fraction does not. Difficulty 2 is always one of those.
 */
const fracIneqSquareLine: Generator<AgainstParams> = {
  id: 'frac-ineq-square-line',
  sample: (rng, difficulty) => {
    const params = sampleAgainst(rng, difficulty);
    return difficulty > 1 ? { ...params, op: rng.pick<Op>(['<=', '>=']) } : params;
  },
  render: (params): Slide => {
    const { m, b, k, r, op } = params;
    return {
      kind: 'numberLine',
      prompt: [
        show(againstTex(params)),
        say(
          `Multiplied by $${squareTex(b)}$, it becomes $${factoredTex(m - k, -b, r)} ${OP_TEX[op]} 0$. Shade the solution set of the fraction inequality.`,
        ),
      ],
      min: params.min,
      max: params.max,
      step: 1,
      answer: setOf(againstSet(params)),
    };
  },
  solution: squareSolution,
};

const UP = 'Upwards, like a U';
const DOWN = 'Downwards, like an n';
const BETWEEN = 'Between the roots';
const OUTSIDE = 'Outside the roots';
const POLE_IN = 'Yes, the quadratic is zero there';
const POLE_OUT = 'No, the fraction has no value there';
const FILLED = 'Yes, a filled dot';
const HOLLOW = 'No, a hollow dot';

/** Reading the squared form: which way it opens, which side of the roots, and each end. */
const fracIneqShapeFlow: Generator<AgainstParams> = {
  id: 'frac-ineq-shape-flow',
  sample: sampleAgainst,
  render: (params): Slide => {
    const { m, b, k, r, op } = params;
    const p = -b;
    const lead = m - k;
    const between = lead > 0 !== pointsUp(op);
    const key = `${p}|${r}|${op}|${lead}`;
    return {
      kind: 'flow',
      prompt: [say(`Multiplying $${againstTex(params)}$ by $${squareTex(b)}$ gave the inequality below. Read its solution set one decision at a time.`)],
      subject: `${factoredTex(lead, p, r)} ${OP_TEX[op]} 0`,
      steps: [
        {
          id: 'shape',
          ask: `Its $x^{2}$ coefficient is $${lead}$. Which way does the graph of the left side open?`,
          branches: turned([UP, DOWN], key).map((label) => ({ label, to: 'where' })),
        },
        {
          id: 'where',
          ask: `It asks for ${pointsUp(op) ? 'positive' : 'negative'} values${isStrict(op) ? '' : ', or zero'}. Where are they?`,
          branches: turned([BETWEEN, OUTSIDE], `${key}|where`).map((label) => ({ label, to: 'pole' })),
        },
        {
          id: 'pole',
          ask: `The roots are $x = ${p}$ and $x = ${r}$. Is $x = ${p}$ in the set of the fraction inequality?`,
          branches: turned([POLE_IN, POLE_OUT], `${key}|pole`).map((label) => ({ label, to: 'cross' })),
        },
        {
          id: 'cross',
          ask: `And $x = ${r}$, where the fraction equals $${k}$?`,
          branches: turned([FILLED, HOLLOW], `${key}|cross`).map((label) => ({
            label,
            outcome: label === FILLED ? `So $x = ${r}$ is in the set.` : `So $x = ${r}$ is left out.`,
          })),
        },
      ],
      answer: [lead > 0 ? UP : DOWN, between ? BETWEEN : OUTSIDE, POLE_OUT, isStrict(op) ? HOLLOW : FILLED],
    };
  },
  solution: (params) => {
    const { m, b, k, r, op } = params;
    const p = -b;
    const lead = m - k;
    const between = lead > 0 !== pointsUp(op);
    return [
      { text: `The $x^{2}$ coefficient is $${lead}$, so the graph opens ${lead > 0 ? 'upwards' : 'downwards'}: it is ${lead > 0 ? 'negative between the roots and positive outside' : 'positive between the roots and negative outside'}.` },
      { text: `It asks for ${pointsUp(op) ? 'positive' : 'negative'} values, so the set is ${between ? 'between' : 'outside'} the roots.` },
      { text: `$x = ${p}$ is the pole: the fraction has no value there, so it is hollow whatever the quadratic does. $x = ${r}$ is ${isStrict(op) ? 'left out, since the inequality is strict' : 'in, since the inequality is not strict'}.` },
      { tex: setTex(againstSet(params)) },
    ];
  },
};

/* ---------- a fraction against a fraction ---------- */

interface TwoParams {
  /** (x + a)/(x + b) against (x + c)/(x + d). */
  a: number;
  b: number;
  c: number;
  d: number;
  /** The x coefficient of the difference's top, a + d - b - c. */
  s: number;
  /** Where the two fractions are equal. */
  r: number;
  op: Op;
  min: number;
  max: number;
}

const twoTex = ({ a, b, c, d, op }: TwoParams): string => `${frac(br(a), br(b))} ${OP_TEX[op]} ${frac(br(c), br(d))}`;
const twoDifferenceTex = ({ a, b, c, d }: TwoParams): string => `${frac(br(a), br(b))} - ${frac(br(c), br(d))}`;
/** The top of the difference over (x + b)(x + d): the x^2 terms cancel. */
const twoTop = ({ a, b, c, d, s }: TwoParams): Poly => [s, a * d - b * c];
const twoSet = (params: TwoParams): Piece[] => regionSet([params.r], [-params.b, -params.d], params.s, params.op);

/**
 * Two poles and a crossing first, and the top's x coefficient s. The top is
 * (x + a)(x + d) - (x + c)(x + b) = s(x - r), which fixes c = d - s(r + d)/(d - b)
 * and a = c + s - d + b: redrawn until c is whole.
 */
function sampleTwo(rng: Rng, difficulty: number): TwoParams {
  for (;;) {
    const hard = difficulty > 1;
    const p1 = rng.int(-5, 5);
    const p2 = rng.int(-5, 5);
    const r = rng.int(-5, 5);
    const s = hard ? rng.int(2, 3) * rng.sign() : nonZero(rng, 2);
    if (new Set([p1, p2, r]).size < 3 || (hard && (p1 === 0 || p2 === 0))) continue;
    const lo = Math.min(p1, p2, r);
    const hi = Math.max(p1, p2, r);
    if (hi - lo > 8) continue;
    const b = -p1 || 0;
    const d = -p2 || 0;
    const shift = s * (r + d);
    if (shift % (d - b) !== 0) continue;
    const c = d - shift / (d - b) || 0;
    const a = c + s - d + b;
    if (a === b || c === d || Math.abs(a) > 12 || Math.abs(c) > 12 || (hard && (a === 0 || c === 0))) continue;
    return { a, b, c, d, s, r, op: rng.pick(OPS), ...windowFor(rng, lo, hi, hi - lo <= 6 ? 10 : 12, 2) };
  }
}

/** The difference's top multiplied out, a line at a time so it fits a phone. */
function twoTopWorking(params: TwoParams): string {
  const { a, b, c, d } = params;
  return chain(`&${polyTex(mulPoly(lin(a), lin(d)))}`, `-\\;&(${polyTex(mulPoly(lin(c), lin(b)))})`, `=\\;&${polyTex(twoTop(params))}`);
}

function twoSolution(params: TwoParams): SolutionStep[] {
  const { a, b, c, d, s, r, op } = params;
  return [
    {
      text: `Take the right-hand fraction to the left and put both over $${productTex(b, d)}$. The top is $${productTex(a, d)} - ${productTex(c, b)}$, multiplied out:`,
    },
    { tex: twoTopWorking(params) },
    { text: `The $x^{2}$ terms cancel, so the top is linear, zero at $x = ${r}$. The bottom is zero at $x = ${-b}$ and $x = ${-d}$.` },
    { tex: `${frac(polyTex(twoTop(params)), productTex(b, d))} ${OP_TEX[op]} 0` },
    ...readSteps([r], [-b, -d].sort((x, y) => x - y), s, op),
  ];
}

/** The difference over the product of the bottoms, then its top tidied. */
const fracIneqTwoSteps: Generator<TwoParams> = {
  id: 'frac-ineq-two-steps',
  sample: sampleTwo,
  render: (params): Slide => {
    const { a, b, c, d, s } = params;
    const bottom = productTex(b, d);
    const over = (top: string) => frac(top, bottom);
    const combined = over(`${productTex(a, d)} - ${productTex(c, b)}`);
    const tidied = over(polyTex(twoTop(params)));
    return {
      kind: 'steps',
      prompt: [
        show(twoTex(params)),
        say('Take the right-hand fraction over to the left and write the difference as one fraction. Tap the part you would work out **next**, then choose what it becomes.'),
      ],
      start: [frac(br(a), br(b)), '-', frac(br(c), br(d))],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: combined,
          bank: stepBank(combined, over(`${productTex(a, b)} - ${productTex(c, d)}`), over(`${factorOf(a)} - ${factorOf(c)}`), over(`${productTex(a, d)} + ${productTex(c, b)}`)),
        },
        {
          span: [0, 1],
          value: tidied,
          bank: stepBank(tidied, over(polyTex([s, a * d + b * c])), over(polyTex([a + d + b + c, a * d + b * c])), over(polyTex([-s, b * c - a * d]))),
        },
      ],
    };
  },
  solution: twoSolution,
};

/** The numbers in the difference's top, then where it is zero. */
const fracIneqTwoTopTree: Generator<TwoParams> = {
  id: 'frac-ineq-two-top-tree',
  sample: sampleTwo,
  render: (params): Slide => {
    const { a, b, c, d, s, r } = params;
    const answer = [a * d, c * b, s, a * d - b * c, r];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Over $${productTex(b, d)}$ the top is $${productTex(a, d)} - ${productTex(c, b)}$, and its $x^{2}$ terms cancel. Top row: the number from each product, then the $x$ coefficient left over. Below: the number in the top. Last: where the top is zero.`,
        ),
      ],
      expression: twoTex(params),
      nodes: [
        { id: 'ad', from: [] },
        { id: 'cb', from: [] },
        { id: 'x', from: [] },
        { id: 'num', from: ['ad', 'cb'] },
        { id: 'cross', from: ['x', 'num'] },
      ],
      bank: numberBank(answer, [a * d + b * c, -s, a - c, b * d, -r, b * c - a * d]),
      answer: answer.map(String),
    };
  },
  solution: (params) => {
    const { a, b, c, d, s, r } = params;
    return [
      { text: `The numbers: $${a} \\times ${paren(d)} = ${a * d}$ and $${c} \\times ${paren(b)} = ${c * b}$, so the top's number is $${a * d} - ${paren(c * b)} = ${a * d - b * c}$.` },
      { text: `The $x$ terms: $${a} + ${paren(d)}$ from the first product less $${c} + ${paren(b)}$ from the second, which is $${s}$.` },
      { tex: `${polyTex(twoTop(params))} = 0 \\;\\Rightarrow\\; x = ${r}` },
    ];
  },
};

/** Two fractions against each other, shaded on the line: two poles and a crossing. */
const fracIneqTwoLine: Generator<TwoParams> = {
  id: 'frac-ineq-two-line',
  sample: sampleTwo,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [say('Shade the solution set. Bring it to one side over the product of the bottoms, then read the signs.'), show(twoTex(params))],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(twoSet(params)),
  }),
  solution: twoSolution,
};

/**
 * The difference as one fraction, from four. Distractors: the products
 * crossed the wrong way, the minus reaching only the first term, and the
 * two fractions added.
 */
const fracIneqTwoTopWhich: Generator<TwoParams> = {
  id: 'frac-ineq-two-top-which',
  sample: sampleTwo,
  render: (params): Slide => {
    const { a, b, c, d } = params;
    const over = (top: Poly) => frac(polyTex(top), productTex(b, d));
    return choiceSlide(
      [show(twoDifferenceTex(params)), say(`Which is this written as one fraction over $${productTex(b, d)}$?`)],
      options(
        { tex: over(twoTop(params)) },
        ...[
          [a + b - c - d, a * b - c * d],
          [a + d + b + c, a * d + b * c],
          [2, a + d + b + c, a * d + b * c],
          [params.s, a * d + b * c],
          [-params.s, b * c - a * d],
        ].map((top) => ({ tex: over(top) })),
      ).slice(0, 4),
    );
  },
  solution: (params) => {
    const { a, b, c, d } = params;
    return [
      {
        text: `Over $${productTex(b, d)}$ the top is $${productTex(a, d)} - ${productTex(c, b)}$. Multiply out each product, and let the minus reach every term of the second:`,
      },
      { tex: twoTopWorking(params) },
      { text: 'The $x^{2}$ terms cancel, so the top is linear.' },
    ];
  },
};

/* ---------- reading the answer ---------- */

interface ReadParams {
  /** One fraction against a number, or two fractions against each other. */
  one?: AgainstParams;
  two?: TwoParams;
}

/** What every reading question needs, from either shape. */
function readModel({ one, two }: ReadParams) {
  if (one) {
    return {
      tex: againstTex(one),
      overOne: frac(polyTex(oneSideTop(one)), br(one.b)),
      zeros: [one.r],
      poles: [-one.b],
      sign: one.m - one.k,
      op: one.op,
      top: (x: number) => valueAt(oneSideTop(one), x),
      bottom: (x: number) => x + one.b,
      min: one.min,
      max: one.max,
      solution: againstSolution(one),
    };
  }
  const params = two!;
  return {
    tex: twoTex(params),
    overOne: frac(polyTex(twoTop(params)), productTex(params.b, params.d)),
    zeros: [params.r],
    poles: [-params.b, -params.d].sort((x, y) => x - y),
    sign: params.s,
    op: params.op,
    top: (x: number) => valueAt(twoTop(params), x),
    bottom: (x: number) => (x + params.b) * (x + params.d),
    min: params.min,
    max: params.max,
    solution: twoSolution(params),
  };
}

const sampleRead = (rng: Rng, difficulty: number): ReadParams =>
  difficulty > 1 ? { two: sampleTwo(rng, difficulty) } : { one: sampleAgainst(rng, difficulty) };

const signCell = (value: number): string => (value > 0 ? '+' : '-');

/**
 * A region as a row of the sign table: below -5, -5 to -2, above 0. In words
 * rather than as inequalities, which run a four-region table off a phone.
 */
function rowTex(lo: number, hi: number): string {
  if (lo === -Infinity) return `\\text{below } {${hi}}`;
  if (hi === Infinity) return `\\text{above } {${lo}}`;
  return `{${lo}} \\text{ to } {${hi}}`;
}

/**
 * The sign table given, one row per region, and the set to shade from it.
 * What is left is the reading: which rows the inequality wants, and which
 * dots are filled. Difficulty 2 is two fractions, with four regions.
 */
const fracIneqTableLine: Generator<ReadParams> = {
  id: 'frac-ineq-table-line',
  sample: sampleRead,
  render: (params): Slide => {
    const model = readModel(params);
    const rows = regionsOf(model.zeros, model.poles).map(
      ({ lo, hi, probe }) => `${rowTex(lo, hi)} & ${signCell(model.top(probe))} & ${signCell(model.bottom(probe))}`,
    );
    return {
      kind: 'numberLine',
      prompt: [
        show(model.tex),
        say(
          `Over one bottom it is $${model.overOne} ${OP_TEX[model.op]} 0$. The table gives the signs of its top and bottom in each region. Shade the solution set.`,
        ),
        show(`\\def\\arraystretch{1.3}\\begin{array}{c|c|c} & \\text{top} & \\text{bottom} \\\\ \\hline ${rows.join(' \\\\ ')} \\end{array}`),
      ],
      min: model.min,
      max: model.max,
      step: 1,
      answer: setOf(regionSet(model.zeros, model.poles, model.sign, model.op)),
    };
  },
  solution: (params) => {
    const model = readModel(params);
    return [
      {
        text: `Same signs on top and bottom make the fraction positive; different signs make it negative. The inequality wants it ${pointsUp(model.op) ? 'positive' : 'negative'}. ${
          model.poles.length > 1 ? `The poles, $${model.poles[0]}$ and $${model.poles[1]}$, are` : `The pole, $${model.poles[0]}$, is`
        } always hollow; the zero of the top, $${model.zeros[0]}$, is ${isStrict(model.op) ? 'hollow, since the inequality is strict' : 'filled, since the inequality is not strict'}.`,
      },
      { tex: setTex(regionSet(model.zeros, model.poles, model.sign, model.op)) },
    ];
  },
};

interface LeastParams extends ReadParams {
  which: 'least' | 'greatest';
}

/** The least or greatest whole number in a set, when it has one. */
function wholeEnd(pieces: Piece[], which: 'least' | 'greatest'): number | undefined {
  const ordered = which === 'least' ? pieces : [...pieces].reverse();
  const end = which === 'least' ? ordered[0]?.lo : ordered[0]?.hi;
  if (end === undefined || !Number.isFinite(end)) return undefined;
  const inSet = (n: number) =>
    pieces.some((q) => (n > q.lo || (n === q.lo && q.loClosed)) && (n < q.hi || (n === q.hi && q.hiClosed)));
  const step = which === 'least' ? 1 : -1;
  for (let n = end, tries = 0; tries < 40; n += step, tries += 1) if (inSet(n)) return n;
  return undefined;
}

/**
 * The least (or greatest) whole number satisfying it: a set with a pole at
 * that end gives the number next to it, not the pole. Drawn only where the
 * set has such an end.
 */
const fracIneqLeastWhole: Generator<LeastParams> = {
  id: 'frac-ineq-least-whole',
  sample: (rng, difficulty) => {
    for (;;) {
      const params = sampleRead(rng, difficulty);
      const model = readModel(params);
      const pieces = regionSet(model.zeros, model.poles, model.sign, model.op);
      const ways = (['least', 'greatest'] as const).filter((which) => wholeEnd(pieces, which) !== undefined);
      if (ways.length === 0) continue;
      return { ...params, which: rng.pick(ways) };
    }
  },
  render: (params): Slide => {
    const model = readModel(params);
    const pieces = regionSet(model.zeros, model.poles, model.sign, model.op);
    return {
      kind: 'expression',
      prompt: [show(model.tex), say(`What is the ${params.which} whole number $x$ that satisfies this?`)],
      lead: 'x =',
      keypad: [],
      answer: String(wholeEnd(pieces, params.which)),
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const model = readModel(params);
    const pieces = regionSet(model.zeros, model.poles, model.sign, model.op);
    const n = wholeEnd(pieces, params.which)!;
    const piece = params.which === 'least' ? pieces[0] : pieces[pieces.length - 1];
    const end = params.which === 'least' ? piece.lo : piece.hi;
    const closed = params.which === 'least' ? piece.loClosed : piece.hiClosed;
    const holds = n >= piece.lo && n <= piece.hi;
    let why = '.';
    if (!holds) why = `: $${pieceTex(piece)}$ holds no whole number at all.`;
    else if (!closed && n !== end) {
      why = `, not $${end}$: ${model.poles.includes(end) ? 'that is a pole, where the fraction has no value' : 'the inequality is strict, so the end itself is left out'}.`;
    }
    return [...model.solution, { text: `The ${params.which} whole number in it is $${n}$${why}` }];
  },
};

interface MemberParams extends AgainstParams {
  v: number;
  what: 'pole' | 'cross' | 'other';
}

const AT_POLE = 'The bottom is zero';
const NEITHER = 'Neither';
const ABOVE = 'Above';
const BELOW = 'Below';

/** Is one value in the set? The pole never; the crossing when not strict; anything else by a test. */
const fracIneqMemberFlow: Generator<MemberParams> = {
  id: 'frac-ineq-member-flow',
  sample: (rng, difficulty) => {
    const params = sampleAgainst(rng, difficulty);
    const what = rng.pick<MemberParams['what']>(['pole', 'cross', 'other', 'other']);
    if (what === 'pole') return { ...params, what, v: -params.b };
    if (what === 'cross') return { ...params, what, v: params.r };
    const values = [];
    for (let x = params.min + 1; x < params.max; x += 1) if (x !== -params.b && x !== params.r) values.push(x);
    return { ...params, what, v: rng.pick(values) };
  },
  render: (params): Slide => {
    const { k, v, op, what } = params;
    const equals = `The fraction equals $${k}$`;
    const member = (id: string) => ({
      id,
      ask: `So is $x = ${v}$ in the solution set?`,
      branches: [
        { label: YES, outcome: `Yes: $x = ${v}$ is in the set.` },
        { label: NO, outcome: `No: $x = ${v}$ is left out.` },
      ],
    });
    const above = what === 'other' && againstAt(params, v) > k;
    const inSet = what === 'pole' ? false : what === 'cross' ? !isStrict(op) : compare(againstAt(params, v), op, k);
    const first = what === 'pole' ? AT_POLE : what === 'cross' ? equals : NEITHER;
    return {
      kind: 'flow',
      prompt: [say(`Decide whether $x = ${v}$ satisfies this, one question at a time.`)],
      subject: againstTex(params),
      steps: [
        {
          id: 'what',
          ask: `What happens at $x = ${v}$?`,
          branches: turned(
            [
              { label: AT_POLE, to: 'pole' },
              { label: equals, to: 'cross' },
              { label: NEITHER, to: 'test' },
            ],
            `${v}|${k}|${op}`,
          ),
        },
        member('pole'),
        member('cross'),
        {
          id: 'test',
          ask: `Is the fraction above or below $${k}$ at $x = ${v}$?`,
          branches: [
            { label: ABOVE, to: 'in-above' },
            { label: BELOW, to: 'in-below' },
          ],
        },
        member('in-above'),
        member('in-below'),
      ],
      answer: what === 'other' ? [first, above ? ABOVE : BELOW, inSet ? YES : NO] : [first, inSet ? YES : NO],
    };
  },
  solution: (params) => {
    const { m, a, b, k, v, op, what } = params;
    if (what === 'pole') {
      return [{ text: `At $x = ${v}$ the bottom $${br(b)}$ is zero, so the fraction has no value there. A pole is never in the set, whatever the sign says.` }];
    }
    if (what === 'cross') {
      return [
        { text: `At $x = ${v}$ the top is $${m * v + a}$ and the bottom is $${v + b}$, so the fraction is exactly $${k}$.` },
        { text: `${isStrict(op) ? 'The inequality is strict, so equal is not enough: it is left out.' : 'The inequality is not strict, so equal counts: it is in.'}` },
      ];
    }
    const top = m * v + a;
    const bottom = v + b;
    const inSet = compare(againstAt(params, v), op, k);
    return [
      { text: `At $x = ${v}$ the fraction is $${frac(String(top), String(bottom))}$, which is neither undefined nor $${k}$.` },
      { text: `It is ${againstAt(params, v) > k ? 'above' : 'below'} $${k}$, so $x = ${v}$ ${inSet ? 'is' : 'is not'} in the set of $${againstTex(params)}$.` },
    ];
  },
};

interface GraphParams extends AgainstParams {
  which: 'pole' | 'crossing';
  left: number;
  right: number;
}

const graphTrack = ({ b, r, left, right }: GraphParams): [number, number] => [Math.min(-b, r) - left, Math.max(-b, r) + right];
const graphAsked = (params: GraphParams): number => (params.which === 'pole' ? -params.b : params.r);

/**
 * The curve and the line y = k: the answer changes only where they meet and
 * where the curve shoots off. The marker goes to the one asked for.
 */
const fracIneqGraphSlider: Generator<GraphParams> = {
  id: 'frac-ineq-graph-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const params: GraphParams = {
        ...sampleAgainst(rng, difficulty),
        which: rng.pick<GraphParams['which']>(['pole', 'crossing']),
        left: rng.int(1, 3),
        right: rng.int(1, 3),
      };
      const [min, max] = graphTrack(params);
      if (max - min > 12 || graphAsked(params) === restingOn(min, max)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { k, which } = params;
    const [min, max] = graphTrack(params);
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = ${againstFracTex(params)}$ and the dashed line is $y = ${k}$. The answer to $${againstTex(params)}$ can only change where the curve meets the line, or where it shoots off. ${
            which === 'pole' ? 'Slide the marker to where it shoots off.' : 'Slide the marker to where it meets the line.'
          }`,
        ),
      ],
      min,
      max,
      step: 1,
      answer: graphAsked(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: window.xMin,
          xMax: window.xMax,
          yMin: k - 6,
          yMax: k + 6,
          curves: [{ f: (x: number) => againstAt(params, x), breaks: true }],
          horizontals: [k],
          label: 'The graph of the fraction, and a flat dashed line at the number it is compared with',
        }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { b, k, r, which } = params;
    return which === 'pole'
      ? [
          { text: `The curve shoots off where the bottom is zero: $${br(b)} = 0$ at $x = ${-b}$.` },
          { text: 'That end of any piece of the set is hollow, since the fraction has no value there.' },
        ]
      : [
          { text: `The curve meets the line where the fraction equals $${k}$:` },
          ...fracIneqCrossing.solution(params),
          { text: `So the marker goes to $x = ${r}$.` },
        ];
  },
};

/* ================================================================
 * Level 5: graphs of rational functions
 *
 * The features of the curve y = top/bottom, read off its rule: vertical
 * asymptotes where the bottom is zero once nothing cancels, and which way
 * each arm goes; the horizontal asymptote from the degrees; holes where a
 * factor does cancel; the intercepts; and all of them together in a sketch.
 * Every fraction is drawn root first and multiplied up, so every pole, hole,
 * intercept and asymptote is whole. Nothing here is calculus, so no slide
 * declares `source` and the generic oracle skips these;
 * `algebraicFractions.test.ts` reads each rule back off the shown TeX and
 * holds every quoted feature to it instead.
 * ================================================================ */

interface Rational {
  /** The top is k times (x - r) for each r in `top`. */
  k: number;
  top: number[];
  /** The bottom is m times (x - r) for each r in `bottom`. */
  m: number;
  bottom: number[];
  /** Both lines shown multiplied out, to be factorised first. */
  expanded: boolean;
}

const ratTop = ({ k, top }: Rational): Poly => fromRoots(top, k);
const ratBottom = ({ m, bottom }: Rational): Poly => fromRoots(bottom, m);

/** Roots of both lines: each is a hole. */
const holesOf = ({ top, bottom }: Rational): number[] => top.filter((r) => bottom.includes(r));
/** Roots of the top alone: where the curve meets the x-axis. */
const zerosOf = ({ top, bottom }: Rational): number[] => top.filter((r) => !bottom.includes(r));
/** Roots of the bottom alone: the vertical asymptotes. */
const polesOf = ({ top, bottom }: Rational): number[] => bottom.filter((r) => !top.includes(r));

const ascending = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);

/** One line of a fraction: its lead times its brackets, or multiplied out. */
function lineTex(lead: number, roots: number[], expanded: boolean): string {
  if (roots.length === 0) return String(lead);
  if (expanded) return polyTex(fromRoots(roots, lead));
  const brackets = roots.length === 1 && lead === 1 ? br(-roots[0]) : roots.map((r) => factorOf(-r)).join('');
  if (lead === 1) return brackets;
  if (lead === -1) return `-${brackets}`;
  return `${lead}${brackets}`;
}

const ratTex = (r: Rational): string => frac(lineTex(r.k, r.top, r.expanded), lineTex(r.m, r.bottom, r.expanded));
const factorisedRatTex = (r: Rational): string => ratTex({ ...r, expanded: false });

/** The curve's height: infinite at a pole, NaN at a hole, where it has none. */
const ratAt = (r: Rational, x: number): number => valueAt(ratTop(r), x) / valueAt(ratBottom(r), x);

/** The simplified fraction at x, which is also the height of the curve beside a hole. */
function simplifiedAt(r: Rational, x: number): number {
  return valueAt(fromRoots(zerosOf(r), r.k), x) / valueAt(fromRoots(polesOf(r), r.m), x);
}

/** The simplified fraction, as the learner writes it. */
function simplifiedTex(r: Rational): string {
  const top = lineTex(r.k, zerosOf(r), false);
  const poles = polesOf(r);
  if (poles.length === 0) return r.m === 1 ? top : frac(top, String(r.m));
  return frac(top, lineTex(r.m, poles, false));
}

/** The horizontal asymptote's height, or null when the top has the higher degree. */
function asymptoteOf({ k, m, top, bottom }: Rational): number | null {
  if (top.length < bottom.length) return 0;
  if (top.length === bottom.length) return k / m;
  return null;
}

/** Everything but the bracket (x - p), at x = p: its sign says which way the arms go. */
function restAt(r: Rational, p: number): { top: number; bottom: number } {
  return {
    top: valueAt(fromRoots(zerosOf(r), r.k), p),
    bottom: valueAt(fromRoots(polesOf(r).filter((q) => q !== p), r.m), p),
  };
}

/** +1 where the curve shoots up just right of the pole p, -1 where it plunges. */
function rightArm(r: Rational, p: number): number {
  const { top, bottom } = restAt(r, p);
  return Math.sign(top * bottom);
}

/** The rest at a pole as the learner reads it: a whole number, or top over bottom. */
function restTex({ top, bottom }: { top: number; bottom: number }): string {
  return bottom === 1 ? String(top) : frac(String(top), String(bottom));
}

/** Lines or points in order, x = -2 and x = 3, or a word for none. */
function listTex(name: string, values: number[], none = '\\text{none}'): string {
  if (values.length === 0) return none;
  return ascending(values)
    .map((v) => `${name} = ${v}`)
    .join(' \\text{ and } ');
}

/** Distinct whole roots for both lines, `holes` of them shared, each line in a random order. */
function sampleRoots(
  rng: Rng,
  { top, bottom, holes, max }: { top: number; bottom: number; holes: number; max: number },
): { top: number[]; bottom: number[] } {
  const all = distinct(rng, top + bottom - holes, max);
  const shared = all.slice(0, holes);
  return {
    top: rng.shuffle([...shared, ...all.slice(holes, top)]),
    bottom: rng.shuffle([...shared, ...all.slice(top)]),
  };
}

/** A y window about the level the curve settles to, so its arms run off and its middle shows. */
function levelWindow(r: Rational): { yMin: number; yMax: number } {
  const level = asymptoteOf(r) ?? 0;
  return { yMin: level - POLE_HEIGHT, yMax: level + POLE_HEIGHT };
}

/** The whole-number span of every root, with room either side. */
function rootTrack(r: Rational, left: number, right: number, also: number[] = []): [number, number] {
  const xs = [...r.top, ...r.bottom, ...also];
  return [Math.min(...xs) - left, Math.max(...xs) + right];
}

interface RatFigure {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Draw the asymptotes dashed. */
  asymptotes?: boolean;
  /** Ring each hole. */
  holes?: boolean;
  /** Squared paper and the y-axis, to count features off. */
  grid?: boolean;
  /** The y-axis alone. */
  yAxis?: boolean;
  height?: number;
  label: string;
}

/** The curve, the pen lifted at each pole. */
function ratSvg(r: Rational, fig: RatFigure): string {
  const level = asymptoteOf(r);
  return plotSvg({
    xMin: fig.xMin,
    xMax: fig.xMax,
    yMin: fig.yMin,
    yMax: fig.yMax,
    curves: [{ f: (x: number) => ratAt(r, x), accent: true, breaks: true }],
    verticals: [
      ...(fig.yAxis ? [{ x: 0, dashed: false }] : []),
      ...(fig.asymptotes ? polesOf(r).map((x) => ({ x })) : []),
    ],
    horizontals: fig.asymptotes && level !== null && level !== 0 ? [level] : [],
    marks: fig.holes ? holesOf(r).map((x) => ({ x, y: simplifiedAt(r, x), hollow: true })) : [],
    grid: fig.grid,
    height: fig.height,
    label: fig.label,
  });
}

/** Factorise first, when the lines were shown multiplied out. */
function factoriseStep(r: Rational): SolutionStep[] {
  return r.expanded ? [{ text: 'Factorise both lines first:' }, { tex: chain(`&${ratTex(r)}`, `=\\;&${factorisedRatTex(r)}`) }] : [];
}

/** The line about a shared factor, when there is one. */
function cancelStep(r: Rational): SolutionStep[] {
  return holesOf(r).map((h) => ({
    text: `$${factorOf(-h)}$ is a factor of the top and the bottom, so it cancels: $x = ${h}$ is a hole, not an asymptote.`,
  }));
}

/* ---------- vertical asymptotes ---------- */

/**
 * Which lines are the vertical asymptotes? Where the bottom is zero, once
 * nothing cancels. Difficulty 2 gives both lines multiplied out, and half the
 * time a factor they share, which is a hole rather than an asymptote.
 */
const fracVaWhich: Generator<Rational> = {
  id: 'frac-va-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const holes = hard && rng.chance(0.5) ? 1 : 0;
    return { k: hard ? nonZero(rng, 3) : 1, m: 1, ...sampleRoots(rng, { top: hard ? 2 : 1, bottom: 2, holes, max: 6 }), expanded: hard };
  },
  render: (r): Slide => {
    const poles = polesOf(r);
    return choiceSlide(
      [say('Where are the vertical asymptotes of this curve?'), show(`y = ${ratTex(r)}`)],
      firstFour(
        listTex('x', poles),
        listTex('x', poles.map((p) => -p)),
        listTex('x', holesOf(r).length > 0 ? r.bottom : [...poles, ...zerosOf(r)]),
        listTex('x', r.top),
        '\\text{none}',
      ),
    );
  },
  solution: (r) => [
    ...factoriseStep(r),
    ...cancelStep(r),
    { text: `A vertical asymptote is where the bottom is zero once nothing cancels: $${listTex('x', polesOf(r))}$.` },
    { text: 'Where the top is zero the curve meets the $x$-axis instead, which is a different question.' },
  ],
};

interface ArmParams {
  r: Rational;
  /** Which way the curve goes just right of the pole asked for: 1 up, -1 down. */
  arm: number;
  left: number;
  right: number;
}

const armAsked = ({ r, arm }: ArmParams): number => polesOf(r).find((p) => rightArm(r, p) === arm)!;
const armTrack = ({ r, left, right }: ArmParams): [number, number] => rootTrack(r, left, right);

/** A curve's arms either side of a pole, in words. */
const armWords = (arm: number): string =>
  arm > 0 ? 'plunges down just to its left and shoots up just to its right' : 'shoots up just to its left and plunges down just to its right';

/**
 * Two vertical asymptotes whose arms go opposite ways, and the marker to the
 * one described. The graph shows the arms; the rule says where the poles are.
 */
const fracVaSlider: Generator<ArmParams> = {
  id: 'frac-va-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r: Rational = { k: hard ? nonZero(rng, 2) : 1, m: 1, ...sampleRoots(rng, { top: hard ? 2 : 1, bottom: 2, holes: 0, max: 5 }), expanded: hard };
      const [p, q] = r.bottom;
      if (rightArm(r, p) === rightArm(r, q)) continue;
      const params: ArmParams = { r, arm: rng.sign(), left: rng.int(1, 2), right: rng.int(1, 2) };
      const [min, max] = armTrack(params);
      if (max - min > 12 || armAsked(params) === restingOn(min, max)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const [min, max] = armTrack(params);
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = ${ratTex(params.r)}$. It has two vertical asymptotes. Slide the marker to the one where the curve ${armWords(params.arm)}.`,
        ),
      ],
      min,
      max,
      step: 1,
      answer: armAsked(params),
      readout: 'x = {v}',
      figure: {
        svg: ratSvg(params.r, { ...window, ...levelWindow(params.r), label: 'The curve, shooting off at two vertical asymptotes' }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: (params) => {
    const { r } = params;
    return [
      ...factoriseStep(r),
      { text: `The bottom is zero at $${listTex('x', polesOf(r))}$.` },
      ...ascending(polesOf(r)).map((p) => {
        const arm = rightArm(r, p);
        return {
          text: `At $x = ${p}$ everything but $${factorOf(-p)}$ comes to $${restTex(restAt(r, p))}$, which is ${arm > 0 ? 'positive' : 'negative'}, so the curve ${armWords(arm)}.`,
        };
      }),
      { text: `So the marker goes to $x = ${armAsked(params)}$.` },
    ];
  },
};

const HEAD_UP = 'Up, towards $+\\infty$';
const HEAD_DOWN = 'Down, towards $-\\infty$';

interface SideParams {
  r: Rational;
  /** The pole asked about. */
  p: number;
  side: 'left' | 'right';
}

/** The sign of the bracket, the sign of the rest, and so which way the arm goes. */
const fracVaSideFlow: Generator<SideParams> = {
  id: 'frac-va-side-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const r: Rational = {
      k: nonZero(rng, hard ? 3 : 2),
      m: 1,
      ...sampleRoots(rng, { top: hard ? 2 : 1, bottom: hard ? 2 : rng.int(1, 2), holes: 0, max: 6 }),
      expanded: hard,
    };
    return { r, p: rng.pick(r.bottom), side: rng.pick<SideParams['side']>(['left', 'right']) };
  },
  render: ({ r, p, side }): Slide => {
    const rest = restAt(r, p);
    const restSign = Math.sign(rest.top * rest.bottom);
    const bracketSign = side === 'right' ? 1 : -1;
    const key = `${ratTex(r)}|${p}|${side}`;
    const signs = (to: string) => turned([POSITIVE, NEGATIVE], `${key}|${to}`).map((label) => ({ label, to }));
    return {
      kind: 'flow',
      prompt: [say(`Which way does the curve go just to the ${side} of its asymptote $x = ${p}$? Decide one step at a time.`)],
      subject: `y = ${ratTex(r)}`,
      steps: [
        { id: 'bracket', ask: `Just to the ${side} of $x = ${p}$, is $${factorOf(-p)}$ positive or negative?`, branches: signs('rest') },
        {
          id: 'rest',
          ask: `Everything else in the fraction, with $x = ${p}$ put in, comes to $${restTex(rest)}$. Positive or negative?`,
          branches: signs('arm'),
        },
        {
          id: 'arm',
          ask: `So just to the ${side} of the asymptote, the curve heads…`,
          branches: turned([HEAD_UP, HEAD_DOWN], `${key}|arm`).map((label) => ({
            label,
            outcome: `So $y \\to ${label === HEAD_UP ? '+' : '-'}\\infty$ as $x \\to ${p}^{${side === 'right' ? '+' : '-'}}$.`,
          })),
        },
      ],
      answer: [bracketSign > 0 ? POSITIVE : NEGATIVE, restSign > 0 ? POSITIVE : NEGATIVE, bracketSign * restSign > 0 ? HEAD_UP : HEAD_DOWN],
    };
  },
  solution: ({ r, p, side }) => {
    const rest = restAt(r, p);
    const restSign = Math.sign(rest.top * rest.bottom);
    const bracketSign = side === 'right' ? 1 : -1;
    return [
      ...factoriseStep(r),
      { text: `Just to the ${side} of $${p}$, $${factorOf(-p)}$ is a tiny ${bracketSign > 0 ? 'positive' : 'negative'} number.` },
      { text: `Everything else barely changes near $x = ${p}$, and there it is $${restTex(rest)}$, which is ${restSign > 0 ? 'positive' : 'negative'}.` },
      {
        text: `A ${restSign > 0 ? 'positive' : 'negative'} number over a tiny ${bracketSign > 0 ? 'positive' : 'negative'} one is huge and ${bracketSign * restSign > 0 ? 'positive, so the curve heads up' : 'negative, so the curve heads down'}.`,
      },
    ];
  },
};

interface ArmTilesParams {
  r: Rational;
  p: number;
}

/**
 * The arms either side of one asymptote, in limit notation: which of
 * +infinity and -infinity goes on each side. Difficulty 2 has two poles and
 * the bottom multiplied out.
 */
const fracVaArmsTiles: Generator<ArmTilesParams> = {
  id: 'frac-va-arms-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const r: Rational = {
      k: nonZero(rng, 3),
      m: 1,
      ...sampleRoots(rng, { top: hard ? rng.int(1, 2) : 1, bottom: hard ? 2 : 1, holes: 0, max: 6 }),
      expanded: hard,
    };
    return { r, p: rng.pick(r.bottom) };
  },
  render: ({ r, p }): Slide => {
    const up = rightArm(r, p) > 0;
    const answer = up ? ['-\\infty', '\\infty'] : ['\\infty', '-\\infty'];
    return {
      kind: 'tiles',
      prompt: [
        show(`y = ${ratTex(r)}`),
        say(
          `This curve has a vertical asymptote at $x = ${p}$. Which way does $y$ head as $x$ closes in on $${p}$ from below, $x \\to ${p}^{-}$, and from above, $x \\to ${p}^{+}$?`,
        ),
      ],
      template: `x \\to ${p}^{-}\\!:\\; y \\to {0} \\qquad x \\to ${p}^{+}\\!:\\; y \\to {1}`,
      bank: tileBank(answer, ['0', String(p), String(asymptoteOf(r) ?? 1)]),
      answer,
    };
  },
  solution: ({ r, p }) => {
    const rest = restAt(r, p);
    const up = rightArm(r, p) > 0;
    return [
      ...factoriseStep(r),
      { text: `Near $x = ${p}$ only $${factorOf(-p)}$ changes sign. Everything else, at $x = ${p}$, is $${restTex(rest)}$: ${up ? 'positive' : 'negative'}.` },
      { text: `From above, $${factorOf(-p)}$ is a tiny positive number, so $y \\to ${up ? '+' : '-'}\\infty$.` },
      { text: `From below it is a tiny negative number, so $y \\to ${up ? '-' : '+'}\\infty$.` },
    ];
  },
};

/* ---------- horizontal asymptotes ---------- */

/** Fractions for the degree rule, each line's lead chosen so the ratio of leads is whole. */
function sampleDegrees(rng: Rng, hard: boolean, shapes: [number, number][]): Rational {
  const [top, bottom] = rng.pick(shapes);
  const m = hard ? rng.int(1, 3) : 1;
  return { k: m * nonZero(rng, hard ? 3 : 4), m, ...sampleRoots(rng, { top, bottom, holes: 0, max: 6 }), expanded: hard };
}

/** The leading terms of each line, over each other. */
const leadsTex = ({ k, m, top, bottom }: Rational): string => frac(termTex(k, top.length), termTex(m, bottom.length));

/** Why the asymptote is what it is, from the degrees. */
function degreeSteps(r: Rational): SolutionStep[] {
  const [dt, db] = [r.top.length, r.bottom.length];
  const steps: SolutionStep[] = [
    { text: `The top has degree ${dt} and the bottom degree ${db}. Far out only the leading terms matter: $${leadsTex(r)}$.` },
  ];
  if (dt < db) steps.push({ text: 'The bottom grows faster, so the fraction shrinks towards $0$: the horizontal asymptote is $y = 0$.' });
  else if (dt === db) steps.push({ text: `The powers match and cancel, leaving the ratio of the leading coefficients: $y = ${r.k / r.m}$.` });
  else steps.push({ text: 'The top grows faster, so the fraction grows without limit: there is no horizontal asymptote.' });
  return steps;
}

const TOP_HIGHER = 'The top';
const SAME_POWER = 'Neither: the same power';
const BOTTOM_HIGHER = 'The bottom';
const NO_LEVEL = 'Settles on no level line';

/** Which line has the higher power, then which level line the curve settles on. */
const fracHaFlow: Generator<Rational> = {
  id: 'frac-ha-flow',
  sample: (rng, difficulty) =>
    sampleDegrees(
      rng,
      difficulty > 1,
      difficulty > 1
        ? [[1, 1], [2, 2], [1, 2], [2, 1], [0, 2]]
        : [[1, 1], [1, 2], [2, 1], [0, 1]],
    ),
  render: (r): Slide => {
    const [dt, db] = [r.top.length, r.bottom.length];
    const level = asymptoteOf(r);
    const heights = [...new Set([0, r.k / r.m, r.k, -r.k / r.m])].slice(0, 3);
    const labelOf = (y: number) => `Settles on $y = ${y}$`;
    const outcomes = new Map(heights.map((y) => [labelOf(y), `So its horizontal asymptote is $y = ${y}$.`]));
    const key = ratTex(r);
    return {
      kind: 'flow',
      prompt: [say('Find where this curve settles far out, one decision at a time.')],
      subject: `y = ${ratTex(r)}`,
      steps: [
        {
          id: 'degree',
          ask: 'Multiply each line out in your head. Which has the higher power of $x$?',
          branches: turned([TOP_HIGHER, SAME_POWER, BOTTOM_HIGHER], `${key}|degree`).map((label) => ({ label, to: 'level' })),
        },
        {
          id: 'level',
          ask: 'So as $x$ grows large either way, the curve…',
          branches: turned([...heights.map(labelOf), NO_LEVEL], `${key}|level`).map((label) => ({
            label,
            outcome: outcomes.get(label) ?? 'So it has no horizontal asymptote.',
          })),
        },
      ],
      answer: [dt > db ? TOP_HIGHER : dt === db ? SAME_POWER : BOTTOM_HIGHER, level === null ? NO_LEVEL : labelOf(level)],
    };
  },
  solution: degreeSteps,
};

interface LevelParams {
  r: Rational;
  below: number;
  above: number;
}

const levelTrack = ({ r, below, above }: LevelParams): [number, number] => {
  const level = asymptoteOf(r)!;
  return [Math.min(level, 0) - below, Math.max(level, 0) + above];
};

/** A horizontal line slid to the level the curve settles on. */
const fracHaSlider: Generator<LevelParams> = {
  id: 'frac-ha-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r = sampleDegrees(rng, hard, hard ? [[2, 2]] : [[1, 1]]);
      const roots = [...r.top, ...r.bottom];
      if (Math.max(...roots) - Math.min(...roots) > 8) continue;
      const params: LevelParams = { r, below: rng.int(2, 4), above: rng.int(2, 4) };
      const [min, max] = levelTrack(params);
      if (max - min > 12 || asymptoteOf(r) === restingOn(min, max)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { r } = params;
    const [min, max] = levelTrack(params);
    const window = markerWindow(min, max, 'y');
    const roots = [...r.top, ...r.bottom];
    return {
      kind: 'slider',
      prompt: [
        say(`The curve is $y = ${ratTex(r)}$. Slide the line to the height the curve settles towards far out on both sides: its horizontal asymptote.`),
      ],
      min,
      max,
      step: 1,
      answer: asymptoteOf(r)!,
      readout: 'y = {v}',
      figure: {
        svg: ratSvg(r, {
          xMin: Math.min(...roots) - 6,
          xMax: Math.max(...roots) + 6,
          yMin: window.xMin,
          yMax: window.xMax,
          label: 'The curve, flattening out far to the left and the right',
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: ({ r }) => degreeSteps(r),
};

/** The horizontal asymptote's height, typed. Difficulty 2 multiplies the lines out and puts a number in front of the bottom. */
const fracHaValue: Generator<Rational> = {
  id: 'frac-ha-value',
  sample: (rng, difficulty) =>
    sampleDegrees(rng, difficulty > 1, difficulty > 1 ? [[1, 1], [2, 2], [2, 2], [1, 2], [0, 2]] : [[1, 1], [2, 2], [1, 2]]),
  render: (r): Slide => ({
    kind: 'expression',
    prompt: [show(`y = ${ratTex(r)}`), say('This curve settles towards a level line far out. What is its horizontal asymptote?')],
    lead: 'y =',
    keypad: [],
    answer: String(asymptoteOf(r)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: degreeSteps,
};

interface HaWhichParams {
  /** The asymptote asked for, never 0. */
  c: number;
  /** The right fraction first, then one with the ratio upside down in sign, one whose bottom is higher, one whose top is higher. */
  choices: Rational[];
}

/** Which of four curves settles on y = c? Each wrong one has leads that look right or a degree that is not. */
const fracHaWhich: Generator<HaWhichParams> = {
  id: 'frac-ha-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const c = nonZero(rng, 4);
    const d = hard ? rng.int(1, 2) : 1;
    const m = hard ? rng.int(1, 2) : 1;
    const build = (top: number, bottom: number, k: number): Rational => ({
      k,
      m,
      ...sampleRoots(rng, { top, bottom, holes: 0, max: 5 }),
      expanded: hard,
    });
    return {
      c,
      choices: [build(d, d, c * m), build(d, d, -c * m), build(d, d + 1, c * m), build(d + 1, d, c * m)],
    };
  },
  render: ({ c, choices: [right, ...wrong] }): Slide =>
    choiceSlide(
      [say(`Which of these curves has the horizontal asymptote $y = ${c}$?`)],
      options({ tex: `y = ${ratTex(right)}` }, ...wrong.map((r) => ({ tex: `y = ${ratTex(r)}` }))),
    ),
  solution: ({ choices }) =>
    choices.map((r) => {
      const level = asymptoteOf(r);
      return {
        text: `$${ratTex(r)}$: far out it behaves like $${leadsTex(r)}$, so ${level === null ? 'it has no horizontal asymptote' : `$y = ${level}$`}.`,
      };
    }),
};

/* ---------- holes ---------- */

/** A fraction whose top and bottom share one factor, with the hole's height whole. */
function sampleHole(rng: Rng, hard: boolean, shapes: [number, number][]): Rational {
  for (;;) {
    const [top, bottom] = rng.pick(shapes);
    const r: Rational = { k: hard ? nonZero(rng, 3) : 1, m: 1, ...sampleRoots(rng, { top, bottom, holes: 1, max: 6 }), expanded: hard };
    const y = simplifiedAt(r, holesOf(r)[0]);
    if (Number.isInteger(y) && Math.abs(y) <= 12) return r;
  }
}

/** The hole's x, then the simplified top and bottom there, then its y. */
const fracHoleTree: Generator<Rational> = {
  id: 'frac-hole-tree',
  sample: (rng, difficulty) => sampleHole(rng, difficulty > 1, [[2, 2]]),
  render: (r): Slide => {
    const h = holesOf(r)[0];
    const [z] = zerosOf(r);
    const [p] = polesOf(r);
    const top = r.k * (h - z);
    const bottom = h - p;
    const answer = [h, top, bottom, top / bottom];
    return {
      kind: 'tree',
      prompt: [
        say(
          'Cancel the factor the top and bottom share, and find the hole. Top row: its $x$. Next: the simplified top and bottom there. Last: its $y$.',
        ),
      ],
      expression: `y = ${ratTex(r)}`,
      nodes: [
        { id: 'x', from: [] },
        { id: 'top', from: ['x'] },
        { id: 'bottom', from: ['x'] },
        { id: 'y', from: ['top', 'bottom'] },
      ],
      bank: numberBank(answer, [-h, -top, -bottom, -top / bottom, z, p, r.k * (h + z)]),
      answer: answer.map(String),
    };
  },
  solution: (r) => {
    const h = holesOf(r)[0];
    const y = simplifiedAt(r, h);
    const [z] = zerosOf(r);
    const [p] = polesOf(r);
    return [
      ...factoriseStep(r),
      ...cancelStep(r),
      { tex: chain(`&${factorisedRatTex(r)}`, `=\\;&${simplifiedTex(r)}`) },
      { text: `The original has no value at $x = ${h}$, but the simplified form does:` },
      { tex: `${frac(r.k === 1 ? `${h} ${signed(-z)}` : `${r.k}(${h} ${signed(-z)})`, `${h} ${signed(-p)}`)} = ${frac(String(r.k * (h - z)), String(h - p))} = ${y}` },
      { text: `So the hole is at $(${h}, ${y})$.` },
    ];
  },
};

const CANCELS = 'Yes, so it cancels: a hole';
const STAYS = 'No, so it stays: an asymptote';

/** Each place the bottom is zero, sorted into holes and asymptotes. */
const fracHoleFlow: Generator<Rational> = {
  id: 'frac-hole-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const holes = rng.chance(hard ? 0.7 : 0.8) ? 1 : 0;
    return { k: hard ? nonZero(rng, 2) : 1, m: 1, ...sampleRoots(rng, { top: hard ? 2 : 1, bottom: 2, holes, max: 6 }), expanded: hard };
  },
  render: (r): Slide => {
    const [a, b] = ascending(r.bottom);
    const key = ratTex(r);
    const ask = (x: number) => `The bottom is zero at $x = ${x}$. Is $${factorOf(-x)}$ a factor of the top as well?`;
    return {
      kind: 'flow',
      prompt: [say('Sort each place the bottom is zero into a hole or a vertical asymptote.')],
      subject: `y = ${ratTex(r)}`,
      steps: [
        { id: 'first', ask: ask(a), branches: turned([CANCELS, STAYS], `${key}|first`).map((label) => ({ label, to: 'second' })) },
        {
          id: 'second',
          ask: ask(b),
          branches: turned([CANCELS, STAYS], `${key}|second`).map((label) => ({
            label,
            outcome: `So $x = ${b}$ is ${label === CANCELS ? 'a hole' : 'a vertical asymptote'}.`,
          })),
        },
      ],
      answer: [r.top.includes(a) ? CANCELS : STAYS, r.top.includes(b) ? CANCELS : STAYS],
    };
  },
  solution: (r) => [
    ...factoriseStep(r),
    ...ascending(r.bottom).map((x) => ({
      text: r.top.includes(x)
        ? `$${factorOf(-x)}$ is on the top too, so it cancels: $x = ${x}$ is a hole.`
        : `$${factorOf(-x)}$ is not a factor of the top (it is $${valueAt(ratTop(r), x)}$ there, not $0$), so $x = ${x}$ is a vertical asymptote.`,
    })),
  ],
};

interface HoleSliderParams {
  r: Rational;
  left: number;
  right: number;
}

const holeTrack = ({ r, left, right }: HoleSliderParams): [number, number] => rootTrack(r, left, right);

/**
 * The hole found on a graph that cannot show it: the curve is drawn through
 * the missing point, so the rule is the only way to find it. The break the
 * graph does show is the asymptote, which is the obvious wrong answer.
 */
const fracHoleSlider: Generator<HoleSliderParams> = {
  id: 'frac-hole-slider',
  sample: (rng, difficulty) => {
    for (;;) {
      const r = sampleHole(rng, difficulty > 1, [[2, 2], [1, 2]]);
      const h = holesOf(r)[0];
      const params: HoleSliderParams = { r, left: rng.int(1, 2), right: rng.int(1, 2) };
      const [min, max] = holeTrack(params);
      const { yMin, yMax } = levelWindow(r);
      const y = simplifiedAt(r, h);
      if (max - min > 12 || h === restingOn(min, max) || y <= yMin + 1 || y >= yMax - 1) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { r } = params;
    const [min, max] = holeTrack(params);
    const window = markerWindow(min, max);
    return {
      kind: 'slider',
      prompt: [
        say(
          `The curve is $y = ${ratTex(r)}$. Apart from where it shoots off, it looks unbroken, but one point is missing from it: a hole. Slide the marker to the hole.`,
        ),
      ],
      min,
      max,
      step: 1,
      answer: holesOf(r)[0],
      readout: 'x = {v}',
      figure: {
        svg: ratSvg(r, { ...window, ...levelWindow(r), label: 'The curve, which shoots off at one place and looks unbroken elsewhere' }),
        ...window,
        axis: 'x',
      },
    };
  },
  solution: ({ r }) => {
    const h = holesOf(r)[0];
    return [
      ...factoriseStep(r),
      ...cancelStep(r),
      { text: `Cancelled, it is $${simplifiedTex(r)}$, which has a value at $x = ${h}$. The original is $\\tfrac{0}{0}$ there, so only that one point is missing, too small to draw.` },
      { text: `The break the graph does show, at $x = ${polesOf(r)[0]}$, is the vertical asymptote. The hole is at $x = ${h}$.` },
    ];
  },
};

/** The simplified form and the value it leaves out, placed from a bank. */
const fracHoleTiles: Generator<Rational> = {
  id: 'frac-hole-tiles',
  sample: (rng, difficulty) => sampleHole(rng, difficulty > 1, [[2, 2], [1, 2], [2, 1]]),
  render: (r): Slide => {
    const h = holesOf(r)[0];
    const answer = [simplifiedTex(r), String(h)];
    const negated: Rational = { ...r, top: r.top.map((x) => -x), bottom: r.bottom.map((x) => -x) };
    const zeros = zerosOf(r);
    const poles = polesOf(r);
    return {
      kind: 'tiles',
      prompt: [show(`y = ${ratTex(r)}`), say('Cancel the shared factor. Place the simplified form, and the one value of $x$ it no longer shows is missing.')],
      template: 'y = {0}, \\quad x \\neq {1}',
      bank: tileBank(answer, [
        simplifiedTex(negated),
        zeros.length === 0 && r.k === 1 ? lineTex(r.m, poles, false) : frac(lineTex(r.m, poles, false), lineTex(r.k, zeros, false)),
        String(-h),
        ...poles.map(String),
        ...zeros.map(String),
      ]),
      answer,
    };
  },
  solution: (r) => {
    const h = holesOf(r)[0];
    return [
      ...factoriseStep(r),
      { tex: chain(`&${factorisedRatTex(r)}`, `=\\;&${simplifiedTex(r)}`) },
      { text: `The cancelled factor, $${factorOf(-h)}$, is zero at $x = ${h}$. The original has no value there, so the simplified form holds everywhere except $x = ${h}$: a hole.` },
    ];
  },
};

/* ---------- intercepts ---------- */

/** Where the curve crosses the x-axis: the top's roots that survive cancelling. */
const fracXIntWhich: Generator<Rational> = {
  id: 'frac-x-int-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const holes = hard && rng.chance(0.6) ? 1 : 0;
    return {
      k: hard ? nonZero(rng, 2) : 1,
      m: 1,
      ...sampleRoots(rng, { top: 2, bottom: hard ? 2 : rng.int(1, 2), holes, max: 6 }),
      expanded: hard,
    };
  },
  render: (r): Slide => {
    const zeros = zerosOf(r);
    return choiceSlide(
      [say('Where does this curve cross the $x$-axis?'), show(`y = ${ratTex(r)}`)],
      firstFour(
        listTex('x', zeros, '\\text{nowhere}'),
        listTex('x', r.top, '\\text{nowhere}'),
        listTex('x', zeros.map((z) => -z), '\\text{nowhere}'),
        listTex('x', polesOf(r), '\\text{nowhere}'),
        listTex('x', [...zeros, ...polesOf(r)], '\\text{nowhere}'),
      ),
    );
  },
  solution: (r) => [
    ...factoriseStep(r),
    { text: 'The curve meets the $x$-axis where $y = 0$: where the top is zero and the bottom is not.' },
    ...cancelStep(r),
    { text: `So it crosses at $${listTex('x', zerosOf(r))}$.` },
  ],
};

/** The top and bottom at x = 0, whole draws only. */
function sampleYIntercept(rng: Rng, hard: boolean, shapes: [number, number][], limit: number): Rational {
  for (;;) {
    const [top, bottom] = rng.pick(shapes);
    const r: Rational = { k: nonZero(rng, hard ? 3 : 2), m: 1, ...sampleRoots(rng, { top, bottom, holes: 0, max: 6 }), expanded: hard };
    const y = ratAt(r, 0);
    if (Number.isInteger(y) && Math.abs(y) <= limit) return r;
  }
}

/** The y-intercept worked on a tree: the top at 0, the bottom at 0, and their quotient. */
const fracYIntTree: Generator<Rational> = {
  id: 'frac-y-int-tree',
  sample: (rng, difficulty) =>
    sampleYIntercept(rng, difficulty > 1, difficulty > 1 ? [[2, 2], [1, 2], [2, 1]] : [[1, 1], [1, 2], [2, 1]], 20),
  render: (r): Slide => {
    const top = valueAt(ratTop(r), 0);
    const bottom = valueAt(ratBottom(r), 0);
    const answer = [top, bottom, top / bottom];
    return {
      kind: 'tree',
      prompt: [say('Find where the curve crosses the $y$-axis, at $x = 0$. Top row: the top and the bottom there. Below: $y$.')],
      expression: `y = ${ratTex(r)}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'y', from: ['top', 'bottom'] },
      ],
      bank: numberBank(answer, [-top, -bottom, -top / bottom, r.k, top - bottom]),
      answer: answer.map(String),
    };
  },
  solution: (r) => {
    const top = valueAt(ratTop(r), 0);
    const bottom = valueAt(ratBottom(r), 0);
    return [
      {
        text: r.expanded
          ? 'At $x = 0$ every term with an $x$ in it vanishes, leaving each line\'s number on its own.'
          : 'Put $x = 0$ into each bracket.',
      },
      { tex: `${frac(String(top), String(bottom))} = ${top / bottom}` },
      { text: `So the curve crosses the $y$-axis at $(0, ${top / bottom})$.` },
    ];
  },
};

/** The line slid to the height where the curve crosses the y-axis, drawn. */
const fracYIntSlider: Generator<LevelParams> = {
  id: 'frac-y-int-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r = sampleYIntercept(rng, hard, hard ? [[2, 2], [1, 2]] : [[1, 1], [1, 2]], 6);
      const params: LevelParams = { r, below: rng.int(1, 3), above: rng.int(1, 3) };
      const [min, max] = yIntTrack(params);
      if (max - min > 12 || ratAt(r, 0) === restingOn(min, max)) continue;
      return params;
    }
  },
  render: (params): Slide => {
    const { r } = params;
    const [min, max] = yIntTrack(params);
    const window = markerWindow(min, max, 'y');
    const xs = [...r.top, ...r.bottom, 0];
    return {
      kind: 'slider',
      prompt: [say(`The curve is $y = ${ratTex(r)}$, drawn with the $y$-axis. Slide the line to the height where the curve crosses the $y$-axis.`)],
      min,
      max,
      step: 1,
      answer: ratAt(r, 0),
      readout: 'y = {v}',
      figure: {
        svg: ratSvg(r, {
          xMin: Math.min(...xs) - 2,
          xMax: Math.max(...xs) + 2,
          yMin: window.xMin,
          yMax: window.xMax,
          yAxis: true,
          label: 'The curve, and the y-axis it crosses',
        }),
        ...window,
        axis: 'y',
      },
    };
  },
  solution: (params) => fracYIntTree.solution(params.r),
};

function yIntTrack({ r, below, above }: LevelParams): [number, number] {
  const y = ratAt(r, 0);
  return [Math.min(y, 0) - below, Math.max(y, 0) + above];
}

const NO_Y = 'Yes: no $y$-intercept';
const HAS_Y = 'No: it crosses the $y$-axis';
const CROSSINGS = ['Never', 'Once', 'Twice'];

/** Both intercepts in one walk: is x = 0 allowed, the height there, and how often the curve meets the x-axis. */
const fracInterceptsFlow: Generator<Rational> = {
  id: 'frac-intercepts-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const top = rng.pick(hard ? [1, 2, 2] : [0, 1, 2]);
      const holes = hard && top === 2 && rng.chance(0.5) ? 1 : 0;
      const roots = sampleRoots(rng, { top, bottom: 2, holes, max: 6 });
      const onAxis = rng.chance(0.35);
      if (onAxis) roots.bottom[roots.bottom.findIndex((x) => !roots.top.includes(x))] = 0;
      const r: Rational = { k: nonZero(rng, hard ? 3 : 2), m: 1, ...roots, expanded: hard };
      const y = ratAt(r, 0);
      if (!onAxis && (!Number.isInteger(y) || Math.abs(y) > 20)) continue;
      return r;
    }
  },
  render: (r): Slide => {
    const key = ratTex(r);
    const pole = polesOf(r).includes(0);
    const top0 = valueAt(ratTop(r), 0);
    const bottom0 = valueAt(ratBottom(r), 0);
    const y = top0 / bottom0;
    const heights = pole ? [] : [...new Set([y, -y, top0, bottom0, ...near(y, 4)])].slice(0, 4).map((v) => `$y = ${v}$`);
    const crossings = {
      id: 'xaxis',
      ask: 'How many times does it cross the $x$-axis?',
      branches: turned(CROSSINGS, `${key}|x`).map((label) => ({
        label,
        outcome: label === 'Never' ? 'So it never meets the $x$-axis.' : `So it meets the $x$-axis ${label.toLowerCase()}.`,
      })),
    };
    return {
      kind: 'flow',
      prompt: [say('Find where this curve meets each axis.')],
      subject: `y = ${ratTex(r)}`,
      steps: [
        {
          id: 'yaxis',
          ask: 'At $x = 0$, is the bottom zero?',
          branches: turned([NO_Y, HAS_Y], `${key}|y`).map((label) => ({ label, to: label === NO_Y || pole ? 'xaxis' : 'height' })),
        },
        ...(pole
          ? []
          : [
              {
                id: 'height',
                ask: 'Where does it cross the $y$-axis?',
                branches: turned(heights, `${key}|height`).map((label) => ({ label, to: 'xaxis' })),
              },
            ]),
        crossings,
      ],
      answer: pole ? [NO_Y, CROSSINGS[zerosOf(r).length]] : [HAS_Y, `$y = ${y}$`, CROSSINGS[zerosOf(r).length]],
    };
  },
  solution: (r) => {
    const pole = polesOf(r).includes(0);
    const zeros = zerosOf(r);
    return [
      ...factoriseStep(r),
      pole
        ? { text: 'At $x = 0$ the bottom is zero, so the $y$-axis is a vertical asymptote and the curve never meets it.' }
        : { text: `At $x = 0$ the top is $${valueAt(ratTop(r), 0)}$ and the bottom $${valueAt(ratBottom(r), 0)}$, so it crosses the $y$-axis at $y = ${ratAt(r, 0)}$.` },
      ...cancelStep(r),
      {
        text:
          zeros.length === 0
            ? 'Nothing on the top is ever zero, so it never meets the $x$-axis.'
            : `The top is zero, with the bottom not, at $${listTex('x', zeros)}$: ${CROSSINGS[zeros.length].toLowerCase()}.`,
      },
    ];
  },
};

/* ---------- the sketch ---------- */

/** Every feature of a curve in one table, from a bank of numbers. Difficulty 2 has a hole as well. */
const fracFeaturesTable: Generator<Rational> = {
  id: 'frac-features-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r: Rational = {
        k: nonZero(rng, hard ? 3 : 4),
        m: 1,
        ...sampleRoots(rng, { top: hard ? 2 : 1, bottom: hard ? 2 : 1, holes: hard ? 1 : 0, max: 6 }),
        expanded: hard,
      };
      const heights = [ratAt(r, 0), ...holesOf(r).map((h) => simplifiedAt(r, h))];
      if (heights.every((y) => Number.isInteger(y) && Math.abs(y) <= 20)) return r;
    }
  },
  render: (r): Slide => {
    const [p] = polesOf(r);
    const [z] = zerosOf(r);
    const holes = holesOf(r);
    const level = asymptoteOf(r)!;
    const y0 = ratAt(r, 0);
    const rows: [string, number][] = [
      ['\\text{Asymptote } x', p],
      ['\\text{Asymptote } y', level],
      ...holes.flatMap((h): [string, number][] => [
        ['\\text{Hole } x', h],
        ['\\text{Hole } y', simplifiedAt(r, h)],
      ]),
      ['\\text{Meets } x\\text{-axis}', z],
      ['\\text{Meets } y\\text{-axis}', y0],
    ];
    const answer = rows.map(([, v]) => v);
    return {
      kind: 'table',
      prompt: [
        show(`y = ${ratTex(r)}`),
        say(
          `Fill in every feature of this curve, ready to sketch it: its asymptotes $x = \\ldots$ and $y = \\ldots$,${holes.length ? ' the hole,' : ''} and where it meets each axis.`,
        ),
      ],
      columns: ['\\text{Feature}', '\\text{Value}'],
      rows: rows.map(([name]) => [name, null]),
      bank: numberBank(answer, [-p, -z, -level, -y0, 0, ...holes.map((h) => -h)]),
      answer: answer.map(String),
    };
  },
  solution: (r) => {
    const [p] = polesOf(r);
    const [z] = zerosOf(r);
    return [
      ...factoriseStep(r),
      ...holesOf(r).map((h) => ({
        text: `$${factorOf(-h)}$ cancels, leaving $${simplifiedTex(r)}$: a hole at $x = ${h}$, whose height is $${simplifiedAt(r, h)}$.`,
      })),
      { text: `Vertical asymptote where what is left of the bottom is zero: $x = ${p}$.` },
      { text: `The top and bottom have the same degree, so the horizontal asymptote is the ratio of the leading coefficients: $y = ${asymptoteOf(r)}$.` },
      { text: `The top is zero at $x = ${z}$, and at $x = 0$ the curve is at $y = ${ratAt(r, 0)}$.` },
    ];
  },
};

/** The three wrong rules beside a sketch: brackets' signs flipped, the zero and a pole swapped, and the curve upside down. */
function sketchChoices(r: Rational): Rational[] {
  const [z] = r.top;
  const [p, ...rest] = r.bottom;
  return [
    r,
    { ...r, top: r.top.map((x) => -x), bottom: r.bottom.map((x) => -x) },
    { ...r, top: [p], bottom: [z, ...rest] },
    { ...r, k: -r.k },
  ];
}

function sketchOptions(r: Rational): [ChoiceOption, ...ChoiceOption[]] {
  const [right, ...wrong] = sketchChoices(r).map((o) => ({ tex: `y = ${ratTex(o)}` }));
  return [right, ...wrong];
}

/** The squared paper a sketch is drawn on: every root and the origin, with room either side. */
function sketchWindow(r: Rational): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const xs = [...r.top, ...r.bottom, 0];
  const level = asymptoteOf(r)!;
  return { xMin: Math.min(...xs) - 3, xMax: Math.max(...xs) + 3, yMin: Math.min(level, 0) - 5, yMax: Math.max(level, 0) + 5 };
}

/**
 * Whether every piece of the curve, between the edges and the poles, is on
 * the paper for a stretch. A branch that runs off before the edge of the
 * picture is a branch the learner cannot see, and the sketch then fits a
 * rule it does not show.
 */
function everyPieceShows(r: Rational, win: ReturnType<typeof sketchWindow>): boolean {
  const cuts = [win.xMin, ...ascending(polesOf(r)), win.xMax];
  return cuts.slice(1).every((hi, i) => {
    const lo = cuts[i];
    const inside = Array.from({ length: 40 }, (_, j) => ratAt(r, lo + ((hi - lo) * (j + 0.5)) / 40)).filter(
      (y) => y > win.yMin + 0.5 && y < win.yMax - 0.5,
    );
    return inside.length >= 6;
  });
}

/**
 * A sketch on squared paper with its asymptotes dashed, and the rule that
 * draws it. Every wrong rule differs in a feature a learner can count off the
 * grid. Difficulty 2 has two vertical asymptotes and settles on the x-axis.
 */
const fracSketchWhich: Generator<Rational> = {
  id: 'frac-sketch-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r: Rational = { k: nonZero(rng, 3), m: 1, ...sampleRoots(rng, { top: 1, bottom: hard ? 2 : 1, holes: 0, max: 4 }), expanded: false };
      const win = sketchWindow(r);
      if (new Set(sketchChoices(r).map(ratTex)).size === 4 && win.xMax - win.xMin <= 16 && everyPieceShows(r, win)) return r;
    }
  },
  render: (r): Slide => {
    return choiceSlide(
      [
        say('Which rule draws this sketch? The dashed lines are its asymptotes, and each square of the grid is one unit.'),
        {
          kind: 'diagram',
          svg: ratSvg(r, {
            ...sketchWindow(r),
            asymptotes: true,
            grid: true,
            height: 200,
            label: 'A curve on squared paper with its asymptotes dashed',
          }),
        },
      ],
      options(...sketchOptions(r)),
    );
  },
  solution: (r) => {
    const level = asymptoteOf(r)!;
    return [
      { text: `Count off the grid: vertical asymptote${polesOf(r).length > 1 ? 's' : ''} at $${listTex('x', polesOf(r))}$, so the bottom is $${lineTex(1, r.bottom, false)}$.` },
      { text: `It crosses the $x$-axis at $x = ${zerosOf(r)[0]}$, so the top has the factor $${factorOf(-zerosOf(r)[0])}$.` },
      {
        text:
          level === 0
            ? `It settles on the $x$-axis, and just right of $x = ${Math.max(...r.bottom)}$ it heads ${rightArm(r, Math.max(...r.bottom)) > 0 ? 'up' : 'down'}, which fixes the sign in front: $${r.k}$.`
            : `It settles on $y = ${level}$, the ratio of the leading coefficients, so the number in front is $${r.k}$.`,
      },
      { tex: `y = ${ratTex(r)}` },
    ];
  },
};

/** Two quadratics over each other: where the curve crosses its own horizontal asymptote, whole. */
function crossing({ top: [a, b], bottom: [p, q] }: Rational): number {
  return (a * b - p * q) / (a + b - p - q);
}

/**
 * Where the curve crosses its horizontal asymptote y = k: set the fraction
 * equal to k, and the x^2 terms cancel, leaving one linear equation.
 */
const fracCrossHa: Generator<Rational> = {
  id: 'frac-cross-ha',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const r: Rational = { k: hard ? nonZero(rng, 3) : 1, m: 1, ...sampleRoots(rng, { top: 2, bottom: 2, holes: 0, max: 6 }), expanded: hard };
      const [a, b] = r.top;
      const [p, q] = r.bottom;
      if (a + b === p + q) continue;
      const x = crossing(r);
      if (Number.isInteger(x) && Math.abs(x) <= 12) return r;
    }
  },
  render: (r): Slide => ({
    kind: 'expression',
    prompt: [
      show(`y = ${ratTex(r)}`),
      say(`Its horizontal asymptote is $y = ${r.k}$. A curve can cross that line nearer in. Where does this one cross it?`),
    ],
    lead: 'x =',
    keypad: [],
    answer: String(crossing(r)),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (r) => {
    const [a, b] = r.top;
    const [p, q] = r.bottom;
    const top = fromRoots([a, b]);
    const bottom = fromRoots([p, q]);
    return [
      { text: `Set the fraction equal to $${r.k}$ and multiply both sides by the bottom${r.k === 1 ? '' : `, then divide both by $${r.k}$`}:` },
      { tex: `${polyTex(top)} = ${polyTex(bottom)}` },
      { text: 'The $x^2$ terms cancel, which is why there is at most one crossing:' },
      { tex: `${termTex(top[1] - bottom[1], 1)} = ${bottom[2] - top[2]}` },
      { tex: `x = ${crossing(r)}` },
    ];
  },
};

const CROSSES = 'Yes, once';
const NEVER_CROSSES = 'No, never';
const NO_HA = 'None';

/** Whether the curve crosses its horizontal asymptote, or null when it has none. */
function crossesLevel(r: Rational): boolean | null {
  const level = asymptoteOf(r);
  if (level === null) return null;
  if (level === 0) return zerosOf(r).length > 0;
  if (r.top.length === 1) return false;
  const [a, b] = r.top;
  const [p, q] = r.bottom;
  return a + b !== p + q;
}

/**
 * The sketch planned from the rule: vertical asymptotes, the level the curve
 * settles on, and whether it ever crosses that level.
 */
const fracSketchFlow: Generator<Rational> = {
  id: 'frac-sketch-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const shape = rng.pick<[number, number]>(hard ? [[2, 2], [2, 2], [2, 1], [1, 2]] : [[0, 1], [1, 2], [1, 1], [0, 2]]);
    for (;;) {
      const r: Rational = { k: nonZero(rng, 3), m: 1, ...sampleRoots(rng, { top: shape[0], bottom: shape[1], holes: 0, max: 6 }), expanded: hard };
      if (shape[0] === 2 && shape[1] === 2 && rng.chance(0.4)) {
        // A pair of brackets on each line with equal sums never crosses: nudge the last pole to make one.
        const [a, b] = r.top;
        const [p] = r.bottom;
        const q = a + b - p;
        if (q === 0 || Math.abs(q) > 6 || [a, b, p].includes(q)) continue;
        return { ...r, bottom: [p, q] };
      }
      return r;
    }
  },
  render: (r): Slide => {
    const key = ratTex(r);
    const poles = polesOf(r);
    const level = asymptoteOf(r);
    const verticals = [
      ...new Set([
        listTex('x', poles),
        listTex('x', poles.map((p) => -p)),
        listTex('x', r.top.length > 0 ? r.top : poles.map((p) => p + 1)),
        listTex('x', [...poles, ...r.top]),
      ]),
    ].map((tex) => `$${tex}$`);
    const levels = [...new Set([0, r.k, -r.k])].map((y) => `$y = ${y}$`);
    const cross = crossesLevel(r);
    return {
      kind: 'flow',
      prompt: [say('Plan a sketch of this curve, one feature at a time.')],
      subject: `y = ${ratTex(r)}`,
      steps: [
        {
          id: 'vertical',
          ask: 'Where are its vertical asymptotes?',
          branches: turned(verticals, `${key}|v`).map((label) => ({ label, to: 'level' })),
        },
        {
          id: 'level',
          ask: 'And its horizontal asymptote?',
          branches: turned([...levels, NO_HA], `${key}|h`).map((label) =>
            label === NO_HA ? { label, outcome: 'So there is no level line to cross: far out the curve keeps climbing or falling.' } : { label, to: 'cross' },
          ),
        },
        {
          id: 'cross',
          ask: 'Does the curve ever cross that line?',
          branches: turned([CROSSES, NEVER_CROSSES], `${key}|c`).map((label) => ({
            label,
            outcome: label === CROSSES ? 'So it crosses the level line once, nearer in, then settles back towards it.' : 'So it stays on one side of the level line at each end.',
          })),
        },
      ],
      answer: [
        `$${listTex('x', poles)}$`,
        level === null ? NO_HA : `$y = ${level}$`,
        ...(cross === null ? [] : [cross ? CROSSES : NEVER_CROSSES]),
      ],
    };
  },
  solution: (r) => {
    const level = asymptoteOf(r);
    const cross = crossesLevel(r);
    const steps: SolutionStep[] = [
      ...factoriseStep(r),
      { text: `Vertical asymptotes where the bottom is zero: $${listTex('x', polesOf(r))}$.` },
      ...degreeSteps(r),
    ];
    if (level === 0) {
      steps.push({
        text: cross ? `The level is the $x$-axis, and the curve crosses it where the top is zero: $x = ${zerosOf(r)[0]}$.` : 'The level is the $x$-axis, and the top is never zero, so the curve never crosses it.',
      });
    } else if (level !== null && r.top.length === 1) {
      steps.push({ text: `Setting it equal to $${level}$ gives $${lineTex(1, r.top, false)} = ${lineTex(1, r.bottom, false)}$, which no $x$ satisfies: it never crosses.` });
    } else if (level !== null) {
      const [a, b] = r.top;
      steps.push({
        text: cross
          ? `Setting it equal to $${level}$, the $x^2$ terms cancel and a linear equation is left, solved by $x = ${crossing(r)}$: it crosses once.`
          : `Setting it equal to $${level}$, the $x^2$ terms cancel, and so do the $x$ terms: both lines have $x$ coefficient $${-(a + b)}$ once multiplied out. What is left is never true, so it never crosses.`,
      });
    }
    return steps;
  },
};

/* ================================================================
 * Level 6: the method of differences
 *
 * The only level that teaches the method: `sq-l4-telescoping` and
 * `sq-l4-infinity`, which gave the split, are no longer shown. This level
 * supplies the split: by cover-up, with a number taken out in front, over
 * three factors regrouped into two, and over squares; then uses it for sums
 * from any r, for n from a given sum, and for sums to infinity.
 *
 * The variable is r, so `rbr` and `rFactor` stand beside `br` and `pbr`.
 * Every sum is an `Exact`, a whole top over a whole bottom in lowest terms,
 * added up from the pieces that survive and written through `exactTex`;
 * nothing passes through a float. No slide declares `source`, `integrand` or
 * `limits`: nothing here is calculus, so the oracle in generators.test.ts
 * skips every one. `algebraicFractions.test.ts` covers them instead, adding
 * the terms up itself and holding every split, partial sum and limit to that.
 * ================================================================ */

/** The inside of the bracket (r + c), for the letter a sum runs over. Beside `br`, which writes x. */
function rbr(c: number): string {
  if (c === 0) return 'r';
  return c > 0 ? `r + ${c}` : `r - ${-c}`;
}

/** (r + c) as a factor, bracketed unless it is r alone. Beside `pbr`. */
const rFactor = (c: number): string => (c === 0 ? 'r' : `(${rbr(c)})`);

/** (r + c)^2, or r^2. */
const rSquare = (c: number): string => `${rFactor(c)}^2`;

/** Brackets in r multiplied: r(r + 1)(r + 2). */
const rProduct = (cs: number[]): string => cs.map(rFactor).join('');

/** A polynomial in r, as `polyTex` writes one in x. */
const rPolyTex = (p: Poly): string => polyTex(p).replace(/x/g, 'r');

/** n + c, for the far end of a sum; n alone for 0. */
const nbr = (c: number): string => (c === 0 ? 'n' : `n + ${c}`);

/** from, from + 1, … for `count` places. */
const run = (from: number, count: number): number[] => Array.from({ length: count }, (_, j) => from + j);

/** 1/d, with 1/1 written as 1. */
const unitTex = (d: number): string => (d === 1 ? '1' : frac('1', String(d)));

/** An exact fraction: a whole top over a positive whole bottom, in lowest terms. */
type Exact = [number, number];

function exact(top: number, bottom = 1): Exact {
  const g = gcd(top, bottom) || 1;
  const s = bottom < 0 ? -1 : 1;
  return [(s * top) / g, (s * bottom) / g];
}

const plusExact = ([a, b]: Exact, [c, d]: Exact): Exact => exact(a * d + c * b, b * d);
const minusExact = (x: Exact, [c, d]: Exact): Exact => plusExact(x, [-c, d]);
const timesExact = ([a, b]: Exact, [c, d]: Exact): Exact => exact(a * c, b * d);
const sameExact = ([a, b]: Exact, [c, d]: Exact): boolean => a === c && b === d;
/** x < y. Tops and bottoms are whole, so the comparison is exact. */
const belowExact = ([a, b]: Exact, [c, d]: Exact): boolean => a * d < c * b;

/** The one way a number here is written for the learner: 3, 5/12 or -1/2. */
function exactTex([top, bottom]: Exact): string {
  if (bottom === 1) return String(top);
  return top < 0 ? `-\\frac{${-top}}{${bottom}}` : `\\frac{${top}}{${bottom}}`;
}

/**
 * A sum whose term telescopes.
 *
 * - `pair` is k/((r + a)(r + a + g)), which is (k/g)(1/(r + a) - 1/(r + a + g)).
 * - `triple` is k/((r + a)(r + a + 1)(r + a + 2)), which is
 *   (k/2)(1/((r + a)(r + a + 1)) - 1/((r + a + 1)(r + a + 2))).
 * - `square` is k(2r + 2a + 1)/((r + a)^2(r + a + 1)^2), which is
 *   k/(r + a)^2 - k/(r + a + 1)^2.
 *
 * Each is a number in front times piece(r) - piece(r + shift), so a sum from
 * r = m keeps the first `shift` pieces and loses the `shift` past its end.
 */
interface Series {
  form: 'pair' | 'triple' | 'square';
  k: number;
  a: number;
  /** How far apart a pair's brackets are; 1 for the other forms. */
  g: number;
  /** The first r of the sum. */
  m: number;
  /** The bottom shown multiplied out, to be factorised first. */
  expanded: boolean;
}

/** How many places on a piece taken away comes back: g for a pair, 1 otherwise. */
const shiftOf = (s: Series): number => (s.form === 'pair' ? s.g : 1);

/** The number the split takes out in front. */
const frontFactor = (s: Series): Exact => exact(s.k, s.form === 'pair' ? s.g : s.form === 'triple' ? 2 : 1);

/** The piece that telescopes, at r: 1/(r + a), 1/((r + a)(r + a + 1)) or 1/(r + a)^2. */
function pieceAt(s: Series, r: number): Exact {
  const u = r + s.a;
  if (s.form === 'pair') return exact(1, u);
  if (s.form === 'triple') return exact(1, u * (u + 1));
  return exact(1, u * u);
}

/** The pieces at r, r + 1, … for `count` places, added. */
const piecesFrom = (s: Series, r: number, count: number): Exact =>
  run(r, count).reduce<Exact>((sum, v) => plusExact(sum, pieceAt(s, v)), [0, 1]);

/** What survives at the front, before the number in front: the first `shift` pieces from r = m. */
const frontOf = (s: Series): Exact => piecesFrom(s, s.m, shiftOf(s));

/** The sum from r = m to n: the front less the pieces past n, times the number in front. */
const partialOf = (s: Series, n: number): Exact =>
  timesExact(frontFactor(s), minusExact(frontOf(s), piecesFrom(s, n + 1, shiftOf(s))));

/** The sum to infinity: every far piece tends to 0, so only the front is left. */
const limitOf = (s: Series): Exact => timesExact(frontFactor(s), frontOf(s));

/** One term, exactly. */
function termAt(s: Series, r: number): Exact {
  const u = r + s.a;
  if (s.form === 'pair') return exact(s.k, u * (u + s.g));
  if (s.form === 'triple') return exact(s.k, u * (u + 1) * (u + 2));
  return exact(s.k * (2 * u + 1), u * u * (u + 1) * (u + 1));
}

function seriesBottomTex(s: Series): string {
  const { a } = s;
  if (s.form === 'pair') return s.expanded ? rPolyTex(quad(a, a + s.g)) : rProduct([a, a + s.g]);
  if (s.form === 'triple') return s.expanded ? rPolyTex(fromRoots([-a, -a - 1, -a - 2])) : rProduct([a, a + 1, a + 2]);
  return s.expanded ? `(${rPolyTex(quad(a, a + 1))})^2` : `${rSquare(a)}${rSquare(a + 1)}`;
}

/** The top of the term: k, or k(2r + 2a + 1) multiplied out. */
const seriesTopTex = (s: Series): string =>
  s.form === 'square' ? rPolyTex([2 * s.k, s.k * (2 * s.a + 1)]) : String(s.k);

const seriesTermTex = (s: Series): string => frac(seriesTopTex(s), seriesBottomTex(s));

/** A sum from r = m to `to`, as the learner reads it. */
const sumTex = (m: number, to: string): string => `\\sum_{r=${m}}^{${to}}`;

const seriesSumTex = (s: Series, to = 'n'): string => `${sumTex(s.m, to)} ${seriesTermTex(s)}`;

/** The piece at r + c, in r. */
function pieceRTex(s: Series, c: number): string {
  if (s.form === 'pair') return frac('1', rbr(c));
  if (s.form === 'triple') return frac('1', rProduct([c, c + 1]));
  return frac('1', rSquare(c));
}

/** The piece at n + c, over `top`. */
function farTex(s: Series, c: number, top = '1'): string {
  if (s.form === 'pair') return frac(top, nbr(c));
  const factor = (v: number) => (v === 0 ? 'n' : `(${nbr(v)})`);
  if (s.form === 'triple') return frac(top, `${factor(c)}${factor(c + 1)}`);
  return frac(top, `${factor(c)}^2`);
}

/** f times what is inside, the 1 dropped: \frac{1}{2}\left(…\right), or the inside alone. */
function scaledTex(f: Exact, inside: string): string {
  return sameExact(f, [1, 1]) ? inside : `${exactTex(f)}\\left(${inside}\\right)`;
}

/**
 * The split on one line. Where the number in front is whole and the shift is
 * one it goes into each numerator, 3/(r + 1) - 3/(r + 2); otherwise it stays
 * outside a bracket.
 */
function diffSplitTex(s: Series): string {
  const { k, a } = s;
  if (s.form === 'square') return splitTex([[k, rSquare(a)], [-k, rSquare(a + 1)]]);
  if (s.form === 'pair' && s.g === 1) return splitTex([[k, rbr(a)], [-k, rbr(a + 1)]]);
  return scaledTex(frontFactor(s), `${pieceRTex(s, a)} - ${pieceRTex(s, a + shiftOf(s))}`);
}

/** The sum from m to n in closed form: what survives at the front, less what survives at the far end. */
function closedTex(s: Series): string {
  const shift = shiftOf(s);
  if (shift === 1 && s.form !== 'triple') return `${exactTex(limitOf(s))} - ${farTex(s, s.a + 1, String(s.k))}`;
  const back = run(s.a + 1, shift).map((c) => farTex(s, c)).join(' - ');
  return scaledTex(frontFactor(s), `${exactTex(frontOf(s))} - ${back}`);
}

/**
 * `lhs` equal to the closed form, as lines of working for a worked solution:
 * where more than one piece survives at the far end, those pieces go on a
 * line of their own, since the whole bracket runs off a phone.
 */
function closedWorking(lhs: string, s: Series): string {
  const shift = shiftOf(s);
  if (shift === 1 && s.form !== 'triple') return `${lhs} = ${closedTex(s)}`;
  const backs = run(s.a + 1, shift).map((c) => farTex(s, c)).join(' + ');
  const f = frontFactor(s);
  const lim = exactTex(limitOf(s));
  if (s.form === 'triple') {
    // One piece at the far end: the number in front goes into it.
    const [top, bottom] = f;
    const c = s.a + 1;
    return chain(`${lhs} &= ${lim}`, `&- ${frac(String(top), `${bottom === 1 ? '' : bottom}(${nbr(c)})(${nbr(c + 1)})`)}`);
  }
  if (shift < 3) return chain(`${lhs} &= ${lim}`, `&- ${scaledTex(f, backs)}`);
  // Three pieces at the far end and the number in front do not fit one line, so they are named.
  const [first, ...rest] = run(s.a + 1, shift).map((c) => farTex(s, c));
  return chain(`${lhs} &= ${lim} - ${exactTex(f)}\\,T`, `T &= ${first} + ${rest[0]}`, `&\\quad + ${rest[1]}`);
}

/** The split for a worked solution: a three-factor split's two pieces on lines of their own. */
function splitWorking(s: Series): string {
  const f = frontFactor(s);
  if (s.form !== 'triple') return diffSplitTex(s);
  const times = sameExact(f, [1, 1]) ? '' : `${exactTex(f)} \\times `;
  return chain(`&${times}${pieceRTex(s, s.a)}`, `&- ${times}${pieceRTex(s, s.a + 1)}`);
}

/** The bottom factorised, when it was shown multiplied out, then the split. */
function splitStep(s: Series): SolutionStep[] {
  return [
    ...(s.expanded ? [{ text: `Factorise the bottom: $${seriesBottomTex(s)} = ${seriesBottomTex({ ...s, expanded: false })}$.` }] : []),
    { text: 'The term splits as' },
    { tex: splitWorking(s) },
  ];
}

/** Cover-up for a pair's two numerators, which come out equal and opposite. */
function pairCoverSolution(s: Series): SolutionStep[] {
  const { k, a, g } = s;
  return [
    ...(s.expanded ? [{ text: `Factorise the bottom: $${seriesBottomTex(s)} = ${rProduct([a, a + g])}$.` }] : []),
    { text: `Cover $${rFactor(a)}$ and put $r = ${-a}$ into the rest: $A = ${frac(String(k), String(g))} = ${exactTex(exact(k, g))}$.` },
    { text: `Cover $${rFactor(a + g)}$ and put $r = ${-a - g}$: $B = ${frac(String(k), String(-g))} = ${exactTex(exact(-k, g))}$.` },
    { tex: chain(`&${seriesTermTex({ ...s, expanded: false })}`, `=\\;&${diffSplitTex(s)}`) },
  ];
}

/* ---------- lesson 1: the split that telescopes ---------- */

/** k/((r + a)(r + a + 1)). Difficulty 2 multiplies the bottom out. */
function sampleOneApart(rng: Rng, difficulty: number): Series {
  const hard = difficulty > 1;
  return { form: 'pair', k: rng.int(1, hard ? 6 : 4), a: rng.int(0, hard ? 7 : 6), g: 1, m: 1, expanded: hard };
}

interface DiffCoverParams extends Series {
  ask: 'A' | 'B';
}

/** One numerator by cover-up, typed. */
const fracDiffCover: Generator<DiffCoverParams> = {
  id: 'frac-diff-cover',
  sample: (rng, difficulty) => ({ ...sampleOneApart(rng, difficulty), ask: rng.pick<'A' | 'B'>(['A', 'B']) }),
  render: (s): Slide => ({
    kind: 'expression',
    prompt: [
      show(seriesTermTex(s)),
      say(`This splits as $${frac('A', rbr(s.a))} + ${frac('B', rbr(s.a + 1))}$. Find $${s.ask}$.`),
    ],
    lead: `${s.ask} =`,
    keypad: [],
    answer: String(s.ask === 'A' ? s.k : -s.k),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (s) => [
    ...pairCoverSolution(s),
    { text: 'The two numerators are equal and opposite. That is what makes a sum of these terms cancel down.' },
  ],
};

/** The split placed as tiles, the first bracket's part first. */
const fracDiffSplitTiles: Generator<Series> = {
  id: 'frac-diff-split-tiles',
  sample: sampleOneApart,
  render: (s): Slide => {
    const { k, a } = s;
    const answer = [fracTerm(k, rbr(a)), signedFracTerm(-k, rbr(a + 1))];
    const other = k === 1 ? 2 : 1;
    return {
      kind: 'tiles',
      prompt: [say(`Split into partial fractions, the $${rFactor(a)}$ part first.`), show(seriesTermTex(s))],
      template: '{0} {1}',
      bank: tileBank(answer, [
        fracTerm(k, rbr(a + 1)),
        fracTerm(-k, rbr(a)),
        signedFracTerm(k, rbr(a + 1)),
        signedFracTerm(-k, rbr(a)),
        fracTerm(other, rbr(a)),
        signedFracTerm(-other, rbr(a + 1)),
      ]),
      answer,
    };
  },
  solution: pairCoverSolution,
};

/** Which split is right? The distractors flip the signs, add instead, or jump two places. */
const fracDiffWhich: Generator<Series> = {
  id: 'frac-diff-which',
  sample: sampleOneApart,
  render: (s): Slide => {
    const { k, a } = s;
    const two = (p: number, q: number, far = 1) => splitTex([[p, rbr(a)], [q, rbr(a + far)]]);
    return choiceSlide(
      [say('Which of these is this term split into partial fractions?'), show(seriesTermTex(s))],
      firstFour(two(k, -k), two(-k, k), two(k, k), two(k, -k, 2), two(k + 1, -k - 1)),
    );
  },
  solution: (s) => [{ text: 'Find both numerators by cover-up, then pick the option that agrees.' }, ...pairCoverSolution(s)],
};

interface TableParams extends Series {
  /** The far row, too far down to add up term by term. */
  far: number;
}

const FAR_ROWS = [9, 10, 11, 14, 15, 19, 20, 24, 29, 49, 99];

/**
 * Partial sums from r = m: the first given, the next two and a far one to
 * fill, then S_n for every n as what survives. Shift one only, so each end
 * keeps a single piece.
 */
function partialTable(s: TableParams): Slide {
  const { m, far, k, a } = s;
  const ns = [m + 1, m + 2, far];
  const answer = [...ns.map((n) => exactTex(partialOf(s, n))), closedTex(s)];
  const front = exactTex(limitOf(s));
  return {
    kind: 'table',
    prompt: [
      show(`S_n = ${seriesSumTex(s)}`),
      say('Split the term, write the sum out, and fill in the partial sums. The last row is $S_n$ for every $n$: what survives the cancelling.'),
    ],
    columns: ['n', 'S_n'],
    rows: [[String(m), exactTex(partialOf(s, m))], ...ns.map((n) => [String(n), null]), ['n', null]],
    bank: tileBank(answer, [
      exactTex(partialOf(s, m + 3)),
      exactTex(partialOf(s, far + 1)),
      exactTex(partialOf(s, far - 1)),
      exactTex(termAt(s, m + 1)),
      `${front} - ${farTex(s, a, String(k))}`,
      `${front} + ${farTex(s, a + 1, String(k))}`,
      `${exactTex(timesExact(exact(k), pieceAt(s, m + 1)))} - ${farTex(s, a + 1, String(k))}`,
    ]),
    answer,
  };
}

function tableSolution(s: TableParams): SolutionStep[] {
  return [
    ...splitStep(s),
    { text: `Written out from $r = ${s.m}$, each piece taken away is added back by the next term, so only the ends survive:` },
    { tex: closedWorking('S_n', s) },
    {
      text: `So $S_{${s.m + 1}} = ${exactTex(partialOf(s, s.m + 1))}$, $S_{${s.m + 2}} = ${exactTex(partialOf(s, s.m + 2))}$ and $S_{${s.far}} = ${exactTex(partialOf(s, s.far))}$.`,
    },
  ];
}

/** Partial sums from r = 1, and S_n, from a split one place apart. Difficulty 2 multiplies the bottom out. */
const fracDiffPartialTable: Generator<TableParams> = {
  id: 'frac-diff-partial-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      form: 'pair',
      k: rng.int(1, hard ? 5 : 3),
      a: rng.int(hard ? 1 : 0, hard ? 5 : 3),
      g: 1,
      m: 1,
      expanded: hard,
      far: rng.pick(FAR_ROWS),
    };
  },
  render: partialTable,
  solution: tableSolution,
};

/* ---------- lesson 2: a number in front ---------- */

/** k/((r + a)(r + a + g)), at least two apart so a number comes out in front. Difficulty 2 multiplies the bottom out and may set the brackets three apart. */
function sampleApart(rng: Rng, difficulty: number): Series {
  const hard = difficulty > 1;
  const g = hard ? rng.pick([2, 3]) : 2;
  const k = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => v !== g));
  return { form: 'pair', k, a: rng.int(0, 5), g, m: 1, expanded: hard };
}

/** The split with its shared number taken out: k/g, then the two unit fractions. */
const fracGapFactorTiles: Generator<Series> = {
  id: 'frac-gap-factor-tiles',
  sample: sampleApart,
  render: (s): Slide => {
    const { k, a, g } = s;
    const answer = [exactTex(frontFactor(s)), frac('1', rbr(a)), `- ${frac('1', rbr(a + g))}`];
    return {
      kind: 'tiles',
      prompt: [say('Split into partial fractions, with the number both parts share taken out in front.'), show(seriesTermTex(s))],
      template: '{0}({1} {2})',
      bank: tileBank(answer, [
        String(k),
        exactTex(exact(g, k)),
        frac('1', rbr(a + g)),
        `+ ${frac('1', rbr(a + g))}`,
        `- ${frac('1', rbr(a + 1))}`,
        `- ${frac('1', rbr(a + g + 1))}`,
      ]),
      answer,
    };
  },
  solution: pairCoverSolution,
};

/** Cover-up as a tree: each other bracket at its root, then the numerator it gives. */
const fracGapCoverTree: Generator<Series> = {
  id: 'frac-gap-cover-tree',
  sample: sampleApart,
  render: (s): Slide => {
    const { k, a, g } = s;
    const answer = [String(g), String(-g), exactTex(exact(k, g)), exactTex(exact(-k, g))];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${frac('A', rbr(a))} + ${frac('B', rbr(a + g))}$ by cover-up. Top row: $${rbr(a + g)}$ at $r = ${-a}$, then $${rbr(a)}$ at $r = ${-a - g}$. Below them, $A$ and $B$.`,
        ),
      ],
      expression: seriesTermTex(s),
      nodes: [
        { id: 'at-a', from: [] },
        { id: 'at-b', from: [] },
        { id: 'A', from: ['at-a'] },
        { id: 'B', from: ['at-b'] },
      ],
      bank: tileBank(answer, [String(k), String(-k), exactTex(exact(g, k)), exactTex(exact(-g, k)), String(g + 1), String(-2 * g)]),
      answer,
    };
  },
  solution: pairCoverSolution,
};

/** What survives a sum to n: the number in front, the fractions at the front, those at the far end. */
const fracGapEndsTiles: Generator<Series> = {
  id: 'frac-gap-ends-tiles',
  sample: sampleApart,
  render: (s): Slide => {
    const { k, a, g } = s;
    const front = (from: number, count: number) => run(from, count).map(unitTex).join(' + ');
    const back = (from: number, count: number) => run(from, count).map((c) => `- ${frac('1', nbr(c))}`).join(' ');
    const answer = [exactTex(frontFactor(s)), front(a + 1, g), back(a + 1, g)];
    return {
      kind: 'tiles',
      prompt: [
        say('Split the term and write the sum out until you see what cancels. Place what is left, with the number in front.'),
        show(seriesSumTex(s)),
      ],
      template: '{0}({1} {2})',
      bank: tileBank(answer, [
        String(k),
        exactTex(exact(g, k)),
        front(a + 2, g),
        front(a + 1, g - 1),
        back(a + 2, g),
        back(a + 1, g - 1),
      ]),
      answer,
    };
  },
  solution: (s) => {
    const { a, g } = s;
    const at = (r: number) => `\\left(${unitTex(r + a)} - ${unitTex(r + a + g)}\\right)`;
    return [
      ...splitStep(s),
      { text: `Written out, inside the $${exactTex(frontFactor(s))}$:` },
      { tex: chain(`&${at(1)} + ${at(2)}`, `&+ ${at(3)} + \\dots`, `&+ \\left(${frac('1', nbr(a))} - ${frac('1', nbr(a + g))}\\right)`) },
      { text: `Each piece taken away comes back ${g} terms later and cancels, so the first ${g} and the last ${g} survive. The sum to $n$, $S_n$, is` },
      { tex: closedWorking('S_n', s) },
    ];
  },
};

const SURVIVORS = ['One', 'Two', 'Three'];

/** The plan for a sum: how the bottom factorises, what comes out in front, and how many pieces survive at each end. */
const fracGapFlow: Generator<Series> = {
  id: 'frac-gap-flow',
  sample: (rng, difficulty) => ({ ...sampleApart(rng, difficulty), a: rng.int(0, difficulty > 1 ? 6 : 5), expanded: true }),
  render: (s): Slide => {
    const { k, a, g } = s;
    const key = seriesTermTex(s);
    const [c, d] = [a + 1, a + g - 1];
    const factors = [rProduct([a, a + g]), rProduct([-a, -a - g]), c === d ? rSquare(c) : rProduct([c, d])].map((t) => `$${t}$`);
    const fronts = [exactTex(frontFactor(s)), String(k), exactTex(exact(g, k))].map((t) => `$${t}$`);
    return {
      kind: 'flow',
      prompt: [say('Plan the method of differences for this sum.')],
      subject: seriesSumTex(s),
      steps: [
        {
          id: 'factor',
          ask: 'How does the bottom factorise?',
          branches: turned(factors, `${key}|factor`).map((label) => ({ label, to: 'front' })),
        },
        {
          id: 'front',
          ask: 'Split the term. What number comes out in front?',
          branches: turned(fronts, `${key}|front`).map((label) => ({ label, to: 'ends' })),
        },
        {
          id: 'ends',
          ask: 'Written out, how many pieces survive at each end?',
          branches: turned(SURVIVORS, `${key}|ends`).map((label) => ({
            label,
            outcome: `So ${label.toLowerCase()} at the front and ${label.toLowerCase()} at the far end.`,
          })),
        },
      ],
      answer: [factors[0], fronts[0], SURVIVORS[g - 1]],
    };
  },
  solution: (s) => [
    ...splitStep(s),
    { text: `A piece taken away comes back ${s.g} terms later, so ${SURVIVORS[s.g - 1].toLowerCase()} survive at each end. The sum to $n$, $S_n$, is` },
    { tex: closedWorking('S_n', s) },
  ],
};

/* ---------- lesson 3: three factors ---------- */

/** k/((r + a)(r + a + 1)(r + a + 2)). `even` keeps k even, so the three-way split's numerators are whole. */
function sampleTriple(rng: Rng, difficulty: number, even: boolean): Series {
  const hard = difficulty > 1;
  const tops = even ? (hard ? [2, 4, 6, 8, 10, 12] : [2, 4, 6, 8, 10]) : hard ? [1, 3, 4, 5, 6, 7, 8, 9] : [1, 3, 4, 5, 6];
  return { form: 'triple', k: rng.pick(tops), a: rng.int(0, hard ? 6 : 5), g: 1, m: 1, expanded: hard };
}

/** A, B and C of the three-way split, for an even top: k/2, -k, k/2. */
const tripleNumerators = ({ k }: Series): number[] => [k / 2, -k, k / 2];

const tripleLetters = ({ a }: Series): string => run(a, 3).map((c, i) => frac(LETTERS[i], rbr(c))).join(' + ');

const tripleSplitTex = (s: Series): string => splitTex(tripleNumerators(s).map((n, i): [number, string] => [n, rbr(s.a + i)]));

function tripleSolution(s: Series): SolutionStep[] {
  const { k, a } = s;
  const [A, B, C] = tripleNumerators(s);
  return [
    ...(s.expanded ? [{ text: `The bottom factorises: $${seriesBottomTex(s)} = ${rProduct(run(a, 3))}$.` }] : []),
    { text: `Cover $${rFactor(a)}$ and put $r = ${-a}$: the other two brackets make $1 \\times 2 = 2$, so $A = ${frac(String(k), '2')} = ${A}$.` },
    { text: `Cover $${rFactor(a + 1)}$ and put $r = ${-a - 1}$: $(-1) \\times 1 = -1$, so $B = ${B}$.` },
    { text: `Cover $${rFactor(a + 2)}$ and put $r = ${-a - 2}$: $(-2) \\times (-1) = 2$, so $C = ${C}$.` },
    { tex: tripleSplitTex(s) },
  ];
}

/** Regrouping the three-way split into two fractions over neighbouring brackets. */
function regroupSolution(s: Series): SolutionStep[] {
  const { a } = s;
  const top = a === 0 ? `${rbr(2)} - r` : `${rbr(a + 2)} - (${rbr(a)})`;
  return [
    ...(s.expanded ? [{ text: `The bottom factorises: $${seriesBottomTex(s)} = ${rProduct(run(a, 3))}$.` }] : []),
    { text: 'Over a common bottom, the two fractions over neighbouring brackets differ by' },
    {
      tex: chain(
        `&${pieceRTex(s, a)}`,
        `&- ${pieceRTex(s, a + 1)}`,
        `=\\;&${frac(top, rProduct(run(a, 3)))}`,
        `=\\;&${frac('2', rProduct(run(a, 3)))}`,
      ),
    },
    { text: `The term has $${s.k}$ on top, not $2$, so it is $${exactTex(frontFactor(s))}$ times that difference:` },
    { tex: splitWorking(s) },
  ];
}

/** The three numerators by cover-up, as a tree: the other two brackets' product at each root, then the numerator. */
const fracTripleCoverTree: Generator<Series> = {
  id: 'frac-triple-cover-tree',
  sample: (rng, difficulty) => sampleTriple(rng, difficulty, true),
  render: (s): Slide => {
    const { k, a } = s;
    const answer = [2, -1, 2, ...tripleNumerators(s)];
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split into $${tripleLetters(s)}$ by cover-up. Top row: the other two brackets multiplied, at $r = ${-a}$, $r = ${-a - 1}$ and $r = ${-a - 2}$. Below each, its numerator.`,
        ),
      ],
      expression: seriesTermTex(s),
      nodes: [
        { id: 'at-a', from: [] },
        { id: 'at-b', from: [] },
        { id: 'at-c', from: [] },
        { id: 'A', from: ['at-a'] },
        { id: 'B', from: ['at-b'] },
        { id: 'C', from: ['at-c'] },
      ],
      bank: numberBank(answer, [k, -k / 2, -2, 1, 2 * k]),
      answer: answer.map(String),
    };
  },
  solution: tripleSolution,
};

/** The three-way split placed, in bracket order. */
const fracTripleTiles: Generator<Series> = {
  id: 'frac-triple-tiles',
  sample: (rng, difficulty) => sampleTriple(rng, difficulty, true),
  render: (s): Slide => {
    const { k, a } = s;
    const h = k / 2;
    const answer = [fracTerm(h, rbr(a)), signedFracTerm(-k, rbr(a + 1)), signedFracTerm(h, rbr(a + 2))];
    return {
      kind: 'tiles',
      prompt: [say('Split into three partial fractions, in the order the brackets are written.'), show(seriesTermTex(s))],
      template: '{0} {1} {2}',
      bank: tileBank(answer, [
        fracTerm(k, rbr(a)),
        fracTerm(-h, rbr(a)),
        signedFracTerm(k, rbr(a + 1)),
        signedFracTerm(-h, rbr(a + 1)),
        signedFracTerm(-h, rbr(a + 2)),
        signedFracTerm(k, rbr(a + 2)),
      ]),
      answer,
    };
  },
  solution: tripleSolution,
};

/** The same term regrouped: the number in front, then two fractions over neighbouring brackets. */
const fracTripleRegroupTiles: Generator<Series> = {
  id: 'frac-triple-regroup-tiles',
  sample: (rng, difficulty) => sampleTriple(rng, difficulty, false),
  render: (s): Slide => {
    const { k, a } = s;
    const answer = [exactTex(frontFactor(s)), pieceRTex(s, a), `- ${pieceRTex(s, a + 1)}`];
    return {
      kind: 'tiles',
      prompt: [
        say('Write it as the difference of two fractions, each over two neighbouring brackets, with the number they share in front.'),
        show(seriesTermTex(s)),
      ],
      template: '{0}({1} {2})',
      bank: tileBank(answer, [
        String(k),
        exactTex(exact(2, k)),
        pieceRTex(s, a + 1),
        `+ ${pieceRTex(s, a + 1)}`,
        `- ${frac('1', rProduct([a, a + 2]))}`,
        `- ${pieceRTex(s, a + 2)}`,
      ]),
      answer,
    };
  },
  solution: regroupSolution,
};

/** Which is the sum to n of a three-factor term? Difficulty 2 multiplies the bottom out and may start past r = 1. */
const fracTripleSumWhich: Generator<Series> = {
  id: 'frac-triple-sum-which',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { form: 'triple', k: rng.int(1, hard ? 9 : 6), a: rng.int(0, 4), g: 1, m: hard ? rng.int(1, 3) : 1, expanded: hard };
  },
  render: (s): Slide => {
    const f = frontFactor(s);
    const front = exactTex(frontOf(s));
    const back = farTex(s, s.a + 1);
    return choiceSlide(
      [say('Which of these is the sum to $n$?'), show(seriesSumTex(s))],
      firstFour(
        closedTex(s),
        scaledTex(exact(s.k), `${front} - ${back}`),
        scaledTex(f, `${front} - ${farTex(s, s.a)}`),
        scaledTex(f, `${exactTex(pieceAt(s, s.m + 1))} - ${back}`),
        scaledTex(f, `${exactTex(exact(1, s.m + s.a))} - ${back}`),
      ),
    );
  },
  solution: (s) => [
    ...regroupSolution(s),
    { text: `Each piece taken away comes back in the next term, so the first piece, at $r = ${s.m}$, and the last, at $r = n + 1$, survive. The sum to $n$, $S_n$, is` },
    { tex: closedWorking('S_n', s) },
  ],
};

interface TripleAskParams extends Series {
  /** Which numerator, 0 to 2. */
  ask: number;
}

/** One numerator of the three-way split, typed. */
const fracTripleNumerator: Generator<TripleAskParams> = {
  id: 'frac-triple-numerator',
  sample: (rng, difficulty) => ({ ...sampleTriple(rng, difficulty, true), ask: rng.int(0, 2) }),
  render: (s): Slide => ({
    kind: 'expression',
    prompt: [show(seriesTermTex(s)), say(`This splits as $${tripleLetters(s)}$. Find $${LETTERS[s.ask]}$.`)],
    lead: `${LETTERS[s.ask]} =`,
    keypad: [],
    answer: String(tripleNumerators(s)[s.ask]),
    domain: 'real',
    mode: 'exact',
  }),
  solution: tripleSolution,
};

/* ---------- lesson 4: sums from m, and a top in r ---------- */

/** k(2r + 2a + 1)/((r + a)^2(r + a + 1)^2). Difficulty 2 writes the bottom as a quadratic squared. */
function sampleSquare(rng: Rng, difficulty: number): Series {
  const hard = difficulty > 1;
  return { form: 'square', k: rng.int(1, hard ? 5 : 4), a: rng.int(0, 6), g: 1, m: 1, expanded: hard };
}

function squaresSolution(s: Series): SolutionStep[] {
  const { k, a } = s;
  return [
    ...(s.expanded ? [{ text: `The bottom is a square of a product: $${seriesBottomTex(s)} = ${rSquare(a)}${rSquare(a + 1)}$.` }] : []),
    { text: `Two squares side by side differ by $${rSquare(a + 1)} - ${rSquare(a)} = ${rPolyTex([2, 2 * a + 1])}$.` },
    { text: `So over the common bottom $${frac(String(k), rSquare(a))} - ${frac(String(k), rSquare(a + 1))}$ has $${k === 1 ? '' : k}(${rPolyTex([2, 2 * a + 1])})$ on top:` },
    { tex: chain(`&${seriesTermTex({ ...s, expanded: false })}`, `=\\;&${diffSplitTex(s)}`) },
  ];
}

/** A top in r that is the difference of two squares' fractions, split. */
const fracSquareSplitTiles: Generator<Series> = {
  id: 'frac-square-split-tiles',
  sample: sampleSquare,
  render: (s): Slide => {
    const { k, a } = s;
    const answer = [fracTerm(k, rSquare(a)), signedFracTerm(-k, rSquare(a + 1))];
    return {
      kind: 'tiles',
      prompt: [say('This term is the difference of two fractions over squares. Place them.'), show(seriesTermTex(s))],
      template: '{0} {1}',
      bank: tileBank(answer, [
        fracTerm(k, rbr(a)),
        signedFracTerm(-k, rbr(a + 1)),
        signedFracTerm(k, rSquare(a + 1)),
        fracTerm(2 * k, rSquare(a)),
        signedFracTerm(-k, rSquare(a + 2)),
        signedFracTerm(-2 * k, rSquare(a + 1)),
      ]),
      answer,
    };
  },
  solution: squaresSolution,
};

/** Which term is this difference of squares' fractions? The top must be 2r + 2a + 1 times k. */
const fracSquareWhich: Generator<Series> = {
  id: 'frac-square-which',
  sample: sampleSquare,
  render: (s): Slide => {
    const { k, a } = s;
    const bottom = seriesBottomTex(s);
    const top = rPolyTex([2 * k, k * (2 * a + 1)]);
    return choiceSlide(
      [say('Which of these terms is this difference?'), show(diffSplitTex(s))],
      firstFour(
        seriesTermTex(s),
        frac(String(k), bottom),
        frac(rPolyTex([-2 * k, -k * (2 * a + 1)]), bottom),
        frac(top, seriesBottomTex({ ...s, form: 'pair' })),
        frac(rPolyTex([2 * k, 2 * k * (a + 1)]), bottom),
      ),
    );
  },
  solution: squaresSolution,
};

/** Partial sums from r = m, where m is past 1. Difficulty 2 uses a top in r over squares. */
const fracFromMTable: Generator<TableParams> = {
  id: 'frac-from-m-table',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      form: hard ? 'square' : 'pair',
      k: rng.int(1, 3),
      a: rng.int(0, 2),
      g: 1,
      m: rng.int(2, hard ? 5 : 6),
      expanded: false,
      far: rng.pick(FAR_ROWS),
    };
  },
  render: partialTable,
  solution: (s) => [
    ...tableSolution(s),
    { text: `Starting at $r = ${s.m}$, the piece that survives at the front is the one at $r = ${s.m}$, not the one at $r = 1$.` },
  ],
};

interface FindParams extends Series {
  n: number;
}

/** n from a given sum. Difficulty 2 starts past r = 1, or has a top in r over squares. */
const fracFindN: Generator<FindParams> = {
  id: 'frac-find-n',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      if (rng.chance(0.5)) return { form: 'square', k: rng.int(1, 3), a: rng.int(0, 2), g: 1, m: 1, expanded: false, n: rng.int(3, 20) };
      const m = rng.int(2, 5);
      return { form: 'pair', k: rng.int(1, 3), a: rng.int(0, 2), g: 1, m, expanded: false, n: rng.int(m + 3, m + 30) };
    }
    return { form: 'pair', k: rng.int(1, 3), a: rng.int(0, 3), g: 1, m: 1, expanded: false, n: rng.int(4, 30) };
  },
  render: (s): Slide => ({
    kind: 'expression',
    prompt: [show(`${seriesSumTex(s)} = ${exactTex(partialOf(s, s.n))}`), say('Split the term and cancel. What is $n$?')],
    lead: 'n =',
    keypad: [],
    answer: String(s.n),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (s) => {
    const { k, a, n } = s;
    const target = partialOf(s, n);
    const lim = limitOf(s);
    const far = minusExact(lim, target);
    const u = n + a + 1;
    return [
      ...(s.form === 'square' ? squaresSolution(s) : splitStep(s)),
      { text: 'Written out, only the ends survive. The sum to $n$, $S_n$, is' },
      { tex: closedWorking('S_n', s) },
      { text: `Set that equal to $${exactTex(target)}$:` },
      { tex: chain(`${farTex(s, a + 1, String(k))} &= ${exactTex(lim)} - ${exactTex(target)}`, `&= ${exactTex(far)}`) },
      {
        text:
          s.form === 'square'
            ? `So $(${nbr(a + 1)})^2 = ${u * u}$, $${nbr(a + 1)} = ${u}$, and $n = ${n}$.`
            : `So $${nbr(a + 1)} = ${u}$, and $n = ${n}$.`,
      },
    ];
  },
};

/* ---------- lesson 5: the sum to infinity ---------- */

/** A term of any form, for a sum to infinity. Difficulty 2 reaches the three-factor and squared forms. */
function sampleInfinite(rng: Rng, difficulty: number): Series {
  const form = difficulty > 1 ? rng.pick(['pair', 'triple', 'square'] as const) : 'pair';
  if (form === 'triple') return { form, k: rng.int(1, 6), a: rng.int(0, 4), g: 1, m: 1, expanded: false };
  if (form === 'square') return { form, k: rng.int(1, 4), a: rng.int(0, 4), g: 1, m: 1, expanded: false };
  const g = difficulty > 1 ? rng.pick([2, 3]) : rng.pick([1, 2]);
  const k = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => g === 1 || v !== g));
  return { form, k, a: rng.int(0, 4), g, m: 1, expanded: false };
}

const FAR_END = ['They tend to $0$', 'They tend to $1$', 'They grow without limit'];

/** The split, what the far pieces do, and the limit, as a walk. */
const fracInfiniteFlow: Generator<Series> = {
  id: 'frac-infinite-flow',
  sample: sampleInfinite,
  render: (s): Slide => {
    const key = seriesTermTex(s);
    const f = frontFactor(s);
    const shift = shiftOf(s);
    const splits = [
      diffSplitTex(s),
      diffSplitTex({ ...s, k: -s.k }),
      scaledTex(f, `${pieceRTex(s, s.a)} - ${pieceRTex(s, s.a + shift + 1)}`),
    ].map((t) => `$${t}$`);
    const limits = [
      ...new Set(
        [limitOf(s), frontOf(s), timesExact(f, pieceAt(s, s.m + shift)), timesExact(f, pieceAt(s, s.m + 1)), timesExact(limitOf(s), [2, 1])].map(
          (v) => `$${exactTex(v)}$`,
        ),
      ),
    ].slice(0, 3);
    return {
      kind: 'flow',
      prompt: [say('Find the sum to infinity.')],
      subject: seriesSumTex(s, '\\infty'),
      steps: [
        { id: 'split', ask: 'The term splits as', branches: turned(splits, `${key}|split`).map((label) => ({ label, to: 'far' })) },
        {
          id: 'far',
          ask: 'Summed to $n$, what do the pieces left at the far end do as $n$ grows?',
          branches: turned(FAR_END, `${key}|far`).map((label) => ({ label, to: 'limit' })),
        },
        {
          id: 'limit',
          ask: 'So the sum to infinity is',
          branches: turned(limits, `${key}|limit`).map((label) => ({ label, outcome: `So the partial sums close in on ${label}.` })),
        },
      ],
      answer: [splits[0], FAR_END[0], limits[0]],
    };
  },
  solution: (s) => [
    ...splitStep(s),
    { text: 'Summed to $n$, only the ends survive. The sum to $n$, $S_n$, is' },
    { tex: closedWorking('S_n', s) },
    { text: 'Every piece with $n$ in it tends to $0$ as $n$ grows, so what is left is the front:' },
    { tex: `${sumTex(s.m, '\\infty')} = ${exactTex(limitOf(s))}` },
  ],
};

/** The limit as a tree: the pieces surviving at the front, what they add to, then the number in front. */
const fracInfiniteTree: Generator<Series> = {
  id: 'frac-infinite-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const g = hard ? rng.pick([2, 3]) : 2;
    const k = rng.pick([1, 2, 3, 4, 5, 6].filter((v) => v !== g));
    return { form: 'pair', k, a: rng.int(0, 5), g, m: hard ? rng.int(1, 3) : 1, expanded: false };
  },
  render: (s): Slide => {
    const { k, a, g, m } = s;
    const fronts = run(m + a, g).map((d) => exactTex(exact(1, d)));
    const answer = [...fronts, exactTex(frontOf(s)), exactTex(limitOf(s))];
    const pieces = fronts.map((_, i) => ({ id: `piece-${i}`, from: [] as string[] }));
    return {
      kind: 'tree',
      prompt: [
        say(
          `Split the term. Top row: the ${SURVIVORS[g - 1].toLowerCase()} fractions that survive at the front, from $r = ${m}$. Then what they add to, and then the sum to infinity.`,
        ),
      ],
      expression: seriesSumTex(s, '\\infty'),
      nodes: [...pieces, { id: 'front', from: pieces.map((p) => p.id) }, { id: 'limit', from: ['front'] }],
      bank: tileBank(answer, [
        exactTex(exact(1, m + a + g)),
        ...(m + a > 1 ? [exactTex(exact(1, m + a - 1))] : []),
        exactTex(timesExact(exact(k), frontOf(s))),
        exactTex(timesExact(exact(1, k * g), frontOf(s))),
        exactTex(plusExact(frontOf(s), exact(1, m + a + g))),
      ]),
      answer,
    };
  },
  solution: (s) => [
    ...splitStep(s),
    { text: `From $r = ${s.m}$, the first ${s.g} pieces are never taken away, and every piece at the far end tends to $0$:` },
    { tex: `${exactTex(frontFactor(s))}\\left(${run(s.m + s.a, s.g).map(unitTex).join(' + ')}\\right) = ${exactTex(limitOf(s))}` },
  ],
};

/** The sum to infinity as one fraction, from four. Difficulty 2 reaches the squared form and later starts. */
const fracInfiniteWhich: Generator<Series> = {
  id: 'frac-infinite-which',
  sample: (rng, difficulty) => {
    if (difficulty > 1) {
      const m = rng.int(1, 3);
      return rng.chance(0.5)
        ? { form: 'square', k: rng.int(1, 4), a: rng.int(0, 4), g: 1, m, expanded: false }
        : { form: 'triple', k: rng.int(1, 8), a: rng.int(0, 4), g: 1, m, expanded: false };
    }
    return { form: 'triple', k: rng.int(1, 8), a: rng.int(0, 5), g: 1, m: 1, expanded: false };
  },
  render: (s): Slide => {
    const f = frontFactor(s);
    const u = s.m + s.a;
    const limit = limitOf(s);
    const slips: Exact[] = [
      frontOf(s),
      timesExact(f, pieceAt(s, s.m + 1)),
      ...(u > 1 ? [timesExact(f, pieceAt(s, s.m - 1))] : []),
      s.form === 'triple' ? timesExact(f, exact(1, u)) : exact(s.k, u),
      timesExact(limit, [2, 1]),
      timesExact(limit, [1, 2]),
    ];
    return choiceSlide(
      [say('Find the sum to infinity.'), show(seriesSumTex(s, '\\infty'))],
      firstFour(exactTex(limit), ...slips.map(exactTex)),
    );
  },
  solution: (s) => [
    ...(s.form === 'triple' ? regroupSolution(s) : squaresSolution(s)),
    { text: `From $r = ${s.m}$ the piece at the front is never taken away, and the one at the far end tends to $0$:` },
    { tex: `${sumTex(s.m, '\\infty')} = ${exactTex(limitOf(s))}` },
  ],
};

/** How close is close: the distance, exactly and as written. */
const DISTANCES: [Exact, string][] = [
  [[9, 200], '0.045'],
  [[3, 100], '0.03'],
  [[1, 40], '0.025'],
  [[1, 50], '0.02'],
  [[3, 200], '0.015'],
  [[3, 250], '0.012'],
  [[1, 100], '0.01'],
  [[7, 1000], '0.007'],
  [[3, 500], '0.006'],
  [[1, 200], '0.005'],
  [[1, 250], '0.004'],
  [[3, 1000], '0.003'],
];

interface WithinParams extends Series {
  distance: number;
  /** The fewest terms that bring the partial sum within the distance. */
  n: number;
}

/** How far the sum to n falls short of the sum to infinity. */
const gapAt = (s: Series, n: number): Exact => minusExact(limitOf(s), partialOf(s, n));

/**
 * How many terms bring the partial sum within a stated distance of the limit.
 * A draw is refused when the gap at n, or one term earlier, lands on the
 * distance or within a thousandth of it, so the answer is never a coin toss
 * that rounding could flip.
 */
const fracWithin: Generator<WithinParams> = {
  id: 'frac-within',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    for (;;) {
      const g = hard ? 2 : 1;
      const s: Series = { form: 'pair', k: rng.pick(hard ? [1, 3, 4, 5, 6] : [1, 2, 3]), a: rng.int(0, 3), g, m: 1, expanded: false };
      const distance = rng.int(0, DISTANCES.length - 1);
      const [eps] = DISTANCES[distance];
      let n = 1;
      while (n <= 400 && !belowExact(gapAt(s, n), eps)) n += 1;
      if (n < 2 || n > 400) continue;
      const clear = (v: Exact) => {
        const off = minusExact(v, eps);
        return !belowExact(timesExact([Math.abs(off[0]), off[1]], [1000, 1]), eps);
      };
      if (clear(gapAt(s, n)) && clear(gapAt(s, n - 1))) return { ...s, distance, n };
    }
  },
  render: (s): Slide => ({
    kind: 'expression',
    prompt: [
      show(`S_n = ${seriesSumTex(s)}`),
      say(`What is the smallest $n$ for which $S_n$ is within $${DISTANCES[s.distance][1]}$ of the sum to infinity, $S_\\infty$?`),
    ],
    lead: 'n =',
    keypad: [],
    answer: String(s.n),
    domain: 'real',
    mode: 'exact',
  }),
  solution: (s) => {
    const { k, a, n } = s;
    const [eps, written] = DISTANCES[s.distance];
    const gap =
      s.g === 1 ? farTex(s, a + 1, String(k)) : scaledTex(frontFactor(s), run(a + 1, s.g).map((c) => farTex(s, c)).join(' + '));
    return [
      ...splitStep(s),
      { tex: closedWorking('S_n', s) },
      { text: `So $S_\\infty = ${exactTex(limitOf(s))}$, and what is missing is the far end:` },
      { tex: chain('&S_\\infty - S_n', `=\\;&${gap}`) },
      ...(s.g === 1
        ? [{ text: `That is less than $${written}$ when $${nbr(a + 1)} > ${exactTex(timesExact(exact(k), [eps[1], eps[0]]))}$.` }]
        : []),
      { text: `At $n = ${n - 1}$ it is $${exactTex(gapAt(s, n - 1))}$, not yet less than $${written}$; at $n = ${n}$ it is $${exactTex(gapAt(s, n))}$, which is.` },
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
  fracIneqCasesFlow,
  fracIneqTestTree,
  fracIneqSlipWhich,
  fracIneqCrossing,
  fracIneqOneSideSteps,
  fracIneqNewTopTiles,
  fracIneqCriticalTree,
  fracIneqLine,
  fracIneqSquareSteps,
  fracIneqSquareTiles,
  fracIneqSquareLine,
  fracIneqShapeFlow,
  fracIneqTwoSteps,
  fracIneqTwoTopTree,
  fracIneqTwoLine,
  fracIneqTwoTopWhich,
  fracIneqTableLine,
  fracIneqLeastWhole,
  fracIneqMemberFlow,
  fracIneqGraphSlider,
  fracVaWhich,
  fracVaSlider,
  fracVaSideFlow,
  fracVaArmsTiles,
  fracHaFlow,
  fracHaSlider,
  fracHaValue,
  fracHaWhich,
  fracHoleTree,
  fracHoleFlow,
  fracHoleSlider,
  fracHoleTiles,
  fracXIntWhich,
  fracYIntTree,
  fracYIntSlider,
  fracInterceptsFlow,
  fracFeaturesTable,
  fracSketchWhich,
  fracCrossHa,
  fracSketchFlow,
  fracDiffCover,
  fracDiffSplitTiles,
  fracDiffWhich,
  fracDiffPartialTable,
  fracGapFactorTiles,
  fracGapCoverTree,
  fracGapEndsTiles,
  fracGapFlow,
  fracTripleCoverTree,
  fracTripleTiles,
  fracTripleRegroupTiles,
  fracTripleSumWhich,
  fracTripleNumerator,
  fracSquareSplitTiles,
  fracSquareWhich,
  fracFromMTable,
  fracFindN,
  fracInfiniteFlow,
  fracInfiniteTree,
  fracInfiniteWhich,
  fracWithin,
];
