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
import { useState } from 'react';
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';

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
  const filled = Array.from({ length: size }, (_, i) =>
    Array.isArray(answer) ? (answer[i] ?? '') : '',
  );
  const [chosen, setChosen] = useState(0);

  // The blank the next tile lands in: the one the learner picked while it is
  // still empty, otherwise the first empty one.
  const firstEmpty = filled.findIndex((slot) => slot === '');
  const target = filled[chosen] === '' ? chosen : firstEmpty;

  const spent = new Map<string, number>();
  for (const token of filled) {
    if (token) spent.set(token, (spent.get(token) ?? 0) + 1);
  }

  // Every control stops the tap here. After a wrong answer the whole question
  // area is a "try again" target that resets the draft, which would wipe the
  // table the learner is in the middle of correcting; the `edit` that every
  // change dispatches already clears the wrong verdict.
  const tapBlank = (idx: number) => {
    if (filled[idx] !== '') {
      const next = [...filled];
      next[idx] = '';
      onAnswer(next);
    }
    setChosen(idx);
  };

  const place = (value: string) => {
    if (target === -1) return;
    const next = [...filled];
    next[target] = value;
    onAnswer(next);
    // On to the next blank below, wrapping round to any left above.
    const after = [...next.slice(target + 1), ...next.slice(0, target + 1)].findIndex(
      (slot) => slot === '',
    );
    setChosen(after === -1 ? target : (target + 1 + after) % size);
  };

  const cell = (idx: number) => (
    <button
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
      onClick={(event) => {
        event.stopPropagation();
        tapBlank(idx);
      }}
    >
      {filled[idx] ? <Tex tex={filled[idx]} /> : ' '}
    </button>
  );

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className={`${frameClass(feedback)} iterate`}>
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
          const placed = spent.get(value) ?? 0;
          const earlier = slide.bank.slice(0, idx).filter((other) => other === value).length;
          const used = earlier < placed;
          return (
            <button
              key={idx}
              type="button"
              className={`tile${used ? ' used' : ''}`}
              disabled={locked || used || target === -1}
              onClick={(event) => {
                event.stopPropagation();
                place(value);
              }}
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
        onClick={(event) => {
          event.stopPropagation();
          onAnswer(Array.from({ length: size }, () => ''));
          setChosen(0);
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}
