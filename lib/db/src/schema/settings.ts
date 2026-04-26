import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettingsTable.$inferSelect;

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  commission_rate: { value: "10", description: "Platform commission percentage on each job" },
  default_wallet_balance: { value: "500", description: "Wallet balance given to new users on registration" },
  default_theme_customer: { value: "dark", description: "Default theme for customer users (dark/light)" },
  default_theme_provider: { value: "dark", description: "Default theme for provider users (dark/light)" },
  default_theme_global: { value: "dark", description: "Global default theme for all users (dark/light)" },
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
};
