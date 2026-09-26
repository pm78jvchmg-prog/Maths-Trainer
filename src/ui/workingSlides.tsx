/**
 * The slide kinds that show working or a path through a decision rather than
 * just a final answer: steps, tree and flow.
 *
 * Both are controlled components in the same sense as the widgets in
 * `SlideView.tsx`: they hold the in-progress picks and nothing else. No
 * verdict is computed here — a filled-in step looks identical whether it is
 * right or wrong, and only the reducer knows which.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { Tex, Blocks, DisplayMath, Inline } from './Math';
import type { Slide } from '../content/types';
import { frameClass, isLocked, type SlideProps } from './slides';
import { walkFlow } from './flow';
import { showsLine } from './liftAlgebra';
import { blankName, inlineToSpeech, texToSpeech } from './texSpeech';

/* ---------- Steps: reduce an expression one operation at a time ---------- */

type StepsSlide = Extract<Slide, { kind: 'steps' }>;

/**
 * One answered stage: which sub-expression was collapsed, and into what.
 *
 * A stage where the learner also chose the operation is stored as `from-to|value`
 * so the reducer can keep comparing plain strings — picking the right value for
 * the wrong operation has to be as wrong as picking the wrong value, and one
 * token holding both is what makes that fall out of `gradeSequence` unchanged.
 * A stage with no ordering decision is still just the value.
 */
export function parseStep(token: string): { span?: [number, number]; value: string } {
  // Only a leading `from-to|` is a span: a value such as `\ln|y|` has bars of its own.
  const match = /^(\d+)-(\d+)\|/.exec(token);
  if (!match) return { value: token };
  return { span: [Number(match[1]), Number(match[2])], value: token.slice(match[0].length) };
}

export function stepToken(span: [number, number] | undefined, value: string): string {
  return span ? `${span[0]}-${span[1]}|${value}` : value;
}

/**
 * The working so far, one line per stage, replayed from the chosen values.
 * Normally one more line than there are picks: the last entry is the line
 * currently being worked on. Spans index the line they act on, so this has to
 * be applied in order rather than computed per step.
 *
 * The span that collapses is the one the *learner* chose, not the one the
 * author expected. That matters the moment ordering is being graded: a learner
 * who takes `8 + 4` before `4 x 3` must see `12 x 3` — their own wrong line —
 * rather than being quietly corrected or stopped, either of which would tell
 * them they were wrong before they had committed to an answer.
 *
 * Because the line then differs from the one the remaining reductions were
 * written against, a later span can fall outside it. That is not recoverable
 * content, so the walk simply stops there and the short answer grades wrong.
 */
export function stepLines(slide: StepsSlide, chosen: string[]): string[][] {
  const lines: string[][] = [slide.start];
  for (let i = 0; i < slide.reductions.length; i += 1) {
    const token = chosen[i];
    if (!token) break;
    const { span, value } = parseStep(token);
    const [from, to] = span ?? slide.reductions[i].span;
    const previous = lines[lines.length - 1];
    if (from < 0 || to > previous.length || from >= to) break;
    lines.push([...previous.slice(0, from), value, ...previous.slice(to)]);
  }
  return lines;
}

export interface Target {
  /** The operator token that is tapped. */
  operator: number;
  /** What collapses if it is chosen. */
  span: [number, number];
}

/**
 * The operations on offer at a stage, in the order they sit on the line.
 *
 * Left to right rather than correct-first, because a fixed position would give
 * the answer away after two questions.
 */
export function offeredOps(slide: StepsSlide, index: number): Target[] {
  const reduction = slide.reductions[index];
  if (!reduction) return [];
  const correct: Target = {
    operator: reduction.operator ?? reduction.span[0],
    span: reduction.span,
  };
  return [correct, ...(reduction.decoys ?? [])].sort((a, b) => a.operator - b.operator);
}

/**
 * One line of working, with its operations as tap targets.
 *
 * The operator is what gets tapped, not the whole sub-expression: in
 * `8 + 4 x 3` the two candidate operations share the 4, so their spans overlap
 * and no two overlapping regions can both be buttons. Tapping the sign is also
 * what a person does when asked which operation comes first.
 *
 * Offering more than one at a time is the whole of the ordering question. When
 * only the next correct operation is tappable, the slide has already told the
 * learner which one comes first and all that is left to grade is the arithmetic.
 */
