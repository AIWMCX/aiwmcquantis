/** Window event the homepage hero fires with the visitor's idea text; ReportFirstHero runs it. */
export const HERO_IDEA_EVENT = 'quantis:hero-idea';

/** Window event ReportFirstHero fires so the hero can show the run's state. */
export const HERO_RUN_EVENT = 'quantis:hero-run';

export type HeroRunState =
  | { phase: 'running' }
  | { phase: 'done' }
  | { phase: 'failed'; message?: string };

// The idea waits here until the runner takes it. A window event alone is lost
// when nothing is listening yet, so the runner also checks this when it mounts.
let pendingIdea: string | null = null;

export function submitHeroIdea(text: string): void {
  pendingIdea = text;
  window.dispatchEvent(new CustomEvent<string>(HERO_IDEA_EVENT, { detail: text }));
}

/** Returns the idea the hero sent and clears it, so each idea runs once. */
export function takePendingHeroIdea(): string | null {
  const text = pendingIdea;
  pendingIdea = null;
  return text;
}

export function publishHeroRunState(state: HeroRunState): void {
  window.dispatchEvent(new CustomEvent<HeroRunState>(HERO_RUN_EVENT, { detail: state }));
}
