# Phase 5B: Escrow Readiness Audit

## Analysis of Current State vs Requirements

**1. Wallet balances cannot become negative**
* Current State: We rely on application-level checks and Optimistic Concurrency Control (`version`). Prisma schema does not natively enforce positive balances.
* Risk Level: Medium. An application bug bypassing `version` or directly modifying the `decimal` field could result in a negative balance.

**2. Escrow balances cannot become negative**
* Current State: Same as Wallet balance. `Wallet.balanceEscrowed` and `EscrowEntry.amount` lack native check constraints on the DB level.
* Risk Level: Medium.

**3. releaseFunds() is idempotent**
* Current State: Stubbed.
* Risk Level: High. This function must absolutely utilize `idempotencyKey` checks and check existing `EscrowEntry.status` to ensure funds aren't released twice for the same request.

**4. refundFunds() is idempotent**
* Current State: Stubbed.
* Risk Level: High. Same requirement as `releaseFunds()`.

**5. lockFunds() cannot execute twice for the same task**
* Current State: The current logic in `lockFunds()` performs an "upsert" where it increments the existing `EscrowEntry.amount` if it finds an already existing `EscrowEntry`. This violates the requirement and poses a double-lock risk if a task is "started" twice or if an orchestrator re-attempts lock with a new idempotency key.
* Risk Level: High.

**6. PlatformRevenue entries cannot be duplicated**
* Current State: `PlatformRevenue.taskId` and `PlatformRevenue.transactionId` are marked `@unique` in the Prisma schema.
* Risk Level: Low. Database constraints provide a rigorous safeguard.

**7. EscrowEntry has unique task constraints**
* Current State: `EscrowEntry.taskId` is constrained with `@unique`.
* Risk Level: Low. The database restricts more than one EscrowEntry per task.

**8. Task approval cannot release funds twice**
* Current State: The task route for `approve` currently just updates the task status to `COMPLETED` without enforcing money movement. When we bind money movement, it must prevent doing so if status is already `COMPLETED`.
* Risk Level: High. We must ensure atomic state transition with the escrow fund release.

**9. Task status transitions are validated before money movement**
* Current State: The `approve` endpoint validates `task.status !== PROOF_SUBMITTED && task.status !== IN_PROGRESS` before allowing completion, but the logic should be strictly coupled with the wallet transaction within the same Prisma `$transaction`.
* Risk Level: High. Non-transactional transitions could leave the task in `COMPLETED` but funds not released if the system crashes mid-request.

---

## Required Fixes (Pre-Phase 5B)

1. **Fix `lockFunds` Double-Locking Risk**:
   Modify `lockFunds()` in `src/lib/wallet.ts` to throw a `WalletError("Task already has an escrow entry")` if `escrowEntry` already exists, instead of incrementing its internal amount.
2. **Idempotency in Escrow Movement**:
   Ensure `releaseFunds` and `refundFunds` (when implemented) accept and check an `idempotencyKey` strictly against the `Transaction` table.
3. **Database Constraints (Optional but Highly Recommended)**:
   Add raw SQL migration `ALTER TABLE "Wallet" ADD CONSTRAINT check_balance_available_positive CHECK ("balanceAvailable" >= 0);` to securely lock down database integrity. Do the same for `balanceEscrowed`.
4. **Atomic Task-Escrow Release**:
   In the HTTP handler for Task Approval (`/api/tasks/:id/approve`), ensure the entire sequence (Status -> COMPLETED, move funds from Escrow -> Available, take Platform Fee) is batched or logically structured to avoid partial failures.

## Recommended Fixes

1. **State Machine validation**: Create a strict `canTransition(from, to)` helper to validate task transitions to prevent API bypass errors.
2. **Schema-level ENUM sync**: Ensure `EscrowStatus.PARTIAL_RELEASE` is properly utilized if partial disputes/milestones are ever added.
3. **Task-Transaction Integrity**: Link the `Transaction` representing Escrow creation (`TransactionType.ESCROW_LOCK`) directly to the original `taskId`. (Currently supported via `Transaction.taskId`).
