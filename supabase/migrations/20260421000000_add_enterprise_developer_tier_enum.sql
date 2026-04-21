-- Migration: Add 'enterprise' and 'developer' values to subscription_tier enum
--
-- Enterprise: paid tier above Premium, below Super Admin. Higher resource
--             limits for large organisations / serious organisers.
-- Developer:  internal-only tier above Super Admin. Used to gate beta/WIP
--             features behind a flag for in-production testing.
--
-- Postgres requires new enum values to be committed before they can be used,
-- so tier_limits seed data and helper-function updates live in the paired
-- migration 20260421000001_add_enterprise_developer_tier_data.sql.

ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'enterprise' BEFORE 'super_admin';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'developer';
