/**
 * Inequalities and the modulus function.
 *
 * Roadmap batch C8, the first two levels of a new concept. Level 1 solves
 * inequalities: the number-line picture of a linear one, joining two with
 * "and" or "or", quadratics whose critical values are not whole, rational
 * inequalities read from a sign table, and the notations a solution set is
 * written in. Level 2 is the modulus function: $|x|$ as a distance, the V of
 * $y = |ax + b|$, modulus equations and the roots they can wrongly produce,
 * modulus inequalities, and transformations of the V. Level 3 puts a modulus
 * on both sides: two moduli equal, solved by cases and by squaring, the two Vs
 * on one graph, inequalities between two moduli, and when squaring is safe.
 *
 * **Every question is built outward from its answer.** Ends, roots, poles and
 * vertices are drawn first and the question is worked out from them, so every
 * end lands on a tick of a number line and nothing turns into a lesson on
 * fractions halfway through. The one place ends are not whole is the
 * quadratic lesson, whose whole point is critical values that do not
 * factorise: there they are surds, and those questions are picked or placed
 * as TeX, never drawn.
 *
 * The checker compares values and cannot grade `x > 3`, so a solution set goes
 * through `numberLine`, `tiles`, `choice` or `flow`, and `expression` is kept
 * for questions whose answer is a number.
 *
 * Rules inherited from the rest of the library: a tiles template is split on
 * `{n}` and each piece rendered alone, so no braces round a digit and no
 * `\left`/`\right` spanning a blank; banks are sorted, never shuffled; a
 * `tree` bank keeps at least two distractors once the answers are taken out;
 * and a number line holds at most twelve steps with every end strictly inside
 * the window, which `windowFor` from `numberLine.ts` arranges.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import { hashSeed, type Rng } from '../../engine/rng';
import { canonicalPieces, formatSet, type Piece } from '../numberLine';
import { markerWindow, plotSvg } from '../figures';
import { options } from '../choiceVariant';
import { sumTex, termTex } from './calculus';
import { bankOf, numberTile, offer, signedTile } from './quadratics';
import { windowFor } from './numberLine';

/* ---------- The inequality sign ---------- */

type Op = '<' | '<=' | '>' | '>=';

const OPS: readonly Op[] = ['<', '<=', '>', '>='];
const OP_TEX: Record<Op, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const FLIP: Record<Op, Op> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
const TOGGLE: Record<Op, Op> = { '<': '<=', '<=': '<', '>': '>=', '>=': '>' };

const isStrict = (op: Op) => op === '<' || op === '>';
const pointsRight = (op: Op) => op === '>' || op === '>=';
/** `<` or `\le`, for an end that is left out or included. */
const le = (closed: boolean) => (closed ? '\\le' : '<');

/* ---------- Numbers and formatting ---------- */

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const nonZero = (from: number, to: number) => range(from, to).filter((value) => value !== 0);

/** A number bracketed when negative, for a substitution written out. */
const br = (value: number) => (value < 0 ? `(${value})` : `${value}`);

/**
 * Roughly how many characters a line prints as, to decide when it must stack.
 * At the solution panel's size a phone holds about eighteen before the line
 * scrolls sideways, which is what a worked step should never do.
 */
function printedLength(tex: string): number {
  return tex
    .replace(/\\text\{([^}]*)\}/g, (_, words: string) => words.replace(/ /g, '#'))
    .replace(/\\q?quad/g, '##')
    .replace(/\\[;,!]/g, '')
    .replace(/\\[a-zA-Z]+/g, '#')
    .replace(/[{}\s^_]/g, '').length;
}

/** The wider "or" a display line between two equations uses. */
const QOR = ' \\quad \\text{or} \\quad ';

/**
 * Two or more statements joined by "or": on one line when it fits, otherwise
 * one per line, each but the last ending in "or".
 */
function either(parts: readonly string[], gap = ' \\text{ or } '): string {
  const flat = parts.join(gap);
  if (parts.length < 2 || printedLength(flat) <= 17) return flat;
  return `\\begin{aligned} ${parts.map((part) => `& ${part}`).join(' \\quad \\text{or} \\\\ ')} \\end{aligned}`;
}

/** A chain of equal expressions, one `=` per line once it is too long for one. */
function chain(parts: readonly string[]): string {
  const flat = parts.join(' = ');
  if (printedLength(flat) <= 17) return flat;
  return `\\begin{aligned} ${parts[0]} ${parts
    .slice(1)
    .map((part) => `&= ${part}`)
    .join(' \\\\ ')} \\end{aligned}`;
}

/** ax + b as the learner reads it: `3x + 4`, `-x - 2`, `5x`, `7`. */
function linTex(a: number, b: number): string {
  const tex = sumTex([termTex(a, 1), termTex(b, 0)]);
  return tex === '' ? '0' : tex;
}

/** b + ax, constant first: `7 - 3x`. */
function linTexFront(a: number, b: number): string {
  const tex = sumTex([termTex(b, 0), termTex(a, 1)]);
  return tex === '' ? '0' : tex;
}

/** ax^2 + bx + c as the learner reads it. */
function quadTex(a: number, b: number, c: number): string {
  const tex = sumTex([termTex(a, 2), termTex(b, 1), termTex(c, 0)]);
  return tex === '' ? '0' : tex;
}

/** (x - h)^2, or x^2 when h is zero. */
function squareTex(h: number): string {
  return h === 0 ? 'x^{2}' : `(x ${signedTile(-h)})^{2}`;
}

/** h + s * sqrt(k), written the way it appears on the page. */
function surdTex(h: number, sign: 1 | -1, k: number): string {
  const root = `\\sqrt{${k}}`;
  if (h === 0) return sign < 0 ? `-${root}` : root;
  return `${h} ${sign < 0 ? '-' : '+'} ${root}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** num / den in lowest terms, the sign in front: `-\frac{13}{3}`, or a whole number. */
function fracTex(num: number, den: number): string {
  const g = gcd(num, den) || 1;
  let n = num / g;
  let d = den / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return `${n}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`;
}

/** Draw until `accept` holds, falling back to a fixed draw that passes. */
function drawUntil<P>(draw: () => P, accept: (params: P) => boolean, fallback: P): P {
  for (let tries = 0; tries < 300; tries += 1) {
    const params = draw();
    if (accept(params)) return params;
  }
  return fallback;
}

/* ---------- Sets ---------- */

/** The ray `x op k`. */
function rayPiece(k: number, op: Op): Piece {
  return pointsRight(op)
    ? { lo: k, hi: Infinity, loClosed: !isStrict(op), hiClosed: false }
    : { lo: -Infinity, hi: k, loClosed: false, hiClosed: !isStrict(op) };
}

function spanPiece(lo: number, hi: number, loClosed: boolean, hiClosed: boolean): Piece {
  return { lo, hi, loClosed, hiClosed };
}

/** The canonical answer a `numberLine` slide stores. */
const setOf = (pieces: Piece[]) => formatSet(canonicalPieces(pieces));

/** The overlap of two pieces, or undefined when they share nothing. */
function intersect(a: Piece, b: Piece): Piece | undefined {
  const lo = Math.max(a.lo, b.lo);
  const hi = Math.min(a.hi, b.hi);
  const loClosed = a.lo === b.lo ? a.loClosed && b.loClosed : a.lo > b.lo ? a.loClosed : b.loClosed;
  const hiClosed = a.hi === b.hi ? a.hiClosed && b.hiClosed : a.hi < b.hi ? a.hiClosed : b.hiClosed;
  if (lo < hi || (lo === hi && loClosed && hiClosed)) return { lo, hi, loClosed, hiClosed };
  return undefined;
}

/** One piece as an inequality: `x < 2`, `x \ge -1`, `-3 < x \le 4`. */
function pieceTex(p: Piece): string {
  if (p.lo === -Infinity && p.hi === Infinity) return 'x \\in \\mathbb{R}';
  if (p.lo === -Infinity) return `x ${le(p.hiClosed)} ${p.hi}`;
  if (p.hi === Infinity) return `x ${p.loClosed ? '\\ge' : '>'} ${p.lo}`;
  if (p.lo === p.hi) return `x = ${p.lo}`;
  return `${p.lo} ${le(p.loClosed)} x ${le(p.hiClosed)} ${p.hi}`;
}

/**
 * A whole set as inequalities joined by "or", stacked when too long for one
 * line. Choice options stay on one line, so the layout never marks one out.
 */
const setTex = (pieces: Piece[], stack = true) => {
  const parts = canonicalPieces(pieces).map(pieceTex);
  return stack ? either(parts) : parts.join(' \\text{ or } ');
};

/** An end as interval notation writes it. */
const endTex = (value: number) =>
  value === Infinity ? '\\infty' : value === -Infinity ? '-\\infty' : `${value}`;

function intervalTex(p: Piece): string {
  return `${p.loClosed ? '[' : '('}${endTex(p.lo)}, ${endTex(p.hi)}${p.hiClosed ? ']' : ')'}`;
}

/** A whole set in interval notation: `(-\infty, 2] \cup (5, \infty)`. */
const intervalSetTex = (pieces: Piece[]) =>
  canonicalPieces(pieces)
    .map(intervalTex)
    .join(' \\cup ');

/** A whole set in set-builder notation. */
const builderTex = (pieces: Piece[]) =>
  canonicalPieces(pieces)
    .map((p) => `\\{ x : ${pieceTex(p)} \\}`)
    .join(' \\cup ');

/**
 * Where a sign pattern satisfies `op 0`.
 *
 * The value is `sign` times the product of `(x - z)` over the zeros divided
 * by the product of `(x - p)` over the poles, every factor simple. Each
 * region between neighbouring critical values is tested at a point inside
 * it; a zero joins the set when the inequality is not strict, and a pole
 * never does, since the fraction has no value there.
 */
function signSet(zeros: number[], poles: number[], sign: number, op: Op): Piece[] {
  const critical = [...new Set([...zeros, ...poles])].sort((a, b) => a - b);
  const valueAt = (x: number) =>
    sign *
    zeros.reduce((acc, z) => acc * (x - z), 1) /
    poles.reduce((acc, p) => acc * (x - p), 1);
  const wanted = (value: number) => (pointsRight(op) ? value > 0 : value < 0);
  const ends = [-Infinity, ...critical, Infinity];
  const pieces: Piece[] = [];
  for (let i = 0; i + 1 < ends.length; i += 1) {
    const lo = ends[i];
    const hi = ends[i + 1];
    const probe =
      lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (wanted(valueAt(probe))) pieces.push(spanPiece(lo, hi, false, false));
  }
  if (!isStrict(op)) {
    for (const z of zeros) pieces.push(spanPiece(z, z, true, true));
  }
  return canonicalPieces(pieces);
}

/** The sign of the region containing `x`, as the sign table records it. */
const signWord = (value: number) => (value > 0 ? 'positive' : 'negative');

/* ---------- A number line drawn as a figure ---------- */

const LW = 340;
const LH = 64;
const LPAD = 22;
const LY = 26;

/**
 * A solution set drawn on a number line, for a question about reading one.
 *
 * Drawn in the number-line widget's own classes so it looks like what the
 * learner draws elsewhere in the lesson, and in `currentColor` and the accent
 * so it follows the theme.
 */
function lineSvg(min: number, max: number, pieces: Piece[], label: string): string {
  const scale = (LW - 2 * LPAD) / (max - min);
  const x = (value: number) =>
    value === -Infinity ? 4 : value === Infinity ? LW - 4 : LPAD + (value - min) * scale;
  const parts = [
    `<svg class="number-line" viewBox="0 0 ${LW} ${LH}" width="100%" role="img" aria-label="${label}">`,
    `<line class="nl-axis" x1="2" y1="${LY}" x2="${LW - 2}" y2="${LY}" />`,
  ];
  for (let value = min; value <= max; value += 1) {
    parts.push(
      `<line class="nl-tick" x1="${x(value).toFixed(1)}" y1="${LY - 8}" x2="${x(value).toFixed(1)}" y2="${LY + 8}" />`,
      `<text class="nl-label" x="${x(value).toFixed(1)}" y="${LY + 30}" text-anchor="middle">${value < 0 ? `&#8722;${-value}` : value}</text>`,
    );
  }
  const canonical = canonicalPieces(pieces);
  for (const piece of canonical) {
    parts.push(
      `<g class="nl-shade"><line x1="${x(piece.lo).toFixed(1)}" y1="${LY}" x2="${x(piece.hi).toFixed(1)}" y2="${LY}" />`,
    );
    if (piece.lo === -Infinity) parts.push(`<polygon points="0,${LY} 12,${LY - 7} 12,${LY + 7}" />`);
    if (piece.hi === Infinity) {
      parts.push(`<polygon points="${LW},${LY} ${LW - 12},${LY - 7} ${LW - 12},${LY + 7}" />`);
    }
    parts.push('</g>');
  }
  for (const piece of canonical) {
    const ends: [number, boolean][] = [
      [piece.lo, piece.loClosed],
      [piece.hi, piece.hiClosed],
    ];
    for (const [at, closed] of ends) {
      if (!Number.isFinite(at)) continue;
      parts.push(
        `<circle class="nl-dot ${closed ? 'closed' : 'open'}" cx="${x(at).toFixed(1)}" cy="${LY}" r="7" />`,
      );
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

/** The same figure for a course's teaching slides. */
export const numberLineSvg = lineSvg;

/** How a drawn set reads, dot by dot, for a worked solution. */
function describeSet(pieces: Piece[]): string {
  const bits: string[] = [];
  for (const p of canonicalPieces(pieces)) {
    const end = (value: number, closed: boolean) =>
      `${closed ? 'a filled' : 'a hollow'} dot at $${value}$`;
    if (p.lo === -Infinity) bits.push(`${end(p.hi, p.hiClosed)} with shading running left`);
    else if (p.hi === Infinity) bits.push(`${end(p.lo, p.loClosed)} with shading running right`);
    else bits.push(`${end(p.lo, p.loClosed)} and ${end(p.hi, p.hiClosed)} with the stretch between shaded`);
  }
  return `On the line: ${bits.join('; and ')}.`;
}

/* ---------- Choices, banks ---------- */

/**
 * Which slot the answer should land in, from the question's own labels.
 *
 * The labels are sorted before hashing so the slot does not depend on the
 * order they were listed in, and the correct one is named separately so two
 * questions offering the same four labels still put the answer in different
 * places. An additive hash was tried first and failed: several of these
 * questions offer the same labels in every draw, a sum of character codes is
 * the same whatever the order, and one generator put its answer first in 400
 * draws out of 400.
 */
function aimFor(correct: string, labels: string[], salt = ''): number {
  return hashSeed(`${[...labels].sort().join('|')}#${correct}#${salt}`) % labels.length;
}

/**
 * A native choice slide, the answer placed by a hash of every label.
 *
 * Not shuffled from the rng (PITFALLS 3.10): one question has to render one
 * way, or the deck de-duplicator cannot see a repeat. `salt` is for questions
 * whose labels never change, which would otherwise always put the answer in
 * the same slot.
 */
function pickOne(prompt: Block[], correct: string, wrong: string[], tex = true, salt = ''): Slide {
  const distinct = [...new Set(wrong)].filter((label) => label !== correct).slice(0, 3);
  const at = aimFor(correct, [correct, ...distinct], salt);
  const labels = [...distinct.slice(0, at), correct, ...distinct.slice(at)];
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex })),
    correctId: `opt${at}`,
  };
}

/** Every ordering of a short list. */
function orderings<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, idx) =>
    orderings([...items.slice(0, idx), ...items.slice(idx + 1)]).map((rest) => [item, ...rest]),
  );
}

/**
 * A `choices()` list ordered so the answer lands in an even spread of slots.
 *
 * `choiceVariant` turns the options by a hash of their labels in the order
 * given, and numeric options such as $4, 5, 6, 7$ hash to much the same turn
 * every time: one count question here put its answer first in nine draws out
 * of ten. The order they are listed in is the one thing that moves that hash
 * without changing the question, so this mirrors the rotation and tries each
 * ordering until the answer lands on the slot `aimFor` picks.
 */
function aimed(offered: ChoiceOption[], salt = ''): ChoiceOption[] {
  const correct = offered.find((option) => option.correct);
  if (!correct) return offered;
  const target = aimFor(correct.tex, offered.map((option) => option.tex), salt);
  for (const candidate of orderings(offered)) {
    let hash = 0;
    for (const option of candidate) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    const n = candidate.length;
    const turn = Math.abs(hash) % n;
    const lands = (((candidate.indexOf(correct) - turn) % n) + n) % n;
    if (lands === target) return candidate;
  }
  return offered;
}

/**
 * Four whole-number options, the correct one flagged and aimed. `salt` is the
 * question itself, for questions whose few possible answers would otherwise
 * offer the same four numbers again and again.
 */
function numberChoices(correct: number, near: number[], salt = ''): ChoiceOption[] {
  return aimed(
    options(
      { tex: `${correct}`, answer: `${correct}` },
      ...offer(correct, ...near)
        .filter((value) => Number(value) !== correct)
        .map((value) => ({ tex: value, answer: value })),
    ),
    salt,
  );
}

/** A steps bank: the value, then distinct distractors, sorted so order says nothing. */
function stepBank(value: string, ...wrong: string[]): string[] {
  return [...new Set([value, ...wrong])].sort();
}

/**
 * A tree's bank: its answers, then distractors that survive, topped up from
 * either side of the anchor until three remain.
 */
function treeBank(answer: string[], preferred: number[], anchor: number): string[] {
  const used = new Set(answer);
  const extras: string[] = [];
  const add = (value: number) => {
    const token = `${value}`;
    if (!Number.isInteger(value) || used.has(token) || extras.includes(token)) return;
    extras.push(token);
  };
  preferred.forEach(add);
  for (let gap = 1; extras.length < 3; gap += 1) {
    add(anchor + gap);
    add(anchor - gap);
  }
  return [...answer, ...extras.slice(0, 4)].sort();
}

const HOW_TO_STEP = 'Tap the line, then choose what it becomes after the **next** step.';

/* ======================================================================
 * Level 1: Inequalities
 * ==================================================================== */

/* ---------- Lesson 1: the number-line picture ---------- */

/**
 * A linear inequality, `ax + b op c` or with $x$ on both sides.
 *
 * `want` is what the solution says, `x want k`; the sign shown is turned round
 * whenever the $x$ coefficient left after collecting is negative, so dividing
 * by it is where the flip happens.
 */
interface LinearParams {
  a: number;
  b: number;
  /** The x coefficient on the right; 0 when the right is a number. */
  c: number;
  d: number;
  want: Op;
  k: number;
  min: number;
  max: number;
}

const linearE = ({ a, c }: LinearParams) => a - c;
const linearShown = (params: LinearParams): Op =>
  linearE(params) < 0 ? FLIP[params.want] : params.want;

function linearTex(params: LinearParams): string {
  const { a, b, c, d } = params;
  const right = c === 0 ? `${d}` : linTex(c, d);
  return `${linTex(a, b)} ${OP_TEX[linearShown(params)]} ${right}`;
}

function sampleLinear(rng: Rng, difficulty: number): LinearParams {
  const k = rng.int(-6, 6);
  const want = rng.pick(OPS);
  const b = rng.pick(nonZero(-9, 9));
  if (difficulty < 2) {
    const a = rng.pick(nonZero(-5, 5));
    return { a, b, c: 0, d: a * k + b, want, k, ...windowFor(rng, k, k, 10, 2) };
  }
  const { a, c } = drawUntil(
    () => ({ a: rng.pick(nonZero(-6, 6)), c: rng.pick(nonZero(-4, 4)) }),
    (pair) => pair.a !== pair.c && Math.abs(pair.a - pair.c) <= 5,
    { a: 2, c: 5 },
  );
  return { a, b, c, d: (a - c) * k + b, want, k, ...windowFor(rng, k, k, 10, 2) };
}

/** What the drawing of `x want k` looks like, in words. */
function drawRay(k: number, op: Op): string {
  const dot = isStrict(op)
    ? `$x ${OP_TEX[op]} ${k}$ leaves $${k}$ out, so the dot at $${k}$ is hollow`
    : `$x ${OP_TEX[op]} ${k}$ includes $${k}$, so the dot at $${k}$ is filled`;
  return `${dot}, and the shading runs ${pointsRight(op) ? 'right' : 'left'} off the end of the line.`;
}

function solveLinear(params: LinearParams): SolutionStep[] {
  const { b, c, want, k } = params;
  const e = linearE(params);
  const shown = linearShown(params);
  const steps: SolutionStep[] = [{ tex: linearTex(params) }];
  if (c !== 0) {
    steps.push({
      text: c > 0 ? `Take $${termTex(c, 1)}$ from both sides.` : `Add $${termTex(-c, 1)}$ to both sides.`,
      tex: `${linTex(e, b)} ${OP_TEX[shown]} ${e * k + b}`,
    });
  }
  steps.push({
    text: b > 0 ? `Take $${b}$ from both sides.` : `Add $${-b}$ to both sides.`,
    tex: `${termTex(e, 1)} ${OP_TEX[shown]} ${e * k}`,
  });
  if (e !== 1) {
    steps.push({
      text:
        e < 0
          ? `Divide both sides by $${e}$. Dividing by a negative number turns the inequality round.`
          : `Divide both sides by $${e}$.`,
      tex: `x ${OP_TEX[want]} ${k}`,
    });
  }
  steps.push({ text: drawRay(k, want) });
  return steps;
}

/**
 * Solve a linear inequality and shade it.
 *
 * The first idea of the course: an inequality's answer is a stretch of the
 * line, not a number. Difficulty 2 puts $x$ on both sides, so the coefficient
 * whose sign decides the flip is the one left after collecting.
 */
const linearLine: Generator<LinearParams> = {
  id: 'ineq-linear-line',
  sample: sampleLinear,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve the inequality, then shade its solution set.' },
      { kind: 'display', tex: linearTex(params) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf([rayPiece(params.k, params.want)]),
  }),
  solution: solveLinear,
};

interface LinearStepsParams {
  a: number;
  b: number;
  k: number;
  want: Op;
  /** Written constant first: `7 - 3x`. */
  front: boolean;
}

/**
 * The same solve as a line of working, one move per line.
 *
 * The second line is where the lesson lives: dividing by a negative turns the
 * sign round, so the bank holds the unturned line beside the right one, and
 * the line with the strictness changed. Difficulty 2 writes the constant
 * first, `7 - 3x`, which hides the negative coefficient behind a minus sign.
 */
const linearSteps: Generator<LinearStepsParams> = {
  id: 'ineq-linear-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const size = rng.int(2, 6);
    const negative = rng.chance(hard ? 0.75 : 0.5);
    return {
      a: negative ? -size : size,
      b: rng.pick(nonZero(-9, 9)),
      k: rng.int(-8, 8),
      want: rng.pick(OPS),
      front: hard && rng.chance(0.6),
    };
  },
  render: ({ a, b, k, want, front }): Slide => {
    const shown = a < 0 ? FLIP[want] : want;
    const r = a * k + b;
    const ax = termTex(a, 1);
    const start = front
      ? [`${b}`, `{} ${signedTile(a, 'x')}`, OP_TEX[shown], `${r}`]
      : [ax, `{} ${signedTile(b)}`, OP_TEX[shown], `${r}`];
    const middle = `${ax} ${OP_TEX[shown]} ${r - b}`;
    const last = `x ${OP_TEX[want]} ${k}`;
    return {
      kind: 'steps',
      prompt: [{ kind: 'prose', text: `Solve one step at a time. ${HOW_TO_STEP}` }],
      start,
      reductions: [
        {
          span: [0, 4],
          operator: front ? 0 : 1,
          value: middle,
          bank: stepBank(
            middle,
            `${ax} ${OP_TEX[shown]} ${r + b}`,
            `${ax} ${OP_TEX[FLIP[shown]]} ${r - b}`,
            `${termTex(-a, 1)} ${OP_TEX[shown]} ${r - b}`,
          ),
        },
        {
          span: [0, 1],
          value: last,
          bank: stepBank(
            last,
            `x ${OP_TEX[shown]} ${k}`,
            `x ${OP_TEX[TOGGLE[want]]} ${k}`,
            `x ${OP_TEX[want]} ${-k}`,
            `x ${OP_TEX[FLIP[want]]} ${-k}`,
          ),
        },
      ],
    };
  },
  solution: ({ a, b, k, want, front }) => {
    const shown = a < 0 ? FLIP[want] : want;
    const r = a * k + b;
    return [
      { tex: `${front ? linTexFront(a, b) : linTex(a, b)} ${OP_TEX[shown]} ${r}` },
      {
        text: b > 0 ? `Take $${b}$ from both sides.` : `Add $${-b}$ to both sides.`,
        tex: `${termTex(a, 1)} ${OP_TEX[shown]} ${r - b}`,
      },
      {
        text:
          a < 0
            ? `Divide both sides by $${a}$. It is negative, so the sign turns round.`
            : `Divide both sides by $${a}$. It is positive, so the sign stays as it is.`,
        tex: `x ${OP_TEX[want]} ${k}`,
      },
    ];
  },
};

type Move = 'add' | 'sub' | 'mul' | 'div' | 'swap';

interface FlipParams {
  a: number;
  b: number;
  c: number;
  op: Op;
  move: Move;
  n: number;
}

const FLIP_ADD = 'Adding or subtracting';
const FLIP_TIMES = 'Multiplying or dividing';
const FLIP_SWAP = 'Swapping the sides over';
const FLIP_POS = 'A positive number';
const FLIP_NEG = 'A negative number';

function moveText({ move, n }: FlipParams): string {
  if (move === 'add') return `add $${n}$ to both sides`;
  if (move === 'sub') return `take $${n}$ from both sides`;
  if (move === 'mul') return `multiply both sides by $${n}$`;
  if (move === 'div') return `divide both sides by $${n}$`;
  return 'swap the two sides over';
}

const flipTurns = ({ move, n }: FlipParams) =>
  move === 'swap' || ((move === 'mul' || move === 'div') && n < 0);

/** The inequality after the move, for the worked solution. */
function afterMove(params: FlipParams): string {
  const { a, b, c, op, move, n } = params;
  if (move === 'add') return `${linTex(a, b + n)} ${OP_TEX[op]} ${c + n}`;
  if (move === 'sub') return `${linTex(a, b - n)} ${OP_TEX[op]} ${c - n}`;
  const turned = OP_TEX[flipTurns(params) ? FLIP[op] : op];
  if (move === 'mul') return `${linTex(a * n, b * n)} ${turned} ${c * n}`;
  if (move === 'div') return `${linTex(a / n, b / n)} ${turned} ${c / n}`;
  return `${c} ${OP_TEX[FLIP[op]]} ${linTex(a, b)}`;
}

/**
 * Does this move turn the sign round?
 *
 * Only two things do: multiplying or dividing by a negative number, and
 * swapping the sides over (the relationship is the same, read the other way).
 * Difficulty 2 hides the negatives: taking away a negative number, and
 * dividing by one.
 */
const flipFlow: Generator<FlipParams> = {
  id: 'ineq-flip-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const move = rng.pick<Move>(hard ? ['sub', 'mul', 'div', 'div', 'mul', 'swap'] : ['add', 'sub', 'mul', 'div', 'mul', 'swap']);
    const op = rng.pick(OPS);
    if (move === 'div') {
      const n = rng.pick(hard ? [-5, -4, -3, -2, 2, 3] : [-3, -2, 2, 3, 4, 5]);
      return { a: n * rng.pick(nonZero(-3, 3)), b: n * rng.int(-4, 4), c: n * rng.int(-5, 5), op, move, n };
    }
    const n =
      move === 'mul'
        ? rng.pick([-5, -4, -3, -2, -1, 2, 3, 4, 5])
        : move === 'sub' && hard
          ? rng.int(-9, -1)
          : rng.int(1, 9);
    return { a: rng.pick(nonZero(-5, 5)), b: rng.pick(nonZero(-9, 9)), c: rng.int(-9, 12), op, move, n };
  },
  render: (params): Slide => {
    const { a, b, c, op, move } = params;
    const answer =
      move === 'add' || move === 'sub'
        ? [FLIP_ADD]
        : move === 'swap'
          ? [FLIP_SWAP]
          : [FLIP_TIMES, params.n < 0 ? FLIP_NEG : FLIP_POS];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Start from the inequality below and **${moveText(params)}**. Does the inequality sign turn round?`,
        },
      ],
      subject: `${linTex(a, b)} ${OP_TEX[op]} ${c}`,
      steps: [
        {
          id: 'what',
          ask: 'What is being done to both sides?',
          branches: [
            { label: FLIP_ADD, outcome: 'The sign stays as it is.' },
            { label: FLIP_TIMES, to: 'sign' },
            { label: FLIP_SWAP, outcome: 'The sign turns round, since the inequality now reads from the other side.' },
          ],
        },
        {
          id: 'sign',
          ask: 'By a positive number or a negative one?',
          branches: [
            { label: FLIP_POS, outcome: 'The sign stays as it is.' },
            { label: FLIP_NEG, outcome: 'The sign turns round: $<$ becomes $>$ and $\\le$ becomes $\\ge$.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const { move, n } = params;
    const why =
      move === 'add' || move === 'sub'
        ? `Adding or taking away any number, ${n < 0 ? 'even a negative one, ' : ''}moves both sides the same way, so the sign stays.`
        : move === 'swap'
          ? 'Swapping the sides reads the same fact from the other end, so the symbol has to turn round with it.'
          : n < 0
            ? `Multiplying or dividing by a negative number reverses the order of numbers on the line, so the sign turns round.`
            : 'Multiplying or dividing by a positive number keeps the order of numbers, so the sign stays.';
    return [{ text: why }, { tex: afterMove(params) }];
  },
};

interface ReadLineParams {
  piece: Piece;
  min: number;
  max: number;
}

/**
 * Read a drawn set back as an inequality.
 *
 * The reverse of shading: a dot and a direction become a sign. Difficulty 2
 * draws bounded intervals too, whose four options differ only in which ends
 * are filled.
 */
const readLine: Generator<ReadLineParams> = {
  id: 'ineq-read-line',
  sample: (rng, difficulty) => {
    if (difficulty < 2 || rng.chance(0.3)) {
      const k = rng.int(-6, 6);
      return { piece: rayPiece(k, rng.pick(OPS)), ...windowFor(rng, k, k, 10, 2) };
    }
    const lo = rng.int(-6, 3);
    const hi = lo + rng.int(2, 6);
    return { piece: spanPiece(lo, hi, rng.chance(0.5), rng.chance(0.5)), ...windowFor(rng, lo, hi, 10, 1) };
  },
  render: ({ piece, min, max }): Slide => {
    const bounded = Number.isFinite(piece.lo) && Number.isFinite(piece.hi);
    const all = bounded
      ? [true, false].flatMap((l) => [true, false].map((h) => pieceTex(spanPiece(piece.lo, piece.hi, l, h))))
      : OPS.map((op) => pieceTex(rayPiece(Number.isFinite(piece.lo) ? piece.lo : piece.hi, op)));
    const correct = pieceTex(piece);
    return pickOne(
      [
        { kind: 'prose', text: 'Which inequality does this number line show?' },
        { kind: 'diagram', svg: lineSvg(min, max, [piece], 'A solution set shaded on a number line') },
      ],
      correct,
      all.filter((label) => label !== correct),
    );
  },
  solution: ({ piece }) => [
    { text: describeSet([piece]) },
    { text: 'A filled dot is included, so it goes with $\\le$ or $\\ge$; a hollow one is left out, so it goes with $<$ or $>$.' },
    { tex: pieceTex(piece) },
  ],
};

interface GreatestParams {
  a: number;
  b: number;
  r: number;
  want: Op;
}

/** The bound x ends up against: (r - b)/a. */
const greatestBound = ({ a, b, r }: GreatestParams) => (r - b) / a;

function greatestAnswer(params: GreatestParams): number {
  const q = greatestBound(params);
  const { want } = params;
  if (want === '<') return Math.ceil(q) - 1;
  if (want === '<=') return Math.floor(q);
  if (want === '>') return Math.floor(q) + 1;
  return Math.ceil(q);
}

function greatestTex({ a, b, r, want }: GreatestParams): string {
  return `${linTex(a, b)} ${OP_TEX[a < 0 ? FLIP[want] : want]} ${r}`;
}

/**
 * The greatest (or smallest) whole number that satisfies an inequality.
 *
 * A typed number, so the checker can grade it. The bound usually is not whole,
 * which is the point: $x < \frac{13}{3}$ has greatest whole solution $4$, and
 * $x < 5$ has greatest $4$ too, so strictness matters exactly when the bound
 * is whole. Difficulty 2 brings negative coefficients, and the flip with them.
 */
const greatestInteger: Generator<GreatestParams> = {
  id: 'ineq-greatest-integer',
  choices: (params) => {
    const n = greatestAnswer(params);
    return numberChoices(n, [n + 1, n - 1, -n], greatestTex(params));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const size = rng.int(2, 6);
    const a = hard && rng.chance(0.6) ? -size : size;
    return { a, b: rng.pick(nonZero(-9, 9)), r: rng.int(-20, 25), want: rng.pick(OPS) };
  },
  render: (params): Slide => {
    const greatest = !pointsRight(params.want);
    return {
      kind: 'expression',
      prompt: [
        {
          kind: 'prose',
          text: `What is the **${greatest ? 'greatest' : 'smallest'}** whole number $x$ that satisfies this?`,
        },
        { kind: 'display', tex: greatestTex(params) },
      ],
      lead: 'x =',
      keypad: [],
      answer: `${greatestAnswer(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { a, b, r, want } = params;
    const shown = a < 0 ? FLIP[want] : want;
    const n = greatestAnswer(params);
    return [
      { tex: greatestTex(params) },
      {
        text: b > 0 ? `Take $${b}$ from both sides.` : `Add $${-b}$ to both sides.`,
        tex: `${termTex(a, 1)} ${OP_TEX[shown]} ${r - b}`,
      },
      {
        text: a < 0 ? `Divide by $${a}$, turning the sign round.` : `Divide by $${a}$.`,
        tex: `x ${OP_TEX[want]} ${fracTex(r - b, a)}`,
      },
      {
        text: `The ${pointsRight(want) ? 'smallest' : 'greatest'} whole number ${
          pointsRight(want) ? 'above' : 'below'
        } that${isStrict(want) ? ', not counting the bound itself,' : ', counting the bound if it is whole,'} is $${n}$.`,
      },
    ];
  },
};

/* ---------- Lesson 2: and, or, and double inequalities ---------- */

interface Part {
  a: number;
  b: number;
  want: Op;
  k: number;
}

const partShown = (part: Part): Op => (part.a < 0 ? FLIP[part.want] : part.want);
const partTex = (part: Part) => `${linTex(part.a, part.b)} ${OP_TEX[partShown(part)]} ${part.a * part.k + part.b}`;
const partSolved = (part: Part) => `x ${OP_TEX[part.want]} ${part.k}`;

function drawPart(rng: Rng, k: number, want: Op, negative: boolean, plain: boolean): Part {
  if (plain) return { a: 1, b: 0, want, k };
  const size = rng.int(1, 4);
  return { a: negative ? -size : size, b: rng.pick(nonZero(-9, 9)), want, k };
}

type Combine = 'and-between' | 'and-apart' | 'and-same' | 'or-apart' | 'or-cover' | 'or-same';

interface CombineParams {
  join: 'and' | 'or';
  shape: Combine;
  parts: [Part, Part];
  min: number;
  max: number;
}

/** Two parts arranged so the combination has the named shape. */
function sampleCombine(rng: Rng, difficulty: number, shapes: readonly Combine[], solved: boolean): CombineParams {
  const shape = rng.pick(shapes);
  const k1 = rng.int(-6, 2);
  const k2 = k1 + rng.int(2, 6);
  const left = rng.pick<Op>(['<', '<=']);
  const right = rng.pick<Op>(['>', '>=']);
  const hard = difficulty > 1;
  let wants: [Op, Op];
  if (shape === 'and-between' || shape === 'or-cover') wants = [right, left];
  else if (shape === 'and-apart' || shape === 'or-apart') wants = [left, right];
  else wants = rng.chance(0.5) ? [right, rng.pick<Op>(['>', '>='])] : [left, rng.pick<Op>(['<', '<='])];
  const negativeFirst = rng.chance(0.5);
  const first = drawPart(rng, k1, wants[0], hard && negativeFirst, solved);
  const second = drawPart(rng, k2, wants[1], hard && !negativeFirst, solved);
  const parts: [Part, Part] = rng.chance(0.5) ? [first, second] : [second, first];
  return {
    join: shape.startsWith('and') ? 'and' : 'or',
    shape,
    parts,
    ...windowFor(rng, k1, k2, 12, 2),
  };
}

function combinedSet({ join, parts }: CombineParams): Piece[] {
  const [p, q] = parts.map((part) => rayPiece(part.k, part.want));
  if (join === 'or') return canonicalPieces([p, q]);
  const both = intersect(p, q);
  return both ? [both] : [];
}

function combineDisplay({ join, parts }: CombineParams, solved: boolean): string {
  const [p, q] = parts.map(solved ? partSolved : partTex);
  return `\\begin{gathered} ${p} \\\\ \\text{${join}} \\\\ ${q} \\end{gathered}`;
}

function solvePart(part: Part): SolutionStep[] {
  if (part.a === 1 && part.b === 0) return [];
  return [
    {
      text: `$${partTex(part)}$ gives $${partSolved(part)}$${part.a < 0 ? ', the sign turned round by dividing by a negative' : ''}.`,
    },
  ];
}

function combineSolution(params: CombineParams): SolutionStep[] {
  const pieces = combinedSet(params);
  const steps = [...solvePart(params.parts[0]), ...solvePart(params.parts[1])];
  steps.push({
    text:
      params.join === 'and'
        ? `"And" keeps only the $x$ that pass **both**: the overlap of $${partSolved(params.parts[0])}$ and $${partSolved(params.parts[1])}$.`
        : `"Or" keeps every $x$ that passes **either**: everything shaded for $${partSolved(params.parts[0])}$ together with everything shaded for $${partSolved(params.parts[1])}$.`,
  });
  if (pieces.length > 0) steps.push({ tex: setTex(pieces) }, { text: describeSet(pieces) });
  else steps.push({ text: 'Nothing is in both, so there is no solution.' });
  return steps;
}

/**
 * Two inequalities joined by "and" or "or", shaded.
 *
 * "And" is the overlap and "or" is everything either one shades. Difficulty 1
 * keeps to the two usual shapes, an interval and a pair of rays pointing
 * apart; difficulty 2 adds two rays pointing the same way, where "and" keeps
 * the stricter one and "or" the wider, and hides both behind coefficients.
 */
const andOrLine: Generator<CombineParams> = {
  id: 'ineq-andor-line',
  sample: (rng, difficulty) =>
    sampleCombine(
      rng,
      difficulty,
      difficulty > 1 ? ['and-between', 'or-apart', 'and-same', 'or-same'] : ['and-between', 'or-apart'],
      false,
    ),
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      {
        kind: 'prose',
        text:
          params.join === 'and'
            ? 'Shade every $x$ that satisfies **both** of these.'
            : 'Shade every $x$ that satisfies **at least one** of these.',
      },
      { kind: 'display', tex: combineDisplay(params, false) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(combinedSet(params)),
  }),
  solution: combineSolution,
};

