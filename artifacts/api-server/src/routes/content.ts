import { Router } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db, announcementsTable, auditLogsTable, couponsTable, disputesTable, reviewsTable, usersTable, jobsTable, providersTable } from "@workspace/db";
import { requireAdmin, requireAuth } from "../lib/auth";

const router = Router();
type AR = typeof import("express").request & { user: { id: number; role: string; name: string } };
const rA = requireAdmin as import("express").RequestHandler;

// ─── Announcements (public read, admin write) ───────────────────────────────

router.get("/announcements", async (req, res): Promise<void> => {
  const { role } = req.query as Record<string, string>;
  let rows = await db.select().from(announcementsTable)
    .where(eq(announcementsTable.isActive, true))
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  if (role && role !== "all") {
    rows = rows.filter((a) => a.targetRole === "all" || a.targetRole === role);
  }
  const now = new Date();
  rows = rows.filter((a) => !a.expiresAt || a.expiresAt > now);
  res.json(rows);
});

router.get("/admin/announcements", rA, async (_req, res): Promise<void> => {
  const rows = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
  res.json(rows);
});

router.post("/admin/announcements", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { title, body, type, targetRole, isPinned, expiresAt } = req.body;
  if (!title || !body) { res.status(400).json({ error: "Title and body required" }); return; }
  const [row] = await db.insert(announcementsTable).values({
    title, body,
    type: type || "info",
    targetRole: targetRole || "all",
    isPinned: !!isPinned,
    isActive: true,
    createdBy: user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  await logAudit(db, user.id, "create_announcement", "announcement", row.id, `Created: "${title}"`);
  res.status(201).json(row);
});

router.put("/admin/announcements/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const { title, body, type, targetRole, isActive, isPinned, expiresAt } = req.body;
  const [row] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(announcementsTable).set({
    title: title ?? row.title,
    body: body ?? row.body,
    type: type ?? row.type,
    targetRole: targetRole ?? row.targetRole,
    isActive: isActive !== undefined ? !!isActive : row.isActive,
    isPinned: isPinned !== undefined ? !!isPinned : row.isPinned,
    expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : row.expiresAt,
  }).where(eq(announcementsTable.id, id)).returning();
  await logAudit(db, user.id, "update_announcement", "announcement", id, `Updated: "${updated.title}"`);
  res.json(updated);
});

router.delete("/admin/announcements/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  await logAudit(db, user.id, "delete_announcement", "announcement", id, "Deleted announcement");
  res.json({ message: "Deleted" });
});

// ─── Coupons ─────────────────────────────────────────────────────────────────

router.get("/admin/coupons", rA, async (_req, res): Promise<void> => {
  const rows = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  res.json(rows);
});

router.post("/admin/coupons", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, expiresAt } = req.body;
  if (!code || !discountValue) { res.status(400).json({ error: "Code and discount value required" }); return; }
  const [existing] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
  if (existing) { res.status(400).json({ error: "Coupon code already exists" }); return; }
  const [row] = await db.insert(couponsTable).values({
    code: code.toUpperCase(), description: description || null,
    discountType: discountType || "percentage",
    discountValue: Number(discountValue),
    minOrderAmount: Number(minOrderAmount || 0),
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    isActive: true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdBy: user.id,
  }).returning();
  await logAudit(db, user.id, "create_coupon", "coupon", row.id, `Created coupon: ${code}`);
  res.status(201).json(row);
});

router.put("/admin/coupons/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [row] = await db.select().from(couponsTable).where(eq(couponsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const { description, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, isActive, expiresAt } = req.body;
  const [updated] = await db.update(couponsTable).set({
    description: description !== undefined ? description || null : row.description,
    discountValue: discountValue !== undefined ? Number(discountValue) : row.discountValue,
    minOrderAmount: minOrderAmount !== undefined ? Number(minOrderAmount) : row.minOrderAmount,
    maxDiscountAmount: maxDiscountAmount !== undefined ? (maxDiscountAmount ? Number(maxDiscountAmount) : null) : row.maxDiscountAmount,
    usageLimit: usageLimit !== undefined ? (usageLimit ? Number(usageLimit) : null) : row.usageLimit,
    isActive: isActive !== undefined ? !!isActive : row.isActive,
    expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : row.expiresAt,
  }).where(eq(couponsTable.id, id)).returning();
  await logAudit(db, user.id, "update_coupon", "coupon", id, `Updated coupon: ${row.code}`);
  res.json(updated);
});

