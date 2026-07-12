# Deployly MVP 1.0 - Release Notes

Deployly MVP 1.0 is officially ready for live production traffic. This launch introduces a scalable, automated hosting environment for rapid deployment of Node.js and Static websites.

## 🚀 Key Features

### Hosting Engine
- **Instant Deployments**: Support for ZIP-based uploads that instantly extract, flatten, and prepare deployment environments.
- **Node.js Automation**: Automatic `package.json` detection, localized dependency installations (`npm ci`), and seamless orchestration using PM2.
- **Static Assets**: Blazing-fast native Nginx serving for static HTML/CSS/JS websites without routing through V8.

### Management Dashboard
- **Lifecycle Management**: Start, Stop, and Restart Node.js websites dynamically through a centralized UI.
- **Status Audits**: Real-time deployment status tracking (Pending -> Uploading -> Installing -> Running).
- **Process Isolation**: Secure PM2 sandboxing ensures user applications cannot interact maliciously with one another.

### Automated Billing
- **Free Trials**: Immediate 24-hour full-featured trials upon account creation.
- **Pro Tier**: Razorpay integration for one-click payment execution ($500 INR/Month).
- **Grace Engine**: Integrated cron schedules intelligently pause and restore hosting services based on subscription states without permanently deleting user data.

## 🔒 Security
- Dual-Layer Rate Limiting (100req/15m globally, 10req/s locally).
- Secure Stateless JWT Authentication (7-Day Expiry).
- Path Traversal and Zip Slip mitigations actively enforced.

## 🐛 Known Limitations in 1.0
- **Log Fetching**: Real-time streaming of Node.js application logs to the frontend UI is deferred to v1.1.
- **Automated SSL**: Automatic Let's Encrypt assignment per-user custom domain is deferred to v1.2 (Sites operate via the core `deployly.online` platform proxy dynamically).