const YES = 'Yes';
const NO = 'No';

const COMBINE_PATH: Record<Combine, string[]> = {
  'and-between': ['And', YES, NO],
  'and-apart': ['And', NO],
  'and-same': ['And', YES, YES],
  'or-cover': ['Or', YES],
  'or-same': ['Or', NO, YES],
  'or-apart': ['Or', NO, NO],
};

/**
 * What shape will the combined set be, before anything is drawn?
 *
 * The six cases two rays can make, walked as questions: which join, whether
 * anything passes both (or whether together they cover everything), and
 * whether the two point the same way. Difficulty 2 gives the parts unsolved.
 */
const combineFlow: Generator<CombineParams> = {
  id: 'ineq-combine-flow',
  sample: (rng, difficulty) =>
    sampleCombine(
      rng,
      difficulty,
      ['and-between', 'and-apart', 'and-same', 'or-apart', 'or-cover', 'or-same'],
      difficulty < 2,
    ),
  render: (params): Slide => {
    const solved = params.parts.every((part) => part.a === 1 && part.b === 0);
    const [p, q] = params.parts.map(solved ? partSolved : partTex);
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: solved
            ? 'Before shading anything: what shape will the solution set be?'
            : 'Solve each part in your head first. Then: what shape will the solution set be?',
        },
      ],
      subject: `${p} \\quad \\text{${params.join}} \\quad ${q}`,
      steps: [
        {
          id: 'join',
          ask: 'Are the two joined by **and** or by **or**?',
          branches: [
            { label: 'And', to: 'and-meet' },
            { label: 'Or', to: 'or-cover' },
          ],
        },
        {
          id: 'and-meet',
          ask: 'Is there any $x$ that passes **both**?',
          branches: [
            { label: YES, to: 'and-way' },
            { label: NO, outcome: 'No solution: no number passes both.' },
          ],
        },
        {
          id: 'and-way',
          ask: 'Do the two point the same way along the line?',
          branches: [
            { label: YES, outcome: 'A single ray: the stricter of the two.' },
            { label: NO, outcome: 'One bounded interval, between the two ends.' },
          ],
        },
        {
          id: 'or-cover',
          ask: 'Between them, do they cover the whole number line?',
          branches: [
            { label: YES, outcome: 'Every real number is a solution.' },
            { label: NO, to: 'or-way' },
          ],
        },
        {
          id: 'or-way',
          ask: 'Do the two point the same way along the line?',
          branches: [
            { label: YES, outcome: 'A single ray: the wider of the two.' },
            { label: NO, outcome: 'Two separate rays, with a gap between them.' },
          ],
        },
      ],
      answer: COMBINE_PATH[params.shape],
    };
  },
  solution: (params) => {
    const [p, q] = params.parts;
    const pieces = combinedSet(params);
    const steps: SolutionStep[] = [...solvePart(p), ...solvePart(q)];
    steps.push({ text: `So the two are $${partSolved(p)}$ ${params.join} $${partSolved(q)}$.` });
    if (pieces.length === 0) steps.push({ text: 'Nothing passes both: there is no solution.' });
    else if (pieces[0].lo === -Infinity && pieces[0].hi === Infinity) {
      steps.push({ text: 'Every number passes at least one of them, so the whole line is shaded.' });
    } else steps.push({ tex: setTex(pieces) }, { text: describeSet(pieces) });
    return steps;
  },
};

interface DoubleParams {
  p: number;
  q: number;
  L: number;
  R: number;
  /** Whether each end of the solution is included. */
  lc: boolean;
  rc: boolean;
  /** Write the middle constant first: `5 - 2x`. */
  front: boolean;
  min: number;
  max: number;
}

function doubleTex({ p, q, L, R, lc, rc, front }: DoubleParams): string {
  const middle = front ? linTexFront(p, q) : linTex(p, q);
  return p > 0
    ? `${p * L + q} ${le(lc)} ${middle} ${le(rc)} ${p * R + q}`
    : `${p * R + q} ${le(rc)} ${middle} ${le(lc)} ${p * L + q}`;
}

function sampleDouble(rng: Rng, difficulty: number): DoubleParams {
  const hard = difficulty > 1;
  const size = rng.int(2, 5);
  const p = hard && rng.chance(0.6) ? -size : size;
  const L = rng.int(-6, 3);
  const R = L + rng.int(1, 6);
  return {
    p,
    q: rng.pick(nonZero(-9, 9)),
    L,
    R,
    lc: rng.chance(0.5),
    rc: rng.chance(0.5),
    front: p < 0 && rng.chance(0.5),
    ...windowFor(rng, L, R, 10, 1),
  };
}

function doubleSolution(params: DoubleParams): SolutionStep[] {
  const { p, q, L, R, lc, rc } = params;
  const lo = p > 0 ? p * L + q : p * R + q;
  const hi = p > 0 ? p * R + q : p * L + q;
  return [
    { tex: doubleTex(params) },
    {
      text: `Work on all three parts at once. ${q > 0 ? `Take $${q}$ from` : `Add $${-q}$ to`} every part.`,
      tex: `${lo - q} ${le(p > 0 ? lc : rc)} ${termTex(p, 1)} ${le(p > 0 ? rc : lc)} ${hi - q}`,
    },
    {
      text:
        p < 0
          ? `Divide every part by $${p}$. Both signs turn round, so write it again with the smaller number on the left.`
          : `Divide every part by $${p}$.`,
      tex: `${L} ${le(lc)} x ${le(rc)} ${R}`,
    },
  ];
}

/**
 * A double inequality solved, placed as tiles.
 *
 * Whatever is done is done to all three parts. Dividing by a negative turns
 * both signs round, and writing the result smallest-first then swaps which
 * sign sits on which side, which is the slip the bank is built to catch.
 */
const doubleTiles: Generator<DoubleParams> = {
  id: 'ineq-double-tiles',
  sample: sampleDouble,
  render: (params): Slide => {
    const { L, R, lc, rc } = params;
    const answer = [`${L}`, le(lc), le(rc), `${R}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve, and write the answer with the smaller number first.' },
        { kind: 'display', tex: doubleTex(params) },
      ],
      template: '{0} {1} x {2} {3}',
      bank: bankOf(answer, [`${-L}`, `${-R}`, le(!lc), le(!rc), '>', '\\ge']),
      answer,
    };
  },
  solution: doubleSolution,
};

/** The same double inequality, shaded. */
const doubleLine: Generator<DoubleParams> = {
  id: 'ineq-double-line',
  sample: sampleDouble,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve, then shade the solution set.' },
      { kind: 'display', tex: doubleTex(params) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf([spanPiece(params.L, params.R, params.lc, params.rc)]),
  }),
  solution: (params) => [
    ...doubleSolution(params),
    { text: describeSet([spanPiece(params.L, params.R, params.lc, params.rc)]) },
  ],
};

interface OrTilesParams {
  parts: [Part, Part];
}

/**
 * The two pieces of an "or", placed in either order.
 *
 * Each part solved on its own, the answer written as two inequalities side by
 * side. The bank holds each part left unturned or with its strictness
 * changed. Difficulty 2 gives one of them a negative coefficient.
 */
const orTiles: Generator<OrTilesParams> = {
  id: 'ineq-or-tiles',
  sample: (rng, difficulty) => {
    const k1 = rng.int(-7, 3);
    const k2 = k1 + rng.int(1, 7);
    const negativeFirst = rng.chance(0.5);
    const hard = difficulty > 1;
    const size = () => rng.int(2, 5);
    const part = (k: number, want: Op, negative: boolean): Part => {
      const s = size();
      return { a: negative ? -s : s, b: rng.pick(nonZero(-9, 9)), want, k };
    };
    const left = part(k1, rng.pick<Op>(['<', '<=']), hard && negativeFirst);
    const right = part(k2, rng.pick<Op>(['>', '>=']), hard && !negativeFirst);
    return { parts: rng.chance(0.5) ? [left, right] : [right, left] };
  },
  render: ({ parts }): Slide => {
    const answer = parts.map(partSolved);
    const wrong = parts.flatMap((part) => [
      part.a < 0 ? `x ${OP_TEX[partShown(part)]} ${part.k}` : `x ${OP_TEX[TOGGLE[part.want]]} ${part.k}`,
      `x ${OP_TEX[part.want]} ${-part.k}`,
    ]);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve each inequality. Place the two pieces of the solution set.' },
        { kind: 'display', tex: either([partTex(parts[0]), partTex(parts[1])], QOR) },
      ],
      template: '{0} \\quad \\text{or} \\quad {1}',
      bank: bankOf(answer, wrong),
      answer,
      unordered: true,
    };
  },
  solution: ({ parts }) => [
    ...parts.map((part) => ({
      text: `$${partTex(part)}$: ${part.a < 0 ? 'the coefficient is negative, so the sign turns round when you divide' : 'divide by a positive, so the sign stays'}.`,
      tex: partSolved(part),
    })),
    { text: 'An "or" answer keeps both pieces, in either order.' },
  ],
};

/* ---------- Lesson 3: quadratics whose critical values are not whole ---------- */

interface SquareParams {
  h: number;
  r: number;
  op: Op;
  /** Written as -x^2 + ..., which turns the sign round once normalised. */
  neg: boolean;
  /** The constant moved to the right-hand side. */
  right: boolean;
  min: number;
  max: number;
}

function squareDisplay({ h, r, op, neg, right }: SquareParams): string {
  const c = h * h - r * r;
  if (right) return `${quadTex(1, -2 * h, 0)} ${OP_TEX[op]} ${-c}`;
  if (neg) return `${quadTex(-1, 2 * h, -c)} ${OP_TEX[FLIP[op]]} 0`;
  return `${quadTex(1, -2 * h, c)} ${OP_TEX[op]} 0`;
}

function squareSet({ h, r, op }: SquareParams): Piece[] {
  const closed = !isStrict(op);
  return pointsRight(op)
    ? [rayPiece(h - r, closed ? '<=' : '<'), rayPiece(h + r, closed ? '>=' : '>')]
    : [spanPiece(h - r, h + r, closed, closed)];
}

/**
 * Complete the square, then shade.
 *
 * $x^2 - 2hx + c < 0$ becomes $(x - h)^2 < r^2$: the square of the distance
 * from $h$ is less than $r^2$, so $x$ is within $r$ of $h$. The same route
 * works whether or not the quadratic factorises, which is why it comes first
 * here. Difficulty 2 moves the constant across or leads with $-x^2$.
 */
const squareLine: Generator<SquareParams> = {
  id: 'ineq-square-line',
  sample: (rng, difficulty) => {
    const h = rng.int(-3, 3);
    const r = rng.int(1, 4);
    const op = rng.pick(OPS);
    const form = difficulty > 1 ? rng.pick(['right', 'neg', 'plain'] as const) : 'plain';
    const outside = pointsRight(op);
    return {
      h,
      r,
      op,
      neg: form === 'neg',
      right: form === 'right',
      ...windowFor(rng, h - r, h + r, outside ? 12 : 10, outside ? 2 : 1),
    };
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Complete the square, then shade the solution set.' },
      { kind: 'display', tex: squareDisplay(params) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(squareSet(params)),
  }),
  solution: (params) => {
    const { h, r, op, neg, right } = params;
    const pieces = squareSet(params);
    const steps: SolutionStep[] = [{ tex: squareDisplay(params) }];
    if (neg) steps.push({ text: 'Multiply through by $-1$ to make the $x^2$ term positive. The sign turns round.' });
    if (right) steps.push({ text: 'Bring the constant back to the left-hand side.' });
    steps.push(
      {
        text: `Complete the square: $x^2 ${signedTile(-2 * h, 'x')}$ is $${squareTex(h)} - ${h * h}$.`,
        tex: `${squareTex(h)} ${OP_TEX[op]} ${r * r}`,
      },
      {
        text: pointsRight(op)
          ? `A square bigger than $${r * r}$ means $x ${signedTile(-h)}$ is further than $${r}$ from zero, on either side.`
          : `A square below $${r * r}$ means $x ${signedTile(-h)}$ is within $${r}$ of zero.`,
        tex: setTex(pieces),
      },
    );
    return steps;
  },
};

const SURD_K = [2, 3, 5, 6, 7, 10, 11] as const;

interface SurdParams {
  h: number;
  k: number;
  op: Op;
  right: boolean;
}

function surdDisplay({ h, k, op, right }: SurdParams): string {
  const c = h * h - k;
  return right ? `${quadTex(1, -2 * h, 0)} ${OP_TEX[op]} ${-c}` : `${quadTex(1, -2 * h, c)} ${OP_TEX[op]} 0`;
}

function sampleSurd(rng: Rng, difficulty: number): SurdParams {
  return {
    h: rng.pick(nonZero(-4, 4)),
    k: rng.pick(SURD_K),
    op: rng.pick(OPS),
    right: difficulty > 1 && rng.chance(0.6),
  };
}

/** The solution with surd ends: between them, or outside them. */
function surdSetTex(h: number, k: number, op: Op, stack = true): string {
  const lo = surdTex(h, -1, k);
  const hi = surdTex(h, 1, k);
  const closed = !isStrict(op);
  if (!pointsRight(op)) return `${lo} ${le(closed)} x ${le(closed)} ${hi}`;
  const parts = [`x ${le(closed)} ${lo}`, `x ${closed ? '\\ge' : '>'} ${hi}`];
  return stack ? either(parts) : parts.join(' \\text{ or } ');
}

function surdSolution(params: SurdParams): SolutionStep[] {
  const { h, k, op } = params;
  return [
    { tex: surdDisplay(params) },
    { text: `$b^2 - 4ac = ${4 * k}$ is not a square number, so this does not factorise. Complete the square instead.` },
    { tex: `${squareTex(h)} ${OP_TEX[op]} ${k}` },
    { text: `The critical values are where $${squareTex(h)} = ${k}$: $x = ${h} \\pm \\sqrt{${k}}$.` },
    {
      text: pointsRight(op)
        ? 'The curve is above the axis outside its critical values.'
        : 'The curve is below the axis between its critical values.',
      tex: surdSetTex(h, k, op),
    },
  ];
}

/**
 * Pick the solution set when the critical values are surds.
 *
 * The slips on offer: the other shape (between against outside), the centre
 * with its sign wrong, and the square root forgotten.
 */
const surdSet: Generator<SurdParams> = {
  id: 'ineq-surd-set',
  sample: sampleSurd,
  render: (params): Slide => {
    const { h, k, op } = params;
    const opposite: Op = pointsRight(op) ? (isStrict(op) ? '<' : '<=') : isStrict(op) ? '>' : '>=';
    const closed = !isStrict(op);
    const noRoot = pointsRight(op)
      ? `x ${le(closed)} ${h - k} \\text{ or } x ${closed ? '\\ge' : '>'} ${h + k}`
      : `${h - k} ${le(closed)} x ${le(closed)} ${h + k}`;
    return pickOne(
      [
        { kind: 'prose', text: 'Solve. The critical values are not whole numbers, so find them exactly.' },
        { kind: 'display', tex: surdDisplay(params) },
      ],
      surdSetTex(h, k, op, false),
      [surdSetTex(h, k, opposite, false), surdSetTex(-h, k, op, false), noRoot],
    );
  },
  solution: surdSolution,
};

type MethodKind = 'square' | 'surd' | 'none' | 'touch';

interface MethodParams {
  kind: MethodKind;
  A: number;
  B: number;
  C: number;
  op: Op;
}

const METHOD_SQUARE = 'A positive square number';
const METHOD_SURD = 'Positive, but not a square';
const METHOD_ZERO = 'Zero';
const METHOD_NEGATIVE = 'Negative';

/**
 * Which route does this quadratic inequality take?
 *
 * The discriminant decides it: a square number means it factorises, any other
 * positive number means surds by the formula or by completing the square, and
 * a negative one means the curve never meets the axis, so the answer is every
 * number or none. Difficulty 2 adds repeated roots and a leading $-x^2$.
 */
const methodFlow: Generator<MethodParams> = {
  id: 'ineq-method-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind = rng.pick<MethodKind>(
      hard ? ['surd', 'surd', 'square', 'none', 'none', 'touch'] : ['surd', 'surd', 'square', 'square', 'none'],
    );
    const A = hard && rng.chance(0.4) ? -1 : 1;
    const op = rng.pick(OPS);
    if (kind === 'square') {
      const p = rng.int(-6, 5);
      const q = p + rng.int(1, 7);
      return { kind, A, B: -A * (p + q), C: A * p * q, op };
    }
    const h = rng.int(-5, 5);
    if (kind === 'surd') return { kind, A, B: -2 * A * h, C: A * (h * h - rng.pick(SURD_K)), op };
    if (kind === 'none') return { kind, A, B: -2 * A * h, C: A * (h * h + rng.int(1, 6)), op };
    return { kind, A, B: -2 * A * h, C: A * h * h, op };
  },
  render: ({ kind, A, B, C, op }): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Before solving: how will you find the critical values, if there are any?' }],
    subject: `${quadTex(A, B, C)} ${OP_TEX[op]} 0`,
    steps: [
      {
        id: 'disc',
        ask: 'Work out $b^2 - 4ac$. What do you find?',
        branches: [
          { label: METHOD_SQUARE, outcome: 'It factorises: find the critical values by factorising.' },
          { label: METHOD_SURD, outcome: 'It does not factorise: find the critical values with the formula, or by completing the square.' },
          { label: METHOD_ZERO, outcome: 'One repeated critical value, where the curve just touches the axis.' },
          { label: METHOD_NEGATIVE, to: 'side' },
        ],
      },
      {
        id: 'side',
        ask: 'The curve never meets the axis. Which side of the axis is all of it?',
        branches: [
          { label: 'Above', outcome: 'The quadratic is positive for every $x$.' },
          { label: 'Below', outcome: 'The quadratic is negative for every $x$.' },
        ],
      },
    ],
    answer:
      kind === 'square'
        ? [METHOD_SQUARE]
        : kind === 'surd'
          ? [METHOD_SURD]
          : kind === 'touch'
            ? [METHOD_ZERO]
            : [METHOD_NEGATIVE, A > 0 ? 'Above' : 'Below'],
  }),
  solution: ({ kind, A, B, C }) => {
    const D = B * B - 4 * A * C;
    const steps: SolutionStep[] = [
      { text: 'Work out the discriminant, $b^2 - 4ac$.', tex: `${br(B)}^2 - 4${A === 1 ? '' : `(${A})`}(${C}) = ${D}` },
    ];
    if (kind === 'square') steps.push({ text: `$${D}$ is a square number, so the quadratic factorises.` });
    if (kind === 'surd') steps.push({ text: `$${D}$ is positive but not a square, so the critical values are surds.` });
    if (kind === 'touch') steps.push({ text: 'Zero: the two critical values are the same number.' });
    if (kind === 'none') {
      steps.push({
        text: `Negative: no critical values. The $x^2$ term is ${A > 0 ? 'positive, so the curve is a U sitting above' : 'negative, so the curve is an upside-down U sitting below'} the axis.`,
      });
    }
    return steps;
  },
};

interface CentreParams {
  A: number;
  h: number;
  k: number;
}

/**
 * Slide to the line the two surd critical values sit either side of.
 *
 * They are $h \pm \sqrt{k}$, the same distance either side of $x = h$, which
 * is $-\frac{b}{2a}$. Difficulty 2 scales the whole quadratic, which moves
 * nothing but makes $-\frac{b}{2a}$ the only quick route.
 */
const centreSlider: Generator<CentreParams> = {
  id: 'ineq-centre-slider',
  sample: (rng, difficulty) => ({
    A: difficulty > 1 ? rng.pick([2, 3]) : 1,
    h: rng.int(-4, 4),
    k: rng.pick(SURD_K),
  }),
  render: ({ A, h, k }): Slide => {
    const B = -2 * A * h;
    const C = A * (h * h - k);
    const quad = quadTex(A, B, C);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `$y = ${quad}$ crosses the axis at two critical values that are not whole numbers. They sit the same distance either side of the curve's line of symmetry. Slide to that line.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: h,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -A * k - A * 1.5,
          yMax: A * k * 1.5 + A,
          curves: [{ f: (x: number) => A * x * x + B * x + C }],
          verticals: [{ x: 0, dashed: false }],
          label: 'A U-shaped curve crossing the x-axis twice',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: ({ A, h, k }) => [
    { text: 'The line of symmetry is $x = -\\frac{b}{2a}$.' },
    { tex: `x = -\\frac{${-2 * A * h}}{2 \\times ${A}} = ${h}` },
    { text: `The critical values are $${h} \\pm \\sqrt{${k}}$, one either side of it.` },
  ],
};

/**
 * Assemble the solution set from surd tiles.
 *
 * Between the critical values it is one piece written smallest first; outside
 * them it is two, pointing apart. The bank offers the centre with the wrong
 * sign and the root forgotten.
 */
const criticalTiles: Generator<SurdParams> = {
  id: 'ineq-critical-tiles',
  sample: sampleSurd,
  render: (params): Slide => {
    const { h, k, op } = params;
    const lo = surdTex(h, -1, k);
    const hi = surdTex(h, 1, k);
    const closed = !isStrict(op);
    const outside = pointsRight(op);
    const answer = outside ? [le(closed), lo, closed ? '\\ge' : '>', hi] : [lo, le(closed), le(closed), hi];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve, and place the solution set.' },
        { kind: 'display', tex: surdDisplay(params) },
      ],
      template: outside ? 'x {0} {1} \\quad \\text{or} \\quad x {2} {3}' : '{0} {1} x {2} {3}',
      bank: bankOf(answer, [surdTex(-h, -1, k), surdTex(-h, 1, k), `${h - k}`, '<', '\\le', '>', '\\ge']),
      answer,
    };
  },
  solution: surdSolution,
};

/* ---------- Lesson 4: rational inequalities ---------- */

interface RationalParams {
  zeros: number[];
  pole: number;
  op: Op;
  /** The bottom written q - x, which turns every sign. */
  flipDen: boolean;
  min: number;
  max: number;
}

const factorTex = (z: number) => (z === 0 ? 'x' : `(x ${signedTile(-z)})`);

function rationalTex({ zeros, pole, op, flipDen }: RationalParams): string {
  const top = zeros.length === 1 ? linTex(1, -zeros[0]) : zeros.map(factorTex).join('');
  const bottom = flipDen ? linTexFront(-1, pole) : linTex(1, -pole);
  return `\\frac{${top}}{${bottom}} ${OP_TEX[op]} 0`;
}

const rationalSet = ({ zeros, pole, op, flipDen }: RationalParams) =>
  signSet(zeros, [pole], flipDen ? -1 : 1, op);

function rationalSolution(params: RationalParams): SolutionStep[] {
  const { zeros, pole, flipDen } = params;
  const pieces = rationalSet(params);
  const critical = [...zeros, pole].sort((a, b) => a - b);
  const ends = [-Infinity, ...critical, Infinity];
  const sign = flipDen ? -1 : 1;
  const regions: string[] = [];
  for (let i = 0; i + 1 < ends.length; i += 1) {
    const lo = ends[i];
    const hi = ends[i + 1];
    const probe = lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    const value = (sign * zeros.reduce((acc, z) => acc * (probe - z), 1)) / (probe - pole);
    const where = lo === -Infinity ? `$x < ${hi}$` : hi === Infinity ? `$x > ${lo}$` : `$${lo} < x < ${hi}$`;
    regions.push(`${where}: ${signWord(value)}`);
  }
  return [
    {
      text: `Critical values: where the top is zero (${zeros.map((z) => `$${z}$`).join(' and ')}) and where the bottom is zero ($${pole}$).`,
    },
    { text: `Test one value in each region. ${regions.join('; ')}.` },
    {
      text: `$x = ${pole}$ makes the bottom zero, so the fraction has no value there: that dot is always hollow.${
        isStrict(params.op) ? '' : ' The zeros of the top are included, so their dots are filled.'
      }`,
    },
    { tex: setTex(pieces) },
  ];
}

/**
 * A rational inequality, shaded from its sign table.
 *
 * Never multiplied through: the bottom can be negative, and multiplying by it
 * would turn the sign on half the line and not the other. The pole is always
 * hollow. Difficulty 2 has two zeros on top, or the bottom written $q - x$.
 */
const rationalLine: Generator<RationalParams> = {
  id: 'ineq-rational-line',
  sample: (rng, difficulty) => {
    const op = rng.pick(OPS);
    if (difficulty < 2 || rng.chance(0.4)) {
      const [p, q] = drawUntil(
        () => [rng.int(-5, 5), rng.int(-5, 5)],
        ([a, b]) => a !== b && Math.abs(a - b) <= 8,
        [1, 4],
      );
      return {
        zeros: [p],
        pole: q,
        op,
        flipDen: difficulty > 1,
        ...windowFor(rng, Math.min(p, q), Math.max(p, q), 12, 2),
      };
    }
    const values = drawUntil(
      () => [rng.int(-5, 5), rng.int(-5, 5), rng.int(-5, 5)],
      (vs) => new Set(vs).size === 3 && Math.max(...vs) - Math.min(...vs) <= 8,
      [-2, 1, 4],
    );
    return {
      zeros: [values[0], values[1]].sort((a, b) => a - b),
      pole: values[2],
      op,
      flipDen: false,
      ...windowFor(rng, Math.min(...values), Math.max(...values), 12, 2),
    };
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      {
        kind: 'prose',
        text: 'Shade the solution set. Use the signs of the top and the bottom: never multiply through by something that could be negative.',
      },
      { kind: 'display', tex: rationalTex(params) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(rationalSet(params)),
  }),
  solution: rationalSolution,
};

interface SignParams {
  p: number;
  q: number;
  t: number;
  op: Op;
  flipDen: boolean;
}

const signTop = ({ p }: SignParams) => linTex(1, -p);
const signBottom = ({ q, flipDen }: SignParams) => (flipDen ? linTexFront(-1, q) : linTex(1, -q));
const signIneq = (params: SignParams) =>
  `\\frac{${signTop(params)}}{${signBottom(params)}} ${OP_TEX[params.op]} 0`;

const POSITIVE = 'Positive';
const NEGATIVE = 'Negative';

/**
 * One line of the sign table: the sign of the top, the bottom, and the whole
 * fraction at a test value, then whether that region is in the set.
 *
 * Difficulty 2 writes the bottom as $q - x$, whose sign runs the other way.
 */
const signFlow: Generator<SignParams> = {
  id: 'ineq-sign-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        p: rng.int(-6, 6),
        q: rng.int(-6, 6),
        t: rng.int(-8, 8),
        op: rng.pick(OPS),
        flipDen: difficulty > 1 && rng.chance(0.6),
      }),
      ({ p, q, t }) => p !== q && t !== p && t !== q,
      { p: 1, q: 4, t: 2, op: '>', flipDen: false },
    ),
  render: (params): Slide => {
    const { p, q, t, op, flipDen } = params;
    const top = t - p;
    const bottom = flipDen ? q - t : t - q;
    const positive = top * bottom > 0;
    const inSet = pointsRight(op) ? positive : !positive;
    const verdict = (sign: string) => ({
      ask: `So the fraction is ${sign} at $x = ${t}$. Is $x = ${t}$ in the solution set of $${signIneq(params)}$?`,
      branches: [
        { label: YES, outcome: `Yes: the region containing $${t}$ is shaded.` },
        { label: NO, outcome: `No: the region containing $${t}$ is left out.` },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Test the value $x = ${t}$ in this inequality, one sign at a time.` }],
      subject: signIneq(params),
      steps: [
        {
          id: 'top',
          ask: `Put $x = ${t}$ into the top, $${signTop(params)}$. Is it positive or negative?`,
          branches: [
            { label: POSITIVE, to: 'bottom-p' },
            { label: NEGATIVE, to: 'bottom-n' },
          ],
        },
        {
          id: 'bottom-p',
          ask: `And the bottom, $${signBottom(params)}$?`,
          branches: [
            { label: POSITIVE, to: 'frac-pos' },
            { label: NEGATIVE, to: 'frac-neg' },
          ],
        },
        {
          id: 'bottom-n',
          ask: `And the bottom, $${signBottom(params)}$?`,
          branches: [
            { label: POSITIVE, to: 'frac-neg' },
            { label: NEGATIVE, to: 'frac-pos' },
          ],
        },
        { id: 'frac-pos', ...verdict('positive') },
        { id: 'frac-neg', ...verdict('negative') },
      ],
      answer: [top > 0 ? POSITIVE : NEGATIVE, bottom > 0 ? POSITIVE : NEGATIVE, inSet ? YES : NO],
    };
  },
  solution: (params) => {
    const { p, q, t, op, flipDen } = params;
    const top = t - p;
    const bottom = flipDen ? q - t : t - q;
    const positive = top * bottom > 0;
    return [
      { text: `Top: $${signTop(params).replace('x', br(t))} = ${top}$, ${signWord(top)}.` },
      { text: `Bottom: $${flipDen ? `${q} - ${br(t)}` : `${br(t)} ${signedTile(-q)}`} = ${bottom}$, ${signWord(bottom)}.` },
      {
        text: `${top > 0 ? 'Positive' : 'Negative'} over ${bottom > 0 ? 'positive' : 'negative'} is ${signWord(top * bottom)}, and the inequality asks for ${
          pointsRight(op) ? 'a positive' : 'a negative'
        } value, so $x = ${t}$ ${positive === pointsRight(op) ? 'is' : 'is not'} in the set.`,
      },
    ];
  },
};

interface TestTreeParams {
  a: number;
  c: number;
  q: number;
  t: number;
  op: Op;
}

/**
 * The value of the fraction at a test point, as a tree.
 *
 * The top and the bottom are worked out separately and only then divided,
 * which is the discipline a sign table rests on. Built so the fraction comes
 * out whole. Difficulty 2 puts a coefficient on the top's $x$.
 */
const testTree: Generator<TestTreeParams> = {
  id: 'ineq-test-tree',
  sample: (rng, difficulty) => {
    const a = difficulty > 1 ? rng.pick([2, 3]) : 1;
    const t = rng.int(-6, 6);
    const d = rng.pick(difficulty > 1 ? [-4, -3, -2, -1, 1, 2, 3, 4] : [-3, -2, -1, 1, 2, 3]);
    const m = rng.pick([-4, -3, -2, -1, 2, 3, 4]);
    return { a, c: a * t - d * m, q: t - d, t, op: rng.pick(OPS) };
  },
  render: ({ a, c, q, t, op }): Slide => {
    const top = a * t - c;
    const bottom = t - q;
    const value = top / bottom;
    const answer = [`${top}`, `${bottom}`, `${value}`];
    const topSub = `${a === 1 ? br(t) : `${a} \\times ${br(t)}`}${c === 0 ? '' : ` ${signedTile(-c)}`}`;
    const bottomSub = `${br(t)}${q === 0 ? '' : ` ${signedTile(-q)}`}`;
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Test $x = ${t}$ in $\\frac{${linTex(a, -c)}}{${linTex(1, -q)}} ${OP_TEX[op]} 0$. Fill the tree: the top, the bottom, and then the value of the fraction.`,
        },
      ],
      expression: `\\frac{${topSub}}{${bottomSub}}`,
      nodes: [
        { id: 'top', from: [] },
        { id: 'bottom', from: [] },
        { id: 'value', from: ['top', 'bottom'] },
      ],
      bank: treeBank(answer, [-top, -bottom, -value, a * t + c, t + q], value),
      answer,
    };
  },
  solution: ({ a, c, q, t, op }) => {
    const top = a * t - c;
    const bottom = t - q;
    const value = top / bottom;
    const passes = pointsRight(op) ? value > 0 : value < 0;
    return [
      { text: `Top: $${linTex(a, -c)}$ at $x = ${t}$ is $${top}$.` },
      { text: `Bottom: $${linTex(1, -q)}$ at $x = ${t}$ is $${bottom}$.` },
      { tex: `\\frac{${top}}{${bottom}} = ${value}` },
      { text: `$${value}$ ${passes ? 'satisfies' : 'does not satisfy'} $${OP_TEX[op]} 0$, so the region containing $${t}$ is ${passes ? 'in' : 'out of'} the set.` },
    ];
  },
};

interface PoleParams {
  p: number;
  q: number;
  op: Op;
  flipDen: boolean;
}

/**
 * Pick the solution when the zero is included and the pole cannot be.
 *
 * The slips: the pole's dot filled in, multiplying through (which loses the
 * pole entirely and leaves a single ray), and the regions the other way round.
 */
const excludedPole: Generator<PoleParams> = {
  id: 'ineq-excluded-pole',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        p: rng.int(-6, 6),
        q: rng.int(-6, 6),
        op: rng.pick<Op>(['<=', '>=']),
        flipDen: difficulty > 1 && rng.chance(0.5),
      }),
      ({ p, q }) => p !== q,
      { p: 2, q: 5, op: '>=', flipDen: false },
    ),
  render: ({ p, q, op, flipDen }): Slide => {
    const sign = flipDen ? -1 : 1;
    const pieces = signSet([p], [q], sign, op);
    const closedPole = canonicalPieces(
      pieces.map((piece) => ({
        ...piece,
        loClosed: piece.loClosed || piece.lo === q,
        hiClosed: piece.hiClosed || piece.hi === q,
      })),
    );
    const through = [rayPiece(p, op)];
    const opposite = signSet([p], [q], sign, FLIP[op]);
    const params: RationalParams = { zeros: [p], pole: q, op, flipDen, min: 0, max: 0 };
    return pickOne(
      [
        { kind: 'prose', text: 'Solve.' },
        { kind: 'display', tex: rationalTex(params) },
      ],
      setTex(pieces, false),
      [setTex(closedPole, false), setTex(through, false), setTex(opposite, false)],
    );
  },
  solution: ({ p, q, op, flipDen }) =>
    rationalSolution({ zeros: [p], pole: q, op, flipDen, min: 0, max: 0 }),
};

/* ---------- Lesson 5: writing solution sets ---------- */

interface RegionParams {
  pieces: Piece[];
  min: number;
  max: number;
  /** Read back in set-builder notation rather than interval notation. */
  builder?: boolean;
}

/**
 * A set to write or read: a ray or an interval, and at difficulty 2 also two
 * pieces, two rays pointing apart or an interval and a ray.
 */
function sampleRegion(rng: Rng, difficulty: number): RegionParams {
  const shape = rng.pick(
    difficulty > 1 ? (['interval', 'rays', 'mixed', 'rays', 'mixed'] as const) : (['ray', 'interval', 'interval'] as const),
  );
  if (shape === 'ray') {
    const k = rng.int(-5, 5);
    return { pieces: [rayPiece(k, rng.pick(OPS))], ...windowFor(rng, k, k, 10, 2) };
  }
  if (shape === 'interval') {
    const lo = rng.int(-6, 2);
    const hi = lo + rng.int(2, 6);
    return { pieces: [spanPiece(lo, hi, rng.chance(0.5), rng.chance(0.5))], ...windowFor(rng, lo, hi, 10, 1) };
  }
  if (shape === 'rays') {
    const k1 = rng.int(-5, 1);
    const k2 = k1 + rng.int(2, 6);
    return {
      pieces: [rayPiece(k1, rng.pick<Op>(['<', '<='])), rayPiece(k2, rng.pick<Op>(['>', '>=']))],
      ...windowFor(rng, k1, k2, 12, 2),
    };
  }
  const lo = rng.int(-5, 0);
  const hi = lo + rng.int(1, 3);
  const k = hi + rng.int(2, 3);
  return {
    pieces: [spanPiece(lo, hi, rng.chance(0.5), rng.chance(0.5)), rayPiece(k, rng.pick<Op>(['>', '>=']))],
    ...windowFor(rng, lo, k, 12, 2),
  };
}

/** Every finite end toggled by `pick`, for building near-miss notations. */
function toggleEnds(pieces: Piece[], pick: (index: number, count: number) => boolean): Piece[] {
  const ends: { piece: number; side: 'lo' | 'hi' }[] = [];
  pieces.forEach((piece, idx) => {
    if (Number.isFinite(piece.lo)) ends.push({ piece: idx, side: 'lo' });
    if (Number.isFinite(piece.hi)) ends.push({ piece: idx, side: 'hi' });
  });
  const out = pieces.map((piece) => ({ ...piece }));
  ends.forEach((end, idx) => {
    if (!pick(idx, ends.length)) return;
    const piece = out[end.piece];
    if (end.side === 'lo') piece.loClosed = !piece.loClosed;
    else piece.hiClosed = !piece.hiClosed;
  });
  return out;
}

/** The ray or rays mirrored: each one pointing the other way from the same end. */
function mirrored(pieces: Piece[]): Piece[] {
  return pieces.map((piece) => {
    if (piece.lo === -Infinity) return { lo: piece.hi, hi: Infinity, loClosed: piece.hiClosed, hiClosed: false };
    if (piece.hi === Infinity) return { lo: -Infinity, hi: piece.lo, loClosed: false, hiClosed: piece.loClosed };
    return { ...piece, loClosed: !piece.loClosed, hiClosed: !piece.hiClosed };
  });
}

function intervalTokens(piece: Piece): string[] {
  return [piece.loClosed ? '[' : '(', endTex(piece.lo), endTex(piece.hi), piece.hiClosed ? ']' : ')'];
}

/**
 * Inequalities rewritten in interval notation, from tiles.
 *
 * A square bracket for an end that is included, a round one for an end that
 * is not, and always round beside $\infty$, since infinity is never reached.
 */
const intervalTiles: Generator<RegionParams> = {
  id: 'ineq-interval-tiles',
  sample: sampleRegion,
  render: ({ pieces }): Slide => {
    const canonical = canonicalPieces(pieces);
    const answer = canonical.flatMap(intervalTokens);
    const ends = canonical.flatMap((piece) => [piece.lo, piece.hi]).filter(Number.isFinite);
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Write this set in interval notation.' },
        { kind: 'display', tex: setTex(canonical) },
      ],
      template: canonical.length === 1 ? 'x \\in {0}{1}, {2}{3}' : 'x \\in {0}{1}, {2}{3} \\cup {4}{5}, {6}{7}',
      bank: bankOf(answer, [
        ...ends.map((end) => `${-end}`),
        `${ends[0] - 1}`,
        '(',
        ')',
        '[',
        ']',
        '\\infty',
        '-\\infty',
      ]),
      answer,
    };
  },
  solution: ({ pieces }) => [
    {
      text: 'A square bracket means the end is included; a round one means it is not. Beside $\\infty$ the bracket is always round, since infinity is never reached.',
    },
    { tex: setTex(pieces) },
    { text: 'In interval notation that is', tex: `x \\in ${intervalSetTex(pieces)}` },
  ],
};

