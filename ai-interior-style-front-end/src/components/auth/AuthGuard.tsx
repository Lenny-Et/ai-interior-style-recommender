"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Sparkles } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "homeowner" | "designer" | "admin";
  fallbackPath?: string;
}

export default function AuthGuard({ 
  children, 
  requiredRole, 
  fallbackPath = "/auth/login" 
}: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAppStore();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('AuthGuard - Auth state:', { isAuthenticated, user, isLoading, requiredRole });
      
      // Wait for initial auth state to load
      if (isLoading) return;

      // Check if token exists in localStorage
      const token = localStorage.getItem('auth_token');
      console.log('AuthGuard - Token exists:', !!token);

      // If not authenticated, redirect to login
      if (!isAuthenticated || !user) {
        console.log('AuthGuard - Redirecting to login, not authenticated');
        router.push(fallbackPath);
        return;
      }

      // If specific role is required, check it
      if (requiredRole && user.role !== requiredRole) {
        console.log('AuthGuard - Role mismatch, redirecting', { requiredRole, userRole: user.role });
        // Redirect to appropriate dashboard based on user's actual role
        const redirectMap: Record<string, string> = {
          homeowner: "/dashboard",
          designer: "/designer", 
          admin: "/admin"
        };
        router.push(redirectMap[user.role] || "/dashboard");
        return;
      }

      console.log('AuthGuard - Authentication successful');
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, user, isLoading, requiredRole, fallbackPath, router]);

  // Show loading while checking auth
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-glow animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-muted text-sm mt-4">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
