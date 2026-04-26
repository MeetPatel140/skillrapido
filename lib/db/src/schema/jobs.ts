import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { skillsTable } from "./skills";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["open", "assigned", "in_progress", "completed", "cancelled"] }).notNull().default("open"),
  budget: real("budget").notNull(),
  commission: real("commission").notNull(),
  providerAmount: real("provider_amount").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  skillId: integer("skill_id").notNull().references(() => skillsTable.id),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  providerId: integer("provider_id"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  broadcastPhase: integer("broadcast_phase").notNull().default(1),
  broadcastStartedAt: timestamp("broadcast_started_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
