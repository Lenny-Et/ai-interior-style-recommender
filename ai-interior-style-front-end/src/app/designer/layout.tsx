"use client";
import AppShell from "@/components/layout/AppShell";
import DesignerAuthGuard from "@/components/auth/DesignerAuthGuard";
import { usePathname } from "next/navigation";

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPendingApprovalPage = pathname === "/designer/pending-approval";

  return (
    <DesignerAuthGuard>
      {isPendingApprovalPage ? (
        children
      ) : (
        <AppShell>{children}</AppShell>
      )}
    </DesignerAuthGuard>
  );
}