/**
 * Read a shaded set back in notation.
 *
 * Interval notation at difficulty 1; at difficulty 2 half the time set-builder
 * notation, with its $\cup$ joining the pieces. The near misses change one end,
 * the other end, or both, or turn a ray round.
 */
const readRegion: Generator<RegionParams> = {
  id: 'ineq-read-region',
  sample: (rng, difficulty) => ({ ...sampleRegion(rng, difficulty), builder: difficulty > 1 && rng.chance(0.5) }),
  render: (params): Slide => {
    const { pieces, min, max } = params;
    const builder = params.builder === true;
    const write = builder ? builderTex : intervalSetTex;
    const correct = write(pieces);
    const wrong = [
      write(toggleEnds(pieces, (idx) => idx === 0)),
      write(toggleEnds(pieces, (idx, count) => idx === count - 1)),
      write(mirrored(pieces)),
      write(toggleEnds(pieces, () => true)),
    ];
    return pickOne(
      [
        { kind: 'prose', text: `Which ${builder ? 'set' : 'interval'} notation describes the shaded set?` },
        { kind: 'diagram', svg: lineSvg(min, max, pieces, 'A solution set shaded on a number line') },
      ],
      correct,
      wrong,
    );
  },
  solution: (params) => [
    { text: describeSet(params.pieces) },
    { tex: intervalSetTex(params.pieces) },
    { text: `The same set in set-builder notation is $${builderTex(params.pieces)}$.` },
  ],
};

/** One piece, one end at a time, as a walk. */
const bracketFlow: Generator<RegionParams> = {
  id: 'ineq-bracket-flow',
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.6)) {
      const k = rng.int(-9, 9);
      return { pieces: [rayPiece(k, rng.pick(OPS))], min: 0, max: 0 };
    }
    const lo = rng.int(-9, 5);
    const hi = lo + rng.int(1, 9);
    return { pieces: [spanPiece(lo, hi, rng.chance(0.5), rng.chance(0.5))], min: 0, max: 0 };
  },
  render: ({ pieces }): Slide => {
    const piece = pieces[0];
    const lo = endTex(piece.lo);
    const hi = endTex(piece.hi);
    const right = (open: string) => ({
      ask: `And at the right-hand end, $${hi}$?`,
      branches: [
        { label: 'Square', outcome: `You have written $${open}${lo}, ${hi}]$.` },
        { label: 'Round', outcome: `You have written $${open}${lo}, ${hi})$.` },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Write this set in interval notation, one end at a time.' }],
      subject: pieceTex(piece),
      steps: [
        {
          id: 'left',
          ask: `Which bracket goes at the left-hand end, $${lo}$?`,
          branches: [
            { label: 'Square', to: 'right-sq' },
            { label: 'Round', to: 'right-rd' },
          ],
        },
        { id: 'right-sq', ...right('[') },
        { id: 'right-rd', ...right('(') },
      ],
      answer: [piece.loClosed ? 'Square' : 'Round', piece.hiClosed ? 'Square' : 'Round'],
    };
  },
  solution: ({ pieces }) => {
    const piece = pieces[0];
    const say = (value: number, closed: boolean) =>
      !Number.isFinite(value)
        ? `$${endTex(value)}$ is never reached, so round`
        : closed
          ? `$${value}$ is included, so square`
          : `$${value}$ is left out, so round`;
    return [
      { text: `Left end: ${say(piece.lo, piece.loClosed)}. Right end: ${say(piece.hi, piece.hiClosed)}.` },
      { tex: `x \\in ${intervalTex(piece)}` },
    ];
  },
};

/** A set given in interval notation, shaded. */
const intervalLine: Generator<RegionParams> = {
  id: 'ineq-interval-line',
  sample: sampleRegion,
  render: ({ pieces, min, max }): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Shade this set on the number line.' },
      { kind: 'display', tex: `x \\in ${intervalSetTex(pieces)}` },
    ],
    min,
    max,
    step: 1,
    answer: setOf(pieces),
  }),
  solution: ({ pieces }) => [
    { text: 'A square bracket is a filled dot and a round one is hollow; an end at $\\infty$ is a ray running off the line.' },
    { text: describeSet(pieces) },
  ],
};

interface CountParams {
  p: number;
  q: number;
  lo: number;
  hi: number;
  lc: boolean;
  rc: boolean;
}

function countSolutions({ p, q, lo, hi, lc, rc }: CountParams): number[] {
  const out: number[] = [];
  for (let n = -60; n <= 60; n += 1) {
    const v = p * n + q;
    const above = lc ? v >= lo : v > lo;
    const below = rc ? v <= hi : v < hi;
    if (above && below) out.push(n);
  }
  return out;
}

const countTex = ({ p, q, lo, hi, lc, rc }: CountParams) => `${lo} ${le(lc)} ${linTex(p, q)} ${le(rc)} ${hi}`;

/**
 * How many whole numbers satisfy a double inequality?
 *
 * A number to type, so the checker grades it. The ends usually are not whole
 * once divided, which is where the count goes wrong. Difficulty 2 brings a
 * negative coefficient.
 */
const integersCount: Generator<CountParams> = {
  id: 'ineq-integers-count',
  choices: (params) => {
    const n = countSolutions(params).length;
    return numberChoices(n, [n + 1, n - 1, n + 2], countTex(params));
  },
  sample: (rng, difficulty) => {
    const pool = difficulty > 1 ? [-3, -2, 2, 3] : [1, 2, 2, 3];
    return drawUntil(
      () => {
        const lo = rng.int(-15, 8);
        return {
          p: rng.pick(pool),
          q: rng.pick(nonZero(-7, 7)),
          lo,
          hi: lo + rng.int(3, 16),
          lc: rng.chance(0.5),
          rc: rng.chance(0.5),
        };
      },
      (params) => {
        const n = countSolutions(params).length;
        return n >= 2 && n <= 9;
      },
      { p: 2, q: 1, lo: -3, hi: 9, lc: false, rc: true },
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'How many whole numbers $x$ satisfy this? Call the count $n$.' },
      { kind: 'display', tex: countTex(params) },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${countSolutions(params).length}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { p, q, lo, hi, lc, rc } = params;
    const found = countSolutions(params);
    const a = fracTex(lo - q, p);
    const b = fracTex(hi - q, p);
    return [
      { tex: countTex(params) },
      {
        text: `${q > 0 ? `Take $${q}$ from` : `Add $${-q}$ to`} every part, then divide by $${p}$${p < 0 ? ', turning both signs round' : ''}.`,
        tex: p > 0 ? `${a} ${le(lc)} x ${le(rc)} ${b}` : `${b} ${le(rc)} x ${le(lc)} ${a}`,
      },
      { text: `The whole numbers in that range are $${found.join(', ')}$: that is $${found.length}$ of them.` },
    ];
  },
};

/* ======================================================================
 * Level 2: The Modulus Function
 * ==================================================================== */

/** |inside|, as the learner reads it. */
const absTex = (inside: string) => `\\lvert ${inside} \\rvert`;

/** |ax + b|, written constant first when `front` is set: |6 - 2x|. */
const absLin = (a: number, b: number, front = false) => absTex(front ? linTexFront(a, b) : linTex(a, b));

/* ---------- Lesson 1: |x| as a distance ---------- */

type EvalForm = 'diff' | 'minus' | 'scaled' | 'nested' | 'sum';

interface EvalParams {
  form: EvalForm;
  a: number;
  b: number;
  c: number;
  d: number;
}

function evalTex({ form, a, b, c, d }: EvalParams): string {
  if (form === 'diff') return absTex(`${a} - ${br(b)}`);
  if (form === 'minus') return `${absTex(`${a}`)} - ${absTex(`${b}`)}`;
  if (form === 'scaled') return `${c}${absTex(`${a} - ${br(b)}`)}`;
  if (form === 'nested') return absTex(`${a} - ${absTex(`${b} - ${br(c)}`)}`);
  return `${absTex(`${a} - ${br(b)}`)} - ${absTex(`${c} - ${br(d)}`)}`;
}

function evalValue({ form, a, b, c, d }: EvalParams): number {
  if (form === 'diff') return Math.abs(a - b);
  if (form === 'minus') return Math.abs(a) - Math.abs(b);
  if (form === 'scaled') return c * Math.abs(a - b);
  if (form === 'nested') return Math.abs(a - Math.abs(b - c));
  return Math.abs(a - b) - Math.abs(c - d);
}

/** The same expression with every bar ignored: the slip the options offer. */
function evalBarless({ form, a, b, c, d }: EvalParams): number {
  if (form === 'diff') return a - b;
  if (form === 'minus') return a - b;
  if (form === 'scaled') return c * (a - b);
  if (form === 'nested') return a - (b - c);
  return a - b - (c - d);
}

function evalSolution(params: EvalParams): SolutionStep[] {
  const { form, a, b, c, d } = params;
  const value = evalValue(params);
  const steps: SolutionStep[] = [{ text: 'Work inside each pair of bars first, then take the distance from zero: drop any minus sign.' }];
  if (form === 'diff') steps.push({ tex: `${absTex(`${a - b}`)} = ${value}` });
  if (form === 'minus') steps.push({ tex: `${Math.abs(a)} - ${Math.abs(b)} = ${value}` });
  if (form === 'scaled') steps.push({ tex: chain([`${c} \\times ${absTex(`${a - b}`)}`, `${c} \\times ${Math.abs(a - b)}`, `${value}`]) });
  if (form === 'nested') {
    steps.push({
      tex: chain([absTex(`${a} - ${absTex(`${b - c}`)}`), absTex(`${a} - ${Math.abs(b - c)}`), absTex(`${a - Math.abs(b - c)}`), `${value}`]),
    });
  }
  if (form === 'sum') {
    steps.push({ tex: chain([`${absTex(`${a - b}`)} - ${absTex(`${c - d}`)}`, `${Math.abs(a - b)} - ${Math.abs(c - d)}`, `${value}`]) });
  }
  return steps;
}

function sampleEval(rng: Rng, forms: readonly EvalForm[]): EvalParams {
  return drawUntil(
    () => ({
      form: rng.pick(forms),
      a: rng.int(-9, 9),
      b: rng.int(-9, 9),
      c: rng.int(-9, 9),
      d: rng.int(-9, 9),
    }),
    (p) => {
      if (p.form === 'scaled') return p.a !== p.b && p.c >= 2 && p.c <= 4;
      if (p.form === 'minus') return p.a !== 0 && p.b !== 0 && (p.a < 0 || p.b < 0);
      if (p.form === 'nested') return p.b - p.c < 0 && p.a !== Math.abs(p.b - p.c);
      if (p.form === 'sum') return p.a !== p.b && p.c !== p.d && (p.a - p.b < 0 || p.c - p.d < 0);
      return p.a - p.b < 0;
    },
    { form: 'diff', a: 3, b: 8, c: 0, d: 0 },
  );
}

/**
 * Evaluate an expression with modulus bars in it.
 *
 * A number to type. The bars are the whole point, so every draw has something
 * negative inside at least one pair, and the options offer the value with the
 * bars ignored. Difficulty 2 nests one pair inside another, or subtracts two.
 */
const modEvaluate: Generator<EvalParams> = {
  id: 'mod-evaluate',
  choices: (params) => {
    const value = evalValue(params);
    return numberChoices(value, [evalBarless(params), -value, value + 2], evalTex(params));
  },
  sample: (rng, difficulty) => sampleEval(rng, difficulty > 1 ? ['nested', 'sum', 'minus'] : ['diff', 'minus', 'scaled']),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Evaluate. The modulus of a number is its distance from zero, so it is never negative.',
      },
    ],
    lead: `${evalTex(params)} =`,
    keypad: [],
    answer: `${evalValue(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: evalSolution,
};

/**
 * The same kind of expression worked as a tree: each inside first, then its
 * modulus, then the combination. Two subtractions at difficulty 1, a nested
 * pair at difficulty 2.
 */
const modEvaluateTree: Generator<EvalParams> = {
  id: 'mod-evaluate-tree',
  sample: (rng, difficulty) => sampleEval(rng, difficulty > 1 ? ['nested'] : ['sum']),
  render: (params): Slide => {
    const { form, a, b, c, d } = params;
    if (form === 'nested') {
      const inner = b - c;
      const outer = a - Math.abs(inner);
      const answer = [`${inner}`, `${Math.abs(inner)}`, `${outer}`, `${Math.abs(outer)}`];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: 'Evaluate from the inside out. Fill the tree: the inner subtraction, its modulus, the outer subtraction, and its modulus.',
          },
        ],
        expression: evalTex(params),
        nodes: [
          { id: 'inner', from: [] },
          { id: 'inner-abs', from: ['inner'] },
          { id: 'outer', from: ['inner-abs'] },
          { id: 'outer-abs', from: ['outer'] },
        ],
        bank: treeBank(answer, [-Math.abs(outer), a + Math.abs(inner), a - inner, -outer], Math.abs(outer)),
        answer,
      };
    }
    const first = a - b;
    const second = c - d;
    const total = Math.abs(first) - Math.abs(second);
    const answer = [`${first}`, `${Math.abs(first)}`, `${second}`, `${Math.abs(second)}`, `${total}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: 'Fill the tree: each subtraction, then its modulus, then the difference of the two.',
        },
      ],
      expression: evalTex(params),
      nodes: [
        { id: 'first', from: [] },
        { id: 'first-abs', from: ['first'] },
        { id: 'second', from: [] },
        { id: 'second-abs', from: ['second'] },
        { id: 'total', from: ['first-abs', 'second-abs'] },
      ],
      bank: treeBank(answer, [-Math.abs(first), -Math.abs(second), first - second, -total], total),
      answer,
    };
  },
  solution: evalSolution,
};

interface DistanceParams {
  a: number;
  b: number;
  op: Op;
  /** Show the statement and ask for the words, rather than the other way. */
  reverse: boolean;
}

const distanceHow = (op: Op) =>
  op === '<' ? 'less than' : op === '<=' ? 'at most' : op === '>' ? 'more than' : 'at least';

/** The distance statement in words, as TeX. */
function distanceWords(a: number, b: number, op: Op): string {
  return `\\text{${distanceHow(op)} } ${b} \\text{ away from } ${a}`;
}

/** The same distance in prose, with only the numbers set as maths. */
const distanceProse = (a: number, b: number, op: Op) => `${distanceHow(op)} $${b}$ away from $${a}$`;

const distanceTex = (a: number, b: number, op: Op) => `${absLin(1, -a)} ${OP_TEX[op]} ${b}`;

/**
 * Translate between a distance and a modulus statement.
 *
 * $|x - a| < b$ says $x$ is less than $b$ away from $a$. Difficulty 1 gives the
 * words and asks for the statement; difficulty 2 mostly the other way round.
 * The slips: $|x + a|$ for "from $a$", the two numbers swapped, and the
 * direction reversed.
 */
const asDistance: Generator<DistanceParams> = {
  id: 'mod-as-distance',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        a: rng.pick(nonZero(-6, 6)),
        b: rng.int(1, difficulty > 1 ? 8 : 6),
        op: rng.pick(OPS),
        reverse: difficulty > 1 && rng.chance(0.7),
      }),
      ({ a, b }) => a !== b && a !== -b,
      { a: -2, b: 4, op: '<', reverse: false },
    ),
  render: ({ a, b, op, reverse }): Slide => {
    if (reverse) {
      return pickOne(
        [
          { kind: 'prose', text: 'What does this say about $x$? Finish the sentence: $x$ is…' },
          { kind: 'display', tex: distanceTex(a, b, op) },
        ],
        distanceWords(a, b, op),
        [distanceWords(-a, b, op), distanceWords(b, a < 0 ? -a : a, op), distanceWords(a, b, FLIP[op])],
      );
    }
    return pickOne(
      [{ kind: 'prose', text: `Which statement says that $x$ is $${distanceWords(a, b, op)}$?` }],
      distanceTex(a, b, op),
      [distanceTex(-a, b, op), `${absLin(1, -b)} ${OP_TEX[op]} ${Math.abs(a)}`, distanceTex(a, b, FLIP[op])],
    );
  },
  solution: ({ a, b, op }) => [
    { text: `$${absLin(1, -a)}$ is the distance between $x$ and $${a}$: subtract, then drop the sign.` },
    { tex: distanceTex(a, b, op) },
    { text: `So $x$ is ${distanceProse(a, b, op)}.` },
  ],
};

interface DistanceLineParams {
  a: number;
  b: number;
  op: Op;
  words: boolean;
  min: number;
  max: number;
}

/** Within `b` of `a`, or at least `b` from it. */
function aroundSet(a: number, b: number, op: Op): Piece[] {
  const closed = !isStrict(op);
  return pointsRight(op)
    ? [rayPiece(a - b, closed ? '<=' : '<'), rayPiece(a + b, closed ? '>=' : '>')]
    : [spanPiece(a - b, a + b, closed, closed)];
}

/**
 * Shade every $x$ within (or beyond) a distance of a point.
 *
 * Difficulty 1 says it in words beside the modulus and keeps to "within";
 * difficulty 2 gives the modulus alone, in either direction.
 */
const distanceLine: Generator<DistanceLineParams> = {
  id: 'mod-distance-line',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const a = rng.int(-4, 4);
    const b = rng.int(1, 4);
    const op = rng.pick<Op>(hard ? OPS : ['<', '<=']);
    const outside = pointsRight(op);
    return { a, b, op, words: !hard, ...windowFor(rng, a - b, a + b, outside ? 12 : 10, outside ? 2 : 1) };
  },
  render: ({ a, b, op, words, min, max }): Slide => ({
    kind: 'numberLine',
    prompt: [
      {
        kind: 'prose',
        text: words
          ? `Shade every $x$ that is $${distanceWords(a, b, op)}$.`
          : 'Shade the solution set. Read the modulus as a distance.',
      },
      { kind: 'display', tex: distanceTex(a, b, op) },
    ],
    min,
    max,
    step: 1,
    answer: setOf(aroundSet(a, b, op)),
  }),
  solution: ({ a, b, op }) => [
    { text: `$${absLin(1, -a)}$ is the distance from $x$ to $${a}$.` },
    {
      text: pointsRight(op)
        ? `So $x$ is ${op === '>' ? 'more than' : 'at least'} $${b}$ from $${a}$: beyond $${a - b}$ on the left and $${a + b}$ on the right.`
        : `So $x$ is ${op === '<' ? 'less than' : 'at most'} $${b}$ from $${a}$: between $${a - b}$ and $${a + b}$.`,
      tex: setTex(aroundSet(a, b, op)),
    },
    { text: describeSet(aroundSet(a, b, op)) },
  ],
};

interface PointsParams {
  a: number;
  b: number;
  form: 'plain' | 'front' | 'shifted';
  e: number;
}

function pointsTex({ a, b, form, e }: PointsParams): string {
  if (form === 'front') return `${absLin(-1, a, true)} = ${b}`;
  if (form === 'shifted') return `${absLin(1, -a)} ${signedTile(e)} = ${b + e}`;
  return `${absLin(1, -a)} = ${b}`;
}

/**
 * The two points at a given distance from a centre, placed in either order.
 *
 * $|x - a| = b$ is $x = a + b$ or $x = a - b$. Difficulty 2 writes it as
 * $|a - x|$, which is the same distance, or adds a constant outside the bars
 * that has to come off first.
 */
const pointsTiles: Generator<PointsParams> = {
  id: 'mod-points-tiles',
  sample: (rng, difficulty) => ({
    a: rng.pick(nonZero(-7, 7)),
    b: rng.int(1, 8),
    form: difficulty > 1 ? rng.pick(['front', 'shifted'] as const) : 'plain',
    e: rng.pick(nonZero(-6, 6)),
  }),
  render: (params): Slide => {
    const { a, b } = params;
    const answer = [`${a - b}`, `${a + b}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve. Place the two solutions, in either order.' },
        { kind: 'display', tex: pointsTex(params) },
      ],
      template: 'x = {0} \\quad \\text{or} \\quad x = {1}',
      bank: bankOf(answer, [`${-a - b}`, `${-a + b}`, `${b}`, `${-b}`, `${a}`]),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { a, b, form, e } = params;
    const steps: SolutionStep[] = [{ tex: pointsTex(params) }];
    if (form === 'shifted') steps.push({ text: `First ${e > 0 ? `take $${e}$ from` : `add $${-e}$ to`} both sides.`, tex: `${absLin(1, -a)} = ${b}` });
    if (form === 'front') steps.push({ text: `$${absLin(-1, a, true)}$ is the same distance as $${absLin(1, -a)}$.` });
    steps.push(
      { text: `$x$ is exactly $${b}$ away from $${a}$, on one side or the other.` },
      { tex: either([`x = ${a} + ${b} = ${a + b}`, `x = ${a} - ${b} = ${a - b}`], QOR) },
    );
    return steps;
  },
};

/* ---------- Lesson 2: sketching y = |ax + b| ---------- */

interface VertexParams {
  a: number;
  v: number;
  /** Shown with a reference V rather than the straight line. */
  bare: boolean;
  front: boolean;
}

/**
 * Where does $y = |ax + b|$ turn?
 *
 * At the $x$ that makes the inside zero, $-\frac{b}{a}$: the part of the line
 * below the axis is reflected up, and the reflection hinges there. Difficulty
 * 1 draws the line $y = ax + b$ to be reflected; difficulty 2 draws only
 * $y = |x|$ for scale, with steeper and constant-first insides.
 */
const vertexSlider: Generator<VertexParams> = {
  id: 'mod-vertex-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.pick(hard ? [-4, -3, -2, 2, 3, 4] : [1, 1, 2, 3, -1, -2]),
      v: rng.int(-5, 5),
      bare: hard,
      front: hard && rng.chance(0.5),
    };
  },
  render: ({ a, v, bare, front }): Slide => {
    const b = -a * v;
    const inside = front ? linTexFront(a, b) : linTex(a, b);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: bare
            ? `The dashed graph is $y = ${absTex('x')}$. Where does the graph of $y = ${absTex(inside)}$ turn? Slide to the $x$ of its vertex.`
            : `The dashed line is $y = ${inside}$. Reflect the part below the axis to get $y = ${absTex(inside)}$. Slide to the $x$ where it turns.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: v,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -6,
          xMax: 6,
          yMin: -6,
          yMax: 8,
          curves: [{ f: bare ? (x: number) => Math.abs(x) : (x: number) => a * x + b, dashed: true }],
          verticals: [{ x: 0, dashed: false }],
          label: bare ? 'The graph of y = |x|' : 'A straight line crossing the x-axis',
        }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: ({ a, v, front }) => {
    const b = -a * v;
    const inside = front ? linTexFront(a, b) : linTex(a, b);
    return [
      { text: 'The V turns where the inside of the modulus is zero: that is where the line meets the axis and the reflection hinges.' },
      { tex: `${inside} = 0 \\quad \\Rightarrow \\quad x = ${v}` },
    ];
  },
};

interface GraphParams {
  a: number;
  v: number;
  c: number;
  s: 1 | -1;
}

const graphInside = ({ a, v }: GraphParams) => linTex(a, -a * v);

function graphTex(params: GraphParams, inside = graphInside(params)): string {
  const { c, s } = params;
  return `y = ${s < 0 ? '-' : ''}${absTex(inside)}${c === 0 ? '' : ` ${signedTile(c)}`}`;
}

const graphValue = ({ a, v, c, s }: GraphParams) => (x: number) => s * Math.abs(a * (x - v)) + c;

/**
 * Which equation is this V?
 *
 * The vertex and the $y$-intercept are marked and stated, which fixes the
 * steepness as well as the position. Difficulty 2 moves the V up or down, and
 * sometimes turns it upside down.
 */
const matchGraph: Generator<GraphParams> = {
  id: 'mod-match-graph',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.pick([1, 2, 3]),
      v: rng.pick(nonZero(-5, 5)),
      c: hard ? rng.pick(nonZero(-4, 4)) : 0,
      s: hard && rng.chance(0.4) ? -1 : 1,
    };
  },
  render: (params): Slide => {
    const { a, v, c, s } = params;
    const f = graphValue(params);
    const y0 = f(0);
    const lo = Math.min(0, c, y0);
    const hi = Math.max(0, c, y0);
    const wrong = [
      graphTex(params, linTex(a, a * v)),
      graphTex(params, a === 1 ? linTex(2, -2 * v) : linTex(1, -v)),
      c === 0 ? `y = ${linTex(s * a, -s * a * v)}` : graphTex({ ...params, c: -c }),
      graphTex({ ...params, s: s === 1 ? -1 : 1 }),
    ];
    return pickOne(
      [
        {
          kind: 'prose',
          text: `This V has its vertex at $(${v}, ${c})$ and crosses the $y$-axis at $(0, ${y0})$. Which equation is it?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -6,
            xMax: 6,
            yMin: lo - 3,
            yMax: hi + 3,
            curves: [{ f, accent: true }],
            marks: [
              { x: v, y: c },
              { x: 0, y: y0 },
            ],
            verticals: [{ x: 0, dashed: false }],
            label: 'A V-shaped graph with its vertex and y-intercept marked',
          }),
        },
      ],
      graphTex(params),
      wrong,
    );
  },
  solution: (params) => {
    const { a, v, c } = params;
    return [
      { text: `The vertex is where the inside is zero, so the inside is a multiple of $x ${signedTile(-v)}$.` },
      {
        text: `At $x = 0$ the inside is $${-a * v}$, and the graph is at $${graphValue(params)(0)}$${c === 0 ? '' : ` once the $${c}$ is added`}, so the multiple is $${a}$.`,
      },
      { tex: graphTex(params) },
    ];
  },
};

interface InterceptParams {
  a: number;
  v: number;
  front: boolean;
}

/**
 * Where $y = |ax + b|$ meets the axes, from tiles.
 *
 * It touches the $x$-axis once, at the vertex, and crosses the $y$-axis at
 * $|b|$, which is never negative. Difficulty 2 has negative and constant-first
 * insides, where $b$ itself is negative and the bank offers it.
 */
const interceptsTiles: Generator<InterceptParams> = {
  id: 'mod-intercepts-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.pick(hard ? [-4, -3, -2, -1, 2, 3, 4] : [1, 2, 3, 4]),
      v: rng.pick(nonZero(-6, 6)),
      front: hard && rng.chance(0.5),
    };
  },
  render: ({ a, v, front }): Slide => {
    const b = -a * v;
    const answer = [`${v}`, `${Math.abs(b)}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: `Where does $y = ${absLin(a, b, front)}$ meet each axis?` },
      ],
      template: 'x\\text{-axis: } ({0}, 0) \\qquad y\\text{-axis: } (0, {1})',
      bank: bankOf(answer, [`${-v}`, `${-Math.abs(b)}`, `${a}`, `${Math.abs(b) + 1}`]),
      answer,
    };
  },
  solution: ({ a, v, front }) => {
    const b = -a * v;
    return [
      { text: `It meets the $x$-axis where the inside is zero: $${front ? linTexFront(a, b) : linTex(a, b)} = 0$ gives $x = ${v}$.` },
      { text: `It meets the $y$-axis at $x = 0$: $y = ${absTex(`${b}`)} = ${Math.abs(b)}$.` },
    ];
  },
};

interface ArmParams {
  k: number;
  a: number;
  b: number;
  c: number;
  side: 'left' | 'right';
}

const armTex = ({ k, a, b, c }: ArmParams) =>
  `y = ${k === 1 ? '' : k === -1 ? '-' : k}${absLin(a, b)}${c === 0 ? '' : ` ${signedTile(c)}`}`;

const armGradient = ({ k, a, side }: ArmParams) => (side === 'right' ? 1 : -1) * k * Math.abs(a);

/**
 * The gradient of one arm of the V.
 *
 * The right arm is the line itself made to point upwards, gradient $|a|$; the
 * left is its reflection, $-|a|$. Difficulty 2 multiplies the modulus, which
 * scales both, and sometimes by a negative, which turns the V over.
 */
const armGradientGen: Generator<ArmParams> = {
  id: 'mod-arm-gradient',
  choices: (params) => {
    const m = armGradient(params);
    return numberChoices(m, [-m, params.a, params.b], armTex(params));
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      k: hard ? rng.pick([-2, -1, 2, 3]) : 1,
      a: rng.pick(nonZero(-6, 6)),
      b: rng.pick(nonZero(-9, 9)),
      c: hard ? rng.int(-5, 5) : 0,
      side: rng.pick(['left', 'right'] as const),
    };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `What is the gradient of the **${params.side}-hand** arm of the graph? Call it $m$.`,
      },
      { kind: 'display', tex: armTex(params) },
    ],
    lead: 'm =',
    keypad: [],
    answer: `${armGradient(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { k, a } = params;
    const steps: SolutionStep[] = [
      {
        text: `Inside the bars the gradient is $${a}$. The modulus makes the right arm rise and the left arm fall, so they have gradients $${Math.abs(a)}$ and $${-Math.abs(a)}$.`,
      },
    ];
    if (k !== 1) steps.push({ text: `Multiplying by $${k}$ multiplies both gradients by $${k}$.` });
    steps.push({ tex: `m = ${armGradient(params)}` });
    return steps;
  },
};

/* ---------- Lesson 3: solving modulus equations ---------- */

interface RootsParams {
  a: number;
  m: number;
  d: number;
  e: number;
  form: 'plain' | 'shifted';
}

function rootsTex({ a, m, d, e, form }: RootsParams): string {
  const inside = absLin(a, -a * m, a < 0);
  const c = Math.abs(a) * d;
  return form === 'shifted' ? `${inside} ${signedTile(e)} = ${c + e}` : `${inside} = ${c}`;
}

/**
 * $|ax + b| = c$: both roots, placed in either order.
 *
 * The inside is $c$ or $-c$, which gives two linear equations. Built from a
 * centre and a half-width so both roots are whole. Difficulty 2 has negative
 * and constant-first insides, and a constant outside the bars to move first.
 */
const linearRoots: Generator<RootsParams> = {
  id: 'mod-linear-roots',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.pick(hard ? [-5, -4, -3, -2, 2, 3, 4, 5] : [1, 2, 3, 4]),
      m: rng.int(-5, 5),
      d: rng.int(1, 5),
      e: rng.pick(nonZero(-7, 7)),
      form: hard && rng.chance(0.5) ? 'shifted' : 'plain',
    };
  },
  render: (params): Slide => {
    const { a, m, d } = params;
    const c = Math.abs(a) * d;
    const answer = [`${m - d}`, `${m + d}`];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve. Place both solutions, in either order.' },
        { kind: 'display', tex: rootsTex(params) },
      ],
      template: 'x = {0} \\quad \\text{or} \\quad x = {1}',
      bank: bankOf(answer, [`${-m - d}`, `${-m + d}`, `${m + c}`, `${m + d + 1}`].filter((token) => !answer.includes(token)).concat(`${m - d - 1}`).slice(0, 3)),
      answer,
      unordered: true,
    };
  },
  solution: (params) => {
    const { a, m, d, e, form } = params;
    const b = -a * m;
    const c = Math.abs(a) * d;
    const inside = a < 0 ? linTexFront(a, b) : linTex(a, b);
    const steps: SolutionStep[] = [{ tex: rootsTex(params) }];
    if (form === 'shifted') steps.push({ text: `${e > 0 ? `Take $${e}$ from` : `Add $${-e}$ to`} both sides first.`, tex: `${absTex(inside)} = ${c}` });
    steps.push(
      { text: `The inside is either $${c}$ or $-${c}$.` },
      { tex: either([`${inside} = ${c}`, `${inside} = -${c}`], QOR) },
      { tex: either([`x = ${a * d > 0 ? m + d : m - d}`, `x = ${a * d > 0 ? m - d : m + d}`], QOR) },
    );
    return steps;
  },
};

interface CasesParams {
  a: number;
  b: number;
  d: number;
  e: number;
  k: number;
}

const casesTex = ({ a, b, d, e }: CasesParams) => `${absLin(a, b)} = ${linTex(d, e)}`;

/**
 * The negative case of $|ax + b| = dx + e$, one line at a time.
 *
 * The case people get wrong: the inside equals **minus** the whole right-hand
 * side, so the bracket has to go round all of it. The bank offers the minus
 * sign given to one term only. Built so the root is whole and genuinely
 * solves the equation.
 */
const casesSteps: Generator<CasesParams> = {
  id: 'mod-cases-steps',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const { a, d } = drawUntil(
      () => ({ a: rng.pick(nonZero(-4, 4)), d: rng.pick(nonZero(hard ? -4 : -3, hard ? 4 : 3)) }),
      (pair) => Math.abs(pair.a + pair.d) >= 2,
      { a: 2, d: 1 },
    );
    const k = rng.int(hard ? -7 : -5, hard ? 7 : 5);
    const s = rng.int(1, 9);
    return { a, b: -s - a * k, d, e: s - d * k, k };
  },
  render: (params): Slide => {
    const { a, b, d, e, k } = params;
    const left = linTex(a, b);
    const sum = a + d;
    const rhs = -e - b;
    const first = `${left} = ${linTex(-d, -e)}`;
    const second = `${termTex(sum, 1)} = ${rhs}`;
    const last = `x = ${k}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve the **negative** case of $${casesTex(params)}$: the inside equals minus the whole right-hand side. ${HOW_TO_STEP}`,
        },
      ],
      start: [left, '=', `-(${linTex(d, e)})`],
      reductions: [
        {
          span: [0, 3],
          operator: 2,
          value: first,
          bank: stepBank(first, `${left} = ${linTex(-d, e)}`, `${left} = ${linTex(d, -e)}`),
        },
        {
          span: [0, 1],
          value: second,
          bank: stepBank(second, `${termTex(a - d, 1)} = ${rhs}`, `${termTex(sum, 1)} = ${-e + b}`, `${termTex(sum, 1)} = ${-rhs}`),
        },
        {
          span: [0, 1],
          value: last,
          bank: stepBank(last, `x = ${-k}`, `x = ${rhs - sum}`, `x = ${rhs * sum}`),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, d, e, k } = params;
    return [
      { tex: `${linTex(a, b)} = -(${linTex(d, e)})` },
      { text: 'The minus sign multiplies every term in the bracket.', tex: `${linTex(a, b)} = ${linTex(-d, -e)}` },
      { text: 'Collect the $x$ terms on the left and the numbers on the right.', tex: `${termTex(a + d, 1)} = ${-e - b}` },
      { tex: `x = ${k}` },
      { text: `Check: the right-hand side at $x = ${k}$ is $${d * k + e}$, which is positive, so the root stands.` },
    ];
  },
};

interface RejectParams {
  a: number;
  b: number;
  d: number;
  e: number;
  t: number;
}

const REJECT_NEG = 'Negative';
const REJECT_OK = 'Zero or positive';

/**
 * Keep or reject a root.
 *
 * A modulus is never negative, so a root that makes the right-hand side
 * negative cannot be a solution, whichever case produced it. Every candidate
 * here really does solve one of the two case equations; the check is the
 * sign of $dx + e$ at it.
 */
const rejectFlow: Generator<RejectParams> = {
  id: 'mod-reject-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const a = rng.pick(nonZero(-4, 4));
        const d = rng.pick(nonZero(-3, 3));
        const t = rng.int(hard ? -8 : -5, hard ? 8 : 5);
        const v = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]);
        const sigma = rng.chance(0.5) ? 1 : -1;
        return { a, b: sigma * v - a * t, d, e: v - d * t, t, sigma };
      },
      (p) => p.a !== p.sigma * p.d,
      { a: 2, b: -9, d: 1, e: 2, t: 3, sigma: 1 },
    );
  },
  render: ({ a, b, d, e, t }): Slide => {
    const v = d * t + e;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Splitting $${absLin(a, b)} = ${linTex(d, e)}$ into cases gave $x = ${t}$ as a root. Check whether it really solves the equation.`,
        },
      ],
      subject: `${absLin(a, b)} = ${linTex(d, e)}`,
      steps: [
        {
          id: 'rhs',
          ask: `Put $x = ${t}$ into the right-hand side, $${linTex(d, e)}$. What sign is it?`,
          branches: [
            { label: REJECT_NEG, outcome: `Reject $x = ${t}$: a modulus can never equal a negative number.` },
            { label: REJECT_OK, to: 'lhs' },
          ],
        },
        {
          id: 'lhs',
          ask: `Does $${absLin(a, b)}$ at $x = ${t}$ come to the same value?`,
          branches: [
            { label: YES, outcome: `Keep $x = ${t}$: it is a solution.` },
            { label: NO, outcome: `Reject $x = ${t}$.` },
          ],
        },
      ],
      answer: v < 0 ? [REJECT_NEG] : [REJECT_OK, YES],
    };
  },
  solution: ({ a, b, d, e, t }) => {
    const v = d * t + e;
    const inside = a * t + b;
    return [
      { text: `Right-hand side at $x = ${t}$: $${v}$.` },
      { text: `Left-hand side at $x = ${t}$: $${absTex(`${inside}`)} = ${Math.abs(inside)}$.` },
      {
        text:
          v < 0
            ? `The right is negative and a modulus never is, so $x = ${t}$ is rejected.`
            : `The two sides agree, so $x = ${t}$ is kept.`,
      },
    ];
  },
};

interface EquationParams {
  a: number;
  b: number;
  d: number;
  e: number;
  good: number;
  bad: number;
}

const equationTex = ({ a, b, d, e }: EquationParams) => `${absLin(a, b)} = ${linTex(d, e)}`;

/**
 * Solve $|ax + b| = dx + e$ when one of the two case roots fails.
 *
 * A typed number, since there is only one real answer; the root that fails
 * the check is among the options of the multiple-choice form. Built from both
 * case roots, so both are whole.
 */
