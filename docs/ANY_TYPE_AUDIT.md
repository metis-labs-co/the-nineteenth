# TypeScript "any" Type Audit

**Generated**: December 2024
**Total Files Scanned**: 348 TypeScript/TSX files
**Total "any" Instances Found**: 80+
**Files Affected**: ~35 files

---

## Summary

| Category | Count | % of Total | Priority |
|----------|-------|------------|----------|
| Supabase Type Assertions | 40+ | 50% | Medium |
| Array Mapping Operations | 20+ | 25% | Medium |
| External Library Integrations | 10+ | 12% | Low |
| Generic Containers | 5 | 6% | Low |
| Error Handlers | 1 | 1% | High |
| Navigation Props | 4 | 5% | Medium |

---

## Detailed Findings by Category

### Category 1: Supabase Type Assertions (50%)

These are intentional type assertions used when Supabase's type inference is limited for complex nested queries.

| File | Line(s) | Context |
|------|---------|---------|
| `src/services/offline/sync.ts` | 446 | `.from('scorecards') as any)` |
| `src/services/scoringPairs/scoringPairsService.ts` | 113, 171 | `((pairs as any[]) \|\| [])` |
| `src/services/competitionPlayers/competitionPlayersService.ts` | 127, 154, 271, 295 | Complex nested queries |
| `src/services/rounds/roundResultsService.ts` | 288, 405 | Array result casting |
| `src/services/api/teams.ts` | 152 | DB record transformation |
| `src/services/courses/cacheService.ts` | 148, 172 | Internal Supabase method access |
| `src/services/teams/teamService.ts` | 204, 257, 468 | Team data transformations |
| `src/services/subscription/webhooks.ts` | 223 | Supabase internal method |
| `src/hooks/useVenues.ts` | 276, 306, 343, 360, 399 | Internal Supabase access |
| `src/hooks/useCourses.ts` | 59, 111, 140, 177, 211, 242 | Course queries |
| `src/hooks/useRoundDetails.ts` | 150 | Complex query |
| `src/screens/courses/CourseDetailScreen/index.tsx` | 153, 219 | Course operations |
| `src/screens/scoring/ReviewScorecardScreen.tsx` | 283 | Scorecard update |
| `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts` | 79 | Round insertion |
| `src/screens/admin/EditRoundScreen/hooks/useEditRoundData.ts` | 42 | Round update |
| `src/screens/rounds/RoundListScreen.tsx` | 113, 141, 173, 204, 249, 266, 349, 351, 353, 357, 421, 426, 502 | Multiple operations |
| `src/components/competitionWizard/AddPlayersBottomSheet.tsx` | 175 | Player insertion |

**Root Cause**: Supabase's TypeScript SDK doesn't provide good type inference for:
- Complex nested `select()` queries with joins
- Custom filter expressions using `.or()` or `.filter()`
- Accessing internal Supabase methods

---

### Category 2: Array Mapping Operations (25%)

Callback functions in `.map()`, `.filter()`, and `.forEach()` where TypeScript can't infer element types.

| File | Line(s) | Context |
|------|---------|---------|
| `src/hooks/scorecard/useRoundData.ts` | 134, 140, 269, 275, 426, 432, 457, 458 | Team/member mapping |
| `src/services/api/teams.ts` | 95, 99, 157 | Team array transformations |
| `src/services/rounds/roundResultsService.ts` | 308, 431 | Team member mapping |
| `src/services/teams/teamService.ts` | 210, 265 | Member array mapping |
| `src/hooks/usePlayerStatistics.ts` | 312 | Scorecard iteration |
| `src/hooks/useVenues.ts` | 111, 175, 252, 257 | Venue/course mapping |
| `src/screens/admin/TeamManagementScreen.tsx` | 86, 90, 96 | Team data mapping |
| `src/screens/admin/ScoringPairsScreen.tsx` | 99 | Player data mapping |

**Root Cause**: When database records are fetched and transformed, TypeScript loses type information through:
- Multiple chained transformations
- Optional chaining with default arrays `(x ?? [])`
- Snake_case to camelCase property transformations

---

### Category 3: Event Handler Parameters (12%)

External library callbacks where types aren't provided.

| File | Line | Context |
|------|------|---------|
| `src/screens/admin/EditCompetitionScreen.tsx` | 313, 325 | DateTimePicker events |
| `src/screens/admin/AddRoundScreen/index.tsx` | 86 | Course selection callback |
| `src/components/statistics/PerformanceChart.tsx` | 150 | VictoryChart callback |

**Root Cause**: Third-party libraries (DateTimePicker, VictoryChart) don't export proper TypeScript types for all callbacks.

---

### Category 4: Navigation Props (5%)

React Navigation type inference issues.

