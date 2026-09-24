/**
 * The `numberLine` slide: draw a solution set with taps, all of them on the
 * line itself.
 *
 * - A tap **at a number** puts a filled dot there and chooses it. Anywhere
 *   above or below the line counts, so each number's target is a full tick
 *   spacing wide and the whole picture tall.
 * - A chosen dot grows an **arrow either side**, on the line. Tapping one
 *   shades the stretch on that side, up to the next dot, or off the edge as a
 *   ray beyond the outermost dot; tapping it again clears that stretch.
 * - Tapping a dot **chooses** it; tapping the chosen dot again makes it
 *   hollow, and once more takes it away.
 *
 * This replaced numbers in a band under the line for dots and the line itself
 * for shading, which asked for the point on one strip and the direction on
 * another. Now the point and the side it opens onto are chosen in one place.
 *
 * The meaning of a drawing — what set it is, and whether it is right — lives
 * in `src/content/numberLine.ts` and the reducer. This file only maps taps to
 * those operations and draws the draft. Like every widget, it styles only what
 * the learner drew: on a wrong answer their own pieces turn the wrong colour,
 * and the expected set is never drawn.
 */
import { useRef, useState } from 'react';
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
const LINE_Y = 38;
const LABEL_Y = 74;
const DOT_R = 7;
const DOT_HIT = 15;
const ARROW = 10;
/** How far a side arrow sits from its dot, and how big its target is. */
const CHIP_OFF = 27;
const CHIP = 30;

function ticks(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => min + i * step);
}

/** A number as the axis labels it: a true minus sign, not a hyphen. */
const label = (value: number) => (value < 0 ? `−${-value}` : String(value));

export function NumberLineSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  if (slide.kind !== 'numberLine') return null;

  const locked = isLocked(feedback, canEdit);
  const draft: Draft = (typeof answer === 'string' && parseDraft(answer)) || EMPTY_DRAFT;
  const { min, max, step } = slide;
  const scale = (W - 2 * PAD) / (max - min);
  const x = (value: number) =>
    value === -Infinity ? ARROW / 2 : value === Infinity ? W - ARROW / 2 : PAD + (value - min) * scale;
  const marks = ticks(min, max, step);
  // A choice outlives its dot only until the next render notices.
  const chosenDot = locked ? undefined : draft.dots.find((d) => d.at === chosen);

  const change = (next: Draft) => {
    if (locked) return;
    onAnswer(formatDraft(next));
  };

  // A tap on the picture, turned into the nearest number on the line. Read
  // from the rendered box rather than the event's offset, because the SVG is
  // scaled to fit the frame and offsets are in screen pixels.
  const tapLine = (event: React.MouseEvent<SVGRectElement>) => {
    if (locked) return;
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const at = min + (((event.clientX - box.left) / box.width) * W - PAD) / scale;
    const tick = Math.min(max, Math.max(min, min + Math.round((at - min) / step) * step));
    if (draft.dots.some((d) => d.at === tick)) {
      tapDot(tick);
      return;
    }
    change(togglePoint(draft, tick));
    setChosen(tick);
  };

  // Choose a dot; on the chosen one, filled goes hollow and hollow goes.
  const tapDot = (at: number) => {
    if (locked) return;
    if (chosen !== at) {
      setChosen(at);
      return;
    }
    const dot = draft.dots.find((d) => d.at === at);
    if (dot?.closed) {
      change(toggleClosed(draft, at));
    } else {
      change(togglePoint(draft, at));
      setChosen(null);
    }
  };

  // Shade, or clear, the stretch on one side of the chosen dot.
  const tapSide = (at: number, side: -1 | 1) => {
    change(toggleGap(draft, at + (side * step) / 2));
    setChosen(null);
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
                  <text className="nl-label" x={x(value)} y={LABEL_Y} textAnchor="middle">
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
              className={`nl-dot${dot.closed ? ' closed' : ' open'}${dot === chosenDot ? ' chosen' : ''}`}
              cx={x(dot.at)}
              cy={LINE_Y}
              r={DOT_R}
            />
          ))}

          {/* Tap targets, drawn last so they sit over everything they cover:
              the whole picture for numbers, then the dots, then the arrows. */}
          <rect
            className="nl-hit"
            x={0}
            y={0}
            width={W}
            height={H}
            fill="transparent"
            aria-label="Put a dot at the nearest number"
            onClick={tapLine}
          />
          {draft.dots.map((dot) => (
            <circle
              key={dot.at}
              className="nl-hit"
              cx={x(dot.at)}
              cy={LINE_Y}
              r={DOT_HIT}
              fill="transparent"
              aria-label={`Choose, empty or remove the dot at ${label(dot.at)}`}
              onClick={() => tapDot(dot.at)}
            />
          ))}
          {chosenDot &&
            ([-1, 1] as const).map((side) => {
              const cx = Math.min(W - CHIP / 2, Math.max(CHIP / 2, x(chosenDot.at) + side * CHIP_OFF));
              return (
                <g
                  key={side}
                  className="nl-side"
                  role="button"
                  aria-label={`Shade to the ${side < 0 ? 'left' : 'right'} of ${label(chosenDot.at)}`}
                  onClick={() => tapSide(chosenDot.at, side)}
                >
                  <rect x={cx - CHIP / 2} y={LINE_Y - CHIP / 2} width={CHIP} height={CHIP} rx={9} />
                  <polygon
                    points={
                      side < 0
                        ? `${cx - 6},${LINE_Y} ${cx + 5},${LINE_Y - 7} ${cx + 5},${LINE_Y + 7}`
                        : `${cx + 6},${LINE_Y} ${cx - 5},${LINE_Y - 7} ${cx - 5},${LINE_Y + 7}`
                    }
                  />
                </g>
              );
            })}
        </svg>
      </div>

      <p className="nl-hint">
        {chosenDot
          ? 'Tap an arrow to shade that side. Tap the dot again to empty or remove it.'
          : `Tap the line at ${Number.isInteger(step) ? 'a number' : 'a tick'} for a dot, then an arrow beside it to shade that side.`}
      </p>

      <button
        type="button"
        className="text-button"
        disabled={locked || draft.dots.length + draft.shaded.length === 0}
        onClick={() => {
          change(EMPTY_DRAFT);
          setChosen(null);
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}
