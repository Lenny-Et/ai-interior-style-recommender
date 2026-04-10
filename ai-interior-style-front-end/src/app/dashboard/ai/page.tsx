"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import {
  Sparkles, Upload, X, CheckCircle, ArrowRight,
  Heart, Share2, Download, RefreshCw, Eye,
} from "lucide-react";
import { STYLE_TAGS, ROOM_TYPES, BUDGET_RANGES, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const AI_SETS = [
  { id: 1, name: "Pure Serenity",    style: "Minimalist",   price: "$2,400", img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=400&fit=crop",  products: ["Osaka Sofa","Linen Throw","Walnut Coffee Table","Floor Lamp"] },
  { id: 2, name: "Nordic Warmth",    style: "Scandinavian", price: "$1,900", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=400&fit=crop",  products: ["Birch Armchair","Sheepskin Rug","Pine Shelf","Pendant Light"] },
  { id: 3, name: "Urban Edge",       style: "Industrial",   price: "$3,100", img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600&h=400&fit=crop",  products: ["Steel Frame Sofa","Exposed Brick","Edison Bulb","Metal Bookcase"] },
  { id: 4, name: "Golden Elegance",  style: "Art Deco",     price: "$4,200", img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=400&fit=crop",  products: ["Velvet Chaise","Gold Mirror","Art Deco Lamp","Marble Side Table"] },
];

type Step = "upload" | "prefs" | "loading" | "results";

export default function AIRecommenderPage() {
  const [step, setStep]           = useState<Step>("upload");
  const [preview, setPreview]     = useState<string | null>(null);
  const [roomType, setRoomType]   = useState("Living Room");
  const [budget, setBudget]       = useState("$1,000–$2,500");
  const [styles, setStyles]       = useState<string[]>([]);
  const [selected, setSelected]   = useState<number | null>(null);
  const [progress, setProgress]   = useState(0);

  const onDrop = useCallback((files: File[]) => {
    const url = URL.createObjectURL(files[0]);
    setPreview(url);
    setStep("prefs");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [] }, maxFiles: 1,
  });

  const toggleStyle = (s: string) =>
    setStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const runAI = async () => {
    setStep("loading");
    setProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 80));
      setProgress(i);
    }
    setStep("results");
    toast.success("4 design sets ready!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-brand-400" /> AI Recommender
        </h1>
        <p className="text-text-muted text-sm">Upload a room photo and get personalized furniture sets in seconds.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(["upload","prefs","loading","results"] as Step[]).map((s, i) => {
          const stepIdx = ["upload","prefs","loading","results"].indexOf(step);
          const done = i < stepIdx || (s === "loading" && step === "results");
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                done   ? "bg-emerald-500 text-white" :
                active ? "bg-brand-600 text-white shadow-glow-sm" :
                         "bg-surface-card border border-surface-border text-text-muted"
              )}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn("text-xs capitalize hidden sm:block", active ? "text-white" : "text-text-muted")}>
                {s === "loading" ? "Generating" : s}
              </span>
              {i < 3 && <div className={cn("w-8 h-0.5 rounded", done ? "bg-emerald-500" : "bg-surface-border")} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP: Upload ── */}
      {step === "upload" && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300",
            isDragActive ? "border-brand-500 bg-brand-600/10 shadow-glow" : "border-surface-border hover:border-brand-500/60 hover:bg-surface-hover"
          )}
        >
          <input {...getInputProps()} id="room-photo-input" />
          <div className="w-16 h-16 rounded-2xl bg-brand-600/15 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="font-semibold text-white mb-2">{isDragActive ? "Drop it here!" : "Upload a room photo"}</h2>
          <p className="text-sm text-text-muted mb-4">Drag & drop or click to select · JPG, PNG, WEBP up to 20MB</p>
          <Button>Choose File</Button>
        </div>
      )}

      {/* ── STEP: Preferences ── */}
      {step === "prefs" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {preview && (
              <div className="relative rounded-2xl overflow-hidden border border-surface-border mb-4">
                <img src={preview} alt="Room" className="w-full h-56 object-cover" />
                <button
                  onClick={() => { setPreview(null); setStep("upload"); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <Badge variant="green" className="absolute bottom-3 left-3"><CheckCircle className="w-3 h-3" /> Photo uploaded</Badge>
              </div>
            )}
          </div>
          <div className="space-y-5">
            {/* Room type */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Room Type</label>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.slice(0,6).map((r) => (
                  <button key={r} onClick={() => setRoomType(r)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      roomType === r ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
                    )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* Budget */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Budget Range</label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_RANGES.map((b) => (
                  <button key={b} onClick={() => setBudget(b)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      budget === b ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-surface-border text-text-muted hover:border-gold-500/40"
                    )}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            {/* Styles */}
            <div>
              <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2 block">Preferred Styles (optional)</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.slice(0,10).map((s) => (
                  <button key={s} onClick={() => toggleStyle(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      styles.includes(s) ? "border-brand-500 bg-brand-600/20 text-brand-300" : "border-surface-border text-text-muted hover:border-brand-500/40"
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button fullWidth size="lg" onClick={runAI} className="shadow-glow">
              <Sparkles className="w-4 h-4" /> Generate AI Designs
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: Loading ── */}
      {step === "loading" && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">AI is designing your space…</h2>
          <p className="text-text-muted text-sm mb-6">Analyzing style, lighting, and proportions</p>
          <div className="max-w-xs mx-auto h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-600 to-violet-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-2">{progress}%</p>
        </div>
      )}

      {/* ── STEP: Results ── */}
      {step === "results" && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Your AI Design Sets</h2>
              <p className="text-xs text-text-muted">4 cohesive furniture sets for your {roomType}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("prefs")}>
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {AI_SETS.map((set) => (
              <Card key={set.id}
                className={cn("group overflow-hidden cursor-pointer", selected === set.id && "border-brand-500 shadow-glow")}
                onClick={() => setSelected(set.id)}
              >
                <div className="relative">
                  <Image src={set.img} alt={set.name} width={600} height={400} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <Badge variant="brand" className="absolute top-3 left-3">{set.style}</Badge>
                  {selected === set.id && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shadow-glow-sm">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="font-bold text-white">{set.name}</p>
                      <p className="text-xs text-white/70">Est. {set.price}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {set.products.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-surface text-text-muted border border-surface-border">{p}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1"><Heart className="w-3.5 h-3.5" /> Save</Button>
                    <Button variant="ghost" size="sm" className="flex-1"><Eye className="w-3.5 h-3.5" /> Preview</Button>
                    <Button variant="ghost" size="sm"><Share2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {selected && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard/ai-studio">
                <Button size="lg" className="shadow-glow">
                  <Sparkles className="w-4 h-4" /> Open in AI Studio
                </Button>
              </Link>
              <Link href="/dashboard/designers">
                <Button variant="ghost" size="lg">
                  Hire a Designer <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg"><Download className="w-4 h-4" /> Export PDF</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
