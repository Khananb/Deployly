# SPRINT 6 REPORT: Real Hosting Implementation

## Overview
Deployly has been fully decoupled from the mock local arrays and is now prepared for production MariaDB integration on your Oracle VPS. We have also hardened the deployment pipeline.

## 1. Mocks Removed
Every instance of in-memory fake persistence has been entirely purged from the codebase:
- `backend/config/db.js` now uses `mysql2/promise` with connection pooling limits properly configured.
- `websiteService.js`, `deploymentService.js`, `domainService.js`, `dashboardService.js`, `databaseService.js`, and `authService.js` now universally rely on parameterized MySQL queries.

## 2. Deployment Pipeline Hardening
The previous `POST /upload` route that performed extraction and detection all in one go has been split logically to protect performance and prevent race conditions:
1. **`POST /api/websites/:id/upload`**: Validates size (`<100MB`), enforces `.zip` MIME type, generates metadata via `multer`, saves to `storage/uploads/`, and creates a `deployment` record in the database marking it as `uploaded`.
2. **`POST /api/websites/:id/deploy`**: Verifies ownership and active jobs to prevent concurrent overlapping deploys. Extracts the payload natively blocking Zip-Slip vulnerabilities. Checks `package.json` vs `index.html` and flags status as `ready` or `running` respectively.

## 3. Database Prepared
- Schema generated in `schema.sql`.
- Added strict referential integrity (`ON DELETE CASCADE`).
- All tables support `created_at` and `updated_at` timestamps implicitly via MySQL default triggers.
- Logs now persist to `deployment_logs`.

## 4. Remaining Blockers before Production
- PM2 / Nginx Script Executions: We need to write the `child_process.exec()` wrappers in Node to actually call `pm2 start <id>` or reload nginx configs when a site hits the `ready` or `running` statuses.
- Real execution environment variables: `NODE_ENV=production` needs to be enforced.

## 5. Next Steps
Transfer `migration_report.md` to your VPS, execute the MariaDB configuration instructions, and copy this codebase into the server!
