"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  Sparkles, ArrowRight, Star, Play, ChevronRight,
  Palette, Zap, Users, Shield, CheckCircle, Clock, Upload, MousePointer,
} from "lucide-react";

const BEFORE_AFTER = [
  {
    before: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
    after:  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&h=400&fit=crop",
    label:  "Living Room Transformation",
    style:  "Modern Minimalist",
  },
  {
    before: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
    after:  "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=600&h=400&fit=crop",
    label:  "Bedroom Makeover",
    style:  "Scandinavian",
  },
];

const FEATURES = [
  { icon: Sparkles, title: "AI-Powered Recommendations", desc: "Our Gemini-powered engine analyzes your space and generates 4 cohesive furniture sets tailored to your taste.", color: "text-brand-400" },
  { icon: Palette,  title: "AI Modification Studio",     desc: "Chat with AI to iterate — 'swap the rug', 'make it brighter' — and see live updates instantly.", color: "text-violet-400" },
  { icon: Users,    title: "Verified Pro Designers",      desc: "Browse a curated marketplace of vetted interior designers. Hire, collaborate, and get the perfect space.", color: "text-blue-400" },
  { icon: Shield,   title: "Escrow Protection",           desc: "Payments held securely via Chapa until you approve the final design. Zero risk.", color: "text-emerald-400" },
  { icon: Zap,      title: "Instant Results",             desc: "Upload a photo, pick a style, and receive AI-generated design sets in under 30 seconds.", color: "text-gold-400" },
  { icon: Clock,    title: "Custom Request Tracking",     desc: "Real-time ticket system keeps you informed at every stage from 'Pending' to 'Delivered'.", color: "text-pink-400" },
];

const STATS = [
  { value: "50K+",  label: "Happy Homeowners" },
  { value: "1,200", label: "Pro Designers"    },
  { value: "98%",   label: "Satisfaction Rate"},
  { value: "4.9★",  label: "App Store Rating" },
];

