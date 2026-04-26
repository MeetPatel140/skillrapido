import { useLocation } from "wouter";
import { Home, PlusSquare, List, Wallet, User } from "lucide-react";
import CustomerHome from "./CustomerHome";
import PostJobPage from "./PostJobPage";
import JobsPage from "./JobsPage";
import JobDetailPage from "./JobDetailPage";
import WalletPage from "./WalletPage";
import ProfilePage from "./ProfilePage";

const NAV = [
  { path: "/customer/home", icon: Home, label: "Home" },
  { path: "/customer/post", icon: PlusSquare, label: "Post Job" },
  { path: "/customer/jobs", icon: List, label: "My Jobs" },
  { path: "/customer/wallet", icon: Wallet, label: "Wallet" },
  { path: "/customer/profile", icon: User, label: "Profile" },
];

function renderCustomerPage(location: string, navigate: (p: string) => void) {
  // Match /customer/jobs/<id>
  const jobDetailMatch = /^\/customer\/jobs\/(\d+)$/.exec(location);
  if (jobDetailMatch) return <JobDetailPage routeId={jobDetailMatch[1]} />;

  if (location === "/customer/home" || location === "/customer") return <CustomerHome />;
  if (location === "/customer/post") return <PostJobPage />;
  if (location === "/customer/jobs") return <JobsPage />;
  if (location === "/customer/wallet") return <WalletPage />;
  if (location === "/customer/profile") return <ProfilePage />;

  // Fallback: redirect to home
  navigate("/customer/home");
  return null;
}

export default function CustomerLayout() {
  const [location, navigate] = useLocation();

  return (
    <div className="app-shell">
      <div className="screen-content">
        {renderCustomerPage(location, navigate)}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location === path || (path === "/customer/jobs" && location.startsWith("/customer/jobs"));
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[56px]"
                style={active ? { background: "rgba(59,130,246,0.12)" } : {}}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{ color: active ? "hsl(221 83% 60%)" : "hsl(var(--muted-foreground))" }}
                  strokeWidth={active ? 2.5 : 1.8}
                />
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
