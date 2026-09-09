/**
 * Answer checking by numeric probing.
 *
 * We do not try to prove two expressions equal by rearranging symbols. mathjs's
 * `simplify` cannot reliably show that sin(x)^2 + cos(x)^2 is 1, nor that two
 * integration-by-parts results agree, and every near-miss it fails on would be
 * marked wrong for a learner who was actually right.
 *
 * Instead both expressions are evaluated at many randomised points. If they
 * agree everywhere they are treated as equal. This is what online homework
 * systems do, and it is probabilistic rather than proof: a wrong answer that
 * coincidentally matches at every sample point would be accepted. With points
 * drawn off the integers that outcome is vanishingly unlikely.
 */
import { makeRng } from './rng';
import {
  parseExpression,
  evaluateAt,
  samplePoint,
  distance,
  magnitude,
  type Scalar,
} from './expression';

export type Verdict =
  /** The two expressions agree. */
  | { status: 'correct' }
  /** They genuinely disagree. */
  | { status: 'incorrect' }
  /** The input could not be read — shown differently from a wrong answer. */
  | { status: 'invalid'; message: string }
  /** Too few points evaluated on both sides to reach a trustworthy verdict. */
  | { status: 'indeterminate'; message: string };

export interface CheckOptions {
  /**
   * `exact`        — the two expressions must agree pointwise.
   * `upToConstant` — they may differ by any constant. This is the indefinite
   *                  integral case: every valid antiderivative passes, whether
   *                  or not the learner wrote "+ C", while a genuinely wrong
   *                  one still fails.
   */
  mode?: 'exact' | 'upToConstant';
  /** Sample over the reals or the complex plane. Complex courses need `complex`. */
  domain?: 'real' | 'complex';
  /** Symbols standing for an arbitrary constant. Bound to 0 when probing. */
  arbitraryConstants?: readonly string[];
  /** Fix the seed so a check is reproducible. Tests rely on this. */
  seed?: number | string;
}

export interface ProbePolicy {
  /** How many points to draw per check. */
  sampleCount: number;
  /** Minimum points that must evaluate on *both* sides before we trust a verdict. */
  minValidPoints: number;
  /** Fraction of valid points that must agree in order to accept (0..1). */
  agreementThreshold: number;
  /** Relative tolerance: |a−b| ≤ relativeTolerance × max(1, |a|, |b|). */
  relativeTolerance: number;
}

/**
 * The accuracy dial for the whole app.
 *
 * TODO(human): return the four numbers below.
 *
 * What each one trades off:
 *
 * - `sampleCount` — more points make a coincidental match less likely, at a
 *   linear cost in evaluation time. Checking happens once per tap, so anything
 *   up to a few dozen is imperceptible. Somewhere in 12–40 is sensible.
 *
 * - `minValidPoints` — expressions have domain holes (1/x at 0, log of a
 *   negative). Points where either side fails to evaluate are discarded, so a
 *   check can end up with far fewer usable points than it drew. Below this
 *   floor we return `indeterminate` rather than guess. Too high and legitimate
 *   answers on narrow domains become unanswerable; too low and a verdict can
 *   rest on two lucky points. Roughly a third of `sampleCount` is a reasonable
 *   starting instinct.
 *
 * - `agreementThreshold` — the interesting one, and squeezed from both sides.
 *
 *   Below 1.0 you tolerate the occasional disagreeing point. That matters
 *   because floating point misbehaves near poles and removable singularities:
 *   (x^2-1)/(x-1) is algebraically x+1, but sampled very close to x = 1 the
 *   subtraction cancels almost every significant digit and the two sides can
 *   differ by far more than the tolerance. One unlucky point should not fail an
 *   otherwise perfect answer.
 *
 *   Set it too low, though, and you accept expressions that agree on only part
 *   of the domain: |x| and x agree at about half of all real points, so
 *   anything at or under 0.5 marks |x| correct for x. Think 0.85–0.95.
 *
 * - `relativeTolerance` — doubles carry ~15 significant digits, and a chain of
 *   trig or exponential operations loses several. Too tight and correct answers
 *   fail on rounding alone; too loose and genuinely different expressions look
 *   equal. Something around 1e-9 to 1e-6 is the usual range.
 *
 * Once you have filled this in, `npm test` reports what your choice accepts and
 * rejects — including a deliberately awkward |x| vs x case, and complex
 * identities that hold on the principal branch alongside ones that do not.
 */
