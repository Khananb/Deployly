const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const deploymentService = require('./deploymentService');
const websiteService = require('./websiteService');
const portManagerService = require('./portManagerService');

class NodeDeploymentService {
    static async deployNodeWebsite(userId, websiteId, deploymentId, extractPath) {
        const isWindows = process.platform === 'win32';
        
        // Define paths based on OS
        const liveBasePath = path.join(__dirname, '../../storage/live', String(userId), String(websiteId));
        const nginxConfigDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-available')
            : '/etc/nginx/sites-available';
        const nginxEnabledDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-enabled')
            : '/etc/nginx/sites-enabled';
        const configFilename = `deployly-${websiteId}.conf`;
        const configPath = path.join(nginxConfigDir, configFilename);
        const symlinkPath = path.join(nginxEnabledDir, configFilename);
        const website = await websiteService.getWebsiteById(userId, websiteId);
        const domainUrl = website.domain;
        const fullUrl = `https://${domainUrl}`;
        const pm2AppName = `deployly-${userId}-${websiteId}-${deploymentId}`;

        let currentStep = 'pre-deployment-check';
        let allocatedPort = null;

        try {
            await deploymentService.addDeploymentLog(deploymentId, "Deployment", "deploying", "Deployment process started");

            // 1. Pre-deployment check
            if (website.project_type !== 'node' && website.type !== 'node') {
                throw new Error("Validation Failed: Project is not marked as a Node.js application");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Validation", "success", "Pre-deployment checks passed (Node.js project verified)");

            // Find true source path (handle single nested directory from ZIP)
            let sourcePath = extractPath;
            if (fs.existsSync(extractPath)) {
                const items = fs.readdirSync(extractPath);
                if (items.length === 1) {
                    const singleItemPath = path.join(extractPath, items[0]);
                    if (fs.statSync(singleItemPath).isDirectory()) {
                        sourcePath = singleItemPath;
                    }
                }
            }

            // Create temporary build folder to prevent downtime during npm install
            currentStep = 'copy-files';
            const tmpLivePath = liveBasePath + '_tmp';
            if (fs.existsSync(tmpLivePath)) {
                fs.rmSync(tmpLivePath, { recursive: true, force: true });
            }
            fs.mkdirSync(tmpLivePath, { recursive: true });

            // 2. Safe Copy Files to Temp
            fs.cpSync(sourcePath, tmpLivePath, { recursive: true });
            await deploymentService.addDeploymentLog(deploymentId, "Copy Files", "success", "Files successfully copied to build directory");

            // 3. Install Dependencies in Temp
            currentStep = 'install-dependencies';
            await deploymentService.addDeploymentLog(deploymentId, "NPM", "deploying", "Installing dependencies...");
            if (fs.existsSync(path.join(tmpLivePath, 'package.json'))) {
                try {
                    await exec('npm install --no-fund --no-audit --loglevel=error', { 
                        cwd: tmpLivePath,
                        maxBuffer: 1024 * 1024 * 50 // 50MB
                    });
                    await deploymentService.addDeploymentLog(deploymentId, "NPM", "success", "Dependencies installed successfully");
                } catch (npmErr) {
                    throw new Error(`Failed to install dependencies: ${npmErr.message}`);
                }
            } else {
                await deploymentService.addDeploymentLog(deploymentId, "NPM", "success", "No package.json found, skipping dependency installation");
            }

            // Fast Swap to Live Directory to minimize downtime
            currentStep = 'swap-directories';
            const backupPath = liveBasePath + '_backup';
            if (fs.existsSync(liveBasePath)) {
                if (fs.existsSync(backupPath)) fs.rmSync(backupPath, { recursive: true, force: true });
                fs.renameSync(liveBasePath, backupPath);
            }
            fs.renameSync(tmpLivePath, liveBasePath);
            await deploymentService.addDeploymentLog(deploymentId, "Swap", "success", "Live directory updated successfully");

            // 4. Detect Startup Command
            currentStep = 'detect-startup';
            let startupCommand = null;
            let isNpmScript = false;

            if (fs.existsSync(path.join(liveBasePath, 'package.json'))) {
                const pkgStr = fs.readFileSync(path.join(liveBasePath, 'package.json'), 'utf8');
                try {
                    const pkg = JSON.parse(pkgStr);
                    if (pkg.scripts && pkg.scripts.start) {
                        startupCommand = 'start';
                        isNpmScript = true;
                    } else if (pkg.scripts && pkg.scripts.dev) {
                        startupCommand = 'dev';
                        isNpmScript = true;
                    }
                } catch (e) {
                    throw new Error("Invalid package.json format");
                }
            }

            if (!startupCommand) {
                if (fs.existsSync(path.join(liveBasePath, 'app.js'))) {
                    startupCommand = 'app.js';
                } else if (fs.existsSync(path.join(liveBasePath, 'server.js'))) {
                    startupCommand = 'server.js';
                } else if (fs.existsSync(path.join(liveBasePath, 'index.js'))) {
                    startupCommand = 'index.js';
                }
            }

            if (!startupCommand) {
                throw new Error("Unsupported Node.js project. Could not find scripts.start, scripts.dev, app.js, server.js, or index.js.");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Startup Check", "success", `Startup command detected: ${isNpmScript ? 'npm run ' : ''}${startupCommand}`);

            // 5. Allocate Port
            currentStep = 'allocate-port';
            await deploymentService.addDeploymentLog(deploymentId, "Port Manager", "deploying", "Allocating port...");
            allocatedPort = await portManagerService.allocatePort(websiteId);
            await deploymentService.addDeploymentLog(deploymentId, "Port Manager", "success", `Allocated port: ${allocatedPort}`);

            // 6. Start PM2
            currentStep = 'pm2-start';
            await deploymentService.addDeploymentLog(deploymentId, "PM2", "deploying", "Starting PM2 application...");

            const pm2Cmd = isNpmScript 
                ? `pm2 start npm --name "${pm2AppName}" --max-memory-restart 300M --merge-logs --log-date-format "YYYY-MM-DD HH:mm:ss" -- run ${startupCommand}`
                : `pm2 start ${startupCommand} --name "${pm2AppName}" --max-memory-restart 300M --merge-logs --log-date-format "YYYY-MM-DD HH:mm:ss"`;

            await exec(pm2Cmd, { 
                cwd: liveBasePath,
                env: { ...process.env, PORT: allocatedPort } 
            });
            
            // Save the process explicitly
            if (!isWindows) {
                await exec('pm2 save').catch(() => {});
            }
            await deploymentService.addDeploymentLog(deploymentId, "PM2", "success", "PM2 application created and started successfully");

            // 7. Health Check (Perform BEFORE modifying Nginx and killing old PM2)
            currentStep = 'health-check';
            await deploymentService.addDeploymentLog(deploymentId, "Health Check", "deploying", "Running health check...");
            
            const maxRetries = 10;
            const retryInterval = 2000;
            let isHealthy = false;
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            
            for (let i = 0; i < maxRetries; i++) {
                try {
                    // Use local port for health check because Nginx is not yet proxying to the new port
                    const healthUrl = `http://127.0.0.1:${allocatedPort}`;
                    const response = await fetch(healthUrl, { timeout: 3000 });
                    // Any response means the port is bound and the HTTP server is running
                    if (response.status) {
                        isHealthy = true;
                        break;
                    }
                } catch (e) {
                    // Fetch failed, wait and retry
                }
                await new Promise(res => setTimeout(res, retryInterval));
            }
            
            if (!isHealthy) {
                throw new Error("Health check failed: Application did not respond successfully on the allocated port after 10 attempts.");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Health Check", "success", "Application is healthy and responding to requests");

            // Ensure Nginx directories exist (for local Windows mock)
            if (isWindows) {
                if (!fs.existsSync(nginxConfigDir)) fs.mkdirSync(nginxConfigDir, { recursive: true });
                if (!fs.existsSync(nginxEnabledDir)) fs.mkdirSync(nginxEnabledDir, { recursive: true });
            }

            // 8. Generate Nginx Config
            currentStep = 'nginx-config';
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "deploying", "Generating nginx config...");
            const nginxConfigContent = `
server {
    listen 80;
    server_name ${domainUrl};

    location / {
        proxy_pass http://127.0.0.1:${allocatedPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`.trim();
            fs.writeFileSync(configPath, nginxConfigContent);
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "success", `Generated config: ${configFilename}`);

            // 9. Create Symlink
            currentStep = 'nginx-symlink';
            if (fs.existsSync(symlinkPath)) {
                fs.unlinkSync(symlinkPath);
            }
            
            if (isWindows) {
                fs.copyFileSync(configPath, symlinkPath);
            } else {
                fs.symlinkSync(configPath, symlinkPath);
            }
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "success", "Symlink created in sites-enabled");

            // 10. Test Nginx
            currentStep = 'nginx-test';
            if (isWindows) {
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Test", "success", "[MOCK] Nginx configuration test passed");
            } else {
                try {
                    await exec('nginx -t');
                    await deploymentService.addDeploymentLog(deploymentId, "Nginx Test", "success", "Nginx configuration test passed");
                } catch (nginxErr) {
                    await deploymentService.addDeploymentLog(deploymentId, "Nginx Test", "failed", `Nginx configuration test failed: ${nginxErr.message}`);
                    throw new Error(`Nginx validation failed: ${nginxErr.message}`);
                }
            }

            // 11. Reload Nginx
            currentStep = 'nginx-reload';
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "deploying", "Reloading nginx...");
            if (isWindows) {
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "success", "[MOCK] Nginx reloaded successfully");
            } else {
                await exec('systemctl reload nginx');
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "success", "Nginx reloaded successfully");
            }

            // 12. Cleanup Old PM2 Process (Only after successful health check and proxy switch)
            currentStep = 'cleanup-old-pm2';
            if (website.pm2_process && website.pm2_process !== pm2AppName) {
                await deploymentService.addDeploymentLog(deploymentId, "PM2 Cleanup", "deploying", "Removing old PM2 instance...");
                await exec(`pm2 delete ${website.pm2_process}`).catch(() => {});
                if (!isWindows) {
                    await exec('pm2 save').catch(() => {});
                }
                await deploymentService.addDeploymentLog(deploymentId, "PM2 Cleanup", "success", "Old PM2 instance removed");
            }
            
            // Delete backup if successful
            const backupPath = liveBasePath + '_backup';
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }

            // Finalize Deployment
            currentStep = 'finalize';
            const deploymentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

            await deploymentService.updateDeploymentStatus(deploymentId, 'deployed');
            
            await websiteService.updateWebsiteDeploymentData(websiteId, {
                status: 'running',
                pm2_process: pm2AppName,
                allocated_port: allocatedPort,
                running_since: deploymentTime,
                last_deployed_at: deploymentTime,
                started_at: deploymentTime,
                last_error: null,
                live_url: fullUrl
            });
            
            await deploymentService.addDeploymentLog(deploymentId, "Deployment", "success", `Deployment completed successfully at ${fullUrl}`);

            return {
                success: true,
                deploymentStatus: 'DEPLOYED',
                deploymentUrl: fullUrl
            };

        } catch (err) {
            // Rollback Logic
            await deploymentService.addDeploymentLog(deploymentId, "Deployment Error", "failed", err.message);
            await deploymentService.addDeploymentLog(deploymentId, "Rollback", "deploying", `Initiating rollback due to failure at step: ${currentStep}`);
            
            try {
                // Delete NEW PM2 process
                await exec(`pm2 delete ${pm2AppName}`).catch(() => {});
                
                // Release NEW Port
                if (allocatedPort) {
                    await portManagerService.releasePort(websiteId).catch(() => {});
                }

                // Restore backup if it exists (meaning it was a redeploy)
                const backupPath = liveBasePath + '_backup';
                if (fs.existsSync(backupPath)) {
                    if (fs.existsSync(liveBasePath)) fs.rmSync(liveBasePath, { recursive: true, force: true });
                    fs.renameSync(backupPath, liveBasePath);
                    await deploymentService.addDeploymentLog(deploymentId, "Rollback", "success", "Rollback completed. Restored previous working application.");
                } else {
                    // Fresh deploy: wipe everything
                    if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
                    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
                    if (!isWindows) await exec('systemctl reload nginx').catch(() => {});
                    
                    if (fs.existsSync(liveBasePath)) {
                        fs.rmSync(liveBasePath, { recursive: true, force: true });
                    }
                    await deploymentService.addDeploymentLog(deploymentId, "Rollback", "success", "Rollback completed. Cleaned up failed fresh install.");
                }
            } catch (rollbackErr) {
                await deploymentService.addDeploymentLog(deploymentId, "Rollback Error", "failed", `Rollback partially failed: ${rollbackErr.message}`);
            }

            await deploymentService.updateDeploymentStatus(deploymentId, 'failed');
            await websiteService.updateWebsiteDeploymentData(websiteId, {
                status: 'failed',
                last_error: err.message
            });

            throw err;
        }
    }
}

module.exports = NodeDeploymentService;
