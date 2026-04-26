import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { Power, Wallet, Zap, ChevronRight, Star } from "lucide-react";

interface Dashboard {
  isOnline: boolean; totalEarnings: number; todayEarnings: number;
  completedJobs: number; activeJobs: number; rating: number | null;
  pendingBids: number; recentJobs: { id: number; title: string; status: string; budget: number; providerAmount: number; skill: { name: string; icon: string } }[];
}

export default function ProviderHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [data, setData] = useState<Dashboard | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = () => {
    Promise.all([
      fetch("/api/dashboard/provider", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/wallet", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
    ]).then(([d, w]) => {
      if (d && !d.error) setData(d);
      if (w?.wallet) setWalletBalance(w.wallet.balance ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleToggleOnline = async () => {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch("/api/providers/availability", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: !data.isOnline }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setData((d) => d ? { ...d, isOnline: updated.isOnline } : d);
      toast.success(updated.isOnline ? "You are now Online! Ready to receive jobs." : "You are now Offline.");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setToggling(false); }
  };

  const isOnline = data?.isOnline ?? false;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.name}</h1>
          </div>
          {data?.rating && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl" style={{ background: "rgba(234,179,8,0.12)" }}>
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-bold text-warning">{data.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Online toggle — Rapido style */}
        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className="w-full rounded-3xl p-4 flex items-center justify-between transition-all"
          style={{
            background: isOnline
              ? "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))"
              : "hsl(var(--card))",
            border: isOnline ? "1.5px solid rgba(34,197,94,0.4)" : "1.5px solid hsl(var(--border))",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative" style={{ background: isOnline ? "rgba(34,197,94,0.2)" : "hsl(var(--muted))" }}>
              <Power className="w-6 h-6" style={{ color: isOnline ? "hsl(142 71% 55%)" : "hsl(var(--muted-foreground))" }} />
              {isOnline && <span className="pulse-dot absolute top-1 right-1 w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142 71% 55%)" }} />}
            </div>
            <div className="text-left">
              <p className="font-bold" style={{ color: isOnline ? "hsl(142 71% 55%)" : "hsl(var(--foreground))" }}>
                {isOnline ? "You are Online" : "You are Offline"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline ? "Receiving job requests near you" : "Tap to start receiving jobs"}
              </p>
            </div>
          </div>
          <div className="w-12 h-6 rounded-full relative transition-all" style={{ background: isOnline ? "hsl(142 71% 45%)" : "hsl(var(--muted))" }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: isOnline ? "calc(100% - 22px)" : "2px" }} />
          </div>
        </button>
      </div>

      {/* Wallet */}
      <div className="px-5 mb-5">
        <button onClick={() => navigate("/provider/earnings")} className="w-full rounded-2xl p-4 flex items-center justify-between" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Wallet className="w-5 h-5" style={{ color: "hsl(142 71% 55%)" }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Wallet Balance</p>
              <p className="text-lg font-bold" style={{ color: "hsl(142 71% 55%)" }}>₹{walletBalance?.toFixed(2) ?? "—"}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-5">
        {[
          { label: "Total Earned", value: `₹${(data?.totalEarnings ?? 0).toFixed(0)}`, color: "hsl(142 71% 55%)", sub: "all time" },
          { label: "Today", value: `₹${(data?.todayEarnings ?? 0).toFixed(0)}`, color: "hsl(221 83% 60%)", sub: "earnings" },
          { label: "Completed", value: String(data?.completedJobs ?? 0), color: "hsl(262 83% 68%)", sub: "jobs" },
          { label: "Active", value: String(data?.activeJobs ?? 0), color: "hsl(38 92% 60%)", sub: "jobs" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="stat-card">
            <p className="text-xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
            <p className="text-xs font-semibold mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Recent Activity</h2>
          <button onClick={() => navigate("/provider/jobs")} className="text-xs text-primary font-semibold">View all</button>
        </div>
        {loading ? (
          [0,1].map((i) => <div key={i} className="h-16 rounded-2xl mb-3 animate-pulse" style={{ background: "hsl(var(--muted))" }} />)
        ) : !(data?.recentJobs?.length) ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
              <Zap className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No jobs yet. Go online to start!</p>
          </div>
        ) : (data.recentJobs ?? []).map((job) => (
          <div key={job.id} className="mb-3 rounded-2xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "hsl(var(--muted))" }}>{job.skill.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm line-clamp-1">{job.title}</p>
                <p className="text-xs text-muted-foreground">{job.skill.name}</p>
              </div>
              <p className="font-bold" style={{ color: "hsl(142 71% 55%)" }}>+₹{job.providerAmount.toFixed(0)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
