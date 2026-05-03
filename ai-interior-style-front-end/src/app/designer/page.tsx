"use client";
import { useState, useEffect } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { BarChart2, Eye, Heart, Users, DollarSign, TrendingUp, ArrowRight, Star, Ticket, Upload, CheckCircle } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

interface DesignerStats {
  totalViews: number;
  totalSaves: number;
  followerCount: number;
  netEarnings: number;
  portfolioCount: number;
  averageRating: number;
  reviewCount: number;
  completedProjects: number;
}

interface ViewData {
  month: string;
  views: number;
  saves: number;
}

interface PendingRequest {
  _id: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
  };
  roomType: string;
  budget: number;
  urgency: 'High' | 'Normal' | 'Low';
  createdAt: string;
  description?: string;
}

export default function DesignerDashboard() {
  const [stats, setStats] = useState<DesignerStats | null>(null);
  const [viewsData, setViewsData] = useState<ViewData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAppStore();

  useEffect(() => {
    if (user) {
      loadDesignerData();
    }
  }, [user]);

  const loadDesignerData = async () => {
    try {
      setLoading(true);
      
      // Use authenticated user from store instead of localStorage
      if (!user) {
        toast.error("Please log in to view your dashboard");
        return;
      }

      // Load real data from API
      const [analyticsResponse, requestsResponse, portfolioResponse] = await Promise.all([
        apiClient.getDesignerAnalytics('7m'),
        apiClient.getCustomRequests(1, 5, 'Pending'),
        apiClient.getPortfolioItems(user.id, 1, 6)
      ]);

      const analytics = (analyticsResponse as any).overview;
      const requests = (requestsResponse as any).requests || [];
      const portfolioItems = (portfolioResponse as any).items || [];

      // Transform analytics data to match our interface
      const stats: DesignerStats = {
        totalViews: analytics.totalViews || 0,
        totalSaves: analytics.totalSaves || 0,
        followerCount: analytics.followerCount || 0,
        netEarnings: analytics.totalEarnings || 0,
        portfolioCount: analytics.totalPortfolioItems || portfolioItems.length || 0,
        averageRating: analytics.averageRating || 0,
        reviewCount: analytics.reviewCount || 0,
        completedProjects: analytics.completedProjects || 0
      };

      // Transform monthly data for chart
      const monthlyData = (analyticsResponse as any).monthlyData || [];
      const viewsData: ViewData[] = monthlyData.map((item: any) => ({
        month: new Date(item.month).toLocaleDateString('en', { month: 'short' }),
        views: item.views || 0,
        saves: item.saves || 0
      }));

      // Transform requests data
      const transformedRequests: PendingRequest[] = requests.slice(0, 3).map((req: any) => ({
        _id: req._id,
        client: {
          firstName: req.homeownerId?.profile?.firstName || 'Client',
          lastName: req.homeownerId?.profile?.lastName || '',
          email: req.homeownerId?.email || ''
        },
        roomType: req.roomType || 'Unknown',
        budget: req.budget || 0,
        urgency: req.urgency || 'Normal',
        createdAt: req.createdAt,
        description: req.description
      }));

      setStats(stats);
      setViewsData(viewsData);
      setPendingRequests(transformedRequests);
      setPortfolioItems(portfolioItems);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
      toast.error(error.error || error.message || "Failed to load designer data");
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    try {
      // API call to accept request
      await apiClient.updateCustomRequestStatus(requestId, 'In-Progress');
      toast.success("Request accepted!");
      setPendingRequests(prev => prev.filter(req => req._id !== requestId));
    } catch (error: any) {
      toast.error(error.error || error.message || "Failed to accept request");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center py-16 text-text-muted">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-semibold text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const STAT_CARDS = [
    { label: "Total Views",      value: (stats.totalViews / 1000).toFixed(1) + "K", icon: Eye,        color: "text-blue-400",    bg: "bg-blue-500/10",    trend: "+18%" },
    { label: "Total Saves",      value: (stats.totalSaves / 1000).toFixed(1) + "K", icon: Heart,      color: "text-pink-400",    bg: "bg-pink-500/10",    trend: "+24%" },
    { label: "Followers",        value: stats.followerCount.toLocaleString(), icon: Users,      color: "text-violet-400",  bg: "bg-violet-500/10",  trend: "+12%" },
    { label: "Net Earnings",     value: "$" + stats.netEarnings.toLocaleString(), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "+31%" },
  ];

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

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="p-5">
            <div className={`${bg} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white font-display">{value}</div>
            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />{trend}
            </div>
            <div className="text-xs text-text-muted">{label}</div>
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
            <AreaChart data={viewsData}>
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
              <Badge variant="red">{pendingRequests.length}</Badge>
            </div>
            <Link href="/designer/requests"><Button variant="ghost" size="sm">View all <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>
          <div className="divide-y divide-surface-border">
            {pendingRequests.map((r: PendingRequest) => (
              <div key={r._id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-text-muted">{r._id}</span>
                    <Badge variant={r.urgency === "High" ? "red" : "gray"}>{r.urgency}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">{r.client.firstName} {r.client.lastName}</p>
                  <p className="text-xs text-text-muted">{r.roomType} · ${r.budget}</p>
                </div>
                <Button size="sm" onClick={() => acceptRequest(r._id)}>Accept</Button>
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
            {portfolioItems.length > 0 ? (
              portfolioItems.slice(0, 6).map((item, i) => (
                <div key={item._id} className="relative group">
                  <img 
                    src={item.imageUrl} 
                    alt={item.metadata?.title || 'Portfolio item'} 
                    className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                  />
                  {item.metadata?.featured && (
                    <div className="absolute top-1 right-1">
                      <div className="bg-gold-400/20 backdrop-blur-sm rounded p-1">
                        <Star className="w-3 h-3 text-gold-400 fill-current" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Fallback to placeholder images when no portfolio items
              [
                "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&h=200&fit=crop",
                "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop",
              ].map((src, i) => (
                <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer" />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
