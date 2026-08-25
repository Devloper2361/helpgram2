import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { updateMetricsAndTrust } from "../lib/trust.js";
import { disputeLimiter } from "./middleware/rate-limit.js";
import { prisma } from "../lib/prisma.js";
import { checkWorkerEligibility, MIN_TRUST_SCORE } from "../lib/workerEligibility.js";

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

const optionalAuth = (req: any, res: any, next: any) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as { userId: string, role: string };
      req.user = decoded;
    } catch (error: any) {
      // ignore
    }
  }
  next();
};

const taskSchema = z.object({
  serviceId: z.string().uuid(),
  title: z.string().min(5),
  description: z.string().min(10),
  scheduledFor: z.string().datetime(),
  locationLat: z.number(),
  locationLng: z.number(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
  isEmergency: z.boolean().optional(),
}).strict();

// 1. POST /api/tasks
router.post("/", authenticate, async (req: any, res: any) => {
  try {
    const requesterId = req.user.userId;

    const profile = await prisma.profile.findUnique({
      where: { userId: requesterId },
      select: { trustScore: true }
    });

    const trustScore = profile ? Number(profile.trustScore) : 0;
    
    if (trustScore < MIN_TRUST_SCORE) {
      return res.status(403).json({
        error: "ACCOUNT_RESTRICTED",
        message: "Your account is temporarily restricted from creating new bookings because your trust score is below the minimum required level.",
        trustScore,
        minimumTrustScore: MIN_TRUST_SCORE
      });
    }

    if (req.body.price !== undefined) {
      return res.status(400).json({ error: "Price must not be provided" });
    }

    const data = taskSchema.parse(req.body);

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { category: true }
    });

    if (!service || service.status !== "ACTIVE" || !service.category) {
      return res.status(400).json({ error: "Invalid, nonexistent, or inactive service" });
    }

    const task = await prisma.task.create({
      data: {
        requesterId,
        serviceId: service.id,
        title: data.title,
        description: data.description,
        price: service.basePrice,
        scheduledFor: new Date(data.scheduledFor),
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        address: data.address,
        landmark: data.landmark,
        city: data.city,
        state: data.state,
        category: data.category,
        isEmergency: data.isEmergency || false,
        status: TaskStatus.OPEN,
      },
    });

    res.status(201).json({ task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2. GET /api/tasks
router.get("/", optionalAuth, async (req: any, res: any) => {
  try {
    const { page = "1", limit = "10", search, status, category, minPrice, maxPrice } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const where: any = {};
    if (status) {
      where.status = (status as string).toUpperCase() as TaskStatus;
    }
    if (category && category !== "ALL") {
      where.category = category as string;
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
        { address: { contains: String(search), mode: "insensitive" } },
        { city: { contains: String(search), mode: "insensitive" } },
        { category: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (req.user?.role === "WORKER") {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          profile: { include: { skills: true } },
          societyMemberships: {
            where: { status: "ACTIVE" },
            include: { society: true }
          }
        }
      });
      
      const workerFederationIds = user?.societyMemberships.map((m: any) => m.society.federationId) || [];
      const workerSkillIds = user?.profile?.skills.map((s: any) => s.id) || [];

      
      // Geo-spatial bounding box for WORKER
      if (user?.profile?.locationLat === null || user?.profile?.locationLng === null) {
        return res.status(403).json({ error: "LOCATION_REQUIRED", message: "Please set your service location in your profile to view nearby tasks." });
      }

      const lat = Number(user.profile.locationLat);
      const lng = Number(user.profile.locationLng);
      const DEFAULT_SERVICE_RADIUS_KM = 20;

      // Approximate bounding box
      const latDelta = DEFAULT_SERVICE_RADIUS_KM / 111.32;
      const lngDelta = DEFAULT_SERVICE_RADIUS_KM / (111.32 * Math.cos(lat * (Math.PI / 180)));
      
      const geoFilter = {
  locationLat: {
    gte: lat - latDelta,
    lte: lat + latDelta
  },
  locationLng: {
    gte: lng - lngDelta,
    lte: lng + lngDelta
  }
};

            const workerFilter: any = {
        OR: [
          { serviceId: null },
          {
            service: {
              status: "ACTIVE",
              category: {
                federationId: { in: workerFederationIds }
              },
              skills: {
                none: {
                  id: { notIn: workerSkillIds }
                }
              }
            }
          }
        ],
        AND: [geoFilter]
      };

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          workerFilter
        ];
        delete where.OR;
      } else {
        Object.assign(where, workerFilter); console.dir(where, { depth: null });
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [
        { isEmergency: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        requester: {
          select: { id: true, email: true, profile: { select: { fullName: true, trustScore: true } } },
        },
      },
    });

    const total = await prisma.task.count({ where });

    res.json({ tasks, total, page: pageNum, limit: take });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 2.5 GET /api/tasks/my-tasks
router.get("/my-tasks", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const postedTasks = await prisma.task.findMany({
      where: { requesterId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        tasker: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    });

    const helpingTasks = await prisma.task.findMany({
      where: {
        OR: [
          { taskerId: userId },
          { applications: { some: { taskerId: userId } } }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        requester: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      },
    });

    res.json({ postedTasks, helpingTasks });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. GET /api/tasks/:id
router.get("/:id", optionalAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, email: true, profile: { select: { fullName: true, trustScore: true, avatarUrl: true } } },
        },
        tasker: {
          select: { id: true, email: true, profile: { select: { fullName: true, trustScore: true, avatarUrl: true } } },
        },
        dispute: true,
        media: true
      },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    }

    res.json({ task });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 4. PUT /api/tasks/:id
const updateTaskSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  scheduledFor: z.string().datetime().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
});

router.put("/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized" }); console.log("403 Unauthorized");
    if (task.status !== TaskStatus.OPEN) return res.status(400).json({ error: "Only OPEN tasks can be edited" });

    const updatedTask = await prisma.task.update({
      where: { id, version: task.version },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.price && { price: data.price }),
        ...(data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        ...(data.locationLat && { locationLat: data.locationLat }),
        ...(data.locationLng && { locationLng: data.locationLng }),
        ...(data.address && { address: data.address }),
        ...(data.landmark && { landmark: data.landmark }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.category && { category: data.category }),
        version: { increment: 1 }
      },
    }, { maxWait: 15000, timeout: 15000 });

    res.json({ task: updatedTask });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 5. POST /api/tasks/:id/cancel
router.post("/:id/cancel", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized" }); console.log("403 Unauthorized");
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
       return res.status(400).json({ error: "Task cannot be cancelled from current status." });
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id, version: task.version },
        data: { 
          status: TaskStatus.CANCELLED,
          cancelledAt: new Date(),
          version: { increment: 1 }
        },
      });

      // If the task was already ACCEPTED or beyond, we locked funds
      if (task.status !== TaskStatus.OPEN) {
        await refundFundsTx(tx, {
          taskId: task.id,
          idempotencyKey: `ref_${task.id}`
        });
      }
      
      return updated;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, task.requesterId);
      if (task.taskerId) {
        await updateMetricsAndTrust(prisma, task.taskerId);
      }
    } catch (e) {
      console.error("Trust update failed in cancel", e);
    }

    try {
      if (task.taskerId) {
        await prisma.notification.create({
          data: {
            userId: task.taskerId,
            type: "TASK_UPDATE",
            content: "The customer has cancelled the booking.",
            relatedEntityId: task.id
          }
        });
      }
    } catch (e) {
      console.error("Failed to notify tasker of cancellation", e);
    }

    res.json({ task: updatedTask });
  } catch (error: any) {
    if (error instanceof WalletError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Phase 4 Routes

// 6. POST /api/tasks/:id/apply
router.post("/:id/apply", authenticate, async (req: any, res: any) => { console.log("apply route hit");
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.requesterId === userId) return res.status(400).json({ error: "Cannot apply to own task" });
    if (task.status !== TaskStatus.OPEN) return res.status(400).json({ error: "Task is not open" }); console.log("400 Task not open");

    const kyc = await prisma.kYCVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== "VERIFIED") {
      return res.status(403).json({ error: "Must be KYC verified to apply for tasks" });
    }

    const existingApplication = await prisma.taskApplication.findUnique({
      where: {
        taskId_taskerId: { taskId: id, taskerId: userId }
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: "Already applied" });
    }

    const eligibility = await checkWorkerEligibility(userId, id);
    if (!eligibility.eligible) {
      if (eligibility.reason === "TRUST_SCORE_TOO_LOW") {
        return res.status(403).json({
          error: "ACCOUNT_RESTRICTED",
          message: "Your account is temporarily restricted from applying for new tasks because your trust score is below the minimum required level.",
          trustScore: eligibility.trustScore,
          minimumTrustScore: MIN_TRUST_SCORE
        });
      }
      return res.status(403).json({
        error: "Worker is not eligible for this task",
        reason: eligibility.reason,
        missingSkills: eligibility.missingSkills
      });
    }

    const application = await prisma.taskApplication.create({
      data: {
        taskId: id,
        taskerId: userId,
        message: req.body.message
      }
    });

    try {
      await prisma.notification.create({
        data: {
          userId: task.requesterId,
          type: "TASK_UPDATE",
          content: "A worker has applied for your task.",
          relatedEntityId: task.id
        }
      });
    } catch (e) {
      console.error("Failed to notify customer of task application", e);
    }

    res.status(201).json({ application });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 7. GET /api/tasks/:id/applications
router.get("/:id/applications", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    
    let whereClause: any = { taskId: id };
    if (task.requesterId !== userId) {
      whereClause.taskerId = userId;
    }

    const applications = await prisma.taskApplication.findMany({
      where: whereClause,
      include: {
        tasker: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { fullName: true, trustScore: true, avatarUrl: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }, { maxWait: 15000, timeout: 15000 });

    res.json({ applications });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 8. POST /api/tasks/:id/select-helper
import { lockFundsTx, releaseFundsTx, refundFundsTx, WalletError } from "../lib/wallet.js";

router.post("/:id/select-helper", authenticate, async (req: any, res: any) => {
  console.log("HIT select-helper with taskerId:", req.body.taskerId);
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { taskerId } = req.body;

    if (!taskerId) return res.status(400).json({ error: "Missing taskerId" });

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized" }); console.log("403 Unauthorized");
    if (task.status !== TaskStatus.OPEN) return res.status(400).json({ error: "Task is not open" }); console.log("400 Task not open");

    const application = await prisma.taskApplication.findUnique({
      where: {
        taskId_taskerId: { taskId: id, taskerId }
      }
    });

    if (!application) return res.status(400).json({ error: "Helper did not apply for this task" }); console.log("400 Helper did not apply");

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id, version: task.version },
        data: {
          taskerId,
          status: TaskStatus.ACCEPTED,
          version: { increment: 1 }
        }
      });

      const requesterWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!requesterWallet) throw new WalletError("Requester wallet not found");

      await lockFundsTx(tx, {
        walletId: requesterWallet.id,
        taskId: task.id,
        amount: Number(task.price),
        idempotencyKey: `lock_${task.id}`
      });

      // Automatically create a message thread if missing
      await tx.messageThread.upsert({
        where: {
          taskId: task.id
        },
        update: {},
        create: {
          taskId: task.id,
          requesterId: task.requesterId,
          taskerId: taskerId
        }
      });

      return updated;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await prisma.notification.create({
        data: {
          userId: taskerId,
          type: "TASK_UPDATE",
          content: "You have been selected for a service booking.",
          relatedEntityId: task.id
        }
      });
    } catch (e) {
      console.error("Failed to notify worker of selection", e);
    }

    res.json({ task: updatedTask });
  } catch (error: any) {
    if (error instanceof WalletError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error details: " + String(error.message || error) });
  }
});

