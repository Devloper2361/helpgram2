const fs = require('fs');
let schema = fs.readFileSync('prisma/schema_v2.prisma', 'utf8');

// Provider and URL
schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
schema = schema.replace(/url\s*=\s*env\("DATABASE_URL"\)/g, 'url = "file:./dev.db"');

// Types and DB Native types
schema = schema.replace(/@db\.Uuid/g, '');
schema = schema.replace(/@db\.VarChar\(\d+\)/g, '');
schema = schema.replace(/@db\.Decimal\(\d+,\s*\d+\)/g, '');
schema = schema.replace(/@db\.SmallInt/g, '');
schema = schema.replace(/@default\(dbgenerated\("gen_random_uuid\(\)"\)\)/g, '@default(uuid())');

// Json -> String
schema = schema.replace(/Json\?/g, 'String?');
schema = schema.replace(/Json/g, 'String');

// Decimal -> Float
schema = schema.replace(/Decimal/g, 'Float');

// Enums to String
const enums = [
  'UserRole', 'TaskStatus', 'DisputeStatus', 'EscrowStatus',
  'TransactionType', 'TransactionStatus', 'ReviewType',
  'NotificationType', 'MessageType', 'VerificationStatus'
];

for (const enumName of enums) {
  // Replace field types
  const regex = new RegExp(`(\\w+\\s+)${enumName}(\\s+@default\\((.*?)\\))?`, 'g');
  schema = schema.replace(regex, (match, p1, p2, p3) => {
    if (p3) {
      return `${p1}String @default("${p3}")`;
    }
    return `${p1}String`;
  });
}

// Remove enum blocks
schema = schema.replace(/enum \w+ \{[\s\S]*?\}/g, '');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log("Converted.");
