/**
 * An arithmetic expression as a tree, for questions about *order*.
 *
 * The `steps` slide holds its working as a flat array of TeX tokens and names
 * the sub-expression to reduce as a span of that array. That is enough to ask
 * "what does this come to", and it cannot ask "which of these comes first",
 * because which pieces are available to reduce is a fact about the expression's
 * shape, not about where its characters sit. `8 + 4 x 3` has two operators and
 * only one of them may go next; a span cannot know that, and the two candidate
 * spans overlap on the 4 besides.
 *
 * So this is a tree. From it fall out the three things the widget needs and the
 * span model could not give:
 *
 * - which pieces are reducible right now (`targets`),
 * - what a piece is worth (`valueOf`),
 * - what the expression becomes once a piece is replaced (`reduceAt`).
 *
 * Grading needs no authored answer sequence. A walk is correct when every
 * reduction was legal *at the moment it was made*, every value was right, and
 * nothing is left. Any order precedence permits is therefore accepted, which is
 * the honest rule: doing the root before the bracket is not a mistake, and
 * marking it one would teach a superstition.
 */

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }
  | { kind: 'power'; base: Expr; exponent: Expr }
  /** `degree` defaults to 2; 3 draws a cube root, and so on. */
  | { kind: 'root'; arg: Expr; degree?: number }
  /** A logarithm to a stated base, written `\log_{base} arg`. */
  | { kind: 'log'; base: Expr; arg: Expr }
  /**
   * A trigonometric function of an angle in **degrees**.
   *
   * Degrees rather than radians because the angle is a number the learner reads
   * and picks a value for, and `\sin(\pi)` would put an irrational number in a
   * bank of whole ones. The child is named `arg` so it addresses exactly as a
   * root's does, by `a`.
   */
  | { kind: 'trig'; fn: 'sin' | 'cos' | 'tan'; arg: Expr };

/** Convenience builders, so content reads like the expression it describes. */
export const num = (value: number): Expr => ({ kind: 'num', value });
export const bin = (op: Extract<Expr, { kind: 'binary' }>['op'], left: Expr, right: Expr): Expr => ({
  kind: 'binary',
  op,
  left,
  right,
});
export const pow = (base: Expr, exponent: Expr): Expr => ({ kind: 'power', base, exponent });
export const root = (arg: Expr, degree?: number): Expr => ({ kind: 'root', arg, degree });
export const log = (base: Expr, arg: Expr): Expr => ({ kind: 'log', base, arg });
export const trig = (fn: Extract<Expr, { kind: 'trig' }>['fn'], arg: Expr): Expr => ({
  kind: 'trig',
  fn,
  arg,
});

/**
 * A node's address: the path taken from the root to reach it.
 *
 * A path rather than a generated id, so it stays stable across a re-render and
 * means the same thing to the widget, the grader and a test without anything
 * having to be stored alongside the tree.
 */
export type Path = string;

export const ROOT: Path = 'r';
const step = (path: Path, branch: string): Path => `${path}.${branch}`;

export function nodeAt(expr: Expr, path: Path): Expr | undefined {
  if (path === ROOT) return expr;
  const parts = path.split('.').slice(1);
  let node: Expr | undefined = expr;
  for (const part of parts) {
    if (!node) return undefined;
    if (node.kind === 'binary') node = part === 'l' ? node.left : part === 'r' ? node.right : undefined;
    else if (node.kind === 'power') node = part === 'b' ? node.base : part === 'e' ? node.exponent : undefined;
    else if (node.kind === 'root' || node.kind === 'trig')
      node = part === 'a' ? node.arg : undefined;
    else if (node.kind === 'log') node = part === 'g' ? node.base : part === 'v' ? node.arg : undefined;
    else return undefined;
  }
  return node;
}

