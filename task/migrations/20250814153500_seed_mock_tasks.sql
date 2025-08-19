-- migrate:up
INSERT INTO tasks (team_id, creator_id, assignee_id, title, description, completed, priority, due, created_at, updated_at)
VALUES
  (1, 1, 2, 'Learn Go Web Dev', 'Follow tutorial and build API', false, 'high',   '2025-08-25', NOW(), NOW()),
  (1, 1, 3, 'Write Documentation', 'Document all API endpoints', false, 'medium', '2025-08-28', NOW(), NOW()),
  (1, 2, 1, 'Fix Bugs', 'Resolve all reported issues', true, 'low',     '2025-09-01', NOW(), NOW()),
  (2, 3, 4, 'Design UI Mockups', 'Create wireframes for new features', false, 'high', '2025-08-30', NOW(), NOW()),
  (2, 4, NULL, 'Review Code', 'Code review for pull requests', false, 'medium', '2025-09-05', NOW(), NOW());

-- migrate:down
DELETE FROM tasks
WHERE title IN ('Learn Go Web Dev', 'Write Documentation', 'Fix Bugs', 'Design UI Mockups', 'Review Code');
