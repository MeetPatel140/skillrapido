import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Users, Briefcase, Star, RefreshCw } from "lucide-react";

interface DailyPoint { date: string; users: number; jobs: number; revenue: number; reviews: number }
interface Analytics { daily: DailyPoint[]; period: string; totals: { newUsers: number; newJobs: number; newReviews: number; openDisputes: number } }

const PERIODS = [{ label: "7 Days", value: "7d" }, { label: "30 Days", value: "30d" }, { label: "90 Days", value: "90d" }];

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/analytics?period=${period}`, { credentials: "include" });
      if (r.ok) setData(await r.json());
    } catch {} finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  const chartData = data?.daily.map((d) => ({ ...d, date: fmtDate(d.date) })) ?? [];

  const STATS = [
    { label: "New Users", value: data?.totals.newUsers ?? 0, icon: Users, color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)" },
    { label: "New Jobs", value: data?.totals.newJobs ?? 0, icon: Briefcase, color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)" },
    { label: "New Reviews", value: data?.totals.newReviews ?? 0, icon: Star, color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)" },
    { label: "Open Disputes", value: data?.totals.openDisputes ?? 0, icon: TrendingUp, color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform performance over time</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={period === p.value
                ? { background: "hsl(221 83% 53%)", color: "white" }
                : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              {p.label}
            </button>
          ))}
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 border border-border" style={{ background: "hsl(var(--card))" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* User + Job Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold mb-4">User & Job Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="hsl(221 83% 60%)" strokeWidth={2} dot={false} name="New Users" />
              <Line type="monotone" dataKey="jobs" stroke="hsl(262 83% 68%)" strokeWidth={2} dot={false} name="New Jobs" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold mb-4">Commission Revenue (₹)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: any) => [`₹${v}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Revenue ₹" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Reviews chart */}
      <div className="rounded-2xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <h3 className="font-bold mb-4">Daily Reviews</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            <Bar dataKey="reviews" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} name="Reviews" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