/** The value of a whole sub-expression. */
export function valueOf(expr: Expr): number {
  if (expr.kind === 'num') return expr.value;
  if (expr.kind === 'root') {
    const inner = valueOf(expr.arg);
    const degree = expr.degree ?? 2;
    // Math.pow(x, 1/3) is NaN for a negative x, and a cube root of a negative
    // is perfectly ordinary, so the sign is taken out and put back.
    const size = Math.pow(Math.abs(inner), 1 / degree);
    const rooted = inner < 0 ? -size : size;
    // Roots of exact powers land a hair off an integer through the float, and
    // every value in these questions is meant to be whole.
    return Math.abs(rooted - Math.round(rooted)) < 1e-9 ? Math.round(rooted) : rooted;
  }
  if (expr.kind === 'trig') {
    const radians = (valueOf(expr.arg) * Math.PI) / 180;
    const exact =
      expr.fn === 'sin'
        ? Math.sin(radians)
        : expr.fn === 'cos'
          ? Math.cos(radians)
          : Math.tan(radians);
    // Rounded for the same reason roots and logs are: sin(180) through floats
    // is 1.2e-16, and every value in these questions is meant to be whole.
    return Math.abs(exact - Math.round(exact)) < 1e-9 ? Math.round(exact) : exact;
  }
  if (expr.kind === 'power') return Math.pow(valueOf(expr.base), valueOf(expr.exponent));
  if (expr.kind === 'log') {
    // Rounded for the same reason roots are: log_2(8) through floats is
    // 2.9999999999999996, and every value in these questions is whole.
    const exact = Math.log(valueOf(expr.arg)) / Math.log(valueOf(expr.base));
    return Math.abs(exact - Math.round(exact)) < 1e-9 ? Math.round(exact) : exact;
  }
  const left = valueOf(expr.left);
  const right = valueOf(expr.right);
  if (expr.op === '+') return left + right;
  if (expr.op === '-') return left - right;
  if (expr.op === '*') return left * right;
  return left / right;
}

/** True when every child is already a plain number. */
export function isReducible(expr: Expr): boolean {
  if (expr.kind === 'num') return false;
  if (expr.kind === 'root' || expr.kind === 'trig') return expr.arg.kind === 'num';
  if (expr.kind === 'power') return expr.base.kind === 'num' && expr.exponent.kind === 'num';
  if (expr.kind === 'log') return expr.base.kind === 'num' && expr.arg.kind === 'num';
  return expr.left.kind === 'num' && expr.right.kind === 'num';
}

/**
 * Everything the learner may tap, and whether tapping it would be legal.
 *
 * Operators are offered whether or not their operands are settled — that is
 * what makes taking `8 + 4` before `4 x 3` possible, and a mistake that cannot
 * be made is a mistake that cannot be taught. A power or a root is offered only
 * once it is reducible, because `(5 - 3)^2` collapsing in one tap would skip
 * the bracket rather than get it wrong.
 */
export interface Target {
  path: Path;
  /** False for an operator whose operands are not both values yet. */
  legal: boolean;
}

export function targets(expr: Expr, path: Path = ROOT, out: Target[] = []): Target[] {
  if (expr.kind === 'num') return out;
  if (expr.kind === 'binary') {
    targets(expr.left, step(path, 'l'), out);
    out.push({ path, legal: isReducible(expr) });
    targets(expr.right, step(path, 'r'), out);
    return out;
  }
  if (expr.kind === 'power') {
    targets(expr.base, step(path, 'b'), out);
    targets(expr.exponent, step(path, 'e'), out);
    if (isReducible(expr)) out.push({ path, legal: true });
    return out;
  }
  if (expr.kind === 'log') {
    targets(expr.base, step(path, 'g'), out);
    targets(expr.arg, step(path, 'v'), out);
    if (isReducible(expr)) out.push({ path, legal: true });
    return out;
  }
  targets(expr.arg, step(path, 'a'), out);
  if (isReducible(expr)) out.push({ path, legal: true });
  return out;
}

