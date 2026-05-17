"use client";
import { useAppStore } from "@/lib/store";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function DesignerStatusPage() {
  const { user } = useAppStore();

  if (!user || user.role !== 'designer') {
    // Should ideally be caught by AuthGuard, but as a fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-text-muted">You do not have permission to view this page.</p>
          <Link href="/auth/login">
            <Button className="mt-6">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const approvalStatus = user.approvalStatus;

  let title = "";
  let message = "";
  let icon = null;
  let iconColor = "";
  let showDashboardLink = false;

  switch (approvalStatus) {
    case 'pending':
      title = "Application Under Review";
      message = "Thank you for your application! Your profile is currently being reviewed by our team. We'll notify you once a decision has been made. This usually takes 24-48 hours.";
      icon = <Clock className="w-16 h-16 text-yellow-500" />;
      iconColor = "text-yellow-500";
      break;
    case 'rejected':
      title = "Application Not Approved";
      message = "We appreciate your interest in joining Homitify. Unfortunately, your application did not meet our current criteria. Your data has been saved for future review, and we may reach out if new opportunities arise.";
      icon = <XCircle className="w-16 h-16 text-red-500" />;
      iconColor = "text-red-500";
      break;
    case 'approved':
      title = "Application Approved!";
      message = "Congratulations! Your designer application has been approved. You can now access your designer dashboard and start showcasing your work.";
      icon = <CheckCircle className="w-16 h-16 text-green-500" />;
      iconColor = "text-green-500";
      showDashboardLink = true;
      break;
    default:
      title = "Unknown Status";
      message = "There was an issue retrieving your application status. Please contact support if this persists.";
      icon = <Clock className="w-16 h-16 text-gray-500" />;
      iconColor = "text-gray-500";
      break;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="text-center card p-8 max-w-md w-full">
        <div className={`mx-auto mb-6 ${iconColor}`}>
          {icon}
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-4">{title}</h1>
        <p className="text-text-muted mb-6">{message}</p>
        {showDashboardLink && (
          <Link href="/designer">
            <Button className="mt-6">Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </Link>
        )}
        {!showDashboardLink && (
          <p className="text-sm text-text-muted mt-6">
            If you believe this is an error, please <Link href="/support" className="text-brand-400 hover:underline">contact support</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
