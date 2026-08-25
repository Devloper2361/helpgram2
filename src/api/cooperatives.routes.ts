import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "./middleware/auth.js";

const router = Router();

// GET /api/cooperatives
router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const federations = await prisma.cooperativeFederation.findMany();
    res.json({ federations });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cooperatives/:id
router.get("/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const federation = await prisma.cooperativeFederation.findUnique({
      where: { id },
      include: { societies: true }
    });
    if (!federation) return res.status(404).json({ error: "Not found" });
    res.json({ federation });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
