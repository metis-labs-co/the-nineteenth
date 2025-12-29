-- Migration: home_course
-- Description: Add home_course_id to players table for designating a user's home course
-- Date: 2025-03-17
-- NOTE: This migration was later superseded by 20251227000000_home_course_to_venue.sql
--       which changes home_course_id to home_venue_id

-- =====================================================
-- ADD HOME COURSE COLUMN TO PLAYERS TABLE
-- =====================================================

-- Add home_course_id column to players table
-- ON DELETE SET NULL ensures if the course is deleted, the reference is cleared (not cascaded)
ALTER TABLE players
ADD COLUMN home_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Add index for efficient queries when filtering by home course
CREATE INDEX idx_players_home_course ON players(home_course_id);

-- Add comment for documentation
COMMENT ON COLUMN players.home_course_id IS 'Reference to the player''s designated home course. Only one home course per player.';
