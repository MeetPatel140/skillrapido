import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings, Save, RefreshCw } from "lucide-react";

interface Setting { key: string; value: string; description: string; updatedAt: string; }

const SETTING_GROUPS = [
  {
    title: "Platform",
    settings: [
      { key: "platform_name", label: "Platform Name", type: "text", placeholder: "SkillRapido" },
      { key: "platform_commission_rate", label: "Commission Rate (%)", type: "number", placeholder: "10" },
      { key: "maintenance_mode", label: "Maintenance Mode", type: "toggle" },
      { key: "maintenance_message", label: "Maintenance Message", type: "text", placeholder: "Platform under maintenance..." },
      { key: "allow_registration", label: "Allow New Registrations", type: "toggle" },
    ],
  },
  {
    title: "Wallet & Withdrawals",
    settings: [
      { key: "default_wallet_balance", label: "Default Wallet Balance (₹)", type: "number", placeholder: "0" },
      { key: "min_withdrawal_amount", label: "Min Withdrawal (₹)", type: "number", placeholder: "100" },
      { key: "max_withdrawal_amount", label: "Max Withdrawal (₹)", type: "number", placeholder: "50000" },
      { key: "withdrawal_enabled", label: "Enable Withdrawals", type: "toggle" },
      { key: "auto_approve_withdrawals", label: "Auto Approve Withdrawals", type: "toggle" },
    ],
  },
  {
    title: "Jobs",
    settings: [
      { key: "max_bids_per_job", label: "Max Bids per Job", type: "number", placeholder: "10" },
      { key: "job_timeout_minutes", label: "Provider Accept Timeout (min)", type: "number", placeholder: "5" },
      { key: "auto_verify_providers", label: "Auto-Verify New Providers", type: "toggle" },
      { key: "provider_rating_enabled", label: "Provider Rating System", type: "toggle" },
    ],
  },
  {
    title: "Support",
    settings: [
      { key: "support_email", label: "Support Email", type: "text", placeholder: "support@skillrapido.com" },
      { key: "support_phone", label: "Support Phone", type: "text", placeholder: "+91 9999999999" },
      { key: "terms_url", label: "Terms of Service URL", type: "text", placeholder: "https://..." },
      { key: "privacy_url", label: "Privacy Policy URL", type: "text", placeholder: "https://..." },
    ],
  },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((d: Setting[]) => {
        const map: Record<string, string> = {};
        if (Array.isArray(d)) d.forEach((s) => { map[s.key] = s.value; });
        setSettings(map);
        setChanged({});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const update = (key: string, val: string) => {
    setChanged((prev) => ({ ...prev, [key]: val }));
  };

  const getValue = (key: string, def = "") => {
    return changed[key] !== undefined ? changed[key] : (settings[key] ?? def);
  };

  const saveAll = async () => {
    if (Object.keys(changed).length === 0) { toast.info("No changes to save"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Settings saved!");
      setSettings((prev) => ({ ...prev, ...changed }));
      setChanged({});
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  const hasChanges = Object.keys(changed).length > 0;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">App Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure platform behaviour, fees and features</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={saveAll} disabled={saving || !hasChanges}
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : hasChanges ? `Save (${Object.keys(changed).length})` : "Saved"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0,1,2].map((i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted))" }} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {SETTING_GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl p-6" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <h2 className="font-bold text-base mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                {group.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.settings.map(({ key, label, type, placeholder }) => {
                  const val = getValue(key);
                  return (
                    <div key={key}>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
                      {type === "toggle" ? (
                        <button
                          onClick={() => update(key, val === "true" ? "false" : "true")}
                          className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors text-left"
                          style={{ background: "hsl(var(--muted))" }}>
                          <div className="w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0"
                            style={{ background: val === "true" ? "hsl(221 83% 53%)" : "hsl(var(--border))" }}>
                            <div className="w-5 h-5 rounded-full bg-white shadow transition-transform"
                              style={{ transform: val === "true" ? "translateX(16px)" : "translateX(0)" }} />
                          </div>
                          <span className="text-sm font-medium" style={{ color: val === "true" ? "hsl(221 83% 65%)" : "hsl(var(--muted-foreground))" }}>
                            {val === "true" ? "Enabled" : "Disabled"}
                          </span>
                          {changed[key] !== undefined && <span className="ml-auto text-xs text-muted-foreground">unsaved</span>}
                        </button>
                      ) : (
                        <div className="relative">
                          <input
                            className="app-input"
                            type={type}
                            placeholder={placeholder}
                            value={val}
                            onChange={(e) => update(key, e.target.value)}
                            step={type === "number" ? "0.01" : undefined}
                          />
                          {changed[key] !== undefined && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "hsl(38 92% 55%)" }}>•</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
