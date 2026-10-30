/**
 * Names of the directories the homepage hero lists, in display order.
 * Kept as plain strings so the landing bundle does not ship the whole
 * directory tracker (src/data/directorySubmissions.ts). A test checks this
 * list still matches FEATURED_IDS in FeaturedDirectories.tsx.
 */
export const FEATURED_DIRECTORY_NAMES: readonly string[] = [
  'Product Hunt', 'PeerPush', '1000 AI Tools', 'SaaSHub', 'AlternativeTo', 'Futurepedia',
  'FutureTools.io', 'Dang.ai', 'ToolPilot AI', 'AI Tools Directory', 'Insidr.ai',
  'Website Launches', 'DevHunt', 'Crunchbase', 'BetaList', 'IndieHackers', 'Fazier',
  'StackShare', 'DodoPayments Index', 'Uneed', 'Aura++',
];
