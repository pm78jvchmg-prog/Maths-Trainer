/**
 * Move a curve until it is the one asked for.
 *
 * Steppers and flips rather than dragging: a thumb on a 393px screen can hit a
 * 44px button every time, and cannot drag a curve by a whole unit and let go
 * without it sliding on. Every tap redraws the live curve and the readout, so
 * the equation and the picture change together — which is the connection the
 * topic is about.
 *
 * The draft starts at the identity, never at the answer, and the identity is
 * not an answer until something has been tapped: a widget whose resting state
 * can be right scores untouched draws, which is what the slider learned the
 * hard way. So an untouched slide holds `''`, its readout is dimmed, and
 * *Check* is off.
 *
 * Only the learner's own curve takes a verdict colour. In `apply` the target
 * is never drawn at all, before or after grading; in `match` it is the band
 * the question showed from the start, and it stays exactly as it was.
 */
import { Tex, Blocks } from './Math';
import { frameClass, isLocked, type SlideProps } from './slides';
import { plotSvg, type Curve } from '../content/figures';
import {
  BASES,
  IDENTITY,
  SCALE_LADDER,
  SHIFT_LIMIT,
  encodeTransform,
  factorAt,
  factorTex,
  parseTransform,
  rungOf,
  transformTex,
  transformed,
  type Transform,
} from '../content/transform';

/** The curve being built, read back from the session's answer. */
function current(answer: SlideProps['answer']): Transform | undefined {
  if (typeof answer !== 'string' || answer === '') return undefined;
  return parseTransform(answer);
}

function shiftLabel(value: number, positive: string, negative: string): string {
  if (value === 0) return 'none';
  return `${Math.abs(value)} ${value > 0 ? positive : negative}`;
}

interface Tap {
  label: string;
  face: string;
  disabled: boolean;
  onTap: () => void;
}

interface StepperProps {
  label: string;
  value: React.ReactNode;
  down: Tap;
  up: Tap;
}

/**
 * A control that changes the curve.
 *
 * The click stops here rather than reaching the question area. After a wrong
 * answer that area treats any tap as "let me try again" and clears the draft,
 * which for this widget would throw away the curve the learner has built and
 * is about to adjust by one step. Changing the answer is already the retry —
 * `onAnswer` dispatches `edit`, which the reducer refuses in a level check —
 * so nothing is lost by keeping the tap to the control.
 */
function TapButton({ tap, className }: { tap: Tap; className: string }) {
  return (
    <button
      type="button"
      className={className}
      aria-label={tap.label}
      disabled={tap.disabled}
      onClick={(event) => {
        event.stopPropagation();
        tap.onTap();
      }}
    >
      {tap.face}
    </button>
  );
}

/** Minus, the value with its name over it, plus: one row, no label above. */
function Stepper({ label, value, down, up }: StepperProps) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <TapButton tap={down} className="stepper-button" />
      <span className="stepper-value">
        <span className="stepper-label">{label}</span>
        <output>{value}</output>
      </span>
      <TapButton tap={up} className="stepper-button" />
    </div>
  );
}

