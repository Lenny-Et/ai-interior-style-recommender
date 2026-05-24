"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [done, setDone] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    const verify = async () => {
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/verify-reset-token/${token}`
        ).then(async (res) => {
          if (res.ok) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        });
      } catch {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.resetPassword(token, form.password);
      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch (err: any) {
      toast.error(err.error || err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-950 to-surface items-center justify-center p-12">
        <div className="orb orb-brand w-96 h-96 -top-24 -left-24 opacity-60 absolute" />
        <div className="orb orb-violet w-72 h-72 bottom-0 right-0 opacity-40 absolute" />
        <div className="relative text-center">
          <h1 className="font-display text-5xl font-bold text-white mb-4">
            Homify<span className="gradient-text">.</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed max-w-sm">
            AI-powered interior design that transforms your space from ordinary to extraordinary.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="font-display font-bold text-white text-xl">
              Homify<span className="gradient-text">.</span>
            </span>
          </div>

          {verifying ? (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted text-sm">Verifying your reset link…</p>
            </div>
          ) : !tokenValid ? (
            /* Invalid / expired token */
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-2">Link expired</h2>
              <p className="text-text-muted text-sm mb-6">
                This password reset link is invalid or has already been used.
              </p>
              <Link href="/auth/forgot-password">
                <Button fullWidth>Request a new link</Button>
              </Link>
            </div>
          ) : done ? (
            /* Success state */
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-brand-400" />
                </div>
              </div>
              <h2 className="font-display text-3xl font-bold text-white mb-2">Password reset!</h2>
              <p className="text-text-muted text-sm mb-6">
                Your password has been updated. Redirecting you to sign in…
              </p>
              <Link href="/auth/login">
                <Button fullWidth>Go to sign in</Button>
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <h2 className="font-display text-3xl font-bold text-white mb-1">Set new password</h2>
              <p className="text-text-muted text-sm mb-8">
                Choose a strong password with at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="reset-password"
                  label="New password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  icon={Lock}
                  iconRight={showPw ? EyeOff : Eye}
                  onIconRightClick={() => setShowPw(!showPw)}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />

                <Input
                  id="reset-confirm"
                  label="Confirm new password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  icon={Lock}
                  iconRight={showConfirm ? EyeOff : Eye}
                  onIconRightClick={() => setShowConfirm(!showConfirm)}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                />

                {form.confirm && form.password !== form.confirm && (
                  <p className="text-red-400 text-xs">Passwords do not match.</p>
                )}

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={loading}
                  className="mt-2"
                >
                  Reset password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
