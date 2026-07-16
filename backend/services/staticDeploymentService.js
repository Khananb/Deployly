const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const deploymentService = require('./deploymentService');
const websiteService = require('./websiteService');

class StaticDeploymentService {
    static async deployStaticWebsite(userId, websiteId, deploymentId, extractPath) {
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

        let currentStep = 'pre-deployment-check';

        try {
            await deploymentService.addDeploymentLog(deploymentId, "Deployment", "deploying", "Deployment process started");

            // 1. Find true source path (handle single nested directory from ZIP)
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

            // 2. Pre-deployment check
            if (!fs.existsSync(path.join(sourcePath, 'index.html'))) {
                throw new Error("Validation Failed: No index.html found in the source directory");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Validation", "success", "Pre-deployment checks passed (index.html found)");

            // Create temporary build folder to prevent downtime during extraction and validation
            currentStep = 'copy-files';
            const tmpLivePath = liveBasePath + '_tmp';
            if (fs.existsSync(tmpLivePath)) {
                fs.rmSync(tmpLivePath, { recursive: true, force: true });
            }
            fs.mkdirSync(tmpLivePath, { recursive: true });

            // 3. Safe Copy Files to Temp
            fs.cpSync(sourcePath, tmpLivePath, { recursive: true });
            await deploymentService.addDeploymentLog(deploymentId, "Copy Files", "success", "Files successfully copied to build directory");

            // 4. Post-deployment check on Temp
            currentStep = 'post-copy-check';
            if (!fs.existsSync(path.join(tmpLivePath, 'index.html'))) {
                throw new Error("Verification Failed: index.html is missing after copy");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Verification", "success", "Post-copy verification passed");

            // Fast Swap to Live Directory to minimize downtime
            currentStep = 'swap-directories';
            const backupPath = liveBasePath + '_backup';
            if (fs.existsSync(liveBasePath)) {
                if (fs.existsSync(backupPath)) fs.rmSync(backupPath, { recursive: true, force: true });
                fs.renameSync(liveBasePath, backupPath);
            }
            fs.renameSync(tmpLivePath, liveBasePath);
            await deploymentService.addDeploymentLog(deploymentId, "Swap", "success", "Live directory updated successfully");

            // Ensure Nginx directories exist (mostly for local Windows mock)
            if (isWindows) {
                if (!fs.existsSync(nginxConfigDir)) fs.mkdirSync(nginxConfigDir, { recursive: true });
                if (!fs.existsSync(nginxEnabledDir)) fs.mkdirSync(nginxEnabledDir, { recursive: true });
            }

            // 4. Generate Nginx Config
            currentStep = 'nginx-config';
            const nginxConfigContent = `
server {
    listen 80;
    server_name ${domainUrl};

    root ${liveBasePath.replace(/\\/g, '/')};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`.trim();
            fs.writeFileSync(configPath, nginxConfigContent);
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "success", `Generated config: ${configFilename}`);

            // 5. Create Symlink
            currentStep = 'nginx-symlink';
            if (fs.existsSync(symlinkPath)) {
                fs.unlinkSync(symlinkPath);
            }
            
            if (isWindows) {
                // Mock symlink behavior for local windows testing
                fs.copyFileSync(configPath, symlinkPath);
            } else {
                fs.symlinkSync(configPath, symlinkPath);
            }
            await deploymentService.addDeploymentLog(deploymentId, "Nginx Config", "success", "Symlink created in sites-enabled");

            // 6. Test Nginx
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

            // 7. Reload Nginx
            currentStep = 'nginx-reload';
            if (isWindows) {
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "success", "[MOCK] Nginx reloaded successfully");
            } else {
                await exec('systemctl reload nginx');
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Reload", "success", "Nginx reloaded successfully");
            }

            // 8. Finalize Deployment
            currentStep = 'finalize';
            const deploymentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

            await deploymentService.updateDeploymentStatus(deploymentId, 'deployed');
            
            // Cleanup any existing PM2 processes if the user switched from Node.js to Static
            try {
                const website = await websiteService.getWebsiteById(userId, websiteId);
                if (website && website.pm2_process) {
                    await deploymentService.addDeploymentLog(deploymentId, "PM2 Cleanup", "pending", `Cleaning up old PM2 process: ${website.pm2_process}`);
                    await exec(`pm2 delete ${website.pm2_process}`).catch(() => {});
                    await deploymentService.addDeploymentLog(deploymentId, "PM2 Cleanup", "success", "Old PM2 process removed successfully");
                }
            } catch (cleanupErr) {
                // Ignore cleanup errors
            }

            // Delete backup if successful
            const backupPath = liveBasePath + '_backup';
            if (fs.existsSync(backupPath)) {
                fs.rmSync(backupPath, { recursive: true, force: true });
            }

            // Note: Since this is static, we don't have a pm2_process, allocated_port, or last_error
            await websiteService.updateWebsiteDeploymentData(websiteId, {
                status: 'running',
                pm2_process: null,
                allocated_port: null,
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
            await deploymentService.addDeploymentLog(deploymentId, "Rollback", "pending", `Initiating rollback due to failure at step: ${currentStep}`);
            
            try {
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
                    if (fs.existsSync(liveBasePath)) fs.rmSync(liveBasePath, { recursive: true, force: true });
                    if (!isWindows) await exec('systemctl reload nginx').catch(() => {});
                    await deploymentService.addDeploymentLog(deploymentId, "Rollback", "success", "Rollback completed. Cleaned up failed fresh install.");
                }
            } catch (rollbackErr) {
                await deploymentService.addDeploymentLog(deploymentId, "Rollback Error", "failed", `Rollback failed: ${rollbackErr.message}`);
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

module.exports = StaticDeploymentService;
