# Phase 0 palette changelog

Implementation baseline: `d409978a`

## Solid light

| Token | Previous | New | Mock role |
|---|---|---|---|
| `surfaceVariant` | `#e5e7eb` | `#f2f4ef` | `--c-tint` |
| `surfaceSelected` | `#ffffff` | `#f7f9f4` | `--c-active` |
| `border` | `#e5e7eb` | `#e7ebe2` | `--c-border` |
| `borderLight` | `#f3f4f6` | `#ecefe8` | `--c-border-h` |
| `textPrimary` | `#111827` | `#141b10` | `--c-text` |
| `textSecondary` | `#6b7280` | `#66705c` | AA-adjusted `--c-muted` |
| `textTertiary` | `#9ca3af` | `#8a9382` | `--c-label` |

`background`, `surface`, and `surfaceElevated` remain `#f3f4f6`, `#ffffff`, and
`#ffffff`. `primaryBackground` remains brand-derived (`#f1f7ed` for the default
brand), which is the accepted near-match for `--c-green-tint`.

## Solid dark

| Token | Previous | New | Mock role |
|---|---|---|---|
| `background` | `#0f1710` | `#0e140d` | `--c-screen` |
| `surface` / `surfaceElevated` | `#1a2518` | `#1c281a` | `--c-surface` |
| `surfaceVariant` | `#2d3b28` | `#232f20` | `--c-tint` |
| `surfaceSelected` | `#121a11` | `#24331b` | `--c-sel` |
| `border` | `#2d3b28` | `#2d3b27` | `--c-border` |
| `borderLight` | `#1a2518` | `#26331f` | `--c-border-h` |
| `textPrimary` | `#f1f5f9` | `#eef3ea` | `--c-text` |
| `textSecondary` | `#94a3b8` | `#909e7c` | `--c-muted` |
| `textTertiary` | `#64748b` | `#8b9980` | `--c-label` |
| `primaryBackground` | `#16220f` | `#21301a` | `--c-green-tint` |

The default brand's dark `primary` remains `#8bc26e`.

## Contrast checks

| Foreground / background | Ratio | Result |
|---|---:|---|
| Light `textSecondary` / `surface` | 5.20:1 | AA normal text |
| Light `textSecondary` / `background` | 4.73:1 | AA normal text |
| Dark `textPrimary` / `surface` | 13.63:1 | AAA |
| Dark `textSecondary` / `surface` | 5.39:1 | AA normal text |
| Dark `textTertiary` / `surface` | 5.09:1 | AA normal text |
| Dark `primary` / `primaryBackground` | 6.68:1 | AA normal text |

Light `textTertiary` remains the documented exception: `#8a9382` is 3.19:1 on
white. Phase 2 must audit existing `textTertiary` call sites and move meaningful
text to `textSecondary`.

## Accepted surface-style spillover

Translucent tint generation (`tinted.*`) is unchanged and is covered by a
regression test. Shared `background` (except image backdrop, which stays
transparent), `surfaceElevated`, and text tokens inherit the retune in
translucent mode as accepted in `PLAN.md` correction #10. The dark
`primaryBackground` correction is documented separately in corrections #9/#12.
