import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "./enums.js";
export const UserRole = {
  USER: "USER",
  CUSTOMER: "CUSTOMER",
  TASKER: "TASKER",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  SOCIETY_ADMIN: "SOCIETY_ADMIN",
  FEDERATION_ADMIN: "FEDERATION_ADMIN",
  WORKER: "WORKER"
} as const;
export type UserRole = keyof typeof UserRole;

export const TaskStatus = {
  OPEN: "OPEN",
  ACCEPTED: "ACCEPTED",
  IN_PROGRESS: "IN_PROGRESS",
  PROOF_SUBMITTED: "PROOF_SUBMITTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  DISPUTED: "DISPUTED"
} as const;
export type TaskStatus = keyof typeof TaskStatus;

export const DisputeStatus = {
  PENDING_REVIEW: "PENDING_REVIEW",
  UNDER_INVESTIGATION: "UNDER_INVESTIGATION",
  RESOLVED_REFUNDED: "RESOLVED_REFUNDED",
  RESOLVED_RELEASED: "RESOLVED_RELEASED",
  REJECTED: "REJECTED"
} as const;
export type DisputeStatus = keyof typeof DisputeStatus;

export const TransactionType = {
  DEPOSIT: "DEPOSIT",
  WITHDRAWAL: "WITHDRAWAL",
  ESCROW_LOCK: "ESCROW_LOCK",
  ESCROW_RELEASE: "ESCROW_RELEASE",
  ESCROW_REFUND: "ESCROW_REFUND",
  PLATFORM_FEE: "PLATFORM_FEE",
  SOCIETY_FEE: "SOCIETY_FEE",
  FEDERATION_FEE: "FEDERATION_FEE"
} as const;
export type TransactionType = keyof typeof TransactionType;

export const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  LOCKED: "LOCKED"
} as const;
export type TransactionStatus = keyof typeof TransactionStatus;

export const VerificationStatus = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED"
} as const;
export type VerificationStatus = keyof typeof VerificationStatus;

export const NotificationType = {
  TASK_UPDATE: "TASK_UPDATE",
  MESSAGE: "MESSAGE",
  FUNDS_UPDATE: "FUNDS_UPDATE",
  SYSTEM: "SYSTEM"
} as const;
export type NotificationType = keyof typeof NotificationType;

export const MessageType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  FILE: "FILE",
  SYSTEM: "SYSTEM"
} as const;
export type MessageType = keyof typeof MessageType;

export const OrganizationStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  INACTIVE: "INACTIVE"
} as const;
export type OrganizationStatus = keyof typeof OrganizationStatus;

export const MembershipStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED"
} as const;
export type MembershipStatus = keyof typeof MembershipStatus;

export const MembershipRole = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER"
} as const;
export type MembershipRole = keyof typeof MembershipRole;

export const ClaimStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SETTLEMENT_PROCESSING: "SETTLEMENT_PROCESSING",
  SETTLED: "SETTLED"
} as const;
export type ClaimStatus = keyof typeof ClaimStatus;

export const EscrowStatus = {
  LOCKED: "LOCKED",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
  PARTIAL_RELEASE: "PARTIAL_RELEASE",
  DISPUTED: "DISPUTED"
} as const;
export type EscrowStatus = keyof typeof EscrowStatus;

export const TaskType = {
  HOUSEHOLD: "HOUSEHOLD",
  INSTITUTIONAL_PARENT: "INSTITUTIONAL_PARENT",
  INSTITUTIONAL_SUB: "INSTITUTIONAL_SUB"
} as const;
export type TaskType = keyof typeof TaskType;
