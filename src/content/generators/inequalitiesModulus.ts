/**
 * Inequalities and the modulus function.
 *
 * Roadmap batch C8, the first two levels of a new concept. Level 1 solves
 * inequalities: the number-line picture of a linear one, joining two with
 * "and" or "or", quadratics whose critical values are not whole, rational
 * inequalities read from a sign table, and the notations a solution set is
 * written in. Level 2 is the modulus function: $|x|$ as a distance, the V of
 * $y = |ax + b|$, modulus equations and the roots they can wrongly produce,
 * modulus inequalities, and transformations of the V.
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
 * way, or the deck de-duplicator cannot see a repeat.
 */
function pickOne(prompt: Block[], correct: string, wrong: string[], tex = true): Slide {
  const distinct = [...new Set(wrong)].filter((label) => label !== correct).slice(0, 3);
  const at = aimFor(correct, [correct, ...distinct]);
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
];
