import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, Briefcase, TrendingUp, Zap, Shield, IndianRupee, ArrowDownToLine, AlertCircle, CheckCircle2, Clock, Ban } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  totalUsers: number; customers: number; providers: number; onlineProviders: number;
  blockedUsers: number; verifiedProviders: number; totalJobs: number; openJobs: number;
  completedJobs: number; cancelledJobs: number; todayJobs: number;
  totalRevenue: number; totalCommission: number; totalWalletBalance: number;
  pendingWithdrawals: number; pendingWithdrawalAmount: number;
}

function StatCard({ label, value, sub, icon: Icon, color, bg, href }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<any>; color: string; bg: string; href?: string;
}) {
  const content = (
    <div className="stat-card hover:scale-[1.01] transition-transform cursor-default" style={href ? { cursor: "pointer" } : {}}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {href && <span className="text-xs text-muted-foreground">→</span>}
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}><a>{content}</a></Link> : content;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/settings/maintenance_mode", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
    ]).then(([s, m]) => {
      if (s && !s.error) setStats(s);
      if (m) setMaintenance(m.value === "true");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleMaintenance = async () => {
    const newVal = !maintenance;
    try {
      await fetch("/api/admin/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance_mode: String(newVal) }),
      });
      setMaintenance(newVal);
      toast.success(newVal ? "Maintenance mode ON" : "Maintenance mode OFF");
    } catch { toast.error("Failed to toggle maintenance mode"); }
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const fmtRupee = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toFixed(0)}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview & quick actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleMaintenance}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={maintenance
              ? { background: "rgba(239,68,68,0.12)", color: "hsl(0 84% 60%)" }
              : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
            }>
            <AlertCircle className="w-4 h-4" />
            {maintenance ? "Maintenance ON" : "Maintenance OFF"}
          </button>
        </div>
      </div>

      {/* Revenue hero */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "linear-gradient(135deg, hsl(221 83% 43%), hsl(262 83% 50%))" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">Total Platform Commission</p>
            <p className="text-4xl font-bold text-white mt-1">
              {loading ? "—" : fmtRupee(stats?.totalCommission ?? 0)}
            </p>
            <p className="text-white/60 text-xs mt-1">from {stats?.completedJobs ?? 0} completed jobs</p>
          </div>
          <TrendingUp className="w-10 h-10 text-white/30" />
        </div>
        <div className="flex items-center gap-6 mt-5 pt-4 border-t border-white/15">
          {[
            { label: "Total Revenue", value: fmtRupee(stats?.totalRevenue ?? 0) },
            { label: "Wallet Funds", value: fmtRupee(stats?.totalWalletBalance ?? 0) },
            { label: "Pending W/D", value: fmtRupee(stats?.pendingWithdrawalAmount ?? 0) },
            { label: "Today's Jobs", value: String(stats?.todayJobs ?? 0) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-white/60 text-xs">{label}</p>
              <p className="text-white font-bold text-sm">{loading ? "—" : value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={loading ? "—" : fmt(stats?.totalUsers ?? 0)}
          sub={`${stats?.customers ?? 0} customers · ${stats?.providers ?? 0} providers`}
          icon={Users} color="hsl(221 83% 60%)" bg="rgba(59,130,246,0.12)" href="/admin/users" />
        <StatCard label="Online Providers" value={loading ? "—" : String(stats?.onlineProviders ?? 0)}
          sub={`${stats?.verifiedProviders ?? 0} verified`}
          icon={Shield} color="hsl(142 71% 50%)" bg="rgba(34,197,94,0.12)" href="/admin/providers" />
        <StatCard label="Total Jobs" value={loading ? "—" : fmt(stats?.totalJobs ?? 0)}
          sub={`${stats?.openJobs ?? 0} open · ${stats?.cancelledJobs ?? 0} cancelled`}
          icon={Briefcase} color="hsl(262 83% 68%)" bg="rgba(139,92,246,0.12)" href="/admin/jobs" />
        <StatCard label="Today's Jobs" value={loading ? "—" : String(stats?.todayJobs ?? 0)}
          sub="Posted today"
          icon={Zap} color="hsl(38 92% 55%)" bg="rgba(234,179,8,0.12)" href="/admin/jobs" />
        <StatCard label="Completed" value={loading ? "—" : String(stats?.completedJobs ?? 0)}
          sub="All time"
          icon={CheckCircle2} color="hsl(142 71% 50%)" bg="rgba(34,197,94,0.12)" href="/admin/jobs" />
        <StatCard label="Pending Withdrawals" value={loading ? "—" : String(stats?.pendingWithdrawals ?? 0)}
          sub={`₹${(stats?.pendingWithdrawalAmount ?? 0).toFixed(0)} pending`}
          icon={ArrowDownToLine} color="hsl(38 92% 55%)" bg="rgba(234,179,8,0.12)" href="/admin/withdrawals" />
        <StatCard label="Blocked Users" value={loading ? "—" : String(stats?.blockedUsers ?? 0)}
          sub="Restricted accounts"
          icon={Ban} color="hsl(0 84% 60%)" bg="rgba(239,68,68,0.1)" href="/admin/users" />
        <StatCard label="Wallet Funds" value={loading ? "—" : fmtRupee(stats?.totalWalletBalance ?? 0)}
          sub="All user wallets"
          icon={IndianRupee} color="hsl(221 83% 60%)" bg="rgba(59,130,246,0.12)" href="/admin/wallets" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/admin/withdrawals", label: "Review Withdrawals", icon: ArrowDownToLine, color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.1)" },
          { href: "/admin/users", label: "Manage Users", icon: Users, color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.1)" },
          { href: "/admin/jobs", label: "Monitor Jobs", icon: Briefcase, color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.1)" },
          { href: "/admin/settings", label: "App Settings", icon: () => <span className="text-sm">⚙️</span>, color: "hsl(var(--muted-foreground))", bg: "hsl(var(--muted))" },
        ].map(({ href, label, icon: Icon, color, bg }) => (
          <Link key={href} href={href}>
            <a className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
              style={{ background: "hsl(var(--card))" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
