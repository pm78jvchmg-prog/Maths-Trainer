import { describe, expect, it } from 'vitest';
import {
  ROOT,
  bin,
  coveredBy,
  isSolved,
  log,
  num,
  pow,
  reduceAt,
  renderExpr,
  replay,
  root,
  targets,
  toTex,
  valueOf,
  type Move,
} from './expr';

/** The expression from the reference app: 2^3 + (5 - 3)^2 x sqrt(9) = 20. */
const sample = bin(
  '+',
  pow(num(2), num(3)),
  bin('*', pow(bin('-', num(5), num(3)), num(2)), root(num(9))),
);

describe('what the learner may tap', () => {
  it('offers exactly the pieces the reference app offers', () => {
    // 2^3, +, -, x, sqrt(9). The (5-3)^2 power is NOT offered: its base is
    // still an unevaluated bracket, and collapsing it in one tap would skip
    // the bracket rather than get it wrong.
    const handles = targets(sample).map((t) => `${t.path}${t.legal ? '' : '!'}`);
    expect(handles).toEqual(['r.l', 'r!', 'r.r.l.b', 'r.r!', 'r.r.r']);
  });

  it('offers an operator whose operands are not settled, marked illegal', () => {
    // This is what makes taking 8 + 4 before 4 x 3 possible at all.
    const line = bin('+', num(8), bin('*', num(4), num(3)));
    expect(targets(line)).toEqual([
      { path: 'r', legal: false },
      { path: 'r.r', legal: true },
    ]);
  });

  it('starts offering a power once its base is a number', () => {
    const before = pow(bin('-', num(5), num(3)), num(2));
    expect(targets(before).some((t) => t.path === ROOT)).toBe(false);
    const after = pow(num(2), num(2));
    expect(targets(after)).toEqual([{ path: ROOT, legal: true }]);
  });
});

describe('rendering', () => {
  it('brackets only where precedence needs it', () => {
    expect(toTex(sample)).toBe('2^{3} + \\left(5 - 3\\right)^{2} \\times \\sqrt{9}');
  });

  it('marks every piece with the nodes it sits inside', () => {
    // Tapping the x in 8 + 4 x 3 must light all three of 4 x 3, which falls
    // out of ownership rather than from computing where the span starts.
    const line = bin('+', num(8), bin('*', num(4), num(3)));
    const lit = renderExpr(line)
      .filter((fragment) => fragment.owners.includes('r.r'))
      .map((fragment) => fragment.tex);
    expect(lit).toEqual(['4', '\\times', '3']);
  });

  it('splits brackets into plain fragments KaTeX can render one at a time', () => {
    // `\\left(` alone is not valid TeX, and each fragment is its own KaTeX call.
    const pieces = renderExpr(pow(bin('-', num(5), num(3)), num(2))).map((f) => f.tex);
    expect(pieces).toEqual(['(', '5', '-', '3', ')^{2}']);
    expect(pieces.some((piece) => piece.includes('left') || piece.includes('right'))).toBe(false);
  });

  it('keeps a power tappable as one piece only once it is reducible', () => {
    const reducible = renderExpr(pow(num(2), num(2)));
    expect(reducible).toHaveLength(1);
    expect(reducible[0].handle).toBe(ROOT);

    const notYet = renderExpr(pow(bin('-', num(5), num(3)), num(2)));
    expect(notYet.some((fragment) => fragment.handle === ROOT)).toBe(false);
    // The inner subtraction stays tappable underneath.
    expect(notYet.some((fragment) => fragment.handle === 'r.b')).toBe(true);
  });
});

describe('grading a walk', () => {
  const solve = (moves: Move[]) => replay(sample, moves);

  /** The order the reference app's screenshots took. */
  const asShown: Move[] = [
    { path: 'r.l', value: 8 },
    { path: 'r.r.l.b', value: 2 },
    { path: 'r.r.l', value: 4 },
    { path: 'r.r.r', value: 3 },
    { path: 'r.r', value: 12 },
    { path: 'r', value: 20 },
  ];

  it('accepts the walk the screenshots show', () => {
    expect(solve(asShown).fault).toBeUndefined();
    expect(isSolved(sample, asShown)).toBe(true);
  });

  it('accepts a different but equally legal order', () => {
    // Root first, then the bracket, then the power — precedence permits all of
    // these, so privileging one would teach a superstition.
    const other: Move[] = [
      { path: 'r.r.r', value: 3 },
      { path: 'r.r.l.b', value: 2 },
      { path: 'r.l', value: 8 },
      { path: 'r.r.l', value: 4 },
      { path: 'r.r', value: 12 },
      { path: 'r', value: 20 },
    ];
    expect(isSolved(sample, other)).toBe(true);
  });

  it('catches the wrong order by the number it produces, not by refusing it', () => {
    const line = bin('+', num(8), bin('*', num(4), num(3)));
    // Taken left to right the line gives 12 then 36, so the order mistake is
    // already in the value and needs no rule of its own.
    expect(replay(line, [{ path: ROOT, value: 36 }]).fault).toBe('wrong-value');
    // The same tap with the right number is right, because it is right.
    expect(isSolved(line, [{ path: ROOT, value: 20 }])).toBe(true);
  });

  it('accepts a piece taken early when its value is right', () => {
    // Refusing this used to fail a learner who had done the arithmetic
    // correctly and simply done it in fewer taps.
    expect(solve([{ path: ROOT, value: 20 }]).fault).toBeUndefined();
    expect(solve([{ path: ROOT, value: 21 }]).fault).toBe('wrong-value');
  });

  it('refuses a wrong value for a legal piece', () => {
    expect(solve([{ path: 'r.l', value: 6 }]).fault).toBe('wrong-value');
  });

  it('does not count an unfinished walk as solved', () => {
    expect(isSolved(sample, asShown.slice(0, 3))).toBe(false);
  });

  it('evaluates to twenty, whatever route is taken', () => {
    expect(valueOf(sample)).toBe(20);
    expect(valueOf(reduceAt(sample, 'r.l', 8))).toBe(20);
  });
});

