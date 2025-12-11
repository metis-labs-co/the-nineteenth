-- Migration: golfapi_optimization
-- Description: Add optimizations for GolfAPI.io course integration
-- Date: 2025-01-17

-- =====================================================
-- INDEXES FOR API COURSE LOOKUPS
-- =====================================================

-- Index on api_id for fast lookups when checking if course is already cached
CREATE INDEX IF NOT EXISTS idx_courses_api_id
  ON courses(api_id)
  WHERE api_id IS NOT NULL;

-- Index on source for filtering by course origin
CREATE INDEX IF NOT EXISTS idx_courses_source
  ON courses(source);

-- Index on last_synced for finding stale courses
CREATE INDEX IF NOT EXISTS idx_courses_last_synced
  ON courses(last_synced)
  WHERE source = 'api';

-- Composite index for common search pattern: name search within a state
CREATE INDEX IF NOT EXISTS idx_courses_state_name
  ON courses(state, name)
  WHERE state IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_courses_api_id IS 'Fast lookup of courses by external API identifier';
COMMENT ON INDEX idx_courses_source IS 'Filter courses by data source (api vs manual)';
COMMENT ON INDEX idx_courses_last_synced IS 'Find stale API courses for refresh';
COMMENT ON INDEX idx_courses_state_name IS 'Efficient name search within a state';
