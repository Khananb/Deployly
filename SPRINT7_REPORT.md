# Sprint 7 - Live Static Website Hosting Report

## Overview
Static website hosting has been implemented. Users can now upload ZIP files of their static sites, which are extracted to `storage/sites/`, and hosted natively using Express static serving. A dynamic preview URL is provided upon successful deployment.

## Files Modified
1. **`backend/controllers/deploymentController.js`**
   - Added directory flattening logic post-extraction to handle nested folders.
   - Integrated dynamic `previewUrl` generation via `BASE_URL` or `req.get('host')`.
   - Updated logging to record all state transitions (`pending`, `uploading`, `uploaded`, `deploying`, `running`, `failed`) into the database.
2. **`backend/server.js`**
   - Added Express static serving middleware mounted at `/sites` to securely host deployed websites from `storage/sites`.
3. **`qa_sprint7.js`** *(New)*
   - Added a QA script to generate Test A (standard) and Test B (nested folder) ZIP files and simulate end-to-end API testing.

## Deployment Flow
1. **Upload (`POST /api/websites/:id/upload`)**: 
   - Transitions logged in DB: `pending` -> `uploading` -> `uploaded`.
   - Saves the ZIP into `storage/uploads/`.
2. **Deploy (`POST /api/websites/:id/deploy`)**: 
   - Status updated to `deploying`.
   - ZIP is extracted into `storage/sites/{userId}/{websiteId}`.
   - **Flattening Verification**: Checks if the extracted content has exactly one root directory (and no other files/folders beside it) and contains `index.html` or `package.json`. If true, the inner files are promoted to the site's root.
   - **Detection**: Identifies if the site is static. Updates status to `running`.
   - Returns the dynamic `previewUrl`.

## Preview URL Structure
The static preview URL is returned dynamically from the Deploy API:
```text
http://{BASE_URL_OR_SERVER_IP}/sites/{userId}/{websiteId}/
```
Example: `http://localhost:3000/sites/1/12/`

## Security Checks
- **No Upload Exposure**: Only the `storage/sites` folder is statically served via Express. The `storage/uploads` and `storage/logs` paths are unexposed and inherently protected.
- **Directory Traversal Prevention**: `express.static` natively resolves absolute paths and rejects requests containing `../` traversal attempts.
- **Safe Extraction**: We use `extract-zip` which natively protects against Zip Slip attacks during extraction.

## Remaining Blockers Before Production (Nginx)
- **SSL Certificates**: Currently hosting over HTTP. Need to implement Let's Encrypt for HTTPS.
- **Custom Domains**: The `/sites/:userId/:websiteId/` path works for previews, but custom domains need to be routed (e.g., `userdomain.com` -> `storage/sites/:userId/:websiteId`). This requires configuring Nginx as a reverse proxy/web server.
- **Node.js Apps**: The detection engine sets Node.js apps to `ready`, but PM2 execution is not yet implemented.

## QA Verification
Created `qa_sprint7.js` to simulate the user flow:
- Generated **Test A (Simple HTML)** and **Test B (Nested Folder ZIP)**.
- Uploads and deploys both test cases.
- Validates that the returned Preview URL is functioning correctly and flattening applied properly to Test B.

**Launch Readiness**: Static Website Hosting is fully functional and ready for PM2/Nginx integration in upcoming sprints.
