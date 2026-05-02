"use client";
import { useState, useEffect } from "react";
import { Bell, CheckCircle, X, Clock, User, Heart, MessageSquare, DollarSign } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'new_like' | 'new_follower' | 'new_request' | 'payment_received' | 'system';
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

const notificationIcons = {
  new_like: Heart,
  new_follower: User,
  new_request: MessageSquare,
  payment_received: DollarSign,
  system: Bell,
};

const notificationColors = {
  new_like: 'text-pink-400',
  new_follower: 'text-blue-400',
  new_request: 'text-violet-400',
  payment_received: 'text-emerald-400',
  system: 'text-gray-400',
};

export default function DesignerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getNotifications(1, 50);
      const notificationData = (response as any).data || response;
      const items = notificationData.notifications || notificationData || [];
      setNotifications(items);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to mark all as read");
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Notifications</h1>
          <p className="text-text-muted text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-card border border-surface-border rounded-lg p-1">
            {(['all', 'unread', 'read'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  filter === f
                    ? "bg-brand-600 text-white"
                    : "text-text-muted hover:text-white"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-semibold text-white">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white">No notifications</p>
          <p className="text-sm mt-1">
            {filter === 'unread' ? 'No unread notifications' : 
             filter === 'read' ? 'No read notifications' : 
             'You\'ll see notifications here when they arrive'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Bell;
            const colorClass = notificationColors[notification.type] || 'text-gray-400';
            
            return (
              <div
                key={notification.id}
                className={cn(
                  "glass rounded-2xl border p-4 transition-all duration-200",
                  notification.isRead 
                    ? "border-surface-border opacity-60" 
                    : "border-brand-500/30 bg-brand-600/5"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg bg-surface-card", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-semibold text-white mb-1",
                          !notification.isRead && "text-brand-300"
                        )}>
                          {notification.title}
                        </h3>
                        <p className="text-text-muted text-sm leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-text-muted" />
                          <span className="text-xs text-text-muted">
                            {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="shrink-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
