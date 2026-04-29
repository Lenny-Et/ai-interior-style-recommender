"use client";
import { Sparkles, ArrowRight, Heart, Clock, Users, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card, { CardBody } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { useAppStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

const RECENT_DESIGNS = [
  { id: 1, title: "Modern Living Room",   style: "Minimalist",   img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=280&fit=crop", saved: true,  likes: 142 },
  { id: 2, title: "Cozy Bedroom Retreat", style: "Scandinavian", img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&h=280&fit=crop", saved: false, likes: 98  },
  { id: 3, title: "Industrial Kitchen",   style: "Industrial",   img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=280&fit=crop", saved: true,  likes: 77  },
];

const TOP_DESIGNERS = [
  { name: "Sara Mitchell",  specialty: "Minimalist",   rating: 4.9, jobs: 87,  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=80&h=80&fit=crop", verified: true  },
  { name: "James Park",     specialty: "Scandinavian", rating: 4.8, jobs: 124, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop", verified: true  },
  { name: "Lena Rodriguez", specialty: "Art Deco",     rating: 4.7, jobs: 56,  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", verified: false },
];

const STAT_CARDS = [
  { label: "Style Boards",   value: "12",    icon: Heart,       color: "text-pink-400",     bg: "bg-pink-500/10" },
  { label: "AI Generations", value: "34",    icon: Sparkles,    color: "text-brand-400",    bg: "bg-brand-500/10" },
  { label: "Followed Designers", value: "8", icon: Users,       color: "text-blue-400",     bg: "bg-blue-500/10" },
  { label: "Avg. Room Score",value: "9.1",   icon: TrendingUp,  color: "text-emerald-400",  bg: "bg-emerald-500/10" },
];

export default function HomeownerDashboard() {
  const { user, isAuthenticated } = useAppStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Greeting header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-text-muted text-sm">{greeting} 👋</p>
          <h1 className="font-display text-3xl font-bold text-white mt-0.5">{user?.name?.split(" ")[0]}&apos;s Space</h1>
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
              <div className="text-2xl font-bold text-white font-display">{value}</div>
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
          <p className="text-text-muted text-sm leading-relaxed max-w-md">Upload a photo and get 4 cohesive furniture sets in under 30 seconds. Then use the AI Studio to iterate.</p>
        </div>
        <div className="relative flex gap-3 shrink-0 flex-wrap">
          <Link href="/dashboard/ai">
            <Button>Start AI Analysis <ArrowRight className="w-4 h-4" /></Button>
          </Link>
          <Link href="/dashboard/ai-studio">
            <Button variant="ghost">Open AI Studio</Button>
          </Link>
        </div>
      </div>

      {/* Recent Designs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Recent AI Designs</h2>
          <Link href="/dashboard/boards" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {RECENT_DESIGNS.map((d) => (
            <Card key={d.id} className="group overflow-hidden">
              <div className="relative">
                <Image src={d.img} alt={d.title} width={400} height={280} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${d.saved ? "bg-pink-500/80 border border-pink-400" : "bg-black/50 border border-white/20 hover:bg-pink-500/60"}`}>
                  <Heart className={`w-3.5 h-3.5 ${d.saved ? "fill-white text-white" : "text-white"}`} />
                </button>
                <div className="absolute bottom-3 left-3">
                  <Badge variant="brand">{d.style}</Badge>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-white">{d.title}</p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> 2 days ago</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Heart className="w-3 h-3" /> {d.likes}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Top Designers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Top Designers for You</h2>
          <Link href="/dashboard/designers" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            Browse all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {TOP_DESIGNERS.map((d) => (
            <Card key={d.name} className="p-5">
              <CardBody className="!px-0 !py-0">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar src={d.avatar} name={d.name} size="md" verified={d.verified} />
                  <div>
                    <p className="font-semibold text-sm text-white flex items-center gap-1">{d.name}</p>
                    <p className="text-xs text-text-muted">{d.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted mb-4">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold-400 fill-gold-400" />{d.rating}</span>
                  <span>{d.jobs} projects</span>
                </div>
                <Link href={`/dashboard/designers/${d.name}`}>
                  <Button variant="ghost" size="sm" fullWidth>View Profile</Button>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
