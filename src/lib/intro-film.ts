/** First-visit intro film (landing page): visibility rules + persistence. */
const SEEN_KEY = 'aiwmc.quantis.introFilm.v1';

/** Decide on the client whether the intro should open for this visit. */
export function shouldShowIntroFilm(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('intro') === '1') return true;
    if (navigator.webdriver) return false; // prerender / automation
    if (sessionStorage.getItem('is_bot') === 'true') return false;
    return window.localStorage.getItem(SEEN_KEY) === null;
  } catch {
    return false; // storage blocked: don't risk showing it on every visit
  }
}

export function markIntroFilmSeen(): void {
  try { window.localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* private mode */ }
}
