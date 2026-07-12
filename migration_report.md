# MariaDB Migration Report & Installation Guide

This guide contains the instructions for initializing the real MariaDB instance on your Oracle Cloud VPS and migrating Deployly from the mock arrays to the robust `mysql2/promise` implementation.

## 1. VPS Installation Instructions
Run these commands on your Oracle VPS to install and configure MariaDB.

### A. Install MariaDB
```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install mariadb-server -y

# Enable and start the service
sudo systemctl enable mariadb
sudo systemctl start mariadb
```

### B. Secure the Installation
Run the secure installation script and set a strong root password:
```bash
sudo mysql_secure_installation
```

## 2. Database Initialization
Copy the `schema.sql` file to your server and apply it:

```bash
# Assuming the file is named schema.sql
mysql -u root -p < schema.sql
```

## 3. Creating the Application User
To isolate Deployly's privileges, execute this SQL block on your MariaDB shell:

```sql
CREATE DATABASE IF NOT EXISTS deployly;
CREATE USER IF NOT EXISTS 'deployly'@'localhost' IDENTIFIED BY 'Deployly@123';
GRANT ALL PRIVILEGES ON deployly.* TO 'deployly'@'localhost';
FLUSH PRIVILEGES;
```
*(Make sure to match `DB_PASSWORD` in your `.env` to the password set above!)*

## 4. Codebase Migration Summary
The following code changes have been generated locally to support this migration:
1. **`db.js`**: Refactored to utilize a `mysql2/promise` connection pool. All hardcoded arrays and string interception logic have been purged.
2. **`deploymentController.js`**: Refactored to decouple ZIP uploading from ZIP extraction into two endpoints (`POST /upload` and `POST /deploy`).
3. **`deploymentService.js`**: Rewritten to manage actual MySQL `deployments` records using the `status` ENUM to prevent deploying multiple jobs simultaneously.
4. **`schema.sql`**: Configured with `created_at` and `updated_at` triggers and `ON DELETE CASCADE` foreign keys.
