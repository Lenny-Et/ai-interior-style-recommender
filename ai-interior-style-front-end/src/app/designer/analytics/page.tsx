"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BarChart2, Eye, Heart, Users, TrendingUp, ArrowRight, Download } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface AnalyticsData {
  overview: {
    totalPortfolioItems: number;
    totalViews: number;
    totalLikes: number;
    totalSaves: number;
    followerCount: number;
    completedProjects: number;
    totalEarnings: number;
    averageViewsPerItem: number;
  };
  monthlyData: Array<{
    month: string;
    views: number;
    likes: number;
    items: number;
  }>;
  topDesigns: Array<{
    title: string;
    views: number;
    imageUrl: string;
    createdAt: string;
  }>;
  recentActivity: {
    likes: number;
    saves: number;
  };
}

const TOOLTIP_STYLE = { background: "#1a1028", border: "1px solid #2d1f42", borderRadius: "12px", color: "#f3e8ff" };

export default function DesignerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDesignerAnalytics(timeRange);
      const analyticsData = (response as any).data || response;
      setAnalytics(analyticsData);
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="flex gap-2">
            {(['7d','30d','90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  timeRange === range
                    ? "bg-brand-600 text-white shadow-glow-sm"
                    : "bg-surface-card border border-surface-border text-text-muted hover:border-brand-500/40"
                )}
              >
                {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Overview cards */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-semibold text-white">Loading analytics...</p>
        </div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Views",    value: analytics.overview.totalViews.toLocaleString(),    icon: Eye,     color: "text-brand-400", bg: "bg-brand-500/10" },
              { label: "Total Saves",    value: analytics.overview.totalSaves.toLocaleString(),    icon: Heart,    color: "text-pink-400", bg: "bg-pink-500/10" },
              { label: "Followers",      value: analytics.overview.followerCount.toLocaleString(), icon: Users,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Portfolio Items", value: analytics.overview.totalPortfolioItems.toString(),    icon: TrendingUp, color: "text-gold-400", bg: "bg-gold-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="p-5">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold text-white font-display">{value}</div>
                <div className="text-xs text-text-muted mt-0.5">{label}</div>
              </Card>
            ))}
          </div>

          {/* Performance chart */}
          <Card>
            <div className="p-5 border-b border-surface-border">
              <h3 className="font-semibold text-white">Performance Overview</h3>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.monthlyData}>
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Area type="monotone" dataKey="views" stackId="1" stroke="#d946ef" fill="#d946ef" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="likes" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top designs */}
          <Card>
            <div className="p-5 border-b border-surface-border flex items-center justify-between">
              <h3 className="font-semibold text-white">Top Performing Designs</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="p-5 space-y-4">
              {analytics.topDesigns.map((design, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-lg font-bold text-text-muted w-6">{idx + 1}</span>
                  <img 
                    src={design.imageUrl || '/placeholder-design.jpg'} 
                    alt={design.title || 'Design'} 
                    className="w-16 h-12 rounded-lg object-cover" 
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">{design.title || 'Untitled Design'}</p>
                    <p className="text-sm text-text-muted">
                      {(design.views || 0).toLocaleString()} views
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <div className="text-center py-16 text-text-muted">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white">No analytics data available</p>
          <p className="text-sm mt-1">Start adding portfolio items to see your analytics</p>
        </div>
      )}
    </div>
  );
}
