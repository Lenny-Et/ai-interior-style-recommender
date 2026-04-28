"use client";
import AuthGuard from "./AuthGuard";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  return (
    <AuthGuard requiredRole="admin" fallbackPath="/auth/login">
      {children}
    </AuthGuard>
  );
}
