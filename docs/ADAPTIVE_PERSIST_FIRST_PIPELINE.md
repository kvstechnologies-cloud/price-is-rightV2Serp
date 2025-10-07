# Adaptive Persist-First Processing Pipeline (Draft)

Status: Draft for review
Owner: Engineering
Last updated: YYYY-MM-DD

## Summary

This document proposes a single, adaptive pipeline used by both browser uploads and backend ingestion (FTP/S3/folder) to:

- Persist rows first, then process from the database
- Support resumable, time-sliced processing (no timeouts)
- Allow job- and item-level reprocessing (NOT_FOUND/ERROR)
- Render grid directly from `job_items.result_json`
- Regenerate Excel/CSV at any time from DB results
- Adapt batch sizes and concurrency automatically based on live signals

The goal is higher reliability and better perceived performance without hardcoding fragile constants.

## Objectives

- One code path for CSV and Image jobs (browser or backend)
- Resumable, fault-tolerant processing with per-item checkpoints
- Smart, self-tuning ingestion and processing
- Exact parity between grid view and exported files
- Minimal friction rollout with feature flag

## Data Model Changes (Backwards Compatible)

Tables already exist: `users`, `files`, `jobs`, `job_items`, `search_events`.

Proposed additions:

- `jobs`
  - `queue_state ENUM('QUEUED','RUNNING','PAUSED','DONE','FAILED')`
  - `total_items INT`
  - `processed_items INT`
  - `failed_items INT`
  - `last_heartbeat DATETIME`
  - `attempts INT`
  - `last_error TEXT`
- `job_items`
  - `input_json JSON` (raw row or image metadata)
  - `normalized_json JSON` (canonicalized fields)
  - `result_json JSON` (exact grid-output shape)
  - `status ENUM('PENDING','PROCESSING','DONE','ERROR','NOT_FOUND','SKIPPED')`
  - `attempts INT DEFAULT 0`
  - `last_error TEXT`
  - `locked_by VARCHAR(64)`
  - `locked_at DATETIME`
  - `updated_at DATETIME`
- Indexes
  - `job_items(job_id)`
  - `job_items(job_id, status)`
  - `jobs(user_id, created_at)`
  - `jobs(status, job_type)`

Notes:
- Keep `files` and `search_events` unchanged.
- All new columns are nullable/defaulted to avoid downtime.

## Adaptive Behavior

### Ingestion (Persist to DB)

- Insert `job_items` in variable-size batches:
  - Start small, grow exponentially (e.g., 64 → 128 → 256 ...) until any soft limit trips.
  - Hard bounds: `minRows`, `maxRows`, `maxBatchBytes` (payload aware).
  - Signals to adjust size:
    - DB latency EWMA vs thresholds (p50/p95)
    - Pool wait time > 0 (shrink)
    - Insert errors (backoff + jitter, shrink aggressively)

### Worker (Processing)

- Time-sliced controller (target slice e.g. 5s):
  - Claim size computed dynamically: `itemsToClaim = clamp((targetSliceMs / avgItemMs) * safetyFactor, minClaim, maxClaim)`
  - `avgItemMs` is EWMA over last N items
  - SafetyFactor ~0.6–0.8 to avoid overruns
- Backpressure:
  - 429/5xx rate up → reduce concurrency, add per-domain delay
  - High CPU/memory → reduce claim size
  - Error spikes → temporary shrink + longer retry spacing
- Locks & retries:
  - Lock expiry adaptive: `max(2×avgItemMs, floorMs)` with cap
  - Retry backoff with jitter by error class
  - NOT_FOUND retried conservatively; alter query strategies on retry

## API Design (Minimal, Unified)

- `POST /api/jobs` → ingest (CSV/Image upload) → `{ jobId }`
- `GET /api/jobs/:jobId` → job metadata + counters
- `GET /api/jobs/:jobId/items?status=&page=&pageSize=&sort=` → paginated grid data from DB
- `POST /api/jobs/:jobId/kickoff?durationMs=5000` → run processing time-slice; repeatable
- `POST /api/jobs/:jobId/resume|pause` → control queue_state
- `POST /api/jobs/:jobId/reprocess`
  - Body: `{ scope: 'job'|'items', itemIds?: string[], statuses?: ['ERROR','NOT_FOUND'] }`
- `POST /api/jobs/:jobId/export?format=xlsx|csv` → regenerate from DB
- Optional: `POST /api/ingestion/scan` for FTP/S3/folder adapters

All endpoints enforce ownership (by `user_id`) and support admin overrides.

