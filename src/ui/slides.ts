/**
 * What every slide widget shares that is not itself a component: the props
 * they take, how a verdict styles and locks them, and the draft each slide
 * starts from and must reach before *Check* goes live.
 *
 * Kept out of `SlideView.tsx` because every widget imports these, and
 * `SlideView.tsx` imports every widget. With both in one module the two
 * imported each other.
 */
import type { Slide } from '../content/types';
import type { Answer, Feedback } from '../engine/session';
import { isPlotAnswer } from '../engine/session';
import { walkFlow } from './flow';
import { reduceComplete } from './reduceWorking';
import { draftHasShading } from '../content/numberLine';
import { canonicalForces } from '../content/forces';

export interface SlideProps {
  slide: Slide;
  feedback: Feedback;
  /** Current draft answer, lifted so the player can enable/disable Check. */
  answer: Answer;
  onAnswer: (answer: Answer) => void;
  /**
   * False during an assessment, where a submitted answer is final.
   *
   * Comes from the reducer rather than being inferred here, so "one attempt"
   * does not depend on every widget remembering to check.
   */
  canEdit: boolean;
}

/**
 * Whether the widget is finished with.
 *
 * Deliberately excludes `incorrect`: after a wrong answer the controls stay
 * live, so changing the answer *is* the retry and costs no extra tap. The
 * reducer clears the wrong verdict on `edit`. It still locks once the slide is
 * passed or the solution has been shown, since there is nothing left to try.
 */
export const isLocked = (feedback: Feedback, canEdit: boolean) =>
  feedback.kind === 'correct' ||
  feedback.kind === 'revealed' ||
  (!canEdit && feedback.kind === 'incorrect');

export function frameClass(feedback: Feedback): string {
  if (feedback.kind === 'correct') return 'answer-frame correct';
  if (feedback.kind === 'incorrect' || feedback.kind === 'revealed') return 'answer-frame wrong';
  return 'answer-frame';
}

/** How many blanks a table holds, which is also the length of its answer. */
export function tableBlanks(slide: Extract<Slide, { kind: 'table' }>): number {
  return slide.rows.reduce((count, row) => count + row.filter((cell) => cell === null).length, 0);
}

/** The draft a slide starts from, before the learner has done anything. */
export function initialAnswer(slide: Slide): Answer {
  if (slide.kind === 'tiles') return Array.from({ length: slide.answer.length }, () => '');
  if (slide.kind === 'tree') return Array.from({ length: slide.nodes.length }, () => '');
  if (slide.kind === 'table') return Array.from({ length: tableBlanks(slide) }, () => '');
  if (slide.kind === 'iterate') return Array.from({ length: slide.answer.length }, () => '');
  if (slide.kind === 'venn') return Array.from({ length: slide.answer.length }, () => '');
  // A tree to fill has a blank per missing branch; a path starts untaken and
  // grows a branch at a time, as `flow` does.
  if (slide.kind === 'probTree') {
    return slide.mode === 'fill' ? Array.from({ length: slide.answer.length }, () => '') : [];
  }
  if (slide.kind === 'forces' && slide.mode === 'fill') {
    return Array.from({ length: slide.answer.length }, () => '');
  }
  // Both start at nothing chosen and grow as the learner works.
  if (
    slide.kind === 'steps' ||
    slide.kind === 'flow' ||
    slide.kind === 'reduce' ||
    slide.kind === 'order'
  ) {
    return [];
  }
  // A slider too, although its handle is drawn somewhere: where it rests is
  // not something the learner chose, and it can be the answer. A transform
  // likewise: its live curve is drawn at the identity, which is a curve but
  // not an answer.
  return '';
}

/** Whether the current draft is complete enough to submit. */
export function hasAnswer(slide: Slide, answer: Answer): boolean {
  if (slide.kind === 'teach') return true;
  if (slide.kind === 'plot') return isPlotAnswer(answer);
  if (
    slide.kind === 'tiles' || slide.kind === 'tree' || slide.kind === 'iterate' || slide.kind === 'table'
  ) {
    const expected =
      slide.kind === 'tree' ? slide.nodes.length
        : slide.kind === 'table' ? tableBlanks(slide)
          : slide.answer.length;
    return Array.isArray(answer) && answer.length === expected && answer.every((t) => t !== '');
  }
  // Every blank filled, or a branch taken at each stage: the same test, since a
  // path's answer is as long as the tree has stages.
  if (slide.kind === 'probTree' || slide.kind === 'venn') {
    return (
      Array.isArray(answer) &&
      answer.length === slide.answer.length &&
      answer.every((t) => t !== '')
    );
  }
  // A proof is answerable once every slot holds a step.
  if (slide.kind === 'order') {
    return (
      Array.isArray(answer) &&
      answer.length === slide.answer.length &&
      answer.every((t) => t !== '')
    );
  }
  // A line with dots on it but nothing shaded is not a set yet, and the
  // untouched line is not an answer at all.
  if (slide.kind === 'numberLine') return typeof answer === 'string' && draftHasShading(answer);
  // A diagram with one arrow on is a set of forces; a fill needs every blank.
  // The untouched diagram is not an answer at all.
  if (slide.kind === 'forces') {
    if (slide.mode === 'pick') return typeof answer === 'string' && canonicalForces(answer) !== '';
    return (
      Array.isArray(answer) &&
      answer.length === slide.answer.length &&
      answer.every((t) => t !== '')
    );
  }
  // One tile chosen is the whole answer.
  if (slide.kind === 'evaluate') return typeof answer === 'string' && answer !== '';
  // Answerable once any control has been tapped, even back to the identity:
  // that is a choice, where the untouched curve is not.
  if (slide.kind === 'transform') return typeof answer === 'string' && answer !== '';
  // Answerable once the expression is a single number, however it got there:
  // a wrong value still settles its line, and Check has to be reachable or the
  // learner could never find out that it was wrong. The value is the only test.
  if (slide.kind === 'reduce') return reduceComplete(slide.expr, answer);
  // A decision tree is answerable once the walk has reached a leaf. Mid-walk
  // the learner has chosen something, but not an answer.
  if (slide.kind === 'flow') return walkFlow(slide, Array.isArray(answer) ? answer : []).outcome !== undefined;
  // Steps is only answerable once every reduction has been worked through, so
  // Check stays disabled while there is still an operation left on the line.
  if (slide.kind === 'steps') {
    return (
      Array.isArray(answer) &&
      answer.length === slide.reductions.length &&
      answer.every((t) => t !== '')
    );
  }
  return typeof answer === 'string' && answer.trim() !== '';
}
