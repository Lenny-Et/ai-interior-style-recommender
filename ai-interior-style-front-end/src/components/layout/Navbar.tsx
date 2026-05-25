"use client";
import { useAppStore } from "@/lib/store";
import { Bell, Menu, Search, Moon, Sun, Command, Sparkles } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import { useState } from "react";
import NotificationPanel from "./NotificationPanel";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, theme, setTheme, toggleSidebar, notifications } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center px-4 gap-3 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      {/* Left: Hamburger + Logo */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg text-text-muted hover:text-brand-400 hover:bg-surface-hover transition-all"
        id="sidebar-toggle"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Link href="/" className="flex items-center gap-2 mr-4">
        <span className="font-display font-bold text-white text-lg hidden sm:block">
          Homify<span className="gradient-text">.</span>
        </span>
      </Link>

      {/* Global Search */}
      <button
        id="global-search"
        className="flex-1 max-w-md flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-card border border-surface-border text-text-muted text-sm hover:border-brand-500/60 hover:text-purple-300 transition-all group"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-surface-border bg-surface group-hover:border-brand-500/40 transition-colors">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {user && user.role === 'homeowner' && (
          !user.isPro ? (
            <Link href="/dashboard/settings" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors px-3 py-2 rounded-lg bg-brand-600/10 border border-brand-500/30">
              Upgrade to Pro
            </Link>
          ) : (
            <span className="text-sm font-medium text-gold-400 px-3 py-2 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center gap-1.5 cursor-default">
              <Sparkles className="w-3.5 h-3.5" />
              Pro
            </span>
          )
        )}
        {/* Theme Toggle */}
        <button
          id="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-surface-hover transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-btn"
            onClick={() => setNotifOpen((o) => !o)}
            className="p-2.5 rounded-lg text-text-muted hover:text-brand-400 hover:bg-surface-hover transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full ring-1 ring-surface" />
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User avatar */}
        <Link href="/dashboard" className="ml-1 flex items-center gap-2">
          {user?.isPro && <Badge variant="green">PRO</Badge>}
          <Avatar src={user?.avatarUrl} name={user?.name} size="sm" verified={user?.is_verified} />
        </Link>
      </div>
    </header>
  );
}