const equationRoot: Generator<EquationParams> = {
  id: 'mod-equation-root',
  choices: (params) => numberChoices(params.good, [params.bad, -params.good], equationTex(params)),
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        // The line has to be steeper than the V's arms, or it meets the V
        // twice and both case roots stand.
        const a = rng.pick(nonZero(-3, 3));
        const d = rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]);
        const kp = rng.int(hard ? -7 : -5, hard ? 7 : 5);
        const kn = rng.int(hard ? -7 : -5, hard ? 7 : 5);
        const twice = -((a - d) * kp + (a + d) * kn);
        const b = twice / 2;
        const e = (a - d) * kp + b;
        const vp = d * kp + e;
        const vn = d * kn + e;
        const goodIsP = vp > 0;
        return { a, b, d, e, good: goodIsP ? kp : kn, bad: goodIsP ? kn : kp, vp, vn, kp, kn };
      },
      (p) =>
        Number.isInteger(p.b) &&
        p.kp !== p.kn &&
        Math.abs(p.d) > Math.abs(p.a) &&
        ((p.vp > 0 && p.vn < 0) || (p.vp < 0 && p.vn > 0)) &&
        Math.abs(p.b) <= (hard ? 20 : 12) &&
        Math.abs(p.e) <= (hard ? 20 : 12),
      { a: 1, b: 2, d: 2, e: 7, good: -3, bad: -5, vp: -3, vn: 1, kp: -5, kn: -3 },
    );
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: 'Solve. Split into two cases; one of them gives a root that does not work, so check both.',
      },
      { kind: 'display', tex: equationTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.good}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, b, d, e, good, bad } = params;
    return [
      { tex: either([`${linTex(a, b)} = ${linTex(d, e)}`, `${linTex(a, b)} = -(${linTex(d, e)})`], QOR) },
      { text: `The two cases give $x = ${good}$ and $x = ${bad}$.` },
      { text: `At $x = ${bad}$ the right-hand side is $${d * bad + e}$, negative, so it is rejected.` },
      { text: `At $x = ${good}$ it is $${d * good + e}$, and $${absTex(`${a * good + b}`)}$ agrees.`, tex: `x = ${good}` },
    ];
  },
};

/* ---------- Lesson 4: modulus inequalities ---------- */

interface ModIneqParams {
  a: number;
  m: number;
  r: number;
  op: Op;
  front: boolean;
  min: number;
  max: number;
}

function modIneqTex({ a, m, r, op, front }: ModIneqParams): string {
  return `${absLin(front ? -a : a, front ? a * m : -a * m, front)} ${OP_TEX[op]} ${Math.abs(a) * r}`;
}

function sampleModIneq(rng: Rng, difficulty: number): ModIneqParams {
  const hard = difficulty > 1;
  const m = rng.int(-4, 4);
  const r = rng.int(1, 4);
  const op = rng.pick(OPS);
  const outside = pointsRight(op);
  return {
    a: hard ? rng.pick([-3, -2, 2, 3]) : 1,
    m,
    r,
    op,
    front: rng.chance(0.4),
    ...windowFor(rng, m - r, m + r, outside ? 12 : 10, outside ? 2 : 1),
  };
}

function modIneqSolution(params: ModIneqParams): SolutionStep[] {
  const { a, m, r, op } = params;
  const c = Math.abs(a) * r;
  const inside = linTex(Math.abs(a), -Math.abs(a) * m);
  const lt = le(!isStrict(op));
  const gt = isStrict(op) ? '>' : '\\ge';
  const steps: SolutionStep[] = [{ tex: modIneqTex(params) }];
  if (params.front || a < 0) steps.push({ text: `The inside can be written the other way round without changing the modulus: $${absTex(inside)}$.` });
  steps.push(
    pointsRight(op)
      ? { text: `Further than $${c}$ from zero, on either side.`, tex: either([`${inside} ${lt} -${c}`, `${inside} ${gt} ${c}`], QOR) }
      : { text: `Within $${c}$ of zero.`, tex: `-${c} ${lt} ${inside} ${lt} ${c}` },
    { tex: setTex(aroundSet(m, r, op)) },
  );
  return steps;
}

/**
 * A modulus inequality, shaded.
 *
 * Less than a bound is one interval, more than it is two rays pointing apart.
 * Built from the centre and half-width so every end is whole. Difficulty 2
 * puts a coefficient on $x$, which divides through at the end.
 */
const modIneqLine: Generator<ModIneqParams> = {
  id: 'mod-ineq-line',
  sample: sampleModIneq,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Shade the solution set.' },
      { kind: 'display', tex: modIneqTex(params) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(aroundSet(params.m, params.r, params.op)),
  }),
  solution: (params) => [...modIneqSolution(params), { text: describeSet(aroundSet(params.m, params.r, params.op)) }],
};

/** The same inequality solved into inequalities, from tiles. */
const modIneqTiles: Generator<ModIneqParams> = {
  id: 'mod-ineq-tiles',
  sample: sampleModIneq,
  render: (params): Slide => {
    const { a, m, r, op } = params;
    const c = Math.abs(a) * r;
    const closed = !isStrict(op);
    const outside = pointsRight(op);
    const lo = `${m - r}`;
    const hi = `${m + r}`;
    const answer = outside ? [le(closed), lo, closed ? '\\ge' : '>', hi] : [lo, le(closed), le(closed), hi];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve, and place the solution set.' },
        { kind: 'display', tex: modIneqTex(params) },
      ],
      template: outside ? 'x {0} {1} \\quad \\text{or} \\quad x {2} {3}' : '{0} {1} x {2} {3}',
      bank: bankOf(answer, [`${-m - r}`, `${-m + r}`, `${m + c}`, '<', '\\le', '>', '\\ge'].slice(0, 6)),
      answer,
    };
  },
  solution: modIneqSolution,
};

interface SplitParams {
  a: number;
  b: number;
  c: number;
  op: Op;
  e: number;
}

/**
 * Which pair of inequalities does a modulus inequality split into?
 *
 * $|u| < c$ is $-c < u < c$; $|u| > c$ is $u < -c$ or $u > c$. The slips on
 * offer: the bars simply dropped, and the "or" with both signs turned.
 * Difficulty 2 adds a constant outside the bars, so the bound is only known
 * once it has been moved, and the unmoved bound is offered.
 */
const modIneqSplit: Generator<SplitParams> = {
  id: 'mod-ineq-split',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      a: rng.pick(hard ? [-4, -3, -2, 2, 3, 4] : [1, 2, 3]),
      b: rng.pick(nonZero(-9, 9)),
      c: rng.int(1, 9),
      op: rng.pick(OPS),
      e: hard ? rng.pick(nonZero(-6, 6)) : 0,
    };
  },
  render: ({ a, b, c, op, e }): Slide => {
    const inside = linTex(a, b);
    const lt = le(!isStrict(op));
    const gt = isStrict(op) ? '>' : '\\ge';
    const between = (bound: number) => `-${bound} ${lt} ${inside} ${lt} ${bound}`;
    const apart = (bound: number) => `${inside} ${lt} -${bound} \\text{ or } ${inside} ${gt} ${bound}`;
    const correct = pointsRight(op) ? apart(c) : between(c);
    const other = pointsRight(op) ? between(c) : apart(c);
    const wrong =
      e === 0
        ? [other, `${inside} ${OP_TEX[op]} ${c}`, `${inside} ${gt} -${c} \\text{ or } ${inside} ${lt} ${c}`]
        : [pointsRight(op) ? apart(c + e > 0 ? c + e : c + 2 * Math.abs(e)) : between(c + e > 0 ? c + e : c + 2 * Math.abs(e)), other, `${inside} ${OP_TEX[op]} ${c}`];
    return pickOne(
      [
        { kind: 'prose', text: 'Which statement is this the same as?' },
        { kind: 'display', tex: `${absTex(inside)}${e === 0 ? '' : ` ${signedTile(e)}`} ${OP_TEX[op]} ${c + e}` },
      ],
      correct,
      wrong,
    );
  },
  solution: ({ a, b, c, op, e }) => {
    const inside = linTex(a, b);
    const steps: SolutionStep[] = [];
    if (e !== 0) steps.push({ text: `First ${e > 0 ? `take $${e}$ from` : `add $${-e}$ to`} both sides.`, tex: `${absTex(inside)} ${OP_TEX[op]} ${c}` });
    steps.push({
      text: pointsRight(op)
        ? `The inside is further than $${c}$ from zero: below $-${c}$, or above $${c}$.`
        : `The inside is within $${c}$ of zero: between $-${c}$ and $${c}$.`,
    });
    return steps;
  },
};

interface ShapeParams {
  a: number;
  b: number;
  rhs: number;
  op: Op;
  e: number;
}

const SHAPE_LESS = 'Less than';
const SHAPE_MORE = 'Greater than';

/**
 * What shape is the answer, before any algebra?
 *
 * A modulus is never negative, so against a negative bound "less than" has no
 * solutions and "greater than" is every number. Otherwise it is an interval
 * or two rays. Difficulty 2 hides the bound behind a constant outside the bars.
 */
const shapeFlow: Generator<ShapeParams> = {
  id: 'mod-ineq-shape-flow',
  sample: (rng, difficulty) => ({
    a: rng.pick([1, 2, 3, -1, -2]),
    b: rng.pick(nonZero(-9, 9)),
    rhs: rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8]),
    op: rng.pick(OPS),
    e: difficulty > 1 ? rng.pick(nonZero(-6, 6)) : 0,
  }),
  render: ({ a, b, rhs, op, e }): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Before solving: what shape will the solution set be?' }],
    subject: `${absLin(a, b)}${e === 0 ? '' : ` ${signedTile(e)}`} ${OP_TEX[op]} ${rhs + e}`,
    steps: [
      {
        id: 'rhs',
        ask: e === 0 ? 'Is the number on the right negative?' : 'With the modulus alone on the left, is the number on the right negative?',
        branches: [
          { label: YES, to: 'neg' },
          { label: NO, to: 'pos' },
        ],
      },
      {
        id: 'neg',
        ask: 'Is the modulus asked to be less than it, or greater?',
        branches: [
          { label: SHAPE_LESS, outcome: 'No $x$ at all: a modulus is never negative.' },
          { label: SHAPE_MORE, outcome: 'Every real $x$: a modulus is always at least $0$.' },
        ],
      },
      {
        id: 'pos',
        ask: 'Is the modulus asked to be less than it, or greater?',
        branches: [
          { label: SHAPE_LESS, outcome: 'One interval, between two ends.' },
          { label: SHAPE_MORE, outcome: 'Two rays, pointing apart.' },
        ],
      },
    ],
    answer: [rhs < 0 ? YES : NO, pointsRight(op) ? SHAPE_MORE : SHAPE_LESS],
  }),
  solution: ({ a, b, rhs, op, e }) => {
    const steps: SolutionStep[] = [];
    if (e !== 0) steps.push({ text: `${e > 0 ? `Take $${e}$ from` : `Add $${-e}$ to`} both sides.`, tex: `${absLin(a, b)} ${OP_TEX[op]} ${rhs}` });
    if (rhs < 0) {
      steps.push({
        text: pointsRight(op)
          ? `A modulus is never negative, so it is always greater than $${rhs}$: every $x$ works.`
          : `A modulus is never negative, so it can never be below $${rhs}$: no $x$ works.`,
      });
    } else {
      steps.push({
        text: pointsRight(op)
          ? `Greater than a positive number: the inside is far from zero on either side, which is two rays.`
          : `Less than a positive number: the inside is close to zero, which is one interval.`,
      });
    }
    return steps;
  },
};

interface ModCountParams {
  a: number;
  b: number;
  c: number;
  op: Op;
}

function modCount({ a, b, c, op }: ModCountParams): number[] {
  const out: number[] = [];
  for (let n = -60; n <= 60; n += 1) {
    const v = Math.abs(a * n + b);
    if (op === '<' ? v < c : v <= c) out.push(n);
  }
  return out;
}

const modCountTex = ({ a, b, c, op }: ModCountParams) => `${absLin(a, b)} ${OP_TEX[op]} ${c}`;

/**
 * How many whole numbers satisfy a modulus inequality?
 *
 * A number to type. With a coefficient on $x$ the ends are usually not whole,
 * which is where counting goes wrong. Difficulty 2 always has a coefficient.
 */
const modIneqCount: Generator<ModCountParams> = {
  id: 'mod-ineq-count',
  choices: (params) => {
    const n = modCount(params).length;
    return numberChoices(n, [n + 1, n - 1, n + 2], modCountTex(params));
  },
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({
        a: rng.pick(difficulty > 1 ? [2, 3, -2, -3] : [1, 1, 2]),
        b: rng.pick(nonZero(-9, 9)),
        c: rng.int(1, 12),
        op: rng.pick<Op>(['<', '<=']),
      }),
      (params) => {
        const n = modCount(params).length;
        return n >= 2 && n <= 11;
      },
      { a: 2, b: -3, c: 7, op: '<' },
    ),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: 'How many whole numbers $x$ satisfy this? Call the count $n$.' },
      { kind: 'display', tex: modCountTex(params) },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${modCount(params).length}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, b, c, op } = params;
    const found = modCount(params);
    const lo = fracTex(-c - b, a);
    const hi = fracTex(c - b, a);
    const [left, right] = a > 0 ? [lo, hi] : [hi, lo];
    return [
      { tex: `-${c} ${OP_TEX[op]} ${linTex(a, b)} ${OP_TEX[op]} ${c}` },
      { tex: `${left} ${OP_TEX[op]} x ${OP_TEX[op]} ${right}` },
      { text: `The whole numbers in that range are $${found.join(', ')}$: that is $${found.length}$ of them.` },
    ];
  },
};

/* ---------- Lesson 5: transforming modulus graphs ---------- */

interface ShiftParams {
  A: number;
  h: number;
  k: number;
  ask: 'x' | 'y';
}

/** y = A|x - h| + k, as the learner reads it. */
function shiftTex({ A, h, k }: { A: number; h: number; k: number }): string {
  const front = A === 1 ? '' : A === -1 ? '-' : `${A}`;
  return `y = ${front}${absTex(linTex(1, -h))}${k === 0 ? '' : ` ${signedTile(k)}`}`;
}

/**
 * Where does the vertex of $y = |x|$ move to?
 *
 * $y = |x - h| + k$ moves it to $(h, k)$: the number inside works the opposite
 * way to how it reads, the number outside the way it reads. Difficulty 1 asks
 * where it goes across; difficulty 2 half the time how high it ends up, with a
 * stretch or reflection in front that leaves the vertex's height alone.
 */
const shiftSlider: Generator<ShiftParams> = {
  id: 'mod-shift-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      A: hard ? rng.pick([2, 3, -1, -2]) : 1,
      h: rng.pick(nonZero(-5, 5)),
      k: rng.pick(nonZero(-5, 5)),
      ask: hard && rng.chance(0.5) ? 'y' : 'x',
    };
  },
  render: (params): Slide => {
    const { h, k, ask } = params;
    const reference = plotSvg({
      xMin: -6,
      xMax: 6,
      yMin: -6,
      yMax: 6,
      curves: [{ f: (x: number) => Math.abs(x), dashed: true }],
      verticals: [{ x: 0, dashed: false }],
      label: 'The graph of y = |x|, with its vertex at the origin',
    });
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The dashed graph is $y = ${absTex('x')}$, vertex at the origin. Where is the vertex of $${shiftTex(params)}$? Slide to its ${
            ask === 'x' ? '$x$-coordinate' : 'height'
          }.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: ask === 'x' ? h : k,
      readout: ask === 'x' ? 'x = {v}' : 'y = {v}',
      figure:
        ask === 'x'
          ? { svg: reference, ...markerWindow(-6, 6) }
          : { svg: reference, ...markerWindow(-6, 6, 'y'), axis: 'y' },
    };
  },
  solution: (params) => {
    const { A, h, k } = params;
    const steps: SolutionStep[] = [
      {
        text: `Inside the bars, $x ${signedTile(-h)}$ is zero at $x = ${h}$, so the vertex moves ${h > 0 ? 'right' : 'left'} to $x = ${h}$.`,
      },
      { text: `The $${signedTile(k)}$ outside moves everything ${k > 0 ? 'up' : 'down'}, so the vertex ends at height $${k}$.` },
    ];
    if (A !== 1) steps.push({ text: `The $${A}$ in front ${A < 0 ? 'turns the V over and ' : ''}changes the steepness, but the vertex stays put.` });
    steps.push({ tex: `\\text{vertex} = (${h}, ${k})` });
    return steps;
  },
};

interface TransformParams {
  A: number;
  h: number;
  k: number;
}

function sampleTransform(rng: Rng, difficulty: number): TransformParams {
  return drawUntil(
    () => ({
      A: difficulty > 1 ? rng.pick([2, 3, -1, -2]) : rng.pick([1, 1, -1]),
      h: rng.pick(nonZero(-4, 4)),
      k: rng.pick(nonZero(-4, 4)),
    }),
    ({ h, k }) => h !== k && h !== -k,
    { A: 1, h: 2, k: 3 },
  );
}

/**
 * Which equation is this transformed V?
 *
 * The vertex and one more point are stated. The slips: the inside's sign read
 * the way it looks, the two coordinates swapped, and the V turned over.
 */
const transformMatch: Generator<TransformParams> = {
  id: 'mod-transform-match',
  sample: sampleTransform,
  render: (params): Slide => {
    const { A, h, k } = params;
    const f = (x: number) => A * Math.abs(x - h) + k;
    const y0 = f(0);
    const lo = Math.min(0, k, y0);
    const hi = Math.max(0, k, y0);
    return pickOne(
      [
        {
          kind: 'prose',
          text: `This graph is $y = ${absTex('x')}$ transformed. Its vertex is at $(${h}, ${k})$ and it crosses the $y$-axis at $(0, ${y0})$. Which equation is it?`,
        },
        {
          kind: 'diagram',
          svg: plotSvg({
            xMin: -7,
            xMax: 7,
            yMin: lo - 3,
            yMax: hi + 3,
            curves: [{ f, accent: true }],
            marks: [
              { x: h, y: k },
              { x: 0, y: y0 },
            ],
            verticals: [{ x: 0, dashed: false }],
            label: 'A V-shaped graph with its vertex marked',
          }),
        },
      ],
      shiftTex(params),
      [shiftTex({ A, h: -h, k }), shiftTex({ A, h: k, k: h }), shiftTex({ A: -A, h, k })],
    );
  },
  solution: ({ A, h, k }) => [
    { text: `A vertex at $(${h}, ${k})$ means $x ${signedTile(-h)}$ inside the bars and $${signedTile(k)}$ outside.` },
    {
      text: `At $x = 0$ that gives $${A === 1 ? '' : `${A} \\times `}${Math.abs(h)} ${signedTile(k)} = ${A * Math.abs(h) + k}$, matching the $y$-intercept.`,
    },
    { tex: shiftTex({ A, h, k }) },
  ],
};

/** A transformation described, written as an equation from tiles. */
const transformTiles: Generator<TransformParams> = {
  id: 'mod-transform-tiles',
  sample: sampleTransform,
  render: (params): Slide => {
    const { A, h, k } = params;
    const across = `${Math.abs(h)} ${h > 0 ? 'right' : 'left'}`;
    const up = `${Math.abs(k)} ${k > 0 ? 'up' : 'down'}`;
    const front = A === 1 ? '' : A === -1 ? '-' : numberTile(A);
    const stretched = A !== 1;
    const how = !stretched
      ? ''
      : A === -1
        ? 'reflected in the $x$-axis, then '
        : A < 0
          ? `stretched vertically by $${-A}$ and reflected in the $x$-axis, then `
          : `stretched vertically by $${A}$, then `;
    const answer = stretched ? [front, signedTile(-h), signedTile(k)] : [signedTile(-h), signedTile(k)];
    const fronts = ['2', '3', '-', numberTile(-2)].filter((token) => token !== front);
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `$y = ${absTex('x')}$ is ${how}moved ${across} and ${up}. Write the equation of the new graph.`,
        },
      ],
      template: stretched ? 'y = {0}|x {1}| {2}' : 'y = |x {0}| {1}',
      bank: bankOf(answer, [signedTile(h), signedTile(-k), ...(stretched ? fronts.slice(0, 2) : [])]),
      answer,
    };
  },
  solution: (params) => {
    const { h, k } = params;
    return [
      { text: `Moving right by $h$ replaces $x$ with $x - h$, so ${h > 0 ? 'right' : 'left'} $${Math.abs(h)}$ is $x ${signedTile(-h)}$ inside the bars.` },
      { text: `Moving up adds outside, so ${k > 0 ? 'up' : 'down'} $${Math.abs(k)}$ is $${signedTile(k)}$ at the end.` },
      { tex: shiftTex(params) },
    ];
  },
};

/**
 * What does each part of $y = A|x - h| + k$ do to $y = |x|$?
 *
 * Walked part by part: inside the bars, in front, and outside. Difficulty 1
 * has nothing in front, so it is two questions.
 */
const transformFlow: Generator<TransformParams> = {
  id: 'mod-transform-flow',
  sample: sampleTransform,
  render: (params): Slide => {
    const { A, h, k } = params;
    const right = `Moves it right by $${Math.abs(h)}$`;
    const left = `Moves it left by $${Math.abs(h)}$`;
    const up = `Moves it up by $${Math.abs(k)}$`;
    const down = `Moves it down by $${Math.abs(k)}$`;
    const hasFront = A !== 1;
    const size = Math.abs(A);
    const plain = size === 1 ? 'Leaves its shape alone' : `Stretches it vertically by $${size}$`;
    const flipped = size === 1 ? 'Reflects it in the $x$-axis' : `Reflects it and stretches it by $${size}$`;
    const outside = {
      id: 'outside',
      ask: `And the $${signedTile(k)}$ outside the bars?`,
      branches: [
        { label: up, outcome: 'That is the whole transformation.' },
        { label: down, outcome: 'That is the whole transformation.' },
      ],
    };
    const steps = [
      {
        id: 'inside',
        ask: `What does the $x ${signedTile(-h)}$ inside the bars do?`,
        branches: [
          { label: right, to: hasFront ? 'front' : 'outside' },
          { label: left, to: hasFront ? 'front' : 'outside' },
        ],
      },
      ...(hasFront
        ? [
            {
              id: 'front',
              ask: `And the $${A}$ in front of the bars?`,
              branches: [
                { label: plain, to: 'outside' },
                { label: flipped, to: 'outside' },
              ],
            },
          ]
        : []),
      outside,
    ];
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: `Starting from $y = ${absTex('x')}$: what does each part of this equation do?` }],
      subject: shiftTex(params),
      steps,
      answer: [h > 0 ? right : left, ...(hasFront ? [A > 0 ? plain : flipped] : []), k > 0 ? up : down],
    };
  },
  solution: (params) => {
    const { A, h, k } = params;
    const steps: SolutionStep[] = [
      { text: `$x ${signedTile(-h)}$ inside is zero at $x = ${h}$, so the graph moves ${h > 0 ? 'right' : 'left'} by $${Math.abs(h)}$.` },
    ];
    if (A !== 1) {
      steps.push({
        text: `$${A}$ in front multiplies every height by $${A}$${A < 0 ? ', which turns the V upside down' : ''}${Math.abs(A) === 1 ? '' : ` and makes it ${Math.abs(A)} times as steep`}.`,
      });
    }
    steps.push({ text: `$${signedTile(k)}$ outside moves it ${k > 0 ? 'up' : 'down'} by $${Math.abs(k)}$.` });
    return steps;
  },
};

/* ======================================================================
 * Level 3: Modulus on Both Sides and Squaring
 * ==================================================================== */

/*
 * Almost every question here is $|ax + b|$ against $|cx + d|$, and every one
 * is built outward from its two roots. Writing $u = ax + b$ and $v = cx + d$,
 *
 *   u - v = (a - c)(x - p)   and   u + v = (a + c)(x - q),
 *
 * so `p` is the root of the case where the insides are equal and `q` the root
 * of the case where they are opposite. Drawing a, c, p and q first and solving
 * for b and d keeps everything whole; keeping |a| off |c| keeps both cases
 * alive, and both constants off zero keeps every distractor below distinct
 * from the answer it imitates.
 *
 * The last lesson puts a line on the right, $|ax + b| = dx + e$, and reuses
 * `mod-equation-root`'s draw, which already guarantees one root that stands
 * and one that fails the check.
 */

interface BothParams {
  a: number;
  b: number;
  c: number;
  d: number;
  /** The root of u = v. */
  p: number;
  /** The root of u = -v. */
  q: number;
}

/** The pair with roots `p` and `q`, or undefined when `b` would not be whole. */
function bothFromRoots(a: number, c: number, p: number, q: number): BothParams | undefined {
  const twice = -(a + c) * q - (a - c) * p;
  if (twice % 2 !== 0) return undefined;
  const b = twice / 2;
  return { a, b, c, d: b + (a - c) * p, p, q };
}

/** |2x + 1| = |x - 4|: roots -5 and 1. */
const BOTH_FALLBACK: BothParams = { a: 2, b: 1, c: 1, d: -4, p: -5, q: 1 };

/**
 * Two moduli with whole roots. Difficulty 1 keeps both $x$ coefficients
 * positive and the roots within five of zero; difficulty 2 has a negative
 * coefficient on at least one side, wider roots and larger constants.
 */
function sampleBoth(
  rng: Rng,
  difficulty: number,
  accept: (params: BothParams) => boolean = () => true,
  reach?: number,
): BothParams {
  const hard = difficulty > 1;
  const span = reach ?? (hard ? 7 : 5);
  const bound = hard ? 20 : 12;
  return drawUntil(
    () =>
      bothFromRoots(
        hard ? rng.pick(nonZero(-4, 4)) : rng.int(1, 4),
        hard ? rng.pick(nonZero(-4, 4)) : rng.int(1, 3),
        rng.int(-span, span),
        rng.int(-span, span),
      ) ?? BOTH_FALLBACK,
    (params) =>
      params !== BOTH_FALLBACK &&
      Math.abs(params.a) !== Math.abs(params.c) &&
      params.p !== params.q &&
      params.b !== 0 &&
      params.d !== 0 &&
      Math.abs(params.b) <= bound &&
      Math.abs(params.d) <= bound &&
      (!hard || params.a < 0 || params.c < 0) &&
      accept(params),
    BOTH_FALLBACK,
  );
}

const uTex = ({ a, b }: BothParams) => linTex(a, b);
const vTex = ({ c, d }: BothParams) => linTex(c, d);
/** u - v and u + v, multiplied out. */
const uMinusV = ({ a, b, c, d }: BothParams) => linTex(a - c, b - d);
const uPlusV = ({ a, b, c, d }: BothParams) => linTex(a + c, b + d);

/** |u| = |v|, or |u| < |v| and the rest. */
const bothTex = (params: BothParams, op?: Op) =>
  `${absLin(params.a, params.b)} ${op ? OP_TEX[op] : '='} ${absLin(params.c, params.d)}`;

/** The two roots in order, as the lesson writes a pair of them. */
function pairTex(x1: number, x2: number): string {
  const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1];
  return `x = ${lo} \\text{ or } x = ${hi}`;
}

/**
 * A line on one row when it fits a phone, otherwise broken before its
 * relation: two squared brackets side by side run past the edge once the
 * numbers are two digits.
 */
function stacked(left: string, rest: string): string {
  const flat = `${left} ${rest}`;
  if (printedLength(flat) <= 17) return flat;
  return `\\begin{aligned} & ${left} \\\\ & \\quad ${rest} \\end{aligned}`;
}

/** (u)^2 - (v)^2 = 0, or with another relation in place of the equals. */
const squaresTex = (u: string, v: string, rel = '=') => stacked(`(${u})^2`, `- (${v})^2 ${rel} 0`);

const lower = ({ p, q }: BothParams) => Math.min(p, q);
const upper = ({ p, q }: BothParams) => Math.max(p, q);

/** |u| = |v| solved by cases, for a worked solution. */
function bothCasesSolution(params: BothParams): SolutionStep[] {
  const { a, b, c, d, p, q } = params;
  const u = uTex(params);
  return [
    { tex: bothTex(params) },
    {
      text: 'Two distances are equal when the insides are equal or opposite.',
      tex: either([`${u} = ${vTex(params)}`, `${u} = ${linTex(-c, -d)}`], QOR),
    },
    { tex: either([`${termTex(a - c, 1)} = ${d - b}`, `${termTex(a + c, 1)} = ${-d - b}`], QOR) },
    { tex: either([`x = ${p}`, `x = ${q}`], QOR) },
    { text: 'Both sides are distances, so neither can be negative: no root is rejected.' },
  ];
}

/** |u| = |v| solved by squaring, for a worked solution. */
function bothSquareSolution(params: BothParams): SolutionStep[] {
  const { p, q } = params;
  return [
    { tex: bothTex(params) },
    {
      text: 'Both sides are never negative, so squaring keeps exactly the same solutions.',
      tex: squaresTex(uTex(params), vTex(params)),
    },
    { text: 'A difference of two squares: the first minus the second, times the first plus the second.', tex: `(${uMinusV(params)})(${uPlusV(params)}) = 0` },
    { tex: either([`x = ${p}`, `x = ${q}`], QOR) },
  ];
}

/* ---------- Lesson 1: two moduli equal ---------- */

/**
 * The two cases of $|u| = |v|$, from tiles.
 *
 * The left inside equals the right one, or minus it, with the minus
 * multiplied out. The slips on offer give the minus to one term only.
 */
const bothCases: Generator<BothParams> = {
  id: 'mod-both-cases',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { c, d } = params;
    const u = uTex(params);
    const answer = [linTex(c, d), linTex(-c, -d)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Split into two cases, with any minus sign multiplied out. Place what the left-hand inside equals in each, in either order.',
        },
        { kind: 'display', tex: bothTex(params) },
      ],
      template: `${u} = {0} \\quad \\text{or} \\quad ${u} = {1}`,
      bank: bankOf(answer, [linTex(-c, d), linTex(c, -d)]),
      answer,
      unordered: true,
    };
  },
  solution: bothCasesSolution,
};

/**
 * The opposite case of $|u| = |v|$, one line at a time.
 *
 * The same trap as `mod-cases-steps` in level 2, the minus reaching only the
 * first term, met again with a modulus on the right. The last bank offers the
 * other case's root, which is a real root, just not this case's.
 */
const bothNegativeSteps: Generator<BothParams> = {
  id: 'mod-both-negative-steps',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty, (params) => Math.abs(params.a + params.c) >= 2),
  render: (params): Slide => {
    const { a, b, c, d, p, q } = params;
    const u = uTex(params);
    const first = `${u} = ${linTex(-c, -d)}`;
    const collected = `${termTex(a + c, 1)} = ${-d - b}`;
    const last = `x = ${q}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve the **opposite** case of $${bothTex(params)}$: the left inside equals minus the right one. ${HOW_TO_STEP}`,
        },
      ],
      start: [u, '=', `-(${vTex(params)})`],
      reductions: [
        {
          span: [0, 3],
          operator: 2,
          value: first,
          bank: stepBank(first, `${u} = ${linTex(-c, d)}`, `${u} = ${linTex(c, -d)}`),
        },
        {
          span: [0, 1],
          value: collected,
          bank: stepBank(
            collected,
            `${termTex(a - c, 1)} = ${-d - b}`,
            `${termTex(a + c, 1)} = ${d - b}`,
            `${termTex(a + c, 1)} = ${d + b}`,
          ),
        },
        {
          span: [0, 1],
          value: last,
          bank: stepBank(last, `x = ${-q}`, `x = ${p}`, `x = ${q + 1}`, `x = ${q - 1}`),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, c, d, p, q } = params;
    const u = uTex(params);
    return [
      { tex: `${u} = -(${vTex(params)})` },
      { text: 'The minus sign multiplies every term in the bracket.', tex: `${u} = ${linTex(-c, -d)}` },
      { text: 'Collect the $x$ terms on the left and the numbers on the right.', tex: `${termTex(a + c, 1)} = ${-d - b}` },
      { tex: `x = ${q}` },
      { text: `Both sides are distances, so nothing is rejected: $x = ${q}$ stands beside $x = ${p}$ from the other case.` },
    ];
  },
};

interface BothRootParams extends BothParams {
  larger: boolean;
}

/** The root asked for, then the other one. */
const askedRoot = (params: BothRootParams): [number, number] =>
  params.larger ? [upper(params), lower(params)] : [lower(params), upper(params)];

/**
 * Solve $|u| = |v|$ and give one named root.
 *
 * A number to type; the multiple-choice form offers the other root beside it,
 * so finding only one case is not enough.
 */
const bothRoot: Generator<BothRootParams> = {
  id: 'mod-both-root',
  choices: (params) => {
    const [target, other] = askedRoot(params);
    return numberChoices(target, [other, -target, params.larger ? target - 1 : target + 1], bothTex(params));
  },
  sample: (rng, difficulty) => ({ ...sampleBoth(rng, difficulty), larger: rng.chance(0.5) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve. It has two roots: give the **${params.larger ? 'larger' : 'smaller'}** one.` },
      { kind: 'display', tex: bothTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${askedRoot(params)[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    ...bothCasesSolution(params),
    { text: `The ${params.larger ? 'larger' : 'smaller'} root is $x = ${askedRoot(params)[0]}$.` },
  ],
};

interface BothFlowParams extends BothParams {
  t: number;
  /** The right-hand side written without bars, as in level 2. */
  bare: boolean;
}

const EQUAL = 'Equal';
const OPPOSITE = 'Opposite';

/**
 * Which case gave a root, and does it stand?
 *
 * With bars on both sides every case root stands, since neither side can be
 * negative. Difficulty 2 mixes in the level 2 shape, $|u| = v$, where the
 * sign of the right-hand side still has to be checked.
 */
const bothFlow: Generator<BothFlowParams> = {
  id: 'mod-both-flow',
  sample: (rng, difficulty) => {
    const params = sampleBoth(rng, difficulty);
    return { ...params, t: rng.chance(0.5) ? params.p : params.q, bare: difficulty > 1 && rng.chance(0.5) };
  },
  render: (params): Slide => {
    const { a, b, c, d, p, t, bare } = params;
    const v = vTex(params);
    const right = c * t + d;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Splitting into cases gave $x = ${t}$ as a root. Which case gave it, and does it stand?`,
        },
      ],
      subject: bare ? `${absLin(a, b)} = ${v}` : bothTex(params),
      steps: [
        {
          id: 'case',
          ask: `Put $x = ${t}$ into $${uTex(params)}$ and into $${v}$. Are the two values equal, or opposite?`,
          branches: [
            { label: EQUAL, to: 'bars' },
            { label: OPPOSITE, to: 'bars' },
          ],
        },
        {
          id: 'bars',
          ask: 'Is the right-hand side inside modulus bars as well?',
          branches: [
            { label: YES, outcome: `Keep $x = ${t}$: both sides are distances, so neither can be negative and every case root stands.` },
            { label: NO, to: 'sign' },
          ],
        },
        {
          id: 'sign',
          ask: `What sign is $${v}$ at $x = ${t}$?`,
          branches: [
            { label: REJECT_NEG, outcome: `Reject $x = ${t}$: a modulus can never equal a negative number.` },
            { label: REJECT_OK, outcome: `Keep $x = ${t}$: it is a solution.` },
          ],
        },
      ],
      answer: [t === p ? EQUAL : OPPOSITE, bare ? NO : YES, ...(bare ? [right < 0 ? REJECT_NEG : REJECT_OK] : [])],
    };
  },
  solution: (params) => {
    const { a, b, c, d, p, t, bare } = params;
    const left = a * t + b;
    const right = c * t + d;
    const steps: SolutionStep[] = [
      {
        text: `At $x = ${t}$: $${uTex(params)} = ${left}$ and $${vTex(params)} = ${right}$, which are ${t === p ? 'equal' : 'opposite'}.`,
      },
    ];
    if (!bare) steps.push({ text: 'Both sides have bars, so both are distances and never negative: the root stands.' });
    else if (right < 0) steps.push({ text: `The right-hand side is $${right}$, negative, and a modulus never is: reject $x = ${t}$.` });
    else steps.push({ text: `The right-hand side is $${right}$, and $${absTex(`${left}`)} = ${Math.abs(left)}$ agrees: keep $x = ${t}$.` });
    return steps;
  },
};

/* ---------- Lesson 2: squaring both sides ---------- */

/**
 * $u^2 - v^2$ as a difference of two squares, from tiles.
 *
 * Squaring $|u| = |v|$ loses nothing, and $(u - v)(u + v) = 0$ gives both
 * roots with no cases. The slips swap the constants between the factors.
 */