## Processing Parity (Browser and Backend)

- Browser "Process Now":
  - Upload → `POST /api/jobs` ingests and returns `{ jobId }`
  - UI polls `/jobs/:jobId`, `/jobs/:jobId/items`
  - UI can call `kickoff` repeatedly for time-sliced progress
- Backend ingestion (FTP/S3/folder):
  - Adapter calls `POST /api/jobs` with file reference (S3 key, local path)
  - Background worker processes; same DB, same outputs

## Reprocessing

- Job-level:
  - `statuses` default to `['ERROR','NOT_FOUND']` and `attempts < maxAttempts`
  - Resets status to `PENDING`, clears locks, optionally resets attempts
- Item-level:
  - UI-selected items via `itemIds`
- Strategy rotation for retries (query variants, retailer priority changes)
- Guardrails: maxAttempts, exponential backoff, permanent failure classification

## Grid and Export

- Grid reads from `job_items.result_json` (already normalized to display shape)
- Export streams from DB with canonical headers; no recomputation

## Observability

- Metrics to collect:
  - ingest_ms, items_sec, error_rate, not_found_rate
  - db_latency_ewma, pool_wait_ms
  - queue_depth (PENDING count)
  - api_throttle_rate per provider
- Logs:
  - job lifecycle events, item processing transitions, retry decisions

## Performance Expectations

- Ingestion: O(n) IO but batched and adaptive; typical 5–10k rows in seconds
- Browser UX improves (short requests; progress visible)
- Resumable: can pause/resume and reprocess subsets without re-upload

## Rollout Plan

1. Migrations (columns + indexes), all nullable
2. Implement `POST /api/jobs` and DB-backed grid/export endpoints
3. Implement worker and `kickoff` time-slice endpoint
4. Feature flag `DB_INGEST_ENABLED=true` to switch CSV/Image routes to ingest-first
5. Canary on small jobs; compare outputs with current path
6. Flip default; monitor metrics; tune thresholds if needed
7. Add ingestion adapters (FTP/S3/folder)

## Configuration (Bounds, not fixed constants)

Environment variables (with sensible defaults):

- Ingest:
  - `INGEST_MIN_ROWS`, `INGEST_MAX_ROWS`, `INGEST_MAX_BATCH_BYTES`
  - `DB_P95_MS`, `DB_P50_MS` targets for EWMA comparison
- Worker:
  - `WORKER_TARGET_SLICE_MS`, `CLAIM_MIN`, `CLAIM_MAX`, `SAFETY_FACTOR`
  - `LOCK_FLOOR_MS`, `LOCK_CAP_MS`, `MAX_ATTEMPTS_ERROR`, `MAX_ATTEMPTS_NOT_FOUND`
  - Provider-specific throttle/backoff knobs

System adjusts within bounds based on live signals.

## Security

- Enforce job access by `user_id`
- Persist `user_id`, `ip_address`, `file_id` on jobs; optionally on items for fine-grained audit

## Open Questions

- What are acceptable defaults for `MAX_ATTEMPTS_NOT_FOUND` and retry spacing?
- Should we store minimal denormalized columns (e.g., price, status) alongside `result_json` for reporting indexes?
- Do we need per-tenant limits (max concurrent jobs/items)?
- Which ingestion adapters are priority (FTP vs S3 vs local folder)?

## Pending Screens Implementation

### Goal
Add a Pending view per-job and an optional global Pending dashboard that scale to millions of rows, are owner-safe, and don't slow the hot path.

### Non-negotiables
- Keyset pagination only (no OFFSET) using `(updated_at, id)` with a base64 cursor
- Consistent ordering: `ORDER BY updated_at ASC, id ASC` and the where-clause must match the sort
- Denormalize for speed: set `job_items.user_id` (and optionally `job_type`) at ingest; always keep `updated_at` fresh on every state change
- Indexes first:
  - Per-job: `job_items(job_id, status, updated_at, id)`
  - Global: `job_items(status, user_id, updated_at, id)` (+ optional `…job_type…`)
- Lightweight payloads: never pull full `input_json`; extract a tiny `inputSummary` server-side
- Ownership: resolve `userId=me` server-side; only admins can query all users
- Feature flag: global dashboard is behind a flag; per-job tab is always available
- Idempotent migrations + one-time backfill from `jobs` → `job_items` (`user_id` / `job_type`)
- Telemetry: emit `pending_count`, `items_sec`, and slow-query timings; log cursor boundaries

### APIs

