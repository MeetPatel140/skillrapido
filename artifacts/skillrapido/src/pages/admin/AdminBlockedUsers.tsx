import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShieldX, Unlock, RefreshCw, Search } from "lucide-react";

interface BlockedUser {
  id: number; name: string; email: string; phone: string | null; role: string;
  walletBalance: number; isBlocked: boolean; createdAt: string;
}

const ROLE_COLOR: Record<string, { color: string; bg: string }> = {
  customer: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)" },
  provider: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)" },
};

export default function AdminBlockedUsers() {
  const [rows, setRows] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unblocking, setUnblocking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users?blocked=true", { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const unblock = async (id: number) => {
    setUnblocking(id);
    try {
      const r = await fetch(`/api/admin/users/${id}/block`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: false }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success("User unblocked");
      load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setUnblocking(null); }
  };

  const filtered = search
    ? rows.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blocked Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} accounts currently blocked</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="app-input pl-9" placeholder="Search blocked users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <ShieldX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold mb-1">No blocked users</p>
          <p className="text-muted-foreground text-sm">All accounts are currently in good standing.</p>
        </div>
      ) : filtered.map((u) => {
        const rc = ROLE_COLOR[u.role] || ROLE_COLOR.customer;
        return (
          <div key={u.id} className="rounded-2xl p-4 mb-3 border border-border flex items-center gap-4" style={{ background: "hsl(var(--card))" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: "rgba(239,68,68,0.12)", color: "hsl(0 84% 60%)" }}>
              {u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="font-bold text-sm">{u.name}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: rc.bg, color: rc.color }}>{u.role}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">Blocked</span>
              </div>
              <p className="text-sm text-muted-foreground">{u.email}</p>
              {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
              <p className="text-xs text-muted-foreground">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold mb-2">₹{(u.walletBalance ?? 0).toFixed(2)}</p>
              <button onClick={() => unblock(u.id)} disabled={unblocking === u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(34,197,94,0.12)", color: "hsl(142 71% 50%)" }}>
                <Unlock className="w-3.5 h-3.5" />
                {unblocking === u.id ? "..." : "Unblock"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
