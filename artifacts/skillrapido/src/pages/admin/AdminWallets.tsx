import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Search, Plus, Minus, RefreshCw } from "lucide-react";

interface WalletUser {
  id: number; name: string; email: string; role: string;
  walletBalance: number; escrowBalance: number; walletId: number | null;
  isBlocked: boolean; createdAt: string;
}

export default function AdminWallets() {
  const [users, setUsers] = useState<WalletUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjustModal, setAdjustModal] = useState<WalletUser | null>(null);
  const [form, setForm] = useState({ type: "credit", amount: "", note: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleAdjust = async () => {
    if (!adjustModal || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/wallets/${adjustModal.id}/adjust`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: form.type, amount: parseFloat(form.amount), description: form.note || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(`₹${form.amount} ${form.type} applied to ${adjustModal.name}`);
      setAdjustModal(null);
      setForm({ type: "credit", amount: "", note: "" });
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const totalBalance = users.reduce((a, u) => a + (u.walletBalance ?? 0), 0);
  const totalEscrow = users.reduce((a, u) => a + (u.escrowBalance ?? 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total: ₹{totalBalance.toFixed(0)} balance · ₹{totalEscrow.toFixed(0)} escrow
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Wallet Balance", value: `₹${totalBalance.toFixed(0)}`, color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.1)" },
          { label: "Total in Escrow", value: `₹${totalEscrow.toFixed(0)}`, color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.1)" },
          { label: "Active Wallets", value: String(users.filter(u => (u.walletBalance ?? 0) > 0).length), color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.1)" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="app-input pl-9 h-10 text-sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Wallet table */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Role</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Escrow</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [0,1,2,3,4].map((i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 rounded-lg animate-pulse" style={{ background: "hsl(var(--muted))" }} /></td></tr>
              ))
            ) : filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-muted-foreground capitalize">{u.role}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <p className="font-bold" style={{ color: (u.walletBalance ?? 0) > 0 ? "hsl(142 71% 50%)" : "hsl(var(--muted-foreground))" }}>
                    ₹{(u.walletBalance ?? 0).toFixed(2)}
                  </p>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <p className="text-sm" style={{ color: (u.escrowBalance ?? 0) > 0 ? "hsl(38 92% 55%)" : "hsl(var(--muted-foreground))" }}>
                    ₹{(u.escrowBalance ?? 0).toFixed(2)}
                  </p>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setAdjustModal(u); setForm({ type: "credit", amount: "", note: "" }); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-muted" title="Add balance">
                      <Plus className="w-3.5 h-3.5" style={{ color: "hsl(142 71% 50%)" }} />
                    </button>
                    <button onClick={() => { setAdjustModal(u); setForm({ type: "debit", amount: "", note: "" }); }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-muted" title="Remove balance">
                      <Minus className="w-3.5 h-3.5" style={{ color: "hsl(0 84% 60%)" }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust modal */}
      {adjustModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="font-bold text-lg mb-1">Adjust Wallet</h3>
            <p className="text-sm text-muted-foreground mb-4">{adjustModal.name} · Current: ₹{(adjustModal.walletBalance ?? 0).toFixed(2)}</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["credit", "Add Money", "hsl(142 71% 50%)"], ["debit", "Remove Money", "hsl(0 84% 60%)"]].map(([val, label, color]) => (
                    <button key={val} onClick={() => setForm({ ...form, type: val })}
                      className="py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      style={form.type === val
                        ? { background: `${color}22`, color, border: `1.5px solid ${color}` }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1.5px solid transparent" }
                      }>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Amount (₹)</label>
                <input className="app-input" type="number" min="1" placeholder="Enter amount..."
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Note (optional)</label>
                <input className="app-input" placeholder="Reason for adjustment..."
                  value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdjust} disabled={saving || !form.amount}
                className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                {saving ? "Processing..." : `${form.type === "credit" ? "Add" : "Remove"} ₹${form.amount || "0"}`}
              </button>
              <button onClick={() => setAdjustModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
