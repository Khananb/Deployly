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
        const domainUrl = `${websiteId}.deployly.online`;
        const fullUrl = `https://${domainUrl}`;

        let currentStep = 'pre-deployment-check';

        try {
            await deploymentService.addDeploymentLog(deploymentId, "Deployment", "deploying", "Deployment process started");

            // 1. Pre-deployment check
            if (!fs.existsSync(path.join(extractPath, 'index.html'))) {
                throw new Error("Validation Failed: No index.html found in the source directory");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Validation", "success", "Pre-deployment checks passed (index.html found)");

            // Create base live folder if it doesn't exist
            currentStep = 'copy-files';
            if (!fs.existsSync(liveBasePath)) {
                fs.mkdirSync(liveBasePath, { recursive: true });
            } else {
                // Clean existing live directory content to ensure a clean deployment
                fs.rmSync(liveBasePath, { recursive: true, force: true });
                fs.mkdirSync(liveBasePath, { recursive: true });
            }

            // 2. Safe Copy Files
            // Copy all contents from extractPath to liveBasePath
            fs.cpSync(extractPath, liveBasePath, { recursive: true });
            await deploymentService.addDeploymentLog(deploymentId, "Copy Files", "success", "Files successfully copied to live directory");

            // 3. Post-deployment check
            currentStep = 'post-copy-check';
            if (!fs.existsSync(path.join(liveBasePath, 'index.html'))) {
                throw new Error("Verification Failed: index.html is missing in live directory after copy");
            }
            await deploymentService.addDeploymentLog(deploymentId, "Verification", "success", "Post-copy verification passed");

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
                await exec('nginx -t');
                await deploymentService.addDeploymentLog(deploymentId, "Nginx Test", "success", "Nginx configuration test passed");
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
            
            // Note: Since this is static, we don't have a pm2_process or last_error
            await websiteService.updateWebsiteDeploymentData(websiteId, {
                status: 'running',
                pm2_process: null,
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
                if (fs.existsSync(liveBasePath)) {
                    fs.rmSync(liveBasePath, { recursive: true, force: true });
                }
                if (fs.existsSync(symlinkPath)) {
                    fs.unlinkSync(symlinkPath);
                }
                if (fs.existsSync(configPath)) {
                    fs.unlinkSync(configPath);
                }
                await deploymentService.addDeploymentLog(deploymentId, "Rollback", "success", "Rollback completed. Cleaned up files and configs.");
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
