import { db, pool, usersTable, walletsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin";

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  commission_rate: { value: "10", description: "Platform commission percentage on each job" },
  default_wallet_balance: { value: "500", description: "Wallet balance given to new users on registration" },
  maintenance_mode: { value: "false", description: "Enable/disable maintenance mode" },
  maintenance_message: { value: "SkillRapido is under maintenance. Please check back soon.", description: "Message shown during maintenance mode" },
  job_broadcast_timeout_minutes: { value: "5", description: "Minutes before job broadcast expands to all providers" },
  min_withdrawal_amount: { value: "100", description: "Minimum withdrawal amount in rupees" },
  max_withdrawal_amount: { value: "50000", description: "Maximum withdrawal amount per request" },
  allow_new_registrations: { value: "true", description: "Allow new user registrations" },
  auto_verify_providers: { value: "false", description: "Auto-verify new provider profiles" },
  platform_name: { value: "SkillRapido", description: "Platform name shown in app" },
  support_email: { value: "support@skillrapido.com", description: "Support email address" },
  max_active_jobs_customer: { value: "5", description: "Max active jobs a customer can have at once" },
  provider_rating_threshold: { value: "3.0", description: "Minimum rating for provider to remain active" },
  default_theme_global: { value: "dark", description: "Global default theme for all users" },
};

export async function seedAdmin(): Promise<void> {
  try {
    // Ensure the sessions table exists (required by connect-pg-simple)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE);
      CREATE INDEX IF NOT EXISTS "IDX_sessions_expire" ON "sessions" ("expire");
    `);

    // Seed default settings
    for (const [key, { value, description }] of Object.entries(DEFAULT_SETTINGS)) {
      await db.insert(appSettingsTable).values({ key, value, description })
        .onConflictDoNothing();
    }

    // Create admin user if not exists
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, ADMIN_EMAIL));
    if (existing) {
      if (existing.role !== "admin") {
        await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, existing.id));
      }
      // Ensure admin has a wallet
      const [aw] = await db.select().from(walletsTable).where(eq(walletsTable.userId, existing.id));
      if (!aw) {
        await db.insert(walletsTable).values({ userId: existing.id, balance: 0, escrowBalance: 0 });
      }
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const [admin] = await db.insert(usersTable).values({
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      phone: null,
      latitude: null,
      longitude: null,
    }).returning();

    await db.insert(walletsTable).values({ userId: admin.id, balance: 0, escrowBalance: 0 });
    console.log(`[seed] Admin user created: ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error("[seed] Failed to seed:", err);
  }
}
