import { describe, it, expect } from 'vitest';
import {
  MASTERED_AT,
  courseMastery,
  libraryProgress,
  masteryPercent,
  playables,
} from './mastery';
import { categories, courses } from '../content/courses';
import type { Course, Lesson, SlideRef } from '../content/types';
import type { LessonRecord } from './progress';

const question: SlideRef = {
  type: 'literal',
  slide: {
    kind: 'choice',
    prompt: [{ kind: 'prose', text: 'Which?' }],
    options: [{ id: 'a', label: 'a' }],
    correctId: 'a',
  },
};

function lesson(id: string, checkLength = 3): Lesson {
  return { id, title: id, slides: [], skillCheck: Array(checkLength).fill(question) };
}

function record(bestCorrect: number, total: number): LessonRecord {
  return { completedAt: 0, bestCorrect, total, timesPlayed: 1 };
}

/** One level of two three-question lessons and a ten-question level check. */
function course(id = 'c'): Course {
  return {
    id,
    category: 'advanced-maths',
    position: 0,
    title: id,
    blurb: '',
    levels: [
      {
        id: `${id}-l1`,
        title: 'One',
        lessons: [lesson(`${id}-a`), lesson(`${id}-b`)],
        levelCheck: Array(10).fill(question),
      },
    ],
  };
}

describe('playables', () => {
  it('lists the lessons and the level check', () => {
    expect(playables(course()).map((entry) => entry.id)).toEqual(['c-a', 'c-b', 'c-l1:check']);
  });

  it('leaves out a level with no check', () => {
    const bare: Course = {
      id: 'b',
      category: 'advanced-maths',
      position: 0,
      title: 'b',
      blurb: '',
      levels: [{ id: 'b-l1', title: 'One', lessons: [lesson('b-a')] }],
    };

    expect(playables(bare).map((entry) => entry.id)).toEqual(['b-a']);
  });
});

describe('courseMastery', () => {
  it('is zero with nothing played', () => {
    const mastery = courseMastery(course(), {});

    expect(mastery.earned).toBe(0);
    expect(mastery.available).toBe(16);
    expect(mastery.fraction).toBe(0);
    expect(mastery.played).toBe(0);
    expect(mastery.total).toBe(3);
  });

  it('counts marks earned, not lessons finished', () => {
    // Both lessons finished, one perfectly and one scraped.
    const mastery = courseMastery(course(), {
      'c-a': record(3, 3),
      'c-b': record(1, 3),
    });

    expect(mastery.earned).toBe(4);
    expect(mastery.available).toBe(16);
    expect(mastery.played).toBe(2);
  });

  it('weights the level check by its own length', () => {
    const mastery = courseMastery(course(), { 'c-l1:check': record(10, 10) });

    // Ten of the sixteen marks in the course sit in the level check.
    expect(mastery.earned).toBe(10);
    expect(mastery.fraction).toBeCloseTo(10 / 16);
  });

  it('reaches 1 only on a perfect run of everything', () => {
    const mastery = courseMastery(course(), {
      'c-a': record(3, 3),
      'c-b': record(3, 3),
      'c-l1:check': record(10, 10),
    });

    expect(mastery.fraction).toBe(1);
  });

  // The point of deriving this from the content rather than storing it.
  it('falls when a course grows', () => {
    const before = course();
    const records = {
      'c-a': record(3, 3),
      'c-b': record(3, 3),
      'c-l1:check': record(10, 10),
    };
    expect(courseMastery(before, records).fraction).toBe(1);

    const after = course();
    after.levels[0].lessons.push(lesson('c-c'));

    expect(courseMastery(after, records).fraction).toBeCloseTo(16 / 19);
  });

  // A skill check can shrink between plays; an old best must not outscore it.
  it('caps a best set against a longer check', () => {
    const shrunk = course();
    shrunk.levels[0].lessons = [lesson('c-a', 2), lesson('c-b', 2)];

    const mastery = courseMastery(shrunk, {
      'c-a': record(3, 3),
      'c-b': record(2, 2),
      'c-l1:check': record(10, 10),
    });

    expect(mastery.earned).toBe(14);
    expect(mastery.available).toBe(14);
    expect(mastery.fraction).toBe(1);
  });

  it('ignores a record for a lesson the course no longer has', () => {
    const mastery = courseMastery(course(), { 'c-removed': record(3, 3) });

    expect(mastery.earned).toBe(0);
    expect(mastery.played).toBe(0);
  });

  it('is zero rather than NaN for a course with nothing to answer', () => {
    const empty: Course = { id: 'e', category: 'advanced-maths', position: 0, title: 'e', blurb: '', levels: [] };

    expect(courseMastery(empty, {}).fraction).toBe(0);
  });
});

describe('libraryProgress', () => {
  const library = [
    { id: 'cat', title: 'Cat', blurb: '', courses: [course('x'), course('y'), course('z')] },
  ];

  it('counts nothing before the first lesson', () => {
    expect(libraryProgress(library, {})).toEqual({ started: 0, mastered: 0, total: 3 });
  });

  it('counts a course as started on one record', () => {
    const progress = libraryProgress(library, { 'x-a': record(1, 3) });

    expect(progress.started).toBe(1);
    expect(progress.mastered).toBe(0);
  });

  it('counts a course as mastered at the threshold, and a started one below it', () => {
    // 15 of 16 is 93.75%, over the bar; 12 of 16 is 75%, under it.
    const over = { 'x-a': record(3, 3), 'x-b': record(2, 3), 'x-l1:check': record(10, 10) };
    const under = { 'y-a': record(3, 3), 'y-b': record(3, 3), 'y-l1:check': record(6, 10) };

    const progress = libraryProgress(library, { ...over, ...under });

    expect(progress.started).toBe(2);
    expect(progress.mastered).toBe(1);
  });

  it('never counts a course as mastered without marks available', () => {
    const empty = [{ id: 'cat', title: 'Cat', blurb: '', courses: [{ id: 'e', category: 'advanced-maths' as const, position: 0, title: 'e', blurb: '', levels: [] }] }];

    expect(libraryProgress(empty, {}).mastered).toBe(0);
  });
});

describe('masteryPercent', () => {
  it('floors rather than rounds', () => {
    // 89.6% must not read as 90% beside a summary that has not counted it.
    const mastery = { earned: 448, available: 500, fraction: 0.896, played: 1, total: 1 };

    expect(masteryPercent(mastery)).toBe(89);
    expect(mastery.fraction).toBeLessThan(MASTERED_AT);
  });

  it('is 100 only at a full house', () => {
    expect(masteryPercent({ earned: 16, available: 16, fraction: 1, played: 3, total: 3 })).toBe(100);
  });
});

describe('the real library', () => {
  it('offers marks in every course', () => {
    for (const entry of courses) {
      expect(courseMastery(entry, {}).available).toBeGreaterThan(0);
    }
  });

  it('starts at nothing started and nothing mastered', () => {
    const progress = libraryProgress(categories, {});

    expect(progress).toEqual({ started: 0, mastered: 0, total: courses.length });
  });

  it('reaches 100% on a perfect run of a real course', () => {
    const entry = courses[0];
    const records = Object.fromEntries(
      playables(entry).map((item) => [item.id, record(item.skillCheck.length, item.skillCheck.length)]),
    );

    expect(courseMastery(entry, records).fraction).toBe(1);
    expect(libraryProgress(categories, records).mastered).toBe(1);
  });
});
