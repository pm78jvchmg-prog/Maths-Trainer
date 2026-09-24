/**
 * The force-diagram widget, end to end below the pixels.
 *
 * `pick` drafts are built with `toggleForce`, the operation a tap on an arrow
 * head calls, and `fill` drafts are one bank token per blank, as the widget
 * places them. Both are graded through `startSession` and `submit` exactly as
 * a lesson grades them.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession, type Session } from '../../engine/session';
import {
  DIRECTIONS,
  arrowLayout,
  canonicalForces,
  forceDiagramSvg,
  forcesMatch,
  headsClash,
  toggleForce,
  type Direction,
} from '../forces';
import { registry } from '../registry';
import { forceDiagramGenerators } from './forceDiagram';
import type { Answer } from '../../engine/session';
import type { Generator, Lesson, Slide } from '../types';

type ForcesSlide = Extract<Slide, { kind: 'forces' }>;

const SEEDS = 200;

function lessonOf(generatorId: string, difficulty: number): Lesson {
  return {
    id: `test-${generatorId}-${difficulty}`,
    title: 'Force diagram',
    slides: [],
    skillCheck: [{ type: 'generated', generatorId, difficulty }],
  };
}

function submitted(session: Session, draft: Answer): string {
  return reduce(session, { type: 'submit', answer: draft }).feedback.kind;
}

/** Tap each id in turn, starting from nothing. */
const tapped = (ids: readonly string[]) => ids.reduce((draft, id) => toggleForce(draft, id as Direction), '');

describe.each(forceDiagramGenerators.map((g) => [g.id, g] as const))('%s', (id, generator) => {
  const g = generator as unknown as Generator<unknown>;

  describe.each([1, 2])('difficulty %i', (difficulty) => {
    const sessions = Array.from({ length: SEEDS }, (_, seed) => {
      const session = startSession(lessonOf(id, difficulty), registry, seed);
      const slide = session.skillCheck[0].slide;
      if (slide.kind !== 'forces') throw new Error(`${id} rendered ${slide.kind}`);
      return { session, slide: slide as ForcesSlide, seed };
    });

    it('grades an untouched diagram incorrect', () => {
      for (const { session, slide } of sessions) {
        expect(submitted(session, '')).toBe('incorrect');
        if (slide.mode === 'fill') {
          expect(submitted(session, slide.answer.map(() => ''))).toBe('incorrect');
        }
      }
    });

    it('grades its own answer correct, tapped in', () => {
      for (const { session, slide, seed } of sessions) {
        const draft = slide.mode === 'pick' ? tapped(slide.answer.split('|')) : [...slide.answer];
        expect(submitted(session, draft), `seed ${seed}`).toBe('correct');
      }
    });

    it('grades the same arrows tapped in another order correct', () => {
      for (const { session, slide, seed } of sessions) {
        if (slide.mode !== 'pick') continue;
        const ids = slide.answer.split('|');
        // The raw order of the taps, unsorted, reaches the grade too.
        expect(submitted(session, [...ids].reverse().join('|')), `seed ${seed}`).toBe('correct');
        expect(submitted(session, tapped([...ids].reverse())), `seed ${seed}`).toBe('correct');
      }
    });

    it('grades an arrow too many or too few incorrect', () => {
      for (const { session, slide, seed } of sessions) {
        if (slide.mode !== 'pick') continue;
        const acting = slide.answer.split('|');
        const extra = slide.arrows.map((a) => a.id).filter((a) => !acting.includes(a));
        expect(extra.length, `seed ${seed}: no distractor arrow`).toBeGreaterThan(0);
        for (const wrong of extra) {
          expect(submitted(session, tapped([...acting, wrong])), `seed ${seed}: + ${wrong}`).toBe('incorrect');
        }
        for (const missing of acting) {
          const fewer = acting.filter((a) => a !== missing);
          expect(submitted(session, tapped(fewer)), `seed ${seed}: - ${missing}`).toBe('incorrect');
        }
      }
    });

    it('grades a wrong magnitude incorrect', () => {
      for (const { session, slide, seed } of sessions) {
        if (slide.mode !== 'fill') continue;
        for (const [idx, token] of slide.answer.entries()) {
          for (const other of new Set(slide.bank)) {
            if (other === token) continue;
            const draft = [...slide.answer];
            draft[idx] = other;
            expect(submitted(session, draft), `seed ${seed}: blank ${idx} as ${other}`).toBe('incorrect');
          }
        }
      }
    });

    it('keeps every arrow head a thumb apart and on the picture', () => {
      for (const { slide, seed } of sessions) {
        expect(headsClash(slide.scene, slide.arrows.map((a) => a.id)), `seed ${seed}`).toEqual([]);
      }
    });

    it('renders the same slide from the same seed', () => {
      for (let seed = 0; seed < 40; seed += 1) {
        const first = g.render(g.sample(makeRng(seed), difficulty));
        const second = g.render(g.sample(makeRng(seed), difficulty));
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
        const again = startSession(lessonOf(id, difficulty), registry, seed).skillCheck[0].slide;
        expect(JSON.stringify(again)).toBe(JSON.stringify(sessions[seed].slide));
      }
    });
  });
});

