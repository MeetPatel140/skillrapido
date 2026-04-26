import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, walletsTable, walletTransactionsTable, withdrawalMethodsTable, withdrawalRequestsTable, providersTable, appSettingsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();
type AR = typeof import("express").request & { user: { id: number; role: string; name: string } };

router.get("/withdrawals/methods", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const methods = await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.userId, user.id)).orderBy(desc(withdrawalMethodsTable.createdAt));
  res.json(methods);
});

router.post("/withdrawals/methods", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { type, accountName, accountNumber, ifscCode, bankName, upiId, isDefault } = req.body;
  if (!type || !["bank", "upi"].includes(type)) {
    res.status(400).json({ error: "Invalid payment method type" });
    return;
  }
  if (type === "bank" && (!accountNumber || !ifscCode || !accountName)) {
    res.status(400).json({ error: "Bank account details required" });
    return;
  }
  if (type === "upi" && !upiId) {
    res.status(400).json({ error: "UPI ID required" });
    return;
  }
  if (isDefault) {
    await db.update(withdrawalMethodsTable).set({ isDefault: false }).where(eq(withdrawalMethodsTable.userId, user.id));
  }
  const [method] = await db.insert(withdrawalMethodsTable).values({
    userId: user.id, type, accountName: accountName || null, accountNumber: accountNumber || null,
    ifscCode: ifscCode || null, bankName: bankName || null, upiId: upiId || null,
    isDefault: !!isDefault,
  }).returning();
  res.status(201).json(method);
});

router.put("/withdrawals/methods/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [method] = await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, id));
  if (!method || method.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }
  const { accountName, accountNumber, ifscCode, bankName, upiId, isDefault } = req.body;
  if (isDefault) {
    await db.update(withdrawalMethodsTable).set({ isDefault: false }).where(eq(withdrawalMethodsTable.userId, user.id));
  }
  const [updated] = await db.update(withdrawalMethodsTable).set({
    accountName: accountName ?? method.accountName, accountNumber: accountNumber ?? method.accountNumber,
    ifscCode: ifscCode ?? method.ifscCode, bankName: bankName ?? method.bankName,
    upiId: upiId ?? method.upiId, isDefault: isDefault !== undefined ? !!isDefault : method.isDefault,
  }).where(eq(withdrawalMethodsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/withdrawals/methods/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [method] = await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, id));
  if (!method || method.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, id));
  res.json({ message: "Deleted" });
});

router.get("/withdrawals/requests", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const requests = await db.select().from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.userId, user.id))
    .orderBy(desc(withdrawalRequestsTable.createdAt));
  const result = await Promise.all(requests.map(async (r) => {
    const [method] = r.methodId ? await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, r.methodId)) : [null];
    return { ...r, method };
  }));
  res.json(result);
});

router.post("/withdrawals/requests", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const { amount, methodId } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ error: "Invalid amount" }); return; }
  const [minSetting] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "min_withdrawal_amount"));
  const [maxSetting] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "max_withdrawal_amount"));
  const minAmount = minSetting ? parseFloat(minSetting.value) : 100;
  const maxAmount = maxSetting ? parseFloat(maxSetting.value) : 50000;
  if (amount < minAmount) { res.status(400).json({ error: `Minimum withdrawal is ₹${minAmount}` }); return; }
  if (amount > maxAmount) { res.status(400).json({ error: `Maximum withdrawal is ₹${maxAmount}` }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
  if (!wallet || wallet.balance < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
  if (methodId) {
    const [method] = await db.select().from(withdrawalMethodsTable).where(eq(withdrawalMethodsTable.id, methodId));
    if (!method || method.userId !== user.id) { res.status(400).json({ error: "Invalid payment method" }); return; }
  }
  const [updated] = await db.update(walletsTable).set({ balance: wallet.balance - amount }).where(eq(walletsTable.id, wallet.id)).returning();
  await db.insert(walletTransactionsTable).values({
    walletId: wallet.id, type: "withdrawal", amount, description: `Withdrawal request of ₹${amount}`,
  });
  const [request] = await db.insert(withdrawalRequestsTable).values({
    userId: user.id, walletId: wallet.id, amount, methodId: methodId || null, status: "pending",
  }).returning();
  res.status(201).json({ request, wallet: updated });
});

router.delete("/withdrawals/requests/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AR).user;
  const id = Number(req.params.id);
  const [request] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id));
  if (!request || request.userId !== user.id) { res.status(404).json({ error: "Not found" }); return; }
  if (request.status !== "pending") { res.status(400).json({ error: "Cannot cancel a non-pending request" }); return; }
  await db.update(withdrawalRequestsTable).set({ status: "rejected", adminNote: "Cancelled by user" }).where(eq(withdrawalRequestsTable.id, id));
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.id, request.walletId));
  if (wallet) {
    await db.update(walletsTable).set({ balance: wallet.balance + request.amount }).where(eq(walletsTable.id, wallet.id));
    await db.insert(walletTransactionsTable).values({
      walletId: wallet.id, type: "credit", amount: request.amount, description: "Withdrawal cancelled - refunded",
    });
  }
  res.json({ message: "Withdrawal cancelled and refunded" });
});

export default router;
