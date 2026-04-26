import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import {
  ChevronLeft, CheckCircle2, Clock, Star, AlertTriangle,
  Pencil, X, MapPin, Briefcase, Save,
} from "lucide-react";

interface Bid {
  id: number; providerId: number; providerName: string; providerRating: number | null;
  providerTotalJobs: number; message: string | null; status: string; createdAt: string;
}
interface Skill { id: number; name: string; category: string; icon: string; }
interface Job {
  id: number; title: string; description: string; status: string;
  budget: number; commission: number; providerAmount: number;
  address: string; latitude: number | null; longitude: number | null;
  skill: { id: number; name: string; icon: string; category: string };
  customerName: string; providerName: string | null; providerId: number | null;
  bidCount: number; createdAt: string; completedAt: string | null; bids: Bid[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: "hsl(38 92% 60%)", bg: "rgba(234,179,8,0.12)", label: "Open" },
  assigned: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Assigned" },
  in_progress: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "In Progress" },
  completed: { color: "hsl(142 71% 55%)", bg: "rgba(34,197,94,0.12)", label: "Completed" },
  cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", label: "Cancelled" },
};

const COMMISSION_RATE = 0.10;

function EditJobForm({
  job, skills, onSave, onCancel,
}: {
  job: Job; skills: Skill[];
  onSave: (updated: Job) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [address, setAddress] = useState(job.address);
  const [budget, setBudget] = useState(String(job.budget));
  const [skillId, setSkillId] = useState(job.skill?.id ?? 0);
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [lat, setLat] = useState(job.latitude ?? 28.6139);
  const [lon, setLon] = useState(job.longitude ?? 77.209);

  const budgetNum = parseFloat(budget) || 0;
  const newCommission = budgetNum * COMMISSION_RATE;
  const newTotal = budgetNum + newCommission;
  const oldTotal = job.budget * (1 + COMMISSION_RATE);
  const diff = newTotal - oldTotal;

  const detectLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        setGeoLoading(false);
        toast.success("Location updated");
      },
      () => { setGeoLoading(false); toast.error("Could not detect location"); }
    );
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !address.trim() || budgetNum <= 0) {
      toast.error("Please fill all fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, address, budget: budgetNum, skillId, latitude: lat, longitude: lon }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      toast.success("Job updated! Providers re-notified.");
      onSave({ ...updated, bids: job.bids });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">Edit Job</h2>
        <button onClick={onCancel} className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--muted))" }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Skill selector */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Service Type
        </p>
        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.filter((s) => s.category === cat).map((sk) => {
                const sel = sk.id === skillId;
                return (
                  <button key={sk.id} type="button" onClick={() => setSkillId(sk.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium"
                    style={sel
                      ? { background: "rgba(59,130,246,0.2)", border: "1.5px solid hsl(221 83% 53%)", color: "hsl(221 83% 65%)" }
                      : { background: "hsl(var(--card))", border: "1.5px solid transparent", color: "hsl(var(--muted-foreground))" }
                    }>
                    <span>{sk.icon}</span><span>{sk.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Job details */}
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Title</label>
          <input className="app-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Description</label>
          <textarea className="app-input resize-none h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Budget (₹)</label>
          <input type="number" min="1" className="app-input" value={budget} onChange={(e) => setBudget(e.target.value)} />
          {budgetNum > 0 && (
            <div className="mt-2 p-3 rounded-xl text-xs flex flex-col gap-1"
              style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Total (incl. 10%)</span>
                <span className="font-bold text-primary">₹{newTotal.toFixed(2)}</span>
              </div>
              {diff !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{diff > 0 ? "Extra deducted" : "Refunded"}</span>
                  <span className={`font-semibold ${diff > 0 ? "text-destructive" : "text-success"}`}>
                    {diff > 0 ? "-" : "+"}₹{Math.abs(diff).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Address
            </label>
            <button type="button" onClick={detectLocation} disabled={geoLoading}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: "rgba(59,130,246,0.12)", color: "hsl(221 83% 65%)" }}>
              {geoLoading ? "Detecting..." : "Auto-detect"}
            </button>
          </div>
          <input className="app-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 h-12 rounded-2xl text-sm font-semibold"
          style={{ border: "1.5px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 h-12 btn-primary flex items-center justify-center gap-2 text-sm">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function JobDetailPage({ routeId }: { routeId?: string }) {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/customer/jobs/:id");
  const jobId = routeId ?? params?.id;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  const loadJob = () => {
    if (!jobId) return;
    fetch(`/api/jobs/${jobId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || data.error) { setNotFound(true); return; }
        setJob({ ...data, bids: Array.isArray(data.bids) ? data.bids : [] });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJob(); }, [jobId]);

  useEffect(() => {
    fetch("/api/skills", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setSkills(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleComplete = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/complete`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast.success(`Job completed! Provider paid ₹${data.providerPaid?.toFixed(2) ?? 0}`);
      loadJob();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/cancel`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Job cancelled. Refund processed.");
      loadJob();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(false); }
  };

  const handleSelectBid = async (bidId: number) => {
    if (!job) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/bids/${bidId}/accept`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Provider selected!");
      loadJob();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (notFound || !job) return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <p className="text-2xl mb-2">😕</p>
      <p className="font-semibold">Job not found</p>
      <button onClick={() => navigate("/customer/jobs")} className="mt-4 text-sm text-primary font-semibold">Back to Jobs</button>
    </div>
  );

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
  const bids = job.bids ?? [];
  const canEdit = job.status === "open" && job.providerId === null;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate("/customer/jobs")} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg line-clamp-1">{job.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}
              title="Edit Job"
            >
              <Pencil className="w-4 h-4 text-primary" />
            </button>
          )}
          <div className="pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
        </div>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-4">

        {/* Edit form */}
        {editing && (
          <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "2px solid hsl(221 83% 53%)" }}>
            <EditJobForm
              job={job}
              skills={skills}
              onSave={(updated) => { setJob(updated); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {/* Job info (hidden while editing) */}
        {!editing && (
          <>
            <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "hsl(var(--muted))" }}>
                  {job.skill?.icon ?? "🔧"}
                </div>
                <div>
                  <p className="font-bold">{job.skill?.name ?? "Service"}</p>
                  <p className="text-xs text-muted-foreground">{job.skill?.category}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{job.address}</span>
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold mb-4">Payment Details</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Job Budget", value: `₹${(job.budget ?? 0).toFixed(2)}` },
                  { label: "App Commission (10%)", value: `₹${(job.commission ?? 0).toFixed(2)}`, sub: true },
                  { label: "Total Charged to You", value: `₹${((job.budget ?? 0) * 1.1).toFixed(2)}`, highlight: true, color: "hsl(221 83% 60%)" },
                  { label: "Provider Gets (90%)", value: `₹${(job.providerAmount ?? 0).toFixed(2)}`, color: "hsl(142 71% 55%)" },
                ].map(({ label, value, highlight, sub, color }) => (
                  <div key={label} className={`flex justify-between items-center ${highlight ? "pt-2 border-t border-border" : ""}`}>
                    <span className={`text-sm ${sub ? "text-muted-foreground" : ""}`}>{label}</span>
                    <span className="font-bold text-sm" style={{ color: color || "hsl(var(--foreground))" }}>{value}</span>
                  </div>
                ))}
              </div>
              {job.status === "open" && (
                <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  <p className="text-xs text-warning">Funds held in escrow. Released to provider on completion.</p>
                </div>
              )}
            </div>

            {/* Provider info */}
            {job.providerName && (
              <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <h3 className="font-bold mb-3">Assigned Provider</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "hsl(221 83% 60%)" }}>
                    {job.providerName[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{job.providerName}</p>
                    <p className="text-xs text-muted-foreground">Service Provider</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bids */}
            {job.status === "open" && bids.length > 0 && (
              <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <h3 className="font-bold mb-4">{bids.length} Provider{bids.length !== 1 ? "s" : ""} Responded</h3>
                <div className="flex flex-col gap-3">
                  {bids.filter((b) => b.status === "pending").map((bid) => (
                    <div key={bid.id} className="rounded-2xl p-4" style={{ background: "hsl(var(--muted))" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "hsl(221 83% 60%)" }}>
                            {bid.providerName?.[0] ?? "P"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{bid.providerName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {bid.providerRating != null && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-warning text-warning" />
                                  <span className="text-xs text-muted-foreground">{bid.providerRating.toFixed(1)}</span>
                                </div>
                              )}
                              <span className="text-xs text-muted-foreground">{bid.providerTotalJobs ?? 0} jobs</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleSelectBid(bid.id)} disabled={actionLoading} className="btn-success px-4 py-2 text-sm">
                          Accept
                        </button>
                      </div>
                      {bid.message && <p className="text-xs text-muted-foreground mt-2">{bid.message}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit hint for open jobs */}
            {canEdit && (
              <div className="rounded-2xl p-3 flex items-center gap-2"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                <Pencil className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-xs text-primary">
                  This job hasn't been accepted yet. Tap the pencil icon to edit details — providers will be re-notified.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {["assigned", "in_progress"].includes(job.status) && (
                <button onClick={handleComplete} disabled={actionLoading}
                  className="btn-success h-14 text-base w-full flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  {actionLoading ? "Processing..." : "Mark as Completed"}
                </button>
              )}
              {["open", "assigned"].includes(job.status) && (
                <button onClick={handleCancel} disabled={actionLoading}
                  className="h-14 rounded-2xl text-sm font-semibold w-full"
                  style={{ border: "1.5px solid hsl(var(--destructive))", color: "hsl(var(--destructive))" }}>
                  {actionLoading ? "Cancelling..." : "Cancel Job & Refund"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
