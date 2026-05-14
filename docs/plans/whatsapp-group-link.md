# Plan: WhatsApp Group Link on Competition Settings

**Status**: Draft — pending approval
**Author**: Sam (with Claude)
**Date**: 2026-05-15

---

## Context

Competition organisers want a one-tap path to coordinate with members in WhatsApp, where most casual golf groups already chat. WhatsApp does **not** expose a public API for programmatic group creation from third-party apps — the only practical integration is via deep links (`https://chat.whatsapp.com/<code>`) and the OS share sheet.

The pragmatic solution: the organiser creates the WhatsApp group manually in WhatsApp once, pastes the invite link into Competition Settings, and the app exposes:

1. A **"Join WhatsApp Group"** entry-point for all accepted members (one tap → opens WhatsApp into the group).
2. A **"Share link"** button for organisers to broadcast via the native share sheet.

### What's deferred and why

A contact-roster export (sharing member phone numbers so the organiser can build the group quickly) was considered but is deferred — only 2 players currently have the optional `players.phone` field filled in, so the value of vCard export is near-zero today. Revisit if phone-capture adoption climbs (e.g. after a profile-completion nudge).

### Out of scope

- Phone-roster / vCard export
- Push notifications when a link is added
- Per-round (vs per-competition) WhatsApp groups
- Tracking which members have joined the WhatsApp group
- Auto-revoking the link when the competition ends

---

## Design

### Data model

Add a single nullable column to `competitions`:

```sql
ALTER TABLE competitions
  ADD COLUMN whatsapp_group_invite_url TEXT NULL;
```

No new GRANTs needed — existing grants on `competitions` cover added columns (the auto-grants rule applies to `CREATE TABLE` only).

### Validation

WhatsApp invite links follow `https://chat.whatsapp.com/<10–30 alphanumeric>`. Validate with a regex refinement (not just `.url()`) to reject other URLs that would silently fail when tapped:

```ts
whatsapp_group_invite_url: z
  .string()
  .trim()
  .regex(
    /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,30}$/,
    'Paste a WhatsApp group invite link (https://chat.whatsapp.com/...)'
  )
  .nullable()
  .optional(),
```

### UI: Competition Settings screen

Insert a new "WhatsApp Group" section between the existing **Invite Code** section (line 203-220 of `src/screens/competitions/CompetitionSettingsScreen/index.tsx`) and **Prize Pools** (line 224).

| Viewer | Link state | Rendered |
| --- | --- | --- |
| Organiser | Not set | "Add WhatsApp Group" row → opens edit sheet |
| Organiser | Set | Truncated link row with pencil → opens edit sheet. Below it: "Open in WhatsApp" row and "Share with members" row |
| Member (accepted) | Set | "Join WhatsApp Group" row → opens link |
| Member (accepted) | Not set | Section hidden |

The `isOrganizer` check (line 85) and accepted-member gating already exist on this screen.

### Edit sheet

New file: `src/components/competitions/detail/sections/sheets/EditWhatsAppLinkSheet.tsx`. Copy `EditDescriptionSheet.tsx` as the template, with these differences:

- Title: `"WhatsApp Group Link"`
- Single-line `FormInput` with `keyboardType="url"`, `autoCapitalize="none"`, `autoCorrect={false}`, `textContentType="URL"`
- Inline validation against the regex; show error when non-empty + invalid
- Help text above the input: *"In WhatsApp, create a group → tap the group name → Invite via Link → Copy. Paste the link here so members can join with one tap."*
- Saving an empty string clears the link (treats as remove)

### Sharing & opening

New utility `src/utils/whatsapp.ts` to centralise:

- `WHATSAPP_INVITE_PATTERN` (regex — single source of truth shared with the Zod schema)
- `isValidWhatsAppInvite(url)`
- `openWhatsAppGroup(url)` — wraps `Linking.openURL` with try/catch + user-facing alert on failure
- `shareWhatsAppLink(url, competitionName)` — wraps `Share.share` with a friendly message: `"Join the ${competitionName} WhatsApp group: ${url}"`

