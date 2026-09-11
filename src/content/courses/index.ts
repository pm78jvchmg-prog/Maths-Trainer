import type { Category, Course } from '../types';
import { complexNumbers } from './complexNumbers';
import { differentiation } from './differentiation';
import { exponentsRadicals } from './exponentsRadicals';
import { integration } from './integration';
import { logarithms } from './logarithms';
import { quadratics } from './quadratics';
import { trigonometricFunctions } from './trigonometricFunctions';

/**
 * Courses grouped into the tabs on the home screen.
 *
 * The category carries the difficulty banding rather than the course, so a
 * topic met first at A level and again at degree level is one course with more
 * levels, not two entries competing for the same name.
 */
export const categories: Category[] = [
  {
    id: 'algebra-fundamentals',
    title: 'Algebra Fundamentals',
    blurb: 'The rules everything later is built on.',
    courses: [exponentsRadicals, quadratics],
  },
  {
    id: 'advanced-algebra',
    title: 'Advanced Algebra',
    blurb: 'The functions and graphs of later school maths.',
    courses: [trigonometricFunctions, logarithms],
  },
  {
    id: 'advanced-maths',
    title: 'Advanced Maths',
    blurb: 'Derivatives, complex numbers, and the machinery behind them.',
    courses: [complexNumbers, differentiation, integration],
  },
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
