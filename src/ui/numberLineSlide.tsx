/**
 * The `numberLine` slide: draw a solution set with taps.
 *
 * Three kinds of tap, each on its own band so no target is narrower than a
 * tick spacing:
 *
 * - the **numbers** under the line place a dot, or take one away;
 * - a **dot** toggles between filled (the point is in the set) and hollow;
 * - the **line** itself shades the stretch the tap fell in, or clears it.
 *   Beyond the outermost dot that stretch runs off the edge and is drawn as a
 *   ray with an arrowhead.
 *
 * The meaning of a drawing — what set it is, and whether it is right — lives
 * in `src/content/numberLine.ts` and the reducer. This file only maps taps to
 * those operations and draws the draft. Like every widget, it styles only what
 * the learner drew: on a wrong answer their own pieces turn the wrong colour,
 * and the expected set is never drawn.
 */
import { useRef } from 'react';
import { Blocks } from './Math';
import { frameClass, isLocked, type SlideProps } from './slides';
import {
  EMPTY_DRAFT,
  formatDraft,
  parseDraft,
  toggleClosed,
  toggleGap,
  togglePoint,
  type Draft,
} from '../content/numberLine';

/** The drawing's own coordinate space; the SVG scales to the frame's width. */
const W = 340;
const H = 92;
/** Room either side of the end ticks for a ray's arrowhead and a label. */
const PAD = 22;
const LINE_Y = 32;
/** Taps above this height are on the line; below it, on the numbers. */
const BAND = 46;
const DOT_R = 7;
const DOT_HIT = 13;
const ARROW = 10;

function ticks(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => min + i * step);
}

/** A number as the axis labels it: a true minus sign, not a hyphen. */
const label = (value: number) => (value < 0 ? `−${-value}` : String(value));

export function NumberLineSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  if (slide.kind !== 'numberLine') return null;

  const locked = isLocked(feedback, canEdit);
  const draft: Draft = (typeof answer === 'string' && parseDraft(answer)) || EMPTY_DRAFT;
  const { min, max, step } = slide;
  const scale = (W - 2 * PAD) / (max - min);
  const x = (value: number) =>
    value === -Infinity ? ARROW / 2 : value === Infinity ? W - ARROW / 2 : PAD + (value - min) * scale;
  const spacing = step * scale;
  const marks = ticks(min, max, step);

  const change = (next: Draft) => {
    if (locked) return;
    onAnswer(formatDraft(next));
  };

  // A tap on the line, turned back into a position on the number line. Read
  // from the rendered box rather than the event's offset, because the SVG is
  // scaled to fit the frame and offsets are in screen pixels.
  const tapLine = (event: React.MouseEvent<SVGRectElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const at = ((event.clientX - box.left) / box.width) * W;
    change(toggleGap(draft, min + (at - PAD) / scale));
  };

  // The same verdicts the frame shows: once the working is revealed the
  // drawing on screen is still the learner's wrong one, so it stays marked.
  const graded =
    feedback.kind === 'correct'
      ? ' correct'
      : feedback.kind === 'incorrect' || feedback.kind === 'revealed'
        ? ' wrong'
        : '';

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} number-line-frame`}>
        <svg
          ref={svgRef}
          className={`number-line${graded}${locked ? ' locked' : ''}`}
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="Number line"
        >
          <line className="nl-axis" x1={2} y1={LINE_Y} x2={W - 2} y2={LINE_Y} />

          {marks.map((value) => {
            const whole = Number.isInteger(value);
            const reach = whole ? 8 : 5;
            return (
              <g key={value}>
                <line
                  className="nl-tick"
                  x1={x(value)}
                  y1={LINE_Y - reach}
                  x2={x(value)}
                  y2={LINE_Y + reach}
                />
                {whole && (
                  <text className="nl-label" x={x(value)} y={66} textAnchor="middle">
                    {label(value)}
                  </text>
                )}
              </g>
            );
          })}

          {draft.shaded.map((gap) => (
            <g key={`${gap.lo}:${gap.hi}`} className="nl-shade">
              <line x1={x(gap.lo)} y1={LINE_Y} x2={x(gap.hi)} y2={LINE_Y} />
              {gap.lo === -Infinity && (
                <polygon
                  points={`0,${LINE_Y} ${ARROW + 2},${LINE_Y - 7} ${ARROW + 2},${LINE_Y + 7}`}
                />
              )}
              {gap.hi === Infinity && (
                <polygon
                  points={`${W},${LINE_Y} ${W - ARROW - 2},${LINE_Y - 7} ${W - ARROW - 2},${LINE_Y + 7}`}
                />
              )}
            </g>
          ))}

          {draft.dots.map((dot) => (
            <circle
              key={dot.at}
              className={`nl-dot${dot.closed ? ' closed' : ' open'}`}
              cx={x(dot.at)}
              cy={LINE_Y}
              r={DOT_R}
            />
          ))}

          {/* Tap targets, drawn last so they sit over everything they cover. */}
          <rect
            className="nl-hit"
            x={0}
            y={0}
            width={W}
            height={BAND}
            fill="transparent"
            aria-label="Shade this part of the line"
            onClick={tapLine}
          />
          {marks.map((value) => (
            <rect
              key={value}
              className="nl-hit"
              x={x(value) - spacing / 2}
              y={BAND}
              width={spacing}
              height={H - BAND}
              fill="transparent"
              aria-label={`Dot at ${label(value)}`}
              onClick={() => change(togglePoint(draft, value))}
            />
          ))}
          {draft.dots.map((dot) => (
            <circle
              key={dot.at}
              className="nl-hit"
              cx={x(dot.at)}
              cy={LINE_Y}
              r={DOT_HIT}
              fill="transparent"
              aria-label={`Fill or empty the dot at ${label(dot.at)}`}
              onClick={() => change(toggleClosed(draft, dot.at))}
            />
          ))}
        </svg>
      </div>

      {/* Half steps carry no label, so there the number to tap is a tick. */}
      <p className="nl-hint">
        {Number.isInteger(step) ? 'Tap a number' : 'Tap below a tick'} for a dot, a dot to fill or
        empty it, the line to shade.
      </p>

      <button
        type="button"
        className="text-button"
        disabled={locked || draft.dots.length + draft.shaded.length === 0}
        onClick={() => change(EMPTY_DRAFT)}
      >
        &#8635; Start over
      </button>
    </>
  );
}