const squareFactor: Generator<BothParams> = {
  id: 'mod-square-factor',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { a, b, c, d } = params;
    const answer = [uMinusV(params), uPlusV(params)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Square both sides of $${bothTex(params)}$ and bring everything to the left. Factorise the difference of two squares: place both factors, in either order.`,
        },
        { kind: 'display', tex: squaresTex(uTex(params), vTex(params)) },
      ],
      template: '({0})({1}) = 0',
      bank: bankOf(answer, [linTex(a - c, b + d), linTex(a + c, b - d), linTex(c - a, b - d)]),
      answer,
      unordered: true,
    };
  },
  solution: bothSquareSolution,
};

/**
 * Solve $|u| = |v|$ by squaring, as a tree: the two factors on top, the root
 * each gives beneath it.
 */
const squareTree: Generator<BothParams> = {
  id: 'mod-square-tree',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty),
  render: (params): Slide => {
    const { a, b, c, d, p, q } = params;
    const answer = [uMinusV(params), uPlusV(params), `x = ${p}`, `x = ${q}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Solve $${bothTex(params)}$ by squaring. Top row: the two factors of the difference of two squares, the difference first. Below each: the root it gives.`,
        },
      ],
      expression: squaresTex(uTex(params), vTex(params)),
      nodes: [
        { id: 'minus', from: [] },
        { id: 'plus', from: [] },
        { id: 'root-minus', from: ['minus'] },
        { id: 'root-plus', from: ['plus'] },
      ],
      bank: bankOf(answer, [linTex(a - c, b + d), linTex(a + c, b - d), `x = ${-p}`, `x = ${-q}`]),
      answer,
    };
  },
  solution: bothSquareSolution,
};

/**
 * The long way round: square, multiply out, collect.
 *
 * The same roots as the factor route, which is the point of the comparison.
 * The first bank forgets the middle term of a square, the second slips a
 * sign while collecting. Kept to small numbers so the squares stay readable.
 */
const expandSteps: Generator<BothParams> = {
  id: 'mod-expand-steps',
  sample: (rng, difficulty) =>
    sampleBoth(
      rng,
      difficulty,
      ({ a, b, c, d, p, q }) =>
        Math.abs(a) <= 3 &&
        Math.abs(c) <= 3 &&
        Math.abs(b) <= 9 &&
        Math.abs(d) <= 9 &&
        a * b !== c * d &&
        Math.abs(b) !== Math.abs(d) &&
        p !== -q &&
        p !== 0 &&
        q !== 0,
    ),
  render: (params): Slide => {
    const { a, b, c, d, p, q } = params;
    // Collected on whichever side keeps the square term positive.
    const s = a * a > c * c ? 1 : -1;
    const P = s * (a * a - c * c);
    const Q = s * 2 * (a * b - c * d);
    const R = s * (b * b - d * d);
    const expanded = `${quadTex(a * a, 2 * a * b, b * b)} = ${quadTex(c * c, 2 * c * d, d * d)}`;
    const collected = `${quadTex(P, Q, R)} = 0`;
    const roots = pairTex(p, q);
    return {
      kind: 'steps',
      prompt: [{ kind: 'prose', text: `Solve $${bothTex(params)}$ by squaring and multiplying out. ${HOW_TO_STEP}` }],
      start: [`(${uTex(params)})^2`, '=', `(${vTex(params)})^2`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: expanded,
          bank: stepBank(
            expanded,
            `${quadTex(a * a, 0, b * b)} = ${quadTex(c * c, 0, d * d)}`,
            `${quadTex(a * a, a * b, b * b)} = ${quadTex(c * c, c * d, d * d)}`,
          ),
        },
        {
          span: [0, 1],
          value: collected,
          bank: stepBank(collected, `${quadTex(P, Q, -R)} = 0`, `${quadTex(P, -Q, R)} = 0`, `${quadTex(a * a + c * c, Q, R)} = 0`),
        },
        {
          span: [0, 1],
          value: roots,
          bank: stepBank(roots, pairTex(-p, -q), pairTex(p, -q), pairTex(-p, q)),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, c, d, p, q } = params;
    const s = a * a > c * c ? 1 : -1;
    return [
      { tex: stacked(`(${uTex(params)})^2`, `= (${vTex(params)})^2`) },
      {
        text: 'Multiply out each square: the first term squared, twice the product, the last term squared.',
        tex: stacked(quadTex(a * a, 2 * a * b, b * b), `= ${quadTex(c * c, 2 * c * d, d * d)}`),
      },
      {
        text: s > 0 ? 'Take the right-hand side from both sides.' : 'Take the left-hand side from both sides, keeping the square term positive.',
        tex: `${quadTex(s * (a * a - c * c), s * 2 * (a * b - c * d), s * (b * b - d * d))} = 0`,
      },
      {
        text: `It factorises as $(${uMinusV(params)})(${uPlusV(params)})$, which is the difference of two squares multiplied out.`,
        tex: pairTex(p, q),
      },
    ];
  },
};

interface SquareRootParams extends BothRootParams {
  /** A square number pulled out in front of the left-hand square. */
  s: number;
}

function squaredTex(params: SquareRootParams): string {
  const { a, b, s } = params;
  const left = s === 1 ? `(${uTex(params)})^2` : `${s * s}(${linTex(a / s, b / s)})^2`;
  return stacked(left, `= (${vTex(params)})^2`);
}

/**
 * Two squares equal, solved as two moduli equal.
 *
 * $(u)^2 = (v)^2$ is $|u| = |v|$. Difficulty 2 pulls a square number out in
 * front, $4(x + 1)^2$, which is $(2x + 2)^2$ in disguise.
 */
const squareRoot: Generator<SquareRootParams> = {
  id: 'mod-square-root',
  choices: (params) => {
    const [target, other] = askedRoot(params);
    return numberChoices(target, [other, -target, params.larger ? target - 1 : target + 1], squaredTex(params));
  },
  sample: (rng, difficulty) => {
    const s = difficulty > 1 ? rng.pick([2, 3]) : 1;
    const params = sampleBoth(rng, difficulty, ({ a, b }) => a % s === 0 && b % s === 0);
    return { ...params, s: params.a % s === 0 && params.b % s === 0 ? s : 1, larger: rng.chance(0.5) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Solve. Two squares are equal exactly when the things squared are equal or opposite. Give the **${params.larger ? 'larger' : 'smaller'}** root.`,
      },
      { kind: 'display', tex: squaredTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${askedRoot(params)[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, b, s } = params;
    const steps: SolutionStep[] = [{ tex: squaredTex(params) }];
    if (s !== 1) {
      steps.push({ text: `$${s * s} = ${s}^2$, so the left-hand side is $(${s}(${linTex(a / s, b / s)}))^2 = (${uTex(params)})^2$.` });
    }
    steps.push(
      { text: 'Two squares are equal when what is squared is equal or opposite: this is two moduli equal.', tex: bothTex(params) },
      { tex: `(${uMinusV(params)})(${uPlusV(params)}) = 0` },
      { tex: either([`x = ${params.p}`, `x = ${params.q}`], QOR) },
      { text: `The ${params.larger ? 'larger' : 'smaller'} root is $x = ${askedRoot(params)[0]}$.` },
    );
    return steps;
  },
};

/* ---------- Lesson 3: two Vs on one graph ---------- */

/** One V's height at x. */
const vHeight = (m: number, k: number) => (x: number) => Math.abs(m * x + k);

/** Both Vs on squared paper, the left solid and the right dashed, for x from -6 to 6. */
function twoVs(params: BothParams, heights: number[], label: string): string {
  return plotSvg({
    xMin: -6,
    xMax: 6,
    yMin: -1,
    yMax: Math.max(8, ...heights.map((h) => h + 3)),
    curves: [
      { f: vHeight(params.a, params.b), accent: true },
      { f: vHeight(params.c, params.d), dashed: true },
    ],
    grid: true,
    label,
  });
}

interface CrossParams extends BothParams {
  left: boolean;
}

/** The height at each crossing, which is the same on either V. */
const crossHeights = (params: BothParams) => [params.p, params.q].map(vHeight(params.a, params.b));

/**
 * Slide to one crossing of two Vs.
 *
 * The roots of $|u| = |v|$ are where the graphs meet. Both crossings lie on
 * the drawn window; difficulty 2 has steeper and downward-facing insides, so
 * reading the grid alone is harder than solving.
 */
const crossSlider: Generator<CrossParams> = {
  id: 'mod-cross-slider',
  sample: (rng, difficulty) => ({
    ...sampleBoth(rng, difficulty, (params) => crossHeights(params).every((h) => h <= 10), 5),
    left: rng.chance(0.5),
  }),
  render: (params): Slide => ({
    kind: 'slider',
    prompt: [
      {
        kind: 'prose',
        text: `The solid graph is $y = ${absLin(params.a, params.b)}$ and the dashed one is $y = ${absLin(params.c, params.d)}$. Slide to the $x$-coordinate of the **${params.left ? 'left' : 'right'}-hand** crossing.`,
      },
    ],
    min: -6,
    max: 6,
    step: 1,
    answer: params.left ? lower(params) : upper(params),
    readout: 'x = {v}',
    figure: {
      svg: twoVs(params, crossHeights(params), 'Two V-shaped graphs crossing twice'),
      ...markerWindow(-6, 6),
    },
  }),
  solution: (params) => [
    { text: 'The graphs cross where the two moduli are equal.' },
    ...bothSquareSolution(params).slice(1),
    { text: `The ${params.left ? 'left' : 'right'}-hand crossing is at $x = ${params.left ? lower(params) : upper(params)}$.` },
  ],
};

/**
 * Where two Vs cross, as points from tiles: each root, and the height there,
 * which is the same on both graphs. The slips offer the inside without its
 * bars and the root with its sign turned.
 */
const crossPoints: Generator<BothParams> = {
  id: 'mod-cross-points',
  sample: (rng, difficulty) => sampleBoth(rng, difficulty, (params) => crossHeights(params).every((h) => h <= 15)),
  render: (params): Slide => {
    const { a, b } = params;
    const lo = lower(params);
    const hi = upper(params);
    const at = vHeight(a, b);
    const answer = [`${lo}`, `${at(lo)}`, `${hi}`, `${at(hi)}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `Where do the graphs of $y = ${absLin(a, b)}$ and $y = ${absLin(params.c, params.d)}$ cross? Place both points, the left-hand one first.`,
        },
      ],
      template: '({0}, {1}) \\quad \\text{and} \\quad ({2}, {3})',
      bank: bankOf(answer, [`${a * lo + b}`, `${a * hi + b}`, `${-lo}`, `${-hi}`, `${Math.max(at(lo), at(hi)) + 1}`]),
      answer,
    };
  },
  solution: (params) => {
    const { a, b } = params;
    const at = vHeight(a, b);
    return [
      ...bothCasesSolution(params).slice(1, 4),
      {
        text: `The height is the same on both graphs; on $y = ${absLin(a, b)}$ it is $${at(lower(params))}$ at $x = ${lower(params)}$ and $${at(upper(params))}$ at $x = ${upper(params)}$.`,
      },
      { tex: `(${lower(params)}, ${at(lower(params))}) \\text{ and } (${upper(params)}, ${at(upper(params))})` },
    ];
  },
};

type CrossKind = 'two' | 'steep' | 'shared';

interface CrossCountParams {
  a: number;
  b: number;
  c: number;
  d: number;
  kind: CrossKind;
}

/**
 * Two moduli that meet twice, or once for one of two reasons: arms of equal
 * steepness, so one case loses its $x$; or a shared vertex, where both
 * insides are zero at once. Never the same V twice.
 */
function sampleCrossCount(rng: Rng, difficulty: number, kinds: readonly CrossKind[]): CrossCountParams {
  const hard = difficulty > 1;
  const kind = rng.pick(kinds);
  if (kind === 'two') {
    const { a, b, c, d } = sampleBoth(rng, difficulty);
    return { a, b, c, d, kind };
  }
  if (kind === 'shared') {
    const v = rng.pick(nonZero(-5, 5));
    const { a, c } = drawUntil(
      () => ({ a: rng.pick(nonZero(-4, 4)), c: rng.pick(nonZero(-4, 4)) }),
      (pair) => Math.abs(pair.a) !== Math.abs(pair.c),
      { a: 2, c: 1 },
    );
    return { a, b: -a * v, c, d: -c * v, kind };
  }
  return drawUntil(
    () => {
      const a = hard ? rng.pick(nonZero(-4, 4)) : rng.int(1, 4);
      return { a, b: rng.pick(nonZero(-9, 9)), c: rng.chance(0.5) ? a : -a, d: rng.pick(nonZero(-9, 9)), kind };
    },
    ({ a, b, c, d }) => (c === a ? b !== d : b !== -d),
    { a: 1, b: -1, c: 1, d: 3, kind },
  );
}

/** Every real solution of |ax + b| = |cx + d|, worked out from the two cases. */
function crossRoots({ a, b, c, d }: CrossCountParams): number[] {
  const roots: number[] = [];
  for (const [k, r] of [
    [a - c, d - b],
    [a + c, -d - b],
  ]) {
    if (k !== 0) roots.push(r / k);
  }
  return [...new Set(roots)];
}

const COUNT_WORDS = ['No solutions', 'Exactly one', 'Exactly two', 'Infinitely many'];

/**
 * How many times do two Vs meet?
 *
 * Twice as a rule; once when the arms are equally steep, since one case then
 * loses its $x$; and at difficulty 2 also once when the vertices share an $x$.
 * The answer lands in a slot hashed from the equation, since the four words
 * on offer never change.
 */
const crossCount: Generator<CrossCountParams> = {
  id: 'mod-cross-count',
  sample: (rng, difficulty) => sampleCrossCount(rng, difficulty, difficulty > 1 ? ['two', 'steep', 'shared'] : ['two', 'steep']),
  render: (params): Slide => {
    const tex = `${absLin(params.a, params.b)} = ${absLin(params.c, params.d)}`;
    const correct = COUNT_WORDS[crossRoots(params).length];
    return pickOne(
      [
        { kind: 'prose', text: 'How many solutions does this equation have?' },
        { kind: 'display', tex },
      ],
      correct,
      COUNT_WORDS.filter((word) => word !== correct),
      false,
      tex,
    );
  },
  solution: (params) => {
    const { a, b, c, d, kind } = params;
    const u = linTex(a, b);
    const roots = crossRoots(params);
    if (kind === 'steep') {
      const lost = c === a ? `${u} = ${linTex(c, d)}` : `${u} = ${linTex(-c, -d)}`;
      return [
        { text: 'The $x$ coefficients are the same size, so the arms are equally steep.' },
        { text: `The case $${lost}$ loses its $x$ and says two different numbers are equal, so it gives nothing.` },
        { text: `The other case gives the only solution, $x = ${fracTex((c === a ? -d - b : d - b), c === a ? a + c : a - c)}$: exactly one.` },
      ];
    }
    if (kind === 'shared') {
      return [
        { text: `Both insides are zero at $x = ${roots[0]}$, so both Vs have their vertex there.` },
        { text: 'Either side of it one V is steeper than the other, so they never meet again: exactly one solution.' },
      ];
    }
    return [
      { text: 'The $x$ coefficients differ in size, so each case keeps its $x$ and gives a root.' },
      { tex: either(roots.map((root) => `x = ${root}`), QOR) },
      { text: 'Exactly two.' },
    ];
  },
};

/**
 * Walk the count: equal steepness first, then which case loses its $x$.
 */
const crossFlow: Generator<CrossCountParams> = {
  id: 'mod-cross-flow',
  sample: (rng, difficulty) => sampleCrossCount(rng, difficulty, ['two', 'steep']),
  render: (params): Slide => {
    const { a, b, c, d, kind } = params;
    const u = linTex(a, b);
    const same = `$${u} = ${linTex(c, d)}$`;
    const opposite = `$${u} = ${linTex(-c, -d)}$`;
    const lost = 'With no $x$ left, that case says two different numbers are equal, so it gives nothing: the other case gives the only crossing.';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'How many times do the two Vs meet? Look at the $x$ coefficients.' }],
      subject: `${absLin(a, b)} = ${absLin(c, d)}`,
      steps: [
        {
          id: 'steep',
          ask: 'Ignoring their signs, are the two $x$ coefficients the same size?',
          branches: [
            { label: YES, to: 'lost' },
            { label: NO, outcome: 'Neither case loses its $x$, so each gives a root: two crossings.' },
          ],
        },
        {
          id: 'lost',
          ask: 'Then one of the two cases loses its $x$. Which one?',
          branches: [
            { label: same, outcome: lost },
            { label: opposite, outcome: lost },
          ],
        },
      ],
      answer: kind === 'steep' ? [YES, c === a ? same : opposite] : [NO],
    };
  },
  solution: (params) => {
    const { a, b, c, d, kind } = params;
    const u = linTex(a, b);
    if (kind !== 'steep') {
      return [
        { text: `The coefficients are $${a}$ and $${c}$, different sizes: the arms are not equally steep.` },
        { text: 'Both cases keep their $x$, so the Vs cross twice.' },
      ];
    }
    const lost = c === a ? `${u} = ${linTex(c, d)}` : `${u} = ${linTex(-c, -d)}`;
    return [
      { text: `The coefficients are $${a}$ and $${c}$, the same size: the arms are equally steep.` },
      { text: `In $${lost}$ the $x$ terms cancel, leaving $${c === a ? `${b} = ${d}` : `${b} = ${-d}`}$, which is false.` },
      { text: 'So only the other case gives a root: the Vs cross once.' },
    ];
  },
};

/* ---------- Lesson 4: |ax + b| < |cx + d| ---------- */

interface BothIneqParams extends BothParams {
  op: Op;
  min: number;
  max: number;
}

/**
 * Where $|u|$ op $|v|$ holds: $u^2 - v^2 = (a^2 - c^2)(x - p)(x - q)$, so the
 * sign pattern is a parabola's, facing up when the left side is steeper.
 */
const bothIneqSet = ({ a, c, p, q }: BothParams, op: Op) => signSet([p, q], [], Math.sign(a * a - c * c), op);

/** Between the critical values, or outside them. */
const bothBetween = ({ a, c }: BothParams, op: Op) => (a * a > c * c) !== pointsRight(op);

function sampleBothIneq(rng: Rng, difficulty: number): BothIneqParams {
  const hard = difficulty > 1;
  const params = sampleBoth(rng, difficulty, ({ p, q }) => Math.abs(p - q) <= 8);
  const op = rng.pick<Op>(hard ? OPS : ['<', '>']);
  const outside = !bothBetween(params, op);
  return { ...params, op, ...windowFor(rng, lower(params), upper(params), outside ? 12 : 10, outside ? 2 : 1) };
}

function bothIneqSolution(params: BothIneqParams): SolutionStep[] {
  const { a, c, op } = params;
  const set = bothIneqSet(params, op);
  return [
    { tex: bothTex(params, op) },
    {
      text: 'Both sides are never negative, so squaring keeps the inequality as it is.',
      tex: squaresTex(uTex(params), vTex(params), OP_TEX[op]),
    },
    { tex: `(${uMinusV(params)})(${uPlusV(params)}) ${OP_TEX[op]} 0` },
    { text: `The critical values are $x = ${lower(params)}$ and $x = ${upper(params)}$.` },
    {
      text: `The ${a * a > c * c ? 'left' : 'right'}-hand V is steeper, so the set lies ${bothBetween(params, op) ? 'between' : 'outside'} them${isStrict(op) ? '' : ', ends included'}.`,
      tex: setTex(set),
    },
    { text: describeSet(set) },
  ];
}

/**
 * Shade $|u|$ op $|v|$.
 *
 * Square, factorise, and read the set off the critical values. Difficulty 1
 * keeps to strict signs; difficulty 2 includes the ends sometimes.
 */
const bothIneqLine: Generator<BothIneqParams> = {
  id: 'mod-both-ineq-line',
  sample: sampleBothIneq,
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve by squaring both sides, then shade the solution set.' },
      { kind: 'display', tex: bothTex(params, params.op) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(bothIneqSet(params, params.op)),
  }),
  solution: bothIneqSolution,
};

const LEFT_SIDE = 'The left';
const RIGHT_SIDE = 'The right';
const INSIDE_ROOTS = 'Between the two roots: near the crossings the steeper V dips under the flatter one.';
const OUTSIDE_ROOTS = 'Outside the two roots: away from the crossings the steeper V is the higher one.';

/**
 * Between the critical values, or outside them?
 *
 * Decided before any algebra by which V is steeper: it is the lower of the
 * two between the crossings and the higher outside them.
 */
const regionFlow: Generator<BothIneqParams> = {
  id: 'mod-region-flow',
  sample: sampleBothIneq,
  render: (params): Slide => {
    const { a, c, op } = params;
    const ask = 'Is the left-hand side asked to be less than the right, or greater?';
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Before solving: does the solution set lie between the two roots, or outside them?' }],
      subject: bothTex(params, op),
      steps: [
        {
          id: 'steep',
          ask: 'Which side has the steeper V? Compare the $x$ coefficients, ignoring their signs.',
          branches: [
            { label: LEFT_SIDE, to: 'left' },
            { label: RIGHT_SIDE, to: 'right' },
          ],
        },
        {
          id: 'left',
          ask,
          branches: [
            { label: SHAPE_LESS, outcome: INSIDE_ROOTS },
            { label: SHAPE_MORE, outcome: OUTSIDE_ROOTS },
          ],
        },
        {
          id: 'right',
          ask,
          branches: [
            { label: SHAPE_LESS, outcome: OUTSIDE_ROOTS },
            { label: SHAPE_MORE, outcome: INSIDE_ROOTS },
          ],
        },
      ],
      answer: [a * a > c * c ? LEFT_SIDE : RIGHT_SIDE, pointsRight(op) ? SHAPE_MORE : SHAPE_LESS],
    };
  },
  solution: (params) => {
    const { a, c, op } = params;
    const steeper = a * a > c * c ? 'left' : 'right';
    return [
      { text: `The coefficients are $${a}$ and $${c}$, so the ${steeper}-hand V is steeper.` },
      {
        text: `The steeper V is below the other between the crossings and above it outside them, so the set lies ${bothBetween(params, op) ? 'between' : 'outside'} the roots.`,
      },
      { tex: setTex(bothIneqSet(params, op)) },
    ];
  },
};

const BETWEEN = '\\text{between}';
const OUTSIDE = '\\text{outside}';

/**
 * The critical values and the shape of the set, from tiles.
 *
 * The template shows neither an interval nor two rays, so where the set lies
 * is the learner's to place. The slips offer the roots with their signs
 * turned.
 */
const endsTiles: Generator<BothIneqParams> = {
  id: 'mod-ends-tiles',
  sample: sampleBothIneq,
  render: (params): Slide => {
    const lo = lower(params);
    const hi = upper(params);
    const answer = [`${lo}`, `${hi}`, bothBetween(params, params.op) ? BETWEEN : OUTSIDE];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'Solve by squaring. Place the two critical values, smaller first, then whether the solution set lies between them or outside them.',
        },
        { kind: 'display', tex: bothTex(params, params.op) },
      ],
      template: '{0} \\text{ and } {1} \\text{: } {2}',
      bank: bankOf(answer, [`${-lo}`, `${-hi}`, `${lo - 1}`, `${hi + 1}`, BETWEEN, OUTSIDE]),
      answer,
    };
  },
  solution: bothIneqSolution,
};

interface PointTestParams extends BothIneqParams {
  t: number;
}

/**
 * Test a point by the factors.
 *
 * $u^2 - v^2$ has the sign of $(u - v)(u + v)$: the two insides at the test
 * point, then their difference and sum, then the product.
 */
const testPointTree: Generator<PointTestParams> = {
  id: 'mod-test-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const params = sampleBothIneq(rng, difficulty);
        return { ...params, t: rng.int(params.min + 1, params.max - 1) };
      },
      ({ a, b, c, d, p, q, t }) => t !== p && t !== q && Math.abs(a * t + b) <= 12 && Math.abs(c * t + d) <= 12,
      { ...BOTH_FALLBACK, op: '<', min: -8, max: 2, t: 0 },
    ),
  render: (params): Slide => {
    const { a, b, c, d, op, t } = params;
    const u = a * t + b;
    const v = c * t + d;
    const answer = [`${u}`, `${v}`, `${u - v}`, `${u + v}`, `${(u - v) * (u + v)}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Test $x = ${t}$ by squaring: $(${uTex(params)})^2 - (${vTex(params)})^2$ is (first − second)(first + second), and its sign says whether $x = ${t}$ is in the set. Fill in both insides at $x = ${t}$, then their difference and sum, then the product.`,
        },
      ],
      expression: bothTex(params, op),
      nodes: [
        { id: 'u', from: [] },
        { id: 'v', from: [] },
        { id: 'minus', from: ['u', 'v'] },
        { id: 'plus', from: ['u', 'v'] },
        { id: 'product', from: ['minus', 'plus'] },
      ],
      bank: treeBank(answer, [v - u, -(u - v) * (u + v), u * v], (u - v) * (u + v)),
      answer,
    };
  },
  solution: (params) => {
    const { a, b, c, d, op, t } = params;
    const u = a * t + b;
    const v = c * t + d;
    const product = (u - v) * (u + v);
    const holds = pointsRight(op) ? product > 0 : product < 0;
    return [
      { text: `At $x = ${t}$: $${uTex(params)} = ${u}$ and $${vTex(params)} = ${v}$.` },
      { tex: `(${br(u)} - ${br(v)})(${br(u)} + ${br(v)}) = ${u - v} \\times ${br(u + v)} = ${product}` },
      {
        text: `That is ${product > 0 ? 'positive' : 'negative'}, so $${absTex(`${u}`)}$ is ${product > 0 ? 'greater' : 'less'} than $${absTex(`${v}`)}$: $x = ${t}$ is ${holds ? '' : 'not '}in the set.`,
      },
    ];
  },
};

/* ---------- Lesson 5: when squaring is safe ---------- */

type SafeForm = 'moduli' | 'positive' | 'line' | 'negative';

interface SafeParams {
  form: SafeForm;
  subject: string;
}

/** A small inside, |ax + b|, varied enough that no two statements repeat. */
const smallAbs = (rng: Rng) => absLin(rng.pick([1, 2, 3, -1, -2]), rng.pick(nonZero(-9, 9)));

/** One statement of each shape, the ones on the left safe to square. */
function safeStatement(rng: Rng, form: SafeForm, inequality: boolean): string {
  const op = inequality ? OP_TEX[rng.pick(OPS)] : '=';
  if (form === 'moduli') return `${smallAbs(rng)} ${op} ${smallAbs(rng)}`;
  if (form === 'positive') return `${smallAbs(rng)} ${op} ${rng.int(1, 9)}`;
  if (form === 'negative') return `${smallAbs(rng)} = ${-rng.int(1, 9)}`;
  return `${smallAbs(rng)} ${op} ${linTex(rng.pick([2, 3, -2, -3, 1, -1]), rng.pick(nonZero(-9, 9)))}`;
}

const isSafe = (form: SafeForm) => form === 'moduli' || form === 'positive';

const CHECK_ROOTS = 'Check each root in the original';
const KEEP_ROOTS = 'Keep every root of the squared equation';

/**
 * Is it safe to square both sides?
 *
 * Only when neither side can be negative: a modulus, or a number at least
 * zero. Otherwise squaring can bring in a root that fails, so every root is
 * checked. Difficulty 2 adds a negative right-hand side, which has no
 * solutions at all though its square has two.
 */
const safeFlow: Generator<SafeParams> = {
  id: 'mod-safe-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const form = rng.pick<SafeForm>(hard ? ['moduli', 'positive', 'line', 'negative'] : ['moduli', 'positive', 'line', 'line']);
    return { form, subject: safeStatement(rng, form, hard && isSafe(form) && rng.chance(0.5)) };
  },
  render: ({ form, subject }): Slide => ({
    kind: 'flow',
    prompt: [{ kind: 'prose', text: 'Can you square both sides of this without changing its solutions?' }],
    subject,
    steps: [
      {
        id: 'right',
        ask: 'Can the right-hand side ever be negative?',
        branches: [
          { label: NO, outcome: 'Safe: both sides are never negative, so squaring keeps exactly the same solutions.' },
          { label: YES, to: 'then' },
        ],
      },
      {
        id: 'then',
        ask: 'Then squaring can bring in a root that does not work. What do you do with the roots you find?',
        branches: [
          { label: CHECK_ROOTS, outcome: 'Right: any root that makes the right-hand side negative is rejected.' },
          { label: KEEP_ROOTS, outcome: 'That keeps any root squaring brought in, even one that fails.' },
        ],
      },
    ],
    answer: isSafe(form) ? [NO] : [YES, CHECK_ROOTS],
  }),
  solution: ({ form }) => {
    if (form === 'moduli') return [{ text: 'Both sides are moduli, so neither can be negative: squaring is safe.' }];
    if (form === 'positive') return [{ text: 'A modulus against a positive number: neither side can be negative, so squaring is safe.' }];
    if (form === 'negative') {
      return [
        { text: 'The right-hand side is negative and a modulus never is, so there are no solutions at all.' },
        { text: 'Squaring would hide that: the squared equation has two roots, and both fail the check.' },
      ];
    }
    return [
      { text: 'The right-hand side is a line, which is negative for some $x$.' },
      { text: 'Squaring loses the sign, so it can bring in a root where the line is negative: check every root in the original.' },
    ];
  },
};

interface SafeChoiceParams {
  /** Ask for the one that is not safe, among three that are. */
  reverse: boolean;
  correct: string;
  correctForm: SafeForm;
  wrong: string[];
}

/**
 * Which line is safe to square, or at difficulty 2 which one is not?
 *
 * Four statements, each with its own insides so the odd one out is the shape
 * and not the numbers.
 */
const safeChoice: Generator<SafeChoiceParams> = {
  id: 'mod-safe-choice',
  sample: (rng, difficulty) => {
    const reverse = difficulty > 1;
    const safe: SafeForm[] = ['moduli', 'moduli', 'positive'];
    const unsafe: SafeForm[] = ['line', 'line', 'negative'];
    const correctForm = rng.pick(reverse ? unsafe : safe);
    const inequality = () => rng.chance(0.4);
    return {
      reverse,
      correct: safeStatement(rng, correctForm, !isSafe(correctForm) ? false : inequality()),
      correctForm,
      wrong: (reverse ? ['moduli', 'positive', 'moduli'] : ['line', 'negative', 'line']).map((form) =>
        safeStatement(rng, form as SafeForm, form === 'negative' ? false : inequality()),
      ),
    };
  },
  render: ({ reverse, correct, wrong }): Slide =>
    pickOne(
      [
        {
          kind: 'prose',
          text: reverse
            ? 'Squaring both sides of three of these keeps the solutions exactly. Which one could squaring get wrong?'
            : 'Which one can you square both sides of without risking a root that does not work?',
        },
      ],
      correct,
      wrong,
    ),
  solution: ({ reverse, correct, correctForm }) => [
    { text: 'Squaring is safe exactly when neither side can be negative: a modulus, or a number at least zero.' },
    {
      text: reverse
        ? correctForm === 'negative'
          ? `In $${correct}$ the right-hand side is negative: it has no solutions, but its square does.`
          : `In $${correct}$ the right-hand side is a line, negative for some $x$, so squaring can bring in a root that fails.`
        : correctForm === 'moduli'
          ? `In $${correct}$ both sides are moduli.`
          : `In $${correct}$ the modulus is compared with a positive number.`,
    },
  ],
};

/** A |ax + b| = dx + e with one root standing and one failing, both constants non-zero. */
function sampleFalseRoot(rng: Rng, difficulty: number): EquationParams {
  return drawUntil(
    () => equationRoot.sample(rng, difficulty),
    ({ b, e, good, bad }) => b !== 0 && e !== 0 && good !== 0 && bad !== 0 && good !== -bad,
    { a: 1, b: 2, d: 2, e: 7, good: -3, bad: -5 },
  );
}

/** The squared equation factorised: (u - v)(u + v) = 0. */
const falseFactors = ({ a, b, d, e }: EquationParams) => `(${linTex(a - d, b - e)})(${linTex(a + d, b + e)}) = 0`;

/**
 * Which root did squaring bring in?
 *
 * The squared, factorised equation is given with both its roots; the one that
 * makes the right-hand side negative is the one to reject. `mod-reject-flow`
 * in level 2 checks a single root the same way.
 */
const falseRoot: Generator<EquationParams> = {
  id: 'mod-false-root',
  choices: (params) => numberChoices(params.bad, [params.good, -params.bad], `${equationTex(params)}#false`),
  sample: sampleFalseRoot,
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      {
        kind: 'prose',
        text: `Squaring both sides of $${equationTex(params)}$ and factorising gives the equation below, with roots $x = ${Math.min(params.good, params.bad)}$ and $x = ${Math.max(params.good, params.bad)}$. One of them does not solve the original. Which one?`,
      },
      { kind: 'display', tex: falseFactors(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.bad}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => {
    const { a, b, d, e, good, bad } = params;
    return [
      { text: `At $x = ${bad}$ the right-hand side is $${d * bad + e}$: negative, and a modulus never is. Reject it.` },
      { text: `At $x = ${good}$ it is $${d * good + e}$, and $${absTex(`${a * good + b}`)} = ${Math.abs(a * good + b)}$ agrees.` },
      { tex: `x = ${bad} \\text{ is rejected}` },
    ];
  },
};

/**
 * Solve $|ax + b| = dx + e$ by squaring, check included.
 *
 * Factorising the squared equation is quicker than two cases, but squaring
 * forgets the right-hand side's sign, so the last step keeps only the root
 * that survives. The last bank offers keeping both, which is the mistake.
 */
const squareCheckSteps: Generator<EquationParams> = {
  id: 'mod-square-check-steps',
  sample: sampleFalseRoot,
  render: (params): Slide => {
    const { a, b, d, e, good, bad } = params;
    const factors = falseFactors(params);
    const roots = pairTex(good, bad);
    const last = `x = ${good}`;
    return {
      kind: 'steps',
      prompt: [
        {
          kind: 'prose',
          text: `Solve $${equationTex(params)}$ by squaring both sides. The last step is the check. ${HOW_TO_STEP}`,
        },
      ],
      start: [`(${linTex(a, b)})^2`, '=', `(${linTex(d, e)})^2`],
      reductions: [
        {
          span: [0, 3],
          operator: 1,
          value: factors,
          bank: stepBank(
            factors,
            `(${linTex(a - d, b + e)})(${linTex(a + d, b - e)}) = 0`,
            `(${linTex(a - d, b - e)})(${linTex(a + d, b - e)}) = 0`,
          ),
        },
        {
          span: [0, 1],
          value: roots,
          bank: stepBank(roots, pairTex(-good, -bad), pairTex(good, -bad), pairTex(-good, bad)),
        },
        {
          span: [0, 1],
          value: last,
          bank: stepBank(last, `x = ${bad}`, roots, '\\text{no solutions}'),
        },
      ],
    };
  },
  solution: (params) => {
    const { a, b, d, e, good, bad } = params;
    return [
      { tex: squaresTex(linTex(a, b), linTex(d, e)) },
      { text: 'A difference of two squares.', tex: falseFactors(params) },
      { tex: pairTex(good, bad) },
      { text: `Check: at $x = ${bad}$ the right-hand side is $${d * bad + e}$, negative, so reject it.` },
      { text: `At $x = ${good}$ it is $${d * good + e}$ and the left is $${Math.abs(a * good + b)}$: it stands.`, tex: `x = ${good}` },
    ];
  },
};

/* ======================================================================
 * Level 4: Modulus of Quadratics
 *
 * The modulus meets curves. $y = |f(x)|$ reflects whatever of a quadratic
 * lies below the axis, and $y = f(|x|)$ keeps the right half and mirrors it.
 * Then $|f(x)| = c$ solved from the graph, as the two equations $f(x) = c$
 * and $f(x) = -c$ and the line $y = c$ counting their roots; the same
 * reflection for a cubic; and $|f(x)| < c$ read off the picture.
 *
 * Built outward from the answer as the rest of the file is. The quadratics
 * whose roots are asked for all come from `DIPS`, a table of $(h, c)$ for
 * which every root of $|(x - m)^2 - h| = c$ is whole: $h + c$ a square and
 * $h - c$ a square or negative. A table rather than a search, so a mistyped
 * row fails the test that checks it (PITFALLS 3.11).
 * ==================================================================== */

/** $|x|$ as the learner reads it. */
const ABS_X = absTex('x');

/** A term in $x$ with $|x|$ written in place of $x$: `-4\lvert x \rvert`. */
const absTerm = (coefficient: number) => (coefficient === 0 ? '0' : termTex(coefficient, 1).replace(/x$/, ABS_X));

/** $ax^2 + b|x| + c$, which is $f(|x|)$ for $f(x) = ax^2 + bx + c$ since $|x|^2 = x^2$. */
function quadAbsXTex(a: number, b: number, c: number): string {
  const tex = sumTex([termTex(a, 2), absTerm(b), termTex(c, 0)]);
  return tex === '' ? '0' : tex;
}

/** $(x - z)$, or $x$ when $z$ is zero; with $|x|$ for $x$ when `abs`. */
function rootFactor(z: number, abs = false): string {
  const v = abs ? ABS_X : 'x';
  return z === 0 ? v : `(${v} ${signedTile(-z)})`;
}

/** The product of $(x - z)$ over the roots, a bare $x$ first: `x(x + 2)(x - 3)`. */
function productTex(roots: readonly number[], abs = false): string {
  const ordered = [...roots.filter((z) => z === 0), ...roots.filter((z) => z !== 0)];
  return ordered.map((z) => rootFactor(z, abs)).join('');
}

/** The product of $(x - z)$ over the roots, as a function. */
const productOf = (roots: readonly number[]) => (x: number) => roots.reduce((acc, z) => acc * (x - z), 1);

/** Curves on squared paper from $x = -6$ to $6$, clipped at the window's edge. */
function modPlot(
  curves: { f: (x: number) => number; dashed?: boolean; accent?: boolean }[],
  yMin: number,
  yMax: number,
  label: string,
  marks: { x: number; y: number }[] = [],
  horizontals: number[] = [],
): string {
  return plotSvg({ xMin: -6, xMax: 6, yMin, yMax, curves, marks, horizontals, grid: true, label });
}

const COUNT_LABEL = ['None', 'One', 'Two', 'Three', 'Four'];

/* ---------- Lesson 1: y = |f(x)| for a quadratic ---------- */

interface RootPairParams {
  /** The smaller root. */
  p: number;
  q: number;
  /** Multiplied out rather than factorised. */
  expanded: boolean;
}

/** f(x) = (x - p)(x - q), written factorised or multiplied out. */
const rootPairTex = ({ p, q, expanded }: RootPairParams) => (expanded ? quadTex(1, -(p + q), p * q) : productTex([p, q]));
/** The same with $|x|$ for $x$: f(|x|). */
const pairAbsXTex = ({ p, q, expanded }: RootPairParams) =>
  expanded ? quadAbsXTex(1, -(p + q), p * q) : productTex([p, q], true);
/** The quadratic whose roots are $-q$ and $-p$: f(-x), the mirror image. */
const mirrorPair = ({ p, q, expanded }: RootPairParams): RootPairParams => ({ p: -q, q: -p, expanded });

/** Two whole roots, smaller first. */
function sampleRootPair(rng: Rng, from: number, to: number, accept: (p: number, q: number) => boolean): { p: number; q: number } {
  return drawUntil(
    () => {
      const [x, y] = [rng.int(from, to), rng.int(from, to)];
      return { p: Math.min(x, y), q: Math.max(x, y) };
    },
    ({ p, q }) => p !== q && accept(p, q),
    { p: -1, q: 3 },
  );
}

/**
 * Which equation is this graph: $y = |f(x)|$, $y = f(x)$, the mirror image,
 * or $y = f(|x|)$?
 *
 * The graph is a quadratic whose dip between the roots has been reflected up.
 * Its roots are marked and stated, which rules the mirror image out, so what
 * is left is telling a modulus of $f$ from $f$ itself and from $f(|x|)$.
 * Difficulty 2 writes the quadratics multiplied out.
 */
const absQuadMatch: Generator<RootPairParams> = {
  id: 'mod-abs-quad-match',
  sample: (rng, difficulty) => ({
    ...sampleRootPair(rng, -5, 5, (p, q) => p !== 0 && q !== 0 && p !== -q && q - p <= 6),
    expanded: difficulty > 1,
  }),
  render: (params): Slide => {
    const { p, q } = params;
    const f = productOf([p, q]);
    const depth = ((q - p) * (q - p)) / 4;
    return pickOne(
      [
        { kind: 'prose', text: `Which equation has this graph? It meets the $x$-axis at $x = ${p}$ and $x = ${q}$.` },
        {
          kind: 'diagram',
          svg: modPlot([{ f: (x) => Math.abs(f(x)), accent: true }], -2, Math.max(depth + 3, 7), 'A U-shaped curve whose dip between its two roots is reflected above the axis', [
            { x: p, y: 0 },
            { x: q, y: 0 },
          ]),
        },
      ],
      `y = ${absTex(rootPairTex(params))}`,
      [`y = ${rootPairTex(params)}`, `y = ${absTex(rootPairTex(mirrorPair(params)))}`, `y = ${pairAbsXTex(params)}`],
    );
  },
  solution: (params) => {
    const { p, q } = params;
    return [
      { text: `The curve never goes below the $x$-axis, but $y = ${rootPairTex(params)}$ would dip below it between its roots.` },
      { text: `Its roots are $x = ${p}$ and $x = ${q}$, so the quadratic is $${rootPairTex(params)}$ and not its mirror image.` },
      { text: 'The dip between the roots has been reflected up, and the arms are unchanged: that is the modulus of the quadratic.' },
      { text: 'It is not symmetric about the $y$-axis, so it is not $f(\\lvert x \\rvert)$.', tex: `y = ${absTex(rootPairTex(params))}` },
    ];
  },
};

interface VertexShapeParams {
  /** 1 for a U, -1 for an upside-down U. */
  s: 1 | -1;
  h: number;
  k: number;
  expanded: boolean;
}

/** s(x - h)^2 + k in vertex form: `(x - 2)^{2} - 9`, `-x^{2} + 4`. */
const vertexFormTex = ({ s, h, k }: VertexShapeParams) => `${s < 0 ? '-' : ''}${squareTex(h)} ${signedTile(k)}`;
const shapeTex = (params: VertexShapeParams) =>
  params.expanded ? quadTex(params.s, -2 * params.s * params.h, params.s * params.h * params.h + params.k) : vertexFormTex(params);
const shapeValue = ({ s, h, k }: VertexShapeParams) => (x: number) => s * (x - h) * (x - h) + k;

/**
 * Slide to the height of the vertex of $y = |f(x)|$.
 *
 * The dashed curve is $y = f(x)$ with its vertex $(h, k)$ below the axis, so
 * reflecting sends the vertex to $(h, -k)$. Difficulty 2 writes $f$ out in
 * full and also draws curves whose vertex is above the axis, where it stays.
 */
const absVertexSlider: Generator<VertexShapeParams> = {
  id: 'mod-abs-vertex-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return {
      s: hard && rng.chance(0.5) ? -1 : 1,
      h: rng.int(-3, 3),
      k: hard ? rng.pick(nonZero(-8, 8)) : rng.int(-9, -1),
      expanded: hard,
    };
  },
  render: (params): Slide => {
    const tex = shapeTex(params);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: params.expanded
            ? `The dashed curve is $y = ${tex}$, whose vertex is at $x = ${params.h}$. Slide to the height of the vertex of $y = ${absTex(tex)}$.`
            : `The dashed curve is $y = ${tex}$. Reflecting the part below the $x$-axis gives $y = ${absTex(tex)}$. Slide to the height of its vertex.`,
        },
      ],
      min: -10,
      max: 10,
      step: 1,
      answer: Math.abs(params.k),
      readout: 'y = {v}',
      figure: {
        svg: modPlot([{ f: shapeValue(params), dashed: true }], -10, 10, 'A dashed parabola on squared paper'),
        ...markerWindow(-10, 10, 'y'),
        axis: 'y',
      },
    };
  },
  solution: (params) => {
    const { h, k, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: `At $x = ${h}$ the curve is at $${shapeValue(params)(h)}$, so the vertex of $y = f(x)$ is $(${h}, ${k})$.` });
    else steps.push({ text: `In vertex form the vertex of $y = f(x)$ is $(${h}, ${k})$.` });
    steps.push(
      k < 0
        ? { text: `It is below the axis, so the modulus reflects it up to $(${h}, ${-k})$.`, tex: `y = ${absTex(`${k}`)} = ${-k}` }
        : { text: 'It is above the axis, so the modulus leaves it where it is.', tex: `y = ${k}` },
    );
    return steps;
  },
};

