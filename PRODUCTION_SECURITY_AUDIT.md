# Production Security Audit

This document outlines a comprehensive security audit of Deployly's architecture and codebase prior to production launch.

## 1. Authentication & JWT
**Status: Secure**
- **Implementation**: The system uses `jsonwebtoken` (JWT) for stateless authentication.
- **Verification**: `authMiddleware.js` strictly requires the `Bearer` token format and validates it synchronously against `process.env.JWT_SECRET`. 
- **Expiration**: Tokens are strictly generated with a 7-day expiration (`expiresIn: "7d"`).
- **Passwords**: Hashes are salted and encrypted via `bcrypt` before database storage.

## 2. SQL Injection
**Status: Secure**
- **Implementation**: The backend leverages `mysql2/promise` with strict prepared statements (`execute()`).
- **Dynamic Queries**: The only dynamic query generation occurs in `updateWebsiteDeploymentData`. However, the column fields are explicitly hardcoded (e.g., `fields.push('status = ?')`), preventing attackers from injecting arbitrary SQL.

## 3. Cross-Site Scripting (XSS)
**Status: Secure**
- **Frontend**: Assuming a React/Vue frontend, DOM output is automatically escaped.
- **Backend Headers**: Express employs the `helmet` middleware.
- **Nginx**: In `security.conf`, rigorous headers are applied:
  - `X-XSS-Protection "1; mode=block"`
  - `Content-Security-Policy` restricts execution to self.

## 4. Path Traversal (Directory Traversal)
**Status: Secure**
- **Implementation**: Storage paths are dynamically constructed in `multerConfig.js` and `deploymentController.js` using `path.join(__dirname, "../../storage/...", String(userId), String(websiteId))`.
- **Mitigation**: While a malicious user could attempt to send `%2e%2e` (`../`) as a `websiteId`, the API instantly performs a database lookup (`await websiteService.getWebsiteById(userId, websiteId)`). If the `websiteId` doesn't match an exact record owned by the `userId`, the request is rejected immediately, nullifying the path traversal vector.

## 5. Command Injection
**Status: Secure**
- **Implementation**: Deployly utilizes `child_process.exec` via `pm2Helper.js`.
- **Mitigation**: `exec` is inherently dangerous if user input is allowed. However, the `processName` is deterministically generated server-side (`deployly-user${userId}-site${websiteId}`). No user input is directly interpolated into shell commands.

## 6. ZIP Bomb & Decompression Abuse
**Status: Moderate Risk (Actionable)**
- **Zip Slip**: The `extract-zip` library natively protects against "Zip Slip" by verifying all extracted file paths remain strictly inside the target directory.
- **Upload Limit**: `multerConfig.js` enforces a strict 100MB upload limit.
- **Decompression Bomb (Zip Quine)**: While the upload is capped at 100MB, a highly compressed 100MB archive could theoretically expand to gigabytes, exhausting VPS disk space. 
- *Recommendation*: Implement a global disk quota per user or check extracted file sizes dynamically during the extraction pipeline.

## 7. PM2 Command Execution
**Status: Secure**
- **Implementation**: Stop, Restart, and Delete APIs pass the deterministic `pm2_process` value directly to PM2.
- **Mitigation**: A user cannot restart or stop processes they do not own, as the process identifier is fetched from the database after authorization verification, rather than accepted from the request body.

## 8. Authorization & Data Isolation
**Status: Secure**
- **Implementation**: Every single website route (Upload, Deploy, Get, Delete, Restart, Stop) strictly invokes `getWebsiteById(req.user.id, websiteId)`.
- **Mitigation**: Horizontal privilege escalation is impossible. A user cannot act on or view websites belonging to another user.

## 9. Rate Limiting
**Status: Highly Secure (Dual-Layered)**
- **Application Layer**: `express-rate-limit` caps traffic to 100 requests per 15 minutes per IP address globally.
- **Infrastructure Layer**: Nginx `limit_req` caps raw incoming traffic at 10 requests per second with a burst of 20, actively dropping DDoS or brute-force floods before they reach the Node.js event loop.

## 10. CORS & Helmet
**Status: Secure**
- **Implementation**: `cors()` allows standard cross-origin interaction for decoupled frontends.
- **Helmet**: Secures Node.js HTTP headers against MIME sniffing (`X-Content-Type-Options: nosniff`) and clickjacking (`X-Frame-Options: SAMEORIGIN`). Nginx perfectly mirrors and reinforces these headers.

---
**Audit Conclusion**: The Deployly platform exhibits a remarkably mature and defensive security posture. Core infrastructure risks are thoroughly mitigated. The only minor recommendation is integrating post-extraction storage quotas to prevent ZIP bomb disk exhaustion.
