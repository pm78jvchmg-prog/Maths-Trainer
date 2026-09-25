/**
 * Shared formatting and sampling helpers for the vector and matrix generators.
 *
 * Two engine constraints shape every question in both files, and both are
 * worth knowing before editing either.
 *
 * 1. **The checker grades scalars.** `evaluateAt` treats anything that is not a
 *    number or a complex number as a domain hole, so a typed answer that
 *    evaluates to a vector or a matrix comes back `indeterminate` rather than
 *    correct. So nothing here asks for one. Answers are either a scalar — a
 *    magnitude, a dot product, a determinant — or a set of components placed as
 *    tiles.
 *
 * 2. **A tiles template is split into independent TeX fragments**, one per
 *    literal segment between the blanks, and each is rendered on its own. A
 *    `\begin{pmatrix}` that opened before a blank and closed after it would be
 *    two invalid fragments, and KaTeX runs with `throwOnError: false`, so the
 *    learner would see red error text rather than a matrix.
 *
 *    Hence the labelled-component templates — `\mathbf{i}: \; {0}` — rather
 *    than bracketed column vectors. The question itself still shows proper
 *    column-vector and matrix notation, because a prompt is one whole TeX
 *    string and can use any environment it likes.
 *
 * Every tile is a plain signed number, deliberately: one vocabulary, so a
 * learner cannot be marked wrong for placing a correctly-valued tile that was
 * formatted for the other slot.
 */
import { options } from '../choiceVariant';
import { coeffTex } from './format';

/**
 * The last line of solving `c k = rhs` for an unknown: `3k = 12 \implies k = 4`,
 * `-k = 12 \implies k = -12`, and for c = 1 just `k = 12`, since there is
 * nothing to divide by and `k = 12 \implies k = 12` reads as a typo. `then`
 * is what follows the arrow, so a step can show its division.
 */
export function solvedForTex(c: number, letter: string, rhs: number, then: string): string {
  return c === 1 ? `${letter} = ${rhs}` : `${coeffTex(c, letter)} = ${rhs} \\implies ${then}`;
}

export function nonZero(value: number, fallback: number): number {
  return value === 0 ? fallback : value;
}

/** A tile bank keeping its answers with multiplicity. See quadratics.ts. */
export function bankOf(answer: string[], distractors: string[]): string[] {
  const needed = new Set(answer);
  const extras = [...new Set(distractors)].filter((t) => !needed.has(t));
  // Distractors are computed from the question's own numbers and can all
  // collide with the answer; pad with numeric near-misses so a bank is never
  // just the answer laid out in a different order.
  for (let offset = 1; extras.length < 2 && offset <= 20; offset += 1) {
    for (const token of answer) {
      const n = Number(token);
      if (Number.isNaN(n)) continue;
      const candidate = `${n + offset}`;
      if (!needed.has(candidate) && !extras.includes(candidate)) extras.push(candidate);
    }
  }
  return [...answer, ...extras].sort();
}

/** Choice options with no two rendering the same label. */
export function distinctOptions<T extends { label: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => (seen.has(option.label) ? false : (seen.add(option.label), true)));
}

/** A column vector. Safe inside a prompt, which is one whole TeX string. */
export function columnTex(x: number, y: number): string {
  return `\\begin{pmatrix} ${x} \\\\ ${y} \\end{pmatrix}`;
}

/** A 2x2 matrix, likewise for prompts only. */
export function matrixTex(a: number, b: number, c: number, d: number): string {
  return `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}`;
}

/** The component template used by every vector answer. */
export const VECTOR_TEMPLATE = `\\mathbf{i}: \\; {0} \\qquad \\mathbf{j}: \\; {1}`;

/** The entry template used by every 2x2 matrix answer, read row by row. */
export const MATRIX_TEMPLATE =
  `\\text{row } 1: \\; {0} \\quad {1} \\qquad \\text{row } 2: \\; {2} \\quad {3}`;

/* ---------- two products before one sum ---------- */

/**
 * Six whole options around the right one, negatives allowed.
 *
 * Separate from the magnitude slide's `offer`, which filters negatives out: a
 * dot product and a determinant are both routinely negative, and a bank that
 * quietly dropped every negative candidate would leak the sign of the answer.
 */
export function signedOffer(correct: number, ...near: number[]): string[] {
  const seen = new Set([correct]);
  const out = [correct];
  for (const value of near) {
    if (out.length >= 6) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  for (let step = 1; out.length < 6; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (out.length >= 6) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out.sort((x, y) => x - y).map(String);
}

/** Three options beside the right one, from the slips a formula invites. */
export function signedChoices(correct: number, wrong: number[]) {
  const seen = new Set([correct]);
  const picked: number[] = [];
  for (const value of wrong) {
    if (picked.length === 3) break;
    if (!Number.isInteger(value) || seen.has(value)) continue;
    seen.add(value);
    picked.push(value);
  }
  for (let step = 1; picked.length < 3; step += 1) {
    for (const candidate of [correct + step, correct - step]) {
      if (picked.length === 3) break;
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      picked.push(candidate);
    }
  }
  return options(
    { tex: `${correct}` },
    ...picked.sort((x, y) => x - y).map((value) => ({ tex: `${value}` })),
  );
}
