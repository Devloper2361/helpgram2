const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.resolve(__dirname, 'src'));

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  // Simple check for setSomething( in the render body.
  // This is hard to regex perfectly, but we can look for common patterns.
  // We can look for lines that contain `set[A-Z]` but NOT inside a function/useEffect/etc.
  
  // A typical mistake:
  // if (something) { setState(val) }
  // instead of useEffect(() => { if (something) setState(val) }, [...])
  
  const lines = content.split('\n');
  for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    if (line.match(/set[A-Z][a-zA-Z0-9]*\(/) && 
        !line.includes('=>') && 
        !line.includes('function') && 
        !line.includes('onClick') &&
        !line.includes('onChange') &&
        !line.includes('onSubmit') &&
        !line.includes('useEffect') &&
        !line.includes('catch') &&
        !line.includes('then') &&
        !line.includes('finally')) {
       console.log(`Potential issue in ${file}:${i+1}: ${line.trim()}`);
    }
  }
}
