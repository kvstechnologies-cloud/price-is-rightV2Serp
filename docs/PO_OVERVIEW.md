## Product Owner Overview – AI Insurance Pricing (V2 Enhanced)

### Purpose and Value
- **What it does**: Identifies products (from text, CSV, or images) and returns a reliable replacement price with provenance from trusted retailers.
- **Who uses it**: Claims adjusters, pricing analysts, and internal tools needing standardized “Cost to Replace”.
- **Business value**: Faster, consistent pricing with audit trail, trusted-source bias, and automated batch workflows.

### High-Level Architecture
- **Backend**: Node.js + Express (`server/index.js`).
- **Frontend**: Vanilla JavaScript with ES6 modules served from `client/` for manual and CSV workflows.
- **AI & Search**: OpenAI (vision/text) for understanding; SerpAPI + Google CSE for live market prices; optional merchant scraping.
- **Audit/DB**: SQL-backed audit logging for jobs, items, and search events.
- **Storage (optional)**: S3 for file/image uploads when enabled.

### Core Flows
1) Single Item Pricing (API-first)
   - Input: item description (brand/model/specs if known) and user-selected price tolerance.
   - Output: price, `source` (retailer name only), URL, category/subcategory, matchQuality, isEstimated.

2) CSV Batch Pricing
   - Input: CSV/XLSX with item rows; processed in batches with adaptive throttling.
   - Output: paginated JSON and downloadable results; full audit records per job and item.

3) Image-Based Pricing
   - Input: Image(s) or base64; AI extracts product facts (brand/model/specs), then runs the standard pricing pipeline.
   - Output: Market price (new item only), plus AI analysis metadata.

4) Depreciation (optional enrichment)
   - Applies depreciation categories/rates to replacement totals and returns formatted percentages to four decimals.

### Processing Pipeline (How pricing works)
- Normalize text: clean chatter (sizes/prices), fix brand typos, generate precise queries.
- Multi-query strategy: construct several search variants (brand + product + key features).
- Market data: query SerpAPI + Google CSE; follow to merchant pages and scrape when needed.
- Scoring & validation: rank by title similarity, brand/model consistency, and source trust.
- Tolerance: enforce the user-selected price tolerance across comparisons.
- Result shaping: standardized JSON; `source` simplified to retailer names (e.g., "Walmart", "Amazon").
- Auditing: persist job, item, search events, and final choices for traceability.

### Key Policies
- **Trusted sources only**: Prefers major retailers; excludes untrusted marketplaces (e.g., Alibaba.com, eBay) from trustedSources.
- **User-selected tolerance**: Always applied; no hardcoded defaults.
- **No $1 prices**: Suspiciously low values are filtered; fallback strategies avoid placeholder pricing.
- **Brand handling**: "No Brand" treated as empty.
- **Depreciation formatting**: Percentages shown with four decimals and a percent sign (e.g., `0.0500%`).

### Primary Endpoints (HTTP)
- Health: `GET /health`
- Quick test: `GET /api/test`
- Pricing (text): `POST /api/process-item`
- CSV pricing: `POST /api/process-csv`, `POST /api/process-csv-optimized`
- Image pricing: `POST /api/process-image`, `POST /api/analyze-image`
- Depreciation: `POST /api/dep/apply`, `POST /api/dep/reload`
- Research analytics: `POST /api/research/session/start|end`, `GET /api/research/analytics|history|sessions|insights|export`, `POST /api/research/clear`
- Audit routes (when enabled): `GET /api/logs/*`

### Inputs & Outputs (at a glance)
- Inputs: description text, CSV/XLSX files, or images; optional target price and tolerance.
- Outputs: price (USD), `source` (retailer name), URL, category/subcategory, isEstimated, matchQuality; for CSV/image flows, includes job metadata suitable for export.

### Operations & Environment
- Local dev: `npm start` (defaults to port 5000). Health at `/health`.
- Env vars: require API keys for OpenAI, SerpAPI, Google CSE; DB and S3 are optional but recommended.
- Audit: SQL connection pool provides insertions for jobs, items, and search events (non-blocking if unavailable).

### Limitations & Safeguards
- Live market dependence: network/API availability affects breadth of results; adaptive throttling used in batches.
- Marketplace noise: strict trusted-source policy reduces false matches but may hide niche items; alternatives and baselines provide backstops.
- Vision accuracy: image understanding can vary; pipeline still validates via market data.

### Roadmap Highlights
- Deeper retailer integrations for direct pricing APIs.
- Expanded category-specific extractors and validation heuristics.
- UI enhancements for CSV progress, filtering, and export customization.

### Where to Start (for demos)
- UI: open `http://localhost:5000/`
- Single item: `POST /api/process-item`
- CSV batch: `POST /api/process-csv-optimized` (form field `csvFile`)



