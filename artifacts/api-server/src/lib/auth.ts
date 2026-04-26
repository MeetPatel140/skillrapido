import bcrypt from "bcrypt";
import { db, usersTable, walletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (user.isBlocked) {
    (req.session as any).destroy?.(() => {});
    res.status(403).json({ error: "Account has been suspended. Contact support." });
    return;
  }
  (req as Request & { user: typeof user }).user = user;
  next();
}

export async function createWalletForUser(userId: number): Promise<void> {
  const [existing] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (!existing) {
    await db.insert(walletsTable).values({ userId, balance: 500, escrowBalance: 0 });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.isBlocked) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  (req as Request & { user: typeof user }).user = user;
  next();
}
