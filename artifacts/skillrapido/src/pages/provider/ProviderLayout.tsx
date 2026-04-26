import { Switch, Route, Redirect, useLocation } from "wouter";
import { Home, Bell, Briefcase, Wallet, User } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth";
import { useWebSocket } from "@/hooks/use-websocket";
import ProviderHome from "./ProviderHome";
import NotificationsPage from "./NotificationsPage";
import ProviderJobsPage from "./ProviderJobsPage";
import EarningsPage from "./EarningsPage";
import ProviderProfilePage from "./ProviderProfilePage";

interface JobNotification {
  id: number; title: string; description: string;
  budget: number; commission: number; providerAmount: number;
  address: string; skillName: string; skillCategory: string; skillIcon: string;
  phase: number; expiresAt: number;
}

const NAV = [
  { path: "/provider/home", icon: Home, label: "Home" },
  { path: "/provider/notifications", icon: Bell, label: "Alerts" },
  { path: "/provider/jobs", icon: Briefcase, label: "My Jobs" },
  { path: "/provider/earnings", icon: Wallet, label: "Earnings" },
  { path: "/provider/profile", icon: User, label: "Profile" },
];

// Play a Rapido-style ring using Web Audio API
function playJobRingtone() {
  try {
    const ctx = new AudioContext();

    const playTone = (freq: number, startAt: number, duration: number, vol = 0.35) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration + 0.05);
    };

    // Three-note ascending ring: like a Rapido alert
    playTone(880, 0, 0.18);
    playTone(1100, 0.22, 0.18);
    playTone(1320, 0.44, 0.30);
    // Repeat after short pause
    playTone(880, 0.90, 0.18);
    playTone(1100, 1.12, 0.18);
    playTone(1320, 1.34, 0.35);
  } catch {
    // AudioContext blocked (no user interaction yet) — silently skip
  }
}

// Register service worker for background OS notifications
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

// Show OS notification (via SW if possible, else direct Notification API)
async function showJobNotification(
  swReg: ServiceWorkerRegistration | null,
  job: JobNotification
) {
  if (Notification.permission !== "granted") return;
  const title = `🚨 New Job: ${job.skillName}`;
  const body = `${job.title} — ₹${job.providerAmount.toFixed(0)} near ${job.address.slice(0, 40)}`;

  if (swReg?.active) {
    swReg.active.postMessage({ type: "SHOW_JOB_NOTIFICATION", title, body, jobId: job.id });
  } else {
    new Notification(title, { body, icon: "/favicon.svg", tag: `job-${job.id}`, requireInteraction: true });
  }
}

export default function ProviderLayout() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const notifPermRef = useRef<NotificationPermission>("default");

  // Boot: register SW + request notification permission
  useEffect(() => {
    // Register SW
    registerServiceWorker().then((reg) => { swRegRef.current = reg; });

    // Request OS notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        notifPermRef.current = perm;
      });
    } else if ("Notification" in window) {
      notifPermRef.current = Notification.permission;
    }
  }, []);

  const onMessage = useCallback((msg: { type: string; [key: string]: unknown }) => {
    if (msg.type === "job_broadcast") {
      const job = msg.job as JobNotification;
      setNotifications((prev) => {
        if (prev.find((n) => n.id === job.id)) return prev;
        return [job, ...prev];
      });
      setUnread((u) => u + 1);

      // Play ringtone
      playJobRingtone();

      // Show OS notification (visible even when tab is in background)
      showJobNotification(swRegRef.current, job);
    }
    if (msg.type === "job_taken" || msg.type === "job_cancelled") {
      const jobId = msg.jobId as number;
      setNotifications((prev) => prev.filter((n) => n.id !== jobId));
    }
    if (msg.type === "job_accepted") {
      // Provider sees their own accepted job reflected
      const jobId = msg.jobId as number;
      setNotifications((prev) => prev.filter((n) => n.id !== jobId));
    }
  }, []);

  useWebSocket(user?.id ?? null, "provider", onMessage, !!user);

  const removeNotification = useCallback((jobId: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== jobId));
  }, []);

  const clearUnread = useCallback(() => setUnread(0), []);

  return (
    <div className="app-shell">
      <div className="screen-content">
        <Switch>
          <Route path="/provider/home" component={ProviderHome} />
          <Route path="/provider/notifications">
            <NotificationsPage
              notifications={notifications}
              removeNotification={removeNotification}
              clearUnread={clearUnread}
            />
          </Route>
          <Route path="/provider/jobs" component={ProviderJobsPage} />
          <Route path="/provider/earnings" component={EarningsPage} />
          <Route path="/provider/profile" component={ProviderProfilePage} />
          <Route><Redirect to="/provider/home" /></Route>
        </Switch>
      </div>

      <nav className="bottom-nav">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.startsWith(path);
            const isNotif = path === "/provider/notifications";
            return (
              <button
                key={path}
                onClick={() => { navigate(path); if (isNotif) clearUnread(); }}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[56px] relative"
                style={active ? { background: "rgba(59,130,246,0.12)" } : {}}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 transition-colors"
                    style={{ color: active ? "hsl(221 83% 60%)" : "hsl(var(--muted-foreground))" }}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {isNotif && unread > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                      style={{ background: "hsl(0 84% 60%)" }}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold transition-colors"
                  style={{ color: active ? "hsl(221 83% 60%)" : "hsl(var(--muted-foreground))" }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
