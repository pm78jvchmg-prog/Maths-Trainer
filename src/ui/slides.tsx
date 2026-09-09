/**
 * The four slide types from the reference screenshots.
 *
 * Each is a controlled component: it owns no verdict of its own, only the
 * in-progress answer. Grading lives entirely in the session reducer, so a slide
 * cannot accidentally leak the answer by styling itself correct.
 */
import { useState, useEffect } from 'react';
import { Tex, Blocks } from './Math';
import type { Slide, KeypadKey } from '../content/types';
import type { Answer, Feedback } from '../engine/session';

export interface SlideProps {
  slide: Slide;
  feedback: Feedback;
  /** Current draft answer, lifted so the player can enable/disable Check. */
  answer: Answer;
  onAnswer: (answer: Answer) => void;
}

/** Once graded, the widget locks until the learner chooses to try again. */
const isLocked = (feedback: Feedback) =>
  feedback.kind === 'correct' || feedback.kind === 'incorrect' || feedback.kind === 'revealed';

function frameClass(feedback: Feedback): string {
  if (feedback.kind === 'correct') return 'answer-frame correct';
  if (feedback.kind === 'incorrect' || feedback.kind === 'revealed') return 'answer-frame wrong';
  return 'answer-frame';
}

/* ---------- Teach ---------- */

export function TeachSlide({ slide }: { slide: Extract<Slide, { kind: 'teach' }> }) {
  return <Blocks blocks={slide.body} />;
}

/* ---------- Choice ---------- */

export function ChoiceSlide({ slide, feedback, answer, onAnswer }: SlideProps) {
  if (slide.kind !== 'choice') return null;
  const locked = isLocked(feedback);
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
];

export function ExpressionSlide({ slide, feedback, answer, onAnswer }: SlideProps) {
  if (slide.kind !== 'expression') return null;
  const locked = isLocked(feedback);
  const text = typeof answer === 'string' ? answer : '';
  // Topic-specific keys come last, so `i` sits where the screenshots put it.
  const keys = [...BASE_KEYS, ...slide.keypad];

  const press = (key: KeypadKey) => !locked && onAnswer(text + key.insert);
  const backspace = () => !locked && onAnswer(text.slice(0, -1));

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={frameClass(feedback)}>
        {slide.lead && <Tex tex={slide.lead} />}
        <span className={`answer-slot${text ? ' filled' : ''}${locked ? '' : ' focus'}`}>
          {/* Rendered as maths so a typed `i` italicises and spacing matches
              the question above. Half-finished input is not valid TeX, so Tex
              falls back to the raw string rather than throwing. */}
          {text ? <Tex tex={text} /> : ' '}
          {!locked && <span className="caret" />}
        </span>
      </div>

      <div className="keypad">
        {keys.map((key, idx) => (
          <button
            key={idx}
            type="button"
            className="key"
            disabled={locked}
            onClick={() => press(key)}
          >
            {key.tex ? <Tex tex={key.insert} /> : (key.label ?? key.insert)}
          </button>
        ))}
        <button
          type="button"
          className="key utility"
          aria-label="Delete"
          disabled={locked}
          onClick={backspace}
        >
          &#9003;
        </button>
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || text === ''}
        onClick={() => onAnswer('')}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/* ---------- Tiles ---------- */

export function TilesSlide({ slide, feedback, answer, onAnswer }: SlideProps) {
  if (slide.kind !== 'tiles') return null;
  const locked = isLocked(feedback);
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

/* ---------- Dispatcher ---------- */

export function SlideView(props: SlideProps) {
  const { slide } = props;

  // Clear the draft answer whenever the slide changes.
  const { onAnswer } = props;
  useEffect(() => {
    if (slide.kind === 'tiles') {
      onAnswer(Array.from({ length: slide.answer.length }, () => ''));
    } else {
      onAnswer('');
    }
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
  }
}

/** Whether the current draft is complete enough to submit. */
export function hasAnswer(slide: Slide, answer: Answer): boolean {
  if (slide.kind === 'teach') return true;
  if (slide.kind === 'tiles') {
    return Array.isArray(answer) && answer.length > 0 && answer.every((t) => t !== '');
  }
  return typeof answer === 'string' && answer.trim() !== '';
}

/** Local draft-answer state, reset by SlideView when the slide changes. */
export function useDraftAnswer(): [Answer, (a: Answer) => void] {
  const [answer, setAnswer] = useState<Answer>('');
  return [answer, setAnswer];
}
