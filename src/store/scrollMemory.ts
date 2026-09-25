/**
 * Where each list was scrolled to, so coming back to it lands where you left
 * it rather than at the top.
 *
 * Kept apart from the progress store on purpose: a scroll position is not
 * progress and must never be written alongside it. It lives in memory, backed
 * by `sessionStorage` so it also survives iOS reloading the Home Screen app
 * while it is in the background. Storage can be missing or refuse a write
 * (private mode, a full quota); memory alone is then the fallback.
 */
const PREFIX = 'scroll:';
const memory = new Map<string, number>();

export function recallScroll(key: string): number {
  const held = memory.get(key);
  if (held !== undefined) return held;
  try {
    const stored = Number(sessionStorage.getItem(PREFIX + key));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

export function rememberScroll(key: string, y: number): void {
  const at = Math.max(0, Math.round(y));
  memory.set(key, at);
  try {
    sessionStorage.setItem(PREFIX + key, String(at));
  } catch {
    // Memory still holds it for this sitting.
  }
}