// 9. POST /api/tasks/:id/start
router.post("/:id/start", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.taskerId !== userId) return res.status(403).json({ error: "Unauthorized. Only accepted helper can start." });
    if (task.status !== TaskStatus.ACCEPTED) return res.status(400).json({ error: "Task cannot be started from current status." });

    const updatedTask = await prisma.task.update({
      where: { id, version: task.version },
      data: {
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
        version: { increment: 1 }
      }
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await prisma.notification.create({
        data: {
          userId: task.requesterId,
          type: "TASK_UPDATE",
          content: "The worker has started your service booking.",
          relatedEntityId: task.id
        }
      });
    } catch (e) {
      console.error("Failed to notify customer of task start", e);
    }

    res.json({ task: updatedTask });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});


import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WEBP are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 10. POST /api/tasks/:id/submit-proof
router.post("/:id/submit-proof", authenticate, upload.single('evidence'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.taskerId !== userId) return res.status(403).json({ error: "Unauthorized. Only accepted helper can submit proof." });
    if (task.status !== TaskStatus.IN_PROGRESS) return res.status(400).json({ error: "Cannot submit proof from current status." });

    if (!req.file) {
      return res.status(400).json({ error: "No evidence file uploaded" });
    }

    const fileUrl = '/uploads/' + req.file.filename;

    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.mediaAttachment.create({
        data: {
          taskId: task.id,
          url: fileUrl,
          fileType: req.file.mimetype,
          uploadedBy: userId
        }
      });
      return await tx.task.update({
        where: { id, version: task.version },
        data: {
          status: TaskStatus.PROOF_SUBMITTED,
          version: { increment: 1 }
        }
      });
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await prisma.notification.create({
        data: {
          userId: task.requesterId,
          type: "TASK_UPDATE",
          content: "The worker has submitted proof for your booking.",
          relatedEntityId: task.id
        }
      });
    } catch (e) {
      console.error("Failed to notify customer of proof submission", e);
    }

    res.json({ task: updatedTask, fileUrl });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 11. POST /api/tasks/:id/approve
