import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "./middleware/auth.js";

const router = Router();

// GET /api/categories
router.get("/", async (req: any, res: any) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      include: {
        federation: true
      }
    });
    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/categories/:id
router.get("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: { federation: true, services: true }
    });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ category });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const categorySchema = z.object({
  federationId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional()
});

// Middleware for authorization
const authorizeAdmin = async (req: any, res: any, next: any) => {
  try {
    const { role, userId } = req.user;
    if (role === "PLATFORM_ADMIN" || role === "ADMIN") {
      return next();
    }
    if (role === "FEDERATION_ADMIN") {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: Only admins can manage categories" });
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/", authenticate, authorizeAdmin, async (req: any, res: any) => {
  try {
    const data = categorySchema.parse(req.body);
    
    // Check federation admin access
    const { role, userId } = req.user;
    if (role !== "PLATFORM_ADMIN" && role !== "ADMIN") {
      const membership = await prisma.federationMembership.findFirst({
        where: {
          userId,
          federationId: data.federationId,
          role: "ADMIN",
          status: "ACTIVE"
        }
      });
      if (!membership) {
        return res.status(403).json({ error: "Forbidden: Not an active admin for this federation" });
      }
    }

    const category = await prisma.serviceCategory.create({
      data: {
        federationId: data.federationId,
        name: data.name,
        description: data.description
      }
    });
    res.status(201).json({ category });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

const authorizeExistingCategoryAdmin = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;
    
    const category = await prisma.serviceCategory.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ error: "Category not found" });
    
    req.category = category; // pass to next

    if (role === "PLATFORM_ADMIN" || role === "ADMIN") {
      return next();
    }
    
    if (role === "FEDERATION_ADMIN") {
      const membership = await prisma.federationMembership.findFirst({
        where: {
          userId,
          federationId: category.federationId,
          role: "ADMIN",
          status: "ACTIVE"
        }
      });
      if (!membership) {
        return res.status(403).json({ error: "Forbidden: Not an active admin for this federation" });
      }
      return next();
    }
    
    return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.put("/:id", authenticate, authorizeExistingCategoryAdmin, async (req: any, res: any) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.serviceCategory.update({
      where: { id: req.category.id },
      data: {
        name: data.name,
        description: data.description
      }
    });
    res.json({ category });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authenticate, authorizeExistingCategoryAdmin, async (req: any, res: any) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await prisma.serviceCategory.update({
      where: { id: req.category.id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        description: data.description !== undefined ? data.description : undefined
      }
    });
    res.json({ category });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, authorizeExistingCategoryAdmin, async (req: any, res: any) => {
  try {
    await prisma.serviceCategory.delete({
      where: { id: req.category.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
