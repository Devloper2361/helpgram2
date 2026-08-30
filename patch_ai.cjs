const fs = require('fs');
const files = [
  'src/api/institutional.routes.ts',
  'src/api/ai.routes.ts',
  'src/api/welfare.routes.ts',
  'src/api/intelligence.routes.ts',
  'src/lib/dispatch.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('generateContentWithRetry')) {
    // Add import
    let importPath = file.startsWith('src/api/') ? '../lib/ai-helper' : './ai-helper';
    content = `import { generateContentWithRetry } from "${importPath}";\n` + content;
    // Replace calls
    content = content.replace(/await ai\.models\.generateContent\(\{/g, 'await generateContentWithRetry(ai, {');
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
}
