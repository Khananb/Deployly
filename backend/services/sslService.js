const dns = require('dns');
const fs = require('fs');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const deploymentService = require('./deploymentService');
const db = require('../config/db');

class SSLService {
    static async verifyDNS(domain) {
        if (process.env.SSL_DEV_BYPASS === 'true') {
            console.log(`[SSL_DEV_BYPASS] Skipping actual DNS verification for ${domain}`);
            return true;
        }

        const serverIp = process.env.SERVER_IP || '127.0.0.1';
        try {
            const addresses = await dns.promises.resolve4(domain);
            return addresses.includes(serverIp);
        } catch (e) {
            return false;
        }
    }

    static async generateNginxConfig(domainId, domainName, website) {
        const isWindows = process.platform === 'win32';
        
        const nginxConfigDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-available')
            : '/etc/nginx/sites-available';
        const nginxEnabledDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-enabled')
            : '/etc/nginx/sites-enabled';
            
        if (isWindows) {
            if (!fs.existsSync(nginxConfigDir)) fs.mkdirSync(nginxConfigDir, { recursive: true });
            if (!fs.existsSync(nginxEnabledDir)) fs.mkdirSync(nginxEnabledDir, { recursive: true });
        }

        const configFilename = `deployly-custom-${domainId}.conf`;
        const configPath = path.join(nginxConfigDir, configFilename);
        
        let nginxConfigContent = '';
        if (website.type === 'node') {
            if (!website.allocated_port) throw new Error("Node application is missing allocated port.");
            
            if (fs.existsSync(configPath)) {
                let existingContent = fs.readFileSync(configPath, 'utf8');
                existingContent = existingContent.replace(/proxy_pass http:\/\/127\.0\.0\.1:\d+;/g, `proxy_pass http://127.0.0.1:${website.allocated_port};`);
                fs.writeFileSync(configPath, existingContent);
                return { configPath, configFilename, nginxEnabledDir };
            }
            
            nginxConfigContent = `
server {
    listen 80;
    server_name ${domainName};

    location / {
        proxy_pass http://127.0.0.1:${website.allocated_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`.trim();
        } else if (website.type === 'static' || website.project_type === 'static' || website.project_type === 'unknown') {
            const liveBasePath = path.join(__dirname, '../../storage/live', String(website.user_id), String(website.id));
            
            if (fs.existsSync(configPath)) {
                return { configPath, configFilename, nginxEnabledDir }; // Static path never changes
            }
            
            nginxConfigContent = `
server {
    listen 80;
    server_name ${domainName};
    root ${liveBasePath};
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
`.trim();
        } else {
            throw new Error(`Unsupported project type for custom domain: ${website.type}`);
        }

        fs.writeFileSync(configPath, nginxConfigContent);
        return { configPath, configFilename, nginxEnabledDir };
    }

    static async enableSite(configPath, configFilename, nginxEnabledDir) {
        const isWindows = process.platform === 'win32';
        const symlinkPath = path.join(nginxEnabledDir, configFilename);
        
        if (fs.existsSync(symlinkPath)) {
            fs.unlinkSync(symlinkPath);
        }
        
        if (isWindows) {
            fs.copyFileSync(configPath, symlinkPath);
        } else {
            fs.symlinkSync(configPath, symlinkPath);
        }

        // Test Nginx
        if (!isWindows) {
            await exec('nginx -t');
            await exec('systemctl reload nginx');
        }
        return symlinkPath;
    }

    static async syncSSLExpiry(domainId, domainName) {
        if (process.env.SSL_DEV_BYPASS === 'true' || process.platform === 'win32') return;
        try {
            const certPath = `/etc/letsencrypt/live/${domainName}/cert.pem`;
            const keyPath = `/etc/letsencrypt/live/${domainName}/privkey.pem`;
            
            if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
                throw new Error("Certificate or private key files missing");
            }
            
            const crypto = require('crypto');
            const cert = new crypto.X509Certificate(fs.readFileSync(certPath));
            
            if (!cert.checkHost(domainName)) {
                throw new Error("Certificate domain mismatch");
            }
            
            const expiryDate = new Date(cert.validTo);
            await db.execute('UPDATE domains SET ssl_expires_at = ? WHERE id = ?', [expiryDate, domainId]);
        } catch (err) {
            console.error(`[SSL Sync] Validation failed for ${domainName}:`, err.message); // No path exposed
        }
    }

    static async issueSSL(domainName, deploymentId, domainId) {
        if (process.env.SSL_DEV_BYPASS === 'true') {
            console.log(`[SSL_DEV_BYPASS] Skipping actual Certbot issuance for ${domainName}`);
            const deploymentService = require('./deploymentService');
            await deploymentService.addDeploymentLog(deploymentId, "SSL Issued", "success", `[MOCK] SSL issued for ${domainName}`);
            return true;
        }

        try {
            await exec(`certbot --nginx -d ${domainName} --non-interactive --agree-tos -m admin@deployly.online --redirect --keep-until-expiring`);
            if (domainId) await this.syncSSLExpiry(domainId, domainName);
            return true;
        } catch (e) {
            throw new Error(`Certbot failed: ${e.message}`);
        }
    }

    static async rollbackConfig(domainId) {
        const isWindows = process.platform === 'win32';
        
        const nginxConfigDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-available')
            : '/etc/nginx/sites-available';
        const nginxEnabledDir = isWindows 
            ? path.join(__dirname, '../../storage/mock-nginx/sites-enabled')
            : '/etc/nginx/sites-enabled';
            
        const configFilename = `deployly-custom-${domainId}.conf`;
        const configPath = path.join(nginxConfigDir, configFilename);
        const symlinkPath = path.join(nginxEnabledDir, configFilename);
        
        if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
        
        if (!isWindows) {
            await exec('systemctl reload nginx').catch(() => {});
        }
    }

    static async renewCertificate(domainId, domainName) {
        if (process.env.SSL_DEV_BYPASS === 'true') {
            console.log(`[SSL_DEV_BYPASS] Skipping actual Certbot renewal for ${domainName}`);
            return;
        }
        try {
            await exec(`certbot renew --cert-name ${domainName} --nginx --quiet`);
            await this.syncSSLExpiry(domainId, domainName);
            console.log(`[SSL Renewal] Successfully renewed ${domainName}`);
        } catch (e) {
            console.warn(`[SSL Renewal] Failed for ${domainName}:`, e.message);
        }
    }

    static async revokeSSL(domainName) {
        if (process.env.SSL_DEV_BYPASS === 'true') {
            return;
        }
        try {
            await exec(`certbot delete --cert-name ${domainName} --non-interactive`);
        } catch (e) {
            console.error(`Certbot delete failed for ${domainName}:`, e.message);
        }
    }
}

module.exports = SSLService;
