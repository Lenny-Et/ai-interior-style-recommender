"use client";
import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Heart, Clock, Users, TrendingUp, Star, Ticket } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardBody } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export default function HomeownerDashboard() {
  const { user, isAuthenticated } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [topDesigners, setTopDesigners] = useState<any[]>([]);
  const [recentDesigns, setRecentDesigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    boards: 0,
    generations: 0,
    savedDesigns: 0,
    requests: 0
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (user && isAuthenticated) {
      loadDashboardData();
    }
  }, [user, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const userId = user?.id || localStorage.getItem('userId') || '';
      
      const [designersRes, aiRes, boardsRes, requestsRes] = await Promise.all([
        apiClient.getDesigners({ limit: 3, sort: 'rating' }),
        apiClient.getSavedAIRecommendations(userId, 1, 3),
        apiClient.getBoards(1, 1),
        apiClient.getCustomRequests(1, 1)
      ]);

      const designersData = (designersRes as any).users || (designersRes as any).data || [];
      const aiData = (aiRes as any).data?.recommendations || (aiRes as any).recommendations || (aiRes as any).data || [];
      const boardsTotal = (boardsRes as any).pagination?.total || 0;
      const requestsTotal = (requestsRes as any).pagination?.total || 0;

      setTopDesigners(designersData.slice(0, 3));
      setRecentDesigns(aiData.slice(0, 3));
      
      setStats({
        boards: boardsTotal,
        generations: aiData.length || 0,
        savedDesigns: aiData.reduce((acc: number, session: any) => acc + (session.recommendations?.length || 0), 0),
        requests: requestsTotal
      });
      
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please log in to access your dashboard</h1>
          <Link href="/auth/login">
            <Button size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const STAT_CARDS = [
    { label: "Style Boards",   value: stats.boards.toString(),       icon: Heart,       color: "text-pink-400",     bg: "bg-pink-500/10" },
    { label: "AI Generations", value: stats.generations.toString(),  icon: Sparkles,    color: "text-brand-400",    bg: "bg-brand-500/10" },
    { label: "Saved Designs",  value: stats.savedDesigns.toString(), icon: Users,       color: "text-blue-400",     bg: "bg-blue-500/10" },
    { label: "Custom Requests",value: stats.requests.toString(),     icon: Ticket,      color: "text-emerald-400",  bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-text-muted text-sm">{greeting} 👋</p>
          <h1 className="font-display text-3xl font-bold text-white mt-0.5">{user?.profile?.firstName || user?.name?.split(" ")[0] || 'User'}&apos;s Space</h1>
          <p className="text-text-muted text-sm mt-1">{formatDate(new Date())}</p>
        </div>
        <Link href="/dashboard/ai">
          <Button size="lg" className="shadow-glow">
            <Sparkles className="w-4 h-4" /> Get AI Recommendations
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <CardBody className="!px-0 !py-0">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-white font-display">
                {loading ? <span className="animate-pulse bg-surface-border h-6 w-8 rounded inline-block"></span> : value}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{label}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Hero CTA */}
      <div className="relative rounded-2xl overflow-hidden border border-brand-500/20 bg-gradient-to-br from-brand-950/60 to-surface-card p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="orb orb-brand w-64 h-64 -top-16 -left-16 opacity-40 absolute pointer-events-none" />
        <div className="relative flex-1">
          <Badge variant="brand" className="mb-3"><Sparkles className="w-3 h-3" /> AI-Powered</Badge>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Ready to redesign a room?</h2>
          <p className="text-text-muted text-sm leading-relaxed max-w-md">Upload a photo and get 4 cohesive furniture sets in under 30 seconds.</p>
        </div>
        <div className="relative flex gap-3 shrink-0 flex-wrap">
          <Link href="/dashboard/ai">
            <Button>Start AI Analysis <ArrowRight className="w-4 h-4" /></Button>
          </Link>
        </div>
      </div>

      {/* Recent Designs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent AI Designs</h2>
          <Link href="/dashboard/my-designs" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-12 border border-dashed border-surface-border rounded-2xl">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-text-muted text-sm">Loading recent designs...</p>
          </div>
        ) : recentDesigns.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-surface-border rounded-2xl bg-surface-hover/30">
            <Sparkles className="w-8 h-8 text-brand-500/50 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No AI designs yet</p>
            <p className="text-text-muted text-sm mb-4">Upload a photo to get personalized furniture recommendations.</p>
            <Link href="/dashboard/ai">
              <Button size="sm">Start your first generation</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDesigns.map((session) => {
              const mainRec = session.recommendations?.[0] || {};
              const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Recently';
              
              return (
                <Card key={session._id || session.sessionId} className="group overflow-hidden">
                  <div className="relative">
                    <img src={session.imageUrl || mainRec.imageUrl} alt={mainRec.name || 'AI Design'} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all bg-pink-500/80 border border-pink-400">
                      <Heart className="w-3.5 h-3.5 fill-white text-white" />
                    </button>
                    <div className="absolute bottom-3 left-3 flex gap-1">
                      <Badge variant="brand">{session.metadata?.style || mainRec.style || 'AI Generated'}</Badge>
                      <Badge variant="gray">{session.metadata?.roomType || 'Room'}</Badge>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-white line-clamp-1">{mainRec.name || `Generation for ${session.metadata?.roomType}`}</p>
                      <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {dateStr}</p>
                    </div>
                    <Link href={`/dashboard/ai?session=${session.sessionId}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Designers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Top Designers for You</h2>
          <Link href="/dashboard/designers" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            Browse all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-surface-border"></div>
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-surface-border rounded"></div>
                    <div className="w-16 h-3 bg-surface-border rounded"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : topDesigners.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-surface-border rounded-2xl">
            <p className="text-text-muted text-sm">No designers found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {topDesigners.map((d) => (
              <Card key={d._id} className="p-5">
                <CardBody className="!px-0 !py-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={d.profile?.avatarUrl} name={`${d.profile?.firstName} ${d.profile?.lastName}`} size="md" verified={d.is_verified} />
                    <div>
                      <p className="font-semibold text-sm text-white flex items-center gap-1">
                        {d.profile?.firstName} {d.profile?.lastName}
                      </p>
                      <p className="text-xs text-text-muted">{d.profile?.company || 'Independent Designer'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                      {d.stats?.averageRating ? d.stats.averageRating.toFixed(1) : 'New'}
                    </span>
                    <span>{d.stats?.completedProjects || 0} projects</span>
                  </div>
                  <Link href={`/dashboard/designers/${d._id}`}>
                    <Button variant="ghost" size="sm" fullWidth>View Profile</Button>
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
