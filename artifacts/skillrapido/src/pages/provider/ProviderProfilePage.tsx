import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Star, Briefcase, TrendingUp, Edit2, Check, X, Sun, Moon, Lock, Phone, User } from "lucide-react";

interface Skill { id: number; name: string; category: string; icon: string; }
interface Profile { id: number; bio: string | null; isOnline: boolean; isVerified: boolean; rating: number | null; totalJobs: number; totalEarnings: number; skills: Skill[]; }

export default function ProviderProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", bio: "" });
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/providers/profile", { credentials: "include" }).then((r) => r.ok ? r.json() : null),
      fetch("/api/skills", { credentials: "include" }).then((r) => r.ok ? r.json() : []),
    ]).then(([p, s]) => {
      if (p && !p.error) {
        setProfile(p);
        setSelectedSkills(Array.isArray(p.skills) ? p.skills.map((sk: Skill) => sk.id) : []);
      }
      setAllSkills(Array.isArray(s) ? s : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const startEdit = () => {
    setForm({ name: user?.name ?? "", phone: (user as any)?.phone ?? "", bio: profile?.bio ?? "" });
    setSelectedSkills(profile?.skills?.map((s) => s.id) ?? []);
    setEditing(true);
    setChangingPw(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/providers/profile", {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: form.bio, skillIds: selectedSkills }),
        }),
        fetch("/api/users/profile", {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, phone: form.phone || null }),
        }),
      ]);
      if (!r1.ok) throw new Error((await r1.json()).error || "Failed");
      if (!r2.ok) throw new Error((await r2.json()).error || "Failed");
      const updated = await r1.json();
      setProfile(updated);
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

  const handleLogout = async () => { await logout(); navigate("/login"); };
  const categories = [...new Set(allSkills.map((s) => s.category))];
  const profileSkills = profile?.skills ?? [];

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profile</h1>
          {!editing && !changingPw && (
            <button onClick={startEdit} className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(139,92,246,0.12)", color: "hsl(262 83% 68%)" }}>
              <Edit2 className="w-3.5 h-3.5 inline mr-1" />Edit
            </button>
          )}
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold mb-3"
            style={{ background: "linear-gradient(135deg, hsl(262 83% 53%), hsl(221 83% 58%))", color: "white" }}>
            {user?.name?.[0] ?? "P"}
          </div>
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{(user as any)?.phone || "No phone"}</p>
          <div className="flex items-center gap-3 mt-2">
            {profile?.rating != null && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-warning text-warning" />
                <span className="text-sm font-bold text-warning">{profile.rating.toFixed(1)}</span>
              </div>
            )}
            <div className="pill" style={{ background: "rgba(139,92,246,0.12)", color: "hsl(262 83% 68%)" }}>Provider</div>
            {profile?.isVerified && <div className="pill" style={{ background: "rgba(34,197,94,0.12)", color: "hsl(142 71% 55%)" }}>Verified ✓</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="stat-card text-center">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{loading ? "—" : (profile?.totalJobs ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Jobs Done</p>
          </div>
          <div className="stat-card text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1" style={{ color: "hsl(142 71% 55%)" }} />
            <p className="text-xl font-bold">₹{loading ? "—" : (profile?.totalEarnings ?? 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <>
            <div className="rounded-3xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold mb-3">Personal Info</h3>
              <div className="space-y-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
                  <input className="app-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                  <input className="app-input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9999999999" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
                  <textarea className="app-input resize-none h-24" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell customers about your experience..." />
                </div>
              </div>
            </div>

            <div className="rounded-3xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold mb-3">My Skills</h3>
              {categories.map((cat) => (
                <div key={cat} className="mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.filter((s) => s.category === cat).map((skill) => {
                      const sel = selectedSkills.includes(skill.id);
                      return (
                        <button key={skill.id} type="button"
                          onClick={() => setSelectedSkills(sel ? selectedSkills.filter((s) => s !== skill.id) : [...selectedSkills, skill.id])}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                          style={sel
                            ? { background: "rgba(139,92,246,0.15)", border: "1.5px solid hsl(262 83% 58%)", color: "hsl(262 83% 68%)" }
                            : { background: "hsl(var(--muted))", border: "1.5px solid transparent", color: "hsl(var(--muted-foreground))" }
                          }>
                          <span>{skill.icon}</span><span>{skill.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={save} disabled={saving} className="btn-primary flex-1 h-14 text-base disabled:opacity-50">
                <Check className="w-4 h-4 inline mr-2" />{saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-6 h-14 rounded-2xl font-semibold"
                style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* View bio */}
            {profile?.bio && (
              <div className="rounded-3xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <h3 className="font-bold mb-2">About Me</h3>
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {/* View skills */}
            <div className="rounded-3xl p-5 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold mb-3">My Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profileSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills added. Tap Edit to add your skills.</p>
                ) : profileSkills.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "hsl(var(--muted))" }}>
                    <span>{s.icon}</span><span>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Change password */}
        {!editing && (
          <div className="mb-3">
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
        {!editing && (
          <button onClick={toggleTheme}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold mb-3"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
        )}

        {!editing && (
          <button onClick={handleLogout} className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm"
            style={{ border: "1.5px solid hsl(0 84% 60%)", color: "hsl(0 84% 60%)" }}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
