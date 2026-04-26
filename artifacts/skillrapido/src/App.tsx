import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { ThemeProvider } from "@/contexts/theme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import CustomerLayout from "@/pages/customer/CustomerLayout";
import ProviderLayout from "@/pages/provider/ProviderLayout";
import AdminLayout from "@/pages/admin/AdminLayout";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminJobs from "@/pages/admin/AdminJobs";
import AdminProviders from "@/pages/admin/AdminProviders";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminWithdrawals from "@/pages/admin/AdminWithdrawals";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminWallets from "@/pages/admin/AdminWallets";
import AdminSkills from "@/pages/admin/AdminSkills";

const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminDisputes = lazy(() => import("@/pages/admin/AdminDisputes"));
const AdminReviews = lazy(() => import("@/pages/admin/AdminReviews"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminSystemHealth = lazy(() => import("@/pages/admin/AdminSystemHealth"));
const AdminProviderQueue = lazy(() => import("@/pages/admin/AdminProviderQueue"));
const AdminBlockedUsers = lazy(() => import("@/pages/admin/AdminBlockedUsers"));

const AdminPageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
  </div>
);

function AdminRoutes() {
  return (
    <AdminLayout>
      <Suspense fallback={<AdminPageLoader />}>
        <Switch>
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/providers" component={AdminProviders} />
          <Route path="/admin/provider-queue" component={AdminProviderQueue} />
          <Route path="/admin/blocked-users" component={AdminBlockedUsers} />
          <Route path="/admin/jobs" component={AdminJobs} />
          <Route path="/admin/disputes" component={AdminDisputes} />
          <Route path="/admin/reviews" component={AdminReviews} />
          <Route path="/admin/wallets" component={AdminWallets} />
          <Route path="/admin/transactions" component={AdminTransactions} />
          <Route path="/admin/withdrawals" component={AdminWithdrawals} />
          <Route path="/admin/coupons" component={AdminCoupons} />
          <Route path="/admin/announcements" component={AdminAnnouncements} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/skills" component={AdminSkills} />
          <Route path="/admin/audit-logs" component={AdminAuditLogs} />
          <Route path="/admin/system-health" component={AdminSystemHealth} />
          <Route><Redirect to="/admin/dashboard" /></Route>
        </Switch>
      </Suspense>
    </AdminLayout>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-shell items-center justify-center flex">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const homeRedirect = user
    ? user.role === "provider" ? "/provider/home"
      : user.role === "admin" ? "/admin/dashboard"
      : "/customer/home"
    : "/login";

  return (
    <Switch>
      <Route path="/login">{user ? <Redirect to={homeRedirect} /> : <LoginPage />}</Route>
      <Route path="/register">{user ? <Redirect to={homeRedirect} /> : <RegisterPage />}</Route>

      <Route path="/admin/:rest*">
        {!user ? <Redirect to="/login" /> : user.role !== "admin" ? <Redirect to={homeRedirect} /> : <AdminRoutes />}
      </Route>

      <Route path="/customer/:rest*">
        {!user ? <Redirect to="/login" /> : user.role === "provider" ? <Redirect to="/provider/home" /> : <CustomerLayout />}
      </Route>

      <Route path="/provider/:rest*">
        {!user ? <Redirect to="/login" /> : user.role !== "provider" ? <Redirect to={homeRedirect} /> : <ProviderLayout />}
      </Route>

      <Route path="/"><Redirect to={homeRedirect} /></Route>
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </WouterRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
