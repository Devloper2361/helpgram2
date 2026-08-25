import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "./enums.js";
import { prisma } from "./prisma.js";
import { PrismaClient } from "@prisma/client";


export type EligibilityReason = 
  | "ELIGIBLE"
  | "NOT_WORKER"
  | "NO_ACTIVE_SOCIETY_MEMBERSHIP"
  | "CROSS_FEDERATION"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_INACTIVE"
  | "MISSING_SKILLS"
  | "LEGACY_TASK"
  | "TASK_NOT_FOUND"
  | "TASK_NOT_OPEN"
  | "IS_REQUESTER"
  | "TRUST_SCORE_TOO_LOW"
  | "LOCATION_REQUIRED"
  | "OUTSIDE_SERVICE_AREA";

export interface EligibilityResult {
  eligible: boolean;
  reason: EligibilityReason;
  missingSkills: string[];
  trustScore?: number;
}


export const DEFAULT_SERVICE_RADIUS_KM = 20;

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)) return Infinity;
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) return Infinity;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const MIN_TRUST_SCORE = 20;

export async function checkWorkerEligibility(
  userId: string,
  taskId: string
): Promise<EligibilityResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: { include: { skills: true } },
      societyMemberships: {
        where: { status: MembershipStatus.ACTIVE },
        include: { society: true }
      }
    }
  });

  if (!user || user.role !== UserRole.WORKER) {
    return { eligible: false, reason: "NOT_WORKER", missingSkills: [] };
  }

    if (user.profile && Number(user.profile.trustScore) < MIN_TRUST_SCORE) {
    return { eligible: false, reason: "TRUST_SCORE_TOO_LOW", missingSkills: [], trustScore: Number(user.profile.trustScore) };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      service: {
        include: {
          category: true,
          skills: true
        }
      }
    }
  });

  if (!task) {
    return { eligible: false, reason: "TASK_NOT_FOUND", missingSkills: [] };
  }

  if (task.status !== TaskStatus.OPEN) {
    return { eligible: false, reason: "TASK_NOT_OPEN", missingSkills: [] };
  }

  if (task.requesterId === userId) {
    return { eligible: false, reason: "IS_REQUESTER", missingSkills: [] };
  }

  if (!task.serviceId || !task.service) {
    return { eligible: true, reason: "LEGACY_TASK", missingSkills: [] };
  }

  const service = task.service;

  if (service.status !== "ACTIVE") {
    return { eligible: false, reason: "SERVICE_INACTIVE", missingSkills: [] };
  }

  const serviceFederationId = service.category.federationId;
  const belongsToFederation = user.societyMemberships.some(
    (membership) => membership.society.federationId === serviceFederationId
  );

  if (!belongsToFederation) {
    if (user.societyMemberships.length === 0) {
      return { eligible: false, reason: "NO_ACTIVE_SOCIETY_MEMBERSHIP", missingSkills: [] };
    }
    return { eligible: false, reason: "CROSS_FEDERATION", missingSkills: [] };
  }

  const userSkillIds = new Set(user.profile?.skills.map((s) => s.id) || []);

  const missingSkills: string[] = [];
  for (const requiredSkill of service.skills) {
    if (!userSkillIds.has(requiredSkill.id)) {
      missingSkills.push(requiredSkill.name);
    }
  }

  
  if (missingSkills.length > 0) {
    return { eligible: false, reason: "MISSING_SKILLS", missingSkills };
  }

  // Geo-spatial check
  if (task.locationLat !== null && task.locationLng !== null) {
    if (!user.profile || user.profile.locationLat === null || user.profile.locationLng === null) {
      return { eligible: false, reason: "LOCATION_REQUIRED", missingSkills: [] };
    }
    const distance = calculateDistanceKm(
      Number(user.profile.locationLat),
      Number(user.profile.locationLng),
      task.locationLat,
      task.locationLng
    );
    if (distance > DEFAULT_SERVICE_RADIUS_KM) {
      return { eligible: false, reason: "OUTSIDE_SERVICE_AREA", missingSkills: [] };
    }
  }


  return { eligible: true, reason: "ELIGIBLE", missingSkills: [] };
}
