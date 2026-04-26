import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, User, Phone, Mail, Shield, Edit2, Check, X, Sun, Moon, Lock } from "lucide-react";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: (user as any)?.phone ?? "", bio: (user as any)?.bio ?? "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm({ name: user?.name ?? "", phone: (user as any)?.phone ?? "", bio: (user as any)?.bio ?? "" });
    setEditing(true);
    setChangingPw(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone || null, bio: form.bio || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      await refreshUser();
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const savePw = async () => {
    if (!pwForm.current || !pwForm.newPw) { toast.error("Fill all fields"); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Password changed!");
      setChangingPw(false);
      setPwForm({ current: "", newPw: "", confirm: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Logged out");
  };

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          {!editing && !changingPw && (
            <button onClick={startEdit} className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(59,130,246,0.12)", color: "hsl(221 83% 65%)" }}>
              <Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit
            </button>
          )}
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold mb-3"
            style={{ background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))", color: "white" }}>
            {user?.name?.[0] ?? "U"}
          </div>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <div className="mt-1 pill" style={{ background: "rgba(59,130,246,0.12)", color: "hsl(221 83% 60%)" }}>Customer</div>
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="rounded-3xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <h3 className="font-bold mb-3">Edit Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                <input className="app-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone Number</label>
                <input className="app-input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9999999999" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
                <textarea className="app-input resize-none h-20" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving}
                className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                <X className="w-4 h-4" />Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl p-5 flex flex-col gap-4 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            {[
              { icon: User, label: "Name", value: user?.name },
              { icon: Mail, label: "Email", value: user?.email },
              { icon: Phone, label: "Phone", value: (user as any)?.phone || "Not added" },
              { icon: Shield, label: "Account Type", value: "Customer" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--muted))" }}>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-sm">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change password */}
        {!editing && (
          <div className="mb-4">
            <button onClick={() => setChangingPw(!changingPw)}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
              <Lock className="w-4 h-4" />
              {changingPw ? "Cancel Password Change" : "Change Password"}
            </button>
            {changingPw && (
              <div className="rounded-2xl p-4 mt-2 space-y-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <input className="app-input" type="password" placeholder="Current password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                <input className="app-input" type="password" placeholder="New password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} />
                <input className="app-input" type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                <button onClick={savePw} disabled={saving} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
                  {saving ? "Changing..." : "Update Password"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold mb-3"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>

        <button onClick={handleLogout}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm"
          style={{ border: "1.5px solid hsl(0 84% 60%)", color: "hsl(0 84% 60%)" }}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
