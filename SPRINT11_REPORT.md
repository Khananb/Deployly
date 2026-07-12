# Sprint 11 - PM2 Production Setup Report

## Overview
This sprint focused on hardening the Deployly backend process execution lifecycle using PM2 for the Oracle Cloud production environment. The goal was to establish resilient, self-healing architecture that guarantees maximum uptime without altering core API functionality.

## Ecosystem Configuration (`backend/ecosystem.config.js`)
We introduced a declarative PM2 configuration file specifically for the backend Node.js API (`server.js`). This standardizes the execution context across deployments:
- **Application Name**: Explicitly defined as `deployly-api` to prevent namespace collisions with deployed user websites.
- **Auto-Restart**: Enforced (`autorestart: true`) to ensure the API immediately recovers from critical exceptions.
- **Memory Ceiling**: Configured `max_memory_restart: "1G"`. This acts as a safety valve, automatically gracefully restarting the Node.js process if memory leaks cause it to consume more than 1GB of RAM, protecting the VPS from out-of-memory kernel panics.
- **Environment Targeting**: Hardcoded `NODE_ENV: "production"` within the ecosystem file, optimizing Express framework routing and disabling verbose dev-logging payloads.
- **Timestamped Logs**: Applied `log_date_format: "YYYY-MM-DD HH:mm:ss Z"` to ensure all PM2 log streams are accurately chronologized for incident debugging.

## Operation Guide (`PM2_SETUP.md`)
A dedicated reference manual was generated for operations teams, outlining the core commands required to interface with the `deployly-api` process. This covers:
- Safe startup via `pm2 start ecosystem.config.js`.
- Preserving process states across VPS reboots via `pm2 save` and `pm2 startup`.
- Log tailing and status checks.

## Impact
Deployly is now fully decoupled from manual shell sessions. The PM2 daemon governs the core API exactly as it governs the dynamically spawned user applications. With automated restarts and memory limits in place, Deployly's backend achieves true "Set and Forget" production readiness.
