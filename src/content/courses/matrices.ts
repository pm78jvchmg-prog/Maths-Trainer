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
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
 */
import type { Course, SlideRef } from '../types';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
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

export const matrices: Course = {
  id: 'matrices',
  title: 'Matrices & Linear Transformations',
  blurb: 'Matrix arithmetic, the determinant, and the inverse.',
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
            ask('mat-add'),
            ask('mat-add'),
            ask('mat-add+choice'),
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
            ask('mat-add'),
            ask('mat-add'),
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
            ),
            ask('mat-add+choice'),
            ask('mat-add'),
          ],
          skillCheck: [ask('mat-add', 2), ask('mat-add', 2), ask('mat-add', 2)],
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
            ask('mat-combine'),
            ask('mat-combine+choice'),
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
            ask('mat-combine'),
            ask('mat-combine'),
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
            ask('mat-combine+choice'),
            ask('mat-add'),
          ],
          skillCheck: [ask('mat-combine', 2), ask('mat-combine', 2), ask('mat-combine', 2)],
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
            ),
            ask('mat-multiply'),
            ask('mat-multiply'),
            ask('mat-multiply+choice'),
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
            ask('vec-dot-steps'),
            ask('mat-multiply'),
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
            ask('vec-dot-steps+choice'),
            ask('mat-multiply'),
          ],
          skillCheck: [ask('mat-multiply', 2), ask('mat-multiply', 2), ask('mat-multiply', 2)],
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
            ask('mat-vector'),
            ask('mat-vector+choice'),
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
            ask('vec-dot-steps'),
            ask('mat-vector'),
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
            ask('mat-vector+choice'),
            ask('vec-dot-steps+choice'),
          ],
          skillCheck: [ask('mat-vector', 2), ask('mat-vector', 2), ask('mat-vector+choice', 2)],
        },
      ],
      levelCheck: [
        ask('mat-add', 2),
        ask('mat-combine', 2),
        ask('mat-multiply', 2),
        ask('mat-vector', 2),
        ask('mat-add', 2),
        ask('mat-combine', 2),
        ask('mat-multiply', 2),
        ask('mat-vector', 2),
        ask('mat-combine', 2),
        ask('mat-multiply', 2),
        ask('mat-vector', 2),
        ask('mat-add', 2),
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
            ask('mat-determinant'),
            ask('mat-determinant+choice'),
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
            ),
            ask('mat-determinant'),
            ask('mat-determinant-steps'),
            teach(
              prose('Determinants interact with products in a way that is worth knowing.'),
              maths('\\det\\left(\\mathbf{AB}\\right) = \\det\\mathbf{A} \\times \\det\\mathbf{B}'),
              prose(
                'Which makes sense from the area reading: doing one transformation and then another scales area by both factors in turn.',
              ),
              prose(
                'Note that there is no such rule for sums. $\\det\\left(\\mathbf{A} + \\mathbf{B}\\right)$ has nothing to do with the two separate determinants, and assuming otherwise is a common and costly mistake.',
              ),
            ),
            ask('mat-determinant-steps+choice'),
            ask('mat-determinant'),
          ],
          skillCheck: [
            ask('mat-determinant', 2),
            ask('mat-determinant', 2),
            ask('mat-determinant', 2),
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
            ask('mat-singular-k'),
            ask('mat-singular-k+choice'),
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
            ask('mat-singular-k'),
            ask('mat-determinant-steps'),
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
            ask('mat-singular-k+choice'),
            ask('mat-singular-k'),
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
            ask('mat-inverse'),
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
            ask('mat-inverse'),
            ask('mat-determinant-steps'),
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
            ),
            ask('mat-determinant-steps+choice'),
            ask('mat-inverse'),
          ],
          skillCheck: [ask('mat-inverse', 2), ask('mat-inverse', 2), ask('mat-inverse', 2)],
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
            ask('mat-solve'),
            ask('mat-solve'),
            ask('mat-solve+choice'),
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
            ask('mat-solve'),
            ask('mat-determinant-steps'),
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
            ask('mat-solve+choice'),
            ask('mat-determinant-steps+choice'),
          ],
          skillCheck: [ask('mat-solve', 2), ask('mat-solve', 2), ask('mat-solve+choice', 2)],
        },
      ],
      levelCheck: [
        ask('mat-determinant', 2),
        ask('mat-singular-k', 2),
        ask('mat-inverse', 2),
        ask('mat-solve', 2),
        ask('mat-determinant', 2),
        ask('mat-singular-k', 2),
        ask('mat-inverse', 2),
        ask('mat-solve', 2),
        ask('mat-determinant', 2),
        ask('mat-inverse', 2),
        ask('mat-solve', 2),
        ask('mat-singular-k', 2),
      ],
    },
  ],
};