/** The tree with one sub-expression replaced by a number. */
export function reduceAt(expr: Expr, path: Path, value: number): Expr {
  if (path === ROOT) return num(value);
  const parts = path.split('.').slice(1);

  const rebuild = (node: Expr, depth: number): Expr => {
    if (depth === parts.length) return num(value);
    const part = parts[depth];
    if (node.kind === 'binary') {
      return part === 'l'
        ? { ...node, left: rebuild(node.left, depth + 1) }
        : { ...node, right: rebuild(node.right, depth + 1) };
    }
    if (node.kind === 'power') {
      return part === 'b'
        ? { ...node, base: rebuild(node.base, depth + 1) }
        : { ...node, exponent: rebuild(node.exponent, depth + 1) };
    }
    if (node.kind === 'root' || node.kind === 'trig') {
      return { ...node, arg: rebuild(node.arg, depth + 1) };
    }
    if (node.kind === 'log') {
      return part === 'g'
        ? { ...node, base: rebuild(node.base, depth + 1) }
        : { ...node, arg: rebuild(node.arg, depth + 1) };
    }
    return node;
  };

  return rebuild(expr, 0);
}

/* ---------- rendering ---------- */

/**
 * One piece of a rendered line.
 *
 * `owners` is every node this piece sits inside, innermost last. Highlighting a
 * chosen node means lighting every piece whose owners include it — which is how
 * tapping the `x` in `8 + 4 x 3` lights all three of `4 x 3` without anything
 * having to compute where that sub-expression starts and ends.
 */
export interface Fragment {
  tex: string;
  owners: Path[];
  /** Set on the one piece that is this node's tap handle. */
  handle?: Path;
}

/** Binding strength, for deciding where brackets are needed. */
function precedence(expr: Expr): number {
  if (expr.kind === 'binary') return expr.op === '+' || expr.op === '-' ? 1 : 2;
  // A log, a power and a root all bind tighter than any operator, so none of
  // them ever needs bracketing as an operand.
  return 3;
}

const OP_TEX: Record<Extract<Expr, { kind: 'binary' }>['op'], string> = {
  '+': '+',
  '-': '-',
  '*': '\\times',
  '/': '\\div',
};

export function renderExpr(
  expr: Expr,
  path: Path = ROOT,
  owners: Path[] = [],
  out: Fragment[] = [],
): Fragment[] {
  const mine = [...owners, path];

  if (expr.kind === 'num') {
    out.push({ tex: `${expr.value}`, owners: mine });
    return out;
  }

  if (expr.kind === 'root') {
    // The whole root is one fragment: its bar has to span its argument, and
    // KaTeX gives no handle inside a rendered formula to hang that on.
    out.push({ tex: rootTex(expr), owners: mine, handle: path });
    return out;
  }

  if (expr.kind === 'trig') {
    // One fragment as well. The angle is a number by the time the learner sees
    // it, and splitting `sin` from its bracket would offer a tap target that is
    // not a sub-expression.
    out.push({ tex: toTex(expr), owners: mine, handle: path });
    return out;
  }

  if (expr.kind === 'power') {
    // A reducible power is a single tap target, so it renders as one fragment.
    if (isReducible(expr)) {
      out.push({ tex: toTex(expr), owners: mine, handle: path });
      return out;
    }

    // Otherwise the base is still being worked on and must stay tappable, so
    // the exponent is pinned to the closing bracket instead.
    const base = expr.base;
    // As in `toTex`: a negative base is bracketed too, or the minus escapes the
    // power and the line says the opposite of what it means.
    const needsBrackets = base.kind !== 'num' || base.value < 0;
    // Plain brackets, never `\left(` and `\right)`. Each fragment is rendered
    // by its own KaTeX call, and a `\left` with no matching `\right` in the
    // same call fails — printing the command as literal text rather than
    // raising, which is the same trap the tiles templates fell into.
    if (needsBrackets) out.push({ tex: '(', owners: mine });
    renderExpr(base, step(path, 'b'), mine, out);
    out.push({
      tex: needsBrackets ? `)^{${toTex(expr.exponent)}}` : `^{${toTex(expr.exponent)}}`,
      owners: mine,
    });
    return out;
  }

  if (expr.kind === 'log') {
    // Always one fragment: the base is set under the word `log`, and KaTeX
    // offers no handle inside a rendered subscript to make it tappable
    // separately. Every log these questions ask has numeric parts anyway.
    out.push({ tex: toTex(expr), owners: mine, handle: isReducible(expr) ? path : undefined });
    return out;
  }

  const wrap = (child: Expr, branch: 'l' | 'r') => {
    const tighter = precedence(child) < precedence(expr);
    // Plain brackets again, for the same reason: they are separate fragments.
    if (tighter) out.push({ tex: '(', owners: mine });
    renderExpr(child, step(path, branch), mine, out);
    if (tighter) out.push({ tex: ')', owners: mine });
  };

  wrap(expr.left, 'l');
  out.push({ tex: OP_TEX[expr.op], owners: mine, handle: path });
  wrap(expr.right, 'r');
  return out;
}

