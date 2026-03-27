-- Reset ORCHESTRATOR agent to use Claude Opus (default configuration)
-- Run this in your PostgreSQL database

UPDATE "AgentConfig" 
SET 
  provider = 'bytez',
  model = 'anthropic/claude-opus-4-6',
  description = 'Brain of system - bad plan = everything fails'
WHERE name = 'ORCHESTRATOR';

-- Verify the change
SELECT * FROM "AgentConfig" WHERE name = 'ORCHESTRATOR';
