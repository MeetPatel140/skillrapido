import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/auth";
import { useTheme } from "@/contexts/theme";
import {
  LayoutDashboard, TrendingUp, Users, UserCheck, ShieldX, Briefcase,
  MessageSquareWarning, Star, Wallet, ArrowLeftRight, ArrowDownToLine,
  Tag, Megaphone, Settings, Wrench, ClipboardList, Activity,
  ChevronDown, ChevronRight, Menu, Sun, Moon, LogOut, Bell, RefreshCw, BadgeCheck
} from "lucide-react";

interface NavItem { label: string; href: string; icon: React.ComponentType<any>; badgeKey?: string }
interface NavGroup { label: string; icon: React.ComponentType<any>; items: NavItem[] }
interface Counts { pendingWithdrawals: number; openJobs: number }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview", icon: LayoutDashboard,
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Users", icon: Users,
    items: [
      { label: "All Users", href: "/admin/users", icon: Users },
      { label: "Providers", href: "/admin/providers", icon: BadgeCheck },
      { label: "Verification Queue", href: "/admin/provider-queue", icon: UserCheck },
      { label: "Blocked Users", href: "/admin/blocked-users", icon: ShieldX },
    ],
  },
  {
    label: "Operations", icon: Briefcase,
    items: [
      { label: "All Jobs", href: "/admin/jobs", icon: Briefcase, badgeKey: "openJobs" },
      { label: "Disputes", href: "/admin/disputes", icon: MessageSquareWarning },
      { label: "Reviews & Ratings", href: "/admin/reviews", icon: Star },
    ],
  },
  {
    label: "Finance", icon: Wallet,
    items: [
      { label: "Wallets", href: "/admin/wallets", icon: Wallet },
      { label: "Transactions", href: "/admin/transactions", icon: ArrowLeftRight },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: ArrowDownToLine, badgeKey: "pendingWithdrawals" },
      { label: "Coupons & Offers", href: "/admin/coupons", icon: Tag },
    ],
  },
  {
    label: "Content (CMS)", icon: Megaphone,
    items: [
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    ],
  },
  {
    label: "Configuration", icon: Settings,
    items: [
      { label: "App Settings", href: "/admin/settings", icon: Settings },
      { label: "Skills & Categories", href: "/admin/skills", icon: Wrench },
    ],
  },
  {
    label: "System", icon: Activity,
    items: [
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
      { label: "System Health", href: "/admin/system-health", icon: Activity },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Counts>({ pendingWithdrawals: 0, openJobs: 0 });

  // Open group that contains current route
  useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      init[g.label] = g.items.some((i) => location.startsWith(i.href));
    }
    setOpenGroups(init);
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats", { credentials: "include" });
      if (r.ok) {
        const s = await r.json();
        setCounts({ pendingWithdrawals: s.pendingWithdrawals ?? 0, openJobs: s.openJobs ?? 0 });
      }
    } catch {}
  }, []);

  useEffect(() => { loadCounts(); const t = setInterval(loadCounts, 30_000); return () => clearInterval(t); }, []);

  const BADGE: Record<string, number> = { pendingWithdrawals: counts.pendingWithdrawals, openJobs: counts.openJobs };
  const isActive = (href: string) => location === href || location.startsWith(href + "/") || location.startsWith(href + "?");

  const SidebarInner = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo + collapse */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-border/50 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))" }}>S</div>
        {!collapsed && <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground">SkillRapido</p>
          <p className="text-[10px] text-muted-foreground">Admin ERP</p>
        </div>}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted/60 flex-shrink-0 transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          <Menu className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-0.5">
            <button onClick={() => setOpenGroups((p) => ({ ...p, [group.label]: !p[group.label] }))}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
              <group.icon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
              {!collapsed && <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex-1 text-left">{group.label}</span>
                {openGroups[group.label] ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </>}
            </button>
            {(openGroups[group.label] !== false || collapsed) && (
              <div className="mt-0.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const badge = item.badgeKey ? BADGE[item.badgeKey] ?? 0 : 0;
                  return (
                    <Link key={item.href} href={item.href}>
                      <a className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl transition-all"
                        style={active
                          ? { background: "linear-gradient(135deg,hsl(221 83% 53%),hsl(262 83% 58%))", color: "white" }
                          : { color: "hsl(var(--muted-foreground))" }}>
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {!collapsed && <>
                          <span className="text-[13px] font-medium flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={active ? { background: "rgba(255,255,255,0.2)", color: "white" } : { background: "rgba(239,68,68,0.15)", color: "hsl(0 84% 60%)" }}>
                              {badge}
                            </span>
                          )}
                        </>}
                      </a>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 border-t border-border/50 px-1.5 py-2 space-y-0.5">
        <button onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-muted/60 transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}>
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 flex-shrink-0" /> : <Moon className="w-3.5 h-3.5 flex-shrink-0" />}
          {!collapsed && <span className="text-[13px] font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        {!collapsed && user && (
          <div className="px-2.5 py-2 rounded-xl mx-0" style={{ background: "hsl(var(--muted))" }}>
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button onClick={async () => { await logout(); window.location.href = "/login"; }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
          style={{ color: "hsl(0 84% 60%)" }}>
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  const currentLabel = NAV_GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "Admin";

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 border-r border-border transition-all duration-200 overflow-hidden"
        style={{ width: collapsed ? 56 : 214, background: "hsl(var(--card))" }}>
        <SidebarInner />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-5 h-14 border-b border-border/50 bg-background/80 backdrop-blur">
          <h2 className="text-sm font-bold text-foreground flex-1">{currentLabel}</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadCounts} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {counts.pendingWithdrawals > 0 && (
              <Link href="/admin/withdrawals">
                <a className="relative p-1.5 rounded-lg hover:bg-muted/60">
                  <Bell className="w-4 h-4" style={{ color: "hsl(38 92% 55%)" }} />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
                </a>
              </Link>
            )}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg,hsl(0 84% 55%),hsl(38 92% 50%))" }}>
              {user?.name?.[0] ?? "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: "hsl(var(--background))" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
