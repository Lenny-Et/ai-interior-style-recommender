"use client";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import {
  Ticket, Clock, CheckCircle, Upload, Eye,
  MessageCircle, X, AlertCircle, Send,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

type Status = "New" | "Accepted" | "In-Progress" | "Delivered" | "Completed";

const REQUESTS = [
  { id: "TK-101", client: "Alex Johnson",  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop", room: "Living Room",  budget: "$2,000", status: "In-Progress" as Status, created: "2026-03-20", desc: "Modern minimalist redesign with neutral palette. More natural light is important to me.", photos: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop"] },
  { id: "TK-102", client: "Maria Santos",  avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=80&h=80&fit=crop", room: "Bedroom",      budget: "$1,200", status: "New" as Status,         created: "2026-04-07", desc: "Scandinavian bedroom with warm tones and smart storage. Prefer oak wood finishes.", photos: [] },
  { id: "TK-103", client: "Chris Nguyen",  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop", room: "Home Office",   budget: "$800",   status: "Delivered" as Status,   created: "2026-03-28", desc: "Productive home office with industrial vibes. Need good cable management.", photos: ["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=300&h=200&fit=crop"] },
  { id: "TK-104", client: "Emma Walsh",    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop", room: "Dining Room",  budget: "$3,500", status: "Completed" as Status,    created: "2026-02-12", desc: "Elegant art deco dining room for entertaining guests.", photos: [] },
];

const STATUS_META: Record<Status, { variant: "blue"|"gold"|"brand"|"green"|"gray"; label: string }> = {
  New:         { variant: "gold",  label: "New Request" },
  Accepted:    { variant: "blue",  label: "Accepted" },
  "In-Progress":{ variant: "brand", label: "In Progress" },
  Delivered:   { variant: "blue",  label: "Delivered" },
  Completed:   { variant: "green", label: "Completed" },
};

export default function DesignerRequestsPage() {
  const [active, setActive] = useState<string | null>(REQUESTS[0].id);
  const [message, setMessage] = useState("");
  const ticket = REQUESTS.find((r) => r.id === active);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1">Client Requests</h1>
        <p className="text-text-muted text-sm">Manage incoming and active design commissions</p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 flex-wrap">
        {[["New", "gold"],["In-Progress","brand"],["Delivered","blue"],["Completed","green"]] .map(([s, v]) => {
          const count = REQUESTS.filter((r) => r.status === s).length;
          return count > 0 ? <Badge key={s} variant={v as any}>{s}: {count}</Badge> : null;
        })}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* List */}
        <div className="space-y-2">
          {REQUESTS.map((r) => {
            const { variant } = STATUS_META[r.status];
            return (
              <button key={r.id} onClick={() => setActive(r.id)}
                className={cn("w-full text-left p-4 rounded-2xl border transition-all",
                  active === r.id ? "border-brand-500 bg-brand-600/10 shadow-glow-sm" : "border-surface-border bg-surface-card hover:border-brand-500/40"
                )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-text-muted">{r.id}</span>
                  <Badge variant={variant}>{r.status}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar src={r.avatar} name={r.client} size="xs" />
                  <p className="text-sm font-semibold text-white">{r.client}</p>
                </div>
                <p className="text-xs text-text-muted">{r.room} · {r.budget}</p>
                <p className="text-[10px] text-text-muted mt-1"><Clock className="w-3 h-3 inline mr-0.5" />{formatDate(r.created)}</p>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {ticket ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={ticket.avatar} name={ticket.client} size="md" />
                  <div>
                    <p className="font-semibold text-white">{ticket.client}</p>
                    <p className="text-xs text-text-muted">{ticket.id} · {ticket.room} · {ticket.budget}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {ticket.status === "New" && (
                    <Button size="sm"><CheckCircle className="w-3.5 h-3.5" /> Accept</Button>
                  )}
                  {ticket.status === "New" && (
                    <Button variant="destructive" size="sm"><X className="w-3.5 h-3.5" /> Decline</Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Client Brief</p>
                <p className="text-sm text-purple-100 leading-relaxed">{ticket.desc}</p>
              </div>

              {ticket.photos.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Client Room Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {ticket.photos.map((src, i) => (
                      <img key={i} src={src} alt="" className="w-32 h-24 object-cover rounded-xl border border-surface-border hover:opacity-80 cursor-pointer transition-opacity" />
                    ))}
                  </div>
                </div>
              )}

              {ticket.status === "In-Progress" && (
                <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-600/5">
                  <p className="text-xs font-semibold text-brand-300 mb-2 flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Upload Revised Design</p>
                  <div className="border-2 border-dashed border-brand-500/30 rounded-xl p-4 text-center hover:bg-brand-600/5 cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 text-brand-400 mx-auto mb-1" />
                    <p className="text-xs text-text-muted">Drop your design files here</p>
                  </div>
                  <Button className="w-full mt-2" size="sm">Send for Client Review</Button>
                </div>
              )}

              {ticket.status === "Delivered" && (
                <div className="p-3 rounded-xl border border-gold-500/20 bg-gold-500/5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-gold-300">Awaiting Client Approval</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Funds will be released once client approves.</p>
                  </div>
                </div>
              )}

              {/* Quick message */}
              {ticket.status !== "Completed" && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">Quick Message</p>
                  <div className="flex gap-2">
                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message ${ticket.client.split(" ")[0]}…`}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface border border-surface-border text-sm text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                    />
                    <Button size="sm" onClick={() => setMessage("")}><Send className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-surface-border text-text-muted">
            <p className="text-sm">Select a request to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
