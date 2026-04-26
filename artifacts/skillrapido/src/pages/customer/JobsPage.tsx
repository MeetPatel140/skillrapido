import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Zap, List } from "lucide-react";

interface Job {
  id: number; title: string; status: string; budget: number; bidCount: number;
  address: string; skill: { name: string; icon: string }; createdAt: string;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "assigned", label: "Active" },
  { key: "completed", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: "hsl(38 92% 60%)", bg: "rgba(234,179,8,0.12)", label: "Open" },
  assigned: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Assigned" },
  in_progress: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "In Progress" },
  completed: { color: "hsl(142 71% 55%)", bg: "rgba(34,197,94,0.12)", label: "Completed" },
  cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", label: "Cancelled" },
};

export default function JobsPage() {
  const [tab, setTab] = useState("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = tab !== "all" ? `?status=${tab}` : "";
    fetch(`/api/jobs${q}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your service requests</p>
      </div>

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === key
                ? { background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))", color: "white" }
                : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-3">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <List className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">Post a job to get started</p>
          </div>
        ) : jobs.map((job) => {
          const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
          return (
            <Link key={job.id} href={`/customer/jobs/${job.id}`}>
              <div
                className="w-full text-left rounded-2xl p-4 fade-in cursor-pointer"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "hsl(var(--muted))" }}>
                      {job.skill?.icon ?? "🔧"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.skill?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{job.address}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">₹{job.budget}</p>
                    <div className="mt-1 pill" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</div>
                  </div>
                </div>
                {(job.bidCount ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "hsl(221 83% 65%)" }}>
                    <Zap className="w-3 h-3" />
                    {job.bidCount} provider{job.bidCount !== 1 ? "s" : ""} responded
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
