import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "./middleware/auth.js";

const router = Router();

// GET /api/services
router.get("/", async (req: any, res: any) => {
  try {
    const services = await prisma.service.findMany({
      where: {
        status: "ACTIVE" // Only expose active services publicly
      },
      include: {
        category: true,
        skills: true
      }
    });
    res.json({ services });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/services/:id
router.get("/:id", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const service = await prisma.service.findUnique({
      where: { id },
      include: { category: true, skills: true }
    });
    if (!service || service.status !== "ACTIVE") {
      return res.status(404).json({ error: "Service not found or inactive" });
    }
    res.json({ service });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const serviceSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  basePrice: z.number().positive().finite(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  skillIds: z.array(z.string().uuid()).optional()
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  basePrice: z.number().positive().finite().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  skillIds: z.array(z.string().uuid()).optional()
});

// Middleware for authorization
const authorizeAdmin = async (req: any, res: any, next: any) => {
  try {
    const { role } = req.user;
    if (role === "PLATFORM_ADMIN" || role === "ADMIN" || role === "FEDERATION_ADMIN") {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: Only admins can manage services" });
  } catch (e) {
    res.status(500).json({ error: "Internal server error" });
  }
};

router.post("/", authenticate, authorizeAdmin, async (req: any, res: any) => {
  try {
    const data = serviceSchema.parse(req.body);
    
    const category = await prisma.serviceCategory.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    // Check federation admin access
    const { role, userId } = req.user;
    if (role !== "PLATFORM_ADMIN" && role !== "ADMIN") {
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
    }

    const serviceData: any = {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      status: data.status || "ACTIVE",
    };

    if (data.skillIds && data.skillIds.length > 0) {
      serviceData.skills = {
        connect: data.skillIds.map((id) => ({ id }))
      };
    }

    const service = await prisma.service.create({
      data: serviceData,
      include: { skills: true }
    });
    res.status(201).json({ service });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

const authorizeExistingServiceAdmin = async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;
    
    const service = await prisma.service.findUnique({ 
      where: { id },
      include: { category: true }
    });
    if (!service) return res.status(404).json({ error: "Service not found" });
    
    req.serviceRecord = service; // pass to next

    if (role === "PLATFORM_ADMIN" || role === "ADMIN") {
      return next();
    }
    
    if (role === "FEDERATION_ADMIN") {
      const membership = await prisma.federationMembership.findFirst({
        where: {
          userId,
          federationId: service.category.federationId,
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

router.put("/:id", authenticate, authorizeExistingServiceAdmin, async (req: any, res: any) => {
  try {
    const data = updateServiceSchema.parse(req.body);
    
    const updateData: any = {
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      status: data.status
    };

    if (data.skillIds) {
      updateData.skills = {
        set: data.skillIds.map((id) => ({ id }))
      };
    }

    const service = await prisma.service.update({
      where: { id: req.serviceRecord.id },
      data: updateData,
      include: { skills: true }
    });
    res.json({ service });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authenticate, authorizeExistingServiceAdmin, async (req: any, res: any) => {
  try {
    const data = updateServiceSchema.parse(req.body);
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.skillIds !== undefined) {
      updateData.skills = {
        set: data.skillIds.map((id) => ({ id }))
      };
    }

    const service = await prisma.service.update({
      where: { id: req.serviceRecord.id },
      data: updateData,
      include: { skills: true }
    });
    res.json({ service });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticate, authorizeExistingServiceAdmin, async (req: any, res: any) => {
  try {
    await prisma.service.delete({
      where: { id: req.serviceRecord.id }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
