# Golf App Guidelines - The Nineteenth

Project-specific conventions for The Nineteenth golf competition app.

## Display Conventions

### Handicap Display
Always show handicap with "HC: " prefix:
```tsx
<Text>HC: {player.handicap || 0}</Text>
```

### Date Format
Use Australian format (DD/MM/YYYY):
```tsx
import { format } from 'date-fns';

const formattedDate = format(new Date(date), 'dd/MM/yyyy');

// For locale-aware formatting
new Date(date).toLocaleDateString('en-AU')
```

### Score Color Coding
Use golf-specific colors from theme:
```tsx
const colors = useThemeColors();

// Available score colors:
// - colors.birdie (green) - for birdie or better
// - colors.par (blue) - for par
// - colors.bogey (orange) - for bogey
// - colors.doubleBogey (red) - for double bogey or worse

const getScoreColor = (score: number, par: number) => {
  const diff = score - par;
  if (diff <= -1) return colors.birdie;
  if (diff === 0) return colors.par;
  if (diff === 1) return colors.bogey;
  return colors.doubleBogey;
};
```

### Competition Status Badges
Use consistent status indicators:
- **Active** - Currently in progress
- **Upcoming** - Not yet started
- **Completed** - Finished

## Touch Targets

On-course scoring requires large touch targets for gloved fingers:
```tsx
const styles = StyleSheet.create({
  scoreButton: {
    width: 44,  // Minimum 44dp (iOS HIG standard)
    height: 44,
    // For primary score buttons, consider 48-56dp
  },
});
```

## Offline Support

Scorecard screens MUST work offline. This is critical for on-course scoring.
- Use offline-first data patterns
- Show sync status indicators
- Handle connectivity changes gracefully
- See `docs/guides/OFFLINE_ARCHITECTURE.md` for implementation details

```tsx
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

// Show sync status on scorecard screens
<OfflineIndicator />
```

## Australian-Specific Requirements

### States and Territories
Use official abbreviations:
```tsx
const AUSTRALIAN_STATES = [
  { label: 'New South Wales', value: 'NSW' },
  { label: 'Victoria', value: 'VIC' },
  { label: 'Queensland', value: 'QLD' },
  { label: 'South Australia', value: 'SA' },
  { label: 'Western Australia', value: 'WA' },
  { label: 'Tasmania', value: 'TAS' },
  { label: 'Northern Territory', value: 'NT' },
  { label: 'Australian Capital Territory', value: 'ACT' },
];
```

### Terminology
- Use "honour system" (not "honor system" in UI text, though code uses American spelling)
- Reference "WHS" (World Handicap System) for official handicap system
- Use metric distances (meters, not yards)

### Currency
Use AUD for paid features.

### Timezones
Handle multiple Australian timezones:
- AEST (Australian Eastern Standard Time)
- AEDT (Australian Eastern Daylight Time)
- ACST (Australian Central Standard Time)
- AWST (Australian Western Standard Time)

## Privacy

- Default to private competitions (invite-only)
- Minimal data collection
- Users can export/delete their data
- GDPR/Privacy Act compliant

## Golf Component Patterns

### Scorecard Player Card
See existing components in `src/components/scorecard/` for patterns.

### Competition Card
```tsx
<CompetitionCard
  competition={competition}
  isGrandfathered={isOverLimit}  // Show "Legacy" badge if grandfathered
  onPress={() => navigation.navigate('CompetitionDetail', { id: competition.id })}
/>
```

### Leaderboard Display
```tsx
// Auto-refresh leaderboards every 30 seconds
const { data: leaderboard } = useQuery({
  queryKey: ['leaderboard', competitionId],
  queryFn: () => fetchLeaderboard(competitionId),
  refetchInterval: 30000,
});
```

## Game Types

Available game types (tier-dependent):
- **Stableford** - Points-based scoring (Free tier)
- **Stroke Play** - Total strokes (Social+)
- **Match Play** - Hole-by-hole competition (Social+)
- **Ambrose** - Team scramble format (Premium)
- **Best Ball** - Best score from team (Premium)

See `docs/guides/SUBSCRIPTION_TIERS.md` for tier-specific game type access.

## Scoring Calculations

### Stableford Points
```
- Albatross (3 under): 5 points
- Eagle (2 under): 4 points
- Birdie (1 under): 3 points
- Par: 2 points
- Bogey (1 over): 1 point
- Double Bogey+ (2+ over): 0 points
```

### Net Score Calculation
```
Net Score = Gross Score - Strokes Received
Strokes Received = Based on handicap and hole stroke index
```

See `docs/guides/ALGORITHMS.md` for complete scoring algorithms.
