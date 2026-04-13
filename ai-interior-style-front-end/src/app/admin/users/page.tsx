"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Users, Search, CheckCircle, Shield, Ban,
  ChevronUp, ChevronDown, MoreHorizontal, Star,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

type Role = "homeowner" | "designer" | "admin";
type UserStatus = "active" | "suspended" | "pending";

const ALL_USERS: {
  id: string; name: string; email: string; role: Role; status: UserStatus;
  joined: string; verified: boolean; avatar: string; jobs?: number; rating?: number;
}[] = [
  { id: "U001", name: "Alex Johnson",   email: "alex@example.com",   role: "homeowner", status: "active",    joined: "2026-01-15", verified: false, avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop" },
  { id: "U002", name: "Sara Mitchell",  email: "sara@example.com",   role: "designer",  status: "active",    joined: "2025-09-01", verified: true,  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=80&h=80&fit=crop", jobs: 87, rating: 4.9 },
  { id: "U003", name: "James Park",     email: "james@example.com",  role: "designer",  status: "active",    joined: "2025-11-20", verified: true,  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop", jobs: 124, rating: 4.8 },
  { id: "U004", name: "Lena Rodriguez", email: "lena@example.com",   role: "designer",  status: "pending",   joined: "2026-04-01", verified: false, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", jobs: 0, rating: 0 },
  { id: "U005", name: "Maria Santos",   email: "maria@example.com",  role: "homeowner", status: "active",    joined: "2025-12-30", verified: false, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop" },
  { id: "U006", name: "Chris Nguyen",   email: "chris@example.com",  role: "homeowner", status: "suspended", joined: "2025-10-08", verified: false, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop" },
  { id: "U007", name: "David Chen",     email: "david@example.com",  role: "designer",  status: "active",    joined: "2025-08-14", verified: true,  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop", jobs: 201, rating: 4.9 },
  { id: "U008", name: "Ana Kowalski",   email: "ana@example.com",    role: "designer",  status: "active",    joined: "2026-02-28", verified: false, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", jobs: 38, rating: 4.5 },
];

const ROLE_VARIANT: Record<Role, "brand"|"gold"|"blue"> = { homeowner: "brand", designer: "gold", admin: "blue" };
const STATUS_VARIANT: Record<UserStatus, "green"|"red"|"gray"> = { active: "green", suspended: "red", pending: "gray" };

export default function UserManagementPage() {
  const [users, setUsers] = useState(ALL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [sortField, setSortField] = useState<"name"|"joined">("joined");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const toggleSort = (field: "name"|"joined") => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleVerify = (id: string) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, verified: !u.verified } : u));

  const toggleSuspend = (id: string) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status: u.status === "suspended" ? "active" : "suspended" } : u));

  const updateRole = (id: string, role: Role) =>
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));

  const filtered = users
    .filter((u) => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const v = sortField === "name" ? a.name.localeCompare(b.name) : new Date(a.joined).getTime() - new Date(b.joined).getTime();
      return sortDir === "asc" ? v : -v;
    });

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
          <Badge variant="green">Active: {users.filter((u) => u.status === "active").length}</Badge>
          <Badge variant="gray">Pending: {users.filter((u) => u.status === "pending").length}</Badge>
          <Badge variant="red">Suspended: {users.filter((u) => u.status === "suspended").length}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name or email…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 focus:outline-none focus:border-brand-500">
          <option value="all">All Roles</option>
          <option value="homeowner">Homeowner</option>
          <option value="designer">Designer</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 focus:outline-none focus:border-brand-500">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

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
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <Avatar src={u.avatar} name={u.name} size="sm" verified={u.verified} />
                </td>
                <td>
                  <p className="font-semibold text-sm text-white">{u.name}</p>
                  <p className="text-[10px] text-text-muted">{u.email}</p>
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value as Role)}
                    className="px-2 py-1 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="homeowner">Homeowner</option>
                    <option value="designer">Designer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td><Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge></td>
                <td>
                  {u.role === "designer" ? (
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{u.jobs} jobs</span>
                      {u.rating ? <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-gold-400 fill-gold-400" />{u.rating}</span> : "—"}
                    </div>
                  ) : "—"}
                </td>
                <td className="text-xs text-text-muted">{formatDate(u.joined)}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleVerify(u.id)}
                      title={u.verified ? "Remove verification" : "Verify"}
                      className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all",
                        u.verified ? "border-brand-500/40 bg-brand-600/10 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40 hover:text-brand-400"
                      )}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleSuspend(u.id)}
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
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
