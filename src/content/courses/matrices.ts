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
 * which took `vm-l8` for Vectors.
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

export const matrices: Course = {
  id: 'matrices',
  title: 'Matrices & Linear Transformations',
  blurb: 'Matrix arithmetic, the determinant and the inverse, matrices as transformations of the plane, and systems of equations.',
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
            ask('mat-multiply'),
            teach(
              prose(
                'The determinant has a meaning: it is the factor by which the matrix scales area.',
              ),
              prose(
                'A determinant of 2 doubles every area in the plane. A determinant of 1 preserves area, which is why rotations and reflections all have determinant $\\pm 1$.',
              ),
              maths('\\det \\begin{pmatrix} 0 & -1 \\\\ 1 & 0 \\end{pmatrix} = 1'),
              prose(
                'A negative determinant means the transformation turns the plane over as well as scaling it — a reflection is in there somewhere.',
              ),
              prose(
                'The area reading also settles what scaling the whole matrix does. Multiplying a two-by-two matrix by $k$ stretches both directions by $k$, so area is scaled twice.',
              ),
              maths('\\det\\left(k\\mathbf{A}\\right) = k^{2}\\det\\mathbf{A}'),
              prose(
                'Multiplying the determinant by $k$ once is the mistake to avoid: the power is the size of the matrix, not something to be guessed at.',
              ),
            ),
            ask('mat-det-property'),
            ask('mat-vector'),
            ask('mat-multiply+choice'),
            teach(
              prose('Determinants interact with products in a way that is worth knowing.'),
              maths('\\det\\left(\\mathbf{AB}\\right) = \\det\\mathbf{A} \\times \\det\\mathbf{B}'),
              prose(
                'Which makes sense from the area reading: doing one transformation and then another scales area by both factors in turn.',
              ),
              prose(
                'Note that there is no such rule for sums. $\\det\\left(\\mathbf{A} + \\mathbf{B}\\right)$ has nothing to do with the two separate determinants, and assuming otherwise is a common and costly mistake.',
              ),
              prose(
                'Transposing — reflecting the matrix in its leading diagonal — leaves the determinant alone, since the leading diagonal is untouched and the other two entries only swap places.',
              ),
              maths('\\det\\left(\\mathbf{A}^{T}\\right) = \\det\\mathbf{A}'),
            ),
            ask('mat-det-property'),
            ask('mat-vector+choice'),
          ],
          skillCheck: [
            ask('mat-determinant', 2),
            ask('mat-det-property', 2),
            ask('mat-multiply', 2),
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
            ),
            ask('mat-singular-k'),
            ask('mat-determinant'),
            ask('mat-det-property'),
            teach(
              prose(
                'So "find the value that makes this matrix singular" is the instruction to set the determinant to zero and solve.',
              ),
              maths('\\det \\begin{pmatrix} k & 6 \\\\ 2 & 3 \\end{pmatrix} = 3k - 12 = 0 \\implies k = 4'),
              prose(
                'Every other value of $k$ gives an invertible matrix. The singular case is a single value, not a range.',
              ),
              prose(
                'Notice what a singular two-by-two matrix looks like: one row is a multiple of the other. That is the same statement as the determinant being zero, and it is often quicker to spot.',
              ),
            ),
            ask('mat-singular-k+choice'),
            ask('mat-determinant-steps'),
            ask('mat-det-property'),
            teach(
              prose(
                'The same idea decides whether a pair of simultaneous equations has a unique solution.',
              ),
              prose(
                'A non-zero determinant means one solution. A zero determinant means the two equations describe either the same line — infinitely many solutions — or two parallel lines, and then none at all.',
              ),
              maths('\\det = 0 \\implies \\text{no unique solution}'),
              prose(
                'Checking the determinant first is therefore worth doing before attempting to solve anything: it tells you whether there is an answer to find.',
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
            ),
            ask('mat-inverse'),
            ask('mat-determinant'),
            ask('mat-inverse+choice'),
            teach(
              prose('Worked through on a real matrix:'),
              maths(
                '\\begin{pmatrix} 3 & 1 \\\\ 2 & 4 \\end{pmatrix}^{-1} = \\frac{1}{10}\\begin{pmatrix} 4 & -1 \\\\ -2 & 3 \\end{pmatrix}',
              ),
              prose(
                'The determinant is $12 - 2 = 10$, so the fraction out front is $\\frac{1}{10}$. Leaving it as a fraction in front is tidier than dividing all four entries.',
              ),
              prose(
                'Check by multiplying the two together: the product should be the identity. That check is worth doing the first few times, because it catches every version of the misremembered recipe.',
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
                'Inverses reverse the order in a product, which follows from undoing things in the opposite order to doing them.',
              ),
              maths('\\left(\\mathbf{AB}\\right)^{-1} = \\mathbf{B}^{-1}\\mathbf{A}^{-1}'),
              prose(
                'Putting a coat on over a jumper and then taking them off is the same idea: the last thing on is the first thing off.',
              ),
              prose(
                'The determinant of an inverse follows from the same undoing. If a matrix scales area by a factor, its inverse has to scale it back.',
              ),
              maths('\\det\\left(\\mathbf{A}^{-1}\\right) = \\frac{1}{\\det\\mathbf{A}}'),
              prose(
                'Which says again why a singular matrix has no inverse: a determinant of zero would need a reciprocal, and there is not one.',
              ),
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
            ),
            ask('mat-vector'),
            ask('mat-solve'),
            ask('mat-inverse+choice'),
            teach(
              prose('So the method is: find the determinant, write the inverse, multiply.'),
              maths('\\det = \\left(2\\right)\\left(-2\\right) - \\left(3\\right)\\left(1\\right) = -7'),
              maths(
                '\\mathbf{v} = \\frac{1}{-7}\\begin{pmatrix} -2 & -3 \\\\ -1 & 2 \\end{pmatrix} \\begin{pmatrix} 8 \\\\ -3 \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}',
              ),
              prose(
                'The inverse goes on the *left* of the vector, because matrix multiplication is not commutative and the other order is not even a valid product here.',
              ),
              prose(
                'Substitute back into the original equations to check. It takes one line and catches any arithmetic slip in the inverse.',
              ),
            ),
            ask('mat-solve+choice'),
            ask('mat-inverse'),
            ask('mat-vector+choice'),
            teach(
              prose(
                'The method needs a non-zero determinant, and what happens otherwise is exactly what the singular case predicted.',
              ),
              prose(
                'A zero determinant means the two equations describe the same line or two parallel lines, so there is either no single solution or none at all — and no inverse to find it with.',
              ),
              prose(
                'For two equations this is slower than elimination by hand. Its value is that it scales: the same method solves ten equations in ten unknowns, where elimination becomes unmanageable and a computer needs a procedure rather than ingenuity.',
              ),
              maths('\\mathbf{v} = \\mathbf{M}^{-1}\\mathbf{u}'),
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
              prose('So a turn of $60^\\circ$ anticlockwise is'),
              maths('\\begin{pmatrix} \\frac{1}{2} & -\\frac{\\sqrt{3}}{2} \\\\ \\frac{\\sqrt{3}}{2} & \\frac{1}{2} \\end{pmatrix}'),
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
            ask('mat-standard-locate', 2),
            ask('mat-scale+choice'),
            teach(
              prose(
                'Naming a transformation from its matrix runs the other way: read the columns, picture the two arrows, and say what happened to them.',
              ),
              prose(
                'If both arrows keep length $1$, it is a rotation or a reflection. If they only grow or shrink along the axes, it is an enlargement or a stretch.',
              ),
              maths('\\begin{pmatrix} 1 & 0 \\\\ 0 & 4 \\end{pmatrix}: \\quad \\mathbf{i} \\to \\mathbf{i}, \\; \\mathbf{j} \\to 4\\mathbf{j}'),
              prose(
                'So that is a stretch parallel to the $y$-axis, factor $4$. It is the easy one to get backwards: a stretch parallel to the $y$-axis moves points up and down, so it is the bottom-right entry that changes.',
              ),
            ),
            ask('mat-describe'),
            ask('mat-name'),
            ask('mat-standard-locate', 2),
            teach(
              prose(
                'The zeros say most of it before any picturing. Zeros off the leading diagonal mean each axis is only scaled; zeros on it mean the axes have been swapped over.',
              ),
              prose(
                'Scaled with equal entries is an enlargement, with unequal ones a stretch, and with a $1$ and a $-1$ a reflection in an axis. Swapped with matching signs is a mirror in $y = x$ or $y = -x$; with opposite signs, a quarter turn.',
              ),
              prose(
                'Entries both on and off the diagonal fit none of these. A **shear** such as $\\begin{pmatrix} 1 & 2 \\\\ 0 & 1 \\end{pmatrix}$ is the commonest: it slides every point sideways by an amount that grows with its height.',
              ),
            ),
            ask('mat-name'),
            ask('mat-describe'),
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
            ask('mat-area-k'),
            teach(
              prose(
                'Knowing the area scale factor pins down an unknown entry. The determinant is a linear expression in any one entry, so setting it equal to the scale factor gives a linear equation.',
              ),
              maths('\\det\\begin{pmatrix} k & 2 \\\\ 3 & 4 \\end{pmatrix} = 4k - 6'),
              maths('4k - 6 = 10 \\implies k = 4'),
              prose(
                'Settle the orientation first. If the shape is turned over, the determinant is the negative of the scale factor, and solving with the wrong sign gives a matrix that scales the area correctly but flips the shape when it should not.',
              ),
              prose(
                'A determinant of $0$ is the extreme case: every area becomes $0$, the plane is flattened onto a line, and there is no inverse. Those are the singular matrices of the last level, seen as pictures.',
              ),
            ),
            ask('mat-area-k'),
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
            ),
            ask('mat-reflect-pair'),
            ask('mat-compose-standard', 2),
            ask('mat-compose-locate', 2),
            teach(
              prose(
                'The rule works for any two mirrors through the origin, not only the four with standard matrices. Mirrors at $30^\\circ$ and $60^\\circ$ to the $x$-axis are $30^\\circ$ apart, so reflecting in the first and then the second turns through $60^\\circ$ anticlockwise.',
              ),
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
            ),
            ask('mat-compose-orientation'),
            ask('mat-det-missing'),
            ask('mat-compose-area+choice', 2),
            teach(
              prose(
                'The rule runs backwards too. If $\\det\\mathbf{A} = 3$ and $\\det\\left(\\mathbf{AB}\\right) = -12$, then $\\det\\mathbf{B} = -12 \\div 3 = -4$, and $\\mathbf{B}$ is the one that turns shapes over.',
              ),
              prose(
                'It also says why a product with a singular matrix in it is singular: one factor of $0$ makes the whole product $0$, and the plane is flattened whatever else happens.',
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
            ask('mat-sys-vector'),
            teach(
              prose(
                'A $3 \\times 3$ matrix times a column works as a 2 by 2 did, with one more pair in each row. Each row, multiplied across the column and added, gives one entry of the answer.',
              ),
              maths('\\begin{pmatrix} 2 & 1 & -1 \\\\ 1 & -3 & 0 \\\\ 0 & 4 & 5 \\end{pmatrix} \\begin{pmatrix} 1 \\\\ 2 \\\\ 1 \\end{pmatrix}'),
              maths('= \\begin{pmatrix} 3 \\\\ -5 \\\\ 13 \\end{pmatrix}'),
              prose(
                'The top entry is $2(1) + 1(2) + (-1)(1) = 3$, the left-hand side of the first equation at $x = 1$, $y = 2$, $z = 1$. Multiplying by $\\mathbf{A}$ substitutes into all three equations at once.',
              ),
            ),
            ask('mat-sys-rhs'),
            ask('mat-sys-vector+choice'),
            ask('mat-sys-read', 2),
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
              prose('And a matrix and its transpose have the same determinant.'),
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
              figure(
                plotSvg({
                  xMin: -4,
                  xMax: 4,
                  yMin: -3.5,
                  yMax: 3.5,
                  curves: [{ f: (x) => x / 2 + 1 }, { f: (x) => x / 2 - 1, accent: true }],
                  height: 140,
                  label: 'Two parallel lines with the same gradient, which never meet',
                }),
              ),
              prose(
                'A zero determinant means the left-hand sides are multiples of each other, so the lines have the same gradient: parallel, or the same line. The right-hand sides decide which.',
              ),
              maths('\\begin{aligned} x + 2y &= 3 \\\\ 2x + 4y &= 6 \\end{aligned}'),
              prose(
                'The second equation is exactly twice the first, right-hand side included: one line, and **infinitely many** solutions. With $2x + 4y = 7$ instead they would contradict each other, and there would be **none**.',
              ),
            ),
            ask('mat-sys-lines'),
            ask('mat-sys-count'),
            ask('mat-sys-consistent'),
            teach(
              prose(
                'Infinitely many solutions does not mean anything goes. The solutions are exactly the points on that one line, and writing it as $y = mx + c$ describes them all at once.',
              ),
              maths('\\begin{aligned} 3x - y &= 2 \\\\ 6x - 2y &= 4 \\end{aligned}'),
              maths('y = 3x - 2'),
              prose('Each choice of $x$ gives one solution: $x = 1$ and $y = 1$, or $x = 2$ and $y = 4$, and so on for ever.'),
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
                'A $3 \\times 3$ inverse is long to find by hand, so here it is given. It often comes as a fraction times a whole-number matrix: multiply by the matrix first, and divide at the end.',
              ),
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
  ],
};
