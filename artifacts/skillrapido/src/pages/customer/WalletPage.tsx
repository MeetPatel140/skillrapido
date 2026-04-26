import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Lock, TrendingUp } from "lucide-react";

interface WalletData {
  wallet: { id: number; balance: number; escrowBalance: number };
  transactions: { id: number; type: string; amount: number; description: string; createdAt: string }[];
}

const TX_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, color: string, label: string }> = {
  credit: { icon: ArrowUpCircle, color: "hsl(142 71% 55%)", label: "Credit" },
  debit: { icon: ArrowDownCircle, color: "hsl(0 84% 60%)", label: "Debit" },
  escrow_hold: { icon: Lock, color: "hsl(38 92% 60%)", label: "Escrow Hold" },
  escrow_release: { icon: TrendingUp, color: "hsl(221 83% 60%)", label: "Escrow Release" },
  commission: { icon: ArrowDownCircle, color: "hsl(262 83% 68%)", label: "Commission" },
};

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [topping, setTopping] = useState(false);

  const load = () => {
    fetch("/api/wallet", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && !d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;
    setTopping(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`₹${amount} added to wallet!`);
      setTopupAmount("");
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setTopping(false); }
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your funds</p>
      </div>

      {/* Balance cards */}
      <div className="px-5 mb-6">
        <div className="rounded-3xl p-6 text-center mb-3" style={{ background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))" }}>
          <Wallet className="w-8 h-8 text-white/80 mx-auto mb-2" />
          <p className="text-white/70 text-sm">Available Balance</p>
          <p className="text-4xl font-bold text-white mt-1">
            {loading ? "—" : data?.wallet?.balance != null ? `₹${data.wallet.balance.toFixed(2)}` : "—"}
          </p>
          {data && (data.wallet?.escrowBalance ?? 0) > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <Lock className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-medium">₹{(data.wallet?.escrowBalance ?? 0).toFixed(2)} in escrow</span>
            </div>
          )}
        </div>

        {/* Top up */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Add Money (₹)</label>
            <input
              type="number"
              className="app-input"
              placeholder="100, 500, 1000..."
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              min="1"
            />
          </div>
          <button
            onClick={handleTopup}
            disabled={topping || !topupAmount}
            className="btn-primary px-5 py-3 text-sm mt-6 disabled:opacity-50"
          >
            {topping ? "Adding..." : "Add"}
          </button>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mt-3">
          {[100, 500, 1000, 2000].map((amt) => (
            <button
              key={amt}
              onClick={() => setTopupAmount(String(amt))}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: topupAmount === String(amt) ? "rgba(59,130,246,0.2)" : "hsl(var(--muted))", color: topupAmount === String(amt) ? "hsl(221 83% 65%)" : "hsl(var(--muted-foreground))" }}
            >
              ₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 pb-8">
        <h2 className="font-bold mb-3">Transaction History</h2>
        {loading ? (
          [0,1,2].map((i) => <div key={i} className="h-16 rounded-xl mb-3 animate-pulse" style={{ background: "hsl(var(--muted))" }} />)
        ) : !(data?.transactions?.length) ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.transactions.map((tx) => {
              const cfg = TX_CONFIG[tx.type] || TX_CONFIG.debit;
              const Icon = cfg.icon;
              const sign = ["credit", "escrow_release"].includes(tx.type) ? "+" : "-";
              return (
                <div key={tx.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.color}18` }}>
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="font-bold text-sm flex-shrink-0" style={{ color: cfg.color }}>
                    {sign}₹{Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
