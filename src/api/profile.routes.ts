import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

const getJwtSecret = () => process.env.JWT_SECRET as string;

// Middleware to authenticate user
const authenticate = (req: any, res: any, next: any) => {
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

// 1. GET /api/profile/me
router.get("/me", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
        certifications: true,
        userMetrics: true,
        user: {
          select: { email: true, role: true, createdAt: true }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ profile });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. PUT /api/profile/me
const updateProfileSchema = z.object({
  fullName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  locationLat: z.number().optional(),
  locationLng: z.number().optional()
});

router.put("/me", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const data = updateProfileSchema.parse(req.body);

    const profile = await prisma.profile.update({
      where: { userId },
      data,
      include: {
        skills: true,
        certifications: true,
        userMetrics: true
      }
    });

    res.json({ profile });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. GET /api/profile/:userId
router.get("/:userId", async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        skills: true,
        certifications: {
          select: { id: true, skillId: true, status: true, verifiedAt: true }
        },
        userMetrics: true,
        user: {
          select: { email: true, createdAt: true, role: true }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ profile });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. POST /api/profile/skills
const addSkillSchema = z.object({
  name: z.string().min(1)
});

router.post("/skills", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { name } = addSkillSchema.parse(req.body);

    // 1. Find the profile
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // 2. Upsert skill (if it exists, connect it, if not, create it)
    await prisma.profile.update({
      where: { userId },
      data: {
        skills: {
          connectOrCreate: {
            where: { name },
            create: { name }
          }
        }
      },
      include: { skills: true }
    });

    const updatedProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { skills: true }
    });

    res.json({ profile: updatedProfile });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. DELETE /api/profile/skills/:id
router.delete("/skills/:id", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const skillId = req.params.id;

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Ensure the skill exists on the user's profile
    await prisma.profile.update({
      where: { userId },
      data: {
        skills: {
          disconnect: { id: skillId }
        }
      }
    });

    const updatedProfile = await prisma.profile.findUnique({
      where: { userId },
      include: { skills: true }
    });

    res.json({ profile: updatedProfile });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
