const fs = require('fs');
let content = fs.readFileSync('src/api/webhooks.routes.ts', 'utf8');

const regex = /async function handleSuccessfulWithdrawal[\s\S]*export default router;/g;
const replacement = `async function handleSuccessfulWithdrawal(txId: string) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.transaction.updateMany({
      where: { id: txId, status: "PROCESSING" },
      data: { status: "COMPLETED" }
    });
    if (count === 0) return; // already processed or not found
  });
}

async function handleSuccessfulDeposit(txId: string, paymentIntentId: string) {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: txId } });
    if (!transaction) return;

    const { count } = await tx.transaction.updateMany({
      where: { id: txId, status: "PENDING" },
      data: { status: "COMPLETED", stripePaymentId: paymentIntentId }
    });

    if (count === 0) return; // already processed

    const wallet = await tx.wallet.findUnique({ where: { id: transaction.walletId } });
    if (!wallet) throw new Error("Wallet not found");

    await tx.wallet.update({
      where: { id: wallet.id, version: wallet.version },
      data: { 
        balanceAvailable: { increment: transaction.amount },
        version: { increment: 1 }
      }
    });
  });
}

export default router;
`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/api/webhooks.routes.ts', content);
