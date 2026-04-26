import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, jobsTable, providersTable, bidsTable, usersTable, skillsTable, walletTransactionsTable, walletsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();
type AuthRequest = typeof import("express").request & { user: { id: number; role: string; name: string } };

router.get("/dashboard/customer", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.customerId, user.id)).orderBy(desc(jobsTable.createdAt));
  const recent = jobs.slice(0, 5);
  const recentWithDetails = await Promise.all(recent.map(async (job) => {
    const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
    const bids = await db.select().from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return {
      ...job,
      customerName: user.name,
      providerName: null,
      providerId: job.providerId ?? null,
      scheduledAt: job.scheduledAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      skill: skill ?? { id: 0, name: "Unknown", category: "Other", icon: "🔧", description: null },
      bidCount: bids.length,
    };
  }));
  const completed = jobs.filter((j) => j.status === "completed");
  const totalSpent = completed.reduce((acc, j) => acc + j.budget * 1.1, 0);
  res.json({
    totalJobsPosted: jobs.length,
    openJobs: jobs.filter((j) => j.status === "open").length,
    completedJobs: completed.length,
    cancelledJobs: jobs.filter((j) => j.status === "cancelled").length,
    totalSpent,
    averageJobCost: completed.length ? totalSpent / completed.length : 0,
    recentJobs: recentWithDetails,
  });
});

router.get("/dashboard/provider", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const activeJobs = await db.select().from(jobsTable).where(and(eq(jobsTable.providerId, provider.id)));
  const active = activeJobs.filter((j) => ["assigned", "in_progress"].includes(j.status));
  const recentRaw = activeJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  const recent = await Promise.all(recentRaw.map(async (job) => {
    const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
    return { ...job, customerName: "Customer", providerName: user.name, providerId: job.providerId ?? null, scheduledAt: null, completedAt: null, skill: skill ?? { id: 0, name: "Unknown", category: "Other", icon: "🔧", description: null }, bidCount: 0 };
  }));
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayJobs = activeJobs.filter((j) => j.status === "completed" && j.completedAt && j.completedAt >= todayStart);
  const pendingBids = await db.select().from(bidsTable).where(and(eq(bidsTable.providerId, provider.id), eq(bidsTable.status, "pending")));
  res.json({
    isOnline: provider.isOnline,
    totalEarnings: provider.totalEarnings,
    todayEarnings: todayJobs.reduce((acc, j) => acc + j.providerAmount, 0),
    completedJobs: provider.totalJobs,
    activeJobs: active.length,
    rating: provider.rating,
    pendingBids: pendingBids.length,
    recentJobs: recent,
  });
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const recentJobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt)).limit(20);
  const activities = await Promise.all(recentJobs.map(async (job, idx) => {
    const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
    let type: string;
    let message: string;
    if (job.status === "completed") { type = "job_completed"; message = `A ${skill?.name ?? "service"} job was completed`; }
    else if (job.status === "assigned") { type = "job_accepted"; message = `A provider accepted a ${skill?.name ?? "service"} request`; }
    else { type = "job_posted"; message = `New ${skill?.name ?? "service"} request posted`; }
    return { id: idx + 1, type, message, timestamp: job.createdAt.toISOString(), jobId: job.id, skillName: skill?.name ?? null };
  }));
  res.json(activities);
});

export default router;
