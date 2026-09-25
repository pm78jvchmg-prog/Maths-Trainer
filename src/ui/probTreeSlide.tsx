/**
 * The probability tree: two stages, drawn root on the left as it is on paper.
 *
 * A controlled component like every other widget. In `fill` mode it holds the
 * values placed so far and which blank the next tile goes into; in `path` mode
 * the branches tapped. No verdict is computed here: a placed value or a chosen
 * path looks the same whether it is right or wrong, and after a wrong answer
 * only the frame changes colour, never a branch, and never what should have
 * been there.
 *
 * The lines are SVG in a fixed coordinate space scaled to the frame's width,
 * as the number line is. Every label and probability is HTML laid over it at
 * the same proportional position, so a fraction renders through KaTeX rather
 * than as SVG text.
 */
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';
import { useBankFill } from './bankFill';
import { blankName, texToSpeech } from './texSpeech';

type ProbTreeSlideData = Extract<Slide, { kind: 'probTree' }>;

/** The drawing's own coordinate space; the SVG scales to the frame's width. */
const W = 340;
/** Height per leaf: two blanks under one node sit this far apart, less a little. */
const ROW = 78;
const PAD = 8;
const ROOT_X = 6;
/** Centres of the first-stage and second-stage labels. */
const X1 = 132;
const X2 = 314;
/** How far a label's box reaches either side of its centre, where lines stop. */
const GAP = 17;
/** Where along a second-stage branch its probability sits: far enough out that two siblings clear each other. */
const ALONG = 0.64;

interface Placed {
  x: number;
  y: number;
}

function layout(slide: ProbTreeSlideData) {
  const leafCount = slide.branches.reduce((total, branch) => total + branch.next.length, 0);
  const height = leafCount * ROW + 2 * PAD;
  const root: Placed = { x: ROOT_X, y: height / 2 };
  let leaf = 0;
  const nodes = slide.branches.map((branch) => {
    const leaves = branch.next.map(() => {
      const y = PAD + ROW * (leaf + 0.5);
      leaf += 1;
      return { x: X2, y };
    });
    const y = leaves.reduce((total, at) => total + at.y, 0) / leaves.length;
    return { at: { x: X1, y }, leaves };
  });
  return { height, root, nodes };
}

const along = (from: Placed, to: Placed, t: number): Placed => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

export function ProbTreeSlide(props: SlideProps) {
  if (props.slide.kind !== 'probTree') return null;
  return <ProbTreeBody {...props} slide={props.slide} />;
}

function ProbTreeBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: ProbTreeSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const fill = slide.mode === 'fill';
  const size = fill ? slide.answer.length : 0;
  const bank = useBankFill(answer, size, onAnswer, locked);
  const path = !fill && Array.isArray(answer) ? answer : [];

  const { height, root, nodes } = layout(slide);
  const at = ({ x, y }: Placed) => ({ left: `${(x / W) * 100}%`, top: `${(y / height) * 100}%` });

  // Blank numbers in answer order: the first stage top to bottom, then the
  // second stage top to bottom.
  let blank = 0;
  const firstBlank = slide.branches.map((branch) => (branch.p === null ? blank++ : -1));
  const secondBlank = slide.branches.map((branch) =>
    branch.next.map((under) => (under.p === null ? blank++ : -1)),
  );

  const chooseFirst = (label: string) => {
    if (locked || path[0] === label) return;
    onAnswer([label]);
  };
  const chooseSecond = (top: string, label: string) => {
    if (locked) return;
    onAnswer([top, label]);
  };

  /** A branch's probability: given text, or a blank to fill. */
  const probability = (p: string | null, index: number, place: Placed, name: string) => {
    if (p !== null || !fill) {
      return (
        <span className="ptree-p" style={at(place)}>
          <Tex tex={p ?? ''} />
        </span>
      );
    }
    const value = bank.filled[index];
    return (
      <button
        {...bank.slotProps(index, !!value)}
        type="button"
        className={`answer-slot ptree-slot${value ? ' filled' : ''}${
          !locked && index === bank.target ? ' focus' : ''
        }`}
        style={at(place)}
        disabled={locked}
        aria-label={blankName(`Probability of ${name}`, value)}
        onClick={() => bank.tapBlank(index)}
      >
        {value ? <Tex tex={value} /> : ' '}
      </button>
    );
  };

  /**
   * A branch's label: plain in fill mode, the thing to tap in path mode, where
   * it is named in words (with its parent, on the second stage) since KaTeX
   * hides what it draws from assistive tech.
   */
  const label = (text: string, place: Placed, chosen: boolean, onPick: () => void, name: string) =>
    fill ? (
      <span className="ptree-label" style={at(place)}>
        <Tex tex={text} />
      </span>
    ) : (
      <button
        type="button"
        className={`ptree-label ptree-pick${chosen ? ' chosen' : ''}`}
        style={at(place)}
        disabled={locked}
        aria-pressed={chosen}
        aria-label={name}
        onClick={onPick}
      >
        <Tex tex={text} />
      </button>
    );

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} ptree-frame`} data-slot-group="">
        <div className="ptree">
          <svg
            className={`ptree-lines${locked ? ' locked' : ''}`}
            viewBox={`0 0 ${W} ${height}`}
            role="presentation"
          >
            {nodes.map((node, i) => {
              const top = slide.branches[i];
              const chosenTop = path[0] === top.label;
              const to = { x: node.at.x - GAP, y: node.at.y };
              return (
                <g key={i}>
                  <line
                    className={`ptree-branch${chosenTop ? ' chosen' : ''}`}
                    x1={root.x}
                    y1={root.y}
                    x2={to.x}
                    y2={to.y}
                  />
                  {!fill && (
                    <line
                      className="ptree-hit"
                      x1={root.x}
                      y1={root.y}
                      x2={to.x}
                      y2={to.y}
                      onClick={() => chooseFirst(top.label)}
                    />
                  )}
                  {node.leaves.map((leaf, j) => {
                    const under = top.next[j];
                    const chosen = chosenTop && path[1] === under.label;
                    const from = { x: node.at.x + GAP, y: node.at.y };
                    const end = { x: leaf.x - GAP, y: leaf.y };
                    return (
                      <g key={j}>
                        <line
                          className={`ptree-branch${chosen ? ' chosen' : ''}`}
                          x1={from.x}
                          y1={from.y}
                          x2={end.x}
                          y2={end.y}
                        />
                        {!fill && (
                          <line
                            className="ptree-hit"
                            x1={from.x}
                            y1={from.y}
                            x2={end.x}
                            y2={end.y}
                            onClick={() => chooseSecond(top.label, under.label)}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          <div className="ptree-over">
            {nodes.map((node, i) => {
              const top = slide.branches[i];
              const chosenTop = path[0] === top.label;
              return (
                <div key={i}>
                  {probability(
                    top.p,
                    firstBlank[i],
                    along(root, { x: node.at.x - GAP, y: node.at.y }, 0.5),
                    texToSpeech(top.label),
                  )}
                  {label(top.label, node.at, chosenTop, () => chooseFirst(top.label), texToSpeech(top.label))}
                  {node.leaves.map((leaf, j) => {
                    const under = top.next[j];
                    const from = { x: node.at.x + GAP, y: node.at.y };
                    return (
                      <div key={j}>
                        {probability(
                          under.p,
                          secondBlank[i][j],
                          along(from, { x: leaf.x - GAP, y: leaf.y }, ALONG),
                          `${texToSpeech(under.label)} after ${texToSpeech(top.label)}`,
                        )}
                        {label(
                          under.label,
                          leaf,
                          chosenTop && path[1] === under.label,
                          () => chooseSecond(top.label, under.label),
                          `${texToSpeech(under.label)} after ${texToSpeech(top.label)}`,
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {fill && (
        <>
          <div className={`tile-bank${locked ? '' : ' pinned'}`}>
            {slide.bank.map((value, idx) => {
              const used = bank.used(slide.bank, idx);
              return (
                <button
                  key={idx}
                  type="button"
                  className={`tile${used ? ' used' : ''}`}
                  aria-label={texToSpeech(value)}
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
      )}
    </>
  );
}
