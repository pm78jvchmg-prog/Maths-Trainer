/**
 * Quadratics in disguise: a quadratic in something other than $x$.
 *
 * Roadmap batch B29, the seventh Quadratics level. Factorising and solving
 * were taught in levels 1 and 2; what is new is spotting that
 * $x^{4} - 5x^{2} + 4 = 0$ is a quadratic in $x^{2}$, substituting $u$ for
 * it, solving in $u$, and then going back to $x$ — where a root in $u$ can
 * give two values of $x$, one, or none at all.
 *
 * Five disguises are covered, one `Kind` each: an even power ($u = x^{2}$),
 * a sixth power ($u = x^{3}$, where a cube root keeps its sign), a square root
 * ($u = \sqrt{x}$, where a negative $u$ is rejected), a reciprocal
 * ($u = \frac{1}{x}$) and a bracket ($u = x + k$, a shift). Two more belong to
 * other courses and are only cross-referenced from the lessons:
 * $4^{x} - 5\left(2^{x}\right) + 4 = 0$ is Exponents and Radicals level 6,
 * and $\left(\log x\right)^{2} - 3\log x + 2 = 0$ is Logarithms level 7.
 *
 * **Every equation is built outward from its roots.** A monic quadratic in
 * $u$ is drawn from its two roots in $u$, chosen so the way back to $x$ stays
 * whole: squares for $u = x^{2}$, cubes for $u = x^{3}$. The reciprocal is
 * drawn from its roots in $x$ instead, $p$ and $q$, since
 * $\frac{pq}{x^{2}} - \frac{p + q}{x} + 1 = 0$ is
 * $\left(pu - 1\right)\left(qu - 1\right) = 0$ with $u = \frac{1}{x}$.
 *
 * Rules inherited from `quadratics.ts`: a tiles template is split on `{n}`
 * and each piece rendered alone, so no braces round a digit and no
 * `\left`/`\right` spanning a blank; and every value in a `reduce` tree is
 * whole, banks included.
 *
 * This file is imported by `quadraticShapes.ts` and spread into its array, so
 * the registry picks it up without changing. It must not import from that
 * file in turn.
 */
import type { Block, ChoiceOption, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { hashSeed } from '../../engine/rng';
import { markerWindow, plotSvg } from '../figures';
import { options } from '../choiceVariant';
import { bin, num, root } from '../expr';
import { bankOf, offer, quadraticTex, signedTile } from './quadratics';

/* ---------- Shared helpers ---------- */

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** au^2 + bu + c in any letter, written the way it appears on the page. */
function quadIn(a: number, b: number, c: number, v: string): string {
  const lead = a === 1 ? `${v}^{2}` : a === -1 ? `-${v}^{2}` : `${a}${v}^{2}`;
  const middle = b === 0 ? '' : ` ${signedTile(b, v)}`;
  const tail = c === 0 ? '' : ` ${signedTile(c)}`;
  return `${lead}${middle}${tail}`;
}

/** A deterministic scatter of a bank; see `working.ts`. */
function scatter(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => hashSeed(a) - hashSeed(b));
}

/** A steps bank: the value and distinct distractors, scattered. */
function stepBank(value: string, distractors: string[]): string[] {
  return scatter([value, ...distractors.filter((token, idx) => token !== value && distractors.indexOf(token) === idx)]);
}

/** A tree bank: the answers as a multiset, then distinct distractors. */
function treeBank(answer: string[], distractors: string[]): string[] {
  const extras: string[] = [];
  for (const value of distractors) {
    if (answer.includes(value) || extras.includes(value)) continue;
    extras.push(value);
  }
  return scatter([...answer, ...extras]);
}

/** Four whole-number options built from `offer`, the correct one flagged. */
function numberChoices(correct: number, ...near: number[]): ChoiceOption[] {
  return options(
    { tex: `${correct}`, answer: `${correct}` },
    ...offer(correct, ...near)
      .filter((value) => Number(value) !== correct)
      .map((value) => ({ tex: value, answer: value })),
  );
}

/**
 * Order a derived choice's options so the answer lands in a slot chosen by
 * the question's own numbers.
 *
 * `choiceVariant` turns the options by a hash of their labels, and with
 * small-number labels that hash favours one slot. So this tries orderings
 * until the turn puts the answer where the salt says, as `steered` in
 * `quadraticModelling.ts` does. `turnOf` mirrors `rotation` in
 * `choiceVariant.ts`; if that changes, the answer is still always on offer and
 * only its slot drifts again.
 */
