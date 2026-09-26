/**
 * The widgets for teach, choice, expression, tiles, plot, slider and table
 * slides, and `SlideView`, which picks the widget for each of the nineteen
 * slide kinds; the rest live in their own files (`workingSlides.tsx`,
 * `reduceSlide.tsx`, `transformSlide.tsx`, …).
 *
 * Each is a controlled component: it owns no verdict of its own, only the
 * in-progress answer. Grading lives entirely in the session reducer, so a slide
 * cannot accidentally leak the answer by styling itself correct.
 */
import { useEffect, useRef, useState } from 'react';
import { Tex, Blocks } from './Math';
import { MathSlot } from './MathSlot';
import { keypadRows } from './keypadRows';
import {
  applyKey,
  deleteBack,
  docFromKeys,
  fnTex,
  isFilled,
  moveLeft,
  moveRight,
  toAnswer,
  type Doc,
} from './mathInput';
import { blankName, keyName, texToSpeech } from './texSpeech';
import { EvaluateSlide, ReduceSlide } from './reduceSlide';
import type { Slide, KeypadKey } from '../content/types';
import {
  planeGridSvg,
  latticePoints,
  pointPosition,
  PLANE_VIEWBOX,
} from '../content/generators/plane';
import { isPlotAnswer } from '../engine/session';
import { complexTex } from '../content/generators/format';
import { StepsSlide, TreeSlide, FlowSlide } from './workingSlides';
import { IterateSlide } from './iterateSlide';
import { ProbTreeSlide } from './probTreeSlide';
import { VennSlide } from './vennSlide';
import { OrderSlide } from './orderSlide';
import { defaultSliderValue } from './sliderValue';
import { TransformSlide } from './transformSlide';
import { NumberLineSlide } from './numberLineSlide';
import { ForcesSlide } from './forcesSlide';
import { swapSlots, useSlotDrag } from './slotDrag';
import { frameClass, initialAnswer, isLocked, tableBlanks, type SlideProps } from './slides';
import { Calculator } from './Calculator';

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
              // KaTeX hides what it draws from assistive tech, so an option
              // that is maths alone has no name unless it is given one.
              aria-label={option.tex ? texToSpeech(option.label) : undefined}
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
 * The editor's tree lives in this component's state, kept out of the session.
 *
 * The session stores what gets graded — the mathjs string — and nothing else,
 * so the reducer, the invariants and every test are untouched by this. Which
 * slot the caret sits in is no more the session's business than which key was
 * pressed last.
 *
 * Nothing is restored on a return visit: the player remounts the slide on
 * every move and clears the draft as it does, so the box always opens as the
 * question sets it — empty, or holding its prefill.
 */
