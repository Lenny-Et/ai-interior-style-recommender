"use client";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { BarChart2, Eye, Heart, Users, DollarSign, TrendingUp, ArrowRight, Star, Ticket, Upload, CheckCircle } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const VIEWS_DATA = [
  { month: "Oct",  views: 1200, saves: 340 },
  { month: "Nov",  views: 1850, saves: 510 },
  { month: "Dec",  views: 2100, saves: 680 },
  { month: "Jan",  views: 1700, saves: 430 },
  { month: "Feb",  views: 2800, saves: 790 },
  { month: "Mar",  views: 3200, saves: 950 },
  { month: "Apr",  views: 3700, saves: 1100 },
];

const STATS = [
  { label: "Total Views",      value: "16.6K", icon: Eye,        color: "text-blue-400",    bg: "bg-blue-500/10",    trend: "+18%" },
  { label: "Total Saves",      value: "4.8K",  icon: Heart,      color: "text-pink-400",    bg: "bg-pink-500/10",    trend: "+24%" },
  { label: "Followers",        value: "1,240", icon: Users,      color: "text-violet-400",  bg: "bg-violet-500/10",  trend: "+12%" },
  { label: "Net Earnings",     value: "$9,240",icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "+31%" },
];

const PENDING_REQUESTS = [
  { id: "TK-101", client: "Alex Johnson",   room: "Living Room",  budget: "$2,000", urgency: "High" },
  { id: "TK-102", client: "Maria Santos",   room: "Bedroom",      budget: "$1,200", urgency: "Normal" },
];

export default function DesignerDashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src="https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=120&h=120&fit=crop" name="Sara Mitchell" size="xl" verified />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-white">Sara Mitchell</h1>
              <Badge variant="brand"><CheckCircle className="w-3 h-3" /> Verified Pro</Badge>
            </div>
            <p className="text-text-muted text-sm">Minimalist · Coastal · New York, NY</p>
            <div className="flex items-center gap-1 mt-1 text-sm">
              <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
              <span className="text-white font-semibold">4.9</span>
              <span className="text-text-muted">(142 reviews)</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/designer/portfolio"><Button variant="ghost"><Upload className="w-4 h-4" /> Upload Work</Button></Link>
          <Link href="/designer/requests"><Button>View Requests</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="p-5">
            <CardBody className="!px-0 !py-0">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <Badge variant="green"><TrendingUp className="w-3 h-3" />{trend}</Badge>
              </div>
              <div className="text-2xl font-bold text-white font-display">{value}</div>
              <div className="text-xs text-text-muted mt-0.5">{label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <div className="p-5 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Performance Overview</h2>
            <p className="text-xs text-text-muted">Views & saves over the last 7 months</p>
          </div>
          <Link href="/designer/analytics">
            <Button variant="ghost" size="sm"><BarChart2 className="w-3.5 h-3.5" /> Full Analytics</Button>
          </Link>
        </div>
        <div className="p-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={VIEWS_DATA}>
              <defs>
                <linearGradient id="views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="saves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a78bba", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" }} />
              <Area type="monotone" dataKey="views" stroke="#d946ef" strokeWidth={2} fill="url(#views)" name="Views" />
              <Area type="monotone" dataKey="saves" stroke="#f59e0b" strokeWidth={2} fill="url(#saves)" name="Saves" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pending requests */}
        <Card>
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-brand-400" />
              <h2 className="font-semibold text-white">Incoming Requests</h2>
              <Badge variant="red">{PENDING_REQUESTS.length}</Badge>
            </div>
            <Link href="/designer/requests"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>
          <div className="divide-y divide-surface-border">
            {PENDING_REQUESTS.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-text-muted">{r.id}</span>
                    <Badge variant={r.urgency === "High" ? "red" : "gray"}>{r.urgency}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">{r.client}</p>
                  <p className="text-xs text-text-muted">{r.room} · {r.budget}</p>
                </div>
                <Button size="sm">Accept</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick portfolio */}
        <Card>
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <h2 className="font-semibold text-white">Top Portfolio Items</h2>
            <Link href="/designer/portfolio"><Button variant="ghost" size="sm">Manage <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1">
            {[
              "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&h=200&fit=crop",
              "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
              "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
              "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=200&h=200&fit=crop",
              "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&h=200&fit=crop",
              "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop",
            ].map((src, i) => (
              <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
