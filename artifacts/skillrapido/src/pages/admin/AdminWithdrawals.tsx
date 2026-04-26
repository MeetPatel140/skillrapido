import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Check, X, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Withdrawal {
  id: number; userId: number; amount: number; status: string; adminNote: string | null;
  createdAt: string; processedAt: string | null;
  userName: string; userEmail: string; walletBalance: number;
  method: { type: string; accountNumber?: string; ifscCode?: string; bankName?: string; upiId?: string; accountName?: string } | null;
}

const STATUS: Record<string, { color: string; bg: string; icon: React.ComponentType<any>; label: string }> = {
  pending: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)", icon: Clock, label: "Pending" },
  processing: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", icon: Loader2, label: "Processing" },
  approved: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)", icon: XCircle, label: "Rejected" },
};

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [processing, setProcessing] = useState<number | null>(null);
  const [noteModal, setNoteModal] = useState<{ id: number; action: string } | null>(null);
  const [note, setNote] = useState("");

  const load = (status: string) => {
    setLoading(true);
    fetch(`/api/admin/withdrawals?status=${status}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setWithdrawals(Array.isArray(d) ? d : []))
      .catch(() => setWithdrawals([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const updateStatus = async (id: number, status: string, adminNote?: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: adminNote || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(`Withdrawal ${status}`);
      setNoteModal(null);
      setNote("");
      load(tab);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  };

  const totalPending = withdrawals.filter((w) => w.status === "pending").reduce((a, w) => a + w.amount, 0);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Withdrawals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tab === "pending" ? `₹${totalPending.toFixed(0)} pending approval` : `${withdrawals.length} records`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 rounded-xl p-1 w-fit" style={{ background: "hsl(var(--muted))" }}>
        {[["pending","Pending"],["processing","Processing"],["approved","Approved"],["rejected","Rejected"],["all","All"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={tab === key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          [0,1,2].map((i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)
        ) : withdrawals.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <ArrowDownToLine className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No {tab} withdrawals</p>
          </div>
        ) : withdrawals.map((w) => {
          const sc = STATUS[w.status] || STATUS.pending;
          const Icon = sc.icon;
          return (
            <div key={w.id} className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                    <Icon className="w-5 h-5" style={{ color: sc.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-lg" style={{ color: "hsl(38 92% 55%)" }}>₹{w.amount.toFixed(2)}</p>
                      <span className="pill" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </div>
                    <p className="font-semibold text-sm text-foreground">{w.userName}</p>
                    <p className="text-xs text-muted-foreground">{w.userEmail}</p>
                    {w.method && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                          {w.method.type === "upi" ? `UPI: ${w.method.upiId}` : `${w.method.bankName || "Bank"} ••••${(w.method.accountNumber || "").slice(-4)}`}
                        </span>
                        {w.method.accountName && <span className="text-xs text-muted-foreground">{w.method.accountName}</span>}
                        {w.method.ifscCode && <span className="text-xs text-muted-foreground">IFSC: {w.method.ifscCode}</span>}
                      </div>
                    )}
                    {w.adminNote && <p className="text-xs text-muted-foreground mt-1">Note: {w.adminNote}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Requested: {new Date(w.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">User wallet: ₹{w.walletBalance.toFixed(0)}</p>
                  </div>
                </div>

                {(w.status === "pending" || w.status === "processing") && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {w.status === "pending" && (
                      <button onClick={() => updateStatus(w.id, "processing")}
                        disabled={processing === w.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                        style={{ background: "rgba(59,130,246,0.12)", color: "hsl(221 83% 60%)" }}>
                        <Loader2 className="w-3 h-3" /> Mark Processing
                      </button>
                    )}
                    <button onClick={() => { setNoteModal({ id: w.id, action: "approved" }); setNote(""); }}
                      disabled={processing === w.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.12)", color: "hsl(142 71% 50%)" }}>
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => { setNoteModal({ id: w.id, action: "rejected" }); setNote(""); }}
                      disabled={processing === w.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", color: "hsl(0 84% 60%)" }}>
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md mx-4 rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="font-bold text-lg mb-1 capitalize">{noteModal.action === "approved" ? "Approve" : "Reject"} Withdrawal</h3>
            <p className="text-sm text-muted-foreground mb-4">Add an optional note for the user.</p>
            <textarea className="app-input resize-none h-24 w-full mb-4" placeholder="Optional admin note..."
              value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => updateStatus(noteModal.id, noteModal.action, note)}
                className={noteModal.action === "approved" ? "btn-success flex-1 py-2.5 text-sm" : "btn-danger flex-1 py-2.5 text-sm"}>
                Confirm {noteModal.action === "approved" ? "Approval" : "Rejection"}
              </button>
              <button onClick={() => setNoteModal(null)}
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
