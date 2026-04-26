import { useEffect, useState, useCallback } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";

interface Log {
  id: number; adminId: number | null; adminName: string; action: string; targetType: string;
  targetId: number | null; details: string | null; ipAddress: string | null; createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "hsl(142 71% 50%)", update: "hsl(221 83% 60%)", delete: "hsl(0 84% 60%)",
  block: "hsl(0 84% 60%)", unblock: "hsl(142 71% 50%)", approve: "hsl(142 71% 50%)",
  reject: "hsl(0 84% 60%)", hide: "hsl(38 92% 55%)", unhide: "hsl(142 71% 50%)",
};

function actionColor(action: string): string {
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(k)) return v;
  }
  return "hsl(var(--muted-foreground))";
}

export default function AdminAuditLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/audit-logs?limit=${limit}`, { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? rows.filter((r) => r.action.includes(search.toLowerCase()) || r.adminName.toLowerCase().includes(search.toLowerCase()) || r.targetType.includes(search.toLowerCase()) || (r.details || "").toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All admin actions and system events</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="app-input w-32 text-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
          <button onClick={load} className="p-2 rounded-xl hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input className="app-input pl-9" placeholder="Search by action, admin, target..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No audit logs found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Time", "Admin", "Action", "Target", "Details"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(59,130,246,0.1)", color: "hsl(221 83% 60%)" }}>
                      {log.adminName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-mono font-semibold" style={{ color: actionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="text-muted-foreground">{log.targetType}</span>
                    {log.targetId && <span className="text-muted-foreground"> #{log.targetId}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[300px] truncate">
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
