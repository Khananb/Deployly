# Deployly Production runbook (Version 1.0.0-beta)

This document details the production setup, architecture, and maintenance runbook for Deployly.

## Architecture

- **Backend**: Node.js / Express
- **Database**: MariaDB
- **Process Manager**: PM2
- **Reverse Proxy / Web Server**: Nginx
- **SSL / TLS**: Certbot (Let's Encrypt)
- **File Storage**: Local file system (`/storage`)

## Server Setup

Ensure the server is running Ubuntu 22.04 LTS or newer.

### Prerequisites

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mariadb-server certbot python3-certbot-nginx zip unzip curl
```

### PM2

Deployly backend is managed via PM2.

```bash
npm install -g pm2
pm2 start backend/server.js --name "deployly-api"
pm2 save
pm2 startup
```

### Nginx

Nginx serves as the reverse proxy for both the API and hosted applications.
Custom domains receive dynamically generated `.conf` files located in `/etc/nginx/sites-available`.

Reloading Nginx (handled by Deployly core safely):
```bash
sudo systemctl reload nginx
```

### MariaDB

Set up the database for Deployly:
```sql
CREATE DATABASE deployly;
CREATE USER 'deployly'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON deployly.* TO 'deployly'@'localhost';
FLUSH PRIVILEGES;
```

### Certbot

Deployly automatically provisions certificates for custom domains.
Certificates are stored in `/etc/letsencrypt/live/`.
Deployly has a built-in node-cron job that renews active certificates 30 days before expiry.

## Backup and Restore

### Backups
The automated backup script is located at `backend/scripts/backup.sh`.
It backs up:
- MariaDB Database
- Website files & Uploads
- Environment files (`.env`)
- Nginx configs

Run a backup manually:
```bash
bash backend/scripts/backup.sh
```

### Restore
The restore script prevents accidental overwrites and ensures safe restoration from a tarball.
```bash
bash backend/scripts/restore.sh /var/deployly/backups/backup_file.tar.gz
```

## Troubleshooting

- **502 Bad Gateway**: Ensure the Node.js PM2 process is running. (`pm2 logs`)
- **Port Conflict**: Check if another PM2 process holds a port using `pm2 list` or `netstat -tulnp | grep node`.
- **SSL Rate Limits**: Let's Encrypt limits renewals. Check logs in `backend/storage/logs/warn-*.log`.
- **Health Check**: Access the internal system API `/api/health` for detailed subsystem status.
