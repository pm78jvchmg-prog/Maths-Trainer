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
import { similarityScaling } from './contest/level5';
import { compositeFigures } from './contest/level6';
import { combinatorics } from './contest/level7';
import { probability } from './contest/level8';
import { fastProblemSolving } from './contest/level9';
import { factorization } from './contest/level10';
import { reframingProblems } from './contest/level11';
import { advancedAlgebra } from './contest/level12';
import { inequalities } from './contest/level13';
import { polynomialsLevel } from './contest/level14';
import { sequencesSeriesLevel } from './contest/level15';
import { countingFactors } from './contest/level16';
import { modularArithmetic } from './contest/level17';
import { syntheticGeometry } from './contest/level18';
import { analyticalGeometry } from './contest/level19';
import { contestTrig } from './contest/level20';
import { advancedCombinatorics } from './contest/level21';
import { advancedProbability } from './contest/level22';

export const contestMath: Course = {
  id: 'contest-math',
  category: 'contest-math',
  position: 10,
  title: 'Contest Math',
  blurb: 'Competition problems: short to state, hard to crack, and each one opened by a single good idea.',
  levels: [problemSolving, equationsRatios, basicStatistics, geometryFundamentals, similarityScaling, compositeFigures, combinatorics, probability, fastProblemSolving, factorization, reframingProblems, advancedAlgebra, inequalities, polynomialsLevel, sequencesSeriesLevel, countingFactors, modularArithmetic, syntheticGeometry, analyticalGeometry, contestTrig, advancedCombinatorics, advancedProbability],
};