interface ValuesParams {
  a: number;
  p: number;
  q: number;
  /** The two points asked about, in increasing order. */
  x1: number;
  x2: number;
}

const valuesTex = ({ a, p, q }: ValuesParams) => quadTex(a, -a * (p + q), a * p * q);
const valuesAt = ({ a, p, q }: ValuesParams) => (x: number) => a * (x - p) * (x - q);

/**
 * $f$, then $|f|$, at two named points: one between the roots and one
 * outside them, so one value changes sign and the other does not.
 * Difficulty 2 has a leading coefficient that is negative or not one.
 */
const absValuesTree: Generator<ValuesParams> = {
  id: 'mod-abs-values-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const { p, q } = sampleRootPair(rng, -5, 5, (lo, hi) => hi - lo >= 2);
        const inside = rng.int(p + 1, q - 1);
        const outside = rng.chance(0.5) ? rng.int(q + 1, q + 3) : rng.int(p - 3, p - 1);
        return { a: hard ? rng.pick([-1, 2, -2]) : 1, p, q, x1: Math.min(inside, outside), x2: Math.max(inside, outside) };
      },
      (params) => {
        const f = valuesAt(params);
        const [u, v] = [f(params.x1), f(params.x2)];
        return Math.abs(params.x1) <= 6 && Math.abs(params.x2) <= 6 && Math.abs(u) <= 30 && Math.abs(v) <= 30 && Math.abs(u) !== Math.abs(v);
      },
      { a: 1, p: -1, q: 3, x1: 1, x2: 4 },
    );
  },
  render: (params): Slide => {
    const f = valuesAt(params);
    const [u, v] = [f(params.x1), f(params.x2)];
    const answer = [`${u}`, `${v}`, `${Math.abs(u)}`, `${Math.abs(v)}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Top row: $f(x)$ at $x = ${params.x1}$ and at $x = ${params.x2}$. Below each: the height of $y = ${absTex('f(x)')}$ there.`,
        },
      ],
      expression: `f(x) = ${valuesTex(params)}`,
      nodes: [
        { id: 'f1', from: [] },
        { id: 'f2', from: [] },
        { id: 'a1', from: ['f1'] },
        { id: 'a2', from: ['f2'] },
      ],
      bank: treeBank(answer, [-Math.abs(u), -Math.abs(v)], Math.abs(u)),
      answer,
    };
  },
  solution: (params) => {
    const f = valuesAt(params);
    const steps: SolutionStep[] = [];
    for (const x of [params.x1, params.x2]) {
      const value = f(x);
      steps.push({
        text:
          value < 0
            ? `At $x = ${x}$, $f(${x}) = ${value}$: below the axis, so the modulus reflects it to $${-value}$.`
            : `At $x = ${x}$, $f(${x}) = ${value}$: not below the axis, so the modulus leaves it as $${value}$.`,
      });
    }
    return steps;
  },
};

const NEG_BETWEEN = 'Between its roots';
const NEG_OUTSIDE = 'Outside its roots';
const NEG_ALL = 'Everywhere';

/**
 * What the modulus does to this quadratic's graph.
 *
 * Nothing if the curve never goes below the axis; the dip between the roots
 * if it is a U through the axis; both arms if it is an upside-down U through
 * the axis; the whole curve if it is an upside-down U below it. Difficulty 1
 * keeps to U shapes in vertex form; difficulty 2 has both ways up, written
 * out in full.
 */
const absSketchFlow: Generator<VertexShapeParams> = {
  id: 'mod-abs-sketch-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return { s: hard && rng.chance(0.5) ? -1 : 1, h: rng.int(-3, 3), k: rng.pick(nonZero(-9, 9)), expanded: hard };
  },
  render: (params): Slide => {
    const { s, k } = params;
    const answer = s > 0 ? (k < 0 ? [YES, NEG_BETWEEN] : [NO]) : k > 0 ? [YES, NEG_OUTSIDE] : [YES, NEG_ALL];
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `How does the graph of $y = f(x)$ turn into the graph of $y = ${absTex('f(x)')}$? Here $f(x) = ${shapeTex(params)}$.`,
        },
      ],
      subject: `y = ${absTex(shapeTex(params))}`,
      steps: [
        {
          id: 'below',
          ask: 'Does $y = f(x)$ go below the $x$-axis anywhere? Think about which way it opens and where its vertex is.',
          branches: [
            { label: YES, to: 'where' },
            { label: NO, outcome: 'Nothing is below the axis, so nothing is reflected: the graph is the same curve as $y = f(x)$.' },
          ],
        },
        {
          id: 'where',
          ask: 'Where is $f(x)$ negative?',
          branches: [
            { label: NEG_BETWEEN, outcome: 'Reflect the dip between the roots up: the roots stay put and the vertex rises to the same height above the axis.' },
            { label: NEG_OUTSIDE, outcome: 'Reflect both arms up: the roots stay put, the arms rise on either side, and the vertex does not move.' },
            { label: NEG_ALL, outcome: 'Reflect the whole curve: the graph is $y = -f(x)$, the same shape turned the other way up.' },
          ],
        },
      ],
      answer,
    };
  },
  solution: (params) => {
    const { s, h, k, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: 'Completing the square puts it in vertex form.', tex: `f(x) = ${vertexFormTex(params)}` });
    const opens = s > 0 ? 'a U, opening upwards' : 'an upside-down U';
    const where = k < 0 ? 'below' : 'above';
    steps.push({ text: `It is ${opens}, with its vertex $(${h}, ${k})$ ${where} the axis.` });
    if (s > 0 && k > 0) steps.push({ text: 'So it never goes below the axis, and the modulus changes nothing.' });
    else if (s > 0) steps.push({ text: 'So it is negative between its roots, and that dip is reflected up.' });
    else if (k > 0) steps.push({ text: 'So it is negative outside its roots, and both arms are reflected up.' });
    else steps.push({ text: 'So it is negative everywhere, and the whole curve is reflected.' });
    return steps;
  },
};

/* ---------- Lesson 2: y = f(|x|) ---------- */

/**
 * Which equation is this graph: $y = f(|x|)$, $y = |f(x)|$, $y = f(x)$, or
 * $y = f(|x|)$ with the roots' signs turned?
 *
 * At least one root of $f$ is positive, so the graph has roots to mirror and
 * reads as a W or a U with a dimple, symmetric about the $y$-axis.
 * Difficulty 2 writes the options multiplied out.
 */
const fabsMatch: Generator<RootPairParams> = {
  id: 'mod-fabs-match',
  sample: (rng, difficulty) => ({
    ...sampleRootPair(rng, -5, 5, (p, q) => q > 0 && p !== -q),
    expanded: difficulty > 1,
  }),
  render: (params): Slide => {
    const { p, q } = params;
    const f = productOf([p, q]);
    const g = (x: number) => f(Math.abs(x));
    const lowest = Math.min(0, ...Array.from({ length: 61 }, (_, i) => g(i / 10)));
    const yMin = Math.floor(lowest) - 2;
    const roots = [...new Set([p, q].filter((r) => r >= 0).flatMap((r) => [r, -r]))].sort((x, y) => x - y);
    return pickOne(
      [
        {
          kind: 'prose',
          text: `Which equation has this graph? It meets the $x$-axis at $x = ${roots.join(', ')}$.`,
        },
        {
          kind: 'diagram',
          svg: modPlot([{ f: g, accent: true }], yMin, Math.max(yMin + 12, p * q + 3), 'A curve symmetric about the y-axis', roots.map((x) => ({ x, y: 0 }))),
        },
      ],
      `y = ${pairAbsXTex(params)}`,
      [`y = ${absTex(rootPairTex(params))}`, `y = ${rootPairTex(params)}`, `y = ${pairAbsXTex(mirrorPair(params))}`],
    );
  },
  solution: (params) => {
    const { p, q } = params;
    const positive = [p, q].filter((r) => r > 0);
    return [
      { text: 'The graph is symmetric about the $y$-axis: its left half is its right half mirrored. That is what $y = f(\\lvert x \\rvert)$ looks like.' },
      {
        text: `For $x \\ge 0$ it is $y = ${rootPairTex(params)}$, which has ${positive.length === 1 ? `the positive root $x = ${positive[0]}$` : `positive roots $x = ${positive.join('$ and $x = ')}$`}; the mirror adds ${positive.length === 1 ? `$x = ${-positive[0]}$` : `$x = ${positive.map((r) => -r).join('$ and $x = ')}$`}.`,
      },
      { tex: `y = ${pairAbsXTex(params)}` },
    ];
  },
};

interface ArmParams4 {
  /** f(x) = x^2 + bx + c at difficulty 1. */
  b: number;
  c: number;
  /** f(x) = (x - p)(x - q) at difficulty 2. */
  p: number;
  q: number;
  factorised: boolean;
}

/**
 * The left-hand arm of $y = f(|x|)$.
 *
 * Where $x < 0$, $|x| = -x$, so the arm is $y = f(-x)$: the $x$ term changes
 * sign and the rest does not. Difficulty 2 has $f$ factorised, where
 * $f(-x) = (-x - p)(-x - q) = (x + p)(x + q)$.
 */
const fabsArmTiles: Generator<ArmParams4> = {
  id: 'mod-fabs-arm-tiles',
  sample: (rng, difficulty) => {
    if (difficulty < 2) return { b: rng.pick(nonZero(-9, 9)), c: rng.pick(nonZero(-9, 9)), p: 0, q: 0, factorised: false };
    const { p, q } = sampleRootPair(rng, -6, 6, (lo, hi) => lo !== 0 && hi !== 0 && lo !== -hi);
    return { b: -(p + q), c: p * q, p, q, factorised: true };
  },
  render: ({ b, c, p, q, factorised }): Slide => {
    const right = factorised ? productTex([p, q]) : quadTex(1, b, c);
    const whole = factorised ? productTex([p, q], true) : quadAbsXTex(1, b, c);
    const answer = factorised ? [signedTile(p), signedTile(q)] : [signedTile(-b, 'x'), signedTile(c)];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: `The graph of $y = ${whole}$ has two arms. Where $x \\ge 0$ it is $y = ${right}$. Build the left-hand arm, where $x < 0$.`,
        },
      ],
      template: factorised ? 'y = (x {0})(x {1})' : 'y = x^2 {0} {1}',
      bank: factorised
        ? bankOf(answer, [signedTile(-p), signedTile(-q)])
        : bankOf(answer, [signedTile(b, 'x'), signedTile(-c)]),
      answer,
      ...(factorised ? { unordered: true } : {}),
    };
  },
  solution: ({ b, c, p, q, factorised }) => {
    const steps: SolutionStep[] = [{ text: 'Where $x < 0$, $\\lvert x \\rvert = -x$, so the left arm is $y = f(-x)$: the right arm reflected in the $y$-axis.' }];
    if (factorised) {
      steps.push(
        { tex: `f(-x) = ${rootFactor(p).replace('x', '-x')}${rootFactor(q).replace('x', '-x')}` },
        { text: 'Take a minus sign out of each bracket; the two minus signs cancel.', tex: `y = ${productTex([-p, -q])}` },
      );
    } else {
      steps.push(
        { text: `$(-x)^2 = x^2$ and $${b}(-x) = ${-b}x$, and the number stays.` },
        { tex: `y = ${quadTex(1, -b, c)}` },
      );
    }
    return steps;
  },
};

interface InsideOutParams {
  p: number;
  q: number;
  /** A negative x. */
  t: number;
}

const insideOutAt = ({ p, q }: InsideOutParams) => productOf([p, q]);

/**
 * $f(|x|)$ and $|f(x)|$ at the same negative $x$.
 *
 * The modulus inside takes $|x|$ first, so the value is $f$ at a positive
 * number; the modulus outside works out $f$ at the negative number first and
 * then makes it positive. Difficulty 2 picks a point where $f$ is negative,
 * so both moduli do something.
 */
