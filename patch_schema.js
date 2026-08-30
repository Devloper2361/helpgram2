const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(
  '  location     String?\n  locationLat  Float?\n  locationLng  Float?',
  '  location     String?\n  locationLat  Float?\n  locationLng  Float?\n  address      String?\n  landmark     String?\n  city         String?\n  state        String?'
);
fs.writeFileSync('prisma/schema.prisma', code);
