import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { Eye, EyeOff, Zap } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="screen-content flex flex-col">
        {/* Hero */}
        <div className="px-6 pt-16 pb-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: "linear-gradient(135deg, hsl(221 83% 53%), hsl(262 83% 58%))" }}>
            <Zap className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">SkillRapido</h1>
          <p className="text-muted-foreground text-sm mt-2">On-demand services, instantly</p>
        </div>

        {/* Card */}
        <div className="mx-4 rounded-3xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <h2 className="text-xl font-bold mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
              <input
                type="email"
                className="app-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="app-input pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-14 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3 mx-8 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="mx-4 flex flex-col gap-3">
          <button
            onClick={() => navigate("/register?role=customer")}
            className="h-14 rounded-2xl border border-border text-sm font-semibold text-foreground active:bg-muted transition-colors"
          >
            Register as Customer
          </button>
          <button
            onClick={() => navigate("/register?role=provider")}
            className="h-14 rounded-2xl text-sm font-semibold"
            style={{ background: "rgba(99,102,241,0.12)", color: "hsl(262 83% 68%)", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            Register as Service Provider
          </button>
        </div>

        {/* Demo hint */}
        <div className="mx-4 mt-6 p-4 rounded-2xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <p className="text-xs text-primary font-medium mb-1">Demo Accounts</p>
          <p className="text-xs text-muted-foreground">Create a new account to get started with ₹500 wallet balance.</p>
        </div>

        <div className="pb-8" />
      </div>
    </div>
  );
}
