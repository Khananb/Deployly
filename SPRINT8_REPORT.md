# Sprint 8 - Production VPS Preparation Report

## Overview
This sprint focused entirely on preparing the Deployly infrastructure for a real production environment on an Oracle Cloud VPS. We did not add any new user-facing features. Instead, we fortified the backend's logging, created health checks, and established a strict, automated verification process for deployment.

## Files Modified & Created
1. **`INSTALL_VPS.md`** *(New)*
   - Detailed documentation on preparing the Oracle Cloud VPS, including firewall settings (VCN Ingress Rules), UFW configurations, and software installation instructions for MariaDB, Node.js, PM2, and Nginx.
2. **`PRODUCTION_CHECKLIST.md`** *(New)*
   - A step-by-step checklist to verify infrastructure readiness, deployment flow, configuration, and security settings before going live.
3. **`deploy.sh`** *(New)*
   - A bash script that verifies dependencies (Node, MariaDB, PM2, Git, Nginx) without installing them automatically.
   - It runs database migrations, creates secure storage folders, and runs the environment verifier.
4. **`backend/verify_environment.js`** *(New)*
   - A Node.js script run during deployment that validates:
     - Disk free space
     - Read/Write permissions for `storage/uploads`, `storage/sites`, and `storage/logs`.
     - Required environment variables (`JWT_SECRET`, `PORT`, `BASE_URL`).
     - MariaDB database connectivity.
     - Security packages presence (`cors`, `helmet`, `express-rate-limit`).
5. **`backend/utils/logger.js`** *(New)*
   - Implemented `winston` and `winston-daily-rotate-file` to generate daily log files with rotation (retained for 14 days, max 20MB, zipped archives).
   - Added a strict redaction layer that masks `password`, `token`, `authorization`, `jwt`, and sensitive environment variables from logs.
6. **`backend/controllers/healthController.js` & `backend/routes/healthRoutes.js`** *(New)*
   - Created a `GET /api/health` endpoint returning system metrics, DB health, storage writability, and Node process statistics (memory usage, uptime, version).
7. **`backend/server.js`**
   - Swapped `morgan` for the secure `winston` request logger and hooked in the new `/api/health` route.

## Production Readiness
- **Logging**: Safe, daily rotating, and automatically redacted logs ensure compliance and security.
- **Verification**: `verify_environment.js` enforces a strict gatekeeper. If the VPS isn't configured correctly or lacks permissions, the deployment fails *before* the server starts.
- **Health Checks**: Ops can now hit `/api/health` to programmatically monitor if the API, Database, and Storage disks are functioning correctly.

## Remaining Blockers Before Launch
- **Nginx & SSL Configuration**: The backend currently expects Nginx to act as a reverse proxy, handle SSL (Let's Encrypt), and serve the React frontend build. This setup still needs to be finalized on the live server itself.
- **Continuous Integration (CI/CD)**: The deployment currently relies on manual triggers or `deploy.sh`. An automated hook via GitHub Actions or GitLab CI is recommended.

**Sprint Complete. Ready for Production deployment!**
