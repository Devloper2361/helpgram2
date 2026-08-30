const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

code = code.replace(
  /model Task\s*{([\s\S]*?)}/,
  (match, content) => {
    let newContent = content;
    if (!newContent.includes('address      String?')) {
      newContent = newContent.replace(
        /locationLng\s*Float\s*/,
        'locationLng  Float\n  address      String?\n  landmark     String?\n  city         String?\n  state        String?\n'
      );
    }
    return `model Task {${newContent}}`;
  }
);
fs.writeFileSync('prisma/schema.prisma', code);
console.log("Task schema patched");
