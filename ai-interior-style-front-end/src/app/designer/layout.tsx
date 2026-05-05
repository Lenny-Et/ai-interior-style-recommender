import AppShell from "@/components/layout/AppShell";
import DesignerAuthGuard from "@/components/auth/DesignerAuthGuard";

export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DesignerAuthGuard>
      <AppShell>{children}</AppShell>
    </DesignerAuthGuard>
  );
}
