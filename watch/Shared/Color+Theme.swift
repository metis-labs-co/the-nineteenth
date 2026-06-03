import SwiftUI

/// Brand + golf-score colors for the watch app, mirroring the phone app's
/// design tokens so the two stay visually consistent.
///
/// Sources of truth on the RN side:
///   • Brand primary / success / warning — `src/config/brands/theNineteenth.brand.ts`
///   • Golf score colors                  — same file, `golf` section
///   • Generated palette                  — `src/constants/colors.ts`
///
/// `brandPrimary` is read from the `AccentColor` asset, so it adapts to
/// light/dark automatically and matches the accent used by system controls.
/// Keep the literal values below in sync if the active brand changes.
extension Color {
    /// Brand primary — lime green `#6eac4d` (dark: `#8bc26e`). Same value the
    /// system uses for tinting via `AccentColor`.
    static let brandPrimary = Color("AccentColor")

    /// Semantic success — `#22c55e`. Used for the "Saved" confirmation.
    static let brandSuccess = Color(red: 0x22 / 255.0, green: 0xc5 / 255.0, blue: 0x5e / 255.0)

    /// Semantic warning — `#f59e0b`. Used for retry hints and penalty toggles.
    static let brandWarning = Color(red: 0xf5 / 255.0, green: 0x9e / 255.0, blue: 0x0b / 255.0)

    // MARK: Golf score colors (relative to par)

    /// Eagle or better — `#10b981`.
    static let scoreEagle = Color(red: 0x10 / 255.0, green: 0xb9 / 255.0, blue: 0x81 / 255.0)
    /// Birdie — `#3b82f6`.
    static let scoreBirdie = Color(red: 0x3b / 255.0, green: 0x82 / 255.0, blue: 0xf6 / 255.0)
    /// Bogey — `#dc4a1a`.
    static let scoreBogey = Color(red: 0xdc / 255.0, green: 0x4a / 255.0, blue: 0x1a / 255.0)
    /// Double bogey or worse — `#ef4444`.
    static let scoreDouble = Color(red: 0xef / 255.0, green: 0x44 / 255.0, blue: 0x44 / 255.0)

    /// Color for a gross score relative to par, mirroring the phone's score
    /// palette. Par uses `.primary` rather than the app's dark-grey par token —
    /// on the always-dark watch face dark grey wouldn't read.
    static func score(strokes: Int, par: Int) -> Color {
        switch strokes - par {
        case ...(-2): return .scoreEagle
        case -1: return .scoreBirdie
        case 0: return .primary
        case 1: return .scoreBogey
        default: return .scoreDouble
        }
    }
}
