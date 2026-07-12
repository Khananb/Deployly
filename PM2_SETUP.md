# PM2 Production Setup Guide

This document outlines the commands to manage the Deployly API in a production environment using PM2.

## Pre-requisites
Ensure PM2 is installed globally:
```bash
sudo npm install -g pm2
```

## PM2 Commands

The following commands should be executed from the `backend/` directory.

### 1. Start the Application
To start the Deployly API using the configured `ecosystem.config.js`:
```bash
pm2 start ecosystem.config.js
```
*(This will automatically apply the `deployly-api` name, `production` environment, and logging rules.)*

### 2. Save the Process List
Save the current list of PM2 processes so they respawn on reboot:
```bash
pm2 save
```

### 3. Configure Startup Script
Generate the script to keep PM2 alive across system reboots:
```bash
pm2 startup
```
*Note: Run the command exactly as it appears in the terminal output from PM2.*

### 4. Restart the Application
To gracefully restart the API (e.g., after a new deployment or configuration change):
```bash
pm2 restart deployly-api
```

### 5. View Logs
To monitor real-time logs (stdout and stderr) for the Deployly API:
```bash
pm2 logs deployly-api
```
To view the last 100 lines:
```bash
pm2 logs deployly-api --lines 100
```

### 6. View Process Status
To check memory usage, uptime, and status of the API and deployed websites:
```bash
pm2 status
```
To monitor CPU/Memory graphically in the terminal:
```bash
pm2 monit
```
