import fs from 'fs';

let enumsContent = fs.readFileSync('src/lib/enums.ts', 'utf8');
if (!enumsContent.includes('EscrowStatus')) {
  const escrowStatus = `
export const EscrowStatus = {
  LOCKED: "LOCKED",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
  PARTIAL_RELEASE: "PARTIAL_RELEASE",
  DISPUTED: "DISPUTED"
} as const;
export type EscrowStatus = keyof typeof EscrowStatus;
`;
  fs.writeFileSync('src/lib/enums.ts', enumsContent + escrowStatus);
}

let walletContent = fs.readFileSync('src/lib/wallet.ts', 'utf8');
if (!walletContent.includes('EscrowStatus')) {
  // It uses EscrowStatus.LOCKED, so it does use it, but doesn't import it.
}
walletContent = walletContent.replace(/import \{ ([^}]+) \} from "\.\/enums\.js";/, (match, p1) => {
  if (!p1.includes('EscrowStatus')) {
    return `import { ${p1}, EscrowStatus } from "./enums.js";`;
  }
  return match;
});
fs.writeFileSync('src/lib/wallet.ts', walletContent);
