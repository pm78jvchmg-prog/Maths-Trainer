/**
 * Data, Averages and Spread.
 *
 * Level 1 is averages: the mean, median and mode of a list and which one a
 * question wants, a missing value from a known mean and two groups combined,
 * frequency tables with an `fx` column, grouped data by midpoints with an
 * estimated mean and the modal class, and reading a scatter diagram. Level 2
 * is spread: the range and what one extreme value does to it, quartiles and
 * the interquartile range, outliers by the 1.5 times IQR rule, variance from
 * `\sum x^2 / n - \bar{x}^2`, and the standard deviation, with two sets of
 * data compared by their means and spreads. Level 3 is representing data:
 * stem-and-leaf diagrams with the quartiles counted off the leaves, box plots
 * read on their own and compared in pairs, and histograms of unequal classes
 * by frequency density, with frequencies read back as areas.
 * Level 4 is cumulative frequency: running totals, the curve through the
 * upper class boundaries, the median, quartiles and percentiles read off it,
 * and the same readings by interpolating inside a class.
 * Level 5 is coding data: what adding a constant and multiplying by one do
 * to every average and every spread (the variance by the square), the coding
 * `y = (x - a)/b` and decoding back with `\bar{x} = a + b\bar{y}` and
 * `\sigma_x = b\sigma_y`, the mean and variance of x from coded sums, and
 * coding in context: converting units, choosing a and b, and comparing two
 * sets coded different ways.
 *
 * Sigma notation belongs to Sequences & Series (`sq-l2-sigma`) and
 * rearranging a formula to Linear Equations (`le-l3-subject`); both are
 * pointed at here, not taught again. Quartiles of a list are taught for
 * lists of length 4k + 3 only, where they sit at whole positions, and no
 * other length is ever asked; on a cumulative frequency curve they are read
 * at n/4, n/2 and 3n/4, and level 4 says why the two rules differ. Later
 * levels are in `docs/roadmap/levels/data-averages-spread.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';
import {
  boxPlotSvg,
  cumulativeSvg,
  histogramSvg,
  type Box,
  type BoxScale,
  type HistFigure,
} from '../generators/dataAveragesSpread';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A generated question with a worked example above it, on the same slide. */
const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

/** The scatter window every generated question uses too, so the teaching picture reads the same way. */
const scatter = (points: [number, number][], label: string, line?: (x: number) => number): Block =>
  figure({
    xMin: -0.4,
    xMax: 10.4,
    yMin: -0.4,
    yMax: 10.4,
    height: 200,
    grid: true,
    curves: line ? [{ f: line, accent: true }] : [],
    marks: points.map(([x, y]) => ({ x, y })),
    label,
  });

/** Box plots drawn the way the generated questions draw them. */
const boxes = (rows: { name?: string; box: Box }[], scale: BoxScale, label: string): Block => ({
  kind: 'diagram',
  svg: boxPlotSvg(rows, scale, label),
});

/** The fine scale level 3's teaching pictures use: a mark every 2, a number every 10. */
const FINE: BoxScale = { lo: 10, hi: 50, tick: 2, every: 10 };

const bars = (fig: HistFigure): Block => ({ kind: 'diagram', svg: histogramSvg(fig) });

const risingPoints: [number, number][] = [
  [1, 2],
  [2, 3],
  [3, 3],
  [4, 5],
  [5, 5],
  [6, 7],
  [7, 7],
  [8, 9],
];

/**
 * The journeys every level 4 teaching slide uses: forty journey times in
 * minutes, drawn so the median, quartiles and the readings taught all land
 * on whole numbers (median 25, quartiles 16 and 34).
 */
const EXAMPLE = { bounds: [0, 10, 20, 30, 40, 50], fs: [4, 10, 12, 10, 4] };

/** A grouped table with its running totals, written out by hand for teaching. */
function cfTableTex({ bounds, fs }: typeof EXAMPLE): string {
  let t = 0;
  const rows = fs.map((f, i) => `${bounds[i]} \\le x < ${bounds[i + 1]} & ${f} & ${(t += f)}`).join(' \\\\ ');
  return `\\begin{array}{c|c|c} \\text{Minutes} & f & \\text{cf} \\\\ \\hline ${rows} \\end{array}`;
}

const cf = (opts: Parameters<typeof cumulativeSvg>[1] = {}): Block => ({ kind: 'diagram', svg: cumulativeSvg(EXAMPLE, opts) });

