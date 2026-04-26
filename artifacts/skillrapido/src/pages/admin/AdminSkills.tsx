import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench, Plus, Edit2, Trash2, Check, X } from "lucide-react";

interface Skill { id: number; name: string; category: string; icon: string; description: string | null; }

const CATEGORIES = ["Cleaning", "Plumbing", "Electrical", "Carpentry", "Painting", "Appliance Repair", "Moving", "Gardening", "Beauty & Grooming", "Other"];
const ICONS = ["🧹", "🪛", "⚡", "🔨", "🎨", "🔧", "📦", "🌱", "✂️", "🛠️", "🧰", "🚿", "💡", "🏠", "🔌"];

export default function AdminSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ name: "", category: "Other", icon: "🔧", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/skills", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setSkills(Array.isArray(d) ? d : []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const startEdit = (s: Skill) => {
    setEditId(s.id);
    setForm({ name: s.name, category: s.category, icon: s.icon, description: s.description || "" });
  };

  const startNew = () => {
    setEditId("new");
    setForm({ name: "", category: "Other", icon: "🔧", description: "" });
  };

  const save = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const url = editId === "new" ? "/api/admin/skills" : `/api/admin/skills/${editId}`;
      const method = editId === "new" ? "POST" : "PUT";
      const res = await fetch(url, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(editId === "new" ? "Skill added!" : "Skill updated!");
      setEditId(null);
      load();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const deleteSkill = async (s: Skill) => {
    if (!confirm(`Delete skill "${s.name}"? This may break existing jobs.`)) return;
    try {
      await fetch(`/api/admin/skills/${s.id}`, { method: "DELETE", credentials: "include" });
      toast.success("Skill deleted");
      load();
    } catch { toast.error("Failed"); }
  };

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{skills.length} skills across {categories.length} categories</p>
        </div>
        <button onClick={startNew}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Skill
        </button>
      </div>

      {/* New/Edit form */}
      {editId !== null && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.3)" }}>
          <h3 className="font-bold mb-4">{editId === "new" ? "Add New Skill" : "Edit Skill"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
              <input className="app-input" placeholder="e.g. House Cleaning" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Category</label>
              <select className="app-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Icon</label>
              <div className="flex gap-2 items-center">
                <input className="app-input flex-1" placeholder="🔧" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors hover:scale-110"
                    style={form.icon === ic ? { background: "hsl(var(--primary) / 0.2)" } : { background: "hsl(var(--muted))" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Description (optional)</label>
            <input className="app-input" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditId(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Skills grouped by category */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map((i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {[...new Set(skills.map((s) => s.category))].map((cat) => (
            <div key={cat} className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
              <div className="space-y-2">
                {skills.filter((s) => s.category === cat).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
                    <span className="text-2xl flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteSkill(s)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {skills.length === 0 && (
            <div className="text-center py-16 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No skills yet. Add the first skill.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
