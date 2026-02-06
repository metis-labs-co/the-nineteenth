# Plan: AI-Powered Natural Language Stats (Premium Feature)

## Overview

Add an AI-powered stats feature that lets Premium tier users ask natural language questions about their golf statistics (e.g., "show me my scoring trend for the past 5 rounds, including putts, FIR and GIR") and receive dynamic visualizations and insights powered by Claude.

Reuses the proven AI integration pattern from the AI Competition Generator: Supabase Edge Function → Claude Sonnet → structured JSON → dynamic frontend rendering.

## Approach

- **Backend**: New `analyze-stats` Supabase Edge Function calling Claude with player stats data
- **Frontend**: New `AIStatsScreen` with state machine (input → loading → results → error), dynamic chart renderer, and 10/day query limit
- **Gating**: Premium tier only, using existing `FeatureLock` pattern with graceful degradation
- **Visualizations**: 7 chart types (line, bar, pie, stat cards, comparison table, text insight, score distribution) selected by the AI based on query type
- **Colors**: Semantic color keys in AI output mapped to theme colors at runtime (auto dark/light mode)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI Model | Claude Sonnet via Edge Function | Proven pattern from AI Competition Generator |
| Chart Library | react-native-gifted-charts | Already installed, used in PerformanceChart |
| Query History | None (fresh each session) | Simplicity; users can re-ask anytime |
| Daily Limit | 10 queries/day (client-side) | Cost management via AsyncStorage counter |
| Data Sent to AI | Pre-aggregated stats + last 20 rounds with per-hole data | Gives Claude both summaries and granular data for trends |
| Entry Point | Card on MyStatisticsScreen | More discoverable than header icon; shows example query |
| Follow-ups | Suggestion chips on results | Conversational flow without full history persistence |

---

## Phase 1: Edge Function (Backend)

### Step 1.1: Create Edge Function Types
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `supabase/functions/analyze-stats/types.ts` with request and response types for the AI stats Edge Function.

Mirror the pattern from `supabase/functions/generate-competition/types.ts`.

**Request type (StatsQueryRequest):**
- query: string (the natural language question, 5-500 chars)
- playerName: string
- playerHandicap: number | null
- statistics: PlayerStatisticsPayload (pre-aggregated stats object with: roundsPlayed, competitionsEntered, averageGrossScore, averageStablefordPoints, scoreDistribution {eagles, birdies, pars, bogeys, doubleBogeys, triplePlus}, parOrBetterPercentage, birdieOrBetterPercentage, averagePuttsPerRound, averagePuttsPerHole, fairwayPercentage, girPercentage, par3/4/5Stats, shortGame {scramblingPercentage, bogeyAvoidanceRate}, puttingDepth {onePuttPercentage, threePuttPercentage, puttsPerGIR}, courseStats[], bestRound, worstRound, lowestGrossScore, highestStablefordPoints)
- recentRoundDetails: RoundDetailPayload[] (last 10-20 rounds with per-hole scores: roundId, courseName, date (ISO), gameType, totalGross, totalNet, totalPoints, holesPlayed, holeScores[] {hole, par, strokes, putts?, fairwayHit?, greenInRegulation?})

