# Phase 1B.2 Visibility — Competition Reader Audit

## Decision

Remove the blanket authenticated `competitions` SELECT policy. Direct row access is limited to the
primary organiser and accepted competition members. Invite-code discovery moves to a narrow
`SECURITY DEFINER` RPC returning only the join-screen fields.

## Reader classification

- Competition detail/settings, scoring, admin, statistics, subscription, skins/wolf and “My
  Competitions” readers operate for the organiser or an accepted member and continue through RLS.
- Home upcoming/in-progress round queries explicitly scope competition rounds to accepted
  memberships before embedding the competition row.
- Join-by-code is the only flow that intentionally reads a competition before membership. It must use
  `lookup_competition_by_invite_code`.
- Friend statistics may embed a competition name for a friend’s round when the viewer is not a
  competition member. Under private visibility that nested relationship may be absent; the round and
  friend statistics remain readable under their existing policies. This is intentional and prevents
  leaking private competition metadata.
- Notification and export paths run in trusted database/service contexts and do not depend on the
  blanket client policy.

## Policy/RPC shape

- Keep the existing owner-management policy.
- Replace the blanket invite-code SELECT policy with an accepted-member SELECT policy (the existing
  member policy remains compatible).
- `lookup_competition_by_invite_code(text)` requires an authenticated caller, normalizes the code,
  excludes soft-deleted competitions, and returns only fields used by the join preview plus accepted
  player count.
- Tier 1 does not change rounds, scorecards, discovery, or leaderboard RLS.