function steered(opts: ChoiceOption[], params: unknown): ChoiceOption[] {
  const turnOf = (list: ChoiceOption[]) => {
    let hash = 0;
    for (const option of list) {
      for (let i = 0; i < option.tex.length; i += 1) hash = (hash * 31 + option.tex.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % list.length;
  };
  const n = opts.length;
  const target = hashSeed(JSON.stringify(params)) % n;
  const orders = (list: ChoiceOption[]): ChoiceOption[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((head, idx) => orders([...list.slice(0, idx), ...list.slice(idx + 1)]).map((rest) => [head, ...rest]));
  for (const order of orders(opts)) {
    const at = order.findIndex((option) => option.correct);
    if ((((at - turnOf(order)) % n) + n) % n === target) return order;
  }
  return opts;
}

/**
 * A native choice slide with the answer in a drawn slot.
 *
 * Drawn in `sample` rather than hashed from the labels, since the labels here
 * come from a short fixed list and a hash over them would favour some slots.
 */
function choiceSlide(prompt: Block[], correct: string, distractors: string[], slot: number): Slide {
  const rest = distractors.filter((label, idx) => label !== correct && distractors.indexOf(label) === idx);
  const at = slot % (rest.length + 1);
  const labels = [...rest.slice(0, at), correct, ...rest.slice(at)];
  return {
    kind: 'choice',
    prompt,
    options: labels.map((label, idx) => ({ id: `opt${idx}`, label, tex: true })),
    correctId: `opt${at}`,
  };
}

/** Branches turned by a drawn amount, so the right one is not always first. */
function turned<T>(items: T[], turn: number): T[] {
  const at = ((turn % items.length) + items.length) % items.length;
  return [...items.slice(at), ...items.slice(0, at)];
}

/* ---------- The disguises ---------- */

type Kind = 'even' | 'cube' | 'root' | 'recip' | 'bracket';

/**
 * One disguised quadratic.
 *
 * For every kind but `recip`, `r1 < r2` are the two roots of the quadratic in
 * $u$. For `recip` they are the two roots in $x$, since $u = \frac{1}{x}$
 * makes the roots in $u$ fractions and it is the way back that should be
 * whole.
 */
interface Disguise {
  kind: Kind;
  r1: number;
  r2: number;
  /** The shift inside the bracket, for `bracket`; 0 otherwise. */
  k: number;
  /** For `recip`: the constant is written on the right-hand side. */
  moved: boolean;
}

const SQUARES = [1, 4, 9, 16, 25, 36];
const CUBES = [1, 8, 27, 64];

function ordered(kind: Kind, a: number, b: number, k = 0, moved = false): Disguise {
  return { kind, r1: Math.min(a, b), r2: Math.max(a, b), k, moved };
}

/** A negative whole number from -1 down to -`low`. */
const negative = (rng: Rng, low: number) => -rng.int(1, low);

/**
 * $u = x^{2}$: roots in $u$ that are squares, or negative.
 *
 * At least one root is a square unless `none` fires, which draws both
 * negative — an equation with no real solutions, asked only where counting is
 * the question. The middle coefficient is never zero.
 */
function drawEven(rng: Rng, top: number, lean: number, low: number, none = 0): Disguise {
  const squares = SQUARES.filter((s) => s <= top);
  for (;;) {
    const r2 = rng.chance(none) ? negative(rng, low) : rng.pick(squares);
    const r1 = r2 < 0 || rng.chance(lean) ? negative(rng, low) : rng.pick(squares);
    if (r1 === r2 || r1 === -r2) continue;
    return ordered('even', r1, r2);
  }
}

/** $u = x^{3}$: roots in $u$ that are cubes, either sign. */
function drawCube(rng: Rng, big: boolean): Disguise {
  const cubes = CUBES.filter((c) => big || c < 64).flatMap((c) => [c, -c]);
  for (;;) {
    const [r1, r2] = rng.sample(cubes, 2);
    if (r1 === -r2) continue;
    return ordered('cube', r1, r2);
  }
}

/** $u = \sqrt{x}$: positive roots in $u$, or a negative one to reject. */
function drawRoot(rng: Rng, top: number, lean: number, low: number, none = 0): Disguise {
  for (;;) {
    const r2 = rng.chance(none) ? negative(rng, low) : rng.int(1, top);
    const r1 = r2 < 0 || rng.chance(lean) ? negative(rng, low) : rng.int(1, top);
    if (r1 === r2 || r1 === -r2) continue;
    return ordered('root', r1, r2);
  }
}

/** $u = \frac{1}{x}$: two whole roots in $x$, neither zero. */
function drawRecip(rng: Rng, hard: boolean, moved = false): Disguise {
  for (;;) {
    const p = rng.int(hard ? -5 : -3, hard ? 9 : 7);
    const q = rng.int(hard ? -5 : -3, hard ? 9 : 7);
    if (p === 0 || q === 0 || p === q || p + q === 0 || Math.abs(p * q) > 48) continue;
    return ordered('recip', p, q, 0, moved);
  }
}

/** $u = x + k$: roots in $u$, and the shift, with every root in $x$ on screen. */
function drawBracket(rng: Rng, hard: boolean): Disguise {
  for (;;) {
    const k = rng.sign() * rng.int(1, hard ? 5 : 3);
    const r1 = hard ? rng.int(-5, 8) : rng.int(1, 7);
    const r2 = hard ? rng.int(-5, 8) : rng.int(1, 7);
    if (r1 === 0 || r2 === 0 || r1 === r2 || r1 === -r2) continue;
    if ([r1, r2, r1 - k, r2 - k].some((value) => Math.abs(value) > 9)) continue;
    return ordered('bracket', r1, r2, k);
  }
}

/** A disguise of a given kind at the usual sizes for a difficulty. */
function drawKind(rng: Rng, kind: Kind, hard: boolean): Disguise {
  switch (kind) {
    case 'even':
      return drawEven(rng, hard ? 36 : 25, hard ? 0.45 : 0.3, hard ? 9 : 5);
    case 'cube':
      return drawCube(rng, hard);
    case 'root':
      return drawRoot(rng, hard ? 9 : 6, hard ? 0.45 : 0.3, hard ? 6 : 4);
    case 'recip':
      return drawRecip(rng, hard, hard && rng.chance(0.4));
    case 'bracket':
      return drawBracket(rng, hard);
  }
}

/** The coefficients of the quadratic in $u$, leading coefficient positive. */
function coefficientsOf(d: Disguise): { a: number; b: number; c: number } {
  if (d.kind === 'recip') {
    const s = Math.sign(d.r1 * d.r2);
    return { a: s * d.r1 * d.r2, b: -s * (d.r1 + d.r2), c: s };
  }
  return { a: 1, b: -(d.r1 + d.r2), c: d.r1 * d.r2 };
}

/** What $u$ stands for. */
function uName(d: Disguise): string {
  switch (d.kind) {
    case 'even':
      return 'x^{2}';
    case 'cube':
      return 'x^{3}';
    case 'root':
      return '\\sqrt{x}';
    case 'recip':
      return '\\frac{1}{x}';
    case 'bracket':
      return `x ${signedTile(d.k)}`;
  }
}

/** The term that is $u^{2}$ in disguise. */
function squaredName(d: Disguise): string {
  switch (d.kind) {
    case 'even':
      return 'x^{4}';
    case 'cube':
      return 'x^{6}';
    case 'root':
      return 'x';
    case 'recip':
      return '\\frac{1}{x^{2}}';
    case 'bracket':
      return `(x ${signedTile(d.k)})^{2}`;
  }
}

/** $u$ as it is written in the middle term. */
function middleName(d: Disguise): string {
  return d.kind === 'bracket' ? `(${uName(d)})` : uName(d);
}

/** The left-hand side in $x$, as the learner reads it. */
function lhsTex(d: Disguise): string {
  const { a, b, c } = coefficientsOf(d);
  if (d.kind === 'recip') {
    return `\\frac{${a}}{x^{2}} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{x}${d.moved ? '' : ` ${signedTile(c)}`}`;
  }
  return `${squaredName(d)} ${signedTile(b, middleName(d))} ${signedTile(c)}`;
}

/** The equation in $x$: `= 0`, or with the reciprocal's constant moved over. */
function equationTex(d: Disguise): string {
  const { c } = coefficientsOf(d);
  return d.kind === 'recip' && d.moved ? `${lhsTex(d)} = ${-c}` : `${lhsTex(d)} = 0`;
}

/** The quadratic in $u$, without `= 0`. */
function uQuadTex(d: Disguise): string {
  const { a, b, c } = coefficientsOf(d);
  return quadIn(a, b, c, 'u');
}

/** $1/p$ as TeX: `\frac{1}{3}`, `-\frac{1}{2}`, or a whole number for 1 and -1. */
function unitFraction(p: number): string {
  if (Math.abs(p) === 1) return `${p}`;
  return `${p < 0 ? '-' : ''}\\frac{1}{${Math.abs(p)}}`;
}

/** A factor of the reciprocal's quadratic in $u$, for the root $x = p$. */
function recipFactor(p: number): string {
  const size = Math.abs(p);
  return `(${size === 1 ? '' : size}u ${p > 0 ? '-' : '+'} 1)`;
}

/** The quadratic in $u$ factorised, without `= 0`. */
function factorsTex(d: Disguise): string {
  if (d.kind === 'recip') return `${recipFactor(d.r1)}${recipFactor(d.r2)}`;
  return `(u ${signedTile(-d.r1)})(u ${signedTile(-d.r2)})`;
}

/** The two roots in $u$, as TeX, in the order of the factors. */
function uRootsTex(d: Disguise): [string, string] {
  if (d.kind === 'recip') return [unitFraction(d.r1), unitFraction(d.r2)];
  return [`${d.r1}`, `${d.r2}`];
}

const cubeRoot = (r: number) => Math.round(Math.cbrt(r));

/** The value of $x$ one root gives: the root in $u$, or $p$ for `recip`. */
function xValues(d: Disguise, r: number): number[] {
  switch (d.kind) {
    case 'even':
      return r > 0 ? [-Math.sqrt(r), Math.sqrt(r)] : [];
    case 'cube':
      return [cubeRoot(r)];
    case 'root':
      return r > 0 ? [r * r] : [];
    case 'recip':
      return [r];
    case 'bracket':
      return [r - d.k];
  }
}

/** Every real solution in $x$, smallest first. */
function solutionsOf(d: Disguise): number[] {
  return [...xValues(d, d.r1), ...xValues(d, d.r2)].sort((x, y) => x - y);
}

/** One root's $x$ as a tile: `x = \pm 2`, `x = 9`, or none. */
function xTile(d: Disguise, r: number): string {
  if (d.kind === 'even') return r > 0 ? `x = \\pm ${Math.sqrt(r)}` : '\\text{none}';
  const values = xValues(d, r);
  return values.length === 0 ? '\\text{none}' : `x = ${values[0]}`;
}

/** Why this $u$ works, in one sentence. */
function whyU(d: Disguise): string {
  switch (d.kind) {
    case 'even':
      return '$x^{4} = \\left(x^{2}\\right)^{2}$, so putting $u = x^{2}$ makes it a quadratic in $u$.';
    case 'cube':
      return '$x^{6} = \\left(x^{3}\\right)^{2}$, so putting $u = x^{3}$ makes it a quadratic in $u$.';
    case 'root':
      return '$x = \\left(\\sqrt{x}\\right)^{2}$, so putting $u = \\sqrt{x}$ makes it a quadratic in $u$.';
    case 'recip':
      return '$\\frac{1}{x^{2}} = \\left(\\frac{1}{x}\\right)^{2}$, so putting $u = \\frac{1}{x}$ makes it a quadratic in $u$.';
    case 'bracket':
      return `The bracket $${uName(d)}$ appears squared and on its own, so putting $u = ${uName(d)}$ makes it a quadratic in $u$.`;
  }
}

/** Going back to $x$ from one root in $u$, in words. */
function backLine(d: Disguise, r: number): string {
  switch (d.kind) {
    case 'even':
      return r > 0
        ? `$x^{2} = ${r}$ gives $x = \\pm ${Math.sqrt(r)}$.`
        : `$x^{2} = ${r}$ has no real solution: a square is never negative.`;
    case 'cube':
      return `$x^{3} = ${r}$ gives $x = ${cubeRoot(r)}$${r < 0 ? ': a cube root keeps its sign' : ''}.`;
    case 'root':
      return r > 0
        ? `$\\sqrt{x} = ${r}$ gives $x = ${r * r}$.`
        : `$\\sqrt{x} = ${r}$ is impossible, since a square root is never negative, so this root is rejected.`;
    case 'recip':
      return `$\\frac{1}{x} = ${unitFraction(r)}$ gives $x = ${r}$.`;
    case 'bracket':
      return `$${uName(d)} = ${r}$ gives $x = ${r - d.k}$.`;
  }
}

/** The solutions as a sentence. */
function answerLine(d: Disguise): string {
  const xs = solutionsOf(d);
  if (xs.length === 0) return 'So the equation has no real solutions.';
  const list = xs.map((x) => `$x = ${x}$`);
  return list.length === 1 ? `So the only solution is ${list[0]}.` : `So ${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}.`;
}

/** The whole method, worked: substitute, factorise, go back to $x$. */
function solveSteps(d: Disguise): SolutionStep[] {
  const [u1, u2] = uRootsTex(d);
  const steps: SolutionStep[] = [{ text: whyU(d) }];
  if (d.kind === 'recip' && d.moved) steps.push({ text: 'Bring the number over first, so one side is zero.' });
  steps.push(
    { tex: `${uQuadTex(d)} = 0` },
    { tex: `${factorsTex(d)} = 0` },
    { text: `So $u = ${u1}$ or $u = ${u2}$. Now go back to $x$.` },
    { text: `${backLine(d, d.r1)} ${backLine(d, d.r2)}` },
    { text: answerLine(d) },
  );
  return steps;
}

/** The substitution, with the ones a learner might reach for instead. */
function uCandidates(d: Disguise): { correct: string; traps: string[] } {
  switch (d.kind) {
    case 'even':
      return { correct: 'x^{2}', traps: ['x^{4}', '\\sqrt{x}', 'x^{3}'] };
    case 'cube':
      return { correct: 'x^{3}', traps: ['x^{6}', 'x^{2}', '\\sqrt{x}'] };
    case 'root':
      return { correct: '\\sqrt{x}', traps: ['x', 'x^{2}', '\\frac{1}{x}'] };
    case 'recip':
      return { correct: '\\frac{1}{x}', traps: ['\\frac{1}{x^{2}}', 'x', 'x^{2}'] };
    case 'bracket':
      return { correct: uName(d), traps: [`(${uName(d)})^{2}`, 'x', 'x^{2}'] };
  }
}

/* ---------- Lesson 1: spotting the disguise ---------- */

interface SpotParams extends Disguise {
  slot: number;
}

/**
 * Which substitution makes it a quadratic?
 *
 * The traps are the square term itself ($u = x^{4}$), a neighbouring power,
 * and a disguise that belongs to a different equation.
 */
const spot: Generator<SpotParams> = {
  id: 'quad-disguise-spot',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind: Kind = rng.pick(hard ? ['even', 'cube', 'root', 'recip', 'bracket'] : ['even', 'root', 'recip', 'bracket']);
    return { ...drawKind(rng, kind, hard), slot: rng.int(0, 3) };
  },
  render: (params): Slide => {
    const { correct, traps } = uCandidates(params);
    return choiceSlide(
      [prose('Which substitution turns this into a quadratic in $u$?'), display(equationTex(params))],
      `u = ${correct}`,
      traps.map((trap) => `u = ${trap}`),
      params.slot,
    );
  },
  solution: (d) => [
    { text: whyU(d) },
    { tex: `${uQuadTex(d)} = 0` },
    {
      text:
        d.kind === 'bracket'
          ? 'Expanding the brackets would work too, but it is longer and hides the roots.'
          : `The test: one term is exactly the square of another, and the third is a plain number.`,
    },
  ],
};

/**
 * Write the equation as a quadratic in $u$, term by term.
 *
 * The bank carries the square term left as it was ($u^{4}$ for $x^{4}$), the
 * middle term with the wrong power of $u$, and each sign flipped.
 */
const uTiles: Generator<Disguise> = {
  id: 'quad-disguise-u-tiles',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return drawKind(rng, rng.pick(hard ? ['even', 'cube', 'root', 'recip', 'bracket'] : ['even', 'root', 'bracket']), hard);
  },
  render: (d): Slide => {
    const { a, b, c } = coefficientsOf(d);
    const first = a === 1 ? 'u^{2}' : `${a}u^{2}`;
    const answer = [first, signedTile(b, 'u'), signedTile(c)];
    const flips = [signedTile(-b, 'u'), signedTile(-c)];
    const slips: Record<Kind, string[]> = {
      even: ['u^{4}', signedTile(b, 'u^{2}')],
      cube: ['u^{3}', signedTile(b, 'u^{3}')],
      root: ['u', signedTile(b, '\\sqrt{u}')],
      recip: ['u^{2}', signedTile(b, 'u^{2}')],
      bracket: ['x^{2}', signedTile(b, 'x')],
    };
    return {
      kind: 'tiles',
      prompt: [
        prose(`Put $u = ${uName(d)}$ and write the equation as a quadratic in $u$.`),
        display(equationTex(d)),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, [...slips[d.kind], ...flips]),
      answer,
    };
  },
  solution: (d) => {
    const { b } = coefficientsOf(d);
    return [
      { text: whyU(d) },
      ...(d.kind === 'recip' && d.moved ? [{ text: 'Bring the number over first, so one side is zero.' }] : []),
      {
        text:
          d.kind === 'recip'
            ? `$\\frac{1}{x^{2}}$ becomes $u^{2}$ and $\\frac{1}{x}$ becomes $u$; the numbers on top stay as they are.`
            : `$${squaredName(d)}$ becomes $u^{2}$ and $${signedTile(b, middleName(d))}$ becomes $${signedTile(b, 'u')}$.`,
      },
      { tex: `${uQuadTex(d)} = 0` },
    ];
  },
};

interface IsItParams extends Disguise {
  /** Which look-alike this is, or -1 for a genuine disguise. */
  fake: number;
  turn: number;
}

/** Look-alikes: three terms, a number at the end, and no $u$ that works. */
function fakeTex(fake: number, b: number, c: number): string {
  switch (fake) {
    case 0:
      return `x^{4} ${signedTile(b, 'x')} ${signedTile(c)} = 0`;
    case 1:
      return `x^{6} ${signedTile(b, 'x^{2}')} ${signedTile(c)} = 0`;
    case 2:
      return `x^{2} ${signedTile(b, '\\sqrt{x}')} ${signedTile(c)} = 0`;
    default:
      return `x^{3} ${signedTile(b, 'x')} ${signedTile(c)} = 0`;
  }
}

const FAKE_WHY = [
  '$x^{4}$ is the square of $x^{2}$, not of $x$.',
  '$x^{6}$ is the square of $x^{3}$, not of $x^{2}$.',
  'The square of $\\sqrt{x}$ is $x$, not $x^{2}$.',
  'The square of $x$ is $x^{2}$, not $x^{3}$.',
];

/** The substitution a look-alike tempts, then two more. */
const FAKE_TRIES = [
  ['x^{2}', 'x', 'x^{4}'],
  ['x^{2}', 'x^{3}', 'x^{6}'],
  ['\\sqrt{x}', 'x', 'x^{2}'],
  ['x', 'x^{2}', 'x^{3}'],
];

const IS_YES = 'Yes';
const IS_NO = 'No';

/**
 * Is it a quadratic in disguise at all, and in what?
 *
 * The look-alikes keep the three-terms-and-a-number shape but break the one
 * rule that matters: one power must be exactly the square of the other.
 */
const isItFlow: Generator<IsItParams> = {
  id: 'quad-disguise-is-it-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const turn = rng.int(0, 2);
    if (rng.chance(0.4)) {
      return { ...drawEven(rng, hard ? 25 : 16, 0.3, hard ? 7 : 5), fake: rng.int(0, 3), turn };
    }
    const kind: Kind = rng.pick(hard ? ['even', 'cube', 'root', 'recip', 'bracket'] : ['even', 'root', 'recip', 'bracket']);
    return { ...drawKind(rng, kind, hard), fake: -1, turn };
  },
  render: (params): Slide => {
    const { fake, turn } = params;
    const genuine = fake < 0;
    const { b, c } = coefficientsOf(params);
    const { correct, traps } = uCandidates(params);
    const tries = genuine ? [correct, traps[0], traps[1]] : FAKE_TRIES[fake];
    const quad = `$${uQuadTex(params)} = 0$`;
    return {
      kind: 'flow',
      prompt: [prose('Decide whether this is a quadratic in disguise, and if it is, what $u$ should be.')],
      subject: genuine ? equationTex(params) : fakeTex(fake, b, c),
      steps: [
        {
          id: 'square',
          ask: 'Is one power exactly the square of the other, with a plain number as the third term?',
          branches: [
            { label: IS_YES, to: 'which' },
            { label: IS_NO, outcome: 'Then no single $u$ turns it into a quadratic.' },
          ],
        },
        {
          id: 'which',
          ask: 'So what should $u$ be?',
          branches: turned(
            tries.map((attempt, idx) => ({
              label: `$u = ${attempt}$`,
              outcome:
                genuine && idx === 0
                  ? `Then it is ${quad}.`
                  : 'Then a power of $x$ is left over that is not a power of $u$.',
            })),
            turn,
          ),
        },
      ],
      answer: genuine ? [IS_YES, `$u = ${correct}$`] : [IS_NO],
    };
  },
  solution: (params) =>
    params.fake < 0
      ? [{ text: whyU(params) }, { tex: `${uQuadTex(params)} = 0` }]
      : [
          { text: FAKE_WHY[params.fake] },
          { text: 'So whichever $u$ you choose, one term is left that is not a power of $u$. It is not a quadratic in disguise.' },
        ],
};

