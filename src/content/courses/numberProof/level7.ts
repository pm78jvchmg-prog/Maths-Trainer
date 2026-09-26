import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

/**
 * Number & Proof, level 7: Number Bases. Generators in
 * `generators/numberBases.ts`.
 */
export const npL7: Level = {
  id: 'np-l7',
  title: 'Number Bases',
  lessons: [
    {
      id: 'np-l7-binary',
      title: 'Reading Binary',
      slides: [
        teach(
          prose(
            'In denary, our usual base ten, the place values are $1, 10, 100, \\dots$: each is ten times the one to its right. In **binary**, base two, each place value is **twice** the one to its right, and the only digits are $0$ and $1$.',
          ),
          maths('\\begin{array}{cccc} 8 & 4 & 2 & 1 \\\\ \\hline 1 & 0 & 1 & 1 \\end{array}'),
          prose(
            'A small $2$ after a number, as in $1011_2$, says it is written in binary. Add the place values with a $1$ under them:',
          ),
          maths('\\begin{aligned} 1011_2 &= 8 + 2 + 1 \\\\ &= 11 \\end{aligned}'),
        ),
        ask('base-bin-worth'),
        ask('base-bin-table'),
        ask('base-bin-to-den'),
        teach(
          prose(
            'Longer numbers work the same way. Carry on doubling the place values leftwards: $1, 2, 4, 8, 16, 32, 64, 128$.',
          ),
          maths('\\begin{array}{cccccc} 32 & 16 & 8 & 4 & 2 & 1 \\\\ \\hline 1 & 1 & 0 & 1 & 0 & 1 \\end{array}'),
          maths('\\begin{aligned} 110101_2 &= 32 + 16 + 4 + 1 \\\\ &= 53 \\end{aligned}'),
          prose('A $0$ adds nothing, but it still holds its place: $110101_2$ and $11101_2$ are different numbers.'),
        ),
        ask('base-bin-worth+choice', 2),
        ask('base-bin-which'),
        ask('base-bin-table', 2),
        teach(
          prose(
            'A second way reads from the **left**. Start with the first digit. For each digit after it, double the running total and add the digit. For $1011_2$:',
          ),
          maths('\\begin{gathered} 1 \\\\ 2 \\times 1 + 0 = 2 \\\\ 2 \\times 2 + 1 = 5 \\\\ 2 \\times 5 + 1 = 11 \\end{gathered}'),
          prose('It works because each step moves every digit read so far one place left, doubling what it is worth.'),
        ),
        ask('base-bin-double'),
        ask('base-bin-to-den', 2),
      ],
      skillCheck: [ask('base-bin-to-den', 2), ask('base-bin-double', 2), ask('base-bin-worth', 2)],
    },
    {
      id: 'np-l7-to-binary',
      title: 'Writing in Binary',
      slides: [
        teach(
          prose(
            'To write $38$ in binary, take away the **biggest power of 2** that fits, then do the same with what is left. The powers of $2$ are $1, 2, 4, 8, 16, 32, 64, \\dots$, and the biggest not more than $38$ is $32$.',
          ),
          maths('\\begin{gathered} 38 - 32 = 6 \\\\ 6 - 4 = 2 \\\\ 2 - 2 = 0 \\end{gathered}'),
          prose('So $38 = 32 + 4 + 2$. Put a $1$ under each power used and a $0$ under the rest:'),
          maths('\\begin{array}{cccccc} 32 & 16 & 8 & 4 & 2 & 1 \\\\ \\hline 1 & 0 & 0 & 1 & 1 & 0 \\end{array}'),
          prose('$38 = 100110_2$.'),
        ),
        ask('base-biggest-power'),
        ask('base-powers-table'),
        ask('base-den-to-bin'),
        teach(
          prose(
            'The other way is to **divide by 2** again and again, writing down each remainder, until you reach $0$:',
          ),
          maths(
            '\\begin{gathered} 38 = 19 \\times 2 + 0 \\\\ 19 = 9 \\times 2 + 1 \\\\ 9 = 4 \\times 2 + 1 \\\\ 4 = 2 \\times 2 + 0 \\\\ 2 = 1 \\times 2 + 0 \\\\ 1 = 0 \\times 2 + 1 \\end{gathered}',
          ),
          prose(
            'Read the remainders from the **bottom up**: $100110_2$. The first remainder is the units digit, so it goes last.',
          ),
        ),
        ask('base-halving-table'),
        ask('base-biggest-power+choice', 2),
        ask('base-powers-table', 2),
        teach(
          prose('Reading the remainders top down is the usual slip. It gives $011001_2$, which is $25$, not $38$.'),
          prose('So check by turning your answer back into denary:'),
          maths('\\begin{aligned} 100110_2 &= 32 + 4 + 2 \\\\ &= 38 \\end{aligned}'),
        ),
        ask('base-halving-table', 2),
        ask('base-den-to-bin', 2),
      ],
      skillCheck: [ask('base-halving-table', 2), ask('base-den-to-bin', 2), ask('base-biggest-power', 2)],
    },
    {
      id: 'np-l7-other-bases',
      title: 'Other Bases',
      slides: [
        teach(
          prose(
            'Any whole number from $2$ up can be a base. In **base 5** the place values are powers of $5$, and the digits run from $0$ to $4$. In base $b$ the digits run from $0$ to $b - 1$.',
          ),
          maths('\\begin{array}{ccc} 25 & 5 & 1 \\\\ \\hline 2 & 4 & 3 \\end{array}'),
          prose('Each digit is worth the digit times its place value:'),
          maths('\\begin{aligned} 243_5 &= 2 \\times 25 + 4 \\times 5 + 3 \\\\ &= 50 + 20 + 3 \\\\ &= 73 \\end{aligned}'),
        ),
        ask('base-valid-digits'),
        ask('base-worth-table'),
        ask('base-to-den'),
        teach(
          prose(
            'To write a number in base $b$, divide by $b$ again and again, just as you divided by $2$ for binary. Writing $73$ in base $5$:',
          ),
          maths('\\begin{gathered} 73 = 14 \\times 5 + 3 \\\\ 14 = 2 \\times 5 + 4 \\\\ 2 = 0 \\times 5 + 2 \\end{gathered}'),
          prose('Read the remainders from the bottom up: $73 = 243_5$. Every remainder is below $5$, so every digit is allowed.'),
        ),
        ask('base-divide-table'),
        ask('base-from-den'),
        ask('base-to-den+choice', 2),
        teach(
          prose(
            'Base $b$ never has a digit $b$: the number $b$ itself is written $10_b$, as ten is $10$ in denary. So $5 = 10_5$, $8 = 10_8$ and $9 = 11_8$.',
          ),
          prose('Place values grow fast in a big base and slowly in a small one: base $3$ runs $1, 3, 9, 27, 81$, base $8$ runs $1, 8, 64, 512$.'),
        ),
        ask('base-valid-digits', 2),
        ask('base-from-den+choice', 2),
      ],
      skillCheck: [ask('base-to-den', 2), ask('base-divide-table', 2), ask('base-from-den', 2)],
    },
    {
      id: 'np-l7-hex',
      title: 'Octal and Hexadecimal',
      slides: [
        teach(
          prose(
            '**Octal** is base $8$, with digits $0$ to $7$. **Hexadecimal**, or hex, is base $16$, which needs sixteen digits, so after $9$ it uses letters:',
          ),
          maths('\\begin{gathered} \\mathrm{A} = 10, \\quad \\mathrm{B} = 11, \\quad \\mathrm{C} = 12 \\\\ \\mathrm{D} = 13, \\quad \\mathrm{E} = 14, \\quad \\mathrm{F} = 15 \\end{gathered}'),
          prose('The place values are $1, 16, 256$. So'),
          maths('\\begin{aligned} \\mathrm{2F}_{16} &= 2 \\times 16 + 15 \\\\ &= 47 \\end{aligned}'),
          prose('Back the other way, divide by $16$: $47 = 2 \\times 16 + 15$, and a remainder of $15$ is written $\\mathrm{F}$, so $47 = \\mathrm{2F}_{16}$.'),
        ),
        ask('base-hex-to-den'),
        ask('base-den-to-hex'),
        ask('base-hex-to-den+choice', 2),
        teach(
          prose(
            '$16 = 2^4$, so each hex digit is exactly **four** binary digits. Split a binary number into fours from the **right**, pad the left group with zeros, and write each group as one digit:',
          ),
          maths('\\begin{array}{cc} 1011 & 0110 \\\\ \\downarrow & \\downarrow \\\\ \\mathrm{B} & 6 \\end{array}'),
          prose('So $10110110_2 = \\mathrm{B6}_{16}$.'),
          prose('$8 = 2^3$, so octal works the same way in groups of **three**:'),
          maths('\\begin{array}{ccc} 010 & 110 & 110 \\\\ \\downarrow & \\downarrow & \\downarrow \\\\ 2 & 6 & 6 \\end{array}'),
          prose('So $10110110_2 = 266_8$.'),
        ),
        ask('base-bin-to-hex'),
        ask('base-bin-to-oct'),
        ask('base-hex-to-bin'),
        teach(
          prose(
            'Going back, each hex digit becomes four binary digits, zeros kept. $\\mathrm{53}_{16}$ is $0101$ then $0011$, which is $1010011_2$. Writing the $3$ as just $11$ would give $10111_2$, a different number.',
          ),
          prose('For a number of three hex digits, divide by $16$ again and again, reading the remainders upward:'),
          maths('\\begin{gathered} 419 = 26 \\times 16 + 3 \\\\ 26 = 1 \\times 16 + 10 \\\\ 1 = 0 \\times 16 + 1 \\end{gathered}'),
          prose('Reading upward, with the remainder $10$ written as $\\mathrm{A}$:'),
          maths('419 = \\mathrm{1A3}_{16}'),
        ),
        ask('base-bin-to-hex', 2),
        ask('base-den-to-hex', 2),
      ],
      skillCheck: [ask('base-hex-to-bin', 2), ask('base-bin-to-oct', 2), ask('base-hex-to-den', 2)],
    },
    {
      id: 'np-l7-binary-arithmetic',
      title: 'Adding in Binary',
      slides: [
        teach(
          prose('Add in binary in columns from the right, as in denary, but carry as soon as a column reaches $2$:'),
          maths('\\begin{gathered} 1 + 1 = 10_2 \\\\ \\text{write } 0 \\text{, carry } 1 \\end{gathered}'),
          maths('\\begin{gathered} 1 + 1 + 1 = 11_2 \\\\ \\text{write } 1 \\text{, carry } 1 \\end{gathered}'),
          prose('Adding $1011_2 + 110_2$:'),
          maths('\\begin{array}{rccccc} & & 1 & 0 & 1 & 1 \\\\ + & & & 1 & 1 & 0 \\\\ \\text{carry} & 1 & 1 & 1 & & \\\\ \\hline & 1 & 0 & 0 & 0 & 1 \\end{array}'),
          prose('Check in denary:'),
          maths('\\begin{gathered} 11 + 6 = 17 \\\\ 10001_2 = 16 + 1 = 17 \\end{gathered}'),
        ),
        ask('base-add-table'),
        ask('base-bin-add'),
        ask('base-add-table', 2),
        teach(
          prose(
            'To take away, work from the right. Where the top digit is smaller, **borrow** $1$ from the next column: it is worth $10_2$, which is $2$, in this one. For $1101_2 - 110_2$:',
          ),
          maths('\\begin{gathered} \\text{units: } 1 - 0 = 1 \\\\ \\text{twos: borrow, } 10_2 - 1 = 1 \\\\ \\text{fours: borrow, } 10_2 - 1 = 1 \\\\ \\text{eights: } 0 - 0 = 0 \\end{gathered}'),
          prose(
            'A borrow leaves the column it came from $1$ smaller: the fours\' $1$ is lent to the twos, so the fours has $0$ and must borrow in turn, and the eights is left with $0$.',
          ),
          prose('So the answer is $111_2$. Check in denary:'),
          maths('\\begin{gathered} 13 - 6 = 7 \\\\ 111_2 = 4 + 2 + 1 = 7 \\end{gathered}'),
        ),
        ask('base-bin-subtract'),
        ask('base-bin-add+choice'),
        ask('base-bin-subtract+choice', 2),
        teach(
          prose(
            '$10_2$ is $2$, and multiplying by $2$ moves every digit one place left. So to multiply by $10_2$, write a $0$ on the end, just as multiplying by ten does in denary:',
          ),
          maths('\\begin{gathered} 1011_2 \\times 10_2 = 10110_2 \\\\ 11 \\times 2 = 22 \\end{gathered}'),
          prose('$100_2$ is $4$, so multiplying by it writes two $0$s on the end, and $1000_2$, which is $8$, writes three.'),
        ),
        ask('base-shift'),
        ask('base-shift+choice', 2),
      ],
      skillCheck: [ask('base-add-table', 2), ask('base-bin-subtract', 2), ask('base-shift', 2)],
    },
  ],
  levelCheck: [
    ask('base-bin-to-den', 2),
    ask('base-bin-double', 2),
    ask('base-den-to-bin', 2),
    ask('base-powers-table', 2),
    ask('base-halving-table', 2),
    ask('base-to-den', 2),
    ask('base-from-den+choice', 2),
    ask('base-valid-digits', 2),
    ask('base-hex-to-den', 2),
    ask('base-bin-to-hex', 2),
    ask('base-hex-to-bin', 2),
    ask('base-add-table', 2),
    ask('base-bin-add', 2),
    ask('base-bin-subtract', 2),
    ask('base-shift', 2),
  ],
};
