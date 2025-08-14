-- migrate:up
INSERT INTO tasks (title, description, completed, priority, due, created_at, updated_at)
VALUES
  ('Learn Go Web Dev', 'Follow tutorial and build API', false, 'high',   '2025-08-25 18:00:00', NOW(), NOW()),
  ('Write Documentation', 'Document all API endpoints', false, 'medium', '2025-08-28 12:00:00', NOW(), NOW()),
  ('Fix Bugs', 'Resolve all reported issues', true, 'low',     '2025-09-01 09:00:00', NOW(), NOW());

-- migrate:down
DELETE FROM tasks
WHERE title IN ('Learn Go Web Dev', 'Write Documentation', 'Fix Bugs');
