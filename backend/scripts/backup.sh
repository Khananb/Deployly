#!/bin/bash
# Deployly Production Backup Script

BACKUP_DIR="/var/deployly/backups/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

echo "Starting backup to $BACKUP_DIR..."

# 1. MariaDB
echo "Backing up database..."
mysqldump -u root -pdeployly deployly > "$BACKUP_DIR/database.sql"

# 2. Website files
echo "Backing up website files..."
mkdir -p "$BACKUP_DIR/storage"
cp -r /var/deployly/backend/storage/sites "$BACKUP_DIR/storage/sites"
cp -r /var/deployly/backend/storage/live "$BACKUP_DIR/storage/live"

# 3. Uploads
echo "Backing up uploads..."
cp -r /var/deployly/backend/storage/uploads "$BACKUP_DIR/storage/uploads"

# 4. Environment files
echo "Backing up environment files..."
cp /var/deployly/backend/.env "$BACKUP_DIR/.env.backup"

# 5. Nginx configs
echo "Backing up Nginx configs..."
cp -r /etc/nginx/sites-available "$BACKUP_DIR/nginx_sites-available"
cp -r /etc/nginx/sites-enabled "$BACKUP_DIR/nginx_sites-enabled"

# Compress backup
cd /var/deployly/backups
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Backup completed successfully: $(basename $BACKUP_DIR).tar.gz"
