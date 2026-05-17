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
  Loader2, RefreshCw, Info, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import DesignerDetailsModal from "@/components/admin/DesignerDetailsModal";

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
  approvalStatus?: "pending" | "approved" | "rejected"; // Added for designers
  isPro?: boolean; // Added for pro accounts
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

const APPROVAL_STATUS_VARIANT: Record<NonNullable<BackendUser['approvalStatus']>, "gold"|"green"|"red"> = {
  pending: "gold",
  approved: "green",
  rejected: "red",
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
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1, searchQuery = "", role = "all", status = "all", sort = "joined", order = "desc") => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAdminUsers(page, 20, role === "all" ? undefined : role, searchQuery || undefined);
      console.log('API Response:', response);
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
      await apiClient.toggleUserVerification(userId, !currentVerified);
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, is_verified: !currentVerified } : u
      ));
      toast.success(`User ${!currentVerified ? 'verified' : 'unverified'} successfully`);
    } catch (err: any) {
      console.error('Failed to toggle verification:', err);
      toast.error(err?.error || 'Failed to update verification status');
    }
  };

  const approveDesigner = async (userId: string) => {
    try {
      await apiClient.approveDesigner(userId, 'approved');
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, approvalStatus: 'approved' } : u
      ));
      toast.success('Designer approved successfully!');
    } catch (err: any) {
      console.error('Failed to approve designer:', err);
      toast.error(err?.error || 'Failed to approve designer');
    }
  };

  const rejectDesigner = async (userId: string) => {
    try {
      await apiClient.approveDesigner(userId, 'rejected');
      setUsers((prev) => prev.map((u) => 
        u._id === userId ? { ...u, approvalStatus: 'rejected' } : u
      ));
      toast.success('Designer rejected successfully!');
    } catch (err: any) {
      console.error('Failed to reject designer:', err);
      toast.error(err?.error || 'Failed to reject designer');
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedDesignerId(userId);
    setShowDetailsModal(true);
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
            onClick={() => setShowGuidelines(true)}
            className="flex items-center gap-2"
          >
            <Info className="w-4 h-4" /> Guidelines
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchUsers()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400 mr-2" />
          <span className="text-text-muted">Loading users...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchUsers()}>
            Try Again
          </Button>
        </div>
      )}

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
                    <td>
                      {u.role === "designer" ? (
                        <div className="flex items-center gap-2">
                          <Badge variant={u.approvalStatus ? APPROVAL_STATUS_VARIANT[u.approvalStatus] : "gray"}>
                            {u.approvalStatus || "unknown"}
                          </Badge>
                          {u.isPro && <Badge variant="purple">PRO</Badge>}
                        </div>
                      ) : (
                        <Badge variant={u.status ? STATUS_VARIANT[u.status] : "gray"}>{u.status || "unknown"}</Badge>
                      )}
                    </td>
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
                        {u.role === "designer" && u.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => approveDesigner(u._id)}
                              title="Approve Designer"
                              className="w-7 h-7 rounded-lg border border-green-500/40 bg-green-600/10 text-green-400 flex items-center justify-center transition-all hover:brightness-110"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => rejectDesigner(u._id)}
                              title="Reject Designer"
                              className="w-7 h-7 rounded-lg border border-red-500/40 bg-red-600/10 text-red-400 flex items-center justify-center transition-all hover:brightness-110"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {u.role === "designer" && (
                          <button
                            onClick={() => handleViewDetails(u._id)}
                            title="View Designer Details"
                            className="w-7 h-7 rounded-lg border border-blue-500/40 bg-blue-600/10 text-blue-400 flex items-center justify-center transition-all hover:brightness-110"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
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
          
          <div className="flex items-center justify-between p-4 text-xs text-text-muted border-t border-surface-border">
            <span>Showing {users.length} of {totalUsers} users</span>
            <span>Page {currentPage}</span>
          </div>
        </Card>
      )}

      <GuidelinesModal show={showGuidelines} onClose={() => setShowGuidelines(false)} />
      <DesignerDetailsModal 
        userId={selectedDesignerId} 
        show={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)} 
      />
    </div>
  );
}

function GuidelinesModal({ show, onClose }: { show: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-surface-card rounded-2xl border border-surface-border p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-brand-400" /> Designer Evaluation Standards
              </h2>
              <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-brand-400 font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4" /> 1. Portfolio Quality
                </h3>
                <ul className="list-disc list-inside text-sm text-text-muted space-y-1 ml-2">
                  <li>Minimum 3 high-resolution project showcases.</li>
                  <li>Clear demonstration of interior design principles (lighting, balance, texture).</li>
                  <li>Originality check (not just stock photos).</li>
                </ul>
              </section>

              <section>
                <h3 className="text-gold-400 font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> 2. Professionalism
                </h3>
                <ul className="list-disc list-inside text-sm text-text-muted space-y-1 ml-2">
                  <li>Valid Company Name or Professional Portfolio link (Behance/Personal Site).</li>
                  <li>Professional bio describing their specialty and experience.</li>
                  <li>Responsive communication (if applicable).</li>
                </ul>
              </section>

              <section>
                <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> 3. Verification Levels
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-xl bg-surface border border-surface-border">
                    <p className="text-xs font-bold text-white mb-1">Standard Check</p>
                    <p className="text-[10px] text-text-muted">Email verified & Basic profile complete.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/30">
                    <p className="text-xs font-bold text-brand-400 mb-1">Homitify Verified</p>
                    <p className="text-[10px] text-brand-400/80">Portfolio reviewed by Admin. Eligible for featured list.</p>
                  </div>
                </div>
              </section>
            </div>

            <Button className="w-full mt-8" onClick={onClose}>Got it, thanks!</Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
