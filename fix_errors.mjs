import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{tsx,ts}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace {error} inside JSX text nodes
  const newContent = content.replace(/>\s*\{error\}\s*</g, ">{typeof error === 'string' ? error : JSON.stringify(error)}<");
  if (newContent !== content) {
    content = newContent;
    changed = true;
  }
  
  // Replace {data.error}
  const newContent2 = content.replace(/>\s*\{data\.error\}\s*</g, ">{typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}<");
  if (newContent2 !== content) {
    content = newContent2;
    changed = true;
  }
  
  // Replace {applyError.error}
  const newContent3 = content.replace(/>\s*\{applyError\.error\}\s*</g, ">{typeof applyError.error === 'string' ? applyError.error : JSON.stringify(applyError.error)}<");
  if (newContent3 !== content) {
    content = newContent3;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
