import { pgTable, serial, integer, real, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  balance: real("balance").notNull().default(0),
  escrowBalance: real("escrow_balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id),
  type: text("type", { enum: ["credit", "debit", "escrow_hold", "escrow_release", "commission", "withdrawal"] }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  jobId: integer("job_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawalMethodsTable = pgTable("withdrawal_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: text("type", { enum: ["bank", "upi"] }).notNull(),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  bankName: text("bank_name"),
  upiId: text("upi_id"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  walletId: integer("wallet_id").notNull().references(() => walletsTable.id),
  amount: real("amount").notNull(),
  methodId: integer("method_id").references(() => withdrawalMethodsTable.id),
  status: text("status", { enum: ["pending", "processing", "approved", "rejected"] }).notNull().default("pending"),
  adminNote: text("admin_note"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  processedBy: integer("processed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
export type WithdrawalMethod = typeof withdrawalMethodsTable.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
