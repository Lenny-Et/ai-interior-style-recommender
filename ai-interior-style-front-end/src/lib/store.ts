"use client";
import { create } from "zustand";

export type Role = "guest" | "homeowner" | "designer" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  verified?: boolean;
}

interface AppState {
  user: User | null;
  theme: "dark" | "light";
  sidebarOpen: boolean;
  notifications: Notification[];
  setUser: (user: User | null) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "info" | "success" | "warning" | "error";
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: "u1",
    name: "Alex Johnson",
    email: "alex@example.com",
    role: "homeowner",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop",
  },
  theme: "dark",
  sidebarOpen: true,
  notifications: [
    { id: "n1", title: "AI design ready", message: "Your modern living room design is complete!", read: false, createdAt: new Date().toISOString(), type: "success" },
    { id: "n2", title: "New follower", message: "Sara M. started following you.", read: false, createdAt: new Date().toISOString(), type: "info" },
    { id: "n3", title: "Custom request", message: "You have a new custom design request.", read: true, createdAt: new Date().toISOString(), type: "info" },
  ],
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
  markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
}));
