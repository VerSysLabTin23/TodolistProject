-- migrate:up
-- Add version and request_id columns for optimistic locking and idempotency
ALTER TABLE tasks
  ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE tasks
  ADD COLUMN request_id VARCHAR(128) NULL AFTER version;
ALTER TABLE tasks
  ADD UNIQUE KEY uniq_tasks_request_id (request_id);

-- migrate:down
ALTER TABLE tasks DROP INDEX uniq_tasks_request_id;
ALTER TABLE tasks DROP COLUMN request_id;
ALTER TABLE tasks DROP COLUMN version;
