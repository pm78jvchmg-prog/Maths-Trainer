/**
 * The shape-variety bar, and the lessons that do not clear it yet.
 *
 * The owner's complaint was that a lesson's exercises repeat: not the same
 * numbers — `resolveDeck` already de-duplicates those — but the same *question
 * and answer style*, over and over. Two rules pin that down, and
 * `generators.test.ts` enforces both over every lesson in every course:
 *
 * 1. A lesson's exercises use at least `MIN_WIDGET_KINDS` widget kinds.
 * 2. No one generator family is asked more than `MAX_PER_FAMILY` times.
 *
 * Neither rule can be met today, so each carries an allowlist of the lessons
 * that currently fail it, recording how far off each one is. The allowlist is a
 * ratchet: a lesson not on it must pass, an entry that has become correct must
 * be deleted, and an entry that has improved without clearing the bar must be
 * tightened. All three are asserted, so the lists can only ever shrink — which
 * is what phase A of `docs/ROADMAP.md` spends ten batches doing, and what A11
 * finishes by emptying them.
 *
 * Each list also has a `*_CEILING` holding its exact length, asserted. No test
 * can stop someone editing a list, but adding an entry now means raising a
 * number whose comment says it only goes down, in the same diff, where a
 * reviewer sees it.
 */

/** Distinct widget kinds a lesson's exercises must offer between them. */
export const MIN_WIDGET_KINDS = 3;

/**
 * How often one generator family may be asked inside a lesson.
 *
 * Counted by family (`familyOf`), not by registered id, so `expand` asked three
 * times and `expand+choice` asked three more is six asks of one skill rather
 * than two compliant threes. The `+choice` form is a cheap way to vary the
 * *widget*, which is rule 1's business; it does not make the question new.
 */
export const MAX_PER_FAMILY = 2;

/**
 * Lessons whose exercises cannot reach `MIN_WIDGET_KINDS`, and the number of
 * kinds each manages today.
 *
 * Measured as the smallest number of distinct kinds a *sitting* can show, not
 * the number the generators could reach between them: a generator that renders
 * either an `expression` or a `choice` counts towards whichever of those the
 * rest of the deck is already using. Today the two readings agree on all 105
 * lessons, so this is the stricter one at no cost.
 */
export const WIDGET_KIND_ALLOWLIST: Readonly<Record<string, number>> = {
  'er-l2-equations': 2,
  'er-l3-add': 2,
  'er-l3-rationalise': 2,
  'qd-l1-expand': 2,
  'qd-l1-factorise': 2,
  'qd-l1-squares': 2,
  'qd-l1-coefficient': 2,
  'qd-l2-solve': 2,
  'qd-l2-square': 2,
  'qd-l3-turning': 2,
  'tf-l1-periodic': 2,
  'tf-l1-shift': 2,
  'tf-l2-speed': 2,
  'tf-l3-period-shift': 2,
  'lg-l1-meaning': 2,
  'lg-l1-domain': 2,
  'lg-l2-combine': 2,
  'lg-l3-exponential': 2,
  'lg-l3-natural': 2,
  'lg-l3-growth': 2,
  'lg-l3-models': 2,
  'cn-l1-arithmetic': 2,
  'cn-l1-complex': 2,
  'cn-l1-quadratics': 2,
  'cn-l2-multiply': 2,
  'cn-l2-division': 2,
  'cn-l3-sqrt': 2,
  'cn-l4-powers': 2,
  'cn-l4-de-moivre': 2,
  'df-l1-index': 2,
  'df-l2-product': 2,
  'df-l2-quotient': 2,
  'df-l3-chain': 2,
  'df-l3-roots': 2,
  'df-l4-trig': 2,
  'vm-l1-components': 2,
  'vm-l1-scalars': 2,
  'vm-l2-add': 2,
  'vm-l2-combine': 2,
};

/** The list above may only shrink. Edit this downwards, never upwards. */
export const WIDGET_KIND_CEILING = 39;

