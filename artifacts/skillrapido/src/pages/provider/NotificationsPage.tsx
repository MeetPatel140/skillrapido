import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { MapPin, Clock, CheckCircle2, XCircle, Zap, Bell } from "lucide-react";

interface JobNotification {
  id: number; title: string; description: string;
  budget: number; commission: number; providerAmount: number;
  address: string; skillName: string; skillCategory: string; skillIcon: string;
  phase: number; expiresAt: number;
}

interface Props {
  notifications: JobNotification[];
  removeNotification: (id: number) => void;
  clearUnread: () => void;
}

function CountdownTimer({ expiresAt, onExpire }: { expiresAt: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
  const expired = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !expired.current) {
        expired.current = true;
        onExpire();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = Math.max(0, remaining / 300); // 300s = 5min
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference * (1 - progress);
  const color = progress > 0.5 ? "hsl(142 71% 55%)" : progress > 0.25 ? "hsl(38 92% 60%)" : "hsl(0 84% 60%)";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="22" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold tabular-nums" style={{ color }}>
            {minutes}:{String(seconds).padStart(2, "0")}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Expires</p>
    </div>
  );
}

function SwipeCard({ job, onAccept, onReject }: { job: JobNotification; onAccept: () => void; onReject: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [expired, setExpired] = useState(false);

  const THRESHOLD = 100;

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    currentX.current = dx;
    setDragX(dx);
  };

  const onPointerUp = () => {
    isDragging.current = false;
    if (currentX.current > THRESHOLD) {
      // Swiped right — accept
      setDragX(400);
      setTimeout(onAccept, 200);
    } else if (currentX.current < -THRESHOLD) {
      // Swiped left — reject
      setDragX(-400);
      setTimeout(onReject, 200);
    } else {
      setDragX(0);
    }
  };

  const handleAccept = async () => {
    if (accepting || expired) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/bids`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "I can help with this!" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(`Job accepted! You'll earn ₹${job.providerAmount.toFixed(2)}`);
      onAccept();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
      setAccepting(false);
    }
  };

  const absX = Math.abs(dragX);
  const rotation = dragX * 0.05;
  const opacity = Math.max(0.3, 1 - absX / 300);
  const isAcceptVisible = dragX > 20;
  const isRejectVisible = dragX < -20;

  if (expired) {
    return (
      <div className="rounded-3xl p-5 opacity-40" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <p className="text-center text-muted-foreground text-sm font-medium">Notification expired</p>
      </div>
    );
  }

  return (
    <div className="relative select-none">
      {/* Accept indicator (right swipe) */}
      <div className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none z-0"
        style={{ background: "rgba(34,197,94,0.15)", opacity: isAcceptVisible ? Math.min(1, dragX / 100) : 0, transition: isDragging.current ? "none" : "opacity 0.2s" }}>
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="w-12 h-12 text-success" />
          <span className="text-success font-bold text-lg">ACCEPT</span>
        </div>
      </div>

      {/* Reject indicator (left swipe) */}
      <div className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none z-0"
        style={{ background: "rgba(239,68,68,0.15)", opacity: isRejectVisible ? Math.min(1, -dragX / 100) : 0, transition: isDragging.current ? "none" : "opacity 0.2s" }}>
        <div className="flex flex-col items-center gap-2">
          <XCircle className="w-12 h-12 text-destructive" />
          <span className="text-destructive font-bold text-lg">SKIP</span>
        </div>
      </div>

      {/* Card */}
      <div
        ref={cardRef}
        className="relative z-10 rounded-3xl overflow-hidden swipe-card"
        style={{
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full" style={{ background: job.phase === 1 ? "linear-gradient(90deg, hsl(221 83% 53%), hsl(262 83% 58%))" : "linear-gradient(90deg, hsl(38 92% 50%), hsl(0 84% 60%))" }} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "hsl(var(--muted))" }}>
                {job.skillIcon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                    style={{ background: job.phase === 1 ? "rgba(59,130,246,0.15)" : "rgba(234,179,8,0.15)", color: job.phase === 1 ? "hsl(221 83% 65%)" : "hsl(38 92% 60%)" }}>
                    {job.phase === 1 ? "Nearby Match" : "Nearby Open"}
                  </span>
                </div>
                <p className="font-bold text-sm">{job.skillName}</p>
              </div>
            </div>
            <CountdownTimer expiresAt={job.expiresAt} onExpire={() => setExpired(true)} />
          </div>

          {/* Job info */}
          <div className="mb-4">
            <h3 className="font-bold text-base mb-1">{job.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{job.description}</p>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground truncate">{job.address}</p>
          </div>

          {/* Payment breakdown */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "hsl(var(--muted))" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Customer Pays</span>
              <span className="font-bold">₹{(job.budget).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">App Commission (10%)</span>
              <span className="text-sm text-warning">-₹{job.commission.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "hsl(142 71% 55%)" }}>You Earn</span>
              <span className="text-xl font-bold" style={{ color: "hsl(142 71% 55%)" }}>₹{job.providerAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Swipe hint */}
          <div className="flex items-center gap-2 mb-4 justify-center">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>←</span>
              <span>Skip</span>
            </div>
            <div className="flex-1 flex items-center justify-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              <div className="w-3 h-1.5 rounded-full bg-muted-foreground/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Accept</span>
              <span>→</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onReject}
              className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm"
              style={{ border: "1.5px solid hsl(0 84% 60%)", color: "hsl(0 84% 60%)" }}
            >
              <XCircle className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 h-12 btn-success flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              {accepting ? "Accepting..." : "Accept Job"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage({ notifications, removeNotification, clearUnread }: Props) {
  useEffect(() => {
    clearUnread();
  }, [clearUnread]);

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Job Alerts</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Swipe right to accept, left to skip</p>
          </div>
          {notifications.length > 0 && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "hsl(0 84% 60%)" }}>
              {notifications.length}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 pb-10">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "hsl(var(--muted))" }}>
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-2">No Active Alerts</h3>
            <p className="text-sm text-muted-foreground text-center max-w-[240px]">
              Make sure you're online. New job requests near you will appear here in real-time.
            </p>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Waiting for nearby jobs...</span>
            </div>
          </div>
        ) : notifications.map((job) => (
          <SwipeCard
            key={job.id}
            job={job}
            onAccept={() => removeNotification(job.id)}
            onReject={() => removeNotification(job.id)}
          />
        ))}
      </div>
    </div>
  );
}
