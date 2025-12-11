# Design Aesthetic Guidelines

## Overview

This document defines the visual and interaction design principles for **The Nineteenth** golf competition app. All screens, components, and interactions should follow these guidelines to ensure a consistent, polished user experience.

## Design Philosophy

### Core Aesthetic: Stripe/Apple Minimalism

The app follows a **clean, minimal, modern aesthetic** inspired by Stripe and Apple:

- **Generous white space** - Let content breathe; don't crowd elements
- **Subtle elevation** - Use soft shadows and gentle layers, not harsh borders
- **Minimal decoration** - Remove unnecessary visual elements; focus on content
- **Clear hierarchy** - Use size, weight, spacing, and color to guide attention
- **Smooth interactions** - Subtle animations and transitions feel natural and polished
- **Content-first** - Prioritize readability and usability over visual flourishes

### Design Principles

1. **Clarity over decoration** - Every visual element should serve a purpose
2. **Consistency over creativity** - Reuse patterns; don't reinvent for each screen
3. **Simplicity over complexity** - Use the minimum viable design solution
4. **Space over density** - Generous padding makes interfaces feel premium
5. **Subtlety over boldness** - Gentle animations, soft shadows, muted accents

---

## Screen Structure

### Mandatory Layout Pattern

**ALL screens MUST follow this structure:**

```
┌─────────────────────────────────────┐
│         PAGE HEADER                 │  ← Consistent header component
├─────────────────────────────────────┤
│                                     │
│                                     │
│         CONTENT AREA                │  ← Scrollable content
│                                     │
│                                     │
├─────────────────────────────────────┤
│      NAVIGATION FOOTER              │  ← Consistent bottom nav
└─────────────────────────────────────┘
```

### Header Component Requirements

- **Height**: 56dp (Android) / 44dp (iOS) + safe area insets
- **Background**: Surface color from design tokens
- **Elevation**: Subtle (2dp Android / soft shadow iOS)
- **Content**:
  - Left: Back button (if applicable) or hamburger menu
  - Center: Page title (typography: `titleLarge`, 20sp, medium weight)
  - Right: Action buttons (max 2, icons only)
- **Padding**: 16dp horizontal
- **Behavior**:
  - Fixed position at top
  - May optionally scroll away on certain content-heavy screens
  - Must use safe area insets for notch/Dynamic Island

### Navigation Footer Requirements

- **Height**: 64dp + safe area insets
- **Background**: Surface color with subtle top border or elevation
- **Items**: 3-5 navigation items (icons + labels)
- **Icon size**: 24dp
- **Label typography**: `labelSmall` (11sp, medium weight)
- **Active state**: Filled pill background with primary color at 12% opacity
- **Touch targets**: Minimum 48dp × 48dp
- **Behavior**:
  - Fixed position at bottom
  - Must hide when keyboard is shown
  - Must use safe area insets for home indicator

### Content Area

