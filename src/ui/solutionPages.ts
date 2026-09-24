/**
 * Space between two steps on one page that their measured heights leave out:
 * the top margin from `.solution-step + .solution-step`. The rule and padding
 * above a step are inside its height already.
 */
const STEP_GAP = 12;

/**
 * Groups worked-solution steps into pages that each fit `cap` pixels, in order.
 *
 * A step taller than the cap gets a page to itself and scrolls inside it,
 * rather than being cut, since a line of working cannot be split.
 */
export function packPages(heights: number[], cap: number): number[][] {
  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;
  heights.forEach((height, idx) => {
    const needed = page.length > 0 ? STEP_GAP + height : height;
    if (page.length > 0 && used + needed > cap) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += page.length > 0 ? STEP_GAP + height : height;
    page.push(idx);
  });
  if (page.length > 0) pages.push(page);
  return pages;
}
