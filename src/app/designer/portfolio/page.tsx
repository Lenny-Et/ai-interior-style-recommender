"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody } from "@/components/ui/Card";
import { Upload, X, CheckCircle, Eye, Edit, Trash2, Star, Tag } from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, cn } from "@/lib/utils";

const PORTFOLIO = [
  { id: 1, img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop", title: "Pure Serenity",   style: "Minimalist",   room: "Living Room", views: 1842, saves: 341, status: "Approved",  featured: true  },
  { id: 2, img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop", title: "Nordic Light",    style: "Scandinavian", room: "Bedroom",     views: 920,  saves: 188, status: "Approved",  featured: false },
  { id: 3, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop", title: "Coastal Breeze",  style: "Coastal",      room: "Living Room", views: 1205, saves: 260, status: "Approved",  featured: true  },
  { id: 4, img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&h=300&fit=crop", title: "Dormant Storm",   style: "Modern",       room: "Bedroom",     views: 0,    saves: 0,   status: "Pending",   featured: false },
  { id: 5, img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&h=300&fit=crop", title: "Earthy Tones",    style: "Bohemian",     room: "Office",      views: 0,    saves: 0,   status: "Needs Edit",featured: false },
];

type UploadFile = { file: File; preview: string; style: string; room: string; title: string };

export default function PortfolioManagerPage() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successIds, setSuccessIds] = useState<number[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadFile[] = acceptedFiles.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      style: "",
      room: "",
      title: f.name.replace(/\.[^/.]+$/, ""),
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "image/*": [] }, multiple: true });

  const updateUpload = (idx: number, key: keyof UploadFile, value: string) =>
    setUploads((prev) => prev.map((u, i) => i === idx ? { ...u, [key]: value } : u));

  const removeUpload = (idx: number) =>
    setUploads((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setUploads([]);
    setSubmitting(false);
  };

  const toggleFeatured = (id: number) =>
    setSuccessIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Portfolio Manager</h1>
          <p className="text-text-muted text-sm">Upload, organize, and manage your design portfolio</p>
        </div>
        <div className="flex gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Approved (3)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-400" />Pending (1)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Needs Edit (1)</span>
        </div>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300",
          isDragActive ? "border-brand-500 bg-brand-600/10 shadow-glow" : "border-surface-border hover:border-brand-500/60 hover:bg-surface-hover"
        )}
      >
        <input {...getInputProps()} id="portfolio-upload" />
        <div className="w-14 h-14 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto mb-3">
          <Upload className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="font-semibold text-white mb-1">{isDragActive ? "Drop your images here!" : "Bulk upload portfolio images"}</h2>
        <p className="text-sm text-text-muted">Drag & drop multiple images · Auto-optimized by Next.js</p>
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">{uploads.length} image{uploads.length > 1 ? "s" : ""} ready to tag</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setUploads([])}>Clear all</Button>
              <Button loading={submitting} onClick={submit}>
                <Upload className="w-4 h-4" /> Submit for Approval
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {uploads.map((u, idx) => (
              <div key={idx} className="card p-4 grid sm:grid-cols-[auto_1fr] gap-4">
                <img src={u.preview} alt="" className="w-28 h-20 object-cover rounded-xl border border-surface-border" />
                <div className="grid sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Title *</label>
                    <input value={u.title} onChange={(e) => updateUpload(idx, "title", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Style *</label>
                    <select value={u.style} onChange={(e) => updateUpload(idx, "style", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all">
                      <option value="">Select…</option>
                      {STYLE_TAGS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block">Room Type *</label>
                    <select value={u.room} onChange={(e) => updateUpload(idx, "room", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-border text-xs text-purple-100 focus:outline-none focus:border-brand-500 transition-all">
                      <option value="">Select…</option>
                      {ROOM_TYPES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => removeUpload(idx)} className="self-start sm:col-start-2 text-text-muted hover:text-red-400 transition-colors ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing portfolio */}
      <div>
        <h2 className="font-semibold text-white mb-4">Your Portfolio ({PORTFOLIO.length})</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PORTFOLIO.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <div className="relative">
                <img src={item.img} alt={item.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-1">
                  <Badge variant={item.status === "Approved" ? "green" : item.status === "Pending" ? "gold" : "red"}>{item.status}</Badge>
                  {item.featured && <Badge variant="gold"><Star className="w-2.5 h-2.5 fill-current" />Featured</Badge>}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-sm text-white">{item.title}</p>
                  <div className="flex gap-1">
                    <Badge variant="brand">{item.style}</Badge>
                    <Badge variant="gray">{item.room}</Badge>
                  </div>
                </div>
                {item.status === "Approved" && (
                  <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views.toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{item.saves} saves</span>
                  </div>
                )}
                {item.status === "Needs Edit" && (
                  <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Admin requested: Add room type tag
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1"><Edit className="w-3.5 h-3.5" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="flex-1"><Eye className="w-3.5 h-3.5" /> View</Button>
                  <Button variant="destructive" size="sm"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