router.post("/:id/approve", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized. Only owner can approve." });
    if (task.status !== TaskStatus.PROOF_SUBMITTED) {
       return res.status(400).json({ error: "Task must have proof submitted to be approved." });
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id, version: task.version },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 }
        }
      });

      // Calculate fee
      const price = Number(task.price);
      const platformFee = price * 0.10;

      const taskerWallet = await tx.wallet.findUnique({ where: { userId: String(task.taskerId) } });
      if (!taskerWallet) throw new WalletError("Tasker wallet not found");

      await releaseFundsTx(tx, {
        taskId: task.id,
        taskerWalletId: taskerWallet.id,
        platformFee,
        idempotencyKey: `rel_${task.id}`
      });
      
      return updated;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, task.requesterId);
      if (task.taskerId) {
        await updateMetricsAndTrust(prisma, task.taskerId);
      }
    } catch (e) {
      console.error("Trust update failed in approve", e);
    }

    try {
      await prisma.notification.create({
        data: {
          userId: task.taskerId,
          type: "FUNDS_UPDATE",
          content: "The customer has approved completion and your funds have been released.",
          relatedEntityId: task.id
        }
      });
    } catch (e) {
      console.error("Failed to notify tasker of completion", e);
    }

    res.json({ task: updatedTask });
  } catch (error: any) {
    if (error instanceof WalletError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error details: " + error.message });
  }
});

