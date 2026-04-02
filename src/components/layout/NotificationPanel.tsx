"use client";
import { useAppStore } from "@/lib/store";
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";

const icons = {
  info:    <Info className="w-4 h-4 text-blue-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-gold-400" />,
  error:   <XCircle className="w-4 h-4 text-red-400" />,
};

export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAllRead } = useAppStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 glass rounded-2xl border border-surface-border shadow-card z-50 overflow-hidden animate-slide-up"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-sm text-white">Notifications</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={markAllRead} className="text-[10px] text-text-muted hover:text-brand-400 flex items-center gap-1 transition-colors">
            <CheckCheck className="w-3 h-3" />Mark all read
          </button>
          <button onClick={onClose} className="ml-2 text-text-muted hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-surface-border">
        {notifications.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">All caught up!</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-hover transition-colors ${!n.read ? "bg-brand-600/5" : ""}`}>
              <div className="mt-0.5 shrink-0">{icons[n.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{n.title}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-text-muted/60 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-border">
        <Button variant="ghost" size="sm" fullWidth>View all notifications</Button>
      </div>
    </div>
  );
}
