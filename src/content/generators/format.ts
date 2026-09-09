/**
 * Shared formatting for complex-number content.
 *
 * Two audiences, deliberately kept apart:
 *
 * - `*Tex` helpers produce what a person reads — "3 - 2i", never "3 + -2i".
 * - `*Answer` helpers produce what mathjs parses. These are never displayed,
 *   so they can be unambiguous rather than pretty.
 */

/** A signed coefficient as written by hand: 1i becomes i, -1i becomes -i. */
export function coeffTex(n: number, unit = 'i'): string {
  if (n === 1) return unit;
  if (n === -1) return `-${unit}`;
  return `${n}${unit}`;
}

/** "a + bi", collapsing signs so a negative imaginary part reads as a subtraction. */
export function complexTex(a: number, b: number): string {
  if (b === 0) return `${a}`;
  if (a === 0) return coeffTex(b);
  return b > 0 ? `${a} + ${coeffTex(b)}` : `${a} - ${coeffTex(Math.abs(b))}`;
}

/** The same value in a form mathjs parses without ambiguity. */
export function complexAnswer(a: number, b: number): string {
  if (b === 0) return `${a}`;
  return `(${a}) + (${b})*i`;
}

/** Wraps a complex number in brackets when it needs them, e.g. before a power. */
export function bracketedTex(a: number, b: number): string {
  return b === 0 ? `${a}` : `(${complexTex(a, b)})`;
}
