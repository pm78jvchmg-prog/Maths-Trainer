import type { Category, CategoryId, Course } from '../types';

/**
 * Every course file in this folder, found by the bundler rather than imported
 * by hand.
 *
 * This used to be an import and an entry per course, and with several new
 * courses on open branches at once every one of them edited the same lines, so
 * each landing put the others into a merge conflict. Now a course file needs
 * no wiring here: it exports its one `Course`, and that course's own
 * `category` and `position` say which tab it sits in and where.
 */
const modules = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
});

function isCourse(value: unknown): value is Course {
  return !!value && typeof value === 'object' && Array.isArray((value as { levels?: unknown }).levels);
}

function discoverCourses(): Course[] {
  return Object.entries(modules).map(([path, mod]) => {
    const found = Object.values(mod).filter(isCourse);
    if (found.length !== 1) {
      throw new Error(`${path} should export exactly one course; it exports ${found.length}`);
    }
    return found[0];
  });
}

const byPlace = (a: Course, b: Course) => a.position - b.position || a.id.localeCompare(b.id);

function tab(id: CategoryId, title: string, blurb: string, all: Course[]): Category {
  return { id, title, blurb, courses: all.filter((course) => course.category === id).sort(byPlace) };
}

const discovered = discoverCourses();

/**
 * Courses grouped into the tabs on the home screen.
 *
 * The category carries the difficulty banding rather than the course, so a
 * topic met first at A level and again at degree level is one course with more
 * levels, not two entries competing for the same name.
 */
export const categories: Category[] = [
  tab('algebra-fundamentals', 'Algebra Fundamentals', 'The rules everything later is built on.', discovered),
  tab('advanced-algebra', 'Advanced Algebra', 'The functions and graphs of later school maths.', discovered),
  tab(
    'advanced-maths',
    'Advanced Maths',
    'Derivatives, complex numbers, and the machinery behind them.',
    discovered,
  ),
  tab('statistics', 'Statistics', 'Summarising data, and the chance and spread behind it.', discovered),
];

/** Every course, flattened, in the order the categories list them. */
export const courses: Course[] = categories.flatMap((category) => category.courses);

export function lessonCount(course: Course): number {
  return course.levels.reduce((total, level) => total + level.lessons.length, 0);
}

/** Level checks are playable too, so they count towards a course being finished. */
export function checkCount(course: Course): number {
  return course.levels.filter((level) => (level.levelCheck?.length ?? 0) > 0).length;
}
