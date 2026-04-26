import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Edit2, Lock, Unlock, Wallet, X, Check, ChevronDown, ChevronUp } from "lucide-react";

interface User {
  id: number; name: string; email: string; phone: string | null; role: string;
  walletBalance: number; escrowBalance: number; walletId: number | null;
  isBlocked: boolean; bio: string | null; avatarUrl: string | null;
  createdAt: string; updatedAt: string;
}

const ROLE_COLOR: Record<string, { color: string; bg: string }> = {
  customer: { color: "hsl(221 83% 60%)", bg: "rgba(59,130,246,0.12)" },
  provider: { color: "hsl(262 83% 68%)", bg: "rgba(139,92,246,0.12)" },
  admin: { color: "hsl(0 84% 60%)", bg: "rgba(239,68,68,0.12)" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<User & { newPassword: string; adjustAmount: string; adjustType: string; adjustNote: string }>>({});
  const [saving, setSaving] = useState(false);
  const [expandId, setExpandId] = useState<number | null>(null);

  const load = (role: string) => {
    setLoading(true);
    const q = role !== "all" ? `?role=${role}` : "";
    fetch(`/api/admin/users${q}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(tab); }, [tab]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone || "").includes(q);
  });

  const startEdit = (u: User) => {
    setEditId(u.id);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || "", role: u.role, bio: u.bio || "", adjustAmount: "", adjustType: "credit", adjustNote: "" });
    setExpandId(null);
  };

  const saveEdit = async (u: User) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name, email: editForm.email, phone: editForm.phone || null, role: editForm.role, bio: editForm.bio || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      if (editForm.newPassword) {
        await fetch(`/api/admin/users/${u.id}/password`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: editForm.newPassword }),
        });
      }
      if (editForm.adjustAmount && parseFloat(editForm.adjustAmount) > 0) {
        const adj = await fetch(`/api/admin/wallets/${u.id}/adjust`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parseFloat(editForm.adjustAmount), type: editForm.adjustType, description: editForm.adjustNote || undefined }),
        });
        if (!adj.ok) throw new Error((await adj.json()).error || "Wallet adjustment failed");
      }
      toast.success("User updated!");
      setEditId(null);
      load(tab);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const toggleBlock = async (u: User) => {
    if (!confirm(`${u.isBlocked ? "Unblock" : "Block"} ${u.name}?`)) return;
    try {
      await fetch(`/api/admin/users/${u.id}/block`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !u.isBlocked }),
      });
      toast.success(u.isBlocked ? "User unblocked" : "User blocked");
      load(tab);
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} total · {filtered.length} shown</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="app-input pl-9 h-10 text-sm" placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: "hsl(var(--muted))" }}>
          {[["all", "All"], ["customer", "Customers"], ["provider", "Providers"], ["admin", "Admins"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={tab === key ? { background: "hsl(var(--card))", color: "hsl(var(--foreground))" } : { color: "hsl(var(--muted-foreground))" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Role</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [0,1,2,3,4].map((i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-8 rounded-lg animate-pulse" style={{ background: "hsl(var(--muted))" }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2" />No users found</td></tr>
            ) : filtered.map((u) => {
              const rc = ROLE_COLOR[u.role] || ROLE_COLOR.customer;
              const isEditing = editId === u.id;
              return (
                <>
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors" onClick={() => !isEditing && setExpandId(expandId === u.id ? null : u.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: rc.bg, color: rc.color }}>
                          {u.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate max-w-[160px]">{u.name} {u.isBlocked && <span className="text-xs" style={{ color: "hsl(0 84% 60%)" }}>🚫</span>}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="pill" style={{ background: rc.bg, color: rc.color }}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold" style={{ color: "hsl(142 71% 50%)" }}>₹{(u.walletBalance ?? 0).toFixed(0)}</p>
                      {(u.escrowBalance ?? 0) > 0 && <p className="text-xs text-muted-foreground">+₹{u.escrowBalance.toFixed(0)} escrow</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => toggleBlock(u)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title={u.isBlocked ? "Unblock" : "Block"}>
                          {u.isBlocked ? <Unlock className="w-3.5 h-3.5 text-muted-foreground" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Edit row */}
                  {isEditing && (
                    <tr key={`edit-${u.id}`} style={{ background: "hsl(var(--muted)/0.5)" }}>
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                          {[
                            { label: "Name", field: "name" as const, type: "text" },
                            { label: "Email", field: "email" as const, type: "email" },
                            { label: "Phone", field: "phone" as const, type: "tel" },
                            { label: "New Password", field: "newPassword" as const, type: "password" },
                          ].map(({ label, field, type }) => (
                            <div key={field}>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
                              <input className="app-input h-9 text-sm" type={type} value={(editForm as any)[field] ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })} placeholder={label} />
                            </div>
                          ))}
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Role</label>
                            <select className="app-input h-9 text-sm" value={editForm.role ?? u.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                              <option value="customer">customer</option>
                              <option value="provider">provider</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                        </div>
                        <div className="border-t border-border pt-3 mb-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Wallet Adjustment</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                              <select className="app-input h-9 text-sm" value={editForm.adjustType ?? "credit"}
                                onChange={(e) => setEditForm({ ...editForm, adjustType: e.target.value })}>
                                <option value="credit">Credit (Add)</option>
                                <option value="debit">Debit (Remove)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Amount (₹)</label>
                              <input className="app-input h-9 text-sm" type="number" min="0" placeholder="0"
                                value={editForm.adjustAmount ?? ""} onChange={(e) => setEditForm({ ...editForm, adjustAmount: e.target.value })} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Note</label>
                              <input className="app-input h-9 text-sm" placeholder="Reason..." value={editForm.adjustNote ?? ""}
                                onChange={(e) => setEditForm({ ...editForm, adjustNote: e.target.value })} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(u)} disabled={saving}
                            className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Changes"}
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                            style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
