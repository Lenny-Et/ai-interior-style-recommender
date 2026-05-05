import AppShell from "@/components/layout/AppShell";
import AdminAuthGuard from "@/components/auth/AdminAuthGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGuard>
      <AppShell>{children}</AppShell>
    </AdminAuthGuard>
  );
}