// 12. POST /api/tasks/:id/review

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional()
});

router.post("/:id/review", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const parsed = reviewSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    if (task.status !== TaskStatus.COMPLETED) {
      return res.status(400).json({ error: "Task must be COMPLETED to leave a review." });
    }

    const isRequester = task.requesterId === userId;
    const isTasker = task.taskerId === userId;

    if (!isRequester && !isTasker) {
      return res.status(403).json({ error: "Unauthorized. Only participants can leave reviews." });
    }

    const revieweeId = isRequester ? task.taskerId : task.requesterId;
    const type = isRequester ? "TASKER" : "REQUESTER"; 

    // ensure no duplicate review
    const existingReview = await prisma.review.findUnique({
      where: {
        taskId_reviewerId_revieweeId: {
          taskId: task.id,
          reviewerId: userId,
          revieweeId: revieweeId as string
        }
      }
    });

    if (existingReview) {
       return res.status(400).json({ error: "You have already left a review for this task." });
    }

    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          taskId: task.id,
          reviewerId: userId,
          revieweeId: revieweeId as string,
          type,
          rating: parsed.rating,
          comment: parsed.comment
        }
      });
      
      return createdReview;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, revieweeId as string);
    } catch (e) {
      console.error("Trust update failed in review", e);
    }

    res.status(201).json({ review });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 13. POST /api/tasks/:id/dispute
const disputeSchema = z.object({
  reason: z.string().min(10)
});

