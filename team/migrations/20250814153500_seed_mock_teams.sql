-- migrate:up
INSERT INTO teams (id, name, description, owner_id, created_at, updated_at)
VALUES
  (1, 'Development Team', 'Main development team for the project', 1, NOW(), NOW()),
  (2, 'Design Team', 'UI/UX design team', 3, NOW(), NOW()),
  (3, 'QA Team', 'Quality assurance team', 2, NOW(), NOW());

INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES
  (1, 1, 'owner', NOW()),
  (2, 1, 'admin', NOW()),
  (3, 1, 'member', NOW()),
  (3, 2, 'owner', NOW()),
  (4, 2, 'admin', NOW()),
  (2, 3, 'owner', NOW()),
  (5, 3, 'member', NOW());

-- migrate:down
DELETE FROM team_members WHERE team_id IN (1, 2, 3);
DELETE FROM teams WHERE id IN (1, 2, 3);
