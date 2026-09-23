/**
 * The four slide types from the reference screenshots.
 *
 * Each is a controlled component: it owns no verdict of its own, only the
 * in-progress answer. Grading lives entirely in the session reducer, so a slide
 * cannot accidentally leak the answer by styling itself correct.
 */
import { useState, useEffect } from 'react';
import { Tex, Blocks } from './Math';
import {
  MathSlot,
  applyKey,
  deleteBack,
  docFromAnswer,
  docFromKeys,
  fnTex,
  isFilled,
  moveLeft,
  moveRight,
  toAnswer,
  type Doc,
} from './mathInput';
import { walkFlow } from './flow';
import { EvaluateSlide, ReduceSlide, reduceComplete } from './reduceSlide';
import type { Slide, KeypadKey } from '../content/types';
import {
  planeGridSvg,
  latticePoints,
  pointPosition,
  PLANE_VIEWBOX,
} from '../content/generators/plane';
import type { Answer, Feedback } from '../engine/session';
import { isPlotAnswer } from '../engine/session';
import { complexTex } from '../content/generators/format';
import { StepsSlide, TreeSlide, FlowSlide } from './workingSlides';
import { OrderSlide } from './orderSlide';
import { defaultSliderValue } from './sliderValue';

export interface SlideProps {
  slide: Slide;
  /** The resolved slide's id, used to key the answer editor's draft. */
  id: string;
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

/* ---------- Teach ---------- */

export function TeachSlide({ slide }: { slide: Extract<Slide, { kind: 'teach' }> }) {
  return <Blocks blocks={slide.body} />;
}

/* ---------- Choice ---------- */

export function ChoiceSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'choice') return null;
  const locked = isLocked(feedback, canEdit);
  const graded = feedback.kind !== 'idle' && feedback.kind !== 'invalid';

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>
      <div className="options">
        {slide.options.map((option) => {
          const selected = answer === option.id;
          // Only the chosen option is marked, and only after grading. A wrong
          // choice never highlights the right one.
          const mark =
            graded && selected ? (feedback.kind === 'correct' ? ' correct' : ' wrong') : '';
          return (
            <button
              key={option.id}
              type="button"
              className={`option${mark}`}
              aria-pressed={selected}
              disabled={locked}
              onClick={() => onAnswer(option.id)}
            >
              {option.tex ? <Tex tex={option.label} /> : option.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Expression, with contextual keypad ---------- */

const BASE_KEYS: KeypadKey[] = [
  { insert: '1' }, { insert: '2' }, { insert: '3' }, { insert: '4' }, { insert: '5' },
  { insert: '6' }, { insert: '7' }, { insert: '8' }, { insert: '9' }, { insert: '0' },
  { insert: '+' }, { insert: '-', label: '−' },
  // A decimal point was reachable only on the trigonometry slides, which added
  // it to their own keypad; everywhere else 2.5 was untypeable.
  { insert: '.' },
  { insert: '=' },
];

/**
 * The editor's tree, kept out of the session.
 *
 * The session stores what gets graded — the mathjs string — and nothing else,
 * so the reducer, the invariants and every test are untouched by this. Which
 * slot the caret sits in is no more the session's business than which key was
 * pressed last.
 *
 * Keyed by slide id because the player remounts the whole slide subtree on
 * every move, so stepping back and forward through the guided deck would
 * otherwise show an empty slot beside an answer the session still holds.
 */
const drafts = new Map<string, Doc>();

export function ExpressionSlide({
  slide,
  id,
  feedback,
  answer,
  onAnswer,
  canEdit,
  }: SlideProps) {
  const locked = isLocked(feedback, canEdit);
  const current = typeof answer === 'string' ? answer : '';

  // What the box holds before the learner has pressed anything: empty, or the
  // part of the answer the question has already written in for them.
  const start = docFromKeys(slide.kind === 'expression' ? slide.prefill : undefined);

  // The draft is trusted only while it still serialises to the answer the
  // session holds. Anything else — a fresh slide, or an answer cleared from
  // outside the editor — rebuilds from the string, one atom per character.
  const [doc, setDoc] = useState<Doc>(() => {
    const cached = drafts.get(id);
    if (cached && toAnswer(cached.nodes) === current) return cached;
    return current === '' ? start : docFromAnswer(current);
  });

  if (slide.kind !== 'expression') return null;

  // Topic-specific keys come last, so `i` sits where the screenshots put it.
  const keys = [...BASE_KEYS, ...slide.keypad];

  const apply = (next: Doc) => {
    if (locked) return;
    drafts.set(id, next);
    setDoc(next);
    // Only what was already written in is no answer yet, so Check stays off
    // rather than grading the question's own half of the expression.
    const typed = toAnswer(next.nodes);
    onAnswer(typed === toAnswer(start.nodes) ? '' : typed);
  };

  // Moving the caret changes nothing that gets graded, so it does not go
  // through onAnswer — which would clear an `incorrect` verdict merely because
  // the learner looked at the middle of their own answer.
  const move = (next: Doc) => {
    if (locked) return;
    drafts.set(id, next);
    setDoc(next);
  };

  const filled = isFilled(doc.nodes);

  const keyFace = (key: KeypadKey) => {
    // Braces, not quotes. A JSX attribute is not a JavaScript string literal:
    // tex="\\tfrac" hands KaTeX a literal backslash-backslash followed by the
    // letters "tfrac", which it renders as a line break and five italic letters.
    // Inside braces it is a real string and the escape collapses as intended.
    if (key.insert === '/') return <Tex tex={'\\tfrac{\\square}{\\square}'} />;
    if (key.insert === 'sqrt(') return <Tex tex={'\\sqrt{\\square}'} />;
    if (key.insert === '^') return <Tex tex={'x^{\\square}'} />;
    if (key.fn) return <Tex tex={fnTex(key.insert)} />;
    if (key.tex) return <Tex tex={key.insert} />;
    return key.label ?? key.insert;
  };

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={frameClass(feedback)}>
        {slide.lead && <Tex tex={slide.lead} />}
        <MathSlot doc={doc} showCaret={!locked} filled={filled} />
      </div>

      <div className="keypad">
        <div className="keypad-keys">
          {keys.map((key, idx) => (
            <button
              key={idx}
              type="button"
              className={key.fn ? 'key fn' : 'key'}
              disabled={locked}
              onClick={() => apply(applyKey(doc, key))}
            >
              {keyFace(key)}
            </button>
          ))}
        </div>

        <div className="keypad-utilities">
          <button
            type="button"
            className="key utility"
            aria-label="Move left"
            disabled={locked}
            onClick={() => move(moveLeft(doc))}
          >
            &#8249;
          </button>
          <button
            type="button"
            className="key utility"
            aria-label="Move right"
            disabled={locked}
            onClick={() => move(moveRight(doc))}
          >
            &#8250;
          </button>
          <button
            type="button"
            className="key utility"
            aria-label="Delete"
            disabled={locked}
            onClick={() => apply(deleteBack(doc))}
          >
            &#9003;
          </button>
        </div>
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || !filled}
        onClick={() => apply(start)}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/* ---------- Tiles ---------- */

export function TilesSlide({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
  }: SlideProps) {
  if (slide.kind !== 'tiles') return null;
  const locked = isLocked(feedback, canEdit);
  const filled = Array.isArray(answer) ? answer : [];

  const blanks = slide.answer.length;
  const slots: string[] = Array.from({ length: blanks }, (_, idx) => filled[idx] ?? '');

  // A token is spent once for each time it has been placed, so a bank holding
  // two "2" tiles still allows the answer 2 and 2.
  const spent = new Map<string, number>();
  for (const token of slots) {
    if (token) spent.set(token, (spent.get(token) ?? 0) + 1);
  }

  const place = (token: string) => {
    const next = [...slots];
    const free = next.findIndex((slot) => slot === '');
    if (free === -1) return;
    next[free] = token;
    onAnswer(next);
  };

  const clearSlot = (idx: number) => {
    const next = [...slots];
    next[idx] = '';
    onAnswer(next);
  };

  // Split "x = {0} \text{ or } x = {1}" into literal TeX and blank markers.
  const segments = slide.template.split(/\{(\d+)\}/g);

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={frameClass(feedback)}>
        {segments.map((segment, idx) => {
          if (idx % 2 === 0) {
            return segment ? <Tex key={idx} tex={segment} /> : null;
          }
          const slotIndex = Number(segment);
          const token = slots[slotIndex] ?? '';
          return (
            <button
              key={idx}
              type="button"
              className={`answer-slot${token ? ' filled' : ''}`}
              disabled={locked || !token}
              onClick={() => clearSlot(slotIndex)}
            >
              {token ? <Tex tex={token} /> : ' '}
            </button>
          );
        })}
      </div>

      <div className="tile-bank">
        {slide.bank.map((token, idx) => {
          const remaining = spent.get(token) ?? 0;
          // Hide as many copies of this token as have been placed.
          const alreadyHidden = slide.bank
            .slice(0, idx)
            .filter((other) => other === token).length;
          const used = alreadyHidden < remaining;
          return (
            <button
              key={idx}
              type="button"
              className={`tile${used ? ' used' : ''}`}
              disabled={locked || used}
              onClick={() => place(token)}
            >
              <Tex tex={token} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || slots.every((slot) => slot === '')}
        onClick={() => onAnswer(Array.from({ length: blanks }, () => ''))}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/* ---------- Plot: tap a point on the complex plane ---------- */

export function PlotSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'plot') return null;
  const locked = isLocked(feedback, canEdit);
  const { range } = slide;
  const chosen = isPlotAnswer(answer) ? answer : null;

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={frameClass(feedback)}>
        <div className="plot-wrap">
          {/* The grid depends only on `range`, so it is generated once and
              cached. Only the chosen dot below it changes as you tap. */}
          <div dangerouslySetInnerHTML={{ __html: planeGridSvg(range) }} />

          {/* Tap targets and the plotted dot share the plane's own viewBox, so
              alignment cannot drift if the frame changes. */}
          <svg
            className={`plot-hits${locked ? ' locked' : ''}`}
            viewBox={PLANE_VIEWBOX}
          >
            {latticePoints(range).map((point) => {
              const { x, y } = pointPosition(point, range);
              return (
                <circle
                  key={`${point.re},${point.im}`}
                  cx={x}
                  cy={y}
                  r={11}
                  fill="transparent"
                  onClick={() => !locked && onAnswer({ re: point.re, im: point.im })}
                />
              );
            })}
            {chosen && (
              <circle
                cx={pointPosition(chosen, range).x}
                cy={pointPosition(chosen, range).y}
                r={5}
                fill="var(--accent)"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      </div>

      <p className="plot-readout">
        {chosen ? <Tex tex={complexTex(chosen.re, chosen.im)} /> : 'Tap a point'}
      </p>
    </>
  );
}

/* ---------- Slider ---------- */

/**
 * Drag to a value.
 *
 * The readout sits above the track rather than beside the handle: a value that
 * moves with the thumb is unreadable on a phone at the moment it matters, when
 * a thumb is covering it.
 *
 * A range input always has a position, so the handle is drawn mid-track before
 * anyone touches it — but that position is not an answer. It used to be seeded
 * as one, and since the handle has to rest *somewhere*, it rested on the right
 * answer for some draws: on `argument-turns` every position on the track is
 * one question's answer, so an untouched slider scored one draw in eight. So
 * the draft stays empty and *Check* stays off until the handle is dragged, or
 * tapped where it sits for a learner whose answer is the resting value.
 */
/**
 * Where the marker sits, as a percentage along its axis.
 *
 * Measured from `origin` rather than from zero, because a slider's answer is
 * often a size rather than a position: a period of 6 means six *after a peak*.
 * A `y` figure is measured downward, since an SVG's vertical axis runs the
 * other way from the quantity it is drawing.
 */
function markerAt(
  figure: { xMin: number; xMax: number; axis?: 'x' | 'y'; origin?: number },
  value: number,
): React.CSSProperties {
  const at = (figure.origin ?? 0) + value;
  const fraction = (at - figure.xMin) / (figure.xMax - figure.xMin);
  const percent = Math.max(0, Math.min(1, fraction)) * 100;
  return figure.axis === 'y' ? { top: `${100 - percent}%` } : { left: `${percent}%` };
}

export function SliderSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'slider') return null;
  const locked = isLocked(feedback, canEdit);
  const touched = typeof answer === 'string' && answer !== '';
  const value = touched ? Number(answer) : defaultSliderValue(slide.min, slide.max, slide.step);

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      {slide.figure && (
        <div className="slider-figure">
          {/* Generated by our own content code, never user input. */}
          <div dangerouslySetInnerHTML={{ __html: slide.figure.svg }} />
          <span
            className={`slider-marker${slide.figure.axis === 'y' ? ' across' : ''}`}
            style={markerAt(slide.figure, value)}
          />
        </div>
      )}

      <div className={`${frameClass(feedback)}${touched ? '' : ' untouched'}`}>
        <Tex tex={slide.readout.replace('{v}', String(value))} />
      </div>

      <input
        type="range"
        className="slider-input"
        min={slide.min}
        max={slide.max}
        step={slide.step}
        value={value}
        disabled={locked}
        aria-label="Choose a value"
        onChange={(event) => onAnswer(event.target.value)}
        // A tap that leaves the handle where it is fires no change, and is
        // the only way to choose the resting value without dragging off it.
        onPointerUp={(event) => onAnswer(event.currentTarget.value)}
      />

      <div className="slider-scale">
        <span>{slide.min}</span>
        <span>{slide.max}</span>
      </div>
    </>
  );
}

/* ---------- Dispatcher ---------- */

export function SlideView(props: SlideProps) {
  const { slide } = props;

  // Clear the draft answer whenever the slide changes.
  const { onAnswer } = props;
  useEffect(() => {
    onAnswer(initialAnswer(slide));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide]);

  switch (slide.kind) {
    case 'teach':
      return <TeachSlide slide={slide} />;
    case 'choice':
      return <ChoiceSlide {...props} />;
    case 'expression':
      return <ExpressionSlide {...props} />;
    case 'tiles':
      return <TilesSlide {...props} />;
    case 'plot':
      return <PlotSlide {...props} />;
    case 'steps':
      return <StepsSlide {...props} />;
    case 'tree':
      return <TreeSlide {...props} />;
    case 'slider':
      return <SliderSlide {...props} />;
    case 'flow':
      return <FlowSlide {...props} />;
    case 'reduce':
      return <ReduceSlide {...props} />;
    case 'evaluate':
      return <EvaluateSlide {...props} />;
    case 'order':
      return <OrderSlide {...props} />;
  }
}

/** The draft a slide starts from, before the learner has done anything. */
export function initialAnswer(slide: Slide): Answer {
  if (slide.kind === 'tiles') return Array.from({ length: slide.answer.length }, () => '');
  if (slide.kind === 'tree') return Array.from({ length: slide.nodes.length }, () => '');
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
  // not something the learner chose, and it can be the answer.
  return '';
}

/** Whether the current draft is complete enough to submit. */
export function hasAnswer(slide: Slide, answer: Answer): boolean {
  if (slide.kind === 'teach') return true;
  if (slide.kind === 'plot') return isPlotAnswer(answer);
  if (slide.kind === 'tiles' || slide.kind === 'tree') {
    const expected = slide.kind === 'tiles' ? slide.answer.length : slide.nodes.length;
    return Array.isArray(answer) && answer.length === expected && answer.every((t) => t !== '');
  }
  // A proof is answerable once every slot holds a step.
  if (slide.kind === 'order') {
    return (
      Array.isArray(answer) &&
      answer.length === slide.answer.length &&
      answer.every((t) => t !== '')
    );
  }
  // One tile chosen is the whole answer.
  if (slide.kind === 'evaluate') return typeof answer === 'string' && answer !== '';
  // Answerable once the expression is a single number, however it got there:
  // an illegal reduction still settles its line, and Check has to be reachable
  // or the learner could never find out that it was illegal.
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

/** Local draft-answer state, reset by SlideView when the slide changes. */
export function useDraftAnswer(): [Answer, (a: Answer) => void] {
  const [answer, setAnswer] = useState<Answer>('');
  return [answer, setAnswer];
}
