import { PrismaClient } from "@prisma/client";


export async function updateMetricsAndTrust(tx: any, userId: string) {
  const profile = await tx.profile.findUnique({ where: { userId } });
  if (!profile) return;

  // Compute metrics concurrently
  const [
    completedAsRequester,
    completedAsTasker,
    cancelledAsRequester,
    cancelledAsTasker,
    spentResult,
    earnedResult,
    ratingsAsTaskerResult,
    ratingsAsRequesterResult,
    totalReviews,
    disputesLost
  ] = await Promise.all([
    tx.task.count({ where: { requesterId: userId, status: "COMPLETED" } }),
    tx.task.count({ where: { taskerId: userId, status: "COMPLETED" } }),
    tx.task.count({ where: { requesterId: userId, status: "CANCELLED" } }),
    tx.task.count({ where: { taskerId: userId, status: "CANCELLED" } }),
    tx.task.aggregate({ _sum: { price: true }, where: { requesterId: userId, status: "COMPLETED" } }),
    tx.task.aggregate({ _sum: { price: true }, where: { taskerId: userId, status: "COMPLETED" } }),
    tx.review.aggregate({ _avg: { rating: true }, where: { revieweeId: userId, type: "TASKER" } }),
    tx.review.aggregate({ _avg: { rating: true }, where: { revieweeId: userId, type: "REQUESTER" } }),
    tx.review.count({ where: { revieweeId: userId } }),
    tx.dispute.count({
      where: {
        task: { OR: [{ requesterId: userId }, { taskerId: userId }] },
        status: { in: ["RESOLVED_REFUND", "RESOLVED_PAYOUT"] }
      }
    })
  ]);

  const tasksCompleted = completedAsRequester + completedAsTasker;
  const tasksCancelled = cancelledAsRequester + cancelledAsTasker;

  const totalSpent = Number(spentResult._sum.price || 0);

  // For earnings, you might want to look at price - platform fee, 
  // but let's approximate earnings as 90% of task price if fee is 10%
  const grossEarned = Number(earnedResult._sum.price || 0);
  const totalEarned = grossEarned * 0.90;

  // Ratings
  const avgRatingAsTasker = Number(ratingsAsTaskerResult._avg.rating || 0);
  const avgRatingAsRequester = Number(ratingsAsRequesterResult._avg.rating || 0);

  let metrics = await tx.userMetrics.findUnique({ where: { profileId: profile.id } });
  if (metrics) {
    metrics = await tx.userMetrics.update({
      where: { profileId: profile.id },
      data: {
        tasksCompleted,
        tasksCancelled,
        totalEarned,
        totalSpent,
        avgRatingAsTasker,
        avgRatingAsRequester
      }
    });
  } else {
    metrics = await tx.userMetrics.create({
      data: {
        profileId: profile.id,
        tasksCompleted,
        tasksCancelled,
        totalEarned,
        totalSpent,
        avgRatingAsTasker,
        avgRatingAsRequester
      }
    });
  }

  // Next, Recalculate trust
  let score = 50; // Base score

  // 1. Verification
  if (profile.isVerified) {
    score += 10;
  }

  // 2. Task Completion Rate
  const totalTasks = metrics.tasksCompleted + metrics.tasksCancelled;
  let completionRate = 0;
  if (totalTasks > 0) {
    completionRate = metrics.tasksCompleted / totalTasks;
    score += (completionRate * 20); // up to +20 points for 100% completion
    
    // Cancellation penalty 
    const cancellationRate = metrics.tasksCancelled / totalTasks;
    if (cancellationRate > 0.2) {
      score -= (cancellationRate * 20);
    }
  }

  // 3. Ratings
  const avgTasker = Number(metrics.avgRatingAsTasker);
  const avgRequester = Number(metrics.avgRatingAsRequester);

  let combinedRating = 0;
  if (avgTasker > 0 && avgRequester > 0) {
    combinedRating = (avgTasker + avgRequester) / 2;
  } else if (avgTasker > 0) {
    combinedRating = avgTasker;
  } else if (avgRequester > 0) {
    combinedRating = avgRequester;
  }

  if (combinedRating > 0 && totalReviews > 0) {
    const ratingImpact = (combinedRating - 3) * 10; // -20 to +20
    score += ratingImpact;

    if (totalReviews >= 5) score += 2;
    if (totalReviews > 10) score += 3;
    if (totalReviews > 50) score += 5;
  }

  // 4. Disputes
  if (disputesLost > 0) {
    score -= (disputesLost * 5);
  }

  score = Math.max(0, Math.min(100, score));

  await tx.profile.update({
    where: { id: profile.id },
    data: { trustScore: score }
  });

  return score;
}