interface URootParams extends Disguise {
  /** Ask for the smaller root rather than the larger. */
  low: boolean;
}

/**
 * Solve the quadratic in $u$: the half-way point, before going back to $x$.
 *
 * The slips are the other root, the sign flipped, and going on to $x$ when
 * the question stopped at $u$.
 */
const uRoots: Generator<URootParams> = {
  id: 'quad-disguise-u-roots',
  choices: (params) => {
    const target = params.low ? params.r1 : params.r2;
    const other = params.low ? params.r2 : params.r1;
    const onward = xValues(params, target);
    return steered(numberChoices(target, other, -target, onward[onward.length - 1] ?? target + 1), params);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind: Kind = rng.pick(hard ? ['even', 'cube', 'root', 'bracket'] : ['even', 'root', 'bracket']);
    return { ...drawKind(rng, kind, hard), low: hard && rng.chance(0.5) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(
        `Put $u = ${uName(params)}$ and solve the quadratic in $u$. Give the ${params.low ? 'smaller' : 'larger'} root, in $u$ rather than $x$.`,
      ),
      display(equationTex(params)),
    ],
    lead: 'u =',
    keypad: [],
    answer: `${params.low ? params.r1 : params.r2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => [
    { text: whyU(params) },
    { tex: `${uQuadTex(params)} = 0` },
    { tex: `${factorsTex(params)} = 0` },
    {
      text: `So $u = ${params.r1}$ or $u = ${params.r2}$, and the ${params.low ? 'smaller' : 'larger'} is $${params.low ? params.r1 : params.r2}$. Going back to $x$ is the next step, not this one.`,
    },
  ],
};

/* ---------- Lesson 2: even powers ---------- */

/** The final line of an even-power solve, as the learner would write it. */
function evenFinal(d: Disguise): string {
  const lines = [d.r1, d.r2].filter((r) => r > 0).map((r) => `x = \\pm ${Math.sqrt(r)}`);
  return lines.join(' \\text{ or } ');
}

/**
 * The whole solve of $x^{4} + bx^{2} + c = 0$, one line at a time.
 *
 * Three rewrites: into $u$, factorised, and back to $x$. The last bank holds
 * the roots in $u$ passed off as $x$, the $\pm$ forgotten, and a negative
 * $u$ square-rooted anyway.
 */
const evenSteps: Generator<Disguise> = {
  id: 'quad-disguise-even-steps',
  sample: (rng, difficulty) => drawKind(rng, 'even', difficulty > 1),
  render: (d): Slide => {
    const { b, c } = coefficientsOf(d);
    const inU = `${uQuadTex(d)} = 0`;
    const factored = `${factorsTex(d)} = 0`;
    const final = evenFinal(d);
    const positive = [d.r1, d.r2].filter((r) => r > 0);
    return {
      kind: 'steps',
      prompt: [
        prose('Solve by putting $u = x^{2}$. Tap the line, then choose what it becomes next.'),
      ],
      start: [`${lhsTex(d)} = 0`],
      reductions: [
        {
          span: [0, 1],
          value: inU,
          bank: stepBank(inU, [
            `u^{4} ${signedTile(b, 'u^{2}')} ${signedTile(c)} = 0`,
            `u^{2} ${signedTile(-b, 'u')} ${signedTile(c)} = 0`,
            `u^{2} ${signedTile(b, 'u')} ${signedTile(-c)} = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: factored,
          bank: stepBank(factored, [
            `(u ${signedTile(d.r1)})(u ${signedTile(d.r2)}) = 0`,
            `(u ${signedTile(d.r1)})(u ${signedTile(-d.r2)}) = 0`,
            `(u ${signedTile(-d.r1)})(u ${signedTile(d.r2)}) = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: final,
          bank: stepBank(final, [
            `x = ${d.r1} \\text{ or } x = ${d.r2}`,
            positive.map((r) => `x = ${Math.sqrt(r)}`).join(' \\text{ or } '),
            d.r1 < 0
              ? `x = \\pm ${Math.sqrt(d.r2)} \\text{ or } x = \\pm ${-d.r1}`
              : `x = \\pm ${d.r1} \\text{ or } x = \\pm ${d.r2}`,
          ]),
        },
      ],
    };
  },
  solution: (d) => solveSteps(d),
};

/**
 * The two roots in $u$, then what each gives in $x$, on a tree.
 *
 * At difficulty 2 the disguise can be $x^{6}$, where each root gives exactly
 * one $x$ and a negative one is fine: a cube root keeps its sign.
 */
const splitTree: Generator<Disguise> = {
  id: 'quad-disguise-split-tree',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    return hard && rng.chance(0.4) ? drawCube(rng, true) : drawKind(rng, 'even', hard);
  },
  render: (d): Slide => {
    const answer = [`u = ${d.r2}`, `u = ${d.r1}`, xTile(d, d.r2), xTile(d, d.r1)];
    const top = Math.abs(d.r2);
    const distractors =
      d.kind === 'even'
        ? [`x = ${d.r2}`, `x = ${Math.sqrt(d.r2)}`, `x = \\pm ${d.r2}`, `u = ${-d.r2}`, `u = ${-d.r1}`, '\\text{none}']
        : [`x = \\pm ${cubeRoot(top)}`, `x = ${-cubeRoot(d.r2)}`, `x = ${d.r2}`, `u = ${-d.r1}`, '\\text{none}'];
    return {
      kind: 'tree',
      prompt: [
        prose(
          `Put $u = ${uName(d)}$. Top row: the two roots in $u$, larger first. Bottom row: the values of $x$ each gives, or none.`,
        ),
      ],
      expression: equationTex(d),
      nodes: [
        { id: 'u1', from: [] },
        { id: 'u2', from: [] },
        { id: 'x1', from: ['u1'] },
        { id: 'x2', from: ['u2'] },
      ],
      bank: treeBank(answer, distractors),
      answer,
    };
  },
  solution: (d) => solveSteps(d),
};

/**
 * How many real solutions: two for each positive $u$, none for a negative
 * one. At difficulty 2 both roots can be negative, and then there are none.
 */
const countSolutions: Generator<Disguise> = {
  id: 'quad-disguise-count',
  choices: (params) => {
    const count = solutionsOf(params).length;
    return steered(numberChoices(count, ...[2, 4, 0, 1].filter((value) => value !== count).slice(0, 3)), params);
  },
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    if (hard && rng.chance(0.3)) return drawCube(rng, false);
    return drawEven(rng, hard ? 36 : 16, 0.4, hard ? 9 : 6, hard ? 0.2 : 0);
  },
  render: (d): Slide => ({
    kind: 'expression',
    prompt: [prose('How many real solutions, $n$, does this equation have?'), display(equationTex(d))],
    lead: 'n =',
    keypad: [],
    answer: `${solutionsOf(d).length}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (d) => [
    { text: whyU(d) },
    { tex: `${factorsTex(d)} = 0` },
    { text: `So $u = ${d.r1}$ or $u = ${d.r2}$.` },
    { text: `${backLine(d, d.r1)} ${backLine(d, d.r2)}` },
    { text: `That is $${solutionsOf(d).length}$ real solution${solutionsOf(d).length === 1 ? '' : 's'} in all.` },
  ],
};

type SliderAsk = 'largest' | 'smallest' | 'nearest';

interface EvenSliderParams extends Disguise {
  ask: SliderAsk;
}

const EVEN_WINDOW = 6;

function evenSliderAnswer({ r1, r2, ask }: EvenSliderParams): number {
  if (ask === 'nearest') return Math.sqrt(r1);
  return ask === 'largest' ? Math.sqrt(r2) : -Math.sqrt(r2);
}

const ASK_TEXT: Record<SliderAsk, string> = {
  largest: 'its largest root',
  smallest: 'its smallest root',
  nearest: 'the positive root closest to $0$',
};

/**
 * Slide to a root of the quartic on its graph.
 *
 * The graph is symmetrical about the $y$-axis, since every term is an even
 * power, so the smallest root is the largest one reflected — and a negative
 * $u$ shows up as a pair of crossings that is simply not there.
 */
const evenSlider: Generator<EvenSliderParams> = {
  id: 'quad-disguise-even-slider',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const d = drawEven(rng, hard ? 25 : 16, hard ? 0.4 : 0.3, hard ? 9 : 6);
    const asks: SliderAsk[] = d.r1 > 0 ? ['largest', 'smallest', 'nearest'] : ['largest', 'smallest'];
    return { ...d, ask: hard ? rng.pick(asks) : rng.pick(asks.slice(0, 2)) };
  },
  render: (params): Slide => {
    const { b, c } = coefficientsOf(params);
    const f = (x: number) => x ** 4 + b * x * x + c;
    const dip = params.r1 > 0 ? -((params.r2 - params.r1) ** 2) / 4 : c;
    return {
      kind: 'slider',
      prompt: [
        prose('Here is the graph of'),
        display(`y = ${lhsTex(params)}`),
        prose(`Slide to ${ASK_TEXT[params.ask]}.`),
      ],
      min: -EVEN_WINDOW,
      max: EVEN_WINDOW,
      step: 1,
      answer: evenSliderAnswer(params),
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -EVEN_WINDOW,
          xMax: EVEN_WINDOW,
          yMin: dip * 1.25,
          yMax: -dip * 1.5,
          curves: [{ f, breaks: true }],
          verticals: [{ x: 0, dashed: false }],
          label: 'A curve symmetrical about the vertical axis',
        }),
        ...markerWindow(-EVEN_WINDOW, EVEN_WINDOW),
      },
    };
  },
  solution: (params) => [
    ...solveSteps(params),
    {
      text: `On the graph those are where the curve meets the $x$-axis. ${ASK_TEXT[params.ask].replace(/^./, (ch) => ch.toUpperCase())} is $x = ${evenSliderAnswer(params)}$.`,
    },
  ],
};

