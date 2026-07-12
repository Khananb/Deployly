# Deployly Production VPS Installation Guide

This guide details how to prepare an Oracle Cloud VPS (Ubuntu 22.04 LTS or 24.04 LTS) for Deployly production.

## 1. Oracle Cloud Firewall Checklist
Before SSHing into your VPS, you must configure the **Ingress Rules** in your Oracle Cloud Virtual Cloud Network (VCN) Security List:
- **Port 22 (SSH)**: Allow TCP from your IP (or 0.0.0.0/0).
- **Port 80 (HTTP)**: Allow TCP from 0.0.0.0/0.
- **Port 443 (HTTPS)**: Allow TCP from 0.0.0.0/0.
- **Port 3306 (MariaDB)**: Ensure this is **BLOCKED** from the public internet. Only local connections (`127.0.0.1`) should be allowed.

## 2. Ubuntu Server Setup
Update your package lists and upgrade existing software:
```bash
sudo apt update
sudo apt upgrade -y
```

Configure UFW (Uncomplicated Firewall) on Ubuntu:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 3. Install Required Packages

### Git & Utilities
```bash
sudo apt install -y git curl wget unzip
```

### Node.js (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

### PM2
PM2 is used as a process manager for the Node.js backend.
```bash
sudo npm install -g pm2
```

### MariaDB
MariaDB operates on **Port 3306**. Ensure it binds to `127.0.0.1`.
```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation
```
*Note: In `mysql_secure_installation`, set a strong root password and disable remote root logins.*

### Nginx
Nginx will operate on **Ports 80 & 443** as a reverse proxy.
```bash
sudo apt install -y nginx
```

## 4. Useful Commands

### PM2 Commands
- Start the server: `cd backend && pm2 start server.js --name "deployly-api"`
- Check logs: `pm2 logs deployly-api`
- Monitor resources: `pm2 monit`
- Save state across reboots: `pm2 save && pm2 startup`

## 5. Deployment Flow
Once the VPS is provisioned and software is installed:
1. Clone the repository into `/var/www/deployly`.
2. Configure your `.env` file in `backend/.env`.
3. Run `bash deploy.sh`. This script will:
   - Check all dependencies.
   - Create storage directories (`uploads`, `sites`, `logs`).
   - Run NPM install and database schema migrations.
   - Run `verify_environment.js` to ensure the disk, permissions, and security parameters are correct.
4. If `deploy.sh` finishes without errors, manually start the backend using PM2.
5. Configure Nginx to reverse-proxy port 80/443 traffic to Node.js on port 3000, and serve the React frontend (if applicable).