export function ExpressionSlide({
  slide,
  feedback,
  onAnswer,
  canEdit,
  }: SlideProps) {
  const locked = isLocked(feedback, canEdit);

  // What the box holds before the learner has pressed anything: empty, or the
  // part of the answer the question has already written in for them.
  const start = docFromKeys(slide.kind === 'expression' ? slide.prefill : undefined);
  const [doc, setDoc] = useState<Doc>(start);
  const frameRef = useRef<HTMLDivElement>(null);
  const keypadRef = useRef<HTMLDivElement>(null);

  if (slide.kind !== 'expression') return null;

  // Topic-specific keys come after the digits, so `i` sits where the
  // screenshots put it, and each row is its own grid so none ends in a gap.
  const rows = keypadRows(BASE_KEYS, slide.keypad);

  // The keypad is pinned to the foot of the slide (`.keypad.pinned`), so on a
  // question long enough to scroll it can sit over the answer box. Pressing a
  // key brings the box up to just above it, so nobody types blind. Not done
  // when the slide opens: that would scroll the question's opening lines away.
  // Measured rather than `scrollIntoView` with a scroll margin, which Chrome
  // treated as already in view with the box sitting behind the pad. Measured
  // on the next frame, once the key's character is drawn: a fraction grows
  // the box, and the old height would leave its lower half hidden.
  const reveal = () => requestAnimationFrame(() => {
    const frame = frameRef.current;
    const keypad = keypadRef.current;
    const scroller = frame?.closest('.slide');
    if (!frame || !keypad || !scroller) return;
    const hidden = frame.getBoundingClientRect().bottom + 12 - keypad.getBoundingClientRect().top;
    if (hidden > 0) scroller.scrollBy({ top: hidden, behavior: 'smooth' });
  });

  const apply = (next: Doc) => {
    if (locked) return;
    setDoc(next);
    reveal();
    // Only what was already written in is no answer yet, so Check stays off
    // rather than grading the question's own half of the expression.
    const typed = toAnswer(next.nodes);
    onAnswer(typed === toAnswer(start.nodes) ? '' : typed);
  };

  // Moving the caret changes nothing that gets graded, so it does not go
  // through onAnswer and the answer the session holds is unchanged. It does
  // still clear a wrong verdict: the tap bubbles up to the question area, and
  // `tapOnQuestion` treats it as a retry like any other tap there — a learner
  // moving the caret after a wrong answer is starting to change it.
  const move = (next: Doc) => {
    if (locked) return;
    setDoc(next);
    reveal();
  };

  const filled = isFilled(doc.nodes);

  const keyFace = (key: KeypadKey) => {
    // Braces, not quotes. A JSX attribute is not a JavaScript string literal:
    // tex="\\tfrac" hands KaTeX a literal backslash-backslash followed by the
    // letters "tfrac", which it renders as a line break and five italic letters.
    // Inside braces it is a real string and the escape collapses as intended.
    // Every branch drawn in TeX alone has a matching name in `keyName`.
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

      <div className={frameClass(feedback)} ref={frameRef}>
        {slide.lead && <Tex tex={slide.lead} />}
        <MathSlot doc={doc} showCaret={!locked} filled={filled} />
      </div>

      <div className={locked ? 'keypad' : 'keypad pinned'} ref={keypadRef}>
        <div className="keypad-keys">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="keypad-row" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
              {row.map((key, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={key.fn ? 'key fn' : 'key'}
                  aria-label={keyName(key)}
                  disabled={locked}
                  onClick={() => apply(applyKey(doc, key))}
                >
                  {keyFace(key)}
                </button>
              ))}
            </div>
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
              // KaTeX hides what it draws from assistive tech, so a blank or a
              // tile holding maths alone is named in words. A blank names only
              // what the learner put in it.
              aria-label={blankName(`Blank ${slotIndex + 1} of ${blanks}`, token)}
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
              aria-label={texToSpeech(token)}
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

type PlotSlideData = Extract<Slide, { kind: 'plot' }>;
type LatticePoint = { re: number; im: number };

export function PlotSlide(props: SlideProps) {
  // Narrowed here so the body's hooks never sit behind a conditional return.
  if (props.slide.kind !== 'plot') return null;
  return <PlotBody {...props} slide={props.slide} />;
}

function PlotBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: PlotSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const { range } = slide;
  const chosen = isPlotAnswer(answer) ? answer : null;

  // One tab stop for the whole plane rather than one per point, which was 81
  // Tab presses to get past it: the point last moved to or chosen, else the
  // chosen answer, else the origin. The arrow keys move it across the lattice.
  const [cursor, setCursor] = useState<LatticePoint | null>(null);
  const stop = cursor ?? chosen ?? { re: 0, im: 0 };
  const targets = useRef(new Map<string, SVGCircleElement>());
  const keyOf = (point: LatticePoint) => `${point.re},${point.im}`;

  const choose = (point: LatticePoint) => {
    if (locked) return;
    setCursor(point);
    onAnswer({ re: point.re, im: point.im });
  };

  const onKey = (event: React.KeyboardEvent, point: LatticePoint) => {
    if (locked) return;
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the question.
      event.preventDefault();
      choose(point);
      return;
    }
    // Clamped at the edge rather than wrapping, as a grid is on paper.
    const clamp = (value: number) => Math.max(-range, Math.min(range, value));
    const moves: Record<string, LatticePoint> = {
      ArrowRight: { re: clamp(point.re + 1), im: point.im },
      ArrowLeft: { re: clamp(point.re - 1), im: point.im },
      ArrowUp: { re: point.re, im: clamp(point.im + 1) },
      ArrowDown: { re: point.re, im: clamp(point.im - 1) },
      Home: { re: -range, im: point.im },
      End: { re: range, im: point.im },
    };
    const next = moves[event.key];
    if (!next) return;
    // Arrows would otherwise scroll the question too.
    event.preventDefault();
    setCursor(next);
    targets.current.get(keyOf(next))?.focus();
  };

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
              alignment cannot drift if the frame changes.

              Each target is also a keyboard and screen-reader button, the same
              way the force diagram's arrow heads are: named by the number it
              stands for (the readout below shows that same number once it is
              chosen), pressed when chosen, and chosen with Enter or Space.
              Only one is in the tab order at a time (`stop`, above), and once
              the answer is locked none is, so the way to Continue is not
              through the plane. */}
          <svg
            className={`plot-hits${locked ? ' locked' : ''}`}
            viewBox={PLANE_VIEWBOX}
            role="group"
            aria-label="Points on the complex plane. Arrow keys move between points."
          >
            {latticePoints(range).map((point) => {
              const { x, y } = pointPosition(point, range);
              const key = keyOf(point);
              return (
                <circle
                  key={key}
                  ref={(el) => {
                    if (el) targets.current.set(key, el);
                    else targets.current.delete(key);
                  }}
                  cx={x}
                  cy={y}
                  r={11}
                  fill="transparent"
                  role="button"
                  tabIndex={!locked && key === keyOf(stop) ? 0 : -1}
                  aria-label={`Point ${complexTex(point.re, point.im).replace(/-/g, '−')}`}
                  aria-pressed={chosen?.re === point.re && chosen?.im === point.im}
                  aria-disabled={locked || undefined}
                  onClick={() => choose(point)}
                  onKeyDown={(event) => onKey(event, point)}
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

/* ---------- Table: fill in a table of terms ---------- */

type TableSlideData = Extract<Slide, { kind: 'table' }>;

export function TableSlide(props: SlideProps) {
  // Narrowed here so the body's hooks never sit behind a conditional return.
  if (props.slide.kind !== 'table') return null;
  return <TableBody {...props} slide={props.slide} />;
}

/**
 * The table, with its blanks as tap targets and a bank beneath.
 *
 * Tap a blank to choose where the next value goes, then a value; tap a filled
 * blank to take its value back. With no blank chosen a value lands in the first
 * empty one, so a learner working down the column never has to aim.
 *
 * Which blank is chosen is presentation only, like the armed span in
 * `StepsSlide`. After a wrong answer no cell is marked either way — the frame
 * says the table is wrong, and which entries are right would be a disclosure.
 */
function TableBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: TableSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const blanks = tableBlanks(slide);
  const given = Array.isArray(answer) ? answer : [];
  const filled = Array.from({ length: blanks }, (_, idx) => given[idx] ?? '');
  const [chosen, setChosen] = useState<number | null>(null);

  // The blank the next value goes into: the chosen one while it is still
  // empty, otherwise the first empty blank.
  const target = chosen !== null && filled[chosen] === '' ? chosen : filled.indexOf('');

  const spent = new Map<string, number>();
  for (const token of filled) {
    if (token) spent.set(token, (spent.get(token) ?? 0) + 1);
  }

  const place = (value: string) => {
    if (locked || target === -1) return;
    const next = [...filled];
    next[target] = value;
    // Carry on from where the learner is working rather than jumping back to
    // the top: the next empty blank after this one, wrapping round.
    const after = [...next.keys()].map((step) => (target + 1 + step) % blanks);
    setChosen(after.find((idx) => next[idx] === '') ?? null);
    onAnswer(next);
  };

  const tapBlank = (idx: number) => {
    if (locked) return;
    setChosen(idx);
    if (filled[idx] === '') return;
    const next = [...filled];
    next[idx] = '';
    onAnswer(next);
  };

  // A filled blank dragged onto another swaps the two; onto an empty one, moves.
  const { slotProps } = useSlotDrag(!locked, (from, to) => {
    setChosen(null);
    onAnswer(swapSlots(filled, from, to));
  });

  // Blank numbers in reading order, so each null cell knows its answer slot.
  let counter = 0;
  const slots = slide.rows.map((row) => row.map((cell) => (cell === null ? counter++ : -1)));

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} table-frame`}>
        <table className="term-table" data-slot-group="">
          <thead>
            <tr>
              {slide.columns.map((header, col) => (
                <th key={col} scope="col">
                  <Tex tex={header} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, col) => {
                  if (cell !== null) {
                    return <td key={col}>{cell ? <Tex tex={cell} /> : null}</td>;
                  }
                  const slot = slots[r][col];
                  const token = filled[slot];
                  const focus = !locked && slot === target;
                  return (
                    <td key={col} {...slotProps(slot, !!token)}>
                      <button
                        type="button"
                        className={`answer-slot${token ? ' filled' : ''}${focus ? ' focus' : ''}`}
                        aria-label={token ? `Clear ${texToSpeech(token)}` : 'Choose this blank'}
                        disabled={locked}
                        onClick={() => tapBlank(slot)}
                      >
                        {token ? <Tex tex={token} /> : ' '}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tile-bank">
        {slide.bank.map((value, idx) => {
          const placed = spent.get(value) ?? 0;
          const earlier = slide.bank.slice(0, idx).filter((other) => other === value).length;
          const used = earlier < placed;
          return (
            <button
              key={idx}
              type="button"
              className={`tile${used ? ' used' : ''}`}
              aria-label={texToSpeech(value)}
              disabled={locked || used || target === -1}
              onClick={() => place(value)}
            >
              <Tex tex={value} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || filled.every((slot) => slot === '')}
        onClick={() => {
          setChosen(null);
          onAnswer(Array.from({ length: blanks }, () => ''));
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/* ---------- Dispatcher ---------- */

export function SlideView(props: SlideProps) {
  const { slide } = props;
  const widget = <SlideWidget {...props} />;
  if (slide.kind === 'teach' || !slide.calculator) return widget;
  return (
    <>
      {widget}
      <Calculator />
    </>
  );
}

function SlideWidget(props: SlideProps) {
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
    case 'iterate':
      return <IterateSlide {...props} />;
    case 'probTree':
      return <ProbTreeSlide {...props} />;
    case 'venn':
      return <VennSlide {...props} />;
    case 'slider':
      return <SliderSlide {...props} />;
    case 'flow':
      return <FlowSlide {...props} />;
    case 'reduce':
      return <ReduceSlide {...props} />;
    case 'evaluate':
      return <EvaluateSlide {...props} />;
    case 'transform':
      return <TransformSlide {...props} />;
    case 'order':
      return <OrderSlide {...props} />;
    case 'numberLine':
      return <NumberLineSlide {...props} />;
    case 'table':
      return <TableSlide {...props} />;
    case 'forces':
      return <ForcesSlide {...props} />;
  }
}
