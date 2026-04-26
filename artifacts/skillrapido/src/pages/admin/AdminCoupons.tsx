import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Edit2, RefreshCw, Power } from "lucide-react";

interface Coupon {
  id: number; code: string; description: string | null; discountType: string; discountValue: number;
  minOrderAmount: number; maxDiscountAmount: number | null; usageLimit: number | null; usageCount: number;
  isActive: boolean; expiresAt: string | null; createdAt: string;
}

const BLANK = { code: "", description: "", discountType: "percentage", discountValue: "", minOrderAmount: "0", maxDiscountAmount: "", usageLimit: "", expiresAt: "" };

export default function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/coupons", { credentials: "include" });
      if (r.ok) setRows(await r.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ ...BLANK }); setEditId(null); setShowForm(true); };
  const openEdit = (c: Coupon) => {
    setForm({ code: c.code, description: c.description || "", discountType: c.discountType, discountValue: String(c.discountValue), minOrderAmount: String(c.minOrderAmount), maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount) : "", usageLimit: c.usageLimit ? String(c.usageLimit) : "", expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "" });
    setEditId(c.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.code || !form.discountValue) { toast.error("Code and discount value required"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/coupons/${editId}` : "/api/admin/coupons";
      const r = await fetch(url, {
        method: editId ? "PUT" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, discountValue: Number(form.discountValue), minOrderAmount: Number(form.minOrderAmount || 0), maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null, usageLimit: form.usageLimit ? Number(form.usageLimit) : null, expiresAt: form.expiresAt || null }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(editId ? "Updated!" : "Coupon created!");
      setShowForm(false); setEditId(null);
      load();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE", credentials: "include" });
    toast.success("Deleted"); load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coupons & Offers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage discount codes and promotions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-muted"><RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))" }}>
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl p-5 mb-6 border border-border" style={{ background: "hsl(var(--card))" }}>
          <h3 className="font-bold mb-4">{editId ? "Edit Coupon" : "New Coupon"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Coupon Code *</label>
              <input className="app-input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" disabled={!!editId} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Discount Type</label>
              <select className="app-input" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Discount Value *</label>
              <input className="app-input" type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === "percentage" ? "20" : "100"} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Min Order (₹)</label>
              <input className="app-input" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Max Discount (₹)</label>
              <input className="app-input" type="number" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Usage Limit</label>
              <input className="app-input" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expires At</label>
              <input type="datetime-local" className="app-input" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
              <input className="app-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))" }}>
              {saving ? "Saving..." : editId ? "Save Changes" : "Create Coupon"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No coupons yet. Create promotional discount codes.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "hsl(var(--card))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Code","Type","Value","Min Order","Usage","Expires","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: "hsl(221 83% 60%)" }}>{c.code}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{c.discountType}</td>
                  <td className="px-4 py-3 font-semibold">{c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                  <td className="px-4 py-3 text-muted-foreground">₹{c.minOrderAmount}</td>
                  <td className="px-4 py-3">{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? "text-green-600 bg-green-500/10" : "text-muted-foreground bg-muted"}`}>{c.isActive ? "Active" : "Inactive"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleActive(c)} className="p-1.5 rounded-lg hover:bg-muted" title={c.isActive ? "Disable" : "Enable"}><Power className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted"><Edit2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
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