**Per-job tab:**
```
GET /api/jobs/:jobId/items?statuses=PENDING,PROCESSING&pageSize=100&after=...
```

**Global dashboard (flagged):**
```
GET /api/pending?statuses=PENDING,PROCESSING&userId=me|all&jobType=&pageSize=100&after=...
```

### SQL Patterns

**Per-job (keyset):**
```sql
SELECT ji.id, ji.job_id, ji.status, ji.attempts, ji.locked_by, ji.locked_at, ji.updated_at,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.title'))  AS inputTitle,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.brand'))  AS inputBrand,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.sku'))    AS inputSku
FROM job_items ji
WHERE ji.job_id = :jobId
  AND ji.status IN ('PENDING','PROCESSING')
  AND ( (:afterUpdatedAt IS NULL AND :afterId IS NULL)
        OR (ji.updated_at > :afterUpdatedAt)
        OR (ji.updated_at = :afterUpdatedAt AND ji.id > :afterId) )
ORDER BY ji.updated_at ASC, ji.id ASC
LIMIT :pageSize;
```

**Global (keyset, denormalized user_id):**
```sql
SELECT ji.id, ji.job_id, ji.user_id, ji.job_type, ji.status, ji.attempts,
       ji.locked_by, ji.locked_at, ji.updated_at,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.title')) AS inputTitle,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.brand')) AS inputBrand,
       JSON_UNQUOTE(JSON_EXTRACT(ji.input_json,'$.sku'))   AS inputSku
FROM job_items ji
WHERE ji.status IN ('PENDING','PROCESSING')
  AND (:userId IS NULL OR ji.user_id = :userId)         -- NULL means admin/all
  AND (:jobType IS NULL OR ji.job_type = :jobType)
  AND ( (:afterUpdatedAt IS NULL AND :afterId IS NULL)
        OR (ji.updated_at > :afterUpdatedAt)
        OR (ji.updated_at = :afterUpdatedAt AND ji.id > :afterId) )
ORDER BY ji.updated_at ASC, ji.id ASC
LIMIT :pageSize;
```

### Cursor Format
Encode `updated_at|id` as base64 on the server; decode defensively (timezone-aware).

### UI
Two places: a Pending tab inside Job Detail, and a Pending dashboard screen (flagged).

**Columns:** Item ID, Job ID, Title/Brand, Status, Attempts, LockedBy, UpdatedAt, [JobType chip], [progress pill].

**Filters:** Status (default PENDING+PROCESSING), JobType, JobId, Date range.

**Actions:** "Go to Job", "Reprocess selected".

### Edge Cases
- Empty pages, deleted/paused jobs, items with identical timestamps (use `(updated_at,id)`)
- Locking rows in PROCESSING should still appear; don't starve PENDING
- Large `input_json`—always project a tiny summary

### Deliverables (single PR)
- Migrations + backfill script
- DAO methods implementing the keyset queries
- Two endpoints with ownership checks, cursor encode/decode helpers
- Basic Jest/integration tests for pagination, filters, and security
- UI tab + dashboard pages with infinite scroll
- Feature flag wiring, docs, and dashboards/metrics

### Updated Data Model Changes
The existing `job_items` schema needs these additional columns:
- `user_id BIGINT NULL` (denormalized from `jobs.user_id`)
- `job_type VARCHAR(32) NULL` (denormalized from `jobs.job_type`)
- `updated_at DATETIME NULL` (updated on every status change)

**Additional indexes:**
- `job_items(job_id, status, updated_at, id)` for per-job pending queries
- `job_items(status, user_id, updated_at, id)` for global pending queries
- Optional: `job_items(status, user_id, job_type, updated_at, id)` if job_type filtering is common

### Updated API Design
The existing API design is enhanced with:
- `GET /api/jobs/:jobId/items?statuses=PENDING,PROCESSING&pageSize=&after=` → paginated pending items for specific job
- `GET /api/pending?statuses=PENDING,PROCESSING&userId=me|all&jobType=&pageSize=&after=` → global pending dashboard (feature-flagged)

### Updated Observability
Additional metrics to collect:
- `pending_count` (fast COUNT, cached 30–60s)
- `items_sec` for pending queries
- Slow query timings for pagination endpoints
- Cursor boundary logging (first/last `(updated_at,id)`)

## Next Steps

- Approve schema changes and API shapes
- Implement migrations and endpoint skeletons behind a feature flag
- Instrument EWMA collectors and adaptive controllers
- Ship a reference worker with time-sliced kickoff and background loop
- Implement pending screens with keyset pagination and denormalized columns

