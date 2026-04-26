import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Star, Eye, EyeOff, RefreshCw } from "lucide-react";

interface Review {
  id: number; jobId: number; jobTitle: string; reviewerName: string; revieweeName: string;
  rating: number; comment: string | null; isHidden: boolean; hiddenReason: string | null; createdAt: string;
}

export default function AdminReviews() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "hidden">("all");
  const [hideId, setHideId] = useState<number | null>(null);
  const [hideReason, setHideReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = tab === "hidden" ? "?hidden=true" : "";
      const r = await fetch(`/api/admin/reviews${q}`, { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const toggleHide = async (r: Review, reason?: string) => {
    await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !r.isHidden, hiddenReason: reason || null }),
    });
    toast.success(r.isHidden ? "Review restored" : "Review hidden");
    setHideId(null); setHideReason("");
    load();
  };

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className="w-3.5 h-3.5" style={{ color: i < n ? "hsl(38 92% 55%)" : "hsl(var(--muted-foreground))", fill: i < n ? "hsl(38 92% 55%)" : "transparent" }} />
  ));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Moderate user reviews and ratings</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {[["all","All Reviews"],["hidden","Hidden"]].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v as any)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={tab === v ? { background: "hsl(221 83% 53%)", color: "white" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No reviews found.</p>
        </div>
      ) : rows.map((r) => (
        <div key={r.id} className={`rounded-2xl p-4 mb-3 border border-border transition-opacity ${r.isHidden ? "opacity-60" : ""}`}
          style={{ background: "hsl(var(--card))" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: r.isHidden ? "hsl(var(--muted))" : "rgba(234,179,8,0.12)" }}>
              <Star className="w-4 h-4" style={{ color: r.isHidden ? "hsl(var(--muted-foreground))" : "hsl(38 92% 55%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="flex">{stars(r.rating)}</div>
                <span className="font-bold text-sm">{r.rating}/5</span>
                {r.isHidden && <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "hsl(0 84% 60%)" }}>Hidden</span>}
              </div>
              <p className="text-sm">
                <span className="font-semibold">{r.reviewerName}</span> reviewed <span className="font-semibold">{r.revieweeName}</span>
                <span className="text-muted-foreground"> · Job: {r.jobTitle}</span>
              </p>
              {r.comment && <p className="text-sm text-muted-foreground mt-1">"{r.comment}"</p>}
              {r.hiddenReason && <p className="text-xs text-destructive mt-0.5">Hidden: {r.hiddenReason}</p>}
              <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex-shrink-0">
              {r.isHidden ? (
                <button onClick={() => toggleHide(r)} className="p-1.5 rounded-lg hover:bg-muted" title="Show review">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ) : (
                <button onClick={() => setHideId(r.id)} className="p-1.5 rounded-lg hover:bg-muted" title="Hide review">
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          {hideId === r.id && (
            <div className="mt-3 pt-3 border-t border-border">
              <input className="app-input mb-2" placeholder="Reason for hiding (optional)..." value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => toggleHide(r, hideReason)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(239,68,68,0.12)", color: "hsl(0 84% 60%)" }}>
                  Confirm Hide
                </button>
                <button onClick={() => setHideId(null)} className="px-3 py-2 rounded-xl text-sm" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
