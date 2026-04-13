"use client";
import Card, { CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Users, DollarSign, Image as ImageIcon, Ticket,
  TrendingUp, Shield, Clock, ArrowRight, Activity,
  BarChart2, AlertTriangle, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const DAILY_USERS = [
  { day: "Mon", users: 420 }, { day: "Tue", users: 515 }, { day: "Wed", users: 480 },
  { day: "Thu", users: 620 }, { day: "Fri", users: 710 }, { day: "Sat", users: 590 }, { day: "Sun", users: 435 },
];

const POPULAR_STYLES = [
  { style: "Minimalist",   count: 2840 },
  { style: "Scandinavian", count: 1920 },
  { style: "Modern",       count: 1740 },
  { style: "Bohemian",     count: 1210 },
  { style: "Industrial",   count: 980  },
];

const ADMIN_STATS = [
  { label: "Total Users",        value: "52,441", icon: Users,      color: "text-blue-400",    bg: "bg-blue-500/10",    trend: "+8.2%" },
  { label: "Platform Revenue",   value: "$18,430",icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "+14.5%" },
  { label: "Pending Approvals",  value: "14",     icon: Clock,      color: "text-gold-400",    bg: "bg-gold-500/10",    trend: "Action needed" },
  { label: "Active Designers",   value: "1,248",  icon: Shield,     color: "text-brand-400",   bg: "bg-brand-500/10",   trend: "+3.1%" },
  { label: "AI Generations Today",value: "3,712", icon: TrendingUp, color: "text-violet-400",  bg: "bg-violet-500/10",  trend: "+22%" },
  { label: "Flagged Content",    value: "6",      icon: AlertTriangle,color:"text-red-400",    bg: "bg-red-500/10",     trend: "Review" },
];

const RECENT_APPROVALS = [
  { name: "James Park",     img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=100&h=80&fit=crop", style: "Scandinavian", time: "5m ago" },
  { name: "Lena Rodriguez", img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=100&h=80&fit=crop", style: "Bohemian",     time: "12m ago" },
  { name: "Mike Thompson",  img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=100&h=80&fit=crop",   style: "Industrial",   time: "31m ago" },
];

export default function AdminOverviewPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-brand-400" />
            <h1 className="font-display text-3xl font-bold text-white">Admin Overview</h1>
          </div>
          <p className="text-text-muted text-sm">Platform health, moderation queue, and financials at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-text-muted">All systems operational</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_STATS.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="p-5">
            <CardBody className="!px-0 !py-0">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <Badge variant={trend.startsWith("+") ? "green" : trend === "Review" || trend === "Action needed" ? "red" : "gray"}>{trend}</Badge>
              </div>
              <div className="text-2xl font-bold text-white font-display">{value}</div>
              <div className="text-xs text-text-muted mt-0.5">{label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Daily active users */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Daily Active Users</h2>
            <p className="text-xs text-text-muted">This week</p>
          </div>
          <div className="p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DAILY_USERS}>
                <XAxis dataKey="day" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
                <Line type="monotone" dataKey="users" stroke="#d946ef" strokeWidth={2} dot={{ fill: "#d946ef", r: 4 }} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Popular styles */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Most Popular Styles</h2>
            <p className="text-xs text-text-muted">By AI generation count</p>
          </div>
          <div className="p-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={POPULAR_STYLES} layout="vertical">
                <XAxis type="number" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="style" type="category" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[0,6,6,0]} name="Generations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pending approvals */}
        <Card>
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gold-400" />
              <h2 className="font-semibold text-white">Pending Approvals</h2>
              <Badge variant="gold">14</Badge>
            </div>
            <Link href="/admin/moderation">
              <Button variant="ghost" size="sm">Review all <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
          <div className="divide-y divide-surface-border">
            {RECENT_APPROVALS.map((item) => (
              <div key={item.name} className="p-4 flex items-center gap-3">
                <img src={item.img} alt="" className="w-14 h-11 object-cover rounded-xl border border-surface-border" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.style} · {item.time}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /></Button>
                  <Button size="sm" variant="destructive"><AlertTriangle className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick links */}
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Moderation Hub",    href: "/admin/moderation",   icon: Shield,    color: "text-brand-400",    bg: "bg-brand-500/10" },
              { label: "User Management",   href: "/admin/users",        icon: Users,     color: "text-blue-400",     bg: "bg-blue-500/10" },
              { label: "Transaction Log",   href: "/admin/transactions", icon: DollarSign,color: "text-emerald-400",  bg: "bg-emerald-500/10" },
              { label: "Analytics",         href: "/admin/analytics",    icon: BarChart2, color: "text-violet-400",   bg: "bg-violet-500/10" },
              { label: "Flagged Content",   href: "/admin/moderation",   icon: AlertTriangle,color:"text-red-400",   bg: "bg-red-500/10" },
              { label: "System Config",     href: "/admin/config",       icon: Activity,  color: "text-gold-400",     bg: "bg-gold-500/10" },
            ].map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={label} href={href} className={`flex items-center gap-3 p-4 rounded-xl border border-surface-border ${bg} hover:border-brand-500/40 hover:scale-[1.02] transition-all duration-200 cursor-pointer`}>
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium text-white">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