export const dataAveragesSpread: Course = {
  id: 'data-averages-spread',
  category: 'statistics',
  // After Probability (10), which opens the tab.
  position: 10,
  title: 'Data, Averages and Spread',
  blurb: 'Summing up a set of data: its averages, frequency tables and scatter diagrams, then its range, quartiles, outliers and standard deviation, cumulative frequency curves, and coding.',
  levels: [
    {
      id: 'da-l1',
      title: 'Averages and Frequency Tables',
      lessons: [
        {
          id: 'da-l1-averages',
          title: 'Mean, Median and Mode',
          slides: [
            teach(
              prose(
                'An **average** is one number that stands for a whole list. There are three, and each answers a different question. For $3, 7, 4, 7, 9$, which is $3, 4, 7, 7, 9$ in order:',
              ),
              working('\\text{mean} &= \\frac{30}{5} = 6', '\\text{median} &= 7', '\\text{mode} &= 7'),
              prose(
                'The **mean** $\\bar{x}$ is the total shared out equally: $\\bar{x} = \\frac{\\sum x}{n}$, where $\\sum x$ adds every value (the $\\sum$ of Sequences & Series) and $n$ counts them. The **median** is the middle value once the list is in order. The **mode** is the value that turns up most.',
              ),
            ),
            ask('dat-mean'),
            ask('dat-sum-tree'),
            ask('dat-median-mode+choice'),
            teach(
              prose('With an even number of values there is no single middle one. The median is then halfway between the middle two. For $2, 5, 8, 9, 12, 20$:'),
              working('\\text{middle two} &= 8 \\text{ and } 9', '\\text{median} &= \\frac{8 + 9}{2} = 8.5'),
              prose(
                'Always put the list in order first: the middle of a jumbled list means nothing. And a mean does not have to be one of the values, or even a whole number.',
              ),
            ),
            ask('dat-median-mode', 2),
            ask('dat-mean', 2),
            ask('dat-sum-tree', 2),
            teach(
              prose('Which average to use depends on the data and on the question.'),
              prose(
                '**Categories**, such as favourite colours, cannot be added or put in order, so only the mode works. **Numbers with one extreme value**, such as salaries at a firm where the owner earns ten times the rest, want the median: the extreme value drags the mean towards it, while the middle hardly moves. **Otherwise** the mean is best, since it uses every value.',
              ),
              prose('And a shop deciding which shoe size to stock most of wants the mode even though sizes are numbers: the question is after the most common value.'),
            ),
            ask('dat-which-average'),
            ask('dat-which-average', 2),
          ],
          skillCheck: [ask('dat-mean', 2), ask('dat-median-mode', 2), ask('dat-which-average', 2)],
        },
        {
          id: 'da-l1-missing',
          title: 'Missing Values and Combined Means',
          slides: [
            teach(
              prose(
                'The mean formula works backwards too. $\\bar{x} = \\frac{\\text{total}}{n}$ rearranges, as in Changing the Subject, to $\\text{total} = n \\times \\bar{x}$. So a mean and a count tell you the total.',
              ),
              prose('The mean of $4$ values is $9$. Three of them are $6$, $10$ and $12$, which add to $28$. The fourth is $x$:'),
              working('\\text{total} &= 4 \\times 9 = 36', 'x &= 36 - 28 = 8'),
            ),
            ask('dat-total-tiles'),
            ask('dat-missing'),
            ask('dat-missing', 2),
            teach(
              prose('The same idea gives the new mean when a value joins the list or leaves it. The mean of $5$ values is $8$, and the value $14$ is added:'),
              working('\\text{old total} &= 5 \\times 8 = 40', '\\text{new total} &= 40 + 14 = 54', '\\bar{x} &= \\frac{54}{6} = 9'),
              prose('Taking a value out works the same way: subtract it from the total, and divide by one fewer.'),
            ),
            ask('dat-add-value-steps'),
            ask('dat-total-tiles', 2),
            asking(
              'dat-add-value-steps',
              2,
              prose('Taking a value out: the mean of $4$ values is $10$, and the value $16$ is taken out. Subtract it from the total, and divide by one fewer:'),
              working('\\text{old total} &= 4 \\times 10 = 40', '\\text{new total} &= 40 - 16 = 24', '\\bar{x} &= \\frac{24}{3} = 8'),
            ),
            teach(
              prose(
                'Two groups combine the same way. $10$ pupils have a mean of $6$, a total of $60$, and $30$ pupils have a mean of $10$, a total of $300$:',
              ),
              working('\\text{total} &= 60 + 300 = 360', '\\bar{x} &= \\frac{360}{40} = 9'),
              prose(
                'Not $\\frac{6 + 10}{2} = 8$: averaging the two means pretends the groups are the same size. The bigger group pulls the combined mean towards its own.',
              ),
            ),
            ask('dat-combined-tree'),
            ask('dat-combined-tree', 2),
          ],
          skillCheck: [ask('dat-missing', 2), ask('dat-add-value-steps', 2), ask('dat-combined-tree', 2)],
        },
        {
          id: 'da-l1-frequency',
          title: 'Frequency Tables',
          slides: [
            teach(
              prose('A **frequency table** says how often each value happened. Goals scored in $20$ matches:'),
              display('\\begin{array}{c|cccc} x & 0 & 1 & 2 & 3 \\\\ \\hline f & 4 & 7 & 6 & 3 \\end{array}'),
              prose(
                'Four matches with $0$ goals, seven with $1$, and so on. To add all the goals, multiply each value by its frequency: the $fx$ column. Then $\\sum f$ counts the matches and $\\sum fx$ totals the goals.',
              ),
              working('\\sum fx &= 0 + 7 + 12 + 9 = 28', '\\bar{x} &= \\frac{\\sum fx}{\\sum f} = \\frac{28}{20} = 1.4'),
            ),
            ask('dat-fx-table'),
            ask('dat-freq-formula-tiles'),
            ask('dat-freq-mean'),
            teach(
              prose(
                'The **mode** of a table is the value with the biggest frequency. In the goals table that is $1$, which happened $7$ times.',
              ),
              prose('The mode is $1$, not $7$: the frequency says how often, the value is what happened. Mixing them up is the commonest slip with a table.'),
            ),
            ask('dat-freq-choice'),
            ask('dat-fx-table', 2),
            ask('dat-freq-mean', 2),
            teach(
              prose(
                'For the **median**, count through the frequencies. With $21$ values the median is the $11$th. For this table of scores:',
              ),
              display('\\begin{array}{c|ccccc} x & 1 & 2 & 3 & 4 & 5 \\\\ \\hline f & 3 & 5 & 2 & 8 & 3 \\end{array}'),
              prose(
                'Running totals are $3$, $8$, $10$, $18$, $21$. The $11$th value is past the $10$th, so it is among the fours: the median is $4$. Not $3$, the middle of the top row.',
              ),
            ),
            ask('dat-freq-choice', 2),
            ask('dat-freq-formula-tiles', 2),
          ],
          skillCheck: [ask('dat-fx-table', 2), ask('dat-freq-mean', 2), ask('dat-freq-choice', 2)],
        },
        {
          id: 'da-l1-grouped',
          title: 'Grouped Data',
          slides: [
            teach(
              prose(
                'When values are spread over a wide range they are grouped into **classes**. $10 \\le x < 20$ holds every value from $10$ up to, but not including, $20$.',
              ),
              display('\\begin{array}{c|c} \\text{Class} & f \\\\ \\hline 0 \\le x < 10 & 3 \\\\ 10 \\le x < 20 & 9 \\\\ 20 \\le x < 30 & 6 \\end{array}'),
              prose(
                'Each class has a **midpoint**, halfway between its ends: $5$, $15$ and $25$ here. The **modal class** is the one with the biggest frequency, $10 \\le x < 20$.',
              ),
            ),
            ask('dat-midpoint-table'),
            ask('dat-modal-class'),
            ask('dat-midpoint-table', 2),
            teach(
              prose(
                'The exact values are lost once they are grouped, so the mean can only be **estimated**. Take every value in a class to sit at its midpoint, and use the midpoints as the $x$ in $\\frac{\\sum fx}{\\sum f}$:',
              ),
              prose('The $fx$ column is $5 \\times 3 = 15$, $15 \\times 9 = 135$ and $25 \\times 6 = 150$:'),
              working('\\sum fx &= 15 + 135 + 150', '&= 300', '\\bar{x} &\\approx \\frac{300}{18} \\approx 16.7'),
              prose('It is an estimate because the values in a class are rarely spread evenly around its middle.'),
            ),
            ask('dat-grouped-steps'),
            ask('dat-grouped-mean'),
            ask('dat-grouped-steps', 2),
            teach(
              prose(
                'The class that holds the median is found the same way as with a frequency table: add up the frequencies as you go until you pass the middle position.',
              ),
              prose(
                'With $3$, $9$ and $6$ there are $18$ values, and the running totals are $3$, $12$, $18$. The middle of $18$ values is between the $9$th and $10$th, and both are in $10 \\le x < 20$.',
              ),
            ),
            ask('dat-modal-class', 2),
            ask('dat-grouped-mean', 2),
          ],
          skillCheck: [ask('dat-grouped-mean', 2), ask('dat-modal-class', 2), ask('dat-grouped-steps', 2)],
        },
        {
          id: 'da-l1-scatter',
          title: 'Scatter Diagrams',
          slides: [
            teach(
              prose(
                'A **scatter diagram** plots two measurements of each thing, one across and one up: hours revised against marks, say. Each square on these grids is one unit.',
              ),
              scatter(risingPoints, 'Eight points rising from bottom left to top right, close to a straight line'),
              prose(
                'These points rise from left to right: **positive correlation**. Points falling from left to right show **negative correlation**, and a shapeless cloud shows **no correlation**. The closer the points sit to a straight line, the **stronger** the correlation. A point far from the pattern of the rest is an **outlier**.',
              ),
            ),
            ask('dat-correlation'),
            ask('dat-scatter-slider'),
            ask('dat-correlation', 2),
            teach(
              prose('A **line of best fit** runs through the middle of the points, following their trend. Its equation turns one measurement into an estimate of the other.'),
              scatter(risingPoints, 'The same eight points with the line y = 1 + x drawn through them', (x) => 1 + x),
              prose('This line is $y = 1 + x$, so at $x = 4.5$ it estimates $y = 1 + 4.5 = 5.5$.'),
            ),
            ask('dat-line-estimate'),
            asking(
              'dat-scatter-slider',
              2,
              prose(
                'The line also works the other way round. To find $x$ for a given $y$, go **across** from $y$ to the line, then straight **down** to the $x$ axis. On the line $y = 1 + x$ of the last picture, across from $y = 6$ meets the line above $x = 5$. The equation agrees:',
              ),
              working('1 + x &= 6', 'x &= 6 - 1 = 5'),
            ),
            ask('dat-line-estimate', 2),
            teach(
              prose(
                'An estimate inside the range of the data is **interpolation**, and it is as reliable as the correlation is strong. An estimate outside it is **extrapolation**: nothing says the pattern carries on, so it is unreliable however good the fit.',
              ),
              prose('And correlation is not cause. Ice cream sales and sunburn rise together, but one does not cause the other: hot weather causes both.'),
            ),
            ask('dat-reliable-flow'),
            ask('dat-reliable-flow', 2),
          ],
          skillCheck: [ask('dat-correlation', 2), ask('dat-line-estimate', 2), ask('dat-reliable-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dat-mean', 2),
        ask('dat-median-mode', 2),
        ask('dat-which-average', 2),
        ask('dat-total-tiles', 2),
        ask('dat-missing', 2),
        ask('dat-combined-tree', 2),
        ask('dat-add-value-steps', 2),
        ask('dat-fx-table', 2),
        ask('dat-freq-mean', 2),
        ask('dat-freq-choice', 2),
        ask('dat-grouped-mean', 2),
        ask('dat-modal-class', 2),
        ask('dat-correlation', 2),
        ask('dat-line-estimate', 2),
        ask('dat-reliable-flow', 2),
      ],
    },
    {
      id: 'da-l2',
      title: 'Measures of Spread',
      lessons: [
        {
          id: 'da-l2-range',
          title: 'The Range',
          slides: [
            teach(
              prose(
                'Two lists can share an average and still look nothing alike: $5, 5, 5$ and $1, 5, 9$ both have a mean of $5$. A **measure of spread** says how far the values stray.',
              ),
              prose('The simplest is the **range**: the largest value take the smallest.'),
              prose('For $1, 5, 9$ the range is $9 - 1 = 8$. For $-4, 2, 7$, take care with the sign:'),
              display('7 - (-4) = 11'),
              prose('Find the largest and smallest by looking through the whole list, not by reading its two ends.'),
            ),
            ask('dat-range'),
            ask('dat-range-tiles'),
            ask('dat-range', 2),
            teach(
              prose('The range uses only two values, so one extreme value decides it. Marks of $12, 14, 15, 15, 17, 95$:'),
              working('\\text{with } 95 &= 95 - 12 = 83', '\\text{without} &= 17 - 12 = 5'),
              prose('One mark of $95$, perhaps a typing error, makes the spread look sixteen times bigger than it is.'),
            ),
            ask('dat-remove-choice'),
            ask('dat-range-flow'),
            ask('dat-range-tiles', 2),
            teach(
              prose('So which values change the range when they are taken out? Only an end, the largest or the smallest.'),
              prose(
                'And only an end that is alone. In $3, 8, 9, 9$ taking out one $9$ leaves the other, so the range is still $9 - 3 = 6$. Taking out the $3$ makes it $9 - 8 = 1$.',
              ),
            ),
            ask('dat-range-flow', 2),
            ask('dat-remove-choice', 2),
          ],
          skillCheck: [ask('dat-range', 2), ask('dat-remove-choice', 2), ask('dat-range-flow', 2)],
        },
        {
          id: 'da-l2-quartiles',
          title: 'Quartiles and the IQR',
          slides: [
            teach(
              prose(
                'The median cuts an ordered list in half. The **quartiles** cut it into quarters: the **lower quartile** $Q_1$ a quarter of the way along, the median $Q_2$, and the **upper quartile** $Q_3$ three quarters along.',
              ),
              prose(
                'Every list in this course has $n = 4k + 3$ values ($7$, $11$, $15$, ...), which puts the quartiles at whole positions: $\\frac{n + 1}{4}$, then twice and three times that. For $11$ values, $\\frac{12}{4} = 3$:',
              ),
              working('Q_1 &= \\text{3rd value}', 'Q_2 &= \\text{6th value}', 'Q_3 &= \\text{9th value}'),
            ),
            ask('dat-quartile-choice'),
            ask('dat-quartile-table'),
            ask('dat-quartile-choice', 2),
            teach(
              prose('The **interquartile range** is the distance between the quartiles: the spread of the middle half of the data.'),
              display('\\text{IQR} = Q_3 - Q_1'),
              prose('For $2, 4, 5, 7, 8, 10, 30$ the quartiles are the 2nd and 6th values, $4$ and $10$, so the IQR is $6$.'),
            ),
            ask('dat-quartiles-tree'),
            ask('dat-iqr'),
            ask('dat-quartile-table', 2),
            teach(
              prose(
                'In that list the range is $30 - 2 = 28$, but the IQR is only $6$: the IQR leaves out the top and bottom quarters, so one extreme value cannot move it much. That is why it is the spread to use alongside a median.',
              ),
              prose('As with the median, put a jumbled list in order before counting along it.'),
            ),
            ask('dat-iqr', 2),
            ask('dat-quartiles-tree', 2),
          ],
          skillCheck: [ask('dat-quartile-table', 2), ask('dat-iqr', 2), ask('dat-quartiles-tree', 2)],
        },
        {
          id: 'da-l2-outliers',
          title: 'Outliers',
          slides: [
            teach(
              prose(
                'How far is too far? A common rule: a value is an **outlier** if it is more than $1.5 \\times \\text{IQR}$ beyond a quartile. The two **fences** are',
              ),
              working('\\text{lower} &= Q_1 - 1.5 \\times \\text{IQR}', '\\text{upper} &= Q_3 + 1.5 \\times \\text{IQR}'),
              prose('With $Q_1 = 20$ and $Q_3 = 28$ the IQR is $8$ and $1.5 \\times 8 = 12$, so the fences are $8$ and $40$. A value of $43$ is an outlier; $39$ is not.'),
            ),
            ask('dat-fence-steps'),
            ask('dat-fence-tiles'),
            ask('dat-outlier-flow'),
            teach(
              prose('An odd IQR puts the fences on a half. With $Q_1 = 11$ and $Q_3 = 16$:'),
              working('\\text{IQR} &= 5, \\quad 1.5 \\times 5 = 7.5', '\\text{fences} &= 3.5 \\text{ and } 23.5'),
              prose('The lower fence can even be negative. That only means no value can be too small.'),
            ),
            ask('dat-fence-steps', 2),
            ask('dat-outlier-count'),
            ask('dat-fence-tiles', 2),
            teach(
              prose(
                'To check a whole list: put it in order, find $Q_1$ and $Q_3$, work out both fences, then look at the values beyond them.',
              ),
              prose(
                'An outlier is a question, not a verdict. It may be a mistake, worth removing, or a genuine extreme, worth keeping and mentioning.',
              ),
            ),
            ask('dat-outlier-flow', 2),
            ask('dat-outlier-count', 2),
          ],
          skillCheck: [ask('dat-fence-steps', 2), ask('dat-outlier-count', 2), ask('dat-outlier-flow', 2)],
        },
        {
          id: 'da-l2-variance',
          title: 'Variance',
          slides: [
            teach(
              prose(
                'The range and the IQR use two values each. The **variance** uses them all: it is the mean of the squares take the square of the mean.',
              ),
              display('\\sigma^2 = \\frac{\\sum x^2}{n} - \\bar{x}^2'),
              prose(
                '$\\sum x^2$ squares every value and then adds. It is not $(\\sum x)^2$, which adds first and squares the total. For $1, 2, 3$: $\\sum x^2 = 1 + 4 + 9 = 14$, but $(\\sum x)^2 = 36$.',
              ),
            ),
            ask('dat-x2-table'),
            ask('dat-var-tree'),
            ask('dat-var-formula-steps'),
            teach(
              prose('For $2, 4, 6, 8$:'),
              working('\\bar{x} &= 20 \\div 4 = 5', '\\sum x^2 &= 4 + 16 + 36 + 64', '&= 120', '\\sigma^2 &= 120 \\div 4 - 5^2', '&= 30 - 25 = 5'),
              prose('A variance of $0$ would mean every value is the same. The more the values stray from the mean, the bigger it gets.'),
            ),
            ask('dat-variance'),
            ask('dat-x2-table', 2),
            ask('dat-var-tree', 2),
            teach(
              prose(
                'From a list, work out $\\sum x$ and $\\sum x^2$ first, then use the formula. A negative value squares to a positive, so $\\sum x^2$ is never negative, and nor is the variance.',
              ),
              prose('A variance that comes out negative always means a slip: most often $(\\sum x)^2$ was used where $\\bar{x}^2$ belongs.'),
            ),
            ask('dat-var-formula-steps', 2),
            ask('dat-variance', 2),
          ],
          skillCheck: [ask('dat-var-tree', 2), ask('dat-variance', 2), ask('dat-var-formula-steps', 2)],
        },
        {
          id: 'da-l2-sd',
          title: 'Standard Deviation and Comparing',
          slides: [
            teach(
              prose(
                'The variance is in squared units: marks squared, seconds squared. Its square root, the **standard deviation** $\\sigma$, is back in the units of the data, which makes it the spread people quote.',
              ),
              display('\\sigma = \\sqrt{\\frac{\\sum x^2}{n} - \\bar{x}^2}'),
              prose('For $2, 4, 6, 8$ the variance was $5$, so $\\sigma = \\sqrt{5} \\approx 2.24$. The root key is on the keypad when you need it.'),
            ),
            ask('dat-sd'),
            ask('dat-sd-tiles'),
            ask('dat-sd', 2),
            teach(
              prose(
                'To compare two sets of data, compare one average and one spread. The mean says which is higher **on average**; the standard deviation says which is more **consistent**, since a smaller one means values closer to their mean.',
              ),
              display('\\begin{array}{l|c|c} & \\text{Mean} & \\text{SD} \\\\ \\hline \\text{Class A} & 64 & 5 \\\\ \\text{Class B} & 58 & 11 \\end{array}'),
              prose('Class A scored higher on average and more consistently.'),
            ),
            ask('dat-compare-choice'),
            ask('dat-compare-flow'),
            ask('dat-sd-tiles', 2),
            teach(
              prose(
                'Two traps. First, higher is not always better: for lap times or faulty parts, the lower mean is the better one. Second, check whether a spread is a variance or a standard deviation before comparing. A variance of $16$ is a standard deviation of $4$, smaller than a standard deviation of $5$.',
              ),
            ),
            ask('dat-compare-choice', 2),
            ask('dat-compare-flow', 2),
          ],
          skillCheck: [ask('dat-sd', 2), ask('dat-compare-choice', 2), ask('dat-compare-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dat-range', 2),
        ask('dat-remove-choice', 2),
        ask('dat-range-flow', 2),
        ask('dat-quartile-table', 2),
        ask('dat-iqr', 2),
        ask('dat-quartile-choice', 2),
        ask('dat-fence-steps', 2),
        ask('dat-outlier-count', 2),
        ask('dat-outlier-flow', 2),
        ask('dat-x2-table', 2),
        ask('dat-var-tree', 2),
        ask('dat-variance', 2),
        ask('dat-sd', 2),
        ask('dat-sd-tiles', 2),
        ask('dat-compare-flow', 2),
      ],
    },
    {
      id: 'da-l3',
      title: 'Representing Data',
      lessons: [
        {
          id: 'da-l3-stem',
          title: 'Stem-and-Leaf Diagrams',
          slides: [
            teach(
              prose(
                'A **stem-and-leaf diagram** lists every value but groups them as it goes. Each value splits into a **stem**, its leading digits, and a **leaf**, its last digit. Marks of $23, 25, 25, 31, 36, 38, 42$:',
              ),
              display('\\begin{array}{r|l} 2 & 3\\;5\\;5 \\\\ 3 & 1\\;6\\;8 \\\\ 4 & 2 \\end{array}'),
              prose(
                'Key: $2 \\mid 3$ means $23$. Every diagram needs a key, since the same picture could stand for $2.3$ or $230$. The leaves go in order, smallest first, and a value that appears twice keeps both its leaves.',
              ),
            ),
            ask('dat-stem-leaves'),
            ask('dat-stem-key'),
            ask('dat-stem-read'),
            teach(
              prose('Reading a diagram back, each leaf is one value. With the key $4 \\mid 7$ means $4.7$, the row $5 \\mid 1\\;2\\;2\\;9$ stands for four values:'),
              display('5.1, \\ 5.2, \\ 5.2, \\ 5.9'),
              prose(
                'With two-digit stems the leaf is still the last digit: if $12 \\mid 5$ means $125$, then $13 \\mid 0\\;4$ is $130$ and $134$. The smallest value is the first leaf on the top row, and the largest the last leaf on the bottom row.',
              ),
            ),
            ask('dat-stem-key', 2),
            ask('dat-stem-read', 2),
            ask('dat-stem-leaves', 2),
            teach(
              prose(
                'The leaves are already in order, so the median and the quartiles can be counted straight off them, top row first. With $n = 4k + 3$ values, as in Measures of Spread, they sit at position $\\frac{n + 1}{4}$, twice that, and three times that.',
              ),
              display('\\begin{array}{r|l} 1 & 2\\;5\\;8 \\\\ 2 & 1\\;1\\;4\\;7 \\\\ 3 & 0\\;3\\;5\\;8 \\end{array}'),
              prose(
                'Key: $1 \\mid 2$ means $12$. Here $n = 11$, so count to the 3rd, 6th and 9th leaves: $Q_1 = 18$, the median is $24$ and $Q_3 = 33$, so the IQR is $33 - 18 = 15$.',
              ),
            ),
            ask('dat-stem-quartiles'),
            ask('dat-stem-quartiles', 2),
          ],
          skillCheck: [ask('dat-stem-leaves', 2), ask('dat-stem-quartiles', 2), ask('dat-stem-read', 2)],
        },
        {
          id: 'da-l3-box',
          title: 'Box Plots',
          slides: [
            teach(
              prose(
                'A **box plot** draws five values on a scale: the smallest, the lower quartile $Q_1$, the median, the upper quartile $Q_3$, and the largest.',
              ),
              boxes([{ box: { min: 12, q1: 20, q2: 26, q3: 34, max: 46, outliers: [] } }], FINE, 'A box plot from 12 to 46, the box from 20 to 34 with the median at 26'),
              prose(
                'To read the scale, first work out what one small division is worth: from $10$ to $20$ in five divisions is $10 \\div 5 = 2$ each.',
              ),
              prose(
                'The box runs from $Q_1 = 20$ to $Q_3 = 34$, with a line at the median, $26$. The **whiskers** reach out to the smallest value, $12$, and the largest, $46$. The IQR is the length of the box, and the range the whole length:',
              ),
              working('\\text{IQR} &= 34 - 20 = 14', '\\text{range} &= 46 - 12 = 34'),
            ),
            ask('dat-box-five'),
            ask('dat-box-read'),
            ask('dat-box-slider'),
            teach(
              prose(
                'Each of the four parts, whisker, half of the box, the other half and the other whisker, holds a quarter of the values. So half the values lie inside the box, and a quarter lie above $Q_3$.',
              ),
              prose(
                'That is why the IQR, the length of the box, is the spread of the middle half of the values.',
              ),
              prose('A cross out beyond a whisker marks an outlier. That comes next.'),
            ),
            ask('dat-box-slider', 2),
            ask('dat-box-five', 2),
            teach(
              prose(
                'An outlier, more than $1.5 \\times \\text{IQR}$ beyond a quartile as in Outliers, is plotted on its own as a cross. The whisker then stops at the furthest value that is **not** an outlier.',
              ),
              boxes(
                [{ box: { min: 14, q1: 20, q2: 24, q3: 28, max: 36, outliers: [48] } }],
                FINE,
                'A box plot from 14 to 36, the box from 20 to 28 with the median at 24, and a cross at 48',
              ),
              prose(
                'Here the IQR is $8$, so the upper fence is $28 + 12 = 40$. The cross at $48$ is beyond it, and the whisker ends at $36$, the largest value inside. The cross is still one of the values, so the range is $48 - 14 = 34$.',
              ),
            ),
            ask('dat-box-whisker'),
            ask('dat-box-fence'),
            ask('dat-box-read', 2),
          ],
          skillCheck: [ask('dat-box-five', 2), ask('dat-box-read', 2), ask('dat-box-whisker', 2)],
        },
        {
          id: 'da-l3-compare',
          title: 'Comparing Box Plots',
          slides: [
            teach(
              prose(
                'Two box plots on one scale compare two sets of data at a glance. As with a mean and a standard deviation, compare an **average**, here the medians, and a **spread**, here the interquartile ranges.',
              ),
              boxes(
                [
                  { name: 'Class A', box: { min: 40, q1: 55, q2: 65, q3: 70, max: 85, outliers: [] } },
                  { name: 'Class B', box: { min: 35, q1: 45, q2: 55, q3: 70, max: 80, outliers: [] } },
                ],
                { lo: 30, hi: 90, tick: 5, every: 10 },
                'Two box plots on one scale: Class A with its box from 55 to 70 and median 65, Class B with its box from 45 to 70 and median 55',
              ),
              prose(
                'Class A has the higher median, $65$ against $55$. Class B has the larger IQR, $70 - 45 = 25$ against $70 - 55 = 15$, so its marks are more spread out.',
              ),
            ),
            ask('dat-boxes-choice'),
            ask('dat-boxes-tree'),
            ask('dat-boxes-flow'),
            teach(
              prose(
                'Use the IQR for spread, not the length of the whiskers. One extreme value can stretch a whisker a long way, while the box holds the middle half and hardly moves.',
              ),
              prose(
                'And, as with means, higher is not always better. For lap times or journey times the lower median did better, and the smaller IQR is the more consistent.',
              ),
            ),
            ask('dat-boxes-choice', 2),
            ask('dat-boxes-flow', 2),
            ask('dat-boxes-tree', 2),
            teach(
              prose('Each part of a box plot holds a quarter of the values, and that lets one plot be read against the other.'),
              prose(
                'Above, the median of Class B is $55$, which is exactly the lower quartile of Class A. A quarter of Class A lies below its lower quartile, so about $75\\%$ of Class A scored more than Class B\'s median. If Class A has $40$ pupils, that is about $30$ of them.',
              ),
            ),
            ask('dat-boxes-percent'),
            ask('dat-boxes-percent', 2),
          ],
          skillCheck: [ask('dat-boxes-choice', 2), ask('dat-boxes-flow', 2), ask('dat-boxes-percent', 2)],
        },
        {
          id: 'da-l3-histogram',
          title: 'Histograms',
          slides: [
            teach(
              prose(
                'When classes have different widths, their frequencies cannot be compared as they stand: a class twice as wide collects about twice as many values. So divide each by its width, to get its **frequency density**.',
              ),
              display('\\text{density} = \\frac{\\text{frequency}}{\\text{width}}'),
              prose('These classes are $10$, $5$ and $20$ wide:'),
              display(
                '\\begin{array}{c|c|c} \\text{Class} & f & \\text{Density} \\\\ \\hline 0 \\le x < 10 & 30 & 3 \\\\ 10 \\le x < 15 & 40 & 8 \\\\ 15 \\le x < 35 & 60 & 3 \\end{array}',
              ),
              prose('The middle class has the most tightly packed values, even though the last class holds more of them.'),
            ),
            ask('dat-fd-table'),
            ask('dat-fd-tiles'),
            teach(
              prose(
                'A **histogram** draws each class as a bar as wide as the class and as tall as its frequency density, with no gaps between the bars. The same table:',
              ),
              bars({ bounds: [0, 10, 15, 35], heights: [3, 8, 3], yMax: 8, yStep: 1, yEvery: 2, label: 'A histogram of bars 3, 8 and 3 high over 0 to 10, 10 to 15 and 15 to 35' }),
              prose(
                'Height is density, so a bar\'s **area**, its density times its width, is its frequency: $8 \\times 5 = 40$ for the middle bar. How many values a bar holds is its area, not its height.',
              ),
            ),
            ask('dat-fd-slider'),
            ask('dat-fd-area'),
            ask('dat-fd-tiles', 2),
            ask('dat-fd-table', 2),
            teach(
              prose('Densities need not be whole. $36$ values in a class $15$ wide have a density of $36 \\div 15 = 2.4$.'),
              prose(
                'On a finer scale, count the lines. With a number at every $1$ and five lines to each, a line is worth $0.2$, so a bar reaching two lines past $2$ is $2.4$ high.',
              ),
            ),
            ask('dat-fd-slider', 2),
            ask('dat-fd-area', 2),
          ],
          skillCheck: [ask('dat-fd-table', 2), ask('dat-fd-slider', 2), ask('dat-fd-area', 2)],
        },
        {
          id: 'da-l3-reading',
          title: 'Reading a Histogram',
          slides: [
            teach(
              prose('Every bar\'s area is its frequency, so the total number of values is the total area.'),
              bars({ bounds: [10, 20, 40, 50], heights: [2, 3, 5], yMax: 6, yStep: 1, yEvery: 2, label: 'A histogram of bars 2, 3 and 5 high over 10 to 20, 20 to 40 and 40 to 50' }),
              working('2 \\times 10 &= 20', '3 \\times 20 &= 60', '5 \\times 10 &= 50'),
              prose(
                'That is $130$ values. The tallest bar, $40 \\le x < 50$, does not hold the most of them: the wider, lower bar $20 \\le x < 40$ does.',
              ),
            ),
            ask('dat-hist-total'),
            ask('dat-hist-tallest'),
            teach(
              prose(
                'A range that cuts through a bar takes the share of the bar it covers, as though the values were spread evenly across the class.',
              ),
              prose(
                'In the histogram of bars $2$, $3$ and $5$ high, how many values lie between $30$ and $45$? The part of $20 \\le x < 40$ from $30$ is $10$ wide at height $3$, and the part of $40 \\le x < 50$ up to $45$ is $5$ wide at height $5$:',
              ),
              working('3 \\times 10 &= 30', '5 \\times 5 &= 25', '30 + 25 &= 55'),
              prose('About $55$. It is an estimate, since the values inside a class are rarely spread exactly evenly.'),
            ),
            ask('dat-hist-part'),
            ask('dat-hist-total', 2),
            ask('dat-hist-part', 2),
            ask('dat-hist-tallest', 2),
            teach(
              prose('Sometimes the vertical scale has no numbers. Frequency is still area, so count squares, and let one bar whose frequency is known set the scale.'),
              prose('If a bar covering $6$ squares has a frequency of $18$, each square stands for $18 \\div 6 = 3$ values, and a bar covering $10$ squares holds $30$.'),
            ),
            ask('dat-hist-scale'),
            ask('dat-hist-scale', 2),
          ],
          skillCheck: [ask('dat-hist-part', 2), ask('dat-hist-tallest', 2), ask('dat-hist-scale', 2)],
        },
      ],
      levelCheck: [
        ask('dat-stem-leaves', 2),
        ask('dat-stem-quartiles', 2),
        ask('dat-stem-key', 2),
        ask('dat-box-five', 2),
        ask('dat-box-read', 2),
        ask('dat-box-whisker', 2),
        ask('dat-boxes-percent', 2),
        ask('dat-boxes-flow', 2),
        ask('dat-boxes-choice', 2),
        ask('dat-fd-table', 2),
        ask('dat-fd-slider', 2),
        ask('dat-fd-area', 2),
        ask('dat-hist-part', 2),
        ask('dat-hist-tallest', 2),
        ask('dat-hist-scale', 2),
      ],
    },
    {
      id: 'da-l4',
      title: 'Cumulative Frequency',
      lessons: [
        {
          id: 'da-l4-tables',
          title: 'Cumulative Frequency Tables',
          slides: [
            teach(
              prose(
                'A **cumulative frequency** is a running total: how many values have been counted by the end of each class. Add each frequency to the total above it.',
              ),
              display(cfTableTex(EXAMPLE)),
              prose('The last running total is every value counted, so it is always $n$: here $40$ journeys.'),
            ),
            ask('dat-cf-table'),
            teach(
              prose('A running total is a count of values below a boundary. In the journeys table, the running total at the end of $20 \\le x < 30$ is $26$: $26$ journeys took less than $30$ minutes.'),
              prose('So the rest took at least $30$ minutes: $40 - 26 = 14$.'),
              prose('Going back, each frequency is its running total take the one above:'),
              working('14 - 4 &= 10', '26 - 14 &= 12', '36 - 26 &= 10'),
              prose('So if the $12$ were missing from the table but its running total $26$ were given, it would still be $26 - 14 = 12$.'),
            ),
            ask('dat-cf-count'),
            ask('dat-cf-back'),
            teach(
              prose(
                'Each class gives one point to plot. By the end of $10 \\le x < 20$, all $14$ journeys under $20$ minutes have been counted, and not before. So the point goes at the **upper class boundary**:',
              ),
              display('(20, 14)'),
              prose('Not at the midpoint, $15$: halfway through the class only some of its journeys have been counted.'),
            ),
            ask('dat-cf-point'),
            ask('dat-cf-table', 2),
            ask('dat-cf-point', 2),
            ask('dat-cf-back', 2),
            ask('dat-cf-count', 2),
          ],
          skillCheck: [ask('dat-cf-table', 2), ask('dat-cf-point', 2), ask('dat-cf-count', 2)],
        },
        {
          id: 'da-l4-curve',
          title: 'The Cumulative Frequency Curve',
          slides: [
            teach(
              prose(
                'Plot each running total at its upper boundary, and join the points in order. Start at the **lowest boundary, at zero**: no journey took less than $0$ minutes.',
              ),
              cf(),
              prose(
                'Here the points are joined with straight lines. The curve only ever rises, since a running total can never go down, and it ends at $n = 40$.',
              ),
            ),
            ask('dat-cf-check'),
            teach(
              prose('To read how many values lie below $35$, go **up** from $35$ to the curve, then **across**:'),
              cf({ down: [35], across: [31] }),
              prose(
                '$31$ journeys took less than $35$ minutes, so $40 - 31 = 9$ took more. Between two values, take one reading from the other: below $15$ there are $9$, so $31 - 9 = 22$ lie between $15$ and $35$.',
              ),
            ),
            ask('dat-cf-above'),
            ask('dat-cf-between'),
            teach(
              prose(
                'Between two points the curve is a straight join, so a reading inside a class is a share of it. $30 \\le x < 40$ holds $10$ journeys on top of the $26$ below it.',
              ),
              prose('$35$ is $\\frac{35 - 30}{10} = 0.5$ of the way through the class, and $32$ is $\\frac{32 - 30}{10} = 0.2$ of the way. Add that share of the $10$:'),
              working('35&: \\; 26 + 0.5 \\times 10 = 31', '32&: \\; 26 + 0.2 \\times 10 = 28'),
            ),
            ask('dat-cf-below-slider'),
            ask('dat-cf-below-slider', 2),
            ask('dat-cf-check', 2),
            ask('dat-cf-above', 2),
            ask('dat-cf-between', 2),
          ],
          skillCheck: [ask('dat-cf-below-slider', 2), ask('dat-cf-between', 2), ask('dat-cf-check', 2)],
        },
        {
          id: 'da-l4-quartiles',
          title: 'Median and Quartiles from the Curve',
          slides: [
            teach(
              prose(
                'The median is the value halfway up the data, so read it **across** from a cumulative frequency of $\\frac{n}{2}$ and then **down**. With $n = 40$, across from $20$:',
              ),
              cf({ across: [20], down: [25] }),
              prose(
                'The median is $25$ minutes. On a curve the position is $\\frac{n}{2}$, not $\\frac{n + 1}{2}$: the $4k + 3$ rule of Measures of Spread counts places along a list, and a curve has no places to count.',
              ),
            ),
            ask('dat-cf-quartile-slider'),
            teach(
              prose('The quartiles are read the same way, across from a quarter and three quarters of the way up, at $\\frac{n}{4}$ and $\\frac{3n}{4}$:'),
              cf({ across: [10, 30], down: [16, 34] }),
              working('Q_1 &: \\tfrac{40}{4} = 10 \\to 16', 'Q_3 &: \\tfrac{3 \\times 40}{4} = 30 \\to 34'),
              prose('Across from $10$ the curve comes down at $16$, and across from $30$ at $34$. The interquartile range is $34 - 16 = 18$ minutes: the spread of the middle half of the journeys.'),
            ),
            ask('dat-cf-rule'),
            ask('dat-cf-positions'),
            ask('dat-cf-iqr'),
            ask('dat-cf-rule', 2),
            teach(
              prose(
                'A reading will not always land on a grid line. Each class is two squares wide, so count how far between the lines the curve crosses, and use the table to check the arithmetic.',
              ),
              prose('The median and IQR go together, as in Measures of Spread: neither is moved much by a few extreme values.'),
            ),
            ask('dat-cf-quartile-slider', 2),
            ask('dat-cf-positions', 2),
            ask('dat-cf-iqr', 2),
          ],
          skillCheck: [ask('dat-cf-quartile-slider', 2), ask('dat-cf-positions', 2), ask('dat-cf-iqr', 2)],
        },
        {
          id: 'da-l4-percentiles',
          title: 'Percentiles',
          slides: [
            teach(
              prose(
                'The quartiles cut the data into quarters. **Percentiles** cut it into hundredths: the $p$th percentile $P_p$ is read across from a cumulative frequency of',
              ),
              display('\\frac{p}{100} \\times n'),
              prose(
                'For the journeys, $P_{20}$ is read at $\\frac{20}{100} \\times 40 = 8$, which is $14$ minutes. The median is $P_{50}$ and the quartiles are $P_{25}$ and $P_{75}$.',
              ),
            ),
            ask('dat-pct-position'),
            ask('dat-pct-slider'),
            ask('dat-pct-position', 2),
            teach(
              prose(
                'The **10th to 90th interpercentile range** is $P_{90} - P_{10}$: the spread of the middle $80\\%$ of the data. It leaves out the top and bottom tenths, so one extreme value cannot stretch it the way it stretches the range.',
              ),
              working('P_{10} &: \\tfrac{10}{100} \\times 40 = 4 \\to 10', 'P_{90} &: \\tfrac{90}{100} \\times 40 = 36 \\to 40'),
              prose('So for the journeys $P_{90} - P_{10} = 40 - 10 = 30$ minutes.'),
            ),
            ask('dat-pct-range'),
            ask('dat-pct-slider', 2),
            ask('dat-pct-range', 2),
            teach(
              prose(
                'Reading the other way round says where a value stands. $31$ of the $40$ journeys took less than $35$ minutes:',
              ),
              display('\\frac{31}{40} \\times 100 = 77.5\\%'),
              prose('So a $35$ minute journey is at about the $78$th percentile: slower than most.'),
            ),
            ask('dat-pct-rank'),
            ask('dat-pct-rank', 2),
          ],
          skillCheck: [ask('dat-pct-slider', 2), ask('dat-pct-range', 2), ask('dat-pct-rank', 2)],
        },
        {
          id: 'da-l4-interpolation',
          title: 'Interpolating Inside a Class',
          slides: [
            teach(
              prose(
                'A reading off the straight-line curve can be done by arithmetic instead, with no drawing. First find the class by the running totals. For the median of the journeys, at position $20$: the totals run $4, 14, 26$, so $14$ come before $20 \\le x < 30$ and $26$ by its end.',
              ),
              prose('Then go the right share of the way through it: $20 - 14 = 6$ of its $12$ journeys, across a width of $10$.'),
              display('20 + \\frac{20 - 14}{12} \\times 10 = 25'),
            ),
            ask('dat-interp-class'),
            ask('dat-interp-tiles'),
            ask('dat-interp-steps'),
            teach(
              prose('In general, with $L$ the class\'s lower boundary, $F$ the running total before it, $f$ its frequency and $w$ its width:'),
              display('L + \\frac{\\text{position} - F}{f} \\times w'),
              prose('The same works for any quartile or percentile once its position is known. Take care where classes differ in width: $w$ is the width of this class, not the one above.'),
            ),
            ask('dat-interp-value'),
            ask('dat-interp-class', 2),
            ask('dat-interp-tiles', 2),
            teach(
              prose(
                'It is an estimate. The table hides where in each class the values really are, so this assumes they are spread evenly through it, which is exactly what joining the points with straight lines assumes too.',
              ),
            ),
            ask('dat-interp-steps', 2),
            ask('dat-interp-value', 2),
          ],
          skillCheck: [ask('dat-interp-class', 2), ask('dat-interp-tiles', 2), ask('dat-interp-value', 2)],
        },
      ],
      levelCheck: [
        ask('dat-cf-table', 2),
        ask('dat-cf-point', 2),
        ask('dat-cf-count', 2),
        ask('dat-cf-below-slider', 2),
        ask('dat-cf-between', 2),
        ask('dat-cf-check', 2),
        ask('dat-cf-quartile-slider', 2),
        ask('dat-cf-iqr', 2),
        ask('dat-cf-rule', 2),
        ask('dat-pct-position', 2),
        ask('dat-pct-slider', 2),
        ask('dat-pct-range', 2),
        ask('dat-interp-class', 2),
        ask('dat-interp-tiles', 2),
        ask('dat-interp-value', 2),
      ],
    },
    {
      id: 'da-l5',
      title: 'Coding Data',
      lessons: [
        {
          id: 'da-l5-add',
          title: 'Adding a Constant',
          slides: [
            teach(
              prose('Adding the same number to every value slides the whole set of data along without changing its shape. Add $5$ to each of $3, 5, 6, 10$:'),
              working('3, 5, 6, 10 &\\to 8, 10, 11, 15', '\\bar{x} &= 6 \\to 11', '\\text{range} &= 7 \\to 7'),
              prose(
                'The mean went up by $5$, like every value. The range stayed at $7$: each gap between two values is as wide as before. Adding $c$ to every value:',
              ),
              working('\\text{new mean} &= \\bar{x} + c', '\\text{new } \\sigma &= \\sigma'),
              prose(
                'Every **average** (the mean, median and mode) goes up by $c$. Every **spread** (the range, IQR, standard deviation and variance) measures gaps, so it stays the same.',
              ),
            ),
            ask('dat-code-shift'),
            ask('dat-code-effect-flow'),
            ask('dat-code-shift-table'),
            teach(
              prose('Taking $c$ off every value works the same way: the averages go down by $c$, and the spreads still do not move.'),
              prose('A thermometer read $2$ degrees too high all week. The readings had a mean of $14.5$, a mode of $15$, an IQR of $4$ and a variance of $9.6$. Corrected:'),
              working('\\text{mean} &= 14.5 - 2 = 12.5', '\\text{mode} &= 15 - 2 = 13', '\\text{IQR} &= 4', '\\text{variance} &= 9.6'),
            ),
            ask('dat-code-shift+choice', 2),
            ask('dat-code-shift-table', 2),
            ask('dat-code-effect-flow'),
            teach(
              prose('Knowing the statistics **after** a change, undo it to find them before. Every value was increased by $4$, and now the mean is $20.5$ and the standard deviation is $3$:'),
              working('\\bar{x} &= 20.5 - 4 = 16.5', '\\sigma &= 3'),
              prose('Undo the change for the mean. The spread was never changed, so it stays. After a decrease, add the amount back. Every value was decreased by $3$, and the mean is now $40.2$:'),
              display('\\bar{x} = 40.2 + 3 = 43.2'),
            ),
            ask('dat-code-shift-back'),
            ask('dat-code-shift-back', 2),
          ],
          skillCheck: [ask('dat-code-shift', 2), ask('dat-code-shift-table', 2), ask('dat-code-shift-back', 2)],
        },
        {
          id: 'da-l5-multiply',
          title: 'Multiplying by a Constant',
          slides: [
            teach(
              prose('Multiplying every value by the same number stretches the data. Multiply each of $3, 5, 6, 10$ by $2$:'),
              working('3, 5, 6, 10 &\\to 6, 10, 12, 20', '\\bar{x} &= 6 \\to 12', '\\text{range} &= 7 \\to 14'),
              prose(
                'Every statistic doubles: the averages, and the spreads too, since every gap doubles. The variance is in squared units, so it goes up by $2^2 = 4$. Multiplying every value by $b$:',
              ),
              working('\\text{new mean} &= b\\bar{x}', '\\text{new } \\sigma &= b\\sigma', '\\text{new } \\sigma^2 &= b^2\\sigma^2'),
            ),
            ask('dat-code-scale'),
            ask('dat-code-scale-table'),
            ask('dat-code-scale+choice', 2),
            teach(
              prose('Multiplying and then adding, the multiplying acts on everything and the adding only on the averages. Values of $x$ with $\\bar{x} = 12$ and $\\sigma_x = 4$ are each changed to'),
              display('y = 3x + 5'),
              working('\\bar{y} &= 3 \\times 12 + 5 = 41', '\\sigma_y &= 3 \\times 4 = 12', '\\sigma_y^2 &= 12^2 = 144'),
              prose('The same holds for any $b$ and $c$:'),
              display('\\bar{y} = b\\bar{x} + c \\qquad \\sigma_y = b\\sigma_x'),
            ),
            ask('dat-code-bxc-tree'),
            ask('dat-code-effect-flow', 2),
            ask('dat-code-linear'),
            teach(
              prose('The number added can be taken off instead, and $b$ can be a decimal. With $\\bar{x} = 20$ and $\\sigma_x = 6$, each value is changed to'),
              display('y = 0.5x - 3'),
              working('\\bar{y} &= 0.5 \\times 20 - 3 = 7', '\\sigma_y &= 0.5 \\times 6 = 3', '\\sigma_y^2 &= 3^2 = 9'),
              prose('The $-3$ never touches the spread.'),
            ),
            ask('dat-code-linear+choice', 2),
            ask('dat-code-bxc-tree', 2),
          ],
          skillCheck: [ask('dat-code-scale', 2), ask('dat-code-linear', 2), ask('dat-code-bxc-tree', 2)],
        },
        {
          id: 'da-l5-coding',
          title: 'Coding and Decoding',
          slides: [
            teach(
              prose('**Coding** swaps awkward values for easy ones: take $a$ off every value, then divide by $b$.'),
              display('y = \\frac{x - a}{b}'),
              prose('With $a = 200$ and $b = 5$:'),
              working('205, 210, 220, 225 &\\to 1, 2, 4, 5', '\\bar{y} &= 12 \\div 4 = 3'),
              prose('**Decoding** goes back, and the mean follows the same rule:'),
              working('\\bar{x} &= a + b\\bar{y}', '&= 200 + 5 \\times 3 = 215'),
              prose('A value below $a$ codes to a negative: $195$ codes to $-1$.'),
            ),
            ask('dat-code-coded-table'),
            ask('dat-code-decode'),
            ask('dat-code-coded-table', 2),
            teach(
              prose('The $a$ only slides the data, so it leaves a spread alone; the $b$ stretches it. So only $b$ decodes a standard deviation, and $b^2$ a variance:'),
              working('\\sigma_x &= b\\sigma_y', '\\sigma_x^2 &= b^2\\sigma_y^2'),
              prose('With $b = 5$, a coded standard deviation of $1.5$ and a coded variance of $2.25$ decode to'),
              display('\\sigma_x = 5 \\times 1.5 = 7.5 \\qquad \\sigma_x^2 = 5^2 \\times 2.25 = 56.25'),
              prose('A negative coded mean decodes the same way:'),
              display('\\bar{x} = 200 + 5 \\times (-2) = 190'),
            ),
            ask('dat-code-decode-tiles'),
            ask('dat-code-decode+choice', 2),
            ask('dat-code-decode-tiles', 2),
            teach(
              prose('Going forwards, code the mean just as you would code one value, and divide a standard deviation by $b$. With $\\bar{x} = 215$, $\\sigma_x = 7.5$ and $a = 200$, $b = 5$:'),
              working('\\bar{y} &= \\frac{215 - 200}{5} = 3', '\\sigma_y &= \\frac{7.5}{5} = 1.5'),
              prose('A variance is divided by $b^2$:'),
              display('\\sigma_y^2 = 56.25 \\div 5^2 = 2.25'),
            ),
            ask('dat-code-encode'),
            ask('dat-code-encode+choice', 2),
          ],
          skillCheck: [ask('dat-code-decode', 2), ask('dat-code-decode-tiles', 2), ask('dat-code-encode', 2)],
        },
        {
          id: 'da-l5-sums',
          title: 'Variance from Coded Sums',
          slides: [
            teach(
              prose('Coding makes the sums for a variance small. Code $102, 104, 105, 109$ by taking $100$ off each, then square:'),
              display(
                '\\begin{array}{c|c|c} x & y & y^2 \\\\ \\hline 102 & 2 & 4 \\\\ 104 & 4 & 16 \\\\ 105 & 5 & 25 \\\\ 109 & 9 & 81 \\\\ \\hline \\sum & 20 & 126 \\end{array}',
              ),
              prose('Use the variance formula from Measures of Spread on $y$. Taking off $100$ only slides the data, so decoding adds $100$ to the mean and leaves the variance:'),
              working('\\bar{y} &= 20 \\div 4 = 5', '\\sigma_y^2 &= 126 \\div 4 - 5^2 = 6.5', '\\bar{x} &= 100 + 5 = 105', '\\sigma_x^2 &= 6.5'),
            ),
            ask('dat-code-sums-table'),
            ask('dat-code-sums-mean'),
            ask('dat-code-sums'),
            teach(
              prose('With a $b$ as well, decode at the end. $10$ values are coded with $y = \\frac{x - 50}{10}$, giving'),
              display('\\textstyle\\sum y = 20 \\qquad \\sum y^2 = 130'),
              working('\\bar{y} &= 20 \\div 10 = 2', '\\sigma_y^2 &= 130 \\div 10 - 2^2', '&= 13 - 4 = 9', '\\sigma_y &= \\sqrt{9} = 3'),
              working('\\bar{x} &= 50 + 10 \\times 2 = 70', '\\sigma_x &= 10 \\times 3 = 30', '\\sigma_x^2 &= 10^2 \\times 9 = 900'),
            ),
            ask('dat-code-var-tree'),
            ask('dat-code-sums-mean', 2),
            ask('dat-code-var-tree', 2),
            teach(
              prose('Three slips to watch for, using that example:'),
              prose(
                'The variance decodes by $b^2$, so it is $900$, not $90$. The $a$ is never added to a spread, so it is not $950$. And $\\sum y^2$ squares first and then adds: it is $130$, not the square of $\\sum y$, which is $400$.',
              ),
              prose('A negative coded value or coded mean still squares to a positive: $-3$ squares to $9$.'),
            ),
            ask('dat-code-sums+choice', 2),
            ask('dat-code-sums-table', 2),
          ],
          skillCheck: [ask('dat-code-var-tree', 2), ask('dat-code-sums-mean', 2), ask('dat-code-sums', 2)],
        },
        {
          id: 'da-l5-context',
          title: 'Coding in Context',
          slides: [
            teach(
              prose('Changing units is a coding in all but name. Temperatures with a mean of $15^\\circ\\text{C}$ and a standard deviation of $4^\\circ\\text{C}$ are converted to Fahrenheit with'),
              display('F = 1.8C + 32'),
              working('\\text{mean} &= 1.8 \\times 15 + 32 = 59', '\\text{SD} &= 1.8 \\times 4 = 7.2', '\\text{variance} &= 1.8^2 \\times 16 = 51.84'),
              prose('Marks out of $40$ turned into percentages are multiplied by $2.5$, with nothing added, so the mean and standard deviation are simply multiplied by $2.5$.'),
            ),
            ask('dat-code-convert'),
            ask('dat-code-effect-flow', 2),
            ask('dat-code-convert+choice', 2),
            teach(
              prose('A good coding makes the values small and whole. For equally spaced values, take $a$ as the middle value and $b$ as the gap. The values $1030, 1045, 1060, 1075, 1090$ are $15$ apart:'),
              display('y = \\frac{x - 1060}{15}'),
              prose('This codes them to $-2, -1, 0, 1, 2$. For $0, 1, 2, 3, 4$ instead, take $a$ as the smallest, $1030$. For $-4, -2, 0, 2, 4$, neighbours are $2$ apart once coded, so $b$ is half the gap, $7.5$.'),
            ),
            ask('dat-code-choose-tiles'),
            ask('dat-code-choose-tiles', 2),
            teach(
              prose('Two sets coded different ways cannot be compared by their coded numbers. Decode each first. Two farms coded the masses of their eggs:'),
              display('\\text{Farm A:} \\; y = x - 100 \\qquad \\text{Farm B:} \\; y = \\frac{x - 100}{2}'),
              display('\\begin{array}{l|c|c} & \\bar{y} & \\sigma_y \\\\ \\hline \\text{Farm A} & 4 & 3 \\\\ \\text{Farm B} & 3 & 2.5 \\end{array}'),
              working('\\bar{x}_A &= 100 + 4 = 104', '\\sigma_A &= 3', '\\bar{x}_B &= 100 + 2 \\times 3 = 106', '\\sigma_B &= 2 \\times 2.5 = 5'),
              prose('Farm B has the heavier eggs on average, and Farm A the more consistent ones: the coded numbers said the opposite on both.'),
            ),
            ask('dat-code-compare-table'),
            ask('dat-code-compare-flow'),
            ask('dat-code-compare-flow', 2),
          ],
          skillCheck: [ask('dat-code-convert', 2), ask('dat-code-choose-tiles', 2), ask('dat-code-compare-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dat-code-shift', 2),
        ask('dat-code-shift-table', 2),
        ask('dat-code-effect-flow', 2),
        ask('dat-code-scale', 2),
        ask('dat-code-linear', 2),
        ask('dat-code-bxc-tree', 2),
        ask('dat-code-coded-table', 2),
        ask('dat-code-decode', 2),
        ask('dat-code-encode', 2),
        ask('dat-code-sums-table', 2),
        ask('dat-code-var-tree', 2),
        ask('dat-code-sums', 2),
        ask('dat-code-convert', 2),
        ask('dat-code-choose-tiles', 2),
        ask('dat-code-compare-flow', 2),
      ],
    },
  ],
};
