/**
 * The number-line widget, end to end below the pixels.
 *
 * Every draft here is built with the same three operations the widget's taps
 * call (`togglePoint`, `toggleClosed`, `toggleGap`), then graded through
 * `startSession` and `submit` exactly as a lesson grades it. So a pass means
 * the generator's answer can actually be drawn by tapping on the line it is
 * shown on, not merely that it agrees with itself.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession, type Session } from '../../engine/session';
import {
  EMPTY_DRAFT,
  canonicalSet,
  draftHasShading,
  draftMatches,
  formatDraft,
  parseDraft,
  parseSet,
  toggleClosed,
  toggleGap,
  togglePoint,
  type Draft,
  type Piece,
} from '../numberLine';
import { registry } from '../registry';
import { numberLineGenerators } from './numberLine';
import { linearEquationsGenerators } from './linearEquations';
import type { Generator, Lesson, Slide } from '../types';

type LineSlide = Extract<Slide, { kind: 'numberLine' }>;

const SEEDS = 200;

function lessonOf(generatorId: string, difficulty: number): Lesson {
  return {
    id: `test-${generatorId}-${difficulty}`,
    title: 'Number line',
    slides: [],
    skillCheck: [{ type: 'generated', generatorId, difficulty }],
  };
}

/** Where to tap the line to shade a piece: inside it, and inside the window. */
function tapInside(piece: Piece, slide: LineSlide): number {
  const lo = Number.isFinite(piece.lo) ? piece.lo : slide.min;
  const hi = Number.isFinite(piece.hi) ? piece.hi : slide.max;
  return (lo + hi) / 2;
}

/**
 * The taps that draw a set: a dot at every finite end (hollow where the end is
 * left out), then one tap inside each piece. `order` reverses both lists, so
 * the same set can be drawn two different ways.
 */
function draw(set: string, slide: LineSlide, order: 'forward' | 'reverse' = 'forward'): Draft {
  const pieces = parseSet(set)!;
  const ends = new Map<number, boolean>();
  for (const p of pieces) {
    if (Number.isFinite(p.lo)) ends.set(p.lo, p.loClosed);
    if (Number.isFinite(p.hi)) ends.set(p.hi, p.hiClosed);
  }
  const endList = [...ends];
  const pieceList = [...pieces];
  if (order === 'reverse') {
    endList.reverse();
    pieceList.reverse();
  }
  let draft = EMPTY_DRAFT;
  for (const [at, closed] of endList) {
    draft = togglePoint(draft, at);
    if (!closed) draft = toggleClosed(draft, at);
  }
  for (const piece of pieceList) draft = toggleGap(draft, tapInside(piece, slide));
  return draft;
}

function submitted(session: Session, draft: string): string {
  return reduce(session, { type: 'submit', answer: draft }).feedback.kind;
}

/**
 * The demonstrations, and every lesson generator drawing on the line: the
 * tapping sweep is the only check that a set can actually be drawn.
 */
const swept = [
  ...numberLineGenerators,
  ...linearEquationsGenerators.filter((g) => ['lin-ineq-line', 'lin-flip-line', 'lin-double-line'].includes(g.id)),
];

