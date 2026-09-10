/**
 * The two slide kinds that show working rather than just a final answer.
 *
 * Both are controlled components in the same sense as the widgets in
 * `slides.tsx`: they hold the in-progress picks and nothing else. No verdict is
 * computed here — a filled-in step looks identical whether it is right or
 * wrong, and only the reducer knows which.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Tex, Blocks } from './Math';
import type { Slide } from '../content/types';
import { isLocked, type SlideProps } from './slides';

/* ---------- Steps: reduce an expression one operation at a time ---------- */

type StepsSlide = Extract<Slide, { kind: 'steps' }>;

/**
 * Replays the chosen values to get every line of working so far.
 *
 * Returns one more line than there are picks: the last entry is the line
 * currently being worked on. Spans index the line they act on, so this has to
 * be applied in order rather than computed per step.
 */
export function stepLines(slide: StepsSlide, chosen: string[]): string[][] {
  const lines: string[][] = [slide.start];
  for (let i = 0; i < slide.reductions.length; i += 1) {
    const value = chosen[i];
    if (!value) break;
    const [from, to] = slide.reductions[i].span;
    const previous = lines[lines.length - 1];
    lines.push([...previous.slice(0, from), value, ...previous.slice(to)]);
  }
  return lines;
}

function Line({
  tokens,
  span,
  armed,
  onArm,
  blank,
}: {
  tokens: string[];
  /** The range this line's pending reduction covers, if it has one. */
  span?: [number, number];
  armed?: boolean;
  onArm?: () => void;
  /** Render the span as an empty slot rather than its tokens. */
  blank?: boolean;
}) {
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (span && i === span[0]) {
      const inner = tokens.slice(span[0], span[1]);
      if (blank) {
        parts.push(<span key={i} className="answer-slot focus" />);
      } else {
        parts.push(
          <button
            key={i}
            type="button"
            className={`step-target${armed ? ' armed' : ''}`}
            disabled={!onArm}
            onClick={onArm}
          >
            {inner.map((token, j) => (
              <Tex key={j} tex={token} />
            ))}
          </button>,
        );
      }
      i = span[1] - 1;
      continue;
    }
    parts.push(<Tex key={i} tex={tokens[i]} />);
  }
  return <div className="step-line">{parts}</div>;
}

export function StepsSlide(props: SlideProps) {
  // Narrowing happens here rather than inside the body so that the body's hooks
  // are never behind a conditional return.
  if (props.slide.kind !== 'steps') return null;
  return <StepsBody {...props} slide={props.slide} />;
}

function StepsBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: StepsSlide }) {
  const locked = isLocked(feedback, canEdit);
  const chosen = Array.isArray(answer) ? answer : [];

  // Which sub-expression the learner has tapped and is now choosing a value
  // for. Purely presentational: it is the "you are working on this bit" state
  // the reference app uses, and it never affects grading.
  const [armed, setArmed] = useState(false);

  const lines = stepLines(slide, chosen);
  const stepIndex = lines.length - 1;
  const reduction = slide.reductions[stepIndex];
  const done = reduction === undefined;

  const pick = (value: string) => {
    const next = [...chosen];
    while (next.length < stepIndex) next.push('');
    next[stepIndex] = value;
    setArmed(false);
    onAnswer(next.slice(0, slide.reductions.length));
  };

  const undo = () => {
    if (stepIndex === 0) return;
    setArmed(false);
    onAnswer(chosen.slice(0, stepIndex - 1));
  };

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      {/* Settled working, above the card. Muted, because it is history. */}
      {lines.slice(0, -1).map((tokens, idx) => (
        <Line key={idx} tokens={tokens} />
      ))}

      <div className={`answer-frame column${feedback.kind === 'incorrect' ? ' wrong' : ''}`}>
        {stepIndex > 0 && !locked && (
          <button type="button" className="undo-button" aria-label="Undo last step" onClick={undo}>
            &#8630;
          </button>
        )}

        <Line
          tokens={lines[stepIndex]}
          span={reduction?.span}
          armed={armed}
          onArm={done || locked ? undefined : () => setArmed(true)}
        />

        {armed && reduction && (
          <Line tokens={lines[stepIndex]} span={reduction.span} blank />
        )}
      </div>

      {armed && reduction && (
        <div className="tile-bank">
          {reduction.bank.map((value, idx) => (
            <button
              key={idx}
              type="button"
              className="tile"
              disabled={locked}
              onClick={() => pick(value)}
            >
              <Tex tex={value} />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="text-button"
        disabled={locked || stepIndex === 0}
        onClick={() => {
          setArmed(false);
          onAnswer([]);
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}

/* ---------- Tree: fill in an evaluation tree ---------- */

type TreeSlide = Extract<Slide, { kind: 'tree' }>;

/**
 * Row index per node: one past the deepest node feeding it.
 *
 * Content authors list nodes in evaluation order and name their inputs, so the
 * layout falls out of the data and nothing has to be positioned by hand.
 */
export function treeRows(nodes: TreeSlide['nodes']): number[] {
  const depth = new Map<string, number>();
  return nodes.map((node) => {
    const row = node.from.length === 0
      ? 0
      : Math.max(...node.from.map((id) => (depth.get(id) ?? -1) + 1));
    depth.set(node.id, row);
    return row;
  });
}

interface Edge {
  from: string;
  to: string;
}

export function TreeSlide(props: SlideProps) {
  if (props.slide.kind !== 'tree') return null;
  return <TreeBody {...props} slide={props.slide} />;
}

function TreeBody({
  slide,
  feedback,
  answer,
  onAnswer,
  canEdit,
}: SlideProps & { slide: TreeSlide }) {
  const locked = isLocked(feedback, canEdit);
  const filled = Array.isArray(answer) ? answer : [];

  const rows = treeRows(slide.nodes);
  const rowCount = Math.max(...rows) + 1;

  const frame = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<string[]>([]);

  const edges: Edge[] = slide.nodes.flatMap((node) =>
    node.from.map((from) => ({ from, to: node.id })),
  );

  // Connectors are drawn from measured positions rather than a fixed grid, so
  // they stay attached when the row wraps on a narrow screen.
  useLayoutEffect(() => {
    const box = frame.current;
    if (!box) return;

    const measure = () => {
      const origin = box.getBoundingClientRect();
      const next: string[] = [];
      for (const edge of edges) {
        const a = cells.current.get(edge.from);
        const b = cells.current.get(edge.to);
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const x1 = ra.left + ra.width / 2 - origin.left;
        const y1 = ra.bottom - origin.top;
        const x2 = rb.left + rb.width / 2 - origin.left;
        const y2 = rb.top - origin.top;
        const mid = (y1 + y2) / 2;
        next.push(`M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`);
      }
      setPaths(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, filled.join('')]);

  const spent = new Map<string, number>();
  for (const token of filled) {
    if (token) spent.set(token, (spent.get(token) ?? 0) + 1);
  }

  const place = (value: string) => {
    const next = Array.from({ length: slide.nodes.length }, (_, i) => filled[i] ?? '');
    const free = next.findIndex((slot) => slot === '');
    if (free === -1) return;
    next[free] = value;
    onAnswer(next);
  };

  const clear = (idx: number) => {
    const next = Array.from({ length: slide.nodes.length }, (_, i) => filled[i] ?? '');
    next[idx] = '';
    onAnswer(next);
  };

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      <div className="display-math">
        <Tex tex={slide.expression} display />
      </div>

      <div
        className={`answer-frame tree${feedback.kind === 'incorrect' ? ' wrong' : ''}`}
        ref={frame}
      >
        <svg className="tree-wires" aria-hidden="true">
          {paths.map((d, idx) => (
            <path key={idx} d={d} />
          ))}
        </svg>

        {Array.from({ length: rowCount }, (_, row) => (
          <div key={row} className="tree-row">
            {slide.nodes.map((node, idx) =>
              rows[idx] !== row ? null : (
                <button
                  key={node.id}
                  type="button"
                  ref={(el) => {
                    if (el) cells.current.set(node.id, el);
                    else cells.current.delete(node.id);
                  }}
                  className={`answer-slot${filled[idx] ? ' filled' : ''}`}
                  disabled={locked || !filled[idx]}
                  onClick={() => clear(idx)}
                >
                  {filled[idx] ? <Tex tex={filled[idx]} /> : ' '}
                </button>
              ),
            )}
          </div>
        ))}
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
              disabled={locked || used}
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
        onClick={() => {
          onAnswer(Array.from({ length: slide.nodes.length }, () => ''));
        }}
      >
        &#8635; Start over
      </button>
    </>
  );
}
