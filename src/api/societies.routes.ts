import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "./middleware/auth.js";

const router = Router();

// GET /api/societies
router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const societies = await prisma.cooperativeSociety.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        location: true,
        status: true,
        createdAt: true,
        federationId: true,
        federation: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    res.json({ societies });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/societies/:id/apply
router.post("/:id/apply", authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== "WORKER") {
      return res.status(403).json({ error: "Only WORKER can apply to societies" });
    }
    const { id } = req.params;
    const userId = req.user.userId;

    const society = await prisma.cooperativeSociety.findUnique({
      where: { id }
    });

    if (!society) {
      return res.status(404).json({ error: "Society not found" });
    }

    // Check existing membership
    const existing = await prisma.societyMembership.findUnique({
      where: {
        userId_societyId: {
          userId,
          societyId: id
        }
      }
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return res.status(400).json({ error: "Already applied to this society" });
      }
      if (existing.status === "ACTIVE") {
        return res.status(400).json({ error: "Already a member of this society" });
      }
      if (existing.status === "REJECTED") {
        return res.status(400).json({ error: "Your previous application to this society was rejected" });
      }
      if (existing.status === "SUSPENDED") {
        return res.status(403).json({ error: "Your membership in this society is suspended" });
      }
      return res.status(400).json({ error: "You already have a membership record in this society." });
    }

    const membership = await prisma.societyMembership.create({
      data: {
        userId,
        societyId: id,
        role: "MEMBER",
        status: "PENDING"
      }
    });

    try {
      const admins = await prisma.societyMembership.findMany({
        where: { societyId: id, role: "ADMIN", status: "ACTIVE" }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.userId,
            type: "SYSTEM",
            content: "A worker has requested to join your cooperative society."
          }
        }).catch(e => console.error(e));
      }
    } catch (e) {
      console.error("Failed to fetch admins for notification", e);
    }

    res.json({ membership });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Already applied to this society" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/societies/:id
router.get("/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const society = await prisma.cooperativeSociety.findUnique({
      where: { id }
    });
    if (!society) return res.status(404).json({ error: "Not found" });
    res.json({ society });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/societies/:id/members
router.get("/:id/members", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    // Check if the user is a SOCIETY_ADMIN or FEDERATION_ADMIN with access
    if (req.user.role !== "SOCIETY_ADMIN" && req.user.role !== "FEDERATION_ADMIN" && req.user.role !== "PLATFORM_ADMIN" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    // Scoped checking:
    if (req.user.role === "SOCIETY_ADMIN") {
      const membership = await prisma.societyMembership.findFirst({
        where: { userId: req.user.userId, societyId: id, role: "ADMIN", status: "ACTIVE" }
      });
      if (!membership) return res.status(403).json({ error: "Not an admin of this society" });
    }

    if (req.user.role === "FEDERATION_ADMIN") {
      const society = await prisma.cooperativeSociety.findUnique({ where: { id } });
      if (!society) return res.status(404).json({ error: "Society not found" });
      const membership = await prisma.federationMembership.findFirst({
        where: { userId: req.user.userId, federationId: society.federationId, role: "ADMIN", status: "ACTIVE" }
      });
      if (!membership) return res.status(403).json({ error: "Not an admin of this federation" });
    }

    const members = await prisma.societyMembership.findMany({
      where: { societyId: id },
      include: { user: { select: { id: true, email: true, profile: { select: { fullName: true } } } } }
    });
    res.json({ members });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
