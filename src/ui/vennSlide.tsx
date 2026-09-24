/**
 * The Venn diagram: two sets in a rectangle, four regions filled from a bank.
 *
 * A controlled component like every other widget: it holds the values placed
 * so far and which region the next tile goes into, and nothing else. After a
 * wrong answer only the frame changes colour, never a region, and never the
 * value that should have been there.
 *
 * The rectangle and circles are SVG in a fixed coordinate space scaled to the
 * frame's width; the labels and values are HTML laid over them, so a
 * fraction or a subscript renders through KaTeX rather than as SVG text.
 */
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';
import { useBankFill } from './bankFill';

type VennSlideData = Extract<Slide, { kind: 'venn' }>;

/** The drawing's own coordinate space; the SVG scales to the frame's width. */
const W = 340;
const H = 240;
const R = 82;
const LEFT = { x: 132, y: 124 };
const RIGHT = { x: 208, y: 124 };

/** Where each region's value sits: only the first, both, only the second, neither. */
const SPOTS = [
  { x: 89, y: 124 },
  { x: 170, y: 124 },
  { x: 251, y: 124 },
  { x: 300, y: 212 },
];

const NAMES = ['only in the first set', 'in both sets', 'only in the second set', 'in neither set'];

export function VennSlide(props: SlideProps) {
  if (props.slide.kind !== 'venn') return null;
  return <VennBody {...props} slide={props.slide} />;
}

function VennBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: VennSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const bank = useBankFill(answer, slide.answer.length, onAnswer);
  const at = ({ x, y }: { x: number; y: number }) => ({
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
  });

  let blank = 0;
  const blankOf = slide.regions.map((value) => (value === null ? blank++ : -1));

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} venn-frame`}>
        <div className="venn">
          <svg className="venn-lines" viewBox={`0 0 ${W} ${H}`} role="presentation">
            <rect x={1.5} y={1.5} width={W - 3} height={H - 3} rx={12} />
            <circle cx={LEFT.x} cy={LEFT.y} r={R} />
            <circle cx={RIGHT.x} cy={RIGHT.y} r={R} />
          </svg>

          <div className="venn-over">
            <span className="venn-corner" style={at({ x: 10, y: 16 })}>
              <Tex tex={slide.total === undefined ? '\\xi' : `n(\\xi) = ${slide.total}`} />
            </span>
            <span className="venn-set" style={at({ x: 60, y: 48 })}>
              <Tex tex={slide.sets[0]} />
            </span>
            <span className="venn-set" style={at({ x: 280, y: 48 })}>
              <Tex tex={slide.sets[1]} />
            </span>

            {slide.regions.map((given, idx) => {
              if (given !== null) {
                return (
                  <span key={idx} className="venn-value" style={at(SPOTS[idx])}>
                    <Tex tex={given} />
                  </span>
                );
              }
              const index = blankOf[idx];
              const value = bank.filled[index];
              return (
                <button
                  key={idx}
                  type="button"
                  className={`answer-slot venn-slot${value ? ' filled' : ''}${
                    !locked && index === bank.target ? ' focus' : ''
                  }`}
                  style={at(SPOTS[idx])}
                  disabled={locked}
                  aria-label={`Region ${NAMES[idx]}${value ? `, ${value}` : ', empty'}`}
                  onClick={() => bank.tapBlank(index)}
                >
                  {value ? <Tex tex={value} /> : ' '}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`tile-bank${locked ? '' : ' pinned'}`}>
        {slide.bank.map((value, idx) => {
          const used = bank.used(slide.bank, idx);
          return (
            <button
              key={idx}
              type="button"
              className={`tile${used ? ' used' : ''}`}
              disabled={locked || used || bank.target === -1}
              onClick={() => bank.place(value)}
            >
              <Tex tex={value} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="text-button"
        disabled={locked || bank.filled.every((slot) => !slot)}
        onClick={bank.clear}
      >
        &#8635; Start over
      </button>
    </>
  );
}
