-- Migration: Add IP address field to jobs table
-- Safe to run on production - backward compatible
-- Date: 2024-12-19
-- Description: Adds ip_address column to track client IP addresses for job records

-- Check if the column already exists before adding it
-- This prevents errors if the migration is run multiple times
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'jobs'
    AND COLUMN_NAME = 'ip_address'
);

-- Only add the column if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE jobs ADD COLUMN ip_address VARCHAR(45) NULL COMMENT "Client IP address for the job"',
    'SELECT "Column ip_address already exists, skipping..." as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added successfully
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'jobs'
AND COLUMN_NAME = 'ip_address';

-- Show current jobs table structure
DESCRIBE jobs;
