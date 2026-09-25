/**
 * The `forces` slide: a free-body diagram, drawn or completed with taps.
 *
 * - **pick**: every candidate arrow starts faint and dashed. A tap on an
 *   arrow's head turns it on or off; the answer is the set that is on.
 * - **fill**: every arrow drawn acts. Beneath the picture each is listed with
 *   its magnitude, some of them blanks filled from a bank. Blanks fill in any
 *   order, as in `iterate`: tap a blank to choose it, then a value; a filled
 *   blank tapped again empties.
 *
 * The picture itself comes from `forceDiagramSvg` in `src/content/forces.ts`;
 * this file maps taps onto it and lays the TeX labels over it, since KaTeX
 * does not render inside SVG text. Like every widget it styles only what the
 * learner did: after a wrong `pick` their own arrows turn the wrong colour and
 * an arrow they left off stays faint, whether or not it acts. After a wrong
 * `fill` every value they placed looks the same and only the frame says so.
 */
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';
import {
  FIG_H,
  FIG_W,
  angleLabelAt,
  arrowLayout,
  forceChosen,
  forceDiagramSvg,
  toggleForce,
  type ArrowLook,
  type Direction,
  type Point,
} from '../content/forces';
import { useBankFill } from './bankFill';

type ForcesSlideData = Extract<Slide, { kind: 'forces' }>;

export function ForcesSlide(props: SlideProps) {
  if (props.slide.kind !== 'forces') return null;
  return <ForcesBody {...props} slide={props.slide} />;
}

/** A label laid over the picture, placed as a share of its width and height. */
function Overlay({ at, tex }: { at: Point; tex: string }) {
  return (
    <span
      className="force-label"
      style={{ left: `${(at.x / FIG_W) * 100}%`, top: `${(at.y / FIG_H) * 100}%` }}
    >
      <Tex tex={tex} />
    </span>
  );
}

function ForcesBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: ForcesSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const graded =
    feedback.kind === 'correct'
      ? ' correct'
      : feedback.kind === 'incorrect' || feedback.kind === 'revealed'
        ? ' wrong'
        : '';

  /* ----- pick ----- */
  const draft = typeof answer === 'string' ? answer : '';

  /* ----- fill ----- */
  // No blanks in `pick`, but the hook runs either way so hooks never sit
  // behind the mode.
  const size = slide.mode === 'fill' ? slide.answer.length : 0;
  const { filled, target, used, tapBlank, place, clear, slotProps } = useBankFill(
    answer,
    size,
    onAnswer,
    locked,
  );
  // Which blank each arrow owns, in arrow order.
  const blankOf = new Map<Direction, number>();
  for (const arrow of slide.arrows) {
    if (arrow.given === undefined) blankOf.set(arrow.id, blankOf.size);
  }

  const looks: Partial<Record<Direction, ArrowLook>> = {};
  for (const arrow of slide.arrows) {
    if (slide.mode === 'pick') {
      looks[arrow.id] = forceChosen(draft, arrow.id) ? 'chosen' : 'faint';
    } else {
      const blank = blankOf.get(arrow.id);
      looks[arrow.id] = blank !== undefined && filled[blank] ? 'chosen' : 'solid';
    }
  }

  const svg = forceDiagramSvg(slide.scene, slide.arrows, {
    looks,
    interactive: slide.mode === 'pick',
  });

  // One handler on the figure for every head: the SVG is a string, so the
  // tapped circle is found by its `data-arrow`, and a tap anywhere else on
  // the picture chooses nothing (and after a wrong answer, retries).
  const tapArrow = (tapped: EventTarget | null) => {
    if (locked || slide.mode !== 'pick' || !(tapped instanceof Element)) return;
    const id = tapped.closest('[data-arrow]')?.getAttribute('data-arrow') as Direction | null;
    if (id) onAnswer(toggleForce(draft, id));
  };

  const angleAt = angleLabelAt(slide.scene);
  const nothingDone = slide.mode === 'pick' ? draft === '' : filled.every((slot) => !slot);

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} forces-frame`}>
        <div
          className={`force-figure${graded}${locked ? ' locked' : ''}${slide.mode === 'pick' ? ' pick' : ''}`}
          onClick={(event) => tapArrow(event.target)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            tapArrow(event.target);
          }}
        >
          <div className="force-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          {slide.arrows.map((arrow) => (
            <Overlay key={arrow.id} at={arrowLayout(slide.scene, arrow.id).labelAt} tex={arrow.label} />
          ))}
          {angleAt && slide.scene.surface === 'slope' && (
            <Overlay at={angleAt} tex={`${slide.scene.angle}^\\circ`} />
          )}
        </div>

        {slide.mode === 'fill' && (
          <div className="force-legend" data-slot-group="">
            {slide.arrows.map((arrow) => {
              const blank = blankOf.get(arrow.id);
              return (
                <div key={arrow.id} className="force-row">
                  <Tex tex={`${arrow.label} =`} />
                  {blank === undefined ? (
                    <Tex tex={arrow.given!} />
                  ) : (
                    <button
                      {...slotProps(blank, !!filled[blank])}
                      type="button"
                      className={`answer-slot force-slot${filled[blank] ? ' filled' : ''}${
                        !locked && blank === target ? ' focus' : ''
                      }`}
                      disabled={locked}
                      aria-label={`${arrow.label}${filled[blank] ? `, ${filled[blank]}` : ', empty'}`}
                      onClick={() => tapBlank(blank)}
                    >
                      {filled[blank] ? <Tex tex={filled[blank]} /> : ' '}
                    </button>
                  )}
                  <Tex tex="\text{N}" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {slide.mode === 'pick' && <p className="nl-hint">Tap an arrow to add it, and again to take it off.</p>}

      {slide.mode === 'fill' && (
        <div className="tile-bank">
          {slide.bank.map((value, idx) => {
            const spent = used(slide.bank, idx);
            return (
              <button
                key={idx}
                type="button"
                className={`tile${spent ? ' used' : ''}`}
                disabled={locked || spent || target === -1}
                onClick={() => place(value)}
              >
                <Tex tex={value} />
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="text-button"
        disabled={locked || nothingDone}
        onClick={() => {
          if (slide.mode === 'pick') onAnswer('');
          else clear();
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}
