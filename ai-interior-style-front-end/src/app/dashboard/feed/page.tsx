"use client";
import { useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Search, SlidersHorizontal, Heart, MessageCircle, X, Filter } from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, cn } from "@/lib/utils";

const FEED_ITEMS = [
  { id: 1, img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&h=380&fit=crop", style: "Minimalist", room: "Living Room", likes: 412, comments: 38, designer: "Sara M.",  liked: false },
  { id: 2, img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=500&h=500&fit=crop", style: "Scandinavian", room: "Bedroom",     likes: 285, comments: 22, designer: "James P.", liked: true  },
  { id: 3, img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=500&h=350&fit=crop", style: "Industrial",   room: "Kitchen",     likes: 193, comments: 17, designer: "Lena R.",  liked: false },
  { id: 4, img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=500&h=420&fit=crop", style: "Art Deco",     room: "Dining Room", likes: 567, comments: 54, designer: "Mike T.",  liked: false },
  { id: 5, img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=380&fit=crop", style: "Bohemian",    room: "Office",      likes: 148, comments: 11, designer: "Ana K.",   liked: true  },
  { id: 6, img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&h=460&fit=crop", style: "Bohemian",    room: "Bedroom",     likes: 320, comments: 29, designer: "Sara M.",  liked: false },
  { id: 7, img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=500&h=340&fit=crop", style: "Modern",      room: "Bathroom",    likes: 221, comments: 18, designer: "James P.", liked: false },
  { id: 8, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=400&fit=crop", style: "Coastal",     room: "Living Room", likes: 389, comments: 41, designer: "Lena R.",  liked: true  },
];

export default function FeedPage() {
  const [search, setSearch]       = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [roomFilter, setRoomFilter]   = useState("");
  const [liked, setLiked]         = useState<Record<number, boolean>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const toggleLike = (id: number) =>
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = FEED_ITEMS.filter((f) => {
    if (styleFilter && f.style !== styleFilter) return false;
    if (roomFilter  && f.room  !== roomFilter)  return false;
    if (search && !f.style.toLowerCase().includes(search.toLowerCase()) && !f.room.toLowerCase().includes(search.toLowerCase()) && !f.designer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Discover Feed</h1>
          <p className="text-text-muted text-sm">Personalized designs based on your style preferences</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
          <SlidersHorizontal className="w-4 h-4" /> Filters
          {(styleFilter || roomFilter) && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search styles, rooms, or designers…"
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="glass rounded-2xl border border-surface-border p-5 animate-slide-up">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Style</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setStyleFilter("")} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", !styleFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>All</button>
                {STYLE_TAGS.slice(0,8).map((s) => (
                  <button key={s} onClick={() => setStyleFilter(styleFilter === s ? "" : s)} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", styleFilter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Room Type</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setRoomFilter("")} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", !roomFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>All</button>
                {ROOM_TYPES.slice(0,6).map((r) => (
                  <button key={r} onClick={() => setRoomFilter(roomFilter === r ? "" : r)} className={cn("px-3 py-1.5 rounded-lg text-xs border transition-all", roomFilter === r ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>{r}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {filtered.map((item) => {
          const isLiked = liked[item.id] ?? item.liked;
          return (
            <div key={item.id} className="break-inside-avoid group relative rounded-2xl overflow-hidden border border-surface-border bg-surface-card hover:border-brand-500/40 hover:shadow-glow-sm transition-all duration-300">
              <Image src={item.img} alt={item.style} width={500} height={400} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{item.designer}</p>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant="brand">{item.style}</Badge>
                      <Badge variant="gray">{item.room}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleLike(item.id)} className={cn("flex items-center gap-1 text-xs transition-colors", isLiked ? "text-pink-400" : "text-white/70 hover:text-pink-400")}>
                      <Heart className={cn("w-4 h-4", isLiked && "fill-pink-400")} />{item.likes + (isLiked && !item.liked ? 1 : !isLiked && item.liked ? -1 : 0)}
                    </button>
                    <button className="flex items-center gap-1 text-xs text-white/70 hover:text-blue-400 transition-colors">
                      <MessageCircle className="w-4 h-4" />{item.comments}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-white">No results found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}

      <div className="text-center">
        <Button variant="ghost" size="lg">Load more designs</Button>
      </div>
    </div>
  );
}
