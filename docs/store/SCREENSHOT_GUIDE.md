# Screenshot Preparation Guide

This guide helps you create App Store and Google Play screenshots for The Nineteenth.

## Required Screenshots

### iOS App Store

| Device | Size (pixels) | Required |
|--------|---------------|----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Recommended |
| iPhone 5.5" (8 Plus) | 1242 x 2208 | Optional |
| iPad Pro 12.9" | 2048 x 2732 | If supporting iPad |

**Minimum:** 3 screenshots per device
**Maximum:** 10 screenshots per device
**Format:** PNG or JPEG (no transparency for JPEG)

### Google Play Store

| Device | Size (pixels) | Required |
|--------|---------------|----------|
| Phone | 1080 x 1920 minimum | Yes |
| 7" Tablet | 1080 x 1920 minimum | If supporting tablets |
| 10" Tablet | 1920 x 1200 minimum | If supporting tablets |

**Minimum:** 2 screenshots
**Maximum:** 8 screenshots
**Format:** PNG or JPEG

---

## Recommended Screenshots (6 screens)

### 1. Home Screen / Dashboard
**Purpose:** Show the main app experience
**Content:**
- Active competitions visible
- Clean, welcoming interface
- User's name/avatar visible

**Caption:** "Manage all your golf competitions in one place"

### 2. Competition Detail
**Purpose:** Show competition features
**Content:**
- Competition name and details
- Rounds list with dates/courses
- Leaderboard preview
- Players tab visible

**Caption:** "Track rounds, players, and standings"

### 3. Scorecard Entry
**Purpose:** Show the scoring experience
**Content:**
- Hole-by-hole scoring interface
- Large, touch-friendly buttons
- Current hole highlighted
- Score entry in progress

**Caption:** "Score your round hole-by-hole, even offline"

### 4. Leaderboard
**Purpose:** Show competitive features
**Content:**
- Live standings with positions
- Player names and scores
- Different score columns (gross, net, points)
- Your position highlighted

**Caption:** "Real-time leaderboards keep everyone engaged"

### 5. Statistics
**Purpose:** Show tracking and analytics
**Content:**
- Player statistics dashboard
- Scoring averages
- Recent rounds
- Trends or charts

**Caption:** "Track your performance and improvement"

### 6. Friends / Social
**Purpose:** Show social features
**Content:**
- Friends list
- Compare stats feature
- Add friend interface

**Caption:** "Connect with friends and compare stats"

---

## Screenshot Preparation Steps

### Step 1: Set Up Test Data
Create realistic sample data in the app:
- 2-3 active competitions with realistic names
- Multiple players with varied scores
- Completed rounds with full scorecards
- Some in-progress rounds

### Step 2: Configure Device
1. Enable "Demo Mode" in developer settings (hides status bar info)
2. Set time to 9:41 AM (Apple's standard)
3. Full battery or hide battery indicator
4. Strong signal/WiFi
5. Clean notification bar

### Step 3: Use a Physical Device
- Screenshots from simulators may look different
- Use the actual device size you're targeting
- Ensure smooth animations complete before capturing

### Step 4: Capture Screenshots
**iOS:**
- Press Side + Volume Up simultaneously
- Or use Xcode's screenshot feature

**Android:**
- Press Power + Volume Down simultaneously
- Or use Android Studio's screenshot feature

### Step 5: Post-Processing (Optional)
You can enhance screenshots with:
- Device frames (iPhone/Android mockups)
- Captions and marketing text
- Background gradients
- Feature callouts

**Tools:**
- [Figma](https://figma.com) - Free design tool
- [Screenshots.pro](https://screenshots.pro) - Automated device frames
- [AppLaunchpad](https://theapplaunchpad.com) - Screenshot generator
- [Fastlane Frameit](https://docs.fastlane.tools/actions/frameit/) - CLI tool

---

## Screenshot Checklist

### Content
- [ ] No personal/sensitive information visible
- [ ] Realistic but appealing data
- [ ] Consistent user name/avatar across screens
- [ ] No placeholder text or "Lorem ipsum"
- [ ] Competition names are realistic (not "Test Competition")

### Technical
- [ ] Correct resolution for each device
- [ ] No UI glitches or cut-off elements
- [ ] Consistent color/theme across all screenshots
- [ ] Status bar is clean (time, battery, signal)
- [ ] No debug indicators or developer tools

### Branding
- [ ] App name visible where appropriate
- [ ] Consistent with app icon colors
- [ ] Professional appearance
- [ ] Captions are spelled correctly

---

## Sample Test Data

Use these sample names and data for realistic screenshots:

### Competition Names
- "Weekend Warriors Summer Series"
- "Corporate Golf Challenge 2024"
- "Monthly Medal - December"
- "Mates Cup Championship"

### Player Names
- Alex Thompson (Handicap: 12)
- Sam Wilson (Handicap: 18)
- Jordan Lee (Handicap: 8)
- Casey Brown (Handicap: 22)

### Course Names
- Royal Melbourne Golf Club
- Kingston Heath Golf Club
- Victoria Golf Club
- Metropolitan Golf Club

### Sample Scores (Stableford 18 holes)
- 1st: 38 points
- 2nd: 36 points
- 3rd: 35 points
- 4th: 32 points

---

## Localization

If targeting multiple regions, consider:
- Screenshots in relevant languages
- Local course names
- Local currency for subscription screens
- Date format appropriate to region

---

## App Preview Videos (Optional)

Both stores support short preview videos:

**iOS App Store:**
- 15-30 seconds
- Portrait: 1080 x 1920 (minimum)
- No device frames allowed

**Google Play:**
- 30 seconds to 2 minutes
- YouTube link
- Device frames allowed

**Suggested content:**
1. Open app and show home screen (3s)
2. Create/view a competition (5s)
3. Enter scores on scorecard (7s)
4. View leaderboard updates (5s)
5. Show statistics (3s)
6. End with logo/tagline (2s)

---

## File Organization

```
store/
├── screenshots/
│   ├── ios/
│   │   ├── 6.7-inch/
│   │   │   ├── 01-home.png
│   │   │   ├── 02-competition.png
│   │   │   ├── 03-scorecard.png
│   │   │   ├── 04-leaderboard.png
│   │   │   ├── 05-statistics.png
│   │   │   └── 06-friends.png
│   │   └── 12.9-inch-ipad/
│   │       └── ...
│   └── android/
│       ├── phone/
│       │   └── ...
│       └── tablet/
│           └── ...
├── videos/
│   ├── app-preview-ios.mp4
│   └── app-preview-android.mp4
└── graphics/
    ├── feature-graphic.png (1024x500 for Google Play)
    └── promotional/
```

---

*Take your time with screenshots - they're the first thing users see!*
