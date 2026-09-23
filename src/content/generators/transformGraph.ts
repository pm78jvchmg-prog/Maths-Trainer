/**
 * The graph-transformation widget's first two generators.
 *
 * One asks each direction of the `transform` slide: `transform-apply` names a
 * target equation and asks for the curve, `transform-match` draws a target
 * curve and asks for the transformation. No lesson asks either yet — the
 * Functions & Transformations course comes in a later batch — but the property
 * sweep in `generators.test.ts` covers them all the same.
 *
 * Difficulty 1 is one move; difficulty 2 combines two different ones. Every
 * number comes from the rng, so one seed is one question.
 *
 * Some moves are left out for some curves because they draw a curve another
 * move already draws, and a question the learner cannot tell apart from a
 * different one is a wasted slide:
 *
 * - `x^2` and `|x|` are even, so a flip left to right changes nothing.
 * - `|x|` and `1/x` stretched across are the same as stretched up (`|x/2|` is
 *   `|x|/2`, and `1/(x/2)` is `2/x`).
 * - `2^x` stretched up is `2^x` moved across (`2 * 2^x` is `2^(x + 1)`).
 *
 * The grader does not rely on any of that. It compares curves, so a learner
 * who finds the other route to the same picture is marked right; these
 * exclusions only stop two questions that look identical from both being
 * asked.
 */
import type { Block, Generator, Slide, SolutionStep } from '../types';
import type { Rng } from '../../engine/rng';
import {
  BASES,
  IDENTITY,
  encodeTransform,
  factorTex,
  sameCurve,
  transformTex,
  transformed,
  type BaseCurve,
  type Transform,
} from '../transform';

type Move = 'moveX' | 'moveY' | 'stretchX' | 'stretchY' | 'flipX' | 'flipY';

interface TransformParams {
  base: BaseCurve;
  /** In the order the worked solution describes them: stretches and flips, then moves. */
  moves: Move[];
  t: Transform;
}

const CURVES: BaseCurve[] = ['square', 'cube', 'abs', 'sqrt', 'sin', 'recip', 'exp2'];

/** Moves that would duplicate another move on this curve; see the header. */
const DUPLICATE_MOVES: Partial<Record<BaseCurve, Move[]>> = {
  square: ['flipX'],
  abs: ['flipX', 'stretchX'],
  recip: ['stretchX'],
  exp2: ['stretchY'],
};

/** The order the solution walks them in, which is the order the curve is built. */
const ORDER: Move[] = ['stretchX', 'stretchY', 'flipX', 'flipY', 'moveX', 'moveY'];

const FACTORS = [1 / 3, 1 / 2, 2, 3];

function nonZero(rng: Rng, most: number): number {
  return rng.sign() * rng.int(1, most);
}

/** Sets one move's parameter, drawn from the rng. */
function applyMove(rng: Rng, base: BaseCurve, t: Transform, move: Move): Transform {
  switch (move) {
    case 'moveX':
      return { ...t, h: nonZero(rng, 4) };
    case 'moveY':
      // `sin x` sits in a shorter window, so it cannot go as far and stay in view.
      return { ...t, k: nonZero(rng, base === 'sin' ? 2 : 3) };
    case 'stretchX':
      return { ...t, sx: rng.pick(FACTORS) };
    case 'stretchY':
      return { ...t, sy: rng.pick(FACTORS) };
    case 'flipX':
      return { ...t, fx: true };
    case 'flipY':
      return { ...t, fy: true };
  }
}

/**
 * Whether enough of the target is on screen to be matched.
 *
 * A tenth of the window's width must show the curve, defined and inside the
 * window: a target that has left the picture cannot be laid a curve onto, and
 * a `sqrt x` moved to the far right would be a stub. Measured on a finer comb
 * than the thirteen grading points, which would call plain `x^3` off screen —
 * it leaves a twelve-high window within two units of the middle, between
 * grading points.
 */
export function targetVisible(base: BaseCurve, t: Transform): boolean {
  const { window } = BASES[base];
  const f = transformed(base, t);
  const comb = Array.from({ length: 49 }, (_, i) => window.xMin + ((window.xMax - window.xMin) * i) / 48);
  const seen = comb.filter((x) => {
    const y = f(x);
    return Number.isFinite(y) && y >= window.yMin && y <= window.yMax;
  });
  return seen.length >= 5;
}

