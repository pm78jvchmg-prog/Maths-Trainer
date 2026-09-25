/**
 * The `reduce` widget's draft, read back as working.
 *
 * Kept apart from `reduceSlide.tsx` so the answer check in `slides.ts` can ask
 * whether a line is finished without importing the widget, which imports
 * `slides.ts` back.
 */
import { parseMove } from '../engine/session';
import { landingOf, reduceAt, targetAt, type Expr, type Move, type Path } from '../content/expr';

/** The draft's moves, read by the parser the grade uses; unreadable tokens are skipped. */
export const movesOf = (tokens: readonly string[]): Move[] =>
  tokens.map(parseMove).filter((move): move is Move => move !== undefined);

/**
 * Every line of working the moves produce, with the node each one collapsed.
 *
 * Unlike the grader's `replay`, a wrong value does not stop the walk: the line
 * settles on the number the learner gave, so the picture shows their working
 * and *Check* stays reachable. The learner finds out by checking.
 */
export function workingLines(expr: Expr, moves: Move[]): { expr: Expr; filled?: Path }[] {
  const out: { expr: Expr; filled?: Path }[] = [{ expr }];
  let current = expr;
  for (const move of moves) {
    const node = targetAt(current, move.path);
    // A move that no longer applies — the content changed under a stored answer
    // — stops the replay rather than throwing.
    if (!node || node.kind === 'num') break;
    current = reduceAt(current, move.path, move.value);
    out.push({ expr: current, filled: landingOf(move.path) });
  }
  return out;
}

/** True once the expression is a single number, so *Check* may go live. */
export function reduceComplete(expr: Expr, answer: unknown): boolean {
  if (!Array.isArray(answer)) return false;
  const worked = workingLines(expr, movesOf(answer));
  return worked[worked.length - 1].expr.kind === 'num';
}
