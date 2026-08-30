import { prisma } from "./prisma.js";
import { UserRole, TaskStatus, VerificationStatus, MembershipStatus } from "./enums.js";
import { DEFAULT_SERVICE_RADIUS_KM, calculateDistanceKm, MIN_TRUST_SCORE } from "./workerEligibility.js";

export interface ScoringFactor {
  workerId: string;
  totalScore: number;
  factors: {
    skillMatch: boolean;
    distanceScore: number;
    trustScoreValue: number;
    workloadPenalty: number;
    recentOpportunityScore: number;
  };
  reasons: string[];
}

export async function findAndRankEligibleWorkers(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      skills: true,
      service: {
        include: {
          category: true,
          skills: true
        }
      }
    }
  });

  
  if (!task || task.status !== TaskStatus.OPEN || task.requesterId === null) {
    return []; // Task not dispatchable
  }
  
  if (!task.service || task.service.status !== "ACTIVE") {
    return [];
  }

  const requiredSkillIds = new Set<string>();
  if (task.service) {
    task.service.skills.forEach(s => requiredSkillIds.add(s.id));
  }
  if ((task as any).skills) {
    (task as any).skills.forEach((s: any) => requiredSkillIds.add(s.skillId));
  }
  const federationId = task.service.category.federationId;
  const now = new Date();
  
  // Phase 1: Bulk Database Query (Solves N+1)
  const potentialWorkers = await prisma.user.findMany({
    where: {
      role: UserRole.WORKER,
      id: { not: task.requesterId },
      profile: {
        trustScore: { gte: MIN_TRUST_SCORE }
      },
      societyMemberships: {
        some: {
          status: MembershipStatus.ACTIVE,
          society: { federationId: federationId }
        }
      }
    },
    include: {
      profile: {
        include: { 
          certifications: true,
          userMetrics: true 
        }
      },
      acceptedTasks: {
        where: {
          status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
          updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        select: {
          id: true,
          status: true,
          price: true
        }
      }
    }
  });

  // Phase 2: In-Memory Hard Filtering
  const eligibleWorkers = [];
  for (const worker of potentialWorkers) {
    // 1. Skill & Certification Check
    const validCertSkillIds = new Set(
      worker.profile?.certifications
        ?.filter(cert =>
          cert.status === VerificationStatus.VERIFIED &&
          (cert.expiresAt === null || new Date(cert.expiresAt) > now)
        )
        .map(cert => cert.skillId) || []
    );
    
    let hasAllSkills = true;
    for (const reqSkillId of requiredSkillIds) {
      if (!validCertSkillIds.has(reqSkillId)) {
        hasAllSkills = false;
        break;
      }
    }
    
    if (!hasAllSkills) continue;
    
    // 2. Geo-spatial Check
    let distance = Infinity;
    if (task.locationLat !== null && task.locationLng !== null) {
      if (!worker.profile || worker.profile.locationLat === null || worker.profile.locationLng === null) {
        continue; // Required location missing
      }
      distance = calculateDistanceKm(
        Number(worker.profile.locationLat),
        Number(worker.profile.locationLng),
        task.locationLat,
        task.locationLng
      );
      
      if (distance > DEFAULT_SERVICE_RADIUS_KM) {
        continue;
      }
    } else {
      distance = 0; // If task has no location, distance is 0 for score
    }
    
    eligibleWorkers.push({ worker, distance });
  }

  // Phase 3: Fair-Share Scoring
  let maxRecentTaskValue = 0;
  
  const workerStats = eligibleWorkers.map(ew => {
    let activeWorkload = 0;
    let recentTaskValue = 0;
    
    for (const t of ew.worker.acceptedTasks) {
      if (t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS') {
        activeWorkload++;
      }
      if (t.status === 'COMPLETED' && t.price) {
        recentTaskValue += Number(t.price);
      }
    }
    
    if (recentTaskValue > maxRecentTaskValue) {
      maxRecentTaskValue = recentTaskValue;
    }
    
    return { ...ew, activeWorkload, recentTaskValue };
  });
  
  const scoredCandidates = workerStats.map(stat => {
    const reasons: string[] = [];
    
    // Distance (Max 30 points)
    const distanceScore = stat.distance === Infinity ? 0 : Math.max(0, ((DEFAULT_SERVICE_RADIUS_KM - stat.distance) / DEFAULT_SERVICE_RADIUS_KM) * 30);
    reasons.push(`+${distanceScore.toFixed(1)}pts for proximity (${stat.distance.toFixed(1)}km away)`);
    
    // Trust Score (Max 30 points)
    const rawTrust = stat.worker.profile?.trustScore ? Number(stat.worker.profile.trustScore) : MIN_TRUST_SCORE;
    const trustScoreValue = (rawTrust / 100) * 30;
    reasons.push(`+${trustScoreValue.toFixed(1)}pts for trust score of ${rawTrust}`);
    
    // Active Workload Penalty (-10 points per active task)
    const workloadPenalty = stat.activeWorkload * 10;
    if (workloadPenalty > 0) {
      reasons.push(`-${workloadPenalty}pts penalty for having ${stat.activeWorkload} active tasks`);
    } else {
      reasons.push(`+0pts penalty (no active tasks)`);
    }
    
    // Recent Opportunity Score (Max 40 points)
    let recentOpportunityScore = 40;
    if (maxRecentTaskValue > 0) {
      recentOpportunityScore = 40 - ((stat.recentTaskValue / maxRecentTaskValue) * 40);
    }
    reasons.push(`+${recentOpportunityScore.toFixed(1)}pts for opportunity distribution (Recent task value: ₹${stat.recentTaskValue})`);
    
    const totalScore = distanceScore + trustScoreValue + recentOpportunityScore - workloadPenalty;
    
    return {
      workerId: stat.worker.id,
      worker: stat.worker, // keep the worker object just in case the caller needs it
      totalScore,
      factors: {
        skillMatch: true,
        distanceScore,
        trustScoreValue,
        workloadPenalty,
        recentOpportunityScore
      },
      reasons
    };
  });
  
  // Sort descending by score
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
  
  return scoredCandidates;
}
