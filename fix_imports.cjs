const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdir(dir, function(err, list) {
        if (err) return callback(err);
        let pending = list.length;
        if (!pending) return callback(null);
        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err) {
                        if (!--pending) callback(null);
                    });
                } else {
                    if (file.endsWith('.ts')) {
                        let content = fs.readFileSync(file, 'utf8');
                        // Calculate relative path to src/lib/enums.js
                        let relativePath = path.relative(path.dirname(file), path.join(__dirname, 'src/lib/enums.js'));
                        if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
                        
                        // Add import if it uses any of the enums
                        const enums = ['UserRole', 'TaskStatus', 'DisputeStatus', 'TransactionType', 'TransactionStatus', 'VerificationStatus', 'NotificationType', 'MessageType', 'OrganizationStatus', 'MembershipStatus', 'MembershipRole', 'ClaimStatus'];
                        
                        let needsImport = false;
                        for (const e of enums) {
                            if (content.includes(e)) {
                                needsImport = true;
                                break;
                            }
                        }
                        
                        if (needsImport && !content.includes('from "'+relativePath+'"')) {
                             content = `import { ${enums.join(', ')} } from "${relativePath}";\n` + content;
                             fs.writeFileSync(file, content);
                        }
                    }
                    if (!--pending) callback(null);
                }
            });
        });
    });
}

walk('src', (err) => {
    if (err) throw err;
    console.log('Fixed imports');
});
