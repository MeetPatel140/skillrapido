import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: ReactNode;
  roles?: ("customer" | "provider" | "admin")[];
}

export function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { user, loading: isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && roles && !roles.includes(user.role)) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (roles && !roles.includes(user.role)) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