describe.each(swept.map((g) => [g.id, g] as const))('%s', (id, generator) => {
  const g = generator as unknown as Generator<unknown>;

  describe.each([1, 2])('difficulty %i', (difficulty) => {
    const sessions = Array.from({ length: SEEDS }, (_, seed) => {
      const session = startSession(lessonOf(id, difficulty), registry, seed);
      const slide = session.skillCheck[0].slide;
      if (slide.kind !== 'numberLine') throw new Error(`${id} rendered ${slide.kind}`);
      return { session, slide, seed };
    });

    it('grades an empty line incorrect', () => {
      for (const { session } of sessions) {
        expect(submitted(session, '')).toBe('incorrect');
        expect(submitted(session, formatDraft(EMPTY_DRAFT))).toBe('incorrect');
      }
    });

    it("grades its own answer correct, drawn by tapping", () => {
      for (const { session, slide, seed } of sessions) {
        const draft = formatDraft(draw(slide.answer, slide));
        expect(submitted(session, draft), `seed ${seed}: ${slide.answer} as ${draft}`).toBe('correct');
      }
    });

    it('grades the same set drawn in a different order correct', () => {
      for (const { session, slide, seed } of sessions) {
        const forward = formatDraft(draw(slide.answer, slide, 'forward'));
        const reverse = formatDraft(draw(slide.answer, slide, 'reverse'));
        expect(submitted(session, reverse), `seed ${seed}: ${reverse}`).toBe('correct');
        // Only a real test when the two drafts differ as strings.
        if (parseSet(slide.answer)!.length > 1) expect(reverse).not.toBe(forward);
      }
    });

    it('grades a flipped end incorrect', () => {
      for (const { session, slide, seed } of sessions) {
        const drawn = draw(slide.answer, slide);
        for (const dot of drawn.dots) {
          const flipped = formatDraft(toggleClosed(drawn, dot.at));
          expect(submitted(session, flipped), `seed ${seed}: ${flipped}`).toBe('incorrect');
        }
      }
    });

    it('grades a ray drawn the wrong way incorrect', () => {
      for (const { session, slide, seed } of sessions) {
        const pieces = parseSet(slide.answer)!;
        // Shading the other side of every dot instead: each ray turned round,
        // and an interval turned inside out.
        let drawn = draw(slide.answer, slide);
        for (const piece of pieces) drawn = toggleGap(drawn, tapInside(piece, slide));
        const ends = drawn.dots.map((d) => d.at);
        const outside = [
          (slide.min + ends[0]) / 2,
          ...ends.slice(1).map((end, i) => (ends[i] + end) / 2),
          (ends[ends.length - 1] + slide.max) / 2,
        ].filter((at) => !pieces.some((p) => p.lo < at && at < p.hi));
        for (const at of outside) drawn = toggleGap(drawn, at);
        const turned = formatDraft(drawn);
        expect(submitted(session, turned), `seed ${seed}: ${turned}`).toBe('incorrect');
      }
    });

    it('keeps every end of the answer on a tick inside the window', () => {
      for (const { slide, seed } of sessions) {
        for (const piece of parseSet(slide.answer)!) {
          for (const end of [piece.lo, piece.hi].filter(Number.isFinite)) {
            expect(end, `seed ${seed}`).toBeGreaterThan(slide.min);
            expect(end, `seed ${seed}`).toBeLessThan(slide.max);
            const steps = (end - slide.min) / slide.step;
            expect(Math.abs(steps - Math.round(steps)), `seed ${seed}: ${end} is off a tick`).toBeLessThan(1e-9);
          }
        }
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

describe('the set model', () => {
  it('merges pieces that overlap or meet at an included point', () => {
    expect(canonicalSet('[3,5)|(-inf,1]')).toBe('(-inf,1]|[3,5)');
    expect(canonicalSet('(1,3]|(3,5)')).toBe('(1,5)');
    expect(canonicalSet('(1,3)|[3,5)')).toBe('(1,5)');
    expect(canonicalSet('(-inf,2)|(0,inf)')).toBe('(-inf,inf)');
    expect(canonicalSet('[1,4]|[2,3]')).toBe('[1,4]');
  });

  it('keeps a point taken out as two pieces', () => {
    expect(canonicalSet('(1,3)|(3,5)')).toBe('(1,3)|(3,5)');
  });

  it('never closes an infinite end', () => {
    expect(canonicalSet('[-inf,2]')).toBe('(-inf,2]');
  });

  it('reads a filled dot on its own as a point of the set', () => {
    const draft = togglePoint(toggleGap(togglePoint(EMPTY_DRAFT, 0), 2), 5);
    expect(formatDraft(draft)).toBe('0c,5c/0:5,5:inf');
    // Placing 5 inside the shaded ray split it, and both halves stay shaded.
    expect(draftMatches(formatDraft(draft), '[0,inf)')).toBe(true);
    const lone = togglePoint(draft, 5);
    expect(draftMatches(formatDraft(toggleGap(lone, 2)), '[0,0]')).toBe(false);
  });

  it('joins the gaps either side of a removed dot, shaded only if both were', () => {
    let draft = togglePoint(togglePoint(EMPTY_DRAFT, 1), 4);
    draft = toggleGap(toggleGap(draft, 2), 5);
    expect(formatDraft(togglePoint(draft, 4))).toBe('1c/1:inf');
    const half = toggleGap(draft, 5);
    expect(formatDraft(togglePoint(half, 4))).toBe('1c/');
  });

  it('needs something shaded before the line counts as an answer', () => {
    expect(draftHasShading('')).toBe(false);
    expect(draftHasShading('2c/')).toBe(false);
    expect(draftHasShading('2c/2:inf')).toBe(true);
    // A filled dot alone spells [2,2], but nothing is shaded, so it cannot score.
    expect(draftMatches('2c/', '[2,2]')).toBe(false);
  });

  it('round-trips a draft through its string', () => {
    const draft = draw('(-inf,-1.5]|(2,inf)', { min: -3, max: 3, step: 0.5 } as LineSlide);
    expect(parseDraft(formatDraft(draft))).toEqual(draft);
    expect(parseDraft('nonsense')).toBeUndefined();
    expect(draftMatches('nonsense', '(0,1)')).toBe(false);
  });
});