const insideOutTree: Generator<InsideOutParams> = {
  id: 'mod-inside-out-tree',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const { p, q } = sampleRootPair(rng, -6, 6, (lo, hi) => lo !== -hi);
        return { p, q, t: rng.int(-5, -1) };
      },
      (params) => {
        const f = insideOutAt(params);
        const [outside, inside] = [f(params.t), f(-params.t)];
        return (
          Math.abs(outside) <= 30 &&
          Math.abs(inside) <= 30 &&
          inside !== Math.abs(outside) &&
          (difficulty > 1 ? outside < 0 : outside > 0)
        );
      },
      difficulty > 1 ? { p: -3, q: 2, t: -1 } : { p: 1, q: 4, t: -2 },
    ),
  render: (params): Slide => {
    const { t } = params;
    const f = insideOutAt(params);
    const answer = [`${-t}`, `${f(-t)}`, `${f(t)}`, `${Math.abs(f(t))}`];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Compare $y = f(${ABS_X})$ and $y = ${absTex('f(x)')}$ at $x = ${t}$. Left: $${absTex(`${t}`)}$, then $f$ of that. Right: $f(${t})$, then its modulus.`,
        },
      ],
      expression: `f(x) = ${quadTex(1, -(params.p + params.q), params.p * params.q)}`,
      nodes: [
        { id: 'abs', from: [] },
        { id: 'fabs', from: ['abs'] },
        { id: 'f', from: [] },
        { id: 'absf', from: ['f'] },
      ],
      bank: treeBank(answer, [t, -Math.abs(f(t)), -f(-t)], f(-t)),
      answer,
    };
  },
  solution: (params) => {
    const { t } = params;
    const f = insideOutAt(params);
    const fx = f(t);
    return [
      { text: `Inside first: $${absTex(`${t}`)} = ${-t}$, and $f(${-t}) = ${f(-t)}$.` },
      { text: `Outside last: $f(${t}) = ${fx}$, and its modulus is $${Math.abs(fx)}$.` },
      { text: `So at $x = ${t}$ the graph of $y = f(${ABS_X})$ is at $${f(-t)}$ and the graph of $y = ${absTex('f(x)')}$ at $${Math.abs(fx)}$: different curves.` },
    ];
  },
};

/**
 * How many roots $f(|x|) = 0$ has, from the roots of $f$.
 *
 * $|x|$ must be a root of $f$: a positive root $r$ gives $x = \pm r$, a root
 * at zero gives $x = 0$, and a negative root gives nothing. Difficulty 2
 * writes $f$ multiplied out.
 */
const fabsCountFlow: Generator<RootPairParams> = {
  id: 'mod-fabs-count-flow',
  sample: (rng, difficulty) => ({ ...sampleRootPair(rng, -6, 6, () => true), expanded: difficulty > 1 }),
  render: (params): Slide => {
    const { p, q } = params;
    const positive = [p, q].filter((r) => r > 0).length;
    const zero = p === 0 || q === 0;
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `How many roots does $f(${ABS_X}) = 0$ have? For it to hold, $${ABS_X}$ must be a root of $f$.`,
        },
      ],
      subject: `f(x) = ${rootPairTex(params)}`,
      steps: [
        {
          id: 'positive',
          ask: 'How many roots of $f(x) = 0$ are positive?',
          branches: [
            { label: COUNT_LABEL[0], to: 'zero-none' },
            { label: COUNT_LABEL[1], to: 'zero-one' },
            { label: COUNT_LABEL[2], outcome: 'Each positive root $r$ gives two, $x = r$ and $x = -r$: four roots in all.' },
          ],
        },
        {
          id: 'zero-none',
          ask: 'Is $x = 0$ a root of $f(x) = 0$?',
          branches: [
            { label: YES, outcome: `Only $x = 0$: a negative root gives nothing, since $${ABS_X}$ is never negative. One root.` },
            { label: NO, outcome: `None at all: every root of $f$ is negative, and $${ABS_X}$ never is.` },
          ],
        },
        {
          id: 'zero-one',
          ask: 'Is $x = 0$ a root of $f(x) = 0$?',
          branches: [
            { label: YES, outcome: 'Three roots: $x = 0$, and the positive root with its mirror image.' },
            { label: NO, outcome: 'Two roots: the positive root $r$ gives $x = r$ and $x = -r$, and the negative root gives nothing.' },
          ],
        },
      ],
      answer: positive === 2 ? [COUNT_LABEL[2]] : [COUNT_LABEL[positive], zero ? YES : NO],
    };
  },
  solution: (params) => {
    const { p, q, expanded } = params;
    const roots = [...new Set([p, q].filter((r) => r >= 0).flatMap((r) => [-r, r]))].sort((x, y) => x - y);
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: 'Factorise first.', tex: `f(x) = ${productTex([p, q])}` });
    steps.push({ text: `The roots of $f$ are $${p}$ and $${q}$. $${ABS_X}$ can be a root that is zero or positive, never a negative one.` });
    steps.push(
      roots.length === 0
        ? { text: 'Both are negative, so there are no roots.' }
        : { text: `So $x = ${roots.join(', ')}$: ${COUNT_LABEL[roots.length].toLowerCase()} in all.` },
    );
    return steps;
  },
};

/* ---------- Lesson 3: solving |f(x)| = c from the graph ---------- */

interface DipRow {
  h: number;
  c: number;
  /** The square root of h + c. */
  outer: number;
  /** The square root of h - c, or null when h < c. */
  inner: number | null;
}

/**
 * $|(x - m)^2 - h| = c$ with every root whole. The dip of $f$ reaches $-h$,
 * so the reflected hump peaks at $h$: a line below the peak cuts four times
 * (both square roots real), at the peak three, above it twice.
 */
const DIPS: readonly DipRow[] = [
  { h: 5, c: 4, outer: 3, inner: 1 },
  { h: 10, c: 6, outer: 4, inner: 2 },
  { h: 13, c: 12, outer: 5, inner: 1 },
  { h: 17, c: 8, outer: 5, inner: 3 },
  { h: 20, c: 16, outer: 6, inner: 2 },
  { h: 26, c: 10, outer: 6, inner: 4 },
  { h: 2, c: 2, outer: 2, inner: 0 },
  { h: 8, c: 8, outer: 4, inner: 0 },
  { h: 18, c: 18, outer: 6, inner: 0 },
  { h: 1, c: 3, outer: 2, inner: null },
  { h: 1, c: 8, outer: 3, inner: null },
  { h: 2, c: 7, outer: 3, inner: null },
  { h: 3, c: 6, outer: 3, inner: null },
  { h: 4, c: 5, outer: 3, inner: null },
  { h: 1, c: 15, outer: 4, inner: null },
  { h: 3, c: 13, outer: 4, inner: null },
  { h: 4, c: 12, outer: 4, inner: null },
  { h: 5, c: 11, outer: 4, inner: null },
  { h: 7, c: 9, outer: 4, inner: null },
  { h: 9, c: 16, outer: 5, inner: null },
  { h: 11, c: 14, outer: 5, inner: null },
  { h: 12, c: 13, outer: 5, inner: null },
];

/** The table, for the test that checks every row. */
export const modulusDips = DIPS;

interface DipParams extends DipRow {
  m: number;
  expanded: boolean;
}

/**
 * A row and a shift. Difficulty 1 writes $f$ in vertex form with the vertex
 * near the middle; difficulty 2 writes it out in full, so the square has to
 * be completed, and moves the vertex further.
 */
function sampleDip(rng: Rng, difficulty: number, accept: (row: DipRow) => boolean, reach: number): DipParams {
  const hard = difficulty > 1;
  const rows = DIPS.filter(accept);
  return drawUntil(
    () => ({ ...rng.pick(rows), m: rng.int(hard ? -3 : -2, hard ? 3 : 2), expanded: hard }),
    (params) => Math.abs(params.m) + params.outer <= reach,
    { ...rows[0], m: 0, expanded: hard },
  );
}

/** (x - m)^2 - h, in vertex form or multiplied out. */
const dipTex = ({ m, h, expanded }: DipParams) => (expanded ? quadTex(1, -2 * m, m * m - h) : `${squareTex(m)} ${signedTile(-h)}`);
const dipAt = ({ m, h }: DipParams) => (x: number) => (x - m) * (x - m) - h;
/** |f(x)| op c, or = c. */
const dipEquationTex = (params: DipParams, op?: Op) => `${absTex(dipTex(params))} ${op ? OP_TEX[op] : '='} ${params.c}`;

/** Every root of |f(x)| = c, smallest first. */
function dipRoots({ m, outer, inner }: DipParams): number[] {
  const roots = [m - outer, m + outer];
  if (inner !== null) roots.push(m - inner, m + inner);
  return [...new Set(roots)].sort((a, b) => a - b);
}

/** m ± r as the learner writes a pair of roots: `x = \pm 3`, `x = -2, 4`. */
function plusMinusTex(m: number, r: number): string {
  return m === 0 ? `x = \\pm ${r}` : `x = ${m - r}, ${m + r}`;
}

/** The roots of (x - m)^2 = h - c as a tile: a pair, one root, or none. */
function innerRootsTex({ m, inner }: DipParams): string {
  if (inner === null) return '\\text{no roots}';
  return inner === 0 ? `x = ${m}` : plusMinusTex(m, inner);
}

/** |f(x)| = c by cases, for a worked solution. */
function dipSolution(params: DipParams): SolutionStep[] {
  const { m, h, c, outer, inner, expanded } = params;
  const sq = squareTex(m);
  const steps: SolutionStep[] = [{ tex: dipEquationTex(params) }];
  if (expanded) steps.push({ text: 'Complete the square first.', tex: `${dipTex(params)} = ${sq} ${signedTile(-h)}` });
  steps.push(
    { text: `A modulus is $${c}$ when what is inside is $${c}$ or $${-c}$.`, tex: either([`${sq} ${signedTile(-h)} = ${c}`, `${sq} ${signedTile(-h)} = ${-c}`], QOR) },
    { tex: either([`${sq} = ${h + c}`, `${sq} = ${h - c}`], QOR) },
    { text: `The first gives $${plusMinusTex(m, outer)}$.` },
  );
  if (inner === null) steps.push({ text: `In the second, $${h - c}$ is negative and no square is: nothing. The line $y = ${c}$ passes above the hump.` });
  else if (inner === 0) steps.push({ text: `The second gives $x = ${m}$ alone: the line $y = ${c}$ just touches the top of the hump.` });
  else steps.push({ text: `The second gives $${plusMinusTex(m, inner)}$: the line $y = ${c}$ cuts the hump as well.` });
  steps.push({ tex: `x = ${dipRoots(params).join(', ')}` });
  return steps;
}

type RootWhich = 'largest' | 'smallest' | 'second largest';

interface DipRootParams extends DipParams {
  which: RootWhich;
}

function askedDipRoot(params: DipRootParams): number {
  const roots = dipRoots(params);
  if (params.which === 'smallest') return roots[0];
  return params.which === 'largest' ? roots[roots.length - 1] : roots[roots.length - 2];
}

/**
 * Solve $|f(x)| = c$ and give one named root.
 *
 * The largest and smallest come from $f(x) = c$ alone; difficulty 2 also asks
 * for the second largest, which sits on the reflected hump when the line cuts
 * it, and so needs the case $f(x) = -c$.
 */
const quadEqRoot: Generator<DipRootParams> = {
  id: 'mod-quad-eq-root',
  choices: (params) => {
    const target = askedDipRoot(params);
    const others = dipRoots(params).filter((root) => root !== target);
    return numberChoices(target, [...others, -target], dipEquationTex(params));
  },
  sample: (rng, difficulty) => ({
    ...sampleDip(rng, difficulty, () => true, 8),
    which: rng.pick<RootWhich>(difficulty > 1 ? ['largest', 'smallest', 'second largest', 'second largest'] : ['largest', 'smallest']),
  }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      { kind: 'prose', text: `Solve. Give the **${params.which}** root.` },
      { kind: 'display', tex: dipEquationTex(params) },
    ],
    lead: 'x =',
    keypad: [],
    answer: `${askedDipRoot(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [...dipSolution(params), { text: `The ${params.which} root is $x = ${askedDipRoot(params)}$.` }],
};

/**
 * $|f(x)| = c$ as two cases in a tree: each case with the square on its own,
 * then its roots. The second case has two roots, one, or none, depending on
 * where the line $y = c$ meets the reflected hump.
 */
const twoCasesTree: Generator<DipParams> = {
  id: 'mod-two-cases-tree',
  sample: (rng, difficulty) => sampleDip(rng, difficulty, () => true, 8),
  render: (params): Slide => {
    const { m, h, c, outer } = params;
    const sq = squareTex(m);
    const answer = [`${sq} = ${h + c}`, `${sq} = ${h - c}`, plusMinusTex(m, outer), innerRootsTex(params)];
    const wrong = [
      `${sq} = ${c - h}`,
      `${sq} = ${-h - c}`,
      plusMinusTex(m, h + c),
      m === 0 ? `x = ${outer}` : plusMinusTex(-m, outer),
      '\\text{no roots}',
      `x = ${m}`,
    ];
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Solve by cases, $f(x) = ${c}$ and $f(x) = ${-c}$. Top row: each case with $${sq}$ alone on the left, $${c}$ first. Below each: its roots.`,
        },
      ],
      expression: dipEquationTex(params),
      nodes: [
        { id: 'plus', from: [] },
        { id: 'minus', from: [] },
        { id: 'plus-roots', from: ['plus'] },
        { id: 'minus-roots', from: ['minus'] },
      ],
      bank: bankOf(answer, wrong.filter((token) => !answer.includes(token)).slice(0, 4)),
      answer,
    };
  },
  solution: dipSolution,
};

type CrossingWhich = 'left' | 'right' | 'hump-left' | 'hump-right';

interface CrossingParams extends DipParams {
  which: CrossingWhich;
}

const CROSSING_WORDS: Record<CrossingWhich, string> = {
  left: 'the **left-most** crossing',
  right: 'the **right-most** crossing',
  'hump-left': 'where the line cuts the **left** side of the reflected hump',
  'hump-right': 'where the line cuts the **right** side of the reflected hump',
};

function crossingAt({ m, outer, inner, which }: CrossingParams): number {
  if (which === 'left') return m - outer;
  if (which === 'right') return m + outer;
  return which === 'hump-left' ? m - (inner ?? 0) : m + (inner ?? 0);
}

/**
 * Slide to a crossing of $y = |f(x)|$ and $y = c$.
 *
 * The outer crossings come from $f(x) = c$; difficulty 2 also asks where the
 * line cuts the reflected hump, which is $f(x) = -c$.
 */
const crossingSlider: Generator<CrossingParams> = {
  id: 'mod-crossing-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const params = sampleDip(rng, difficulty, (row) => Math.max(row.h, row.c) <= 16 && (!hard || (row.inner ?? 0) > 0), 6);
    return { ...params, which: rng.pick<CrossingWhich>(hard ? ['left', 'right', 'hump-left', 'hump-right'] : ['left', 'right']) };
  },
  render: (params): Slide => {
    const f = dipAt(params);
    return {
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The curve is $y = ${absTex(dipTex(params))}$ and the dashed line is $y = ${params.c}$. Slide to the $x$-coordinate of ${CROSSING_WORDS[params.which]}.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: crossingAt(params),
      readout: 'x = {v}',
      figure: {
        svg: modPlot([{ f: (x) => Math.abs(f(x)), accent: true }], -2, Math.max(params.h, params.c) + 3, 'A W-shaped curve and a dashed horizontal line', [], [params.c]),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: (params) => [
    ...dipSolution(params).slice(1),
    {
      text:
        params.which === 'left' || params.which === 'right'
          ? `The ${params.which}-most crossing is at $x = ${crossingAt(params)}$.`
          : `The hump is the part reflected from below, where $f(x) = ${-params.c}$; the crossing on its ${params.which === 'hump-left' ? 'left' : 'right'} side is at $x = ${crossingAt(params)}$.`,
    },
  ],
};

interface DipCountParams {
  m: number;
  h: number;
  c: number;
  expanded: boolean;
  /** A graph of y = |f(x)| and the line y = c alongside. */
  drawn: boolean;
}

/** How many solutions |(x - m)^2 - h| = c has. */
function dipCount({ h, c }: DipCountParams): number {
  if (c < 0) return 0;
  if (c === 0) return 2;
  return c < h ? 4 : c === h ? 3 : 2;
}

const DIP_COUNT_WORDS: Record<number, string> = { 0: 'None', 2: 'Two', 3: 'Three', 4: 'Four' };

/**
 * How many solutions does $|f(x)| = c$ have?
 *
 * Four when the line $y = c$ is below the top of the reflected hump, three
 * when it touches it, two above it. Difficulty 1 draws the graph and the
 * line; difficulty 2 draws nothing, writes $f$ out in full, and sometimes
 * asks for a negative $c$, which no modulus reaches.
 */
const quadCount: Generator<DipCountParams> = {
  id: 'mod-quad-count',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const h = rng.int(1, 9);
    const c = hard ? rng.pick([-3, -1, h, h, ...range(1, 12)]) : rng.int(1, 12);
    return { m: rng.int(hard ? -3 : -2, hard ? 3 : 2), h, c, expanded: hard, drawn: !hard };
  },
  render: (params): Slide => {
    const tex = dipEquationTex({ ...params, outer: 0, inner: null });
    const f = dipAt({ ...params, outer: 0, inner: null });
    const prompt: Block[] = [
      { kind: 'prose', text: 'How many solutions does this equation have?' },
      { kind: 'display', tex },
    ];
    if (params.drawn) {
      prompt.push({
        kind: 'diagram',
        svg: modPlot([{ f: (x) => Math.abs(f(x)), accent: true }], -2, Math.max(params.h, params.c) + 3, 'The curve y = |f(x)| and a dashed horizontal line', [], [params.c]),
      });
    }
    const correct = DIP_COUNT_WORDS[dipCount(params)];
    return pickOne(prompt, correct, Object.values(DIP_COUNT_WORDS).filter((word) => word !== correct), false, tex);
  },
  solution: (params) => {
    const { m, h, c, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: 'Complete the square.', tex: `f(x) = ${squareTex(m)} ${signedTile(-h)}` });
    steps.push({ text: `The vertex of $y = f(x)$ is $(${m}, ${-h})$, so the modulus reflects the dip into a hump with its top at $(${m}, ${h})$.` });
    if (c < 0) steps.push({ text: `A modulus is never negative, so it is never $${c}$: no solutions.` });
    else if (c === 0) steps.push({ text: 'The modulus is zero only where $f(x)$ is: the two roots of $f$, so two solutions.' });
    else if (c < h) steps.push({ text: `The line $y = ${c}$ is below the top of the hump, so it cuts both outer arms and both sides of the hump: four solutions.` });
    else if (c === h) steps.push({ text: `The line $y = ${c}$ touches the top of the hump and cuts both outer arms: three solutions.` });
    else steps.push({ text: `The line $y = ${c}$ is above the hump, so it cuts only the two outer arms: two solutions.` });
    return steps;
  },
};

/* ---------- Lesson 4: cubics ---------- */

interface CubicParams {
  /** Three distinct roots, smallest first. */
  roots: [number, number, number];
  /** 1, or -1 for a minus sign in front of the product. */
  s: 1 | -1;
}

/** The two heights |f| rises to between neighbouring roots, from the turning points. */
function humps(roots: readonly number[], s = 1): number[] {
  const [p, q, r] = roots;
  const f = (x: number) => s * productOf(roots)(x);
  const s1 = p + q + r;
  const s2 = p * q + q * r + r * p;
  const root = Math.sqrt(s1 * s1 - 3 * s2);
  return [(s1 - root) / 3, (s1 + root) / 3].map((x) => Math.abs(f(x)));
}

/** Three distinct roots from -4 to 4 whose humps stay on the page. */
function sampleCubicRoots(rng: Rng, accept: (roots: [number, number, number]) => boolean = () => true): [number, number, number] {
  return drawUntil(
    () => [rng.int(-4, 4), rng.int(-4, 4), rng.int(-4, 4)].sort((a, b) => a - b) as [number, number, number],
    (roots) => roots[0] < roots[1] && roots[1] < roots[2] && Math.max(...humps(roots)) <= 16 && accept(roots),
    [-2, 1, 3],
  );
}

const cubicTex = ({ roots, s }: CubicParams) => `${s < 0 ? '-' : ''}${productTex(roots)}`;

interface CubicMatchParams {
  roots: [number, number, number];
  marked: boolean;
}

/**
 * Which equation is this graph?
 *
 * $y = |f(x)|$ for a cubic touches the axis at each root and has two humps
 * and two arms, all above the axis. The options are $f$ without its bars,
 * the mirror image, and $f(|x|)$. Difficulty 1 marks the roots; difficulty 2
 * leaves them to be read off the grid.
 */
const cubicMatch: Generator<CubicMatchParams> = {
  id: 'mod-cubic-match',
  sample: (rng, difficulty) => ({
    roots: sampleCubicRoots(rng, ([p, q, r]) => !(p === -r && q === 0)),
    marked: difficulty < 2,
  }),
  render: ({ roots, marked }): Slide => {
    const f = productOf(roots);
    const mirror = [-roots[2], -roots[1], -roots[0]];
    return pickOne(
      [
        {
          kind: 'prose',
          text: marked
            ? `Which equation has this graph? It meets the $x$-axis at $x = ${roots.join(', ')}$.`
            : 'Which equation has this graph? Read where it meets the $x$-axis off the grid.',
        },
        {
          kind: 'diagram',
          svg: modPlot(
            [{ f: (x) => Math.abs(f(x)), accent: true }],
            -2,
            Math.max(...humps(roots)) + 4,
            'A curve with two humps, touching the x-axis three times and never going below it',
            marked ? roots.map((x) => ({ x, y: 0 })) : [],
          ),
        },
      ],
      `y = ${absTex(productTex(roots))}`,
      [`y = ${productTex(roots)}`, `y = ${absTex(productTex(mirror))}`, `y = ${productTex(roots, true)}`],
    );
  },
  solution: ({ roots }) => [
    { text: `It meets the $x$-axis at $x = ${roots.join(', ')}$, so the cubic is $${productTex(roots)}$.` },
    { text: 'A cubic without a modulus goes below the axis somewhere; this curve never does, and it is not symmetric about the $y$-axis, so it is not $f(\\lvert x \\rvert)$.' },
    { text: 'Every part that was below the axis has been reflected up.', tex: `y = ${absTex(productTex(roots))}` },
  ],
};

interface CubicLineParams extends CubicParams {
  min: number;
  max: number;
}

/**
 * Shade where $f(x) < 0$: the stretches $y = |f(x)|$ reflects.
 *
 * Each bracket changes sign at its root, so the sign alternates between the
 * roots, positive to the right of all three. Difficulty 2 puts a minus sign
 * in front, which turns every stretch over.
 */
const cubicReflectLine: Generator<CubicLineParams> = {
  id: 'mod-cubic-reflect-line',
  sample: (rng, difficulty) => {
    const roots = sampleCubicRoots(rng);
    return { roots, s: difficulty > 1 && rng.chance(0.5) ? -1 : 1, ...windowFor(rng, roots[0], roots[2], 10, 1) };
  },
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: `Shade where $f(x) < 0$. Those are the stretches the graph of $y = ${absTex('f(x)')}$ reflects up.` },
      { kind: 'display', tex: `f(x) = ${cubicTex(params)}` },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(signSet(params.roots, [], params.s, '<')),
  }),
  solution: (params) => {
    const { roots, s } = params;
    const set = signSet(roots, [], s, '<');
    return [
      { text: `Each bracket changes sign at its root. To the right of $x = ${roots[2]}$ every bracket is positive${s < 0 ? ', and the minus in front makes $f$ negative there' : ', so $f$ is positive there'}.` },
      { text: 'Moving left, the sign changes at each root in turn.' },
      { tex: setTex(set) },
      { text: describeSet(set) },
    ];
  },
};

type CubicKind = 'three' | 'double';

interface CubicCountParams {
  kind: CubicKind;
  /** Three roots, or [p, p, q] for (x - p)^2 (x - q). */
  roots: [number, number, number];
  c: number;
}

/** (x - p)^2 (x - q), or the product of three brackets. */
const countCubicTex = ({ kind, roots }: CubicCountParams) =>
  kind === 'double' ? `${squareTex(roots[0])}${rootFactor(roots[2])}` : productTex(roots);

/** The humps' heights: two for three roots, one, of height 4, for a double root three from the other. */
function countHumps({ kind, roots }: CubicCountParams): number[] {
  return kind === 'double' ? [4] : humps(roots);
}

/** Two outer arms always; each hump twice while the line is below its top, once at it. */
function cubicCount(params: CubicCountParams): number {
  return 2 + countHumps(params).reduce((total, top) => total + (params.c < top ? 2 : params.c === top ? 1 : 0), 0);
}

/**
 * How many solutions $|f(x)| = c$ has for a cubic, from its graph.
 *
 * The outer arms always meet the line; each hump meets it twice if the line
 * is below the top. Difficulty 1 has three distinct roots and keeps the line
 * well away from either top. Difficulty 2 mixes in a double root,
 * $(x - p)^2 (x - q)$ with $q = p \pm 3$, whose hump is exactly $4$ high, so
 * the line can touch it.
 */
const cubicCountGen: Generator<CubicCountParams> = {
  id: 'mod-cubic-count',
  choices: (params) => {
    const n = cubicCount(params);
    return numberChoices(n, [n + 2, n - 2, n + 1], `${countCubicTex(params)} = ${params.c}`);
  },
  sample: (rng, difficulty) => {
    if (difficulty > 1 && rng.chance(0.5)) {
      const p = rng.int(-4, 4);
      const q = drawUntil(() => p + rng.pick([-3, 3]), (value) => Math.abs(value) <= 4, p > 0 ? p - 3 : p + 3);
      return { kind: 'double', roots: [p, p, q], c: rng.int(1, 8) };
    }
    return drawUntil(
      () => {
        const roots = sampleCubicRoots(rng);
        return { kind: 'three' as const, roots, c: rng.int(1, Math.ceil(Math.max(...humps(roots))) + 3) };
      },
      (params) => countHumps(params).every((top) => Math.abs(params.c - top) >= 1),
      { kind: 'three', roots: [-2, 1, 3], c: 3 },
    );
  },
  render: (params): Slide => {
    const f = productOf(params.roots);
    const tex = `${absTex(countCubicTex(params))} = ${params.c}`;
    return {
      kind: 'expression',
      prompt: [
        { kind: 'prose', text: `The graph is $y = ${absTex(countCubicTex(params))}$ and the dashed line is $y = ${params.c}$. How many solutions does this have? Call the count $n$.` },
        { kind: 'display', tex },
        {
          kind: 'diagram',
          svg: modPlot([{ f: (x) => Math.abs(f(x)), accent: true }], -2, Math.max(params.c, ...countHumps(params)) + 3, 'A cubic curve kept above the x-axis by a modulus, and a dashed horizontal line', [], [params.c]),
        },
      ],
      lead: 'n =',
      keypad: [],
      answer: `${cubicCount(params)}`,
      domain: 'real',
      mode: 'exact',
    };
  },
  solution: (params) => {
    const { kind, c } = params;
    const tops = countHumps(params);
    const steps: SolutionStep[] = [{ text: 'The two outer arms rise without end, so the line meets each of them once.' }];
    if (kind === 'double') {
      steps.push({ text: 'The double root is where the curve touches the axis and turns; the one hump is between the roots and is $4$ high.' });
    } else {
      steps.push({ text: `The two humps are about $${tops.map((top) => top.toFixed(1)).join('$ and $')}$ high.` });
    }
    for (const top of tops) {
      const rounded = kind === 'double' ? `${top}` : top.toFixed(1);
      steps.push({
        text:
          c < top
            ? `$${c}$ is below the hump of height $${rounded}$: two crossings there.`
            : c === top
              ? `$${c}$ touches the top of that hump: one more solution.`
              : `$${c}$ is above the hump of height $${rounded}$: no crossings there.`,
      });
    }
    steps.push({ tex: `n = ${cubicCount(params)}` });
    return steps;
  },
};

interface CubicSignParams extends CubicParams {
  t: number;
}

/**
 * Is the graph of $y = |f(x)|$ reflected at $x = t$?
 *
 * It is when $f(t) < 0$: count the negative brackets, then allow for a minus
 * sign in front, which only difficulty 2 has.
 */
const cubicSignFlow: Generator<CubicSignParams> = {
  id: 'mod-cubic-sign-flow',
  sample: (rng, difficulty) =>
    drawUntil(
      () => ({ roots: sampleCubicRoots(rng), s: difficulty > 1 && rng.chance(0.5) ? (-1 as const) : (1 as const), t: rng.int(-5, 5) }),
      ({ roots, t }) => !roots.includes(t),
      { roots: [-2, 1, 3], s: 1, t: 0 },
    ),
  render: (params): Slide => {
    const { roots, s, t } = params;
    const negative = roots.filter((root) => t < root).length;
    const reflected = 'Then $f(x)$ is negative there, so this part of the curve has been reflected up.';
    const kept = 'Then $f(x)$ is positive there, so this part of the curve is $y = f(x)$ unchanged.';
    return {
      kind: 'flow',
      prompt: [
        {
          kind: 'prose',
          text: `Above $x = ${t}$, is the graph of $y = ${absTex('f(x)')}$ the curve $y = f(x)$ itself, or its reflection? Here $f(x) = ${cubicTex(params)}$.`,
        },
      ],
      subject: `f(${t}) = ${cubicTex(params).replace(/x/g, `(${t})`)}`,
      steps: [
        {
          id: 'brackets',
          ask: `At $x = ${t}$, how many of the three brackets are negative?`,
          branches: [
            { label: COUNT_LABEL[0], to: 'even' },
            { label: COUNT_LABEL[1], to: 'odd' },
            { label: COUNT_LABEL[2], to: 'even' },
            { label: COUNT_LABEL[3], to: 'odd' },
          ],
        },
        {
          id: 'even',
          ask: 'So the product of the brackets is positive. Is there a minus sign in front of it?',
          branches: [
            { label: YES, outcome: reflected },
            { label: NO, outcome: kept },
          ],
        },
        {
          id: 'odd',
          ask: 'So the product of the brackets is negative. Is there a minus sign in front of it?',
          branches: [
            { label: YES, outcome: kept },
            { label: NO, outcome: reflected },
          ],
        },
      ],
      answer: [COUNT_LABEL[negative], s < 0 ? YES : NO],
    };
  },
  solution: (params) => {
    const { roots, s, t } = params;
    const value = s * productOf(roots)(t);
    const negative = roots.filter((root) => t < root);
    return [
      {
        text:
          negative.length === 0
            ? `At $x = ${t}$ no bracket is negative, since $${t}$ is to the right of every root.`
            : `At $x = ${t}$ the bracket${negative.length === 1 ? '' : 's'} for the root${negative.length === 1 ? '' : 's'} $${negative.join(', ')}$ ${negative.length === 1 ? 'is' : 'are'} negative, since $${t}$ is to the left of ${negative.length === 1 ? 'it' : 'them'}.`,
      },
      { tex: `f(${t}) = ${value}` },
      { text: value < 0 ? 'Negative, so the curve is reflected there.' : 'Positive, so the curve is unchanged there.' },
    ];
  },
};

/* ---------- Lesson 5: |f(x)| < c and |f(x)| > c ---------- */

interface DipIneqParams extends DipParams {
  op: Op;
  min: number;
  max: number;
}

/**
 * Where $|f(x)|$ op $c$, as pieces. Less than is where the curve is under the
 * line: between the outer crossings, less the top of the hump when the line
 * cuts it. Greater than is the rest. Rows where the line only touches the
 * hump are never drawn here, since $\ge$ there would add a lone point.
 */
function dipSet({ m, outer, inner }: DipParams, op: Op): Piece[] {
  const closed = !isStrict(op);
  const [lo, hi] = [m - outer, m + outer];
  if (!pointsRight(op)) {
    if (inner === null) return [spanPiece(lo, hi, closed, closed)];
    return [spanPiece(lo, m - inner, closed, closed), spanPiece(m + inner, hi, closed, closed)];
  }
  const rays = [spanPiece(-Infinity, lo, false, closed), spanPiece(hi, Infinity, closed, false)];
  if (inner === null) return rays;
  return [...rays, spanPiece(m - inner, m + inner, closed, closed)];
}

function sampleDipIneq(rng: Rng, difficulty: number, accept: (row: DipRow) => boolean = () => true): DipIneqParams {
  const params = sampleDip(rng, difficulty, (row) => row.inner !== 0 && row.outer <= 5 && accept(row), 6);
  const op = rng.pick<Op>(difficulty > 1 ? OPS : ['<', '>']);
  return { ...params, op, ...windowFor(rng, params.m - params.outer, params.m + params.outer, 12, 1) };
}

function dipIneqSolution(params: DipIneqParams): SolutionStep[] {
  const { c, op, inner, h } = params;
  const set = dipSet(params, op);
  const cases = dipSolution(params).slice(1, -1);
  return [
    { tex: dipEquationTex(params, op) },
    { text: 'The critical values are where the curve meets the line: solve the equation first.' },
    ...cases,
    {
      text: pointsRight(op)
        ? `Greater than is where the curve is above the line $y = ${c}$: outside the outer crossings${inner === null ? '' : ', and over the top of the hump'}.`
        : `Less than is where the curve is below the line $y = ${c}$: between the outer crossings${inner === null ? `, since the hump only reaches $${h}$` : ', except over the top of the hump'}.`,
      tex: setTex(set),
    },
    { text: describeSet(set) },
  ];
}

/**
 * Shade $|f(x)|$ op $c$.
 *
 * Up to two stretches for less than, and up to three for greater than when
 * the line cuts the hump. Difficulty 1 keeps to strict signs and vertex form;
 * difficulty 2 includes the ends sometimes and writes $f$ out in full.
 */
const quadIneqLine: Generator<DipIneqParams> = {
  id: 'mod-quad-ineq-line',
  sample: (rng, difficulty) => sampleDipIneq(rng, difficulty),
  render: (params): Slide => ({
    kind: 'numberLine',
    prompt: [
      { kind: 'prose', text: 'Solve, then shade the solution set.' },
      { kind: 'display', tex: dipEquationTex(params, params.op) },
    ],
    min: params.min,
    max: params.max,
    step: 1,
    answer: setOf(dipSet(params, params.op)),
  }),
  solution: dipIneqSolution,
};

const STRETCH_TWO = 'Two stretches: under the line except over the top of the hump.';
const STRETCH_ONE = 'One stretch, between the outer crossings: the whole hump is under the line.';
const STRETCH_THREE = 'Three pieces: both outer arms, and the top of the hump in the middle.';
const STRETCH_RAYS = 'Two rays, outside the outer crossings: the hump never gets above the line.';

/**
 * What shape the solution set of $|f(x)|$ op $c$ takes, before any algebra.
 *
 * Less or greater, then whether the line cuts the reflected hump. Difficulty
 * 1 draws the curve and the line; difficulty 2 does not, so the height of the
 * hump has to come from completing the square.
 */
const quadIneqFlow: Generator<DipIneqParams> = {
  id: 'mod-quad-ineq-flow',
  sample: (rng, difficulty) => sampleDipIneq(rng, difficulty),
  render: (params): Slide => {
    const { c, h, op, inner } = params;
    const f = dipAt(params);
    const prompt: Block[] = [{ kind: 'prose', text: 'Before solving: what shape is the solution set?' }];
    if (!params.expanded) {
      prompt.push({
        kind: 'diagram',
        svg: modPlot([{ f: (x) => Math.abs(f(x)), accent: true }], -2, Math.max(h, c) + 3, 'The curve y = |f(x)| and a dashed horizontal line', [], [c]),
      });
    }
    const cuts = inner !== null;
    return {
      kind: 'flow',
      prompt,
      subject: dipEquationTex(params, op),
      steps: [
        {
          id: 'relation',
          ask: `Is the modulus asked to be less than $${c}$, or greater?`,
          branches: [
            { label: SHAPE_LESS, to: 'less' },
            { label: SHAPE_MORE, to: 'more' },
          ],
        },
        {
          id: 'less',
          ask: `Does the line $y = ${c}$ cut through the reflected hump? That is, is $${c}$ less than the height of its top?`,
          branches: [
            { label: YES, outcome: STRETCH_TWO },
            { label: NO, outcome: STRETCH_ONE },
          ],
        },
        {
          id: 'more',
          ask: `Does the line $y = ${c}$ cut through the reflected hump? That is, is $${c}$ less than the height of its top?`,
          branches: [
            { label: YES, outcome: STRETCH_THREE },
            { label: NO, outcome: STRETCH_RAYS },
          ],
        },
      ],
      answer: [pointsRight(op) ? SHAPE_MORE : SHAPE_LESS, cuts ? YES : NO],
    };
  },
  solution: (params) => {
    const { m, h, c, op, inner, expanded } = params;
    const steps: SolutionStep[] = [];
    if (expanded) steps.push({ text: 'Complete the square.', tex: `f(x) = ${squareTex(m)} ${signedTile(-h)}` });
    steps.push({ text: `The dip of $f$ goes down to $${-h}$, so the reflected hump has its top at height $${h}$.` });
    steps.push({ text: `$${c}$ is ${inner !== null ? 'less' : 'more'} than $${h}$, so the line ${inner !== null ? 'cuts through' : 'passes over'} the hump.` });
    steps.push({ tex: setTex(dipSet(params, op)) });
    return steps;
  },
};

/**
 * The four critical values of $|f(x)|$ op $c$ in a tree: what the square is
 * in each case, then the roots of each. Only rows where the line cuts the
 * hump, so both cases give two.
 */
const criticalTree: Generator<DipIneqParams> = {
  id: 'mod-critical-tree',
  sample: (rng, difficulty) => {
    const params = sampleDip(rng, difficulty, (row) => (row.inner ?? 0) > 0, 9);
    return { ...params, op: rng.pick(OPS), min: 0, max: 0 };
  },
  render: (params): Slide => {
    const { m, h, c, outer, op } = params;
    const inner = params.inner ?? 0;
    const sq = squareTex(m);
    const answer = [h + c, h - c, m - outer, m + outer, m - inner, m + inner].map(String);
    return {
      kind: 'tree',
      prompt: [
        {
          kind: 'prose',
          text: `Find the critical values, from $f(x) = ${c}$ and $f(x) = ${-c}$. Top row: what $${sq}$ equals in each case, $${c}$ first. Below each: its two roots, smaller first.`,
        },
      ],
      expression: dipEquationTex(params, op),
      nodes: [
        { id: 'plus', from: [] },
        { id: 'minus', from: [] },
        { id: 'plus-lo', from: ['plus'] },
        { id: 'plus-hi', from: ['plus'] },
        { id: 'minus-lo', from: ['minus'] },
        { id: 'minus-hi', from: ['minus'] },
      ],
      bank: treeBank(answer, [c - h, -m - outer, -m + outer, m - (h + c)], m),
      answer,
    };
  },
  solution: (params) => dipSolution(params).slice(0, -1),
};

type TilesShape = 'two' | 'one' | 'rays';

/**
 * The solution set of $|f(x)|$ op $c$ from tiles, in whichever shape it
 * takes: two stretches, one stretch, or two rays. The three-piece set of
 * greater than, when the line cuts the hump, is left to the number line,
 * since it runs off the edge of a phone as one line of tiles.
 */
const quadIneqTiles: Generator<DipIneqParams> = {
  id: 'mod-quad-ineq-tiles',
  sample: (rng, difficulty) =>
    drawUntil(
      () => sampleDipIneq(rng, difficulty),
      (params) => !(pointsRight(params.op) && params.inner !== null),
      { ...DIPS[9], m: 0, expanded: difficulty > 1, op: '<', min: -3, max: 9 },
    ),
  render: (params): Slide => {
    const { m, h, c, outer, inner, op } = params;
    const lt = le(!isStrict(op));
    const gt = isStrict(op) ? '>' : '\\ge';
    const shape: TilesShape = pointsRight(op) ? 'rays' : inner === null ? 'one' : 'two';
    const values =
      shape === 'two' ? [m - outer, m - (inner ?? 0), m + (inner ?? 0), m + outer] : [m - outer, m + outer];
    const template =
      shape === 'two'
        ? `{0} ${lt} x ${lt} {1} \\text{ or } {2} ${lt} x ${lt} {3}`
        : shape === 'one'
          ? `{0} ${lt} x ${lt} {1}`
          : `x ${lt} {0} \\text{ or } x ${gt} {1}`;
    const answer = values.map(numberTile);
    const spare = [m - outer - 1, m + outer + 1, -m + outer, -m - outer, m - h, m + h, c, -c, m - 1, m + 1];
    return {
      kind: 'tiles',
      prompt: [
        { kind: 'prose', text: 'Solve. Place the ends of the solution set, smallest first.' },
        { kind: 'display', tex: dipEquationTex(params, op) },
      ],
      template,
      bank: bankOf(answer, [...new Set(spare.map(numberTile))].filter((tile) => !answer.includes(tile)).slice(0, 4)),
      answer,
    };
  },
  solution: dipIneqSolution,
};

/* ======================================================================
 * Level 5: Regions with Modulus
 *
 * A modulus inequality in $x$ and $y$ is a region of the plane, bounded by a
 * V or an upside-down V. Every boundary here is $y = s \cdot m|x - a| + c$
 * with the vertex $(a, c)$ and the steepness $m$ drawn first, so the vertex is
 * a lattice point; an upside-down V's $x$-intercepts $a \pm \frac{c}{m}$ are
 * whole because $c$ is drawn a multiple of $m$, and a V of steepness $2$ has
 * an even $c$ for the same reason.
 *
 * A region between two graphs is a V below and an upside-down V above,
 * $c + |x - a| \le y \le k - |x - b|$. Both have steepness $1$, so their arms
 * meet at right angles and the region is a rectangle: in $u = x + y$,
 * $v = y - x$ it is $c + a \le u \le k + b$, $c - a \le v \le k - b$, which is
 * why it is empty exactly when $k - c < |a - b|$, a square exactly when
 * $a = b$, and why $k - c + a + b$ is drawn even: that makes the two side
 * corners whole. The one exception is the kite, a V of steepness $2$ under an
 * upside-down V of steepness $1$ on the same vertical line, with $k - c$ a
 * multiple of $3$ so its side corners are whole as well.
 *
 * No widget shades the plane, so a question draws a region as Linear
 * Equations does (`regionSvg` there): squared paper, each boundary a curve,
 * dashed exactly when its inequality is strict, and a dot for the point in
 * question. Teaching slides add a fill through `modRegionSvg`.
 *
 * An inequality is never typed, since the checker compares values: a rule or
 * a pair of rules goes through tiles, choice or flow, and `expression` is kept
 * for a count or a width. Nothing here is calculus, so no slide declares
 * `source`; the independent check is `inequalitiesModulus.test.ts`, which
 * reads each inequality off the TeX the learner sees and tests every lattice
 * point against it.
 * ==================================================================== */

/** One boundary and its side: $y$ op $s \cdot m|x - a| + c$. */
export interface ModEdge {
  /** 1 for a V, -1 for an upside-down V. */
  s: 1 | -1;
  /** The steepness of the arms. */
  m: number;
  /** The vertex, $(a, c)$. */
  a: number;
  c: number;
  /** The sign as $y$ reads it: `>=` is the region above a V, solid. */
  op: Op;
  /** Written the other way round, modulus first: $|x - 2| + 1 < y$. */
  turned: boolean;
}

type Pt = [number, number];

const edgeAt = ({ s, m, a, c }: ModEdge) => (x: number) => s * m * Math.abs(x - a) + c;

/** The boundary's right-hand side: `\lvert x - 2 \rvert + 1`, `3 - 2\lvert x + 1 \rvert`. */
function edgeRhs({ s, m, a, c }: Pick<ModEdge, 's' | 'm' | 'a' | 'c'>): string {
  const abs = `${m === 1 ? '' : m}${absLin(1, -a)}`;
  if (s > 0) return c === 0 ? abs : `${abs} ${signedTile(c)}`;
  return c === 0 ? `-${abs}` : `${c} - ${abs}`;
}

/** The inequality as the learner reads it. */
const edgeTex = (e: ModEdge) =>
  e.turned ? `${edgeRhs(e)} ${OP_TEX[FLIP[e.op]]} y` : `y ${OP_TEX[e.op]} ${edgeRhs(e)}`;

/** The same inequality with $y$ first, for working it through. */
const edgeYTex = (e: ModEdge) => edgeTex({ ...e, turned: false });

/** Whether a region lies above its boundary. */
const aboveEdge = (e: ModEdge) => pointsRight(e.op);

function inEdge(e: ModEdge, [x, y]: Pt): boolean {
  const h = edgeAt(e)(x);
  if (e.op === '<') return y < h;
  if (e.op === '<=') return y <= h;
  if (e.op === '>') return y > h;
  return y >= h;
}

const onEdge = (e: ModEdge, [x, y]: Pt) => edgeAt(e)(x) === y;
const inAll = (edges: readonly ModEdge[], p: Pt) => edges.every((e) => inEdge(e, p));
const onAny = (edges: readonly ModEdge[], p: Pt) => edges.some((e) => onEdge(e, p));

const ptTex = ([x, y]: Pt) => `(${x}, ${y})`;

/** Every lattice point of the drawn window. */
const LATTICE: Pt[] = range(-6, 6).flatMap((x) => range(-6, 6).map((y): Pt => [x, y]));

/** The inequalities of a region, one per line. */
const edgesTex = (edges: readonly ModEdge[]) =>
  edges.length === 1 ? edgeTex(edges[0]) : `\\begin{gathered} ${edges.map(edgeTex).join(' \\\\ ')} \\end{gathered}`;

const shapeWord = (e: ModEdge) => (e.s > 0 ? 'V' : 'upside-down V');
const lineWord = (e: ModEdge) => (isStrict(e.op) ? 'dashed' : 'solid');

/* ---------- The picture ---------- */

/** Square, so arms of gradient 1 and -1 are seen to meet at right angles. */
const REGION_HEIGHT_5 = 280;
/** `plotSvg`'s own width and inset, which the fill has to agree with. */
const PLOT_WIDTH = 280;
const PLOT_PAD = 12;

/**
 * The region as a filled outline, column by column: from the highest floor
 * to the lowest ceiling wherever the one is below the other. Sampled every
 * eighth of a unit, which lands on every vertex and every corner, since those
 * are whole.
 */
function shadePath(edges: readonly ModEdge[]): string {
  const px = (x: number) => PLOT_PAD + ((x + 6) / 12) * (PLOT_WIDTH - 2 * PLOT_PAD);
  const py = (y: number) => PLOT_PAD + ((6 - y) / 12) * (REGION_HEIGHT_5 - 2 * PLOT_PAD);
  const floor = (x: number) => Math.max(-6, ...edges.filter(aboveEdge).map((e) => edgeAt(e)(x)));
  const ceiling = (x: number) => Math.min(6, ...edges.filter((e) => !aboveEdge(e)).map((e) => edgeAt(e)(x)));
  const runs: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i <= 96; i += 1) {
    const x = -6 + i / 8;
    if (floor(x) < ceiling(x)) run.push(x);
    else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs
    .filter((xs) => xs.length > 1)
    .map((xs) => {
      const top = xs.map((x) => `${px(x).toFixed(1)},${py(ceiling(x)).toFixed(1)}`);
      const bottom = [...xs].reverse().map((x) => `${px(x).toFixed(1)},${py(floor(x)).toFixed(1)}`);
      return `M ${[...top, ...bottom].join(' L ')} Z`;
    })
    .join(' ');
}

/**
 * A region on squared paper from $-6$ to $6$ each way: each boundary a curve,
 * dashed exactly when its inequality is strict. `dot` marks a point, and
 * `shade` fills the region, spliced in straight after the opening tag so the
 * boundaries draw over its edge.
 */
export function modRegionSvg(
  edges: readonly ModEdge[],
  opts: { label: string; dot?: Pt; shade?: boolean; vertical?: number; horizontal?: number },
): string {
  const svg = plotSvg({
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6,
    height: REGION_HEIGHT_5,
    grid: true,
    curves: edges.map((e) => ({ f: edgeAt(e), dashed: isStrict(e.op) })),
    marks: opts.dot ? [{ x: opts.dot[0], y: opts.dot[1] }] : [],
    verticals: opts.vertical === undefined ? [] : [{ x: opts.vertical }],
    horizontals: opts.horizontal === undefined ? [] : [opts.horizontal],
    label: opts.label,
  });
  if (!opts.shade) return svg;
  const open = svg.indexOf('>') + 1;
  return `${svg.slice(0, open)}<path class="plot-shade" d="${shadePath(edges)}" />${svg.slice(open)}`;
}

function regionLabel(edges: readonly ModEdge[], dot?: Pt): string {
  const parts = edges.map((e) => `a ${lineWord(e)} ${shapeWord(e)} with its vertex at (${e.a}, ${e.c})`);
  return `${parts.join(' and ')}${dot ? `, with a dot at (${dot[0]}, ${dot[1]})` : ''}`;
}

const regionDiagram = (edges: readonly ModEdge[], dot?: Pt): Block => ({
  kind: 'diagram',
  svg: modRegionSvg(edges, { dot, label: regionLabel(edges, dot) }),
});

/* ---------- Drawing boundaries ---------- */

/** A V whose vertex sits low in the window; steepness 2 only with an even c. */
function drawV(rng: Rng, hard: boolean): Pick<ModEdge, 's' | 'm' | 'a' | 'c'> {
  const m = hard && rng.chance(0.35) ? 2 : 1;
  const c = m === 2 ? rng.pick([-4, -2, 0, 2]) : rng.int(hard ? -4 : -3, 2);
  return { s: 1, m, a: rng.int(-3, 3), c };
}

/** An upside-down V whose x-intercepts $a \pm \frac{c}{m}$ are whole and on the window. */
function drawCap(rng: Rng, hard: boolean): Pick<ModEdge, 's' | 'm' | 'a' | 'c'> {
  return drawUntil(
    () => {
      const m = hard && rng.chance(0.35) ? 2 : 1;
      return { s: -1 as const, m, a: rng.int(-3, 3), c: m * rng.int(1, m === 1 ? 5 : 3) };
    },
    ({ m, a, c }) => Math.abs(a) + c / m <= 6,
    { s: -1, m: 1, a: 0, c: 3 },
  );
}

/** A sign: `natural` is the side a V or an upside-down V usually bounds. */
function drawOp(rng: Rng, s: 1 | -1, natural: number): Op {
  const wanted: Op[] = s > 0 ? ['>', '>='] : ['<', '<='];
  return rng.chance(natural) ? rng.pick(wanted) : rng.pick(wanted.map((op) => FLIP[op]));
}

function drawEdge(rng: Rng, s: 1 | -1, hard: boolean, natural = hard ? 0.7 : 0.85): ModEdge {
  return {
    ...(s > 0 ? drawV(rng, hard) : drawCap(rng, hard)),
    op: drawOp(rng, s, natural),
    turned: hard && rng.chance(0.4),
  };
}

/** A lattice point well inside the window, strictly inside or outside a region. */
function pickPoint(rng: Rng, edges: readonly ModEdge[], inside: boolean, avoid: readonly ModEdge[] = edges): Pt | undefined {
  const pool = LATTICE.filter(
    (p) => Math.abs(p[0]) <= 5 && Math.abs(p[1]) <= 5 && !onAny(avoid, p) && inAll(edges, p) === inside,
  );
  return pool.length > 0 ? rng.pick(pool) : undefined;
}

/** Why a point is in a region or not, one boundary at a time. */
function tryEdge(e: ModEdge, [x, y]: Pt): SolutionStep {
  const h = edgeAt(e)(x);
  const ok = inEdge(e, [x, y]);
  return {
    text: `$${edgeYTex(e)}$: at $x = ${x}$ the boundary is at height $${h}$, and $${y} ${OP_TEX[e.op]} ${h}$ is ${ok ? 'true' : 'false'}.`,
  };
}

/** How to read a strict or inclusive sign on the picture. */
const dashNote = (e: ModEdge) =>
  isStrict(e.op)
    ? `The sign is strict, so the ${shapeWord(e)} is **dashed**: points on it are left out.`
    : `The sign includes equality, so the ${shapeWord(e)} is **solid**: points on it are in.`;

/* ---------- Lesson 1: above or below a V ---------- */

const T_SOLID = '\\text{solid}';
const T_DASHED = '\\text{dashed}';
const T_ABOVE = '\\text{above}';
const T_BELOW = '\\text{below}';

/**
 * Read a region off its inequality: where the V turns, whether it is drawn
 * solid or dashed, and which side is in. Difficulty 2 has steeper Vs and
 * writes some with the modulus first, where the side has to be read from
 * $y$'s end of the sign.
 */
const regionVertexTiles: Generator<ModEdge> = {
  id: 'mod-region-vertex-tiles',
  sample: (rng, difficulty) => drawEdge(rng, 1, difficulty > 1),
  render: (e): Slide => {
    const answer = [`${e.a}`, `${e.c}`, isStrict(e.op) ? T_DASHED : T_SOLID, aboveEdge(e) ? T_ABOVE : T_BELOW];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'This region is bounded by a V. Place the vertex, whether the V is drawn solid or dashed, and which side of it is the region.',
        },
        { kind: 'display', tex: edgeTex(e) },
      ],
      template: '\\text{vertex } ({0}, {1}) \\quad {2} \\text{, region } {3}',
      bank: bankOf(answer, [`${-e.a}`, `${-e.c}`, `${e.a + 1}`, `${e.c - 1}`, T_SOLID, T_DASHED, T_ABOVE, T_BELOW]),
      answer,
    };
  },
  solution: (e) => [
    { text: `The modulus is zero at $x = ${e.a}$, so the V turns there, at height $${e.c}$: the vertex is $(${e.a}, ${e.c})$.` },
    ...(e.turned ? [{ text: 'Read it from $y$\'s side first.', tex: edgeYTex(e) }] : []),
    { text: dashNote(e) },
    { text: `$y$ is asked to be ${aboveEdge(e) ? 'greater' : 'less'} than the V's height, so the region is **${aboveEdge(e) ? 'above' : 'below'}** it.` },
  ],
};

interface TestParams extends ModEdge {
  point: Pt;
}

/**
 * Test a point by working the boundary's height out at its $x$: the inside,
 * its modulus, the height, then how far the point is above it. A point left
 * of the vertex has a negative inside, which is where the modulus matters.
 */
function pointTestTree(id: string, s: 1 | -1): Generator<TestParams> {
  const shape = s > 0 ? 'V' : 'upside-down V';
  return {
    id,
    sample: (rng, difficulty) => {
      const hard = difficulty > 1;
      return drawUntil(
        () => {
          const e = drawEdge(rng, s, hard);
          const x = rng.chance(0.5) ? rng.int(-6, e.a - 1) : rng.int(e.a + 1, 6);
          return { ...e, point: [x, rng.int(-6, 6)] as Pt };
        },
        (p) => p.point[0] >= -6 && p.point[0] <= 6 && Math.abs(edgeAt(p)(p.point[0])) <= 9,
        { s, m: 1, a: 1, c: s > 0 ? -1 : 3, op: s > 0 ? '>' : '<=', turned: false, point: [-2, 1] },
      );
    },
    render: (p): Slide => {
      const [x, y] = p.point;
      const inside = x - p.a;
      const h = edgeAt(p)(x);
      const answer = [`${inside}`, `${Math.abs(inside)}`, `${h}`, `${y - h}`];
      return {
        kind: 'tree',
        prompt: [
          {
            kind: 'prose',
            text: `Is $${ptTex(p.point)}$ in this region? At $x = ${x}$, fill in the inside of the modulus, then the modulus, then the height of the ${shape}, then how far $y = ${y}$ is above that height (negative if below).`,
          },
        ],
        expression: edgeTex(p),
        nodes: [
          { id: 'inside', from: [] },
          { id: 'abs', from: ['inside'] },
          { id: 'height', from: ['abs'] },
          { id: 'gap', from: ['height'] },
        ],
        bank: treeBank(answer, [-inside, -h, h - y, h + p.s], h),
        answer,
      };
    },
    solution: (p) => {
      const [x, y] = p.point;
      const h = edgeAt(p)(x);
      const ok = inEdge(p, p.point);
      return [
        { text: `At $x = ${x}$ the inside is $${x} ${signedTile(-p.a)} = ${x - p.a}$, and its modulus is $${Math.abs(x - p.a)}$.` },
        { text: `So the ${shape} is at height $${h}$ there, and $y = ${y}$ is $${y - h}$ from it.` },
        {
          text:
            y === h
              ? `The point is on the boundary, which is ${lineWord(p)}: it is ${ok ? '' : '**not** '}in the region.`
              : `The point is ${y > h ? 'above' : 'below'} the ${shape}, and the region is ${aboveEdge(p) ? 'above' : 'below'} it: the point is ${ok ? '' : '**not** '}in the region.`,
          tex: `${y} ${OP_TEX[p.op]} ${h} \\text{ is ${ok ? 'true' : 'false'}}`,
        },
      ];
    },
  };
}

const regionTestTree = pointTestTree('mod-region-test-tree', 1);

interface PointChoiceParams {
  edges: ModEdge[];
  point: Pt;
  wrong: Pt[];
}

/**
 * Three points that are not in the region: one on a dashed boundary when
 * there is one, which is the tempting wrong answer, one just past the
 * boundary from the right answer, and the rest from anywhere outside.
 */
function wrongPoints(rng: Rng, edges: readonly ModEdge[], point: Pt): Pt[] {
  const outside = LATTICE.filter((p) => Math.abs(p[0]) <= 5 && Math.abs(p[1]) <= 5 && !inAll(edges, p));
  const onDashed = outside.filter((p) => edges.some((e) => isStrict(e.op) && onEdge(e, p)));
  const near = outside.filter((p) => p[0] === point[0] || p[1] === point[1]);
  const out: Pt[] = [];
  const add = (p: Pt | undefined) => {
    if (p && !out.some((q) => q[0] === p[0] && q[1] === p[1])) out.push(p);
  };
  if (onDashed.length > 0) add(rng.pick(onDashed));
  if (near.length > 0) add(rng.pick(near));
  for (let tries = 0; out.length < 3 && tries < 50; tries += 1) add(rng.pick(outside));
  return out;
}

function pointChoiceSlide({ edges, point, wrong }: PointChoiceParams): Slide {
  return pickOne(
    [
      { kind: 'prose', text: `Which of these points is in the region${edges.length > 1 ? ' where both hold' : ''}?` },
      { kind: 'display', tex: edgesTex(edges) },
    ],
    ptTex(point),
    wrong.map(ptTex),
  );
}

function pointChoiceSolution({ edges, point, wrong }: PointChoiceParams): SolutionStep[] {
  const [first] = wrong;
  const failed = edges.find((e) => !inEdge(e, first)) ?? edges[0];
  return [
    ...edges.map((e) => tryEdge(e, point)),
    { text: `So $${ptTex(point)}$ is in the region.` },
    { text: `Against that, $${ptTex(first)}$ fails:` },
    tryEdge(failed, first),
  ];
}

/**
 * Which point is in the region above or below a V? When a boundary is dashed
 * one wrong answer sits on it; when it is solid the right answer sometimes
 * does. Difficulty 2 has steeper Vs, regions below them, and the modulus
 * written first.
 */
const regionPointChoice: Generator<PointChoiceParams> = {
  id: 'mod-region-point-choice',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const e = drawEdge(rng, 1, hard, hard ? 0.6 : 0.85);
        const edge = LATTICE.filter((p) => Math.abs(p[0]) <= 5 && Math.abs(p[1]) <= 5 && onEdge(e, p));
        const point = !isStrict(e.op) && edge.length > 0 && rng.chance(0.35) ? rng.pick(edge) : pickPoint(rng, [e], true);
        return { edges: [e], point: point ?? ([0, 0] as Pt), wrong: point ? wrongPoints(rng, [e], point) : [] };
      },
      (p) => p.wrong.length === 3 && inAll(p.edges, p.point),
      { edges: [{ s: 1, m: 1, a: 1, c: -2, op: '>', turned: false }], point: [1, 0], wrong: [[1, -2], [3, 0], [-2, 0]] },
    );
  },
  render: pointChoiceSlide,
  solution: pointChoiceSolution,
};

interface EdgeSliderParams extends ModEdge {
  t: number;
}

/**
 * The lowest (or highest) whole $y$ in the region on a vertical line. The
 * marker lands on the boundary where it is solid and one step inside it where
 * it is dashed, which is the whole question: $y > 3$ does not allow $3$.
 * Sometimes the line is through the vertex, so the marker sits on it.
 */
function edgeSlider(id: string, s: 1 | -1): Generator<EdgeSliderParams> {
  const lowest = s > 0;
  const extreme = (p: EdgeSliderParams) => edgeAt(p)(p.t) + (isStrict(p.op) ? (lowest ? 1 : -1) : 0);
  return {
    id,
    sample: (rng, difficulty) => {
      const hard = difficulty > 1;
      return drawUntil(
        () => {
          const e = drawEdge(rng, s, hard, 1);
          return { ...e, t: rng.chance(0.25) ? e.a : rng.int(-5, 5) };
        },
        (p) => Math.abs(edgeAt(p)(p.t)) <= 5 && Math.abs(extreme(p)) <= 5,
        { s, m: 1, a: 0, c: 0, op: lowest ? '>' : '<', turned: false, t: 2 },
      );
    },
    render: (p): Slide => ({
      kind: 'slider',
      prompt: [
        {
          kind: 'prose',
          text: `The region is $${edgeTex(p)}$. On the dashed line $x = ${p.t}$, slide to the **${lowest ? 'lowest' : 'highest'}** whole-number $y$ that is in the region.`,
        },
      ],
      min: -6,
      max: 6,
      step: 1,
      answer: extreme(p),
      readout: 'y = {v}',
      figure: {
        svg: modRegionSvg([p], { vertical: p.t, label: `${regionLabel([p])}, and a dashed vertical line at x = ${p.t}` }),
        axis: 'y',
        ...markerWindow(-6, 6, 'y', REGION_HEIGHT_5),
      },
    }),
    solution: (p) => {
      const h = edgeAt(p)(p.t);
      return [
        { text: `At $x = ${p.t}$ the boundary is at $${edgeRhs(p).replace(/x/g, `(${p.t})`)} = ${h}$.` },
        {
          text: isStrict(p.op)
            ? `The sign is strict, so $y = ${h}$ itself is left out: the ${lowest ? 'lowest' : 'highest'} whole number is $${extreme(p)}$.`
            : `The sign includes equality, so $y = ${h}$ is in: it is the ${lowest ? 'lowest' : 'highest'}.`,
        },
      ];
    },
  };
}

