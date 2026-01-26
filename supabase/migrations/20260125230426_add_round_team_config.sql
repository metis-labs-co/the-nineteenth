-- Add team_config JSONB column to rounds for standalone scramble team storage
-- Competition rounds use existing teams/team_members tables instead

ALTER TABLE rounds ADD COLUMN team_config JSONB;

COMMENT ON COLUMN rounds.team_config IS 'Stores ephemeral team configuration for standalone scramble rounds. Structure: { "teams": [{ "id": "team-1", "name": "Team 1", "memberIds": ["uuid1", "uuid2"] }] }';
