const fs = require('fs');
let code = fs.readFileSync('src/lib/wallet.ts', 'utf8');

// The block has an extra } or something. Let's print out the exact string and fix it.
// I will just read line by line and find any }` or similar issues, or just reformat it.

code = code.replace(/idempotencyKey\n\s*\}\n\s*\}\n\s*\}\);/g, 'idempotencyKey\n    }\n  });');
code = code.replace(/idempotencyKey\s*\`\n\s*\}\n\s*\}\);/g, 'idempotencyKey\n    }\n  });');

// Let's replace any `}` with `}`
code = code.replace(/\}\`/g, '}');
code = code.replace(/\`\s*\}/g, '}');
code = code.replace(/idempotencyKey\s*\}\s*\}\s*\}\);/g, 'idempotencyKey\n    }\n  });');
code = code.replace(/amount:\s*platformFee\s*\}\s*\}\s*\}\);/g, 'amount: platformFee\n      }\n    });');

fs.writeFileSync('src/lib/wallet.ts', code);