const lowestSlider = edgeSlider('mod-region-lowest-slider', 1);

/* ---------- Lesson 2: under an upside-down V ---------- */

/**
 * The vertex and the $x$-intercepts of an upside-down V. With steepness $1$
 * the intercepts are $k$ either side of the vertex; difficulty 2 has
 * steepness $2$ as well, where they are only $\frac{k}{2}$ either side, and
 * writes some with the modulus first.
 */
const capInterceptsTiles: Generator<ModEdge> = {
  id: 'mod-cap-intercepts-tiles',
  sample: (rng, difficulty) => drawEdge(rng, -1, difficulty > 1),
  render: (e): Slide => {
    const half = e.c / e.m;
    const answer = [`${e.a}`, `${e.c}`, `${e.a - half}`, `${e.a + half}`];
    return {
      kind: 'tiles',
      prompt: [
        {
          kind: 'prose',
          text: 'The boundary of this region is an upside-down V. Place its vertex, then where it crosses the $x$-axis, the left-hand crossing first.',
        },
        { kind: 'display', tex: edgeTex(e) },
      ],
      template: '\\text{vertex } ({0}, {1}) \\quad x = {2} \\text{ and } x = {3}',
      bank: bankOf(answer, [`${-e.a}`, `${-e.a - half}`, `${-e.a + half}`, `${e.a - e.c}`, `${e.a + e.c}`, `${-e.c}`]),
      answer,
    };
  },
  solution: (e) => {
    const half = e.c / e.m;
    return [
      { text: `The modulus is zero at $x = ${e.a}$, where the height is $${e.c}$: the vertex is $(${e.a}, ${e.c})$, the top of the upside-down V.` },
      { text: 'It crosses the $x$-axis where the height is zero.', tex: `${edgeRhs(e)} = 0` },
      { tex: `${e.m === 1 ? '' : e.m}${absLin(1, -e.a)} = ${e.c}${e.m === 1 ? '' : ` \\quad \\Rightarrow \\quad ${absLin(1, -e.a)} = ${half}`}` },
      { text: `So $x = ${e.a} - ${half} = ${e.a - half}$ or $x = ${e.a} + ${half} = ${e.a + half}$.` },
    ];
  },
};

const capTestTree = pointTestTree('mod-cap-test-tree', -1);

const highestSlider = edgeSlider('mod-region-highest-slider', -1);

const O_ABOVE = 'Above the origin';
const O_THROUGH = 'Through the origin';
const O_BELOW = 'Below the origin';
const R_ABOVE = 'Above it';
const R_BELOW = 'Below it';
const B_YES = 'Yes: the sign is $\\le$ or $\\ge$';
const B_NO = 'No: the sign is $<$ or $>$';
const ORIGIN_IN = 'The origin is in the region.';
const ORIGIN_OUT = 'The origin is not in the region.';

/**
 * Is the origin in the region? Where the boundary is at $x = 0$ first, then
 * which side is in, or, when the boundary runs through the origin, whether
 * the boundary itself counts. Difficulty 2 mixes Vs in and writes some with
 * the modulus first.
 */
const originFlow: Generator<ModEdge> = {
  id: 'mod-origin-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const s = hard && rng.chance(0.4) ? 1 : -1;
    const e = drawEdge(rng, s, hard, hard ? 0.6 : 0.8);
    // A quarter of the time the boundary runs through the origin, which puts
    // the question on whether the boundary counts.
    return rng.chance(0.25) && e.a !== 0 ? { ...e, c: -e.s * e.m * Math.abs(e.a) } : e;
  },
  render: (e): Slide => {
    const h0 = edgeAt(e)(0);
    const side = aboveEdge(e) ? R_ABOVE : R_BELOW;
    const answer = h0 === 0 ? [O_THROUGH, isStrict(e.op) ? B_NO : B_YES] : [h0 > 0 ? O_ABOVE : O_BELOW, side];
    const sideStep = (id: string, originAbove: boolean) => ({
      id,
      ask: 'Is the region above the boundary or below it?',
      branches: [
        { label: R_ABOVE, outcome: originAbove ? ORIGIN_IN : ORIGIN_OUT },
        { label: R_BELOW, outcome: originAbove ? ORIGIN_OUT : ORIGIN_IN },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'Is the origin, $(0, 0)$, in this region?' }],
      subject: edgeTex(e),
      steps: [
        {
          id: 'height',
          ask: 'At $x = 0$, where is the boundary?',
          branches: [
            { label: O_ABOVE, to: 'origin-below' },
            { label: O_THROUGH, to: 'on' },
            { label: O_BELOW, to: 'origin-above' },
          ],
        },
        sideStep('origin-below', false),
        sideStep('origin-above', true),
        {
          id: 'on',
          ask: 'Is the boundary part of the region?',
          branches: [
            { label: B_YES, outcome: ORIGIN_IN },
            { label: B_NO, outcome: ORIGIN_OUT },
          ],
        },
      ],
      answer,
    };
  },
  solution: (e) => {
    const h0 = edgeAt(e)(0);
    const ok = inEdge(e, [0, 0]);
    return [
      { text: `At $x = 0$ the boundary is at $${edgeRhs(e).replace(/x/g, '(0)')} = ${h0}$.` },
      h0 === 0
        ? { text: `It runs through the origin. ${dashNote(e)}` }
        : { text: `That is ${h0 > 0 ? 'above' : 'below'} the origin, and the region is ${aboveEdge(e) ? 'above' : 'below'} the boundary.` },
      { text: ok ? ORIGIN_IN : ORIGIN_OUT, tex: `0 ${OP_TEX[e.op]} ${h0} \\text{ is ${ok ? 'true' : 'false'}}` },
    ];
  },
};

/* ---------- Lesson 3: between two graphs ---------- */

/** A V below and an upside-down V above: $c + m|x - a| \le y \le k - |x - b|$. */
interface Between {
  low: ModEdge;
  high: ModEdge;
}

type BetweenShape = 'square' | 'rectangle' | 'kite' | 'empty';

function between(a: number, c: number, b: number, k: number, lowOp: Op, highOp: Op, m = 1): Between {
  return {
    low: { s: 1, m, a, c, op: lowOp, turned: false },
    high: { s: -1, m: 1, a: b, c: k, op: highOp, turned: false },
  };
}

const edgesOf = ({ low, high }: Between) => [low, high];

/** Where the two boundaries meet, left to right. Every corner drawn here is whole. */
function corners({ low, high }: Between): Pt[] {
  return range(-6, 6)
    .filter((x) => edgeAt(low)(x) === edgeAt(high)(x))
    .map((x): Pt => [x, edgeAt(low)(x)]);
}

/** Which shape the boundaries enclose, from how they were drawn. */
function shapeOf({ low, high }: Between): BetweenShape {
  if (high.c - low.c < low.m * Math.abs(low.a - high.a)) return 'empty';
  if (low.m === 2) return 'kite';
  return low.a === high.a ? 'square' : 'rectangle';
}

function fitsShape(B: Between, shape: BetweenShape, maxGap: number): boolean {
  const { low, high } = B;
  const gap = high.c - low.c;
  if (shapeOf(B) !== shape || gap > maxGap) return false;
  if (shape === 'empty') return gap >= 1 && Math.abs(low.a - high.a) - gap >= 1;
  // Exactly two whole crossings on the window: the side corners. A corner
  // off the lattice is missed by `corners`, which is what rejects it. The top
  // vertex clears the V by two, so no rectangle is a sliver.
  return gap >= Math.abs(low.a - high.a) + 2 && corners(B).length === 2;
}

const BETWEEN_FALLBACK: Record<BetweenShape, Between> = {
  square: between(0, -2, 0, 2, '>=', '<='),
  rectangle: between(0, -2, 1, 3, '>=', '<='),
  kite: between(0, -3, 0, 3, '>=', '<=', 2),
  empty: between(-2, 0, 2, 2, '>=', '<='),
};

/**
 * A region between a V and an upside-down V of the shape asked for. The side
 * corners are whole because $k - c + a + b$ comes out even, which the draw is
 * checked for through `corners` rather than trusted.
 */
function sampleBetween(rng: Rng, shape: BetweenShape, strict: boolean, maxGap = 6): Between {
  const lowOp = (): Op => (strict && rng.chance(0.5) ? '>' : '>=');
  const highOp = (): Op => (strict && rng.chance(0.5) ? '<' : '<=');
  return drawUntil(
    () => {
      const a = rng.int(-2, 2);
      const offsets = shape === 'empty' ? [-4, -3, 3, 4] : shape === 'rectangle' ? [-2, -1, 1, 2] : [0];
      const b = a + rng.pick(offsets);
      return between(a, rng.int(-5, 0), b, rng.int(1, 6), lowOp(), highOp(), shape === 'kite' ? 2 : 1);
    },
    (B) => fitsShape(B, shape, maxGap),
    BETWEEN_FALLBACK[shape],
  );
}

/** One arm of a boundary as a straight line, $y = px + q$, on the given side of its vertex. */
function armOf(e: ModEdge, side: 1 | -1): string {
  const slope = e.s * e.m * side;
  return `y = ${linTex(slope, e.c - slope * e.a)}`;
}

function cornerWorking(B: Between, side: 1 | -1): SolutionStep[] {
  const [left, right] = corners(B);
  const [x, y] = side > 0 ? right : left;
  return [
    {
      text: `The ${side > 0 ? 'right' : 'left'}-hand corner is where the ${side > 0 ? 'right' : 'left'} arms meet: $${armOf(B.low, side)}$ on the V and $${armOf(B.high, side)}$ on the upside-down V.`,
    },
    { text: `They meet at $x = ${x}$, where both are at $y = ${y}$.`, tex: ptTex([x, y]) },
  ];
}

const betweenPrompt = (B: Between, text: string): Block[] => [
  { kind: 'prose', text },
  { kind: 'display', tex: edgesTex(edgesOf(B)) },
];

/**
 * The two side corners of the region between a V and an upside-down V. The
 * top and bottom corners are the vertices, read straight off; the side ones
 * are where the arms cross, as `mod-cross-points` finds two Vs crossing.
 * Difficulty 1 is a square, the vertices one above the other; difficulty 2 a
 * rectangle, where the two sides are no longer mirror images.
 */
const betweenCornersTiles: Generator<Between> = {
  id: 'mod-between-corners-tiles',
  sample: (rng, difficulty) => sampleBetween(rng, difficulty > 1 ? 'rectangle' : 'square', difficulty > 1),
  render: (B): Slide => {
    const [left, right] = corners(B);
    const answer = [left, right].flatMap(([x, y]) => [`${x}`, `${y}`]);
    const { low, high } = B;
    return {
      kind: 'tiles',
      prompt: betweenPrompt(B, 'The region where both hold has four corners. Two are the vertices. Place the other two, the left-hand one first.'),
      template: '({0}, {1}) \\quad \\text{and} \\quad ({2}, {3})',
      bank: bankOf(answer, [`${low.a}`, `${low.c}`, `${high.a}`, `${high.c}`, `${-left[0]}`, `${right[1] + 1}`, `${left[1] - 1}`]),
      answer,
    };
  },
  solution: (B) => [
    { text: `The bottom corner is the V's vertex, $(${B.low.a}, ${B.low.c})$, and the top one the upside-down V's, $(${B.high.a}, ${B.high.c})$.` },
    ...cornerWorking(B, -1),
    ...cornerWorking(B, 1),
  ],
};

interface CornerSliderParams extends Between {
  right: boolean;
}

/** Slide to one side corner, which the marker then sits on. */
const betweenCornerSlider: Generator<CornerSliderParams> = {
  id: 'mod-between-corner-slider',
  sample: (rng, difficulty) => ({
    ...sampleBetween(rng, difficulty > 1 ? 'rectangle' : 'square', difficulty > 1),
    right: rng.chance(0.5),
  }),
  render: (p): Slide => {
    const [left, right] = corners(p);
    return {
      kind: 'slider',
      prompt: betweenPrompt(p, `Slide to the $x$-coordinate of the region's **${p.right ? 'right' : 'left'}-hand** corner, where the two graphs cross.`),
      min: -6,
      max: 6,
      step: 1,
      answer: (p.right ? right : left)[0],
      readout: 'x = {v}',
      figure: {
        svg: modRegionSvg(edgesOf(p), { label: regionLabel(edgesOf(p)) }),
        ...markerWindow(-6, 6),
      },
    };
  },
  solution: (p) => cornerWorking(p, p.right ? 1 : -1),
};

const SHAPE_SQUARE = 'A square';
const SHAPE_RECTANGLE = 'A rectangle that is not a square';
const SHAPE_KITE = 'A kite that is not a square';
const SHAPE_EMPTY = 'Nothing: no point satisfies both';
const SHAPE_LABEL: Record<BetweenShape, string> = {
  square: SHAPE_SQUARE,
  rectangle: SHAPE_RECTANGLE,
  kite: SHAPE_KITE,
  empty: SHAPE_EMPTY,
};

/**
 * What shape the two graphs enclose. Arms of gradient $1$ and $-1$ meet at
 * right angles, so a V and an upside-down V of steepness $1$ make a
 * rectangle, a square when the vertices are one above the other, and nothing
 * when the top vertex is too low to reach over the V. Difficulty 2 adds the
 * kite, a steeper V under the same vertex.
 */
const betweenShape: Generator<Between> = {
  id: 'mod-between-shape',
  sample: (rng, difficulty) => {
    const shapes: BetweenShape[] = difficulty > 1 ? ['square', 'rectangle', 'kite', 'empty'] : ['square', 'rectangle', 'rectangle', 'empty'];
    return sampleBetween(rng, rng.pick(shapes), false);
  },
  render: (B): Slide => {
    const correct = SHAPE_LABEL[shapeOf(B)];
    return pickOne(
      betweenPrompt(B, 'What shape is the region where both of these hold?'),
      correct,
      Object.values(SHAPE_LABEL).filter((label) => label !== correct),
      false,
      edgesTex(edgesOf(B)),
    );
  },
  solution: (B) => {
    const { low, high } = B;
    const shape = shapeOf(B);
    if (shape === 'empty') {
      return [
        { text: `The upside-down V's vertex is $(${high.a}, ${high.c})$. Above $x = ${high.a}$ the V is at $${edgeAt(low)(high.a)}$, higher than that.` },
        { text: 'So the upside-down V is below the V everywhere, and no point is above one and under the other.' },
      ];
    }
    const [left, right] = corners(B);
    const steps: SolutionStep[] = [
      { text: `The corners are the two vertices, $(${low.a}, ${low.c})$ and $(${high.a}, ${high.c})$, and the crossings $${ptTex(left)}$ and $${ptTex(right)}$.` },
    ];
    if (shape === 'kite') {
      return [
        ...steps,
        { text: 'The V has gradients $2$ and $-2$, the upside-down V $1$ and $-1$: the arms do not meet at right angles.' },
        { text: `Both vertices are on $x = ${low.a}$, so the two halves mirror each other: a kite.` },
      ];
    }
    return [
      ...steps,
      { text: 'Every arm has gradient $1$ or $-1$, so neighbouring sides meet at right angles: a rectangle.' },
      {
        text:
          shape === 'square'
            ? `Both vertices are on $x = ${low.a}$, so all four sides are the same length: a square.`
            : 'The vertices are not one above the other, so one pair of sides is longer than the other.',
      },
    ];
  },
};

/* ---------- Lesson 4: reading a region ---------- */

/** A single boundary for reading off a picture, and a dot well inside the region. */
interface ReadParams {
  edges: ModEdge[];
  dot: Pt;
}

function sampleRead(rng: Rng, difficulty: number): ReadParams {
  const hard = difficulty > 1;
  return drawUntil(
    () => {
      const edges = hard
        ? edgesOf(sampleBetween(rng, rng.pick(['square', 'rectangle']), true, 6))
        : [{ ...drawEdge(rng, rng.chance(0.5) ? 1 : -1, false, 0.7), turned: false }];
      return { edges, dot: pickPoint(rng, edges, true) ?? ([9, 9] as Pt) };
    },
    ({ edges, dot }) => dot[0] !== 9 && inAll(edges, dot),
    { edges: [{ s: 1, m: 1, a: 1, c: -2, op: '>=', turned: false }], dot: [1, 2] },
  );
}

/** Right-hand sides a slip gives: the vertex's $x$ read with its sign turned, the height's, or the V the wrong way up. */
function slipRhs(e: ModEdge): string[] {
  const out = [
    edgeRhs({ ...e, a: -e.a }),
    edgeRhs({ ...e, c: -e.c }),
    edgeRhs({ ...e, s: e.s > 0 ? -1 : 1 }),
    edgeRhs({ ...e, a: e.a + 1 }),
  ];
  return out.filter((tex) => tex !== edgeRhs(e));
}

function readWorking({ edges, dot }: ReadParams): SolutionStep[] {
  const steps: SolutionStep[] = [];
  for (const e of edges) {
    steps.push(
      {
        text: `The ${shapeWord(e)} has its vertex at $(${e.a}, ${e.c})$${e.m === 1 ? '' : ` and arms of gradient $\\pm ${e.m}$`}: $y = ${edgeRhs(e)}$.`,
      },
      {
        text: `The dot is ${aboveEdge(e) ? 'above' : 'below'} it and it is ${lineWord(e)}, so the sign is $${OP_TEX[e.op]}$.`,
        tex: edgeTex(e),
      },
    );
  }
  const checks = edges.map((e) => `$${dot[1]} ${OP_TEX[e.op]} ${edgeAt(e)(dot[0])}$`).join(' and ');
  steps.push({ text: `Check with the dot, $${ptTex(dot)}$: ${checks} ${edges.length > 1 ? 'both hold' : 'holds'}.` });
  return steps;
}

const readPrompt = (p: ReadParams, text: string): Block[] => [{ kind: 'prose', text }, regionDiagram(p.edges, p.dot)];

/**
 * Build the inequality from the picture. The dot says which side is the
 * region and the line says whether the boundary is in; the slips offered
 * read the vertex with a sign turned or the V the wrong way up. Difficulty 2
 * is a region between two graphs, the V first.
 */
const readRegionTiles: Generator<ReadParams> = {
  id: 'mod-read-region-tiles',
  sample: sampleRead,
  render: (p): Slide => {
    const answer = p.edges.flatMap((e) => [OP_TEX[e.op], edgeRhs(e)]);
    const two = p.edges.length > 1;
    return {
      kind: 'tiles',
      prompt: readPrompt(
        p,
        two
          ? 'The dot is in the region, and a dashed line is left out. Build the two inequalities, the V first.'
          : 'The dot is in the region, and a dashed line is left out. Build the inequality.',
      ),
      template: two ? 'y {0} {1} \\quad \\text{and} \\quad y {2} {3}' : 'y {0} {1}',
      bank: bankOf(answer, [...Object.values(OP_TEX), ...p.edges.flatMap(slipRhs).slice(0, 3)]),
      answer,
    };
  },
  solution: readWorking,
};

/** The rule or rules as one choice label, stacked when there are two. */
const rulesTex = (edges: readonly ModEdge[]) => edgesTex(edges);

/**
 * Which rule is this region? The wrong options each change one thing: the
 * line solid for dashed, the side, or the vertex. Difficulty 2 is a region
 * between two graphs.
 */
const readRegionMatch: Generator<ReadParams> = {
  id: 'mod-read-region-match',
  sample: sampleRead,
  render: (p): Slide => {
    const which = hashSeed(rulesTex(p.edges)) % p.edges.length;
    const change = (f: (e: ModEdge) => ModEdge) => rulesTex(p.edges.map((e, idx) => (idx === which ? f(e) : e)));
    return pickOne(
      readPrompt(p, 'The dot is in the region, and a dashed line is left out. Which describes the region?'),
      rulesTex(p.edges),
      [
        change((e) => ({ ...e, op: TOGGLE[e.op] })),
        change((e) => ({ ...e, op: FLIP[e.op] })),
        change((e) => (e.a !== 0 ? { ...e, a: -e.a } : { ...e, c: e.c + (e.s > 0 ? 1 : -1) })),
      ],
    );
  },
  solution: readWorking,
};

type Fault = 'none' | 'dash' | 'side' | 'vertex';

interface CheckParams {
  edges: ModEdge[];
  /** The boundaries as drawn: the real ones, with at most one mistake. */
  drawn: ModEdge[];
  dot: Pt;
  fault: Fault;
}

const CHECK_RIGHT = 'Yes, it is right';
const CHECK_DASH = 'No: solid and dashed are the wrong way round';
const CHECK_SIDE = 'No: the dot is not in the region';
const CHECK_VERTEX = 'No: a vertex is in the wrong place';
const CHECK_LABEL: Record<Fault, string> = { none: CHECK_RIGHT, dash: CHECK_DASH, side: CHECK_SIDE, vertex: CHECK_VERTEX };

/**
 * Does this picture show the region? The dot marks a point meant to be in it.
 * At most one thing is wrong: a boundary solid that should be dashed or the
 * other way, the dot outside the region, or a vertex moved. The dot is kept
 * inside what is drawn whenever the dot is not the mistake, so only one
 * answer is ever right. Difficulty 2 is a region between two graphs.
 */
const regionPictureCheck: Generator<CheckParams> = {
  id: 'mod-region-picture-check',
  sample: (rng, difficulty) => {
    const fault = rng.pick<Fault>(['none', 'dash', 'side', 'vertex']);
    return drawUntil(
      () => {
        const { edges } = sampleRead(rng, difficulty);
        const which = rng.int(0, edges.length - 1);
        const move = (e: ModEdge): ModEdge => {
          if (fault === 'dash') return { ...e, op: TOGGLE[e.op] };
          if (fault !== 'vertex') return e;
          return rng.chance(0.5) && e.a !== 0 ? { ...e, a: -e.a } : { ...e, a: e.a + rng.pick([-1, 1]) };
        };
        const drawn = edges.map((e, idx) => (idx === which ? move(e) : e));
        const everything = [...edges, ...drawn];
        const dot = fault === 'side' ? pickPoint(rng, edges, false, everything) : pickPoint(rng, [...edges, ...drawn], true, everything);
        return { edges, drawn, dot: dot ?? ([9, 9] as Pt), fault };
      },
      (p) => p.dot[0] !== 9,
      { edges: [{ s: 1, m: 1, a: 1, c: -2, op: '>=', turned: false }], drawn: [{ s: 1, m: 1, a: 1, c: -2, op: '>=', turned: false }], dot: [1, 2], fault: 'none' },
    );
  },
  render: (p): Slide =>
    pickOne(
      [
        {
          kind: 'prose',
          text: `Does this picture show the region${p.edges.length > 1 ? ' where both hold' : ''}? The dot is meant to be a point in it.`,
        },
        { kind: 'display', tex: edgesTex(p.edges) },
        regionDiagram(p.drawn, p.dot),
      ],
      CHECK_LABEL[p.fault],
      Object.values(CHECK_LABEL).filter((label) => label !== CHECK_LABEL[p.fault]),
      false,
      `${edgesTex(p.edges)}#${ptTex(p.dot)}`,
    ),
  solution: (p) => {
    const steps: SolutionStep[] = p.edges.map((e) => ({
      text: `$${edgeTex(e)}$ is a ${lineWord(e)} ${shapeWord(e)} with its vertex at $(${e.a}, ${e.c})$.`,
    }));
    const idx = p.edges.findIndex((e, i) => JSON.stringify(e) !== JSON.stringify(p.drawn[i]));
    if (p.fault === 'dash') steps.push({ text: `But the picture draws the ${shapeWord(p.edges[idx])} ${lineWord(p.drawn[idx])}.` });
    if (p.fault === 'vertex') steps.push({ text: `But the picture puts that vertex at $(${p.drawn[idx].a}, ${p.drawn[idx].c})$.` });
    if (p.fault === 'side') steps.push(...p.edges.map((e) => tryEdge(e, p.dot)), { text: 'So the dot is not in the region.' });
    if (p.fault === 'none') steps.push({ text: 'The picture matches, and the dot is in the region.' });
    return steps;
  },
};

const F_V = 'A V';
const F_CAP = 'An upside-down V';
const F_ABOVE = 'Above it';
const F_BELOW = 'Below it';
const F_SOLID = 'Solid';
const F_DASHED = 'Dashed';

/**
 * Walk from the picture to the inequality: which way up the boundary is,
 * which side the dot is on, and whether the line is solid. Every path ends
 * in a different inequality with the same vertex, so a wrong turn is visible.
 * Difficulty 2 has steeper boundaries.
 */
const readRegionFlow: Generator<ModEdge & { dot: Pt }> = {
  id: 'mod-read-region-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => {
        const e = { ...drawEdge(rng, rng.chance(0.5) ? 1 : -1, hard, 0.6), turned: false };
        return { ...e, dot: pickPoint(rng, [e], true) ?? ([9, 9] as Pt) };
      },
      (p) => p.dot[0] !== 9,
      { s: 1, m: 1, a: 1, c: -2, op: '>=', turned: false, dot: [1, 2] },
    );
  },
  render: (p): Slide => {
    const e: ModEdge = { s: p.s, m: p.m, a: p.a, c: p.c, op: p.op, turned: false };
    const outcome = (s: 1 | -1, up: boolean, solid: boolean) => {
      const op: Op = up ? (solid ? '>=' : '>') : solid ? '<=' : '<';
      return `$${edgeTex({ ...e, s, op })}$`;
    };
    const lineStep = (id: string, s: 1 | -1, up: boolean) => ({
      id,
      ask: 'Is the boundary solid or dashed?',
      branches: [
        { label: F_SOLID, outcome: outcome(s, up, true) },
        { label: F_DASHED, outcome: outcome(s, up, false) },
      ],
    });
    const sideStep = (id: string, prefix: string) => ({
      id,
      ask: 'Is the dot above the boundary or below it?',
      branches: [
        { label: F_ABOVE, to: `${prefix}-up` },
        { label: F_BELOW, to: `${prefix}-down` },
      ],
    });
    return {
      kind: 'flow',
      prompt: [{ kind: 'prose', text: 'The dot is in the region, and a dashed line is left out. Which inequality is it?' }, regionDiagram([e], p.dot)],
      subject: `\\text{vertex } (${p.a}, ${p.c})`,
      steps: [
        {
          id: 'shape',
          ask: 'Which way up is the boundary?',
          branches: [
            { label: F_V, to: 'v' },
            { label: F_CAP, to: 'cap' },
          ],
        },
        sideStep('v', 'v'),
        sideStep('cap', 'cap'),
        lineStep('v-up', 1, true),
        lineStep('v-down', 1, false),
        lineStep('cap-up', -1, true),
        lineStep('cap-down', -1, false),
      ],
      answer: [p.s > 0 ? F_V : F_CAP, aboveEdge(e) ? F_ABOVE : F_BELOW, isStrict(e.op) ? F_DASHED : F_SOLID],
    };
  },
  solution: (p) => readWorking({ edges: [{ s: p.s, m: p.m, a: p.a, c: p.c, op: p.op, turned: false }], dot: p.dot }),
};

/* ---------- Lesson 5: points in a region ---------- */

/** Which lattice points of a region between two graphs are in it, column by column. */
function columns(B: Between): { x: number; ys: number[] }[] {
  return range(-6, 6)
    .map((x) => ({ x, ys: range(-6, 6).filter((y) => inAll(edgesOf(B), [x, y])) }))
    .filter((column) => column.ys.length > 0);
}

const countIn = (B: Between) => columns(B).reduce((total, column) => total + column.ys.length, 0);

/**
 * Which point is in the region between two graphs? The wrong ones pass one
 * inequality but not the other, or sit on a dashed boundary. Difficulty 2
 * has rectangles and dashed boundaries.
 */
const pairPointChoice: Generator<PointChoiceParams> = {
  id: 'mod-pair-point-choice',
  sample: (rng, difficulty) =>
    drawUntil(
      () => {
        const edges = edgesOf(sampleBetween(rng, difficulty > 1 ? 'rectangle' : 'square', difficulty > 1));
        const point = pickPoint(rng, edges, true, []);
        const [low, high] = edges;
        const onlyOne = [pickPoint(rng, [low], true), pickPoint(rng, [high], true)].filter(
          (p): p is Pt => p !== undefined && !inAll(edges, p),
        );
        const rest = point ? wrongPoints(rng, edges, point) : [];
        const wrong: Pt[] = [];
        for (const p of [...onlyOne, ...rest]) {
          if (wrong.length < 3 && !wrong.some((q) => q[0] === p[0] && q[1] === p[1])) wrong.push(p);
        }
        return { edges, point: point ?? ([9, 9] as Pt), wrong };
      },
      (p) => p.point[0] !== 9 && p.wrong.length === 3,
      {
        edges: edgesOf(BETWEEN_FALLBACK.square),
        point: [0, 0],
        wrong: [[0, 3], [0, -3], [2, 1]],
      },
    ),
  render: pointChoiceSlide,
  solution: pointChoiceSolution,
};

/**
 * How many lattice points are in the region between two graphs? Counted
 * column by column. A dashed boundary drops the points on it, which is where
 * the count is usually lost. Difficulty 2 has rectangles and dashed lines.
 */
const regionCount: Generator<Between> = {
  id: 'mod-region-count',
  choices: (B) => {
    const n = countIn(B);
    const closed = between(B.low.a, B.low.c, B.high.a, B.high.c, '>=', '<=');
    const open = between(B.low.a, B.low.c, B.high.a, B.high.c, '>', '<');
    return numberChoices(n, [countIn(closed), countIn(open), n + 1], edgesTex(edgesOf(B)));
  },
  sample: (rng, difficulty) =>
    difficulty > 1 ? sampleBetween(rng, 'rectangle', true, 7) : sampleBetween(rng, 'square', rng.chance(0.5), 6),
  render: (B): Slide => ({
    kind: 'expression',
    prompt: [
      ...betweenPrompt(B, 'How many points with whole-number coordinates are in the region where both hold? Call the count $n$.'),
      { kind: 'diagram', svg: modRegionSvg(edgesOf(B), { label: regionLabel(edgesOf(B)) }) },
    ],
    lead: 'n =',
    keypad: [],
    answer: `${countIn(B)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (B) => {
    const cols = columns(B);
    const [first] = cols;
    const words = (ys: number[]) => (ys.length === 1 ? `$y = ${ys[0]}$ only` : `$y = ${ys[0]}$ to $${ys[ys.length - 1]}$`);
    return [
      { text: `Count column by column, from $x = ${cols[0].x}$ to $x = ${cols[cols.length - 1].x}$.` },
      { text: `At $x = ${first.x}$: ${words(first.ys)}, $${first.ys.length}$ point${first.ys.length === 1 ? '' : 's'}.` },
      ...edgesOf(B)
        .filter((e) => isStrict(e.op))
        .map((e) => ({ text: `The ${shapeWord(e)} is dashed, so the points on it are not counted.` })),
      { tex: `${cols.map((column) => column.ys.length).join(' + ')} = ${countIn(B)}` },
    ];
  },
};

interface WidthParams extends Between {
  h: number;
}

/** Where the line $y = h$ is inside the region: an interval, from each boundary in turn. */
function widthAt({ low, high, h }: WidthParams): [number, number] {
  const r1 = (h - low.c) / low.m;
  const r2 = (high.c - h) / high.m;
  return [Math.max(low.a - r1, high.a - r2), Math.min(low.a + r1, high.a + r2)];
}

/**
 * How wide the region is at a given height. The V allows a stretch around
 * its vertex's $x$ and the upside-down V another; the width is their overlap.
 * Difficulty 1 is a square, where the overlap is the narrower of the two;
 * difficulty 2 a rectangle, where it is neither.
 */
const regionWidth: Generator<WidthParams> = {
  id: 'mod-region-width',
  sample: (rng, difficulty) => {
    // Most draws cut the region well away from a corner, where it is wide.
    const least = rng.chance(0.6) ? 4 : 2;
    return drawUntil(
      () => {
        const B = sampleBetween(rng, difficulty > 1 ? 'rectangle' : 'square', false, 9);
        return { ...B, h: rng.int(B.low.c + 1, B.high.c - 1) };
      },
      (p) => {
        const [lo, hi] = widthAt(p);
        return hi - lo >= least && Number.isInteger(lo) && Number.isInteger(hi);
      },
      { ...BETWEEN_FALLBACK.square, h: 0 },
    );
  },
  render: (p): Slide => ({
    kind: 'expression',
    prompt: [
      ...betweenPrompt(p, `How wide is the region at height $y = ${p.h}$? Give the length of the part of the line $y = ${p.h}$ that is inside it.`),
      { kind: 'diagram', svg: modRegionSvg(edgesOf(p), { horizontal: p.h, label: `${regionLabel(edgesOf(p))}, and a dashed line at y = ${p.h}` }) },
    ],
    lead: '\\text{width} =',
    keypad: [],
    answer: `${widthAt(p)[1] - widthAt(p)[0]}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (p) => {
    const { low, high, h } = p;
    const r1 = h - low.c;
    const r2 = high.c - h;
    const [lo, hi] = widthAt(p);
    return [
      {
        text: `Under the upside-down V: $${edgeRhs(high)} \\ge ${h}$ means $${absLin(1, -high.a)} \\le ${r2}$, so $${high.a - r2} \\le x \\le ${high.a + r2}$.`,
      },
      {
        text: `Over the V: $${edgeRhs(low)} \\le ${h}$${low.c === 0 ? '' : ` means $${absLin(1, -low.a)} \\le ${r1}$`}, so $${low.a - r1} \\le x \\le ${low.a + r1}$.`,
      },
      { text: `Both hold from $x = ${lo}$ to $x = ${hi}$: a width of $${hi - lo}$.` },
    ];
  },
};

interface HighestParams extends Between {
  lowest: boolean;
}

/** The highest or lowest lattice point of the region, which is always the only one at that height. */
function extremePoint({ low, high, lowest }: HighestParams): Pt {
  return lowest ? [low.a, low.c + (isStrict(low.op) ? 1 : 0)] : [high.a, high.c - (isStrict(high.op) ? 1 : 0)];
}

/**
 * The highest point of the region with whole-number coordinates: the top
 * vertex when it is solid, one below it when it is dashed. Difficulty 2 asks
 * for the lowest as well, and draws rectangles.
 */
const regionHighestTiles: Generator<HighestParams> = {
  id: 'mod-region-highest-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawUntil(
      () => ({ ...sampleBetween(rng, hard ? 'rectangle' : 'square', true), lowest: hard && rng.chance(0.5) }),
      (p) => p.high.c - p.low.c - Math.abs(p.low.a - p.high.a) >= 2,
      { ...BETWEEN_FALLBACK.square, lowest: false },
    );
  },
  render: (p): Slide => {
    const [x, y] = extremePoint(p);
    const vertex = p.lowest ? p.low : p.high;
    const answer = [`${x}`, `${y}`];
    return {
      kind: 'tiles',
      prompt: betweenPrompt(
        p,
        `Of the points with whole-number coordinates in the region where both hold, which is the **${p.lowest ? 'lowest' : 'highest'}**?`,
      ),
      template: '({0}, {1})',
      bank: bankOf(answer, [`${vertex.c}`, `${vertex.c + 1}`, `${vertex.c - 1}`, `${-vertex.a}`, `${vertex.a + 1}`]),
      answer,
    };
  },
  solution: (p) => {
    const vertex = p.lowest ? p.low : p.high;
    const [x, y] = extremePoint(p);
    return [
      { text: `The region's ${p.lowest ? 'lowest' : 'highest'} corner is the ${shapeWord(vertex)}'s vertex, $(${vertex.a}, ${vertex.c})$.` },
      {
        text: isStrict(vertex.op)
          ? `That boundary is dashed, so the vertex is left out. Straight ${p.lowest ? 'above' : 'below'} it, $(${x}, ${y})$ is in, and every other column stops further ${p.lowest ? 'up' : 'down'}.`
          : 'That boundary is solid, so the vertex itself is in: nothing else reaches that far.',
        tex: ptTex([x, y]),
      },
    ];
  },
};

export const inequalityGenerators = [
  linearLine,
  linearSteps,
  flipFlow,
  readLine,
  greatestInteger,
  andOrLine,
  combineFlow,
  doubleTiles,
  doubleLine,
  orTiles,
  squareLine,
  surdSet,
  methodFlow,
  centreSlider,
  criticalTiles,
  rationalLine,
  signFlow,
  testTree,
  excludedPole,
  intervalTiles,
  readRegion,
  bracketFlow,
  intervalLine,
  integersCount,
  modEvaluate,
  modEvaluateTree,
  asDistance,
  distanceLine,
  pointsTiles,
  vertexSlider,
  matchGraph,
  interceptsTiles,
  armGradientGen,
  linearRoots,
  casesSteps,
  rejectFlow,
  equationRoot,
  modIneqLine,
  modIneqTiles,
  modIneqSplit,
  shapeFlow,
  modIneqCount,
  shiftSlider,
  transformMatch,
  transformTiles,
  transformFlow,
  bothCases,
  bothNegativeSteps,
  bothRoot,
  bothFlow,
  squareFactor,
  squareTree,
  expandSteps,
  squareRoot,
  crossSlider,
  crossPoints,
  crossCount,
  crossFlow,
  bothIneqLine,
  regionFlow,
  endsTiles,
  testPointTree,
  safeFlow,
  safeChoice,
  falseRoot,
  squareCheckSteps,
  absQuadMatch,
  absVertexSlider,
  absValuesTree,
  absSketchFlow,
  fabsMatch,
  fabsArmTiles,
  insideOutTree,
  fabsCountFlow,
  quadEqRoot,
  twoCasesTree,
  crossingSlider,
  quadCount,
  cubicMatch,
  cubicReflectLine,
  cubicCountGen,
  cubicSignFlow,
  quadIneqLine,
  quadIneqFlow,
  criticalTree,
  quadIneqTiles,
  regionVertexTiles,
  regionTestTree,
  regionPointChoice,
  lowestSlider,
  capInterceptsTiles,
  capTestTree,
  highestSlider,
  originFlow,
  betweenCornersTiles,
  betweenCornerSlider,
  betweenShape,
  readRegionTiles,
  readRegionMatch,
  regionPictureCheck,
  readRegionFlow,
  pairPointChoice,
  regionCount,
  regionWidth,
  regionHighestTiles,
];
