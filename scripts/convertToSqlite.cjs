const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Change datasource
schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = env("DATABASE_URL")');

// Extract all enums and values
const enumRegex = /enum\s+(\w+)\s+{([^}]+)}/g;
let match;
const enums = {};
while ((match = enumRegex.exec(schema)) !== null) {
  const enumName = match[1];
  enums[enumName] = true;
}

// Remove enums
schema = schema.replace(/enum\s+\w+\s+{[^}]+}/g, '');

// Replace enum usages with String
for (const e of Object.keys(enums)) {
  const typeRegex = new RegExp(`(\\w+)\\s+${e}(\\?)?(\\s+@default\\(([^)]+)\\))?`, 'g');
  schema = schema.replace(typeRegex, (m, field, optional, defaultBlock, defaultVal) => {
    let str = `${field} String${optional ? '?' : ''}`;
    if (defaultBlock) {
      str += ` @default("${defaultVal}")`;
    }
    return str;
  });
}

// Remove mapped db types
schema = schema.replace(/@db\.\w+\([^)]*\)/g, '');
schema = schema.replace(/@db\.\w+/g, '');

// Change Decimal to Float
schema = schema.replace(/Decimal/g, 'Float');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Converted to SQLite');
