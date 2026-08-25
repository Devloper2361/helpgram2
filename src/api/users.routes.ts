import { Router } from "express";
import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

const router = Router();


// GET /api/users/:id/reviews
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    
    const reviews = await prisma.review.findMany({
      where: { revieweeId: id },
      include: {
        reviewer: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatarUrl: true } }
          }
        },
        task: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const userMetrics = await prisma.userMetrics.findFirst({
      where: { profile: { userId: id } }
    });

    res.json({
      reviews,
      ratingSummary: {
        avgTasker: userMetrics?.avgRatingAsTasker || 0,
        avgRequester: userMetrics?.avgRatingAsRequester || 0,
        total: reviews.length
      }
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/users/:id/trust
router.get("/:id/trust", async (req, res) => {
  try {
    const { id } = req.params;
    
    const profile = await prisma.profile.findUnique({
      where: { userId: id }
    });

    const userMetrics = await prisma.userMetrics.findFirst({
      where: { profile: { userId: id } }
    });

    if (!profile) return res.status(404).json({ error: "User not found" });

    const totalTasks = (userMetrics?.tasksCompleted || 0) + (userMetrics?.tasksCancelled || 0);
    const completionRate = totalTasks > 0 ? ((userMetrics?.tasksCompleted || 0) / totalTasks) : 0;
    
    // Average rating
    let avgRating = 0;
    const asRequester = Number(userMetrics?.avgRatingAsRequester || 0);
    const asTasker = Number(userMetrics?.avgRatingAsTasker || 0);

    if (asRequester > 0 && asTasker > 0) {
      avgRating = (asRequester + asTasker) / 2;
    } else if (asTasker > 0) {
      avgRating = asTasker;
    } else if (asRequester > 0) {
      avgRating = asRequester;
    }

    res.json({
      trustScore: profile.trustScore,
      completionRate,
      tasksCompleted: userMetrics?.tasksCompleted || 0,
      tasksCancelled: userMetrics?.tasksCancelled || 0,
      avgRating,
      totalEarnings: userMetrics?.totalEarned || 0,
      totalSpending: userMetrics?.totalSpent || 0
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
