-- Simple migration for price_is_right_admin database
-- Compatible with MySQL prepared statements

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
  file_type      VARCHAR(32) NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id            CHAR(36) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL,
  job_type      VARCHAR(32) NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  input_text    TEXT,
  file_id       CHAR(36),
  started_at    DATETIME,
  completed_at  DATETIME,
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, created_at),
  INDEX (status, job_type)
);

CREATE TABLE IF NOT EXISTS job_items (
  id            CHAR(36) PRIMARY KEY,
  job_id        CHAR(36) NOT NULL,
  row_index     INT,
  image_ref     VARCHAR(256),
  input_desc    TEXT,
  status        VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_id),
  INDEX (job_id, status)
);

CREATE TABLE IF NOT EXISTS search_events (
  id            CHAR(36) PRIMARY KEY,
  job_item_id   CHAR(36) NOT NULL,
  engine        VARCHAR(32) NOT NULL,
  query_text    TEXT,
  started_at    DATETIME DEFAULT NOW(),
  completed_at  DATETIME,
  success       TINYINT(1) NOT NULL DEFAULT 0,
  error_message TEXT,
  results_json  TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (job_item_id, engine)
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
  reason                  TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         CHAR(36) PRIMARY KEY,
  user_id    VARCHAR(64) NOT NULL,
  action     VARCHAR(64) NOT NULL,
  meta_json  TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, created_at)
);

-- Depreciation categories lookup
CREATE TABLE IF NOT EXISTS dep_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(8),
  name VARCHAR(128) UNIQUE NOT NULL,
  annual_depreciation_rate DECIMAL(6,4) NOT NULL,
  useful_life VARCHAR(16),
  examples_text TEXT
);