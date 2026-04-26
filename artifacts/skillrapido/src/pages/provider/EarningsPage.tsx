import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, Wallet, CheckCircle2, ArrowDownToLine, Plus, X, Trash2, CreditCard, Smartphone } from "lucide-react";

interface Earnings {
  totalEarnings: number; todayEarnings: number; weekEarnings: number;
  monthEarnings: number; pendingAmount: number; completedJobs: number; averageJobValue: number;
}
interface WalletTx { id: number; type: string; amount: number; description: string; createdAt: string; }
interface WalletData { wallet: { id: number; balance: number; escrowBalance: number }; transactions: WalletTx[]; }
interface WithdrawMethod { id: number; type: string; accountName: string | null; accountNumber: string | null; ifscCode: string | null; bankName: string | null; upiId: string | null; isDefault: boolean; }
interface WithdrawRequest { id: number; amount: number; status: string; createdAt: string; adminNote: string | null; method: WithdrawMethod | null; }

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)" },
  processing: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)" },
  approved: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)" },
  rejected: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)" },
};

export default function EarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [methods, setMethods] = useState<WithdrawMethod[]>([]);
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"earnings" | "withdraw" | "history">("earnings");
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [methodForm, setMethodForm] = useState({ type: "bank", accountName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "", isDefault: false });
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, w, m, r] = await Promise.all([
        fetch("/api/providers/earnings", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
        fetch("/api/wallet", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
        fetch("/api/withdrawals/methods", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
        fetch("/api/withdrawals/requests", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
      ]);
      if (e && !e.error) setData(e);
      if (w && !w.error) setWalletData(w);
      if (Array.isArray(m)) { setMethods(m); if (m.length > 0) setSelectedMethod(m.find((x: WithdrawMethod) => x.isDefault)?.id ?? m[0].id); }
      if (Array.isArray(r)) setRequests(r);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const addMethod = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/methods", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(methodForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Payment method added!");
      setShowAddMethod(false);
      setMethodForm({ type: "bank", accountName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "", isDefault: false });
      loadAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const deleteMethod = async (id: number) => {
    if (!confirm("Remove this payment method?")) return;
    await fetch(`/api/withdrawals/methods/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Removed");
    loadAll();
  };

  const requestWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) { toast.error("Enter valid amount"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals/requests", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, methodId: selectedMethod }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(`Withdrawal of ₹${amount} requested!`);
      setWithdrawAmount("");
      loadAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const cancelRequest = async (id: number) => {
    if (!confirm("Cancel this withdrawal request?")) return;
    try {
      await fetch(`/api/withdrawals/requests/${id}`, { method: "DELETE", credentials: "include" });
      toast.success("Cancelled and refunded");
      loadAll();
    } catch { toast.error("Failed"); }
  };

  const balance = walletData?.wallet?.balance ?? 0;
  const txns = walletData?.transactions?.filter((t) => ["credit", "escrow_release"].includes(t.type)) ?? [];

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-2xl font-bold">Earnings</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[["earnings","Overview"],["withdraw","Withdraw"],["history","History"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
            style={tab === key
              ? { background: "linear-gradient(135deg, hsl(142 71% 35%), hsl(158 71% 28%))", color: "white" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "earnings" && (
        <div className="px-5 pb-8">
          <div className="rounded-3xl p-6 text-center mb-5" style={{ background: "linear-gradient(135deg, hsl(142 71% 35%), hsl(158 71% 28%))" }}>
            <TrendingUp className="w-8 h-8 text-white/70 mx-auto mb-2" />
            <p className="text-white/70 text-sm">Total Lifetime Earnings</p>
            <p className="text-4xl font-bold text-white mt-1">₹{loading ? "—" : (data?.totalEarnings ?? 0).toFixed(2)}</p>
            <p className="text-white/60 text-xs mt-2">{data?.completedJobs ?? 0} jobs completed</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Today", value: data?.todayEarnings ?? 0 },
              { label: "This Week", value: data?.weekEarnings ?? 0 },
              { label: "This Month", value: data?.monthEarnings ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="stat-card text-center">
                <p className="text-base font-bold" style={{ color: "hsl(142 71% 55%)" }}>₹{loading ? "—" : value.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-warning" /><p className="text-xs text-muted-foreground">Wallet Balance</p></div>
              <p className="text-lg font-bold" style={{ color: "hsl(142 71% 55%)" }}>₹{balance.toFixed(2)}</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Avg per Job</p></div>
              <p className="text-lg font-bold text-primary">₹{(data?.averageJobValue ?? 0).toFixed(0)}</p>
            </div>
          </div>
          <h2 className="font-bold mb-3">Payment History</h2>
          {txns.length === 0 ? (
            <div className="text-center py-8"><p className="text-muted-foreground text-sm">No earnings yet. Accept jobs to start earning!</p></div>
          ) : txns.map((tx) => (
            <div key={tx.id} className="mb-3 rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "hsl(142 71% 55%)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="font-bold" style={{ color: "hsl(142 71% 55%)" }}>+₹{tx.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Withdraw tab */}
      {tab === "withdraw" && (
        <div className="px-5 pb-8">
          {/* Balance */}
          <div className="rounded-2xl p-4 mb-5 flex items-center gap-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Wallet className="w-6 h-6" style={{ color: "hsl(142 71% 55%)" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold" style={{ color: "hsl(142 71% 55%)" }}>₹{balance.toFixed(2)}</p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Payment Methods</h2>
              <button onClick={() => setShowAddMethod(!showAddMethod)}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl"
                style={{ background: "rgba(59,130,246,0.1)", color: "hsl(221 83% 60%)" }}>
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {showAddMethod && (
              <div className="rounded-2xl p-4 mb-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex gap-2 mb-3">
                  {[["bank","Bank Account"],["upi","UPI"]].map(([val, label]) => (
                    <button key={val} onClick={() => setMethodForm({ ...methodForm, type: val })}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      style={methodForm.type === val
                        ? { background: "rgba(59,130,246,0.15)", color: "hsl(221 83% 60%)", border: "1.5px solid hsl(221 83% 53%)" }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1.5px solid transparent" }}>
                      {val === "bank" ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      {label}
                    </button>
                  ))}
                </div>
                {methodForm.type === "bank" ? (
                  <div className="space-y-2">
                    <input className="app-input" placeholder="Account Holder Name" value={methodForm.accountName} onChange={(e) => setMethodForm({ ...methodForm, accountName: e.target.value })} />
                    <input className="app-input" placeholder="Account Number" value={methodForm.accountNumber} onChange={(e) => setMethodForm({ ...methodForm, accountNumber: e.target.value })} />
                    <input className="app-input" placeholder="IFSC Code" value={methodForm.ifscCode} onChange={(e) => setMethodForm({ ...methodForm, ifscCode: e.target.value })} />
                    <input className="app-input" placeholder="Bank Name" value={methodForm.bankName} onChange={(e) => setMethodForm({ ...methodForm, bankName: e.target.value })} />
                  </div>
                ) : (
                  <input className="app-input" placeholder="UPI ID (e.g. name@upi)" value={methodForm.upiId} onChange={(e) => setMethodForm({ ...methodForm, upiId: e.target.value })} />
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={addMethod} disabled={submitting}
                    className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                    {submitting ? "Adding..." : "Add Method"}
                  </button>
                  <button onClick={() => setShowAddMethod(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {methods.length === 0 ? (
              <div className="text-center py-6 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <p className="text-sm text-muted-foreground">No payment methods added. Add one to withdraw.</p>
              </div>
            ) : methods.map((m) => (
              <div key={m.id}
                onClick={() => setSelectedMethod(m.id)}
                className="rounded-2xl p-4 mb-2 flex items-center gap-3 cursor-pointer transition-all"
                style={{
                  background: selectedMethod === m.id ? "rgba(59,130,246,0.08)" : "hsl(var(--card))",
                  border: selectedMethod === m.id ? "1.5px solid hsl(221 83% 53%)" : "1px solid hsl(var(--border))",
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--muted))" }}>
                  {m.type === "upi" ? <Smartphone className="w-5 h-5 text-muted-foreground" /> : <CreditCard className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.type === "upi" ? m.upiId : `${m.bankName || "Bank"} ••••${(m.accountNumber || "").slice(-4)}`}</p>
                  {m.accountName && <p className="text-xs text-muted-foreground">{m.accountName}</p>}
                  {m.ifscCode && <p className="text-xs text-muted-foreground">IFSC: {m.ifscCode}</p>}
                </div>
                {m.isDefault && <span className="text-xs font-semibold" style={{ color: "hsl(142 71% 50%)" }}>Default</span>}
                <button onClick={(e) => { e.stopPropagation(); deleteMethod(m.id); }} className="p-1.5 rounded-lg hover:bg-muted">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          {/* Withdraw request */}
          {methods.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold mb-3">Request Withdrawal</h3>
              <p className="text-xs text-muted-foreground mb-3">Min ₹100 · Max ₹50,000 · Processed within 1-3 business days</p>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Amount (₹)</label>
              <input className="app-input mb-3" type="number" placeholder="Enter amount..." min="100" max={balance}
                value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
              <div className="flex gap-2 mb-3">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button key={amt} onClick={() => setWithdrawAmount(String(Math.min(amt, balance)))}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    ₹{amt}
                  </button>
                ))}
              </div>
              <button onClick={requestWithdraw} disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
                <ArrowDownToLine className="w-4 h-4" />
                {submitting ? "Processing..." : `Withdraw ₹${withdrawAmount || "0"}`}
              </button>
              {parseFloat(withdrawAmount) > balance && <p className="text-xs text-destructive mt-2 text-center">Insufficient balance</p>}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="px-5 pb-8">
          <h2 className="font-bold mb-3">Withdrawal Requests</h2>
          {requests.length === 0 ? (
            <div className="text-center py-12 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <ArrowDownToLine className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No withdrawal requests yet</p>
            </div>
          ) : requests.map((r) => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            return (
              <div key={r.id} className="mb-3 rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-bold" style={{ color: "hsl(38 92% 55%)" }}>₹{r.amount.toFixed(2)}</p>
                      <span className="pill" style={{ background: sc.bg, color: sc.color }}>{r.status}</span>
                    </div>
                    {r.method && (
                      <p className="text-xs text-muted-foreground">
                        {r.method.type === "upi" ? `UPI: ${r.method.upiId}` : `Bank ••••${(r.method.accountNumber || "").slice(-4)}`}
                      </p>
                    )}
                    {r.adminNote && <p className="text-xs text-muted-foreground mt-1">Note: {r.adminNote}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  {r.status === "pending" && (
                    <button onClick={() => cancelRequest(r.id)}
                      className="p-1.5 rounded-xl flex-shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
                      <X className="w-4 h-4" style={{ color: "hsl(0 84% 60%)" }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