export function probePolicy(): ProbePolicy {
  throw new Error(
    'probePolicy() is not implemented yet — fill in the marked section in src/engine/equivalence.ts',
  );
}

/** Are two scalars equal to within the policy's relative tolerance? */
function closeEnough(a: Scalar, b: Scalar, relativeTolerance: number): boolean {
  const scale = Math.max(1, magnitude(a), magnitude(b));
  return distance(a, b) <= relativeTolerance * scale;
}

/**
 * Compare a learner's answer against the expected one.
 *
 * `expected` comes from our own content, so a parse failure there is a bug in a
 * generator and throws loudly. `userInput` is untrusted and fails softly.
 */
export function checkAnswer(
  userInput: string,
  expected: string,
  options: CheckOptions = {},
): Verdict {
  const {
    mode = 'exact',
    domain = 'real',
    arbitraryConstants = ['C'],
    seed = 'probe',
  } = options;

  const policy = probePolicy();

  const constants = mode === 'upToConstant' ? arbitraryConstants : [];

  const user = parseExpression(userInput, constants);
  if (!user.ok) return { status: 'invalid', message: user.error };

  const target = parseExpression(expected, constants);
  if (!target.ok) {
    throw new Error(`Malformed expected answer in content: ${expected} (${target.error})`);
  }

  // Arbitrary constants are bound to 0 so "x^2/2" and "x^2/2 + C" probe alike.
  const zeroed: Record<string, unknown> = {};
  for (const name of constants) zeroed[name] = 0;

  const variables = [...new Set([...user.variables, ...target.variables])].sort();

  // No variables: a single evaluation settles it. Covers arithmetic such as 3i + 7i.
  if (variables.length === 0) {
    const a = evaluateAt(user.node, { ...zeroed });
    const b = evaluateAt(target.node, { ...zeroed });
    if (a === undefined || b === undefined) {
      return { status: 'indeterminate', message: 'That expression could not be evaluated.' };
    }
    return closeEnough(a, b, policy.relativeTolerance)
      ? { status: 'correct' }
      : { status: 'incorrect' };
  }

  const rng = makeRng(seed);
  let valid = 0;
  let agreeing = 0;
  // For `upToConstant`, the running reference difference between the two sides.
  let referenceGap: Scalar | undefined;

  for (let attempt = 0; attempt < policy.sampleCount; attempt++) {
    const scope = { ...zeroed, ...samplePoint(rng, variables, domain) };
    const a = evaluateAt(user.node, scope);
    const b = evaluateAt(target.node, scope);
    if (a === undefined || b === undefined) continue; // domain hole
    valid++;

    if (mode === 'exact') {
      if (closeEnough(a, b, policy.relativeTolerance)) agreeing++;
      continue;
    }

    // upToConstant: the two sides may sit apart, but by the *same* amount everywhere.
    const gap = gapBetween(a, b);
    if (referenceGap === undefined) {
      referenceGap = gap;
      agreeing++;
    } else if (closeEnough(gap, referenceGap, policy.relativeTolerance)) {
      agreeing++;
    }
  }

  if (valid < policy.minValidPoints) {
    return {
      status: 'indeterminate',
      message: 'That answer could not be checked over enough of its domain.',
    };
  }

  return agreeing / valid >= policy.agreementThreshold
    ? { status: 'correct' }
    : { status: 'incorrect' };
}

function gapBetween(a: Scalar, b: Scalar): Scalar {
  const ar = typeof a === 'number' ? a : a.re;
  const ai = typeof a === 'number' ? 0 : a.im;
  const br = typeof b === 'number' ? b : b.re;
  const bi = typeof b === 'number' ? 0 : b.im;
  return ai === 0 && bi === 0 ? ar - br : { re: ar - br, im: ai - bi };
}