describe('a negative base', () => {
  it('is bracketed, because the minus would otherwise escape the power', () => {
    // -3^{2} is minus three squared, which is -9. The square of -3 is 9.
    expect(toTex(pow(num(-3), num(2)))).toBe('\\left(-3\\right)^{2}');
    expect(valueOf(pow(num(-3), num(2)))).toBe(9);
  });

  it('leaves a positive base bare', () => {
    expect(toTex(pow(num(3), num(2)))).toBe('3^{2}');
  });

  it('brackets it in the fragments too, not only in the whole-string form', () => {
    const pieces = renderExpr(bin('+', pow(num(-3), num(2)), num(1))).map((f) => f.tex);
    expect(pieces.join('')).toContain('-3');
    expect(pieces.join('')).not.toMatch(/(^|[^(])-3\^/);
  });
});

describe('two terms of a chain', () => {
  /**
   * `sqrt(36) + 4 - 3`, the shape that sent a learner down a dead end.
   *
   * The chain parses left to right, so the minus owns the whole line and
   * tapping it used to ask for the value of everything — with the root still
   * unopened. `4 - 3` is ordinary arithmetic and is now its own step.
   */
  const chain = bin('-', bin('+', root(num(36)), num(4)), num(3));

  it('offers the right-hand pair in place of the whole sub-tree', () => {
    expect(targets(chain).map((t) => `${t.path}${t.legal ? '' : '!'}`)).toEqual([
      'r.l.l',
      'r.l!',
      'r~',
    ]);
  });

  it('lights the operator and the two terms either side of it', () => {
    const fragments = renderExpr(chain);
    expect(coveredBy(fragments, 'r~').map((i) => fragments[i].tex)).toEqual(['4', '-', '3']);
  });

  it('replaces only those two terms, leaving the rest of the line alone', () => {
    expect(toTex(reduceAt(chain, 'r~', 1))).toBe('\\sqrt{36} + 1');
  });

  it('grades a walk that takes the pair first', () => {
    expect(
      isSolved(chain, [
        { path: 'r~', value: 1 },
        { path: 'r.l', value: 6 },
        { path: 'r', value: 7 },
      ]),
    ).toBe(true);
  });

  it('offers no pair where regrouping would flip a sign', () => {
    // `a - b + c` is not `a - (b + c)`, so the two right-hand terms are not
    // offered together; `a - b` first costs nothing and keeps every sign as
    // the learner sees it.
    const minusFirst = bin('+', bin('-', num(10), num(3)), num(5));
    expect(targets(minusFirst).map((t) => t.path)).toEqual(['r.l', 'r']);
  });
});

describe('logarithms', () => {
  it('evaluates to a whole number, floats notwithstanding', () => {
    // log(8)/log(2) through floats is 2.9999999999999996.
    expect(valueOf(log(num(2), num(8)))).toBe(3);
    expect(valueOf(log(num(3), num(81)))).toBe(4);
  });

  it('is one tap target, offered once its parts are numbers', () => {
    expect(targets(log(num(2), num(8)))).toEqual([{ path: ROOT, legal: true }]);
    // A log is a named function like a root, so it is offered only once its
    // parts are numbers — the same rule that keeps `(5 - 3)^2` untappable
    // until the bracket resolves. Only the multiplication inside is offered.
    const inner = log(num(2), bin('*', num(4), num(2)));
    expect(targets(inner).map((t) => t.path)).toEqual(['r.v']);
  });

  it('writes its base as a subscript', () => {
    expect(toTex(log(num(2), num(8)))).toBe('\\log_{2}\\left(8\\right)');
  });

  it('reduces, and grades a walk that takes the inside first', () => {
    const expr = bin('-', log(num(2), num(32)), log(num(3), num(27)));
    expect(valueOf(expr)).toBe(2);
    expect(isSolved(expr, [
      { path: 'r.l', value: 5 },
      { path: 'r.r', value: 3 },
      { path: 'r', value: 2 },
    ])).toBe(true);
    // The subtraction taken before either log is settled: accepted, because 2
    // is what it comes to. A learner who had not taken both logs would not
    // have arrived at 2.
    expect(replay(expr, [{ path: 'r', value: 2 }]).fault).toBeUndefined();
    expect(replay(expr, [{ path: 'r', value: 5 }]).fault).toBe('wrong-value');
  });
});
