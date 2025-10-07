-- 001_init.sql
-- Initial migration for audit and persistence system
-- Run this on your Aurora MySQL instance

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64) PRIMARY KEY,
  email         VARCHAR(320),
  name          VARCHAR(120),
  auth_provider VARCHAR(64),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id             CHAR(36) PRIMARY KEY,
  user_id        VARCHAR(64) NOT NULL,
  bucket         VARCHAR(128) NOT NULL,
  s3_key         VARCHAR(512) NOT NULL,
  original_name  VARCHAR(256) NOT NULL,
  mime_type      VARCHAR(128) NOT NULL,
  size_bytes     BIGINT NOT NULL,
  sha256         CHAR(64),
  file_type      VARCHAR(32) NOT NULL, -- csv|xlsx|image
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  CONSTRAINT fk_files_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id            CHAR(36) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  job_type      ENUM('SINGLE','CSV','IMAGE') NOT NULL,
  status        ENUM('QUEUED','RUNNING','PARTIAL_SUCCESS','SUCCESS','FAILED') NOT NULL DEFAULT 'QUEUED',
  input_text    TEXT,
  file_id       CHAR(36),
  started_at    DATETIME,
  completed_at  DATETIME,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, created_at),
  INDEX (status, job_type),
  CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_jobs_file FOREIGN KEY (file_id) REFERENCES files(id)
);

CREATE TABLE IF NOT EXISTS job_items (
  id            CHAR(36) PRIMARY KEY,
  job_id        CHAR(36) NOT NULL,
  row_index     INT,
  image_ref     VARCHAR(256),
  input_desc    TEXT,
  status        ENUM('PENDING','PROCESSING','DONE','ERROR') NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_id),
  INDEX (job_id, status),
  CONSTRAINT fk_items_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Store engine outputs raw in JSON to avoid coupling with current logic
CREATE TABLE IF NOT EXISTS search_events (
  id            CHAR(36) PRIMARY KEY,
  job_item_id   CHAR(36) NOT NULL,
  engine        ENUM('serpapi','cse','scraper') NOT NULL,
  query_text    TEXT,
  started_at    DATETIME DEFAULT NOW(),
  completed_at  DATETIME,
  success       TINYINT(1) NOT NULL DEFAULT 0,
  error_message TEXT,
  results_json  JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_item_id, engine),
  CONSTRAINT fk_events_item FOREIGN KEY (job_item_id) REFERENCES job_items(id)
);

CREATE TABLE IF NOT EXISTS final_choices (
  id                      CHAR(36) PRIMARY KEY,
  job_item_id             CHAR(36) NOT NULL UNIQUE,
  source_domain           VARCHAR(120),
  product_title           TEXT,
  price_cents             INT,
  currency                VARCHAR(8),
  url                     VARCHAR(1024),
  validated               TINYINT(1) DEFAULT 0,
  validated_price_cents   INT,
  validation_method       VARCHAR(64),
  is_trusted_domain       TINYINT(1) DEFAULT 0,
  decided_at              DATETIME DEFAULT NOW(),
  reason                  TEXT,
  CONSTRAINT fk_choice_item FOREIGN KEY (job_item_id) REFERENCES job_items(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         CHAR(36) PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL,
  action     VARCHAR(64) NOT NULL, -- SEARCH_SINGLE|UPLOAD_FILE|PROCESS_ROW|RETRY|VIEW_DASHBOARD
  meta_json  JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id)
);
