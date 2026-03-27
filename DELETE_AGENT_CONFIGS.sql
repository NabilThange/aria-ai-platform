-- Delete all saved agent configurations
-- This will force the system to reload defaults from agents.config.ts on next startup

DELETE FROM "AgentConfig";

-- Verify deletion
SELECT COUNT(*) FROM "AgentConfig";
-- Should return 0

-- After running this, restart the backend server
-- The system will automatically load defaults from agents.config.ts
