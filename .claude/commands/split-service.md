---
description: Split large service into focused modules (project)
---

Split Service: **{{arg1}}**

## Split Goals
{{arg2}}

## Instructions

1. Read the current service implementation
2. Identify distinct modules (providers, engines, DAOs, utilities)
3. Create new focused modules in a subdirectory
4. Keep the original service as orchestrator/factory
5. Ensure backward compatibility

## Standard Service Splitting Patterns

### Provider Pattern (for multiple implementations)
```
src/services/[serviceName]/
├── index.ts                        # Factory/orchestrator
├── AbstractProvider.ts             # Base class
├── providers/
│   ├── ProviderA.ts               # Implementation A
│   └── ProviderB.ts               # Implementation B
└── types.ts                       # Shared types
```

### Engine Pattern (for game types)
```
src/services/scoring/
├── index.ts                        # Orchestrator
├── engines/
│   ├── StablefordEngine.ts        # Stableford scoring
│   ├── StrokePlayEngine.ts        # Stroke play scoring
│   └── MatchPlayEngine.ts         # Match play scoring
└── types.ts
```

### DAO Pattern (for database operations)
```
src/services/offline/
├── index.ts                        # Main exports
├── DatabaseManager.ts              # Init/cleanup
├── dao/
│   ├── ScorecardDAO.ts            # Scorecard operations
│   ├── HoleScoreDAO.ts            # Score operations
│   └── SyncDAO.ts                 # Sync tracking
└── types.ts
```

## Process

1. **Identify pattern** - Provider, Engine, or DAO pattern
2. **Create structure** - Set up subdirectory
3. **Extract modules** - Move code to new files
4. **Add interfaces** - Define contracts between modules
5. **Create orchestrator** - Main service composes modules
6. **Update exports** - Re-export from index.ts

## Verification

- [ ] All existing usages still work
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Each module has single responsibility
- [ ] Clear interfaces between modules
