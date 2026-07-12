# Deployly Production Deployment Guide

This guide covers the definitive process for taking Deployly from a fresh Oracle Cloud VPS to a fully secure, production-grade deployment behind Nginx with Let's Encrypt SSL.

## 1. Oracle VPS & Firewall
1. **Provisioning**: Spin up an Ubuntu 22.04/24.04 instance on Oracle Cloud.
2. **Oracle VCN Rules**: Go to your VCN Security Lists and add Ingress rules for:
   - Port `22` (SSH)
   - Port `80` (HTTP)
   - Port `443` (HTTPS)
   - *Ensure Port `3306` (MariaDB) is blocked from the internet.*
3. **OS Firewall (UFW)**:
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

## 2. Dependencies (Node, MariaDB, Nginx, Git)
Use the automated `deploy.sh` script to verify dependencies. If missing, manually install them:
```bash
# Node.js (v20 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git curl wget unzip nginx mariadb-server
```

## 3. Database Preparation (MariaDB)
1. Secure the installation: `sudo mysql_secure_installation`
2. Create the production database and user:
   ```sql
   CREATE DATABASE deployly;
   CREATE USER 'deployly'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON deployly.* TO 'deployly'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Load the schema (handled by `deploy.sh` automatically).

## 4. Backend Deployment & PM2 Startup
Clone the repository to `/var/www/deployly`.
```bash
cd /var/www/deployly
bash deploy.sh
```
Once `verify_environment.js` passes, start the backend process:
```bash
cd backend
pm2 start server.js --name "deployly-api"
```

### PM2 Auto-Recovery (Startup)
To ensure the backend starts automatically if the VPS reboots:
```bash
pm2 save
pm2 startup
```
Copy and paste the `sudo env PATH...` command that PM2 outputs.

## 5. Nginx Configuration
We bypass Node for static websites and serve them natively through Nginx for maximum performance.
1. Copy the security config:
   ```bash
   sudo cp infrastructure/nginx/security.conf /etc/nginx/snippets/security.conf
   ```
2. Add rate limiting to `/etc/nginx/nginx.conf` inside the `http {}` block:
   ```nginx
   limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
   ```
3. Copy and enable the site config:
   ```bash
   sudo cp infrastructure/nginx/deployly.conf /etc/nginx/sites-available/deployly
   sudo ln -s /etc/nginx/sites-available/deployly /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## 6. SSL Preparation (Certbot)
We use Certbot to automatically generate and renew Let's Encrypt certificates.
**Install Certbot:**
```bash
sudo apt install -y certbot python3-certbot-nginx
```
**Generate SSL (DO NOT EXECUTE UNTIL DOMAIN DNS PROPAGATES):**
```bash
sudo certbot --nginx -d deployly.online -d www.deployly.online
```
Certbot will automatically update the Nginx configuration to force HTTPS and renew certificates via cron jobs.

## 7. Rollback / Recovery Guide
If a deployment corrupts the server state:
1. **Stop the Backend**: `pm2 stop deployly-api`
2. **Revert Git**: `git reset --hard HEAD~1` (or checkout a specific tag).
3. **Re-install modules**: `npm ci`
4. **Restart**: `pm2 restart deployly-api`
5. **Database Rollback**: Keep regular MariaDB dumps via `mysqldump`. Restore via `mysql -u deployly -p deployly < backup.sql`.
