"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Users, Search, CheckCircle, Shield, Ban,
  ChevronUp, ChevronDown, MoreHorizontal, Star,
  Loader2, RefreshCw,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

type Role = "homeowner" | "designer" | "admin";
type UserStatus = "active" | "suspended" | "pending";

interface BackendUser {
  _id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    profilePicture?: string;
  };
  email: string;
  role: Role;
  is_verified?: boolean;
  status?: UserStatus;
  createdAt: string;
  portfolioCount?: number;
  followerCount?: number;
  averageRating?: number;
  transactionCount?: number;
}

const ROLE_VARIANT: Record<Role, "brand"|"gold"|"blue"> = { 
  homeowner: "brand", 
  designer: "gold", 
  admin: "blue" 
};

const STATUS_VARIANT: Record<UserStatus, "green"|"red"|"gray"> = { 
  active: "green", 
  suspended: "red", 
  pending: "gray" 
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [sortField, setSortField] = useState<"name"|"joined">("joined");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(async (page = 1, searchQuery = "", role = "all", status = "all", sort = "joined", order = "desc") => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAdminUsers(page, 20, role === "all" ? undefined : role, searchQuery || undefined);
      console.log('API Response:', response); // Debug log
      setUsers((response as any)?.users || []);
      setTotalUsers((response as any)?.pagination?.total || 0);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err?.error || err?.message || 'Failed to load users');
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search and filter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1, search, roleFilter, statusFilter, sortField, sortDir);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, roleFilter, statusFilter, sortField, sortDir, fetchUsers]);

  const toggleSort = (field: "name"|"joined") => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await apiClient.updateUserStatus(userId, status);
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, status: status as UserStatus } : u
      ));
      toast.success(`User ${status === 'suspended' ? 'suspended' : 'activated'} successfully`);
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      toast.error(err?.error || 'Failed to update user status');
    }
  };

  const updateUserRole = async (userId: string, role: Role) => {
    try {
      await apiClient.updateUserStatus(userId, role);
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, role } : u
      ));
      toast.success(`User role updated to ${role}`);
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      toast.error(err?.error || 'Failed to update user role');
    }
  };

  const toggleVerification = async (userId: string, currentVerified: boolean) => {
    try {
      // This would need a specific endpoint for verification toggle
      await apiClient.updateUserStatus(userId, currentVerified ? 'unverified' : 'verified');
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, is_verified: !currentVerified } : u
      ));
      toast.success(`User ${currentVerified ? 'unverified' : 'verified'} successfully`);
    } catch (err: any) {
      console.error('Failed to toggle verification:', err);
      toast.error(err?.error || 'Failed to update verification status');
    }
  };

  const getUserName = (user: BackendUser) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    }
    return user.profile?.company || 'Unknown User';
  };

  const getStats = () => {
    const active = users.filter(u => u.status === 'active').length;
    const pending = users.filter(u => u.status === 'pending').length;
    const suspended = users.filter(u => u.status === 'suspended').length;
    return { active, pending, suspended };
  };

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-400" /> User Directory
          </h1>
          <p className="text-text-muted text-sm">{users.length} total accounts</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="green">Active: {stats.active}</Badge>
          <Badge variant="gray">Pending: {stats.pending}</Badge>
          <Badge variant="red">Suspended: {stats.suspended}</Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchUsers()}
            className="ml-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400 mr-2" />
          <span className="text-text-muted">Loading users...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchUsers()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search users by name or email…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" 
            />
          </div>
          <select 
            value={roleFilter} 
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Roles</option>
            <option value="homeowner">Homeowner</option>
            <option value="designer">Designer</option>
            <option value="admin">Admin</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      )}

      {/* Users table */}
      {!loading && !error && (
        <Card>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-white transition-colors">
                    Name {sortField === "name" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                  </button>
                </th>
                <th>Role</th>
                <th>Status</th>
                <th>Designer Info</th>
                <th>
                  <button onClick={() => toggleSort("joined")} className="flex items-center gap-1 hover:text-white transition-colors">
                    Joined {sortField === "joined" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const userName = getUserName(u);
                return (
                  <tr key={u._id}>
                    <td>
                      <Avatar 
                        src={u.profile?.profilePicture} 
                        name={userName} 
                        size="sm" 
                        verified={u.is_verified || false} 
                      />
                    </td>
                    <td>
                      <p className="font-semibold text-sm text-white">{userName}</p>
                      <p className="text-[10px] text-text-muted">{u.email}</p>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u._id, e.target.value as Role)}
                        className="px-2 py-1 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all"
                      >
                        <option value="homeowner">Homeowner</option>
                        <option value="designer">Designer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td><Badge variant={u.status ? STATUS_VARIANT[u.status] : "gray"}>{u.status || "unknown"}</Badge></td>
                    <td>
                      {u.role === "designer" ? (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{u.portfolioCount || 0} jobs</span>
                          {u.averageRating ? (
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                              {u.averageRating.toFixed(1)}
                            </span>
                          ) : "—"}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="text-xs text-text-muted">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleVerification(u._id, u.is_verified || false)}
                          title={u.is_verified ? "Remove verification" : "Verify"}
                          className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                            u.is_verified ? "border-brand-500/40 bg-brand-600/10 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40 hover:text-brand-400"
                          )}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateUserStatus(u._id, u.status === 'suspended' ? 'active' : 'suspended')}
                          title={u.status === "suspended" ? "Unsuspend" : "Suspend"}
                          className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                            u.status === "suspended" ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-surface-border text-text-muted hover:border-red-500/40 hover:text-red-400"
                          )}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-surface-border text-text-muted hover:border-brand-500/40 hover:text-brand-400 flex items-center justify-center transition-all">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Pagination info */}
          <div className="flex items-center justify-between p-4 text-xs text-text-muted border-t border-surface-border">
            <span>Showing {users.length} of {totalUsers} users</span>
            <span>Page {currentPage}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
