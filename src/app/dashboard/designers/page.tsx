"use client";
import { useState } from "react";
import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Card, { CardBody } from "@/components/ui/Card";
import {
  Search, Star, MapPin, Filter, CheckCircle,
  Heart, MessageCircle, ExternalLink, Sliders,
} from "lucide-react";
import { STYLE_TAGS, cn } from "@/lib/utils";

const DESIGNERS = [
  { id: 1, name: "Sara Mitchell",   specialty: ["Minimalist","Coastal"],    rating: 4.9, reviews: 142, jobs: 87,  location: "New York, NY", price: "$120/hr", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=120&h=120&fit=crop", verified: true,  bio: "Award-winning minimalist designer with 10+ years transforming NYC apartments into serene sanctuaries.", portfolio: ["https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=200&fit=crop"] },
  { id: 2, name: "James Park",      specialty: ["Scandinavian","Japandi"], rating: 4.8, reviews: 98,  jobs: 124, location: "Seattle, WA",  price: "$95/hr",  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop", verified: true,  bio: "Specializing in clean Nordic aesthetics and the growing Japandi style movement.", portfolio: ["https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=200&fit=crop"] },
  { id: 3, name: "Lena Rodriguez",  specialty: ["Art Deco","Glam"],        rating: 4.7, reviews: 76,  jobs: 56,  location: "Miami, FL",   price: "$110/hr", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop", verified: false, bio: "Bold, glamorous spaces with a Latin flair. Specializing in luxury residential projects.", portfolio: ["https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=300&h=200&fit=crop"] },
  { id: 4, name: "Mike Thompson",   specialty: ["Industrial","Modern"],    rating: 4.6, reviews: 54,  jobs: 43,  location: "Chicago, IL", price: "$80/hr",  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop", verified: true,  bio: "Raw, bold industrial aesthetics transformed into liveable luxury for urban homes.", portfolio: ["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=300&h=200&fit=crop"] },
  { id: 5, name: "Ana Kowalski",    specialty: ["Bohemian","Eclectic"],    rating: 4.5, reviews: 41,  jobs: 38,  location: "Austin, TX",  price: "$75/hr",  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop", verified: false, bio: "Free-spirited, globally inspired interiors that tell your unique story.", portfolio: ["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=200&fit=crop"] },
  { id: 6, name: "David Chen",      specialty: ["Modern","Contemporary"],  rating: 4.9, reviews: 187, jobs: 201, location: "San Francisco, CA", price: "$150/hr", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop", verified: true,  bio: "Silicon Valley's go-to designer for tech executives who want cutting-edge modern spaces.", portfolio: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=200&fit=crop"] },
];

export default function DesignerSearchPage() {
  const [search, setSearch]         = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [view, setView]             = useState<"grid"|"list">("grid");
  const [selected, setSelected]     = useState<number | null>(null);

  const filtered = DESIGNERS.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.specialty.some((s) => s.toLowerCase().includes(search.toLowerCase()))) return false;
    if (styleFilter && !d.specialty.includes(styleFilter)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Designer Directory</h1>
        <p className="text-text-muted text-sm">Browse verified professional interior designers</p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or specialty…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("grid")} className={cn("p-3 rounded-xl border transition-all", view === "grid" ? "border-brand-500 bg-brand-600/15 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40")}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7"/><rect x="9" y="0" width="7" height="7"/><rect x="0" y="9" width="7" height="7"/><rect x="9" y="9" width="7" height="7"/></svg>
          </button>
          <button onClick={() => setView("list")} className={cn("p-3 rounded-xl border transition-all", view === "list" ? "border-brand-500 bg-brand-600/15 text-brand-400" : "border-surface-border text-text-muted hover:border-brand-500/40")}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2"/><rect x="0" y="7" width="16" height="2"/><rect x="0" y="13" width="16" height="2"/></svg>
          </button>
        </div>
      </div>

      {/* Style chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStyleFilter("")} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all", !styleFilter ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>All Styles</button>
        {STYLE_TAGS.slice(0,10).map((s) => (
          <button key={s} onClick={() => setStyleFilter(styleFilter === s ? "" : s)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-all", styleFilter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40")}>{s}</button>
        ))}
      </div>

      <p className="text-xs text-text-muted">{filtered.length} designers found</p>

      {/* Grid/List */}
      {view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <Card key={d.id} className="overflow-hidden group">
              {/* Portfolio preview strip */}
              <div className="grid grid-cols-3 h-24 overflow-hidden">
                {d.portfolio.slice(0,3).map((src, i) => (
                  <Image key={i} src={src} alt="" width={200} height={150} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ))}
              </div>
              <CardBody>
                <div className="flex items-start gap-3 mb-3">
                  <Avatar src={d.avatar} name={d.name} size="md" verified={d.verified} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-white truncate">{d.name}</p>
                      {d.verified && <CheckCircle className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{d.location}</p>
                  </div>
                  <span className="text-xs font-semibold text-gold-400 shrink-0">{d.price}</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {d.specialty.map((s) => <Badge key={s} variant="brand">{s}</Badge>)}
                </div>
                <p className="text-xs text-text-muted leading-relaxed mb-3 line-clamp-2">{d.bio}</p>
                <div className="flex items-center justify-between text-xs text-text-muted mb-3">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold-400 fill-gold-400" />{d.rating} ({d.reviews})</span>
                  <span>{d.jobs} projects</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1"><Heart className="w-3.5 h-3.5" />Follow</Button>
                  <Button size="sm" className="flex-1" onClick={() => setSelected(d.id)}>Hire</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="flex items-center gap-4 p-4">
              <Avatar src={d.avatar} name={d.name} size="lg" verified={d.verified} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white">{d.name}</p>
                  <Badge variant={d.verified ? "green" : "gray"}>{d.verified ? "Verified" : "Unverified"}</Badge>
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" />{d.location} · {d.price}</p>
                <div className="flex flex-wrap gap-1">
                  {d.specialty.map((s) => <Badge key={s} variant="brand">{s}</Badge>)}
                </div>
              </div>
              <div className="text-center shrink-0">
                <div className="flex items-center gap-1 text-sm text-white mb-1">
                  <Star className="w-4 h-4 text-gold-400 fill-gold-400" />{d.rating}
                </div>
                <p className="text-xs text-text-muted">{d.reviews} reviews</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm"><ExternalLink className="w-3.5 h-3.5" />Profile</Button>
                <Button size="sm" onClick={() => setSelected(d.id)}>Hire</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Hire modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-brand-500/30 p-8 max-w-md w-full animate-slide-up">
            {(() => {
              const d = DESIGNERS.find((x) => x.id === selected)!;
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar src={d.avatar} name={d.name} size="lg" verified={d.verified} />
                    <div>
                      <h2 className="font-semibold text-white">{d.name}</h2>
                      <p className="text-xs text-text-muted">{d.price}</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-muted mb-5">Send a custom design request to {d.name.split(" ")[0]}. You can upload room photos and describe your vision.</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => setSelected(null)}>Cancel</Button>
                    <Button className="flex-1" onClick={() => setSelected(null)}><MessageCircle className="w-4 h-4" />Send Request</Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
