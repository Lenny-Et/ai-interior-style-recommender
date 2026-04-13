"use client";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Sidebar />
      <main
        className={cn(
          "transition-all duration-300 pt-0",
          sidebarOpen ? "ml-56" : "ml-0"
        )}
      >
        <div className="min-h-[calc(100vh-4rem)] p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
