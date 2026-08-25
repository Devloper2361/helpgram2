import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "./lib/enums.js";
export type UserRole = 'User' | 'Admin';
export type TaskStatus = 'Open' | 'In Progress' | 'Completed' | 'Disputed' | 'Cancelled';
export type TransactionType = 'Deposit' | 'Withdrawal' | 'Payment' | 'Escrow Lock' | 'Escrow Release';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
  trustScore: number;
  walletBalance: number;
  escrowBalance: number;
  verified: boolean;
  skills: string[];
  bio: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  price: number;
  distance: string;
  time: string;
  status: TaskStatus;
  requesterId: string;
  taskerId?: string;
  createdAt: string;
  urgent?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  taskId?: string;
  createdAt: string;
  description: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  taskId?: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  taskId: string;
  rating: number;
  comment: string;
  createdAt: string;
}
