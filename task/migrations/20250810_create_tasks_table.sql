-- migrate:up
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    creator_id INT NOT NULL,
    assignee_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    priority ENUM('low','medium','high') NOT NULL,
    due DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tasks_team_id (team_id),
    INDEX idx_tasks_creator_id (creator_id),
    INDEX idx_tasks_assignee_id (assignee_id),
    INDEX idx_tasks_due (due),
    INDEX idx_tasks_priority_due (priority, due)
    -- Foreign keys to external services (teams, users) are not enforced at DB level
    -- to avoid cross-database/service coupling. Application layer validates these IDs.
);

-- migrate:down
DROP TABLE tasks;