Universal link (`https://chat.whatsapp.com/...`) is preferred over the `whatsapp://` scheme — it opens WhatsApp when installed and falls back to a browser otherwise.

### Privacy

- Visibility matches the existing invite-code section: any member who can see settings can see the link. No new exposure surface.
- The link is plaintext in the DB. This is fine — WhatsApp invite links are designed for broad sharing. Revocation requires the organiser to reset the link in WhatsApp itself (mention this in the sheet's help text).

---

## Files to change

### New files

| Path | Purpose |
| --- | --- |
| `supabase/migrations/20260515010000_add_competition_whatsapp_link.sql` | ALTER TABLE migration |
| `src/utils/whatsapp.ts` | Validation regex + open/share helpers |
| `src/components/competitions/detail/sections/sheets/EditWhatsAppLinkSheet.tsx` | Organiser edit sheet |

### Modified files

| Path | Change |
| --- | --- |
| `src/types/database/competition.types.ts` (~line 71) | Add `whatsapp_group_invite_url: string \| null` to Competition row |
| `src/types/supabase.ts` | Regenerate via `supabase gen types typescript --local`, or manually mirror the new column in the generated Row/Insert/Update types |
| `src/schemas/competition.ts` | Add the field with regex refinement |
| `src/components/competitions/detail/sections/sheets/useUpdateCompetitionField.ts` (line 7-19) | Extend `CompetitionUpdate` `Pick<>` union to include `'whatsapp_group_invite_url'` |
| `src/screens/competitions/CompetitionSettingsScreen/index.tsx` | New "WhatsApp Group" section + sheet wiring |

### Reusable patterns to lift

| What | From | For |
| --- | --- | --- |
| Bottom-sheet edit pattern | `EditDescriptionSheet.tsx` | New WhatsApp link sheet |
| `Share.share` template | `CompetitionSettingsScreen.handleShare` (line 101-106) | `shareWhatsAppLink` helper |
| `Linking.openURL` pattern | `src/screens/courses/ClubScreen.tsx` | `openWhatsAppGroup` helper |
| Centralised competition mutation | `useUpdateCompetitionField` | Save the new field |

---

## Verification

1. **Type-check**: `pnpm type-check` after type changes.
2. **Migration**: `supabase db reset` (or `supabase migration up`) → `\d competitions` shows the new column.
3. **Manual E2E** in Expo Go on iOS + Android:
   - As organiser on a competition with no link:
     - Settings shows "Add WhatsApp Group" row → tap → sheet opens.
     - Paste `https://example.com` → validation error shown.
     - Paste `https://chat.whatsapp.com/AbCdEfGhIjKl` → save → sheet closes → row updates to show the link.
   - Still as organiser:
     - Tap "Open in WhatsApp" → WhatsApp launches into the group join screen (or browser fallback if WhatsApp not installed).
     - Tap "Share with members" → system share sheet opens with the formatted message.
     - Edit the link → saves correctly.
     - Save an empty string → row reverts to "Add WhatsApp Group".
   - Sign in as a second accepted member:
     - Settings shows "Join WhatsApp Group" row → tap → opens WhatsApp.
   - With the link cleared, member view hides the section entirely.
4. **Edge cases**:
   - Linking on a device without WhatsApp installed → universal link should open browser fallback gracefully.
   - Pasting a link with trailing whitespace → the `.trim()` in the schema handles it.

---

## Open questions

None blocking. The deferred phone-roster export can be reopened later if profile completion improves.

---

## Implementation order

1. Migration + types + schema + `CompetitionUpdate` union (mechanical type plumbing — verify with `pnpm type-check`).
2. `src/utils/whatsapp.ts` helpers.
3. `EditWhatsAppLinkSheet.tsx`.
4. Wire section into `CompetitionSettingsScreen`.
5. Manual E2E pass on iOS + Android.
