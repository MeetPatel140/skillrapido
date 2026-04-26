import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usersTable, jobsTable, skillsTable, bidsTable, providersTable, providerSkillsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { broadcastToProviders, broadcastToUser, getOnlineProviderIds } from "../lib/ws";
import { haversineKm } from "../lib/geo";
import { logger } from "../lib/logger";

const router = Router();
type AuthRequest = typeof import("express").request & { user: { id: number; role: string; name: string; latitude: number | null; longitude: number | null } };

const COMMISSION_RATE = 0.10;
const NEARBY_KM = 10;
const PHASE1_DURATION_MS = 5 * 60 * 1000;

async function buildJobResponse(job: typeof jobsTable.$inferSelect) {
  const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));
  const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
  const bids = await db.select().from(bidsTable).where(eq(bidsTable.jobId, job.id));
  let providerName: string | null = null;
  if (job.providerId) {
    const [prov] = await db.select().from(providersTable).where(eq(providersTable.id, job.providerId));
    if (prov) {
      const [provUser] = await db.select().from(usersTable).where(eq(usersTable.id, prov.userId));
      providerName = provUser?.name ?? null;
    }
  }
  return {
    ...job,
    customerName: customer?.name ?? "Unknown",
    providerName,
    providerId: job.providerId ?? null,
    scheduledAt: job.scheduledAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    skill: skill ?? { id: 0, name: "Unknown", category: "Other", icon: "🔧", description: null },
    bidCount: bids.length,
  };
}

async function broadcastJobToProviders(job: typeof jobsTable.$inferSelect, phase: number) {
  const skill = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
  const onlineIds = getOnlineProviderIds();
  const providerUsers = await Promise.all(
    onlineIds.map(async (userId) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user) return null;
      const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, userId));
      if (!provider || !provider.isOnline) return null;
      const provSkills = await db.select().from(providerSkillsTable).where(eq(providerSkillsTable.providerId, provider.id));
      return { userId, provider, user, skillIds: provSkills.map((s) => s.skillId) };
    })
  );
  const valid = providerUsers.filter(Boolean) as NonNullable<(typeof providerUsers)[0]>[];

  let targets: number[] = [];
  if (phase === 1) {
    targets = valid
      .filter((p) => {
        const dist = p.user.latitude && p.user.longitude && job.latitude && job.longitude
          ? haversineKm(p.user.latitude, p.user.longitude, job.latitude, job.longitude)
          : 999;
        return dist <= NEARBY_KM && p.skillIds.includes(job.skillId);
      })
      .map((p) => p.userId);
  } else {
    targets = valid
      .filter((p) => {
        const dist = p.user.latitude && p.user.longitude && job.latitude && job.longitude
          ? haversineKm(p.user.latitude, p.user.longitude, job.latitude, job.longitude)
          : 999;
        return dist <= NEARBY_KM * 2;
      })
      .map((p) => p.userId);
  }

  const payload = {
    type: "job_broadcast",
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      budget: job.budget,
      commission: job.commission,
      providerAmount: job.providerAmount,
      address: job.address,
      latitude: job.latitude,
      longitude: job.longitude,
      skillName: skill[0]?.name ?? "Service",
      skillCategory: skill[0]?.category ?? "",
      skillIcon: skill[0]?.icon ?? "🔧",
      phase,
      expiresAt: Date.now() + PHASE1_DURATION_MS,
    },
  };
  const sent = broadcastToProviders(targets, payload);
  logger.info({ jobId: job.id, phase, targets: targets.length, sent }, "Job broadcast sent");
  return sent;
}

// Schedule phase 2 after 5 minutes if no provider accepted
function schedulePhase2(jobId: number) {
  setTimeout(async () => {
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
    if (!job || job.status !== "open") return;
    await db.update(jobsTable).set({ broadcastPhase: 2 }).where(eq(jobsTable.id, jobId));
    await broadcastJobToProviders(job, 2);
  }, PHASE1_DURATION_MS);
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { status } = req.query;
  let jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.customerId, user.id))
    .orderBy(desc(jobsTable.createdAt));
  if (status && status !== "all") {
    jobs = jobs.filter((j) => j.status === status);
  }
  const result = await Promise.all(jobs.map(buildJobResponse));
  res.json(result);
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { title, description, skillId, budget, address, latitude, longitude, scheduledAt } = req.body;
  if (!title || !description || !skillId || !budget || !address || latitude == null || longitude == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const totalCharge = budget * (1 + COMMISSION_RATE);
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.balance < totalCharge) {
    res.status(400).json({ error: `Insufficient wallet balance. Need ₹${totalCharge.toFixed(2)} (job ₹${budget} + 10% commission ₹${(budget * 0.1).toFixed(2)})` });
    return;
  }
  const commission = budget * COMMISSION_RATE;
  const providerAmount = budget - commission;
  const [job] = await db.insert(jobsTable).values({
    title, description, skillId, budget, commission, providerAmount,
    address, latitude, longitude,
    customerId: user.id,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    broadcastStartedAt: new Date(),
    broadcastPhase: 1,
    status: "open",
  }).returning();

  // Hold full amount (budget + commission) in escrow immediately
  await db.update(walletsTable).set({
    balance: wallet.balance - totalCharge,
    escrowBalance: wallet.escrowBalance + totalCharge,
  }).where(eq(walletsTable.id, wallet.id));
  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id,
    type: "escrow_hold",
    amount: totalCharge,
    description: `Escrow hold for job: ${title}`,
    jobId: job.id,
  });

  await broadcastJobToProviders(job, 1);
  schedulePhase2(job.id);

  const response = await buildJobResponse(job);
  res.status(201).json(response);
});