/* ---------- Lesson 3: square roots ---------- */

/** The two roots in $u = \sqrt{x}$, then the $x$ each gives, on a tree. */
const rootTree: Generator<Disguise> = {
  id: 'quad-disguise-root-tree',
  sample: (rng, difficulty) =>
    difficulty > 1 ? drawRoot(rng, 9, 0.6, 6) : drawRoot(rng, 6, 0.35, 4),
  render: (d): Slide => {
    const answer = [`u = ${d.r2}`, `u = ${d.r1}`, xTile(d, d.r2), xTile(d, d.r1)];
    return {
      kind: 'tree',
      prompt: [
        prose(
          'Put $u = \\sqrt{x}$. Top row: the two roots in $u$, larger first. Bottom row: the $x$ each gives, or none.',
        ),
      ],
      expression: equationTex(d),
      nodes: [
        { id: 'u1', from: [] },
        { id: 'u2', from: [] },
        { id: 'x1', from: ['u1'] },
        { id: 'x2', from: ['u2'] },
      ],
      bank: treeBank(answer, [
        // Squaring the negative root anyway: the answer the check rejects.
        `x = ${d.r1 * d.r1}`,
        `x = ${d.r2}`,
        `x = \\sqrt{${d.r2}}`,
        `u = ${-d.r2}`,
        '\\text{none}',
      ]),
      answer,
    };
  },
  solution: (d) => solveSteps(d),
};

