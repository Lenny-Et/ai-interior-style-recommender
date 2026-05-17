"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

export default function LoginPage() {
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();
  const { login, isLoading, error } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(form.email, form.password);
      const user = useAppStore.getState().user; // Get the updated user state

      if (user) {
        if (user.role === 'admin') {
          toast.success("Welcome, Admin!");
          router.push("/admin");
        } else if (user.role === 'designer' && user.approvalStatus === 'pending') {
          toast.success("Login successful! Your designer account is pending approval.");
          router.push("/designer/pending-approval");
        } else {
          toast.success("Welcome back!");
          router.push("/dashboard");
        }
      } else {
        toast.error("Login failed: User data not found after successful authentication.");
      }
    } catch (error: any) {
      toast.error(error.error || error.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-950 to-surface items-center justify-center p-12">
        <div className="orb orb-brand w-96 h-96 -top-24 -left-24 opacity-60 absolute" />
        <div className="orb orb-violet w-72 h-72 bottom-0 right-0 opacity-40 absolute" />
        <div className="relative text-center">
          <h1 className="font-display text-5xl font-bold text-white mb-4">Homitify<span className="gradient-text">.</span></h1>
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
            <span className="font-display font-bold text-white text-xl">Homitify<span className="gradient-text">.</span></span>
          </div>

          <h2 className="font-display text-3xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-text-muted text-sm mb-8">Sign in to continue to your dashboard</p>



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
            <Button type="submit" fullWidth size="lg" loading={isLoading || loading} className="mt-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-sm">
                {error}
              </div>
            )}
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
