import fs from 'fs';
import pkg from 'glob';
const { glob } = pkg;

const files = await glob('src/**/*.{tsx,ts}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const newContent = content.replace(/>\s*\{error\}\s*</g, ">{typeof error === 'string' ? error : JSON.stringify(error)}<");
  if (newContent !== content) {
    content = newContent;
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
