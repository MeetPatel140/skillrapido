import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquareWarning, RefreshCw, CheckCircle2 } from "lucide-react";

interface Dispute {
  id: number; jobId: number; raisedBy: number; raisedByName: string; jobTitle: string;
  reason: string; description: string | null; status: string;
  resolution: string | null; createdAt: string; updatedAt: string;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  open: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)" },
  under_review: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)" },
  resolved: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)" },
  closed: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
};

const TABS = ["all", "open", "under_review", "resolved", "closed"];

export default function AdminDisputes() {
  const [rows, setRows] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("open");
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tab !== "all" ? `?status=${tab}` : "";
      const r = await fetch(`/api/admin/disputes${q}`, { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const updateStatus = async (id: number, status: string, res?: string) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/disputes/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution: res || null }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(`Dispute ${status}`);
      setResolveId(null); setResolution("");
      load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Disputes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage job disputes and resolutions</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold capitalize"
            style={tab === t
              ? { background: "hsl(221 83% 53%)", color: "white" }
              : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <MessageSquareWarning className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No disputes in this category.</p>
        </div>
      ) : rows.map((d) => {
        const sc = STATUS_COLORS[d.status] || STATUS_COLORS.open;
        return (
          <div key={d.id} className="rounded-2xl p-4 mb-3 border border-border" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                <MessageSquareWarning className="w-4 h-4" style={{ color: sc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-sm">Dispute #{d.id}</p>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.color }}>{d.status.replace("_", " ")}</span>
                </div>
                <p className="text-sm font-medium">Job: <span className="text-muted-foreground">{d.jobTitle}</span></p>
                <p className="text-sm">Raised by: <span className="font-semibold">{d.raisedByName}</span></p>
                <p className="text-sm text-muted-foreground mt-1">Reason: {d.reason}</p>
                {d.description && <p className="text-sm text-muted-foreground mt-0.5">{d.description}</p>}
                {d.resolution && <p className="text-sm mt-1"><span className="font-semibold">Resolution:</span> {d.resolution}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(d.createdAt).toLocaleString()}</p>
              </div>
              {d.status !== "resolved" && d.status !== "closed" && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {d.status === "open" && (
                    <button onClick={() => updateStatus(d.id, "under_review")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(234,179,8,0.15)", color: "hsl(38 92% 55%)" }}>
                      Review
                    </button>
                  )}
                  <button onClick={() => setResolveId(d.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.12)", color: "hsl(142 71% 50%)" }}>
                    Resolve
                  </button>
                  <button onClick={() => updateStatus(d.id, "closed")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Resolve form */}
            {resolveId === d.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <textarea className="app-input resize-none mb-2" rows={2} placeholder="Resolution details..." value={resolution} onChange={(e) => setResolution(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(d.id, "resolved", resolution)} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "hsl(142 71% 40%)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Resolve
                  </button>
                  <button onClick={() => setResolveId(null)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
