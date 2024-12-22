const fs = require('fs');
const path = require('path');

// Check for sensitive files
const sensitiveFiles = ['.env', '.git', 'config.js'];
sensitiveFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
        const stats = fs.statSync(path.join(process.cwd(), file));
        if (stats.mode & 0o777 !== 0o600) {
            console.error(`Warning: ${file} has unsafe permissions`);
            process.exit(1);
        }
    }
});

// Verify node_modules permissions
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
    const stats = fs.statSync(nodeModulesPath);
    if (stats.mode & 0o777 !== 0o755) {
        console.error('Warning: node_modules has unsafe permissions');
        process.exit(1);
    }
}

console.log('Security check passed'); 