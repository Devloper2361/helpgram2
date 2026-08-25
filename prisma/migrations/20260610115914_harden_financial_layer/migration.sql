-- AlterTable
ALTER TABLE "Wallet" ADD CONSTRAINT "check_balance_available_positive" CHECK ("balanceAvailable" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT "check_balance_escrowed_positive" CHECK ("balanceEscrowed" >= 0);

-- AlterTable
ALTER TABLE "EscrowEntry" ADD CONSTRAINT "check_escrow_amount_positive" CHECK ("amount" >= 0);

-- AlterTable
ALTER TABLE "Transaction" ADD CONSTRAINT "check_transaction_amount_positive" CHECK ("amount" > 0);
