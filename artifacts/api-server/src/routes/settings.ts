import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { invalidateMaintenanceCache } from "../middleware/maintenance";

const router = Router();
type AR = typeof import("express").request & { user: { id: number; role: string } };

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  res.json(map);
});

router.get("/settings/:key", async (req, res): Promise<void> => {
  const [s] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, req.params.key));
  if (!s) { res.status(404).json({ error: "Setting not found" }); return; }
  res.json(s);
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db.insert(appSettingsTable).values({ key, value: String(value), description: "" })
      .onConflictDoUpdate({ target: appSettingsTable.key, set: { value: String(value), updatedAt: new Date() } });
  }
  invalidateMaintenanceCache();
  const settings = await db.select().from(appSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  res.json(map);
});

export async function getSetting(key: string, fallback: string): Promise<string> {
  const [s] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  return s?.value ?? fallback;
}

export default router;
