import type { CategoryId, Course, Level } from './types';

/**
 * Levels that are shown in a different course from the file they are written in.
 *
 * A course review found levels sitting in the wrong difficulty band (GCSE
 * vectors under Advanced Maths, further-maths induction under Algebra
 * Fundamentals) or ahead of a level they depend on. Moving them here rather
 * than cutting them out of their files keeps every level beside the helpers
 * and figures it was written with, and keeps every level and lesson id as it
 * was, so progress already recorded against a moved lesson still counts.
 *
 * Only moves *between* courses live here. Reordering inside one course, and a
 * course's own title, tab and position, are edited in its file as usual.
 *
 * `place` throws on a level id it cannot find or finds twice, so renaming a
 * level without updating this table fails every test rather than quietly
 * dropping the level from the app.
 */

interface NewCourse {
  id: string;
  title: string;
  blurb: string;
  category: CategoryId;
  position: number;
  levels: string[];
}

interface Move {
  level: string;
  to: string;
  /** The level it follows in its new course; omitted, it goes last. */
  after?: string;
}

export const NEW_COURSES: NewCourse[] = [
  {
    id: 'vectors-basics',
    title: 'Vectors Basics',
    blurb: 'Column vectors, scalar multiples and length, then position vectors and vector paths.',
    category: 'algebra-fundamentals',
    position: 85,
    levels: ['vm-l1', 'vm-l4'],
  },
  {
    id: 'partial-fractions-rational',
    title: 'Partial Fractions & Rational Functions',
    blurb: 'Splitting a fraction into simpler ones, and sketching the graphs of rational functions.',
    category: 'advanced-algebra',
    position: 21,
    levels: ['af-l2', 'af-l3', 'af-l5'],
  },
  {
    id: 'integration-basics',
    title: 'Integration',
    blurb: 'Differentiation run backwards, then areas, substitution, integration by parts and partial fractions.',
    category: 'advanced-algebra',
    position: 24,
    levels: ['in-l1', 'in-l2', 'in-l3', 'in-l4', 'in-l6'],
  },
  {
    id: 'parametric-implicit-basics',
    title: 'Parametric & Implicit Basics',
    blurb: 'Curves traced by a parameter, and gradients of curves that never say y =.',
    category: 'advanced-algebra',
    position: 26,
    levels: ['pi-l1', 'pi-l2'],
  },
  {
    id: 'differential-equations-basics',
    title: 'Differential Equations Basics',
    blurb: 'Separating the variables, then growth, decay, cooling and mixing.',
    category: 'advanced-algebra',
    position: 32,
    levels: ['de-l1', 'de-l2'],
  },
  {
    id: 'numerical-methods-basics',
    title: 'Numerical Methods Basics',
    blurb: 'Roots and areas pinned down by sign changes, iteration, tangents and trapezia.',
    category: 'advanced-algebra',
    position: 50,
    levels: ['nm-l1', 'nm-l2'],
  },
  {
    id: 'roots-of-polynomials',
    title: 'Roots of Polynomials',
    blurb: 'How the roots of a polynomial sit in its coefficients.',
    category: 'advanced-maths',
    position: 15,
    levels: ['pl-l4'],
  },
  {
    id: 'series-induction',
    title: 'Series & Induction',
    blurb: 'Proof by induction, the standard sums of powers, and the method of differences.',
    category: 'advanced-maths',
    position: 55,
    levels: ['np-l4', 'sq-l4', 'af-l6', 'sq-l5'],
  },
  {
    id: 'number-theory',
    title: 'Number Theory',
    blurb: "Euclid's algorithm, whole-number solutions, and arithmetic mod n.",
    category: 'advanced-maths',
    position: 90,
    levels: ['np-l5', 'np-l6', 'np-l9', 'np-l10', 'np-l11'],
  },
];

export const MOVES: Move[] = [
  { level: 'fn-l5', to: 'trigonometric-functions', after: 'tf-l3' },
  { level: 'af-l4', to: 'inequalities-modulus', after: 'im-l1' },
  { level: 'vm-l10', to: 'kinematics' },
];

export function place(written: Course[]): Course[] {
  const home = new Map<string, Level>();
  for (const course of written) {
    for (const level of course.levels) {
      if (home.has(level.id)) throw new Error(`level ${level.id} is written twice`);
      home.set(level.id, level);
    }
  }

  const taken = new Set<string>();
  const take = (id: string): Level => {
    const level = home.get(id);
    if (!level) throw new Error(`placement names level ${id}, which no course has`);
    if (taken.has(id)) throw new Error(`placement moves level ${id} twice`);
    taken.add(id);
    return level;
  };

  const created: Course[] = NEW_COURSES.map(({ levels, ...course }) => ({ ...course, levels: levels.map(take) }));
  const moved = MOVES.map((move) => ({ ...move, found: take(move.level) }));

  const kept = written.map((course) => {
    const levels = course.levels.filter((level) => !taken.has(level.id));
    for (const move of moved.filter((m) => m.to === course.id)) {
      const at = move.after === undefined ? levels.length : levels.findIndex((l) => l.id === move.after) + 1;
      if (at === 0) throw new Error(`placement puts ${move.level} after ${move.after}, which ${course.id} lacks`);
      levels.splice(at, 0, move.found);
    }
    return { ...course, levels };
  });

  for (const move of moved) {
    if (!written.some((course) => course.id === move.to)) throw new Error(`placement moves ${move.level} to ${move.to}, which does not exist`);
  }
  for (const course of [...kept, ...created]) {
    if (course.levels.length === 0) throw new Error(`placement leaves ${course.id} with no levels`);
  }
  return [...kept, ...created];
}