describe('the difficulties ask what they say', () => {
  const scenes = (generatorId: string, difficulty: number) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const slide = startSession(lessonOf(generatorId, difficulty), registry, seed).skillCheck[0].slide as ForcesSlide;
      return slide;
    });

  it('puts fd-pick on a level floor at 1, and on a slope or a string at 2', () => {
    expect(new Set(scenes('fd-pick', 1).map((s) => s.scene.surface))).toEqual(new Set(['level']));
    expect(new Set(scenes('fd-pick', 2).map((s) => s.scene.surface))).toEqual(new Set(['slope', 'hanging']));
  });

  it('leaves fd-fill one to three blanks with two spare tokens at least', () => {
    for (const difficulty of [1, 2]) {
      for (const slide of scenes('fd-fill', difficulty)) {
        if (slide.mode !== 'fill') throw new Error('fd-fill drew a pick');
        expect(slide.answer.length).toBeGreaterThanOrEqual(1);
        expect(slide.answer.length).toBeLessThanOrEqual(3);
        expect(slide.bank.length - slide.answer.length).toBeGreaterThanOrEqual(2);
        expect([...slide.bank].sort((a, b) => Number(a) - Number(b))).toEqual(slide.bank);
      }
    }
  });
});

describe('the force model', () => {
  it('writes a set of arrows one way, whatever the tap order', () => {
    expect(canonicalForces('up|down|right')).toBe('down|right|up');
    expect(canonicalForces('up|up||down')).toBe('down|up');
    expect(canonicalForces('')).toBe('');
  });

  it('takes an arrow off when it is tapped a second time', () => {
    expect(toggleForce(toggleForce('down|up', 'left'), 'left')).toBe('down|up');
    expect(toggleForce('', 'up')).toBe('up');
  });

  it('never matches an empty diagram', () => {
    expect(forcesMatch('', '')).toBe(false);
    expect(forcesMatch('down|up', 'up|down')).toBe(true);
  });

  it('draws a slope arrow square to the slope', () => {
    const scene = { surface: 'slope', angle: 30, rises: 'right' } as const;
    const along = arrowLayout(scene, 'upSlope').head;
    const out = arrowLayout(scene, 'outOfSlope').head;
    // Page y runs down, so up the slope is up and to the right.
    expect(along.x).toBeGreaterThan(140);
    expect(along.y).toBeLessThan(124);
    const dot = (along.x - 140) * (out.x - 140) + (along.y - 124) * (out.y - 124);
    expect(Math.abs(dot)).toBeLessThan(1);
  });

  it('offers a tap target only when asked, one per arrow', () => {
    const scene = { surface: 'level' } as const;
    const arrows = DIRECTIONS.slice(0, 4).map((d) => ({ id: d, label: 'W' }));
    expect(forceDiagramSvg(scene, arrows)).not.toContain('data-arrow');
    const live = forceDiagramSvg(scene, arrows, { interactive: true });
    expect(live.match(/data-arrow=/g)?.length).toBe(4);
    expect(live).toContain('viewBox="0 0 280 252"');
  });
});
