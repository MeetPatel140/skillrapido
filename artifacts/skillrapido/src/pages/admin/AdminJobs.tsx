import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Briefcase, XCircle, Search } from "lucide-react";

interface Job {
  id: number; title: string; status: string; budget: number; commission: number;
  address: string; customerName: string; providerName: string | null; bidCount: number;
  skill: { name: string; icon: string }; createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)", label: "Open" },
  assigned: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Assigned" },
  in_progress: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "In Progress" },
  completed: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)", label: "Completed" },
  cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", label: "Cancelled" },
};

const TABS = [["all","All"],["open","Open"],["assigned","Active"],["in_progress","In Progress"],["completed","Done"],["cancelled","Cancelled"]];

export default function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const load = (status: string) => {
    setLoading(true);
    fetch(`/api/admin/jobs?status=${status}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const filtered = jobs.filter((j) => !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.customerName?.toLowerCase().includes(search.toLowerCase()));

  const handleCancel = async (job: Job) => {
    if (!confirm(`Cancel job "${job.title}" and refund customer?`)) return;
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/cancel`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Job cancelled and refunded");
      load(tab);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const totalRevenue = filtered.filter(j => j.status === "completed").reduce((a, j) => a + (j.budget ?? 0), 0);
  const totalCommission = filtered.filter(j => j.status === "completed").reduce((a, j) => a + (j.commission ?? 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} shown · ₹{totalRevenue.toFixed(0)} revenue · ₹{totalCommission.toFixed(0)} commission</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="app-input pl-9 h-10 text-sm" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl p-1 flex-wrap" style={{ background: "hsl(var(--muted))" }}>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={tab === key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs table */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Provider</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [0,1,2,3,4].map((i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 rounded-lg animate-pulse" style={{ background: "hsl(var(--muted))" }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Briefcase className="w-8 h-8 mx-auto mb-2" />No jobs found</td></tr>
            ) : filtered.map((job) => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
              return (
                <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg flex-shrink-0">{job.skill?.icon ?? "🔧"}</span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate max-w-[180px]">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.skill?.name} · #{job.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">{job.customerName}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">{job.providerName || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-sm">₹{(job.budget ?? 0).toFixed(0)}</p>
                    <p className="text-xs" style={{ color: "hsl(0 84% 60%)" }}>+₹{(job.commission ?? 0).toFixed(0)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!["completed","cancelled"].includes(job.status) && (
                      <button onClick={() => handleCancel(job)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Cancel job">
                        <XCircle className="w-4 h-4 text-destructive" />
                      </button>
                    )}
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
