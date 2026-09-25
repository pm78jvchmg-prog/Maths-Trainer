/**
 * How the installed app should fill the screen: its height in CSS pixels, and
 * whether it should still pad for the status bar.
 *
 * An installed Home Screen app on iOS 26 and later is placed one of two ways,
 * and not always the same way from one launch to the next (the status bar
 * style is read when the app is added to the Home Screen, so a change to it
 * in index.html does not reach an installed copy):
 *
 * - **Under the status bar.** The page starts at the top of the screen, but
 *   the window it reports is one status bar short (873 of 932pt on the
 *   owner's phone). `100%` follows the report and every screen stopped a
 *   status bar above the bottom, so the page is stretched to the screen, and
 *   the top safe-area inset keeps content clear of the clock.
 * - **Below the status bar.** The page starts under the clock, and the window
 *   is reported two status bars short (814). It gets one back, and the top
 *   inset, which iOS still reports, is dropped: padding for it opened an
 *   empty band as tall as the status bar above the streak.
 *
 * Anywhere else (a browser tab, a desktop window, a gap nothing like a status
 * bar) the window's own height stands with the inset as iOS gives it.
 */
export function appLayout(view: {
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
  standalone: boolean;
  landscape: boolean;
}): { height: number; dropTopInset: boolean } {
  const { innerHeight, screenWidth, screenHeight, standalone, landscape } = view;
  const asIs = { height: innerHeight, dropTopInset: false };
  if (!standalone) return asIs;
  // iOS reports the screen in portrait whichever way the phone is held.
  const screenTall = landscape ? Math.min(screenWidth, screenHeight) : Math.max(screenWidth, screenHeight);
  const short = screenTall - innerHeight;
  if (short > 0 && short < 80) return { height: screenTall, dropTopInset: false };
  if (short >= 80 && short <= 150) return { height: innerHeight + short / 2, dropTopInset: true };
  return asIs;
}

/** What the phone reported, for the readout in the streak view. */
export let lastReading = '';

/** Keeps `--app-height` and `--top-inset` on the root element in step with the window. */
export function installAppHeight(): void {
  const apply = () => {
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const view = {
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      standalone,
      landscape: window.matchMedia('(orientation: landscape)').matches,
    };
    const { height, dropTopInset } = appLayout(view);
    const root = document.documentElement.style;
    root.setProperty('--app-height', `${height}px`);
    if (dropTopInset) root.setProperty('--top-inset', '0px');
    else root.removeProperty('--top-inset');
    lastReading =
      `${view.screenWidth}x${view.screenHeight} · ${view.innerHeight} · ` +
      `${Math.round(window.visualViewport?.height ?? 0)} · ${document.documentElement.clientHeight} · ` +
      `${standalone ? 's' : 'b'} · ${height}${dropTopInset ? ' · no top' : ''}`;
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
