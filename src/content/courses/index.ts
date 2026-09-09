import type { Course } from '../types';
import { complexNumbers } from './complexNumbers';
import { differentiation } from './differentiation';

/** Every course, in the order they appear on the home screen. */
export const courses: Course[] = [complexNumbers, differentiation];

export function lessonCount(course: Course): number {
  return course.levels.reduce((total, level) => total + level.lessons.length, 0);
}
