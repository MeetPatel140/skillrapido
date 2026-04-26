import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shield, Star, Lock, Unlock, Check, Search } from "lucide-react";

interface Provider {
  id: number; userId: number; name: string; email: string; phone: string | null;
  isOnline: boolean; isVerified: boolean; rating: number | null; isBlocked: boolean;
  totalEarnings: number; totalJobs: number; bio: string | null;
  skills: { id: number; name: string; icon: string }[]; avatarUrl: string | null;
}

export default function AdminProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterVerified, setFilterVerified] = useState<"all" | "verified" | "unverified">("all");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/providers", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setProviders(Array.isArray(d) ? d : []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleVerify = async (p: Provider) => {
    try {
      const res = await fetch(`/api/admin/providers/${p.id}/verify`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !p.isVerified }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(p.isVerified ? "Verification removed" : "Provider verified!");
      load();
    } catch { toast.error("Failed to update"); }
  };

  const toggleBlock = async (p: Provider) => {
    if (!confirm(`${p.isBlocked ? "Unblock" : "Block"} provider ${p.name}?`)) return;
    try {
      await fetch(`/api/admin/users/${p.userId}/block`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !p.isBlocked }),
      });
      toast.success(p.isBlocked ? "Provider unblocked" : "Provider blocked");
      load();
    } catch { toast.error("Failed"); }
  };

  const filtered = providers.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    const matchVerified = filterVerified === "all" || (filterVerified === "verified" ? p.isVerified : !p.isVerified);
    return matchSearch && matchVerified;
  });

  const onlineCount = providers.filter((p) => p.isOnline).length;
  const verifiedCount = providers.filter((p) => p.isVerified).length;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {providers.length} total · {onlineCount} online · {verifiedCount} verified
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="app-input pl-9 h-10 text-sm" placeholder="Search providers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: "hsl(var(--muted))" }}>
          {[["all","All"],["verified","Verified"],["unverified","Unverified"]].map(([key, label]) => (
            <button key={key} onClick={() => setFilterVerified(key as any)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={filterVerified === key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider table */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provider</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Jobs / Earnings</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Skills</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [0,1,2,3].map((i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-10 rounded-lg animate-pulse" style={{ background: "hsl(var(--muted))" }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Shield className="w-8 h-8 mx-auto mb-2" />No providers found</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: "rgba(139,92,246,0.15)", color: "hsl(262 83% 68%)" }}>
                      {p.name?.[0]?.toUpperCase() ?? "P"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate max-w-[140px]">{p.name}</p>
                        {p.isVerified && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(142 71% 50%)" }} />}
                        {p.isBlocked && <span className="text-xs" style={{ color: "hsl(0 84% 60%)" }}>🚫</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{p.email}</p>
                      {p.rating != null && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-warning text-warning" />
                          <span className="text-xs text-warning">{p.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell">
                  <span className={`w-2 h-2 rounded-full inline-block mr-1.5`}
                    style={{ background: p.isOnline ? "hsl(142 71% 50%)" : "hsl(var(--muted-foreground))" }} />
                  <span className="text-xs">{p.isOnline ? "Online" : "Offline"}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  <p className="font-semibold">{p.totalJobs} jobs</p>
                  <p className="text-xs" style={{ color: "hsl(142 71% 50%)" }}>₹{(p.totalEarnings ?? 0).toFixed(0)}</p>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(p.skills ?? []).slice(0, 3).map((s) => (
                      <span key={s.id} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "hsl(var(--muted))" }}>{s.icon} {s.name}</span>
                    ))}
                    {(p.skills?.length ?? 0) > 3 && <span className="text-xs text-muted-foreground">+{p.skills.length - 3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button onClick={() => toggleVerify(p)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                      style={p.isVerified
                        ? { background: "rgba(34,197,94,0.12)", color: "hsl(142 71% 50%)" }
                        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                      }>
                      {p.isVerified ? "✓ Verified" : "Verify"}
                    </button>
                    <button onClick={() => toggleBlock(p)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title={p.isBlocked ? "Unblock" : "Block"}>
                      {p.isBlocked ? <Unlock className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
