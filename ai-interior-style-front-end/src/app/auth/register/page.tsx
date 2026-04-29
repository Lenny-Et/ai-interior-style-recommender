"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, Home, Briefcase, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Role = "homeowner" | "designer";

const ROLES: { value: Role; label: string; icon: typeof Home; desc: string }[] = [
  { value: "homeowner", label: "Homeowner",      icon: Home,      desc: "Get AI recommendations & hire designers" },
  { value: "designer",  label: "Pro Designer",   icon: Briefcase, desc: "Showcase work & earn from clients" },
];

export default function RegisterPage() {
  const [role, setRole]       = useState<Role>("homeowner");
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    toast.success("Account created! Welcome to Homitify.");
    router.push(role === "designer" ? "/designer" : "/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
      <div className="orb orb-brand w-96 h-96 -top-24 -right-12 opacity-30 absolute pointer-events-none" />
      <div className="orb orb-violet w-64 h-64 bottom-0 left-0 opacity-20 absolute pointer-events-none" />

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Create your account</h1>
          <p className="text-text-muted text-sm mt-1">Join 50,000+ members transforming their spaces</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                step >= s ? "bg-brand-600 text-white shadow-glow-sm" : "bg-surface-card border border-surface-border text-text-muted"
              )}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={cn("w-16 h-0.5 rounded transition-all duration-300", step > s ? "bg-brand-500" : "bg-surface-border")} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 1 ? (
            <div>
              <h2 className="font-semibold text-white mb-1">I am a…</h2>
              <p className="text-sm text-text-muted mb-5">Choose how you'll use Homitify Interiors</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {ROLES.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                      role === value
                        ? "border-brand-500 bg-brand-600/15 shadow-glow-sm"
                        : "border-surface-border bg-surface-card hover:border-brand-500/40"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 mb-2", role === value ? "text-brand-400" : "text-text-muted")} />
                    <div className="font-semibold text-sm text-white">{label}</div>
                    <div className="text-xs text-text-muted mt-0.5 leading-relaxed">{desc}</div>
                  </button>
                ))}
              </div>
              <Button fullWidth onClick={() => setStep(2)} size="lg">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-semibold text-white mb-4">Your details</h2>
              <Input id="reg-name"  label="Full Name"  type="text"     placeholder="Alex Johnson"       icon={User} value={form.name}     onChange={(e) => setForm({ ...form, name: e.target.value })}     required />
              <Input id="reg-email" label="Email"      type="email"    placeholder="you@example.com"    icon={Mail} value={form.email}    onChange={(e) => setForm({ ...form, email: e.target.value })}    required />
              <Input
                id="reg-password"
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="At least 8 characters"
                icon={Lock}
                iconRight={showPw ? EyeOff : Eye}
                onIconRightClick={() => setShowPw(!showPw)}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                hint="Minimum 8 characters"
                required
              />
              <p className="text-xs text-text-muted">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="text-brand-400 hover:underline">Terms</Link> and{" "}
                <Link href="/privacy" className="text-brand-400 hover:underline">Privacy Policy</Link>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setStep(1)} type="button">Back</Button>
                <Button type="submit" fullWidth loading={loading}>
                  Create Account <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-text-muted mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
