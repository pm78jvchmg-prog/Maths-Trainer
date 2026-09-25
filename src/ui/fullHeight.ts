/**
 * The height the app should fill, in CSS pixels.
 *
 * Installed to an iPhone Home Screen with the `black` status bar (index.html),
 * iOS 26 and later lay the page out below the status bar, but the window it
 * reports is short by the status bar a second time: on a 932pt-tall phone with
 * a 59pt status bar the page gets 873pt of screen and reports 814. `100%`
 * follows the report, so every screen stopped 59pt above the bottom edge and
 * left a dark band there.
 *
 * So when the window is short of the screen by about two status bars, the
 * page is given one of them back. When it is short by about one, the window
 * already is the visible screen and stands as it is. Anywhere else (a browser
 * tab, a desktop window, a gap nothing like a status bar) the window's own
 * height stands, which is what `100%` gives.
 */
export function appHeight(view: {
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
  standalone: boolean;
  landscape: boolean;
}): number {
  const { innerHeight, screenWidth, screenHeight, standalone, landscape } = view;
  if (!standalone) return innerHeight;
  // iOS reports the screen in portrait whichever way the phone is held.
  const screenTall = landscape ? Math.min(screenWidth, screenHeight) : Math.max(screenWidth, screenHeight);
  const short = screenTall - innerHeight;
  // Two status bars: the one the page sits below, and the one it is short by.
  return short >= 80 && short <= 150 ? innerHeight + short / 2 : innerHeight;
}

/** Keeps `--app-height` on the root element in step with the window. */
export function installAppHeight(): void {
  const apply = () => {
    const standalone =
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    const height = appHeight({
      innerHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      standalone,
      landscape: window.matchMedia('(orientation: landscape)').matches,
    });
    document.documentElement.style.setProperty('--app-height', `${height}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