- **Background**: Background color from design tokens
- **Padding**: Minimum 16dp on all sides (mobile), 24dp for larger screens
- **Scroll behavior**:
  - Always scrollable (even if content doesn't overflow)
  - Use `ScrollView` or `FlatList` as appropriate
  - Respect keyboard - scroll to focused input
- **Safe area**: Content must respect safe area insets

---

## Spacing System

### Consistent Padding/Margins

Use the design token spacing scale consistently throughout:

| Token | Value | Usage |
|-------|-------|-------|
| `spacing-2` | 8dp | Tight spacing between related elements |
| `spacing-3` | 12dp | Compact component internal padding |
| `spacing-4` | 16dp | **DEFAULT**: Screen edges, card padding, component spacing |
| `spacing-5` | 20dp | Comfortable list item padding |
| `spacing-6` | 24dp | Section spacing within a screen |
| `spacing-8` | 32dp | Major section breaks |
| `spacing-12` | 48dp | Screen section headers |

### Spacing Rules

1. **Screen edges**: Always use `spacing-4` (16dp) minimum
2. **Between sections**: Use `spacing-6` (24dp) or `spacing-8` (32dp)
3. **Card/container padding**: Use `spacing-4` (16dp) or `spacing-5` (20dp)
4. **Form field spacing**: Use `spacing-4` (16dp) between fields
5. **Button padding**: Use `spacing-3` (12dp) vertical, `spacing-6` (24dp) horizontal
6. **List item padding**: Use `spacing-4` (16dp) or `spacing-5` (20dp)

### Vertical Rhythm

Maintain consistent vertical spacing:

```
Screen Top (Header: 56dp)
  ↓ spacing-6 (24dp)
Section Heading
  ↓ spacing-4 (16dp)
Card/Content Block
  ↓ spacing-4 (16dp)
Card/Content Block
  ↓ spacing-8 (32dp)
Section Heading
  ↓ spacing-4 (16dp)
...
```

---

## Color System

### Color Palette Usage

Reference: See `@repo/design-tokens` for complete palette

#### Primary Colors
- **Primary (Blue)**: Main brand color, primary actions, active states
  - Use `primary-600` for buttons and key actions
  - Use `primary-100` for subtle backgrounds
  - Use `primary-50` for hover states

#### Neutral Colors (Gray Scale)
- **Gray 50-900**: Text, backgrounds, borders
  - Use `gray-900` for primary text (light mode)
  - Use `gray-600` for secondary text
  - Use `gray-400` for disabled text
  - Use `gray-200` for borders
  - Use `gray-100` for subtle backgrounds
  - Use `gray-50` for surface colors

#### Semantic Colors
- **Success (Green)**: Confirmations, success states
- **Warning (Orange)**: Warnings, caution states
- **Error (Red)**: Errors, destructive actions
- **Info (Blue)**: Informational messages

### Color Application Rules

1. **Backgrounds**:
   - Screen background: `gray-50` (light) / `gray-900` (dark)
   - Card/surface: `white` (light) / `gray-800` (dark)
   - Subtle backgrounds: `gray-100` (light) / `gray-700` (dark)

2. **Text**:
   - Primary text: `gray-900` (light) / `gray-100` (dark)
   - Secondary text: `gray-600` (light) / `gray-400` (dark)
   - Disabled text: `gray-400` (light) / `gray-600` (dark)

3. **Borders**:
   - Default borders: `gray-200` (light) / `gray-700` (dark)
   - Subtle borders: `gray-100` (light) / `gray-800` (dark)
   - Focus borders: `primary-600`

4. **Interactive Elements**:
   - Primary buttons: `primary-600` background
   - Secondary buttons: Transparent with `primary-600` border
   - Hover states: Darken/lighten by one shade
   - Active states: Use `primary` color or `primary-100` background

### Color Don'ts

❌ Don't use more than 2-3 colors per screen (beyond neutrals)
❌ Don't use pure black `#000000` - use `gray-900` instead
❌ Don't use colored backgrounds for large areas (except subtle grays)
❌ Don't mix semantic colors (e.g., green success with red error side by side)
❌ Don't use bright, saturated colors for backgrounds

---

## Typography

### Type Scale

Use React Native Paper's typography variants consistently:

| Variant | Size | Weight | Usage |
|---------|------|--------|-------|
| `displayLarge` | 57sp | Regular | Hero titles, splash screens |
| `displayMedium` | 45sp | Regular | Large feature titles |
| `displaySmall` | 36sp | Regular | Section titles (rare) |
| `headlineLarge` | 32sp | Regular | Screen titles (large) |
| `headlineMedium` | 28sp | Regular | Screen titles |
| `headlineSmall` | 24sp | Regular | Card/section headers |
| `titleLarge` | 22sp | Medium | **Header titles** |
| `titleMedium` | 16sp | Medium | List item titles |
| `titleSmall` | 14sp | Medium | Small card titles |
| `bodyLarge` | 16sp | Regular | Body text (prominent) |
| `bodyMedium` | 14sp | Regular | **Default body text** |
| `bodySmall` | 12sp | Regular | Small body text, captions |
| `labelLarge` | 14sp | Medium | Button labels |
| `labelMedium` | 12sp | Medium | Form labels, small buttons |
| `labelSmall` | 11sp | Medium | **Navigation labels, badges** |

### Typography Hierarchy Rules

1. **One h1 per screen**: Use `headlineMedium` or `headlineLarge` for the main screen title
2. **Section headers**: Use `headlineSmall` (24sp) or `titleLarge` (22sp)
3. **Body text**: Always use `bodyMedium` (14sp) as default
4. **Labels**: Use `labelMedium` (12sp) for form labels
5. **Captions**: Use `bodySmall` (12sp) for helper text
6. **Navigation**: Use `labelSmall` (11sp) for bottom nav labels

### Typography Best Practices

✅ Use consistent variants - don't create custom font sizes
✅ Maintain clear hierarchy - each screen should have obvious levels
✅ Use medium/semibold weight for emphasis, not size increases
✅ Keep line length comfortable: 50-75 characters max
✅ Use sufficient line height: 1.5 for body text, 1.3 for headings

❌ Don't use more than 3 font sizes on a single screen
❌ Don't use ALL CAPS except for tiny labels (badges, tags)
❌ Don't use font sizes smaller than 11sp (accessibility)
❌ Don't use italic except for subtle emphasis (quotes, etc.)

---

## Components & Patterns

### Component Consistency Rules

1. **Use React Native Paper components** as the foundation
2. **Reuse existing components** before creating new ones
3. **Follow established patterns** from existing screens
4. **Maintain consistent props** across similar components

### Common Component Patterns

#### Cards

```typescript
// Standard card pattern
<Card style={{ margin: spacing[4] }}>
  <Card.Content style={{ padding: spacing[4] }}>
    {/* Card content */}
  </Card.Content>
</Card>
```

**Card Rules:**
- Padding: `spacing-4` (16dp) or `spacing-5` (20dp)
- Border radius: `radius-lg` (12dp)
- Elevation: `elevation-1` (subtle shadow)
- Background: Surface color
- Margin: `spacing-4` (16dp) between cards

#### Buttons

**Primary Button:**
- Background: `primary-600`
- Height: 48dp (comfortable touch target)
- Padding: 12dp vertical, 24dp horizontal
- Border radius: `radius-md` (8dp)
- Typography: `labelLarge` (14sp, medium)

**Secondary Button:**
- Background: Transparent
- Border: 1px solid `primary-600`
- Same sizing as primary

**Text Button:**
- Background: Transparent
- No border
- Color: `primary-600`
- Padding: 8dp vertical, 16dp horizontal

#### Form Fields

```typescript
// Standard input pattern
<TextInput
  label="Field Label"
  placeholder="Placeholder text"
  mode="outlined"
  style={{ marginBottom: spacing[4] }}
/>
```

**Input Rules:**
- Mode: `outlined` (consistent border style)
- Height: 56dp (comfortable touch target)
- Margin: `spacing-4` (16dp) between fields
- Label: Always include descriptive labels
- Error state: Show below field, use `error` color

#### Lists

**List Item Pattern:**
- Height: 56dp minimum (single line), 72dp (two lines), 88dp (three lines)
- Padding: `spacing-4` (16dp) horizontal, `spacing-3` (12dp) vertical
- Separator: 1px `gray-200` (not after last item)
- Touch feedback: Ripple effect on press
- Icon: 24dp, left aligned with 16dp right margin
- Typography: `titleMedium` (16sp) for title, `bodyMedium` (14sp) for subtitle

#### Empty States

Always include empty states for lists/content areas:
- Icon: 64dp, centered, `gray-400` color
- Title: `titleLarge` (22sp), centered
- Description: `bodyMedium` (14sp), centered, `gray-600` color
- Action button: Primary button if action available
- Padding: `spacing-8` (32dp) all sides

#### Loading States

- **Skeleton screens**: Use for initial loads
- **Spinners**: Use for actions/updates (centered, `primary-600` color)
- **Pull-to-refresh**: Use for list refreshes
- **Inline loading**: Use for partial updates

#### Error States

- **Full screen error**: Use for critical failures (network, crash)
  - Icon: 64dp error icon
  - Title: Clear error message
  - Description: What to do next
  - Action: "Retry" button

- **Inline error**: Use for form validation or minor issues
  - Show below field/component
  - Use `error` color
  - Icon (optional): 16dp error icon
  - Typography: `bodySmall` (12sp)

---

## Elevation & Shadows

### Elevation Scale

Use subtle elevation to create depth:

| Level | Usage |
|-------|-------|
| `elevation-0` | Flat surfaces (default background) |
| `elevation-1` | Cards, elevated components (2dp shadow) |
| `elevation-2` | Headers, sticky elements (4dp shadow) |
| `elevation-3` | Modals, dialogs (8dp shadow) |
| `elevation-4` | Floating action buttons (12dp shadow) |

### Shadow Guidelines

✅ Use soft, subtle shadows (low opacity, larger blur radius)
✅ Use elevation consistently across similar components
✅ Use higher elevation for interactive/important elements

❌ Don't use harsh, dark shadows
❌ Don't overuse elevation - most content should be flat
❌ Don't mix elevation levels randomly

---

## Border Radius

### Radius Scale

Use consistent corner rounding:

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4dp | Small badges, tags |
| `radius-md` | 8dp | **Buttons, inputs** |
| `radius-lg` | 12dp | **Cards, containers** |
| `radius-xl` | 16dp | Large cards, bottom sheets |
| `radius-2xl` | 24dp | Modals, hero elements |
| `radius-full` | 9999dp | Pills, avatar, circular buttons |

### Radius Rules

1. **Buttons**: Use `radius-md` (8dp)
2. **Cards**: Use `radius-lg` (12dp)
3. **Inputs**: Use `radius-md` (8dp)
4. **Avatars**: Use `radius-full`
5. **Pills/badges**: Use `radius-full`
6. **Modals**: Use `radius-xl` (16dp) or `radius-2xl` (24dp)

❌ Don't mix radius values on the same component
❌ Don't use sharp corners (0dp) except for full-bleed elements

---

## Iconography

### Icon Libraries

The app uses two icon libraries. Choose based on context:

| Library | Import | Usage |
|---------|--------|-------|
| **Tabler Icons** | `@tabler/icons-react-native` | Primary choice for custom icons, navigation, actions |
| **React Native Paper Icon** | `react-native-paper` | Material Community Icons for standard UI elements |

### Standard Icon Sizes

Use consistent icon sizes throughout the app:

| Size | Value | Usage |
|------|-------|-------|
| `xs` | 14dp | Inline text icons, timestamps |
| `sm` | 16dp | Detail icons (date, location, count) |
| `md` | 20dp | Card icons, list item icons |
| `lg` | 24dp | Navigation icons, action buttons |
| `xl` | 32dp | Feature icons, section headers |
| `xxl` | 48dp | Empty states, error states, hero icons |

### Icon Color Usage

Apply colors consistently based on context:

| Context | Color Token | Usage |
|---------|-------------|-------|
| **Primary action** | `colors.primary` | Active nav, primary buttons |
| **Secondary/info** | `colors.textSecondary` | Detail icons, metadata |
| **Success** | `colors.success` | Confirmation, completed states |
| **Warning** | `colors.warning` | Caution states |
| **Error** | `colors.error` | Error states, destructive actions |
| **Disabled** | `colors.textDisabled` | Inactive elements |

### Icon Implementation Patterns

**Tabler Icons (Preferred for custom icons):**
```typescript
import { IconGolf, IconCalendar, IconUsers } from '@tabler/icons-react-native';

// Usage
<IconGolf size={20} color={colors.textSecondary} />
<IconCalendar size={16} color={colors.textSecondary} />
```

**React Native Paper Icon (For standard Material icons):**
```typescript
import { Icon } from 'react-native-paper';

// Usage
<Icon source="chevron-right" size={24} color={colors.textSecondary} />
<Icon source="star" size={20} color={colors.warning} />
```

### Common Icon Mapping

| Purpose | Tabler Icon | Size | Color |
|---------|-------------|------|-------|
| Golf/Course | `IconGolf` | 20 | textSecondary |
| Trophy/Winner | `IconTrophy` | 20 | warning |
| Calendar/Date | `IconCalendar` | 16 | textSecondary |
| Clock/Time | `IconClock` | 14 | textSecondary |
| Location | `IconMapPin` | 16 | textSecondary |
| Users/Players | `IconUsers` | 16 | textSecondary |
| Search | `IconSearch` | 24 | textSecondary |
| Back arrow | `IconArrowLeft` | 24 | textPrimary |
| Chevron right | `IconChevronRight` | 20 | gray400 |
| Add/Plus | `IconPlus` | 24 | white (on primary bg) |
| Error/Alert | `IconAlertTriangle` | 48 | error |
| Chart/Stats | `IconChartBar` | 48 | textSecondary |
| Clipboard | `IconClipboard` | 20 | textSecondary |
| Mail/Email | `IconMail` | 48 | textSecondary |

### Icon Guidelines

✅ **DO:**
- Use Tabler Icons for most custom iconography
- Match icon size to context (smaller for details, larger for empty states)
- Use `textSecondary` color for informational icons
- Provide adequate touch targets (minimum 44dp) around interactive icons
- Use consistent icon style across related components

❌ **DON'T:**
- **NEVER use emojis in production code** - emojis render inconsistently across platforms and don't scale properly
- Don't mix icon styles (outlined vs filled) within the same context
- Don't use icons smaller than 14dp (accessibility)
- Don't use icons without accessible labels for interactive elements
- Don't create custom icons when a standard icon exists

### Empty State Icons

For empty states, use large icons (48dp) centered above the message:

```typescript
// Empty state pattern
<View style={styles.emptyContainer}>
  <View style={styles.emptyIconContainer}>
    <IconChartBar size={48} color={colors.gray400} />
  </View>
  <Text style={styles.emptyTitle}>No data yet</Text>
  <Text style={styles.emptyMessage}>Start tracking to see your stats</Text>
</View>

// Style for icon container
emptyIconContainer: {
  width: 80,
  height: 80,
  borderRadius: borderRadius.full,
  backgroundColor: colors.gray200,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: spacing.lg,
}
```

### Error State Icons

For error states, use warning/error colored icons:

```typescript
<View style={styles.errorContainer}>
  <IconAlertTriangle size={48} color={colors.error} />
  <Text style={styles.errorTitle}>Something went wrong</Text>
  <Text style={styles.errorMessage}>Please try again later</Text>
</View>
```

---

## Interaction & Animation

### Touch Feedback

All interactive elements MUST provide feedback:

1. **Ripple effect** (Android): Use React Native Paper's built-in ripple
2. **Opacity change** (iOS): Reduce opacity to 0.7 on press
3. **Scale animation**: Subtle scale down (0.98) for button presses
4. **Color change**: Darken/lighten background on hover/press

### Animation Timing

Use consistent timing for smooth, natural animations:

| Duration | Usage |
|----------|-------|
| 150ms | Quick transitions (opacity, color changes) |
| 250ms | Standard transitions (slide, scale) |
| 350ms | Larger movements (modal enter/exit) |
| 500ms | Complex transitions (multi-step animations) |

### Animation Easing

- **Ease-out**: For elements entering the screen (decelerating)
- **Ease-in**: For elements exiting the screen (accelerating)
- **Ease-in-out**: For elements moving within the screen

### Animation Guidelines

✅ Animate position, scale, opacity
✅ Use Reanimated for complex gestures
✅ Keep animations subtle and purposeful
✅ Respect reduced motion preferences

❌ Don't animate for animation's sake
❌ Don't use long durations (>500ms) for UI transitions
❌ Don't animate too many properties at once
❌ Don't block user interaction during animations

---

## Platform-Specific Adaptations

### iOS vs Android Differences

**Handle platform-specific behaviors:**

#### Navigation
- **iOS**: Use back swipe gesture, back button shows "< Back" with previous screen name
- **Android**: Use system back button, back button shows "←" icon only

#### Elevation
- **iOS**: Use subtle shadow with offset
- **Android**: Use Material elevation (shadow radius without offset)

#### Typography
- **iOS**: San Francisco font (system default)
- **Android**: Roboto font (system default)

#### Status Bar
- **iOS**: Respect safe area for notch/Dynamic Island
- **Android**: Handle different status bar heights

#### Keyboard
- **iOS**: Dismiss keyboard with scroll drag
- **Android**: Show/hide keyboard button in navigation

### Platform-Specific Code Pattern

```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  header: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
```

---

## Accessibility

### Minimum Requirements

ALL components MUST be accessible:

1. **Touch targets**: Minimum 48dp × 48dp
2. **Color contrast**: 4.5:1 for normal text, 3:1 for large text
3. **Focus indicators**: Visible focus state for keyboard navigation
4. **Labels**: All interactive elements must have accessible labels
5. **Screen reader support**: Use `accessibilityLabel`, `accessibilityHint`, `accessibilityRole`

### Accessibility Checklist

✅ Test with screen reader enabled (TalkBack/VoiceOver)
✅ Test with large font sizes (accessibility settings)
✅ Test keyboard navigation (if applicable)
✅ Provide text alternatives for icons/images
✅ Use semantic HTML/components (headings, buttons, etc.)
✅ Don't rely on color alone to convey information

---

## Do's and Don'ts Summary

### Layout & Structure

✅ **DO** use the header + content + footer pattern on every screen
✅ **DO** use consistent padding (16dp minimum at screen edges)
✅ **DO** respect safe area insets on all devices
✅ **DO** hide navigation footer when keyboard is shown

❌ **DON'T** create screens without headers or navigation
❌ **DON'T** use inconsistent spacing between screens
❌ **DON'T** let content extend under the status bar or home indicator

### Visual Design

✅ **DO** use generous white space between sections
✅ **DO** use subtle shadows and elevation
✅ **DO** stick to the defined color palette
✅ **DO** maintain clear typography hierarchy

❌ **DON'T** crowd elements together
❌ **DON'T** use harsh borders or heavy shadows
❌ **DON'T** introduce random colors outside the palette
❌ **DON'T** use too many font sizes on one screen

### Components

✅ **DO** reuse existing components consistently
✅ **DO** use React Native Paper components as primitives
✅ **DO** provide loading, empty, and error states
✅ **DO** include touch feedback for all interactive elements

❌ **DON'T** create custom components without checking existing ones
❌ **DON'T** forget empty states for lists
❌ **DON'T** omit loading indicators
❌ **DON'T** create buttons smaller than 48dp touch targets

### Interaction

✅ **DO** animate transitions smoothly (250ms standard)
✅ **DO** provide immediate feedback on user actions
✅ **DO** respect platform conventions (iOS vs Android)

❌ **DON'T** block user input during animations
❌ **DON'T** use long animation durations (>500ms)
❌ **DON'T** ignore platform-specific behavior

---

## Quick Reference

### When Creating a New Screen:

1. ✅ Add consistent page header (56dp/44dp + safe area)
2. ✅ Add scrollable content area with 16dp padding
3. ✅ Add navigation footer (64dp + safe area)
4. ✅ Respect safe area insets (top, bottom)
5. ✅ Hide navigation when keyboard shown
6. ✅ Include loading, empty, and error states
7. ✅ Use design tokens for colors, spacing, typography
8. ✅ Test with screen reader
9. ✅ Test on both iOS and Android
10. ✅ Ensure all touch targets are 48dp minimum

### When Creating a New Component:

1. ✅ Check if component already exists
2. ✅ Use React Native Paper primitives
3. ✅ Apply design tokens (spacing, colors, typography)
4. ✅ Include all interactive states (default, hover, pressed, disabled)
5. ✅ Add accessibility labels and roles
6. ✅ Provide TypeScript types
7. ✅ Add touch feedback (ripple/opacity)
8. ✅ Support light and dark themes
9. ✅ Document props and usage
10. ✅ Test on both platforms

---

## Resources

- **Design Tokens**: `@repo/design-tokens` package
- **Design System Docs**: `/docs/architecture/design-system.md`
- **Styling Guide (Mobile)**: `/.claude/instructions/mobile/styling.md`
- **Component Guide (Mobile)**: `/.claude/instructions/mobile/components.md`
- **Component Specs**: `/docs/specs/components/`
- **React Native Paper**: https://callstack.github.io/react-native-paper/
- **Material Design 3**: https://m3.material.io/

---

## Questions or Clarifications?

If you encounter a situation not covered in these guidelines, follow these principles:

1. **Look at existing screens** - Follow established patterns
2. **Choose simplicity** - When in doubt, use less decoration
3. **Be consistent** - Match spacing, colors, typography from other screens
4. **Prioritize usability** - Function over form
5. **Ask** - If truly unclear, ask for clarification rather than guess

Remember: **Consistency is more important than perfection.** It's better to follow an existing pattern than to create a slightly better but inconsistent solution.
