#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting Deployly Production Deployment..."

check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed.${NC}"
        echo -e "Please install it using: ${GREEN}$2${NC}"
        exit 1
    else
        echo -e "${GREEN}✔ $1 installed${NC}"
    fi
}

echo -e "\n--- Checking Dependencies ---"
check_dependency "node" "curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
check_dependency "mysql" "sudo apt-get install -y mariadb-server"
check_dependency "pm2" "sudo npm install -g pm2"
check_dependency "nginx" "sudo apt-get install -y nginx"
check_dependency "git" "sudo apt-get install -y git"

echo -e "\n--- Creating Storage Folders ---"
mkdir -p storage/uploads storage/sites storage/logs
# Fix permissions securely (e.g. restrict uploads and logs from public read)
chmod -R 750 storage/uploads storage/sites storage/logs
echo -e "${GREEN}✔ Storage folders created and permissions set.${NC}"

echo -e "\n--- Installing Backend Dependencies ---"
cd backend
npm install --production

echo -e "\n--- Running Migrations ---"
# Check if mariadb/mysql is accessible before running migration
if mysql -u $DB_USER -p$DB_PASSWORD -e "SELECT 1" &> /dev/null; then
    mysql -u $DB_USER -p$DB_PASSWORD < schema.sql
    echo -e "${GREEN}✔ Database schema verified/updated.${NC}"
else
    echo -e "${RED}Warning: Could not connect to database to run schema.sql. Ensure .env is correct and DB is running.${NC}"
fi

echo -e "\n--- Verifying Environment ---"
node verify_environment.js

echo -e "\n--- Backend Startup Instructions ---"
echo -e "To start the backend in production mode using PM2, run:"
echo -e "${GREEN}cd backend && pm2 start server.js --name \"deployly-api\"${NC}"
echo -e "Do NOT run the backend as root. Ensure Nginx is configured to reverse-proxy port 3000."
