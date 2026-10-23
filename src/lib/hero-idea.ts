/** Window event the homepage hero fires with the visitor's idea text; ReportFirstHero runs it. */
export const HERO_IDEA_EVENT = 'quantis:hero-idea';

export function submitHeroIdea(text: string): void {
  window.dispatchEvent(new CustomEvent<string>(HERO_IDEA_EVENT, { detail: text }));
}
