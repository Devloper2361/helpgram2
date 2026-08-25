import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "./middleware/auth.js";

const router = Router();

// GET /api/memberships/me
router.get("/me", authenticate, async (req: any, res: any) => {
  try {
    const federationMemberships = await prisma.federationMembership.findMany({
      where: { userId: req.user.userId },
      include: { federation: true }
    });
    const societyMemberships = await prisma.societyMembership.findMany({
      where: { userId: req.user.userId },
      include: { society: true }
    });
    res.json({ federationMemberships, societyMemberships });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /api/memberships/:id/status
router.post("/:id/status", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate target status
    if (!["ACTIVE", "REJECTED", "SUSPENDED", "PENDING"].includes(status)) {
      return res.status(400).json({ error: "Invalid status provided" });
    }

    const membership = await prisma.societyMembership.findUnique({
      where: { id },
      include: { society: true }
    });

    if (!membership) {
      return res.status(404).json({ error: "Membership not found" });
    }

    const allowedTransitions: Record<string, string[]> = {
      "PENDING": ["ACTIVE", "REJECTED", "SUSPENDED", "PENDING"],
      "ACTIVE": ["REJECTED", "SUSPENDED", "ACTIVE"],
      "REJECTED": ["REJECTED"],
      "SUSPENDED": ["ACTIVE", "REJECTED", "SUSPENDED"]
    };

    if (!allowedTransitions[membership.status]?.includes(status)) {
       return res.status(400).json({ error: `Invalid transition from ${membership.status} to ${status}` });
    }

    const userId = req.user.userId;
    const userRole = req.user.role;
    let isAuthorized = false;

    if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      isAuthorized = true;
    } else if (userRole === "SOCIETY_ADMIN") {
      const callerMembership = await prisma.societyMembership.findFirst({
        where: {
          userId,
          societyId: membership.societyId,
          role: "ADMIN",
          status: "ACTIVE"
        }
      });
      if (callerMembership) isAuthorized = true;
    } else if (userRole === "FEDERATION_ADMIN") {
      const callerMembership = await prisma.federationMembership.findFirst({
        where: {
          userId,
          federationId: membership.society.federationId,
          role: "ADMIN",
          status: "ACTIVE"
        }
      });
      if (callerMembership) isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to manage this membership" });
    }

    // Update membership status
    const updated = await prisma.societyMembership.update({
      where: { id },
      data: { status }
    });

    try {
      if (membership.status !== status) {
        let content = "";
        if (status === "ACTIVE" && membership.status === "PENDING") content = "Your application to join the society has been approved.";
        else if (status === "ACTIVE" && membership.status === "SUSPENDED") content = "Your membership has been reinstated.";
        else if (status === "REJECTED") content = "Your application to join the society has been rejected.";
        else if (status === "SUSPENDED") content = "Your membership in the society has been suspended.";
        
        if (content) {
          await prisma.notification.create({
            data: {
              userId: membership.userId,
              type: "SYSTEM",
              content
            }
          });
        }
      }
    } catch (e) {
      console.error("Failed to notify worker of membership status change", e);
    }

    res.json({ membership: updated });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
