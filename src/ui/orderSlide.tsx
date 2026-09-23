/**
 * Put the steps of a proof in order.
 *
 * A controlled component like every other widget: it holds the placed step ids
 * and nothing else. A placed step looks the same whether it belongs in that
 * slot or not; only the frame round the whole proof is marked after grading,
 * so a wrong answer never shows where any step should have gone.
 */
import type { MouseEvent } from 'react';
import { Blocks, Inline } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';

type OrderSlideData = Extract<Slide, { kind: 'order' }>;

export function OrderSlide(props: SlideProps) {
  if (props.slide.kind !== 'order') return null;
  return <OrderBody {...props} slide={props.slide} />;
}

function OrderBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: OrderSlideData }) {
  const locked = isLocked(feedback, canEdit);
  // Anything that is not a list of ids — the player's '' between slides, or a
  // retry that cleared the draft — is an empty proof.
  const placed = Array.isArray(answer) ? answer.filter((id) => id !== '') : [];
  const text = new Map(slide.steps.map((step) => [step.id, step.text]));

  // Every control here stops the tap at the widget. The question area treats a
  // tap as "let me try again" after a wrong answer and clears the draft, so a
  // tap that reached it would undo the very step it had just placed.
  const place = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    if (placed.length >= slide.answer.length || placed.includes(id)) return;
    onAnswer([...placed, id]);
  };

  // Sending a step back closes the gap: the steps below it move up, so the
  // slots always hold one unbroken run from the top.
  const unplace = (event: MouseEvent, idx: number) => {
    event.stopPropagation();
    onAnswer(placed.filter((_, i) => i !== idx));
  };

  const clearAll = (event: MouseEvent) => {
    event.stopPropagation();
    onAnswer([]);
  };

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <ol className={`${frameClass(feedback)} column proof-slots`}>
        {slide.answer.map((_, idx) => {
          const id = placed[idx];
          return (
            <li key={idx} className="proof-slot-row">
              <span className="proof-slot-number" aria-hidden="true">
                {idx + 1}
              </span>
              <button
                type="button"
                className={`answer-slot proof-slot${id ? ' filled' : ''}`}
                disabled={locked || !id}
                aria-label={id ? undefined : `Step ${idx + 1}, empty`}
                onClick={(event) => unplace(event, idx)}
              >
                {id ? <Inline text={text.get(id) ?? ''} /> : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="tile-bank proof-bank">
        {slide.steps.map((step) => {
          const used = placed.includes(step.id);
          return (
            <button
              key={step.id}
              type="button"
              className={`tile proof-step${used ? ' used' : ''}`}
              disabled={locked || used}
              onClick={(event) => place(event, step.id)}
            >
              <Inline text={step.text} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || placed.length === 0}
        onClick={clearAll}
      >
        &#8635; Start over
      </button>
    </>
  );
}
