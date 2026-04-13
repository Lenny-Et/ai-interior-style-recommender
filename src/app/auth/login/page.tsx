"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, Github, Chrome } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Welcome back!");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-950 to-surface items-center justify-center p-12">
        <div className="orb orb-brand w-96 h-96 -top-24 -left-24 opacity-60 absolute" />
        <div className="orb orb-violet w-72 h-72 bottom-0 right-0 opacity-40 absolute" />
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-8 shadow-glow animate-float">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">Aura<span className="gradient-text">.</span></h1>
          <p className="text-text-muted text-lg leading-relaxed max-w-sm">
            AI-powered interior design that transforms your space from ordinary to extraordinary.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-3">
            {[
              "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=300&h=200&fit=crop",
              "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=300&h=200&fit=crop",
            ].map((src, i) => (
              <img key={i} src={src} alt="" className="rounded-xl object-cover h-28 w-full opacity-70 hover:opacity-100 transition-opacity" />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">Aura<span className="gradient-text">.</span></span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-8">Sign in to continue to your dashboard</p>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border text-sm text-text-muted hover:border-brand-500/60 hover:text-white transition-all bg-surface-card">
              <Chrome className="w-4 h-4" /> Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border text-sm text-text-muted hover:border-brand-500/60 hover:text-white transition-all bg-surface-card">
              <Github className="w-4 h-4" /> GitHub
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-border" /></div>
            <div className="relative flex justify-center"><span className="bg-surface px-3 text-xs text-text-muted">or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              icon={Mail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              id="login-password"
              label="Password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              icon={Lock}
              iconRight={showPw ? EyeOff : Eye}
              onIconRightClick={() => setShowPw(!showPw)}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-text-muted cursor-pointer">
                <input type="checkbox" className="rounded border-surface-border bg-surface-card accent-brand-500" />
                Remember me
              </label>
              <Link href="/auth/forgot-password" className="text-brand-400 hover:text-brand-300 transition-colors">Forgot password?</Link>
            </div>
            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