function sample(rng: Rng, difficulty: number): TransformParams {
  // Bounded rather than open-ended, so a draw that keeps landing on an excluded
  // case still returns. Nearly every draw passes first time; the fixed
  // question after the loop is only there so the function is total.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const base = rng.pick(CURVES);
    const allowed = ORDER.filter((move) => !(DUPLICATE_MOVES[base] ?? []).includes(move));
    const count = difficulty >= 2 ? 2 : 1;
    const picked = rng.sample(allowed, count);
    // A flip left to right on a curve already moved across reflects it about
    // its new position, which reads as `f(-(x - 3))` — true, but a harder idea
    // than this pair of moves is meant to ask about.
    if (picked.includes('flipX') && picked.includes('moveX')) continue;

    const moves = ORDER.filter((move) => picked.includes(move));
    const t = moves.reduce((acc, move) => applyMove(rng, base, acc, move), IDENTITY);

    // Never the identity curve: an untouched draft must not be the answer.
    if (sameCurve(base, t, IDENTITY, BASES[base].window)) continue;
    if (!targetVisible(base, t)) continue;
    return { base, moves, t };
  }
  return { base: 'square', moves: ['moveY'], t: { ...IDENTITY, k: 2 } };
}

/** What `f` is, for the prompt. */
function curveIs(base: BaseCurve): string {
  return `The dashed curve is $y = f(x)$, where $f(x) = ${BASES[base].tex}$.`;
}

/** One line of working per move, in the learner's numbers. */
function moveStep({ t }: TransformParams, move: Move): SolutionStep {
  switch (move) {
    case 'moveX':
      return t.h > 0
        ? { text: `Writing $x - ${t.h}$ in place of $x$ moves the curve ${t.h} to the right.` }
        : { text: `Writing $x + ${-t.h}$ in place of $x$ moves the curve ${-t.h} to the left.` };
    case 'moveY':
      return t.k > 0
        ? { text: `Adding ${t.k} outside the $f$ moves the curve ${t.k} up.` }
        : { text: `Taking away ${-t.k} outside the $f$ moves the curve ${-t.k} down.` };
    case 'stretchX':
      return {
        text: `Multiplying $x$ by $${factorTex(1 / t.sx)}$ inside the $f$ stretches the curve parallel to the $x$-axis, scale factor $${factorTex(t.sx)}$.`,
      };
    case 'stretchY':
      return {
        text: `Multiplying by $${factorTex(t.sy)}$ outside the $f$ stretches the curve parallel to the $y$-axis, scale factor $${factorTex(t.sy)}$.`,
      };
    case 'flipX':
      return { text: 'A minus sign on the $x$ inside the $f$ reflects the curve in the $y$-axis.' };
    case 'flipY':
      return { text: 'A minus sign in front of the $f$ reflects the curve in the $x$-axis.' };
  }
}

function solution(params: TransformParams, direction: 'apply' | 'match'): SolutionStep[] {
  const steps: SolutionStep[] = [
    direction === 'apply'
      ? { text: `Start from $y = f(x)$ with $f(x) = ${BASES[params.base].tex}$ and read the target one change at a time.` }
      : { text: `Start from $y = f(x)$ with $f(x) = ${BASES[params.base].tex}$ and compare it with the shaded curve.` },
    ...params.moves.map((move) => moveStep(params, move)),
    { tex: transformTex(params.t) },
  ];
  if (direction === 'match') {
    steps.push({ text: 'Any set of moves that draws the same curve is marked right.' });
  }
  return steps;
}

function render(params: TransformParams, direction: 'apply' | 'match'): Slide {
  const prompt: Block[] =
    direction === 'apply'
      ? [
          { kind: 'prose', text: `${curveIs(params.base)} Move your curve onto` },
          { kind: 'display', tex: transformTex(params.t) },
        ]
      : [
          {
            kind: 'prose',
            text: `${curveIs(params.base)} Move your curve onto the shaded one. Its equation builds as you go.`,
          },
        ];
  return {
    kind: 'transform',
    direction,
    base: params.base,
    window: BASES[params.base].window,
    answer: encodeTransform(params.t),
    prompt,
  };
}

const transformApply: Generator<TransformParams> = {
  id: 'transform-apply',
  sample,
  render: (params) => render(params, 'apply'),
  solution: (params) => solution(params, 'apply'),
};

const transformMatch: Generator<TransformParams> = {
  id: 'transform-match',
  sample,
  render: (params) => render(params, 'match'),
  solution: (params) => solution(params, 'match'),
};

export const transformGraphGenerators = [transformApply, transformMatch];