/**
 * Lessons that ask one generator family more than `MAX_PER_FAMILY` times, and
 * how many times the worst offender is asked today.
 *
 * Far longer than the widget-kind list — 85 of 105 lessons, and 102 of them
 * before phase A started — because a seven exercise deck built from two or
 * three generators breaks this rule by construction. Phase A widens the decks;
 * this list is how that progress is measured.
 */
export const GENERATOR_REPETITION_ALLOWLIST: Readonly<Record<string, number>> = {
  'er-l1-multiply': 6,
  'er-l1-divide': 5,
  'er-l1-power-of-power': 4,
  'er-l1-coefficients': 5,
  'er-l1-negative': 5,
  'er-l2-fractional': 5,
  'er-l2-powers-of-roots': 3,
  'er-l2-equations': 6,
  'er-l3-simplify': 5,
  'er-l3-multiply': 5,
  'er-l3-add': 7,
  'er-l3-rationalise': 5,
  'qd-l1-expand': 7,
  'qd-l1-factorise': 7,
  'qd-l1-squares': 7,
  'qd-l1-coefficient': 7,
  'qd-l2-solve': 7,
  'qd-l2-square': 7,
  'qd-l2-formula': 5,
  'qd-l2-discriminant': 4,
  'qd-l3-symmetry': 5,
  'qd-l3-turning': 6,
  'qd-l3-roots': 4,
  'tf-l1-periodic': 4,
  'tf-l1-period': 5,
  'tf-l1-shift': 5,
  'tf-l1-midline': 6,
  'tf-l1-amplitude': 5,
  'tf-l2-sine': 5,
  'tf-l2-cosine': 5,
  'tf-l2-symmetry': 5,
  'tf-l2-solve': 6,
  'tf-l2-identity': 6,
  'tf-l2-speed': 5,
  'tf-l3-amplitude-shift': 3,
  'tf-l3-period-shift': 3,
  'tf-l3-period-formula': 6,
  'lg-l1-meaning': 4,
  'lg-l1-evaluate': 5,
  'lg-l1-solve': 5,
  'lg-l1-domain': 5,
  'lg-l2-add': 3,
  'lg-l2-power': 3,
  'lg-l2-combine': 7,
  'lg-l2-equations': 5,
  'lg-l3-exponential': 7,
  'lg-l3-natural': 6,
  'lg-l3-growth': 6,
  'lg-l3-models': 3,
  'cn-l1-arithmetic': 5,
  'cn-l1-complex': 4,
  'cn-l1-quadratics': 6,
  'cn-l2-multiply': 5,
  'cn-l2-conjugates': 4,
  'cn-l2-division': 4,
  'cn-l3-plane': 3,
  'cn-l3-modulus': 4,
  'cn-l3-sqrt': 5,
  'cn-l4-argument': 4,
  'cn-l4-polar': 6,
  'cn-l4-powers': 4,
  'cn-l4-de-moivre': 6,
  'df-l1-power': 5,
  'df-l1-sums': 5,
  'df-l1-index': 6,
  'df-l1-tangent': 5,
  'df-l2-product': 6,
  'df-l2-quotient': 6,
  'df-l3-chain': 6,
  'df-l3-roots': 6,
  'df-l4-trig': 6,
  'df-l4-exp': 5,
  'df-l4-combine': 6,
  'vm-l1-components': 7,
  'vm-l1-scalars': 5,
  'vm-l1-magnitude': 7,
  'vm-l1-dot': 5,
  'vm-l2-add': 7,
  'vm-l2-combine': 6,
  'vm-l2-multiply': 5,
  'vm-l2-vector': 5,
  'vm-l3-determinant': 7,
  'vm-l3-singular': 6,
  'vm-l3-inverse': 5,
  'vm-l3-solve': 5,
};

/** The list above may only shrink. Edit this downwards, never upwards. */
export const GENERATOR_REPETITION_CEILING = 85;
