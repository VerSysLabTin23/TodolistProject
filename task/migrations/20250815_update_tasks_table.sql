-- migrate:up
-- Add new columns to existing tasks table
ALTER TABLE tasks 
ADD COLUMN team_id INT NOT NULL DEFAULT 1 AFTER id,
ADD COLUMN creator_id INT NOT NULL DEFAULT 1 AFTER team_id,
ADD COLUMN assignee_id INT NULL AFTER creator_id;

-- Add indexes for better performance
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_priority_due ON tasks(priority, due);

-- Add foreign key constraints
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_tasks_creator_id FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT,
ADD CONSTRAINT fk_tasks_assignee_id FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- migrate:down
-- Remove foreign key constraints
ALTER TABLE tasks 
DROP FOREIGN KEY fk_tasks_assignee_id,
DROP FOREIGN KEY fk_tasks_creator_id,
DROP FOREIGN KEY fk_tasks_team_id;

-- Remove indexes
DROP INDEX idx_tasks_priority_due ON tasks;
DROP INDEX idx_tasks_assignee_id ON tasks;
DROP INDEX idx_tasks_creator_id ON tasks;
DROP INDEX idx_tasks_team_id ON tasks;

-- Remove columns
ALTER TABLE tasks 
DROP COLUMN assignee_id,
DROP COLUMN creator_id,
DROP COLUMN team_id;