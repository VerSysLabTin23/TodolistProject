-- migrate:up
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_teams_owner_id (owner_id),
    INDEX idx_teams_name (name)
);

CREATE TABLE IF NOT EXISTS team_members (
    user_id INT NOT NULL,
    team_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id),
    INDEX idx_team_members_team_id (team_id),
    INDEX idx_team_members_user_id (user_id),
    INDEX idx_team_members_role (role)
);

-- migrate:down
DROP TABLE team_members;
DROP TABLE teams;
