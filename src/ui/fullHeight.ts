/**
 * The height the app should fill, in CSS pixels.
 *
 * Installed to an iPhone Home Screen with `black-translucent`, the page is
 * drawn under the status bar, but `height: 100%` still resolves to the screen
 * less the status bar. Every screen came out one status bar short, so a dead
 * band as tall as the notch sat under the Check button and at the foot of the
 * course list. In that mode the app owns the whole screen, so the screen's own
 * height is the honest answer.
 *
 * The screen size is used only when it is plausibly that shortfall: running
 * standalone, taller than the window, and by no more than a status bar and a
 * home indicator. Anywhere else (a browser tab, a desktop window) the window's
 * height stands, which is what `100%` gave before.
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
  return short > 0 && short <= 120 ? screenTall : innerHeight;
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
