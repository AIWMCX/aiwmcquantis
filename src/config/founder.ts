/**
 * The person behind the paid reviews (buy-blockers #16, #86, #93).
 * One place for the name, role and links shown on the offer pages.
 */
export const FOUNDER = {
  name: 'Bogdan Jeltov',
  role: 'Founder, AIWMC Quantis',
  linkedinUrl: 'https://www.linkedin.com/in/bogdan-jeltov/',
  /** Google Calendar booking page. The "Book a call" button is hidden while this is null. */
  bookingUrl: null as string | null,
  bookingMinutes: 20,
} as const;

/** Shown instead of a photo until a real portrait is supplied. */
export function founderInitials(): string {
  return FOUNDER.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase();
}
