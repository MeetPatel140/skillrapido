import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { hashPassword, comparePassword } from "../lib/auth";

const router = Router();
type AR = typeof import("express").request & { user: { id: number; role: string; name: string; email: string } };

router.get("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { passwordHash: _, ...safeUser } = user as any;
  res.json({ ...safeUser, phone: (safeUser as any).phone ?? null, avatarUrl: (safeUser as any).avatarUrl ?? null });
});

router.put("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { name, phone, bio, avatarUrl, latitude, longitude } = req.body;
  const [updated] = await db.update(usersTable).set({
    name: name ?? (user as any).name,
    phone: phone !== undefined ? phone || null : (user as any).phone,
    bio: bio !== undefined ? bio || null : (user as any).bio,
    avatarUrl: avatarUrl !== undefined ? avatarUrl || null : (user as any).avatarUrl,
    latitude: latitude !== undefined ? latitude || null : (user as any).latitude,
    longitude: longitude !== undefined ? longitude || null : (user as any).longitude,
  }).where(eq(usersTable.id, user.id)).returning();
  const { passwordHash: _, ...safeUser } = updated;
  res.json({ ...safeUser, phone: safeUser.phone ?? null, avatarUrl: safeUser.avatarUrl ?? null });
});

router.put("/users/password", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "Missing passwords" }); return; }
  const [fullUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const valid = await comparePassword(currentPassword, fullUser.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password incorrect" }); return; }
  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password updated" });
});

export default router;
