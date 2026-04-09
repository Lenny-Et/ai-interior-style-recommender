// designer analytics metrics and growth charts initialized 
// "use client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BarChart2, Eye, Heart, Users, TrendingUp, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

const MONTHLY = [
  { month: "Oct", views: 820,  saves: 140, followers: 12 },
  { month: "Nov", views: 1450, saves: 310, followers: 41 },
  { month: "Dec", views: 1100, saves: 230, followers: 28 },
  { month: "Jan", views: 2300, saves: 590, followers: 87 },
  { month: "Feb", views: 1800, saves: 430, followers: 62 },
  { month: "Mar", views: 3200, saves: 950, followers: 184 },
  { month: "Apr", views: 3700, saves: 1100,followers: 210 },
];

const CONVERSION = [
  { design: "Pure Serenity",   views: 1842, profileVisits: 214, hired: 3 },
  { design: "Nordic Light",    views: 920,  profileVisits: 88,  hired: 1 },
  { design: "Coastal Breeze",  views: 1205, profileVisits: 141, hired: 2 },
];

const TOP_DESIGNS = [
  { title: "Pure Serenity",  views: 1842, saves: 341, img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=120&h=80&fit=crop" },
  { title: "Coastal Breeze", views: 1205, saves: 260, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=120&h=80&fit=crop" },
  { title: "Nordic Light",   views: 920,  saves: 188, img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=120&h=80&fit=crop" },
];

const TOOLTIP_STYLE = { background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" };

export default function DesignerAnalyticsPage() {
  const totalViews    = MONTHLY.reduce((a, m) => a + m.views, 0);
  const totalSaves    = MONTHLY.reduce((a, m) => a + m.saves, 0);
  const totalFollowers = MONTHLY.reduce((a, m) => a + m.followers, 0);
  const convRate = ((CONVERSION.reduce((a, c) => a + c.profileVisits, 0) / totalViews) * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-violet-400" /> Analytics
          </h1>
          <p className="text-text-muted text-sm">Performance metrics for your portfolio</p>
        </div>
        <div className="flex gap-2">
          {["7D","30D","90D","All"].map(p => (
            <button key={p} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${p === "All" ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Views",      value: totalViews.toLocaleString(),    icon: Eye,        color: "text-blue-400",    bg: "bg-blue-500/10", trend: "+18%" },
          { label: "Total Saves",      value: totalSaves.toLocaleString(),    icon: Heart,      color: "text-pink-400",    bg: "bg-pink-500/10", trend: "+24%" },
          { label: "New Followers",    value: totalFollowers.toLocaleString(),icon: Users,      color: "text-violet-400",  bg: "bg-violet-500/10", trend: "+31%" },
          { label: "Conversion Rate",  value: `${convRate}%`,                 icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "Profile visits" },
        ].map(({ label, value, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white font-display">{value}</div>
            <div className="text-xs text-text-muted mt-0.5">{label}</div>
            <Badge variant="green" className="mt-2 text-[10px]"><TrendingUp className="w-2.5 h-2.5" />{trend}</Badge>
          </Card>
        ))}
      </div>

      {/* Views & saves over time */}
      <Card>
        <div className="p-5 border-b border-surface-border">
          <h2 className="font-semibold text-white">Views, Saves & Follower Growth</h2>
          <p className="text-xs text-text-muted">Last 7 months</p>
        </div>
        <div className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="av" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d946ef" stopOpacity={0.25}/><stop offset="95%" stopColor="#d946ef" stopOpacity={0}/></linearGradient>
                <linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                <linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a78bba" }} />
              <Area type="monotone" dataKey="views"     stroke="#d946ef" strokeWidth={2} fill="url(#av)" name="Views" />
              <Area type="monotone" dataKey="saves"     stroke="#f59e0b" strokeWidth={2} fill="url(#as)" name="Saves" />
              <Area type="monotone" dataKey="followers" stroke="#06b6d4" strokeWidth={2} fill="url(#af)" name="New Followers" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Conversion funnel */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">AI → Profile Conversion</h2>
            <p className="text-xs text-text-muted">How many AI recommendations led to profile visits</p>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CONVERSION}>
                <XAxis dataKey="design" tick={{ fill: "#a78bba", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="views"        fill="#7c3aed" radius={[4,4,0,0]} name="Views" />
                <Bar dataKey="profileVisits" fill="#d946ef" radius={[4,4,0,0]} name="Profile Visits" />
                <Bar dataKey="hired"        fill="#10b981" radius={[4,4,0,0]} name="Hired" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top performing designs */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Top Performing Designs</h2>
          </div>
          <div className="divide-y divide-surface-border">
            {TOP_DESIGNS.map((d, i) => (
              <div key={d.title} className="p-4 flex items-center gap-3">
                <span className="text-lg font-bold text-text-muted w-5 text-center">{i + 1}</span>
                <img src={d.img} alt={d.title} className="w-16 h-11 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{d.title}</p>
                  <div className="flex gap-3 text-xs text-text-muted mt-0.5">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{d.views.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{d.saves}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm"><ArrowRight className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
