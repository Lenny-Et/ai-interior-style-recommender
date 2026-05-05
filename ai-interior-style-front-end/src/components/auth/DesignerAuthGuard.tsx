"use client";
import AuthGuard from "./AuthGuard";

interface DesignerAuthGuardProps {
  children: React.ReactNode;
}

export default function DesignerAuthGuard({ children }: DesignerAuthGuardProps) {
  return (
    <AuthGuard requiredRole="designer" fallbackPath="/auth/login">
      {children}
    </AuthGuard>
  );
}
