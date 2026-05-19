# Spec: WhatsApp Group Join on Competition Detail Screen

**Status**: Approved — ready for plan
**Author**: Sam (with Claude)
**Date**: 2026-05-19

---

## Context

The competition `whatsapp_group_invite_url` field already exists (see
`docs/plans/whatsapp-group-link.md`, migrations
`20260519000000_add_competition_whatsapp_link.sql` /
`20260519010000_fix_competition_whatsapp_constraint.sql`) and is exposed on the
Competition Settings screen. Members today must drill into Settings to find the
link.

Goal: surface a one-tap "Join WhatsApp Group" action on the Competition Detail
screen so accepted members can open the group without leaving the main flow.

---

## Design

### Visibility rules

Section renders only when **both**:

1. The current viewer is a player in this competition (`DetailsTab` already
   receives `isPlayer`).
2. `competition.whatsapp_group_invite_url` is non-null and matches
   `isValidWhatsAppInvite(...)` from `@/utils/whatsapp`.

Otherwise the section is hidden entirely — no "ask the organiser" placeholder.

Organisers are also players for this purpose; they get the same one-tap join
affordance without going to Settings. They keep the edit / share affordances on
the Settings screen (no edit UI on the Detail screen).

### Component

New file: `src/components/competitions/detail/sections/WhatsAppGroupSection.tsx`

Props:

```ts
interface WhatsAppGroupSectionProps {
  whatsappUrl: string | null | undefined;
  isPlayer: boolean;
}
```

Render: a single tappable card matching the section style used elsewhere on
`DetailsTab` (same surface card, padding, radius, shadow):

- WhatsApp `Icon` (left, `colors.primary`)
- Label "Join WhatsApp Group" (`typography.body`, `textPrimary`)
- Sub-label "Tap to open in WhatsApp" (`typography.small`, `textSecondary`)
- Chevron-right (right, `colors.textSecondary`)
- Min hit area 48dp; `accessibilityRole="button"`, `accessibilityLabel="Join
  WhatsApp group"`.

On press: `openWhatsAppGroup(whatsappUrl)`. The helper already handles the
not-installed / failed-to-open alerts.

Wrap the render body in the visibility-rule check; return `null` when hidden.

Export from `src/components/competitions/detail/sections/index.ts`.

### Wiring into `DetailsTab`

In `src/components/competitions/detail/DetailsTab.tsx`, render
`<WhatsAppGroupSection />` directly above `<SettingsSection />`:

```tsx
<WhatsAppGroupSection
  whatsappUrl={competition.whatsapp_group_invite_url}
  isPlayer={isPlayer}
/>
<SettingsSection ... />
```

Rationale for placement: it appears early enough to be discoverable without
scrolling, but below the in-progress round CTA and mini-leaderboard so it
doesn't overshadow live action. Groups it visually with the other
settings-style cards.

No new props need to flow into `DetailsTab` — `competition` and `isPlayer` are
already available.

### Out of scope

- No share-with-members button on the Detail screen (organisers keep that on
  Settings).
- No edit affordance on the Detail screen.
- No tracking of who has joined.
- No data-model, schema, hook, or migration changes.

---

## Files to change

### New

| Path | Purpose |
| --- | --- |
| `src/components/competitions/detail/sections/WhatsAppGroupSection.tsx` | New section component |
| `src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx` | Unit tests |

### Modified

| Path | Change |
| --- | --- |
| `src/components/competitions/detail/sections/index.ts` | Re-export `WhatsAppGroupSection` |
| `src/components/competitions/detail/DetailsTab.tsx` | Render `<WhatsAppGroupSection />` above `<SettingsSection />` |

---

## Verification

1. `pnpm type-check` clean.
2. `pnpm test src/components/competitions/detail/sections/WhatsAppGroupSection.test.tsx` passes.
3. Manual E2E in Expo Go:
   - Competition with valid `whatsapp_group_invite_url`, viewer is accepted
     player → section visible on Detail tab; tap opens WhatsApp (or browser
     fallback) to the group join screen.
   - Same competition, link cleared → section absent.
   - Same competition, viewer is not a player (e.g. via deep-link preview) →
     section absent.
   - Organiser view → section visible (organisers are players); tap behaves
     identically; edit/share affordances still live on Settings only.

---

## Test plan

`WhatsAppGroupSection.test.tsx` covers:

1. Renders nothing when `isPlayer === false`.
2. Renders nothing when `whatsappUrl` is null / empty / invalid (uses
   `isValidWhatsAppInvite`).
3. Renders the row when both conditions hold; pressing it calls
   `openWhatsAppGroup` with the URL (mock `@/utils/whatsapp`).

---

## Open questions

None.