interface RootSolveParams extends Disguise {
  low: boolean;
}

function rootSolveAnswer(params: RootSolveParams): number {
  const xs = solutionsOf(params);
  return params.low ? xs[0] : xs[xs.length - 1];
}

/**
 * Solve $x + b\sqrt{x} + c = 0$, answer typed.
 *
 * With a negative root in $u$ there is one solution; with two positive roots
 * there are two and the question says which. The pick-one form offers the
 * square of the rejected root, the root in $u$ unsquared, and the other
 * solution.
 */
const rootSolve: Generator<RootSolveParams> = {
  id: 'quad-disguise-root-solve',
  choices: (params) => {
    const answer = rootSolveAnswer(params);
    const u = Math.sqrt(answer);
    const other = params.r1 < 0 ? params.r1 * params.r1 : params.low ? params.r2 * params.r2 : params.r1 * params.r1;
    return steered(numberChoices(answer, other, u, 2 * u), params);
  },
  sample: (rng, difficulty) => {
    const d = difficulty > 1 ? drawRoot(rng, 9, 0.55, 6) : drawRoot(rng, 6, 0.4, 4);
    return { ...d, low: d.r1 > 0 && rng.chance(0.5) };
  },
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(
        params.r1 < 0
          ? 'Solve for $x$.'
          : `This has two solutions. Give the ${params.low ? 'smaller' : 'larger'} one.`,
      ),
      display(equationTex(params)),
    ],
    lead: 'x =',
    keypad: [],
    answer: `${rootSolveAnswer(params)}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => solveSteps(params),
};

interface CheckParams extends Disguise {
  /** Check the square of the larger root in $u$, or of the smaller. */
  upper: boolean;
}

/**
 * Check a candidate by substituting it back, one piece at a time.
 *
 * The candidate is the square of one root in $u$. From a positive root the
 * left-hand side comes to zero; from a negative one it does not, which is the
 * rejection seen from the other side: squaring hid the sign, and the check
 * finds it again. The trap in the bank is $\sqrt{x}$ taken as negative.
 */
const rootCheck: Generator<CheckParams> = {
  id: 'quad-disguise-root-check',
  choices: (params) => {
    const { X, s, B, C, value } = checkNumbers(params);
    return steered(numberChoices(value, X + B * X + C, X - B * s + C, X + C), params);
  },
  sample: (rng, difficulty) => {
    const d = difficulty > 1 ? drawRoot(rng, 8, 0.6, 6) : drawRoot(rng, 5, 0.45, 4);
    return { ...d, upper: d.r1 > 0 ? rng.chance(0.5) : rng.chance(difficulty > 1 ? 0.35 : 0.5) };
  },
  render: (params): Slide => {
    const { X, s, B, C, term, first, value } = checkNumbers(params);
    const expr = bin(
      C < 0 ? '-' : '+',
      bin(B < 0 ? '-' : '+', num(X), bin('*', num(Math.abs(B)), root(num(X)))),
      num(Math.abs(C)),
    );
    const product = Math.abs(B) * s;
    return {
      kind: 'reduce',
      prompt: [
        prose(
          `Is $x = ${X}$ a solution? Substitute it into the left-hand side: it is a solution only if that comes to 0. Tap the part you would do **next**, then choose what it comes to.`,
        ),
        display(equationTex(params)),
      ],
      expr,
      banks: {
        // The square root: never negative, and not the number itself.
        'r.l.r.r': offer(s, -s, X, 2 * s),
        'r.l.r': offer(product, -product, Math.abs(B) * X, Math.abs(B) + s),
        'r.l': offer(first, X - term, X + Math.abs(B) * X * Math.sign(B), first + 1),
        r: offer(value, first - C, value + 2, value - 2),
      },
    };
  },
  solution: (params) => {
    const { X, s, B, C, term, first, value } = checkNumbers(params);
    return [
      { text: `$\\sqrt{${X}} = ${s}$: a square root is never negative.` },
      { tex: `${X} ${signedTile(B)} \\times ${s} ${signedTile(C)} = ${X} ${signedTile(term)} ${signedTile(C)}` },
      { tex: `${first} ${signedTile(C)} = ${value}` },
      {
        text:
          value === 0
            ? `It comes to 0, so $x = ${X}$ is a solution.`
            : `It comes to $${value}$, not 0, so $x = ${X}$ is not a solution. It came from $u = ${-s}$, and $\\sqrt{x}$ can never be negative.`,
      },
    ];
  },
};

/** The numbers a check works through: $X$, its root, and each partial sum. */
function checkNumbers(params: CheckParams) {
  const r = params.upper ? params.r2 : params.r1;
  const X = r * r;
  const s = Math.abs(r);
  const { b: B, c: C } = coefficientsOf(params);
  const term = B * s;
  const first = X + term;
  return { X, s, B, C, term, first, value: first + C };
}

interface BackFlowParams extends Disguise {
  upper: boolean;
  turn: number;
}

const BACK_YES = 'Yes';
const BACK_NO = 'No';

/**
 * One root in $u = \sqrt{x}$ at a time: keep it and square it, or reject it.
 *
 * The distractors at the second fork are the root itself (not squared), its
 * square root, and a negative square.
 */
const rootBackFlow: Generator<BackFlowParams> = {
  id: 'quad-disguise-root-back-flow',
  sample: (rng, difficulty) => {
    const d = difficulty > 1 ? drawRoot(rng, 9, 0.55, 6) : drawRoot(rng, 6, 0.45, 4);
    return { ...d, upper: d.r1 < 0 ? rng.chance(0.45) : rng.chance(0.5), turn: rng.int(0, 2) };
  },
  render: (params): Slide => {
    const r = params.upper ? params.r2 : params.r1;
    const squares = [
      { label: `$x = ${r * r}$`, outcome: `So this root is kept: $x = ${r * r}$.` },
      { label: `$x = \\sqrt{${Math.abs(r)}}$`, outcome: 'That undoes a square, not a square root.' },
      { label: `$x = ${-r * r}$`, outcome: 'Squaring never gives a negative number.' },
    ];
    return {
      kind: 'flow',
      prompt: [
        prose(
          `Putting $u = \\sqrt{x}$ into $${equationTex(params)}$ gave $u = ${params.r1}$ or $u = ${params.r2}$. Decide what $u = ${r}$ means for $x$.`,
        ),
      ],
      subject: `\\sqrt{x} = ${r}`,
      steps: [
        {
          id: 'sign',
          ask: 'A square root is never negative. Is the right-hand side zero or more?',
          branches: [
            { label: BACK_YES, to: 'square' },
            { label: BACK_NO, outcome: 'Then no $x$ works, and this root is rejected.' },
          ],
        },
        {
          id: 'square',
          ask: 'Square both sides. What is $x$?',
          branches: turned(squares, params.turn),
        },
      ],
      answer: r < 0 ? [BACK_NO] : [BACK_YES, `$x = ${r * r}$`],
    };
  },
  solution: (params) => {
    const r = params.upper ? params.r2 : params.r1;
    return [
      { text: 'A square root is never negative, so $\\sqrt{x} = u$ needs $u \\ge 0$.' },
      r < 0
        ? { text: `$${r}$ is negative, so $\\sqrt{x} = ${r}$ has no solution and $u = ${r}$ is rejected.` }
        : { tex: `\\sqrt{x} = ${r} \\implies x = ${r}^{2} = ${r * r}` },
      { text: answerLine(params) },
    ];
  },
};

/* ---------- Lesson 4: reciprocals ---------- */

/**
 * Write a reciprocal equation as a quadratic in $u = \frac{1}{x}$.
 *
 * At difficulty 2 the number starts on the right-hand side, so it has to come
 * over, sign and all, before the terms can be read off.
 */
const recipTiles: Generator<Disguise> = {
  id: 'quad-disguise-recip-tiles',
  sample: (rng, difficulty) => drawKind(rng, 'recip', difficulty > 1),
  render: (d): Slide => {
    const { a, b, c } = coefficientsOf(d);
    const answer = [`${a}u^{2}`, signedTile(b, 'u'), signedTile(c)];
    return {
      kind: 'tiles',
      prompt: [
        prose('Put $u = \\frac{1}{x}$ and write the equation as a quadratic in $u$, with zero on the right.'),
        display(equationTex(d)),
      ],
      template: '{0} {1} {2} = 0',
      bank: bankOf(answer, ['u^{2}', `${a}u`, signedTile(-b, 'u'), signedTile(-c)]),
      answer,
    };
  },
  solution: (d) => [
    { text: whyU(d) },
    ...(d.moved ? [{ text: 'Bring the number over first, so one side is zero.' }] : []),
    { text: '$\\frac{1}{x^{2}}$ becomes $u^{2}$ and $\\frac{1}{x}$ becomes $u$; the numbers on top stay as they are.' },
    { tex: `${uQuadTex(d)} = 0` },
  ],
};

/**
 * Clear the fractions instead: multiply every term by $x^{2}$.
 *
 * Allowed because $x$ cannot be 0 in an equation with $\frac{1}{x}$ in it.
 * The result is an ordinary quadratic in $x$, whose roots are the answers
 * directly. When the $x^{2}$ comes out negative the learner also has to
 * multiply through by $-1$ to reach the form given.
 */
const clearTiles: Generator<Disguise> = {
  id: 'quad-disguise-clear-tiles',
  sample: (rng, difficulty) => drawKind(rng, 'recip', difficulty > 1),
  render: (d): Slide => {
    const { r1: p, r2: q } = d;
    const { c } = coefficientsOf(d);
    const answer = [signedTile(-(p + q), 'x'), signedTile(p * q)];
    return {
      kind: 'tiles',
      prompt: [
        prose(
          '$x$ cannot be 0 here, so it is safe to multiply every term by $x^{2}$. Do that, and tidy the result into this form.',
        ),
        display(equationTex(d)),
      ],
      template: 'x^2 {0} {1} = 0',
      bank: bankOf(answer, [signedTile(p + q, 'x'), signedTile(-p * q), signedTile(c), signedTile(-(p + q))]),
      answer,
    };
  },
  solution: (d) => {
    const { a, b, c } = coefficientsOf(d);
    const { r1: p, r2: q } = d;
    return [
      ...(d.moved ? [{ text: 'Bring the number over first, so one side is zero.' }] : []),
      { text: 'Multiply every term by $x^{2}$: the $x^{2}$ underneath cancels, a fraction over $x$ keeps one $x$, and the plain number picks up an $x^{2}$.' },
      { tex: `${a} ${signedTile(b, 'x')} ${signedTile(c, 'x^{2}')} = 0` },
      ...(c < 0 ? [{ text: 'Multiply through by $-1$ so the $x^{2}$ term is positive.' }] : []),
      { tex: `${quadraticTex(1, -(p + q), p * q)} = 0` },
      { text: `This factorises as $(x ${signedTile(-p)})(x ${signedTile(-q)}) = 0$, so $x = ${p}$ or $x = ${q}$.` },
    ];
  },
};

interface RecipSolveParams extends Disguise {
  low: boolean;
}

/**
 * Solve a reciprocal equation, answer typed.
 *
 * The pick-one form offers the root in $u$ — the fraction — as if it were
 * $x$, which is forgetting to flip; the sign flipped; and the other root.
 */
const recipSolve: Generator<RecipSolveParams> = {
  id: 'quad-disguise-recip-solve',
  choices: (params) => {
    const t = params.low ? params.r1 : params.r2;
    const other = params.low ? params.r2 : params.r1;
    const flip = Math.abs(t) === 1 ? [] : [{ tex: unitFraction(t), answer: `1/(${t})` }];
    return steered(
      options(
        { tex: `${t}`, answer: `${t}` },
        ...flip,
        { tex: `${-t}`, answer: `${-t}` },
        { tex: `${other}`, answer: `${other}` },
        { tex: `${t + (t > 0 ? 1 : -1)}`, answer: `${t + (t > 0 ? 1 : -1)}` },
      ).slice(0, 4),
      params,
    );
  },
  sample: (rng, difficulty) => ({ ...drawKind(rng, 'recip', difficulty > 1), low: rng.chance(0.5) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Solve for $x$. It has two solutions; give the ${params.low ? 'smaller' : 'larger'} one.`),
      display(equationTex(params)),
    ],
    lead: 'x =',
    keypad: [],
    answer: `${params.low ? params.r1 : params.r2}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => solveSteps(params),
};

/**
 * The reciprocal solve, one line at a time: into $u$, factorised, the roots
 * in $u$, and then flipped to get $x$.
 *
 * The first bank holds the quadratic with its ends swapped — what clearing
 * the fractions gives, with $u$ written for $x$. The last holds the roots in
 * $u$ passed off as $x$: forgetting to flip.
 */
const flipSteps: Generator<Disguise> = {
  id: 'quad-disguise-flip-steps',
  sample: (rng, difficulty) => drawRecip(rng, difficulty > 1, difficulty > 1 && rng.chance(0.3)),
  render: (d): Slide => {
    const { a, b, c } = coefficientsOf(d);
    const { r1: p, r2: q } = d;
    const inU = `${uQuadTex(d)} = 0`;
    const factored = `${factorsTex(d)} = 0`;
    const [u1, u2] = uRootsTex(d);
    const roots = `u = ${u1} \\text{ or } u = ${u2}`;
    const final = `x = ${p} \\text{ or } x = ${q}`;
    return {
      kind: 'steps',
      prompt: [prose('Solve by putting $u = \\frac{1}{x}$. Tap the line, then choose what it becomes next.')],
      start: [equationTex(d)],
      reductions: [
        {
          span: [0, 1],
          value: inU,
          bank: stepBank(inU, [
            `${quadIn(c, b, a, 'u')} = 0`,
            `${quadIn(a, -b, c, 'u')} = 0`,
            `${quadIn(a, b, -c, 'u')} = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: factored,
          bank: stepBank(factored, [
            `${recipFactor(-p)}${recipFactor(-q)} = 0`,
            `(u ${signedTile(-p)})(u ${signedTile(-q)}) = 0`,
            `${recipFactor(p)}${recipFactor(-q)} = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: roots,
          bank: stepBank(roots, [
            `u = ${p} \\text{ or } u = ${q}`,
            `u = ${unitFraction(-p)} \\text{ or } u = ${unitFraction(-q)}`,
            `u = ${-p} \\text{ or } u = ${-q}`,
          ]),
        },
        {
          span: [0, 1],
          value: final,
          bank: stepBank(final, [
            `x = ${unitFraction(p)} \\text{ or } x = ${unitFraction(q)}`,
            `x = ${-p} \\text{ or } x = ${-q}`,
            `x = ${p} \\text{ or } x = ${-q}`,
          ]),
        },
      ],
    };
  },
  solution: (d) => solveSteps(d),
};

/* ---------- Lesson 5: a bracket as u ---------- */

/**
 * $(x + k)^{2} + b(x + k) + c = 0$, one line at a time.
 *
 * The last bank holds the roots in $u$ passed off as $x$, and $k$ added
 * rather than taken away.
 */
const bracketSteps: Generator<Disguise> = {
  id: 'quad-disguise-bracket-steps',
  sample: (rng, difficulty) => drawKind(rng, 'bracket', difficulty > 1),
  render: (d): Slide => {
    const { b, c } = coefficientsOf(d);
    const inU = `${uQuadTex(d)} = 0`;
    const factored = `${factorsTex(d)} = 0`;
    const x1 = d.r1 - d.k;
    const x2 = d.r2 - d.k;
    const final = `x = ${x1} \\text{ or } x = ${x2}`;
    return {
      kind: 'steps',
      prompt: [prose(`Solve by putting $u = ${uName(d)}$. Tap the line, then choose what it becomes next.`)],
      start: [equationTex(d)],
      reductions: [
        {
          span: [0, 1],
          value: inU,
          bank: stepBank(inU, [
            `u ${signedTile(b, 'u')} ${signedTile(c)} = 0`,
            `u^{2} ${signedTile(-b, 'u')} ${signedTile(c)} = 0`,
            `u^{2} ${signedTile(b, 'u')} ${signedTile(-c)} = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: factored,
          bank: stepBank(factored, [
            `(u ${signedTile(d.r1)})(u ${signedTile(d.r2)}) = 0`,
            `(u ${signedTile(d.r1)})(u ${signedTile(-d.r2)}) = 0`,
            `(u ${signedTile(-d.r1)})(u ${signedTile(d.r2)}) = 0`,
          ]),
        },
        {
          span: [0, 1],
          value: final,
          bank: stepBank(final, [
            `x = ${d.r1} \\text{ or } x = ${d.r2}`,
            `x = ${d.r1 + d.k} \\text{ or } x = ${d.r2 + d.k}`,
            `x = ${x1} \\text{ or } x = ${d.r2}`,
          ]),
        },
      ],
    };
  },
  solution: (d) => solveSteps(d),
};