| File | Line | Context |
|------|------|---------|
| `src/screens/admin/AddRoundScreen/types.ts` | 44 | `navigation: any` |

**Root Cause**: React Navigation requires explicit typing for `navigation` and `route` props when not using the typed hook.

---

### Category 5: Generic Containers (6%)

Intentional generic types for flexible data structures.

| File | Line | Context |
|------|------|---------|
| `src/types/index.ts` | 314 | `PendingSync.data: any` - offline queue wrapper |
| `src/hooks/queryKeys.ts` | 227 | React Query key type utility |

**Root Cause**: Design decision to use flexible containers for:
- Offline sync queue (stores different entity types)
- React Query key factory patterns

---

### Category 6: Error Handlers (1%)

| File | Line | Context |
|------|------|---------|
| `src/screens/competitions/CompetitionDetailScreen.tsx` | 397 | `catch (error: any)` |

**Root Cause**: Best practice violation - should use `unknown` instead.

---

## Most Affected Files

Files containing 3+ instances of `any`:

| File | Count | Primary Issue |
|------|-------|---------------|
| `src/hooks/scorecard/useRoundData.ts` | 15 | Supabase queries + array mapping |
| `src/screens/rounds/RoundListScreen.tsx` | 13 | Supabase operations |
| `src/hooks/useVenues.ts` | 7 | Supabase internal access |
| `src/hooks/useCourses.ts` | 6 | Supabase internal access |
| `src/services/competitionPlayers/competitionPlayersService.ts` | 4 | Complex nested queries |
| `src/services/teams/teamService.ts` | 4 | Team transformations |
| `src/services/api/teams.ts` | 3 | Array transformations |
| `src/services/rounds/roundResultsService.ts` | 3 | Result transformations |

---

## Recommendations

### High Priority (Fix Soon)

1. **Error Handler** - Change `catch (error: any)` to `catch (error: unknown)`
   - File: `src/screens/competitions/CompetitionDetailScreen.tsx:397`
   - Time: < 2 minutes

### Medium Priority (Consider Refactoring)

2. **Create Supabase Query Type Helpers**
   - Create reusable typed wrapper functions for common queries
   - Example:
   ```typescript
   // src/services/supabase/typedQueries.ts
   interface TeamWithMembers {
     id: string;
     name: string;
     team_members: Array<{
       id: string;
       player: { id: string; name: string; handicap: number };
     }>;
   }

   export async function fetchTeamsWithMembers(roundId: string): Promise<TeamWithMembers[]> {
     const { data, error } = await supabase
       .from('teams')
       .select(`
         id, name,
         team_members(id, player:players(id, name, handicap))
       `)
       .eq('round_id', roundId);

     if (error) throw error;
     return data as TeamWithMembers[];
   }
   ```
   - Time: 2-4 hours
   - Impact: Reduces 40+ instances

3. **Create Array Transformation Utilities**
   - Centralize common data transformations with proper typing
   - Example:
   ```typescript
   // src/utils/transformers.ts
   export function transformTeamFromDb(team: DbTeamRow): Team {
     return {
       id: team.id,
       name: team.name,
       members: (team.team_members ?? []).map(transformMemberFromDb),
     };
   }
   ```
   - Time: 2-3 hours
   - Impact: Reduces 20+ instances

4. **Fix Navigation Prop Types**
   - Use proper React Navigation typing
   - Example:
   ```typescript
   import { NativeStackScreenProps } from '@react-navigation/native-stack';
   import { RootStackParamList } from '@/navigation/types';

   type Props = NativeStackScreenProps<RootStackParamList, 'AddRound'>;
   ```
   - Time: 1-2 hours

### Low Priority (Acceptable)

5. **External Library Callbacks** - Keep as-is
   - DateTimePicker, VictoryChart have inherent limitations
   - Using `any` is a reasonable workaround

6. **Generic Container Types** - Keep as-is
   - `PendingSync.data: any` is intentional for flexibility
   - Could use discriminated unions but adds complexity

---

## Impact Assessment

| Metric | Rating | Notes |
|--------|--------|-------|
| Code Safety Risk | Low-Medium | Mostly confined to data transformation layers |
| Type Safety Gap | Medium | Primarily in data fetching and transformation |
| Technical Debt | Medium | Supabase workarounds are widespread but manageable |
| Maintainability | Good | Most uses are contextually obvious |

---

## Next Steps

1. [ ] Fix the one error handler (5 minutes)
2. [ ] Create typed Supabase query helpers (sprint task)
3. [ ] Add array transformation utilities (sprint task)
4. [ ] Fix navigation prop types (sprint task)
5. [ ] Consider enabling `noImplicitAny` in tsconfig once above are done

---

*This audit was generated automatically. Re-run to check progress after fixes.*
