/**
 * Matrices and linear transformations.
 *
 * Level 1 is matrix arithmetic, where the whole lesson on multiplication
 * exists because it is the one operation that is *not* done entry by entry.
 * Level 2 is the determinant and the inverse, ending with a pair of
 * simultaneous equations solved as a single matrix equation.
 *
 * Split out of the old Vectors & Matrices course; see `vectors.ts`. Level and
 * lesson ids keep their `vm-l2` and `vm-l3` prefixes so that recorded progress
 * survives the split, which is why the first level here is numbered two.
 *
 * The third level, matrices as transformations, is `vm-l5`: roadmap batches B8
 * and B9 ran side by side, and Vectors took `vm-l4` for its second level so
 * the two could not collide. The fourth, composing transformations, is `vm-l7`
 * for the same reason: batch B18 ran beside B17, which gave Vectors `vm-l6`.
 * The fifth, systems of equations, is `vm-l9`: batch B27 ran beside B26,
 * which took `vm-l8` for Vectors. The sixth, invariant lines and points, is
 * `vm-l11`: batch B36 ran beside B35, which took `vm-l10` for Vectors.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Course, SlideRef } from '../types';
import { plotSvg } from '../figures';
import { transformGridSvg } from '../generators/transformFigure';

const teach = (
  ...blocks: { kind: 'prose' | 'display' | 'diagram'; text?: string; tex?: string; svg?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : b.kind === 'diagram'
          ? ({ kind: 'diagram', svg: b.svg ?? '' } as const)
          : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });
const figure = (svg: string) => ({ kind: 'diagram' as const, svg });

/**
 * The seven standard matrices, restated in every lesson that asks for them,
 * so no question leans on a list the learner last saw in an earlier lesson.
 */
const standardTurns = maths(
  '\\begin{gathered} 90^\\circ \\text{ anticlockwise}: \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} \\\\ 90^\\circ \\text{ clockwise}: \\begin{pmatrix} 0 & 1 \\\\ -1 & 0 \\end{pmatrix} \\\\ 180^\\circ: \\begin{pmatrix} -1 & 0 \\\\ 0 & -1 \\end{pmatrix} \\end{gathered}',
);
const standardMirrors = maths(
  '\\begin{gathered} x\\text{-axis}: \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix} \\\\ y\\text{-axis}: \\begin{pmatrix} -1 & 0 \\\\ 0 & 1 \\end{pmatrix} \\\\ y = x: \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix} \\\\ y = -x: \\begin{pmatrix} 0 & -1 \\\\ -1 & 0 \\end{pmatrix} \\end{gathered}',
);
const standardRecap = prose(
  'The standard matrices, each rebuilt from where $\\mathbf{i}$ and $\\mathbf{j}$ go. A quarter turn clockwise, which is $270^\\circ$ anticlockwise, sends $\\mathbf{i}$ down to $(0, -1)$ and $\\mathbf{j}$ across to $(1, 0)$, and those are its columns. A mirror keeps what lies on it and flips the rest.',
);
const scalingRecap = prose(
  'An enlargement about $O$ with scale factor $k$ is $\\begin{pmatrix} k & 0 \\\\ 0 & k \\end{pmatrix}$. A stretch parallel to the $x$-axis is $\\begin{pmatrix} k & 0 \\\\ 0 & 1 \\end{pmatrix}$, and parallel to the $y$-axis $\\begin{pmatrix} 1 & 0 \\\\ 0 & k \\end{pmatrix}$.',
);

