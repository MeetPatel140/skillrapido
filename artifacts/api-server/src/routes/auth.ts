import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, providersTable } from "@workspace/db";
import { hashPassword, comparePassword, createWalletForUser } from "../lib/auth";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, role, phone, latitude, longitude } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    name, email, phone: phone || null, passwordHash, role,
    latitude: latitude || null, longitude: longitude || null,
  }).returning();

  await createWalletForUser(user.id);

  if (role === "provider") {
    await db.insert(providersTable).values({ userId: user.id });
  }

  (req.session as { userId?: number }).userId = user.id;
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ user: { ...safeUser, phone: safeUser.phone ?? null, latitude: safeUser.latitude ?? null, longitude: safeUser.longitude ?? null }, message: "Registered successfully" });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.isBlocked) {
    res.status(403).json({ error: "Your account has been suspended. Contact support." });
    return;
  }
  (req.session as { userId?: number }).userId = user.id;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: { ...safeUser, phone: safeUser.phone ?? null, latitude: safeUser.latitude ?? null, longitude: safeUser.longitude ?? null }, message: "Logged in" });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (user.isBlocked) {
    req.session.destroy(() => {});
    res.status(403).json({ error: "Account suspended" });
    return;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, phone: safeUser.phone ?? null, latitude: safeUser.latitude ?? null, longitude: safeUser.longitude ?? null });
});

export default router;