interface BracketSolveParams extends Disguise {
  low: boolean;
}

/**
 * Solve a bracket disguise, answer typed. The pick-one form offers the root
 * in $u$, the shift added instead of taken away, and the other solution.
 */
const bracketSolve: Generator<BracketSolveParams> = {
  id: 'quad-disguise-bracket-solve',
  choices: (params) => {
    const r = params.low ? params.r1 : params.r2;
    const other = (params.low ? params.r2 : params.r1) - params.k;
    return steered(numberChoices(r - params.k, r, r + params.k, other), params);
  },
  sample: (rng, difficulty) => ({ ...drawKind(rng, 'bracket', difficulty > 1), low: rng.chance(0.5) }),
  render: (params): Slide => ({
    kind: 'expression',
    prompt: [
      prose(`Solve for $x$. It has two solutions; give the ${params.low ? 'smaller' : 'larger'} one.`),
      display(equationTex(params)),
    ],
    lead: 'x =',
    keypad: [],
    answer: `${(params.low ? params.r1 : params.r2) - params.k}`,
    domain: 'real',
    mode: 'exact',
  }),
  solution: (params) => solveSteps(params),
};

interface ShiftParams extends Disguise {
  low: boolean;
  /** Leave the roots in u unstated, so they have to be found. */
  hide: boolean;
}

