import type { Request, Response, NextFunction } from "express";
import { db, appSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let cachedMaintenance = false;
let cacheTime = 0;
const CACHE_TTL = 10_000; // 10 seconds

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip for auth routes so users can get meaningful maintenance response
  const path = req.path;
  if (path.startsWith("/api/auth/") || path === "/api/health") {
    next();
    return;
  }

  // Cache the setting to avoid DB hit on every request
  const now = Date.now();
  if (now - cacheTime > CACHE_TTL) {
    try {
      const [s] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "maintenance_mode"));
      cachedMaintenance = s?.value === "true";
    } catch {
      cachedMaintenance = false;
    }
    cacheTime = now;
  }

  if (!cachedMaintenance) {
    next();
    return;
  }

  // In maintenance: allow admin users through
  const userId = (req.session as { userId?: number }).userId;
  if (userId) {
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (user?.role === "admin") {
        next();
        return;
      }
    } catch {}
  }

  res.status(503).json({
    error: "maintenance",
    message: "SkillRapido is currently under maintenance. Please check back soon.",
  });
}

export function invalidateMaintenanceCache(): void {
  cacheTime = 0;
}
