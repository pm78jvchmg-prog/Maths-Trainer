/**
 * Whether the installed app should still pad for the status bar.
 *
 * An installed Home Screen app on iOS 26 is placed one of two ways, and not
 * always the same way from one launch to the next:
 *
 * - **Under the status bar.** The page starts at the top of the screen and
 *   the top safe-area inset keeps content clear of the clock. The window is
 *   one status bar short of the screen (873 of 932pt on the owner's phone),
 *   and nothing on the page can reach the strip below it.
 * - **Below the status bar.** The page starts under the clock and the window
 *   is two status bars short (814), but iOS still reports the top inset.
 *   Padding for it opened an empty band as tall as the status bar above the
 *   streak, so it is dropped.
 *
 * Anywhere else (a browser tab, a desktop window) the inset stands as given.
 */
export function dropsTopInset(view: {
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
  standalone: boolean;
  landscape: boolean;
}): boolean {
  const { innerHeight, screenWidth, screenHeight, standalone, landscape } = view;
  if (!standalone) return false;
  // iOS reports the screen in portrait whichever way the phone is held.
  const screenTall = landscape ? Math.min(screenWidth, screenHeight) : Math.max(screenWidth, screenHeight);
  const short = screenTall - innerHeight;
  return short >= 80 && short <= 150;
}

/** Keeps `--top-inset` on the root element in step with the window. */
export function installTopInset(): void {
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
    const drop = dropsTopInset(view);
    const root = document.documentElement.style;
    if (drop) root.setProperty('--top-inset', '0px');
    else root.removeProperty('--top-inset');
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
