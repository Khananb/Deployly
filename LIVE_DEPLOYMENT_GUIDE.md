# LIVE DEPLOYMENT GUIDE (Oracle Cloud VPS)

This guide provides the exact sequence of commands to execute on a fresh Ubuntu 24.04 (Oracle Cloud) server to bring Deployly to production. 

**Execute these commands sequentially as `root` or a user with `sudo` privileges.**

---

### 1. MariaDB Installation
Install the MariaDB server package and secure the installation.
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y mariadb-server
sudo mysql_secure_installation
# Answer prompts: Set root password (Y), Remove anonymous users (Y), Disallow root login remotely (Y), Remove test database (Y), Reload privilege tables (Y)
```

### 2. Database Creation
Log into the MariaDB shell and create the database.
```bash
sudo mysql -u root -p
```
*Inside the MySQL prompt:*
```sql
CREATE DATABASE deployly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. User Creation
Create the application database user and grant privileges.
*Inside the MySQL prompt:*
```sql
CREATE USER 'deployly'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON deployly.* TO 'deployly'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Schema Import
Assuming the codebase will be cloned to `/var/www/deployly`, import the base schema and sprint migrations.
*(You must do this after Step 8, but conceptually this is the database schema setup)*
```bash
# Wait to run this until after Git Clone (Step 8)
sudo mysql -u deployly -p deployly < /var/www/deployly/backend/schema.sql
# Then run the Sprint 9 dynamic migration manually using Node
```

### 5. Node.js Verification
Install Node.js 20.x LTS (Recommended for Ubuntu 24.04) and verify installation.
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

### 6. PM2 Installation
Install PM2 process manager globally.
```bash
sudo npm install -g pm2
pm2 -v
```

### 7. PM2 Startup
Configure PM2 to automatically revive the API on system reboot.
```bash
sudo pm2 startup systemd
# NOTE: PM2 will output a specific 'sudo env PATH...' command. Copy and paste it into your terminal.
```

### 8. Git Clone
Clone the repository into the definitive production directory.
```bash
sudo mkdir -p /var/www/deployly
sudo chown -R $USER:$USER /var/www/deployly
git clone https://github.com/YOUR_ORG/Deployly.git /var/www/deployly
```

### 9. npm install
Install backend dependencies.
```bash
cd /var/www/deployly/backend
npm ci --production
```

### 10. Environment Verification
Set up the `.env` file and run the automated verification script.
```bash
cp /var/www/deployly/backend/.env.example /var/www/deployly/backend/.env
# Edit the .env file with your actual DB password and JWT secret
nano /var/www/deployly/backend/.env

# Execute verification
node /var/www/deployly/backend/verify_environment.js
```
*Note: Make sure to run `node migrate_sprint9.js` here to fully update the schema.*

### 11. Nginx Configuration
Install Nginx and copy the deployment configurations.
```bash
sudo apt install -y nginx

# Copy Security Snippet
sudo cp /var/www/deployly/infrastructure/nginx/security.conf /etc/nginx/snippets/security.conf

# Copy Site Configuration
sudo cp /var/www/deployly/infrastructure/nginx/deployly.conf /etc/nginx/sites-available/deployly
```
*Note: Ensure `limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;` is added to your `/etc/nginx/nginx.conf` inside the `http {}` block.*

### 12. Enable Site
Activate the Nginx site and restart the Nginx daemon.
```bash
sudo ln -s /etc/nginx/sites-available/deployly /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 13. Firewall Verification
Configure Ubuntu's UFW and ensure essential ports are open. 
*(Ensure Oracle Cloud VCN Security Lists also allow Ingress on 80 and 443).*
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 14. SSL Preparation
Install Certbot and prepare for SSL certificate generation.
```bash
sudo apt install -y certbot python3-certbot-nginx
# ONCE DNS HAS PROPAGATED, EXECUTE THIS:
# sudo certbot --nginx -d deployly.online -d www.deployly.online
```

### 15. Final Health Check
Start the backend using PM2 and verify it's running cleanly.
```bash
cd /var/www/deployly/backend
pm2 start server.js --name "deployly-api"
pm2 save

# Verify Health
curl http://127.0.0.1:3000/api/health
```

### 16. Final Deployment Verification
Ensure external connectivity is working through the Nginx reverse proxy.
```bash
curl -I http://deployly.online/api/health
```

### 17. Rollback Procedure
If the API fails to boot or Nginx refuses to start, immediately follow the rollback steps:
```bash
# 1. Stop backend
pm2 stop deployly-api

# 2. Check PM2 logs for exact error
pm2 logs deployly-api --lines 50

# 3. Rollback Nginx (if Nginx crashed)
sudo rm /etc/nginx/sites-enabled/deployly
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# 4. Revert Git Codebase
cd /var/www/deployly
git reset --hard HEAD~1
cd backend
npm ci --production

# 5. Restore Database (if applicable)
# mysql -u deployly -p deployly < /path/to/backup.sql

# 6. Restart PM2
pm2 restart deployly-api
```