router.post("/:id/dispute", authenticate, disputeLimiter, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = disputeSchema.parse(req.body);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");

    const allowedStatuses: TaskStatus[] = [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.PROOF_SUBMITTED, TaskStatus.COMPLETED];
    if (!allowedStatuses.includes(task.status)) {
       return res.status(400).json({ error: "Task cannot be disputed from current status." });
    }

    if (task.requesterId !== userId && task.taskerId !== userId) {
      return res.status(403).json({ error: "Unauthorized. Only requester or assigned tasker can open dispute." });
    }

    const existingDispute = await prisma.dispute.findUnique({
      where: { taskId: task.id }
    });

    if (existingDispute) {
       return res.status(400).json({ error: "A dispute already exists for this task." });
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      await tx.dispute.create({
        data: {
          taskId: task.id,
          raisedById: userId,
          reason,
          status: DisputeStatus.PENDING_REVIEW
        }
      });

      const escrowEntry = await tx.escrowEntry.findUnique({ where: { taskId: task.id } });
      if (escrowEntry && escrowEntry.status === "LOCKED") {
        await tx.escrowEntry.update({
          where: { id: escrowEntry.id, version: escrowEntry.version },
          data: { status: TaskStatus.DISPUTED, version: { increment: 1 } }
        });
      }

      const updated = await tx.task.update({
        where: { id: task.id, version: task.version },
        data: {
          status: TaskStatus.DISPUTED,
          version: { increment: 1 }
        },
        include: { dispute: true }
      });

      return updated;
    });

    try {
      const otherUserId = task.requesterId === userId ? task.taskerId : task.requesterId;
      if (otherUserId) {
        await prisma.notification.create({
          data: {
            userId: otherUserId,
            type: "DISPUTE_UPDATE",
            content: "A dispute has been opened for your booking.",
            relatedEntityId: task.id
          }
        });
      }
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: "DISPUTE_UPDATE",
            content: "A dispute has been opened.",
            relatedEntityId: task.id
          }
        });
      }
    } catch (e) {
      console.error("Failed to notify dispute updates", e);
    }

    res.status(201).json({ task: updatedTask });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error("SELECT HELPER 500 ERROR:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});


router.get("/:id/invoice", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requester: true,
        tasker: true,
        service: true,
        escrowEntry: {
          include: {
            transactions: {
              where: {
                status: "COMPLETED"
              }
            }
          }
        }
      }
    });

    if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");
    const platformRevenueRecord = await prisma.platformRevenue.findUnique({ where: { taskId: id } });
    task.platformRevenue = platformRevenueRecord;
    
    // Authorization: only requester, tasker, or admin
    if (task.requesterId !== userId && task.taskerId !== userId && req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Forbidden: Not authorized to view this invoice" });
    }

    if (task.status !== "COMPLETED" && task.status !== "CLOSED") {
      return res.status(400).json({ error: "Invoice unavailable because the required payment record has not been finalized." });
    }

    if (!task.escrowEntry) {
      return res.status(400).json({ error: "Invoice unavailable because the required payment record has not been finalized." });
    }

    // Find the release transaction
    const releaseTx = task.escrowEntry.transactions.find(tx => tx.type === "ESCROW_RELEASE");
    const refundTx = task.escrowEntry.transactions.find(tx => tx.type === "ESCROW_REFUND");
    
    if (!releaseTx && !refundTx) {
      return res.status(400).json({ error: "Invoice unavailable because the required payment record has not been finalized." });
    }

    const platformRevenue = task.platformRevenue?.amount ? Number(task.platformRevenue.amount) : 0;
    const workerPayout = releaseTx ? Number(releaseTx.amount) : 0;
    const grossAmount = Number(task.price);
    const refundAmount = refundTx ? Number(refundTx.amount) : 0;
    const totalAmount = grossAmount - refundAmount;
    
    let paymentStatus = "PAID";
    if (refundTx && releaseTx) paymentStatus = "PARTIALLY REFUNDED";
    else if (refundTx && !releaseTx) paymentStatus = "REFUNDED";

    const baseTx = releaseTx || refundTx;
    
    // Format response
    const invoice = {
      invoiceId: `INV-${baseTx.id.split('-')[0].toUpperCase()}`,
      issueDate: baseTx.createdAt,
      taskRef: task.id,
      serviceName: task.service?.name || task.title,
      description: task.title,
      completionDate: task.completedAt || baseTx.createdAt,
      customer: {
        name: task.requester?.name || "Customer",
        email: task.requester?.email || ""
      },
      worker: {
        name: task.tasker?.name || "Worker",
        email: task.tasker?.email || ""
      },
      financials: {
        currency: "INR",
        grossAmount: grossAmount,
        platformFee: platformRevenue,
        workerPayout: workerPayout,
        refundAmount: refundAmount,
        totalAmount: totalAmount,
        paymentStatus: paymentStatus,
      }
    };

    res.json(invoice);
  } catch (error) {
    console.error("Failed to generate invoice", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
