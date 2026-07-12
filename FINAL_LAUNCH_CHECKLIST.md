# Final Launch Checklist (Sprint 13)

Before turning the proxy onto public DNS, physically verify the following configuration items on the Oracle Cloud VPS.

## 1. Infrastructure Preparation
- [ ] **Firewall**: Ensure UFW is active and exclusively allowing ports 22, 80, and 443.
- [ ] **Oracle Security List**: Ingress rules for 80 and 443 are configured in the Oracle VCN.
- [ ] **Memory Monitoring**: Allocate a small swap file (2GB) if the VPS has less than 2GB RAM to prevent `npm install` from failing with ENOMEM.

## 2. Secrets & Environment
- [ ] `.env` file generated with secure passwords for DB.
- [ ] `JWT_SECRET` is generated using a secure random hex string (do not use default).
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` are correctly injected and mapped to the Live Merchant Account.
- [ ] Verify `node verify_environment.js` prints all green marks before booting.

## 3. Runtime Verification
- [ ] **Database Setup**: Execute `npm run migrate` or run `migrate_sprint9.js` and `migrate_sprint12.js` sequentially against the production MariaDB.
- [ ] **PM2 Boot**: Launch using `pm2 start ecosystem.config.js`.
- [ ] **PM2 Persist**: Save the active list utilizing `pm2 save` and integrate systemd with `pm2 startup`.

## 4. Reverse Proxy & Security
- [ ] Nginx configurations (`deployly.conf` and `security.conf`) copied to `/etc/nginx/sites-available` and symlinked to `sites-enabled`.
- [ ] Run `sudo nginx -t` to confirm syntax validity.
- [ ] Issue SSL certificates via `certbot --nginx -d deployly.online -d www.deployly.online`.
- [ ] Test the `/api/health` endpoint remotely using `curl -I https://deployly.online/api/health`.

## 5. Live Production Test
- [ ] Register a live account on the deployed domain.
- [ ] Deploy a simple Node.js 'Hello World' app and verify PM2 spins it up.
- [ ] Trigger an intentional Grace period via Database manual update and ensure the Cron successfully terminates the app.
- [ ] Restore the app manually via Webhook mock payload.
