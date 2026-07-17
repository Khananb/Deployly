const fs = require('fs');
const path = require('path');

class ProjectDetector {
    /**
     * Detects project type and framework safely without executing code.
     * @param {string} extractPath 
     * @returns {object} { projectType, framework, ready }
     */
    static detectProject(extractPath) {
        if (!fs.existsSync(extractPath)) {
            return { projectType: 'unknown', framework: 'UNKNOWN', ready: false };
        }

        // Handle single nested root directory
        let searchPath = extractPath;
        const items = fs.readdirSync(extractPath);
        if (items.length === 1) {
            const singleItemPath = path.join(extractPath, items[0]);
            if (fs.statSync(singleItemPath).isDirectory()) {
                searchPath = singleItemPath;
            }
        }

        // Helper to check file existence
        const hasFile = (filename) => fs.existsSync(path.join(searchPath, filename));
        
        // Helper to check for files matching a pattern
        const hasFilePattern = (pattern) => {
            const allFiles = fs.readdirSync(searchPath);
            return allFiles.some(f => pattern.test(f));
        };

        const hasPackageJson = hasFile('package.json');
        const hasComposerJson = hasFile('composer.json');

        // Detection order: vite.config.js -> next.config.js -> package.json -> composer.json -> artisan -> server.js -> app.js -> index.html -> public/index.html
        if (hasFilePattern(/^vite\.config\./)) return { projectType: 'node', framework: 'REACT_VITE', ready: true, confidence: 'high' };
        if (hasFilePattern(/^next\.config\./)) return { projectType: 'node', framework: 'NEXTJS', ready: true, confidence: 'high' };
        
        if (hasPackageJson) {
            let packageData = {};
            try {
                const pkgString = fs.readFileSync(path.join(searchPath, 'package.json'), 'utf8');
                packageData = JSON.parse(pkgString);
            } catch (e) {
                // Ignore parse errors
            }
            const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
            
            if (dependencies['react-scripts']) return { projectType: 'node', framework: 'REACT_CRA', ready: true, confidence: 'high' };
            if (dependencies['express']) return { projectType: 'node', framework: 'EXPRESS', ready: true, confidence: 'high' };
            
            // If it has package.json but no specific framework, it's generic Node
            return { projectType: 'node', framework: 'NODE', ready: true, confidence: 'high' };
        }

        if (hasComposerJson) {
            if (hasFile('artisan')) return { projectType: 'php', framework: 'LARAVEL', ready: true, confidence: 'high' };
            return { projectType: 'php', framework: 'PHP', ready: true, confidence: 'high' };
        }

        if (hasFile('artisan')) {
            return { projectType: 'php', framework: 'LARAVEL', ready: true, confidence: 'high' };
        }

        if (hasFile('server.js') || hasFile('app.js')) {
            return { projectType: 'node', framework: 'NODE', ready: true, confidence: 'high' };
        }

        if (hasFile('index.html')) {
            return { projectType: 'static', framework: 'HTML', ready: true, confidence: 'high' };
        }
        
        if (hasFile(path.join('public', 'index.html'))) {
            return { projectType: 'static', framework: 'HTML', ready: true, confidence: 'high' };
        }

        return { projectType: 'unsupported', framework: 'UNSUPPORTED', ready: true, confidence: 'none' };
    }
}

module.exports = ProjectDetector;
