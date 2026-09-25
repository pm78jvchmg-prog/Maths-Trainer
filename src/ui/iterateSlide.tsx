/**
 * The iteration table: run a numerical scheme one row at a time.
 *
 * A controlled component like every other widget: it holds the values placed so
 * far and which blank the next tile goes into, and nothing else. No verdict is
 * computed here. A placed value looks the same whether it is right or wrong,
 * and after a wrong answer only the frame changes colour — never a cell, and
 * never the value that should have been there.
 *
 * Unlike `tree`, blanks may be filled in any order: tap a blank to choose it,
 * then a value. Iterating is a chain, so a learner who spots a slip in `x_2`
 * after writing `x_4` needs to go back to exactly that row.
 */
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';
import { useBankFill } from './bankFill';
import { Calculator } from './Calculator';

type IterateSlideData = Extract<Slide, { kind: 'iterate' }>;

const CONCLUSION_LABEL: Record<IterateSlideData['conclusion'], string> = {
  limit: 'Converges to',
  bracket: 'Root lies between',
};

export function IterateSlide(props: SlideProps) {
  if (props.slide.kind !== 'iterate') return null;
  return <IterateBody {...props} slide={props.slide} />;
}

function IterateBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: IterateSlideData }) {
  const locked = isLocked(feedback, canEdit);
  const size = slide.answer.length;
  // Which blank the next tile goes into, and the drag between blanks: the same
  // state the probability tree, the Venn diagram and a force fill use.
  const { filled, target, used, tapBlank, place, clear, slotProps } = useBankFill(
    answer,
    size,
    onAnswer,
    locked,
  );

  const cell = (idx: number) => (
    <button
      {...slotProps(idx, !!filled[idx])}
      type="button"
      className={`answer-slot iterate-slot${filled[idx] ? ' filled' : ''}${
        !locked && idx === target ? ' focus' : ''
      }`}
      disabled={locked}
      aria-label={
        idx < size - 1
          ? `x ${idx + 1}${filled[idx] ? `, ${filled[idx]}` : ', empty'}`
          : `${CONCLUSION_LABEL[slide.conclusion]}${filled[idx] ? `, ${filled[idx]}` : ', empty'}`
      }
      onClick={() => tapBlank(idx)}
    >
      {filled[idx] ? <Tex tex={filled[idx]} /> : ' '}
    </button>
  );

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <Calculator start={Number(slide.start)} />

      <div className={`${frameClass(feedback)} iterate`} data-slot-group="">
        <table className="iterate-table">
          <thead>
            <tr>
              <th scope="col">
                <Tex tex="n" />
              </th>
              <th scope="col">
                <Tex tex="x_n" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="iterate-n">0</td>
              <td className="iterate-given">
                <Tex tex={slide.start} />
              </td>
            </tr>
            {Array.from({ length: size - 1 }, (_, idx) => (
              <tr key={idx}>
                <td className="iterate-n">{idx + 1}</td>
                <td>{cell(idx)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="iterate-conclusion">
          <span>{CONCLUSION_LABEL[slide.conclusion]}</span>
          {cell(size - 1)}
        </div>
      </div>

      <div className={`tile-bank${locked ? '' : ' pinned'}`}>
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

      <button
        type="button"
        className="text-button"
        disabled={locked || filled.every((slot) => !slot)}
        onClick={clear}
      >
        &#8635; Start over
      </button>
    </>
  );
}
