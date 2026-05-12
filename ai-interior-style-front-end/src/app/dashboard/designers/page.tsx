"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Card, { CardBody } from "@/components/ui/Card";
import {
  Search, Star, CheckCircle,
  Heart, MessageCircle, ExternalLink,
  Loader2, Users,
} from "lucide-react";
import { STYLE_TAGS, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

// Shape returned directly by the backend aggregate
interface RawDesigner {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    company?: string;
    avatarUrl?: string;
    profilePicture?: string;
  };
  is_verified: boolean;
  projectCount?: number;
  followerCount?: number;
  averageRating?: number | null;
  portfolio?: Array<{ imageUrl?: string }>;
}

// Stable picsum fallbacks (deterministic seeds, never 404)
const FALLBACK_IMGS = [
  "https://picsum.photos/seed/interior-a/400/300",
  "https://picsum.photos/seed/interior-b/400/300",
  "https://picsum.photos/seed/interior-c/400/300",
];

/** Three-column image strip at the top of each card */
function PortfolioStrip({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="h-24 bg-surface-hover flex items-center justify-center">
        <p className="text-xs text-text-muted">No portfolio images yet</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 h-24 overflow-hidden">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="w-full h-full object-cover"
        />
      ))}
    </div>
  );
}

export default function DesignerSearchPage() {
  const [designers, setDesigners]     = useState<RawDesigner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [view, setView]               = useState<"grid" | "list">("grid");
  const [selected, setSelected]       = useState<RawDesigner | null>(null);
  const [following, setFollowing]     = useState<Set<string>>(new Set());
  const router = useRouter();

  // Wrapped in useCallback so the effect deps are stable
  const fetchDesigners = useCallback(async (q: string, specialty: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getDesigners({
        q: q || undefined,
        specialty: specialty || undefined,
        limit: 50,
      });
      setDesigners((res as any).designers || []);
    } catch (err: any) {
      console.error("Failed to fetch designers:", err);
      setError(err?.error || err?.message || "Failed to load designers");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — fires once, no delay
  useEffect(() => {
    fetchDesigners("", "");
  }, [fetchDesigners]);

  // Debounced re-fetch when the user types or picks a filter
  useEffect(() => {
    // Skip if nothing has changed from defaults (already covered by initial load)
    if (search === "" && styleFilter === "") return;
    const id = setTimeout(() => fetchDesigners(search, styleFilter), 300);
    return () => clearTimeout(id);
  }, [search, styleFilter, fetchDesigners]);

  const handleFollow = async (designerId: string) => {
    try {
      if (following.has(designerId)) {
        await apiClient.unfollowDesigner(designerId);
        setFollowing(prev => { const n = new Set(prev); n.delete(designerId); return n; });
        toast.success("Unfollowed designer");
      } else {
        await apiClient.followDesigner(designerId);
        setFollowing(prev => new Set(prev).add(designerId));
        toast.success("Following designer");
      }
    } catch {
      toast.error("Failed to update follow status");
    }
  };

  // Pure helpers — no side-effects, no randomness
  const getName = (d: RawDesigner) =>
    `${d.profile.firstName ?? ""} ${d.profile.lastName ?? ""}`.trim() ||
    d.profile.company ||
    "Unknown Designer";

  const getAvatar = (d: RawDesigner): string | undefined =>
    d.profile?.avatarUrl || d.profile?.profilePicture || undefined;

  const getPortfolio = (d: RawDesigner): string[] =>
    d.portfolio && d.portfolio.length > 0
      ? d.portfolio.slice(0, 3).map(p => p.imageUrl).filter(Boolean) as string[]
      : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Designer Directory</h1>
        <p className="text-text-muted text-sm">Browse verified professional interior designers</p>
      </div>

      {/* Search & view toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or company…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("grid")}
            className={cn("p-3 rounded-xl border transition-all", view === "grid" ? "border-brand-500 bg-brand-600/15 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40")}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="0" width="7" height="7"/><rect x="9" y="0" width="7" height="7"/>
              <rect x="0" y="9" width="7" height="7"/><rect x="9" y="9" width="7" height="7"/>
            </svg>
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("p-3 rounded-xl border transition-all", view === "list" ? "border-brand-500 bg-brand-600/15 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40")}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="0" y="1" width="16" height="2"/><rect x="0" y="7" width="16" height="2"/>
              <rect x="0" y="13" width="16" height="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Style filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStyleFilter("")}
          className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all", !styleFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}
        >
          All Styles
        </button>
        {STYLE_TAGS.slice(0, 10).map((s) => (
          <button
            key={s}
            onClick={() => setStyleFilter(styleFilter === s ? "" : s)}
            className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all", styleFilter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400 mr-2" />
          <span className="text-text-muted">Loading designers...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchDesigners(search, styleFilter)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && designers.length === 0 && (
        <div className="text-center py-16 border border-dashed border-surface-border rounded-2xl">
          <Users className="w-8 h-8 text-brand-500/40 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">No designers found</p>
          <p className="text-text-muted text-sm">Try adjusting your search or filter.</p>
        </div>
      )}

      {/* Results count */}
      {!loading && !error && designers.length > 0 && (
        <p className="text-xs text-text-muted">
          {designers.length} designer{designers.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Grid view ─────────────────────────────────────────── */}
      {!loading && !error && view === "grid" && designers.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {designers.map((d) => {
            const name = getName(d);
            const isFollowing = following.has(d._id);
            return (
              <Card key={d._id} className="overflow-hidden group">
                <PortfolioStrip images={getPortfolio(d)} />
                <CardBody>
                  {/* Designer info */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar src={getAvatar(d)} name={name} size="md" verified={d.is_verified} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sm text-white truncate">{name}</p>
                        {d.is_verified && <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {d.profile.company || "Independent Designer"}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-text-muted mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                      {d.averageRating != null ? d.averageRating.toFixed(1) : "New"}
                    </span>
                    <span>{d.projectCount ?? 0} projects</span>
                    <span>{d.followerCount ?? 0} followers</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant={isFollowing ? "default" : "ghost"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleFollow(d._id)}
                    >
                      <Heart className={cn("w-3.5 h-3.5", isFollowing && "fill-white")} />
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => setSelected(d)}>
                      Hire
                    </Button>
                  </div>
                  <Link href={`/dashboard/designers/${d._id}`} className="block">
                    <Button variant="ghost" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────── */}
      {!loading && !error && view === "list" && designers.length > 0 && (
        <div className="space-y-3">
          {designers.map((d) => {
            const name = getName(d);
            return (
              <Card key={d._id} className="flex items-center gap-4 p-4">
                <Avatar src={getAvatar(d)} name={name} size="lg" verified={d.is_verified} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">{name}</p>
                    <Badge variant={d.is_verified ? "green" : "gray"}>
                      {d.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mb-2">
                    {d.profile.company || "Independent Designer"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                      {d.averageRating != null ? d.averageRating.toFixed(1) : "New"}
                    </span>
                    <span>{d.projectCount ?? 0} projects</span>
                    <span>{d.followerCount ?? 0} followers</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/dashboard/designers/${d._id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-3.5 h-3.5" />Profile
                    </Button>
                  </Link>
                  <Button size="sm" onClick={() => setSelected(d)}>Hire</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Hire confirmation modal ────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl border border-brand-500/30 p-8 max-w-md w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={getAvatar(selected)} name={getName(selected)} size="lg" verified={selected.is_verified} />
              <div>
                <h2 className="font-semibold text-white">{getName(selected)}</h2>
                <p className="text-xs text-text-muted">{selected.profile.company || "Independent Designer"}</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-5">
              Send a custom design request to {selected.profile.firstName}. You can upload room photos
              and describe your vision on the next page.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const id = selected._id;
                  setSelected(null);
                  router.push(`/dashboard/requests/new?designerId=${id}`);
                }}
              >
                <MessageCircle className="w-4 h-4" />Send Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