const QUIZ_STYLES = [
  { label: "Modern",       img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop" },
  { label: "Bohemian",     img: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200&h=200&fit=crop" },
  { label: "Industrial",   img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=200&h=200&fit=crop" },
  { label: "Scandinavian", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop" },
  { label: "Japandi",      img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop" },
  { label: "Art Deco",     img: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=200&h=200&fit=crop" },
];

export default function LandingPage() {
  const [activeBA, setActiveBA] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleStyle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* ─── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">
              Aura<span className="gradient-text">.</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-text-muted">
            <Link href="#features"  className="hover:text-white transition-colors">Features</Link>
            <Link href="#quiz"      className="hover:text-white transition-colors">Style Quiz</Link>
            <Link href="#gallery"   className="hover:text-white transition-colors">Gallery</Link>
            <Link href="/auth/login"className="hover:text-white transition-colors">Sign In</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Get Started <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        {/* Orbs */}
        <div className="orb orb-brand w-[600px] h-[600px] -top-48 -left-48 opacity-40 pointer-events-none absolute" />
        <div className="orb orb-violet w-[400px] h-[400px] top-32 right-0 opacity-30 pointer-events-none absolute" />
        <div className="orb orb-gold w-[300px] h-[300px] bottom-0 left-1/3 opacity-20 pointer-events-none absolute" />

        <div className="relative max-w-7xl mx-auto text-center">
          <Badge variant="brand" className="mb-6 animate-fade-in">
            <Sparkles className="w-3 h-3" /> Powered by Gemini AI
          </Badge>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6 animate-slide-up">
            Design Your Dream
            <br />
            <span className="gradient-text">Space with AI</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-text-muted leading-relaxed mb-10 animate-slide-up">
            Upload a photo of any room and let our AI generate stunning, personalized furniture sets in seconds.
            Then hire a verified designer to bring it to life.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-in">
            <Link href="/auth/register">
              <Button size="lg" className="shadow-glow">
                Start for Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <button className="flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors">
              <div className="w-9 h-9 rounded-full border border-surface-border flex items-center justify-center bg-surface-card hover:border-brand-500 transition-colors">
                <Play className="w-3.5 h-3.5 text-brand-400 ml-0.5" />
              </div>
              Watch demo
            </button>
          </div>

          {/* ─── Before/After ─────────────────────────────────────── */}
          <div className="relative max-w-4xl mx-auto">
            <div className="flex gap-2 justify-center mb-4">
              {BEFORE_AFTER.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBA(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === activeBA ? "w-8 bg-brand-500" : "w-4 bg-surface-border"}`}
                />
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-3 rounded-2xl overflow-hidden border border-surface-border shadow-card bg-surface-card/50">
              <div className="relative">
                <Image
                  src={BEFORE_AFTER[activeBA].before}
                  alt="Before"
                  width={600} height={400}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-semibold border border-white/10">
                  BEFORE
                </div>
              </div>
              <div className="relative">
                <Image
                  src={BEFORE_AFTER[activeBA].after}
                  alt="After"
                  width={600} height={400}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-brand-600/80 backdrop-blur-sm text-xs font-semibold border border-brand-400/30">
                  ✨ AI REDESIGNED
                </div>
                <div className="absolute bottom-3 left-3 right-3 glass rounded-xl px-3 py-2 border border-surface-border">
                  <p className="text-xs font-semibold text-white">{BEFORE_AFTER[activeBA].label}</p>
                  <p className="text-[10px] text-text-muted">{BEFORE_AFTER[activeBA].style}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-surface-border bg-surface-card/30">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display text-4xl font-bold gradient-text mb-1">{s.value}</div>
              <div className="text-sm text-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <Badge variant="brand" className="mb-4"><Zap className="w-3 h-3" /> Features</Badge>
            <h2 className="font-display text-4xl font-bold text-white mb-4">Everything you need to</h2>
            <p className="gradient-text font-display text-4xl font-bold">transform your space</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 group">
                <div className={`w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${f.color}`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Style Quiz ─────────────────────────────────────────────────────── */}
      <section id="quiz" className="py-20 px-4 bg-surface-card/20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="gold" className="mb-4"><Star className="w-3 h-3" /> Style Quiz</Badge>
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Find Your <span className="gradient-text">Design DNA</span>
          </h2>
          <p className="text-text-muted mb-10">Pick the rooms that speak to your soul. We'll build your style profile.</p>

          {quizStep === 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {QUIZ_STYLES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => toggleStyle(s.label)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] ${
                      selected.includes(s.label) ? "border-brand-500 shadow-glow-sm" : "border-surface-border"
                    }`}
                  >
                    <Image src={s.img} alt={s.label} width={200} height={200} className="w-full h-36 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{s.label}</span>
                      {selected.includes(s.label) && (
                        <CheckCircle className="w-4 h-4 text-brand-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                disabled={selected.length === 0}
                onClick={() => setQuizStep(1)}
                size="lg"
                className="mx-auto"
              >
                Continue ({selected.length} selected) <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="glass rounded-2xl p-10 border border-brand-500/30 text-center animate-slide-up">
              <div className="w-16 h-16 rounded-full bg-brand-600/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Style Profile Created!</h3>
              <p className="text-text-muted mb-2">Your preferences: <span className="text-brand-300">{selected.join(", ")}</span></p>
              <p className="text-sm text-text-muted mb-6">Sign up to save your profile and get personalized recommendations.</p>
              <Link href="/auth/register">
                <Button size="lg">Create Free Account <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-14">
            Three steps to your <span className="gradient-text">dream space</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", icon: Upload,       title: "Upload Your Room",    desc: "Drag & drop a photo or take one on your phone. Any room, any quality." },
              { n: "02", icon: Sparkles,     title: "AI Generates Designs",desc: "Get 4 curated furniture sets with products, colors, and layouts." },
              { n: "03", icon: MousePointer, title: "Hire a Designer",     desc: "Love a concept? Hire a verified pro to make it real with escrow protection." },
            ].map((step) => (
              <div key={step.n} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <step.icon className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 text-6xl font-bold text-white/5 font-display select-none">{step.n}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="card p-12 bg-gradient-to-br from-brand-900/50 to-surface-card border-brand-500/20 relative overflow-hidden">
            <div className="orb orb-brand w-64 h-64 -top-16 -left-16 opacity-50 absolute" />
            <div className="orb orb-violet w-48 h-48 -bottom-12 -right-12 opacity-40 absolute" />
            <div className="relative">
              <h2 className="font-display text-4xl font-bold text-white mb-4">
                Ready to transform your space?
              </h2>
              <p className="text-text-muted mb-8">Join 50,000+ homeowners who've already discovered their perfect interior style.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/auth/register"><Button size="lg" className="shadow-glow">Get Started Free</Button></Link>
                <Link href="/gallery"><Button variant="ghost" size="lg">Browse Gallery</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-border py-10 px-4 text-center text-sm text-text-muted">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-display font-bold text-white">Aura Interiors</span>
        </div>
        <div className="flex flex-wrap justify-center gap-5 mb-4">
          {["Privacy","Terms","About","Blog","Contact","FAQ"].map((l) => (
            <Link key={l} href={`/${l.toLowerCase()}`} className="hover:text-white transition-colors">{l}</Link>
          ))}
        </div>
        <p>© {new Date().getFullYear()} Aura Interiors. All rights reserved.</p>
      </footer>
    </div>
  );
}
