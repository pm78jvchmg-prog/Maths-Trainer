/**
 * Contest Math.
 *
 * Competition problems: short to state, harder than they look, and each one
 * turning on a single idea — add every equation at once, count gaps rather
 * than posts, look only at the last digit. The course follows the level plan
 * in `docs/roadmap/levels/contest-math.md`, which maps its 23 levels.
 *
 * Each level is a file in `courses/contest/`, written with the slide builders
 * in `contest/blocks.ts`.
 *
 * Has a band of its own, the last of the maths run, between Advanced Maths
 * and Statistics.
 */
import type { Course } from '../types';
import { problemSolving } from './contest/level1';
import { equationsRatios } from './contest/level2';
import { basicStatistics } from './contest/level3';
import { geometryFundamentals } from './contest/level4';

export const contestMath: Course = {
  id: 'contest-math',
  category: 'contest-math',
  position: 10,
  title: 'Contest Math',
  blurb: 'Competition problems: short to state, hard to crack, and each one opened by a single good idea.',
  levels: [problemSolving, equationsRatios, basicStatistics, geometryFundamentals],
};
