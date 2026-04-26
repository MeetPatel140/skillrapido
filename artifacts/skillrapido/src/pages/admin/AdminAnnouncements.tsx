import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Pin, Eye, EyeOff, Megaphone, RefreshCw } from "lucide-react";

interface Announcement {
  id: number; title: string; body: string; type: string; targetRole: string;
  isActive: boolean; isPinned: boolean; expiresAt: string | null; createdAt: string;
}

const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  info: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)" },
  warning: { color: "hsl(38 92% 55%)", bg: "rgba(234,179,8,0.12)" },
  success: { color: "hsl(142 71% 50%)", bg: "rgba(34,197,94,0.12)" },
  maintenance: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.1)" },
};

const BLANK = { title: "", body: "", type: "info", targetRole: "all", isPinned: false, expiresAt: "" };

export default function AdminAnnouncements() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/announcements", { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); };
  const openEdit = (a: Announcement) => {
    setForm({ title: a.title, body: a.body, type: a.type, targetRole: a.targetRole, isPinned: a.isPinned, expiresAt: a.expiresAt ? a.expiresAt.slice(0, 16) : "" });
    setEditId(a.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.title || !form.body) { toast.error("Title and body required"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/announcements/${editId}` : "/api/admin/announcements";
      const r = await fetch(url, {
        method: editId ? "PUT" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(editId ? "Updated!" : "Created!");
      setShowForm(false); setEditId(null);
      load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSaving(false); }
  };

  const toggle = async (a: Announcement) => {
    await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !a.isActive }),
    });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Deleted"); load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Publish messages to app users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))" }}>
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl p-5 mb-6 border border-border" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold mb-4">{editId ? "Edit Announcement" : "New Announcement"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Title *</label>
              <input className="app-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Body *</label>
              <textarea className="app-input resize-none" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Full announcement text..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
              <select className="app-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target Audience</label>
              <select className="app-input" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                <option value="all">All Users</option>
                <option value="customer">Customers Only</option>
                <option value="provider">Providers Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expires At (optional)</label>
              <input type="datetime-local" className="app-input" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium">Pin to top</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))" }}>
              {saving ? "Saving..." : editId ? "Save Changes" : "Publish"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements yet. Create one to notify your users.</p>
        </div>
      ) : rows.map((a) => {
        const tc = TYPE_COLORS[a.type] || TYPE_COLORS.info;
        return (
          <div key={a.id} className={`rounded-2xl p-4 mb-3 border transition-opacity ${!a.isActive ? "opacity-50" : ""}`}
            style={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tc.bg }}>
                <Megaphone className="w-4 h-4" style={{ color: tc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-bold text-sm">{a.title}</p>
                  {a.isPinned && <Pin className="w-3 h-3 text-warning" />}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{a.type}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>→ {a.targetRole}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.isActive ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>{a.isActive ? "Active" : "Inactive"}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                {a.expiresAt && <p className="text-xs text-muted-foreground mt-1">Expires: {new Date(a.expiresAt).toLocaleString()}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => toggle(a)} className="p-1.5 rounded-lg hover:bg-muted" title={a.isActive ? "Deactivate" : "Activate"}>
                  {a.isActive ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-muted">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => del(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
