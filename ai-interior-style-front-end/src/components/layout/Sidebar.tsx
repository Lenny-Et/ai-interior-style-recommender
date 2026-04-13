"use client";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Sparkles, Images, Heart, Users, MessageSquare,
  ShoppingBag, CreditCard, Settings, BarChart2, Shield, UserCheck,
  DollarSign, Ticket, PanelLeft, LogOut, Briefcase, Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navByRole = {
  homeowner: [
    { label: "Dashboard",       href: "/dashboard",              icon: LayoutDashboard },
    { label: "AI Recommender",  href: "/dashboard/ai",           icon: Sparkles },
    { label: "Discover Feed",   href: "/dashboard/feed",         icon: Images },
    { label: "Style Boards",    href: "/dashboard/boards",       icon: Heart },
    { label: "Designer Search", href: "/dashboard/designers",    icon: Users },
    { label: "AI Studio",       href: "/dashboard/ai-studio",    icon: MessageSquare },
    { label: "Custom Requests", href: "/dashboard/requests",     icon: ShoppingBag },
    { label: "Payments",        href: "/dashboard/payments",     icon: CreditCard },
    { label: "Settings",        href: "/dashboard/settings",     icon: Settings },
  ],
  designer: [
    { label: "Dashboard",       href: "/designer",               icon: LayoutDashboard },
    { label: "Portfolio",       href: "/designer/portfolio",     icon: Briefcase },
    { label: "Requests",        href: "/designer/requests",      icon: Ticket },
    { label: "Analytics",       href: "/designer/analytics",     icon: BarChart2 },
    { label: "Earnings",        href: "/designer/earnings",      icon: DollarSign },
    { label: "Notifications",   href: "/designer/notifications", icon: Bell },
    { label: "Settings",        href: "/designer/settings",      icon: Settings },
  ],
  admin: [
    { label: "Overview",        href: "/admin",                  icon: LayoutDashboard },
    { label: "Moderation",      href: "/admin/moderation",       icon: Shield },
    { label: "Users",           href: "/admin/users",            icon: UserCheck },
    { label: "Transactions",    href: "/admin/transactions",     icon: DollarSign },
    { label: "Analytics",       href: "/admin/analytics",        icon: BarChart2 },
    { label: "Configuration",   href: "/admin/config",           icon: Settings },
  ],
  guest: [],
};

export default function Sidebar() {
  const { user, sidebarOpen } = useAppStore();
  const role = user?.role ?? "guest";
  const pathname = usePathname();
  const items = navByRole[role] ?? [];

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 bottom-0 z-30 flex flex-col border-r border-surface-border bg-surface transition-all duration-300",
        sidebarOpen ? "w-56" : "w-0 overflow-hidden"
      )}
    >
      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                  : "text-text-muted hover:bg-surface-hover hover:text-purple-200"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand-400" : "text-text-muted")} />
              <span className="truncate">{label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="p-3 border-t border-surface-border">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
        <div className="mt-2 px-3 py-2 rounded-xl bg-brand-600/10 border border-brand-500/20">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Signed in as</p>
          <p className="text-xs font-semibold text-purple-200 truncate">{user?.name}</p>
          <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
}