router.delete("/admin/coupons/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [row] = await db.select().from(couponsTable).where(eq(couponsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(couponsTable).where(eq(couponsTable.id, id));
  await logAudit(db, user.id, "delete_coupon", "coupon", id, `Deleted coupon: ${row.code}`);
  res.json({ message: "Deleted" });
});

// ─── Disputes ────────────────────────────────────────────────────────────────

router.get("/admin/disputes", rA, async (req, res): Promise<void> => {
  const { status } = req.query as Record<string, string>;
  let rows = await db.select().from(disputesTable).orderBy(desc(disputesTable.createdAt));
  if (status && status !== "all") rows = rows.filter((d) => d.status === status);
  const result = await Promise.all(rows.map(async (d) => {
    const [raisedByUser] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, d.raisedBy));
    const [job] = await db.select({ title: jobsTable.title, status: jobsTable.status }).from(jobsTable).where(eq(jobsTable.id, d.jobId));
    return { ...d, raisedByName: raisedByUser?.name ?? "Unknown", jobTitle: job?.title ?? "Unknown" };
  }));
  res.json(result);
});

router.put("/admin/disputes/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [row] = await db.select().from(disputesTable).where(eq(disputesTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const { status, resolution } = req.body;
  const [updated] = await db.update(disputesTable).set({
    status: status ?? row.status,
    resolution: resolution !== undefined ? resolution || null : row.resolution,
    resolvedBy: status === "resolved" ? user.id : row.resolvedBy,
    resolvedAt: status === "resolved" ? new Date() : row.resolvedAt,
  }).where(eq(disputesTable.id, id)).returning();
  await logAudit(db, user.id, "update_dispute", "dispute", id, `Status: ${status}`);
  res.json(updated);
});

router.post("/disputes", requireAuth as import("express").RequestHandler, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { jobId, reason, description, againstUserId } = req.body;
  if (!jobId || !reason) { res.status(400).json({ error: "Job and reason required" }); return; }
  const [row] = await db.insert(disputesTable).values({
    jobId: Number(jobId), raisedBy: user.id, reason,
    description: description || null, againstUserId: againstUserId ? Number(againstUserId) : null,
    status: "open",
  }).returning();
  res.status(201).json(row);
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

router.get("/admin/reviews", rA, async (req, res): Promise<void> => {
  const { hidden } = req.query as Record<string, string>;
  let rows = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  if (hidden === "true") rows = rows.filter((r) => r.isHidden);
  const result = await Promise.all(rows.slice(0, 200).map(async (r) => {
    const [reviewer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.reviewerId));
    const [reviewee] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.revieweeId));
    const [job] = await db.select({ title: jobsTable.title }).from(jobsTable).where(eq(jobsTable.id, r.jobId));
    return { ...r, reviewerName: reviewer?.name ?? "Unknown", revieweeName: reviewee?.name ?? "Unknown", jobTitle: job?.title ?? "Unknown" };
  }));
  res.json(result);
});

router.put("/admin/reviews/:id", rA, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const { isHidden, hiddenReason } = req.body;
  const [row] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(reviewsTable).set({
    isHidden: isHidden !== undefined ? !!isHidden : row.isHidden,
    hiddenReason: hiddenReason !== undefined ? hiddenReason || null : row.hiddenReason,
  }).where(eq(reviewsTable.id, id)).returning();
  await logAudit(db, user.id, isHidden ? "hide_review" : "unhide_review", "review", id, `Review ${isHidden ? "hidden" : "shown"}`);
  res.json(updated);
});

