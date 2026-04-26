import { Router } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { invalidateMaintenanceCache } from "../middleware/maintenance";
import { db, usersTable, jobsTable, skillsTable, providersTable, providerSkillsTable, walletsTable, walletTransactionsTable, bidsTable, appSettingsTable, withdrawalRequestsTable, withdrawalMethodsTable } from "@workspace/db";
import { requireAdmin, hashPassword } from "../lib/auth";

const router = Router();
type AR = typeof import("express").request & { user: { id: number; role: string; name: string } };
const rA = requireAdmin as import("express").RequestHandler;

// ── Stats ──
router.get("/admin/stats", rA, async (_req, res): Promise<void> => {
  const [allUsers, allJobs, allProviders, allWallets, allWithdrawals] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(jobsTable),
    db.select().from(providersTable),
    db.select().from(walletsTable),
    db.select().from(withdrawalRequestsTable),
  ]);
  const customers = allUsers.filter((u) => u.role === "customer").length;
  const providers = allUsers.filter((u) => u.role === "provider").length;
  const onlineProviders = allProviders.filter((p) => p.isOnline).length;
  const completedJobs = allJobs.filter((j) => j.status === "completed");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayJobs = allJobs.filter((j) => j.createdAt >= today).length;
  const totalRevenue = completedJobs.reduce((a, j) => a + j.budget, 0);
  const totalCommission = completedJobs.reduce((a, j) => a + j.commission, 0);
  const totalWalletBalance = allWallets.reduce((a, w) => a + w.balance, 0);
  const pendingWithdrawals = allWithdrawals.filter((w) => w.status === "pending").length;
  const pendingWithdrawalAmount = allWithdrawals.filter((w) => w.status === "pending").reduce((a, w) => a + w.amount, 0);
  res.json({
    totalUsers: allUsers.length, customers, providers, onlineProviders, blockedUsers: allUsers.filter((u) => u.isBlocked).length,
    totalJobs: allJobs.length, openJobs: allJobs.filter((j) => j.status === "open").length,
    completedJobs: completedJobs.length, cancelledJobs: allJobs.filter((j) => j.status === "cancelled").length,
    todayJobs, totalRevenue, totalCommission, totalWalletBalance, pendingWithdrawals, pendingWithdrawalAmount,
    verifiedProviders: allProviders.filter((p) => p.isVerified).length,
  });
});

// ── Users ──
router.get("/admin/users", rA, async (req, res): Promise<void> => {
  const { role, search, blocked } = req.query as Record<string, string>;
  let users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  if (role && role !== "all") users = users.filter((u) => u.role === role);
  if (blocked === "true") users = users.filter((u) => u.isBlocked);
  if (search) {
    const q = search.toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  const result = await Promise.all(users.slice(0, 200).map(async (u) => {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, u.id));
    const { passwordHash: _, ...safe } = u;
    return { ...safe, walletBalance: wallet?.balance ?? 0, escrowBalance: wallet?.escrowBalance ?? 0, walletId: wallet?.id };
  }));
  res.json(result);
});

router.get("/admin/users/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, id));
  const txns = wallet ? await db.select().from(walletTransactionsTable).where(eq(walletTransactionsTable.walletId, wallet.id)).orderBy(desc(walletTransactionsTable.createdAt)).limit(20) : [];
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.customerId, id)).orderBy(desc(jobsTable.createdAt)).limit(10);
  const { passwordHash: _, ...safe } = u;
  res.json({ ...safe, wallet, transactions: txns, recentJobs: jobs });
});

router.put("/admin/users/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, email, phone, role, bio, avatarUrl, isBlocked } = req.body;
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!u) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(usersTable).set({
    name: name ?? u.name, email: email ?? u.email, phone: phone !== undefined ? phone || null : u.phone,
    role: role ?? u.role, bio: bio !== undefined ? bio || null : u.bio,
    avatarUrl: avatarUrl !== undefined ? avatarUrl || null : u.avatarUrl,
    isBlocked: isBlocked !== undefined ? !!isBlocked : u.isBlocked,
  }).where(eq(usersTable.id, id)).returning();
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

router.put("/admin/users/:id/password", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { password } = req.body;
  if (!password) { res.status(400).json({ error: "Password required" }); return; }
  const hash = await hashPassword(password);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, id));
  res.json({ message: "Password updated" });
});

router.put("/admin/users/:id/block", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { isBlocked } = req.body;
  await db.update(usersTable).set({ isBlocked: !!isBlocked }).where(eq(usersTable.id, id));
  res.json({ message: isBlocked ? "User blocked" : "User unblocked" });
});

router.delete("/admin/users/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!u) { res.status(404).json({ error: "Not found" }); return; }
  if (u.role === "admin") { res.status(400).json({ error: "Cannot delete admin" }); return; }
  await db.update(usersTable).set({ isBlocked: true, email: `deleted_${id}_${u.email}` }).where(eq(usersTable.id, id));
  res.json({ message: "User removed" });
});

