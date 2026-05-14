-- Clear all data from ARIA database
-- This will delete all tasks, messages, summaries, and files
-- CASCADE constraints will handle related records automatically

BEGIN;

-- Delete all records (CASCADE will handle related data)
DELETE FROM "Task";

-- Optionally, you can also explicitly delete from other tables
-- but CASCADE should handle this automatically
DELETE FROM "Message";
DELETE FROM "Summary";
DELETE FROM "File";

-- Keep AgentConfig as it contains system configuration
-- DELETE FROM "AgentConfig"; -- Uncomment if you want to clear this too

COMMIT;

-- Verify deletion
SELECT 'Tasks remaining:' as info, COUNT(*) as count FROM "Task"
UNION ALL
SELECT 'Messages remaining:', COUNT(*) FROM "Message"
UNION ALL
SELECT 'Summaries remaining:', COUNT(*) FROM "Summary"
UNION ALL
SELECT 'Files remaining:', COUNT(*) FROM "File";
