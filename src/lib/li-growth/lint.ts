/**
 * LinkedIn Growth Agent draft lint, browser side.
 *
 * The implementation lives in supabase/functions/_shared/li-growth-lint.ts so
 * the li-growth-draft edge function and this page run the exact same checks:
 * the server re-lints before a draft can be approved, the page shows the same
 * result live while the founder edits.
 */
export {
  lintDraft,
  extractNumbers,
  countSentences,
  LENGTH_RULES,
  BANNED_OPENERS,
  BANNED_PHRASES,
  LI_DRAFT_ACTIONS,
  type LiDraftAction,
  type LiLintInput,
  type LiLintIssue,
  type LiLintReport,
  type LiLintCode,
} from '../../../supabase/functions/_shared/li-growth-lint';
