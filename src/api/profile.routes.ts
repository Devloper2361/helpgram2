import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";


import multer from "multer";
import path from "path";
import fs2 from "fs";

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs2.existsSync(uploadsDir)) {
  fs2.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
  avatarUrl: z.string().optional().or(z.literal("")),
  location: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional()
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


router.post("/avatar", authenticate, upload.single('avatar'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No avatar uploaded" });
    const fileUrl = '/uploads/' + req.file.filename;
    const userId = req.user.userId;
    const profile = await prisma.profile.update({
      where: { userId },
      data: { avatarUrl: fileUrl }
    });
    res.json({ avatarUrl: fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/skills/:skillId/certify", authenticate, upload.single('evidence'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No evidence uploaded" });
    const fileUrl = '/uploads/' + req.file.filename;
    const userId = req.user.userId;
    const skillId = req.params.skillId;
    
    const profile = await prisma.profile.findUnique({ 
      where: { userId },
      include: { skills: true }
    });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Validate that the user actually claimed this skill
    const hasSkill = profile.skills.some(s => s.id === skillId);
    if (!hasSkill) {
      return res.status(403).json({ error: "Cannot certify a skill you have not claimed" });
    }

    // Check if certification exists
    const existing = await prisma.certification.findFirst({
      where: { profileId: profile.id, skillId }
    });

    if (existing) {
      if (existing.status === "VERIFIED") {
         return res.status(400).json({ error: "Skill is already verified" });
      }
      await prisma.certification.update({
        where: { id: existing.id },
        data: { evidence: fileUrl, status: "PENDING" }
      });
    } else {
      await prisma.certification.create({
        data: {
          profileId: profile.id,
          skillId,
          evidence: fileUrl,
          status: "PENDING"
        }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
