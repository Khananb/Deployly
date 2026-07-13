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
        const hasWpConfig = hasFile('wp-config.php') || hasFile('wp-content');
        const hasIndexHtml = hasFile('index.html');

        if (hasPackageJson) {
            // Node-based projects
            let packageData = {};
            try {
                const pkgString = fs.readFileSync(path.join(searchPath, 'package.json'), 'utf8');
                packageData = JSON.parse(pkgString);
            } catch (e) {
                // Ignore parse errors, proceed with structural checks
            }
            
            const dependencies = {
                ...packageData.dependencies,
                ...packageData.devDependencies
            };

            // Angular
            if (hasFile('angular.json')) {
                return { projectType: 'node', framework: 'ANGULAR', ready: true };
            }

            // Nuxt
            if (hasFilePattern(/^nuxt\.config\./)) {
                return { projectType: 'node', framework: 'NUXT', ready: true };
            }

            // Svelte
            if (hasFilePattern(/^svelte\.config\./)) {
                return { projectType: 'node', framework: 'SVELTE', ready: true };
            }

            // Remix
            if (hasFilePattern(/^remix\.config\./) || (hasFilePattern(/^vite\.config\./) && dependencies['@remix-run/react'])) {
                return { projectType: 'node', framework: 'REMIX', ready: true };
            }

            // Astro
            if (hasFilePattern(/^astro\.config\./)) {
                return { projectType: 'node', framework: 'ASTRO', ready: true };
            }

            // React/Vite
            if (hasFilePattern(/^vite\.config\./)) {
                return { projectType: 'node', framework: 'REACT_VITE', ready: true };
            }

            // Next.js
            if (hasFilePattern(/^next\.config\./)) {
                return { projectType: 'node', framework: 'NEXTJS', ready: true };
            }

            // Generic Node
            return { projectType: 'node', framework: 'NODE', ready: true };
        }

        if (hasWpConfig) {
            return { projectType: 'php', framework: 'WORDPRESS', ready: true };
        }

        if (hasComposerJson || hasFilePattern(/\.php$/)) {
            return { projectType: 'php', framework: 'PHP', ready: true };
        }

        if (hasIndexHtml) {
            return { projectType: 'static', framework: 'HTML', ready: true };
        }

        return { projectType: 'unknown', framework: 'UNKNOWN', ready: true }; // Allow unknown to deploy static or fail gracefully
    }
}

module.exports = ProjectDetector;
