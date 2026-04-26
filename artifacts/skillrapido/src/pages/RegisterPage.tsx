import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { ChevronLeft, Zap, Eye, EyeOff } from "lucide-react";

interface Skill { id: number; name: string; category: string; icon: string; }

export default function RegisterPage() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultRole = (params.get("role") as "customer" | "provider") || "customer";

  const [role, setRole] = useState<"customer" | "provider">(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetch("/api/skills", { credentials: "include" })
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await register({ name, email, password, phone: phone || undefined, role });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <div className="app-shell">
      <div className="screen-content flex flex-col">
        {/* Header */}
        <div className="px-4 pt-14 pb-4 flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Create Account</h1>
            <p className="text-xs text-muted-foreground">Join as {role}</p>
          </div>
        </div>

        {/* Role toggle */}
        <div className="mx-4 mb-4 p-1 rounded-2xl flex gap-1" style={{ background: "hsl(var(--muted))" }}>
          {(["customer", "provider"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={role === r ? { background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))", color: "white" } : { color: "hsl(var(--muted-foreground))" }}
            >
              {r === "customer" ? "Customer" : "Service Provider"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mx-4 flex flex-col gap-4">
          <div className="rounded-3xl p-5 flex flex-col gap-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Full Name</label>
              <input className="app-input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
              <input type="email" className="app-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Phone (optional)</label>
              <input type="tel" className="app-input" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} className="app-input pr-12" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Skills for provider */}
          {role === "provider" && skills.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h3 className="font-bold text-sm mb-1">Your Skills</h3>
              <p className="text-xs text-muted-foreground mb-4">Select all services you can provide</p>
              {categories.map((cat) => (
                <div key={cat} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.filter((s) => s.category === cat).map((skill) => {
                      const sel = selectedSkills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => setSelectedSkills(sel ? selectedSkills.filter((s) => s !== skill.id) : [...selectedSkills, skill.id])}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                          style={sel
                            ? { background: "rgba(59,130,246,0.2)", border: "1.5px solid hsl(221 83% 53%)", color: "hsl(221 83% 65%)" }
                            : { background: "hsl(var(--muted))", border: "1.5px solid transparent", color: "hsl(var(--muted-foreground))" }
                          }
                        >
                          <span>{skill.icon}</span>
                          <span>{skill.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wallet info */}
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.2)" }}>
              <span className="text-sm">₹</span>
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "hsl(142 71% 55%)" }}>₹500 Welcome Bonus</p>
              <p className="text-xs text-muted-foreground">Added to your wallet on registration</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-14 text-base disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          <div className="pb-6" />
        </form>
      </div>
    </div>
  );
}
