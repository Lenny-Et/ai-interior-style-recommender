"use client";
import { useAppStore } from "@/lib/store";
import { ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function PendingApprovalPage() {
  const { user, logout } = useAppStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md w-full text-center p-8 rounded-2xl border border-surface-border bg-surface-card shadow-lg">
        <div className="w-16 h-16 rounded-full bg-brand-600/15 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-brand-400" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-3">Account Under Review</h1>
        <p className="text-text-muted mb-6">
          Thank you for registering as a designer, {user?.name || user?.email}!
          Your account is currently under review by our administration team.
          We'll notify you via email once your approval status has been updated.
        </p>
        <p className="text-sm text-text-muted mb-8">
          This process usually takes 24-48 hours. We appreciate your patience!
        </p>
        <Button onClick={logout} fullWidth>
          Logout
        </Button>
        <p className="text-xs text-text-muted mt-4">
          Need help? <Link href="/support" className="text-brand-400 hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}
