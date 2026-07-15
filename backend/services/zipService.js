const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

class ZipService {
    /**
     * Validates and extracts a ZIP file securely.
     * @param {string} sourcePath - Path to the uploaded ZIP file
     * @param {string} targetPath - Path to extract the contents to
     * @returns {boolean} - true if successful
     */
    static async validateAndExtract(sourcePath, targetPath) {
        // Ensure target directory exists and is empty
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        }
        fs.mkdirSync(targetPath, { recursive: true });

        try {
            let totalSize = 0;
            let fileCount = 0;

            await extract(sourcePath, {
                dir: targetPath,
                onEntry: (entry, zipfile) => {
                    fileCount++;
                    totalSize += entry.uncompressedSize;
                    
                    if (totalSize > 500 * 1024 * 1024) {
                        throw new Error("Security Violation: Uncompressed size exceeds 500MB limit.");
                    }
                    if (fileCount > 10000) {
                        throw new Error("Security Violation: File count exceeds 10,000 limit.");
                    }

                    const fileName = entry.fileName;
                    
                    // 1. Reject symlinks to prevent Zip Slip / arbitrary file write
                    // (extract-zip already protects against absolute paths and ../ but we are extra careful)
                    const isSymlink = ((entry.externalFileAttributes >>> 16) & 0o120000) === 0o120000;
                    if (isSymlink) {
                        throw new Error(`Security Violation: Symlinks are not allowed (${fileName})`);
                    }

                    // 2. Reject nested archives
                    if (/\.(zip|tar|gz|bz2|7z|rar)$/i.test(fileName)) {
                        throw new Error(`Security Violation: Nested archives are not allowed (${fileName})`);
                    }

                    // 3. Reject executables
                    if (/\.(exe|sh|bat|cmd|dll|so|dylib)$/i.test(fileName)) {
                        throw new Error(`Security Violation: Executable files are not allowed (${fileName})`);
                    }
                }
            });

            // Flatten nested root directory if necessary
            this._flattenRootDirectory(targetPath);

            return true;
        } catch (error) {
            // Cleanup on failure
            if (fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            }
            throw error;
        }
    }

    static _flattenRootDirectory(extractPath) {
        const items = fs.readdirSync(extractPath);
        if (items.length === 1) {
            const singleItemPath = path.join(extractPath, items[0]);
            if (fs.statSync(singleItemPath).isDirectory()) {
                const innerItems = fs.readdirSync(singleItemPath);
                for (const item of innerItems) {
                    fs.renameSync(path.join(singleItemPath, item), path.join(extractPath, item));
                }
                fs.rmdirSync(singleItemPath);
            }
        }
    }
}

module.exports = ZipService;