function Line({
  tokens,
  targets = [],
  armed,
  onArm,
  blank,
}: {
  tokens: string[];
  /** Operations that can be tapped on this line, left to right. */
  targets?: Target[];
  /** The span currently armed, if any. */
  armed?: [number, number] | null;
  onArm?: (span: [number, number]) => void;
  /** Render the armed span as an empty slot rather than its tokens. */
  blank?: boolean;
}) {
  const parts: React.ReactNode[] = [];
  const isArmed = (span: [number, number]) =>
    armed != null && armed[0] === span[0] && armed[1] === span[1];

  for (let i = 0; i < tokens.length; i += 1) {
    // While a choice is armed the whole of it is blanked, so that the learner
    // sees the shape of what they are replacing rather than one lone sign.
    const armedHere = blank && armed && i === armed[0];
    if (armedHere) {
      parts.push(<span key={i} className="answer-slot focus" />);
      i = armed[1] - 1;
      continue;
    }

    // With one operation on offer there is no ambiguity, so the button covers
    // the whole sub-expression as it always did. With several, their spans
    // overlap — `8 + 4 x 3` shares the 4 — and only the operators are disjoint.
    const sole = targets.length === 1;
    const target = targets.find((candidate) =>
      sole ? candidate.span[0] === i : candidate.operator === i,
    );
    if (target && !blank) {
      const inner = sole ? tokens.slice(target.span[0], target.span[1]) : [tokens[i]];
      parts.push(
        <button
          key={i}
          type="button"
          className={`step-target${isArmed(target.span) ? ' armed' : ''}`}
          // Maths alone, which KaTeX hides from assistive tech: named in words.
          aria-label={inner.map(texToSpeech).join(' ')}
          disabled={!onArm}
          onClick={onArm ? () => onArm(target.span) : undefined}
        >
          {inner.map((token, j) => (
            <Tex key={j} tex={token} />
          ))}
        </button>,
      );
      if (sole) i = target.span[1] - 1;
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
  // Which sub-expression is armed, as a span. Null means none yet.
  const [armed, setArmed] = useState<[number, number] | null>(null);

  const lines = stepLines(slide, chosen);
  const stepIndex = lines.length - 1;
  const reduction = slide.reductions[stepIndex];
  const done = reduction === undefined;
  const targets = offeredOps(slide, stepIndex);
  // Ordering is only being asked about where the author offered a wrong turn.
  const picksOrder = (reduction?.decoys?.length ?? 0) > 0;
  // Every offered span must fit the line the learner has actually built; after
  // a wrong turn earlier it may not, and there is nothing sensible to offer.
  const usable = targets.filter(
    ({ operator, span }) =>
      span[0] >= 0 && span[1] <= lines[stepIndex].length && span[0] < span[1] &&
      operator >= 0 && operator < lines[stepIndex].length,
  );

  const pick = (value: string) => {
    if (!armed) return;
    const next = [...chosen];
    while (next.length < stepIndex) next.push('');
    next[stepIndex] = stepToken(picksOrder ? armed : undefined, value);
    setArmed(null);
    onAnswer(next.slice(0, slide.reductions.length));
  };

  const undo = () => {
    if (stepIndex === 0) return;
    setArmed(null);
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
          targets={done || locked ? [] : usable}
          armed={armed}
          onArm={done || locked ? undefined : (span) => setArmed(span)}
        />

        {armed && (
          <Line
            tokens={lines[stepIndex]}
            targets={[{ operator: armed[0], span: armed }]}
            armed={armed}
            blank
          />
        )}
      </div>

      {armed && reduction && (
        <div className="tile-bank">
          {reduction.bank.map((value, idx) => (
            <button
              key={idx}
              type="button"
              className="tile"
              aria-label={texToSpeech(value)}
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
          setArmed(null);
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
        // The elbow sits just above the node being fed, not halfway down.
        // Halfway is the same thing for two adjacent rows, and wrong for a
        // node fed from two rows up: the horizontal run then crosses the row
        // in between and disappears behind a node it has nothing to do with,
        // so the wire reads as ending there. Held at 12px because the rows
        // are 26px apart, which keeps the elbow inside the gap.
        const elbow = Math.max(y1, y2 - 12);
        next.push(`M ${x1} ${y1} V ${elbow} H ${x2} V ${y2}`);
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

      <DisplayMath tex={slide.expression} />

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
                  aria-label={blankName(`Blank ${idx + 1} of ${slide.nodes.length}`, filled[idx] ?? '')}
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
              aria-label={texToSpeech(value)}
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

/* ---------- Flow: a decision tree ---------- */

/**
 * Walk a decision tree to an outcome.
 *
 * Opposite in every respect to `TreeSlide` above, which is worth stating
 * because the names sit next to each other: that one fills in numbers and is
 * assembled bottom-up from the inputs, this one answers questions and is walked
 * top-down from the root. Here the learner's choices decide what they are asked
 * next, so no two attempts need see the same questions.
 *
 * One question is on screen at a time, with the trail of forks already taken
 * listed above it. Tapping an entry in the trail rewinds to that fork — a
 * flowchart where a wrong turn cannot be undone is a maze, and the point is to
 * make the reasoning visible rather than to punish a misread.
 *
 * The answer is the labels chosen, in order. The reducer compares that to the
 * expected path and refuses a length mismatch, so stopping early at the wrong
 * outcome is wrong rather than a prefix of right.
 */
export function FlowSlide({ slide, feedback, answer, onAnswer, canEdit }: SlideProps) {
  if (slide.kind !== 'flow') return null;
  const locked = isLocked(feedback, canEdit);
  const taken = Array.isArray(answer) ? answer : [];

  // Where the learner stands, derived from the path rather than stored beside
  // it — the same walk `hasAnswer` uses, so Check cannot light up on a walk the
  // widget still considers unfinished.
  const { trail, step, outcome } = walkFlow(slide, taken);

  const choose = (label: string) => {
    if (locked) return;
    onAnswer([...taken, label]);
  };

  const rewindTo = (depth: number) => {
    if (locked) return;
    onAnswer(taken.slice(0, depth));
  };

  const subjectShown = showsLine(slide.prompt, slide.subject);

  return (
    <>
      <div className="prompt">
        <Blocks blocks={slide.prompt} />
      </div>

      {/* The prompt may already show the subject on its own line; a second
          copy directly under it reads as the model shown twice. The outcome
          then carries the right-or-wrong frame instead. */}
      {!subjectShown && (
        <div className={frameClass(feedback)}>
          {/* Display style, like every other formula set on its own: inline
              style shrank a fraction here to the height of the text. */}
          <Tex tex={`\\displaystyle ${slide.subject}`} />
        </div>
      )}

      {trail.length > 0 && (
        <ol className="flow-trail">
          {trail.map((entry, idx) => (
            <li key={idx}>
              <button
                type="button"
                className="flow-step"
                // `Inline` maths is hidden from assistive tech like any KaTeX,
                // so the name is written out rather than read off the content.
                aria-label={`${inlineToSpeech(entry.ask)} ${inlineToSpeech(entry.label)}`}
                disabled={locked}
                onClick={() => rewindTo(idx)}
              >
                <span className="flow-ask">
                  <Inline text={entry.ask} />
                </span>
                <span className="flow-label">
                  <Inline text={entry.label} />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {outcome !== undefined ? (
        <p className={subjectShown ? `flow-outcome ${frameClass(feedback)}` : 'flow-outcome'}>
          <Inline text={outcome} />
        </p>
      ) : step ? (
        <div className="flow-fork">
          <p className="flow-question">
            <Inline text={step.ask} />
          </p>
          {step.branches.map((branch) => (
            <button
              key={branch.label}
              type="button"
              className="flow-branch"
              aria-label={inlineToSpeech(branch.label)}
              disabled={locked}
              onClick={() => choose(branch.label)}
            >
              <Inline text={branch.label} />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
