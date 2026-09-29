import { describe, expect, it } from 'vitest';
import { rampOrder } from './ramp';
import { breaksDown, sameMethod, sameQuestion, scaffoldFirst, shapeOf, stretches } from './scaffoldFirst';
import { startSession } from './session';
import { courses } from '../content/courses';
import { registry } from '../content/registry';
import type { Lesson, SlideRef } from '../content/types';

const ids = (refs: SlideRef[]) => refs.map((r) => (r.type === 'generated' ? `${r.generatorId}@${r.difficulty ?? 1}` : 'T'));

function lessonById(id: string): Lesson {
  for (const course of courses) for (const level of course.levels) for (const lesson of level.lessons) if (lesson.id === id) return lesson;
  throw new Error(`no lesson ${id}`);
}

/** Every whole answer that still comes before a breakdown of its own working. */
function wholeBeforeBreakdown(refs: SlideRef[]): string[] {
  const found: string[] = [];
  const stretch = stretches(refs);
  refs.forEach((whole, i) => {
    if (whole.type !== 'generated' || whole.leadIn?.length || shapeOf(whole.generatorId, registry) !== 'whole') return;
    refs.forEach((later, j) => {
      if (j <= i || later.type !== 'generated' || later.leadIn?.length) return;
      if (shapeOf(later.generatorId, registry) !== 'breakdown') return;
      if (breaksDown(later.generatorId, whole.generatorId, stretch[i] === stretch[j], registry)) {
        found.push(`${whole.generatorId} before ${later.generatorId}`);
      }
    });
  });
  return found;
}

describe('scaffoldFirst', () => {
  it('reads the shapes of the Pythagoras questions', () => {
    expect(shapeOf('geo-pyth-tiles', registry)).toBe('breakdown');
    expect(shapeOf('geo-pyth-hyp', registry)).toBe('whole');
    expect(shapeOf('geo-pyth-hyp+choice', registry)).toBe('whole');
    expect(sameMethod('geo-pyth-hyp', 'geo-pyth-tiles', registry)).toBe(true);
    expect(sameMethod('geo-pyth-which', 'geo-pyth-tiles', registry)).toBe(false);
    expect(sameQuestion('geo-pyth-hyp+choice', 'geo-pyth-tiles', registry)).toBe(true);
  });

  it('moves a breakdown past a teach slide only when it is the very same question', () => {
    // rad-add adds like surds; rad-add-steps simplifies unlike ones first,
    // which the teach slide between them is there to teach.
    expect(sameMethod('rad-add', 'rad-add-steps', registry)).toBe(true);
    expect(sameQuestion('rad-add', 'rad-add-steps', registry)).toBe(false);
    const teach: SlideRef = { type: 'literal', slide: { kind: 'teach', body: [] } };
    const refs: SlideRef[] = [teach, { type: 'generated', generatorId: 'rad-add' }, teach, { type: 'generated', generatorId: 'rad-add-steps' }];
    expect(scaffoldFirst(refs, registry)).toEqual(refs);
    const together: SlideRef[] = [teach, { type: 'generated', generatorId: 'rad-add' }, { type: 'generated', generatorId: 'rad-add-steps' }];
    expect(ids(scaffoldFirst(together, registry))).toEqual(['T', 'rad-add-steps@1', 'rad-add@1']);
  });

  it('puts "find c², then c" before "find c" in The Pythagorean Theorem, each slot keeping its difficulty', () => {
    const lesson = lessonById('geo-l6-theorem');
    expect(ids(scaffoldFirst(rampOrder(lesson.slides), registry))).toEqual([
      'T',
      'geo-pyth-which@1',
      'geo-pyth-tiles@1',
      'T',
      'geo-pyth-tiles@1',
      'geo-pyth-hyp+choice@2',
      'geo-pyth-which@2',
      'T',
      'geo-pyth-hyp@2',
    ]);
    expect(ids(scaffoldFirst(rampOrder(lesson.skillCheck), registry))).toEqual([
      'geo-pyth-tiles@2',
      'geo-pyth-hyp@2',
      'geo-pyth-which@2',
    ]);
  });

  it('is what a session plays', () => {
    const session = startSession(lessonById('geo-l6-theorem'), registry, 1);
    expect(session.skillCheck.map((s) => s.slide.kind)).toEqual(['tiles', 'expression', 'choice']);
  });

  it('leaves a question with a lead-in where it was written', () => {
    const lead: SlideRef = { type: 'generated', generatorId: 'geo-pyth-hyp', leadIn: [{ kind: 'prose', text: 'Now in one go.' }] };
    const refs: SlideRef[] = [lead, { type: 'generated', generatorId: 'geo-pyth-tiles' }];
    expect(scaffoldFirst(refs, registry)).toEqual(refs);
  });
});

describe('every lesson', () => {
  it('asks a breakdown before the whole answer of the same method', () => {
    const late: string[] = [];
    for (const course of courses) {
      for (const level of course.levels) {
        for (const lesson of level.lessons) {
          for (const [tag, deck] of [
            ['lesson', lesson.slides],
            ['skill check', lesson.skillCheck],
          ] as const) {
            for (const pair of wholeBeforeBreakdown(scaffoldFirst(rampOrder(deck), registry))) late.push(`${lesson.id} ${tag}: ${pair}`);
          }
        }
        for (const pair of wholeBeforeBreakdown(scaffoldFirst(rampOrder(level.levelCheck ?? []), registry))) {
          late.push(`${level.id} level check: ${pair}`);
        }
      }
    }
    expect(late).toEqual([]);
  });
});
