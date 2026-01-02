---
description: Design database schema with tables, RLS policies, indexes, and triggers (project)
---

Design database schema for: **{{arg1}}**

## Instructions

1. Review existing types in `src/types/index.ts` for consistency
2. Check existing schema documentation in `docs/database/DATABASE_SCHEMA.md`
3. Follow PostgreSQL + Supabase patterns

## Requirements

### Schema Design
- UUID primary keys with `gen_random_uuid()`
- Foreign key relationships with CASCADE/RESTRICT
- Status columns with CHECK constraints
- JSONB columns for flexible data (scores, metadata)
- Timestamps (created_at, updated_at)

### Security
- Enable Row Level Security (RLS)
- Create policies for SELECT, INSERT, UPDATE, DELETE
- Consider multi-tenancy (users only see their data)

### Performance
- Indexes on foreign keys
- Indexes on query columns
- Consider partial indexes for filtered queries

### Conventions
- Use snake_case for columns
- Use CHECK constraints for enums
- Add `updated_at` trigger

## Schema Template

```sql
CREATE TABLE {{entity}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fields
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Relationships
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_{{entity}}_owner ON {{entity}}(owner_id);

-- RLS
ALTER TABLE {{entity}} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{{entity}}_select_policy" ON {{entity}}
  FOR SELECT USING (owner_id = auth.uid());

-- Trigger
CREATE TRIGGER update_{{entity}}_updated_at
  BEFORE UPDATE ON {{entity}}
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Additional Context
{{arg2}}

## Output

After designing the schema:
1. Migration SQL for PostgreSQL
2. RLS policy explanation
3. Index strategy for common queries
4. TypeScript types to add to `src/types/index.ts`

## Verification

Before considering the task complete:
1. Run type check: `pnpm typecheck`
2. Run lint check: `pnpm lint`
3. Fix any errors or warnings that were introduced
