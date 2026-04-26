import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { PlusCircle, ChevronRight, Clock, CheckCircle2, XCircle, Wallet, Zap } from "lucide-react";

interface DashboardData {
  totalJobsPosted: number;
  openJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalSpent: number;
  averageJobCost: number;
  recentJobs: Job[];
}

interface Job {
  id: number;
  title: string;
  status: string;
  budget: number;
  commission: number;
  providerAmount: number;
  address: string;
  skill: { id: number; name: string; category: string; icon: string };
  bidCount: number;
  createdAt: string;
}

interface WalletData { wallet: { balance: number; escrowBalance: number } }

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { color: "hsl(38 92% 60%)", bg: "rgba(234,179,8,0.12)", label: "Open", icon: Clock },
  assigned: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)", label: "Assigned", icon: Zap },
  in_progress: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)", label: "In Progress", icon: Zap },
  completed: { color: "hsl(142 71% 55%)", bg: "rgba(34,197,94,0.12)", label: "Completed", icon: CheckCircle2 },
  cancelled: { color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))", label: "Cancelled", icon: XCircle },
};

export default function CustomerHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/customer", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/wallet", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
    ]).then(([d, w]) => {
      if (d && !d.error) setData(d);
      if (w && !w.error) setWallet(w);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, transparent 100%)" }}>
        <p className="text-muted-foreground text-sm">{greeting},</p>
        <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>

        {/* Wallet pill */}
        <button
          onClick={() => navigate("/customer/wallet")}
          className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl w-full"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
            <Wallet className="w-5 h-5" style={{ color: "hsl(142 71% 55%)" }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs text-muted-foreground font-medium">Wallet Balance</p>
            <p className="text-lg font-bold" style={{ color: "hsl(142 71% 55%)" }}>
              {wallet ? `₹${wallet.wallet.balance.toFixed(2)}` : "—"}
            </p>
          </div>
          {wallet && wallet.wallet.escrowBalance > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">In Escrow</p>
              <p className="text-sm font-semibold text-warning">₹{wallet.wallet.escrowBalance.toFixed(2)}</p>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Jobs", value: data?.totalJobsPosted ?? 0, color: "hsl(221 83% 60%)" },
          { label: "Completed", value: data?.completedJobs ?? 0, color: "hsl(142 71% 55%)" },
          { label: "Open", value: data?.openJobs ?? 0, color: "hsl(38 92% 60%)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card text-center">
            <p className="text-2xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Post job CTA */}
      <div className="px-5 mb-6">
        <button
          onClick={() => navigate("/customer/post")}
          className="btn-primary w-full h-14 flex items-center justify-center gap-3 text-base"
        >
          <PlusCircle className="w-5 h-5" />
          Post a New Job
        </button>
      </div>

      {/* Recent jobs */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Recent Jobs</h2>
          <button onClick={() => navigate("/customer/jobs")} className="text-xs text-primary font-semibold">View all</button>
        </div>
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0,1,2].map((i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />
            ))}
          </div>
        ) : (data?.recentJobs?.length ?? 0) === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: "hsl(var(--muted))" }}>
              🔍
            </div>
            <p className="text-muted-foreground text-sm">No jobs yet. Post your first one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data?.recentJobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.open;
              const Icon = cfg.icon;
              return (
                <button
                  key={job.id}
                  onClick={() => navigate(`/customer/jobs/${job.id}`)}
                  className="w-full text-left rounded-2xl p-4 fade-in"
                  style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "hsl(var(--muted))" }}>
                        {job.skill.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">{job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.skill.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm">₹{job.budget}</p>
                      <div className="mt-1 flex items-center gap-1 justify-end pill" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                  {job.bidCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 pl-13">{job.bidCount} provider{job.bidCount !== 1 ? "s" : ""} responded</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
