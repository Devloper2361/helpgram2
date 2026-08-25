import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../../lib/enums.js";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";


const getJwtSecret = () => process.env.JWT_SECRET as string || "fallback-secret";

export const authenticate = (req: any, res: any, next: NextFunction) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string, role: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: any, res: any, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export const requirePlatformAdmin = requireRole(["PLATFORM_ADMIN", "ADMIN"]);

// We'll implement federation/society scoping at the route level where we query memberships.
