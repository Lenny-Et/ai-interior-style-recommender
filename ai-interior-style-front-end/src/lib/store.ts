"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "./api-client";
import { socketService } from "./socket";

export type Role = "guest" | "homeowner" | "designer" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  verified?: boolean;
  profile?: any;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  theme: "dark" | "light";
  sidebarOpen: boolean;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  // User actions
  setUser: (user: User | null) => void;
  updateUserProfile: (profileData: any) => Promise<void>;
  
  // UI actions
  setTheme: (theme: "dark" | "light") => void;
  toggleSidebar: () => void;
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
  clearError: () => void;
  
  // Real-time actions
  initializeSocket: () => void;
  disconnectSocket: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  role: string;
  profile?: {
    firstName: string;
    lastName: string;
    [key: string]: any;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: "info" | "success" | "warning" | "error";
}

// Initialize authentication state from localStorage
const initializeAuthState = () => {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      isAuthenticated: false
    };
  }

  const token = localStorage.getItem('auth_token');
  const savedUser = localStorage.getItem('user_data');
  
  if (token && savedUser) {
    try {
      const user = JSON.parse(savedUser);
      return {
        user,
        token,
        isAuthenticated: true
      };
    } catch (error) {
      console.error('Failed to parse saved user data:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }
  
  return {
    user: null,
    token: null,
    isAuthenticated: false
  };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initializeAuthState(),
      theme: "dark",
      sidebarOpen: true,
      notifications: [],
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.login(email, password);
          const authData = (response as any).data || response;
          const { token, role, is_verified } = authData;
          
          // Store token
          if (token) localStorage.setItem('auth_token', token);
          
          // Fetch full profile for authenticated user
          let userProfile: any = null;
          try {
            const profileResp = await apiClient.getCurrentProfile();
            userProfile = (profileResp as any).data || profileResp;
          } catch (err) {
            // If fetching profile fails, fall back to basic user info
            userProfile = null;
          }

          const user: User = {
            id: userProfile?._id || 'temp-id',
            name: (userProfile?.profile?.firstName ? `${userProfile.profile.firstName} ${userProfile.profile.lastName || ''}`.trim() : email.split('@')[0]),
            email: userProfile?.email || email,
            role: (userProfile?.role as Role) || (role as Role) || 'homeowner',
            avatarUrl: userProfile?.profile?.profilePicture || undefined,
            verified: userProfile?.is_verified || is_verified || false,
            profile: userProfile?.profile || {}
          };

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          // Save user data to localStorage for persistence
          localStorage.setItem('user_data', JSON.stringify(user));

          // Initialize real-time socket connection (requires real user id)
          get().initializeSocket();
        } catch (error: any) {
          set({
            error: (error as any).error || (error as any).message || 'Login failed',
            isLoading: false
          });
          throw error;
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.register(userData);
          
          // Auto-login after successful registration
          await get().login(userData.email, userData.password);
          
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.error || error.message || 'Registration failed',
            isLoading: false
          });
          throw error;
        }
      },

      logout: () => {
        // Disconnect socket before clearing auth state
        get().disconnectSocket();
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          notifications: []
        });
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.forgotPassword(email);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.error || error.message || 'Failed to send reset email',
            isLoading: false
          });
          throw error;
        }
      },

      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.resetPassword(token, newPassword);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error.error || error.message || 'Password reset failed',
            isLoading: false
          });
          throw error;
        }
      },

      setUser: (user) => set({ user }),

      updateUserProfile: async (profileData: any) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          await apiClient.updateProfile(user.id, profileData);
          
          // Update local user data
          set({
            user: {
              ...user,
              profile: { ...user.profile, ...profileData }
            },
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.error || error.message || 'Profile update failed',
            isLoading: false
          });
          throw error;
        }
      },

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearError: () => set({ error: null }),
      
      initializeSocket: () => {
        const { user } = get();
        if (user && user.id) {
          socketService.connect(user.id);
          
          // Listen for real-time notifications
          const handleNotification = (event: CustomEvent) => {
            const notification = event.detail;
            get().addNotification({
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              read: notification.read,
              createdAt: notification.createdAt,
            });
          };
          
          window.addEventListener('socket-notification', handleNotification as EventListener);
        }
      },
      
      disconnectSocket: () => {
        socketService.disconnect();
        window.removeEventListener('socket-notification', () => {});
      },
    }),
    {
      name: 'aura-interiors-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