// ── Wallet Manipulation ──
router.post("/admin/wallets/:userId/adjust", rA, async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  const { amount, type, description } = req.body;
  if (!amount || !type || !["credit", "debit"].includes(type)) {
    res.status(400).json({ error: "Invalid adjustment" }); return;
  }
  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (!wallet) {
    const [w] = await db.insert(walletsTable).values({ userId, balance: 0, escrowBalance: 0 }).returning();
    wallet = w;
  }
  const adj = type === "credit" ? Math.abs(amount) : -Math.abs(amount);
  const newBalance = Math.max(0, wallet.balance + adj);
  const [updated] = await db.update(walletsTable).set({ balance: newBalance }).where(eq(walletsTable.id, wallet.id)).returning();
  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id, type: type as "credit" | "debit", amount: Math.abs(amount),
    description: description || `Admin ${type} of ₹${Math.abs(amount)}`,
  });
  res.json({ wallet: updated });
});

router.post("/admin/wallets/:userId/set-balance", rA, async (req, res): Promise<void> => {
  const userId = Number(req.params.userId);
  const { balance, escrowBalance } = req.body;
  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (!wallet) {
    const [w] = await db.insert(walletsTable).values({ userId, balance: 0, escrowBalance: 0 }).returning();
    wallet = w;
  }
  const updates: Partial<typeof wallet> = {};
  if (balance !== undefined) updates.balance = Math.max(0, Number(balance));
  if (escrowBalance !== undefined) updates.escrowBalance = Math.max(0, Number(escrowBalance));
  const [updated] = await db.update(walletsTable).set(updates as any).where(eq(walletsTable.id, wallet.id)).returning();
  if (balance !== undefined) {
    await db.insert(walletTransactionsTable).values({
      walletId: wallet.id, type: "credit", amount: Number(balance), description: "Admin: balance set directly",
    });
  }
  res.json({ wallet: updated });
});

// ── Jobs ──
router.get("/admin/jobs", rA, async (req, res): Promise<void> => {
  const { status, search } = req.query as Record<string, string>;
  let jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));
  if (status && status !== "all") jobs = jobs.filter((j) => j.status === status);
  if (search) { const q = search.toLowerCase(); jobs = jobs.filter((j) => j.title.toLowerCase().includes(q)); }
  const result = await Promise.all(jobs.slice(0, 200).map(async (job) => {
    const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
    const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));
    let providerName: string | null = null;
    if (job.providerId) {
      const [prov] = await db.select().from(providersTable).where(eq(providersTable.id, job.providerId));
      if (prov) { const [pu] = await db.select().from(usersTable).where(eq(usersTable.id, prov.userId)); providerName = pu?.name ?? null; }
    }
    return { ...job, skill: skill ?? { name: "Unknown", icon: "🔧", category: "Other" }, customerName: customer?.name ?? "Unknown", providerName };
  }));
  res.json(result);
});

router.post("/admin/jobs/:id/cancel", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Not found" }); return; }
  if (["completed", "cancelled"].includes(job.status)) { res.status(400).json({ error: "Already closed" }); return; }
  await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, id));
  const escrowAmount = job.budget + job.commission;
  if (escrowAmount > 0) {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, job.customerId));
    if (wallet) {
      await db.update(walletsTable).set({ balance: wallet.balance + escrowAmount, escrowBalance: Math.max(0, wallet.escrowBalance - escrowAmount) }).where(eq(walletsTable.id, wallet.id));
      await db.insert(walletTransactionsTable).values({ walletId: wallet.id, type: "escrow_release", amount: escrowAmount, description: `Admin refund for job: ${job.title}`, jobId: job.id });
    }
  }
  res.json({ message: "Cancelled and refunded" });
});

router.put("/admin/jobs/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { status, budget } = req.body;
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Not found" }); return; }
  const updates: Record<string, any> = {};
  if (status) updates.status = status;
  if (budget) { updates.budget = Number(budget); updates.commission = Number(budget) * 0.1; updates.providerAmount = Number(budget) * 0.9; }
  await db.update(jobsTable).set(updates).where(eq(jobsTable.id, id));
  res.json({ message: "Updated" });
});

// ── Providers ──
router.get("/admin/providers", rA, async (_req, res): Promise<void> => {
  const providers = await db.select().from(providersTable).orderBy(desc(providersTable.totalEarnings));
  const result = await Promise.all(providers.map(async (p) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId));
    const provSkills = await db.select().from(providerSkillsTable).where(eq(providerSkillsTable.providerId, p.id));
    const skills = provSkills.length ? await db.select().from(skillsTable).where(inArray(skillsTable.id, provSkills.map((s) => s.skillId))) : [];
    return { ...p, name: user?.name ?? "Unknown", email: user?.email ?? "", phone: user?.phone ?? null, avatarUrl: user?.avatarUrl ?? null, isBlocked: user?.isBlocked ?? false, skills };
  }));
  res.json(result);
});

