import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { UserCheck, RefreshCw, CheckCircle2, X, Star } from "lucide-react";

interface Provider {
  id: number; userId: number; name: string; email: string; phone: string | null;
  bio: string | null; isVerified: boolean; isOnline: boolean; rating: number | null;
  totalJobs: number; totalEarnings: number; createdAt: string; skills: { name: string; icon: string }[];
}

export default function AdminProviderQueue() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/providers", { credentials: "include" });
      if (r.ok) {
        const all: Provider[] = await r.json();
        setRows(all.filter((p) => !p.isVerified));
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const verify = async (providerId: number, verified: boolean) => {
    setSaving(providerId);
    try {
      const r = await fetch(`/api/admin/providers/${providerId}/verify`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: verified }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(verified ? "Provider verified!" : "Verification rejected");
      load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSaving(null); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Verification Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Providers awaiting verification — {rows.length} pending</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold mb-1">All caught up!</p>
          <p className="text-muted-foreground text-sm">No providers pending verification.</p>
        </div>
      ) : rows.map((p) => (
        <div key={p.id} className="rounded-2xl p-5 mb-4 border border-border" style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,hsl(262 83% 53%),hsl(221 83% 58%))" }}>
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-bold">{p.name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-yellow-500/10 text-yellow-600">Unverified</span>
                {p.isOnline && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-green-500/10 text-green-600">Online</span>}
              </div>
              <p className="text-sm text-muted-foreground">{p.email}</p>
              {p.phone && <p className="text-sm text-muted-foreground">{p.phone}</p>}
              {p.bio && <p className="text-sm mt-2 text-muted-foreground">{p.bio}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.skills?.map((s) => (
                  <span key={s.name} className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    {s.icon} {s.name}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{p.totalJobs} jobs</span>
                {p.rating && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />{p.rating.toFixed(1)}</span>}
                <span>Joined {new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => verify(p.id, true)} disabled={saving === p.id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "hsl(142 71% 40%)" }}>
                <CheckCircle2 className="w-4 h-4" /> Verify
              </button>
              <button onClick={() => verify(p.id, false)} disabled={saving === p.id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.1)", color: "hsl(0 84% 60%)" }}>
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
