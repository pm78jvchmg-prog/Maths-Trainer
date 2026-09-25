/**
 * The answer editor's slot: the tree from `mathInput.ts`, drawn with its caret.
 *
 * The editing itself is pure and lives in `mathInput.ts`; this is the one part
 * of the editor that is a component.
 */
import { useMemo } from 'react';
import { Tex } from './Math';
import { toTex, type Doc } from './mathInput';

export function MathSlot({
  doc,
  showCaret,
  filled,
}: {
  doc: Doc;
  showCaret: boolean;
  filled: boolean;
}) {
  const tex = useMemo(
    () => toTex(doc.nodes, showCaret ? doc.caret : undefined),
    [doc, showCaret],
  );

  return (
    <span className={`answer-slot${filled ? ' filled' : ''}${showCaret ? ' focus' : ''}`}>
      {tex ? <Tex tex={tex} trust /> : ' '}
    </span>
  );
}
