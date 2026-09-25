/**
 * Evaluate an expression one piece at a time.
 *
 * The working stacks downward: every line already settled stays on screen in
 * plain type, and only the last sits in a card with the undo control. That is
 * the whole point of the widget — the learner's reasoning is the artefact, not
 * just the number at the end, so a wrong turn five lines up is still visible
 * when the answer comes out wrong.
 *
 * Choosing happens in two taps, and both are graded. First a piece of the line:
 * every operator is offered whether or not its operands are settled, because
 * taking `8 + 4` before `4 x 3` has to be *possible* for the order to be worth
 * asking about. Then its value, from a bank. The reduction is committed only
 * once both are chosen, so nothing about the tap tells the learner whether it
 * was the right piece — being stopped at the moment of the mistake would give
 * the answer away, and that is the first invariant.
 *
 * State lives entirely in the session's answer, a list of `<path>=<value>`
 * moves. Every line on screen is replayed from it, so stepping back cannot
 * leave the picture and the grade disagreeing.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Tex, Blocks } from './Math';
import { frameClass, isLocked, type SlideProps } from './slides';
import type { Slide } from '../content/types';
import {
  bankFor,
  coveredBy,
  isPairPath,
  pairOwner,
  renderExpr,
  targetAt,
  targets,
  toTex,
  type Expr,
  type Fragment,
  type Path,
} from '../content/expr';
import { movesOf, workingLines } from './reduceWorking';
import { texToSpeech } from './texSpeech';

const moveToken = (path: Path, value: number) => `${path}=${value}`;

/**
 * One rendered line.
 *
 * `lit` is the target being replaced, if any: every fragment it covers is
 * highlighted, which is how tapping the `x` in `8 + 4 x 3` lights all three of
 * `4 x 3` without anyone computing where that sub-expression begins.
 */
function Line({
  expr,
  taps,
  lit,
  filled,
  correct,
  blankAt,
  onTap,
  refFor,
}: {
  expr: Expr;
  taps?: { path: Path }[];
  lit?: Path;
  filled?: Path;
  correct?: boolean;
  blankAt?: Path;
  onTap?: (path: Path) => void;
  refFor?: (path: Path, el: HTMLElement | null) => void;
}) {
  const fragments = renderExpr(expr);
  const parts: React.ReactNode[] = [];
  const blanked = blankAt ? coveredBy(fragments, blankAt) : [];
  const highlighted = new Set(lit !== undefined ? coveredBy(fragments, lit) : []);

  for (let i = 0; i < fragments.length; i += 1) {
    const fragment: Fragment = fragments[i];

    // The blank stands in for the target about to be replaced, so the rest of
    // the line is shown exactly as it will be once the value lands.
    if (blanked.includes(i)) {
      if (blanked[0] === i) parts.push(<span key={i} className="answer-slot focus" />);
      continue;
    }

    const isLit = highlighted.has(i);
    // The value this line introduced, ringed green once the walk is graded right.
    const isFilled = filled !== undefined && fragment.owners[fragment.owners.length - 1] === filled;
    // A pair hangs off its operator, so the operator's own handle answers for
    // it: `r~` is offered where the fragment says `r`.
    const tap = taps?.find(
      (t) =>
        t.path === fragment.handle ||
        (isPairPath(t.path) && pairOwner(t.path) === fragment.handle),
    );

    if (tap && onTap) {
      parts.push(
        <button
          key={i}
          type="button"
          ref={(el) => refFor?.(tap.path, el)}
          className={`reduce-handle${isLit ? ' lit' : ''}`}
          // Maths alone, which KaTeX hides from assistive tech: named in words.
          aria-label={texToSpeech(fragment.tex)}
          onClick={() => onTap(tap.path)}
        >
          <Tex tex={fragment.tex} />
        </button>,
      );
      continue;
    }

    parts.push(
      <span
        key={i}
        className={`reduce-piece${isLit ? ' lit' : ''}${isFilled && correct ? ' settled' : ''}`}
      >
        <Tex tex={fragment.tex} />
      </span>,
    );
  }

  return <div className="reduce-line">{parts}</div>;
}

export function ReduceSlide(props: SlideProps) {
  // Narrowed here so the body's hooks are never behind a conditional return.
  if (props.slide.kind !== 'reduce') return null;
  return <ReduceBody {...props} slide={props.slide} />;
}

type ReduceSlideType = Extract<Slide, { kind: 'reduce' }>;

function ReduceBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: ReduceSlideType }) {
  const locked = isLocked(feedback, canEdit);
  const tokens = Array.isArray(answer) ? answer : [];
  const moves = movesOf(tokens);

  /** Which piece is chosen and waiting for a value. */
  const [armed, setArmed] = useState<Path | null>(null);

  const worked = workingLines(slide.expr, moves);
  const live = worked[worked.length - 1].expr;
  const done = live.kind === 'num';
  const offered = done || locked ? [] : targets(live);

  // The arrow is measured from the laid-out button rather than positioned by a
  // rule, because where the tapped piece sits depends on how the line wrapped.
  const cardRef = useRef<HTMLDivElement>(null);
  const handles = useRef(new Map<Path, HTMLElement | null>());
  const [arrowX, setArrowX] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!armed) {
      setArrowX(null);
      return;
    }
    const el = handles.current.get(armed);
    const card = cardRef.current;
    if (!el || !card) return;
    const a = el.getBoundingClientRect();
    const b = card.getBoundingClientRect();
    setArrowX(a.left - b.left + a.width / 2);
  }, [armed, tokens.length]);

  const commit = (value: string) => {
    if (!armed || locked) return;
    setArmed(null);
    onAnswer([...tokens, moveToken(armed, Number(value))]);
  };

  const undo = () => {
    if (locked || tokens.length === 0) return;
    setArmed(null);
    onAnswer(tokens.slice(0, -1));
  };

  const armedNode = armed ? targetAt(live, armed) : undefined;
  // Authored banks win; a pair has none, so one is derived from the shape.
  const bank = armed ? (slide.banks[armed] ?? (armedNode ? bankFor(armedNode) : [])) : [];
  const correct = feedback.kind === 'correct';

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      {/* Settled working. Plain, because it is history. */}
      {worked.slice(0, -1).map((line, idx) => (
        <Line key={idx} expr={line.expr} filled={line.filled} correct={correct} />
      ))}

      <div className={`${frameClass(feedback)} column`} ref={cardRef}>
        {tokens.length > 0 && !locked && (
          <button type="button" className="undo-button" aria-label="Undo last step" onClick={undo}>
            &#8630;
          </button>
        )}

        <Line
          expr={live}
          taps={offered}
          lit={armed ?? undefined}
          filled={worked[worked.length - 1].filled}
          correct={correct}
          onTap={locked ? undefined : (path) => setArmed(path)}
          refFor={(path, el) => handles.current.set(path, el)}
        />

        {armed && (
          <>
            {arrowX !== null && (
              <span className="reduce-arrow" style={{ left: `${arrowX}px` }} aria-hidden="true" />
            )}
            <Line expr={live} blankAt={armed} />
          </>
        )}
      </div>

      {armed && bank.length > 0 && (
        <div className="tile-bank">
          {bank.map((value, idx) => (
            <button
              key={idx}
              type="button"
              className="tile"
              aria-label={texToSpeech(value)}
              disabled={locked}
              onClick={() => commit(value)}
            >
              <Tex tex={value} />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="text-button"
        disabled={locked || tokens.length === 0}
        onClick={() => {
          setArmed(null);
          onAnswer([]);
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/**
 * Evaluate the whole expression from four options.
 *
 * Deliberately the same subject as `ReduceSlide` above with every support
 * removed: nothing is tappable, there is no line of working, and the four
 * numbers on offer include what the plausible wrong orders produce — so
 * arriving at one of them feels like success right until it is marked.
 *
 * The blank sits inside the equation rather than the options being listed under
 * a question, because what is being asked is what goes *there*. A list of four
 * rows reads as a quiz about the expression; a slot in it reads as finishing
 * the line.
 */
export function EvaluateSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'evaluate') return null;
  const locked = isLocked(feedback, canEdit);
  const chosen = typeof answer === 'string' ? answer : '';

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={frameClass(feedback)}>
        <div className="reduce-line">
          {/* One render, not fragments: nothing here is tappable, so the line
              can be set as a whole — which is how a root keeps its radical
              rather than falling back to the index form the tappable version
              needs. */}
          <span className="reduce-piece">
            <Tex tex={toTex(slide.expr)} />
          </span>
          <span className="reduce-piece">
            <Tex tex="=" />
          </span>
          <span className={`answer-slot${chosen ? ' filled' : ''}`}>
            {chosen ? <Tex tex={chosen} /> : ' '}
          </span>
        </div>
      </div>

      <div className="tile-bank">
        {slide.options.map((option) => (
          <button
            key={option}
            type="button"
            className={`tile${chosen === option ? ' used' : ''}`}
            aria-label={texToSpeech(option)}
            disabled={locked}
            onClick={() => onAnswer(chosen === option ? '' : option)}
          >
            <Tex tex={option} />
          </button>
        ))}
      </div>
    </>
  );
}
