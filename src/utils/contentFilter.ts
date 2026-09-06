// src/utils/contentFilter.ts

/**
 * Word list for the Guideline 1.2 "filter objectionable material" requirement.
 *
 * Deliberately a simple list, not classification. The goal is a good-faith
 * filter on the way in; anything it misses is caught by reporting.
 *
 * SLUR_EXAMPLE is a placeholder kept so the tests are readable and the file can
 * be reviewed without shipping slurs in the diff. Replace with a real list
 * before submission — see the note in the Deployment section of the plan.
 *
 * ⚠️ MUST be kept in sync with contains_blocked_terms() in
 * supabase/migrations/20260905000200_ugc_content_filter.sql. This check is UX
 * (it stops an honest user before they post); the database trigger is the
 * enforcement, because a modified client can skip this one entirely.
 */
export const BLOCKED_TERMS: readonly string[] = ['slur_example'];

/** Escapes regex metacharacters so terms are matched literally. */
function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether the text contains a blocked term as a whole word.
 *
 * Word-boundary matched so an innocent word containing a term as a substring
 * is not rejected.
 */
export function containsBlockedTerms(text: string): boolean {
  if (!text) return false;
  return BLOCKED_TERMS.some((term) =>
    new RegExp(`\\b${escapeRegex(term)}\\b`, 'i').test(text)
  );
}