// Customer updates an open job (only before any provider accepts)
router.put("/jobs/:jobId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.customerId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (job.status !== "open" || job.providerId !== null) {
    res.status(400).json({ error: "Job cannot be edited — a provider has already accepted it or the job is no longer open." });
    return;
  }

  const { title, description, address, latitude, longitude, budget, skillId } = req.body;
  const updates: Record<string, unknown> = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (address) updates.address = address;
  if (latitude != null) updates.latitude = latitude;
  if (longitude != null) updates.longitude = longitude;
  if (skillId) updates.skillId = skillId;

  // Handle budget change → re-calculate escrow
  if (budget !== undefined) {
    const newBudget = parseFloat(String(budget));
    const oldTotalCharge = job.budget * (1 + COMMISSION_RATE);
    const newTotalCharge = newBudget * (1 + COMMISSION_RATE);
    const diff = newTotalCharge - oldTotalCharge;

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
    if (diff > 0 && (!wallet || wallet.balance < diff)) {
      res.status(400).json({ error: `Insufficient balance for budget increase. Need ₹${diff.toFixed(2)} more.` });
      return;
    }
    updates.budget = newBudget;
    updates.commission = newBudget * COMMISSION_RATE;
    updates.providerAmount = newBudget - newBudget * COMMISSION_RATE;

    if (wallet && diff !== 0) {
      await db.update(walletsTable).set({
        balance: wallet.balance - diff,
        escrowBalance: wallet.escrowBalance + diff,
      }).where(eq(walletsTable.id, wallet.id));
      await db.insert(walletTransactionsTable).values({
        walletId: wallet.id,
        type: diff > 0 ? "escrow_hold" : "escrow_release",
        amount: Math.abs(diff),
        description: `Budget adjustment for job: ${title ?? job.title}`,
        jobId,
      });
    }
  }

  await db.update(jobsTable).set(updates).where(eq(jobsTable.id, jobId));

  // Re-broadcast with updated details
  const [updatedJob] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (updatedJob) await broadcastJobToProviders(updatedJob, updatedJob.broadcastPhase ?? 1);

  const response = await buildJobResponse(updatedJob ?? { ...job, ...updates } as typeof jobsTable.$inferSelect);
  res.json(response);
});

router.get("/jobs/:jobId", requireAuth, async (req, res): Promise<void> => {
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const jobData = await buildJobResponse(job);
  const bidsRaw = await db.select().from(bidsTable).where(eq(bidsTable.jobId, jobId)).orderBy(desc(bidsTable.createdAt));
  const bids = await Promise.all(bidsRaw.map(async (bid) => {
    const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, bid.providerId));
    const [pUser] = provider ? await db.select().from(usersTable).where(eq(usersTable.id, provider.userId)) : [null];
    return {
      ...bid,
      providerName: pUser?.name ?? "Unknown",
      providerRating: provider?.rating ?? null,
      providerTotalJobs: provider?.totalJobs ?? 0,
    };
  }));
  res.json({ ...jobData, bids });
});

router.post("/jobs/:jobId/cancel", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.customerId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (!["open", "assigned"].includes(job.status)) {
    res.status(400).json({ error: "Cannot cancel job in current status" });
    return;
  }
  await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, jobId));
  // Release escrow back to customer
  const totalCharge = job.budget * (1 + COMMISSION_RATE);
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (wallet) {
    await db.update(walletsTable).set({
      balance: wallet.balance + totalCharge,
      escrowBalance: Math.max(0, wallet.escrowBalance - totalCharge),
    }).where(eq(walletsTable.id, wallet.id));
    await db.insert(walletTransactionsTable).values({
      walletId: wallet.id,
      type: "escrow_release",
      amount: totalCharge,
      description: `Refund for cancelled job: ${job.title}`,
      jobId: job.id,
    });
  }
  // Notify provider if assigned
  if (job.providerId) {
    const [prov] = await db.select().from(providersTable).where(eq(providersTable.id, job.providerId));
    if (prov) broadcastToUser(prov.userId, { type: "job_cancelled", jobId });
  }
  const updated = await buildJobResponse({ ...job, status: "cancelled" });
  res.json(updated);
});

