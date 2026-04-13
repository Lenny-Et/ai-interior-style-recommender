"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Plus, Clock, CheckCircle, AlertCircle, Loader2,
  Upload, Eye, MessageCircle, X, Image as ImageIcon,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

type Status = "Pending" | "In-Progress" | "Review" | "Completed" | "Cancelled";

const STATUS_CONFIG: Record<Status, { variant: "gold"|"blue"|"brand"|"green"|"red"; icon: typeof Clock }> = {
  "Pending":    { variant: "gold",  icon: Clock },
  "In-Progress":{ variant: "blue",  icon: Loader2 },
  "Review":     { variant: "brand", icon: Eye },
  "Completed":  { variant: "green", icon: CheckCircle },
  "Cancelled":  { variant: "red",   icon: X },
};

const TICKETS = [
  { id: "TK-001", designer: "Sara Mitchell",  designerAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=80&h=80&fit=crop", status: "In-Progress" as Status, room: "Living Room", budget: "$2,000", desc: "Modern minimalist redesign with neutral palette. I want more natural light feel.", created: "2026-03-20", updated: "2026-04-01", escrow: 2000, released: 0 },
  { id: "TK-002", designer: "James Park",     designerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop", status: "Review" as Status,      room: "Bedroom",     budget: "$1,500", desc: "Scandinavian bedroom with warm tones and functional storage solutions.", created: "2026-03-28", updated: "2026-04-07", escrow: 1500, released: 0 },
  { id: "TK-003", designer: "Lena Rodriguez", designerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", status: "Completed" as Status,   room: "Dining Room", budget: "$3,200", desc: "Art Deco dining room with gold accents and velvet seating.", created: "2026-02-10", updated: "2026-03-15", escrow: 3200, released: 3200 },
];

const ESCROW_STAGES = ["Funds Held","Design Started","Revision Round","Client Review","Released"];

export default function RequestsPage() {
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const ticket = TICKETS.find((t) => t.id === activeTicket);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Custom Requests</h1>
          <p className="text-text-muted text-sm">Track your designer collaboration tickets</p>
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /> New Request</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([["Active", "2", "blue"],["In Review", "1", "brand"],["Completed", "8", "green"],["Total Spent", "$12,400", "gold"]] as const).map(([l,v,c]) => (
          <Card key={l} className="p-5">
            <p className="text-2xl font-bold text-white font-display">{v}</p>
            <p className="text-xs text-text-muted mt-0.5">{l}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5">
        {/* Ticket list */}
        <div className="space-y-3">
          {TICKETS.map((t) => {
            const { variant, icon: Icon } = STATUS_CONFIG[t.status];
            return (
              <button
                key={t.id}
                onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                  activeTicket === t.id
                    ? "border-brand-500 bg-brand-600/10 shadow-glow-sm"
                    : "border-surface-border bg-surface-card hover:border-brand-500/40"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-text-muted">{t.id}</span>
                  <Badge variant={variant}><Icon className="w-3 h-3" />{t.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Avatar src={t.designerAvatar} name={t.designer} size="xs" />
                  <p className="text-sm font-semibold text-white">{t.designer}</p>
                </div>
                <p className="text-xs text-text-muted">{t.room} · {t.budget}</p>
                <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />Updated {formatDate(t.updated)}</p>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {ticket ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={ticket.designerAvatar} name={ticket.designer} size="md" />
                  <div>
                    <p className="font-semibold text-white">{ticket.designer}</p>
                    <p className="text-xs text-text-muted">{ticket.id} · {ticket.room}</p>
                  </div>
                </div>
                <Badge variant={STATUS_CONFIG[ticket.status].variant}>{ticket.status}</Badge>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Escrow bar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Escrow Status</p>
                  <span className="text-xs text-text-muted">${ticket.released.toLocaleString()} / ${ticket.escrow.toLocaleString()} released</span>
                </div>
                <div className="flex items-center gap-0">
                  {ESCROW_STAGES.map((stage, i) => {
                    const stageIdx = ticket.status === "Completed" ? 4 : ticket.status === "Review" ? 3 : ticket.status === "In-Progress" ? 2 : 1;
                    const done = i <= stageIdx;
                    return (
                      <div key={stage} className="flex-1 text-center">
                        <div className={cn("h-1.5 transition-all", i === 0 ? "rounded-l-full" : i === ESCROW_STAGES.length-1 ? "rounded-r-full" : "", done ? "bg-brand-500" : "bg-surface-border")} />
                        <p className={cn("text-[9px] mt-1 leading-tight", done ? "text-brand-400" : "text-text-muted")}>{stage}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">Project Description</p>
                <p className="text-sm text-purple-100 leading-relaxed">{ticket.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-surface border border-surface-border">
                  <p className="text-text-muted mb-0.5">Budget</p>
                  <p className="font-semibold text-white">{ticket.budget}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-surface-border">
                  <p className="text-text-muted mb-0.5">Started</p>
                  <p className="font-semibold text-white">{formatDate(ticket.created)}</p>
                </div>
              </div>

              {/* Uploaded photos */}
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-semibold">Uploaded Room Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&h=150&fit=crop"].map((src, i) => (
                    <img key={i} src={src} alt="" className="w-full h-20 object-cover rounded-xl border border-surface-border" />
                  ))}
                  <button className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-surface-border text-text-muted hover:border-brand-500/60 hover:text-brand-400 transition-all">
                    <Upload className="w-5 h-5 mb-0.5" /><span className="text-[10px]">Add</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {ticket.status === "Review" && (
                  <>
                    <Button variant="ghost" className="flex-1">Request Revision</Button>
                    <Button variant="gold" className="flex-1"><CheckCircle className="w-4 h-4" />Approve & Release</Button>
                  </>
                )}
                {ticket.status === "In-Progress" && (
                  <Button variant="ghost" fullWidth><MessageCircle className="w-4 h-4" />Message {ticket.designer.split(" ")[0]}</Button>
                )}
                {ticket.status === "Completed" && (
                  <Button variant="ghost" fullWidth><Eye className="w-4 h-4" />View Final Design</Button>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-surface-border text-text-muted">
            <p className="text-sm">Select a ticket to view details</p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl border border-surface-border p-8 max-w-lg w-full animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-white">New Custom Request</h2>
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Room Type</label>
                <select className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 focus:outline-none focus:border-brand-500">
                  {["Living Room","Bedroom","Kitchen","Dining Room","Bathroom"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Budget</label>
                <input type="text" placeholder="e.g. $2,000" className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Project Description</label>
                <textarea rows={4} placeholder="Describe your vision, style preferences, must-haves…"
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Room Photos</label>
                <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-brand-500/60 transition-colors cursor-pointer">
                  <ImageIcon className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">Upload room photos</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => setShowNew(false)}>Submit Request</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
