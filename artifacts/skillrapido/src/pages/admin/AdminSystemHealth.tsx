import { useEffect, useState, useCallback } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Database, Server, Cpu, Clock } from "lucide-react";

interface Health {
  status: string; uptime: number; memoryMB: number; dbPingMs: number; nodeVersion: string; timestamp: string;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function AdminSystemHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/system-health", { credentials: "include" });
      if (r.ok) setHealth(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load, autoRefresh]);

  const dbStatus = health ? (health.dbPingMs < 100 ? "good" : health.dbPingMs < 500 ? "slow" : "critical") : "unknown";
  const memStatus = health ? (health.memoryMB < 256 ? "good" : health.memoryMB < 512 ? "moderate" : "high") : "unknown";

  const STATUS_COLOR: Record<string, string> = {
    good: "hsl(142 71% 50%)", slow: "hsl(38 92% 55%)", critical: "hsl(0 84% 60%)",
    moderate: "hsl(38 92% 55%)", high: "hsl(0 84% 60%)", unknown: "hsl(var(--muted-foreground))",
  };

  const METRICS = [
    { label: "Server Status", value: health?.status === "ok" ? "Operational" : "Degraded", icon: Server, status: health?.status === "ok" ? "good" : "critical", extra: health?.nodeVersion },
    { label: "Database Ping", value: health ? `${health.dbPingMs}ms` : "—", icon: Database, status: dbStatus, extra: dbStatus === "good" ? "Healthy" : dbStatus === "slow" ? "Slow response" : "Check connection" },
    { label: "Memory Usage", value: health ? `${health.memoryMB} MB` : "—", icon: Cpu, status: memStatus, extra: memStatus },
    { label: "Uptime", value: health ? formatUptime(health.uptime) : "—", icon: Clock, status: "good", extra: health ? new Date(health.timestamp).toLocaleString() : "" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time server and infrastructure status</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 rounded" />
            Auto-refresh (10s)
          </label>
          <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Overall status */}
      <div className="rounded-2xl p-5 mb-6 border border-border" style={{ background: "hsl(var(--card))" }}>
        <div className="flex items-center gap-4">
          {health?.status === "ok" ? (
            <CheckCircle2 className="w-10 h-10" style={{ color: "hsl(142 71% 50%)" }} />
          ) : (
            <AlertCircle className="w-10 h-10" style={{ color: "hsl(38 92% 55%)" }} />
          )}
          <div>
            <p className="text-xl font-bold">{health?.status === "ok" ? "All Systems Operational" : "Some Issues Detected"}</p>
            <p className="text-sm text-muted-foreground">Last checked: {health ? new Date(health.timestamp).toLocaleTimeString() : "—"}</p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {METRICS.map(({ label, value, icon: Icon, status, extra }) => (
          <div key={label} className="rounded-2xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLOR[status]}18` }}>
                <Icon className="w-5 h-5" style={{ color: STATUS_COLOR[status] }} />
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize"
                style={{ background: `${STATUS_COLOR[status]}15`, color: STATUS_COLOR[status] }}>
                {status}
              </span>
            </div>
            <p className="text-2xl font-bold mb-0.5">{loading ? "—" : value}</p>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {extra && <p className="text-xs text-muted-foreground mt-0.5">{extra}</p>}
          </div>
        ))}
      </div>

      {/* Environment info */}
      <div className="rounded-2xl p-5 border border-border" style={{ background: "hsl(var(--card))" }}>
        <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4" />Environment Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Node.js", value: health?.nodeVersion ?? "—" },
            { label: "Environment", value: "Production" },
            { label: "Region", value: "Replit Cloud" },
            { label: "Database", value: "PostgreSQL" },
            { label: "ORM", value: "Drizzle" },
            { label: "Framework", value: "Express 5" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
