#!/bin/bash
# Deployly Production Backup Script

set -e

# Auto-detect project root or allow override
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname $(dirname $(dirname $(realpath $0))))}"
BACKUP_BASE="${PROJECT_ROOT}/backups"
BACKUP_DIR="${BACKUP_BASE}/$(date +%Y-%m-%d_%H-%M-%S)"
ARCHIVE_NAME="$(basename $BACKUP_DIR).tar.gz"
ARCHIVE_PATH="${BACKUP_BASE}/${ARCHIVE_NAME}"

mkdir -p "$BACKUP_DIR"

echo "Starting backup to $BACKUP_DIR..."

# Source .env for database credentials
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    set -a
    source "${PROJECT_ROOT}/backend/.env"
    set +a
fi

DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-deployly}"

# 1. MariaDB
echo "Backing up database..."
if [ -n "$DB_PASSWORD" ]; then
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/database.sql" || { echo "Database backup failed"; exit 1; }
else
    mysqldump -u "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database.sql" || { echo "Database backup failed"; exit 1; }
fi

# 2. Website files
echo "Backing up website files..."
mkdir -p "$BACKUP_DIR/storage"
if [ -d "${PROJECT_ROOT}/backend/storage/sites" ]; then
    cp -r "${PROJECT_ROOT}/backend/storage/sites" "$BACKUP_DIR/storage/"
fi
if [ -d "${PROJECT_ROOT}/backend/storage/live" ]; then
    cp -r "${PROJECT_ROOT}/backend/storage/live" "$BACKUP_DIR/storage/"
fi

# 3. Uploads
echo "Backing up uploads..."
if [ -d "${PROJECT_ROOT}/backend/storage/uploads" ]; then
    cp -r "${PROJECT_ROOT}/backend/storage/uploads" "$BACKUP_DIR/storage/"
fi

# 4. Environment files
echo "Backing up environment files..."
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    cp "${PROJECT_ROOT}/backend/.env" "$BACKUP_DIR/.env.backup"
fi

# 5. Nginx configs
echo "Backing up Nginx configs..."
if [ -d "/etc/nginx/sites-available" ]; then
    cp -r /etc/nginx/sites-available "$BACKUP_DIR/nginx_sites-available"
fi
if [ -d "/etc/nginx/sites-enabled" ]; then
    cp -r /etc/nginx/sites-enabled "$BACKUP_DIR/nginx_sites-enabled"
fi

# Compress backup
echo "Compressing backup..."
cd "$BACKUP_BASE"
tar -czf "$ARCHIVE_NAME" "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

if [ -f "$ARCHIVE_PATH" ]; then
    echo "Backup completed successfully: $ARCHIVE_PATH"
    exit 0
else
    echo "Error: Backup archive was not created."
    exit 1
fi

