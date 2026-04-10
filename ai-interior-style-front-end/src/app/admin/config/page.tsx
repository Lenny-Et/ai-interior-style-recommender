"use client";
import { useState } from "react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Settings, Sparkles, Sliders, Save, RotateCcw, CheckCircle, Activity } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const AI_PARAMS = [
  { key: "likes_weight",    label: "Likes Weight",            description: "How much user 'Likes' influence recommendations", value: 65, min: 0, max: 100 },
  { key: "saves_weight",    label: "Saves Weight",            description: "How much 'Saves' influence the preference vector",  value: 80, min: 0, max: 100 },
  { key: "view_time",       label: "View Time Weight",        description: "Weight of time spent viewing a design",            value: 45, min: 0, max: 100 },
  { key: "diversity",       label: "Style Diversity Factor",  description: "Higher = more varied recommendations",             value: 40, min: 0, max: 100 },
  { key: "recency",         label: "Recency Bias",            description: "Preference for newer designs vs. popular classics", value: 55, min: 0, max: 100 },
];

const MAINTENANCE_FLAGS = [
  { key: "ai_enabled",    label: "AI Recommendations Engine", on: true  },
  { key: "marketplace",   label: "Marketplace & Payments",    on: true  },
  { key: "new_regs",      label: "New Registrations",         on: true  },
  { key: "designer_apps", label: "Designer Applications",     on: true  },
  { key: "image_upload",  label: "Image Uploads",             on: true  },
  { key: "maintenance",   label: "Maintenance Mode",          on: false },
];

type Ticket = { id: string; user: string; subject: string; status: "Open"|"Resolved"; category: "billing"|"technical"; time: string };

const TICKETS: Ticket[] = [
  { id: "SUP-001", user: "Alex Johnson",   subject: "Payment not processing",     status: "Open",     category: "billing",   time: "1h ago" },
  { id: "SUP-002", user: "Maria Santos",   subject: "AI results not loading",     status: "Open",     category: "technical", time: "3h ago" },
  { id: "SUP-003", user: "Chris Nguyen",   subject: "Refund request – TK-099",   status: "Resolved", category: "billing",   time: "1d ago" },
  { id: "SUP-004", user: "Lena Rodriguez", subject: "Portfolio upload failed",    status: "Open",     category: "technical", time: "2h ago" },
];

export default function AdminConfigPage() {
  const [params, setParams] = useState(AI_PARAMS);
  const [flags, setFlags]   = useState(MAINTENANCE_FLAGS);
  const [saving, setSaving] = useState(false);
  const [reply, setReply]   = useState<Record<string, string>>({});

  const updateParam = (key: string, value: number) =>
    setParams(p => p.map(x => x.key === key ? { ...x, value } : x));

  const toggleFlag = (key: string) =>
    setFlags(f => f.map(x => x.key === key ? { ...x, on: !x.on } : x));

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    toast.success("Configuration saved!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Settings className="w-7 h-7 text-gold-400" /> System Configuration
          </h1>
          <p className="text-text-muted text-sm">Control AI parameters, feature flags, and support tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">All systems normal</span>
        </div>
      </div>

      {/* AI Parameters */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h2 className="font-semibold text-white">AI Recommendation Engine</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setParams(AI_PARAMS)}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
          </Button>
        </CardHeader>
        <CardBody className="space-y-6">
          {params.map(p => (
            <div key={p.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-text-muted">{p.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-400 w-8 text-right">{p.value}</span>
                  <Badge variant={p.value >= 70 ? "brand" : p.value >= 40 ? "gold" : "gray"}>{p.value >= 70 ? "High" : p.value >= 40 ? "Med" : "Low"}</Badge>
                </div>
              </div>
              <input
                type="range" min={p.min} max={p.max} value={p.value}
                onChange={e => updateParam(p.key, Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-500 bg-surface-border"
              />
            </div>
          ))}
          <Button loading={saving} onClick={save}><Save className="w-4 h-4" /> Save AI Parameters</Button>
        </CardBody>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gold-400" />
          <h2 className="font-semibold text-white">Feature Flags & Maintenance</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {flags.map(f => (
            <div key={f.key} className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", f.on ? "border-surface-border" : "border-red-500/30 bg-red-500/5")}>
              <div>
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <Badge variant={f.on ? "green" : "red"} className="mt-0.5">{f.on ? "Enabled" : "Disabled"}</Badge>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={f.on} onChange={() => toggleFlag(f.key)} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-border rounded-full peer peer-checked:bg-brand-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Support Tickets */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-white">Support Tickets</h2>
            <Badge variant="red">{TICKETS.filter(t => t.status === "Open").length} Open</Badge>
          </div>
        </CardHeader>
        <div className="divide-y divide-surface-border">
          {TICKETS.map(t => (
            <div key={t.id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-text-muted">{t.id}</span>
                    <Badge variant={t.status === "Open" ? "red" : "green"}>{t.status}</Badge>
                    <Badge variant={t.category === "billing" ? "gold" : "blue"}>{t.category}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">{t.subject}</p>
                  <p className="text-xs text-text-muted">{t.user} · {t.time}</p>
                </div>
                {t.status === "Resolved" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </div>
              {t.status === "Open" && (
                <div className="flex gap-2 mt-3">
                  <input
                    value={reply[t.id] ?? ""}
                    onChange={e => setReply({ ...reply, [t.id]: e.target.value })}
                    placeholder="Type your reply…"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-purple-100 placeholder-text-muted focus:outline-none focus:border-brand-500 transition-all"
                  />
                  <Button size="sm" onClick={() => { setReply({ ...reply, [t.id]: "" }); toast.success("Reply sent!"); }}>Reply</Button>
                  <Button size="sm" variant="ghost">Close</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
