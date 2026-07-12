# Production Deployment Checklist

Before taking the application live, ensure every item on this checklist is marked as complete.

## 1. Infrastructure Preparation
- [ ] Oracle Cloud VPS instantiated (Ubuntu 22.04+).
- [ ] SSH access secured (Password authentication disabled, key-based enabled).
- [ ] Oracle VCN Ingress Rules configured (Port 22, 80, 443 open; 3306 closed to public).
- [ ] UFW configured and enabled on the OS.

## 2. Software Installation
- [ ] Node.js (LTS version) installed.
- [ ] MariaDB Server installed and secured (`mysql_secure_installation`).
- [ ] Nginx installed.
- [ ] PM2 installed globally.
- [ ] Git installed.

## 3. Deployment Flow
- [ ] Repository cloned to the server (e.g., `/var/www/deployly`).
- [ ] `.env` file created in `backend/.env` with strong secrets (`JWT_SECRET`, `DB_PASSWORD`).
- [ ] `bash deploy.sh` executed successfully.
- [ ] `node verify_environment.js` passed all checks.

## 4. Application Configuration
- [ ] `BASE_URL` environment variable properly points to the production domain.
- [ ] Storage folders (`uploads`, `sites`, `logs`) exist with correct `750` or `755` permissions.
- [ ] Database schema and migrations applied successfully.
- [ ] Backend started successfully using `pm2 start server.js --name "deployly-api"`.

## 5. Reverse Proxy & Security
- [ ] Nginx configured to reverse proxy traffic from `localhost:3000` to port 80/443.
- [ ] SSL Certificate acquired via Let's Encrypt (Certbot) and applied to Nginx.
- [ ] Nginx proxy settings include `Host`, `X-Real-IP`, and `X-Forwarded-For` headers.

## 6. QA & Monitoring
- [ ] Visited `GET /api/health` and verified status is `ok` for API, Database, and Storage.
- [ ] Uploaded a sample static website and verified deployment preview works.
- [ ] Verified that daily log rotation is active in `storage/logs/`.
- [ ] PM2 configured to start on boot (`pm2 save` && `pm2 startup`).
