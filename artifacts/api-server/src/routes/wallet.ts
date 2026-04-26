import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import { requireAuth, createWalletForUser } from "../lib/auth";

const router = Router();
type AR = typeof import("express").request & { user: { id: number } };

async function ensureWallet(userId: number) {
  const [existing] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (existing) return existing;
  await createWalletForUser(userId);
  const [created] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  return created!;
}

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const wallet = await ensureWallet(user.id);
  const transactions = await db
    .select()
    .from(walletTransactionsTable)
    .where(eq(walletTransactionsTable.walletId, wallet.id))
    .orderBy(desc(walletTransactionsTable.createdAt))
    .limit(100);
  res.json({ wallet, transactions });
});

router.post("/wallet/topup", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { amount } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
  const wallet = await ensureWallet(user.id);
  const [updated] = await db
    .update(walletsTable)
    .set({ balance: wallet.balance + amt })
    .where(eq(walletsTable.id, wallet.id))
    .returning();
  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id,
    type: "credit",
    amount: amt,
    description: `Wallet top-up of ₹${amt}`,
  });
  res.json({ wallet: updated, message: `₹${amt} added to wallet` });
});

export default router;
