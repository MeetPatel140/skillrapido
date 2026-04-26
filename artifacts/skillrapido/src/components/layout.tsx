import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, Bell, Briefcase, LayoutDashboard, Settings, DollarSign, PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavLinks = () => {
    if (!user) {
      return (
        <>
          <Link href="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </>
      );
    }

    if (user.role === "customer") {
      return (
        <>
          <Link href="/customer/dashboard" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/customer/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/customer/jobs" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/customer/jobs' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Briefcase className="h-4 w-4" /> My Jobs
          </Link>
          <Link href="/customer/post-job">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Post a Job
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      );
    }

    if (user.role === "provider") {
      return (
        <>
          <Link href="/provider/dashboard" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/provider/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/provider/jobs" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/provider/jobs' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Briefcase className="h-4 w-4" /> History
          </Link>
          <Link href="/provider/earnings" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/provider/earnings' ? 'text-primary' : 'text-muted-foreground'}`}>
            <DollarSign className="h-4 w-4" /> Earnings
          </Link>
          <Link href="/provider/notifications" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/provider/notifications' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Bell className="h-4 w-4" /> Radar
          </Link>
          <Link href="/provider/profile" className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${location === '/provider/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Settings className="h-4 w-4" /> Profile
          </Link>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">SkillRapido</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
          </nav>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 mt-8" onClick={() => setMobileMenuOpen(false)}>
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
