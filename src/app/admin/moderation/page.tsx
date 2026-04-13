"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import { Shield, CheckCircle, X, Edit, AlertTriangle, Flag, Eye, Search } from "lucide-react";
import { cn, STYLE_TAGS } from "@/lib/utils";

type ReviewStatus = "Pending" | "Approved" | "Rejected" | "Edit Requested";

const QUEUE: {
  id: string; designer: string; avatar: string; img: string;
  title: string; style: string; room: string; submitted: string; status: ReviewStatus;
}[] = [
  { id: "MOD-001", designer: "James Park",     avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop", img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&h=280&fit=crop", title: "Nordic Warmth",    style: "Scandinavian",  room: "Bedroom",      submitted: "2026-04-07", status: "Pending" },
  { id: "MOD-002", designer: "Lena Rodriguez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&h=280&fit=crop", title: "Earthy Warmth",   style: "Bohemian",      room: "Office",       submitted: "2026-04-06", status: "Pending" },
  { id: "MOD-003", designer: "Mike Thompson",  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop", img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=280&fit=crop", title: "Steel & Stone",   style: "Industrial",    room: "Kitchen",      submitted: "2026-04-05", status: "Pending" },
  { id: "MOD-004", designer: "Ana Kowalski",   avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop", img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=280&fit=crop", title: "Golden Hours",    style: "Art Deco",      room: "Dining Room",  submitted: "2026-04-04", status: "Approved" },
  { id: "MOD-005", designer: "David Chen",     avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=280&fit=crop", title: "Zen Minimalism",  style: "Minimalist",    room: "Living Room",  submitted: "2026-04-03", status: "Edit Requested" },
];

const REPORTS = [
  { id: "RPT-01", type: "Inappropriate Content", reporter: "user_8821", target: "Design MOD-007", time: "1h ago" },
  { id: "RPT-02", type: "Spam",                  reporter: "user_2241", target: "Designer Ana K.", time: "3h ago" },
  { id: "RPT-03", type: "Misleading Info",        reporter: "user_5512", target: "Design MOD-012", time: "6h ago" },
];

export default function ModerationPage() {
  const [items, setItems] = useState(QUEUE);
  const [filter, setFilter] = useState<ReviewStatus | "All">("All");
  const [editNote, setEditNote] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const update = (id: string, status: ReviewStatus) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));

  const filtered = items.filter((i) => {
    if (filter !== "All" && i.status !== filter) return false;
    if (search && !i.designer.toLowerCase().includes(search.toLowerCase()) && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-400" /> Moderation Hub
          </h1>
          <p className="text-text-muted text-sm">Review designer uploads before they go live</p>
        </div>
        <div className="flex gap-2 text-xs text-text-muted">
          <Badge variant="gold">Pending: {items.filter((i) => i.status === "Pending").length}</Badge>
          <Badge variant="green">Approved: {items.filter((i) => i.status === "Approved").length}</Badge>
          <Badge variant="red">Edit Requested: {items.filter((i) => i.status === "Edit Requested").length}</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by designer or title…"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-card border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
        </div>
        <div className="flex gap-2">
          {(["All","Pending","Approved","Edit Requested","Rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                filter === s ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Approval queue */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="grid md:grid-cols-[280px_1fr] gap-0">
              <div className="relative">
                <img src={item.img} alt={item.title} className="w-full h-48 md:h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Badge
                  variant={item.status === "Approved" ? "green" : item.status === "Pending" ? "gold" : item.status === "Edit Requested" ? "orange" : "red"}
                  className="absolute top-3 left-3"
                >
                  {item.status}
                </Badge>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar src={item.avatar} name={item.designer} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.designer}</p>
                      <p className="text-xs text-text-muted font-mono">{item.id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">{item.submitted}</p>
                </div>

                <div>
                  <p className="font-semibold text-white mb-1">{item.title}</p>
                  <div className="flex gap-2">
                    <Badge variant="brand">{item.style}</Badge>
                    <Badge variant="gray">{item.room}</Badge>
                  </div>
                </div>

                {/* Edit note input */}
                {item.status === "Pending" && (
                  <textarea
                    value={editNote[item.id] ?? ""}
                    onChange={(e) => setEditNote({ ...editNote, [item.id]: e.target.value })}
                    placeholder="Optional: Add an edit request note for the designer…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none"
                  />
                )}

                <div className="flex gap-2 flex-wrap mt-auto">
                  <Button size="sm"><Eye className="w-3.5 h-3.5" /> Full Preview</Button>
                  {item.status === "Pending" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => update(item.id, "Approved")}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gold-400 border-gold-500/30 hover:bg-gold-500/10" onClick={() => update(item.id, "Edit Requested")}>
                        <Edit className="w-3.5 h-3.5" /> Request Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => update(item.id, "Rejected")}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Report center */}
      <div>
        <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-400" /> Report Center
          <Badge variant="red">{REPORTS.length}</Badge>
        </h2>
        <Card>
          <table className="data-table">
            <thead><tr><th>Report ID</th><th>Type</th><th>Reporter</th><th>Target</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {REPORTS.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.id}</td>
                  <td><Badge variant="red"><AlertTriangle className="w-3 h-3" />{r.type}</Badge></td>
                  <td className="text-xs text-text-muted">{r.reporter}</td>
                  <td className="text-xs text-purple-100">{r.target}</td>
                  <td className="text-xs text-text-muted">{r.time}</td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost"><Eye className="w-3 h-3" /></Button>
                      <Button size="sm" variant="destructive"><X className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
