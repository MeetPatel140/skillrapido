import { Router } from "express";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import { db, usersTable, providersTable, providerSkillsTable, skillsTable, jobsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

type AuthRequest = typeof import("express").request & { user: { id: number; role: string; name: string; email: string; phone: string | null; latitude: number | null; longitude: number | null } };

async function getProviderWithSkills(providerId: number) {
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, providerId));
  if (!provider) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, provider.userId));
  const provSkills = await db.select().from(providerSkillsTable).where(eq(providerSkillsTable.providerId, providerId));
  const skills = provSkills.length
    ? await db.select().from(skillsTable).where(
        inArray(skillsTable.id, provSkills.map((s) => s.skillId))
      )
    : [];
  return { ...provider, name: user.name, email: user.email, phone: user.phone, latitude: user.latitude, longitude: user.longitude, skills };
}

router.get("/providers/profile", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Provider profile not found" });
    return;
  }
  const profile = await getProviderWithSkills(provider.id);
  res.json(profile);
});

router.put("/providers/profile", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const { bio, phone, skillIds, latitude, longitude } = req.body;
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  await db.update(providersTable).set({ bio: bio ?? provider.bio }).where(eq(providersTable.id, provider.id));
  await db.update(usersTable).set({
    phone: phone ?? user.phone,
    latitude: latitude ?? user.latitude,
    longitude: longitude ?? user.longitude,
  }).where(eq(usersTable.id, user.id));
  if (Array.isArray(skillIds)) {
    await db.delete(providerSkillsTable).where(eq(providerSkillsTable.providerId, provider.id));
    for (const sid of skillIds) {
      await db.insert(providerSkillsTable).values({ providerId: provider.id, skillId: sid });
    }
  }
  const profile = await getProviderWithSkills(provider.id);
  res.json(profile);
});

router.put("/providers/availability", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const { isOnline } = req.body;
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  await db.update(providersTable).set({ isOnline: !!isOnline }).where(eq(providersTable.id, provider.id));
  const profile = await getProviderWithSkills(provider.id);
  res.json(profile);
});

router.put("/providers/location", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  const { latitude, longitude } = req.body;
  await db.update(usersTable).set({ latitude, longitude }).where(eq(usersTable.id, user.id));
  res.json({ message: "Location updated" });
});

router.get("/providers/earnings", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedJobs = await db.select().from(jobsTable).where(
    and(eq(jobsTable.providerId, provider.id), eq(jobsTable.status, "completed"))
  );
  const todayJobs = completedJobs.filter((j) => j.completedAt && j.completedAt >= todayStart);
  const weekJobs = completedJobs.filter((j) => j.completedAt && j.completedAt >= weekStart);
  const monthJobs = completedJobs.filter((j) => j.completedAt && j.completedAt >= monthStart);
  const sum = (jobs: typeof completedJobs) => jobs.reduce((acc, j) => acc + j.providerAmount, 0);
  res.json({
    totalEarnings: provider.totalEarnings,
    todayEarnings: sum(todayJobs),
    weekEarnings: sum(weekJobs),
    monthEarnings: sum(monthJobs),
    pendingAmount: wallet ? wallet.escrowBalance : 0,
    completedJobs: completedJobs.length,
    averageJobValue: completedJobs.length ? provider.totalEarnings / completedJobs.length : 0,
  });
});

router.get("/providers/jobs", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user;
  if (user.role !== "provider") {
    res.status(403).json({ error: "Not a provider" });
    return;
  }
  const [provider] = await db.select().from(providersTable).where(eq(providersTable.userId, user.id));
  if (!provider) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { status } = req.query;
  let jobs = await db.select().from(jobsTable).where(eq(jobsTable.providerId, provider.id)).orderBy(desc(jobsTable.createdAt));
  if (status && status !== "all") {
    if (status === "active") {
      jobs = jobs.filter((j) => ["assigned", "in_progress"].includes(j.status));
    } else {
      jobs = jobs.filter((j) => j.status === status);
    }
  }
  const result = await Promise.all(jobs.map(async (job) => {
    const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));
    const [skill] = await db.select().from(skillsTable).where(eq(skillsTable.id, job.skillId));
    return {
      ...job, customerName: customer?.name ?? "Unknown", providerName: user.name,
      skill: skill ?? { id: 0, name: "Unknown", category: "Other", icon: "🔧", description: null },
      bidCount: 0,
    };
  }));
  res.json(result);
});

export default router;