router.put("/admin/providers/:id/verify", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { isVerified } = req.body;
  await db.update(providersTable).set({ isVerified: !!isVerified }).where(eq(providersTable.id, id));
  res.json({ message: "Updated" });
});

router.put("/admin/providers/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { bio, rating, isVerified, isOnline } = req.body;
  const updates: Record<string, any> = {};
  if (bio !== undefined) updates.bio = bio;
  if (rating !== undefined) updates.rating = Number(rating);
  if (isVerified !== undefined) updates.isVerified = !!isVerified;
  if (isOnline !== undefined) updates.isOnline = !!isOnline;
  await db.update(providersTable).set(updates).where(eq(providersTable.id, id));
  res.json({ message: "Updated" });
});

// ── Transactions ──
router.get("/admin/transactions", rA, async (req, res): Promise<void> => {
  const { type } = req.query as { type?: string };
  const txns = await db.select().from(walletTransactionsTable).orderBy(desc(walletTransactionsTable.createdAt)).limit(500);
  const filtered = (type && type !== "all") ? txns.filter((t) => t.type === type) : txns;
  const result = await Promise.all(filtered.slice(0, 200).map(async (tx) => {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, tx.walletId));
    const [user] = wallet ? await db.select().from(usersTable).where(eq(usersTable.id, wallet.userId)) : [null];
    return { ...tx, userName: user?.name ?? "Unknown", userEmail: user?.email ?? "", userRole: user?.role ?? "unknown" };
  }));
  res.json(result);
});

// ── Withdrawals ──
router.get("/admin/withdrawals", rA, async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  let requests = await db.select().from(withdrawalRequestsTable).orderBy(desc(withdrawalRequestsTable.createdAt));
  if (status && status !== "all") requests = requests.filter((r) => r.status === status);
  const result = await Promise.all(requests.map(async (r) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId));
    const [method] = r.methodId ? await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, r.methodId)) : [null];
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, r.walletId));
    return { ...r, userName: user?.name ?? "Unknown", userEmail: user?.email ?? "", method, walletBalance: wallet?.balance ?? 0 };
  }));
  res.json(result);
});

router.put("/admin/withdrawals/:id", rA, async (req, res): Promise<void> => {
  const adminUser = (req as AR).user;
  const id = Number(req.params.id);
  const { status, adminNote } = req.body;
  if (!["pending", "processing", "approved", "rejected"].includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [request] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Not found" }); return; }
  if (request.status === "approved" || request.status === "rejected") { res.status(400).json({ error: "Already finalized" }); return; }
  if (status === "rejected") {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, request.walletId));
    if (wallet) {
      await db.update(walletsTable).set({ balance: wallet.balance + request.amount }).where(eq(walletsTable.id, wallet.id));
      await db.insert(walletTransactionsTable).values({ walletId: wallet.id, type: "credit", amount: request.amount, description: "Withdrawal rejected - refunded" });
    }
  }
  await db.update(withdrawalRequestsTable).set({ status: status as any, adminNote: adminNote || null, processedAt: new Date(), processedBy: adminUser.id }).where(eq(withdrawalRequestsTable.id, id));
  res.json({ message: `Withdrawal ${status}` });
});

// ── Settings ──
router.get("/admin/settings", rA, async (_req, res): Promise<void> => {
  const settings = await db.select().from(appSettingsTable);
  res.json(settings);
});

router.put("/admin/settings", rA, async (req, res): Promise<void> => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db.insert(appSettingsTable).values({ key, value: String(value), description: "" })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: String(value), updatedAt: new Date() } });
  }
  invalidateMaintenanceCache();
  const settings = await db.select().from(appSettingsTable);
  res.json(settings);
});

// ── Skills Management ──
router.get("/admin/skills", rA, async (_req, res): Promise<void> => {
  const skills = await db.select().from(skillsTable);
  res.json(skills);
});

router.post("/admin/skills", rA, async (req, res): Promise<void> => {
  const { name, category, icon, description } = req.body;
  if (!name || !category) { res.status(400).json({ error: "Name and category required" }); return; }
  const [skill] = await db.insert(skillsTable).values({ name, category, icon: icon || "🔧", description: description || null }).returning();
  res.status(201).json(skill);
});

router.put("/admin/skills/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, category, icon, description } = req.body;
  const [updated] = await db.update(skillsTable).set({ name, category, icon, description }).where(eq(skillsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/skills/:id", rA, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(skillsTable).where(eq(skillsTable.id, id));
  res.json({ message: "Deleted" });
});

export default router;
