/**
 * Demonstration generators for the `numberLine` slide.
 *
 * Roadmap batch C8-widget ships the widget ahead of the courses that will ask
 * it (C8 Inequalities & the Modulus Function, and the inequalities level of
 * Linear Equations), so no lesson references these yet. They exist so the
 * property tests sweep the widget's slides from the first day, and as the
 * pattern those courses start from.
 *
 * - `nl-linear` solves a linear inequality to a ray; at difficulty 2 it is a
 *   pair joined by "or", one of them with a negative coefficient, and the
 *   answer is two rays.
 * - `nl-modulus` solves `|mx - c|` against a bound: an interval at difficulty
 *   1; at difficulty 2 either the outside of one (two rays) or a doubled
 *   coefficient that puts the ends on halves, drawn on a half-step line.
 *
 * **Every question is built outward from its answer.** The ends are drawn
 * first and the inequality worked out from them, so every end lands on a tick
 * and the working never passes through a fraction the line cannot show.
 *
 * The window is drawn after the answer, wide enough to leave a margin beyond
 * each end, so a ray visibly runs on past its dot and an interval never
 * starts at the edge of the line. At most twelve steps wide, which is what
 * keeps the ticks a thumb apart on a phone.
 */
import type { Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import { sumTex, termTex } from './calculus';

type Op = '<' | '<=' | '>' | '>=';

const OP_TEX: Record<Op, string> = { '<': '<', '<=': '\\le', '>': '>', '>=': '\\ge' };
const FLIP: Record<Op, Op> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=' };

const isStrict = (op: Op) => op === '<' || op === '>';
const pointsRight = (op: Op) => op === '>' || op === '>=';

/** ax + b as the learner reads it: `3x + 4`, `-x - 2`, `5x`. */
function linTex(a: number, b: number): string {
  return sumTex([termTex(a, 1), termTex(b, 0)]);
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const nonZero = (from: number, to: number) => range(from, to).filter((v) => v !== 0);

/**
 * A window of `width` units holding [lo, hi] with `margin` to spare each side.
 *
 * The left end is a whole number, so the first tick is always labelled. Throws
 * when the ends cannot fit, which the generators below rule out by
 * construction and the property tests would catch if they stopped doing so.
 */
export function windowFor(rng: Rng, lo: number, hi: number, width: number, margin: number) {
  const from = Math.ceil(hi + margin - width);
  const to = Math.floor(lo - margin);
  if (from > to) throw new Error(`no ${width}-wide window holds [${lo}, ${hi}]`);
  const min = rng.int(from, to);
  return { min, max: min + width };
}

/** One piece written the canonical way. */
function ray(k: number, op: Op): string {
  if (pointsRight(op)) return `${isStrict(op) ? '(' : '['}${k},inf)`;
  return `(-inf,${k}${isStrict(op) ? ')' : ']'}`;
}

/** What the drawing of `x op k` looks like, in words. */
function drawRay(k: number, op: Op): string {
  const dot = isStrict(op)
    ? `$x ${OP_TEX[op]} ${k}$ leaves $${k}$ out, so the dot at $${k}$ is hollow`
    : `$x ${OP_TEX[op]} ${k}$ includes $${k}$, so the dot at $${k}$ is filled`;
  return `${dot}, and the shading runs ${pointsRight(op) ? 'right' : 'left'} off the end of the line.`;
}

/* ---------- nl-linear ---------- */

interface LinearPart {
  a: number;
  b: number;
  op: Op;
  /** What x comes to, so the part reads `x FLIP?(op) k`. */
  k: number;
}

interface LinearParams {
  parts: LinearPart[];
  min: number;
  max: number;
}

/** The part solved: the side x ends up on once a is divided out. */
const solvedOp = (part: LinearPart): Op => (part.a < 0 ? FLIP[part.op] : part.op);
const partTex = (part: LinearPart) =>
  `${linTex(part.a, part.b)} ${OP_TEX[part.op]} ${part.a * part.k + part.b}`;

/** A part whose solution is x `want` k, with a coefficient of the given sign. */
function linearPart(rng: Rng, k: number, want: Op, negative: boolean): LinearPart {
  const size = rng.int(1, 5);
  const a = negative ? -size : size;
  return { a, b: rng.pick(nonZero(-9, 9)), op: a < 0 ? FLIP[want] : want, k };
}

function solvePart(part: LinearPart): SolutionStep[] {
  const { a, b, op, k } = part;
  const steps: SolutionStep[] = [
    {
      text: b > 0 ? `Subtract $${b}$ from both sides.` : `Add $${-b}$ to both sides.`,
      tex: `${termTex(a, 1)} ${OP_TEX[op]} ${a * k}`,
    },
  ];
  if (a !== 1) {
    steps.push({
      text:
        a < 0
          ? `Divide both sides by $${a}$. Dividing by a negative number turns the inequality round.`
          : `Divide both sides by $${a}$.`,
      tex: `x ${OP_TEX[solvedOp(part)]} ${k}`,
    });
  }
  return steps;
}

export const linearRay: Generator<LinearParams> = {
  id: 'nl-linear',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      const k = rng.int(-6, 6);
      const part = linearPart(rng, k, rng.pick<Op>(['<', '<=', '>', '>=']), false);
      return { parts: [part], ...windowFor(rng, k, k, 10, 2) };
    }
    // Two rays pointing away from each other, so "or" leaves a gap between
    // them rather than covering the whole line. One of the two is written with
    // a negative coefficient, which is where the sign flip gets tested.
    const k1 = rng.int(-6, 3);
    const k2 = k1 + rng.int(2, 7);
    const negativeLeft = rng.chance(0.5);
    const left = linearPart(rng, k1, rng.pick<Op>(['<', '<=']), negativeLeft);
    const right = linearPart(rng, k2, rng.pick<Op>(['>', '>=']), !negativeLeft);
    const parts = rng.chance(0.5) ? [left, right] : [right, left];
    return { parts, ...windowFor(rng, k1, k2, 12, 2) };
  },
  render({ parts, min, max }): Slide {
    const ordered = [...parts].sort((p, q) => p.k - q.k);
    const answer = ordered.map((part) => ray(part.k, solvedOp(part))).join('|');
    const prompt =
      parts.length === 1
        ? [
            { kind: 'prose' as const, text: 'Solve the inequality, then shade its solution set.' },
            { kind: 'display' as const, tex: partTex(parts[0]) },
          ]
        : [
            {
              kind: 'prose' as const,
              text: 'Shade every $x$ that satisfies at least one of these.',
            },
            {
              kind: 'display' as const,
              tex: `\\begin{gathered} ${partTex(parts[0])} \\\\ \\text{or} \\\\ ${partTex(parts[1])} \\end{gathered}`,
            },
          ];
    return { kind: 'numberLine', prompt, min, max, step: 1, answer };
  },
  solution({ parts }) {
    if (parts.length === 1) {
      const part = parts[0];
      return [...solvePart(part), { text: drawRay(part.k, solvedOp(part)) }];
    }
    const ordered = [...parts].sort((p, q) => p.k - q.k);
    return [
      { text: `Solve each inequality on its own. First $${partTex(parts[0])}$:` },
      ...solvePart(parts[0]),
      { text: `Then $${partTex(parts[1])}$:` },
      ...solvePart(parts[1]),
      {
        text: `"Or" keeps every $x$ that passes either one, so the set is both rays: ${ordered
          .map((part) => `$x ${OP_TEX[solvedOp(part)]} ${part.k}$`)
          .join(' and ')}, with the gap between them left unshaded.`,
      },
    ];
  },
};

