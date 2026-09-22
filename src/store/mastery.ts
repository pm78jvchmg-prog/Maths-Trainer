/**
 * Topic mastery, derived rather than stored.
 *
 * There is no XP here on purpose. A running points total only means something
 * against other people's, and this app has none — played alone, a number that
 * only ever goes up says nothing about whether you can do the maths. What does
 * say something is how much of a topic you have covered and how well you did,
 * so mastery is marks earned over marks available across the whole course.
 *
 * Nothing new is persisted. Mastery is computed from the lesson records the
 * progress store already keeps and the content as it stands *today*, which is
 * what makes it honest in the direction that matters: add lessons to a course
 * you had finished and it drops below 100% again, because there is genuinely
 * more of it you have not done.
 */
import { levelCheckLesson } from '../content/types';
import type { Category, Course, Lesson } from '../content/types';
import type { LessonRecord } from './progress';

/**
 * Mastery at or above this counts a course as mastered.
 *
 * Not 100%: that would demand a perfect run of every skill check in the course
 * and would never be reached, which makes it the same as no threshold at all.
 * A course cannot reach 90% without nearly all of it being played well, so the
 * ratio does the work and no separate "finished everything" test is needed.
 */
export const MASTERED_AT = 0.9;

export interface Mastery {
  /** Marks earned, capped at what is currently available. */
  earned: number;
  /** Marks on offer across every lesson and level check in the course. */
  available: number;
  /** `earned / available`, or 0 for a course with nothing to answer. */
  fraction: number;
  /** Playables with a record, out of the total. */
  played: number;
  total: number;
}

/** Every lesson of a course, with its level checks, in the order played. */
export function playables(course: Course): Lesson[] {
  return course.levels.flatMap((level) => {
    const check = levelCheckLesson(level);
    return check ? [...level.lessons, check] : level.lessons;
  });
}

export function courseMastery(course: Course, records: Record<string, LessonRecord>): Mastery {
  let earned = 0;
  let available = 0;
  let played = 0;
  const all = playables(course);

  for (const lesson of all) {
    const offered = lesson.skillCheck.length;
    available += offered;

    const record = records[lesson.id];
    if (!record) continue;
    played += 1;
    // Capped against what is on offer now, not what was on offer when the run
    // was recorded. A skill check that has since shrunk would otherwise score
    // 4 out of 3 and push the course over 100%.
    earned += Math.min(record.bestCorrect, offered);
  }

  return {
    earned,
    available,
    fraction: available === 0 ? 0 : earned / available,
    played,
    total: all.length,
  };
}

export interface LibraryProgress {
  /** Courses with at least one lesson or level check behind you. */
  started: number;
  /** Courses at or above `MASTERED_AT`. */
  mastered: number;
  /** Courses in the library, which grows as content is added. */
  total: number;
}

export function libraryProgress(
  categories: Category[],
  records: Record<string, LessonRecord>,
): LibraryProgress {
  const all = categories.flatMap((category) => category.courses);
  let started = 0;
  let mastered = 0;

  for (const course of all) {
    const mastery = courseMastery(course, records);
    if (mastery.played > 0) started += 1;
    if (mastery.available > 0 && mastery.fraction >= MASTERED_AT) mastered += 1;
  }

  return { started, mastered, total: all.length };
}

/** Mastery as a whole-number percentage, for display. */
export function masteryPercent(mastery: Mastery): number {
  // Floored, not rounded: 89.6% reading as "90%" beside a course the summary
  // line has not counted as mastered is a contradiction the learner can see.
  return Math.floor(mastery.fraction * 100);
}
