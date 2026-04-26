import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";

interface Job {
  id: number; title: string; status: string; budget: number; providerAmount: number;
  address: string; skill: { name: string; icon: string }; customerName: string; createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: "hsl(38 92% 60%)", bg: "rgba(234,179,8,0.12)", label: "Open" },
  assigned: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Assigned" },
  in_progress: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "In Progress" },
  completed: { color: "hsl(142 71% 55%)", bg: "rgba(34,197,94,0.12)", label: "Completed" },
  cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", label: "Cancelled" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Done" },
];

export default function ProviderJobsPage() {
  const [tab, setTab] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/providers/jobs?status=${tab}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Jobs you've accepted</p>
      </div>

      <div className="px-5 mb-4 flex gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={tab === key
              ? { background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))", color: "white" }
              : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
            }>
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 pb-8 flex flex-col gap-3">
        {loading ? (
          [0,1,2].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">No jobs yet</p>
            <p className="text-sm text-muted-foreground mt-1">Go online and accept jobs to see them here</p>
          </div>
        ) : jobs.map((job) => {
          const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
          return (
            <div key={job.id} className="rounded-2xl p-4 fade-in" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "hsl(var(--muted))" }}>
                    {job.skill?.icon ?? "🔧"}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.skill?.name} • {job.customerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{job.address}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" style={{ color: "hsl(142 71% 55%)" }}>+₹{(job.providerAmount ?? 0).toFixed(0)}</p>
                  <div className="mt-1 pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
