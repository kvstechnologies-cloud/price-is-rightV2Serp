import { mysqlTable, varchar, text, timestamp, int, bigint, mysqlEnum, datetime, tinyint, index, primaryKey } from 'drizzle-orm/mysql-core';

// Users table
export const users = mysqlTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 320 }),
  name: varchar('name', { length: 120 }),
  authProvider: varchar('auth_provider', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Files table
export const files = mysqlTable('files', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  bucket: varchar('bucket', { length: 128 }).notNull(),
  s3Key: varchar('s3_key', { length: 512 }).notNull(),
  originalName: varchar('original_name', { length: 256 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  sha256: varchar('sha256', { length: 64 }),
  fileType: varchar('file_type', { length: 32 }).notNull(), // csv|xlsx|image
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
}));

// Jobs table
export const jobs = mysqlTable('jobs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  jobType: mysqlEnum('job_type', ['SINGLE', 'CSV', 'IMAGE']).notNull(),
  status: mysqlEnum('status', ['QUEUED', 'RUNNING', 'PARTIAL_SUCCESS', 'SUCCESS', 'FAILED']).notNull().default('QUEUED'),
  inputText: text('input_text'),
  fileId: varchar('file_id', { length: 36 }),
  startedAt: datetime('started_at'),
  completedAt: datetime('completed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdCreatedAtIdx: index('user_id_created_at_idx').on(table.userId, table.createdAt),
  statusJobTypeIdx: index('status_job_type_idx').on(table.status, table.jobType),
}));

// Job items table
export const jobItems = mysqlTable('job_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  jobId: varchar('job_id', { length: 36 }).notNull(),
  rowIndex: int('row_index'),
  imageRef: varchar('image_ref', { length: 256 }),
  inputDesc: text('input_desc'),
  status: mysqlEnum('status', ['PENDING', 'PROCESSING', 'DONE', 'ERROR']).notNull().default('PENDING'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  jobIdIdx: index('job_id_idx').on(table.jobId),
  jobIdStatusIdx: index('job_id_status_idx').on(table.jobId, table.status),
}));

// Search events table
export const searchEvents = mysqlTable('search_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  jobItemId: varchar('job_item_id', { length: 36 }).notNull(),
  engine: mysqlEnum('engine', ['serpapi', 'cse', 'scraper']).notNull(),
  queryText: text('query_text'),
  startedAt: datetime('started_at').default(new Date()),
  completedAt: datetime('completed_at'),
  success: tinyint('success').notNull().default(0),
  errorMessage: text('error_message'),
  resultsJson: text('results_json'), // JSON stored as text for MySQL compatibility
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  jobItemIdEngineIdx: index('job_item_id_engine_idx').on(table.jobItemId, table.engine),
}));

// Final choices table
export const finalChoices = mysqlTable('final_choices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  jobItemId: varchar('job_item_id', { length: 36 }).notNull().unique(),
  sourceDomain: varchar('source_domain', { length: 120 }),
  productTitle: text('product_title'),
  priceCents: int('price_cents'),
  currency: varchar('currency', { length: 8 }),
  url: varchar('url', { length: 1024 }),
  validated: tinyint('validated').default(0),
  validatedPriceCents: int('validated_price_cents'),
  validationMethod: varchar('validation_method', { length: 64 }),
  isTrustedDomain: tinyint('is_trusted_domain').default(0),
  decidedAt: datetime('decided_at').default(new Date()),
  reason: text('reason'),
});

// Audit logs table
export const auditLogs = mysqlTable('audit_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(), // SEARCH_SINGLE|UPLOAD_FILE|PROCESS_ROW|RETRY|VIEW_DASHBOARD
  metaJson: text('meta_json'), // JSON stored as text
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdCreatedAtIdx: index('user_id_created_at_idx').on(table.userId, table.createdAt),
}));

// Export types for use in the application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobItem = typeof jobItems.$inferSelect;
export type NewJobItem = typeof jobItems.$inferInsert;
export type SearchEvent = typeof searchEvents.$inferSelect;
export type NewSearchEvent = typeof searchEvents.$inferInsert;
export type FinalChoice = typeof finalChoices.$inferSelect;
export type NewFinalChoice = typeof finalChoices.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
