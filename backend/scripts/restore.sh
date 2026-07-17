#!/bin/bash
# Deployly Production Restore Script

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE=$1
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found!"
    exit 1
fi

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
RESTORE_DIR="/var/deployly/backups/restore_$BACKUP_NAME"

echo "Extracting backup..."
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "/var/deployly/backups"

echo "Restoring database..."
mysql -u root -pdeployly deployly < "/var/deployly/backups/$BACKUP_NAME/database.sql"

echo "Restoring website files and uploads..."
cp -a "/var/deployly/backups/$BACKUP_NAME/storage/sites/." /var/deployly/backend/storage/sites/
cp -a "/var/deployly/backups/$BACKUP_NAME/storage/live/." /var/deployly/backend/storage/live/
cp -a "/var/deployly/backups/$BACKUP_NAME/storage/uploads/." /var/deployly/backend/storage/uploads/

echo "Restoring environment files..."
cp "/var/deployly/backups/$BACKUP_NAME/.env.backup" /var/deployly/backend/.env

echo "Restoring Nginx configs..."
cp -a "/var/deployly/backups/$BACKUP_NAME/nginx_sites-available/." /etc/nginx/sites-available/
cp -a "/var/deployly/backups/$BACKUP_NAME/nginx_sites-enabled/." /etc/nginx/sites-enabled/

echo "Reloading Nginx..."
systemctl reload nginx

echo "Cleaning up extracted files..."
rm -rf "/var/deployly/backups/$BACKUP_NAME"

echo "Restore completed successfully."
