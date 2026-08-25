import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "./enums.js";
import { PrismaClient } from "@prisma/client";


// Re-usable helper for creating notifications safely
export async function createNotification(
  tx: any, 
  userId: string, 
  type: NotificationType, 
  content: string, 
  relatedEntityId?: string
) {
  try {
    await tx.notification.create({
      data: {
        userId,
        type,
        content,
        relatedEntityId,
      }
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    // don't throw to prevent breaking business logic in some cases,
    // although if tx is a real Prisma transaction, eating errors might still cause tx failure depending on error type.
  }
}