/** The whole expression as one TeX string, for a fragment that cannot be split. */
/** A root, with its degree written above the sign when it is not a square. */
function rootTex(expr: Extract<Expr, { kind: 'root' }>): string {
  const degree = expr.degree ?? 2;
  const index = degree === 2 ? '' : `[${degree}]`;
  return `\\sqrt${index}{${toTex(expr.arg)}}`;
}

export function toTex(expr: Expr): string {
  if (expr.kind === 'num') return `${expr.value}`;
  if (expr.kind === 'root') return rootTex(expr);
  if (expr.kind === 'power') {
    // A negative number needs the bracket as much as a sub-expression does:
    // `-3^{2}` is minus three squared, which is -9, and the square of -3 is 9.
    const bare = expr.base.kind === 'num' && expr.base.value >= 0;
    const base = bare ? toTex(expr.base) : `\\left(${toTex(expr.base)}\\right)`;
    return `${base}^{${toTex(expr.exponent)}}`;
  }
  if (expr.kind === 'log') {
    return `\\log_{${toTex(expr.base)}}\\left(${toTex(expr.arg)}\\right)`;
  }
  if (expr.kind === 'trig') {
    return `\\${expr.fn}\\left(${toTex(expr.arg)}^{\\circ}\\right)`;
  }
  const side = (child: Expr) =>
    precedence(child) < precedence(expr) ? `\\left(${toTex(child)}\\right)` : toTex(child);
  return `${side(expr.left)} ${OP_TEX[expr.op]} ${side(expr.right)}`;
}

/* ---------- grading ---------- */

/** One reduction the learner made: which node, and what they said it was worth. */
export interface Move {
  path: Path;
  value: number;
}

export interface Replay {
  /** The expression after every move that could be applied. */
  expr: Expr;
  /** Moves applied before something went wrong, or all of them. */
  applied: number;
  /** The first fault found, if any. */
  fault?: 'missing' | 'out-of-order' | 'wrong-value';
}

/**
 * Re-walk the learner's moves over the original expression.
 *
 * This is the whole grader. A move is faulty when it names a node that is not
 * there, when that node was not yet reducible — the order mistake — or when the
 * value given is not what it comes to. Nothing here consults an expected
 * sequence, so every order precedence allows is accepted and no particular one
 * is privileged.
 */
export function replay(expr: Expr, moves: readonly Move[]): Replay {
  let current = expr;
  for (const [index, move] of moves.entries()) {
    const node = nodeAt(current, move.path);
    if (!node || node.kind === 'num') return { expr: current, applied: index, fault: 'missing' };
    if (!isReducible(node)) return { expr: current, applied: index, fault: 'out-of-order' };
    if (!Number.isFinite(move.value) || Math.abs(valueOf(node) - move.value) > 1e-9) {
      return { expr: current, applied: index, fault: 'wrong-value' };
    }
    current = reduceAt(current, move.path, move.value);
  }
  return { expr: current, applied: moves.length };
}

/** True when the walk is finished and every step of it was sound. */
export function isSolved(expr: Expr, moves: readonly Move[]): boolean {
  const result = replay(expr, moves);
  return result.fault === undefined && result.expr.kind === 'num';
}
