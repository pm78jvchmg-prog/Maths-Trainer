/**
 * A small calculator, folded away under a button, for questions whose
 * arithmetic nobody does in their head (a cube root, iterated four times).
 *
 * The owner asked for one on the iteration tables. It grades nothing and knows
 * nothing about the question: it evaluates what is typed on its own keys, the
 * way a pocket calculator would, so it cannot give an answer away.
 *
 * `Ans` holds the last result, and pressing `=` again re-runs the same line on
 * it. That is how iteration is done on a real calculator: type the scheme with
 * `Ans` in place of x_n once, then press `=` for each row.
 *
 * Every click stops at the panel. The question area treats a tap as "try
 * again" after a wrong answer, and a sum being worked out must not count as
 * one.
 */
import { useState } from 'react';
import { backspace, display, evaluateLine, shown } from './calculatorLine';

interface Key {
  label: string;
  /** What the key appends to the line, in mathjs syntax. */
  insert?: string;
  action?: 'equals' | 'back' | 'clear';
  wide?: boolean;
}

const KEYS: Key[] = [
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '÷', insert: '/' },
  { label: '√', insert: 'sqrt(' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '×', insert: '*' },
  { label: '∛', insert: 'cbrt(' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '−', insert: '-' },
  { label: 'xʸ', insert: '^' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: 'Ans', insert: 'Ans' },
  { label: '+', insert: '+' },
  { label: 'ln', insert: 'ln(' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: 'eˣ', insert: 'e^(' },
  { label: '⌫', action: 'back' },
  { label: 'C', action: 'clear' },
  { label: '=', action: 'equals', wide: true },
];

/**
 * `start` seeds Ans, so on an iteration table Ans is already x_0 and the first
 * `=` gives x_1. It is the value the question states, so it gives nothing away.
 */
export function Calculator({ start = 0 }: { start?: number }) {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState('');
  const [ans, setAns] = useState(Number.isFinite(start) ? start : 0);
  const [result, setResult] = useState<string | null>(null);

  const press = (key: Key) => {
    if (key.action === 'clear') {
      setLine('');
      setResult(null);
      return;
    }
    if (key.action === 'back') {
      setLine(backspace(line));
      setResult(null);
      return;
    }
    if (key.action === 'equals') {
      const value = evaluateLine(line, ans);
      if (value === undefined) {
        setResult('Error');
        return;
      }
      setAns(value);
      setResult(display(value));
      return;
    }
    // Straight after a result, an operator carries on from it and anything
    // else starts a fresh line, as a pocket calculator does. The line itself
    // is kept until then, so `=` can re-run it on the new Ans.
    const after = result !== null && result !== 'Error';
    if (after) setLine(/^[-+*/^]/.test(key.insert!) ? `Ans${key.insert}` : key.insert!);
    else setLine(line + key.insert);
    setResult(null);
  };

  return (
    <div className="calculator" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="text-button calculator-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide calculator' : 'Calculator'}
      </button>
      {open && (
        <div className="calculator-panel">
          <div className="calculator-display" aria-live="polite">
            <div className="calculator-line">{shown(line) || ' '}</div>
            <div className="calculator-result">{result ?? (ans !== 0 ? `Ans = ${display(ans)}` : ' ')}</div>
          </div>
          <div className="calculator-keys">
            {KEYS.map((key) => (
              <button
                key={key.label}
                type="button"
                className={`calculator-key${key.action === 'equals' ? ' equals' : ''}${key.wide ? ' wide' : ''}`}
                onClick={() => press(key)}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