router.post("/reviews", requireAuth as import("express").RequestHandler, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { jobId, revieweeId, rating, comment } = req.body;
  if (!jobId || !revieweeId || !rating) { res.status(400).json({ error: "Job, reviewee and rating required" }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1-5" }); return; }
  const [existing] = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.jobId, Number(jobId)), eq(reviewsTable.reviewerId, user.id)));
  if (existing) { res.status(400).json({ error: "Already reviewed this job" }); return; }
  const [row] = await db.insert(reviewsTable).values({
    jobId: Number(jobId), reviewerId: user.id, revieweeId: Number(revieweeId),
    rating: Number(rating), comment: comment || null,
  }).returning();

  // Update provider rating if reviewee is a provider
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, Number(revieweeId)));
  if (provider) {
    const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, Number(revieweeId)));
    const avgRating = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length;
    await db.update(providersTable).set({ rating: avgRating }).where(eq(providersTable.id, provider.id));
  }

  res.status(201).json(row);
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

router.get("/admin/audit-logs", rA, async (req, res): Promise<void> => {
  const { limit = "100", action, adminId } = req.query as Record<string, string>;
  let rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(Number(limit));
  if (action) rows = rows.filter((r) => r.action.includes(action));
  if (adminId) rows = rows.filter((r) => r.adminId === Number(adminId));
  const result = await Promise.all(rows.map(async (r) => {
    const [admin] = r.adminId ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.adminId)) : [null];
    return { ...r, adminName: admin?.name ?? "System" };
  }));
  res.json(result);
});

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get("/admin/analytics", rA, async (req, res): Promise<void> => {
  const { period = "7d" } = req.query as Record<string, string>;
  const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
  const since = new Date(); since.setDate(since.getDate() - days);

  const [allUsers, allJobs, allWallets, allWithdrawals] = await Promise.all([
    db.select().from(usersTable).where(gte(usersTable.createdAt, since)),
    db.select().from(jobsTable).where(gte(jobsTable.createdAt, since)),
    db.select().from(reviewsTable).where(gte(reviewsTable.createdAt, since)),
    db.select().from(disputesTable).where(gte(disputesTable.createdAt, since)),
  ]);

  // Build daily data points
  const dailyMap: Record<string, { date: string; users: number; jobs: number; revenue: number; reviews: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { date: key, users: 0, jobs: 0, revenue: 0, reviews: 0 };
  }

  allUsers.forEach((u) => {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key]) dailyMap[key].users++;
  });
  allJobs.forEach((j) => {
    const key = j.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].jobs++;
      if (j.status === "completed") dailyMap[key].revenue += j.commission;
    }
  });
  allWallets.forEach((r) => {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key]) dailyMap[key].reviews++;
  });

  // Top skills
  const allJobsAll = await db.select().from(jobsTable);
  const skillCount: Record<number, number> = {};
  allJobsAll.forEach((j) => { skillCount[j.skillId] = (skillCount[j.skillId] || 0) + 1; });

  res.json({
    daily: Object.values(dailyMap),
    period,
    totals: {
      newUsers: allUsers.length,
      newJobs: allJobs.length,
      newReviews: allWallets.length,
      openDisputes: allWithdrawals.filter((d) => d.status === "open").length,
    },
  });
});

// ─── System Health ────────────────────────────────────────────────────────────

router.get("/admin/system-health", rA, async (_req, res): Promise<void> => {
  const start = Date.now();
  let dbPing = 0;
  try {
    await db.select().from(usersTable).limit(1);
    dbPing = Date.now() - start;
  } catch {}

  res.json({
    status: "ok",
    uptime: process.uptime(),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    dbPingMs: dbPing,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function logAudit(db: any, adminId: number, action: string, targetType: string, targetId: number | undefined, details: string) {
  try {
    await db.insert(auditLogsTable).values({ adminId, action, targetType, targetId: targetId ?? null, details });
  } catch {}
}

export default router;
