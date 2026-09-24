import { describe, expect, it } from 'vitest';
import { courses } from './courses';
import { MOVES, NEW_COURSES, place } from './placement';
import type { Course } from './types';

const level = (id: string) => ({ id, title: id, lessons: [] });
const course = (id: string, levels: string[]): Course => ({
  id,
  title: id,
  blurb: '',
  category: 'algebra-fundamentals',
  position: 10,
  levels: levels.map(level),
});

describe('placement', () => {
  it('shows every level in exactly one course', () => {
    const ids = courses.flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const move of MOVES) {
      expect(courses.find((c) => c.id === move.to)?.levels.map((l) => l.id)).toContain(move.level);
    }
    for (const made of NEW_COURSES) {
      expect(courses.find((c) => c.id === made.id)?.levels.map((l) => l.id)).toEqual(made.levels);
    }
  });

  it('puts a moved level after the one it names', () => {
    const trig = courses.find((c) => c.id === 'trigonometric-functions')!.levels.map((l) => l.id);
    expect(trig.indexOf('fn-l5')).toBe(trig.indexOf('tf-l3') + 1);
  });

  it('refuses a level it cannot find, rather than dropping it', () => {
    expect(() => place([course('a', ['x'])])).toThrow(/no course has/);
  });

  it('refuses a level written in two courses', () => {
    expect(() => place([course('a', ['x']), course('b', ['x'])])).toThrow(/written twice/);
  });
});