export const matrices: Course = {
  id: 'matrices',
  category: 'advanced-maths',
  position: 50,
  title: 'Matrices & Linear Transformations',
  blurb: 'Matrix arithmetic, the determinant and the inverse, matrices as transformations of the plane, systems of equations, and invariant lines and points.',
  levels: [
    {
      id: 'vm-l2',
      title: 'Matrices',
      lessons: [
        {
          id: 'vm-l2-add',
          title: 'Matrices and Addition',
          slides: [
            teach(
              prose(
                'A **matrix** is a rectangular block of numbers. Its size is quoted rows first, so a two-by-two matrix has two rows and two columns.',
              ),
              maths('\\begin{pmatrix} 2 & 3 \\\\ -1 & 4 \\end{pmatrix}'),
              prose(
                'Position matters completely: the same four numbers arranged differently are a different matrix, in the same way that $\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}$ and $\\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix}$ are different vectors.',
              ),
              prose(
                'Entries are named by row and then column, so the entry in row 2, column 1 of that matrix is $-1$.',
              ),
              prose(
                'Addition and subtraction work entry by entry, with each position in the answer depending only on the same position in the originals.',
              ),
            ),
            ask('mat-shape'),
            ask('mat-add'),
            ask('mat-shape'),
            teach(
              prose('So addition is four small sums that never interact.'),
              maths(
                '\\begin{pmatrix} 2 & 3 \\\\ -1 & 4 \\end{pmatrix} + \\begin{pmatrix} 5 & -2 \\\\ 3 & 1 \\end{pmatrix} = \\begin{pmatrix} 7 & 1 \\\\ 2 & 5 \\end{pmatrix}',
              ),
              prose(
                'This only works when the two matrices are the same shape, since every entry needs a partner. Two matrices of different shapes cannot be added at all.',
              ),
              prose(
                'Bracket each entry before combining it, exactly as with vectors. A negative entry being subtracted is the one place the sign goes wrong.',
              ),
            ),
            ask('mat-sum-entry'),
            ask('mat-add+choice'),
            ask('mat-sum-entry'),
            teach(
              prose(
                'Matrix addition behaves like ordinary addition in every respect that matters: the order does not change the answer, and the grouping does not either.',
              ),
              maths('\\mathbf{A} + \\mathbf{B} = \\mathbf{B} + \\mathbf{A}'),
              prose(
                'That is worth stating because *multiplication* does not share the property, and the contrast is the single most important thing in this level.',
              ),
              prose(
                'The matrix of all zeros plays the part of zero: adding it changes nothing. It is written $\\mathbf{0}$ and is the additive identity.',
              ),
              prose(
                'Because it behaves that ordinarily, an equation with a matrix missing rearranges the way an ordinary one does.',
              ),
              maths(
                '\\mathbf{A} + \\mathbf{X} = \\mathbf{B} \\implies \\mathbf{X} = \\mathbf{B} - \\mathbf{A}',
              ),
              prose('With numbers: take the known matrix across, then subtract entry by entry.'),
              maths(
                '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} + \\mathbf{X} = \\begin{pmatrix} 5 & 1 \\\\ 3 & 6 \\end{pmatrix}',
              ),
              maths(
                '\\mathbf{X} = \\begin{pmatrix} 5 - 1 & 1 - 2 \\\\ 3 - 3 & 6 - 4 \\end{pmatrix} = \\begin{pmatrix} 4 & -1 \\\\ 0 & 2 \\end{pmatrix}',
              ),
              prose(
                'That is four small equations solved at once rather than anything new. Subtracting the other way round flips every sign, which answers a different question.',
              ),
            ),
            ask('mat-missing'),
            ask('mat-missing+choice'),
          ],
          skillCheck: [
            ask('mat-add', 2),
            ask('mat-missing', 2),
            ask('mat-shape', 2),
          ],
        },
        {
          id: 'vm-l2-combine',
          title: 'Scalar Multiples of Matrices',
          slides: [
            teach(
              prose(
                'A scalar multiplies every entry of a matrix — all four of them, not just the first row.',
              ),
              maths(
                '3\\begin{pmatrix} 2 & -1 \\\\ 4 & 0 \\end{pmatrix} = \\begin{pmatrix} 6 & -3 \\\\ 12 & 0 \\end{pmatrix}',
              ),
              prose(
                'It is the same rule as for vectors, applied to four numbers instead of two, and it is the only sense in which a matrix can be multiplied by an ordinary number.',
              ),
              prose(
                'Scale both matrices fully before adding anything. Adding first and scaling afterwards gives a different answer unless the two scalars happen to be equal.',
              ),
            ),
            ask('mat-combine'),
            ask('mat-sum-entry', 2),
            ask('mat-add'),
            teach(
              prose('So a combination like $2\\mathbf{A} - 3\\mathbf{B}$ is done in two stages.'),
              maths(
                '2\\begin{pmatrix} 1 & 2 \\\\ 0 & 3 \\end{pmatrix} - 3\\begin{pmatrix} 2 & -1 \\\\ 1 & 1 \\end{pmatrix} = \\begin{pmatrix} 2 & 4 \\\\ 0 & 6 \\end{pmatrix} - \\begin{pmatrix} 6 & -3 \\\\ 3 & 3 \\end{pmatrix}',
              ),
              maths('= \\begin{pmatrix} -4 & 7 \\\\ -3 & 3 \\end{pmatrix}'),
              prose(
                'Write the two scaled matrices down before subtracting. Trying to do both steps in one pass is what produces sign errors in the entries that were already negative.',
              ),
              prose(
                'A missing matrix rearranges like an ordinary equation. In $\\mathbf{A} + \\mathbf{X} = \\mathbf{B}$, $\\mathbf{X} = \\mathbf{B} - \\mathbf{A}$. When $\\mathbf{X}$ is being subtracted, add it to both sides first:',
              ),
              maths(
                '\\begin{gathered} \\mathbf{A} - \\mathbf{X} = \\mathbf{B} \\\\ \\mathbf{A} = \\mathbf{B} + \\mathbf{X} \\\\ \\mathbf{X} = \\mathbf{A} - \\mathbf{B} \\end{gathered}',
              ),
              maths(
                '\\begin{pmatrix} 3 & 1 \\\\ 0 & 5 \\end{pmatrix} - \\mathbf{X} = \\begin{pmatrix} 1 & 4 \\\\ -2 & 5 \\end{pmatrix}',
              ),
              maths(
                '\\begin{gathered} \\mathbf{X} = \\begin{pmatrix} 3 - 1 & 1 - 4 \\\\ 0 - (-2) & 5 - 5 \\end{pmatrix} \\\\ = \\begin{pmatrix} 2 & -3 \\\\ 2 & 0 \\end{pmatrix} \\end{gathered}',
              ),
            ),
            ask('mat-combine+choice'),
            ask('mat-missing'),
            ask('mat-sum-entry', 2),
            teach(
              prose(
                'Subtraction is addition of a negative multiple, so nothing new is needed: $\\mathbf{A} - \\mathbf{B}$ is $\\mathbf{A} + \\left(-1\\right)\\mathbf{B}$.',
              ),
              maths('\\mathbf{A} - \\mathbf{B} = \\mathbf{A} + \\left(-1\\right)\\mathbf{B}'),
              prose(
                'Treating it that way is slower but safer when the entries are mostly negative, because every sign change is then written down rather than done in the head.',
              ),
              prose(
                'Everything so far has been entry-by-entry. The next lesson is the operation that is not, and it is unlike anything in ordinary arithmetic.',
              ),
            ),
            ask('mat-add+choice'),
            ask('mat-missing+choice'),
          ],
          skillCheck: [
            ask('mat-combine', 2),
            ask('mat-sum-entry', 2),
            ask('mat-missing', 2),
          ],
        },
        {
          id: 'vm-l2-multiply',
          title: 'Multiplying Matrices',
          slides: [
            teach(
              prose(
                'Matrix multiplication is **not** entry by entry. That is the single most important fact in this level, and every error in this lesson comes from forgetting it.',
              ),
              prose(
                'Each entry of the product pairs a *row* of the first matrix with a *column* of the second: multiply across and add, exactly like a scalar product.',
              ),
              maths(
                '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\\\ 43 & 50 \\end{pmatrix}',
              ),
              prose(
                'The entry in row 1, column 1 is $\\left(1\\right)\\left(5\\right) + \\left(2\\right)\\left(7\\right) = 19$: row 1 of the first matrix, column 1 of the second.',
              ),
              prose(
                'Say "row of the first, column of the second" as you go. It is the only reliable way to stop the two being crossed over.',
              ),
              prose(
                'Pairing a row with a column only works if they are the same length, so the shapes decide whether a product exists at all. Write the two orders side by side: the inner pair must match, and the outer pair is the order of the answer.',
              ),
              maths('\\left(2 \\times 3\\right)\\left(3 \\times 4\\right) \\implies 2 \\times 4'),
              prose(
                'If the inner numbers disagree the product is simply not defined, and there is nothing to work out. Everything in this lesson is two-by-two, where they always agree.',
              ),
            ),
            ask('vec-dot-steps'),
            ask('mat-product-entry'),
            ask('mat-order'),
            teach(
              prose('Working through all four entries of that example:'),
              maths(
                '\\left(1\\right)\\left(6\\right) + \\left(2\\right)\\left(8\\right) = 22 \\qquad \\left(3\\right)\\left(5\\right) + \\left(4\\right)\\left(7\\right) = 43',
              ),
              prose(
                'Each entry takes two multiplications and one addition, so a two-by-two product is eight multiplications in total. Writing them out is quicker than trying to hold them in your head.',
              ),
              prose(
                'Multiplying the matching entries together instead — 1 times 5, 2 times 6, and so on — is the error this lesson exists to remove. It gives a plausible-looking answer that is wrong throughout.',
              ),
            ),
            ask('mat-multiply'),
            ask('mat-product-entry+choice'),
            ask('mat-multiply+choice'),
            teach(
              prose(
                'Order matters. $\\mathbf{AB}$ and $\\mathbf{BA}$ are usually different matrices, which has no parallel in ordinary arithmetic.',
              ),
              maths('\\mathbf{AB} \\neq \\mathbf{BA}'),
              prose(
                'Matrix multiplication is said to be *non-commutative* because of this. So "multiply both sides" is not a valid step unless you say which side you multiplied on.',
              ),
              prose(
                'The identity matrix is the exception that behaves: multiplying by it changes nothing, from either side.',
              ),
              maths('\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}'),
            ),
            ask('mat-order'),
            ask('vec-dot-steps+choice'),
          ],
          skillCheck: [
            ask('mat-multiply', 2),
            ask('mat-product-entry', 2),
            ask('mat-order', 2),
          ],
        },
        {
          id: 'vm-l2-vector',
          title: 'A Matrix Acting on a Vector',
          slides: [
            teach(
              prose(
                'A matrix multiplied by a vector follows the same rule, with the vector as a single column. Each component of the answer comes from one row of the matrix.',
              ),
              maths(
                '\\begin{pmatrix} 2 & 1 \\\\ -3 & 4 \\end{pmatrix} \\begin{pmatrix} 5 \\\\ -2 \\end{pmatrix} = \\begin{pmatrix} 8 \\\\ -23 \\end{pmatrix}',
              ),
              prose(
                'The top component is $\\left(2\\right)\\left(5\\right) + \\left(1\\right)\\left(-2\\right) = 8$, and the bottom is $\\left(-3\\right)\\left(5\\right) + \\left(4\\right)\\left(-2\\right) = -23$.',
              ),
              prose(
                'Using the columns of the matrix instead of the rows is the standard error, and it gives an answer that looks entirely reasonable.',
              ),
              prose(
                'A row can only be paired with a column of the same length, so the orders decide whether a product exists. Write them side by side: the inner pair must match, and the outer pair is the order of the answer. Here a $2 \\times 2$ times a $2 \\times 1$ gives a $2 \\times 1$, a column.',
              ),
              maths('\\left(3 \\times 4\\right)\\left(4 \\times 2\\right) \\implies 3 \\times 2'),
              maths('\\left(3 \\times 4\\right)\\left(6 \\times 4\\right): \\; 4 \\neq 6'),
              prose('The inner pair disagree there, so that product does not exist.'),
            ),
            ask('mat-vector'),
            ask('vec-dot-steps'),
            ask('mat-order'),
            teach(
              prose(
                'This is the operation that gives matrices their meaning. A matrix acting on a vector is a **transformation** of the plane: it moves every point at once, and the matrix is a complete description of how.',
              ),
              maths(
                '\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} -y \\\\ x \\end{pmatrix}',
              ),
              prose(
                'That one is a quarter turn anticlockwise about the origin. Four numbers describe what happens to every point in the plane.',
              ),
              prose(
                'The columns of a matrix are where $\\mathbf{i}$ and $\\mathbf{j}$ end up, which is the quickest way to read a transformation off a matrix or write one down.',
              ),
              prose(
                'A matrix times a matrix is the same rule, one column of the second matrix at a time. The entry in row 1, column 2 pairs row 1 of the first with column 2 of the second:',
              ),
              maths('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix}'),
              maths('\\left(1\\right)\\left(6\\right) + \\left(2\\right)\\left(8\\right) = 22'),
            ),
            ask('mat-vector+choice'),
            ask('mat-product-entry'),
            ask('vec-dot-steps+choice'),
            teach(
              prose(
                'Applying two transformations in turn is the product of their matrices — and the order in the product is the reverse of the order of the actions.',
              ),
              maths('\\mathbf{B}\\left(\\mathbf{A}\\mathbf{v}\\right) = \\left(\\mathbf{BA}\\right)\\mathbf{v}'),
              prose(
                'Apply $\\mathbf{A}$ first and then $\\mathbf{B}$, and the single matrix doing both is $\\mathbf{BA}$, not $\\mathbf{AB}$. That is why the order of a matrix product matters so much.',
              ),
              prose(
                'It also explains why matrices are written to the left of the vector: they act in from the left, the nearest one first.',
              ),
            ),
            ask('mat-product-entry+choice'),
            ask('mat-order'),
          ],
          skillCheck: [
            ask('mat-vector', 2),
            ask('mat-product-entry', 2),
            ask('mat-order', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mat-shape', 2),
        ask('mat-add', 2),
        ask('mat-missing', 2),
        ask('mat-sum-entry', 2),
        ask('mat-combine', 2),
        ask('mat-multiply', 2),
        ask('mat-product-entry', 2),
        ask('mat-order', 2),
        ask('mat-vector', 2),
        ask('mat-add', 2),
        ask('mat-multiply', 2),
        ask('mat-vector', 2),
      ],
    },
    {
      id: 'vm-l3',
      title: 'Determinants and Inverses',
      lessons: [
        {
          id: 'vm-l3-determinant',
          title: 'The Determinant',
          slides: [
            teach(
              prose(
                'Every square matrix has a single number attached to it called the **determinant**, and for a two-by-two matrix it is easy to compute.',
              ),
              maths(
                '\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc',
              ),
              prose(
                'The product of the leading diagonal, minus the product of the other one.',
              ),
              maths(
                '\\det \\begin{pmatrix} 3 & 2 \\\\ -1 & 5 \\end{pmatrix} = 15 - \\left(-2\\right) = 17',
              ),
              prose(
                'Work out each product with its sign before subtracting. Two negatives meeting in the subtraction is where this goes wrong most often.',
              ),
            ),
            ask('mat-determinant'),
            ask('mat-determinant-steps'),
            teach(
              prose(
                'The determinant has a meaning: it is the factor by which the matrix scales area. The matrix above has determinant $17$, so a shape of area $2$ lands on an image of area $17 \\times 2 = 34$.',
              ),
              prose(
                'A determinant of 1 preserves area, which is why rotations and reflections all have determinant $\\pm 1$.',
              ),
              maths('\\det \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} = 0 - \\left(-1\\right) = 1'),
              prose(
                'A negative determinant means the transformation turns the plane over as well as scaling it — a reflection is in there somewhere. Area itself is never negative, so the area is scaled by the size of the determinant.',
              ),
              maths('\\det \\begin{pmatrix} 1 & 3 \\\\ 2 & 1 \\end{pmatrix} = 1 - 6 = -5'),
              prose(
                'So that matrix sends a shape of area $2$ to one of area $5 \\times 2 = 10$, turned over.',
              ),
            ),
            ask('mat-area-image'),
            ask('mat-orientation'),
            ask('mat-area-image+choice'),
            teach(
              prose(
                'Four rules follow, each checked here on $\\mathbf{A} = \\begin{pmatrix} 3 & 2 \\\\ -1 & 5 \\end{pmatrix}$, with $\\det\\mathbf{A} = 17$.',
              ),
              prose(
                'Multiplying a two-by-two matrix by $k$ stretches both directions by $k$, so area is scaled twice: $\\det\\left(k\\mathbf{A}\\right) = k^{2}\\det\\mathbf{A}$.',
              ),
              maths('3\\mathbf{A} = \\begin{pmatrix} 9 & 6 \\\\ -3 & 15 \\end{pmatrix}'),
              maths('\\begin{gathered} \\det\\left(3\\mathbf{A}\\right) = 135 - \\left(-18\\right) \\\\ = 153 = 3^{2} \\times 17 \\end{gathered}'),
              prose(
                'Transposing swaps rows and columns. The leading diagonal is untouched and the other two entries only swap places, so $\\det\\left(\\mathbf{A}^{T}\\right) = \\det\\mathbf{A}$.',
              ),
              maths('\\det \\begin{pmatrix} 3 & -1 \\\\ 2 & 5 \\end{pmatrix} = 15 - \\left(-2\\right) = 17'),
              prose(
                'Doing one transformation and then another scales area by both factors, so $\\det\\left(\\mathbf{AB}\\right) = \\det\\mathbf{A} \\times \\det\\mathbf{B}$. With $\\det\\mathbf{B} = 2$, $\\det\\left(\\mathbf{AB}\\right) = 17 \\times 2 = 34$. There is no such rule for sums.',
              ),
              prose(
                'The inverse undoes $\\mathbf{A}$, so it has to scale area back: $\\det\\left(\\mathbf{A}^{-1}\\right) = \\frac{1}{\\det\\mathbf{A}} = \\frac{1}{17}$. For a stretch that is easy to see: $\\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix}$ has determinant $6$ and is undone by $\\begin{pmatrix} \\frac{1}{2} & 0 \\\\ 0 & \\frac{1}{3} \\end{pmatrix}$, whose determinant is $\\frac{1}{2} \\times \\frac{1}{3} = \\frac{1}{6}$.',
              ),
            ),
            ask('mat-det-property'),
            ask('mat-det-property', 2),
          ],
          skillCheck: [
            ask('mat-determinant', 2),
            ask('mat-det-property', 2),
            ask('mat-area-image', 2),
          ],
        },
        {
          id: 'vm-l3-singular',
          title: 'Singular Matrices',
          slides: [
            teach(
              prose(
                'A matrix with determinant zero is called **singular**, and it is the one case where a matrix has no inverse.',
              ),
              maths('\\det \\begin{pmatrix} 2 & 4 \\\\ 1 & 2 \\end{pmatrix} = 4 - 4 = 0'),
              prose(
                'The area reading explains why. A determinant of zero means area is scaled by zero, so the transformation collapses the whole plane onto a line.',
              ),
              prose(
                'Once two different points have landed on the same place there is no way to tell them apart again, so the transformation cannot be undone. That is precisely what having no inverse means.',
              ),
              prose(
                'So "find the value that makes this matrix singular" is the instruction to set the determinant to zero and solve.',
              ),
              maths('\\begin{gathered} \\det \\begin{pmatrix} k & 6 \\\\ 2 & 3 \\end{pmatrix} \\\\ = 3k - \\left(6\\right)\\left(2\\right) = 3k - 12 \\end{gathered}'),
              maths('\\begin{gathered} 3k - 12 = 0 \\\\ 3k = 12 \\\\ k = 4 \\end{gathered}'),
            ),
            ask('mat-singular-k'),
            ask('mat-determinant'),
            teach(
              prose(
                'Every value of $k$ other than $4$ gives an invertible matrix. The singular case is a single value, not a range.',
              ),
              prose(
                'Notice what a singular two-by-two matrix looks like: one row is a multiple of the other. In $\\begin{pmatrix} 4 & 6 \\\\ 2 & 3 \\end{pmatrix}$ the top row is twice the bottom one.',
              ),
              prose(
                'The determinant rules still hold. Suppose $\\det\\mathbf{A} = 5$ and $\\det\\mathbf{B} = -2$, with both $2 \\times 2$:',
              ),
              maths('\\det\\left(3\\mathbf{A}\\right) = 3^{2} \\times 5 = 45'),
              maths('\\det\\left(\\mathbf{A}^{T}\\right) = \\det\\mathbf{A} = 5'),
              maths('\\det\\left(\\mathbf{AB}\\right) = 5 \\times \\left(-2\\right) = -10'),
              maths('\\det\\left(\\mathbf{A}^{-1}\\right) = \\frac{1}{5}'),
              prose(
                'The last one says again why a singular matrix has no inverse: a determinant of $0$ would need a reciprocal, and there is not one.',
              ),
            ),
            ask('mat-singular-k+choice'),
            ask('mat-det-property'),
            ask('mat-determinant-steps'),
            ask('mat-det-property'),
            teach(
              prose(
                'The same idea decides whether a pair of simultaneous equations has a unique solution. A non-zero determinant means one solution. A zero determinant means none, or infinitely many.',
              ),
              maths('\\begin{pmatrix} 2 & 3 \\\\ 4 & 6 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 10 \\end{pmatrix}'),
              prose(
                'The determinant is $12 - 12 = 0$, so there is no inverse. The second row, $4$ and $6$, is $2$ times the first. Now compare the right-hand sides: $2 \\times 5 = 10$, which matches. The second equation says the same as the first: one line, and **infinitely many** solutions.',
              ),
              prose(
                'With $11$ at the bottom instead, $2 \\times 5 = 10 \\neq 11$. The two equations contradict each other, parallel lines, and there are **no** solutions.',
              ),
            ),
            ask('mat-method'),
            ask('mat-method'),
          ],
          skillCheck: [
            ask('mat-singular-k', 2),
            ask('mat-singular-k', 2),
            ask('mat-determinant', 2),
          ],
        },
        {
          id: 'vm-l3-inverse',
          title: 'The Inverse of a Matrix',
          slides: [
            teach(
              prose(
                'The **inverse** of a matrix undoes it. Multiplying a matrix by its inverse gives the identity, which is the matrix equivalent of 1.',
              ),
              maths('\\mathbf{M}\\mathbf{M}^{-1} = \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}'),
              prose(
                'For a two-by-two matrix there is a fixed recipe: swap the two entries on the leading diagonal, change the sign of the other two, and divide everything by the determinant.',
              ),
              maths(
                '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}^{-1} = \\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}',
              ),
              prose(
                'Swapping all four entries, or negating the diagonal instead of the off-diagonal, are the two ways this gets misremembered. The $a$ and $d$ trade places; the $b$ and $c$ stay put and change sign.',
              ),
              prose('Worked through on a real matrix. The determinant comes first:'),
              maths('\\det \\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix} = 12 - 2 = 10'),
              prose('The $3$ and $4$ trade places, and the $1$ and $2$ stay put with their signs changed:'),
              maths(
                '\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix}^{-1} = \\frac{1}{10}\\begin{pmatrix} 4 & -1 \\\\ -2 & 3 \\end{pmatrix}',
              ),
              prose('Leaving the $\\frac{1}{10}$ in front is tidier than dividing all four entries.'),
            ),
            ask('mat-inverse'),
            ask('mat-determinant'),
            ask('mat-inverse+choice'),
            teach(
              prose(
                'Check by multiplying the matrix by the whole-number part of its inverse. Each entry pairs a row of the first with a column of the second:',
              ),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix} \\begin{pmatrix} 4 & -1 \\\\ -2 & 3 \\end{pmatrix}'),
              maths(
                '\\begin{gathered} \\left(3\\right)\\left(4\\right) + \\left(1\\right)\\left(-2\\right) = 10 \\\\ \\left(3\\right)\\left(-1\\right) + \\left(1\\right)\\left(3\\right) = 0 \\\\ \\left(2\\right)\\left(4\\right) + \\left(4\\right)\\left(-2\\right) = 0 \\\\ \\left(2\\right)\\left(-1\\right) + \\left(4\\right)\\left(3\\right) = 10 \\end{gathered}',
              ),
              maths('= \\begin{pmatrix} 10 & 0 \\\\ 0 & 10 \\end{pmatrix}'),
              prose(
                'The $\\frac{1}{10}$ in front turns that into the identity, so the inverse is right. That check is worth doing the first few times, because it catches every version of the misremembered recipe.',
              ),
            ),
            ask('mat-determinant-steps'),
            ask('mat-multiply'),
            ask('mat-multiply+choice'),
            teach(
              prose(
                'The recipe fails exactly when the determinant is zero, since it would divide by zero. That is the singular case again, from a different direction.',
              ),
              prose(
                'Determinants follow four rules, each checked here on $\\mathbf{A} = \\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix}$, with $\\det\\mathbf{A} = 10$.',
              ),
              prose(
                'The inverse scales area back, so $\\det\\left(\\mathbf{A}^{-1}\\right) = \\frac{1}{\\det\\mathbf{A}}$. The inverse above is $\\frac{1}{10}$ times a matrix of determinant $12 - 2 = 10$, and taking out $\\frac{1}{10}$ from both rows gives',
              ),
              maths('\\begin{gathered} \\det\\left(\\mathbf{A}^{-1}\\right) \\\\ = \\frac{1}{10} \\times \\frac{1}{10} \\times 10 = \\frac{1}{10} \\end{gathered}'),
              prose('Scaling both rows by $k$ scales the determinant by $k^{2}$: $\\det\\left(k\\mathbf{A}\\right) = k^{2}\\det\\mathbf{A}$.'),
              maths('\\begin{gathered} \\det \\begin{pmatrix} 6 & 2 \\\\ 4 & 8 \\end{pmatrix} \\\\ = 48 - 8 = 40 = 2^{2} \\times 10 \\end{gathered}'),
              prose('Transposing leaves it alone: $\\det\\left(\\mathbf{A}^{T}\\right) = \\det\\mathbf{A}$.'),
              maths('\\det \\begin{pmatrix} 3 & 2 \\\\ 1 & 4 \\end{pmatrix} = 12 - 2 = 10'),
              prose(
                'And products multiply: $\\det\\left(\\mathbf{AB}\\right) = \\det\\mathbf{A} \\times \\det\\mathbf{B}$. With $\\mathbf{B} = \\begin{pmatrix} 1 & 1 \\\\ 0 & 2 \\end{pmatrix}$, of determinant $2$:',
              ),
              maths('\\mathbf{AB} = \\begin{pmatrix} 3 & 5 \\\\ 2 & 10 \\end{pmatrix}'),
              maths('\\begin{gathered} \\det\\left(\\mathbf{AB}\\right) = 30 - 10 \\\\ = 20 = 10 \\times 2 \\end{gathered}'),
            ),
            ask('mat-det-property'),
            ask('mat-det-property'),
          ],
          skillCheck: [
            ask('mat-inverse', 2),
            ask('mat-inverse', 2),
            ask('mat-det-property', 2),
          ],
        },
        {
          id: 'vm-l3-solve',
          title: 'Solving Equations with Matrices',
          slides: [
            teach(
              prose(
                'A pair of simultaneous equations is a single matrix equation in disguise. The coefficients form a matrix, the unknowns a vector, and the right-hand sides another vector.',
              ),
              maths(
                '\\begin{pmatrix} 2 & 3 \\\\ 1 & -2 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 8 \\\\ -3 \\end{pmatrix}',
              ),
              prose(
                'Multiplying out the left-hand side reproduces the two equations exactly: $2x + 3y = 8$ and $x - 2y = -3$.',
              ),
              prose(
                'Written this way there is one unknown — the vector — so multiplying both sides by the inverse solves it in a single step.',
              ),
              maths('\\mathbf{M}\\mathbf{v} = \\mathbf{u} \\implies \\mathbf{v} = \\mathbf{M}^{-1}\\mathbf{u}'),
              prose(
                'The inverse comes from the usual recipe: swap the two entries on the leading diagonal, change the sign of the other two, and divide by the determinant.',
              ),
              maths('\\det = \\left(2\\right)\\left(-2\\right) - \\left(3\\right)\\left(1\\right) = -7'),
              maths('\\mathbf{M}^{-1} = \\frac{1}{-7}\\begin{pmatrix} -2 & -3 \\\\ -1 & 2 \\end{pmatrix}'),
            ),
            ask('mat-vector'),
            ask('mat-inverse+choice'),
            ask('mat-inverse'),
            teach(
              prose('Then multiply the inverse into the right-hand side: the whole-number matrix first, the fraction last.'),
              maths('\\begin{pmatrix} -2 & -3 \\\\ -1 & 2 \\end{pmatrix} \\begin{pmatrix} 8 \\\\ -3 \\end{pmatrix}'),
              maths(
                '\\begin{gathered} \\left(-2\\right)\\left(8\\right) + \\left(-3\\right)\\left(-3\\right) = -7 \\\\ \\left(-1\\right)\\left(8\\right) + \\left(2\\right)\\left(-3\\right) = -14 \\end{gathered}',
              ),
              maths('\\mathbf{v} = \\frac{1}{-7}\\begin{pmatrix} -7 \\\\ -14 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}'),
              prose(
                'So $x = 1$ and $y = 2$. The inverse goes on the *left* of the vector, because the other order is not even a valid product here.',
              ),
              prose(
                'Substitute back to check: $2(1) + 3(2) = 8$ and $1 - 2(2) = -3$. It takes one line and catches any arithmetic slip in the inverse.',
              ),
            ),
            ask('mat-solve'),
            ask('mat-solve+choice'),
            ask('mat-vector+choice'),
            teach(
              prose(
                'The method needs a non-zero determinant. When it is zero there is no inverse, and the right-hand sides decide between none and infinitely many.',
              ),
              maths('\\begin{pmatrix} 1 & -2 \\\\ 3 & -6 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 4 \\\\ 12 \\end{pmatrix}'),
              prose(
                'The determinant is $-6 - (-6) = 0$. The second row is $3$ times the first, so compare the right-hand sides: $3 \\times 4 = 12$, which matches. Both equations are the same line, so there are **infinitely many** solutions.',
              ),
              prose(
                'Had the bottom entry been $13$, then $3 \\times 4 = 12 \\neq 13$: the equations contradict each other, and there are **no** solutions.',
              ),
            ),
            ask('mat-method'),
            ask('mat-method'),
          ],
          skillCheck: [
            ask('mat-solve', 2),
            ask('mat-inverse', 2),
            ask('mat-method', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mat-determinant', 2),
        ask('mat-det-property', 2),
        ask('mat-singular-k', 2),
        ask('mat-method', 2),
        ask('mat-inverse', 2),
        ask('mat-solve', 2),
        ask('mat-determinant', 2),
        ask('mat-det-property', 2),
        ask('mat-singular-k', 2),
        ask('mat-method', 2),
        ask('mat-inverse', 2),
        ask('mat-solve', 2),
      ],
    },
    {
      id: 'vm-l5',
      title: 'Matrices as Transformations',
      lessons: [
        {
          id: 'vm-l5-columns',
          title: 'Where i and j Land',
          slides: [
            teach(
              prose(
                'A matrix acting on a vector moves it, and acting on every vector at once it moves the whole plane. That movement is a **transformation**, and this level is about reading one off a matrix.',
              ),
              prose(
                'Start with the two unit vectors $\\mathbf{i}$ and $\\mathbf{j}$, and see what a matrix does to each.',
              ),
              maths(
                '\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix} = \\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}',
              ),
              maths(
                '\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix} \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix}',
              ),
              prose(
                'The first column comes out for $\\mathbf{i}$ and the second for $\\mathbf{j}$. That is the most useful fact in this level: **the columns of a matrix are where i and j land.**',
              ),
              prose(
                'Reading along a row instead is the slip to watch for. Rows are what you multiply along; columns are what you read images off.',
              ),
            ),
            ask('mat-column-image'),
            ask('mat-column-image+choice'),
            ask('mat-vector'),
            teach(
              prose(
                'Every other point follows from those two. The point $(x, y)$ is $x$ lots of $\\mathbf{i}$ and $y$ lots of $\\mathbf{j}$, so it lands on $x$ lots of the first column plus $y$ lots of the second.',
              ),
              maths('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix}'),
              maths('= x\\begin{pmatrix} a \\\\ c \\end{pmatrix} + y\\begin{pmatrix} b \\\\ d \\end{pmatrix}'),
              prose(
                'So it works backwards too. Told where $\\mathbf{i}$ and $\\mathbf{j}$ go, write the matrix straight down: the two images, side by side, as columns.',
              ),
              maths('\\mathbf{i} \\to \\begin{pmatrix} 2 \\\\ -1 \\end{pmatrix} \\qquad \\mathbf{j} \\to \\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix}'),
              maths('\\mathbf{M} = \\begin{pmatrix} 2 & 3 \\\\ -1 & 4 \\end{pmatrix}'),
              prose(
                'A picture carries the same information. The tips of the two arrows are the columns: row 1 is how far across each tip is, and row 2 is how far up.',
              ),
              figure(
                transformGridSvg({
                  span: 5,
                  arrows: [
                    { x: 2, y: -1, label: 'i', accent: true },
                    { x: 3, y: 4, label: 'j' },
                  ],
                  maxWidth: 260,
                  label: 'Where i and j land: i at (2, -1) and j at (3, 4)',
                }),
              ),
            ),
            ask('mat-from-images'),
            ask('mat-read-column'),
            ask('mat-from-images+choice'),
            teach(
              prose(
                'So a matrix and the pair of arrows are two ways of writing the same thing, and moving between them is a matter of reading columns.',
              ),
              prose(
                'When reading a picture, find the $\\mathbf{i}$ arrow first: its tip gives the whole first column, across and then up. The $\\mathbf{j}$ arrow gives the second.',
              ),
              prose(
                'And when a point is multiplied, the columns say roughly where the answer should be before you work it out. The point $(1, 1)$ has to land on the two columns added together.',
              ),
              maths(
                '\\begin{pmatrix} 2 & 3 \\\\ -1 & 4 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 3 \\end{pmatrix}',
              ),
            ),
            ask('mat-read-column'),
            ask('mat-vector+choice'),
          ],
          skillCheck: [
            ask('mat-column-image', 2),
            ask('mat-from-images', 2),
            ask('mat-read-column', 2),
          ],
        },
        {
          id: 'vm-l5-square',
          title: 'The Image of the Unit Square',
          slides: [
            teach(
              prose(
                'The **unit square** has corners $(0, 0)$, $(1, 0)$, $(1, 1)$ and $(0, 1)$. Watching what happens to it is the standard way to picture a matrix.',
              ),
              prose(
                'Two of its sides are $\\mathbf{i}$ and $\\mathbf{j}$, so two of its corners land on the columns. The origin stays where it is: no matrix can move it.',
              ),
              prose(
                'The fourth corner, $(1, 1)$, is $\\mathbf{i} + \\mathbf{j}$, so it lands on the two columns added together.',
              ),
              maths('\\mathbf{M} = \\begin{pmatrix} 3 & 1 \\\\ 1 & 2 \\end{pmatrix}'),
              maths('(1, 0) \\to (3, 1)'),
              maths('(0, 1) \\to (1, 2)'),
              maths('(1, 1) \\to (3 + 1, \\; 1 + 2) = (4, 3)'),
              figure(
                transformGridSvg({
                  span: 5,
                  image: [3, 1, 1, 2],
                  square: true,
                  arrows: [
                    { x: 3, y: 1, label: 'i', accent: true },
                    { x: 1, y: 2, label: 'j' },
                  ],
                  maxWidth: 260,
                  label: 'The unit square, dashed, and its image under the matrix with rows 3, 1 and 1, 2',
                }),
              ),
            ),
            ask('mat-square-corner'),
            ask('mat-column-image+choice'),
            ask('mat-square-corner+choice'),
            teach(
              prose(
                'Straight lines stay straight and parallel lines stay parallel, so the image of the square is always a **parallelogram** — unless the matrix is singular and flattens it into a line.',
              ),
              prose(
                'That makes the reverse question quick. Given the parallelogram, the two sides leaving the origin are the images of $\\mathbf{i}$ and $\\mathbf{j}$, and they are the columns.',
              ),
              prose(
                'Take care over which side is which. Swapping the two arrows swaps the columns, which is a different matrix: it draws the same parallelogram, but the square arrives turned over.',
              ),
            ),
            ask('mat-square-which'),
            ask('mat-read-column'),
            ask('mat-from-images'),
            teach(
              prose(
                'The picture and the matrix check each other. Read the columns off the arrows, add them, and the sum should be the far corner of the parallelogram.',
              ),
              prose(
                'Bigger squares follow the same rule. The square of side $2$ has its far corner at $(2, 2)$, which lands on twice the sum of the columns. For the matrix at the start of this lesson, that sum was $(4, 3)$.',
              ),
              maths('(2, 2) \\to 2 \\times (4, 3) = (8, 6)'),
              prose('Everything about the image comes from those two columns.'),
            ),
            ask('mat-square-which'),
            ask('mat-read-column'),
          ],
          skillCheck: [
            ask('mat-square-corner', 2),
            ask('mat-square-which', 2),
            ask('mat-read-column', 2),
          ],
        },
        {
          id: 'vm-l5-standard',
          title: 'Rotations and Reflections',
          slides: [
            teach(
              prose(
                'A few transformations come up so often that their matrices are worth knowing. None needs memorising: each is rebuilt from where $\\mathbf{i}$ and $\\mathbf{j}$ go.',
              ),
              prose(
                'A quarter turn anticlockwise about the origin sends $\\mathbf{i}$ to $\\mathbf{j}$ and $\\mathbf{j}$ to $-\\mathbf{i}$. A half turn sends each to its opposite.',
              ),
              maths('90^\\circ \\text{ anticlockwise}: \\; \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}'),
              maths('180^\\circ: \\; \\begin{pmatrix} -1 & 0 \\\\ 0 & -1 \\end{pmatrix}'),
              prose(
                'A turn of $90^\\circ$ clockwise is the same as $270^\\circ$ anticlockwise, so one matrix goes by both names: $\\begin{pmatrix} 0 & 1 \\\\ -1 & 0 \\end{pmatrix}$.',
              ),
              prose(
                'A reflection leaves its mirror line alone and flips everything else across it. In the $x$-axis, $\\mathbf{i}$ stays put and $\\mathbf{j}$ flips to $-\\mathbf{j}$; in the line $y = x$, the two swap places.',
              ),
              maths('x\\text{-axis}: \\; \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}'),
              maths('y\\text{-axis}: \\; \\begin{pmatrix} -1 & 0 \\\\ 0 & 1 \\end{pmatrix}'),
              maths('y = x: \\; \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}'),
              maths('y = -x: \\; \\begin{pmatrix} 0 & -1 \\\\ -1 & 0 \\end{pmatrix}'),
            ),
            ask('mat-standard'),
            ask('mat-standard-image'),
            ask('mat-standard-locate'),
            teach(
              prose('With the matrix written down, moving a point is one multiplication.'),
              maths(
                '\\begin{pmatrix} 0 & -1 \\\\ -1 & 0 \\end{pmatrix} \\begin{pmatrix} 3 \\\\ 5 \\end{pmatrix} = \\begin{pmatrix} -5 \\\\ -3 \\end{pmatrix}',
              ),
              prose(
                'A sketch is the check. A rotation keeps a point the same distance from the origin, and a reflection puts it the same distance from the mirror on the other side — here, $(3, 5)$ reflected in $y = -x$.',
              ),
              figure(
                transformGridSvg({
                  span: 6,
                  marks: [
                    { x: 3, y: 5, label: 'P' },
                    { x: -5, y: -3, label: "P'" },
                  ],
                  mirror: 'y=-x',
                  maxWidth: 260,
                  label: 'The point P at (3, 5) and its reflection in the line y = -x at (-5, -3)',
                }),
              ),
              prose(
                'The four to keep apart are the quarter turns and the diagonal mirrors. All four swap the coordinates over, and only the signs tell them apart.',
              ),
            ),
            ask('mat-standard-image+choice'),
            ask('mat-standard-locate'),
            ask('mat-standard'),
            teach(
              prose(
                'Any rotation about the origin has a matrix, not just the quarter turns. Turning through $\\theta$ anticlockwise sends $\\mathbf{i}$ to $(\\cos\\theta, \\sin\\theta)$ — the point at angle $\\theta$ on the unit circle.',
              ),
              prose(
                '$\\mathbf{j}$ starts a quarter turn further round, so it lands at $(-\\sin\\theta, \\cos\\theta)$. Those two are the columns.',
              ),
              maths('\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}'),
              prose(
                'The formula is for an anticlockwise turn. A clockwise turn is a negative angle, and since $\\sin\\left(-\\theta\\right) = -\\sin\\theta$ the minus sign moves to the bottom row.',
              ),
              prose('So a turn of $60^\\circ$ anticlockwise, with $\\cos 60^\\circ = \\frac{1}{2}$ and $\\sin 60^\\circ = \\frac{\\sqrt{3}}{2}$, is'),
              maths('\\begin{pmatrix} \\frac{1}{2} & -\\frac{\\sqrt{3}}{2} \\\\ \\frac{\\sqrt{3}}{2} & \\frac{1}{2} \\end{pmatrix}'),
              prose(
                'Past $90^\\circ$, use the acute angle to the $x$-axis for the size and the quadrant for the signs. The exact values needed are $\\cos 30^\\circ = \\frac{\\sqrt{3}}{2}$, $\\sin 30^\\circ = \\frac{1}{2}$, and $\\frac{\\sqrt{2}}{2}$ for both at $45^\\circ$.',
              ),
              prose(
                'Take $150^\\circ$ clockwise, so $\\theta = -150^\\circ$. Turning $150^\\circ$ clockwise from the positive $x$-axis ends $30^\\circ$ below the negative $x$-axis, in the bottom-left quarter, where both coordinates are negative:',
              ),
              maths('\\begin{gathered} \\cos\\left(-150^\\circ\\right) = -\\frac{\\sqrt{3}}{2} \\\\ \\sin\\left(-150^\\circ\\right) = -\\frac{1}{2} \\end{gathered}'),
              prose('Put those into the formula. The top-right entry is $-\\sin\\theta = \\frac{1}{2}$:'),
              maths('\\begin{pmatrix} -\\frac{\\sqrt{3}}{2} & \\frac{1}{2} \\\\ -\\frac{1}{2} & -\\frac{\\sqrt{3}}{2} \\end{pmatrix}'),
              prose('$150^\\circ$ clockwise ends where $210^\\circ$ anticlockwise does, so this is also the matrix for $210^\\circ$ anticlockwise.'),
            ),
            ask('mat-rotation-matrix'),
            ask('mat-rotation-matrix+choice'),
          ],
          skillCheck: [
            ask('mat-standard', 2),
            ask('mat-standard-image', 2),
            ask('mat-rotation-matrix', 2),
          ],
        },
        {
          id: 'vm-l5-name',
          title: 'Enlargements, Stretches and Naming',
          slides: [
            teach(
              prose(
                'An **enlargement** about the origin with scale factor $k$ multiplies both $\\mathbf{i}$ and $\\mathbf{j}$ by $k$, so $k$ runs down the leading diagonal and zeros go everywhere else.',
              ),
              maths('\\text{factor } 3: \\; \\begin{pmatrix} 3 & 0 \\\\ 0 & 3 \\end{pmatrix}'),
              prose(
                'A **stretch** does that in one direction only. Parallel to the $x$-axis, $\\mathbf{i}$ is multiplied by $k$ and $\\mathbf{j}$ stays exactly where it is, so the $y$-axis does not move at all.',
              ),
              maths('x\\text{ only, factor } 3: \\; \\begin{pmatrix} 3 & 0 \\\\ 0 & 1 \\end{pmatrix}'),
              prose(
                'The $1$ is the part that gets lost. A direction left alone keeps its $1$; a $0$ there would squash that whole direction flat. Stretching both ways at once puts a different factor in each diagonal slot.',
              ),
              prose(
                'A negative scale factor reverses as well: an enlargement of factor $-2$ doubles every distance from the origin and sends each point through it to the other side.',
              ),
            ),
            ask('mat-scale'),
            ask('mat-scale+choice'),
            teach(
              prose(
                'Rotations and reflections come up alongside these, so here they are again.',
              ),
              standardRecap,
              standardTurns,
              standardMirrors,
              prose(
                'Moving a point is then one multiplication. A stretch parallel to the $x$-axis, factor $3$, sends $(2, 5)$ to $(3 \\times 2, \\; 5) = (6, 5)$; a quarter turn anticlockwise sends $(2, 3)$ to $(-3, 2)$:',
              ),
              maths('\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} \\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} 0 - 3 \\\\ 2 + 0 \\end{pmatrix} = \\begin{pmatrix} -3 \\\\ 2 \\end{pmatrix}'),
            ),
            ask('mat-standard-locate', 2),
            teach(
              prose(
                'Naming a transformation from its matrix runs the other way: read the columns, picture the two arrows, and say what happened to them.',
              ),
              maths('\\begin{pmatrix} 1 & 0 \\\\ 0 & 4 \\end{pmatrix}: \\quad \\mathbf{i} \\to \\mathbf{i}, \\; \\mathbf{j} \\to 4\\mathbf{j}'),
              prose(
                'So that is a stretch parallel to the $y$-axis, factor $4$: the bottom-right entry changes, because the stretch moves points up and down.',
              ),
              prose(
                'The zeros say most of it before any picturing. Zeros off the leading diagonal mean each axis is only scaled: equal entries are an enlargement, unequal ones a stretch, and a $1$ with a $-1$ a reflection in an axis.',
              ),
              prose(
                'Zeros on the leading diagonal mean the axes have been swapped. Matching signs off it are a mirror in $y = x$ or $y = -x$; opposite signs, a quarter turn.',
              ),
              maths('\\begin{pmatrix} 0 & -1 \\\\ -1 & 0 \\end{pmatrix}: \\quad \\mathbf{i} \\to -\\mathbf{j}, \\; \\mathbf{j} \\to -\\mathbf{i}'),
              prose(
                'Both off-diagonal entries are $-1$, matching, so it is a mirror, and it swaps $\\mathbf{i}$ with $-\\mathbf{j}$: the reflection in $y = -x$. With $\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}$ the signs are opposite, and $\\mathbf{i}$ turns up to $\\mathbf{j}$: a quarter turn anticlockwise.',
              ),
              prose(
                'Entries both on and off the diagonal fit none of these. A **shear** such as $\\begin{pmatrix} 1 & 2 \\\\ 0 & 1 \\end{pmatrix}$ is the commonest: it slides every point sideways by an amount that grows with its height.',
              ),
            ),
            ask('mat-describe'),
            ask('mat-name'),
            ask('mat-standard-locate', 2),
            ask('mat-describe'),
            ask('mat-name'),
          ],
          skillCheck: [
            ask('mat-scale', 2),
            ask('mat-describe', 2),
            ask('mat-name', 2),
          ],
        },
        {
          id: 'vm-l5-area',
          title: 'The Determinant as an Area Scale Factor',
          slides: [
            teach(
              prose(
                'The unit square has area $1$, and its image is a parallelogram whose area is the size of the determinant.',
              ),
              figure(
                transformGridSvg({
                  span: 5,
                  image: [3, 1, 1, 2],
                  square: true,
                  maxWidth: 240,
                  label: 'The unit square, dashed, and its image, a parallelogram of area 5',
                }),
              ),
              maths('\\det\\begin{pmatrix} 3 & 1 \\\\ 1 & 2 \\end{pmatrix} = 6 - 1 = 5'),
              prose(
                'That parallelogram has five times the area of the square it came from. Every shape is scaled by the same factor, because any shape can be filled with tiny squares and each of them grows by the same amount.',
              ),
              maths('\\text{new area} = \\left|\\det\\mathbf{M}\\right| \\times \\text{old area}'),
            ),
            ask('mat-area-image'),
            ask('mat-area-steps'),
            ask('mat-area-image+choice'),
            teach(
              prose(
                'The sign of the determinant is news too. A negative determinant means the shape has been **turned over**, as a reflection would: go round its corners in order, and the image goes round the other way.',
              ),
              maths('\\det\\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix} = -1'),
              prose(
                'That is the reflection in $y = x$: area kept, shape turned over. Area itself is never negative, so the scale factor is the size of the determinant and the sign is a separate piece of information.',
              ),
              prose('Rotations have determinant $1$: nothing grows and nothing flips.'),
            ),
            ask('mat-orientation'),
            ask('mat-area-steps+choice'),
            teach(
              prose(
                'Knowing the area scale factor pins down an unknown entry. Say a shape of area $3$ lands on an image of area $30$, kept the same way round: the scale factor is $30 \\div 3 = 10$, and the determinant is $+10$.',
              ),
              maths('\\det\\begin{pmatrix} k & 2 \\\\ 3 & 4 \\end{pmatrix} = 4k - 6'),
              maths('\\begin{gathered} 4k - 6 = 10 \\\\ 4k = 16 \\\\ k = 4 \\end{gathered}'),
              prose(
                'Settle the orientation first. If the shape is turned over, the determinant is the negative of the scale factor, $-10$, and that gives a different $k$:',
              ),
              maths('\\begin{gathered} 4k - 6 = -10 \\\\ 4k = -4 \\\\ k = -1 \\end{gathered}'),
              prose(
                'A determinant of $0$ is the extreme case: every area becomes $0$, the plane is flattened onto a line, and there is no inverse. Those are the singular matrices of the last level, seen as pictures.',
              ),
            ),
            ask('mat-area-k'),
            ask('mat-area-k', 2),
            ask('mat-orientation'),
          ],
          skillCheck: [
            ask('mat-area-image', 2),
            ask('mat-orientation', 2),
            ask('mat-area-k', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mat-column-image', 2),
        ask('mat-read-column', 2),
        ask('mat-square-corner', 2),
        ask('mat-standard', 2),
        ask('mat-square-which', 2),
        ask('mat-standard-image', 2),
        ask('mat-rotation-matrix', 2),
        ask('mat-standard-locate', 2),
        ask('mat-scale', 2),
        ask('mat-describe', 2),
        ask('mat-name', 2),
        ask('mat-from-images', 2),
        ask('mat-area-image', 2),
        ask('mat-orientation', 2),
        ask('mat-area-k', 2),
      ],
    },
    {
      id: 'vm-l7',
      title: 'Composing Transformations',
      lessons: [
        {
          id: 'vm-l7-product',
          title: 'A Product Is a Composition',
          slides: [
            teach(
              prose(
                'Two transformations can be done one after the other: move every point by $\\mathbf{B}$, then move the results by $\\mathbf{A}$. The combined movement is a single transformation, and its matrix is the product $\\mathbf{AB}$.',
              ),
              maths('\\mathbf{A}\\left(\\mathbf{B}\\mathbf{v}\\right) = \\left(\\mathbf{AB}\\right)\\mathbf{v}'),
              prose(
                'Read it from the point outwards. $\\mathbf{B}$ sits next to $\\mathbf{v}$, so it acts first: $\\mathbf{AB}$ means $\\mathbf{B}$ first, then $\\mathbf{A}$. That is **the reverse of the order the letters are read**.',
              ),
              prose(
                'So a question that says "$\\mathbf{P}$, then $\\mathbf{Q}$" wants $\\mathbf{QP}$, with the first transformation on the right.',
              ),
              standardRecap,
              standardTurns,
              standardMirrors,
            ),
            ask('mat-compose-order'),
            ask('mat-compose-point'),
            ask('mat-compose-matrix'),
            teach(
              prose(
                'The unit square shows why the product works. The columns of $\\mathbf{B}$ are where $\\mathbf{i}$ and $\\mathbf{j}$ land first. $\\mathbf{A}$ then moves those two arrows, and where they end up are the columns of $\\mathbf{AB}$.',
              ),
              prose('Take a stretch across by a factor of $2$, then a quarter turn anticlockwise.'),
              maths('\\mathbf{B} = \\begin{pmatrix} 2 & 0 \\\\ 0 & 1 \\end{pmatrix}'),
              maths('\\mathbf{A} = \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}'),
              prose(
                'The stretch sends $\\mathbf{i}$ to $(2, 0)$, and the turn sends that up to $(0, 2)$. $\\mathbf{j}$ is left alone by the stretch, then turns to $(-1, 0)$. Those are the columns of the product.',
              ),
              maths('\\mathbf{AB} = \\begin{pmatrix} 0 & -1 \\\\ 2 & 0 \\end{pmatrix}'),
              figure(
                transformGridSvg({
                  span: 3,
                  image: [0, -1, 2, 0],
                  square: true,
                  arrows: [
                    { x: 0, y: 2, label: 'i', accent: true },
                    { x: -1, y: 0, label: 'j' },
                  ],
                  maxWidth: 240,
                  label: 'The unit square, dashed, and its image after a stretch and then a quarter turn: i ends at (0, 2) and j at (-1, 0)',
                }),
              ),
            ),
            ask('mat-compose-slide'),
            ask('mat-compose-matrix+choice'),
            ask('mat-compose-point', 2),
            teach(
              prose(
                'So there are two ways to follow a point through a pair of transformations: one step at a time, or all at once with the product. They have to agree, which makes each one a check on the other.',
              ),
              prose(
                'With three the rule carries on. $\\mathbf{C}$ first, then $\\mathbf{B}$, then $\\mathbf{A}$ is $\\mathbf{ABC}$: the transformation that happens first is always the one on the right.',
              ),
            ),
            ask('mat-compose-slide', 2),
            ask('mat-compose-order', 2),
          ],
          skillCheck: [
            ask('mat-compose-matrix', 2),
            ask('mat-compose-point', 2),
            ask('mat-compose-slide', 2),
          ],
        },
        {
          id: 'vm-l7-order',
          title: 'Order Matters',
          slides: [
            teach(
              prose(
                'With numbers, $3 \\times 5$ and $5 \\times 3$ are the same. With transformations the order usually matters, so $\\mathbf{AB}$ and $\\mathbf{BA}$ are usually different matrices.',
              ),
              prose('Take a quarter turn anticlockwise and a reflection in the $x$-axis, and follow $\\mathbf{i}$.'),
              prose('Turn first: $\\mathbf{i}$ goes up to $(0, 1)$, and the mirror then sends it down to $(0, -1)$.'),
              prose('Reflect first: $\\mathbf{i}$ lies on the mirror and stays at $(1, 0)$, and the turn then sends it up to $(0, 1)$.'),
              prose(
                'Two different places, so two different transformations. Reading the order carefully is not a formality.',
              ),
              standardRecap,
              standardTurns,
              standardMirrors,
              prose(
                'With the matrices written down, follow a point through both orders. Take $(3, 1)$, a reflection $\\mathbf{A}$ in the $y$-axis and a reflection $\\mathbf{B}$ in $y = -x$. $\\mathbf{AB}$ does $\\mathbf{B}$ first:',
              ),
              maths('(3, 1) \\xrightarrow{\\mathbf{B}} (-1, -3) \\xrightarrow{\\mathbf{A}} (1, -3)'),
              prose('$\\mathbf{BA}$ does $\\mathbf{A}$ first:'),
              maths('(3, 1) \\xrightarrow{\\mathbf{A}} (-3, 1) \\xrightarrow{\\mathbf{B}} (-1, 3)'),
            ),
            ask('mat-order-point'),
            ask('mat-commute-tree'),
            ask('mat-compose-slide'),
            teach(
              prose(
                'Some pairs do agree. Two rotations about the origin do: turning $30^\\circ$ and then $60^\\circ$ ends in the same place as $60^\\circ$ and then $30^\\circ$.',
              ),
              prose(
                'An enlargement about the origin agrees with everything, because it scales every direction equally. So does a half turn, which is an enlargement of scale factor $-1$.',
              ),
              prose(
                'Stretches along the axes agree with each other and with reflections in the axes. All of their matrices have zeros off the leading diagonal, and two such matrices can always be multiplied in either order.',
              ),
              scalingRecap,
            ),
            ask('mat-commute-which'),
            ask('mat-order-point', 2),
            ask('mat-commute-tree', 2),
            teach(
              prose(
                'A reflection is the usual reason the order matters. It reverses the sense of a turn, so a turn before the mirror and a turn after it go opposite ways.',
              ),
              prose(
                'When in doubt, follow $\\mathbf{i}$ and $\\mathbf{j}$ through both orders. If both arrows land in the same places either way, the two transformations commute.',
              ),
            ),
            ask('mat-commute-which', 2),
            ask('mat-compose-slide', 2),
          ],
          skillCheck: [
            ask('mat-order-point', 2),
            ask('mat-commute-tree', 2),
            ask('mat-commute-which', 2),
          ],
        },
        {
          id: 'vm-l7-standard',
          title: 'Composing the Standard Matrices',
          slides: [
            teach(
              prose(
                'The standard transformations combine into one another. Two turns about the origin make one turn, through the two angles added together.',
              ),
              prose(
                'A turn and a reflection, in either order, make a reflection, though not always in the same line. Multiply with the first on the right, then read the columns to name the result.',
              ),
              maths('\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}'),
              prose(
                'That is a reflection in the $x$-axis followed by a quarter turn anticlockwise, and together they are a reflection in the line $y = x$.',
              ),
              standardRecap,
              standardTurns,
              standardMirrors,
            ),
            ask('mat-compose-standard'),
            ask('mat-compose-name'),
            ask('mat-compose-locate'),
            teach(
              prose(
                'Two reflections always make a rotation. Each one turns the plane over, and turning it over twice leaves it the right way up, so all that is left is a turn.',
              ),
              prose(
                'The angle is **twice the angle from the first mirror to the second**, measured anticlockwise. Reflecting in the $x$-axis and then in $y = x$ turns through $2 \\times 45^\\circ = 90^\\circ$, and the matrices agree.',
              ),
              maths('\\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix} \\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}'),
              prose('Swap the two mirrors and the turn goes the other way, so the order matters here too.'),
              prose('Enlargements and stretches combine with these in the same way, first on the right.'),
              scalingRecap,
            ),
            ask('mat-reflect-pair'),
            ask('mat-compose-standard', 2),
            ask('mat-compose-locate', 2),
            teach(
              prose(
                'The rule works for any two mirrors through the origin, not only the four with standard matrices. Mirrors at $30^\\circ$ and $60^\\circ$ to the $x$-axis are $30^\\circ$ apart, so reflecting in the first and then the second turns through $60^\\circ$ anticlockwise.',
              ),
              prose(
                'Take them the other way round, $60^\\circ$ first and then $30^\\circ$, and the difference is negative:',
              ),
              maths('2 \\times \\left(30^\\circ - 60^\\circ\\right) = -60^\\circ'),
              prose(
                'A negative angle is a clockwise turn: $60^\\circ$ clockwise. To give it as an anticlockwise angle between $0^\\circ$ and $360^\\circ$, add $360^\\circ$:',
              ),
              maths('-60^\\circ + 360^\\circ = 300^\\circ'),
              prose(
                'A picture names a combination as well as a product does. Follow the $\\mathbf{i}$ arrow: if it has turned, and $\\mathbf{j}$ has turned the same way with it, the pair made a rotation; if the square has been turned over, a reflection.',
              ),
            ),
            ask('mat-reflect-pair+choice', 2),
            ask('mat-compose-name', 2),
          ],
          skillCheck: [
            ask('mat-compose-standard', 2),
            ask('mat-compose-name', 2),
            ask('mat-reflect-pair', 2),
          ],
        },
        {
          id: 'vm-l7-inverse',
          title: 'Undoing a Transformation',
          slides: [
            teach(
              prose(
                'The inverse matrix $\\mathbf{M}^{-1}$ is the transformation that undoes $\\mathbf{M}$. Do one and then the other, and every point is back where it started.',
              ),
              maths('\\mathbf{M}^{-1}\\mathbf{M} = \\mathbf{I}'),
              prose(
                'For the standard transformations it can be written down without the formula. A rotation is undone by turning back the same amount, a reflection is undone by itself, and an enlargement of scale factor $k$ by one of scale factor $\\frac{1}{k}$.',
              ),
              maths('\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix}^{-1} = \\begin{pmatrix} 0 & 1 \\\\ -1 & 0 \\end{pmatrix}'),
              prose('A quarter turn anticlockwise is undone by a quarter turn clockwise.'),
              prose(
                'A stretch of factor $k$ is undone by a stretch in the same direction with factor $\\frac{1}{k}$. A stretch parallel to the $y$-axis, factor $2$, is undone by one of factor $\\frac{1}{2}$, so if it sent $P$ to $P\'(1, 4)$, then $P$ was',
              ),
              maths('\\begin{pmatrix} 1 & 0 \\\\ 0 & \\frac{1}{2} \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}'),
              prose('For the others, the standard matrices:'),
              standardTurns,
              standardMirrors,
            ),
            ask('mat-undo-matrix'),
            ask('mat-undo-point'),
            ask('mat-undo-matrix+choice'),
            teach(
              prose(
                'To undo two transformations, undo them in the reverse order. $\\mathbf{AB}$ does $\\mathbf{B}$ first and $\\mathbf{A}$ second, so undoing it starts by undoing $\\mathbf{A}$.',
              ),
              maths('\\left(\\mathbf{AB}\\right)^{-1} = \\mathbf{B}^{-1}\\mathbf{A}^{-1}'),
              prose(
                'It is the order socks and shoes come off: the shoes went on last, so they come off first.',
              ),
              prose(
                'Multiplying shows it works. In $\\mathbf{AB}\\mathbf{B}^{-1}\\mathbf{A}^{-1}$ the middle pair cancels to the identity, and then the outer pair does.',
              ),
              prose(
                'For a matrix with no name, use the inverse recipe: swap the leading diagonal, change the sign of the other two, and divide by the determinant. When the determinant is $1$ or $-1$ the entries stay whole.',
              ),
              maths('\\begin{gathered} \\mathbf{A} = \\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix} \\\\ \\det\\mathbf{A} = 2 - 1 = 1 \\end{gathered}'),
              maths('\\mathbf{A}^{-1} = \\begin{pmatrix} 1 & -1 \\\\ -1 & 2 \\end{pmatrix}'),
              maths('\\begin{gathered} \\mathbf{B} = \\begin{pmatrix} 1 & 2 \\\\ 0 & -1 \\end{pmatrix} \\\\ \\det\\mathbf{B} = -1 - 0 = -1 \\end{gathered}'),
              prose('Swap and change signs to get $\\begin{pmatrix} -1 & -2 \\\\ 0 & 1 \\end{pmatrix}$, then divide by $-1$, which flips every sign:'),
              maths('\\mathbf{B}^{-1} = \\begin{pmatrix} 1 & 2 \\\\ 0 & -1 \\end{pmatrix}'),
              prose('Then $(\\mathbf{AB})^{-1} = \\mathbf{B}^{-1}\\mathbf{A}^{-1}$, row of the first times column of the second:'),
              maths('\\begin{pmatrix} 1 & 2 \\\\ 0 & -1 \\end{pmatrix} \\begin{pmatrix} 1 & -1 \\\\ -1 & 2 \\end{pmatrix}'),
              maths(
                '\\begin{gathered} (1)(1) + (2)(-1) = -1 \\\\ (1)(-1) + (2)(2) = 3 \\\\ (0)(1) + (-1)(-1) = 1 \\\\ (0)(-1) + (-1)(2) = -2 \\end{gathered}',
              ),
              maths('(\\mathbf{AB})^{-1} = \\begin{pmatrix} -1 & 3 \\\\ 1 & -2 \\end{pmatrix}'),
            ),
            ask('mat-inverse-order'),
            ask('mat-inverse-tree'),
            ask('mat-inverse-order+choice', 2),
            teach(
              prose(
                'The same idea finds where a point came from. If $P$ was moved by one transformation and then another, landing at $P\'$, undo the second first and the first last.',
              ),
              prose(
                'With named transformations this needs no inverse formula at all: turn back, reflect again, or divide out the scale factor, one step at a time starting from the last.',
              ),
              prose(
                'Say $P$ was enlarged by scale factor $2$ about $O$, then given a quarter turn anticlockwise, landing at $P\'(-4, 6)$. Undo the turn first, with a quarter turn clockwise:',
              ),
              maths('\\begin{pmatrix} 0 & 1 \\\\ -1 & 0 \\end{pmatrix} \\begin{pmatrix} -4 \\\\ 6 \\end{pmatrix} = \\begin{pmatrix} 6 \\\\ 4 \\end{pmatrix}'),
              prose('Then undo the enlargement by dividing by $2$: $P$ was $(3, 2)$.'),
            ),
            ask('mat-undo-point', 2),
            ask('mat-inverse-tree', 2),
          ],
          skillCheck: [
            ask('mat-undo-matrix', 2),
            ask('mat-inverse-order', 2),
            ask('mat-inverse-tree', 2),
          ],
        },
        {
          id: 'vm-l7-area',
          title: 'Area Under a Composition',
          slides: [
            teach(
              prose(
                'Each transformation scales area by the size of its determinant. Do two in turn and the second scales an area the first has already scaled, so the factors multiply.',
              ),
              maths('\\det\\left(\\mathbf{AB}\\right) = \\det\\mathbf{A} \\times \\det\\mathbf{B}'),
              prose(
                'So the determinant of a product needs no multiplying of matrices: find each determinant, and multiply those.',
              ),
              maths('\\det \\begin{pmatrix} 2 & 1 \\\\ 0 & 3 \\end{pmatrix} = 6 - 0 = 6'),
              maths('\\det \\begin{pmatrix} 1 & 2 \\\\ 1 & 4 \\end{pmatrix} = 4 - 2 = 2'),
              prose(
                'So their product, in either order, has determinant $6 \\times 2 = 12$, and a shape of area $3$ transformed by one and then the other ends with area $12 \\times 3 = 36$. A matrix used twice, $\\mathbf{M}^{2}$, has determinant $\\det\\mathbf{M} \\times \\det\\mathbf{M}$.',
              ),
              prose(
                'It does not matter which way round the product is. $\\det\\left(\\mathbf{AB}\\right)$ and $\\det\\left(\\mathbf{BA}\\right)$ are equal, even when $\\mathbf{AB}$ and $\\mathbf{BA}$ are not.',
              ),
            ),
            ask('mat-compose-det'),
            ask('mat-compose-area'),
            ask('mat-compose-det+choice'),
            teach(
              prose(
                'The sign carries through as well. A negative determinant turns shapes over, and two turnings over cancel: two reflections make a rotation, with determinant $(-1) \\times (-1) = 1$.',
              ),
              prose(
                'So the final image is turned over exactly when one of the two determinants is negative, and the same way round when both are, or neither is.',
              ),
              prose(
                'The named transformations have determinants you can read off their matrices: $1$ for any rotation, $-1$ for any reflection, $k$ for a stretch of factor $k$, and $k^{2}$ for an enlargement of factor $k$.',
              ),
              prose(
                'So a triangle of area $3$ given a reflection in the $x$-axis and then a stretch of factor $2$ has determinant $-1 \\times 2 = -2$ in all: its image has area $2 \\times 3 = 6$ and is turned over.',
              ),
              prose(
                'The rule runs backwards too. If $\\det\\mathbf{A} = 3$ and $\\det\\left(\\mathbf{AB}\\right) = -12$, then',
              ),
              maths('\\begin{gathered} -12 = 3 \\times \\det\\mathbf{B} \\\\ \\det\\mathbf{B} = -12 \\div 3 = -4 \\end{gathered}'),
              prose('and $\\mathbf{B}$ is the one that turns shapes over.'),
            ),
            ask('mat-compose-orientation'),
            ask('mat-det-missing'),
            ask('mat-compose-area+choice', 2),
            teach(
              prose(
                'Working backwards with two negatives is the same division. If $\\det\\mathbf{S} = -2$ and $\\det\\left(\\mathbf{RS}\\right) = 10$, then $\\det\\mathbf{R} = 10 \\div \\left(-2\\right) = -5$: both turn shapes over, and together they do not.',
              ),
              prose(
                'The rule also says why a product with a singular matrix in it is singular: one factor of $0$ makes the whole product $0$, and the plane is flattened whatever else happens.',
              ),
            ),
            ask('mat-det-missing+choice', 2),
            ask('mat-compose-orientation', 2),
          ],
          skillCheck: [
            ask('mat-compose-det', 2),
            ask('mat-compose-orientation', 2),
            ask('mat-det-missing', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mat-compose-matrix', 2),
        ask('mat-compose-slide', 2),
        ask('mat-order-point', 2),
        ask('mat-compose-name', 2),
        ask('mat-commute-tree', 2),
        ask('mat-reflect-pair', 2),
        ask('mat-compose-point', 2),
        ask('mat-undo-matrix', 2),
        ask('mat-compose-locate', 2),
        ask('mat-inverse-tree', 2),
        ask('mat-commute-which', 2),
        ask('mat-compose-standard', 2),
        ask('mat-undo-point', 2),
        ask('mat-compose-det', 2),
        ask('mat-compose-orientation', 2),
      ],
    },
    {
      id: 'vm-l9',
      title: 'Systems of Equations',
      lessons: [
        {
          id: 'vm-l9-write',
          title: 'Three Equations, One Matrix',
          slides: [
            teach(
              prose(
                'Three equations in three unknowns make one matrix equation, just as two in two did. The coefficients form a $3 \\times 3$ matrix $\\mathbf{A}$, the unknowns a column $\\mathbf{x}$, and the right-hand sides a column $\\mathbf{b}$.',
              ),
              maths('\\begin{aligned} 2x + y - z &= 3 \\\\ x - 3y &= -4 \\\\ 4y + 5z &= 7 \\end{aligned}'),
              maths('\\begin{pmatrix} 2 & 1 & -1 \\\\ 1 & -3 & 0 \\\\ 0 & 4 & 5 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 3 \\\\ -4 \\\\ 7 \\end{pmatrix}'),
              prose(
                'Each equation is one row. Keep the unknowns in the order $x, y, z$ in every row, and write $0$ where one is missing: the second equation has no $z$, so its row ends in $0$.',
              ),
            ),
            ask('mat-sys-read'),
            ask('mat-sys-back'),
            ask('mat-sys-read', 2),
            teach(
              prose(
                'A $3 \\times 3$ matrix times a column works as a 2 by 2 did, with one more pair in each row. Each row, multiplied across the column and added, gives one entry of the answer.',
              ),
              maths('\\begin{pmatrix} 2 & 1 & -1 \\\\ 1 & -3 & 0 \\\\ 0 & 4 & 5 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 2 \\\\ 1 \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 3 \\\\ -5 \\\\ 13 \\end{pmatrix}'),
              prose(
                'Row by row: $2(1) + 1(2) + (-1)(1) = 3$, then $1(1) + (-3)(2) + 0(1) = -5$, then $0(1) + 4(2) + 5(1) = 13$.',
              ),
              prose(
                'The top entry, $3$, is the left-hand side of the first equation at $x = 1$, $y = 2$, $z = 1$. Multiplying by $\\mathbf{A}$ substitutes into all three equations at once.',
              ),
            ),
            ask('mat-sys-vector'),
            ask('mat-sys-rhs'),
            ask('mat-sys-vector+choice'),
            teach(
              prose(
                'So $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ says that these values of $x$, $y$ and $z$ make every equation true. A proposed solution is checked by multiplying it by $\\mathbf{A}$ and comparing with $\\mathbf{b}$, row by row.',
              ),
              prose(
                'Reading back is the same in reverse: row 2 of $\\mathbf{A}$ together with entry 2 of $\\mathbf{b}$ is the second equation, and nothing else.',
              ),
            ),
            ask('mat-sys-back', 2),
            ask('mat-sys-rhs', 2),
          ],
          skillCheck: [ask('mat-sys-read', 2), ask('mat-sys-vector', 2), ask('mat-sys-rhs', 2)],
        },
        {
          id: 'vm-l9-det',
          title: 'The 3 × 3 Determinant',
          slides: [
            teach(
              prose(
                'A $3 \\times 3$ matrix has a determinant too, built from 2 by 2 ones. Take an entry of the first row, cross out its row and its column, and the determinant of the four entries left is that entry\'s **minor**.',
              ),
              maths('\\mathbf{A} = \\begin{pmatrix} 2 & 1 & 3 \\\\ 0 & 4 & 1 \\\\ 5 & 2 & 1 \\end{pmatrix}'),
              maths('M_1 = \\begin{vmatrix} 4 & 1 \\\\ 2 & 1 \\end{vmatrix} = 2'),
              prose('Multiply each entry of the first row by its minor, and combine them with the signs $+ \\; - \\; +$.'),
              maths('\\det \\mathbf{A} = 2M_1 - 1M_2 + 3M_3'),
              prose('Here $M_2 = -5$ and $M_3 = -20$, so $\\det \\mathbf{A} = 2(2) - 1(-5) + 3(-20) = -51$.'),
            ),
            ask('mat-sys-minor'),
            ask('mat-sys-det-tree'),
            ask('mat-sys-det'),
            teach(
              prose(
                'Some determinants are zero on sight. If a row is all zeros, or two rows are equal, or one row is a multiple of another, or one row is two others added, the determinant is $0$.',
              ),
              maths('\\det \\begin{pmatrix} 1 & 2 & 3 \\\\ 2 & 4 & 6 \\\\ 5 & 0 & 1 \\end{pmatrix} = 0'),
              prose(
                'The reason is the one from two dimensions. The determinant is how much the matrix scales volume, and rows tied together flatten space onto a plane, where volume is zero.',
              ),
            ),
            ask('mat-sys-det-zero'),
            ask('mat-sys-minor+choice'),
            teach(
              prose(
                'Changing a matrix changes its determinant in predictable ways. Swapping two rows changes its sign. Multiplying one row by $k$ multiplies it by $k$.',
              ),
              prose(
                'Multiplying the whole $3 \\times 3$ matrix by $k$ multiplies all three rows by $k$, so the determinant goes up by $k$ three times over.',
              ),
              maths('\\det(k\\mathbf{A}) = k^3 \\det \\mathbf{A}'),
              prose(
                'And a matrix and its transpose have the same determinant. Say $\\det\\mathbf{A} = 5$. Multiplying row 1 by $3$ gives $3 \\times 5 = 15$. Swapping rows 1 and 2 gives $-5$. Scaling the whole matrix by $2$:',
              ),
              maths('\\det(2\\mathbf{A}) = 2^3 \\times 5 = 40'),
              prose('The rules stack. For $2\\mathbf{A}$ with two rows then swapped, scale first and then change the sign:'),
              maths('-\\left(2^3 \\times 5\\right) = -40'),
            ),
            ask('mat-sys-det-rule'),
            ask('mat-sys-det-zero', 2),
            ask('mat-sys-det-rule+choice', 2),
          ],
          skillCheck: [ask('mat-sys-det', 2), ask('mat-sys-det-zero', 2), ask('mat-sys-det-rule', 2)],
        },
        {
          id: 'vm-l9-singular',
          title: 'When the Determinant Is Zero',
          slides: [
            teach(
              prose(
                'Back to two equations in two unknowns. Each is a straight line, and a solution is a point on both. Two lines cross once, never meet, or are the same line.',
              ),
              prose(
                'A zero determinant means the left-hand sides are multiples of each other, so the lines have the same gradient: parallel, or the same line. Rearranging each as $y = mx + c$ shows which.',
              ),
              maths('\\begin{aligned} 2x - 2y &= -2 \\\\ 3x - 3y &= 3 \\end{aligned}'),
              maths('\\begin{gathered} 2y = 2x + 2 \\\\ y = x + 1 \\end{gathered}'),
              maths('\\begin{gathered} 3y = 3x - 3 \\\\ y = x - 1 \\end{gathered}'),
              prose(
                'The same gradient, $1$, but different intercepts, $1$ and $-1$: parallel lines, which never meet, so there are **no** solutions.',
              ),
              figure(
                plotSvg({
                  xMin: -4,
                  xMax: 4,
                  yMin: -3.5,
                  yMax: 3.5,
                  curves: [{ f: (x) => x + 1 }, { f: (x) => x - 1, accent: true }],
                  height: 140,
                  label: 'The parallel lines y = x + 1 and y = x - 1, which never meet',
                }),
              ),
              prose(
                'The right-hand sides can be compared without rearranging. Both left-hand sides are multiples of $x - y$: two of it and three of it. The first says $x - y = -2 \\div 2 = -1$, so the second is the same line only if its right-hand side is $3 \\times (-1) = -3$. Then there are **infinitely many** solutions.',
              ),
            ),
            ask('mat-sys-lines'),
            ask('mat-sys-count'),
            ask('mat-sys-consistent'),
            teach(
              prose(
                'Infinitely many solutions does not mean anything goes. The solutions are exactly the points on that one line, and writing it as $y = mx + c$ describes them all at once.',
              ),
              maths('\\begin{aligned} 6x + 2y &= 4 \\\\ 9x + 3y &= 6 \\end{aligned}'),
              prose('Divide the first by $2$, then leave $y$ on its own:'),
              maths('\\begin{gathered} 3x + y = 2 \\\\ y = -3x + 2 \\end{gathered}'),
              prose(
                'The second divided by $3$ is the same $3x + y = 2$, so it gives the same line. Each choice of $x$ gives one solution: $x = 0$ and $y = 2$, or $x = 1$ and $y = -1$, and so on for ever.',
              ),
            ),
            ask('mat-sys-line-form'),
            ask('mat-sys-lines', 2),
            ask('mat-sys-consistent+choice', 2),
            teach(
              prose(
                'Neither equation has to be a whole-number multiple of the other. In $2x + 6y = 4$ and $3x + 9y = q$ both left-hand sides are multiples of $x + 3y$: two of it, and three of it.',
              ),
              prose(
                'So the first says $x + 3y = 2$, and the second agrees only if $q = 3 \\times 2 = 6$. Divide each equation down to the part they share, then compare.',
              ),
            ),
            ask('mat-sys-count', 2),
            ask('mat-sys-line-form', 2),
          ],
          skillCheck: [ask('mat-sys-lines', 2), ask('mat-sys-consistent', 2), ask('mat-sys-line-form', 2)],
        },
        {
          id: 'vm-l9-solve',
          title: 'Solving Three Equations',
          slides: [
            teach(
              prose(
                '**Cramer\'s rule** solves $\\mathbf{A}\\mathbf{x} = \\mathbf{b}$ one unknown at a time. For each unknown, replace its column of $\\mathbf{A}$ by $\\mathbf{b}$, and call the result $\\mathbf{A}_x$, $\\mathbf{A}_y$ or $\\mathbf{A}_z$.',
              ),
              maths('x = \\frac{\\det \\mathbf{A}_x}{\\det \\mathbf{A}}'),
              prose(
                'For $y$ it is column 2 that is replaced, and for $z$ column 3. The bottom is $\\det \\mathbf{A}$ every time, so it is worked out once, and it must not be zero.',
              ),
              prose('Worked through for $y$:'),
              maths('\\begin{pmatrix} 1 & 2 & 0 \\\\ 0 & 1 & 1 \\\\ 1 & 0 & 2 \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 5 \\\\ 7 \\end{pmatrix}'),
              prose(
                'Expand $\\det\\mathbf{A}$ along the first row. The minors are $1(2) - 1(0) = 2$, then $0(2) - 1(1) = -1$, then $0(0) - 1(1) = -1$:',
              ),
              maths('\\begin{gathered} \\det\\mathbf{A} \\\\ = 1(2) - 2(-1) + 0(-1) = 4 \\end{gathered}'),
              prose('Now put $\\mathbf{b}$ in column 2, the $y$ column:'),
              maths('\\mathbf{A}_y = \\begin{pmatrix} 1 & 5 & 0 \\\\ 0 & 5 & 1 \\\\ 1 & 7 & 2 \\end{pmatrix}'),
              prose(
                'Its minors along the first row are $5(2) - 1(7) = 3$, then $0(2) - 1(1) = -1$, then $0(7) - 5(1) = -5$:',
              ),
              maths('\\begin{gathered} \\det\\mathbf{A}_y \\\\ = 1(3) - 5(-1) + 0(-5) = 8 \\end{gathered}'),
              maths('y = \\frac{8}{4} = 2'),
            ),
            ask('mat-sys-cramer-swap'),
            ask('mat-sys-cramer'),
            ask('mat-sys-cramer-swap', 2),
            teach(
              prose(
                'With the inverse to hand there is a quicker route. Multiply both sides on the left by $\\mathbf{A}^{-1}$, and the solution is one matrix times a column.',
              ),
              maths('\\mathbf{x} = \\mathbf{A}^{-1}\\mathbf{b}'),
              prose(
                'A $3 \\times 3$ inverse is long to find by hand, so here it is given. It often comes as a fraction times a whole-number matrix: multiply by the matrix first, and divide at the end. For the same system:',
              ),
              maths('\\mathbf{A}^{-1} = \\frac{1}{4}\\begin{pmatrix} 2 & -4 & 2 \\\\ 1 & 2 & -1 \\\\ -1 & 2 & 1 \\end{pmatrix}'),
              prose('Each row of the whole-number matrix times $\\mathbf{b} = (5, 5, 7)$:'),
              maths(
                '\\begin{gathered} 2(5) - 4(5) + 2(7) = 4 \\\\ 1(5) + 2(5) - 1(7) = 8 \\\\ -1(5) + 2(5) + 1(7) = 12 \\end{gathered}',
              ),
              prose('Then divide each by $4$:'),
              maths('\\mathbf{x} = \\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}'),
              prose('That agrees with $y = 2$ from Cramer\'s rule.'),
            ),
            ask('mat-sys-inverse'),
            ask('mat-sys-cramer+choice', 2),
            ask('mat-sys-inverse+choice', 2),
            teach(
              prose(
                'Some systems need neither. When each equation has one unknown fewer than the one above it, the system is **triangular**, and the last line gives $z$ straight away.',
              ),
              maths('\\begin{aligned} x + y + z &= 6 \\\\ 2y - z &= 1 \\\\ 3z &= 9 \\end{aligned}'),
              prose(
                'So $z = 3$. Then $2y - 3 = 1$ gives $y = 2$, and the top line gives $x = 1$. This is **back substitution**, and elimination on a full system is a way of reaching this shape.',
              ),
            ),
            ask('mat-sys-back-sub'),
            ask('mat-sys-back-sub-tree'),
          ],
          skillCheck: [ask('mat-sys-cramer', 2), ask('mat-sys-inverse', 2), ask('mat-sys-back-sub-tree', 2)],
        },
        {
          id: 'vm-l9-param',
          title: 'Systems with a Parameter',
          slides: [
            teach(
              prose(
                'A system can carry a letter, often $k$, in one of its coefficients. Whether it has a unique solution then depends on $k$, and the determinant says which values are the problem.',
              ),
              maths('\\mathbf{A} = \\begin{pmatrix} k & 2 & 1 \\\\ 1 & 1 & 0 \\\\ 2 & 0 & 1 \\end{pmatrix}'),
              prose(
                'Expand as usual, keeping $k$ as a letter: $\\det \\mathbf{A} = k(1) - 2(1) + 1(-2) = k - 4$. That is zero at $k = 4$, so every other value of $k$ gives exactly one solution.',
              ),
            ),
            ask('mat-sys-param-det'),
            ask('mat-sys-param-which'),
            ask('mat-sys-param-k'),
            teach(
              prose(
                'At the bad value the system has no solutions or infinitely many, and, as before, the right-hand sides decide.',
              ),
              maths('\\begin{aligned} kx + 4y &= 6 \\\\ x + 2y &= q \\end{aligned}'),
              prose(
                'Here $\\det = 2k - 4$, zero at $k = 2$. Then the first equation\'s left-hand side is twice the second\'s, so it needs $6 = 2q$: $q = 3$ gives infinitely many solutions, and any other $q$ gives none.',
              ),
            ),
            ask('mat-sys-param-outcome'),
            ask('mat-sys-param-k+choice', 2),
            ask('mat-sys-param-det', 2),
            teach(
              prose('When $k$ appears twice the determinant can be a quadratic, with two bad values.'),
              maths('\\det \\begin{pmatrix} k & 2 \\\\ 3 & k - 1 \\end{pmatrix} = k^2 - k - 6'),
              maths('= (k - 3)(k + 2)'),
              prose(
                'Both $k = 3$ and $k = -2$ make it zero, so a unique solution needs $k \\neq 3$ and $k \\neq -2$. Leaving one of them out is the usual slip.',
              ),
            ),
            ask('mat-sys-param-which', 2),
            ask('mat-sys-param-outcome', 2),
          ],
          skillCheck: [
            ask('mat-sys-param-k', 2),
            ask('mat-sys-param-which', 2),
            ask('mat-sys-param-outcome', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mat-sys-read', 2),
        ask('mat-sys-det', 2),
        ask('mat-sys-lines', 2),
        ask('mat-sys-cramer-swap', 2),
        ask('mat-sys-param-k', 2),
        ask('mat-sys-vector', 2),
        ask('mat-sys-det-zero', 2),
        ask('mat-sys-consistent', 2),
        ask('mat-sys-inverse', 2),
        ask('mat-sys-param-which', 2),
        ask('mat-sys-rhs', 2),
        ask('mat-sys-det-rule', 2),
        ask('mat-sys-line-form', 2),
        ask('mat-sys-back-sub', 2),
        ask('mat-sys-param-outcome', 2),
      ],
    },
    {
      id: 'vm-l11',
      title: 'Invariant Lines & Points',
      lessons: [
        {
          id: 'vm-l11-points',
          title: 'Invariant Points',
          slides: [
            teach(
              prose(
                'A point is **invariant** under a transformation when it does not move: $\\mathbf{M}\\mathbf{p} = \\mathbf{p}$. To test a point, multiply it by the matrix and see whether it comes back unchanged.',
              ),
              maths('\\begin{pmatrix} 3 & -1 \\\\ 2 & 0 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}'),
              prose(
                'So $(1, 2)$ is invariant. The origin always is, whatever the matrix, because $\\mathbf{M}\\mathbf{0} = \\mathbf{0}$. The interesting question is whether anything else is.',
              ),
              prose(
                'One row is enough to find a missing coordinate. If $(3, y)$ is invariant, the top row says $3(3) - y = 3$, so $y = 6$.',
              ),
            ),
            ask('mat-inv-point-which'),
            ask('mat-inv-point-slider'),
            ask('mat-inv-point-which', 2),
            teach(
              prose(
                '$\\mathbf{M}\\mathbf{p} = \\mathbf{p}$ rearranges to $(\\mathbf{M} - \\mathbf{I})\\mathbf{p} = \\mathbf{0}$. Take 1 off each entry on the leading diagonal and look at the determinant.',
              ),
              maths('\\mathbf{M} - \\mathbf{I} = \\begin{pmatrix} 2 & -1 \\\\ 2 & -1 \\end{pmatrix}'),
              prose(
                'If $\\det(\\mathbf{M} - \\mathbf{I}) \\neq 0$ it has an inverse, and the only solution is $\\mathbf{p} = \\mathbf{0}$: the origin alone. If it is $0$, as here, a whole line of points through $O$ is invariant.',
              ),
            ),
            ask('mat-inv-point-det'),
            ask('mat-inv-point-det-tree'),
            ask('mat-inv-point-flow'),
            teach(
              prose(
                'When that determinant is zero, either row of $\\mathbf{M} - \\mathbf{I}$ gives the line. Here the top row says $2x - y = 0$:',
              ),
              maths('y = 2x'),
              prose(
                'Every point on $y = 2x$ stays put under $\\mathbf{M}$, and no point off it does. Only the identity matrix fixes every point in the plane.',
              ),
            ),
            ask('mat-inv-point-line'),
            ask('mat-inv-point-flow', 2),
          ],
          skillCheck: [ask('mat-inv-point-which', 2), ask('mat-inv-point-det', 2), ask('mat-inv-point-line', 2)],
        },
        {
          id: 'vm-l11-lines',
          title: 'Invariant Lines Through the Origin',
          slides: [
            teach(
              prose(
                'A line is **invariant** when every point on it is mapped to a point on the same line. The points may move, but only along the line.',
              ),
              prose(
                'For a line through the origin, $y = mx$, one point decides it. $(1, m)$ is on the line, and the line is invariant exactly when $\\mathbf{M}$ sends $(1, m)$ to a multiple of itself.',
              ),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 4 \\\\ 4 \\end{pmatrix}'),
              prose('That is $4(1, 1)$, so $y = x$ is invariant, and every point on it is sent 4 times as far from $O$.'),
            ),
            ask('mat-inv-line-which'),
            ask('mat-inv-line-stretch'),
            ask('mat-inv-line-which', 2),
            teach(
              prose(
                'To find the invariant lines rather than test them, keep $m$ as a letter. The same matrix sends $(1, m)$ to $(3 + m, \\; 2 + 2m)$, a multiple of $(1, m)$ when the second entry is $m$ times the first:',
              ),
              maths('2 + 2m = m(3 + m)'),
              maths('\\begin{gathered} 2 + 2m = 3m + m^2 \\\\ m^2 + m - 2 = 0 \\end{gathered}'),
              prose(
                'Factorise to read off the gradients: two numbers that multiply to $-2$ and add to $1$ are $-1$ and $2$.',
              ),
              maths('(m - 1)(m + 2) = 0'),
              prose('So $m = 1$ or $m = -2$: the invariant lines through $O$ are $y = x$ and $y = -2x$.'),
            ),
            ask('mat-inv-line-quad'),
            ask('mat-inv-line-gradients'),
            ask('mat-inv-line-quad+choice', 2),
            teach(
              prose(
                'Two solutions give two invariant lines, and one gives one. A quadratic with no real solutions means no line through $O$ survives, which is what happens under a quarter turn:',
              ),
              maths('\\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ m \\end{pmatrix} = \\begin{pmatrix} -m \\\\ 1 \\end{pmatrix}'),
              prose(
                'For that to be a multiple of $(1, m)$, the second entry must be $m$ times the first: $1 = -m^{2}$, so $m^{2} = -1$, which no real $m$ satisfies.',
              ),
            ),
            ask('mat-inv-line-stretch', 2),
            ask('mat-inv-line-gradients', 2),
          ],
          skillCheck: [ask('mat-inv-line-which', 2), ask('mat-inv-line-quad', 2), ask('mat-inv-line-gradients', 2)],
        },
        {
          id: 'vm-l11-standard',
          title: 'The Standard Transformations',
          slides: [
            teach(
              prose(
                'The standard transformations have invariant lines you can see without any algebra. A reflection leaves its mirror line alone, and flips the perpendicular line through $O$ end to end onto itself.',
              ),
              figure(
                transformGridSvg({
                  span: 4,
                  mirror: 'y=x',
                  arrows: [
                    { x: 2, y: -2, label: 'p' },
                    { x: -2, y: 2, label: 'p′', accent: true },
                  ],
                  maxWidth: 200,
                  label: 'The mirror line y = x dashed, with an arrow along y = −x and its reflection pointing the other way along the same line',
                }),
              ),
              prose(
                'A rotation about $O$ turns every line, so it has none, except a half turn: it sends $(x, y)$ to $(-x, -y)$, which keeps every line through $O$.',
              ),
              prose('An enlargement about $O$ pushes every point straight out along its own line, so every line through $O$ is invariant.'),
              prose(
                'A stretch parallel to the $x$-axis stretches the $x$-axis along itself and leaves the $y$-axis where it is, so those two are invariant. A stretch parallel to the $y$-axis keeps the same two. Every other line through $O$ changes gradient, and one point shows where it goes:',
              ),
              maths('\\begin{pmatrix} 3 & 0 \\\\ 0 & 1 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} = \\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}'),
              prose(
                'So $y = 2x$ goes to the line through $O$ and $(3, 2)$, whose gradient is $2 \\div 3$: $y = \\tfrac{2}{3}x$, a different line.',
              ),
            ),
            ask('mat-inv-std-lines'),
            ask('mat-inv-std-image'),
            teach(
              prose(
                'For a matrix given only as numbers, where the zeros sit gives a shortcut. Zeros off the leading diagonal mean a scaling along the axes:',
              ),
              maths('\\begin{pmatrix} 2 & 0 \\\\ 0 & 2 \\end{pmatrix}: \\text{ every line through } O'),
              maths('\\begin{pmatrix} 3 & 0 \\\\ 0 & -2 \\end{pmatrix}: \\text{ just the two axes}'),
              prose(
                'Zeros on the leading diagonal mean the axes are swapped. Equal entries off it keep $y = x$ and $y = -x$: $\\begin{pmatrix} 0 & 3 \\\\ 3 & 0 \\end{pmatrix}$ sends $(1, 1)$ to $(3, 3)$ and $(1, -1)$ to $(-3, 3)$. Equal and opposite entries, as in $\\begin{pmatrix} 0 & -2 \\\\ 2 & 0 \\end{pmatrix}$, are a quarter turn with a scaling, and keep no line.',
              ),
              prose(
                'Anything else has no shortcut: send $(1, m)$ through the matrix and solve the quadratic in $m$. For $\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix}$, $(1, m)$ goes to $(3 + m, \\; 2 + 2m)$, and $2 + 2m = m(3 + m)$ gives $m^2 + m - 2 = 0$: the lines $y = x$ and $y = -2x$.',
              ),
            ),
            ask('mat-inv-std-flow'),
            ask('mat-inv-std-lines', 2),
            ask('mat-inv-std-flow', 2),
            ask('mat-inv-std-image+choice', 2),
            teach(
              prose(
                'Invariant **points** are a stricter test: the point itself must not move. For a reflection they are the points of the mirror. The perpendicular line is invariant, but its points swap sides.',
              ),
              prose(
                'A stretch parallel to the $x$-axis fixes every point of the $y$-axis, where $x = 0$ and there is nothing to stretch. Rotations and enlargements fix only the centre, $O$.',
              ),
            ),
            ask('mat-inv-std-points'),
            ask('mat-inv-std-points', 2),
          ],
          skillCheck: [ask('mat-inv-std-lines', 2), ask('mat-inv-std-points', 2), ask('mat-inv-std-image', 2)],
        },
        {
          id: 'vm-l11-offset',
          title: 'Lines Not Through the Origin',
          slides: [
            teach(
              prose(
                'A line that misses the origin, $y = mx + c$ with $c \\neq 0$, can be invariant too. Take a general point on it and multiply by $\\mathbf{M}$. For $y = x + c$:',
              ),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix} \\begin{pmatrix} x \\\\ x + c \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 4x + c \\\\ 4x + 2c \\end{pmatrix}'),
              prose(
                "The image has to satisfy $y' = x' + c$ for every $x$. Compare the $x$ terms, which test the gradient, then the constant terms: here $2c = c + c$, true whatever $c$ is, so every line $y = x + c$ is invariant.",
              ),
              prose(
                'In general the constant terms give $c$ times a bracket equal to $0$: the bottom-right entry, minus the top-right entry times the gradient, minus $1$. Here that is $2 - 1 \\times 1 - 1 = 0$, which is why every $c$ worked.',
              ),
              prose('The other invariant direction, gradient $-2$, gives a bracket that is not zero. For $y = -2x + c$:'),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix} \\begin{pmatrix} x \\\\ -2x + c \\end{pmatrix}'),
              maths('= \\begin{pmatrix} x + c \\\\ -2x + 2c \\end{pmatrix}'),
              prose(
                'The image must satisfy $y\' = -2x\' + c = -2x - 2c + c = -2x - c$. The $x$ terms agree; the constants need $2c = -c$, so $3c = 0$: the bracket $2 - 1 \\times (-2) - 1 = 3$ is not zero, and only $c = 0$ works. Of these lines only $y = -2x$ is invariant.',
              ),
            ),
            ask('mat-inv-offset-coeffs'),
            ask('mat-inv-offset-flow'),
            ask('mat-inv-offset-coeffs', 2),
            teach(
              prose(
                'A quicker route to the image of such a line. A line parallel to an invariant line $y = mx$ maps to another line of gradient $m$, so only its intercept is unknown, and one point finds it.',
              ),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix} \\begin{pmatrix} 0 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} 3 \\\\ 6 \\end{pmatrix}'),
              prose(
                'So $y = -2x + 3$ goes to the line of gradient $-2$ through $(3, 6)$, which is $y = -2x + 12$. It moved: of the lines with gradient $-2$, only $y = -2x$ is invariant.',
              ),
            ),
            ask('mat-inv-offset-image'),
            ask('mat-inv-offset-flow', 2),
            ask('mat-inv-offset-image+choice', 2),
            teach(
              prose(
                'Some transformations keep a whole family of parallel lines. A shear with the $x$-axis fixed slides each point sideways, so every line $y = c$ maps onto itself.',
              ),
              maths('\\begin{pmatrix} 1 & 2 \\\\ 0 & 1 \\end{pmatrix} \\begin{pmatrix} x \\\\ c \\end{pmatrix} = \\begin{pmatrix} x + 2c \\\\ c \\end{pmatrix}'),
              prose(
                'A stretch parallel to the $x$-axis keeps the lines $y = c$ as well, and a reflection in the $x$-axis keeps every line $x = c$, flipped end to end. A reflection in $y = x$ keeps every line $y = -x + c$, since it swaps $(x, \\; -x + c)$ to $(-x + c, \\; x)$, which is on the same line; in the same way a reflection in $y = -x$ keeps every $y = x + c$.',
              ),
              prose(
                'Swap the roles of the axes and the same holds: a shear with the $y$-axis fixed, such as $\\begin{pmatrix} 1 & 0 \\\\ 2 & 1 \\end{pmatrix}$, sends $(c, y)$ to $(c, \\; 2c + y)$, so it keeps every line $x = c$, and so does a stretch parallel to the $y$-axis.',
              ),
              prose(
                'An enlargement or a half turn keeps a different family: every line through $O$. With factor $3$, the point $(1, m)$ goes to $(3, 3m) = 3(1, m)$ whatever $m$ is. But the line $y = 2$ goes to $y = 6$, since $(x, 2)$ goes to $(3x, 6)$, so the lines $y = c$ are not kept.',
              ),
            ),
            ask('mat-inv-offset-family'),
            ask('mat-inv-offset-family', 2),
          ],
          skillCheck: [ask('mat-inv-offset-coeffs', 2), ask('mat-inv-offset-image', 2), ask('mat-inv-offset-family', 2)],
        },
        {
          id: 'vm-l11-sort',
          title: 'Invariant Line or Line of Invariant Points?',
          slides: [
            teach(
              prose(
                'Two phrases that sound alike. A **line of invariant points** is a line whose every point stays exactly where it is. An **invariant line** only has to map onto itself: its points may slide along it.',
              ),
              prose(
                'For a line through $O$, the multiple says which. If $\\mathbf{M}$ sends $(1, m)$ to $k(1, m)$ the line is invariant, and it is a line of invariant points exactly when $k = 1$.',
              ),
              maths('\\begin{pmatrix} 3 & 1 \\\\ 2 & 2 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ -2 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ -2 \\end{pmatrix}'),
              prose('So $y = -2x$ is a line of invariant points of this matrix, while $y = x$, where $k = 4$, is an invariant line whose points move.'),
            ),
            ask('mat-inv-sort-which'),
            ask('mat-inv-line-stretch', 2),
            ask('mat-inv-sort-flow'),
            teach(
              prose(
                'A shear shows the difference well. With the $x$-axis fixed, points on the axis do not move: a line of invariant points. Every other point slides parallel to the axis, further the further it is from it.',
              ),
              figure(
                transformGridSvg({
                  span: 3,
                  image: [1, 1, 0, 1],
                  square: true,
                  mirror: 'x-axis',
                  maxWidth: 200,
                  label: 'The unit square sheared into a parallelogram, with the fixed x-axis dashed',
                }),
              ),
              prose('So each line $y = c$ is an invariant line, but only $y = 0$ is a line of invariant points.'),
            ),
            ask('mat-inv-shear-slider'),
            ask('mat-inv-sort-which', 2),
            ask('mat-inv-shear-slider', 2),
            teach(
              prose(
                'Reflections have both kinds. The mirror is a line of invariant points. Any line perpendicular to the mirror is an invariant line, flipped end to end, so its points swap sides.',
              ),
              prose('Every line of invariant points is an invariant line, but not the other way round.'),
              prose(
                'To find a line of invariant points straight from the matrix, solve $\\mathbf{M}\\mathbf{p} = \\mathbf{p}$: take $1$ off each entry on the leading diagonal, and use either row.',
              ),
              maths('\\begin{gathered} \\mathbf{M} - \\mathbf{I} = \\begin{pmatrix} 3 - 1 & 1 \\\\ 2 & 2 - 1 \\end{pmatrix} \\\\ = \\begin{pmatrix} 2 & 1 \\\\ 2 & 1 \\end{pmatrix} \\end{gathered}'),
              prose(
                'The top row says $2x + y = 0$, so $y = -2x$: the line of invariant points found at the start of this lesson.',
              ),
            ),
            ask('mat-inv-sort-flow', 2),
            ask('mat-inv-point-line', 2),
          ],
          skillCheck: [ask('mat-inv-sort-which', 2), ask('mat-inv-shear-slider', 2), ask('mat-inv-sort-flow', 2)],
        },
      ],
      levelCheck: [
        ask('mat-inv-point-which', 2),
        ask('mat-inv-line-quad', 2),
        ask('mat-inv-std-lines', 2),
        ask('mat-inv-shear-slider', 2),
        ask('mat-inv-point-det', 2),
        ask('mat-inv-offset-family', 2),
        ask('mat-inv-line-gradients', 2),
        ask('mat-inv-sort-flow', 2),
        ask('mat-inv-std-points', 2),
        ask('mat-inv-offset-image', 2),
        ask('mat-inv-line-stretch', 2),
        ask('mat-inv-point-flow', 2),
        ask('mat-inv-line-which', 2),
        ask('mat-inv-std-image', 2),
        ask('mat-inv-sort-which', 2),
      ],
    },
  ],
};
