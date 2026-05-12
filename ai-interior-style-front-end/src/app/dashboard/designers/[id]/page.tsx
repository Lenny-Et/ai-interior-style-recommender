"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card, { CardBody } from "@/components/ui/Card";
import {
  ArrowLeft, Star, Users, Briefcase, CheckCircle,
  Heart, MessageCircle, Loader2, ImageOff,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface PortfolioItem {
  _id: string;
  imageUrl: string;
  description?: string;
  metadata?: { style?: string; roomType?: string };
}

interface Designer {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    company?: string;
    avatarUrl?: string;
    profilePicture?: string;
    bio?: string;
  };
  is_verified: boolean;
  projectCount?: number;
  followerCount?: number;
  averageRating?: number | null;
  portfolio?: PortfolioItem[];
}

export default function DesignerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [designer, setDesigner] = useState<Designer | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [lightbox, setLightbox] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await (apiClient as any).getDesigner(id);
        setDesigner((res as any).designer || null);
      } catch (err: any) {
        setError(err?.error || "Designer not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      if (following) {
        await apiClient.unfollowDesigner(id);
        setFollowing(false);
        toast.success("Unfollowed");
      } else {
        await apiClient.followDesigner(id);
        setFollowing(true);
        toast.success("Following designer!");
      }
    } catch {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const getName = (d: Designer) =>
    `${d.profile.firstName ?? ""} ${d.profile.lastName ?? ""}`.trim() ||
    d.profile.company || "Unknown Designer";

  const getAvatar = (d: Designer) =>
    d.profile?.avatarUrl || d.profile?.profilePicture || undefined;

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────
  if (error || !designer) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-sm mb-4">{error || "Designer not found"}</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Go back
        </Button>
      </div>
    );
  }

  const name        = getName(designer);
  const portfolio   = designer.portfolio || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to designers
      </button>

      {/* Header card */}
      <Card className="p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar src={getAvatar(designer)} name={name} size="xl" verified={designer.is_verified} />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-white">{name}</h1>
              {designer.is_verified && (
                <Badge variant="green"><CheckCircle className="w-3 h-3" />Verified</Badge>
              )}
            </div>
            {designer.profile.company && (
              <p className="text-text-muted text-sm mb-3">{designer.profile.company}</p>
            )}
            {designer.profile.bio && (
              <p className="text-text-secondary text-sm leading-relaxed mb-4 max-w-2xl">
                {designer.profile.bio}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap gap-5 text-sm mb-6">
              <span className="flex items-center gap-1.5 text-white">
                <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                <strong>{designer.averageRating != null ? designer.averageRating.toFixed(1) : "New"}</strong>
                <span className="text-text-muted">rating</span>
              </span>
              <span className="flex items-center gap-1.5 text-white">
                <Briefcase className="w-4 h-4 text-brand-400" />
                <strong>{designer.projectCount ?? 0}</strong>
                <span className="text-text-muted">projects</span>
              </span>
              <span className="flex items-center gap-1.5 text-white">
                <Users className="w-4 h-4 text-pink-400" />
                <strong>{designer.followerCount ?? 0}</strong>
                <span className="text-text-muted">followers</span>
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant={following ? "default" : "ghost"}
                onClick={handleFollow}
                disabled={followLoading}
              >
                <Heart className={cn("w-4 h-4", following && "fill-white")} />
                {following ? "Following" : "Follow"}
              </Button>
              <Button onClick={() => router.push(`/dashboard/requests/new?designerId=${designer._id}`)}>
                <MessageCircle className="w-4 h-4" /> Send Request
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Portfolio */}
      <div>
        <h2 className="font-semibold text-white text-lg mb-4">
          Portfolio
          {portfolio.length > 0 && (
            <span className="text-text-muted text-sm font-normal ml-2">
              ({portfolio.length} {portfolio.length === 1 ? "item" : "items"})
            </span>
          )}
        </h2>

        {portfolio.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-surface-border rounded-2xl">
            <ImageOff className="w-8 h-8 text-text-muted/40 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No portfolio items yet</p>
            <p className="text-text-muted text-sm">This designer hasn&apos;t uploaded any work yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {portfolio.map((item) => (
              <button
                key={item._id}
                className="group relative rounded-xl overflow-hidden aspect-square bg-surface-card border border-surface-border cursor-zoom-in"
                onClick={() => setLightbox(item)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.description || "Portfolio item"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="text-left">
                    {item.metadata?.style && (
                      <span className="text-xs text-white font-medium block">{item.metadata.style}</span>
                    )}
                    {item.metadata?.roomType && (
                      <span className="text-xs text-white/70">{item.metadata.roomType}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.imageUrl} alt="" className="w-full max-h-[80vh] object-contain" />
            {(lightbox.description || lightbox.metadata?.style) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4">
                {lightbox.description && (
                  <p className="text-white text-sm">{lightbox.description}</p>
                )}
                {lightbox.metadata && (
                  <div className="flex gap-2 mt-1">
                    {lightbox.metadata.style && <Badge variant="brand">{lightbox.metadata.style}</Badge>}
                    {lightbox.metadata.roomType && <Badge variant="gray">{lightbox.metadata.roomType}</Badge>}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
