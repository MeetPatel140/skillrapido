import { useEffect, useState } from "react";
import { ArrowLeftRight, TrendingUp, TrendingDown, RefreshCw, Lock, ArrowDownToLine } from "lucide-react";

interface Transaction {
  id: number; walletId: number; type: string; amount: number;
  description: string; createdAt: string;
  userName: string; userEmail: string; userRole: string;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ComponentType<any>; sign: string }> = {
  credit: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)", label: "Credit", icon: TrendingUp, sign: "+" },
  debit: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)", label: "Debit", icon: TrendingDown, sign: "-" },
  escrow_hold: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)", label: "Escrow Hold", icon: Lock, sign: "-" },
  escrow_release: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Escrow Release", icon: TrendingUp, sign: "+" },
  commission: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "Commission", icon: TrendingDown, sign: "-" },
  withdrawal: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)", label: "Withdrawal", icon: ArrowDownToLine, sign: "-" },
};

const TABS = [["all","All"],["credit","Credits"],["debit","Debits"],["escrow_hold","Escrow"],["commission","Commission"],["withdrawal","Withdrawals"]];

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const load = (type: string) => {
    setLoading(true);
    fetch(`/api/admin/transactions?type=${type}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setTxns(Array.isArray(d) ? d : []))
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const totalCredits = txns.filter((t) => ["credit", "escrow_release"].includes(t.type)).reduce((a, t) => a + t.amount, 0);
  const totalDebits = txns.filter((t) => ["debit", "escrow_hold", "commission", "withdrawal"].includes(t.type)).reduce((a, t) => a + t.amount, 0);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{txns.length} records · +₹{totalCredits.toFixed(0)} in / -₹{totalDebits.toFixed(0)} out</p>
        </div>
        <button onClick={() => load(tab)} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Total In", value: `+₹${totalCredits.toFixed(0)}`, color: "hsl(142 71% 50%)" },
          { label: "Total Out", value: `-₹${totalDebits.toFixed(0)}`, color: "hsl(0 84% 60%)" },
          { label: "Records", value: String(txns.length), color: "hsl(var(--foreground))" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 rounded-xl p-1 w-fit flex-wrap" style={{ background: "hsl(var(--muted))" }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={tab === key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Transactions table */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [0,1,2,3,4].map((i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 rounded-lg animate-pulse" style={{ background: "hsl(var(--muted))" }} /></td></tr>
              ))
            ) : txns.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><ArrowLeftRight className="w-8 h-8 mx-auto mb-2" />No transactions</td></tr>
            ) : txns.map((tx) => {
              const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.debit;
              const Icon = cfg.icon;
              return (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <p className="truncate max-w-[200px] text-sm">{tx.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="font-medium text-sm">{tx.userName}</p>
                    <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold" style={{ color: cfg.color }}>
                      {cfg.sign}₹{Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="pill" style={{ background: cfg.bg, color: cfg.color, fontSize: "10px" }}>{cfg.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
