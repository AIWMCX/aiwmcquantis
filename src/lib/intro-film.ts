/** First-visit intro film (landing page): visibility rules + persistence. */
const SEEN_KEY = 'aiwmc.quantis.introFilm.v1';

/**
 * Decide on the client whether the intro should open by itself on load.
 *
 * Only for an explicit share link (?intro=1). A first-time visitor sees the
 * headline and primary CTA immediately; the film stays one click away
 * (hero "Watch the 25s film" button and showreel card). A full-screen film
 * over the offer delayed the CTA on first visits, slow connections and
 * video failure.
 */
export function shouldShowIntroFilm(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.webdriver) return false; // prerender / automation
    return new URLSearchParams(window.location.search).get('intro') === '1';
  } catch {
    return false;
  }
}

export function markIntroFilmSeen(): void {
  try { window.localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* private mode */ }
}
