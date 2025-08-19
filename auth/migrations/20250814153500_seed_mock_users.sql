-- migrate:up
-- Insert default admin user (password: admin123)
-- In production, this should be changed immediately
INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES
  (1, 'admin', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', true, NOW(), NOW()),
  (2, 'john_doe', 'john@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'user', true, NOW(), NOW()),
  (3, 'jane_smith', 'jane@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', 'user', true, NOW(), NOW()),
  (4, 'bob_wilson', 'bob@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Wilson', 'user', true, NOW(), NOW()),
  (5, 'alice_brown', 'alice@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Alice', 'Brown', 'user', true, NOW(), NOW());

-- migrate:down
DELETE FROM users WHERE id IN (1, 2, 3, 4, 5);
