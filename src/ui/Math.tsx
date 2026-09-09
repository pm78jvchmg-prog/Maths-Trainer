/**
 * KaTeX rendering.
 *
 * KaTeX is bundled rather than loaded from a CDN, fonts included, because the
 * app has to render maths with no network at all.
 */
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { Block } from '../content/types';

function render(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    // Never let a malformed expression blank the screen mid-lesson.
    return tex;
  }
}

export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => render(tex, display), [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Prose with inline maths delimited by $...$.
 *
 * Splitting on a capturing group keeps the delimiters in the array, so odd
 * indices are always the maths segments.
 */
export function Prose({ text }: { text: string }) {
  const parts = useMemo(() => text.split(/\$([^$]+)\$/g), [text]);
  return (
    <p className="prose">
      {parts.map((part, idx) =>
        idx % 2 === 1 ? <Tex key={idx} tex={part} /> : <span key={idx}>{part}</span>,
      )}
    </p>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, idx) =>
        block.kind === 'prose' ? (
          <Prose key={idx} text={block.text} />
        ) : (
          <div key={idx} className="display-math">
            <Tex tex={block.tex} display />
          </div>
        ),
      )}
    </>
  );
}
