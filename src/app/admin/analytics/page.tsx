"use client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { BarChart2, Users, TrendingUp, Activity, Globe, Zap } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const USER_GROWTH = [
  { month: "Sep", users: 38200 }, { month: "Oct", users: 40100 }, { month: "Nov", users: 43500 },
  { month: "Dec", users: 45800 }, { month: "Jan", users: 47200 }, { month: "Feb", users: 49900 }, { month: "Mar", users: 52441 },
];

const STYLE_DIST = [
  { name: "Minimalist",   value: 2840, color: "#d946ef" },
  { name: "Scandinavian", value: 1920, color: "#7c3aed" },
  { name: "Modern",       value: 1740, color: "#3b82f6" },
  { name: "Bohemian",     value: 1210, color: "#f59e0b" },
  { name: "Industrial",   value: 980,  color: "#10b981" },
  { name: "Other",        value: 2340, color: "#6b7280" },
];

const LATENCY = [
  { hour: "00:00", ms: 142 }, { hour: "04:00", ms: 98  }, { hour: "08:00", ms: 210 },
  { hour: "12:00", ms: 287 }, { hour: "16:00", ms: 245 }, { hour: "20:00", ms: 189 }, { hour: "23:00", ms: 155 },
];

const DAILY_AI = [
  { day: "Mon", gens: 2840 }, { day: "Tue", gens: 3100 }, { day: "Wed", gens: 2950 },
  { day: "Thu", gens: 3712 }, { day: "Fri", gens: 4100 }, { day: "Sat", gens: 3600 }, { day: "Sun", gens: 2700 },
];

const TOOLTIP_STYLE = { background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" };

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <BarChart2 className="w-7 h-7 text-violet-400" /> Platform Analytics
        </h1>
        <p className="text-text-muted text-sm">High-level overview of platform health, growth, and usage patterns</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Users",     value: "52.4K", icon: Users,       color: "text-blue-400",    bg: "bg-blue-500/10" },
          { label: "Weekly Active",   value: "18.2K", icon: Activity,    color: "text-brand-400",   bg: "bg-brand-500/10" },
          { label: "Pro Designers",   value: "1,248", icon: TrendingUp,  color: "text-gold-400",    bg: "bg-gold-500/10" },
          { label: "AI Gens / Day",   value: "3,712", icon: Zap,         color: "text-violet-400",  bg: "bg-violet-500/10" },
          { label: "Avg Latency",     value: "187ms", icon: Globe,       color: "text-cyan-400",    bg: "bg-cyan-500/10" },
          { label: "Uptime",          value: "99.9%", icon: Activity,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-4">
            <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <div className="text-xl font-bold text-white font-display">{value}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* User growth */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Total User Growth</h2>
            <p className="text-xs text-text-muted">Cumulative registered users</p>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={USER_GROWTH}>
                <XAxis dataKey="month" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="users" stroke="#d946ef" strokeWidth={2} dot={{ fill: "#d946ef", r: 4 }} name="Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Style distribution */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Design Style Distribution</h2>
            <p className="text-xs text-text-muted">By AI generation requests</p>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={STYLE_DIST} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72}>
                    {STYLE_DIST.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {STYLE_DIST.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-text-muted">{s.name}</span>
                  </div>
                  <span className="font-medium text-white">{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Daily AI generations */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-semibold text-white">Daily AI Generations</h2>
            <p className="text-xs text-text-muted">This week</p>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_AI}>
                <XAxis dataKey="day" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="gens" fill="#7c3aed" radius={[6,6,0,0]} name="AI Generations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Server latency */}
        <Card>
          <div className="p-4 border-b border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">API Latency (24h)</h2>
                <p className="text-xs text-text-muted">Average response time in ms</p>
              </div>
              <Badge variant="green"><Activity className="w-3 h-3" /> Healthy</Badge>
            </div>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={LATENCY}>
// admin analytics module initialized                <XAxis dataKey="hour" tick={{ fill: "#a78bba", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="ms" stroke="#06b6d4" strokeWidth={2} dot={false} name="Latency (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}// admin analytics module initialized 
