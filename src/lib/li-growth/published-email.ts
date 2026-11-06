/**
 * Published email finder helpers, browser side.
 *
 * The implementation lives in supabase/functions/_shared/commercial/
 * published-email.ts so the li-enrich edge function and this page read a
 * prospect's address and its evidence the same way.
 */
export {
  channelEmail,
  latestEmailEvidence,
  type EmailKind,
  type PublishedEmailEvidence,
} from '../../../supabase/functions/_shared/commercial/published-email';
