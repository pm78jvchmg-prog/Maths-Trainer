/**
 * KaTeX rendering.
 *
 * KaTeX is bundled rather than loaded from a CDN, fonts included, because the
 * app has to render maths with no network at all.
 */
import { Fragment, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Block } from '../content/types';
import { Traversal } from './figures';
import { alignedRows, displayLines, displayPieces } from './displayPieces';
import { liftBlocks } from './liftAlgebra';
import { inlineParts } from './inlineParts';

function render(tex: string, displayMode: boolean, trust: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust,
    });
  } catch {
    // Never let a malformed expression blank the screen mid-lesson.
    return tex;
  }
}

/**
 * `trust` enables the commands KaTeX withholds by default, of which this app
 * uses exactly one: \htmlClass, so the answer editor can hand a class to the
 * caret it draws inside the formula. It is opt-in per call rather than on
 * globally, and the only caller is the answer slot, whose content is built from
 * keypad presses — there is no free-text input anywhere in the app, so the set
 * of commands that can reach it is the set this code puts there.
 */
export function Tex({
  tex,
  display = false,
  trust = false,
}: {
  tex: string;
  display?: boolean;
  trust?: boolean;
}) {
  const html = useMemo(() => render(tex, display, trust), [tex, display, trust]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Inline markup, without a paragraph around it.
 *
 * Three inline markups are understood: `$maths$`, `**bold**` and `*italic*`.
 * All three were written into the content from the start; only the maths was
 * ever rendered, because this split on the dollar signs alone. A slide
 * introducing a term showed the learner `**parabola**`, and one stressing a
 * word showed `*periodic*` — 34 bold spans and dozens of italic ones reading
 * as stray punctuation.
 *
 * The parsing, and the characters kept on a line with each formula, are in
 * `inlineParts`.
 *
 * Split out from `Prose` because a decision tree's branch labels carry maths
 * too, and they live inside buttons — where a `<p>` is not valid content.
 * Anything that needs the inline markup in a non-paragraph context uses this.
 */
export function Inline({ text }: { text: string }) {
  const parts = useMemo(() => inlineParts(text), [text]);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.kind === 'maths') {
          if (!part.before && !part.after) return <Tex key={idx} tex={part.tex} />;
          return (
            <span key={idx} className="inline-glue">
              {part.before}
              <Tex tex={part.tex} />
              {part.after}
            </span>
          );
        }
        if (part.kind === 'bold') return <strong key={idx}>{part.text}</strong>;
        if (part.kind === 'italic') return <em key={idx}>{part.text}</em>;
        return <span key={idx}>{part.text}</span>;
      })}
    </>
  );
}

/** One paragraph of teaching text: `Inline` in a `<p>`. */
export function Prose({ text }: { text: string }) {
  return (
    <p className="prose">
      <Inline text={text} />
    </p>
  );
}

/**
 * A display formula, on its own line or panel. Every display in the app goes
 * through here (teaching and question prompts, tree expressions, worked
 * solutions), so none of them can scroll where another would wrap.
 *
 * Each piece (`displayPieces`) is set inline in display style rather than in
 * display mode: display mode cannot break a line, so a formula wider than the
 * phone scrolled sideways, while inline mode breaks after an `=` or a `+` only
 * when the line does not fit. The piece's own overflow scroll is left for the
 * rare formula with nowhere to break. A display that is one `gathered` block
 * is taken apart into its lines first (`displayLines`), each on a row of its
 * own, so its lines can break too.
 */
export function DisplayMath({ tex, lifted = false }: { tex: string; lifted?: boolean }) {
  return (
    <div className={lifted ? 'display-math display-row lifted' : 'display-math display-row'}>
      {displayLines(tex).map((line, row) => (
        <Fragment key={row}>
          {row > 0 && <span className="display-break" />}
          {displayPieces(line).map((piece, at) => (
            <DisplayPiece key={at} tex={piece} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

/**
 * One piece of a display. An `aligned` block is laid out as two columns
 * (`alignedRows`), the parts before and after each `&`, so a long line wraps
 * inside the right column instead of scrolling the block; the `{}` keeps the
 * space KaTeX puts before a relation that opens the right-hand part.
 */
function DisplayPiece({ tex }: { tex: string }) {
  const rows = useMemo(() => alignedRows(tex), [tex]);
  if (!rows) {
    return (
      <span className="display-piece">
        <Tex tex={`\\displaystyle ${tex}`} />
      </span>
    );
  }
  return (
    <span className="display-piece display-aligned">
      {rows.map(([left, right], row) => (
        <Fragment key={row}>
          <span className="aligned-left">{left && <Tex tex={`\\displaystyle ${left}`} />}</span>
          <span className="aligned-right">{right && <Tex tex={`\\displaystyle {}${right}`} />}</span>
        </Fragment>
      ))}
    </span>
  );
}

/**
 * A slide's blocks, with each line of algebra in its prose moved onto a line of
 * its own (`liftBlocks`).
 */
export function Blocks({ blocks }: { blocks: Block[] }) {
  const items = useMemo(() => liftBlocks(blocks), [blocks]);
  return (
    <>
      {items.map((block, idx) => {
        if (block.kind === 'text') return <Prose key={idx} text={block.text} />;
        if (block.kind === 'lifted') return <DisplayMath key={idx} tex={block.tex} lifted />;
        if (block.kind === 'diagram') {
          // SVG is generated by our own plane.ts, never user input.
          return (
            <div
              key={idx}
              className="diagram"
              dangerouslySetInnerHTML={{ __html: block.svg }}
            />
          );
        }
        if (block.kind === 'traversal') {
          return (
            <Traversal
              key={idx}
              svg={block.svg}
              pathId={block.pathId}
              durationMs={block.durationMs}
            />
          );
        }
        return <DisplayMath key={idx} tex={block.tex} />;
      })}
    </>
  );
}
