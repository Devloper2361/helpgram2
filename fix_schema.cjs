const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Remove duplicate JobLock
const parts = schema.split('model JobLock {');
if (parts.length > 2) {
  schema = parts[0] + 'model JobLock {' + parts[1];
}

// 2. Add relation fields to User if missing
if (!schema.includes('societyMemberships')) {
  schema = schema.replace(
    /model User\s*{([\s\S]*?)}/,
    (match, content) => {
      let newContent = content;
      newContent += '\n  societyMemberships SocietyMembership[]\n';
      newContent += '  federationMemberships FederationMembership[]\n';
      newContent += '  VerifiedCertifications Certification[] @relation("VerifiedCertifications")\n';
      newContent += '  welfareProfile WorkerWelfareProfile?\n';
      newContent += '  welfareClaims WelfareClaim[]\n';
      return `model User {${newContent}}`;
    }
  );
}

// 3. Add relation fields to Profile if missing
if (!schema.includes('certifications')) {
  schema = schema.replace(
    /model Profile\s*{([\s\S]*?)}/,
    (match, content) => {
      let newContent = content;
      newContent += '\n  certifications Certification[]\n';
      return `model Profile {${newContent}}`;
    }
  );
}

// 4. Add relation fields to Skill if missing
if (!schema.includes('certifications')) {
  schema = schema.replace(
    /model Skill\s*{([\s\S]*?)}/,
    (match, content) => {
      let newContent = content;
      newContent += '\n  certifications Certification[]\n';
      newContent += '  services Service[]\n';
      return `model Skill {${newContent}}`;
    }
  );
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log("Fixed.");