const SHIFT_WINDOW = 10;

/**
 * The bracket disguise as a picture: the same parabola, slid sideways.
 *
 * The dashed curve is the quadratic in $u$ drawn against the axis; the solid
 * one is the equation in $x$, which is the dashed one moved $k$ to the left.
 * At difficulty 2 the roots in $u$ are not given, so they have to be found.
 */
const shiftSlider: Generator<ShiftParams> = {
  id: 'quad-disguise-shift-slider',
  sample: (rng, difficulty) => ({
    ...drawKind(rng, 'bracket', difficulty > 1),
    low: rng.chance(0.5),
    hide: difficulty > 1 && rng.chance(0.6),
  }),
  render: (params): Slide => {
    const { b, c } = coefficientsOf(params);
    const g = (t: number) => t * t + b * t + c;
    const dip = -((params.r2 - params.r1) ** 2) / 4;
    return {
      kind: 'slider',
      prompt: [
        prose(
          params.hide
            ? `The dashed curve is $y = ${uQuadTex(params)}$, drawn with $u$ along the axis. The solid curve is`
            : `The dashed curve is $y = ${uQuadTex(params)}$, drawn with $u$ along the axis; it crosses at $u = ${params.r1}$ and $u = ${params.r2}$. The solid curve is`,
        ),
        display(`y = ${lhsTex(params)}`),
        prose(`Slide to the ${params.low ? 'smaller' : 'larger'} root of the solid curve.`),
      ],
      min: -SHIFT_WINDOW,
      max: SHIFT_WINDOW,
      step: 1,
      answer: (params.low ? params.r1 : params.r2) - params.k,
      readout: 'x = {v}',
      figure: {
        svg: plotSvg({
          xMin: -SHIFT_WINDOW,
          xMax: SHIFT_WINDOW,
          yMin: dip * 1.3,
          yMax: -dip * 2.2,
          curves: [
            { f: g, dashed: true, breaks: true },
            { f: (x) => g(x + params.k), breaks: true },
          ],
          verticals: [{ x: 0, dashed: false }],
          label: 'Two identical parabolas, one dashed and one solid, side by side',
        }),
        ...markerWindow(-SHIFT_WINDOW, SHIFT_WINDOW),
      },
    };
  },
  solution: (params) => [
    ...solveSteps(params),
    {
      text: `Every root in $x$ is the root in $u$ ${params.k > 0 ? 'minus' : 'plus'} $${Math.abs(params.k)}$: the solid curve is the dashed one moved $${Math.abs(params.k)}$ to the ${params.k > 0 ? 'left' : 'right'}.`,
    },
  ],
};

