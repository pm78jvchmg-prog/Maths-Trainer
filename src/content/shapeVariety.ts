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
 *
 * Neither list is meant to survive phase A. When one reaches zero the suite
 * says so and fails until the list, its ceiling and the guard's use of it are
 * deleted — see `retires an allowlist once it is empty` in
 * `generators.test.ts`. An empty list left in place is still a guard with an
 * exception in it, and re-populating it would cost one line rather than a
 * raised ceiling.
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
  'tf-l1-periodic': 2,
  'tf-l1-shift': 2,
  'tf-l2-speed': 2,
  'df-l1-index': 2,
  'df-l2-quotient': 2,
  'df-l3-roots': 2,
  'df-l4-trig': 2,
};

/** The list above may only shrink. Edit this downwards, never upwards. */
export const WIDGET_KIND_CEILING = 7;

/**
 * Lessons that ask one generator family more than `MAX_PER_FAMILY` times, and
 * how many times the worst offender is asked today.
 *
 * Far longer than the widget-kind list — it started at 102 of 105 lessons —
 * because a seven exercise deck built from two or three generators breaks this
 * rule by construction. Phase A widens the decks; this list is how that
 * progress is measured. Exponents & Radicals left both lists in batch A3,
 * Quadratics in A4, Logarithms in A5, Complex Numbers in A7, Integration in A9
 * and Vectors & Matrices in A10.
 */
export const GENERATOR_REPETITION_ALLOWLIST: Readonly<Record<string, number>> = {
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
};

/** The list above may only shrink. Edit this downwards, never upwards. */
export const GENERATOR_REPETITION_CEILING = 25;
