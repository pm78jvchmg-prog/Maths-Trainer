import { describe, expect, it } from 'vitest';
import { rampOrder } from './ramp';
import { courses } from '../content/courses';
import type { SlideRef } from '../content/types';

const q = (id: string, difficulty?: number, leadIn = false): SlideRef => ({
  type: 'generated',
  generatorId: id,
  difficulty,
  ...(leadIn ? { leadIn: [{ kind: 'prose', text: 'A lead-in.' }] } : {}),
});
const teach: SlideRef = { type: 'literal', slide: { kind: 'teach', body: [] } };
const ids = (refs: SlideRef[]) => refs.map((r) => (r.type === 'generated' ? r.generatorId : 'T'));

describe('rampOrder', () => {
  it('sorts each run between teach slides, keeping written order among equals', () => {
    expect(ids(rampOrder([teach, q('a', 2), q('b'), q('c', 2), q('d', 1), teach, q('e', 2), q('f')]))).toEqual([
      'T', 'b', 'd', 'a', 'c', 'T', 'f', 'e',
    ]);
  });

  it('never moves a question in front of a lead-in that teaches', () => {
    expect(ids(rampOrder([q('a', 2), q('b', 2, true), q('c', 1), q('d', 2)]))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('every lesson', () => {
  it('climbs within each stretch of plain questions once ordered', () => {
    const drops: string[] = [];
    for (const course of courses) {
      for (const level of course.levels) {
        for (const lesson of level.lessons) {
          for (const deck of [lesson.slides, lesson.skillCheck, level.levelCheck ?? []]) {
            let last = 0;
            for (const ref of rampOrder(deck)) {
              if (ref.type !== 'generated' || (ref.leadIn?.length ?? 0) > 0) {
                // Teaching, on a slide or in a lead-in, starts the climb again.
                last = 0;
                continue;
              }
              const d = ref.difficulty ?? 1;
              if (d < last) drops.push(lesson.id);
              last = d;
            }
          }
        }
      }
    }
    expect(drops).toEqual([]);
  });
});
