/**
 * The shape-variety bar.
 *
 * The owner's complaint was that a lesson's exercises repeat: not the same
 * numbers — `resolveDeck` already de-duplicates those — but the same *question
 * and answer style*, over and over. Two rules pin that down, and
 * `generators.test.ts` enforces both over every lesson in every course:
 *
 * 1. A lesson's exercises use at least `MIN_WIDGET_KINDS` widget kinds.
 * 2. No one generator family is asked more than `MAX_PER_FAMILY` times.
 *
 * Both are unconditional. They did not start that way: batch A1 could not have
 * turned them on, since 47 of the 105 lessons then in the library missed the
 * first and 102 missed the second. So each rule carried an allowlist of the
 * lessons that failed it, recording how far off each one was and pinned by a
 * ceiling holding the list's exact length. The lists were ratchets — a lesson
 * off the list had to pass, an entry that had become correct had to go, and an
 * entry that had improved without clearing the bar had to be tightened — so
 * they could only ever shrink, which is what phase A of `docs/ROADMAP.md`
 * spent ten batches doing.
 *
 * They are gone now, and nothing here takes their place. An empty list left
 * behind would still read as a guard with an exception in it, and
 * re-populating it would cost one line rather than a raised ceiling a reviewer
 * would notice. A lesson that cannot meet these two rules is a lesson to
 * widen, not an entry to add back.
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
