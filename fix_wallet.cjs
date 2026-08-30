const fs = require('fs');
let code = fs.readFileSync('src/lib/wallet.ts', 'utf8');

// Remove balanceAfter: ...,
code = code.replace(/balanceAfter:\s*[^,]+,/g, '');

// Remove description: ...,
code = code.replace(/description:\s*[^,}\n]+/g, '');

// Remove razorpayOrderId,
code = code.replace(/razorpayOrderId,\s*/g, '');

// Remove razorpayPayoutId,
code = code.replace(/razorpayPayoutId,\s*/g, '');

// Cleanup trailing commas before closing braces if any (due to replace)
code = code.replace(/,\s*}/g, '\n      }');

fs.writeFileSync('src/lib/wallet.ts', code);
