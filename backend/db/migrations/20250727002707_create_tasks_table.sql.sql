-- migrate:up
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATETIME,
    author_id INT NOT NULL,
    assignee_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
);


-- migrate:down
DROP TABLE tasks;