/* ---------- nl-modulus ---------- */

interface ModulusParams {
  /** The inequality is |mx - c| op d. */
  m: 1 | 2;
  c: number;
  d: number;
  op: Op;
  min: number;
  max: number;
}

const modTex = ({ m, c, d, op }: ModulusParams) => `|${linTex(m, -c)}| ${OP_TEX[op]} ${d}`;

export const modulusSet: Generator<ModulusParams> = {
  id: 'nl-modulus',
  sample(rng, difficulty) {
    if (difficulty < 2) {
      // Within a distance of a centre: one bounded interval.
      const c = rng.int(-4, 4);
      const d = rng.int(1, 4);
      return { m: 1, c, d, op: rng.pick<Op>(['<', '<=']), ...windowFor(rng, c - d, c + d, 10, 1) };
    }
    if (rng.chance(0.5)) {
      // Outside a distance: two rays pointing apart.
      const c = rng.int(-4, 4);
      const d = rng.int(1, 4);
      return { m: 1, c, d, op: rng.pick<Op>(['>', '>=']), ...windowFor(rng, c - d, c + d, 12, 2) };
    }
    // A doubled x, with c + d odd so both ends fall on halves. Six units at
    // half steps is twelve ticks, the most a phone holds, which is also what
    // caps d: the outside case needs a whole unit spare either end.
    const outside = rng.chance(0.5);
    const d = rng.int(1, outside ? 3 : 4);
    const c = rng.pick(range(-5, 5).filter((value) => (value + d) % 2 !== 0));
    const op = rng.pick<Op>(outside ? ['>', '>='] : ['<', '<=']);
    return { m: 2, c, d, op, ...windowFor(rng, (c - d) / 2, (c + d) / 2, 6, outside ? 1 : 0.5) };
  },
  render(params): Slide {
    const { m, c, d, op, min, max } = params;
    const lo = (c - d) / m;
    const hi = (c + d) / m;
    const open = isStrict(op);
    const answer = pointsRight(op)
      ? `(-inf,${lo}${open ? ')' : ']'}|${open ? '(' : '['}${hi},inf)`
      : `${open ? '(' : '['}${lo},${hi}${open ? ')' : ']'}`;
    return {
      kind: 'numberLine',
      prompt: [
        { kind: 'prose', text: 'Shade the solution set.' },
        { kind: 'display', tex: modTex(params) },
      ],
      min,
      max,
      step: m === 2 ? 0.5 : 1,
      answer,
    };
  },
  solution(params) {
    const { m, c, d, op } = params;
    const lo = (c - d) / m;
    const hi = (c + d) / m;
    const inner = linTex(m, -c);
    const shift = c > 0 ? `Add $${c}$` : c < 0 ? `Subtract $${-c}$` : '';
    const halve = m === 2 ? (shift ? ', then halve' : 'Halve') : '';
    const undo = `${shift}${halve}`;
    const steps: SolutionStep[] = [];

    if (!pointsRight(op)) {
      const rel = OP_TEX[op];
      steps.push({
        text: `$${modTex(params)}$ says $${inner}$ is within $${d}$ of zero, on either side.`,
        tex: `${-d} ${rel} ${inner} ${rel} ${d}`,
      });
      if (undo) steps.push({ text: `${undo} all the way along.`, tex: `${lo} ${rel} x ${rel} ${hi}` });
      steps.push({
        text: isStrict(op)
          ? `Both ends are left out, so both dots are hollow and the stretch between them is shaded.`
          : `Both ends are included, so both dots are filled and the stretch between them is shaded.`,
      });
      return steps;
    }

    const rel = OP_TEX[op];
    const flip = OP_TEX[FLIP[op]];
    steps.push({
      text: `$${modTex(params)}$ says $${inner}$ is at least $${d}$ away from zero, on one side or the other.`,
      tex: `${inner} ${flip} ${-d} \\quad \\text{or} \\quad ${inner} ${rel} ${d}`,
    });
    if (undo) {
      steps.push({
        text: `${undo} in each.`,
        tex: `x ${flip} ${lo} \\quad \\text{or} \\quad x ${rel} ${hi}`,
      });
    }
    steps.push({
      text: `Two rays pointing apart, from $${lo}$ to the left and from $${hi}$ to the right, with ${
        isStrict(op) ? 'hollow dots, since the ends are left out' : 'filled dots, since the ends are included'
      }.`,
    });
    return steps;
  },
};

export const numberLineGenerators = [linearRay, modulusSet];