**Response types:**
- StatsQueryResponse: { success: true, result: { title: string, summary: string, visualizations: Visualization[], suggestions: string[] } }
- StatsQueryErrorResponse: { success: false, error: string, code: 'INVALID_REQUEST' | 'AUTH_ERROR' | 'CLAUDE_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'INSUFFICIENT_DATA' | 'INTERNAL_ERROR', details?: string }

**Visualization discriminated union (7 types):**
1. LineChartVisualization: { type: 'line_chart', title, datasets: {label, data: {label, value}[], color: SemanticColor}[], yAxisLabel?, annotation? }
2. BarChartVisualization: { type: 'bar_chart', title, data: {label, value, color?}[], yAxisLabel?, annotation? }
3. PieChartVisualization: { type: 'pie_chart', title, data: {label, value, color}[], centerLabel? }
4. StatCardsVisualization: { type: 'stat_cards', title, cards: {title, value, subtitle?, icon?, trend?: 'up'|'down'|'neutral'}[] }
5. ComparisonTableVisualization: { type: 'comparison_table', title, headers: string[], rows: {cells: (string|number)[]}[] }
6. TextInsightVisualization: { type: 'text_insight', title, content: string, sentiment?: 'positive'|'negative'|'neutral' }
7. ScoreDistributionVisualization: { type: 'score_distribution', title, data: {eagles, birdies, pars, bogeys, doubleBogeys, triplePlus} }

SemanticColor type: 'primary' | 'success' | 'warning' | 'error' | 'birdie' | 'par' | 'bogey' | 'doubleBogey' | 'info'
```

**Deliverables:**
- [ ] `supabase/functions/analyze-stats/types.ts`

**Dependencies:** None

---

### Step 1.2: Create Edge Function Validation Schemas
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `supabase/functions/analyze-stats/validation.ts` with Zod schemas for request validation and response parsing.

Mirror the pattern from `supabase/functions/generate-competition/validation.ts`.

**Request schema:**
- query: z.string().min(5).max(500)
- playerName: z.string().min(1)
- playerHandicap: z.number().nullable()
- statistics: z.object({...}) matching PlayerStatisticsPayload
- recentRoundDetails: z.array(roundDetailSchema)

**Response schema:**
- title: z.string().max(80)
- summary: z.string().max(500)
- visualizations: z.array(visualizationSchema).min(1).max(6)
- suggestions: z.array(z.string()).min(1).max(3)

The visualization schema should use z.discriminatedUnion('type', [...]) for the 7 visualization types.

Color fields should validate against the allowed SemanticColor values.

Export: validateRequest(body: unknown), parseAIResponse(text: string)
```

**Deliverables:**
- [ ] `supabase/functions/analyze-stats/validation.ts`

**Dependencies:** Step 1.1

---

### Step 1.3: Create Edge Function Prompt Builder
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `supabase/functions/analyze-stats/prompt.ts` with system prompt and user message builder.

Mirror the pattern from `supabase/functions/generate-competition/prompt.ts`.

**buildSystemPrompt()** should instruct Claude to:
1. Act as a golf statistics analyst for "The Nineteenth" app
2. Return ONLY valid JSON matching the output schema (title, summary, visualizations[], suggestions[])
3. Select appropriate visualization types based on the query:
   - Trends over time → line_chart
   - Category comparisons → bar_chart
   - Proportions → pie_chart
   - Key numbers → stat_cards
   - Side-by-side data → comparison_table
   - Narrative analysis → text_insight
   - Score breakdowns → score_distribution
4. Use ONLY semantic color keys: primary, success, warning, error, birdie, par, bogey, doubleBogey, info
5. Always lead with the most relevant visualization
6. Include text_insight when narrative explanation adds value
7. Keep data labels short (abbreviations: "R1", "12/01")
8. Round numbers to 1 decimal place
9. If data insufficient, return text_insight explaining what's available
10. Personalize using player name
11. Australian date format (DD/MM)
12. NEVER fabricate data — only use what's provided
13. Limit datasets to 20 data points max
14. Include full schema documentation for each visualization type

**buildUserMessage(request)** should format:
- Player info (name, handicap)
- The question
- Aggregate statistics as JSON
- Recent round details as JSON (newest first)
```

**Deliverables:**
- [ ] `supabase/functions/analyze-stats/prompt.ts`

**Dependencies:** Step 1.1

---

### Step 1.4: Create Edge Function Handler
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `supabase/functions/analyze-stats/index.ts` — the main Supabase Edge Function handler.

Follow the EXACT pattern from `supabase/functions/generate-competition/index.ts`:

1. Import Anthropic SDK: `import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0'`
2. Handle CORS preflight (OPTIONS request)
3. Parse request body
4. Validate with Zod (validateRequest from validation.ts)
5. Verify Authorization header (extract JWT, verify with Supabase)
6. Initialize Anthropic client with ANTHROPIC_API_KEY from Deno.env
7. Build system + user prompts (from prompt.ts)
8. Call Claude: model 'claude-sonnet-4-20250514', max_tokens 4096
9. Extract text content from response
10. Strip markdown code blocks if present (```json ... ```)
11. JSON.parse the response
12. Validate with Zod (parseAIResponse from validation.ts)
13. Return { success: true, result: parsed }
14. Error handling: return StatsQueryErrorResponse with appropriate code

Key difference from generate-competition: NO database queries needed. All data arrives in the request payload.

Use Deno.serve() pattern. Include proper CORS headers on all responses.
```

**Deliverables:**
- [ ] `supabase/functions/analyze-stats/index.ts`

**Dependencies:** Steps 1.1, 1.2, 1.3

---

## Phase 2: Frontend Types & Hook

### Step 2.1: Add Query Key and Feature ID
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Make 3 small modifications to existing files:

1. `src/hooks/queryKeys.ts` — Add statsQuery to aiKeys:
   ```typescript
   export const aiKeys = {
     all: ['ai'] as const,
     generation: () => [...aiKeys.all, 'generation'] as const,
     statsQuery: () => [...aiKeys.all, 'stats-query'] as const,  // NEW
   } as const;
   ```

2. `src/types/subscription.types.ts` — Add 'ai_stats' to the FeatureId union type

3. `src/hooks/subscription/validators.ts` — Add ai_stats case as a boolean feature requiring Premium tier
   Follow the pattern of existing boolean feature validators (e.g., 'advanced_stats', 'scoring_pairs')
```

**Deliverables:**
- [ ] `src/hooks/queryKeys.ts` updated
- [ ] `src/types/subscription.types.ts` updated
- [ ] `src/hooks/subscription/validators.ts` updated

**Dependencies:** None

---

### Step 2.2: Create AI Stats Mutation Hook
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/hooks/useGenerateAIStats.ts` — the useMutation hook for AI stats queries.

Mirror the pattern from `src/hooks/useGenerateAICompetition.ts`.

The hook should:
1. Import useAuth, usePlayerStatistics, supabase client, aiKeys
2. Define frontend-side types for the response (matching Edge Function output)
3. Use useMutation with mutationKey: aiKeys.statsQuery()
4. In mutationFn:
   a. Validate query length (min 5 chars)
   b. Verify player + stats exist
   c. Fetch extended round data (per-hole scores for last 20 completed rounds):
      ```typescript
      const { data: roundDetails } = await supabase
        .from('scorecards')
        .select(`id, round_id, scores, total_gross, total_net, total_points, status,
          rounds!inner (id, date, game_type, courses!inner (id, name, holes))`)
        .eq('player_id', playerId)
        .in('status', ['completed', 'confirmed'])
        .order('submitted_at', { ascending: false })
        .limit(20);
      ```
   d. Transform roundDetails into RoundDetailPayload[] (extract per-hole scores from JSONB)
   e. Build PlayerStatisticsPayload from the usePlayerStatistics data
   f. Call supabase.functions.invoke('analyze-stats', { body: { query, playerName, playerHandicap, statistics, recentRoundDetails } })
   g. Return typed response

Export: useGenerateAIStats, getAIStatsErrorMessage helper, response types
```

**Deliverables:**
- [ ] `src/hooks/useGenerateAIStats.ts`

**Dependencies:** Steps 1.4, 2.1

---

### Step 2.3: Create Daily Query Limit Hook
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create a `useAIStatsLimit` hook (add to `src/hooks/useGenerateAIStats.ts` or a separate file).

Uses AsyncStorage to track daily query count:
- Key format: `ai_stats_queries_YYYY-MM-DD` (e.g., `ai_stats_queries_2026-02-06`)
- Max: 10 queries per day

Exports:
- queriesRemaining: number (10 - today's count)
- hasReachedLimit: boolean
- incrementCount: () => Promise<void> (call after successful query)
- dailyLimit: number (constant 10)

The date-based key means it auto-resets daily without cleanup.

Use @react-native-async-storage/async-storage (already installed in the project).
```

**Deliverables:**
- [ ] `useAIStatsLimit` hook created

**Dependencies:** None

---

## Phase 3: Dynamic Chart Components

### Step 3.1: Create Color Resolver Utility
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/colorResolver.ts`.

A utility that maps semantic color keys from the AI response to actual theme colors.

```typescript
import type { ThemeColors } from '@/constants/theme';

export type SemanticColor = 'primary' | 'success' | 'warning' | 'error' | 'birdie' | 'par' | 'bogey' | 'doubleBogey' | 'info';

export function resolveColor(colorKey: string, colors: ThemeColors): string {
  const colorMap: Record<string, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    birdie: colors.birdie,
    par: colors.par,
    bogey: colors.bogey,
    doubleBogey: colors.doubleBogey,
    info: colors.info ?? colors.primary,
  };
  return colorMap[colorKey] ?? colors.primary;
}
```

Check the actual ThemeColors type in `src/constants/theme.ts` to ensure all keys exist.
```

**Deliverables:**
- [ ] `src/components/ai/stats/colorResolver.ts`

**Dependencies:** None

---

### Step 3.2: Create DynamicLineChart Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicLineChart.tsx`.

Follow the pattern from `src/components/statistics/PerformanceChart.tsx`.

Renders a LineChart from react-native-gifted-charts based on a LineChartVisualization object.

Props: { data: LineChartVisualization }

Features:
- Map each dataset to a line with its semantic color resolved via colorResolver
- Support multiple datasets (multi-line chart)
- Responsive width: Dimensions.get('window').width - padding
- Custom tooltips showing value on press
- X-axis labels from data[].label
- Y-axis label if provided
- Annotation text below chart if provided
- Title rendered above the chart
- Legend showing dataset labels with their colors
- Dark mode support via useThemeColors()

Follow project styling: useThemeColors(), spacing/typography from theme, StyleSheet.create().
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicLineChart.tsx`

**Dependencies:** Step 3.1

---

### Step 3.3: Create DynamicBarChart Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicBarChart.tsx`.

Renders a BarChart from react-native-gifted-charts based on a BarChartVisualization object.

Props: { data: BarChartVisualization }

Features:
- Map each bar's semantic color via colorResolver
- Responsive width
- X-axis labels from data[].label
- Y-axis label if provided
- Annotation text below chart if provided
- Title above chart
- Dark mode support via useThemeColors()

Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicBarChart.tsx`

**Dependencies:** Step 3.1

---

### Step 3.4: Create DynamicPieChart Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicPieChart.tsx`.

Renders a PieChart from react-native-gifted-charts based on a PieChartVisualization object.

Props: { data: PieChartVisualization }

Features:
- Map each slice's semantic color via colorResolver
- Center label if provided
- Legend below chart showing labels + percentages
- Title above chart
- Dark mode support via useThemeColors()

Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicPieChart.tsx`

**Dependencies:** Step 3.1

---

### Step 3.5: Create DynamicStatCards Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicStatCards.tsx`.

Renders a grid of stat cards based on a StatCardsVisualization object.

Props: { data: StatCardsVisualization }

Reuse the existing `StatCard` component from `src/components/statistics/StatCard.tsx` if compatible, or create a similar lightweight card.

Features:
- 2-column grid layout (FlexWrap)
- Each card shows: title, value (large), subtitle (small), optional icon (MaterialCommunityIcons), optional trend arrow (up=green, down=red, neutral=gray)
- Title above the grid
- Dark mode support via useThemeColors()

Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicStatCards.tsx`

**Dependencies:** Step 3.1

---

### Step 3.6: Create DynamicComparisonTable Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicComparisonTable.tsx`.

Renders a simple table based on a ComparisonTableVisualization object.

Props: { data: ComparisonTableVisualization }

Features:
- Header row with bold text
- Data rows with alternating background for readability
- Horizontal scroll if table is wide
- Title above table
- Dark mode support via useThemeColors()

Simple implementation using View + Text (no external table library needed).
Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicComparisonTable.tsx`

**Dependencies:** Step 3.1

---

### Step 3.7: Create DynamicTextInsight Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicTextInsight.tsx`.

Renders a styled text insight block based on a TextInsightVisualization object.

Props: { data: TextInsightVisualization }

Features:
- Card with subtle background (colors.surfaceVariant)
- Title at top
- Content text with basic formatting support (handle **bold** and bullet points)
- Sentiment indicator: left border color (positive=success, negative=error, neutral=border)
- Dark mode support via useThemeColors()

Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicTextInsight.tsx`

**Dependencies:** Step 3.1

---

### Step 3.8: Create DynamicScoreDistribution Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/components/ai/stats/DynamicScoreDistribution.tsx`.

Renders a score distribution breakdown based on a ScoreDistributionVisualization object.

Props: { data: ScoreDistributionVisualization }

Reuse the visual pattern from `src/components/statistics/ScoreDistributionBar.tsx`.

Features:
- Horizontal bars for eagles, birdies, pars, bogeys, doubleBogeys, triplePlus
- Use golf-specific colors: birdie (green), par (blue), bogey (amber), doubleBogey (red)
- Title above bars
- Count labels on each bar
- Dark mode support via useThemeColors()

Follow project styling patterns.
```

**Deliverables:**
- [ ] `src/components/ai/stats/DynamicScoreDistribution.tsx`

**Dependencies:** Step 3.1

---

### Step 3.9: Create VisualizationRenderer and Barrel Export
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create two files:

1. `src/components/ai/stats/VisualizationRenderer.tsx` — The main dispatcher component.

Props: { visualization: Visualization } (the discriminated union type)

Switch on visualization.type and render the appropriate Dynamic* component:
- 'line_chart' → DynamicLineChart
- 'bar_chart' → DynamicBarChart
- 'pie_chart' → DynamicPieChart
- 'stat_cards' → DynamicStatCards
- 'comparison_table' → DynamicComparisonTable
- 'text_insight' → DynamicTextInsight
- 'score_distribution' → DynamicScoreDistribution

Wrap each in a View with marginBottom: spacing.lg for consistent spacing.

2. `src/components/ai/stats/index.ts` — Barrel export for all components.
```

**Deliverables:**
- [ ] `src/components/ai/stats/VisualizationRenderer.tsx`
- [ ] `src/components/ai/stats/index.ts`

**Dependencies:** Steps 3.2–3.8

---

## Phase 4: Screen & Navigation

### Step 4.1: Create AI Stats Flow Hook
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/hooks/useAIStatsFlow.ts`.

Mirror the pattern from `src/screens/admin/AICompetitionScreen/hooks/useAICompetitionFlow.ts`.

State machine: 'input' | 'loading' | 'results' | 'error'

State:
- screenState: ScreenState
- query: string
- result: AIStatsResult | null (the { title, summary, visualizations[], suggestions[] })
- errorMessage: string

Actions:
- setQuery(value): Update query text
- handleSuggestionSelect(suggestion): Set query to suggestion text
- handleAnalyze(): Validate query → set 'loading' → call useGenerateAIStats.mutateAsync → on success set 'results' → on error set 'error'
- handleFollowUp(query): Set query → immediately trigger handleAnalyze (for tapping suggestion chips on results screen)
- handleBack(): From results/error → go to 'input'. From input → navigation.goBack()
- handleRetry(): Set state to 'input', clear error

Also integrates useAIStatsLimit:
- Check hasReachedLimit before analyzing
- Call incrementCount after successful query

Returns: { screenState, query, setQuery, result, errorMessage, isAnalyzing, queriesRemaining, hasReachedLimit, handleSuggestionSelect, handleAnalyze, handleFollowUp, handleBack, handleRetry }

Also create `src/screens/profile/AIStatsScreen/hooks/index.ts` barrel export.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/hooks/useAIStatsFlow.ts`
- [ ] `src/screens/profile/AIStatsScreen/hooks/index.ts`

**Dependencies:** Steps 2.2, 2.3

---

### Step 4.2: Create AIStatsInputState Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/components/AIStatsInputState.tsx`.

Mirror the pattern from `src/screens/admin/AICompetitionScreen/components/AIInputState.tsx`.

Props: { query, setQuery, onAnalyze, onSuggestionSelect, queriesRemaining, hasReachedLimit }

Layout:
1. Header area with sparkle icon and title "Ask AI About Your Stats"
2. Subtitle: "Ask anything about your golf performance"
3. TextInput (multiline, placeholder: "e.g., Show me my scoring trend for the past 5 rounds")
4. Remaining queries indicator: "N of 10 questions remaining today"
5. If hasReachedLimit: show friendly "limit reached" message instead of input
6. Suggestion chips section with title "Try asking..." and 4-5 curated suggestions:
   - "Show me my scoring trend for the past 5 rounds"
   - "What are my strengths and weaknesses?"
   - "How's my putting trending?"
   - "Which course do I play best at?"
   - "Break down my scoring by par type"
7. "Analyze" button (disabled if query < 5 chars or hasReachedLimit)

Follow project styling patterns. Dark mode support.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/components/AIStatsInputState.tsx`

**Dependencies:** None

---

### Step 4.3: Create AIStatsLoadingState Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/components/AIStatsLoadingState.tsx`.

Reuse the loading animation from `src/screens/admin/AICompetitionScreen/hooks/useAILoadingAnimation.ts`.

Props: { spin, dotOpacity1, dotOpacity2, dotOpacity3, loadingStep }

Display:
- Centered animated sparkle/brain icon (spinning)
- Animated dots
- Loading step text cycling through: "Analyzing your rounds...", "Crunching the numbers...", "Generating insights...", "Creating visualizations..."
- Subtle pulse animation

Follow the exact visual pattern from AILoadingState in the AI Competition screen.
Dark mode support.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/components/AIStatsLoadingState.tsx`

**Dependencies:** None

---

### Step 4.4: Create AIStatsResultState Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/components/AIStatsResultState.tsx`.

Props: { result: AIStatsResult, onFollowUp: (query: string) => void, queriesRemaining: number }

Layout (ScrollView):
1. Title (result.title) — large heading
2. Summary text (result.summary) — body text with secondary color
3. Divider
4. For each visualization in result.visualizations:
   - <VisualizationRenderer visualization={viz} /> (from src/components/ai/stats)
5. Divider
6. "Ask another question" section:
   - Remaining queries indicator
   - Suggestion chips from result.suggestions (tapping calls onFollowUp)
   - Small TextInput for custom follow-up with submit button

Follow project styling patterns. Dark mode support.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/components/AIStatsResultState.tsx`

**Dependencies:** Step 3.9

---

### Step 4.5: Create AIStatsErrorState Component
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/components/AIStatsErrorState.tsx`.

Mirror the pattern from `src/screens/admin/AICompetitionScreen/components/AIErrorState.tsx`.

Props: { errorMessage: string, onRetry: () => void, onBack: () => void }

Display:
- Error icon (alert-circle)
- "Something went wrong" title
- Error message text
- "Try Again" button (primary)
- "Go Back" link/button (secondary)

Follow project styling patterns. Dark mode support.

Also create `src/screens/profile/AIStatsScreen/components/index.ts` barrel export for all 4 components.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/components/AIStatsErrorState.tsx`
- [ ] `src/screens/profile/AIStatsScreen/components/index.ts`

**Dependencies:** None

---

### Step 4.6: Create Main AIStatsScreen
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Create `src/screens/profile/AIStatsScreen/index.tsx`.

Mirror the structure from `src/screens/admin/AICompetitionScreen/index.tsx`.

Uses useAIStatsFlow hook and useAILoadingAnimation (from the AI competition screen).

Renders a state machine switch:
- 'input' → AIStatsInputState
- 'loading' → AIStatsLoadingState
- 'results' → AIStatsResultState
- 'error' → AIStatsErrorState

Header: PageHeader with "AI Stats" title, back button (calls handleBack).

Wrap in View with flex: 1 and colors.background.

Follow project styling patterns. Dark mode support.
```

**Deliverables:**
- [ ] `src/screens/profile/AIStatsScreen/index.tsx`

**Dependencies:** Steps 4.1–4.5

---

### Step 4.7: Register Navigation Route
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Make 2 modifications:

1. `src/navigation/types.ts` — Add to RootStackParamList:
   ```typescript
   AIStats: undefined;
   ```

2. `src/navigation/RootNavigator.tsx` — Register the screen:
   - Import AIStatsScreen from '@/screens/profile/AIStatsScreen'
   - Add <Stack.Screen name="AIStats" component={AIStatsScreen} options={{ headerShown: false }} />
   - Place it near the other profile screens (MyStatistics, etc.)
```

**Deliverables:**
- [ ] `src/navigation/types.ts` updated
- [ ] `src/navigation/RootNavigator.tsx` updated

**Dependencies:** Step 4.6

---

## Phase 5: Integration & Gating

### Step 5.1: Add Entry Point Card to MyStatisticsScreen
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Modify `src/screens/profile/MyStatisticsScreen/index.tsx` to add an AI Stats entry point card.

Add at the top of the ScrollView content (before OverviewStats):

```tsx
<FeatureLock
  feature="ai_stats"
  onUpgradePress={handleAdvancedStatsUpgrade}
  lockedMessage="AI-powered insights available in Premium"
>
  <TouchableOpacity
    onPress={() => navigation.navigate('AIStats')}
    style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    activeOpacity={0.7}
  >
    <Icon source="auto-fix" size={24} color={colors.primary} />
    <View style={styles.aiCardContent}>
      <Text style={[styles.aiCardTitle, { color: colors.textPrimary }]}>Ask AI About Your Stats</Text>
      <Text style={[styles.aiCardSubtitle, { color: colors.textSecondary }]}>
        "Show me my scoring trend for the past 5 rounds"
      </Text>
    </View>
    <Icon source="chevron-right" size={20} color={colors.textSecondary} />
  </TouchableOpacity>
</FeatureLock>
```

Add styles for aiCard (flexDirection: row, alignItems: center, padding, borderRadius, border, gap).

Import FeatureLock if not already imported. Import Icon from react-native-paper.
```

**Deliverables:**
- [ ] `src/screens/profile/MyStatisticsScreen/index.tsx` updated with entry point

**Dependencies:** Steps 4.7, 2.1 (feature ID registered)

---

### Step 5.2: Update Subscription Tier Config
**Status:** ⏳ Pending
**Type:** Custom

**Prompt:**
```
Modify `src/components/subscription/tierConfig.ts` to add AI Stats to the Premium tier feature list:

Add to the premium features array:
- 'AI-powered performance insights'

This ensures the Paywall screen shows this feature when users are considering upgrading.
```

**Deliverables:**
- [ ] `src/components/subscription/tierConfig.ts` updated

**Dependencies:** None

---

## Critical Files

### To Modify
- `src/hooks/queryKeys.ts` — Add `statsQuery` to `aiKeys`
- `src/types/subscription.types.ts` — Add `'ai_stats'` to FeatureId
- `src/hooks/subscription/validators.ts` — Add ai_stats boolean validator (Premium)
- `src/components/subscription/tierConfig.ts` — Add to Premium features list
- `src/navigation/types.ts` — Add `AIStats` route
- `src/navigation/RootNavigator.tsx` — Register AIStats screen
- `src/screens/profile/MyStatisticsScreen/index.tsx` — Add entry point card

### To Create
- `supabase/functions/analyze-stats/index.ts` — Edge Function handler
- `supabase/functions/analyze-stats/types.ts` — Request/response types
- `supabase/functions/analyze-stats/validation.ts` — Zod schemas
- `supabase/functions/analyze-stats/prompt.ts` — Claude system prompt
- `src/hooks/useGenerateAIStats.ts` — useMutation hook + limit hook
- `src/components/ai/stats/colorResolver.ts` — Semantic → theme color mapping
- `src/components/ai/stats/DynamicLineChart.tsx` — Line chart wrapper
- `src/components/ai/stats/DynamicBarChart.tsx` — Bar chart wrapper
- `src/components/ai/stats/DynamicPieChart.tsx` — Pie chart wrapper
- `src/components/ai/stats/DynamicStatCards.tsx` — Stat cards grid
- `src/components/ai/stats/DynamicComparisonTable.tsx` — Comparison table
- `src/components/ai/stats/DynamicTextInsight.tsx` — Text insight block
- `src/components/ai/stats/DynamicScoreDistribution.tsx` — Score distribution bars
- `src/components/ai/stats/VisualizationRenderer.tsx` — Chart type dispatcher
- `src/components/ai/stats/index.ts` — Barrel export
- `src/screens/profile/AIStatsScreen/index.tsx` — Main screen
- `src/screens/profile/AIStatsScreen/components/AIStatsInputState.tsx` — Input UI
- `src/screens/profile/AIStatsScreen/components/AIStatsLoadingState.tsx` — Loading UI
- `src/screens/profile/AIStatsScreen/components/AIStatsResultState.tsx` — Results UI
- `src/screens/profile/AIStatsScreen/components/AIStatsErrorState.tsx` — Error UI
- `src/screens/profile/AIStatsScreen/components/index.ts` — Barrel export
- `src/screens/profile/AIStatsScreen/hooks/useAIStatsFlow.ts` — State machine
- `src/screens/profile/AIStatsScreen/hooks/index.ts` — Barrel export

### Key Patterns to Reuse
- `supabase/functions/generate-competition/index.ts` — Edge Function pattern
- `src/hooks/useGenerateAICompetition.ts` — Mutation hook pattern
- `src/screens/admin/AICompetitionScreen/hooks/useAICompetitionFlow.ts` — State machine
- `src/screens/admin/AICompetitionScreen/hooks/useAILoadingAnimation.ts` — Loading animation
- `src/components/statistics/PerformanceChart.tsx` — Chart rendering pattern
- `src/components/subscription/FeatureLock.tsx` — Feature gating pattern
- `src/hooks/playerStatistics/` — Stats data (queries, helpers, types)

---

## Verification

- [ ] Edge Function deploys and responds correctly (`supabase functions serve` + curl test)
- [ ] Free/Social users see locked card on MyStatisticsScreen
- [ ] Premium users can navigate to AIStatsScreen
- [ ] Input screen shows suggestion chips, query limit counter
- [ ] Loading animation plays during API call
- [ ] Results render correct chart types for various queries (test all 6 categories)
- [ ] Follow-up suggestion chips trigger new queries
- [ ] Dark mode renders all charts correctly
- [ ] Insufficient data (0-1 rounds) shows helpful text_insight
- [ ] Daily limit (10/day) blocks after 10th query with friendly message
- [ ] Error states display properly with retry option
- [ ] `pnpm type-check` passes with no errors