export function TransformSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'transform') return null;
  const built = current(answer);
  const t = built ?? IDENTITY;
  const locked = isLocked(feedback, canEdit);

  // Redrawn whole on every tap. Three curves of 160 samples is nothing, and
  // one SVG from one function is what keeps the live curve on the same axes
  // as the dashed one to the pixel.
  const base = BASES[slide.base];
  // Every curve lifts the pen where it is undefined: `1/x` at its asymptote,
  // and `sqrt x` to the left of where it starts, which a plain path would
  // write as NaN coordinates.
  const curves: Curve[] = [{ f: base.f, dashed: true, breaks: true }];
  const target = parseTransform(slide.answer);
  if (slide.direction === 'match' && target) {
    curves.push({ f: transformed(slide.base, target), band: true, breaks: true });
  }
  curves.push({ f: transformed(slide.base, t), accent: true, breaks: true });
  const figure = plotSvg({
    ...slide.window,
    curves,
    grid: true,
    height: 160,
    label:
      slide.direction === 'match'
        ? 'The dashed curve y = f(x), a target curve, and your curve'
        : 'The dashed curve y = f(x) and your curve',
  });

  const set = (next: Partial<Transform>) => {
    if (locked) return;
    onAnswer(encodeTransform({ ...t, ...next }));
  };

  const sxRung = rungOf(t.sx);
  const syRung = rungOf(t.sy);
  const top = SCALE_LADDER.length - 1;

  // The verdict belongs to the learner's curve alone; see the header.
  const verdict =
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

      {/* Generated by our own content code from numbers, never user input. */}
      <div
        className={`transform-figure${verdict}`}
        dangerouslySetInnerHTML={{ __html: figure }}
      />

      <div className={`${frameClass(feedback)} transform-readout${built ? '' : ' untouched'}`}>
        <Tex tex={transformTex(t)} />
      </div>

      <div className="transform-controls">
        <Stepper
          label="Across"
          value={shiftLabel(t.h, 'right', 'left')}
          down={{
            label: 'Move left',
            face: '←',
            disabled: locked || t.h <= -SHIFT_LIMIT,
            onTap: () => set({ h: t.h - 1 }),
          }}
          up={{
            label: 'Move right',
            face: '→',
            disabled: locked || t.h >= SHIFT_LIMIT,
            onTap: () => set({ h: t.h + 1 }),
          }}
        />
        <Stepper
          label="Up or down"
          value={shiftLabel(t.k, 'up', 'down')}
          down={{
            label: 'Move down',
            face: '↓',
            disabled: locked || t.k <= -SHIFT_LIMIT,
            onTap: () => set({ k: t.k - 1 }),
          }}
          up={{
            label: 'Move up',
            face: '↑',
            disabled: locked || t.k >= SHIFT_LIMIT,
            onTap: () => set({ k: t.k + 1 }),
          }}
        />
        <Stepper
          label="Width"
          value={<Tex tex={`\\times ${factorTex(t.sx)}`} />}
          down={{
            label: 'Narrower',
            face: '−',
            disabled: locked || sxRung <= 0,
            onTap: () => set({ sx: factorAt(sxRung - 1) }),
          }}
          up={{
            label: 'Wider',
            face: '+',
            disabled: locked || sxRung >= top,
            onTap: () => set({ sx: factorAt(sxRung + 1) }),
          }}
        />
        <Stepper
          label="Height"
          value={<Tex tex={`\\times ${factorTex(t.sy)}`} />}
          down={{
            label: 'Shorter',
            face: '−',
            disabled: locked || syRung <= 0,
            onTap: () => set({ sy: factorAt(syRung - 1) }),
          }}
          up={{
            label: 'Taller',
            face: '+',
            disabled: locked || syRung >= top,
            onTap: () => set({ sy: factorAt(syRung + 1) }),
          }}
        />
      </div>

      <div className="transform-flips">
        <button
          type="button"
          className="flip-button"
          aria-pressed={t.fy}
          disabled={locked}
          onClick={(event) => {
            event.stopPropagation();
            set({ fy: !t.fy });
          }}
        >
          Flip ↕
        </button>
        <button
          type="button"
          className="flip-button"
          aria-pressed={t.fx}
          disabled={locked}
          onClick={(event) => {
            event.stopPropagation();
            set({ fx: !t.fx });
          }}
        >
          Flip ↔
        </button>
        {/* Beside the flips rather than on a line of its own: the widget is
            the tallest on any slide, and a row for one text button pushed the
            flips below the fold at 852px. */}
        <TapButton
          className="stepper-button reset-button"
          tap={{
            label: 'Start over',
            face: '↻',
            disabled: locked || !built,
            onTap: () => onAnswer(''),
          }}
        />
      </div>
    </>
  );
}
