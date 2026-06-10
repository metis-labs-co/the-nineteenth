package com.the.nineteenth.golf.wear.ui

import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.Colors

/**
 * Wear color palette, matching the phone/iOS brand (lime green #6eac4d, dark
 * variant #8bc26e). Applied once in WearApp's MaterialTheme so every screen's
 * MaterialTheme.colors.primary is brand green instead of the Wear default blue.
 */
val WearColors = Colors(
    primary = Color(0xFF8BC26E),
    primaryVariant = Color(0xFF6EAC4D),
    onPrimary = Color(0xFF0A1A05),
    secondary = Color(0xFF8BC26E),
    secondaryVariant = Color(0xFF6EAC4D),
    onSecondary = Color(0xFF0A1A05),
    error = Color(0xFFF59E0B),
)