router.post("/jobs/:jobId/complete", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.customerId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (!["assigned", "in_progress"].includes(job.status)) {
    res.status(400).json({ error: "Job is not active" });
    return;
  }
  if (!job.providerId) {
    res.status(400).json({ error: "No provider assigned" });
    return;
  }
  await db.update(jobsTable).set({ status: "completed", completedAt: new Date() }).where(eq(jobsTable.id, jobId));
  const totalCharge = job.budget * (1 + COMMISSION_RATE);
  // Release escrow from customer wallet
  const [custWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (custWallet) {
    await db.update(walletsTable).set({
      escrowBalance: Math.max(0, custWallet.escrowBalance - totalCharge),
    }).where(eq(walletsTable.id, custWallet.id));
    await db.insert(walletTransactionsTable).values({
      walletId: custWallet.id,
      type: "debit",
      amount: totalCharge,
      description: `Payment for job: ${job.title}`,
      jobId,
    });
  }
  // Pay provider
  const [prov] = await db.select().from(providersTable).where(eq(providersTable.id, job.providerId));
  if (prov) {
    const [provWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, prov.userId));
    if (provWallet) {
      await db.update(walletsTable).set({ balance: provWallet.balance + job.providerAmount }).where(eq(walletsTable.id, provWallet.id));
      await db.insert(walletTransactionsTable).values({
        walletId: provWallet.id,
        type: "credit",
        amount: job.providerAmount,
        description: `Earnings from job: ${job.title}`,
        jobId,
      });
    }
    await db.update(providersTable).set({
      totalJobs: prov.totalJobs + 1,
      totalEarnings: prov.totalEarnings + job.providerAmount,
    }).where(eq(providersTable.id, prov.id));
    broadcastToUser(prov.userId, { type: "job_completed", jobId, amount: job.providerAmount });
  }
  const updated = await buildJobResponse({ ...job, status: "completed", completedAt: new Date() });
  res.json({ job: updated, customerCharged: totalCharge, providerPaid: job.providerAmount, appCommission: job.commission });
});

// Get bids on a job
router.get("/jobs/:jobId/bids", requireAuth, async (req, res): Promise<void> => {
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const bidsRaw = await db.select().from(bidsTable).where(eq(bidsTable.jobId, jobId)).orderBy(desc(bidsTable.createdAt));
  const bids = await Promise.all(bidsRaw.map(async (bid) => {
    const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, bid.providerId));
    const [pUser] = provider ? await db.select().from(usersTable).where(eq(usersTable.id, provider.userId)) : [null];
    return {
      ...bid,
      providerName: pUser?.name ?? "Unknown",
      providerRating: provider?.rating ?? null,
      providerTotalJobs: provider?.totalJobs ?? 0,
    };
  }));
  res.json(bids);
});

// Provider accepts a job (places bid)
router.post("/jobs/:jobId/bids", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  if (user.role !== "provider") {
    res.status(403).json({ error: "Only providers can accept jobs" });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.status !== "open") {
    res.status(409).json({ error: "Job is no longer available" });
    return;
  }
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Provider profile not found" });
    return;
  }
  const [existing] = await db.select().from(bidsTable).where(and(eq(bidsTable.jobId, jobId), eq(bidsTable.providerId, provider.id)));
  if (existing) {
    res.status(409).json({ error: "Already bid on this job" });
    return;
  }
  const { message } = req.body;
  const [bid] = await db.insert(bidsTable).values({ jobId, providerId: provider.id, message: message || null, status: "pending" }).returning();
  // Assign job to first provider who accepts
  await db.update(jobsTable).set({ status: "assigned", providerId: provider.id }).where(eq(jobsTable.id, jobId));
  // Notify customer
  broadcastToUser(job.customerId, { type: "job_accepted", jobId, providerName: user.name, bidId: bid.id });
  // Broadcast job_taken to other providers
  broadcastToProviders([], { type: "job_taken", jobId });
  res.status(201).json({ ...bid, providerName: user.name, providerRating: provider.rating, providerTotalJobs: provider.totalJobs });
});

// Customer selects a bid
router.post("/jobs/:jobId/bids/:bidId/accept", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const jobId = parseInt(Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId, 10);
  const bidId = parseInt(Array.isArray(req.params.bidId) ? req.params.bidId[0] : req.params.bidId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.customerId !== user.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId));
  if (!bid || bid.jobId !== jobId) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }
  await db.update(jobsTable).set({ status: "assigned", providerId: bid.providerId }).where(eq(jobsTable.id, jobId));
  await db.update(bidsTable).set({ status: "accepted" }).where(eq(bidsTable.id, bidId));
  await db.update(bidsTable).set({ status: "rejected" }).where(and(eq(bidsTable.jobId, jobId)));
  const [prov] = await db.select().from(providersTable).where(eq(providersTable.id, bid.providerId));
  if (prov) broadcastToUser(prov.userId, { type: "bid_selected", jobId, bidId });
  const updated = await buildJobResponse({ ...job, status: "assigned", providerId: bid.providerId });
  res.json(updated);
});

export default router;
