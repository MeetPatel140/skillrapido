import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { MapPin, ChevronLeft, Briefcase, Info } from "lucide-react";

interface Skill { id: number; name: string; category: string; icon: string; }

const COMMISSION_RATE = 0.10;

export default function PostJobPage() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillId, setSkillId] = useState<number | null>(null);
  const [budget, setBudget] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number>(28.6139);
  const [lon, setLon] = useState<number>(77.2090);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    fetch("/api/skills", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setSkills(Array.isArray(d) ? d : []))
      .catch(() => setSkills([]));
    fetch("/api/wallet", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setWalletBalance(d?.wallet?.balance ?? 0))
      .catch(() => {});
  }, []);

  const detectLocation = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setAddress(`Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        setGeoLoading(false);
        toast.success("Location detected");
      },
      () => { setGeoLoading(false); toast.error("Could not detect location"); }
    );
  };

  const budgetNum = parseFloat(budget) || 0;
  const commission = budgetNum * COMMISSION_RATE;
  const totalCharge = budgetNum + commission;
  const canAfford = walletBalance !== null && walletBalance >= totalCharge;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !skillId || !budget || !address) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!canAfford) {
      toast.error("Insufficient wallet balance");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, skillId, budget: budgetNum, address, latitude: lat, longitude: lon }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      await res.json();
      toast.success("Job posted! Notifying nearby providers...");
      navigate("/customer/jobs");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(skills.map((s) => s.category))];
  const selectedSkill = skills.find((s) => s.id === skillId);

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-14 pb-4 flex items-center gap-3" style={{ background: "hsl(var(--background))" }}>
        <button onClick={() => navigate("/customer/home")} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg">Post a Job</h1>
          <p className="text-xs text-muted-foreground">Get help from nearby providers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-8 flex flex-col gap-4">
        {/* Skill selector */}
        <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Select Service Type</h3>
          </div>
          {categories.map((cat) => (
            <div key={cat} className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {skills.filter((s) => s.category === cat).map((skill) => {
                  const sel = skill.id === skillId;
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setSkillId(skill.id)}
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

        {/* Job details */}
        <div className="rounded-3xl p-5 flex flex-col gap-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Job Title</label>
            <input className="app-input" placeholder={selectedSkill ? `e.g. Fix ${selectedSkill.name} issue` : "Brief title"} value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Description</label>
            <textarea
              className="app-input resize-none h-24"
              placeholder="Describe the work needed in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Your Budget (₹)</label>
            <input
              type="number"
              className="app-input"
              placeholder="500"
              min="1"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div className="rounded-3xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm">Service Location</h3>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={geoLoading}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(59,130,246,0.12)", color: "hsl(221 83% 65%)" }}
            >
              {geoLoading ? "Detecting..." : "Auto-detect"}
            </button>
          </div>
          <input className="app-input" placeholder="Full address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          <p className="text-xs text-muted-foreground mt-2">Coords: {lat.toFixed(4)}, {lon.toFixed(4)}</p>
        </div>

        {/* Payment breakdown */}
        {budgetNum > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <p className="text-sm font-bold text-primary">Payment Breakdown</p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Budget</span>
                <span className="font-semibold">₹{budgetNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Commission (10%)</span>
                <span className="font-semibold text-warning">₹{commission.toFixed(2)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between">
                <span className="font-bold">Total Charge</span>
                <span className="font-bold text-primary">₹{totalCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider Gets</span>
                <span className="font-semibold" style={{ color: "hsl(142 71% 55%)" }}>₹{(budgetNum * 0.9).toFixed(2)}</span>
              </div>
              {walletBalance !== null && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className={`font-semibold ${canAfford ? "text-success" : "text-destructive"}`}>₹{walletBalance.toFixed(2)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Funds are held in escrow when job is posted and released to provider on completion.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canAfford}
          className="btn-primary h-14 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Posting Job..." : !canAfford && budgetNum > 0 ? "Insufficient Balance" : "Post Job & Notify Providers"}
        </button>
      </form>
    </div>
  );
}
