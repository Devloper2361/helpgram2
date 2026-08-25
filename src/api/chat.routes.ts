import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { authorizeChatAccess, ChatAuthError } from "../lib/chatAuth.js";
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

// 1. GET /api/chat/threads
router.get("/threads", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const threads = await prisma.messageThread.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { taskerId: userId }
        ]
      },
      orderBy: { updatedAt: "desc" },
      include: {
        task: { select: { title: true, status: true } },
        requester: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        tasker: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const threadDetails = await Promise.all(threads.map(async (thread) => {
      const unreadCount = await prisma.message.count({
        where: {
          threadId: thread.id,
          senderId: { not: userId },
          isRead: false
        }
      });

      return {
        ...thread,
        unreadCount
      };
    }));

    res.json({ threads: threadDetails });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /api/chat/:taskId
router.get("/:taskId", authenticate, async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const { page = "1", limit = "50" } = req.query;
    
    // Authorize explicitly
    const authCtx = await authorizeChatAccess(taskId, userId);
    const thread = authCtx.thread;

    if (!thread) {
       return res.json({ thread: null, messages: [], total: 0 });
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } }
      }
    });

    const total = await prisma.message.count({ where: { threadId: thread.id } });

    res.json({ 
      thread, 
      messages: messages.reverse(), // Reverse to get chronological order for chat UI
      total, 
      page: pageNum, 
      limit: take 
    });

  } catch (error: any) {
    if (error instanceof ChatAuthError) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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

// 3.5 POST /api/chat/:taskId/image
router.post("/:taskId/image", authenticate, upload.single('image'), async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const authCtx = await authorizeChatAccess(taskId, userId);
    if (!authCtx.thread) {
       return res.status(400).json({ error: "Message thread not initialized for task." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const fileUrl = '/uploads/' + req.file.filename;

    const message = await prisma.$transaction(async (tx) => {
      const attachment = await tx.mediaAttachment.create({
        data: {
          taskId,
          url: fileUrl,
          fileType: req.file.mimetype,
          uploadedBy: userId,
        }
      });

      const msg = await tx.message.create({
        data: {
          threadId: authCtx.thread!.id,
          senderId: userId,
          content: fileUrl,
          type: MessageType.IMAGE,
          isRead: false
        },
        include: {
           sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } }
        }
      });

      await tx.messageThread.update({
        where: { id: authCtx.thread!.id },
        data: { updatedAt: new Date() }
      });

      return msg;
    });

    res.status(201).json({ message, fileUrl });
  } catch (error: any) {
    if (error instanceof ChatAuthError) return res.status(error.statusCode).json({ error: error.message });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
const messageSchema = z.object({
  content: z.string().trim().min(1),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT)
});

router.post("/:taskId", authenticate, async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const parsed = messageSchema.parse(req.body);

    const authCtx = await authorizeChatAccess(taskId, userId);
    if (!authCtx.thread) {
       return res.status(400).json({ error: "Message thread not initialized for task." });
    }

    const message = await prisma.$transaction(async (tx) => {
      let contentUrl = parsed.content;

      // If it's an image, we can optionally register it in MediaAttachments for the task
      if (parsed.type === MessageType.IMAGE) {
         const attachment = await tx.mediaAttachment.create({
           data: {
             taskId,
             url: contentUrl,
             fileType: "image",
             uploadedBy: userId,
           }
         });
         // Can optionally append the ID or just let the URL serve as content
      }

      const msg = await tx.message.create({
        data: {
          threadId: authCtx.thread!.id,
          senderId: userId,
          content: contentUrl,
          type: parsed.type,
          isRead: false
        },
        include: {
           sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } }
        }
      });

      await tx.messageThread.update({
        where: { id: authCtx.thread!.id },
        data: { updatedAt: new Date() }
      });

      return msg;
    });

    res.status(201).json({ message });

  } catch (error: any) {
    if (error instanceof ChatAuthError) return res.status(error.statusCode).json({ error: error.message });
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. PUT /api/chat/messages/:id/read
router.put("/messages/:id/read", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const message = await prisma.message.findUnique({
      where: { id },
      include: { thread: true }
    });

    if (!message) return res.status(404).json({ error: "Message not found" });

    // Validate if the user is part of the thread and not the sender
    if (message.senderId === userId) {
      return res.status(400).json({ error: "Cannot mark own message as read" });
    }
    
    if (message.thread.requesterId !== userId && message.thread.taskerId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({ message: updatedMessage });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