interface CountFlowParams extends Disguise {
  turn: number;
}

const COUNT_LABELS = ['None', 'One', 'Two', 'Three', 'Four'];

/**
 * Any disguise: find $u$, then count the real solutions from the roots in $u$
 * without finishing the solve.
 *
 * Each root in $u$ gives two values of $x$ for $u = x^{2}$ when positive and
 * none when negative, none for a negative $\sqrt{x}$, and exactly one for a
 * cube, a reciprocal or a bracket.
 */
const countFlow: Generator<CountFlowParams> = {
  id: 'quad-disguise-count-flow',
  sample: (rng, difficulty) => {
    const hard = difficulty > 1;
    const kind: Kind = rng.pick(['even', 'even', 'cube', 'root', 'root', 'recip', 'bracket']);
    const turn = rng.int(0, 2);
    if (kind === 'even') return { ...drawEven(rng, hard ? 36 : 16, 0.45, 9, hard ? 0.25 : 0.1), turn };
    if (kind === 'root') return { ...drawRoot(rng, hard ? 9 : 6, 0.45, 6, hard ? 0.25 : 0.1), turn };
    return { ...drawKind(rng, kind, hard), turn };
  },
  render: (params): Slide => {
    const { correct, traps } = uCandidates(params);
    const count = solutionsOf(params).length;
    const [u1, u2] = uRootsTex(params);
    return {
      kind: 'flow',
      prompt: [prose('Count the real solutions of this equation without solving it all the way.')],
      subject: equationTex(params),
      steps: [
        {
          id: 'u',
          ask: 'Which substitution makes it a quadratic?',
          branches: turned(
            [correct, traps[0], traps[1]].map((attempt, idx) =>
              idx === 0
                ? { label: `$u = ${attempt}$`, to: 'count' }
                : { label: `$u = ${attempt}$`, outcome: 'Then a power of $x$ is left over that is not a power of $u$.' },
            ),
            params.turn,
          ),
        },
        {
          id: 'count',
          ask: `The quadratic in $u$ has roots $u = ${u1}$ and $u = ${u2}$. How many real values of $x$ do they give between them?`,
          branches: COUNT_LABELS.map((label, n) => ({
            label,
            outcome: n === 0 ? 'No real solutions.' : `${label} real solution${n === 1 ? '' : 's'}.`,
          })),
        },
      ],
      answer: [`$u = ${correct}$`, COUNT_LABELS[count]],
    };
  },
  solution: (params) => [
    { text: whyU(params) },
    { text: `The roots in $u$ are $${uRootsTex(params)[0]}$ and $${uRootsTex(params)[1]}$.` },
    { text: `${backLine(params, params.r1)} ${backLine(params, params.r2)}` },
    { text: `That makes ${COUNT_LABELS[solutionsOf(params).length].toLowerCase()} real solution${solutionsOf(params).length === 1 ? '' : 's'}.` },
  ],
};

export const disguiseGenerators = [
  spot,
  uTiles,
  isItFlow,
  uRoots,
  evenSteps,
  splitTree,
  countSolutions,
  evenSlider,
  rootTree,
  rootSolve,
  rootCheck,
  rootBackFlow,
  recipTiles,
  clearTiles,
  recipSolve,
  flipSteps,
  bracketSteps,
  bracketSolve,
  shiftSlider,
  countFlow,
];
